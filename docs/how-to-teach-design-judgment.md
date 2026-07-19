# Which way builds an opinionated staff designer: the evidence

Question: should design-loop keep teaching AFTER a change (exposition), or lead with the
senior decision as a question BEFORE the change (pretest)? Decided on sources, not taste.

## Verdict

Lead with the question, but ONLY because design-loop already supplies the two things that
normally make "just struggle at it" fail in a taste domain. The pretest is not sufficient on
its own. The evidence is a chain, and the weakest link is the one worth staring at.

## The sources, and what each actually establishes

| # | source | establishes | boundary |
|---|--------|-------------|----------|
| 1 | Kornell, Hays & Bjork 2009 (JEP:LMC); Richland, Kornell & Kao 2009 (JEP:Applied) | attempting an answer BEFORE being told, even wrongly, beats being told first. The pretesting / errorful-generation effect | shown mostly on facts/word-pairs; durability past 24h confirmed |
| 2 | Kapur 2014 (Cognitive Science); Sinha & Kapur 2021 (Review of Educational Research, meta-analysis) | struggle-before-instruction ("productive failure") produces deeper CONCEPTUAL understanding and better TRANSFER than instruction-first. This is the version that matters for judgment, not recall | ONLY with a structured consolidation phase after the struggle. Pure discovery does not work |
| 3 | Collins, Brown & Newman 1989; Collins, Brown & Holum 1991 | expertise transfers only when expert THINKING is made visible: modeling, coaching, scaffolding, articulation, reflection, fading. Standard teaching hides the reasoning | needs an expert model to observe, not just an outcome |
| 4 | Schön 1983 *The Reflective Practitioner*; 1987 *Educating the Reflective Practitioner* | design judgment is built in the studio-critique loop: make, get critiqued, ARTICULATE the reasoning behind a choice, turn tacit taste into explicit argument | judgment forms through articulation under critique, not through absorbing rules |
| 5 | Kahneman & Klein 2009 (*American Psychologist* 64:515-526) | skilled intuition is real, but forms ONLY in a high-validity environment: regular patterns + repeated practice + rapid valid feedback. Absent those, confidence grows without skill | **this is the catch. See below** |
| — | Dunlosky et al. 2013 | retrieval practice + spacing are the only two "high utility" study methods. Already the basis of the `learn` kit | low-utility: rereading, highlighting, summarizing |

## The catch that decides it (source 5)

Kahneman & Klein: intuition becomes real expertise only where the environment is **predictable**
and feedback is **rapid and valid**. Where it is not, "subjective experience is not a reliable
indicator of judgment accuracy" and you get confident, biased taste instead of skill.

Design aesthetics is, by default, a **low-validity environment**:
- feedback is delayed (ship, wait, maybe a metric moves)
- feedback is noisy and contested (taste, politics, confounds)
- so a designer can practise for years and grow more confident without growing more correct

That is the trap the naive read of pretesting/productive failure walks into. "Just wrestle with
the screen and you'll develop taste" is FALSE in a low-validity domain. You'd develop confidence.

## Why the answer is still "lead with the question"

Because design-loop was already built to convert design from low-validity to high-validity, and
that is exactly the missing precondition:

| Kahneman-Klein requirement | what supplies it in design-loop |
|---|---|
| rapid, valid feedback | the deterministic gate + craft-evals + state-matrix + cold auditor: a same-minute, non-noisy signal |
| an expert model to compare against (source 3, 4) | the senior-designer reveal after each answer |
| consolidation after struggle (source 2) | the reveal + the craft-term teach + the spaced deck (`track`) |
| articulation under critique (source 4) | he commits a stance in words, then it is critiqued against the reveal |

So the pretest is the trigger, and the existing machinery is the four conditions that make the
pretest actually build skill rather than confidence. Neither half works alone:
- pretest without the valid feedback signal → confident bad taste (the Kahneman-Klein trap)
- feedback signal without the pretest → the CURRENT approach: correct, but it trains recognition
  of terms, not the reflex of forming an opinion at a cold screen

## What this changes

Current loop: feedback → change → teach term. Teaches vocabulary (recognition). Does not
rehearse forming a stance, because the stance is handed over before the term appears.

Proposed loop: screen → senior decision posed as a hard question → HE commits a stance →
reveal + change + compare + term → spaced. Rehearses the exact target skill (source 1, 2),
makes expert thinking visible (source 3), forces articulation under critique (source 4), inside
a now-high-validity environment (source 5).

## The one failure mode to watch

Source 2's boundary: productive failure only beats instruction-first WITH consolidation, and
source 5: only with VALID feedback. So the question must be genuinely hard (a forced choice with
real tradeoffs, not a quiz with one obvious answer), and the reveal must be a real senior
position, not a rationalization of whatever he happened to say. A soft question or a flattering
reveal collapses the whole thing back to exposition. If the questions get soft, revert.

## Citations
- Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance subsequent learning. *J. Exp. Psychol. LMC*.
- Richland, L. E., Kornell, N., & Kao, L. S. (2009). The pretesting effect. *J. Exp. Psychol. Applied*.
- Kapur, M. (2014). Productive failure in learning math. *Cognitive Science* 38(5).
- Sinha, T., & Kapur, M. (2021). When problem solving followed by instruction works: Evidence for productive failure. *Review of Educational Research* 91(5).
- Collins, A., Brown, J. S., & Newman, S. E. (1989); Collins, Brown & Holum (1991). Cognitive apprenticeship: Making thinking visible.
- Schön, D. (1983). *The Reflective Practitioner*; (1987) *Educating the Reflective Practitioner*.
- Kahneman, D., & Klein, G. (2009). Conditions for intuitive expertise: A failure to disagree. *American Psychologist* 64, 515-526.
- Dunlosky, J., et al. (2013). Improving students' learning with effective techniques. *Psych. Science in the Public Interest*.
