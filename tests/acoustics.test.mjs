import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSpeech, readingMetrics, speechRateCV, median, baseline, sdWithin, verdictReading,
  silenceTracker, speechThreshold, sessionMedians, defaultSd, DEFAULT_SD, CALM_DIRECTION, ALGO_VERSION,
} from '../js/core/acoustics.js';
import { SR, noise, addBurst, reading, clip } from './signals.mjs';

const near = (actual, expected, eps, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= eps, `${msg} attendu ${expected} ± ${eps}, obtenu ${actual}`);

// Lecture type : 6 groupes de souffle, 40 syllabes. Pauses imposées : 3 × 400 ms (comptées) et 2 × 150 ms (fusionnées).
const READING = [
  { n: 8, pauseAfter: 0.4 },
  { n: 6, pauseAfter: 0.15 },
  { n: 7, pauseAfter: 0.4 },
  { n: 8, pauseAfter: 0.15 },
  { n: 5, pauseAfter: 0.4 },
  { n: 6 },
];

test('analyzeSpeech : pauses de 400 ms comptées, 150 ms fusionnées, D à ±30 ms', () => {
  const { samples, truth } = reading(READING);
  const a = analyzeSpeech(samples, SR);
  assert.equal(a.valid, true);
  assert.equal(a.reason, null);
  assert.equal(a.algoVersion, ALGO_VERSION);
  assert.equal(a.pauseCount, 3, 'seules les 3 pauses de 400 ms restent');
  assert.equal(a.segments.length, 4);
  near(a.D, truth.D, 0.03, 'D');
  near(a.speechStart, truth.start, 0.03, 'début de parole');
  near(a.speechEnd, truth.end, 0.03, 'fin de parole');
  near(a.pauseTotal, truth.pauseTotal, 0.06, 'Σ pauses');
  for (let i = 1; i < a.segments.length; i++) {
    near(a.segments[i].start - a.segments[i - 1].end, 0.4, 0.03, `pause ${i}`);
  }
  assert.equal(a.leadSilent, true);
});

test('analyzeSpeech : rapport signal/bruit correct et prise non saturée', () => {
  const { samples } = reading(READING, { noiseRms: 0.001, amp: 0.3 });
  const a = analyzeSpeech(samples, SR);
  // Bruit à −60 dB efficaces ; salves à environ −13,5 dB au sommet : S − N d'environ 46 dB.
  near(a.noiseDb, -60, 1.5, 'plancher de bruit');
  assert.ok(a.snrDb >= 40 && a.snrDb <= 55, `snr ${a.snrDb}`);
  near(a.thresholdDb, a.noiseDb + 0.35 * (a.speechDb - a.noiseDb), 0.15, 'seuil T');
  assert.equal(a.clipRatio, 0);
});

test('readingMetrics : débit, % de pause et débit articulatoire cohérents', () => {
  const { samples, truth } = reading(READING);
  const a = analyzeSpeech(samples, SR);
  const m = readingMetrics(a, truth.syllables);
  near(m.debit, truth.syllables / truth.D, 0.1, 'débit');
  near(m.pausePct, truth.pauseTotal / truth.D, 0.01, '% de pause (fraction)');
  near(m.debitArticulatoire, truth.syllables / (truth.D - truth.pauseTotal), 0.15, 'débit articulatoire');
  assert.ok(m.debitArticulatoire > m.debit, 'sans les pauses, la bouche va plus vite');
  assert.equal(m.pausePct, a.pauseTotal / a.D);
});

test('analyzeSpeech : bruit trop fort, prise refusée (« bruit »)', () => {
  const { samples } = reading(READING, { noiseRms: 0.05, amp: 0.3 });
  const a = analyzeSpeech(samples, SR);
  assert.equal(a.valid, false);
  assert.equal(a.reason, 'bruit');
  assert.ok(a.snrDb < 20, `snr ${a.snrDb}`);
});

test('analyzeSpeech : saturation au-delà de 0,1 % des échantillons (« saturation »)', () => {
  const { samples } = reading(READING, { amp: 1.6 });
  const a = analyzeSpeech(clip(samples), SR);
  assert.equal(a.valid, false);
  assert.equal(a.reason, 'saturation');
  assert.ok(a.clipRatio > 0.001);
});

test('analyzeSpeech : quelques échantillons saturés (moins de 0,1 %) ne refusent pas la prise', () => {
  const { samples } = reading(READING);
  for (let i = 0; i < 50; i++) samples[40000 + i * 997] = 1;
  const a = analyzeSpeech(samples, SR);
  assert.ok(a.clipRatio > 0 && a.clipRatio <= 0.001);
  assert.equal(a.valid, true);
});

test('analyzeSpeech : signal trop court (« trop-court »)', () => {
  // Plus court que les 2 s de silence : rien à mesurer.
  const tiny = analyzeSpeech(noise(1.5, 0.001), SR);
  assert.equal(tiny.valid, false);
  assert.equal(tiny.reason, 'trop-court');
  assert.equal(tiny.D, 0);
  assert.deepEqual(tiny.segments, []);
  assert.equal(tiny.speechStart, null);
  // Silence de 2 s, puis 300 ms de parole seulement.
  const buf = noise(3.5, 0.001);
  addBurst(buf, 2, 0.3, 0.3);
  const short = analyzeSpeech(buf, SR);
  assert.equal(short.valid, false);
  assert.equal(short.reason, 'trop-court');
  assert.ok(short.D > 0 && short.D < 1);
  // Un tableau vide ne fait pas planter.
  assert.equal(analyzeSpeech(new Float32Array(0), SR).reason, 'trop-court');
});

test('analyzeSpeech : parole qui commence pendant les 2 s de silence', () => {
  // Fred lit dès 0,5 s : la parole est mesurée depuis 0,5 s, le bruit vient des silences de la prise.
  const { samples, truth } = reading(READING, { leadSec: 0.5 });
  const a = analyzeSpeech(samples, SR);
  assert.equal(a.valid, true);
  assert.equal(a.leadSilent, false);
  near(a.speechStart, truth.start, 0.03);
  near(a.D, truth.D, 0.03);
  assert.equal(a.pauseCount, 3);
});

test('analyzeSpeech : parole dès la 1re milliseconde, aucun silence dans les 2 premières secondes', () => {
  // Le 1er groupe dure 2,35 s : les 2 s « de silence » ne contiennent que de la parole.
  const { samples, truth } = reading([{ n: 12, pauseAfter: 0.4 }, ...READING.slice(1)], { leadSec: 0, tailSec: 2 });
  const a = analyzeSpeech(samples, SR);
  assert.equal(a.leadSilent, false);
  assert.equal(a.valid, true, 'le plancher de bruit est repris sur les silences de toute la prise');
  near(a.noiseDb, -60, 3);
  near(a.speechStart, 0, 0.03);
  near(a.D, truth.D, 0.03);
  assert.equal(a.pauseCount, 3);
});

test('analyzeSpeech : un décalage continu ne crée pas de fausse parole au début', () => {
  const { samples, truth } = reading(READING);
  for (let i = 0; i < samples.length; i++) samples[i] += 0.2;
  const a = analyzeSpeech(samples, SR);
  assert.equal(a.valid, true);
  near(a.speechStart, truth.start, 0.03);
});

test('analyzeSpeech : des zéros au démarrage du micro ne faussent pas le plancher de bruit', () => {
  // 300 ms de silence numérique (15 % du silence initial) : sans garde, N tomberait à −100 dB
  // et le bruit de la pièce passerait pour de la parole dès 0,3 s.
  const { samples, truth } = reading(READING);
  samples.fill(0, 0, Math.round(0.3 * SR));
  const a = analyzeSpeech(samples, SR);
  assert.equal(a.valid, true);
  near(a.noiseDb, -60, 1.5);
  near(a.speechStart, truth.start, 0.03);
  assert.equal(a.leadSilent, true);
});

test('analyzeSpeech : paramètres invalides', () => {
  assert.throws(() => analyzeSpeech(null, SR), TypeError);
  assert.throws(() => analyzeSpeech(new Float32Array(10), 0), RangeError);
});

test('analyzeSpeech : moins d’une seconde pour 30 s de signal à 16 kHz', () => {
  const groups = [];
  for (let i = 0; i < 20; i++) groups.push({ n: 6, pauseAfter: i % 3 === 0 ? 0.4 : 0.15 });
  const { samples } = reading(groups, { tailSec: 2 });
  assert.ok(samples.length >= 30 * SR, `${samples.length / SR} s`);
  const t0 = performance.now();
  const a = analyzeSpeech(samples, SR);
  const ms = performance.now() - t0;
  assert.equal(a.valid, true);
  assert.ok(ms < 1000, `${ms.toFixed(0)} ms`);
});

test('readingMetrics : D nul ou analyse absente, aucune division par zéro', () => {
  const none = { debit: null, pausePct: null, debitArticulatoire: null };
  assert.deepEqual(readingMetrics({ D: 0, pauseTotal: 0 }, 86), none);
  assert.deepEqual(readingMetrics(null, 86), none);
  assert.deepEqual(readingMetrics(analyzeSpeech(noise(1, 0.001), SR), 86), none);
  // Sans nombre de syllabes : le % de pause reste calculable, pas les débits.
  assert.deepEqual(readingMetrics({ D: 10, pauseTotal: 2 }, 0), { debit: null, pausePct: 0.2, debitArticulatoire: null });
  assert.deepEqual(readingMetrics({ D: 10, pauseTotal: 2 }, 80), { debit: 8, pausePct: 0.2, debitArticulatoire: 10 });
});

test('speechRateCV : un débit irrégulier d’un groupe de souffle à l’autre donne un CV plus grand', () => {
  // Groupes 1 et 3 : une syllabe toutes les 200 ms. Groupe 2 : toutes les 300 ms (trous de 150 ms, fusionnés).
  const irregular = reading([
    { n: 8, pauseAfter: 0.4 },
    { n: 6, gapSec: 0.15, pauseAfter: 0.4 },
    { n: 8 },
  ]);
  const a = analyzeSpeech(irregular.samples, SR);
  const r = speechRateCV(irregular.samples, SR, a, irregular.truth.syllables);
  assert.equal(r.groups, 3);
  assert.deepEqual(r.nucleiPerGroup, [8, 6, 8]);
  assert.equal(r.nuclei, 22);
  near(r.k, 1, 1e-12);
  near(r.rates[0], 8 / 1.55, 0.25);
  near(r.rates[1], 6 / 1.65, 0.25);
  assert.ok(r.cv > 0.12, `cv ${r.cv}`);
  assert.equal(r.algoVersion, ALGO_VERSION);

  const regular = reading([{ n: 8, pauseAfter: 0.4 }, { n: 8, pauseAfter: 0.4 }, { n: 8 }]);
  const b = analyzeSpeech(regular.samples, SR);
  const s = speechRateCV(regular.samples, SR, b, 24);
  assert.equal(s.groups, 3);
  assert.ok(s.cv < 0.03, `cv ${s.cv}`);
});

test('speechRateCV : k = syllabes du texte / noyaux détectés, groupes de moins d’1 s ignorés', () => {
  const sig = reading([{ n: 8, pauseAfter: 0.4 }, { n: 3, pauseAfter: 0.4 }, { n: 8 }]);
  const a = analyzeSpeech(sig.samples, SR);
  const r = speechRateCV(sig.samples, SR, a, 38);
  assert.equal(r.groups, 2, 'le groupe de 3 syllabes (550 ms) ne compte pas');
  assert.equal(r.nuclei, 19, 'mais ses noyaux entrent dans k');
  near(r.k, 2, 1e-12);
  near(r.rates[0], (2 * 8) / 1.55, 0.5);
  // Sans analyse exploitable : rien.
  assert.equal(speechRateCV(sig.samples, SR, { segments: [] }, 38).cv, null);
});

test('median', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([5]), 5);
  assert.equal(median([]), null);
  assert.equal(median([null, 6.2, undefined, Number.NaN, 6.0, 6.4]), 6.2, 'les prises non mesurées sont ignorées');
  const arr = [3, 1, 2];
  median(arr);
  assert.deepEqual(arr, [3, 1, 2], 'le tableau d’entrée n’est pas trié en place');
});

test('baseline : médiane des séances de calibration, rien avant 3 séances', () => {
  assert.equal(baseline([6.1, 6.5, 6.3]), 6.3);
  assert.equal(baseline([6.1, 6.5]), null);
  assert.equal(baseline([6.1, null, 6.5]), null);
  assert.equal(baseline([]), null);
});

test('sdWithin : max(écart type mesuré, valeur par défaut)', () => {
  near(sdWithin([6.0, 6.2, 6.4], 0.1), 0.2, 1e-12, 'mesuré plus grand');
  assert.equal(sdWithin([6.0, 6.01, 6.02], 0.24), 0.24, 'défaut plus prudent');
  assert.equal(sdWithin([6.0], 0.24), 0.24, 'un seul point : le défaut');
  assert.equal(sdWithin([], 0.24), 0.24);
  near(sdWithin([6.0, 6.2, 6.4]), 0.2, 1e-12, 'sans défaut : le mesuré');
  assert.equal(sdWithin([6.0]), null);
});

test('DEFAULT_SD : points médians des fourchettes de D §3.2', () => {
  assert.deepEqual(DEFAULT_SD.debit, { kind: 'relative', value: 0.04 });
  assert.deepEqual(DEFAULT_SD.debitArticulatoire, { kind: 'relative', value: 0.05 });
  assert.deepEqual(DEFAULT_SD.pausePct, { kind: 'absolute', value: 0.04 });
  assert.deepEqual(DEFAULT_SD.pauseCount, { kind: 'absolute', value: 1.5 });
  near(defaultSd('debit', 6), 0.24, 1e-12);
  assert.equal(defaultSd('pausePct', 0.12), 0.04);
  assert.equal(defaultSd('debit', null), null);
  assert.equal(defaultSd('inconnu', 6), null);
});

test('verdictReading : plus posé, pas de différence, plus rapide (|Δ| contre MDC95 = 2,77 × SDw)', () => {
  const sdw = 0.24; // MDC95 ≈ 0,66 syll/s
  assert.equal(verdictReading(6.0, 5.2, sdw, CALM_DIRECTION.debit), 'plus-pose');
  assert.equal(verdictReading(6.0, 5.5, sdw, CALM_DIRECTION.debit), 'pas-de-difference');
  assert.equal(verdictReading(6.0, 6.5, sdw, CALM_DIRECTION.debit), 'pas-de-difference');
  assert.equal(verdictReading(6.0, 6.8, sdw, CALM_DIRECTION.debit), 'plus-rapide');
  // % de pause : plus de pauses = plus posé.
  assert.equal(verdictReading(0.1, 0.25, 0.04, CALM_DIRECTION.pausePct), 'plus-pose');
  assert.equal(verdictReading(0.25, 0.1, 0.04, CALM_DIRECTION.pausePct), 'plus-rapide');
  assert.equal(verdictReading(0.1, 0.15, 0.04, CALM_DIRECTION.pausePct), 'pas-de-difference');
  // Le sens par défaut est celui du débit.
  assert.equal(verdictReading(6.0, 5.2, sdw), 'plus-pose');
  // Données manquantes : pas de verdict.
  assert.equal(verdictReading(null, 5.2, sdw, -1), null);
  assert.equal(verdictReading(6.0, 5.2, 0, -1), null);
});

test('sessionMedians : médiane des 3 prises d’une séance, prises invalides ignorées', () => {
  const takes = [
    { debit: 6.2, pausePct: 0.1, debitArticulatoire: 7 },
    { debit: null, pausePct: null, debitArticulatoire: null },
    { debit: 6.0, pausePct: 0.14, debitArticulatoire: 7.2 },
    { debit: 6.6, pausePct: 0.12, debitArticulatoire: 7.6 },
  ];
  assert.deepEqual(sessionMedians(takes), { debit: 6.2, pausePct: 0.12, debitArticulatoire: 7.2 });
  assert.deepEqual(sessionMedians([]), { debit: null, pausePct: null, debitArticulatoire: null });
});

test('speechThreshold : T = N + 0,35 × (S − N)', () => {
  near(speechThreshold(-60, -20), -46, 1e-9);
});

// Niveaux toutes les 50 ms. T = −40 dB, hystérésis ±3 dB : parole si ≥ −37, silence si < −43.
function levelsScript() {
  const out = [];
  for (let t = 0; t <= 4000; t += 50) {
    let db;
    if (t < 1000) db = t >= 600 && t < 900 ? -42 : -20; // la question, avec un creux de 300 ms à −42 dB
    else if (t < 3000) db = t === 2000 ? -20 : t >= 2200 && t <= 2400 ? -38 : -60; // silence, un clic, un souffle
    else db = -20; // Fred reprend la parole
    out.push({ t, db });
  }
  return out;
}

test('silenceTracker : silence tenu et délai avant de reparler, avec hystérésis', () => {
  const r = silenceTracker(levelsScript(), { thresholdDb: -40, startAt: 500 });
  assert.equal(r.done, true);
  assert.equal(r.state, 'reprise');
  assert.equal(r.silenceStart, 1000, 'le creux à −42 dB reste de la parole grâce à l’hystérésis');
  assert.equal(r.speechOnset, 3000, 'le clic de 50 ms et le souffle à −38 dB sont ignorés');
  assert.equal(r.silenceHeldMs, 2000);
  assert.equal(r.latencyMs, 2500);
  // Sans hystérésis, le creux de la question passerait pour le début du silence.
  const raw = silenceTracker(levelsScript(), { thresholdDb: -40, startAt: 500, hysteresisDb: 0 });
  assert.equal(raw.silenceStart, 600);
});

test('silenceTracker : déjà silencieux au départ, ou parole pas encore reprise', () => {
  const lv = levelsScript();
  const r = silenceTracker(lv, { thresholdDb: -40, startAt: 1500 });
  assert.equal(r.silenceStart, 1500);
  assert.equal(r.silenceHeldMs, 1500);
  assert.equal(r.latencyMs, 1500);
  const ongoing = silenceTracker(lv.filter((l) => l.t <= 2500), { thresholdDb: -40, startAt: 500 });
  assert.equal(ongoing.done, false);
  assert.equal(ongoing.state, 'silence');
  assert.equal(ongoing.silenceHeldMs, 1500, 'silence en cours, mesuré jusqu’au dernier niveau');
  assert.equal(ongoing.latencyMs, null);
  const waiting = silenceTracker(lv.filter((l) => l.t <= 800), { thresholdDb: -40, startAt: 500 });
  assert.equal(waiting.state, 'attente');
  assert.equal(waiting.silenceStart, null);
  assert.equal(silenceTracker([], { thresholdDb: -40 }).state, 'attente');
  assert.throws(() => silenceTracker(lv, {}), RangeError);
});
