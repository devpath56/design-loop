# design-loop — a self-triggered design self-learning loop

You fire it, it makes one change, a **deterministic** checker gates it, and it **remembers** the lesson.
No LLM taste in the load-bearing path.

> **This is not an autonomous loop, and the README used to imply otherwise.**
> The trigger is you typing a command. An annotation-driven trigger was built against the
> Agentation MCP and removed: nothing ever attached to a plain static server on `:8000`, so
> the trigger was never proven and the code was dead weight pretending to be a feature.
> Everything downstream of the trigger is real and exercised.

## The loop (7 pieces)
| Piece | Here |
|---|---|
| **Trigger** | **you.** Manual, by design — see below |
| **Skill file** | `design.md` (house-style; extend it with Hallmark `study`) |
| **Maker** | Claude Code (+ Hallmark `default`/`redesign` for non-slop) |
| **Checker** | `checks/design-gate.mjs` (axe · overflow · console · target-size) **+** `state-matrix` (every state gated on its own) **+** Hallmark `audit` run **cold in a subagent** |
| **Gate** | binary: gate exits 0 **and** no critical slop gate |
| **State** | `design-lessons.jsonl` — resurfaced (spaced) each run |
| **Ledger** | `design-log.md` — the decision table, one row per run (`npm run design-log`) |

**The checker must not be the maker.** `hallmark audit` runs in a **separate subagent with no exposure to
the maker's reasoning** — inline, it grades the intent it just produced instead of the artifact, and
approves its own work. `design-gate.mjs` needs no such isolation: it isn't a model, it computes contrast
ratios. The maker's pre-emit critique is advisory only and **grants nothing** — self-scoring is not a gate.

## Setup (once)
```
cd design-loop
npm install                      # playwright + @axe-core/playwright
npx playwright install chromium  # ~82MB, one-time — the gate drives headless chromium
```
**Hallmark is already installed** at `.claude/skills/hallmark/` (Nutlope/hallmark, MIT — LICENSE kept).
It's discovered automatically when you open Claude Code in this folder, and the loop uses it:
- **maker** → `hallmark redesign <file>` (non-slop, honors `design.md`)
- **checker** → `hallmark audit <file>` (ranked punch list vs 57 slop gates; doesn't edit)
- **skill file** → your `design.md` IS Hallmark's locked design system (it reads it first)
- extend taste with `hallmark study <url|screenshot>` → "lock the DNA" → paste into `design.md`

## Use it
Open Claude Code **in this folder**, then:
```
/design-loop prototype.html "make the provider button accessible and lift the muted text contrast"
```
Or run the checkers directly, anytime:
```
npm run design-gate -- prototype.html
npm run design-gate -- prototype.html --log --note "what I changed" --why "why, and what I rejected"
node checks/log-audit.mjs <runId> --json '[{"gate":"...","severity":"critical","where":"...","fix":"..."}]'
node checks/log-audit.mjs <runId> --clean     # audit ran and found nothing
npm run design-log                            # rebuild design-log.md
```

## Seeing what happened — `design-log.md`
Three append-only logs, joined on an opaque **run id**:

| File | Written by | Holds |
|---|---|---|
| `design-runs.jsonl` | `design-gate` (automatic) | deterministic results, **every run, pass or fail** |
| `design-audits.jsonl` | `log-audit` (after the cold audit) | named slop gates + severity |
| `design-lessons.jsonl` | the loop, on PASS | the reusable lesson |

`npm run design-log` projects all three into **`design-log.md`** — a scannable table plus a per-run
detail section carrying the full rationale:

| Run | Change | Verdict | Failing checks | Slop gates | Lesson |
|---|---|---|---|---|---|
| #1 | seeded defects | **FAIL** ❌ | `button-name [critical] ×1` | ⚠️ not audited | — |
| #2 | lift contrast, add aria-label | **PASS** ✅ | all green | clean | `#b8b8b8` is 1.9:1 — need ~`#5b6470` |

Four things it deliberately makes visible:
- **Verdict is both checkers.** `BLOCKED ⛔` = axe green but a **critical** slop gate. Reporting only the
  deterministic half let structurally-slop runs read as `PASS ✅`.
- **`⚠️ not audited` ≠ `clean`.** A checker that never ran must never look like one that passed.
- **Missing `--why`** is flagged. Without rationale it's an outcome log, not a decision log — you can
  see *what* happened but never re-derive *why*.
- **Repeat offenders** tallies both checkers. A check failing repeatedly means `design.md` isn't
  opinionated enough yet — that tally, not any single run, is the loop's real output.

`design-log.md` is a pure projection; regenerate it, never hand-edit it.

## What the gate checks (deterministic, provable)
- **a11y** via axe-core — contrast < 4.5:1, missing accessible names, roles (serious/critical only),
  run at **both** 375px and 1280px (contrast and naming can fail at one width and not the other)
- **layout** — no horizontal overflow at 375px and 1280px
- **runtime** — no console/page errors

The starter `prototype.html` ships with two deliberate defects (low-contrast muted text + an icon-only
button with no label) so your first `/design-loop` has something real to catch and fix.

## v0 scope
- The **deterministic gate is built and tested** (proven to fail on a real defect and pass when fixed).
- **Hallmark is installed and load-bearing** — maker (`redesign`) + checker (`audit`). Its audit runs in
  your local Claude Code session (it's an LLM skill, not a CLI), gated by the named slop gates it flags.
- A vision/screenshot judge is deliberately **not** a gate — deterministic (axe) + structural (Hallmark
  named gates) carry it.
