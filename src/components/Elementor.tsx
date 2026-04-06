import type React from 'react';

type Expression = 'greeting' | 'thinking' | 'correct' | 'wrong' | 'hint' | 'celebrate';

interface ElementorProps {
  expression: Expression;
  message?: string;
  className?: string;
  size?: number;
}

const colors: Record<Expression, { body: string; glow: string; cheek: string }> = {
  greeting: { body: '#4fc3f7', glow: '#81d4fa', cheek: '#ff8a80' },
  thinking: { body: '#ffb74d', glow: '#ffcc80', cheek: '#ffab91' },
  correct: { body: '#66bb6a', glow: '#81c784', cheek: '#ff8a80' },
  wrong: { body: '#ef5350', glow: '#e57373', cheek: '#ef9a9a' },
  hint: { body: '#ab47bc', glow: '#ce93d8', cheek: '#f48fb1' },
  celebrate: { body: '#ffd54f', glow: '#ffe082', cheek: '#ff8a80' },
};

/* Big kawaii-style eyes — the #1 thing that makes characters lovable to kids */
const eyes: Record<Expression, React.ReactNode> = {
  greeting: (
    <>
      <ellipse cx="37" cy="42" rx="8" ry="9" fill="white" />
      <ellipse cx="63" cy="42" rx="8" ry="9" fill="white" />
      <ellipse cx="39" cy="43" rx="5" ry="6" fill="#1a1a2e" />
      <ellipse cx="65" cy="43" rx="5" ry="6" fill="#1a1a2e" />
      <circle cx="41" cy="40" r="2.5" fill="white" />
      <circle cx="67" cy="40" r="2.5" fill="white" />
      <circle cx="37" cy="46" r="1" fill="white" />
      <circle cx="63" cy="46" r="1" fill="white" />
    </>
  ),
  thinking: (
    <>
      {/* One eye looking up, one squinting */}
      <ellipse cx="37" cy="42" rx="8" ry="9" fill="white" />
      <ellipse cx="37" cy="40" rx="5" ry="6" fill="#1a1a2e" />
      <circle cx="39" cy="37" r="2.5" fill="white" />
      <path d="M55 43 Q63 37 71 43" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  correct: (
    <>
      {/* Happy squished eyes + tiny star sparkles */}
      <path d="M29 42 Q37 33 45 42" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M55 42 Q63 33 71 42" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M26 34 L27 31 L28 34 L31 33 L28 35 L29 38 L27 36 L24 37 Z" fill="#ffd54f" />
      <path d="M72 34 L73 31 L74 34 L77 33 L74 35 L75 38 L73 36 L70 37 Z" fill="#ffd54f" />
    </>
  ),
  wrong: (
    <>
      {/* Big sad puppy eyes with worried brows + tear */}
      <ellipse cx="37" cy="44" rx="8" ry="10" fill="white" />
      <ellipse cx="63" cy="44" rx="8" ry="10" fill="white" />
      <ellipse cx="38" cy="46" rx="5" ry="6" fill="#1a1a2e" />
      <ellipse cx="64" cy="46" rx="5" ry="6" fill="#1a1a2e" />
      <circle cx="40" cy="43" r="2.5" fill="white" />
      <circle cx="66" cy="43" r="2.5" fill="white" />
      <path d="M28 33 L44 31" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
      <path d="M56 31 L72 33" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="28" cy="54" rx="2" ry="3" fill="#81d4fa" opacity="0.7">
        <animate attributeName="cy" values="52;58;52" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.5s" repeatCount="indefinite" />
      </ellipse>
    </>
  ),
  hint: (
    <>
      {/* Eyes gazing upward + sweat drop */}
      <ellipse cx="37" cy="42" rx="8" ry="9" fill="white" />
      <ellipse cx="63" cy="42" rx="8" ry="9" fill="white" />
      <ellipse cx="36" cy="39" rx="5" ry="6" fill="#1a1a2e" />
      <ellipse cx="62" cy="39" rx="5" ry="6" fill="#1a1a2e" />
      <circle cx="38" cy="36" r="2.5" fill="white" />
      <circle cx="64" cy="36" r="2.5" fill="white" />
      <path d="M74 30 Q76 24 78 30 Q76 34 74 30" fill="#81d4fa" opacity="0.7">
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </path>
    </>
  ),
  celebrate: (
    <>
      {/* Ecstatic arc eyes + twinkling sparkles */}
      <path d="M29 40 Q37 30 45 40" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M55 40 Q63 30 71 40" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g>
        <line x1="22" y1="26" x2="22" y2="20" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="19" y1="23" x2="25" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />
        </line>
      </g>
      <g>
        <line x1="78" y1="26" x2="78" y2="20" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="75" y1="23" x2="81" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="0.6s" repeatCount="indefinite" />
        </line>
      </g>
    </>
  ),
};

const mouths: Record<Expression, React.ReactNode> = {
  greeting: <path d="M40 58 Q50 67 60 58" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />,
  thinking: <path d="M43 60 Q48 57 53 59 Q57 61 58 58" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />,
  correct: <path d="M36 55 Q50 70 64 55" stroke="#1a1a2e" strokeWidth="2.5" fill="#ff8a80" strokeLinecap="round" />,
  wrong: <path d="M41 63 Q50 57 59 63" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />,
  hint: <ellipse cx="50" cy="60" rx="4" ry="5" fill="#1a1a2e" />,
  celebrate: <path d="M34 54 Q50 74 66 54" stroke="#1a1a2e" strokeWidth="2.5" fill="#ff8a80" strokeLinecap="round" />,
};

function Arms({ expression, body }: { expression: Expression; body: string }) {
  switch (expression) {
    case 'greeting':
      return (
        <>
          {/* Waving hand */}
          <path d="M14 52 Q8 46 14 38" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round">
            <animate attributeName="d" values="M14 52 Q8 46 14 38;M14 52 Q6 44 10 34;M14 52 Q8 46 14 38" dur="0.8s" repeatCount="indefinite" />
          </path>
          <circle r="4" fill={body} stroke="#1a1a2e" strokeWidth="1">
            <animate attributeName="cx" values="14;10;14" dur="0.8s" repeatCount="indefinite" />
            <animate attributeName="cy" values="37;33;37" dur="0.8s" repeatCount="indefinite" />
          </circle>
          <path d="M86 52 Q92 58 88 66" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="67" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
        </>
      );
    case 'thinking':
      return (
        <>
          <path d="M14 52 Q10 56 14 62" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="14" cy="63" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
          <path d="M86 52 Q92 46 86 38" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="85" cy="37" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
        </>
      );
    case 'correct':
      return (
        <>
          <path d="M14 52 Q6 42 12 32" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="31" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
          <path d="M86 52 Q94 42 88 32" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="31" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
        </>
      );
    case 'wrong':
      return (
        <>
          <path d="M14 54 Q10 62 12 72" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="73" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
          <path d="M86 54 Q90 62 88 72" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="73" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
        </>
      );
    case 'hint':
      return (
        <>
          <path d="M14 52 Q6 44 14 34" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="14" cy="33" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
          <path d="M86 52 Q92 58 88 66" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="67" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
        </>
      );
    case 'celebrate':
      return (
        <>
          <path d="M14 50 Q4 38 12 26" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="25" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
          <path d="M86 50 Q96 38 88 26" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="88" cy="25" r="4" fill={body} stroke="#1a1a2e" strokeWidth="1" />
        </>
      );
  }
}

export default function Elementor({ expression, message, className, size = 120 }: ElementorProps) {
  const { body, glow, cheek } = colors[expression];

  return (
    <div className={`elementor-container ${className || ''}`}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="elementor-svg" style={{ overflow: 'visible' }}>
        {/* Soft pulsing glow */}
        <circle cx="50" cy="52" r="44" fill={glow} opacity="0.2">
          <animate attributeName="r" values="42;47;42" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Body — friendly rounded blob */}
        <ellipse cx="50" cy="54" rx="34" ry="36" fill={body} stroke="#1a1a2e" strokeWidth="2" />

        {/* Belly highlight for soft 3D look */}
        <ellipse cx="50" cy="60" rx="20" ry="18" fill="white" opacity="0.12" />

        {/* Rosy cheeks */}
        <circle cx="26" cy="54" r="6" fill={cheek} opacity="0.35" />
        <circle cx="74" cy="54" r="6" fill={cheek} opacity="0.35" />

        {/* Electron orbit */}
        <ellipse cx="50" cy="52" rx="46" ry="14" fill="none" stroke={body} strokeWidth="1.5" opacity="0.45" transform="rotate(-20 50 52)">
          <animateTransform attributeName="transform" type="rotate" from="-20 50 52" to="340 50 52" dur="8s" repeatCount="indefinite" />
        </ellipse>

        {/* Electron dot */}
        <circle r="3" fill="white" opacity="0.9">
          <animateMotion dur="8s" repeatCount="indefinite" path="M50,38 A46,14 -20 1,1 50,38.01" />
        </circle>

        {/* Arms */}
        <Arms expression={expression} body={body} />

        {/* Face */}
        {eyes[expression]}
        {mouths[expression]}

        {/* "E" belly badge */}
        <circle cx="50" cy="74" r="7" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <text x="50" y="77.5" textAnchor="middle" fill="#1a1a2e" fontSize="10" fontWeight="bold" fontFamily="monospace">E</text>
      </svg>
      {message && (
        <div className="elementor-speech">
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
