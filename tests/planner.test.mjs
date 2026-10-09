import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTestContent } from './helpers.mjs';
import { programPosition, nextBloc3, buildDailyPlan, buildRdvPlan, VOICE_CONSIGNE } from '../js/core/planner.js';

const content = loadTestContent();
const total = (p) => p.steps.reduce((s, x) => s + x.durationSec, 0);
const artId = (p) => p.steps.find((s) => s.block === 'articulation').itemId;

test('programPosition avance par blocs de 5 séances', () => {
  assert.deepEqual(programPosition(1), { cycle: 1, week: 1 });
  assert.deepEqual(programPosition(5), { cycle: 1, week: 1 });
  assert.deepEqual(programPosition(6), { cycle: 1, week: 2 });
  assert.deepEqual(programPosition(30), { cycle: 1, week: 6 });
  assert.deepEqual(programPosition(31), { cycle: 2, week: 1 });
  assert.deepEqual(programPosition(31, 12), { cycle: 1, week: 7 });
  assert.deepEqual(programPosition(60, 12), { cycle: 1, week: 12 });
  assert.deepEqual(programPosition(61, 12), { cycle: 2, week: 1 });
  assert.deepEqual(programPosition(4, 18, 4), { cycle: 1, week: 1 });
  assert.deepEqual(programPosition(5, 18, 4), { cycle: 1, week: 2 });
  assert.deepEqual(programPosition(72, 18, 4), { cycle: 1, week: 18 });
  assert.deepEqual(programPosition(73, 18, 4), { cycle: 2, week: 1 });
});

test('nextBloc3 alterne', () => {
  assert.equal(nextBloc3(null), 'ecoute');
  assert.equal(nextBloc3('ecoute'), 'posture');
  assert.equal(nextBloc3('posture'), 'ecoute');
});

test('séance du jour : 300 s, échauffement voix + moteur, écoute en premier', () => {
  const p = buildDailyPlan({ content, sessionNumber: 1, dateKey: '2026-10-10' });
  assert.equal(p.type, 'daily');
  assert.equal(total(p), 300);
  const w = p.steps.filter((s) => s.block === 'echauffement');
  assert.deepEqual(w.map((s) => content.byId.get(s.itemId).type), ['voix', 'moteur']);
  assert.equal(p.bloc3, 'ecoute');
  assert.deepEqual(p.steps.filter((s) => s.block === 'articulation').map((s) => s.kind), ['slow', 'record', 'replay']);
  assert.deepEqual(p.steps.filter((s) => s.block === 'ecoute').map((s) => s.kind), ['listen', 'reformulate', 'reveal']);
  assert.equal(p.itemIds.length, 4);
});

test('déterministe', () => {
  const a = buildDailyPlan({ content, sessionNumber: 3, dateKey: '2026-10-12' });
  const b = buildDailyPlan({ content, sessionNumber: 3, dateKey: '2026-10-12' });
  assert.deepEqual(a.itemIds, b.itemIds);
});

test('posture après écoute', () => {
  const p = buildDailyPlan({ content, sessionNumber: 2, dateKey: '2026-10-11', lastBloc3: 'ecoute' });
  assert.equal(p.bloc3, 'posture');
  assert.equal(total(p), 300);
  assert.equal(p.steps.at(-1).kind, 'guide');
  assert.equal(p.steps.at(-1).block, 'posture');
});

test("évite l'articulation de la séance précédente", () => {
  const p1 = buildDailyPlan({ content, sessionNumber: 1, dateKey: '2026-10-10' });
  const p2 = buildDailyPlan({ content, sessionNumber: 2, dateKey: '2026-10-10', history: p1.itemIds });
  assert.notEqual(artId(p1), artId(p2));
});

test('articulation tirée de la semaine du programme', () => {
  const p = buildDailyPlan({ content, sessionNumber: 6, dateKey: '2026-10-10' });
  const ids = content.program.weeks[1].articulation.map((id) => `fr.${id}`);
  assert.ok(ids.includes(artId(p)));
  assert.equal(p.week, 2);
});

test('jour de mesure de voix : le bloc voix en premier, à la place de l’articulation, 300 s', () => {
  for (const voiceCheck of ['calibration', 'controle']) {
    const p = buildDailyPlan({ content, sessionNumber: 9, dateKey: '2026-10-10', voiceCheck });
    assert.equal(p.voiceCheck, voiceCheck);
    assert.equal(p.steps[0].block, 'voix', 'au début, avant l’échauffement (D §3.4)');
    assert.equal(p.steps.filter((s) => s.block === 'voix').length, 1);
    assert.equal(p.steps.filter((s) => s.block === 'articulation').length, 0);
    assert.deepEqual(p.steps.slice(1, 3).map((s) => s.block), ['echauffement', 'echauffement']);
    assert.equal(total(p), 300);
    assert.equal(p.itemIds.length, 3, 'échauffement × 2 + bloc 3');
    assert.equal('milestone' in p, false, 'plus aucun jalon planifié');
  }
});

test('bloc voix : consigne fixe (D §3.4), 3 prises du texte de référence, sans limite de temps', () => {
  const v = buildDailyPlan({ content, sessionNumber: 1, dateKey: '2026-10-10', voiceCheck: 'calibration' }).steps[0];
  assert.equal(v.kind, 'voice');
  assert.equal(v.untimed, true);
  assert.equal(v.title, 'Mesure de ta voix');
  assert.deepEqual(v.lines, [VOICE_CONSIGNE]);
  assert.equal(VOICE_CONSIGNE, 'Téléphone posé à 30 cm, même pièce. Lis comme si tu parlais à un prospect. Ne cherche pas à bien faire.');
  assert.equal(v.takes, 3);
  assert.equal(v.text, content.reference.texte);
  assert.equal(v.itemId, content.reference.id);
  assert.equal(v.syllables, 86);
  assert.equal(v.voiceCheck, 'calibration');
  assert.equal(v.recordKind, 'reference');
});

test('reprise + mesure de voix due : pas de bloc voix (elle reste due), 120 s', () => {
  const p = buildDailyPlan({ content, sessionNumber: 7, dateKey: '2026-10-10', voiceCheck: 'controle', comeback: true });
  assert.equal(p.type, 'comeback');
  assert.equal(total(p), 120);
  assert.equal(p.voiceCheck, null);
  assert.equal(p.steps.filter((s) => s.block === 'voix').length, 0);
  assert.deepEqual(p.steps.filter((s) => s.block === 'articulation').map((s) => s.kind), ['record', 'replay']);
});

test('sans mesure de voix due : articulation, aucun bloc voix', () => {
  const p = buildDailyPlan({ content, sessionNumber: 7, dateKey: '2026-10-10' });
  assert.equal(p.voiceCheck, null);
  assert.equal(p.steps.filter((s) => s.block === 'voix').length, 0);
  assert.equal(p.steps.filter((s) => s.block === 'articulation').length, 3);
});

test('avant RDV : 90 s, consigne différente de la précédente', () => {
  const p = buildRdvPlan({ content, dateKey: '2026-10-10', lastConsigneId: 'fr.C01' });
  assert.equal(p.type, 'prerdv');
  assert.equal(total(p), 90);
  assert.notEqual(p.consigneId, 'fr.C01');
  assert.deepEqual(p.steps.map((s) => s.kind), ['objective', 'breathe', 'consigne']);
});

test('programme de 18 semaines × 4 séances : Charisme à la séance 25, Situations à la séance 49', () => {
  assert.equal(content.program.weeks.length, 18);
  assert.equal(content.program.sessionsPerWeek, 4);
  const charisme = buildDailyPlan({ content, sessionNumber: 25, dateKey: '2026-12-01' });
  assert.equal(charisme.week, 7);
  assert.ok(content.program.weeks[6].articulation.map((id) => `fr.${id}`).includes(artId(charisme)));
  const situations = buildDailyPlan({ content, sessionNumber: 49, dateKey: '2027-01-01' });
  assert.equal(situations.week, 13);
  assert.ok(content.program.weeks[12].articulation.map((id) => `fr.${id}`).includes(artId(situations)));
  assert.equal(total(situations), 300);
});

test('séance 73 : nouveau cycle, retour en semaine 1', () => {
  const p = buildDailyPlan({ content, sessionNumber: 73, dateKey: '2027-02-01' });
  assert.equal(p.cycle, 2);
  assert.equal(p.week, 1);
});
