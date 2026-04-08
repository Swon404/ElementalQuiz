interface AtomModelProps {
  atomicNumber: number;
  symbol: string;
  size?: number;
}

/** Standard electron shell capacities */
const SHELL_MAX = [2, 8, 18, 32, 32, 18, 8];

function getShellElectrons(atomicNumber: number): number[] {
  const shells: number[] = [];
  let remaining = atomicNumber;
  for (const max of SHELL_MAX) {
    if (remaining <= 0) break;
    const count = Math.min(remaining, max);
    shells.push(count);
    remaining -= count;
  }
  return shells;
}

export default function AtomModel({ atomicNumber, symbol, size = 200 }: AtomModelProps) {
  const shells = getShellElectrons(atomicNumber);
  const cx = size / 2;
  const cy = size / 2;
  const nucleusR = Math.min(20, 8 + atomicNumber * 0.1);
  const maxShellR = (size / 2) - 12;
  const shellGap = shells.length > 0 ? (maxShellR - nucleusR - 8) / shells.length : 0;

  // Colors for electron shells
  const shellColors = ['#4fc3f7', '#66bb6a', '#ffd54f', '#ff8a65', '#ce93d8', '#4dd0e1', '#aed581'];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="atom-model-svg" style={{ overflow: 'visible' }}>
      {/* Nucleus glow */}
      <circle cx={cx} cy={cy} r={nucleusR + 4} fill="rgba(239,83,80,0.15)">
        <animate attributeName="r" values={`${nucleusR + 2};${nucleusR + 6};${nucleusR + 2}`} dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Nucleus */}
      <circle cx={cx} cy={cy} r={nucleusR} fill="#ef5350" stroke="#c62828" strokeWidth="1.5" />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={nucleusR > 12 ? 10 : 8} fontWeight="bold" fontFamily="monospace">
        {symbol}
      </text>

      {/* Electron shells */}
      {shells.map((electronCount, shellIdx) => {
        const r = nucleusR + 10 + shellIdx * shellGap;
        const color = shellColors[shellIdx % shellColors.length];
        const animDuration = 3 + shellIdx * 1.5; // outer shells orbit slower
        const direction = shellIdx % 2 === 0 ? 1 : -1; // alternate direction

        return (
          <g key={shellIdx}>
            {/* Orbit ring */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="0.8" opacity="0.35" strokeDasharray="3 3" />

            {/* Electrons on this shell */}
            {Array.from({ length: electronCount }).map((_, ei) => {
              const startAngle = (ei / electronCount) * 360;
              const endAngle = startAngle + 360 * direction;
              return (
                <circle key={ei} cx={cx + r} cy={cy} r={2.5} fill={color} opacity="0.9">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`${startAngle} ${cx} ${cy}`}
                    to={`${endAngle} ${cx} ${cy}`}
                    dur={`${animDuration}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}
          </g>
        );
      })}

      {/* Shell labels */}
      {shells.map((count, i) => {
        const r = nucleusR + 10 + i * shellGap;
        return (
          <text key={`label-${i}`} x={cx + r - 4} y={cy - 4} fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="monospace">
            {count}e⁻
          </text>
        );
      })}
    </svg>
  );
}
