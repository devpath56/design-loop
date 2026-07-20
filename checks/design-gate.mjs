// design-gate — the DETERMINISTIC checker for the /design-loop.
// No taste, no LLM judgment: axe-core (a11y/contrast) + no-overflow + no-console-errors.
// Binary PASS/FAIL with the SPECIFIC failing check named. Exit 0 = pass, 1 = fail.
//
// Usage:  node checks/design-gate.mjs <path-to.html> [--log] [--note "..."] [--why "..."]
//   --log   append one row to design-runs.jsonl (EVERY run, pass or fail — failures are the
//           informative ones and must not be silently dropped)
//   --note  WHAT this run changed
//   --craft <json>  craft-evals output for this run, so the measurements land in the ledger
//           instead of scrolling past. A number that is not stored cannot be compared, and a
//           check whose history is not comparable cannot catch a regression.
//   --why   WHY — the rationale, and what was considered and rejected. This is the difference
//           between an outcome log and a decision log; without it you cannot reconstruct
//           reasoning weeks later, only results.
//
// Prints the run id on --log. Pass it to log-audit.mjs so the structural findings attach
// to this exact run.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Small explicit parser — the previous indexOf-based one mis-resolved any flag value
// that repeated an earlier token.
const argv = process.argv.slice(2);
const flags = { log: false, note: '', why: '', shots: false, craft: '', states: '' };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--log') flags.log = true;
  else if (a === '--shots') flags.shots = true;
  else if (a === '--note') flags.note = argv[++i] ?? '';
  else if (a === '--why') flags.why = argv[++i] ?? '';
  else if (a === '--craft') flags.craft = argv[++i] ?? '';
  else if (a === '--states') flags.states = argv[++i] ?? '';
  else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
  else positional.push(a);
}
const target = positional[0];
const { log: shouldLog, note, why, shots } = flags;

// ── craft-evals RUNS ITSELF ───────────────────────────────────────────────────
// Same disease as the state matrix, same cure. `--craft <json>` required running a separate
// command and pasting its output back, so across 7 runs it happened on 3. verify-render
// reported NEVER RAN for the other 4 and nothing acted on the report.
// It writes to stdout with --json, so read stdout rather than a file.
let craft = flags.craft;
if (!craft && target && fs.existsSync(target)) {
  const ce = path.join(path.dirname(new URL(import.meta.url).pathname), 'craft-evals.mjs');
  // 120s: craft-evals drives a browser and this file has an animated background, which is
  // what made it stall at 138s once before.
  const r = spawnSync(process.execPath, [ce, target, '--json'], { encoding: 'utf8', timeout: 120_000 });
  if (r.status === null) {
    console.error(`  craft-evals did not finish in 120s. Reported as not-run, never as a pass.`);
  } else if (r.stdout?.trim()) {
    craft = r.stdout.trim();
    try {
      const res = JSON.parse(craft).results ?? [];
      const bad = res.filter((c) => c.verdict !== 'PASS');
      console.log(`  craft   ${res.length - bad.length}/${res.length} checks pass` +
        (bad.length ? `  failing: ${bad.slice(0, 4).map((c) => c.id).join(', ')}${bad.length > 4 ? ` +${bad.length - 4}` : ''}` : ''));
    } catch { /* shape changed: the ledger still gets the raw JSON */ }
  } else {
    console.error(`  craft-evals produced no output (exit ${r.status}). Craft NOT checked this run.`);
  }
}

// ── the state matrix RUNS ITSELF ──────────────────────────────────────────────
// `--states <json>` was an opt-in flag carrying data a separate command had to produce
// first: run `npm run states`, find the output, pass it back here. Three ordered manual
// steps from memory, so across 7 runs it happened zero times, while every one of those runs
// showed a green gate. verify-render reported "NEVER RAN" the whole time and nothing acted
// on it, because detection after the fact does not make anything happen.
//
// So the gate invokes the checker instead of accepting its output. --states still works for
// a caller that already has the JSON (the workbench replays old runs this way), but its
// absence no longer means the check was skipped, only that it had not been run YET.
let states = flags.states;
if (!states && target && fs.existsSync(target)) {
  const sm = path.join(path.dirname(new URL(import.meta.url).pathname), 'state-matrix.mjs');
  const OUT = '.state-matrix.json';
  // Stamp the mtime so a stale file from an earlier target cannot be mistaken for this run's
  // result. state-matrix exits 1 when a state is undrawn, which is a real finding and not a
  // harness error, so the file is what we read, not the exit code.
  const before = fs.existsSync(OUT) ? fs.statSync(OUT).mtimeMs : 0;
  const r = spawnSync(process.execPath, [sm, target], { encoding: 'utf8', timeout: 90_000 });
  const fresh = fs.existsSync(OUT) && fs.statSync(OUT).mtimeMs > before;
  if (r.status === null) {
    console.error(`  state-matrix did not finish in 90s. Reported as not-run, never as a pass.`);
  } else if (fresh) {
    states = fs.readFileSync(OUT, 'utf8');
    // Print it. Previously this data went only into the ledger row under --log, so a run
    // without --log checked the states and showed you nothing, which is indistinguishable
    // from not checking them.
    try {
      const rows = JSON.parse(states).rows ?? [];
      // The row shape is {state, present, pass, detail}. My first pass read `verdict`, a
      // field that does not exist, so every row counted as failing and the summary printed
      // 0/4 while the checker itself reported 3/4. A summary that reads its input wrongly
      // is worse than no summary: it is confidently wrong in the direction of alarm.
      const bad = rows.filter((s) => !s.pass);
      console.log(`\n  states  ${rows.length - bad.length}/${rows.length} drawn` +
        (bad.length ? `  undrawn: ${bad.map((s) => s.state).join(', ')}` : ''));
    } catch { /* shape changed: the ledger still gets the raw JSON */ }
  } else {
    // Fail loudly rather than silently continuing with no state data: a missing matrix that
    // reads as "no state problems" is the vacuous pass this whole file exists to avoid.
    console.error(`  state-matrix produced no output (exit ${r.status}). States NOT checked this run.`);
    if (r.stderr?.trim()) console.error(`    ${r.stderr.trim().split('\n').slice(-2).join(' ')}`);
  }
}

// The run id must exist before the browser opens so screenshots can be filed under it.
const runTs = new Date().toISOString();
const runId = 'r' + crypto.createHash('sha1').update(runTs + (positional[0] ?? '')).digest('hex').slice(0, 8);
const shotDir = path.join('runs', runId);

if (!target || !fs.existsSync(target)) {
  console.error('usage: node checks/design-gate.mjs <path-to.html> [--log] [--note "..."] [--why "..."]');
  process.exit(2);
}
const url = pathToFileURL(path.resolve(target)).href;

// ONE CHANGE PER RUN (runbook step 1). A note joining two changes means the diff, the
// audit, the lesson and the revert all cover both, so neither is separable afterwards.
// Detected on the note, not the diff: only the author knows whether two edits are one
// change or two, and a semicolon between clauses is the reliable tell that they are two.
if (note.trim()) {
  const clauses = note.split(/;|\band\b/i).map((c) => c.trim()).filter((c) => c.length > 8);
  if (clauses.length > 1) {
    console.log(`  ⚠  BUNDLED RUN: this note describes ${clauses.length} changes:`);
    for (const c of clauses) console.log(`       · ${c}`);
    console.log(`     one change per run: the diff, audit, lesson and revert all cover both otherwise\n`);
  }
}


const results = [];
const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 140)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 140)); });

  await page.goto(url, { waitUntil: 'networkidle' });

  // 1+2. Per width: accessibility (axe-core) AND no horizontal overflow.
  // axe MUST run at each width — contrast and naming issues can be mobile-only, and a
  // desktop-only axe pass silently green-lights them.
  for (const w of [375, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });

    // axe ships several WCAG rules DISABLED by default — target-size (SC 2.5.8, AA) among
    // them — so a stock AxeBuilder run silently never checks them. Enable explicitly.
    const axe = await new AxeBuilder({ page })
      .options({ rules: { 'target-size': { enabled: true }, 'duplicate-id': { enabled: true } } })
      .analyze();

    const bad = (list) => list.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const serious = bad(axe.violations);
    results.push({
      name: `a11y: axe-core @${w}px (contrast, labels, names, roles, target-size)`,
      pass: serious.length === 0,
      detail: serious.length
        ? serious.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}`).join('; ')
        : 'no serious/critical violations',
    });

    // axe returns `incomplete` when it CANNOT DECIDE — text over a gradient, an image, or a
    // semi-transparent layer are the common cases. Reading only `violations` records
    // "couldn't check" as "passed", which is a silent false negative: three known blind
    // spots in this repo's own fixture set were exactly this. Fail closed instead — an
    // abstention is a question for a human, never a pass.
    const abstained = bad(axe.incomplete);
    results.push({
      name: `a11y: axe could not decide @${w}px (needs human review)`,
      pass: abstained.length === 0,
      detail: abstained.length
        ? abstained.map((v) => `${v.id} [${v.impact}] ×${v.nodes.length}: verify by eye`).join('; ')
        : 'nothing abstained',
    });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    results.push({ name: `layout: no horizontal overflow @${w}px`, pass: !overflow, detail: overflow ? 'body scrolls sideways' : 'ok' });

    // Visual record. A DESIGN loop that logs only text cannot show you the thing it changed —
    // "contrast 4.6:1" tells you it is legal, never whether it looks right.
    if (shots) {
      fs.mkdirSync(shotDir, { recursive: true });
      // Viewport, not fullPage: this is what a person actually sees. fullPage on a
      // vertically-centred layout produces a tall image that crops to empty space.
      await page.screenshot({ path: path.join(shotDir, `${w}.png`), fullPage: false });
    }
  }

  // 3. No console / page errors on load.
  results.push({
    name: 'runtime: no console/page errors',
    pass: consoleErrors.length === 0,
    detail: consoleErrors.length ? [...new Set(consoleErrors)].slice(0, 3).join(' | ') : 'clean',
  });

  // 4. No spaced em/en dash in the artifact's own copy. Asked for repeatedly and never gated
  //    at the artifact level, so an em dash in the <title> shipped with GATE: PASS. Read the
  //    RENDERED text (title + visible text nodes), not the source, so HTML comments and code
  //    do not register and quoted UI copy still does.
  const slop = await page.evaluate(() => {
    const hits = [];
    const t = document.title || '';
    if (/\s[—–]\s/.test(t)) hits.push(`title: ${t.trim().slice(0, 40)}`);
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const p = n.parentElement;
      if (p && /^(SCRIPT|STYLE)$/.test(p.tagName)) continue;
      if (/\s[—–]\s/.test(n.textContent)) hits.push(n.textContent.trim().slice(0, 40));
    }
    return [...new Set(hits)];
  });
  results.push({
    name: 'copy: no spaced em/en dash',
    pass: slop.length === 0,
    detail: slop.length ? slop.slice(0, 3).join(' | ') : 'clean',
  });

  await ctx.close();
} finally {
  await browser.close();
}

let ok = true;
console.log(`\n  design-gate · ${target}`);
for (const r of results) {
  console.log(`    ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
  ok = ok && r.pass;
}
console.log(`\n  GATE: ${ok ? 'PASS ✅' : 'FAIL ❌  (fix the named check, do not wave it through)'}`);
// A PASS that implies conformance is a claim this gate cannot support. State the ceiling.
console.log(`  coverage: automated rules catch a SUBSET of issues. ~57% by issue volume`);
console.log(`            (Deque, vendor-reported) or ~20-30% of WCAG success criteria.`);
console.log(`            PASS is not a conformance claim. Composition, content and flow are unchecked.\n`);

// Append the machine-readable run row. Deterministic fields only — the agent's
// half (hallmark gates, lesson) is merged in by render-log.mjs from design-lessons.jsonl.
if (shouldLog) {
  const ts = runTs;
  // Stable run id — everything else (audit findings, lessons, screenshots) joins on this
  // rather than on matching free text, which collided whenever two runs shared a target and a day.
  const id = runId;
  // Snapshot the artifact itself. Without this, replay is impossible: the prose note says
  // WHAT changed but the code is gone, and this is not a git repo so nothing else keeps it.
  // Cheap (a text file) so it happens on every logged run, not just --shots runs.
  fs.mkdirSync(shotDir, { recursive: true });
  const snapPath = path.join(shotDir, 'snapshot.html');
  fs.copyFileSync(target, snapPath);

  // NARRATED != EXECUTED (Trident house-rule 3). A run that claims a change in --note but
  // whose artifact is byte-identical to the previous run of the same target did not happen.
  // This is not hypothetical: a copy removal was requested, the command that would have made
  // AND verified it died together, and the next four checks all passed because none of them
  // look at whether the requested change actually landed.
  //
  // The gate checks properties of the artifact. This checks that the artifact MOVED.
  let unchanged = false, priorId = 'the previous one';
  try {
    const prior = fs.readFileSync('design-runs.jsonl', 'utf8').split('\n').filter(Boolean)
      .map((l) => JSON.parse(l)).reverse().find((r) => r.target === target && r.snapshot);
    if (prior && fs.existsSync(prior.snapshot)) {
      priorId = prior.id ?? priorId;
      unchanged = fs.readFileSync(prior.snapshot, 'utf8') === fs.readFileSync(target, 'utf8');
    }
  } catch {}
  if (unchanged && note.trim()) {
    console.log(`  ⚠  NOTHING CHANGED: this file is byte-identical to run ${priorId}`);
    console.log(`     but --note claims: "${note}"`);
    console.log(`     a claimed change with an empty diff did not happen (house-rule 3)\n`);
  }

  const row = {
    id,
    ts,
    target,
    snapshot: snapPath,
    shots: shots ? { dir: shotDir, widths: [375, 1280] } : null,
    note,
    why,
    craft: craft ? (() => { try { return JSON.parse(craft).results ?? null; } catch { return null; } })() : null,
    // Stored per run for the same reason as craft: .state-matrix.json is overwritten on every
    // invocation, so without this a run's state coverage is unknowable an hour later.
    states: states ? (() => { try { return JSON.parse(states).rows ?? null; } catch { return null; } })() : null,
    gate: ok ? 'PASS' : 'FAIL',
    // No `audited` flag here on purpose. log-audit writes design-audits.jsonl and never
    // touches this row, so a flag written here would stay false forever and misreport every
    // audited run. verify-render already derives audit coverage by JOINING the two files,
    // which cannot go stale because there is only one copy of the fact.
    unchanged: unchanged || undefined,
    failed: results.filter((r) => !r.pass).map((r) => ({ check: r.name, detail: r.detail })),
    checks: results.map((r) => ({ name: r.name, pass: r.pass })),
  };
  fs.appendFileSync('design-runs.jsonl', JSON.stringify(row) + '\n');
  console.log(`  logged → design-runs.jsonl  run id: ${id}  (${row.gate})`);
  if (!why) console.log('  ⚠  no --why given. This is an outcome log, not a decision log');

  // ── PROGRESSION: is this loop measurably BETTER than the last, not just not-broken? ──
  // Everything above answers "did we break anything". craft-delta answers "is it better": it diffs
  // this run's craft measurements against the previous run of the same target and holds a forward-
  // only ratchet (craft FAILs may not rise). A green loop that quietly flattened the hierarchy or
  // slowed the motion is caught HERE. Non-blocking in the gate (a scoreboard, like Trident's impact
  // ratchet); `node checks/craft-delta.mjs <file> --strict` enforces it in CI.
  if (craft) {
    try {
      const cjson = path.join(shotDir, 'craft.json');
      fs.writeFileSync(cjson, craft);
      const cd = path.join(path.dirname(new URL(import.meta.url).pathname), 'craft-delta.mjs');
      const out = spawnSync(process.execPath, [cd, target, id, '--from', cjson], { encoding: 'utf8' });
      process.stdout.write(out.stdout || '');
    } catch {}
  }

  // ── the run is INCOMPLETE until a cold audit attaches ────────────────────────
  // The audit needs a subagent, so this file cannot run it the way it now runs craft-evals
  // and state-matrix. What it CAN do is refuse to call the run finished. Previously the last
  // line printed a suggested next command, and a suggestion is a written reminder: the cold
  // audit is missing on 4 of 7 runs, every one of which printed that suggestion.
  //
  // So the run's own record says so. `audited: false` is written into the row, which makes
  // the absence a value in the ledger rather than the absence of a value, and verify-render
  // already reads it. An unaudited run is not a clean run; it is an unfinished one.
  const brief = path.join(path.dirname(new URL(import.meta.url).pathname), 'audit-brief.mjs');
  console.log(`\n  ⚠  RUN INCOMPLETE: no cold audit attached to ${id}`);
  console.log(`     The gate is deterministic and structural. It cannot see whether the`);
  console.log(`     copy is honest, the hierarchy earns its emphasis, or a state is missing.`);
  console.log(`       1  node checks/audit-brief.mjs ${id}      compose the auditor's prompt`);
  console.log(`       2  run it in a COLD subagent (not this session, not this model)`);
  console.log(`       3  node checks/log-audit.mjs ${id} --json '[...]'   (or --clean)`);
  if (!fs.existsSync(brief)) console.log(`     (audit-brief.mjs is missing: step 1 will fail)`);
  console.log('');
}

process.exit(ok ? 0 : 1);
