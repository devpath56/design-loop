// log-teach — the learning layer: what an iteration DIAGNOSED, what it TAUGHT, and how the
// feedback that drove it compares to staff-level.
//
// Separate from design-runs.jsonl on purpose. The gate is deterministic and cannot know what
// a change taught you; mixing model-authored judgement into the machine-measured row would
// make the run log look more objective than it is.
//
// Scoring rule (house discipline): the feedback score MUST come from a cold judge that never
// saw the assistant's reasoning. The assistant is an interested party — it is being graded by
// the same feedback it would be scoring. `scored_by` records who judged, and `self` is
// rejected outright.
//
// Usage:
//   node checks/log-teach.mjs <runId> --json '<object>'
//   node checks/log-teach.mjs <runId> --term "figure/ground" --diagnosis "bg vs card 1.04:1"
import fs from 'node:fs';

// ---- SHAPE GATE. Ported from Trident's failures/intent_gate.py, which had this check
// while design-loop did not — the rule lived in design.md ("Nested bullets and tables only")
// and in the other repo's code, and nothing here enforced it. A rule with no gate is a
// rule the author has to remember, and the author kept not remembering it.
//
// Measured per BLOCK, not per line: prose wraps, so three sentences can sit on three lines
// and no line-based check ever fires.
const SENTENCE_END = /[.!?]["')\]]*(\s+(?=[A-Z("'])|\s*$)/g;
const PROSE_LIMIT = 3;
const sentences = (t) => (String(t).trim().match(SENTENCE_END) || []).length;

function assertShape(label, value) {
  if (typeof value === 'string') {
    const n = sentences(value);
    if (n >= PROSE_LIMIT) {
      console.error(`${label} is a prose paragraph (${n} sentences). Use a table row or a bullet.`);
      console.error(`  design.md: "Nested bullets and tables only. No prose paragraphs, no narration."`);
      console.error(`  offending: ${value.slice(0, 90)}...`);
      process.exit(2);
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => assertShape(`${label}[${i}]`, typeof v === 'string' ? v : JSON.stringify(v)));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) assertShape(`${label}.${k}`, v);
  }
}

const argv = process.argv.slice(2);
const runId = argv[0];
// Kept in sync with checks/lib/runs.mjs — the rubric was expanded to six dimensions there
// and here it still enforced the old four booleans, so every write failed. A validator that
// lags the schema it guards is the same drift as a renderer that lags it.
const AXES = ['mechanism', 'evidence', 'constraint', 'open_space', 'acceptance', 'actionable'];
const MARKS = ['yes', 'partial', 'no'];

if (!runId || runId.startsWith('--')) {
  console.error('usage: node checks/log-teach.mjs <runId> --json \'{...}\'');
  console.error('   or: node checks/log-teach.mjs <runId> --term "..." --diagnosis "..."');
  process.exit(2);
}

// A teaching record may key on a RUN or on a TOPIC. Keying only on runs meant craft learned
// while building the tooling — most of it — had nowhere to live, so it never reached the
// spaced-review deck. Concepts do not care which artifact provoked them.
const isTopic = runId.startsWith('t:');
// A topic record is for a concept taught IN THE MOMENT and logged then. It is not a place to
// backfill a glossary: a deck stocked faster than the learner is taught is a deck they fail,
// and failing cards teaches them the system is noise. If it was not worth three lines at the
// time, it is not worth a card.

const runs = fs.existsSync('design-runs.jsonl')
  ? fs.readFileSync('design-runs.jsonl', 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  : [];
if (!isTopic && !runs.find((r) => r.id === runId)) {
  console.error(`no run with id "${runId}". Run the gate with --log first, or use t:<slug> for a topic`);
  process.exit(2);
}

const f = { json: '', terms: [], diagnosis: [] };
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') f.json = argv[++i] ?? '';
  else if (a === '--term') f.terms.push(argv[++i] ?? '');
  else if (a === '--diagnosis') f.diagnosis.push(argv[++i] ?? '');
  else { console.error(`unknown flag: ${a}`); process.exit(2); }
}

let rec;
if (f.json) {
  try { rec = JSON.parse(f.json); } catch (e) { console.error(`--json invalid: ${e.message}`); process.exit(2); }
} else {
  rec = { terms: f.terms, diagnosis: f.diagnosis, metrics: [], next: [] };
}

// Validate the scored-feedback block if present.
if (rec.feedback) {
  const fb = rec.feedback;
  if (!fb.verbatim?.trim()) { console.error('feedback.verbatim is required: record their actual words'); process.exit(2); }
  if (!fb.scored_by?.trim() || /^self$/i.test(fb.scored_by)) {
    console.error('feedback.scored_by must name a COLD judge. Self-scoring is rejected');
    process.exit(2);
  }
  for (const axis of AXES) {
    if (!MARKS.includes(fb.rubric?.[axis])) {
      console.error(`feedback.rubric.${axis} must be one of: ${MARKS.join(' | ')}  (6 dimensions, no composite score)`);
      process.exit(2);
    }
  }
}
// The PM-to-designer phrasing is the whole point of the teaching layer: it must speak the
// MECHANISM in the designer's own vocabulary, own the product constraint (the PM's actual
// authority), and leave the craft decision to them. Prescribing a treatment is what gets a
// PM's opinion discounted as taste.
// Craft-only: reject a note that wins by changing the subject to business authority.
const AUTHORITY = /\b(positioning|brand|revenue|conversion|trial user|business|stakeholder|roadmap|OKR)\b/i;
if (rec.craft_note !== undefined) {
  if (!String(rec.craft_note).trim()) { console.error('craft_note must be non-empty'); process.exit(2); }
  const hit = String(rec.craft_note).match(AUTHORITY);
  if (hit) {
    console.error(`craft_note appeals to business authority ("${hit[0]}"). Argue the design on its own terms`);
    process.exit(2);
  }
}
if (rec.tradeoff && (!rec.tradeoff.chose || !rec.tradeoff.gave_up)) {
  console.error('tradeoff needs both `chose` and `gave_up`. A choice with no cost is not a tradeoff');
  process.exit(2);
}
// Evidence must be attributable. An unsourced claim dressed as research is worse than an
// honest opinion — it spends credibility that cannot be earned back once someone checks.
const WEASEL = /^(studies show|research shows|it'?s well known|experts agree|best practice|industry standard)\.?$/i;
if (rec.evidence) {
  if (!Array.isArray(rec.evidence)) { console.error('evidence must be an array'); process.exit(2); }
  const TYPES = ['own-experiment', 'published-standard', 'principle', 'published-study'];
  const CONF = ['high', 'medium', 'low'];
  for (const e of rec.evidence) {
    if (!e.claim?.trim()) { console.error('evidence.claim required'); process.exit(2); }
    if (!e.source?.trim()) { console.error(`evidence "${e.claim}" has no source. Unsourced claims are rejected`); process.exit(2); }
    if (WEASEL.test(e.source.trim())) {
      console.error(`evidence source "${e.source}" is a weasel citation. Name the standard, study, or your own measurement`);
      process.exit(2);
    }
    if (!TYPES.includes(e.type)) { console.error(`evidence.type must be one of: ${TYPES.join(', ')}`); process.exit(2); }
    if (!CONF.includes(e.confidence)) { console.error('evidence.confidence must be high|medium|low'); process.exit(2); }
  }
}
if (rec.response) {
  if (typeof rec.response.addressed !== 'boolean') {
    console.error('response.addressed must be true/false: did the change actually answer the feedback?');
    process.exit(2);
  }
}

// Shape-gate every teaching field. `feedback.verbatim` is exempt — it is the user's own
// words quoted verbatim and must never be reshaped to satisfy our house style.
for (const key of ['craft', 'craft_note', 'diagnosis', 'terms', 'next', 'open', 'unknown', 'tradeoff']) {
  if (rec[key] !== undefined) assertShape(key, rec[key]);
}
if (rec.evidence) rec.evidence.forEach((e, i) => {
  assertShape(`evidence[${i}].claim`, e.claim);
  assertShape(`evidence[${i}].note`, e.note);
});

// ---- SELF-REVIEW GATE. The cold judge scored the USER's feedback; nothing scored MINE.
// Every teaching artifact here was self-graded, which is the exact failure this system
// exists to prevent, reproduced one level up. A record carrying `craft` must name a cold
// reviewer, and `self` is refused.
if (rec.craft || rec.craft_note) {
  const rv = rec.self_review;
  // Downgraded from a hard block (CF-064). Blocking here made the whole teaching step
  // unsatisfiable when a cold reviewer was unavailable, and an unsatisfiable gate gets
  // routed around silently rather than argued with. Warn loudly, record the omission in
  // the artifact, and let the renderer surface it.
  if (!rv?.reviewed_by?.trim() || /^self$/i.test(rv.reviewed_by)) {
    console.warn('  ⚠  no cold review on this teaching record. It is SELF-GRADED.');
    console.warn('     recording `self_review.reviewed_by: "none"` so the gap is visible downstream.');
    rec.self_review = { reviewed_by: 'none', findings: [], note: 'no cold reviewer ran' };
  } else if (!Array.isArray(rv.findings)) {
    console.error('self_review.findings must be an array (empty = reviewed clean)');
    process.exit(2);
  }
}

const out = { runId, ts: new Date().toISOString(), ...rec };
fs.appendFileSync('design-teaching.jsonl', JSON.stringify(out) + '\n');

const hits = rec.feedback ? AXES.filter((a) => rec.feedback.rubric[a] === 'yes').length : null;
console.log(`  teaching logged → design-teaching.jsonl  run ${runId}`);
console.log(`    terms: ${(rec.terms ?? []).length} · metrics: ${(rec.metrics ?? []).length} · next: ${(rec.next ?? []).length}` +
  (hits === null ? '' : ` · feedback ${hits}/${AXES.length} met (judged by ${rec.feedback.scored_by})`));
