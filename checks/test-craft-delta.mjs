// test-craft-delta — the durability control for the progression spine. Proves the craft ratchet
// actually fires (a regression exits nonzero) and that the audit-brief token cut stays cut. Wired
// into `npm test`, so reverting craft-delta or re-adding the hallmark load to the brief reddens the
// suite — the prove-durable contract: a change that isn't gated by an executed check will decay.
//
// Run:  node checks/test-craft-delta.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const CD = path.join(HERE, 'craft-delta.mjs');
const BRIEF = path.join(HERE, 'audit-brief.mjs');
let fails = 0;
const check = (label, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) fails++; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'craftd-'));
const ledger = path.join(tmp, 'ledger.jsonl');
const craftJson = (bad) => {
  const results = [
    { id: 'hierarchy-levers', verdict: 'PASS', measured: '4/4 levers in play' },
    { id: 'focus-visible', verdict: bad ? 'FAIL' : 'PASS', measured: 'x' },
    { id: 'motion-easing', verdict: 'PASS', measured: 'ease' },
  ];
  const f = path.join(tmp, bad ? 'bad.json' : 'good.json');
  fs.writeFileSync(f, JSON.stringify({ target: 't.html', results }));
  return f;
};
const run = (bad, extra = []) => spawnSync('node', [CD, 't.html', '--ledger', ledger, '--from', craftJson(bad), ...extra], { encoding: 'utf8' });

console.log('== craft-delta ratchet: fires on regression, holds otherwise ==\n');

// seed a baseline (record it under a run id)
run(false, ['r0000001']);
check('baseline records to the ledger', fs.existsSync(ledger) && fs.readFileSync(ledger, 'utf8').includes('r0000001'));

// unchanged craft → ratchet HOLDS
check('unchanged craft HOLDS under --strict (exit 0)', run(false, ['--strict']).status === 0);

// a PASS→FAIL → ratchet FIRES
const bad = run(true, ['--strict']);
check('a PASS→FAIL REGRESSES under --strict (exit 1)', bad.status === 1);
check('  names the regressed check', /focus-visible PASS→FAIL/.test(bad.stdout));
check('  reports RATCHET BROKEN', /RATCHET: BROKEN/.test(bad.stdout));

// arg-parsing: the --ledger value is not mistaken for the target
check('a stray --ledger value is not parsed as the target', !/craftd-.*ledger\.jsonl/.test(run(false).stdout.split('\n')[1] || ''));

// the audit-brief token cut is durable: no hallmark skill load, and a next-improvement is required
const briefSrc = fs.readFileSync(BRIEF, 'utf8');
check('audit-brief no longer loads the hallmark skill (token cut is durable)', !/`hallmark`|hallmark audit/i.test(briefSrc));
check('audit-brief requires a next-improvement entry (progression driver)', /next-improvement/.test(briefSrc));

// the gate wiring is durable: design-gate must still invoke craft-delta, or the loop stops showing
// progression and the delta silently disappears (prove-durable flagged this reverting green).
const gateSrc = fs.readFileSync(path.join(HERE, 'design-gate.mjs'), 'utf8');
check('design-gate still invokes craft-delta (progression wiring is durable)', /craft-delta\.mjs/.test(gateSrc));

// the rule-coverage RATCHET is durable: a baseline above current coverage must break --strict. If
// the ratchet code is reverted, this control goes red (prove-durable flagged the ratchet ungated).
const hi = path.join(tmp, 'hi-baseline.json');
fs.writeFileSync(hi, JSON.stringify({ linked: 99, total: 32 }));
const rc = spawnSync('node', ['checks/rule-coverage.mjs', '--strict', '--baseline', hi], { encoding: 'utf8', cwd: path.join(HERE, '..') });
check('rule-coverage ratchet FIRES when coverage is below baseline (exit 1)', rc.status === 1);
check('  and reports RATCHET BROKEN', /RATCHET BROKEN/.test(rc.stdout));

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nRESULT: ${fails ? `${fails} FAIL` : 'PASS'}`);
process.exit(fails ? 1 : 0);
