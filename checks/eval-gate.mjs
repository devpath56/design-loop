// eval-gate — EVALUATES THE CHECKER. Runs design-gate over every labelled fixture and
// scores it as a classifier against ground truth.
//
// Why this exists: design-gate tells you whether a page is good. Nothing told you whether
// design-gate is any good. A gate with a high false-negative rate is worse than no gate —
// it issues confident approvals for defective work, and you stop looking.
//
// It shells out to the REAL design-gate rather than reimplementing its checks, so it tests
// the shipped artifact and not a copy that could drift from it.
//
// Usage:  node checks/eval-gate.mjs [--only <category>] [--verbose]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const verbose = argv.includes('--verbose');

const manifests = fs.existsSync('fixtures')
  ? fs.readdirSync('fixtures').filter((f) => f.startsWith('manifest-') && f.endsWith('.jsonl'))
  : [];
if (!manifests.length) {
  console.error('no fixtures/manifest-*.jsonl found: nothing to evaluate');
  process.exit(2);
}

const cases = [];
for (const m of manifests) {
  const lines = fs.readFileSync(path.join('fixtures', m), 'utf8').split('\n').filter((l) => l.trim());
  for (const [i, l] of lines.entries()) {
    try {
      const c = JSON.parse(l);
      // The slop manifest uses expectDeterministic; a11y/layout use expect. Normalise.
      c.expect = c.expect ?? c.expectDeterministic;
      if (!c.file || !c.expect) { console.warn(`  ${m}:${i + 1} missing file/expect. Skipped`); continue; }
      if (!fs.existsSync(c.file)) { console.warn(`  ${m}:${i + 1} missing file on disk: ${c.file}. Skipped`); continue; }
      cases.push(c);
    } catch { console.warn(`  ${m}:${i + 1} unparseable JSON. Skipped`); }
  }
}
if (!cases.length) { console.error('manifests contained no usable cases'); process.exit(2); }

const selected = only ? cases.filter((c) => c.category === only) : cases;

// Run the real gate. Exit 0 = PASS, 1 = FAIL, anything else = the gate itself broke,
// which is a distinct outcome from a fixture failing and must not be scored as one.
const runGate = (file) =>
  new Promise((resolve) => {
    const p = spawn('node', ['checks/design-gate.mjs', file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => {
      if (code !== 0 && code !== 1) return resolve({ verdict: 'ERROR', detail: out.trim().split('\n').slice(-3).join(' ').slice(0, 200) });
      const failed = [...out.matchAll(/FAIL {2}(.+?)(?: {2}→ (.+))?$/gm)].map((m) => (m[2] ? `${m[1].trim()}: ${m[2].trim()}` : m[1].trim()));
      resolve({ verdict: code === 0 ? 'PASS' : 'FAIL', detail: failed.join(' | ') });
    });
  });

// Bounded concurrency — one chromium per fixture serially would be needlessly slow.
const LIMIT = 4;
const results = [];
let cursor = 0;
process.stdout.write(`  evaluating ${selected.length} fixture(s)`);
await Promise.all(
  Array.from({ length: Math.min(LIMIT, selected.length) }, async () => {
    while (cursor < selected.length) {
      const c = selected[cursor++];
      const r = await runGate(c.file);
      process.stdout.write('.');
      results.push({ ...c, actual: r.verdict, detail: r.detail });
    }
  })
);
console.log('\n');

results.sort((a, b) => a.file.localeCompare(b.file));

const errored = results.filter((r) => r.actual === 'ERROR');
const scored = results.filter((r) => r.actual !== 'ERROR');
const certain = scored.filter((r) => r.confidence !== 'grey');
const grey = scored.filter((r) => r.confidence === 'grey');

// FAIL is the positive class: "the gate correctly rejects a defective page."
const classify = (r) =>
  r.expect === 'FAIL' && r.actual === 'FAIL' ? 'TP'
  : r.expect === 'PASS' && r.actual === 'PASS' ? 'TN'
  : r.expect === 'PASS' && r.actual === 'FAIL' ? 'FP'
  : 'FN';

for (const r of scored) r.outcome = classify(r);

const count = (set, o) => set.filter((r) => r.outcome === o).length;
const [TP, TN, FP, FN] = ['TP', 'TN', 'FP', 'FN'].map((o) => count(certain, o));
const pct = (n, d) => (d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(0)}%`);

console.log('  ═══ GATE EVALUATION (certain-label fixtures only) ═══\n');
console.log(`    True positives   ${TP}   caught a real defect`);
console.log(`    True negatives   ${TN}   correctly allowed a clean page`);
console.log(`    False positives  ${FP}   cried wolf on a fine page`);
console.log(`    False negatives  ${FN}   ⚠️  MISSED a real defect\n`);
console.log(`    Recall (catch rate)  ${pct(TP, TP + FN)}   of real defects, how many caught`);
console.log(`    Precision            ${pct(TP, TP + FP)}   of rejections, how many justified`);
console.log(`    Specificity          ${pct(TN, TN + FP)}   of clean pages, how many allowed\n`);

const fns = certain.filter((r) => r.outcome === 'FN');
if (fns.length) {
  console.log('  ═══ BLIND SPOTS: defects the gate approved ═══');
  console.log('  (each is a page that ships with a green light)\n');
  for (const r of fns) {
    console.log(`    ✗ ${r.file}`);
    console.log(`      probe: ${r.probe}`);
    console.log(`      why hard: ${r.whyHard ?? '—'}\n`);
  }
}

const fps = certain.filter((r) => r.outcome === 'FP');
if (fps.length) {
  console.log('  ═══ FALSE ALARMS: clean pages the gate rejected ═══\n');
  for (const r of fps) {
    console.log(`    ! ${r.file}`);
    console.log(`      probe: ${r.probe}`);
    console.log(`      gate said: ${r.detail || '(no detail)'}\n`);
  }
}

if (grey.length) {
  console.log('  ═══ GREY AREAS: scored separately, judgement calls ═══\n');
  for (const r of grey) {
    const agree = r.expect === r.actual;
    console.log(`    ${agree ? '=' : '≠'} ${r.file}  (expected ${r.expect}, got ${r.actual})`);
    console.log(`      ${r.probe}`);
    if (!agree) console.log(`      human verdict: ${r.humanVerdict ?? '—'}`);
  }
  const agreed = grey.filter((r) => r.expect === r.actual).length;
  console.log(`\n    grey agreement: ${agreed}/${grey.length}. Disagreement here is a spec question, not a bug\n`);
}

if (errored.length) {
  console.log('  ═══ HARNESS ERRORS: gate crashed, not scored ═══\n');
  for (const r of errored) console.log(`    ⚡ ${r.file}: ${r.detail}`);
  console.log('');
}

if (verbose) {
  console.log('  ═══ ALL RESULTS ═══\n');
  for (const r of scored) console.log(`    ${r.outcome.padEnd(3)} ${r.expect.padEnd(4)}→${r.actual.padEnd(5)} ${r.file}`);
  console.log('');
}

// Write the machine-readable report so gate quality can be tracked across commits the same
// way design-runs.jsonl tracks page quality.
const report = {
  ts: new Date().toISOString(),
  fixtures: results.length,
  certain: { TP, TN, FP, FN },
  grey: { total: grey.length, agreed: grey.filter((r) => r.expect === r.actual).length },
  errors: errored.length,
  blindSpots: fns.map((r) => ({ file: r.file, probe: r.probe, whyHard: r.whyHard })),
  falseAlarms: fps.map((r) => ({ file: r.file, probe: r.probe })),
};
fs.writeFileSync('fixtures/eval-report.json', JSON.stringify(report, null, 2));
console.log(`  report → fixtures/eval-report.json`);

// A false negative is the failure mode that matters: the gate blessed a defective page.
// Exit non-zero so this can gate CI on the CHECKER's own quality.
if (FN > 0) {
  console.log(`\n  RESULT: ${FN} BLIND SPOT(S) ❌. The gate approves defects it claims to catch\n`);
  process.exit(1);
}
console.log(`\n  RESULT: no blind spots on certain-label fixtures ✅\n`);
