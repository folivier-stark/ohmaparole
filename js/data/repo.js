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
