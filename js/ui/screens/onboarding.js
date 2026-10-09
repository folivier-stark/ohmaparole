import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { calendarUrl, alarmLabel } from '../../core/reminder.js';
import { startRecording } from '../../audio/recorder.js';
import { createPlayer } from '../../audio/player.js';
import { buzz } from '../../platform/haptics.js';

export async function render(root, { repo, content, navigate }) {
  const state = {
    step: 1,
    objective: await repo.getMeta('objective', content.extras.objectifDefaut),
    why: await repo.getMeta('why', ''),
    retried: false,
    take: null,
    recorder: null,
  };
  const player = createPlayer();
  const show = (...nodes) => root.replaceChildren(h('div', { class: 'onb' }, h('p', { class: 'onb-step' }, `${state.step} / 4`), ...nodes));

  function step1() {
    state.step = 1;
    show(
      h('h1', {}, '5 minutes par jour. Pas plus.'),
      h('p', {}, 'Tu parles, tu t’écoutes, tu avances.'),
      h('p', {}, 'Un jour raté ne casse rien. Une seule règle : jamais deux jours d’affilée sans.'),
      h('p', { class: 'muted' }, 'On commence par 3 réglages, moins de 2 minutes.'),
      h('button', { class: 'btn btn-go', onclick: step2 }, 'Commencer'),
    );
  }

  function step2() {
    state.step = 2;
    const obj = h('input', { class: 'field', type: 'text', value: state.objective });
    const why = h('textarea', { class: 'field', rows: 3, placeholder: 'En une phrase, avec tes mots.' });
    why.value = state.why;
    show(
      h('h1', {}, 'Pourquoi tu fais ça ?'),
      h('label', { class: 'label' }, 'Ton objectif'), obj,
      h('label', { class: 'label' }, 'Pourquoi c’est important pour toi ?'), why,
      h('div', { class: 'chips' }, content.extras.pourquoiExemples.map((x) => h('button', { class: 'chip', onclick: () => { why.value = x; } }, x))),
      h('button', {
        class: 'btn btn-go',
        onclick: async () => {
          state.objective = obj.value.trim() || content.extras.objectifDefaut;
          state.why = why.value.trim() || state.objective;
          await repo.setMeta('objective', state.objective);
          await repo.setMeta('why', state.why);
          step3();
        },
      }, 'C’est mon pourquoi'),
    );
  }

  function step3() {
    state.step = 3;
    const status = h('p', { class: 'muted' }, 'Ta voix reste sur ton téléphone.');
    const actions = h('div', { class: 'stack' });
    const idle = () => actions.replaceChildren(
      h('button', { class: 'btn btn-go', onclick: rec }, '● Enregistrer'),
      h('button', { class: 'btn-link', onclick: step4 }, 'Plus tard'),
    );
    // busy : un double tap ne doit ni ouvrir deux fois le micro, ni arrêter deux fois la prise.
    let busy = false;
    async function rec() {
      if (state.recorder || busy) return;
      busy = true;
      try {
        state.recorder = await startRecording();
      } catch {
        status.textContent = 'Sans micro, pas d’enregistrement. Tu peux l’autoriser dans les réglages du téléphone. Le reste marche quand même.';
        return;
      } finally {
        busy = false;
      }
      buzz('start');
      status.textContent = 'J’enregistre… Lis le texte à ton rythme.';
      actions.replaceChildren(h('button', { class: 'btn btn-rec', onclick: stopRec }, '■ J’ai fini'));
    }
    async function stopRec() {
      if (busy || !state.recorder) return;
      busy = true;
      let res;
      try {
        res = await state.recorder.stop();
      } finally {
        state.recorder = null;
        busy = false;
      }
      if (!res || !res.blob.size) { status.textContent = 'La prise est vide. On recommence ?'; idle(); return; }
      state.take = res;
      status.textContent = 'Réécoute.';
      player.play(res.blob);
      actions.replaceChildren(
        h('button', { class: 'btn btn-go', onclick: keep }, 'Garder cette prise'),
        h('button', { class: 'btn-secondary', onclick: () => player.play(res.blob) }, '▶ Réécouter'),
        state.retried ? null : h('button', {
          class: 'btn-link',
          onclick: () => { state.retried = true; player.stop(); status.textContent = 'Une dernière fois, tranquillement.'; idle(); },
        }, 'Recommencer'),
      );
    }
    async function keep() {
      player.stop();
      const res = state.take;
      const now = Date.now();
      await repo.saveRecording({
        id: crypto.randomUUID(), createdAt: now, dateKey: dayKey(now), kind: 'reference', milestone: 1,
        itemId: content.reference.id, sessionId: null, mimeType: res.mimeType, durationMs: res.durationMs, sizeBytes: res.blob.size,
      }, res.blob);
      step4();
    }
    show(
      h('h1', {}, 'Ta voix d’aujourd’hui'),
      h('p', {}, 'Lis ce texte à voix haute. Tu le réentendras dans 7, 14 et 30 séances.'),
      h('p', { class: 'say' }, content.reference.texte),
      status,
      actions,
    );
    idle();
  }

  async function step4() {
    state.step = 4;
    player.stop();
    const prefs = await repo.getSettings();
    const time = h('input', { class: 'field', type: 'time', value: prefs.reminderTime });
    const note = h('p', { class: 'muted' });
    const appUrl = location.origin + location.pathname;
    show(
      h('h1', {}, 'À quelle heure on se retrouve ?'),
      time,
      h('p', {}, 'Un rappel chaque jour dans ton agenda, avec ton pourquoi.'),
      h('a', {
        class: 'btn-secondary', href: '#', target: '_blank', rel: 'noopener',
        onclick: (e) => { e.currentTarget.href = calendarUrl({ dateKey: dayKey(Date.now()), time: time.value || '08:30', why: state.why, appUrl }); },
      }, 'Créer le rappel dans Google Agenda'),
      h('button', {
        class: 'btn-link',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(alarmLabel(state.why));
            note.textContent = 'Copié. Colle-le comme nom d’une alarme quotidienne dans l’Horloge.';
          } catch {
            note.textContent = alarmLabel(state.why);
          }
        },
      }, 'Ou : copier le nom pour une alarme'),
      note,
      h('p', { class: 'muted' }, 'Astuce : un appui long sur l’icône OhMaParole lance directement la séance.'),
      h('button', {
        class: 'btn btn-go',
        onclick: async () => {
          await repo.setMeta('settings', { ...prefs, reminderTime: time.value || '08:30' });
          await repo.setMeta('onboarded', true);
          navigate('/home', { replace: true });
        },
      }, 'C’est parti'),
    );
  }

  step1();
  return () => {
    player.stop();
    state.recorder?.cancel();
  };
}
