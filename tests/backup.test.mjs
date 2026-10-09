import test from 'node:test';
import assert from 'node:assert/strict';
import { checkBackup, BACKUP_FORMAT_VERSION } from '../js/data/backup.js';

const v1 = {
  format: 'ohmaparole-backup', formatVersion: 1, exportedAt: '2026-10-01T08:00:00.000Z', appVersion: 'x',
  data: { meta: [{ key: 'why', value: 'Être clair' }], sessions: [{ id: 's1' }], recordings: [{ id: 'r1', kind: 'reference', milestone: 1 }] },
  audio: { r1: { mimeType: 'audio/webm', base64: 'AAAA' } },
};

test('sauvegarde : le format passe en v2, avec le store measures', () => {
  assert.equal(BACKUP_FORMAT_VERSION, 2);
  const m = [{ id: 'r1:debit:acoustics-2', metric: 'debit', value: 6.1 }];
  const p = checkBackup({ ...v1, formatVersion: 2, data: { ...v1.data, measures: m } });
  assert.deepEqual(p.data.measures, m);
});

test('une sauvegarde v1 reste lisible : mesures vides, tout le reste intact', () => {
  const p = checkBackup(v1);
  assert.deepEqual(p.data.measures, []);
  assert.deepEqual(p.data.sessions, v1.data.sessions);
  assert.deepEqual(p.data.recordings, v1.data.recordings);
  assert.deepEqual(p.audio, v1.audio);
});

test('un fichier qui n’est pas une sauvegarde est refusé', () => {
  for (const bad of [null, {}, { ...v1, format: 'autre' }, { ...v1, formatVersion: 3 }]) {
    assert.throws(() => checkBackup(bad), /pas une sauvegarde OhMaParole/);
  }
});
