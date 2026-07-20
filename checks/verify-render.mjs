// verify-render — after every run, does the rendered card actually follow the prescribed
// format, or did it silently fall back?
//
// Runs 6, 7 and 8 rendered as gap cards because no teaching record was ever written. The
// workbench printed the untaught run ids and nothing stopped. A warning nobody is required
// to read is a warning that gets read once.
//
// Deliberately DETERMINISTIC rather than model-judged. The prescribed format is a structural
// contract — these sections, in this order, with a craft table of six named rows — and
// structure is a DOM query. A model asked "is this the right format?" would be slower,
// non-reproducible, and no more accurate on a question with a definite answer. Where a model
// WOULD earn its cost is judging whether the craft rows contain what they claim (is the
// `evidence` row actually evidence, or a restatement of `mechanism`?) — that is semantic, and
// it belongs to the cold auditor, not here.
//
// Usage:  node checks/verify-render.mjs [--target prototype.html]
import { chromium } from 'playwright';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { load, pairSteps, AXES } from './lib/runs.mjs';

const argv = process.argv.slice(2);
const tIdx = argv.indexOf('--target');
const target = tIdx !== -1 ? argv[tIdx + 1] : 'prototype.html';
const wb = `workbench-${path.basename(target).replace(/\.html?$/i, '')}.html`;

if (!fs.existsSync(wb)) {
  console.error(`  no workbench for ${target}. Run: npm run workbench -- ${target}`);
  process.exit(2);
}

const { runs, verdictOf, auditFor, lessonFor, teachFor } = load();
const steps = pairSteps(runs, verdictOf, auditFor, lessonFor, teachFor).filter((s) => s.run.target === target);

// The contract, stated once so the check and the runbook cannot drift apart.
const REQUIRED = [
  { key: 'learned', sel: '.sec.learned', why: 'the vocabulary: the only part that transfers' },
  { key: 'practise', sel: '.practise', why: 'the rehearsable next action, not a score' },
  { key: 'dimensions', sel: '.dims tr', min: AXES.length, why: `all ${AXES.length} feedback dimensions` },
  { key: 'craft table', sel: '.craft tr', min: 3, why: 'the model answer, decomposed by dimension' },
];

// ── COVERAGE. Not "did the check pass" but "did the check HAPPEN". A run nobody measured
// looks identical to a run that measured clean unless something joins producers to consumers
// (CF-065). Every checker leaves a different trace, so absence of each has to be asked for
// separately rather than inferred from a green board.
const CHECKERS = [
  { key: 'design-gate', has: (s) => Array.isArray(s.run.checks) && s.run.checks.length > 0,
    fix: (id) => `npm run design-gate -- <file> --log` },
  { key: 'craft-evals', has: (s) => Array.isArray(s.run.craft) && s.run.craft.length > 0,
    fix: (id) => `npm run craft -- <file> --json  →  pass to --craft` },
  { key: 'state-matrix', has: (s) => Array.isArray(s.run.states) && s.run.states.length > 0,
    fix: (id) => `npm run states -- <file>  →  pass .state-matrix.json to --states` },
  { key: 'cold audit', has: (s) => Boolean(s.audit),
    fix: (id) => `node checks/log-audit.mjs ${id} --json '[...]'   (or --clean)` },
  { key: 'teaching', has: (s) => Boolean(s.teach),
    fix: (id) => `node checks/log-teach.mjs ${id} --json '{...}'` },
];

// Forward-only (gates apply forward, never backfilled). Every run before this predates the
// progressive wiring of the auto-checkers (craft-evals + state-matrix into design-gate) and
// the cold-audit/teaching discipline; backfilling their teaching is exactly what was rejected
// as bloat. So they are historical-exempt, and coverage is REQUIRED from here on.
const COVERAGE_FROM = '2026-07-20T00:30:00Z';
const exemptRuns = steps.filter((s) => s.run.id && (s.run.ts || '') < COVERAGE_FROM).length;
const coverage = steps.filter((s) => s.run.id && (s.run.ts || '') >= COVERAGE_FROM).map((s) => ({
  id: s.run.id,
  note: (s.run.note || '').slice(0, 34),
  missing: CHECKERS.filter((c) => !c.has(s)),
}));

const browser = await chromium.launch();
const problems = [];
const chromeMissing = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(`file://${path.resolve(wb)}`, { waitUntil: 'networkidle' });

  // ── CHROME. Every prototype iterated in the loop must render inside the workbench shell:
  // the nav bar (name switch, state dropdown, width toggle, theme toggle, panel toggle) and
  // the control panel. Asserted here so a change to workbench.mjs that drops any of them fails
  // the render, not just looks wrong. These are queried in the REAL rendered file, so the
  // check tracks what shipped, not what the source intends.
  const CHROME = [
    { key: 'nav: prototype switch', sel: 'select#tg-file' },
    { key: 'nav: state dropdown', sel: 'select#st' },
    { key: 'nav: width toggle', sel: '[aria-label="toggle phone or desktop width"]' },
    { key: 'nav: theme toggle', sel: '[aria-label="toggle light or dark theme"]' },
    { key: 'nav: panel toggle', sel: '[aria-label="toggle panel"]' },
    { key: 'control panel', sel: 'aside.panel' },
  ];
  for (const c of CHROME) if (!(await page.$(c.sel))) chromeMissing.push(c.key);

  const cards = await page.$$('details.run');
  for (const [i, card] of cards.entries()) {
    // Open it — the sections are inside a <details> and absent from layout while closed.
    await card.evaluate((d) => (d.open = true));
    const title = (await card.$eval('.ttl', (e) => e.textContent.trim()).catch(() => 'untitled')).slice(0, 44);
    const isGap = await card.$('.gapcard');
    const isHistoric = await card.$('.gapcard.historic');

    if (isHistoric) continue;                       // predates the layer; not a task
    if (isGap) { problems.push({ card: title, missing: ['ALL: no teaching record'] }); continue; }

    // No spaced dash in anything WE author. Quoted text is exempt: your verbatim feedback
    // and the cold auditor's findings are other people's words, and rewriting them to suit
    // our house style would falsify what was actually said.
    const dashes = await card.$$eval('*', (els) => {
      const out = [];
      els.forEach((el) => {
        if (/^(STYLE|SCRIPT|TITLE)$/.test(el.tagName)) return;
        if (el.closest('blockquote') || el.closest('.chips') || el.closest('.next')) return;
        [...el.childNodes].filter((n) => n.nodeType === 3).forEach((n) => {
          if (/\s[—–]\s/.test(n.textContent)) out.push(n.textContent.trim().slice(0, 40));
        });
      });
      return out;
    });

    const missing = [];
    if (dashes.length) missing.push(`spaced dash in authored copy: ${[...new Set(dashes)].slice(0, 3).join(' | ')}`);
    for (const r of REQUIRED) {
      const n = (await card.$$(r.sel)).length;
      if (n < (r.min ?? 1)) missing.push(`${r.key} (${r.why})`);
    }
    if (missing.length) problems.push({ card: title, missing });
  }
  // Behaviour, not just presence: a control that renders but does nothing passes a presence
  // check vacuously. Click the two toggles with a clean signal and confirm each changes state.
  // Cheap: same page, two clicks, run last so it does not disturb the card checks above.
  const dead = await page.evaluate(() => {
    const out = [], root = document.documentElement;
    const th = document.getElementById('th');
    if (th) { const b = root.getAttribute('data-theme'); th.click(); if (root.getAttribute('data-theme') === b) out.push('theme toggle'); }
    const tg = document.getElementById('tg');
    if (tg) { const b = document.body.classList.contains('collapsed'); tg.click(); if (document.body.classList.contains('collapsed') === b) out.push('panel toggle'); }
    return out;
  });
  for (const d of dead) chromeMissing.push(`dead: ${d}`);

  // STATE-SWITCH gate (CF-070, deterministic). The srcdoc state-switch was silently broken
  // once (replaceState no-ops on about:srcdoc) and only an eyeball caught it. Drive the state
  // dropdown to a drawn state and assert the embedded prototype actually switches. This is the
  // automated version of "see it, do not grep it".
  const drawn = await page.$$eval('#st option', (os) =>
    os.filter((o) => o.value && !o.disabled).map((o) => o.value));
  if (drawn.length) {
    const target = drawn[drawn.length - 1];
    await page.selectOption('#st', target).catch(() => {});
    await page.waitForTimeout(600); // srcdoc reload
    const switched = await page.evaluate((t) => {
      const fr = document.getElementById('fr');
      const d = fr && fr.contentDocument;
      if (!d) return false;
      const vis = [...d.querySelectorAll('[data-state]')].filter((e) => !e.hidden).map((e) => e.getAttribute('data-state'));
      return vis.includes(t);
    }, target);
    if (!switched) chromeMissing.push(`state-switch dead: selecting '${target}' did not drive the stage`);
  }
} finally {
  await browser.close();
}

const checked = steps.filter((s) => s.run.id).length;
// coverage first: a card cannot follow the format if the inputs never ran
const uncovered = coverage.filter((c) => c.missing.length);
console.log(`\n  verify · ${wb}`);

console.log(`\n  CHROME: does the workbench shell render (nav bar + control panel)?`);
if (!chromeMissing.length) {
  console.log(`    PASS  all 6 shell controls present (name · state · width · theme · panel toggle · panel)`);
} else {
  console.log(`    FAIL  ${chromeMissing.length} missing: ${chromeMissing.join(', ')}`);
  console.log(`      every prototype in the loop must render inside the workbench shell. Fix workbench.mjs`);
}

console.log(`\n  COVERAGE: did each checker actually run?  (${exemptRuns} historical run(s) exempt, pre-wiring)`);
if (!uncovered.length) {
  console.log(`    PASS  all ${CHECKERS.length} checkers left evidence on all ${coverage.length} in-scope run(s)`);
} else {
  console.log(`    FAIL  ${uncovered.length}/${coverage.length} run(s) were never fully checked\n`);
  for (const c of uncovered) {
    console.log(`      ${c.id}  ${c.note}`);
    for (const m of c.missing) console.log(`          NEVER RAN: ${m.key.padEnd(13)} → ${m.fix(c.id)}`);
  }
}

// ── TASKS: house-rule 4, done implies an acceptance artifact ──────────────────
// validate-tasks.mjs was built to enforce that rule and then left with no trigger, which is
// the exact failure it detects. It belongs here because this file already answers "did the
// checks actually run"; "was the work actually closed" is the same question one level out.
//
// Called before BOTH exit paths below, not after: verify-render exits early when the format
// passes, so appending this at the end would have skipped it on every clean run. A check
// placed after an early return is a check that fires only when something else already failed.
function tasksSection() {
  console.log(`\n  TASKS: is every completed task backed by a closed loop?`);
  const vt = path.join(path.dirname(new URL(import.meta.url).pathname), 'validate-tasks.mjs');
  const r = spawnSync(process.execPath, [vt], { encoding: 'utf8', timeout: 30_000 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  if (r.status === null) { console.log(`    task check did not finish. NOT verified`); return; }
  const tally = out.split('\n').find((l) => l.includes('backed by a closed loop'));
  const verdict = out.split('\n').find((l) => l.startsWith('RESULT:'));
  if (verdict?.includes('all completions backed')) {
    console.log(`    PASS ${tally?.trim() ?? ''}`);
  } else {
    console.log(`    FAIL ${tally?.trim() ?? verdict?.trim() ?? 'unbacked completions'}`);
    // Only the lines under the unbacked header. validate-tasks prints exempt tasks in the
    // same `#N ...` shape, so a bare id-regex listed the EXEMPT task as a failure. An
    // exemption rendered as a failure is as wrong as a failure rendered as an exemption.
    let inUnbacked = false;
    for (const l of out.split('\n')) {
      if (l.includes('marked DONE with no acceptance artifact')) { inUnbacked = true; continue; }
      // Break only on the closing sentence. Breaking on a blank line stopped immediately,
      // because the header is followed by one.
      if (inUnbacked && /^\s*Each of these/.test(l)) break;
      if (inUnbacked && /^\s+#\d+\s/.test(l)) console.log(`      ${l.trim()}`);
    }
    console.log(`      node checks/validate-tasks.mjs for the detail`);
  }
}
tasksSection();

console.log(`\n  FORMAT: does each card follow the prescribed shape?`);
if (!problems.length) {
  console.log(`    PASS  every card follows the prescribed format (${checked} run(s) with ids)\n`);
  process.exit(uncovered.length || chromeMissing.length ? 1 : 0);
}

console.log(`    FAIL  ${problems.length} card(s) do not follow the prescribed format\n`);
for (const p of problems) {
  console.log(`      · ${p.card}`);
  for (const m of p.missing) console.log(`          missing: ${m}`);
}
const untaught = steps.filter((s) => s.run.id && !s.teach).map((s) => s.run.id);
if (untaught.length) {
  console.log(`\n    fix:`);
  for (const id of untaught) console.log(`      node checks/log-teach.mjs ${id} --json '{...}'`);
}
console.log('');
process.exit(1);
