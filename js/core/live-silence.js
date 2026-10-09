// Silences et délais mesurés EN DIRECT au micro (spec V2 §6, eval-posture.md §6.3 rang 1 = P,
// eval-rdv.md §3.3 = R). PUR. Rien n'est enregistré pour la posture : seuls des nombres sont stockés.
//
// Les niveaux viennent de js/audio/live-level.js (un toutes les ~50 ms, en dB, même formule que D §4.5).
// heldSilence() suit une prise de parole puis le silence qui la suit :
//   attente (pas encore parlé) → parole → silence (au moins minPauseMs sans parole) → reprise.
// Une pause plus courte que minPauseMs (1,5 s) est une pause DANS la phrase, pas le silence de l'exercice :
// measureSilenceAfter (silenceTracker) s'arrête au premier trou de 250 ms, une virgule dans la question
// terminerait la mesure. Un son de moins de 150 ms (tap, vibreur du signal) ne coupe pas un silence.
// Une interruption (trou dans les niveaux, micro coupé, page cachée) rend la mesure aveugle : rien à stocker.
import { PARAMS, levelInterruption, speechThreshold, median } from './acoustics.js';

/** Version des mesures en direct : la réanalyse des Blobs (ALGO_VERSION) ne les touche jamais. */
export const LIVE_VERSION = 'live-1';
export const MIN_PAUSE_MS = 1500;
/** Sans calibration de la voix : seuil = bruit de la pièce + 12 dB (la parole doit dépasser de 15 dB). */
export const DEFAULT_ROOM_MARGIN_DB = 12;
/** Avec calibration : le seuil reste au moins 6 dB (2 × l'hystérésis) au-dessus du bruit de la pièce. */
const ROOM_FLOOR_MARGIN_DB = 6;
/** Au-dessus, la pièce couvre une voix normale : pas de mesure. */
const TOO_NOISY_DB = -25;
const MIN_ROOM_LEVELS = 10;

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * @param {{t: number, db: number, interruption?: string}[]} levels  t en ms, croissant
 * @param {{ thresholdDb: number, startAt?: number, minPauseMs?: number, minSpeechMs?: number,
 *   hysteresisDb?: number, intervalMs?: number, maxGapFactor?: number }} opts
 * @returns {{ phase: 'attente'|'parole'|'silence'|'reprise', onset: number|null, latencyMs: number|null,
 *   waitingMs: number|null, silenceStart: number|null, silenceHeldMs: number|null, speechOnset: number|null,
 *   quietMs: number, lastT: number|null, interrupted: boolean, interruption: string|null }}
 */
export function heldSilence(levels, {
  thresholdDb, startAt = null, minPauseMs = MIN_PAUSE_MS, minSpeechMs = 150, hysteresisDb = PARAMS.hysteresisDb,
  intervalMs = 50, maxGapFactor = 3,
} = {}) {
  if (!isNum(thresholdDb)) throw new RangeError(`Seuil en dB attendu : ${thresholdDb}`);
  const from = isNum(startAt) ? startAt : null;
  let origin = from;
  let phase = 'attente';
  let hyst = null;
  let runStart = null;
  let lastT = null;
  let onset = null;
  let quietSince = null;
  let silenceStart = null;
  let speechOnset = null;
  let interruption = null;
  for (const level of levels ?? []) {
    const t = level?.t;
    if (!isNum(t) || (from !== null && t < from)) continue;
    interruption = levelInterruption(level, lastT ?? from, { intervalMs, maxGapFactor });
    if (interruption) break;
    lastT = t;
    if (origin === null) origin = t;
    const prev = hyst;
    if (hyst === null) hyst = level.db >= thresholdDb ? 'parole' : 'silence';
    else if (hyst === 'parole' && level.db < thresholdDb - hysteresisDb) hyst = 'silence';
    else if (hyst === 'silence' && level.db >= thresholdDb + hysteresisDb) hyst = 'parole';
    if (hyst !== prev) runStart = t;
    const confirmedSpeech = hyst === 'parole' && t - runStart >= minSpeechMs;
    if (phase === 'attente') {
      if (confirmedSpeech) { phase = 'parole'; onset = runStart; quietSince = null; }
    } else if (phase === 'parole') {
      if (confirmedSpeech) quietSince = null;
      else if (hyst === 'silence' && quietSince === null) quietSince = runStart;
      if (quietSince !== null && t - quietSince >= minPauseMs) { phase = 'silence'; silenceStart = quietSince; }
    } else if (phase === 'silence' && confirmedSpeech) {
      phase = 'reprise';
      speechOnset = runStart;
      break;
    }
  }
  const interrupted = interruption !== null;
  let held = null;
  if (!interrupted && phase === 'silence') held = lastT - silenceStart;
  if (!interrupted && phase === 'reprise') held = speechOnset - silenceStart;
  return {
    phase,
    onset,
    latencyMs: !interrupted && onset !== null && origin !== null ? onset - origin : null,
    waitingMs: !interrupted && phase === 'attente' && lastT !== null ? lastT - origin : null,
    silenceStart,
    silenceHeldMs: held,
    speechOnset,
    quietMs: phase === 'parole' && quietSince !== null && lastT !== null ? lastT - quietSince : 0,
    lastT,
    interrupted,
    interruption,
  };
}

/** Niveaux de la dernière prise de voix valide (calibration ou contrôle), stockés dans le contexte des mesures. */
export function latestCalibration(measures) {
  const rows = (measures ?? []).filter((m) => (m.kind === 'calibration' || m.kind === 'controle')
    && isNum(m.context?.noiseDb) && isNum(m.context?.speechDb));
  if (!rows.length) return null;
  const last = rows.reduce((a, b) => ((b.createdAt ?? 0) > (a.createdAt ?? 0) ? b : a));
  return { noiseDb: last.context.noiseDb, speechDb: last.context.speechDb };
}

/**
 * Seuil de parole d'une mesure en direct. roomLevels : ~1,5 s d'écoute de la pièce, Fred silencieux.
 * - Avec calibration : speechThreshold(noiseDb, speechDb) de la dernière prise de voix, relevé au bruit de
 *   la pièce + 6 dB si la pièce est plus bruyante ce jour-là.
 * - Sans calibration : bruit de la pièce (médiane) + 12 dB. Prudent : la parole doit dépasser le bruit de
 *   15 dB (avec l'hystérésis), un souffle ou un frottement ne coupe pas le silence.
 * @returns {{ thresholdDb: number|null, source: 'calibration'|'defaut'|null, roomDb: number|null, tooNoisy: boolean }}
 */
export function liveThreshold({ calibration = null, roomLevels = [] } = {}) {
  const dbs = (roomLevels ?? []).map((l) => l?.db).filter(isNum);
  if (dbs.length < MIN_ROOM_LEVELS) return { thresholdDb: null, source: null, roomDb: null, tooNoisy: false };
  const roomDb = median(dbs);
  const tooNoisy = roomDb > TOO_NOISY_DB;
  if (calibration && isNum(calibration.noiseDb) && isNum(calibration.speechDb)) {
    const cal = speechThreshold(calibration.noiseDb, calibration.speechDb);
    return { thresholdDb: Math.max(cal, roomDb + ROOM_FLOOR_MARGIN_DB), source: 'calibration', roomDb, tooNoisy };
  }
  return { thresholdDb: roomDb + DEFAULT_ROOM_MARGIN_DB, source: 'defaut', roomDb, tooNoisy };
}

/**
 * Exercices de posture mesurés au micro (P §6.1, rang 1), vérifiés contre content/fr/exercises.json :
 * leur consigne contient un silence ou une pause avec une durée. cibleSec = le « bip » de la consigne,
 * rendu par une vibration brève (moins de 150 ms : elle ne coupe pas le silence). apres : ce qui précède.
 * Écartés de la liste de P : P09 (le passage d'écoute qu'il suppose n'est pas lu dans le bloc posture) et
 * P18 (monologue de 60 s, pauses de réflexion, silence final sans durée).
 */
export const POSTURE_MIC = Object.freeze({
  'fr.P03': Object.freeze({ mesure: 'delai', cibleSec: 2, essais: 3, apres: 'question-lue' }),
  'fr.P04': Object.freeze({ mesure: 'silence', cibleSec: 5, essais: 3, apres: 'question' }),
  'fr.P14': Object.freeze({ mesure: 'silence', cibleSec: 3, essais: 1, apres: 'question' }),
  'fr.P22': Object.freeze({ mesure: 'silence', cibleSec: 4, essais: 3, apres: 'non' }),
  'fr.P23': Object.freeze({ mesure: 'silence', cibleSec: 8, essais: 3, apres: 'question' }),
  'fr.P24': Object.freeze({ mesure: 'silence', cibleSec: 4, essais: 3, apres: 'question' }),
});

export const postureMicConfig = (itemId) => POSTURE_MIC[itemId] ?? null;

/**
 * Lignes `measures` d'une mesure en direct (posture ou réplique éclair). values en ms ; stockées en secondes
 * au dixième. Une valeur absente ne donne pas de ligne. kind : 'posture' | 'eclair'.
 */
export function liveRows({ sessionId, dateKey, createdAt, kind, trial = 1, values = {}, context = {}, recordingId = null }) {
  const exercise = context.exercise ?? context.itemId ?? 'x';
  return Object.entries(values).filter(([, v]) => isNum(v)).map(([metric, ms]) => ({
    id: `${sessionId}:${kind}:${exercise}:${trial}:${metric}`,
    recordingId,
    sessionId,
    dateKey,
    createdAt,
    kind,
    metric,
    value: Math.round(ms / 100) / 10,
    algoVersion: LIVE_VERSION,
    snrDb: null,
    context: { ...context },
  }));
}

/** « 7,5 s » : arrondi à 0,5 s (R §6, garde-fou 2 : pas de fausse précision). */
export function secondsText(sec) {
  if (!isNum(sec)) return '–';
  const v = Math.round(sec * 2) / 2;
  return `${Number.isInteger(v) ? v : String(v).replace('.', ',')} s`;
}

const QUESTION_EXERCISES = new Set(Object.entries(POSTURE_MIC).filter(([, c]) => c.apres === 'question').map(([id]) => id));

/**
 * Ligne de soutien de la carte Posture (spec V2 §6). Vocabulaire en zone cible (P §7.2 : la cible est
 * « suffisante », 15 s n'est pas mieux que 8) : x fois sur y « tenu jusqu'au signal », jamais de verdict.
 * Moins de 3 mesures : la valeur seule. null sans mesure.
 */
export function postureSupportLine(measures) {
  const rows = (measures ?? [])
    .filter((m) => m.kind === 'posture' && m.metric === 'silenceTenu' && QUESTION_EXERCISES.has(m.context?.exercise) && isNum(m.value))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  if (!rows.length) return null;
  const label = 'Silence tenu après une question';
  if (rows.length < 3) return `${label} : environ ${secondsText(median(rows.map((r) => r.value)))}.`;
  const recent = median(rows.slice(-3).map((r) => r.value));
  const start = median(rows.slice(0, 3).map((r) => r.value));
  const last = rows.slice(-5);
  const held = last.filter((r) => isNum(r.context?.cibleSec) && r.value >= r.context.cibleSec).length;
  return `${label} : environ ${secondsText(recent)} (au départ : ${secondsText(start)}). Tenu jusqu’au signal ${held} fois sur les ${last.length} dernières.`;
}

/** Libellés neutres de la réplique éclair (R §3.3, « Les zones, sans note »). */
export function eclairLabels({ delaiSec = null, silenceSec = null, tenu = null, dureeSec = null } = {}) {
  const out = [];
  if (isNum(delaiSec)) out.push(`Délai : ${delaiSec < 1 ? 'du tac au tac' : delaiSec <= 3 ? 'posé' : 'temps de réflexion'}`);
  if (tenu === true) out.push('Silence : tenu jusqu’au signal');
  else if (tenu === false && isNum(silenceSec)) out.push(`Silence : repris après ${secondsText(silenceSec)}`);
  if (isNum(dureeSec)) out.push(`Durée de ta réponse : environ ${secondsText(dureeSec)}`);
  return out;
}
