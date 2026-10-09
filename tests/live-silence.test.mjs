import test from 'node:test';
import assert from 'node:assert/strict';
import {
  heldSilence, liveThreshold, latestCalibration, POSTURE_MIC, postureMicConfig, liveRows, LIVE_VERSION,
  secondsText, postureSupportLine, eclairLabels, DEFAULT_ROOM_MARGIN_DB,
} from '../js/core/live-silence.js';
import { speechThreshold } from '../js/core/acoustics.js';
import { readJson } from './helpers.mjs';

const T = -40;
/** Niveaux toutes les 50 ms : [[durée ms, dB], …] à partir de t0. */
function lv(parts, t0 = 1000) {
  const out = [];
  let t = t0;
  for (const [ms, db] of parts) for (let k = 0; k < ms / 50; k++) { out.push({ t, db }); t += 50; }
  return out;
}
const S = -20; // parole
const N = -60; // silence de la pièce

test('heldSilence : attente, parole, silence tenu, puis reprise', () => {
  const levels = lv([[600, N], [1500, S], [4000, N], [800, S]]);
  const r = heldSilence(levels, { thresholdDb: T, startAt: 1000 });
  assert.equal(r.phase, 'reprise');
  assert.equal(r.onset, 1600);
  assert.equal(r.latencyMs, 600, 'délai avant de parler');
  assert.equal(r.silenceStart, 3100);
  assert.equal(r.silenceHeldMs, 4000);
  assert.equal(r.speechOnset, 7100);
  assert.equal(r.interrupted, false);
});

test('heldSilence : une pause dans la phrase (moins de 1,5 s) n’est pas le silence de l’exercice', () => {
  const levels = lv([[1000, S], [900, N], [1000, S], [2500, N]]);
  const r = heldSilence(levels, { thresholdDb: T, startAt: 1000 });
  assert.equal(r.phase, 'silence');
  assert.equal(r.silenceStart, 3900);
  assert.equal(r.silenceHeldMs, 2450, 'jusqu’au dernier niveau');
});

test('heldSilence : un bruit bref (vibreur, tap) ne coupe pas le silence', () => {
  const levels = lv([[1000, S], [3000, N], [100, S], [3000, N]]);
  const r = heldSilence(levels, { thresholdDb: T, startAt: 1000 });
  assert.equal(r.phase, 'silence');
  assert.equal(r.silenceStart, 2000);
  assert.equal(r.silenceHeldMs, 6050);
});

test('heldSilence : en parole, pas encore de silence ; sans parole, attente', () => {
  assert.equal(heldSilence(lv([[2000, S]]), { thresholdDb: T, startAt: 1000 }).phase, 'parole');
  const w = heldSilence(lv([[3000, N]]), { thresholdDb: T, startAt: 1000 });
  assert.equal(w.phase, 'attente');
  assert.equal(w.waitingMs, 2950);
  assert.equal(w.latencyMs, null);
});

test('heldSilence : une interruption (trou, pas de signal, page cachée) rend la mesure aveugle', () => {
  const gap = [...lv([[1000, S], [500, N]]), ...lv([[2000, N]], 3500)];
  const r = heldSilence(gap, { thresholdDb: T, startAt: 1000 });
  assert.equal(r.interrupted, true);
  assert.equal(r.interruption, 'trou');
  assert.equal(r.silenceHeldMs, null);
  const hidden = lv([[1000, S], [2000, N]]);
  hidden[30] = { ...hidden[30], interruption: 'cache' };
  assert.equal(heldSilence(hidden, { thresholdDb: T, startAt: 1000 }).interruption, 'cache');
  assert.throws(() => heldSilence([], {}), RangeError);
});

test('liveThreshold : seuil de la calibration, jamais sous le bruit de la pièce + 6 dB', () => {
  const room = lv([[1500, -62]]);
  const cal = { noiseDb: -65, speechDb: -25 };
  const r = liveThreshold({ calibration: cal, roomLevels: room });
  assert.equal(r.source, 'calibration');
  assert.ok(Math.abs(r.thresholdDb - speechThreshold(-65, -25)) < 1e-9);
  assert.equal(r.tooNoisy, false);
  const loud = liveThreshold({ calibration: cal, roomLevels: lv([[1500, -50]]) });
  assert.equal(loud.thresholdDb, -44, 'pièce plus bruyante que la calibration : bruit + 6 dB');
});

test('liveThreshold : sans calibration, bruit de la pièce + marge prudente', () => {
  const r = liveThreshold({ calibration: null, roomLevels: lv([[1500, -62]]) });
  assert.equal(r.source, 'defaut');
  assert.equal(r.thresholdDb, -62 + DEFAULT_ROOM_MARGIN_DB);
  assert.equal(DEFAULT_ROOM_MARGIN_DB, 12);
  // Pièce trop bruyante : on ne mesure pas.
  assert.equal(liveThreshold({ calibration: null, roomLevels: lv([[1500, -15]]) }).tooNoisy, true);
  // Pas assez d'écoute de la pièce : pas de mesure.
  assert.equal(liveThreshold({ calibration: null, roomLevels: lv([[200, -62]]) }).thresholdDb, null);
});

test('latestCalibration : niveaux de la dernière prise de voix valide', () => {
  const rows = [
    { kind: 'calibration', metric: 'debit', createdAt: 1, context: { noiseDb: -70, speechDb: -30 } },
    { kind: 'controle', metric: 'debit', createdAt: 5, context: { noiseDb: -66, speechDb: -28 } },
    { kind: 'reference-v1', metric: 'debit', createdAt: 9, context: { noiseDb: -50, speechDb: -20 } },
    { kind: 'controle', metric: 'pausePct', createdAt: 7, context: {} },
  ];
  assert.deepEqual(latestCalibration(rows), { noiseDb: -66, speechDb: -28 });
  assert.equal(latestCalibration([]), null);
});

test('POSTURE_MIC : seulement les exercices dont la consigne a un silence ou une pause chiffrés', () => {
  const items = new Map(readJson('content/fr/exercises.json').items.map((i) => [i.id, i]));
  assert.deepEqual(Object.keys(POSTURE_MIC), ['fr.P03', 'fr.P04', 'fr.P14', 'fr.P22', 'fr.P23', 'fr.P24']);
  for (const [id, c] of Object.entries(POSTURE_MIC)) {
    const it = items.get(id);
    assert.ok(it, id);
    assert.equal(it.bloc, 'posture');
    assert.match(it.consigne.join(' '), /silence|tais-toi|attends|compte jusqu/i, id);
    assert.ok(['silence', 'delai'].includes(c.mesure));
    assert.ok(c.cibleSec >= 2 && c.cibleSec <= 8);
  }
  assert.equal(POSTURE_MIC['fr.P23'].cibleSec, 8);
  assert.equal(POSTURE_MIC['fr.P03'].mesure, 'delai');
  assert.equal(postureMicConfig('fr.P18'), null, 'P18 : monologue de 60 s, pauses de réflexion, sans durée de silence');
  assert.equal(postureMicConfig('fr.P09'), null, 'P09 : le passage lu par l’appli n’existe pas dans le bloc posture');
});

test('liveRows : des nombres seulement, en secondes, avec la version des mesures en direct', () => {
  const rows = liveRows({
    sessionId: 's1', dateKey: '2026-10-10', createdAt: 5, kind: 'posture', trial: 2,
    values: { silenceTenu: 7860, delaiReponse: null }, context: { exercise: 'fr.P23', cibleSec: 8, seuil: 'calibration' },
  });
  assert.deepEqual(rows, [{
    id: 's1:posture:fr.P23:2:silenceTenu', recordingId: null, sessionId: 's1', dateKey: '2026-10-10', createdAt: 5,
    kind: 'posture', metric: 'silenceTenu', value: 7.9, algoVersion: LIVE_VERSION, snrDb: null,
    context: { exercise: 'fr.P23', cibleSec: 8, seuil: 'calibration' },
  }]);
  assert.equal(LIVE_VERSION, 'live-1');
});

test('secondsText : arrondi à 0,5 s, à la française', () => {
  assert.equal(secondsText(7.86), '8 s');
  assert.equal(secondsText(7.6), '7,5 s');
  assert.equal(secondsText(0.2), '0 s');
  assert.equal(secondsText(null), '–');
});

const P = (value, createdAt, exercise = 'fr.P23', cibleSec = 8) =>
  ({ kind: 'posture', metric: 'silenceTenu', value, createdAt, context: { exercise, cibleSec } });

test('postureSupportLine : environ X s, puis le départ et la zone cible à partir de 3 mesures', () => {
  assert.equal(postureSupportLine([]), null);
  assert.equal(postureSupportLine([P(4.1, 1), P(5.2, 2)]), 'Silence tenu après une question : environ 4,5 s.');
  const rows = [P(3, 1), P(4, 2), P(5, 3, 'fr.P04', 5), P(8.2, 4), P(9, 5), P(8.4, 6)];
  assert.equal(postureSupportLine(rows), 'Silence tenu après une question : environ 8,5 s (au départ : 4 s). Tenu jusqu’au signal 4 fois sur les 5 dernières.');
  // Le silence après un « non » (P22) et le délai (P03) ne comptent pas dans cette ligne.
  const other = [P(1, 1, 'fr.P22', 4), { kind: 'posture', metric: 'delaiReponse', value: 2, createdAt: 2, context: { exercise: 'fr.P03' } }];
  assert.equal(postureSupportLine(other), null);
});

test('eclairLabels : les zones de R §3.3, sans note', () => {
  assert.deepEqual(eclairLabels({ delaiSec: 0.6, silenceSec: 5, tenu: true, dureeSec: 14 }),
    ['Délai : du tac au tac', 'Silence : tenu jusqu’au signal', 'Durée de ta réponse : environ 14 s']);
  assert.deepEqual(eclairLabels({ delaiSec: 2, silenceSec: 2.2, tenu: false, dureeSec: null }),
    ['Délai : posé', 'Silence : repris après 2 s']);
  assert.deepEqual(eclairLabels({ delaiSec: 4.2 }), ['Délai : temps de réflexion']);
  assert.deepEqual(eclairLabels({}), []);
});
