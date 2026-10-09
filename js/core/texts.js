export const variant = (list, n) => list[((n % list.length) + list.length) % list.length];
export const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

export const BLOCKS = {
  echauffement: { label: 'Échauffement', tagline: 'Ta voix est prête avant ta première phrase.' },
  articulation: { label: 'Articulation', tagline: 'On te comprend du premier coup.' },
  ecoute: { label: 'Écoute', tagline: 'Ton client se sent entendu.' },
  posture: { label: 'Posture', tagline: 'Posé avant de parler, tu parles mieux.' },
  voix: { label: 'Ta voix', tagline: 'Même texte, pour mesurer le chemin parcouru.' },
  rdv: { label: 'Avant un RDV', tagline: 'Tu y vas dans 90 secondes.' },
};

export const FIN = [
  'C’est fait. 5 minutes pour toi, et pour tes prochains rendez-vous.',
  'Une de plus. Ta voix s’en souvient, même si toi tu oublies.',
  'Bien joué. Le plus dur, c’était d’appuyer sur Go.',
  'Fait. Tu peux retourner à ta journée.',
  'Ça, c’est une séance qui compte. À demain.',
  'Tu t’es écouté aujourd’hui. Peu de gens le font.',
  'Voilà. Petit, régulier : c’est comme ça que ça bouge.',
  'Merci d’être venu. Rien d’autre à faire.',
];
export const FIN_PARTIELLE = 'Arrêté en route, et ça compte quand même.';

export const RETOUR = [
  'Content de te revoir. On reprend doucement : 2 minutes.',
  'Te revoilà. Rien n’est perdu, tout est là. On y va ?',
  'Les pauses font partie du chemin. 2 minutes pour remettre la voix en route.',
  'Bon retour. Pas de bilan, pas de rattrapage. Juste maintenant.',
];

export const PAS_COMPTE = 'Pas encore compté. Une minute suffit.';

/** États d'un taux (eval-methodologie.md §4.2). « Progrès confirmé » n'existe qu'aux bilans. */
export const TREND_TEXT = {
  tot: 'Trop tôt pour trancher.',
  probable: 'Ça bouge dans le bon sens. Probable, pas encore sûr.',
};

/** Rappelé une fois, à la fin de la première routine « Avant un RDV » (eval-rdv.md §4.5). */
export const RDV_NO_RECORD = 'N’enregistre jamais un vrai rendez-vous : sans l’accord de la personne, c’est un délit (article 226-1 du Code pénal). Du rendez-vous, l’appli ne garde que l’heure de ta sortie et tes réponses.';

/**
 * missing : réponses qui manquent avant de sortir du calibrage. « On apprend ta voix » est réservé
 * à la calibration acoustique : les taux déclaratifs disent « On apprend tes repères ».
 */
export function trendText(state, { missing = 0 } = {}) {
  if (state === 'calibrage') return `On apprend tes repères. Encore ${plural(missing, 'réponse')}.`;
  return TREND_TEXT[state] ?? TREND_TEXT.tot;
}

/** « environ 6 sur 10 (entre 4 et 8) », ou « environ 9 sur 10 ou plus » : jamais 10 ni 0 sur 10. */
export function frequencyText({ approx, low, high, bound }) {
  const edge = bound === 'plus' ? ' ou plus' : bound === 'moins' ? ' ou moins' : '';
  return `environ ${approx} sur 10${edge} (entre ${low} et ${high})`;
}

/** voiceDue : voiceCheckDue() de voice-plan.js. Les jalons V1 ne sont plus annoncés (spec V2 §4). */
export function homeLine({ doneToday, comeback, yesterdayOff, voiceDue = null, why, motivations, seed }) {
  if (doneToday) return "C'est fait pour aujourd'hui.";
  if (comeback) return variant(RETOUR, seed);
  if (voiceDue === 'calibration') return "Aujourd'hui, on commence par mesurer ta voix.";
  if (voiceDue === 'controle') return "Aujourd'hui, contrôle de ta voix : même texte, 3 lectures.";
  if (yesterdayOff) return "Hier, pause. Aujourd'hui, 1 minute suffit pour que ça compte.";
  if (why && seed % 3 === 0) return `Ton pourquoi : « ${why} »`;
  return variant(motivations, seed);
}

export function goLabel({ doneToday, comeback }) {
  if (comeback) return 'Reprendre · 2 min';
  return doneToday ? 'Encore une ? · 5 min' : 'Go · 5 min';
}

export function goSubtitle({ comeback, voiceDue = null, bloc3 }) {
  if (comeback) return 'Échauffement + une prise';
  const third = bloc3 === 'posture' ? 'posture' : 'écoute';
  return voiceDue ? `Aujourd'hui : mesure de ta voix + ${third}` : `Aujourd'hui : articulation + ${third}`;
}

/** Prise du bloc voix refusée par l'analyse (js/audio/analyze.js) : le message à Fred, sans jugement. */
export const VOICE_REFUS = Object.freeze({
  bruit: 'Trop de bruit : change de pièce.',
  saturation: 'Trop près ou trop fort : recule un peu.',
  'sans-parole': 'On n’a pas entendu la lecture.',
  'trop-court': 'On n’a pas entendu la lecture.',
  decodage: 'Le téléphone n’a pas pu lire cette prise.',
});

export const refusalText = (reason) => VOICE_REFUS[reason] ?? VOICE_REFUS.decodage;

/**
 * Fin d'une séance qui avait un bloc « Mesure de ta voix ». null sans bloc voix.
 * calibrationRemaining : après cette séance (voice-plan.calibrationRemaining) ; untilControl : sessionsUntilControl.
 */
export function voiceEndMessage({ voiceCheck, validTakes = 0, calibrationRemaining = 0, untilControl = null }) {
  if (!voiceCheck) return null;
  if (validTakes < 2) return 'Pas assez de prises valides cette fois : la mesure revient à ta prochaine séance.';
  if (voiceCheck === 'controle') return 'Contrôle de ta voix fait. Le résultat est dans Progression.';
  if (calibrationRemaining > 0) {
    const when = calibrationRemaining > 1 ? 'à tes prochaines séances' : 'à ta prochaine séance';
    return `Mesure de ta voix faite. On apprend ta voix : encore ${plural(calibrationRemaining, 'mesure')}, ${when}.`;
  }
  const next = Number.isFinite(untilControl) && untilControl > 1 ? ` Premier contrôle dans ${plural(untilControl, 'séance')}.` : '';
  return `Ta voix de départ est mesurée.${next}`;
}
