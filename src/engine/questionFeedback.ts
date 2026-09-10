import type { Element } from '../data/elements.ts';
import { comparisonData } from '../data/comparisonData.ts';
import type { Question } from './questionGenerator.ts';

// One explanation per concept. Never append a random element biography.
export function explainCategory(el: Element): string {
  const explanations: Record<string, string> = {
    'alkali-metal': 'Alkali metals have one outer electron that they readily lose in reactions. This produces ions with a charge of +1 and helps explain their similar chemistry.',
    'alkaline-earth-metal': 'These metals have two outer electrons and commonly form ions with a charge of +2. Their similar electron arrangements give them related chemical properties.',
    'transition-metal': 'Transition metals often form compounds with different ion charges. Electrons in their d orbitals help explain many of their colours and catalytic properties.',
    'post-transition-metal': 'These elements lie beyond the transition metals in the table. They retain metallic properties such as conducting electricity, but are often softer and melt more easily than many transition metals.',
    metalloid: 'Metalloids have a mixture of metallic and non-metallic properties. Some conduct electricity under controlled conditions, which is useful when building electronic devices.',
    nonmetal: 'Nonmetals have varied properties, but many form covalent bonds by sharing electrons. This lets them build molecules instead of the extended metallic structures found in metals.',
    halogen: 'Halogens have seven outer electrons. Gaining one more gives a filled outer shell, so they commonly form ions with a charge of −1 in salts.',
    'noble-gas': 'A filled outer electron shell makes ordinary bond formation less favourable. This explains why noble gases generally react much less readily than neighbouring elements.',
    lanthanide: 'The lanthanides form much of the upper detached row. Many form +3 ions with very similar chemistry, which makes separating them from one another difficult.',
    actinide: 'The actinides form the lower detached row, and all have radioactive isotopes only. Their unstable nuclei can decay even when the atoms are bound inside a compound.',
  };
  return explanations[el.category] ?? 'Elements are grouped by patterns in their electron arrangements and chemical behaviour.';
}

export function focusedExplanation(question: Question): string {
  const el = question.element;
  const answer = question.choices[question.correctIndex];
  switch (question.category) {
    case 'symbol-name': {
      const origins: Record<string, string> = { Fe: 'ferrum', Au: 'aurum', Ag: 'argentum', Pb: 'plumbum', Cu: 'cuprum', Sn: 'stannum', Sb: 'stibium', Na: 'natrium', K: 'kalium', W: 'wolfram', Hg: 'hydrargyrum' };
      const origin = origins[el.symbol];
      return origin
        ? `${el.symbol} comes from the older name ${origin}. Chemical symbols preserve some historical names, which is why they do not always match the modern English spelling.`
        : `${el.symbol} identifies ${el.name.toLowerCase()} in formulas wherever it appears. Capital letters matter: a symbol starts with a capital, and any second letter is lowercase, so Co and CO mean different things.`;
    }
    case 'atomic-number':
      return `Every ${el.name.toLowerCase()} nucleus contains ${el.atomicNumber} proton${el.atomicNumber === 1 ? '' : 's'}. Changing electrons makes an ion and changing neutrons makes an isotope; changing the proton count makes a different element.`;
    case 'group-classification':
      if (question.id.startsWith('gc-4')) return `Period ${el.period} is a horizontal row, not a chemical family. Moving across a row adds protons and changes the electron arrangement, so elements in that row can have very different properties.`;
      return explainCategory(el);
    case 'position':
      return question.id.startsWith('po-2')
        ? `Both elements are in period ${el.period}. A period is a horizontal row: electron arrangements change across it, so being in the same row does not mean two elements react alike.`
        : `A group is a vertical column and a period is a horizontal row. Their intersection identifies one position; ${el.name.toLowerCase()} occupies group ${el.group}, period ${el.period}.`;
    case 'discovery': {
      const stories: Record<number, string> = {
        2: 'A previously unexplained line in sunlight revealed helium before a sample was isolated on Earth. Spectroscopy separates light into wavelengths, letting scientists recognise the characteristic signals of different elements.',
        11: 'Humphry Davy used an electric current to separate sodium from sodium hydroxide. People had used sodium compounds for centuries, but isolating the reactive metal showed what those compounds contained.',
        15: 'Hennig Brand obtained phosphorus while investigating material left from urine. The unexpected glowing substance became a discovery even though his original goal was to find a way to make gold.',
        55: 'Bunsen and Kirchhoff detected unfamiliar spectral lines while examining mineral water. The light revealed a new element even before they could isolate a sample of caesium metal.',
      };
      if (stories[el.atomicNumber]) return stories[el.atomicNumber];
      return question.id.startsWith('di-2')
        ? `The recorded discovery year is ${el.discoveryYear}. Centuries count from year 1: for example, the nineteenth century runs from 1801 to 1900, not 1900 to 1999.`
        : `The discovery is credited to ${el.discoveredBy}${el.discoveryYear ? ` in ${el.discoveryYear}` : ''}. Identifying a new element means establishing that it is a distinct kind of atom, which may happen before anyone isolates a pure sample.`;
    }
    case 'state': {
      const explanations: Record<string, string> = {
        solid: 'Its particles remain close together and vibrate around fixed positions. Heating can eventually allow them to move past one another, but a change of state does not change which element they are.',
        liquid: 'Its particles stay close together but can move past one another. This allows the substance to flow and take the shape of its container while keeping a nearly fixed volume.',
        gas: 'Its particles move freely and are widely separated compared with those in a liquid or solid. The gas expands to fill its container; cooling or compression can change its state.',
      };
      return explanations[el.stateAtRoomTemp];
    }
    case 'radioactivity':
      return el.stableIsotopes > 0
        ? `${el.name} has stable isotopes, but that does not mean every isotope is stable. Changing the neutron count can make a radioactive nucleus while leaving the element’s identity unchanged.`
        : `Every known isotope of ${el.name.toLowerCase()} has an unstable nucleus. Radioactive decay is a nuclear change, so putting the element into a compound does not make its nuclei stable.`;
    case 'isotopes':
      return `These isotopes all have ${el.atomicNumber} protons but different neutron counts. Stable means no radioactive decay has been observed; it does not describe how readily the element reacts chemically.`;
    case 'compounds':
      return `The symbol ${el.symbol} in ${answer} identifies ${el.name.toLowerCase()}. A small number after a symbol counts atoms in the formula; without one, the count is one. The compound can behave very differently from the pure element.`;
    case 'fun-fact':
    case 'uses':
      return question.explanation;
    case 'obtained-from':
      return question.explanation;
    case 'which-is-bigger': {
      const data = comparisonData[el.atomicNumber];
      if (question.id.startsWith('wb-1')) return `A density of ${data?.density} g/cm³ means one cubic centimetre has that mass. Compare equal volumes: a larger object is not necessarily made from a denser material.`;
      if (question.id.startsWith('wb-4')) return `Its estimated crustal abundance is ${data?.abundanceCrust} parts per million by mass. This describes an average across the crust; a local ore deposit may contain much more.`;
      if (question.id.startsWith('wb-5')) return `The listed atomic mass is ${el.atomicMass}. Most of an atom’s mass comes from its nucleus; atomic mass compares atoms, while density also depends on how closely they are packed in a material.`;
      return `Its listed melting point is about ${data?.meltingPoint}°C. Melting allows particles to move out of their fixed solid arrangement; it does not turn the element into a different substance.`;
    }
  }
}
