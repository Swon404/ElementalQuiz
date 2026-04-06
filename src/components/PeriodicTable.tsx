import { elements } from '../data/elements.ts';

interface PeriodicTableProps {
  collectedElements: number[];
  onElementClick?: (atomicNumber: number) => void;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'alkali-metal': '#78a832',
  'alkaline-earth-metal': '#f0c830',
  'transition-metal': '#f4a8a8',
  'post-transition-metal': '#7ecec0',
  'metalloid': '#7ecf8a',
  'nonmetal': '#e8e855',
  'halogen': '#e8d44d',
  'noble-gas': '#c4a8d8',
  'lanthanide': '#8cc8e8',
  'actinide': '#ea99b8',
};

const CATEGORY_LABELS: Record<string, string> = {
  'alkali-metal': 'Alkali Metal',
  'alkaline-earth-metal': 'Alkaline Earth Metal',
  'transition-metal': 'Transition Metal',
  'post-transition-metal': 'Post-Transition Metal',
  'metalloid': 'Metalloid',
  'nonmetal': 'Nonmetal',
  'halogen': 'Halogen',
  'noble-gas': 'Noble Gas',
  'lanthanide': 'Lanthanide',
  'actinide': 'Actinide',
};

// Periodic table layout: [row][col] = atomicNumber (0 = empty)
const LAYOUT: number[][] = [
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [3,4,0,0,0,0,0,0,0,0,0,0,5,6,7,8,9,10],
  [11,12,0,0,0,0,0,0,0,0,0,0,13,14,15,16,17,18],
  [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
  [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],
  [55,56,0,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86],
  [87,88,0,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118],
  [], // spacer
  [0,0,0,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71],
  [0,0,0,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103],
];

export default function PeriodicTable({ collectedElements, onElementClick, compact }: PeriodicTableProps) {
  const cols = 18;
  const gap = compact ? 1 : 2;

  return (
    <div className={`periodic-table ${compact ? 'compact' : ''}`}>
      <div
        className="pt-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: compact ? undefined : `repeat(7, 1fr) 4px repeat(2, 1fr)`,
          gap: `${gap}px`,
          width: '100%',
          height: compact ? undefined : 'calc(100vh - 180px)',
        }}
      >
        {LAYOUT.map((row, ri) => {
          if (row.length === 0) {
            return <div key={ri} className="pt-spacer" style={{ gridColumn: `1 / -1` }} />;
          }
          return row.map((num, ci) => {
            if (num === 0) return <div key={`${ri}-${ci}`} className="pt-cell empty" />;
            const el = elements[num - 1];
            const collected = collectedElements.includes(num);
            const color = CATEGORY_COLORS[el.category] || '#666';
            return (
              <button
                key={`${ri}-${ci}`}
                className={`pt-cell element ${collected ? 'collected' : 'locked'}`}
                style={{
                  backgroundColor: color,
                  borderColor: color,
                  opacity: collected ? 1 : 0.75,
                }}
                onClick={() => onElementClick?.(num)}
                title={`${el.name} (${el.symbol})`}
              >
                {compact ? (
                  <span className="pt-symbol">{el.symbol}</span>
                ) : (
                  <>
                    <span className="pt-number">{el.atomicNumber}</span>
                    <span className="pt-symbol">{el.symbol}</span>
                    <span className="pt-name">{el.name}</span>
                    <span className="pt-mass">{el.atomicMass < 10 ? el.atomicMass.toFixed(3) : el.atomicMass < 100 ? el.atomicMass.toFixed(2) : el.atomicMass.toFixed(1)}</span>
                  </>
                )}
              </button>
            );
          });
        })}
      </div>
      <div className="pt-legend">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="pt-legend-item">
            <span className="pt-legend-swatch" style={{ backgroundColor: color }} />
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>
      <div className="pt-stats">
        <span>{collectedElements.length} / 118 elements collected</span>
      </div>
    </div>
  );
}
