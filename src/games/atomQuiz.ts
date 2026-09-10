import { addExtraFacts } from '../engine/extraFacts.ts';

export type AtomQuestion = {
  topic?: string;
  questionText: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  extraFact?: string;
  /** Optional illustration hint (emoji string shown above the question) */
  illustration?: string;
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───── Question bank: general atomic structure knowledge ───── */

type QFactory = () => AtomQuestion;

const GENERAL_QUESTIONS: QFactory[] = [
  // ── Parts of an atom ──
  () => {
    const choices = shuffleArray(['Protons, Neutrons, Electrons', 'Protons, Neutrons, Photons', 'Atoms, Molecules, Ions', 'Quarks, Leptons, Bosons']);
    return { questionText: 'Which three types of particle are found in most atoms?', choices, correctIndex: choices.indexOf('Protons, Neutrons, Electrons'), explanation: "An atom has a tiny nucleus surrounded by electrons. Protons and neutrons account for almost all its mass; the electrons occupy most of its volume.", illustration: '⚛️' };
  },
  () => {
    const correct = 'The nucleus';
    const choices = shuffleArray([correct, 'The electron cloud', 'The outer shell', 'Floating freely']);
    return { questionText: 'Where are protons found inside an atom?', choices, correctIndex: choices.indexOf(correct), explanation: "Nearly all an atom’s mass is concentrated in its nucleus. The protons there give the nucleus a positive charge, which attracts the surrounding electrons.", illustration: '🔴' };
  },
  () => {
    const correct = 'The nucleus';
    const choices = shuffleArray([correct, 'The outer shell', 'Between atoms', 'The electron cloud']);
    return { questionText: 'Where are neutrons found inside an atom?', choices, correctIndex: choices.indexOf(correct), explanation: "Neutrons add mass without adding electric charge. Inside a nucleus, their strong-force interactions help bind the particles together without increasing the repulsion between protons.", illustration: '⚪' };
  },
  () => {
    const correct = 'In an electron cloud around the nucleus';
    const choices = shuffleArray([correct, 'They sit inside the nucleus', 'They float randomly', 'They stay still']);
    return { questionText: 'Where are electrons found in an atom?', choices, correctIndex: choices.indexOf(correct), explanation: "An electron cloud describes where electrons are likely to be found. Shell diagrams show their energy levels, but electrons do not follow neat circular tracks like planets.", illustration: '🔵' };
  },

  // ── Charges ──
  () => {
    const correct = 'Positive (+)';
    const choices = shuffleArray([correct, 'Negative (−)', 'No charge (neutral)', 'It changes']);
    return { questionText: 'What electrical charge does a proton have?', choices, correctIndex: choices.indexOf(correct), explanation: "One proton has a charge equal in size and opposite in sign to an electron’s charge. Equal numbers of the two therefore give an atom no overall charge.", illustration: '➕' };
  },
  () => {
    const correct = 'Negative (−)';
    const choices = shuffleArray([correct, 'Positive (+)', 'No charge (neutral)', 'It changes']);
    return { questionText: 'What electrical charge does an electron have?', choices, correctIndex: choices.indexOf(correct), explanation: "An electron’s negative charge is attracted to the positive nucleus. Moving electrons between objects changes their overall charge, which is how static electricity builds up.", illustration: '➖' };
  },
  () => {
    const correct = 'No charge (neutral)';
    const choices = shuffleArray([correct, 'Positive (+)', 'Negative (−)', 'Both + and −']);
    return { questionText: 'What electrical charge does a neutron have?', choices, correctIndex: choices.indexOf(correct), explanation: "A neutron adds to an atom’s mass but does not change its total electric charge. Adding a neutron makes a different isotope, not a different element.", illustration: '⚪' };
  },
  () => {
    const correct = 'Protons and neutrons';
    const choices = shuffleArray([correct, 'Protons and electrons', 'Neutrons and electrons', 'Only protons']);
    return { questionText: 'What does the nucleus of most atoms contain?', choices, correctIndex: choices.indexOf(correct), explanation: "Protons and neutrons are bound together in a very small region by the strong nuclear interaction. Hydrogen-1 is the exception: its nucleus is a single proton with no neutron.", illustration: '🫧' };
  },

  // ── Empty space / size ──
  () => {
    const correct = 'Its electron cloud extends far beyond the nucleus';
    const choices = shuffleArray([correct, 'Mostly solid matter', 'Mostly liquid', 'Mostly nucleus']);
    return { questionText: 'Why is an atom much larger than its nucleus?', choices, correctIndex: choices.indexOf(correct), explanation: "The nucleus takes up only a tiny fraction of an atom’s volume. The surrounding electron cloud spreads over a much larger region, so an atom is not a solid little ball.", illustration: '🏟️' };
  },
  () => {
    const correct = 'The electron';
    const choices = shuffleArray([correct, 'The proton', 'The neutron', 'They all weigh the same']);
    return { questionText: 'Which particle in an atom has the smallest mass?', choices, correctIndex: choices.indexOf(correct), explanation: "An electron has about one eighteen-hundredth of a proton’s mass. This is why counting protons and neutrons gives a useful rough picture of an atom’s mass.", illustration: '🪶' };
  },
  () => {
    const correct = 'About the same mass';
    const choices = shuffleArray([correct, 'Protons are much heavier', 'Neutrons are much heavier', 'Electrons are the heaviest']);
    return { questionText: 'How do the masses of a proton and a neutron compare?', choices, correctIndex: choices.indexOf(correct), explanation: "A neutron is slightly heavier than a proton, but both are close to one atomic mass unit. Replacing one with the other changes charge much more dramatically than it changes mass.", illustration: '⚖️' };
  },

  // ── Electron shells ──
  () => {
    const correct = '2';
    const choices = shuffleArray([correct, '8', '18', '1']);
    return { questionText: 'What is the maximum number of electrons in the first shell?', choices, correctIndex: choices.indexOf(correct), explanation: "The first shell contains one orbital, and each orbital can hold two electrons. Helium fills this shell, helping explain why it reacts so little.", illustration: '1️⃣' };
  },
  () => {
    const correct = '8';
    const choices = shuffleArray([correct, '2', '18', '32']);
    return { questionText: 'What is the maximum number of electrons in the second shell?', choices, correctIndex: choices.indexOf(correct), explanation: "The second shell has four orbitals: one s orbital and three p orbitals. With room for two electrons in each, their total capacity is eight.", illustration: '2️⃣' };
  },
  () => {
    const correct = '18';
    const choices = shuffleArray([correct, '8', '2', '32']);
    return { questionText: 'What is the maximum number of electrons in the third shell?', choices, correctIndex: choices.indexOf(correct), explanation: "The third shell contains nine orbitals with room for two electrons each. Capacity is different from filling order: the fourth shell starts filling before the third reaches eighteen in the usual ground-state sequence.", illustration: '3️⃣' };
  },
  () => {
    const correct = 'Valence electrons';
    const choices = shuffleArray([correct, 'Core electrons', 'Free electrons', 'Nuclear electrons']);
    return { questionText: 'What are the electrons in the outermost shell of an atom called?', choices, correctIndex: choices.indexOf(correct), explanation: "These electrons are the most exposed to nearby atoms. Their arrangement helps determine which bonds an atom can form.", illustration: '💫' };
  },
  () => {
    const correct = 'They help decide how an atom bonds with others';
    const choices = shuffleArray([correct, 'They make the atom heavier', 'They create gravity', 'They heat the atom up']);
    return { questionText: 'Why are valence electrons important?', choices, correctIndex: choices.indexOf(correct), explanation: "Atoms can reach a lower-energy arrangement by sharing or transferring outer electrons. A chemical bond holds the resulting atoms or ions together through electrical attraction.", illustration: '🤝' };
  },

  // ── Orbitals ──
  () => {
    const correct = 's, p, d, f';
    const choices = shuffleArray([correct, 'a, b, c, d', '1, 2, 3, 4', 'x, y, z, w']);
    return { questionText: 'Which letters label the four orbital types used in basic electron configurations?', choices, correctIndex: choices.indexOf(correct), explanation: "The letters label families of orbitals with different shapes. An orbital is a probability pattern for an electron, not a physical container or a circular path.", illustration: '🔮' };
  },
  () => {
    const correct = 'A sphere (ball shape)';
    const choices = shuffleArray([correct, 'A dumbbell shape', 'A ring shape', 'A cube shape']);
    return { questionText: 'What shape is an s orbital?', choices, correctIndex: choices.indexOf(correct), explanation: "For an s orbital, the probability pattern is the same in every direction around the nucleus. Its spherical appearance does not mean the electron moves along the surface of a ball.", illustration: '🟢' };
  },

  // ── Ions & isotopes ──
  () => {
    const correct = 'An atom that has gained or lost electrons';
    const choices = shuffleArray([correct, 'A type of element', 'An atom with no neutrons', 'A broken atom']);
    return { questionText: 'What is a monatomic ion?', choices, correctIndex: choices.indexOf(correct), explanation: "An ion has unequal amounts of positive and negative charge. For example, a sodium atom that loses one electron has one more proton than electrons, giving it a charge of +1.", illustration: '⚡' };
  },
  () => {
    const correct = 'Atoms of the same element with different numbers of neutrons';
    const choices = shuffleArray([correct, 'Atoms with different numbers of protons', 'Atoms with no electrons', 'A different name for molecules']);
    return { questionText: 'What makes two atoms isotopes of the same element?', choices, correctIndex: choices.indexOf(correct), explanation: "Carbon-12 has six neutrons and carbon-14 has eight. Both still have six protons, so both are carbon even though their masses and nuclear stability differ.", illustration: '🔄' };
  },
  () => {
    const correct = 'It becomes a negative ion (anion)';
    const choices = shuffleArray([correct, 'It becomes a positive ion', 'Nothing happens', 'It explodes']);
    return { questionText: 'What happens when a neutral atom gains one electron?', choices, correctIndex: choices.indexOf(correct), explanation: "Adding one electron to a neutral atom adds negative charge while the proton count stays fixed. Its total charge becomes −1; the element itself does not change.", illustration: '➖' };
  },
  () => {
    const correct = 'It becomes a positive ion (cation)';
    const choices = shuffleArray([correct, 'It becomes a negative ion', 'It becomes a neutron', 'It disappears']);
    return { questionText: 'What happens when a neutral atom loses one electron?', choices, correctIndex: choices.indexOf(correct), explanation: "Removing one electron from a neutral atom leaves one positive charge without a matching negative charge. Its total charge becomes +1, with the same nucleus as before.", illustration: '➕' };
  },

  // ── Forces ──
  () => {
    const correct = 'The strong nuclear force';
    const choices = shuffleArray([correct, 'Gravity', 'Magnetism', 'Friction']);
    return { questionText: 'What force holds the nucleus together?', choices, correctIndex: choices.indexOf(correct), explanation: "Positive protons repel one another electrically. At the very short distances inside a nucleus, the strong nuclear interaction can overcome that repulsion and bind nucleons together.", illustration: '💪' };
  },
  () => {
    const correct = 'Electromagnetic force (attraction between + and −)';
    const choices = shuffleArray([correct, 'Gravity', 'The strong nuclear force', 'Wind']);
    return { questionText: 'Which force attracts electrons to the nucleus?', choices, correctIndex: choices.indexOf(correct), explanation: "Opposite electric charges attract, binding electrons to the nucleus. Quantum energy levels describe the allowed states; an electron is not a planet travelling around a miniature sun.", illustration: '🧲' };
  },

  // ── Atomic number / mass ──
  () => {
    const correct = 'The number of protons';
    const choices = shuffleArray([correct, 'The number of electrons', 'The total number of particles', 'The weight of the atom']);
    return { questionText: 'What does the atomic number of an element tell us?', choices, correctIndex: choices.indexOf(correct), explanation: "The proton count identifies the element even if the atom gains electrons or has extra neutrons. Six protons means carbon in every isotope and every ion.", illustration: '🔢' };
  },
  () => {
    const correct = 'The number of protons';
    const choices = shuffleArray([correct, 'The number of electrons', 'The number of neutrons', 'The temperature']);
    return { questionText: 'What makes one element different from another?', choices, correctIndex: choices.indexOf(correct), explanation: "Changing electron count produces an ion, and changing neutron count produces an isotope. Only a change in proton count changes which element the atom is.", illustration: '🧬' };
  },
  () => {
    const correct = 'Protons + Neutrons';
    const choices = shuffleArray([correct, 'Only Protons', 'Protons + Electrons', 'Only Neutrons']);
    return { questionText: 'Which particles are counted to find an isotope’s mass number?', choices, correctIndex: choices.indexOf(correct), explanation: "Mass number counts the protons and neutrons in one nucleus, so it is a whole number. The decimal atomic weight on a periodic table usually averages the masses of naturally occurring isotopes.", illustration: '⚖️' };
  },

  // ── Quarks & subatomic ──
  () => {
    const correct = 'Quarks';
    const choices = shuffleArray([correct, 'Leptons', 'Gluons', 'Photons', 'Bosons']);
    return { questionText: 'Protons and neutrons are themselves made of even tinier particles — what are they called?', choices, correctIndex: choices.indexOf(correct), explanation: "Protons and neutrons have internal structure, unlike electrons, which are treated as elementary particles. Their quarks interact through the strong force.", illustration: '🔬' };
  },
  () => {
    const correct = '2 up quarks and 1 down quark';
    const choices = shuffleArray([correct, '1 up quark and 2 down quarks', '3 up quarks', '3 down quarks']);
    return { questionText: 'Which three valence quarks make up a proton?', choices, correctIndex: choices.indexOf(correct), explanation: "Each up quark contributes +⅔ of a proton’s charge and each down quark contributes −⅓. Adding +⅔ +⅔ −⅓ gives the proton’s total charge of +1.", illustration: '🔴' };
  },
  () => {
    const correct = '1 up quark and 2 down quarks';
    const choices = shuffleArray([correct, '2 up quarks and 1 down quark', '3 down quarks', '3 up quarks']);
    return { questionText: 'Which three valence quarks make up a neutron?', choices, correctIndex: choices.indexOf(correct), explanation: "An up quark contributes +⅔ and each down quark contributes −⅓ of a proton’s charge. The sum +⅔ −⅓ −⅓ is zero, explaining the neutron’s neutral charge.", illustration: '⚪' };
  },
  () => {
    const correct = 'Gluons';
    const choices = shuffleArray([correct, 'Photons', 'Quarks', 'Electrons', 'Leptons']);
    return { questionText: 'Which particles carry the strong interaction between quarks?', choices, correctIndex: choices.indexOf(correct), explanation: "Gluons carry the strong interaction between quarks. The name suggests glue, but they are particles involved in a force, not a sticky substance.", illustration: '🫧' };
  },

  // ── Radioactivity & decay ──
  () => {
    const correct = 'Alpha, Beta, and Gamma';
    const choices = shuffleArray([correct, 'X-ray, UV, and Infrared', 'Proton, Neutron, and Electron', 'Sound, Light, and Heat', 'Cosmic, Solar, and Ground']);
    return { questionText: 'What are the three main types of nuclear radiation?', choices, correctIndex: choices.indexOf(correct), explanation: "Alpha and beta radiation consist of particles emitted during nuclear decay. Gamma radiation consists of photons, so it carries energy without carrying electric charge.", illustration: '☢️' };
  },
  () => {
    const correct = 'A helium nucleus (2 protons + 2 neutrons)';
    const choices = shuffleArray([correct, 'A fast-moving electron', 'A high-energy photon', 'A single proton', 'A single neutron']);
    return { questionText: 'What is an alpha particle made of?', choices, correctIndex: choices.indexOf(correct), explanation: "An alpha particle has a charge of +2 because it contains two protons and no electrons. Alpha decay lowers the parent nucleus’s atomic number by two and its mass number by four.", illustration: '🟡' };
  },
  () => {
    const correct = 'A fast-moving electron (or positron)';
    const choices = shuffleArray([correct, 'A helium nucleus', 'A burst of light energy', 'Two neutrons', 'A single proton']);
    return { questionText: 'What is a beta particle?', choices, correctIndex: choices.indexOf(correct), explanation: "In beta-minus decay, a neutron changes into a proton and an electron is emitted along with an antineutrino. That electron is created in the decay; it is not an orbital electron escaping.", illustration: '⚡' };
  },
  () => {
    const correct = 'High-energy electromagnetic radiation';
    const choices = shuffleArray([correct, 'A helium nucleus', 'A fast electron', 'A proton beam', 'A neutron beam']);
    return { questionText: 'What is gamma radiation?', choices, correctIndex: choices.indexOf(correct), explanation: "A nucleus with excess energy can release it as a gamma photon. This changes its energy without changing its proton or neutron count.", illustration: '💜' };
  },
  () => {
    const correct = 'The time it takes for half of the radioactive atoms in a sample to decay';
    const choices = shuffleArray([correct, 'How long an atom lives before it explodes', 'How fast radiation travels', 'The age of a radioactive element', 'How long a reactor takes to start up']);
    return { questionText: 'What is "half-life" in nuclear physics?', choices, correctIndex: choices.indexOf(correct), explanation: "After one half-life, about half the original radioactive nuclei remain; after two, about a quarter remain. This predicts the behaviour of a large sample, not the exact decay time of a single atom.", illustration: '⏳' };
  },
  () => {
    const correct = 'About 5,730 years';
    const choices = shuffleArray([correct, 'About 100 years', 'About 1 million years', 'About 50 years', 'About 14 days']);
    return { questionText: 'What is the half-life of Carbon-14, used for dating ancient objects?', choices, correctIndex: choices.indexOf(correct), explanation: "Once an organism dies, it stops exchanging carbon with its surroundings. Its carbon-14 then decays, so the amount remaining can help estimate how long ago it died.", illustration: '🦴' };
  },
  () => {
    const correct = 'Alpha radiation';
    const choices = shuffleArray([correct, 'Beta radiation', 'Gamma radiation', 'All three equally']);
    return { questionText: 'Which type of radiation can be stopped by a sheet of paper?', choices, correctIndex: choices.indexOf(correct), explanation: "Alpha particles interact strongly with matter because of their charge, losing energy over a short distance. Paper can stop an external alpha source, but alpha emitters inside the body can damage nearby tissue.", illustration: '📄' };
  },
  () => {
    const correct = 'Gamma radiation';
    const choices = shuffleArray([correct, 'Alpha radiation', 'Beta radiation', 'Sound waves', 'Ultraviolet light']);
    return { questionText: 'Which of these types of nuclear radiation generally needs the thickest shielding?', choices, correctIndex: choices.indexOf(correct), explanation: "Gamma photons can pass through material without interacting. Thicker shielding increases the chance of absorbing or scattering them, reducing the intensity rather than guaranteeing that every photon is stopped.", illustration: '🧱' };
  },
  () => {
    const correct = 'It becomes a different element';
    const choices = shuffleArray([correct, 'It becomes a gas', 'It gains more neutrons', 'It gets bigger', 'Nothing changes']);
    return { questionText: 'When a radioactive nucleus emits an alpha or beta particle, what happens to the element?', choices, correctIndex: choices.indexOf(correct), explanation: "Alpha decay removes two protons. Beta-minus decay turns a neutron into a proton, while beta-plus decay turns a proton into a neutron; each changes the atomic number.", illustration: '🔄' };
  },

  // ── Fission & fusion ──
  () => {
    const correct = 'Nuclear fission';
    const choices = shuffleArray([correct, 'Nuclear fusion', 'Beta decay', 'Gamma emission', 'Alpha decay']);
    return { questionText: 'What is the process of splitting a large atomic nucleus into smaller ones called?', choices, correctIndex: choices.indexOf(correct), explanation: "Splitting a suitable heavy nucleus can release energy and more neutrons. Those neutrons can trigger further fissions, producing a chain reaction.", illustration: '💥' };
  },
  () => {
    const correct = 'Nuclear fusion';
    const choices = shuffleArray([correct, 'Nuclear fission', 'Beta decay', 'Nuclear combustion', 'Gamma emission']);
    return { questionText: 'What is the process of joining two small nuclei together to make a bigger one?', choices, correctIndex: choices.indexOf(correct), explanation: "Light nuclei must get very close together to fuse despite their electrical repulsion. The Sun’s hot, dense core makes hydrogen fusion possible, releasing energy as helium forms.", illustration: '☀️' };
  },
  () => {
    const correct = 'In the cores of stars (nuclear fusion)';
    const choices = shuffleArray([correct, 'By chemical reactions on Earth', 'In the upper atmosphere', 'By scientists in labs', 'Deep underground']);
    return { questionText: 'Where were much of the universe’s carbon and oxygen made?', choices, correctIndex: choices.indexOf(correct), explanation: "Fusion inside stars builds elements such as carbon and oxygen. Making much heavier elements, including gold, also involves processes such as neutron capture in stellar events.", illustration: '🌟' };
  },

  // ── Antimatter ──
  () => {
    const correct = 'The same mass but positive charge';
    const choices = shuffleArray([correct, 'A particle that moves backwards in time', 'An extremely heavy particle', 'A particle made of dark matter', 'A particle with no charge at all']);
    return { questionText: 'How does a positron compare with an electron?', choices, correctIndex: choices.indexOf(correct), explanation: "A positron has the electron’s mass but positive electric charge. When an electron and positron annihilate, their energy can emerge as photons.", illustration: '💫' };
  },

  // ── Periodic table structure ──
  () => {
    const correct = 'The number of electron shells';
    const choices = shuffleArray([correct, 'The number of protons', 'The atomic mass', 'The number of neutrons', 'The number of valence electrons']);
    return { questionText: 'In the simple shell model, what does the period (row) number indicate?', choices, correctIndex: choices.indexOf(correct), explanation: "In the simple shell model, sodium begins period three with an electron in its third shell. Moving across that period changes the outer electron arrangement before the next row begins.", illustration: '📊' };
  },
  () => {
    const correct = 'They have similar outer electron arrangements';
    const choices = shuffleArray([correct, 'The number of protons', 'The number of neutrons', 'The total number of electrons', 'The atomic mass']);
    return { questionText: 'Why do elements in a main-group column often react in similar ways?', choices, correctIndex: choices.indexOf(correct), explanation: "Main-group elements in a column usually have similar outer electron arrangements, so their reactions often resemble one another. Group numbers 13–18 are not literal counts of outer electrons, and helium has two.", illustration: '🗂️' };
  },

  // ── Fun facts ──
  () => {
    const correct = 'True';
    const choices = ['True', 'False'];
    return { questionText: 'True or False: Every atom of gold has exactly 79 protons.', choices, correctIndex: choices.indexOf(correct), explanation: "Gold’s identity depends on its proton count. Gaining an electron makes a gold ion, and changing its neutrons makes another isotope, but neither turns it into another element.", illustration: '✨' };
  },
  () => {
    const correct = 'False';
    const choices = ['True', 'False'];
    return { questionText: 'True or False: You can see individual atoms with a magnifying glass.', choices, correctIndex: choices.indexOf(correct), explanation: "Visible light cannot resolve individual atoms with an ordinary magnifying glass. Special instruments, such as scanning tunnelling microscopes, build images using interactions at atomic scales.", illustration: '🔍' };
  },
  () => {
    const correct = 'False';
    const choices = ['True', 'False'];
    return { questionText: 'True or false: Chemical reactions destroy atomic nuclei.', choices, correctIndex: choices.indexOf(correct), explanation: "In a chemical reaction, atoms are rearranged into new substances while their nuclei remain intact. Nuclear reactions can change nuclei, but that is a different process.", illustration: '💥' };
  },
  () => {
    const correct = 'True';
    const choices = ['True', 'False'];
    return { questionText: 'True or false: Much of the carbon in your body was made in stars.', choices, correctIndex: choices.indexOf(correct), explanation: "Stars made much of the carbon and oxygen that later became part of living things. Most hydrogen formed much earlier, in the early universe, so not every kind of atom has the same origin.", illustration: '⭐' };
  },
  () => {
    const correct = 'About 7 billion billion billion (7×10²⁷)';
    const choices = shuffleArray([correct, 'About 7 million', 'About 7 billion', 'About 7 thousand']);
    return { questionText: 'Roughly how many atoms are in a 70 kg adult?', choices, correctIndex: choices.indexOf(correct), explanation: "The estimate depends on body mass and composition. Water alone contains three atoms per molecule, so even a small amount contains an enormous number of atoms.", illustration: '🧍' };
  },
  () => {
    const correct = 'Share electrons';
    const choices = shuffleArray([correct, 'Share or swap protons', 'Share or swap neutrons', 'Merge their nuclei']);
    return { questionText: 'When atoms bond together to make molecules, what do they do?', choices, correctIndex: choices.indexOf(correct), explanation: "In a molecule, shared electrons are attracted to more than one nucleus, holding the atoms together. Electron transfer instead forms ions, which can build ionic solids such as salt.", illustration: '🔗' };
  },
  () => {
    const correct = 'A group of atoms bonded together';
    const choices = shuffleArray([correct, 'A single proton', 'A type of element', 'An atom with extra neutrons']);
    return { questionText: 'What is a molecule?', choices, correctIndex: choices.indexOf(correct), explanation: "A water molecule is a distinct group containing two hydrogen atoms and one oxygen atom. Changing that ratio changes the substance rather than making a larger water molecule.", illustration: '💧' };
  },
  () => {
    const correct = 'Hydrogen';
    const choices = shuffleArray([correct, 'Oxygen', 'Carbon', 'Iron']);
    return { questionText: 'What is the simplest atom, with just 1 proton and 1 electron?', choices, correctIndex: choices.indexOf(correct), explanation: "Hydrogen-1 has a single proton and no neutron in its nucleus. Its neutral atom has one electron; heavier hydrogen isotopes keep the same proton count but add neutrons.", illustration: '1️⃣' };
  },
  () => {
    const correct = 'Nucleons';
    const choices = shuffleArray([correct, 'Electrons', 'Ionons', 'Atomons']);
    return { questionText: 'What is the collective name for protons and neutrons?', choices, correctIndex: choices.indexOf(correct), explanation: "Mass number counts nucleons in a nucleus. For example, a carbon-12 nucleus contains twelve nucleons: six protons and six neutrons.", illustration: '🫂' };
  },
  () => {
    const correct = 'Neutral (no overall charge)';
    const choices = shuffleArray([correct, 'Positive', 'Negative', 'It depends on the element']);
    return { questionText: 'What is the overall charge of an atom with equal numbers of protons and electrons?', choices, correctIndex: choices.indexOf(correct), explanation: "Each proton’s positive charge balances one electron’s negative charge. Neutrons do not affect this balance because they have no net electric charge.", illustration: '⚖️' };
  },
  () => {
    const correct = 'Absorb energy';
    const choices = shuffleArray([correct, 'Energy levels get lower', 'Energy stays the same', 'Electrons slow down']);
    return { questionText: 'What must an electron do to move from its ground state into a higher allowed energy level?', choices, correctIndex: choices.indexOf(correct), explanation: "An atom can absorb a photon whose energy matches the gap between two allowed levels. When the electron returns to a lower level, that energy can be released as another photon.", illustration: '📈' };
  },
  () => {
    const correct = 'The tiny, dense centre of the atom';
    const choices = shuffleArray([correct, 'The outer electron shell', 'The space between molecules', 'A cloud of electrons']);
    return { questionText: 'How does the nucleus compare with the whole atom?', choices, correctIndex: choices.indexOf(correct), explanation: "If the whole atom were stadium-sized, its nucleus would be a tiny object near the centre. The analogy shows how concentrated the mass is, not a literal empty stadium with orbiting balls." };
  },
  () => {
    const correct = 'Protons';
    const choices = shuffleArray([correct, 'Neutrons', 'Electrons', 'Shells']);
    return { questionText: 'What particle count decides whether an atom is hydrogen, carbon, gold, or another element?', choices, correctIndex: choices.indexOf(correct), explanation: "An element keeps its identity through ordinary chemical reactions because its proton count stays fixed. Changing the nucleus’s proton count requires a nuclear process." };
  },
  () => {
    const correct = 'Electrons';
    const choices = shuffleArray([correct, 'Protons', 'Neutrons', 'The whole nucleus']);
    return { questionText: 'In normal chemical reactions, which particles are shared, gained, or lost?', choices, correctIndex: choices.indexOf(correct), explanation: "Chemical reactions change how electrons are arranged between atoms. The nuclei remain the same, which is why each element’s atoms are conserved when balancing a chemical equation." };
  },
  () => {
    const correct = 'Positive and negative charges attract';
    const choices = shuffleArray([correct, 'Gravity pulls them strongly', 'Neutrons pull them in', 'Electrons are glued to protons']);
    return { questionText: 'Why can an electron remain bound to an atom?', choices, correctIndex: choices.indexOf(correct), explanation: "The electrical attraction binds electrons to the atom. Electrons occupy allowed quantum states rather than spiralling into the nucleus." };
  },
  () => {
    const correct = 'The electrons';
    const choices = shuffleArray([correct, 'The protons', 'The neutrons', 'The nucleus']);
    return { questionText: 'When you rub a balloon on hair and it sticks to a wall, which atomic particles have moved around?', choices, correctIndex: choices.indexOf(correct), explanation: "Rubbing can transfer electrons between hair and a balloon. A charged balloon can shift charge slightly in the wall, creating an attraction even if the wall has no overall charge." };
  },
  () => {
    const correct = 'Neutrons';
    const choices = shuffleArray([correct, 'Protons', 'Electrons', 'Valence shells']);
    return { questionText: 'Which particles can change between isotopes of the same element?', choices, correctIndex: choices.indexOf(correct), explanation: "Changing neutron count changes the nucleus’s mass and can change its stability. The proton count stays fixed, so isotopes remain the same element." };
  },
  () => {
    const correct = 'It has a full outer electron shell';
    const choices = shuffleArray([correct, 'It has no protons', 'It is always radioactive', 'It has no neutrons']);
    return { questionText: 'Why is a noble gas atom usually so unreactive?', choices, correctIndex: choices.indexOf(correct), explanation: "A filled outer shell is a particularly stable electron arrangement. Removing an electron takes substantial energy, making ordinary bond formation less favourable." };
  },
  () => {
    const correct = 'Electron shells';
    const choices = shuffleArray([correct, 'Neutron rings', 'Proton paths', 'Gravity layers']);
    return { questionText: 'What are the layers around an atom where electrons are found called?', choices, correctIndex: choices.indexOf(correct), explanation: "Shells group electrons by energy level. They are a useful diagramming tool, but the real electron cloud is described by probability patterns called orbitals." };
  },
  () => {
    const correct = 'It has lost electrons';
    const choices = shuffleArray([correct, 'It has gained protons', 'It has lost neutrons', 'It has become radioactive']);
    return { questionText: 'If an atom becomes a positive ion, what has usually happened?', choices, correctIndex: choices.indexOf(correct), explanation: "The nucleus retains its positive charge when electrons leave. With fewer negative electrons to balance it, the atom has a positive net charge." };
  },
  () => {
    const correct = 'It has gained electrons';
    const choices = shuffleArray([correct, 'It has gained protons', 'It has lost neutrons', 'It has split its nucleus']);
    return { questionText: 'If an atom becomes a negative ion, what has usually happened?', choices, correctIndex: choices.indexOf(correct), explanation: "The proton count stays fixed while additional electrons bring more negative charge. The result is a negative ion of the same element." };
  },
  () => {
    const correct = 'Because atoms are mostly empty space';
    const choices = shuffleArray([correct, 'Because atoms are flat', 'Because electrons are bigger than nuclei', 'Because protons disappear']);
    return { questionText: 'What did most alpha particles passing through thin gold foil suggest about atoms?', choices, correctIndex: choices.indexOf(correct), explanation: "Most alpha particles in Rutherford’s foil experiment passed through, while a few were strongly deflected. This supported a tiny, concentrated positive nucleus rather than positive charge spread throughout the atom." };
  },
  () => {
    const correct = 'The nucleus has changed';
    const choices = shuffleArray([correct, 'Only the outer electrons changed', 'The atom changed colour', 'The atom became a molecule']);
    return { questionText: 'What is the big difference between a nuclear reaction and a chemical reaction?', choices, correctIndex: choices.indexOf(correct), explanation: "A nuclear reaction changes the nucleus’s composition or energy. A chemical reaction changes the arrangement of electrons and bonds while retaining the same nuclei." };
  },
];

// Factories in the same group test one concept and must not appear together.
const QUESTION_TOPICS = [
  "atom-parts",
  "nucleus-location",
  "neutron-role",
  "electron-location",
  "proton-charge",
  "electron-charge",
  "neutron-charge",
  "atom-parts",
  "atomic-scale",
  "electron-mass",
  "nucleon-mass",
  "first-shell",
  "second-shell",
  "third-shell",
  "valence",
  "valence",
  "orbital-types",
  "s-orbital",
  "ions",
  "isotopes",
  "negative-ion",
  "positive-ion",
  "strong-force",
  "electric-attraction",
  "element-identity",
  "element-identity",
  "mass-number",
  "quarks",
  "proton-quarks",
  "neutron-quarks",
  "gluons",
  "radiation-types",
  "alpha",
  "beta",
  "gamma",
  "half-life",
  "carbon-dating",
  "alpha-shielding",
  "gamma-shielding",
  "transmutation",
  "fission",
  "fusion",
  "stellar-elements",
  "antimatter",
  "periods",
  "groups",
  "element-identity",
  "imaging",
  "nuclear-chemical",
  "stellar-elements",
  "body-atoms",
  "bonding",
  "molecules",
  "hydrogen",
  "nucleons",
  "neutral-charge",
  "excitation",
  "atomic-scale",
  "element-identity",
  "bonding",
  "electric-attraction",
  "static",
  "isotopes",
  "noble-gases",
  "electron-location",
  "positive-ion",
  "negative-ion",
  "atomic-scale",
  "nuclear-chemical"
];

// Applied questions add calculations and reasoning alongside definitions.
const APPLIED_QUESTIONS: Array<{ topic: string; questionText: string; answer: string; distractors: string[]; explanation: string }> = [
  {
    "topic": "neutron-calculation",
    "questionText": "A carbon-14 nucleus has six protons. How many neutrons does it contain?",
    "answer": "8",
    "distractors": [
      "6",
      "14",
      "20"
    ],
    "explanation": "The mass number counts all protons and neutrons. Subtract the six protons from fourteen to find eight neutrons; the electrons are not included in this count."
  },
  {
    "topic": "ion-calculation",
    "questionText": "An ion has 12 protons and 10 electrons. What is its charge?",
    "answer": "+2",
    "distractors": [
      "−2",
      "0",
      "+12"
    ],
    "explanation": "The ten electrons balance ten of the positive proton charges. Two positive charges remain unbalanced, so the ion has an overall charge of +2."
  },
  {
    "topic": "isotope-notation",
    "questionText": "In the name oxygen-18, what does the number 18 represent?",
    "answer": "Protons plus neutrons",
    "distractors": [
      "Only protons",
      "Only electrons",
      "Its position in the periodic table"
    ],
    "explanation": "The number after an isotope’s name is its mass number. Oxygen always has eight protons, so oxygen-18 has ten neutrons in its nucleus."
  },
  {
    "topic": "average-mass",
    "questionText": "Why are many atomic weights on a periodic table decimal numbers?",
    "answer": "They average the masses of naturally occurring isotopes",
    "distractors": [
      "Atoms have fractions of a proton",
      "Electron counts are always decimals",
      "They are rounded atomic numbers"
    ],
    "explanation": "A natural sample can contain several isotopes in different proportions. The listed atomic weight takes those proportions into account, rather than counting the particles in one particular nucleus."
  },
  {
    "topic": "formula-reading",
    "questionText": "How many atoms are in one carbon dioxide molecule, CO₂?",
    "answer": "3",
    "distractors": [
      "2",
      "4",
      "1"
    ],
    "explanation": "The C has no small number after it, so it represents one carbon atom. The ₂ applies to oxygen and represents two oxygen atoms, giving three atoms altogether."
  },
  {
    "topic": "molecule-counting",
    "questionText": "How many hydrogen atoms are in three water molecules?",
    "answer": "6",
    "distractors": [
      "3",
      "2",
      "9"
    ],
    "explanation": "Each water molecule contains two hydrogen atoms. Multiplying two by three gives six hydrogen atoms; the same three molecules also contain three oxygen atoms."
  },
  {
    "topic": "element-molecule",
    "questionText": "Oxygen gas contains O₂ molecules. Is it an element or a compound?",
    "answer": "An element",
    "distractors": [
      "A compound",
      "An alloy",
      "Always a mixture"
    ],
    "explanation": "Both atoms in each O₂ molecule are oxygen. A compound must contain more than one element chemically combined, so a molecule does not automatically make a substance a compound."
  },
  {
    "topic": "mixture-compound",
    "questionText": "What distinguishes a mixture of iron and sulfur from an iron sulfide compound?",
    "answer": "In the compound, the elements are chemically bonded",
    "distractors": [
      "The mixture contains no atoms",
      "The compound has no electrons",
      "Iron stops being an element in every mixture"
    ],
    "explanation": "In a mixture, the substances retain their separate identities and can be present in different proportions. Forming a compound creates chemical bonds and a substance with its own properties."
  },
  {
    "topic": "metal-conduction",
    "questionText": "Why can copper wire carry an electric current?",
    "answer": "Some electrons can move through the metal",
    "distractors": [
      "Protons flow out of its nuclei",
      "Neutrons become charged",
      "Whole atoms travel from the battery"
    ],
    "explanation": "A metal contains electrons that are not confined to a single atom. An applied voltage gives their movement a net direction, allowing charge to pass through the wire."
  },
  {
    "topic": "thermal-motion",
    "questionText": "What generally happens to particles in a substance when it warms without changing state?",
    "answer": "Their average kinetic energy increases",
    "distractors": [
      "Their protons disappear",
      "Every atom becomes a new element",
      "All motion stops"
    ],
    "explanation": "Temperature is related to the particles’ average kinetic energy. In a warming solid they vibrate more vigorously around their positions rather than flowing freely as they would in a liquid."
  },
  {
    "topic": "spectral-identification",
    "questionText": "Why can the colours of light from a hot gas help identify its elements?",
    "answer": "Different atoms have characteristic energy-level gaps",
    "distractors": [
      "All gases emit identical light",
      "Only the heaviest atoms make light",
      "The colour reveals the number of atoms exactly"
    ],
    "explanation": "An atom emits a photon when an electron loses a particular amount of energy. Its allowed energy differences produce characteristic spectral lines that can be compared with known samples."
  },
  {
    "topic": "electron-removal",
    "questionText": "What does ionisation energy measure?",
    "answer": "The energy needed to remove an electron from a gaseous atom",
    "distractors": [
      "The mass of all its neutrons",
      "The heat needed to melt a metal",
      "The speed of light through a gas"
    ],
    "explanation": "Removing an electron requires overcoming its attraction to the atom. First ionisation energy refers to removing one electron from a neutral gaseous atom, producing a positive ion."
  },
  {
    "topic": "decay-calculation",
    "questionText": "A sample starts with 800 radioactive nuclei. About how many remain undecayed after three half-lives?",
    "answer": "100",
    "distractors": [
      "400",
      "200",
      "0"
    ],
    "explanation": "Each half-life halves the number expected to remain: 800 becomes 400, then 200, then 100. Radioactive decay is random, so this is an expected amount rather than an exact promise for a small sample."
  },
  {
    "topic": "alpha-calculation",
    "questionText": "A nucleus with 92 protons emits an alpha particle. How many protons are left?",
    "answer": "90",
    "distractors": [
      "91",
      "88",
      "94"
    ],
    "explanation": "An alpha particle takes away two protons and two neutrons. Losing those two protons lowers the atomic number by two, while the mass number falls by four."
  },
  {
    "topic": "chemical-conservation",
    "questionText": "Why must a balanced chemical equation have the same number of each kind of atom on both sides?",
    "answer": "The reaction rearranges atoms rather than creating or destroying them",
    "distractors": [
      "All substances have the same mass per molecule",
      "Electrons turn into protons",
      "The number of molecules must always stay the same"
    ],
    "explanation": "Bonds break and form during a chemical reaction, but the atoms remain. Molecule counts can change even while the count of each kind of atom stays the same."
  },
  {
    "topic": "isotope-chemistry",
    "questionText": "Why do isotopes of an element usually have very similar chemical behaviour?",
    "answer": "Their neutral atoms have the same electron arrangement",
    "distractors": [
      "They have identical masses",
      "They contain no neutrons",
      "Their nuclei always decay at the same rate"
    ],
    "explanation": "Ordinary chemical bonding mainly involves electrons. Isotopes differ in neutron count rather than proton count, so their neutral atoms have the same electron arrangement, although mass differences can affect reaction rates."
  }
];

export function generateAtomQuestions(count: number): AtomQuestion[] {
  const usedTopics = new Set<string>();
  const factories = [
    ...GENERAL_QUESTIONS.map((factory, index) => ({ factory, topic: QUESTION_TOPICS[index] })),
    ...APPLIED_QUESTIONS.map(({ topic, questionText, answer, distractors, explanation }) => ({
      topic,
      factory: (): AtomQuestion => {
        const choices = shuffleArray([answer, ...distractors]);
        return { questionText, choices, correctIndex: choices.indexOf(answer), explanation };
      },
    })),
  ];
  return addExtraFacts(shuffleArray(factories)
    .filter(({ topic }) => {
      if (usedTopics.has(topic)) return false;
      usedTopics.add(topic);
      return true;
    })
    .slice(0, count)
    .map(({ factory, topic }) => ({ ...factory(), topic })));
}
