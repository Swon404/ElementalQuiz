import { useState, useCallback } from 'react';
import IntroScreen from './screens/IntroScreen.tsx';
import ProfileScreen from './screens/ProfileScreen.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import QuizScreen from './screens/QuizScreen.tsx';
import TwoPlayerScreen from './screens/TwoPlayerScreen.tsx';
import ExploreScreen from './screens/ExploreScreen.tsx';
import ElementOrderScreen from './screens/ElementOrderScreen.tsx';
import AtomQuizScreen from './screens/AtomQuizScreen.tsx';
import ExoticQuizScreen from './screens/ExoticQuizScreen.tsx';
import ElementLabScreen from './screens/ElementLabScreen.tsx';
import SymbolPickScreen from './screens/SymbolPickScreen.tsx';
import SoloTrueFalseScreen from './screens/SoloTrueFalseScreen.tsx';
import SoloClueDuelScreen from './screens/SoloClueDuelScreen.tsx';
import SoloElementMatchScreen from './screens/SoloElementMatchScreen.tsx';
import GameHubScreen from './screens/GameHubScreen.tsx';
import SoloChampionshipScreen from './screens/SoloChampionshipScreen.tsx';
import type { GameId, PlayerFormat } from './games/catalog.ts';
import {
  loadProgress, saveProgress, collectElement, addQuizResult,
  loadProfiles, createProfile, deleteProfile, resetProfile, setActiveProfileId, getActiveProfileId,
  type PlayerProgress, type PlayerProfile,
} from './engine/storage.ts';
import type { Difficulty } from './engine/scoring.ts';

type QuizBattleScreen = 'quiz-battle-classic' | 'quiz-battle-sprint' | 'quiz-battle-deep-dive' | 'quiz-battle-showdown';
type Screen = 'intro' | 'profile' | 'home' | 'play' | QuizBattleScreen | 'two-player' | 'two-player-champ' | 'solo-champ' | 'explore' | 'atomic-order' | 'atom-quiz' | 'quiz-battle-exotic' | 'element-lab' | 'symbol-pick' | 'solo-tf-blitz' | 'solo-clue-duel' | 'solo-element-match';

const QUIZ_BATTLE_SCREENS: Record<QuizBattleScreen, 'classic' | 'sprint' | 'deep-dive' | 'showdown'> = {
  'quiz-battle-classic': 'classic',
  'quiz-battle-sprint': 'sprint',
  'quiz-battle-deep-dive': 'deep-dive',
  'quiz-battle-showdown': 'showdown',
};

function isQuizBattleScreen(screen: Screen): screen is QuizBattleScreen {
  return screen in QUIZ_BATTLE_SCREENS;
}

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
  const [versusLaunch, setVersusLaunch] = useState<{ gameId: GameId; format: Exclude<PlayerFormat, 'solo'> }>({ gameId: 'quiz-battle', format: 'versus-human' });
  const [championshipFormat, setChampionshipFormat] = useState<Exclude<PlayerFormat, 'solo'>>('versus-human');
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
      saveProgress(updated);
      return updated;
    });
    setScreen(screen === 'quiz-battle-deep-dive' ? 'explore' : 'play');
  }, [screen]);

  const handleIntroDone = useCallback(() => {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    setProfiles(loadProfiles());
    setScreen('profile');
  }, []);

  const handleLaunchGame = useCallback((gameId: GameId, format: PlayerFormat) => {
    if (format !== 'solo') {
      setVersusLaunch({ gameId, format });
      setScreen('two-player');
      return;
    }
    const soloRoutes: Record<GameId, Screen> = {
      'quiz-battle': 'quiz-battle-classic',
      'tf-blitz': 'solo-tf-blitz',
      'element-match': 'solo-element-match',
      'clue-duel': 'solo-clue-duel',
      'symbol-pick': 'symbol-pick',
      'atomic-order': 'atomic-order',
      'atom-quiz': 'atom-quiz',
    };
    setScreen(soloRoutes[gameId]);
  }, []);

  const handleLaunchChampionship = useCallback((format: PlayerFormat) => {
    if (format === 'solo') {
      setScreen('solo-champ');
      return;
    }
    setChampionshipFormat(format);
    setScreen('two-player-champ');
  }, []);

  const handleLaunchQuizVariant = useCallback((variant: 'sprint' | 'showdown') => {
    const routes: Record<typeof variant, Screen> = {
      sprint: 'quiz-battle-sprint',
      showdown: 'quiz-battle-showdown',
    };
    setScreen(routes[variant]);
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
      {screen === 'play' && (
        <GameHubScreen
          onBack={() => setScreen('home')}
          onLaunchGame={handleLaunchGame}
          onLaunchChampionship={handleLaunchChampionship}
          onLaunchQuizVariant={handleLaunchQuizVariant}
        />
      )}
      {isQuizBattleScreen(screen) && (
        <QuizScreen
          mode={QUIZ_BATTLE_SCREENS[screen]}
          progress={progress}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
          onComplete={handleQuizComplete}
          onBack={() => setScreen(screen === 'quiz-battle-deep-dive' ? 'explore' : 'play')}
        />
      )}
      {screen === 'two-player' && (
        <TwoPlayerScreen
          initialMode={versusLaunch.gameId}
          initialPlayer2Mode={versusLaunch.format === 'versus-bot' ? 'bot' : 'human'}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player 1'}
          onComplete={() => setScreen('home')}
          onBack={() => setScreen('play')}
        />
      )}
      {screen === 'two-player-champ' && (
        <TwoPlayerScreen
          initialMode="championship"
          initialPlayer2Mode={championshipFormat === 'versus-bot' ? 'bot' : 'human'}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player 1'}
          onComplete={() => setScreen('home')}
          onBack={() => setScreen('play')}
        />
      )}
      {screen === 'solo-champ' && (
        <SoloChampionshipScreen
          progress={progress}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
          onBack={() => setScreen('play')}
        />
      )}
      {screen === 'explore' && (
        <ExploreScreen
          progress={progress}
          onBack={() => setScreen('home')}
          onDeepDive={() => setScreen('quiz-battle-deep-dive')}
          onExoticElements={() => setScreen('quiz-battle-exotic')}
        />
      )}
      {screen === 'atomic-order' && (
        <ElementOrderScreen
          onBack={() => setScreen('play')}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
        />
      )}
      {screen === 'atom-quiz' && (
        <AtomQuizScreen
          onBack={() => setScreen('play')}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
        />
      )}
      {screen === 'quiz-battle-exotic' && (
        <ExoticQuizScreen
          onBack={() => setScreen('explore')}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
        />
      )}
      {screen === 'element-lab' && (
        <ElementLabScreen onBack={() => setScreen('home')} playerName={activeProfileName} />
      )}
      {screen === 'symbol-pick' && (
        <SymbolPickScreen
          onBack={() => setScreen('play')}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
        />
      )}
      {screen === 'solo-tf-blitz' && (
        <SoloTrueFalseScreen
          onBack={() => setScreen('play')}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
        />
      )}
      {screen === 'solo-clue-duel' && (
        <SoloClueDuelScreen
          onBack={() => setScreen('play')}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
        />
      )}
      {screen === 'solo-element-match' && (
        <SoloElementMatchScreen
          onBack={() => setScreen('play')}
          playerId={getActiveProfileId() ?? `guest:${activeProfileName.toLowerCase()}`}
          playerName={activeProfileName || 'Player'}
        />
      )}
    </div>
  );
}
