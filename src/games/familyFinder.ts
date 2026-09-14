import { elements, type Element } from '../data/elements.ts';
import { PERIODIC_LAYOUT } from '../data/periodicLayout.ts';
import type { Difficulty } from '../engine/scoring.ts';

export const FAMILY_LABELS: Record<string, string> = {
  'transition-metal': 'transition metals', halogen: 'halogens',
  'noble-gas': 'noble gases', 'alkali-metal': 'alkali metals',
  'alkaline-earth-metal': 'alkaline earth metals', metalloid: 'metalloids',
  nonmetal: 'nonmetals', 'post-transition-metal': 'post-transition metals',
  lanthanide: 'lanthanides', actinide: 'actinides',
};
export type FamilyWindow = { id: string; row: number; column: number; tiles: Element[] };
export type FamilyRound = FamilyWindow & { prompt: string; category: string; answers: Element[] };
// Complete windows need two populated rows: Explorer includes periods 1–5.
const LIMITS: Record<Difficulty, number> = { explorer: 54, scientist: 86, professor: 118 };

export function familyWindows(difficulty: Difficulty): FamilyWindow[] {
  const windows: FamilyWindow[] = [];
  for (let row = 0; row < PERIODIC_LAYOUT.length - 1; row++) {
    for (let column = 0; column <= 14; column++) {
      const numbers = [0, 1].flatMap(dy => [0, 1, 2, 3].map(dx => PERIODIC_LAYOUT[row + dy]?.[column + dx] ?? 0));
      if (numbers.some(number => number === 0 || number > LIMITS[difficulty])) continue;
      const tiles = numbers.map(number => elements[number - 1]);
      if (new Set(tiles.map(el => el.category)).size < 2) continue;
      windows.push({ id: `${row}:${column}`, row, column, tiles });
    }
  }
  return windows;
}
function pick<T>(items: T[]): T { return items[Math.floor(Math.random() * items.length)]; }
export function isFamilyAnswerCorrect(round: FamilyRound, selected: readonly number[]): boolean {
  return selected.length === round.answers.length && new Set(selected).size === selected.length
    && round.answers.every(el => selected.includes(el.atomicNumber));
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
    return { ...window, category, prompt: `Choose all the ${FAMILY_LABELS[category]}.`, answers: window.tiles.filter(el => el.category === category) };
  });
}
