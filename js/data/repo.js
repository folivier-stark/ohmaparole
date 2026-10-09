import * as db from './db.js';

export const DEFAULT_SETTINGS = { reminderTime: '08:30', voice: true, vibrate: true };

export async function getMeta(key, fallback = null) {
  const row = await db.get('meta', key);
  return row ? row.value : fallback;
}

export const setMeta = (key, value) => db.put('meta', { key, value });

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(await getMeta('settings', {})) };
}

export const saveSession = (s) => db.put('sessions', s);
export const getSession = (id) => db.get('sessions', id);

export async function listSessions() {
  return (await db.getAll('sessions')).sort((a, b) => a.startedAt - b.startedAt);
}

export async function saveRecording(meta, blob) {
  await db.put('audio', { id: meta.id, blob });
  await db.put('recordings', meta);
}

export async function listRecordings() {
  return (await db.getAll('recordings')).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAudio(id) {
  return (await db.get('audio', id))?.blob ?? null;
}

/** Mesures de la voix (store `measures`, une ligne par valeur : js/core/voice-report.js measureRows). */
export async function saveMeasures(rows) {
  if (rows?.length) await db.putMany('measures', rows);
}

export async function listMeasures() {
  return (await db.getAll('measures')).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

/** Supprime toutes les mesures d'une version de l'algorithme (après leur réanalyse). Renvoie leur nombre. */
export async function deleteMeasuresByAlgo(algoVersion) {
  const ids = (await db.getAll('measures')).filter((m) => m.algoVersion === algoVersion).map((m) => m.id);
  if (ids.length) await db.deleteMany('measures', ids);
  return ids.length;
}
