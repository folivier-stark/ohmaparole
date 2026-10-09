import * as db from './db.js';

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
  const [meta, sessions, recordings, audio] = await Promise.all(['meta', 'sessions', 'recordings', 'audio'].map((s) => db.getAll(s)));
  const audioOut = {};
  for (const a of audio) audioOut[a.id] = { mimeType: a.blob.type, base64: await blobToBase64(a.blob) };
  const payload = {
    format: 'ohmaparole-backup',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: { meta, sessions, recordings },
    audio: audioOut,
  };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

export async function readBackup(file) {
  const p = JSON.parse(await file.text());
  if (p.format !== 'ohmaparole-backup' || p.formatVersion !== 1) {
    throw new Error("Ce fichier n'est pas une sauvegarde OhMaParole.");
  }
  return p;
}

/** Fusion par id (upsert), aucune suppression. */
export async function importBackup(p) {
  await db.putMany('meta', p.data.meta.filter((m) => m.key !== 'lastBackupAt'));
  await db.putMany('sessions', p.data.sessions);
  await db.putMany('audio', Object.entries(p.audio).map(([id, a]) => ({ id, blob: base64ToBlob(a.base64, a.mimeType) })));
  await db.putMany('recordings', p.data.recordings);
  return { sessions: p.data.sessions.length, recordings: p.data.recordings.length };
}
