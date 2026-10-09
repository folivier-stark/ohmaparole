import { h } from '../dom.js';
import { variant, FIN, FIN_PARTIELLE, milestoneMessage } from '../../core/texts.js';
import { createPlayer } from '../../audio/player.js';
import { createCompare } from '../components/compare.js';

export async function render(root, { repo, content, navigate, params }) {
  const s = await repo.getSession(params[0]);
  if (!s) { navigate('/home'); return; }
  const recs = await repo.listRecordings();
  const mine = recs.filter((r) => r.sessionId === s.id);
  const cleanups = [];
  const children = [
    h('div', { class: 'dot-fill' }),
    h('p', { class: 'end-msg' }, s.completed ? variant(FIN, s.sessionNumber ?? 0) : FIN_PARTIELLE),
  ];

  const take = mine.at(-1);
  if (take) {
    const player = createPlayer();
    cleanups.push(() => player.stop());
    children.push(h('button', { class: 'btn-secondary', onclick: async () => player.play(await repo.getAudio(take.id)) }, '▶ Réécouter ta prise du jour'));
  }

  const ref = mine.find((r) => r.kind === 'reference');
  if (s.milestone && ref) {
    children.push(h('p', { class: 'milestone' }, milestoneMessage(s.milestone)));
    const j1 = recs.find((r) => r.kind === 'reference' && r.milestone === 1);
    if (s.milestone > 1 && j1) {
      const cmp = await createCompare({ repo, a: j1, b: ref, labelA: 'J1', labelB: `Jalon ${s.milestone}` });
      if (cmp) { children.push(cmp.el); cleanups.push(cmp.destroy); }
    }
  }

  if (s.sessionNumber === 3 && !(await repo.getMeta('clinicalNoteShown', false))) {
    await repo.setMeta('clinicalNoteShown', true);
    children.push(h('div', { class: 'card' }, h('p', { class: 'label' }, 'À savoir'), h('p', {}, content.extras.noteClinique)));
  }

  children.push(h('button', { class: 'btn btn-go', onclick: () => navigate('/home') }, 'Fermer'));
  root.replaceChildren(h('div', { class: 'end' }, children));
  return () => cleanups.forEach((f) => f());
}
