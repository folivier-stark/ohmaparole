import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CALIBRATION_SESSIONS, CONTROL_EVERY, voiceChecks, voiceCheckDue, calibrationRemaining, sessionsUntilControl,
  voiceJalonTag, voiceEchoes, voiceTimeline, abPair,
} from '../js/core/voice-plan.js';

let seq = 0;
/** Une prise de voix valide (seules les prises valides sont enregistrées). */
const take = (sessionId, voiceCheck, sessionNumber, dateKey, o = {}) => ({
  id: `r${++seq}`, kind: 'reference', milestone: null, voiceCheck, sessionId, sessionNumber, dateKey, createdAt: ++seq * 1000, ...o,
});
/** Une séance de voix de n prises valides. */
const check = (sessionId, voiceCheck, sessionNumber, dateKey, n = 3) =>
  Array.from({ length: n }, () => take(sessionId, voiceCheck, sessionNumber, dateKey));
const calibrated = () => [
  ...check('c1', 'calibration', 10, '2026-10-10'),
  ...check('c2', 'calibration', 11, '2026-10-11'),
  ...check('c3', 'calibration', 12, '2026-10-12'),
];

test('constantes du calendrier : 3 séances de calibration, un contrôle toutes les 6 séances', () => {
  assert.equal(CALIBRATION_SESSIONS, 3);
  assert.equal(CONTROL_EVERY, 6);
});

test('voiceChecks : regroupe les prises par séance, dans l’ordre, valide à partir de 2 prises', () => {
  const recs = [
    ...check('b', 'calibration', 11, '2026-10-11', 1),
    ...check('a', 'calibration', 10, '2026-10-10', 3),
    { id: 'v1', kind: 'reference', milestone: 7, sessionId: 'x', dateKey: '2026-09-01', createdAt: 1 },
    { id: 'p', kind: 'partial', voiceCheck: 'calibration', sessionId: 'a', dateKey: '2026-10-10', createdAt: 2 },
    { id: 's', kind: 'session', sessionId: 'a', dateKey: '2026-10-10', createdAt: 3 },
  ];
  // L'ordre d'entrée n'importe pas : tri par la première prise (celles de « b » ont été créées avant).
  const out = voiceChecks([...recs].reverse());
  assert.deepEqual(out.map((c) => [c.sessionId, c.kind, c.takes, c.valid, c.sessionNumber, c.dateKey]), [
    ['b', 'calibration', 1, false, 11, '2026-10-11'],
    ['a', 'calibration', 3, true, 10, '2026-10-10'],
  ]);
  assert.equal(out[1].recordingIds.length, 3);
  assert.equal(out[1].createdAt, Math.min(...recs.filter((r) => r.sessionId === 'a' && r.kind === 'reference').map((r) => r.createdAt)));
  assert.deepEqual(voiceChecks(null), []);
});

test('voiceCheckDue : calibration aux 3 premières séances après la mise à jour', () => {
  assert.equal(voiceCheckDue([], 0), 'calibration', 'nouvel utilisateur');
  assert.equal(voiceCheckDue([], 40), 'calibration', 'utilisateur V1 : la première séance après la mise à jour');
  const v1 = [{ id: 'j1', kind: 'reference', milestone: 1, createdAt: 1, dateKey: '2026-09-01' }];
  assert.equal(voiceCheckDue(v1, 40), 'calibration', 'les références V1 ne comptent pas comme calibration');
  const two = calibrated().slice(0, 6);
  assert.equal(voiceCheckDue(two, 11, { todayKey: '2026-10-13' }), 'calibration');
  assert.equal(voiceCheckDue(calibrated(), 12, { todayKey: '2026-10-13' }), null);
});

test('voiceCheckDue : une séance de calibration sans 2 prises valides ne compte pas, elle revient', () => {
  const recs = [...check('c1', 'calibration', 10, '2026-10-10'), ...check('c2', 'calibration', 11, '2026-10-11', 1)];
  assert.equal(voiceCheckDue(recs, 11, { todayKey: '2026-10-12' }), 'calibration');
  assert.equal(calibrationRemaining(recs), 2);
});

test('voiceCheckDue : jamais deux mesures de voix le même jour (3 occasions différentes, M §2.2)', () => {
  const recs = check('c1', 'calibration', 10, '2026-10-10');
  assert.equal(voiceCheckDue(recs, 10, { todayKey: '2026-10-10' }), null, '« Encore une ? » le même jour');
  assert.equal(voiceCheckDue(recs, 10, { todayKey: '2026-10-11' }), 'calibration');
  assert.equal(voiceCheckDue(recs, 10), 'calibration', 'sans date : pas de garde du jour');
});

test('voiceCheckDue : un contrôle toutes les 6 séances comptées depuis la dernière mesure de voix', () => {
  const recs = calibrated(); // dernière mesure à la séance 12
  for (let d = 12; d <= 16; d++) assert.equal(voiceCheckDue(recs, d, { todayKey: '2026-10-20' }), null, `dailyCount ${d}`);
  assert.equal(voiceCheckDue(recs, 17, { todayKey: '2026-10-20' }), 'controle', 'la séance 18');
  assert.equal(voiceCheckDue(recs, 25, { todayKey: '2026-10-20' }), 'controle', 'en retard : toujours dû');
  const after = [...recs, ...check('k1', 'controle', 18, '2026-10-18')];
  assert.equal(voiceCheckDue(after, 18, { todayKey: '2026-10-20' }), null);
  assert.equal(voiceCheckDue(after, 23, { todayKey: '2026-10-25' }), 'controle', 'la séance 24');
  // Un contrôle refusé (moins de 2 prises) ne remet pas le compteur à zéro.
  const failed = [...recs, ...check('k1', 'controle', 18, '2026-10-18', 1)];
  assert.equal(voiceCheckDue(failed, 18, { todayKey: '2026-10-19' }), 'controle');
});

test('sessionsUntilControl : séances à faire jusqu’au contrôle compris, null en calibration', () => {
  assert.equal(sessionsUntilControl([], 3), null);
  assert.equal(sessionsUntilControl(calibrated(), 12), 6);
  assert.equal(sessionsUntilControl(calibrated(), 16), 2);
  assert.equal(sessionsUntilControl(calibrated(), 17), 1, 'à la prochaine séance');
  assert.equal(sessionsUntilControl(calibrated(), 30), 1, 'en retard : jamais 0 ni négatif');
});

test('voiceJalonTag : la réplique de fin du bloc voix (jal-*)', () => {
  const recs = [
    ...calibrated(),
    ...check('k1', 'controle', 18, '2026-10-18'),
    ...check('k2', 'controle', 24, '2026-10-24'),
    ...check('k3', 'controle', 30, '2026-10-30'),
    ...check('k4', 'controle', 66, '2026-12-30'),
    ...check('bad', 'controle', 72, '2027-01-05', 1),
  ];
  const tag = (id, voiceCheck) => voiceJalonTag({ id, voiceCheck }, recs);
  assert.equal(tag('c1', 'calibration'), 'jalon:1', 'la toute première mesure : « ta voix de départ est au chaud »');
  assert.equal(tag('c2', 'calibration'), null);
  assert.equal(tag('k1', 'controle'), 'jalon:7', 'premier contrôle');
  assert.equal(tag('k2', 'controle'), 'jalon:14');
  assert.equal(tag('k3', 'controle'), 'jalon:30');
  assert.equal(tag('k4', 'controle'), 'jalon:60+');
  assert.equal(tag('bad', 'controle'), null, 'un bloc voix sans 2 prises valides ne se fête pas');
  assert.equal(voiceJalonTag({ id: 'x', milestone: 7 }, recs), null, 'séance sans bloc voix');
  assert.equal(voiceJalonTag(null, recs), null);
});

test('voiceEchoes : premier contrôle valide, puis premier contrôle valide à 30 séances ou plus', () => {
  assert.deepEqual(voiceEchoes(calibrated()), { premier: null, grand: null });
  const recs = [
    ...calibrated(),
    ...check('k0', 'controle', 18, '2026-10-18', 1),
    ...check('k1', 'controle', 19, '2026-10-19'),
    ...check('k2', 'controle', 29, '2026-10-29'),
    ...check('k3', 'controle', 31, '2026-11-02'),
  ];
  const e = voiceEchoes(recs);
  assert.equal(e.premier.sessionId, 'k1');
  assert.equal(e.premier.dateKey, '2026-10-19');
  assert.equal(e.grand.sessionId, 'k3');
});

test('voiceTimeline : références V1, puis départs et contrôles, dans l’ordre', () => {
  const recs = [
    { id: 'j7', kind: 'reference', milestone: 7, createdAt: 2, dateKey: '2026-09-08' },
    { id: 'j1', kind: 'reference', milestone: 1, createdAt: 1, dateKey: '2026-09-01' },
    ...calibrated(),
    ...check('k1', 'controle', 18, '2026-10-18'),
    ...check('bad', 'controle', 24, '2026-10-24', 1),
  ];
  assert.deepEqual(voiceTimeline(recs).map((o) => o.label), ['J1', 'J7', 'Départ 1', 'Départ 2', 'Départ 3', 'Contrôle 1']);
  assert.deepEqual(voiceTimeline([]), []);
});

test('abPair : le premier enregistrement de référence contre le plus récent, d’un autre jour', () => {
  assert.equal(abPair([]), null);
  const j1 = { id: 'j1', kind: 'reference', milestone: 1, createdAt: 1, dateKey: '2026-09-01' };
  assert.equal(abPair([j1]), null);
  const cal = check('c1', 'calibration', 1, '2026-10-10');
  const first = abPair([...cal, j1]);
  assert.equal(first.a.id, 'j1');
  assert.equal(first.b.id, cal.at(-1).id, 'la plus récente');
  assert.equal(first.labelA, 'J1');
  assert.equal(first.labelB, '10/10');
  // Toutes les prises le même jour : rien à comparer.
  assert.equal(abPair(cal), null);
  const later = check('k1', 'controle', 9, '2026-10-22');
  const p = abPair([...cal, ...later]);
  assert.equal(p.a.id, cal[0].id);
  assert.equal(p.b.id, later.at(-1).id);
  assert.deepEqual([p.labelA, p.labelB], ['10/10', '22/10']);
  assert.equal(abPair([{ ...j1, kind: 'partial' }, { ...j1, id: 'x', kind: 'session', dateKey: '2026-10-01' }]), null);
});
