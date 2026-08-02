# design-loop roadmap and sequencing

**Written 2026-08-01.** Durable because the DoD queue could not take it: `intent/requests.jsonl` has
no `dod` field (that is R-030's unfinished half), `queue-write.mjs` correctly refuses non-hook
processes, and the capture hook recorded 0 of 357 rows from this session. This file is the fallback,
and it is honest about being one: **a document is tier D on the quality ladder.** It reminds; it
enforces nothing (CF-074).

---

## 1 · The sequencing rule (the lens, not an item)

Derived with the IC-principal SWE advisor, and it replaced a worse rule of mine.

> **Critical path = the longest chain of ONE-WAY doors between now and one real user session.**
> Two-way doors are off the path regardless of fan-out.

Procedure: enumerate **decisions, not tasks** → tag each one-way or two-way → count fan-out (how many
other decisions read it) → the path is the one-way chain only.

**What it replaced.** My proposal was "order by cost-to-change-later × blocks-other-work." The advisor
rejected it: that formula **schedules the non-bottleneck**. It optimises engineering time, and at v0
engineering time is not the constraint. **Decision latency is.**

**The hypothesis it killed.** I argued an AI-native cost-curve inversion: since an agent regenerates
the surface cheaply, the expensive critical-path items become the contracts the agent must not churn
(data contract, state model, URL scheme, event taxonomy, latency architecture). This is
self-refuting: *if regeneration is cheap, contracts become two-way doors*, because you can regenerate
against a changed contract. The premise argues against the conclusion. Contracts belong on the
critical path **only where they are genuinely one-way** (stable IDs, money, auth).

**Corollaries worth keeping:**
- Critical path ≠ highest-risk path. Schedule the first, review the second. Conflating them stalls v0s.
- "Design it twice" (*APOSD* Ch. 11) is spent only on one-way doors. Designing a regeneratable surface
  twice is waste.
- Analytics-first at n≈0 is a trap: no denominator, so every rate is noise. Ship a qualitative channel
  and state-addressable URLs first. "Too late" is when you cannot answer *which declared state did
  they land in*, not when you lack a funnel.

### Its own tier, rated on this repo's ladder rather than exempted

| axis | value |
|---|---|
| rung | **D**, and below it: it has never run, and ladder rule 2 tiers an unrun guard at D regardless of logic |
| precision | **unmeasured**, zero recorded fires. Rule 1: a rung asserted without evidence is D |
| authority | none |

**It does not earn a build.** Ladder rule 3 sets the climb trigger at three recurrences; the observed
count is **one** (the contracts-first hypothesis, this session). Building a sequencing checker now
would encode judgement calls as if measured, and a low-precision gate gets switched off and takes its
true positives with it (ladder axis 2).

**Cheapest climb, D → B, when it earns it:** add `door: one-way | two-way` to the record
`checks/design-rat.mjs` already writes. Absence becomes a shape rather than an omission. One schema
field, rides a mechanism that already fires, blocks nothing, no new hazard.

**Promotion trigger:** the third time a build is mis-sequenced in a way this rule would have caught.
Until then it stays a lens.

---

## 2 · The roadmap order

Derived by applying §1 to design-loop itself.

| tier | item | door | why here |
|---|---|---|---|
| **1** | **Capture: pre-register + hit/miss on loop runs** | **one-way** | The only genuinely unrecoverable item. Every run without it is an observation lost forever |
| **2** | **React / component grading** | two-way | Not irreversible, but it is the **bottleneck**: the loop cannot see the artifact the work now produces |
| **3** | Generalise **A2** (a null must never render as zero) and **A6** (unavailable ≠ empty) into `design.md` + `craft-evals` | two-way | Cheap, compounds over every future screen, and A6 is a real hole in the state matrix |
| **4** | Close #8's measurement gap (LCP/INP/CLS); add A5/A9 greppable checks; `door` field on design-rat | two-way | Mechanical once tier 2 exists |
| **5** | More competencies, more sources, workbench visual work | two-way | Regeneratable, therefore schedule, not architecture |

### Why tier 1 is what it is

**design-loop has the same unmeasured objective as the advisor pipeline.** `SPEC-advisor-workbench.md`
defines `hit_rate@session` = did a reply contain something the operator did not already hold, and then
acted on. It is unobservable *post hoc* because it is relative to a prior no artifact contains, and
trivially observable *ex ante*.

design-loop is in the identical position. `teach-gate` enforces that every lesson carries mechanism +
senior comparison + source. **Nothing measures whether any lesson landed.** The loop's whole purpose
is teaching and its teaching effectiveness has zero observations, for the same reason.

So the spec's mechanism is portable, and reusing it beats inventing a parallel one:

1. **Pre-register** before a run: what I think is wrong with this screen, what I think I am missing.
2. **Run** the gates and the cold audit.
3. **Rate**, one control: did it surface something I did not hold, that I then changed? Hit or miss.

A rating without a stored prior must be **impossible**, not discouraged. A rating with no prior
measures whether the audit was *good*, a different question, and mixing them corrupts the only real
number.

**The honest counter-argument**, kept because it may be right: the spec itself notes `hit_rate` needs
≈5 rated sessions before it separates anything, so tier 1 pays off only after several runs. The rival
ordering puts React grading first on the grounds that the true bottleneck is simply being unable to
build on the real stack. Unresolved.

---

## 3 · What the spec displaced

`skill-optimizer/docs/SPEC-advisor-workbench.md` re-prioritised the queue:

| item | change |
|---|---|
| Design advisor v0 as a hand-authored skill | **dropped in priority.** The spec *is* the advisor surface and is better specified. Phase-0 gates (`fp-04c25e88`, `reuse-39848594`, `rat-c8c4a26c`, probe `p-design-advisor-v0` PASS) remain valid if resumed |
| DoD queue (R-030) | unchanged, and smaller than it looked: already `partial`, so the work is the `dod` field, not a new store |
| Demo-video workflow | independent, competes with nothing above |

### Two tensions to resolve before any build

- **Mocks.** The spec bans mock data (A5: "a mock that renders is indistinguishable from a real state
  that renders"). The advisor put *fixtures bound to state URLs* at build item 3 and called them what
  actually makes regeneration cheap. Reconciled only if stated explicitly: **fixtures live in the
  dev/review harness, never in the shipped bundle.** `fixtures/` already works this way.
- **One change per run.** `design-gate` enforces it for attributability. The spec is a multi-surface
  build, so the loop's own rule throttles the build it must grade. Needs an explicit exception path.

---

## 4 · Coverage of the spec's acceptance criteria, today

| criterion | design-loop today |
|---|---|
| A7 keyboard-only full loop | covered (`craft-evals` `keyboard-reach`) |
| A8 `open-deficiency` ≠ `gate-failing` | partly (`state-not-colour-alone`, wrong scope) |
| A10 light + dark, manual override wins | partly (`design.md` requires both themes) |
| A6 missing data → explicit error, not empty dashboard | conceptually covered, structurally not |
| A11 first paint < 1.5s | **not measured.** #8 names LCP/INP/CLS; nothing in `checks/` measures them |
| A2 `UNMEASURED` never renders as `0` | no check |
| A5 no mock data in bundle · A9 stable `id` + `data-anchor` | no check, both trivially greppable |
| A1 / A3 / A4 / A12 | app logic and IA, correctly outside a craft loop |

---

## 5 · Open decisions

| # | decision | status |
|---|---|---|
| A | Commit verbatim design chapter slices to `advisor-builder` (per DECISIONS P13), or ground the design cartridge on web sources only and keep books local? | open. Most design sources are free/web, unlike the SWE set |
| B | Finish R-030 (`dod` field) as the queue deliverable, or go straight at the advisor? | open |
| C | Tier 1 vs tier 2 ordering (capture vs React grading) | open, see §2 |
| D | Diagnose the silent `ask-log` hook (0 of 357 rows this session) | open. Root cause of why this file exists |

---

## 6 · Honesty log

- **This document is tier D.** It reminds and enforces nothing. Calling it durable means it survives
  the session, not that it is a guard (CF-074).
- **The one-way-door rule is unproven**, n=1, precision unmeasured. Stated as a lens, not a finding.
- **The AI cost-curve inversion is retracted**, not softened. It was self-refuting.
- **HEART caveats carried from the canon:** validation is Google-internal only, and "HEART descends
  from GQM" was refuted (HEART cites no GQM). Do not overclaim when leaning on #11.
- **`checks/instrument.mjs` is not telemetry.** It is a static artifact measurer (target geometry,
  element counts, line measure) on the local machine. The repo has zero user-facing telemetry.
- **Gaps confirmed by grep**, not assumed: event taxonomy, feature flags/progressive delivery, data
  contracts, work sequencing, passive feedback capture, production observability, and v0 distribution
  are all uncovered by the competency map. The map is a craft-quality map with no delivery-systems
  column.
- **External verification of the DORA batch-size evidence, statistical power at low N, and the
  one-way/two-way door sourcing was still running when this was written.** Nothing here rests on it;
  §2's tier-1-vs-2 question is the thing it should settle.
