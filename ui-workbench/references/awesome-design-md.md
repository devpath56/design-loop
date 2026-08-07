# Core reference — `VoltAgent/awesome-design-md`

**Source:** https://github.com/VoltAgent/awesome-design-md · **MIT** (license vendored alongside the
files) · **~74 brands** · 107k stars on 61 commits.

**What it is:** one `DESIGN.md` per brand, extracted from the live site — YAML frontmatter carrying a
prose analysis plus full token sets, then markdown rules. The premise is that you drop one into a
project root and an agent generates UI in that design language.

**Vendored here, and only these four**, because they are this loop's bar exemplars (`docs/competency-map.md`
§2c). Fetched 2026-08-06:

| file | lines |
|---|---|
| `awesome-design-md/linear.DESIGN.md` | 548 |
| `awesome-design-md/vercel.DESIGN.md` | 736 |
| `awesome-design-md/superhuman.DESIGN.md` | 448 |
| `awesome-design-md/stripe.DESIGN.md` | 487 |

---

## Verdict: substantive, and it is a TOOL, not an authority

The payload was checked rather than assumed. Linear's file is 24KB and carries semantic colour tokens
(`canvas #010102`, `surface-1..4`, `hairline`, `ink`/`ink-muted`/`ink-subtle`/`ink-tertiary`), a display
scale with real tracking (`80px/600/-3.0px`), and named rules. That is a genuine extraction.

**But it is not an authority, and the distinction is load-bearing:**

- **107k stars on 61 commits measures virality, not depth.** Star count is an attention number
  (CF-075: never rank a source by breadth or popularity).
- The claim *"DESIGN.md is a new concept introduced by Google Stitch"* is **UNVERIFIED** here.
- The repo monetises: sponsor slots, plus *"Request a DESIGN.md… private requests delivered
  exclusively to you."* Treat the README's framing as marketing.
- These are extractions made **without the subject companies' participation**. Attribution is to the
  subject, not permission from it.

---

## How to use it, and how not to

**The legitimate use — calibrate your own reading.** You picked Linear, Vercel, Superhuman and Stripe as
per-competency bars. These files are *someone else's written characterisation of the same four systems*.
Read your own reading against theirs and find where you disagree. Disagreement is the signal; matching
is just confirmation.

**The corrosive use — pasting one in to skip the judgement.** Adopting another company's design system
is the opposite of developing taste. It produces work that looks like Linear, which is not the same as
work that is *considered*. `docs/competency-map.md` §2c exists so the bar is a **target to reason
toward**, not a file to copy.

**What they are genuinely good for beyond calibration:** they are token specs, so they are the closest
thing in this repo to worked examples for competency **#6 (design systems / tokens)**. Compare their
layering against the W3C Design Tokens Format Module and Nathan Curtis's global → semantic → component
argument.

---

## Two live contradictions worth holding

**1. Against the four-input school.** A practitioner deck (chase.h.ai, 2026-08-03) states flatly:
*"No 10,000-line design.md. Four inputs."* — aesthetic, reference, intent, guardrails. That is a direct
argument against this repo's whole premise. Both positions are testable and neither is settled:

| this repo | the four-input school |
|---|---|
| a long, complete spec makes the agent consistent | a long spec is ignored; four sharp inputs plus guardrails beat it |

This is competency **#16**'s first real disagreement, and #16 is the one row in the map with no external
authority. Do not resolve it by preference. Run both.

**2. It corroborates our own anti-slop rules, independently.** Linear's file says the accent
*"appears on the brand mark, focus rings, and a few intentional CTAs — never decoratively."* That is
`design.md`'s **"spend boldness in one place, keep the rest quiet"**, arrived at separately. Convergence
from an unrelated source is the strongest evidence either rule has.

---

## Honesty log

- Payload verified by reading Linear's file directly; the other three were fetched and line-counted, not
  read end to end.
- Only 4 of ~74 brands are vendored. The rest are one `curl` away and deliberately not copied.
- MIT license vendored beside the files. If these are ever redistributed, attribution travels with them.
- **No `DESIGN.md` from this collection is wired into any gate.** It is reference material. Nothing in
  `checks/` reads it, and that is intentional — a gate that enforced another company's tokens would be
  enforcing their brand as our constraint.
