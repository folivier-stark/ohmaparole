import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../js/core/dates.js';
import {
  GOAL_SESSIONS, programGoal, cumulativeSeries, goalProgress, axisSummary, trendCheck, rateTrend, monthlyBlocks, TREND_RUN, recentGoals,
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

test('axisSummary : chaque axe lit ses propres valeurs, « Je ne sais pas » hors du total de « répéter »', () => {
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
  // « Répéter » n'avait pas de « Je ne sais pas » en V1 : il reste hors du total, pour l'historique.
  assert.deepEqual(kn('rdv'), [1, 1]);
  assert.deepEqual(kn('objectif'), [0, 2]);
});

test('axisSummary : fréquence naturelle sur 28 jours, plus de « en hausse »', () => {
  const before = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-09-01', i), ratings: { a: i === 0 ? 'clair' : 'moyen' } }));
  const recent = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-10-01', i), ratings: { a: i < 3 ? 'clair' : 'moyen' } }));
  const sum = axisSummary([...before, ...recent], 'diction', '2026-10-10');
  assert.deepEqual(sum, { n: 4, k: 3, freq: { approx: 8, low: 3, high: 10, bound: null }, total: 8 });
  assert.equal('rising' in sum, false);
  assert.equal('pct' in sum, false);
  assert.deepEqual(axisSummary([], 'diction', '2026-10-10'), { n: 0, k: 0, freq: null, total: 0 });
  // Une séance future (horloge du téléphone) n'entre ni dans le taux ni dans le total.
  assert.equal(axisSummary([...recent, S({ dateKey: '2026-10-11', ratings: { z: 'clair' } })], 'diction', '2026-10-10').total, 4);
});

// T est un dimanche. Un contrôle compare les 28 jours finissant à un dimanche aux 28 jours d'avant.
const T = '2026-11-01';
/** Une séance par décalage (en jours avant T), chacune avec une note de diction. */
const rated = (offsets, positives) => offsets.map((d, i) => S({
  dateKey: addDays(T, -d), startedAt: 1000 - d, ratings: { [`x${d}-${i}`]: i < positives ? 'clair' : 'moyen' },
}));
const span = (from, count) => Array.from({ length: count }, (_, i) => from + i);
/** Récents aux jours 14 et suivants, anciens aux jours 42 et suivants : les dimanches T, T-7 et T-14 voient les mêmes comptes. */
const three = (kNew, nNew, kOld, nOld) => [...rated(span(14, nNew), kNew), ...rated(span(42, nOld), kOld)];

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

test('rateTrend : « probable » seulement si P ≥ 0,90 trois dimanches de suite', () => {
  assert.equal(TREND_RUN, 3);
  assert.equal(rateTrend(three(7, 10, 4, 10), 'diction', T), 'probable'); // P = 0,9008 aux 3 dimanches
  assert.equal(rateTrend(three(8, 12, 5, 12), 'diction', T), 'tot'); // P = 0,8811
  assert.equal(rateTrend(three(10, 10, 0, 10), 'diction', T), 'probable');
});

test('rateTrend : ancré au dimanche, le même résultat toute la semaine', () => {
  const ss = three(7, 10, 4, 10);
  for (let d = 0; d < 7; d++) assert.equal(rateTrend(ss, 'diction', addDays(T, d)), 'probable', addDays(T, d));
  // La veille du 3e dimanche, seuls 2 contrôles ont eu lieu.
  assert.equal(rateTrend(ss, 'diction', addDays(T, -1)), 'tot');
});

test('rateTrend : deux dimanches favorables ne suffisent pas', () => {
  // Récents aux jours 7 à 16 : vus par les dimanches T et T-7, pas par T-14.
  const ss = [...rated(span(7, 10), 10), ...rated(span(35, 10), 0)];
  assert.ok(trendCheck(ss, 'diction', T) >= 0.9);
  assert.ok(trendCheck(ss, 'diction', addDays(T, -7)) >= 0.9);
  assert.equal(trendCheck(ss, 'diction', addDays(T, -14)), null);
  assert.equal(rateTrend(ss, 'diction', T), 'tot');
});

test('rateTrend : une fois allumé, l’état reste jusqu’au bilan, même si les données récentes baissent', () => {
  // Les dimanches T-28, T-21 et T-14 sont favorables, puis 14 réponses « Moyen » arrivent.
  const ss = [...rated(span(28, 10), 10), ...rated(span(56, 10), 3), ...rated(span(0, 14), 0)];
  assert.ok(trendCheck(ss, 'diction', T) < 0.9);
  assert.equal(rateTrend(ss, 'diction', addDays(T, -21)), 'tot');
  assert.equal(rateTrend(ss, 'diction', addDays(T, -14)), 'probable');
  assert.equal(rateTrend(ss, 'diction', addDays(T, -7)), 'probable');
  assert.equal(rateTrend(ss, 'diction', T), 'probable');
  // Après un bilan (sinceKey), on repart de zéro.
  assert.equal(rateTrend(ss, 'diction', T, { sinceKey: addDays(T, -10) }), 'tot');
});

test('rateTrend : ni égalité, ni petit effectif, ni baisse ne donnent autre chose que « tot »', () => {
  assert.equal(rateTrend(three(6, 12, 6, 12), 'diction', T), 'tot');
  assert.equal(rateTrend(three(12, 12, 0, 7), 'diction', T), 'tot');
  assert.equal(rateTrend(three(2, 10, 8, 10), 'diction', T), 'tot');
});

test('monthlyBlocks : blocs de 28 jours depuis la 1re semaine avec données, figés, au moins 8 réponses', () => {
  const day = (key, value) => S({ dateKey: key, ratings: { [key]: value } });
  const fill = (fromKey, n, positives) => Array.from({ length: n }, (_, i) => day(addDays(fromKey, i), i < positives ? 'clair' : 'moyen'));
  // Première réponse un mercredi : les blocs partent du lundi 3 août.
  const ss = [
    ...fill('2026-08-05', 10, 6), // bloc 1 : 3 au 30 août
    ...fill('2026-09-01', 5, 5), // bloc 2 : 31 août au 27 septembre, trop peu
    ...fill('2026-09-28', 8, 2), // bloc 3 : 28 septembre au 25 octobre
    ...fill('2026-10-26', 9, 9), // bloc 4, en cours le 10 novembre
    S({ dateKey: '2026-12-01', ratings: { futur: 'clair' } }),
  ];
  const blocks = monthlyBlocks(ss, 'diction', '2026-11-10');
  assert.deepEqual(blocks.map((b) => [b.label, b.fromKey, b.toKey, b.k, b.n, b.current]), [
    ['Mois 1', '2026-08-03', '2026-08-30', 6, 10, false],
    ['Mois 3', '2026-09-28', '2026-10-25', 2, 8, false],
    ['Ces 4 semaines', '2026-10-26', '2026-11-22', 9, 9, true],
  ]);
  assert.deepEqual(blocks[0].freq, { approx: 6, low: 3, high: 8, bound: null });
  // Le bloc en cours n'apparaît qu'à 8 réponses.
  assert.equal(monthlyBlocks(ss, 'diction', '2026-11-01').at(-1).label, 'Mois 3');
  assert.deepEqual(monthlyBlocks([], 'diction', '2026-11-10'), []);
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
