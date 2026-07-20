// design-rat — RAT-per-loop. Trident's house-rule 0 ported to the design loop: before you touch the
// prototype, name the riskiest UX assumption you are making and the cheapest probe that could prove
// it WRONG. Not ceremony — it is the difference between hypothesis-driven design and blind iteration.
// The gate then refuses to let a logged run stand with no RAT opening it (forward-only).
//
// Record (opens a loop):
//   node checks/design-rat.mjs <file.html> --riskiest "users read the lockout without a countdown" \
//                                           --probe "show 5 people the locked state, ask when it lifts" --push proceed
// Gate (every post-cutoff run must have a RAT before it):
//   node checks/design-rat.mjs --gate [--strict]
import fs from 'node:fs';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const GATE = argv.includes('--gate');
const STRICT = argv.includes('--strict');
const LEDGER = 'design-rat.jsonl';
// RAT-per-loop shipped at this cutoff; runs logged before it predate the rule and are exempt.
const RAT_FROM = '2026-07-21T00:00:00Z';

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim())
  .flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);

const PLACEHOLDER = /^(tbd|todo|x{2,}|placeholder|n\/?a|\.{2,}|\?+|none|idk)$/i;
const thin = (s) => !s || !s.trim() || PLACEHOLDER.test(s.trim()) || s.trim().length < 12;

// ── the gate check (pure, so a control can exercise it in-memory) ─────────────────────────
export function ratGate(runs, rats, from = RAT_FROM) {
  const problems = [];
  for (const run of runs) {
    if ((run.ts || '') < from) continue; // forward-only: predates the rule
    const opened = rats.some((r) => r.target === run.target && (r.ts || '') <= (run.ts || ''));
    if (!opened) problems.push(`run ${run.id} (${run.target}) has no RAT before it — a loop opened with no riskiest-assumption`);
  }
  return problems;
}

// ── RECORD MODE ────────────────────────────────────────────────────────────────────────────
if (!GATE) {
  const flagVals = new Set([val('--riskiest'), val('--probe'), val('--push')]);
  const target = argv.find((a) => !a.startsWith('--') && !flagVals.has(a));
  const riskiest = val('--riskiest'), probe = val('--probe'), push = val('--push');
  const problems = [];
  if (!target) problems.push('no target file given');
  if (thin(riskiest)) problems.push('--riskiest is empty or a placeholder. Name the assumption most likely to be WRONG (not "make it nicer")');
  if (thin(probe)) problems.push('--probe is empty or a placeholder. Name the cheapest experiment that could FALSIFY the assumption');
  if (!['proceed', 'hold'].includes(push)) problems.push('--push must be proceed|hold (the first-principles answer to "should I build this?")');
  if (problems.length) {
    console.error('  RAT refused (house-rule 0 — a real RAT or no loop):');
    problems.forEach((p) => console.error('   - ' + p));
    process.exit(2);
  }
  const rec = {
    id: 'rat-' + crypto.randomBytes(4).toString('hex'),
    target, ts: new Date().toISOString(),
    riskiest_assumption: riskiest.trim(), cheapest_probe: probe.trim(), push_decision: push,
  };
  fs.appendFileSync(LEDGER, JSON.stringify(rec) + '\n');
  console.log(`  RAT recorded for ${target}  (push: ${push})`);
  console.log(`    riskiest: ${rec.riskiest_assumption}`);
  console.log(`    probe:    ${rec.cheapest_probe}`);
  process.exit(0);
}

// ── GATE MODE ────────────────────────────────────────────────────────────────────────────
const runs = read('design-runs.jsonl');
const rats = read(LEDGER);
const problems = ratGate(runs, rats);

console.log('== RAT-per-loop: every run after the cutoff opened with a riskiest-assumption ==\n');
const exempt = runs.filter((r) => (r.ts || '') < RAT_FROM).length;
console.log(`  ${exempt} run(s) exempt (predate the rule) · ${runs.length - exempt} in scope · ${rats.length} RAT(s) on file`);
for (const p of problems) console.log(`  MISSING  ${p}`);
if (!problems.length) console.log(`  ok       every in-scope run has a RAT before it`);

// controls (each must fire), so gutting ratGate is caught
const runFix = [{ id: 'rX', target: 't.html', ts: '2026-07-22T00:00:00Z' }];
const ratFix = [{ target: 't.html', ts: '2026-07-21T12:00:00Z' }];
const cNoRat = ratGate(runFix, []).length > 0;                 // post-cutoff run, no RAT -> flagged
const cHasRat = ratGate(runFix, ratFix).length === 0;          // same run WITH a RAT -> clean
const cExempt = ratGate([{ id: 'rOld', target: 't.html', ts: '2026-07-19T00:00:00Z' }], []).length === 0; // pre-cutoff exempt
const placeholderRefused = thin('TBD') && thin('') && !thin('a genuine, specific riskiest assumption');
console.log('\n  controls (each must fire):');
console.log(`    ok   a post-cutoff run with NO RAT is flagged        ${cNoRat ? 'ok' : 'FAIL'}`);
console.log(`    ok   the same run WITH a RAT is clean                ${cHasRat ? 'ok' : 'FAIL'}`);
console.log(`    ok   a pre-cutoff run is exempt (forward-only)       ${cExempt ? 'ok' : 'FAIL'}`);
console.log(`    ok   a placeholder riskiest/probe is refused         ${placeholderRefused ? 'ok' : 'FAIL'}`);
const ctrlBad = [cNoRat, cHasRat, cExempt, placeholderRefused].filter((x) => !x).length;

console.log(`\nRESULT: ${problems.length ? `${problems.length} RUN(S) WITH NO RAT` : ctrlBad ? 'CONTROL FAIL' : 'PASS'}`);
process.exit(STRICT && (problems.length || ctrlBad) ? 1 : 0);
