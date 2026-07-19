# design.md — the design house-style (SKILL FILE)

The loop reads this every run. Keep it short and opinionated; edit it as your taste sharpens.
**This file is also Hallmark's _locked design system_** — Hallmark reads a project-root `design.md`
first and defers to it, so your taste here overrides Hallmark's defaults.
(Generate/extend it from references with `hallmark study <url|screenshot>` → "lock the DNA" → paste here.)

## Non-negotiables (the gate enforces these)
- **Contrast** — body text ≥ 4.5:1, large text/UI ≥ 3:1 (WCAG AA). Light-gray-on-white is the #1 slip.
- **Names** — every control has an accessible name (icon-only buttons need `aria-label`).
- **No horizontal overflow** at 375px and 1280px.
- **No console errors.**

## Taste (you enforce; Hallmark `audit` helps)
- **Neutrals are chosen, not defaulted** — bias the grey slightly toward the accent hue.
- **One type scale, held.** Headings get `text-wrap: balance`; body ~65ch line length.
- **Both themes** designed (light + dark), not a naive invert.
- **Spend boldness in one place**, keep the rest quiet.

## Anti-slop (reject the on-distribution defaults)
> Hallmark's `audit` is the authoritative anti-slop checker (57 named gates). The reminders below are the
> project-specific subset the loop keeps top-of-mind; let Hallmark be the gate.
- ❌ Inter/Space-Grotesk at default weight as the "safe" face
- ❌ purple→blue gradient hero on white · lone acid-green/vermilion pop on near-black
- ❌ cream `#F4F1EA` + serif + terracotta
- ❌ everything centered · `rounded-lg` everywhere · emoji as section markers · accent bar on every card
- Structural devices (numbering, eyebrows, dividers) must **encode something true**, not decorate.

## Effects (atmosphere)
Reusable background/atmosphere effects live in `effects/`, indexed by `effects/registry.json`.
Ask for one by name ("marble ink japan style") and the **`effects`** skill wires it in.
- Palette is **derived from this file's accent + neutrals**, never a preset's demo colors.
- Text **never sits directly on an effect** — it gets a scrim, and contrast is checked against the
  effect's *brightest* frame, not its average.
- `respectReducedMotion` and `autoPause` stay on; `fallbackBackground` is always set.

## Output shape — every surface this loop generates
Applies to the workbench panel, `design-log.md`, the dashboard, replay, and any future view.
- **Nested bullets and tables only.** No prose paragraphs, no narration.
- **A measurement gets a table row**, not a sentence: `ground : card | 1.09:1 → 17.4:1`, never
  "the old ground was #f4f5f7 against a white card, which is only 1.09:1, so the card had
  nothing to sit on." The table separates the *measurement* from the *meaning* — the reader
  draws the conclusion. That is a 6× compression, not a 20% one, because it changes the data
  structure rather than trimming words.
- **An instruction is an imperative**: "break the centre axis". Not a paragraph explaining why.
- **Anything longer collapses** behind a disclosure. Available on demand, never competing with
  the payload.
- **The thing the reader is meant to take away gets the strongest treatment on the surface** —
  biggest type, own container. If everything is the same weight, the surface has no opinion.

## Copy
- **No em or en dash in UI copy.** ` — ` is an AI-writing tell and almost always stands in for
  a full stop the sentence should have used. Two short sentences beat one spliced sentence.
  (Code comments are exempt — this is a rule about what users read.)
- **No sentence in a table cell.** A measurement gets a label and a number.
- **An instruction is an imperative.** "Break the centre axis", not a paragraph about why.

## Hierarchy — four levers, all measured (`npm run craft`)
**Hierarchy = size + weight + contrast + spacing.** It is a *relationship*, so every rule here
is about the DIFFERENCE between levels, never the values. A closed set of sizes proves nothing:
12/13/14px is three values and one rank.
- **Size** — adjacent steps ≥ **1.1×**. Below that the step exists in the stylesheet and not on
  the screen.
- **Weight** — at least **two** weights in play, or the lever carries no information.
- **Contrast** — adjacent text ranks ≥ **1.2×** luminance apart. This is NOT legibility
  contrast: two greys can both clear AA against the background and still be the same rank.
- **Spacing** — gaps land on a **4px or 8px base** (≥75% of them). Proximity is the strongest
  grouping cue there is; arbitrary gaps group nothing.
- **At least 2 of the 4 levers in play.** Ranking on one axis is fragile — it vanishes for
  anyone who cannot perceive that axis, and gives the eye a single weak cue.

## Craft floor (deterministic — `npm run craft` checks these)
Derived from studying shipped products, but kept as INVARIANTS rather than copied specifics.
Another team's hex codes and key bindings are their brand; only the reason transfers.
- **Focus is designed, not inherited.** A page with zero `:focus` rules is coasting on a
  browser default that varies by platform and whose contrast against *your* colours is
  unverified. Visible ≠ designed.
- **Every control answers to hover.** A control that changes nothing on hover has no state to
  evaluate — and "nothing changed" passes a naive colour-only check vacuously.
- **State is never colour alone.** Pair it with weight, border, position, or icon.
- **The type scale is a closed set** — ≤6 distinct sizes on a screen. More than that is
  accumulation, not a system.
- **Motion sits in 80–400ms and is eased.** Under 80ms reads as a glitch, over 400ms as slow,
  `linear` reads as mechanical.
- **Motion stops under `prefers-reduced-motion`** — verified by observing two frames, not by
  the presence of a media query.
- **First visible response within 100ms** reads as instant; 300ms as responsive. Beyond that
  the interface feels detached from the action.
- **Destructive actions are reversible.** Optimistic UI is only honest if undo exists.

## States to cover
The set is **per artifact, declared by the artifact**, not a universal checklist. A page names
the states it owes in `<meta name="ui-states" content="...">`; state-matrix checks that set.

- **Default (data screens):** loading, empty, error, success. Reason each is designed, not an
  afterthought.
- **"empty" is not universal.** NN/g scopes empty states to screens that hold DATA (no results,
  nothing yet, list cleared). A form has no collection, so forcing an empty state on it invents
  a screen to satisfy a checklist. [NN/g, Empty States in Application Design]
- **Auth / sign-in owes a lockout state.** After repeated failed attempts the credibly-missing
  state is rate-limit / lockout, which carries security weight and is a documented login state,
  not an edge case. [Authgear login UX guide; FusionAuth account-lockout docs]

Sourcing note: the bare "loading/empty/error/success" four is folklore, traceable to design
blogs that disagree with each other, not to an authority. Where a state claim drives a check,
it cites a source or it is labeled opinion.
