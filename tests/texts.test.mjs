import test from 'node:test';
import assert from 'node:assert/strict';
import { variant, homeLine, goLabel, goSubtitle, plural, RETOUR, FIN, milestoneMessage } from '../js/core/texts.js';

test('variant boucle, y compris en négatif', () => {
  assert.equal(variant(['a', 'b'], 3), 'b');
  assert.equal(variant(['a', 'b'], -1), 'b');
});

test('homeLine : priorités', () => {
  const base = { doneToday: false, comeback: false, yesterdayOff: false, dueMilestone: null, why: 'Être clair', motivations: ['m0', 'm1'], seed: 1 };
  assert.equal(homeLine({ ...base, doneToday: true }), "C'est fait pour aujourd'hui.");
  assert.ok(RETOUR.includes(homeLine({ ...base, comeback: true })));
  assert.match(homeLine({ ...base, dueMilestone: 7 }), /Jalon 7/);
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
});

test('plural, FIN, milestoneMessage', () => {
  assert.equal(plural(1, 'jour'), '1 jour');
  assert.equal(plural(3, 'jour'), '3 jours');
  assert.equal(FIN.length, 8);
  assert.match(milestoneMessage(30), /30 séances/);
  assert.match(milestoneMessage(60), /60 séances/);
});
