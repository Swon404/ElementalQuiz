import { useState, useCallback, useEffect, useRef } from 'react';
import QuizCard from '../components/QuizCard.tsx';
import Elementor from '../components/Elementor.tsx';
import { generateQuiz, type Question } from '../engine/questionGenerator.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import { elements } from '../data/elements.ts';
import { loadTwoPlayerNames, saveTwoPlayerNames } from '../engine/storage.ts';
import { playCorrect, playWrong } from '../engine/sounds.ts';

interface TwoPlayerScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

type GameMode = 'quiz-battle' | 'speed-race' | 'element-match';
type Phase = 'mode-select' | 'setup' | 'playing' | 'result';

type PlayerConfig = {
  name: string;
  difficulty: Difficulty;
  avatar: string;
};

const AVATARS = ['⚛️', '🧪', '🔬', '💎', '🌟', '🚀', '🔮', '🌈'];

// --- Speed Race types ---
type SpeedRound = { element: typeof elements[0]; choices: string[] };

// --- Element Match types ---
type MatchCard = { id: number; text: string; elementNum: number; flipped: boolean; matched: boolean };

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSpeedRounds(count: number): SpeedRound[] {
  const pool = shuffleArray(elements.slice(0, 36));
  return pool.slice(0, count).map(el => {
    const wrong = shuffleArray(elements.filter(e => e.atomicNumber !== el.atomicNumber))
      .slice(0, 3)
      .map(e => e.name);
    const choices = shuffleArray([el.name, ...wrong]);
    return { element: el, choices };
  });
}

function generateMatchCards(pairCount: number): MatchCard[] {
  const pool = shuffleArray(elements.slice(0, 36)).slice(0, pairCount);
  const cards: MatchCard[] = [];
  let id = 0;
  for (const el of pool) {
    cards.push({ id: id++, text: el.symbol, elementNum: el.atomicNumber, flipped: false, matched: false });
    cards.push({ id: id++, text: el.name, elementNum: el.atomicNumber, flipped: false, matched: false });
  }
  return shuffleArray(cards);
}

export default function TwoPlayerScreen({ onComplete, onBack }: TwoPlayerScreenProps) {
  const [phase, setPhase] = useState<Phase>('mode-select');
  const [gameMode, setGameMode] = useState<GameMode>('quiz-battle');
  const [rounds, setRounds] = useState(5);

  // Load saved names
  const saved = loadTwoPlayerNames();
  const [player1, setPlayer1] = useState<PlayerConfig>({ name: saved.name1, difficulty: 'explorer', avatar: saved.avatar1 });
  const [player2, setPlayer2] = useState<PlayerConfig>({ name: saved.name2, difficulty: 'scientist', avatar: saved.avatar2 });

  // Quiz Battle state
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [p1Questions, setP1Questions] = useState<Question[]>([]);
  const [p2Questions, setP2Questions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Streak, setP1Streak] = useState(0);
  const [p2Streak, setP2Streak] = useState(0);
  const [showPassDevice, setShowPassDevice] = useState(false);

  // Speed Race state
  const [speedRounds, setSpeedRounds] = useState<SpeedRound[]>([]);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedReady, setSpeedReady] = useState(false);
  const [speedAnswered, setSpeedAnswered] = useState<string | null>(null);

  // Element Match state
  const [matchCards, setMatchCards] = useState<MatchCard[]>([]);
  const [matchTurn, setMatchTurn] = useState(1); // 1 or 2
  const [matchFirst, setMatchFirst] = useState<number | null>(null);
  const [matchLocked, setMatchLocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Save names whenever they change
  useEffect(() => {
    saveTwoPlayerNames({ name1: player1.name, avatar1: player1.avatar, name2: player2.name, avatar2: player2.avatar });
  }, [player1.name, player1.avatar, player2.name, player2.avatar]);

  const resetScores = () => {
    setP1Score(0);
    setP2Score(0);
    setP1Streak(0);
    setP2Streak(0);
  };

  // --- Quiz Battle ---
  const startQuizBattle = useCallback(() => {
    setP1Questions(generateQuiz(player1.difficulty, rounds));
    setP2Questions(generateQuiz(player2.difficulty, rounds));
    setCurrentPlayer(1);
    setCurrentRound(1);
    setQIndex(0);
    resetScores();
    setShowPassDevice(false);
    setPhase('playing');
  }, [player1.difficulty, player2.difficulty, rounds]);

  const handleQuizAnswer = useCallback((correct: boolean, _points: number) => {
    if (currentPlayer === 1) {
      if (correct) { setP1Score(c => c + 1); setP1Streak(s => s + 1); } else { setP1Streak(0); }
      setShowPassDevice(true);
    } else {
      if (correct) { setP2Score(c => c + 1); setP2Streak(s => s + 1); } else { setP2Streak(0); }
      if (currentRound >= rounds) {
        setPhase('result');
      } else {
        setCurrentRound(r => r + 1);
        setCurrentPlayer(1);
        setQIndex(i => i + 1);
      }
    }
  }, [currentPlayer, currentRound, rounds]);

  // --- Speed Race ---
  const startSpeedRace = useCallback(() => {
    setSpeedRounds(generateSpeedRounds(rounds));
    setSpeedIndex(0);
    setSpeedReady(false);
    setSpeedAnswered(null);
    resetScores();
    setPhase('playing');
  }, [rounds]);

  const handleSpeedAnswer = (player: number, choiceName: string) => {
    if (speedAnswered) return;
    setSpeedAnswered(choiceName);
    const correct = choiceName === speedRounds[speedIndex].element.name;
    if (correct) {
      playCorrect();
      if (player === 1) setP1Score(s => s + 1);
      else setP2Score(s => s + 1);
    } else {
      playWrong();
      // Other player gets the point
      if (player === 1) setP2Score(s => s + 1);
      else setP1Score(s => s + 1);
    }
    setTimeout(() => {
      if (speedIndex + 1 >= speedRounds.length) {
        setPhase('result');
      } else {
        setSpeedIndex(i => i + 1);
        setSpeedAnswered(null);
        setSpeedReady(false);
      }
    }, 1200);
  };

  // --- Element Match ---
  const startElementMatch = useCallback(() => {
    setMatchCards(generateMatchCards(rounds));
    setMatchTurn(1);
    setMatchFirst(null);
    setMatchLocked(false);
    resetScores();
    setPhase('playing');
  }, [rounds]);

  const handleMatchFlip = (cardId: number) => {
    if (matchLocked) return;
    const card = matchCards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    const updated = matchCards.map(c => c.id === cardId ? { ...c, flipped: true } : c);
    setMatchCards(updated);

    if (matchFirst === null) {
      setMatchFirst(cardId);
    } else {
      setMatchLocked(true);
      const first = updated.find(c => c.id === matchFirst)!;
      const second = updated.find(c => c.id === cardId)!;

      if (first.elementNum === second.elementNum) {
        playCorrect();
        const matched = updated.map(c =>
          c.elementNum === first.elementNum ? { ...c, matched: true } : c
        );
        setMatchCards(matched);
        if (matchTurn === 1) setP1Score(s => s + 1);
        else setP2Score(s => s + 1);
        setMatchFirst(null);
        setMatchLocked(false);

        if (matched.every(c => c.matched)) {
          setTimeout(() => setPhase('result'), 600);
        }
      } else {
        playWrong();
        lockTimer.current = setTimeout(() => {
          setMatchCards(prev => prev.map(c =>
            c.id === matchFirst || c.id === cardId ? { ...c, flipped: false } : c
          ));
          setMatchFirst(null);
          setMatchLocked(false);
          setMatchTurn(t => t === 1 ? 2 : 1);
        }, 1000);
      }
    }
  };

  const startGame = () => {
    if (gameMode === 'quiz-battle') startQuizBattle();
    else if (gameMode === 'speed-race') startSpeedRace();
    else startElementMatch();
  };

  // --- MODE SELECT ---
  if (phase === 'mode-select') {
    return (
      <div className="two-player-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">👥 2 Player Mode</h2>
        <Elementor expression="greeting" message="Pick a game to play together!" />

        <div className="game-mode-grid">
          <button
            className={`game-mode-btn ${gameMode === 'quiz-battle' ? 'selected' : ''}`}
            onClick={() => setGameMode('quiz-battle')}
          >
            <span className="gm-icon">⚔️</span>
            <span className="gm-name">Quiz Battle</span>
            <span className="gm-desc">Take turns answering — most correct wins!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'speed-race' ? 'selected' : ''}`}
            onClick={() => setGameMode('speed-race')}
          >
            <span className="gm-icon">⚡</span>
            <span className="gm-name">Speed Race</span>
            <span className="gm-desc">See the symbol, race to tap the name first!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'element-match' ? 'selected' : ''}`}
            onClick={() => setGameMode('element-match')}
          >
            <span className="gm-icon">🃏</span>
            <span className="gm-name">Element Match</span>
            <span className="gm-desc">Memory game — match symbols to names!</span>
          </button>
        </div>

        <button className="start-btn" onClick={() => setPhase('setup')}>Next →</button>
      </div>
    );
  }

  // --- SETUP ---
  if (phase === 'setup') {
    return (
      <div className="two-player-setup">
        <button className="back-btn" onClick={() => setPhase('mode-select')}>← Back</button>
        <h2 className="setup-title">
          {gameMode === 'quiz-battle' && '⚔️ Quiz Battle'}
          {gameMode === 'speed-race' && '⚡ Speed Race'}
          {gameMode === 'element-match' && '🃏 Element Match'}
        </h2>
        <Elementor expression="greeting" message="Set up your players!" />

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
              {gameMode === 'quiz-battle' && (
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
              )}
            </div>
          ))}
        </div>

        <div className="rounds-select">
          <label>{gameMode === 'element-match' ? 'Pairs: ' : 'Rounds: '}</label>
          {(gameMode === 'element-match' ? [4, 6, 8] : [3, 5, 10]).map(r => (
            <button
              key={r}
              className={`round-btn ${rounds === r ? 'selected' : ''}`}
              onClick={() => setRounds(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <button className="start-btn" onClick={startGame}>Start!</button>
      </div>
    );
  }

  // --- PLAYING: Quiz Battle ---
  if (phase === 'playing' && gameMode === 'quiz-battle') {
    if (showPassDevice) {
      return (
        <div className="pass-device">
          <Elementor expression="thinking" message={`Great job! Now pass the device to ${player2.name}!`} />
          <div className="pass-info">
            <p>{player2.avatar} {player2.name}'s turn — Round {currentRound} of {rounds}</p>
          </div>
          <button className="start-btn" onClick={() => { setShowPassDevice(false); setCurrentPlayer(2); }}>I'm ready!</button>
        </div>
      );
    }

    const cp = currentPlayer === 1 ? player1 : player2;
    const questions = currentPlayer === 1 ? p1Questions : p2Questions;
    const streak = currentPlayer === 1 ? p1Streak : p2Streak;

    if (!questions[qIndex]) return null;

    return (
      <div className="quiz-playing two-player-playing">
        <div className="two-player-header">
          <div className="player-indicator">
            <span className="player-avatar">{cp.avatar}</span>
            <span className="player-name">{cp.name}</span>
            <span className="player-diff">({DIFFICULTY_CONFIG[cp.difficulty].label})</span>
          </div>
          <div className="two-player-scores">
            <span>{player1.avatar} {p1Score}✓</span>
            <span>vs</span>
            <span>{p2Score}✓ {player2.avatar}</span>
          </div>
        </div>
        <QuizCard
          question={questions[qIndex]}
          difficulty={cp.difficulty}
          streak={streak}
          questionNumber={currentRound}
          totalQuestions={rounds}
          onAnswer={(correct, points) => handleQuizAnswer(correct, points)}
          timedMode={false}
        />
      </div>
    );
  }

  // --- PLAYING: Speed Race ---
  if (phase === 'playing' && gameMode === 'speed-race') {
    const round = speedRounds[speedIndex];
    if (!round) return null;

    if (!speedReady) {
      return (
        <div className="speed-ready">
          <h2>Round {speedIndex + 1} of {speedRounds.length}</h2>
          <div className="speed-scores">
            <span className="speed-p">{player1.avatar} {player1.name}: {p1Score}</span>
            <span className="speed-p">{player2.avatar} {player2.name}: {p2Score}</span>
          </div>
          <p className="speed-instruction">Hold the device between you. Tap your side when you know the answer!</p>
          <button className="start-btn" onClick={() => setSpeedReady(true)}>Go!</button>
        </div>
      );
    }

    const correctName = round.element.name;

    return (
      <div className="speed-race-playing">
        <div className="speed-element-display">
          <span className="speed-symbol">{round.element.symbol}</span>
          <span className="speed-number">#{round.element.atomicNumber}</span>
        </div>
        <div className="speed-choices-split">
          <div className="speed-player-side speed-left">
            <span className="speed-side-label">{player1.avatar} {player1.name}</span>
            {round.choices.map(c => (
              <button
                key={c}
                className={`speed-choice ${speedAnswered ? (c === correctName ? 'correct' : c === speedAnswered ? 'wrong' : '') : ''}`}
                onClick={() => handleSpeedAnswer(1, c)}
                disabled={!!speedAnswered}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="speed-divider">VS</div>
          <div className="speed-player-side speed-right">
            <span className="speed-side-label">{player2.avatar} {player2.name}</span>
            {round.choices.map(c => (
              <button
                key={c}
                className={`speed-choice ${speedAnswered ? (c === correctName ? 'correct' : c === speedAnswered ? 'wrong' : '') : ''}`}
                onClick={() => handleSpeedAnswer(2, c)}
                disabled={!!speedAnswered}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- PLAYING: Element Match ---
  if (phase === 'playing' && gameMode === 'element-match') {
    const cp = matchTurn === 1 ? player1 : player2;
    return (
      <div className="element-match-playing">
        <div className="match-header">
          <span className="match-turn">{cp.avatar} {cp.name}'s turn</span>
          <div className="match-scores">
            <span>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        <div className="match-grid" style={{ gridTemplateColumns: `repeat(${matchCards.length <= 12 ? 4 : 4}, 1fr)` }}>
          {matchCards.map(card => (
            <button
              key={card.id}
              className={`match-card ${card.flipped || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
              onClick={() => handleMatchFlip(card.id)}
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

  // --- RESULT ---
  if (phase === 'result') {
    const winner = p1Score > p2Score ? player1 : p2Score > p1Score ? player2 : null;
    const modeLabel = gameMode === 'quiz-battle' ? 'Quiz Battle' : gameMode === 'speed-race' ? 'Speed Race' : 'Element Match';
    return (
      <div className="two-player-result">
        <Elementor
          expression="celebrate"
          message={winner ? `${winner.avatar} ${winner.name} wins the ${modeLabel}!` : "It's a draw! You're both element champions! 🤝"}
        />

        <div className="result-card">
          <h2>🏆 {modeLabel} Complete!</h2>
          <div className="battle-scores">
            <div className={`battle-player ${p1Score >= p2Score ? 'winner' : ''}`}>
              <span className="bp-avatar">{player1.avatar}</span>
              <span className="bp-name">{player1.name}</span>
              <span className="bp-score">{p1Score}{gameMode === 'element-match' ? ' pairs' : `/${rounds}`}</span>
            </div>
            <div className="vs-divider">VS</div>
            <div className={`battle-player ${p2Score >= p1Score ? 'winner' : ''}`}>
              <span className="bp-avatar">{player2.avatar}</span>
              <span className="bp-name">{player2.name}</span>
              <span className="bp-score">{p2Score}{gameMode === 'element-match' ? ' pairs' : `/${rounds}`}</span>
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button className="start-btn" onClick={startGame}>Rematch!</button>
          <button className="back-btn" onClick={() => setPhase('mode-select')}>Change Game</button>
          <button className="back-btn" onClick={onComplete}>Home</button>
        </div>
      </div>
    );
  }

  return null;
}
