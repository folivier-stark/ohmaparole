// Analyse d'une prise enregistrée, entièrement sur l'appareil (eval-diction.md §2.3, spec V2 §4).
// Aucune requête réseau : le Blob vient d'IndexedDB (WebM/Opus 32 kb/s mono, sans contrôle de gain),
// il est décodé par Web Audio puis confié au moteur pur js/core/acoustics.js.

import { analyzeSpeech, readingMetrics } from '../core/acoustics.js';

export const TARGET_RATE = 16000;

/** Erreur de décodage : Blob vide, format illisible ou Web Audio absent. `code` vaut toujours 'decodage'. */
export class AudioDecodeError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'AudioDecodeError';
    this.code = 'decodage';
    if (cause) this.cause = cause;
  }
}

/** decodeAudioData, en promesse ou en rappel (anciens Safari), avec une seule issue. */
function decode(ctx, arrayBuffer) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ok = (b) => { if (!settled) { settled = true; resolve(b); } };
    const ko = (e) => { if (!settled) { settled = true; reject(e ?? new Error('decodeAudioData a échoué')); } };
    try {
      const p = ctx.decodeAudioData(arrayBuffer, ok, ko);
      if (p && typeof p.then === 'function') p.then(ok, ko);
    } catch (e) {
      ko(e);
    }
  });
}

/**
 * Décode un Blob audio et le rééchantillonne en mono 16 kHz.
 * AudioContext.decodeAudioData lit le WebM/Opus de Chrome ; un OfflineAudioContext à 1 canal et 16 kHz
 * mélange les canaux (règles « speakers ») et rééchantillonne.
 * @returns {Promise<Float32Array>}
 * @throws {AudioDecodeError}
 */
export async function decodeToMono16k(blob) {
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  const OAC = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
  if (!AC || !OAC) throw new AudioDecodeError('Web Audio indisponible sur ce navigateur');
  if (!blob || typeof blob.arrayBuffer !== 'function' || !blob.size) throw new AudioDecodeError('Enregistrement vide ou absent');

  let decoded;
  let ctx;
  try {
    const data = await blob.arrayBuffer();
    ctx = new AC();
    decoded = await decode(ctx, data);
  } catch (e) {
    throw new AudioDecodeError("Impossible de décoder l'enregistrement", e);
  } finally {
    // Chrome limite le nombre d'AudioContext ouverts : on ferme celui qui a servi au décodage.
    try { await ctx?.close?.(); } catch { /* déjà fermé */ }
  }
  if (!decoded || !(decoded.duration > 0)) throw new AudioDecodeError('Enregistrement sans audio');

  try {
    const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
    const offline = new OAC(1, length, TARGET_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } catch (e) {
    throw new AudioDecodeError("Impossible de rééchantillonner l'enregistrement", e);
  }
}

/**
 * Décode puis mesure une prise de lecture.
 * @param {Blob} blob
 * @param {number} syllables  syllabes du texte lu (reference.syllabes = 86)
 * @param {{ leadSilenceSec?: number }} [opts]  transmis à analyzeSpeech
 * @returns {Promise<{ valid: boolean, reason: 'bruit'|'saturation'|'trop-court'|'decodage'|null,
 *   analysis: object|null, metrics: {debit, pausePct, debitArticulatoire}|null, error?: string }>}
 *   Ne rejette jamais : un échec de décodage donne { valid: false, reason: 'decodage' }. Une prise refusée
 *   garde son `analysis` (diagnostic) mais `metrics` vaut null : rien à stocker comme mesure.
 */
export async function analyzeBlob(blob, syllables, opts = {}) {
  let samples;
  try {
    samples = await decodeToMono16k(blob);
  } catch (e) {
    return { valid: false, reason: 'decodage', analysis: null, metrics: null, error: e?.message ?? String(e) };
  }
  const analysis = analyzeSpeech(samples, TARGET_RATE, opts);
  const metrics = analysis.valid ? readingMetrics(analysis, syllables) : null;
  return { valid: analysis.valid, reason: analysis.reason, analysis, metrics };
}
