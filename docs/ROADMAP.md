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

**The classifier, which the framing normally lacks.** Bezos's Type 1 / Type 2 (2015 shareholder
letter, verified verbatim) gives the categories but **no procedure for sorting a decision into them**.
The workable classifier: *a decision is one-way to the degree that other work has already been built
on top of it.* That makes classification a fan-out measurement rather than a judgement call, which is
also what keeps this rule from being taste in a lab coat.

**What this rule is FOR, corrected 2026-08-01.** Door-type tells you **where to spend deliberation**.
It does **not** tell you what to schedule. Scheduling is answered by the constraint (Theory of
Constraints step 1). Conflating the two put this roadmap's own tier 1 and tier 2 in the wrong order
on first writing — see §2.

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

**REVISED 2026-08-01 after external verification.** The first draft ranked by door-type, which is the
wrong instrument for scheduling. TOC step 1 says identify the **constraint** and subordinate everything
to it. The constraint is React grading: until the loop can see the artifact, no runs happen on real
work, so the pre-registered priors never accumulate either. Capture is one-way and cheap (a form plus
a jsonl row), so it **rides along as a subordinate item** rather than competing for the constraint's
resource. Door-type still decides where deliberation is spent; it does not decide order.

| tier | item | door | why here |
|---|---|---|---|
| **1** | **React / component grading** | two-way | **The constraint.** The loop cannot see the artifact the work now produces. Everything downstream, including accumulating rated sessions, is gated on it |
| **1b** | **Capture: pre-register + hit/miss on loop runs** | **one-way** | Genuinely unrecoverable, and cheap enough not to compete with the constraint. Ships alongside tier 1, not after it. Its *value* only materialises at ≈5 rated sessions (the spec says so), but its *cost of omission* starts on run one |
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
- **External verification completed 2026-08-01.** It settled §2's tier question (against my first
  ordering) and produced the corrections in §7.

---

## 7 · External verification, 2026-08-01

Evidence separated into three tiers, because treating them alike is how folklore enters a canon.

### Tier 1 — genuinely evidenced

| finding | source |
|---|---|
| **A/B testing a v0 is arithmetically undefined, not merely hard.** n = 16σ²/Δ² per variant at 95%/80%. Worked example: **>409,000 users per arm** to detect a 5% revenue change; 7,600 for a 20% conversion change. Sensitivity is squared, so 5%→20% cuts the requirement 16-fold | Kohavi, Longbotham, Sommerfield, Henne, *Controlled experiments on the web*, DMKD 18:140–181 (2009), §3.2 |
| Kohavi's own floor: **at least thousands of active users**, and only for large effects. 10× sensitivity costs 100× users | *Online Controlled Experiments at Large Scale*, KDD 2013 |
| **Peeking is a real, measured failure.** Airbnb's price-filter test crossed p<0.05 at day 7 with a 4% effect, then resolved to null | Overgoor, Airbnb Tech Blog, 2014 |
| **5 users is a mean, not a fact.** Nielsen: L=31% → ~85%, but he also states **15 users** to find all problems, and 5-per-iteration ≠ 5-per-project. Faulkner (2003, n=60, resampled): realized range **55–99%**. Spool & Schroeder (2001, n=49): **35%**, with purchase-blocking problems surfacing only at participants 13 and 15 | Nielsen 2000; Faulkner, *BRMIC* 35(3); Spool & Schroeder, CHI EA 2001 |
| **Nielsen's own sequencing:** the first several studies should be **qualitative**; add quantitative only once qualitative research is routine | NN/g, 2006 |
| **DORA small batches:** predicts delivery and organisational performance. Trunk-based development is a named capability (≤3 active branches, merge daily) | dora.dev; *Accelerate* (Forsgren, Humble, Kim) |
| **DORA's boundary, to state whenever citing it:** cross-sectional and inferential, **not experimental**; snowball sampling; self-reported Likert buckets. Deployment frequency is a **proxy** for batch size. So "small batches correlate strongly" is established; "cause" is not | 2019 State of DevOps, methodology pp.77–78 |

### Tier 2 — credible practitioner consensus, no evidence base

**One walking skeleton through the state matrix, not states in isolation.** Four independent lineages
converge: tracer bullets (Hunt & Thomas), walking skeleton (Cockburn), Shape Up scopes (Singer,
"discovered by doing the real work"), and the Riskiest Assumption Test (Higham). Unevidenced, but as
near unanimous as practitioner craft gets, and it matches the SWE advisor's build item 1 exactly.

Feature toggles are **inventory with a carrying cost** (Hodgson/Fowler): mitigate with removal tasks,
expiry dates, hard caps. Preview-deploy-per-PR has an obvious mechanism, **literally no evidence**,
and near-zero cost.

### Tier 3 — folklore, or claims that failed checking

| claim | verdict |
|---|---|
| **Deep links / URL state as a feedback multiplier** | **Folklore.** No study, no benchmark, no engineering post. Nielsen's *URL as UI* (1999) is about document addressing on the pre-search-engine web, not application state. The mechanism is real and worth doing; **argue it from first principles, never from a citation** |
| "Instrument analytics first or the data is lost forever" | **Defeated at v0 scale.** Heap virtual events are retroactive; PostHog autocaptures without tracking code. The defensible version: *logging is cheap and fine; treating those logs as evidence is what the statistics rule out* |
| "Feature flags are a DORA capability" | **False.** dora.dev lists 34 capabilities, none mention flags, toggles, dark launch, or canary. **Trunk-based development** is the real one |
| "Linear says data models are the durable artifact" | **Linear has published nothing on this.** The sync-engine material is *third-party reverse engineering*. Affects competency #15's citation, which should say so |
| Progressive delivery = "CD with control over the blast radius" | Not in Governor's coining post. Unsourced |
| "Under X visitors, don't A/B test" | No credible source states a hard threshold. Use Kohavi's "thousands, large effects only" instead |

### The hypothesis, killed a second time — now empirically

§1 retracted the AI cost-curve inversion on logic. The data points the **other way**:

- **METR RCT (Jul 2025):** 16 experienced OSS devs, 246 issues, mature repos. AI-allowed condition took **19% longer**. Devs predicted a 24% speedup and still believed they got 20% afterwards.
- **DORA 2024:** AI adoption associated with **decreased** throughput and stability. **2025:** throughput flipped positive, **stability still negative**.
- **GitClear** (211M changed lines, 2020–2024): refactoring's share of changed lines fell 25% → under 10%; cloned lines rose 8.3% → 12.3%.

And the sourced version of what actually got expensive is **verification and problem definition**, not
schemas or state models. Saarinen: the hard part is understanding the problem well enough to know what
should exist. Willison: writing code is cheap, review and QA are not. My schema/contract framing was
mine alone and no source narrows with it.

### Computing the path to done, what is actually available

**CPM cannot be run on v0 work, and its inventors said so.** Kelley & Walker (1959) contains a
*Non-Deterministic Schedules* section conceding that random durations pose difficulties "partly
philosophical and partly mathematical" that "do not seem easily resolved." CPM presupposes the
activity list, the dependency graph, and the durations. A v0 has none of the three.

| available method | computes | boundary |
|---|---|---|
| **TOC five focusing steps** | which single constraint gates output | needs a definable goal. Goldratt: most real constraints are **policy**, not physical |
| **CD3 / WSJF** (Cost of Delay ÷ Duration) | economically optimal sequence. Worked example: 61% less delay cost than FIFO | needs real currency on delay. Yip's critique: SAFe's Fibonacci proxies discard the economics that made it work |
| **Monte Carlo from throughput** | a probabilistic date | needs 3+ weeks of real throughput. **A v0 has none** |
| **Shape Up appetite + hill chart** | a fixed budget and a position, deliberately **not** a date | zero empirical validation, one company's published practice |
