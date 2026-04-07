import { useState, useCallback } from 'react';
import QuizCard from '../components/QuizCard.tsx';
import Elementor from '../components/Elementor.tsx';
import { generateQuiz, generateDeepDiveQuiz, generateComparisonQuiz, type Question } from '../engine/questionGenerator.ts';
import { DIFFICULTY_CONFIG, type Difficulty, getRank, getNextRank } from '../engine/scoring.ts';
import { speakText } from '../engine/tts.ts';
import { playRankUp, playCollect } from '../engine/sounds.ts';
import { elements } from '../data/elements.ts';
import type { PlayerProgress } from '../engine/storage.ts';

interface QuizScreenProps {
  mode: 'quick-quiz' | 'sprint' | 'deep-dive' | 'which-is-bigger';
  progress: PlayerProgress;
  onComplete: (earned: number, correct: number, total: number, collected: number[], difficulty: Difficulty) => void;
  onBack: () => void;
}

type Phase = 'setup' | 'playing' | 'result';

const CATEGORY_COLORS: Record<string, string> = {
  'alkali-metal': '#4a8c3f',
  'alkaline-earth-metal': '#b8a83e',
  'transition-metal': '#d4829e',
  'post-transition-metal': '#6aaa96',
  'metalloid': '#5e9ead',
  'nonmetal': '#7aba5f',
  'halogen': '#8f8fd4',
  'noble-gas': '#b67ad4',
  'lanthanide': '#c27a5a',
  'actinide': '#a67abd',
};

export default function QuizScreen({ mode, progress, onComplete, onBack }: QuizScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('explorer');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [collectedInSession, setCollectedInSession] = useState<number[]>([]);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const startQuiz = useCallback(() => {
    let count = 10;
    if (mode === 'sprint') count = 50;
    if (mode === 'deep-dive') count = 8;
    if (mode === 'which-is-bigger') count = 10;

    let qs: Question[];
    if (mode === 'deep-dive') {
      let el;
      if (selectedElement) {
        el = elements[selectedElement - 1];
      } else {
        // Random element from the pool
        const poolSize = DIFFICULTY_CONFIG[difficulty].elementPool;
        el = elements[Math.floor(Math.random() * poolSize)];
      }
      qs = generateDeepDiveQuiz(el, difficulty, count);
    } else if (mode === 'which-is-bigger') {
      qs = generateComparisonQuiz(difficulty, count);
    } else {
      qs = generateQuiz(difficulty, count);
    }

    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setCollectedInSession([]);
    setPhase('playing');
  }, [difficulty, mode, selectedElement]);

  const handleAnswer = useCallback((correct: boolean, points: number, elementNum: number) => {
    setScore(s => s + points);
    if (correct) {
      setCorrectCount(c => c + 1);
      setStreak(s => s + 1);
      if (!progress.elementsCollected.includes(elementNum) && !collectedInSession.includes(elementNum)) {
        setCollectedInSession(c => [...c, elementNum]);
      }
    } else {
      setStreak(0);
    }

    if (currentQ + 1 >= questions.length) {
      setPhase('result');
      // Play result sound: rank up check vs collection sound
      const wouldRankUp = getRank(progress.totalEP + score + points).name !== getRank(progress.totalEP).name;
      if (wouldRankUp) playRankUp();
      else if (collectedInSession.length > 0 || (correct && !progress.elementsCollected.includes(elementNum))) playCollect();
    } else {
      setCurrentQ(q => q + 1);
    }
  }, [currentQ, questions.length, progress.elementsCollected, collectedInSession]);

  const finishQuiz = () => {
    onComplete(score, correctCount, questions.length, collectedInSession, difficulty);
  };

  if (phase === 'setup') {
    const isDeepDive = mode === 'deep-dive';
    const isComparison = mode === 'which-is-bigger';
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">
          {mode === 'quick-quiz' && '⚡ Quick Quiz'}
          {mode === 'sprint' && '⏱️ Element Sprint'}
          {isDeepDive && '🔬 Element Deep Dive'}
          {isComparison && '💥 Element Showdown'}
        </h2>

        <Elementor expression="greeting" message={isComparison ? "Element Showdown! Which is heavier? Pricier? More dangerous? Let's battle!" : isDeepDive ? "Pick an element to explore in depth, or let me choose a random one!" : "Choose your difficulty level!"} />

        <div className="difficulty-select">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => {
            const cfg = DIFFICULTY_CONFIG[d];
            return (
              <button
                key={d}
                className={`diff-btn ${difficulty === d ? 'selected' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                <span className="diff-label">{cfg.label}</span>
                <span className="diff-desc">{cfg.description}</span>
                <span className="diff-detail">
                  {cfg.choiceCount} choices · {cfg.basePoints} EP base
                  {cfg.secondChance ? ' · 2nd chance!' : ''}
                  {mode === 'sprint' ? ` · ${cfg.timerSeconds}s timer` : ''}
                </span>
              </button>
            );
          })}
        </div>

        {isDeepDive && (
          <div className="deep-dive-picker">
            <h3>Choose an Element</h3>
            <button
              className={`dd-random-btn ${selectedElement === null ? 'selected' : ''}`}
              onClick={() => setSelectedElement(null)}
            >
              🎲 Random Element
            </button>
            <div className="dd-element-grid">
              {elements.map(el => (
                <button
                  key={el.atomicNumber}
                  className={`dd-element-cell ${selectedElement === el.atomicNumber ? 'selected' : ''}`}
                  style={{ backgroundColor: CATEGORY_COLORS[el.category] || '#666' }}
                  onClick={() => setSelectedElement(el.atomicNumber)}
                  title={el.name}
                >
                  <span className="dd-el-num">{el.atomicNumber}</span>
                  <span className="dd-el-sym">{el.symbol}</span>
                </button>
              ))}
            </div>
            {selectedElement && (
              <p className="dd-selected-name">Selected: {elements[selectedElement - 1].name} ({elements[selectedElement - 1].symbol})</p>
            )}
          </div>
        )}

        <button className="start-btn" onClick={startQuiz}>Start Quiz!</button>
      </div>
    );
  }

  if (phase === 'playing' && questions.length > 0) {
    return (
      <div className="quiz-playing">
        <div className="quiz-score-bar">
          <button className="quiz-exit-btn" onClick={() => setShowExitConfirm(true)} title="Exit quiz">✕</button>
          <span className="score-display">⭐ {score} EP</span>
        </div>

        {showExitConfirm && (
          <div className="exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
            <div className="exit-confirm-card" onClick={e => e.stopPropagation()}>
              <p>Are you sure you want to quit?</p>
              <p className="exit-confirm-sub">You'll lose your progress in this quiz.</p>
              <div className="exit-confirm-actions">
                <button className="start-btn" onClick={() => setShowExitConfirm(false)}>Keep Playing</button>
                <button className="back-btn" onClick={onBack}>Quit Quiz</button>
              </div>
            </div>
          </div>
        )}
        <QuizCard
          question={questions[currentQ]}
          difficulty={difficulty}
          streak={streak}
          questionNumber={currentQ + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          timedMode={mode === 'sprint'}
        />
      </div>
    );
  }


  if (phase === 'result') {
    const oldRank = getRank(progress.totalEP);
    const newRank = getRank(progress.totalEP + score);
    const rankedUp = newRank.name !== oldRank.name;
    const newNextRank = getNextRank(progress.totalEP + score);
    const resultMsg =
      correctCount >= questions.length * 0.7
        ? "Outstanding work, scientist! You really know your elements!"
        : correctCount >= questions.length * 0.4
        ? "Good effort! Keep learning and you'll be a master!"
        : "Every mistake teaches us something new! Try again!";

    return (
      <div className="quiz-result">
        <Elementor
          expression={correctCount >= questions.length * 0.7 ? 'celebrate' : correctCount >= questions.length * 0.4 ? 'correct' : 'hint'}
          message={resultMsg}
        />
        <button className="tts-btn tts-btn-small" onClick={() => speakText(resultMsg)} title="Read aloud">🔊</button>

        <div className="result-card">
          <h2>Quiz Complete!</h2>
          <div className="result-stats">
            <div className="result-stat">
              <span className="stat-value">{score}</span>
              <span className="stat-label">Element Points</span>
            </div>
            <div className="result-stat">
              <span className="stat-value">{correctCount}/{questions.length}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="result-stat">
              <span className="stat-value">{Math.round((correctCount / questions.length) * 100)}%</span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>

          {collectedInSession.length > 0 && (
            <div className="result-collected">
              <p>🧪 New elements collected: {collectedInSession.length}</p>
            </div>
          )}

          {rankedUp && (
            <div className="result-rankup">
              <p>🎉 Rank Up! You are now: {newRank.icon} {newRank.name}!</p>
            </div>
          )}
          {newNextRank && !rankedUp && (
            <p className="result-next">{newNextRank.minEP - (progress.totalEP + score)} EP to {newNextRank.name}</p>
          )}
        </div>

        <div className="result-actions">
          <button className="start-btn" onClick={finishQuiz}>Continue</button>
        </div>
      </div>
    );
  }

  return null;
}
