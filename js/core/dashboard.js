import { addDays, diffDays, weekdayMon0 } from './dates.js';

export const GOAL_SESSIONS = 72;

/** Objectif = un cycle complet du programme (semaines × séances par semaine). */
export function programGoal(program) {
  return program.weeks.length * (program.sessionsPerWeek ?? 5);
}

/**
 * Axes de progrès. source : où lire la réponse dans une séance.
 * values : réponses possibles (jeux distincts pour les axes lus dans `ratings`).
 * positive : réponses qui comptent comme une réussite.
 */
export const AXES = {
  diction: { source: 'ratings', values: ['clair', 'moyen', 'brouillon'], positive: ['clair'] },
  ecoute: { source: 'ratings', values: ['oui', 'non'], positive: ['oui'] },
  posture: { source: 'ratings', values: ['pose', 'unpeu', 'pasencore'], positive: ['pose'] },
  rdv: { source: 'feedback', values: ['non', 'une', 'plusieurs'], positive: ['non'] },
  objectif: { source: 'goalReached', values: ['oui', 'partie', 'non'], positive: ['oui'] },
};

const isDailyCounted = (s) => s.counted === true && (s.type === 'daily' || s.type === 'comeback');
const weekOf = (key) => addDays(key, -weekdayMon0(key));
const rate = (positive, n) => (n ? Math.round((100 * positive) / n) : null);

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

/** Taux de réussite par semaine (lundi) pour un axe, sur les `limit` dernières semaines qui ont des réponses. */
export function weeklyRate(sessions, axis, limit = 8) {
  const { positive } = AXES[axis];
  const weeks = new Map();
  for (const s of sessions) {
    const vals = answers(s, axis);
    if (!vals.length) continue;
    const key = weekOf(s.dateKey);
    const w = weeks.get(key) ?? { weekKey: key, n: 0, positive: 0 };
    w.n += vals.length;
    w.positive += vals.filter((v) => positive.includes(v)).length;
    weeks.set(key, w);
  }
  return [...weeks.values()]
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : 1))
    .slice(-limit)
    .map((w) => ({ ...w, pct: rate(w.positive, w.n) }));
}

function rateBetween(sessions, axis, fromKey, toKey) {
  const { positive } = AXES[axis];
  const vals = sessions.filter((s) => s.dateKey >= fromKey && s.dateKey <= toKey).flatMap((s) => answers(s, axis));
  return { n: vals.length, pct: rate(vals.filter((v) => positive.includes(v)).length, vals.length) };
}

/** Taux sur 28 jours ; « en hausse » si +10 points face aux 28 jours d'avant, avec au moins 3 réponses de chaque côté. */
export function axisSummary(sessions, axis, todayKey) {
  const recent = rateBetween(sessions, axis, addDays(todayKey, -27), todayKey);
  const before = rateBetween(sessions, axis, addDays(todayKey, -55), addDays(todayKey, -28));
  const rising = recent.n >= 3 && before.n >= 3 && recent.pct - before.pct >= 10;
  return { n: recent.n, pct: recent.pct, rising };
}

/** Derniers objectifs de RDV saisis, du plus récent au plus ancien. */
export function recentGoals(sessions, n = 5) {
  return sessions
    .filter((s) => s.type === 'prerdv' && (s.goal ?? '').trim())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, n)
    .map((s) => ({ dateKey: s.dateKey, goal: s.goal.trim(), result: s.goalReached ?? null }));
}
