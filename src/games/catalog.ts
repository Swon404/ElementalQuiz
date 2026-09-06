export const GAME_IDS = [
  'quiz-battle',
  'tf-blitz',
  'atom-quiz',
  'clue-duel',
  'symbol-pick',
  'atomic-order',
  'element-match',
] as const;

export type GameId = typeof GAME_IDS[number];
export type PlayerFormat = 'solo' | 'versus-human' | 'versus-bot';
export type ChampionshipSize = 'quick' | 'standard' | 'epic';

export const PLAYER_FORMATS: ReadonlyArray<{
  id: PlayerFormat;
  label: string;
  playerCount: 1 | 2;
  hasBot: boolean;
}> = [
  { id: 'solo', label: 'Solo', playerCount: 1, hasBot: false },
  { id: 'versus-human', label: '2 Players', playerCount: 2, hasBot: false },
  { id: 'versus-bot', label: 'Player vs Bot', playerCount: 2, hasBot: true },
];

export type GameDefinition = {
  id: GameId;
  label: string;
  icon: string;
  description: string;
  formats: readonly PlayerFormat[];
  variants: readonly string[];
  championshipCounts: Readonly<Record<ChampionshipSize, number>>;
  leaderboardMetric: 'score' | 'time';
};

const ALL_FORMATS: readonly PlayerFormat[] = ['solo', 'versus-human', 'versus-bot'];

export const GAME_CATALOG: Readonly<Record<GameId, GameDefinition>> = {
  'quiz-battle': {
    id: 'quiz-battle',
    label: 'Quiz Battle',
    icon: '⚔️',
    description: 'Answer element questions and build the highest score.',
    formats: ALL_FORMATS,
    variants: ['classic', 'sprint', 'deep-dive', 'showdown', 'exotic'],
    championshipCounts: { quick: 3, standard: 5, epic: 8 },
    leaderboardMetric: 'score',
  },
  'tf-blitz': {
    id: 'tf-blitz',
    label: 'True or False Blitz',
    icon: '✅',
    description: 'Decide whether element statements are true before time expires.',
    formats: ALL_FORMATS,
    variants: ['classic'],
    championshipCounts: { quick: 3, standard: 5, epic: 8 },
    leaderboardMetric: 'score',
  },
  'element-match': {
    id: 'element-match',
    label: 'Element Match',
    icon: '🃏',
    description: 'Match element names and symbols on a timed board.',
    formats: ALL_FORMATS,
    variants: ['hunt', 'time-trial'],
    championshipCounts: { quick: 12, standard: 16, epic: 20 },
    leaderboardMetric: 'time',
  },
  'clue-duel': {
    id: 'clue-duel',
    label: 'Clue Duel',
    icon: '🕵️',
    description: 'Identify an element from progressively clearer clues.',
    formats: ALL_FORMATS,
    variants: ['classic'],
    championshipCounts: { quick: 4, standard: 6, epic: 8 },
    leaderboardMetric: 'score',
  },
  'symbol-pick': {
    id: 'symbol-pick',
    label: 'Symbol Pick',
    icon: '🔤',
    description: 'Choose the correct chemical symbol from close look-alikes.',
    formats: ALL_FORMATS,
    variants: ['classic'],
    championshipCounts: { quick: 4, standard: 6, epic: 8 },
    leaderboardMetric: 'score',
  },
  'atomic-order': {
    id: 'atomic-order',
    label: 'Atomic Order',
    icon: '🔢',
    description: 'Arrange elements from lowest to highest atomic number.',
    formats: ALL_FORMATS,
    variants: ['arrange'],
    championshipCounts: { quick: 3, standard: 5, epic: 7 },
    leaderboardMetric: 'time',
  },
  'atom-quiz': {
    id: 'atom-quiz',
    label: 'Atom Quiz',
    icon: '⚛️',
    description: 'Answer questions about atomic structure and forces.',
    formats: ALL_FORMATS,
    variants: ['classic'],
    championshipCounts: { quick: 4, standard: 8, epic: 12 },
    leaderboardMetric: 'score',
  },
};

export const GAME_LIST: readonly GameDefinition[] = GAME_IDS.map(id => GAME_CATALOG[id]);

export function isGameId(value: string): value is GameId {
  return GAME_IDS.includes(value as GameId);
}
