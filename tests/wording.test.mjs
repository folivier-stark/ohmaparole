import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RDV_QUESTIONS, DONT_KNOW, RDV_INDICATORS } from '../js/core/rdv.js';
import { TREND_TEXT, trendText, RDV_NO_RECORD } from '../js/core/texts.js';

// Mots interdits : eval-methodologie.md §4.2 (et pas de pourcentage, pas de « en hausse »).
const FORBIDDEN = /(?<!\p{L})(score|note|niveau|échec|régression|ratée?|record|série)s?(?!\p{L})|tu dois|en hausse|%/iu;
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('aucun mot interdit dans les textes du tableau et du retour RDV', () => {
  const texts = [
    ...Object.values(TREND_TEXT),
    trendText('calibrage', { voice: true, missing: 3 }),
    trendText('calibrage', { missing: 1 }),
    RDV_NO_RECORD,
    DONT_KNOW.label,
    ...Object.values(RDV_QUESTIONS).flatMap((q) => [q.text, ...q.options.flatMap((o) => [o.label, o.hint ?? ''])]),
    ...RDV_INDICATORS.flatMap((i) => [i.label, i.source]),
  ];
  for (const t of texts) assert.doesNotMatch(t, FORBIDDEN, t);
});

test('le détecteur de mots interdits fonctionne', () => {
  for (const bad of ['Ton score', 'une note', 'raté', 'record battu', '62 %', 'en hausse', 'tu dois']) assert.match(bad, FORBIDDEN, bad);
  for (const ok of ['Noté.', 'notée', 'enregistre', 'Ça bouge dans le bon sens.']) assert.doesNotMatch(ok, FORBIDDEN, ok);
});

test('plus aucun « en hausse » à l’écran Progression', () => {
  const src = read('js/ui/screens/progress.js');
  assert.doesNotMatch(src, /en hausse|rising|weeklyBars/);
});

test('le rappel « jamais de vrai RDV enregistré » cite la règle (eval-rdv.md §4.5)', () => {
  assert.match(RDV_NO_RECORD, /vrai rendez-vous/);
  assert.match(RDV_NO_RECORD, /226-1/);
  // L'appli garde l'heure de sortie ET les réponses : le rappel ne doit pas dire le contraire.
  assert.match(RDV_NO_RECORD, /Du rendez-vous, l’appli ne garde que l’heure de ta sortie et tes réponses./);
});

/** Toutes les chaînes d'un JSON de contenu. */
const strings = (x) => (typeof x === 'string' ? [x] : x && typeof x === 'object' ? Object.values(x).flatMap(strings) : []);

test('aucun mot interdit dans les phrases de motivation, les garde-fous (extras.json) et les répliques de Louarn', () => {
  const extras = JSON.parse(read('content/fr/extras.json'));
  // La note clinique cite « bredouillement » en connaissance de cause (expert-contenu.md) : hors du contrôle.
  const extraTexts = strings({ ...extras, noteClinique: '' });
  const louarn = JSON.parse(read('content/fr/louarn.json')).repliques.map((l) => l.texte);
  for (const t of [...extraTexts, ...louarn]) assert.doesNotMatch(t, FORBIDDEN, t);
  assert.ok(extras.motivations.includes('Une séance sautée ne compte pas. Celle d’aujourd’hui, si.'));
});

test('aucun mot interdit dans les nouveaux contenus des profils Études et Quotidien', () => {
  const extrasQ = JSON.parse(read('content/fr/extras-quotidien.json'));
  const louarnQ = JSON.parse(read('content/fr/louarn-quotidien.json')).repliques.map((l) => l.texte);
  const mesureQ = JSON.parse(read('content/fr/mesure-quotidien.json'));
  const programs = ['etudes', 'quotidien'].map((p) => JSON.parse(read(`content/program-${p}.json`)));
  const consignesQ = JSON.parse(read('content/fr/exercises.json')).consignesQuotidien;
  // Comme pour extras.json et louarn.json : les textes que l'appli affiche hors exercices.
  const texts = [
    ...strings({ ...extrasQ, sources: '' }), ...louarnQ, ...strings({ ...mesureQ, source: '', convention: '' }),
    ...strings(consignesQ), ...programs.flatMap((p) => [...p.weeks.map((w) => w.theme), ...p.blocs.map((b) => b.nom)]),
  ];
  assert.ok(texts.length > 100);
  // « une série » (un film ou une série) : une série télé, pas une série de jours. Rédigé par l'expert, gardé.
  const SERIE_TELE = 'Conseille un livre, un film ou une série à un ami, et dis-lui pourquoi.';
  for (const t of texts) assert.doesNotMatch(t === SERIE_TELE ? t.replace('une série', 'un feuilleton') : t, FORBIDDEN, t);
});
