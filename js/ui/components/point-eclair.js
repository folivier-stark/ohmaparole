import { h } from '../dom.js';
import { startRecording } from '../../audio/recorder.js';
import { createPlayer } from '../../audio/player.js';
import { openMicStream, createLevelMeter } from '../../audio/live-level.js';
import { heldSilence, liveThreshold, liveRows, eclairLabels } from '../../core/live-silence.js';
import { buzz } from '../../platform/haptics.js';
import { speak, stopSpeaking, canSpeak } from '../../platform/speech.js';

const ROOM_MS = 1000;
const BIP_AFTER_MS = 5000; // R §3.3 : quand Fred s'est tu, 5 s, puis le signal
const MAX_MS = 90000;
const MAX_WAIT_MS = 15000;
/** Fin de la synthèse vocale : sa traîne dans la pièce n'est pas une réponse. */
const TTS_TAIL_MS = 300;
const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Point de la semaine, format B : la réplique éclair (R §3.3). La synthèse vocale dit la réplique, texte
 * masqué ; ENSUITE le micro s'ouvre pour la prise (gardée pour la réécoute). Le compteur de niveau, lui,
 * écoute la pièce 1 s avant la réplique (seuil sans calibration), et ne mesure qu'après sa fin.
 * Mesures : délai de réponse (depuis la fin de la réplique), durée de la réponse, silence tenu (jusqu'au
 * signal, 5 s, ou repris avant). Puis réécoute et les 2 cases (critere1, critere2) de la réplique.
 * saveTake({ blob, mimeType, durationMs }) → Promise<recording|null> ; saveRows(rows) ; onCriteres([b1, b2]) ; onDone().
 * @returns {{ el, pause(), resume(), destroy(), settled(): Promise<void> }}
 */
export function createPointEclair({ step, calibration, record, saveTake, saveRows, onCriteres, onDone }) {
  const el = h('div', { class: 'point' });
  const player = createPlayer();
  let meter = null;
  let recorder = null;
  let destroyed = false;
  let interrupted = false;
  let running = false;
  let token = 0;
  let pending = Promise.resolve();
  const show = (...nodes) => { if (!destroyed) el.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null)); };
  const btn = (label, onclick, cls = 'btn btn-go') => h('button', { class: cls, onclick }, label);

  function intro(message = null) {
    show(
      h('h2', { class: 'step-title' }, step.title),
      message,
      h('ol', { class: 'lines' }, step.lines.map((l) => h('li', {}, l))),
      btn('Écouter le prospect', () => { run().catch((e) => { console.error(e); cleanup(); }); }));
  }

  async function run() {
    if (running) return;
    running = true;
    const my = ++token;
    // Un seul getUserMedia : le compteur de niveau et l'enregistrement partagent ce flux (coupé par le compteur).
    let stream = null;
    try {
      stream = await openMicStream();
      meter = await createLevelMeter(stream, { stopTracksOnClose: true });
    } catch {
      meter = null;
    }
    if (my !== token || destroyed) { cleanup(); return; }
    let threshold = { thresholdDb: null, source: null };
    if (meter) {
      show(h('p', { class: 'voice-hush' }, 'Silence…'));
      const t0 = performance.now();
      await wait(ROOM_MS);
      if (my !== token || destroyed) return;
      threshold = liveThreshold({ calibration, roomLevels: meter.history().filter((l) => l.t >= t0) });
    }
    // La réplique : à voix haute, texte masqué. Sans synthèse vocale, on la lit une fois.
    await new Promise((resolve) => {
      if (canSpeak()) {
        show(h('p', { class: 'label' }, 'Le prospect dit…'), h('p', { class: 'muted' }, 'Écoute. Le texte reste caché.'));
        speak(step.replique, {
          onEnd: resolve,
          onError: () => show(h('p', { class: 'say small' }, step.replique), btn('J’ai lu', resolve)),
        });
      } else {
        show(h('p', { class: 'label' }, 'Le prospect dit…'), h('p', { class: 'say small' }, step.replique), btn('J’ai lu', resolve));
      }
    });
    if (my !== token || destroyed) return;
    const ttsEnd = performance.now();
    try {
      recorder = await startRecording(meter && stream ? { stream } : {});
    } catch {
      recorder = null;
    }
    if (my !== token || destroyed) { cleanup(); return; }
    show(recorder ? h('p', { class: 'rec' }, h('span', { class: 'rec-dot' }), 'À toi. J’enregistre.') : h('p', { class: 'cue' }, 'À toi.'),
      h('p', { class: 'muted' }, 'Réponds-lui. Quand tu as fini, tais-toi jusqu’au signal.'),
      btn('J’ai fini', () => stopAnswer?.(), 'btn-secondary'));

    const m = meter && threshold.thresholdDb !== null && !threshold.tooNoisy
      ? await track(ttsEnd, threshold.thresholdDb, my) : { values: {}, tenu: null };
    if (my !== token || destroyed) return;
    const take = recorder ? await recorder.stop().catch(() => null) : null;
    recorder = null;
    closeMeter();
    const job = (async () => {
      const rec = take?.blob?.size ? await saveTake(take) : null;
      const rows = liveRows({
        sessionId: record.id, dateKey: record.dateKey, createdAt: Date.now(), kind: 'eclair', values: m.values,
        recordingId: rec?.id ?? null, context: { itemId: step.itemId, tenu: m.tenu, seuil: threshold.source },
      });
      if (rows.length) await saveRows(rows);
    })().catch((e) => console.error(e));
    pending = pending.then(() => job);
    running = false;
    result(m, take);
  }

  let stopAnswer = null;

  /** Suit la réponse au compteur : délai, silences de plus de 1,5 s, signal à 5 s de silence. */
  function track(ttsEnd, thresholdDb, my) {
    return new Promise((resolve) => {
      let startAt = ttsEnd + TTS_TAIL_MS;
      // Les niveaux reçus pendant l'ouverture de l'enregistrement : sans eux, ce délai serait un « trou ».
      const levels = meter.history().filter((l) => l.t >= startAt);
      let firstOnset = null;
      let firstSilence = null; // silence repris avant le signal
      let off = () => {};
      const t0 = performance.now();
      let unClose = () => {};
      let over = false;
      const finish = (values, tenu) => { if (over) return; over = true; off(); unClose(); stopAnswer = null; resolve({ values, tenu }); };
      unClose = meter.onClose?.(() => finish({}, null)) ?? (() => {});
      stopAnswer = () => finish(firstOnset !== null ? { delaiReponse: firstOnset - ttsEnd } : {}, null);
      off = meter.onLevel((l) => {
        if (my !== token || destroyed) { finish({}, null); return; }
        levels.push(l);
        const st = heldSilence(levels, { thresholdDb, startAt });
        if (st.interrupted) { finish({}, null); return; }
        if (firstOnset === null && st.onset !== null) firstOnset = st.onset;
        const delai = firstOnset !== null ? { delaiReponse: Math.max(0, firstOnset - ttsEnd) } : {};
        if (l.t - t0 > MAX_MS || (st.phase === 'attente' && st.waitingMs > MAX_WAIT_MS)) { finish(delai, null); return; }
        if (st.phase === 'silence' && st.silenceHeldMs >= BIP_AFTER_MS) {
          buzz('tick');
          const tenu = firstSilence === null;
          finish({
            ...delai,
            dureeReponse: st.silenceStart - firstOnset,
            silenceTenu: tenu ? BIP_AFTER_MS : firstSilence,
          }, tenu);
          return;
        }
        if (st.phase === 'reprise') {
          // Reprise avant le signal : comptée (R §3.3), puis on suit la suite de la réponse.
          if (firstSilence === null) firstSilence = st.silenceHeldMs;
          startAt = st.speechOnset;
        }
      });
    });
  }

  function result(m, take) {
    const v = m.values;
    const labels = eclairLabels({
      delaiSec: v.delaiReponse != null ? v.delaiReponse / 1000 : null,
      silenceSec: v.silenceTenu != null ? v.silenceTenu / 1000 : null,
      tenu: m.tenu,
      dureeSec: v.dureeReponse != null ? v.dureeReponse / 1000 : null,
    });
    const boxes = step.criteres.map((c) => h('input', { type: 'checkbox' }));
    show(
      h('p', { class: 'label' }, 'Le prospect a dit'),
      h('p', { class: 'say small' }, step.replique),
      labels.length ? h('ul', { class: 'eclair-labels' }, labels.map((t) => h('li', {}, t))) : h('p', { class: 'muted small' }, 'Pas de mesure fiable cette fois.'),
      take?.blob?.size ? h('button', { class: 'btn-secondary', onclick: () => player.play(take.blob) }, '▶ Réécouter ta réponse') : null,
      h('p', { class: 'label' }, 'En réécoutant, coche ce qui est vrai :'),
      step.criteres.map((c, i) => h('label', { class: 'check' }, boxes[i], h('span', {}, c))),
      btn('Valider', () => { player.stop(); onCriteres(boxes.map((b) => b.checked)); onDone(); }));
  }

  function closeMeter() {
    const m = meter;
    meter = null;
    m?.close().catch(() => {});
  }

  function cleanup() {
    token += 1;
    stopSpeaking();
    stopAnswer = null;
    if (recorder) { recorder.cancel(); recorder = null; }
    closeMeter();
    running = false;
  }

  intro();
  return {
    el,
    settled: () => pending,
    pause() {
      if (running) { cleanup(); interrupted = true; }
    },
    resume() {
      if (!interrupted) return;
      interrupted = false;
      intro(h('p', { class: 'muted small' }, 'Réplique interrompue : on la reprend depuis le début.'));
    },
    destroy() { cleanup(); player.stop(); destroyed = true; },
  };
}
