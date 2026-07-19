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

const brief = `Read ${target} and design.md.

Invoke the \`hallmark\` skill and run \`hallmark audit\` on ${target}.

You are auditing the ARTIFACT only. You cannot see why any choice was made, and should not ask.

## ALREADY MEASURED: do not RE-DERIVE these, but DO challenge them
Deterministic checkers ran first. Their results are below WITH the method used. These are
measurements, **not settled facts**: a check can pass vacuously, and one here already did:
an earlier version of the focus check reported PASS because the browser draws a default ring,
while the page authored no focus styling at all.

Your job on this list is not to repeat it. It is to ask, for each one:
**does the stated method actually support the stated claim?**
If it does not, that IS a finding. Report it as \`gate: "evaluator-wrong: <check name>"\` with
severity major, and say what the method misses.

${(craft?.results ?? []).map(line).join('\n') || '- (craft-evals produced no results)'}

${(instr ?? []).slice(0, 6).map((e) => `- [${e.type}] ${e.claim} — ${e.measured}`).join('\n')}

Machine-covered categories: do not file a DUPLICATE finding here, but a finding that the
measurement itself is wrong or incomplete is always in scope:
${covered.map((c) => `  · ${c}`).join('\n')}

Highest-risk vacuous passes to interrogate first:
  · any PASS that could be satisfied by a browser default rather than by the page's own code
  · any PASS where "nothing happened" would produce the same result as "the right thing happened"
  · any INFO that is really an untested condition wearing a neutral label

## SPEND YOUR JUDGEMENT HERE INSTEAD
Only on what no script can reach:
- **Composition**: does the layout have a structure, or is it defaults stacked vertically?
- **Motivated vs decorative**: does every visual device encode something true about the
  product or the content? Name any that does not.
- **Hierarchy**: do the type sizes and weights actually rank things in the order that
  matters, or are they just different?
- **Copy**: does it say the true thing, in the fewest words, at the moment it is needed?
- **Model fit**: does the structure match how someone thinks about this task?
- **What is missing**: a state, an affordance, or a piece of information that should exist
  and does not. Absence is the thing scripts are worst at.

Restating a measurement as your own discovery is waste. Disproving one is the most valuable
thing you can return.

Do NOT edit anything.

Return ONLY a JSON array, no prose, no markdown fence:
[{"gate":"<named tell>","severity":"critical|major|minor","where":"${target}:<lines>","fix":"<one line>"}]
Return [] if genuinely clean.`;

console.log(blind
  ? `Read ${target} and design.md.

Invoke the \`hallmark\` skill and run \`hallmark audit\` on ${target}.

This is a BLIND CONTROL RUN. You are deliberately given no prior measurements. Report
everything you find, including things a script might also catch. The point is to detect what
the automated checkers are missing, so overlap is expected and useful here.

Do NOT edit anything.

Return ONLY a JSON array, no prose, no markdown fence:
[{"gate":"<named tell>","severity":"critical|major|minor","where":"${target}:<lines>","fix":"<one line>"}]`
  : brief);
