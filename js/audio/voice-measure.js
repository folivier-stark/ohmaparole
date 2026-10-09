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

/** Les lignes `measures` d'une prise mesurée (aucune si elle est refusée). */
export function takeRows(recording, kind, res) {
  if (!res?.valid || !res.metrics) return [];
  const context = typeof res.analysis?.leadSilent === 'boolean' ? { leadSilent: res.analysis.leadSilent } : {};
  return measureRows({
    recording, kind, metrics: res.metrics, cv: res.cv, snrDb: res.analysis?.snrDb ?? null,
    algoVersion: res.analysis?.algoVersion ?? ALGO_VERSION, context,
  });
}

const defaultSleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Mesure les références qui n'ont pas de mesure à la version courante, puis supprime les mesures des
 * autres versions. Séquentiel ; avant chaque décodage, attend tant que shouldWait() est vrai (une séance
 * en cours : le décodage ne doit pas gêner l'enregistrement).
 * @returns {Promise<{ analyzed: number, refused: number, missing: number, deleted: number }>}
 */
export async function reanalyzeReferences({ repo, syllables, shouldWait = () => false, sleep = defaultSleep, waitMs = 5000 }) {
  const [recordings, measures, refusedMeta] = await Promise.all([
    repo.listRecordings(), repo.listMeasures(), repo.getMeta('measures.refused', null),
  ]);
  const refused = refusedMeta?.algoVersion === ALGO_VERSION ? [...refusedMeta.ids] : [];
  const done = new Set(measures.filter((m) => m.algoVersion === ALGO_VERSION).map((m) => m.recordingId));
  const todo = recordings.filter((r) => r.kind === 'reference' && !done.has(r.id) && !refused.includes(r.id));
  const out = { analyzed: 0, refused: 0, missing: 0, deleted: 0 };

  for (const rec of todo) {
    while (shouldWait()) await sleep(waitMs);
    const blob = await repo.getAudio(rec.id);
    // Audio absent (import en cours, sauvegarde partielle) : on réessaiera au prochain démarrage.
    if (!blob) {
      out.missing += 1;
      continue;
    }
    const kind = rec.voiceCheck ?? 'reference-v1';
    const res = await measureTake(blob, syllables, rec.voiceCheck ? {} : V1_REFERENCE_OPTIONS);
    if (res.valid) {
      await repo.saveMeasures(takeRows(rec, kind, res));
      out.analyzed += 1;
    } else {
      refused.push(rec.id);
      out.refused += 1;
    }
  }
  if (out.refused || refusedMeta?.algoVersion !== ALGO_VERSION) {
    await repo.setMeta('measures.refused', { algoVersion: ALGO_VERSION, ids: refused });
  }
  for (const v of new Set(measures.map((m) => m.algoVersion).filter((v) => v !== ALGO_VERSION))) {
    out.deleted += await repo.deleteMeasuresByAlgo(v);
  }
  if ((await repo.getMeta('measuresAlgo', null)) !== ALGO_VERSION) await repo.setMeta('measuresAlgo', ALGO_VERSION);
  return out;
}

let running = null;

/**
 * Lance la réanalyse en arrière-plan, après le premier affichage, sans bloquer l'accueil. Une seule à la
 * fois. Pendant une séance (#/session), elle attend.
 */
export function scheduleReanalysis({ repo, syllables, delayMs = 3000 }) {
  if (running) return running;
  const inSession = () => typeof location !== 'undefined' && location.hash.startsWith('#/session');
  running = new Promise((resolve) => { setTimeout(resolve, delayMs); })
    .then(() => reanalyzeReferences({ repo, syllables, shouldWait: inSession }))
    .catch((e) => { console.error(e); return null; })
    .finally(() => { running = null; });
  return running;
}
