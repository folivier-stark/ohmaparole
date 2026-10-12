import { isNeutral } from './profil.js';

/** Assemble le contenu chargé (programme, exercices, extras) en un objet indexé. */
export function indexContent({ program, exercises, extras }) {
  return {
    lang: exercises.lang,
    program,
    items: exercises.items,
    consignes: exercises.consignes,
    byId: new Map(exercises.items.map((it) => [it.id, it])),
    reference: extras.reference,
    motivations: extras.motivations,
    extras,
  };
}

/** L'id de la condition « profil » d'une réplique ('profil:etudes&theme:7' → 'etudes'), ou null. */
const lineProfil = (l) => String(l?.condition ?? '').split('&').find((c) => c.startsWith('profil:'))?.slice(7) ?? null;

/**
 * Les répliques de Louarn d'un profil non pro : celles de `proOnly` ne sont jamais tirées, leurs remplaçantes
 * et les répliques de thème du profil sont ajoutées (content/fr/louarn-quotidien.json).
 */
export function louarnFor(louarn, neutral, profil) {
  if (!louarn || !isNeutral(profil)) return louarn ?? null;
  // Sans la liste proOnly, les répliques du monde pro pourraient sortir : le renard se tait plutôt.
  if (!Array.isArray(neutral?.proOnly)) return null;
  const out = new Set(neutral?.proOnly ?? []);
  const extra = (neutral?.repliques ?? []).filter((l) => [null, profil].includes(lineProfil(l)));
  return { ...louarn, repliques: [...(louarn.repliques ?? []).filter((l) => !out.has(l.id)), ...extra] };
}

/**
 * Syllabes de tous les textes lus (références et inédits des deux packs Mesure) : la réanalyse d'une prise
 * ancienne retrouve son texte quel que soit le profil du moment (js/audio/voice-measure.js).
 */
function syllablesOf(...packs) {
  const out = {};
  for (const { reference, mesure } of packs) {
    if (reference?.id) out[reference.id] = reference.syllabes;
    for (const t of mesure?.textesInedits ?? []) out[t.id] = t.syllabes;
  }
  return out;
}

const NEUTRAL_EXTRAS = ['reference', 'objectifDefaut', 'pourquoiExemples', 'objectifsMoment', 'motivations'];

/**
 * Le contenu d'un profil (spec profils §1). Pro : celui d'avant, tel quel. Études et Quotidien : leur programme
 * (12 semaines de 4 séances), le texte de référence REFQ1, les extras neutres (l'objectif du « moment
 * important » prend la place des objectifs de RDV), les consignes QC, le pack Mesure non pro, le « pourquoi »
 * neutre des virelangues A10, A12 et A14, et les répliques de Louarn filtrées.
 * neutral : { programs: { etudes, quotidien }, extras, mesure, louarn } (fichiers *-quotidien.json).
 */
export function profileContent({ program, exercises, extras, louarn = null, mesure = null, neutral = {} }, profil = 'pro') {
  const pro = { reference: extras.reference, mesure };
  if (!isNeutral(profil)) {
    return {
      ...indexContent({ program, exercises, extras }), louarn, mesure, profil: 'pro',
      referencePro: extras.reference, objectifDefautPro: extras.objectifDefaut, syllablesById: syllablesOf(pro),
    };
  }
  const prog = neutral.programs?.[profil];
  if (!prog || !neutral.extras) throw new Error(`Contenu du profil ${profil} introuvable`);
  const ne = neutral.extras;
  const pourquoi = ne.pourquoi ?? {};
  const items = exercises.items.map((it) => (pourquoi[it.id] ? { ...it, pourquoi: pourquoi[it.id] } : it));
  const ex = {
    ...extras,
    ...Object.fromEntries(NEUTRAL_EXTRAS.filter((k) => ne[k] != null).map((k) => [k, ne[k]])),
    objectifsRdv: ne.objectifsMoment ?? [],
  };
  return {
    ...indexContent({ program: prog, exercises: { ...exercises, items, consignes: exercises.consignesQuotidien ?? [] }, extras: ex }),
    louarn: louarnFor(louarn, neutral.louarn, profil),
    mesure: neutral.mesure ?? null,
    profil,
    referencePro: extras.reference,
    objectifDefautPro: extras.objectifDefaut,
    syllablesById: syllablesOf(pro, { reference: ne.reference, mesure: neutral.mesure }),
  };
}
