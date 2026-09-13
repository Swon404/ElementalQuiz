import { elements } from '../data/elements.ts';
import { getRelatableTrivia } from '../engine/questionGenerator.ts';
import { explainCategory } from '../engine/questionFeedback.ts';
import { addExtraFacts } from '../engine/extraFacts.ts';

export type ClueRound = {
  challenge: 'warm-up' | 'tricky' | 'expert';
  clues: string[];
  correctName: string;
  choices: string[];
  explanation: string;
  extraFact?: string;
};

// Editorial familiarity tiers, not a claim that atomic number measures difficulty.
const FAMILIAR = new Set([1, 2, 6, 7, 8, 11, 13, 14, 17, 20, 26, 29, 47, 79]);
const EVERYDAY = new Set([3, 9, 10, 12, 15, 16, 18, 19, 22, 24, 27, 28, 30, 35, 36, 50, 53, 54, 74, 78, 80, 82, 92]);
const OPENING_CLUES: Record<number, string[]> = {
  1: ['I help stars shine.', 'I am the lightest member of the periodic table.'],
  2: ['I can keep powerful magnets incredibly cold.', 'Scientists found me in sunlight before collecting me on Earth.'],
  6: ['I can be soft enough to write with or hard enough to cut glass.', 'The same element connects pencil tips and diamonds: me.'],
  7: ['I make up most of the air around you.', 'Plants need me, but most cannot take me straight from the air.'],
  8: ['I help ordinary fires keep burning.', 'Two of my atoms make the gas your body needs; three make ozone.'],
  11: ['One of my compounds seasons food; another helps cakes rise.', 'You meet my ions every time you sprinkle table salt.'],
  13: ['Recycling me saves much of the energy needed to make me from ore.', 'I connect drink cans, kitchen foil and lightweight aircraft parts.'],
  14: ['I have a role in sandy beaches and computer chips.', 'Quartz contains me joined to oxygen.'],
  17: ['My compounds help disinfect swimming pools.', 'Joined with sodium, I become part of ordinary table salt.'],
  20: ['My compounds help give your skeleton its strength.', 'Your teeth and bones store plenty of me.'],
  26: ['Your blood uses me to help transport oxygen.', 'Leave me exposed to water and oxygen and rust can appear.'],
  29: ['I carry electricity through much of the wiring in buildings.', 'The Statue of Liberty wears a green coating formed on my surface.'],
  47: ['A very thin layer of me can give a mirror its shine.', 'I am a precious metal used in jewellery and reflective coatings.'],
  79: ['I can be hammered into astonishingly thin sheets.', 'I am a yellow precious metal used in jewellery and electrical contacts.'],
};

function familiarity(atomicNumber: number): number {
  return FAMILIAR.has(atomicNumber) ? 0 : EVERYDAY.has(atomicNumber) ? 1 : 2;
}

const OPENING_EXPLANATIONS: Record<number, string> = {
  1: 'The simplest hydrogen nucleus contains just one proton. In stars, nuclear fusion combines light nuclei into heavier ones, releasing energy that eventually escapes as light and heat.',
  2: 'Helium was identified by its distinctive pattern of light in the Sun. On Earth, liquid helium provides the extremely low temperatures needed by many superconducting magnets.',
  6: 'The arrangement of carbon atoms changes the material completely. Graphite has layers that slide across each other; diamond has a strong, connected three-dimensional structure.',
  7: 'Nitrogen molecules have a strong bond that makes the gas difficult for most organisms to use. Nitrogen-fixing microbes turn it into compounds that can enter food chains.',
  8: 'Ordinary oxygen gas contains pairs of oxygen atoms and supports combustion. Ozone contains three atoms per molecule, giving it different properties, including the ability to absorb ultraviolet light.',
  11: 'Table salt and baking soda both contain sodium ions. Their different negative ions give the compounds different properties: bicarbonate reacts with acids to release the gas that helps baking rise.',
  13: 'Aluminium combines low density with useful strength when alloyed. Recycling existing metal avoids the energy-intensive process of extracting fresh aluminium from its ore.',
  14: 'In quartz, silicon is bonded to oxygen. Computer chips use carefully purified silicon, with tiny controlled additions of other elements to change how it conducts electricity.',
  17: 'Chlorine-based disinfectants damage microbes through chemical reactions. In table salt, chlorine is present as chloride ions, which behave very differently from chlorine gas.',
  20: 'Calcium phosphate minerals provide much of the hardness of teeth and bones. Bone also contains a flexible protein framework, so it is more than a brittle mineral block.',
  26: 'Iron in haemoglobin helps oxygen travel through the bloodstream. Outside the body, iron exposed to moisture and oxygen can form rust, which does not tightly protect the metal beneath it.',
  29: 'Copper conducts electricity well, making it useful for wiring. Its surface can react with the environment to form a patina, including the green coating on the Statue of Liberty.',
  47: 'Silver reflects visible light very effectively, so a thin coating can make a reflective surface. It is also workable enough for jewellery, though its surface can tarnish.',
  79: 'Gold is highly malleable: it can spread into very thin sheets without breaking. Its resistance to corrosion also makes it useful for reliable electrical contact surfaces.',
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
  // Sample across the available pool, then order the session from familiar to obscure.
  // The stratified sample avoids an unlucky opening full of unfamiliar elements.
  const ranked = shuffleArray(available).sort((a, b) => familiarity(a.atomicNumber) - familiarity(b.atomicNumber));
  const length = Math.min(Math.max(0, Math.floor(count)), ranked.length);
  const selected = Array.from({ length }, (_, index) => {
    const start = Math.floor(index * ranked.length / length);
    const end = Math.floor((index + 1) * ranked.length / length);
    return ranked[start + Math.floor(Math.random() * (end - start))];
  });
  const rounds = selected.map((el, index): ClueRound => {
    const stage = Math.min(2, Math.floor(index * 3 / Math.max(1, length)));
    const triviaPool = shuffleArray(getRelatableTrivia(el));
    const trivia = triviaPool[0];
    const classification = `Look for ${CATEGORY_LABELS[el.category] ?? el.category} on the periodic table.`;
    const position = el.group === null
      ? `My place is in period ${el.period}, among the ${el.category === 'lanthanide' ? 'lanthanides' : 'actinides'}.`
      : `Find me in period ${el.period}, in group ${el.group}.`;
    const openings = OPENING_CLUES[el.atomicNumber];
    const opening = openings?.[Math.floor(Math.random() * openings.length)];
    // Broad/contextual -> classification -> location -> proton count -> symbol.
    // No answer names, random fact paragraphs or redacted blanks.
    const clues = [
      opening ?? trivia?.clue ?? `My atomic number falls between ${Math.floor((el.atomicNumber - 1) / 10) * 10 + 1} and ${Math.min(118, Math.floor((el.atomicNumber - 1) / 10) * 10 + 10)}.`,
      classification,
      position,
      `My atomic number is ${el.atomicNumber}: every nucleus has ${el.atomicNumber} proton${el.atomicNumber === 1 ? '' : 's'}.`,
      `My chemical symbol is ${el.symbol}.`,
    ];
    const sameCategory = shuffleArray(available.filter(candidate => candidate.category === el.category && candidate.name !== el.name));
    const others = shuffleArray(available.filter(candidate => candidate.category !== el.category));
    // Later rounds use more family look-alikes; nearby atomic numbers break ties.
    sameCategory.sort((a, b) => Math.abs(a.atomicNumber - el.atomicNumber) - Math.abs(b.atomicNumber - el.atomicNumber));
    const familyCount = [1, 4, 7][stage];
    const distractors = [...sameCategory.slice(0, familyCount), ...others, ...sameCategory.slice(familyCount)].slice(0, 7);
    return {
      challenge: (['warm-up', 'tricky', 'expert'] as const)[stage],
      clues,
      correctName: el.name,
      choices: shuffleArray([el.name, ...distractors.map(candidate => candidate.name)]),
      explanation: opening ? OPENING_EXPLANATIONS[el.atomicNumber] : trivia?.explanation ?? `${el.name} has atomic number ${el.atomicNumber} and belongs to period ${el.period}. ${explainCategory(el)}`,
    };
  });
  return addExtraFacts(rounds);
}
