import { useCallback, useEffect, useRef, useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import { elements } from '../data/elements.ts';
import { buildGameConfigKey, getGameLeaderboard, recordCompletedGameResult, type LeaderboardEntry } from '../engine/gameResults.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import { recordAtomicOrderTime, type AtomicOrderLevel, type AtomicOrderMultiplier } from '../engine/storage.ts';
import { playCollect, playCorrect, playWrong } from '../engine/sounds.ts';
import {
  ATOMIC_ORDER_LEVELS,
  ATOMIC_ORDER_TILE_COUNTS,
  generateAtomicOrderRounds,
  type AtomicOrderFeedback,
  type AtomicOrderResult,
  type AtomicOrderRound,
} from '../games/atomicOrder.ts';

interface ElementOrderScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  championshipRunId?: string;
  initialOptions?: Partial<SoloAtomicOrderOptions>;
}

export type SoloAtomicOrderOptions = {
  difficulty: Difficulty;
  challenge: AtomicOrderLevel;
  multiplier: AtomicOrderMultiplier;
};

type Phase = 'setup' | 'playing' | 'result';
const ROUND_COUNT = 5;

export default function ElementOrderScreen({ onBack, playerId, playerName, championshipRunId, initialOptions }: ElementOrderScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialOptions?.difficulty ?? 'explorer');
  const [challenge, setChallenge] = useState<AtomicOrderLevel>(initialOptions?.challenge ?? 'easy');
  const [multiplier, setMultiplier] = useState<AtomicOrderMultiplier>(initialOptions?.multiplier ?? 1);
  const [gameRounds, setGameRounds] = useState<AtomicOrderRound[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [tiles, setTiles] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AtomicOrderFeedback[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<AtomicOrderResult | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newBestId, setNewBestId] = useState<string | null>(null);
  const resultRecordedRef = useRef(false);

  const rules = ATOMIC_ORDER_LEVELS[challenge];
  const tileCount = ATOMIC_ORDER_TILE_COUNTS[difficulty] * multiplier;
  const configKey = buildGameConfigKey('atomic-order', 'arrange', { difficulty, challenge, multiplier, tiles: tileCount });

  const prepareRound = (rounds: AtomicOrderRound[], index: number) => {
    setTiles([...(rounds[index]?.p1 ?? [])]);
    setSelected(null);
    setFeedback([]);
    setAttempts(0);
    setElapsedMs(0);
    setResult(null);
    setStartedAt(0);
    setNewBestId(null);
    resultRecordedRef.current = false;
  };

  const startGame = useCallback(() => {
    const rounds = generateAtomicOrderRounds(ROUND_COUNT, difficulty, difficulty, multiplier, rules.randomizeStart);
    setGameRounds(rounds);
    setRoundIndex(0);
    setTotalAttempts(0);
    setTotalElapsedMs(0);
    setLeaderboard(getGameLeaderboard('atomic-order', 'arrange', configKey, 'solo'));
    prepareRound(rounds, 0);
    setPhase('playing');
  }, [configKey, difficulty, multiplier, rules.randomizeStart]);

  useEffect(() => {
    if (!startedAt || result) return;
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => clearInterval(timer);
  }, [result, startedAt]);

  const startTimer = () => {
    setStartedAt(Date.now());
    setElapsedMs(0);
  };

  const swapTiles = (first: number, second: number) => {
    if (!startedAt || result || first === second) return;
    setTiles(current => {
      const updated = [...current];
      [updated[first], updated[second]] = [updated[second], updated[first]];
      return updated;
    });
    setFeedback([]);
  };

  const selectTile = (index: number) => {
    if (!startedAt || result) return;
    if (selected === null) setSelected(index);
    else if (selected === index) setSelected(null);
    else {
      swapTiles(selected, index);
      setSelected(null);
    }
  };

  const submit = () => {
    if (!startedAt || result || tiles.length < 3) return;
    const sorted = [...tiles].sort((a, b) => a - b);
    const nextFeedback = tiles.map((atomicNumber, index): AtomicOrderFeedback => {
      const targetIndex = sorted.indexOf(atomicNumber);
      return targetIndex === index ? 'correct' : targetIndex < index ? 'left' : 'right';
    });
    const nextAttempts = attempts + 1;
    const solved = nextFeedback.every(value => value === 'correct');
    setAttempts(nextAttempts);
    setFeedback(nextFeedback);
    setSelected(null);
    if (!solved) {
      playWrong();
      if (rules.wrongGuessPenalty) setStartedAt(current => current - 1000);
      return;
    }

    playCorrect();
    const completedElapsedMs = Math.max(1, Date.now() - startedAt);
    const completed: AtomicOrderResult = { solved: true, attempts: nextAttempts, elapsedMs: completedElapsedMs };
    setResult(completed);
    setElapsedMs(completedElapsedMs);
    setTotalAttempts(current => current + nextAttempts);
    setTotalElapsedMs(current => current + completedElapsedMs);
    if (!resultRecordedRef.current) {
      resultRecordedRef.current = true;
      const recorded = recordCompletedGameResult({
        rulesVersion: 1,
        gameId: 'atomic-order',
        variantId: 'arrange',
        configKey,
        format: 'solo',
        participant: { id: playerId, name: playerName, kind: playerId.startsWith('guest:') ? 'guest' : 'profile' },
        championshipRunId,
        metrics: { score: 1, normalizedScore: 100, elapsedMs: completedElapsedMs, attempts: nextAttempts },
      });
      recordAtomicOrderTime(playerName, difficulty, challenge, multiplier, completedElapsedMs);
      const updated = getGameLeaderboard('atomic-order', 'arrange', configKey, 'solo');
      setLeaderboard(updated);
      setNewBestId(recorded && updated.some(entry => entry.id === recorded.id) ? recorded.id : null);
    }
  };

  const nextRound = () => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= gameRounds.length) {
      playCollect();
      setPhase('result');
      return;
    }
    setRoundIndex(nextIndex);
    prepareRound(gameRounds, nextIndex);
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">🔢 Atomic Order</h2>
        <Elementor expression="greeting" message="Arrange every tile from the lowest atomic number to the highest. Tap two tiles to swap them!" />
        <div className="difficulty-select">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(option => (
            <button key={option} className={`diff-btn ${difficulty === option ? 'selected' : ''}`} onClick={() => setDifficulty(option)}>
              <span className="diff-label">{DIFFICULTY_CONFIG[option].label}</span>
              <span className="diff-desc">{ATOMIC_ORDER_TILE_COUNTS[option] * multiplier} tiles · elements 1–{DIFFICULTY_CONFIG[option].elementPool}</span>
            </button>
          ))}
        </div>
        <div className="round-select"><span>Challenge:</span>{(Object.keys(ATOMIC_ORDER_LEVELS) as AtomicOrderLevel[]).map(option => <button key={option} className={`round-btn ${challenge === option ? 'selected' : ''}`} onClick={() => setChallenge(option)}>{ATOMIC_ORDER_LEVELS[option].label}</button>)}</div>
        <div className="round-select"><span>Tiles:</span>{([1, 2, 3, 4] as AtomicOrderMultiplier[]).map(option => <button key={option} className={`round-btn ${multiplier === option ? 'selected' : ''}`} onClick={() => setMultiplier(option)}>{option}×</button>)}</div>
        <p className="setup-hint">{rules.description}</p>
        <button className="start-btn" onClick={startGame}>Start Game!</button>
      </div>
    );
  }

  if (phase === 'playing') {
    const shownElapsed = result?.elapsedMs ?? elapsedMs;
    return (
      <div className="atomic-order-playing two-player-playing">
        <div className="two-player-header"><button className="quiz-exit-btn" onClick={onBack} title="Quit">✕</button><div className="player-indicator"><span className="player-avatar">🔢</span><span className="player-name">{playerName}</span><span className="player-diff">Round {roundIndex + 1}/{gameRounds.length}</span></div></div>
        <div className="atomic-order-card">
          <h2>Put {tiles.length} elements in atomic-number order</h2>
          {(startedAt || result) && <div className="atomic-order-big-timer">{(shownElapsed / 1000).toFixed(1)}<span>s</span></div>}
          <p className="atomic-order-instruction">Lowest to highest. Tap two tiles to swap them. Attempts are unlimited.</p>
          {!startedAt && !result && <div className="atomic-order-ready"><p>The timer begins when the tiles appear.</p><button className="start-btn" onClick={startTimer}>Start Timer</button></div>}
          {(startedAt || result) && <><div className="atomic-order-direction"><span>LOWEST</span><span>→</span><span>HIGHEST</span></div><div className="atomic-order-tiles">{tiles.map((atomicNumber, index) => {
            const element = elements.find(item => item.atomicNumber === atomicNumber)!;
            const raw = feedback[index];
            const visibleFeedback = result ? 'correct' : rules.countOnlyFeedback ? undefined : raw === 'correct' ? 'correct' : rules.showHints ? raw : undefined;
            return <button key={atomicNumber} className={`atomic-order-tile ${visibleFeedback ?? ''} ${selected === index ? 'selected' : ''}`} disabled={Boolean(result)} onClick={() => selectTile(index)}><strong>{element.symbol}</strong><span>{element.name}</span>{!rules.countOnlyFeedback && <span className="atomic-order-number">#{element.atomicNumber}</span>}{visibleFeedback === 'left' && <small>Move left ←</small>}{visibleFeedback === 'right' && <small>Move right →</small>}</button>;
          })}</div>{!result && <button className="start-btn" onClick={submit}>Check Order</button>}</>}
          {feedback.length > 0 && !result && rules.countOnlyFeedback && <p className="atomic-order-instruction">{feedback.filter(value => value === 'correct').length}/{tiles.length} tiles are in the correct position.</p>}
          {result && <div className="atomic-order-result"><h3>✅ Solved in {(result.elapsedMs / 1000).toFixed(1)} seconds!</h3><p>{result.attempts} attempt{result.attempts === 1 ? '' : 's'}</p>{newBestId && <p className="atomic-order-new-best">🎉 New leaderboard best!</p>}<button className="start-btn" onClick={nextRound}>{roundIndex + 1 >= gameRounds.length ? 'See Results' : 'Next Round →'}</button></div>}
          <div className="atomic-order-leaderboard match-trial-leaderboard"><span className="atomic-order-best-mode">{DIFFICULTY_CONFIG[difficulty].label} · {ATOMIC_ORDER_LEVELS[challenge].label} · {tileCount} tiles</span><span className="atomic-order-best-label">🏆 Atomic Order Top 10</span>{leaderboard.length ? <ol className="atomic-order-leaderboard-list">{leaderboard.map(entry => <li key={entry.id} className={entry.id === newBestId ? 'me' : ''}><span>{entry.participant.name} · {entry.metrics.attempts} tries</span><span>{entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : '—'}</span></li>)}</ol> : <span className="atomic-order-best-values">No times yet — set the first!</span>}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-result"><Elementor expression="celebrate" message={`All ${ROUND_COUNT} Atomic Order rounds complete!`} /><div className="result-card"><h2>Atomic Order Complete!</h2><div className="result-stats"><div className="result-stat"><span className="stat-value">{ROUND_COUNT}</span><span className="stat-label">Rounds solved</span></div><div className="result-stat"><span className="stat-value">{totalAttempts}</span><span className="stat-label">Attempts</span></div><div className="result-stat"><span className="stat-value">{(totalElapsedMs / 1000).toFixed(1)}s</span><span className="stat-label">Puzzle time</span></div></div></div><div className="result-actions"><button className="start-btn" onClick={startGame}>Play Again</button><button className="back-btn" onClick={onBack}>Back to Games</button></div></div>
  );
}
