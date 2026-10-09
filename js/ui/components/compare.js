import { h } from '../dom.js';
import { createPlayer } from '../../audio/player.js';

const secs = (r) => `${Math.round(r.durationMs / 1000)} s`;

/**
 * Écoute A/B à l'aveugle de deux lectures du MÊME texte. Retourne null si un audio manque.
 * onChoice(rec) : la prise choisie (a ou b), une fois révélée.
 */
export async function createCompare({ repo, a, b, labelA, labelB, onChoice = null }) {
  const [blobA, blobB] = await Promise.all([repo.getAudio(a.id), repo.getAudio(b.id)]);
  if (!blobA || !blobB) return null;
  const flip = Math.random() < 0.5;
  const one = { rec: a, blob: blobA, label: labelA };
  const two = { rec: b, blob: blobB, label: labelB };
  const [first, second] = flip ? [two, one] : [one, two];
  const player = createPlayer();
  const result = h('p', { class: 'reveal' });
  const choices = h('div', { class: 'row' },
    h('button', { class: 'btn-small', onclick: () => reveal(first) }, 'A'),
    h('button', { class: 'btn-small', onclick: () => reveal(second) }, 'B'));
  function reveal(chosen) {
    choices.remove();
    result.textContent = `A = ${first.label} (${secs(first.rec)}) · B = ${second.label} (${secs(second.rec)}). Tu as choisi ${chosen.label}.`;
    onChoice?.(chosen.rec);
  }
  const el = h('div', { class: 'card' },
    h('p', {}, 'Même texte, deux voix, ordre au hasard.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn-small', onclick: () => player.play(first.blob) }, '▶ Écouter A'),
      h('button', { class: 'btn-small', onclick: () => player.play(second.blob) }, '▶ Écouter B')),
    h('p', {}, 'Laquelle est la plus claire ?'),
    choices,
    result);
  return { el, destroy: () => player.stop() };
}
