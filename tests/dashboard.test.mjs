import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../js/core/dates.js';
import {
  GOAL_SESSIONS, cumulativeSeries, goalProgress, weeklyRate, axisSummary, recentGoals,
} from '../js/core/dashboard.js';

const S = (o) => ({ type: 'daily', counted: true, startedAt: 0, ratings: {}, ...o });
const nDays = (n, from) => Array.from({ length: n }, (_, i) => S({ dateKey: addDays(from, i), startedAt: i }));

test('objectif par défaut : 60 séances', () => {
  assert.equal(GOAL_SESSIONS, 60);
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
  assert.equal(g.left, 46);
  assert.equal(g.pct, 23);
  assert.equal(g.reached, false);
  assert.equal(g.etaKey, '2026-11-29');
});

test("goalProgress : pas de date avant 7 jours d'historique, ni sans séance dans les 28 derniers jours", () => {
  assert.equal(goalProgress([S({ dateKey: '2026-10-10' })], '2026-10-12').etaKey, null);
  assert.equal(goalProgress([S({ dateKey: '2026-01-01' })], '2026-10-12').etaKey, null);
  const empty = goalProgress([], '2026-10-12');
  assert.equal(empty.done, 0);
  assert.equal(empty.etaKey, null);
});

test('goalProgress : objectif atteint', () => {
  const g = goalProgress(nDays(61, '2026-08-01'), '2026-10-12');
  assert.equal(g.reached, true);
  assert.equal(g.left, 0);
  assert.equal(g.pct, 100);
  assert.equal(g.etaKey, null);
});

test('weeklyRate : par semaine (lundi), chaque axe lit ses propres valeurs', () => {
  const ss = [
    S({ dateKey: '2026-10-05', ratings: { a: 'clair', l: 'oui', p: 'pose' } }),
    S({ dateKey: '2026-10-07', ratings: { b: 'brouillon', l2: 'non' } }),
    S({ dateKey: '2026-10-12', ratings: { c: 'clair', p2: 'unpeu' } }),
    S({ dateKey: '2026-10-13', ratings: {} }),
    S({ dateKey: '2026-10-08', type: 'prerdv', feedback: 'non', goalReached: 'partie' }),
  ];
  assert.deepEqual(weeklyRate(ss, 'diction').map((w) => [w.weekKey, w.n, w.pct]), [['2026-10-05', 2, 50], ['2026-10-12', 1, 100]]);
  assert.deepEqual(weeklyRate(ss, 'ecoute').map((w) => [w.n, w.pct]), [[2, 50]]);
  assert.deepEqual(weeklyRate(ss, 'posture').map((w) => [w.weekKey, w.pct]), [['2026-10-05', 100], ['2026-10-12', 0]]);
  assert.deepEqual(weeklyRate(ss, 'rdv').map((w) => [w.n, w.pct]), [[1, 100]]);
  assert.deepEqual(weeklyRate(ss, 'objectif').map((w) => [w.n, w.pct]), [[1, 0]]);
});

test('weeklyRate : garde les 8 dernières semaines', () => {
  const ss = Array.from({ length: 10 }, (_, i) => S({ dateKey: addDays('2026-08-03', i * 7), ratings: { a: 'clair' } }));
  const w = weeklyRate(ss, 'diction');
  assert.equal(w.length, 8);
  assert.equal(w[0].weekKey, '2026-08-17');
});

test('axisSummary : taux sur 28 jours et « en hausse » seulement si +10 points avec assez de réponses', () => {
  const before = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-09-01', i), ratings: { a: i === 0 ? 'clair' : 'moyen' } }));
  const recent = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-10-01', i), ratings: { a: i < 3 ? 'clair' : 'moyen' } }));
  const sum = axisSummary([...before, ...recent], 'diction', '2026-10-10');
  assert.equal(sum.n, 4);
  assert.equal(sum.pct, 75);
  assert.equal(sum.rising, true);
  assert.equal(axisSummary(recent, 'diction', '2026-10-10').rising, false);
  assert.deepEqual(axisSummary([], 'diction', '2026-10-10'), { n: 0, pct: null, rising: false });
});

test('recentGoals : objectifs RDV saisis, du plus récent au plus ancien', () => {
  const ss = [
    S({ type: 'prerdv', dateKey: '2026-10-01', startedAt: 1, goal: 'Budget', goalReached: 'oui' }),
    S({ type: 'prerdv', dateKey: '2026-10-02', startedAt: 2, goal: '  ' }),
    S({ type: 'prerdv', dateKey: '2026-10-03', startedAt: 3, goal: 'Décideur' }),
  ];
  assert.deepEqual(recentGoals(ss, 5), [
    { dateKey: '2026-10-03', goal: 'Décideur', result: null },
    { dateKey: '2026-10-01', goal: 'Budget', result: 'oui' },
  ]);
});
