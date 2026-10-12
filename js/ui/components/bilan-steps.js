import { h } from '../dom.js';
import { speak, stopSpeaking, canSpeak } from '../../platform/speech.js';
import { FORME_OPTIONS } from '../../core/bilan-plan.js';

const show = (el, ...nodes) => el.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null));
const btn = (label, onclick, cls = 'btn btn-go') => h('button', { class: cls, onclick }, label);

/** Étape 1 du bilan : la forme du jour, 1 tap (M §3.3). Elle va dans le contexte de toutes les mesures du bilan. */
export function createForme({ onPick }) {
  const el = h('div', { class: 'bilan-step' },
    h('h2', { class: 'step-title' }, 'Ta forme du jour'),
    h('p', { class: 'muted' }, 'Pour lire le bilan à la lumière de ta journée.'),
    h('div', { class: 'stack' }, FORME_OPTIONS.map((o) => btn(o.label, () => onPick(o.value), 'btn-small'))),
    h('p', { class: 'muted small' }, 'Même pièce, assis, téléphone posé à la même distance que d’habitude.'));
  return { el, destroy() {} };
}

/**
 * Étape 5 : le passage d'écoute réservé au bilan, lu par la synthèse vocale, texte masqué (sans voix : lu une
 * fois à l'écran, puis caché). Reformulation de 30 s à voix haute, puis Fred coche les faits clés retrouvés.
 */
export function createEcouteBilan({ step, onFaits, onDone }) {
  const el = h('div', { class: 'bilan-step' });
  let timer = null;
  let destroyed = false;
  let phase = 'intro'; // intro | lecture | reformulation | faits
  let left = 30;
  let interrupted = false;
  const intro = (again = false) => {
    phase = 'intro';
    show(el,
      h('h2', { class: 'step-title' }, 'Écoute'),
      again ? h('p', { class: 'muted small' }, 'Écoute interrompue : on la reprend depuis le début.') : null,
      h('p', {}, step.lines[0]),
      btn(again ? 'Réécouter' : 'Écouter', listen));
  };
  function listen() {
    phase = 'lecture';
    if (canSpeak()) {
      show(el, h('p', { class: 'muted' }, 'Le téléphone lit. Le texte reste caché.'));
      speak(step.passage, {
        onEnd: () => { if (!destroyed) reformulate(); },
        onError: () => { if (!destroyed) readOnce(); },
      });
    } else readOnce();
  }
  const readOnce = () => show(el,
    h('p', { class: 'muted' }, 'Lis une seule fois. Le texte disparaît ensuite.'),
    h('p', { class: 'say small' }, step.passage),
    btn('J’ai lu', reformulate));
  // Rien n'est enregistré pendant la reformulation : pas de point rouge, un repère neutre.
  let count = null;
  function reformulate() {
    phase = 'reformulation';
    left = 30;
    count = h('p', { class: 'cue' }, `À toi : reformule à voix haute · ${left} s`);
    show(el, count, h('p', { class: 'muted' }, 'Ce que tu as compris, avec tes mots.'), btn('J’ai fini', reveal, 'btn-secondary'));
    tickFrom();
  }
  function tickFrom() {
    clearInterval(timer);
    timer = setInterval(() => {
      left -= 1;
      if (count) count.textContent = `À toi : reformule à voix haute · ${Math.max(0, left)} s`;
      if (left <= 0) reveal();
    }, 1000);
  }
  function reveal() {
    clearInterval(timer);
    timer = null;
    phase = 'faits';
    const boxes = step.faitsCles.map(() => h('input', { type: 'checkbox' }));
    show(el,
      h('p', { class: 'label' }, 'Les faits clés'),
      h('p', { class: 'muted small' }, 'Coche ceux que tu as retrouvés dans ta reformulation.'),
      step.faitsCles.map((f, i) => h('label', { class: 'check' }, boxes[i], h('span', {}, f))),
      btn('Valider', () => { onFaits(boxes.map((b) => b.checked)); onDone(); }));
  }
  intro();
  return {
    el,
    /** Pause : la lecture s'arrête (elle sera réécoutée) ; le compteur de la reformulation s'arrête aussi. */
    pause() {
      stopSpeaking();
      if (phase === 'lecture') interrupted = true;
      if (phase === 'reformulation') { clearInterval(timer); timer = null; }
    },
    resume() {
      if (interrupted) { interrupted = false; intro(true); return; }
      if (phase === 'reformulation' && !timer) tickFrom();
    },
    destroy() { destroyed = true; clearInterval(timer); stopSpeaking(); },
  };
}

/**
 * Étape 6 : l'auto-grille des 6 compétences (R §2.2), une à la fois : 3 repères, plus « Non observé ».
 * onGrille({ 'fr.G1': 1|2|3|'no', … }).
 */
export function createGrille({ step, onGrille, onDone }) {
  const el = h('div', { class: 'bilan-step' });
  const answers = {};
  let i = 0;
  function render() {
    const it = step.items[i];
    // Fin (ou grille vide) : jamais d'appel synchrone pendant la mise en place de l'étape (enterStep).
    if (!it) { queueMicrotask(() => { onGrille({ ...answers }); onDone(); }); return; }
    const pick = (v) => { answers[it.id] = v; i += 1; render(); };
    show(el,
      h('p', { class: 'label' }, `${step.title ?? 'Tes gestes en RDV'} · ${i + 1} sur ${step.items.length}`),
      h('h2', { class: 'step-title' }, it.competence),
      h('p', { class: 'muted small' }, step.intro ?? 'Lors de tes derniers RDV ou mises en situation, ce qui te ressemble le plus :'),
      h('div', { class: 'stack' }, it.niveaux.map((txt, k) => h('button', { class: 'chip grille-chip', onclick: () => pick(k + 1) },
        h('strong', {}, `Repère ${k + 1}`), ' · ', txt))),
      h('button', { class: 'btn-link', onclick: () => pick('no') }, 'Non observé'));
  }
  render();
  return { el, destroy() {} };
}
