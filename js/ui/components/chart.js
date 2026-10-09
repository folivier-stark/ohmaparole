import { frequencyText } from '../../core/texts.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 320;
const PAD = { l: 46, r: 10, t: 14, b: 22 };

function svg(tag, attrs, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...children.flat(Infinity).filter((c) => c != null));
  return el;
}

export const shortDayMonth = (key) => `${Number(key.slice(8))}/${Number(key.slice(5, 7))}`;

/** Courbe du cumul de séances, avec une ligne pointillée d'objectif. points : [{ day, total }] */
export function cumulativeChart(points, goal) {
  const H = 170;
  const last = points.at(-1);
  const maxX = Math.max(last?.day ?? 0, 6);
  const maxY = Math.max(goal, last?.total ?? 0);
  const x = (d) => PAD.l + (d / maxX) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);
  const line = points.map((p) => `${x(p.day).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  return svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Séances cumulées : ${last?.total ?? 0} sur ${goal}` },
    svg('line', { x1: PAD.l, x2: W - PAD.r, y1: y(goal), y2: y(goal), class: 'chart-goal' }),
    svg('text', { x: W - PAD.r, y: y(goal) - 5, 'text-anchor': 'end', class: 'chart-label' }, `Objectif ${goal}`),
    svg('line', { x1: PAD.l, x2: W - PAD.r, y1: y(0), y2: y(0), class: 'chart-axis' }),
    svg('text', { x: PAD.l - 6, y: y(0) + 4, 'text-anchor': 'end', class: 'chart-label' }, '0'),
    points.length > 1 ? svg('polygon', { points: `${x(0)},${y(0)} ${line} ${x(last.day)},${y(0)}`, class: 'chart-area' }) : null,
    points.length > 1 ? svg('polyline', { points: line, class: 'chart-line' }) : null,
    last ? svg('circle', { cx: x(last.day), cy: y(last.total), r: 4.5, class: 'chart-dot' }) : null,
    last ? svg('text', { x: PAD.l, y: H - 6, class: 'chart-label' }, shortDayMonth(points[0].dateKey)) : null,
    last ? svg('text', { x: W - PAD.r, y: H - 6, 'text-anchor': 'end', class: 'chart-label' }, "aujourd'hui") : null);
}

/** Au plus 6 points : le mois 1, repère de départ, puis les 5 derniers blocs. */
const visibleBlocks = (blocks) => (blocks.length <= 6 ? blocks : [blocks[0], ...blocks.slice(-5)]);

/**
 * Courbe par axe : un point par bloc de 28 jours, placé à « environ X sur 10 », avec la fourchette
 * de Wilson en barre verticale grise. Pas de ligne entre les points, pas de flèche, couleur neutre.
 * blocks : monthlyBlocks(). La description lue par le lecteur d'écran reprend « environ X sur 10 ».
 */
export function monthlyPoints(blocks) {
  const H = 160;
  const pad = { ...PAD, t: 26, b: 34 };
  const shown = visibleBlocks(blocks);
  const bw = (W - pad.l - pad.r) / Math.max(shown.length, 1);
  const y = (v) => H - pad.b - (v / 10) * (H - pad.t - pad.b);
  const label = (text, x) => {
    // « Ces 4 semaines » sur deux lignes, pour ne pas chevaucher le bloc voisin.
    const cut = text.length > 7 ? text.lastIndexOf(' ') : -1;
    const lines = cut > 0 ? [text.slice(0, cut), text.slice(cut + 1)] : [text];
    return svg('text', { x, y: H - pad.b + 16, 'text-anchor': 'middle', class: 'chart-label' },
      lines.map((l, i) => svg('tspan', { x, dy: i ? 12 : 0 }, l)));
  };
  return svg('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img',
    'aria-label': shown.map((b) => `${b.label} : ${frequencyText(b.freq)}`).join(' ; '),
  },
  svg('text', { x: pad.l - 6, y: 11, 'text-anchor': 'end', class: 'chart-label' }, 'sur 10'),
  [0, 5, 10].map((v) => [
    svg('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: 'chart-axis' }),
    svg('text', { x: pad.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'chart-label' }, String(v)),
  ]),
  shown.map((b, i) => {
    const cx = pad.l + (i + 0.5) * bw;
    return [
      svg('line', { x1: cx, x2: cx, y1: y(b.freq.high), y2: y(b.freq.low), class: 'chart-range' }),
      svg('circle', { cx, cy: y(b.freq.approx), r: 5, class: 'chart-point' }),
      label(b.label, cx),
    ];
  }));
}
