import { useState, useEffect, useCallback } from 'react';
import type { Question } from '../engine/questionGenerator.ts';
import { DIFFICULTY_CONFIG, calculatePoints, type Difficulty } from '../engine/scoring.ts';
import { speakText } from '../engine/tts.ts';
import { playCorrect, playWrong, playStreak } from '../engine/sounds.ts';
import Elementor from './Elementor.tsx';

interface QuizCardProps {
  question: Question;
  difficulty: Difficulty;
  streak: number;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (correct: boolean, points: number, elementNum: number) => void;
  timedMode: boolean;
}

export default function QuizCard({
  question, difficulty, streak, questionNumber, totalQuestions, onAnswer, timedMode,
}: QuizCardProps) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const [selected, setSelected] = useState<number | null>(null);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [disabledChoices, setDisabledChoices] = useState<Set<number>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(config.timerSeconds);
  const [answered, setAnswered] = useState(false);
  const [pendingResult, setPendingResult] = useState<{ correct: boolean; points: number; elementNum: number } | null>(null);

  useEffect(() => {
    setSelected(null);
    setSecondChanceUsed(false);
    setDisabledChoices(new Set());
    setShowResult(false);
    setTimeLeft(config.timerSeconds);
    setAnswered(false);
    setPendingResult(null);
  }, [question.id, config.timerSeconds]);

  useEffect(() => {
    if (!timedMode || answered) return;
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  });

  const handleTimeout = useCallback(() => {
    setAnswered(true);
    setShowResult(true);
    setPendingResult({ correct: false, points: 0, elementNum: question.element.atomicNumber });
  }, [question.element.atomicNumber]);

  const handleSelect = (index: number) => {
    if (answered || disabledChoices.has(index)) return;

    const isCorrect = index === question.correctIndex;
    setSelected(index);

    if (isCorrect) {
      setAnswered(true);
      setShowResult(true);
      const timeRemainingPct = timedMode ? timeLeft / config.timerSeconds : 0.5;
      const pts = calculatePoints(difficulty, true, streak, secondChanceUsed, timeRemainingPct);
      setPendingResult({ correct: true, points: pts, elementNum: question.element.atomicNumber });
      if (streak >= 2) playStreak(); else playCorrect();
    } else {
      if (config.secondChance && !secondChanceUsed) {
        // Second chance: grey out wrong answer, give hint
        setSecondChanceUsed(true);
        setDisabledChoices(new Set([index]));
        setSelected(null);
        playWrong();
      } else {
        setAnswered(true);
        setShowResult(true);
        setPendingResult({ correct: false, points: 0, elementNum: question.element.atomicNumber });
        playWrong();
      }
    }
  };

  const getElementorExpression = () => {
    if (!showResult && secondChanceUsed) return 'hint' as const;
    if (!showResult) return 'thinking' as const;
    if (selected === question.correctIndex) return 'correct' as const;
    return 'wrong' as const;
  };

  const getElementorMessage = () => {
    if (!showResult && secondChanceUsed) return question.hint || "Try again! You've got this!";
    if (!showResult) {
      // Streak-based encouragement before answering
      if (streak >= 12) return "You're UNSTOPPABLE! 🔥 Keep that streak going!";
      if (streak >= 8) return "Amazing streak! Can you keep it up?";
      if (streak >= 5) return "You're on fire! 5 in a row!";
      if (streak >= 3) return "Hat trick! Let's keep going!";
      return null;
    }
    if (answered && timeLeft <= 0 && selected === null) return "Time's up! Let's see the answer...";
    if (selected === question.correctIndex) {
      const messages = secondChanceUsed
        ? ["Nice recovery! You got it!", "Second time's a charm!", "Great save!"]
        : ["Brilliant! That's correct!", "You nailed it!", "Spot on, scientist!", "Excellent work!", "That's right!"];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    const wrongMessages = ["Not quite, but now you know!", "Good try! Remember this one!", "Learning is part of the adventure!"];
    return wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
  };

  const handleNext = () => {
    if (pendingResult) {
      onAnswer(pendingResult.correct, pendingResult.points, pendingResult.elementNum);
    }
  };



  const timerPct = timedMode ? (timeLeft / config.timerSeconds) * 100 : 100;
  const timerColor = timerPct > 50 ? '#66bb6a' : timerPct > 25 ? '#ffa726' : '#ef5350';

  return (
    <div className="quiz-card">
      <div className="quiz-header">
        <span className="quiz-progress">Q{questionNumber}/{totalQuestions}</span>
        {timedMode && (
          <div className="quiz-timer">
            <div className="timer-bar" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
            <span className="timer-text">{timeLeft}s</span>
          </div>
        )}
        <span className="quiz-streak">{streak > 0 ? `🔥 ${streak}` : ''}</span>
      </div>

      <Elementor expression={getElementorExpression()} message={getElementorMessage() || undefined} />

      <div className="quiz-question">
        <h2>{question.questionText}</h2>
        {'speechSynthesis' in window && (
          <button className="tts-btn" onClick={() => speakText(question.questionText)} title="Read aloud">
            🔊
          </button>
        )}
      </div>

      <div className="quiz-choices">
        {question.choices.map((choice, i) => {
          let btnClass = 'choice-btn';
          if (showResult) {
            if (i === question.correctIndex) btnClass += ' correct';
            else if (i === selected) btnClass += ' wrong';
          } else if (disabledChoices.has(i)) {
            btnClass += ' disabled';
          }
          return (
            <button
              key={i}
              className={btnClass}
              onClick={() => handleSelect(i)}
              disabled={answered || disabledChoices.has(i)}
            >
              <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
              <span className="choice-text">{choice}</span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="quiz-explanation">
          <p>{question.explanation}</p>
          {'speechSynthesis' in window && (
            <button className="tts-btn tts-btn-small" onClick={() => speakText(question.explanation)} title="Read explanation aloud">
              🔊
            </button>
          )}
        </div>
      )}

      {pendingResult && (
        <button className="start-btn next-btn" onClick={handleNext}>
          Next →
        </button>
      )}
    </div>
  );
}
