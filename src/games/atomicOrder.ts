import { elements } from '../data/elements.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import type { AtomicOrderLevel, AtomicOrderMultiplier } from '../engine/storage.ts';

export type AtomicOrderRound = { p1: number[]; p2: number[] };
export type AtomicOrderFeedback = 'correct' | 'left' | 'right';
export type AtomicOrderResult = { solved: boolean; attempts: number; elapsedMs: number };

export const ATOMIC_ORDER_TILE_COUNTS: Readonly<Record<Difficulty, number>> = {
  explorer: 3,
  scientist: 4,
  professor: 5,
};

export const ATOMIC_ORDER_LEVELS: Readonly<Record<AtomicOrderLevel, {
  label: string;
  description: string;
  showHints: boolean;
  wrongGuessPenalty: boolean;
  randomizeStart: boolean;
  countOnlyFeedback: boolean;
}>> = {
  easy: {
    label: 'Easy',
    description: 'Direction hints · no penalty · all misplaced · show tiles',
    showHints: true,
    wrongGuessPenalty: false,
    randomizeStart: false,
    countOnlyFeedback: false,
  },
  medium: {
    label: 'Medium',
    description: 'No directions · +1s penalty · all misplaced · show tiles',
    showHints: false,
    wrongGuessPenalty: true,
    randomizeStart: false,
    countOnlyFeedback: false,
  },
  hard: {
    label: 'Hard',
    description: 'No directions · +1s penalty · random start · count only',
    showHints: false,
    wrongGuessPenalty: true,
    randomizeStart: true,
    countOnlyFeedback: true,
  },
};

function shuffleArray<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function shuffledAtomicNumbers(pool: number, count: number, randomizeStart: boolean): number[] {
  const picked = shuffleArray(elements.slice(0, pool)).slice(0, count).map(element => element.atomicNumber);
  const sorted = [...picked].sort((a, b) => a - b);
  if (randomizeStart) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const shuffled = shuffleArray(sorted);
      if (shuffled.some((value, index) => value !== sorted[index])) return shuffled;
    }
  }
  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = shuffleArray(sorted);
    if (shuffled.every((value, index) => value !== sorted[index])) return shuffled;
  }
  return [...sorted.slice(1), sorted[0]];
}

/** Generates private puzzles using the existing multiplayer difficulty rules. */
export function generateAtomicOrderRounds(
  count: number,
  player1Difficulty: Difficulty,
  player2Difficulty: Difficulty,
  multiplier: AtomicOrderMultiplier,
  randomizeStart: boolean,
): AtomicOrderRound[] {
  return Array.from({ length: count }, () => ({
    p1: shuffledAtomicNumbers(
      DIFFICULTY_CONFIG[player1Difficulty].elementPool,
      ATOMIC_ORDER_TILE_COUNTS[player1Difficulty] * multiplier,
      randomizeStart,
    ),
    p2: shuffledAtomicNumbers(
      DIFFICULTY_CONFIG[player2Difficulty].elementPool,
      ATOMIC_ORDER_TILE_COUNTS[player2Difficulty] * multiplier,
      randomizeStart,
    ),
  }));
}
