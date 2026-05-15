import { elements, type Element } from '../data/elements.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from './scoring.ts';
import { comparisonData, DANGER_LABELS, formatPrice } from '../data/comparisonData.ts';

export type QuestionCategory =
  | 'symbol-name'
  | 'atomic-number'
  | 'group-classification'
  | 'discovery'
  | 'state'
  | 'radioactivity'
  | 'isotopes'
  | 'compounds'
  | 'position'
  | 'fun-fact'
  | 'uses'
  | 'obtained-from'
  | 'which-is-bigger';

export type Question = {
  id: string;
  category: QuestionCategory;
  questionText: string;
  choices: string[];
  correctIndex: number;
  element: Element;
  explanation: string;
  hint?: string;
};

/** Pick a random fact from additionalFacts (or fall back to funFact) */
function randomFact(el: Element): string {
  if (el.additionalFacts && el.additionalFacts.length > 0) {
    return el.additionalFacts[Math.floor(Math.random() * el.additionalFacts.length)];
  }
  return el.funFact;
}

/** Replace element name/symbol in text with blanks (global, case-insensitive) */
function blankOutElement(text: string, el: Element): string {
  // Replace full name first (case-insensitive, global)
  let result = text.replace(new RegExp(el.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '______');
  // Replace symbol (word-boundary to avoid matching partial words)
  result = result.replace(new RegExp(`\\b${el.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '__');
  return result;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number, exclude?: T[]): T[] {
  let pool = exclude ? arr.filter(x => !exclude.includes(x)) : [...arr];
  pool = shuffleArray(pool);
  return pool.slice(0, count);
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function allFacts(el: Element): string[] {
  const facts = [
    ...(el.additionalFacts ?? []),
    el.funFact,
  ]
    .map(f => f.trim())
    .filter(f => f.length > 0);
  return Array.from(new Set(facts));
}

function pickExtraFacts(el: Element, count: number, avoidText: string): string[] {
  const avoid = normalizeForComparison(avoidText);
  const candidates = allFacts(el).filter(f => {
    const normalized = normalizeForComparison(f);
    return normalized.length > 0 && !avoid.includes(normalized);
  });
  return shuffleArray(candidates).slice(0, count);
}

function enrichQuestion(question: Question): Question {
  const baseExplanation = question.explanation.trim();
  const extraFacts = pickExtraFacts(question.element, 2, baseExplanation);
  const parts = [baseExplanation, ...extraFacts];

  return {
    ...question,
    explanation: parts.join(' '),
  };
}

function questionContainsAnswerText(question: Question): boolean {
  const answer = question.choices[question.correctIndex];
  if (!answer) return false;
  const normalizedAnswer = normalizeForComparison(answer);
  if (normalizedAnswer.length < 3) return false;
  const normalizedQuestion = normalizeForComparison(question.questionText);
  return normalizedQuestion.includes(normalizedAnswer);
}

/** Pick N unique distractor *values* from a pool, excluding ones matching correctValue */
function pickUniqueDistractors(pool: Element[], count: number, mapper: (e: Element) => string, correctValue: string, excludeElement?: Element): string[] {
  const used = new Set<string>([correctValue]);
  const shuffled = shuffleArray(excludeElement ? pool.filter(e => e.atomicNumber !== excludeElement.atomicNumber) : [...pool]);
  const result: string[] = [];
  for (const el of shuffled) {
    const val = mapper(el);
    if (!used.has(val)) {
      used.add(val);
      result.push(val);
      if (result.length >= count) break;
    }
  }
  return result;
}

function getElementPool(difficulty: Difficulty): Element[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  if ('elementNumbers' in config && Array.isArray((config as Record<string, unknown>).elementNumbers)) {
    const nums = (config as Record<string, unknown>).elementNumbers as number[];
    return elements.filter(e => nums.includes(e.atomicNumber));
  }
  return elements.slice(0, config.elementPool);
}

const CATEGORY_LABELS: Record<string, string> = {
  'alkali-metal': 'Alkali Metal',
  'alkaline-earth-metal': 'Alkaline Earth Metal',
  'transition-metal': 'Transition Metal',
  'post-transition-metal': 'Post-Transition Metal',
  'metalloid': 'Metalloid',
  'nonmetal': 'Nonmetal',
  'halogen': 'Halogen',
  'noble-gas': 'Noble Gas',
  'lanthanide': 'Lanthanide',
  'actinide': 'Actinide',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat;
}

type QuestionGenerator = (element: Element, pool: Element[], choiceCount: number) => Question | null;

const generators: Record<QuestionCategory, QuestionGenerator[]> = {
  'symbol-name': [
    // What is the symbol for X?
    (el, pool, n) => {
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.symbol);
      const choices = shuffleArray([el.symbol, ...distractors]);
      return {
        id: `sn-1-${el.atomicNumber}`,
        category: 'symbol-name',
        questionText: `What is the chemical symbol for ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(el.symbol),
        element: el,
        explanation: randomFact(el),
        hint: `It starts with the letter "${el.symbol[0]}".`,
      };
    },
    // Which element has symbol X?
    (el, pool, n) => {
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `sn-2-${el.atomicNumber}`,
        category: 'symbol-name',
        questionText: `Which element has the symbol "${el.symbol}"?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: randomFact(el),
        hint: `This element is a ${categoryLabel(el.category)}.`,
      };
    },
  ],

  'atomic-number': [
    (el, pool, n) => {
      const distractors = pickRandom(pool, n - 1, [el]).map(e => String(e.atomicNumber));
      const correct = String(el.atomicNumber);
      const choices = shuffleArray([correct, ...distractors]);
      return {
        id: `an-1-${el.atomicNumber}`,
        category: 'atomic-number',
        questionText: `What is the atomic number of ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: `It has ${el.atomicNumber} proton${el.atomicNumber > 1 ? 's' : ''} in its nucleus — that's what makes it ${el.name}! ${randomFact(el)}`,
        hint: `It's in period ${el.period}.`,
      };
    },
    (el, pool, n) => {
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `an-2-${el.atomicNumber}`,
        category: 'atomic-number',
        questionText: `Which element has atomic number ${el.atomicNumber}?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `Atomic number ${el.atomicNumber} means ${el.atomicNumber} proton${el.atomicNumber > 1 ? 's' : ''} in the nucleus! ${randomFact(el)}`,
        hint: `Its symbol is ${el.symbol}.`,
      };
    },
  ],

  'group-classification': [
    (el, _pool, n) => {
      const allCats = Object.keys(CATEGORY_LABELS);
      const correct = categoryLabel(el.category);
      const distractorCats = pickRandom(allCats.filter(c => c !== el.category), n - 1).map(categoryLabel);
      const choices = shuffleArray([correct, ...distractorCats]);
      return {
        id: `gc-1-${el.atomicNumber}`,
        category: 'group-classification',
        questionText: `What type of element is ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: randomFact(el),
        hint: `Think about where it is on the periodic table.`,
      };
    },
    (el, pool, n) => {
      if (el.group === null) return null;
      const correct = String(el.group);
      const distractors = pickUniqueDistractors(
        pool.filter(e => e.group !== null),
        n - 1,
        e => String(e.group),
        correct,
        el
      );
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([correct, ...distractors]);
      return {
        id: `gc-2-${el.atomicNumber}`,
        category: 'group-classification',
        questionText: `Which group (column) of the periodic table is ${el.name} in?`,
        choices: choices.map(c => `Group ${c}`),
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: randomFact(el),
        hint: `${el.name} is a ${categoryLabel(el.category)}.`,
      };
    },
  ],

  'discovery': [
    (el, pool, n) => {
      if (!el.discoveryYear || el.discoveredBy === 'Ancient') return null;
      const centuryNum = Math.ceil(el.discoveryYear / 100);
      const ordinal = (c: number) => {
        const s = c === 1 ? 'st' : c === 2 ? 'nd' : c === 3 ? 'rd' : 'th';
        return `${c}${s} century`;
      };
      const correct = ordinal(centuryNum);
      const distractors = pickUniqueDistractors(
        pool.filter(e => e.discoveryYear !== null),
        n - 1,
        e => ordinal(Math.ceil(e.discoveryYear! / 100)),
        correct,
        el
      );
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([correct, ...distractors]);
      return {
        id: `di-2-${el.atomicNumber}`,
        category: 'discovery',
        questionText: `In which century was ${el.name} discovered?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: `Discovered by ${el.discoveredBy} in ${el.discoveryCountry} (${el.discoveryYear}). ${randomFact(el)}`,
        hint: `It was discovered by ${el.discoveredBy}.`,
      };
    },
  ],

  'state': [
    (el, _pool, _n) => {
      const states = ['solid', 'liquid', 'gas'];
      const choices = shuffleArray(states);
      return {
        id: `st-1-${el.atomicNumber}`,
        category: 'state',
        questionText: `What state is ${el.name} at room temperature?`,
        choices: choices.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        correctIndex: choices.indexOf(el.stateAtRoomTemp),
        element: el,
        explanation: randomFact(el),
        hint: `Think about what ${categoryLabel(el.category)}s are usually like.`,
      };
    },
  ],

  'radioactivity': [
    (el, _pool, _n) => {
      const choices = ['Stable', 'Radioactive'];
      const correct = el.radioactive ? 'Radioactive' : 'Stable';
      return {
        id: `ra-1-${el.atomicNumber}`,
        category: 'radioactivity',
        questionText: `Is ${el.name} stable or radioactive?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: el.radioactive
          ? `Its most stable isotope has a half-life of ${el.halfLife}! ${randomFact(el)}`
          : `It has ${el.stableIsotopes} stable isotope${el.stableIsotopes !== 1 ? 's' : ''}! ${randomFact(el)}`,

        hint: el.radioactive
          ? `Elements with atomic number above 82 are usually radioactive.`
          : `Most common elements are stable.`,
      };
    },
    (el, pool, n) => {
      if (!el.radioactive || !el.halfLife) return null;
      const distractors = pickUniqueDistractors(
        pool.filter(e => e.radioactive && e.halfLife),
        n - 1,
        e => e.halfLife!,
        el.halfLife,
        el
      );
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([el.halfLife, ...distractors]);
      return {
        id: `ra-2-${el.atomicNumber}`,
        category: 'radioactivity',
        questionText: `What is the half-life of ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(el.halfLife),
        element: el,
        explanation: randomFact(el),
        hint: `${el.name} is an ${categoryLabel(el.category)}.`,
      };
    },
  ],

  'isotopes': [
    (el, _pool, n) => {
      if (el.radioactive) return null;
      const correct = String(el.stableIsotopes);
      const options = new Set([correct]);
      while (options.size < Math.min(n, 5)) {
        const offset = Math.floor(Math.random() * 6) + 1;
        const fake = String(Math.max(1, el.stableIsotopes + (Math.random() > 0.5 ? offset : -offset)));
        options.add(fake);
      }
      const choices = shuffleArray([...options]);
      return {
        id: `is-1-${el.atomicNumber}`,
        category: 'isotopes',
        questionText: `How many stable isotopes does ${el.name} have?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: randomFact(el),
        hint: `${el.name} is a ${categoryLabel(el.category)}.`,
      };
    },
  ],

  'compounds': [
    (el, pool, n) => {
      if (el.compounds.length === 0) return null;
      const compound = el.compounds[Math.floor(Math.random() * el.compounds.length)];
      // Filter distractors: must not contain the target element's symbol in their formula
      const symbolPattern = new RegExp(`(^|[^a-z])${el.symbol}([^a-z]|$)`, 'i');
      const distractorElements = pickRandom(
        pool.filter(e => e.compounds.length > 0 && e.atomicNumber !== el.atomicNumber),
        (n - 1) * 3, // get extra to filter
        [el]
      );
      const distractorCompounds: string[] = [];
      const usedCompounds = new Set<string>([compound]);
      for (const e of distractorElements) {
        if (distractorCompounds.length >= n - 1) break;
        const c = e.compounds[Math.floor(Math.random() * e.compounds.length)];
        // Skip if duplicate or contains the target element's symbol
        if (!symbolPattern.test(c) && !usedCompounds.has(c)) {
          usedCompounds.add(c);
          distractorCompounds.push(c);
        }
      }
      if (distractorCompounds.length < n - 1) return null;
      const choices = shuffleArray([compound, ...distractorCompounds]);
      return {
        id: `co-1-${el.atomicNumber}`,
        category: 'compounds',
        questionText: `Which of these compounds contains ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(compound),
        element: el,
        explanation: randomFact(el),
        hint: `${el.name}'s symbol is ${el.symbol} — look for it in the formulas.`,
      };
    },
  ],

  'position': [
    (el, pool, n) => {
      if (el.group === null) return null;
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `po-1-${el.atomicNumber}`,
        category: 'position',
        questionText: `Which element is in Period ${el.period}, Group ${el.group}?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: randomFact(el),
        hint: `This element is a ${categoryLabel(el.category)}.`,
      };
    },
  ],

  'fun-fact': [
    // ff-1: Blank out element name from funFact, ask "which element?"
    (el, pool, n) => {
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      // Blank out element name/symbol from fun fact (global, case-insensitive)
      const fact = blankOutElement(el.funFact, el);
      return {
        id: `ff-1-${el.atomicNumber}`,
        category: 'fun-fact',
        questionText: `Which element does this describe? "${fact}"`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: el.funFact,
        hint: `Its symbol is ${el.symbol}.`,
      };
    },
    // ff-2: Pick an additionalFact, blank out the name, ask "which element?"
    (el, pool, n) => {
      if (!el.additionalFacts || el.additionalFacts.length === 0) return null;
      const fact = el.additionalFacts[Math.floor(Math.random() * el.additionalFacts.length)];
      const blanked = blankOutElement(fact, el);
      // Only useful if we actually blanked something
      if (blanked === fact) return null;
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `ff-2-${el.atomicNumber}-${fact.length}`,
        category: 'fun-fact',
        questionText: `Which element does this fun fact describe? "${blanked}"`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: fact,
        hint: `This element is a ${categoryLabel(el.category)}.`,
      };
    },
    // ff-3: True or false style — show a fact and ask if it's about the right element
    (el, pool, _n) => {
      if (!el.additionalFacts || el.additionalFacts.length === 0) return null;
      const fact = el.additionalFacts[Math.floor(Math.random() * el.additionalFacts.length)];
      // Replace the element name with a wrong element's name
      const wrong = pickRandom(pool, 1, [el])[0];
      const falseFact = fact.replace(new RegExp(el.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), wrong.name);
      // Only works if the name was actually in the fact
      if (falseFact === fact) return null;
      const isTrue = Math.random() > 0.5;
      const displayed = isTrue ? fact : falseFact;
      const correct = isTrue ? 'True' : 'False';
      const choices = ['True', 'False'];
      return {
        id: `ff-3-${el.atomicNumber}-${isTrue ? 't' : 'f'}-${fact.length}`,
        category: 'fun-fact',
        questionText: `True or False: "${displayed}"`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: fact,
        hint: isTrue ? `Think about what ${el.name} is known for.` : `Think about whether this really sounds like ${wrong.name}.`,
      };
    },
    // ff-4: Which of these facts is about element X?
    (el, pool, n) => {
      if (!el.additionalFacts || el.additionalFacts.length === 0) return null;
      const correctFact = el.additionalFacts[Math.floor(Math.random() * el.additionalFacts.length)];
      // Only use facts that mention the element name so we can blank it
      if (!new RegExp(el.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(correctFact)) return null;
      const blankedCorrect = blankOutElement(correctFact, el);
      // Get distractor facts from other elements, also blanked
      const distractorEls = pickRandom(pool.filter(e => e.additionalFacts && e.additionalFacts.length > 0), n - 1, [el]);
      const distractorFacts = distractorEls.map(de => {
        const f = de.additionalFacts[Math.floor(Math.random() * de.additionalFacts.length)];
        return blankOutElement(f, de);
      });
      if (distractorFacts.length < n - 1) return null;
      const choices = shuffleArray([blankedCorrect, ...distractorFacts]);
      return {
        id: `ff-4-${el.atomicNumber}-${correctFact.length}`,
        category: 'fun-fact',
        questionText: `Which of these fun facts is about ${el.name} (${el.symbol})?`,
        choices,
        correctIndex: choices.indexOf(blankedCorrect),
        element: el,
        explanation: correctFact,
        hint: `${el.name} is a ${categoryLabel(el.category)} and is ${el.stateAtRoomTemp} at room temperature.`,
      };
    },
    // ff-5: Which element has this real-world connection?
    (el, pool, n) => {
      if (!el.additionalFacts || el.additionalFacts.length === 0) return null;
      // Try to find a fact that mentions the element name
      const candidates = el.additionalFacts.filter(f =>
        new RegExp(el.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(f)
      );
      if (candidates.length === 0) return null;
      const fact = candidates[Math.floor(Math.random() * candidates.length)];
      const blanked = blankOutElement(fact, el);
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `ff-5-${el.atomicNumber}-${fact.length}`,
        category: 'fun-fact',
        questionText: `Amazing fact! Which element is this about? "${blanked}"`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `${fact} Cool, right?`,
        hint: `Its symbol is ${el.symbol}.`,
      };
    },
    // ff-6: "I Spy" style — describe the element from multiple facts, guess which one
    (el, pool, n) => {
      if (!el.additionalFacts || el.additionalFacts.length < 2) return null;
      const selectedFacts = shuffleArray(el.additionalFacts).slice(0, 2);
      const clues = selectedFacts.map(f => blankOutElement(f, el));
      // Make sure at least one clue was actually blanked
      if (clues.every((c, i) => c === selectedFacts[i])) return null;
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `ff-6-${el.atomicNumber}-${selectedFacts[0].length}`,
        category: 'fun-fact',
        questionText: `I'm thinking of an element! Clue 1: "${clues[0]}" Clue 2: "${clues[1]}" — Which element is it?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `It's ${el.name}! ${selectedFacts[0]}`,
        hint: `This element is a ${categoryLabel(el.category)} with symbol ${el.symbol}.`,
      };
    },
  ],

  'uses': [
    (el, pool, n) => {
      if (!el.uses || el.uses.length === 0) return null;
      const use = el.uses[Math.floor(Math.random() * el.uses.length)];
      const distractors = pickRandom(pool.filter(e => e.atomicNumber !== el.atomicNumber), n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `us-1-${el.atomicNumber}`,
        category: 'uses',
        questionText: `Which element is used for: "${use}"?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: randomFact(el),
        hint: `This element is a ${categoryLabel(el.category)}.`,
      };
    },
    (el, pool, n) => {
      if (!el.uses || el.uses.length === 0) return null;
      const correctUse = el.uses[Math.floor(Math.random() * el.uses.length)];
      const distractorUses = pickRandom(
        pool.filter(e => e.uses && e.uses.length > 0 && e.atomicNumber !== el.atomicNumber),
        n - 1,
        [el]
      ).map(e => e.uses[Math.floor(Math.random() * e.uses.length)]);
      const choices = shuffleArray([correctUse, ...distractorUses]);
      return {
        id: `us-2-${el.atomicNumber}`,
        category: 'uses',
        questionText: `What is ${el.name} used for?`,
        choices,
        correctIndex: choices.indexOf(correctUse),
        element: el,
        explanation: randomFact(el),
        hint: `${el.name} is ${el.stateAtRoomTemp} at room temperature.`,
      };
    },
    // us-3: Hardcoded "famous use/fact" questions for key teaching elements
    // Multiple entries per element are picked at random each time.
    (el, pool, n) => {
      type FQ = { question: string; explanation: string };
      const FAMOUS_USES: Record<number, FQ[]> = {
        // ── Original 8 ──
        56: [{ question: 'Which element gives fireworks a brilliant GREEN colour?', explanation: 'Barium salts burn with a vivid green flame! Different elements make different colours — lithium = red, sodium = yellow, copper = blue.' }],
        92: [{ question: 'Which element is used as fuel in nuclear power stations?', explanation: 'Uranium-235 is split by nuclear fission to release enormous heat, which makes steam to drive turbines. About 10% of the world\'s electricity comes from uranium!' }],
        78: [{ question: 'Which element is used in car catalytic converters to clean exhaust fumes?', explanation: 'Platinum acts as a catalyst — it speeds up reactions that turn toxic exhaust gases into harmless ones, without being used up itself!' }],
        20: [{ question: 'Which element makes your bones and teeth hard?', explanation: 'Calcium makes up the mineral in bones and teeth. Dairy foods, leafy greens, and nuts are all packed with it!' }],
        14: [{ question: 'Which element is found in almost every computer chip and solar panel?', explanation: 'Silicon is a semiconductor — it conducts electricity only under certain conditions, making it perfect for controlling circuits. Silicon Valley is named after it!' }],
        2:  [{ question: 'Which element is used as a super-cold liquid to keep MRI scanners working?', explanation: 'Liquid helium keeps MRI magnets at −269°C — close to absolute zero! Without it, hospitals couldn\'t run MRI machines.' }],
        30: [{ question: 'Which element is used in sunscreen to physically block harmful UV rays?', explanation: 'Zinc oxide sits on skin and reflects UV rays. It\'s safe, effective, and that\'s why lifeguards often have white noses!' }],
        9:  [{ question: 'Which element is added to drinking water and toothpaste to protect teeth from decay?', explanation: 'Fluoride (a form of fluorine) strengthens tooth enamel, making it harder for acids to cause cavities. It\'s one of public health\'s greatest successes!' }],
        // ── Body & biology ──
        26: [
          { question: 'Which element gives blood its red colour?', explanation: 'Iron sits at the heart of haemoglobin — the protein in red blood cells. It grabs oxygen in the lungs and carries it to every cell in your body!' },
          { question: 'Which element do you need in your diet to avoid feeling tired and anaemic?', explanation: 'Iron deficiency is the most common nutritional deficiency in the world! Without enough iron, your blood can\'t carry oxygen properly, making you feel exhausted.' },
        ],
        7:  [
          { question: 'Which element makes up about 78% of the air around us?', explanation: 'Most of the air is nitrogen — but we can\'t use it directly like oxygen. Plants and bacteria can "fix" it into a form living things can eat!' },
          { question: 'Which element is found in every protein and in DNA?', explanation: 'Nitrogen is in every amino acid, and therefore every protein — muscles, enzymes, antibodies. It\'s also a key part of the DNA that carries your genes!' },
        ],
        8:  [
          { question: 'Which element do we need to breathe to stay alive?', explanation: 'Your cells burn glucose with oxygen to release energy — that\'s called cellular respiration. Without oxygen, cells die in minutes!' },
          { question: 'Which element is the most abundant in Earth\'s crust by mass?', explanation: 'Oxygen makes up 46% of Earth\'s crust — mostly locked up in rocks and minerals like quartz and feldspar rather than as a gas!' },
        ],
        53: [{ question: 'Which element does your body need to make thyroid hormones?', explanation: 'The thyroid gland uses iodine to make hormones that control your metabolism — how fast your body burns energy. That\'s why iodine is added to table salt in many countries!' }],
        19: [{ question: 'Which element makes bananas very slightly radioactive?', explanation: 'Bananas contain potassium, and about 0.01% of natural potassium is radioactive potassium-40. Don\'t worry — the dose is tiny and your body controls its potassium levels carefully!' }],
        // ── Technology & devices ──
        3:  [{ question: 'Which element is used in rechargeable phone and laptop batteries?', explanation: 'Lithium-ion batteries are lightweight and rechargeable. Lithium is the lightest metal and can store a lot of electrical energy — perfect for phones, laptops, and electric cars!' }],
        74: [{ question: 'Which element was used to make light bulb filaments glow?', explanation: 'Tungsten has the highest melting point of all metals (3,422°C), so it glows white-hot without melting. LED bulbs have mostly replaced it now, but tungsten is still used in specialist lighting.' }],
        24: [{ question: 'Which element is added to iron to make it stainless and rust-proof?', explanation: 'Adding chromium to steel creates stainless steel! Chromium forms a thin invisible layer of chromium oxide on the surface that stops rust from ever forming.' }],
        10: [{ question: 'Which element glows with a bright red-orange colour in neon signs?', explanation: 'Neon gas glows vivid red-orange when electricity passes through it. Other "neon sign" colours actually use different gases — argon glows blue, mercury gives green!' }],
        11: [
          { question: 'Which element makes street lamps glow yellow-orange?', explanation: 'Sodium vapour lamps fire electricity through sodium gas to produce a very efficient bright yellow-orange light. You\'ve seen them on motorways and older streets!' },
          { question: 'Which element, combined with chlorine, makes ordinary table salt?', explanation: 'Sodium (Na) + Chlorine (Cl) = Sodium Chloride (NaCl) — table salt! Pure sodium is a soft silvery metal that reacts explosively with water, yet in salt it\'s completely safe to eat.' },
        ],
        // ── Earth & environment ──
        13: [{ question: 'Which element is the most abundant metal in Earth\'s crust?', explanation: 'Aluminium makes up about 8% of Earth\'s crust — it\'s everywhere in rocks and clay. We use it for cans, foil, aeroplanes, and bikes because it\'s light and doesn\'t rust!' }],
        6:  [
          { question: 'Which element do plants absorb from the air to make food through photosynthesis?', explanation: 'Plants absorb carbon dioxide (CO₂) and use sunlight to turn it into sugar (glucose) and oxygen. Every apple, tree, and blade of grass is mostly carbon! ' },
          { question: 'Which element can form both the hardest natural substance AND the softest?', explanation: 'Carbon forms diamond (hardest natural material) and graphite (pencil lead — one of the softest)! The difference is just how the atoms are arranged.' },
          { question: 'Which element makes fizzy drinks fizzy?', explanation: 'Carbon dioxide (CO₂) is dissolved in drinks under pressure. When you open the bottle, the pressure drops and the gas escapes as bubbles — that\'s the fizz!' },
        ],
        16: [{ question: 'Which element is released as a choking yellow gas from volcanoes?', explanation: 'Volcanoes release sulfur dioxide (SO₂) — a sharp-smelling toxic gas. It can cause acid rain when it reacts with water in the atmosphere!' }],
        1:  [{ question: 'Which element makes up most of the Sun?', explanation: 'The Sun is about 73% hydrogen by mass. Its gravity squeezes hydrogen atoms together in nuclear fusion, releasing the light and heat that makes life on Earth possible!' }],
        // ── Cool science ──
        12: [{ question: 'Which element burns with such a dazzling white flame it\'s used in fireworks and emergency flares?', explanation: 'Magnesium burns at over 3,000°C with an incredibly bright white light — so bright you should never look directly at it! It\'s also used in flares and old-fashioned camera flash bulbs.' }],
        15: [{ question: 'Which element is on the heads of safety matches?', explanation: 'Match heads contain red phosphorus or a mixture including phosphorus compounds. When struck, the friction ignites the phosphorus, which lights the rest of the match!' }],
        17: [{ question: 'Which element, combined with sodium, makes ordinary table salt?', explanation: 'Chlorine (Cl) + Sodium (Na) = Sodium Chloride (NaCl) — table salt! Pure chlorine is a toxic yellow-green gas, but bonded with sodium it becomes perfectly safe to eat.' }],
        80: [{ question: 'Which element is a liquid metal so dense that a steel ball-bearing floats on its surface?', explanation: 'Mercury is the only metal that\'s liquid at room temperature, and it\'s extraordinarily dense — a steel ball really does float on it! It\'s very toxic though, so scientists handle it carefully.' }],
      };
      const entries = FAMOUS_USES[el.atomicNumber];
      if (!entries || entries.length === 0) return null;
      const famous = entries[Math.floor(Math.random() * entries.length)];
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `us-3-${el.atomicNumber}`,
        category: 'uses',
        questionText: famous.question,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: famous.explanation,
        hint: `Its symbol is ${el.symbol}.`,
      };
    },
  ],

  'obtained-from': [
    (el, pool, n) => {
      if (!el.obtainedFrom) return null;
      const distractors = pickRandom(
        pool.filter(e => e.obtainedFrom && e.atomicNumber !== el.atomicNumber),
        n - 1,
        [el]
      ).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      // Blank out the element name from the description
      const desc = blankOutElement(el.obtainedFrom, el);
      return {
        id: `ob-1-${el.atomicNumber}`,
        category: 'obtained-from',
        questionText: `Which element is obtained this way? "${desc}"`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `It is ${el.obtainedFrom.charAt(0).toLowerCase()}${el.obtainedFrom.slice(1)}. ${randomFact(el)}`,
        hint: `Its symbol is ${el.symbol}.`,
      };
    },
  ],

  'which-is-bigger': [
    // wb-1: Which element is the densest?
    (el, pool, n) => {
      const data = comparisonData[el.atomicNumber];
      if (!data || data.density === null) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && d.density !== null && e.atomicNumber !== el.atomicNumber;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      // Find the densest among choices
      const densest = all.reduce((a, b) => {
        const da = comparisonData[a.atomicNumber]!.density!;
        const db = comparisonData[b.atomicNumber]!.density!;
        return da >= db ? a : b;
      });
      const choices = all.map(e => e.name);
      const densestData = comparisonData[densest.atomicNumber]!;
      return {
        id: `wb-1-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements is the DENSEST (heaviest for its size)?`,
        choices,
        correctIndex: choices.indexOf(densest.name),
        element: densest,
        explanation: `${densest.name} has a density of ${densestData.density} g/cm³ — that's super heavy! ${randomFact(densest)}`,
        hint: `Think about which metals feel really heavy when you hold them.`,
      };
    },
    // wb-2: Which element costs most per kg?
    (el, pool, n) => {
      const data = comparisonData[el.atomicNumber];
      if (!data || data.pricePerKg === null) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && d.pricePerKg !== null && e.atomicNumber !== el.atomicNumber;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      // Find the most expensive
      const priciest = all.reduce((a, b) => {
        const pa = comparisonData[a.atomicNumber]!.pricePerKg!;
        const pb = comparisonData[b.atomicNumber]!.pricePerKg!;
        return pa >= pb ? a : b;
      });
      const choices = all.map(e => e.name);
      const price = comparisonData[priciest.atomicNumber]!.pricePerKg!;
      return {
        id: `wb-2-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `If you bought 1 kg of each, which would cost the MOST?`,
        choices,
        correctIndex: choices.indexOf(priciest.name),
        element: priciest,
        explanation: `1 kg of ${priciest.name} costs about ${formatPrice(price)} per kg! ${randomFact(priciest)}`,
        hint: `Think about which of these is rarest or hardest to make.`,
      };
    },
    // wb-3: Which element is the most dangerous?
    (el, pool, n) => {
      const data = comparisonData[el.atomicNumber];
      if (!data) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && e.atomicNumber !== el.atomicNumber && d.dangerLevel !== data.dangerLevel;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      const mostDangerous = all.reduce((a, b) => {
        const da = comparisonData[a.atomicNumber]!.dangerLevel;
        const db = comparisonData[b.atomicNumber]!.dangerLevel;
        return da >= db ? a : b;
      });
      const choices = all.map(e => e.name);
      const dangerLvl = comparisonData[mostDangerous.atomicNumber]!.dangerLevel;
      return {
        id: `wb-3-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements is the MOST DANGEROUS?`,
        choices,
        correctIndex: choices.indexOf(mostDangerous.name),
        element: mostDangerous,
        explanation: `${mostDangerous.name} is rated ${dangerLvl}/10 — ${DANGER_LABELS[dangerLvl]}! ${randomFact(mostDangerous)}`,
        hint: `Some elements are toxic or radioactive — which one sounds scariest?`,
      };
    },
    // wb-4: Which element is rarer in Earth's crust?
    (el, pool, n) => {
      const data = comparisonData[el.atomicNumber];
      if (!data || data.abundanceCrust === null) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && d.abundanceCrust !== null && e.atomicNumber !== el.atomicNumber;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      // Rarest = lowest abundance
      const rarest = all.reduce((a, b) => {
        const aa = comparisonData[a.atomicNumber]!.abundanceCrust!;
        const ab = comparisonData[b.atomicNumber]!.abundanceCrust!;
        return aa <= ab ? a : b;
      });
      const choices = all.map(e => e.name);
      return {
        id: `wb-4-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements is the RAREST in Earth's crust?`,
        choices,
        correctIndex: choices.indexOf(rarest.name),
        element: rarest,
        explanation: `${rarest.name} is super rare — only about ${comparisonData[rarest.atomicNumber]!.abundanceCrust} parts per million in Earth's crust! ${randomFact(rarest)}`,
        hint: `Precious metals and noble gases tend to be very rare.`,
      };
    },
    // wb-5: Which element has the highest atomic mass?
    (el, pool, n) => {
      const distractors = pickRandom(pool, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      const heaviest = all.reduce((a, b) => a.atomicMass >= b.atomicMass ? a : b);
      const choices = all.map(e => e.name);
      return {
        id: `wb-5-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements has the BIGGEST atomic mass?`,
        choices,
        correctIndex: choices.indexOf(heaviest.name),
        element: heaviest,
        explanation: `${heaviest.name} has an atomic mass of ${heaviest.atomicMass}! The heavier the atom, the more protons and neutrons it has. ${randomFact(heaviest)}`,
        hint: `Elements further down the periodic table are usually heavier.`,
      };
    },
    // wb-6: Which element has the highest melting point?
    (el, pool, n) => {
      const data = comparisonData[el.atomicNumber];
      if (!data || data.meltingPoint === null) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && d.meltingPoint !== null && e.atomicNumber !== el.atomicNumber;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      const hottest = all.reduce((a, b) => {
        const ma = comparisonData[a.atomicNumber]!.meltingPoint!;
        const mb = comparisonData[b.atomicNumber]!.meltingPoint!;
        return ma >= mb ? a : b;
      });
      const choices = all.map(e => e.name);
      const mp = comparisonData[hottest.atomicNumber]!.meltingPoint!;
      return {
        id: `wb-6-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements has the HIGHEST melting point?`,
        choices,
        correctIndex: choices.indexOf(hottest.name),
        element: hottest,
        explanation: `${hottest.name} melts at ${mp}°C — that's ${mp > 1000 ? 'incredibly hot' : mp > 0 ? 'pretty warm' : 'actually below freezing'}! ${randomFact(hottest)}`,
        hint: `Metals that are used in furnaces and light bulbs often have very high melting points.`,
      };
    },
    // wb-7: Which element is the cheapest per kg?
    (el, pool, n) => {
      const data = comparisonData[el.atomicNumber];
      if (!data || data.pricePerKg === null) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && d.pricePerKg !== null && e.atomicNumber !== el.atomicNumber;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      const cheapest = all.reduce((a, b) => {
        const pa = comparisonData[a.atomicNumber]!.pricePerKg!;
        const pb = comparisonData[b.atomicNumber]!.pricePerKg!;
        return pa <= pb ? a : b;
      });
      const choices = all.map(e => e.name);
      const price = comparisonData[cheapest.atomicNumber]!.pricePerKg!;
      return {
        id: `wb-7-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements is the CHEAPEST to buy per kilogram?`,
        choices,
        correctIndex: choices.indexOf(cheapest.name),
        element: cheapest,
        explanation: `${cheapest.name} costs only about ${formatPrice(price)} per kg — what a bargain! ${randomFact(cheapest)}`,
        hint: `Elements you see in everyday life are usually the cheapest.`,
      };
    },
    // wb-8: Which is the safest?
    (el, pool, n) => {
      const data = comparisonData[el.atomicNumber];
      if (!data) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && e.atomicNumber !== el.atomicNumber && d.dangerLevel !== data.dangerLevel;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      const safest = all.reduce((a, b) => {
        const da = comparisonData[a.atomicNumber]!.dangerLevel;
        const db = comparisonData[b.atomicNumber]!.dangerLevel;
        return da <= db ? a : b;
      });
      const choices = all.map(e => e.name);
      const dangerLvl = comparisonData[safest.atomicNumber]!.dangerLevel;
      return {
        id: `wb-8-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements is the SAFEST?`,
        choices,
        correctIndex: choices.indexOf(safest.name),
        element: safest,
        explanation: `${safest.name} is rated ${dangerLvl}/10 — ${DANGER_LABELS[dangerLvl]}! ${randomFact(safest)}`,
        hint: `Think about elements you use or touch every day.`,
      };
    },
  ],
};

export function generateQuestion(difficulty: Difficulty, usedIds?: Set<string>): Question {
  const config = DIFFICULTY_CONFIG[difficulty];
  const pool = getElementPool(difficulty);
  const categories = config.questionCategories as readonly QuestionCategory[];

  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const gens = generators[category];
    const gen = gens[Math.floor(Math.random() * gens.length)];
    const element = pool[Math.floor(Math.random() * pool.length)];
    const question = gen(element, pool, config.choiceCount);
    if (question && (!usedIds || !usedIds.has(question.id))) {
      const enriched = enrichQuestion(question);
      if (questionContainsAnswerText(enriched)) continue;
      return enriched;
    }
  }

  // Fallback: simple symbol question
  const el = pool[Math.floor(Math.random() * pool.length)];
  const distractors = pickRandom(pool, config.choiceCount - 1, [el]).map(e => e.symbol);
  const choices = shuffleArray([el.symbol, ...distractors]);
  return enrichQuestion({
    id: `fallback-${Date.now()}`,
    category: 'symbol-name',
    questionText: `What is the chemical symbol for ${el.name}?`,
    choices,
    correctIndex: choices.indexOf(el.symbol),
    element: el,
    explanation: `The symbol for ${el.name} is ${el.symbol}. ${randomFact(el)}`,
    hint: `It starts with "${el.symbol[0]}".`,
  });
}

export function generateQuiz(difficulty: Difficulty, count: number): Question[] {
  const usedIds = new Set<string>();
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const q = generateQuestion(difficulty, usedIds);
    usedIds.add(q.id);
    questions.push(q);
  }
  return questions;
}

/**
 * For deep dive, only use generators where the answer is a PROPERTY of the element
 * (symbol, number, category, state, compound, year, etc.) — not the element's name,
 * since the player already knows which element they picked.
 *
 * Generator index 0 = first generator in the array for that category, etc.
 */
const DEEP_DIVE_SAFE_GENERATORS: Partial<Record<QuestionCategory, number[]>> = {
  'symbol-name': [0],       // "What is the symbol for X?" → answer is symbol
  'atomic-number': [0],     // "What is the atomic number of X?" → answer is number
  'group-classification': [0, 1], // answer is category label or group number
  'state': [0],             // answer is solid/liquid/gas
  'radioactivity': [0, 1],  // answer is stable/radioactive or half-life
  'isotopes': [0],          // answer is isotope count
  'compounds': [0],         // answer is a compound formula
  'discovery': [0, 1],      // answer is person or year
  'uses': [1],              // "What is X used for?" → answer is a use (not element name)
  // Excluded entirely: 'fun-fact' (answer = element name), 'obtained-from' (answer = element name),
  // 'position' (answer = element name), 'uses[0]' (answer = element name)
};

/** Generate a deep-dive quiz focused on a single element */
export function generateDeepDiveQuiz(element: Element, difficulty: Difficulty, count: number): Question[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const pool = getElementPool(difficulty);

  // Build list of category+generator pairs that are safe for deep dive
  type GenEntry = { category: QuestionCategory; genIndex: number };
  const safeGens: GenEntry[] = [];

  for (const [cat, indices] of Object.entries(DEEP_DIVE_SAFE_GENERATORS) as [QuestionCategory, number[]][]) {
    // Filter based on element properties
    if (cat === 'group-classification' && element.group === null) continue;
    if (cat === 'compounds' && element.compounds.length === 0) continue;
    if (cat === 'isotopes' && element.radioactive) continue;
    if (cat === 'radioactivity' && !element.radioactive && indices.includes(1)) {
      // Keep index 0 (stable/radioactive) but skip index 1 (half-life) for non-radioactive
      safeGens.push({ category: cat, genIndex: 0 });
      continue;
    }
    if (cat === 'discovery' && (element.discoveredBy === 'Ancient' || !element.discoveryYear)) continue;
    if (cat === 'uses' && (!element.uses || element.uses.length === 0)) continue;

    for (const idx of indices) {
      safeGens.push({ category: cat, genIndex: idx });
    }
  }

  const usedIds = new Set<string>();
  const questions: Question[] = [];
  const shuffled = shuffleArray(safeGens);

  // First pass: try each safe generator once
  for (const { category, genIndex } of shuffled) {
    if (questions.length >= count) break;
    const gen = generators[category]?.[genIndex];
    if (!gen) continue;
    const question = gen(element, pool, config.choiceCount);
    if (question && !usedIds.has(question.id)) {
      const enriched = enrichQuestion(question);
      if (questionContainsAnswerText(enriched)) continue;
      usedIds.add(enriched.id);
      questions.push(enriched);
    }
  }

  // Second pass: fill remaining by retrying
  let attempts = 0;
  while (questions.length < count && attempts < 200) {
    attempts++;
    const entry = safeGens[Math.floor(Math.random() * safeGens.length)];
    const gen = generators[entry.category]?.[entry.genIndex];
    if (!gen) continue;
    const question = gen(element, pool, config.choiceCount);
    if (question && !usedIds.has(question.id)) {
      const enriched = enrichQuestion(question);
      if (questionContainsAnswerText(enriched)) continue;
      usedIds.add(enriched.id);
      questions.push(enriched);
    }
  }

  return shuffleArray(questions);
}

/** Generate a quiz using only 'which-is-bigger' comparison questions */
export function generateComparisonQuiz(difficulty: Difficulty, count: number): Question[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const pool = getElementPool(difficulty);
  const gens = generators['which-is-bigger'];
  const usedIds = new Set<string>();
  const questions: Question[] = [];

  let attempts = 0;
  while (questions.length < count && attempts < 300) {
    attempts++;
    const gen = gens[Math.floor(Math.random() * gens.length)];
    const element = pool[Math.floor(Math.random() * pool.length)];
    const question = gen(element, pool, config.choiceCount);
    if (question && !usedIds.has(question.id)) {
      const enriched = enrichQuestion(question);
      if (questionContainsAnswerText(enriched)) continue;
      usedIds.add(enriched.id);
      questions.push(enriched);
    }
  }

  return shuffleArray(questions);
}
