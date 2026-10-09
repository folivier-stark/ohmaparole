export const variant = (list, n) => list[((n % list.length) + list.length) % list.length];
export const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

export const BLOCKS = {
  echauffement: { label: 'Échauffement', tagline: 'Ta voix est prête avant ta première phrase.' },
  articulation: { label: 'Articulation', tagline: 'On te comprend du premier coup.' },
  ecoute: { label: 'Écoute', tagline: 'Ton client se sent entendu.' },
  posture: { label: 'Posture', tagline: 'Posé avant de parler, tu parles mieux.' },
  jalon: { label: 'Ta voix', tagline: 'Même texte, pour entendre le chemin parcouru.' },
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
export const RDV_NO_RECORD = 'N’enregistre jamais un vrai rendez-vous : sans l’accord de la personne, c’est un délit (article 226-1 du Code pénal). L’appli, elle, ne garde que l’heure de ta sortie.';

/** voice : l'axe porte sur la voix (diction). missing : réponses qui manquent avant de sortir du calibrage. */
export function trendText(state, { voice = false, missing = 0 } = {}) {
  if (state === 'calibrage') return `${voice ? 'On apprend ta voix.' : 'On apprend.'} Encore ${plural(missing, 'réponse')}.`;
  return TREND_TEXT[state] ?? TREND_TEXT.tot;
}

export function homeLine({ doneToday, comeback, yesterdayOff, dueMilestone, why, motivations, seed }) {
  if (doneToday) return "C'est fait pour aujourd'hui.";
  if (comeback) return variant(RETOUR, seed);
  if (dueMilestone === 1) return "Aujourd'hui, on enregistre ta voix de départ.";
  if (dueMilestone) return `Jalon ${dueMilestone} aujourd'hui : tu vas réentendre ta voix du début.`;
  if (yesterdayOff) return "Hier, pause. Aujourd'hui, 1 minute suffit pour que ça compte.";
  if (why && seed % 3 === 0) return `Ton pourquoi : « ${why} »`;
  return variant(motivations, seed);
}

export function goLabel({ doneToday, comeback }) {
  if (comeback) return 'Reprendre · 2 min';
  return doneToday ? 'Encore une ? · 5 min' : 'Go · 5 min';
}

export function goSubtitle({ comeback, dueMilestone, bloc3 }) {
  if (comeback) return 'Échauffement + une prise';
  const third = bloc3 === 'posture' ? 'posture' : 'écoute';
  return dueMilestone ? `Aujourd'hui : ta voix de référence + ${third}` : `Aujourd'hui : articulation + ${third}`;
}

export function milestoneMessage(m) {
  if (m === 1) return 'Ta voix de départ est enregistrée. Tu la réentendras à la 7ᵉ séance.';
  if (m === 7) return '7 séances. Écoute ta voix du début, puis celle d’aujourd’hui. Si tu n’entends pas encore de différence, c’est normal à ce stade.';
  if (m === 14) return '14 séances. Même texte, deux voix. À toi de juger.';
  if (m === 30) return '30 séances. Un mois de pratique, à ton rythme. Même texte : ce que tu entends, c’est toi qui le dis. Rien n’est noté ici.';
  return `${m} séances. Même texte, deux voix. À toi de juger.`;
}
