import { GAME_CATALOG, type GameId, type PlayerFormat } from '../games/catalog.ts';

const GAME_RESULTS_KEY = 'elementalquiz_game_results_v1';
const CHAMPIONSHIP_RESULTS_KEY = 'elementalquiz_championship_results_v1';
const RESULT_SCHEMA_VERSION = 1;

export type ParticipantIdentity = {
  id: string;
  name: string;
  kind: 'profile' | 'guest' | 'bot';
};

export type GameResultMetrics = {
  score: number;
  normalizedScore: number;
  correct?: number;
  total?: number;
  elapsedMs?: number;
  attempts?: number;
  cluesUsed?: number;
  moves?: number;
};

export type CompletedGameResult = {
  id: string;
  schemaVersion: typeof RESULT_SCHEMA_VERSION;
  rulesVersion: number;
  gameId: GameId;
  variantId: string;
  configKey: string;
  format: PlayerFormat;
  participant: ParticipantIdentity;
  metrics: GameResultMetrics;
  completedAt: string;
  championshipRunId?: string;
};

export type RecordGameResultInput = Omit<CompletedGameResult, 'id' | 'schemaVersion' | 'completedAt'> & {
  completedAt?: string;
};

export type LeaderboardEntry = CompletedGameResult & { rank: number };

export type CompletedChampionshipResult = {
  id: string;
  schemaVersion: typeof RESULT_SCHEMA_VERSION;
  rulesVersion: number;
  runId: string;
  combinationKey: string;
  format: Exclude<PlayerFormat, 'solo'> | 'solo';
  participant: ParticipantIdentity;
  championshipPoints: number;
  gamesWon: number;
  gamesDrawn: number;
  elapsedMs: number;
  completedAt: string;
};

export type ChampionshipLeaderboardEntry = CompletedChampionshipResult & { rank: number };

type ConfigValue = string | number | boolean | null;
export type GameConfiguration = Readonly<Record<string, ConfigValue | readonly ConfigValue[]>>;

function stableConfigValue(value: ConfigValue | readonly ConfigValue[]): ConfigValue | ConfigValue[] {
  if (Array.isArray(value)) return Array.from(value) as ConfigValue[];
  return value as ConfigValue;
}

/** Creates a stable category key so incompatible rules never share a leaderboard. */
export function buildGameConfigKey(gameId: GameId, variantId: string, config: GameConfiguration): string {
  const sortedConfig = Object.fromEntries(
    Object.keys(config).sort().map(key => [key, stableConfigValue(config[key])]),
  );
  return `${gameId}:${variantId}:${JSON.stringify(sortedConfig)}`;
}

export function buildChampionshipCombinationKey(config: GameConfiguration): string {
  const sortedConfig = Object.fromEntries(
    Object.keys(config).sort().map(key => [key, stableConfigValue(config[key])]),
  );
  return `championship:${JSON.stringify(sortedConfig)}`;
}

function loadGameResults(): CompletedGameResult[] {
  try {
    const raw = localStorage.getItem(GAME_RESULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CompletedGameResult[] : [];
  } catch {
    return [];
  }
}

function saveGameResults(results: CompletedGameResult[]): void {
  try {
    localStorage.setItem(GAME_RESULTS_KEY, JSON.stringify(results.slice(-2000)));
  } catch { /* Storage may be unavailable or full. */ }
}

function createResultId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Bots can participate in a session but never receive a human leaderboard record. */
export function recordCompletedGameResult(input: RecordGameResultInput): CompletedGameResult | null {
  if (input.participant.kind === 'bot') return null;
  const result: CompletedGameResult = {
    ...input,
    id: createResultId(),
    schemaVersion: RESULT_SCHEMA_VERSION,
    completedAt: input.completedAt ?? new Date().toISOString(),
  };
  const results = loadGameResults();
  results.push(result);
  saveGameResults(results);
  return result;
}

export function getCompletedGameResults(): CompletedGameResult[] {
  return loadGameResults();
}

export function getChampionshipRunGameResults(runId: string): CompletedGameResult[] {
  return loadGameResults().filter(result => result.championshipRunId === runId);
}

function loadChampionshipResults(): CompletedChampionshipResult[] {
  try {
    const raw = localStorage.getItem(CHAMPIONSHIP_RESULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CompletedChampionshipResult[] : [];
  } catch {
    return [];
  }
}

export function recordCompletedChampionshipResult(
  input: Omit<CompletedChampionshipResult, 'id' | 'schemaVersion' | 'completedAt'>,
): CompletedChampionshipResult | null {
  if (input.participant.kind === 'bot') return null;
  const result: CompletedChampionshipResult = {
    ...input,
    id: createResultId(),
    schemaVersion: RESULT_SCHEMA_VERSION,
    completedAt: new Date().toISOString(),
  };
  const results = loadChampionshipResults();
  results.push(result);
  try {
    localStorage.setItem(CHAMPIONSHIP_RESULTS_KEY, JSON.stringify(results.slice(-1000)));
  } catch { /* Storage may be unavailable or full. */ }
  return result;
}

export function getChampionshipLeaderboard(combinationKey: string, limit = 10): ChampionshipLeaderboardEntry[] {
  const compatible = loadChampionshipResults()
    .filter(result => result.schemaVersion === RESULT_SCHEMA_VERSION && result.combinationKey === combinationKey)
    .sort((a, b) => b.championshipPoints - a.championshipPoints
      || b.gamesWon - a.gamesWon
      || a.elapsedMs - b.elapsedMs);
  const bestByParticipant = new Map<string, CompletedChampionshipResult>();
  for (const result of compatible) {
    if (!bestByParticipant.has(result.participant.id)) bestByParticipant.set(result.participant.id, result);
  }
  return [...bestByParticipant.values()].slice(0, limit).map((result, index) => ({ ...result, rank: index + 1 }));
}

function compareResults(a: CompletedGameResult, b: CompletedGameResult): number {
  if (a.gameId === 'element-match' && a.variantId === 'hunt') {
    const scoreDifference = b.metrics.score - a.metrics.score;
    if (scoreDifference !== 0) return scoreDifference;
    if (a.configKey.includes('"timed":false')) {
      return (a.metrics.moves ?? Number.POSITIVE_INFINITY) - (b.metrics.moves ?? Number.POSITIVE_INFINITY);
    }
    return (a.metrics.elapsedMs ?? Number.POSITIVE_INFINITY) - (b.metrics.elapsedMs ?? Number.POSITIVE_INFINITY);
  }

  if (a.gameId === 'clue-duel') {
    const scoreDifference = b.metrics.score - a.metrics.score;
    if (scoreDifference !== 0) return scoreDifference;
    const clueDifference = (a.metrics.cluesUsed ?? Number.POSITIVE_INFINITY)
      - (b.metrics.cluesUsed ?? Number.POSITIVE_INFINITY);
    if (clueDifference !== 0) return clueDifference;
    return (a.metrics.elapsedMs ?? Number.POSITIVE_INFINITY) - (b.metrics.elapsedMs ?? Number.POSITIVE_INFINITY);
  }

  const metric = GAME_CATALOG[a.gameId].leaderboardMetric;
  if (metric === 'time') {
    const timeDifference = (a.metrics.elapsedMs ?? Number.POSITIVE_INFINITY) - (b.metrics.elapsedMs ?? Number.POSITIVE_INFINITY);
    if (timeDifference !== 0) return timeDifference;
    return (a.metrics.attempts ?? a.metrics.moves ?? Number.POSITIVE_INFINITY)
      - (b.metrics.attempts ?? b.metrics.moves ?? Number.POSITIVE_INFINITY);
  }
  const scoreDifference = b.metrics.score - a.metrics.score;
  if (scoreDifference !== 0) return scoreDifference;
  const accuracyA = a.metrics.total ? (a.metrics.correct ?? 0) / a.metrics.total : 0;
  const accuracyB = b.metrics.total ? (b.metrics.correct ?? 0) / b.metrics.total : 0;
  if (accuracyA !== accuracyB) return accuracyB - accuracyA;
  return (a.metrics.elapsedMs ?? Number.POSITIVE_INFINITY) - (b.metrics.elapsedMs ?? Number.POSITIVE_INFINITY);
}

export function getGameLeaderboard(gameId: GameId, variantId: string, configKey: string, format: PlayerFormat, limit = 10): LeaderboardEntry[] {
  const compatible = loadGameResults()
    .filter(result => result.schemaVersion === RESULT_SCHEMA_VERSION)
    .filter(result => result.gameId === gameId && result.variantId === variantId)
    .filter(result => result.configKey === configKey && result.format === format)
    .sort(compareResults);

  const bestByParticipant = new Map<string, CompletedGameResult>();
  for (const result of compatible) {
    if (!bestByParticipant.has(result.participant.id)) bestByParticipant.set(result.participant.id, result);
  }
  return [...bestByParticipant.values()].slice(0, limit).map((result, index) => ({ ...result, rank: index + 1 }));
}
