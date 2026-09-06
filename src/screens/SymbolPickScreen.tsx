import { useState, useCallback, useRef } from 'react';
import Elementor from '../components/Elementor.tsx';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';
import { generateSymbolRounds, type SymbolRound } from '../games/symbolPick.ts';
import {
  buildGameConfigKey,
  getGameLeaderboard,
  recordCompletedGameResult,
  type LeaderboardEntry,
} from '../engine/gameResults.ts';

interface SymbolPickScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  championshipRunId?: string;
}

type Phase = 'setup' | 'playing' | 'result';

const SYMBOL_RULES = {
  easy: { pool: 20, distractors: 4 },
  medium: { pool: 50, distractors: 5 },
  hard: { pool: 118, distractors: 6 },
} as const;

export default function SymbolPickScreen({ onBack, playerId, playerName, championshipRunId }: SymbolPickScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [rounds, setRounds] = useState<SymbolRound[]>([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newBest, setNewBest] = useState(false);
  const total = 10;
  const startedAtRef = useRef(0);

  const configKey = buildGameConfigKey('symbol-pick', 'classic', {
    difficulty,
    rounds: total,
    choices: SYMBOL_RULES[difficulty].distractors + 1,
  });

  const startGame = useCallback(() => {
    const { pool, distractors } = SYMBOL_RULES[difficulty];
    setRounds(generateSymbolRounds(total, pool, distractors));
    setIdx(0);
    setAnswered(null);
    setScore(0);
    setElapsedMs(0);
    setNewBest(false);
    setLeaderboard(getGameLeaderboard('symbol-pick', 'classic', configKey, 'solo'));
    startedAtRef.current = Date.now();
    setPhase('playing');
  }, [configKey, difficulty]);

  const handleAnswer = (choiceIdx: number) => {
    if (answered !== null) return;
    const round = rounds[idx];
    const correct = round.choices[choiceIdx] === round.correctSymbol;
    setAnswered(choiceIdx);
    if (correct) { playCorrect(); setScore(s => s + 1); }
    else playWrong();
  };

  const next = () => {
    if (idx + 1 >= rounds.length) {
      const completedElapsedMs = Math.max(1, Date.now() - startedAtRef.current);
      const recorded = recordCompletedGameResult({
        rulesVersion: 1,
        gameId: 'symbol-pick',
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
          elapsedMs: completedElapsedMs,
        },
      });
      const updatedLeaderboard = getGameLeaderboard('symbol-pick', 'classic', configKey, 'solo');
      setElapsedMs(completedElapsedMs);
      setLeaderboard(updatedLeaderboard);
      setNewBest(Boolean(recorded && updatedLeaderboard.some(entry => entry.id === recorded.id)));
      playCollect();
      setPhase('result');
    } else {
      setIdx(i => i + 1);
      setAnswered(null);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">🔤 Symbol Pick</h2>
        <Elementor expression="greeting" message="I'll show you an element — pick its chemical symbol from look-alikes!" />
        <div className="difficulty-select">
          {[
            { v: 'easy' as const, label: 'Easy', desc: '1–20, 5 look-alikes' },
            { v: 'medium' as const, label: 'Medium', desc: 'Up to 50, 6 look-alikes' },
            { v: 'hard' as const, label: 'Hard', desc: 'All elements, 7 look-alikes' },
          ].map(opt => (
            <button
              key={opt.v}
              className={`diff-btn ${difficulty === opt.v ? 'selected' : ''}`}
              onClick={() => setDifficulty(opt.v)}
            >
              <span className="diff-label">{opt.label}</span>
              <span className="diff-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
        <button className="start-btn" onClick={startGame}>Start!</button>
      </div>
    );
  }

  if (phase === 'playing') {
    const round = rounds[idx];
    const isCorrect = answered !== null && round.choices[answered] === round.correctSymbol;
    return (
      <div className="snap-playing">
        {showExit && (
          <div className="exit-confirm-overlay" onClick={() => setShowExit(false)}>
            <div className="exit-confirm-card" onClick={e => e.stopPropagation()}>
              <p>Quit this game?</p>
              <div className="exit-confirm-actions">
                <button className="start-btn" onClick={() => setShowExit(false)}>Keep Playing</button>
                <button className="back-btn" onClick={onBack}>Quit</button>
              </div>
            </div>
          </div>
        )}
        <div className="snap-header">
          <button className="quiz-exit-btn" onClick={() => setShowExit(true)} title="Quit">✕</button>
          <span className="snap-round">{idx + 1}/{rounds.length}</span>
          <div className="snap-scores"><span>Score: {score}</span></div>
        </div>
        <p className="snap-buzzer-name">Pick the symbol for:</p>
        <h2 style={{ textAlign: 'center', margin: '0.5rem 0 1rem', fontSize: '1.8rem' }}>{round.elementName}</h2>
        <div className="snap-choices">
          {round.choices.map((ch, i) => {
            const a = answered !== null;
            const chosen = answered === i;
            const right = ch === round.correctSymbol;
            const cls = !a ? 'snap-choice'
              : right ? 'snap-choice correct'
              : chosen ? 'snap-choice wrong'
              : 'snap-choice snap-choice-locked';
            return (
              <button
                key={i}
                className={cls}
                disabled={a}
                onClick={() => handleAnswer(i)}
                style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '1px' }}
              >{ch}</button>
            );
          })}
        </div>
        {answered !== null && (
          <div className="snap-result-feedback">
            {isCorrect
              ? <p className="snap-verdict correct">🎉 Correct!</p>
              : <p className="snap-verdict wrong">😬 Nope — it's <strong>{round.correctSymbol}</strong></p>}
            <button className="start-btn" onClick={next}>
              {idx + 1 >= rounds.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // result
  const pct = Math.round((score / rounds.length) * 100);
  const msg = pct === 100 ? "Perfect! You know your symbols!"
    : pct >= 70 ? "Great job! Symbol master in training!"
    : pct >= 40 ? "Nice effort — keep practicing!"
    : "Good try — these are tricky!";
  return (
    <div className="quiz-result">
      <Elementor expression={pct >= 70 ? 'celebrate' : 'correct'} message={msg} />
      <div className="result-card">
        <h2>Symbol Pick Complete!</h2>
        <div className="result-stats">
          <div className="result-stat">
            <span className="stat-value">{score}</span>
            <span className="stat-label">Correct</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{rounds.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{pct}%</span>
            <span className="stat-label">Score</span>
          </div>
        </div>
      </div>
      <div className="atomic-order-leaderboard match-trial-leaderboard">
        <span className="atomic-order-best-mode">{difficulty} · {rounds.length} rounds · {(elapsedMs / 1000).toFixed(1)}s</span>
        <span className="atomic-order-best-label">🏆 Symbol Pick Top 10</span>
        {newBest && <span className="atomic-order-new-best">🎉 New leaderboard best!</span>}
        {leaderboard.length ? (
          <ol className="atomic-order-leaderboard-list">
            {leaderboard.map(entry => (
              <li key={entry.id} className={entry.participant.id === playerId ? 'me' : ''}>
                <span>{entry.participant.name} · {entry.metrics.score}/{entry.metrics.total}</span>
                <span>{entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : '—'}</span>
              </li>
            ))}
          </ol>
        ) : <span className="atomic-order-best-values">No scores yet — set the first!</span>}
      </div>
      <div className="result-actions">
        {championshipRunId
          ? <button className="start-btn" onClick={onBack}>Continue Championship</button>
          : <><button className="start-btn" onClick={startGame}>Play Again</button><button className="back-btn" onClick={onBack}>Back to Games</button></>}
      </div>
    </div>
  );
}
