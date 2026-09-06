import { elements } from '../data/elements.ts';
import { pickRelatableTrivia } from '../engine/questionGenerator.ts';

export type ClueRound = {
  clues: string[];
  correctName: string;
  choices: string[];
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

export function generateClueRounds(count: number, pool: number = 118): ClueRound[] {
  const poolElements = shuffleArray(elements.slice(0, pool));
  const rounds: ClueRound[] = [];
  for (let i = 0; i < count && i < poolElements.length; i++) {
    const el = poolElements[i];
    const catLabel = CATEGORY_LABELS[el.category] || el.category;

    const scrub = (value: string) => {
      const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let result = value.replace(new RegExp(escapeRegExp(el.name), 'gi'), '???');
      result = result.replace(new RegExp(`\\b${escapeRegExp(el.symbol)}\\b`, 'g'), '??');
      if (el.name.length >= 7) {
        const prefixLength = Math.max(5, Math.floor(el.name.length * 0.65));
        const prefix = escapeRegExp(el.name.slice(0, prefixLength));
        result = result.replace(new RegExp(`\\b${prefix}\\w*`, 'gi'), '???');
      }
      return result;
    };

    const relatable = pickRelatableTrivia(el);
    const factPool = shuffleArray([
      el.funFact,
      ...(el.additionalFacts ?? []),
      relatable?.explanation,
    ].filter((fact): fact is string => Boolean(fact)));
    const earlyClues = shuffleArray([
      relatable ? `Real-life clue: ${scrub(relatable.question)}` : null,
      factPool[1] ? scrub(factPool[1]) : null,
      el.obtainedFrom ? `I can be obtained from: ${scrub(el.obtainedFrom)}.` : null,
      el.compounds.length > 0 ? `One compound connected with me is ${scrub(el.compounds[0])}.` : null,
      el.uses.length > 0 ? `People use me for: ${scrub(el.uses[Math.floor(Math.random() * el.uses.length)])}.` : null,
    ].filter((clue): clue is string => Boolean(clue)));

    const clues = [
      scrub(factPool[0] || `This element is ${catLabel}.`),
      earlyClues[0] ?? (el.uses.length > 0
        ? `One of my real-world uses is: ${scrub(el.uses[0])}.`
        : `I'm ${catLabel} and I'm a ${el.stateAtRoomTemp} at room temperature.`),
      `I'm classified as ${catLabel} and I'm a ${el.stateAtRoomTemp} at room temperature.`,
      `I have ${el.atomicNumber} protons — that's my atomic number on the periodic table.`,
      `My symbol is "${el.symbol}" and my atomic mass is ${el.atomicMass}.`,
    ];

    const sameCategory = elements.filter(candidate => candidate.category === el.category && candidate.name !== el.name);
    const otherCategories = elements.filter(candidate => candidate.category !== el.category && candidate.name !== el.name);
    const distractors = shuffleArray([...sameCategory.slice(0, 4), ...otherCategories]).slice(0, 7);
    const choices = shuffleArray([el.name, ...distractors.map(candidate => candidate.name)]);
    rounds.push({ clues, correctName: el.name, choices });
  }
  return rounds;
}
