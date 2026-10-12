// Aucun contenu tiré pour un profil non pro ne parle du monde pro de Fred (spec profils §1).
// Exception : le texte des virelangues A01 à A14, neutre par nature.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfileContent } from './helpers.mjs';
import { buildDailyPlan, buildRdvPlan } from '../js/core/planner.js';
import { buildBilanPlan } from '../js/core/bilan-plan.js';
import { RDV_QUESTIONS, DONT_KNOW, rdvQuestionIds } from '../js/core/rdv.js';
import { textsFor } from '../js/core/texts.js';
import { readyQuestion, pointSummary } from '../js/core/weekly-point.js';
import { buildBilanReport } from '../js/core/evaluation.js';
import { souvenirs, SOUVENIRS } from '../js/core/louarn.js';

const PRO_WORDS = /(?<!\p{L})(Fred|IA|TPE|RDV)(?!\p{L})|prospect|client|(?<!\p{L})ventes?(?!\p{L})|budget|rendez-vous de vente/iu;
// Les identifiants internes (bloc 'rdv', axe 'rdv'…) ne s'affichent jamais : seules les valeurs de texte comptent.
const IDS = new Set(['id', 'itemId', 'key', 'block', 'kind', 'family', 'state', 'actionKind', 'metric', 'textId', 'role', 'voiceCheck', 'recordKind', 'moment', 'condition', 'format', 'value']);
const strings = (x) => (typeof x === 'string' ? [x]
  : Array.isArray(x) ? x.flatMap(strings)
    : x && typeof x === 'object' ? Object.entries(x).filter(([k]) => !IDS.has(k)).flatMap(([, v]) => strings(v)) : []);
const isVirelangue = (id) => /^fr\.A(0[1-9]|1[0-4])$/.test(id);

function drawn(profil) {
  const c = loadProfileContent(profil);
  const out = [];
  const add = (where, x) => { for (const s of strings(x)) out.push([where, s]); };
  // Exercices du programme et échauffements, tels que la séance les montre.
  const ids = new Set(c.program.weeks.flatMap((w) => [...w.articulation, ...w.ecoute, ...w.posture]).map((id) => `fr.${id}`));
  for (const it of c.items.filter((i) => ids.has(i.id) || i.bloc === 'echauffement')) {
    const { id, bloc, type, texte, ...rest } = c.byId.get(it.id);
    add(id, rest);
    if (!isVirelangue(id)) add(id, texte);
  }
  add('consignes', c.consignes);
  add('extras', { ...c.extras, sources: '', lang: '' });
  add('mesure', { ...c.mesure, source: '', lang: '' });
  add('louarn', c.louarn.repliques.map((l) => l.texte));
  add('program', c.program.weeks.map((w) => w.theme));
  add('blocs', c.program.blocs);
  // Les pas de toutes les séances du programme : voix, point de la semaine (A et B), reprise.
  for (let n = 1; n <= 48; n++) {
    const opts = { content: c, sessionNumber: n, dateKey: `2026-10-${String((n % 28) + 1).padStart(2, '0')}`, lastBloc3: n % 2 ? 'ecoute' : 'posture' };
    const plans = [
      buildDailyPlan(opts),
      buildDailyPlan({ ...opts, voiceCheck: n % 2 ? 'calibration' : 'controle' }),
      buildDailyPlan({ ...opts, comeback: true }),
      buildDailyPlan({ ...opts, weeklyPoint: { theme: 1, format: 'spontane', item: c.mesure.questionsSpontanees[n % 12] } }),
      buildDailyPlan({ ...opts, weeklyPoint: { theme: 2, format: 'eclair', item: c.mesure.repliquesEclair[n % 12] } }),
    ];
    for (const p of plans) add(`séance ${n}`, p.steps.map(({ itemId, block, kind, recordKind, voiceCheck, ...st }) => st));
  }
  add('moment', buildRdvPlan({ content: c, dateKey: '2026-10-12' }).steps);
  for (const index of [1, 2]) add(`bilan ${index}`, buildBilanPlan({ content: c, sessionNumber: 24 * index, dateKey: 'k', index }).steps.map(({ itemId, block, kind, role, voiceCheck, ...st }) => st));
  // Retour du moment important, textes neutres, rapport de bilan, souvenirs, carte du point.
  const s = { type: 'prerdv', profil, goal: 'x', practicedSec: 90, endedAt: 0 };
  for (const q of rdvQuestionIds(s)) add('retour', [RDV_QUESTIONS[q].text, RDV_QUESTIONS[q].options]);
  add('retour', DONT_KNOW);
  add('textes', { ...textsFor(profil), BLOCKS: Object.values(textsFor(profil).BLOCKS) });
  add('point', readyQuestion(profil));
  const done = [{ id: 'p', type: 'daily', counted: true, startedAt: 1, dateKey: '2026-10-01', sessionNumber: 4, weeklyPoint: { theme: 1, format: 'spontane', ready: 'pret' } }];
  add('point', pointSummary({ sessions: done, profil }).lines);
  const bilan = { id: 'b', type: 'daily', counted: true, startedAt: 10, dateKey: '2026-10-12', sessionNumber: 24, profil, bilan: { kind: 'bilan', index: 1, order: ['fr.TQA'], grille: { 'fr.GQ1': 2 } } };
  const report = buildBilanReport({ session: bilan, sessions: [bilan, ...done], todayKey: '2026-10-12', lines: c.mesure, profil });
  add('rapport', report);
  const daily = Array.from({ length: 48 }, (_, i) => ({ id: `d${i}`, type: 'daily', counted: true, startedAt: i, dateKey: '2026-01-01' }));
  add('souvenirs', souvenirs([...daily, { ...s, startedAt: 1, dateKey: '2026-01-01', feedback: 'non', goalReached: 'oui' }], [], { goal: 48, profil }).map((x) => x.nom));
  assert.ok(SOUVENIRS.length === 11);
  return out;
}

for (const profil of ['etudes', 'quotidien']) {
  test(`profil ${profil} : ni Fred, ni IA, TPE, prospect, client, vente, budget, RDV dans le contenu tiré`, () => {
    const all = drawn(profil);
    assert.ok(all.length > 1000, `${all.length} textes contrôlés`);
    const bad = all.filter(([, t]) => PRO_WORDS.test(t)).map(([w, t]) => `${w} : ${t}`);
    assert.deepEqual([...new Set(bad)], []);
  });
}

test('le détecteur de mots pro fonctionne, sans faux positif courant', () => {
  for (const bad of ['Fred', 'un RDV', 'le client', 'ta vente', 'le budget', 'un prospect', 'les TPE', 'l’IA', 'rendez-vous de vente']) assert.match(bad, PRO_WORDS, bad);
  for (const ok of ['le fredonnement', 'souvent', 'inventer', 'prendre rendez-vous avec le docteur', 'il y a', 'idéal']) assert.doesNotMatch(ok, PRO_WORDS, ok);
});

test('profil pro : le même contrôle trouve bien le monde pro (témoin)', () => {
  const c = loadProfileContent('pro');
  assert.ok(strings(c.extras).some((t) => PRO_WORDS.test(t)));
});
