import { h } from '../dom.js';
import { longDateFr } from '../../core/dates.js';
import { buildBilanReport } from '../../core/evaluation.js';
import { pickLine } from '../../core/louarn.js';
import { noiseBand } from '../components/chart.js';
import { createBulle } from '../components/fox.js';

/** Une ligne d'axe : l'état et la valeur ; un tap déplie le détail (chiffres, méthode, RCI), jamais imposé. */
function axisRow(a) {
  const detail = h('ul', { class: 'bilan-detail', hidden: true }, a.detail.map((l) => h('li', {}, l)));
  const toggle = h('button', {
    class: 'bilan-axis',
    'aria-expanded': 'false',
    onclick: () => {
      detail.hidden = !detail.hidden;
      toggle.setAttribute('aria-expanded', String(!detail.hidden));
    },
  },
  h('span', { class: 'bilan-axis-label' }, a.label),
  h('span', { class: 'bilan-axis-state' }, a.stateText));
  return h('div', { class: 'bilan-axis-wrap' },
    toggle,
    a.lines.map((l) => h('p', { class: 'small' }, l)),
    a.band ? noiseBand(a.band) : null,
    detail);
}

/**
 * Le rapport d'un bilan sur un écran (M §4.6) : sûr, mesuré, ressenti, une seule action. Aussi le résultat
 * d'un bilan de contrôle. Consultable depuis Progression, « Tes bilans ».
 */
export async function render(root, { repo, content, navigate, params }) {
  const s = await repo.getSession(params[0]);
  if (!s?.bilan) { navigate('/home', { replace: true }); return; }
  const close = h('button', { class: 'btn btn-go', onclick: () => navigate('/home', { replace: true }) }, 'Fermer');
  const back = h('a', { class: 'back', href: '#/progress' }, '‹ Progression');

  if (s.bilan.kind === 'controle') {
    const r = s.bilan.result;
    root.replaceChildren(h('div', { class: 'bilan' },
      back,
      h('h1', {}, 'Bilan de contrôle'),
      h('p', { class: 'muted' }, longDateFr(s.dateKey)),
      h('div', { class: 'card' }, h('p', {}, r?.text ?? 'Contrôle enregistré.'), r?.piste ? h('p', {}, r.piste) : null),
      close));
    return;
  }

  // Un rapport ancien (ou absent, après une restauration) se recalcule depuis les données.
  let report = s.bilan.report;
  if (!report) {
    const [sessions, recordings, measures] = await Promise.all([repo.listSessions(), repo.listRecordings(), repo.listMeasures()]);
    report = buildBilanReport({ session: s, sessions, recordings, measures, todayKey: s.dateKey, lines: content.mesure ?? {} });
  }
  // Louarn : une bulle sobre, seulement s'il a une réplique de bilan (G §2.2) ; sinon il se tait.
  const line = pickLine(content.louarn?.repliques ?? [], { moment: 'bilan', dayKey: s.dateKey });
  const discret = await repo.getMeta('renardDiscret', false);
  const louarn = line && !discret ? createBulle({ texte: line.texte, stage: 'portrait', size: 48 }) : null;

  const procheBtn = report.actionKind === 'proche'
    ? h('a', { class: 'btn-secondary', href: `#/proche/${s.id}` }, 'Commencer l’écoute par un proche')
    : null;
  root.replaceChildren(h('div', { class: 'bilan' },
    back,
    h('h1', {}, report.title),
    h('p', { class: 'muted' }, longDateFr(s.dateKey)),
    louarn,
    h('div', { class: 'card' }, h('p', { class: 'label' }, 'Ce qui est sûr'), h('p', {}, report.sur)),
    h('div', { class: 'card' },
      h('p', { class: 'label' }, 'Ce que la mesure montre'),
      report.axes.map(axisRow),
      h('p', { class: 'muted small' }, 'Zone grise : ta variation normale. Trait : où tu es aujourd’hui. Touche une ligne pour le détail.')),
    report.ressenti.lines.length
      ? h('div', { class: 'card' }, h('p', { class: 'label' }, 'Ce que tu ressens'), report.ressenti.lines.map((l) => h('p', { class: 'small' }, l)))
      : null,
    report.realisme ? h('div', { class: 'card' }, h('p', { class: 'label' }, 'À savoir'), h('p', {}, report.realisme)) : null,
    h('div', { class: 'card' }, h('p', { class: 'label' }, 'La suite, une seule chose'), h('p', {}, report.action), procheBtn),
    close));
}
