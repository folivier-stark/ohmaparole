import { h } from '../dom.js';

const R = 54;
const C = 2 * Math.PI * R;
const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...children);
  return el;
}

export function createTimer() {
  const arc = svg('circle', { cx: 60, cy: 60, r: R, class: 'ring-fg', 'stroke-dasharray': C, 'stroke-dashoffset': 0 });
  const ring = svg('svg', { viewBox: '0 0 120 120', class: 'ring', 'aria-hidden': 'true' }, svg('circle', { cx: 60, cy: 60, r: R, class: 'ring-bg' }), arc);
  const label = h('div', { class: 'timer-label' }, '0:00');
  return {
    el: h('div', { class: 'timer' }, ring, label),
    update(remainingMs, totalMs) {
      const s = Math.ceil(remainingMs / 1000);
      label.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      arc.setAttribute('stroke-dashoffset', String(C * (1 - (totalMs ? remainingMs / totalMs : 0))));
    },
  };
}
