import test from 'node:test';
import assert from 'node:assert/strict';
import { naturalFrequency } from '../js/core/stats.js';
import { variant, homeLine, goLabel, goSubtitle, plural, RETOUR, FIN, milestoneMessage, trendText, frequencyText, BLOCKS } from '../js/core/texts.js';

test('variant boucle, y compris en négatif', () => {
  assert.equal(variant(['a', 'b'], 3), 'b');
  assert.equal(variant(['a', 'b'], -1), 'b');
});

test('homeLine : priorités', () => {
  const base = { doneToday: false, comeback: false, yesterdayOff: false, dueMilestone: null, why: 'Être clair', motivations: ['m0', 'm1'], seed: 1 };
  assert.equal(homeLine({ ...base, doneToday: true }), "C'est fait pour aujourd'hui.");
  assert.ok(RETOUR.includes(homeLine({ ...base, comeback: true })));
  assert.match(homeLine({ ...base, dueMilestone: 7 }), /Jalon 7/);
  assert.equal(homeLine({ ...base, dueMilestone: 1 }), "Aujourd'hui, on enregistre ta voix de départ.");
  assert.match(homeLine({ ...base, yesterdayOff: true }), /Hier, pause/);
  assert.equal(homeLine({ ...base, seed: 3 }), 'Ton pourquoi : « Être clair »');
  assert.equal(homeLine({ ...base, seed: 1 }), 'm1');
});

test('goLabel et goSubtitle', () => {
  assert.equal(goLabel({ doneToday: false, comeback: false }), 'Go · 5 min');
  assert.equal(goLabel({ doneToday: true, comeback: false }), 'Encore une ? · 5 min');
  assert.equal(goLabel({ doneToday: false, comeback: true }), 'Reprendre · 2 min');
  assert.equal(goSubtitle({ comeback: false, dueMilestone: null, bloc3: 'posture' }), "Aujourd'hui : articulation + posture");
  assert.equal(goSubtitle({ comeback: false, dueMilestone: 7, bloc3: 'ecoute' }), "Aujourd'hui : ta voix de référence + écoute");
  assert.equal(goSubtitle({ comeback: true, dueMilestone: null, bloc3: 'ecoute' }), 'Échauffement + une prise');
  assert.equal(goSubtitle({ comeback: true, dueMilestone: 7, bloc3: 'ecoute' }), 'Échauffement + une prise');
});

test('plural, FIN, milestoneMessage', () => {
  assert.equal(plural(1, 'jour'), '1 jour');
  assert.equal(plural(3, 'jour'), '3 jours');
  assert.equal(FIN.length, 8);
  assert.match(milestoneMessage(30), /30 séances/);
  assert.match(milestoneMessage(60), /60 séances/);
});

test('trendText : le vocabulaire calibré, et rien d’autre', () => {
  assert.equal(trendText('tot'), 'Trop tôt pour trancher.');
  assert.equal(trendText('probable'), 'Ça bouge dans le bon sens. Probable, pas encore sûr.');
  assert.equal(trendText('calibrage', { missing: 2 }), 'On apprend tes repères. Encore 2 réponses.');
  assert.equal(trendText('calibrage', { missing: 1 }), 'On apprend tes repères. Encore 1 réponse.');
  // « On apprend ta voix » est réservé à la calibration acoustique (phase 3).
  assert.doesNotMatch(trendText('calibrage', { voice: true, missing: 2 }), /ta voix/);
  // « Progrès confirmé » n'arrive qu'aux bilans (phase 5) : un état inconnu retombe sur « trop tôt ».
  assert.equal(trendText('confirme'), 'Trop tôt pour trancher.');
});

test('le bloc posture ne promet pas d’inspirer confiance (eval-posture.md §7.3)', () => {
  assert.equal(BLOCKS.posture.tagline, 'Posé avant de parler, tu parles mieux.');
});

test('frequencyText : « environ X sur 10 (entre a et b) », borné à « 9 ou plus » et « 1 ou moins »', () => {
  assert.equal(frequencyText({ approx: 6, low: 4, high: 8, bound: null }), 'environ 6 sur 10 (entre 4 et 8)');
  assert.equal(frequencyText(naturalFrequency(10, 10)), 'environ 9 sur 10 ou plus (entre 7 et 10)');
  assert.equal(frequencyText(naturalFrequency(0, 10)), 'environ 1 sur 10 ou moins (entre 0 et 3)');
  assert.doesNotMatch(frequencyText(naturalFrequency(30, 30)), /10 sur 10/);
});
