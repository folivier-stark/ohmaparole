import { h } from '../dom.js';
import { startRecording } from '../../audio/recorder.js';
import { measureTake } from '../../audio/voice-measure.js';
import { buzz } from '../../platform/haptics.js';
import { speak, stopSpeaking } from '../../platform/speech.js';
import { refusalText } from '../../core/texts.js';

/** Vibreur du départ (haptics 'start' = 120 ms), puis une marge : il ne doit RIEN laisser dans la prise. */
const AFTER_BUZZ_MS = 350;
/** Silence imposé avant la lecture (D §3.4 : 2 s, mesure du plancher de bruit), plus une marge de démarrage. */
const LEAD_SILENCE_MS = 2500;

const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Bloc « Mesure de ta voix » (spec V2 §4, eval-diction.md §3.4) : 3 prises du texte de référence.
 * - Chaque prise : vibration AVANT startRecording, 2 s de silence, puis « Lis maintenant ». Aucun bip, aucune
 *   synthèse vocale pendant la prise (un son de plus de 80 ms compterait comme de la parole).
 * - « J'ai fini » arrête la prise ; elle est analysée tout de suite. Une prise refusée affiche la raison et peut
 *   être refaite UNE fois. Une prise valide n'est jamais refaite (pas de « ratée »).
 * - Pause pendant une prise : elle est abandonnée et repart à zéro à la reprise, sans compter comme un essai.
 * saveTake({ blob, mimeType, durationMs, res }) enregistre une prise valide (session.js) ; onDone(validTakes)
 * passe au bloc suivant.
 * @returns {{ el, pause(), resume(), destroy(), settled(): Promise<void>, validTakes(): number }}
 */
export function createVoiceCheck({ step, saveTake, onDone }) {
  const total = step.takes ?? 3;
  const el = h('div', { class: 'voice-check' });
  let take = 1;
  let retried = false;
  let valid = 0;
  let recorder = null;
  let phase = 'intro'; // intro | ready | arming | silence | reading | analyzing | result | done
  let interrupted = false;
  let destroyed = false;
  let paused = false;
  let token = 0; // invalide les minuteries d'une prise abandonnée
  let pending = Promise.resolve();

  const show = (...nodes) => { if (!destroyed) el.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null)); };
  const takeLabel = () => (total === 1 ? step.title : `Prise ${take} sur ${total}`);
  const minValid = step.minValid ?? 2;
  const btn = (label, onclick, cls = 'btn btn-go') => h('button', { class: cls, onclick }, label);

  function intro() {
    phase = 'intro';
    show(
      h('h2', { class: 'step-title' }, step.title),
      h('ol', { class: 'lines' }, step.lines.map((l) => h('li', {}, l))),
      h('p', { class: 'muted small' }, total === 1 ? 'Une lecture. Avant, 2 secondes de silence. Pas de bip.' : 'Trois lectures du même texte. Avant chacune, 2 secondes de silence. Pas de bip.'),
      h('p', { class: 'say small' }, step.text),
      btn(total === 1 ? 'Je suis prêt' : `${takeLabel()} · Je suis prêt`, startTake));
    if (!paused && total > 1) speak('Téléphone posé à 30 centimètres. Lis comme si tu parlais à un prospect.');
  }

  function ready(message = null) {
    phase = 'ready';
    show(
      h('h2', { class: 'step-title' }, takeLabel()),
      message,
      h('p', { class: 'muted' }, 'Téléphone posé, même distance. Au signal, 2 secondes de silence, puis lis.'),
      btn('Je suis prêt', startTake));
  }

  async function startTake() {
    if (recorder || phase === 'arming' || phase === 'silence' || phase === 'reading') return;
    const my = ++token;
    phase = 'arming';
    stopSpeaking();
    show(h('h2', { class: 'step-title' }, takeLabel()), h('p', { class: 'voice-hush' }, 'Silence…'));
    // La vibration se fait AVANT d'ouvrir le micro, et se termine avant le début de la prise.
    buzz('start');
    await wait(AFTER_BUZZ_MS);
    if (my !== token || destroyed) return;
    let rec;
    try {
      rec = await startRecording();
    } catch {
      if (my !== token || destroyed) return;
      phase = 'done';
      show(
        h('p', {}, 'Sans micro, pas de mesure aujourd’hui. Tu peux l’autoriser dans les réglages du téléphone.'),
        btn('Suivant', () => onDone(valid)));
      return;
    }
    if (my !== token || destroyed) { rec.cancel(); return; }
    recorder = rec;
    phase = 'silence';
    show(
      h('h2', { class: 'step-title' }, takeLabel()),
      h('p', { class: 'rec' }, h('span', { class: 'rec-dot' }), 'J’enregistre'),
      h('p', { class: 'voice-hush' }, 'Silence… Ne lis pas encore.'));
    await wait(LEAD_SILENCE_MS);
    if (my !== token || destroyed || !recorder) return;
    phase = 'reading';
    show(
      h('p', { class: 'rec' }, h('span', { class: 'rec-dot' }), `${takeLabel()} · Lis maintenant`),
      h('p', { class: 'say' }, step.text),
      btn('J’ai fini', finishTake, 'btn-secondary'));
  }

  function finishTake() {
    if (phase !== 'reading' || !recorder) return;
    const rec = recorder;
    recorder = null;
    phase = 'analyzing';
    show(h('h2', { class: 'step-title' }, takeLabel()), h('p', { class: 'muted' }, 'J’écoute ta prise…'));
    const job = (async () => {
      const out = await rec.stop();
      if (!out || !out.blob.size) return { valid: false, reason: 'sans-parole' };
      const res = await measureTake(out.blob, step.syllables);
      if (res.valid) {
        await saveTake({ blob: out.blob, mimeType: out.mimeType, durationMs: out.durationMs, res });
        valid += 1;
      }
      return res;
    })().catch((e) => { console.error(e); return { valid: false, reason: 'decodage' }; });
    pending = pending.then(() => job).then(() => {});
    job.then((res) => { if (!destroyed) result(res); });
  }

  function nextTake() {
    take += 1;
    retried = false;
    if (take > total) done();
    else ready();
  }

  function result(res) {
    phase = 'result';
    if (res.valid) {
      const hint = res.analysis?.leadSilent === false ? h('p', { class: 'muted small' }, 'La prochaine fois, attends « Lis maintenant » avant de commencer.') : null;
      if (take >= total) { done(total > 1 ? h('p', {}, `Prise ${take} : c’est bon.`) : null, hint); return; }
      take += 1;
      retried = false;
      ready(h('div', {}, h('p', {}, `Prise ${take - 1} : c’est bon.`), hint));
      return;
    }
    const msg = h('p', { class: 'voice-refus' }, refusalText(res.reason));
    if (!retried) {
      show(
        h('h2', { class: 'step-title' }, takeLabel()), msg,
        btn('Refaire la prise', () => { retried = true; ready(); }),
        h('button', { class: 'btn-link', onclick: nextTake }, take >= total ? 'Terminer la mesure' : 'Passer à la prise suivante'));
    } else {
      show(
        h('h2', { class: 'step-title' }, takeLabel()), msg,
        btn(take >= total ? 'Terminer la mesure' : 'Prise suivante', nextTake));
    }
  }

  function done(...before) {
    phase = 'done';
    const enough = valid >= minValid;
    let title;
    let text;
    if (total === 1) {
      title = enough ? 'Lecture faite' : 'Pas de lecture valide';
      text = enough ? 'C’est enregistré.' : 'Pas de lecture valide cette fois : on continue.';
    } else {
      title = enough ? 'Mesure faite' : 'Mesure à refaire';
      text = enough ? `${valid} prises valides sur ${total}. Le résultat est dans Progression.` : 'Pas assez de prises valides cette fois : la mesure revient à ta prochaine séance.';
    }
    show(
      ...before,
      h('h2', { class: 'step-title' }, title),
      h('p', {}, text),
      btn('Suivant', () => onDone(valid)));
  }

  /** Abandonne la prise en cours (pause, écran quitté). Elle repart à zéro, sans compter comme un essai. */
  function abandon() {
    token += 1;
    if (recorder) { recorder.cancel(); recorder = null; }
  }

  intro();
  return {
    el,
    validTakes: () => valid,
    settled: () => pending,
    pause() {
      paused = true;
      stopSpeaking();
      if (phase === 'arming' || phase === 'silence' || phase === 'reading') { abandon(); interrupted = true; phase = 'ready'; }
    },
    resume() {
      paused = false;
      if (!interrupted) return; // l'écran affiché (consigne, résultat) reste valable
      interrupted = false;
      ready(h('p', { class: 'muted small' }, 'Prise interrompue : on la refait depuis le début.'));
    },
    destroy() {
      abandon();
      destroyed = true;
      stopSpeaking();
    },
  };
}
