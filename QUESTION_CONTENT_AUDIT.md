# Question and feedback audit

Scope: Quiz (including the shared multiplayer, Championship, Deep Dive and comparison generators), Clue Duel and Atom Quiz. Completed September 2026.

## Editorial rule

Keep the answer short and explicit. Follow it with one connected explanation, usually two sentences, that explains a mechanism, gives a worked example, or clears up a misconception about the topic asked. Then show exactly one separately labelled Fun fact, selected once when generating the question. Prefer a different topic and avoid repeats within a session; do not turn the explanation into a miniature element biography.

New real-world questions must have an authored prompt, a readable Clue Duel clue and a focused explanation. Do not build questions by deleting element names from an arbitrary paragraph. Where evidence is thin, use a well-supported property question or a smaller question pool.

## Findings and changes

| Area | Finding | Change |
| --- | --- | --- |
| Quiz feedback | Two random facts were appended to every answer | Removed the enrichment; each category now explains its own concept |
| Multiplayer choices | Element choices sometimes contained unrelated facts | Choices now contain only the requested answer |
| Fact and use questions | Several generators recycled the same fact, sometimes with blanks or multiple unrelated clues | Consolidated and expanded to 73 authored question/clue/explanation pairs; removed the duplicate famous-use bank |
| Extraction | Scrubbed source paragraphs were awkward and often repeated by the explanation | Added seven focused process questions with explanations |
| Clue Duel | Redacted paragraphs, repetitive clues and no explanation at the reveal | Five readable clues, each adding a detail, followed by the shared explanation; distinct explanations are selected first |
| Atom Quiz | 69 wordings included repeated concepts and shallow restatements | Rewrote every explanation and added 16 applied questions, giving 85 wordings; grouped equivalent concepts so a session uses each at most once |
| Fun facts | User requested one random fact alongside the focused explanation | Added a 40-fact pool, selected for low topic overlap, with no fact reuse until the pool is exhausted; shown and read aloud after the explanation |
| Scientific wording | Mass number was conflated with atomic mass; electrons described as orbiting planets; stellar origins overgeneralised | Corrected these distinctions and narrowed prompts where needed |
| Answer validity | A neutron question offered the same correct quark combination twice | Removed the equivalent duplicate |
| Generated distractors | Compounds and isotope counts could admit multiple correct choices | Filtered distractors using the tested property; excluded abbreviations that do not show the relevant symbol |
| Comparisons | Price rankings depended on stale estimates; danger scores lacked exposure context; tied values were possible | Removed price/danger questions and rejected tied physical comparisons; removed carbon from ordinary melting-point comparisons |
| Radioactivity | An element was assigned a single half-life without naming its isotope | Removed that question; ask whether stable isotopes exist instead |
| Reading time | Bot answers in Clue Duel and Atom Quiz advanced before longer feedback could be read | Both now wait for Next, matching Quiz |

Correct answers, incorrect final answers and skipped multiplayer Clue Duel rounds all expose an explanation. Read-aloud controls use the same text. Existing scoring and Championship changes are preserved.

## Source checks

These primary sources informed the scientific corrections and selected expanded examples. The entire underlying element/comparison numeric dataset was not independently remeasured or exhaustively re-sourced during this editorial audit.

- [DOE: electrons](https://www.energy.gov/science/doe-explainselectrons): probability descriptions, energy levels and photon emission.
- [DOE: isotopes](https://www.energy.gov/science/doe-explainsisotopes): proton identity and differing neutron counts.
- [CERN: subatomic particles](https://home.cern/science/physics/subatomic-particles/): elementary particles and nucleon structure.
- [NRC: radiation basics](https://www.nrc.gov/about-nrc/radiation/health-effects/radiation-basics): decay, radiation types and half-life.
- [NASA: origins of gold](https://science.nasa.gov/universe/stars/neutron-stars/magnetars/where-does-gold-come-from-nasa-data-has-clues/): early-universe light elements versus later heavy-element formation.
- RSC element pages: [copper](https://periodic-table.rsc.org/element/29/copper), [silicon](https://periodic-table.rsc.org/element/14/silicon), [americium](https://periodic-table.rsc.org/element/95/americium), [aluminium](https://periodic-table.rsc.org/element/13/aluminium), [iron](https://periodic-table.rsc.org/element/26/iron), [chlorine](https://periodic-table.rsc.org/element/17/chlorine), [sodium](https://periodic-table.rsc.org/element/11/sodium), [helium](https://periodic-table.rsc.org/element/2/helium), [phosphorus](https://periodic-table.rsc.org/element/15/phosphorus), and [caesium](https://periodic-table.rsc.org/element/55/caesium).

## Verification

Expansion source checks include RSC pages for [gallium](https://periodic-table.rsc.org/element/31/gallium), [indium](https://periodic-table.rsc.org/element/49/indium), [zirconium](https://periodic-table.rsc.org/element/40/zirconium), [niobium](https://periodic-table.rsc.org/element/41/niobium), [nickel](https://periodic-table.rsc.org/element/28/nickel), [cerium](https://periodic-table.rsc.org/element/58/cerium), [titanium](https://periodic-table.rsc.org/element/22/titanium), [germanium](https://periodic-table.rsc.org/element/32/germanium), [RSC cobalt](https://edu.rsc.org/elements/cobalt/2020006.article), [NIST on the second](https://www.nist.gov/si-redefinition/second-introduction), and [NIBIB on MRI](https://www.nibib.nih.gov/science-education/science-topics/magnetic-resonance-imaging-mri).

Run `npm run test:questions` for deterministic checks against the actual game generators. It exercises all difficulties, all 118 elements in Deep Dive, every Atom Quiz wording, all curated pairs, and full Clue Duel pools. It checks valid answer indices, distinct choices, compound/isotope ambiguity, readable nonempty feedback, absence of placeholders and repeated Atom Quiz concepts.

Run `npm run build` for TypeScript and production compilation. The feedback components and bot/skip transitions were also inspected in source. Browser visual and interaction checks could not run because the Browser runtime reported no connected browsers; they remain a verification limitation.
