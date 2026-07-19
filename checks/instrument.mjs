// instrument — measures the artifact and emits EVIDENCE, not verdicts.
//
// Deliberately separate from design-gate. The gate answers "does this pass?" and must stay
// binary. This answers "what is true about this screen?" and stays neutral: it reports a
// measurement plus the published standard it sits against, and lets a human decide whether
// the gap matters. A measurement that auto-fails is a gate; a measurement that informs is
// instrumentation. Conflating them is how a comfort issue gets reported as a compliance
// failure — which is the fastest way to lose a designer's trust.
//
// Every row it emits is `type: own-experiment` with a reproducible method string, so the
// claim can be re-run and checked rather than believed.
//
// Usage:  node checks/instrument.mjs <file-or-url> [--json]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const target = argv.find((a) => !a.startsWith('--'));
if (!target) { console.error('usage: node checks/instrument.mjs <file.html|url> [--json]'); process.exit(2); }
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
if (!/^https?:/.test(url) && !fs.existsSync(target)) { console.error(`no such file: ${target}`); process.exit(2); }

// Published standards. Each carries its own citation so a reported gap can be checked at
// source. WCAG is a conformance requirement; the platform numbers are vendor guidance —
// that distinction is load-bearing and must survive into the output.
// Target-size standards. Every number here is qualified, because the research says the
// popular framing of all three is wrong in a specific way:
//   - WCAG 2.2 SC 2.5.8 (24px) is AA and is as much a SPACING rule as a size rule: an
//     undersized target passes if a 24px circle centred on it does not intersect another
//     target's circle. It is justified by accidental-activation avoidance, NOT by Fitts —
//     citing it as evidence that "bigger targets are faster" misattributes its purpose.
//   - WCAG 2.1 SC 2.5.5 (44px) is AAA. Teams targeting AA are not bound by it. This is the
//     real "44 CSS px" accessibility criterion, and it is routinely confused with Apple's.
//   - Apple's 44 is POINTS, not CSS px. Treating them as the same unit is a unit error.
//   - Material's 48dp is justified by a finger-pad size argument, not a cited study.
// Platform minimums disagree with each other (Apple 44pt, Material 48dp, Fluent 40epx,
// BBC GEL 7mm) — which is itself the evidence that they are conventional, not derived.
const CSS_PX_PER_MM = 96 / 25.4; // ~3.78

const STANDARDS = {
  wcag_2_5_8: { px: 24, cite: 'WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA',
    kind: 'conformance', note: 'AA. Spacing exception applies. Rationale is accidental activation, not speed.' },
  wcag_2_5_5: { px: 44, cite: 'WCAG 2.1 SC 2.5.5 Target Size, Level AAA',
    kind: 'conformance', note: 'AAA: not binding at AA. This is the real 44 CSS px criterion.' },
  apple:      { px: 44, cite: 'Apple Human Interface Guidelines (44×44 PT, not CSS px)',
    kind: 'vendor guidance', note: 'Unit differs from CSS px. No controlled study cited by Apple.' },
  material:   { px: 48, cite: 'Material Design (48dp)',
    kind: 'vendor guidance', note: 'Justified by finger-pad size argument, no cited study.' },
  parhi_2006: { px: Math.round(9.2 * CSS_PX_PER_MM), cite: 'Parhi, Karlson & Bederson, MobileHCI 2006 (9.2mm discrete)',
    kind: 'empirical', note: 'Measured on a 2006 resistive stylus-era PDA. Does not underwrite modern guidance.' },
};

const WIDTHS = [375, 1280];
const browser = await chromium.launch();
const evidence = [];

try {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    // --- interactive target geometry
    const targets = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[tabindex]:not([tabindex="-1"])'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            cls: (el.className && typeof el.className === 'string' ? el.className : '').split(' ')[0] || '',
            w: Math.round(r.width), h: Math.round(r.height),
            cx: r.x + r.width / 2, cy: r.y + r.height / 2,
            name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28),
          };
        }).filter((t) => t.w > 0 && t.h > 0)
    );

    if (targets.length) {
      const smallest = targets.reduce((a, b) => (Math.min(a.w, a.h) <= Math.min(b.w, b.h) ? a : b));
      const minSide = Math.min(smallest.w, smallest.h);
      for (const [key, std] of Object.entries(STANDARDS)) {
        let under = targets.filter((t) => Math.min(t.w, t.h) < std.px);
        // 2.5.8 is satisfiable by spacing: an undersized target passes when a 24px circle
        // centred on it does not intersect another target's circle. Geometry, not dimension.
        if (key === 'wcag_2_5_8') {
          under = under.filter((t) => targets.some((o) =>
            o !== t && Math.hypot((o.cx ?? 0) - (t.cx ?? 0), (o.cy ?? 0) - (t.cy ?? 0)) < std.px));
        }
        evidence.push({
          claim: `${under.length}/${targets.length} interactive targets are under ${std.px}px at ${w}px`,
          measured: under.length
            ? under.map((t) => `${t.cls || t.tag} ${t.w}×${t.h}`).join(' · ')
            : `smallest is ${smallest.w}×${smallest.h}`,
          source: std.cite,
          type: std.kind === 'empirical' ? 'published-study' : 'published-standard',
          kind: std.kind,
          note: std.note,
          confidence: 'high',
          method: `Playwright @${w}×900, getBoundingClientRect on focusable elements`,
        });
      }
      evidence.push({
        claim: `smallest interactive target at ${w}px is ${minSide}px on its short side`,
        measured: `${smallest.cls || smallest.tag} ${smallest.w}×${smallest.h}: "${smallest.name}"`,
        source: `own measurement, Playwright @${w}×900`,
        type: 'own-experiment', confidence: 'high',
        method: 'getBoundingClientRect().width/height, min side',
      });
    }

    // --- decision points on screen (cost of choosing, NOT a Hick's Law claim)
    const choices = await page.evaluate(() =>
      document.querySelectorAll('a[href],button,input:not([type=hidden]),select').length);
    evidence.push({
      claim: `${choices} interactive elements on screen at ${w}px`,
      measured: `${choices} focusable controls`,
      source: `own measurement, Playwright @${w}×900`,
      type: 'own-experiment', confidence: 'high',
      // Deliberately NOT framed as a Hick's Law finding. Hick's applies to forced-choice
      // reaction time, not to a visually-scanned form. Counting is the honest claim.
      method: 'querySelectorAll count; a count, not a difficulty estimate',
    });

    // --- text block measure (line length), a typographic convention with a real range
    const measures = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('p,li,label,span').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt.length < 40) return;
        const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
        const w = el.getBoundingClientRect().width;
        if (w > 0) out.push(Math.round(w / (fs * 0.5))); // ~0.5em average glyph advance
      });
      return out;
    });
    if (measures.length) {
      const outside = measures.filter((c) => c < 45 || c > 75);
      evidence.push({
        claim: `${outside.length}/${measures.length} text blocks fall outside the 45–75 character measure at ${w}px`,
        measured: `estimated characters per line: ${measures.join(', ')}`,
        source: 'Bringhurst, The Elements of Typographic Style (45–75 char measure)',
        type: 'principle', confidence: 'medium',
        method: 'width ÷ (font-size × 0.5). An ESTIMATE, not a glyph count',
      });
    }

    await ctx.close();
  }
} finally {
  await browser.close();
}

if (asJson) {
  console.log(JSON.stringify(evidence, null, 2));
} else {
  console.log(`\n  instrument · ${target}\n`);
  for (const e of evidence) {
    const tag = e.kind === 'vendor guidance' ? 'guidance' : e.type === 'own-experiment' ? 'measured' : e.type === 'principle' ? 'principle' : 'standard';
    console.log(`  [${tag}] ${e.claim}`);
    console.log(`      ${e.measured}`);
    console.log(`      ${e.source}  (${e.confidence})`);
    if (e.note) console.log(`      ⚠ ${e.note}`);
    console.log('');
  }
  console.log(`  ${evidence.length} evidence row(s). Nothing here passes or fails. That is the point.`);
  console.log(`  pipe into a run:  node checks/instrument.mjs ${target} --json | ...\n`);
}
