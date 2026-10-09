import { h } from '../dom.js';
import { dayKey, longDateFr, MONTHS_FR } from '../../core/dates.js';
import { monthCount, totalCount, dailyCount, monthGrid } from '../../core/progress.js';
import { voiceTimeline, abPair, calibrationRemaining, sessionsUntilControl, CALIBRATION_SESSIONS } from '../../core/voice-plan.js';
import { programGoal, cumulativeSeries, goalProgress, axisSummary, rateTrend, monthlyBlocks, recentGoals, TREND_MIN_ANSWERS } from '../../core/dashboard.js';
import { RDV_QUESTIONS, DONT_KNOW, rdvBoard } from '../../core/rdv.js';
import { BLOCKS, plural, trendText, frequencyText } from '../../core/texts.js';
import { createCompare } from '../components/compare.js';
import { cumulativeChart, monthlyPoints, shortDayMonth, noiseBand } from '../components/chart.js';
import { voiceReport, voiceSummary } from '../../core/voice-report.js';
import { postureSupportLine } from '../../core/live-silence.js';
import { pointSummary } from '../../core/weekly-point.js';
import { bilansDone, lastBilanKey, BILAN_EVERY } from '../../core/bilan-plan.js';
import { souvenirs } from '../../core/louarn.js';
import { createParcours } from '../components/parcours.js';

const AXIS_CARDS = [
  { key: 'diction', title: 'Diction et élocution', tagline: BLOCKS.articulation.tagline, measure: 'Prises « Clair »', kind: 'Ton ressenti.', empty: 'Réponds à « Ta prise ? » à la fin de l’articulation.' },
  { key: 'ecoute', title: 'Écoute', tagline: BLOCKS.ecoute.tagline, measure: 'Détails cachés repérés', kind: 'Ton ressenti.', empty: 'Réponds à « Repéré ? » après chaque écoute.' },
  { key: 'posture', title: 'Posture et présence', tagline: BLOCKS.posture.tagline, measure: 'Séances où tu t’es senti posé', kind: 'Ton ressenti.', empty: 'Réponds à « Tu t’es senti posé ? » à la fin du bloc posture.' },
];
const RESULT = { oui: 'Atteint', partie: 'En partie', non: 'Pas cette fois', nsp: 'Je ne sais pas' };
const SUITE = Object.fromEntries([...RDV_QUESTIONS.suite.options, DONT_KNOW].map((o) => [o.value, o.label]));

/** « Prises « Clair » : environ 6 sur 10 (entre 4 et 8) » : jamais de pourcentage, toujours la fourchette. */
const freqLine = (freq, measure) => h('p', {}, `${measure} : `, h('strong', {}, frequencyText(freq)));

/**
 * Diction mesurée (spec V2 §4, eval-diction.md §4) : au-dessus du taux « Clair », qui reste. Uniquement les
 * phrases de voiceSummary et la bande grise : jamais de score, de « bredouillement » ni d'« intelligible ».
 */
function voiceSection(measures, untilControl) {
  const sum = voiceSummary(voiceReport(measures), { untilControl });
  const band = (metric) => {
    const b = sum.bands.find((x) => x.metric === metric);
    return b ? noiseBand(b) : null;
  };
  const isPause = (l) => l.startsWith('Tu t’arrêtes');
  return [h('div', { class: 'voice-measure' },
    h('p', { class: 'label' }, 'Ta voix mesurée'),
    h('p', { class: 'trend' }, sum.headline),
    sum.verdict ? h('p', {}, sum.verdict) : null,
    band('debit'),
    sum.lines.map((l) => [h('p', {}, l), isPause(l) ? band('pausePct') : null]),
    h('p', { class: 'muted small' }, sum.state === 'calibrage'
      ? 'Une mesure, c’est 3 lectures du texte de référence au début d’une séance, sur 3 jours différents.'
      : 'Mesuré sur ton téléphone, à partir de tes lectures du texte de référence. Zone grise : ta variation normale.')),
  h('p', { class: 'label' }, 'Ton ressenti')];
}

/** Posture : ligne de soutien mesurée au micro, sous le ressenti « Posé », qui reste l'indicateur du jour. */
function postureBottom(measures) {
  const line = postureSupportLine(measures);
  return line ? [h('p', { class: 'label' }, 'Mesuré au micro'), h('p', {}, line), h('p', { class: 'muted small' }, 'Le signal vient à la durée de la consigne : plus long n’est pas mieux.')] : null;
}

/** « Tes bilans » : le rapport de chaque bilan (figé au bilan), et ses contrôles. */
function bilansCard(sessions) {
  const list = [...bilansDone(sessions), ...bilansDone(sessions, 'controle')].sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
  return h('div', { class: 'card axis' },
    h('h3', {}, 'Tes bilans'),
    list.length
      ? h('ul', { class: 'goals' }, list.map((b) => h('li', {}, h('a', { href: `#/bilan/${b.id}` },
        b.bilan.kind === 'controle' ? `Bilan de contrôle · ${shortDayMonth(b.dateKey)}` : `Bilan · séance ${b.sessionNumber} · ${shortDayMonth(b.dateKey)}`))))
      : h('p', { class: 'muted' }, `Ton premier bilan arrive à la séance ${BILAN_EVERY}. Il remplace la séance du jour, 10 minutes.`));
}

/** « Ton point de la semaine » (spec V2 §6) : comptes bruts, environ, aucune baisse dite. */
function pointCard(sessions, measures) {
  const s = pointSummary({ sessions, measures });
  return h('div', { class: 'card axis' },
    h('h3', {}, 'Ton point de la semaine'),
    h('p', { class: 'muted small' }, 'Toutes les 4 séances, à la place du bloc 3.'),
    s.lines.length
      ? s.lines.map((l) => h('p', {}, l))
      : h('p', { class: 'muted' }, 'Ton premier point arrive à la fin du thème, toutes les 4 séances.'));
}

function axisCard(sessions, today, a, top = null, bottom = null) {
  const sum = axisSummary(sessions, a.key, today);
  // La tendance repart du dernier bilan (spec V2 §3 et §7).
  const state = rateTrend(sessions, a.key, today, { sinceKey: lastBilanKey(sessions) });
  const blocks = monthlyBlocks(sessions, a.key, today);
  return h('div', { class: 'card axis' },
    h('h3', {}, a.title),
    h('p', { class: 'muted small' }, a.tagline),
    top,
    sum.total
      ? [
        sum.freq ? freqLine(sum.freq, a.measure) : h('p', {}, 'Pas de réponse ces 4 dernières semaines.'),
        h('p', { class: 'trend' }, trendText(state, { missing: TREND_MIN_ANSWERS - sum.total })),
        blocks.length ? monthlyPoints(blocks) : null,
        h('p', { class: 'muted small' }, sum.n ? `Sur 4 semaines, ${plural(sum.n, 'réponse')}. ${a.kind}` : a.kind),
      ]
      : h('p', { class: 'muted' }, a.empty),
    bottom);
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
  const trend = h('p', { class: 'trend' }, trendText(rateTrend(sessions, 'rdv', today, { sinceKey: lastBilanKey(sessions) }),
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
  const [sessions, recordings, measures] = await Promise.all([repo.listSessions(), repo.listRecordings(), repo.listMeasures()]);
  const daily = dailyCount(sessions);
  const total = totalCount(sessions);
  const monthDays = monthCount(sessions, y, m);
  const grid = monthGrid(sessions, y, m, today);
  const cleanups = [];

  // Le Parcours en tête (G §4.2, maquette §5.2) : Louarn, le sentier de 18 pierres, les souvenirs obtenus.
  const parcours = createParcours({
    dailyCount: daily, program: content.program, souvenirs: souvenirs(sessions, recordings), lines: content.louarn?.repliques ?? null,
  });

  // Objectif 72 séances : le sentier remplace la barre, et dit déjà « x séances sur 72 » et « À 72… » (G §4.2).
  // La date estimée et la courbe du cumul restent, sans changement.
  const g = goalProgress(sessions, today, programGoal(content.program));
  const series = cumulativeSeries(sessions, today);
  const goalCard = h('div', { class: 'card' },
    h('h2', {}, `Objectif ${g.goal} séances`),
    g.reached ? h('p', {}, 'Objectif atteint ! Prochaine étape : l’anglais.') : null,
    g.etaKey
      ? h('p', { class: 'muted' }, `Arrivée estimée : ${longDateFr(g.etaKey)}, à ton rythme actuel.`)
      : g.reached ? null : h('p', { class: 'muted' }, 'La date estimée apparaît après une semaine de pratique.'),
    series.length ? cumulativeChart(series, g.goal) : null);

  // Axes de progrès
  const voiceTop = voiceSection(measures, sessionsUntilControl(recordings, daily));
  const axisCards = [
    ...AXIS_CARDS.map((a) => axisCard(sessions, today, a, a.key === 'diction' ? voiceTop : null, a.key === 'posture' ? postureBottom(measures) : null)),
    rdvCard(sessions, today),
    pointCard(sessions, measures),
    bilansCard(sessions),
  ];

  // Calendrier du mois
  const cal = h('div', { class: 'cal' },
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => h('span', { class: 'cal-head' }, d)),
    Array.from({ length: grid.leading }, () => h('span')),
    grid.cells.map((c) => h('span', { class: `cal-cell ${c.kind}${c.today ? ' today' : ''}` }, String(c.day))));

  // Ta voix : les lectures du texte de référence (références V1, mesures de départ, contrôles) et l'A/B.
  const timeline = voiceTimeline(recordings);
  const remaining = calibrationRemaining(recordings);
  const until = sessionsUntilControl(recordings, daily);
  const controls = timeline.filter((o) => o.kind === 'controle').length;
  const upcoming = remaining > 0 ? `Départ ${CALIBRATION_SESSIONS - remaining + 1}` : `Contrôle ${controls + 1}`;
  let next;
  if (remaining > 1) next = `Mesures de départ : encore ${remaining}, une par séance.`;
  else if (remaining === 1) next = 'Dernière mesure de départ à ta prochaine séance.';
  else next = until === 1 ? 'Prochain contrôle à ta prochaine séance.' : `Prochain contrôle dans ${plural(until, 'séance')}.`;
  const voice = h('div', { class: 'card' },
    h('h2', {}, 'Ta voix'),
    h('ol', { class: 'frise' },
      timeline.map((o) => h('li', { class: 'done' }, o.label)),
      h('li', { class: 'upcoming' }, upcoming)),
    h('p', { class: 'muted' }, next));
  // A/B à l'aveugle : le premier enregistrement de référence contre le plus récent (V1, départ ou contrôle).
  const pair = abPair(recordings);
  if (pair) {
    const btn = h('button', {
      class: 'btn-secondary',
      onclick: async () => {
        btn.remove();
        const cmp = await createCompare({ repo, a: pair.a, b: pair.b, labelA: pair.labelA, labelB: pair.labelB });
        if (cmp) { voice.append(cmp.el); cleanups.push(cmp.destroy); }
      },
    }, `Comparer ${pair.labelA} et ${pair.labelB}`);
    voice.append(btn);
  }

  root.replaceChildren(h('div', { class: 'progress' },
    h('a', { class: 'back', href: '#/home' }, '‹ Accueil'),
    parcours,
    goalCard,
    h('p', { class: 'big-count' }, String(monthDays)),
    h('p', {}, `${monthDays > 1 ? 'jours pratiqués' : 'jour pratiqué'} en ${MONTHS_FR[m - 1]}`),
    h('p', { class: 'muted' }, `${plural(total, 'séance')} depuis le début`),
    h('h2', { class: 'section-title' }, 'Tes axes de progrès'),
    axisCards,
    h('h2', { class: 'section-title' }, 'Ce mois-ci'),
    cal,
    voice));
  return () => cleanups.forEach((f) => f());
}
