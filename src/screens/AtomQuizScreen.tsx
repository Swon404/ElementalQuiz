import { useState, useCallback } from 'react';
import Elementor from '../components/Elementor.tsx';
import { speakText } from '../engine/tts.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';

interface AtomQuizScreenProps {
  onBack: () => void;
}

type Phase = 'setup' | 'playing' | 'result';

type AtomQuestion = {
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

  // ── History & discovery ──
  () => {
    const correct = 'J.J. Thomson';
    const choices = shuffleArray([correct, 'Albert Einstein', 'Isaac Newton', 'Marie Curie']);
    return { questionText: 'Who discovered the electron?', choices, correctIndex: choices.indexOf(correct), explanation: 'J.J. Thomson discovered the electron in 1897 using cathode ray tubes!', illustration: '🔬' };
  },
  () => {
    const correct = 'Ernest Rutherford';
    const choices = shuffleArray([correct, 'Niels Bohr', 'J.J. Thomson', 'Albert Einstein']);
    return { questionText: 'Who discovered that atoms have a nucleus?', choices, correctIndex: choices.indexOf(correct), explanation: 'Ernest Rutherford discovered the nucleus in 1911 with his famous gold foil experiment!', illustration: '🥇' };
  },
  () => {
    const correct = 'Niels Bohr';
    const choices = shuffleArray([correct, 'Ernest Rutherford', 'J.J. Thomson', 'Democritus']);
    return { questionText: 'Who proposed the model of electrons orbiting in shells?', choices, correctIndex: choices.indexOf(correct), explanation: 'Niels Bohr proposed his model in 1913 — electrons orbit in fixed shells, like planets around the sun!', illustration: '🪐' };
  },
  () => {
    const correct = 'Democritus (ancient Greece)';
    const choices = shuffleArray([correct, 'Isaac Newton', 'Albert Einstein', 'Galileo']);
    return { questionText: 'Who first suggested that all matter is made of tiny particles called "atoms"?', choices, correctIndex: choices.indexOf(correct), explanation: 'The ancient Greek thinker Democritus coined the word "atomos" meaning "uncuttable" around 400 BC!', illustration: '🏛️' };
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
];

function generateAtomQuestions(count: number): AtomQuestion[] {
  const pool = shuffleArray(GENERAL_QUESTIONS);
  return pool.slice(0, Math.min(count, pool.length)).map(fn => fn());
}

export default function AtomQuizScreen({ onBack }: AtomQuizScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<AtomQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const questionCount = 12;

  const startQuiz = useCallback(() => {
    setQuestions(generateAtomQuestions(questionCount));
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setAnswered(null);
    setPhase('playing');
  }, []);

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
      <div className="result-actions">
        <button className="start-btn" onClick={startQuiz}>Play Again</button>
        <button className="back-btn" onClick={onBack}>Home</button>
      </div>
    </div>
  );
}
