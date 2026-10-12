// Logique des profils Pro, Études et Quotidien (spec 2026-10-12-ohmaparole-profils-design.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfileContent } from './helpers.mjs';
import { PROFILS, PROFIL_CHOICES, profilLine, profilOf, isNeutral, ofProfil, withProfil } from '../js/core/profil.js';
import { indexContent } from '../js/core/content-index.js';
import { programGoal } from '../js/core/dashboard.js';
import * as L from '../js/core/louarn.js';
import { buildDailyPlan, buildRdvPlan, VOICE_CONSIGNE } from '../js/core/planner.js';
import { bilanDue, buildBilanPlan, BILAN_CONSIGNE } from '../js/core/bilan-plan.js';
import { rdvQuestionIds, nextRdvQuestion, answerRdv, rdvBoard } from '../js/core/rdv.js';
import { pickPointItem, readyQuestion, READY_QUESTION } from '../js/core/weekly-point.js';
import { textsFor, BLOCKS, FIN, RDV_NO_RECORD } from '../js/core/texts.js';
import { buildBilanReport, REALISME } from '../js/core/evaluation.js';

const PRO = loadProfileContent('pro');
const ETUDES = loadProfileContent('etudes');
const QUOTIDIEN = loadProfileContent('quotidien');

test('les 3 profils et leurs choix en une ligne', () => {
  assert.deepEqual(PROFILS, ['pro', 'etudes', 'quotidien']);
  assert.deepEqual(PROFIL_CHOICES.map(profilLine), [
    'Pro · prise de parole et rendez-vous de vente',
    'Études · exposés, jury, stage, premier emploi',
    'Quotidien · famille, amis, vie de tous les jours',
  ]);
});

test('une ligne sans profil est une ligne d’avant : elle compte comme pro', () => {
  assert.equal(profilOf({}), 'pro');
  assert.equal(profilOf({ profil: 'bidule' }), 'pro');
  assert.equal(profilOf({ profil: 'etudes' }), 'etudes');
  assert.equal(isNeutral('pro'), false);
  assert.equal(isNeutral(undefined), false);
  assert.equal(isNeutral('quotidien'), true);
});

test('ofProfil : les lignes du profil, depuis le dernier changement', () => {
  const rows = [
    { id: 'a', createdAt: 10 }, { id: 'b', createdAt: 20, profil: 'pro' },
    { id: 'c', createdAt: 30, profil: 'etudes' }, { id: 'd', createdAt: 40, profil: 'etudes' },
  ];
  assert.deepEqual(ofProfil(rows, 'pro').map((r) => r.id), ['a', 'b']);
  assert.deepEqual(ofProfil(rows, 'etudes').map((r) => r.id), ['c', 'd']);
  assert.deepEqual(ofProfil(rows, 'etudes', 35).map((r) => r.id), ['d']);
  assert.deepEqual(ofProfil(rows, 'pro', 15).map((r) => r.id), ['b']);
  assert.deepEqual(withProfil([{ id: 'x' }], 'quotidien'), [{ id: 'x', profil: 'quotidien' }]);
});

test('profil pro : le contenu d’avant, tel quel', () => {
  const base = indexContent({ program: PRO.program, exercises: { lang: 'fr', items: PRO.items, consignes: PRO.consignes }, extras: PRO.extras });
  assert.equal(PRO.profil, 'pro');
  assert.equal(PRO.reference.id, 'fr.REF1');
  assert.equal(PRO.program.weeks.length, 18);
  assert.equal(programGoal(PRO.program), 72);
  assert.deepEqual(PRO.consignes.map((c) => c.id).slice(0, 2), ['fr.C01', 'fr.C02']);
  assert.deepEqual(PRO.motivations, base.motivations);
  assert.ok(PRO.byId.get('fr.A10').pourquoi.includes('métier'));
  assert.ok(PRO.louarn.repliques.some((l) => l.id === 'tip-rdv-01'));
  assert.ok(!PRO.louarn.repliques.some((l) => l.id.startsWith('q-')));
  assert.equal(PRO.mesure.referenceSyllabes, 86);
});

test('profils non pro : programme, référence, extras, consignes, mesure et Louarn du profil', () => {
  for (const [c, profil] of [[ETUDES, 'etudes'], [QUOTIDIEN, 'quotidien']]) {
    assert.equal(c.profil, profil);
    assert.equal(c.program.profil, profil);
    assert.equal(programGoal(c.program), 48);
    assert.equal(c.reference.id, 'fr.REFQ1');
    assert.equal(c.reference.syllabes, 84);
    assert.deepEqual(c.consignes.map((x) => x.id).slice(0, 2), ['fr.QC01', 'fr.QC02']);
    assert.equal(c.mesure.textesInedits[0].id, 'fr.TQA');
    assert.equal(c.extras.objectifDefaut, 'Être posé et clair à l\'oral, en groupe comme en tête-à-tête.');
    assert.deepEqual(c.extras.objectifsRdv, c.extras.objectifsMoment);
    assert.equal(c.extras.gardeFous.length, 4, 'garde-fous et note clinique gardés');
    assert.equal(c.motivations.length, 12);
    assert.ok(c.motivations.includes('Tu as le droit de prendre ton temps avant de parler.'));
    const ids = new Set(c.louarn.repliques.map((l) => l.id));
    assert.ok(!ids.has('tip-rdv-01') && ids.has('q-tip-rdv-01') && ids.has('tip-rdv-09'));
    assert.ok(ids.has(profil === 'etudes' ? 'pe-th-07' : 'pq-th-07'));
    assert.ok(!ids.has(profil === 'etudes' ? 'pq-th-07' : 'pe-th-07'));
  }
});

test('« pourquoi » neutres des virelangues A10, A12 et A14 (surcharge par profil)', () => {
  assert.equal(ETUDES.byId.get('fr.A10').pourquoi, 'Les mots longs se travaillent : à l’oral, ce sont eux qu’on avale en premier.');
  assert.equal(ETUDES.byId.get('fr.A12').pourquoi, 'Un groupe de consonnes bien passé, et toute la phrase devient plus claire.');
  assert.equal(QUOTIDIEN.byId.get('fr.A14').pourquoi, 'Enchaîner sans trébucher, c’est garder l’attention de ceux qui t’écoutent.');
  assert.equal(ETUDES.byId.get('fr.A11').pourquoi, PRO.byId.get('fr.A11').pourquoi);
  assert.notEqual(PRO.byId.get('fr.A10').pourquoi, ETUDES.byId.get('fr.A10').pourquoi, 'le profil pro ne change pas');
});

// ── Louarn ──────────────────────────────────────────────────────────────────────────────────────

test('stades proportionnels à l’objectif : 72 inchangé, 48 → 0, 8, 16, 24, 32, 48', () => {
  assert.equal(L.stagesFor(72), L.STAGES);
  assert.deepEqual(L.stagesFor().map((s) => s.seuil), [0, 12, 24, 36, 48, 72]);
  assert.deepEqual(L.stagesFor(48).map((s) => s.seuil), [0, 8, 16, 24, 32, 48]);
  assert.deepEqual(L.stagesFor(48).map((s) => s.nom), L.STAGES.map((s) => s.nom));
  for (const [n, id] of [[0, 1], [7, 1], [8, 2], [15, 2], [16, 3], [24, 4], [31, 4], [32, 5], [47, 5], [48, 6], [200, 6]]) {
    assert.equal(L.stageFor(n, 48).id, id, `${n} séances sur 48`);
  }
  assert.deepEqual(L.nextStage(0, 48), { stage: L.stagesFor(48)[1], remaining: 8 });
  assert.equal(L.nextStage(48, 48), null);
  assert.equal(L.stageUp(23, 24, 48).id, 4);
  assert.equal(L.stageUp(24, 25, 48), null);
  assert.equal(L.stade6PlusToday({ dailyCount: 48, todayKey: 'k', goal: 48 }), true);
  assert.equal(L.stade6PlusToday({ dailyCount: 48, todayKey: 'k' }), false);
});

test('non-régression des stades pro (72 séances)', () => {
  for (const [n, id] of [[0, 1], [11, 1], [12, 2], [24, 3], [36, 4], [48, 5], [71, 5], [72, 6]]) {
    assert.equal(L.stageFor(n).id, id);
    assert.equal(L.stageFor(n, 72).id, id);
  }
  assert.deepEqual(L.nextStage(48), { stage: L.STAGES[5], remaining: 24 });
  assert.equal(L.stageUp(71, 72).id, 6);
  assert.equal(L.stageUp(23, 24).id, 3);
});

test('themeTag, cycle:2 et theme:langues sur l’objectif du profil (12 thèmes)', () => {
  assert.equal(L.themeTag(43, 44, 4, 12), 'theme:12');
  assert.equal(L.themeTag(47, 48, 4, 12), 'theme:langues');
  assert.equal(L.themeTag(48, 49, 4, 12), 'cycle:2');
  assert.equal(L.themeTag(71, 72, 4, 12), null, 'cycle 2 : pas d’annonce de thème, comme en pro');
  assert.equal(L.themeTag(71, 72), 'theme:langues', 'pro inchangé');
});

test('conditions profil:etudes et profil:quotidien', () => {
  assert.ok(L.isKnownCondition('profil:etudes'));
  assert.ok(L.isKnownCondition('profil:quotidien&theme:7'));
  assert.ok(!L.isKnownCondition('profil:pro'));
  assert.ok(!L.isKnownCondition('profil:etudes&profil:quotidien'));
  assert.ok(!L.isKnownCondition('profil:etudes&theme:99'));
  assert.deepEqual(L.contextTags({ hour: 9, dailyCount: 0, weeks: 12, profil: 'etudes' }), ['matin', 'profil:etudes']);
  assert.deepEqual(L.contextTags({ hour: 9, dailyCount: 30, weeks: 12, profil: 'pro' }), ['matin', 'bloc>=2']);
  assert.deepEqual(L.themeContext('theme:7', 'quotidien'), ['profil:quotidien&theme:7', 'theme:7']);
  assert.deepEqual(L.themeContext('theme:7', 'pro'), ['theme:7']);
});

test('fin de thème : la réplique de thème du profil passe avant la générique', () => {
  for (const [c, profil, id] of [[ETUDES, 'etudes', 'pe-th-08'], [QUOTIDIEN, 'quotidien', 'pq-th-08']]) {
    const b = L.endBubble({ prevCount: 27, newCount: 28, session: { completed: true }, weeks: 12, profil });
    assert.deepEqual(b, { moment: 'theme', context: [`profil:${profil}&theme:8`, 'theme:8'] });
    assert.equal(L.pickLine(c.louarn.repliques, { ...b, dayKey: 'k' }).id, id);
  }
  // Fin du bloc 1 (24) : montée au stade 4, la réplique du nouveau bloc en dessous.
  const c = L.endCelebration({ prevCount: 23, newCount: 24, session: { completed: true }, todayKey: '2026-10-12', weeks: 12, profil: 'etudes' });
  assert.deepEqual(c.stage, { from: 3, to: 4 });
  assert.equal(c.next.stage.id, 5);
  assert.equal(c.next.remaining, 8);
  assert.deepEqual(c.secondary, { moment: 'theme', context: ['profil:etudes&theme:7', 'theme:7'] });
  assert.equal(L.pickLine(ETUDES.louarn.repliques, { ...c.secondary, dayKey: 'k' }).id, 'pe-th-07');
  // Fin du programme (48) : stade 6, puis les langues.
  const end = L.endCelebration({ prevCount: 47, newCount: 48, session: { completed: true }, todayKey: '2026-10-12', weeks: 12, profil: 'quotidien' });
  assert.deepEqual(end.stage, { from: 5, to: 6 });
  assert.deepEqual(end.secondary.context, ['profil:quotidien&theme:langues', 'theme:langues']);
});

test('souvenirs : « Le sentier entier » à l’objectif du profil, nom neutre du premier moment important', () => {
  const day = (i) => ({ id: `s${i}`, type: 'daily', counted: true, startedAt: i * 1000, dateKey: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` });
  const sessions = Array.from({ length: 48 }, (_, i) => day(i));
  sessions.push({ id: 'r', type: 'prerdv', practicedSec: 60, startedAt: 500, dateKey: '2026-01-01' });
  const ids = (list) => list.map((s) => s.id);
  assert.ok(ids(L.souvenirs(sessions, [], { goal: 48, profil: 'etudes' })).includes('sentier'));
  assert.ok(!ids(L.souvenirs(sessions, [])).includes('sentier'), 'pro : à 72');
  assert.equal(L.souvenirs(sessions, [], { goal: 48, profil: 'etudes' }).find((s) => s.id === 'premier-rdv').nom, 'Le premier moment important');
  assert.equal(L.souvenirs(sessions, []).find((s) => s.id === 'premier-rdv').nom, 'Le premier rendez-vous');
});

// ── Séance, moment important, bilans ────────────────────────────────────────────────────────────

const neutralLines = (steps) => steps.flatMap((s) => [s.title, ...(s.lines ?? []), s.speak, s.speakTake]).filter(Boolean);

test('séance non pro : programme du profil, consignes de voix neutres', () => {
  const plan = buildDailyPlan({ content: ETUDES, sessionNumber: 1, dateKey: '2026-10-12', voiceCheck: 'calibration' });
  assert.equal(plan.steps[0].text, ETUDES.reference.texte);
  assert.equal(plan.steps[0].syllables, 84);
  assert.ok(!neutralLines(plan.steps).includes(VOICE_CONSIGNE));
  assert.doesNotMatch(neutralLines(plan.steps).join(' '), /prospect|rendez-vous/);
  const p2 = buildDailyPlan({ content: QUOTIDIEN, sessionNumber: 30, dateKey: '2026-10-12' });
  assert.equal(p2.week, 8);
  assert.ok(p2.itemIds.some((id) => /^fr\.QA(19|2[0-2])$/.test(id)), p2.itemIds.join());
  const pro = buildDailyPlan({ content: PRO, sessionNumber: 1, dateKey: '2026-10-12', voiceCheck: 'calibration' });
  assert.deepEqual(pro.steps[0].lines, [VOICE_CONSIGNE]);
  assert.equal(pro.steps[0].speakTake, undefined);
});

test('point de la semaine non pro : lignes neutres, cycle sur l’objectif', () => {
  const item = QUOTIDIEN.mesure.repliquesEclair[0];
  const plan = buildDailyPlan({ content: QUOTIDIEN, sessionNumber: 8, dateKey: '2026-10-12', weeklyPoint: { theme: 2, format: 'eclair', item } });
  const st = plan.steps.find((s) => s.kind === 'eclair');
  assert.doesNotMatch(st.lines.join(' '), /prospect/);
  assert.ok(st.labels?.ecouter);
  const sp = buildDailyPlan({ content: ETUDES, sessionNumber: 4, dateKey: '2026-10-12', weeklyPoint: { theme: 1, format: 'spontane', item: ETUDES.mesure.questionsSpontanees[0] } });
  const sst = sp.steps.find((s) => s.kind === 'spontane');
  assert.doesNotMatch(sst.lines.join(' '), /rendez-vous/);
  assert.equal(sst.readyQuestion, readyQuestion('etudes'));
  assert.equal(readyQuestion('pro'), READY_QUESTION);
  assert.equal(readyQuestion('quotidien'), 'Si tu avais un moment important demain :');
  // Cycle de 48 séances : la question tirée au point de la séance 4 ne revient pas avant la séance 49.
  const done = [{ id: 'a', type: 'daily', counted: true, startedAt: 1, sessionNumber: 4, weeklyPoint: { theme: 1, format: 'spontane', itemId: 'fr.QSQ01' } }];
  const pool = { questionsSpontanees: [{ id: 'fr.QSQ01' }, { id: 'fr.QSQ02' }] };
  assert.equal(pickPointItem({ format: 'spontane', mesure: pool, sessions: done, sessionNumber: 44, dateKey: 'k', cycleSessions: 48 }).id, 'fr.QSQ02');
});

test('avant un moment important : objectif neutre, consignes QC', () => {
  const plan = buildRdvPlan({ content: QUOTIDIEN, dateKey: '2026-10-12', lastConsigneId: 'fr.QC03' });
  assert.match(plan.consigneId, /^fr\.QC\d\d$/);
  assert.notEqual(plan.consigneId, 'fr.QC03');
  assert.doesNotMatch(neutralLines(plan.steps).join(' '), /rendez-vous|RDV/);
  const pro = buildRdvPlan({ content: PRO, dateKey: '2026-10-12' });
  assert.deepEqual(pro.steps[0].lines, ['À la fin de ce rendez-vous, je veux…']);
});

test('bilans aux séances 24 et 48 pour les non-pro, avec le pack Mesure du profil', () => {
  assert.deepEqual(bilanDue({ sessionNumber: 24 }), { index: 1 });
  assert.deepEqual(bilanDue({ sessionNumber: 48 }), { index: 2 });
  assert.equal(bilanDue({ sessionNumber: 30 }), null);
  const plan = buildBilanPlan({ content: ETUDES, sessionNumber: 24, dateKey: '2026-10-12', index: 1 });
  const texts = plan.steps.filter((s) => s.kind === 'lecture').map((s) => s.itemId);
  assert.equal(texts[0], 'fr.REFQ1');
  assert.deepEqual([...texts.slice(1)].sort(), ['fr.TQA', 'fr.TQB', 'fr.TQC']);
  assert.equal(plan.steps.find((s) => s.kind === 'ecoute-bilan').itemId, 'fr.ERQ1');
  assert.equal(buildBilanPlan({ content: ETUDES, sessionNumber: 48, dateKey: 'k', index: 2 }).steps.find((s) => s.kind === 'ecoute-bilan').itemId, 'fr.ERQ2');
  const all = neutralLines(plan.steps).join(' ');
  assert.doesNotMatch(all, /prospect|artisan|RDV/);
  assert.ok(!all.includes(BILAN_CONSIGNE));
  const pro = buildBilanPlan({ content: PRO, sessionNumber: 24, dateKey: 'k', index: 1 });
  assert.equal(pro.steps.find((s) => s.kind === 'grille').title, 'Tes gestes en RDV');
});

test('retour d’un moment important : « Objectif atteint ? » puis « On t’a fait répéter ? », rien d’autre', () => {
  const s = { type: 'prerdv', profil: 'etudes', practicedSec: 90, endedAt: 0, goal: 'Finir à l’heure' };
  assert.deepEqual(rdvQuestionIds(s), ['objectif', 'repeter']);
  assert.deepEqual(rdvQuestionIds({ ...s, goal: '' }), ['repeter']);
  assert.equal(nextRdvQuestion(s), 'objectif');
  const a = answerRdv(s, 'objectif', 'oui', 1);
  assert.equal(nextRdvQuestion(a), 'repeter');
  assert.equal(nextRdvQuestion(answerRdv(a, 'repeter', 'non', 2)), null);
  assert.equal(nextRdvQuestion(answerRdv({ ...s, goal: '' }, 'repeter', 'non', 2)), null);
  // La durée mesurée ne change rien : pas de question de durée.
  assert.deepEqual(rdvQuestionIds({ ...s, rdvEndedAt: 30 * 60000 }), ['objectif', 'repeter']);
  // Pro : inchangé.
  assert.deepEqual(rdvQuestionIds({ type: 'prerdv', practicedSec: 90, endedAt: 0, goal: 'x' }), ['prospect', 'objectif', 'suite', 'budget', 'repeter']);
  // Les moments importants n'entrent jamais dans les taux de suite, de budget et de durée.
  const board = rdvBoard([{ ...a, dateKey: '2026-10-01', feedback: 'non' }], '2026-10-12');
  assert.equal(board.find((l) => l.key === 'suite').month1.n, 0);
  assert.equal(board.find((l) => l.key === 'repeter').month1.n, 1);
  assert.equal(board.find((l) => l.key === 'objectif').month1.n, 1);
});

test('textes neutres de texts.js', () => {
  const t = textsFor('quotidien');
  assert.equal(textsFor('pro').BLOCKS, BLOCKS);
  assert.equal(textsFor('pro').FIN, FIN);
  assert.equal(textsFor('pro').RDV_NO_RECORD, RDV_NO_RECORD);
  assert.equal(textsFor('pro').rdvButton, 'Avant un rendez-vous · 90 s');
  assert.equal(t.rdvButton, 'Avant un moment important · 90 s');
  assert.equal(t.rdvExit, 'C’est fait');
  assert.equal(textsFor('pro').rdvExit, 'Je sors du RDV');
  assert.equal(t.rdvCardTitle, 'Dans tes moments importants');
  assert.equal(textsFor('pro').rdvCardTitle, 'En rendez-vous');
  assert.equal(t.BLOCKS.rdv.label, 'Avant un moment important');
  assert.equal(t.FIN.length, FIN.length);
  assert.match(t.RDV_NO_RECORD, /226-1/);
  for (const k of Object.keys(textsFor('pro'))) assert.ok(k in t, `variante neutre manquante : ${k}`);
});

test('rapport de bilan non pro : axe « Dans tes moments importants », réalisme sur 48 séances', () => {
  const session = { id: 'b', type: 'daily', counted: true, startedAt: 10, dateKey: '2026-10-12', sessionNumber: 24, profil: 'etudes', bilan: { kind: 'bilan', index: 1, order: [] } };
  const r = buildBilanReport({ session, sessions: [session], todayKey: '2026-10-12', lines: ETUDES.mesure, profil: 'etudes' });
  const rdv = r.axes.find((a) => a.key === 'rdv');
  assert.equal(rdv.label, 'Dans tes moments importants');
  assert.doesNotMatch(JSON.stringify(r), /RDV|prospect|rendez-vous/);
  assert.match(r.realisme, /séance 48/);
  const pro = buildBilanReport({ session: { ...session, profil: undefined }, sessions: [session], todayKey: '2026-10-12', lines: PRO.mesure });
  assert.equal(pro.realisme, REALISME);
  assert.equal(pro.axes.find((a) => a.key === 'rdv').label, 'En RDV');
});

test('les lignes de mesure portent le profil de leur prise ; une prise d’avant n’en a pas (pro)', async () => {
  const { measureRows } = await import('../js/core/voice-report.js');
  const { spontaneRows } = await import('../js/core/weekly-point.js');
  const rec = { id: 'r', dateKey: '2026-10-12', createdAt: 1, sessionId: 's' };
  const rows = measureRows({ recording: { ...rec, profil: 'etudes' }, kind: 'calibration', metrics: { debit: 5 } });
  assert.equal(rows[0].profil, 'etudes');
  assert.equal('profil' in measureRows({ recording: rec, kind: 'calibration', metrics: { debit: 5 } })[0], false);
  const res = { valid: true, analysis: { D: 10, pauseTotal: 2, pauseCount: 3 } };
  assert.ok(spontaneRows({ ...rec, profil: 'quotidien' }, res).every((r) => r.profil === 'quotidien'));
  assert.deepEqual(ofProfil(rows, 'etudes').length, rows.length);
  assert.deepEqual(ofProfil(rows, 'pro').length, 0);
});
