// render-log — turns the three logs into design-log.md, the DECISION TABLE.
// Pure projection of:
//   design-runs.jsonl    deterministic gate results   (written by design-gate)
//   design-audits.jsonl  structural slop findings     (written by log-audit)
//   design-lessons.jsonl lessons learned              (written by the loop on PASS)
// All three join on the run id. Regenerable at any time — never hand-edit design-log.md.
//
// Usage:  node checks/render-log.mjs
import fs from 'node:fs';

const readJsonl = (f) =>
  fs.existsSync(f)
    ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).flatMap((l) => {
        try { return [JSON.parse(l)]; } catch { console.warn(`  skipped unparseable line in ${f}`); return []; }
      })
    : [];

const runs = readJsonl('design-runs.jsonl');
const audits = readJsonl('design-audits.jsonl');
const lessons = readJsonl('design-lessons.jsonl').filter((l) => l.target !== 'seed');

if (!runs.length) {
  console.error('no runs yet: run: npm run design-gate -- <file.html> --log');
  process.exit(1);
}

// Join on run id. Legacy rows predating ids fall back to matching the change text,
// which is why --note and the lesson's "change" had to agree verbatim.
const auditFor = (r) => (r.id ? audits.find((a) => a.runId === r.id) : undefined);
const lessonFor = (r) => {
  if (r.gate !== 'PASS') return undefined;
  if (r.id) { const byId = lessons.find((l) => l.runId === r.id); if (byId) return byId; }
  return r.note ? lessons.find((l) => l.target === r.target && l.change === r.note) : undefined;
};

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const dash = (s) => (s && String(s).trim() ? s : '—');

// The three checker states must stay visually distinct: never run ≠ ran and found nothing.
const slopCell = (a) => {
  if (!a) return '⚠️ not audited';
  if (!a.findings.length) return 'clean';
  const c = a.findings.filter((x) => x.severity === 'critical').length;
  const m = a.findings.filter((x) => x.severity === 'major').length;
  return [c && `**${c} critical**`, m && `${m} major`, `${a.findings.length} total`].filter(Boolean).join(' · ');
};

// The LOOP's verdict is both checkers, not just the deterministic one: a critical slop gate
// blocks even when axe is green. Reporting design-gate's verdict alone let a run with a
// critical structural finding read as PASS ✅ — exactly the "confident slop" failure.
const verdictOf = (r, a) => {
  const crit = (a?.findings ?? []).filter((x) => x.severity === 'critical' && !x.disputed).length;
  if (r.gate !== 'PASS') return { label: '**FAIL** ❌', blocked: true };
  if (crit) return { label: '**BLOCKED** ⛔', blocked: true };
  return { label: '**PASS** ✅', blocked: false };
};

const rows = runs.map((r, i) => {
  const a = auditFor(r);
  const lesson = lessonFor(r);
  const v = verdictOf(r, a);
  const why = r.gate === 'PASS'
    ? (v.blocked ? 'axe green, blocked on critical slop gate' : 'all green')
    : r.failed.map((f) => f.detail).join('; ');
  return `| [#${i + 1}](#run-${i + 1}) | ${r.ts.slice(0, 16).replace('T', ' ')} | \`${esc(r.target)}\` | ${esc(trunc(dash(r.note), 44))} | ${v.label} | ${esc(trunc(why, 46))} | ${slopCell(a)} | ${lesson ? esc(trunc(lesson.lesson, 46)) : (v.blocked ? '—' : '⚠️ none logged')} |`;
});

const header = ['Run', 'When (UTC)', 'Target', 'Change', 'Verdict', 'Failing checks', 'Slop gates', 'Lesson'];
const table = [
  `| ${header.join(' | ')} |`,
  `|${header.map(() => '---').join('|')}|`,
  ...rows,
].join('\n');

// Per-run detail — the rationale and full findings that don't survive truncation in a table.
const detail = runs.map((r, i) => {
  const a = auditFor(r);
  const lesson = lessonFor(r);
  const parts = [
    `### Run #${i + 1}. ${verdictOf(r, a).label.replace(/\*\*/g, '')}`,
    `<!-- deterministic gate: ${r.gate} -->`,
    `<a id="run-${i + 1}"></a>`,
    ``,
    `- **When** ${r.ts.slice(0, 16).replace('T', ' ')} UTC${r.id ? ` · \`${r.id}\`` : ''}`,
    `- **Target** \`${r.target}\``,
    `- **Changed** ${dash(r.note)}`,
    `- **Why** ${r.why && r.why.trim() ? r.why : '⚠️ _no rationale recorded. Outcome logged, decision lost_'}`,
  ];
  if (r.failed?.length) {
    parts.push(`- **Failing checks**`);
    for (const f of r.failed) parts.push(`  - \`${f.check}\` → ${f.detail}`);
  }
  if (!a) parts.push(`- **Structural audit** ⚠️ not run. The anti-slop half of the checker left no record`);
  else if (!a.findings.length) parts.push(`- **Structural audit** ran, clean`);
  else {
    parts.push(`- **Structural audit**`);
    for (const x of a.findings) parts.push(`  - **${x.severity}** · ${x.gate}${x.where ? ` (${x.where})` : ''}${x.fix ? ` — fix: ${x.fix}` : ''}`);
  }
  if (lesson) parts.push(`- **Lesson** ${lesson.lesson}`);
  return parts.join('\n');
}).join('\n\n');

const passed = runs.filter((r) => !verdictOf(r, auditFor(r)).blocked).length;

// Repeat offenders across BOTH checkers — deterministic rules and named slop gates.
const tally = {};
for (const r of runs) {
  for (const f of r.failed ?? []) tally[f.check] = (tally[f.check] ?? 0) + 1;
  const a = auditFor(r);
  for (const x of a?.findings ?? []) tally[`slop: ${x.gate}`] = (tally[`slop: ${x.gate}`] ?? 0) + 1;
}
const repeat = Object.entries(tally).sort((a, b) => b[1] - a[1]);

const noWhy = runs.filter((r) => !r.why || !r.why.trim()).length;
const noAudit = runs.filter((r) => !auditFor(r)).length;

const out = `# design-log: decision table

> Generated by \`npm run design-log\` from \`design-runs.jsonl\` + \`design-audits.jsonl\` + \`design-lessons.jsonl\`.
> **Do not hand-edit**: regenerate it.

**${runs.length} run${runs.length === 1 ? '' : 's'} · ${passed} passed · ${runs.length - passed} failed**
${noWhy || noAudit ? `\n> ⚠️ **Log gaps:** ${[noWhy && `${noWhy} run(s) recorded no rationale (\`--why\`)`, noAudit && `${noAudit} run(s) never ran the structural audit`].filter(Boolean).join(' · ')}\n` : ''}
${table}

## Repeat offenders
${repeat.length
  ? repeat.map(([check, n]) => `- **${n}×** — ${check}`).join('\n')
  : '_None: no check has ever failed._'}

## Run detail

${detail}

## How to read this
- **Verdict** is **both** checkers. \`FAIL ❌\` = the deterministic gate failed. \`BLOCKED ⛔\` = axe was
  green but the structural audit found a **critical** slop gate. Only \`PASS ✅\` ships.
- **Failing checks** names the specific axe rule, so a FAIL is actionable rather than a vibe.
- **Slop gates** is the structural checker. \`⚠️ not audited\` and \`clean\` are **different**: a checker
  that never ran must never read as one that passed.
- **Why** is the decision, not the outcome. A run with no rationale is a result you cannot re-derive later.
- A PASS with **⚠️ none logged** means the loop skipped its LEARN step. The artifact improved but
  taught you nothing.
- **Repeat offenders** is the real signal: a check failing across many runs means \`design.md\` is not
  yet opinionated enough to prevent it.
`;

fs.writeFileSync('design-log.md', out);
console.log(`  design-log.md written: ${runs.length} run(s), ${passed} passed, ${runs.length - passed} failed`);
if (repeat.length) console.log(`  top repeat offender: ${repeat[0][1]}× ${repeat[0][0]}`);
if (noWhy) console.log(`  ⚠  ${noWhy} run(s) missing --why (outcome logged, decision lost)`);
if (noAudit) console.log(`  ⚠  ${noAudit} run(s) never audited`);
