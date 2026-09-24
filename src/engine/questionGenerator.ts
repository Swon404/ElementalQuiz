import { elements, type Element } from '../data/elements.ts';
import { focusedExplanation, simplifyExplanation } from './questionFeedback.ts';
import { addExtraFacts, pickExtraFact, extraFactCandidates } from './extraFacts.ts';
import { MORE_TRIVIA } from '../data/moreTrivia.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from './scoring.ts';
import { comparisonData } from '../data/comparisonData.ts';

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
  extraFact?: string;
  hint?: string;
};

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

function variedQuestionText(question: Question): string {
  const el = question.element;
  const variants = [question.questionText];
  if (question.id.startsWith('sn-1')) variants.push(`Choose the chemical symbol that belongs to ${el.name}.`);
  else if (question.id.startsWith('sn-2')) variants.push(`The symbol ${el.symbol} represents which element?`);
  else if (question.id.startsWith('sn-3')) variants.push(`Which element's symbol is ${el.symbol}, taken from an older name?`);
  else if (question.id.startsWith('an-1')) variants.push(`How many protons are in every ${el.name} atom?`);
  else if (question.id.startsWith('an-2')) variants.push(`Atomic number ${el.atomicNumber} belongs to which element?`);
  else if (question.id.startsWith('an-3')) variants.push(`An atom has ${el.atomicNumber} protons. Which element is it?`);
  else if (question.id.startsWith('gc-1')) variants.push(`Which periodic-table family does ${el.name} belong to?`);
  else if (question.id.startsWith('gc-2')) variants.push(`Find the group number for ${el.name}.`);
  else if (question.id.startsWith('gc-4')) variants.push(`Find the period (row) containing ${el.name}.`);
  else if (question.id.startsWith('di-1')) variants.push(`Which scientist or team is credited with discovering ${el.name}?`);
  else if (question.id.startsWith('di-2')) variants.push(`${el.name} was discovered during which century?`);
  else if (question.id.startsWith('di-3')) variants.push(`Where was ${el.name} first identified?`);
  else if (question.id.startsWith('st-1')) variants.push(`At around 20°C, is ${el.name} a solid, liquid, gas or plasma?`);
  else if (question.id.startsWith('ra-1')) variants.push(`What do we know about the stability of ${el.name}'s isotopes?`);
  else if (question.id.startsWith('is-1')) variants.push(`How many non-radioactive isotopes does ${el.name} have?`);
  else if (question.id.startsWith('co-1') || question.id.startsWith('co-2')) variants.push(`Which formula includes the symbol for ${el.name}?`);
  else if (question.id.startsWith('po-1')) variants.push(`Which element sits at group ${el.group}, period ${el.period}?`);
  else if (question.id.startsWith('wb-1')) variants.push('Which option packs the most mass into the same amount of space?');
  else if (question.id.startsWith('wb-4')) variants.push("Which option is least common in Earth's crust?");
  else if (question.id.startsWith('wb-5')) variants.push('Which option has the greatest atomic mass?');
  else if (question.id.startsWith('wb-6')) variants.push('Which option needs the highest temperature to melt?');
  return variants[Math.floor(Math.random() * variants.length)];
}

function elementNameChoices(el: Element, pool: Element[], count: number): string[] {
  const sameCategory = shuffleArray(pool.filter(e => e.category === el.category && e.atomicNumber !== el.atomicNumber));
  const otherCategories = shuffleArray(pool.filter(e => e.category !== el.category && e.atomicNumber !== el.atomicNumber));
  return shuffleArray([el.name, ...[...sameCategory, ...otherCategories].slice(0, count - 1).map(e => e.name)]);
}

function enrichQuestion(question: Question): Question {
  const explanation = simplifyExplanation(focusedExplanation(question));
  return {
    ...question,
    questionText: variedQuestionText(question).replace(/\b(GROUP|PERIOD|DENSEST|RAREST|BIGGEST|HIGHEST)\b/g, word => word.toLowerCase()),
    explanation,
    extraFact: pickExtraFact(`${question.questionText} ${explanation}`, new Set(), extraFactCandidates(question)),
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

export type RelatableTopic =
  | 'body'
  | 'food'
  | 'technology'
  | 'space'
  | 'danger'
  | 'history'
  | 'weird'
  | 'environment'
  | 'common-object'
  | 'symbol-origin';

export type RelatableTrivia = {
  clue: string;
  topic: RelatableTopic;
  question: string;
  explanation: string;
  hint?: string;
};

const RELATABLE_TRIVIA: Record<number, RelatableTrivia[]> = {
  1: [
    {
      topic: 'space',
      question: 'Which element makes up most of the Sun and other stars?',
      explanation: "In the Sun’s core, hydrogen nuclei combine to form helium. The resulting nucleus has less mass than the starting particles; the difference is released as energy that eventually reaches us as sunlight.",
      clue: "My nuclei fuel the reactions that power the Sun.",
      hint: 'It is the lightest element.',
    },
    {
      topic: 'technology',
      question: "Which element reacts with oxygen in a fuel cell to produce electricity and water?",
      explanation: "A fuel cell uses reactions between hydrogen and oxygen to produce an electric current. Water forms at the outlet, although the environmental impact also depends on how the hydrogen was produced.",
      clue: "I can react with oxygen in a fuel cell that produces electricity and water.",
      hint: 'Its symbol has one letter.',
    },
  ],
  2: [
    {
      topic: 'common-object',
      question: 'Which element makes party balloons float without burning?',
      explanation: "A helium-filled balloon displaces air that weighs more than the balloon and its contents. That difference gives it lift; helium’s filled electron shell also makes it very unreactive.",
      clue: "I can lift a party balloon and do not burn.",
      hint: 'It is a noble gas.',
    },
    {
      topic: 'technology',
      question: 'Which element is used as a super-cold liquid to keep MRI scanners working?',
      explanation: "Many MRI scanners use superconducting coils to create a strong magnetic field. Liquid helium keeps those coils cold enough for current to flow without electrical resistance.",
      clue: "My liquid form cools the superconducting magnets in many MRI scanners.",
      hint: 'It is named after the Sun.',
    },
  ],
  3: [
    {
      topic: 'technology',
      question: 'Which element powers many rechargeable phone, laptop, and electric car batteries?',
      explanation: "During discharge, lithium ions move through the battery while electrons travel through the outside circuit and power the device. Charging drives the process back the other way.",
      clue: "My ions move between electrodes in many rechargeable batteries.",
      hint: 'It is the lightest metal.',
    },
  ],
  4: [
    {
      topic: 'technology',
      question: "Which light metal is used to make stiff mirrors for some space telescopes?",
      explanation: "Beryllium combines low mass with high stiffness, so a component can resist bending without being heavy. That matters in spacecraft, where both shape and launch mass are important.",
      clue: "I am a light, stiff metal used in some space telescope mirrors.",
      hint: 'It is an alkaline earth metal.',
    },
  ],
  5: [
    {
      topic: 'technology',
      question: 'Which element is added to glass cookware so it can handle sudden temperature changes?',
      explanation: "Borosilicate glass expands less when heated than ordinary glass. Smaller changes in size reduce the stresses that can crack a dish when its temperature changes suddenly.",
      clue: "My compounds help glass withstand sudden changes in temperature.",
      hint: 'Its name starts with B.',
    },
  ],
  6: [
    {
      topic: 'food',
      question: "Which element, also found in diamond, is present in the gas that makes drinks fizzy?",
      explanation: "The bubbles are carbon dioxide, a compound containing carbon and oxygen. Opening a bottle lowers the pressure above the drink, allowing dissolved gas to escape.",
      clue: "I am present in the gas that makes fizzy drinks bubble.",
      hint: 'It can form diamond and graphite.',
    },
    {
      topic: 'environment',
      question: 'Which element do plants take from the air when they make sugar by photosynthesis?',
      explanation: "Photosynthesis uses light energy to build sugars from carbon dioxide and water. The carbon atoms become part of the sugar, which plants can use for growth or store for later.",
      clue: "Plants take me from the air to build sugars.",
      hint: 'It is central to life chemistry.',
    },
    {
      topic: 'common-object',
      question: "Which element forms both diamond and the graphite in pencils?",
      explanation: "In diamond, carbon atoms form a rigid three-dimensional network. In graphite they form sheets that slide over one another, which is why pencil marks can rub off onto paper.",
      clue: "I can form both diamond and the graphite in pencils.",
      hint: 'Its symbol is C.',
    },
  ],
  7: [
    {
      topic: 'environment',
      question: 'Which element makes up about 78 percent of the air around us?',
      explanation: "Nitrogen gas consists of pairs of atoms joined by a very strong bond. Most organisms cannot use it directly; nitrogen-fixing microbes convert it into compounds that enter food chains.",
      clue: "I make up about 78 percent of the air.",
      hint: 'It is found in proteins and DNA.',
    },
    {
      topic: 'food',
      question: "Which element is supplied by nitrate fertilisers?",
      explanation: "Plants take up nitrogen in compounds such as nitrates and use it to build amino acids. Those amino acids join into proteins, so harvesting crops removes some nitrogen from the soil.",
      clue: "Nitrate fertilisers supply me to growing plants.",
      hint: 'Its symbol is N.',
    },
  ],
  8: [
    {
      topic: 'body',
      question: 'Which element do your cells need from every breath to release energy from food?',
      explanation: "Oxygen accepts electrons at the end of a series of reactions in cellular respiration. This helps cells make ATP, a molecule that supplies energy for processes such as muscle contraction.",
      clue: "Your cells use me when releasing energy from food.",
      hint: 'It is a gas at room temperature.',
    },
    {
      topic: 'environment',
      question: "Which element is most abundant in Earth’s crust by mass?",
      explanation: "Much of the oxygen in the crust is chemically bonded into minerals. For example, quartz contains silicon and oxygen, so oxygen’s abundance does not mean the ground is full of trapped gas.",
      clue: "I am the most abundant element in Earth’s crust by mass.",
      hint: 'It is part of water.',
    },
  ],
  9: [
    {
      topic: 'body',
      question: 'Which element is used in toothpaste compounds that help protect teeth from decay?',
      explanation: "Fluoride helps minerals rebuild tooth enamel and makes its surface more resistant to acid. The useful form is fluoride in a compound, not fluorine gas.",
      clue: "My fluoride compounds help protect tooth enamel.",
      hint: 'It is a halogen.',
    },
  ],
  10: [
    {
      topic: 'common-object',
      question: "Which noble gas produces a red-orange glow in an electric sign?",
      explanation: "An electric discharge gives energy to the gas atoms. As their electrons return to lower energy levels, they emit a characteristic mixture of light that looks red-orange.",
      clue: "I am a noble gas that gives electric signs a red-orange glow.",
      hint: 'It is a noble gas.',
    },
  ],
  11: [
    {
      topic: 'food',
      question: 'Which element joins with chlorine to make ordinary table salt?',
      explanation: "Table salt forms a lattice of positive sodium ions and negative chloride ions. Their electrical attraction holds the crystal together, giving it properties very different from either pure element.",
      clue: "I combine with chlorine to form table salt.",
      hint: 'Its symbol is Na.',
    },
    {
      topic: 'common-object',
      question: 'Which element made many older street lamps glow yellow-orange?',
      explanation: "Electricity excites atoms in sodium vapour. When they release that energy, much of the light falls in a narrow yellow region of the spectrum.",
      clue: "My vapour gave many older street lamps their yellow light.",
      hint: 'It is an alkali metal.',
    },
  ],
  12: [
    {
      topic: 'common-object',
      question: 'Which element burns with a dazzling white flame in flares and fireworks?',
      explanation: "Magnesium reacts rapidly with oxygen and releases energy as heat and bright light. The product is magnesium oxide, a white solid left after the metal burns.",
      clue: "I burn with a bright white light in flares.",
      hint: 'Its symbol is Mg.',
    },
    {
      topic: 'environment',
      question: 'Which element sits at the centre of chlorophyll, the green pigment in leaves?',
      explanation: "Chlorophyll absorbs light that drives the first stages of photosynthesis. Magnesium is part of the molecule’s central structure; the whole pigment, rather than loose magnesium metal, does this job.",
      clue: "I sit at the centre of chlorophyll molecules.",
      hint: 'It is important in green leaves.',
    },
  ],
  13: [
    {
      topic: 'common-object',
      question: "Which lightweight metal is widely used for drink cans and kitchen foil?",
      explanation: "Aluminium has a low density, so a given-sized part can be relatively light. For aircraft frames it is usually alloyed with other elements to make it stronger.",
      clue: "I am widely used in drink cans and kitchen foil.",
      hint: 'It is the most abundant metal in Earths crust.',
    },
  ],
  14: [
    {
      topic: 'technology',
      question: "Which element is the main semiconductor in most computer chips?",
      explanation: "Small amounts of added elements change how easily charge moves through silicon. This lets engineers make switches called transistors, which form the working circuits in computer chips.",
      clue: "I am the main semiconductor in most computer chips.",
      hint: 'Silicon Valley is named after it.',
    },
    {
      topic: 'common-object',
      question: "Which element combines with oxygen to form quartz?",
      explanation: "Quartz is silicon dioxide: silicon atoms bonded with oxygen in an extended structure. Melting silica with other ingredients produces many familiar types of glass.",
      clue: "I combine with oxygen to form quartz.",
      hint: 'Its symbol is Si.',
    },
  ],
  16: [
    {
      topic: 'danger',
      question: "Which yellow element is present in the compound responsible for a rotten-egg smell?",
      explanation: "The familiar smell comes from hydrogen sulfide, not pure sulfur. The properties of a compound depend on how its atoms are bonded, so the smell of one compound does not describe every sulfur-containing substance.",
      clue: "One of my compounds produces a rotten-egg smell.",
      hint: 'It is found near volcanoes and hot springs.',
    },
    {
      topic: 'environment',
      question: "Which yellow element forms a colourless dioxide gas that contributes to acid rain?",
      explanation: "Sulfur dioxide can be oxidised in the atmosphere and contribute to sulfuric acid in droplets. Rain can then carry that acid to the ground.",
      clue: "My dioxide is a volcanic gas that contributes to acid rain.",
      hint: 'Its symbol is S.',
    },
  ],
  17: [
    {
      topic: 'common-object',
      question: 'Which element helps keep swimming pools clean but is poisonous as a pure gas?',
      explanation: "Chlorine-based disinfectants form reactive substances in water that damage microbes. Their effectiveness depends on the water’s chemistry and the amount used.",
      clue: "My compounds help disinfect swimming pools.",
      hint: 'It is a halogen.',
    },
    {
      topic: 'food',
      question: 'Which element joins with sodium to make ordinary table salt?',
      explanation: "Sodium chloride contains chloride ions held in a crystal with sodium ions. Chloride is chemically different from the reactive chlorine molecules found in chlorine gas.",
      clue: "I combine with sodium to form table salt.",
      hint: 'Its symbol is Cl.',
    },
  ],
  18: [
    {
      topic: 'common-object',
      question: 'Which element is put inside some light bulbs so the hot filament does not react with air?',
      explanation: "A hot filament would react with oxygen and fail quickly. Argon provides an atmosphere that reacts very little with the metal, helping the filament last.",
      clue: "I protect the hot filament inside some light bulbs.",
      hint: 'It is a noble gas.',
    },
  ],
  19: [
    {
      topic: 'food',
      question: 'Which element makes bananas very slightly radioactive?',
      explanation: "Natural potassium includes a small fraction of potassium-40, whose nucleus can decay. The radioactivity comes from that isotope, not from the banana having been exposed to radiation.",
      clue: "One of my natural isotopes makes bananas slightly radioactive.",
      hint: 'Its symbol is K.',
    },
    {
      topic: 'body',
      question: "Which alkali metal is found in high concentrations inside cells and helps nerve signals?",
      explanation: "Cells maintain different concentrations of potassium ions inside and outside their membranes. Ion movement through channels helps change the electrical voltage needed for nerve and muscle activity.",
      clue: "My ions are concentrated inside cells and help nerve signals.",
      hint: 'It is an alkali metal.',
    },
  ],
  20: [
    {
      topic: 'body',
      question: 'Which element helps make bones and teeth hard?',
      explanation: "Calcium is part of a phosphate mineral called hydroxyapatite. Tiny crystals of this mineral reinforce bones and form much of the hard enamel on teeth.",
      clue: "My phosphate compounds give bones and teeth much of their hardness.",
      hint: 'Its symbol is Ca.',
    },
  ],
  24: [
    {
      topic: 'common-object',
      question: 'Which element helps make stainless steel resist rust?',
      explanation: "Chromium reacts with oxygen to form a thin surface layer that slows further corrosion. Stainless steel can still corrode under some conditions, so rust-resistant does not mean rust-proof.",
      clue: "I help stainless steel resist corrosion.",
      hint: 'Its name is linked to colour.',
    },
  ],
  26: [
    {
      topic: 'body',
      question: 'Which element in haemoglobin helps blood carry oxygen?',
      explanation: "Iron in haemoglobin binds oxygen reversibly. That allows blood to pick oxygen up in the lungs and release it where tissues need it.",
      clue: "I am part of haemoglobin, which carries oxygen in blood.",
      hint: 'Its symbol is Fe.',
    },
    {
      topic: 'common-object',
      question: 'Which element is the main ingredient in steel?',
      explanation: "Adding a small amount of carbon changes how layers of iron atoms move past each other. This can make steel harder and stronger than pure iron.",
      clue: "I am the main metal in steel.",
      hint: 'It rusts when exposed to oxygen and water.',
    },
  ],
  29: [
    {
      topic: 'technology',
      question: "Which reddish metal is commonly used for household electrical wiring?",
      explanation: "Copper’s mobile electrons carry charge through the metal. It can also be drawn into thin wires and bent into shape, making it practical for electrical connections.",
      clue: "I am a reddish metal widely used for electrical wiring.",
      hint: 'Its symbol is Cu.',
    },
    {
      topic: 'history',
      question: 'Which element gives the Statue of Liberty its green surface after reacting with air and rain?',
      explanation: "Over time, exposed copper reacts with substances in the air and moisture to form a surface layer called a patina. The green layer slows further attack on the underlying metal.",
      clue: "My surface forms the Statue of Liberty’s green patina.",
      hint: 'It is a reddish metal.',
    },
  ],
  30: [
    {
      topic: 'body',
      question: "Which element forms the white oxide used in many mineral sunscreens?",
      explanation: "Zinc oxide absorbs much of the ultraviolet light that reaches it and also scatters some light. It is the compound’s interaction with light, rather than zinc metal, that makes it useful in sunscreen.",
      clue: "My white oxide is used in mineral sunscreens.",
      hint: 'Its symbol is Zn.',
    },
  ],
  35: [
    {
      topic: 'weird',
      question: 'Which reddish-brown element is one of only two elements that are liquid at room temperature?',
      explanation: "Bromine consists of pairs of atoms held together as molecules. At room temperature those molecules can move past one another while remaining close together, giving the substance a liquid form.",
      clue: "I am a reddish-brown liquid at room temperature.",
      hint: 'It is a halogen.',
    },
  ],
  36: [
    {
      topic: 'technology',
      question: "Which noble gas takes its name from the Greek word for hidden and is used in some flash lamps?",
      explanation: "An electric discharge transfers energy to krypton atoms. They release light as they return to lower energy states, which is useful in certain lamps and photographic flashes.",
      clue: "My name comes from the Greek word for hidden, and I am used in some flash lamps.",
      hint: 'Its symbol is Kr.',
    },
  ],
  47: [
    {
      topic: 'common-object',
      question: "Which precious metal is used as a highly reflective coating in mirrors?",
      explanation: "A thin silver layer reflects a large fraction of visible light. A protective backing helps keep the surface from tarnishing and losing its usefulness as a mirror.",
      clue: "I am a precious metal used as a reflective mirror coating.",
      hint: 'Its symbol is Ag.',
    },
  ],
  50: [
    {
      topic: 'history',
      question: "Which element coats the steel in traditional food cans?",
      explanation: "The steel gives the can its strength, while a thin tin coating helps protect the surface from corrosion. A coating can therefore supply a useful property without making the whole object from that metal.",
      clue: "I coat the steel in traditional food cans.",
      hint: 'Its symbol is Sn.',
    },
  ],
  53: [
    {
      topic: 'body',
      question: "Which element is built into thyroid hormone molecules?",
      explanation: "Iodine atoms are built into thyroid hormone molecules. These hormones help regulate how the body uses energy; iodine is a component of the signal rather than a fuel burned by cells.",
      clue: "My atoms are built into thyroid hormones.",
      hint: 'Its symbol is I.',
    },
  ],
  54: [
    {
      topic: 'technology',
      question: "Which noble gas is used as propellant in many spacecraft ion thrusters?",
      explanation: "An ion thruster removes electrons from xenon atoms and accelerates the resulting ions electrically. Expelling those ions produces a small, sustained thrust on the spacecraft.",
      clue: "My ions propel some spacecraft engines.",
      hint: 'Its symbol is Xe.',
    },
  ],
  56: [
    {
      topic: 'common-object',
      question: 'Which element gives many green fireworks their colour?',
      explanation: "Heating transfers energy to barium-containing substances in the firework. As excited particles release energy, some of it appears as the characteristic green light.",
      clue: "My salts help give fireworks a green colour.",
      hint: 'It is an alkaline earth metal.',
    },
  ],
  60: [
    {
      topic: 'technology',
      question: 'Which element is used in very strong magnets found in headphones, speakers, and wind turbines?',
      explanation: "Neodymium is used in an alloy with iron and boron that can retain strong magnetisation. A small magnet can then produce a useful magnetic field inside compact devices.",
      clue: "I am used with iron and boron to make powerful magnets.",
      hint: 'It is a lanthanide.',
    },
  ],
  74: [
    {
      topic: 'technology',
      question: "Which metal was widely used for the filament in incandescent light bulbs?",
      explanation: "An electric current heats the filament until it emits visible light. Tungsten’s high melting point allows it to reach a bright glow while remaining solid.",
      clue: "I was widely used in incandescent light bulb filaments.",
      hint: 'Its symbol is W.',
    },
  ],
  77: [
    {
      topic: 'space',
      question: 'Which element is unusually common in the asteroid layer linked to the dinosaur extinction?',
      explanation: "An unusually iridium-rich layer occurs at the boundary associated with the mass extinction. Since many meteorites contain more iridium than Earth’s crust, the layer helped support the impact explanation.",
      clue: "I enriched the geological layer linked to the dinosaur extinction.",
      hint: 'It is a dense transition metal.',
    },
  ],
  78: [
    {
      topic: 'technology',
      question: 'Which element helps catalytic converters clean car exhaust gases?',
      explanation: "Platinum provides a surface where exhaust molecules can react more readily. A catalyst speeds these reactions without being consumed overall, helping convert carbon monoxide and hydrocarbons into less harmful products.",
      clue: "I help speed up reactions in car catalytic converters.",
      hint: 'It is a precious metal.',
    },
  ],
  79: [
    {
      topic: 'technology',
      question: "Which yellow precious metal coats some electrical connectors to resist corrosion?",
      explanation: "An oxide or tarnish layer can interfere with an electrical contact. Gold resists such surface changes, so a very thin coating helps connectors stay reliable.",
      clue: "I am a yellow precious metal used to coat electrical contacts.",
      hint: 'Its symbol is Au.',
    },
    {
      topic: 'history',
      question: 'Which element has been treasured for coins and jewellery for thousands of years because it stays shiny?',
      explanation: "Gold reacts very little with air and moisture, so its surface keeps its appearance. Its softness also lets craftspeople shape it into detailed objects without it cracking easily.",
      clue: "I keep my shine in jewellery because I react very little with air.",
      hint: 'It is a yellow precious metal.',
    },
  ],
  80: [
    {
      topic: 'weird',
      question: 'Which metal is liquid at room temperature?',
      explanation: "Mercury’s melting point is below ordinary room temperature. Its atoms can therefore move past one another as a liquid under conditions where most metals remain solid.",
      clue: "I am a metal that is liquid at ordinary room temperature.",
      hint: 'Its symbol is Hg.',
    },
  ],
  82: [
    {
      topic: 'danger',
      question: 'Which heavy metal was once used in paint and pipes but is dangerous to the brain?',
      explanation: "Lead can disrupt biological processes by interfering with other metal ions, including calcium. Developing nervous systems are particularly vulnerable, which is why old lead-containing materials need careful management.",
      clue: "I was used in old paints and pipes, but can damage the nervous system.",
      hint: 'Its symbol is Pb.',
    },
    {
      topic: 'technology',
      question: 'Which element is used in heavy shielding to block X-rays and gamma rays?',
      explanation: "Lead packs a large amount of matter into a small volume. Its atoms can absorb or scatter X-rays and gamma rays, reducing the radiation that passes through a shield.",
      clue: "I am a dense metal used in radiation shielding.",
      hint: 'It is very dense and soft.',
    },
  ],
  83: [
    {
      topic: 'weird',
      question: "Which element forms stepped crystals with a rainbow-coloured oxide surface?",
      explanation: "The rainbow colours come from a thin oxide film on the bismuth surface. Reflections from different layers of that film interfere with one another, enhancing some colours and cancelling others.",
      clue: "My stepped crystals can have a rainbow-coloured surface.",
      hint: 'Its symbol is Bi.',
    },
  ],
  92: [
    {
      topic: 'technology',
      question: 'Which element is used as fuel in many nuclear power stations?',
      explanation: "When uranium-235 undergoes fission, it releases heat and additional neutrons. A reactor controls the chain reaction and transfers the heat to systems that generate electricity.",
      clue: "One of my isotopes fuels many nuclear reactors.",
      hint: 'It is an actinide.',
    },
  ],
  95: [
    {
      topic: 'common-object',
      question: "Which element is used in tiny amounts inside ionisation smoke detectors?",
      explanation: "In an ionisation smoke detector, alpha radiation helps maintain a small electric current through the air. Smoke disrupts that current, allowing the detector to trigger an alarm.",
      clue: "I am used in tiny amounts in ionisation smoke detectors.",
      hint: 'It is named after the Americas.',
    },
  ],
};

export function getRelatableTrivia(element: Element): RelatableTrivia[] {
  return [...(RELATABLE_TRIVIA[element.atomicNumber] ?? []), ...(MORE_TRIVIA[element.atomicNumber] ?? [])];
}

export function pickRelatableTrivia(element: Element): RelatableTrivia | null {
  const entries = getRelatableTrivia(element);
  if (entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)];
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
        explanation: '',
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
        explanation: '',
        hint: `This element is a ${categoryLabel(el.category)}.`,
      };
    },
    // sn-3: Tricky symbols that come from Latin/German names
    (el, pool, n) => {
      const TRICKY: Record<string, string> = {
        'Fe': 'ferrum (Latin for iron)',
        'Au': 'aurum (Latin for gold)',
        'Pb': 'plumbum (Latin for lead)',
        'Ag': 'argentum (Latin for silver)',
        'Hg': 'hydrargyrum (Greek, meaning liquid silver)',
        'Na': 'natrium (Latin/Arabic)',
        'K': 'kalium (Latin)',
        'Cu': 'cuprum (Latin for copper)',
        'Sn': 'stannum (Latin for tin)',
        'W': 'wolfram (German)',
        'Sb': 'stibium (Latin for antimony)',
        'Bi': 'bismuthum (Medieval Latin)',
      };
      if (!TRICKY[el.symbol]) return null;
      const distractors = pickRandom(pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `sn-3-${el.atomicNumber}`,
        category: 'symbol-name',
        questionText: `Which element uses the historical symbol "${el.symbol}"?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `${el.name}'s symbol ${el.symbol} comes from its old Latin/German name — ${TRICKY[el.symbol]}!`,
        hint: `This element is a ${categoryLabel(el.category)}.`,
      };
    },
    // Match an element name to the correct symbol pair.
    (el, pool, n) => {
      const others = pickRandom(pool, n - 1, [el]);
      if (others.length < n - 1) return null;
      const wrongPairs = others.map((other, index) => `${other.name} — ${others[(index + 1) % others.length].symbol}`);
      const correct = `${el.name} — ${el.symbol}`;
      const choices = shuffleArray([correct, ...wrongPairs]);
      return {
        id: `sn-4-${el.atomicNumber}-${others.map(other => other.atomicNumber).sort((a, b) => a - b).join('-')}`,
        category: 'symbol-name',
        questionText: 'Which element and chemical symbol are correctly matched?',
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: '',
        hint: `Look carefully at capital and lowercase letters.`,
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
        explanation: `It has ${el.atomicNumber} proton${el.atomicNumber > 1 ? 's' : ''} in its nucleus — that's what makes it ${el.name}!`,
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
        explanation: `Atomic number ${el.atomicNumber} means ${el.atomicNumber} proton${el.atomicNumber > 1 ? 's' : ''} in the nucleus!`,
        hint: `Its symbol is ${el.symbol}.`,
      };
    },
    (el, pool, n) => {
      const nearby = pool.filter(e => e.atomicNumber !== el.atomicNumber && Math.abs(e.atomicNumber - el.atomicNumber) <= 6);
      const distractors = pickRandom(nearby.length >= n - 1 ? nearby : pool, n - 1, [el]).map(e => e.name);
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `an-3-${el.atomicNumber}`,
        category: 'atomic-number',
        questionText: `Which element has ${el.atomicNumber} protons in its nucleus?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `${el.name} has atomic number ${el.atomicNumber}, which means every ${el.name} atom has ${el.atomicNumber} protons.`,
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
        explanation: '',
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
        explanation: '',
        hint: `${el.name} is a ${categoryLabel(el.category)}.`,
      };
    },
    // gc-3: Which of these is in the same GROUP as X?
    (el, pool, n) => {
      if (el.group === null) return null;
      const sameGroup = pool.filter(e => e.group === el.group && e.atomicNumber !== el.atomicNumber);
      if (sameGroup.length === 0) return null;
      const correct = sameGroup[Math.floor(Math.random() * sameGroup.length)];
      const distractors = pickRandom(
        pool.filter(e => e.group !== el.group && e.atomicNumber !== el.atomicNumber && e.atomicNumber !== correct.atomicNumber),
        n - 1, [el, correct]
      );
      if (distractors.length < n - 1) return null;
      const all = shuffleArray([correct, ...distractors]);
      const choices = all.map(e => e.name);
      return {
        id: `gc-3-${el.atomicNumber}-${correct.atomicNumber}`,
        category: 'group-classification',
        questionText: `Which of these elements is in the same GROUP (column) as ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(correct.name),
        element: correct,
        explanation: `${correct.name} and ${el.name} are both in group ${el.group}!`,
        hint: `${el.name} is a ${categoryLabel(el.category)}.`,
      };
    },
    (el, _pool, n) => {
      const correct = String(el.period);
      const periodChoices = ['1', '2', '3', '4', '5', '6', '7'].filter(p => p !== correct);
      const rawChoices = shuffleArray([correct, ...pickRandom(periodChoices, n - 1)]);
      const choices = rawChoices.map(p => `Period ${p}`);
      return {
        id: `gc-4-${el.atomicNumber}`,
        category: 'group-classification',
        questionText: `Which period (row) of the periodic table is ${el.name} in?`,
        choices,
        correctIndex: choices.indexOf(`Period ${correct}`),
        element: el,
        explanation: `${el.name} is in period ${el.period} and block ${el.block}.`,
        hint: `Its atomic number is ${el.atomicNumber}.`,
      };
    },
    // Reverse the usual family question: choose an example from the family.
    (el, pool, n) => {
      const correct = el.name;
      const distractors = pickRandom(pool.filter(other => other.category !== el.category), n - 1, [el]).map(other => other.name);
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([correct, ...distractors]);
      return {
        id: `gc-5-${el.atomicNumber}`,
        category: 'group-classification',
        questionText: `Which of these elements is a ${categoryLabel(el.category)}?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: '',
        hint: 'Think about where each choice sits on the periodic table.',
      };
    },
    // Identify the s, p, d or f block.
    (el, _pool, _n) => {
      const correct = `${el.block} block`;
      const choices = shuffleArray(['s block', 'p block', 'd block', 'f block']);
      return {
        id: `gc-6-${el.atomicNumber}`,
        category: 'group-classification',
        questionText: `Which periodic-table block contains ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: '',
        hint: 'The s block is mostly on the left, d in the middle, p on the right and f below.',
      };
    },
  ],

  'discovery': [
    (el, pool, n) => {
      if (!el.discoveredBy || el.discoveredBy === 'Ancient') return null;
      const correct = el.discoveredBy;
      const distractors = pickUniqueDistractors(
        pool.filter(e => e.discoveredBy && e.discoveredBy !== 'Ancient'),
        n - 1,
        e => e.discoveredBy,
        correct,
        el
      );
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([correct, ...distractors]);
      return {
        id: `di-1-${el.atomicNumber}`,
        category: 'discovery',
        questionText: `Who discovered ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: `${el.name} was discovered by ${el.discoveredBy}${el.discoveryYear ? ` in ${el.discoveryYear}` : ''}.`,
        hint: `It was discovered in ${el.discoveryCountry}.`,
      };
    },
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
        explanation: `Discovered by ${el.discoveredBy} in ${el.discoveryCountry} (${el.discoveryYear}).`,
        hint: `It was discovered by ${el.discoveredBy}.`,
      };
    },
    // di-3: Which country was X discovered in?
    (el, pool, n) => {
      if (!el.discoveryCountry || el.discoveredBy === 'Ancient') return null;
      const correct = el.discoveryCountry;
      const distractors = pickUniqueDistractors(
        pool.filter(e => e.discoveryCountry && e.discoveryCountry !== correct && e.discoveredBy !== 'Ancient'),
        n - 1,
        e => e.discoveryCountry!,
        correct,
        el
      );
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([correct, ...distractors]);
      return {
        id: `di-3-${el.atomicNumber}`,
        category: 'discovery',
        questionText: `In which country was ${el.name} first discovered?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: `${el.name} was discovered in ${el.discoveryCountry} in ${el.discoveryYear} by ${el.discoveredBy}.`,
        hint: `It was discovered by ${el.discoveredBy}.`,
      };
    },
  ],

  'state': [
    (el, _pool, _n) => {
      if (el.atomicNumber > 99) return null; // No bulk sample: state is often only predicted.
      const states = ['solid', 'liquid', 'gas', 'plasma'];
      const choices = shuffleArray(states);
      return {
        id: `st-1-${el.atomicNumber}`,
        category: 'state',
        questionText: `What state is ${el.name} at about 20°C and normal atmospheric pressure?`,
        choices: choices.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        correctIndex: choices.indexOf(el.stateAtRoomTemp),
        element: el,
        explanation: '',
        hint: 'A solid keeps its shape, a liquid flows, and a gas fills its container.',
      };
    },
    // st-2: Which of these elements is a GAS/LIQUID at room temperature?
    (el, pool, n) => {
      if (el.atomicNumber > 99) return null;
      const targetState = el.stateAtRoomTemp;
      if (targetState === 'solid') return null; // too many solids, not interesting
      const others = pickRandom(
        pool.filter(e => e.atomicNumber <= 99 && e.stateAtRoomTemp !== targetState && e.atomicNumber !== el.atomicNumber),
        n - 1, [el]
      );
      if (others.length < n - 1) return null;
      const all = shuffleArray([el, ...others]);
      const choices = all.map(e => e.name);
      return {
        id: `st-2-${el.atomicNumber}`,
        category: 'state',
        questionText: `Which of these elements is a ${targetState} at about 20°C and normal atmospheric pressure?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `${el.name} is a ${targetState} at room temperature!`,
        hint: `Noble gases and some nonmetals are gases; mercury and bromine are the only liquid elements.`,
      };
    },
  ],

  'radioactivity': [
    (el, _pool, _n) => {
      const correct = el.stableIsotopes > 0
        ? 'It has at least one stable isotope'
        : 'None of its known isotopes are stable';
      const alternatives = el.stableIsotopes > 0
        ? ['None of its known isotopes are stable', 'Every isotope is radioactive', 'It has no isotopes at all']
        : ['It has at least one stable isotope', 'Every isotope lasts forever', 'It has no atomic nucleus'];
      const choices = shuffleArray([correct, ...alternatives]);
      return {
        id: `ra-1-${el.atomicNumber}`,
        category: 'radioactivity',
        questionText: `Which statement about ${el.name}'s isotopes is correct?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: '',

        hint: el.radioactive
          ? `Elements with atomic number above 82 are usually radioactive.`
          : `Most common elements are stable.`,
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
        explanation: '',
        hint: `${el.name} is a ${categoryLabel(el.category)}.`,
      };
    },
    (el, pool, n) => {
      if (el.radioactive || el.stableIsotopes <= 0) return null;
      const distractors = pickUniqueDistractors(
        pool.filter(e => !e.radioactive && e.stableIsotopes > 0 && e.stableIsotopes !== el.stableIsotopes),
        n - 1,
        e => e.name,
        el.name,
        el
      );
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([el.name, ...distractors]);
      return {
        id: `is-2-${el.atomicNumber}-${el.stableIsotopes}`,
        category: 'isotopes',
        questionText: `Which element has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}?`,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: `${el.name} has ${el.stableIsotopes} stable isotope${el.stableIsotopes === 1 ? '' : 's'}.`,
        hint: `${el.name} is a ${categoryLabel(el.category)}.`,
      };
    },
  ],

  'compounds': [
    (el, pool, n) => {
      if (el.compounds.length === 0) return null;
      const eligibleCompounds = el.compounds.filter(c => new RegExp(`${el.symbol}(?![a-z])`).test(c));
      if (!eligibleCompounds.length) return null;
      const compound = eligibleCompounds[Math.floor(Math.random() * eligibleCompounds.length)];
      // Filter distractors: must not contain the target element's symbol in their formula
      const symbolPattern = new RegExp(`${el.symbol}(?![a-z])`);
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
        explanation: '',
        hint: `${el.name}'s symbol is ${el.symbol} — look for it in the formulas.`,
      };
    },
    (el, pool, n) => {
      if (el.compounds.length === 0) return null;
      const eligibleCompounds = el.compounds.filter(c => new RegExp(`${el.symbol}(?![a-z])`).test(c));
      if (!eligibleCompounds.length) return null;
      const correct = eligibleCompounds[Math.floor(Math.random() * eligibleCompounds.length)];
      const distractors = pickUniqueDistractors(
        pool.filter(e => e.compounds.some(c => !new RegExp(`${el.symbol}(?![a-z])`).test(c))),
        n - 1,
        e => {
          const eligible = e.compounds.filter(c => !new RegExp(`${el.symbol}(?![a-z])`).test(c));
          return eligible[Math.floor(Math.random() * eligible.length)];
        },
        correct,
        el
      );
      if (distractors.length < n - 1) return null;
      const choices = shuffleArray([correct, ...distractors]);
      return {
        id: `co-2-${el.atomicNumber}-${correct}`,
        category: 'compounds',
        questionText: `Which formula represents a compound containing ${el.name.toLowerCase()}?`,
        choices,
        correctIndex: choices.indexOf(correct),
        element: el,
        explanation: `${correct} is one compound that contains ${el.name}.`,
        hint: `Look for the symbol ${el.symbol}.`,
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
        explanation: '',
        hint: `This element is a ${categoryLabel(el.category)}.`,
      };
    },
    // po-2: Which element is in the same PERIOD (row) as X?
    (el, pool, n) => {
      const samePeriod = pool.filter(e => e.period === el.period && e.atomicNumber !== el.atomicNumber);
      if (samePeriod.length === 0) return null;
      const correct = samePeriod[Math.floor(Math.random() * samePeriod.length)];
      const distractors = pickRandom(
        pool.filter(e => e.period !== el.period && e.atomicNumber !== el.atomicNumber && e.atomicNumber !== correct.atomicNumber),
        n - 1, [el, correct]
      );
      if (distractors.length < n - 1) return null;
      const all = shuffleArray([correct, ...distractors]);
      const choices = all.map(e => e.name);
      return {
        id: `po-2-${el.atomicNumber}-${correct.atomicNumber}`,
        category: 'position',
        questionText: `Which of these elements is in the same PERIOD (row) as ${el.name}?`,
        choices,
        correctIndex: choices.indexOf(correct.name),
        element: correct,
        explanation: `${correct.name} and ${el.name} are both in period ${el.period}!`,
        hint: `${el.name} is in period ${el.period}.`,
      };
    },
  ],

  // Use authored question/explanation pairs, never a fact with its name blanked out.
  'fun-fact': [
    (el, pool, n) => {
      const entries = getRelatableTrivia(el);
      const trivia = pickRelatableTrivia(el);
      if (!trivia) return null;
      const choices = elementNameChoices(el, pool, n);
      return {
        id: `trivia-${el.atomicNumber}-${entries.indexOf(trivia)}`,
        category: 'fun-fact',
        questionText: trivia.question,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: trivia.explanation,
        hint: trivia.hint ?? `Its symbol is ${el.symbol}.`,
      };
    },
  ],

  'uses': [
    (el, pool, n) => {
      const entries = getRelatableTrivia(el);
      const trivia = pickRelatableTrivia(el);
      if (!trivia) return null;
      const choices = elementNameChoices(el, pool, n);
      return {
        id: `trivia-${el.atomicNumber}-${entries.indexOf(trivia)}`,
        category: 'uses',
        questionText: trivia.question,
        choices,
        correctIndex: choices.indexOf(el.name),
        element: el,
        explanation: trivia.explanation,
        hint: trivia.hint ?? `Its symbol is ${el.symbol}.`,
      };
    },
  ],

  'obtained-from': [
    (el, _pool, n) => {
      const methods: Record<number, { answer: string; explanation: string; question?: string }> = {
        1: { answer: 'Splitting water by electrolysis', question: 'Which process can produce hydrogen from water?', explanation: 'An electric current drives the splitting of water. Hydrogen forms at one electrode and oxygen at the other, so the gases can be collected separately.' },
        8: { answer: 'Separating liquid air by distillation', explanation: 'Air is cooled until it becomes liquid. Its components have different boiling points, allowing oxygen to be separated as the mixture warms.' },
        13: { answer: 'Electrolysing aluminium oxide dissolved in molten cryolite', explanation: 'Aluminium binds strongly to oxygen, so extracting it requires substantial energy. An electric current separates it from the oxide dissolved in a molten electrolyte.' },
        17: { answer: 'Electrolysing concentrated salt solution', explanation: 'Brine contains chloride ions. During electrolysis these ions lose electrons at the positive electrode and form chlorine gas.' },
        18: { answer: 'Separating liquid air by distillation', explanation: 'Argon is present in air as separate atoms, not chemically bonded to the other gases. Distillation exploits differences in boiling point to separate the mixture.' },
        26: { answer: 'Reducing iron oxide in a blast furnace', explanation: 'Carbon monoxide reacts with iron oxide and removes its oxygen. The iron is released from the compound, rather than being created from a different element.' },
        11: { answer: 'Electrolysing molten sodium chloride', explanation: 'Sodium ions gain electrons at the negative electrode. The salt must be molten rather than dissolved in water, because water would react and prevent sodium metal from being collected this way.' },
      };
      const method = methods[el.atomicNumber];
      if (!method) return null;
      const alternatives = ['Filtering the element out of seawater', 'Melting pure sand', 'Burning wood and collecting the ash', 'Freezing distilled water'];
      const choices = shuffleArray([method.answer, ...alternatives.slice(0, n - 1)]);
      return {
        id: `extraction-${el.atomicNumber}`,
        category: 'obtained-from',
        questionText: method.question ?? `Which process is used industrially to obtain ${el.name.toLowerCase()}?`,
        choices,
        correctIndex: choices.indexOf(method.answer),
        element: el,
        explanation: method.explanation,
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
      if (all.filter(e => comparisonData[e.atomicNumber]!.density === comparisonData[densest.atomicNumber]!.density).length !== 1) return null;
      const choices = all.map(e => e.name);
      const densestData = comparisonData[densest.atomicNumber]!;
      return {
        id: `wb-1-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements is the DENSEST (heaviest for its size)?`,
        choices,
        correctIndex: choices.indexOf(densest.name),
        element: densest,
        explanation: `${densest.name} has a density of ${densestData.density} g/cm³ — that's super heavy!`,
        hint: `Think about which metals feel really heavy when you hold them.`,
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
      if (all.filter(e => comparisonData[e.atomicNumber]!.abundanceCrust === comparisonData[rarest.atomicNumber]!.abundanceCrust).length !== 1) return null;
      const choices = all.map(e => e.name);
      return {
        id: `wb-4-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements is the RAREST in Earth's crust?`,
        choices,
        correctIndex: choices.indexOf(rarest.name),
        element: rarest,
        explanation: `${rarest.name} is super rare — only about ${comparisonData[rarest.atomicNumber]!.abundanceCrust} parts per million in Earth's crust!`,
        hint: `Precious metals and noble gases tend to be very rare.`,
      };
    },
    // wb-5: Which element has the highest atomic mass?
    (el, pool, n) => {
      const distractors = pickRandom(pool, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      const heaviest = all.reduce((a, b) => a.atomicMass >= b.atomicMass ? a : b);
      if (all.filter(e => e.atomicMass === heaviest.atomicMass).length !== 1) return null;
      const choices = all.map(e => e.name);
      return {
        id: `wb-5-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements has the BIGGEST atomic mass?`,
        choices,
        correctIndex: choices.indexOf(heaviest.name),
        element: heaviest,
        explanation: `${heaviest.name} has an atomic mass of ${heaviest.atomicMass}! The heavier the atom, the more protons and neutrons it has.`,
        hint: `Elements further down the periodic table are usually heavier.`,
      };
    },
    // wb-6: Which element has the highest melting point?
    (el, pool, n) => {
      if (el.atomicNumber === 6) return null;
      const data = comparisonData[el.atomicNumber];
      if (!data || data.meltingPoint === null) return null;
      const candidates = pool.filter(e => {
        const d = comparisonData[e.atomicNumber];
        return d && d.meltingPoint !== null && e.atomicNumber !== 6 && e.atomicNumber !== el.atomicNumber;
      });
      if (candidates.length < n - 1) return null;
      const distractors = pickRandom(candidates, n - 1, [el]);
      const all = shuffleArray([el, ...distractors]);
      const hottest = all.reduce((a, b) => {
        const ma = comparisonData[a.atomicNumber]!.meltingPoint!;
        const mb = comparisonData[b.atomicNumber]!.meltingPoint!;
        return ma >= mb ? a : b;
      });
      if (all.filter(e => comparisonData[e.atomicNumber]!.meltingPoint === comparisonData[hottest.atomicNumber]!.meltingPoint).length !== 1) return null;
      const choices = all.map(e => e.name);
      const mp = comparisonData[hottest.atomicNumber]!.meltingPoint!;
      return {
        id: `wb-6-${all.map(e => e.atomicNumber).sort().join('-')}`,
        category: 'which-is-bigger' as QuestionCategory,
        questionText: `Which of these elements has the HIGHEST melting point?`,
        choices,
        correctIndex: choices.indexOf(hottest.name),
        element: hottest,
        explanation: `${hottest.name} melts at ${mp}°C — that's ${mp > 1000 ? 'incredibly hot' : mp > 0 ? 'pretty warm' : 'actually below freezing'}!`,
        hint: `Metals that are used in furnaces and light bulbs often have very high melting points.`,
      };
    },
  ],
};

function conceptKey(question: Question): string {
  const family = question.id.startsWith('trivia-') ? question.id
    : ['group-classification', 'position'].includes(question.category)
      ? (question.id.startsWith('gc-4') || question.id.startsWith('po-2') ? 'period' : 'group')
      : question.category;
  return `concept:${question.element.atomicNumber}:${family}`;
}

function repetitionKeys(question: Question): string[] {
  return [question.id, conceptKey(question),
    `feedback:${normalizeForComparison(question.explanation)}`,
    `prompt:${normalizeForComparison(question.questionText)}:${normalizeForComparison(question.choices[question.correctIndex])}`];
}

function isRepeated(question: Question, used: Set<string>): boolean {
  return repetitionKeys(question).some(key => used.has(key));
}

function rememberQuestion(question: Question, used: Set<string>): void {
  repetitionKeys(question).forEach(key => used.add(key));
}

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
    if (question && (!usedIds || (!usedIds.has(question.id) && !usedIds.has(conceptKey(question))))) {
      const enriched = enrichQuestion(question);
      if (questionContainsAnswerText(enriched)) continue;
      if (usedIds && isRepeated(enriched, usedIds)) continue;
      return enriched;
    }
  }

  // Fallback must respect the same history as regular questions.
  for (const el of shuffleArray(pool)) {
    const distractors = pickRandom(pool, config.choiceCount - 1, [el]).map(e => e.symbol);
    const choices = shuffleArray([el.symbol, ...distractors]);
    const fallback = enrichQuestion({
      id: `fallback-symbol-${el.atomicNumber}`,
      category: 'symbol-name',
      questionText: `What is the chemical symbol for ${el.name}?`,
      choices,
      correctIndex: choices.indexOf(el.symbol),
      element: el,
      explanation: `The symbol for ${el.name} is ${el.symbol}.`,
      hint: `It starts with "${el.symbol[0]}".`,
    });
    if (!usedIds || !isRepeated(fallback, usedIds)) return fallback;
  }
  throw new Error('No unused questions remain for this difficulty.');
}

export function generateQuiz(difficulty: Difficulty, count: number, previousQuestions: Question[] = []): Question[] {
  const usedIds = new Set<string>();
  previousQuestions.forEach(question => rememberQuestion(question, usedIds));
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    let q = generateQuestion(difficulty, usedIds);
    for (let retry = 0; retry < 30 && questions.length && (q.element.atomicNumber === questions.at(-1)!.element.atomicNumber || questions.some(previous => previous.explanation === q.explanation) || questions.slice(-2).every(previous => previous.category === q.category)); retry++) {
      q = generateQuestion(difficulty, usedIds);
    }
    rememberQuestion(q, usedIds);
    questions.push(q);
  }
  return addExtraFacts(questions);
}

export function generateQuizBattleQuiz(difficulty: Difficulty, count: number, previousQuestions: Question[] = []): Question[] {
  return generateQuiz(difficulty, count, previousQuestions);
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
  'radioactivity': [0],    // whether the element has stable isotopes
  'isotopes': [0],          // answer is isotope count
  'compounds': [0],         // answer is a compound formula
  'discovery': [0, 1],      // answer is person or year
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
    if (cat === 'discovery' && (element.discoveredBy === 'Ancient' || !element.discoveryYear)) continue;

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
      if (isRepeated(enriched, usedIds)) continue;
      rememberQuestion(enriched, usedIds);
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
      if (isRepeated(enriched, usedIds)) continue;
      rememberQuestion(enriched, usedIds);
      questions.push(enriched);
    }
  }

  return addExtraFacts(shuffleArray(questions));
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
      if (isRepeated(enriched, usedIds)) continue;
      rememberQuestion(enriched, usedIds);
      questions.push(enriched);
    }
  }

  return addExtraFacts(shuffleArray(questions));
}
