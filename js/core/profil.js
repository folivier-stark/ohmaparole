// Les profils Pro, Études et Quotidien (spec 2026-10-12-ohmaparole-profils-design.md). PUR.
//
// - meta `profil` : 'pro' | 'etudes' | 'quotidien'. Absente chez un utilisateur déjà installé : l'accueil
//   pose la question une fois (carte bloquante). Fred choisit Pro et rien ne change pour lui.
// - Chaque séance, enregistrement ou mesure écrit depuis la mise à jour porte `profil`. Les anciens, sans
//   profil, comptent comme 'pro' (profilOf).
// - Changer de profil : la mesure de la voix repart de zéro (meta `profilDepuis`, ofProfil), les séances
//   sont gardées.

export const PROFILS = Object.freeze(['pro', 'etudes', 'quotidien']);

/** Les 3 choix, chacun en une ligne (premier lancement, carte de l'accueil, Réglages). */
export const PROFIL_CHOICES = Object.freeze([
  Object.freeze({ value: 'pro', label: 'Pro', hint: 'prise de parole et rendez-vous de vente' }),
  Object.freeze({ value: 'etudes', label: 'Études', hint: 'exposés, jury, stage, premier emploi' }),
  Object.freeze({ value: 'quotidien', label: 'Quotidien', hint: 'famille, amis, vie de tous les jours' }),
]);

/** « Pro · prise de parole et rendez-vous de vente » */
export const profilLine = (c) => `${c.label} · ${c.hint}`;

export const PROFIL_CHANGE_WARNING = 'Ta mesure de voix repartira de zéro. Tes séances sont gardées.';

export const isProfil = (p) => PROFILS.includes(p);

/** Le profil d'une ligne stockée (séance, enregistrement, mesure) : sans profil, c'est une ligne d'avant, donc 'pro'. */
export const profilOf = (row) => (isProfil(row?.profil) ? row.profil : 'pro');

/** Profil non pro : textes neutres, programme de 48 séances, ni prospect ni budget. */
export const isNeutral = (profil) => isProfil(profil) && profil !== 'pro';

/**
 * Les lignes du profil, créées depuis `since` (ms, meta profilDepuis : le dernier changement de profil).
 * Sert aux enregistrements et aux mesures de la voix : ligne de base, contrôles, A/B, point de la semaine.
 */
export function ofProfil(rows, profil = 'pro', since = 0) {
  const p = isProfil(profil) ? profil : 'pro';
  const from = Number.isFinite(since) ? since : 0;
  return (rows ?? []).filter((r) => profilOf(r) === p && (r.createdAt ?? r.startedAt ?? 0) >= from);
}

/** Ajoute le profil à des lignes à écrire (mesures en direct, lignes d'une prise). */
export const withProfil = (rows, profil) => (rows ?? []).map((r) => ({ ...r, profil: isProfil(profil) ? profil : 'pro' }));
