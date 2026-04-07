import { useMemo, useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import CollectionTable from '../components/CollectionTable.tsx';
import { getRank, getNextRank, getUnlockedMilestones, MILESTONES } from '../engine/scoring.ts';
import { speakText } from '../engine/tts.ts';
import type { PlayerProgress } from '../engine/storage.ts';

const ELEMENTOR_TIPS = [
  "Did you know? Hydrogen makes up 75% of all matter in the universe!",
  "Try a Deep Dive to become an expert on your favourite element!",
  "The periodic table was created by Dmitri Mendeleev in 1869!",
  "Gold is so soft you can mould it with your hands!",
  "Diamond and pencil lead are both made of carbon — just arranged differently!",
  "Your body is about 65% oxygen by weight!",
  "Mercury is the only metal that's liquid at room temperature!",
  "Neon signs glow orange-red — other colours use different gases!",
  "Titanium is as strong as steel but 45% lighter!",
  "Silver is the best conductor of electricity of all elements!",
  "Challenge a friend in 2 Player Mode — who knows more elements?",
  "Explore the Periodic Table to discover elements you haven't collected yet!",
  "Keep your streak going for bonus Element Points!",
  "The Sun is mostly hydrogen — it fuses atoms to make light!",
  "Gallium melts at 29.76°C — you could melt it in your hand!",
];

interface HomeScreenProps {
  progress: PlayerProgress;
  playerName: string;
  onNavigate: (screen: string) => void;
  onSwitchProfile: () => void;
}

export default function HomeScreen({ progress, playerName, onNavigate, onSwitchProfile }: HomeScreenProps) {
  const rank = getRank(progress.totalEP);
  const nextRank = getNextRank(progress.totalEP);
  const progressPct = nextRank
    ? ((progress.totalEP - rank.minEP) / (nextRank.minEP - rank.minEP)) * 100
    : 100;

  const tip = useMemo(() => ELEMENTOR_TIPS[Math.floor(Math.random() * ELEMENTOR_TIPS.length)], []);
  const unlocked = useMemo(() => getUnlockedMilestones(progress), [progress]);
  const [showCollection, setShowCollection] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

  return (
    <div className="home-screen">
      <div className="home-header">
        <h1 className="game-title">
          <span className="title-element">E</span>lemental
          <span className="title-element">Q</span>uiz
        </h1>
        <Elementor
          expression="greeting"
          message={tip}
          className="elementor-wobble"
        />
        <button className="tts-btn tts-btn-small" onClick={() => speakText(tip)} title="Read aloud">🔊</button>
      </div>

      <div className="home-stats">
        <div className="player-header">
          <span className="player-greeting">Hi, {playerName}!</span>
          <button className="switch-profile-btn" onClick={onSwitchProfile} title="Switch player">
            👤 Switch
          </button>
        </div>
        <div className="rank-display">
          <span className="rank-icon">{rank.icon}</span>
          <span className="rank-name">{rank.name}</span>
        </div>
        <div className="ep-display">
          <span className="ep-amount">{progress.totalEP} EP</span>
          {nextRank && (
            <div className="ep-progress">
              <div className="ep-bar" style={{ width: `${progressPct}%` }} />
              <span className="ep-next">{nextRank.minEP - progress.totalEP} EP to {nextRank.icon} {nextRank.name}</span>
            </div>
          )}
        </div>
        <div className="home-ministat">
          <button className="ministat-btn" onClick={() => setShowCollection(v => !v)}>
            🧪 {progress.elementsCollected.length}/118 collected
          </button>
          <span>🔥 Best streak: {progress.bestStreak}</span>
          <button className="ministat-btn" onClick={() => setShowMilestones(v => !v)}>
            🏅 {unlocked.length}/{MILESTONES.length} milestones
          </button>
        </div>

        {showCollection && (
          <CollectionTable collectedElements={progress.elementsCollected} />
        )}

        {showMilestones && (
          <div className="milestones-panel">
            {MILESTONES.map(m => {
              const done = unlocked.some(u => u.id === m.id);
              return (
                <div key={m.id} className={`milestone ${done ? 'milestone-done' : 'milestone-locked'}`}>
                  <span className="milestone-icon">{done ? m.icon : '🔒'}</span>
                  <div className="milestone-info">
                    <span className="milestone-title">{m.title}</span>
                    <span className="milestone-desc">{m.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <nav className="home-menu">
        <button className="menu-btn primary" onClick={() => onNavigate('quick-quiz')}>
          <span className="menu-icon">⚡</span>
          <span className="menu-label">Quick Quiz</span>
          <span className="menu-desc">10 questions, pick your level</span>
        </button>

        <button className="menu-btn" onClick={() => onNavigate('sprint')}>
          <span className="menu-icon">⏱️</span>
          <span className="menu-label">Element Sprint</span>
          <span className="menu-desc">Race against the clock!</span>
        </button>

        <button className="menu-btn" onClick={() => onNavigate('deep-dive')}>
          <span className="menu-icon">🔬</span>
          <span className="menu-label">Element Deep Dive</span>
          <span className="menu-desc">Master one element at a time</span>
        </button>

        <button className="menu-btn two-player" onClick={() => onNavigate('two-player')}>
          <span className="menu-icon">👥</span>
          <span className="menu-label">2 Player Mode</span>
          <span className="menu-desc">Challenge a friend or family!</span>
        </button>

        <button className="menu-btn" onClick={() => onNavigate('which-is-bigger')}>
          <span className="menu-icon">💥</span>
          <span className="menu-label">Element Showdown</span>
          <span className="menu-desc">Which element wins? Heaviest, priciest, scariest!</span>
        </button>

        <button className="menu-btn" onClick={() => onNavigate('explore')}>
          <span className="menu-icon">🔍</span>
          <span className="menu-label">Periodic Table</span>
          <span className="menu-desc">Explore & learn about elements</span>
        </button>
      </nav>
    </div>
  );
}
