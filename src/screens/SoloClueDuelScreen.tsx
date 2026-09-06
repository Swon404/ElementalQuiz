import { useCallback, useRef, useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import { buildGameConfigKey, getGameLeaderboard, recordCompletedGameResult, type LeaderboardEntry } from '../engine/gameResults.ts';
import { playCollect, playCorrect, playWrong } from '../engine/sounds.ts';
import { generateClueRounds, type ClueRound } from '../games/clueDuel.ts';

type Phase = 'setup' | 'playing' | 'result';

interface SoloClueDuelScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  championshipRunId?: string;
}

const ROUND_COUNT = 6;

export default function SoloClueDuelScreen({ onBack, playerId, playerName, championshipRunId }: SoloClueDuelScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('scientist');
  const [rounds, setRounds] = useState<ClueRound[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [clueIndex, setClueIndex] = useState(0);
  const [wrongChoices, setWrongChoices] = useState<Set<number>>(new Set());
  const [roundComplete, setRoundComplete] = useState(false);
  const [roundWon, setRoundWon] = useState(false);
  const [score, setScore] = useState(0);
  const [cluesUsed, setCluesUsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newBestId, setNewBestId] = useState<string | null>(null);
  const startedAtRef = useRef(0);

  const pool = DIFFICULTY_CONFIG[difficulty].elementPool;
  const configKey = buildGameConfigKey('clue-duel', 'classic', { difficulty, pool, rounds: ROUND_COUNT, cluesPerRound: 5 });

  const startGame = useCallback(() => {
    setRounds(generateClueRounds(ROUND_COUNT, pool));
    setRoundIndex(0);
    setClueIndex(0);
    setWrongChoices(new Set());
    setRoundComplete(false);
    setRoundWon(false);
    setScore(0);
    setCluesUsed(1);
    setElapsedMs(0);
    setNewBestId(null);
    setLeaderboard(getGameLeaderboard('clue-duel', 'classic', configKey, 'solo'));
    startedAtRef.current = Date.now();
    setPhase('playing');
  }, [configKey, pool]);

  const revealNextClue = () => {
    if (roundComplete || clueIndex >= 4) return;
    setClueIndex(current => current + 1);
    setCluesUsed(current => current + 1);
  };

  const chooseElement = (choiceIndex: number) => {
    if (roundComplete || wrongChoices.has(choiceIndex)) return;
    const correct = rounds[roundIndex].choices[choiceIndex] === rounds[roundIndex].correctName;
    if (correct) {
      setScore(current => current + 1);
      setRoundWon(true);
      setRoundComplete(true);
      playCorrect();
      return;
    }
    playWrong();
    setWrongChoices(current => new Set(current).add(choiceIndex));
    if (clueIndex < 4) {
      setClueIndex(current => current + 1);
      setCluesUsed(current => current + 1);
    } else {
      setRoundComplete(true);
    }
  };

  const finishGame = () => {
    const completedElapsedMs = Math.max(1, Date.now() - startedAtRef.current);
    const recorded = recordCompletedGameResult({
      rulesVersion: 1,
      gameId: 'clue-duel',
      variantId: 'classic',
      configKey,
      format: 'solo',
      participant: { id: playerId, name: playerName, kind: playerId.startsWith('guest:') ? 'guest' : 'profile' },
      championshipRunId,
      metrics: {
        score,
        normalizedScore: Math.round((score / rounds.length) * 100),
        correct: score,
        total: rounds.length,
        cluesUsed,
        elapsedMs: completedElapsedMs,
      },
    });
    const updated = getGameLeaderboard('clue-duel', 'classic', configKey, 'solo');
    setElapsedMs(completedElapsedMs);
    setLeaderboard(updated);
    setNewBestId(recorded && updated.some(entry => entry.id === recorded.id) ? recorded.id : null);
    playCollect();
    setPhase('result');
  };

  const nextRound = () => {
    if (roundIndex + 1 >= rounds.length) {
      finishGame();
      return;
    }
    setRoundIndex(current => current + 1);
    setClueIndex(0);
    setWrongChoices(new Set());
    setRoundComplete(false);
    setRoundWon(false);
    setCluesUsed(current => current + 1);
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">🕵️ Clue Duel</h2>
        <Elementor expression="greeting" message="Identify each element using as few clues as possible!" />
        <div className="difficulty-select">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(option => (
            <button key={option} className={`diff-btn ${difficulty === option ? 'selected' : ''}`} onClick={() => setDifficulty(option)}>
              <span className="diff-label">{DIFFICULTY_CONFIG[option].label}</span>
              <span className="diff-desc">Elements 1–{DIFFICULTY_CONFIG[option].elementPool}</span>
            </button>
          ))}
        </div>
        <button className="start-btn" onClick={startGame}>Start!</button>
      </div>
    );
  }

  if (phase === 'playing') {
    const round = rounds[roundIndex];
    if (!round) return null;
    return (
      <div className="snap-playing">
        <div className="snap-header">
          <button className="quiz-exit-btn" onClick={onBack} title="Quit">✕</button>
          <span className="snap-round">Round {roundIndex + 1}/{rounds.length}</span>
          <div className="snap-scores"><span>Score: {score}</span><span>Clues: {cluesUsed}</span></div>
        </div>
        <p className="snap-buzzer-name">Which element am I?</p>
        <div className="snap-clues-list">
          {round.clues.map((clue, index) => (
            <div key={index} className={`snap-clue-item ${index <= clueIndex ? (index === clueIndex ? 'snap-clue-new' : '') : 'snap-clue-pending'}`}>
              <span className="snap-clue-num">Clue {index + 1}</span>
              <span className="snap-clue-text">{index <= clueIndex ? clue : 'Hidden'}</span>
            </div>
          ))}
        </div>
        {!roundComplete && clueIndex < 4 && <button className="back-btn" onClick={revealNextClue}>Reveal Next Clue</button>}
        <div className="snap-choices">
          {round.choices.map((choice, index) => {
            const isCorrect = roundComplete && choice === round.correctName;
            const isWrong = wrongChoices.has(index);
            const className = isCorrect ? 'snap-choice correct' : isWrong ? 'snap-choice wrong' : roundComplete ? 'snap-choice snap-choice-locked' : 'snap-choice';
            return <button key={choice} className={className} disabled={roundComplete || isWrong} onClick={() => chooseElement(index)}>{choice}</button>;
          })}
        </div>
        {roundComplete && (
          <div className="snap-result-feedback">
            <p className={`snap-verdict ${roundWon ? 'correct' : 'wrong'}`}>{roundWon ? '🎉 Correct!' : 'The answer was'} <strong>{round.correctName}</strong>.</p>
            <button className="start-btn" onClick={nextRound}>{roundIndex + 1 >= rounds.length ? 'See Results' : 'Next →'}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-result">
      <Elementor expression={score >= 4 ? 'celebrate' : 'correct'} message={`${score}/${rounds.length} elements identified!`} />
      <div className="result-card"><h2>Clue Duel Complete!</h2><div className="result-stats"><div className="result-stat"><span className="stat-value">{score}</span><span className="stat-label">Correct</span></div><div className="result-stat"><span className="stat-value">{cluesUsed}</span><span className="stat-label">Clues used</span></div><div className="result-stat"><span className="stat-value">{(elapsedMs / 1000).toFixed(1)}s</span><span className="stat-label">Time</span></div></div></div>
      <div className="atomic-order-leaderboard match-trial-leaderboard">
        <span className="atomic-order-best-mode">{DIFFICULTY_CONFIG[difficulty].label} · {ROUND_COUNT} rounds</span>
        <span className="atomic-order-best-label">🏆 Clue Duel Top 10</span>
        {newBestId && <span className="atomic-order-new-best">🎉 New leaderboard best!</span>}
        {leaderboard.length ? <ol className="atomic-order-leaderboard-list">{leaderboard.map(entry => <li key={entry.id} className={entry.id === newBestId ? 'me' : ''}><span>{entry.participant.name} · {entry.metrics.score}/{entry.metrics.total} · {entry.metrics.cluesUsed} clues</span><span>{entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : '—'}</span></li>)}</ol> : <span className="atomic-order-best-values">No scores yet — set the first!</span>}
      </div>
      <div className="result-actions">{championshipRunId ? <button className="start-btn" onClick={onBack}>Continue Championship</button> : <><button className="start-btn" onClick={startGame}>Play Again</button><button className="back-btn" onClick={onBack}>Back to Games</button></>}</div>
    </div>
  );
}
