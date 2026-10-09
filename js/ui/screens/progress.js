import { h } from '../dom.js';
import { dayKey, longDateFr, MONTHS_FR } from '../../core/dates.js';
import { monthCount, totalCount, dailyCount, monthGrid, milestonesUpTo, nextMilestone } from '../../core/progress.js';
import { programGoal, cumulativeSeries, goalProgress, axisSummary, rateTrend, recentGoals, TREND_MIN_ANSWERS } from '../../core/dashboard.js';
import { RDV_QUESTIONS, DONT_KNOW, rdvBoard } from '../../core/rdv.js';
import { BLOCKS, plural, trendText } from '../../core/texts.js';
import { createCompare } from '../components/compare.js';
import { cumulativeChart, shortDayMonth } from '../components/chart.js';

const AXIS_CARDS = [
  { key: 'diction', title: 'Diction et élocution', tagline: BLOCKS.articulation.tagline, measure: 'prises « Clair »', voice: true, kind: 'Ton ressenti.', empty: 'Réponds à « Ta prise ? » à la fin de l’articulation.' },
  { key: 'ecoute', title: 'Écoute', tagline: BLOCKS.ecoute.tagline, measure: 'détails cachés repérés', kind: 'Ton ressenti.', empty: 'Réponds à « Repéré ? » après chaque écoute.' },
  { key: 'posture', title: 'Posture et présence', tagline: BLOCKS.posture.tagline, measure: 'séances où tu t’es senti posé', kind: 'Ton ressenti.', empty: 'Réponds à « Tu t’es senti posé ? » à la fin du bloc posture.' },
];
const RESULT = { oui: 'Atteint', partie: 'En partie', non: 'Pas cette fois', nsp: 'Je ne sais pas' };
const SUITE = Object.fromEntries([...RDV_QUESTIONS.suite.options, DONT_KNOW].map((o) => [o.value, o.label]));

/** « Environ 6 sur 10 prises « Clair » (entre 4 et 8) » : jamais de pourcentage, toujours la fourchette. */
const freqLine = (freq, measure) => h('p', {},
  h('strong', {}, `Environ ${freq.approx} sur 10`), ` ${measure} (entre ${freq.low} et ${freq.high})`);

function axisCard(sessions, today, a) {
  const sum = axisSummary(sessions, a.key, today);
  const state = rateTrend(sessions, a.key, today);
  return h('div', { class: 'card axis' },
    h('h3', {}, a.title),
    h('p', { class: 'muted small' }, a.tagline),
    sum.total
      ? [
        sum.freq ? freqLine(sum.freq, a.measure) : h('p', {}, 'Pas de réponse ces 4 dernières semaines.'),
        h('p', { class: 'trend' }, trendText(state, { voice: a.voice, missing: TREND_MIN_ANSWERS - sum.total })),
        h('p', { class: 'muted small' }, sum.n ? `Sur 4 semaines, ${plural(sum.n, 'réponse')}. ${a.kind}` : a.kind),
      ]
      : h('p', { class: 'muted' }, a.empty));
}

/** Une ligne « En rendez-vous » (eval-rdv.md §5.2) : x sur y, mois 1 à côté des 4 dernières semaines, sans flèche. */
function rdvLine(l, extra) {
  const source = l.measured ? `${l.source} · durée mesurée ${l.measured} fois` : l.source;
  const few = l.month1.n < 10 || (l.separate && l.recent.n < 10);
  return h('div', { class: 'rdv-line' },
    h('p', { class: 'rdv-label' }, l.label, h('span', { class: 'src' }, source)),
    l.month1.n
      ? [
        h('p', {}, `Mois 1 : ${l.month1.k} sur ${l.month1.n}`,
          l.separate ? ` · Ces 4 semaines : ${l.recent.n ? `${l.recent.k} sur ${l.recent.n}` : 'aucune réponse'}` : ''),
        few ? h('p', { class: 'muted small' }, 'sur peu de RDV') : null,
        extra,
      ]
      : h('p', { class: 'muted small' }, 'Pas encore de réponse.'));
}

function rdvCard(sessions, today) {
  const lines = rdvBoard(sessions, today);
  const goals = recentGoals(sessions, 5);
  // L'indicateur principal de l'axe (eval-methodologie.md §1.3) porte l'état de tendance.
  const trend = h('p', { class: 'trend' }, trendText(rateTrend(sessions, 'rdv', today),
    { missing: TREND_MIN_ANSWERS - axisSummary(sessions, 'rdv', today).total }));
  const started = lines.some((l) => l.month1.n);
  return h('div', { class: 'card axis' },
    h('h3', {}, 'En rendez-vous'),
    h('p', { class: 'muted small' }, 'Ce qui se passe en vrai, face à tes clients.'),
    started
      ? [
        lines.map((l) => rdvLine(l, l.key === 'repeter' ? trend : null)),
        lines.some((l) => l.month1.n && !l.separate)
          ? h('p', { class: 'muted small' }, 'Les 4 dernières semaines s’afficheront à côté, une fois ton mois 1 passé.')
          : null,
      ]
      : h('p', { class: 'muted' }, 'Lance « Avant un rendez-vous » avant ton prochain RDV, puis touche « Je sors du RDV » en sortant.'),
    h('h3', { class: 'sub' }, 'Tes derniers objectifs de RDV'),
    goals.length
      ? h('ul', { class: 'goals' }, goals.map((x) => h('li', {},
        h('span', { class: 'muted small' }, shortDayMonth(x.dateKey)), ' ', x.goal,
        h('span', { class: 'src' },
          `${x.result ? RESULT[x.result] : '—'} · La suite : ${x.suite ? SUITE[x.suite] : '—'}`))))
      : h('p', { class: 'muted' }, 'Les objectifs que tu saisis avant un RDV apparaîtront ici.'));
}

export async function render(root, { repo, content }) {
  const today = dayKey(Date.now());
  const [y, m] = today.split('-').map(Number);
  const [sessions, recordings] = await Promise.all([repo.listSessions(), repo.listRecordings()]);
  const daily = dailyCount(sessions);
  const total = totalCount(sessions);
  const monthDays = monthCount(sessions, y, m);
  const grid = monthGrid(sessions, y, m, today);
  const cleanups = [];

  // Objectif 60 séances + courbe du cumul
  const g = goalProgress(sessions, today, programGoal(content.program));
  const series = cumulativeSeries(sessions, today);
  const goalCard = h('div', { class: 'card' },
    h('h2', {}, `Objectif ${g.goal} séances`),
    h('p', { class: 'goal-num' }, `${g.done} / ${g.goal}`),
    h('div', { class: 'goal-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': g.goal, 'aria-valuenow': Math.min(g.done, g.goal) },
      h('div', { class: 'goal-fill', style: `width:${g.pct}%` })),
    h('p', {}, g.reached
      ? 'Objectif atteint ! Prochaine étape : l’anglais.'
      : `Encore ${plural(g.left, 'séance')}. À ${g.goal}, l’anglais et l’espagnol se débloquent.`),
    g.etaKey
      ? h('p', { class: 'muted' }, `Arrivée estimée : ${longDateFr(g.etaKey)}, à ton rythme actuel.`)
      : g.reached ? null : h('p', { class: 'muted' }, 'La date estimée apparaît après une semaine de pratique.'),
    series.length ? cumulativeChart(series, g.goal) : null);

  // Axes de progrès
  const axisCards = [...AXIS_CARDS.map((a) => axisCard(sessions, today, a)), rdvCard(sessions, today)];

  // Calendrier du mois
  const cal = h('div', { class: 'cal' },
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => h('span', { class: 'cal-head' }, d)),
    Array.from({ length: grid.leading }, () => h('span')),
    grid.cells.map((c) => h('span', { class: `cal-cell ${c.kind}${c.today ? ' today' : ''}` }, String(c.day))));

  // Ta voix (jalons + A/B)
  const refs = recordings.filter((r) => r.kind === 'reference');
  const j1 = refs.find((r) => r.milestone === 1);
  const base = Math.max(daily, 1);
  const upcoming = nextMilestone(base);
  const voice = h('div', { class: 'card' },
    h('h2', {}, 'Ta voix'),
    h('ol', { class: 'frise' },
      milestonesUpTo(base).map((mm) => h('li', { class: refs.some((r) => r.milestone === mm) ? 'done' : '' }, `J${mm}`)),
      h('li', { class: 'upcoming' }, `J${upcoming}`)),
    h('p', { class: 'muted' }, `Prochain jalon dans ${plural(upcoming - daily, 'séance')}.`));
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

  root.replaceChildren(h('div', { class: 'progress' },
    h('a', { class: 'back', href: '#/home' }, '‹ Accueil'),
    h('p', { class: 'big-count' }, String(monthDays)),
    h('p', {}, `${monthDays > 1 ? 'jours pratiqués' : 'jour pratiqué'} en ${MONTHS_FR[m - 1]}`),
    h('p', { class: 'muted' }, `${plural(total, 'séance')} depuis le début`),
    goalCard,
    h('h2', { class: 'section-title' }, 'Tes axes de progrès'),
    axisCards,
    h('h2', { class: 'section-title' }, 'Ce mois-ci'),
    cal,
    voice));
  return () => cleanups.forEach((f) => f());
}
