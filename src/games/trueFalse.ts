import { elements } from '../data/elements.ts';
import { pickRelatableTrivia } from '../engine/questionGenerator.ts';

export type TrueFalseStatement = {
  text: string;
  answer: boolean;
  explanation: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  'alkali-metal': 'an alkali metal',
  'alkaline-earth-metal': 'an alkaline earth metal',
  'transition-metal': 'a transition metal',
  'post-transition-metal': 'a post-transition metal',
  metalloid: 'a metalloid',
  nonmetal: 'a nonmetal',
  halogen: 'a halogen',
  'noble-gas': 'a noble gas',
  lanthanide: 'a lanthanide',
  actinide: 'an actinide',
};

function shuffleArray<T>(values: T[]): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function generateTrueFalseStatements(count: number, pool: number = 36): TrueFalseStatement[] {
  const poolElements = shuffleArray(elements.slice(0, pool));
  const statements: TrueFalseStatement[] = [];

  for (let i = 0; i < count && i < poolElements.length; i++) {
    const el = poolElements[i];
    const type = Math.floor(Math.random() * 17);
    const isTrue = Math.random() > 0.5;

    if (type === 0) {
      if (isTrue) {
        statements.push({ text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
      } else {
        const wrong = shuffleArray(elements.filter(candidate => candidate.symbol !== el.symbol))[0];
        statements.push({ text: `The symbol for ${el.name} is ${wrong.symbol}.`, answer: false, explanation: `Nope! ${el.name}'s symbol is ${el.symbol}, not ${wrong.symbol}.` });
      }
    } else if (type === 1) {
      if (isTrue) {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct — ${el.name} is a ${el.stateAtRoomTemp}.` });
      } else {
        const wrongState = el.stateAtRoomTemp === 'gas' ? 'solid' : el.stateAtRoomTemp === 'solid' ? 'gas' : 'solid';
        statements.push({ text: `${el.name} is a ${wrongState} at room temperature.`, answer: false, explanation: `No, ${el.name} is actually a ${el.stateAtRoomTemp} at room temperature.` });
      }
    } else if (type === 2) {
      const categoryLabel = CATEGORY_LABELS[el.category] || el.category;
      if (isTrue) {
        statements.push({ text: `${el.name} is ${categoryLabel}.`, answer: true, explanation: `Yes, ${el.name} is classified as ${categoryLabel}.` });
      } else {
        const wrongCategory = shuffleArray(Object.entries(CATEGORY_LABELS).filter(([category]) => category !== el.category))[0];
        statements.push({ text: `${el.name} is ${wrongCategory[1]}.`, answer: false, explanation: `No, ${el.name} is ${categoryLabel}, not ${wrongCategory[1]}.` });
      }
    } else if (type === 3) {
      const other = shuffleArray(elements.filter(candidate => candidate.atomicNumber !== el.atomicNumber))[0];
      const bigger = el.atomicNumber > other.atomicNumber;
      if (isTrue === bigger) {
        statements.push({ text: `${el.name} has a higher atomic number than ${other.name}.`, answer: bigger, explanation: `${el.name} is #${el.atomicNumber} and ${other.name} is #${other.atomicNumber}.` });
      } else {
        statements.push({ text: `${el.name} has a lower atomic number than ${other.name}.`, answer: !bigger, explanation: `${el.name} is #${el.atomicNumber} and ${other.name} is #${other.atomicNumber}.` });
      }
    } else if (type === 4) {
      if (isTrue) {
        statements.push({ text: `${el.name} is ${el.radioactive ? '' : 'not '}radioactive.`, answer: true, explanation: `Correct! ${el.name} is ${el.radioactive ? '' : 'not '}radioactive.` });
      } else {
        statements.push({ text: `${el.name} is ${el.radioactive ? 'not ' : ''}radioactive.`, answer: false, explanation: `Actually, ${el.name} is ${el.radioactive ? '' : 'not '}radioactive.` });
      }
    } else if (type === 5) {
      if (isTrue && el.discoveredBy) {
        statements.push({ text: `${el.name} was discovered by ${el.discoveredBy}.`, answer: true, explanation: `Yes! ${el.discoveredBy} discovered ${el.name}.` });
      } else {
        const wrongDiscoverer = shuffleArray(elements.filter(candidate => candidate.discoveredBy && candidate.discoveredBy !== el.discoveredBy))[0];
        statements.push({ text: `${el.name} was discovered by ${wrongDiscoverer?.discoveredBy || 'Unknown'}.`, answer: false, explanation: `No, ${el.name} was discovered by ${el.discoveredBy || 'ancient peoples'}.` });
      }
    } else if (type === 6) {
      if (isTrue) {
        statements.push({ text: `${el.name} is in period ${el.period} of the periodic table.`, answer: true, explanation: `Yes! ${el.name} is in period ${el.period}.` });
      } else {
        const wrongPeriod = el.period <= 4 ? el.period + 2 : el.period - 2;
        statements.push({ text: `${el.name} is in period ${wrongPeriod} of the periodic table.`, answer: false, explanation: `No — ${el.name} is in period ${el.period}, not period ${wrongPeriod}.` });
      }
    } else if (type === 7) {
      if (el.group !== null) {
        const sameGroup = elements.filter(candidate => candidate.group === el.group && candidate.name !== el.name);
        const differentGroup = elements.filter(candidate => candidate.group !== null && candidate.group !== el.group && candidate.name !== el.name);
        if (sameGroup.length > 0 && differentGroup.length > 0) {
          const other = shuffleArray(isTrue ? sameGroup : differentGroup)[0];
          statements.push(isTrue
            ? { text: `${el.name} and ${other.name} are in the same group.`, answer: true, explanation: `Yes! Both are in group ${el.group}.` }
            : { text: `${el.name} and ${other.name} are in the same group.`, answer: false, explanation: `No — ${el.name} is in group ${el.group}, but ${other.name} is in group ${other.group}.` });
        } else {
          statements.push({ text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
        }
      } else {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct — ${el.name} is a ${el.stateAtRoomTemp}.` });
      }
    } else if (type === 8) {
      if (el.uses.length > 0) {
        const use = el.uses[Math.floor(Math.random() * el.uses.length)];
        if (isTrue) {
          statements.push({ text: `${el.name} is used for: ${use}.`, answer: true, explanation: `Correct! ${el.name} really is used for ${use}.` });
        } else {
          const other = shuffleArray(elements.filter(candidate => candidate.uses.length > 0 && candidate.name !== el.name))[0];
          const wrongUse = other.uses[Math.floor(Math.random() * other.uses.length)];
          statements.push({ text: `${el.name} is used for: ${wrongUse}.`, answer: false, explanation: `No — that's a use for ${other.name}. ${el.name} is used for ${use}.` });
        }
      } else {
        statements.push({ text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
      }
    } else if (type === 9) {
      const other = shuffleArray(elements.filter(candidate => Math.abs(candidate.atomicMass - el.atomicMass) > 2 && candidate.name !== el.name))[0]
        || shuffleArray(elements.filter(candidate => candidate.name !== el.name))[0];
      const heavier = el.atomicMass > other.atomicMass;
      statements.push(isTrue === heavier
        ? { text: `${el.name} has a higher atomic mass than ${other.name}.`, answer: heavier, explanation: `${el.name}'s atomic mass is ${el.atomicMass} and ${other.name}'s is ${other.atomicMass}.` }
        : { text: `${el.name} has a lower atomic mass than ${other.name}.`, answer: !heavier, explanation: `${el.name}'s atomic mass is ${el.atomicMass} and ${other.name}'s is ${other.atomicMass}.` });
    } else if (type === 10) {
      if (el.compounds.length > 0) {
        const compound = el.compounds[Math.floor(Math.random() * el.compounds.length)];
        if (isTrue) {
          statements.push({ text: `${compound} is a compound that contains ${el.name}.`, answer: true, explanation: `Correct! ${compound} is listed as one of ${el.name}'s compounds.` });
        } else {
          const other = shuffleArray(elements.filter(candidate => candidate.compounds.length > 0 && candidate.name !== el.name))[0];
          const wrongCompound = other.compounds[Math.floor(Math.random() * other.compounds.length)];
          statements.push({ text: `${wrongCompound} is a compound that contains ${el.name}.`, answer: false, explanation: `No — ${wrongCompound} is connected with ${other.name}. One ${el.name} compound is ${compound}.` });
        }
      } else {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct — ${el.name} is a ${el.stateAtRoomTemp}.` });
      }
    } else if (type === 11) {
      if (isTrue) {
        statements.push({ text: `${el.name} is obtained from: ${el.obtainedFrom}.`, answer: true, explanation: `Yes! ${el.name} is usually obtained from ${el.obtainedFrom}.` });
      } else {
        const other = shuffleArray(elements.filter(candidate => candidate.obtainedFrom && candidate.name !== el.name))[0];
        statements.push({ text: `${el.name} is obtained from: ${other.obtainedFrom}.`, answer: false, explanation: `No — that describes ${other.name}. ${el.name} is obtained from ${el.obtainedFrom}.` });
      }
    } else if (type === 12) {
      if (el.radioactive) {
        statements.push({ text: `${el.name} is radioactive.`, answer: true, explanation: `Correct! ${el.name}'s most stable isotope has a half-life of ${el.halfLife}.` });
      } else if (isTrue) {
        statements.push({ text: `${el.name} has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}.`, answer: true, explanation: `Yes! ${el.name} has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}.` });
      } else {
        const wrongCount = Math.max(1, el.stableIsotopes + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1));
        statements.push({ text: `${el.name} has ${wrongCount} stable isotope${wrongCount === 1 ? '' : 's'}.`, answer: false, explanation: `No — ${el.name} has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}.` });
      }
    } else if (type === 13) {
      if (isTrue) {
        statements.push({ text: `${el.name} is in the ${el.block}-block of the periodic table.`, answer: true, explanation: `Correct! ${el.name}'s electron configuration places it in the ${el.block}-block.` });
      } else {
        const wrongBlock = shuffleArray(['s', 'p', 'd', 'f'].filter(block => block !== el.block))[0];
        statements.push({ text: `${el.name} is in the ${wrongBlock}-block of the periodic table.`, answer: false, explanation: `No — ${el.name} is in the ${el.block}-block.` });
      }
    } else if (type === 14) {
      const trivia = pickRelatableTrivia(el);
      if (trivia && isTrue) {
        statements.push({ text: `${el.name} is the answer to this clue: ${trivia.question}`, answer: true, explanation: trivia.explanation });
      } else {
        const other = shuffleArray(elements.filter(candidate => candidate.atomicNumber !== el.atomicNumber && pickRelatableTrivia(candidate)))[0];
        const otherTrivia = other ? pickRelatableTrivia(other) : null;
        statements.push(other && otherTrivia
          ? { text: `${el.name} is the answer to this clue: ${otherTrivia.question}`, answer: false, explanation: `No, that clue points to ${other.name}. ${otherTrivia.explanation}` }
          : { text: `The symbol for ${el.name} is ${el.symbol}.`, answer: true, explanation: `Yes! ${el.name}'s symbol is ${el.symbol}.` });
      }
    } else if (type === 15) {
      const use = el.uses.length > 0 ? el.uses[Math.floor(Math.random() * el.uses.length)] : null;
      const other = shuffleArray(elements.filter(candidate => candidate.atomicNumber !== el.atomicNumber && candidate.uses.length > 0))[0];
      const wrongUse = other ? other.uses[Math.floor(Math.random() * other.uses.length)] : null;
      if (use && isTrue) {
        statements.push({ text: `A real-world use of ${el.name} is ${use}.`, answer: true, explanation: `Correct! ${el.name} is used for ${use}.` });
      } else if (wrongUse && other) {
        statements.push({ text: `A real-world use of ${el.name} is ${wrongUse}.`, answer: false, explanation: `No, that use fits ${other.name}. ${use ? `One use of ${el.name} is ${use}.` : `${el.name} has different uses.`}` });
      } else {
        statements.push({ text: `${el.name} is a ${el.stateAtRoomTemp} at room temperature.`, answer: true, explanation: `Correct — ${el.name} is a ${el.stateAtRoomTemp}.` });
      }
    } else {
      const trivia = pickRelatableTrivia(el);
      statements.push(trivia
        ? { text: `This clue belongs to ${el.name}: ${trivia.question}`, answer: true, explanation: trivia.explanation }
        : { text: `${el.name} has atomic number ${el.atomicNumber}.`, answer: true, explanation: `Correct! Atomic number means proton count, so ${el.name} has ${el.atomicNumber} protons.` });
    }
  }

  return statements;
}
