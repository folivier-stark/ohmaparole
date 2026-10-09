import { pickLeastRecent } from './pick.js';

export const WEEKS_PER_CYCLE = 6;
export const SESSIONS_PER_WEEK = 5;

/** Le programme avance au NOMBRE de séances, jamais au calendrier. n est 1-based. */
export function programPosition(n, weeksPerCycle = WEEKS_PER_CYCLE) {
  const i = Math.max(0, n - 1);
  const perCycle = weeksPerCycle * SESSIONS_PER_WEEK;
  return { cycle: Math.floor(i / perCycle) + 1, week: Math.floor((i % perCycle) / SESSIONS_PER_WEEK) + 1 };
}

export function nextBloc3(last) {
  return last === 'ecoute' ? 'posture' : 'ecoute';
}

const ofBloc = (content, bloc) => content.items.filter((it) => it.bloc === bloc);

function weekItems(content, week, bloc) {
  const w = content.program.weeks.find((x) => x.week === week);
  return w[bloc].map((id) => {
    const it = content.byId.get(`${content.lang}.${id}`);
    if (!it) throw new Error(`Programme : ${id} introuvable`);
    return it;
  });
}

const guide = (block, it, durationSec) => ({
  block, kind: 'guide', durationSec, itemId: it.id, title: it.titre,
  lines: it.consigne, text: it.texte, speak: it.consigne.join(' '), why: it.pourquoi,
});

function articulationSteps(it) {
  return [
    { block: 'articulation', kind: 'slow', durationSec: 30, itemId: it.id, title: it.titre, lines: [it.consigne[0]], text: it.texte, speak: 'Lentement, en exagérant.', why: it.pourquoi },
    { block: 'articulation', kind: 'record', durationSec: 30, itemId: it.id, title: it.titre, lines: ["À vitesse normale. J'enregistre."], text: it.texte, speak: null, recordKind: 'session' },
    { block: 'articulation', kind: 'replay', durationSec: 60, itemId: it.id, title: 'Réécoute', lines: [it.consigne[it.consigne.length - 1]], text: it.texte, speak: null, rate: true },
  ];
}

function referenceSteps(ref, milestone) {
  const title = milestone === 1 ? 'Ta voix de départ' : `Jalon ${milestone}`;
  const lines = milestone === 1
    ? ['Ta voix de départ, pour la comparer plus tard.', 'Lis-le une fois dans ta tête.']
    : ['Même texte que le premier jour.', 'Lis-le une fois dans ta tête.'];
  return [
    { block: 'jalon', kind: 'guide', durationSec: 20, itemId: ref.id, title, lines, text: ref.texte, speak: 'Lis le texte une fois dans ta tête.' },
    { block: 'jalon', kind: 'record', durationSec: 60, itemId: ref.id, title, lines: ["À ton rythme naturel. J'enregistre."], text: ref.texte, speak: null, recordKind: 'reference', milestone },
    { block: 'jalon', kind: 'replay', durationSec: 40, itemId: ref.id, title: 'Réécoute', lines: ['Écoute-toi, sans te juger.'], text: ref.texte, speak: null, rate: false },
  ];
}

function ecouteSteps(it) {
  return [
    { block: 'ecoute', kind: 'listen', durationSec: 50, itemId: it.id, title: it.titre, lines: ['Écoute. Ne prépare pas ta réponse.'], text: null, passage: it.passage, speak: it.passage, why: it.pourquoi },
    { block: 'ecoute', kind: 'reformulate', durationSec: 30, itemId: it.id, title: 'Reformule', lines: [it.consigne[1]], text: null, speak: 'À toi. Reformule à voix haute.' },
    { block: 'ecoute', kind: 'reveal', durationSec: 40, itemId: it.id, title: 'Compare', lines: [], text: null, reformulation: it.reformulationRef, detail: it.detailCache, speak: null },
  ];
}

export function buildDailyPlan({ content, history = [], sessionNumber, dateKey, lastBloc3 = null, dueMilestone = null, comeback = false }) {
  const weeksPerCycle = content.program.weeks.length;
  const { cycle, week } = programPosition(sessionNumber, weeksPerCycle);
  const seed = `${dateKey}#${sessionNumber}`;
  const maxWeek = cycle > 1 ? weeksPerCycle : week;
  const warm = ofBloc(content, 'echauffement').filter((e) => e.semaineMin <= maxWeek);
  const voix = pickLeastRecent(warm.filter((e) => e.type === 'voix'), history, `${seed}:voix`);
  const moteur = pickLeastRecent(warm.filter((e) => e.type === 'moteur'), history, `${seed}:moteur`);
  const steps = [guide('echauffement', voix, 30), guide('echauffement', moteur, 30)];
  const itemIds = [voix.id, moteur.id];
  // Une reprise ne porte jamais de jalon : il reste dû pour la séance suivante.
  const milestone = comeback ? null : dueMilestone;

  if (milestone) {
    steps.push(...referenceSteps(content.reference, milestone));
  } else {
    const art = pickLeastRecent(weekItems(content, week, 'articulation'), history, `${seed}:art`);
    itemIds.push(art.id);
    const artSteps = articulationSteps(art);
    steps.push(...(comeback
      ? artSteps.slice(1).map((s) => (s.kind === 'replay' ? { ...s, durationSec: 30 } : s))
      : artSteps));
  }

  let bloc3 = null;
  if (!comeback) {
    bloc3 = nextBloc3(lastBloc3);
    const it = pickLeastRecent(weekItems(content, week, bloc3), history, `${seed}:${bloc3}`);
    itemIds.push(it.id);
    steps.push(...(bloc3 === 'ecoute' ? ecouteSteps(it) : [guide('posture', it, 120)]));
  }

  return { type: comeback ? 'comeback' : 'daily', sessionNumber, cycle, week, bloc3, milestone, itemIds, steps };
}

export function buildRdvPlan({ content, dateKey, lastConsigneId = null }) {
  const pool = content.consignes.filter((c) => c.id !== lastConsigneId);
  const c = pickLeastRecent(pool, [], `${dateKey}:rdv`);
  return {
    type: 'prerdv',
    consigneId: c.id,
    itemIds: [],
    steps: [
      { block: 'rdv', kind: 'objective', durationSec: 30, title: 'Ton objectif', lines: ['À la fin de ce rendez-vous, je veux…'], text: null, speak: 'Ton objectif, en une phrase.' },
      { block: 'rdv', kind: 'breathe', durationSec: 30, title: 'Ancrage', lines: ['Pieds au sol.', 'Trois longues expirations sur « fff ».', 'Épaules basses, mâchoire desserrée.'], text: null, speak: 'Pieds au sol. Trois longues expirations. Épaules basses.' },
      { block: 'rdv', kind: 'consigne', durationSec: 30, title: 'Ta consigne', lines: [c.texte, 'Ta première phrase, lentement.'], text: null, speak: `${c.texte} Puis ta première phrase, lentement.` },
    ],
  };
}
