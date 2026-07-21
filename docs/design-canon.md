# design-canon.md — the design-substance sources the loop is allowed to lean on

Governs the DESIGN-SUBSTANCE layer of the loop (the gate rules, the craft evals, the cold-audit
brief). The PEDAGOGY layer (learning science — retrieval, spacing, Feynman) is out of scope here
and lives elsewhere; this file references it but does not re-derive it.

**Citation discipline (load-bearing).** Every citation carries exactly one tag:
- `[VERIFIED — <url>, accessed 2026-07-20]` — author, title, year, and the specific claim confirmed by fetch/search.
- `[UNVERIFIED — <why>]` — could not confirm; stated plainly. An honest UNVERIFIED beats a confident guess.

A `(research-file)` note means the verbatim verification already lives in
`research/measurement-and-ux-laws.md` (adversarial verdict recorded there), re-confirmed against
that file rather than re-fetched.

Forward-only: this canon governs new gating. It does not reopen already-taught material.

---

## 1. Source teardown — signal vs noise, fractional

A source is rarely all-signal or all-noise. Keep the worthy chunks, cut the rest. `coverage gap?`
flags whether cutting a chunk strands a design skill with no remaining coverage in the kept set.

| # | source / chunk | what it claims in the loop | VERIFIED verdict on the claim | signal\|noise | disposition |
|---|---|---|---|---|---|
| 1 | **WCAG 2.1/2.2 SC 1.4.3 Contrast (Minimum)** | body ≥4.5:1, large/UI ≥3:1 (the gate's #1 rule) | Confirmed: 4.5:1 normal, 3:1 for large text (≥18pt / 14pt bold), Level AA. `[VERIFIED — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum, accessed 2026-07-20]` | signal | **KEEP** |
| 2 | **WCAG 2.2 SC 2.5.8 Target Size (Minimum)** | 24×24 CSS px floor; a *spacing* rule (24px circle non-intersection), not a per-element size edict | Confirmed: 24×24 CSS px, Level AA, five exceptions; rationale is accidental-activation avoidance, **not** a Fitts speed argument. `[VERIFIED — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (research-file), accessed 2026-07-20]` | signal | **KEEP** — implement as geometry/adjacency, not a dimension threshold |
| 3 | **NN/g — Empty States in Application Design** | "empty" is scoped to DATA screens; a form owes no empty state | Article exists and scopes empty states to containers/screens with no content yet. `[VERIFIED — https://www.nngroup.com/articles/empty-state-interface-design/, accessed 2026-07-20]` | signal | **KEEP** — it is the cited authority behind the state-matrix rule |
| 4 | **NN/g — Touch Targets / undersized-target-as-defect** | ~1cm (~38 CSS px) minimum; undersized = design defect, not user error | Confirmed the 1cm physical recommendation and the normative "defect not user error" framing — but NN/g's "defect" line is explicitly **normative, not empirical**. `[VERIFIED — nngroup Touch Targets (research-file), accessed 2026-07-20]` | signal (rhetoric) + noise (as evidence) | **keep-with-caveat** — cite as a normative anchor, never as data |
| 5 | **Parhi, Karlson & Bederson (2006), MobileHCI** | empirical target-size basis: 9.2mm discrete / 9.6mm serial | Confirmed verbatim against primary PDF. Error rate **plateaus** (no gain >9.6mm discrete / 7.7mm serial); only *speed* keeps improving. Scope: one-handed thumb, 2006 resistive PDA, n=20 CS students. `[VERIFIED — https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf (research-file), accessed 2026-07-20]` | signal | **keep-with-caveat** — the real empirical anchor, but narrow; do NOT claim "bigger is always more accurate" |
| 6 | **Apple HIG 44pt / Material 48dp / Fluent 40epx / BBC 7mm** | platform target-size minimums | Confirmed the platforms disagree; none cites a controlled study. Conventions, not derivations; Apple's 44 is **points**, WCAG's 44 (AAA 2.5.5) is CSS px — a unit trap. `[VERIFIED — platform-guidelines survey (research-file), accessed 2026-07-20]` | noise (as evidence) | **keep-with-caveat** — cite as *conventions*, never as empirical minimums |
| 7 | **Doherty & Thadani (1982), "The Economic Value of Rapid Response Time," IBM Systems Journal** | the 400ms upper bound of the motion/response band | **Split (Trident audit correction).** The paper is real and establishes that FASTER response sharply raises productivity/satisfaction — tested points span 0.25s–6s (e.g. ~0.3s gave a large gain over 3s). It states **no precise 400ms cutoff**; that crisp figure is a later pop-UX number repeated by secondary restatements (lawsofux, Medium), possibly folklore, **not** in the primary paper. `[VERIFIED — "faster/sub-second response is materially better," primary paper] · [UNVERIFIED — the specific 400ms cutoff; it traces to secondary retellings, not Doherty & Thadani]` | signal (the directional claim) / noise (the exact 400ms) | **keep-with-caveat** — cite Doherty ONLY for "faster is materially better"; the 400ms band boundary is grounded in Material Motion (#11), not this paper |
| 8 | **"First response <100ms = instant" (craft floor)** | 100ms instant / 300ms responsive perception thresholds | The 300ms end is Doherty-adjacent; the **100ms "instant"** figure I could not tie to a primary this session (usually Miller 1968 / Nielsen 1993, not fetched). `[UNVERIFIED — 100ms threshold not confirmed against a primary source this session]` | signal (widely held) | **keep-with-caveat** — label as convention until Miller 1968 / Nielsen is fetched and pinned |
| 9 | **"Motion floor 80ms — under it reads as a glitch"** | MOTION_MIN=80ms in craft-evals | No primary located; this is practitioner craft folklore, not a cited threshold. `[UNVERIFIED — no primary source for an 80ms lower bound found]` | opinion | **keep-with-caveat** — mark as house heuristic, not sourced |
| 10 | **Disney "Staging" — Thomas & Johnston, *The Illusion of Life* (1981)** | motion communicates a relationship / directs attention (the HUMAN_ONLY motion check) | Confirmed: staging = "the presentation of any idea so that it is completely and unmistakably clear." 1981, the 12 principles. `[VERIFIED — https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation + Amazon 9780786860708, accessed 2026-07-20]` | signal | **KEEP** — grounds "is motion communicating or decorating?" |
| 11 | **Material Design — Motion (duration & easing)** | short, eased motion from a small set; ~150–400ms by element size | Confirmed: 200–300ms mobile, 150–200ms desktop, up to 400ms large elements; easing to avoid mechanical motion. `[VERIFIED — https://m3.material.io/styles/motion/easing-and-duration/tokens-specs + m1.material.io, accessed 2026-07-20]` | signal | **KEEP** — corroborates the 80–400ms band's upper region and the "eased not linear" rule |
| 12 | **Val Head, *Designing Interface Animation* (Rosenfeld, 2016)** | motion has meaning/timing craft beyond duration | Confirmed: Rosenfeld Media, 26 Jul 2016, ISBN 978-1933820323, subtitle "Meaningful Motion for User Experience." `[VERIFIED — https://rosenfeldmedia.com/books/designing-interface-animation/, accessed 2026-07-20]` | signal | **KEEP** — the practitioner authority for the human-judged motion checks |
| 13 | **Deque / axe-core "57%" automation-coverage claim** | the automation ceiling: ~57% of a11y issues machine-detectable | Confirmed as a **vendor** figure (Deque builds/sells axe), by issue *volume* not WCAG criteria (~20–30% on that denominator), driven by 5 SCs = 78% of issues; not independently replicated; marketed "80%" needs human-in-the-loop. `[VERIFIED — axe-core README + deque.com (research-file), accessed 2026-07-20]` | signal (with heavy caveat) | **keep-with-caveat** — always attribute as a vendor claim; never as neutral fact |
| 14 | **HEART + Goals-Signals-Metrics — Rodden, Hutchinson & Fu, CHI 2010** | user-centred metric selection; multi-signal over single north-star | Confirmed primary: both HEART *and* the Goals-Signals-Metrics process are in the 4-page CHI 2010 Note; validation is Google-internal only. `[VERIFIED — research.google/pubs/archive/36299.pdf (research-file), accessed 2026-07-20]` | signal | **KEEP** — grounds the cold-audit's "what does this screen owe the user" framing |
| 15 | **GQM — Basili, Caldiera & Rombach (1994)** | measurement is defined top-down from goals; metric-first fails | Confirmed verbatim; three-level Goal→Question→Metric hierarchy, four-slot goal template; born as NASA-Goddard software-defect method. Note: the claim "HEART descends from GQM" was **refuted** — HEART cites no GQM. `[VERIFIED — cs.umd.edu/users/mvz/handouts/gqm.pdf (research-file), accessed 2026-07-20]` | signal | **KEEP** — the anti-vanity-metric backbone; do NOT assert a HEART lineage |
| 16 | **Miller 7±2 as a UI item-cap** | (as invoked in UX-law folklore) menus/lists capped at ~7 | Confirmed misapplication: Miller called 7 a "coincidence"; it is short-term memory / absolute judgment, not on-screen recognition; modern limit ≈4 chunks (Cowan 2001); Tufte and NN/g reject the UI cap. `[VERIFIED — multiple (research-file), accessed 2026-07-20]` | noise | **CUT** — do not gate on any item-count rule. `coverage gap?` **No** — the transferable residue (chunking / grouping) is already covered by the hierarchy-spacing and type-scale checks. |
| 17 | **Fitts / Hick / Tesler as cited "UX laws"** | invoked as empirical basis for target size & choice count | Fitts 1954 is real but derives **no pixel value** (research-file). Hick's Law and Tesler's Law are **named in scope but not substantiated** in the research file and I did not fetch primaries. `[UNVERIFIED — Fitts 1954 primary not fetched; Hick & Tesler not verified this session]` | mixed | **CUT as loop-gating sources** — none can drive a deterministic check. `coverage gap?` **No** — target-size coverage survives via WCAG 2.5.8 (#2) + Parhi (#5). |
| 18 | **Superhuman design spec** | seed for the craft invariants (perception window, closed scale, focus visible, state≠colour, optimistic+undo) | Cannot be externally verified — internal/brand spec. craft-evals already treats it correctly: it ports the **invariant**, not the specifics (#0066ff, Messina, J/K). `[UNVERIFIED — internal spec, no public URL to confirm]` | signal (as invariant) / noise (as specifics) | **keep-with-caveat** — keep the invariants; the file already discards the brand. Never cite the spec itself as an authority. |
| 19 | **research/measurement-and-ux-laws.md (the raw file)** | 103 extracted claims + 25 adversarial verdicts, unsynthesised | It is explicitly raw material with a "verify before using" header; verdicts inside are high-quality (verbatim primary checks). | signal (as evidence store) / noise (as a citable doc) | **keep-with-caveat** — mine it for VERIFIED primaries; never cite the capture file itself in an argument |

---

## 2. Replacements for the cut / weak chunks

Design canon is mostly books, specs, and design systems — not repos. Named at the right class.

| cut / weak chunk | the authority that does the job properly |
|---|---|
| #16 Miller 7±2 as an item-cap | **No replacement rule is needed** — the honest finding is "there is no valid item-count law." For the real residue (grouping), **Cowan (2001)** for the ~4-chunk limit and **chunking** as the transferable idea. `[VERIFIED — Cowan 2001 referenced across research-file verdicts, accessed 2026-07-20]` |
| #17 Fitts / Hick / Tesler as gating laws | For target size: **WCAG 2.2 SC 2.5.8** (normative floor) + **Parhi/Karlson/Bederson 2006** (empirical anchor). For choice architecture and "don't make the user think," the practitioner authority is **Steve Krug, *Don't Make Me Think, Revisited*, 3rd ed. (New Riders, 2014, ISBN 978-0321965516)** — human-judged, not a deterministic gate. `[VERIFIED — https://www.amazon.com/dp/0321965515, accessed 2026-07-20]` |
| #9 the 80ms motion floor (unsourced) | **Material Design Motion** (#11) + **Val Head, *Designing Interface Animation*** (#12) for the sourced end of motion timing; keep 80ms explicitly labelled as a house heuristic until a primary is found. `[VERIFIED — see #11, #12]` |
| #8 the 100ms "instant" threshold | Pin it to **Miller (1968), "Response time in man-computer conversational transactions"** and **Nielsen (1993), *Usability Engineering* / "Response Times: 3 Important Limits"** on next fetch. `[UNVERIFIED — named as the correct authority but not fetched this session]` |
| #13 the Deque 57% vendor claim (for the automation-ceiling narrative) | The claim is fine *if attributed as vendor*. The neutral OSS artifact behind it is **axe-core itself** (`github.com/dequelabs/axe-core`) — cite the tool + its "incomplete" result category as the mechanized boundary, and **Playwright's a11y docs** for the vendor-independent statement that automation catches only a subset. `[VERIFIED — axe-core README + Playwright a11y docs (research-file), accessed 2026-07-20]` |
| #6 platform target minimums (as "evidence") | Reframe as design-system **conventions**: **Apple HIG** and **Material Design** are the correct sources *for their own platforms*, cited as conventions, with WCAG 2.5.8 as the cross-platform normative floor. `[VERIFIED — see #2, #6, #11]` |
| design-token / neutrals tooling (the "neutrals are chosen" + one-scale rules in design.md) | **Style Dictionary** (`github.com/amzn/style-dictionary`, Amazon UX, OSS 2017) is the canonical token-transformation engine if the loop ever externalises its scale/tokens. `[VERIFIED — https://styledictionary.com/ + AWS OSS blog, accessed 2026-07-20]` |

---

## 3. The UX authority landscape — honest, not forced

**Why UX has no single monolith the way software does.** Software converged on **John Ousterhout, *A Philosophy of Software Design*** (1st ed. 2018, 2nd ed. 2021) as a near-consensus principal-engineer signal because software design is a **single discipline with one artifact** (the codebase) and a shared value function (complexity). `[VERIFIED — https://web.stanford.edu/~ouster/cgi-bin/book.php + Amazon 9781732102200, accessed 2026-07-20]`

UX has no equivalent because it is **three disciplines wearing one name**, each with its own lineage and its own "canonical" book:
- **HCI / cognitive science** (why humans succeed or fail with artifacts) — academic, empirical.
- **Interaction design** (how software behaviour should be structured) — practitioner methodology.
- **Visual / UI craft** (type, colour, space, hierarchy) — closer to graphic-design tradition.

No book spans all three with authority, so any "the one UX book" claim is really a claim about which of the three axes you care about. The honest answer is: **no monolith; here are the four that matter, each owning one axis.**

**Ranked shortlist (the working canon).**

| rank | work | axis it owns | why it earns the rank | tag |
|---|---|---|---|---|
| 1 | **Don Norman, *The Design of Everyday Things*, Revised ed. (Basic Books, 2013)** | HCI / cognition — affordances, signifiers, mapping, feedback | The closest thing to a UX monolith: it defines the *vocabulary* (affordance, signifier, mapping) the whole field now argues in. Broad, foundational, discipline-defining. | `[VERIFIED — https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/, accessed 2026-07-20]` |
| 2 | **Alan Cooper et al., *About Face: The Essentials of Interaction Design*, 4th ed. (Wiley, 2014)** | interaction design — behaviour, goal-directed design, personas | The methodological backbone of how software should *behave*; originated personas and goal-directed design. The interaction-design counterpart to Ousterhout. | `[VERIFIED — https://www.wiley.com/en-us/About+Face...-p-9781118766576, accessed 2026-07-20]` |
| 3 | **Steve Krug, *Don't Make Me Think, Revisited*, 3rd ed. (New Riders, 2014)** | usability heuristics — self-evidence, cognitive load, testing | The most-applied practitioner text; turns "reduce thinking" into checkable habits. Owns the pragmatic, ship-it-and-test axis. | `[VERIFIED — https://sensible.com/dont-make-me-think/ + Amazon 9780321965516, accessed 2026-07-20]` |
| 4 | **Wathan & Schoger, *Refactoring UI* (2018)** for a developer audience — or **Robin Williams, *The Non-Designer's Design Book* (Peachpit, 4th ed. 2015)** (CRAP: Contrast, Repetition, Alignment, Proximity) for a general one | visual / UI craft — hierarchy, spacing, colour, type | The visual-craft axis the academic canon ignores. **Not a foundational-vs-companion ranking** (an earlier draft's error, corrected). Both cover the *same* visual-craft layer, indexed differently: Williams teaches the four print/graphic fundamentals as transferable *theory* for any reader; *Refactoring UI* hands a **developer** copy-pasteable UI recipes and is explicitly *not* a fundamentals deep-dive. Pick by **audience × need**. For this loop — a dev/PM learning design — **Refactoring UI is the working primary** (tactics in the learner's own language); Williams is the *why-it-works* backstop that transfers off the web. | `[VERIFIED — Refactoring UI: https://www.refactoringui.com/ (dev-targeted tactics, per publisher + reviews) · Williams: https://www.peachpit.com/store/non-designers-design-book-9780133966152, accessed 2026-07-20]` |

Specialist authorities that sit *under* the canon for specific loop mechanisms: **Thomas & Johnston, *The Illusion of Life*** (motion principles) and **Val Head, *Designing Interface Animation*** (interface motion); **WCAG** (accessibility floor); **Rodden et al. HEART** and **Basili et al. GQM** (measurement).

**Top pick + why-not-monolith:** *The Design of Everyday Things* is the single best answer if forced to name one — it is the field's shared vocabulary. But it is **not** a monolith the way Ousterhout is: it says almost nothing about interaction behaviour (Cooper), pragmatic usability testing (Krug), or visual craft (Refactoring UI). Naming it "the UX book" would strand three of the four axes the loop actually gates on.

---

## 4. Complementarity plan — one loop that both PRACTICES and TEACHES design

Each kept source is mapped to the loop mechanism it feeds and the design skill it grounds. The
loop's PEDAGOGY layer (learning science) is what converts any of these into a *lesson* — it exists
and is out of scope here; this section only routes the substance.

| kept source | loop mechanism it feeds | design skill it grounds |
|---|---|---|
| WCAG 1.4.3 (#1) | **deterministic gate** (contrast check) | legibility contrast |
| WCAG 2.5.8 (#2) | **deterministic gate** (target geometry/spacing) | hit-area / accidental-activation safety |
| NN/g Empty States (#3) | **deterministic gate** (state-matrix, per-artifact declared states) | designing the states a screen owes |
| Material Motion (#11) [the 400ms band's real source] + Doherty 1982 (#7, only for "faster is materially better," not the 400ms number) | **deterministic gate** (motion-duration band, feedback-latency probe) | perceived responsiveness |
| Illusion of Life / Staging (#10) + Val Head (#12) | **cold-audit brief** (HUMAN_ONLY: is motion communicating or decorating?) | motion as meaning, not ornament |
| Refactoring UI (#4-canon) | **deterministic gate** (hierarchy levers) + **cold-audit brief** | size · weight · contrast · spacing hierarchy |
| Parhi 2006 (#5) | **cold-audit brief** (target-size judgement, scope-aware) | evidence-bounded sizing |
| Deque/axe-core + Playwright (#13) | **the automation ceiling itself** — tells the gate where to stop and hand off | knowing what a machine *cannot* certify |
| HEART (#14) + GQM (#15) | **cold-audit brief** (what does this screen owe; goals→signals→metrics) | measuring the right thing, not the easy thing |
| Norman / Cooper / Krug (#1-3 canon) | **the teaching triad** (senior-designer comparison after each feedback) | the conceptual vocabulary lessons are taught in |

**Why this fits both jobs.** The deterministic gates make the loop *practice* design well (a build
either clears the sourced floor or it does not). The cold-audit brief + teaching triad make it
*teach* Devansh, by pairing each machine verdict with the human-judged question the machine cannot
answer and the named authority that owns it. The split is deliberate: the gate is where a source is
**enforced**; the audit brief is where a source is **argued**; the triad is where a source is
**taught**. A source that can only be argued (Parhi, Staging, HEART) is never wired as a gate — that
is the whole point of the automation-ceiling sources (#13).

---

## Verification log

| citation | status |
|---|---|
| WCAG 1.4.3 Contrast (Minimum) | VERIFIED (this session) |
| WCAG 2.2 SC 2.5.8 Target Size | VERIFIED (research-file, primary) |
| NN/g Empty States in Application Design | VERIFIED (this session) |
| NN/g Touch Targets (1cm, defect framing) | VERIFIED (research-file) |
| Parhi, Karlson & Bederson 2006 | VERIFIED (research-file, primary PDF) |
| Apple HIG 44pt / Material 48dp / Fluent / BBC (as conventions) | VERIFIED (research-file) |
| Doherty & Thadani 1982 — "faster/sub-second response is materially better" | VERIFIED (primary, directional claim) |
| Doherty & Thadani 1982 — the precise "400ms" cutoff | UNVERIFIED (Trident audit: traces to secondary retellings, not the primary paper) |
| Disney Staging — Thomas & Johnston, Illusion of Life 1981 | VERIFIED (this session) |
| Material Design Motion (duration & easing) | VERIFIED (this session) |
| Val Head, Designing Interface Animation 2016 | VERIFIED (this session) |
| Deque / axe-core 57% (as vendor claim) + Playwright a11y | VERIFIED (research-file) |
| HEART — Rodden, Hutchinson & Fu, CHI 2010 | VERIFIED (research-file, primary) |
| GQM — Basili, Caldiera & Rombach 1994 | VERIFIED (research-file, primary) |
| Miller 7±2 misapplication (+ Cowan 2001 ≈4) | VERIFIED (research-file) |
| Norman, Design of Everyday Things, 2013 | VERIFIED (this session) |
| Cooper et al., About Face 4th ed. 2014 | VERIFIED (this session) |
| Krug, Don't Make Me Think Revisited 3rd ed. 2014 | VERIFIED (this session) |
| Wathan & Schoger, Refactoring UI 2018 | VERIFIED (this session) |
| Robin Williams, The Non-Designer's Design Book, Peachpit 4th ed. 2015 (CRAP) | VERIFIED (this session; added as the general-audience counterpart to Refactoring UI's dev-targeted tactics — same layer, different reader, NOT ranked above it) |
| Ousterhout, A Philosophy of Software Design 2018/2021 | VERIFIED (this session) |
| Style Dictionary (OSS) / axe-core (OSS) | VERIFIED (this session / research-file) |
| 100ms "instant" perception threshold | UNVERIFIED (primary not fetched; Miller 1968 / Nielsen named) |
| 80ms motion floor ("glitch") | UNVERIFIED (no primary; house heuristic) |
| Fitts 1954 / Hick's Law / Tesler's Law as gating sources | UNVERIFIED (primaries not fetched; cut as gates) |
| Superhuman design spec | UNVERIFIED (internal, no public URL) |

**Counts: VERIFIED = 21 · UNVERIFIED = 5.** Every UNVERIFIED item is either cut from gating or
explicitly labelled a house heuristic in §1 — none is presented as a confident authority.

**Trident audit trail (Phase 2–3).** A decorrelated Sonnet auditor web-verified the load-bearing
citations independently. One misattribution was caught and corrected — the Doherty "400ms" figure was
tagged VERIFIED but had been checked against secondary retellings, not the primary paper; it is now
demoted to UNVERIFIED and the 400ms band boundary is re-grounded in Material Motion. Robin Williams'
*The Non-Designer's Design Book* was added (verified; the audit had it as "…Guide", corrected to
"…Book"). A later correction (post-audit) fixed a *reasoning* error rather than a citation one: the
draft had ranked Williams "more foundational" than *Refactoring UI* and demoted the latter to
"companion." That conflated authority-by-breadth with fit-to-audience. Both texts cover the same
visual-craft layer; the right axis is the reader — for a dev/PM, *Refactoring UI*'s tactics are the
working primary, Williams the transferable-theory backstop. This is the exact failure mode — a
confident-but-unchecked citation, or a plausible-but-mis-axed judgement — that the RAT gate's
mandatory VERIFIED/UNVERIFIED tagging and the decorrelated audit existed to surface.
