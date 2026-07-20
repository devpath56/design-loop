// craft-delta — the loop's PROGRESSION spine. The gate answers "is it broken"; this answers
// "is it BETTER than last loop." Without it, a green run that quietly flattened the hierarchy or
// slowed the motion reads identical to one that sharpened them.
//
// It is a thin, deterministic layer over craft-evals (it does not re-implement any check): it runs
// craft-evals --json, scores the result, diffs it against the previous run for the SAME target, and
// prints what improved and what regressed. Two Trident ideas, ported:
//   · impact ratchet  — a forward-only number that may not regress. Here: craft FAILs may not RISE
//                       vs the previous run. Raising the bar is implicit (fewer fails sticks).
//   · measured delta  — the informative output is the CHANGE, not an absolute score, so it cannot
//                       become a vanity number you optimise for (CF-065). fails/levers are objective:
//                       a FAIL->PASS needs the measured property to actually move.
//
// Usage:
//   node checks/craft-delta.mjs <file.html>            # show delta vs the last run, write nothing
//   node checks/craft-delta.mjs <file.html> <runId>    # record this run (ties to a gate run id)
//   node checks/craft-delta.mjs <file.html> --strict   # exit 1 if craft REGRESSED (the ratchet)
//   node checks/craft-delta.mjs <file.html> --from <craft.json>  # reuse a precomputed craft-evals result
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2);
// Flags that take a value; their value must NOT be mistaken for the positional target/runId.
const valueFlags = ['--ledger', '--from'];
const consumed = new Set();
for (const f of valueFlags) { const i = argv.indexOf(f); if (i >= 0) consumed.add(i + 1); }
const positional = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i));
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const LEDGER = val('--ledger') || path.join(HERE, '..', 'design-craft.jsonl');
const fromFile = val('--from');
const target = positional.find((a) => !/^r[0-9a-f]{6,}$/.test(a));
const runId = positional.find((a) => /^r[0-9a-f]{6,}$/.test(a));
const strict = argv.includes('--strict');
if (!target) { console.error('usage: node checks/craft-delta.mjs <file.html> [runId] [--strict] [--from <json>]'); process.exit(2); }

// ── get the craft-evals result (reuse the checker; never duplicate its logic) ─────────────
let craft;
if (fromFile) {
  craft = JSON.parse(fs.readFileSync(fromFile, 'utf8'));
} else {
  const r = spawnSync('node', [path.join(HERE, 'craft-evals.mjs'), target, '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 });
  try { craft = JSON.parse(r.stdout); }
  catch { console.error('craft-evals produced no JSON:\n' + (r.stderr || r.stdout).slice(0, 400)); process.exit(2); }
}
const results = craft.results || [];
const V = Object.fromEntries(results.map((x) => [x.id, x.verdict]));
const M = Object.fromEntries(results.map((x) => [x.id, x.measured]));

// ── score: objective, hard to game. fails is the ratchet; levers is the progression lead ──
const count = (v) => results.filter((x) => x.verdict === v).length;
const leversMeasured = M['hierarchy-levers'] || '';
const levers = Number((leversMeasured.match(/(\d)\/4/) || [])[1] || 0); // "N/4 levers in play"
const score = { fails: count('FAIL'), warns: count('WARN'), passes: count('PASS'), levers };

// ── load the previous record for THIS target (forward-only: first run is the baseline) ────
const records = fs.existsSync(LEDGER)
  ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  : [];
const prior = records.filter((r) => r.target === target).at(-1) || null;

// ── the delta: which checks moved, and the lever/fail movement ────────────────────────────
const RANK = { FAIL: 0, WARN: 1, INFO: 2, PASS: 3 };
const improved = [], regressed = [];
if (prior) {
  for (const x of results) {
    const was = prior.verdicts?.[x.id];
    if (!was || was === x.verdict) continue;
    // only count meaningful crossings into/out of a real defect; INFO churn is noise
    const better = RANK[x.verdict] > RANK[was] && (was === 'FAIL' || was === 'WARN');
    const worse = RANK[x.verdict] < RANK[was] && (x.verdict === 'FAIL' || x.verdict === 'WARN');
    if (better) improved.push(`${x.id} ${was}→${x.verdict}`);
    if (worse) regressed.push(`${x.id} ${was}→${x.verdict}`);
  }
  if (levers !== (prior.score?.levers ?? levers)) {
    (levers > prior.score.levers ? improved : regressed).push(`hierarchy-levers ${prior.score.levers}→${levers}/4`);
  }
}

// ── report ────────────────────────────────────────────────────────────────────────────────
const regressedRatchet = prior && score.fails > prior.score.fails;
console.log(`\n  craft-delta · ${path.basename(target)}${prior ? `  (vs ${prior.runId || prior.ts?.slice(0, 10)})` : '  (baseline — first run)'}`);
if (!prior) {
  console.log(`    baseline: ${score.fails} fail · ${score.warns} warn · ${score.passes} pass · levers ${score.levers}/4`);
} else {
  console.log(`    ▲ improved:  ${improved.length ? improved.join(', ') : '(nothing moved up)'}`);
  console.log(`    ▼ regressed: ${regressed.length ? regressed.join(', ') : '(none)'}`);
  console.log(`    = fails ${score.fails} (was ${prior.score.fails}) · levers ${score.levers}/4 (was ${prior.score.levers}) · warns ${score.warns}`);
  console.log(`    RATCHET: ${regressedRatchet ? `BROKEN — fails rose ${prior.score.fails}→${score.fails}` : 'HELD (craft fails did not rise)'}`);
  if (!improved.length && !regressed.length) console.log(`    note: no craft signal moved — a green loop that changed nothing measurable is not an improvement`);
}

// ── record (only when tied to a run id, mirroring design-gate --log) ───────────────────────
if (runId) {
  const rec = { runId, target, ts: new Date().toISOString(), score, verdicts: V,
                levers: leversMeasured, typeScale: M['type-scale'], motion: M['motion-duration'] };
  fs.appendFileSync(LEDGER, JSON.stringify(rec) + '\n');
  console.log(`    recorded → design-craft.jsonl  (${runId})`);
}

process.exit(strict && regressedRatchet ? 1 : 0);
