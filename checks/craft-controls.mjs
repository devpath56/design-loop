// craft-controls — negative controls for the craft checks. Trident's core insight ported: a check
// that never fails is indistinguishable from a check hardcoded to PASS, and reading the code cannot
// tell them apart. So each check is pinned between two crafted inputs — fixtures/slop.html (must
// FAIL) and fixtures/clean.html (must PASS). If a check ever passes slop or fails clean, it is
// vacuous or over-eager, and this control goes RED.
//
// This is the fixture-level form of mutation testing: it does not gut each check function (craft-
// evals is one inline pass, not per-check functions), but it proves the same property at the gate
// boundary — the deterministic checks DISCRIMINATE, they do not rubber-stamp. Wired into npm test,
// so a check quietly turned vacuous reddens the suite.
//
// Run:  node checks/craft-controls.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CE = path.join(HERE, 'craft-evals.mjs');
const fixture = (name) => path.join(HERE, '..', 'fixtures', name);

// The checks these fixtures deterministically pin. Each MUST fail on slop and pass on clean.
const PINNED = ['type-scale', 'hierarchy-weight', 'copy-no-dash', 'motion-easing'];

function verdicts(file) {
  const r = spawnSync('node', [CE, file, '--json'], { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 120_000 });
  let d; try { d = JSON.parse(r.stdout); } catch { return null; }
  return Object.fromEntries((d.results || []).map((x) => [x.id, x.verdict]));
}

let fails = 0;
const check = (label, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) fails++; };

console.log('== craft-controls: the deterministic checks must DISCRIMINATE, not rubber-stamp ==\n');

for (const f of ['slop.html', 'clean.html']) {
  if (!fs.existsSync(fixture(f))) { check(`fixture ${f} exists`, false); }
}

const slop = verdicts(fixture('slop.html'));
const clean = verdicts(fixture('clean.html'));
check('craft-evals ran on both fixtures', !!slop && !!clean);

if (slop && clean) {
  for (const id of PINNED) {
    // negative control: the defect is present, the check MUST catch it
    check(`${id} FAILS on slop (a check that passes here is vacuous)`, slop[id] === 'FAIL');
    // positive control: the defect is absent, the check MUST NOT false-fire
    check(`${id} PASSES on clean (a check that fails here is over-eager)`, clean[id] === 'PASS');
  }
  // meta-control: every PINNED id must actually exist in craft-evals output, or the assertions
  // above pass vacuously against `undefined !== 'FAIL'`. This is the "TARGETS covers every check"
  // guard from Trident's mutate.py, one level up.
  for (const id of PINNED) check(`${id} is a real craft-evals check id (not a typo)`, id in slop);
}

console.log(`\nRESULT: ${fails ? `${fails} FAIL` : 'PASS'}`);
process.exit(fails ? 1 : 0);
