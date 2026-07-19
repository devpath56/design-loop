// craft-evals — general-purpose, deterministic craft checks for ANY product screen.
//
// Derived from the Superhuman design spec, but deliberately NOT a port of it. That spec is
// mostly brand: #0066ff, the Messina family, J/K bindings, a 3-7 split inbox. None of that
// transfers to another product, and shipping it as a rule would be cargo-culting one team's
// answers as another team's constraints.
//
// What transfers is the INVARIANT behind each specific:
//   "50-60ms response"        → interaction feedback must land inside the perception window
//   "11/12/14/16/18px scale"  → a closed set of sizes, not arbitrary values
//   "150ms ease-out"          → motion is short, and eased, and drawn from a small set
//   "focus ring 0 0 0 2px"    → focus is VISIBLE, whatever the treatment
//   "unread = border + weight" → state is never carried by colour alone
//   "optimistic UI + undo"    → destructive actions are reversible
//
// Each check reports the MEASURED value, so a failure is arguable rather than an edict.
// Checks that cannot be made deterministic are listed at the end as explicitly human — see
// the automation ceiling: roughly 57% of accessibility issues by volume are machine-detectable
// (Deque, vendor-reported) and 20-30% of WCAG criteria. Craft sits lower than that.
//
// Usage:  node checks/craft-evals.mjs <file.html|url> [--json]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const target = argv.find((a) => !a.startsWith('--'));
if (!target) { console.error('usage: node checks/craft-evals.mjs <file.html|url> [--json]'); process.exit(2); }
const url = /^https?:\/\//.test(target) ? target : pathToFileURL(path.resolve(target)).href;
if (!/^https?:/.test(url) && !fs.existsSync(target)) { console.error(`no such file: ${target}`); process.exit(2); }

// Perception windows. These are the stable part of the latency literature — the specific
// 50-60ms internal target is one team's bar, the thresholds are not.
const INSTANT = 100;    // feels immediate
const RESPONSIVE = 300; // feels connected to the action
const SCALE_MAX = 6;    // distinct font sizes before a "scale" is just a pile of values
const MOTION_MIN = 80;  // below this, motion reads as a glitch rather than a transition
const MOTION_MAX = 400; // above this, the interface feels slow regardless of easing

const results = [];
const add = (id, name, verdict, measured, note) => results.push({ id, name, verdict, measured, note });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  // ── 1. FOCUS IS VISIBLE ─────────────────────────────────────────────────────────────
  // Screenshot-diffed, not computed-style-read: a rule can exist and be overridden, and
  // `outline: none` with no replacement is the single most common keyboard-hostile default.
  const focusables = await page.$$('a[href],button,input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])');
  // Two screenshots per element makes this O(n) in browser round-trips: 8 controls ran in
  // 4s, a 100-control tool page took 136s. Sample EVENLY across the DOM rather than taking
  // the first N — the first N on most pages is the nav, which shares one treatment and would
  // make the sample unrepresentative of the body.
  const FOCUS_SAMPLE = 24;
  const step = Math.max(1, Math.ceil(focusables.length / FOCUS_SAMPLE));
  const focusSample = focusables.filter((_, i) => i % step === 0).slice(0, FOCUS_SAMPLE);
  const sampled = focusSample.length < focusables.length;
  const noFocus = [];
  let byPixel = 0, byStyle = 0;

  // Pixel-diff is the better test — a CSS rule can exist and be overridden — but it needs the
  // element to hold still, and Playwright waits for that. `animations:'disabled'` freezes CSS
  // motion only; a WebGL canvas keeps painting, so on those pages every call burns its full
  // timeout (measured: ~12s per element, 138s for one screen).
  //
  // So: try pixels with a short budget, fall back to computed style, and REPORT WHICH. A
  // fallback that hides which method ran is the same silent-degradation bug this file exists
  // to catch elsewhere.
  const FOCUS_PROPS = ['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset',
                       'boxShadow', 'borderColor', 'borderWidth', 'backgroundColor',
                       'color', 'transform', 'opacity', 'textDecorationLine'];
  for (const el of focusSample) {
    const label = await el.evaluate((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 24)) || 'unnamed';
    // A control inside a hidden state cannot take focus, so "no change on focus" is correct
    // behaviour, not a missing focus style. Skip it rather than report a defect that is not one.
    const focusable = await el.evaluate((e) => {
      const cs = getComputedStyle(e);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]') && e.offsetParent !== null;
    });
    if (!focusable) continue;
    let changed = null;
    try {
      const opt = { animations: 'disabled', timeout: 700 };
      const before = await el.screenshot(opt);
      await el.focus({ timeout: 700 });
      await page.waitForTimeout(50);
      const after = await el.screenshot(opt);
      changed = Buffer.compare(before, after) !== 0;
      byPixel++;
    } catch {
      try {
        const read = () => el.evaluate((e, p) => { const cs = getComputedStyle(e); return p.map((k) => cs[k]); }, FOCUS_PROPS);
        await page.evaluate(() => document.activeElement?.blur());
        const rest = await read();
        await el.focus({ timeout: 700 });
        await page.waitForTimeout(50);
        const foc = await read();
        changed = FOCUS_PROPS.some((_, i) => rest[i] !== foc[i]);
        byStyle++;
      } catch { continue; }
    }
    if (changed === false) noFocus.push(label);
    await page.evaluate(() => document.activeElement?.blur());
  }
  add('focus-visible', 'focus is visibly indicated',
    noFocus.length ? 'FAIL' : 'PASS',
    `${(byPixel + byStyle) - noFocus.length}/${byPixel + byStyle} show a change on focus` +
      (sampled ? ` (sampled ${focusSample.length} of ${focusables.length})` : ''),
    `${byPixel} by pixel-diff, ${byStyle} by computed style` +
      (byStyle ? ': style fallback used where the page never went still; a rule that exists but is overridden would pass' : ''));

  // Visible-because-the-browser-did-it is not the same as designed. The UA ring varies by
  // browser and platform, and its contrast against THIS page's colours is unverified — so a
  // page with no authored focus style is relying on a default it does not control.
  const authoredFocus = await page.evaluate(() => {
    let n = 0;
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules || []) if (r.selectorText && /:focus/.test(r.selectorText)) n++;
    }
    return n;
  });
  add('focus-authored', 'focus state is designed, not inherited',
    authoredFocus > 0 ? 'PASS' : 'FAIL',
    `${authoredFocus} :focus rule(s) in the page's own stylesheets`,
    authoredFocus ? 'page defines its own focus treatment'
      : 'relying on the browser default ring. Varies by browser/platform, contrast against this page unverified');

  // ── 2. EVERY INTERACTIVE ELEMENT IS KEYBOARD-REACHABLE ──────────────────────────────
  const reach = await page.evaluate(() => {
    const all = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button]')];
    const unreachable = all.filter((e) => e.tabIndex < 0 || e.hasAttribute('disabled')).length;
    return { total: all.length, unreachable };
  });
  add('keyboard-reach', 'every control is keyboard-reachable',
    reach.unreachable === 0 ? 'PASS' : 'FAIL',
    `${reach.total - reach.unreachable}/${reach.total} reachable`,
    'tabIndex >= 0 and not disabled');

  // ── 3. TYPE SCALE IS HELD ───────────────────────────────────────────────────────────
  // The invariant behind 11/12/14/16/18 is not those numbers — it is that there are FIVE
  // of them. A screen with fourteen sizes has no scale, it has a history.
  // Same rule as the hierarchy block: only elements with a DIRECT text node, and never
  // <style>/<script>. Two checks measuring one property with different rules will disagree,
  // and a reader has no way to know which is right.
  const sizes = await page.evaluate(() => {
    const seen = new Map();
    document.querySelectorAll('*').forEach((el) => {
      if (/^(STYLE|SCRIPT|TITLE|HEAD|META|LINK)$/.test(el.tagName)) return;
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!direct) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const px = Math.round(parseFloat(cs.fontSize) * 10) / 10;
      seen.set(px, (seen.get(px) ?? 0) + 1);
    });
    return [...seen.entries()].sort((a, b) => a[0] - b[0]);
  });
  add('type-scale', 'type scale is a closed set',
    sizes.length <= SCALE_MAX ? 'PASS' : 'FAIL',
    `${sizes.length} distinct sizes: ${sizes.map(([px]) => px + 'px').join(' ')}`,
    `a held scale is <= ${SCALE_MAX} steps; more than that is accumulation, not a system`);

  // ── 3b. HIERARCHY — measured on all four levers ──────────────────────────────────────
  // Hierarchy is a RELATIONSHIP, so every check here measures a DIFFERENCE, not a value.
  // Counting distinct sizes says nothing: 14/15/16px is three sizes and one rank, because
  // the steps are too close to read as different. The levers are size · weight · contrast ·
  // spacing, and a screen that varies only one of them is ranking on one axis.
  const hier = await page.evaluate(() => {
    const lum = (rgb) => {
      const m = rgb.match(/\d+(\.\d+)?/g); if (!m) return null;
      const [r, g, b] = m.slice(0, 3).map((v) => {
        const c = +v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const sizes = new Set(), weights = new Set(), lums = new Set(), gaps = new Map();
    let prev = null;
    document.querySelectorAll('*').forEach((el) => {
      const txt = (el.textContent || '').trim();
      const cs = getComputedStyle(el);
      const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      // <style>/<script>/<title> hold text nodes with a computed colour and are never
      // rendered. Counting them invents ranks that do not exist on the screen.
      const isSource = /^(STYLE|SCRIPT|TITLE|HEAD|META|LINK)$/.test(el.tagName);
      const rendered = cs.display !== 'none' && cs.visibility !== 'hidden' && !el.closest('[hidden]');
      if (txt && direct && !isSource && rendered) {
        sizes.add(Math.round(parseFloat(cs.fontSize) * 10) / 10);
        weights.add(parseInt(cs.fontWeight, 10) || 400);
        const L = lum(cs.color); if (L !== null) lums.add(Math.round(L * 1000) / 1000);
      }
      // vertical rhythm: gaps actually rendered between stacked siblings
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.width > 0) {
        if (prev && r.top >= prev.bottom) {
          const g = Math.round(r.top - prev.bottom);
          if (g > 0 && g < 200) gaps.set(g, (gaps.get(g) ?? 0) + 1);
        }
        prev = r;
      }
    });
    return {
      sizes: [...sizes].sort((a, b) => a - b),
      weights: [...weights].sort((a, b) => a - b),
      lums: [...lums].sort((a, b) => a - b),
      gaps: [...gaps.keys()].sort((a, b) => a - b),
    };
  });

  // SIZE — the ratio between adjacent steps. Below ~1.1 the eye reads them as the same size,
  // so the step exists in the stylesheet and not on the screen.
  const sizeRatios = hier.sizes.slice(1).map((v, i) => +(v / hier.sizes[i]).toFixed(3));
  const flatSteps = sizeRatios.filter((r) => r < 1.1);
  add('hierarchy-size', 'size steps are far enough apart to rank',
    flatSteps.length ? 'FAIL' : hier.sizes.length > 1 ? 'PASS' : 'INFO',
    `${hier.sizes.join(' / ')}px → ratios ${sizeRatios.join(' · ') || 'n/a'}`,
    flatSteps.length ? `${flatSteps.length} step(s) below 1.1x: present in CSS, invisible on screen`
      : hier.sizes.length > 1 ? 'every adjacent step is >=1.1x' : 'only one size; nothing to rank');

  // WEIGHT — a single weight means the lever carries zero information.
  add('hierarchy-weight', 'weight is used as a rank',
    hier.weights.length > 1 ? 'PASS' : 'FAIL',
    `${hier.weights.length} weight(s): ${hier.weights.join(' / ')}`,
    hier.weights.length > 1 ? 'weight differentiates at least two ranks'
      : 'one weight across the whole screen. The lever is unused');

  // CONTRAST FOR HIERARCHY — distinct from legibility contrast. axe asks "can you read it
  // against the background". This asks "can you tell primary from secondary". Two text
  // colours within 1.2:1 of each other occupy the same rank however legible both are.
  const lumRatios = hier.lums.slice(1).map((v, i) => +(((v + 0.05) / (hier.lums[i] + 0.05))).toFixed(2));
  const sameRank = lumRatios.filter((r) => r < 1.2);
  add('hierarchy-contrast', 'text ranks are separable by contrast',
    sameRank.length ? 'FAIL' : hier.lums.length > 1 ? 'PASS' : 'INFO',
    `${hier.lums.length} text luminance(s) → ratios ${lumRatios.join(' · ') || 'n/a'}`,
    sameRank.length ? `${sameRank.length} pair(s) within 1.2x: legible, but the same rank`
      : hier.lums.length > 1 ? 'every adjacent pair separates' : 'one text colour; nothing to rank');

  // SPACING — proximity is the strongest grouping cue there is. A rhythm built on a base unit
  // groups; arbitrary gaps do not, because nothing signals which items belong together.
  const base = [8, 4].find((b) => hier.gaps.length && hier.gaps.filter((g) => g % b === 0).length / hier.gaps.length >= 0.75);
  const offGrid = base ? hier.gaps.filter((g) => g % base !== 0) : hier.gaps;
  add('hierarchy-spacing', 'spacing follows a rhythm',
    !hier.gaps.length ? 'INFO' : base ? 'PASS' : 'FAIL',
    `${hier.gaps.length} distinct gap(s): ${hier.gaps.slice(0, 12).join(' ')}${hier.gaps.length > 12 ? ' …' : ''}`,
    base ? `${Math.round((1 - offGrid.length / hier.gaps.length) * 100)}% land on a ${base}px base` +
             (offGrid.length ? `: off-grid: ${offGrid.join(', ')}px` : '')
      : hier.gaps.length ? 'no base unit fits 75% of gaps. Spacing is arbitrary, so proximity groups nothing'
      : 'no stacked siblings measured');

  // How many levers are actually in play. Ranking on one axis is fragile: it disappears for
  // anyone who cannot perceive that axis, and it gives the eye a single weak cue.
  const levers = [
    hier.sizes.length > 1 && !flatSteps.length,
    hier.weights.length > 1,
    hier.lums.length > 1 && !sameRank.length,
    Boolean(base) && hier.gaps.length > 1,
  ].filter(Boolean).length;
  add('hierarchy-levers', 'hierarchy uses more than one lever',
    levers >= 2 ? 'PASS' : 'FAIL',
    `${levers}/4 levers in play (size · weight · contrast · spacing)`,
    levers >= 2 ? 'rank survives losing any single cue' : 'ranking on one axis or none');

  // ── 3c. COPY TELLS ─────────────────────────────────────────────────────────────────
  // Scans RENDERED text only. Code comments are exempt: this is a rule about what a user
  // reads, and a comment is not copy. Every state is unhidden first, or the check would pass
  // on the copy it never looked at.
  const copy = await page.evaluate(() => {
    document.querySelectorAll('[data-state]').forEach((e) => (e.hidden = false));
    const hits = [];
    document.querySelectorAll('*').forEach((el) => {
      if (/^(STYLE|SCRIPT|TITLE|HEAD|META|LINK)$/.test(el.tagName)) return;
      [...el.childNodes].filter((n) => n.nodeType === 3).forEach((n) => {
        const t = n.textContent;
        if (/\s[—–]\s/.test(t)) hits.push(t.trim().slice(0, 52));
      });
    });
    document.querySelectorAll('[data-state]').forEach((e) => (e.hidden = true));
    return hits;
  });
  add('copy-no-dash', 'no em/en dash in UI copy',
    copy.length ? 'FAIL' : 'PASS',
    copy.length ? `${copy.length}: ${copy.join(' | ')}` : 'none in rendered text',
    'a spaced dash is an AI-writing tell and usually replaces a full stop the sentence needed');

  // ── 4. MOTION IS SHORT, EASED, AND FROM A SMALL SET ─────────────────────────────────
  const motion = await page.evaluate(() => {
    const durs = new Set(), eases = new Set();
    const push = (d, e) => {
      String(d).split(',').forEach((x) => {
        const v = x.trim();
        if (!v || v === '0s' || v === '0ms') return;
        durs.add(v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000);
      });
      String(e).split(',').forEach((x) => x.trim() && eases.add(x.trim()));
    };
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      push(cs.transitionDuration, cs.transitionTimingFunction);
      push(cs.animationDuration, cs.animationTimingFunction);
    });
    return { durs: [...durs].sort((a, b) => a - b), eases: [...eases] };
  });
  const tooSlow = motion.durs.filter((d) => d > MOTION_MAX);
  const tooFast = motion.durs.filter((d) => d < MOTION_MIN);
  const linear = motion.eases.filter((e) => e === 'linear');
  add('motion-duration', 'motion sits in the usable band',
    (tooSlow.length || tooFast.length) ? 'FAIL' : motion.durs.length ? 'PASS' : 'INFO',
    motion.durs.length ? `${motion.durs.map((d) => d + 'ms').join(' ')}` : 'no transitions or animations',
    `${MOTION_MIN}-${MOTION_MAX}ms.` + (tooSlow.length ? ` too slow: ${tooSlow.join(', ')}ms.` : '') + (tooFast.length ? ` too fast: ${tooFast.join(', ')}ms.` : ''));
  add('motion-easing', 'motion is eased, not linear',
    linear.length ? 'FAIL' : motion.eases.length ? 'PASS' : 'INFO',
    motion.eases.length ? motion.eases.join(' · ') : 'none',
    linear.length ? 'linear reads as mechanical; UI motion decelerates' : 'no linear timing found');

  // ── 5. REDUCED MOTION IS RESPECTED ──────────────────────────────────────────────────
  // Compared across two contexts rather than grepping for the media query, because the query
  // can exist and not actually stop anything.
  const rmCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const rmPage = await rmCtx.newPage();
  await rmPage.goto(url, { waitUntil: 'networkidle' });
  await rmPage.waitForTimeout(900);
  const rmA = await rmPage.screenshot();
  await rmPage.waitForTimeout(900);
  const rmB = await rmPage.screenshot();
  const stillMoving = Buffer.compare(rmA, rmB) !== 0;
  await rmCtx.close();
  add('reduced-motion', 'motion stops under prefers-reduced-motion',
    stillMoving ? 'FAIL' : 'PASS',
    stillMoving ? 'pixels still changing 1.8s apart with reduce set' : 'static under reduce',
    'two frames 900ms apart, compared byte-for-byte');

  // ── 6. INTERACTION FEEDBACK LANDS INSIDE THE PERCEPTION WINDOW ──────────────────────
  // The control under test must be VISIBLE and, where identifiable, the primary action.
  // Clicking whatever happens to be first in the DOM tested a hidden link with no handler
  // and then reported the silence as neutral.
  const probe = await page.evaluate(() => {
    const vis = (e) => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && !e.closest('[hidden]') && e.offsetParent !== null; };
    const all = [...document.querySelectorAll('button, [role=button], a[href], input[type=submit]')].filter(vis);
    const primary = all.find((e) => /submit|primary|cta/i.test(e.className)) || all.find((e) => e.tagName === 'BUTTON') || all[0];
    if (!primary) return null;
    primary.setAttribute('data-latency-probe', '1');
    return (primary.getAttribute('aria-label') || primary.textContent || primary.tagName).trim().slice(0, 24);
  });
  if (probe) {
    const ms = await page.evaluate(async () => {
      const el = document.querySelector('[data-latency-probe]');
      if (!el) return null;
      return await new Promise((res) => {
        const t0 = performance.now();
        let done = false;
        const obs = new MutationObserver(() => { if (!done) { done = true; obs.disconnect(); res(performance.now() - t0); } });
        obs.observe(document.body, { attributes: true, childList: true, subtree: true, characterData: true });
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        setTimeout(() => { if (!done) { obs.disconnect(); res(-1); } }, 1200);
      });
    });
    add('feedback-latency', 'first visible response to a click',
      ms === null || ms < 0 ? 'INFO' : ms <= INSTANT ? 'PASS' : ms <= RESPONSIVE ? 'WARN' : 'FAIL',
      ms === null || ms < 0 ? `"${probe}" produced no DOM change within 1.2s` : `${Math.round(ms)}ms: "${probe}"`,
      `<=${INSTANT}ms reads as instant, <=${RESPONSIVE}ms as responsive. A control that changes nothing may be correct.`);
  }

  // ── 7. STATE IS NOT CARRIED BY COLOUR ALONE ─────────────────────────────────────────
  // Hover each control and check whether ANYTHING besides colour changed. Colour-only state
  // is invisible to a large share of users and disappears entirely in high-contrast modes.
  const colourOnly = [], noHover = [];
  for (const el of focusables.slice(0, 12)) {
    try {
      const props = ['color', 'backgroundColor', 'borderColor', 'outlineColor',
                     'borderWidth', 'outlineWidth', 'boxShadow', 'textDecorationLine',
                     'fontWeight', 'transform', 'opacity'];
      const read = () => el.evaluate((e, p) => { const cs = getComputedStyle(e); return p.map((k) => cs[k]); }, props);
      const rest = await read();
      // force:true skips the stability wait — we are reading computed styles, not clicking,
      // so actionability is not the property under test.
      await el.hover({ force: true, timeout: 2500 });
      await page.waitForTimeout(120);
      const hov = await read();
      const changed = props.filter((_, i) => rest[i] !== hov[i]);
      const label = (await el.evaluate((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 20))) || 'unnamed';
      // An element with NO hover response is not passing this check — it has no state to
      // evaluate. Silence is a separate finding, not compliance.
      if (!changed.length) noHover.push(label);
      else if (changed.every((c) => /color/i.test(c))) colourOnly.push(label);
    } catch {}
  }
  add('hover-affordance', 'controls respond to hover at all',
    noHover.length ? 'FAIL' : 'PASS',
    `${focusables.slice(0, 12).length - noHover.length}/${Math.min(focusables.length, 12)} respond`,
    noHover.length ? `no hover response: ${noHover.join(', ')}` : 'every sampled control changes on hover');
  add('state-not-colour-alone', 'hover state uses more than colour',
    colourOnly.length ? 'FAIL' : noHover.length === Math.min(focusables.length, 12) ? 'INFO' : 'PASS',
    colourOnly.length ? `colour-only: ${colourOnly.join(', ')}`
      : noHover.length === Math.min(focusables.length, 12) ? 'nothing to judge: no hover states exist' : 'no colour-only hover states',
    'compares 11 computed properties at rest vs hover');

  // ── 8. DESTRUCTIVE ACTIONS ARE REVERSIBLE ───────────────────────────────────────────
  // Heuristic, and labelled as such: matches destructive verbs, then looks for an undo
  // affordance anywhere on the page. Cannot see a toast that only appears after the action.
  const destructive = await page.evaluate(() => {
    const words = /\b(delete|remove|discard|trash|archive|clear|erase|revoke|cancel subscription)\b/i;
    const undo = /\b(undo|restore|revert|bring back)\b/i;
    const controls = [...document.querySelectorAll('button,a[href],[role=button]')];
    return {
      destructive: controls.filter((e) => words.test((e.getAttribute('aria-label') || '') + ' ' + e.textContent)).length,
      undo: controls.filter((e) => undo.test((e.getAttribute('aria-label') || '') + ' ' + e.textContent)).length ||
            (undo.test(document.body.innerText) ? 1 : 0),
    };
  });
  add('destructive-reversible', 'destructive actions have an undo path',
    destructive.destructive === 0 ? 'INFO' : destructive.undo > 0 ? 'PASS' : 'WARN',
    `${destructive.destructive} destructive control(s), ${destructive.undo} undo affordance(s)`,
    'HEURISTIC: matches verbs in labels; cannot see an undo toast that appears only after the action');

  await ctx.close();
} finally {
  await browser.close();
}

// Explicitly out of reach for a machine. Naming these is the point: a checker that stays
// silent about its blind spots gets read as complete.
const HUMAN_ONLY = [
  'whether the shortcuts chosen match what users actually do most',
  'whether an optimistic update is honest about what has not yet persisted',
  'whether the split/grouping model matches how the user thinks about their work',
  'whether motion is communicating a relationship or just decorating a change',
  'whether the type scale steps are far enough apart to read as hierarchy',
];

if (asJson) {
  console.log(JSON.stringify({ target, results, humanOnly: HUMAN_ONLY }, null, 2));
} else {
  console.log(`\n  craft-evals · ${target}\n`);
  for (const r of results) {
    const mark = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN', INFO: '····' }[r.verdict];
    console.log(`  ${mark}  ${r.name}`);
    console.log(`        ${r.measured}`);
    if (r.note) console.log(`        ${r.note}`);
    console.log('');
  }
  const fails = results.filter((r) => r.verdict === 'FAIL');
  console.log(`  ${fails.length} failing · ${results.filter((r) => r.verdict === 'WARN').length} warning · ${results.length} checked\n`);
  console.log('  a machine cannot judge:');
  for (const h of HUMAN_ONLY) console.log(`    · ${h}`);
  console.log('');
}
process.exit(results.some((r) => r.verdict === 'FAIL') ? 1 : 0);
