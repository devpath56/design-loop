// check-selfgrade (T-11) — the structural audit must be COLD: run by a different agent than
// the maker, never self-graded. The audit record (design-audits.jsonl) currently carries no
// grader attribution, so non-self-grading cannot be proven. This gate requires a `grader`
// field forward-only: audits logged after the cutoff must name a cold grader distinct from
// the maker. Old audits are exempt (gates apply forward).
//
// Run:  node checks/check-selfgrade.mjs [--strict]
import fs from 'node:fs';
const STRICT = process.argv.includes('--strict');
const CUTOFF = '2026-07-20T00:00:00Z'; // grader attribution required from here on
const MAKER = 'opus';                  // the maker model; a grader equal to it is self-grading

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim())
  .flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);

export function checkSelfgrade(audits, now = CUTOFF, maker = MAKER) {
  const problems = [];
  for (const a of audits) {
    if ((a.ts || '') < now) continue; // predates the rule
    const g = (a.grader || '').trim().toLowerCase();
    if (!g) problems.push(`audit ${a.runId}: no 'grader' field, cannot prove the audit was cold (not self-graded)`);
    else if (g === maker.toLowerCase()) problems.push(`audit ${a.runId}: grader '${a.grader}' == maker, that is self-grading`);
  }
  return problems;
}

export function controls() {
  const A = (o) => ({ runId: 'r', ts: '2026-07-20T01:00:00Z', findings: [], ...o });
  return [
    ['accepts a cold-graded audit (positive control)', checkSelfgrade([A({ grader: 'sonnet' })]).length === 0],
    ['rejects an audit with no grader', checkSelfgrade([A({})]).length > 0],
    ['rejects an audit graded by the maker (self-graded)', checkSelfgrade([A({ grader: 'opus' })]).length > 0],
    ['does NOT retro-fail an audit that predates the cutoff', checkSelfgrade([A({ ts: '2026-07-19T00:00:00Z' })]).length === 0],
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const audits = read('design-audits.jsonl');
  const problems = checkSelfgrade(audits);
  console.log('== self-grade gate: the cold audit must be attributable, not the maker ==\n');
  let cf = 0;
  console.log('  controls (each must fire):');
  for (const [n, ok] of controls()) { console.log(`    ${ok ? 'ok  ' : 'FAIL'} ${n}`); if (!ok) cf++; }
  console.log('');
  if (problems.length) { console.log(`  ${problems.length} problem(s):`); for (const p of problems) console.log(`    - ${p}`); }
  else console.log(`  all ${audits.length} audit(s) admissible (or exempt as pre-cutoff)`);
  const bad = problems.length + cf;
  console.log(`\nRESULT: ${bad ? `${bad} FAIL` : 'PASS'}`);
  process.exit(STRICT && bad ? 1 : (cf ? 1 : 0));
}
