import { h } from '../dom.js';
import { prochePairs, procheScore, buildBilanReport } from '../../core/evaluation.js';
import { bilansDone } from '../../core/bilan-plan.js';
import { createPlayer } from '../../audio/player.js';

const QUESTIONS = [
  ['q1', 'Laquelle on comprend le plus facilement ?'],
  ['q2', 'Laquelle donne le plus envie d’écouter la suite ?'],
];

/**
 * Écoute à l'aveugle par un proche (M §3.4), aux bilans 48 et 72 : Fred tend son téléphone, rien ne sort de
 * l'appareil. Paires du même texte (ancienne et récente), plus une paire leurre jamais signalée au proche.
 * Ordre et côté tirés par une graine, stockée avec le bilan. 2 choix forcés plus « Je ne sais pas ».
 */
export async function render(root, { repo, content, navigate, params }) {
  const s = await repo.getSession(params[0]);
  if (!s?.bilan || s.bilan.kind !== 'bilan') { navigate('/home', { replace: true }); return; }
  const [sessions, recordings] = await Promise.all([repo.listSessions(), repo.listRecordings()]);
  const draft = s.bilan.procheDraft ?? (() => {
    const seed = crypto.randomUUID();
    return { seed, pairs: prochePairs({ recordings, bilans: bilansDone(sessions), current: s, seed }) };
  })();
  if (!s.bilan.procheDraft) await repo.saveSession({ ...s, bilan: { ...s.bilan, procheDraft: draft } });
  const player = createPlayer();
  const answers = {};
  let i = 0;
  const screen = (...nodes) => root.replaceChildren(h('div', { class: 'proche' }, nodes.flat(Infinity).filter(Boolean)));

  if (draft.pairs.filter((p) => !p.leurre).length < 5) {
    screen(
      h('h1', {}, 'Écoute par un proche'),
      h('p', {}, 'Pas assez d’enregistrements comparables pour l’instant : il faut au moins 5 paires.'),
      h('a', { class: 'btn btn-go', href: `#/bilan/${s.id}` }, 'Retour au bilan'));
    return () => player.stop();
  }

  const intro = () => screen(
    h('h1', {}, 'Écoute par un proche'),
    h('p', {}, 'Tends ton téléphone à un proche. Rien ne sort de l’appareil.'),
    h('div', { class: 'card' },
      h('p', { class: 'label' }, 'Pour le proche'),
      h('p', {}, `Tu vas écouter ${draft.pairs.length} paires d’enregistrements de Fred, le même texte à chaque fois. Pour chaque paire, deux questions. Réponds au feeling, sans chercher la bonne réponse.`)),
    h('button', { class: 'btn btn-go', onclick: pair }, 'On commence'),
    h('a', { class: 'btn-link', href: `#/bilan/${s.id}` }, 'Plus tard'));

  async function pair() {
    const p = draft.pairs[i];
    if (!p) { await finish(); return; }
    const [older, newer] = await Promise.all([repo.getAudio(p.olderId), repo.getAudio(p.newerId)]);
    const sideA = p.newerSide === 'A' ? newer : older;
    const sideB = p.newerSide === 'A' ? older : newer;
    if (!sideA || !sideB) { i += 1; pair(); return; }
    const a = {};
    const ask = (q, label) => h('div', { class: 'rating' },
      h('p', {}, label),
      h('div', { class: 'row' }, [['A', 'A'], ['B', 'B'], ['nsp', 'Je ne sais pas']].map(([v, l]) => h('button', {
        class: 'btn-small',
        onclick: (e) => {
          a[q] = v;
          for (const b of e.currentTarget.parentElement.children) b.classList.toggle('chosen', b === e.currentTarget);
          if (a.q1 && a.q2) { answers[p.id] = { ...a }; player.stop(); i += 1; pair(); }
        },
      }, l))));
    screen(
      h('p', { class: 'label' }, `Paire ${i + 1} sur ${draft.pairs.length}`),
      h('div', { class: 'row' },
        h('button', { class: 'btn-small', onclick: () => player.play(sideA) }, '▶ Écouter A'),
        h('button', { class: 'btn-small', onclick: () => player.play(sideB) }, '▶ Écouter B')),
      QUESTIONS.map(([q, label]) => ask(q, label)));
  }

  async function finish() {
    // Une paire sans audio (sauvegarde partielle) est sautée : elle ne compte ni pour ni contre.
    const score = procheScore({ pairs: draft.pairs.filter((p) => answers[p.id]), answers });
    const fresh = await repo.getSession(s.id);
    const updated = { ...fresh, bilan: { ...fresh.bilan, proche: { seed: draft.seed, pairs: draft.pairs, answers, ...score, dateKey: s.dateKey } } };
    const [ss, recs, ms] = await Promise.all([repo.listSessions(), repo.listRecordings(), repo.listMeasures()]);
    const all = ss.map((x) => (x.id === updated.id ? updated : x));
    updated.bilan.report = buildBilanReport({ session: updated, sessions: all, recordings: recs, measures: ms, todayKey: s.dateKey, lines: content.mesure ?? {} });
    await repo.saveSession(updated);
    screen(
      h('h1', {}, 'Merci !'),
      h('p', {}, 'Tu peux rendre le téléphone à Fred.'),
      h('a', { class: 'btn btn-go', href: `#/bilan/${s.id}` }, 'Voir le bilan'));
  }

  intro();
  return () => player.stop();
}
