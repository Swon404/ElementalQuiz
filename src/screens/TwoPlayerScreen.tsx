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

type GameMode = 'quiz-battle' | 'tf-blitz' | 'element-match' | 'clue-duel' | 'symbol-pick' | 'championship';
type Phase = 'mode-select' | 'setup' | 'playing' | 'result' | 'champ-between' | 'champ-result';

type PlayerConfig = {
  name: string;
  difficulty: Difficulty;
  avatar: string;
};

const AVATARS = ['⚛️', '🧪', '🔬', '💎', '🌟', '🚀', '🔮', '🌈'];

// --- True or False types ---
type TFStatement = { text: string; answer: boolean; explanation: string };

// --- Element Match types ---
type MatchCard = { id: number; text: string; elementNum: number; flipped: boolean; matched: boolean; matchedBy?: 1 | 2 };

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

function generateTFStatements(count: number, pool: number = 36): TFStatement[] {
  const poolElements = shuffleArray(elements.slice(0, pool));
  const statements: TFStatement[] = [];

  for (let i = 0; i < count && i < poolElements.length; i++) {
    const el = poolElements[i];
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

function generateMatchCards(pairCount: number, pool: number = 36): MatchCard[] {
  const picked = shuffleArray(elements.slice(0, pool)).slice(0, pairCount);
  const cards: MatchCard[] = [];
  let id = 0;
  for (const el of picked) {
    cards.push({ id: id++, text: el.symbol, elementNum: el.atomicNumber, flipped: false, matched: false });
    cards.push({ id: id++, text: el.name, elementNum: el.atomicNumber, flipped: false, matched: false });
  }
  return shuffleArray(cards);
}

// --- Element Snap types ---
type SnapRound = {
  clues: string[];        // 5 progressive clues, vague → obvious
  correctName: string;
  choices: string[];       // 8 element names
};

// --- Symbol Pick types ---
type SymbolRound = {
  elementName: string;
  correctSymbol: string;
  choices: string[];
};

/** Pick distractor symbols that look similar to the correct one. */
function pickSimilarSymbols(correctSymbol: string, count: number): string[] {
  const allSymbols = elements.map(e => e.symbol).filter(s => s !== correctSymbol);
  const first = correctSymbol[0]?.toLowerCase() ?? '';
  const len = correctSymbol.length;
  // Score: same first letter +3, same length +2, any shared letter +1
  const scored = allSymbols.map(s => {
    let score = 0;
    if (s[0]?.toLowerCase() === first) score += 3;
    if (s.length === len) score += 2;
    const lower = s.toLowerCase();
    const cLower = correctSymbol.toLowerCase();
    for (const ch of lower) if (cLower.includes(ch)) { score += 1; break; }
    return { s, score, r: Math.random() };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.r - b.r));
  // Take top candidates and then randomize order within the top pool
  const pool = scored.slice(0, Math.max(count * 3, 8)).map(x => x.s);
  const picked: string[] = [];
  const used = new Set<string>();
  for (const s of shuffleArray(pool)) {
    if (!used.has(s)) { used.add(s); picked.push(s); if (picked.length >= count) break; }
  }
  return picked;
}

function generateSymbolRounds(count: number, pool: number = 60): SymbolRound[] {
  const picked = shuffleArray(elements.slice(0, pool)).slice(0, count);
  return picked.map(el => {
    const distractors = pickSimilarSymbols(el.symbol, 4); // 4 distractors + correct = 5 choices
    const choices = shuffleArray([el.symbol, ...distractors]);
    return { elementName: el.name, correctSymbol: el.symbol, choices };
  });
}

function generateSnapRounds(count: number, pool: number = 60): SnapRound[] {
  const poolElements = shuffleArray(elements.slice(0, pool));
  const rounds: SnapRound[] = [];
  for (let i = 0; i < count && i < poolElements.length; i++) {
    const el = poolElements[i];
    const catLabel = CATEGORY_LABELS[el.category] || el.category;

    // Helper: remove the element name from a string so clues don't give it away
    const scrub = (s: string) => s.replace(new RegExp(el.name, 'gi'), '???');

    // 5 clues: vague → obvious
    const clues: string[] = [
      // Clue 1 — very vague (scrub name from fun facts!)
      scrub(el.funFact || `This element is ${catLabel}.`),
      // Clue 2 — category + state hint
      `I'm a ${el.stateAtRoomTemp} at room temperature and I'm ${catLabel}.`,
      // Clue 3 — discovery / era
      el.discoveryYear
        ? `I was discovered in ${el.discoveryCountry} around ${el.discoveryYear}.`
        : `I've been known since ancient times from ${el.discoveryCountry || 'many places'}.`,
      // Clue 4 — narrowing down
      `I'm in period ${el.period}${el.group ? `, group ${el.group}` : ''} and I have ${el.atomicNumber} protons.`,
      // Clue 5 — almost a giveaway
      `My symbol is "${el.symbol}" and my atomic mass is ${el.atomicMass}.`,
    ];

    // 8 choices: correct + 7 distractors from similar elements
    const sameCat = elements.filter(e => e.category === el.category && e.name !== el.name);
    const others = elements.filter(e => e.category !== el.category && e.name !== el.name);
    const distractorPool = shuffleArray([...sameCat.slice(0, 4), ...others]).slice(0, 7);
    const choices = shuffleArray([el.name, ...distractorPool.map(e => e.name)]);

    rounds.push({ clues, correctName: el.name, choices });
  }
  return rounds;
}

// --- Championship config ---
const CHAMP_GAMES: GameMode[] = ['quiz-battle', 'tf-blitz', 'element-match', 'clue-duel', 'symbol-pick'];
const CHAMP_LABELS: Record<string, string> = {
  'quiz-battle': '⚔️ Quiz Battle',
  'tf-blitz': '✅ True or False Blitz',
  'element-match': '🃏 Element Match',
  'clue-duel': '🕵️ Clue Duel',
  'symbol-pick': '🔤 Symbol Pick',
};

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
  const [tfTimer, setTfTimer] = useState(10);
  const tfTimerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Element Match state
  const [matchCards, setMatchCards] = useState<MatchCard[]>([]);
  const [matchTurn, setMatchTurn] = useState(1);
  const [matchFirst, setMatchFirst] = useState<number | null>(null);
  const [matchLocked, setMatchLocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Clue Duel state
  const [snapRounds, setSnapRounds] = useState<SnapRound[]>([]);
  const [snapIndex, setSnapIndex] = useState(0);         // which round (element)
  const [snapClueIdx, setSnapClueIdx] = useState(0);     // how many clues revealed (0-4)
  const [snapTurn, setSnapTurn] = useState<1 | 2>(1);    // whose turn to guess/pass
  const [snapFirstWrongBy, setSnapFirstWrongBy] = useState<1 | 2 | null>(null); // first wrong guesser this round
  const [snapAnswered, setSnapAnswered] = useState<number | null>(null);

  // Symbol Pick state
  const [symbolRounds, setSymbolRounds] = useState<SymbolRound[]>([]);
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [symbolTurn, setSymbolTurn] = useState<1 | 2>(1);
  const [symbolAnswered, setSymbolAnswered] = useState<number | null>(null);

  // Championship state
  const [champStep, setChampStep] = useState(0); // index into CHAMP_GAMES
  const [champScores, setChampScores] = useState<{ p1: number; p2: number }[]>([]);
  const [isChampionship, setIsChampionship] = useState(false);

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

  // Shared pool size for content-neutral games: use the easier player's pool so both can compete
  const sharedPool = () => Math.min(DIFFICULTY_CONFIG[player1.difficulty].elementPool, DIFFICULTY_CONFIG[player2.difficulty].elementPool);

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
        finishCurrentGame();
      } else {
        setCurrentRound(r => r + 1);
        setCurrentPlayer(1);
        setQIndex(i => i + 1);
      }
    }
  }, [currentPlayer, currentRound, rounds]);

  // --- True or False Blitz ---
  const TF_SECONDS = 20;

  const stopTfTimer = useCallback(() => {
    if (tfTimerRef.current) { clearInterval(tfTimerRef.current); tfTimerRef.current = null; }
  }, []);

  const startTfTimer = useCallback(() => {
    stopTfTimer();
    setTfTimer(TF_SECONDS);
    tfTimerRef.current = setInterval(() => {
      setTfTimer(t => t - 1);
    }, 1000);
  }, [stopTfTimer]);

  // Auto-expire when timer hits 0
  useEffect(() => {
    if (tfTimer <= 0 && phase === 'playing' && gameMode === 'tf-blitz' && tfAnswered === null) {
      stopTfTimer();
      playWrong();
      setTfAnswered(null);
      setTfShowResult(true);
    }
  }, [tfTimer, phase, gameMode, tfAnswered, stopTfTimer]);

  // Clean up timer on unmount or phase change
  useEffect(() => {
    return () => stopTfTimer();
  }, [stopTfTimer]);

  const startTFBlitz = useCallback(() => {
    setTfStatements(generateTFStatements(rounds * 2, sharedPool()));
    setTfIndex(0);
    setTfTurn(1);
    setTfAnswered(null);
    setTfShowResult(false);
    resetScores();
    setPhase('playing');
    // Timer starts via effect below
  }, [rounds]);

  // Start timer whenever a new TF round begins
  useEffect(() => {
    if (phase === 'playing' && gameMode === 'tf-blitz' && !tfShowResult) {
      startTfTimer();
    }
    return () => stopTfTimer();
  }, [phase, gameMode, tfIndex, tfShowResult, startTfTimer, stopTfTimer]);

  const handleTFAnswer = (answer: boolean) => {
    if (tfAnswered !== null || (tfTimer <= 0 && tfShowResult)) return;
    stopTfTimer();
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
      finishCurrentGame();
    } else {
      setTfIndex(nextIdx);
      setTfTurn(tfTurn === 1 ? 2 : 1);
      setTfAnswered(null);
      setTfShowResult(false);
    }
  };

  // --- Element Match ---
  const startElementMatch = useCallback(() => {
    setMatchCards(generateMatchCards(rounds, sharedPool()));
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
          c.elementNum === first.elementNum ? { ...c, matched: true, matchedBy: matchTurn as 1 | 2 } : c
        );
        setMatchCards(matched);
        if (matchTurn === 1) setP1Score(s => s + 1);
        else setP2Score(s => s + 1);
        setMatchFirst(null);
        setMatchLocked(false);

        if (matched.every(c => c.matched)) {
          setTimeout(() => finishCurrentGame(), 600);
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

  // --- Clue Duel ---
  const startElementSnap = useCallback(() => {
    setSnapRounds(generateSnapRounds(rounds, sharedPool()));
    setSnapIndex(0);
    setSnapClueIdx(0);
    setSnapTurn(1);
    setSnapFirstWrongBy(null);
    setSnapAnswered(null);
    if (!isChampionship) resetScores();
    setPhase('playing');
  }, [rounds, isChampionship]);

  const handleClueNext = () => {
    if (snapAnswered !== null) return;
    if (snapFirstWrongBy !== null) {
      // Second player declining their bonus chance — move on
      nextSnapRound();
      return;
    }
    if (snapClueIdx < 4) {
      setSnapClueIdx(c => c + 1);
      setSnapTurn(t => (t === 1 ? 2 : 1));
    } else {
      // All clues visible, passing — end round with no score change
      nextSnapRound();
    }
  };

  const handleSnapAnswer = (idx: number) => {
    if (snapAnswered !== null) return;
    const round = snapRounds[snapIndex];
    const correct = round.choices[idx] === round.correctName;
    const active = snapTurn;
    if (correct) {
      playCorrect();
      if (active === 1) setP1Score(s => s + 1);
      else setP2Score(s => s + 1);
      setSnapAnswered(idx);
    } else {
      playWrong();
      // -1 point to active player (negative scores allowed)
      if (active === 1) setP1Score(s => s - 1);
      else setP2Score(s => s - 1);
      if (snapFirstWrongBy === null) {
        // Give opponent one chance with all clues revealed
        setSnapFirstWrongBy(active);
        setSnapClueIdx(4);
        setSnapTurn(active === 1 ? 2 : 1);
      } else {
        // Both wrong — end round
        setSnapAnswered(idx);
      }
    }
  };

  const nextSnapRound = () => {
    const nextIdx = snapIndex + 1;
    if (nextIdx >= snapRounds.length) {
      finishCurrentGame();
    } else {
      setSnapIndex(nextIdx);
      setSnapClueIdx(0);
      setSnapTurn(nextIdx % 2 === 0 ? 1 : 2); // alternate starting player
      setSnapFirstWrongBy(null);
      setSnapAnswered(null);
    }
  };

  // --- Symbol Pick ---
  const startSymbolPick = useCallback(() => {
    setSymbolRounds(generateSymbolRounds(rounds * 2, sharedPool()));
    setSymbolIndex(0);
    setSymbolTurn(1);
    setSymbolAnswered(null);
    if (!isChampionship) resetScores();
    setPhase('playing');
  }, [rounds, isChampionship]);

  const handleSymbolAnswer = (idx: number) => {
    if (symbolAnswered !== null) return;
    const round = symbolRounds[symbolIndex];
    const correct = round.choices[idx] === round.correctSymbol;
    setSymbolAnswered(idx);
    if (correct) {
      playCorrect();
      if (symbolTurn === 1) setP1Score(s => s + 1);
      else setP2Score(s => s + 1);
    } else {
      playWrong();
    }
  };

  const nextSymbolRound = () => {
    const nextIdx = symbolIndex + 1;
    if (nextIdx >= symbolRounds.length) {
      finishCurrentGame();
    } else {
      setSymbolIndex(nextIdx);
      setSymbolTurn(t => (t === 1 ? 2 : 1));
      setSymbolAnswered(null);
    }
  };

  // --- Championship orchestration ---
  const startChampionship = useCallback(() => {
    setIsChampionship(true);
    setChampStep(0);
    setChampScores([]);
    setP1Score(0);
    setP2Score(0);
    const firstGame = CHAMP_GAMES[0];
    setGameMode(firstGame);
    // Start first sub-game with fixed rounds
    launchSubGame(firstGame);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1.difficulty, player2.difficulty]);

  const launchSubGame = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setP1Score(0);
    setP2Score(0);
    if (mode === 'quiz-battle') {
      setP1Questions(generateQuiz(player1.difficulty, 3));
      setP2Questions(generateQuiz(player2.difficulty, 3));
      setCurrentPlayer(1);
      setCurrentRound(1);
      setQIndex(0);
      setP1Streak(0);
      setP2Streak(0);
      setShowPassDevice(false);
      setRounds(3);
      setPhase('playing');
    } else if (mode === 'tf-blitz') {
      setTfStatements(generateTFStatements(6, sharedPool()));
      setTfIndex(0);
      setTfTurn(1);
      setTfAnswered(null);
      setTfShowResult(false);
      setRounds(3);
      setPhase('playing');
    } else if (mode === 'element-match') {
      setMatchCards(generateMatchCards(4, sharedPool()));
      setMatchTurn(1);
      setMatchFirst(null);
      setMatchLocked(false);
      setRounds(4);
      setPhase('playing');
    } else if (mode === 'clue-duel') {
      setSnapRounds(generateSnapRounds(5, sharedPool()));
      setSnapIndex(0);
      setSnapClueIdx(0);
      setSnapTurn(1);
      setSnapFirstWrongBy(null);
      setSnapAnswered(null);
      setRounds(5);
      setPhase('playing');
    } else if (mode === 'symbol-pick') {
      setSymbolRounds(generateSymbolRounds(5, sharedPool()));
      setSymbolIndex(0);
      setSymbolTurn(1);
      setSymbolAnswered(null);
      setRounds(5);
      setPhase('playing');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1.difficulty, player2.difficulty]);

  const finishCurrentGame = () => {
    if (isChampionship) {
      // Save this game's scores and show interstitial
      setChampScores(prev => [...prev, { p1: p1Score, p2: p2Score }]);
      if (champStep + 1 >= CHAMP_GAMES.length) {
        setPhase('champ-result');
      } else {
        setPhase('champ-between');
      }
    } else {
      setPhase('result');
    }
  };

  const nextChampGame = () => {
    const next = champStep + 1;
    setChampStep(next);
    launchSubGame(CHAMP_GAMES[next]);
  };

  const startGame = () => {
    setIsChampionship(false);
    if (gameMode === 'quiz-battle') startQuizBattle();
    else if (gameMode === 'tf-blitz') startTFBlitz();
    else if (gameMode === 'element-match') startElementMatch();
    else if (gameMode === 'clue-duel') startElementSnap();
    else if (gameMode === 'symbol-pick') startSymbolPick();
    else if (gameMode === 'championship') startChampionship();
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
          <button
            className={`game-mode-btn ${gameMode === 'clue-duel' ? 'selected' : ''}`}
            onClick={() => setGameMode('clue-duel')}
          >
            <span className="gm-icon">🕵️</span>
            <span className="gm-name">Clue Duel</span>
            <span className="gm-desc">Take turns — guess the element from a clue, or pass!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'symbol-pick' ? 'selected' : ''}`}
            onClick={() => setGameMode('symbol-pick')}
          >
            <span className="gm-icon">🔤</span>
            <span className="gm-name">Symbol Pick</span>
            <span className="gm-desc">Pick the correct symbol from look-alikes!</span>
          </button>
          <button
            className={`game-mode-btn championship ${gameMode === 'championship' ? 'selected' : ''}`}
            onClick={() => setGameMode('championship')}
          >
            <span className="gm-icon">🏆</span>
            <span className="gm-name">Championship</span>
            <span className="gm-desc">Play all 4 games — running score decides the champion!</span>
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
          {gameMode === 'clue-duel' && '🕵️ Clue Duel'}
          {gameMode === 'symbol-pick' && '🔤 Symbol Pick'}
          {gameMode === 'championship' && '🏆 Championship'}
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
              {(
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

        {gameMode !== 'championship' && (
          <div className="rounds-select">
            <label>{gameMode === 'element-match' ? 'Pairs: ' : 'Rounds: '}</label>
            {(gameMode === 'element-match' ? [8, 12, 16] : gameMode === 'clue-duel' ? [3, 5, 8] : [3, 5, 10]).map(r => (
              <button
                key={r}
                className={`round-btn ${rounds === r ? 'selected' : ''}`}
                onClick={() => setRounds(r)}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        {gameMode === 'championship' && (
          <p className="champ-info">All 5 games in sequence: Quiz Battle (3), T/F Blitz (3), Element Match (4 pairs), Clue Duel (5), Symbol Pick (5). Running score decides the champion!</p>
        )}

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
          {!tfShowResult && (
            <div className="tf-timer-bar">
              <div className={`tf-timer-fill ${tfTimer <= 3 ? 'urgent' : ''}`} style={{ width: `${(tfTimer / TF_SECONDS) * 100}%` }} />
            </div>
          )}
          {!tfShowResult && <span className={`tf-timer-num ${tfTimer <= 3 ? 'urgent' : ''}`}>{tfTimer}s</span>}
        </div>

        {!tfShowResult ? (
          <div className="tf-buttons">
            <button className="tf-btn tf-true" onClick={() => handleTFAnswer(true)}>✅ True</button>
            <button className="tf-btn tf-false" onClick={() => handleTFAnswer(false)}>❌ False</button>
          </div>
        ) : (
          <div className="tf-result-feedback">
            <p className={`tf-verdict ${tfAnswered !== null && tfAnswered === stmt.answer ? 'correct' : 'wrong'}`}>
              {tfAnswered === null ? '⏰ Time\'s up!' : tfAnswered === stmt.answer ? '🎉 Correct!' : '😬 Wrong!'}
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
          {matchCards.map(card => {
            const matchClass = card.matched
              ? card.matchedBy === 1 ? 'matched matched-p1' : 'matched matched-p2'
              : '';
            return (
              <button
                key={card.id}
                className={`match-card ${card.flipped || card.matched ? 'flipped' : ''} ${matchClass}`}
                onClick={() => handleMatchFlip(card.id)}
                disabled={card.matched || card.flipped}
              >
                <span className="match-card-inner">
                  {(card.flipped || card.matched)
                    ? <>{card.matched && <span className="match-owner">{card.matchedBy === 1 ? player1.avatar : player2.avatar}</span>}{card.text}</>
                    : '?'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- PLAYING: Clue Duel ---
  if (phase === 'playing' && gameMode === 'clue-duel' && snapRounds.length > 0) {
    const round = snapRounds[snapIndex];
    const visibleClues = round.clues.slice(0, snapClueIdx + 1);
    const activePlayer = snapTurn === 1 ? player1 : player2;
    const otherPlayer = snapTurn === 1 ? player2 : player1;
    const isCorrect = snapAnswered !== null && round.choices[snapAnswered] === round.correctName;

    return (
      <div className="snap-playing">
        {quitOverlay}
        <div className="snap-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <span className="snap-round">Element {snapIndex + 1}/{snapRounds.length}</span>
          <div className="snap-scores">
            <span>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span>{p2Score} {player2.avatar}</span>
          </div>
        </div>

        {snapAnswered === null && (
          <p className="snap-buzzer-name">
            {snapFirstWrongBy !== null
              ? `${activePlayer.avatar} ${activePlayer.name} — bonus chance! All clues revealed.`
              : `${activePlayer.avatar} ${activePlayer.name}'s turn — guess or pass!`}
          </p>
        )}

        <div className="snap-clues-list">
          {visibleClues.map((clue, i) => (
            <div key={i} className={`snap-clue-item ${i === visibleClues.length - 1 ? 'snap-clue-new' : ''}`}>
              <span className="snap-clue-num">Clue {i + 1}</span>
              <span className="snap-clue-text">{clue}</span>
            </div>
          ))}
          {snapClueIdx < 4 && snapAnswered === null && snapFirstWrongBy === null && (
            <div className="snap-clue-item snap-clue-pending">
              <span className="snap-clue-num">Clue {snapClueIdx + 2}</span>
              <span className="snap-clue-text">Tap Next to reveal (passes turn)</span>
            </div>
          )}
        </div>

        {snapAnswered === null && (
          <>
            <div className="snap-choices">
              {round.choices.map((ch, i) => (
                <button
                  key={i}
                  className="snap-choice"
                  onClick={() => handleSnapAnswer(i)}
                >{ch}</button>
              ))}
            </div>
            <button className="start-btn" onClick={handleClueNext}>
              {snapFirstWrongBy !== null
                ? 'Skip bonus — next element →'
                : snapClueIdx < 4
                  ? `Next clue (pass to ${otherPlayer.avatar} ${otherPlayer.name})`
                  : 'Skip element →'}
            </button>
          </>
        )}

        {snapAnswered !== null && (
          <div className="snap-result-feedback">
            {isCorrect ? (
              <p className="snap-verdict correct">🎉 Correct! +1 to {activePlayer.avatar} {activePlayer.name}!</p>
            ) : (
              <p className="snap-verdict wrong">😬 Wrong! It was <strong>{round.correctName}</strong>. −1 from {activePlayer.avatar} {activePlayer.name}.</p>
            )}
            <button className="start-btn" onClick={nextSnapRound}>
              {snapIndex + 1 >= snapRounds.length ? 'See Results' : 'Next Element →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- PLAYING: Symbol Pick ---
  if (phase === 'playing' && gameMode === 'symbol-pick' && symbolRounds.length > 0) {
    const round = symbolRounds[symbolIndex];
    const cp = symbolTurn === 1 ? player1 : player2;
    const isCorrect = symbolAnswered !== null && round.choices[symbolAnswered] === round.correctSymbol;
    return (
      <div className="snap-playing">
        {quitOverlay}
        <div className="snap-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <span className="snap-round">{symbolIndex + 1}/{symbolRounds.length}</span>
          <div className="snap-scores">
            <span>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        <p className="snap-buzzer-name">{cp.avatar} {cp.name} — pick the symbol for:</p>
        <h2 style={{ textAlign: 'center', margin: '0.5rem 0 1rem', fontSize: '1.8rem' }}>{round.elementName}</h2>
        <div className="snap-choices">
          {round.choices.map((ch, i) => {
            const answered = symbolAnswered !== null;
            const isChosen = symbolAnswered === i;
            const isRight = ch === round.correctSymbol;
            const cls = !answered ? 'snap-choice'
              : isRight ? 'snap-choice correct'
              : isChosen ? 'snap-choice wrong'
              : 'snap-choice snap-choice-locked';
            return (
              <button
                key={i}
                className={cls}
                disabled={answered}
                onClick={() => handleSymbolAnswer(i)}
                style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '1px' }}
              >{ch}</button>
            );
          })}
        </div>
        {symbolAnswered !== null && (
          <div className="snap-result-feedback">
            {isCorrect
              ? <p className="snap-verdict correct">🎉 Correct! +1 to {cp.avatar} {cp.name}!</p>
              : <p className="snap-verdict wrong">😬 Nope! {round.elementName} = <strong>{round.correctSymbol}</strong></p>}
            <button className="start-btn" onClick={nextSymbolRound}>
              {symbolIndex + 1 >= symbolRounds.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- CHAMPIONSHIP: Between-games interstitial ---
  if (phase === 'champ-between') {
    const justFinished = CHAMP_GAMES[champStep];
    const nextGame = CHAMP_GAMES[champStep + 1];
    const allScores = [...champScores, { p1: p1Score, p2: p2Score }];
    const totalP1 = allScores.reduce((s, g) => s + g.p1, 0);
    const totalP2 = allScores.reduce((s, g) => s + g.p2, 0);
    const justWinner = p1Score > p2Score ? player1 : p2Score > p1Score ? player2 : null;
    return (
      <div className="champ-between">
        <div className="champ-between-header">
          <h2>🏆 Championship — Game {champStep + 1} of {CHAMP_GAMES.length}</h2>
        </div>
        <div className="champ-game-result">
          <h3>{CHAMP_LABELS[justFinished]} Complete!</h3>
          <p>{justWinner ? `${justWinner.avatar} ${justWinner.name} wins!` : "It's a draw! 🤝"}</p>
          <div className="battle-scores">
            <div className={`battle-player ${p1Score >= p2Score ? 'winner' : ''}`}>
              <span className="bp-avatar">{player1.avatar}</span>
              <span className="bp-name">{player1.name}</span>
              <span className="bp-score">{p1Score}</span>
            </div>
            <div className="vs-divider">VS</div>
            <div className={`battle-player ${p2Score >= p1Score ? 'winner' : ''}`}>
              <span className="bp-avatar">{player2.avatar}</span>
              <span className="bp-name">{player2.name}</span>
              <span className="bp-score">{p2Score}</span>
            </div>
          </div>
        </div>

        <div className="champ-running-total">
          <h3>Running Total</h3>
          <div className="champ-total-row">
            <span>{player1.avatar} {player1.name}: <strong>{totalP1}</strong></span>
            <span>{player2.avatar} {player2.name}: <strong>{totalP2}</strong></span>
          </div>
        </div>

        <button className="start-btn" onClick={nextChampGame}>
          Next: {CHAMP_LABELS[nextGame]} →
        </button>
      </div>
    );
  }

  // --- CHAMPIONSHIP: Final result ---
  if (phase === 'champ-result') {
    const allScores = [...champScores, { p1: p1Score, p2: p2Score }];
    const totalP1 = allScores.reduce((s, g) => s + g.p1, 0);
    const totalP2 = allScores.reduce((s, g) => s + g.p2, 0);
    const champWinner = totalP1 > totalP2 ? player1 : totalP2 > totalP1 ? player2 : null;
    return (
      <div className="champ-result">
        <Elementor
          expression="celebrate"
          message={champWinner ? `${champWinner.avatar} ${champWinner.name} is the Element Champion!` : "It's a draw! You're both champions! 🤝"}
        />
        <h2>🏆 Championship Results</h2>

        <div className="champ-breakdown">
          <table className="champ-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>{player1.avatar} {player1.name}</th>
                <th>{player2.avatar} {player2.name}</th>
              </tr>
            </thead>
            <tbody>
              {CHAMP_GAMES.map((g, i) => (
                <tr key={g} className={allScores[i]?.p1 > allScores[i]?.p2 ? 'p1-won' : allScores[i]?.p2 > allScores[i]?.p1 ? 'p2-won' : ''}>
                  <td>{CHAMP_LABELS[g]}</td>
                  <td>{allScores[i]?.p1 ?? '-'}</td>
                  <td>{allScores[i]?.p2 ?? '-'}</td>
                </tr>
              ))}
              <tr className="champ-total-row">
                <td><strong>Total</strong></td>
                <td><strong>{totalP1}</strong></td>
                <td><strong>{totalP2}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="result-actions">
          <button className="start-btn" onClick={() => { setIsChampionship(false); startChampionship(); }}>Play Again!</button>
          <button className="back-btn" onClick={() => { setIsChampionship(false); setPhase('mode-select'); }}>Change Game</button>
          <button className="back-btn" onClick={onComplete}>Home</button>
        </div>
      </div>
    );
  }

  // --- RESULT ---
  if (phase === 'result') {
    const winner = p1Score > p2Score ? player1 : p2Score > p1Score ? player2 : null;
    const modeLabel = gameMode === 'quiz-battle' ? 'Quiz Battle' : gameMode === 'tf-blitz' ? 'True or False Blitz' : gameMode === 'clue-duel' ? 'Clue Duel' : gameMode === 'symbol-pick' ? 'Symbol Pick' : 'Element Match';
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
