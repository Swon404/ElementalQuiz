import type { Element } from '../data/elements.ts';
import { comparisonData } from '../data/comparisonData.ts';
import type { Question } from './questionGenerator.ts';

const PLAIN_LANGUAGE: Array<[RegExp, string]> = [
  [/\bthe resulting nucleus\b/gi, 'the new nucleus'],
  [/\bdisplaces air\b/gi, 'pushes aside air'],
  [/\bvery unreactive\b/gi, 'very unlikely to react'],
  [/\bsuperconducting coils\b/gi, 'special coils that carry electricity'],
  [/\bwithout electrical resistance\b/gi, 'without losing energy as heat'],
  [/\bduring discharge\b/gi, 'while the battery is powering a device'],
  [/\belectrodes\b/gi, 'battery ends'],
  [/\blow mass\b/gi, 'low weight'],
  [/\bhigh stiffness\b/gi, 'the ability to keep its shape'],
  [/\bstresses that can crack\b/gi, 'forces that can crack'],
  [/\bdissolved gas\b/gi, 'gas mixed into the drink'],
  [/\brigid three-dimensional network\b/gi, 'strong 3D pattern'],
  [/\borganisms\b/gi, 'living things'],
  [/\bnitrogen-fixing microbes\b/gi, 'tiny living things in soil'],
  [/\bchemically bonded\b/gi, 'joined'],
  [/\belectric discharge\b/gi, 'electric current'],
  [/\bcharacteristic\b/gi, 'special'],
  [/\blattice\b/gi, 'repeating crystal pattern'],
  [/\belectrical attraction\b/gi, 'attraction between opposite charges'],
  [/\boxidised\b/gi, 'changed by oxygen'],
  [/\breactive substances\b/gi, 'chemicals that react easily'],
  [/\bconcentrations\b/gi, 'amounts'],
  [/\breversibly\b/gi, 'and can release it again'],
  [/\bsubstantial energy\b/gi, 'a lot of energy'],
  [/\bsubstantial electrical resistance\b/gi, 'a strong resistance to electric current'],
  [/\bmolten electrolyte\b/gi, 'hot, melted mixture that carries electricity'],
  [/\bextended structure\b/gi, 'large repeating structure'],
  [/\bregulate\b/gi, 'control'],
  [/\baccelerates the resulting ions electrically\b/gi, 'uses electricity to fire the charged atoms backwards'],
  [/\bmagnetisation\b/gi, 'magnetism'],
  [/\binterfere with\b/gi, 'disrupt'],
  [/\bhydrated oxides\b/gi, 'rust compounds containing oxygen and water'],
  [/\bemits visible light\b/gi, 'gives off light we can see'],
  [/\benvironmental impact\b/gi, 'effect on the environment'],
  [/\bradio-frequency pulses\b/gi, 'short bursts of radio waves'],
  [/\breturn towards equilibrium\b/gi, 'return to their normal state'],
  [/\bcomponent of the signal rather than a fuel burned by cells\b/gi, 'part of the message, not a fuel for cells'],
  [/\bcorrosion\b/gi, 'rusting and other damage'],
  [/\bwithout being consumed overall\b/gi, 'without being used up'],
  [/\bresistance to oxidation\b/gi, 'ability to resist reacting with oxygen'],
];

/** Keeps the science, but removes textbook wording for readers aged roughly 8–12. */
export function simplifyExplanation(text: string): string {
  let simplified = text;
  for (const [pattern, replacement] of PLAIN_LANGUAGE) simplified = simplified.replace(pattern, replacement);
  return simplified;
}

// One explanation per concept. Never append a random element biography.
export function explainCategory(el: Element): string {
  const explanations: Record<string, string> = {
    'alkali-metal': 'Alkali metals have one electron in their outer shell. They lose it easily, which is why these metals react in similar ways. Their reactions with water can be very fast and release hydrogen gas.',
    'alkaline-earth-metal': 'These metals have two electrons in their outer shell. They often lose both and form ions with a charge of +2. Several of them form important minerals in rocks, bones and teeth.',
    'transition-metal': 'Transition metals can form ions with different charges. This helps them make colourful compounds and speed up some reactions. Many are also strong, useful conductors of heat and electricity.',
    'post-transition-metal': 'These metals sit just after the transition metals in the table. They are often softer and melt more easily than transition metals. This makes some of them useful for coatings, solder and low-melting mixtures.',
    metalloid: 'Metalloids behave partly like metals and partly like nonmetals. Some can control the flow of electricity, making them useful in electronics. Their behaviour can change when tiny amounts of another element are added.',
    nonmetal: 'Many nonmetals make bonds by sharing electrons. This lets them join together to form molecules. Nonmetals include gases in the air as well as solid elements such as carbon.',
    halogen: 'Halogens have seven electrons in their outer shell. They often gain one more electron and form ions with a charge of −1. They readily form salts when they react with metals.',
    'noble-gas': 'Noble gases already have a full outer electron shell. This makes them much less likely to react with other elements. Their low reactivity is useful when a safe, protective gas is needed.',
    lanthanide: 'Lanthanides fill most of the upper separate row of the table. They behave very similarly, so separating them can be difficult. Several are used to make powerful magnets and coloured screens.',
    actinide: 'Actinides fill the lower separate row of the table. All of them are radioactive because their nuclei are unstable. Some release enough energy during nuclear changes to be used as fuels.',
  };
  return explanations[el.category] ?? 'Scientists group elements by their electrons and by how they behave in reactions.';
}

export function focusedExplanation(question: Question): string {
  const el = question.element;
  const answer = question.choices[question.correctIndex];
  switch (question.category) {
    case 'symbol-name': {
      const origins: Record<string, string> = { Fe: 'ferrum', Au: 'aurum', Ag: 'argentum', Pb: 'plumbum', Cu: 'cuprum', Sn: 'stannum', Sb: 'stibium', Na: 'natrium', K: 'kalium', W: 'wolfram', Hg: 'hydrargyrum' };
      const origin = origins[el.symbol];
      return origin
        ? `${el.symbol} comes from the old name ${origin}. Some symbols use historical names instead of the modern English name. The same symbol is used by scientists in every language.`
        : `${el.symbol} means ${el.name.toLowerCase()} in a chemical formula. The capital and lowercase letters matter, so Co and CO mean different things. This shared symbol lets scientists read the same formula around the world.`;
    }
    case 'atomic-number':
      return `Every ${el.name.toLowerCase()} atom has ${el.atomicNumber} proton${el.atomicNumber === 1 ? '' : 's'} in its nucleus. Change the number of protons and it becomes a different element. The periodic table is arranged in order of this proton count.`;
    case 'group-classification':
      if (question.id.startsWith('gc-4')) return `Period ${el.period} is a row across the table, not an element family. Elements in the same row can still behave very differently. Moving across a period adds protons and electrons one at a time.`;
      return explainCategory(el);
    case 'position':
      return question.id.startsWith('po-2')
        ? `Both elements are in period ${el.period}, which is a row across the table. Being in the same row does not mean they react in the same way. The period number is linked to the number of occupied electron shells.`
        : `A group is a column and a period is a row. ${el.name} is found where group ${el.group} and period ${el.period} meet. Its position helps scientists predict how its atoms may behave.`;
    case 'discovery': {
      const stories: Record<number, string> = {
        2: 'Scientists spotted helium as an unusual line in sunlight before finding it on Earth. Each element makes its own pattern of light, like a fingerprint. Helium was finally found in minerals on Earth nearly 30 years later.',
        11: 'Humphry Davy used electricity to separate sodium metal from a compound. This showed what was hiding inside sodium compounds people had used for centuries. Pure sodium had to be kept away from water because it reacts so quickly.',
        15: 'Hennig Brand found phosphorus while studying material left from urine. The glowing substance was a surprise because he had been trying to make gold. Its glow comes from a slow reaction with oxygen in the air.',
        55: 'Bunsen and Kirchhoff saw unfamiliar lines of light while studying mineral water. Those lines revealed the new element caesium. Its name comes from a Latin word for the sky-blue colour of its strongest lines.',
      };
      if (stories[el.atomicNumber]) return stories[el.atomicNumber];
      return question.id.startsWith('di-2')
        ? `The recorded discovery year is ${el.discoveryYear}. For example, the 19th century runs from 1801 to 1900. Discovery dates tell us when scientists first gathered convincing evidence for an element.`
        : `${el.discoveredBy} is credited with discovering it${el.discoveryYear ? ` in ${el.discoveryYear}` : ''}. Scientists can prove an element is new before they manage to collect a pure sample. They check measurements and repeat experiments before a discovery is accepted.`;
    }
    case 'state': {
      const explanations: Record<string, string> = {
        solid: 'Its particles stay close together and jiggle in fixed positions. Enough heat can loosen them so the solid melts. Melting changes its state, but does not turn it into a different element.',
        liquid: 'Its particles stay close but can slide past one another. This lets the liquid flow and take the shape of its container. Cooling or heating changes how freely those particles can move.',
        gas: 'Its particles move freely with lots of space between them. The gas spreads out to fill its container. Cooling it enough can bring the particles closer and form a liquid.',
      };
      return explanations[el.stateAtRoomTemp];
    }
    case 'radioactivity':
      return el.stableIsotopes > 0
        ? `${el.name} has some stable isotopes, but others may be radioactive. Isotopes are the same element with different numbers of neutrons. An unstable isotope slowly changes by giving out radiation.`
        : `Every known isotope of ${el.name.toLowerCase()} has an unstable nucleus. Joining it to other atoms does not stop its radioactive decay. During decay, the nucleus gives out particles or energy and becomes more stable.`;
    case 'isotopes':
      return `These isotopes all have ${el.atomicNumber} protons, but they have different numbers of neutrons. A stable isotope does not give off radiation. Its mass number is the total number of protons and neutrons in its nucleus.`;
    case 'compounds':
      return `${el.symbol} in ${answer} shows that the compound contains ${el.name.toLowerCase()}. A small number after a symbol tells you how many of those atoms are present. If there is no small number, the formula means one atom of that element.`;
    case 'fun-fact':
    case 'uses':
      return question.explanation;
    case 'obtained-from':
      return question.explanation;
    case 'which-is-bigger': {
      const data = comparisonData[el.atomicNumber];
      if (question.id.startsWith('wb-1')) return `Its density is ${data?.density} g/cm³. Density tells us how much matter is packed into the same amount of space. A denser piece feels heavier than an equal-sized piece of a less dense material.`;
      if (question.id.startsWith('wb-4')) return `About ${data?.abundanceCrust} parts per million of Earth’s crust is this element. Some places, such as ore deposits, can contain much more. Abundance affects how easy an element is to find and collect.`;
      if (question.id.startsWith('wb-5')) return `Its atomic mass is ${el.atomicMass}. Most of an atom’s mass is packed inside its tiny nucleus. The decimal value reflects the mixture of isotopes found in nature.`;
      return `Its melting point is about ${data?.meltingPoint}°C. Melting changes a solid into a liquid, but it stays the same element. Stronger attractions between particles usually take more heat to overcome.`;
    }
  }
}
