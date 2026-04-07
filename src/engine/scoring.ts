export type Difficulty = 'explorer' | 'scientist' | 'professor';

export type Rank = {
  name: string;
  minEP: number;
  icon: string;
};

export const RANKS: Rank[] = [
  { name: 'Spark Starter', minEP: 0, icon: '✨' },
  { name: 'Atom Explorer', minEP: 50, icon: '⚛️' },
  { name: 'Molecule Mixer', minEP: 150, icon: '🧪' },
  { name: 'Bunsen Burner', minEP: 300, icon: '🔥' },
  { name: 'Reaction Ranger', minEP: 500, icon: '💥' },
  { name: 'Lab Legend', minEP: 800, icon: '🔬' },
  { name: 'Element Hunter', minEP: 1200, icon: '🎯' },
  { name: 'Periodic Pro', minEP: 1800, icon: '📊' },
  { name: 'Chemistry Champ', minEP: 2500, icon: '🏆' },
  { name: 'Super Scientist', minEP: 3500, icon: '🦸' },
  { name: 'Nuclear Ninja', minEP: 5000, icon: '☢️' },
  { name: 'Elemental Master', minEP: 7500, icon: '👑' },
];

export const DIFFICULTY_CONFIG = {
  explorer: {
    label: 'Explorer',
    description: 'For young scientists — famous elements, simpler questions, second chance!',
    elementPool: 36,
    elementNumbers: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      26, 29, 47, 50, 53, 74, 78, 79, 80, 82,  // Fe Cu Ag Sn I W Pt Au Hg Pb
    ],
    choiceCount: 3,
    timerSeconds: 30,
    basePoints: 10,
    secondChance: true,
    questionCategories: ['symbol-name', 'atomic-number', 'state', 'fun-fact', 'which-is-bigger'],
  },
  scientist: {
    label: 'Scientist',
    description: 'For keen learners — more elements, tougher questions, second chance!',
    elementPool: 86, // Elements 1-86 (H to Rn)
    choiceCount: 4,
    timerSeconds: 20,
    basePoints: 20,
    secondChance: true,
    questionCategories: ['symbol-name', 'atomic-number', 'group-classification', 'discovery', 'state', 'radioactivity', 'compounds', 'fun-fact', 'uses', 'obtained-from', 'which-is-bigger'],
  },
  professor: {
    label: 'Professor',
    description: 'For periodic table masters — all 118 elements, everything goes!',
    elementPool: 118, // All elements
    choiceCount: 5,
    timerSeconds: 15,
    basePoints: 30,
    secondChance: false,
    questionCategories: ['symbol-name', 'atomic-number', 'group-classification', 'discovery', 'state', 'radioactivity', 'isotopes', 'compounds', 'position', 'fun-fact', 'uses', 'obtained-from', 'which-is-bigger'],
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

export type Milestone = {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (progress: { totalEP: number; elementsCollected: number[]; bestStreak: number; quizHistory: { correct: number; total: number }[] }) => boolean;
};

export const MILESTONES: Milestone[] = [
  { id: 'first-quiz', title: 'First Steps', description: 'Complete your first quiz', icon: '🎯', check: p => p.quizHistory.length >= 1 },
  { id: '5-elements', title: 'Collector', description: 'Collect 5 elements', icon: '🧪', check: p => p.elementsCollected.length >= 5 },
  { id: '10-elements', title: 'Element Fan', description: 'Collect 10 elements', icon: '⭐', check: p => p.elementsCollected.length >= 10 },
  { id: '25-elements', title: 'Quarter Table', description: 'Collect 25 elements', icon: '🌟', check: p => p.elementsCollected.length >= 25 },
  { id: '50-elements', title: 'Half Table', description: 'Collect 50 elements', icon: '💫', check: p => p.elementsCollected.length >= 50 },
  { id: 'all-elements', title: 'Table Master', description: 'Collect all 118 elements', icon: '👑', check: p => p.elementsCollected.length >= 118 },
  { id: 'streak-3', title: 'Hat Trick', description: 'Get a 3-answer streak', icon: '🔥', check: p => p.bestStreak >= 3 },
  { id: 'streak-5', title: 'On Fire', description: 'Get a 5-answer streak', icon: '🔥', check: p => p.bestStreak >= 5 },
  { id: 'streak-10', title: 'Unstoppable', description: 'Get a 10-answer streak', icon: '💯', check: p => p.bestStreak >= 10 },
  { id: 'perfect-quiz', title: 'Perfectionist', description: 'Get 100% on a quiz', icon: '🏅', check: p => p.quizHistory.some(h => h.correct === h.total && h.total > 0) },
  { id: '500-ep', title: 'Rising Star', description: 'Earn 500 Element Points', icon: '⚡', check: p => p.totalEP >= 500 },
  { id: '2000-ep', title: 'Science Superstar', description: 'Earn 2000 Element Points', icon: '🌠', check: p => p.totalEP >= 2000 },
  { id: '5000-ep', title: 'Legend', description: 'Earn 5000 Element Points', icon: '🏆', check: p => p.totalEP >= 5000 },
];

export function getUnlockedMilestones(progress: { totalEP: number; elementsCollected: number[]; bestStreak: number; quizHistory: { correct: number; total: number }[] }): Milestone[] {
  return MILESTONES.filter(m => m.check(progress));
}
