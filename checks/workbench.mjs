// workbench — your design on the left, its history on the right, in one page.
//
// The prototype loads in an IFRAME. That is deliberate: injecting the panel into the
// prototype itself would put tooling DOM inside the artifact the gate measures — extra
// focusable elements, extra console, extra overflow surface. The artifact stays pure; the
// tooling lives in the shell around it.
//
// Usage:  node checks/workbench.mjs [file.html] [--url http://localhost:8000/x.html]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { load, pairSteps, makeShotSrc, esc, AXES, AXIS_HELP, practiceNext } from './lib/runs.mjs';

const argv = process.argv.slice(2);
const urlIdx = argv.indexOf('--url');
const explicitUrl = urlIdx !== -1 ? argv[urlIdx + 1] : null;
const target = argv.find((a) => !a.startsWith('--') && a !== explicitUrl) || 'prototype.html';

if (!explicitUrl && !fs.existsSync(target)) {
  console.error(`no such file: ${target}`);
  process.exit(2);
}

const { runs, verdictOf, auditFor, lessonFor, teachFor } = load();
const steps = pairSteps(runs, verdictOf, auditFor, lessonFor, teachFor).filter((s) => s.run.target === target);
const { src: shotSrc, state } = makeShotSrc();

// file:// iframes of a sibling file work; a served URL is better because the effect layer
// and any fetch behave as they will in a browser.
const frameSrc = explicitUrl || './' + target.split(path.sep).join('/');

const VERD = { PASS: 'ok', FAIL: 'no', BLOCKED: 'hold' };

// One output file per target. A single `design-workbench.html` meant building for a second
// prototype silently overwrote the first — you would open your bookmark and find someone
// else's screen. Named per target, several prototypes can be worked on in parallel.
const slug = path.basename(target).replace(/\.html?$/i, '');
const outFile = `workbench-${slug}.html`;

// Every candidate target: html files in the root that are not generated output, plus any
// file that already has runs logged. Selecting one navigates to ITS workbench.
const generated = /^(design-(workbench|replay|dashboard)|workbench-|doctrine\.html)/;
const siblings = [...new Set([
  ...fs.readdirSync('.').filter((f) => /\.html?$/i.test(f) && !generated.test(f)),
  ...runs.map((r) => r.target).filter(Boolean),
])].sort();

// The dropdown lists the REQUIRED states, not just the drawn ones — an undrawn state stays
// in the menu, disabled. A menu of only what exists hides the gap; a menu of what should
// exist makes "3 of these are missing" visible every time you open it.
// The required set comes from the artifact's own <meta name="ui-states">, falling back to the
// data-screen default. Not a hardcoded universal four: "empty" does not apply to a form, and
// auth owes "locked" (see design.md sources). declared = states actually drawn in the markup.
let REQUIRED_STATES = ['loading', 'error', 'success'];
let declared = [];
try {
  const src = fs.readFileSync(target, 'utf8');
  const owed = (src.match(/<meta\s+name=["']ui-states["']\s+content=["']([^"']+)["']/i) || [])[1];
  if (owed) REQUIRED_STATES = owed.split(',').map((s) => s.trim()).filter(Boolean);
  declared = [...new Set([...src.matchAll(/data-state=["']([^"']+)["']/g)].map((m) => m[1]))];
} catch {}
const stateOpts = ['<option value="">default</option>']
  .concat(REQUIRED_STATES.map((st) => {
    const has = declared.includes(st);
    return `<option value="${esc(st)}"${has ? '' : ' disabled'}>${esc(st)}${has ? '' : '. Not drawn'}</option>`;
  }))
  .concat(declared.filter((d) => !REQUIRED_STATES.includes(d))
    .map((d) => `<option value="${esc(d)}">${esc(d)}</option>`))
  .join('');


// The panel carries four conceptual blocks. Run as one continuous stream at equal weight
// they read as a wall — so each gets its own SURFACE, and the one thing that transfers to
// the next project (the vocabulary) gets the strongest treatment on the card.
// Verbose supporting text (the staff phrasing, my response) is collapsed: available on
// demand, never competing with the payload.
const AXIS_LABEL = { mechanism: 'mechanism', constraint: 'constraint', solution_space: 'open space', actionable: 'actionable' };

// The judge's `gap` usually opens with the axis name, so prefixing it again reads
// "mechanism: mechanism — ...". Use the gap alone when it already names the axis.
function gapLine(axis, gap) {
  const name = axis.replace('_', ' ');
  if (!gap || gap === 'none') return name;
  return gap.toLowerCase().startsWith(name) ? gap : `${name}: ${gap}`;
}

function block(s, r, chips) {
  const t = s.teach, fb = t?.feedback;
  const learn = [], work = [];
  const li = (arr) => `<ul class="tight">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const MARK = { yes: '✓', partial: '~', no: '✗' };

  // CF-064: no fallback layout. A run with no teaching record renders as a GAP, never as a
  // lesser format that reads as a deliberate alternative. This block was written once, then
  // silently dropped by a later rewrite of this function — the CSS survived, the logic did
  // not, and nothing caught it until verify-render existed. Do not remove without replacing.
  if (!t) {
    const fixable = Boolean(r.id);
    return `<section class="sec gapcard${fixable ? '' : ' historic'}">
      <h3>${fixable ? 'not taught yet' : 'predates the teaching layer'}</h3>
      <p class="gapmsg">${fixable
        ? 'This run has no teaching record, so it cannot render the prescribed format.'
        : 'Logged before runs carried ids, so nothing can be joined to it. Left as-is deliberately.'}</p>
      ${fixable ? `<p class="gapcmd">node checks/log-teach.mjs ${esc(r.id)} --json '{...}'</p>` : ''}
      ${r.why?.trim() ? `<details class="more"><summary>raw why</summary><p class="dim">${esc(r.why)}</p></details>` : ''}
    </section>`;
  }

  // 1 — LEARNED: the vocabulary AND which feedback dimensions you hit. Both are things you
  // learned this run, so they live together. The score is not a report card in its own
  // section — it is half the lesson.
  if (t?.terms?.length || fb) {
    const dims = fb ? `<table class="dims">${AXES.map((a) => {
      const v = fb.rubric[a] ?? 'no';
      return `<tr class="d-${v}"><td class="dm">${MARK[v]}</td><th>${a.replace('_', ' ')}</th><td class="dh">${esc(AXIS_HELP[a] ?? '')}</td></tr>`;
    }).join('')}</table>` : '';
    // Lead with the rehearsable action, not a tally. No number at the top: a score gets
    // optimised, an imperative gets practised.
    const pr = practiceNext(fb);
    learn.push(`<section class="sec learned">
      <h3>learned</h3>
      ${t?.terms?.length ? `<ul class="terms">${t.terms.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${pr ? `<div class="practise"><span class="pl">practise next</span>
        <p class="pi">${esc(pr.imperative)}</p>
        <p class="pw">${esc(gapLine(pr.axis, fb.gap))}</p></div>` : ''}
      ${dims}
    </section>`);
  }

  // 2 — The model answer, decomposed into the SAME six rows as the checklist above.
  // As prose it demonstrated good phrasing but buried which sentence did which job; as a
  // table you can read one row and see exactly what "evidence" or "acceptance" sounds like.
  if (t?.craft) {
    learn.push(`<section class="sec say"><h3>say it in craft terms</h3>
      ${fb ? `<blockquote class="yours">${esc(fb.verbatim)}</blockquote>` : ''}
      <table class="craft">${AXES.filter((a) => t.craft[a]).map((a) => {
        const hit = fb?.rubric?.[a] ?? 'no';
        return `<tr class="d-${hit}"><th>${a.replace('_', ' ')}</th><td>${esc(t.craft[a])}</td></tr>`;
      }).join('')}</table>
    </section>`);
  } else if (t?.craft_note) {
    learn.push(`<section class="sec say"><h3>say it in craft terms</h3>
      <p class="quote">${esc(t.craft_note)}</p></section>`);
  }

  // Evidence section removed from the card. Its substance already lives in the craft
  // table's `evidence` row, so rendering both made the reader reconcile two versions of the
  // same claim — the third instance of that redundancy in this panel.
  //
  // The DATA is untouched: `evidence` is still written to design-teaching.jsonl and
  // log-teach.mjs still rejects unsourced claims and weasel citations. The discipline of
  // sourcing a claim is not a display feature; only the display was cut.

  // Hierarchy is the one measurement worth putting on the card: four numbers the maker can
  // act on directly, unlike a pass/fail that only says something is wrong. Rendered from the
  // run row, so it appears whether or not the run has a teaching record.
  const hier = (r.craft ?? []).filter((c) => c.id?.startsWith('hierarchy-'));
  if (hier.length) {
    // A passing lever costs 3 wrapped lines at 380px and tells you nothing you can act on.
    // A failing one needs its number, because "4/5" does not say which lever or by how much.
    // So: score always, rows only for what failed.
    const failed = hier.filter((h) => h.verdict !== 'PASS');
    const levers = hier.find((h) => h.id === 'hierarchy-levers');
    learn.push(`<section class="sec hier">
      <h3>hierarchy
        <span class="tally ${failed.length ? 'bad' : ''}">${hier.length - failed.length}/${hier.length}</span>
      </h3>
      <p class="hsum">${levers ? esc(levers.measured) : ''}</p>
      ${failed.length ? `<table class="m">${failed.map((h) => `<tr class="d-no">
        <th>${esc(h.name.replace(/^hierarchy /, '').replace(/ (is|are|uses|follows).*/, ''))}</th>
        <td>${esc(h.measured)}</td></tr>`).join('')}</table>` : ''}
      <details class="more"><summary>all ${hier.length} levers</summary>
        <table class="m">${hier.map((h) => `<tr class="d-${h.verdict === 'PASS' ? 'yes' : 'no'}">
          <th>${esc(h.name.replace(/^hierarchy /, '').replace(/ (is|are|uses|follows).*/, ''))}</th>
          <td>${esc(h.measured)}</td></tr>`).join('')}</table>
      </details>
    </section>`);
  }

  // Grouped by OWNER, not by topic. The three lists were previously `next` / `you decide` /
  // `unverified`, which describes what each item IS. Who has to act on it is the thing you
  // actually need at a glance — and it stops the same item appearing as both my task and
  // your decision, which is what happened here.
  if (t?.tradeoff) {
    work.push(`<h4>trade</h4><table class="m">
      <tr><th>chose</th><td>${esc(t.tradeoff.chose)}</td></tr>
      <tr><th>gave up</th><td>${esc(t.tradeoff.gave_up)}</td></tr>
      ${t.tradeoff.reversible ? `<tr><th>undo</th><td>${esc(t.tradeoff.reversible)}</td></tr>` : ''}</table>`);
  }
  const nx = t?.next ?? (s.audit?.findings ?? []).filter((f) => f.severity === 'critical').map((f) => f.fix);
  if (nx.length) work.push(`<h4><span class="own o-me">mine</span> next run</h4>${li(nx)}`);
  if (chips) work.push(`<h4><span class="own o-me">mine</span> open findings</h4><div class="chips">${chips}</div>`);
  if (t?.open?.length) work.push(`<h4><span class="own o-you">yours</span> decide</h4>${li(t.open)}`);
  if (t?.unknown?.length) work.push(`<h4><span class="own o-none">unproven</span> needs an experiment</h4>${li(t.unknown)}`);

  if (work.length) {
    learn.push(`<details class="sec workd"><summary>work</summary>
      <div class="wb">${work.join('')}</div></details>`);
  }
  return learn.join('\n');
}

const rows = [...steps].reverse().map((s, n) => {
  const { run: r } = s;
  const before = s.prev?.shots?.dir ? shotSrc(path.join(s.prev.shots.dir, '1280.png')) : null;
  const after = r.shots?.dir ? shotSrc(path.join(r.shots.dir, '1280.png')) : null;
  // Criticals are shown in full under "judge · recommends"; chips carry the remainder so the
  // same finding never appears twice in one panel.
  const chips = (s.audit?.findings ?? []).filter((f) => f.severity !== 'critical')
    .map((f) => `<span class="chip s-${esc(f.severity)}" title="${esc(f.fix ?? '')}">${esc(f.gate)}</span>`).join('');

  const cmp = before && after
    ? `<div class="cmp" data-cmp>
         <div class="stack"><img class="a" src="${before}" alt="${runs.indexOf(s.prev) + 1}"><img class="b" src="${after}" alt="${s.idx}"></div>
         <button type="button" class="flip" aria-pressed="false"><span class="dot"></span><span data-lbl>#${s.idx}: this run</span><em>hold <kbd>B</kbd></em></button>
       </div>`
    : after
      ? `<div class="cmp"><div class="stack"><img class="b" src="${after}" alt="${s.idx}"></div></div>`
      : '';

  return `<details class="run v-${s.verdict}"${n === 0 ? ' open' : ''}>
  <summary><span class="v">${VERD[s.verdict]}</span><span class="ttl">${esc(r.note || 'untitled')}</span></summary>
  <div class="body">
    ${cmp}
    ${block(s, r, chips)}
  </div>
</details>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>workbench · ${esc(target)}</title>
<style>
  :root{--bg:#fbfbfa;--card:#fff;--ink:#161a19;--mut:#6b7472;--line:#e4e8e6;
    --ok:#1f6b4a;--no:#a8321f;--hold:#8a6a1a;--acc:#0f6b5c;
    --mono:ui-monospace,SFMono-Regular,Menlo,monospace;--w:380px}
  @media (prefers-color-scheme:dark){:root{--bg:#0e1211;--card:#161b1a;--ink:#e9edeb;--mut:#8b9794;
    --line:#232b29;--ok:#5fc296;--no:#e57a68;--hold:#d9b25f;--acc:#4ecdb0}}
  :root[data-theme="dark"]{--bg:#0e1211;--card:#161b1a;--ink:#e9edeb;--mut:#8b9794;--line:#232b29;
    --ok:#5fc296;--no:#e57a68;--hold:#d9b25f;--acc:#4ecdb0}
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif;
    display:grid;grid-template-columns:1fr var(--w);height:100vh;overflow:hidden}
  body.collapsed{grid-template-columns:1fr 0}
  /* The design gets the room. The panel is the accessory, never the subject. */
  .stage{position:relative;min-width:0;background:var(--bg);display:flex;flex-direction:column}
  .bar{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);
    font:12px var(--mono);color:var(--mut);flex:none}
  .bar b{color:var(--ink);font-weight:500}
  .bar .sp{margin-left:auto;display:flex;gap:6px}
  .bar button{color:var(--mut);background:transparent;border:1px solid var(--line);
    border-radius:6px;padding:4px 6px;cursor:pointer;display:grid;place-items:center;line-height:0}
  .bar select{font:12px var(--mono);color:var(--ink);background:var(--card);
    border:1px solid var(--line);border-radius:6px;padding:3px 6px;cursor:pointer}
  .bar select:focus-visible,.bar button:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
  .ctl{display:flex;align-items:center;gap:5px}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  .bar button:hover,.bar button:focus-visible{border-color:var(--acc);color:var(--ink);outline:none}
  .bar button[aria-pressed=true]{color:var(--acc);border-color:var(--acc)}
  .frame{flex:1;min-height:0;display:grid;place-items:start center;overflow:auto;padding:14px}
  iframe{border:1px solid var(--line);border-radius:8px;background:#fff;width:100%;height:100%;
    transition:width .18s ease}
  iframe.w375{width:375px} iframe.w768{width:768px}
  .panel{border-left:1px solid var(--line);background:var(--bg);overflow-y:auto;min-width:0}
  body.collapsed .panel{display:none}
  /* drag handle on the stage/panel boundary: resizes the panel width (--w) */
  .grip{position:absolute;top:0;right:var(--w);width:11px;height:100%;z-index:40;cursor:col-resize;transform:translateX(50%);touch-action:none}
  .grip::after{content:"";position:absolute;top:0;left:50%;width:1px;height:100%;background:var(--line);transform:translateX(-50%);transition:background .12s,width .12s}
  .grip:hover::after,.grip.drag::after{background:var(--acc);width:2px}
  body.collapsed .grip{display:none}
  @media (prefers-reduced-motion:reduce){.grip::after{transition:none}}
  .ph{position:sticky;top:0;background:var(--bg);padding:11px 13px 8px;border-bottom:1px solid var(--line);z-index:3}
  .ph h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:0;font-weight:600}
  .pb{padding:10px 13px 40px}
  .run{background:var(--card);border:1px solid var(--line);border-radius:9px;margin-bottom:7px}
  .run[open]{border-color:var(--acc)}
  summary{display:flex;gap:8px;align-items:center;padding:9px 11px;cursor:pointer;list-style:none}
  summary::-webkit-details-marker{display:none}
  summary:focus-visible{outline:2px solid var(--acc);outline-offset:-2px;border-radius:9px}
  .v{font:600 10px/1 var(--mono);letter-spacing:.05em;text-transform:uppercase;padding:3px 5px;
    border-radius:3px;border:1px solid currentColor;flex:none}
  .v-PASS .v{color:var(--ok)} .v-FAIL .v{color:var(--no)} .v-BLOCKED .v{color:var(--hold)}
  .ttl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
  .body{padding:0 11px 11px}
  .stack{position:relative;border:1px solid var(--line);border-radius:6px;overflow:hidden;
    background:var(--bg);aspect-ratio:16/10;cursor:zoom-in}
  /* Zoom promotes the existing comparator rather than cloning it, so hold-B still flips
     the same two <img> nodes and no state has to be mirrored. */
  .cmp.zoom{position:fixed;inset:0;z-index:50;background:#000;display:flex;
    flex-direction:column;padding:20px;gap:10px}
  .cmp.zoom .stack{flex:1;aspect-ratio:auto;border:0;border-radius:0;background:#000;cursor:zoom-out}
  .cmp.zoom .stack img{object-fit:contain}
  .cmp.zoom .flip{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.25);color:#fff;
    max-width:520px;margin:0 auto}
  .cmp.zoom .flip em{color:rgba(255,255,255,.6)}
  .stack img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center}
  .stack img.a{opacity:0;z-index:2;transition:opacity .09s linear}
  .cmp.show-a .stack img.a{opacity:1}
  .flip{margin-top:7px;width:100%;display:flex;align-items:center;gap:7px;font:12px ui-sans-serif,system-ui,sans-serif;
    color:var(--ink);background:transparent;border:1px solid var(--line);border-radius:6px;
    padding:6px 9px;cursor:pointer;text-align:left}
  .flip:hover,.flip:focus-visible{border-color:var(--acc);outline:none}
  .flip .dot{width:6px;height:6px;border-radius:50%;background:var(--acc);flex:none}
  .cmp.show-a .flip .dot{background:var(--mut)}
  .flip em{margin-left:auto;font-style:normal;color:var(--mut);font-size:11px}
  kbd{font:10.5px var(--mono);border:1px solid var(--line);border-bottom-width:2px;border-radius:3px;padding:0 3px}
  /* Each block gets its own surface so the four sections read as four things. */
  .sec{margin-top:10px;padding:10px 11px;border-radius:8px;background:var(--bg);
    border:1px solid var(--line)}
  .sec h3{font:600 10px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;
    color:var(--mut);margin:0 0 7px;display:flex;align-items:center;gap:6px}
  /* The payload. Strongest treatment on the card. This is what transfers. */
  .learned{background:color-mix(in srgb,var(--acc) 9%,transparent);border-color:var(--acc)}
  .learned h3{color:var(--acc)}
  .terms{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0}
  .terms li{font:500 13px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--ink);
    background:var(--card);border:1px solid var(--acc);border-radius:5px;padding:5px 9px}
  .workd{padding:0}
  .workd>summary{padding:9px 11px;cursor:pointer;list-style:none;font:600 10px/1 var(--mono);
    letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
  .workd>summary::-webkit-details-marker{display:none}
  .workd>summary:before{content:"+ ";color:var(--acc)}
  .workd[open]>summary:before{content:"- "}
  .wb{padding:0 11px 11px}
  .wb h4{font:600 10px/1 var(--mono);letter-spacing:.07em;text-transform:uppercase;
    color:var(--mut);margin:12px 0 5px;display:flex;align-items:center;gap:6px}
  .own{padding:2px 5px;border-radius:3px;border:1px solid currentColor;letter-spacing:.04em}
  .o-me{color:var(--mut)}
  .o-you{color:var(--acc)}
  .o-none{color:var(--hold)}
  .ecn{margin:3px 0 0;font-size:11px;color:var(--hold);line-height:1.4}
  .m{width:100%;border-collapse:collapse;font:12px var(--mono)}
  .m th{text-align:left;font-weight:400;color:var(--mut);padding:3px 8px 3px 0;white-space:nowrap;
    vertical-align:top;width:1%}
  /* Numbers stay on one line; prose values (the trade rows) must wrap or they clip at the
     panel edge. nowrap was right for measurements and wrong the moment a value became a phrase. */
  .m td{text-align:right;color:var(--ink);padding:3px 0;overflow-wrap:anywhere}
  .m td.num{white-space:nowrap}
  .tight{margin:0;padding-left:15px;font-size:12.5px;line-height:1.45}
  .tight li{margin:3px 0}
  .say{background:color-mix(in srgb,var(--hold) 8%,transparent);border-color:var(--hold)}
  .say h3{color:var(--hold)}
  .quote{margin:0;font-size:12.5px;line-height:1.5;color:var(--ink)}
  .moves{margin:9px 0 0;padding-left:15px;font-size:11.5px;color:var(--mut);line-height:1.4}
  .moves li{margin:2px 0}
  .ec{padding:6px 0;border-top:1px solid var(--line)}
  .ec:first-of-type{border-top:0;padding-top:0}
  .ecl{margin:0;font-size:12.5px;line-height:1.4;color:var(--ink)}
  .ecm{margin:2px 0 0;font:11.5px var(--mono);color:var(--ink);opacity:.85}
  .ecs{margin:4px 0 0;font-size:11px;color:var(--mut);display:flex;flex-wrap:wrap;gap:5px;align-items:center}
  .tt{font:10px var(--mono);padding:1px 5px;border-radius:3px;border:1px solid var(--line)}
  .t-own-experiment{color:var(--acc);border-color:currentColor}
  .t-published-standard,.t-published-study{color:var(--ok);border-color:currentColor}
  .t-principle{color:var(--hold);border-color:currentColor}
  .cf{margin-left:auto;font:10px var(--mono)}
  .c-high{color:var(--ok)} .c-medium{color:var(--hold)} .c-low{color:var(--no)}
  .lbl{font:600 10px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--mut);
    margin:0 0 4px}
  .sec .lbl+ul+.lbl{margin-top:8px}
  .tally{margin-left:auto;color:var(--ink);font-size:11px}
  .dims{width:100%;border-collapse:collapse;margin-top:9px;font-size:12px}
  .dims tr{border-top:1px solid var(--line)}
  .dims tr:first-child{border-top:0}
  .dims .dm{width:16px;font:600 13px/1 var(--mono);padding:4px 6px 4px 0;vertical-align:top}
  .dims th{text-align:left;font-weight:500;padding:4px 8px 4px 0;white-space:nowrap;vertical-align:top}
  .dims .dh{color:var(--mut);font-size:11.5px;line-height:1.35;padding:4px 0;vertical-align:top}
  .d-yes .dm{color:var(--ok)} .d-yes th{color:var(--ink)}
  .d-partial .dm{color:var(--hold)} .d-partial th{color:var(--ink)}
  .d-no .dm{color:var(--no)} .d-no th{color:var(--mut)}
  .yours{margin:0 0 8px;padding-left:9px;border-left:2px solid var(--no);font-size:12px;
    font-style:italic;color:var(--mut)}
  .craft{width:100%;border-collapse:collapse;font-size:12.5px}
  .craft tr{border-top:1px solid var(--line)}
  .craft tr:first-child{border-top:0}
  .craft th{text-align:left;font:600 10px/1.3 var(--mono);letter-spacing:.05em;text-transform:uppercase;
    color:var(--mut);padding:7px 9px 7px 0;white-space:nowrap;vertical-align:top;width:1%}
  .craft td{padding:7px 0;line-height:1.45;color:var(--ink);vertical-align:top}
  /* The row you already do well is dimmed; the ones you missed carry the weight. */
  .craft tr.d-yes th{color:var(--ok)}
  .craft tr.d-yes td{color:var(--mut)}
  .craft tr.d-partial th{color:var(--hold)}
  .gapcard{border-color:var(--no);background:color-mix(in srgb,var(--no) 8%,transparent)}
  .gapcard h3{color:var(--no)}
  /* History is not a task. Muted, not alarming. */
  .gapcard.historic{border-color:var(--line);background:transparent}
  .gapcard.historic h3{color:var(--mut)}
  .gapmsg{margin:0;font-size:12.5px;line-height:1.45}
  .gapcmd{margin:7px 0 0;font:11px var(--mono);color:var(--mut);overflow-wrap:anywhere}
  .hsum{margin:0;font:12px var(--mono);color:var(--mut)}
  .tally.bad{color:var(--no)}
  .practise{margin-top:10px;padding:9px 11px;border-radius:7px;background:var(--card);
    border:1px solid var(--acc)}
  .pl{font:600 9.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--acc)}
  .pi{margin:5px 0 0;font-size:14px;font-weight:500;line-height:1.35;color:var(--ink)}
  .pw{margin:4px 0 0;font:11px var(--mono);color:var(--mut);line-height:1.4}
  .miss{font-size:12px;color:var(--mut);margin:7px 0 0;line-height:1.45}
  .more{margin-top:8px}
  .more summary{padding:0;font:11px var(--mono);color:var(--mut);cursor:pointer;list-style:none}
  .more summary::-webkit-details-marker{display:none}
  .more summary:before{content:"+ ";color:var(--acc)}
  .more[open] summary:before{content:"- "}
  .more blockquote{margin:8px 0 0;padding-left:9px;border-left:2px solid var(--line);
    font-size:12px;font-style:italic;color:var(--ink)}
  .dim{font-size:12px;color:var(--mut);margin:6px 0 0;line-height:1.45}
  .dim b{color:var(--ink);font-weight:600}
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
  .chip{font:11px var(--mono);padding:2px 6px;border-radius:4px;border:1px solid var(--line);
    color:var(--mut);cursor:help}
  .chip.s-major{color:var(--hold)}
  .why{color:var(--mut);font-size:12.5px;margin:0}
  .lesson{font-size:12.5px;margin:9px 0 0;padding-left:9px;border-left:2px solid var(--acc)}
  .empty{color:var(--mut);font-size:12.5px}
  @media (max-width:820px){body{grid-template-columns:1fr;grid-template-rows:1fr auto}
    .panel{border-left:0;border-top:1px solid var(--line);max-height:45vh}}
</style></head><body>
<div class="grip" id="grip" title="drag to resize the panel" aria-hidden="true"></div>
<div class="stage">
  <div class="bar">
    <label class="ctl"><span class="sr">prototype</span>
      <select id="tg-file" title="switch prototype">${siblings.map((f) => {
        const wb = `workbench-${path.basename(f).replace(/\.html?$/i, '')}.html`;
        const built = fs.existsSync(wb);
        // Label by the prototype's own <title>, not its filename, so you recognise it by name
        // ("CI for design taste") not "workflow-explainer.html". Falls back to the filename.
        let label = f;
        try { const t = fs.readFileSync(f, 'utf8').match(/<title>([^<]+)<\/title>/i); if (t) label = t[1].trim(); } catch {}
        return `<option value="${esc(wb)}"${f === target ? ' selected' : ''}${built || f === target ? '' : ' disabled'} title="${esc(f)}">${esc(label)}${built || f === target ? '' : ': no workbench yet'}</option>`;
      }).join('')}</select>
    </label>
    <label class="ctl"><span class="sr">state</span>
      <select id="st" title="jump to a state">${stateOpts}</select>
    </label>
    <span class="sp">
      <button type="button" id="sz" title="phone / desktop" aria-label="toggle phone or desktop width" aria-pressed="false">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 20h8"/></svg>
      </button>
      <button type="button" id="th" title="light / dark" aria-label="toggle light or dark theme">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none"/></svg>
      </button>
      <button type="button" id="rl" title="reload the frame" aria-label="reload">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round"><path d="M20 11a8 8 0 1 0-2.3 6.3"/><path d="M20 5v6h-6"/></svg>
      </button>
      <button type="button" id="tg" title="show / hide panel" aria-label="toggle panel" aria-pressed="true">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>
      </button>
    </span>
  </div>
  <div class="frame"><iframe id="fr" src="${esc(frameSrc)}" title="${esc(target)}. Live"></iframe></div>
</div>
<aside class="panel">
  <div class="ph"><h2>history · ${steps.length} run${steps.length === 1 ? '' : 's'}</h2></div>
  <div class="pb">${rows || '<p class="empty">No runs logged for this file yet. Run the gate with <code>--log --shots</code>.</p>'}</div>
</aside>
<script>
document.querySelectorAll('[data-cmp]').forEach(function(c){
  var btn=c.querySelector('.flip'), lbl=c.querySelector('[data-lbl]');
  var a=c.querySelector('img.a').alt, b=c.querySelector('img.b').alt;
  function set(showA){
    c.classList.toggle('show-a',showA);
    lbl.textContent = showA ? ('#'+a+'. Previous') : ('#'+b+' — this run');
    btn.setAttribute('aria-pressed', showA?'true':'false');
  }
  btn.addEventListener('click',function(e){ e.stopPropagation(); set(!c.classList.contains('show-a')); });
  var stack=c.querySelector('.stack');
  function zoom(on){
    c.classList.toggle('zoom',on);
    document.body.style.overflow = on ? 'hidden' : '';
    if(on) c.dataset.hot='1';
  }
  stack.addEventListener('click',function(){ zoom(!c.classList.contains('zoom')); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&c.classList.contains('zoom')) zoom(false);
  });
  c.addEventListener('mouseenter',function(){ c.dataset.hot='1'; });
  c.addEventListener('mouseleave',function(){ delete c.dataset.hot; set(false); });
  document.addEventListener('keydown',function(e){
    if((e.key==='b'||e.key==='B') && !e.repeat && (c.dataset.hot||document.activeElement===btn)) set(true);
  });
  document.addEventListener('keyup',function(e){ if(e.key==='b'||e.key==='B') set(false); });
});
var rs=document.querySelectorAll('details.run');
rs.forEach(function(d){ d.addEventListener('toggle',function(){
  if(d.open) rs.forEach(function(o){ if(o!==d) o.open=false; });
});});
var fr=document.getElementById('fr'), base=fr.getAttribute('src').split('?')[0];
// State selection navigates the frame rather than reaching into it: a file:// iframe has an
// opaque origin, so cross-document scripting would fail. A query param works either way.
document.getElementById('st').addEventListener('change',function(e){
  fr.src = e.target.value ? base+'?state='+encodeURIComponent(e.target.value) : base;
});
var phone=false;
document.getElementById('sz').addEventListener('click',function(e){
  phone=!phone; fr.className = phone ? 'w375' : '';
  e.currentTarget.setAttribute('aria-pressed', phone?'true':'false');
});
// Theme toggle drives the WORKBENCH chrome. The prototype has no dark theme yet, so the
// frame will not follow. That gap is real and design.md still requires both.
var root=document.documentElement;
var saved=localStorage.getItem('wb-theme');
if(saved) root.setAttribute('data-theme',saved);
document.getElementById('th').addEventListener('click',function(){
  var now = root.getAttribute('data-theme')==='dark' ? 'light' : 'dark';
  root.setAttribute('data-theme',now); localStorage.setItem('wb-theme',now);
});
document.getElementById('tg-file').addEventListener('change',function(e){
  if (e.target.value) location.href = e.target.value;
});
document.getElementById('rl').addEventListener('click',function(){ fr.src=fr.src; });
document.getElementById('tg').addEventListener('click',function(e){
  var hid=document.body.classList.toggle('collapsed');
  e.currentTarget.setAttribute('aria-pressed', hid?'false':'true');
});
// draggable panel: restore saved width, then drag the grip to resize (clamped, persisted)
var sw=localStorage.getItem('wb-w'); if(sw) document.body.style.setProperty('--w',sw);
(function(){
  var g=document.getElementById('grip'), on=false;
  if(!g) return;
  g.addEventListener('pointerdown',function(e){on=true;g.classList.add('drag');g.setPointerCapture(e.pointerId);e.preventDefault();});
  g.addEventListener('pointermove',function(e){ if(!on)return; var w=Math.min(720,Math.max(260,window.innerWidth-e.clientX)); document.body.style.setProperty('--w',w+'px'); });
  function end(){ if(!on)return; on=false; g.classList.remove('drag'); localStorage.setItem('wb-w',document.body.style.getPropertyValue('--w')); }
  g.addEventListener('pointerup',end); g.addEventListener('pointercancel',end);
  g.addEventListener('dblclick',function(){ document.body.style.setProperty('--w','380px'); localStorage.setItem('wb-w','380px'); });
})();
</script>
</body></html>`;

// CF-064 detector: join runs against teaching on run id and report every gap. This runs
// as part of rendering so the check cannot be forgotten the way the manual step was.
const untaught = steps.filter((x) => x.run.id && !x.teach).map((x) => x.run.id);
if (untaught.length) {
  console.log(`  ⚠  ${untaught.length} run(s) have NO teaching record. Rendered as a gap, not as prose:`);
  for (const id of untaught) console.log(`       node checks/log-teach.mjs ${id} --json '{...}'`);
}

fs.writeFileSync(outFile, html);

// Stable entry point. Moving to per-prototype filenames silently broke the bookmark that
// pointed at design-workbench.html — the old path was deleted and nothing said so. A rename
// that leaves no forwarding address is a broken link you handed someone yourself.
// This index is that address: one URL that never changes, listing whatever exists.
const built = fs.readdirSync('.').filter((f) => /^workbench-.+\.html$/.test(f)).sort();
const single = built.length === 1;
fs.writeFileSync('design-workbench.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>workbench · index</title>
${single ? `<meta http-equiv="refresh" content="0; url=${built[0]}">` : ''}
<style>
  :root{--bg:#fbfbfa;--card:#fff;--ink:#161a19;--mut:#6b7472;--line:#e4e8e6;--acc:#0f6b5c}
  @media (prefers-color-scheme:dark){:root{--bg:#0e1211;--card:#161b1a;--ink:#e9edeb;--mut:#8b9794;--line:#232b29;--acc:#4ecdb0}}
  body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 ui-sans-serif,system-ui,sans-serif;padding:44px 20px}
  .w{max-width:620px;margin:0 auto}
  h1{font-size:19px;font-weight:600;margin:0 0 4px}
  p{color:var(--mut);font-size:13.5px;margin:0 0 22px}
  a{display:flex;justify-content:space-between;gap:12px;padding:13px 15px;background:var(--card);
    border:1px solid var(--line);border-radius:10px;margin-bottom:8px;text-decoration:none;color:var(--ink)}
  a:hover,a:focus-visible{border-color:var(--acc);outline:none}
  span{color:var(--mut);font:12px ui-monospace,SFMono-Regular,Menlo,monospace}
</style></head><body><div class="w">
<h1>workbench</h1>
<p>${single ? 'Redirecting…' : 'One workbench per prototype.'} This URL is stable. The per-prototype files are not.</p>
${built.map((f) => `<a href="${f}"><b>${f.replace(/^workbench-|\.html$/g, '')}</b><span>${f}</span></a>`).join('\n')}
</div></body></html>`);
console.log(`  ${outFile}: ${target} + ${steps.length} run(s) in the panel`);
if (state.linked) console.log(`  ${state.linked} screenshot(s) linked, not embedded. Open from the project dir`);
console.log(`  open: file://${path.resolve(outFile)}`);
if (siblings.length > 1) console.log(`  ${siblings.length} prototypes discoverable from the nav dropdown`);

// ── auto-sync every other switcher ────────────────────────────────────────────
// The prototype dropdown bakes its sibling list at render time, so rendering one used to
// freeze the others' switchers. Re-render each OTHER built workbench once so their dropdowns
// pick up this prototype. WB_NOSYNC guards against the re-renders re-triggering each other.
if (!process.env.WB_NOSYNC) {
  for (const f of siblings) {
    if (f === target) continue;
    const wbf = `workbench-${path.basename(f).replace(/\.html?$/i, '')}.html`;
    if (!fs.existsSync(wbf)) continue;
    spawnSync(process.execPath, [new URL(import.meta.url).pathname, f],
      { env: { ...process.env, WB_NOSYNC: '1' }, stdio: 'ignore' });
  }
}

// ── verify what was just rendered ─────────────────────────────────────────────
// Asked for explicitly: "wire verify-render into the runbook's publish step so it runs after
// every render rather than when someone remembers." It never landed; only a comment upstream
// mentioned it. This IS the publish step, so the check belongs at the end of it.
//
// A renderer that checks its own output is not self-grading: verify-render asks structural
// questions (did each checker run, does the card match the prescribed shape) that have
// answers independent of what this file believes it produced. It caught the gap-card logic
// silently reverting on its very first run.
if (!process.env.WB_NOSYNC) {
  const vr = path.join(path.dirname(new URL(import.meta.url).pathname), 'verify-render.mjs');
  // Verify THIS target's workbench (not the default prototype), and propagate the exit code:
  // a render that drops the nav bar or control panel must fail the render, not merely print a
  // warning. That is what makes the shell durable, and what lets prove-durable catch a revert
  // of this file by re-rendering.
  const r = spawnSync(process.execPath, [vr, '--target', target], { encoding: 'utf8', timeout: 60_000 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  if (r.status === null) {
    console.log(`\n  verify-render did not finish in 60s. The render is UNVERIFIED.`);
    process.exitCode = 1;
  } else {
    for (const l of out.split('\n')) {
      if (/^\s{2,4}(PASS|FAIL)\s/.test(l) || /^\s+(CHROME|COVERAGE|FORMAT|TASKS):/.test(l)) console.log(`  ${l.trim()}`);
    }
    // Fail the render ONLY on a missing shell (CHROME): the nav bar and control panel are what
    // every render must guarantee. COVERAGE gaps and untaught gap cards are a backlog, not a
    // broken render, so they report without failing.
    if (/CHROME:[\s\S]*?FAIL\s+\d+ missing/.test(out)) {
      console.log(`  ^ render dropped part of the workbench shell. node checks/verify-render.mjs --target ${target}`);
      process.exitCode = 1;
    }
  }
}
