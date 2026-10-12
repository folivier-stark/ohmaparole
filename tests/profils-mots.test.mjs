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
import { readJson } from './helpers.mjs';

// « rendez-vous » seul fait aussi échouer (relecture du 12/10), sauf chez le médecin et les cas du même ordre.
const PRO_RE = /(?<!\p{L})(Fred|IA|TPE|RDV)(?!\p{L})|prospect|client|(?<!\p{L})ventes?(?!\p{L})|budget|rendez-vous/iu;
const ALLOWED = ['rendez-vous avec le docteur', 'rendez-vous chez le médecin', 'rendez-vous chez le dentiste'];
const PRO_WORDS = { test: (t) => PRO_RE.test(ALLOWED.reduce((s, a) => s.split(a).join(''), t)) };
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
  for (const index of [1, 2]) {
    const plan = buildBilanPlan({ content: c, sessionNumber: 24 * index, dateKey: 'k', index });
    add(`bilan ${index}`, plan.steps.map(({ itemId, block, kind, role, voiceCheck, ...st }) => st));
    // Chaque étape neutre apporte ses propres textes : sinon le composant retombe sur le texte pro.
    for (const st of plan.steps.filter((x) => x.kind === 'lecture')) assert.ok(st.speakTake, `bilan ${index} : speakTake`);
    assert.ok(plan.steps.find((x) => x.kind === 'grille').intro, `bilan ${index} : intro de la grille`);
  }
  for (const voiceCheck of ['calibration', 'controle']) {
    assert.ok(buildDailyPlan({ content: c, sessionNumber: 5, dateKey: 'k', voiceCheck }).steps[0].speakTake, `${voiceCheck} : speakTake`);
  }
  const eclair = buildDailyPlan({ content: c, sessionNumber: 8, dateKey: 'k', weeklyPoint: { theme: 2, format: 'eclair', item: c.mesure.repliquesEclair[0] } });
  const labels = eclair.steps.find((x) => x.kind === 'eclair').labels;
  assert.ok(labels?.ecouter && labels.dit && labels.aDit, 'réplique éclair : labels');
  const spontane = buildDailyPlan({ content: c, sessionNumber: 4, dateKey: 'k', weeklyPoint: { theme: 1, format: 'spontane', item: c.mesure.questionsSpontanees[0] } });
  assert.ok(spontane.steps.find((x) => x.kind === 'spontane').readyQuestion, 'point A : readyQuestion');
  // Raccourcis de l'icône : neutres pour tout le monde.
  add('manifest', readJson('manifest.webmanifest').shortcuts.map(({ name, short_name }) => [name, short_name]));
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
  add('rapport', bilanAvecBaisse(c, profil));
  const daily = Array.from({ length: 48 }, (_, i) => ({ id: `d${i}`, type: 'daily', counted: true, startedAt: i, dateKey: '2026-01-01' }));
  add('souvenirs', souvenirs([...daily, { ...s, startedAt: 1, dateKey: '2026-01-01', feedback: 'non', goalReached: 'oui' }], [], { goal: 48, profil }).map((x) => x.nom));
  assert.ok(SOUVENIRS.length === 11);
  return out;
}

/**
 * Un rapport neutre « chargé » : bilan 2, faits clés en baisse, moments importants où l'on fait répéter plus
 * souvent qu'au mois 1 (baisse), et 5 paires réelles pour l'écoute d'un proche (actionKind 'proche').
 */
function bilanAvecBaisse(c, profil) {
  const day = (k) => `2026-${k}`;
  const s1 = { id: 'b1', type: 'daily', counted: true, startedAt: 100, dateKey: day('09-01'), sessionNumber: 24, profil, bilan: { kind: 'bilan', index: 1, order: ['fr.TQA', 'fr.TQB', 'fr.TQC'], faits: [true, true, true], complete: true } };
  const s2 = { id: 'b2', type: 'daily', counted: true, startedAt: 900, dateKey: day('10-12'), sessionNumber: 48, profil, bilan: { kind: 'bilan', index: 2, order: ['fr.TQA', 'fr.TQB', 'fr.TQC'], faits: [false, false, false], complete: true } };
  const moments = [
    ...['07-06', '07-07', '07-08', '07-09'].map((d, i) => ({ id: `m${i}`, type: 'prerdv', profil, practicedSec: 90, startedAt: 10 + i, endedAt: 11 + i, dateKey: day(d), feedback: 'non', goal: 'x', goalReached: 'oui' })),
    ...['10-01', '10-03', '10-05', '10-07'].map((d, i) => ({ id: `n${i}`, type: 'prerdv', profil, practicedSec: 90, startedAt: 800 + i, endedAt: 801 + i, dateKey: day(d), feedback: 'plusieurs', goal: 'x', goalReached: 'non' })),
  ];
  const rec = (id, s, itemId, kind, voiceCheck = null) => ({ id, sessionId: s.id, itemId, kind, voiceCheck, createdAt: s.startedAt + 1, dateKey: s.dateKey, profil });
  const recordings = [
    { id: 'cal', kind: 'reference', voiceCheck: 'calibration', itemId: 'fr.REFQ1', createdAt: 1, dateKey: day('07-01'), sessionId: 'c', profil },
    ...[s1, s2].flatMap((s) => [rec(`${s.id}r`, s, 'fr.REFQ1', 'reference', 'bilan'), ...['fr.TQA', 'fr.TQB', 'fr.TQC'].map((t) => rec(`${s.id}${t}`, s, t, 'bilan'))]),
  ];
  const r = buildBilanReport({ session: s2, sessions: [s1, s2, ...moments], recordings, todayKey: day('10-12'), lines: c.mesure, profil });
  assert.equal(r.actionKind, 'proche');
  assert.ok(r.axes.find((a) => a.key === 'rdv').baisse, 'baisse dans les moments importants');
  assert.ok(r.axes.find((a) => a.key === 'ecoute').baisse, 'baisse des faits clés');
  return r;
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
  for (const bad of ['Fred', 'un RDV', 'le client', 'ta vente', 'le budget', 'un prospect', 'les TPE', 'l’IA', 'rendez-vous de vente']) assert.ok(PRO_WORDS.test(bad), bad);
  for (const ok of ['le fredonnement', 'souvent', 'inventer', 'prendre rendez-vous avec le docteur', 'il y a', 'idéal']) assert.ok(!PRO_WORDS.test(ok), ok);
  assert.ok(PRO_WORDS.test('avant un rendez-vous'), '« rendez-vous » seul');
});

test('profil pro : le même contrôle trouve bien le monde pro (témoin)', () => {
  const c = loadProfileContent('pro');
  assert.ok(strings(c.extras).some((t) => PRO_WORDS.test(t)));
});
