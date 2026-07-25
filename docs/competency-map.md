# Design-Engineer Competency Map — IC Principal

The competencies a principal-level **design engineer** (a designer who also *builds* — the
Vercel/Linear/Stripe archetype: craft + front-end implementation) must hold, each with a **high bar**
and the **most precise authoritative source** that carries it — a chapter, an essay, a spec section, or a
real case, not a whole book when a chapter is the real authority.

Discipline (carried from the design canon): **a fabricated or misattributed citation is worse than none.**
Every source below was fetched from a primary/publisher page by a decorrelated research pass and tagged
`VERIFIED`; confidence caveats are stated inline. Sibling doc: [`design-canon.md`](./design-canon.md) is the
loop's *teaching* canon; this is the *competency + source* map for an IC principal. They overlap; this one
adds the design-**engineer** half (modern CSS, tokens, performance, inclusive components).

---

## 1. Foundations (the stance-neutral layer)

Foundations come first because they are the one layer true **regardless of which archetype you become**
(§3) — perception and cognition don't care about your taste-vs-data politics.

| bar (principal-level) | source | tag |
|---|---|---|
| Predicts how a novel layout will read *before* building it; names *which* Gestalt law explains a grouping ambiguity; when the user's mental model diverges from the system model, redesigns the **interface**, not the copy | Don Norman, *The Design of Everyday Things*, Rev. Ed. (Basic Books, 2013), **Ch. 1–2** · Interaction Design Foundation, "What are the Gestalt Principles?" | VERIFIED — [jnd.org](https://jnd.org/books/the-design-of-everyday-things-revised-and-expanded-edition/) · [ixdf](https://www.interaction-design.org/literature/topics/gestalt-principles) |

---

## 2. The competency table (all 13, bar + verified source)

| # | competency | bar (principal-level) | source(s) | tag |
|---|---|---|---|---|
| 2 | Visual craft | Hierarchy survives with **color removed** (weight/size/space alone carry it); works from a constrained spacing scale; names *why* a color/contrast choice fails, not just that it "looks off" | *Refactoring UI* (Wathan & Schoger), Ch. 2 "Hierarchy Is Everything," Ch. 3 "Layout & Spacing," Ch. 5 "Working with Color" · R. Williams, *The Non-Designer's Design Book* 4e, Ch. 2–5 | VERIFIED — [refactoringui.com](https://www.refactoringui.com/) · [peachpit](https://www.peachpit.com/store/non-designers-design-book-9780133966152) |
| 3 | Typography | Deliberate modular scale + vertical rhythm (never browser defaults); measure in the 45–90-char range; ≤2 families paired with a stated rationale; an informed, skeptical position on variable fonts | Matthew Butterick, *Practical Typography* — "Line Spacing," "Line Length," "Mixing Fonts," "The Scorpion Express" | VERIFIED — [practicaltypography.com](https://practicaltypography.com/line-length.html) |
| 4 | Interaction & states | Ships the **full state matrix** (ideal / empty / loading / partial / error) as a systemic default, not bolted on when QA complains | Scott Hurff, *Designing Products People Love* (O'Reilly, 2016; excerpt 2015), Ch. 6 — defines "The UI Stack" · A. Harley, "Visibility of System Status," NN/g (2018) | VERIFIED — [oreilly.com](https://www.oreilly.com/content/mechanics-interface-design/) · [nngroup](https://www.nngroup.com/articles/visibility-system-status/) |
| 5 | Motion / animation | Every transition preserves spatial continuity, shows cause→effect, or delivers feedback — can state *which job* each animation does and why its easing/duration serves it | Val Head, *Designing Interface Animation* (Rosenfeld, 2016), Ch. 4 · Josh Comeau, "An Interactive Guide to CSS Transitions" · Dan Saffer, *Microinteractions* (O'Reilly, 2013), Ch. 4 "Feedback" | VERIFIED — [joshwcomeau](https://www.joshwcomeau.com/animation/css-transitions/) · [oreilly](https://www.oreilly.com/library/view/microinteractions/9781449342760/ch04.html) |
| 6 | Design systems / tokens | Tokens architected as **layered decisions** (global → semantic → component) with an explicit naming taxonomy and a platform-agnostic format; components ship with a designed, versioned API | W3C Design Tokens Community Group, *Design Tokens Format Module* (2025.10) · Nathan Curtis, "Tokens in Design Systems" (EightShapes, 2016) · Brad Frost, *Atomic Design*, Ch. 3 | VERIFIED — [designtokens.org](https://www.designtokens.org/tr/2025.10/) · [atomicdesign](https://atomicdesign.bradfrost.com/table-of-contents/) |
| 7 | Front-end implementation | Ships production layouts with Grid/Flexbox as primary tools (not float/JS hacks); reasons about the **layout algorithm**, not trial-and-error; keeps animation on the compositor (transform/opacity), never layout-thrashing | Josh Comeau, "An Interactive Guide to CSS Grid" (2023) · Pickering & Bell, *Every Layout* · Paul Lewis, "FLIP Your Animations" (2015) | VERIFIED — [joshwcomeau](https://www.joshwcomeau.com/css/interactive-guide-to-grid/) · [every-layout.dev](https://every-layout.dev/) · [aerotwist](https://aerotwist.com/blog/flip-your-animations/) |
| 8 | Web performance | Treats **LCP / INP / CLS as design decisions**, not ops metrics — chooses image/font-loading for LCP, reserves layout space against CLS, keeps handlers off the main thread for INP | web.dev — "Web Vitals" (Walton), "Interaction to Next Paint," "Cumulative Layout Shift" | VERIFIED — [web.dev/vitals](https://web.dev/articles/vitals) · [/inp](https://web.dev/articles/inp) · [/cls](https://web.dev/articles/cls) |
| 9 | Accessibility | Builds genuinely operable custom components — correct ARIA roles/states, full keyboard support, **managed focus** (trap/restore/move) — not just a passing automated audit | Heydon Pickering, *Inclusive Components* (2021) · W3C, WCAG 2.2 (Rec. Dec 2024), esp. SC 2.4.7, 4.1.2 | VERIFIED — [inclusive-components.design](https://inclusive-components.design/) · [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/) |
| 10 | Prototyping (code + Figma) | Picks the **cheapest-fidelity medium that answers the open question** — code for interaction/motion/feel, Figma for structure/flow — builds fast, kills without ceremony; a code prototype can graduate to production | "Design Engineering at Vercel" (Vercel, 2024) · Brendan Boyle (IDEO), "Learn More Before You Invest More" (IDEO U, 2019) | VERIFIED — [vercel.com](https://vercel.com/blog/design-engineering-at-vercel) · [ideou](https://www.ideou.com/blogs/inspiration/learn-more-before-you-invest-more) |
| 11 | Research & measurement | Runs/interprets think-aloud sessions without contaminating them; designs a **Goals→Signals→Metrics** system tied to product goals, not whatever's easy to instrument | Rodden, Hutchinson, Fu, "Measuring UX on a Large Scale (HEART)," CHI 2010 · Nielsen, "Thinking Aloud," NN/g · Basili, Caldiera, Rombach, "GQM," 1994 | VERIFIED — [ACM/HEART](https://dl.acm.org/doi/abs/10.1145/1753326.1753687) · [nngroup](https://www.nngroup.com/articles/thinking-aloud-the-1-usability-tool/) · GQM by citation record (primary text not fetched) |
| 12 | Product strategy / business value | Traces a design decision to a **business metric** (revenue, retention, cost-to-serve) in front of an exec; reframes an ambiguous ask into the **right problem** before proposing a solution | Sheppard et al., "The Business Value of Design," McKinsey Quarterly (Oct 2018) · Tim Brown, "Design Thinking," HBR (2008) | VERIFIED — [mckinsey.com](https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/the-business-value-of-design) · [hbr.org](https://hbr.org/2008/06/design-thinking) |
| 13 | Critique & communication | Runs critique that surfaces the **real disagreement** (not taste-policing), separates problem from solution; presents a decision as a narrative with stakes and resolution, not a screen walkthrough | Connor & Irizarry, *Discussing Design* (O'Reilly, 2015) · Quesenbery & Brooks, *Storytelling for User Experience* (Rosenfeld, 2010) | VERIFIED — [oreilly](https://www.oreilly.com/library/view/discussing-design/9781491902394/) · [rosenfeld](https://rosenfeldmedia.com/books/storytelling-for-user-experience/) |

---

## 3. The two axes competence can't rank — and the four archetypes

The table above is *competence* (how good). Practitioners **polarize** along two orthogonal **stance** axes.
These are the "two more categories": not skills, but the choices that turn a competent designer into a
strongly-opinionated one.

- **Axis A — Epistemic stance (how you decide):** cultivated **Taste / conviction** ↔ **Evidence / experimentation**
- **Axis B — Value locus (where you create value):** **Craft / depth** ↔ **Leverage / systems & strategy**

|  | **Craft / depth** | **Leverage / strategy** |
|---|---|---|
| **Taste / conviction** | **The Auteur** — "design *is* the product; research kills the magic" (Rams/Ive lineage). *Fails:* ego, unscalable, data-blind | **The Visionary / Challenger** — "the brief is wrong; here's what you actually need." Reframes, drives the decision. *Fails:* overreaches constraints |
| **Evidence / experiment** | **The Empiricist** — "every opinion is a hypothesis; ship & measure" (growth / Booking.com). *Fails:* local-optimizes to mediocrity (the "41 shades of blue" that drove Bowman out of Google) | **The Strategist / Operator** — "design's job is outcomes and scale, not artifacts" (DesignOps / HEART). *Fails:* drifts to process & decks, loses craft |

Each quadrant is **right in its own domain and wrong when it universalizes.** A principal code-switches
between them; a polarizing practitioner is stuck in one. Learning to see all four is learning to argue with
any of them on their own terms.

---

## 4. The Challenger question — is there a data-backed "winning" archetype?

The Challenger Sale (Dixon & Adamson, Portfolio/Penguin, 2011) clears a hard bar: **person-level,
behavior-coded, outcome-linked** — CEB coded ~6,000 B2B reps on 44 attributes → cluster analysis → 5
profiles → cross-referenced against quota attainment; the **Challenger was 54% of star performers in complex
sales.** `[VERIFIED — the study exists and its finding is as stated; the exact N is corroborated-secondary, not primary-doc-confirmed]`

**No design study clears that bar.** A hard search found nothing that sorts designers into behavioral
profiles and ties profile to measured outcomes. (Near-hit: Begnum et al. 2019, "Five Archetypes of
Interaction Design Professionals" — but it's analysis of *curriculum descriptions*, not coded behavior vs
performance. Disqualified.)

What **is** data-backed is design **value at the company level**, not a designer **archetype**:

| finding | data | headline | evidence strength |
|---|---|---|---|
| McKinsey, *The Business Value of Design* (2018) | ~300 companies, 5-yr, McKinsey Design Index | top-quartile **+32% revenue, +56% TSR** | solid at company level; VERIFIED (numbers corroborated-secondary; primary PDF not fetched) |
| DMI Design Value Index | ~16 design-led firms vs S&P 500, 10-yr | ~**211%** outperformance | real, but hand-picked portfolio → selection bias |
| InVision, *New Design Frontier* (2019) | 2,200+ orgs | maturity model | **self-report** — materially weaker method |
| the confound | — | — | design-led firms may just have better leadership/capital — **correlation, not proven causation** |

**Verdict.** The "Challenger designer" — the **Taste × Leverage / Visionary** quadrant who reframes the
problem and drives the decision instead of taking orders — is a real *practitioner* archetype, but its
evidence is **one level removed**: company financials + self-report maturity, all with confound risk.
The senior, defensible, contrarian position: *"Design has no Challenger Sale. The value data is company-level
and confounded; no outcome-linked evidence shows a designer archetype wins. Design that reframes and drives
strategy correlates with better outcomes — but anyone selling a proven winning-designer personality is
overstating the evidence."*

---

## 5. Honesty log — what was rejected or could not be verified

- **"CRAP" is not Robin Williams' term.** Her book presents Proximity/Alignment/Repetition/Contrast as
  standalone chapters; the acronym is a third-party mnemonic. Cite the chapters/principles, not "the CRAP
  book." (This refines `design-canon.md`, which labels them "CRAP.")
- **"8pt grid"** — a convention, not attributable to one named author/essay; every source was a secondary blog. Not cited.
- **NN/g "Error-Message Guidelines"** — real but scoped to error *copy*; "Visibility of System Status" is broader, used instead.
- **MDN CSS docs / Rachel Andrew's Grid writing** — authoritative but encyclopedic / spread across many posts; no single citable unit that meets the precision rule.
- **Adobe Spectrum / Salesforce Lightning token docs** — product reference, not argued essays; Curtis + the W3C spec are more precise.
- **Jenifer Tidwell, *Designing Interfaces*** — verified (O'Reilly 3e 2020), but a UI-pattern library; wrong fit for the prototyping/research/strategy/critique rows here (it lives in `design-canon.md` for interaction).
- **Confidence caveats:** GQM's primary Wiley text was confirmed by citation record, not fetched; the McKinsey and Challenger-Sale exact figures are corroborated-secondary (primary PDFs timed out) — the *direction* and *existence* are solid, the precise N/percentages carry that one caveat.
