// Analyse d'une prise enregistrée, entièrement sur l'appareil (eval-diction.md §2.3, spec V2 §4).
// Aucune requête réseau : le Blob vient d'IndexedDB (WebM/Opus 32 kb/s mono, sans contrôle de gain),
// il est décodé par Web Audio puis confié au moteur pur js/core/acoustics.js.

import { analyzeSpeech, readingMetrics, V1_REFERENCE_OPTIONS } from '../core/acoustics.js';

export { V1_REFERENCE_OPTIONS };

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

/** Moyenne des canaux (un enregistrement mono sort tel quel). */
function toMono(buffer) {
  const channels = buffer.numberOfChannels ?? 1;
  if (channels <= 1) return buffer.getChannelData(0);
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += data[i];
  }
  for (let i = 0; i < out.length; i++) out[i] /= channels;
  return out;
}

/**
 * Décode un Blob audio en mono 16 kHz.
 * Le décodage se fait DIRECTEMENT dans un OfflineAudioContext à 16 kHz : decodeAudioData rééchantillonne
 * alors au taux du contexte avec un filtre anti-repliement. (Lire le tampon décodé à 48 kHz par un
 * AudioBufferSourceNode dans un contexte à 16 kHz interpole sans ce filtre : ce qui dépasse 8 kHz se replie
 * dans la bande et relève le plancher de bruit.) Aucun AudioContext temps réel n'est ouvert.
 * @returns {Promise<Float32Array>}
 * @throws {AudioDecodeError}
 */
export async function decodeToMono16k(blob) {
  const OAC = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
  if (!OAC) throw new AudioDecodeError('Web Audio indisponible sur ce navigateur');
  if (!blob || typeof blob.arrayBuffer !== 'function' || !blob.size) throw new AudioDecodeError('Enregistrement vide ou absent');

  let decoded;
  try {
    const data = await blob.arrayBuffer();
    decoded = await decode(new OAC(1, 1, TARGET_RATE), data);
  } catch (e) {
    throw new AudioDecodeError("Impossible de décoder l'enregistrement", e);
  }
  if (!decoded || !(decoded.length > 0)) throw new AudioDecodeError('Enregistrement sans audio');
  if (decoded.sampleRate !== TARGET_RATE) {
    throw new AudioDecodeError(`Rééchantillonnage inattendu : ${decoded.sampleRate} Hz au lieu de ${TARGET_RATE}`);
  }
  return toMono(decoded);
}

/**
 * Décode puis mesure une prise de lecture.
 * @param {Blob} blob
 * @param {number} syllables  syllabes du texte lu (reference.syllabes = 86)
 * @param {{ leadSilenceSec?: number, ignoreBeforeSec?: number }} [opts]  transmis à analyzeSpeech.
 *   Prises V2 (2 s de silence, vibreur AVANT l'enregistrement) : rien à passer. Anciennes références V1
 *   (`kind: 'reference'`, vibreur au démarrage, pas de silence) : V1_REFERENCE_OPTIONS.
 * @returns {Promise<{ valid: boolean,
 *   reason: 'saturation'|'sans-parole'|'bruit'|'trop-court'|'decodage'|null,
 *   analysis: object|null, metrics: {debit, pausePct, debitArticulatoire, pauseCount}|null, error?: string }>}
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
