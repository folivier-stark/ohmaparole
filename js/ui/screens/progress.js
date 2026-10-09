import { h } from '../dom.js';
import { dayKey, MONTHS_FR } from '../../core/dates.js';
import {
  monthCount, totalCount, dailyCount, monthGrid, milestonesUpTo, nextMilestone, recentFeedback,
} from '../../core/progress.js';
import { plural } from '../../core/texts.js';
import { createCompare } from '../components/compare.js';

const FB = { non: 'Non', une: 'Une fois', plusieurs: 'Plusieurs fois' };

export async function render(root, { repo }) {
  const today = dayKey(Date.now());
  const [y, m] = today.split('-').map(Number);
  const [sessions, recordings] = await Promise.all([repo.listSessions(), repo.listRecordings()]);
  const daily = dailyCount(sessions);
  const total = totalCount(sessions);
  const grid = monthGrid(sessions, y, m, today);
  const cleanups = [];

  const cal = h('div', { class: 'cal' },
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => h('span', { class: 'cal-head' }, d)),
    Array.from({ length: grid.leading }, () => h('span')),
    grid.cells.map((c) => h('span', { class: `cal-cell ${c.kind}${c.today ? ' today' : ''}` }, String(c.day))));

  const refs = recordings.filter((r) => r.kind === 'reference');
  const j1 = refs.find((r) => r.milestone === 1);
  const base = Math.max(daily, 1);
  const upcoming = nextMilestone(base);
  const left = upcoming - daily;
  const voice = h('div', { class: 'card' },
    h('h2', {}, 'Ta voix'),
    h('ol', { class: 'frise' },
      milestonesUpTo(base).map((mm) => h('li', { class: refs.some((r) => r.milestone === mm) ? 'done' : '' }, `J${mm}`)),
      h('li', { class: 'upcoming' }, `J${upcoming}`)),
    h('p', { class: 'muted' }, `Prochain jalon dans ${plural(left, 'séance')}.`));
  const lastRef = refs.filter((r) => r.milestone > 1).at(-1);
  if (j1 && lastRef) {
    const btn = h('button', {
      class: 'btn-secondary',
      onclick: async () => {
        btn.remove();
        const cmp = await createCompare({ repo, a: j1, b: lastRef, labelA: 'J1', labelB: `J${lastRef.milestone}` });
        if (cmp) { voice.append(cmp.el); cleanups.push(cmp.destroy); }
      },
    }, `Comparer J1 et J${lastRef.milestone}`);
    voice.append(btn);
  } else if (!j1) {
    voice.append(h('p', { class: 'muted' }, 'Ta voix de départ sera enregistrée à ta prochaine séance.'));
  }

  const fb = recentFeedback(sessions, 6);
  const rdv = h('div', { class: 'card' },
    h('h2', {}, 'En rendez-vous'),
    h('p', { class: 'muted' }, 'On t’a fait répéter ?'),
    fb.length
      ? h('ul', { class: 'fb' }, fb.map((v) => h('li', { class: `fb-${v}` }, FB[v])))
      : h('p', { class: 'muted' }, 'Aucun retour pour l’instant. Lance « Avant un rendez-vous » avant ton prochain RDV.'));

  root.replaceChildren(h('div', { class: 'progress' },
    h('a', { class: 'back', href: '#/home' }, '‹ Accueil'),
    h('p', { class: 'big-count' }, String(monthCount(sessions, y, m))),
    h('p', {}, `jours pratiqués en ${MONTHS_FR[m - 1]}`),
    h('p', { class: 'muted' }, `${plural(total, 'séance')} depuis le début`),
    cal, voice, rdv));
  return () => cleanups.forEach((f) => f());
}
