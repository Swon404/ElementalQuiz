import { useState, useCallback, useRef } from 'react';
import Elementor from '../components/Elementor.tsx';
import { elements } from '../data/elements.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';

interface SymbolPickScreenProps {
  onBack: () => void;
}

type SymbolRound = {
  elementName: string;
  correctSymbol: string;
  choices: string[];
};

type Phase = 'setup' | 'playing' | 'result';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickSimilarSymbols(correctSymbol: string, count: number): string[] {
  const all = elements.map(e => e.symbol).filter(s => s !== correctSymbol);
  const first = correctSymbol[0]?.toLowerCase() ?? '';
  const len = correctSymbol.length;
  const cLower = correctSymbol.toLowerCase();
  const scored = all.map(s => {
    let score = 0;
    if (s[0]?.toLowerCase() === first) score += 3;
    if (s.length === len) score += 2;
    for (const ch of s.toLowerCase()) if (cLower.includes(ch)) { score += 1; break; }
    return { s, score, r: Math.random() };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.r - b.r));
  const pool = scored.slice(0, Math.max(count * 3, 8)).map(x => x.s);
  const picked: string[] = [];
  const used = new Set<string>();
  for (const s of shuffleArray(pool)) {
    if (!used.has(s)) { used.add(s); picked.push(s); if (picked.length >= count) break; }
  }
  return picked;
}

function generateRounds(count: number, pool: number): SymbolRound[] {
  const picked = shuffleArray(elements.slice(0, pool)).slice(0, count);
  return picked.map(el => {
    const distractors = pickSimilarSymbols(el.symbol, 4);
    const choices = shuffleArray([el.symbol, ...distractors]);
    return { elementName: el.name, correctSymbol: el.symbol, choices };
  });
}

export default function SymbolPickScreen({ onBack }: SymbolPickScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [rounds, setRounds] = useState<SymbolRound[]>([]);
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const total = 10;
  const startedRef = useRef(false);

  const startGame = useCallback(() => {
    const pool = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 118;
    setRounds(generateRounds(total, pool));
    setIdx(0);
    setAnswered(null);
    setScore(0);
    setPhase('playing');
    startedRef.current = true;
  }, [difficulty]);

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
            { v: 'easy' as const, label: 'Easy', desc: 'Common elements (1–20)' },
            { v: 'medium' as const, label: 'Medium', desc: 'Up to element 50' },
            { v: 'hard' as const, label: 'Hard', desc: 'Any element' },
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
      <div className="result-actions">
        <button className="start-btn" onClick={startGame}>Play Again</button>
        <button className="back-btn" onClick={onBack}>Home</button>
      </div>
    </div>
  );
}
