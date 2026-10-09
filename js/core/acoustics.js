// Moteur de mesure de la voix sur l'appareil (eval-diction.md §2.3, §3, §4.5 ; spec V2 §4). PUR :
// aucune API navigateur, aucun hasard, aucune requête réseau. Entrée : des échantillons (Float32Array),
// en pratique du mono 16 kHz décodé par js/audio/analyze.js. Testé sous Node avec des signaux synthétiques.
//
// Règle d'or (D §2.3) : chaque résultat porte ALGO_VERSION. Changer un paramètre de PARAMS ou une
// convention ci-dessous = incrémenter ALGO_VERSION et recalculer tout l'historique depuis les Blobs.
//
// Conventions qui ne sont pas écrites dans D §4.5 et qu'il a fallu fixer (figées dans ALGO_VERSION) :
// - Centiles : interpolation linéaire entre rangs (type 7, celui des tableurs).
// - N vient des trames entièrement comprises dans les `leadSilenceSec` premières secondes. Si ce plancher
//   dépasse de plus de 6 dB le 10e centile de toute la prise, c'est que Fred parlait déjà (ou que le bruit
//   de fond a baissé en cours de prise) : N est alors le 10e centile de toute la prise (ses pauses et sa
//   fin), et `leadSilent` vaut false. Les trames de zéros exacts (sous −90 dB) n'entrent pas dans N.
// - S est le 95e centile des trames qui suivent le silence initial (toute la prise s'il n'y en a pas).
// - Temps d'un segment : une trame de 25 ms « voit » la parole dès qu'elle la chevauche. On recale donc le
//   début sur la fin de la 1re trame de parole et la fin sur le début de la dernière, à ±5 ms près (le pas).
//   Sans ce recalage, chaque segment serait allongé d'environ 25 ms et chaque pause raccourcie d'autant.
// - Saturation : un échantillon est saturé si |x| ≥ 0,99 (le décodage Opus arrondit autour de ±1).

import { mdc95 } from './stats.js';

export const ALGO_VERSION = 'acoustics-1';

/** Paramètres de D §4.5 et §3.4. Ne pas les régler à la main : ils sont pré-enregistrés (M §5.1). */
export const PARAMS = Object.freeze({
  highpassHz: 80, // passe-haut (bruits de manipulation)
  frameSec: 0.025,
  hopSec: 0.01,
  medianFrames: 5,
  noisePercentile: 0.1,
  speechPercentile: 0.95,
  minSnrDb: 20, // prise valide si S − N ≥ 20 dB
  thresholdRatio: 0.35, // T = N + 0,35 × (S − N)
  hysteresisDb: 3,
  minPauseSec: 0.25, // les trous plus courts sont fusionnés
  clipLevel: 0.99,
  maxClipRatio: 0.001, // prise refusée au-delà de 0,1 % d'échantillons saturés
  minSpeechSec: 1, // en dessous, « trop-court »
  leadToleranceDb: 6,
  digitalSilenceDb: -90, // trames de zéros exacts (−100 dB), exclues du plancher de bruit
  // Variabilité du débit (en observation, D §1.4 et §2.3) :
  nucleiBandHz: [300, 3000],
  nucleiProminenceDb: 2,
  nucleiMinGapSec: 0.1,
  breathGroupMinSec: 1,
});

const EPS = 1e-10;
const round3 = (x) => Math.round(x * 1000) / 1000;
const round1 = (x) => Math.round(x * 10) / 10;
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

// ─── Traitement du signal ───────────────────────────────────────────────────────────────

/** Coefficients d'un biquad de Butterworth (formulaire RBJ), normalisés par a0. */
function biquadCoeffs(type, fc, sr, q = Math.SQRT1_2) {
  const w0 = (2 * Math.PI * fc) / sr;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  const hp = type === 'highpass';
  const b0 = (hp ? (1 + cos) / 2 : (1 - cos) / 2) / a0;
  const b1 = (hp ? -(1 + cos) : 1 - cos) / a0;
  return { b0, b1, b2: b0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

/**
 * Filtre biquad (forme directe transposée II). L'état initial est le régime permanent pour un signal
 * constant égal au 1er échantillon : un décalage continu ne crée pas de transitoire, donc pas de fausse
 * « parole » à t = 0.
 */
function biquad(input, c) {
  const out = new Float32Array(input.length);
  if (!input.length) return out;
  const x0 = input[0];
  const y0 = ((c.b0 + c.b1 + c.b2) / (1 + c.a1 + c.a2)) * x0;
  let s2 = c.b2 * x0 - c.a2 * y0;
  let s1 = c.b1 * x0 - c.a1 * y0 + s2;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = c.b0 * x + s1;
    s1 = c.b1 * x - c.a1 * y + s2;
    s2 = c.b2 * x - c.a2 * y;
    out[i] = y;
  }
  return out;
}

const highpass = (x, fc, sr) => biquad(x, biquadCoeffs('highpass', fc, sr));
const lowpass = (x, fc, sr) => biquad(x, biquadCoeffs('lowpass', fc, sr));

/** Découpage en trames : taille et pas en échantillons, nombre de trames. */
function framing(length, sr) {
  const win = Math.max(1, Math.round(PARAMS.frameSec * sr));
  const hop = Math.max(1, Math.round(PARAMS.hopSec * sr));
  const count = length >= win ? Math.floor((length - win) / hop) + 1 : 0;
  return { win, hop, count };
}

/** E_dB = 10·log10(moyenne(x²) + 1e-10) par trame, en O(n) grâce à une somme cumulée. */
function frameEnergies(x, { win, hop, count }) {
  const cum = new Float64Array(x.length + 1);
  for (let i = 0; i < x.length; i++) cum[i + 1] = cum[i] + x[i] * x[i];
  const e = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const s = i * hop;
    e[i] = 10 * Math.log10(Math.max(0, cum[s + win] - cum[s]) / win + EPS);
  }
  return e;
}

/** Lissage médian sur k trames (fenêtre tronquée aux bords). */
function medianSmooth(e, k) {
  const half = Math.floor(k / 2);
  const out = new Float64Array(e.length);
  const w = [];
  for (let i = 0; i < e.length; i++) {
    w.length = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(e.length - 1, i + half); j++) w.push(e[j]);
    w.sort((a, b) => a - b);
    const m = w.length >> 1;
    out[i] = w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
  }
  return out;
}

/** Moyenne glissante centrée sur 3 trames (enveloppe des noyaux syllabiques). */
function movingAverage3(e) {
  const out = new Float64Array(e.length);
  for (let i = 0; i < e.length; i++) {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, i - 1); j <= Math.min(e.length - 1, i + 1); j++) { s += e[j]; n++; }
    out[i] = s / n;
  }
  return out;
}

/** Centile p ∈ [0, 1], interpolation linéaire (type 7). null sur une liste vide. */
function percentile(values, p) {
  const n = values.length;
  if (!n) return null;
  const s = Float64Array.from(values).sort();
  const pos = p * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(n - 1, lo + 1);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/**
 * 10e centile des trames, sans les trames de silence numérique (zéros exacts du démarrage du micro ou du
 * décodeur) : elles ne sont pas du bruit de pièce et feraient tomber N à −100 dB. Toutes si rien d'autre.
 */
function noiseFloor(e) {
  const real = e.filter((x) => x > PARAMS.digitalSilenceDb);
  return percentile(real.length ? real : e, PARAMS.noisePercentile);
}

/** Seuil de parole de D §4.5 : T = N + 0,35 × (S − N). Sert aussi au niveau en direct (live-level.js). */
export const speechThreshold = (noiseDb, speechDb) => noiseDb + PARAMS.thresholdRatio * (speechDb - noiseDb);

/** Hystérésis ±h autour de T : parole dès E ≥ T + h, silence dès E < T − h. 1 = parole. */
function hysteresis(e, T, h) {
  const flags = new Uint8Array(e.length);
  let speech = false;
  for (let i = 0; i < e.length; i++) {
    if (!speech && e[i] >= T + h) speech = true;
    else if (speech && e[i] < T - h) speech = false;
    flags[i] = speech ? 1 : 0;
  }
  return flags;
}

/** Suites de trames de parole → segments en secondes, avec le recalage de bord décrit en tête. */
function runsToSegments(flags, { win, hop, count }, length, sr) {
  const segs = [];
  let a = -1;
  for (let i = 0; i <= count; i++) {
    const on = i < count && flags[i] === 1;
    if (on && a < 0) a = i;
    if (!on && a >= 0) {
      const b = i - 1;
      const start = a === 0 ? 0 : (a * hop + win - hop / 2) / sr;
      const end = b === count - 1 ? length / sr : (b * hop + hop / 2) / sr;
      const mid = (start + end) / 2;
      segs.push(end >= start ? { start, end } : { start: mid, end: mid });
      a = -1;
    }
  }
  return segs;
}

/** Fusion des trous de moins de `minGap` secondes. */
function mergeGaps(segs, minGap) {
  const out = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && s.start - last.end < minGap) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}

function clipRatioOf(samples) {
  if (!samples.length) return 0;
  let n = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) >= PARAMS.clipLevel) n++;
  return n / samples.length;
}

function checkInput(samples, sampleRate) {
  if (!samples || typeof samples.length !== 'number') throw new TypeError('Échantillons attendus (Float32Array)');
  if (!isNum(sampleRate) || sampleRate <= 0) throw new RangeError(`Fréquence d'échantillonnage invalide : ${sampleRate}`);
}

// ─── Détection de la parole (D §4.5) ────────────────────────────────────────────────────

/**
 * Détection de la parole d'une prise, en suivant D §4.5 pas à pas.
 * @param {Float32Array} samples  mono, valeurs dans [-1, 1]
 * @param {number} sampleRate     en Hz (16000 après analyze.js)
 * @param {{ leadSilenceSec?: number }} [opts]  durée du silence imposé avant la lecture (2 s)
 * @returns {{
 *   valid: boolean, reason: 'bruit'|'saturation'|'trop-court'|null,
 *   snrDb: number|null, clipRatio: number,
 *   speechStart: number|null, speechEnd: number|null, D: number,
 *   pauseTotal: number, pauseCount: number, segments: {start: number, end: number}[],
 *   algoVersion: string,
 *   leadSilent: boolean, noiseDb: number|null, speechDb: number|null, thresholdDb: number|null
 * }}
 * Temps en secondes, arrondis à la milliseconde ; dB au dixième. `leadSilent` vaut false si Fred a parlé
 * pendant le silence initial (à signaler : « attends 2 s avant de lire »). Priorité des refus :
 * saturation, puis bruit, puis trop-court (D < 1 s ou prise plus courte que le silence initial).
 */
export function analyzeSpeech(samples, sampleRate, { leadSilenceSec = 2 } = {}) {
  checkInput(samples, sampleRate);
  const lead = Math.max(0, isNum(leadSilenceSec) ? leadSilenceSec : 2);
  const clipRatio = clipRatioOf(samples);
  const result = {
    valid: false, reason: 'trop-court', snrDb: null, clipRatio,
    speechStart: null, speechEnd: null, D: 0, pauseTotal: 0, pauseCount: 0, segments: [],
    algoVersion: ALGO_VERSION,
    leadSilent: true, noiseDb: null, speechDb: null, thresholdDb: null,
  };

  const fr = framing(samples.length, sampleRate);
  const leadFrames = lead > 0 ? Math.max(0, Math.floor((lead * sampleRate - fr.win) / fr.hop) + 1) : 0;
  // Pas assez de signal pour mesurer un plancher de bruit puis de la parole.
  if (fr.count < PARAMS.medianFrames || (lead > 0 && fr.count <= leadFrames)) {
    if (clipRatio > PARAMS.maxClipRatio) result.reason = 'saturation';
    return result;
  }

  // 1-2. Passe-haut 80 Hz, trames de 25 ms au pas de 10 ms, énergie en dB, lissage médian sur 5 trames.
  const filtered = highpass(samples, PARAMS.highpassHz, sampleRate);
  const e = medianSmooth(frameEnergies(filtered, fr), PARAMS.medianFrames);

  // 3. Plancher de bruit N (10e centile du silence initial) et niveau de parole S (95e centile).
  const nAll = noiseFloor(e);
  const nLead = leadFrames > 0 ? noiseFloor(e.subarray(0, leadFrames)) : null;
  const leadUsable = nLead !== null && nLead - nAll <= PARAMS.leadToleranceDb;
  const N = leadUsable ? nLead : nAll;
  const rest = e.subarray(leadFrames);
  const S = percentile(rest.length ? rest : e, PARAMS.speechPercentile);
  const snr = S - N;

  // 4. Seuil T avec hystérésis ±3 dB. 5. Fusion des trous de moins de 250 ms.
  const T = speechThreshold(N, S);
  const flags = hysteresis(e, T, PARAMS.hysteresisDb);
  const segs = mergeGaps(runsToSegments(flags, fr, samples.length, sampleRate), PARAMS.minPauseSec);
  const speechInLead = flags.subarray(0, leadFrames).some((f) => f === 1);

  // 6. D, Σ pauses, nombre de pauses, segments, rapport signal/bruit.
  const segments = segs.map((s) => ({ start: round3(s.start), end: round3(s.end) }));
  let pauseTotal = 0;
  for (let i = 1; i < segments.length; i++) pauseTotal += segments[i].start - segments[i - 1].end;
  const speechStart = segments.length ? segments[0].start : null;
  const speechEnd = segments.length ? segments[segments.length - 1].end : null;
  const D = segments.length ? round3(speechEnd - speechStart) : 0;

  let reason = null;
  if (clipRatio > PARAMS.maxClipRatio) reason = 'saturation';
  else if (snr < PARAMS.minSnrDb) reason = 'bruit';
  else if (D < PARAMS.minSpeechSec) reason = 'trop-court';

  return {
    ...result,
    valid: reason === null,
    reason,
    snrDb: round1(snr),
    speechStart,
    speechEnd,
    D,
    pauseTotal: round3(pauseTotal),
    pauseCount: Math.max(0, segments.length - 1),
    segments,
    leadSilent: leadUsable && !speechInLead,
    noiseDb: round1(N),
    speechDb: round1(S),
    thresholdDb: round1(T),
  };
}

// ─── Mesures de lecture (D §4, rangs 1 à 3) ─────────────────────────────────────────────

/**
 * Débit de lecture, part du temps en pause et débit articulatoire, pour un texte de `syllables` syllabes
 * comptées une fois (reference.syllabes = 86). À n'appeler que sur une analyse `valid`.
 * `pausePct` est une FRACTION (0,18 = 18 % du temps), comme la formule Σpauses / D de D §4.
 * Sans durée de parole, ou sans syllabes, la mesure concernée vaut null (jamais Infinity ni NaN).
 * @returns {{ debit: number|null, pausePct: number|null, debitArticulatoire: number|null }}  syll/s
 */
export function readingMetrics(analysis, syllables) {
  const D = analysis?.D;
  const pauses = isNum(analysis?.pauseTotal) ? analysis.pauseTotal : 0;
  if (!isNum(D) || D <= 0) return { debit: null, pausePct: null, debitArticulatoire: null };
  const hasSyll = isNum(syllables) && syllables > 0;
  const articulated = D - pauses;
  return {
    debit: hasSyll ? syllables / D : null,
    pausePct: pauses / D,
    debitArticulatoire: hasSyll && articulated > 0 ? syllables / articulated : null,
  };
}

/** Médiane de chaque mesure sur les prises d'une séance (3 prises, D §3.4). Prises non mesurées ignorées. */
export function sessionMedians(takes, keys = ['debit', 'pausePct', 'debitArticulatoire']) {
  const out = {};
  for (const k of keys) out[k] = median((takes ?? []).map((t) => t?.[k]));
  return out;
}

// ─── Variabilité du débit : EN OBSERVATION, CALCULÉE MAIS JAMAIS AFFICHÉE ───────────────

/**
 * Pics d'énergie assez saillants : proéminence ≥ minProm dB (creux le plus haut entre le pic et le plus
 * proche point plus haut, de chaque côté), au-dessus de `floor`, distants d'au moins minDist trames.
 */
function countPeaks(v, minProm, minDist, floor) {
  const cands = [];
  for (let i = 1; i < v.length - 1; i++) {
    if (!(v[i] >= v[i - 1] && v[i] > v[i + 1]) || v[i] < floor) continue;
    let left = v[i];
    for (let j = i - 1; j >= 0 && v[j] <= v[i]; j--) left = Math.min(left, v[j]);
    let right = v[i];
    for (let j = i + 1; j < v.length && v[j] <= v[i]; j++) right = Math.min(right, v[j]);
    if (v[i] - Math.max(left, right) >= minProm) cands.push(i);
  }
  cands.sort((a, b) => v[b] - v[a]);
  const kept = [];
  for (const i of cands) if (kept.every((j) => Math.abs(i - j) >= minDist)) kept.push(i);
  return kept.length;
}

const sampleSd = (xs) => {
  if (xs.length < 2) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

/**
 * Variabilité du débit d'un groupe de souffle à l'autre (D §1.4 et §4 « En observation »), le marqueur
 * d'un débit « par à-coups ». **Calculée et stockée, JAMAIS AFFICHÉE** : aucune métrique de ce genre n'est
 * validée (D §1.4), on la regarde à 3 mois et elle ne s'affiche que si son MDC est inférieur à l'écart
 * entre la semaine 1 et le mois 3. Aucun écran ne doit en tirer un mot, encore moins « bredouillement ».
 *
 * Version simplifiée de de Jong et Wempe (D §2.3) : énergie filtrée entre 300 et 3 000 Hz, pics d'au moins
 * 2 dB au-dessus des creux voisins, distants d'au moins 100 ms, au-dessus du seuil de parole de cette bande.
 * **Pas de vérification du voisement** : un bruit fort dans un segment peut compter comme un noyau.
 * Groupes de souffle = segments de `analysis` d'au moins 1 s ; k = syllabes du texte / noyaux détectés
 * sur toute la prise ; débit local = k × noyaux / durée ; CV = écart type (n − 1) / moyenne.
 * Le CV ne dépend pas de k (il s'annule) : k ne sert qu'à exprimer les débits locaux en syll/s.
 * @returns {{ cv: number|null, groups: number, nuclei: number, nucleiPerGroup: number[], k: number|null,
 *             rates: number[], algoVersion: string }}  cv null s'il y a moins de 2 groupes
 */
export function speechRateCV(samples, sampleRate, analysis, syllables) {
  checkInput(samples, sampleRate);
  const empty = { cv: null, groups: 0, nuclei: 0, nucleiPerGroup: [], k: null, rates: [], algoVersion: ALGO_VERSION };
  const segs = analysis?.segments ?? [];
  const fr = framing(samples.length, sampleRate);
  if (!segs.length || fr.count < 3) return empty;

  const [lo, hi] = PARAMS.nucleiBandHz;
  const band = lowpass(highpass(samples, lo, sampleRate), Math.min(hi, sampleRate * 0.45), sampleRate);
  const env = movingAverage3(frameEnergies(band, fr));
  const center = (i) => (i * fr.hop + fr.win / 2) / sampleRate;
  const inside = [];
  const outside = [];
  const perSeg = segs.map(() => []);
  for (let i = 0, s = 0; i < env.length; i++) {
    const c = center(i);
    while (s < segs.length && c > segs[s].end) s++;
    if (s < segs.length && c >= segs[s].start) { perSeg[s].push(env[i]); inside.push(env[i]); }
    else outside.push(env[i]);
  }
  if (!inside.length) return empty;
  const nb = percentile(outside.length ? outside : env, PARAMS.noisePercentile);
  const floor = speechThreshold(nb, percentile(inside, PARAMS.speechPercentile));
  const minDist = Math.max(1, Math.round(PARAMS.nucleiMinGapSec / PARAMS.hopSec));
  const counts = perSeg.map((v) => countPeaks(v, PARAMS.nucleiProminenceDb, minDist, floor));
  const nuclei = counts.reduce((a, b) => a + b, 0);
  const k = nuclei > 0 ? (isNum(syllables) && syllables > 0 ? syllables / nuclei : 1) : null;

  const nucleiPerGroup = [];
  const rates = [];
  segs.forEach((s, i) => {
    const dur = s.end - s.start;
    if (dur < PARAMS.breathGroupMinSec) return;
    nucleiPerGroup.push(counts[i]);
    rates.push(((k ?? 1) * counts[i]) / dur);
  });
  const mean = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const sd = sampleSd(rates);
  return {
    cv: sd !== null && mean > 0 ? sd / mean : null,
    groups: rates.length,
    nuclei,
    nucleiPerGroup,
    k,
    rates,
    algoVersion: ALGO_VERSION,
  };
}

// ─── Calibration et verdict (D §3, spec V2 §4) ──────────────────────────────────────────

/** Médiane des valeurs numériques finies (null, undefined, NaN ignorés). null sur une liste vide. */
export function median(arr) {
  const xs = (arr ?? []).filter(isNum).sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = xs.length >> 1;
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}

/** Nombre de séances de calibration avant toute ligne de base (D §3.3, M §1.4 « en calibrage »). */
export const BASELINE_MIN_SESSIONS = 3;

/**
 * Ligne de base = médiane des médianes de séance de la calibration (D §3.3 : pas J1 seul, le trac du
 * premier jour fausse la mesure). null tant qu'il y a moins de 3 séances mesurées : « On apprend ta voix ».
 */
export function baseline(sessionsMedians) {
  const xs = (sessionsMedians ?? []).filter(isNum);
  return xs.length >= BASELINE_MIN_SESSIONS ? median(xs) : null;
}

/**
 * Écart type intra-individuel entre séances (SDw, n − 1) des médianes de séance, borné par le bas :
 * max(mesuré, défaut) (D §3.3 : avec si peu de points, la valeur la plus prudente). Moins de 2 valeurs :
 * le défaut seul (null sans défaut).
 */
export function sdWithin(values, defaultSd) {
  const measured = sampleSd((values ?? []).filter(isNum));
  const def = isNum(defaultSd) ? defaultSd : null;
  if (measured === null) return def;
  return def === null ? measured : Math.max(measured, def);
}

/**
 * Bruit attendu d'une séance à l'autre par défaut (D §3.2, colonne « médiane de 3 prises »), en attendant
 * la calibration de Fred. Ce sont des estimations d'expert, pas des données publiées : on prend le POINT
 * MÉDIAN de chaque fourchette (débit 3 à 5 % → 4 % ; pause 3 à 5 points → 4 points ; nombre de pauses
 * ±1 à 2 → 1,5 ; débit articulatoire 4 à 6 % → 5 %). sdWithin les remplace par le mesuré s'il est plus grand.
 * `relative` : fraction de la valeur de base ; `absolute` : dans l'unité de la mesure (pausePct en fraction).
 */
export const DEFAULT_SD = Object.freeze({
  debit: Object.freeze({ kind: 'relative', value: 0.04 }),
  debitArticulatoire: Object.freeze({ kind: 'relative', value: 0.05 }),
  pausePct: Object.freeze({ kind: 'absolute', value: 0.04 }),
  pauseCount: Object.freeze({ kind: 'absolute', value: 1.5 }),
});

/** SDw par défaut, dans l'unité de la mesure : relatif × |ligne de base|, ou absolu. null si inconnu. */
export function defaultSd(metric, baselineValue) {
  const d = DEFAULT_SD[metric];
  if (!d) return null;
  if (d.kind === 'absolute') return d.value;
  return isNum(baselineValue) ? d.value * Math.abs(baselineValue) : null;
}

/** Sens du « plus posé » pour chaque mesure : −1 = une baisse, +1 = une hausse. */
export const CALM_DIRECTION = Object.freeze({ debit: -1, debitArticulatoire: -1, pausePct: 1, pauseCount: 1 });

/**
 * Verdict en trois états (D §4, rang 1) : l'écart à la ligne de base compte s'il atteint la MDC95
 * (2,77 × SDw, soit |RCI| ≥ 1,96). En dessous : « pas de différence mesurable ».
 * @param {number} direction  sens du « plus posé » (CALM_DIRECTION) : −1 par défaut, celui du débit
 * @returns {'plus-pose'|'pas-de-difference'|'plus-rapide'|null}  null si une donnée manque
 */
export function verdictReading(baselineValue, currentValue, sdw, direction = -1) {
  if (!isNum(baselineValue) || !isNum(currentValue) || !isNum(sdw) || sdw <= 0) return null;
  const delta = currentValue - baselineValue;
  if (Math.abs(delta) < mdc95(sdw)) return 'pas-de-difference';
  return Math.sign(delta) === Math.sign(direction || -1) ? 'plus-pose' : 'plus-rapide';
}

// ─── Silence tenu au micro, en direct (spec V2 §6) ──────────────────────────────────────

/**
 * Décision silence / parole sur une suite de niveaux en dB (un toutes les ~50 ms, js/audio/live-level.js),
 * pour mesurer le silence tenu après une question et le délai avant de reparler. Pure : on lui repasse
 * toute la suite à chaque nouveau niveau (quelques centaines de points, coût négligeable).
 * - Hystérésis : parole dès db ≥ T + h, silence dès db < T − h (h = 3 dB, comme D §4.5).
 * - Le silence commence quand la parole en cours au départ s'arrête au moins `minSilenceMs` (250 ms,
 *   le seuil de pause de D) ; si Fred se tait déjà à `startAt`, il commence à `startAt`.
 * - La reprise est la 1re suite de parole d'au moins `minSpeechMs` (150 ms) : un clic ou un souffle bref
 *   ne coupe pas le silence.
 * @param {{t: number, db: number}[]} levels  t en ms, croissant ; les niveaux avant startAt sont ignorés
 * @returns {{ state: 'attente'|'silence'|'reprise', done: boolean, silenceStart: number|null,
 *   speechOnset: number|null, silenceHeldMs: number|null, latencyMs: number|null }}
 *   attente = la parole en cours n'est pas encore finie ; silenceHeldMs court jusqu'au dernier niveau tant
 *   que la parole n'a pas repris ; latencyMs = reprise − startAt.
 */
export function silenceTracker(levels, { thresholdDb, hysteresisDb = PARAMS.hysteresisDb, startAt = 0,
  minSpeechMs = 150, minSilenceMs = 250 } = {}) {
  if (!isNum(thresholdDb)) throw new RangeError(`Seuil en dB attendu : ${thresholdDb}`);
  const h = Math.max(0, hysteresisDb);
  let phase = 'attente';
  let silenceStart = null;
  let speechOnset = null;
  let hyst = null;
  let runStart = null;
  let lastT = null;
  for (const { t, db } of levels ?? []) {
    if (!isNum(t) || t < startAt) continue;
    lastT = t;
    const prev = hyst;
    if (hyst === null) hyst = db >= thresholdDb ? 'parole' : 'silence';
    else if (hyst === 'parole' && db < thresholdDb - h) hyst = 'silence';
    else if (hyst === 'silence' && db >= thresholdDb + h) hyst = 'parole';
    if (hyst !== prev) runStart = t;
    const runMs = t - runStart;
    if (phase === 'attente') {
      if (prev === null && hyst === 'silence') { phase = 'silence'; silenceStart = startAt; }
      else if (hyst === 'silence' && runMs >= minSilenceMs) { phase = 'silence'; silenceStart = runStart; }
    } else if (phase === 'silence' && hyst === 'parole' && runMs >= minSpeechMs) {
      phase = 'reprise';
      speechOnset = runStart;
      break;
    }
  }
  const done = phase === 'reprise';
  return {
    state: phase,
    done,
    silenceStart,
    speechOnset,
    silenceHeldMs: done ? speechOnset - silenceStart : phase === 'silence' ? lastT - silenceStart : null,
    latencyMs: done ? speechOnset - startAt : null,
  };
}
