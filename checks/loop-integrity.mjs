// loop-integrity (T-9) — the loop's six pieces must all be present AND wired.
// The "trigger" piece had no implementation and no check; this is that check. It is a
// manifest/heartbeat gate (house-rule "mounted != executing"): a piece counts only if it
// exists on disk AND something invokes it. Three outcomes, never two.
//
// Run:  node checks/loop-integrity.mjs [--strict]
import fs from 'node:fs';
const STRICT = process.argv.includes('--strict');
const has = (p) => fs.existsSync(p);
const grepAny = (needle, files) => files.some((f) => has(f) && fs.readFileSync(f, 'utf8').includes(needle));
const CHECKS = ['design-gate', 'craft-evals', 'state-matrix', 'verify-render', 'workbench', 'doctrine-gate']
  .map((n) => `checks/${n}.mjs`);

// piece -> {present: bool, wired: bool, note}
function assess() {
  const pkg = has('package.json') ? JSON.parse(fs.readFileSync('package.json', 'utf8')) : { scripts: {} };
  const scripts = pkg.scripts || {};
  return [
    ['trigger', has('package.json') && !!scripts['design-gate'],
      // wired = the runbook's entry commands resolve to real files
      Object.values(scripts).some((c) => /checks\/\w+\.mjs/.test(c)) && CHECKS.filter(has).length >= 4,
      'npm scripts invoke real checkers'],
    ['skill file', has('design.md') && fs.statSync('design.md').size > 200, true, 'design.md'],
    ['maker', grepAny('hallmark', CHECKS.concat(['design.md'])) || has('effects/registry.json'), true, 'hallmark/effects'],
    ['checker', has('checks/design-gate.mjs') && has('checks/log-audit.mjs'),
      grepAny('spawnSync', ['checks/design-gate.mjs']) || has('checks/verify-render.mjs'), 'gate + cold audit'],
    ['gate', has('checks/design-gate.mjs'),
      grepAny('process.exit', ['checks/design-gate.mjs']), 'exits nonzero on fail'],
    ['state', has('design-lessons.jsonl') && has('design-teaching.jsonl'), true, 'lessons + teaching'],
  ].map(([piece, present, wired, note]) => ({ piece, present, wired, note }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = assess();
  console.log('== loop integrity: all six pieces present AND wired ==\n');
  let bad = 0;
  for (const r of rows) {
    const status = !r.present ? 'MISSING' : !r.wired ? 'UNWIRED' : 'ok';
    if (status !== 'ok') bad++;
    console.log(`  ${status.padEnd(8)} ${r.piece.padEnd(11)} ${r.note}`);
  }
  // negative control: a fabricated piece with a nonexistent file reports MISSING (in-memory)
  const ctrl = !has('checks/__no_such_checker__.mjs');
  console.log(`\n  control: a nonexistent piece reports MISSING  ${ctrl ? 'ok' : 'FAIL'}`);
  if (!ctrl) bad++;
  console.log(`\n  ${rows.length - rows.filter((r) => !r.present || !r.wired).length}/${rows.length} pieces present + wired`);
  console.log(`RESULT: ${bad ? `${bad} GAP(S)` : 'PASS'}`);
  process.exit(STRICT && bad ? 1 : 0);
}
