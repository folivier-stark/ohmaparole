// Bilans de progrès aux séances 24, 48 et 72 (spec V2 §7, eval-methodologie.md §3.3 = M). PUR.
//
// - Le bilan REMPLACE la séance du jour et compte comme une séance : c'est une séance 'daily' qui porte
//   `bilan: { kind: 'bilan', index, order, forme, ... }` (dailyCount, stades et Parcours le comptent donc).
// - Il absorbe une mesure de voix due le même jour (il lit déjà le texte de référence : sa prise compte comme
//   une mesure de voix, voice-plan.js) et reporte le point de la semaine (weeklyPointDue le voit comme une
//   mesure de voix). Un jour de reprise, il est reporté à la séance suivante.
// - Annoncé la veille, c'est-à-dire à la séance d'avant : « Demain : ton bilan de 10 min. »
// - Après une baisse au-delà de la MDC, un bilan de CONTRÔLE de 3 min (texte de référence et inédits, M §3.3)
//   est proposé 5 séances plus tard, à la place du bloc voix ou de l'articulation.
import { hashString } from './pick.js';

export const BILAN_EVERY = 24;
export const CONTROL_AFTER = 5;
export const FORME_OPTIONS = Object.freeze([
  Object.freeze({ value: 'enforme', label: 'En forme' }),
  Object.freeze({ value: 'moyen', label: 'Moyen' }),
  Object.freeze({ value: 'fatigue', label: 'Fatigué' }),
]);
export const BILAN_CONSIGNE = 'Même pièce, assis, téléphone posé à 30 cm. Lis comme si tu parlais à un prospect. Ne cherche pas à bien faire.';

const isCountedDaily = (s) => s?.counted === true && (s.type === 'daily' || s.type === 'comeback');

/** Étapes de MESURE d'un bilan : sans elles, un bilan arrêté en route n'est pas consommé (il reste dû). */
export const BILAN_MEASURE_KINDS = Object.freeze(['lecture', 'presentation', 'ecoute-bilan', 'grille']);

/** Un bloc par étape (« Passer ce bloc » ne saute que l'étape en cours) : 'bilan:forme', 'bilan:lecture:2'… */
export const isBilanBlock = (block) => typeof block === 'string' && (block === 'bilan' || block.startsWith('bilan:'));

/**
 * Un bilan est fait s'il est allé au bout (même en passant des étapes : la mesure ne doit pas devenir une
 * dette), ou si, arrêté en route, toutes ses étapes de mesure ont été faites. done : indices des étapes faites.
 */
export function bilanComplete({ steps = [], done = [], finished = false }) {
  if (finished) return true;
  const set = new Set(done);
  return steps.every((st, i) => !BILAN_MEASURE_KINDS.includes(st.kind) || set.has(i));
}

/** Les bilans faits (séances comptées), dans l'ordre. kind 'bilan' ou 'controle'. */
export function bilansDone(sessions, kind = 'bilan') {
  return (sessions ?? []).filter((s) => isCountedDaily(s) && s.bilan?.kind === kind && s.bilan.complete !== false)
    .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
}

/**
 * Le bilan dû à la séance n, ou null : dû à la séance 24k, reporté aux 3 séances suivantes après une reprise.
 * @returns {{ index: number }|null}
 */
export function bilanDue({ sessionNumber, sessions = [], comeback = false, contentReady = true }) {
  if (comeback || !contentReady) return null;
  const n = Number(sessionNumber) || 0;
  const index = Math.floor(n / BILAN_EVERY);
  if (index < 1 || n - index * BILAN_EVERY > 3) return null;
  return bilansDone(sessions).some((s) => s.bilan.index === index) ? null : { index };
}

/** Le bilan de contrôle dû (5 séances après un bilan qui a montré une baisse), ou null. */
export function bilanControlDue({ sessionNumber, sessions = [], contentReady = true }) {
  if (!contentReady) return null;
  const last = bilansDone(sessions).at(-1);
  const at = last?.bilan?.controlDueAt;
  if (!Number.isFinite(at) || (Number(sessionNumber) || 0) < at) return null;
  if (bilansDone(sessions, 'controle').some((s) => s.bilan.of === last.id)) return null;
  return { of: last.id, index: last.bilan.index, order: last.bilan.order };
}

/**
 * Bulle de l'accueil. due : bilanDue() de la PROCHAINE séance, reprise du jour comprise (un jour de reprise,
 * pas d'annonce ; un bilan reporté est annoncé). La veille = la séance d'avant faite aujourd'hui.
 */
export function bilanAnnouncement({ due = null, doneToday = false, pendingToday = false } = {}) {
  if (!due) return null;
  // Commencé aujourd'hui et arrêté avant la fin : il reste dû, tout de suite.
  if (pendingToday) return 'Ton bilan reste à faire : 10 min, quand tu veux.';
  return doneToday ? 'Demain : ton bilan de 10 min.' : 'Aujourd’hui : ton bilan de 10 min.';
}

/** Le jour du dernier bilan (pas des contrôles) : sinceKey des tendances des taux (dashboard.rateTrend). */
export function lastBilanKey(sessions) {
  return bilansDone(sessions).at(-1)?.dateKey ?? null;
}

/** Ordre des textes inédits : mélange de Fisher-Yates, déterministe par graine (stockée avec la séance). */
export function ineditOrder(ids, seed) {
  const out = [...ids];
  let h = hashString(String(seed));
  const next = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return h / 4294967296; };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const lecture = (it, role, durationSec, i) => ({
  block: `bilan:lecture:${i}`, kind: 'lecture', role, durationSec, untimed: true, itemId: it.id, title: it.titre ?? 'Texte de référence',
  lines: [BILAN_CONSIGNE], text: it.texte, syllables: it.syllabes, takes: 1, minValid: 1, voiceCheck: 'bilan', speak: null,
});

/**
 * Forme du jour, texte de référence et inédits. reuseRefId : une mesure de voix valide a déjà eu lieu ce
 * jour-là, sa lecture sert au bilan (pas deux lectures du texte de référence le même jour).
 */
function readingSteps(content, order, reuseRefId = null) {
  const byId = new Map((content.mesure?.textesInedits ?? []).map((t) => [t.id, t]));
  return [
    { block: 'bilan:forme', kind: 'forme', durationSec: 5, untimed: true, title: 'Ta forme du jour', lines: [], text: null, speak: null },
    ...(reuseRefId ? [] : [lecture({ ...content.reference, titre: 'Texte de référence' }, 'ref', 60, 0)]),
    ...order.map((id, i) => lecture(byId.get(id), 'inedit', 35, i + 1)),
  ];
}

/**
 * Le bilan (M §3.3), environ 10 min : forme du jour, texte de référence (×1), inédits A, B et C dans un ordre
 * tiré pour la séance, se présenter en 60 s, écoute du passage réservé (ER1 au bilan 1, ER2 au 2, ER3 au 3),
 * auto-grille des 6 compétences, A/B à l'aveugle. Le rapport vient à la fin (écran du bilan).
 */
export function buildBilanPlan({ content, sessionNumber, dateKey, index, seed = `${dateKey}#${sessionNumber}`, reuseRefId = null }) {
  const mesure = content.mesure ?? {};
  const order = ineditOrder((mesure.textesInedits ?? []).map((t) => t.id), seed);
  const ecoutes = mesure.ecoutesReservees ?? [];
  const ecoute = ecoutes[(index - 1) % Math.max(1, ecoutes.length)];
  const steps = [
    ...readingSteps(content, order, reuseRefId),
    {
      block: 'bilan:presentation', kind: 'presentation', durationSec: 60, untimed: true, itemId: 'presentation', title: 'Se présenter',
      lines: ['60 secondes, sans texte : présente-toi à un artisan qui ne te connaît pas.'],
      question: 'Présente-toi à un artisan qui ne te connaît pas.', maxSec: 60, askReady: false, text: null, speak: null,
    },
    {
      block: 'bilan:ecoute', kind: 'ecoute-bilan', durationSec: 90, untimed: true, itemId: ecoute?.id ?? null, title: ecoute?.titre ?? 'Écoute',
      lines: ['Écoute. Le texte reste caché. Puis reformule à voix haute, 30 secondes.'], passage: ecoute?.passage ?? '',
      faitsCles: ecoute?.faitsCles ?? [], text: null, speak: null,
    },
    {
      block: 'bilan:grille', kind: 'grille', durationSec: 60, untimed: true, title: 'Tes gestes en RDV', lines: [],
      items: mesure.autoGrille ?? [], text: null, speak: null,
    },
    { block: 'bilan:ab', kind: 'ab', durationSec: 60, untimed: true, title: 'À l’aveugle', lines: [], text: null, speak: null },
  ];
  return {
    type: 'daily', sessionNumber, bloc3: null, voiceCheck: null, weeklyPoint: null,
    bilan: { kind: 'bilan', index, order, seed, refRecordingId: reuseRefId }, itemIds: [], steps,
  };
}

/** Le bilan de contrôle (3 min) : forme du jour, texte de référence et inédits, dans l'ordre du bilan. */
export function buildBilanControlPlan({ content, sessionNumber, dateKey, control, reuseRefId = null }) {
  return {
    type: 'daily', sessionNumber, bloc3: null, voiceCheck: null, weeklyPoint: null,
    bilan: { kind: 'controle', of: control.of, index: control.index, order: control.order, dateKey, refRecordingId: reuseRefId },
    itemIds: [], steps: readingSteps(content, control.order, reuseRefId),
  };
}
