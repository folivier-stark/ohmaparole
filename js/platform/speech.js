let enabled = true;

export function setSpeechEnabled(v) {
  enabled = Boolean(v);
}

export function canSpeak() {
  return enabled && 'speechSynthesis' in window;
}

function frenchVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'fr-FR' && /natural|google/i.test(v.name))
    ?? voices.find((v) => v.lang?.startsWith('fr'))
    ?? null;
}

export function speak(text, { onEnd } = {}) {
  if (!text || !canSpeak()) {
    onEnd?.();
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  const v = frenchVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
