import { h } from '../dom.js';
import { openMicStream, createLevelMeter, measureSilenceAfter } from '../../audio/live-level.js';
import { heldSilence, liveThreshold, liveRows } from '../../core/live-silence.js';
import { buzz } from '../../platform/haptics.js';
import { stopSpeaking } from '../../platform/speech.js';

const ROOM_MS = 1500;
const MAX_WAIT_MS = 20000; // sans parole au-delà : on arrête l'essai, rien n'est stocké
const MAX_OVER_TARGET_MS = 20000;
const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Les phrases de l'exercice (texte unique ou liste). */
const phrases = (item) => (Array.isArray(item.texte) ? item.texte : item.texte ? [item.texte] : []);

/**
 * Silences et délais au micro dans un exercice de posture (spec V2 §6, eval-posture.md §6.3 rang 1).
 * RIEN N'EST ENREGISTRÉ : un compteur de niveau seulement, et des nombres dans `measures`.
 * - Facultatif : un tap lance la mesure (il donne aussi le geste qu'exige l'AudioContext).
 * - 1,5 s d'écoute de la pièce, puis le seuil : calibration de la voix, ou bruit + 12 dB (live-silence.js).
 * - Silence : Fred dit la phrase, se tait ; au bout de la cible, une vibration de 50 ms (le « bip » de la
 *   consigne) ; le silence s'arrête quand il reparle (la phrase suivante, puis « Merci » pour finir).
 * - Délai (P03) : la question s'affiche, vibration à 2 s, délai jusqu'à la réponse (measureSilenceAfter).
 * - Aucun chiffre ni alerte pendant l'exercice : l'auto-évaluation « posé » reste prioritaire (P §7.1).
 * - Une mesure interrompue, abandonnée ou trop longue n'est pas stockée.
 * @returns {{ el, destroy(), settled(): Promise<void> }}
 */
export function createPostureMic({ item, config, calibration, record, saveRows }) {
  const el = h('div', { class: 'posture-mic' });
  const ctl = new AbortController();
  let meter = null;
  let destroyed = false;
  let paused = false;
  let pending = Promise.resolve();
  let stored = 0;
  const show = (...nodes) => { if (!destroyed) el.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null)); };
  const note = (t) => h('p', { class: 'muted small' }, t);

  function store(trial, values) {
    const rows = liveRows({
      sessionId: record.id, dateKey: record.dateKey, createdAt: Date.now(), kind: 'posture', trial, values,
      context: { exercise: item.id, cibleSec: config.cibleSec, seuil: threshold.source },
    });
    stored += rows.length;
    pending = pending.then(() => saveRows(rows)).catch((e) => console.error(e));
  }

  let threshold = { thresholdDb: null, source: null };

  async function start() {
    stopSpeaking();
    show(note('Le micro écoute la pièce… silence.'));
    try {
      meter = await createLevelMeter(await openMicStream(), { stopTracksOnClose: true });
    } catch {
      show(note('Micro indisponible : fais l’exercice sans mesure.'));
      return;
    }
    // Pause (ou écran quitté) arrivée pendant l'ouverture du micro : on ferme tout.
    if (destroyed || paused) { close(); if (paused) show(note('Mesure arrêtée pendant la pause.')); return; }
    const t0 = performance.now();
    await wait(ROOM_MS);
    if (destroyed) return;
    threshold = liveThreshold({ calibration, roomLevels: meter.history().filter((l) => l.t >= t0) });
    if (threshold.thresholdDb === null || threshold.tooNoisy) {
      show(note('Trop de bruit pour mesurer ici : fais l’exercice sans mesure.'));
      close();
      return;
    }
    if (config.mesure === 'delai') await runDelai();
    else await runSilence();
    if (!destroyed) show(note(stored ? 'Mesuré. Les chiffres sont dans Progression.' : 'Pas de mesure cette fois.'));
    close();
  }

  /** Silence après la phrase : un essai par phrase, puis « Merci » pour fermer le dernier silence. */
  function runSilence() {
    const list = phrases(item);
    const n = Math.min(config.essais, Math.max(1, list.length));
    const target = config.cibleSec * 1000;
    const levels = [];
    let trial = 1;
    let startAt = performance.now();
    let buzzed = false;
    const prompt = (i) => show(
      h('p', { class: 'label' }, `Essai ${i} sur ${n}`),
      list[i - 1] ? h('p', { class: 'say small' }, list[i - 1]) : null,
      note('Dis-la, puis tais-toi jusqu’au signal.'));
    prompt(1);
    return new Promise((resolve) => {
      let off = () => {};
      const finish = () => { off(); resolve(); };
      ctl.signal.addEventListener('abort', finish, { once: true });
      off = meter.onLevel((l) => {
        levels.push(l);
        const st = heldSilence(levels, { thresholdDb: threshold.thresholdDb, startAt });
        if (st.interrupted) { show(note('Mesure coupée : on continue sans.')); finish(); return; }
        if (st.phase === 'attente' && st.waitingMs > MAX_WAIT_MS) { finish(); return; }
        if (st.phase === 'silence') {
          if (!buzzed && st.silenceHeldMs >= target) {
            buzzed = true;
            buzz('tick');
            if (trial < n) prompt(trial + 1);
            else show(h('p', { class: 'say small' }, '« Merci. »'), note('Dis-le pour finir.'));
          }
          if (st.silenceHeldMs > target + MAX_OVER_TARGET_MS) finish();
          return;
        }
        if (st.phase === 'reprise') {
          store(trial, { silenceTenu: st.silenceHeldMs });
          // La reprise est la phrase suivante (ou « Merci ») : l'essai suivant part d'elle.
          if (!buzzed && trial < n) prompt(trial + 1);
          if (trial >= n) { finish(); return; }
          trial += 1;
          startAt = st.speechOnset;
          buzzed = false;
        }
      });
    });
  }

  /** Délai avant de répondre (P03) : question affichée, vibration à la cible, délai jusqu'à la réponse. */
  async function runDelai() {
    const list = phrases(item);
    const n = Math.min(config.essais, list.length);
    for (let i = 1; i <= n; i++) {
      await new Promise((go) => show(
        h('p', { class: 'label' }, `Question ${i} sur ${n}`),
        h('button', { class: 'btn-secondary', onclick: go }, 'Afficher la question')));
      if (destroyed) return;
      show(h('p', { class: 'say small' }, list[i - 1]), note('Regarde, respire. Réponds après le signal.'));
      const startAt = performance.now();
      const bip = setTimeout(() => buzz('tick'), config.cibleSec * 1000);
      const r = await measureSilenceAfter(meter, { thresholdDb: threshold.thresholdDb, startAt, maxMs: 15000, signal: ctl.signal });
      clearTimeout(bip);
      if (destroyed || r.aborted) return;
      if (r.done && !r.interrupted && !r.timedOut) store(i, { delaiReponse: r.latencyMs });
      if (r.interrupted) { show(note('Mesure coupée : on continue sans.')); return; }
      if (i < n) await wait(1500); // le temps de finir la réponse avant la question suivante
    }
  }

  function close() {
    const m = meter;
    meter = null;
    m?.close().catch(() => {});
  }

  show(
    h('button', { class: 'btn-secondary', onclick: () => { start().catch((e) => { console.error(e); close(); }); } },
      'Mesurer mes silences au micro'),
    note('Facultatif. Rien n’est enregistré : seulement la durée de tes silences.'));

  return {
    el,
    settled: () => pending,
    /** Pause : la mesure s'arrête (une mesure qui traverse une pause serait fausse). */
    pause() {
      paused = true;
      ctl.abort();
      if (!meter) return;
      close();
      show(note('Mesure arrêtée pendant la pause.'));
    },
    destroy() {
      destroyed = true;
      ctl.abort();
      close();
    },
  };
}
