export function createPlayer() {
  let audio = null;
  let url = null;

  function stop() {
    if (audio) {
      audio.onended = null;
      audio.pause();
    }
    if (url) URL.revokeObjectURL(url);
    audio = null;
    url = null;
  }

  function play(blob, onEnded) {
    stop();
    if (!blob) return Promise.resolve();
    url = URL.createObjectURL(blob);
    audio = new Audio(url);
    audio.onended = () => onEnded?.();
    return audio.play().catch(() => {});
  }

  return { play, stop };
}
