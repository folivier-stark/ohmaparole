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

export function speak(text, { onEnd, onError } = {}) {
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
  // Un cancel() (pause, pas suivant) déclenche une erreur « interrupted » : ce n'est pas une fin.
  u.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    (onError ?? onEnd)?.(e);
  };
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
