// Niveau du micro en direct, pour mesurer le silence tenu et le délai avant de reparler (spec V2 §6,
// phase 4). RIEN N'EST ENREGISTRÉ : un AnalyserNode lit le niveau, on ne garde que des chiffres.
// Les décisions (silence ou parole, hystérésis, interruptions) sont des fonctions pures de
// js/core/acoustics.js : silenceTracker et levelInterruption.
//
// Une mesure aveugle n'est jamais un silence : contexte audio suspendu, micro qui ne rend que des zéros,
// page en arrière-plan, piste coupée, niveaux qui n'arrivent plus. Dans tous ces cas la mesure se termine
// avec { interrupted: true } et ne doit pas être stockée.

import { silenceTracker, NO_SIGNAL_DB } from '../core/acoustics.js';

/** Mêmes réglages que js/audio/recorder.js : aucun traitement, sinon le niveau ne veut plus rien dire. */
export const MIC_CONSTRAINTS = Object.freeze({
  audio: Object.freeze({ echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }),
});

/** Q des filtres passe-haut et passe-bas de Web Audio : il s'exprime en dB. Butterworth : 20·log10(1/√2). */
export const BUTTERWORTH_Q_DB = -3.0103;

/** Erreur du compteur de niveau. code : 'web-audio' | 'micro' | 'suspendu'. */
export class LevelMeterError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'LevelMeterError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

// Flux ouverts par openMicStream : le compteur les coupe lui-même à la fermeture (stopTracksOnClose).
const ownStreams = new WeakSet();

/** Ouvre le micro sans l'enregistrer. Un compteur créé sur ce flux en coupera les pistes à sa fermeture. */
export async function openMicStream() {
  const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
  ownStreams.add(stream);
  return stream;
}

const stopTracks = (stream) => {
  try { stream?.getTracks?.().forEach((t) => t.stop()); } catch { /* déjà arrêtées */ }
};

// Fenêtre d'analyse proche des 25 ms de D §4.5 : 1024 échantillons à 48 kHz (21 ms), 512 à 16 kHz.
const fftFor = (sr) => Math.min(32768, Math.max(32, 2 ** Math.round(Math.log2(0.025 * sr))));

/** resume(), sans attendre plus de `ms` : sans geste de Fred, la promesse peut ne jamais se résoudre. */
async function resumeWithin(ctx, ms) {
  if (ctx.state === 'running') return;
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(() => ctx.resume?.()),
      new Promise((r) => { timer = setTimeout(r, ms); }),
    ]);
  } catch {
    // Refus du navigateur : l'état ci-dessous tranche.
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mesure le niveau efficace du micro (dB, même formule que D §4.5 : 10·log10(moyenne(x²) + 1e-10)),
 * environ toutes les `intervalMs` ms, entre un passe-haut à 80 Hz et un passe-bas à 7 kHz : la même bande
 * que l'analyse hors ligne à 16 kHz, pour que les deux planchers de bruit soient comparables.
 * À créer juste après un geste de Fred (tap) : sinon l'AudioContext reste suspendu, et la création échoue
 * (code 'suspendu') plutôt que de mesurer des zéros comme du silence.
 * Le graphe se termine sur un gain nul : rien n'est joué dans le haut-parleur, pas d'effet Larsen.
 * @param {MediaStream} stream
 * @param {{ intervalMs?: number, historyMs?: number, stopTracksOnClose?: boolean, resumeTimeoutMs?: number }} [opts]
 *   stopTracksOnClose : couper les pistes du micro à la fermeture (et en cas d'échec). Vrai par défaut si le
 *   flux vient d'openMicStream, faux sinon (le flux appartient alors à l'appelant).
 * @returns {Promise<{ context: AudioContext, intervalMs: number,
 *   onLevel(cb: (l: {t: number, db: number, interruption?: string}) => void): () => void,
 *   onClose(cb: () => void): () => void, latest(): object|null, history(): object[],
 *   isClosed(): boolean, close(): Promise<void> }>}
 *   t en ms (performance.now()). Un niveau peut porter `interruption` ('suspendu', 'micro', 'cache') ;
 *   db vaut alors NO_SIGNAL_DB. Un micro qui ne rend que des zéros donne db = NO_SIGNAL_DB (−100 dB exact).
 * @throws {LevelMeterError}
 */
export async function createLevelMeter(stream, { intervalMs = 50, historyMs = 10000,
  stopTracksOnClose = ownStreams.has(stream), resumeTimeoutMs = 1000 } = {}) {
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) {
    if (stopTracksOnClose) stopTracks(stream);
    throw new LevelMeterError('web-audio', 'Web Audio indisponible sur ce navigateur');
  }
  let ctx;
  try {
    ctx = new AC();
  } catch (e) {
    if (stopTracksOnClose) stopTracks(stream);
    throw new LevelMeterError('web-audio', "Impossible d'ouvrir l'audio", e);
  }
  const fail = async (code, message, cause) => {
    try { await ctx.close(); } catch { /* déjà fermé */ }
    if (stopTracksOnClose) stopTracks(stream);
    return new LevelMeterError(code, message, cause);
  };

  let source;
  try {
    source = ctx.createMediaStreamSource(stream);
  } catch (e) {
    throw await fail('micro', 'Micro inutilisable', e);
  }
  let analyser;
  let mute;
  try {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 80;
    hp.Q.value = BUTTERWORTH_Q_DB;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    lp.Q.value = BUTTERWORTH_Q_DB;
    analyser = ctx.createAnalyser();
    analyser.fftSize = fftFor(ctx.sampleRate);
    analyser.smoothingTimeConstant = 0;
    mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(hp);
    hp.connect(lp);
    lp.connect(analyser);
    analyser.connect(mute);
    mute.connect(ctx.destination);
  } catch (e) {
    throw await fail('web-audio', "Impossible de préparer l'analyse du micro", e);
  }

  await resumeWithin(ctx, resumeTimeoutMs);
  if (ctx.state !== 'running') throw await fail('suspendu', "Le micro n'a pas démarré : touche l'écran, puis recommence");

  const buf = new Float32Array(analyser.fftSize);
  const listeners = new Set();
  const closeListeners = new Set();
  const history = [];
  let latest = null;
  let closed = false;

  const emit = (level) => {
    latest = level;
    history.push(level);
    while (history.length && level.t - history[0].t > historyMs) history.shift();
    for (const cb of [...listeners]) {
      try { cb(level); } catch (e) { console.error(e); }
    }
  };
  const tracks = () => (typeof stream?.getAudioTracks === 'function' ? stream.getAudioTracks() : null);
  const trackProblem = () => {
    const ts = tracks();
    return ts !== null && (!ts.length || ts.some((tr) => tr.readyState !== 'live' || tr.muted));
  };
  const tick = () => {
    if (closed) return;
    const t = performance.now();
    if (ctx.state !== 'running') return emit({ t, db: NO_SIGNAL_DB, interruption: 'suspendu' });
    if (trackProblem()) return emit({ t, db: NO_SIGNAL_DB, interruption: 'micro' });
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return emit({ t, db: sum > 0 ? 10 * Math.log10(sum / buf.length + 1e-10) : NO_SIGNAL_DB });
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') emit({ t: performance.now(), db: NO_SIGNAL_DB, interruption: 'cache' });
  };
  const onTrack = () => { if (!closed) emit({ t: performance.now(), db: NO_SIGNAL_DB, interruption: 'micro' }); };
  const hasDocument = typeof document !== 'undefined' && typeof document.addEventListener === 'function';
  if (hasDocument) document.addEventListener('visibilitychange', onVisibility);
  const watched = tracks() ?? [];
  for (const tr of watched) {
    tr.addEventListener?.('mute', onTrack);
    tr.addEventListener?.('ended', onTrack);
  }
  const timer = setInterval(tick, intervalMs);

  return {
    context: ctx,
    intervalMs,
    onLevel(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    onClose(cb) {
      closeListeners.add(cb);
      return () => closeListeners.delete(cb);
    },
    latest: () => latest,
    history: () => history.slice(),
    isClosed: () => closed,
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      if (hasDocument) document.removeEventListener('visibilitychange', onVisibility);
      for (const tr of watched) {
        tr.removeEventListener?.('mute', onTrack);
        tr.removeEventListener?.('ended', onTrack);
      }
      for (const cb of [...closeListeners]) {
        try { cb(); } catch (e) { console.error(e); }
      }
      closeListeners.clear();
      listeners.clear();
      try { source.disconnect(); mute.disconnect(); } catch { /* déjà déconnecté */ }
      try { await ctx.close(); } catch { /* déjà fermé */ }
      if (stopTracksOnClose) stopTracks(stream);
    },
  };
}

/**
 * Attend que Fred reparle après `startAt`, et mesure le silence tenu et le délai avant de reparler.
 * Les niveaux déjà reçus depuis startAt (history) sont repris : on peut appeler cette fonction un peu après
 * la fin de la question (fin de la synthèse vocale, par exemple).
 * Fins possibles :
 * - done : Fred a repris la parole ;
 * - timedOut : plus de `maxMs` de silence (mesure censurée : « au moins maxMs ») ;
 * - interrupted : mesure aveugle (voir levelInterruption), durées à null : NE PAS STOCKER ;
 * - aborted : signal annulé, ou compteur fermé (close()) pendant la mesure : NE PAS STOCKER.
 * Une minuterie sur l'horloge réelle (maxMs + 1 s) rend la main même si plus aucun niveau n'arrive.
 * @param {{ onLevel: Function, onClose?: Function, history?: Function, isClosed?: Function,
 *   context?: { state: string }, intervalMs?: number }} meter  créé par createLevelMeter
 * @param {{ thresholdDb: number, startAt?: number, maxMs?: number, signal?: AbortSignal,
 *   hysteresisDb?: number, minSpeechMs?: number, minSilenceMs?: number, maxGapFactor?: number }} opts
 *   thresholdDb : seuil de parole, par exemple speechThreshold(noiseDb, speechDb) de la calibration de Fred.
 * @returns {Promise<{ state, done, interrupted, interruption, silenceStart, speechOnset, silenceHeldMs,
 *   latencyMs, timedOut: boolean, aborted: boolean }>}  temps en ms (horloge performance.now())
 */
export function measureSilenceAfter(meter, { thresholdDb, startAt = performance.now(), maxMs = 15000, signal,
  intervalMs = meter?.intervalMs ?? 50, ...trackerOpts } = {}) {
  if (!Number.isFinite(thresholdDb)) return Promise.reject(new RangeError(`Seuil en dB attendu : ${thresholdDb}`));
  const opts = { thresholdDb, startAt, intervalMs, ...trackerOpts };
  return new Promise((resolve) => {
    const levels = (meter.history?.() ?? []).filter((l) => l.t >= startAt);
    let finished = false;
    let unsubscribe = () => {};
    let unClose = () => {};
    let timer = null;
    const finish = (extra = {}) => {
      if (finished) return;
      finished = true;
      unsubscribe();
      unClose();
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      const r = { ...silenceTracker(levels, opts), timedOut: false, aborted: false, ...extra };
      if (r.interrupted) Object.assign(r, { done: false, silenceHeldMs: null, latencyMs: null });
      resolve(r);
    };
    const evaluate = () => {
      const r = silenceTracker(levels, opts);
      const last = levels.length ? levels[levels.length - 1].t : startAt;
      if (r.done || r.interrupted) finish();
      else if (last - startAt >= maxMs) finish({ timedOut: true });
    };
    const onAbort = () => finish({ aborted: true });
    if (signal?.aborted) return onAbort();
    if (meter.isClosed?.()) return finish({ aborted: true });
    const state = meter.context?.state;
    if (state !== undefined && state !== 'running') return finish({ interrupted: true, interruption: 'suspendu' });
    signal?.addEventListener('abort', onAbort, { once: true });
    unClose = meter.onClose?.(() => finish({ aborted: true })) ?? (() => {});
    unsubscribe = meter.onLevel((l) => {
      if (finished || !(l.t >= startAt)) return;
      levels.push(l);
      evaluate();
    });
    timer = setTimeout(() => finish({ timedOut: true, interrupted: true, interruption: 'trou' }), maxMs + 1000);
    if (levels.length) evaluate();
  });
}
