---
description: Run one design-improvement loop on an HTML prototype — make → check → gate → learn.
argument-hint: <path-to.html> [what to change]
allowed-tools: Read, Edit, Write, Bash, Glob, Grep, Skill
---

You are running **/design-loop** on `$1`. Do the loop below **in order**. Approval never comes from your
own taste — only from the deterministic gate + Hallmark's named slop gates.

## 0 · Context (SKILL FILE + STATE)
- Read `design.md` — it is BOTH your house-style AND **Hallmark's locked design system** (Hallmark reads
  project-root `design.md` first and defers to it). Obey it.
- Read the **last 5 lines** of `design-lessons.jsonl`. Pick **one** past lesson relevant to `$1` and
  **actively re-check it this run** (spaced resurfacing). Say: "Resurfacing: <lesson>."
- Run `npm run track`. If anything is due, run `npm run track -- --quiz` and **ask those
  questions before the build**, not after — retrieval is the point, and a term reviewed at
  the end of a session competes with fatigue. Grade each with
  `npm run track -- --grade "<term>" right|wrong`. A wrong answer resets the interval,
  because the interval is a confidence estimate and a miss means the estimate was too high.

## 1 · MAKE (one focused change, via Hallmark)
- Invoke the **`hallmark`** skill to make the change so the output is off-distribution (non-slop):
  - existing page → **`hallmark redesign $1`** (in-place, preserves copy/IA; honors `design.md`)
  - a brand-new section → Hallmark **default** design flow
- Apply `$2` if given, else improve `$1` toward `design.md`. One change, not a rewrite. Hallmark stamps
  its pre-emit critique (`/* Hallmark · pre-emit critique: P.. H.. E.. S.. R.. V.. */`) — keep it.

## 2 · CHECK (two independent checkers — never your own taste)
- **Deterministic:** `npm run design-gate -- $1 --log --note "<what you changed>"`
  `--why "<rationale + what you rejected>"`
  (axe-core a11y/contrast + no-overflow + no-console — binary). `--log` records the run in
  `design-runs.jsonl` **every time, pass or fail** — a failed round is the most informative row in
  the table, so never run the gate without it.
  `--why` is what makes this a *decision* log and not an outcome log: record the reasoning and the
  alternative you turned down, not a restatement of `--note`. **Note the `runId` it prints** — the
  audit and the lesson both attach to it.
- **Structural anti-slop:** run the audit **COLD, in a subagent** — never inline. Use the **Agent** tool
  (`subagent_type: general-purpose`), and if a second model is available prefer `model:` ≠ the maker's.

  > **Why cold:** run inline, the audit shares your context and grades the *reasoning* it just produced
  > rather than the artifact. You know why you chose that hero, so it doesn't read as generic to you.
  > A fresh agent sees only the file. That is the difference between a checker and a rubber stamp.

  Send the subagent **only** this — no rationale, no diff, no history:
  ```
  Read <file>. Invoke the `hallmark` skill and run `hallmark audit <file>`.
  Do NOT edit. Return ONLY a JSON array, no prose:
  [{"gate":"<named tell>","severity":"critical|major|minor","where":"<file:lines>","fix":"<one line>"}]
  Return [] if clean.
  ```
  Then persist the result — **the audit is not done until it is logged**:
  ```
  node checks/log-audit.mjs <runId> --json '<the array>'
  node checks/log-audit.mjs <runId> --clean     # if it returned []
  ```
  Use the `runId` the gate printed. Never skip this: an unaudited run and a clean run must not look
  alike in the table.

## 2b · MEASURE (deterministic, before any judgement)
Run these BEFORE spawning the auditor. Every finding the auditor spends on something a script
already measured is judgement wasted, and the auditor has been wrong about measurable things
it inferred from source rather than observed.
- `npm run craft -- $1` — focus/hover/type-scale/motion/latency floor from `design.md`.
- `npm run instrument -- $1` — target sizes against WCAG · Apple · Material, each with its
  citation and its limits. Evidence, not verdicts.
- `npm run states -- $1` — every declared state driven and gated on its own.

## 2c · AUDIT (cold, briefed)
- `npm run audit-brief -- $1` composes the auditor's prompt with the measurements embedded.
- Spawn a **cold subagent** with that prompt. It must NOT re-derive a measurement, but it MUST
  challenge one whose method does not support its claim.
- **Every 5th run, use `--blind` instead.** No measurements, report everything. This is the
  negative control: an auditor that only ever sees the brief inherits every blind spot the
  evaluators have, permanently and invisibly.

## 3 · GATE (binary, has teeth)
- **PASS** only if: `design-gate` exited 0 **AND** the cold audit logged **no `critical` finding**.
- The pre-emit critique is **not** part of the gate. It is the maker scoring its own output, and
  self-assessment never grants approval — keep it as a maker-side prompt, treat it as advisory only.
- On **FAIL** / **BLOCKED**: name the *specific* failing check (an axe rule id OR a named slop gate),
  fix only that, re-run step 2 **with `--log` again** so each round is its own row. **Max 3 rounds.**
  Still failing → **STOP**, report the open failures. Never wave it through.

## 4 · LEARN (STATE FILE — what makes it self-learning)
- `node checks/log-teach.mjs <runId> --json '{...}'` is **not optional**. A run with no
  teaching record renders as a gap card, not as prose (CF-064). `npm run workbench` prints
  every untaught run id.
- On PASS: append **one** line to `design-lessons.jsonl`, carrying the `runId` so it joins cleanly:
  `{"runId":"<runId>","date":"<today>","target":"$1","change":"<what changed>","lesson":"<reusable design lesson — often a specific axe rule or named slop gate you hit>"}`

## 5 · PUBLISH (all four views — how the human sees what happened)
Run **all** of these, on PASS and on FAIL. Each answers a different question, and skipping one
is how a view goes stale without anyone noticing:
```
npm run design-log                 # the decision table — what happened, precisely
npm run workbench -- $1            # your design + its history, side by side  → workbench-<name>.html
npm run replay                     # flip between iterations to SEE the change
npm run dashboard                  # loop health + checker quality
npm run status                     # is the machine itself intact
npm run verify-render              # DID EACH CHECKER RUN, and did the card render right
```
- **`verify-render` is the last thing you run and the first thing you read.** It answers two
  questions nothing else does: *did each checker actually happen* (coverage), and *did the card
  render in the prescribed format* (format). It exits non-zero on either failure.
- A green gate says the checks that ran, passed. It says nothing about the checks that never
  ran — and for six consecutive runs that was every craft eval and every state matrix.
  **Absence of a finding is not a finding of absence** (CF-065).
- Do not close a run while `verify-render` is red. The fix commands are in its output.
- `workbench` writes **one file per prototype** (`workbench-<name>.html`) and its nav dropdown
  switches between them, so several prototypes can be in flight without clobbering each other.
- Always run `npm run design-log`, on PASS **and** on FAIL. It regenerates `design-log.md` from
  `design-runs.jsonl` + `design-lessons.jsonl`: one row per run (change · gate · why · lesson) plus a
  **repeat offenders** tally. Never hand-edit `design-log.md` — it is a pure projection.
- Read the repeat-offenders list. If one check has now failed **3+ times**, say so explicitly and
  propose the specific `design.md` rule that would prevent it — a check that keeps failing means the
  house-style is under-specified, and that is the loop's real output.
- Close with a 5-line report: **resurfaced** / **changed** / **gate result (which checks)** /
  **logged** / **table** (link `design-log.md`, quote the run count and any repeat offender).

Pieces: trigger = you (`/design-loop`) · skill = `design.md` (+ Hallmark's locked system) · maker = Hallmark
`redesign`/default · checker = `design-gate` (deterministic) + `hallmark audit` (structural) · gate = step 3 ·
state = `design-lessons.jsonl`.
