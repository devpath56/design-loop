// track — spaced retrieval for the craft vocabulary this loop teaches.
//
// Simba's finding: nothing plays for LEARNING the role Simba plays for INTENT. Terms were
// recorded in design-teaching.jsonl and never resurfaced, so they decay exactly the way
// early intent decays without a counterweight.
//
// This is the spacing half of the method. The `learn` skill is explicit that only two study
// techniques rate as high-utility — retrieval practice and distributed practice — and that a
// session which never resurfaces forfeits half the gain. Reading a term again is neither:
// recognition is not retrieval. So this schedules a QUESTION, never a definition.
//
// Intervals are the standard expanding sequence. A term answered correctly moves out; one
// answered wrong resets to the start, because the interval encodes confidence, not calendar.
//
// Usage:
//   node checks/track.mjs              # what is due today
//   node checks/track.mjs --quiz       # due items as questions, answers withheld
//   node checks/track.mjs --grade <term> right|wrong
//   node checks/track.mjs --all        # the whole deck with its schedule
import fs from 'node:fs';

const LEDGER = 'design-track.jsonl';
const TEACHING = 'design-teaching.jsonl';
const INTERVALS = [1, 3, 7, 16, 35];   // days; expanding, then retired
const DAY = 86_400_000;

const argv = process.argv.slice(2);
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / DAY);

const readJsonl = (f) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
        try { return [JSON.parse(l)]; } catch { return []; }
      })
    : [];

// ── deck: every term ever taught, plus the run it came from so a question can point at the
// artifact rather than asking for a definition in the abstract.
const teaching = readJsonl(TEACHING);
const state = new Map(readJsonl(LEDGER).map((r) => [r.term, r]));

for (const t of teaching) {
  for (const term of t.terms ?? []) {
    if (!state.has(term)) {
      state.set(term, { term, runId: t.runId, gloss: t.gloss?.[term] ?? null, box: 0, last: t.ts?.slice(0, 10) ?? today(), history: [] });
    }
  }
}

const due = (r) => r.box < INTERVALS.length && daysBetween(r.last, today()) >= INTERVALS[r.box];
const nextIn = (r) => (r.box >= INTERVALS.length ? '—' : `${INTERVALS[r.box] - daysBetween(r.last, today())}d`);

// A question, not a definition. Recognition feels like knowing and is not.
const ask = (r) => {
  const t = teaching.find((x) => x.runId === r.runId);
  const where = t?.craft?.mechanism ? ` (it came up as: "${t.craft.mechanism.slice(0, 60)}…")`
              : r.gloss ? ` (it came up around: "${r.gloss.slice(0, 60)}…")` : '';
  return `In your own words: what is **${r.term}**, and what is the nearest thing it gets confused with?${where}`;
};

// ── grade
const gradeIdx = argv.indexOf('--grade');
if (gradeIdx !== -1) {
  const term = argv[gradeIdx + 1];
  const verdict = argv[gradeIdx + 2];
  const rec = state.get(term);
  if (!rec) { console.error(`not in the deck: "${term}"`); process.exit(2); }
  if (!['right', 'wrong'].includes(verdict)) { console.error('grade must be right|wrong'); process.exit(2); }
  // Wrong resets to the first interval. The box is a confidence estimate; a miss means the
  // estimate was too high, not that the schedule should merely pause.
  rec.box = verdict === 'right' ? Math.min(rec.box + 1, INTERVALS.length) : 0;
  rec.last = today();
  rec.history = [...(rec.history ?? []), { on: today(), verdict }];
  fs.writeFileSync(LEDGER, [...state.values()].map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`  ${term}: ${verdict} → box ${rec.box}${rec.box >= INTERVALS.length ? ' (retired)' : `, next in ${INTERVALS[rec.box]}d`}`);
  process.exit(0);
}

// persist any newly discovered terms so the deck is durable
fs.writeFileSync(LEDGER, [...state.values()].map((r) => JSON.stringify(r)).join('\n') + '\n');

const deck = [...state.values()];
const dueNow = deck.filter(due);

if (argv.includes('--all')) {
  console.log(`\n  track · ${deck.length} term(s)\n`);
  for (const r of deck.sort((a, b) => a.box - b.box)) {
    const hits = (r.history ?? []).filter((h) => h.verdict === 'right').length;
    const miss = (r.history ?? []).filter((h) => h.verdict === 'wrong').length;
    console.log(`    box ${r.box}  ${due(r) ? 'DUE ' : nextIn(r).padEnd(4)}  ${r.term.padEnd(32)} ${hits}✓ ${miss}✗`);
  }
  console.log('');
  process.exit(0);
}

if (argv.includes('--quiz')) {
  if (!dueNow.length) { console.log('\n  nothing due. next up in ' + (deck.map(nextIn).sort()[0] ?? '—') + '\n'); process.exit(0); }
  console.log(`\n  ${dueNow.length} due: answers withheld until you have tried\n`);
  dueNow.forEach((r, i) => console.log(`  ${i + 1}. ${ask(r)}\n`));
  console.log(`  grade with:  node checks/track.mjs --grade "<term>" right|wrong\n`);
  process.exit(0);
}

// default: the one-line status the runbook reads at step 0
const retired = deck.filter((r) => r.box >= INTERVALS.length).length;
console.log(`  track: ${deck.length} term(s) · ${dueNow.length} due · ${retired} retired`);
if (dueNow.length) console.log(`         due now: ${dueNow.map((r) => r.term).join(', ')}`);
