import { useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import { getRank } from '../engine/scoring.ts';
import type { PlayerProfile } from '../engine/storage.ts';

interface ProfileScreenProps {
  profiles: PlayerProfile[];
  activeId: string | null;
  isModal?: boolean;
  onSelect: (profile: PlayerProfile) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
  onClose?: () => void;
}

export default function ProfileScreen({ profiles, activeId, isModal, onSelect, onCreate, onDelete, onReset, onClose }: ProfileScreenProps) {
  const [showCreate, setShowCreate] = useState(profiles.length === 0);
  const [newName, setNewName] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'delete' | 'reset' } | null>(null);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (trimmed.length === 0 || trimmed.length > 20) return;
    onCreate(trimmed);
    setNewName('');
    setShowCreate(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  const content = (
    <>
      {!isModal && (
        <h1 className="game-title">
          <span className="title-element">E</span>lemental
          <span className="title-element">Q</span>uiz
        </h1>
      )}

      <Elementor
        expression="greeting"
        message={profiles.length === 0
          ? "Welcome! Enter your name to get started!"
          : "Who's playing today?"
        }
        className="elementor-wobble"
        size={isModal ? 60 : undefined}
      />

      {profiles.length > 0 && (
        <div className="profile-list">
          <h2>Choose Player</h2>
          {profiles.map(p => {
            const rank = getRank(p.progress.totalEP);
            const isActive = p.id === activeId;
            const isConfirming = confirmAction?.id === p.id;
            return (
              <div
                key={p.id}
                className={`profile-card ${isActive ? 'active' : ''}`}
                onClick={() => !isConfirming && onSelect(p)}
              >
                <div className="profile-info">
                  <span className="profile-name">
                    {p.name}
                    {isActive && <span className="profile-active-badge">Playing</span>}
                  </span>
                  <span className="profile-stats">
                    {rank.icon} {rank.name} · {p.progress.totalEP} EP · {p.progress.elementsCollected.length}/118 🧪
                  </span>
                </div>
                {isConfirming ? (
                  <div className="profile-confirm-action" onClick={e => e.stopPropagation()}>
                    <span>{confirmAction.action === 'delete' ? 'Delete?' : 'Reset progress?'}</span>
                    <button
                      className="confirm-yes"
                      onClick={() => {
                        if (confirmAction.action === 'delete') onDelete(p.id);
                        else onReset(p.id);
                        setConfirmAction(null);
                      }}
                    >
                      Yes
                    </button>
                    <button
                      className="confirm-no"
                      onClick={() => setConfirmAction(null)}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="profile-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="profile-action-btn reset"
                      onClick={() => setConfirmAction({ id: p.id, action: 'reset' })}
                      title="Reset progress"
                    >
                      🔄
                    </button>
                    <button
                      className="profile-action-btn delete"
                      onClick={() => setConfirmAction({ id: p.id, action: 'delete' })}
                      title="Delete player"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate ? (
        <div className="profile-create">
          <input
            className="profile-name-input"
            type="text"
            placeholder="Enter your name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={20}
            autoFocus
          />
          <div className="profile-create-actions">
            <button
              className="start-btn"
              onClick={handleCreate}
              disabled={newName.trim().length === 0}
            >
              Let's Go!
            </button>
            {profiles.length > 0 && (
              <button className="back-btn" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button className="menu-btn new-player-btn" onClick={() => setShowCreate(true)}>
          <span className="menu-icon">➕</span>
          <span className="menu-label">New Player</span>
        </button>
      )}
    </>
  );

  if (isModal) {
    return (
      <div className="profile-modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={e => e.stopPropagation()}>
          <button className="profile-modal-close" onClick={onClose}>✕</button>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      {content}
    </div>
  );
}
