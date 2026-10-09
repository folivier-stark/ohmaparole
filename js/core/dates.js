const pad = (n) => String(n).padStart(2, '0');

export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Clé de jour LOCALE "YYYY-MM-DD" (jamais toISOString, qui est en UTC). */
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function keyToUTC(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Nombre de jours de a vers b (b - a). */
export function diffDays(a, b) {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / 86400000);
}

export function addDays(key, n) {
  const t = new Date(keyToUTC(key) + n * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** month : 1 à 12 */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function weekdayMon0(key) {
  return (new Date(keyToUTC(key)).getUTCDay() + 6) % 7;
}

/** Le dimanche de ce jour, ou le dimanche qui le précède (jour des contrôles de tendance). */
export function sundayOnOrBefore(key) {
  return addDays(key, -((weekdayMon0(key) + 1) % 7));
}

export function monthKeyPrefix(year, month) {
  return `${year}-${pad(month)}-`;
}

/** « 29 novembre 2026 » */
export function longDateFr(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}
