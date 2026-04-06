import { useState, useEffect } from 'react';
import Elementor from '../components/Elementor.tsx';

const INTRO_LINES = [
  { expression: 'greeting' as const, text: "Hey there! I'm Elementor — your guide to the amazing world of elements!" },
  { expression: 'celebrate' as const, text: "Did you know everything around you is made of elements? Your body, the air, even your phone!" },
  { expression: 'thinking' as const, text: "There are 118 elements in the periodic table. Together we'll learn all about them!" },
  { expression: 'correct' as const, text: "I'll quiz you, teach you cool facts, and help you become an Element Expert!" },
  { expression: 'celebrate' as const, text: "Ready to start your journey? Let's go! ⚛️" },
];

interface IntroScreenProps {
  onFinish: () => void;
}

export default function IntroScreen({ onFinish }: IntroScreenProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [step]);

  const line = INTRO_LINES[step];
  const isLast = step === INTRO_LINES.length - 1;

  const advance = () => {
    if (isLast) {
      onFinish();
    } else {
      setVisible(false);
      setTimeout(() => setStep(s => s + 1), 200);
    }
  };

  return (
    <div className="intro-screen" onClick={advance}>
      <div className="intro-dots">
        {INTRO_LINES.map((_, i) => (
          <span key={i} className={`intro-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
        ))}
      </div>

      <div className={`intro-content ${visible ? 'intro-visible' : ''}`}>
        <Elementor expression={line.expression} message={line.text} size={140} />
      </div>

      <div className="intro-actions">
        <button className="back-btn" onClick={(e) => { e.stopPropagation(); onFinish(); }}>
          Skip
        </button>
        <button className="start-btn intro-next-btn" onClick={(e) => { e.stopPropagation(); advance(); }}>
          {isLast ? "Let's Go!" : 'Next'}
        </button>
      </div>
    </div>
  );
}
