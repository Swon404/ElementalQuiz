import { useState, useCallback, useRef, useEffect } from 'react';
import Elementor from '../components/Elementor.tsx';
import { elements } from '../data/elements.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';

interface MemoryGameScreenProps {
  onBack: () => void;
}

type MatchCard = { id: number; text: string; elementNum: number; flipped: boolean; matched: boolean };

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCards(pairCount: number): MatchCard[] {
  const pool = shuffleArray(elements.slice(0, 36)).slice(0, pairCount);
  const cards: MatchCard[] = [];
  let id = 0;
  for (const el of pool) {
    cards.push({ id: id++, text: el.symbol, elementNum: el.atomicNumber, flipped: false, matched: false });
    cards.push({ id: id++, text: el.name, elementNum: el.atomicNumber, flipped: false, matched: false });
  }
  return shuffleArray(cards);
}

type Phase = 'setup' | 'playing' | 'result';

export default function MemoryGameScreen({ onBack }: MemoryGameScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [pairCount, setPairCount] = useState(6);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [firstCard, setFirstCard] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval>>(null);

  const startGame = useCallback(() => {
    setCards(generateCards(pairCount));
    setFirstCard(null);
    setLocked(false);
    setMoves(0);
    setMatchedCount(0);
    setStartTime(Date.now());
    setElapsed(0);
    setPhase('playing');
  }, [pairCount]);

  // Timer tick
  useEffect(() => {
    if (phase === 'playing') {
      tickTimer.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
    }
  }, [phase, startTime]);

  const handleFlip = (cardId: number) => {
    if (locked) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    const updated = cards.map(c => c.id === cardId ? { ...c, flipped: true } : c);
    setCards(updated);

    if (firstCard === null) {
      setFirstCard(cardId);
    } else {
      setLocked(true);
      setMoves(m => m + 1);
      const first = updated.find(c => c.id === firstCard)!;
      const second = updated.find(c => c.id === cardId)!;

      if (first.elementNum === second.elementNum) {
        playCorrect();
        const matched = updated.map(c =>
          c.elementNum === first.elementNum ? { ...c, matched: true } : c
        );
        setCards(matched);
        setMatchedCount(mc => mc + 1);
        setFirstCard(null);
        setLocked(false);

        if (matched.every(c => c.matched)) {
          playCollect();
          setTimeout(() => setPhase('result'), 600);
        }
      } else {
        playWrong();
        lockTimer.current = setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstCard || c.id === cardId ? { ...c, flipped: false } : c
          ));
          setFirstCard(null);
          setLocked(false);
        }, 1000);
      }
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getStars = () => {
    const perfect = pairCount; // minimum moves = pairCount
    const ratio = moves / perfect;
    if (ratio <= 1.5) return 3;
    if (ratio <= 2.5) return 2;
    return 1;
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">🧠 Element Memory</h2>
        <Elementor expression="greeting" message="Match element symbols with their names! How fast can you find all the pairs?" />

        <div className="difficulty-select">
          {[
            { count: 4, label: 'Easy', desc: '4 pairs (8 cards)' },
            { count: 6, label: 'Medium', desc: '6 pairs (12 cards)' },
            { count: 8, label: 'Hard', desc: '8 pairs (16 cards)' },
            { count: 10, label: 'Expert', desc: '10 pairs (20 cards)' },
          ].map(opt => (
            <button
              key={opt.count}
              className={`diff-btn ${pairCount === opt.count ? 'selected' : ''}`}
              onClick={() => setPairCount(opt.count)}
            >
              <span className="diff-label">{opt.label}</span>
              <span className="diff-desc">{opt.desc}</span>
            </button>
          ))}
        </div>

        <button className="start-btn" onClick={startGame}>Start Game!</button>
      </div>
    );
  }

  if (phase === 'playing') {
    const cols = pairCount <= 4 ? 4 : pairCount <= 6 ? 4 : pairCount <= 8 ? 4 : 5;
    return (
      <div className="sp-memory-playing">
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
        <div className="sp-memory-header">
          <button className="quiz-exit-btn" onClick={() => setShowExitConfirm(true)} title="Quit">✕</button>
          <span className="sp-memory-stat">🔄 Moves: {moves}</span>
          <span className="sp-memory-stat">⏱️ {formatTime(elapsed)}</span>
          <span className="sp-memory-stat">✅ {matchedCount}/{pairCount}</span>
        </div>
        <div className="match-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cards.map(card => (
            <button
              key={card.id}
              className={`match-card ${card.flipped || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
              onClick={() => handleFlip(card.id)}
              disabled={card.matched || card.flipped}
            >
              <span className="match-card-inner">
                {(card.flipped || card.matched) ? card.text : '?'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Result
  const stars = getStars();
  const resultMsg = stars === 3
    ? "Perfect memory! You're an element genius!"
    : stars === 2
    ? "Great job! Your memory is getting sharper!"
    : "Good effort! Try again to beat your score!";

  return (
    <div className="quiz-result">
      <Elementor expression={stars === 3 ? 'celebrate' : 'correct'} message={resultMsg} />
      <div className="result-card">
        <h2>Memory Complete!</h2>
        <div className="sp-memory-stars">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        <div className="result-stats">
          <div className="result-stat">
            <span className="stat-value">{moves}</span>
            <span className="stat-label">Moves</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{formatTime(elapsed)}</span>
            <span className="stat-label">Time</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{pairCount}</span>
            <span className="stat-label">Pairs</span>
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
