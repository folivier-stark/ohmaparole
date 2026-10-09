import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTestContent } from './helpers.mjs';

const c = loadTestContent();
const by = (b) => c.items.filter((i) => i.bloc === b);

test('volumes attendus', () => {
  assert.equal(by('echauffement').length, 12);
  assert.equal(by('articulation').length, 28);
  assert.equal(by('ecoute').length, 12);
  assert.equal(by('posture').length, 12);
  assert.equal(by('avant-rdv').length, 1);
  assert.equal(c.consignes.length, 10);
});

test('ids uniques et préfixés par la langue', () => {
  const ids = [...c.items.map((i) => i.id), ...c.consignes.map((x) => x.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^fr\./);
});

test('champs obligatoires', () => {
  for (const it of c.items) {
    assert.ok(it.titre && it.pourquoi, it.id);
    assert.ok(it.consigne.length >= 1 && it.consigne.length <= 3, it.id);
    assert.equal(typeof it.dureeS, 'number', it.id);
    assert.equal(typeof it.semaineMin, 'number', it.id);
  }
  for (const it of by('ecoute')) assert.ok(it.passage && it.reformulationRef && it.detailCache && it.consigne.length >= 2, it.id);
  for (const it of by('articulation')) assert.ok(typeof it.texte === 'string' && it.consigne.length >= 2, it.id);
  for (const it of by('echauffement')) assert.ok(['voix', 'moteur'].includes(it.type), it.id);
  for (const x of c.consignes) assert.ok(x.texte, x.id);
});

test('chaque id du programme existe dans le bon bloc', () => {
  for (const w of c.program.weeks) {
    for (const bloc of ['articulation', 'ecoute', 'posture']) {
      assert.ok(w[bloc].length >= 2, `semaine ${w.week} ${bloc}`);
      for (const id of w[bloc]) assert.equal(c.byId.get(`fr.${id}`)?.bloc, bloc, `${id} (semaine ${w.week})`);
    }
  }
});

test('chaque semaine a un échauffement voix et un moteur disponibles', () => {
  for (const w of c.program.weeks) {
    for (const t of ['voix', 'moteur']) {
      assert.ok(by('echauffement').some((e) => e.type === t && e.semaineMin <= w.week), `semaine ${w.week} ${t}`);
    }
  }
});

test('extras complets', () => {
  assert.ok(c.reference.texte.length > 100);
  assert.equal(c.motivations.length, 12);
  assert.equal(c.extras.pourquoiExemples.length, 3);
  assert.equal(c.extras.objectifsRdv.length, 3);
  assert.equal(c.extras.gardeFous.length, 4);
  assert.ok(c.extras.noteClinique.includes('bilan orthophonique'));
});
