import { elements } from '../data/elements.ts';

export type SymbolRound = {
  elementName: string;
  correctSymbol: string;
  choices: string[];
};

function shuffleArray<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/** Canonical multiplayer-first distractor selection shared by every player format. */
export function pickSimilarSymbols(correctSymbol: string, elementName: string, count: number): string[] {
  const firstUpper = correctSymbol[0].toUpperCase();
  const firstLower = firstUpper.toLowerCase();
  const correctLower = correctSymbol.toLowerCase();
  const nameLetters: string[] = [];
  const nameSeen = new Set<string>();
  for (const character of elementName.toLowerCase()) {
    if (character >= 'a' && character <= 'z' && character !== firstLower && !nameSeen.has(character)) {
      nameSeen.add(character);
      nameLetters.push(character);
    }
  }

  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(character => character !== firstLower);
  const realSymbols = elements.map(element => element.symbol);
  const candidates = new Set<string>();

  for (const symbol of realSymbols) {
    if (symbol !== correctSymbol && symbol[0] === firstUpper) candidates.add(symbol);
  }
  for (const character of nameLetters) candidates.add(firstUpper + character);
  for (const character of shuffleArray(alphabet)) candidates.add(firstUpper + character);

  if (correctSymbol.length === 1) {
    for (const symbol of realSymbols) {
      if (symbol.length === 2 && symbol[0] === firstUpper && symbol !== correctSymbol) candidates.add(symbol);
    }
  }

  if (correctSymbol.length === 2) {
    const secondCode = correctSymbol[1].toLowerCase().charCodeAt(0);
    for (let offset = -3; offset <= 3; offset++) {
      const code = secondCode + offset;
      if (code >= 97 && code <= 122 && code !== secondCode) {
        candidates.add(firstUpper + String.fromCharCode(code));
      }
    }
  }

  candidates.delete(correctSymbol);
  const scored = Array.from(candidates).map(symbol => {
    let score = 0;
    if (symbol[0] === firstUpper) score += 10;
    if (realSymbols.includes(symbol)) score += 5;
    if (symbol.length === correctSymbol.length) score += 4;
    if (symbol.length === 2 && nameLetters.includes(symbol[1]?.toLowerCase() ?? '')) score += 4;
    const correctCharacters = new Set(correctLower);
    for (const character of symbol.toLowerCase()) if (correctCharacters.has(character)) score += 1;
    for (let index = 0; index < Math.min(symbol.length, correctSymbol.length); index++) {
      if (symbol[index].toLowerCase() === correctLower[index]) score += 3;
    }
    return { symbol, score, randomOrder: Math.random() };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.randomOrder - b.randomOrder));

  const picked: string[] = [];
  const used = new Set<string>();
  for (const candidate of scored) {
    if (!used.has(candidate.symbol) && candidate.symbol !== correctSymbol) {
      used.add(candidate.symbol);
      picked.push(candidate.symbol);
      if (picked.length >= count) break;
    }
  }
  for (const symbol of shuffleArray(realSymbols)) {
    if (picked.length >= count) break;
    if (!used.has(symbol) && symbol !== correctSymbol) {
      used.add(symbol);
      picked.push(symbol);
    }
  }
  return picked.slice(0, count);
}

export function generateSymbolRounds(count: number, pool = 118, distractorCount = 9): SymbolRound[] {
  const picked = shuffleArray(elements.slice(0, pool)).slice(0, count);
  return picked.map(element => {
    const distractors = pickSimilarSymbols(element.symbol, element.name, distractorCount);
    return {
      elementName: element.name,
      correctSymbol: element.symbol,
      choices: shuffleArray([element.symbol, ...distractors]),
    };
  });
}
