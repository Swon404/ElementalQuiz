import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { createServer } from 'vite';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
globalThis.window = { localStorage };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
let renderer;
const label = node => node.children.map(child => typeof child === 'string' ? child : label(child)).join('');
const buttons = () => renderer.root.findAllByType('button');
const button = text => { const found = buttons().find(b => label(b).includes(text)); assert.ok(found, `Button ${text} exists`); return found; };
const click = async b => { assert.ok(!b.props.disabled, `Button ${label(b)} enabled`); await act(() => b.props.onClick()); };
const rewind = () => button('Rewind');
const mount = async (name, props = {}) => {
  if (renderer) await act(() => renderer.unmount());
  memory.clear();
  const { default: Screen } = await server.ssrLoadModule(`/src/screens/${name}.tsx`);
    await act(() => { renderer = create(React.createElement(Screen, { playerId: 'guest:test', playerName: 'Test', onBack() {}, onComplete() {}, championshipRoundCount: 2, ...props })); });
};
const storedResults = () => JSON.parse(memory.get('elementalquiz_game_results_v1') ?? '[]');
try {
  const { default: QuizCard } = await server.ssrLoadModule('/src/components/QuizCard.tsx');
  const { generateQuiz } = await server.ssrLoadModule('/src/engine/questionGenerator.ts');
  const quizQuestion = generateQuiz('explorer', 1)[0];
  let committedAnswers = 0;
  await act(() => { renderer = create(React.createElement(QuizCard, {
    question: quizQuestion, difficulty: 'explorer', streak: 2, questionNumber: 1, totalQuestions: 2,
    onAnswer: () => committedAnswers++, timedMode: false,
  })); });
  const quizChoices = () => buttons().filter(b => String(b.props.className).includes('choice-btn'));
  await click(quizChoices()[(quizQuestion.correctIndex + 1) % quizQuestion.choices.length]);
  await click(rewind());
  assert.ok(quizChoices().every(b => !b.props.disabled), 'Second chance restored');
  await click(quizChoices()[quizQuestion.correctIndex]);
  assert.equal(committedAnswers, 0, 'Score waits for Next');
  await click(rewind());
  await click(quizChoices()[quizQuestion.correctIndex]);
  await click(button('Next'));
  assert.equal(committedAnswers, 1);
  assert.ok(rewind().props.disabled);
  for (const [name, choiceClass, nextLabel] of [
    ['SoloTrueFalseScreen', 'tf-true', 'Next'],
    ['SoloClueDuelScreen', 'snap-choice', 'Next'],
    ['SymbolPickScreen', 'symbol-choice', 'Next'],
    ['AtomQuizScreen', 'choice-btn', 'Next'],
    ['ExoticQuizScreen', 'choice-btn', 'Next'],
  ]) {
    await mount(name);
    await click(button('Start'));
    assert.ok(rewind().props.disabled, `${name}: initially disabled`);
    const scoreText = () => renderer.root.findAll(node => typeof node.type === 'string' && /score|streak/.test(node.props.className ?? '')).map(label);
    const previousScore = scoreText();
    let choices = buttons().filter(b => String(b.props.className).includes(choiceClass));
    if (!choices.length) choices = buttons().filter(b => /choice/.test(b.props.className ?? ''));
    assert.ok(choices.length, `${name}: choices found`);
    await click(choices[0]);
    assert.ok(!rewind().props.disabled, `${name}: action enables rewind`);
    await click(rewind());
    assert.deepEqual(scoreText(), previousScore, `${name}: score and streak restored`);
    assert.ok(rewind().props.disabled, `${name}: single-use undo`);
    assert.equal(storedResults().length, 0);
    // Finish the question, revealing more clues if necessary.
    let guard = 0;
    const nextAction = b => label(b).startsWith(nextLabel) || (name === 'ExoticQuizScreen' && label(b).startsWith('Skip'));
    while (!buttons().some(nextAction) && guard++ < 12) {
      const available = buttons().filter(b => /choice|tf-true/.test(b.props.className ?? '') && !b.props.disabled);
      if (!available.length) break;
      await click(available[0]);
    }
    const next = buttons().find(nextAction);
    assert.ok(next, `${name}: Next available`);
    await click(next);
    assert.ok(rewind().props.disabled, `${name}: Next locks prior answer`);
  }

  await mount('FamilyFinderScreen');
  await click(button('Start'));
  assert.ok(rewind().props.disabled);
  await click(buttons().find(b => b.props['aria-label']?.includes('atomic number')));
  await click(rewind());
  assert.ok(rewind().props.disabled);
  const { FAMILY_SINGULAR } = await server.ssrLoadModule('/src/games/familyFinder.ts');
  const { elements: familyElements } = await server.ssrLoadModule('/src/data/elements.ts');
  const prompt = renderer.root.findAllByType('h2').map(label).join('');
  const category = Object.keys(FAMILY_SINGULAR).find(category => prompt === `Find ${FAMILY_SINGULAR[category]}.`);
  const familyTiles = () => buttons().filter(b => b.props['aria-label']?.includes('atomic number'));
  const initialWindow = familyTiles().map(b => b.props['aria-label']);
  for (const tile of familyTiles()) {
    const number = Number(tile.props['aria-label'].match(/atomic number (\d+)/)[1]);
    if (familyElements[number - 1].category === category) await click(tile);
  }
  await click(button('Check answer'));
  assert.equal(familyTiles().filter(b => b.props['aria-pressed']).length, 1, 'Selecting another tile replaces the selection');
  assert.ok(renderer.root.findAllByProps({ role: 'status' }).some(node => label(node).includes('Correct!')));
  await click(rewind());
  assert.ok(!buttons().some(b => label(b).startsWith('Next')), 'Rewinding the check reopens the selection');
  assert.ok(familyTiles().some(b => b.props['aria-pressed']), 'Rewinding check preserves selected tiles');
  await click(button('Check answer'));
  await click(button('Next'));
  assert.ok(rewind().props.disabled);
  assert.ok(familyTiles().every(b => !b.props['aria-pressed']), 'Next clears selection');
  assert.notDeepEqual(familyTiles().map(b => b.props['aria-label']), initialWindow, 'Next shows a different window');

  await mount('ElementOrderScreen');
  await click(button('Start Game'));
  await click(button('Start Timer'));
  assert.ok(rewind().props.disabled, 'Timer start is not an answer');
  const tiles = () => buttons().filter(b => String(b.props.className).startsWith('atomic-order-tile '));
  const original = tiles().map(label);
  await click(tiles()[0]); await click(tiles()[1]);
  assert.notDeepEqual(tiles().map(label), original);
  await click(rewind());
  assert.deepEqual(tiles().map(label), original, 'Order swap undone');
  assert.equal(storedResults().length, 0);

  // Solved Atomic Order appears immediately, but Rewind removes that result again.
  let ordered = tiles().map(label);
  const number = text => Number(text.match(/#(\d+)/)?.[1]);
  const target = [...ordered].sort((a, b) => number(a) - number(b));
  // Undo restores the previously selected tile; deselect it before arranging.
  const selectedTile = tiles().find(tile => tile.props.className.includes('selected'));
  if (selectedTile) await click(selectedTile);
  for (let i = 0; i < target.length; i++) {
    ordered = tiles().map(label);
    const source = ordered.indexOf(target[i]);
    if (source !== i) { await click(tiles()[i]); await click(tiles()[source]); }
  }
  await click(button('Check Order'));
  assert.equal(storedResults().length, 1, 'Solved order is saved immediately');
  await click(rewind());
  assert.equal(storedResults().length, 0, 'Undo does not leave a saved win');
  await click(button('Check Order'));
  assert.equal(storedResults().length, 1, 'Replayed solution is saved immediately');
  await click(button('Watch Replay'));
  assert.ok(button('Back to round'), 'Completed round offers an immediate replay');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
  assert.ok(label(renderer.root).includes('Order checked'), 'Replay visibly shows the check result');
  assert.ok(button('Replay Again'), 'Finished replay offers to play again');
  await click(button('Back to round'));
  await click(button('Next Round'));
  assert.equal(storedResults().length, 1, 'Next does not duplicate the order result');
  const orderReplay = storedResults()[0].replay;
  assert.equal(orderReplay?.kind, 'atomic-order', 'Atomic Order result includes a replay');
  assert.ok(orderReplay.data.initialTiles.length > 0, 'Replay stores the starting board');
  assert.ok(orderReplay.data.actions.some(action => action.type === 'select'), 'Replay stores tile selections');
  assert.ok(orderReplay.data.actions.some(action => action.type === 'swap'), 'Replay stores swaps');
  assert.ok(orderReplay.data.actions.some(action => action.type === 'check'), 'Replay stores checks');
  await click(button('Replay'));
  assert.ok(button('Back to leaderboard'));
  await click(button('Pause'));
  assert.ok(button('Continue'));
  await click(button('Restart'));
  await click(button('Back to leaderboard'));
  assert.ok(rewind().props.disabled);

  await mount('SoloElementMatchScreen', { initialOptions: { mode: 'hunt', pairCount: 2, huntTimed: false } });
  await click(button('Start Game'));
  const cards = () => buttons().filter(b => String(b.props.className).startsWith('match-card '));
  await click(cards()[0]);
  assert.ok(cards()[0].props.className.includes('flipped'));
  await click(rewind());
  assert.ok(!cards()[0].props.className.includes('flipped'));
  assert.equal(storedResults().length, 0);

  await mount('SoloElementMatchScreen', { championshipRunId: 'rewind-test', championshipHuntRounds: 2, initialOptions: { mode: 'hunt', pairCount: 1, huntTimed: false } });
  await click(button('Start Game'));
  await click(cards()[0]); await click(cards()[1]);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
  assert.equal(storedResults().length, 1, 'Completed Hunt is saved immediately');
  await click(rewind());
  assert.equal(storedResults().length, 0, 'Rewind removes the completed Hunt result');
  assert.ok(cards()[0].props.className.includes('flipped'));
  assert.ok(!cards()[1].props.className.includes('flipped'));
  await click(cards()[1]);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
  assert.equal(storedResults().length, 1, 'Replayed Hunt is saved immediately');
  await click(button('Next Round'));
  assert.equal(storedResults().length, 1, 'Next does not duplicate Hunt');
  assert.ok(rewind().props.disabled);

  for (const mode of ['tf-blitz', 'symbol-pick', 'atom-quiz', 'clue-duel']) {
    await mount('TwoPlayerScreen', { initialMode: mode, initialPlayer2Mode: 'human' });
    await click(button('Start'));
    assert.ok(rewind().props.disabled, `${mode} versus: starts locked`);
    const choice = buttons().find(b => /choice|tf-true/.test(b.props.className ?? '') && !b.props.disabled);
    assert.ok(choice, `${mode}: answer button`);
    await click(choice);
    assert.ok(!rewind().props.disabled, `${mode} versus: can undo`);
    await click(rewind());
    assert.ok(rewind().props.disabled, `${mode} versus: undo consumed`);
    let guard = 0;
    const isNext = b => label(b).startsWith('Next') && !label(b).startsWith('Next clue');
    while (!buttons().some(isNext) && guard++ < 12) {
      const choice = buttons().find(b => /choice|tf-true/.test(b.props.className ?? '') && !b.props.disabled);
      assert.ok(choice); await click(choice);
    }
    await click(buttons().find(isNext));
    assert.ok(rewind().props.disabled, `${mode} versus: Next locks undo`);
  }

  await mount('TwoPlayerScreen', { initialMode: 'atomic-order', initialPlayer2Mode: 'human' });
  await click(button('Start'));
  await click(button('Start Timer'));
  for (let tick = 0; tick < 4; tick++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 1050)); });
  const versusOrderTiles = () => buttons().filter(b => String(b.props.className).startsWith('atomic-order-tile '));
  const atomicNumberForTile = tile => familyElements.find(element => label(tile).includes(element.name))?.atomicNumber;
  for (let index = 0; index < versusOrderTiles().length; index++) {
    const remaining = versusOrderTiles().slice(index);
    const lowest = Math.min(...remaining.map(atomicNumberForTile));
    const sourceOffset = remaining.findIndex(tile => atomicNumberForTile(tile) === lowest);
    if (sourceOffset > 0) { await click(versusOrderTiles()[index]); await click(versusOrderTiles()[index + sourceOffset]); }
  }
  await click(button('Check order'));
  assert.ok(button('Watch Replay'), 'Versus Atomic Order offers an immediate replay');
  assert.equal(storedResults()[0].replay?.kind, 'atomic-order', 'Versus Atomic Order saves replay data');
  const versusLeaderboardReplay = buttons().find(b => label(b).includes('Replay') && !label(b).includes('Watch'));
  assert.ok(versusLeaderboardReplay, 'Versus Atomic Order leaderboard shows Replay');
  await click(versusLeaderboardReplay);
  assert.ok(button('Back to leaderboard'));
  await click(button('Back to leaderboard'));

  // A complete timed player turn can be rewound, but not after handing over.
  await mount('TwoPlayerScreen', { initialMode: 'element-match', initialPlayer2Mode: 'human' });
  await click(button('Hunt'));
  await click(button('On'));
  await click(button('Start'));
  await click(button('Start Timer'));
  for (let tick = 0; tick < 3; tick++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 1050)); });
  const { elements } = await server.ssrLoadModule('/src/data/elements.ts');
  const seen = new Map();
  let finalIndex;
  for (let moves = 0; moves < 200 && !buttons().some(b => label(b).startsWith('Pass to')); moves++) {
    const available = cards().map((card, i) => ({ card, i })).filter(({ card }) => !card.props.disabled);
    const open = cards().findIndex(card => card.props.className.includes('active-p1'));
    const openElement = seen.get(open);
    const partner = open >= 0 ? available.find(({ i }) => seen.has(i) && seen.get(i) === openElement) : null;
    const candidate = partner ?? available.find(({ i }) => !seen.has(i)) ?? available[0];
    assert.ok(candidate, 'A hidden card is available');
    finalIndex = candidate.i;
    await click(candidate.card);
    cards().forEach((card, i) => {
      const el = elements.find(el => el.name === label(card) || el.symbol === label(card));
      if (el) seen.set(i, el.atomicNumber);
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
  }
  assert.ok(button('Pass to'));
  assert.ok(button('Watch Replay'), 'Versus timed Hunt offers an immediate replay');
  assert.equal(storedResults()[0].replay?.kind, 'element-match-hunt', 'Versus timed Hunt saves replay data');
  const huntLeaderboardReplay = buttons().find(b => label(b).includes('Replay') && !label(b).includes('Watch'));
  assert.ok(huntLeaderboardReplay, 'Versus timed Hunt leaderboard shows Replay');
  await click(huntLeaderboardReplay);
  assert.ok(button('Back to leaderboard'));
  await click(button('Back to leaderboard'));
  assert.equal(storedResults().length, 1, 'Timed result is saved immediately');
  await click(rewind());
  assert.equal(storedResults().length, 0, 'Rewind removes the timed result');
  assert.ok(!buttons().some(b => label(b).startsWith('Pass to')));
  await click(cards()[finalIndex]);
  assert.equal(storedResults().length, 1, 'Replayed timed result is saved immediately');
  await click(button('Pass to'));
  assert.equal(storedResults().length, 1, 'Handover does not duplicate the result');
  assert.ok(rewind().props.disabled, 'Handover locks prior turn');
  // Finish all remaining turns: two players per round, three rounds total.
  for (let turn = 1; turn < 6; turn++) {
    assert.ok(label(renderer.root).includes(`Round ${Math.floor(turn / 2) + 1}/3`));
    await click(button('Start Timer'));
    for (let tick = 0; tick < 3; tick++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 1050)); });
    const known = new Map();
    const nextLabel = turn % 2 === 0 ? 'Pass to' : turn === 5 ? 'See Results' : 'Next Round';
    for (let moves = 0; moves < 200 && !buttons().some(b => label(b).startsWith(nextLabel)); moves++) {
      const available = cards().map((card, i) => ({ card, i })).filter(({ card }) => !card.props.disabled);
      const open = cards().findIndex(card => /active-p[12]/.test(card.props.className));
      const partner = open >= 0 ? available.find(({ i }) => known.has(i) && known.get(i) === known.get(open)) : null;
      const candidate = partner ?? available.find(({ i }) => !known.has(i)) ?? available[0];
      assert.ok(candidate);
      await click(candidate.card);
      cards().forEach((card, i) => {
        const el = elements.find(el => el.name === label(card) || el.symbol === label(card));
        if (el) known.set(i, el.atomicNumber);
      });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)); });
    }
    assert.equal(storedResults().length, turn + 1, 'Current turn is saved immediately');
    await click(button(nextLabel));
    assert.equal(storedResults().filter(result => result.gameId === 'element-match').length, turn + 1);
    if (turn < 5) assert.ok(rewind().props.disabled);
  }
  for (const mode of ['time-trial', 'hunt']) {
    await mount('SoloElementMatchScreen', { initialOptions: { mode, pairCount: 1, trialTarget: 'all', huntTimed: true } });
    await click(button('Start Game'));
    for (let round = 1; round <= 3; round++) {
      assert.ok(label(renderer.root).includes(`Round ${round}/3`));
      await click(button('Start Timer'));
      await click(cards()[0]); await click(cards()[1]);
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
      assert.equal(storedResults().length, round, 'Solo timed round is saved immediately');
      if (mode === 'hunt') {
        assert.ok(button('Watch Replay'), 'Solo timed Hunt offers an immediate replay');
        assert.equal(storedResults().at(-1).replay?.kind, 'element-match-hunt', 'Solo timed Hunt saves replay data');
        const replay = buttons().find(b => label(b).includes('Replay') && !label(b).includes('Watch'));
        assert.ok(replay, 'Solo timed Hunt leaderboard shows Replay');
      }
      await click(button(round < 3 ? 'Next Round' : 'Play Again'));
      assert.equal(storedResults().length, round);
      assert.ok(rewind().props.disabled);
    }
    assert.ok(label(renderer.root).includes('Round 1/3'), 'Play Again restarts at round one');
  }
  memory.clear();
  const { buildGameConfigKey, getGameLeaderboard, recordCompletedGameResult } = await server.ssrLoadModule('/src/engine/gameResults.ts');
  const repeatedRunConfig = buildGameConfigKey('atomic-order', 'arrange', { difficulty: 'explorer', challenge: 'easy', multiplier: 1, tiles: 3 });
  for (const elapsedMs of [5400, 6200]) recordCompletedGameResult({
    rulesVersion: 1, gameId: 'atomic-order', variantId: 'arrange', configKey: repeatedRunConfig, format: 'solo',
    participant: { id: 'guest:test', name: 'Test', kind: 'guest' }, metrics: { score: 1, normalizedScore: 100, elapsedMs, attempts: 1 },
  });
  assert.equal(getGameLeaderboard('atomic-order', 'arrange', repeatedRunConfig, 'solo').length, 2, 'Timed leaderboard shows multiple rounds by the same player');
  const { default: HighScoresScreen } = await server.ssrLoadModule('/src/screens/HighScoresScreen.tsx');
  if (renderer) await act(() => renderer.unmount());
  await act(() => { renderer = create(React.createElement(HighScoresScreen, { onBack() {} })); });
  assert.ok(label(renderer.root).includes('Atomic Order'), 'High Scores page lists stored game boards');
  await click(button('Clear lower scores'));
  assert.ok(button('Confirm: keep only #1'));
  await click(button('Confirm: keep only #1'));
  assert.equal(storedResults().length, 1, 'High Scores cleanup preserves only the winning entry');
  console.log('Rewind interaction checks passed: immediate timed results, rollback, Next boundaries, and tile moves.');
} finally {
  if (renderer) await act(() => renderer.unmount());
  await server.close();
  console.error = originalError;
}
