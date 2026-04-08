import { elements } from '../data/elements.ts';
import { speakText, stopSpeaking } from '../engine/tts.ts';
import AtomModel from './AtomModel.tsx';

interface ElementInfoProps {
  atomicNumber: number;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'alkali-metal': '#ff6b6b',
  'alkaline-earth-metal': '#ffa94d',
  'transition-metal': '#ffd43b',
  'post-transition-metal': '#69db7c',
  'metalloid': '#38d9a9',
  'nonmetal': '#4dabf7',
  'halogen': '#748ffc',
  'noble-gas': '#cc5de8',
  'lanthanide': '#f06595',
  'actinide': '#e599f7',
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

export default function ElementInfo({ atomicNumber, onClose }: ElementInfoProps) {
  const el = elements[atomicNumber - 1];
  if (!el) return null;
  const color = CATEGORY_COLORS[el.category] || '#666';

  const buildSummary = () => {
    let text = `${el.name}. Element number ${el.atomicNumber}, symbol ${el.symbol}. `;
    text += `It is a ${CATEGORY_LABELS[el.category] || el.category}. `;
    text += `At room temperature it is a ${el.stateAtRoomTemp}. `;
    if (el.uses && el.uses.length > 0) text += `Uses include: ${el.uses.join(', ')}. `;
    text += el.funFact;
    return text;
  };

  const handleClose = () => { stopSpeaking(); onClose(); };

  return (
    <div className="element-info-overlay" onClick={handleClose}>
      <div className="element-info-card" onClick={e => e.stopPropagation()} style={{ borderColor: color }}>
        <button className="close-btn" onClick={handleClose}>×</button>

        <div className="ei-header" style={{ backgroundColor: color }}>
          <span className="ei-number">{el.atomicNumber}</span>
          <span className="ei-symbol">{el.symbol}</span>
          <span className="ei-name">{el.name}</span>
          <span className="ei-mass">{el.atomicMass}</span>
          <button className="tts-btn tts-header-btn" onClick={() => speakText(buildSummary())} title="Read aloud">🔊</button>
        </div>

        <div className="atom-model-container">
          <AtomModel atomicNumber={el.atomicNumber} symbol={el.symbol} size={180} />
          <p className="atom-model-label">Bohr Model — {el.atomicNumber} electron{el.atomicNumber !== 1 ? 's' : ''}</p>
        </div>

        <div className="ei-body">
          <div className="ei-row">
            <span className="ei-label">Category</span>
            <span className="ei-value">{CATEGORY_LABELS[el.category]}</span>
          </div>
          {el.group && (
            <div className="ei-row">
              <span className="ei-label">Group</span>
              <span className="ei-value">{el.group}</span>
            </div>
          )}
          <div className="ei-row">
            <span className="ei-label">Period</span>
            <span className="ei-value">{el.period}</span>
          </div>
          <div className="ei-row">
            <span className="ei-label">Block</span>
            <span className="ei-value">{el.block}-block</span>
          </div>
          <div className="ei-row">
            <span className="ei-label">State (Room Temp)</span>
            <span className="ei-value">{el.stateAtRoomTemp.charAt(0).toUpperCase() + el.stateAtRoomTemp.slice(1)}</span>
          </div>
          <div className="ei-row">
            <span className="ei-label">Electron Config</span>
            <span className="ei-value">{el.electronConfiguration}</span>
          </div>
          <div className="ei-row">
            <span className="ei-label">Discovered By</span>
            <span className="ei-value">{el.discoveredBy}</span>
          </div>
          {el.discoveryYear && (
            <div className="ei-row">
              <span className="ei-label">Discovery Year</span>
              <span className="ei-value">{el.discoveryYear}</span>
            </div>
          )}
          <div className="ei-row">
            <span className="ei-label">Discovery Location</span>
            <span className="ei-value">{el.discoveryCountry}</span>
          </div>
          <div className="ei-row">
            <span className="ei-label">Radioactive</span>
            <span className="ei-value">{el.radioactive ? `Yes (half-life: ${el.halfLife})` : 'No'}</span>
          </div>
          {!el.radioactive && (
            <div className="ei-row">
              <span className="ei-label">Stable Isotopes</span>
              <span className="ei-value">{el.stableIsotopes}</span>
            </div>
          )}
          {el.compounds.length > 0 && (
            <div className="ei-row">
              <span className="ei-label">Common Compounds</span>
              <span className="ei-value">{el.compounds.join(', ')}</span>
            </div>
          )}

          {el.uses && el.uses.length > 0 && (
            <div className="ei-section">
              <span className="ei-label">Uses <button className="tts-btn tts-btn-small" onClick={() => speakText(`Uses of ${el.name}: ${el.uses!.join(', ')}`)} title="Read aloud">🔊</button></span>
              <ul className="ei-list">
                {el.uses.map((use, i) => <li key={i}>{use}</li>)}
              </ul>
            </div>
          )}

          {el.obtainedFrom && (
            <div className="ei-section">
              <span className="ei-label">How It's Obtained <button className="tts-btn tts-btn-small" onClick={() => speakText(el.obtainedFrom!)} title="Read aloud">🔊</button></span>
              <p className="ei-text">{el.obtainedFrom}</p>
            </div>
          )}

          <div className="ei-funfact">
            <span className="ei-label">Fun Fact <button className="tts-btn tts-btn-small" onClick={() => speakText(el.funFact)} title="Read aloud">🔊</button></span>
            <p>{el.funFact}</p>
          </div>

          {el.additionalFacts && el.additionalFacts.length > 0 && (
            <div className="ei-section">
              <span className="ei-label">More Facts <button className="tts-btn tts-btn-small" onClick={() => speakText(el.additionalFacts!.join('. '))} title="Read aloud">🔊</button></span>
              <ul className="ei-list">
                {el.additionalFacts.map((fact, i) => <li key={i}>{fact}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
