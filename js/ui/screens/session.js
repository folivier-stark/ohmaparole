import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { buildDailyPlan, buildRdvPlan } from '../../core/planner.js';
import {
  createRun, tick, next, pause, resume, skipBlock, stop, restartStep, currentStep,
  remainingMs, practicedMs, isCounted, pausedForMs,
} from '../../core/session-engine.js';
import {
  homeStatus, dailyCount, dueMilestone, referenceMilestones, historyIds, lastBloc3, lastConsigneId,
} from '../../core/progress.js';
import { BLOCKS, PAS_COMPTE } from '../../core/texts.js';
import { createTimer } from '../components/timer.js';
import { startRecording } from '../../audio/recorder.js';
import { createPlayer } from '../../audio/player.js';
import { speak, stopSpeaking, canSpeak } from '../../platform/speech.js';
import { buzz } from '../../platform/haptics.js';
import { keepAwake, releaseAwake } from '../../platform/wakelock.js';
import { requestPersist } from '../../platform/storage.js';

const AUTO_CLOSE_MS = 30 * 60 * 1000;

function rating(question, options, onPick) {
  return h('div', { class: 'rating' },
    h('p', {}, question),
    h('div', { class: 'row' }, options.map(([v, label]) => h('button', { class: 'btn-small', onclick: () => onPick(v) }, label))));
}

export async function render(root, { repo, content, navigate, params }) {
  const kind = params[0] === 'prerdv' ? 'prerdv' : 'daily';
  const t0 = Date.now();
  const today = dayKey(t0);
  const [sessions, recordings, why] = await Promise.all([repo.listSessions(), repo.listRecordings(), repo.getMeta('why', '')]);

  let plan;
  if (kind === 'prerdv') {
    plan = buildRdvPlan({ content, dateKey: today, lastConsigneId: lastConsigneId(sessions) });
  } else {
    const n = dailyCount(sessions) + 1;
    plan = buildDailyPlan({
      content, history: historyIds(sessions), sessionNumber: n, dateKey: today, lastBloc3: lastBloc3(sessions),
      dueMilestone: dueMilestone(n, referenceMilestones(recordings)), comeback: homeStatus(sessions, today).comeback,
    });
  }

  const record = {
    id: crypto.randomUUID(), type: plan.type, dateKey: today, startedAt: t0, endedAt: t0,
    practicedSec: 0, counted: false, completed: false,
    sessionNumber: plan.sessionNumber ?? null, cycle: plan.cycle ?? null, programWeek: plan.week ?? null,
    bloc3: plan.bloc3 ?? null, milestone: plan.milestone ?? null, itemIds: plan.itemIds,
    consigneId: plan.consigneId ?? null, ratings: {}, recordingIds: [], goal: '', feedback: null,
  };

  let run = null;
  let loopTimer = null;
  let countdown = null;
  let shownIndex = -1;
  let finished = false;
  let stoppedEarly = false;
  let takeStarting = null;
  let takeStep = null;
  let lastTake = Promise.resolve(null);
  let goalInput = null;
  let lateRating = null;

  const player = createPlayer();
  const timer = createTimer();
  const header = h('header', { class: 'session-head' });
  const stage = h('section', { class: 'stage' });
  const overlay = h('div', { class: 'overlay', hidden: true });
  const blocks = [...new Set(plan.steps.map((s) => s.block))];
  // append() du DOM écrirait « null » en texte : on filtre les nœuds absents.
  const add = (...nodes) => stage.append(...nodes.filter((n) => n != null));

  const showOverlay = (...nodes) => { overlay.replaceChildren(h('div', { class: 'overlay-box' }, nodes)); overlay.hidden = false; };
  const hideOverlay = () => { overlay.hidden = true; };

  async function save() {
    const now = Date.now();
    const ms = run ? practicedMs(run, now) : 0;
    record.practicedSec = Math.round(ms / 1000);
    record.counted = isCounted(ms);
    record.endedAt = now;
    if (ms > 0) await repo.saveSession(structuredClone(record));
  }

  function beginTake(st) {
    takeStep = st;
    takeStarting = startRecording().catch(() => null);
  }

  /** partial : prise interrompue par une pause, gardée mais jamais prise pour un jalon. */
  function endTake({ partial = false } = {}) {
    const starting = takeStarting;
    const st = takeStep;
    takeStarting = null;
    if (!starting) return;
    lastTake = (async () => {
      try {
        const rec = await starting;
        if (!rec) return null;
        const res = await rec.stop();
        if (!res || !res.blob.size) return null;
        const meta = {
          id: crypto.randomUUID(), createdAt: Date.now(), dateKey: today, kind: partial ? 'partial' : st.recordKind,
          milestone: st.milestone ?? null, itemId: st.itemId, sessionId: record.id,
          mimeType: res.mimeType, durationMs: res.durationMs, sizeBytes: res.blob.size,
        };
        await repo.saveRecording(meta, res.blob);
        record.recordingIds.push(meta.id);
        return { meta, blob: res.blob };
      } catch {
        return null;
      }
    })();
  }

  function renderHeader(st) {
    const b = BLOCKS[st.block];
    const idx = blocks.indexOf(st.block);
    header.replaceChildren(
      h('div', { class: 'segments' }, blocks.map((_, i) => h('span', { class: i < idx ? 'seg done' : i === idx ? 'seg on' : 'seg' }))),
      h('p', { class: 'block-label' }, b.label),
      h('p', { class: 'block-tagline' }, b.tagline));
  }

  function enterStep(st) {
    const myIndex = run.index;
    const title = h('h2', { class: 'step-title' }, st.title);
    const lines = st.lines?.length ? h('ol', { class: 'lines' }, st.lines.map((l) => h('li', {}, l))) : null;
    const text = st.text == null ? null
      : Array.isArray(st.text) ? h('ul', { class: 'say-list' }, st.text.map((t) => h('li', {}, t)))
        : h('p', { class: 'say' }, st.text);
    const advance = () => { if (run.index === myIndex && run.status === 'running') apply(next(run, Date.now())); };
    stage.replaceChildren();
    lateRating = null;

    switch (st.kind) {
      case 'guide':
      case 'slow':
      case 'reformulate':
      case 'consigne':
        add(title, lines, text);
        if (st.block === 'posture') {
          lateRating = rating('Tu t’es senti posé ?', [['pose', 'Oui'], ['unpeu', 'Un peu'], ['pasencore', 'Pas encore']], (v) => {
            record.ratings[st.itemId] = v;
            advance();
          });
          lateRating.hidden = true;
          add(lateRating);
        }
        speak(st.speak);
        break;
      case 'breathe':
        add(title, h('div', { class: 'breath' }), lines);
        speak(st.speak);
        break;
      case 'record':
        stopSpeaking();
        add(
          h('p', { class: 'rec' }, h('span', { class: 'rec-dot' }), 'J’enregistre'),
          lines, text,
          h('button', { class: 'btn-secondary', onclick: advance }, 'J’ai fini'));
        buzz('start');
        beginTake(st);
        break;
      case 'replay': {
        const status = h('p', { class: 'muted' }, 'Réécoute…');
        add(title, lines, status);
        lastTake.then((take) => {
          if (run.index !== myIndex) return;
          if (!take) { status.textContent = 'Pas d’enregistrement cette fois. Redis la phrase une fois, tranquillement.'; return; }
          status.textContent = 'Ta prise :';
          player.play(take.blob);
          status.after(h('button', { class: 'btn-secondary', onclick: () => player.play(take.blob) }, '▶ Réécouter'));
        });
        if (st.rate) {
          add(rating('Ta prise ?', [['clair', 'Clair'], ['moyen', 'Moyen'], ['brouillon', 'Brouillon']], (v) => {
            record.ratings[st.itemId] = v;
            advance();
          }));
        }
        break;
      }
      case 'listen':
        add(title, lines);
        if (canSpeak()) {
          add(h('p', { class: 'muted' }, 'Le téléphone lit. Le texte reste caché.'));
          speak(st.passage, {
            onEnd: advance,
            // La voix a échoué : on montre le passage, à lire une fois, si l'on est toujours sur ce pas.
            onError: () => {
              if (finished || run.index !== myIndex) return;
              add(
                h('p', { class: 'say small' }, st.passage),
                h('button', { class: 'btn-secondary', onclick: advance }, 'Suivant'));
            },
          });
        } else {
          add(
            h('p', { class: 'muted' }, 'Lis une seule fois. Le texte disparaît ensuite.'),
            h('p', { class: 'say small' }, st.passage),
            h('button', { class: 'btn-secondary', onclick: advance }, 'Suivant'));
        }
        break;
      case 'reveal':
        add(
          title,
          h('p', { class: 'label' }, 'Reformulation de référence'),
          h('p', { class: 'say small' }, st.reformulation),
          h('p', { class: 'label' }, 'Le détail caché'),
          h('p', {}, st.detail),
          rating('Repéré ?', [['oui', 'Oui'], ['non', 'Non']], (v) => { record.ratings[st.itemId] = v; advance(); }));
        break;
      case 'objective':
        goalInput = h('input', { class: 'field', type: 'text', placeholder: 'À la fin de ce rendez-vous, je veux…', value: record.goal });
        add(
          title, goalInput,
          h('div', { class: 'chips' }, content.extras.objectifsRdv.map((x) => h('button', { class: 'chip', onclick: () => { goalInput.value = x; } }, x))),
          h('button', { class: 'btn-secondary', onclick: advance }, 'Valider'));
        speak(st.speak);
        break;
      default:
        add(title, lines, text);
    }
  }

  function exitStep(st) {
    stopSpeaking();
    player.stop();
    if (st.kind === 'record') endTake();
    if (st.kind === 'objective' && goalInput) record.goal = goalInput.value.trim();
  }

  function onStep() {
    const prev = shownIndex >= 0 ? plan.steps[shownIndex] : null;
    if (prev) exitStep(prev);
    shownIndex = run.index;
    const st = currentStep(run);
    if (prev) buzz(prev.block !== st.block ? 'block' : 'tick');
    renderHeader(st);
    enterStep(st);
    save();
  }

  function apply(r) {
    if (finished) return;
    run = r;
    if (run.status === 'done') { finish(); return; }
    if (run.index !== shownIndex) onStep();
  }

  function loop() {
    if (!run || finished) return;
    const now = Date.now();
    // Pause oubliée plus de 30 min : la séance se ferme seule, avec le temps déjà pratiqué.
    if (run.status === 'paused' && pausedForMs(run, now) > AUTO_CLOSE_MS) {
      stoppedEarly = true;
      apply(stop(run, now));
      return;
    }
    apply(tick(run, now));
    if (finished) return;
    const st = currentStep(run);
    if (st) timer.update(remainingMs(run, now), st.durationSec * 1000);
    if (lateRating?.hidden && remainingMs(run, Date.now()) <= 20000) lateRating.hidden = false;
  }

  async function finish() {
    if (finished) return;
    finished = true;
    clearInterval(loopTimer);
    hideOverlay();
    if (shownIndex >= 0 && shownIndex < plan.steps.length) exitStep(plan.steps[shownIndex]);
    releaseAwake();
    // Une prise ou une sauvegarde ratée ne doit jamais bloquer l'écran de fin.
    try { await lastTake; } catch (e) { console.error(e); }
    record.completed = !stoppedEarly;
    try { await save(); } catch (e) { console.error(e); }
    buzz('end');
    try {
      if (record.counted && !(await repo.getMeta('persistAsked', false))) {
        await repo.setMeta('persistAsked', true);
        requestPersist();
      }
    } catch (e) { console.error(e); }
    if (plan.type === 'prerdv') showRdvEnd();
    else if (record.counted) navigate(`/end/${record.id}`, { replace: true });
    else navigate('/home', { replace: true });
  }

  function showRdvEnd() {
    root.replaceChildren(h('div', { class: 'ready' },
      h('p', { class: 'ready-title' }, 'Tu y vas.'),
      record.goal ? h('p', { class: 'say small' }, record.goal) : null,
      why ? h('p', { class: 'why' }, `« ${why} »`) : null,
      h('p', { class: 'muted' }, 'Je suis là pour comprendre, pas pour convaincre.'),
      h('button', { class: 'btn btn-rdv', onclick: () => navigate('/home', { replace: true }) }, 'J’y vais')));
  }

  function onPaused() {
    const st = currentStep(run);
    if (st?.kind === 'record') endTake({ partial: true });
    stopSpeaking();
    player.stop();
  }

  function doResume() {
    hideOverlay();
    const now = Date.now();
    if (pausedForMs(run, now) > AUTO_CLOSE_MS) { stoppedEarly = true; apply(stop(run, now)); return; }
    keepAwake();
    apply(resume(run, now));
    const st = currentStep(run);
    // Prise ou passage interrompus : le pas repart à zéro (prise complète, passage relu en entier).
    if (st && (st.kind === 'listen' || st.kind === 'record')) {
      run = restartStep(run, now);
      enterStep(st);
    }
  }

  function stopNow() {
    stoppedEarly = true;
    apply(stop(run, Date.now()));
  }

  function askStop() {
    if (isCounted(practicedMs(run, Date.now()))) { stopNow(); return; }
    showOverlay(
      h('p', { class: 'overlay-title' }, PAS_COMPTE),
      h('button', { class: 'btn btn-go', onclick: doResume }, 'Continuer'),
      h('button', { class: 'btn-link', onclick: stopNow }, 'Arrêter quand même'));
  }

  function openPause(title = 'Pause') {
    if (!run || run.status !== 'running') return;
    apply(pause(run, Date.now()));
    onPaused();
    releaseAwake();
    showOverlay(
      h('p', { class: 'overlay-title' }, title),
      h('button', { class: 'btn btn-go', onclick: doResume }, 'Reprendre'),
      h('button', { class: 'btn-secondary', onclick: () => { hideOverlay(); keepAwake(); const now = Date.now(); apply(skipBlock(resume(run, now), now)); } }, 'Passer ce bloc'),
      h('button', { class: 'btn-link', onclick: askStop }, 'J’arrête là'));
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') openPause('On reprend ?');
  };
  document.addEventListener('visibilitychange', onVisibility);

  function start() {
    if (run) return;
    clearInterval(countdown);
    run = createRun(plan.steps, Date.now());
    keepAwake();
    root.replaceChildren(header, timer.el, stage,
      h('footer', { class: 'session-foot' }, h('button', { class: 'btn-pause', onclick: () => openPause() }, 'Pause')),
      overlay);
    onStep();
    loop();
    loopTimer = setInterval(loop, 250);
  }

  // Écran « Prêt ? » : compte à rebours 3-2-1, ou un tap pour démarrer tout de suite.
  // Lancée par un raccourci, sans aucun geste, la page n'a droit ni aux vibrations ni à la voix :
  // on attend alors le tap au lieu de compter.
  const showWhy = kind === 'daily' && why && plan.sessionNumber % 3 === 0;
  const needsTap = Boolean(navigator.userActivation && !navigator.userActivation.hasBeenActive);
  let count = 3;
  const num = needsTap ? null : h('p', { class: 'ready-count' }, '3');
  root.replaceChildren(h('div', { class: 'ready', onclick: start },
    h('p', { class: 'ready-title' }, 'Prêt ?'),
    showWhy ? h('p', { class: 'why' }, `« ${why} »`) : null,
    num,
    h('p', { class: 'muted' }, needsTap ? 'Touche l’écran pour commencer.' : 'Touche l’écran pour démarrer tout de suite.')));
  if (!needsTap) {
    buzz('count');
    countdown = setInterval(() => {
      if (document.hidden) return;
      count -= 1;
      if (count <= 0) start();
      else { num.textContent = String(count); buzz('count'); }
    }, 1000);
  }

  return () => {
    clearInterval(countdown);
    clearInterval(loopTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    stopSpeaking();
    player.stop();
    releaseAwake();
    if (run && !finished) {
      finished = true;
      if (takeStarting) endTake();
      stoppedEarly = true;
      lastTake.then(() => save());
    }
  };
}
