import { useState, useCallback, useEffect, useRef } from 'react';
import QuizCard from '../components/QuizCard.tsx';
import Elementor from '../components/Elementor.tsx';
import { generateQuizBattleQuiz, pickRelatableTrivia, type Question } from '../engine/questionGenerator.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import { elements } from '../data/elements.ts';
import { loadTwoPlayerNames, loadTwoPlayerSettings, saveTwoPlayerNames, saveTwoPlayerSettings } from '../engine/storage.ts';
import { playCorrect, playWrong } from '../engine/sounds.ts';
import { speakText } from '../engine/tts.ts';
import { generateAtomQuestions, type AtomQuestion } from './AtomQuizScreen.tsx';

interface TwoPlayerScreenProps {
  onComplete: () => void;
  onBack: () => void;
  initialMode?: 'championship';
}

type GameMode = 'quiz-battle' | 'tf-blitz' | 'element-match' | 'clue-duel' | 'symbol-pick' | 'atom-quiz' | 'atomic-order' | 'championship';
type Phase = 'mode-select' | 'setup' | 'playing' | 'result' | 'champ-between' | 'champ-result';

type PlayerConfig = {
  name: string;
  difficulty: Difficulty;
  avatar: string;
};

type Player2Mode = 'human' | 'bot';

const AVATARS = ['⚛️', '🧪', '🔬', '💎', '🌟', '🚀', '🔮', '🌈'];

const BOT_DELAY_MS = 2000;
const BOT_RESULT_DELAY_MS = 1800;
const BOT_ACCURACY: Record<Difficulty, number> = {
  explorer: 0.6,
  scientist: 0.75,
  professor: 0.88,
};
const BOT_MATCH_ACCURACY: Record<Difficulty, number> = {
  explorer: 0.45,
  scientist: 0.72,
  professor: 0.93,
};

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
    const type = Math.floor(Math.random() * 17);
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
    } else if (type === 5) {
      // Discovery
      if (isTrue && el.discoveredBy) {
        statements.push({ text: `${el.name} was discovered by ${el.discoveredBy}.`, answer: true, explanation: `Yes! ${el.discoveredBy} discovered ${el.name}.` });
      } else {
        const wrongDiscoverer = shuffleArray(elements.filter(e => e.discoveredBy && e.discoveredBy !== el.discoveredBy))[0];
        statements.push({ text: `${el.name} was discovered by ${wrongDiscoverer?.discoveredBy || 'Unknown'}.`, answer: false, explanation: `No, ${el.name} was discovered by ${el.discoveredBy || 'ancient peoples'}.` });
      }
    } else if (type === 6) {
      // Period number
      if (isTrue) {
        statements.push({ text: `${el.name} is in period ${el.period} of the periodic table.`, answer: true, explanation: `Yes! ${el.name} is in period ${el.period}.` });
      } else {
        const wrongPeriod = el.period <= 4 ? el.period + 2 : el.period - 2;
        statements.push({ text: `${el.name} is in period ${wrongPeriod} of the periodic table.`, answer: false, explanation: `No — ${el.name} is in period ${el.period}, not period ${wrongPeriod}.` });
      }
    } else if (type === 7) {
      // Same group as another element
      if (el.group !== null) {
        const sameGroup = elements.filter(e => e.group === el.group && e.name !== el.name);
        const diffGroup = elements.filter(e => e.group !== null && e.group !== el.group && e.name !== el.name);
        if (sameGroup.length > 0 && diffGroup.length > 0) {
          if (isTrue) {
            const other = shuffleArray(sameGroup)[0];
            statements.push({ text: `${el.name} and ${other.name} are in the same group.`, answer: true, explanation: `Yes! Both are in group ${el.group}.` });
          } else {
            const other = shuffleArray(diffGroup)[0];
            statements.push({ text: `${el.name} and ${other.name} are in the same group.`, answer: false, explanation: `No — ${el.name} is in group ${el.group}, but ${other.name} is in group ${other.group}.` });
          }
        } else {
          statements.push({ text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
        }
      } else {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct — ${el.name} is a ${el.stateAtRoomTemp}.` });
      }
    } else if (type === 8) {
      // Uses fact
      if (el.uses && el.uses.length > 0) {
        const use = el.uses[Math.floor(Math.random() * el.uses.length)];
        if (isTrue) {
          statements.push({ text: `${el.name} is used for: ${use}.`, answer: true, explanation: `Correct! ${el.name} really is used for ${use}.` });
        } else {
          const otherEl = shuffleArray(elements.filter(e => e.uses && e.uses.length > 0 && e.name !== el.name))[0];
          const wrongUse = otherEl.uses[Math.floor(Math.random() * otherEl.uses.length)];
          statements.push({ text: `${el.name} is used for: ${wrongUse}.`, answer: false, explanation: `No — that's a use for ${otherEl.name}. ${el.name} is used for ${use}.` });
        }
      } else {
        // fallback to symbol
        statements.push({ text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
      }
    } else if (type === 9) {
      // Atomic mass comparison
      const other = shuffleArray(elements.filter(e => Math.abs(e.atomicMass - el.atomicMass) > 2 && e.name !== el.name))[0] ||
                    shuffleArray(elements.filter(e => e.name !== el.name))[0];
      const heavier = el.atomicMass > other.atomicMass;
      if (isTrue === heavier) {
        statements.push({ text: `${el.name} has a higher atomic mass than ${other.name}.`, answer: heavier, explanation: `${el.name}'s atomic mass is ${el.atomicMass} and ${other.name}'s is ${other.atomicMass}.` });
      } else {
        statements.push({ text: `${el.name} has a lower atomic mass than ${other.name}.`, answer: !heavier, explanation: `${el.name}'s atomic mass is ${el.atomicMass} and ${other.name}'s is ${other.atomicMass}.` });
      }
    } else if (type === 10) {
      // Compound fact
      if (el.compounds.length > 0) {
        const compound = el.compounds[Math.floor(Math.random() * el.compounds.length)];
        if (isTrue) {
          statements.push({ text: `${compound} is a compound that contains ${el.name}.`, answer: true, explanation: `Correct! ${compound} is listed as one of ${el.name}'s compounds.` });
        } else {
          const otherEl = shuffleArray(elements.filter(e => e.compounds.length > 0 && e.name !== el.name))[0];
          const wrongCompound = otherEl.compounds[Math.floor(Math.random() * otherEl.compounds.length)];
          statements.push({ text: `${wrongCompound} is a compound that contains ${el.name}.`, answer: false, explanation: `No — ${wrongCompound} is connected with ${otherEl.name}. One ${el.name} compound is ${compound}.` });
        }
      } else {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct — ${el.name} is a ${el.stateAtRoomTemp}.` });
      }
    } else if (type === 11) {
      // Obtained-from/source fact
      if (isTrue) {
        statements.push({ text: `${el.name} is obtained from: ${el.obtainedFrom}.`, answer: true, explanation: `Yes! ${el.name} is usually obtained from ${el.obtainedFrom}.` });
      } else {
        const otherEl = shuffleArray(elements.filter(e => e.obtainedFrom && e.name !== el.name))[0];
        statements.push({ text: `${el.name} is obtained from: ${otherEl.obtainedFrom}.`, answer: false, explanation: `No — that describes ${otherEl.name}. ${el.name} is obtained from ${el.obtainedFrom}.` });
      }
    } else if (type === 12) {
      // Stable isotope count
      if (el.radioactive) {
        statements.push({ text: `${el.name} is radioactive.`, answer: true, explanation: `Correct! ${el.name}'s most stable isotope has a half-life of ${el.halfLife}.` });
      } else if (isTrue) {
        statements.push({ text: `${el.name} has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}.`, answer: true, explanation: `Yes! ${el.name} has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}.` });
      } else {
        const wrongCount = Math.max(1, el.stableIsotopes + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1));
        statements.push({ text: `${el.name} has ${wrongCount} stable isotope${wrongCount === 1 ? '' : 's'}.`, answer: false, explanation: `No — ${el.name} has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}.` });
      }
    } else if (type === 13) {
      // Periodic-table block
      if (isTrue) {
        statements.push({ text: `${el.name} is in the ${el.block}-block of the periodic table.`, answer: true, explanation: `Correct! ${el.name}'s electron configuration places it in the ${el.block}-block.` });
      } else {
        const wrongBlock = shuffleArray(['s', 'p', 'd', 'f'].filter(b => b !== el.block))[0];
        statements.push({ text: `${el.name} is in the ${wrongBlock}-block of the periodic table.`, answer: false, explanation: `No — ${el.name} is in the ${el.block}-block.` });
      }
    } else if (type === 14) {
      // Real-life trivia clue
      const trivia = pickRelatableTrivia(el);
      if (trivia && isTrue) {
        statements.push({ text: `${el.name} is the answer to this clue: ${trivia.question}`, answer: true, explanation: trivia.explanation });
      } else {
        const otherEl = shuffleArray(elements.filter(e => e.atomicNumber !== el.atomicNumber && pickRelatableTrivia(e)))[0];
        const otherTrivia = otherEl ? pickRelatableTrivia(otherEl) : null;
        if (otherEl && otherTrivia) {
          statements.push({ text: `${el.name} is the answer to this clue: ${otherTrivia.question}`, answer: false, explanation: `No, that clue points to ${otherEl.name}. ${otherTrivia.explanation}` });
        } else {
          statements.push({ text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
        }
      }
    } else if (type === 15) {
      // Everyday use fact
      const use = el.uses.length > 0 ? el.uses[Math.floor(Math.random() * el.uses.length)] : null;
      const otherEl = shuffleArray(elements.filter(e => e.atomicNumber !== el.atomicNumber && e.uses.length > 0))[0];
      const wrongUse = otherEl ? otherEl.uses[Math.floor(Math.random() * otherEl.uses.length)] : null;
      if (use && isTrue) {
        statements.push({ text: `A real-world use of ${el.name} is ${use}.`, answer: true, explanation: `Correct! ${el.name} is used for ${use}.` });
      } else if (wrongUse && otherEl) {
        statements.push({ text: `A real-world use of ${el.name} is ${wrongUse}.`, answer: false, explanation: `No, that use fits ${otherEl.name}. ${use ? `One use of ${el.name} is ${use}.` : `${el.name} has different uses.`}` });
      } else {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct â€” ${el.name} is a ${el.stateAtRoomTemp}.` });
      }
    } else {
      // Body, food, space, and technology trivia
      const trivia = pickRelatableTrivia(el);
      if (trivia) {
        statements.push({ text: `This clue belongs to ${el.name}: ${trivia.question}`, answer: true, explanation: trivia.explanation });
      } else {
        statements.push({ text: `${el.name} has atomic number ${el.atomicNumber}.`, answer: true, explanation: `Correct! Atomic number means proton count, so ${el.name} has ${el.atomicNumber} protons.` });
      }
    }
  }
  return statements;
}

function generateMatchCards(pairCount: number, pool: number = 118, exotic: boolean = false, requiredElementNum?: number | null): MatchCard[] {
  const source = exotic ? elements.filter(e => e.atomicNumber >= 84) : elements.slice(0, pool);
  const required = requiredElementNum ? elements.find(e => e.atomicNumber === requiredElementNum) : null;
  const picked = required
    ? [required, ...shuffleArray(source.filter(e => e.atomicNumber !== required.atomicNumber)).slice(0, pairCount - 1)]
    : shuffleArray(source).slice(0, pairCount);
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

// --- Atomic Order types ---
type AtomicOrderRound = { p1: number[]; p2: number[] };
type AtomicOrderFeedback = 'correct' | 'left' | 'right';
type AtomicOrderResult = { solved: boolean; attempts: number; elapsedMs: number };
const ATOMIC_ORDER_TILE_COUNTS: Record<Difficulty, number> = { explorer: 3, scientist: 4, professor: 5 };

function shuffledAtomicNumbers(pool: number, count: number): number[] {
  const picked = shuffleArray(elements.slice(0, pool)).slice(0, count).map(el => el.atomicNumber);
  const sorted = [...picked].sort((a, b) => a - b);
  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = shuffleArray(sorted);
    if (shuffled.every((value, index) => value !== sorted[index])) return shuffled;
  }
  // A one-place rotation is a guaranteed fallback derangement.
  return [...sorted.slice(1), sorted[0]];
}

function generateAtomicOrderRounds(count: number, p1Difficulty: Difficulty, p2Difficulty: Difficulty): AtomicOrderRound[] {
  return Array.from({ length: count }, () => ({
    p1: shuffledAtomicNumbers(DIFFICULTY_CONFIG[p1Difficulty].elementPool, ATOMIC_ORDER_TILE_COUNTS[p1Difficulty]),
    p2: shuffledAtomicNumbers(DIFFICULTY_CONFIG[p2Difficulty].elementPool, ATOMIC_ORDER_TILE_COUNTS[p2Difficulty]),
  }));
}

/** Pick distractor symbols that look very similar to the correct one.
 *  Prioritises same-first-letter, same-length, real-symbol, and name-letter look-alikes.
 */
function pickSimilarSymbols(correctSymbol: string, elementName: string, count: number): string[] {
  const firstU = correctSymbol[0].toUpperCase();
  const firstL = firstU.toLowerCase();
  const correctLower = correctSymbol.toLowerCase();
  const nameLetters: string[] = [];
  const nameSeen = new Set<string>();
  for (const ch of elementName.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z' && ch !== firstL && !nameSeen.has(ch)) {
      nameSeen.add(ch);
      nameLetters.push(ch);
    }
  }
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(c => c !== firstL);
  const realSymbols = elements.map(e => e.symbol);

  const candidates = new Set<string>();

  // Real symbols that start the same are the hardest distractors.
  for (const s of realSymbols) {
    if (s !== correctSymbol && s[0] === firstU) candidates.add(s);
  }

  // Plausible fake symbols made from the element name.
  for (const l of nameLetters) candidates.add(firstU + l);
  for (const l of shuffleArray(alphabet)) candidates.add(firstU + l);

  // One-letter symbols are especially tricky when mixed with real same-first two-letter symbols.
  if (correctSymbol.length === 1) {
    for (const s of realSymbols) {
      if (s.length === 2 && s[0] === firstU && s !== correctSymbol) candidates.add(s);
    }
  }

  // Nearby alphabet second letters create slips like Ca/Cb/Cd/Ce.
  if (correctSymbol.length === 2) {
    const secondCode = correctSymbol[1].toLowerCase().charCodeAt(0);
    for (let offset = -3; offset <= 3; offset++) {
      const code = secondCode + offset;
      if (code >= 97 && code <= 122 && code !== secondCode) {
        candidates.add(firstU + String.fromCharCode(code));
      }
    }
  }

  candidates.delete(correctSymbol);

  const scored = Array.from(candidates).map(s => {
    let score = 0;
    if (s[0] === firstU) score += 10;
    if (realSymbols.includes(s)) score += 5;
    if (s.length === correctSymbol.length) score += 4;
    if (s.length === 2 && nameLetters.includes(s[1]?.toLowerCase() ?? '')) score += 4;
    const cSet = new Set(correctSymbol.toLowerCase());
    for (const ch of s.toLowerCase()) if (cSet.has(ch)) score += 1;
    let samePositions = 0;
    for (let i = 0; i < Math.min(s.length, correctSymbol.length); i++) {
      if (s[i].toLowerCase() === correctLower[i]) samePositions++;
    }
    score += samePositions * 3;
    return { s, score, r: Math.random() };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.r - b.r));

  const picked: string[] = [];
  const used = new Set<string>();
  for (const { s } of scored) {
    if (!used.has(s) && s !== correctSymbol) {
      used.add(s);
      picked.push(s);
      if (picked.length >= count) break;
    }
  }

  // Last-resort fill still favours real symbols before random fakes.
  for (const s of shuffleArray(realSymbols)) {
    if (picked.length >= count) break;
    if (!used.has(s) && s !== correctSymbol) {
      used.add(s);
      picked.push(s);
    }
  }

  return picked.slice(0, count);
}

function generateSymbolRounds(count: number, pool: number = 118): SymbolRound[] {
  const picked = shuffleArray(elements.slice(0, pool)).slice(0, count);
  return picked.map(el => {
    const distractors = pickSimilarSymbols(el.symbol, el.name, 9); // 9 distractors + correct = 10 choices
    const choices = shuffleArray([el.symbol, ...distractors]);
    return { elementName: el.name, correctSymbol: el.symbol, choices };
  });
}

function generateSnapRounds(count: number, pool: number = 118): SnapRound[] {
  const poolElements = shuffleArray(elements.slice(0, pool));
  const rounds: SnapRound[] = [];
  for (let i = 0; i < count && i < poolElements.length; i++) {
    const el = poolElements[i];
    const catLabel = CATEGORY_LABELS[el.category] || el.category;

    // Helper: remove the element name from a string so clues don't give it away
    const scrub = (s: string) => {
      const esc = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Remove exact element name
      let result = s.replace(new RegExp(esc(el.name), 'gi'), '???');
      // Remove exact symbol as a standalone token
      result = result.replace(new RegExp(`\\b${esc(el.symbol)}\\b`, 'g'), '??');
      // Also scrub words derived from the element name (e.g. "California" for "Californium")
      if (el.name.length >= 7) {
        const prefixLen = Math.max(5, Math.floor(el.name.length * 0.65));
        const prefix = esc(el.name.slice(0, prefixLen));
        result = result.replace(new RegExp(`\\b${prefix}\\w*`, 'gi'), '???');
      }
      return result;
    };

    // 5 clues: vague → obvious
    const relatable = pickRelatableTrivia(el);
    const factPool = shuffleArray([el.funFact, ...(el.additionalFacts ?? []), relatable?.explanation].filter((fact): fact is string => Boolean(fact)));
    const earlyClues = shuffleArray([
      relatable ? `Real-life clue: ${scrub(relatable.question)}` : null,
      factPool[1] ? scrub(factPool[1]) : null,
      el.obtainedFrom ? `I can be obtained from: ${scrub(el.obtainedFrom)}.` : null,
      el.compounds.length > 0 ? `One compound connected with me is ${scrub(el.compounds[0])}.` : null,
      el.uses.length > 0 ? `People use me for: ${scrub(el.uses[Math.floor(Math.random() * el.uses.length)])}.` : null,
    ].filter((clue): clue is string => Boolean(clue)));

    const clues: string[] = [
      // Clue 1 — fun fact (scrubbed so name doesn't appear)
      scrub(factPool[0] || `This element is ${catLabel}.`),
      // Clue 2 — a real-world use (relatable!)
      earlyClues[0] ?? (el.uses && el.uses.length > 0
        ? `One of my real-world uses is: ${scrub(el.uses[0])}.`
        : `I'm ${catLabel} and I'm a ${el.stateAtRoomTemp} at room temperature.`),
      // Clue 3 — what type + state
      `I'm classified as ${catLabel} and I'm a ${el.stateAtRoomTemp} at room temperature.`,
      // Clue 4 — atomic number (can count on the periodic table!)
      `I have ${el.atomicNumber} protons — that's my atomic number on the periodic table.`,
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
const DEFAULT_CHAMP_GAMES: GameMode[] = ['quiz-battle', 'tf-blitz', 'atom-quiz', 'clue-duel', 'symbol-pick', 'atomic-order', 'element-match'];
const CHAMP_LABELS: Record<string, string> = {
  'quiz-battle': '⚔️ Quiz Battle',
  'tf-blitz': '✅ True or False Blitz',
  'element-match': 'Element Match Hunt',
  'clue-duel': '🕵️ Clue Duel',
  'symbol-pick': '🔤 Symbol Pick',
  'atom-quiz': '⚛️ Atom Quiz',
  'atomic-order': '🔢 Atomic Order',
};

type ChampSize = 'quick' | 'standard' | 'epic';
const CHAMP_SIZE_CONFIG: Record<ChampSize, { label: string; desc: string; counts: Record<Exclude<GameMode, 'championship'>, number> }> = {
  quick: { label: 'Quick', desc: 'Short games', counts: {
    'quiz-battle': 3, 'tf-blitz': 3, 'element-match': 12, 'atom-quiz': 4, 'clue-duel': 4, 'symbol-pick': 4, 'atomic-order': 3,
  } },
  standard: { label: 'Standard', desc: 'Medium games', counts: {
    'quiz-battle': 5, 'tf-blitz': 5, 'element-match': 16, 'atom-quiz': 8, 'clue-duel': 6, 'symbol-pick': 6, 'atomic-order': 5,
  } },
  epic: { label: 'Epic', desc: 'Long games', counts: {
    'quiz-battle': 8, 'tf-blitz': 8, 'element-match': 20, 'atom-quiz': 12, 'clue-duel': 8, 'symbol-pick': 8, 'atomic-order': 7,
  } },
};

type ChampGameScore = {
  p1Raw: number;
  p2Raw: number;
  p1Champ: number;
  p2Champ: number;
};



export default function TwoPlayerScreen({ onComplete, onBack, initialMode }: TwoPlayerScreenProps) {
  const [savedSettings] = useState(loadTwoPlayerSettings);
  const [phase, setPhase] = useState<Phase>(initialMode ? 'setup' : 'mode-select');
  const [gameMode, setGameMode] = useState<GameMode>(initialMode ?? 'championship');
  const [rounds, setRounds] = useState(savedSettings.rounds);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Load saved names
  const saved = loadTwoPlayerNames();
  const [player1, setPlayer1] = useState<PlayerConfig>({ name: saved.name1, difficulty: savedSettings.player1Difficulty, avatar: saved.avatar1 });
  const [player2, setPlayer2] = useState<PlayerConfig>({ name: saved.name2, difficulty: savedSettings.player2Difficulty, avatar: saved.avatar2 });
  const [player2Mode, setPlayer2Mode] = useState<Player2Mode>(savedSettings.player2Mode);

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
  const [matchExotic, setMatchExotic] = useState(savedSettings.matchExotic);
  const [huntTargetMode, setHuntTargetMode] = useState<'none' | 'random' | 'choose'>(savedSettings.huntTargetMode);
  const [huntTargetElementNum, setHuntTargetElementNum] = useState<number | null>(savedSettings.huntTargetElementNum);
  const [huntPickerOpen, setHuntPickerOpen] = useState(false);
  const [huntSearch, setHuntSearch] = useState('');
  const [huntFoundMessage, setHuntFoundMessage] = useState<string | null>(null);
  const [huntRequiredPairs, setHuntRequiredPairs] = useState(savedSettings.huntRequiredPairs);

  const lockTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const matchFinishTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const botKnownCardsRef = useRef<Map<number, number>>(new Map());

  // Clue Duel state
  const [snapRounds, setSnapRounds] = useState<SnapRound[]>([]);
  const [snapIndex, setSnapIndex] = useState(0);         // which round (element)
  const [snapClueIdx, setSnapClueIdx] = useState(0);     // how many clues revealed (0-4)
  const [snapTurn, setSnapTurn] = useState<1 | 2>(1);    // whose turn to guess/pass
  const [snapFirstWrongBy, setSnapFirstWrongBy] = useState<1 | 2 | null>(null); // first wrong guesser this round
  const [snapAnswered, setSnapAnswered] = useState<number | null>(null);
  const [snapLastWinner, setSnapLastWinner] = useState<1 | 2 | null>(null); // who won the last round

  // Symbol Pick state
  const [symbolRounds, setSymbolRounds] = useState<SymbolRound[]>([]);
  const [symbolIndex, setSymbolIndex] = useState(0);
  const [symbolTurn, setSymbolTurn] = useState<1 | 2>(1);
  const [symbolAnswered, setSymbolAnswered] = useState<number | null>(null);

  // Atom Quiz state
  const [atomQuestions, setAtomQuestions] = useState<AtomQuestion[]>([]);
  const [atomIndex, setAtomIndex] = useState(0);
  const [atomTurn, setAtomTurn] = useState<1 | 2>(1);
  const [atomAnswered, setAtomAnswered] = useState<number | null>(null);
  const [atomSecondChance, setAtomSecondChance] = useState(false);
  const [atomFirstWrong, setAtomFirstWrong] = useState<number | null>(null);

  // Atomic Order state
  const [orderRounds, setOrderRounds] = useState<AtomicOrderRound[]>([]);
  const [orderRoundIndex, setOrderRoundIndex] = useState(0);
  const [orderTurn, setOrderTurn] = useState<1 | 2>(1);
  const [orderTiles, setOrderTiles] = useState<number[]>([]);
  const [orderAttempts, setOrderAttempts] = useState(0);
  const [orderFeedback, setOrderFeedback] = useState<AtomicOrderFeedback[]>([]);
  const [orderSelected, setOrderSelected] = useState<number | null>(null);
  const [orderTurnResult, setOrderTurnResult] = useState<AtomicOrderResult | null>(null);
  const [orderP1Result, setOrderP1Result] = useState<AtomicOrderResult | null>(null);
  const [orderRoundWinner, setOrderRoundWinner] = useState<1 | 2 | null>(null);
  const [orderRoundComplete, setOrderRoundComplete] = useState(false);
  const [orderStartedAt, setOrderStartedAt] = useState(0);
  const [orderTimerStarted, setOrderTimerStarted] = useState(false);
  const [orderElapsed, setOrderElapsed] = useState(0);

  // Championship state
  const [champStep, setChampStep] = useState(0); // index into activeChampGames
  const [champScores, setChampScores] = useState<ChampGameScore[]>([]);
  const [isChampionship, setIsChampionship] = useState(false);
  const [isChampTiebreaker, setIsChampTiebreaker] = useState(false);
  const [champSize, setChampSize] = useState<ChampSize>(savedSettings.champSize);
  const [selectedChampGames, setSelectedChampGames] = useState<GameMode[]>(() => {
    const valid = savedSettings.championshipGames.filter((mode): mode is GameMode => DEFAULT_CHAMP_GAMES.includes(mode as GameMode));
    return valid.length >= 2 ? valid : DEFAULT_CHAMP_GAMES;
  });
  const [activeChampGames, setActiveChampGames] = useState<GameMode[]>(selectedChampGames);
  const prevPhaseRef = useRef<Phase>('mode-select');

  // Save names whenever they change
  useEffect(() => {
    saveTwoPlayerNames({ name1: player1.name, avatar1: player1.avatar, name2: player2.name, avatar2: player2.avatar });
  }, [player1.name, player1.avatar, player2.name, player2.avatar]);

  useEffect(() => {
    saveTwoPlayerSettings({
      player1Difficulty: player1.difficulty,
      player2Difficulty: player2.difficulty,
      player2Mode,
      rounds,
      champSize,
      championshipGames: selectedChampGames,
      matchExotic,
      huntTargetMode,
      huntTargetElementNum,
      huntRequiredPairs,
    });
  }, [champSize, huntRequiredPairs, huntTargetElementNum, huntTargetMode, matchExotic, player1.difficulty, player2.difficulty, player2Mode, rounds, selectedChampGames]);

  useEffect(() => {
    if (phase === 'mode-select' && prevPhaseRef.current !== 'mode-select') {
      setGameMode('championship');
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  const normalizeChampPoints = useCallback((mode: GameMode, score: number) => {
    if (mode === 'element-match') return Math.min(score, 3);
    return score;
  }, []);

  const committedChampTotals = champScores.reduce((totals, game) => {
    return {
      p1: totals.p1 + game.p1Champ,
      p2: totals.p2 + game.p2Champ,
    };
  }, { p1: 0, p2: 0 });

  const liveChampTotals = {
    p1: committedChampTotals.p1 + (isChampionship && phase === 'playing' ? normalizeChampPoints(gameMode, p1Score) : 0),
    p2: committedChampTotals.p2 + (isChampionship && phase === 'playing' ? normalizeChampPoints(gameMode, p2Score) : 0),
  };

  const championshipTotalsBar = isChampionship && phase === 'playing' ? (
    <div className="champ-live-total">
      <span>{player1.avatar} {player1.name}: <strong>{liveChampTotals.p1}</strong></span>
      <span>{player2.avatar} {player2.name}: <strong>{liveChampTotals.p2}</strong></span>
    </div>
  ) : null;

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
    setP1Questions(generateQuizBattleQuiz(player1.difficulty, rounds));
    setP2Questions(generateQuizBattleQuiz(player2.difficulty, rounds));
    setCurrentPlayer(1);
    setCurrentRound(1);
    setQIndex(0);
    resetScores();
    setPhase('playing');
  }, [player1.difficulty, player2.difficulty, rounds]);

  const handleQuizAnswer = useCallback((correct: boolean, _points: number) => {
    if (currentPlayer === 1) {
      if (correct) { setP1Score(c => c + 1); setP1Streak(s => s + 1); } else { setP1Streak(0); }
      // Switch directly to player 2 — no pass-device screen
      setCurrentPlayer(2);
    } else {
      const newP2 = correct ? p2Score + 1 : p2Score;
      if (correct) { setP2Score(c => c + 1); setP2Streak(s => s + 1); } else { setP2Streak(0); }
      if (currentRound >= rounds) {
        // Pass computed scores so championship captures the correct final values
        finishCurrentGame(p1Score, newP2);
      } else {
        setCurrentRound(r => r + 1);
        setCurrentPlayer(1);
        setQIndex(i => i + 1);
      }
    }
  }, [currentPlayer, currentRound, rounds, p1Score, p2Score]);

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

  useEffect(() => {
    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
      if (lockTimer.current) {
        clearTimeout(lockTimer.current);
        lockTimer.current = null;
      }
      if (matchFinishTimerRef.current) {
        clearTimeout(matchFinishTimerRef.current);
        matchFinishTimerRef.current = null;
      }
    };
  }, []);

  const botGetsCorrect = useCallback((difficulty: Difficulty) => {
    return Math.random() < BOT_ACCURACY[difficulty];
  }, []);

  const botGetsMatchRight = useCallback((difficulty: Difficulty) => {
    return Math.random() < BOT_MATCH_ACCURACY[difficulty];
  }, []);

  const pickBotChoice = useCallback((correctIndex: number, choiceCount: number, difficulty: Difficulty) => {
    if (choiceCount <= 1 || botGetsCorrect(difficulty)) return correctIndex;
    const wrong: number[] = [];
    for (let i = 0; i < choiceCount; i++) {
      if (i !== correctIndex) wrong.push(i);
    }
    return wrong[Math.floor(Math.random() * wrong.length)] ?? correctIndex;
  }, [botGetsCorrect]);

  const pickBotMatchCard = useCallback((cards: MatchCard[], firstId: number | null, difficulty: Difficulty, blockedElementNum?: number | null) => {
    const available = cards.filter(c => !c.matched && !c.flipped && c.elementNum !== blockedElementNum);
    if (available.length === 0) return null;

    // Prefer known pairs from memory first.
    const knownByElement = new Map<number, number[]>();
    for (const card of cards) {
      if (card.matched) continue;
      const knownElement = botKnownCardsRef.current.get(card.id);
      if (knownElement === undefined) continue;
      const list = knownByElement.get(knownElement) ?? [];
      list.push(card.id);
      knownByElement.set(knownElement, list);
    }

    if (firstId !== null) {
      const rememberedFirst = botKnownCardsRef.current.get(firstId);
      if (rememberedFirst !== undefined) {
        const partnerIds = (knownByElement.get(rememberedFirst) ?? []).filter(id => id !== firstId);
        const partnerId = partnerIds.find(id => available.some(c => c.id === id));
        if (partnerId !== undefined && botGetsMatchRight(difficulty)) return partnerId;
      }
    }

    const grouped = new Map<number, MatchCard[]>();
    for (const card of available) {
      const list = grouped.get(card.elementNum) ?? [];
      list.push(card);
      grouped.set(card.elementNum, list);
    }

    const pairs = Array.from(grouped.values()).filter(group => group.length >= 2);
    if (pairs.length > 0 && botGetsMatchRight(difficulty)) {
      const chosenGroup = pairs[Math.floor(Math.random() * pairs.length)];
      return chosenGroup[Math.floor(Math.random() * chosenGroup.length)].id;
    }

    if (firstId !== null) {
      const first = cards.find(c => c.id === firstId);
      if (first) {
        const wrongChoices = available.filter(c => c.elementNum !== first.elementNum);
        if (wrongChoices.length > 0) {
          return wrongChoices[Math.floor(Math.random() * wrongChoices.length)].id;
        }
      }
    }

    return available[Math.floor(Math.random() * available.length)]?.id ?? null;
  }, [botGetsMatchRight]);

  const pickBotSnapChoice = useCallback((round: SnapRound, visibleClueCount: number, difficulty: Difficulty) => {
    const visibleClues = round.clues.slice(0, Math.max(1, visibleClueCount)).map(c => c.toLowerCase());
    const choiceElements = round.choices.map(name => elements.find(e => e.name === name));

    const scores = round.choices.map((choiceName, idx) => {
      const el = choiceElements[idx];
      if (!el) return { idx, score: 0 };
      let score = 0;
      for (const clue of visibleClues) {
        if (clue.includes(choiceName.toLowerCase())) score += 8;
        if (clue.includes(`symbol is "${el.symbol.toLowerCase()}"`) || clue.includes(`symbol is ${el.symbol.toLowerCase()}`)) score += 9;
        if (clue.includes(`${el.atomicNumber} protons`)) score += 8;
        if (clue.includes(`i'm a ${el.stateAtRoomTemp}`)) score += 3;
        const categoryPhrase = (CATEGORY_LABELS[el.category] || el.category).toLowerCase();
        if (clue.includes(categoryPhrase)) score += 3;
      }
      return { idx, score };
    });

    const best = [...scores].sort((a, b) => b.score - a.score);
    const bestScore = best[0]?.score ?? 0;
    const top = best.filter(s => s.score === bestScore).map(s => s.idx);
    const revealBoost = Math.min(0.25, visibleClueCount * 0.04);
    const shouldTrustTop = Math.random() < (BOT_ACCURACY[difficulty] + revealBoost);

    if (bestScore > 0 && shouldTrustTop) {
      return top[Math.floor(Math.random() * top.length)] ?? 0;
    }

    return Math.floor(Math.random() * round.choices.length);
  }, []);

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
    const chosenTarget = huntTargetMode === 'choose' && huntTargetElementNum
      ? huntTargetElementNum
      : null;
    const cards = generateMatchCards(rounds, 118, matchExotic, chosenTarget);
    const boardElementNums = Array.from(new Set(cards.map(c => c.elementNum)));
    const targetNum = huntTargetMode === 'none'
      ? null
      : chosenTarget ?? boardElementNums[Math.floor(Math.random() * boardElementNums.length)] ?? cards[0]?.elementNum ?? 1;
    setMatchCards(cards);
    setHuntTargetElementNum(targetNum);
    setMatchTurn(1);
    setMatchFirst(null);
    setMatchLocked(false);
    setHuntFoundMessage(null);
    botKnownCardsRef.current.clear();
    resetScores();
    setPhase('playing');
  }, [rounds, matchExotic, huntTargetMode, huntTargetElementNum]);

  useEffect(() => {
    for (const card of matchCards) {
      if (card.flipped || card.matched) {
        botKnownCardsRef.current.set(card.id, card.elementNum);
      }
    }
  }, [matchCards]);

  const handleMatchFlip = (cardId: number) => {
    if (matchLocked) return;
    const card = matchCards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;
    const claimedPairsBeforeFlip = Math.floor(matchCards.filter(c => c.matched).length / 2);
    if (
      gameMode === 'element-match' &&
      huntTargetElementNum !== null &&
      card.elementNum === huntTargetElementNum &&
      claimedPairsBeforeFlip < huntRequiredPairs
    ) {
      const remaining = huntRequiredPairs - claimedPairsBeforeFlip;
      setHuntFoundMessage(`Find ${remaining} more pair${remaining === 1 ? '' : 's'} before the target unlocks.`);
      return;
    }

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
        // Capture final scores before state update so the setTimeout closure isn't stale
        const candidateP1 = matchTurn === 1 ? p1Score + 1 : p1Score;
        const candidateP2 = matchTurn === 2 ? p2Score + 1 : p2Score;
        const newMatchP1 = isChampionship ? Math.min(candidateP1, 3) : candidateP1;
        const newMatchP2 = isChampionship ? Math.min(candidateP2, 3) : candidateP2;
        if (matchTurn === 1) setP1Score(s => isChampionship ? Math.min(s + 1, 3) : s + 1);
        else setP2Score(s => isChampionship ? Math.min(s + 1, 3) : s + 1);
        if (gameMode === 'element-match' && huntTargetElementNum !== null) setHuntFoundMessage(null);
        if (gameMode === 'element-match' && huntTargetElementNum !== null && first.elementNum === huntTargetElementNum) {
          const p1MatchedPairs = Math.floor(matched.filter(c => c.matchedBy === 1).length / 2);
          const p2MatchedPairs = Math.floor(matched.filter(c => c.matchedBy === 2).length / 2);
          const claimedPairs = p1MatchedPairs + p2MatchedPairs;
          const finalP1 = matchTurn === 1
            ? (isChampionship ? Math.min(claimedPairs, 3) : claimedPairs)
            : 0;
          const finalP2 = matchTurn === 2
            ? (isChampionship ? Math.min(claimedPairs, 3) : claimedPairs)
            : 0;
          const target = elements.find(e => e.atomicNumber === first.elementNum);
          const hunter = matchTurn === 1 ? player1 : player2;
          setHuntFoundMessage(`${hunter.avatar} ${hunter.name} found ${target?.name ?? 'the target'} and claimed ${claimedPairs} found pair${claimedPairs === 1 ? '' : 's'}!`);
          setP1Score(finalP1);
          setP2Score(finalP2);
          if (!matchFinishTimerRef.current) {
            matchFinishTimerRef.current = setTimeout(() => {
              matchFinishTimerRef.current = null;
              finishCurrentGame(finalP1, finalP2);
            }, BOT_RESULT_DELAY_MS);
          }
          return;
        }
        const finishMatchTurn = () => {
          setMatchFirst(null);
          setMatchLocked(false);
        };

        if (player2Mode === 'bot' && matchTurn === 2) {
          setTimeout(finishMatchTurn, BOT_RESULT_DELAY_MS);
        } else {
          finishMatchTurn();
        }

        if (matched.every(c => c.matched)) {
          const finishDelay = player2Mode === 'bot' && matchTurn === 2 ? BOT_RESULT_DELAY_MS : 600;
          if (!matchFinishTimerRef.current) {
            matchFinishTimerRef.current = setTimeout(() => {
              matchFinishTimerRef.current = null;
              finishCurrentGame(newMatchP1, newMatchP2);
            }, finishDelay);
          }
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

  // Safety net: if all cards are matched, always end the game even if a prior callback was interrupted.
  useEffect(() => {
    if (phase !== 'playing' || gameMode !== 'element-match' || matchCards.length === 0) return;
    if (!matchCards.every(c => c.matched)) return;
    if (matchFinishTimerRef.current) return;

    const p1Pairs = Math.floor(matchCards.filter(c => c.matchedBy === 1).length / 2);
    const p2Pairs = Math.floor(matchCards.filter(c => c.matchedBy === 2).length / 2);
    const finishDelay = player2Mode === 'bot' && matchTurn === 2 ? BOT_RESULT_DELAY_MS : 600;

    matchFinishTimerRef.current = setTimeout(() => {
      matchFinishTimerRef.current = null;
      finishCurrentGame(p1Pairs, p2Pairs);
    }, finishDelay);
  }, [gameMode, isChampionship, matchCards, matchTurn, p1Score, p2Score, phase, player2Mode]);

  // --- Clue Duel ---
  const startElementSnap = useCallback(() => {
    setSnapRounds(generateSnapRounds(rounds, sharedPool()));
    setSnapIndex(0);
    setSnapClueIdx(0);
    setSnapTurn(1);
    setSnapFirstWrongBy(null);
    setSnapAnswered(null);
    setSnapLastWinner(null);
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
      setSnapLastWinner(active as 1 | 2);
      setSnapAnswered(idx);
    } else {
      playWrong();
      // No score penalty on wrong answers; only correct guesses earn points.
      if (snapFirstWrongBy === null) {
        // Give opponent a chance — reveal next 2 clues
        setSnapFirstWrongBy(active as 1 | 2);
        setSnapClueIdx(c => Math.min(c + 2, 4));
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
      // Winner's opponent starts next round; if no winner, alternate by index
      setSnapTurn(snapLastWinner !== null ? (snapLastWinner === 1 ? 2 : 1) : (nextIdx % 2 === 0 ? 1 : 2));
      setSnapFirstWrongBy(null);
      setSnapAnswered(null);
      setSnapLastWinner(null);
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

  // --- Atom Quiz ---
  const handleAtomAnswer = (idx: number) => {
    if (atomAnswered !== null) return;
    const q = atomQuestions[atomIndex];
    const cp = atomTurn === 1 ? player1 : player2;
    const hasSecondChance = DIFFICULTY_CONFIG[cp.difficulty].secondChance;
    if (idx === q.correctIndex) {
      setAtomAnswered(idx);
      playCorrect();
      if (atomTurn === 1) setP1Score(s => s + 1);
      else setP2Score(s => s + 1);
    } else if (hasSecondChance && !atomSecondChance) {
      playWrong();
      setAtomSecondChance(true);
      setAtomFirstWrong(idx);
    } else {
      setAtomAnswered(idx);
      playWrong();
    }
  };

  const nextAtomRound = () => {
    const nextIdx = atomIndex + 1;
    if (nextIdx >= atomQuestions.length) {
      finishCurrentGame();
    } else {
      setAtomIndex(nextIdx);
      setAtomTurn(t => (t === 1 ? 2 : 1));
      setAtomAnswered(null);
      setAtomSecondChance(false);
      setAtomFirstWrong(null);
    }
  };

  // --- Atomic Order ---
  const beginAtomicOrderTurn = (gameRounds: AtomicOrderRound[], roundIndex: number, turn: 1 | 2) => {
    const puzzle = gameRounds[roundIndex];
    if (!puzzle) return;
    setOrderTurn(turn);
    setOrderTiles([...(turn === 1 ? puzzle.p1 : puzzle.p2)]);
    setOrderAttempts(0);
    setOrderFeedback([]);
    setOrderSelected(null);
    setOrderTurnResult(null);
    setOrderRoundComplete(false);
    setOrderStartedAt(0);
    setOrderTimerStarted(false);
    setOrderElapsed(0);
  };

  const startAtomicOrder = (count: number = rounds) => {
    const gameRounds = generateAtomicOrderRounds(count, player1.difficulty, player2.difficulty);
    setOrderRounds(gameRounds);
    setOrderRoundIndex(0);
    setOrderP1Result(null);
    setOrderRoundWinner(null);
    resetScores();
    setRounds(count);
    beginAtomicOrderTurn(gameRounds, 0, 1);
    setPhase('playing');
  };

  const startAtomicOrderTimer = () => {
    if (orderTimerStarted || orderTurnResult) return;
    setOrderStartedAt(Date.now());
    setOrderElapsed(0);
    setOrderTimerStarted(true);
  };

  const moveAtomicOrderTile = (fromIndex: number, toIndex: number) => {
    if (!orderTimerStarted || orderTurnResult || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setOrderTiles(current => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setOrderFeedback([]);
    setOrderSelected(null);
  };

  const selectAtomicOrderTile = (index: number) => {
    if (!orderTimerStarted || orderTurnResult || isBotTurn) return;
    if (orderSelected === null) setOrderSelected(index);
    else if (orderSelected === index) setOrderSelected(null);
    else moveAtomicOrderTile(orderSelected, index);
  };

  const finishAtomicOrderTurn = (result: AtomicOrderResult) => {
    setOrderTurnResult(result);
    if (orderTurn === 1) {
      setOrderP1Result(result);
      return;
    }

    const p1 = orderP1Result;
    let winner: 1 | 2 | null = null;
    if (p1 && p1.elapsedMs !== result.elapsedMs) {
      winner = p1.elapsedMs < result.elapsedMs ? 1 : 2;
    }
    setOrderRoundWinner(winner);
    setOrderRoundComplete(true);
    if (winner === 1) setP1Score(score => score + 1);
    if (winner === 2) setP2Score(score => score + 1);
  };

  const submitAtomicOrder = () => {
    if (!orderTimerStarted || orderTurnResult || orderTiles.length < 3) return;
    const sorted = [...orderTiles].sort((a, b) => a - b);
    const feedback = orderTiles.map((atomicNumber, index): AtomicOrderFeedback => {
      const targetIndex = sorted.indexOf(atomicNumber);
      return targetIndex === index ? 'correct' : targetIndex < index ? 'left' : 'right';
    });
    const attempts = orderAttempts + 1;
    const solved = feedback.every(value => value === 'correct');
    setOrderAttempts(attempts);
    setOrderFeedback(feedback);
    if (solved) playCorrect();
    else playWrong();
    if (solved) {
      finishAtomicOrderTurn({ solved, attempts, elapsedMs: Math.max(1, Date.now() - orderStartedAt) });
    }
  };

  const nextAtomicOrderStage = () => {
    if (orderTurn === 1) {
      beginAtomicOrderTurn(orderRounds, orderRoundIndex, 2);
      return;
    }
    if (!orderRoundComplete) return;
    const nextRound = orderRoundIndex + 1;
    if (nextRound >= orderRounds.length) {
      finishCurrentGame();
      return;
    }
    setOrderRoundIndex(nextRound);
    setOrderP1Result(null);
    setOrderRoundWinner(null);
    beginAtomicOrderTurn(orderRounds, nextRound, 1);
  };

  useEffect(() => {
    if (phase !== 'playing' || gameMode !== 'atomic-order' || !orderTimerStarted || orderTurnResult || !orderStartedAt) return;
    const timer = setInterval(() => setOrderElapsed(Date.now() - orderStartedAt), 100);
    return () => clearInterval(timer);
  }, [gameMode, orderStartedAt, orderTimerStarted, orderTurnResult, phase]);

  // --- Championship orchestration ---
  const launchSubGame = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setP1Score(0);
    setP2Score(0);
    const counts = CHAMP_SIZE_CONFIG[champSize].counts;
    if (mode === 'quiz-battle') {
      const n = counts[mode];
      setP1Questions(generateQuizBattleQuiz(player1.difficulty, n));
      setP2Questions(generateQuizBattleQuiz(player2.difficulty, n));
      setCurrentPlayer(1);
      setCurrentRound(1);
      setQIndex(0);
      setP1Streak(0);
      setP2Streak(0);
      setRounds(n);
      setPhase('playing');
    } else if (mode === 'tf-blitz') {
      const n = counts[mode];
      setTfStatements(generateTFStatements(n * 2, sharedPool()));
      setTfIndex(0);
      setTfTurn(1);
      setTfAnswered(null);
      setTfShowResult(false);
      setRounds(n);
      setPhase('playing');
    } else if (mode === 'element-match') {
      const n = counts[mode];
      const chosenTarget = huntTargetMode === 'choose' && huntTargetElementNum
        ? huntTargetElementNum
        : null;
      const cards = generateMatchCards(n, 118, matchExotic, chosenTarget);
      const boardElementNums = Array.from(new Set(cards.map(c => c.elementNum)));
      const targetNum = huntTargetMode === 'none'
        ? null
        : chosenTarget ?? boardElementNums[Math.floor(Math.random() * boardElementNums.length)] ?? cards[0]?.elementNum ?? 1;
      setMatchCards(cards);
      setHuntTargetElementNum(targetNum);
      setHuntFoundMessage(null);
      setMatchTurn(1);
      setMatchFirst(null);
      setMatchLocked(false);
      setRounds(n);
      setPhase('playing');
    } else if (mode === 'atom-quiz') {
      const n = counts[mode];
      setAtomQuestions(generateAtomQuestions(n));
      setAtomIndex(0);
      setAtomTurn(1);
      setAtomAnswered(null);
      setAtomSecondChance(false);
      setAtomFirstWrong(null);
      setRounds(n);
      setPhase('playing');
    } else if (mode === 'clue-duel') {
      const n = counts[mode];
      setSnapRounds(generateSnapRounds(n, sharedPool()));
      setSnapIndex(0);
      setSnapClueIdx(0);
      setSnapTurn(1);
      setSnapFirstWrongBy(null);
      setSnapAnswered(null);
      setRounds(n);
      setPhase('playing');
    } else if (mode === 'symbol-pick') {
      const n = counts[mode];
      setSymbolRounds(generateSymbolRounds(n, sharedPool()));
      setSymbolIndex(0);
      setSymbolTurn(1);
      setSymbolAnswered(null);
      setRounds(n);
      setPhase('playing');
    } else if (mode === 'atomic-order') {
      startAtomicOrder(counts[mode]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1.difficulty, player2.difficulty, champSize, huntTargetMode, huntTargetElementNum, matchExotic]);

  const startChampionship = () => {
    const games = selectedChampGames.length >= 2 ? selectedChampGames : DEFAULT_CHAMP_GAMES;
    setIsChampionship(true);
    setActiveChampGames(games);
    setChampStep(0);
    setChampScores([]);
    setP1Score(0);
    setP2Score(0);
    const firstGame = games[0];
    setGameMode(firstGame);
    // Start first sub-game with fixed rounds
    launchSubGame(firstGame);
  };

  const finishCurrentGame = (finalP1: number = p1Score, finalP2: number = p2Score) => {
    setP1Score(finalP1);
    setP2Score(finalP2);

    if (isChampionship) {
      const champP1 = normalizeChampPoints(gameMode, finalP1);
      const champP2 = normalizeChampPoints(gameMode, finalP2);
      // Save this game's raw scores — they carry over directly as championship points
      setChampScores(prev => [...prev, {
        p1Raw: finalP1,
        p2Raw: finalP2,
        p1Champ: champP1,
        p2Champ: champP2,
      }]);
      if (champStep + 1 >= activeChampGames.length) {
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
    launchSubGame(activeChampGames[next]);
  };

  const startChampTiebreaker = useCallback(() => {
    setIsChampTiebreaker(true);
    setIsChampionship(false);
    setGameMode('element-match');
    setMatchCards(generateMatchCards(12, sharedPool()));
    setMatchTurn(1);
    setMatchFirst(null);
    setMatchLocked(false);
    setP1Score(0);
    setP2Score(0);
    setRounds(12);
    setPhase('playing');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player1.difficulty, player2.difficulty]);

  const startGame = () => {
    setIsChampionship(false);
    if (gameMode === 'quiz-battle') startQuizBattle();
    else if (gameMode === 'tf-blitz') startTFBlitz();
    else if (gameMode === 'element-match') startElementMatch();
    else if (gameMode === 'clue-duel') startElementSnap();
    else if (gameMode === 'symbol-pick') startSymbolPick();
    else if (gameMode === 'atomic-order') startAtomicOrder();
    else if (gameMode === 'atom-quiz') {
      setAtomQuestions(generateAtomQuestions(rounds));
      setAtomIndex(0);
      setAtomTurn(1);
      setAtomAnswered(null);
      setAtomSecondChance(false);
      setAtomFirstWrong(null);
      setPhase('playing');
    }
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

  const isBotTurn =
    player2Mode === 'bot' &&
    phase === 'playing' &&
    (
      (gameMode === 'quiz-battle' && currentPlayer === 2) ||
      (gameMode === 'tf-blitz' && tfTurn === 2) ||
      (gameMode === 'element-match' && matchTurn === 2) ||
      (gameMode === 'clue-duel' && snapTurn === 2) ||
      (gameMode === 'symbol-pick' && symbolTurn === 2) ||
      (gameMode === 'atom-quiz' && atomTurn === 2) ||
      (gameMode === 'atomic-order' && orderTurn === 2)
    );

  const renderTurnBanner = (turnOwner: 1 | 2, detail?: string) => {
    const turnPlayer = turnOwner === 1 ? player1 : player2;
    const botThinking = turnOwner === 2 && player2Mode === 'bot';
    return (
      <div className={`turn-banner ${turnOwner === 1 ? 'p1' : 'p2'} ${botThinking ? 'thinking' : ''}`}>
        <span className="turn-pill">Now Playing</span>
        <span className="turn-main">
          {turnPlayer.avatar} {turnPlayer.name}{botThinking ? ' is thinking...' : "'s turn"}
        </span>
        {detail && <span className="turn-detail">{detail}</span>}
      </div>
    );
  };

  // --- Bot turns (Player 2) ---
  useEffect(() => {
    if (player2Mode !== 'bot') return;
    if (phase !== 'playing') return;
    if (botTimerRef.current) return;

    if (gameMode === 'tf-blitz' && tfTurn === 2 && !tfShowResult && tfAnswered === null && tfStatements[tfIndex]) {
      const stmt = tfStatements[tfIndex];
      const botAnswer = botGetsCorrect(player2.difficulty) ? stmt.answer : !stmt.answer;
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        handleTFAnswer(botAnswer);
      }, BOT_DELAY_MS);
      return;
    }

    if (gameMode === 'element-match' && matchTurn === 2 && !matchLocked) {
      const claimedPairs = Math.floor(matchCards.filter(c => c.matched).length / 2);
      const blockedElementNum = huntTargetElementNum !== null && claimedPairs < huntRequiredPairs ? huntTargetElementNum : null;
      const choiceId = pickBotMatchCard(matchCards, matchFirst, player2.difficulty, blockedElementNum);
      if (choiceId !== null) {
        botTimerRef.current = setTimeout(() => {
          botTimerRef.current = null;
          handleMatchFlip(choiceId);
        }, BOT_DELAY_MS);
        return;
      }
    }

    if (gameMode === 'clue-duel' && snapTurn === 2 && snapAnswered === null && snapRounds[snapIndex]) {
      const round = snapRounds[snapIndex];
      const confidence = Math.min(0.92, 0.3 + snapClueIdx * 0.14 + (player2.difficulty === 'professor' ? 0.14 : player2.difficulty === 'scientist' ? 0.08 : 0));
      const shouldGuess = snapFirstWrongBy !== null || Math.random() < confidence;
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        if (shouldGuess) {
          const choice = pickBotSnapChoice(round, snapClueIdx + 1, player2.difficulty);
          handleSnapAnswer(choice);
        } else {
          handleClueNext();
        }
      }, BOT_DELAY_MS);
      return;
    }

    if (gameMode === 'symbol-pick' && symbolTurn === 2 && symbolAnswered === null && symbolRounds[symbolIndex]) {
      const round = symbolRounds[symbolIndex];
      const correctIndex = round.choices.findIndex(c => c === round.correctSymbol);
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        const choice = pickBotChoice(Math.max(0, correctIndex), round.choices.length, player2.difficulty);
        handleSymbolAnswer(choice);
      }, BOT_DELAY_MS);
      return;
    }

    if (gameMode === 'atomic-order' && orderTurn === 2 && !orderTurnResult && orderTiles.length >= 3) {
      const attempts = player2.difficulty === 'professor'
        ? 1 + Math.floor(Math.random() * 4)
        : player2.difficulty === 'scientist'
          ? 2 + Math.floor(Math.random() * 4)
          : 3 + Math.floor(Math.random() * 5);
      const [minimumSeconds, extraSeconds] = player2.difficulty === 'professor'
        ? [9, 11]
        : player2.difficulty === 'scientist'
          ? [14, 14]
          : [20, 18];
      const elapsedMs = Math.round((minimumSeconds + Math.random() * extraSeconds) * 1000);
      setOrderTimerStarted(true);
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        setOrderTiles(current => [...current].sort((a, b) => a - b));
        setOrderFeedback(orderTiles.map(() => 'correct'));
        setOrderAttempts(attempts);
        finishAtomicOrderTurn({ solved: true, attempts, elapsedMs });
      }, BOT_DELAY_MS);
      return;
    }

    if (gameMode === 'atom-quiz' && atomTurn === 2 && atomAnswered === null && atomQuestions[atomIndex]) {
      const q = atomQuestions[atomIndex];
      const choice = atomSecondChance
        ? q.correctIndex
        : pickBotChoice(q.correctIndex, q.choices.length, player2.difficulty);
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        handleAtomAnswer(choice);
      }, BOT_DELAY_MS);
    }
  }, [
    atomAnswered,
    atomIndex,
    atomQuestions,
    atomSecondChance,
    atomTurn,
    botGetsCorrect,
    currentPlayer,
    gameMode,
    matchCards,
    matchFirst,
    matchLocked,
    matchTurn,
    orderTiles,
    orderTurn,
    orderTurnResult,
    huntRequiredPairs,
    huntTargetElementNum,
    p2Questions,
    phase,
    pickBotChoice,
    pickBotMatchCard,
    pickBotSnapChoice,
    player2.difficulty,
    player2Mode,
    qIndex,
    snapAnswered,
    snapClueIdx,
    snapFirstWrongBy,
    snapIndex,
    snapRounds,
    snapTurn,
    symbolAnswered,
    symbolIndex,
    symbolRounds,
    symbolTurn,
    tfAnswered,
    tfIndex,
    tfShowResult,
    tfStatements,
    tfTurn,
  ]);

  // Let bot result screens breathe before auto-advancing.
  useEffect(() => {
    if (player2Mode !== 'bot' || phase !== 'playing') return;
    if (botTimerRef.current) return;

    if (gameMode === 'tf-blitz' && tfTurn === 2 && tfShowResult) {
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        nextTFRound();
      }, BOT_RESULT_DELAY_MS);
      return;
    }

    if (gameMode === 'symbol-pick' && symbolTurn === 2 && symbolAnswered !== null) {
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        nextSymbolRound();
      }, BOT_RESULT_DELAY_MS);
      return;
    }

    if (gameMode === 'atom-quiz' && atomTurn === 2 && atomAnswered !== null) {
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        nextAtomRound();
      }, BOT_RESULT_DELAY_MS);
      return;
    }

    if (gameMode === 'clue-duel' && snapTurn === 2 && snapAnswered !== null) {
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        nextSnapRound();
      }, BOT_RESULT_DELAY_MS);
      return;
    }

    if (gameMode === 'atomic-order' && orderTurn === 2 && orderTurnResult) {
      botTimerRef.current = setTimeout(() => {
        botTimerRef.current = null;
        nextAtomicOrderStage();
      }, BOT_RESULT_DELAY_MS);
    }
  }, [
    atomAnswered,
    atomTurn,
    gameMode,
    orderTurn,
    orderTurnResult,
    phase,
    player2Mode,
    snapAnswered,
    snapTurn,
    symbolAnswered,
    symbolTurn,
    tfShowResult,
    tfTurn,
  ]);

  // --- MODE SELECT ---
  if (phase === 'mode-select') {
    return (
      <div className="two-player-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">👥 2 Player Mode</h2>
        <Elementor expression="greeting" message="Pick a game to play together!" />

        <div className="game-mode-grid">
          <button
            className={`game-mode-btn championship ${gameMode === 'championship' ? 'selected' : ''}`}
            onClick={() => { setGameMode('championship'); setPhase('setup'); }}
          >
            <span className="gm-icon">🏆</span>
            <span className="gm-name">Championship</span>
            <span className="gm-desc">Choose your games — highest combined score wins!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'quiz-battle' ? 'selected' : ''}`}
            onClick={() => { setGameMode('quiz-battle'); setRounds(3); setPhase('setup'); }}
          >
            <span className="gm-icon">⚔️</span>
            <span className="gm-name">Quiz Battle</span>
            <span className="gm-desc">Take turns answering — most correct wins!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'tf-blitz' ? 'selected' : ''}`}
            onClick={() => { setGameMode('tf-blitz'); setPhase('setup'); }}
          >
            <span className="gm-icon">✅</span>
            <span className="gm-name">True or False Blitz</span>
            <span className="gm-desc">Is it true? Is it false? Take turns deciding!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'element-match' ? 'selected' : ''}`}
            onClick={() => { setGameMode('element-match'); setRounds(12); setPhase('setup'); }}
          >
            <span className="gm-icon">🃏</span>
            <span className="gm-name">Element Match Hunt</span>
            <span className="gm-desc">Match pairs, or add a target hunt!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'clue-duel' ? 'selected' : ''}`}
            onClick={() => { setGameMode('clue-duel'); setPhase('setup'); }}
          >
            <span className="gm-icon">🕵️</span>
            <span className="gm-name">Clue Duel</span>
            <span className="gm-desc">Take turns — guess the element from a clue, or pass!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'symbol-pick' ? 'selected' : ''}`}
            onClick={() => { setGameMode('symbol-pick'); setPhase('setup'); }}
          >
            <span className="gm-icon">🔤</span>
            <span className="gm-name">Symbol Pick</span>
            <span className="gm-desc">Pick the correct symbol from look-alikes!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'atomic-order' ? 'selected' : ''}`}
            onClick={() => { setGameMode('atomic-order'); setRounds(5); setPhase('setup'); }}
          >
            <span className="gm-icon">🔢</span>
            <span className="gm-name">Atomic Order</span>
            <span className="gm-desc">Race to order elements — unlimited tries!</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'atom-quiz' ? 'selected' : ''}`}
            onClick={() => { setGameMode('atom-quiz'); setPhase('setup'); }}
          >
            <span className="gm-icon">⚛️</span>
            <span className="gm-name">Atom Quiz</span>
            <span className="gm-desc">Take turns answering atomic structure questions!</span>
          </button>
        </div>
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
          {gameMode === 'element-match' && '🃏 Element Match Hunt'}
          {gameMode === 'clue-duel' && '🕵️ Clue Duel'}
          {gameMode === 'symbol-pick' && '🔤 Symbol Pick'}
          {gameMode === 'atom-quiz' && '⚛️ Atom Quiz'}
          {gameMode === 'atomic-order' && '🔢 Atomic Order'}
          {gameMode === 'championship' && '🏆 Championship'}
        </h2>
        <Elementor expression="greeting" message="Set up your players!" />

        <div className="players-config">
          {[{ p: player1, setP: setPlayer1, label: 'Player 1' }, { p: player2, setP: setPlayer2, label: 'Player 2' }].map(({ p, setP, label }) => (
            <div key={label} className="player-config-card">
              <h3>{label}</h3>
              {label === 'Player 2' && (
                <div className="rounds-select" style={{ marginTop: '0.25rem' }}>
                  <label>Type: </label>
                  <button
                    className={`round-btn ${player2Mode === 'human' ? 'selected' : ''}`}
                    onClick={() => setPlayer2Mode('human')}
                  >
                    Human
                  </button>
                  <button
                    className={`round-btn ${player2Mode === 'bot' ? 'selected' : ''}`}
                    onClick={() => {
                      setPlayer2Mode('bot');
                      if (!p.name.trim()) setP({ ...p, name: 'Bot Blaze' });
                    }}
                  >
                    Bot
                  </button>
                </div>
              )}
              <input
                className="player-name-input"
                value={p.name}
                onChange={e => setP({ ...p, name: e.target.value })}
                placeholder={label === 'Player 2' && player2Mode === 'bot' ? 'Bot name' : 'Enter name'}
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
              {(gameMode !== 'element-match' || (label === 'Player 2' && player2Mode === 'bot')) && (
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
            {(gameMode === 'element-match' ? [12, 16, 20] : gameMode === 'clue-duel' ? [4, 6, 8] : gameMode === 'atom-quiz' ? [4, 8, 12] : gameMode === 'atomic-order' ? [3, 5, 7] : gameMode === 'symbol-pick' ? [4, 6, 10] : [3, 5, 10]).map(r => (
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
        {gameMode === 'element-match' && (
          <div className="rounds-select">
            <label>Pool: </label>
            <button className={`round-btn ${!matchExotic ? 'selected' : ''}`} onClick={() => setMatchExotic(false)}>⚗️ All</button>
            <button className={`round-btn ${matchExotic ? 'selected' : ''}`} onClick={() => setMatchExotic(true)}>☢️ Exotic</button>
          </div>
        )}
        {gameMode === 'element-match' && (
          <div className="rounds-select" style={{ alignItems: 'center' }}>
            <label>Target: </label>
            <button
              className={`round-btn ${huntTargetMode === 'none' ? 'selected' : ''}`}
              onClick={() => { setHuntTargetMode('none'); setHuntTargetElementNum(null); setHuntPickerOpen(false); }}
            >
              None
            </button>
            <button
              className={`round-btn ${huntTargetMode === 'random' ? 'selected' : ''}`}
              onClick={() => { setHuntTargetMode('random'); setHuntTargetElementNum(null); setHuntPickerOpen(false); }}
            >
              Random
            </button>
            <button
              className={`round-btn ${huntTargetMode === 'choose' ? 'selected' : ''}`}
              onClick={() => { setHuntTargetMode('choose'); setHuntPickerOpen(true); }}
            >
              {huntTargetElementNum
                ? `Choose: ${elements.find(e => e.atomicNumber === huntTargetElementNum)?.symbol ?? '?'}`
                : 'Choose Element'}
            </button>
          </div>
        )}
        {gameMode === 'element-match' && huntTargetMode !== 'none' && (
          <div className="rounds-select" style={{ alignItems: 'center' }}>
            <label>Unlock after: </label>
            {[0, 1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={`round-btn ${huntRequiredPairs === n ? 'selected' : ''}`}
                onClick={() => setHuntRequiredPairs(n)}
              >
                {n}
              </button>
            ))}
            <span className="gm-desc">pairs</span>
          </div>
        )}
        {gameMode === 'element-match' && huntPickerOpen && (
          <div className="hunt-picker">
            <input
              className="player-name-input"
              value={huntSearch}
              onChange={e => setHuntSearch(e.target.value)}
              placeholder="Search element"
              maxLength={24}
            />
            <div className="hunt-element-grid">
              {elements
                .filter(el => {
                  const q = huntSearch.trim().toLowerCase();
                  return !q || el.name.toLowerCase().includes(q) || el.symbol.toLowerCase().includes(q) || String(el.atomicNumber) === q;
                })
                .slice(0, 36)
                .map(el => (
                  <button
                    key={el.atomicNumber}
                    className={`hunt-element-btn ${huntTargetElementNum === el.atomicNumber ? 'selected' : ''}`}
                    onClick={() => {
                      setHuntTargetMode('choose');
                      setHuntTargetElementNum(el.atomicNumber);
                      setHuntPickerOpen(false);
                    }}
                  >
                    <span>{el.symbol}</span>
                    <small>{el.atomicNumber}. {el.name}</small>
                  </button>
                ))}
            </div>
          </div>
        )}
        {gameMode === 'championship' && (
          <>
            <div className="rounds-select">
              <label>Size: </label>
              {(Object.keys(CHAMP_SIZE_CONFIG) as ChampSize[]).map(s => (
                <button
                  key={s}
                  className={`round-btn ${champSize === s ? 'selected' : ''}`}
                  onClick={() => setChampSize(s)}
                  title={CHAMP_SIZE_CONFIG[s].desc}
                >
                  {CHAMP_SIZE_CONFIG[s].label}
                </button>
              ))}
            </div>
            <div className="champ-game-picker">
              <label>Games (choose at least 2):</label>
              <div className="champ-games-list">
                {DEFAULT_CHAMP_GAMES.map(mode => {
                  const selected = selectedChampGames.includes(mode);
                  return (
                    <button
                      key={mode}
                      className={`champ-game-chip champ-game-toggle ${selected ? 'selected' : ''}`}
                      onClick={() => setSelectedChampGames(current => {
                        if (current.includes(mode)) {
                          return current.length <= 2 ? current : current.filter(game => game !== mode);
                        }
                        return DEFAULT_CHAMP_GAMES.filter(game => current.includes(game) || game === mode);
                      })}
                      aria-pressed={selected}
                    >
                      {selected ? '✓ ' : ''}{CHAMP_LABELS[mode]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounds-select">
              <label>Match pool: </label>
              <button className={`round-btn ${!matchExotic ? 'selected' : ''}`} onClick={() => setMatchExotic(false)}>⚗️ All</button>
              <button className={`round-btn ${matchExotic ? 'selected' : ''}`} onClick={() => setMatchExotic(true)}>☢️ Exotic</button>
            </div>
            <div className="rounds-select" style={{ alignItems: 'center' }}>
              <label>Match target: </label>
              <button
                className={`round-btn ${huntTargetMode === 'none' ? 'selected' : ''}`}
                onClick={() => { setHuntTargetMode('none'); setHuntTargetElementNum(null); setHuntPickerOpen(false); }}
              >
                None
              </button>
              <button
                className={`round-btn ${huntTargetMode === 'random' ? 'selected' : ''}`}
                onClick={() => { setHuntTargetMode('random'); setHuntTargetElementNum(null); setHuntPickerOpen(false); }}
              >
                Random
              </button>
              <button
                className={`round-btn ${huntTargetMode === 'choose' ? 'selected' : ''}`}
                onClick={() => { setHuntTargetMode('choose'); setHuntPickerOpen(true); }}
              >
                {huntTargetElementNum
                  ? `Choose: ${elements.find(e => e.atomicNumber === huntTargetElementNum)?.symbol ?? '?'}`
                  : 'Choose Element'}
              </button>
            </div>
            {huntTargetMode !== 'none' && (
              <div className="rounds-select" style={{ alignItems: 'center' }}>
                <label>Unlock after: </label>
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`round-btn ${huntRequiredPairs === n ? 'selected' : ''}`}
                    onClick={() => setHuntRequiredPairs(n)}
                  >
                    {n}
                  </button>
                ))}
                <span className="gm-desc">pairs</span>
              </div>
            )}
            {huntPickerOpen && (
              <div className="hunt-picker">
                <input
                  className="player-name-input"
                  value={huntSearch}
                  onChange={e => setHuntSearch(e.target.value)}
                  placeholder="Search element"
                  maxLength={24}
                />
                <div className="hunt-element-grid">
                  {elements
                    .filter(el => {
                      const q = huntSearch.trim().toLowerCase();
                      return !q || el.name.toLowerCase().includes(q) || el.symbol.toLowerCase().includes(q) || String(el.atomicNumber) === q;
                    })
                    .slice(0, 36)
                    .map(el => (
                      <button
                        key={el.atomicNumber}
                        className={`hunt-element-btn ${huntTargetElementNum === el.atomicNumber ? 'selected' : ''}`}
                        onClick={() => {
                          setHuntTargetMode('choose');
                          setHuntTargetElementNum(el.atomicNumber);
                          setHuntPickerOpen(false);
                        }}
                      >
                        <span>{el.symbol}</span>
                        <small>{el.atomicNumber}. {el.name}</small>
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="champ-info">
              <div className="champ-games-list">
                {selectedChampGames.map(mode => (
                  <span key={mode} className="champ-game-chip">
                    {CHAMP_LABELS[mode]} <strong>{CHAMP_SIZE_CONFIG[champSize].counts[mode as Exclude<GameMode, 'championship'>]}</strong> {mode === 'element-match' ? 'pairs' : 'rounds'}
                  </span>
                ))}
              </div>
              <p className="champ-info-footer">{selectedChampGames.length} games selected — scores add up across the Championship.</p>
            </div>
          </>
        )}

        <button className="start-btn" onClick={startGame}>Start!</button>
      </div>
    );
  }

  // --- PLAYING: Quiz Battle ---
  if (phase === 'playing' && gameMode === 'quiz-battle') {
    const cp = currentPlayer === 1 ? player1 : player2;
    const questions = currentPlayer === 1 ? p1Questions : p2Questions;
    const streak = currentPlayer === 1 ? p1Streak : p2Streak;
    const autoSelectIndex = currentPlayer === 2 && player2Mode === 'bot' && questions[qIndex]
      ? pickBotChoice(questions[qIndex].correctIndex, questions[qIndex].choices.length, player2.difficulty)
      : null;

    if (!questions[qIndex]) return null;

    return (
      <div className="quiz-playing two-player-playing">
        {quitOverlay}
        <div className="two-player-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <div className="player-indicator">
            <span className="player-avatar">{cp.avatar}</span>
            <span className="player-name">{isBotTurn ? `${player2.name} is thinking...` : `${cp.name}'s Turn`}</span>
            <span className="player-diff">Round {currentRound}/{rounds}</span>
          </div>
          <div className="two-player-scores">
            <span className={`player-score-chip ${currentPlayer === 1 ? 'active p1' : ''}`}>{player1.avatar} {p1Score}✓</span>
            <span>vs</span>
            <span className={`player-score-chip ${currentPlayer === 2 ? 'active p2' : ''}`}>{p2Score}✓ {player2.avatar}</span>
          </div>
        </div>
        {renderTurnBanner(currentPlayer as 1 | 2, `Question ${currentRound} of ${rounds}`)}
        {championshipTotalsBar}
        <div>
          <QuizCard
            question={questions[qIndex]}
            difficulty={cp.difficulty}
            streak={streak}
            questionNumber={currentRound}
            totalQuestions={rounds}
            onAnswer={(correct, points) => handleQuizAnswer(correct, points)}
            timedMode={false}
            autoSelectIndex={autoSelectIndex}
            autoAdvanceDelayMs={null}
            disableChoiceInput={isBotTurn}
          />
        </div>
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
            <span>{isBotTurn ? `${player2.avatar} ${player2.name} is thinking...` : `${cp.avatar} ${cp.name}'s turn`}</span>
            <span className="tf-round">Round {roundNum}/{totalRounds}</span>
          </div>
          <div className="tf-scores">
            <span className={`player-score-chip ${tfTurn === 1 ? 'active p1' : ''}`}>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span className={`player-score-chip ${tfTurn === 2 ? 'active p2' : ''}`}>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        {renderTurnBanner(tfTurn as 1 | 2, `Round ${roundNum} of ${totalRounds}`)}
        {championshipTotalsBar}

        <div className="tf-statement-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <p className="tf-statement" style={{ flex: 1, margin: 0 }}>{stmt.text}</p>
            <button className="tts-btn tts-btn-small" onClick={() => speakText(stmt.text)} title="Read aloud">🔊</button>
          </div>
          {!tfShowResult && (
            <div className="tf-timer-bar">
              <div className={`tf-timer-fill ${tfTimer <= 3 ? 'urgent' : ''}`} style={{ width: `${(tfTimer / TF_SECONDS) * 100}%` }} />
            </div>
          )}
          {!tfShowResult && <span className={`tf-timer-num ${tfTimer <= 3 ? 'urgent' : ''}`}>{tfTimer}s</span>}
        </div>

        {!tfShowResult ? (
          <div className="tf-buttons">
            <button className="tf-btn tf-true" onClick={() => handleTFAnswer(true)} disabled={isBotTurn}>✅ True</button>
            <button className="tf-btn tf-false" onClick={() => handleTFAnswer(false)} disabled={isBotTurn}>❌ False</button>
          </div>
        ) : (
          <div className="tf-result-feedback">
            <p className={`tf-verdict ${tfAnswered !== null && tfAnswered === stmt.answer ? 'correct' : 'wrong'}`}>
              {tfAnswered === null ? '⏰ Time\'s up!' : tfAnswered === stmt.answer ? '🎉 Correct!' : '😬 Wrong!'}
            </p>
            <p className="tf-explanation" style={{ margin: '0 0 0.5rem', opacity: 0.9 }}>
              Correct answer: <strong>{stmt.answer ? 'True' : 'False'}</strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: '0 0 0.75rem' }}>
              <p className="tf-explanation" style={{ flex: 1, margin: 0 }}>{stmt.explanation}</p>
              <button className="tts-btn tts-btn-small" onClick={() => speakText(stmt.explanation)} title="Read aloud">🔊</button>
            </div>
            <button className="start-btn" onClick={nextTFRound} disabled={isBotTurn}>
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
    const huntTarget = elements.find(e => e.atomicNumber === huntTargetElementNum);
    const claimedPairs = Math.floor(matchCards.filter(c => c.matched).length / 2);
    const targetUnlocked = claimedPairs >= huntRequiredPairs;
    return (
      <div className="element-match-playing">
        {quitOverlay}
        <div className="match-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <span className="match-turn">{isBotTurn ? `${player2.avatar} ${player2.name} is thinking...` : `${cp.avatar} ${cp.name}'s turn`}</span>
          <div className="match-scores">
            <span className={`player-score-chip ${matchTurn === 1 ? 'active p1' : ''}`}>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span className={`player-score-chip ${matchTurn === 2 ? 'active p2' : ''}`}>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        {renderTurnBanner(matchTurn as 1 | 2)}
        {championshipTotalsBar}
        {huntTarget && (
          <div className="hunt-target-banner">
            Target: <strong>{huntTarget.name} ({huntTarget.symbol})</strong>
            {huntRequiredPairs > 0 && (
              <span className="hunt-unlock-status">
                {targetUnlocked
                  ? 'Unlocked'
                  : `Unlocks after ${huntRequiredPairs} pair${huntRequiredPairs === 1 ? '' : 's'} (${claimedPairs}/${huntRequiredPairs})`}
              </span>
            )}
          </div>
        )}
        {huntFoundMessage && <p className="hunt-found-message">{huntFoundMessage}</p>}
        <div className="match-grid" style={{ gridTemplateColumns: `repeat(4, 1fr)` }}>
          {matchCards.map(card => {
            const matchClass = card.matched
              ? card.matchedBy === 1 ? 'matched matched-p1' : 'matched matched-p2'
              : '';
            const activeChoiceClass = card.flipped && !card.matched
              ? (matchTurn === 1 ? 'active-p1' : 'active-p2')
              : '';
            return (
              <button
                key={card.id}
                className={`match-card ${card.flipped || card.matched ? 'flipped' : ''} ${activeChoiceClass} ${matchClass}`}
                onClick={() => handleMatchFlip(card.id)}
                disabled={isBotTurn || card.matched || card.flipped}
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
          <span className="snap-round">Element {Math.floor(snapIndex / 2) + 1}/{Math.floor(snapRounds.length / 2)} each</span>
          <div className="snap-scores">
            <span className={`player-score-chip ${snapTurn === 1 ? 'active p1' : ''}`}>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span className={`player-score-chip ${snapTurn === 2 ? 'active p2' : ''}`}>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        {renderTurnBanner(snapTurn as 1 | 2, `Clue ${snapClueIdx + 1} of 5`)}
        {championshipTotalsBar}

        {snapAnswered === null && (
          <>
            {snapFirstWrongBy !== null && (
              <div className="snap-wrong-banner">
                ❌ {snapFirstWrongBy === 1 ? player1.avatar + ' ' + player1.name : player2.avatar + ' ' + player2.name} got it wrong! {activePlayer.avatar} {activePlayer.name} — bonus chance!
              </div>
            )}
            <p className="snap-buzzer-name">
              {isBotTurn
                ? `${player2.avatar} ${player2.name} is thinking...`
                : snapFirstWrongBy !== null
                ? `Guess now — ${Math.min(snapClueIdx + 1, 5)} clues visible!`
                : `${activePlayer.avatar} ${activePlayer.name}'s turn — guess or pass!`}
            </p>
          </>
        )}

        <div className="snap-clues-list">
          {visibleClues.map((clue, i) => (
            <div key={i} className={`snap-clue-item ${i === visibleClues.length - 1 ? 'snap-clue-new' : ''}`}>
              <span className="snap-clue-num">Clue {i + 1}</span>
              <span className="snap-clue-text">{clue}</span>
              {i === visibleClues.length - 1 && (
                <button className="tts-btn tts-btn-small" onClick={() => speakText(clue)} title="Read clue aloud">🔊</button>
              )}
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
                  disabled={isBotTurn}
                >{ch}</button>
              ))}
            </div>
            <button className="start-btn" onClick={handleClueNext} disabled={isBotTurn}>
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
              <div style={{ background: '#ff3b3b22', border: '2px solid var(--danger)', borderRadius: 14, padding: '0.8rem 1.2rem', marginBottom: '0.8rem' }}>
                <p className="snap-verdict wrong" style={{ margin: 0, fontSize: '1.6rem' }}>❌ Both wrong!</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>It was <strong style={{ fontSize: '1.3rem' }}>{round.correctName}</strong></p>
                  <button className="tts-btn tts-btn-small" onClick={() => speakText(`The answer was ${round.correctName}`)} title="Read aloud">🔊</button>
                </div>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted, #888)', fontSize: '0.9rem' }}>No points this round.</p>
              </div>
            )}
            <button className="start-btn" onClick={nextSnapRound} disabled={isBotTurn}>
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
          <span className="snap-round">{Math.floor(symbolIndex / 2) + 1}/{Math.floor(symbolRounds.length / 2)}</span>
          <div className="snap-scores">
            <span className={`player-score-chip ${symbolTurn === 1 ? 'active p1' : ''}`}>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span className={`player-score-chip ${symbolTurn === 2 ? 'active p2' : ''}`}>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        {renderTurnBanner(symbolTurn as 1 | 2, `Question ${symbolIndex + 1} of ${symbolRounds.length}`)}
        {championshipTotalsBar}
        <p className="snap-buzzer-name">{isBotTurn ? `${player2.avatar} ${player2.name} is thinking...` : `${cp.avatar} ${cp.name} — pick the symbol for:`}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 0 1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{round.elementName}</h2>
          <button className="tts-btn tts-btn-small" onClick={() => speakText(round.elementName)} title="Read aloud">🔊</button>
        </div>
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
                disabled={isBotTurn || answered}
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
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <p className="snap-verdict wrong" style={{ margin: 0 }}>😬 Nope! {round.elementName} = <strong>{round.correctSymbol}</strong></p>
                  <button className="tts-btn tts-btn-small" onClick={() => speakText(`${round.elementName} is ${round.correctSymbol}`)} title="Read aloud">🔊</button>
                </div>}
            <button className="start-btn" onClick={nextSymbolRound} disabled={isBotTurn}>
              {symbolIndex + 1 >= symbolRounds.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- PLAYING: Atom Quiz ---
  if (phase === 'playing' && gameMode === 'atom-quiz' && atomQuestions.length > 0) {
    const q = atomQuestions[atomIndex];
    const cp = atomTurn === 1 ? player1 : player2;
    return (
      <div className="snap-playing">
        {quitOverlay}
        <div className="snap-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <span className="snap-round">⚛️ {Math.floor(atomIndex / 2) + 1}/{Math.floor(atomQuestions.length / 2)}</span>
          <div className="snap-scores">
            <span className={`player-score-chip ${atomTurn === 1 ? 'active p1' : ''}`}>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span className={`player-score-chip ${atomTurn === 2 ? 'active p2' : ''}`}>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        {renderTurnBanner(atomTurn as 1 | 2, `Question ${atomIndex + 1} of ${atomQuestions.length}`)}
        {championshipTotalsBar}
        <p className="snap-buzzer-name">{isBotTurn ? `${player2.avatar} ${player2.name} is thinking...` : `${cp.avatar} ${cp.name}'s turn`}</p>
        {q.illustration && <div style={{ textAlign: 'center', fontSize: '2.5rem', margin: '0.25rem 0' }}>{q.illustration}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 1rem 1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, textAlign: 'center' }}>{q.questionText}</h2>
          <button className="tts-btn tts-btn-small" onClick={() => speakText(q.questionText)} title="Read aloud">🔊</button>
        </div>
        <div className="aq-choices">
          {q.choices.map((ch, i) => {
            const finalAnswered = atomAnswered !== null;
            const isFirstWrong = atomFirstWrong === i;
            const isChosen = atomAnswered === i;
            const isRight = i === q.correctIndex;
            const cls = finalAnswered
              ? isRight ? 'aq-choice correct' : isChosen ? 'aq-choice wrong' : 'aq-choice'
              : atomSecondChance && isFirstWrong ? 'aq-choice wrong'
              : 'aq-choice';
            return (
              <button
                key={i}
                className={cls}
                disabled={isBotTurn || finalAnswered || (atomSecondChance && isFirstWrong)}
                onClick={() => handleAtomAnswer(i)}
              >
                {ch}
              </button>
            );
          })}
        </div>
        {atomSecondChance && atomAnswered === null && (
          <p style={{ textAlign: 'center', color: '#ffaa44', margin: '0.5rem 1rem' }}>Not quite — try again! 🤔</p>
        )}
        {atomAnswered !== null && (
          <div className="snap-result-feedback">
            {atomAnswered === q.correctIndex
              ? <p className="snap-verdict correct">🎉 Correct! +1 to {cp.avatar} {cp.name}!</p>
              : <p className="snap-verdict wrong">😬 Nope! The answer was: <strong>{q.choices[q.correctIndex]}</strong></p>}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: '0 1rem 0.75rem' }}>
              <p style={{ flex: 1, margin: 0, textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{q.explanation}</p>
              <button className="tts-btn tts-btn-small" onClick={() => speakText(q.explanation)} title="Read explanation aloud">🔊</button>
            </div>
            <button className="start-btn" onClick={nextAtomRound} disabled={isBotTurn}>
              {atomIndex + 1 >= atomQuestions.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- PLAYING: Atomic Order ---
  if (phase === 'playing' && gameMode === 'atomic-order' && orderTiles.length >= 3) {
    const currentResult = orderTurnResult;
    const elapsedMs = currentResult?.elapsedMs ?? orderElapsed;
    const currentPlayerConfig = orderTurn === 1 ? player1 : player2;
    return (
      <div className="atomic-order-playing two-player-playing">
        {quitOverlay}
        <div className="two-player-header">
          <button className="quiz-exit-btn" onClick={() => setShowQuitConfirm(true)} title="Quit">✕</button>
          <div className="player-indicator">
            <span className="player-avatar">{currentPlayerConfig.avatar}</span>
            <span className="player-name">{isBotTurn ? `${player2.name} is ordering...` : `${currentPlayerConfig.name}'s Turn`}</span>
            <span className="player-diff">Round {orderRoundIndex + 1}/{orderRounds.length}</span>
          </div>
          <div className="two-player-scores">
            <span className={`player-score-chip ${orderTurn === 1 ? 'active p1' : ''}`}>{player1.avatar} {p1Score}</span>
            <span>vs</span>
            <span className={`player-score-chip ${orderTurn === 2 ? 'active p2' : ''}`}>{p2Score} {player2.avatar}</span>
          </div>
        </div>
        {renderTurnBanner(orderTurn, orderTimerStarted ? `Attempt ${orderAttempts + 1} · ${(elapsedMs / 1000).toFixed(1)}s` : 'Ready to start')}
        {championshipTotalsBar}

        <div className="atomic-order-card">
          <h2>Put {orderTiles.length} elements in atomic-number order</h2>
          <p className="atomic-order-instruction">Lowest to highest. Attempts are unlimited; the fastest time wins the point.</p>
          {!orderTimerStarted && !currentResult && (
            <div className="atomic-order-ready">
              <p>The elements will appear when the timer starts.</p>
              <button className="start-btn" onClick={startAtomicOrderTimer} disabled={isBotTurn}>Start Timer</button>
            </div>
          )}
          {(orderTimerStarted || currentResult) && <>
          <div className="atomic-order-direction"><span>LOWEST</span><span>→</span><span>HIGHEST</span></div>
          <div className="atomic-order-tiles" style={{ gridTemplateColumns: `repeat(${orderTiles.length}, minmax(0, 1fr))` }}>
            {orderTiles.map((atomicNumber, index) => {
              const el = elements.find(item => item.atomicNumber === atomicNumber)!;
              const feedback = orderFeedback[index];
              return (
                <button
                  key={atomicNumber}
                  className={`atomic-order-tile ${feedback ?? ''} ${orderSelected === index ? 'selected' : ''}`}
                  draggable={orderTimerStarted && !currentResult && !isBotTurn}
                  onDragStart={event => event.dataTransfer.setData('text/plain', String(index))}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    moveAtomicOrderTile(Number(event.dataTransfer.getData('text/plain')), index);
                  }}
                  onClick={() => selectAtomicOrderTile(index)}
                  disabled={Boolean(currentResult) || isBotTurn}
                >
                  <strong>{el.symbol}</strong>
                  <span>{el.name}</span>
                  {currentResult?.solved && <span className="atomic-order-number">Atomic no. {el.atomicNumber}</span>}
                  {feedback === 'correct' && <small>✓ Correct</small>}
                  {feedback === 'left' && <small>← Move left</small>}
                  {feedback === 'right' && <small>Move right →</small>}
                </button>
              );
            })}
          </div>

          {!currentResult ? (
            <button className="start-btn" onClick={submitAtomicOrder} disabled={isBotTurn}>Check order</button>
          ) : (
            <div className="atomic-order-result">
              <h3>✅ Correct in {currentResult.attempts} {currentResult.attempts === 1 ? 'try' : 'tries'}!</h3>
              <p>Time: {(currentResult.elapsedMs / 1000).toFixed(1)} seconds</p>
              {orderRoundComplete && (
                <>
                  <div className="atomic-order-comparison">
                    <span>{player1.avatar} {orderP1Result ? `${orderP1Result.attempts} tries · ${(orderP1Result.elapsedMs / 1000).toFixed(1)}s` : '—'}</span>
                    <span>{player2.avatar} {currentResult.attempts} tries · {(currentResult.elapsedMs / 1000).toFixed(1)}s</span>
                  </div>
                  <p className="atomic-order-round-winner">
                    {orderRoundWinner === 1
                      ? `${player1.avatar} ${player1.name} wins the point!`
                      : orderRoundWinner === 2
                        ? `${player2.avatar} ${player2.name} wins the point!`
                        : 'Round tied — no point awarded.'}
                  </p>
                </>
              )}
              <button className="start-btn" onClick={nextAtomicOrderStage} disabled={isBotTurn}>
                {orderTurn === 1
                  ? `Pass to ${player2.name} →`
                  : orderRoundIndex + 1 >= orderRounds.length
                    ? 'See Results'
                    : 'Next Round →'}
              </button>
            </div>
          )}
          </>}
        </div>
      </div>
    );
  }

  // --- CHAMPIONSHIP: Between-games interstitial ---
  if (phase === 'champ-between') {
    const justFinished = activeChampGames[champStep];
    const nextGame = activeChampGames[champStep + 1];
    // champScores already includes the just-finished game (pushed in finishCurrentGame)
    const totalP1 = champScores.reduce((s, g) => s + g.p1Champ, 0);
    const totalP2 = champScores.reduce((s, g) => s + g.p2Champ, 0);
    const justWinner = p1Score > p2Score ? player1 : p2Score > p1Score ? player2 : null;
    return (
      <div className="champ-between">
        <div className="champ-between-header">
          <h2>🏆 Championship — Game {champStep + 1} of {activeChampGames.length}</h2>
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
          <h3>Running Championship Points</h3>
          <div className="champ-total-row">
            <span>{player1.avatar} {player1.name}: <strong>{totalP1}</strong></span>
            <span>{player2.avatar} {player2.name}: <strong>{totalP2}</strong></span>
          </div>
          <p>Total points are the sum of all scores across all games.</p>
        </div>

        <button className="start-btn" onClick={nextChampGame}>
          Next: {CHAMP_LABELS[nextGame]} →
        </button>
      </div>
    );
  }

  // --- CHAMPIONSHIP: Final result ---
  if (phase === 'champ-result') {
    // champScores already includes the final game (pushed in finishCurrentGame)
    const allScores = champScores;
    const rawTotalP1 = allScores.reduce((s, g) => s + g.p1Raw, 0);
    const rawTotalP2 = allScores.reduce((s, g) => s + g.p2Raw, 0);
    const totalP1 = allScores.reduce((s, g) => s + g.p1Champ, 0);
    const totalP2 = allScores.reduce((s, g) => s + g.p2Champ, 0);
    const champWinner = totalP1 > totalP2
      ? player1
      : totalP2 > totalP1
        ? player2
        : rawTotalP1 > rawTotalP2
          ? player1
          : rawTotalP2 > rawTotalP1
            ? player2
            : null;
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
              {activeChampGames.map((g, i) => (
                <tr key={g} className={allScores[i]?.p1Raw > allScores[i]?.p2Raw ? 'p1-won' : allScores[i]?.p2Raw > allScores[i]?.p1Raw ? 'p2-won' : ''}>
                  <td>{CHAMP_LABELS[g]}</td>
                  <td>{allScores[i] ? allScores[i].p1Raw : '-'}</td>
                  <td>{allScores[i] ? allScores[i].p2Raw : '-'}</td>
                </tr>
              ))}
              <tr className="champ-total-row">
                <td><strong>Champ Total</strong></td>
                <td><strong>{totalP1}</strong></td>
                <td><strong>{totalP2}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>The champion has the highest total across the {activeChampGames.length} selected games.</p>
        {(rawTotalP1 !== totalP1 || rawTotalP2 !== totalP2) && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '-0.5rem' }}>
            Raw totals were {rawTotalP1} vs {rawTotalP2}. Championship scoring rules were applied.
          </p>
        )}
        {!champWinner && (
          <button className="start-btn" style={{ marginBottom: '0.75rem' }} onClick={startChampTiebreaker}>
            🃏 Tiebreaker — 12-Card Memory Match!
          </button>
        )}
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
    const modeLabel = isChampTiebreaker ? 'Championship Tiebreaker'
      : gameMode === 'quiz-battle' ? 'Quiz Battle'
      : gameMode === 'tf-blitz' ? 'True or False Blitz'
      : gameMode === 'clue-duel' ? 'Clue Duel'
      : gameMode === 'symbol-pick' ? 'Symbol Pick'
      : gameMode === 'atom-quiz' ? 'Atom Quiz'
      : gameMode === 'atomic-order' ? 'Atomic Order'
      : 'Element Match Hunt';
    const tiebreakerDraw = isChampTiebreaker && !winner;
    return (
      <div className="two-player-result">
        <Elementor
          expression="celebrate"
          message={
            tiebreakerDraw
              ? "Incredible — still a draw! You’re co-champions! 🤝❤️"
              : winner
              ? `${winner.avatar} ${winner.name} wins the ${modeLabel}!`
              : "It's a draw! You're both element champions! 🤝"
          }
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
          {isChampTiebreaker ? (
            <>
              {!tiebreakerDraw && <button className="start-btn" onClick={() => { setIsChampTiebreaker(false); startChampTiebreaker(); }}>Play Again!</button>}
              {tiebreakerDraw && <button className="start-btn" onClick={() => { setIsChampTiebreaker(false); startChampTiebreaker(); }}>Another Tiebreaker!</button>}
              <button className="back-btn" onClick={() => { setIsChampTiebreaker(false); onComplete(); }}>Home</button>
            </>
          ) : (
            <>
              <button className="start-btn" onClick={startGame}>Rematch!</button>
              <button className="back-btn" onClick={() => setPhase('mode-select')}>Change Game</button>
              <button className="back-btn" onClick={onComplete}>Home</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}


