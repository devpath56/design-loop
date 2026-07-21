// audit-brief — runs every DETERMINISTIC checker, then prints the cold-audit prompt with
// their results already embedded.
//
// The point is subtraction. The cold auditor is the most expensive checker in the loop and
// the only one that can judge composition, so every finding it spends on something a script
// already measured is judgement wasted. In the last audit, 3 of 10 findings — missing
// interactive states, input border contrast, text-wrap:balance — were machine-detectable.
//
// House-rule 1 orders the tiers: deterministic root-cause > deterministic detection >
// LLM-judge > written reminder. This does not move checks UP into the judge; it hands the
// judge what the lower tiers already know so it starts where they stop.
//
// IT DOES NOT MARK THEM SETTLED. An earlier draft told the auditor to treat every measured
// result as fact and keep off those categories entirely. That would have removed the only
// independent check on the evaluator — and it is not hypothetical: craft-evals reported
// "focus is visibly indicated: PASS" when the page authored zero :focus rules and was
// coasting on the browser default. The auditor's "missing interactive states" finding is
// what exposed it. A brief written the naive way would have suppressed exactly that finding.
//
// So: don't RE-DERIVE a measurement, but DO challenge one. And run --blind periodically,
// with no brief at all, as the control that catches evaluator drift.
//
// Usage:  node checks/audit-brief.mjs <file.html> [--url http://localhost:8000/x.html]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const urlIdx = argv.indexOf('--url');
const url = urlIdx !== -1 ? argv[urlIdx + 1] : null;
const target = argv.find((a) => !a.startsWith('--') && a !== url);
if (!target || !fs.existsSync(target)) {
  console.error('usage: node checks/audit-brief.mjs <file.html> [--url <served-url>]');
  process.exit(2);
}

const run = (script, arg) => {
  try {
    return JSON.parse(execFileSync('node', [script, arg, '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }));
  } catch (e) {
    // These scripts exit non-zero on findings — that is a result, not a crash.
    try { return JSON.parse(e.stdout || '{}'); } catch { return null; }
  }
};

// --blind: emit the prompt with NO measurements at all. This is the control run. An auditor
// that only ever sees the brief will inherit every blind spot the evaluators have; a periodic
// blind pass is the negative control that detects evaluator drift. Run it every ~5th audit.
const blind = argv.includes('--blind');
const craft = blind ? null : run('checks/craft-evals.mjs', url || target);
const instr = blind ? null : run('checks/instrument.mjs', url || target);

const line = (r) => `- [${r.verdict}] ${r.name}: ${r.measured}`;
const covered = [
  ...(craft?.results ?? []).map((r) => r.name),
  'target size against WCAG / Apple / Material',
  'colour contrast of text',
  'horizontal overflow',
  'console and page errors',
  'accessible names, roles, labels',
];

const brief = `Read ${target} and design.md, render it (drive \`?state=<name>\` for each declared state),
and read it ONCE. Do NOT open other repo files, do NOT invoke a design skill, do NOT re-run the
scripts. Budget: aim for <= 6 tool calls. You are judging the RESIDUE the deterministic checkers
cannot reach, not re-auditing from scratch — the cheap tier already ran and its results are below.

You are auditing the ARTIFACT only. You cannot see why any choice was made, and should not ask.

Ground every design claim in \`docs/design-canon.md\` — the loop's VERIFIED source canon (which authorities
are real vs which numbers are house heuristics). Cite a VERIFIED canon source, never a folklore threshold
as if it were authority. If a claim has no canon backing, say so rather than invent one.

## ALREADY MEASURED: do not RE-DERIVE these, but DO challenge them
These are measurements WITH their method, **not settled facts**: a check can pass vacuously, and
one here already did — the focus check once reported PASS off the browser's default ring while the
page authored no focus styling. For each, ask: **does the stated method actually support the claim?**
If not, that IS a finding: \`gate: "evaluator-wrong: <check>"\`, severity major, say what it misses.

${(craft?.results ?? []).map(line).join('\n') || '- (craft-evals produced no results)'}

${(instr ?? []).slice(0, 6).map((e) => `- [${e.type}] ${e.claim} — ${e.measured}`).join('\n')}

Do not duplicate these machine-covered categories (a finding that the MEASUREMENT is wrong is still in scope):
${covered.map((c) => `  · ${c}`).join('\n')}
Interrogate first: any PASS a browser default could satisfy; any PASS where "nothing happened"
looks identical to "the right thing happened"; any INFO that is really an untested condition.

## YOUR TWO JOBS — spend judgement only where no script can reach
1. **DEFECTS the scripts can't see.** Composition (structure vs defaults stacked vertically),
   motivated-vs-decorative (every device encodes something true — name any that doesn't),
   hierarchy (do sizes/weights rank what MATTERS, or are they merely different), copy (true thing,
   fewest words, right moment), model-fit (structure matches how the user thinks), and above all
   **what is MISSING** (a state, affordance, or piece of information that should exist) — absence is
   what scripts are worst at. Plus any evaluator-wrong. Only real, nameable tells; no padding.
2. **THE NEXT IMPROVEMENT.** The single highest-leverage change that would make this SUBSTANTIALLY
   better, not merely un-broken — the one move you would make next to raise the craft ceiling. A
   loop that only removes defects plateaus; this is what drives it forward.

Do NOT edit anything.

Return ONLY a JSON array (no prose, no fence). List your defects, AND always include exactly one
entry with gate \`"next-improvement"\` (severity minor) whose \`fix\` is that single highest-leverage
upgrade, concrete enough to act on:
[{"gate":"<named tell>","severity":"critical|major|minor","where":"${target}:<lines>","fix":"<one line>"}]
If genuinely defect-free, return just the one next-improvement entry.`;

console.log(blind
  ? `Read ${target} and design.md, render it, and read it once.

This is a BLIND CONTROL RUN — deliberately given no prior measurements. Report everything you
find, including things a script might also catch: the point is to detect what the automated
checkers MISS, so overlap is expected and useful here. Do not invoke a design skill.

Do NOT edit anything.

Return ONLY a JSON array (no prose, no fence). Include exactly one gate \`"next-improvement"\`
(severity minor) with the single highest-leverage upgrade:
[{"gate":"<named tell>","severity":"critical|major|minor","where":"${target}:<lines>","fix":"<one line>"}]`
  : brief);
