import { useState, useCallback } from 'react';
import Elementor from '../components/Elementor.tsx';
import { elements } from '../data/elements.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';

interface ElementOrderScreenProps {
  onBack: () => void;
}

type OrderElement = { atomicNumber: number; symbol: string; name: string };

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = 'setup' | 'playing' | 'result';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_CONFIG: Record<Difficulty, { count: number; label: string; desc: string; pool: number }> = {
  easy: { count: 4, label: 'Easy', desc: '4 elements to sort', pool: 20 },
  medium: { count: 6, label: 'Medium', desc: '6 elements to sort', pool: 50 },
  hard: { count: 8, label: 'Hard', desc: '8 elements to sort', pool: 118 },
};

function generateRound(difficulty: Difficulty): OrderElement[] {
  const cfg = DIFF_CONFIG[difficulty];
  const pool = shuffleArray(elements.slice(0, cfg.pool));
  const chosen = pool.slice(0, cfg.count);
  return shuffleArray(chosen.map(e => ({ atomicNumber: e.atomicNumber, symbol: e.symbol, name: e.name })));
}

export default function ElementOrderScreen({ onBack }: ElementOrderScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [roundElements, setRoundElements] = useState<OrderElement[]>([]);
  const [placed, setPlaced] = useState<OrderElement[]>([]);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);

  const startGame = useCallback(() => {
    setRound(1);
    setScore(0);
    setMistakes(0);
    const els = generateRound(difficulty);
    setRoundElements(els);
    setPlaced([]);
    setWrongFlash(null);
    setPhase('playing');
  }, [difficulty]);

  const nextRound = useCallback(() => {
    if (round >= totalRounds) {
      setPhase('result');
    } else {
      setRound(r => r + 1);
      const els = generateRound(difficulty);
      setRoundElements(els);
      setPlaced([]);
      setWrongFlash(null);
    }
  }, [round, totalRounds, difficulty]);

  const handlePick = (el: OrderElement) => {
    // The next correct pick: the element with the smallest atomic number not yet placed
    const remaining = roundElements.filter(e => !placed.find(p => p.atomicNumber === e.atomicNumber));
    const sorted = [...remaining].sort((a, b) => a.atomicNumber - b.atomicNumber);
    const expected = sorted[0];

    if (el.atomicNumber === expected.atomicNumber) {
      playCorrect();
      const newPlaced = [...placed, el];
      setPlaced(newPlaced);

      if (newPlaced.length === roundElements.length) {
        // Round complete
        setScore(s => s + 1);
        playCollect();
        setTimeout(nextRound, 800);
      }
    } else {
      playWrong();
      setMistakes(m => m + 1);
      setWrongFlash(el.atomicNumber);
      setTimeout(() => setWrongFlash(null), 500);
    }
  };

  // Drag reorder support — simpler: just tap elements in order (lowest to highest)

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">📊 Element Order</h2>
        <Elementor expression="greeting" message="Put the elements in order from lowest to highest atomic number! Tap them in the right order." />

        <div className="difficulty-select">
          {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG['easy']][]).map(([key, cfg]) => (
            <button
              key={key}
              className={`diff-btn ${difficulty === key ? 'selected' : ''}`}
              onClick={() => setDifficulty(key)}
            >
              <span className="diff-label">{cfg.label}</span>
              <span className="diff-desc">{cfg.desc}</span>
            </button>
          ))}
        </div>

        <button className="start-btn" onClick={startGame}>Start Game!</button>
      </div>
    );
  }

  if (phase === 'playing') {
    const remaining = roundElements.filter(e => !placed.find(p => p.atomicNumber === e.atomicNumber));

    return (
      <div className="eo-playing">
        {showExitConfirm && (
          <div className="exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
            <div className="exit-confirm-card" onClick={e => e.stopPropagation()}>
              <p>Quit this game?</p>
              <div className="exit-confirm-actions">
                <button className="start-btn" onClick={() => setShowExitConfirm(false)}>Keep Playing</button>
                <button className="back-btn" onClick={onBack}>Quit</button>
              </div>
            </div>
          </div>
        )}
        <div className="eo-header">
          <button className="quiz-exit-btn" onClick={() => setShowExitConfirm(true)} title="Quit">✕</button>
          <span className="eo-round">Round {round}/{totalRounds}</span>
          <span className="eo-score">✅ {score} · ❌ {mistakes}</span>
        </div>

        <p className="eo-instruction">Tap elements in order: <strong>lowest → highest</strong> atomic number</p>

        {placed.length > 0 && (
          <div className="eo-placed">
            {placed.map(el => (
              <div key={el.atomicNumber} className="eo-card placed">
                <span className="eo-card-num">{el.atomicNumber}</span>
                <span className="eo-card-sym">{el.symbol}</span>
                <span className="eo-card-name">{el.name}</span>
              </div>
            ))}
          </div>
        )}

        {placed.length < roundElements.length && (
          <div className="eo-remaining">
            {remaining.map(el => (
              <button
                key={el.atomicNumber}
                className={`eo-card clickable ${wrongFlash === el.atomicNumber ? 'wrong-flash' : ''}`}
                onClick={() => handlePick(el)}
              >
                <span className="eo-card-sym">{el.symbol}</span>
                <span className="eo-card-name">{el.name}</span>
              </button>
            ))}
          </div>
        )}

        {placed.length === roundElements.length && (
          <div className="eo-round-complete">
            <p>✅ Round complete!</p>
          </div>
        )}
      </div>
    );
  }

  // Result
  const pct = totalRounds > 0 ? Math.round((score / totalRounds) * 100) : 0;
  const resultMsg = pct >= 80
    ? "Amazing! You really know your atomic numbers!"
    : pct >= 50
    ? "Good work! Keep practising to master the order!"
    : "Keep trying! The more you play, the better you'll know the periodic table!";

  return (
    <div className="quiz-result">
      <Elementor expression={pct >= 80 ? 'celebrate' : pct >= 50 ? 'correct' : 'hint'} message={resultMsg} />
      <div className="result-card">
        <h2>Element Order Complete!</h2>
        <div className="result-stats">
          <div className="result-stat">
            <span className="stat-value">{score}/{totalRounds}</span>
            <span className="stat-label">Rounds Perfect</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{mistakes}</span>
            <span className="stat-label">Wrong Taps</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{pct}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>
      </div>
      <div className="result-actions">
        <button className="start-btn" onClick={startGame}>Play Again</button>
        <button className="back-btn" onClick={onBack}>Home</button>
      </div>
    </div>
  );
}
