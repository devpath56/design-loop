# video-production — explainers and animation

**This directory is empty of code today, and that is the honest state.** It exists so the workstream
has a home rather than living as a loose handoff file.

Scope: explainer videos and product demos. Distinct from `ui-workbench/` because it shares the loop's
METHOD (make -> check -> gate -> learn, deterministic checks before judgement, decorrelated audit,
teach-gate, forward-only ratchets) and **none of its checkers** — there is no DOM, so axe-core,
contrast, target geometry and the `?state=` matrix do not apply. Any gate here is built from scratch.

Candidate stack, evaluated but NOT chosen (see `../HANDOFF-video-workflow.md` if present):

| category | candidate | licence status |
|---|---|---|
| animate | **GSAP** | 100% free incl. all former Club plugins since Apr 2025 (Webflow) |
| render | **Remotion** | source-available, free <=3 people incl. commercial; $25/seat at 4+. NOT OSI open source |
| compose | **heygen-com/hyperframes** | unverified. HTML-first, agent-first, 7 runtime adapters |
| capture | OpenScreen + ffmpeg | operator-supplied research, not independently verified |

Shared with ui-workbench, at the repo root: `design.md`, `docs/competency-map.md` (esp. #5 motion,
#13 critique/communication, #14 behavior design), the ledgers, and `checks/inspo.mjs` for capturing
reference material.
