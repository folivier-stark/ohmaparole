import * as db from './db.js';

/**
 * Format de sauvegarde.
 * - 1 : meta, sessions, recordings, audio (V1).
 * - 2 : + measures (spec V2 §8). Une sauvegarde v1 reste lisible : ses références n'ont pas encore de
 *   mesures, la réanalyse du démarrage les calcule depuis les Blobs (js/audio/voice-measure.js).
 */
export const BACKUP_FORMAT_VERSION = 2;
const READABLE_VERSIONS = [1, 2];

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function exportAll(appVersion) {
  const [meta, sessions, recordings, audio, measures] = await Promise.all(
    ['meta', 'sessions', 'recordings', 'audio', 'measures'].map((s) => db.getAll(s)),
  );
  const audioOut = {};
  for (const a of audio) audioOut[a.id] = { mimeType: a.blob.type, base64: await blobToBase64(a.blob) };
  const payload = {
    format: 'ohmaparole-backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: { meta, sessions, recordings, measures },
    audio: audioOut,
  };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

/** Vérifie le format (v1 ou v2) et complète une sauvegarde v1 : `data.measures` vaut alors []. */
export function checkBackup(p) {
  if (!p || p.format !== 'ohmaparole-backup' || !READABLE_VERSIONS.includes(p.formatVersion)) {
    throw new Error("Ce fichier n'est pas une sauvegarde OhMaParole.");
  }
  const data = p.data ?? {};
  return {
    ...p,
    data: {
      meta: data.meta ?? [], sessions: data.sessions ?? [], recordings: data.recordings ?? [],
      measures: Array.isArray(data.measures) ? data.measures : [],
    },
    audio: p.audio ?? {},
  };
}

export async function readBackup(file) {
  let p;
  try {
    p = JSON.parse(await file.text());
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde OhMaParole.");
  }
  return checkBackup(p);
}

/** Fusion par id (upsert), aucune suppression. */
export async function importBackup(raw) {
  const p = checkBackup(raw);
  await db.putMany('meta', p.data.meta.filter((m) => m.key !== 'lastBackupAt'));
  await db.putMany('sessions', p.data.sessions);
  await db.putMany('audio', Object.entries(p.audio).map(([id, a]) => ({ id, blob: base64ToBlob(a.base64, a.mimeType) })));
  await db.putMany('recordings', p.data.recordings);
  await db.putMany('measures', p.data.measures);
  return { sessions: p.data.sessions.length, recordings: p.data.recordings.length, measures: p.data.measures.length };
}
