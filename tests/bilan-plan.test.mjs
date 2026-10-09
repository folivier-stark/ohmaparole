import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson, loadTestContent } from './helpers.mjs';
import {
  BILAN_EVERY, CONTROL_AFTER, bilanDue, bilanControlDue, bilanAnnouncement, ineditOrder, buildBilanPlan,
  buildBilanControlPlan, lastBilanKey, bilansDone, FORME_OPTIONS,
} from '../js/core/bilan-plan.js';
import { weeklyPointDue } from '../js/core/weekly-point.js';
import { voiceCheckDue, voiceChecks } from '../js/core/voice-plan.js';
import { buildDailyPlan } from '../js/core/planner.js';

const MESURE = readJson('content/fr/mesure.json');
const content = { ...loadTestContent(), mesure: MESURE };
let clock = 0;
const S = (sessionNumber, o = {}) => ({
  id: `s${sessionNumber}-${++clock}`, type: 'daily', counted: true, completed: true, startedAt: ++clock * 1000,
  dateKey: `2026-10-${String(10 + (sessionNumber % 20)).padStart(2, '0')}`, sessionNumber, ...o,
});
const bilan = (n, extra = {}) => S(n, { bilan: { kind: 'bilan', index: n / BILAN_EVERY, order: ['fr.TA', 'fr.TB', 'fr.TC'], controlDueAt: null, ...extra } });

test('bilans aux séances 24, 48 et 72 : ils remplacent la séance du jour', () => {
  assert.equal(BILAN_EVERY, 24);
  for (const n of [1, 12, 23]) assert.equal(bilanDue({ sessionNumber: n, sessions: [] }), null, `séance ${n}`);
  assert.equal(bilanDue({ sessionNumber: 25, sessions: [bilan(24)] }), null);
  assert.equal(bilanDue({ sessionNumber: 28, sessions: [] }), null, 'au-delà de 3 séances de report : le prochain bilan');
  assert.deepEqual(bilanDue({ sessionNumber: 24, sessions: [] }), { index: 1 });
  assert.deepEqual(bilanDue({ sessionNumber: 48, sessions: [bilan(24)] }), { index: 2 });
  assert.deepEqual(bilanDue({ sessionNumber: 72, sessions: [bilan(24), bilan(48)] }), { index: 3 });
  assert.equal(bilanDue({ sessionNumber: 24, sessions: [bilan(24)] }), null, 'déjà fait');
});

test('bilan : un jour de reprise, il est reporté à la séance suivante ; une séance non comptée ne le consomme pas', () => {
  assert.equal(bilanDue({ sessionNumber: 24, sessions: [], comeback: true }), null);
  assert.deepEqual(bilanDue({ sessionNumber: 25, sessions: [S(24)] }), { index: 1 });
  assert.deepEqual(bilanDue({ sessionNumber: 24, sessions: [{ ...bilan(24), counted: false }] }), { index: 1 });
  assert.equal(bilansDone([{ ...bilan(24), counted: false }]).length, 0);
});

test('bilan : la veille, l’accueil l’annonce ; le jour même aussi', () => {
  assert.equal(bilanAnnouncement({ dailyCount: 23, doneToday: true }), 'Demain : ton bilan de 10 min.');
  assert.equal(bilanAnnouncement({ dailyCount: 23, doneToday: false }), 'Aujourd’hui : ton bilan de 10 min.');
  assert.equal(bilanAnnouncement({ dailyCount: 22, doneToday: true }), null);
  assert.equal(bilanAnnouncement({ dailyCount: 22, doneToday: false }), null);
  assert.equal(bilanAnnouncement({ dailyCount: 47, doneToday: true }), 'Demain : ton bilan de 10 min.');
  assert.equal(bilanAnnouncement({ dailyCount: 24, doneToday: true }), null);
});

test('pas de doublon : le point de la semaine dû le jour du bilan est reporté', () => {
  // weeklyPointDue reçoit le bilan comme une mesure de voix : il le reporte.
  assert.equal(weeklyPointDue({ sessionNumber: 24, sessions: [], voiceCheck: 'bilan' }), null);
  assert.deepEqual(weeklyPointDue({ sessionNumber: 25, sessions: [bilan(24)] }), { theme: 6, format: 'spontane' });
});

test('pas de doublon : le bilan compte comme une mesure de voix (1 lecture du texte de référence)', () => {
  const cal = ['c1', 'c2', 'c3'].flatMap((id, i) => [0, 1].map((j) => ({
    id: `${id}-${j}`, kind: 'reference', voiceCheck: 'calibration', sessionId: id, sessionNumber: i + 1, dateKey: `2026-09-0${i + 1}`, createdAt: i * 10 + j,
  })));
  const b = { id: 'b24', kind: 'reference', voiceCheck: 'bilan', sessionId: 's24', sessionNumber: 24, dateKey: '2026-10-20', createdAt: 100 };
  assert.equal(voiceChecks([...cal, b]).at(-1).valid, true, 'une seule prise suffit pour le bilan');
  assert.equal(voiceCheckDue([...cal, b], 24, { todayKey: '2026-10-21' }), null, 'le prochain contrôle repart du bilan');
  assert.equal(voiceCheckDue([...cal, b], 29, { todayKey: '2026-10-28' }), 'controle');
});

test('ineditOrder : A, B et C dans un ordre aléatoire mais déterministe pour la séance', () => {
  const ids = MESURE.textesInedits.map((t) => t.id);
  const o = ineditOrder(ids, 'seed-1');
  assert.deepEqual([...o].sort(), [...ids].sort());
  assert.deepEqual(ineditOrder(ids, 'seed-1'), o);
  const orders = new Set(Array.from({ length: 30 }, (_, i) => ineditOrder(ids, `s${i}`).join()));
  assert.ok(orders.size > 1, 'l’ordre change d’une séance à l’autre');
});

test('buildBilanPlan : les 7 étapes, 10 min environ, l’écoute réservée du bilan', () => {
  const p = buildBilanPlan({ content, sessionNumber: 24, dateKey: '2026-10-20', index: 1, seed: 'x' });
  assert.equal(p.type, 'daily');
  assert.equal(p.bilan.index, 1);
  assert.equal(p.bilan.kind, 'bilan');
  assert.deepEqual(p.steps.map((s) => s.kind), ['forme', 'lecture', 'lecture', 'lecture', 'lecture', 'presentation', 'ecoute-bilan', 'grille', 'ab']);
  assert.ok(p.steps.every((s) => s.block === 'bilan' && s.untimed));
  const lectures = p.steps.filter((s) => s.kind === 'lecture');
  assert.equal(lectures[0].itemId, content.reference.id);
  assert.equal(lectures[0].syllables, 86);
  assert.equal(lectures[0].role, 'ref');
  assert.deepEqual(lectures.slice(1).map((s) => s.itemId), p.bilan.order);
  assert.ok(lectures.slice(1).every((s) => s.role === 'inedit' && s.syllables === 87 && s.takes === 1));
  assert.equal(p.steps.find((s) => s.kind === 'ecoute-bilan').itemId, 'fr.ER1');
  assert.equal(buildBilanPlan({ content, sessionNumber: 48, dateKey: 'd', index: 2, seed: 'x' }).steps.find((s) => s.kind === 'ecoute-bilan').itemId, 'fr.ER2');
  assert.equal(buildBilanPlan({ content, sessionNumber: 72, dateKey: 'd', index: 3, seed: 'x' }).steps.find((s) => s.kind === 'ecoute-bilan').itemId, 'fr.ER3');
  assert.equal(p.steps.find((s) => s.kind === 'grille').items.length, 6);
  assert.equal(p.steps.find((s) => s.kind === 'presentation').maxSec, 60);
  const total = p.steps.reduce((a, s) => a + s.durationSec, 0);
  assert.ok(total >= 420 && total <= 600, `${total} s`);
  assert.equal(p.bloc3, null);
  assert.equal(p.voiceCheck, null);
  assert.deepEqual(FORME_OPTIONS.map((o) => o.label), ['En forme', 'Moyen', 'Fatigué']);
});

test('bilan de contrôle : 3 min (texte de référence et inédits) 5 séances après une baisse', () => {
  assert.equal(CONTROL_AFTER, 5);
  const b = bilan(24, { controlDueAt: 29 });
  assert.equal(bilanControlDue({ sessionNumber: 28, sessions: [b] }), null);
  assert.deepEqual(bilanControlDue({ sessionNumber: 29, sessions: [b] }), { of: b.id, index: 1, order: ['fr.TA', 'fr.TB', 'fr.TC'] });
  assert.deepEqual(bilanControlDue({ sessionNumber: 31, sessions: [b] }), { of: b.id, index: 1, order: ['fr.TA', 'fr.TB', 'fr.TC'] }, 'reste dû');
  const done = S(29, { bilan: { kind: 'controle', of: b.id, index: 1 } });
  assert.equal(bilanControlDue({ sessionNumber: 30, sessions: [b, done] }), null);
  assert.equal(bilanControlDue({ sessionNumber: 30, sessions: [bilan(24)] }), null, 'sans baisse, pas de contrôle');
  const c = buildBilanControlPlan({ content, sessionNumber: 29, dateKey: 'd', control: { of: b.id, index: 1, order: ['fr.TC', 'fr.TA', 'fr.TB'] } });
  assert.deepEqual(c.steps.map((s) => s.kind), ['forme', 'lecture', 'lecture', 'lecture', 'lecture']);
  assert.deepEqual(c.steps.slice(2).map((s) => s.itemId), ['fr.TC', 'fr.TA', 'fr.TB'], 'même ordre qu’au bilan');
  assert.equal(c.bilan.kind, 'controle');
  const total = c.steps.reduce((a, s) => a + s.durationSec, 0);
  assert.ok(total <= 200, `${total} s`);
});

test('lastBilanKey : le jour du dernier bilan (pas des contrôles), point de départ des tendances', () => {
  assert.equal(lastBilanKey([]), null);
  const b1 = bilan(24, { }); const b2 = bilan(48);
  const ctl = S(30, { bilan: { kind: 'controle', of: b1.id, index: 1 } });
  assert.equal(lastBilanKey([b1, ctl]), b1.dateKey);
  assert.equal(lastBilanKey([b1, ctl, b2]), b2.dateKey);
});

test('buildDailyPlan reste intact hors bilan', () => {
  const p = buildDailyPlan({ content, sessionNumber: 23, dateKey: '2026-10-20' });
  assert.equal(p.steps.filter((s) => s.block === 'bilan').length, 0);
});
