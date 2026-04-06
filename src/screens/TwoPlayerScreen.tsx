import { useState, useCallback } from 'react';
import QuizCard from '../components/QuizCard.tsx';
import Elementor from '../components/Elementor.tsx';
import { generateQuiz, type Question } from '../engine/questionGenerator.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';

interface TwoPlayerScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

type Phase = 'setup' | 'playing' | 'result';

type PlayerConfig = {
  name: string;
  difficulty: Difficulty;
  avatar: string;
};

const AVATARS = ['⚛️', '🧪', '🔬', '💎', '🌟', '🚀', '🔮', '🌈'];

export default function TwoPlayerScreen({ onComplete, onBack }: TwoPlayerScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [rounds, setRounds] = useState(5);
  const [player1, setPlayer1] = useState<PlayerConfig>({ name: 'Player 1', difficulty: 'explorer', avatar: '⚛️' });
  const [player2, setPlayer2] = useState<PlayerConfig>({ name: 'Player 2', difficulty: 'scientist', avatar: '🚀' });
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [p1Questions, setP1Questions] = useState<Question[]>([]);
  const [p2Questions, setP2Questions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [p1Correct, setP1Correct] = useState(0);
  const [p2Correct, setP2Correct] = useState(0);
  const [p1Streak, setP1Streak] = useState(0);
  const [p2Streak, setP2Streak] = useState(0);
  const [showPassDevice, setShowPassDevice] = useState(false);

  const startGame = useCallback(() => {
    setP1Questions(generateQuiz(player1.difficulty, rounds));
    setP2Questions(generateQuiz(player2.difficulty, rounds));
    setCurrentPlayer(1);
    setCurrentRound(1);
    setQIndex(0);
    setP1Correct(0);
    setP2Correct(0);
    setP1Streak(0);
    setP2Streak(0);
    setShowPassDevice(false);
    setPhase('playing');
  }, [player1.difficulty, player2.difficulty, rounds]);

  const handleAnswer = useCallback((correct: boolean, _points: number) => {
    if (currentPlayer === 1) {
      if (correct) { setP1Correct(c => c + 1); setP1Streak(s => s + 1); } else { setP1Streak(0); }
      // Show pass device screen
      setShowPassDevice(true);
    } else {
      if (correct) { setP2Correct(c => c + 1); setP2Streak(s => s + 1); } else { setP2Streak(0); }
      // Check if game over
      if (currentRound >= rounds) {
        setPhase('result');
      } else {
        setCurrentRound(r => r + 1);
        setCurrentPlayer(1);
        setQIndex(i => i + 1);
      }
    }
  }, [currentPlayer, currentRound, rounds]);

  const passDevice = () => {
    setShowPassDevice(false);
    setCurrentPlayer(2);
  };

  if (phase === 'setup') {
    return (
      <div className="two-player-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">👥 2 Player Mode</h2>
        <Elementor expression="greeting" message="Two scientists enter, one champion emerges! Set up your players!" />

        <div className="players-config">
          {[{ p: player1, setP: setPlayer1, label: 'Player 1' }, { p: player2, setP: setPlayer2, label: 'Player 2' }].map(({ p, setP, label }) => (
            <div key={label} className="player-config-card">
              <h3>{label}</h3>
              <input
                className="player-name-input"
                value={p.name}
                onChange={e => setP({ ...p, name: e.target.value })}
                placeholder="Enter name"
                maxLength={20}
              />
              <div className="avatar-select">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    className={`avatar-btn ${p.avatar === a ? 'selected' : ''}`}
                    onClick={() => setP({ ...p, avatar: a })}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="diff-select-mini">
                {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => (
                  <button
                    key={d}
                    className={`diff-mini-btn ${p.difficulty === d ? 'selected' : ''}`}
                    onClick={() => setP({ ...p, difficulty: d })}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounds-select">
          <label>Rounds: </label>
          {[3, 5, 10].map(r => (
            <button
              key={r}
              className={`round-btn ${rounds === r ? 'selected' : ''}`}
              onClick={() => setRounds(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <button className="start-btn" onClick={startGame}>Start Battle!</button>
      </div>
    );
  }

  if (phase === 'playing') {
    if (showPassDevice) {
      return (
        <div className="pass-device">
          <Elementor expression="thinking" message={`Great job! Now pass the device to ${player2.name}!`} />
          <div className="pass-info">
            <p>{player2.avatar} {player2.name}'s turn — Round {currentRound} of {rounds}</p>
          </div>
          <button className="start-btn" onClick={passDevice}>I'm ready!</button>
        </div>
      );
    }

    const cp = currentPlayer === 1 ? player1 : player2;
    const questions = currentPlayer === 1 ? p1Questions : p2Questions;
    const qi = currentPlayer === 1 ? qIndex : qIndex;
    const streak = currentPlayer === 1 ? p1Streak : p2Streak;

    if (!questions[qi]) return null;

    return (
      <div className="quiz-playing two-player-playing">
        <div className="two-player-header">
          <div className="player-indicator">
            <span className="player-avatar">{cp.avatar}</span>
            <span className="player-name">{cp.name}</span>
            <span className="player-diff">({DIFFICULTY_CONFIG[cp.difficulty].label})</span>
          </div>
          <div className="two-player-scores">
            <span>{player1.avatar} {p1Correct}✓</span>
            <span>vs</span>
            <span>{p2Correct}✓ {player2.avatar}</span>
          </div>
        </div>
        <QuizCard
          question={questions[qi]}
          difficulty={cp.difficulty}
          streak={streak}
          questionNumber={currentRound}
          totalQuestions={rounds}
          onAnswer={(correct, points) => handleAnswer(correct, points)}
          timedMode={false}
        />
      </div>
    );
  }

  if (phase === 'result') {
    const winner = p1Correct > p2Correct ? player1 : p2Correct > p1Correct ? player2 : null;
    return (
      <div className="two-player-result">
        <Elementor
          expression="celebrate"
          message={winner ? `${winner.avatar} ${winner.name} is the Element Champion!` : "It's a draw! You're both element champions! 🤝"}
        />

        <div className="result-card">
          <h2>🏆 Battle Complete!</h2>
          <div className="battle-scores">
            <div className={`battle-player ${p1Correct >= p2Correct ? 'winner' : ''}`}>
              <span className="bp-avatar">{player1.avatar}</span>
              <span className="bp-name">{player1.name}</span>
              <span className="bp-score">{p1Correct}/{rounds}</span>
              <span className="bp-correct">correct</span>
              <span className="bp-diff">{DIFFICULTY_CONFIG[player1.difficulty].label}</span>
            </div>
            <div className="vs-divider">VS</div>
            <div className={`battle-player ${p2Correct >= p1Correct ? 'winner' : ''}`}>
              <span className="bp-avatar">{player2.avatar}</span>
              <span className="bp-name">{player2.name}</span>
              <span className="bp-score">{p2Correct}/{rounds}</span>
              <span className="bp-correct">correct</span>
              <span className="bp-diff">{DIFFICULTY_CONFIG[player2.difficulty].label}</span>
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button className="start-btn" onClick={startGame}>Rematch!</button>
          <button className="back-btn" onClick={onComplete}>Home</button>
        </div>
      </div>
    );
  }

  return null;
}
