import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RDV_QUESTIONS, DONT_KNOW, RDV_INDICATORS, RDV_MAX_QUESTIONS, RDV_EXIT_WINDOW_MS, isRdvRoutine, rdvMeasuredMin,
  rdvQuestionIds, nextRdvQuestion, answerRdv, skipRdv, exitRdv, rdvExitCandidate, pendingRdvReturn, rdvOnTime, rdvBoard,
} from '../js/core/rdv.js';
import * as rdv from '../js/core/rdv.js';

const MIN = 60000;
const H = 60 * MIN;
const D = 24 * H;
const R = (o = {}) => ({
  id: 'r', type: 'prerdv', counted: true, dateKey: '2026-10-09', startedAt: 0, endedAt: 0, practicedSec: 90,
  goal: '', feedback: null, ...o,
});
const labels = (id) => RDV_QUESTIONS[id].options.map((o) => o.label);
/** Répond à toutes les questions dans l'ordre ; pick(id) donne la valeur, ou 'skip'. */
function walk(s, pick) {
  const seen = [];
  for (let id = nextRdvQuestion(s); id; id = nextRdvQuestion(s)) {
    seen.push(id);
    const v = pick(id);
    s = v === 'skip' ? skipRdv(s, id) : answerRdv(s, id, v ?? RDV_QUESTIONS[id].options[0].value, 5 * H);
    assert.ok(seen.length <= RDV_MAX_QUESTIONS, seen.join(','));
  }
  return { s, seen };
}

test('les questions et leurs réponses, mot pour mot (eval-rdv.md §1.3)', () => {
  assert.equal(RDV_QUESTIONS.prospect.text, 'C’était un premier RDV avec un prospect ?');
  assert.deepEqual(labels('prospect'), ['Oui', 'Non']);
  assert.equal(RDV_QUESTIONS.prospect.options[1].hint, 'suivi d’un client, réseau, etc.');
  assert.equal(RDV_QUESTIONS.prospect.dontKnow, false);
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
  // Toutes les questions, sauf le filtre, proposent « Je ne sais pas ».
  for (const [id, q] of Object.entries(RDV_QUESTIONS)) assert.equal(q.dontKnow !== false, id !== 'prospect', id);
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

test('rdvQuestionIds : le filtre d’abord, 5 questions au plus, la durée en dernier ou sautée', () => {
  assert.equal(RDV_MAX_QUESTIONS, 5);
  // Avec un objectif, il y aurait 6 questions : la durée saute.
  assert.deepEqual(rdvQuestionIds(R({ goal: 'Avoir une date' })), ['prospect', 'objectif', 'suite', 'budget', 'repeter']);
  assert.deepEqual(rdvQuestionIds(R({ goal: '   ' })), ['prospect', 'suite', 'budget', 'repeter', 'heure']);
  // Durée mesurée par « Je sors du RDV » : seule la durée annoncée est demandée.
  assert.deepEqual(rdvQuestionIds(R({ rdvEndedAt: 40 * MIN })), ['prospect', 'suite', 'budget', 'repeter', 'annonce']);
  // Pas un premier RDV prospect (réseau, BNI, suivi client) : ni suite, ni budget, ni durée.
  assert.deepEqual(rdvQuestionIds(R({ goal: 'x', rdvProspect: 'non' })), ['prospect', 'objectif', 'repeter']);
  assert.deepEqual(rdvQuestionIds(R({ rdvProspect: 'non' })), ['prospect', 'repeter']);
  // « Passer » sur le filtre : on le traite comme un RDV prospect.
  assert.deepEqual(rdvQuestionIds(R({ rdvProspectSkipped: true })), ['prospect', 'suite', 'budget', 'repeter', 'heure']);
});

test('nextRdvQuestion : une question à la fois, « Je ne sais pas » répond, « Passer » saute', () => {
  const pick = { prospect: 'oui', suite: DONT_KNOW.value, budget: 'skip', repeter: 'non', heure: 'alheure' };
  const { s, seen } = walk(R(), (id) => pick[id]);
  assert.deepEqual(seen, ['prospect', 'suite', 'budget', 'repeter', 'heure']);
  assert.equal(s.rdvProspect, 'oui');
  assert.equal(s.rdvSuite, 'nsp');
  assert.equal(s.rdvBudget, undefined);
  assert.equal(s.rdvBudgetSkipped, true);
  assert.equal(s.feedback, 'non');
  assert.equal(s.rdvHeure, 'alheure');
  assert.equal(s.rdvAnsweredAt, 5 * H);
});

test('nextRdvQuestion : avec un objectif, 5 questions ; hors prospect, 3', () => {
  assert.deepEqual(walk(R({ goal: 'Avoir une date' }), () => null).seen, ['prospect', 'objectif', 'suite', 'budget', 'repeter']);
  const { s, seen } = walk(R({ goal: 'Avoir une date' }), (id) => (id === 'prospect' ? 'non' : null));
  assert.deepEqual(seen, ['prospect', 'objectif', 'repeter']);
  assert.equal(s.rdvSuite, undefined);
  assert.deepEqual(walk(R(), (id) => (id === 'prospect' ? 'skip' : 'skip')).seen, ['prospect', 'suite', 'budget', 'repeter', 'heure']);
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
  // Nouveau flux (filtre réglé) : « répéter » répondu n'arrête pas la question sur la durée.
  assert.equal(nextRdvQuestion(R({ rdvProspect: 'oui', rdvSuite: 'date', rdvBudget: 'lui', feedback: 'une' })), 'heure');
  assert.equal(nextRdvQuestion(R({ rdvProspectSkipped: true, rdvSuite: 'date', rdvBudget: 'lui', feedbackSkipped: true })), 'heure');
});

test('rdvExitCandidate : « Je sors du RDV » pendant 4 h après la routine', () => {
  assert.equal(RDV_EXIT_WINDOW_MS, 4 * H);
  const r = R({ endedAt: 10 * H });
  assert.equal(rdvExitCandidate([r], 10 * H + MIN).id, 'r');
  assert.equal(rdvExitCandidate([r], 14 * H - 1).id, 'r');
  assert.equal(rdvExitCandidate([r], 14 * H), null);
  assert.equal(rdvExitCandidate([r], 10 * H - MIN), null);
  assert.equal(rdvExitCandidate([{ ...r, rdvEndedAt: 11 * H }], 12 * H), null);
  // Le retour a commencé sans le bouton : la durée sera déclarée, le bouton disparaît.
  assert.equal(rdvExitCandidate([answerRdv(r, 'prospect', 'oui', 11 * H)], 12 * H), null);
  assert.equal(rdvExitCandidate([skipRdv(r, 'suite')], 12 * H), null);
  assert.equal(rdvExitCandidate([{ ...r, practicedSec: 10 }], 11 * H), null);
  assert.equal(rdvExitCandidate([{ ...r, type: 'daily' }], 11 * H), null);
  const newer = { ...r, id: 'n', endedAt: 12 * H };
  assert.equal(rdvExitCandidate([r, newer], 13 * H).id, 'n');
});

test('pendingRdvReturn : pendant les 4 h du bouton, seul le bouton ; ensuite la carte, 3 jours au plus', () => {
  assert.equal('RDV_CARD_DELAY_MS' in rdv, false);
  const r = R();
  assert.equal(pendingRdvReturn([r], 0.5 * H), null);
  assert.equal(pendingRdvReturn([r], 2 * H), null);
  assert.equal(pendingRdvReturn([r], 4 * H - 1), null);
  assert.equal(pendingRdvReturn([r], 4 * H).id, 'r');
  assert.equal(pendingRdvReturn([r], 3 * D).id, 'r');
  assert.equal(pendingRdvReturn([r], 4 * D), null);
  assert.equal(pendingRdvReturn([{ ...r, feedback: 'non' }], 5 * H), null);
  assert.equal(pendingRdvReturn([{ ...r, feedbackSkipped: true }], 5 * H), null);
});

test('pendingRdvReturn : dès le tap sur « Je sors du RDV »', () => {
  const out = exitRdv(R(), 20 * MIN);
  assert.equal(pendingRdvReturn([out], 21 * MIN).id, 'r');
  assert.equal(nextRdvQuestion(out), 'prospect');
});

test('pendingRdvReturn : un RDV écourté mais réel (≥ 30 s) compte, pas un simple essai', () => {
  const r = R();
  assert.equal(pendingRdvReturn([{ ...r, counted: false, practicedSec: 45 }], 5 * H).id, 'r');
  assert.equal(pendingRdvReturn([{ ...r, counted: false, practicedSec: 30 }], 5 * H).id, 'r');
  assert.equal(pendingRdvReturn([{ ...r, counted: true, practicedSec: 10 }], 5 * H), null);
  assert.equal(pendingRdvReturn([{ ...r, counted: false, practicedSec: undefined }], 5 * H), null);
});

test('pendingRdvReturn : l’objectif d’un ancien retour reste demandé, puis le plus récent passe en premier', () => {
  const base = R({ goal: 'Budget', goalReached: null });
  assert.equal(pendingRdvReturn([{ ...base, feedback: 'non' }], 5 * H).id, 'r');
  assert.equal(pendingRdvReturn([{ ...base, feedback: 'non', goalReached: 'oui' }], 5 * H), null);
  assert.equal(pendingRdvReturn([{ ...base, feedback: 'non' }], 4 * D), null);
  const older = R({ id: 'old', endedAt: 0 });
  const newer = R({ id: 'new', endedAt: H });
  assert.equal(pendingRdvReturn([older, newer], 5 * H).id, 'new');
  assert.equal(pendingRdvReturn([older, newer], 4.5 * H).id, 'old');
});

test('rdvOnTime : déclaré, ou calculé depuis la durée mesurée, avec 5 min de tolérance', () => {
  assert.equal(rdvOnTime(R()), null);
  assert.equal(rdvOnTime(R({ rdvHeure: 'plus10' })), 'plus10');
  const m = (min, annonce) => R({ endedAt: 0, rdvEndedAt: min * MIN, rdvAnnonceMin: annonce });
  assert.equal(rdvOnTime(m(44, 45)), 'alheure');
  assert.equal(rdvOnTime(m(47, 45)), 'alheure');
  assert.equal(rdvOnTime(m(50, 45)), 'alheure'); // tolérance de 5 min
  assert.equal(rdvOnTime(m(53, 45)), 'plus10'); // 53 min ≈ 55 min
  assert.equal(rdvOnTime(m(55, 45)), 'plus10');
  assert.equal(rdvOnTime(m(58, 45)), 'plusde10');
  assert.equal(rdvOnTime(m(50, 'nsp')), 'nsp');
  assert.equal(rdvOnTime(R({ endedAt: 0, rdvEndedAt: 50 * MIN })), null);
});

const at = (dateKey, o) => R({ id: dateKey, dateKey, startedAt: Date.parse(dateKey), ...o });

test('rdvBoard : mois 1 = 28 jours consécutifs depuis la 1re semaine avec données, à côté des 4 dernières semaines', () => {
  const ss = [
    at('2026-10-05', { rdvSuite: 'date' }), at('2026-10-07', { rdvSuite: 'flou' }),
    at('2026-10-13', { rdvSuite: 'nsp' }),
    at('2026-10-27', { rdvSuite: 'nonclair' }),
    at('2026-11-03', { rdvSuite: 'flou' }), // 5e semaine : hors du mois 1
    at('2026-11-10', { rdvSuite: 'date' }),
    at('2026-11-30', { rdvSuite: 'date' }), at('2026-12-15', { rdvSuite: 'nonclair' }), at('2026-12-18', { rdvSuite: 'flou' }),
    at('2026-12-19', { rdvSuiteSkipped: true }),
    { ...at('2026-12-19', { rdvSuite: 'date' }), practicedSec: 5 },
    // Pas un premier RDV prospect : n'entre pas dans le taux de la suite.
    at('2026-12-17', { rdvProspect: 'non', rdvSuite: 'date' }),
  ];
  const suite = rdvBoard(ss, '2026-12-20').find((l) => l.key === 'suite');
  assert.deepEqual(suite.month1, { k: 2, n: 4 });
  assert.deepEqual(suite.recent, { k: 2, n: 3 });
  assert.equal(suite.separate, true);
  assert.equal(suite.source, 'observé en vrai');
});

test('rdvBoard : tant que le mois 1 recouvre les 4 dernières semaines, pas de comparaison', () => {
  const ss = [R({ dateKey: '2026-10-05', feedback: 'non' }), R({ dateKey: '2026-10-13', feedback: 'une' })];
  const rep = rdvBoard(ss, '2026-10-20').find((l) => l.key === 'repeter');
  assert.deepEqual(rep.month1, { k: 1, n: 2 });
  assert.equal(rep.separate, false);
  // Le mois 1 (5 octobre au 1er novembre) se termine avant le 4 novembre, début des 28 derniers jours au 1er décembre.
  assert.equal(rdvBoard(ss, '2026-12-01').find((l) => l.key === 'repeter').separate, true);
  assert.equal(rdvBoard(ss, '2026-11-28').find((l) => l.key === 'repeter').separate, false);
  const none = rdvBoard([], '2026-10-20');
  assert.deepEqual(none.map((l) => l.key), RDV_INDICATORS.map((i) => i.key));
  assert.ok(none.every((l) => l.month1.n === 0 && l.recent.n === 0 && l.separate === false));
});

test('rdvBoard : chaque ligne lit sa réponse ; « Je ne sais pas » compte sans réussir, sauf pour « répéter »', () => {
  const ss = [
    R({ dateKey: '2026-10-05', rdvBudget: 'moidebut', feedback: 'nsp', goal: 'x', goalReached: 'oui', endedAt: 0, rdvEndedAt: 30 * MIN, rdvAnnonceMin: 30 }),
    R({ dateKey: '2026-10-06', rdvBudget: 'nsp', feedback: 'non', goal: 'y', goalReached: 'nsp', rdvHeure: 'plusde10' }),
    R({ dateKey: '2026-10-07', rdvProspect: 'non', feedback: 'une', rdvHeure: 'alheure' }),
  ];
  const by = Object.fromEntries(rdvBoard(ss, '2026-10-10').map((l) => [l.key, l]));
  assert.deepEqual(by.budget.month1, { k: 1, n: 2 });
  // « répéter » n'avait pas « Je ne sais pas » en V1 : hors du total. Les RDV hors prospect y comptent.
  assert.deepEqual(by.repeter.month1, { k: 1, n: 2 });
  assert.deepEqual(by.objectif.month1, { k: 1, n: 2 });
  assert.deepEqual(by.heure.month1, { k: 1, n: 2 });
  assert.equal(by.heure.measured, 1);
  assert.equal(by.objectif.source, 'ressenti');
});
