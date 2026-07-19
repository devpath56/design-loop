// replay — steps through the loop's history: what changed, why, and what it looked like.
//
// The ledger tells you a run happened and the dashboard shows the result. Neither lets you
// watch the artifact EVOLVE. This diffs each run's snapshot against the previous run of the
// same target, pairs it with before/after screenshots, and puts the rationale next to it.
//
// Usage:  node checks/replay.mjs [--text]
import fs from 'node:fs';
import path from 'node:path';

const textMode = process.argv.includes('--text');

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
const lessonFor = (r) => {
  if (r.id) { const byId = lessons.find((l) => l.runId === r.id); if (byId) return byId; }
  return r.note ? lessons.find((l) => l.target === r.target && l.change === r.note) : undefined;
};
const verdictOf = (r) => {
  const crit = (auditFor(r)?.findings ?? []).filter((x) => x.severity === 'critical').length;
  return r.gate !== 'PASS' ? 'FAIL' : crit ? 'BLOCKED' : 'PASS';
};

// ── Minimal LCS line diff. No dependency: a diff library for this is more surface than value.
function diffLines(aText, bText) {
  const a = aText.split('\n'), b = bText.split('\n');
  const n = a.length, m = b.length;
  // Guard: LCS is O(n*m); on very large files fall back to a coarse summary.
  if (n * m > 4_000_000) return null;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: ' ', line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', line: a[i] }); i++; }
    else { out.push({ t: '+', line: b[j] }); j++; }
  }
  while (i < n) out.push({ t: '-', line: a[i++] });
  while (j < m) out.push({ t: '+', line: b[j++] });
  return out;
}

// Collapse unchanged runs of lines so the diff shows the change, not the whole file.
function collapse(diff, ctx = 3) {
  if (!diff) return null;
  const keep = new Set();
  diff.forEach((d, i) => {
    if (d.t !== ' ') for (let k = Math.max(0, i - ctx); k <= Math.min(diff.length - 1, i + ctx); k++) keep.add(k);
  });
  const out = [];
  let skipped = 0;
  diff.forEach((d, i) => {
    if (keep.has(i)) {
      if (skipped) { out.push({ t: '@', line: `⋯ ${skipped} unchanged line${skipped === 1 ? '' : 's'}` }); skipped = 0; }
      out.push(d);
    } else skipped++;
  });
  if (skipped) out.push({ t: '@', line: `⋯ ${skipped} unchanged line${skipped === 1 ? '' : 's'}` });
  return out;
}

// Pair each run with the previous run of the SAME target — that is the meaningful baseline.
const steps = runs.map((r, i) => {
  const prev = [...runs.slice(0, i)].reverse().find((p) => p.target === r.target);
  let diff = null, stat = { add: 0, del: 0 };
  if (r.snapshot && fs.existsSync(r.snapshot)) {
    const cur = fs.readFileSync(r.snapshot, 'utf8');
    const base = prev?.snapshot && fs.existsSync(prev.snapshot) ? fs.readFileSync(prev.snapshot, 'utf8') : null;
    if (base === null) diff = 'FIRST';
    else {
      const d = collapse(diffLines(base, cur));
      if (d) {
        stat.add = d.filter((x) => x.t === '+').length;
        stat.del = d.filter((x) => x.t === '-').length;
        diff = stat.add + stat.del === 0 ? 'NOCHANGE' : d;
      }
    }
  }
  return { run: r, prev, diff, stat, idx: i + 1, verdict: verdictOf(r), audit: auditFor(r), lesson: lessonFor(r) };
});

// ── Terminal mode: a chronological narrative, greppable and diffable.
if (textMode) {
  console.log(`\n  design-loop · replay: ${steps.length} step(s)\n`);
  for (const s of steps) {
    const { run: r } = s;
    console.log(`  ─── #${s.idx}  ${s.verdict}  ${r.ts.slice(0, 16).replace('T', ' ')}  ${r.target}`);
    console.log(`      changed  ${r.note || '—'}`);
    console.log(`      why      ${r.why?.trim() || '⚠ not recorded'}`);
    if (Array.isArray(s.diff)) {
      console.log(`      diff     +${s.stat.add} −${s.stat.del}`);
      for (const d of s.diff.slice(0, 24)) {
        const c = d.t === '+' ? '\x1b[32m' : d.t === '-' ? '\x1b[31m' : '\x1b[2m';
        console.log(`        ${c}${d.t} ${d.line.slice(0, 100)}\x1b[0m`);
      }
      if (s.diff.length > 24) console.log(`        \x1b[2m… ${s.diff.length - 24} more diff lines\x1b[0m`);
    } else if (s.diff === 'FIRST') console.log(`      diff     (first run of this target. Baseline)`);
    else if (s.diff === 'NOCHANGE') console.log(`      diff     no change to the artifact`);
    else console.log(`      diff     ⚠ no snapshot. Run predates snapshotting`);
    for (const f of r.failed ?? []) console.log(`      ✗ ${f.check} → ${f.detail}`);
    for (const x of s.audit?.findings ?? []) console.log(`      ✗ slop [${x.severity}] ${x.gate}`);
    if (s.lesson) console.log(`      lesson   ${s.lesson.lesson}`);
    console.log('');
  }
  process.exit(0);
}


// ── HTML mode — ONE job: flip between iterations and see what changed.
// Everything that isn't in service of that was cut: the code-diff block (this is a visual
// replay; the diff lives in design-log.md), the repeated section labels, the scrubber strip,
// and the paragraph-length empty states. Runs with no visual record collapse to one line
// instead of occupying a full card of warnings.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let linked = 0;
const CAP = 900_000;
const shotSrc = (p) => {
  try {
    if (!p || !fs.existsSync(p)) return null;
    const b = fs.readFileSync(p);
    if (b.length <= CAP) return `data:image/png;base64,${b.toString('base64')}`;
    linked++;
    return p.split(path.sep).join('/');
  } catch { return null; }
};

const VERDICT = { PASS: 'ok', FAIL: 'no', BLOCKED: 'hold' };

const cards = [...steps].reverse().map((s, n) => {
  const { run: r } = s;
  const before = s.prev?.shots?.dir ? shotSrc(path.join(s.prev.shots.dir, '1280.png')) : null;
  const after = r.shots?.dir ? shotSrc(path.join(r.shots.dir, '1280.png')) : null;
  const open = n === 0 ? ' open' : '';

  const crit = (s.audit?.findings ?? []).filter((f) => f.severity === 'critical');
  const chips = (s.audit?.findings ?? [])
    .map((f) => `<span class="chip s-${esc(f.severity)}" title="${esc(f.fix ?? '')}">${esc(f.gate)}</span>`)
    .join('');

  const compare = before && after
    ? `<div class="cmp" data-cmp>
         <div class="stack"><img class="a" src="${before}" alt="run ${runs.indexOf(s.prev) + 1}"><img class="b" src="${after}" alt="run ${s.idx}"></div>
         <button type="button" class="flip" aria-pressed="false">
           <span class="dot"></span><span data-lbl>#${s.idx}: this run</span>
           <em>click, or hold <kbd>B</kbd></em>
         </button>
       </div>`
    : after
      ? `<div class="cmp"><div class="stack"><img class="b" src="${after}" alt="run ${s.idx}"></div>
         <p class="none">first visual record: nothing to flip against yet</p></div>`
      : `<p class="none">no screenshots: this run predates <code>--shots</code></p>`;

  return `<details class="run v-${s.verdict}"${open}>
  <summary>
    <span class="v">${VERDICT[s.verdict]}</span>
    <span class="ttl">${esc(r.note || 'untitled change')}</span>
    <time>${esc(r.ts.slice(5, 16).replace('T', ' '))}</time>
  </summary>
  <div class="body">
    ${compare}
    ${r.why?.trim() ? `<p class="why">${esc(r.why)}</p>` : ''}
    ${chips ? `<div class="chips">${chips}</div>` : ''}
    ${s.lesson ? `<p class="lesson">${esc(s.lesson.lesson)}</p>` : ''}
  </div>
</details>`;
}).join('\n');

const withShots = steps.filter((s) => s.run.shots).length;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>design-loop · replay</title>
<style>
  :root{--bg:#fbfbfa;--card:#fff;--ink:#161a19;--mut:#6b7472;--line:#e4e8e6;
    --ok:#1f6b4a;--no:#a8321f;--hold:#8a6a1a;--acc:#0f6b5c;
    --mono:ui-monospace,SFMono-Regular,Menlo,monospace}
  @media (prefers-color-scheme:dark){:root{--bg:#0e1211;--card:#161b1a;--ink:#e9edeb;--mut:#8b9794;
    --line:#232b29;--ok:#5fc296;--no:#e57a68;--hold:#d9b25f;--acc:#4ecdb0}}
  :root[data-theme="dark"]{--bg:#0e1211;--card:#161b1a;--ink:#e9edeb;--mut:#8b9794;--line:#232b29;
    --ok:#5fc296;--no:#e57a68;--hold:#d9b25f;--acc:#4ecdb0}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif}
  .w{max-width:760px;margin:0 auto;padding:36px 20px 80px}
  h1{font-size:19px;font-weight:600;margin:0 0 3px;letter-spacing:-.01em}
  .lede{color:var(--mut);font-size:13.5px;margin:0 0 26px}
  .run{background:var(--card);border:1px solid var(--line);border-radius:10px;margin-bottom:8px}
  .run[open]{border-color:var(--acc)}
  summary{display:flex;gap:11px;align-items:center;padding:12px 14px;cursor:pointer;list-style:none}
  summary::-webkit-details-marker{display:none}
  summary:focus-visible{outline:2px solid var(--acc);outline-offset:-2px;border-radius:10px}
  .v{font:600 10.5px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;
    padding:4px 6px;border-radius:4px;border:1px solid currentColor;flex:none}
  .v-PASS .v{color:var(--ok)} .v-FAIL .v{color:var(--no)} .v-BLOCKED .v{color:var(--hold)}
  .ttl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
  summary time{color:var(--mut);font:12px var(--mono);flex:none}
  .body{padding:0 14px 14px}
  .stack{position:relative;border:1px solid var(--line);border-radius:8px;overflow:hidden;
    background:var(--bg);aspect-ratio:16/10;cursor:zoom-in}
  .cmp.zoom{position:fixed;inset:0;z-index:50;background:#000;display:flex;
    flex-direction:column;padding:20px;gap:10px}
  .cmp.zoom .stack{flex:1;aspect-ratio:auto;border:0;border-radius:0;background:#000;cursor:zoom-out}
  .cmp.zoom .stack img{object-fit:contain}
  .cmp.zoom .flip{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.25);color:#fff;
    max-width:520px;margin:0 auto}
  .stack img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center}
  .stack img.a{opacity:0;z-index:2;transition:opacity .09s linear}
  .cmp.show-a .stack img.a{opacity:1}
  .flip{margin-top:8px;width:100%;display:flex;align-items:center;gap:8px;
    font:13px ui-sans-serif,system-ui,sans-serif;color:var(--ink);background:transparent;
    border:1px solid var(--line);border-radius:7px;padding:7px 11px;cursor:pointer;text-align:left}
  .flip:hover,.flip:focus-visible{border-color:var(--acc);outline:none}
  .flip .dot{width:7px;height:7px;border-radius:50%;background:var(--acc);flex:none}
  .cmp.show-a .flip .dot{background:var(--mut)}
  .flip em{margin-left:auto;font-style:normal;color:var(--mut);font-size:11.5px}
  kbd{font:11px var(--mono);border:1px solid var(--line);border-bottom-width:2px;
    border-radius:3px;padding:0 3px}
  .why{color:var(--mut);font-size:13.5px;margin:12px 0 0}
  .chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
  .chip{font:11.5px var(--mono);padding:3px 7px;border-radius:4px;border:1px solid var(--line);
    color:var(--mut);cursor:help}
  .chip.s-critical{color:var(--no);border-color:currentColor}
  .chip.s-major{color:var(--hold)}
  .lesson{font-size:13.5px;margin:12px 0 0;padding-left:11px;border-left:2px solid var(--acc)}
  .none{color:var(--mut);font-size:13px;margin:0}
  code{font:12px var(--mono)}
  footer{color:var(--mut);font-size:12px;margin-top:28px}
</style></head><body><div class="w">
<h1>design-loop · replay</h1>
<p class="lede">Newest first. Open a run, then flip between it and the one before. The image stays in place so the change is what moves.</p>
${cards}
<footer>${steps.length} runs · ${withShots} with screenshots${linked ? ` · ${linked} linked, not embedded (open from the project dir)` : ''}</footer>
</div>
<script>
document.querySelectorAll('[data-cmp]').forEach(function(c){
  var btn=c.querySelector('.flip'), lbl=c.querySelector('[data-lbl]');
  var a=c.querySelector('img.a').alt, b=c.querySelector('img.b').alt;
  function set(showA){
    c.classList.toggle('show-a',showA);
    lbl.textContent = showA ? ('#'+a.replace(/\\D/g,'')+'. Previous') : ('#'+b.replace(/\\D/g,'')+' — this run');
    btn.setAttribute('aria-pressed', showA?'true':'false');
  }
  btn.addEventListener('click',function(e){ e.stopPropagation(); set(!c.classList.contains('show-a')); });
  var stack=c.querySelector('.stack');
  function zoom(on){ c.classList.toggle('zoom',on); document.body.style.overflow=on?'hidden':''; if(on) c.dataset.hot='1'; }
  stack.addEventListener('click',function(){ zoom(!c.classList.contains('zoom')); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&c.classList.contains('zoom')) zoom(false); });
  c.addEventListener('mouseenter',function(){ c.dataset.hot='1'; });
  c.addEventListener('mouseleave',function(){ delete c.dataset.hot; set(false); });
  document.addEventListener('keydown',function(e){
    if(e.key!=='b'&&e.key!=='B') return;
    if(e.repeat) return;
    if(c.dataset.hot||document.activeElement===btn) set(true);
  });
  document.addEventListener('keyup',function(e){
    if(e.key==='b'||e.key==='B') set(false);
  });
});
// Accordion: one run open at a time, so the comparator is always the thing you are looking at.
var runs=document.querySelectorAll('details.run');
runs.forEach(function(d){
  d.addEventListener('toggle',function(){
    if(!d.open) return;
    runs.forEach(function(o){ if(o!==d) o.open=false; });
  });
});
</script>
</body></html>`;

fs.writeFileSync('design-replay.html', html);
console.log(`  design-replay.html: ${steps.length} runs, ${withShots} with screenshots`);
if (linked) console.log(`  ${linked} screenshot(s) linked rather than embedded (over ${(CAP/1000)|0}KB)`);
console.log(`  open: file://${path.resolve('design-replay.html')}`);
