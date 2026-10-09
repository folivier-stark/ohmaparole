const TYPES = ['audio/webm;codecs=opus', 'audio/mp4;codecs=opus', 'audio/mp4'];

export function pickMimeType() {
  return TYPES.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) ?? '';
}

/**
 * Ouvre le micro et démarre une prise (sans timeslice, pour que Chrome écrive la durée).
 * Retourne { stop(): Promise<{blob, mimeType, durationMs}|null>, cancel() }.
 * Le contrôle automatique de gain est coupé, sinon la comparaison J1/J30 est faussée.
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  });
  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const startedAt = performance.now();
  rec.start();
  let stopped = false;
  return {
    stop() {
      if (stopped) return Promise.resolve(null);
      stopped = true;
      const result = () => {
        release();
        const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
        return { blob, mimeType: blob.type, durationMs: Math.round(performance.now() - startedAt) };
      };
      // Déjà arrêté (micro coupé par le système, page en arrière-plan) : onstop ne viendra plus.
      if (rec.state === 'inactive') return Promise.resolve(result());
      return new Promise((resolve) => {
        rec.onstop = () => resolve(result());
        rec.stop();
      });
    },
    cancel() {
      if (stopped) return;
      stopped = true;
      rec.onstop = release;
      rec.stop();
    },
  };
}
