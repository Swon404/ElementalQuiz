import { useMemo, useState } from 'react';
import { GAME_CATALOG, type GameId, type PlayerFormat } from '../games/catalog.ts';
import {
  getChampionshipLeaderboard,
  getCompletedChampionshipResults,
  getCompletedGameResults,
  getGameLeaderboard,
  keepOnlyTopChampionshipResults,
  keepOnlyTopGameResults,
  type ChampionshipLeaderboardEntry,
  type LeaderboardEntry,
} from '../engine/gameResults.ts';
import { keepOnlyTopLegacyTimes, type AtomicOrderLevel } from '../engine/storage.ts';
import { AtomicOrderReplayViewer, replayData, type AtomicOrderReplaySelection } from './ElementOrderScreen.tsx';
import { ElementMatchReplayViewer, elementMatchReplayData, type ElementMatchReplaySelection } from './SoloElementMatchScreen.tsx';

interface HighScoresScreenProps { onBack: () => void }

type GameBoard = {
  key: string;
  gameId: GameId;
  variantId: string;
  configKey: string;
  format: PlayerFormat;
  entries: LeaderboardEntry[];
};

type ChampionshipBoard = { key: string; combinationKey: string; format: PlayerFormat; entries: ChampionshipLeaderboardEntry[] };

const FORMAT_LABELS: Record<PlayerFormat, string> = { solo: 'Solo', 'versus-human': '2 Players', 'versus-bot': 'Play Elementor' };

function configFromKey(key: string): Record<string, unknown> {
  try {
    const start = key.indexOf('{');
    return start >= 0 ? JSON.parse(key.slice(start)) as Record<string, unknown> : {};
  } catch { return {}; }
}

function optionSummary(configKey: string): string {
  const config = configFromKey(configKey);
  return Object.entries(config)
    .filter(([, value]) => value !== null && value !== false)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase())}: ${value === true ? 'On' : String(value)}`)
    .join(' · ');
}

function loadGameBoards(): GameBoard[] {
  const groups = new Map<string, Omit<GameBoard, 'entries'>>();
  for (const result of getCompletedGameResults()) {
    const key = `${result.gameId}\u0000${result.variantId}\u0000${result.configKey}\u0000${result.format}`;
    groups.set(key, { key, gameId: result.gameId, variantId: result.variantId, configKey: result.configKey, format: result.format });
  }
  return [...groups.values()]
    .map(group => ({ ...group, entries: getGameLeaderboard(group.gameId, group.variantId, group.configKey, group.format) }))
    .sort((a, b) => GAME_CATALOG[a.gameId].label.localeCompare(GAME_CATALOG[b.gameId].label) || FORMAT_LABELS[a.format].localeCompare(FORMAT_LABELS[b.format]));
}

function loadChampionshipBoards(): ChampionshipBoard[] {
  const groups = new Map<string, Omit<ChampionshipBoard, 'entries'>>();
  for (const result of getCompletedChampionshipResults()) {
    const key = `${result.combinationKey}\u0000${result.format}`;
    groups.set(key, { key, combinationKey: result.combinationKey, format: result.format });
  }
  return [...groups.values()].map(group => ({ ...group, entries: getChampionshipLeaderboard(group.combinationKey) }));
}

export default function HighScoresScreen({ onBack }: HighScoresScreenProps) {
  const [revision, setRevision] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState('');
  const [atomicReplay, setAtomicReplay] = useState<{ selection: AtomicOrderReplaySelection; challenge: AtomicOrderLevel } | null>(null);
  const [huntReplay, setHuntReplay] = useState<ElementMatchReplaySelection | null>(null);
  const gameBoards = useMemo(loadGameBoards, [revision]);
  const championshipBoards = useMemo(loadChampionshipBoards, [revision]);

  if (atomicReplay) return <AtomicOrderReplayViewer selection={atomicReplay.selection} challenge={atomicReplay.challenge} onClose={() => setAtomicReplay(null)} />;
  if (huntReplay) return <ElementMatchReplayViewer selection={huntReplay} onClose={() => setHuntReplay(null)} />;

  const keepOnlyNumberOnes = () => {
    if (!confirmClear) { setConfirmClear(true); setMessage('Press again to confirm. Every leaderboard will keep only its number-one score.'); return; }
    const removed = keepOnlyTopGameResults() + keepOnlyTopChampionshipResults() + keepOnlyTopLegacyTimes();
    setConfirmClear(false);
    setMessage(removed ? `Removed ${removed} lower score${removed === 1 ? '' : 's'}. Every number-one score was kept.` : 'Nothing to remove — only number-one scores remain.');
    setRevision(value => value + 1);
  };

  return <div className="high-scores-screen">
    <div className="high-scores-header"><button className="back-btn" onClick={onBack}>← Back to Games</button><div><h2>🏆 High Scores</h2><p>Every leaderboard, game setup and play format in one place.</p></div></div>
    <div className="high-scores-tools">
      <button className={confirmClear ? 'danger-btn' : 'back-btn'} onClick={keepOnlyNumberOnes}>{confirmClear ? 'Confirm: keep only #1' : 'Clear lower scores'}</button>
      {confirmClear && <button className="back-btn" onClick={() => { setConfirmClear(false); setMessage(''); }}>Cancel</button>}
      {message && <span role="status">{message}</span>}
    </div>

    {!gameBoards.length && !championshipBoards.length && <div className="result-card"><h3>No high scores yet</h3><p>Finish a game and its leaderboard will appear here.</p></div>}

    <div className="high-scores-grid">
      {gameBoards.map(board => <section className="high-score-board" key={board.key}>
        <div className="high-score-board-heading"><span className="gm-icon">{GAME_CATALOG[board.gameId].icon}</span><div><h3>{GAME_CATALOG[board.gameId].label}</h3><span>{FORMAT_LABELS[board.format]} · {board.variantId.replace(/-/g, ' ')}</span></div></div>
        <p className="high-score-options">{optionSummary(board.configKey) || 'Standard settings'}</p>
        <ol className="atomic-order-leaderboard-list">{board.entries.map(entry => {
          const atomic = replayData(entry);
          const hunt = elementMatchReplayData(entry);
          const config = configFromKey(board.configKey);
          return <li key={entry.id}><span><strong>{entry.rank}.</strong> {entry.participant.name}{entry.metrics.attempts !== undefined ? ` · ${entry.metrics.attempts} tries` : entry.metrics.moves !== undefined ? ` · ${entry.metrics.moves} moves` : entry.metrics.total !== undefined ? ` · ${entry.metrics.score}/${entry.metrics.total}` : ` · ${entry.metrics.score} pts`}</span><span>{entry.metrics.elapsedMs ? `${(entry.metrics.elapsedMs / 1000).toFixed(1)}s` : `${entry.metrics.score} pts`}{atomic && <button className="atomic-order-replay-btn" onClick={() => setAtomicReplay({ selection: { name: entry.participant.name, data: atomic, backLabel: 'Back to high scores' }, challenge: (config.challenge as AtomicOrderLevel) ?? 'easy' })}>▶ Replay</button>}{hunt && <button className="atomic-order-replay-btn" onClick={() => setHuntReplay({ name: entry.participant.name, data: hunt, backLabel: 'Back to high scores' })}>▶ Replay</button>}</span></li>;
        })}</ol>
      </section>)}

      {championshipBoards.map(board => <section className="high-score-board championship" key={board.key}>
        <div className="high-score-board-heading"><span className="gm-icon">🏆</span><div><h3>Championship</h3><span>{FORMAT_LABELS[board.format]}</span></div></div>
        <p className="high-score-options">{optionSummary(board.combinationKey)}</p>
        <ol className="atomic-order-leaderboard-list">{board.entries.map(entry => <li key={entry.id}><span><strong>{entry.rank}.</strong> {entry.participant.name} · {entry.gamesWon} wins</span><span>{entry.championshipPoints} pts</span></li>)}</ol>
      </section>)}
    </div>
  </div>;
}
