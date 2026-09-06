import { useCallback, useEffect, useRef, useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import { buildGameConfigKey, getGameLeaderboard, recordCompletedGameResult, type LeaderboardEntry } from '../engine/gameResults.ts';
import { playCollect, playCorrect, playWrong } from '../engine/sounds.ts';
import { speakText } from '../engine/tts.ts';
import { generateTrueFalseStatements, type TrueFalseStatement } from '../games/trueFalse.ts';

type Phase = 'setup' | 'playing' | 'result';

interface SoloTrueFalseScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  championshipRunId?: string;
}

const QUESTION_COUNT = 10;
const TIME_LIMIT_SECONDS = 20;

export default function SoloTrueFalseScreen({ onBack, playerId, playerName, championshipRunId }: SoloTrueFalseScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('scientist');
  const [statements, setStatements] = useState<TrueFalseStatement[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [score, setScore] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newBestId, setNewBestId] = useState<string | null>(null);
  const startedAtRef = useRef(0);

  const pool = DIFFICULTY_CONFIG[difficulty].elementPool;
  const configKey = buildGameConfigKey('tf-blitz', 'classic', {
    difficulty,
    pool,
    rounds: QUESTION_COUNT,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
  });

  const startGame = useCallback(() => {
    setStatements(generateTrueFalseStatements(QUESTION_COUNT, pool));
    setIndex(0);
    setAnswer(null);
    setShowResult(false);
    setSecondsLeft(TIME_LIMIT_SECONDS);
    setScore(0);
    setElapsedMs(0);
    setNewBestId(null);
    setLeaderboard(getGameLeaderboard('tf-blitz', 'classic', configKey, 'solo'));
    startedAtRef.current = Date.now();
    setPhase('playing');
  }, [configKey, pool]);

  useEffect(() => {
    if (phase !== 'playing' || showResult) return;
    const timer = setInterval(() => setSecondsLeft(current => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [index, phase, showResult]);

  useEffect(() => {
    if (phase !== 'playing' || showResult || secondsLeft > 0) return;
    playWrong();
    setAnswer(null);
    setShowResult(true);
  }, [phase, secondsLeft, showResult]);

  const chooseAnswer = (chosen: boolean) => {
    if (showResult) return;
    const correct = chosen === statements[index].answer;
    setAnswer(chosen);
    setShowResult(true);
    if (correct) {
      setScore(current => current + 1);
      playCorrect();
    } else {
      playWrong();
    }
  };

  const finishGame = () => {
    const completedElapsedMs = Math.max(1, Date.now() - startedAtRef.current);
    const recorded = recordCompletedGameResult({
      rulesVersion: 1,
      gameId: 'tf-blitz',
      variantId: 'classic',
      configKey,
      format: 'solo',
      participant: { id: playerId, name: playerName, kind: playerId.startsWith('guest:') ? 'guest' : 'profile' },
      championshipRunId,
      metrics: {
        score,
        normalizedScore: Math.round((score / statements.length) * 100),
        correct: score,
        total: statements.length,
        elapsedMs: completedElapsedMs,
      },
    });
    const updated = getGameLeaderboard('tf-blitz', 'classic', configKey, 'solo');
    setElapsedMs(completedElapsedMs);
    setLeaderboard(updated);
    setNewBestId(recorded && updated.some(entry => entry.id === recorded.id) ? recorded.id : null);
    playCollect();
    setPhase('result');
  };

  const next = () => {
    if (index + 1 >= statements.length) {
      finishGame();
      return;
    }
    setIndex(current => current + 1);
    setAnswer(null);
    setShowResult(false);
    setSecondsLeft(TIME_LIMIT_SECONDS);
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">✅ True or False Blitz</h2>
        <Elementor expression="greeting" message="Decide whether each element statement is true before the timer runs out!" />
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
    const statement = statements[index];
    if (!statement) return null;
    const correct = answer !== null && answer === statement.answer;
    return (
      <div className="tf-blitz-playing">
        <div className="tf-header">
          <button className="quiz-exit-btn" onClick={onBack} title="Quit">✕</button>
          <div className="tf-turn-info"><span>{playerName}</span><span className="tf-round">Question {index + 1}/{statements.length}</span></div>
          <div className="tf-scores"><span className="player-score-chip active p1">Score {score}</span></div>
        </div>
        <div className="tf-statement-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <p className="tf-statement" style={{ flex: 1, margin: 0 }}>{statement.text}</p>
            <button className="tts-btn tts-btn-small" onClick={() => speakText(statement.text)} title="Read aloud">🔊</button>
          </div>
          {!showResult && <div className="tf-timer-bar"><div className={`tf-timer-fill ${secondsLeft <= 3 ? 'urgent' : ''}`} style={{ width: `${(secondsLeft / TIME_LIMIT_SECONDS) * 100}%` }} /></div>}
          {!showResult && <span className={`tf-timer-num ${secondsLeft <= 3 ? 'urgent' : ''}`}>{secondsLeft}s</span>}
        </div>
        {!showResult ? (
          <div className="tf-buttons">
            <button className="tf-btn tf-true" onClick={() => chooseAnswer(true)}>✅ True</button>
            <button className="tf-btn tf-false" onClick={() => chooseAnswer(false)}>❌ False</button>
          </div>
        ) : (
          <div className="tf-result-feedback">
            <p className={`tf-verdict ${correct ? 'correct' : 'wrong'}`}>{answer === null ? "⏰ Time's up!" : correct ? '🎉 Correct!' : '😬 Wrong!'}</p>
            <p className="tf-explanation">Correct answer: <strong>{statement.answer ? 'True' : 'False'}</strong></p>
            <p className="tf-explanation">{statement.explanation}</p>
            <button className="start-btn" onClick={next}>{index + 1 >= statements.length ? 'See Results' : 'Next →'}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-result">
      <Elementor expression={score >= 7 ? 'celebrate' : 'correct'} message={`${score}/${statements.length} correct!`} />
      <div className="result-card"><h2>True or False Complete!</h2><div className="result-stats"><div className="result-stat"><span className="stat-value">{score}</span><span className="stat-label">Correct</span></div><div className="result-stat"><span className="stat-value">{(elapsedMs / 1000).toFixed(1)}s</span><span className="stat-label">Time</span></div></div></div>
      <div className="atomic-order-leaderboard match-trial-leaderboard">
        <span className="atomic-order-best-mode">{DIFFICULTY_CONFIG[difficulty].label} · {QUESTION_COUNT} questions</span>
        <span className="atomic-order-best-label">🏆 True or False Top 10</span>
        {newBestId && <span className="atomic-order-new-best">🎉 New leaderboard best!</span>}
        {leaderboard.length ? <ol className="atomic-order-leaderboard-list">{leaderboard.map(entry => <li key={entry.id} className={entry.id === newBestId ? 'me' : ''}><span>{entry.participant.name} · {entry.metrics.score}/{entry.metrics.total}</span><span>{entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : '—'}</span></li>)}</ol> : <span className="atomic-order-best-values">No scores yet — set the first!</span>}
      </div>
      <div className="result-actions">{championshipRunId ? <button className="start-btn" onClick={onBack}>Continue Championship</button> : <><button className="start-btn" onClick={startGame}>Play Again</button><button className="back-btn" onClick={onBack}>Back to Games</button></>}</div>
    </div>
  );
}
