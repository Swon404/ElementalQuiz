import { useState, useCallback } from 'react';
import Elementor from '../components/Elementor.tsx';
import { speakText } from '../engine/tts.ts';
import { playCorrect, playWrong, playCollect } from '../engine/sounds.ts';

interface ExoticQuizScreenProps {
  onBack: () => void;
}

type Phase = 'setup' | 'playing' | 'result';

type ExoticQuestion = {
  questionText: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
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

type QFactory = () => ExoticQuestion;

const EXOTIC_QUESTIONS: QFactory[] = [
  // ── Synthetic superheavy elements ──
  () => {
    const correct = 'Oganesson (Og)';
    const choices = shuffleArray([correct, 'Uranium (U)', 'Plutonium (Pu)', 'Lawrencium (Lr)']);
    return { questionText: 'What is the heaviest element on the periodic table (element 118)?', choices, correctIndex: choices.indexOf(correct), explanation: 'Oganesson (Og, element 118) is the heaviest known element. It was named after nuclear physicist Yuri Oganessian!', illustration: '🏋️' };
  },
  () => {
    const correct = 'Yuri Oganessian';
    const choices = shuffleArray([correct, 'Albert Einstein', 'Marie Curie', 'Dmitri Mendeleev']);
    return { questionText: 'Who is Oganesson (element 118) named after?', choices, correctIndex: choices.indexOf(correct), explanation: 'Oganesson is named after Yuri Oganessian, a Russian-Armenian physicist who helped discover many superheavy elements!', illustration: '👨‍🔬' };
  },
  () => {
    const correct = 'In particle accelerators (labs)';
    const choices = shuffleArray([correct, 'In volcanoes', 'In the ocean', 'In outer space']);
    return { questionText: 'Where are synthetic elements created?', choices, correctIndex: choices.indexOf(correct), explanation: 'Synthetic elements are made in labs by smashing lighter atoms together in particle accelerators at incredible speeds!', illustration: '🔬' };
  },
  () => {
    const correct = 'Technetium (Tc, element 43)';
    const choices = shuffleArray([correct, 'Plutonium (Pu, element 94)', 'Einsteinium (Es, element 99)', 'Oganesson (Og, element 118)']);
    return { questionText: 'What was the first element to be made artificially?', choices, correctIndex: choices.indexOf(correct), explanation: 'Technetium was created in 1937 by bombarding molybdenum with deuterons. Its name means "artificial" in Greek!', illustration: '1️⃣' };
  },
  () => {
    const correct = 'They decay (break apart) very quickly';
    const choices = shuffleArray([correct, 'They float away', 'They turn into gold', 'They explode like bombs']);
    return { questionText: 'Why can\'t we keep superheavy elements for long?', choices, correctIndex: choices.indexOf(correct), explanation: 'Superheavy elements are radioactive and decay in fractions of a second. Some last only milliseconds or less!', illustration: '💨' };
  },
  () => {
    const correct = 'Tennessine (Ts, element 117)';
    const choices = shuffleArray([correct, 'Californium (Cf, element 98)', 'Moscovium (Mc, element 115)', 'Nihonium (Nh, element 113)']);
    return { questionText: 'Which element is named after the US state of Tennessee?', choices, correctIndex: choices.indexOf(correct), explanation: 'Tennessine (element 117) is named after Tennessee, home of Oak Ridge National Laboratory where key research was done!', illustration: '🇺🇸' };
  },
  () => {
    const correct = 'Moscovium (Mc, element 115)';
    const choices = shuffleArray([correct, 'Nihonium (Nh, element 113)', 'Flerovium (Fl, element 114)', 'Livermorium (Lv, element 116)']);
    return { questionText: 'Which element is named after Moscow, Russia?', choices, correctIndex: choices.indexOf(correct), explanation: 'Moscovium (element 115) is named after the Moscow region, where the Joint Institute for Nuclear Research is located!', illustration: '🏛️' };
  },
  () => {
    const correct = 'Nihonium (Nh, element 113)';
    const choices = shuffleArray([correct, 'Moscovium (Mc, element 115)', 'Flerovium (Fl, element 114)', 'Oganesson (Og, element 118)']);
    return { questionText: 'Which element gets its name from the Japanese word for Japan ("Nihon")?', choices, correctIndex: choices.indexOf(correct), explanation: 'Nihonium was the first element discovered in Asia! "Nihon" means "Japan" in Japanese. 🇯🇵', illustration: '🇯🇵' };
  },

  // ── IUPAC systematic naming (unun-) ──
  () => {
    const correct = 'Ununoctium';
    const choices = shuffleArray([correct, 'Ununhexium', 'Ununseptium', 'Ununpentium']);
    return { questionText: 'Before it was named Oganesson, element 118 had the temporary name...?', choices, correctIndex: choices.indexOf(correct), explanation: 'IUPAC gives temporary systematic names using Latin/Greek roots. 1-1-8 = un-un-oct = Ununoctium!', illustration: '📝' };
  },
  () => {
    const correct = 'Latin and Greek number roots';
    const choices = shuffleArray([correct, 'Random letters', 'The discoverer\'s initials', 'The country it was found in']);
    return { questionText: 'How does IUPAC create temporary "unun-" names for new elements?', choices, correctIndex: choices.indexOf(correct), explanation: 'IUPAC spells out the atomic number using roots: un=1, bi=2, tri=3, quad=4, pent=5, hex=6, sept=7, oct=8, enn=9, nil=0!', illustration: '🔤' };
  },
  () => {
    const correct = 'Ununpentium (Uup)';
    const choices = shuffleArray([correct, 'Ununhexium (Uuh)', 'Ununtrium (Uut)', 'Ununseptium (Uus)']);
    return { questionText: 'What was the temporary systematic name for element 115 (now Moscovium)?', choices, correctIndex: choices.indexOf(correct), explanation: '1-1-5 = un-un-pent = Ununpentium! It was given the permanent name Moscovium in 2016.', illustration: '1️⃣1️⃣5️⃣' };
  },
  () => {
    const correct = 'Ununtrium (Uut)';
    const choices = shuffleArray([correct, 'Ununbium (Uub)', 'Ununquadium (Uuq)', 'Ununhexium (Uuh)']);
    return { questionText: 'What was element 113 (now Nihonium) temporarily called?', choices, correctIndex: choices.indexOf(correct), explanation: '1-1-3 = un-un-tri = Ununtrium! It became Nihonium after Japan\'s discovery was confirmed.', illustration: '🔢' };
  },
  () => {
    const correct = 'Ununseptium (Uus)';
    const choices = shuffleArray([correct, 'Ununhexium (Uuh)', 'Ununoctium (Uuo)', 'Ununpentium (Uup)']);
    return { questionText: 'What was the placeholder name for element 117 (now Tennessine)?', choices, correctIndex: choices.indexOf(correct), explanation: '1-1-7 = un-un-sept = Ununseptium! The "-ium" ending is standard for temporary names.', illustration: '📋' };
  },

  // ── Island of stability ──
  () => {
    const correct = 'A predicted region where superheavy elements might be more stable';
    const choices = shuffleArray([correct, 'An actual island where elements are found', 'A video game about chemistry', 'The opposite of radioactivity']);
    return { questionText: 'What is the "Island of Stability"?', choices, correctIndex: choices.indexOf(correct), explanation: 'Scientists predict that around elements 114-126, some nuclei could be extra stable due to "magic numbers" of protons and neutrons!', illustration: '🏝️' };
  },
  () => {
    const correct = 'Flerovium (Fl, element 114)';
    const choices = shuffleArray([correct, 'Oganesson (Og, element 118)', 'Nihonium (Nh, element 113)', 'Seaborgium (Sg, element 106)']);
    return { questionText: 'Which element is thought to be near the centre of the Island of Stability?', choices, correctIndex: choices.indexOf(correct), explanation: 'Element 114 (Flerovium) is predicted to be near the Island of Stability. Some isotopes of Fl already last several seconds!', illustration: '🎯' };
  },
  () => {
    const correct = '"Magic numbers" of protons & neutrons';
    const choices = shuffleArray([correct, 'Having lots of electrons', 'Being very light', 'Having no neutrons']);
    return { questionText: 'What makes elements on the Island of Stability potentially longer-lived?', choices, correctIndex: choices.indexOf(correct), explanation: 'Certain "magic numbers" of protons and neutrons create especially stable nuclear configurations, like shells filling up!', illustration: '✨' };
  },

  // ── Half-lives and radioactivity ──
  () => {
    const correct = 'The time for half the atoms to decay';
    const choices = shuffleArray([correct, 'Half the weight of an element', 'How long an element has existed', 'The time to create an element']);
    return { questionText: 'What does "half-life" mean for a radioactive element?', choices, correctIndex: choices.indexOf(correct), explanation: 'Half-life is the time it takes for half the atoms in a sample to radioactively decay into other elements!', illustration: '⏰' };
  },
  () => {
    const correct = 'Less than 1 millisecond';
    const choices = shuffleArray([correct, 'About 1 year', 'About 1 million years', 'Forever — it\'s stable']);
    return { questionText: 'What is the half-life of Oganesson-294 (element 118)?', choices, correctIndex: choices.indexOf(correct), explanation: 'Oganesson-294 has a half-life of only about 0.7 milliseconds! It decays almost instantly after being created.', illustration: '⚡' };
  },
  () => {
    const correct = 'About 4.5 billion years';
    const choices = shuffleArray([correct, 'About 10 seconds', 'About 1 million years', 'About 24 hours']);
    return { questionText: 'What is the half-life of Uranium-238?', choices, correctIndex: choices.indexOf(correct), explanation: 'Uranium-238 has a half-life of about 4.5 billion years — almost as old as the Earth! That\'s why we still find it naturally.', illustration: '🌍' };
  },
  () => {
    const correct = 'Alpha decay (shoots out a helium nucleus)';
    const choices = shuffleArray([correct, 'Evaporation', 'Melting', 'Dissolving in water']);
    return { questionText: 'How do most superheavy elements decay?', choices, correctIndex: choices.indexOf(correct), explanation: 'Most superheavy elements undergo alpha decay, emitting a helium-4 nucleus (2 protons + 2 neutrons), which reduces their atomic number by 2!', illustration: '☢️' };
  },

  // ── Naming stories ──
  () => {
    const correct = 'Albert Einstein';
    const choices = shuffleArray([correct, 'Isaac Newton', 'Niels Bohr', 'Marie Curie']);
    return { questionText: 'Einsteinium (element 99) is named after which famous scientist?', choices, correctIndex: choices.indexOf(correct), explanation: 'Einsteinium was discovered in the debris of the first hydrogen bomb test (1952) and named after Albert Einstein!', illustration: '🧠' };
  },
  () => {
    const correct = 'The first hydrogen bomb test debris';
    const choices = shuffleArray([correct, 'A volcano eruption', 'A meteor', 'A deep-sea vent']);
    return { questionText: 'Where was Einsteinium (Es, element 99) first found?', choices, correctIndex: choices.indexOf(correct), explanation: 'Einsteinium was found in the fallout of the Ivy Mike nuclear test in 1952. It was top secret for years!', illustration: '💣' };
  },
  () => {
    const correct = 'Marie and Pierre Curie';
    const choices = shuffleArray([correct, 'Albert Einstein', 'Dmitri Mendeleev', 'Lise Meitner']);
    return { questionText: 'Curium (element 96) is named after which scientists?', choices, correctIndex: choices.indexOf(correct), explanation: 'Curium is named after Marie and Pierre Curie, the famous couple who pioneered the study of radioactivity!', illustration: '👩‍🔬' };
  },
  () => {
    const correct = 'Dmitri Mendeleev (creator of the periodic table)';
    const choices = shuffleArray([correct, 'Albert Einstein', 'Enrico Fermi', 'Glenn Seaborg']);
    return { questionText: 'Mendelevium (element 101) is named after whom?', choices, correctIndex: choices.indexOf(correct), explanation: 'Mendelevium honours Dmitri Mendeleev, who created the periodic table and predicted elements that hadn\'t been discovered yet!', illustration: '📊' };
  },
  () => {
    const correct = 'Californium (Cf)';
    const choices = shuffleArray([correct, 'Americium (Am)', 'Berkelium (Bk)', 'Tennessine (Ts)']);
    return { questionText: 'Which element is named after the US state of California?', choices, correctIndex: choices.indexOf(correct), explanation: 'Californium (element 98) is named after California, where UC Berkeley\'s lab made many synthetic elements!', illustration: '🌴' };
  },
  () => {
    const correct = 'Berkelium (Bk, element 97)';
    const choices = shuffleArray([correct, 'Californium (Cf, element 98)', 'Americium (Am, element 95)', 'Neptunium (Np, element 93)']);
    return { questionText: 'Which element is named after the city of Berkeley, California?', choices, correctIndex: choices.indexOf(correct), explanation: 'Berkelium is named after Berkeley, California — home of the Lawrence Berkeley National Laboratory, where it was first made in 1949!', illustration: '🏫' };
  },
  () => {
    const correct = 'Americium (Am, element 95)';
    const choices = shuffleArray([correct, 'Francium (Fr, element 87)', 'Germanium (Ge, element 32)', 'Polonium (Po, element 84)']);
    return { questionText: 'Which synthetic element is named after the Americas?', choices, correctIndex: choices.indexOf(correct), explanation: 'Americium is named after the Americas, mirroring Europium which is named after Europe! It\'s used in smoke detectors.', illustration: '🌎' };
  },

  // ── Predicted & future elements ──
  () => {
    const correct = 'Element 119 (Ununennium)';
    const choices = shuffleArray([correct, 'Element 200', 'Element 150', 'Element 0']);
    return { questionText: 'What is the next element scientists are trying to create?', choices, correctIndex: choices.indexOf(correct), explanation: 'Element 119 (temporarily called Ununennium) would start a brand new row (period 8) of the periodic table!', illustration: '🔮' };
  },
  () => {
    const correct = 'Period 8 (a new row!)';
    const choices = shuffleArray([correct, 'Period 7', 'Period 1', 'It wouldn\'t fit on the table']);
    return { questionText: 'If element 119 is created, which period of the periodic table would it go in?', choices, correctIndex: choices.indexOf(correct), explanation: 'Element 119 would begin period 8 — extending the periodic table into uncharted territory!', illustration: '📏' };
  },
  () => {
    const correct = 'Smashing lighter atoms together at high speed';
    const choices = shuffleArray([correct, 'Mixing chemicals in a beaker', 'Heating rocks in an oven', 'Using magnets on gold']);
    return { questionText: 'How do scientists try to create new superheavy elements?', choices, correctIndex: choices.indexOf(correct), explanation: 'Scientists use particle accelerators to fire beams of lighter atoms into targets, hoping they\'ll fuse into a new superheavy nucleus!', illustration: '💥' };
  },

  // ── Notable synthetic elements ──
  () => {
    const correct = 'Neptunium (Np, element 93)';
    const choices = shuffleArray([correct, 'Plutonium (Pu, element 94)', 'Uranium (U, element 92)', 'Americium (Am, element 95)']);
    return { questionText: 'Which was the first transuranium element (heavier than uranium) to be discovered?', choices, correctIndex: choices.indexOf(correct), explanation: 'Neptunium (element 93) was the first transuranium element, discovered in 1940. It\'s named after Neptune, the planet beyond Uranus!', illustration: '🔭' };
  },
  () => {
    const correct = 'The planets: Uranus → Neptune → Pluto';
    const choices = shuffleArray([correct, 'Famous scientists', 'Greek gods', 'Countries']);
    return { questionText: 'Uranium, Neptunium, and Plutonium are named after what?', choices, correctIndex: choices.indexOf(correct), explanation: 'They\'re named after the planets in order: Uranus (U, 92), Neptune (Np, 93), Pluto (Pu, 94)! Pluto was still a planet back then.', illustration: '🪐' };
  },
  () => {
    const correct = 'Plutonium (Pu, element 94)';
    const choices = shuffleArray([correct, 'Uranium (U, element 92)', 'Einsteinium (Es, element 99)', 'Californium (Cf, element 98)']);
    return { questionText: 'Which synthetic element was used as fuel in nuclear reactors and the Voyager space probes?', choices, correctIndex: choices.indexOf(correct), explanation: 'Plutonium-238 powers NASA\'s Voyager probes and Mars rovers! Plutonium-239 is used in nuclear reactors.', illustration: '🚀' };
  },
  () => {
    const correct = 'Smoke detectors in your home';
    const choices = shuffleArray([correct, 'Making jewellery', 'Flavouring food', 'Painting walls']);
    return { questionText: 'Americium (element 95) is used in everyday life for what?', choices, correctIndex: choices.indexOf(correct), explanation: 'A tiny amount of Americium-241 is inside most household smoke detectors. It ionises the air to detect smoke particles!', illustration: '🔥' };
  },
  () => {
    const correct = 'Only a few atoms at a time';
    const choices = shuffleArray([correct, 'Kilograms at a time', 'Enough to fill a swimming pool', 'Tonnes per day']);
    return { questionText: 'When scientists create elements like Oganesson, how much do they make?', choices, correctIndex: choices.indexOf(correct), explanation: 'Scientists typically create just a handful of atoms — sometimes only 1 or 2! These atoms decay in milliseconds.', illustration: '🔎' };
  },

  // ── Francium and other unstable natural elements ──
  () => {
    const correct = 'Francium (Fr, element 87)';
    const choices = shuffleArray([correct, 'Sodium (Na, element 11)', 'Potassium (K, element 19)', 'Lithium (Li, element 3)']);
    return { questionText: 'Which naturally occurring element is the most unstable, with a half-life of only 22 minutes?', choices, correctIndex: choices.indexOf(correct), explanation: 'Francium is incredibly rare and unstable! At any time, there are only about 20-30 grams on all of Earth.', illustration: '🇫🇷' };
  },
  () => {
    const correct = 'Astatine (At, element 85)';
    const choices = shuffleArray([correct, 'Gold (Au, element 79)', 'Iron (Fe, element 26)', 'Hydrogen (H, element 1)']);
    return { questionText: 'Which is the rarest naturally occurring element on Earth?', choices, correctIndex: choices.indexOf(correct), explanation: 'Astatine is so rare that at any moment, less than 1 gram exists on the entire Earth! Its name means "unstable" in Greek.', illustration: '💎' };
  },
  () => {
    const correct = 'Glenn Seaborg';
    const choices = shuffleArray([correct, 'Albert Einstein', 'Enrico Fermi', 'Yuri Oganessian']);
    return { questionText: 'Which scientist discovered 10 transuranium elements (93-102) and had element 106 (Seaborgium) named after him while still alive?', choices, correctIndex: choices.indexOf(correct), explanation: 'Glenn Seaborg is the only person to have an element named after them while still alive! He helped discover plutonium, curium, and many more.', illustration: '🏅' };
  },
  () => {
    const correct = 'True';
    const choices = ['True', 'False'];
    return { questionText: 'True or False: Some synthetic elements have been detected in supernova explosions in space.', choices, correctIndex: choices.indexOf(correct), explanation: 'True! Technetium and other unstable elements have been detected in the spectra of certain stars, proving they are being created by nuclear reactions in space!', illustration: '🌟' };
  },
  () => {
    const correct = 'Promethium (Pm, element 61)';
    const choices = shuffleArray([correct, 'Technetium (Tc, element 43)', 'Francium (Fr, element 87)', 'Astatine (At, element 85)']);
    return { questionText: 'Which element is named after the Greek Titan who stole fire from the gods?', choices, correctIndex: choices.indexOf(correct), explanation: 'Promethium is named after Prometheus! It\'s one of only two elements below uranium with no stable isotopes (the other is Technetium).', illustration: '🔥' };
  },
];

function generateExoticQuestions(count: number): ExoticQuestion[] {
  const pool = shuffleArray(EXOTIC_QUESTIONS);
  return pool.slice(0, Math.min(count, pool.length)).map(fn => fn());
}

export default function ExoticQuizScreen({ onBack }: ExoticQuizScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<ExoticQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);       // hint used on this question
  const [eliminated, setEliminated] = useState<Set<number>>(new Set()); // indices eliminated by hint
  const [retrying, setRetrying] = useState(false);        // in retry-after-hint mode

  const questionCount = 12;

  const startQuiz = useCallback(() => {
    setQuestions(generateExoticQuestions(questionCount));
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setAnswered(null);
    setHintUsed(false);
    setEliminated(new Set());
    setRetrying(false);
    setPhase('playing');
  }, []);

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
    const q = questions[currentQ];
    if (idx === q.correctIndex) {
      playCorrect();
      setScore(s => s + (hintUsed ? 0.5 : 1));
      setStreak(s => s + 1);
    } else {
      playWrong();
      setStreak(0);
    }
  };

  const useHint = () => {
    if (hintUsed || answered === null) return;
    const q = questions[currentQ];
    // Only offer hint when wrong
    if (answered === q.correctIndex) return;
    // Eliminate 2 wrong choices (not the correct one, not the one already picked)
    const wrongIndices = q.choices
      .map((_, i) => i)
      .filter(i => i !== q.correctIndex && i !== answered);
    const toEliminate = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminated(new Set(toEliminate));
    setHintUsed(true);
    setAnswered(null);  // let them pick again
    setRetrying(true);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setPhase('result');
      if (score >= questions.length * 0.7) playCollect();
    } else {
      setCurrentQ(q => q + 1);
      setAnswered(null);
      setHintUsed(false);
      setEliminated(new Set());
      setRetrying(false);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="quiz-setup">
        <button className="back-btn" onClick={onBack}>&larr; Back</button>
        <h2 className="setup-title">&#9762; Exotic Elements</h2>
        <Elementor expression="greeting" message="Welcome to the Exotic Elements quiz! We'll explore synthetic, superheavy, and unstable elements that push the boundaries of science!" />
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
          <button className="quiz-exit-btn" onClick={() => setShowExitConfirm(true)} title="Quit">&#10005;</button>
          <span className="aq-progress">{currentQ + 1}/{questions.length}</span>
          <span className="aq-score">&#11088; {score}</span>
          {streak > 1 && <span className="aq-streak">&#128293; {streak}</span>}
        </div>

        {q.illustration && (
          <div className="aq-illustration">{q.illustration}</div>
        )}

        <div className="aq-question">
          <p className="aq-question-text">{q.questionText}</p>
          <button className="tts-btn tts-btn-small" onClick={() => speakText(q.questionText)} title="Read aloud">&#128266;</button>
        </div>

        <div className="aq-choices">
          {q.choices.map((choice, idx) => {
            if (eliminated.has(idx)) return (
              <button key={idx} className="aq-choice eliminated" disabled>
                <s>{choice}</s>
              </button>
            );
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

        {/* Wrong answer: offer hint/retry (first wrong only, not after hint used) */}
        {answered !== null && answered !== q.correctIndex && !hintUsed && (
          <div className="aq-hint-offer">
            <p className="aq-hint-text">Not quite! Want a hint? Two wrong answers will be removed and you can try again for half a point.</p>
            <div className="aq-hint-actions">
              <button className="aq-hint-btn" onClick={useHint}>💡 Use Hint & Retry</button>
              <button className="aq-skip-btn" onClick={nextQuestion}>Skip →</button>
            </div>
          </div>
        )}

        {/* Retrying after hint */}
        {retrying && answered === null && (
          <div className="aq-hint-banner">💡 Hint active — pick from the remaining answers! (½ point)</div>
        )}

        {answered !== null && (answered === q.correctIndex || hintUsed) && (
          <div className="aq-explanation">
            {answered === q.correctIndex
              ? <p>{hintUsed ? '½ point — ' : ''}{q.explanation}</p>
              : <p>The answer was <strong>{q.choices[q.correctIndex]}</strong>. {q.explanation}</p>
            }
            <button className="start-btn" onClick={nextQuestion}>
              {currentQ + 1 >= questions.length ? 'See Results' : 'Next \u2192'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Result
  const pct = Math.round((score / questions.length) * 100);
  const displayScore = score % 1 === 0 ? score : score.toFixed(1);
  const resultMsg = pct >= 80
    ? "Superheavy genius! You really know your exotic elements!"
    : pct >= 50
    ? "Good work! You're learning about the wildest elements on the table!"
    : "Keep exploring — the exotic elements are fascinating!";

  return (
    <div className="quiz-result">
      <Elementor expression={pct >= 80 ? 'celebrate' : pct >= 50 ? 'correct' : 'hint'} message={resultMsg} />
      <div className="result-card">
        <h2>Exotic Elements Complete!</h2>
        <div className="result-stats">
          <p className="result-score">{displayScore} / {questions.length}</p>
          <p className="result-pct">{pct}%</p>
        </div>
      </div>
      <div className="result-actions">
        <button className="start-btn" onClick={startQuiz}>Play Again</button>
        <button className="back-btn" onClick={onBack}>Back to Menu</button>
      </div>
    </div>
  );
}
