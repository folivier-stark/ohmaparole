// Mesure d'une prise et réanalyse des références (js/audio/voice-measure.js), sous Node.
// Web Audio est simulé : chaque Blob porte le nom du signal synthétique que le faux décodeur renvoie.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALGO_VERSION } from '../js/core/acoustics.js';
import { measureTake, takeRows, reanalyzeReferences } from '../js/audio/voice-measure.js';
import { reading, addClick } from './signals.mjs';

const TARGET = 16000;
const GROUPS = [{ n: 8, pauseAfter: 0.4 }, { n: 6, pauseAfter: 0.4 }, { n: 7, pauseAfter: 0.4 }, { n: 8 }];
const SIGNALS = {
  v2: reading(GROUPS).samples,
  // Référence V1 : pas de silence initial, le vibreur au démarrage de la prise.
  v1: addClick(reading(GROUPS, { leadSec: 0.6 }).samples, { kind: 'buzz', at: 0.02, amp: 0.1 }),
  bruit: reading(GROUPS, { noiseRms: 0.05 }).samples,
};
const SYLL = 29;

class FakeAudioBuffer {
  constructor(data) { this.data = data; this.sampleRate = TARGET; this.length = data.length; this.numberOfChannels = 1; }
  getChannelData() { return this.data; }
}
function installOffline() {
  globalThis.OfflineAudioContext = class {
    constructor(c, l, sr) { this.sampleRate = sr; }
    async decodeAudioData(buf) {
      const name = new TextDecoder().decode(buf);
      if (!SIGNALS[name]) throw new Error('EncodingError');
      return new FakeAudioBuffer(SIGNALS[name]);
    }
  };
}
const blobOf = (name) => new Blob([name], { type: 'audio/webm' });

test('measureTake : prise valide, mesures et CV de débit (jamais affiché, mais stocké)', async () => {
  installOffline();
  const r = await measureTake(blobOf('v2'), SYLL);
  assert.equal(r.valid, true);
  assert.equal(r.reason, null);
  assert.ok(r.metrics.debit > 3 && r.metrics.debit < 8, `débit ${r.metrics.debit}`);
  assert.equal(r.metrics.pauseCount, 3);
  assert.ok(r.cv === null || Number.isFinite(r.cv));
  assert.equal(r.analysis.algoVersion, ALGO_VERSION);
});

test('measureTake : refus et échec de décodage, sans jamais rejeter', async () => {
  installOffline();
  const noisy = await measureTake(blobOf('bruit'), SYLL);
  assert.equal(noisy.valid, false);
  assert.equal(noisy.reason, 'bruit');
  assert.equal(noisy.metrics, null);
  assert.equal((await measureTake(blobOf('illisible'), SYLL)).reason, 'decodage');
  assert.equal((await measureTake(null, SYLL)).reason, 'decodage');
});

test('takeRows : 5 lignes par prise valide, contexte : leadSilent et niveaux de la prise', async () => {
  installOffline();
  const r = await measureTake(blobOf('v2'), SYLL);
  const rows = takeRows({ id: 'r1', sessionId: 's1', dateKey: '2026-10-10', createdAt: 1 }, 'calibration', r);
  assert.ok(rows.length >= 4);
  assert.ok(rows.every((x) => x.kind === 'calibration' && x.algoVersion === ALGO_VERSION && x.snrDb > 20));
  assert.equal(rows[0].context.leadSilent, true);
  assert.deepEqual(Object.keys(rows[0].context).sort(), ['leadSilent', 'noiseDb', 'speechDb'], 'niveaux pour le seuil en direct');
  assert.ok(Number.isFinite(rows[0].context.noiseDb) && Number.isFinite(rows[0].context.speechDb));
  assert.deepEqual(takeRows({ id: 'r', dateKey: 'd', createdAt: 1 }, 'calibration', { valid: false }), []);
});

function fakeRepo({ recordings, audio, measures = [], meta = {} }) {
  const store = { measures: [...measures], meta: { ...meta } };
  return {
    store,
    listRecordings: async () => recordings,
    listMeasures: async () => [...store.measures],
    getAudio: async (id) => (audio[id] ? blobOf(audio[id]) : null),
    saveMeasures: async (rows) => {
      for (const r of rows) {
        const i = store.measures.findIndex((m) => m.id === r.id);
        if (i >= 0) store.measures[i] = r; else store.measures.push(r);
      }
    },
    deleteMeasuresByAlgo: async (v, kinds = null) => {
      const before = store.measures.length;
      store.measures = store.measures.filter((m) => !(m.algoVersion === v && (!kinds || kinds.includes(m.kind))));
      return before - store.measures.length;
    },
    getMeta: async (k, d = null) => (k in store.meta ? store.meta[k] : d),
    setMeta: async (k, v) => { store.meta[k] = v; },
  };
}

test('reanalyzeReferences : références V1 en reference-v1, prises de voix à leur type, ancien algorithme remplacé', async () => {
  installOffline();
  const recordings = [
    { id: 'j1', kind: 'reference', milestone: 1, sessionId: null, dateKey: '2026-09-01', createdAt: 1 },
    { id: 'c1', kind: 'reference', milestone: null, voiceCheck: 'calibration', sessionId: 's1', dateKey: '2026-10-10', createdAt: 2 },
    { id: 'k1', kind: 'reference', milestone: null, voiceCheck: 'controle', sessionId: 's2', dateKey: '2026-10-20', createdAt: 3 },
    { id: 'noisy', kind: 'reference', milestone: 7, sessionId: 's0', dateKey: '2026-09-08', createdAt: 4 },
    { id: 'art', kind: 'session', sessionId: 's1', dateKey: '2026-10-10', createdAt: 5 },
    { id: 'part', kind: 'partial', sessionId: 's1', dateKey: '2026-10-10', createdAt: 6 },
    { id: 'gone', kind: 'reference', milestone: 14, sessionId: 's3', dateKey: '2026-09-15', createdAt: 7 },
    { id: 'sp', kind: 'spontane', sessionId: 's4', dateKey: '2026-10-21', createdAt: 8 },
    { id: 'ecl', kind: 'eclair', sessionId: 's5', dateKey: '2026-10-25', createdAt: 9 },
    // Bilan : la référence (prise « reference » + voiceCheck 'bilan'), un inédit, la présentation.
    { id: 'bref', kind: 'reference', voiceCheck: 'bilan', itemId: 'fr.REF1', sessionId: 'b1', dateKey: '2026-10-30', createdAt: 10, forme: 'moyen', bilanIndex: 1 },
    { id: 'bta', kind: 'bilan', itemId: 'fr.TA', sessionId: 'b1', dateKey: '2026-10-30', createdAt: 11, forme: 'moyen', bilanIndex: 1 },
    { id: 'bpr', kind: 'bilan', itemId: 'presentation', sessionId: 'b1', dateKey: '2026-10-30', createdAt: 12, forme: 'moyen', bilanIndex: 1 },
  ];
  const audio = { j1: 'v1', c1: 'v2', k1: 'v2', noisy: 'bruit', art: 'v2', part: 'v2', sp: 'v2', ecl: 'v2', bref: 'v2', bta: 'v2', bpr: 'v2' };
  const old = [{ id: 'c1:debit:acoustics-1', recordingId: 'c1', metric: 'debit', value: 5, algoVersion: 'acoustics-1', kind: 'calibration' }];
  // k1 a déjà ses mesures à la version courante (prise de la séance) : pas de nouveau décodage.
  const current = [{ id: `k1:debit:${ALGO_VERSION}`, recordingId: 'k1', metric: 'debit', value: 6.2, algoVersion: ALGO_VERSION, kind: 'controle' }];
  // Une mesure en direct (posture) n'a pas de Blob : elle survit à la réanalyse.
  const live = [{ id: 's9:posture:fr.P23:1:silenceTenu', recordingId: null, metric: 'silenceTenu', value: 8, algoVersion: 'live-1', kind: 'posture' }];
  const repo = fakeRepo({ recordings, audio, measures: [...old, ...current, ...live] });

  const r = await reanalyzeReferences({ repo, syllables: SYLL, syllablesById: { 'fr.TA': 87 } });
  assert.deepEqual(r, { analyzed: 6, refused: 1, missing: 1, deleted: 1 });
  const bil = repo.store.measures.filter((m) => m.kind === 'bilan');
  assert.deepEqual([...new Set(bil.map((m) => m.context.texte))].sort(), ['fr.REF1', 'fr.TA', 'presentation']);
  assert.ok(bil.every((m) => m.context.forme === 'moyen' && m.context.bilan === 1), 'forme du jour dans le contexte de toutes les mesures du bilan');
  assert.ok(bil.some((m) => m.context.texte === 'presentation' && m.metric === 'pausePctSpontane'));
  assert.equal(bil.some((m) => m.context.texte === 'presentation' && m.metric === 'debit'), false);
  const kinds = Object.fromEntries(repo.store.measures.filter((m) => m.metric === 'debit').map((m) => [m.recordingId, m.kind]));
  assert.deepEqual(kinds, { j1: 'reference-v1', c1: 'calibration', k1: 'controle', bref: 'bilan', bta: 'bilan' });
  // Parole spontanée : % de pause, sans débit (pas de texte). La réplique éclair n'est pas réanalysée.
  assert.deepEqual(repo.store.measures.filter((m) => m.recordingId === 'sp').map((m) => m.metric).sort(), ['dureeSpontane', 'pauseCountSpontane', 'pausePctSpontane']);
  assert.equal(repo.store.measures.some((m) => m.recordingId === 'ecl'), false);
  assert.ok(repo.store.measures.filter((m) => m.kind !== 'posture').every((m) => m.algoVersion === ALGO_VERSION), 'plus aucune mesure de l’ancien algorithme');
  assert.ok(repo.store.measures.some((m) => m.algoVersion === 'live-1'), 'mesure en direct gardée');
  assert.equal(repo.store.measures.find((m) => m.id === `k1:debit:${ALGO_VERSION}`).value, 6.2, 'déjà à jour : intact');
  assert.equal(repo.store.meta.measuresAlgo, ALGO_VERSION);
  assert.deepEqual(repo.store.meta['measures.refused'], { algoVersion: ALGO_VERSION, ids: ['noisy'] }, 'un audio absent sera réessayé');
  // La référence V1 est analysée sans silence initial, vibreur ignoré : elle est valide.
  assert.ok(repo.store.measures.some((m) => m.recordingId === 'j1' && m.metric === 'pausePct'));

  // Deuxième démarrage : rien à refaire, les refus ne sont pas retentés (l'audio absent, si).
  const again = await reanalyzeReferences({ repo, syllables: SYLL, syllablesById: { 'fr.TA': 87 } });
  assert.deepEqual(again, { analyzed: 0, refused: 0, missing: 1, deleted: 0 });
});

test('reanalyzeReferences : attend la fin de la séance avant chaque décodage', async () => {
  installOffline();
  const recordings = [{ id: 'c1', kind: 'reference', voiceCheck: 'calibration', sessionId: 's1', dateKey: '2026-10-10', createdAt: 2 }];
  const repo = fakeRepo({ recordings, audio: { c1: 'v2' } });
  let busy = 3;
  const waits = [];
  const r = await reanalyzeReferences({
    repo, syllables: SYLL, shouldWait: () => busy-- > 0, sleep: async (ms) => { waits.push(ms); },
  });
  assert.equal(r.analyzed, 1);
  assert.equal(waits.length, 3);
});

test('scheduleReanalysis : demandée pendant une réanalyse (import), elle est relancée une fois à la fin', async () => {
  installOffline();
  const { scheduleReanalysis } = await import('../js/audio/voice-measure.js');
  const repo = fakeRepo({ recordings: [], audio: {} });
  let runs = 0;
  const list = repo.listRecordings;
  repo.listRecordings = async () => { runs += 1; return list(); };
  const first = scheduleReanalysis({ repo, syllables: SYLL, delayMs: 0 });
  scheduleReanalysis({ repo, syllables: SYLL, delayMs: 0 });
  scheduleReanalysis({ repo, syllables: SYLL, delayMs: 0 });
  await first;
  for (let i = 0; i < 50 && runs < 2; i++) await new Promise((r) => { setTimeout(r, 5); });
  await new Promise((r) => { setTimeout(r, 30); });
  assert.equal(runs, 2, 'une seule relance, quel que soit le nombre de demandes');
});
