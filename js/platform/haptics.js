let enabled = true;
const PATTERNS = { count: [40], tick: [50], block: [60, 80, 60], start: [120], end: [200, 100, 200, 100, 200] };

export function setHapticsEnabled(v) {
  enabled = Boolean(v);
}

export function buzz(name) {
  if (enabled && navigator.vibrate) navigator.vibrate(PATTERNS[name] ?? [50]);
}
