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
