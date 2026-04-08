// Preferred voices in order (works across iOS Safari, Chrome, Edge)
const PREFERRED_VOICES = [
  'Google UK English Female',  // Chrome desktop
  'Karen',                     // iOS/macOS — Australian English, friendly tone
  'Samantha',                  // iOS/macOS — default female
  'Daniel',                    // iOS/macOS — British male
  'Microsoft Zira',            // Windows
  'Microsoft Hazel',           // Windows — British female
];

const VOICE_KEY = 'elementalquiz_voice';
const RATE_KEY = 'elementalquiz_voice_rate';

let cachedVoice: SpeechSynthesisVoice | null = null;
let userChosenVoiceName: string | null = null;

function loadVoicePrefs() {
  try { userChosenVoiceName = localStorage.getItem(VOICE_KEY); } catch { /* ignore */ }
}
loadVoicePrefs();

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // User-chosen voice takes priority
  if (userChosenVoiceName) {
    const chosen = voices.find(v => v.name === userChosenVoiceName);
    if (chosen) { cachedVoice = chosen; return chosen; }
  }

  // Try preferred list
  for (const name of PREFERRED_VOICES) {
    const v = voices.find(v => v.name.includes(name));
    if (v) { cachedVoice = v; return v; }
  }

  // Fallback: any English voice
  const en = voices.find(v => v.lang.startsWith('en'));
  if (en) { cachedVoice = en; return en; }

  return null;
}

// Pre-load voice list (some browsers need this)
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

/** Get the saved speech rate (default 1.05) */
export function getSpeechRate(): number {
  try {
    const r = localStorage.getItem(RATE_KEY);
    if (r) return parseFloat(r);
  } catch { /* ignore */ }
  return 1.05;
}

/** Save speech rate */
export function setSpeechRate(rate: number) {
  localStorage.setItem(RATE_KEY, String(rate));
}

/** Get available English voices for the picker */
export function getAvailableVoices(): { name: string; lang: string }[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices()
    .filter(v => v.lang.startsWith('en'))
    .map(v => ({ name: v.name, lang: v.lang }));
}

/** Get the currently selected voice name */
export function getSelectedVoiceName(): string | null {
  return userChosenVoiceName || (pickVoice()?.name ?? null);
}

/** Set the voice by name */
export function setVoiceName(name: string) {
  userChosenVoiceName = name;
  cachedVoice = null;
  localStorage.setItem(VOICE_KEY, name);
  pickVoice();
}

export function speakText(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = getSpeechRate();
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
