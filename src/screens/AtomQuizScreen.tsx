import { useState, useCallback } from 'react';
import Elementor from '../components/Elementor.tsx';
import AtomModel from '../components/AtomModel.tsx';
import { elements } from '../data/elements.ts';
import { speakText } from '../engine/tts.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';

interface AtomQuizScreenProps {
  onBack: () => void;
}

type Phase = 'setup' | 'playing' | 'result';

type AtomQuestion = {
  questionText: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  elementNum: number;
  elementSymbol: string;
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SHELL_MAX = [2, 8, 18, 32, 32, 18, 8];
function getShellCount(atomicNumber: number): number {
  let remaining = atomicNumber;
  let shells = 0;
  for (const max of SHELL_MAX) {
    if (remaining <= 0) break;
    shells++;
    remaining -= Math.min(remaining, max);
  }
  return shells;
}

function getShellElectrons(atomicNumber: number): number[] {
  const shells: number[] = [];
  let remaining = atomicNumber;
  for (const max of SHELL_MAX) {
    if (remaining <= 0) break;
    shells.push(Math.min(remaining, max));
    remaining -= shells[shells.length - 1];
  }
  return shells;
}

function uniqueDistractors(correct: string, count: number, generator: () => string): string[] {
  const used = new Set([correct]);
  const result: string[] = [];
  let attempts = 0;
  while (result.length < count && attempts < 50) {
    const val = generator();
    if (!used.has(val)) { used.add(val); result.push(val); }
    attempts++;
  }
  return result;
}

function generateAtomQuestions(count: number, pool: number): AtomQuestion[] {
  const elPool = shuffleArray(elements.slice(0, pool));
  const questions: AtomQuestion[] = [];
  const types = 8;

  for (let i = 0; i < count && i < elPool.length; i++) {
    const el = elPool[i % elPool.length];
    const type = i % types;

    if (type === 0) {
      // How many protons?
      const correct = String(el.atomicNumber);
      const distractors = uniqueDistractors(correct, 3, () =>
        String(Math.max(1, el.atomicNumber + Math.floor(Math.random() * 10) - 5))
      );
      const choices = shuffleArray([correct, ...distractors]);
      questions.push({
        questionText: `How many protons does ${el.name} (${el.symbol}) have?`,
        choices, correctIndex: choices.indexOf(correct),
        explanation: `${el.name} has ${el.atomicNumber} protons! The atomic number = the number of protons.`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    } else if (type === 1) {
      // How many electrons in a neutral atom?
      const correct = String(el.atomicNumber);
      const distractors = uniqueDistractors(correct, 3, () =>
        String(Math.max(1, el.atomicNumber + Math.floor(Math.random() * 8) - 4))
      );
      const choices = shuffleArray([correct, ...distractors]);
      questions.push({
        questionText: `How many electrons does a neutral ${el.name} atom have?`,
        choices, correctIndex: choices.indexOf(correct),
        explanation: `A neutral atom has the same number of electrons as protons: ${el.atomicNumber}!`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    } else if (type === 2) {
      // How many electron shells?
      const shells = getShellCount(el.atomicNumber);
      const correct = String(shells);
      const distractors = uniqueDistractors(correct, 3, () =>
        String(Math.max(1, shells + Math.floor(Math.random() * 4) - 2))
      );
      const choices = shuffleArray([correct, ...distractors]);
      questions.push({
        questionText: `How many electron shells does ${el.name} have?`,
        choices, correctIndex: choices.indexOf(correct),
        explanation: `${el.name} has ${shells} electron shell${shells !== 1 ? 's' : ''}! It's in period ${el.period}.`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    } else if (type === 3) {
      // Which block?
      const correct = `${el.block}-block`;
      const allBlocks = ['s-block', 'p-block', 'd-block', 'f-block'];
      const distractors = allBlocks.filter(b => b !== correct);
      const choices = shuffleArray([correct, ...distractors.slice(0, 3)]);
      questions.push({
        questionText: `Which block of the periodic table is ${el.name} in?`,
        choices, correctIndex: choices.indexOf(correct),
        explanation: `${el.name} is in the ${el.block}-block! This tells us which type of orbital its outer electrons fill.`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    } else if (type === 4) {
      // Electrons in the outer shell
      const shellElectrons = getShellElectrons(el.atomicNumber);
      const outer = shellElectrons[shellElectrons.length - 1];
      const correct = String(outer);
      const distractors = uniqueDistractors(correct, 3, () =>
        String(Math.max(1, Math.min(32, outer + Math.floor(Math.random() * 6) - 3)))
      );
      const choices = shuffleArray([correct, ...distractors]);
      questions.push({
        questionText: `How many electrons are in ${el.name}'s outermost shell?`,
        choices, correctIndex: choices.indexOf(correct),
        explanation: `${el.name} has ${outer} electron${outer !== 1 ? 's' : ''} in its outermost shell. These are called valence electrons!`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    } else if (type === 5) {
      // What is the electron configuration? (show 3 options + correct)
      const correct = el.electronConfiguration;
      const distractors = uniqueDistractors(correct, 3, () => {
        const randomEl = elements[Math.floor(Math.random() * Math.min(pool, elements.length))];
        return randomEl.electronConfiguration;
      });
      const choices = shuffleArray([correct, ...distractors]);
      questions.push({
        questionText: `What is the electron configuration of ${el.name}?`,
        choices, correctIndex: choices.indexOf(correct),
        explanation: `${el.name}'s electron configuration is ${el.electronConfiguration}. This shows how electrons fill the orbitals!`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    } else if (type === 6) {
      // True/False: Atomic number = number of protons
      const isTrue = Math.random() > 0.5;
      const fakeNum = el.atomicNumber + (Math.random() > 0.5 ? 2 : -2);
      const shownNum = isTrue ? el.atomicNumber : Math.max(1, fakeNum);
      const correct = isTrue ? 'True' : 'False';
      const choices = ['True', 'False'];
      questions.push({
        questionText: `True or False: ${el.name} has ${shownNum} protons in its nucleus.`,
        choices, correctIndex: choices.indexOf(correct),
        explanation: `${el.name} has exactly ${el.atomicNumber} protons. The atomic number always tells you the number of protons!`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    } else {
      // Which element has this many electron shells?
      const shells = getShellCount(el.atomicNumber);
      const distractors = uniqueDistractors(el.name, 3, () => {
        const randomEl = elements[Math.floor(Math.random() * Math.min(pool, elements.length))];
        return randomEl.name;
      });
      const choices = shuffleArray([el.name, ...distractors]);
      questions.push({
        questionText: `Which of these elements has ${shells} electron shell${shells !== 1 ? 's' : ''}?`,
        choices, correctIndex: choices.indexOf(el.name),
        explanation: `${el.name} (period ${el.period}) has ${shells} electron shell${shells !== 1 ? 's' : ''}!`,
        elementNum: el.atomicNumber, elementSymbol: el.symbol,
      });
    }
  }

  return shuffleArray(questions);
}

export default function AtomQuizScreen({ onBack }: AtomQuizScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [questions, setQuestions] = useState<AtomQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const poolSize = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 118;
  const questionCount = 10;

  const startQuiz = useCallback(() => {
    setQuestions(generateAtomQuestions(questionCount, poolSize));
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setAnswered(null);
    setPhase('playing');
  }, [poolSize]);

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
    const q = questions[currentQ];
    if (idx === q.correctIndex) {
      playCorrect();
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else {
      playWrong();
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setPhase('result');
      if (score >= questions.length * 0.7) playCollect();
    } else {
      setCurrentQ(q => q + 1);
      setAnswered(null);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">⚛️ Atom Quiz</h2>
        <Elementor expression="greeting" message="Let's learn about atoms! How many protons, electrons, shells... are you ready?" />

        <div className="difficulty-select">
          {([
            { key: 'easy' as const, label: 'Beginner', desc: 'First 20 elements' },
            { key: 'medium' as const, label: 'Intermediate', desc: 'First 50 elements' },
            { key: 'hard' as const, label: 'Expert', desc: 'All 118 elements' },
          ]).map(d => (
            <button
              key={d.key}
              className={`diff-btn ${difficulty === d.key ? 'selected' : ''}`}
              onClick={() => setDifficulty(d.key)}
            >
              <span className="diff-label">{d.label}</span>
              <span className="diff-desc">{d.desc}</span>
            </button>
          ))}
        </div>

        <button className="start-btn" onClick={startQuiz}>Start Quiz!</button>
      </div>
    );
  }

  if (phase === 'playing' && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="aq-playing">
        {showExitConfirm && (
          <div className="exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
            <div className="exit-confirm-card" onClick={e => e.stopPropagation()}>
              <p>Quit this quiz?</p>
              <div className="exit-confirm-actions">
                <button className="start-btn" onClick={() => setShowExitConfirm(false)}>Keep Playing</button>
                <button className="back-btn" onClick={onBack}>Quit</button>
              </div>
            </div>
          </div>
        )}
        <div className="aq-header">
          <button className="quiz-exit-btn" onClick={() => setShowExitConfirm(true)} title="Quit">✕</button>
          <span className="aq-progress">{currentQ + 1}/{questions.length}</span>
          <span className="aq-score">⭐ {score}</span>
          {streak > 1 && <span className="aq-streak">🔥 {streak}</span>}
        </div>

        <div className="aq-atom-display">
          <AtomModel atomicNumber={q.elementNum} symbol={q.elementSymbol} size={140} />
        </div>

        <div className="aq-question">
          <p className="aq-question-text">{q.questionText}</p>
          <button className="tts-btn tts-btn-small" onClick={() => speakText(q.questionText)} title="Read aloud">🔊</button>
        </div>

        <div className="aq-choices">
          {q.choices.map((choice, idx) => {
            let cls = 'aq-choice';
            if (answered !== null) {
              if (idx === q.correctIndex) cls += ' correct';
              else if (idx === answered) cls += ' wrong';
            }
            return (
              <button key={idx} className={cls} onClick={() => handleAnswer(idx)} disabled={answered !== null}>
                {choice}
              </button>
            );
          })}
        </div>

        {answered !== null && (
          <div className="aq-explanation">
            <p>{q.explanation}</p>
            <button className="start-btn" onClick={nextQuestion}>
              {currentQ + 1 >= questions.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Result
  const pct = Math.round((score / questions.length) * 100);
  const resultMsg = pct >= 80
    ? "Atomic genius! You really understand how atoms work!"
    : pct >= 50
    ? "Good work! You're learning a lot about atomic structure!"
    : "Keep studying atoms — they're the building blocks of everything!";

  return (
    <div className="quiz-result">
      <Elementor expression={pct >= 80 ? 'celebrate' : pct >= 50 ? 'correct' : 'hint'} message={resultMsg} />
      <div className="result-card">
        <h2>Atom Quiz Complete!</h2>
        <div className="result-stats">
          <div className="result-stat">
            <span className="stat-value">{score}/{questions.length}</span>
            <span className="stat-label">Correct</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{pct}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>
      </div>
      <div className="result-actions">
        <button className="start-btn" onClick={startQuiz}>Play Again</button>
        <button className="back-btn" onClick={onBack}>Home</button>
      </div>
    </div>
  );
}
