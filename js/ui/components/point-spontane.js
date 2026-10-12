import { h } from '../dom.js';
import { startRecording } from '../../audio/recorder.js';
import { measureTake } from '../../audio/voice-measure.js';
import { buzz } from '../../platform/haptics.js';
import { stopSpeaking } from '../../platform/speech.js';
import { refusalText } from '../../core/texts.js';
import { READY_OPTIONS, READY_QUESTION } from '../../core/weekly-point.js';

const AFTER_BUZZ_MS = 350;
const LEAD_SILENCE_MS = 2500;
const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Point de la semaine, format A : parole spontanée de 45 s (M §3.2). La prise est enregistrée, puis
 * analysée (% de pause et nombre de pauses : ni débit ni syllabes, il n'y a pas de texte). Même protocole
 * que la mesure de voix : vibration AVANT le micro, 2 s de silence, aucun son pendant la prise. Une prise
 * refusée peut être refaite une fois. Puis 1 tap : « Si tu avais un RDV demain : Pas prêt / Plutôt prêt / Prêt ».
 * saveTake({ blob, mimeType, durationMs, res }) ; onReady(value) ; onDone().
 * @returns {{ el, pause(), resume(), destroy(), settled(): Promise<void> }}
 */
export function createPointSpontane({ step, saveTake, onReady, onDone }) {
  const el = h('div', { class: 'point' });
  const maxMs = (step.maxSec ?? 45) * 1000;
  let recorder = null;
  let phase = 'intro';
  let retried = false;
  let destroyed = false;
  let interrupted = false;
  let token = 0;
  let pending = Promise.resolve();
  let stopTimer = null;
  let countdown = null;
  const show = (...nodes) => { if (!destroyed) el.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null)); };
  const btn = (label, onclick, cls = 'btn btn-go') => h('button', { class: cls, onclick }, label);
  const question = () => h('p', { class: 'say' }, step.question);

  function intro(message = null) {
    phase = 'intro';
    show(
      h('h2', { class: 'step-title' }, step.title),
      message,
      h('ol', { class: 'lines' }, step.lines.map((l) => h('li', {}, l))),
      question(),
      btn('Je suis prêt', startTake));
  }

  async function startTake() {
    if (recorder || phase === 'arming' || phase === 'silence' || phase === 'speaking') return;
    const my = ++token;
    phase = 'arming';
    stopSpeaking();
    show(question(), h('p', { class: 'voice-hush' }, 'Silence…'));
    buzz('start');
    await wait(AFTER_BUZZ_MS);
    if (my !== token || destroyed) return;
    let rec;
    try {
      rec = await startRecording();
    } catch {
      if (my !== token || destroyed) return;
      show(h('p', {}, 'Sans micro, pas de prise aujourd’hui.'), btn('Continuer', next));
      return;
    }
    if (my !== token || destroyed) { rec.cancel(); return; }
    recorder = rec;
    phase = 'silence';
    show(question(), h('p', { class: 'rec' }, h('span', { class: 'rec-dot' }), 'J’enregistre'), h('p', { class: 'voice-hush' }, 'Silence… Pas encore.'));
    await wait(LEAD_SILENCE_MS);
    if (my !== token || destroyed || !recorder) return;
    phase = 'speaking';
    const t0 = Date.now();
    const left = h('p', { class: 'rec' }, h('span', { class: 'rec-dot' }), `À toi · ${step.maxSec ?? 45} s`);
    show(left, question(), btn('J’ai fini', finishTake, 'btn-secondary'));
    countdown = setInterval(() => {
      const s = Math.max(0, Math.ceil((maxMs - (Date.now() - t0)) / 1000));
      left.lastChild.textContent = `À toi · ${s} s`;
    }, 500);
    stopTimer = setTimeout(finishTake, maxMs);
  }

  function clearTimers() {
    clearTimeout(stopTimer);
    clearInterval(countdown);
    stopTimer = null;
    countdown = null;
  }

  function finishTake() {
    if (phase !== 'speaking' || !recorder) return;
    clearTimers();
    const rec = recorder;
    recorder = null;
    phase = 'analyzing';
    show(h('p', { class: 'muted' }, 'J’écoute ta prise…'));
    const job = (async () => {
      const out = await rec.stop();
      if (!out || !out.blob.size) return { valid: false, reason: 'sans-parole' };
      const res = await measureTake(out.blob, null);
      if (res.valid) await saveTake({ blob: out.blob, mimeType: out.mimeType, durationMs: out.durationMs, res });
      return res;
    })().catch((e) => { console.error(e); return { valid: false, reason: 'decodage' }; });
    pending = pending.then(() => job).then(() => {});
    job.then((res) => {
      if (destroyed) return;
      if (res.valid) { next(); return; }
      const msg = h('p', { class: 'voice-refus' }, refusalText(res.reason));
      if (!retried) {
        show(msg, btn('Refaire la prise', () => { retried = true; intro(); }), h('button', { class: 'btn-link', onclick: next }, 'Continuer sans'));
      } else {
        show(msg, btn('Continuer', next));
      }
    });
  }

  /** Après la prise : le tap « Si tu avais un RDV demain » (point de la semaine), ou rien (bilan). */
  const next = () => (step.askReady === false ? done() : askReady());

  function askReady() {
    phase = 'ready';
    show(
      h('p', { class: 'rating-q' }, step.readyQuestion ?? READY_QUESTION),
      h('div', { class: 'stack' }, READY_OPTIONS.map((o) => btn(o.label, () => { onReady(o.value); done(); }, 'btn-small'))),
      h('button', { class: 'btn-link', onclick: () => done() }, 'Passer'));
  }

  function done() {
    phase = 'done';
    show(h('p', {}, step.doneText ?? 'Point enregistré.'), btn('Suivant', () => onDone()));
  }

  function abandon() {
    token += 1;
    clearTimers();
    if (recorder) { recorder.cancel(); recorder = null; }
  }

  intro();
  return {
    el,
    settled: () => pending,
    pause() {
      if (phase === 'arming' || phase === 'silence' || phase === 'speaking') { abandon(); interrupted = true; phase = 'intro'; }
    },
    resume() {
      if (!interrupted) return;
      interrupted = false;
      intro(h('p', { class: 'muted small' }, 'Prise interrompue : on la refait depuis le début.'));
    },
    destroy() { abandon(); destroyed = true; },
  };
}
