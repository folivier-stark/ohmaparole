// Les profils Pro, Études et Quotidien (spec 2026-10-12-ohmaparole-profils-design.md). PUR.
//
// - meta `profil` : 'pro' | 'etudes' | 'quotidien'. Absente chez un utilisateur déjà installé : l'accueil
//   pose la question une fois (carte bloquante). Fred choisit Pro et rien ne change pour lui.
// - Chaque séance, enregistrement ou mesure écrit depuis la mise à jour porte `profil`. Les anciens, sans
//   profil, comptent comme 'pro' (profilOf).
// - Changer de profil (décision du 12/10, relecture) : un profil jamais utilisé repart de zéro, un profil
//   déjà utilisé retrouve sa mesure de voix et sa place dans son programme (filtre par le champ `profil`, sans
//   coupure dans le temps). Les séances sont toutes gardées ; Louarn compte le cumul et ne régresse jamais.

export const PROFILS = Object.freeze(['pro', 'etudes', 'quotidien']);

/** Les 3 choix, chacun en une ligne (premier lancement, carte de l'accueil, Réglages). */
export const PROFIL_CHOICES = Object.freeze([
  Object.freeze({ value: 'pro', label: 'Pro', hint: 'prise de parole et rendez-vous de vente' }),
  Object.freeze({ value: 'etudes', label: 'Études', hint: 'exposés, jury, stage, premier emploi' }),
  Object.freeze({ value: 'quotidien', label: 'Quotidien', hint: 'famille, amis, vie de tous les jours' }),
]);

/** « Pro · prise de parole et rendez-vous de vente » */
export const profilLine = (c) => `${c.label} · ${c.hint}`;

export const PROFIL_CHANGE_WARNING = 'Ta mesure de voix repartira de zéro pour ce profil. Tes séances sont gardées. Si tu reviens à ton profil d’avant, tu retrouves sa mesure.';

export const isProfil = (p) => PROFILS.includes(p);

/** Le profil d'une ligne stockée (séance, enregistrement, mesure) : sans profil, c'est une ligne d'avant, donc 'pro'. */
export const profilOf = (row) => (isProfil(row?.profil) ? row.profil : 'pro');

/** Profil non pro : textes neutres, programme de 48 séances, ni prospect ni budget. */
export const isNeutral = (profil) => isProfil(profil) && profil !== 'pro';

/**
 * Profil neutre choisi alors que l'objectif ou le pourquoi est encore l'objectif pro par défaut (jamais saisi) :
 * ils prennent la valeur neutre par défaut. Ce que la personne a écrit elle-même reste tel quel.
 */
export function neutralGoals({ objective = null, why = null } = {}, proDefault, neutralDefault) {
  const swap = (v) => (proDefault && v === proDefault ? neutralDefault : v);
  return { objective: swap(objective), why: swap(why) };
}

/**
 * Les lignes du profil (séances, enregistrements, mesures), créées depuis `since` (ms ; 0 par défaut, l'usage de l'appli).
 * Mesure de la voix (ligne de base, contrôles, A/B) ; position dans le programme, bilans et point de la semaine.
 */
export function ofProfil(rows, profil = 'pro', since = 0) {
  const p = isProfil(profil) ? profil : 'pro';
  const from = Number.isFinite(since) ? since : 0;
  return (rows ?? []).filter((r) => profilOf(r) === p && (r.createdAt ?? r.startedAt ?? 0) >= from);
}

/** Ajoute le profil à des lignes à écrire (mesures en direct, lignes d'une prise). */
export const withProfil = (rows, profil) => (rows ?? []).map((r) => ({ ...r, profil: isProfil(profil) ? profil : 'pro' }));
