import { elements, type Element } from '../data/elements.ts';

// Surprising, approachable fun facts. Keep the main explanation focused on the question.
export const EXTRA_FACTS = [
  "Scientists spotted helium in sunlight before they ever collected a sample on Earth.",
  "The Statue of Liberty’s green coat is a patina formed on her copper surface.",
  "A pencil tip and a diamond are made from the same element: carbon, arranged in different ways.",
  "The helium that lifts party balloons also helps keep many MRI magnets incredibly cold.",
  "Gold can be hammered into sheets so thin that a little metal covers a surprisingly large area.",
  "Your bones and teeth contain calcium phosphate: phosphorus helps build your body's own hard framework.",
  "Old light bulbs made tungsten wire glow without melting it.",
  "Most of the air you breathe is nitrogen, even though your body needs the oxygen in it.",
  "Every chlorophyll molecule has magnesium at its centre, helping give leaves their light-catching machinery.",
  "A traditional “tin can” is mostly steel wearing a thin tin coat.",
  "Silicon has a place in both sandy beaches and computer chips.",
  "Some oven dishes owe their resistance to sudden temperature changes to boron-containing glass.",
  "A mirror can owe its shine to a layer of silver much thinner than a sheet of foil.",
  "Opening a fizzy drink lets dissolved carbon dioxide escape as a crowd of tiny bubbles.",
  "The powerful magnets inside some headphones contain neodymium, iron and boron.",
  "Some spacecraft get a gentle, steady push by firing out electrically charged xenon atoms.",
  "Green fireworks can get their colour from barium-containing compounds.",
  "Stainless steel has a microscopic defence: chromium helps form a protective surface layer.",
  "Some smoke alarms rely on a tiny amount of radioactive americium to notice smoke.",
  "Each breath’s oxygen gets a lift around your body with help from iron in your blood.",
  "Bromine is one of the few elements that can sit in a bottle as a liquid at room temperature.",
  "A proton is far heavier than an electron, but their electric charges are exactly equal in size.",
  "The simplest hydrogen nucleus is a one-particle team: just a proton, with no neutron.",
  "A drop of water contains countless little groups of three atoms: two hydrogen and one oxygen.",
  "The electron has an antimatter partner called a positron, with the same mass but the opposite charge.",
  "An alpha particle has the same two-proton, two-neutron nucleus as helium-4.",
  "Helium’s two electrons completely fill its first shell, helping explain why it hardly reacts.",
  "Carbon can help tell time: its radioactive isotope carbon-14 is used to date once-living materials.",
  "One lowercase letter changes the chemistry: Co means cobalt, while CO means carbon monoxide.",
  "Every gold atom has 79 protons; changing that number means it is no longer gold.",
  "The atoms in ingredients are rearranged during a chemical reaction, rather than replaced with brand-new atoms.",
  "Two up quarks and one down quark make a proton; swapping that balance gives a neutron.",
  "Atoms can send out light when excited electrons return to lower energy levels.",
  "An atom can release a gamma ray without changing which element it is.",
  "A radioactive sample does not all disappear after one half-life: about half its original radioactive nuclei remain.",
  "Much of the hydrogen around you is older than the first stars.",
  "Gallium melts at about 30°C, so it needs only a modest rise above room temperature to turn liquid.",
  "Some screens use indium tin oxide: a coating that carries electricity while letting you see through it.",
  "Cobalt compounds have been making glass and pottery beautifully blue for centuries.",
  "Germanium can look opaque to our eyes while letting infrared light through to a thermal camera."
] as const;

const STOP_WORDS = new Set('a an the and or of in on at to for from with as by is are was were be been it its this that these those which what how why can has have each one two same different about more most some many their when into than element elements atom atoms'.split(' '));
function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z]+/g)?.filter(word => word.length > 2 && !STOP_WORDS.has(word)).map(word => word.replace(/s$/, '')) ?? []);
}

type FactQuestion = { explanation: string; questionText?: string; clues?: string[]; element?: Element; correctName?: string; topic?: string };

// Explicit subject pools keep variety from taking priority over relevance.
const TOPIC_POOLS: Array<[string, number[]]> = [
  ['atom-parts nucleus-location neutron-role neutron-charge nucleon-mass nucleons neutron-calculation mass-number', [22, 25, 31]],
  ['electron-location electron-mass electron-charge proton-charge neutral-charge electric-attraction antimatter', [21, 24, 26]],
  ['first-shell second-shell third-shell valence orbital-types s-orbital noble-gases groups periods bonding', [26, 32]],
  ['ions negative-ion positive-ion ion-calculation electron-removal static metal-conduction', [15, 21, 37]],
  ['isotopes isotope-notation isotope-chemistry average-mass carbon-dating half-life decay-calculation', [27, 34]],
  ['quarks proton-quarks neutron-quarks gluons strong-force', [31, 25]],
  ['radiation-types alpha alpha-shielding alpha-calculation beta gamma gamma-shielding transmutation', [25, 33, 18]],
  ['fission fusion stellar-elements hydrogen', [35, 22, 0]],
  ['element-identity', [29, 28]],
  ['molecules formula-reading molecule-counting element-molecule mixture-compound chemical-conservation nuclear-chemical', [23, 30, 13]],
  ['atomic-scale body-atoms thermal-motion', [23, 21]],
  ['excitation spectral-identification', [0, 32, 16]],
  ['imaging', [3, 39]],
];

export function extraFactCandidates(question: FactQuestion): string[] {
  const el = question.element ?? elements.find(element => element.name === question.correctName);
  if (el) {
    const named = EXTRA_FACTS.filter(fact => new RegExp(`\\b${el.name}\\b`, 'i').test(fact));
    return [...new Set([...named, el.funFact, ...el.additionalFacts])].filter(Boolean);
  }
  const pool = TOPIC_POOLS.find(([topics]) => topics.split(' ').includes(question.topic ?? ''));
  if (!pool) throw new Error(`Missing fun-fact subject pool: ${question.topic}`);
  return pool[1].map(index => EXTRA_FACTS[index]);
}

export function pickExtraFact(avoidText: string, used = new Set<string>(), pool: readonly string[] = EXTRA_FACTS): string {
  const avoid = words(avoidText);
  const nonRepeating = pool.filter(fact => !avoidText.toLowerCase().includes(fact.toLowerCase()));
  const relevant = nonRepeating.length ? nonRepeating : pool;
  const fresh = relevant.filter(fact => !used.has(fact));
  const candidates = fresh.length ? fresh : [...relevant];
  // Within this subject only, prefer a detail not already covered.
  const scored = candidates.map(fact => ({ fact, overlap: [...words(fact)].filter(word => avoid.has(word)).length }));
  const leastOverlap = Math.min(...scored.map(candidate => candidate.overlap));
  const eligible = scored.filter(candidate => candidate.overlap === leastOverlap);
  const chosen = eligible[Math.floor(Math.random() * eligible.length)].fact;
  used.add(chosen);
  return chosen;
}

export function addExtraFacts<T extends FactQuestion>(questions: T[]): (T & { extraFact: string })[] {
  const used = new Set<string>();
  return questions.map(question => ({ ...question, extraFact: pickExtraFact(`${question.questionText ?? question.clues?.join(' ') ?? ''} ${question.explanation}`, used, extraFactCandidates(question)) }));
}
