// teach-gate — design-loop is a TEACHING loop, so the LEARN step must actually teach, deterministically.
// After Devansh gives feedback, the lesson may not be a changelog ("changed X"). It must carry the
// teaching triad, because that is what turns a fix into a transferable skill:
//   mechanism — the named design principle/mechanism behind the feedback (vocabulary he can reuse)
//   senior    — what a staff/senior designer would have said or done (the calibration)
//   source    — an authoritative citation (so the opinion survives scrutiny, not just taste)
//
// This is the deterministic hardening of the memory "teach-design-critique-after-every-feedback":
// a reminder is house-rule-1's weakest tier; this makes an untaught lesson FAIL a gate instead.
//
// Forward-only: a lesson is subject to the triad ONLY if it carries a `ts` stamp at/after TEACH_FROM.
// The pre-existing prose lessons have no `ts` and are exempt (gates apply forward, never backfilled).
//
// Run:  node checks/teach-gate.mjs [--strict]
import fs from 'node:fs';
const STRICT = process.argv.includes('--strict');
const TEACH_FROM = '2026-07-20T22:00:00Z';
const FIELDS = ['mechanism', 'senior', 'source'];
const PLACEHOLDER = /^(tbd|todo|n\/?a|none|\.\.\.|xxx+)$/i;

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim())
  .flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);

export function teachGate(lessons, from = TEACH_FROM) {
  const problems = [];
  for (const l of lessons) {
    if (!l.ts || l.ts < from) continue; // pre-`ts` prose lessons predate the rule
    for (const f of FIELDS) {
      const v = (l[f] || '').trim();
      if (!v || v.length < 8 || PLACEHOLDER.test(v)) {
        problems.push(`lesson ${l.runId || l.ts}: '${f}' is missing/empty — a lesson with no ${f} is a changelog, not teaching`);
      }
    }
  }
  return problems;
}

export function controls() {
  const good = { ts: '2026-07-21T00:00:00Z', mechanism: 'staging directs attention to one focal point',
    senior: 'a staff designer would spend the effect on one hero line', source: 'Disney Staging (Thomas & Johnston)' };
  const A = (o) => Object.assign({}, good, o);
  return [
    ['a complete teaching lesson passes (positive control)', teachGate([good]).length === 0],
    ['a lesson missing `senior` fails', teachGate([A({ senior: '' })]).length > 0],
    ['a lesson missing `source` fails', teachGate([A({ source: '' })]).length > 0],
    ['a placeholder mechanism fails', teachGate([A({ mechanism: 'TBD' })]).length > 0],
    ['a pre-cutoff prose lesson (no ts) is exempt (forward-only)', teachGate([{ change: 'x', lesson: 'y' }]).length === 0],
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const lessons = read('design-lessons.jsonl');
  const problems = teachGate(lessons);
  const inScope = lessons.filter((l) => l.ts && l.ts >= TEACH_FROM).length;
  console.log('== teach-gate: every feedback lesson names a mechanism, a senior comparison, and a source ==\n');
  console.log(`  ${lessons.length - inScope} exempt (prose, predate the rule) · ${inScope} in scope`);
  for (const p of problems) console.log(`  MISSING  ${p}`);
  if (!problems.length) console.log('  ok       every in-scope lesson carries the teaching triad');
  let cf = 0;
  console.log('\n  controls (each must fire):');
  for (const [n, ok] of controls()) { console.log(`    ${ok ? 'ok  ' : 'FAIL'} ${n}`); if (!ok) cf++; }
  console.log(`\nRESULT: ${problems.length ? `${problems.length} UNTAUGHT LESSON(S)` : cf ? 'CONTROL FAIL' : 'PASS'}`);
  process.exit(STRICT && (problems.length || cf) ? 1 : 0);
}
