// Mesure d'une prise du texte de référence et réanalyse de l'historique, entièrement sur l'appareil
// (spec V2 §4, eval-diction.md §2.3). Aucune requête réseau : les Blobs viennent d'IndexedDB.
//
// Règle d'or (D §2.3) : l'historique est toujours recalculable. Au démarrage, reanalyzeReferences()
// mesure toute référence qui n'a pas encore de mesures à la version courante (ALGO_VERSION) :
// - après un changement d'ALGO_VERSION, tout l'historique ; les mesures de l'ancien algorithme sont
//   supprimées ensuite (remplacées) ;
// - au premier démarrage de la V2, les références V1 (`kind: 'reference'`, sans `voiceCheck`), analysées
//   avec V1_REFERENCE_OPTIONS et stockées en `reference-v1` ;
// - après l'import d'une sauvegarde v1, qui n'a pas de mesures.
// Une prise refusée par l'algorithme courant est notée (meta measures.refused) pour ne pas être redécodée
// à chaque démarrage.
import { decodeToMono16k, TARGET_RATE } from './analyze.js';
import { analyzeSpeech, readingMetrics, speechRateCV, V1_REFERENCE_OPTIONS, ALGO_VERSION } from '../core/acoustics.js';
import { measureRows } from '../core/voice-report.js';
import { spontaneRows } from '../core/weekly-point.js';

/** Mesures recalculables depuis un Blob : la réanalyse ne touche qu'elles (jamais les mesures en direct). */
export const REANALYZED_KINDS = Object.freeze(['calibration', 'controle', 'reference-v1', 'spontane', 'bilan']);

/**
 * Décode et mesure une prise : D §4 rangs 1 à 3, plus le CV de débit (en observation, jamais affiché).
 * Ne rejette jamais : un échec de décodage donne { valid: false, reason: 'decodage' }.
 * @returns {Promise<{ valid, reason, analysis, metrics, cv: number|null, error?: string }>}
 */
export async function measureTake(blob, syllables, opts = {}) {
  let samples;
  try {
    samples = await decodeToMono16k(blob);
  } catch (e) {
    return { valid: false, reason: 'decodage', analysis: null, metrics: null, cv: null, error: e?.message ?? String(e) };
  }
  let analysis;
  try {
    analysis = analyzeSpeech(samples, TARGET_RATE, opts);
  } catch (e) {
    return { valid: false, reason: 'decodage', analysis: null, metrics: null, cv: null, error: e?.message ?? String(e) };
  }
  if (!analysis.valid) return { valid: false, reason: analysis.reason, analysis, metrics: null, cv: null };
  const metrics = readingMetrics(analysis, syllables);
  let cv = null;
  try {
    cv = speechRateCV(samples, TARGET_RATE, analysis, syllables).cv;
  } catch (e) {
    console.error(e);
  }
  return { valid: true, reason: null, analysis, metrics, cv };
}

/**
 * Les lignes `measures` d'une prise mesurée (aucune si elle est refusée). Le contexte garde leadSilent et
 * les niveaux de bruit et de parole de la prise (noiseDb, speechDb) : ils donnent le seuil des mesures en
 * direct de la posture et de la réplique éclair (js/core/live-silence.js).
 */
export function takeRows(recording, kind, res) {
  if (!res?.valid || !res.metrics) return [];
  const a = res.analysis ?? {};
  const context = {};
  if (typeof a.leadSilent === 'boolean') context.leadSilent = a.leadSilent;
  if (Number.isFinite(a.noiseDb)) context.noiseDb = a.noiseDb;
  if (Number.isFinite(a.speechDb)) context.speechDb = a.speechDb;
  Object.assign(context, bilanContext(recording));
  return measureRows({
    recording, kind, metrics: res.metrics, cv: res.cv, snrDb: res.analysis?.snrDb ?? null,
    algoVersion: res.analysis?.algoVersion ?? ALGO_VERSION, context,
  });
}

/** Contexte d'une prise de bilan : le texte lu, la forme du jour et le numéro du bilan (spec V2 §7). */
export function bilanContext(recording) {
  const out = {};
  if (recording?.bilanIndex == null) return out;
  out.texte = recording.itemId;
  out.bilan = recording.bilanIndex;
  if (recording.forme) out.forme = recording.forme;
  return out;
}

const defaultSleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Mesure les références (et les prises de parole spontanée) sans mesure à la version courante, puis
 * supprime leurs mesures des autres versions. Les mesures en direct (posture, réplique éclair, version
 * live-1) n'ont pas de Blob à réanalyser : elles ne sont jamais supprimées. Séquentiel ; avant chaque décodage, attend tant que shouldWait() est vrai (une séance
 * en cours : le décodage ne doit pas gêner l'enregistrement).
 * @returns {Promise<{ analyzed: number, refused: number, missing: number, deleted: number }>}
 */
export async function reanalyzeReferences({ repo, syllables, syllablesById = {}, shouldWait = () => false, sleep = defaultSleep, waitMs = 5000 }) {
  const [recordings, measures, refusedMeta] = await Promise.all([
    repo.listRecordings(), repo.listMeasures(), repo.getMeta('measures.refused', null),
  ]);
  const refused = refusedMeta?.algoVersion === ALGO_VERSION ? [...refusedMeta.ids] : [];
  const done = new Set(measures.filter((m) => m.algoVersion === ALGO_VERSION).map((m) => m.recordingId));
  const todo = recordings.filter((r) => ['reference', 'spontane', 'bilan'].includes(r.kind) && !done.has(r.id) && !refused.includes(r.id));
  const out = { analyzed: 0, refused: 0, missing: 0, deleted: 0 };

  for (const rec of todo) {
    while (shouldWait()) await sleep(waitMs);
    const blob = await repo.getAudio(rec.id);
    // Audio absent (import en cours, sauvegarde partielle) : on réessaiera au prochain démarrage.
    if (!blob) {
      out.missing += 1;
      continue;
    }
    // Parole spontanée : celle du point de la semaine, ou « se présenter » au bilan (sans texte, ni débit).
    const spontane = rec.kind === 'spontane' || (rec.kind === 'bilan' && rec.itemId === 'presentation');
    const kind = rec.kind === 'bilan' ? 'bilan' : spontane ? 'spontane' : rec.voiceCheck ?? 'reference-v1';
    // Le texte lu : ses syllabes sont stockées avec la prise depuis les profils ; avant, c'était le texte pro.
    const syll = rec.syllables ?? (rec.kind === 'bilan' ? syllablesById[rec.itemId] ?? null : syllablesById[rec.itemId] ?? syllables);
    const res = await measureTake(blob, spontane ? null : syll, spontane || rec.voiceCheck || rec.kind === 'bilan' ? {} : V1_REFERENCE_OPTIONS);
    if (res.valid) {
      const rows = spontane ? spontaneRows(rec, res, { kind, context: bilanContext(rec) }) : takeRows(rec, kind, res);
      await repo.saveMeasures(rows);
      out.analyzed += 1;
    } else {
      refused.push(rec.id);
      out.refused += 1;
    }
  }
  if (out.refused || refusedMeta?.algoVersion !== ALGO_VERSION) {
    await repo.setMeta('measures.refused', { algoVersion: ALGO_VERSION, ids: refused });
  }
  const old = measures.filter((m) => REANALYZED_KINDS.includes(m.kind) && m.algoVersion !== ALGO_VERSION);
  for (const v of new Set(old.map((m) => m.algoVersion))) {
    out.deleted += await repo.deleteMeasuresByAlgo(v, REANALYZED_KINDS);
  }
  if ((await repo.getMeta('measuresAlgo', null)) !== ALGO_VERSION) await repo.setMeta('measuresAlgo', ALGO_VERSION);
  return out;
}

let running = null;
let again = null;

/**
 * Lance la réanalyse en arrière-plan, après le premier affichage, sans bloquer l'accueil. Une seule à la
 * fois ; une demande arrivée pendant ce temps (import d'une sauvegarde) la relance UNE fois à la fin.
 * Pendant une séance (#/session), elle attend.
 */
export function scheduleReanalysis(opts) {
  if (running) { again = opts; return running; }
  const { repo, syllables, syllablesById = {}, delayMs = 3000 } = opts;
  const inSession = () => typeof location !== 'undefined' && location.hash.startsWith('#/session');
  running = new Promise((resolve) => { setTimeout(resolve, delayMs); })
    .then(() => reanalyzeReferences({ repo, syllables, syllablesById, shouldWait: inSession }))
    .catch((e) => { console.error(e); return null; })
    .finally(() => {
      running = null;
      const next = again;
      again = null;
      if (next) scheduleReanalysis({ ...next, delayMs: 0 });
    });
  return running;
}
