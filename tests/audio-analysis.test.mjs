// Câblage des modules navigateur js/audio/analyze.js et js/audio/live-level.js, sous Node.
// Web Audio n'existe pas sous Node : on le simule, le calcul lui-même est testé dans acoustics.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBlob, decodeToMono16k, AudioDecodeError, TARGET_RATE } from '../js/audio/analyze.js';
import { measureSilenceAfter } from '../js/audio/live-level.js';
import { reading } from './signals.mjs';

class FakeAudioBuffer {
  constructor(data, sampleRate) {
    this.data = data;
    this.sampleRate = sampleRate;
    this.length = data.length;
    this.duration = data.length / sampleRate;
    this.numberOfChannels = 1;
  }
  getChannelData() { return this.data; }
}

const calls = { closed: 0, offline: null };
let decodeImpl = null;

function installWebAudio() {
  globalThis.AudioContext = class {
    decodeAudioData(buf, ok, ko) { return decodeImpl(buf, ok, ko); }
    close() { calls.closed++; return Promise.resolve(); }
  };
  globalThis.OfflineAudioContext = class {
    constructor(channels, length, sampleRate) {
      calls.offline = { channels, length, sampleRate };
      this.destination = {};
    }
    createBufferSource() {
      const self = this;
      return { connect() {}, start() {}, set buffer(b) { self.src = b; }, get buffer() { return self.src; } };
    }
    startRendering() {
      const { length, sampleRate } = calls.offline;
      return Promise.resolve(new FakeAudioBuffer(this.src.getChannelData(0).slice(0, length), sampleRate));
    }
  };
}

const READING = [{ n: 8, pauseAfter: 0.4 }, { n: 6, pauseAfter: 0.15 }, { n: 7, pauseAfter: 0.4 }, { n: 8 }];
const blob = () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' });

test('analyzeBlob : décode, rééchantillonne en mono 16 kHz, mesure', async () => {
  installWebAudio();
  const { samples, truth } = reading(READING);
  decodeImpl = () => Promise.resolve(new FakeAudioBuffer(samples, TARGET_RATE));
  calls.closed = 0;
  const r = await analyzeBlob(blob(), truth.syllables);
  assert.deepEqual(calls.offline, { channels: 1, length: samples.length, sampleRate: 16000 });
  assert.equal(calls.closed, 1, "l'AudioContext de décodage est fermé");
  assert.equal(r.valid, true);
  assert.equal(r.reason, null);
  assert.equal(r.analysis.pauseCount, 2);
  assert.ok(Math.abs(r.metrics.debit - truth.syllables / truth.D) < 0.1);
});

test('analyzeBlob : une prise refusée garde son diagnostic, mais aucune mesure à stocker', async () => {
  installWebAudio();
  const { samples } = reading(READING, { noiseRms: 0.05 });
  decodeImpl = () => Promise.resolve(new FakeAudioBuffer(samples, TARGET_RATE));
  const r = await analyzeBlob(blob(), 86);
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'bruit');
  assert.ok(r.analysis.snrDb < 20);
  assert.equal(r.metrics, null);
});

test('analyzeBlob : décodage en rappel (anciens navigateurs)', async () => {
  installWebAudio();
  const { samples } = reading(READING);
  decodeImpl = (buf, ok) => { setTimeout(() => ok(new FakeAudioBuffer(samples, TARGET_RATE)), 0); };
  const out = await decodeToMono16k(blob());
  assert.equal(out.length, samples.length);
});

test('analyzeBlob : un échec de décodage ne rejette pas, il renvoie « decodage »', async () => {
  installWebAudio();
  calls.closed = 0;
  decodeImpl = () => Promise.reject(new Error('EncodingError'));
  const r = await analyzeBlob(blob(), 86);
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'decodage');
  assert.equal(r.analysis, null);
  assert.equal(r.metrics, null);
  assert.match(r.error, /décoder/);
  assert.equal(calls.closed, 1, "l'AudioContext est fermé même en cas d'échec");
  const empty = await analyzeBlob(new Blob([]), 86);
  assert.equal(empty.reason, 'decodage');
  assert.equal((await analyzeBlob(null, 86)).reason, 'decodage');
  decodeImpl = () => Promise.resolve(new FakeAudioBuffer(new Float32Array(0), TARGET_RATE));
  assert.equal((await analyzeBlob(blob(), 86)).reason, 'decodage', 'audio de durée nulle');
});

test('decodeToMono16k : sans Web Audio, erreur explicite', async () => {
  delete globalThis.AudioContext;
  delete globalThis.OfflineAudioContext;
  await assert.rejects(decodeToMono16k(blob()), (e) => e instanceof AudioDecodeError && e.code === 'decodage');
});

// Faux compteur de niveau : on pousse les niveaux à la main.
function fakeMeter(history = []) {
  const listeners = new Set();
  return {
    listeners,
    history: () => history.slice(),
    onLevel(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    emit(level) { for (const cb of [...listeners]) cb(level); },
  };
}

// Même scénario que silenceTracker : question jusqu'à 1 000 ms, silence, reprise à 3 000 ms.
const script = () => {
  const out = [];
  for (let t = 0; t <= 4000; t += 50) out.push({ t, db: t < 1000 || t >= 3000 ? -20 : -60 });
  return out;
};

test('measureSilenceAfter : silence tenu et délai, puis désabonnement', async () => {
  const meter = fakeMeter();
  const p = measureSilenceAfter(meter, { thresholdDb: -40, startAt: 500 });
  for (const l of script()) meter.emit(l);
  const r = await p;
  assert.equal(r.done, true);
  assert.equal(r.silenceHeldMs, 2000);
  assert.equal(r.latencyMs, 2500);
  assert.equal(r.timedOut, false);
  assert.equal(meter.listeners.size, 0);
});

test('measureSilenceAfter : reprend les niveaux déjà reçus depuis startAt', async () => {
  const all = script();
  const meter = fakeMeter(all.filter((l) => l.t < 2000));
  const p = measureSilenceAfter(meter, { thresholdDb: -40, startAt: 500 });
  for (const l of all.filter((x) => x.t >= 2000)) meter.emit(l);
  const r = await p;
  assert.equal(r.silenceStart, 1000);
  assert.equal(r.speechOnset, 3000);
});

test('measureSilenceAfter : délai maximal dépassé, ou mesure annulée', async () => {
  const meter = fakeMeter();
  const p = measureSilenceAfter(meter, { thresholdDb: -40, startAt: 0, maxMs: 1000 });
  for (let t = 0; t <= 1500; t += 50) meter.emit({ t, db: -60 });
  const r = await p;
  assert.equal(r.timedOut, true);
  assert.equal(r.done, false);
  assert.equal(r.silenceHeldMs, 1000);
  assert.equal(meter.listeners.size, 0);

  const ac = new AbortController();
  const m2 = fakeMeter();
  const p2 = measureSilenceAfter(m2, { thresholdDb: -40, startAt: 0, signal: ac.signal });
  m2.emit({ t: 0, db: -60 });
  ac.abort();
  const r2 = await p2;
  assert.equal(r2.aborted, true);
  assert.equal(m2.listeners.size, 0);
  await assert.rejects(measureSilenceAfter(fakeMeter(), {}), RangeError);
});
