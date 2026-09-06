# Unified Games and Championship Checklist

This checklist tracks the move to one canonical game catalogue. The existing multiplayer games are authoritative and must be preserved. Every canonical game will ultimately support Solo, 2 Players, and Player vs Bot, and will be playable as a Championship leg.

## Agreed product scope

- [x] Preserve the seven existing multiplayer games.
- [x] Keep Championship as a session type rather than a separate game engine.
- [x] Keep non-game features: profiles, Periodic Table, collection, ranks, milestones, voice settings, Elementor, Element Lab, and custom elements.
- [x] Fold duplicate solo games into the preserved multiplayer games only after feature parity is reached.
- [x] Preserve Element Match Hunt and Time Trial as-is; do not merge Element Memory rules into them.
- [x] Preserve Element Match configuration in Championship: Hunt/Time Trial, element pool, pair count, trial target, Hunt target, chosen element, and unlock-after pairs.
- [x] Preserve Atomic Order configuration in Championship: difficulty, challenge rules, tile multiplier, and timed leaderboard category.
- [x] Disable each game's Championship-only option controls whenever that game is not selected.

## Canonical game catalogue

- [x] Quiz Battle
- [x] True or False Blitz
- [x] Element Match
- [x] Clue Duel
- [x] Symbol Pick
- [x] Atomic Order
- [x] Atom Quiz

## Phase 1 — shared foundations

- [x] Create a typed registry containing the seven canonical game IDs.
- [x] Define supported player formats: Solo, 2 Players, and Player vs Bot.
- [x] Define variants and content packs without creating separate game engines.
- [x] Put Quick, Standard, and Epic Championship lengths in the registry.
- [x] Make multiplayer game selection and Championship use the registry.
- [x] Define a versioned, generic completed-game result record.
- [x] Define canonical configuration keys for fair leaderboard categories.
- [x] Define rules for human, guest, and bot identities.

## Phase 2 — consolidate existing duplicates

- [x] Move shared generators and rules out of `TwoPlayerScreen.tsx`.
  - [x] Extract the canonical Symbol Pick generator.
  - [x] Extract the canonical Element Match board generator and types without changing Hunt or Time Trial.
  - [x] Extract the canonical Atomic Order generator, challenge presets, and result types.
  - [x] Extract True or False Blitz generation and rules (the screen now delegates to the canonical generator; remove the unreachable compatibility body during final dead-code cleanup).
  - [x] Extract Clue Duel generation and rules.
- [x] Unify solo Symbol Pick with the multiplayer Symbol Pick engine.
- [x] Retire Element Memory without changing the preserved Element Match rules.
- [x] Fold Element Order into Atomic Order; retain tap-to-swap as an accessible input method.
- [x] Use the same Atom Quiz engine for every player format.
- [ ] Preserve existing saved settings and leaderboard data during migration.

## Phase 3 — Quiz Battle content migration

- [x] Add Classic content from Quick Quiz using the authoritative Quiz Battle question presentation.
- [x] Add Sprint as a timed Quiz Battle rules variant.
- [x] Add Deep Dive as a chosen-element content pack.
- [x] Place Element Deep Dive under Explore while retaining its study-and-quiz flow and leaderboard recording.
- [x] Place Exotic Elements under Explore while preserving eliminate-two hints, half-point retries, and its leaderboard.
- [x] Add Showdown as a comparison content pack.
- [x] Add Exotic Elements as a Quiz Battle content pack, preserving its eliminate-two retry for half-points hint rule.
- [ ] Confirm equivalent scoring across Solo, 2 Players, and Player vs Bot.

## Phase 4 — missing player formats

- [x] Add Solo to Quiz Battle.
- [x] Add Solo to True or False Blitz.
- [x] Add Solo to Element Match.
- [x] Add Solo to Clue Duel.
- [x] Add Solo to Symbol Pick using the canonical multiplayer-first generator.
- [x] Add Solo to Atomic Order.
- [x] Add Solo to Atom Quiz (the existing Solo and versus modes already call the same question generator).
- [ ] Verify 2 Players for all seven games.
- [ ] Verify Player vs Bot for all seven games.

## Phase 5 — individual game leaderboards

- [x] Use one leaderboard service for standalone and Championship results.
- [x] Quiz Battle: rank by score, then accuracy, then time.
- [x] True or False Blitz: rank by score, then time.
- [x] Element Match: rank timed variants by time and shared Hunt by score/time.
- [x] Clue Duel: rank by score, clues used, then time.
- [x] Symbol Pick: rank by score, then time.
  - [x] Record and display the Solo Symbol Pick leaderboard through the generic result service.
  - [x] Record 2 Player and Player vs Bot Symbol Pick results through the same service.
- [x] Atomic Order: rank by time, then attempts.
- [x] Atom Quiz: rank by score, then accuracy, then time.
- [x] Keep Solo, 2 Players, and Player vs Bot categories separate.
- [x] Never add bots themselves to human leaderboards.
- [x] Record a Championship leg through the same result path as a standalone game.
  - [x] Record Quiz Battle, True or False, Clue Duel, Symbol Pick, and Atom Quiz Championship legs through the generic result path.
  - [x] Record Element Match and Atomic Order Championship legs through the generic result path.

## Phase 6 — Championship

- [x] Support Solo Championship using the canonical Solo screens and link every leg to its Championship run.
- [ ] Preserve 2 Player Championship.
- [ ] Preserve Player vs Bot Championship.
- [x] Replace raw-score addition with equal-weight Championship points (100 win / 50 draw / 0 loss).
- [x] Define an exact-combination key from format, size, difficulty, ordered games/variants, and rules version.
- [x] Add a leaderboard for every exact Championship combination that is played.
- [x] Update each individual game's leaderboard when its Championship leg completes.
- [ ] Add Championship history and final breakdowns.

## Phase 7 — navigation and legacy removal

- [x] Replace separate Solo and 2 Player catalogues with one game catalogue and a player-format choice.
- [x] Keep Play, Explore, and Create clearly separated on the home screen.
- [ ] Migrate usable solo quiz history and the existing timed leaderboards.
- [x] Remove the standalone Quick Quiz route after Quiz Battle Classic parity.
- [x] Remove the standalone Element Sprint route after Quiz Battle Sprint parity.
- [x] Remove the standalone Element Deep Dive route after its content-pack parity.
- [x] Remove the standalone Element Showdown route after its content-pack parity.
- [x] Remove the standalone Exotic Elements route and home entry after its Quiz Battle content-pack parity.
- [x] Remove standalone Element Memory from navigation and routing; remove its now-dead styles during final cleanup.
- [x] Replace the standalone Element Order implementation with canonical Atomic Order Solo play.
- [ ] Remove duplicate solo Symbol Pick after unified parity.
- [ ] Remove duplicate solo Atom Quiz after unified parity.
- [ ] Delete obsolete routes, styles, storage keys, and dead code.
- [x] Update README and current in-app catalogue/scoring instructions.

## Release gates

- [ ] No canonical multiplayer game or rule is lost.
- [ ] Existing profiles and custom elements remain intact.
- [ ] Existing leaderboard records are migrated or deliberately retained read-only.
- [ ] Every game works in all three player formats.
- [ ] Every game can run as a Championship leg.
- [x] Leaderboard categories cannot mix incompatible configurations.
- [x] Bots cannot pollute human leaderboards.
- [x] TypeScript and production builds pass.
- [ ] Main flows are visually checked at phone and desktop widths.
