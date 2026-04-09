import { useState } from 'react';
import PeriodicTable from '../components/PeriodicTable.tsx';
import ElementInfo from '../components/ElementInfo.tsx';
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

      {selectedCustom && (
        <div className="element-info-overlay" onClick={() => setSelectedCustom(null)}>
          <div className="element-info-card" onClick={e => e.stopPropagation()}>
            <button className="ei-close" onClick={() => setSelectedCustom(null)}>✕</button>
            <div className="ei-header" style={{ background: selectedCustom.color }}>
              <span className="ei-number">{selectedCustom.atomicNumber}</span>
              <span className="ei-symbol">{selectedCustom.symbol}</span>
              <span className="ei-name">{selectedCustom.name}</span>
              <span className="ei-category">⭐ Custom Element</span>
            </div>
            <div className="ei-details">
              <div className="ei-row"><span className="ei-label">Category</span><span>{selectedCustom.category}</span></div>
              <div className="ei-row"><span className="ei-label">State</span><span>{selectedCustom.stateAtRoomTemp}</span></div>
              <div className="ei-row"><span className="ei-label">Superpower</span><span>{selectedCustom.superpower}</span></div>
              <div className="ei-row"><span className="ei-label">Discovered By</span><span>{selectedCustom.discoveredBy}</span></div>
              {selectedCustom.funFact && (
                <div className="ei-fun-fact"><strong>Fun Fact:</strong> {selectedCustom.funFact}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
