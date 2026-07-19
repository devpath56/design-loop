// dashboard — renders design-dashboard.html: the whole loop on one page, with the
// screenshots inline. The markdown ledger is precise but you cannot SEE a design in it.
//
// Self-contained: screenshots are embedded as data URIs, so the file works when moved,
// emailed, or published. Bounded to the most recent runs so it does not grow without limit.
//
// Usage:  node checks/dashboard.mjs
import fs from 'node:fs';
import path from 'node:path';

const EMBED_LAST = 12; // cap embedded screenshots; older runs keep their text row

const readJsonl = (f) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
        try { return [JSON.parse(l)]; } catch { return []; }
      })
    : [];

const runs = readJsonl('design-runs.jsonl');
const audits = readJsonl('design-audits.jsonl');
const lessons = readJsonl('design-lessons.jsonl').filter((l) => l.target !== 'seed');
if (!runs.length) { console.error('no runs yet: run the gate with --log'); process.exit(1); }

const auditFor = (r) => (r.id ? audits.find((a) => a.runId === r.id) : undefined);
// Same join as render-log.mjs, including the legacy note-match fallback for rows written
// before run ids existed. Without the fallback the dashboard reports "no lesson" for runs
// the markdown ledger shows a lesson for — two views of one truth must not disagree.
const lessonFor = (r) => {
  if (r.id) { const byId = lessons.find((l) => l.runId === r.id); if (byId) return byId; }
  return r.note ? lessons.find((l) => l.target === r.target && l.change === r.note) : undefined;
};
const verdictOf = (r) => {
  const crit = (auditFor(r)?.findings ?? []).filter((x) => x.severity === 'critical').length;
  if (r.gate !== 'PASS') return 'FAIL';
  return crit ? 'BLOCKED' : 'PASS';
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataUri = (p) => {
  try {
    if (!p || !fs.existsSync(p)) return null;
    const b = fs.readFileSync(p);
    if (b.length > 900_000) return null; // don't embed anything absurd
    return `data:image/png;base64,${b.toString('base64')}`;
  } catch { return null; }
};

const embedFrom = Math.max(0, runs.length - EMBED_LAST);
let skippedShots = 0;

const cards = runs.map((r, i) => {
  const v = verdictOf(r);
  const a = auditFor(r);
  const lesson = lessonFor(r);
  let shotHtml = '';
  if (r.shots?.dir) {
    if (i < embedFrom) { skippedShots++; shotHtml = `<p class="muted small">screenshots on disk. <code>${esc(r.shots.dir)}</code></p>`; }
    else {
      const imgs = (r.shots.widths ?? [375, 1280])
        .map((w) => ({ w, uri: dataUri(path.join(r.shots.dir, `${w}.png`)) }))
        .filter((x) => x.uri);
      if (imgs.length) {
        shotHtml = `<div class="shots">${imgs.map((x) => `<figure><img src="${x.uri}" alt="${esc(r.target)} rendered at ${x.w}px" loading="lazy" onclick="this.classList.toggle('full')"><figcaption>${x.w}px <span class="muted">— click to expand</span></figcaption></figure>`).join('')}</div>`;
      }
    }
  } else {
    shotHtml = `<p class="muted small">no visual record. Run with <code>--shots</code></p>`;
  }

  const failList = (r.failed ?? []).length
    ? `<ul class="findings">${r.failed.map((f) => `<li><code>${esc(f.check)}</code><span>${esc(f.detail)}</span></li>`).join('')}</ul>`
    : '';
  const slopList = !a
    ? `<p class="gap">⚠ not audited: the structural checker left no record</p>`
    : a.findings.length
      ? `<ul class="findings">${a.findings.map((x) => `<li><code class="sev-${esc(x.severity)}">${esc(x.severity)}</code><span>${esc(x.gate)}${x.where ? ` · ${esc(x.where)}` : ''}</span></li>`).join('')}</ul>`
      : `<p class="muted small">structural audit ran, clean</p>`;

  return `<article class="run v-${v}">
  <header>
    <span class="idx">#${i + 1}</span>
    <span class="verdict">${v}</span>
    <span class="target"><code>${esc(r.target)}</code></span>
    <time>${esc(r.ts.slice(0, 16).replace('T', ' '))}</time>
  </header>
  <dl>
    <dt>Changed</dt><dd>${esc(r.note || '—')}</dd>
    <dt>Why</dt><dd>${r.why?.trim() ? esc(r.why) : '<span class="gap">⚠ no rationale recorded. Outcome kept, decision lost</span>'}</dd>
  </dl>
  ${failList}
  <h4>Structural audit</h4>
  ${slopList}
  ${lesson ? `<p class="lesson"><strong>Lesson</strong> ${esc(lesson.lesson)}</p>` : (v === 'PASS' ? `<p class="gap">⚠ passed but logged no lesson</p>` : '')}
  ${shotHtml}
</article>`;
}).reverse().join('\n');

const passed = runs.filter((r) => verdictOf(r) === 'PASS').length;
const tally = {};
for (const r of runs) {
  for (const f of r.failed ?? []) tally[f.check] = (tally[f.check] ?? 0) + 1;
  for (const x of auditFor(r)?.findings ?? []) tally[`slop: ${x.gate}`] = (tally[`slop: ${x.gate}`] ?? 0) + 1;
}
const repeat = Object.entries(tally).sort((a, b) => b[1] - a[1]);

let evalHtml = `<p class="gap">⚠ the checker has never been evaluated. <code>npm run eval-gate</code></p>`;
if (fs.existsSync('fixtures/eval-report.json')) {
  const rep = JSON.parse(fs.readFileSync('fixtures/eval-report.json', 'utf8'));
  const { TP = 0, TN = 0, FP = 0, FN = 0 } = rep.certain ?? {};
  const pct = (n, d) => (d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(0)}%`);
  evalHtml = `<div class="stats">
    <div class="${FN ? 'stat bad' : 'stat'}"><b>${FN}</b><span>blind spots<em>defects approved</em></span></div>
    <div class="stat"><b>${pct(TP, TP + FN)}</b><span>recall<em>defects caught</em></span></div>
    <div class="${FP ? 'stat warn' : 'stat'}"><b>${FP}</b><span>false alarms<em>clean pages rejected</em></span></div>
    <div class="stat"><b>${rep.fixtures}</b><span>fixtures<em>${esc(rep.ts?.slice(0, 10) ?? '')}</em></span></div>
  </div>
  ${rep.blindSpots?.length ? `<ul class="findings">${rep.blindSpots.map((b) => `<li><code class="sev-critical">missed</code><span>${esc(b.probe)}<br><em class="muted">${esc(b.whyHard ?? '')}</em></span></li>`).join('')}</ul>` : ''}`;
}

const noWhy = runs.filter((r) => !r.why?.trim()).length;
const noAudit = runs.filter((r) => !auditFor(r)).length;
const noShots = runs.filter((r) => !r.shots).length;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>design-loop · dashboard</title>
<style>
  /* Neutrals biased toward the accent hue, per design.md. Not stock greys. */
  :root{
    --accent:#0f6b5c; --bg:#f7f8f7; --card:#fff; --ink:#171c1a; --muted:#5c6663;
    --line:#e2e7e5; --fail:#a8321f; --warn:#8a6a1a; --pass:#1f6b4a;
    --mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  @media (prefers-color-scheme:dark){
    :root{ --bg:#0f1413; --card:#161d1b; --ink:#e8edeb; --muted:#93a09c;
           --line:#243029; --accent:#4ecdb0; --fail:#e57a68; --warn:#d9b25f; --pass:#5fc296; }
  }
  :root[data-theme="dark"]{ --bg:#0f1413; --card:#161d1b; --ink:#e8edeb; --muted:#93a09c;
    --line:#243029; --accent:#4ecdb0; --fail:#e57a68; --warn:#d9b25f; --pass:#5fc296; }
  :root[data-theme="light"]{ --bg:#f7f8f7; --card:#fff; --ink:#171c1a; --muted:#5c6663;
    --line:#e2e7e5; --accent:#0f6b5c; --fail:#a8321f; --warn:#8a6a1a; --pass:#1f6b4a; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    padding:32px 20px 72px}
  .wrap{max-width:940px;margin:0 auto}
  h1{font-size:26px;margin:0 0 2px;letter-spacing:-.02em}
  .sub{color:var(--muted);margin:0 0 28px;font-size:14px;max-width:65ch}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);
    margin:34px 0 12px;font-weight:600}
  h4{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:14px 0 6px}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px}
  .stat b{display:block;font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}
  .stat span{font-size:12px;color:var(--muted);display:block;margin-top:3px}
  .stat em{display:block;font-style:normal;font-size:11px;opacity:.75;margin-top:1px}
  .stat.bad b{color:var(--fail)} .stat.warn b{color:var(--warn)}
  .run{background:var(--card);border:1px solid var(--line);border-radius:10px;
    padding:16px 18px;margin-bottom:12px;border-left:3px solid var(--line)}
  /* Boldness spent in ONE place: the verdict stripe. Everything else stays quiet. */
  .run.v-PASS{border-left-color:var(--pass)}
  .run.v-FAIL{border-left-color:var(--fail)}
  .run.v-BLOCKED{border-left-color:var(--warn)}
  .run header{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:10px}
  .idx{font-family:var(--mono);color:var(--muted);font-size:13px}
  .verdict{font-size:11px;font-weight:700;letter-spacing:.07em;padding:2px 7px;border-radius:4px;
    border:1px solid currentColor}
  .v-PASS .verdict{color:var(--pass)} .v-FAIL .verdict{color:var(--fail)} .v-BLOCKED .verdict{color:var(--warn)}
  .run time{margin-left:auto;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
  dl{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:0 0 4px}
  dt{color:var(--muted);font-size:12px;padding-top:2px}
  dd{margin:0;font-size:14px}
  code{font-family:var(--mono);font-size:12.5px;background:var(--bg);padding:1px 5px;
    border-radius:4px;border:1px solid var(--line)}
  .findings{list-style:none;padding:0;margin:6px 0}
  .findings li{display:flex;gap:9px;align-items:flex-start;padding:5px 0;
    border-top:1px solid var(--line);font-size:13px}
  .findings li span{color:var(--muted)}
  .sev-critical{color:var(--fail);border-color:currentColor}
  .sev-major{color:var(--warn);border-color:currentColor}
  .lesson{background:var(--bg);border-left:2px solid var(--accent);padding:8px 12px;
    margin:12px 0 0;font-size:13.5px;border-radius:0 5px 5px 0}
  .gap{color:var(--warn);font-size:13px;margin:6px 0}
  .muted{color:var(--muted)} .small{font-size:12.5px}
  .shots{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap}
  figure{margin:0;flex:1 1 220px;min-width:0}
  /* Full-page shots at 375px are very tall; uncapped they dwarf the desktop shot and the
     two stop being comparable at a glance. Cap and anchor to the top. */
  /* contain, not cover: cropping a vertically-centred layout shows the empty region
     above the content and tells you nothing. Letterboxing is less pretty and more honest. */
  figure img{width:100%;max-height:300px;object-fit:contain;object-position:top center;
    border:1px solid var(--line);border-radius:6px;display:block;background:var(--bg);cursor:zoom-in}
  figure img.full{max-height:none;cursor:zoom-out}
  figcaption{font-size:11px;color:var(--muted);margin-top:4px;font-family:var(--mono)}
  .offenders{list-style:none;padding:0;margin:0}
  .offenders li{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13.5px}
  .offenders b{font-family:var(--mono);min-width:34px}
  .chronic{color:var(--fail);font-weight:600}
  footer{margin-top:44px;color:var(--muted);font-size:12.5px;border-top:1px solid var(--line);padding-top:14px}
  table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto;white-space:nowrap}
  th,td{text-align:left;padding:6px 12px 6px 0;border-bottom:1px solid var(--line)}
  th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
</style></head><body><div class="wrap">

<h1>design-loop</h1>
<p class="sub">Every run, both checkers, the rationale, and what it looked like. Generated from
<code>design-runs.jsonl</code> + <code>design-audits.jsonl</code> + <code>design-lessons.jsonl</code>. Do not hand-edit.</p>

<h2>Health</h2>
<div class="stats">
  <div class="stat"><b>${runs.length}</b><span>runs<em>${passed} passed</em></span></div>
  <div class="${noAudit ? 'stat warn' : 'stat'}"><b>${runs.length - noAudit}/${runs.length}</b><span>audited<em>structural checker</em></span></div>
  <div class="${noWhy ? 'stat warn' : 'stat'}"><b>${runs.length - noWhy}/${runs.length}</b><span>with rationale<em>decision vs outcome</em></span></div>
  <div class="${noShots ? 'stat warn' : 'stat'}"><b>${runs.length - noShots}/${runs.length}</b><span>with visuals<em>--shots</em></span></div>
</div>

<h2>Is the checker any good?</h2>
${evalHtml}

<h2>Repeat offenders</h2>
${repeat.length ? `<ul class="offenders">${repeat.map(([c, n]) => `<li><b${n >= 3 ? ' class="chronic"' : ''}>${n}×</b><span>${esc(c)}${n >= 3 ? ' <strong class="chronic">— chronic: design.md is under-specified</strong>' : ''}</span></li>`).join('')}</ul>` : '<p class="muted small">No check has ever failed.</p>'}

<h2>Runs <span class="muted small">(newest first)</span></h2>
${cards}

<footer>
Generated by <code>npm run dashboard</code>.
${skippedShots ? `Screenshots embedded for the ${EMBED_LAST} most recent runs; ${skippedShots} older run(s) reference disk paths.` : ''}
Trigger is <strong>manual</strong>: this is a task you invoke, not yet an autonomous loop.
</footer>
</div></body></html>`;

fs.writeFileSync('design-dashboard.html', html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`  design-dashboard.html written: ${runs.length} run(s), ${kb}KB`);
console.log(`  open: file://${path.resolve('design-dashboard.html')}`);
