export type Difficulty = 'explorer' | 'scientist' | 'professor';

export type Rank = {
  name: string;
  minEP: number;
  icon: string;
};

export const RANKS: Rank[] = [
  { name: 'Atom Apprentice', minEP: 0, icon: '⚛️' },
  { name: 'Molecule Maker', minEP: 200, icon: '🧪' },
  { name: 'Reaction Rookie', minEP: 500, icon: '💥' },
  { name: 'Element Expert', minEP: 1200, icon: '🔬' },
  { name: 'Periodic Champion', minEP: 3000, icon: '🏆' },
  { name: 'Nuclear Genius', minEP: 6000, icon: '☢️' },
];

export const DIFFICULTY_CONFIG = {
  explorer: {
    label: 'Explorer',
    description: 'For young scientists — common elements, simpler questions, second chance!',
    elementPool: 20, // Elements 1-20 (H to Ca — familiar everyday elements)
    choiceCount: 3,
    timerSeconds: 30,
    basePoints: 10,
    secondChance: true,
    questionCategories: ['symbol-name', 'atomic-number', 'state', 'fun-fact'],
  },
  scientist: {
    label: 'Scientist',
    description: 'For keen learners — more elements, tougher questions!',
    elementPool: 86, // Elements 1-86 (H to Rn)
    choiceCount: 4,
    timerSeconds: 20,
    basePoints: 20,
    secondChance: false,
    questionCategories: ['symbol-name', 'atomic-number', 'group-classification', 'discovery', 'state', 'radioactivity', 'compounds', 'fun-fact', 'uses', 'obtained-from'],
  },
  professor: {
    label: 'Professor',
    description: 'For periodic table masters — all 118 elements, everything goes!',
    elementPool: 118, // All elements
    choiceCount: 5,
    timerSeconds: 15,
    basePoints: 30,
    secondChance: false,
    questionCategories: ['symbol-name', 'atomic-number', 'group-classification', 'discovery', 'state', 'radioactivity', 'isotopes', 'compounds', 'position', 'fun-fact', 'uses', 'obtained-from'],
  },
} as const;

export function getRank(totalEP: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (totalEP >= rank.minEP) current = rank;
  }
  return current;
}

export function getNextRank(totalEP: number): Rank | null {
  for (const rank of RANKS) {
    if (totalEP < rank.minEP) return rank;
  }
  return null;
}

export function calculatePoints(
  difficulty: Difficulty,
  isCorrect: boolean,
  streak: number,
  isSecondAttempt: boolean,
  timeRemainingPct: number,
): number {
  if (!isCorrect) return 0;
  const config = DIFFICULTY_CONFIG[difficulty];
  let points: number = config.basePoints;
  if (isSecondAttempt) points = Math.floor(points / 2);
  // Streak multiplier: x2 at 3, x3 at 5, x4 at 8, x5 at 12
  const streakMultiplier = streak >= 12 ? 5 : streak >= 8 ? 4 : streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
  points *= streakMultiplier;
  // Speed bonus: up to 50% extra
  const speedBonus = Math.floor(points * 0.5 * timeRemainingPct);
  points += speedBonus;
  return points;
}
