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

type GameMode = 'quiz-battle' | 'tf-blitz' | 'element-match';
type Phase = 'mode-select' | 'setup' | 'playing' | 'result';

type PlayerConfig = {
  name: string;
  difficulty: Difficulty;
  avatar: string;
};

const AVATARS = ['⚛️', '🧪', '🔬', '💎', '🌟', '🚀', '🔮', '🌈'];

// --- True or False types ---
type TFStatement = { text: string; answer: boolean; explanation: string };

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

const CATEGORY_LABELS: Record<string, string> = {
  'alkali-metal': 'an alkali metal',
  'alkaline-earth-metal': 'an alkaline earth metal',
  'transition-metal': 'a transition metal',
  'post-transition-metal': 'a post-transition metal',
  'metalloid': 'a metalloid',
  'nonmetal': 'a nonmetal',
  'halogen': 'a halogen',
  'noble-gas': 'a noble gas',
  'lanthanide': 'a lanthanide',
  'actinide': 'an actinide',
};

function generateTFStatements(count: number): TFStatement[] {
  const pool = shuffleArray(elements.slice(0, 36));
  const statements: TFStatement[] = [];

  for (let i = 0; i < count && i < pool.length; i++) {
    const el = pool[i];
    const type = Math.floor(Math.random() * 6);
    const isTrue = Math.random() > 0.5;

    if (type === 0) {
      // Symbol statement
      if (isTrue) {
        statements.push({ text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
      } else {
        const wrong = shuffleArray(elements.filter(e => e.symbol !== el.symbol))[0];
        statements.push({ text: `The symbol for ${el.name} is ${wrong.symbol}.`, answer: false, explanation: `Nope! ${el.name}'s symbol is ${el.symbol}, not ${wrong.symbol}.` });
      }
    } else if (type === 1) {
      // State at room temp
      if (isTrue) {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct — ${el.name} is a ${el.stateAtRoomTemp}.` });
      } else {
        const wrongState = el.stateAtRoomTemp === 'gas' ? 'solid' : el.stateAtRoomTemp === 'solid' ? 'gas' : 'solid';
        statements.push({ text: `${el.name} is a ${wrongState} at room temperature.`, answer: false, explanation: `No, ${el.name} is actually a ${el.stateAtRoomTemp} at room temperature.` });
      }
    } else if (type === 2) {
      // Category
      const catLabel = CATEGORY_LABELS[el.category] || el.category;
      if (isTrue) {
        statements.push({ text: `${el.name} is ${catLabel}.`, answer: true, explanation: `Yes, ${el.name} is classified as ${catLabel}.` });
      } else {
        const wrongCat = shuffleArray(Object.entries(CATEGORY_LABELS).filter(([k]) => k !== el.category))[0];
        statements.push({ text: `${el.name} is ${wrongCat[1]}.`, answer: false, explanation: `No, ${el.name} is ${catLabel}, not ${wrongCat[1]}.` });
      }
    } else if (type === 3) {
      // Atomic number comparison
      const other = shuffleArray(elements.filter(e => e.atomicNumber !== el.atomicNumber))[0];
      const bigger = el.atomicNumber > other.atomicNumber;
      if (isTrue === bigger) {
        statements.push({ text: `${el.name} has a higher atomic number than ${other.name}.`, answer: bigger, explanation: `${el.name} is #${el.atomicNumber} and ${other.name} is #${other.atomicNumber}.` });
      } else {
        statements.push({ text: `${el.name} has a lower atomic number than ${other.name}.`, answer: !bigger, explanation: `${el.name} is #${el.atomicNumber} and ${other.name} is #${other.atomicNumber}.` });
      }
    } else if (type === 4) {
      // Radioactivity
      if (isTrue) {
        statements.push({ text: `${el.name} is ${el.radioactive ? '' : 'not '}radioactive.`, answer: true, explanation: `Correct! ${el.name} is ${el.radioactive ? '' : 'not '}radioactive.` });
      } else {
        statements.push({ text: `${el.name} is ${el.radioactive ? 'not ' : ''}radioactive.`, answer: false, explanation: `Actually, ${el.name} is ${el.radioactive ? '' : 'not '}radioactive.` });
      }
    } else {
      // Discovery
      if (isTrue && el.discoveredBy) {
        statements.push({ text: `${el.name} was discovered by ${el.discoveredBy}.`, answer: true, explanation: `Yes! ${el.discoveredBy} discovered ${el.name}.` });
      } else {
        const wrongDiscoverer = shuffleArray(elements.filter(e => e.discoveredBy && e.discoveredBy !== el.discoveredBy))[0];
        statements.push({ text: `${el.name} was discovered by ${wrongDiscoverer?.discoveredBy || 'Unknown'}.`, answer: false, explanation: `No, ${el.name} was discovered by ${el.discoveredBy || 'ancient peoples'}.` });
      }
    }
  }
  return statements;
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
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Load saved names
  const saved = loadTwoPlayerNames();
  const [player1, setPlayer1] = useState<PlayerConfig>({ name: saved.name1, difficulty: 'explorer', avatar: saved.avatar1 });
  const [player2, setPlayer2] = useState<PlayerConfig>({ name: saved.name2, difficulty: 'scientist', avatar: saved.avatar2 });

  // Shared scores
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  // Quiz Battle state
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [p1Questions, setP1Questions] = useState<Question[]>([]);
  const [p2Questions, setP2Questions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [p1Streak, setP1Streak] = useState(0);
  const [p2Streak, setP2Streak] = useState(0);
  const [showPassDevice, setShowPassDevice] = useState(false);

  // True or False Blitz state
  const [tfStatements, setTfStatements] = useState<TFStatement[]>([]);
  const [tfIndex, setTfIndex] = useState(0);
  const [tfTurn, setTfTurn] = useState(1);
  const [tfAnswered, setTfAnswered] = useState<boolean | null>(null);
  const [tfShowResult, setTfShowResult] = useState(false);

  // Element Match state
  const [matchCards, setMatchCards] = useState<MatchCard[]>([]);
  const [matchTurn, setMatchTurn] = useState(1);
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

  const quitToMenu = () => {
    setShowQuitConfirm(false);
    setPhase('mode-select');
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

  // --- True or False Blitz ---
  const startTFBlitz = useCallback(() => {
    // Each player gets `rounds` statements, so total is rounds * 2
    setTfStatements(generateTFStatements(rounds * 2));
    setTfIndex(0);
    setTfTurn(1);
    setTfAnswered(null);
    setTfShowResult(false);
    resetScores();
    setPhase('playing');
  }, [rounds]);

  const handleTFAnswer = (answer: boolean) => {
    if (tfAnswered !== null) return;
    const stmt = tfStatements[tfIndex];
    const correct = answer === stmt.answer;
    setTfAnswered(answer);
    setTfShowResult(true);

    if (correct) {
      playCorrect();
      if (tfTurn === 1) setP1Score(s => s + 1);
      else setP2Score(s => s + 1);
    } else {
      playWrong();
    }
  };

  const nextTFRound = () => {
    const nextIdx = tfIndex + 1;
    if (nextIdx >= tfStatements.length) {
      setPhase('result');
    } else {
      setTfIndex(nextIdx);
      setTfTurn(tfTurn === 1 ? 2 : 1);
      setTfAnswered(null);
      setTfShowResult(false);
    }
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
    else if (gameMode === 'tf-blitz') startTFBlitz();
    else startElementMatch();
  };

  // Quit confirm overlay (shared)
  const quitOverlay = showQuitConfirm && (
    <div className="exit-confirm-overlay" onClick={() => setShowQuitConfirm(false)}>
      <div className="exit-confirm-card" onClick={e => e.stopPropagation()}>
        <p>Quit this game?</p>
        <div className="exit-confirm-actions">
          <button className="start-btn" onClick={() => setShowQuitConfirm(false)}>Keep Playing</button>
          <button className="back-btn" onClick={quitToMenu}>Quit</button>
        </div>
      </div>
    </div>
  );

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
            className={`game-mode-btn ${gameMode === 'tf-blitz' ? 'selected' : ''}`}
            onClick={() => setGameMode('tf-blitz')}
          >
            <span className="gm-icon">✅</span>
            <span className="gm-name">True or False Blitz</span>
            <span className="gm-desc">Is it true? Is it false? Take turns deciding!</span>
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
          {gameMode === 'tf-blitz' && '✅ True or False Blitz'}
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
        {quitOverlay}
        <div className="two-player-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
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

  // --- PLAYING: True or False Blitz ---
  if (phase === 'playing' && gameMode === 'tf-blitz') {
    const stmt = tfStatements[tfIndex];
    if (!stmt) return null;
    const cp = tfTurn === 1 ? player1 : player2;
    const roundNum = Math.floor(tfIndex / 2) + 1;
    const totalRounds = Math.floor(tfStatements.length / 2);

    return (
      <div className="tf-blitz-playing">
        {quitOverlay}
        <div className="tf-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <div className="tf-turn-info">
            <span>{cp.avatar} {cp.name}'s turn</span>
            <span className="tf-round">Round {roundNum}/{totalRounds}</span>
          </div>
          <div className="tf-scores">
            <span>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span>{p2Score} {player2.avatar}</span>
          </div>
        </div>

        <div className="tf-statement-card">
          <p className="tf-statement">{stmt.text}</p>
        </div>

        {!tfShowResult ? (
          <div className="tf-buttons">
            <button className="tf-btn tf-true" onClick={() => handleTFAnswer(true)}>✅ True</button>
            <button className="tf-btn tf-false" onClick={() => handleTFAnswer(false)}>❌ False</button>
          </div>
        ) : (
          <div className="tf-result-feedback">
            <p className={`tf-verdict ${tfAnswered === stmt.answer ? 'correct' : 'wrong'}`}>
              {tfAnswered === stmt.answer ? '🎉 Correct!' : '😬 Wrong!'}
            </p>
            <p className="tf-explanation">{stmt.explanation}</p>
            <button className="start-btn" onClick={nextTFRound}>
              {tfIndex + 1 >= tfStatements.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- PLAYING: Element Match ---
  if (phase === 'playing' && gameMode === 'element-match') {
    const cp = matchTurn === 1 ? player1 : player2;
    return (
      <div className="element-match-playing">
        {quitOverlay}
        <div className="match-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <span className="match-turn">{cp.avatar} {cp.name}'s turn</span>
          <div className="match-scores">
            <span>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        <div className="match-grid" style={{ gridTemplateColumns: `repeat(4, 1fr)` }}>
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
    const modeLabel = gameMode === 'quiz-battle' ? 'Quiz Battle' : gameMode === 'tf-blitz' ? 'True or False Blitz' : 'Element Match';
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
