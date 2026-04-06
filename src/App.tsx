import { useState, useCallback } from 'react';
import IntroScreen from './screens/IntroScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import QuizScreen from './screens/QuizScreen.tsx';
import TwoPlayerScreen from './screens/TwoPlayerScreen.tsx';
import ExploreScreen from './screens/ExploreScreen.tsx';
import {
  loadProgress, saveProgress, collectElement, addQuizResult,
  loadProfiles, createProfile, deleteProfile, resetProfile, setActiveProfileId, getActiveProfileId,
  type PlayerProgress, type PlayerProfile,
} from './engine/storage.ts';
import type { Difficulty } from './engine/scoring.ts';

type Screen = 'intro' | 'profile' | 'home' | 'quick-quiz' | 'sprint' | 'daily' | 'deep-dive' | 'two-player' | 'explore';

const INTRO_SEEN_KEY = 'elementalquiz_intro_seen';

function getInitialScreen(): Screen {
  if (!localStorage.getItem(INTRO_SEEN_KEY)) return 'intro';
  if (!getActiveProfileId()) return 'profile';
  return 'home';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [profiles, setProfiles] = useState<PlayerProfile[]>(loadProfiles);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfileName, setActiveProfileName] = useState<string>(() => {
    const id = getActiveProfileId();
    if (id) {
      const p = loadProfiles().find(pr => pr.id === id);
      if (p) return p.name;
    }
    return '';
  });

  const navigateTo = useCallback((s: string) => setScreen(s as Screen), []);

  const handleSelectProfile = useCallback((profile: PlayerProfile) => {
    setActiveProfileId(profile.id);
    setProgress(profile.progress);
    setActiveProfileName(profile.name);
    setShowProfileModal(false);
    setScreen('home');
  }, []);

  const handleCreateProfile = useCallback((name: string) => {
    const profile = createProfile(name);
    setActiveProfileId(profile.id);
    setProfiles(loadProfiles());
    setProgress(profile.progress);
    setActiveProfileName(profile.name);
    setShowProfileModal(false);
    setScreen('home');
  }, []);

  const handleDeleteProfile = useCallback((id: string) => {
    deleteProfile(id);
    const updated = loadProfiles();
    setProfiles(updated);
    // If we deleted the active profile, go back to profile screen
    if (getActiveProfileId() === null) {
      setShowProfileModal(false);
      if (updated.length === 0) {
        setScreen('profile');
      } else {
        setScreen('profile');
      }
    }
  }, []);

  const handleResetProfile = useCallback((id: string) => {
    resetProfile(id);
    const updated = loadProfiles();
    setProfiles(updated);
    // If we reset the active profile, reload its progress
    if (getActiveProfileId() === id) {
      setProgress(loadProgress());
    }
  }, []);

  const handleSwitchProfile = useCallback(() => {
    setProfiles(loadProfiles());
    setShowProfileModal(true);
  }, []);

  const handleQuizComplete = useCallback((earnedEP: number, correct: number, total: number, collected: number[], difficulty: Difficulty) => {
    setProgress(prev => {
      let updated = {
        ...prev,
        totalEP: prev.totalEP + earnedEP,
        bestStreak: Math.max(prev.bestStreak, correct), // rough approximation
      };
      for (const num of collected) {
        updated = collectElement(updated, num);
      }
      updated = addQuizResult(updated, {
        date: new Date().toISOString(),
        difficulty,
        score: earnedEP,
        correct,
        total,
        mode: screen,
      });
      if (screen === 'daily') {
        updated.dailyChallengeDate = new Date().toDateString();
        updated.dailyChallengeScore = earnedEP;
      }
      saveProgress(updated);
      return updated;
    });
    setScreen('home');
  }, [screen]);

  const handleIntroDone = useCallback(() => {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    setProfiles(loadProfiles());
    setScreen('profile');
  }, []);

  return (
    <div className="app">
      {screen === 'intro' && (
        <IntroScreen onFinish={handleIntroDone} />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          profiles={profiles}
          activeId={getActiveProfileId()}
          onSelect={handleSelectProfile}
          onCreate={handleCreateProfile}
          onDelete={handleDeleteProfile}
          onReset={handleResetProfile}
        />
      )}
      {screen === 'home' && (
        <>
          <HomeScreen
            progress={progress}
            playerName={activeProfileName}
            onNavigate={navigateTo}
            onSwitchProfile={handleSwitchProfile}
          />
          {showProfileModal && (
            <ProfileScreen
              profiles={profiles}
              activeId={getActiveProfileId()}
              isModal
              onSelect={handleSelectProfile}
              onCreate={handleCreateProfile}
              onDelete={handleDeleteProfile}
              onReset={handleResetProfile}
              onClose={() => setShowProfileModal(false)}
            />
          )}
        </>
      )}
      {(screen === 'quick-quiz' || screen === 'sprint' || screen === 'daily' || screen === 'deep-dive') && (
        <QuizScreen
          mode={screen}
          progress={progress}
          onComplete={handleQuizComplete}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'two-player' && (
        <TwoPlayerScreen
          onComplete={() => setScreen('home')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'explore' && (
        <ExploreScreen
          progress={progress}
          onBack={() => setScreen('home')}
        />
      )}
    </div>
  );
}
