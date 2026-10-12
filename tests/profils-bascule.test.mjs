// Changer de profil (relecture du 12/10) : rien ne plante, Louarn ne régresse jamais, le programme du
// nouveau profil commence au début, un profil déjà utilisé retrouve sa mesure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfileContent } from './helpers.mjs';
import { ofProfil, neutralGoals } from '../js/core/profil.js';
import { dailyCount } from '../js/core/progress.js';
import { buildDailyPlan } from '../js/core/planner.js';
import { bilanDue, bilanControlDue, buildBilanControlPlan } from '../js/core/bilan-plan.js';
import { weeklyPointDue } from '../js/core/weekly-point.js';
import { voiceCheckDue } from '../js/core/voice-plan.js';
import * as L from '../js/core/louarn.js';

const PRO = loadProfileContent('pro');
const QUOTIDIEN = loadProfileContent('quotidien');
const DAY = 86400000;
const t0 = Date.UTC(2026, 6, 1, 7);
const key = (t) => new Date(t).toISOString().slice(0, 10);

/** n séances comptées d'un profil (undefined : séances d'avant les profils), à partir du jour `from`. */
function daily(n, profil, from = 0, extra = () => ({})) {
  return Array.from({ length: n }, (_, i) => {
    const t = t0 + (from + i) * DAY;
    return { id: `${profil ?? 'v2'}-${from + i}`, type: 'daily', counted: true, completed: true, startedAt: t, endedAt: t + 300000, dateKey: key(t), sessionNumber: i + 1, ...(profil ? { profil } : {}), ...extra(i + 1) };
  });
}

test('contrôle de bilan en attente puis changement de profil : pas de contrôle, rien ne plante (pro → quotidien)', () => {
  // Bilan pro à 24 avec une baisse : contrôle dû à 29. Le proche passe en Quotidien à la séance 26.
  const pro = daily(26, undefined, 0, (n) => (n === 24 ? { bilan: { kind: 'bilan', index: 1, order: ['fr.TB', 'fr.TA', 'fr.TC'], controlDueAt: 29, complete: true } } : {}));
  const q = daily(4, 'quotidien', 26);
  const all = [...pro, ...q];
  const mine = ofProfil(all, 'quotidien');
  assert.equal(bilanControlDue({ sessionNumber: dailyCount(mine) + 1, sessions: mine }), null);
  assert.ok(bilanControlDue({ sessionNumber: 30, sessions: all }), 'sans filtre, le contrôle pro serait dû');
  // Même dû par erreur, le plan ne lit que les textes du profil.
  const plan = buildBilanControlPlan({ content: QUOTIDIEN, sessionNumber: 5, dateKey: 'k', control: { of: 'x', index: 1, order: ['fr.TB', 'fr.TA', 'fr.TC'] } });
  assert.deepEqual(plan.steps.map((s) => s.itemId).filter(Boolean), ['fr.REFQ1']);
  assert.equal(bilanControlDue({ sessionNumber: 30, sessions: all, knownTexts: ['fr.TQA', 'fr.TQB', 'fr.TQC'] }), null);
});

test('contrôle de bilan en attente puis changement de profil : pas de contrôle, rien ne plante (quotidien → pro)', () => {
  const q = daily(26, 'quotidien', 0, (n) => (n === 24 ? { bilan: { kind: 'bilan', index: 1, order: ['fr.TQB', 'fr.TQA', 'fr.TQC'], controlDueAt: 29, complete: true } } : {}));
  const pro = daily(3, 'pro', 26);
  const mine = ofProfil([...q, ...pro], 'pro');
  assert.equal(bilanControlDue({ sessionNumber: dailyCount(mine) + 1, sessions: mine }), null);
  const plan = buildBilanControlPlan({ content: PRO, sessionNumber: 30, dateKey: 'k', control: { of: 'x', index: 1, order: ['fr.TQA', 'fr.TQB', 'fr.TQC'] } });
  assert.deepEqual(plan.steps.map((s) => s.itemId).filter(Boolean), ['fr.REF1']);
  assert.ok(bilanControlDue({ sessionNumber: 30, sessions: q, knownTexts: ['fr.TQA'] }), 'un texte connu suffit');
});

test('un proche qui passe en Quotidien à la séance 30 commence son programme au début', () => {
  const pro = daily(30, undefined);
  const mine = ofProfil(pro, 'quotidien');
  assert.equal(dailyCount(mine), 0);
  const plan = buildDailyPlan({ content: QUOTIDIEN, sessionNumber: dailyCount(mine) + 1, dateKey: 'k' });
  assert.equal(plan.week, 1);
  assert.ok(plan.itemIds.some((id) => ['fr.A01', 'fr.A02', 'fr.QA01', 'fr.QA02'].includes(id)), plan.itemIds.join());
  // Bilan et point de la semaine suivent les séances du profil : pas de bilan avant sa 24e séance.
  const later = [...pro, ...daily(23, 'quotidien', 30)];
  const q = ofProfil(later, 'quotidien');
  assert.equal(dailyCount(q), 23);
  assert.deepEqual(bilanDue({ sessionNumber: 24, sessions: q }), { index: 1 });
  assert.equal(bilanDue({ sessionNumber: dailyCount(later) + 1, sessions: later }), null, 'le cumul total (53) se tromperait');
  assert.deepEqual(weeklyPointDue({ sessionNumber: 4, sessions: ofProfil(daily(3, 'quotidien'), 'quotidien') }), { theme: 1, format: 'spontane' });
  // Retour en Pro : le programme pro reprend où il en était.
  assert.equal(dailyCount(ofProfil(later, 'pro')), 30);
  assert.equal(buildDailyPlan({ content: PRO, sessionNumber: 31, dateKey: 'k' }).week, 8);
});

test('un profil déjà utilisé retrouve sa mesure de voix ; un profil jamais utilisé repart de zéro', () => {
  const cal = (profil, d) => [0, 1].map((k) => ({ id: `${profil}-${d}-${k}`, kind: 'reference', voiceCheck: 'calibration', createdAt: t0 + d * DAY + k, dateKey: key(t0 + d * DAY), sessionId: `${profil}-${d}`, sessionNumber: d + 1, ...(profil === 'v2' ? {} : { profil }) }));
  const recs = [...cal('v2', 0), ...cal('v2', 1), ...cal('v2', 2), ...cal('quotidien', 10)];
  assert.equal(voiceCheckDue(ofProfil(recs, 'pro'), 3, { todayKey: 'z' }), null, 'pro : calibration faite, retrouvée');
  assert.equal(voiceCheckDue(ofProfil(recs, 'quotidien'), 1, { todayKey: 'z' }), 'calibration');
  assert.equal(voiceCheckDue(ofProfil(recs, 'etudes'), 0, { todayKey: 'z' }), 'calibration');
});

test('Louarn ne régresse jamais : le stade affiché garde le plus haut atteint', () => {
  // 30 séances en Quotidien (stade 4 sur 48), retour en Pro : 30 sur 72 donnerait le stade 3.
  assert.equal(L.stageFor(30, 48).id, 4);
  assert.equal(L.stageFor(30, 72).id, 3);
  const pro = L.displayedStage({ total: 30, goal: 72, stadeMax: 4 });
  assert.equal(pro.stage.id, 4);
  assert.deepEqual(pro.next, { stage: L.STAGES[4], remaining: 18 });
  assert.equal(L.displayedStage({ total: 30, goal: 48, stadeMax: 3 }).stage.id, 4, 'pro → quotidien : le stade monte');
  assert.equal(L.displayedStage({ total: 30, goal: 72 }).stage.id, 3, 'sans maximum mémorisé, comme avant');
  assert.equal(L.displayedStage({ total: 80, goal: 48, stadeMax: 2 }).next, null);
  assert.equal(L.nextStadeMax(3, 30, 48), 4);
  assert.equal(L.nextStadeMax(5, 30, 72), 5);
});

test('fin de séance : pas de montée de stade sous le stade déjà atteint, montée au-delà', () => {
  // De retour en Pro à 47 → 48 séances : stade 5 sur 72, mais le stade 5 a déjà été atteint en Quotidien.
  const base = { prevCount: 17, newCount: 18, session: { completed: true }, todayKey: '2026-10-12' };
  assert.equal(L.endCelebration({ ...base, stagePrev: 47, stageNew: 48, stadeMax: 5 }).stage, null);
  const up = L.endCelebration({ ...base, stagePrev: 71, stageNew: 72, stadeMax: 5 });
  assert.deepEqual(up.stage, { from: 5, to: 6 });
  // Le thème suit les séances du profil (17 → 18), pas le cumul.
  assert.equal(up.theme, null);
  assert.equal(L.endCelebration({ ...base, prevCount: 15, newCount: 16, stagePrev: 47, stageNew: 48, stadeMax: 5 }).theme, 4);
  // Sans les nouveaux paramètres : exactement comme avant.
  assert.deepEqual(L.endCelebration({ ...base, prevCount: 23, newCount: 24 }).stage, { from: 2, to: 3 });
});

test('un souvenir obtenu ne se perd jamais : union du mémorisé et du recalculé', () => {
  const stored = [{ id: 'sentier', dateKey: '2026-09-01', at: 5 }, { id: 'premier-pas', dateKey: '2026-08-01', at: 1 }];
  const computed = L.souvenirs(daily(30, 'pro'), [], { goal: 72, profil: 'pro' });
  const merged = L.mergeSouvenirs(stored, computed, { profil: 'quotidien' });
  const ids = merged.map((s) => s.id);
  assert.ok(ids.includes('sentier'), 'gardé après le retour en Pro');
  assert.ok(ids.includes('fondations'));
  assert.equal(merged.find((s) => s.id === 'premier-pas').dateKey, '2026-08-01', 'la plus ancienne date gagne');
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(merged.map((s) => s.at), [...merged.map((s) => s.at)].sort((a, b) => a - b));
  assert.ok(merged.every((s) => s.nom && s.ligne));
  assert.deepEqual(L.memoSouvenirs(merged), merged.map(({ id, dateKey, at }) => ({ id, dateKey, at })));
  // Le nom suit le profil courant.
  const rdv = L.mergeSouvenirs([{ id: 'premier-rdv', dateKey: '2026-08-02', at: 2 }], [], { profil: 'etudes' });
  assert.equal(rdv[0].nom, 'Le premier moment important');
  assert.equal(L.mergeSouvenirs([{ id: 'premier-rdv', dateKey: '2026-08-02', at: 2 }], []).at(0).nom, 'Le premier rendez-vous');
  assert.deepEqual(L.mergeSouvenirs([{ id: 'inconnu', dateKey: 'x', at: 0 }], []), []);
});

test('objectif et pourquoi pro par défaut : remplacés par la valeur neutre', () => {
  const pro = PRO.extras.objectifDefaut;
  const neutre = QUOTIDIEN.extras.objectifDefaut;
  assert.deepEqual(neutralGoals({ objective: pro, why: pro }, pro, neutre), { objective: neutre, why: neutre });
  assert.deepEqual(neutralGoals({ objective: 'Le mien', why: pro }, pro, neutre), { objective: 'Le mien', why: neutre });
  assert.deepEqual(neutralGoals({ objective: null, why: '' }, pro, neutre), { objective: null, why: '' });
});
