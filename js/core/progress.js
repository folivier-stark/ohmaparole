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

// Les jalons J1, J7, J14, J30 et J60 de la V1 ne sont plus planifiés : le calendrier des mesures de la
// voix (calibration puis contrôles) est dans voice-plan.js (spec V2 §4).

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

// Le retour après un RDV (anciennement pendingFeedback et pendingGoalCheck) est dans rdv.js.

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
