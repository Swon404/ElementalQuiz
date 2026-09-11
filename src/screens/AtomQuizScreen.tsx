import { useState, useCallback, useRef } from 'react';
import Elementor from '../components/Elementor.tsx';
import { speakText } from '../engine/tts.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';
import { buildGameConfigKey, getGameLeaderboard, recordCompletedGameResult, type LeaderboardEntry } from '../engine/gameResults.ts';

interface AtomQuizScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  championshipRunId?: string;
  championshipRoundCount?: number;
}

type Phase = 'setup' | 'playing' | 'result';

import { generateAtomQuestions, type AtomQuestion } from '../games/atomQuiz.ts';
export { generateAtomQuestions, type AtomQuestion } from '../games/atomQuiz.ts';

export default function AtomQuizScreen({ onBack, playerId, playerName, championshipRoundCount, championshipRunId }: AtomQuizScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<AtomQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newBestId, setNewBestId] = useState<string | null>(null);
  const startedAtRef = useRef(0);

  const questionCount = championshipRoundCount ?? 12;
  const configKey = buildGameConfigKey('atom-quiz', 'classic', { questions: questionCount });

  const startQuiz = useCallback(() => {
    setQuestions(generateAtomQuestions(questionCount));
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setAnswered(null);
    setElapsedMs(0);
    setNewBestId(null);
    setLeaderboard(getGameLeaderboard('atom-quiz', 'classic', configKey, 'solo'));
    startedAtRef.current = Date.now();
    setPhase('playing');
  }, [configKey, questionCount]);

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
      const completedElapsedMs = Math.max(1, Date.now() - startedAtRef.current);
      const recorded = recordCompletedGameResult({
        rulesVersion: 1,
        gameId: 'atom-quiz',
        variantId: 'classic',
        configKey,
        format: 'solo',
        participant: { id: playerId, name: playerName, kind: playerId.startsWith('guest:') ? 'guest' : 'profile' },
        championshipRunId,
        metrics: {
          score,
          normalizedScore: Math.round((score / questions.length) * 100),
          correct: score,
          total: questions.length,
          elapsedMs: completedElapsedMs,
        },
      });
      const updated = getGameLeaderboard('atom-quiz', 'classic', configKey, 'solo');
      setElapsedMs(completedElapsedMs);
      setLeaderboard(updated);
      setNewBestId(recorded && updated.some(entry => entry.id === recorded.id) ? recorded.id : null);
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
        <Elementor expression="greeting" message="Let's learn how atoms work! Protons, neutrons, electrons, shells — are you ready?" />
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

        {q.illustration && (
          <div className="aq-illustration">{q.illustration}</div>
        )}

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
            <p><strong>{answered === q.correctIndex ? 'Correct: ' : 'Answer: '}{q.choices[q.correctIndex]}</strong></p>
            <p>{q.explanation}</p>
            {q.extraFact && <p><strong>Fun fact:</strong> {q.extraFact}</p>}
            <button className="tts-btn tts-btn-small" onClick={() => speakText(`${q.choices[q.correctIndex]}. ${q.explanation}${q.extraFact ? ` Fun fact: ${q.extraFact}` : ''}`)} title="Read explanation aloud">🔊</button>
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
      <div className="atomic-order-leaderboard match-trial-leaderboard">
        <span className="atomic-order-best-mode">{questionCount} questions · {(elapsedMs / 1000).toFixed(1)}s</span>
        <span className="atomic-order-best-label">🏆 Atom Quiz Top 10</span>
        {newBestId && <span className="atomic-order-new-best">🎉 New leaderboard best!</span>}
        {leaderboard.length ? <ol className="atomic-order-leaderboard-list">{leaderboard.map(entry => <li key={entry.id} className={entry.id === newBestId ? 'me' : ''}><span>{entry.participant.name} · {entry.metrics.score}/{entry.metrics.total}</span><span>{entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : '—'}</span></li>)}</ol> : <span className="atomic-order-best-values">No scores yet — set the first!</span>}
      </div>
      <div className="result-actions">
        {championshipRunId
          ? <button className="start-btn" onClick={onBack}>Continue Championship</button>
          : <><button className="start-btn" onClick={startQuiz}>Play Again</button><button className="back-btn" onClick={onBack}>Back to Games</button></>}
      </div>
    </div>
  );
}
