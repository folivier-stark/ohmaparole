import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTestContent } from './helpers.mjs';
import { programPosition, nextBloc3, buildDailyPlan, buildRdvPlan } from '../js/core/planner.js';

const content = loadTestContent();
const total = (p) => p.steps.reduce((s, x) => s + x.durationSec, 0);
const artId = (p) => p.steps.find((s) => s.block === 'articulation').itemId;

test('programPosition avance par blocs de 5 séances', () => {
  assert.deepEqual(programPosition(1), { cycle: 1, week: 1 });
  assert.deepEqual(programPosition(5), { cycle: 1, week: 1 });
  assert.deepEqual(programPosition(6), { cycle: 1, week: 2 });
  assert.deepEqual(programPosition(30), { cycle: 1, week: 6 });
  assert.deepEqual(programPosition(31), { cycle: 2, week: 1 });
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

test('jour de jalon : texte de référence enregistré, 300 s', () => {
  const p = buildDailyPlan({ content, sessionNumber: 7, dateKey: '2026-10-10', dueMilestone: 7 });
  const rec = p.steps.find((s) => s.kind === 'record');
  assert.equal(rec.recordKind, 'reference');
  assert.equal(rec.milestone, 7);
  assert.equal(rec.itemId, content.reference.id);
  assert.equal(p.milestone, 7);
  assert.equal(total(p), 300);
  assert.equal(p.steps.filter((s) => s.block === 'articulation').length, 0);
});

test('reprise : 2 min, pas de bloc 3', () => {
  const p = buildDailyPlan({ content, sessionNumber: 4, dateKey: '2026-10-10', comeback: true });
  assert.equal(p.type, 'comeback');
  assert.equal(total(p), 120);
  assert.equal(p.bloc3, null);
  assert.deepEqual(p.steps.filter((s) => s.block === 'articulation').map((s) => s.kind), ['record', 'replay']);
});

test('avant RDV : 90 s, consigne différente de la précédente', () => {
  const p = buildRdvPlan({ content, dateKey: '2026-10-10', lastConsigneId: 'fr.C01' });
  assert.equal(p.type, 'prerdv');
  assert.equal(total(p), 90);
  assert.notEqual(p.consigneId, 'fr.C01');
  assert.deepEqual(p.steps.map((s) => s.kind), ['objective', 'breathe', 'consigne']);
});
