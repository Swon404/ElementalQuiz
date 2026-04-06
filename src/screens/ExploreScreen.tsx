import { useState } from 'react';
import PeriodicTable from '../components/PeriodicTable.tsx';
import ElementInfo from '../components/ElementInfo.tsx';
import type { PlayerProgress } from '../engine/storage.ts';

interface ExploreScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
}

export default function ExploreScreen({ progress, onBack }: ExploreScreenProps) {
  const [selectedElement, setSelectedElement] = useState<number | null>(null);

  return (
    <div className="explore-screen">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 className="explore-title">🔍 Periodic Table Explorer</h2>
      <p className="explore-subtitle">Tap any element to learn about it!</p>

      <PeriodicTable
        collectedElements={progress.elementsCollected}
        onElementClick={setSelectedElement}
      />

      {selectedElement && (
        <ElementInfo
          atomicNumber={selectedElement}
          onClose={() => setSelectedElement(null)}
        />
      )}
    </div>
  );
}
