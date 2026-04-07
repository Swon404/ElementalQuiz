let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playCorrect() {
  playTone(523, 0.12, 'sine', 0.12);   // C5
  setTimeout(() => playTone(659, 0.12, 'sine', 0.12), 80);  // E5
  setTimeout(() => playTone(784, 0.2, 'sine', 0.15), 160);  // G5
}

export function playWrong() {
  playTone(200, 0.25, 'square', 0.08);
  setTimeout(() => playTone(160, 0.3, 'square', 0.06), 150);
}

export function playRankUp() {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.12), i * 120);
  });
}

export function playClick() {
  playTone(800, 0.05, 'sine', 0.06);
}

export function playStreak() {
  playTone(880, 0.1, 'sine', 0.1);  // A5
  setTimeout(() => playTone(1047, 0.15, 'sine', 0.12), 60); // C6
}

export function playCollect() {
  playTone(660, 0.1, 'triangle', 0.1);
  setTimeout(() => playTone(880, 0.15, 'triangle', 0.12), 80);
  setTimeout(() => playTone(1100, 0.2, 'triangle', 0.1), 160);
}
