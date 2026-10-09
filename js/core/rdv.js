// Retour après un rendez-vous, version résultats (spec V2 §5, eval-rdv.md §1.3 et §5.2). PUR.
import { addDays, weekdayMon0 } from './dates.js';

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** « Je sors du RDV » reste sur l'accueil 4 h après la routine. */
export const RDV_EXIT_WINDOW_MS = 4 * HOUR;
/** Sans le bouton, la carte arrive 1 h après la routine ; elle reste proposée 3 jours au plus. */
export const RDV_CARD_DELAY_MS = HOUR;
export const RDV_CARD_MAX_MS = 3 * DAY;

/** « Je ne sais pas » est une vraie réponse (eval-rdv.md §1.1). « Passer » n'en est pas une. */
export const DONT_KNOW = { value: 'nsp', label: 'Je ne sais pas' };

/**
 * Les questions, mot pour mot (R §1.3). field : réponse stockée sur la séance `prerdv` ;
 * skipField : « Passer ». `feedback` et `goalReached` existaient déjà : ils sont gardés tels quels.
 */
export const RDV_QUESTIONS = {
  objectif: {
    field: 'goalReached', skipField: 'goalSkipped', text: 'Objectif atteint ?',
    options: [{ value: 'oui', label: 'Oui' }, { value: 'partie', label: 'En partie' }, { value: 'non', label: 'Pas cette fois' }],
  },
  suite: {
    field: 'rdvSuite', skipField: 'rdvSuiteSkipped', text: 'La suite ?',
    options: [
      { value: 'date', label: 'Signé ou date fixée' },
      { value: 'nonclair', label: 'Non clair', hint: 'de lui ou de toi' },
      { value: 'flou', label: 'Flou', hint: '« on se rappelle », plaquette, « je vais y réfléchir »' },
    ],
  },
  budget: {
    field: 'rdvBudget', skipField: 'rdvBudgetSkipped', text: 'Le budget ?',
    options: [
      { value: 'moidebut', label: 'Abordé par moi, dans la 1re moitié' },
      { value: 'moitard', label: 'Abordé par moi, plus tard' },
      { value: 'lui', label: 'Il l’a abordé avant moi' },
      { value: 'non', label: 'Pas abordé' },
    ],
  },
  heure: {
    field: 'rdvHeure', skipField: 'rdvHeureSkipped', text: 'Fini à l’heure prévue ?',
    options: [
      { value: 'alheure', label: 'À l’heure ou avant' },
      { value: 'plus10', label: 'Jusqu’à 10 min de plus' },
      { value: 'plusde10', label: 'Plus de 10 min de plus' },
    ],
  },
  // Remplace « Fini à l'heure prévue ? » quand la durée a été mesurée par le bouton (R §1.3, T3).
  annonce: {
    field: 'rdvAnnonceMin', skipField: 'rdvAnnonceSkipped', text: 'La durée annoncée ?',
    options: [30, 45, 60, 90].map((m) => ({ value: m, label: `${m} min` })),
  },
  repeter: {
    field: 'feedback', skipField: 'feedbackSkipped', text: 'On t’a fait répéter ?',
    options: [{ value: 'non', label: 'Non' }, { value: 'une', label: 'Une fois' }, { value: 'plusieurs', label: 'Plusieurs fois' }],
  },
};

const hasGoal = (s) => Boolean((s.goal ?? '').trim());
const isDone = (s, id) => s[RDV_QUESTIONS[id].field] != null || s[RDV_QUESTIONS[id].skipField] === true;
const byEndDesc = (a, b) => b.endedAt - a.endedAt;

/** Une vraie routine « Avant un RDV » : 30 s de pratique suffisent (un RDV écourté reste un vrai RDV). */
export const isRdvRoutine = (s) => s.type === 'prerdv' && (s.practicedSec ?? 0) >= 30;

/** Durée réelle, de la fin de la routine au tap « Je sors du RDV », arrondie à 5 min. null si non mesurée. */
export function rdvMeasuredMin(s) {
  if (s.rdvEndedAt == null || s.endedAt == null || s.rdvEndedAt < s.endedAt) return null;
  return Math.round((s.rdvEndedAt - s.endedAt) / (5 * MIN)) * 5;
}

/** Les questions de ce RDV, dans l'ordre : 5 au plus. */
export function rdvQuestionIds(s) {
  return [
    ...(hasGoal(s) ? ['objectif'] : []),
    'suite', 'budget',
    rdvMeasuredMin(s) != null ? 'annonce' : 'heure',
    'repeter',
  ];
}

/** Le retour a-t-il commencé (une réponse ou un « Passer ») ? */
export const rdvStarted = (s) => Object.keys(RDV_QUESTIONS).some((id) => isDone(s, id));

/**
 * Prochaine question à poser, ou null. Compatibilité avec l'ancien flux, où « On t'a fait répéter ? »
 * venait en premier : une fois cette question réglée, seul l'objectif peut encore être demandé,
 * et « Passer » sur elle clôturait tout le retour.
 */
export function nextRdvQuestion(s) {
  if (s.feedbackSkipped === true) return null;
  if (s.feedback != null) return hasGoal(s) && !isDone(s, 'objectif') ? 'objectif' : null;
  return rdvQuestionIds(s).find((id) => !isDone(s, id)) ?? null;
}

/** Réponse à une question (valeur d'option ou « nsp »). rdvAnsweredAt garde l'heure de la première réponse. */
export function answerRdv(s, id, value, now) {
  return { ...s, [RDV_QUESTIONS[id].field]: value, rdvAnsweredAt: s.rdvAnsweredAt ?? now };
}

export const skipRdv = (s, id) => ({ ...s, [RDV_QUESTIONS[id].skipField]: true });

/** Tap sur « Je sors du RDV » : l'heure de sortie donne la durée réelle (rdvEndedAt − endedAt). */
export const exitRdv = (s, now) => ({ ...s, rdvEndedAt: now });

/** La routine pour laquelle l'accueil montre « Je sors du RDV », ou null. */
export function rdvExitCandidate(sessions, now) {
  return sessions
    .filter((s) => isRdvRoutine(s) && s.rdvEndedAt == null && !rdvStarted(s)
      && now >= s.endedAt && now - s.endedAt < RDV_EXIT_WINDOW_MS)
    .sort(byEndDesc)[0] ?? null;
}

/** La routine dont la carte de retour est à afficher : 1 h après, ou dès « Je sors du RDV », 3 jours au plus. */
export function pendingRdvReturn(sessions, now) {
  return sessions
    .filter((s) => isRdvRoutine(s) && now - s.endedAt <= RDV_CARD_MAX_MS
      && (s.rdvEndedAt != null || now - s.endedAt >= RDV_CARD_DELAY_MS)
      && nextRdvQuestion(s) != null)
    .sort(byEndDesc)[0] ?? null;
}

/** Fini à l'heure : calculé si la durée est mesurée et la durée annoncée connue, sinon la réponse déclarée. */
export function rdvOnTime(s) {
  const measured = rdvMeasuredMin(s);
  if (measured != null && typeof s.rdvAnnonceMin === 'number') {
    if (measured <= s.rdvAnnonceMin) return 'alheure';
    return measured <= s.rdvAnnonceMin + 10 ? 'plus10' : 'plusde10';
  }
  if (s.rdvAnnonceMin === DONT_KNOW.value) return DONT_KNOW.value;
  return s.rdvHeure ?? null;
}

/** Lignes de la carte « En rendez-vous » (R §5.2). « nsp » compte dans le total, jamais en réussite. */
export const RDV_INDICATORS = [
  { key: 'suite', label: 'Une suite nette (date ou non clair)', source: 'observé en vrai', read: (s) => s.rdvSuite, positive: ['date', 'nonclair'] },
  { key: 'budget', label: 'Budget abordé par toi, dans la 1re moitié', source: 'observé en vrai', read: (s) => s.rdvBudget, positive: ['moidebut'] },
  { key: 'heure', label: 'Fini à l’heure', source: 'observé en vrai', read: rdvOnTime, positive: ['alheure'] },
  { key: 'repeter', label: 'On ne t’a pas fait répéter', source: 'observé en vrai', read: (s) => s.feedback, positive: ['non'] },
  { key: 'objectif', label: 'Objectif atteint', source: 'ressenti', read: (s) => s.goalReached, positive: ['oui'] },
];

const weekOf = (key) => addDays(key, -weekdayMon0(key));
const tally = (entries, positive) => ({ k: entries.filter((e) => positive.includes(e.v)).length, n: entries.length });

/**
 * Mois 1 = les 4 premières semaines (lundi) qui ont une réponse ; récent = les 28 derniers jours.
 * separate : le mois 1 se termine avant les 28 derniers jours, la comparaison côte à côte a un sens.
 * measured : réponses tirées d'une durée mesurée par le bouton.
 */
export function rdvBoard(sessions, todayKey) {
  const recentFrom = addDays(todayKey, -27);
  const routines = sessions.filter((s) => isRdvRoutine(s) && s.dateKey <= todayKey);
  return RDV_INDICATORS.map((ind) => {
    const entries = routines
      .map((s) => ({ dateKey: s.dateKey, v: ind.read(s), measured: rdvMeasuredMin(s) != null }))
      .filter((e) => e.v != null);
    const m1Weeks = [...new Set(entries.map((e) => weekOf(e.dateKey)))].sort().slice(0, 4);
    return {
      key: ind.key,
      label: ind.label,
      source: ind.source,
      month1: tally(entries.filter((e) => m1Weeks.includes(weekOf(e.dateKey))), ind.positive),
      recent: tally(entries.filter((e) => e.dateKey >= recentFrom), ind.positive),
      separate: m1Weeks.length > 0 && addDays(m1Weeks.at(-1), 6) < recentFrom,
      measured: ind.key === 'heure' ? entries.filter((e) => e.measured).length : 0,
    };
  });
}
