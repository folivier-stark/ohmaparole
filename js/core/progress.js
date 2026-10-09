import { diffDays, daysInMonth, weekdayMon0, monthKeyPrefix } from './dates.js';

const DAILY_TYPES = ['daily', 'comeback'];
const HOUR = 3600000;
const DAY = 24 * HOUR;
const isCountedSession = (s) => s.counted === true;
const byStartDesc = (a, b) => b.startedAt - a.startedAt;
const pad = (n) => String(n).padStart(2, '0');

export function practicedDayKeys(sessions) {
  return new Set(sessions.filter(isCountedSession).map((s) => s.dateKey));
}

export function dailyCount(sessions) {
  return sessions.filter((s) => isCountedSession(s) && DAILY_TYPES.includes(s.type)).length;
}

export function totalCount(sessions) {
  return sessions.filter(isCountedSession).length;
}

export function monthCount(sessions, year, month) {
  const prefix = monthKeyPrefix(year, month);
  return [...practicedDayKeys(sessions)].filter((k) => k.startsWith(prefix)).length;
}

export function monthGrid(sessions, year, month, todayKey) {
  const counted = sessions.filter(isCountedSession);
  const cells = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const dateKey = `${year}-${pad(month)}-${pad(d)}`;
    const ofDay = counted.filter((s) => s.dateKey === dateKey);
    let kind = 'none';
    if (ofDay.some((s) => DAILY_TYPES.includes(s.type))) kind = 'session';
    else if (ofDay.length) kind = 'rdv';
    else if (dateKey > todayKey) kind = 'future';
    cells.push({ dateKey, day: d, kind, today: dateKey === todayKey });
  }
  return { leading: weekdayMon0(`${year}-${pad(month)}-01`), cells };
}

const FIRST_MILESTONES = [1, 7, 14, 30];

export function milestonesUpTo(n) {
  const out = FIRST_MILESTONES.filter((m) => m <= n);
  for (let m = 60; m <= n; m += 30) out.push(m);
  return out;
}

export function nextMilestone(n) {
  const first = FIRST_MILESTONES.find((m) => m > n);
  return first ?? (Math.floor(n / 30) + 1) * 30;
}

/** Jalon à enregistrer à la séance n : le plus récent atteint, seulement s'il manque. */
export function dueMilestone(nextSessionNumber, recordedMilestones) {
  const m = milestonesUpTo(nextSessionNumber).at(-1);
  return m && !recordedMilestones.includes(m) ? m : null;
}

export function referenceMilestones(recordings) {
  return recordings.filter((r) => r.kind === 'reference' && r.milestone != null).map((r) => r.milestone);
}

export function homeStatus(sessions, todayKey) {
  const keys = [...practicedDayKeys(sessions)].sort();
  const doneToday = keys.includes(todayKey);
  const last = keys.filter((k) => k < todayKey).at(-1) ?? null;
  const daysWithout = doneToday ? 0 : last ? diffDays(last, todayKey) - 1 : null;
  return {
    doneToday,
    daysWithout,
    comeback: daysWithout !== null && daysWithout >= 3,
    yesterdayOff: daysWithout !== null && daysWithout >= 1 && daysWithout < 3,
  };
}

export function pendingFeedback(sessions, now) {
  return sessions
    // Un RDV écourté reste un vrai RDV : 30 s de pratique suffisent pour demander le retour.
    .filter((s) => s.type === 'prerdv' && (s.practicedSec ?? 0) >= 30 && s.feedback == null && !s.feedbackSkipped
      && now - s.endedAt >= HOUR && now - s.endedAt <= 3 * DAY)
    .sort((a, b) => b.endedAt - a.endedAt)[0] ?? null;
}

export function recentFeedback(sessions, n = 6) {
  return sessions
    .filter((s) => s.type === 'prerdv' && s.feedback)
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-n)
    .map((s) => s.feedback);
}

export function historyIds(sessions) {
  return [...sessions].sort(byStartDesc).flatMap((s) => s.itemIds ?? []);
}

export function lastBloc3(sessions) {
  return [...sessions].sort(byStartDesc).find((s) => isCountedSession(s) && s.bloc3)?.bloc3 ?? null;
}

export function lastConsigneId(sessions) {
  return [...sessions].sort(byStartDesc).find((s) => s.type === 'prerdv' && s.consigneId)?.consigneId ?? null;
}

export function backupDue(lastBackupAt, now, total) {
  return total >= 3 && (lastBackupAt == null || now - lastBackupAt > 14 * DAY);
}

export function whyCheckDue(total, lastWhyCheckTotal = 0) {
  return total >= 7 && total - lastWhyCheckTotal >= 7;
}
