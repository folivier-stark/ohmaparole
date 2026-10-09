import { addDays, diffDays } from './dates.js';
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
 */
export const AXES = {
  diction: { source: 'ratings', values: ['clair', 'moyen', 'brouillon'], positive: ['clair'] },
  ecoute: { source: 'ratings', values: ['oui', 'non'], positive: ['oui'] },
  posture: { source: 'ratings', values: ['pose', 'unpeu', 'pasencore'], positive: ['pose'] },
  rdv: { source: 'feedback', values: ['non', 'une', 'plusieurs', 'nsp'], positive: ['non'] },
  objectif: { source: 'goalReached', values: ['oui', 'partie', 'non', 'nsp'], positive: ['oui'] },
};

/** Règle de tendance (eval-methodologie.md §2.6) : P ≥ 0,90, deux semaines de suite, au moins 8 réponses de chaque côté. */
export const TREND_MIN_ANSWERS = 8;
export const TREND_MIN_PROB = 0.9;

const isDailyCounted = (s) => s.counted === true && (s.type === 'daily' || s.type === 'comeback');

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

/**
 * État d'un taux : 'calibrage' (moins de 8 réponses au total), 'probable' (contrôle de la semaine courante
 * ET de la précédente à P ≥ 0,90) ou 'tot' (trop tôt pour trancher). Aucune baisse n'existe ici.
 */
export function rateTrend(sessions, axis, todayKey) {
  if (countBetween(sessions, axis, null, todayKey).n < TREND_MIN_ANSWERS) return 'calibrage';
  const passes = (refKey) => (trendCheck(sessions, axis, refKey) ?? 0) >= TREND_MIN_PROB;
  return passes(todayKey) && passes(addDays(todayKey, -7)) ? 'probable' : 'tot';
}

/** Derniers objectifs de RDV saisis, du plus récent au plus ancien, avec leur résultat et leur suite. */
export function recentGoals(sessions, n = 5) {
  return sessions
    .filter((s) => s.type === 'prerdv' && (s.goal ?? '').trim())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, n)
    .map((s) => ({ dateKey: s.dateKey, goal: s.goal.trim(), result: s.goalReached ?? null, suite: s.rdvSuite ?? null }));
}
