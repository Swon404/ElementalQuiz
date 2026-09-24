import { useEffect, useRef, useState } from 'react';
import { generateFamilyRounds, FAMILY_SINGULAR, FAMILY_SIZES, FAMILY_TIME_LIMITS, isFamilyAnswerCorrect } from '../games/familyFinder.ts';
import { DIFFICULTY_CONFIG, type Difficulty } from '../engine/scoring.ts';
import { buildGameConfigKey, recordCompletedGameResult } from '../engine/gameResults.ts';
import { useRewind } from '../engine/useRewind.ts';
import RewindButton from '../components/RewindButton.tsx';

type Player = { id: string; name: string; difficulty: Difficulty; bot?: boolean };
type Props = {
  onBack: () => void; playerId: string; playerName: string;
  championshipDifficulty?: Difficulty; championshipRoundCount?: number; championshipRunId?: string;
  players?: Player[]; onFinish?: (scores: number[]) => void;
  timed?: boolean;
  championshipScores?: { playerOne: number; playerTwo: number };
};
export default function FamilyFinderScreen(props: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('explorer');
  const [timedChoice, setTimedChoice] = useState(false);
  const [session, setSession] = useState<ReturnType<typeof generateFamilyRounds>>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number[] | null)[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const timed = props.timed ?? timedChoice;
  const [remaining, setRemaining] = useState(FAMILY_TIME_LIMITS.explorer);
  const undo = useRewind(index);
  const [done, setDone] = useState(false);
  const saved = useRef(false);
  const players = props.players ?? [{ id: props.playerId, name: props.playerName, difficulty: props.championshipDifficulty ?? difficulty }];
  const count = props.championshipRoundCount ?? 10;
  const playerIndex = index % players.length;
  const player = players[playerIndex];
  const playerDisplayName = player.bot ? 'Elementor' : player.name;
  const round = session[index];
  const checked = answers[index] != null;
  const scores = players.map((_, p) => session.reduce((sum, q, i) => sum + (i % players.length === p && answers[i] != null && isFamilyAnswerCorrect(q, answers[i]!) ? 1 : 0), 0));
  const start = () => {
    const banks = players.map(p => generateFamilyRounds(count, p.difficulty));
    setSession(Array.from({ length: count * players.length }, (_, i) => banks[i % players.length][Math.floor(i / players.length)]));
    setAnswers([]); setSelected([]); undo.clear(); setIndex(0); setDone(false); saved.current = false;
  };
  const submit = (selection = selected) => {
    if (checked || !selection.length) return;
    if (!player.bot) undo.mark(() => {
      setAnswers(current => { const next = [...current]; next[index] = null; return next; });
      setSelected(selection);
    });
    setAnswers(current => { const next = [...current]; next[index] = [...selection]; return next; });
  };
  const timeout = () => {
    if (checked || !timed || player.bot) return;
    undo.mark(() => {
      setAnswers(current => { const next = [...current]; next[index] = null; return next; });
      setSelected([]);
    });
    setAnswers(current => { const next = [...current]; next[index] = []; return next; });
    setSelected([]);
  };
  useEffect(() => {
    if (!timed || !round || checked || done || player.bot) return;
    setRemaining(FAMILY_TIME_LIMITS[player.difficulty]);
    const timer = setInterval(() => {
      setRemaining(value => {
        if (value <= 1) { clearInterval(timer); timeout(); return 0; }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timed, round, checked, done, index, player.bot, player.difficulty]);
  const toggle = (number: number) => {
    if (checked || player.bot) return;
    undo.mark(() => setSelected(selected));
    setSelected(current => current.includes(number) ? [] : [number]);
  };
  useEffect(() => {
    if (!player.bot || !round || done || checked) return;
    const timer = setTimeout(() => {
      const candidates = Math.random() < 0.75 ? round.answers : round.tiles;
      const selection = [candidates[Math.floor(Math.random() * candidates.length)].atomicNumber];
      setSelected(selection); submit(selection);
    }, 1500);
    return () => clearTimeout(timer);
  }, [player.bot, round, done, checked, index]);
  const advance = () => {
    if (!checked) return;
    undo.clear();
    if (index + 1 < session.length) { setIndex(index + 1); setSelected([]); return; }
    if (saved.current) return;
    saved.current = true;
    players.forEach((p, i) => recordCompletedGameResult({
      rulesVersion: 4, gameId: 'family-finder', variantId: timed ? 'timed' : 'classic',
      configKey: buildGameConfigKey('family-finder', timed ? 'timed' : 'classic', { difficulty: p.difficulty, rounds: count, tiles: FAMILY_SIZES[p.difficulty] ** 2, layout: 'consecutive-square', selection: 'one', timeLimit: timed ? FAMILY_TIME_LIMITS[p.difficulty] : null }),
      format: players.length === 1 ? 'solo' : players.some(p => p.bot) ? 'versus-bot' : 'versus-human',
      participant: { id: p.id, name: p.bot ? 'Elementor' : p.name, kind: p.bot ? 'bot' : p.id.startsWith('guest:') ? 'guest' : 'profile' },
      championshipRunId: props.championshipRunId,
      metrics: { score: scores[i], correct: scores[i], total: count, normalizedScore: Math.round(scores[i] / count * 100) },
    }));
    setDone(true);
  };
  if (!session.length) return <div className="quiz-setup">
    <button className="back-btn" onClick={props.onBack}>← Back</button><h2>Family Finder</h2>
    <p>Find an element from the family named in the question. Tap one tile, then check your answer.</p>
    {!props.championshipDifficulty && !props.players && <div className="difficulty-select">{(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => <button className={`diff-btn ${d === difficulty ? 'selected' : ''}`} key={d} onClick={() => setDifficulty(d)}>{DIFFICULTY_CONFIG[d].label}</button>)}</div>}
    {!props.timed && !props.players && !props.championshipDifficulty && <div className="round-select"><span>Mode:</span><button className={`round-btn ${!timedChoice ? 'selected' : ''}`} onClick={() => setTimedChoice(false)}>Standard</button><button className={`round-btn ${timedChoice ? 'selected' : ''}`} onClick={() => setTimedChoice(true)}>Timed · {FAMILY_TIME_LIMITS[difficulty]}s</button></div>}
    <button className="start-btn" onClick={start}>Start!</button>
  </div>;
  if (done) return <div className="quiz-result"><h2>Family Finder Complete!</h2>{players.map((p, i) => <p key={p.id}>{p.bot ? 'Elementor' : p.name}: {scores[i]}/{count}</p>)}<button className="start-btn" onClick={() => props.onFinish ? props.onFinish(scores) : props.onBack()}>{props.championshipRunId ? 'Continue Championship →' : 'Continue →'}</button></div>;
  return <div className="quiz-setup">
    <button className="back-btn" onClick={props.onBack}>← Back</button>
    {props.championshipScores && <div className="champ-live-total"><span>{players[0]?.name}: <strong>{props.championshipScores.playerOne}</strong></span><span>{players[1]?.bot ? 'Elementor' : players[1]?.name}: <strong>{props.championshipScores.playerTwo}</strong></span></div>}
    <p>{playerDisplayName} · Round {Math.floor(index / players.length) + 1}/{count} · {scores[playerIndex]} points {timed && !checked ? `· ${remaining}s` : ''}</p>
    <h2>{round.prompt}</h2>
    <p>Atomic numbers {round.tiles[0].atomicNumber}–{round.tiles.at(-1)!.atomicNumber} · Choose one tile</p>
    <div aria-label="Element grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${round.size}, minmax(0, 1fr))`, gap: 4, width: '100%', maxWidth: 480, margin: '16px auto' }}>
      {round.tiles.map(el => <button key={el.atomicNumber}
        aria-label={`${el.name}, ${el.symbol}, atomic number ${el.atomicNumber}`}
        aria-pressed={selected.includes(el.atomicNumber)} disabled={checked || player.bot}
        onClick={() => toggle(el.atomicNumber)}
        style={{ aspectRatio: '1', position: 'relative', background: selected.includes(el.atomicNumber) ? '#242424' : '#f4f4f4', color: selected.includes(el.atomicNumber) ? '#fff' : '#222', border: selected.includes(el.atomicNumber) ? '3px solid #fff' : '3px solid #888', boxShadow: selected.includes(el.atomicNumber) ? '0 0 0 2px #242424, inset 0 0 0 1px #242424' : 'none', borderRadius: 4, padding: '14px 1px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <small style={{ position: 'absolute', top: 2, left: 4, fontSize: 11 }}>{el.atomicNumber}</small>
        {selected.includes(el.atomicNumber) && <span aria-hidden="true" style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', color: '#111', fontSize: 16, fontWeight: 900, display: 'grid', placeItems: 'center', lineHeight: 1 }}>✓</span>}
        <strong style={{ fontSize: 'clamp(20px, 5vw, 34px)', lineHeight: 1.1 }}>{el.symbol}</strong>
        <span style={{ fontSize: 'clamp(9px, 2.4vw, 13px)' }}>{el.name}</span>
        <small style={{ fontSize: 10 }}>{el.atomicMass}</small>
      </button>)}
    </div>
    {!checked && <><p>{selected.length} selected</p><button className="start-btn" disabled={!selected.length || player.bot} onClick={() => submit()}>Check answer</button></>}
    {checked && <div role="status">
      <p><strong>{answers[index]!.length === 0 ? "Time's up." : isFamilyAnswerCorrect(round, answers[index]!) ? 'Correct!' : 'Not quite.'}</strong></p>
      <p>{(round.answers.find(el => el.atomicNumber === answers[index]![0]) ?? round.answers[0]).name} is {FAMILY_SINGULAR[round.category]}.</p>
      <button className="start-btn" onClick={advance}>{index + 1 === session.length ? 'Finish' : 'Next →'}</button>
    </div>}
    {!player.bot && <RewindButton enabled={undo.canRewind} onRewind={undo.rewind} />}
  </div>;
}
