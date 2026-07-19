// status — one screen answering "is my loop actually working?"
//
// Observability has two halves. design-log.md tells you what happened in past runs.
// This tells you whether the MACHINE is intact: which pieces are live, where the logs have
// holes, whether the checker itself has been evaluated, and whether lessons are compounding
// or just accumulating. A loop can produce clean logs while three of its pieces are missing.
//
// Usage:  node checks/status.mjs
import fs from 'node:fs';

const readJsonl = (f) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
        try { return [JSON.parse(l)]; } catch { return []; }
      })
    : [];

const runs = readJsonl('design-runs.jsonl');
const audits = readJsonl('design-audits.jsonl');
const lessons = readJsonl('design-lessons.jsonl').filter((l) => l.target !== 'seed');
const exists = (p) => fs.existsSync(p);

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', B = '\x1b[1m', X = '\x1b[0m';
const line = (mark, label, detail) => console.log(`   ${mark} ${label.padEnd(26)}${D}${detail}${X}`);
const ok = `${G}●${X}`, bad = `${R}●${X}`, warn = `${Y}●${X}`;

console.log(`\n${B}  design-loop · status${X}\n`);

// ── The seven pieces. A loop missing a piece still runs; it just fails silently.
console.log(`${B}  PIECES${X}`);
line(bad, 'Trigger', 'MANUAL: you invoke /design-loop. No trigger = a task, not a loop');
line(exists('design.md') ? ok : bad, 'Skill file', exists('design.md') ? 'design.md' : 'MISSING');
line(ok, 'Maker', 'Claude Code + hallmark redesign');
line(exists('checks/design-gate.mjs') ? ok : bad, 'Checker · deterministic', 'axe-core · overflow · console');
const auditedRuns = new Set(audits.map((a) => a.runId));
const auditCoverage = runs.length ? auditedRuns.size / runs.length : 0;
line(
  auditCoverage === 1 ? ok : auditCoverage > 0 ? warn : bad,
  'Checker · structural',
  runs.length ? `${auditedRuns.size}/${runs.length} runs audited (cold subagent)` : 'no runs yet'
);
line(exists('checks/design-gate.mjs') ? ok : bad, 'Gate', 'binary, exit 0/1 + no critical slop gate');
line(lessons.length ? ok : warn, 'State file', `${lessons.length} lesson(s) in design-lessons.jsonl`);
line(exists('design-log.md') ? ok : warn, 'Ledger', exists('design-log.md') ? 'design-log.md' : 'not yet rendered');

// ── Log integrity. Gaps here mean the record is lying by omission.
console.log(`\n${B}  LOG INTEGRITY${X}`);
if (!runs.length) {
  line(warn, 'Runs', 'none logged yet: run the gate with --log');
} else {
  const noWhy = runs.filter((r) => !r.why?.trim()).length;
  const noAudit = runs.filter((r) => !auditedRuns.has(r.id)).length;
  const noShots = runs.filter((r) => !r.shots).length;
  const passes = runs.filter((r) => r.gate === 'PASS');
  const lessonIds = new Set(lessons.map((l) => l.runId).filter(Boolean));
  const passNoLesson = passes.filter((r) => r.id && !lessonIds.has(r.id)).length;

  line(ok, 'Runs logged', `${runs.length} (${passes.length} pass / ${runs.length - passes.length} fail)`);
  line(noWhy ? warn : ok, 'Rationale (--why)', noWhy ? `${noWhy} run(s) missing → outcome log, not decision log` : 'every run has one');
  line(noAudit ? warn : ok, 'Structural audit', noAudit ? `${noAudit} run(s) never audited` : 'every run audited');
  line(noShots ? warn : ok, 'Visual record', noShots ? `${noShots} run(s) have no screenshots (--shots)` : 'every run captured');
  line(passNoLesson ? warn : ok, 'Lessons on PASS', passNoLesson ? `${passNoLesson} PASS run(s) taught nothing` : 'every PASS logged a lesson');
}

// ── Is the CHECKER itself any good? An unevaluated gate is an unverified claim.
console.log(`\n${B}  CHECKER QUALITY${X}`);
if (!exists('fixtures/eval-report.json')) {
  line(bad, 'Gate evaluation', 'NEVER RUN: the checker has not been checked (npm run eval-gate)');
} else {
  const rep = JSON.parse(fs.readFileSync('fixtures/eval-report.json', 'utf8'));
  const { TP = 0, TN = 0, FP = 0, FN = 0 } = rep.certain ?? {};
  const pct = (n, d) => (d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(0)}%`);
  line(FN ? bad : ok, 'Blind spots (FN)', FN ? `${FN}: defects the gate APPROVES` : 'none on certain-label fixtures');
  line(FP ? warn : ok, 'False alarms (FP)', FP ? `${FP}: clean pages rejected` : 'none');
  line(ok, 'Recall', `${pct(TP, TP + FN)} of real defects caught`);
  line(ok, 'Fixtures', `${rep.fixtures} · last eval ${rep.ts?.slice(0, 16).replace('T', ' ')}`);
}

// ── Spaced review: the counterweight for LEARNING, as Simba is for intent.
console.log(`\n${B}  SPACED REVIEW${X}`);
const track = readJsonl('design-track.jsonl');
if (!track.length) {
  line(warn, 'Deck', 'empty: no terms tracked yet (npm run track)');
} else {
  const INT = [1, 3, 7, 16, 35], DAY = 864e5;
  const days = (a) => Math.floor((Date.now() - new Date(a)) / DAY);
  const due = track.filter((r) => r.box < INT.length && days(r.last) >= INT[r.box]);
  const retired = track.filter((r) => r.box >= INT.length).length;
  const attempted = track.filter((r) => (r.history ?? []).length).length;
  line(due.length ? warn : ok, 'Due now', due.length ? `${due.length}: ${due.map((r) => r.term).join(', ')}` : 'nothing due');
  line(attempted ? ok : warn, 'Ever answered', `${attempted}/${track.length} term(s) have been retrieved at least once`);
  line(retired ? ok : D + '○' + X, 'Retired', `${retired} term(s) past the last interval`);
}

// ── Is it LEARNING, or just logging? A rule that keeps failing was never absorbed.
console.log(`\n${B}  IS IT LEARNING?${X}`);
const tally = {};
for (const r of runs) {
  for (const f of r.failed ?? []) tally[f.check] = (tally[f.check] ?? 0) + 1;
  for (const x of audits.find((a) => a.runId === r.id)?.findings ?? []) {
    tally[`slop: ${x.gate}`] = (tally[`slop: ${x.gate}`] ?? 0) + 1;
  }
}
const repeat = Object.entries(tally).sort((a, b) => b[1] - a[1]);
if (!repeat.length) {
  line(runs.length ? ok : warn, 'Repeat offenders', runs.length ? 'no check has ever failed' : 'no data yet');
} else {
  for (const [check, n] of repeat.slice(0, 5)) {
    line(n >= 3 ? bad : n === 2 ? warn : ok, `${n}× ${check.slice(0, 22)}`, n >= 3 ? 'CHRONIC → design.md is under-specified' : n === 2 ? 'recurring: watch it' : 'once');
  }
}
if (runs.length >= 4) {
  const half = Math.floor(runs.length / 2);
  const rate = (set) => set.filter((r) => r.gate === 'PASS').length / set.length;
  const early = rate(runs.slice(0, half)), late = rate(runs.slice(half));
  const delta = late - early;
  line(
    delta > 0.05 ? ok : delta < -0.05 ? bad : warn,
    'Trend',
    `pass rate ${(early * 100).toFixed(0)}% → ${(late * 100).toFixed(0)}%  ${delta > 0.05 ? 'improving' : delta < -0.05 ? 'REGRESSING' : 'flat'}`
  );
} else {
  line(D + '○' + X, 'Trend', `needs ≥4 runs (have ${runs.length})`);
}

console.log(`\n${D}  detail: design-log.md   ·   dashboard: npm run dashboard   ·   checker: npm run eval-gate${X}\n`);
