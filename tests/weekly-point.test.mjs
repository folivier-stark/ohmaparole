import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson, loadTestContent } from './helpers.mjs';
import { ALGO_VERSION } from '../js/core/acoustics.js';
import {
  POINT_EVERY, READY_OPTIONS, weeklyPointDue, pickPointItem, spontaneRows, pointSummary, pointsDone,
} from '../js/core/weekly-point.js';
import { buildDailyPlan } from '../js/core/planner.js';

const MESURE = readJson('content/fr/mesure.json');
let clock = 0;
/** Une séance quotidienne comptée, avec ou sans point de la semaine. */
const S = (sessionNumber, weeklyPoint = null, o = {}) => ({
  id: `s${sessionNumber}-${++clock}`, type: 'daily', counted: true, completed: true, startedAt: ++clock * 1000,
  dateKey: '2026-10-10', sessionNumber, weeklyPoint, ...o,
});
const done = (n, format, itemId, extra = {}) => S(n, { theme: Math.floor(n / 4), format, itemId, ready: null, criteres: null, ...extra });

test('point de la semaine : à la dernière séance de chaque thème, toutes les 4 séances', () => {
  assert.equal(POINT_EVERY, 4);
  for (const n of [1, 2, 3]) assert.equal(weeklyPointDue({ sessionNumber: n, sessions: [] }), null, `séance ${n}`);
  assert.deepEqual(weeklyPointDue({ sessionNumber: 4, sessions: [] }), { theme: 1, format: 'spontane' });
  const after4 = [done(4, 'spontane', 'fr.QS01')];
  for (const n of [5, 6, 7]) assert.equal(weeklyPointDue({ sessionNumber: n, sessions: after4 }), null, `séance ${n}`);
  assert.deepEqual(weeklyPointDue({ sessionNumber: 8, sessions: after4 }), { theme: 2, format: 'eclair' }, 'on alterne A, B');
  const after8 = [...after4, done(8, 'eclair', 'fr.RE01')];
  assert.deepEqual(weeklyPointDue({ sessionNumber: 12, sessions: after8 }), { theme: 3, format: 'spontane' });
});

test('point de la semaine : jamais avec une mesure de voix ni une reprise, reporté à la séance suivante', () => {
  assert.equal(weeklyPointDue({ sessionNumber: 4, sessions: [], voiceCheck: 'calibration' }), null);
  assert.equal(weeklyPointDue({ sessionNumber: 4, sessions: [], comeback: true }), null);
  // Séance 4 faite avec la mesure de voix, sans point : le point du thème 1 passe à la séance 5.
  const s4 = [S(4)];
  assert.deepEqual(weeklyPointDue({ sessionNumber: 5, sessions: s4 }), { theme: 1, format: 'spontane' });
  // Une séance non comptée (moins de 60 s) ne consomme pas le point.
  const notCounted = [done(4, 'spontane', 'fr.QS01'), S(5)].map((s, i) => (i === 0 ? { ...s, counted: false } : s));
  assert.deepEqual(weeklyPointDue({ sessionNumber: 5, sessions: notCounted }), { theme: 1, format: 'spontane' });
  // Point passé (« Passer ce bloc ») dans une séance comptée : il est fait, pas une dette.
  assert.equal(weeklyPointDue({ sessionNumber: 5, sessions: [done(4, 'spontane', 'fr.QS01')] }), null);
  assert.equal(pointsDone(notCounted).length, 0);
});

test('pickPointItem : jamais la même question deux fois dans un même cycle de 72 séances', () => {
  const sessions = [];
  const seen = new Set();
  for (let k = 1; k <= 9; k++) {
    const n = 8 * k - 4; // les points A d'un cycle : séances 4, 12, 20…
    const it = pickPointItem({ format: 'spontane', mesure: MESURE, sessions, sessionNumber: n, dateKey: '2026-10-10' });
    assert.ok(it.texte, 'une question de questionsSpontanees');
    assert.ok(!seen.has(it.id), `${it.id} déjà tirée dans ce cycle`);
    seen.add(it.id);
    sessions.push(done(n, 'spontane', it.id));
  }
  // Nouveau cycle : les questions reviennent.
  const next = pickPointItem({ format: 'spontane', mesure: MESURE, sessions, sessionNumber: 76, dateKey: '2026-12-10' });
  assert.ok(MESURE.questionsSpontanees.some((q) => q.id === next.id));
  const eclair = pickPointItem({ format: 'eclair', mesure: MESURE, sessions: [], sessionNumber: 8, dateKey: '2026-10-10' });
  assert.ok(eclair.replique && eclair.critere1 && eclair.critere2);
  // Déterministe.
  assert.equal(pickPointItem({ format: 'eclair', mesure: MESURE, sessions: [], sessionNumber: 8, dateKey: '2026-10-10' }).id, eclair.id);
});

test('buildDailyPlan : le point remplace le bloc 3, la séance reste à 300 s', () => {
  const content = { ...loadTestContent(), mesure: MESURE };
  const total = (p) => p.steps.reduce((s, x) => s + x.durationSec, 0);
  const q = MESURE.questionsSpontanees[0];
  const a = buildDailyPlan({ content, sessionNumber: 4, dateKey: '2026-10-10', weeklyPoint: { theme: 1, format: 'spontane', item: q } });
  assert.equal(total(a), 300);
  assert.equal(a.bloc3, null);
  assert.deepEqual(a.weeklyPoint, { theme: 1, format: 'spontane', itemId: q.id });
  const last = a.steps.at(-1);
  assert.equal(last.block, 'point');
  assert.equal(last.kind, 'spontane');
  assert.equal(last.untimed, true);
  assert.equal(last.question, q.texte);
  assert.equal(last.maxSec, 45);
  assert.equal(a.steps.filter((s) => s.block === 'ecoute' || s.block === 'posture').length, 0);
  const r = MESURE.repliquesEclair[0];
  const b = buildDailyPlan({ content, sessionNumber: 8, dateKey: '2026-10-10', weeklyPoint: { theme: 2, format: 'eclair', item: r } });
  assert.equal(b.steps.at(-1).kind, 'eclair');
  assert.equal(b.steps.at(-1).replique, r.replique);
  assert.deepEqual(b.steps.at(-1).criteres, [r.critere1, r.critere2]);
  assert.equal(total(b), 300);
  // Avec une mesure de voix, jamais de point (garde du planificateur).
  const v = buildDailyPlan({ content, sessionNumber: 4, dateKey: '2026-10-10', voiceCheck: 'calibration', weeklyPoint: { theme: 1, format: 'spontane', item: q } });
  assert.equal(v.weeklyPoint, null);
  assert.equal(v.steps.filter((s) => s.block === 'point').length, 0);
  const c = buildDailyPlan({ content, sessionNumber: 4, dateKey: '2026-10-10', comeback: true, weeklyPoint: { theme: 1, format: 'spontane', item: q } });
  assert.equal(c.weeklyPoint, null);
});

test('spontaneRows : % de pause, nombre de pauses et durée, jamais de débit', () => {
  const rows = spontaneRows({ id: 'r1', sessionId: 's1', dateKey: '2026-10-10', createdAt: 4 },
    { valid: true, analysis: { D: 41.2, pauseTotal: 8.24, pauseCount: 12, snrDb: 33, algoVersion: ALGO_VERSION, leadSilent: true } });
  assert.deepEqual(rows.map((r) => [r.metric, r.value]), [['pausePctSpontane', 0.2], ['pauseCountSpontane', 12], ['dureeSpontane', 41.2]]);
  assert.ok(rows.every((r) => r.kind === 'spontane' && r.algoVersion === ALGO_VERSION && r.recordingId === 'r1'));
  assert.equal(rows[0].id, `r1:pausePctSpontane:${ALGO_VERSION}`);
  assert.deepEqual(spontaneRows({ id: 'x' }, { valid: false }), []);
});

const FORBIDDEN = /(?<!\p{L})(score|note|niveau|échec|régression|raté|record|série)s?(?!\p{L})|tu dois|baisse|null|NaN|undefined/iu;

test('pointSummary : « Prêt » sur les 4 derniers points, % de pause dès 3 mesures, cases en x sur y', () => {
  assert.equal(pointSummary({ sessions: [], measures: [] }).empty, true);
  const sessions = [
    done(4, 'spontane', 'q1', { ready: 'pasPret' }), done(8, 'eclair', 'e1', { criteres: [true, false] }),
    done(12, 'spontane', 'q2', { ready: 'pret' }), done(16, 'eclair', 'e2', { criteres: [true, true] }),
    done(20, 'spontane', 'q3', { ready: 'plutotPret' }), done(28, 'spontane', 'q4', { ready: 'pret' }),
    done(36, 'spontane', 'q5', { ready: 'pret' }),
  ];
  const pct = (v, t) => ({ kind: 'spontane', metric: 'pausePctSpontane', value: v, createdAt: t, algoVersion: ALGO_VERSION });
  const two = pointSummary({ sessions, measures: [pct(0.1, 1), pct(0.12, 2)] });
  assert.equal(two.empty, false);
  assert.deepEqual(two.lines, [
    'Si tu avais un RDV demain : « Prêt » 3 fois sur tes 4 derniers points. Dernier : « Prêt ».',
    'Parole spontanée : encore 1 point avant de comparer.',
    'Réplique éclair : 3 cases cochées sur 4.',
  ]);
  const four = pointSummary({ sessions, measures: [pct(0.1, 1), pct(0.12, 2), pct(0.08, 3), pct(0.2, 4)] });
  assert.equal(four.lines[1], 'En parole spontanée, tu t’arrêtes environ 12 % du temps (au départ : 10 %).');
  for (const s of [two, four]) for (const l of s.lines) assert.doesNotMatch(l, FORBIDDEN, l);
  assert.deepEqual(READY_OPTIONS.map((o) => o.label), ['Pas prêt', 'Plutôt prêt', 'Prêt']);
});
