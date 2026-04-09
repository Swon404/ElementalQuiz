import { useRef, useCallback, useState, useEffect } from 'react';
import { elements } from '../data/elements.ts';
import { loadCustomElements, type CustomElement } from '../engine/storage.ts';

interface PeriodicTableProps {
  collectedElements: number[];
  onElementClick?: (atomicNumber: number) => void;
  onCustomElementClick?: (el: CustomElement) => void;
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

export default function PeriodicTable({ collectedElements, onElementClick, onCustomElementClick, compact }: PeriodicTableProps) {
  const cols = 18;
  const gap = compact ? 1 : 2;

  const [customElements, setCustomElements] = useState<CustomElement[]>([]);

  // Touch-drag panning for small screens
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startScroll = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setCustomElements(loadCustomElements());
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = viewportRef.current;
    if (!el || !isNarrow) return;
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startScroll.current = { x: el.scrollLeft, y: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  }, [isNarrow]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !viewportRef.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    viewportRef.current.scrollLeft = startScroll.current.x - dx;
    viewportRef.current.scrollTop = startScroll.current.y - dy;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    if (viewportRef.current) {
      viewportRef.current.releasePointerCapture(e.pointerId);
      viewportRef.current.style.cursor = '';
    }
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`periodic-table ${compact ? 'compact' : ''} ${isNarrow ? 'pt-pannable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {isNarrow && <p className="pt-drag-hint">☝️ Drag to explore the table</p>}
      <div
        className="pt-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: compact ? undefined : `repeat(7, 1fr) 4px repeat(2, 1fr)`,
          gap: `${gap}px`,
          minWidth: compact ? '500px' : isNarrow ? '900px' : '700px',
          width: '100%',
          height: compact ? undefined : isNarrow ? '600px' : 'calc(100vh - 180px)',
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
      {customElements.length > 0 && (
        <div className="pt-custom-section">
          <h3 className="pt-custom-heading">Your Elements ⭐</h3>
          <div className="pt-custom-grid">
            {customElements.map(cel => (
              <button
                key={cel.id}
                className="pt-cell element collected"
                style={{ backgroundColor: cel.color, borderColor: cel.color }}
                onClick={() => onCustomElementClick?.(cel)}
                title={`${cel.name} (${cel.symbol})`}
              >
                {compact ? (
                  <span className="pt-symbol">{cel.symbol}</span>
                ) : (
                  <>
                    <span className="pt-number">{cel.atomicNumber}</span>
                    <span className="pt-symbol">{cel.symbol}</span>
                    <span className="pt-name">{cel.name}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
