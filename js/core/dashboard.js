import { addDays, diffDays, weekdayMon0, sundayOnOrBefore } from './dates.js';
import { naturalFrequency, probGreater } from './stats.js';

export const GOAL_SESSIONS = 72;

/** Objectif = un cycle complet du programme (semaines × séances par semaine). */
export function programGoal(program) {
  return program.weeks.length * (program.sessionsPerWeek ?? 5);
}

/**
 * Axes de progrès. source : où lire la réponse dans une séance.
 * values : réponses possibles (jeux distincts pour les axes lus dans `ratings`).
 * positive : réponses qui comptent comme une réussite.
 * « nsp » (Je ne sais pas) est une vraie réponse (eval-rdv.md §1.1) : elle compte dans le total, jamais en réussite.
 * Exception : « On t'a fait répéter ? » n'avait pas cette option en V1, « nsp » reste hors de son total.
 */
export const AXES = {
  diction: { source: 'ratings', values: ['clair', 'moyen', 'brouillon'], positive: ['clair'] },
  ecoute: { source: 'ratings', values: ['oui', 'non'], positive: ['oui'] },
  posture: { source: 'ratings', values: ['pose', 'unpeu', 'pasencore'], positive: ['pose'] },
  rdv: { source: 'feedback', values: ['non', 'une', 'plusieurs'], positive: ['non'] },
  objectif: { source: 'goalReached', values: ['oui', 'partie', 'non', 'nsp'], positive: ['oui'] },
};

/**
 * Règle de tendance (eval-methodologie.md §2.6, spec V2 §3) : contrôle chaque dimanche, P ≥ 0,90
 * trois dimanches de suite, au moins 8 réponses de chaque côté à chaque contrôle.
 */
export const TREND_MIN_ANSWERS = 8;
export const TREND_MIN_PROB = 0.9;
export const TREND_RUN = 3;
/** Blocs de la courbe par axe : 28 jours consécutifs, au moins 8 réponses. */
export const BLOCK_DAYS = 28;
export const BLOCK_MIN_ANSWERS = 8;

const isDailyCounted = (s) => s.counted === true && (s.type === 'daily' || s.type === 'comeback');
const weekOf = (key) => addDays(key, -weekdayMon0(key));

function answers(session, axis) {
  const { source, values } = AXES[axis];
  const raw = source === 'ratings' ? Object.values(session.ratings ?? {}) : [session[source]];
  return raw.filter((v) => values.includes(v));
}

/** Cumul des séances comptées (quotidiennes et reprises), un point par jour du premier jour à aujourd'hui. */
export function cumulativeSeries(sessions, todayKey) {
  const days = sessions.filter(isDailyCounted).map((s) => s.dateKey).sort();
  if (!days.length) return [];
  const perDay = new Map();
  for (const d of days) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  const out = [];
  let total = 0;
  for (let k = days[0], i = 0; k <= todayKey; k = addDays(k, 1), i++) {
    total += perDay.get(k) ?? 0;
    out.push({ dateKey: k, day: i, total });
  }
  return out;
}

/** Avancement vers l'objectif, avec une date estimée au rythme des 28 derniers jours (au moins 7 jours d'historique). */
export function goalProgress(sessions, todayKey, goal = GOAL_SESSIONS) {
  const daily = sessions.filter(isDailyCounted);
  const done = daily.length;
  const left = Math.max(0, goal - done);
  let etaKey = null;
  if (left > 0 && done > 0) {
    const first = daily.map((s) => s.dateKey).sort()[0];
    const span = diffDays(first, todayKey) + 1;
    if (span >= 7) {
      const windowDays = Math.min(28, span);
      const from = addDays(todayKey, -(windowDays - 1));
      const recent = daily.filter((s) => s.dateKey >= from && s.dateKey <= todayKey).length;
      if (recent > 0) etaKey = addDays(todayKey, Math.ceil(left / (recent / windowDays)));
    }
  }
  return { goal, done, left, pct: Math.min(100, Math.round((100 * done) / goal)), reached: done >= goal, etaKey };
}

/** Réponses de l'axe entre deux jours inclus (fromKey null : depuis le début) : k réussites sur n. */
function countBetween(sessions, axis, fromKey, toKey) {
  const { positive } = AXES[axis];
  const vals = sessions
    .filter((s) => (fromKey == null || s.dateKey >= fromKey) && s.dateKey <= toKey)
    .flatMap((s) => answers(s, axis));
  return { k: vals.filter((v) => positive.includes(v)).length, n: vals.length };
}

/**
 * Taux des 28 derniers jours, en fréquence naturelle « environ X sur 10 (entre a et b) » (Wilson à 95 %).
 * total : toutes les réponses de l'axe jusqu'à aujourd'hui. Aucune comparaison ici : voir rateTrend.
 */
export function axisSummary(sessions, axis, todayKey) {
  const { k, n } = countBetween(sessions, axis, addDays(todayKey, -27), todayKey);
  return { n, k, freq: naturalFrequency(k, n), total: countBetween(sessions, axis, null, todayKey).n };
}

/** Un contrôle : P(taux des 28 jours finissant à refKey > taux des 28 jours d'avant). null sous 8 réponses d'un côté. */
export function trendCheck(sessions, axis, refKey) {
  const recent = countBetween(sessions, axis, addDays(refKey, -27), refKey);
  const before = countBetween(sessions, axis, addDays(refKey, -55), addDays(refKey, -28));
  if (recent.n < TREND_MIN_ANSWERS || before.n < TREND_MIN_ANSWERS) return null;
  return probGreater(recent.k, recent.n, before.k, before.n);
}

/** Premier jour où l'axe a une réponse (jusqu'à toKey), ou null. */
function firstAnswerKey(sessions, axis, toKey) {
  return sessions
    .filter((s) => s.dateKey <= toKey && answers(s, axis).length)
    .map((s) => s.dateKey)
    .sort()[0] ?? null;
}

/**
 * État d'un taux : 'calibrage' (moins de 8 réponses au total), 'probable' ou 'tot' (trop tôt pour trancher).
 * Les contrôles ont lieu les dimanches, depuis sinceKey (le dernier bilan ; d'ici la phase 5, la première
 * réponse de l'axe). 'probable' dès que 3 dimanches de suite donnent P ≥ 0,90, puis l'état est MAINTENU
 * jusqu'au bilan suivant : il ne s'éteint jamais entre deux bilans. Aucune baisse n'existe ici.
 */
export function rateTrend(sessions, axis, todayKey, { sinceKey = null } = {}) {
  if (countBetween(sessions, axis, null, todayKey).n < TREND_MIN_ANSWERS) return 'calibrage';
  const fromKey = sinceKey ?? firstAnswerKey(sessions, axis, todayKey);
  let run = 0;
  for (let sunday = sundayOnOrBefore(addDays(fromKey, 6)); sunday <= todayKey; sunday = addDays(sunday, 7)) {
    run = (trendCheck(sessions, axis, sunday) ?? 0) >= TREND_MIN_PROB ? run + 1 : 0;
    if (run >= TREND_RUN) return 'probable';
  }
  return 'tot';
}

/**
 * Courbe par axe : blocs de 28 jours consécutifs à partir du lundi de la première semaine avec réponses.
 * Seuls les blocs terminés (figés) ayant au moins 8 réponses sont gardés, plus le bloc en cours,
 * « Ces 4 semaines », s'il a lui aussi au moins 8 réponses.
 */
export function monthlyBlocks(sessions, axis, todayKey) {
  const first = firstAnswerKey(sessions, axis, todayKey);
  if (!first) return [];
  const out = [];
  for (let fromKey = weekOf(first), i = 1; fromKey <= todayKey; fromKey = addDays(fromKey, BLOCK_DAYS), i++) {
    const toKey = addDays(fromKey, BLOCK_DAYS - 1);
    const current = toKey >= todayKey;
    const { k, n } = countBetween(sessions, axis, fromKey, current ? todayKey : toKey);
    if (n < BLOCK_MIN_ANSWERS) continue;
    out.push({ label: current ? 'Ces 4 semaines' : `Mois ${i}`, fromKey, toKey, k, n, freq: naturalFrequency(k, n), current });
  }
  return out;
}

/** Derniers objectifs de RDV saisis, du plus récent au plus ancien, avec leur résultat et leur suite. */
export function recentGoals(sessions, n = 5) {
  return sessions
    .filter((s) => s.type === 'prerdv' && (s.goal ?? '').trim())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, n)
    .map((s) => ({ dateKey: s.dateKey, goal: s.goal.trim(), result: s.goalReached ?? null, suite: s.rdvSuite ?? null }));
}
