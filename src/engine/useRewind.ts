import { useRef, useState } from 'react';

/** One action only. A new question/round key invalidates the previous checkpoint. */
export function useRewind(stepKey: string | number) {
  const checkpoint = useRef<{ key: string | number; undo: (pausedMs: number) => void; at: number } | null>(null);
  const [, render] = useState(0);
  const clear = () => { checkpoint.current = null; render(n => n + 1); };
  const mark = (undo: (pausedMs: number) => void) => {
    checkpoint.current = { key: stepKey, undo, at: Date.now() };
    render(n => n + 1);
  };
  const rewind = () => {
    const saved = checkpoint.current;
    if (!saved || saved.key !== stepKey) return;
    clear();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    saved.undo(Date.now() - saved.at);
  };
  return { mark, clear, rewind, canRewind: checkpoint.current?.key === stepKey };
}
