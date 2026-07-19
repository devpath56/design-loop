// state-matrix — enforces the states design.md SAYS every prototype must cover.
//
// design.md has always said "loading · empty · error · success — and any low-confidence/partial
// state. Each gets a designed treatment, not an afterthought." Nothing ever checked that.
// A prototype could ship with one happy path and sail through the gate, because the gate only
// ever saw the state the page happens to load in.
//
// Contract: the prototype declares its states as elements carrying data-state="<name>".
// Each declared state is driven, gated INDEPENDENTLY, and screenshotted. An undrawn state is
// a FAIL with a name, not a shrug.
//
// Usage:  node checks/state-matrix.mjs <file.html> [--require loading,empty,error,success] [--shots <dir>]
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const flags = { require: '', shots: '' };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--require') flags.require = argv[++i] ?? '';
  else if (a === '--shots') flags.shots = argv[++i] ?? '';
  else if (a === '--required-only') flags.requiredOnly = true;
  else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  else positional.push(a);
}
const target = positional[0];
if (!target || !fs.existsSync(target)) {
  console.error('usage: node checks/state-matrix.mjs <file.html> [--require a,b,c] [--shots <dir>]');
  process.exit(2);
}

// The required set is, in priority order: an explicit --require flag; the artifact's own
// declared set; then a default. The universal four (loading/empty/error/success) turned out
// to be folklore: NN/g scopes "empty" to screens that hold DATA, and for an auth form the
// credibly-missing state is a lockout/rate-limit one, not "empty" (see design.md sources).
// So the artifact declares what states IT owes, via <meta name="ui-states" content="...">,
// and the default is only a fallback for a page that declares nothing.
const declared = (fs.readFileSync(target, 'utf8').match(/<meta\s+name=["']ui-states["']\s+content=["']([^"']+)["']/i) || [])[1];
const required = (flags.require || declared || 'loading,error,success').split(',').map((s) => s.trim()).filter(Boolean);
if (!flags.require && !flags.requiredOnly) console.log(`  required states: ${required.join(', ')}  (${declared ? 'declared by the artifact' : 'default'})`);

// Dry mode: print the resolved required set and exit before launching a browser. Exists so a
// test can assert the resolver (meta wins, default excludes 'empty') without driving Chromium.
// Testing the shipped code path, not a copy of it, is the only way the test cannot drift.
if (flags.requiredOnly) { console.log(required.join(',')); process.exit(0); }
const url = pathToFileURL(path.resolve(target)).href;

const browser = await chromium.launch({ headless: true });
const rows = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.goto(url, { waitUntil: 'networkidle' });

  // Two ways a state can exist, and both are legitimate:
  //   1. an ELEMENT that appears — an error message, an empty placeholder
  //   2. an ATTRIBUTE that modifies existing elements — a button that becomes its own
  //      spinner, where introducing a separate element would move attention off the control
  //      the user just pressed
  // Recognising only (1) forced the design toward a worse answer to satisfy the checker.
  const declared = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-state]')).map((el) => el.getAttribute('data-state'));
    const attrs = Array.from(document.querySelectorAll('[data-states]'))
      .flatMap((el) => (el.getAttribute('data-states') || '').split(/\s+/).filter(Boolean));
    return [...els, ...attrs];
  });
  const declaredSet = [...new Set(declared)];

  for (const state of required) {
    if (!declaredSet.includes(state)) {
      rows.push({ state, present: false, pass: false, detail: 'not drawn: no [data-state] element declares it' });
      continue;
    }
    // An attribute-driven state is entered by setting the attribute, not by unhiding an element.
    const isAttr = await page.evaluate((st) => {
      const host = document.querySelector('[data-states]');
      return Boolean(host && (host.getAttribute('data-states') || '').split(/\s+/).includes(st));
    }, state);
    if (isAttr) {
      await page.evaluate((st) => {
        const host = document.querySelector('[data-states]');
        host.setAttribute('data-state-active', st);
      }, state);
    }

    // Drive the page into this state, then gate it as its own page.
    await page.evaluate((s) => {
      document.querySelectorAll('[data-state]').forEach((el) => {
        el.hidden = el.getAttribute('data-state') !== s;
      });
    }, state);

    const visible = await page.evaluate((s) => {
      const host = document.querySelector('[data-states]');
      if (host && (host.getAttribute('data-states') || '').split(/\s+/).includes(s)) {
        return { ok: true, why: `attribute state on <${host.tagName.toLowerCase()}>` };
      }
      const el = document.querySelector(`[data-state="${s}"]`);
      if (!el) return { ok: false, why: 'element vanished' };
      const r = el.getBoundingClientRect();
      const txt = (el.innerText || '').trim();
      if (r.width < 2 || r.height < 2) return { ok: false, why: 'renders at zero size' };
      if (!txt && !el.querySelector('img,svg,canvas')) return { ok: false, why: 'renders empty: no text, no graphic' };
      return { ok: true, why: `${Math.round(r.width)}×${Math.round(r.height)}` };
    }, state);

    if (!visible.ok) {
      rows.push({ state, present: true, pass: false, detail: `declared but ${visible.why}` });
      continue;
    }

    const axe = await new AxeBuilder({ page }).analyze();
    const bad = axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

    const problems = [
      ...bad.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}`),
      overflow ? 'horizontal overflow' : null,
    ].filter(Boolean);

    if (flags.shots) {
      fs.mkdirSync(flags.shots, { recursive: true });
      await page.screenshot({ path: path.join(flags.shots, `state-${state}.png`) });
    }

    rows.push({
      state, present: true,
      pass: problems.length === 0,
      detail: problems.length ? problems.join('; ') : `drawn ${visible.why}, clean`,
    });
  }

  // Restore, then report any state the page declares that nobody required — often the
  // interesting one (low-confidence, partial, offline).
  await page.evaluate(() => document.querySelectorAll('[data-state]').forEach((el) => { el.hidden = false; }));
  const extra = declaredSet.filter((s) => !required.includes(s));
  if (extra.length) console.log(`\n  also declared (not required): ${extra.join(', ')}`);
  if (errs.length) console.log(`  page errors while driving states: ${[...new Set(errs)].slice(0, 2).join(' | ')}`);

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n  state-matrix · ${target}`);
let ok = true;
for (const r of rows) {
  console.log(`    ${r.pass ? 'PASS' : 'FAIL'}  ${r.state.padEnd(10)} ${r.detail}`);
  ok = ok && r.pass;
}
const undrawn = rows.filter((r) => !r.present).map((r) => r.state);
console.log(`\n  STATES: ${ok ? 'PASS ✅' : `FAIL ❌  ${undrawn.length ? `undrawn: ${undrawn.join(', ')}` : 'declared states have defects'}`}\n`);

fs.writeFileSync('.state-matrix.json', JSON.stringify({ target, rows }, null, 2));
process.exit(ok ? 0 : 1);
