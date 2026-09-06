import { elements } from '../data/elements.ts';

export type MatchCard = {
  id: number;
  text: string;
  elementNum: number;
  flipped: boolean;
  matched: boolean;
  matchedBy?: 1 | 2;
};

export type MatchTrialResult = { elapsedMs: number; matches: number };

function shuffleArray<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/** Canonical Element Match board generator. Hunt and Time Trial both use this card model. */
export function generateMatchCards(pairCount: number, pool = 118, exotic = false, requiredElementNum?: number | null): MatchCard[] {
  const source = exotic ? elements.filter(element => element.atomicNumber >= 84) : elements.slice(0, pool);
  const required = requiredElementNum ? elements.find(element => element.atomicNumber === requiredElementNum) : null;
  const available = required ? source.filter(element => element.atomicNumber !== required.atomicNumber) : source;
  const shuffledElements = shuffleArray(available);
  const picked = required
    ? [required, ...shuffledElements.slice(0, pairCount - 1)]
    : shuffledElements.slice(0, pairCount);
  const cards: MatchCard[] = [];
  let id = 0;
  for (const element of picked) {
    cards.push({ id: id++, text: element.symbol, elementNum: element.atomicNumber, flipped: false, matched: false });
    cards.push({ id: id++, text: element.name, elementNum: element.atomicNumber, flipped: false, matched: false });
  }
  return shuffleArray(cards);
}

/** Rebuilds the same element set for a private Time Trial attempt. */
export function generateMatchCardsForElements(elementNums: readonly number[]): MatchCard[] {
  const cards: MatchCard[] = [];
  let id = 0;
  for (const elementNum of elementNums) {
    const element = elements.find(item => item.atomicNumber === elementNum);
    if (!element) continue;
    cards.push({ id: id++, text: element.symbol, elementNum, flipped: false, matched: false });
    cards.push({ id: id++, text: element.name, elementNum, flipped: false, matched: false });
  }
  return shuffleArray(cards);
}
