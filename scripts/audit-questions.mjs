import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Exercise the same TS/TSX modules used by the app, without a separate transpiler.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let seed = 20260910;
const originalRandom = Math.random;
Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
try {
  const { generateQuiz, generateDeepDiveQuiz, generateComparisonQuiz, getRelatableTrivia } = await server.ssrLoadModule('/src/engine/questionGenerator.ts');
  const { generateAtomQuestions } = await server.ssrLoadModule('/src/games/atomQuiz.ts');
  const { generateClueRounds } = await server.ssrLoadModule('/src/games/clueDuel.ts');
  const { elements } = await server.ssrLoadModule('/src/data/elements.ts');
  const { EXTRA_FACTS, pickExtraFact, extraFactCandidates } = await server.ssrLoadModule('/src/engine/extraFacts.ts');
  const counts = { quiz: 0, atom: 0, clues: 0, deepDive: 0, comparison: 0, curated: 0 };
  const atomPrompts = new Set();
  const extraFactsSeen = new Set();
  const matchstickContent = /matchsticks?|matchbox|safety matches|striking strip|match heads?|used in matches/i;
  for (const el of elements) {
    assert.ok(!matchstickContent.test([el.funFact, ...el.additionalFacts, ...el.uses].join(' ')), el.name);
    for (const trivia of getRelatableTrivia(el)) {
      assert.ok(!matchstickContent.test(JSON.stringify(trivia)), 'No matchstick questions or clues');
    }
  }
  assert.ok(EXTRA_FACTS.every(fact => !matchstickContent.test(fact)));
  const normalise = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const checkNoRepetition = questions => {
    assert.equal(new Set(questions.map(q => normalise(q.explanation))).size, questions.length, 'No repeated explanations within a game');
    assert.equal(new Set(questions.map(q => `${normalise(q.questionText)}:${normalise(q.choices[q.correctIndex])}`)).size, questions.length, 'No repeated question/answer pairs');
  };
  const check = q => {
    assert.ok(q.questionText.trim());
    assert.ok(q.correctIndex >= 0 && q.correctIndex < q.choices.length, q.questionText);
    const choiceKey = choice => choice.toLowerCase().replace(/[^a-z0-9+−-]+/g, ' ').trim();
    assert.equal(new Set(q.choices.map(choiceKey)).size, q.choices.length, q.questionText);
    assert.ok(q.explanation?.length >= 65, `${q.questionText}: ${q.explanation}`);
    assert.ok(q.explanation.split(/\s+/).length <= 85, q.questionText);
    assert.notEqual(normalise(q.explanation), normalise(q.choices[q.correctIndex]), q.questionText);
    assert.ok(extraFactCandidates(q).includes(q.extraFact), 'Fun fact belongs to the correct element or subject');
    assert.ok(!normalise(q.explanation).includes(normalise(q.extraFact)), q.questionText);
    extraFactsSeen.add(q.extraFact);
    assert.ok(!/\?\?\?|_{2,}|undefined|NaN/.test(q.questionText + q.explanation), q.questionText);
    if (q.category === 'compounds') {
      const hasSymbol = new RegExp(`${q.element.symbol}(?![a-z])`);
      assert.equal(q.choices.filter(choice => hasSymbol.test(choice)).length, 1, q.questionText + ': ' + q.choices.join(', '));
    }
    if (q.category === 'isotopes' && q.choices.includes(q.element.name)) {
      assert.equal(q.choices.filter(name => elements.find(el => el.name === name)?.stableIsotopes === q.element.stableIsotopes).length, 1);
    }
  };
  for (const difficulty of ['explorer', 'scientist', 'professor']) {
    for (let run = 0; run < 100; run++) {
      const questions = generateQuiz(difficulty, 12);
      assert.equal(questions.length, 12);
      assert.equal(new Set(questions.map(q => q.id)).size, 12);
      questions.forEach(check);
      checkNoRepetition(questions);
      counts.quiz += questions.length;
      const comparisons = generateComparisonQuiz(difficulty, 8);
      comparisons.forEach(check);
      checkNoRepetition(comparisons);
      counts.comparison += comparisons.length;
    }
    for (const el of elements) {
      const questions = generateDeepDiveQuiz(el, difficulty, 12);
      questions.forEach(check);
      checkNoRepetition(questions);
      counts.deepDive += questions.length;
    }
  }
  for (const difficulty of ['explorer', 'scientist', 'professor']) {
    for (let run = 0; run < 20; run++) {
      const sprint = generateQuiz(difficulty, 50);
      assert.equal(sprint.length, 50);
      checkNoRepetition(sprint);
      const firstPlayer = generateQuiz(difficulty, 12);
      const secondPlayer = generateQuiz(difficulty, 12, firstPlayer);
      assert.equal(secondPlayer.length, 12);
      checkNoRepetition([...firstPlayer, ...secondPlayer]);
    }
  }
  for (let run = 0; run < 200; run++) {
    const questions = generateAtomQuestions(12);
    assert.equal(questions.length, 12);
    questions.forEach(q => { check(q); atomPrompts.add(q.questionText); });
    assert.equal(new Set(questions.map(q => q.explanation)).size, questions.length);
    assert.equal(new Set(questions.map(q => q.topic)).size, questions.length, 'No repeated Atom Quiz concepts');
    assert.ok(questions.every(q => q.topic));
    counts.atom += questions.length;
  }
  assert.equal(atomPrompts.size, 85, 'All Atom Quiz wordings exercised');
  for (const size of [36, 86, 118]) {
    const rounds = generateClueRounds(size, size);
    assert.equal(rounds.length, size);
    for (const round of rounds) {
      assert.equal(round.clues.length, 5);
      assert.equal(new Set(round.clues).size, 5);
      assert.equal(new Set(round.choices).size, round.choices.length);
      assert.ok(round.choices.includes(round.correctName));
      assert.ok(round.explanation.length >= 65);
      assert.ok(extraFactCandidates(round).includes(round.extraFact), 'Clue fact belongs to the answer element');
      assert.ok(!/\?\?\?|_{2,}|undefined/.test(round.clues.join(' ')));
      assert.ok(round.choices.every(name => elements.slice(0, size).some(el => el.name === name)));
    }
    counts.clues += rounds.length;
  }
  for (const el of elements) {
    for (const trivia of getRelatableTrivia(el)) {
      assert.ok(trivia.clue && trivia.explanation);
      assert.ok(!normalise(trivia.question).includes(normalise(el.name)), trivia.question);
      assert.ok(!normalise(trivia.clue).includes(normalise(el.name)), trivia.clue);
      counts.curated++;
    }
  }
  const shortClueSession = generateClueRounds(12);
  assert.equal(new Set(shortClueSession.map(round => round.extraFact)).size, 12);
  for (const fact of EXTRA_FACTS) {
    assert.notEqual(pickExtraFact(fact), fact, 'Do not repeat the supplied teaching fact');
  }
  const helium = elements.find(el => el.name === 'Helium');
  const heliumPool = extraFactCandidates({ element: helium, explanation: '' });
  assert.ok(heliumPool.includes(EXTRA_FACTS[0]));
  assert.ok(!heliumPool.includes(EXTRA_FACTS[1]), 'Helium must not receive a copper fact');
  const quarkPool = extraFactCandidates({ topic: 'quarks', explanation: '' });
  assert.ok(quarkPool.includes(EXTRA_FACTS[31]));
  assert.ok(!quarkPool.includes(EXTRA_FACTS[1]), 'Quarks must not receive a copper fact');
  assert.ok(heliumPool.includes(pickExtraFact('', new Set(heliumPool), heliumPool)), 'Exhaustion never escapes the relevant pool');
  assert.equal(counts.curated, 72);
  assert.ok(extraFactsSeen.size > EXTRA_FACTS.length, 'Element-specific pools provide broader variety');
  console.log(JSON.stringify({ passed: true, counts, atomWordingsCovered: atomPrompts.size }, null, 2));
  for (const difficulty of ['explorer', 'scientist', 'professor']) {
    console.log(difficulty, generateQuiz(difficulty, 3).map(q => ({ question: q.questionText, answer: q.choices[q.correctIndex], explanation: q.explanation })));
  }
} finally {
  Math.random = originalRandom;
  await server.close();
}
