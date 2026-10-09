import { h } from '../dom.js';
import { RDV_QUESTIONS, DONT_KNOW, rdvQuestionIds, nextRdvQuestion, answerRdv, skipRdv } from '../../core/rdv.js';

const NOTED_MS = 700;
/** Après « Passer », la question suivante ignore les taps un court instant (double tap). */
const SKIP_GUARD_MS = 300;

/**
 * Retour après un RDV : une question à la fois, « Je ne sais pas » (sauf au filtre) et « Passer »
 * toujours là, seulement « Noté. » après une réponse (eval-rdv.md §1.3). onDone : plus aucune question.
 */
export function createRdvCard({ session, repo, onDone }) {
  let s = session;
  let timer = null;
  let busy = false;
  let destroyed = false;
  const el = h('div', { class: 'card rdv-card', 'aria-live': 'polite' });

  /** change : séance → séance. On repart de la version stockée, que le bouton de sortie a pu modifier. */
  async function apply(change, noted) {
    if (busy || destroyed) return;
    busy = true;
    try {
      const fresh = (await repo.getSession(s.id)) ?? s;
      if (destroyed) return;
      s = change(fresh);
      await repo.saveSession(s);
    } catch (e) {
      console.error(e);
    }
    if (destroyed) return;
    if (noted) el.replaceChildren(h('p', { class: 'noted' }, 'Noté.'));
    else show();
    timer = setTimeout(() => {
      if (destroyed) return;
      busy = false;
      if (noted) show();
    }, noted ? NOTED_MS : SKIP_GUARD_MS);
  }

  function show() {
    const id = nextRdvQuestion(s);
    if (!id) {
      el.remove();
      if (!destroyed) onDone?.();
      return;
    }
    const q = RDV_QUESTIONS[id];
    const ids = rdvQuestionIds(s);
    // Ancien flux (« répéter » déjà répondu, sans filtre) : pas de numéro, il ne reste que l'objectif.
    const pos = ids.includes(id) && !(s.rdvProspect == null && !s.rdvProspectSkipped && s.feedback != null)
      ? `, question ${ids.indexOf(id) + 1} sur ${ids.length}` : '';
    const options = q.dontKnow === false ? q.options : [...q.options, DONT_KNOW];
    // replaceChildren écrirait « null » en texte : on filtre les nœuds absents.
    el.replaceChildren(...[
      h('p', { class: 'muted small' }, `Ton dernier rendez-vous${pos}`),
      id === 'objectif' ? h('p', { class: 'why' }, `« ${s.goal.trim()} »`) : null,
      h('p', { class: 'rdv-q' }, q.text),
      h('div', { class: 'answers' }, options.map((o) => h('button', {
        class: 'btn-answer',
        onclick: () => apply((cur) => answerRdv(cur, id, o.value, Date.now()), true),
      }, h('span', {}, o.label), o.hint ? h('small', {}, o.hint) : null))),
      h('button', { class: 'btn-link', onclick: () => apply((cur) => skipRdv(cur, id), false) }, 'Passer'),
    ].filter(Boolean));
  }

  show();
  return { el, destroy: () => { destroyed = true; clearTimeout(timer); } };
}
