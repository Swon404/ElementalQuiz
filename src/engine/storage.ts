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
