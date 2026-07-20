// threads — the token-efficient "status of every ask" report.
//
// Simba spent 86k tokens re-deriving state that scripts already compute. This moves the
// mechanical work out of the LLM: each ask in threads.jsonl carries its own PROBE (a shell
// command), and this runs them. A probe that exits 0 = DONE; non-zero = OPEN. Drift becomes
// STRUCTURAL: a `git status --porcelain` probe flips "push to main" to OPEN the moment work
// sits uncommitted, with zero reasoning. An LLM (Simba) only has to look at the `judge` rows.
//
// Row shape (threads.jsonl):
//   {"id","ask","kind":"auto|judge|manual","probe":"<shell, auto only>","note":"<optional>"}
//   auto   the probe decides DONE/OPEN
//   judge  needs a human/LLM call; printed as JUDGE for Simba to rule on
//   manual a known state you set by hand via "status":"done|open"
//
// Usage:
//   node checks/threads.mjs            # the table
//   node checks/threads.mjs --json     # machine digest (feed this to Simba)
//   node checks/threads.mjs --open     # only what is not DONE
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const ONLY_OPEN = argv.includes('--open');

const FILE = path.join(process.cwd(), 'threads.jsonl');
if (!fs.existsSync(FILE)) { console.error('no threads.jsonl in cwd'); process.exit(2); }

const rows = fs.readFileSync(FILE, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
  try { return [JSON.parse(l)]; } catch { console.error(`  unparseable: ${l.slice(0, 50)}`); return []; }
});

// Run a probe with a short timeout. A probe is a boolean question: exit 0 = the ask holds.
// stdout is captured so a probe can also emit a one-line signal for the report.
const runProbe = (cmd) => {
  const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', timeout: 90_000 });
  return { ok: r.status === 0, code: r.status, out: (r.stdout || '').trim().split('\n').pop()?.slice(0, 60) || '' };
};

const results = rows.map((t) => {
  if (t.kind === 'judge') return { ...t, status: 'JUDGE', signal: t.note || 'needs a human/LLM ruling' };
  if (t.kind === 'manual') return { ...t, status: (t.status === 'done' ? 'DONE' : 'OPEN'), signal: t.note || 'set by hand' };
  if (!t.probe) return { ...t, status: 'OPEN', signal: 'auto row with no probe' };
  const p = runProbe(t.probe);
  return { ...t, status: p.ok ? 'DONE' : 'OPEN', signal: p.ok ? (p.out || 'probe passed') : `probe exit ${p.code}${p.out ? ': ' + p.out : ''}` };
});

const shown = ONLY_OPEN ? results.filter((r) => r.status !== 'DONE') : results;

if (AS_JSON) {
  console.log(JSON.stringify({
    ts_note: 'stamp externally; Date.now is intentionally not called here',
    total: results.length,
    done: results.filter((r) => r.status === 'DONE').length,
    open: results.filter((r) => r.status === 'OPEN').length,
    judge: results.filter((r) => r.status === 'JUDGE').length,
    rows: results.map((r) => ({ id: r.id, ask: r.ask, kind: r.kind, status: r.status, signal: r.signal })),
  }, null, 2));
  process.exit(results.some((r) => r.status === 'OPEN') ? 1 : 0);
}

console.log(`\n  STATUS OF EACH ASK  (${FILE.replace(process.env.HOME || '~', '~')})\n`);
console.log(`  ${'id'.padEnd(8)} ${'status'.padEnd(6)} ${'ask'.padEnd(46)} signal`);
console.log(`  ${'-'.repeat(8)} ${'-'.repeat(6)} ${'-'.repeat(46)} ${'-'.repeat(28)}`);
for (const r of shown) {
  const mark = r.status === 'DONE' ? 'ok  ' : r.status === 'JUDGE' ? 'JUDGE' : 'OPEN';
  const ask = r.ask.length > 45 ? r.ask.slice(0, 42) + '...' : r.ask;
  console.log(`  ${r.id.padEnd(8)} ${mark.padEnd(6)} ${ask.padEnd(46)} ${r.signal}`);
}

const open = results.filter((r) => r.status === 'OPEN');
const judge = results.filter((r) => r.status === 'JUDGE');
console.log(`\n  ${results.filter((r) => r.status === 'DONE').length}/${results.length} done · ${open.length} open · ${judge.length} to judge`);
if (open.length) { console.log('\n  OPEN THREADS:'); for (const r of open) console.log(`    ${r.id}  ${r.ask}\n         ${r.signal}`); }
if (judge.length) { console.log('\n  FOR SIMBA TO JUDGE (only these cost tokens):'); for (const r of judge) console.log(`    ${r.id}  ${r.ask}`); }
console.log('');
process.exit(open.length ? 1 : 0);
