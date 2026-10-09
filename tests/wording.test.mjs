import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RDV_QUESTIONS, DONT_KNOW, RDV_INDICATORS } from '../js/core/rdv.js';
import { TREND_TEXT, trendText, RDV_NO_RECORD } from '../js/core/texts.js';

// Mots interdits : eval-methodologie.md §4.2 (et pas de pourcentage, pas de « en hausse »).
const FORBIDDEN = /(?<!\p{L})(score|note|niveau|échec|régression|raté|record|série)s?(?!\p{L})|tu dois|en hausse|%/iu;
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
