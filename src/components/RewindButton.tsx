export default function RewindButton({ enabled, onRewind }: { enabled: boolean; onRewind: () => void }) {
  return <button type="button" className="back-btn" disabled={!enabled} onClick={onRewind} title="Undo the last action. Next locks it in.">↶ Rewind</button>;
}
