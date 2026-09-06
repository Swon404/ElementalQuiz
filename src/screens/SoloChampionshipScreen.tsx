import { useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import { elements } from '../data/elements.ts';
import {
  buildChampionshipCombinationKey,
  getChampionshipLeaderboard,
  getChampionshipRunGameResults,
  recordCompletedChampionshipResult,
  type ChampionshipLeaderboardEntry,
  type CompletedGameResult,
} from '../engine/gameResults.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import type {
  AtomicOrderLevel,
  AtomicOrderMultiplier,
  ElementMatchMode,
  ElementMatchPool,
  ElementMatchTrialTarget,
  PlayerProgress,
} from '../engine/storage.ts';
import { GAME_CATALOG, GAME_IDS, type GameId } from '../games/catalog.ts';
import { ATOMIC_ORDER_LEVELS, ATOMIC_ORDER_TILE_COUNTS } from '../games/atomicOrder.ts';
import AtomQuizScreen from './AtomQuizScreen.tsx';
import ElementOrderScreen from './ElementOrderScreen.tsx';
import QuizScreen from './QuizScreen.tsx';
import SoloClueDuelScreen from './SoloClueDuelScreen.tsx';
import SoloElementMatchScreen, { type HuntTargetMode } from './SoloElementMatchScreen.tsx';
import SoloTrueFalseScreen from './SoloTrueFalseScreen.tsx';
import SymbolPickScreen from './SymbolPickScreen.tsx';

interface SoloChampionshipScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  progress: PlayerProgress;
}

type Phase = 'setup' | 'playing' | 'result';

const participantKind = (playerId: string) => playerId.startsWith('guest:') ? 'guest' as const : 'profile' as const;

export default function SoloChampionshipScreen({ onBack, playerId, playerName, progress }: SoloChampionshipScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedGames, setSelectedGames] = useState<GameId[]>([...GAME_IDS]);
  const [activeGames, setActiveGames] = useState<GameId[]>([]);
  const [gameIndex, setGameIndex] = useState(0);
  const [runId, setRunId] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [finalResults, setFinalResults] = useState<CompletedGameResult[]>([]);
  const [championshipScore, setChampionshipScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<ChampionshipLeaderboardEntry[]>([]);
  const [newBestId, setNewBestId] = useState<string | null>(null);
  const [matchMode, setMatchMode] = useState<ElementMatchMode>('hunt');
  const [matchPool, setMatchPool] = useState<ElementMatchPool>('all');
  const [matchPairs, setMatchPairs] = useState(12);
  const [matchTrialTarget, setMatchTrialTarget] = useState<ElementMatchTrialTarget>(5);
  const [huntTimed, setHuntTimed] = useState(false);
  const [huntTargetMode, setHuntTargetMode] = useState<HuntTargetMode>('none');
  const [huntChosenTarget, setHuntChosenTarget] = useState(1);
  const [huntUnlockPairs, setHuntUnlockPairs] = useState(0);
  const [atomicDifficulty, setAtomicDifficulty] = useState<Difficulty>('explorer');
  const [atomicChallenge, setAtomicChallenge] = useState<AtomicOrderLevel>('easy');
  const [atomicMultiplier, setAtomicMultiplier] = useState<AtomicOrderMultiplier>(1);

  const currentGame = activeGames[gameIndex];
  const toggleGame = (gameId: GameId) => {
    setSelectedGames(current => current.includes(gameId)
      ? current.filter(id => id !== gameId)
      : GAME_IDS.filter(id => [...current, gameId].includes(id)));
  };

  const startChampionship = () => {
    if (selectedGames.length < 2) return;
    const nextRunId = `solo-champ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    setRunId(nextRunId);
    setActiveGames([...selectedGames]);
    setGameIndex(0);
    setStartedAt(Date.now());
    setFinalResults([]);
    setChampionshipScore(0);
    setLeaderboard([]);
    setNewBestId(null);
    setPhase('playing');
  };

  const finishChampionship = (results: CompletedGameResult[]) => {
    const groupedResults = activeGames.map(gameId => results.filter(result => result.gameId === gameId));
    const score = Math.round(groupedResults.reduce((sum, gameResults) => {
      if (!gameResults.length) return sum;
      return sum + gameResults.reduce((gameSum, result) => gameSum + result.metrics.normalizedScore, 0) / gameResults.length;
    }, 0));
    const combinationKey = buildChampionshipCombinationKey({
      format: 'solo',
      size: 'standard',
      games: activeGames,
      gameConfigurations: groupedResults.map(gameResults => gameResults[0]?.configKey ?? 'missing'),
      rulesVersion: 1,
    });
    const recorded = recordCompletedChampionshipResult({
      rulesVersion: 1,
      runId,
      combinationKey,
      format: 'solo',
      participant: { id: playerId, name: playerName, kind: participantKind(playerId) },
      championshipPoints: score,
      gamesWon: groupedResults.filter(gameResults => {
        if (!gameResults.length) return false;
        return gameResults.reduce((sum, result) => sum + result.metrics.normalizedScore, 0) / gameResults.length >= 50;
      }).length,
      gamesDrawn: 0,
      elapsedMs: Math.max(1, Date.now() - startedAt),
    });
    const updatedLeaderboard = getChampionshipLeaderboard(combinationKey);
    setFinalResults(results);
    setChampionshipScore(score);
    setLeaderboard(updatedLeaderboard);
    setNewBestId(recorded && updatedLeaderboard.some(entry => entry.id === recorded.id) ? recorded.id : null);
    setPhase('result');
  };

  const completeCurrentLeg = () => {
    const results = getChampionshipRunGameResults(runId);
    const gameResults = results.filter(result => result.gameId === currentGame);
    const requiredResults = currentGame === 'atomic-order' ? 5 : 1;
    if (gameResults.length < requiredResults) {
      setPhase('setup');
      return;
    }
    if (gameIndex + 1 < activeGames.length) {
      setGameIndex(index => index + 1);
      return;
    }
    finishChampionship(results);
  };

  if (phase === 'setup') {
    return (
      <div className="two-player-setup">
        <button className="back-btn" onClick={onBack}>← Back to Games</button>
        <h2 className="setup-title">🏆 Championship</h2>
        <Elementor expression="greeting" message="Set up your player!" />

        <div className="players-config solo-player-config">
          <div className="player-config-card">
            <h3>Player 1</h3>
            <div className="solo-player-name"><span aria-hidden="true">🧑‍🔬</span><strong>{playerName}</strong></div>
            <span className="champ-option-status">Solo</span>
          </div>
        </div>

        <div className="champ-game-picker">
          <label>Games (choose at least 2):</label>
          <div className="champ-games-list">
            {GAME_IDS.map(gameId => {
              const game = GAME_CATALOG[gameId];
              const selected = selectedGames.includes(gameId);
              return (
                <button key={gameId} className={`champ-game-chip champ-game-toggle ${selected ? 'selected' : ''}`} onClick={() => toggleGame(gameId)} aria-pressed={selected}>
                  {selected ? '✓ ' : ''}{game.icon} {game.label}
                </button>
              );
            })}
          </div>
        </div>
        <section className={`champ-options-group ${selectedGames.includes('element-match') ? '' : 'disabled'}`} aria-disabled={!selectedGames.includes('element-match')}>
          <div className="champ-options-heading">
            <div><strong>🃏 Element Match options</strong><span>{matchMode === 'hunt' ? (huntTimed ? 'One timed Hunt board' : 'One relaxed Hunt board') : 'Timed run to the selected match target'}</span></div>
            <span className="champ-option-status">{selectedGames.includes('element-match') ? 'Included' : 'Game not selected'}</span>
          </div>
          <div className="round-select"><span>Mode:</span><button disabled={!selectedGames.includes('element-match')} className={`round-btn ${matchMode === 'hunt' ? 'selected' : ''}`} onClick={() => setMatchMode('hunt')}>🏹 Hunt</button><button disabled={!selectedGames.includes('element-match')} className={`round-btn ${matchMode === 'time-trial' ? 'selected' : ''}`} onClick={() => setMatchMode('time-trial')}>⏱️ Time Trial</button></div>
          {matchMode === 'hunt' && <div className="round-select"><span>Timer:</span><button disabled={!selectedGames.includes('element-match')} className={`round-btn ${!huntTimed ? 'selected' : ''}`} onClick={() => setHuntTimed(false)}>Off</button><button disabled={!selectedGames.includes('element-match')} className={`round-btn ${huntTimed ? 'selected' : ''}`} onClick={() => setHuntTimed(true)}>On</button><span className="gm-desc">Turn on for the timed Hunt leaderboard</span></div>}
          <div className="round-select"><span>Element pool:</span><button disabled={!selectedGames.includes('element-match')} className={`round-btn ${matchPool === 'all' ? 'selected' : ''}`} onClick={() => setMatchPool('all')}>⚗️ All</button><button disabled={!selectedGames.includes('element-match')} className={`round-btn ${matchPool === 'exotic' ? 'selected' : ''}`} onClick={() => { setMatchPool('exotic'); if (huntChosenTarget < 84) setHuntChosenTarget(84); }}>☢️ Exotic</button></div>
          <div className="round-select"><span>Pairs:</span>{[12, 16, 20].map(count => <button key={count} disabled={!selectedGames.includes('element-match')} className={`round-btn ${matchPairs === count ? 'selected' : ''}`} onClick={() => setMatchPairs(count)}>{count}</button>)}</div>
          {matchMode === 'time-trial' ? (
            <div className="round-select"><span>Find:</span>{([3, 5, 8, 'all'] as ElementMatchTrialTarget[]).map(target => <button key={target} disabled={!selectedGames.includes('element-match')} className={`round-btn ${matchTrialTarget === target ? 'selected' : ''}`} onClick={() => setMatchTrialTarget(target)}>{target === 'all' ? `All ${matchPairs}` : target}</button>)}<span className="gm-desc">matches to stop the clock</span></div>
          ) : (
            <>
              <div className="round-select"><span>Hunt target:</span>{(['none', 'random', 'choose'] as HuntTargetMode[]).map(target => <button key={target} disabled={!selectedGames.includes('element-match')} className={`round-btn ${huntTargetMode === target ? 'selected' : ''}`} onClick={() => setHuntTargetMode(target)}>{target[0].toUpperCase() + target.slice(1)}</button>)}</div>
              {huntTargetMode === 'choose' && <label className="voice-setting-label">Element<select disabled={!selectedGames.includes('element-match')} className="voice-select" value={huntChosenTarget} onChange={event => setHuntChosenTarget(Number(event.target.value))}>{elements.filter(element => matchPool === 'all' || element.atomicNumber >= 84).map(element => <option key={element.atomicNumber} value={element.atomicNumber}>{element.name} ({element.symbol})</option>)}</select></label>}
              {huntTargetMode !== 'none' && <div className="round-select"><span>Unlock after:</span>{[0, 1, 2, 3, 4, 5].map(count => <button key={count} disabled={!selectedGames.includes('element-match')} className={`round-btn ${huntUnlockPairs === count ? 'selected' : ''}`} onClick={() => setHuntUnlockPairs(count)}>{count}</button>)}<span className="gm-desc">matched pairs</span></div>}
            </>
          )}
        </section>
        <section className={`champ-options-group ${selectedGames.includes('atomic-order') ? '' : 'disabled'}`} aria-disabled={!selectedGames.includes('atomic-order')}>
          <div className="champ-options-heading">
            <div><strong>🔢 Atomic Order options</strong><span>Challenge rules, difficulty, and number of tiles</span></div>
            <span className="champ-option-status">{selectedGames.includes('atomic-order') ? 'Included' : 'Game not selected'}</span>
          </div>
          <div className="round-select"><span>Difficulty:</span>{(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(option => <button key={option} disabled={!selectedGames.includes('atomic-order')} className={`round-btn ${atomicDifficulty === option ? 'selected' : ''}`} onClick={() => setAtomicDifficulty(option)}>{DIFFICULTY_CONFIG[option].label}</button>)}</div>
          <span className="atomic-order-setting-label">Challenge:</span>
          <div className="atomic-order-preset-grid">{(Object.keys(ATOMIC_ORDER_LEVELS) as AtomicOrderLevel[]).map(option => <button key={option} disabled={!selectedGames.includes('atomic-order')} className={`atomic-order-preset-btn ${atomicChallenge === option ? 'selected' : ''}`} onClick={() => setAtomicChallenge(option)}><strong>{ATOMIC_ORDER_LEVELS[option].label}</strong><span>{ATOMIC_ORDER_LEVELS[option].description}</span></button>)}</div>
          <div className="round-select"><span>Tiles:</span>{([1, 2, 3, 4] as AtomicOrderMultiplier[]).map(option => <button key={option} disabled={!selectedGames.includes('atomic-order')} className={`round-btn ${atomicMultiplier === option ? 'selected' : ''}`} onClick={() => setAtomicMultiplier(option)}>{option}×</button>)}<span className="gm-desc">{ATOMIC_ORDER_TILE_COUNTS[atomicDifficulty] * atomicMultiplier} tiles</span></div>
        </section>
        <div className="champ-info">
          <div className="champ-games-list">{selectedGames.map(gameId => <span key={gameId} className="champ-game-chip">{GAME_CATALOG[gameId].icon} {GAME_CATALOG[gameId].label}</span>)}</div>
          <p className="champ-info-footer">{selectedGames.length} games selected — each game contributes up to 100 points.</p>
        </div>
        <button className="start-btn" disabled={selectedGames.length < 2} onClick={startChampionship}>Start Solo Championship</button>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="quiz-result">
        <Elementor expression="celebrate" message={`Championship complete — ${championshipScore} points!`} />
        <div className="result-card">
          <h2>🏆 Solo Championship Results</h2>
          <div className="result-stats"><div className="result-stat"><span className="stat-value">{championshipScore}</span><span className="stat-label">Total points</span></div><div className="result-stat"><span className="stat-value">{activeGames.length}</span><span className="stat-label">Games</span></div></div>
        </div>
        <div className="atomic-order-leaderboard match-trial-leaderboard">
          <span className="atomic-order-best-label">Game breakdown</span>
          <ol className="atomic-order-leaderboard-list">{activeGames.map(gameId => {
            const results = finalResults.filter(result => result.gameId === gameId);
            const score = results.length ? Math.round(results.reduce((sum, result) => sum + result.metrics.normalizedScore, 0) / results.length) : 0;
            return <li key={gameId}><span>{GAME_CATALOG[gameId].icon} {GAME_CATALOG[gameId].label}</span><span>{score} pts</span></li>;
          })}</ol>
        </div>
        <div className="atomic-order-leaderboard match-trial-leaderboard">
          <span className="atomic-order-best-label">🏆 This combination's Top 10</span>
          {newBestId && <span className="atomic-order-new-best">🎉 New Championship best!</span>}
          {leaderboard.length ? <ol className="atomic-order-leaderboard-list">{leaderboard.map(entry => <li key={entry.id} className={entry.id === newBestId ? 'me' : ''}><span>{entry.participant.name}</span><span>{entry.championshipPoints} pts</span></li>)}</ol> : <span className="atomic-order-best-values">No scores yet.</span>}
        </div>
        <div className="result-actions"><button className="start-btn" onClick={startChampionship}>Play Again</button><button className="back-btn" onClick={onBack}>Back to Games</button></div>
      </div>
    );
  }

  const sharedProps = { onBack: completeCurrentLeg, playerId, playerName, championshipRunId: runId };
  return (
    <>
      <div className="champ-game-banner">🏆 Solo Championship · Game {gameIndex + 1}/{activeGames.length} · {GAME_CATALOG[currentGame].label}</div>
      {currentGame === 'quiz-battle' && <QuizScreen mode="classic" progress={progress} onComplete={() => completeCurrentLeg()} {...sharedProps} />}
      {currentGame === 'tf-blitz' && <SoloTrueFalseScreen {...sharedProps} />}
      {currentGame === 'element-match' && <SoloElementMatchScreen initialOptions={{ mode: matchMode, pool: matchPool, pairCount: matchPairs, trialTarget: matchTrialTarget, huntTimed, targetMode: huntTargetMode, chosenTarget: huntChosenTarget, unlockPairs: huntUnlockPairs }} {...sharedProps} />}
      {currentGame === 'clue-duel' && <SoloClueDuelScreen {...sharedProps} />}
      {currentGame === 'symbol-pick' && <SymbolPickScreen {...sharedProps} />}
      {currentGame === 'atomic-order' && <ElementOrderScreen initialOptions={{ difficulty: atomicDifficulty, challenge: atomicChallenge, multiplier: atomicMultiplier }} {...sharedProps} />}
      {currentGame === 'atom-quiz' && <AtomQuizScreen {...sharedProps} />}
    </>
  );
}
