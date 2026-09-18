# Educational Game Series Plan

Status: proposed; implementation has not started.

## Objective

Use ElementalQuiz as the foundation for a series of educational games. Build a shared game engine with interchangeable subject packs and visual themes, so new subjects require mainly content and artwork rather than copied gameplay code.

## First step: fork the project

Fork this repository into a separately named repository before making architectural changes. This plan is recorded here for handover; the implementation belongs in the fork.

- Keep the existing ElementalQuiz repository, release process and deployed game independent.
- Start the fork from a known, tested commit and record that baseline.
- Give the fork its own app identity, deployment destination and release configuration. Review inherited workflows before enabling publishing so it cannot deploy over the original game.
- Review the repository licence and permissions for reused content, images, fonts and sounds before distributing the new series.
- Run the existing build, question audit and interaction tests in the fork before changing behaviour.
- Decide the fork's name, ownership and hosting destination before creating or publishing it. Creating the fork is a later action, not part of writing this plan.

## Architecture

### Shared engine

Own the rules and behaviour common to every subject:

- Solo, two-player and bot formats.
- Player turns, round progression, timers and result submission.
- Quick, Standard and Epic championships.
- Scoring and explicit per-mode championship contributions.
- Rewind checkpoints, with earlier actions locked after Next or handover.
- Profiles, progress, achievements and leaderboards.
- Session-wide question variety and repetition prevention.
- Accessible controls, responsive layouts and clear selection feedback.

The engine must not import chemistry data or assume that every item has an atomic number, symbol or position in a periodic table.

### Subject packs

Each subject supplies its content and supported gameplay capabilities:

- Stable subject and item identifiers.
- Names, images, symbols and classifications where relevant.
- Questions, answers, explanations, related fun facts and sources.
- Difficulty pools, plausible distractors and ordered clue sequences.
- Matching relationships, sorting properties and category-selection rules.
- Subject-specific exploration screens or challenges when needed.
- A manifest declaring supported modes, labels, defaults and content version.

Keep rich domain models inside each pack. The Elements pack can retain its chemical properties; Animals should not need empty chemistry fields.

Expose small, typed interfaces to the engine, such as generating a question, matching round, classification grid, clue sequence or ordering challenge. Do not introduce a generic plugin loader or content management system unless later requirements justify one.

### Visual themes

Keep presentation separate from subject data:

- App title, logo, mascot and introductory text.
- Colours, typography, backgrounds and sounds.
- Display labels for difficulty levels, ranks and achievements.

Use stable internal difficulty identifiers with configurable display names. Theme changes must not alter scoring or answer correctness. Preserve readable contrast and obvious selected states in every theme.

## Mapping existing modes

| Existing mode | Shared mechanic | Example adaptation |
| --- | --- | --- |
| Quiz Battle | Multiple-choice questions | Animal habitats or country capitals |
| True or False Blitz | Judge a statement | Statements about animals or geography |
| Clue Duel | Identify an item from five clues | Guess an animal from behaviour and appearance |
| Symbol Pick | Identify a representation | Choose the flag belonging to a country |
| Atomic Order | Sort by a defined property | Put historical events in chronological order |
| Element Match | Match related cards | Animal and picture; country and capital |
| Family Finder | Select an item in a category | Find a mammal or a European country |
| Atom Quiz | Subject-specific challenge | Retain atomic structure in the Elements pack |

Enable modes only when a pack supports them well. Championships must use the enabled mode list and validate that enough modes are available.

Do not force chemistry-specific layouts onto other subjects. Elements keeps consecutive atomic-number grids, including Scientist's 4×4 board. Other packs may supply shuffled or meaningfully ordered grids. Define how sorting handles equal values and how matching handles multiple valid relationships.

## Content quality contract

Each authored question should have:

- A stable question ID and an underlying knowledge/fact ID.
- Subject, topic, relevant item IDs and difficulty.
- Clear wording, accepted answers and unambiguous distractors.
- A focused explanation that expands on what was asked.
- A pool of fun facts linked to the item or question topic.
- Source references, review status and content version.

Track knowledge IDs across a session, including championship legs where practical. Rewording the same fact must not bypass repetition prevention. For example, sulfur's atomic number and sulfur's proton count test the same knowledge.

Select one relevant fun fact after an answer. Avoid repeating the prompt, explanation or a previously shown fact. If the relevant pool is exhausted, omit the extra fact rather than use an unrelated one.

Difficulty should affect the knowledge required, clues and distractor similarity as well as board size. Use reviewed content rather than live-generated questions for the first release.

Validate content before shipping:

- Required fields, stable IDs, references and assets exist.
- Correct answers are valid and choices are distinct.
- Questions do not accidentally reveal the answer.
- Each classification round contains an accepted answer.
- Clues are accurate and follow the pack's intended progression.
- Each difficulty and session length has enough varied content.
- Explanations and facts pass human readability and accuracy review.

## Implementation phases

### Phase 0 — Establish the fork and baseline

Complete the fork steps above. Document existing gameplay rules and protect them with regression tests, especially championship totals, three-round timed matches, player handovers and rewind boundaries.

Acceptance: the fork builds and passes the existing tests; its deployment cannot overwrite ElementalQuiz.

### Phase 1 — Introduce packs without changing gameplay

- Make Elements the first subject pack.
- Move chemistry-specific data, labels and question generation behind pack interfaces.
- Extend the existing game catalogue to resolve enabled modes and pack-specific labels.
- Introduce visual theme tokens and separate app identity from gameplay.
- Preserve the existing Elements experience while changing where its configuration comes from.

Acceptance: Elements remains playable in all existing formats, with equivalent rules and no lost progress.

### Phase 2 — Prove the design with two mechanics

- Extract matching and category selection first.
- Make their screens consume pack-provided round data.
- Centralise turn progression, deferred result submission and rewind behaviour for these modes.
- Preserve three-round timed Match/Hunt behaviour and separate player turns.
- Create a small, reviewed Animals pack with images and categories.

Acceptance: Elements and Animals use the same two gameplay implementations without chemistry conditionals in shared screens.

### Phase 3 — Generalise the remaining reusable modes

- Extract quiz, true/false, clues, representation selection and ordering.
- Share session generation, difficulty handling and repetition tracking.
- Reduce duplicated rules between solo screens and the large two-player screen incrementally.
- Keep chemistry-only activities inside the Elements pack.
- Build championships from each pack's supported modes.

Acceptance: both packs support a coherent championship, and unsupported modes are hidden rather than broken.

### Phase 4 — Isolate progress and package the series

- Include subject ID, content version and rules version in stored results and relevant leaderboard/configuration keys.
- Separate subject progress and leaderboards; explicitly decide whether profiles and cosmetic rewards are shared.
- Use a new storage namespace for the fork. Provide a tested, non-destructive Elements import/migration if existing progress is brought across.
- Keep original saved data intact and make migration safe to repeat.
- Support separate branding, app manifests, icons, cache names and deployment paths.
- Choose the initial release format: one app with subject selection or separately branded apps built from the same codebase.

Acceptance: subjects cannot mix scores or overwrite one another's progress; independent builds and deployments remain isolated.

### Phase 5 — Validate the template with a third subject

Choose another subject and add a small pack using the documented interfaces. Record where engine changes were necessary and refine only abstractions demonstrated to be useful.

Acceptance: most work is content, artwork and configuration. Adding the pack does not require copying gameplay screens or rewriting scoring.

## Testing strategy

- Keep the existing build, question audit and rewind interaction tests.
- Run common contract tests against every subject pack.
- Add seeded generation tests for variety, pool exhaustion and valid answers.
- Test solo, human-versus-human and bot turns across supported modes.
- Test score accumulation, all three timed rounds, final results and replay resets.
- Test rewinding before submission and the lock after Next or handover.
- Test championships with different enabled-mode combinations.
- Test storage separation and migration without deleting original data.
- Visually check mobile layouts, long names, images and selection states in each theme.

## Scope boundaries

Do not begin with a full rewrite, separate copied repositories for every subject, a marketplace, an authoring CMS or live AI question generation. Keep one shared series codebase in the fork and extract behaviour incrementally.

The first milestone is Elements plus a small Animals pack sharing matching and category selection. This is the proof that should guide the larger framework.

## Decisions before implementation

1. Fork name, repository owner and deployment destination.
2. Confirm Animals as the second subject and its intended age/reading range.
3. Choose an initial multi-subject app or separately branded releases.
4. Decide whether to offer import of existing Elements progress.
5. Define the initial reviewed content pool and artwork sources.

## Definition of success

A new subject can be added mainly through reviewed content, assets and configuration. Gameplay fixes improve every subject, subject-specific rules remain possible, and the original ElementalQuiz project continues independently.

## Mobile release plan

The fork should initially continue as a web/PWA project, then be packaged for iPhone and Android with Capacitor. This reuses the Vite/React codebase while leaving room for native features later.

### Release route

1. Give the fork its own app name, bundle identifier, package ID, icons, storage namespace and deployment configuration.
2. Build the web app and test it as an installable PWA on iPhone and Android.
3. Add Capacitor's iOS and Android platforms and keep the web build as the single source of game behaviour.
4. Test on real phones, including offline play, local progress, screen sizes, keyboard/focus behaviour, safe areas, audio and Android back navigation.
5. Release Android through internal testing, closed testing and then Google Play production.
6. Release iPhone through TestFlight and then App Store review.

Android builds can be produced with Android Studio. iPhone builds require Xcode, Apple signing and a Mac or Mac-based build service.

### Existing 2015 MacBook Pro

A 2015 MacBook Pro is not a dependable iPhone release machine. Apple lists recent MacBook Pro models from that period as limited to older macOS versions, while current Xcode requires much newer macOS releases. Check the exact model, but assume it cannot run the current App Store toolchain. See Apple's [Mac compatibility information](https://support.apple.com/en-gb/108052) and [Xcode system requirements](https://developer.apple.com/xcode/system-requirements).

The old Mac can still be used for editing, web development and possibly Android work. Do not rely on unofficial macOS patches for store submission. Use one of these instead:

- A newer Mac, preferably Apple silicon.
- Borrowed or shared access to a current Mac.
- A Mac-based CI/build service such as Codemagic, Bitrise or another appropriately secured provider.

The Windows development machine remains useful for the web and Android sides. The iOS build can be handed to the newer Mac or CI service only when an iPhone release is ready.

### Store and release costs

Apple distribution requires an Apple Developer Program membership, currently US$99 per year. Google Play Console registration is currently US$25 once. These are account costs rather than per-app submission fees. Confirm current prices before enrolling.

Keep the first release free or very low cost. Avoid adding subscriptions, advertising or complex in-app purchases until real user demand justifies them. If paid digital packs are introduced later, use Apple's In-App Purchase and Google Play Billing systems and implement restore purchases, parent-only purchase screens and clear free-versus-paid labelling.
