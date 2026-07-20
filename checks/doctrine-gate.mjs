// doctrine-gate — the gate for Devansh's design doctrine (doctrine.jsonl).
//
// design.md = what top designers recommend. doctrine.jsonl = what DEVANSH claims, contrarian
// and earned from design-loop work. This gate keeps it honest and un-stale:
//
//   ADMISSION (contrarian + evidence, per the session's `bar` decision):
//     - `contradicts` names the mainstream view it pushes against, non-placeholder. An entry
//       that contradicts nothing is consensus, not doctrine.
//     - `evidence[]` has >= 1 item that RESOLVES: a `run` whose ref exists in design-runs.jsonl,
//       a `cf` matching CF-\d+, or a `source` with a real citation. An unsourced opinion is a
//       vibe (forbidden by the IntentCard).
//   ANTI-STALE (evidence-gate + review date, per the `anti-stale` decision):
//     - `review_by` present. Past it, the entry is reported `needs-review`, never trusted.
//
// THE LIMIT, stated because the RAT probe falsified the naive assumption: this gate checks
// STRUCTURE, not genuineness. It cannot prove a `contradicts` value truly opposes a real
// mainstream view (it can be filled with a strawman). That judgement is the cold audit's job.
// House-rule 1: this is deterministic detection, honestly labeled, not root-cause.
// A second limit the cold audit named (session doctrine, verdict phase audit): the gate checks
// that evidence REFERENCES resolve (the run id exists, the URL is present), never that the
// evidence actually SUPPORTS the claim. A real run id paired with an unrelated claim passes.
// Semantic correspondence is the reviewer's job, not the gate's.
//
// Run:  node checks/doctrine-gate.mjs [--render] [--strict] [--today YYYY-MM-DD]
import fs from 'node:fs';
import crypto from 'node:crypto';

// Run ids are DERIVED, not stored: design-gate computes 'r' + sha1(ts + target). To resolve a
// `run` evidence citation we must recompute the same id per row. Reading a stored `.id` (which
// does not exist) meant no run evidence could EVER resolve. The cold audit missed this because
// it tested with synthetic ids; found while trying to cite a real run.
const runIdOf = (row) => 'r' + crypto.createHash('sha1').update((row.ts ?? '') + (row.target ?? '')).digest('hex').slice(0, 8);

const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const RENDER = argv.includes('--render');
const today = (argv.includes('--today') ? argv[argv.indexOf('--today') + 1] : '2026-07-19');

const readJsonl = (p) => (fs.existsSync(p)
  ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
      try { return [JSON.parse(l)]; } catch { return [{ __bad: l.slice(0, 40) }]; }
    })
  : []);

const blank = (v) => v == null || (typeof v === 'string' && !v.trim());
const placeholder = (v) => blank(v) || String(v).trim().length < 20 || /^(tbd|todo|n\/?a|none|test|xxx)\b/i.test(String(v).trim());

const REQUIRED = ['id', 'claim', 'contradicts', 'evidence', 'confidence', 'added_on', 'review_by', 'status'];
const CONF = ['strong', 'working', 'tentative'];
const STATUS = ['live', 'needs-review', 'retired'];

// The core validator. Returns problems[]; also mutates each entry's `_derivedStatus`.
export function checkDoctrine(entries, runIds, now = today) {
  const problems = [];
  const seen = new Set();
  for (const e of entries) {
    const at = `doctrine ${e.id ?? '(no id)'}`;
    if (e.__bad) { problems.push(`unparseable line: ${e.__bad}`); continue; }
    for (const f of REQUIRED) if (!(f in e)) problems.push(`${at}: missing required field '${f}'`);
    if (!/^D-\d+$/.test(e.id ?? '')) problems.push(`${at}: id must be D-###`);
    if (seen.has(e.id)) problems.push(`${at}: duplicate id`);
    seen.add(e.id);
    if (placeholder(e.claim)) problems.push(`${at}: claim is empty or a placeholder`);
    // contrarian bar: contradicts must name a real opposing view
    if (placeholder(e.contradicts)) problems.push(`${at}: contradicts is empty/placeholder. An entry that contradicts nothing is consensus, not doctrine`);
    if (!CONF.includes(e.confidence)) problems.push(`${at}: confidence must be one of ${CONF.join('/')}`);
    if (!STATUS.includes(e.status)) problems.push(`${at}: status must be one of ${STATUS.join('/')}`);
    // evidence must resolve
    const ev = Array.isArray(e.evidence) ? e.evidence : [];
    if (!ev.length) problems.push(`${at}: no evidence. An unsourced opinion is a vibe, not doctrine`);
    for (const v of ev) {
      if (v?.type === 'run') {
        if (!runIds.has(v.ref)) problems.push(`${at}: evidence run '${v.ref}' is not a real run in design-runs.jsonl`);
      } else if (v?.type === 'cf') {
        if (!/^CF-\d+$/.test(v.ref ?? '')) problems.push(`${at}: evidence cf '${v.ref}' is not a CF-### id`);
      } else if (v?.type === 'source') {
        if (blank(v.ref) || blank(v.cite)) problems.push(`${at}: evidence source needs both ref (url/citation) and cite (what it says)`);
      } else {
        problems.push(`${at}: evidence type must be run|cf|source (got '${v?.type}')`);
      }
    }
    // anti-stale: review_by drives the derived status
    if (!blank(e.review_by) && e.status !== 'retired') {
      e._derivedStatus = e.review_by < now ? 'needs-review' : 'live';
      if (e._derivedStatus === 'needs-review' && e.status === 'live') {
        problems.push(`${at}: review_by ${e.review_by} is past ${now} but status is still 'live'. Re-validate it or mark needs-review`);
      }
    }
  }
  return problems;
}

// ── negative controls: every rejection path must fire ─────────────────────────
export function controls() {
  const runs = new Set(['rABC1234']);
  const ok = {
    id: 'D-001', claim: 'Ship the empty state only where data can be absent, not on forms',
    contradicts: 'the folklore four-state checklist that puts an empty state on every screen',
    evidence: [{ type: 'run', ref: 'rABC1234' }], confidence: 'strong',
    added_on: '2026-07-19', review_by: '2026-12-31', status: 'live',
  };
  const c = [];
  const fires = (label, entry) => c.push([label, checkDoctrine([entry], runs, '2026-07-19').length > 0]);
  c.push(['accepts a well-formed contrarian+evidence entry (positive control)', checkDoctrine([ok], runs).length === 0]);
  fires('rejects an entry that contradicts nothing', { ...ok, contradicts: '' });
  fires('rejects a placeholder contradicts', { ...ok, contradicts: 'TBD' });
  fires('rejects an entry with no evidence', { ...ok, evidence: [] });
  fires('rejects evidence citing a run that does not exist', { ...ok, evidence: [{ type: 'run', ref: 'rNOPE' }] });
  fires('rejects a malformed cf citation', { ...ok, evidence: [{ type: 'cf', ref: 'nope' }] });
  fires('rejects a source with no citation text', { ...ok, evidence: [{ type: 'source', ref: 'http://x', cite: '' }] });
  fires('rejects a live entry whose review_by has passed', { ...ok, review_by: '2020-01-01' });
  return c;
}

// ── main ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const entries = readJsonl('doctrine.jsonl');
  const runIds = new Set(readJsonl('design-runs.jsonl').map(runIdOf));
  const problems = checkDoctrine(entries, runIds);

  console.log(`== design doctrine gate ==\n`);
  console.log(`  ${entries.length} entr(y/ies) · ${runIds.size} known runs\n`);
  console.log('  controls (each must fire):');
  let cf = 0;
  for (const [name, fired] of controls()) { console.log(`    ${fired ? 'ok  ' : 'FAIL'} ${name}`); if (!fired) cf++; }

  const stale = entries.filter((e) => e._derivedStatus === 'needs-review');
  console.log('');
  if (problems.length) { console.log(`  ${problems.length} problem(s):`); for (const p of problems) console.log(`    - ${p}`); }
  else console.log('  all entries admissible');
  if (stale.length) console.log(`\n  ${stale.length} overdue for review: ${stale.map((e) => e.id).join(', ')}`);

  if (RENDER) renderView(entries);

  const bad = problems.length + cf;
  console.log(`\nRESULT: ${bad ? `${bad} FAIL` : 'PASS'}`);
  process.exit(STRICT && bad ? 1 : (cf ? 1 : 0));
}

function renderView(entries) {
  const order = { strong: 0, working: 1, tentative: 2 };
  const live = entries.filter((e) => e.status !== 'retired').sort((a, b) => (order[a.confidence] ?? 9) - (order[b.confidence] ?? 9));
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  // Growth (option B, last 5): opinions earned + a craft strip. The 6 axes ARE the components
  // of a defensible opinion, so a filling strip = feedback getting sharper. Scored from the
  // last 5 teaching records: yes=1, partial=.5, no=0, averaged per axis.
  const AXES = ['mechanism', 'evidence', 'constraint', 'open_space', 'acceptance', 'actionable'];
  const teach = readJsonl('design-teaching.jsonl')
    .filter((t) => t.feedback?.rubric)
    .sort((a, b) => String(a.ts ?? '').localeCompare(String(b.ts ?? ''))).slice(-5);
  const scoreOf = (ax) => {
    const vs = teach.map((t) => ({ yes: 1, partial: 0.5, no: 0 }[t.feedback.rubric[ax]] ?? 0));
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
  };
  const dot = (s) => (s >= 0.6 ? '●' : s >= 0.3 ? '◐' : '○');
  const strip = AXES.map((a) => {
    const s = scoreOf(a);
    return `<span class="ax ${s >= 0.6 ? 'on' : s >= 0.3 ? 'mid' : ''}">${dot(s)} ${a.replace('_', ' ')}</span>`;
  }).join('');
  const growth = `<div class="growth">
    <div class="strip" title="your feedback axes over the last ${teach.length} run(s). The 6 are the parts of a defensible opinion.">${strip}</div>
    <div class="count"><b>${live.length}</b><span>opinion${live.length === 1 ? '' : 's'}</span></div>
  </div>`;
  const card = (e) => `<article class="d ${e._derivedStatus === 'needs-review' ? 'stale' : ''}">
    <div class="conf">${esc(e.confidence)}${e._derivedStatus === 'needs-review' ? ' · review overdue' : ''}</div>
    <h2>${esc(e.claim)}</h2>
    <p class="vs"><span>vs</span> ${esc(e.contradicts)}</p>
    <ul class="ev">${(e.evidence || []).map((v) => `<li>${esc(v.type)}: ${esc(v.ref)}${v.cite ? ` — ${esc(v.cite)}` : ''}</li>`).join('')}</ul>
  </article>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>design doctrine</title><style>
:root{--bg:#fbfbfa;--card:#fff;--ink:#161a19;--mut:#5a6562;--line:#e4e8e6;--acc:#0f6b5c;--warn:#8a6a1a}
@media(prefers-color-scheme:dark){:root{--bg:#0e1211;--card:#161b1a;--ink:#e9edeb;--mut:#9aa7a3;--line:#243029;--acc:#4ecdb0;--warn:#d3b25f}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,sans-serif;padding:48px 20px}
.w{max-width:760px;margin:0 auto}h1{font-size:26px;letter-spacing:-.02em;margin:0 0 4px}
.sub{color:var(--mut);margin:0 0 32px}
.d{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;margin:0 0 14px}
.d.stale{border-color:var(--warn)}
.conf{font:600 11px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--acc);margin:0 0 10px}
.d.stale .conf{color:var(--warn)}
.d h2{font-size:19px;line-height:1.25;margin:0 0 10px;letter-spacing:-.01em}
.vs{color:var(--mut);margin:0 0 12px;font-size:14.5px}.vs span{font:600 11px/1 ui-monospace,monospace;text-transform:uppercase;color:var(--mut)}
.ev{margin:0;padding-left:0;list-style:none;font:13px/1.6 ui-monospace,monospace;color:var(--mut)}
.empty{color:var(--mut);border:1px dashed var(--line);border-radius:14px;padding:28px;text-align:center}
.growth{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;
  border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;margin:0 0 26px}
.strip{display:flex;flex-wrap:wrap;gap:14px;font:12.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.ax{color:var(--mut);letter-spacing:.01em;white-space:nowrap}
.ax.on{color:var(--acc)}.ax.mid{color:var(--ink)}
.count{display:flex;align-items:baseline;gap:7px;white-space:nowrap}
.count b{font-size:30px;font-weight:640;letter-spacing:-.02em;line-height:1}
.count span{color:var(--mut);font-size:13px}
</style></head><body><div class="w">
<h1>design doctrine</h1><p class="sub">Devansh's own contrarian, evidence-backed calls. Strongest first. design.md is what the field recommends; this is what he claims.</p>
${growth}
${live.length ? live.map(card).join('\n') : '<div class="empty">No doctrine yet. Add a contrarian, evidence-backed opinion to doctrine.jsonl.</div>'}
</div></body></html>`;
  fs.writeFileSync('doctrine.html', html);
  console.log('  rendered → doctrine.html');
}
