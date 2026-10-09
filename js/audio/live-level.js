// Niveau du micro en direct, pour mesurer le silence tenu et le délai avant de reparler (spec V2 §6,
// phase 4). RIEN N'EST ENREGISTRÉ : un AnalyserNode lit le niveau, on ne garde que des chiffres.
// La décision silence / parole (hystérésis) est la fonction pure silenceTracker de js/core/acoustics.js.

import { silenceTracker } from '../core/acoustics.js';

/** Mêmes réglages que js/audio/recorder.js : aucun traitement, sinon le niveau ne veut plus rien dire. */
export const MIC_CONSTRAINTS = Object.freeze({
  audio: Object.freeze({ echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }),
});

/** Ouvre le micro sans l'enregistrer. L'appelant arrête les pistes quand il a fini. */
export function openMicStream() {
  return navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
}

// Fenêtre d'analyse proche des 25 ms de D §4.5 : 1024 échantillons à 48 kHz (21 ms), 512 à 16 kHz.
const fftFor = (sr) => Math.min(32768, Math.max(32, 2 ** Math.round(Math.log2(0.025 * sr))));

/**
 * Mesure le niveau efficace du micro (dB, même formule que D §4.5 : 10·log10(moyenne(x²) + 1e-10)),
 * après un passe-haut à 80 Hz, environ toutes les `intervalMs` ms. À créer après un geste de Fred
 * (tap), sinon l'AudioContext reste suspendu et le niveau reste à −100 dB.
 * Le graphe se termine sur un gain nul : rien n'est joué dans le haut-parleur, pas d'effet Larsen.
 * @param {MediaStream} stream  ouvert par openMicStream ; close() ne coupe PAS ses pistes
 * @returns {{ context: AudioContext, onLevel(cb: (l: {t: number, db: number}) => void): () => void,
 *   latest(): {t: number, db: number}|null, history(): {t: number, db: number}[], close(): Promise<void> }}
 *   t en ms (performance.now()). history() garde les `historyMs` dernières ms.
 */
export function createLevelMeter(stream, { intervalMs = 50, historyMs = 10000 } = {}) {
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) throw new Error('Web Audio indisponible sur ce navigateur');
  const ctx = new AC();
  const source = ctx.createMediaStreamSource(stream);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80;
  hp.Q.value = Math.SQRT1_2;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftFor(ctx.sampleRate);
  analyser.smoothingTimeConstant = 0;
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(hp);
  hp.connect(analyser);
  analyser.connect(mute);
  mute.connect(ctx.destination);

  const buf = new Float32Array(analyser.fftSize);
  const listeners = new Set();
  const history = [];
  let latest = null;
  let closed = false;

  const tick = () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const level = { t: performance.now(), db: 10 * Math.log10(sum / buf.length + 1e-10) };
    latest = level;
    history.push(level);
    while (history.length && level.t - history[0].t > historyMs) history.shift();
    for (const cb of [...listeners]) {
      try { cb(level); } catch (e) { console.error(e); }
    }
  };
  ctx.resume?.().catch(() => {});
  const timer = setInterval(tick, intervalMs);

  return {
    context: ctx,
    onLevel(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    latest: () => latest,
    history: () => history.slice(),
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      listeners.clear();
      try { source.disconnect(); mute.disconnect(); } catch { /* déjà déconnecté */ }
      try { await ctx.close(); } catch { /* déjà fermé */ }
    },
  };
}

/**
 * Attend que Fred reparle après `startAt`, et mesure le silence tenu et le délai avant de reparler.
 * Les niveaux déjà reçus depuis startAt (history) sont repris : on peut appeler cette fonction un peu après
 * la fin de la question (fin de la synthèse vocale, par exemple).
 * @param {{ onLevel: Function, history?: Function }} meter  créé par createLevelMeter
 * @param {{ thresholdDb: number, startAt?: number, maxMs?: number, signal?: AbortSignal,
 *   hysteresisDb?: number, minSpeechMs?: number, minSilenceMs?: number }} opts
 *   thresholdDb : seuil de parole, par exemple speechThreshold(N, S) de la calibration de Fred ;
 *   maxMs : au-delà, on rend la main avec timedOut (silence encore en cours, mesure censurée).
 * @returns {Promise<{ state, done, silenceStart, speechOnset, silenceHeldMs, latencyMs,
 *   timedOut: boolean, aborted: boolean }>}  temps en ms (horloge performance.now())
 */
export function measureSilenceAfter(meter, { thresholdDb, startAt = performance.now(), maxMs = 15000, signal,
  ...trackerOpts } = {}) {
  if (!Number.isFinite(thresholdDb)) return Promise.reject(new RangeError(`Seuil en dB attendu : ${thresholdDb}`));
  const opts = { thresholdDb, startAt, ...trackerOpts };
  return new Promise((resolve) => {
    const levels = (meter.history?.() ?? []).filter((l) => l.t >= startAt);
    let finished = false;
    let unsubscribe = () => {};
    const finish = (extra = {}) => {
      if (finished) return;
      finished = true;
      unsubscribe();
      signal?.removeEventListener('abort', onAbort);
      resolve({ ...silenceTracker(levels, opts), timedOut: false, aborted: false, ...extra });
    };
    const evaluate = () => {
      const r = silenceTracker(levels, opts);
      const last = levels.length ? levels[levels.length - 1].t : startAt;
      if (r.done) finish();
      else if (last - startAt >= maxMs) finish({ timedOut: true });
    };
    const onAbort = () => finish({ aborted: true });
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
    unsubscribe = meter.onLevel((l) => {
      if (finished || !(l.t >= startAt)) return;
      levels.push(l);
      evaluate();
    });
    if (levels.length) evaluate();
  });
}
