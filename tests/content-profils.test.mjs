// Contenu des profils Études et Quotidien (spec 2026-10-12-ohmaparole-profils-design.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson, loadProfileContent } from './helpers.mjs';
import { programGoal } from '../js/core/dashboard.js';
import { isKnownCondition, MOMENTS } from '../js/core/louarn.js';

const ex = readJson('content/fr/exercises.json');
const byPrefix = (p) => ex.items.filter((i) => new RegExp(`^fr\\.${p}\\d+$`).test(i.id));
const PROGRAMS = { etudes: readJson('content/program-etudes.json'), quotidien: readJson('content/program-quotidien.json') };
const mesureQ = readJson('content/fr/mesure-quotidien.json');
const extrasQ = readJson('content/fr/extras-quotidien.json');
const louarnQ = readJson('content/fr/louarn-quotidien.json');
const louarn = readJson('content/fr/louarn.json');

test('volumes des Fondations communes, de Prendre sa place et de Confiance au quotidien', () => {
  const nums = (p) => byPrefix(p).map((i) => Number(i.id.replace(/\D/g, ''))).sort((a, b) => a - b);
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  assert.deepEqual(nums('QA'), range(1, 38));
  assert.deepEqual(nums('QL'), range(1, 24));
  assert.deepEqual(nums('QP'), range(1, 24));
  assert.deepEqual(nums('EA'), range(1, 24));
  assert.deepEqual(nums('EL'), range(1, 12));
  assert.deepEqual(nums('EP'), range(1, 12));
  assert.equal(ex.consignesQuotidien.length, 10);
  assert.deepEqual(ex.consignesQuotidien.map((c) => c.id), range(1, 10).map((n) => `fr.QC${String(n).padStart(2, '0')}`));
  assert.equal(ex.consignes.length, 10, 'les consignes du profil pro restent à part');
});

test('ids uniques dans exercises.json, consignes comprises', () => {
  const ids = [...ex.items, ...ex.consignes, ...ex.consignesQuotidien].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^fr\./);
});

test('champs des nouveaux exercices', () => {
  for (const p of ['QA', 'QL', 'QP', 'EA', 'EL', 'EP']) {
    for (const it of byPrefix(p)) {
      assert.ok(it.titre && it.pourquoi, it.id);
      assert.ok(it.consigne.length >= 1 && it.consigne.length <= 3, it.id);
      assert.equal(it.bloc, { A: 'articulation', L: 'ecoute', P: 'posture' }[p[1]], it.id);
      if (it.bloc === 'ecoute') assert.ok(it.passage && it.reformulationRef && it.detailCache, it.id);
      if (it.bloc === 'articulation') assert.equal(typeof it.texte, 'string', it.id);
    }
  }
});

for (const [profil, program] of Object.entries(PROGRAMS)) {
  test(`programme ${profil} : 12 semaines de 4 séances, 2 blocs nommés, objectif 48`, () => {
    assert.equal(program.sessionsPerWeek, 4);
    assert.equal(program.weeks.length, 12);
    assert.deepEqual(program.weeks.map((w) => w.week), Array.from({ length: 12 }, (_, i) => i + 1));
    assert.deepEqual(program.blocs.map((b) => b.nom), ['Fondations', profil === 'etudes' ? 'Prendre sa place' : 'Confiance au quotidien']);
    assert.equal(programGoal(program), 48);
    for (const w of program.weeks) assert.ok(w.theme && !w.theme.includes('*'), `semaine ${w.week}`);
  });

  test(`programme ${profil} : chaque id existe dans le bon bloc, au moins 2 par bloc`, () => {
    const byId = new Map(ex.items.map((i) => [i.id, i]));
    for (const w of program.weeks) {
      for (const bloc of ['articulation', 'ecoute', 'posture']) {
        assert.ok(w[bloc].length >= 2, `semaine ${w.week} ${bloc}`);
        for (const id of w[bloc]) assert.equal(byId.get(`fr.${id}`)?.bloc, bloc, `${id} (semaine ${w.week})`);
      }
    }
  });

  test(`programme ${profil} : semaines 1 à 6 communes, virelangues A01 à A14 gardés`, () => {
    assert.deepEqual(program.weeks.slice(0, 6), PROGRAMS.quotidien.weeks.slice(0, 6));
    const vire = program.weeks.slice(0, 6).flatMap((w) => w.articulation.filter((id) => /^A\d/.test(id)));
    assert.deepEqual(vire, Array.from({ length: 14 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`));
    assert.deepEqual(program.weeks[0].articulation, ['A01', 'A02', 'QA01', 'QA02']);
    assert.deepEqual(program.weeks[2].ecoute, ['QL05', 'QL06']);
    assert.deepEqual(program.weeks[5].posture, ['QP10', 'QP12']);
  });

  test(`programme ${profil} : semaines 7 à 12 du pack, 4 + 2 + 2`, () => {
    const p = profil === 'etudes' ? ['EA', 'EL', 'EP'] : ['QA', 'QL', 'QP'];
    for (const w of program.weeks.slice(6)) {
      assert.equal(w.articulation.length, 4);
      assert.equal(w.ecoute.length, 2);
      assert.equal(w.posture.length, 2);
      for (const [bloc, pre] of [['articulation', p[0]], ['ecoute', p[1]], ['posture', p[2]]]) {
        for (const id of w[bloc]) {
          assert.ok(id.startsWith(pre), id);
          assert.equal(ex.items.find((i) => i.id === `fr.${id}`).semaineMin, w.week, id);
        }
      }
    }
  });

  test(`programme ${profil} : un échauffement voix et un moteur disponibles chaque semaine`, () => {
    const warm = ex.items.filter((i) => i.bloc === 'echauffement');
    for (const w of program.weeks) {
      for (const t of ['voix', 'moteur']) assert.ok(warm.some((e) => e.type === t && e.semaineMin <= w.week), `semaine ${w.week} ${t}`);
    }
  });
}

test('extras neutres : référence REFQ1 de 84 syllabes, objectifs du moment, motivations', () => {
  assert.equal(extrasQ.reference.id, 'fr.REFQ1');
  assert.equal(extrasQ.reference.syllabes, 84);
  assert.equal(extrasQ.reference.syllabes, mesureQ.referenceSyllabes);
  assert.equal(extrasQ.reference.texte, mesureQ.reference.texte);
  assert.equal(extrasQ.motivations.length, 12);
  assert.equal(extrasQ.pourquoiExemples.length, 3);
  assert.equal(extrasQ.objectifsMoment.length, 3);
  assert.ok(extrasQ.objectifDefaut);
  assert.deepEqual(Object.keys(extrasQ.pourquoi), ['fr.E01', 'fr.E10', 'fr.A10', 'fr.A12', 'fr.A14']);
});

test('pack Mesure non pro : volumes, syllabes, faits clés', () => {
  assert.equal(mesureQ.textesInedits.length, 3);
  assert.equal(mesureQ.ecoutesReservees.length, 3);
  assert.equal(mesureQ.questionsSpontanees.length, 12);
  assert.equal(mesureQ.repliquesEclair.length, 12);
  assert.equal(mesureQ.autoGrille.length, 6);
  for (const t of mesureQ.textesInedits) assert.equal(t.syllabes, 84, t.id);
  for (const e of mesureQ.ecoutesReservees) assert.equal(e.faitsCles.length, 3, e.id);
  for (const g of mesureQ.autoGrille) assert.equal(g.niveaux.length, 3, g.id);
  for (const r of mesureQ.repliquesEclair) assert.ok(r.replique && r.critere1 && r.critere2, r.id);
  const ids = [mesureQ.textesInedits, mesureQ.ecoutesReservees, mesureQ.questionsSpontanees, mesureQ.repliquesEclair, mesureQ.autoGrille].flat().map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  const pro = readJson('content/fr/mesure.json');
  const proIds = new Set([pro.textesInedits, pro.ecoutesReservees, pro.questionsSpontanees, pro.repliquesEclair, pro.autoGrille].flat().map((x) => x.id));
  for (const id of ids) assert.ok(!proIds.has(id), `${id} : déjà pris par le pack pro`);
});

test('Louarn non pro : 33 ids pro existants, remplaçantes et 12 répliques de thème', () => {
  const proIds = new Set(louarn.repliques.map((l) => l.id));
  assert.equal(louarnQ.proOnly.length, 33);
  assert.equal(new Set(louarnQ.proOnly).size, 33);
  for (const id of louarnQ.proOnly) assert.ok(proIds.has(id), id);
  const ids = louarnQ.repliques.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(!proIds.has(id), `${id} : déjà pris dans louarn.json`);
  for (const l of louarnQ.repliques) {
    assert.ok(MOMENTS.includes(l.moment), l.id);
    if (l.condition) assert.ok(isKnownCondition(l.condition), `${l.id} : ${l.condition}`);
    assert.ok(l.texte.length <= 90, `${l.id} : ${l.texte.length} caractères`);
    assert.doesNotMatch(l.texte, /[!0-9]/, l.id);
  }
  for (const profil of ['etudes', 'quotidien']) {
    const own = louarnQ.repliques.filter((l) => l.condition?.startsWith(`profil:${profil}&`));
    assert.equal(own.length, 6, profil);
    assert.deepEqual(own.map((l) => [l.moment, l.condition]), [7, 8, 9, 10, 11, 12].map((t) => ['theme', `profil:${profil}&theme:${t}`]));
  }
});

test('Louarn non pro : chaque couple (moment, condition) vidé par proOnly garde une réplique', () => {
  for (const profil of ['etudes', 'quotidien']) {
    const lines = loadProfileContent(profil).louarn.repliques;
    for (const id of louarnQ.proOnly) assert.ok(!lines.some((l) => l.id === id), `${profil} : ${id} tirée`);
    const removed = louarn.repliques.filter((l) => louarnQ.proOnly.includes(l.id));
    for (const r of removed) {
      assert.ok(lines.some((l) => l.moment === r.moment && (l.condition ?? null) === (r.condition ?? null)), `${r.id} sans remplaçante`);
    }
    for (const m of MOMENTS) assert.ok(lines.filter((l) => l.moment === m).length >= 3, `${profil} : moment ${m}`);
    const other = profil === 'etudes' ? 'quotidien' : 'etudes';
    assert.ok(!lines.some((l) => l.condition?.startsWith(`profil:${other}`)), `${profil} : répliques de ${other}`);
  }
});
