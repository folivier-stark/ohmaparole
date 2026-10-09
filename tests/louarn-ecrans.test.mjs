// Branchement de Louarn dans les écrans (phase 2b) : la logique pure de l'écran de fin et de l'accueil.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './helpers.mjs';
import * as L from '../js/core/louarn.js';

const LINES = readJson('content/fr/louarn.json').repliques;
const TODAY = '2026-10-09';
const S = { completed: true, bloc3: 'posture', milestone: null };
const SV = (id, dateKey = TODAY) => ({ ...L.SOUVENIRS.find((s) => s.id === id), dateKey, at: 0 });
const end = (o) => L.endCelebration({ session: S, todayKey: TODAY, hour: 14, ...o });
const ids = (list) => list.map((x) => x.id);
const texte = (b) => L.pickLine(LINES, { ...b, dayKey: TODAY })?.id;

// ---------- endCelebration ----------

test('endCelebration : séance 24, montée au stade 3, nouveau bloc en ligne secondaire, souvenir en pastille', () => {
  const r = end({ prevCount: 23, newCount: 24, souvenirs: [SV('premier-pas', '2026-09-01'), SV('fondations')], fetes: ['premier-pas'] });
  assert.deepEqual(r.stage, { from: 2, to: 3 });
  assert.equal(r.next.stage.nom, 'Renard assuré');
  assert.equal(r.next.remaining, 12);
  assert.deepEqual(r.bubble, { moment: 'stade', context: ['stade:3'] });
  assert.deepEqual(r.secondary, { moment: 'theme', context: ['theme:7'] });
  assert.equal(texte(r.bubble), 'sta-03');
  assert.equal(texte(r.secondary), 'th-07');
  assert.deepEqual(ids(r.celebrate), ['fondations']);
  assert.deepEqual(r.fetes, ['premier-pas', 'fondations', 'stade:3']);
  assert.equal(r.theme, 6);
  assert.equal(r.miniSentier, false, 'maquette §5.4 : la montée de stade se fête seule, sans mini-sentier');
});

test('endCelebration : séance 48, stade 5 puis th-13 ; séance 72, stade 6 puis th-19 (aucune des deux perdue)', () => {
  const r48 = end({ prevCount: 47, newCount: 48 });
  assert.deepEqual(r48.bubble, { moment: 'stade', context: ['stade:5'] });
  assert.equal(texte(r48.secondary), 'th-13');
  const r72 = end({ prevCount: 71, newCount: 72, souvenirs: [SV('sentier')] });
  assert.deepEqual(r72.stage, { from: 5, to: 6 });
  assert.equal(r72.next, null, 'stade 6 : plus de stade suivant');
  assert.equal(texte(r72.bubble), 'sta-06');
  assert.deepEqual(r72.secondary, { moment: 'theme', context: ['theme:langues'] });
  assert.equal(texte(r72.secondary), 'th-19');
  assert.deepEqual(ids(r72.celebrate), ['sentier']);
  assert.ok(r72.fetes.includes('stade:6'));
});

test('endCelebration : séances 12 et 36, montée de stade sans ligne secondaire (pas une fin de bloc)', () => {
  for (const [a, b, id] of [[11, 12, 2], [35, 36, 4]]) {
    const r = end({ prevCount: a, newCount: b });
    assert.deepEqual(r.bubble, { moment: 'stade', context: [`stade:${id}`] }, `séance ${b}`);
    assert.equal(r.secondary, null, `séance ${b}`);
    assert.equal(r.miniSentier, false, `séance ${b}`);
  }
});

test('endCelebration : fin de thème sans montée de stade, bulle du thème et mini-sentier', () => {
  const r = end({ prevCount: 19, newCount: 20 });
  assert.equal(r.stage, null);
  assert.equal(r.next, null);
  assert.deepEqual(r.bubble, { moment: 'theme', context: ['theme:6'] });
  assert.equal(r.secondary, null);
  assert.equal(r.theme, 5);
  assert.equal(r.miniSentier, true);
});

test('endCelebration : un stade déjà fêté ne se refête pas, la bulle passe au souvenir ou au thème', () => {
  const r = end({ prevCount: 23, newCount: 24, fetes: ['stade:3'] });
  assert.equal(r.stage, null);
  assert.equal(r.next, null);
  assert.deepEqual(r.bubble, { moment: 'theme', context: ['theme:7'] });
  assert.equal(r.secondary, null);
  assert.equal(r.miniSentier, true, 'sans montée de stade, la fin de thème a son mini-sentier');
  assert.deepEqual(r.fetes, ['stade:3']);
  const withSouvenir = end({ prevCount: 23, newCount: 24, fetes: ['stade:3'], souvenirs: [SV('fondations')] });
  assert.deepEqual(withSouvenir.bubble, { moment: 'jalon', context: ['trophee:fondations'] });
  const plain = end({ prevCount: 12, newCount: 13, fetes: ['stade:2'] });
  assert.equal(plain.bubble.moment, 'fin');
  const restored = end({ prevCount: 10, newCount: 14, fetes: ['stade:2'] });
  assert.equal(restored.stage, null, 'saut après restauration, stade déjà fêté');
  assert.notEqual(restored.bubble.moment, 'stade');
});

test('endCelebration : séance ordinaire, bulle de fin avec son contexte, rien à fêter', () => {
  const r = end({ prevCount: 5, newCount: 6, encoreUne: true, hour: 20 });
  assert.deepEqual(r.bubble, { moment: 'fin', context: ['encoreUne', 'soir', 'posture'] });
  assert.equal(r.stage, null);
  assert.equal(r.secondary, null);
  assert.equal(r.theme, null);
  assert.equal(r.miniSentier, false);
  assert.deepEqual(r.celebrate, []);
  assert.deepEqual(r.fetes, []);
});

test('endCelebration : souvenirs du jour fêtés, souvenirs anciens rangés sans bulle', () => {
  const r = end({ prevCount: 0, newCount: 1, session: { ...S, milestone: 1 }, souvenirs: [SV('voix-depart', '2026-09-01'), SV('premier-pas')] });
  assert.deepEqual(ids(r.celebrate), ['premier-pas']);
  assert.deepEqual(r.bubble, { moment: 'jalon', context: ['trophee:premier-pas'] });
  assert.equal(texte(r.bubble), 'tro-01');
  assert.deepEqual(r.fetes, ['voix-depart', 'premier-pas']);
  const again = end({ prevCount: 0, newCount: 1, souvenirs: [SV('premier-pas')], fetes: r.fetes });
  assert.deepEqual(again.celebrate, [], 'jamais deux fois');
});

test('endCelebration en mode discret : la fin ordinaire se tait, les grands moments parlent', () => {
  assert.equal(end({ prevCount: 5, newCount: 6, discret: true }).bubble, null);
  const r = end({ prevCount: 71, newCount: 72, discret: true });
  assert.deepEqual(r.bubble, { moment: 'stade', context: ['stade:6'] });
  assert.equal(texte(r.secondary), 'th-19');
  assert.deepEqual(end({ prevCount: 3, newCount: 4, discret: true }).bubble, { moment: 'theme', context: ['theme:2'] });
});

test('endCelebration : valeurs absentes ou invalides, sans planter', () => {
  const r = L.endCelebration({ prevCount: 2, newCount: 3, todayKey: TODAY, fetes: null, souvenirs: null });
  assert.equal(r.stage, null);
  assert.deepEqual(r.celebrate, []);
  assert.deepEqual(r.fetes, []);
  assert.equal(r.bubble.moment, 'fin');
});

// ---------- stade6PlusToday ----------

test('stade6PlusToday : à partir de 72 séances, un seul jour, celui de la première ouverture', () => {
  assert.equal(L.stade6PlusToday({ dailyCount: 71, shownOn: null, todayKey: TODAY }), false);
  assert.equal(L.stade6PlusToday({ dailyCount: 72, shownOn: null, todayKey: TODAY }), true, 'première ouverture');
  assert.equal(L.stade6PlusToday({ dailyCount: 72, shownOn: TODAY, todayKey: TODAY }), true, 'toute la journée');
  assert.equal(L.stade6PlusToday({ dailyCount: 80, shownOn: '2026-10-08', todayKey: TODAY }), false, 'jamais un autre jour');
  assert.equal(L.stade6PlusToday({ dailyCount: Number.NaN, shownOn: null, todayKey: TODAY }), false);
});

// ---------- TODO de la phase 3 ----------

test('louarn.js : un seul TODO, celui des souvenirs liés aux jalons J7 et J30 (phase 3)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/core/louarn.js', import.meta.url), 'utf8');
  const todos = src.match(/TODO/g) ?? [];
  assert.equal(todos.length, 1);
  const at = src.indexOf('TODO');
  assert.match(src.slice(at, src.indexOf("'grand-echo'", at) + 25), /phase 3[\s\S]*'premier-echo': ref\(7\)[\s\S]*'grand-echo': ref\(30\)/);
});
