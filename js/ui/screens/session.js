import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { buildDailyPlan, buildRdvPlan } from '../../core/planner.js';
import {
  createRun, tick, next, pause, resume, skipBlock, stop, restartStep, currentStep,
  remainingMs, practicedMs, isCounted, pausedForMs,
} from '../../core/session-engine.js';
import { homeStatus, dailyCount, historyIds, lastBloc3, lastConsigneId } from '../../core/progress.js';
import { voiceCheckDue } from '../../core/voice-plan.js';
import { weeklyPointDue, pickPointItem, spontaneRows } from '../../core/weekly-point.js';
import { postureMicConfig, latestCalibration } from '../../core/live-silence.js';
import { BLOCKS, PAS_COMPTE, RDV_NO_RECORD } from '../../core/texts.js';
import { rdvBubble, stablePick, humeurFor } from '../../core/louarn.js';
import { createTimer } from '../components/timer.js';
import { createBulle } from '../components/fox.js';
import { createVoiceCheck } from '../components/voice-check.js';
import { createPostureMic } from '../components/posture-mic.js';
import { createPointSpontane } from '../components/point-spontane.js';
import { createPointEclair } from '../components/point-eclair.js';
import { takeRows } from '../../audio/voice-measure.js';
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
  const [sessions, recordings, why, measures] = await Promise.all([
    repo.listSessions(), repo.listRecordings(), repo.getMeta('why', ''), repo.listMeasures(),
  ]);
  // Seuil des mesures en direct (posture, réplique éclair) : niveaux de la dernière prise de voix valide.
  const calibration = latestCalibration(measures);

  let plan;
  if (kind === 'prerdv') {
    plan = buildRdvPlan({ content, dateKey: today, lastConsigneId: lastConsigneId(sessions) });
  } else {
    const done = dailyCount(sessions);
    const n = done + 1;
    // Calibration ou contrôle de la voix (spec V2 §4) : ils remplacent les jalons J1 à J60 de la V1.
    const voiceCheck = voiceCheckDue(recordings, done, { todayKey: today });
    const comeback = homeStatus(sessions, today).comeback;
    // Point de la semaine (spec V2 §6) : jamais avec une mesure de voix, il est alors reporté.
    const due = weeklyPointDue({ sessionNumber: n, sessions, voiceCheck, comeback });
    const item = due ? pickPointItem({ format: due.format, mesure: content.mesure, sessions, sessionNumber: n, dateKey: today }) : null;
    plan = buildDailyPlan({
      content, history: historyIds(sessions), sessionNumber: n, dateKey: today, lastBloc3: lastBloc3(sessions),
      voiceCheck, comeback, weeklyPoint: due && item ? { ...due, item } : null,
    });
  }

  const record = {
    id: crypto.randomUUID(), type: plan.type, dateKey: today, startedAt: t0, endedAt: t0,
    practicedSec: 0, counted: false, completed: false,
    sessionNumber: plan.sessionNumber ?? null, cycle: plan.cycle ?? null, programWeek: plan.week ?? null,
    bloc3: plan.bloc3 ?? null, milestone: null, voiceCheck: plan.voiceCheck ?? null, voiceTakes: 0, itemIds: plan.itemIds,
    weeklyPoint: plan.weeklyPoint ? { ...plan.weeklyPoint, ready: null, criteres: null } : null,
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
  // Contrôleur du pas interactif en cours (bloc voix, point de la semaine, micro de la posture).
  let blockCtl = null;
  const settles = [];

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

  /** partial : prise interrompue par une pause, gardée mais jamais prise pour une mesure. */
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
          milestone: null, itemId: st.itemId, sessionId: record.id,
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

  /** Une prise valide du bloc voix : enregistrée comme une prise de référence, et ses mesures écrites. */
  async function saveVoiceTake({ blob, mimeType, durationMs, res }) {
    const meta = {
      id: crypto.randomUUID(), createdAt: Date.now(), dateKey: today, kind: 'reference', milestone: null,
      voiceCheck: plan.voiceCheck, sessionNumber: plan.sessionNumber, itemId: content.reference.id, sessionId: record.id,
      mimeType, durationMs, sizeBytes: blob.size,
    };
    await repo.saveRecording(meta, blob);
    record.recordingIds.push(meta.id);
    record.voiceTakes += 1;
    await repo.saveMeasures(takeRows(meta, plan.voiceCheck, res));
    await save();
  }

  /** Une prise du point de la semaine (spontanée ou réplique éclair), gardée pour la réécoute. */
  async function savePointTake(kindOf, { blob, mimeType, durationMs }) {
    const meta = {
      id: crypto.randomUUID(), createdAt: Date.now(), dateKey: today, kind: kindOf, milestone: null,
      sessionNumber: plan.sessionNumber, itemId: plan.weeklyPoint?.itemId ?? null, sessionId: record.id,
      mimeType, durationMs, sizeBytes: blob.size,
    };
    await repo.saveRecording(meta, blob);
    record.recordingIds.push(meta.id);
    await save();
    return meta;
  }

  const ctlBase = (c) => { blockCtl = c; settles.push(c.settled); add(c.el); };

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
          // Exercice à silence cible : mesure facultative au micro, rien n'est enregistré (spec V2 §6).
          const cfg = st.kind === 'guide' ? postureMicConfig(st.itemId) : null;
          if (cfg) {
            ctlBase(createPostureMic({
              item: content.byId.get(st.itemId), config: cfg, calibration, record,
              saveRows: (rows) => repo.saveMeasures(rows),
            }));
          }
          add(lateRating);
        }
        speak(st.speak);
        break;
      case 'breathe':
        add(title, h('div', { class: 'breath' }), lines);
        speak(st.speak);
        break;
      case 'voice':
        stopSpeaking();
        ctlBase(createVoiceCheck({ step: st, saveTake: saveVoiceTake, onDone: advance }));
        break;
      case 'spontane':
        stopSpeaking();
        ctlBase(createPointSpontane({
          step: st,
          saveTake: async (take) => {
            const meta = await savePointTake('spontane', take);
            await repo.saveMeasures(spontaneRows(meta, take.res));
          },
          onReady: (v) => { record.weeklyPoint.ready = v; save(); },
          onDone: advance,
        }));
        break;
      case 'eclair':
        stopSpeaking();
        ctlBase(createPointEclair({
          step: st, calibration, record,
          saveTake: (take) => savePointTake('eclair', take),
          saveRows: (rows) => repo.saveMeasures(rows),
          onCriteres: (c) => { record.weeklyPoint.criteres = c; save(); },
          onDone: advance,
        }));
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
    if (blockCtl) { blockCtl.destroy(); blockCtl = null; }
    if (st.kind === 'objective' && goalInput) record.goal = goalInput.value.trim();
  }

  function onStep() {
    const prev = shownIndex >= 0 ? plan.steps[shownIndex] : null;
    if (prev) exitStep(prev);
    shownIndex = run.index;
    const st = currentStep(run);
    if (prev) buzz(prev.block !== st.block ? 'block' : 'tick');
    renderHeader(st);
    // Le bloc voix n'a pas de durée : pas de compte à rebours (il dure le temps des 3 prises).
    timer.el.hidden = Boolean(st.untimed);
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
    try { await Promise.all(settles.map((f) => f())); } catch (e) { console.error(e); }
    record.completed = !stoppedEarly;
    try { await save(); } catch (e) { console.error(e); }
    buzz('end');
    try {
      if (record.counted && !(await repo.getMeta('persistAsked', false))) {
        await repo.setMeta('persistAsked', true);
        requestPersist();
      }
    } catch (e) { console.error(e); }
    if (plan.type === 'prerdv') await showRdvEnd();
    else if (record.counted) navigate(`/end/${record.id}`, { replace: true });
    else navigate('/home', { replace: true });
  }

  async function showRdvEnd() {
    // Rappel unique, juste avant le premier vrai RDV : on n'enregistre jamais un rendez-vous réel.
    let note = null;
    try {
      if (!(await repo.getMeta('rdvNoRecordShown', false))) {
        await repo.setMeta('rdvNoRecordShown', true);
        note = h('div', { class: 'card' }, h('p', { class: 'label' }, 'À savoir'), h('p', {}, RDV_NO_RECORD));
      }
    } catch (e) { console.error(e); }
    // Louarn, en portrait de 48 px sous le pourquoi, à la place de « Tu y vas. » (G §2.2) ; rien en mode discret.
    let louarn = null;
    try {
      const [discret, vus, jour] = await Promise.all([
        repo.getMeta('renardDiscret', false), repo.getMeta('louarn.vus', []), repo.getMeta('louarn.jour', {}),
      ]);
      const b = rdvBubble({ goal: record.goal, discret });
      const r = b ? stablePick(content.louarn?.repliques ?? [], { ...b, dayKey: today, scope: record.id }, { memo: jour?.rdv ?? null, vus: vus ?? [] }) : null;
      if (r?.changed) await Promise.all([repo.setMeta('louarn.vus', r.vus), repo.setMeta('louarn.jour', { ...jour, rdv: r.memo })]);
      if (r?.line) louarn = createBulle({ texte: r.line.texte, stage: 'portrait', size: 48, humeur: humeurFor(b.moment) });
    } catch (e) { console.error(e); }
    root.replaceChildren(h('div', { class: 'ready' },
      louarn ? null : h('p', { class: 'ready-title' }, 'Tu y vas.'),
      record.goal ? h('p', { class: 'say small' }, record.goal) : null,
      why ? h('p', { class: 'why' }, `« ${why} »`) : null,
      louarn,
      h('p', { class: 'muted' }, 'Je suis là pour comprendre, pas pour convaincre.'),
      note,
      h('button', { class: 'btn btn-rdv', onclick: () => navigate('/home', { replace: true }) }, 'J’y vais')));
  }

  function onPaused() {
    const st = currentStep(run);
    if (st?.kind === 'record') endTake({ partial: true });
    blockCtl?.pause?.();
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
    // Bloc voix, point de la semaine : la prise interrompue repart à zéro, les prises déjà faites restent.
    blockCtl?.resume?.();
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
    blockCtl?.destroy();
    if (run && !finished) {
      finished = true;
      if (takeStarting) endTake();
      stoppedEarly = true;
      Promise.all([lastTake, ...settles.map((f) => f())]).then(() => save());
    }
  };
}
