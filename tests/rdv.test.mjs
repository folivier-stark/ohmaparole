import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RDV_QUESTIONS, DONT_KNOW, RDV_INDICATORS, isRdvRoutine, rdvMeasuredMin, rdvQuestionIds, nextRdvQuestion,
  answerRdv, skipRdv, exitRdv, rdvExitCandidate, pendingRdvReturn, rdvOnTime, rdvBoard,
} from '../js/core/rdv.js';

const MIN = 60000;
const H = 60 * MIN;
const D = 24 * H;
const R = (o = {}) => ({
  id: 'r', type: 'prerdv', counted: true, dateKey: '2026-10-09', startedAt: 0, endedAt: 0, practicedSec: 90,
  goal: '', feedback: null, ...o,
});
const labels = (id) => RDV_QUESTIONS[id].options.map((o) => o.label);

test('les 5 questions et leurs réponses, mot pour mot (eval-rdv.md §1.3)', () => {
  assert.equal(RDV_QUESTIONS.objectif.text, 'Objectif atteint ?');
  assert.deepEqual(labels('objectif'), ['Oui', 'En partie', 'Pas cette fois']);
  assert.equal(RDV_QUESTIONS.suite.text, 'La suite ?');
  assert.deepEqual(labels('suite'), ['Signé ou date fixée', 'Non clair', 'Flou']);
  assert.deepEqual(RDV_QUESTIONS.suite.options.map((o) => o.hint ?? null),
    [null, 'de lui ou de toi', '« on se rappelle », plaquette, « je vais y réfléchir »']);
  assert.equal(RDV_QUESTIONS.budget.text, 'Le budget ?');
  assert.deepEqual(labels('budget'), ['Abordé par moi, dans la 1re moitié', 'Abordé par moi, plus tard', 'Il l’a abordé avant moi', 'Pas abordé']);
  assert.equal(RDV_QUESTIONS.heure.text, 'Fini à l’heure prévue ?');
  assert.deepEqual(labels('heure'), ['À l’heure ou avant', 'Jusqu’à 10 min de plus', 'Plus de 10 min de plus']);
  assert.deepEqual(RDV_QUESTIONS.annonce.options.map((o) => o.value), [30, 45, 60, 90]);
  assert.equal(RDV_QUESTIONS.repeter.text, 'On t’a fait répéter ?');
  assert.deepEqual(labels('repeter'), ['Non', 'Une fois', 'Plusieurs fois']);
  assert.deepEqual(DONT_KNOW, { value: 'nsp', label: 'Je ne sais pas' });
});

test('les champs existants sont gardés pour la compatibilité', () => {
  assert.equal(RDV_QUESTIONS.repeter.field, 'feedback');
  assert.equal(RDV_QUESTIONS.repeter.skipField, 'feedbackSkipped');
  assert.equal(RDV_QUESTIONS.objectif.field, 'goalReached');
  assert.equal(RDV_QUESTIONS.objectif.skipField, 'goalSkipped');
  // Les valeurs historiques de « répéter » ne changent pas.
  assert.deepEqual(RDV_QUESTIONS.repeter.options.map((o) => o.value), ['non', 'une', 'plusieurs']);
});

test('isRdvRoutine : 30 s de pratique suffisent, un simple essai non', () => {
  assert.equal(isRdvRoutine(R()), true);
  assert.equal(isRdvRoutine(R({ counted: false, practicedSec: 30 })), true);
  assert.equal(isRdvRoutine(R({ practicedSec: 29 })), false);
  assert.equal(isRdvRoutine(R({ practicedSec: undefined })), false);
  assert.equal(isRdvRoutine(R({ type: 'daily' })), false);
});

test('rdvMeasuredMin : durée réelle de la fin de la routine à la sortie, à 5 min près', () => {
  assert.equal(rdvMeasuredMin(R()), null);
  assert.equal(rdvMeasuredMin(R({ endedAt: 1000, rdvEndedAt: 1000 + 47 * MIN })), 45);
  assert.equal(rdvMeasuredMin(R({ endedAt: 1000, rdvEndedAt: 1000 + 48 * MIN })), 50);
  assert.equal(rdvMeasuredMin(R({ endedAt: 5000, rdvEndedAt: 4000 })), null);
});

test('rdvQuestionIds : 5 questions au plus, dans l’ordre de la spec V2 §5', () => {
  assert.deepEqual(rdvQuestionIds(R({ goal: 'Avoir une date' })), ['objectif', 'suite', 'budget', 'heure', 'repeter']);
  assert.deepEqual(rdvQuestionIds(R({ goal: '   ' })), ['suite', 'budget', 'heure', 'repeter']);
  // Durée mesurée par « Je sors du RDV » : « Fini à l'heure prévue ? » est sautée, seule la durée annoncée est demandée.
  assert.deepEqual(rdvQuestionIds(R({ goal: 'x', rdvEndedAt: 40 * MIN })), ['objectif', 'suite', 'budget', 'annonce', 'repeter']);
});

test('nextRdvQuestion : une question à la fois, « Je ne sais pas » répond, « Passer » saute', () => {
  let s = R({ goal: 'Avoir une date' });
  const seen = [];
  for (let id = nextRdvQuestion(s); id; id = nextRdvQuestion(s)) {
    seen.push(id);
    s = id === 'budget' ? skipRdv(s, id) : answerRdv(s, id, id === 'suite' ? DONT_KNOW.value : RDV_QUESTIONS[id].options[0].value, 5 * H);
    assert.ok(seen.length <= 5);
  }
  assert.deepEqual(seen, ['objectif', 'suite', 'budget', 'heure', 'repeter']);
  assert.equal(s.goalReached, 'oui');
  assert.equal(s.rdvSuite, 'nsp');
  assert.equal(s.rdvBudget, undefined);
  assert.equal(s.rdvBudgetSkipped, true);
  assert.equal(s.rdvHeure, 'alheure');
  assert.equal(s.feedback, 'non');
  assert.equal(s.rdvAnsweredAt, 5 * H);
});

test('answerRdv, skipRdv et exitRdv ne modifient jamais la séance d’origine', () => {
  const s = R();
  const a = answerRdv(s, 'suite', 'date', 7);
  assert.equal(s.rdvSuite, undefined);
  assert.equal(a.rdvSuite, 'date');
  assert.equal(answerRdv(a, 'budget', 'lui', 99).rdvAnsweredAt, 7);
  assert.equal(skipRdv(s, 'repeter').feedbackSkipped, true);
  assert.equal(s.feedbackSkipped, undefined);
  assert.equal(exitRdv(s, 123).rdvEndedAt, 123);
  assert.equal(s.rdvEndedAt, undefined);
});

test('nextRdvQuestion : données de l’ancien flux (« répéter » d’abord, puis l’objectif)', () => {
  const old = R({ goal: 'Budget', goalReached: null });
  assert.equal(nextRdvQuestion({ ...old, feedback: 'non' }), 'objectif');
  assert.equal(nextRdvQuestion({ ...old, feedback: 'non', goalReached: 'oui' }), null);
  assert.equal(nextRdvQuestion({ ...old, feedback: 'non', goalSkipped: true }), null);
  assert.equal(nextRdvQuestion({ ...old, feedback: 'non', goal: ' ' }), null);
  // « Passer » sur « répéter » clôturait tout le retour.
  assert.equal(nextRdvQuestion({ ...old, feedbackSkipped: true }), null);
  assert.equal(nextRdvQuestion(R({ feedback: 'une' })), null);
});

test('rdvExitCandidate : « Je sors du RDV » pendant 4 h après la routine', () => {
  const rdv = R({ endedAt: 10 * H });
  assert.equal(rdvExitCandidate([rdv], 10 * H + MIN).id, 'r');
  assert.equal(rdvExitCandidate([rdv], 14 * H - 1).id, 'r');
  assert.equal(rdvExitCandidate([rdv], 14 * H), null);
  assert.equal(rdvExitCandidate([rdv], 10 * H - MIN), null);
  assert.equal(rdvExitCandidate([{ ...rdv, rdvEndedAt: 11 * H }], 12 * H), null);
  // Le retour a commencé sans le bouton : la durée sera déclarée, le bouton disparaît.
  assert.equal(rdvExitCandidate([answerRdv(rdv, 'suite', 'flou', 11 * H)], 12 * H), null);
  assert.equal(rdvExitCandidate([skipRdv(rdv, 'suite')], 12 * H), null);
  assert.equal(rdvExitCandidate([{ ...rdv, practicedSec: 10 }], 11 * H), null);
  assert.equal(rdvExitCandidate([{ ...rdv, type: 'daily' }], 11 * H), null);
  const newer = { ...rdv, id: 'n', endedAt: 12 * H };
  assert.equal(rdvExitCandidate([rdv, newer], 13 * H).id, 'n');
});

test('pendingRdvReturn : à partir de 1 h après la routine, au plus 3 jours', () => {
  const rdv = R();
  assert.equal(pendingRdvReturn([rdv], 0.5 * H), null);
  assert.equal(pendingRdvReturn([rdv], 2 * H).id, 'r');
  assert.equal(pendingRdvReturn([rdv], 3 * D).id, 'r');
  assert.equal(pendingRdvReturn([rdv], 4 * D), null);
  assert.equal(pendingRdvReturn([{ ...rdv, feedback: 'non' }], 2 * H), null);
  assert.equal(pendingRdvReturn([{ ...rdv, feedbackSkipped: true }], 2 * H), null);
});

test('pendingRdvReturn : dès le tap sur « Je sors du RDV », même avant 1 h', () => {
  const out = exitRdv(R(), 20 * MIN);
  assert.equal(pendingRdvReturn([out], 21 * MIN).id, 'r');
  assert.equal(nextRdvQuestion(out), 'suite');
});

test('pendingRdvReturn : un RDV écourté mais réel (≥ 30 s) compte, pas un simple essai', () => {
  const rdv = R();
  assert.equal(pendingRdvReturn([{ ...rdv, counted: false, practicedSec: 45 }], 2 * H).id, 'r');
  assert.equal(pendingRdvReturn([{ ...rdv, counted: false, practicedSec: 30 }], 2 * H).id, 'r');
  assert.equal(pendingRdvReturn([{ ...rdv, counted: true, practicedSec: 10 }], 2 * H), null);
  assert.equal(pendingRdvReturn([{ ...rdv, counted: false, practicedSec: undefined }], 2 * H), null);
});

test('pendingRdvReturn : l’objectif d’un ancien retour reste demandé, puis le plus récent passe en premier', () => {
  const base = R({ goal: 'Budget', goalReached: null });
  assert.equal(pendingRdvReturn([{ ...base, feedback: 'non' }], 2 * H).id, 'r');
  assert.equal(pendingRdvReturn([{ ...base, feedback: 'non', goalReached: 'oui' }], 2 * H), null);
  assert.equal(pendingRdvReturn([{ ...base, feedback: 'non' }], 4 * D), null);
  const older = R({ id: 'old', endedAt: 0 });
  const newer = R({ id: 'new', endedAt: H });
  assert.equal(pendingRdvReturn([older, newer], 3 * H).id, 'new');
  assert.equal(pendingRdvReturn([older, newer], 1.5 * H).id, 'old');
});

test('rdvOnTime : déclaré, ou calculé depuis la durée mesurée et la durée annoncée', () => {
  assert.equal(rdvOnTime(R()), null);
  assert.equal(rdvOnTime(R({ rdvHeure: 'plus10' })), 'plus10');
  const m = (min, annonce) => R({ endedAt: 0, rdvEndedAt: min * MIN, rdvAnnonceMin: annonce });
  assert.equal(rdvOnTime(m(44, 45)), 'alheure');
  assert.equal(rdvOnTime(m(47, 45)), 'alheure'); // 47 min ≈ 45 min, à 5 min près
  assert.equal(rdvOnTime(m(55, 45)), 'plus10');
  assert.equal(rdvOnTime(m(58, 45)), 'plusde10');
  assert.equal(rdvOnTime(m(50, 'nsp')), 'nsp');
  assert.equal(rdvOnTime(R({ endedAt: 0, rdvEndedAt: 50 * MIN })), null);
});

test('rdvBoard : mois 1 = 4 premières semaines qui ont des données, à côté des 4 dernières semaines', () => {
  const rdv = (dateKey, o) => R({ id: dateKey, dateKey, startedAt: Date.parse(dateKey), ...o });
  const ss = [
    rdv('2026-10-05', { rdvSuite: 'date' }), rdv('2026-10-07', { rdvSuite: 'flou' }),
    rdv('2026-10-13', { rdvSuite: 'nsp' }),
    rdv('2026-10-27', { rdvSuite: 'nonclair' }),
    rdv('2026-11-03', { rdvSuite: 'flou' }),
    rdv('2026-11-10', { rdvSuite: 'date' }),
    rdv('2026-11-30', { rdvSuite: 'date' }), rdv('2026-12-15', { rdvSuite: 'nonclair' }), rdv('2026-12-18', { rdvSuite: 'flou' }),
    rdv('2026-12-19', { rdvSuiteSkipped: true }),
    { ...rdv('2026-12-19', { rdvSuite: 'date' }), practicedSec: 5 },
  ];
  const suite = rdvBoard(ss, '2026-12-20').find((l) => l.key === 'suite');
  assert.deepEqual(suite.month1, { k: 2, n: 5 });
  assert.deepEqual(suite.recent, { k: 2, n: 3 });
  assert.equal(suite.separate, true);
  assert.equal(suite.source, 'observé en vrai');
});

test('rdvBoard : tant que le mois 1 recouvre les 4 dernières semaines, pas de comparaison', () => {
  const ss = [R({ dateKey: '2026-10-05', feedback: 'non' }), R({ dateKey: '2026-10-13', feedback: 'une' })];
  const rep = rdvBoard(ss, '2026-10-20').find((l) => l.key === 'repeter');
  assert.deepEqual(rep.month1, { k: 1, n: 2 });
  assert.equal(rep.separate, false);
  const none = rdvBoard([], '2026-10-20');
  assert.deepEqual(none.map((l) => l.key), RDV_INDICATORS.map((i) => i.key));
  assert.ok(none.every((l) => l.month1.n === 0 && l.recent.n === 0 && l.separate === false));
});

test('rdvBoard : chaque ligne lit sa réponse, « Je ne sais pas » compte sans réussir, durée mesurée comptée', () => {
  const ss = [
    R({ dateKey: '2026-10-05', rdvBudget: 'moidebut', feedback: 'nsp', goal: 'x', goalReached: 'oui', endedAt: 0, rdvEndedAt: 30 * MIN, rdvAnnonceMin: 30 }),
    R({ dateKey: '2026-10-06', rdvBudget: 'lui', feedback: 'non', goal: 'y', goalReached: 'partie', rdvHeure: 'plusde10' }),
  ];
  const by = Object.fromEntries(rdvBoard(ss, '2026-10-10').map((l) => [l.key, l]));
  assert.deepEqual(by.budget.month1, { k: 1, n: 2 });
  assert.deepEqual(by.repeter.month1, { k: 1, n: 2 });
  assert.deepEqual(by.objectif.month1, { k: 1, n: 2 });
  assert.deepEqual(by.heure.month1, { k: 1, n: 2 });
  assert.equal(by.heure.measured, 1);
  assert.equal(by.objectif.source, 'ressenti');
});
