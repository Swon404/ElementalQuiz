import { elements } from '../data/elements.ts';
import { pickRelatableTrivia } from '../engine/questionGenerator.ts';
import { explainCategory } from '../engine/questionFeedback.ts';
import { addExtraFacts } from '../engine/extraFacts.ts';

export type ClueRound = {
  clues: string[];
  correctName: string;
  choices: string[];
  explanation: string;
  extraFact?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  'alkali-metal': 'an alkali metal',
  'alkaline-earth-metal': 'an alkaline earth metal',
  'transition-metal': 'a transition metal',
  'post-transition-metal': 'a post-transition metal',
  metalloid: 'a metalloid',
  nonmetal: 'a nonmetal',
  halogen: 'a halogen',
  'noble-gas': 'a noble gas',
  lanthanide: 'a lanthanide',
  actinide: 'an actinide',
};

function shuffleArray<T>(values: T[]): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function generateClueRounds(count: number, pool = 118): ClueRound[] {
  const available = elements.slice(0, pool);
  const candidates = shuffleArray(available).map(el => {
    const trivia = pickRelatableTrivia(el);
    const classification = `I am classified as ${CATEGORY_LABELS[el.category] ?? el.category}.`;
    const period = `I belong to period ${el.period}, a horizontal row of the periodic table.`;
    // Each clue adds one independent detail. No redacted names or copied fact paragraphs.
    const clues = [
      trivia?.clue ?? classification,
      trivia ? classification : period,
      trivia ? period : `My listed atomic mass is ${el.atomicMass}.`,
      `Each of my atoms has ${el.atomicNumber} proton${el.atomicNumber === 1 ? '' : 's'}.`,
      `My chemical symbol is ${el.symbol}.`,
    ];
    const sameCategory = shuffleArray(available.filter(candidate => candidate.category === el.category && candidate.name !== el.name));
    const others = shuffleArray(available.filter(candidate => candidate.category !== el.category));
    const distractors = [...sameCategory.slice(0, 4), ...others, ...sameCategory.slice(4)].slice(0, 7);
    return {
      clues,
      correctName: el.name,
      choices: shuffleArray([el.name, ...distractors.map(candidate => candidate.name)]),
      explanation: trivia?.explanation ?? explainCategory(el),
    };
  });
  // Use distinct explanations first, especially for elements without curated trivia.
  const usedExplanations = new Set<string>();
  const distinct: ClueRound[] = [];
  const remaining: ClueRound[] = [];
  for (const round of candidates) {
    if (usedExplanations.has(round.explanation)) remaining.push(round);
    else {
      usedExplanations.add(round.explanation);
      distinct.push(round);
    }
  }
  return addExtraFacts([...distinct, ...remaining].slice(0, count));
}
