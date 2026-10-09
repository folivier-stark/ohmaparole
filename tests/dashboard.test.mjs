import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../js/core/dates.js';
import {
  GOAL_SESSIONS, programGoal, cumulativeSeries, goalProgress, axisSummary, trendCheck, rateTrend, recentGoals,
} from '../js/core/dashboard.js';

const S = (o) => ({ type: 'daily', counted: true, startedAt: 0, ratings: {}, ...o });
const nDays = (n, from) => Array.from({ length: n }, (_, i) => S({ dateKey: addDays(from, i), startedAt: i }));

test('objectif par défaut : 72 séances, et calculé depuis le programme', () => {
  assert.equal(GOAL_SESSIONS, 72);
  assert.equal(programGoal({ sessionsPerWeek: 4, weeks: new Array(18) }), 72);
  assert.equal(programGoal({ weeks: new Array(6) }), 30);
});

test('cumulativeSeries : un point par jour, ne redescend jamais, ignore RDV et non comptées', () => {
  const s = cumulativeSeries([
    S({ dateKey: '2026-10-01' }), S({ dateKey: '2026-10-01' }), S({ dateKey: '2026-10-03', type: 'comeback' }),
    S({ dateKey: '2026-10-02', counted: false }), S({ dateKey: '2026-10-02', type: 'prerdv' }),
  ], '2026-10-04');
  assert.deepEqual(s.map((p) => p.total), [2, 2, 3, 3]);
  assert.equal(s[0].dateKey, '2026-10-01');
  assert.equal(s.at(-1).day, 3);
  assert.deepEqual(cumulativeSeries([], '2026-10-04'), []);
});

test('goalProgress : avancement et date estimée au rythme récent', () => {
  const g = goalProgress(nDays(14, '2026-10-01'), '2026-10-14');
  assert.equal(g.done, 14);
  assert.equal(g.left, 58);
  assert.equal(g.pct, 19);
  assert.equal(g.reached, false);
  assert.equal(g.etaKey, '2026-12-11');
});

test("goalProgress : pas de date avant 7 jours d'historique, ni sans séance dans les 28 derniers jours", () => {
  assert.equal(goalProgress([S({ dateKey: '2026-10-10' })], '2026-10-12').etaKey, null);
  assert.equal(goalProgress([S({ dateKey: '2026-01-01' })], '2026-10-12').etaKey, null);
  const empty = goalProgress([], '2026-10-12');
  assert.equal(empty.done, 0);
  assert.equal(empty.etaKey, null);
});

test('goalProgress : objectif atteint', () => {
  const g = goalProgress(nDays(73, '2026-08-01'), '2026-10-12');
  assert.equal(g.reached, true);
  assert.equal(g.left, 0);
  assert.equal(g.pct, 100);
  assert.equal(g.etaKey, null);
});

test('axisSummary : chaque axe lit ses propres valeurs, « Je ne sais pas » compte dans le total des RDV', () => {
  const ss = [
    S({ dateKey: '2026-10-05', ratings: { a: 'clair', l: 'oui', p: 'pose' } }),
    S({ dateKey: '2026-10-07', ratings: { b: 'brouillon', l2: 'non' } }),
    S({ dateKey: '2026-10-12', ratings: { c: 'clair', p2: 'unpeu' } }),
    S({ dateKey: '2026-10-13', ratings: {} }),
    S({ dateKey: '2026-10-08', type: 'prerdv', feedback: 'non', goalReached: 'partie' }),
    S({ dateKey: '2026-10-09', type: 'prerdv', feedback: 'nsp', goalReached: 'nsp' }),
  ];
  const kn = (axis) => { const s = axisSummary(ss, axis, '2026-10-13'); return [s.k, s.n]; };
  assert.deepEqual(kn('diction'), [2, 3]);
  assert.deepEqual(kn('ecoute'), [1, 2]);
  assert.deepEqual(kn('posture'), [1, 2]);
  assert.deepEqual(kn('rdv'), [1, 2]);
  assert.deepEqual(kn('objectif'), [0, 2]);
});

test('axisSummary : fréquence naturelle sur 28 jours, plus de « en hausse »', () => {
  const before = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-09-01', i), ratings: { a: i === 0 ? 'clair' : 'moyen' } }));
  const recent = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-10-01', i), ratings: { a: i < 3 ? 'clair' : 'moyen' } }));
  const sum = axisSummary([...before, ...recent], 'diction', '2026-10-10');
  assert.deepEqual(sum, { n: 4, k: 3, freq: { approx: 8, low: 3, high: 10 }, total: 8 });
  assert.equal('rising' in sum, false);
  assert.equal('pct' in sum, false);
  assert.deepEqual(axisSummary([], 'diction', '2026-10-10'), { n: 0, k: 0, freq: null, total: 0 });
  // Une séance future (horloge du téléphone) n'entre ni dans le taux ni dans le total.
  assert.equal(axisSummary([...recent, S({ dateKey: '2026-10-11', ratings: { z: 'clair' } })], 'diction', '2026-10-10').total, 4);
});

// Aujourd'hui = T. Contrôle de la semaine courante : 28 j finissant à T contre les 28 j d'avant.
// Contrôle de la semaine précédente : la même chose, finissant à T − 7.
const T = '2026-10-31';
/** Une séance par décalage (en jours avant T), chacune avec une note de diction. */
const rated = (offsets, positives) => offsets.map((d, i) => S({
  dateKey: addDays(T, -d), startedAt: 1000 - d, ratings: { [`x${d}-${i}`]: i < positives ? 'clair' : 'moyen' },
}));
const span = (from, count) => Array.from({ length: count }, (_, i) => from + i);

test('rateTrend : « calibrage » sous 8 réponses au total, sur cet axe seulement', () => {
  assert.equal(rateTrend([], 'diction', T), 'calibrage');
  const seven = rated(span(0, 7), 7);
  assert.equal(rateTrend(seven, 'diction', T), 'calibrage');
  assert.equal(rateTrend([...seven, S({ dateKey: T, ratings: { e: 'oui', p: 'pose' } })], 'diction', T), 'calibrage');
  assert.equal(rateTrend(rated(span(0, 8), 8), 'diction', T), 'tot');
});

test('trendCheck : P(récent > ancien), null sous 8 réponses d’un côté', () => {
  // 7 sur 10 récents contre 4 sur 10 anciens : P = 0,900809716599190 (référence calculée à part).
  const ss = [...rated(span(0, 10), 7), ...rated(span(28, 10), 4)];
  assert.ok(Math.abs(trendCheck(ss, 'diction', T) - 0.900809716599190283) < 1e-11);
  assert.equal(trendCheck([...rated(span(0, 7), 7), ...rated(span(28, 10), 0)], 'diction', T), null);
  assert.equal(trendCheck([...rated(span(0, 10), 10), ...rated(span(28, 7), 0)], 'diction', T), null);
});

test('rateTrend : « probable » seulement si P ≥ 0,90 deux semaines de suite', () => {
  // Récents aux jours 7 à 16, anciens aux jours 35 à 44 : les deux contrôles voient les mêmes comptes.
  const at = (kNew, nNew, kOld, nOld) => [...rated(span(7, nNew), kNew), ...rated(span(35, nOld), kOld)];
  assert.equal(rateTrend(at(7, 10, 4, 10), 'diction', T), 'probable'); // P = 0,9008
  assert.equal(rateTrend(at(8, 12, 5, 12), 'diction', T), 'tot'); // P = 0,8811
  assert.equal(rateTrend(at(10, 10, 0, 10), 'diction', T), 'probable');
});

test('rateTrend : une seule semaine favorable ne suffit pas', () => {
  // Les bonnes réponses n'existent que depuis 7 jours : le contrôle de la semaine précédente n'a rien.
  const ss = [...rated([6, 5, 4, 3, 2, 1, 0, 0], 8), ...rated(span(37, 10), 0)];
  assert.ok(trendCheck(ss, 'diction', T) > 0.99);
  assert.equal(trendCheck(ss, 'diction', addDays(T, -7)), null);
  assert.equal(rateTrend(ss, 'diction', T), 'tot');
});

test('rateTrend : ni égalité, ni petit effectif, ni baisse ne donnent autre chose que « tot »', () => {
  assert.equal(rateTrend([...rated(span(7, 12), 6), ...rated(span(35, 12), 6)], 'diction', T), 'tot');
  assert.equal(rateTrend([...rated(span(7, 12), 12), ...rated(span(35, 7), 0)], 'diction', T), 'tot');
  assert.equal(rateTrend([...rated(span(7, 10), 2), ...rated(span(35, 10), 8)], 'diction', T), 'tot');
});

test('recentGoals : objectifs RDV saisis, du plus récent au plus ancien, avec leur suite', () => {
  const ss = [
    S({ type: 'prerdv', dateKey: '2026-10-01', startedAt: 1, goal: 'Budget', goalReached: 'oui', rdvSuite: 'date' }),
    S({ type: 'prerdv', dateKey: '2026-10-02', startedAt: 2, goal: '  ' }),
    S({ type: 'prerdv', dateKey: '2026-10-03', startedAt: 3, goal: 'Décideur' }),
  ];
  assert.deepEqual(recentGoals(ss, 5), [
    { dateKey: '2026-10-03', goal: 'Décideur', result: null, suite: null },
    { dateKey: '2026-10-01', goal: 'Budget', result: 'oui', suite: 'date' },
  ]);
  assert.equal(recentGoals(ss, 1).length, 1);
});
