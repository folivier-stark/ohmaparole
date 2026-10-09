// Câblage de js/audio/recorder.js sous Node : MediaRecorder et getUserMedia sont simulés.
import test from 'node:test';
import assert from 'node:assert/strict';

class FakeTrack { constructor() { this.stopped = false; } stop() { this.stopped = true; } }
class FakeStream { constructor() { this.track = new FakeTrack(); } getTracks() { return [this.track]; } }
let gum = 0;
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'navigator', {
  value: { mediaDevices: { getUserMedia: async () => { gum += 1; return new FakeStream(); } } }, configurable: true,
});
globalThis.MediaRecorder = class {
  static isTypeSupported() { return true; }
  constructor(stream, opts) { this.stream = stream; this.mimeType = opts?.mimeType ?? ''; this.state = 'inactive'; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['x']) }); this.onstop?.(); }
};

const { startRecording } = await import('../js/audio/recorder.js');

test('startRecording : sans flux, ouvre le micro et le coupe à l’arrêt', async () => {
  gum = 0;
  const rec = await startRecording();
  assert.equal(gum, 1);
  const out = await rec.stop();
  assert.ok(out.blob.size > 0);
});

test('startRecording({ stream }) : enregistre sur le flux donné, sans getUserMedia, sans couper ses pistes', async () => {
  gum = 0;
  const stream = new FakeStream();
  const rec = await startRecording({ stream });
  assert.equal(gum, 0, 'un seul getUserMedia : celui du compteur de niveau');
  await rec.stop();
  assert.equal(stream.track.stopped, false, 'le flux appartient à l’appelant (compteur de niveau)');
  const rec2 = await startRecording({ stream });
  rec2.cancel();
  assert.equal(stream.track.stopped, false);
});
