// Signaux synthétiques pour tester le moteur acoustique sans micro ni fichier audio.
// Déterministes : le bruit vient d'un générateur pseudo-aléatoire à graine fixe.

export const SR = 16000;

/** mulberry32 : générateur pseudo-aléatoire 32 bits, reproductible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bruit blanc uniforme de valeur efficace `rms`, sur `sec` secondes. */
export function noise(sec, rms, seed = 1, sr = SR) {
  const rand = rng(seed);
  const a = rms * Math.sqrt(3);
  const out = new Float32Array(Math.round(sec * sr));
  for (let i = 0; i < out.length; i++) out[i] = (rand() * 2 - 1) * a;
  return out;
}

/**
 * Ajoute une « syllabe » : salve d'un sinus de `freq` Hz, modulée en amplitude (une bosse par salve,
 * de 0,7 à 1 × amp), avec des rampes en cosinus de 15 ms aux deux bouts. Le début vrai est `startSec`.
 */
export function addBurst(buf, startSec, durSec, amp, { freq = 200, rampSec = 0.015, sr = SR } = {}) {
  const i0 = Math.round(startSec * sr);
  const n = Math.round(durSec * sr);
  const ramp = Math.round(rampSec * sr);
  for (let k = 0; k < n && i0 + k < buf.length; k++) {
    let env = 0.7 + 0.3 * Math.sin((Math.PI * k) / n);
    if (k < ramp) env *= (1 - Math.cos((Math.PI * k) / ramp)) / 2;
    else if (k >= n - ramp) env *= (1 - Math.cos((Math.PI * (n - 1 - k)) / ramp)) / 2;
    buf[i0 + k] += amp * env * Math.sin((2 * Math.PI * freq * k) / sr);
  }
}

/**
 * Lecture synthétique : `leadSec` de bruit, puis des groupes de syllabes séparés par des pauses imposées.
 * groups : [{ n, syllSec = 0.15, gapSec = 0.05, pauseAfter = 0 }] ; amp : amplitude des salves.
 * Retourne le signal et la vérité terrain (début, fin, D, pauses ≥ 250 ms, syllabes).
 */
export function reading(groups, { leadSec = 2, tailSec = 1, noiseRms = 0.001, amp = 0.3, seed = 7, ampOf, sr = SR } = {}) {
  let total = leadSec + tailSec;
  for (const g of groups) {
    const s = g.syllSec ?? 0.15;
    const gap = g.gapSec ?? 0.05;
    total += g.n * s + (g.n - 1) * gap + (g.pauseAfter ?? 0);
  }
  const buf = noise(total, noiseRms, seed, sr);
  let t = leadSec;
  let syllables = 0;
  const truth = { start: leadSec, end: 0, pauses: [], groups: [] };
  groups.forEach((g, gi) => {
    const s = g.syllSec ?? 0.15;
    const gap = g.gapSec ?? 0.05;
    const gStart = t;
    for (let k = 0; k < g.n; k++) {
      addBurst(buf, t, s, ampOf ? ampOf(syllables) : amp, { sr });
      syllables++;
      t += s;
      if (k < g.n - 1) t += gap;
    }
    truth.groups.push({ start: gStart, end: t, n: g.n });
    truth.end = t;
    const pause = gi < groups.length - 1 ? (g.pauseAfter ?? 0) : 0;
    if (pause >= 0.25) truth.pauses.push(pause);
    t += pause;
  });
  truth.D = truth.end - truth.start;
  truth.pauseTotal = truth.pauses.reduce((a, b) => a + b, 0);
  truth.syllables = syllables;
  return { samples: buf, truth };
}

/**
 * Ajoute un transitoire qui n'est pas de la parole, à `at` secondes :
 * - 'impulse' : clic large bande de 3 ms, décroissant ;
 * - 'thump'   : tap sur l'écran ou choc contre la table, 30 ms, grave (150 Hz) avec un peu de bruit ;
 * - 'buzz'    : vibreur du téléphone, 120 ms à 175 Hz.
 */
export function addClick(buf, { kind = 'impulse', at, amp = 0.3, sr = SR, seed = 5 }) {
  const rand = rng(seed);
  const g = () => rand() * 2 - 1;
  const i0 = Math.round(at * sr);
  const put = (k, v) => { if (i0 + k >= 0 && i0 + k < buf.length) buf[i0 + k] += v; };
  if (kind === 'impulse') {
    const n = Math.round(0.003 * sr);
    for (let k = 0; k < n; k++) put(k, amp * g() * Math.exp(-k / (n / 4)));
  } else if (kind === 'thump') {
    const n = Math.round(0.03 * sr);
    for (let k = 0; k < n; k++) {
      put(k, amp * Math.sin((2 * Math.PI * 150 * k) / sr) * Math.exp(-k / (n / 3)) + 0.3 * amp * g() * Math.exp(-k / (n / 10)));
    }
  } else if (kind === 'buzz') {
    const n = Math.round(0.12 * sr);
    const ramp = 0.01 * sr;
    for (let k = 0; k < n; k++) {
      const e = Math.min(1, k / ramp, (n - k) / ramp);
      put(k, amp * e * (Math.sin((2 * Math.PI * 175 * k) / sr) + 0.3 * Math.sin((2 * Math.PI * 350 * k) / sr)));
    }
  } else {
    throw new RangeError(`Transitoire inconnu : ${kind}`);
  }
  return buf;
}

/** Copie d'un signal multipliée par un gain linéaire. */
export function scaled(buf, gain) {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] * gain;
  return out;
}

/** Écrête un signal dans [-1, 1], comme un convertisseur saturé. */
export function clip(buf) {
  for (let i = 0; i < buf.length; i++) buf[i] = Math.max(-1, Math.min(1, buf[i]));
  return buf;
}
