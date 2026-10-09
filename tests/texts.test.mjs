import test from 'node:test';
import assert from 'node:assert/strict';
import { naturalFrequency } from '../js/core/stats.js';
import {
  variant, homeLine, goLabel, goSubtitle, plural, RETOUR, FIN, trendText, frequencyText, BLOCKS, VOICE_REFUS, refusalText, voiceEndMessage,
} from '../js/core/texts.js';
import * as texts from '../js/core/texts.js';

test('variant boucle, y compris en négatif', () => {
  assert.equal(variant(['a', 'b'], 3), 'b');
  assert.equal(variant(['a', 'b'], -1), 'b');
});

test('homeLine : priorités', () => {
  const base = { doneToday: false, comeback: false, yesterdayOff: false, voiceDue: null, why: 'Être clair', motivations: ['m0', 'm1'], seed: 1 };
  assert.equal(homeLine({ ...base, doneToday: true }), "C'est fait pour aujourd'hui.");
  assert.ok(RETOUR.includes(homeLine({ ...base, comeback: true })));
  assert.ok(RETOUR.includes(homeLine({ ...base, comeback: true, voiceDue: 'controle' })), 'une reprise ne porte pas de mesure');
  assert.equal(homeLine({ ...base, voiceDue: 'calibration' }), "Aujourd'hui, on commence par mesurer ta voix.");
  assert.equal(homeLine({ ...base, voiceDue: 'controle' }), "Aujourd'hui, contrôle de ta voix : même texte, 3 lectures.");
  assert.equal(homeLine({ ...base, dueMilestone: 7 }), 'm1', 'les jalons V1 ne sont plus annoncés');
  assert.match(homeLine({ ...base, yesterdayOff: true }), /Hier, pause/);
  assert.equal(homeLine({ ...base, seed: 3 }), 'Ton pourquoi : « Être clair »');
  assert.equal(homeLine({ ...base, seed: 1 }), 'm1');
});

test('goLabel et goSubtitle', () => {
  assert.equal(goLabel({ doneToday: false, comeback: false }), 'Go · 5 min');
  assert.equal(goLabel({ doneToday: true, comeback: false }), 'Encore une ? · 5 min');
  assert.equal(goLabel({ doneToday: false, comeback: true }), 'Reprendre · 2 min');
  assert.equal(goSubtitle({ comeback: false, voiceDue: null, bloc3: 'posture' }), "Aujourd'hui : articulation + posture");
  assert.equal(goSubtitle({ comeback: false, voiceDue: 'controle', bloc3: 'ecoute' }), "Aujourd'hui : mesure de ta voix + écoute");
  assert.equal(goSubtitle({ comeback: false, voiceDue: 'calibration', bloc3: 'posture' }), "Aujourd'hui : mesure de ta voix + posture");
  assert.equal(goSubtitle({ comeback: false, voiceDue: null, bloc3: 'ecoute', point: true }), "Aujourd'hui : articulation + ton point de la semaine");
  assert.equal(goSubtitle({ comeback: false, voiceDue: 'controle', bloc3: 'ecoute', point: true }), "Aujourd'hui : mesure de ta voix + écoute", 'jamais les deux');
  assert.equal(goSubtitle({ comeback: true, voiceDue: null, bloc3: 'ecoute' }), 'Échauffement + une prise');
  assert.equal(goSubtitle({ comeback: true, voiceDue: 'controle', bloc3: 'ecoute' }), 'Échauffement + une prise');
});

test('plural, FIN ; plus de message de jalon V1', () => {
  assert.equal(plural(1, 'jour'), '1 jour');
  assert.equal(plural(3, 'jour'), '3 jours');
  assert.equal(FIN.length, 8);
  assert.equal('milestoneMessage' in texts, false);
  assert.equal('jalon' in BLOCKS, false);
  assert.equal(BLOCKS.voix.label, 'Ta voix');
});

test('prise refusée : un message par raison, jamais « ratée »', () => {
  assert.equal(refusalText('bruit'), 'Trop de bruit : change de pièce.');
  assert.equal(refusalText('saturation'), 'Trop près ou trop fort : recule un peu.');
  assert.equal(refusalText('sans-parole'), 'On n’a pas entendu la lecture.');
  assert.equal(refusalText('trop-court'), 'On n’a pas entendu la lecture.');
  assert.equal(refusalText('decodage'), VOICE_REFUS.decodage);
  assert.equal(refusalText('inconnu'), VOICE_REFUS.decodage, 'un message neutre par défaut');
  for (const t of Object.values(VOICE_REFUS)) assert.doesNotMatch(t, /raté|échec|erreur/i, t);
});

test('voiceEndMessage : la fin d’une séance avec mesure de voix', () => {
  assert.equal(voiceEndMessage({ voiceCheck: 'calibration', validTakes: 1, calibrationRemaining: 3 }),
    'Pas assez de prises valides cette fois : la mesure revient à ta prochaine séance.');
  assert.equal(voiceEndMessage({ voiceCheck: 'calibration', validTakes: 3, calibrationRemaining: 2 }),
    'Mesure de ta voix faite. On apprend ta voix : encore 2 mesures, à tes prochaines séances.');
  assert.equal(voiceEndMessage({ voiceCheck: 'calibration', validTakes: 2, calibrationRemaining: 1 }),
    'Mesure de ta voix faite. On apprend ta voix : encore 1 mesure, à ta prochaine séance.');
  assert.equal(voiceEndMessage({ voiceCheck: 'calibration', validTakes: 3, calibrationRemaining: 0, untilControl: 6 }),
    'Ta voix de départ est mesurée. Premier contrôle dans 6 séances.');
  assert.equal(voiceEndMessage({ voiceCheck: 'controle', validTakes: 3, calibrationRemaining: 0, untilControl: 6 }),
    'Contrôle de ta voix fait. Le résultat est dans Progression.');
  assert.equal(voiceEndMessage({ voiceCheck: null, validTakes: 0 }), null);
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
