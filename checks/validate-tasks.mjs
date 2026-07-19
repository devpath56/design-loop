// validate-tasks — house-rule 4 made executable: "Done ⇒ acceptance artifact."
//
// THE GAP THIS CLOSES
// The todo list and the Trident loop are separate media that never touch. A task becomes
// `completed` because something set a field. A loop closes only when close-session.mjs
// verifies an IntentCard exists, a Verdict cites it, no DriftFlag is unresolved, and no
// probe failure is unhandled. Nothing joined the two, so "done" was an assertion and the
// loop was optional decoration beside it.
//
// The census flagged house-rule 4 as having no executed check anywhere. This is that check.
// It also forces the scoping the Trident contract asks for: if completing a task requires a
// closed run, then work has to be opened as a run first, which means stating scope and
// intent up front. Tight loops stop being a discipline and become the only path to "done".
//
// WHAT COUNTS AS DONE
//   task.metadata.runId names a run, AND that run has a `close` row in prongs.jsonl.
//   The close row is itself only writable by close-session.mjs, which runs the 5 exit checks.
//   So this file does not re-verify the work; it verifies the work went through the door.
//
// EXEMPTIONS, deliberately narrow and always printed:
//   metadata.loopExempt = "<reason>"  for work that genuinely is not a design loop
//   (answering a question, a one-line typo fix). An exemption with no reason is not one.
//
// Usage:
//   node checks/validate-tasks.mjs            # report
//   node checks/validate-tasks.mjs --strict   # exit 1 if any completed task is unbacked
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const STRICT = process.argv.includes('--strict');
const PRONGS = process.env.PRONGS_PATH
  || path.join(os.homedir(), 'Downloads/Trident-setup/prongs/prongs.jsonl');

// Session id comes from the tasks dir with the most recent mtime, so this works without
// being told which session it belongs to.
const TASKS_ROOT = path.join(os.homedir(), '.claude/tasks');
if (!fs.existsSync(TASKS_ROOT)) {
  console.error('no ~/.claude/tasks. Nothing to validate.');
  process.exit(0);
}
const session = fs.readdirSync(TASKS_ROOT)
  .map((d) => ({ d, p: path.join(TASKS_ROOT, d) }))
  .filter(({ p }) => fs.statSync(p).isDirectory())
  .sort((a, b) => fs.statSync(b.p).mtimeMs - fs.statSync(a.p).mtimeMs)[0];

const tasks = fs.readdirSync(session.p)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(session.p, f), 'utf8')))
  .sort((a, b) => Number(a.id) - Number(b.id));

const prongs = fs.existsSync(PRONGS)
  ? fs.readFileSync(PRONGS, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
      try { return [JSON.parse(l)]; } catch { return []; }
    })
  : [];

const closedRuns = new Set(prongs.filter((r) => r.kind === 'close').map((r) => r.runId));
const openRuns = new Set(prongs.filter((r) => r.kind === 'intent').map((r) => r.runId));

const done = tasks.filter((t) => t.status === 'completed');
const active = tasks.filter((t) => t.status === 'in_progress');

console.log(`== house-rule 4: done implies an acceptance artifact ==\n`);
console.log(`  ${tasks.length} task(s) | ${done.length} completed | ${prongs.length} prong record(s)\n`);
console.log(`  ${'#'.padEnd(4)} ${'task'.padEnd(46)} ${'run'.padEnd(14)} backing`);
console.log(`  ${'-'.repeat(4)} ${'-'.repeat(46)} ${'-'.repeat(14)} ${'-'.repeat(22)}`);

const unbacked = [];
const exempt = [];

for (const t of [...done, ...active]) {
  const runId = t.metadata?.runId ?? null;
  const why = t.metadata?.loopExempt ?? null;
  const subj = t.subject.length > 45 ? t.subject.slice(0, 42) + '...' : t.subject;

  let state;
  if (why) {
    // "Gates apply forward, exempt old work with a reason" was first recorded as prose in a
    // memory file, which is house-rule 1's bottom rung and the exact decay this repo exists
    // to prevent. This is that rule as code: an exemption is only an exemption if it says
    // something. A one-word reason is the escape hatch swallowing the gate.
    const thin = why.trim().length < 20 || /^(n\/?a|none|skip|later|obvious|wip|-+)$/i.test(why.trim());
    if (thin && t.status === 'completed') {
      state = 'EXEMPT, no real reason';
      unbacked.push([t, `loopExempt "${why}" states no reason. An unreasoned exemption is not one`]);
    } else {
      state = `exempt: ${why.slice(0, 30)}`;
      exempt.push(t);
    }
  } else if (!runId) {
    state = t.status === 'completed' ? 'NO RUN, asserted done' : 'no run opened yet';
    if (t.status === 'completed') unbacked.push([t, 'no runId: never opened as a loop']);
  } else if (!openRuns.has(runId)) {
    state = 'run id not in ledger';
    if (t.status === 'completed') unbacked.push([t, `runId ${runId} has no IntentCard`]);
  } else if (!closedRuns.has(runId)) {
    state = 'opened, NOT closed';
    if (t.status === 'completed') unbacked.push([t, `run ${runId} was opened but never closed`]);
  } else {
    state = 'closed loop';
  }

  const flag = t.status === 'completed' && unbacked.some(([u]) => u.id === t.id) ? 'BAD ' : 'ok  ';
  console.log(`  ${flag}${t.id.padEnd(0)}`.padEnd(6) + ` ${subj.padEnd(46)} ${(runId ?? '-').padEnd(14)} ${state}`);
}

if (exempt.length) {
  console.log(`\n  ${exempt.length} exempt (each states a reason, which is the point):`);
  for (const t of exempt) console.log(`    #${t.id} ${t.metadata.loopExempt}`);
}

if (unbacked.length) {
  console.log(`\n  ${unbacked.length} task(s) marked DONE with no acceptance artifact:\n`);
  for (const [t, why] of unbacked) {
    console.log(`    #${t.id} ${t.subject}`);
    console.log(`         ${why}`);
  }
  console.log(`\n  Each of these is "done" because something typed the word. Either:`);
  console.log(`    - open and close a real run, then set metadata.runId, or`);
  console.log(`    - set metadata.loopExempt with a reason, if it genuinely was not a loop.`);
}

// Exempt tasks are neither backed nor unbacked. Folding them into the numerator inflated
// the score, which is the one direction this number must never lie: a coverage figure that
// counts its own exemptions as coverage is how "6 of 6 runs green" happened in design-loop.
const doneExempt = done.filter((t) => t.metadata?.loopExempt).length;
const backed = done.length - unbacked.length - doneExempt;
console.log(`\n  ${backed}/${done.length - doneExempt} completed task(s) backed by a closed loop`
  + (doneExempt ? `  (${doneExempt} exempt, excluded from both sides)` : ''));
console.log(`RESULT: ${unbacked.length ? `${unbacked.length} UNBACKED` : 'all completions backed'}`);
process.exit(STRICT && unbacked.length ? 1 : 0);
