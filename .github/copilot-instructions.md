# ElementalQuiz Coding Instructions

Use these instructions for all changes in this repository.

## Project Shape

- This is a standalone React 19 + TypeScript + Vite PWA for kids learning the periodic table.
- Keep the app as a local phase machine in `src/App.tsx`; do not add route-based navigation.
- The app deploys to GitHub Pages at `/ElementalQuiz/`; keep `vite.config.ts` `base` aligned with the repo name.
- Persistent state is local-only through `localStorage`; do not add a backend, accounts, analytics, or remote data dependencies.

## Commands

- Install with `npm install --legacy-peer-deps`.
- Run locally with `npm run dev`.
- Validate before pushing with `npm run build`, which runs `tsc && vite build`.
- GitHub Actions uses Node 20 and `npm install --legacy-peer-deps`.

## TypeScript And React Style

- Use function components and React hooks.
- Keep imports explicit and include `.ts`/`.tsx` extensions for local modules, matching the existing code.
- Prefer `type` imports where values are not needed.
- `noUnusedLocals` and `noUnusedParameters` are enabled. Prefix intentionally unused parameters with `_`.
- Do not use `require()`; use top-level ESM imports.
- Prefer immutable state updates and callback props from screens to `App.tsx`.
- Keep screen props narrow: screens should receive `onBack`, `onComplete`, or `onNavigate` callbacks rather than mutating parent state directly.

## Architecture Boundaries

- `src/screens/` contains full app screens and mode-specific state machines.
- `src/components/` contains reusable visual/game UI such as `QuizCard`, `Elementor`, `PeriodicTable`, and element detail components.
- `src/engine/` contains reusable logic: question generation, scoring, storage, sounds, and text-to-speech.
- `src/data/` contains domain data. Avoid mixing UI behavior into data files.
- Add new quiz modes by updating the `Screen` union in `App.tsx`, wiring the screen there, and adding menu entry points in `HomeScreen.tsx`.

## Game And Learning Design

- The target player is a child around age 8. Keep the experience fun-first and educational second.
- Questions and explanations should use short, clear sentences and age-appropriate vocabulary.
- Wrong answers should teach. Always show the correct answer and a helpful explanation.
- Avoid punishment mechanics such as negative scoring or lost lives.
- Easy and medium modes can use second chances; hard mode can be stricter.
- Keep content scientifically accurate but calm, especially around toxicity, radiation, danger, and historical events.
- Avoid death-centered, violent, graphic, or sensational phrasing.

## Two-Player And Championship

- `src/screens/TwoPlayerScreen.tsx` contains the shared-device two-player modes and Championship orchestration. Preserve its explicit phase/state-machine approach unless a broader refactor is requested.
- Championship games are selected during setup. Do not assume every mode is included; use `selectedChampGames` for configuration and the frozen `activeChampGames` list while a Championship is running.
- Keep Element Match Hunt last in the default Championship order.
- Quick, Standard, and Epic determine per-mode round counts through `CHAMP_SIZE_CONFIG`. Index counts by game mode rather than array position.
- Persist two-player setup through `loadTwoPlayerSettings` and `saveTwoPlayerSettings` in `src/engine/storage.ts`. This includes both difficulties, human/bot mode, Championship size and selected games, rounds, Match pool, target mode, chosen target, unlock count, and Atomic Order settings.
- When adding a two-player mode, update the `GameMode` union, mode selector and setup labels, standalone launcher, Championship label/default/config, live bot-turn handling where relevant, results label, and persisted defaults.

## Atomic Order Rules

- Atomic Order uses saved Easy, Medium, and Hard presets plus a 1×–4× tile multiplier. Do not expose the underlying rule booleans as separate setup controls.
- Base tile counts are Explorer 3, Scientist 4, and Professor 5, using each player's difficulty pool. Multiply the base by the selected multiplier, supporting up to 20 wrapping tiles.
- Easy means direction hints on, penalty off, all tiles initially misplaced, and per-tile green feedback. Medium means directions off, +1 second per wrong guess, all tiles initially misplaced, and per-tile green feedback. Hard means directions off, +1 second per wrong guess, an ordinary randomized unsolved start, and count-only feedback.
- Count-only reports the number of exact positions after a guess but must not identify or colour the individual correct tiles until the whole puzzle is solved.
- Keep tiles hidden while the current player presses **Start Timer** and sees the 3–2–1 countdown. Reveal the tiles and start the race clock only after the countdown finishes. Attempts are unlimited; completion time decides the round point. Attempts are display-only unless the product rules are deliberately changed.
- Players may drag to reorder. Touch/click interaction is a two-tile swap: first tap selects and visibly highlights a tile, tapping it again cancels, and tapping a different tile swaps the pair.
- After checking, green means the exact position is correct. Directional hint and penalty behavior follows the selected Atomic Order preset.
- Once solved, reveal atomic numbers on the tiles and lock the row so it cannot be moved again.
- The bot must always finish but should remain beatable. Preserve clear difficulty separation and avoid unrealistically short completion times.
- Element Match Hunt scoring is explicit: every ordinary pair is 1 point; the target pair is 2 points, and its finder receives another 2-point hunt-win bonus. Do not cap these live scores in Championship mode.

## Quiz Patterns

- Use `DIFFICULTY_CONFIG` from `src/engine/scoring.ts` as the source of truth for difficulty labels, choice counts, timers, point values, second chance behavior, and question categories.
- Difficulty pickers should be data-driven three-line buttons: label, description, mechanical details.
- Question choices must be shuffled and must not duplicate the correct answer.
- Question IDs should be stable enough to avoid duplicates inside a quiz.
- Preserve the `Question` shape in `questionGenerator.ts` unless a broad refactor is intentional.
- Keep deep-dive questions focused on properties of the selected element, not answers that reveal the element name.

## Progress And Storage

- Store all progress in localStorage through `src/engine/storage.ts`.
- Wrap localStorage JSON reads in `try/catch` and return defaults on failure.
- When loading stored objects, merge with default objects so new fields are backfilled.
- Keep quiz history bounded; the existing pattern keeps the last 50 entries with `.slice(-49)`.
- Preserve legacy migration behavior unless deliberately replacing it.

## UI And CSS

- Use the existing dark, card-based visual style and CSS variables in `src/styles.css`.
- Keep mobile portrait and touch use first. Buttons and primary controls should be at least 44px tall where practical.
- Every screen should have a clear way back to the home screen, and destructive actions need confirmation.
- Use `:focus-visible` for keyboard focus and avoid noisy focus outlines on touch.
- Keep Elementor mascot moments on important screens and feedback states.
- Prefer extending existing CSS classes and patterns before introducing new styling systems.

## PWA And Assets

- Keep the app offline-capable through `vite-plugin-pwa`.
- Do not break public asset paths used by the manifest and service worker.
- Inline SVG components are preferred for mascot-like UI that must work offline.

## Code Quality

- Make focused changes; avoid unrelated refactors.
- Preserve existing user data keys unless migration code is included.
- Keep facts, ranks, milestones, and menu text consistent with the app's playful science voice.
- After meaningful code changes, run `npm run build` and fix TypeScript errors before considering the work complete.
