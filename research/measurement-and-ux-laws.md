# Research capture — design measurement & UX-law reliability

Extracted from a background research run before it was stopped. **Unsynthesised** —
individual extracted claims plus adversarial verdicts. Treat as raw material, not a report.
Verify any citation before using it in an argument.

- extracted claims: 103
- verification verdicts: 25

## Claims

- NN/g's recommended minimum touch target is 1cm x 1cm (~0.4in), which is a physical-size recommendation rather than a device-independent-pixel one; at ~96 CSS px/inch this is roughly 38 CSS px, larger than WCAG 2.2 SC 2.5.8's 24x24 CSS px floor and close to Apple's 44pt / Material's 48dp conventions.
  - source quality: secondary
- The 1cm minimum is attributed to a specific empirical study — Parhi, Karlson & Bederson (2006), 'Target size study for one-handed thumb use on small touchscreen devices' (MobileHCI) — meaning at least one platform-adjacent touch-target guideline has a traceable controlled-experiment basis, unlike the undocumented origins of Apple HIG 44pt and Material 48dp.
  - source quality: secondary
- The anthropometric justification for touch-target minimums rests on finger/thumb contact-area measurements — average fingertip width 1.6–2cm and average thumb contact ~2.5cm — attributed to the MIT Touch Lab; note this attribution is loose in the article (no paper, year, or authors given), so it should be qualified rather than cited as a primary source.
  - source quality: secondary
- Real shipping products routinely violate touch-target minimums by an order of magnitude — NN/g documents interactive targets as small as 1–2mm in production apps (Instagram dismiss buttons, David Yurman swatches), which supports the case for mechanizing a minimum-hit-area check in CI rather than relying on design review.
  - source quality: secondary
- NN/g frames undersized targets as a design defect rather than user error, an explicitly normative (not empirical) position — useful as a rhetorical anchor but not itself evidence.
  - source quality: secondary
- WCAG 2.2 SC 2.5.8 (Level AA) sets the minimum pointer target size at 24x24 CSS pixels — not 44pt or 48dp — making the normative accessibility floor substantially smaller than the Apple HIG and Material platform conventions.
  - source quality: primary
- The requirement is satisfiable without resizing the target at all: an undersized target passes if a 24 CSS pixel diameter circle centered on its bounding box does not intersect another target's circle. This makes the criterion a spacing rule as much as a size rule, and is the specific detail an automated checker must implement (geometry over adjacency, not per-element dimension thresholds).
  - source quality: primary
- The stated rationale for 2.5.8 is accidental-activation avoidance for users with dexterity/motor limitations — it is not framed as a Fitts's-Law-derived speed/efficiency optimization, so citing WCAG 2.5.8 as evidence for 'bigger targets are faster to hit' misattributes the criterion's purpose.
  - source quality: primary
- The Understanding document supplies no derivation or empirical citation for the 24px figure itself; its sole related research reference is a single MobileHCI-era touchscreen thumb-target study (ACM DOI 10.1145/1152215.1152260, Parhi, Karlson & Bederson, 2006). Any claim that '24px is empirically established' is therefore weakly supported by the normative source, and a claim that it derives from ISO 9241-411 or platform guidance is unverified here.
  - source quality: primary
- Four exceptions (Equivalent, Inline, User Agent Control, Essential) are judgement-dependent, which caps how far target-size checking can be automated: a rendered-page checker can measure geometry and detect inline/line-height constraint, but cannot determine whether an alternative control is functionally equivalent or whether a presentation is 'essential'.
  - source quality: primary
- In a controlled study with 15 tetraplegic and 18 able-bodied participants, tap-target error rates for motor-impaired and able-bodied users converged at approximately 12 mm, which the authors identify as a good compromise target size — an empirical anchor that sits close to Apple's 44pt (~9mm) and below Material's 48dp (~9mm), and well above WCAG 2.2 SC 2.5.8's 24 CSS px (~6mm).
  - source quality: primary
- For crossing-based (rather than tap-based) selection, larger 17 mm targets were significantly easier for motor-impaired users, indicating that the empirically optimal minimum target size is interaction-technique-dependent rather than a single universal constant.
  - source quality: primary
- Target placement at screen edges has opposite effects by population: it increased tapping precision for motor-impaired users while decreasing able-bodied users' accuracy at small (7 mm) sizes — so edge-anchoring heuristics cannot be validated by a single deterministic rule applied to all users.
  - source quality: primary
- Directional gesturing was the least inclusive of the three tested interaction techniques because of inaccuracy for motor-impaired users, while tapping and crossing performed comparably across both populations.
  - source quality: primary
- Deque claims automated axe-core testing detects 57.38% of accessibility issues by ISSUE VOLUME, based on 13,000+ pages/page-states and ~300,000 issues from first-time audits (WCAG 2.0/2.1 A and AA). Note: this is a vendor report by the company that builds and sells axe — the finding is commercially favorable to the publisher and has not been independently replicated.
  - source quality: primary
- The commonly cited 20–30% automation coverage figure is computed on a different denominator — number of WCAG success criteria testable by automation — not issue volume. The two numbers are therefore not in contradiction; they answer different questions, which is the key qualification a CI pipeline builder must state when citing either.
  - source quality: primary
- The high issue-volume coverage number is driven by concentration: the top 5 WCAG success criteria accounted for over 78% of all issues found, and automation catches most of those. This means the 57% figure reflects that a few high-frequency machine-detectable defects (contrast, alt text, form labels, names) dominate real-world audits — not that automation covers most of WCAG.
  - source quality: primary
- Even by its own vendor's account, fully automated testing is insufficient and must be paired with manual or semi-automated (human-in-the-loop) testing to raise coverage — establishing an automation ceiling that no rule engine alone clears.
  - source quality: primary
- The dataset excludes duplicate occurrences of the same issue (first occurrences only), which is a methodological choice that materially affects the percentage — counting every instance would likely inflate the automated share further, since machine-detectable defects (e.g. repeated contrast failures) recur most.
  - source quality: primary
- INP (Interaction to Next Paint) cannot be accurately measured by lab/synthetic tools, because it depends on when real users choose to interact; lab proxies like Total Blocking Time are explicitly inadequate substitutes. This sets a hard ceiling on what a CI performance check can assert about real-world responsiveness.
  - source quality: primary
- CLS measured in the lab is systematically incomplete: lab measurement covers only above-the-fold shifts during page load, whereas field CLS covers the full page lifespan including shifts triggered by scrolling and post-interaction network requests. A green CI CLS score therefore does not entail a green field CLS.
  - source quality: primary
- Lab measurement structurally overstates load cost relative to real users because lab tests load with a cold cache and do not model the back/forward cache, while real users may hit warm caches and near-instantaneous bfcache restores that are counted in field data.
  - source quality: primary
- Google's own guidance is that field data, not lab data, should drive prioritization when both are available; lab data's legitimate role is narrower — identifying reach opportunities for slower networks and lower-end devices.
  - source quality: primary
- The LCP element itself is not stable between lab and field: a lab test yields one consistent LCP element while real traffic produces many different LCP elements due to screen size, personalization, A/B tests, installed fonts and URL fragments — so a CI assertion about which element is LCP is not generalizable.
  - source quality: primary
- Playwright's official accessibility-testing guidance states explicitly that automated scanning detects only a subset of accessibility problems, and that many can only be found through manual testing — i.e. the vendor itself disclaims full automated WCAG coverage.
  - source quality: primary
- Playwright documents that automated testing cannot detect all types of WCAG violations, so an axe-core/Playwright CI gate cannot be treated as a WCAG conformance claim.
  - source quality: primary
- The class of design issues Playwright's automated a11y integration can deterministically check is narrow and concrete: color-contrast, missing labels on controls/form elements, and duplicate IDs on interactive elements.
  - source quality: primary
- Playwright's recommended methodology is a three-part combination — automated tests plus manual assessment plus inclusive user testing — meaning the automation ceiling is acknowledged in the official workflow rather than only in third-party critique.
  - source quality: primary
- The Playwright documentation does not quantify the proportion of accessibility issues detectable automatically; the commonly cited ~30-57% figures come from other sources (e.g. Deque, WebAIM) and cannot be attributed to Playwright.
  - source quality: primary
- Deque's own axe-core README states that axe-core finds on average 57% of WCAG issues automatically, and additionally returns 'incomplete' results where manual review is required — i.e., the vendor itself caps the fully-automated ceiling at ~57%.
  - source quality: primary
- A Deque/axe-core maintainer (straker) confirms on the record that fully automated testing frameworks such as axe-core catch about 57% of accessibility issues, and that the widely-marketed 80% figure is NOT automated coverage — it requires human-in-the-loop Intelligent Guided Tests in the axe DevTools extension.
  - source quality: primary
- Deque's public marketing page for axe DevTools advertises 80% issue detection without distinguishing automated from semi-automated (human-assisted) coverage, creating a documented discrepancy against the repository's own 57% claim — a concrete caution against citing the 80% number for a CI-only pipeline.
  - source quality: primary
- Both the 57% and 80% figures trace to Deque-authored, self-published sources (deque.com automated-accessibility-testing-coverage page and a Deque 'Semi-Automated Accessibility Testing Coverage Report' PDF), not to independent peer-reviewed research — so the numbers are vendor claims and should be attributed as such.
  - source quality: primary
- axe-core explicitly emits an 'incomplete' result category for checks it cannot decide, which is the mechanized boundary of the automation ceiling: these items are routed to human judgement by design rather than passed or failed.
  - source quality: primary
- Google's own guidance states that lab tools like Lighthouse cannot substitute for field data when measuring Core Web Vitals — a hard ceiling on what a CI performance check can certify about real user experience.
  - source quality: primary
- INP (Interaction to Next Paint) is definitionally a field metric and cannot be measured by Lighthouse during a page-load audit; Lighthouse reports Total Blocking Time as a lab proxy instead.
  - source quality: primary
- The Lighthouse Performance Score is not a reliable predictor of real-world Core Web Vitals outcomes, so gating CI on the composite score is a vanity-metric failure mode.
  - source quality: primary
- Cumulative Layout Shift measured in the lab misses post-load layout shifts, because lab runs only capture a cold page load rather than a full user session.
  - source quality: primary
- Field data (CrUX) can detect that a performance problem exists but frequently lacks the granularity to diagnose its cause, meaning lab and field tooling are complementary rather than substitutable.
  - source quality: primary
- Parhi, Karlson & Bederson (2006) is primary peer-reviewed HCI research published in the ACM MobileHCI '06 proceedings (Helsinki, September 12-15, 2006), authored at University of Oulu and the University of Maryland HCIL — a citable primary empirical source for touch-target sizing, not a secondary blog restatement.
  - source quality: primary
- The study's headline recommendation is 9.2 mm targets for discrete tasks (buttons, radio buttons, checkboxes) and 9.6 mm for serial tasks (e.g. text entry) for one-handed thumb use on small touchscreens — sizes derived from error rate, subjective ratings, and hit response variability combined, not from error rate alone.
  - source quality: primary
- Error rate did not significantly differ once targets exceeded roughly 9.6 mm (discrete) / 7.7 mm (serial) — i.e. the empirical evidence shows a plateau/threshold, not monotonic accuracy improvement with size; only speed continued to improve as targets grew. Any citation claiming 'bigger targets are always more accurate' overstates this source.
  - source quality: primary
- The recommended sizes are scoped to a specific, narrow condition — one hand holding a small touchscreen handheld, thumb input, with target screen position varied because one-handed grip constrains thumb reach. They are not general finger-touch or two-handed/stylus recommendations, and the paper explicitly distinguishes itself from prior stylus and index-finger-on-large-display studies.
  - source quality: primary
- As of 2006 no prior published study had established target-size guidance for thumb interaction on handheld touchscreens — prior guidance covered two-handed stylus use on mobile devices and index-finger use on desktop-sized displays. This dates the empirical foundation that later platform standards (Apple HIG, Material) would have had available.
  - source quality: primary
- Campbell's Law states that the more heavily a quantitative metric is used for social decision-making, the more subject it is to corruption pressures and distortion of the process it monitors — NN/g applies this directly to UX/product metrics, making it a named authority for the 'goal displacement' failure mode in metric selection.
  - source quality: secondary
- Goodhart's Law is stated by NN/g in the popularized Strathern formulation ('When a measure becomes a target, it ceases to be a good measure'), not Goodhart's original 1975 monetary-policy phrasing — so citing this wording as 'Goodhart' is a common secondary attribution that should be qualified.
  - source quality: secondary
- The management aphorism 'if you can't measure it, you can't manage it' is a misattribution to W. Edwards Deming; Deming's actual statement warned against exactly that belief. This is a directly checkable citation-hygiene claim relevant to defending a measurement framework.
  - source quality: secondary
- NN/g's prescribed mitigation for metric gaming is triangulation rather than a single north-star metric: combine multiple quantitative metrics with qualitative user research, and treat data as decision-support rather than decision-determinant — implying a single automated score cannot substitute for human judgement.
  - source quality: secondary
- Metric corruption is documented via concrete product cases, e.g. a streaming service that intentionally complicated cancellation and counted abandoned cancellation attempts as 'saved' accounts — evidence that instrumented funnel metrics can be structurally gamed by design decisions themselves.
  - source quality: secondary
- Goodhart's original 1975 formulation was narrow and statistical — about observed regularities collapsing under control pressure — not the popular design-blog paraphrase; citing the popular version as 'Goodhart's law' is a paraphrase of Strathern, not Goodhart.
  - source quality: secondary
- The widely-quoted phrasing 'when a measure becomes a target, it ceases to be a good measure' is Marilyn Strathern's 1997 generalization, not Goodhart's own words — an attribution error common in product/metrics writing.
  - source quality: secondary
- Campbell's law (1969) predates Goodhart's 1975 formulation and states the corruption-pressure mechanism directly for social indicators, so it has priority as the citation for metric gaming in human systems.
  - source quality: secondary
- Documented real-world instances of metric displacement exist across domains (COVID testing targets, hospital length-of-stay, h-index), supporting the failure-mode list of goal displacement and gaming when a design metric becomes an OKR target.
  - source quality: secondary
- The Lucas critique (1976) is a distinct, later economic result about policy prediction from historical relationships, and should not be conflated with Goodhart's law when arguing about metrics.
  - source quality: secondary
- The HEART framework and the Goals-Signals-Metrics mapping process originate in a peer-reviewed CHI 2010 paper by Kerry Rodden, Hilary Hutchinson and Xin Fu at Google — so it is citable as a primary, peer-reviewed source rather than industry blog folklore.
  - source quality: primary
- The paper's contribution is two distinct artifacts, not one: (a) the HEART framework of user-centred metric categories, and (b) a separate process for mapping product goals to metrics (Goals-Signals-Metrics). Citing HEART without the goals-mapping process omits half the method.
  - source quality: primary
- HEART was motivated specifically by large-scale web application measurement (server-log-scale behavioural and attitudinal data), not by lab usability testing — which bounds where it is the right framework versus ISO 9241-11 or task-based usability measurement.
  - source quality: primary
- The paper's evidence for generalizability is internal to Google — validation is that the framework transferred across the authors' own company's products, not independent external replication.
  - source quality: primary
- Parhi, Karlson & Bederson (MobileHCI 2006) recommend a target size of 9.2 mm for discrete tasks and 9.6 mm for serial tasks for one-handed thumb use on small touchscreens — the empirical study most often invoked (usually second-hand) as the basis for touch-target minimums.
  - source quality: primary
- The study found error rate plateaus rather than declining monotonically with size: no significant error-rate differences above 9.6 mm (discrete) or 7.7 mm (serial), while speed continued to improve as targets grew — so 'bigger is always better' is only true for time, not accuracy.
  - source quality: primary
- The sample was 20 right-handed participants (17 male, 3 female), aged 19-42 (mean 25.7), recruited from a single university computer science department, of whom only 5 had ever used a touchscreen handheld even occasionally — a narrow population that bounds how far the mm figures generalize.
  - source quality: primary
- The measurements were taken on a 2006 resistive stylus-era PDA (HP iPAQ h4155, 240x320, 0.24 mm dot pitch) using a lift-off selection strategy, not a modern capacitive touchscreen — so these numbers predate and do not directly underwrite Apple's 44pt, Material's 48dp, or WCAG 2.2 SC 2.5.8.
  - source quality: primary
- At publication the authors asserted that no prior study had established target sizes for one-handed thumb use — prior recommendations covered stylus-on-handheld and index-finger-on-desktop-display only, meaning pre-2006 target-size guidance cannot legitimately be cited for thumb interaction.
  - source quality: primary
- ISO 9241-11's usability definition was first published as a standard on March 15, 1998, ten years after its first draft in 1988, making it one of the oldest formally standardized (rather than merely popular) usability measurement frameworks.
  - source quality: blog
- The 1998 ISO 9241-11 standard operationalized usability as three measurable constructs — effectiveness, efficiency, and satisfaction — each with concrete example metrics (e.g. percentage of users completing a task; time to complete a task; rating scale for satisfaction).
  - source quality: blog
- ISO 9241-11:1998 was formally withdrawn and replaced by ISO 9241-11:2018, so citing the 1998 edition as the current standard is an attribution error.
  - source quality: blog
- The 2018 revision removed specific guidance on how to measure usability, relocating measurement guidance to ISO/IEC 25022 and ISO/IEC 25066 — meaning ISO 9241-11:2018 alone cannot serve as a metric-selection framework for a measurement pipeline.
  - source quality: blog
- The 2018 revision broadened scope beyond task success to include personal and organizational outcomes and explicit consideration of negative consequences of use (health, safety, security, privacy, trust).
  - source quality: blog
- Miller himself regarded the match between the ~7-item limit on one-dimensional absolute judgment and the ~7-item short-term memory span as a coincidence, not a single unified capacity — so citing '7±2' as one cognitive limit misrepresents the source paper.
  - source quality: secondary
- The 'magical number seven' phrasing was rhetorical on Miller's part, not a stated empirical law, despite being cited as one in design literature.
  - source quality: secondary
- The paper's two findings are separate: absolute-judgment accuracy degrades past roughly five or six distinct stimuli, while memory span in young adults is approximately seven items.
  - source quality: secondary
- Modern working-memory research revises the capacity estimate down to about four chunks in young adults, and lower in children and older adults — so '7±2' is superseded, not current.
  - source quality: secondary
- Capacity is measured in chunks whose size depends on the individual's prior knowledge, so any fixed item-count rule for interface elements has no stable unit to count.
  - source quality: secondary
- Miller's 1956 paper concerned short-term memory capacity, not the number of items an interface should display; applying it to menu design misuses it.
  - source quality: blog
- Miller himself dismissed the number 7 as coincidental rather than a cognitive law, calling it 'only a pernicious, Pythagorean coincidence'.
  - source quality: blog
- Navigation menus are recognition tasks (items stay visible on screen), not recall tasks, so working-memory capacity limits do not bound menu length.
  - source quality: blog
- Cowan (2001) revised the working-memory limit downward to roughly four items, with smaller and more variable limits than Miller's seven.
  - source quality: blog
- The genuinely transferable contribution from Miller for interface design is chunking (grouping related items), not an item-count ceiling.
  - source quality: blog
- Surrogation is a named, distinct psychological failure mode in which a measure of a construct comes to replace the construct itself — the mechanism-level explanation underlying Goodhart's/Campbell's law, framed in the management-accounting literature rather than the economics one. Wikipedia lists Goodhart's law and Campbell's law only in 'See also', so the article asserts adjacency, not derivation.
  - source quality: secondary
- Surrogation occurs from the mere provision of a measure, without any incentive compensation tied to it — falsifying the common assumption that metric-gaming failures require misaligned incentives. Attributed to Choi, Hecht & Tayler (2012, The Accounting Review); the underlying paper was not independently verified beyond this Wikipedia summary.
  - source quality: secondary
- Using multiple performance measures reduces surrogation more effectively than a single measure, and deliberately contradictory proxies are recommended as mitigation — a directly testable design rule for a metrics framework (e.g. arguing for HEART's multi-signal structure over a single north-star metric).
  - source quality: secondary
- Participation effects are specific and asymmetric: involving managers in selecting the strategy reduces surrogation, whereas merely involving them in deliberation does not. This is a falsifiable boundary condition on 'get stakeholder buy-in' advice.
  - source quality: secondary
- Wells Fargo is offered as a worked case in which a proxy metric displaced the strategic construct it stood for, producing fraud. Useful as a concrete example but note this is Wikipedia's interpretive framing of the scandal, not an experimental result.
  - source quality: secondary
- Miller's 7±2 finding concerns short-term memory and unidimensional stimulus discrimination, not the number of items that can be displayed on screen — so citing it to cap menu/nav/list length is a misapplication, per Miller's own stated objection.
  - source quality: secondary
- Edward Tufte explicitly holds that Miller's 1956 paper contains no design rule about how much information to display, i.e. there is no authoritative basis for a 7-item interface limit.
  - source quality: secondary
- Empirical menu-structure research favours broad, shallow navigation over deep narrow hierarchies, contradicting the design prescription derived from 7±2.
  - source quality: secondary
- Link-dense commercial interfaces (e.g. Amazon's 90+ category links) are more usable than sparse alternatives, providing a real-world counterexample to item-count caps.
  - source quality: secondary
- The memory constraint is dissolved when options are visible on screen, because visual presentation removes the need to hold items in short-term memory.
  - source quality: secondary
- Miller (1956) did not assert a genuine capacity limit of seven; he explicitly characterized the recurrence of the number seven as a coincidence and repeatedly warned against taking it literally.
  - source quality: blog
- Miller himself later (1989) stated the number seven was used only as a rhetorical device to link two unrelated research topics, not as a design or capacity rule.
  - source quality: blog
- Applying 7±2 as a cap on UI elements — tabs, dropdown items, links, bulleted lists, radio buttons, checkboxes — is a misapplication traceable to designers not having read Miller's paper.
  - source quality: blog
- Modern working-memory research that controls for chunking places the capacity limit at roughly four items (Cowan 2001), not seven.
  - source quality: blog
- The four-item estimate is itself not settled: the author concedes that current capacity-estimation methods retain methodological flaws even while evidence accumulates around four.
  - source quality: blog
- GQM asserts that measurement must be defined top-down from goals, and explicitly claims a bottom-up (metric-first) approach will not work because observable software characteristics are uninterpretable without goals and models to define context — this is the canonical primary-source statement of the anti-vanity-metric argument.
  - source quality: primary
- GQM specifies a three-level hierarchical model — Conceptual (Goal), Operational (Question), Quantitative (Metric) — which is structurally the same shape as Google's later Goals-Signals-Metrics process, establishing Basili et al. as the prior art HEART's process descends from.
  - source quality: primary
- GQM provides a formal goal template with four slots — purpose, issue, object (product/process/resource), and viewpoint — meaning a GQM goal is not valid unless it names whose viewpoint the measure is taken from; the same metric can yield different values under different viewpoints.
  - source quality: primary
- GQM explicitly admits subjective metrics (viewpoint-dependent, e.g. satisfaction ratings) alongside objective ones, so the framework does not require full automation or instrumented telemetry — it is designed to mix human-judgement measures into the same model.
  - source quality: primary
- GQM originated as a defect-evaluation method for software projects at NASA Goddard Space Flight Center, not as a product-design or UX measurement framework — a boundary condition on citing it as canonical for design decisions.
  - source quality: primary
- WCAG 2.1 SC 2.5.5 Target Size specifies 44 x 44 CSS pixels and is a Level AAA criterion, which means teams targeting the standard AA conformance level are not bound by it — a critical qualification when citing '44px' as an accessibility requirement.
  - source quality: blog
- Apple's Human Interface Guidelines minimum is expressed in points (44 x 44 pt), not pixels, so treating Apple's 44 and WCAG's 44 CSS px as the same unit is a unit error.
  - source quality: blog
- Google's Android/Material 48dp minimum is justified by a physical-size argument (48 device pixels ≈ 9mm, asserted to be the size of a finger pad area) rather than by a cited controlled study.
  - source quality: blog
- Major platform target-size minimums disagree with each other (Apple 44pt, Android 48dp, Microsoft Fluent 40epx/7.5mm, BBC GEL 7mm / 44px with a 32px floor), which is evidence that these numbers are conventional and platform-specific rather than derived from one shared empirical result.
  - source quality: blog
- The empirical grounding usually invoked for target size is Fitts's Law (1954) — establishing that smaller targets raise error rates — not a study that derives any specific pixel value; Nielsen Norman Group similarly gives a physical figure (1cm) and explicitly declines to specify pixels.
  - source quality: blog

## Adversarial verdicts

- refuted: **False** · confidence: high
  - Verified directly against the primary source. The abstract of Rodden, Hutchinson & Fu, "Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications" (CHI 2010), fetched from research.google, reads verbatim: "In this note, we describe the HEART framework for user-centered metrics, as well as a process for mapping product goals to metrics." It further states: "The fram
- refuted: **False** · confidence: high
  - Tried to refute; could not. The primary source (Google Research abstract page for Rodden, Hutchinson & Fu, CHI 2010, "Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications") states verbatim that the authors "describe the HEART framework for user-centered metrics, as well as a process for mapping product goals to metrics." The "as well as" construction is exactl
  - counter-source: None found. Searched for sources disputing the two-part characterization; all located sources (Google Research primary abstract, kerryrodden.com/heart/, Semantic Scholar record, IxDF, Usability Geek, Pratt IXD) affirm HEART and Goals-Signals-Metrics as distinct-but-paired contributions.
- refuted: **False** · confidence: high
  - Primary source verified. The Google Research listing for Rodden, Hutchinson & Fu, "Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications" (CHI 2010) states verbatim in its abstract: "we describe the HEART framework for user-centered metrics" AND "a process for mapping product goals to metrics" — two coordinated but separable deliverables, joined by "as well as,
  - counter-source: No credible contradicting source located. Nearest thing to a counter-consideration is framing, not fact: the paper itself presents HEART and Goals-Signals-Metrics as complementary parts of one method rather than as "two distinct artifacts," and the "omits half the method" clause is the claimant's inference rather than paper text. Secondary sources (kerryrodden.com/heart/, usabilitygeek.com, ixdf.org, amplitude.com) all corroborate the two-component structure.
- refuted: **False** · confidence: high
  - Verified against two independent sources. (1) Google Research's own publication page confirms: authors Kerry Rodden, Hilary Hutchinson, Xin Fu; venue "Proceedings of CHI 2010, ACM Press"; and states the paper introduces "the HEART framework for user-centered metrics, as well as a process for mapping product goals to metrics" — i.e. both HEART and Goals-Signals-Metrics originate there, not in a blo
  - counter-source: No contradicting source located. Nearest thing to a counterpoint is bibliographic: ACM DL pagination (2395–2398, https://dl.acm.org/doi/abs/10.1145/1753326.1753687) shows a 4-page CHI Note rather than a full paper, which qualifies but does not refute "peer-reviewed CHI 2010 paper".
- refuted: **False** · confidence: high
  - Verified against primary and independent bibliographic records. (1) Google Research's own publication page (research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/) lists authors Kerry Rodden, Hilary Hutchinson, Xin Fu; venue "Proceedings of CHI 2010, ACM Press"; and the abstract explicitly states "we describe the HEART framework for user-cen
  - counter-source: No contradicting source found. The nearest thing to a counter-consideration is bibliographic rather than contradictory: ACM DL (dl.acm.org/doi/10.1145/1753326.1753687) records the page range 2395-2398, i.e. a 4-page CHI Note rather than a full paper, and the paper itself is an experience report without controlled empirical validation — neither fact refutes the claim as worded, but both bound how strongly it can be leaned on.
- refuted: **False** · confidence: high
  - Verified against the primary PDF itself, not a secondary summary. I downloaded https://www.cs.umd.edu/users/mvz/handouts/gqm.pdf and decompressed its FlateDecode streams to extract the text (saved at /private/tmp/claude-501/-Users-devanshpathak-Downloads-design-loop/563c02b3-8c1f-4209-89b1-e08699144b79/scratchpad/gqm.txt).

BIBLIOGRAPHIC CHECK: the document's own header reads "THE GOAL QUESTION ME
  - counter-source: No contradicting source found. Only priority qualification: Basili & Weiss, IEEE TSE SE-10(6), 1984, is the earlier primary GQM source; the reviewed PDF is a later encyclopedia restatement. The label "anti-vanity-metric" is anachronistic framing (Ries, ~2011) and is not the paper's own wording.
- refuted: **False** · confidence: high
  - VERBATIM VERIFICATION PASSED. I downloaded https://www.cs.umd.edu/users/mvz/handouts/gqm.pdf and extracted its text with pypdf. The document is "THE GOAL QUESTION METRIC APPROACH" by Victor R. Basili (UMD/UMIACS), Gianluigi Caldiera (UMD), and H. Dieter Rombach (Universität Kaiserslautern) — the Encyclopedia of Software Engineering (1994, pp. 528-532) article. The supporting quote appears word-for
  - counter-source: https://onlinelibrary.wiley.com/doi/10.1002/0471028959.sof142 (van Solingen, GQM entry) and the GQ(I)M / GQM+Strategies literature, which document that original GQM's goal templates were criticized as too generic and lacking explicit business-objective linkage — a limitation of GQM's operationalization, not a refutation of its top-down thesis. Also relevant as priority counterweights for the "canonical" label: Ridgway (1956) ASQ, Campbell (1979), Goodhart (1975).
- refuted: **False** · confidence: high
  - VERIFIED VERBATIM AGAINST PRIMARY SOURCE. I downloaded https://www.cs.umd.edu/users/mvz/handouts/gqm.pdf and decompressed its PDF text streams locally (WebFetch could not parse the binary). Header confirms: "THE GOAL QUESTION METRIC APPROACH", Victor R. Basili, Gianluigi Caldiera, H. Dieter Rombach — UMIACS / Dept. of Computer Science, Univ. of Maryland (the version reprinted in the Encyclopedia o
  - counter-source: https://fileadmin.cs.lth.se/serg/old-serg-dok/docs-masterthesis/62_Lindstrom_draft.pdf and https://en.wikipedia.org/wiki/GQM — document GQM criticisms (non-repeatability across analysts, limited industrial guidance, subjective/easy-to-measure metric selection). These qualify GQM's practical reliability but do NOT contradict the claim, which is about what GQM asserts, not whether GQM works. No source found disputing the top-down assertion itself.
- refuted: **True** · confidence: high
  - The claim is a compound: (1) GQM has three levels — Conceptual/Goal, Operational/Question, Quantitative/Metric; (2) that is "structurally the same shape" as Google's Goals-Signals-Metrics; (3) this "establishes Basili et al. as the prior art HEART's process descends from." Only (1) is supported.

(1) VERIFIED. The supporting quote is an accurate reproduction of Basili, Caldiera & Rombach, "The Goa
  - counter-source: https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/ (CHI 2010 HEART paper landing page — no GQM/Basili reference found); https://kerryrodden.com/heart/ (author's own HEART resource page, surfaced in search with no GQM attribution)
- refuted: **False** · confidence: high
  - Verified directly against the primary PDF (research.google.com/pubs/archive/36299.pdf), not just the landing page. Extracted text confirms every element of the claim:

1. AUTHORS/AFFILIATION — title block reads verbatim: "Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications / Kerry Rodden, Hilary Hutchinson, and Xin Fu / Google / 1600 Amphitheatre Parkway, Mou
  - counter-source: No credible source contradicting the attribution was found. The nearest qualifying source is Jeff Sauro / MeasuringU, "Should You Love the HEART Framework?" (measuringu.com/heart-framework/), which critiques HEART's construct validity and category overlap — but critiques the framework's substance, not its peer-reviewed CHI 2010 provenance, which it accepts.
- refuted: **False** · confidence: high
  - I extracted the full text of the primary source (Basili, Caldiera, Rombach, "The Goal Question Metric Approach," Encyclopedia of Software Engineering, 1994; UMD handout PDF) and both halves of the claim are supported near-verbatim.

(1) Four-slot template: "A GQM model is a hierarchical structure starting with a goal (specifying purpose of measurement, object to be measured, issue to be measured, 
  - counter-source: No credible contradicting source found. Nearest tension: van Solingen & Berghout (1999) and secondary summaries (Wikipedia "GQM"; Wiley Encyclopedia of Software Engineering entry "Goal Question Metric (GQM) Approach") present a five-dimension goal template (object, purpose, quality focus/issue, viewpoint, context), so "four slots" is specifically the 1994 Basili/Caldiera/Rombach form — a qualification, not a refutation.
- refuted: **False** · confidence: high
  - Verified against the primary source itself. I fetched https://www.cs.umd.edu/users/mvz/handouts/gqm.pdf (Basili, Caldiera, Rombach, "The Goal Question Metric Approach", Encyclopedia of Software Engineering, Wiley, 1994) and decompressed the PDF text streams locally rather than relying on a summary.

DIRECT SUPPORT FOR THE FOUR SLOTS — Section 2, describing the GQM hierarchy, states verbatim: "A GQ
  - counter-source: No contradicting source found. The nearest thing to a counterpoint is the five-slot operational template in van Solingen & Berghout, "The Goal/Question/Metric Method" (McGraw-Hill, 1999), which adds a context/environment slot — an extension of the 1994 formulation, not a contradiction of it.
- refuted: **False** · confidence: high
  - Extracted the full text of the cited primary source (Basili, Caldiera & Rombach, "The Goal Question Metric Approach", cs.umd.edu/users/mvz/handouts/gqm.pdf) by decompressing the PDF streams. Both halves of the claim are verbatim-supported, not inferred.

FOUR-SLOT TEMPLATE — direct quote: "A GQM model is a hierarchical structure starting with a goal (specifying purpose of measurement, object to be
  - counter-source: Partial qualification, not refutation: later GQM formulations use a FIVE-slot goal template — GQM+Strategies (Basili et al.) and van Solingen & Berghout's practical guide add context/environment and rename "issue" to "quality focus" (object, purpose, quality focus, viewpoint, context). So "four slots" is accurate specifically for Basili/Caldiera/Rombach 1994 (the cited source) but should not be presented as the sole canonical form. Additionally the same primary source's Objective-vs-Subjective data distinction bounds the viewpoint-dependence claim to subjective metrics and cross-model reuse.
- refuted: **False** · confidence: high
  - Fetched and text-extracted the primary PDF (Parhi, Karlson & Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices," MobileHCI 2006, ACM 10.1145/1152215.1152260). All three components of the claim are directly verified:

(1) Headline numbers. Conclusions section: "Based on our findings, we recommend that target sizes should be at least 9.2 mm for single-target tasks an
  - counter-source: None found. WebSearch for the study and its figures returned only the MSR publication page, ACM DL entry, dblp, ResearchGate, and Semantic Scholar records plus secondary summaries; none dispute or qualify the 9.2/9.6 mm recommendations. Note one search-snippet summary asserted the results "don't contain the specific 9.2 mm and 9.6 mm measurements" — that is a retrieval failure of the summarizer, not a real counter-source; both numbers appear verbatim in the paper's abstract, discussion, and conclusions.
- refuted: **True** · confidence: high
  - The claim bundles a verifiable fact with an unverifiable genealogy, and the genealogy fails.

(1) SUPPORTED HALF: The quote does establish GQM's three levels. Basili/Caldiera/Rombach, "The Goal Question Metric Approach" (cs.umd.edu/users/mvz/handouts/gqm.pdf) states the measurement model has Conceptual (GOAL), Operational (QUESTION), Quantitative (METRIC) levels. No dispute there.

(2) UNSUPPORTED
  - counter-source: OpenAlex reference list for Rodden, Hutchinson & Fu, CHI 2010, DOI 10.1145/1753326.1753687 (15 refs, no Basili/GQM); https://kerryrodden.com/heart/ (author's own account credits no prior art)
- refuted: **False** · confidence: high
  - Verified by extracting the full text of the primary source (Parhi, Karlson & Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices," MobileHCI'06, pp. 203-210). The claim is supported at both the abstract and Discussion/Conclusions level.

ABSTRACT: "there were no significant differences in error rate between target sizes >= 9.6 mm in discrete tasks and targets >= 7.7 
- refuted: **True** · confidence: high
  - The claim has two parts. Part 1 (GQM's three levels: Conceptual/Goal, Operational/Question, Quantitative/Metric) IS accurately supported by the primary source quote from Basili, Caldiera & Rombach's GQM paper (cs.umd.edu/users/mvz/handouts/gqm.pdf). Part 2 — "establishing Basili et al. as the prior art HEART's process descends from" — is unsupported and contradicted by the primary source on the ot
  - counter-source: Rodden, K., Hutchinson, H. & Fu, X. (2010), "Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications," CHI 2010 — full text at https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/36299.pdf ; complete 15-item reference list contains no Basili/GQM entry, the strings "Basili"/"GQM"/"Goal-Question" appear nowhere in the paper, and the Goals-Signals-Metrics section states "We developed a simple process..." with no attribution to prior work.
- refuted: **False** · confidence: high
  - VERIFIED AGAINST PRIMARY SOURCE. Extracted full text of Parhi, Karlson & Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices," MobileHCI 2006 (ACM DOI 10.1145/1152215.1152260), pp. 203-210.

(1) NUMBERS — exact match. Abstract: "we found that target size of 9.2 mm for discrete tasks and targets of 9.6 mm for serial tasks should be sufficiently large for one-handed th
  - counter-source: No credible counter-source. A WebSearch AI summary stated "7.6 mm for serial tasks," but this is a search-engine synthesis error (likely garbling the paper's 7.7 mm error-rate-only serial threshold). Both the primary PDF (microsoft.com) and the independent UMD HCIL tech report 2006-11 abstract (cs.umd.edu/hcil/trs/2006-11/2006-11.htm) state 9.6 mm. Verified against extracted PDF text, not a rendering.
- refuted: **False** · confidence: high
  - Verified against the primary PDF itself (extracted text from https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf — Parhi, Karlson & Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices," MobileHCI 2006, ACM DOI 10.1145/1152215.1152260).

1) The supporting quote is near-verbatim from the abstract: "...significant differences in err
  - counter-source: No credible contradicting source found. The nearest tension is internal: the serial-task threshold (≥7.7 mm) rests on a non-significant post-hoc result with modest n, and the paper's own headline *recommendations* (9.2 mm discrete / 9.6 mm serial) are higher than the error plateau — so citing "7.7 mm is enough" as a design rule would misuse the paper even though the claim's statistical characterization is correct.
- refuted: **False** · confidence: high
  - Verified against the primary source (W3C WAI Understanding SC 2.5.8, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Confirmed: (a) conformance level is AA, (b) the normative text is "The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when:" — five exceptions (Spacing, Equivalent, Inline, User Agent Control, Essential). The quote supports the c
  - counter-source: No credible counter-source found. Closest thing to dissent: w3c/wcag GitHub issue #1894 (public feedback on SC 2.5.8), which critiques the criterion's testability and exception complexity but does not dispute the 24x24 CSS px / Level AA facts. Note also that the claim as worded omits SC 2.5.5 Target Size (Enhanced) 44x44 CSS px (Level AAA) — not a refutation, but the nearest fact that could be used to argue the framing is incomplete.
- refuted: **False** · confidence: high
  - Verified against the primary PDF itself (extracted full text from https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf; local extraction at /private/tmp/claude-501/-Users-devanshpathak-Downloads-design-loop/563c02b3-8c1f-4209-89b1-e08699144b79/scratchpad/t.txt).

1) The supporting quote is VERBATIM from the paper's abstract: "The results showed that while speed
- refuted: **False** · confidence: high
  - Verified against the W3C primary sources directly. (1) https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html confirms SC 2.5.8 Target Size (Minimum) is Level AA and normatively requires targets for pointer input to be "at least 24 by 24 CSS pixels", with five exceptions (Spacing, Equivalent, Inline, User Agent Control, Essential). (2) The normative standard itself, https://www.w3.or
- refuted: **False** · confidence: high
  - Verified against the primary source by decompressing and extracting the raw text streams of the paper PDF (Parhi, Karlson & Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices," MobileHCI'06, Sept 12-15 2006, Helsinki; ACM 1-59593-390-5/06/0009; DOI 10.1145/1152215.1152260).

Every element of the claim is directly supported by verbatim text:

1. SCOPE (one hand, smal
  - counter-source: No credible contradicting source found. The only contradicting artifact encountered was a WebFetch auto-summary of the PDF itself, which fabricated details (claiming a "Nexus 5 smartphone" as the 2006 test device and a "9-10 mm" recommendation); it was discarded as machine hallucination after direct extraction of the PDF text contradicted it.
- refuted: **False** · confidence: high
  - VERIFIED against the primary PDF (extracted text of Parhi, Karlson & Bederson, "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices," MobileHCI 2006, ACM DOI 10.1145/1152215.1152260). The supporting quote is verbatim from the abstract: "The results showed that while speed generally improved as targets grew, there were no significant differences in error rate between target size
  - counter-source: No credible refuting source found. Nearest tension: Sears et al. 1993 and Mizobuchi et al. 2005 (both cited within this same paper) report continued error improvement with size, but in ranges at/below the plateau or in multi-tap conditions, so they qualify generalization rather than contradict the claim. Also note a common secondary-source error: some summaries (e.g. web write-ups) conflate the statistical thresholds (9.6/7.7 mm) with the paper's recommendations (9.2 mm discrete / 9.6 mm serial).
- refuted: **False** · confidence: high
  - Verified against the primary PDF (extracted text from https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf — Parhi, Karlson & Bederson, MobileHCI 2006, pp. 203-210). Every element of the claim is directly and literally supported:

1. SCOPE (one hand, thumb, small handheld). Title: "Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices." Abstra
  - counter-source: No credible counter-source found. The nearest tension is secondary popularization (NN/g "Touch Targets on Touchscreens", https://www.nngroup.com/articles/touch-target-size/) restating the finding as a scope-free ~1cm minimum, which illustrates rather than refutes the claim's point about narrow scope.
