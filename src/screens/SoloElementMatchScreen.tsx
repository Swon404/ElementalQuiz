import RewindButton from '../components/RewindButton.tsx';
import { useRewind } from '../engine/useRewind.ts';
import { useEffect, useRef, useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import { elements } from '../data/elements.ts';
import { buildGameConfigKey, getGameLeaderboard, recordCompletedGameResult, removeCompletedGameResult, type LeaderboardEntry } from '../engine/gameResults.ts';
import {
  recordElementMatchHuntTime,
  recordElementMatchTrialTime,
  type ElementMatchMode,
  type ElementMatchPool,
  type ElementMatchTrialTarget,
} from '../engine/storage.ts';
import { playCollect, playCorrect, playWrong } from '../engine/sounds.ts';
import { generateMatchCards, type MatchCard } from '../games/elementMatch.ts';

interface SoloElementMatchScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  championshipRunId?: string;
  championshipHuntRounds?: number;
  initialOptions?: Partial<SoloElementMatchOptions>;
}

type Phase = 'setup' | 'playing' | 'result';
export type HuntTargetMode = 'none' | 'random' | 'choose';
export type SoloElementMatchOptions = {
  mode: ElementMatchMode;
  pool: ElementMatchPool;
  pairCount: number;
  trialTarget: ElementMatchTrialTarget;
  huntTimed: boolean;
  targetMode: HuntTargetMode;
  chosenTarget: number;
  unlockPairs: number;
};

const TARGET_PAIR_POINTS = 2;
const HUNT_WIN_BONUS = 2;
const MISMATCH_FLIP_DELAY_MS = 180;

export default function SoloElementMatchScreen({ onBack, playerId, playerName, championshipRunId, championshipHuntRounds = 1, initialOptions }: SoloElementMatchScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [roundIndex, setRoundIndex] = useState(0);
  const undo = useRewind(roundIndex);
  const pendingRollback = useRef<(() => void) | null>(null);
  const commit = () => { pendingRollback.current = null; undo.clear(); };
  const [mode, setMode] = useState<ElementMatchMode>(initialOptions?.mode ?? 'hunt');
  const [pool, setPool] = useState<ElementMatchPool>(initialOptions?.pool ?? 'all');
  const [pairCount, setPairCount] = useState(initialOptions?.pairCount ?? 12);
  const [trialTarget, setTrialTarget] = useState<ElementMatchTrialTarget>(initialOptions?.trialTarget ?? 5);
  const [huntTimed, setHuntTimed] = useState(initialOptions?.huntTimed ?? false);
  const [targetMode, setTargetMode] = useState<HuntTargetMode>(initialOptions?.targetMode ?? 'none');
  const [chosenTarget, setChosenTarget] = useState(initialOptions?.chosenTarget ?? 1);
  const [unlockPairs, setUnlockPairs] = useState(initialOptions?.unlockPairs ?? 0);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [targetElementNum, setTargetElementNum] = useState<number | null>(null);
  const [firstCardId, setFirstCardId] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newBestId, setNewBestId] = useState<string | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const completedRef = useRef(false);

  const trialGoal = trialTarget === 'all' ? pairCount : Math.min(trialTarget, pairCount);
  const huntRoundCount = mode === 'time-trial' || huntTimed ? 3 : championshipRunId ? championshipHuntRounds : 1;
  const hasNextRound = roundIndex + 1 < huntRoundCount;
  const nextRound = () => {
    commit();
    setRoundIndex(index => index + 1);
    startGame();
  };
  const variantId = mode === 'hunt' ? 'hunt' : 'time-trial';
  const configKey = buildGameConfigKey('element-match', variantId, mode === 'hunt' ? {
    pool,
    pairs: pairCount,
    targetMode,
    targetElement: targetMode === 'choose' ? chosenTarget : null,
    unlockAfterPairs: unlockPairs,
    timed: huntTimed,
  } : {
    pool,
    pairs: pairCount,
    target: trialTarget,
  });

  useEffect(() => {
    if (!timerStarted || !startedAt || completedRef.current || (mode === 'hunt' && !huntTimed)) return;
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => clearInterval(timer);
  }, [huntTimed, mode, startedAt, timerStarted]);

  useEffect(() => () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
  }, []);

  const startGame = () => {
    commit();
    const required = mode === 'hunt' && targetMode === 'choose' ? chosenTarget : null;
    const nextCards = generateMatchCards(pairCount, 118, pool === 'exotic', required);
    const boardElements = Array.from(new Set(nextCards.map(card => card.elementNum)));
    const target = mode !== 'hunt' || targetMode === 'none'
      ? null
      : required ?? boardElements[Math.floor(Math.random() * boardElements.length)] ?? null;
    setCards(nextCards);
    setTargetElementNum(target);
    setFirstCardId(null);
    setLocked(false);
    const startImmediately = mode === 'hunt' && !huntTimed;
    setTimerStarted(startImmediately);
    setStartedAt(startImmediately ? Date.now() : 0);
    setElapsedMs(0);
    setMoves(0);
    setScore(0);
    setMessage(null);
    setNewBestId(null);
    setLeaderboard(getGameLeaderboard('element-match', variantId, configKey, 'solo'));
    completedRef.current = false;
    setPhase('playing');
  };

  const startTimer = () => {
    setStartedAt(Date.now());
    setElapsedMs(0);
    setTimerStarted(true);
  };

  const finishGame = (finalScore: number, finalMoves: number, matchedPairs: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const completedElapsedMs = Math.max(1, Date.now() - startedAt);
    setElapsedMs(completedElapsedMs);
    setTimerStarted(false);
    const total = mode === 'time-trial' ? trialGoal : pairCount;
    const recorded = recordCompletedGameResult({
      rulesVersion: 1,
      gameId: 'element-match',
      variantId,
      configKey,
      format: 'solo',
      participant: { id: playerId, name: playerName, kind: playerId.startsWith('guest:') ? 'guest' : 'profile' },
      championshipRunId,
      metrics: {
        score: finalScore,
        normalizedScore: Math.min(100, Math.round((finalScore / Math.max(1, total)) * 100)),
        correct: matchedPairs,
        total,
        elapsedMs: completedElapsedMs,
        moves: finalMoves,
      },
    });
    const legacyRecord = mode === 'time-trial'
      ? recordElementMatchTrialTime(playerName, pool, pairCount, trialTarget, completedElapsedMs)
      : huntTimed ? recordElementMatchHuntTime(playerName, pool, pairCount, targetMode, unlockPairs, completedElapsedMs) : null;
    const updated = getGameLeaderboard('element-match', variantId, configKey, 'solo');
    setLeaderboard(updated);
    setNewBestId(recorded && updated.some(entry => entry.id === recorded.id) ? recorded.id : null);
    pendingRollback.current = () => {
      if (recorded) removeCompletedGameResult(recorded.id);
      legacyRecord?.undo();
      setLeaderboard(getGameLeaderboard('element-match', variantId, configKey, 'solo'));
      setNewBestId(null);
    };
    playCollect();
    finishTimerRef.current = setTimeout(() => setPhase('result'), 500);
  };

  const flipCard = (cardId: number) => {
    if (!timerStarted || locked || completedRef.current) return;
    const card = cards.find(item => item.id === cardId);
    if (!card || card.flipped || card.matched) return;
    undo.mark(pausedMs => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      pendingRollback.current?.(); pendingRollback.current = null; completedRef.current = false;
      setCards(cards); setFirstCardId(firstCardId); setLocked(false); setScore(score); setMoves(moves);
      setTimerStarted(timerStarted); setStartedAt(startedAt ? startedAt + pausedMs : 0);
      setElapsedMs(elapsedMs); setMessage(message); setPhase('playing');
    });
    const matchedBefore = Math.floor(cards.filter(item => item.matched).length / 2);
    if (mode === 'hunt' && targetElementNum !== null && card.elementNum === targetElementNum && matchedBefore < unlockPairs) {
      const remaining = unlockPairs - matchedBefore;
      setMessage(`Find ${remaining} more pair${remaining === 1 ? '' : 's'} before the target unlocks.`);
      return;
    }

    const flippedCards = cards.map(item => item.id === cardId ? { ...item, flipped: true } : item);
    setCards(flippedCards);
    if (firstCardId === null) {
      setFirstCardId(cardId);
      return;
    }

    setLocked(true);
    const first = flippedCards.find(item => item.id === firstCardId)!;
    const second = flippedCards.find(item => item.id === cardId)!;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    if (first.elementNum === second.elementNum) {
      playCorrect();
      const matchedCards = flippedCards.map(item => item.elementNum === first.elementNum ? { ...item, matched: true } : item);
      const matchedPairs = Math.floor(matchedCards.filter(item => item.matched).length / 2);
      const targetMatch = mode === 'hunt' && targetElementNum !== null && first.elementNum === targetElementNum;
      const pairPoints = targetMatch ? TARGET_PAIR_POINTS : 1;
      const nextScore = score + pairPoints + (targetMatch ? HUNT_WIN_BONUS : 0);
      setCards(matchedCards);
      setScore(nextScore);
      setFirstCardId(null);
      setLocked(false);
      setMessage(targetMatch ? `Target found! +${TARGET_PAIR_POINTS} for the pair and +${HUNT_WIN_BONUS} Hunt bonus.` : null);
      if ((mode === 'time-trial' && matchedPairs >= trialGoal) || (mode === 'hunt' && (targetMatch || matchedPairs >= pairCount))) {
        finishGame(nextScore, nextMoves, matchedPairs);
      }
      return;
    }

    playWrong();
    finishTimerRef.current = setTimeout(() => {
      setCards(current => current.map(item => item.id === firstCardId || item.id === cardId ? { ...item, flipped: false } : item));
      setFirstCardId(null);
      setLocked(false);
    }, MISMATCH_FLIP_DELAY_MS);
  };

  if (phase === 'setup') {
    const availableTargets = pool === 'exotic' ? elements.filter(element => element.atomicNumber >= 84) : elements;
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">🃏 Element Match</h2>
        <Elementor expression="greeting" message="Play a relaxed or timed Hunt, or race through a Time Trial!" />
        <div className="round-select"><span>Mode:</span><button className={`round-btn ${mode === 'hunt' ? 'selected' : ''}`} disabled={!!championshipRunId} onClick={() => setMode('hunt')}>Hunt</button><button className={`round-btn ${mode === 'time-trial' ? 'selected' : ''}`} disabled={!!championshipRunId} onClick={() => setMode('time-trial')}>Time Trial</button></div>
        {mode === 'hunt' && <div className="round-select"><span>Timer:</span><button className={`round-btn ${!huntTimed ? 'selected' : ''}`} onClick={() => setHuntTimed(false)}>Off</button><button className={`round-btn ${huntTimed ? 'selected' : ''}`} onClick={() => setHuntTimed(true)}>On</button><span className="gm-desc">Timed Hunt results join the Hunt leaderboard</span></div>}
        <div className="round-select"><span>Pool:</span><button className={`round-btn ${pool === 'all' ? 'selected' : ''}`} onClick={() => setPool('all')}>⚗️ All</button><button className={`round-btn ${pool === 'exotic' ? 'selected' : ''}`} onClick={() => { setPool('exotic'); if (chosenTarget < 84) setChosenTarget(84); }}>☢️ Exotic</button></div>
        <div className="round-select"><span>Pairs:</span>{[12, 16, 20].map(count => <button key={count} className={`round-btn ${pairCount === count ? 'selected' : ''}`} onClick={() => setPairCount(count)}>{count}</button>)}</div>
        {mode === 'time-trial' ? (
          <div className="round-select"><span>Find:</span>{([3, 5, 8, 'all'] as ElementMatchTrialTarget[]).map(target => <button key={target} className={`round-btn ${trialTarget === target ? 'selected' : ''}`} onClick={() => setTrialTarget(target)}>{target === 'all' ? 'All' : target}</button>)}</div>
        ) : (
          <>
            <div className="round-select"><span>Target:</span>{(['none', 'random', 'choose'] as HuntTargetMode[]).map(target => <button key={target} className={`round-btn ${targetMode === target ? 'selected' : ''}`} onClick={() => setTargetMode(target)}>{target[0].toUpperCase() + target.slice(1)}</button>)}</div>
            {targetMode === 'choose' && <label className="voice-setting-label">Element<select className="voice-select" value={chosenTarget} onChange={event => setChosenTarget(Number(event.target.value))}>{availableTargets.map(element => <option key={element.atomicNumber} value={element.atomicNumber}>{element.name} ({element.symbol})</option>)}</select></label>}
            <div className="round-select"><span>Unlock after:</span>{[0, 1, 2, 3, 4, 5].map(count => <button key={count} className={`round-btn ${unlockPairs === count ? 'selected' : ''}`} onClick={() => setUnlockPairs(count)}>{count}</button>)}</div>
          </>
        )}
        <button className="start-btn" onClick={startGame}>Start Game!</button>
      </div>
    );
  }

  if (phase === 'playing') {
    const matchedPairs = Math.floor(cards.filter(card => card.matched).length / 2);
    const target = elements.find(element => element.atomicNumber === targetElementNum);
    return (
      <div className="element-match-playing match-trial-playing">
        <RewindButton enabled={undo.canRewind} onRewind={undo.rewind} />
        <div className="match-header"><button className="quiz-exit-btn" onClick={onBack} title="Quit">✕</button><span className="match-turn">{mode === 'hunt' ? `Element Hunt${huntRoundCount > 1 ? ` · Round ${roundIndex + 1}/${huntRoundCount}` : ''}` : `Element Match Time Trial · Round ${roundIndex + 1}/${huntRoundCount}`}</span><div className="match-scores"><span>{score} points · {moves} moves</span></div></div>
        {(mode === 'time-trial' || huntTimed) && <div className="atomic-order-card match-hunt-timer-card"><div className="atomic-order-big-timer">{(elapsedMs / 1000).toFixed(1)}<span>s</span></div>{!timerStarted && !completedRef.current && <div className="atomic-order-ready"><p>The cards appear when the timer starts.</p><button className="start-btn" onClick={startTimer}>Start Timer</button></div>}</div>}
        {mode === 'hunt' && target && <div className="hunt-target-banner">Target: <strong>{target.name} ({target.symbol})</strong>{unlockPairs > 0 && <span className="hunt-unlock-status">{matchedPairs >= unlockPairs ? 'Unlocked' : `Unlocks after ${unlockPairs} pairs (${matchedPairs}/${unlockPairs})`}</span>}</div>}
        {message && <p className="hunt-found-message">{message}</p>}
        {timerStarted && <><div className="match-trial-progress"><span style={{ width: `${Math.min(100, (matchedPairs / (mode === 'time-trial' ? trialGoal : pairCount)) * 100)}%` }} /></div><p className="match-trial-progress-label">{matchedPairs} of {mode === 'time-trial' ? trialGoal : pairCount} matches</p><div className="match-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>{cards.map(card => <button key={card.id} className={`match-card ${card.flipped || card.matched ? 'flipped' : ''} ${card.matched ? 'matched matched-p1' : ''}`} onClick={() => flipCard(card.id)} disabled={locked || card.flipped || card.matched}><span className="match-card-inner">{card.flipped || card.matched ? card.text : '?'}</span></button>)}</div></>}
      </div>
    );
  }

  return (
    <div className="quiz-result"><RewindButton enabled={undo.canRewind} onRewind={undo.rewind} /><Elementor expression="celebrate" message={mode === 'hunt' && !huntTimed ? 'Hunt complete!' : `${mode === 'hunt' ? 'Hunt' : 'Time Trial'} complete in ${(elapsedMs / 1000).toFixed(1)} seconds!`} /><div className="result-card"><h2>{huntRoundCount > 1 ? `${mode === 'hunt' ? 'Hunt' : 'Time Trial'} Round ${roundIndex + 1}/${huntRoundCount} Complete!` : 'Element Match Complete!'}</h2><div className="result-stats"><div className="result-stat"><span className="stat-value">{score}</span><span className="stat-label">Points</span></div><div className="result-stat"><span className="stat-value">{moves}</span><span className="stat-label">Moves</span></div>{(mode === 'time-trial' || huntTimed) && <div className="result-stat"><span className="stat-value">{(elapsedMs / 1000).toFixed(1)}s</span><span className="stat-label">Time</span></div>}</div></div><div className="atomic-order-leaderboard match-trial-leaderboard"><span className="atomic-order-best-mode">{pool === 'exotic' ? 'Exotic' : 'All'} · {pairCount} pairs · {mode === 'hunt' ? (huntTimed ? 'Timed Hunt' : 'Relaxed Hunt') : `Find ${trialTarget}`}</span><span className="atomic-order-best-label">🏆 Element Match Top 10</span>{newBestId && <span className="atomic-order-new-best">🎉 New leaderboard best!</span>}{leaderboard.length ? <ol className="atomic-order-leaderboard-list">{leaderboard.map(entry => <li key={entry.id} className={entry.id === newBestId ? 'me' : ''}><span>{entry.participant.name} · {entry.metrics.moves} moves</span><span>{mode === 'hunt' && !huntTimed ? `${entry.metrics.score} points` : entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : '—'}</span></li>)}</ol> : <span className="atomic-order-best-values">No results yet — set the first!</span>}</div><div className="result-actions">{championshipRunId ? <button className="start-btn" onClick={hasNextRound ? nextRound : () => { commit(); onBack(); }}>{hasNextRound ? 'Next Round →' : 'Continue Championship →'}</button> : <><button className="start-btn" onClick={hasNextRound ? nextRound : () => { setRoundIndex(0); startGame(); }}>{hasNextRound ? 'Next Round →' : 'Play Again'}</button><button className="back-btn" onClick={() => { commit(); onBack(); }}>Back to Games</button></>}</div></div>
  );
}
