import type { Difficulty } from '../engine/scoring.ts';

export type PlayerProgress = {
  totalEP: number;
  streak: number;
  bestStreak: number;
  elementsCollected: number[]; // atomic numbers
  quizHistory: QuizResult[];
};

export type QuizResult = {
  date: string;
  difficulty: Difficulty;
  score: number;
  correct: number;
  total: number;
  mode: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  progress: PlayerProgress;
  createdAt: string;
};

const PROFILES_KEY = 'elementalquiz_profiles';
const ACTIVE_PROFILE_KEY = 'elementalquiz_active_profile';
const STORAGE_KEY = 'elementalquiz_progress'; // legacy single-player key
const TWO_PLAYER_KEY = 'elementalquiz_2p_names';
const TWO_PLAYER_SETTINGS_KEY = 'elementalquiz_2p_settings';

export type TwoPlayerNames = { name1: string; avatar1: string; name2: string; avatar2: string };

export type TwoPlayerSettings = {
  player1Difficulty: Difficulty;
  player2Difficulty: Difficulty;
  player2Mode: 'human' | 'bot';
  rounds: number;
  champSize: 'quick' | 'standard' | 'epic';
  championshipGames: string[];
  matchExotic: boolean;
  huntTargetMode: 'none' | 'random' | 'choose';
  huntTargetElementNum: number | null;
  huntRequiredPairs: number;
  orderShowHints: boolean;
  orderWrongGuessPenalty: boolean;
  orderRandomizeStart: boolean;
};

const DEFAULT_TWO_PLAYER_SETTINGS: TwoPlayerSettings = {
  player1Difficulty: 'explorer',
  player2Difficulty: 'explorer',
  player2Mode: 'human',
  rounds: 5,
  champSize: 'standard',
  championshipGames: ['quiz-battle', 'tf-blitz', 'atom-quiz', 'clue-duel', 'symbol-pick', 'atomic-order', 'element-match'],
  matchExotic: false,
  huntTargetMode: 'none',
  huntTargetElementNum: null,
  huntRequiredPairs: 0,
  orderShowHints: false,
  orderWrongGuessPenalty: false,
  orderRandomizeStart: true,
};

export function loadTwoPlayerNames(): TwoPlayerNames {
  try {
    const raw = localStorage.getItem(TWO_PLAYER_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { name1: 'Player 1', avatar1: '⚛️', name2: 'Player 2', avatar2: '🚀' };
}

export function saveTwoPlayerNames(names: TwoPlayerNames): void {
  localStorage.setItem(TWO_PLAYER_KEY, JSON.stringify(names));
}

export function loadTwoPlayerSettings(): TwoPlayerSettings {
  try {
    const raw = localStorage.getItem(TWO_PLAYER_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_TWO_PLAYER_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_TWO_PLAYER_SETTINGS };
}

export function saveTwoPlayerSettings(settings: TwoPlayerSettings): void {
  try {
    localStorage.setItem(TWO_PLAYER_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

/* ===== Atomic Order Best Times & Leaderboard (Two Player) ===== */

const ATOMIC_ORDER_TIMES_KEY = 'elementalquiz_atomic_order_times';

type AtomicOrderTimesEntry = { name: string; times: number[] };
type AtomicOrderTimesStore = Record<string, AtomicOrderTimesEntry>;

export type AtomicOrderLeaderboardEntry = { name: string; timeMs: number };

function loadAtomicOrderTimesStore(): AtomicOrderTimesStore {
  try {
    const raw = localStorage.getItem(ATOMIC_ORDER_TIMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number[] | AtomicOrderTimesEntry>;
      const store: AtomicOrderTimesStore = {};
      for (const key of Object.keys(parsed)) {
        const value = parsed[key];
        // Legacy format stored a bare number[] with no display name — fall back to the key's name segment.
        store[key] = Array.isArray(value) ? { name: key.split('::')[0] || 'Player', times: value } : value;
      }
      return store;
    }
  } catch { /* ignore */ }
  return {};
}

function saveAtomicOrderTimesStore(store: AtomicOrderTimesStore): void {
  try {
    localStorage.setItem(ATOMIC_ORDER_TIMES_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

function atomicOrderTimesKey(playerName: string, difficulty: Difficulty, showHints: boolean, wrongGuessPenalty: boolean, randomizeStart: boolean): string {
  return `${playerName.trim().toLowerCase() || 'player'}::${difficulty}::${showHints ? 'hints' : 'no-hints'}::${wrongGuessPenalty ? 'penalty' : 'no-penalty'}::${randomizeStart ? 'random-start' : 'misplaced-start'}`;
}

function atomicOrderLeaderboardFromStore(store: AtomicOrderTimesStore, difficulty: Difficulty, showHints: boolean, wrongGuessPenalty: boolean, randomizeStart: boolean, limit: number): AtomicOrderLeaderboardEntry[] {
  const suffix = `::${difficulty}::${showHints ? 'hints' : 'no-hints'}::${wrongGuessPenalty ? 'penalty' : 'no-penalty'}::${randomizeStart ? 'random-start' : 'misplaced-start'}`;
  const entries: AtomicOrderLeaderboardEntry[] = [];
  for (const key of Object.keys(store)) {
    if (!key.endsWith(suffix)) continue;
    const { name, times } = store[key];
    for (const timeMs of times) entries.push({ name, timeMs });
  }
  return entries.sort((a, b) => a.timeMs - b.timeMs).slice(0, limit);
}

/** Get a player's top 3 fastest Atomic Order times (ms) for one ruleset, fastest first. */
export function getAtomicOrderBestTimes(playerName: string, difficulty: Difficulty, showHints: boolean, wrongGuessPenalty: boolean, randomizeStart: boolean): number[] {
  const store = loadAtomicOrderTimesStore();
  return store[atomicOrderTimesKey(playerName, difficulty, showHints, wrongGuessPenalty, randomizeStart)]?.times ?? [];
}

/** Get the leaderboard (fastest first) across every player who has recorded a time for this ruleset. */
export function getAtomicOrderLeaderboard(difficulty: Difficulty, showHints: boolean, wrongGuessPenalty: boolean, randomizeStart: boolean, limit = 5): AtomicOrderLeaderboardEntry[] {
  return atomicOrderLeaderboardFromStore(loadAtomicOrderTimesStore(), difficulty, showHints, wrongGuessPenalty, randomizeStart, limit);
}

/**
 * Record a new Atomic Order time, keeping only each player's fastest 3.
 * Returns the refreshed leaderboard (top 5) and whether this run made the leaderboard.
 */
export function recordAtomicOrderTime(playerName: string, difficulty: Difficulty, showHints: boolean, wrongGuessPenalty: boolean, randomizeStart: boolean, elapsedMs: number): { leaderboard: AtomicOrderLeaderboardEntry[]; madeLeaderboard: boolean } {
  const store = loadAtomicOrderTimesStore();
  const key = atomicOrderTimesKey(playerName, difficulty, showHints, wrongGuessPenalty, randomizeStart);
  const name = playerName.trim() || 'Player';
  const existing = store[key]?.times ?? [];
  const combined = [...existing, elapsedMs].sort((a, b) => a - b).slice(0, 3);
  store[key] = { name, times: combined };
  saveAtomicOrderTimesStore(store);
  const leaderboard = atomicOrderLeaderboardFromStore(store, difficulty, showHints, wrongGuessPenalty, randomizeStart, 5);
  const madeLeaderboard = leaderboard.some(e => e.name === name && e.timeMs === elapsedMs);
  return { leaderboard, madeLeaderboard };
}

function getDefaultProgress(): PlayerProgress {
  return {
    totalEP: 0,
    streak: 0,
    bestStreak: 0,
    elementsCollected: [],
    quizHistory: [],
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Load all player profiles */
export function loadProfiles(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile[];
      // Ensure each profile has default fields
      return parsed.map(p => ({
        ...p,
        progress: { ...getDefaultProgress(), ...p.progress },
      }));
    }
  } catch {
    // corrupted
  }

  // Migrate legacy single-player data into a profile if it exists
  const legacy = localStorage.getItem(STORAGE_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      const migrated: PlayerProfile = {
        id: generateId(),
        name: 'Player 1',
        progress: { ...getDefaultProgress(), ...parsed },
        createdAt: new Date().toISOString(),
      };
      saveProfiles([migrated]);
      setActiveProfileId(migrated.id);
      localStorage.removeItem(STORAGE_KEY);
      return [migrated];
    } catch {
      // ignore
    }
  }

  return [];
}

/** Save all profiles */
export function saveProfiles(profiles: PlayerProfile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // storage full
  }
}

/** Get the active profile ID */
export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

/** Set the active profile ID */
export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

/** Clear the active profile */
export function clearActiveProfile(): void {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}

/** Create a new profile */
export function createProfile(name: string): PlayerProfile {
  const profile: PlayerProfile = {
    id: generateId(),
    name: name.trim(),
    progress: getDefaultProgress(),
    createdAt: new Date().toISOString(),
  };
  const profiles = loadProfiles();
  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
}

/** Delete a profile by ID */
export function deleteProfile(id: string): void {
  const profiles = loadProfiles().filter(p => p.id !== id);
  saveProfiles(profiles);
  if (getActiveProfileId() === id) {
    clearActiveProfile();
  }
}

/** Reset a profile's progress (keep name, clear stats) */
export function resetProfile(id: string): void {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx >= 0) {
    profiles[idx].progress = getDefaultProgress();
    saveProfiles(profiles);
  }
}

/** Update progress for a specific profile */
export function saveProfileProgress(profileId: string, progress: PlayerProgress): void {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === profileId);
  if (idx >= 0) {
    profiles[idx].progress = progress;
    saveProfiles(profiles);
  }
}

/** Load progress for the active profile (returns default if no profile) */
export function loadProgress(): PlayerProgress {
  const id = getActiveProfileId();
  if (id) {
    const profiles = loadProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) return { ...getDefaultProgress(), ...profile.progress };
  }
  return getDefaultProgress();
}

/** Save progress (saves to active profile) */
export function saveProgress(progress: PlayerProgress): void {
  const id = getActiveProfileId();
  if (id) {
    saveProfileProgress(id, progress);
  }
}

export function collectElement(progress: PlayerProgress, atomicNumber: number): PlayerProgress {
  if (progress.elementsCollected.includes(atomicNumber)) return progress;
  return {
    ...progress,
    elementsCollected: [...progress.elementsCollected, atomicNumber],
  };
}

export function addQuizResult(progress: PlayerProgress, result: QuizResult): PlayerProgress {
  return {
    ...progress,
    quizHistory: [...progress.quizHistory.slice(-49), result], // keep last 50
  };
}

/* ===== Custom Elements (Element Lab) ===== */

const CUSTOM_ELEMENTS_KEY = 'elementalquiz_custom_elements';

export type CustomElement = {
  id: string;
  atomicNumber: number;
  symbol: string;
  name: string;
  category: string;
  stateAtRoomTemp: string;
  color: string;
  superpower: string;
  funFact: string;
  discoveredBy: string;
  createdAt: string;
  // Extended fields (auto-generated)
  atomicMass?: number;
  period?: number;
  group?: number;
  block?: string;
  electronConfiguration?: string;
  radioactive?: boolean;
  halfLife?: string;
  compounds?: string[];
  uses?: string[];
  obtainedFrom?: string;
  additionalFacts?: string[];
};

export function loadCustomElements(): CustomElement[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ELEMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveCustomElement(el: CustomElement): void {
  const all = loadCustomElements();
  all.push(el);
  localStorage.setItem(CUSTOM_ELEMENTS_KEY, JSON.stringify(all));
}

export function deleteCustomElement(id: string): void {
  const all = loadCustomElements().filter(e => e.id !== id);
  localStorage.setItem(CUSTOM_ELEMENTS_KEY, JSON.stringify(all));
}

export function getNextCustomAtomicNumber(): number {
  const all = loadCustomElements();
  if (all.length === 0) return 119;
  return Math.max(...all.map(e => e.atomicNumber)) + 1;
}
