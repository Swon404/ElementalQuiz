import { useState, useEffect } from 'react';
import Elementor from '../components/Elementor.tsx';
import {
  loadCustomElements, saveCustomElement, deleteCustomElement,
  type CustomElement,
} from '../engine/storage.ts';
import { playCorrect, playCollect } from '../engine/sounds.ts';

interface ElementLabScreenProps {
  onBack: () => void;
  playerName?: string;
}

type LabPhase = 'gallery' | 'creator';

const CATEGORIES = [
  { value: 'superheavy', label: 'Superheavy Metal', emoji: '🏋️' },
  { value: 'magical', label: 'Magical Element', emoji: '✨' },
  { value: 'alien', label: 'Alien Element', emoji: '👽' },
  { value: 'mysterious', label: 'Mysterious Substance', emoji: '🌀' },
  { value: 'metal', label: 'Metal', emoji: '🔩' },
  { value: 'nonmetal', label: 'Non-metal', emoji: '💨' },
  { value: 'noble-gas', label: 'Noble Gas', emoji: '🫧' },
  { value: 'radioactive', label: 'Radioactive', emoji: '☢️' },
];

const STATES = ['Solid', 'Liquid', 'Gas', 'Plasma'];

const COLORS = [
  '#ff6b6b', '#ee5a24', '#f9ca24', '#6ab04c', '#22a6b3',
  '#4834d4', '#be2edd', '#eb4d4b', '#7ed6df', '#e056fd',
  '#686de0', '#30336b', '#95afc0', '#f8a5c2', '#63cdda',
];

const SUPERPOWERS = [
  'Can turn invisible when nobody is looking',
  'Glows in the dark with an eerie light',
  'Makes anything it touches bounce',
  'Can change colour depending on mood',
  'Emits a calming hum at midnight',
  'Attracts butterflies from miles away',
  'Makes nearby objects float briefly',
  'Tastes like strawberries (do NOT eat!)',
  'Creates tiny rainbows in sunlight',
  'Can record sounds and play them back',
  'Vibrates at the frequency of happiness',
  'Turns water into sparkling fizzy water',
  'Makes flowers bloom instantly nearby',
  'Can freeze time for 0.001 seconds',
  'Whispers the secrets of the universe',
];

function randomSuperpower(): string {
  return SUPERPOWERS[Math.floor(Math.random() * SUPERPOWERS.length)];
}

export default function ElementLabScreen({ onBack, playerName }: ElementLabScreenProps) {
  const [phase, setPhase] = useState<LabPhase>('gallery');
  const [customElements, setCustomElements] = useState<CustomElement[]>([]);
  const [selectedEl, setSelectedEl] = useState<CustomElement | null>(null);

  // Creator form state
  const [elName, setElName] = useState('');
  const [elSymbol, setElSymbol] = useState('');
  const [elCategory, setElCategory] = useState('superheavy');
  const [elState, setElState] = useState('Solid');
  const [elColor, setElColor] = useState('#4834d4');
  const [elSuperpower, setElSuperpower] = useState(randomSuperpower());
  const [elFunFact, setElFunFact] = useState('');

  useEffect(() => {
    setCustomElements(loadCustomElements());
  }, []);

  const nextNumber = customElements.length > 0
    ? Math.max(...customElements.map(e => e.atomicNumber)) + 1
    : 119;

  const resetForm = () => {
    setElName('');
    setElSymbol('');
    setElCategory('superheavy');
    setElState('Solid');
    setElColor('#4834d4');
    setElSuperpower(randomSuperpower());
    setElFunFact('');
  };

  const handleCreate = () => {
    if (!elName.trim() || !elSymbol.trim()) return;
    const sym = elSymbol.trim().slice(0, 2);
    const finalSymbol = sym.charAt(0).toUpperCase() + sym.slice(1).toLowerCase();
    const newEl: CustomElement = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      atomicNumber: nextNumber,
      symbol: finalSymbol,
      name: elName.trim(),
      category: elCategory,
      stateAtRoomTemp: elState,
      color: elColor,
      superpower: elSuperpower,
      funFact: elFunFact.trim() || `${elName.trim()} was discovered in a secret laboratory!`,
      discoveredBy: playerName || 'Unknown Scientist',
      createdAt: new Date().toISOString(),
    };
    saveCustomElement(newEl);
    setCustomElements(loadCustomElements());
    playCollect();
    resetForm();
    setPhase('gallery');
  };

  const handleDelete = (id: string) => {
    deleteCustomElement(id);
    setCustomElements(loadCustomElements());
    setSelectedEl(null);
  };

  // --- Detail overlay ---
  if (selectedEl) {
    const selCat = CATEGORIES.find(c => c.value === selectedEl.category);
    return (
      <div className="el-lab">
        <div className="el-lab-detail">
          <button className="back-btn" onClick={() => setSelectedEl(null)}>&larr; Back</button>
          <div className="el-lab-detail-tile" style={{ background: selectedEl.color }}>
            <span className="el-lab-tile-number">{selectedEl.atomicNumber}</span>
            <span className="el-lab-tile-symbol">{selectedEl.symbol}</span>
            <span className="el-lab-tile-name">{selectedEl.name}</span>
          </div>
          <div className="el-lab-detail-rows">
            <div className="el-lab-row"><span className="el-lab-label">Category</span><span>{selCat?.emoji} {selCat?.label}</span></div>
            <div className="el-lab-row"><span className="el-lab-label">State</span><span>{selectedEl.stateAtRoomTemp}</span></div>
            <div className="el-lab-row"><span className="el-lab-label">Superpower</span><span>{selectedEl.superpower}</span></div>
            <div className="el-lab-row"><span className="el-lab-label">Fun Fact</span><span>{selectedEl.funFact}</span></div>
            <div className="el-lab-row"><span className="el-lab-label">Discovered By</span><span>{selectedEl.discoveredBy}</span></div>
          </div>
          <button className="back-btn el-lab-delete" onClick={() => handleDelete(selectedEl.id)}>Delete Element</button>
        </div>
      </div>
    );
  }

  // --- Creator form ---
  if (phase === 'creator') {
    return (
      <div className="el-lab">
        <button className="back-btn" onClick={() => setPhase('gallery')}>&larr; Back to Gallery</button>
        <h2 className="el-lab-title">Create Element #{nextNumber}</h2>

        <div className="el-lab-preview" style={{ background: elColor }}>
          <span className="el-lab-tile-number">{nextNumber}</span>
          <span className="el-lab-tile-symbol">{elSymbol ? (elSymbol.charAt(0).toUpperCase() + elSymbol.slice(1, 2).toLowerCase()) : '??'}</span>
          <span className="el-lab-tile-name">{elName || 'Your Element'}</span>
        </div>

        <div className="el-lab-form">
          <label className="el-lab-field">
            <span>Element Name</span>
            <input type="text" value={elName} onChange={e => setElName(e.target.value)} placeholder="e.g. Blazium" maxLength={20} />
          </label>

          <label className="el-lab-field">
            <span>Symbol (1-2 letters)</span>
            <input type="text" value={elSymbol} onChange={e => setElSymbol(e.target.value.replace(/[^a-zA-Z]/g, ''))} placeholder="e.g. Bz" maxLength={2} />
          </label>

          <label className="el-lab-field">
            <span>Category</span>
            <div className="el-lab-categories">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  className={`el-lab-cat-btn ${elCategory === cat.value ? 'selected' : ''}`}
                  onClick={() => setElCategory(cat.value)}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </label>

          <label className="el-lab-field">
            <span>State at Room Temperature</span>
            <div className="el-lab-states">
              {STATES.map(s => (
                <button
                  key={s}
                  className={`el-lab-state-btn ${elState === s ? 'selected' : ''}`}
                  onClick={() => setElState(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </label>

          <label className="el-lab-field">
            <span>Colour</span>
            <div className="el-lab-colors">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`el-lab-color-btn ${elColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setElColor(c)}
                />
              ))}
            </div>
          </label>

          <label className="el-lab-field">
            <span>Superpower</span>
            <div className="el-lab-superpower-row">
              <input type="text" value={elSuperpower} onChange={e => setElSuperpower(e.target.value)} maxLength={80} />
              <button className="el-lab-reroll" onClick={() => { setElSuperpower(randomSuperpower()); playCorrect(); }} title="Random superpower">&#127922;</button>
            </div>
          </label>

          <label className="el-lab-field">
            <span>Fun Fact (optional)</span>
            <input type="text" value={elFunFact} onChange={e => setElFunFact(e.target.value)} placeholder="Something cool about your element..." maxLength={120} />
          </label>

          <button
            className="start-btn"
            onClick={handleCreate}
            disabled={!elName.trim() || !elSymbol.trim()}
          >
            Create Element!
          </button>
        </div>
      </div>
    );
  }

  // --- Gallery ---
  return (
    <div className="el-lab">
      <button className="back-btn" onClick={onBack}>&larr; Back</button>
      <h2 className="el-lab-title">&#129514; Element Lab</h2>
      <Elementor expression="greeting" message={customElements.length ? `You've created ${customElements.length} element${customElements.length > 1 ? 's' : ''}! Tap one to see details, or create a new one!` : 'Welcome to the Element Lab! Create your very own elements and add them to the periodic table!'} />

      <button className="start-btn el-lab-create-btn" onClick={() => { resetForm(); setPhase('creator'); }}>
        + Create New Element
      </button>

      {customElements.length > 0 && (
        <div className="el-lab-gallery">
          {customElements.map(el => (
            <button
              key={el.id}
              className="el-lab-gallery-tile"
              style={{ background: el.color }}
              onClick={() => setSelectedEl(el)}
            >
              <span className="el-lab-tile-number">{el.atomicNumber}</span>
              <span className="el-lab-tile-symbol">{el.symbol}</span>
              <span className="el-lab-tile-name">{el.name}</span>
            </button>
          ))}
        </div>
      )}

      {customElements.length === 0 && (
        <p className="el-lab-empty">No custom elements yet. Tap "Create New Element" to get started!</p>
      )}
    </div>
  );
}
