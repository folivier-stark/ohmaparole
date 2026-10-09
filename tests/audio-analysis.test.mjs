// Câblage des modules navigateur js/audio/analyze.js et js/audio/live-level.js, sous Node.
// Web Audio n'existe pas sous Node : on le simule, le calcul lui-même est testé dans acoustics.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBlob, decodeToMono16k, AudioDecodeError, TARGET_RATE, V1_REFERENCE_OPTIONS } from '../js/audio/analyze.js';
import {
  measureSilenceAfter, createLevelMeter, openMicStream, LevelMeterError, BUTTERWORTH_Q_DB,
} from '../js/audio/live-level.js';
import { reading, addClick } from './signals.mjs';

// ─── Décodage (analyze.js) ──────────────────────────────────────────────────────────────

class FakeAudioBuffer {
  constructor(channels, sampleRate) {
    this.channels = channels;
    this.sampleRate = sampleRate;
    this.length = channels[0].length;
    this.duration = this.length / sampleRate;
    this.numberOfChannels = channels.length;
  }
  getChannelData(c) { return this.channels[c]; }
}

const calls = { offline: [] };
let decodeImpl = null;

function installOffline() {
  // Aucun AudioContext temps réel : le décodage passe par l'OfflineAudioContext à 16 kHz.
  globalThis.AudioContext = class { constructor() { throw new Error('AudioContext temps réel interdit au décodage'); } };
  globalThis.OfflineAudioContext = class {
    constructor(channels, length, sampleRate) {
      calls.offline.push({ channels, length, sampleRate });
      this.sampleRate = sampleRate;
    }
    decodeAudioData(buf, ok, ko) { return decodeImpl(buf, ok, ko, this); }
  };
}

const READING = [{ n: 8, pauseAfter: 0.4 }, { n: 6, pauseAfter: 0.15 }, { n: 7, pauseAfter: 0.4 }, { n: 8 }];
const blob = () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' });
const mono = (samples) => () => Promise.resolve(new FakeAudioBuffer([samples], TARGET_RATE));

test('analyzeBlob : décode directement à 16 kHz (anti-repliement de decodeAudioData), puis mesure', async () => {
  installOffline();
  calls.offline = [];
  const { samples, truth } = reading(READING);
  decodeImpl = mono(samples);
  const r = await analyzeBlob(blob(), truth.syllables);
  assert.deepEqual(calls.offline, [{ channels: 1, length: 1, sampleRate: 16000 }]);
  assert.equal(r.valid, true);
  assert.equal(r.reason, null);
  assert.equal(r.analysis.pauseCount, 2);
  assert.equal(r.metrics.pauseCount, 2);
  assert.ok(Math.abs(r.metrics.debit - truth.syllables / truth.D) < 0.1);
});

test('decodeToMono16k : un enregistrement stéréo est mixé en mono', async () => {
  installOffline();
  const left = Float32Array.from([0.2, 0.4, -0.6, 1]);
  const right = Float32Array.from([0, 0.4, 0.2, -1]);
  decodeImpl = () => Promise.resolve(new FakeAudioBuffer([left, right], TARGET_RATE));
  assert.deepEqual([...(await decodeToMono16k(blob()))].map((x) => +x.toFixed(6)), [0.1, 0.4, -0.2, 0]);
});

test('analyzeBlob : références V1, le vibreur du départ est ignoré', async () => {
  installOffline();
  const { samples, truth } = reading(READING, { leadSec: 0.6 });
  addClick(samples, { kind: 'buzz', at: 0.02, amp: 0.1 });
  decodeImpl = mono(samples);
  const r = await analyzeBlob(blob(), truth.syllables, V1_REFERENCE_OPTIONS);
  assert.equal(r.valid, true);
  assert.ok(Math.abs(r.analysis.speechStart - truth.start) < 0.03, `début ${r.analysis.speechStart}`);
});

test('analyzeBlob : une prise refusée garde son diagnostic, mais aucune mesure à stocker', async () => {
  installOffline();
  const { samples } = reading(READING, { noiseRms: 0.05 });
  decodeImpl = mono(samples);
  const r = await analyzeBlob(blob(), 86);
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'bruit');
  assert.ok(r.analysis.snrDb < 20);
  assert.equal(r.metrics, null);
});

test('analyzeBlob : décodage en rappel (anciens navigateurs)', async () => {
  installOffline();
  const { samples } = reading(READING);
  decodeImpl = (buf, ok) => { setTimeout(() => ok(new FakeAudioBuffer([samples], TARGET_RATE)), 0); };
  const out = await decodeToMono16k(blob());
  assert.equal(out.length, samples.length);
});

test('analyzeBlob : un échec de décodage ne rejette pas, il renvoie « decodage »', async () => {
  installOffline();
  decodeImpl = () => Promise.reject(new Error('EncodingError'));
  const r = await analyzeBlob(blob(), 86);
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'decodage');
  assert.equal(r.analysis, null);
  assert.equal(r.metrics, null);
  assert.match(r.error, /décoder/);
  assert.equal((await analyzeBlob(new Blob([]), 86)).reason, 'decodage');
  assert.equal((await analyzeBlob(null, 86)).reason, 'decodage');
  decodeImpl = mono(new Float32Array(0));
  assert.equal((await analyzeBlob(blob(), 86)).reason, 'decodage', 'audio de durée nulle');
  // Un navigateur qui ne rééchantillonnerait pas : refus explicite plutôt qu'une mesure fausse.
  decodeImpl = () => Promise.resolve(new FakeAudioBuffer([new Float32Array(480)], 48000));
  const wrongRate = await analyzeBlob(blob(), 86);
  assert.equal(wrongRate.reason, 'decodage');
  assert.match(wrongRate.error, /48000/);
});

test('decodeToMono16k : sans Web Audio, erreur explicite', async () => {
  delete globalThis.AudioContext;
  delete globalThis.OfflineAudioContext;
  await assert.rejects(decodeToMono16k(blob()), (e) => e instanceof AudioDecodeError && e.code === 'decodage');
});

// ─── Compteur de niveau (live-level.js) ─────────────────────────────────────────────────

class FakeTrack {
  constructor() { this.readyState = 'live'; this.muted = false; this.handlers = {}; }
  stop() { this.readyState = 'ended'; }
  addEventListener(k, f) { (this.handlers[k] ??= new Set()).add(f); }
  removeEventListener(k, f) { this.handlers[k]?.delete(f); }
  fire(k) { for (const f of this.handlers[k] ?? []) f(); }
}
class FakeStream {
  constructor() { this.track = new FakeTrack(); }
  getAudioTracks() { return [this.track]; }
  getTracks() { return [this.track]; }
}

const live = { level: 0.01, resume: 'ok', failSource: false, closed: 0, filters: [], contexts: [] };
const node = () => ({ connect() {}, disconnect() {} });

function installLive() {
  Object.assign(live, { level: 0.01, resume: 'ok', failSource: false, closed: 0, filters: [], contexts: [] });
  globalThis.AudioContext = class {
    constructor() { this.sampleRate = 48000; this.state = 'suspended'; this.destination = {}; live.contexts.push(this); }
    createMediaStreamSource() { if (live.failSource) throw new Error('NotReadableError'); return node(); }
    createBiquadFilter() {
      const f = { type: '', frequency: { value: 0 }, Q: { value: 0 }, ...node() };
      live.filters.push(f);
      return f;
    }
    createAnalyser() {
      return {
        fftSize: 2048, smoothingTimeConstant: 0.8, ...node(),
        getFloatTimeDomainData(b) { for (let i = 0; i < b.length; i++) b[i] = live.level * Math.sin(i); },
      };
    }
    createGain() { return { gain: { value: 1 }, ...node() }; }
    resume() {
      if (live.resume === 'ok') { this.state = 'running'; return Promise.resolve(); }
      return new Promise(() => {}); // sans geste de Fred, la promesse reste en attente
    }
    close() { live.closed++; this.state = 'closed'; return Promise.resolve(); }
  };
}

// Les tests réels de minuterie tolèrent un trou large : la machine de test peut être chargée.
const LOOSE = { maxGapFactor: 50 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('createLevelMeter : contexte suspendu (pas de geste) : refusé, rien n’est mesuré', async () => {
  installLive();
  live.resume = 'jamais';
  const stream = new FakeStream();
  await assert.rejects(createLevelMeter(stream, { resumeTimeoutMs: 30 }),
    (e) => e instanceof LevelMeterError && e.code === 'suspendu');
  assert.equal(live.closed, 1, 'le contexte est fermé');
  assert.equal(stream.track.readyState, 'live', "le flux de l'appelant n'est pas coupé");
});

test('createLevelMeter : passe-haut 80 Hz et passe-bas 7 kHz, Q de Butterworth en dB', async () => {
  installLive();
  const meter = await createLevelMeter(new FakeStream(), { intervalMs: 20 });
  assert.equal(BUTTERWORTH_Q_DB, -3.0103);
  assert.deepEqual(live.filters.map((f) => [f.type, f.frequency.value, f.Q.value]),
    [['highpass', 80, -3.0103], ['lowpass', 7000, -3.0103]]);
  await wait(70);
  assert.ok(meter.latest().db > -60 && meter.latest().db < -30, `niveau ${meter.latest().db}`);
  await meter.close();
  assert.equal(meter.isClosed(), true);
});

test('createLevelMeter : micro illisible, le contexte est fermé (et le flux coupé s’il est à nous)', async () => {
  installLive();
  live.failSource = true;
  const stream = new FakeStream();
  await assert.rejects(createLevelMeter(stream, { stopTracksOnClose: true }),
    (e) => e instanceof LevelMeterError && e.code === 'micro');
  assert.equal(live.closed, 1);
  assert.equal(stream.track.readyState, 'ended');
});

test('createLevelMeter : stopTracksOnClose vrai par défaut seulement pour un flux d’openMicStream', async () => {
  installLive();
  const external = new FakeStream();
  await (await createLevelMeter(external, { intervalMs: 20 })).close();
  assert.equal(external.track.readyState, 'live', "flux de l'appelant : il le coupe lui-même");
  const own = new FakeStream();
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: async () => own }, configurable: true,
  });
  const stream = await openMicStream();
  await (await createLevelMeter(stream, { intervalMs: 20 })).close();
  assert.equal(own.track.readyState, 'ended', 'flux ouvert par openMicStream : coupé à la fermeture');
});

test('measureSilenceAfter : close() pendant la mesure, la promesse se résout « aborted »', async () => {
  installLive();
  const meter = await createLevelMeter(new FakeStream(), { intervalMs: 20 });
  const p = measureSilenceAfter(meter, { thresholdDb: -20, maxMs: 5000, ...LOOSE });
  await wait(60);
  await meter.close();
  const r = await p;
  assert.equal(r.aborted, true);
  assert.equal(r.done, false);
  // Déjà fermé : réponse immédiate.
  assert.equal((await measureSilenceAfter(meter, { thresholdDb: -20 })).aborted, true);
});

test('measureSilenceAfter : un micro qui ne rend que des zéros n’est pas un silence', async () => {
  installLive();
  const meter = await createLevelMeter(new FakeStream(), { intervalMs: 20 });
  live.level = 0;
  const r = await measureSilenceAfter(meter, { thresholdDb: -40, maxMs: 5000, ...LOOSE });
  assert.equal(r.interrupted, true);
  assert.equal(r.interruption, 'pas-de-signal');
  assert.equal(r.silenceHeldMs, null);
  await meter.close();
});

test('measureSilenceAfter : piste coupée par le système, mesure interrompue', async () => {
  installLive();
  const stream = new FakeStream();
  const meter = await createLevelMeter(stream, { intervalMs: 20 });
  const p = measureSilenceAfter(meter, { thresholdDb: -20, maxMs: 5000, ...LOOSE });
  await wait(50);
  stream.track.muted = true;
  stream.track.fire('mute');
  const r = await p;
  assert.equal(r.interrupted, true);
  assert.equal(r.interruption, 'micro');
  await meter.close();
});

test('measureSilenceAfter : contexte qui ne tourne plus, mesure refusée', async () => {
  const r = await measureSilenceAfter({ context: { state: 'suspended' }, onLevel: () => () => {} }, { thresholdDb: -40 });
  assert.equal(r.interrupted, true);
  assert.equal(r.interruption, 'suspendu');
});

// Faux compteur de niveau : on pousse les niveaux à la main.
function fakeMeter(history = []) {
  const listeners = new Set();
  const closers = new Set();
  return {
    listeners,
    intervalMs: 50,
    history: () => history.slice(),
    onLevel(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    onClose(cb) { closers.add(cb); return () => closers.delete(cb); },
    emit(level) { for (const cb of [...listeners]) cb(level); },
    close() { for (const cb of [...closers]) cb(); },
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
  assert.equal(r.interrupted, false);
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

test('measureSilenceAfter : niveaux trop espacés (arrière-plan), mesure interrompue', async () => {
  const meter = fakeMeter();
  const p = measureSilenceAfter(meter, { thresholdDb: -40, startAt: 0 });
  for (const l of script().filter((x) => x.t % 1000 === 0)) meter.emit(l);
  const r = await p;
  assert.equal(r.interrupted, true);
  assert.equal(r.interruption, 'trou');
  assert.equal(r.latencyMs, null);
});

test('measureSilenceAfter : délai maximal dépassé, mesure annulée, compteur fermé', async () => {
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

  const m3 = fakeMeter();
  const p3 = measureSilenceAfter(m3, { thresholdDb: -40, startAt: 0 });
  m3.emit({ t: 0, db: -60 });
  m3.close();
  assert.equal((await p3).aborted, true);
  await assert.rejects(measureSilenceAfter(fakeMeter(), {}), RangeError);
});

test('measureSilenceAfter : plus aucun niveau, la minuterie réelle rend la main (maxMs + 1 s)', async () => {
  const meter = fakeMeter();
  const t0 = Date.now();
  const r = await measureSilenceAfter(meter, { thresholdDb: -40, startAt: performance.now(), maxMs: 0 });
  const ms = Date.now() - t0;
  assert.ok(ms >= 900 && ms < 3000, `${ms} ms`);
  assert.equal(r.timedOut, true);
  assert.equal(r.interrupted, true);
  assert.equal(r.interruption, 'trou');
  assert.equal(meter.listeners.size, 0);
});
