import { pickLeastRecent } from './pick.js';

export const WEEKS_PER_CYCLE = 6;
export const SESSIONS_PER_WEEK = 5;

/** Le programme avance au NOMBRE de séances, jamais au calendrier. n est 1-based. */
export function programPosition(n, weeksPerCycle = WEEKS_PER_CYCLE, sessionsPerWeek = SESSIONS_PER_WEEK) {
  const i = Math.max(0, n - 1);
  const perCycle = weeksPerCycle * sessionsPerWeek;
  return { cycle: Math.floor(i / perCycle) + 1, week: Math.floor((i % perCycle) / sessionsPerWeek) + 1 };
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

/** Consigne fixe du bloc « Mesure de ta voix », toujours la même (eval-diction.md §3.4, « Effet test »). */
export const VOICE_CONSIGNE = 'Téléphone posé à 30 cm, même pièce. Lis comme si tu parlais à un prospect. Ne cherche pas à bien faire.';
export const VOICE_TAKES = 3;

/**
 * Bloc « Mesure de ta voix » (spec V2 §4) : un seul pas, sans limite de temps (untimed), que l'écran de
 * séance déroule en 3 prises du texte de référence. Durée nominale 120 s, celle de l'articulation qu'il
 * remplace : la séance reste à 5 min environ. Il remplace les jalons J1, J7, J14, J30 et J60 de la V1.
 */
function voiceSteps(ref, voiceCheck) {
  return [{
    block: 'voix', kind: 'voice', durationSec: 120, untimed: true, itemId: ref.id, title: 'Mesure de ta voix',
    lines: [VOICE_CONSIGNE], text: ref.texte, syllables: ref.syllabes, takes: VOICE_TAKES, voiceCheck,
    recordKind: 'reference', speak: null,
  }];
}

function ecouteSteps(it) {
  return [
    { block: 'ecoute', kind: 'listen', durationSec: 50, itemId: it.id, title: it.titre, lines: ['Écoute. Ne prépare pas ta réponse.'], text: null, passage: it.passage, speak: it.passage, why: it.pourquoi },
    { block: 'ecoute', kind: 'reformulate', durationSec: 30, itemId: it.id, title: 'Reformule', lines: [it.consigne[1]], text: null, speak: 'À toi. Reformule à voix haute.' },
    { block: 'ecoute', kind: 'reveal', durationSec: 40, itemId: it.id, title: 'Compare', lines: [], text: null, reformulation: it.reformulationRef, detail: it.detailCache, speak: null },
  ];
}

/**
 * voiceCheck : voiceCheckDue() (js/core/voice-plan.js), 'calibration' | 'controle' | null. Le bloc voix vient
 * au début, avant l'échauffement (D §3.4 : la parole « à froid »), et prend la place de l'articulation.
 */
export function buildDailyPlan({ content, history = [], sessionNumber, dateKey, lastBloc3 = null, voiceCheck = null, comeback = false }) {
  const weeksPerCycle = content.program.weeks.length;
  const { cycle, week } = programPosition(sessionNumber, weeksPerCycle, content.program.sessionsPerWeek ?? SESSIONS_PER_WEEK);
  const seed = `${dateKey}#${sessionNumber}`;
  const maxWeek = cycle > 1 ? weeksPerCycle : week;
  const warm = ofBloc(content, 'echauffement').filter((e) => e.semaineMin <= maxWeek);
  const voix = pickLeastRecent(warm.filter((e) => e.type === 'voix'), history, `${seed}:voix`);
  const moteur = pickLeastRecent(warm.filter((e) => e.type === 'moteur'), history, `${seed}:moteur`);
  // Une reprise ne porte jamais de mesure de voix : elle reste due pour la séance suivante.
  const voice = comeback ? null : voiceCheck;
  const steps = [
    ...(voice ? voiceSteps(content.reference, voice) : []),
    guide('echauffement', voix, 30), guide('echauffement', moteur, 30),
  ];
  const itemIds = [voix.id, moteur.id];

  if (!voice) {
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

  return { type: comeback ? 'comeback' : 'daily', sessionNumber, cycle, week, bloc3, voiceCheck: voice ?? null, itemIds, steps };
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
