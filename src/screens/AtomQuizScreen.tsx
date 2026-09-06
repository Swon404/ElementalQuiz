import { useState, useCallback, useRef } from 'react';
import Elementor from '../components/Elementor.tsx';
import { speakText } from '../engine/tts.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';
import { buildGameConfigKey, getGameLeaderboard, recordCompletedGameResult, type LeaderboardEntry } from '../engine/gameResults.ts';

interface AtomQuizScreenProps {
  onBack: () => void;
  playerId: string;
  playerName: string;
  championshipRunId?: string;
}

type Phase = 'setup' | 'playing' | 'result';

export type AtomQuestion = {
  questionText: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ───── Question bank: general atomic structure knowledge ───── */

type QFactory = () => AtomQuestion;

const GENERAL_QUESTIONS: QFactory[] = [
  // ── Parts of an atom ──
  () => {
    const choices = shuffleArray(['Protons, Neutrons, Electrons', 'Protons, Neutrons, Photons', 'Atoms, Molecules, Ions', 'Quarks, Leptons, Bosons']);
    return { questionText: 'What are the 3 main particles that make up an atom?', choices, correctIndex: choices.indexOf('Protons, Neutrons, Electrons'), explanation: 'Atoms are made of protons (positive), neutrons (no charge) and electrons (negative)!', illustration: '⚛️' };
  },
  () => {
    const correct = 'The nucleus';
    const choices = shuffleArray([correct, 'The electron cloud', 'The outer shell', 'Floating freely']);
    return { questionText: 'Where are protons found inside an atom?', choices, correctIndex: choices.indexOf(correct), explanation: 'Protons live in the nucleus — the tiny, dense centre of the atom!', illustration: '🔴' };
  },
  () => {
    const correct = 'The nucleus';
    const choices = shuffleArray([correct, 'The outer shell', 'Between atoms', 'The electron cloud']);
    return { questionText: 'Where are neutrons found inside an atom?', choices, correctIndex: choices.indexOf(correct), explanation: 'Neutrons sit in the nucleus alongside the protons. Together they are called nucleons!', illustration: '⚪' };
  },
  () => {
    const correct = 'They orbit the nucleus in shells';
    const choices = shuffleArray([correct, 'They sit inside the nucleus', 'They float randomly', 'They stay still']);
    return { questionText: 'Where are electrons found in an atom?', choices, correctIndex: choices.indexOf(correct), explanation: 'Electrons zoom around the nucleus in layers called electron shells (or energy levels)!', illustration: '🔵' };
  },

  // ── Charges ──
  () => {
    const correct = 'Positive (+)';
    const choices = shuffleArray([correct, 'Negative (−)', 'No charge (neutral)', 'It changes']);
    return { questionText: 'What electrical charge does a proton have?', choices, correctIndex: choices.indexOf(correct), explanation: 'Protons have a positive (+) charge. That\'s why the nucleus is positive!', illustration: '➕' };
  },
  () => {
    const correct = 'Negative (−)';
    const choices = shuffleArray([correct, 'Positive (+)', 'No charge (neutral)', 'It changes']);
    return { questionText: 'What electrical charge does an electron have?', choices, correctIndex: choices.indexOf(correct), explanation: 'Electrons have a negative (−) charge. Opposite charges attract — that\'s what keeps electrons near the nucleus!', illustration: '➖' };
  },
  () => {
    const correct = 'No charge (neutral)';
    const choices = shuffleArray([correct, 'Positive (+)', 'Negative (−)', 'Both + and −']);
    return { questionText: 'What electrical charge does a neutron have?', choices, correctIndex: choices.indexOf(correct), explanation: 'Neutrons have no charge at all — they are neutral! Their name even starts with "neutr"!', illustration: '⚪' };
  },
  () => {
    const correct = 'Protons and neutrons';
    const choices = shuffleArray([correct, 'Protons and electrons', 'Neutrons and electrons', 'Only protons']);
    return { questionText: 'What is the nucleus of an atom made of?', choices, correctIndex: choices.indexOf(correct), explanation: 'The nucleus contains protons and neutrons packed tightly together!', illustration: '🫧' };
  },

  // ── Empty space / size ──
  () => {
    const correct = 'Mostly empty space!';
    const choices = shuffleArray([correct, 'Mostly solid matter', 'Mostly liquid', 'Mostly nucleus']);
    return { questionText: 'What is most of an atom made of?', choices, correctIndex: choices.indexOf(correct), explanation: 'An atom is 99.9999% empty space! If the nucleus were a marble, the atom would be the size of a football stadium!', illustration: '🏟️' };
  },
  () => {
    const correct = 'The electron';
    const choices = shuffleArray([correct, 'The proton', 'The neutron', 'They all weigh the same']);
    return { questionText: 'Which particle in an atom has the smallest mass?', choices, correctIndex: choices.indexOf(correct), explanation: 'An electron is about 1,836 times lighter than a proton! It\'s incredibly tiny!', illustration: '🪶' };
  },
  () => {
    const correct = 'About the same mass';
    const choices = shuffleArray([correct, 'Protons are much heavier', 'Neutrons are much heavier', 'Electrons are the heaviest']);
    return { questionText: 'How do the masses of a proton and a neutron compare?', choices, correctIndex: choices.indexOf(correct), explanation: 'Protons and neutrons have almost identical mass — about 1 atomic mass unit each!', illustration: '⚖️' };
  },

  // ── Electron shells ──
  () => {
    const correct = '2';
    const choices = shuffleArray([correct, '8', '18', '1']);
    return { questionText: 'What is the maximum number of electrons in the first shell?', choices, correctIndex: choices.indexOf(correct), explanation: 'The first shell (closest to the nucleus) can hold a maximum of 2 electrons!', illustration: '1️⃣' };
  },
  () => {
    const correct = '8';
    const choices = shuffleArray([correct, '2', '18', '32']);
    return { questionText: 'What is the maximum number of electrons in the second shell?', choices, correctIndex: choices.indexOf(correct), explanation: 'The second shell can hold up to 8 electrons!', illustration: '2️⃣' };
  },
  () => {
    const correct = '18';
    const choices = shuffleArray([correct, '8', '2', '32']);
    return { questionText: 'What is the maximum number of electrons in the third shell?', choices, correctIndex: choices.indexOf(correct), explanation: 'The third shell can hold up to 18 electrons! The shells get bigger as you go further out.', illustration: '3️⃣' };
  },
  () => {
    const correct = 'Valence electrons';
    const choices = shuffleArray([correct, 'Core electrons', 'Free electrons', 'Nuclear electrons']);
    return { questionText: 'What are the electrons in the outermost shell of an atom called?', choices, correctIndex: choices.indexOf(correct), explanation: 'Valence electrons are the ones in the outermost shell. They decide how an atom bonds with other atoms!', illustration: '💫' };
  },
  () => {
    const correct = 'They help decide how an atom bonds with others';
    const choices = shuffleArray([correct, 'They make the atom heavier', 'They create gravity', 'They heat the atom up']);
    return { questionText: 'Why are valence electrons important?', choices, correctIndex: choices.indexOf(correct), explanation: 'Valence electrons control how atoms join together. Sharing or swapping them creates chemical bonds!', illustration: '🤝' };
  },

  // ── Orbitals ──
  () => {
    const correct = 's, p, d, f';
    const choices = shuffleArray([correct, 'a, b, c, d', '1, 2, 3, 4', 'x, y, z, w']);
    return { questionText: 'What are the 4 types of electron orbitals?', choices, correctIndex: choices.indexOf(correct), explanation: 's, p, d, and f orbitals! They have different shapes — s is a sphere, p is a dumbbell shape!', illustration: '🔮' };
  },
  () => {
    const correct = 'A sphere (ball shape)';
    const choices = shuffleArray([correct, 'A dumbbell shape', 'A ring shape', 'A cube shape']);
    return { questionText: 'What shape is an s orbital?', choices, correctIndex: choices.indexOf(correct), explanation: 'An s orbital is shaped like a sphere — a ball around the nucleus!', illustration: '🟢' };
  },

  // ── Ions & isotopes ──
  () => {
    const correct = 'An atom that has gained or lost electrons';
    const choices = shuffleArray([correct, 'A type of element', 'An atom with no neutrons', 'A broken atom']);
    return { questionText: 'What is an ion?', choices, correctIndex: choices.indexOf(correct), explanation: 'When an atom gains or loses electrons, it becomes charged — we call it an ion! Positive ions lost electrons, negative ions gained them.', illustration: '⚡' };
  },
  () => {
    const correct = 'Atoms of the same element with different numbers of neutrons';
    const choices = shuffleArray([correct, 'Atoms with different numbers of protons', 'Atoms with no electrons', 'A different name for molecules']);
    return { questionText: 'What is an isotope?', choices, correctIndex: choices.indexOf(correct), explanation: 'Isotopes are the same element but with a different number of neutrons. For example, Carbon-12 and Carbon-14 are isotopes!', illustration: '🔄' };
  },
  () => {
    const correct = 'It becomes a negative ion (anion)';
    const choices = shuffleArray([correct, 'It becomes a positive ion', 'Nothing happens', 'It explodes']);
    return { questionText: 'What happens when an atom GAINS an extra electron?', choices, correctIndex: choices.indexOf(correct), explanation: 'Gaining an electron gives the atom more negative charge, so it becomes a negative ion (called an anion)!', illustration: '➖' };
  },
  () => {
    const correct = 'It becomes a positive ion (cation)';
    const choices = shuffleArray([correct, 'It becomes a negative ion', 'It becomes a neutron', 'It disappears']);
    return { questionText: 'What happens when an atom LOSES an electron?', choices, correctIndex: choices.indexOf(correct), explanation: 'Losing an electron means there are more protons than electrons, so the atom becomes positively charged — a cation!', illustration: '➕' };
  },

  // ── Forces ──
  () => {
    const correct = 'The strong nuclear force';
    const choices = shuffleArray([correct, 'Gravity', 'Magnetism', 'Friction']);
    return { questionText: 'What force holds the nucleus together?', choices, correctIndex: choices.indexOf(correct), explanation: 'The strong nuclear force is the most powerful force in nature! It holds protons and neutrons together even though protons repel each other.', illustration: '💪' };
  },
  () => {
    const correct = 'Electromagnetic force (attraction between + and −)';
    const choices = shuffleArray([correct, 'Gravity', 'The strong nuclear force', 'Wind']);
    return { questionText: 'What keeps electrons orbiting around the nucleus?', choices, correctIndex: choices.indexOf(correct), explanation: 'The positive nucleus attracts the negative electrons through the electromagnetic force!', illustration: '🧲' };
  },

  // ── Atomic number / mass ──
  () => {
    const correct = 'The number of protons';
    const choices = shuffleArray([correct, 'The number of electrons', 'The total number of particles', 'The weight of the atom']);
    return { questionText: 'What does the atomic number of an element tell us?', choices, correctIndex: choices.indexOf(correct), explanation: 'The atomic number = the number of protons. It\'s what makes each element unique!', illustration: '🔢' };
  },
  () => {
    const correct = 'The number of protons';
    const choices = shuffleArray([correct, 'The number of electrons', 'The number of neutrons', 'The temperature']);
    return { questionText: 'What makes one element different from another?', choices, correctIndex: choices.indexOf(correct), explanation: 'Every element has a unique number of protons. Change the proton count and you change the element!', illustration: '🧬' };
  },
  () => {
    const correct = 'Protons + Neutrons';
    const choices = shuffleArray([correct, 'Only Protons', 'Protons + Electrons', 'Only Neutrons']);
    return { questionText: 'The mass number (atomic mass) of an atom is roughly equal to the number of...?', choices, correctIndex: choices.indexOf(correct), explanation: 'Mass number = protons + neutrons. Electrons are so light they barely count!', illustration: '⚖️' };
  },

  // ── Quarks & subatomic ──
  () => {
    const correct = 'Quarks';
    const choices = shuffleArray([correct, 'Leptons', 'Gluons', 'Photons', 'Bosons']);
    return { questionText: 'Protons and neutrons are themselves made of even tinier particles — what are they called?', choices, correctIndex: choices.indexOf(correct), explanation: 'Protons and neutrons are built from quarks! Atoms aren\'t the smallest things — the Standard Model goes even deeper.', illustration: '🔬' };
  },
  () => {
    const correct = '2 up quarks and 1 down quark';
    const choices = shuffleArray([correct, '1 up quark and 2 down quarks', '3 up quarks', '3 down quarks', '2 down quarks and 1 up quark']);
    return { questionText: 'A proton is made of which combination of quarks?', choices, correctIndex: choices.indexOf(correct), explanation: 'A proton = 2 up quarks + 1 down quark. Their charges add to exactly +1!', illustration: '🔴' };
  },
  () => {
    const correct = '1 up quark and 2 down quarks';
    const choices = shuffleArray([correct, '2 up quarks and 1 down quark', '3 down quarks', '3 up quarks', '2 down quarks and 1 up quark']);
    return { questionText: 'A neutron is made of which combination of quarks?', choices, correctIndex: choices.indexOf(correct), explanation: 'A neutron = 1 up quark + 2 down quarks. Their charges cancel to zero — neutral!', illustration: '⚪' };
  },
  () => {
    const correct = 'Gluons';
    const choices = shuffleArray([correct, 'Photons', 'Quarks', 'Bosons', 'Leptons']);
    return { questionText: 'What is the name of the particle that "glues" quarks together inside a proton or neutron?', choices, correctIndex: choices.indexOf(correct), explanation: 'Gluons carry the strong nuclear force between quarks — they literally glue them together!', illustration: '🫧' };
  },

  // ── Radioactivity & decay ──
  () => {
    const correct = 'Alpha, Beta, and Gamma';
    const choices = shuffleArray([correct, 'X-ray, UV, and Infrared', 'Proton, Neutron, and Electron', 'Sound, Light, and Heat', 'Cosmic, Solar, and Ground']);
    return { questionText: 'What are the three main types of nuclear radiation?', choices, correctIndex: choices.indexOf(correct), explanation: 'Alpha (α), Beta (β), and Gamma (γ) radiation! They differ in mass, charge, and penetrating power.', illustration: '☢️' };
  },
  () => {
    const correct = 'A helium nucleus (2 protons + 2 neutrons)';
    const choices = shuffleArray([correct, 'A fast-moving electron', 'A high-energy photon', 'A single proton', 'A single neutron']);
    return { questionText: 'What is an alpha particle made of?', choices, correctIndex: choices.indexOf(correct), explanation: 'An alpha particle is identical to a helium-4 nucleus — 2 protons and 2 neutrons. It\'s the heaviest type of radiation.', illustration: '🟡' };
  },
  () => {
    const correct = 'A fast-moving electron (or positron)';
    const choices = shuffleArray([correct, 'A helium nucleus', 'A burst of light energy', 'Two neutrons', 'A single proton']);
    return { questionText: 'What is a beta particle?', choices, correctIndex: choices.indexOf(correct), explanation: 'In beta-minus decay, a neutron turns into a proton and fires out a fast electron — that electron is the beta particle!', illustration: '⚡' };
  },
  () => {
    const correct = 'A very high-energy photon (like super-powerful light)';
    const choices = shuffleArray([correct, 'A helium nucleus', 'A fast electron', 'A proton beam', 'A neutron beam']);
    return { questionText: 'What is gamma radiation?', choices, correctIndex: choices.indexOf(correct), explanation: 'Gamma rays are pure electromagnetic energy — like X-rays but far more powerful! They have no mass and travel at the speed of light.', illustration: '💜' };
  },
  () => {
    const correct = 'The time it takes for half of the radioactive atoms in a sample to decay';
    const choices = shuffleArray([correct, 'How long an atom lives before it explodes', 'How fast radiation travels', 'The age of a radioactive element', 'How long a reactor takes to start up']);
    return { questionText: 'What is "half-life" in nuclear physics?', choices, correctIndex: choices.indexOf(correct), explanation: 'Half-life is the time for half the atoms to decay. After 2 half-lives, only ¼ remain. It\'s how we date ancient materials!', illustration: '⏳' };
  },
  () => {
    const correct = 'About 5,730 years';
    const choices = shuffleArray([correct, 'About 100 years', 'About 1 million years', 'About 50 years', 'About 14 days']);
    return { questionText: 'What is the half-life of Carbon-14, used for dating ancient objects?', choices, correctIndex: choices.indexOf(correct), explanation: 'Carbon-14 has a half-life of ~5,730 years. Scientists use it to date ancient bones, wood, and fabric up to about 50,000 years old!', illustration: '🦴' };
  },
  () => {
    const correct = 'Alpha radiation';
    const choices = shuffleArray([correct, 'Beta radiation', 'Gamma radiation', 'All three equally']);
    return { questionText: 'Which type of radiation can be stopped by a sheet of paper?', choices, correctIndex: choices.indexOf(correct), explanation: 'Alpha particles are the biggest and slowest — a sheet of paper (or even skin) stops them. But they\'re very dangerous if swallowed!', illustration: '📄' };
  },
  () => {
    const correct = 'Gamma radiation';
    const choices = shuffleArray([correct, 'Alpha radiation', 'Beta radiation', 'Sound waves', 'Ultraviolet light']);
    return { questionText: 'Which type of radiation requires thick lead or concrete to stop it?', choices, correctIndex: choices.indexOf(correct), explanation: 'Gamma rays are pure energy and incredibly penetrating — it takes many centimetres of lead or thick concrete to block them!', illustration: '🧱' };
  },
  () => {
    const correct = 'It becomes a different element';
    const choices = shuffleArray([correct, 'It becomes a gas', 'It gains more neutrons', 'It gets bigger', 'Nothing changes']);
    return { questionText: 'When a radioactive nucleus emits an alpha or beta particle, what happens to the element?', choices, correctIndex: choices.indexOf(correct), explanation: 'Losing protons changes the atomic number — so the atom literally transforms into a different element! Uranium slowly becomes lead over billions of years.', illustration: '🔄' };
  },

  // ── Fission & fusion ──
  () => {
    const correct = 'Nuclear fission';
    const choices = shuffleArray([correct, 'Nuclear fusion', 'Beta decay', 'Gamma emission', 'Alpha decay']);
    return { questionText: 'What is the process of splitting a large atomic nucleus into smaller ones called?', choices, correctIndex: choices.indexOf(correct), explanation: 'Nuclear fission releases enormous energy! It\'s how nuclear power stations generate electricity and how atomic bombs work.', illustration: '💥' };
  },
  () => {
    const correct = 'Nuclear fusion';
    const choices = shuffleArray([correct, 'Nuclear fission', 'Beta decay', 'Nuclear combustion', 'Gamma emission']);
    return { questionText: 'What is the process of joining two small nuclei together to make a bigger one?', choices, correctIndex: choices.indexOf(correct), explanation: 'Nuclear fusion powers the Sun and all stars! Hydrogen atoms fuse into helium, releasing massive amounts of energy.', illustration: '☀️' };
  },
  () => {
    const correct = 'In the cores of stars (nuclear fusion)';
    const choices = shuffleArray([correct, 'By chemical reactions on Earth', 'In the upper atmosphere', 'By scientists in labs', 'Deep underground']);
    return { questionText: 'Where are most of the heavy elements (like gold, iron, and oxygen) created in the universe?', choices, correctIndex: choices.indexOf(correct), explanation: 'Most elements heavier than hydrogen were forged in stars through nuclear fusion! When stars explode, those atoms scatter across the universe — including into you! ⭐', illustration: '🌟' };
  },

  // ── Antimatter ──
  () => {
    const correct = 'A particle with the same mass but opposite charge to its normal partner';
    const choices = shuffleArray([correct, 'A particle that moves backwards in time', 'An extremely heavy particle', 'A particle made of dark matter', 'A particle with no charge at all']);
    return { questionText: 'What is antimatter?', choices, correctIndex: choices.indexOf(correct), explanation: 'Every particle has an antiparticle twin! The antielectron (positron) has the same mass as an electron but positive charge. When matter meets antimatter — they annihilate in a flash of energy!', illustration: '💫' };
  },

  // ── Periodic table structure ──
  () => {
    const correct = 'The number of electron shells';
    const choices = shuffleArray([correct, 'The number of protons', 'The atomic mass', 'The number of neutrons', 'The number of valence electrons']);
    return { questionText: 'What does the PERIOD (row) number on the periodic table tell you about an element?', choices, correctIndex: choices.indexOf(correct), explanation: 'Period 1 elements have 1 electron shell, Period 2 have 2 shells, etc. That\'s why elements in the same period have similar energy levels!', illustration: '📊' };
  },
  () => {
    const correct = 'The number of valence electrons (outer shell electrons)';
    const choices = shuffleArray([correct, 'The number of protons', 'The number of neutrons', 'The total number of electrons', 'The atomic mass']);
    return { questionText: 'What does the GROUP (column) number on the periodic table tell you about an element?', choices, correctIndex: choices.indexOf(correct), explanation: 'Elements in the same group have the same number of valence electrons — so they behave very similarly! That\'s why noble gases (Group 18) all act alike.', illustration: '🗂️' };
  },

  // ── Fun facts ──
  () => {
    const correct = 'True';
    const choices = ['True', 'False'];
    return { questionText: 'True or False: Every atom of gold has exactly 79 protons.', choices, correctIndex: choices.indexOf(correct), explanation: 'True! Every gold atom has 79 protons. If it had 78 it would be platinum, and 80 would be mercury!', illustration: '✨' };
  },
  () => {
    const correct = 'False';
    const choices = ['True', 'False'];
    return { questionText: 'True or False: You can see individual atoms with a magnifying glass.', choices, correctIndex: choices.indexOf(correct), explanation: 'False! Atoms are way too small to see, even with most microscopes. You need a special electron microscope!', illustration: '🔍' };
  },
  () => {
    const correct = 'False';
    const choices = ['True', 'False'];
    return { questionText: 'True or False: Atoms can be destroyed easily.', choices, correctIndex: choices.indexOf(correct), explanation: 'False! Atoms are incredibly tough. They can be rearranged in chemical reactions, but destroying the nucleus takes enormous energy (nuclear reactions)!', illustration: '💥' };
  },
  () => {
    const correct = 'True';
    const choices = ['True', 'False'];
    return { questionText: 'True or False: The atoms in your body were once inside a star.', choices, correctIndex: choices.indexOf(correct), explanation: 'True! Almost every atom in your body was forged inside a star that exploded billions of years ago. You are literally made of star stuff! ⭐', illustration: '⭐' };
  },
  () => {
    const correct = 'About 7 billion billion billion (7×10²⁷)';
    const choices = shuffleArray([correct, 'About 7 million', 'About 7 billion', 'About 7 thousand']);
    return { questionText: 'Roughly how many atoms are in the human body?', choices, correctIndex: choices.indexOf(correct), explanation: 'There are about 7,000,000,000,000,000,000,000,000,000 atoms in your body! That\'s 7 followed by 27 zeros!', illustration: '🧍' };
  },
  () => {
    const correct = 'Share or swap electrons';
    const choices = shuffleArray([correct, 'Share or swap protons', 'Share or swap neutrons', 'Merge their nuclei']);
    return { questionText: 'When atoms bond together to make molecules, what do they do?', choices, correctIndex: choices.indexOf(correct), explanation: 'Chemical bonds involve sharing or transferring electrons between atoms. The nucleus stays untouched!', illustration: '🔗' };
  },
  () => {
    const correct = 'A group of atoms bonded together';
    const choices = shuffleArray([correct, 'A single proton', 'A type of element', 'An atom with extra neutrons']);
    return { questionText: 'What is a molecule?', choices, correctIndex: choices.indexOf(correct), explanation: 'A molecule is two or more atoms bonded together. Water (H₂O) is a molecule made of 2 hydrogen atoms and 1 oxygen atom!', illustration: '💧' };
  },
  () => {
    const correct = pick(['Hydrogen', 'Hydrogen']);
    const choices = shuffleArray([correct, 'Oxygen', 'Carbon', 'Iron']);
    return { questionText: 'What is the simplest atom, with just 1 proton and 1 electron?', choices, correctIndex: choices.indexOf(correct), explanation: 'Hydrogen is the simplest atom — just 1 proton and 1 electron! It\'s also the most common element in the universe!', illustration: '1️⃣' };
  },
  () => {
    const correct = 'Nucleons';
    const choices = shuffleArray([correct, 'Electrons', 'Ionons', 'Atomons']);
    return { questionText: 'What is the collective name for protons and neutrons?', choices, correctIndex: choices.indexOf(correct), explanation: 'Protons and neutrons together are called nucleons because they live in the nucleus!', illustration: '🫂' };
  },
  () => {
    const correct = 'Neutral (no overall charge)';
    const choices = shuffleArray([correct, 'Positive', 'Negative', 'It depends on the element']);
    return { questionText: 'What is the overall charge of a normal (non-ion) atom?', choices, correctIndex: choices.indexOf(correct), explanation: 'A normal atom has equal protons (+) and electrons (−), so the charges cancel out — neutral!', illustration: '⚖️' };
  },
  () => {
    const correct = 'Energy levels get higher';
    const choices = shuffleArray([correct, 'Energy levels get lower', 'Energy stays the same', 'Electrons slow down']);
    return { questionText: 'As electron shells get further from the nucleus, what happens to energy?', choices, correctIndex: choices.indexOf(correct), explanation: 'Outer shells = higher energy! That\'s why they\'re also called energy levels. Electrons in outer shells have more energy.', illustration: '📈' };
  },
  () => {
    const correct = 'The tiny, dense centre of the atom';
    const choices = shuffleArray([correct, 'The outer electron shell', 'The space between molecules', 'A cloud of electrons']);
    return { questionText: 'If an atom were a sports stadium, what would the nucleus be most like?', choices, correctIndex: choices.indexOf(correct), explanation: 'The nucleus is tiny compared with the whole atom, but it contains nearly all the mass. Most of the rest is empty space!' };
  },
  () => {
    const correct = 'Protons';
    const choices = shuffleArray([correct, 'Neutrons', 'Electrons', 'Shells']);
    return { questionText: 'What particle count decides whether an atom is hydrogen, carbon, gold, or another element?', choices, correctIndex: choices.indexOf(correct), explanation: 'The number of protons decides the element. Carbon always has 6 protons, oxygen always has 8, and gold always has 79.' };
  },
  () => {
    const correct = 'Electrons';
    const choices = shuffleArray([correct, 'Protons', 'Neutrons', 'The whole nucleus']);
    return { questionText: 'In normal chemical reactions, which particles are shared, gained, or lost?', choices, correctIndex: choices.indexOf(correct), explanation: 'Chemical reactions rearrange electrons. The nucleus usually stays the same unless it is a nuclear reaction.' };
  },
  () => {
    const correct = 'Positive and negative charges attract';
    const choices = shuffleArray([correct, 'Gravity pulls them strongly', 'Neutrons pull them in', 'Electrons are glued to protons']);
    return { questionText: 'Why are negative electrons attracted toward the positive nucleus?', choices, correctIndex: choices.indexOf(correct), explanation: 'Opposite electric charges attract. The positive protons in the nucleus attract the negative electrons around it.' };
  },
  () => {
    const correct = 'The electrons';
    const choices = shuffleArray([correct, 'The protons', 'The neutrons', 'The nucleus']);
    return { questionText: 'When you rub a balloon on hair and it sticks to a wall, which atomic particles have moved around?', choices, correctIndex: choices.indexOf(correct), explanation: 'Static electricity happens because electrons move from one surface to another, leaving objects charged.' };
  },
  () => {
    const correct = 'Neutrons';
    const choices = shuffleArray([correct, 'Protons', 'Electrons', 'Valence shells']);
    return { questionText: 'Which particles can change between isotopes of the same element?', choices, correctIndex: choices.indexOf(correct), explanation: 'Isotopes have the same number of protons but different numbers of neutrons. Carbon-12 and Carbon-14 are both carbon.' };
  },
  () => {
    const correct = 'It has a full outer electron shell';
    const choices = shuffleArray([correct, 'It has no protons', 'It is always radioactive', 'It has no neutrons']);
    return { questionText: 'Why is a noble gas atom usually so unreactive?', choices, correctIndex: choices.indexOf(correct), explanation: 'Noble gases usually have full outer shells, so they do not need to gain, lose, or share electrons easily.' };
  },
  () => {
    const correct = 'Electron shells';
    const choices = shuffleArray([correct, 'Neutron rings', 'Proton paths', 'Gravity layers']);
    return { questionText: 'What are the layers around an atom where electrons are found called?', choices, correctIndex: choices.indexOf(correct), explanation: 'Electrons sit in energy levels often called shells. The first shell fills before the second starts filling.' };
  },
  () => {
    const correct = 'It has lost electrons';
    const choices = shuffleArray([correct, 'It has gained protons', 'It has lost neutrons', 'It has become radioactive']);
    return { questionText: 'If an atom becomes a positive ion, what has usually happened?', choices, correctIndex: choices.indexOf(correct), explanation: 'A positive ion has more protons than electrons. That usually happens when the atom loses one or more electrons.' };
  },
  () => {
    const correct = 'It has gained electrons';
    const choices = shuffleArray([correct, 'It has gained protons', 'It has lost neutrons', 'It has split its nucleus']);
    return { questionText: 'If an atom becomes a negative ion, what has usually happened?', choices, correctIndex: choices.indexOf(correct), explanation: 'A negative ion has extra electrons, so its overall charge becomes negative.' };
  },
  () => {
    const correct = 'Because atoms are mostly empty space';
    const choices = shuffleArray([correct, 'Because atoms are flat', 'Because electrons are bigger than nuclei', 'Because protons disappear']);
    return { questionText: 'Why can tiny particles sometimes pass through thin sheets of matter?', choices, correctIndex: choices.indexOf(correct), explanation: 'Atoms are mostly empty space, with a very small nucleus. That idea helped scientists discover the nuclear model of the atom.' };
  },
  () => {
    const correct = 'The nucleus has changed';
    const choices = shuffleArray([correct, 'Only the outer electrons changed', 'The atom changed colour', 'The atom became a molecule']);
    return { questionText: 'What is the big difference between a nuclear reaction and a chemical reaction?', choices, correctIndex: choices.indexOf(correct), explanation: 'Chemical reactions rearrange electrons. Nuclear reactions change the nucleus itself, which can turn one element into another.' };
  },
];

export function generateAtomQuestions(count: number): AtomQuestion[] {
  const pool = shuffleArray(GENERAL_QUESTIONS);
  return pool.slice(0, Math.min(count, pool.length)).map(fn => fn());
}

export default function AtomQuizScreen({ onBack, playerId, playerName, championshipRunId }: AtomQuizScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<AtomQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [newBestId, setNewBestId] = useState<string | null>(null);
  const startedAtRef = useRef(0);

  const questionCount = 12;
  const configKey = buildGameConfigKey('atom-quiz', 'classic', { questions: questionCount });

  const startQuiz = useCallback(() => {
    setQuestions(generateAtomQuestions(questionCount));
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setAnswered(null);
    setElapsedMs(0);
    setNewBestId(null);
    setLeaderboard(getGameLeaderboard('atom-quiz', 'classic', configKey, 'solo'));
    startedAtRef.current = Date.now();
    setPhase('playing');
  }, [configKey]);

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
    const q = questions[currentQ];
    if (idx === q.correctIndex) {
      playCorrect();
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else {
      playWrong();
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      const completedElapsedMs = Math.max(1, Date.now() - startedAtRef.current);
      const recorded = recordCompletedGameResult({
        rulesVersion: 1,
        gameId: 'atom-quiz',
        variantId: 'classic',
        configKey,
        format: 'solo',
        participant: { id: playerId, name: playerName, kind: playerId.startsWith('guest:') ? 'guest' : 'profile' },
        championshipRunId,
        metrics: {
          score,
          normalizedScore: Math.round((score / questions.length) * 100),
          correct: score,
          total: questions.length,
          elapsedMs: completedElapsedMs,
        },
      });
      const updated = getGameLeaderboard('atom-quiz', 'classic', configKey, 'solo');
      setElapsedMs(completedElapsedMs);
      setLeaderboard(updated);
      setNewBestId(recorded && updated.some(entry => entry.id === recorded.id) ? recorded.id : null);
      setPhase('result');
      if (score >= questions.length * 0.7) playCollect();
    } else {
      setCurrentQ(q => q + 1);
      setAnswered(null);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="setup-title">⚛️ Atom Quiz</h2>
        <Elementor expression="greeting" message="Let's learn how atoms work! Protons, neutrons, electrons, shells — are you ready?" />
        <button className="start-btn" onClick={startQuiz}>Start Quiz!</button>
      </div>
    );
  }

  if (phase === 'playing' && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="aq-playing">
        {showExitConfirm && (
          <div className="exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
            <div className="exit-confirm-card" onClick={e => e.stopPropagation()}>
              <p>Quit this quiz?</p>
              <div className="exit-confirm-actions">
                <button className="start-btn" onClick={() => setShowExitConfirm(false)}>Keep Playing</button>
                <button className="back-btn" onClick={onBack}>Quit</button>
              </div>
            </div>
          </div>
        )}
        <div className="aq-header">
          <button className="quiz-exit-btn" onClick={() => setShowExitConfirm(true)} title="Quit">✕</button>
          <span className="aq-progress">{currentQ + 1}/{questions.length}</span>
          <span className="aq-score">⭐ {score}</span>
          {streak > 1 && <span className="aq-streak">🔥 {streak}</span>}
        </div>

        {q.illustration && (
          <div className="aq-illustration">{q.illustration}</div>
        )}

        <div className="aq-question">
          <p className="aq-question-text">{q.questionText}</p>
          <button className="tts-btn tts-btn-small" onClick={() => speakText(q.questionText)} title="Read aloud">🔊</button>
        </div>

        <div className="aq-choices">
          {q.choices.map((choice, idx) => {
            let cls = 'aq-choice';
            if (answered !== null) {
              if (idx === q.correctIndex) cls += ' correct';
              else if (idx === answered) cls += ' wrong';
            }
            return (
              <button key={idx} className={cls} onClick={() => handleAnswer(idx)} disabled={answered !== null}>
                {choice}
              </button>
            );
          })}
        </div>

        {answered !== null && (
          <div className="aq-explanation">
            <p>{q.explanation}</p>
            <button className="start-btn" onClick={nextQuestion}>
              {currentQ + 1 >= questions.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Result
  const pct = Math.round((score / questions.length) * 100);
  const resultMsg = pct >= 80
    ? "Atomic genius! You really understand how atoms work!"
    : pct >= 50
    ? "Good work! You're learning a lot about atomic structure!"
    : "Keep studying atoms — they're the building blocks of everything!";

  return (
    <div className="quiz-result">
      <Elementor expression={pct >= 80 ? 'celebrate' : pct >= 50 ? 'correct' : 'hint'} message={resultMsg} />
      <div className="result-card">
        <h2>Atom Quiz Complete!</h2>
        <div className="result-stats">
          <div className="result-stat">
            <span className="stat-value">{score}/{questions.length}</span>
            <span className="stat-label">Correct</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{pct}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>
      </div>
      <div className="atomic-order-leaderboard match-trial-leaderboard">
        <span className="atomic-order-best-mode">{questionCount} questions · {(elapsedMs / 1000).toFixed(1)}s</span>
        <span className="atomic-order-best-label">🏆 Atom Quiz Top 10</span>
        {newBestId && <span className="atomic-order-new-best">🎉 New leaderboard best!</span>}
        {leaderboard.length ? <ol className="atomic-order-leaderboard-list">{leaderboard.map(entry => <li key={entry.id} className={entry.id === newBestId ? 'me' : ''}><span>{entry.participant.name} · {entry.metrics.score}/{entry.metrics.total}</span><span>{entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : '—'}</span></li>)}</ol> : <span className="atomic-order-best-values">No scores yet — set the first!</span>}
      </div>
      <div className="result-actions">
        {championshipRunId
          ? <button className="start-btn" onClick={onBack}>Continue Championship</button>
          : <><button className="start-btn" onClick={startQuiz}>Play Again</button><button className="back-btn" onClick={onBack}>Back to Games</button></>}
      </div>
    </div>
  );
}
