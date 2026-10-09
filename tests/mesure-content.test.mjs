import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './helpers.mjs';

const m = readJson('content/fr/mesure.json');

test('pack Mesure : volumes attendus', () => {
  assert.equal(m.textesInedits.length, 3);
  assert.equal(m.ecoutesReservees.length, 3);
  assert.equal(m.questionsSpontanees.length, 12);
  assert.equal(m.repliquesEclair.length, 12);
  assert.equal(m.autoGrille.length, 6);
});

test('pack Mesure : syllabes et faits clés', () => {
  assert.equal(m.referenceSyllabes, 86);
  for (const t of m.textesInedits) assert.ok(Number.isInteger(t.syllabes) && t.syllabes > 50 && t.texte, t.id);
  for (const e of m.ecoutesReservees) assert.equal(e.faitsCles.length, 3, e.id);
  for (const g of m.autoGrille) assert.equal(g.niveaux.length, 3, g.id);
  for (const r of m.repliquesEclair) assert.ok(r.replique && r.critere1 && r.critere2, r.id);
});

test('pack Mesure : ids uniques et préfixés', () => {
  const ids = [m.textesInedits, m.ecoutesReservees, m.questionsSpontanees, m.repliquesEclair, m.autoGrille].flat().map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^fr\./);
});
