import { elements, type Element } from '../data/elements.ts';
import type { Difficulty } from '../engine/scoring.ts';

export const FAMILY_LABELS: Record<string, string> = {
  'transition-metal': 'transition metals', halogen: 'halogens',
  'noble-gas': 'noble gases', 'alkali-metal': 'alkali metals',
  'alkaline-earth-metal': 'alkaline earth metals', metalloid: 'metalloids',
  nonmetal: 'nonmetals', 'post-transition-metal': 'post-transition metals',
  lanthanide: 'lanthanides', actinide: 'actinides',
};
export const FAMILY_SIZES: Record<Difficulty, number> = { explorer: 3, scientist: 4, professor: 5 };
export const FAMILY_SINGULAR: Record<string, string> = {
  'transition-metal': 'a transition metal', halogen: 'a halogen', 'noble-gas': 'a noble gas',
  'alkali-metal': 'an alkali metal', 'alkaline-earth-metal': 'an alkaline earth metal',
  metalloid: 'a metalloid', nonmetal: 'a nonmetal', 'post-transition-metal': 'a post-transition metal',
  lanthanide: 'a lanthanide', actinide: 'an actinide',
};
export type FamilyWindow = { id: string; size: number; tiles: Element[] };
export type FamilyRound = FamilyWindow & { prompt: string; category: string; answers: Element[] };

export function familyWindows(difficulty: Difficulty): FamilyWindow[] {
  const windows: FamilyWindow[] = [];
  const size = FAMILY_SIZES[difficulty];
  for (let start = 0; start <= elements.length - size * size; start++) {
    const tiles = elements.slice(start, start + size * size);
    windows.push({ id: `${size}:${start + 1}`, size, tiles });
  }
  return windows;
}
function pick<T>(items: T[]): T { return items[Math.floor(Math.random() * items.length)]; }
export function isFamilyAnswerCorrect(round: FamilyRound, selected: readonly number[]): boolean {
  return selected.length === 1 && round.answers.some(el => el.atomicNumber === selected[0]);
}
export function generateFamilyRounds(count: number, difficulty: Difficulty): FamilyRound[] {
  const windows = familyWindows(difficulty);
  const used = new Set<string>();
  let previousWindow = '';
  let previousCategory = '';
  return Array.from({ length: count }, () => {
    if (used.size === windows.length) used.clear();
    const fresh = windows.filter(window => !used.has(window.id) && window.id !== previousWindow);
    const window = pick(fresh.length ? fresh : windows.filter(window => !used.has(window.id)));
    const categories = [...new Set(window.tiles.map(el => el.category))];
    const varied = categories.filter(category => category !== previousCategory);
    const category = pick(varied.length ? varied : categories);
    used.add(window.id); previousWindow = window.id; previousCategory = category;
    return { ...window, category, prompt: `Find ${FAMILY_SINGULAR[category]}.`, answers: window.tiles.filter(el => el.category === category) };
  });
}
