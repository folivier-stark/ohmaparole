let lock = null;
let wanted = false;

async function acquire() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
  } catch {
    lock = null;
  }
}

function onVisibility() {
  if (wanted && document.visibilityState === 'visible') acquire();
}

export async function keepAwake() {
  wanted = true;
  document.addEventListener('visibilitychange', onVisibility);
  await acquire();
}

export function releaseAwake() {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibility);
  lock?.release().catch(() => {});
  lock = null;
}
