// Preferred voices in order (works across iOS Safari, Chrome, Edge)
const PREFERRED_VOICES = [
  'Google UK English Female',  // Chrome desktop
  'Karen',                     // iOS/macOS — Australian English, friendly tone
  'Samantha',                  // iOS/macOS — default female
  'Daniel',                    // iOS/macOS — British male
  'Microsoft Zira',            // Windows
  'Microsoft Hazel',           // Windows — British female
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Try preferred list first
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

export function speakText(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
