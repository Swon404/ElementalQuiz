import { elements } from '../data/elements.ts';

interface CollectionTableProps {
  collectedElements: number[];
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

const LAYOUT: number[][] = [
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [3,4,0,0,0,0,0,0,0,0,0,0,5,6,7,8,9,10],
  [11,12,0,0,0,0,0,0,0,0,0,0,13,14,15,16,17,18],
  [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
  [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54],
  [55,56,0,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86],
  [87,88,0,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118],
  [0,0,0,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71],
  [0,0,0,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103],
];

export default function CollectionTable({ collectedElements }: CollectionTableProps) {
  const collected = new Set(collectedElements);

  return (
    <div className="collection-table-wrap">
      <div className="collection-table">
        {LAYOUT.map((row, ri) => (
          <div key={ri} className="ct-row">
            {row.map((num, ci) => {
              if (num === 0) return <div key={ci} className="ct-cell ct-empty" />;
              const el = elements[num - 1];
              const isCollected = collected.has(num);
              const bg = isCollected ? CATEGORY_COLORS[el.category] || '#666' : undefined;
              return (
                <div
                  key={ci}
                  className={`ct-cell ${isCollected ? 'ct-collected' : 'ct-locked'}`}
                  style={bg ? { backgroundColor: bg } : undefined}
                  title={isCollected ? `${el.name} (${el.symbol})` : '???'}
                >
                  {isCollected ? el.symbol : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="ct-count">{collectedElements.length}/118 elements discovered</p>
    </div>
  );
}
