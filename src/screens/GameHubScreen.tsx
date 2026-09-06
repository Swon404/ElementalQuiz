import { useState } from 'react';
import Elementor from '../components/Elementor.tsx';
import { GAME_LIST, PLAYER_FORMATS, type GameId, type PlayerFormat } from '../games/catalog.ts';

interface GameHubScreenProps {
  onBack: () => void;
  onLaunchGame: (gameId: GameId, format: PlayerFormat) => void;
  onLaunchChampionship: (format: PlayerFormat) => void;
  onLaunchQuizVariant: (variant: 'sprint' | 'showdown') => void;
}

export default function GameHubScreen({ onBack, onLaunchGame, onLaunchChampionship, onLaunchQuizVariant }: GameHubScreenProps) {
  const [format, setFormat] = useState<PlayerFormat>('versus-human');
  const formatChoices: Array<{ id: PlayerFormat; icon: string; title: string; description: string }> = [
    { id: 'versus-human', icon: '👥', title: '2 Players', description: 'The classic pass-and-play experience.' },
    { id: 'versus-bot', icon: '🤖', title: 'Player vs Bot', description: 'Play the same games against Bot Blaze.' },
    { id: 'solo', icon: '🧑‍🔬', title: 'Solo', description: 'Play alone and chase leaderboard scores.' },
  ];
  const selectedFormat = PLAYER_FORMATS.find(option => option.id === format)?.label;

  return (
    <div className="two-player-setup play-mode-hub">
      <button className="back-btn" onClick={onBack}>← Home</button>
      <h2 className="setup-title">👥 Play Games</h2>
      <Elementor expression="greeting" message="Pick who is playing, then choose a game — just like the classic 2 Player mode!" />

      <div className="play-format-picker" role="group" aria-label="Who is playing?">
        {formatChoices.map(option => (
          <button key={option.id} className={`play-format-card ${format === option.id ? 'selected' : ''}`} onClick={() => setFormat(option.id)} aria-pressed={format === option.id}>
            <span className="play-format-icon">{option.icon}</span>
            <span className="play-format-title">{option.title}</span>
            <span className="play-format-description">{option.description}</span>
          </button>
        ))}
      </div>

      <div className="play-selection-heading">
        <h3>Choose a game</h3>
        <span className="champ-option-status">{selectedFormat}</span>
      </div>
      <div className="game-mode-grid">
        <button className="game-mode-btn championship" onClick={() => onLaunchChampionship(format)}>
          <span className="gm-icon">🏆</span>
          <span className="gm-name">Championship</span>
          <span className="gm-desc">Choose your games and compete across a full series.</span>
        </button>
        {GAME_LIST.map(game => (
          <button key={game.id} className="game-mode-btn" onClick={() => onLaunchGame(game.id, format)}>
            <span className="gm-icon">{game.icon}</span>
            <span className="gm-name">{game.label}</span>
            <span className="gm-desc">{game.description}</span>
          </button>
        ))}
      </div>

      {format === 'solo' && (
        <section className="champ-options-group">
          <div className="champ-options-heading">
            <div><strong>⚔️ More Quiz Battle modes</strong><span>The original Solo quiz modes remain available here.</span></div>
            <span className="champ-option-status">Solo</span>
          </div>
          <div className="round-select">
            <button className="round-btn" onClick={() => onLaunchQuizVariant('sprint')}>⏱️ Sprint</button>
            <button className="round-btn" onClick={() => onLaunchQuizVariant('showdown')}>💥 Showdown</button>
          </div>
        </section>
      )}
    </div>
  );
}
