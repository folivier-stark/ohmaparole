import { addDays } from './dates.js';

const pad = (n) => String(n).padStart(2, '0');

export function alarmLabel(why) {
  const w = (why || '').trim();
  if (!w) return 'OhMaParole 5 min';
  return `OhMaParole 5 min, pour : ${w.length > 40 ? `${w.slice(0, 39)}…` : w}`;
}

/** Lien « ajouter à Google Agenda » d'un événement QUOTIDIEN de 5 min. */
export function calendarUrl({ dateKey, time, why, appUrl }) {
  const [hh, mm] = time.split(':').map(Number);
  const d = dateKey.replaceAll('-', '');
  const endMin = hh * 60 + mm + 5;
  const start = `${d}T${pad(hh)}${pad(mm)}00`;
  const endDay = endMin >= 1440 ? addDays(dateKey, 1).replaceAll('-', '') : d;
  const end = `${endDay}T${pad(Math.floor(endMin / 60) % 24)}${pad(endMin % 60)}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: alarmLabel(why),
    dates: `${start}/${end}`,
    ctz: 'Europe/Paris',
    recur: 'RRULE:FREQ=DAILY',
    details: `${appUrl}#/session/daily`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
