import { useState } from 'react';
import PeriodicTable from '../components/PeriodicTable.tsx';
import ElementInfo from '../components/ElementInfo.tsx';
import AtomModel from '../components/AtomModel.tsx';
import { speakText, stopSpeaking } from '../engine/tts.ts';
import type { PlayerProgress, CustomElement } from '../engine/storage.ts';

interface ExploreScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
}

export default function ExploreScreen({ progress, onBack }: ExploreScreenProps) {
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [selectedCustom, setSelectedCustom] = useState<CustomElement | null>(null);

  return (
    <div className="explore-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="explore-title">🔍 Periodic Table Explorer</h2>
      <p className="explore-subtitle">Tap any element to learn about it!</p>

      <PeriodicTable
        collectedElements={progress.elementsCollected}
        onElementClick={setSelectedElement}
        onCustomElementClick={setSelectedCustom}
      />

      {selectedElement && (
        <ElementInfo
          atomicNumber={selectedElement}
          onClose={() => setSelectedElement(null)}
        />
      )}

      {selectedCustom && (() => {
        const el = selectedCustom;
        const discoveryDate = el.createdAt ? new Date(el.createdAt).toLocaleDateString() : 'Unknown';
        const buildSummary = () => {
          let t = `${el.name}. Element number ${el.atomicNumber}, symbol ${el.symbol}. `;
          t += `Category: ${el.category}. State: ${el.stateAtRoomTemp}. `;
          t += `Superpower: ${el.superpower}. `;
          t += el.funFact;
          return t;
        };
        const handleClose = () => { stopSpeaking(); setSelectedCustom(null); };
        return (
          <div className="element-info-overlay" onClick={handleClose}>
            <div className="element-info-card" onClick={e => e.stopPropagation()} style={{ borderColor: el.color }}>
              <button className="close-btn" onClick={handleClose}>×</button>

              <div className="ei-header" style={{ backgroundColor: el.color }}>
                <span className="ei-number">{el.atomicNumber}</span>
                <span className="ei-symbol">{el.symbol}</span>
                <span className="ei-name">{el.name}</span>
                {el.atomicMass && <span className="ei-mass">{el.atomicMass}</span>}
                <button className="tts-btn tts-header-btn" onClick={() => speakText(buildSummary())} title="Read aloud">🔊</button>
              </div>

              <div className="atom-model-container">
                <AtomModel atomicNumber={el.atomicNumber} symbol={el.symbol} size={180} />
                <p className="atom-model-label">Bohr Model — {el.atomicNumber} electron{el.atomicNumber !== 1 ? 's' : ''}</p>
              </div>

              <div className="ei-body">
                <div className="ei-row"><span className="ei-label">Category</span><span className="ei-value">⭐ {el.category}</span></div>
                <div className="ei-row"><span className="ei-label">State (Room Temp)</span><span className="ei-value">{el.stateAtRoomTemp}</span></div>
                {el.period && <div className="ei-row"><span className="ei-label">Period</span><span className="ei-value">{el.period}</span></div>}
                {el.group && <div className="ei-row"><span className="ei-label">Group</span><span className="ei-value">{el.group}</span></div>}
                {el.block && <div className="ei-row"><span className="ei-label">Block</span><span className="ei-value">{el.block}</span></div>}
                {el.electronConfiguration && <div className="ei-row"><span className="ei-label">Electron Config</span><span className="ei-value">{el.electronConfiguration}</span></div>}
                <div className="ei-row"><span className="ei-label">Superpower</span><span className="ei-value">{el.superpower}</span></div>
                {el.radioactive !== undefined && (
                  <div className="ei-row"><span className="ei-label">Radioactive</span><span className="ei-value">{el.radioactive ? `Yes (half-life: ${el.halfLife})` : 'No'}</span></div>
                )}
                <div className="ei-row"><span className="ei-label">Discovered By</span><span className="ei-value">{el.discoveredBy}</span></div>
                <div className="ei-row"><span className="ei-label">Date Discovered</span><span className="ei-value">{discoveryDate}</span></div>

                {el.compounds && el.compounds.length > 0 && (
                  <div className="ei-row"><span className="ei-label">Common Compounds</span><span className="ei-value">{el.compounds.join(', ')}</span></div>
                )}

                {el.uses && el.uses.length > 0 && (
                  <div className="ei-section">
                    <span className="ei-label">Uses</span>
                    <ul className="ei-list">{el.uses.map((u, i) => <li key={i}>{u}</li>)}</ul>
                  </div>
                )}

                {el.obtainedFrom && (
                  <div className="ei-section">
                    <span className="ei-label">How It's Obtained</span>
                    <p className="ei-text">{el.obtainedFrom}</p>
                  </div>
                )}

                <div className="ei-funfact">
                  <span className="ei-label">Fun Fact <button className="tts-btn tts-btn-small" onClick={() => speakText(el.funFact)} title="Read aloud">🔊</button></span>
                  <p>{el.funFact}</p>
                </div>

                {el.additionalFacts && el.additionalFacts.length > 0 && (
                  <div className="ei-section">
                    <span className="ei-label">More Facts</span>
                    <ul className="ei-list">{el.additionalFacts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
