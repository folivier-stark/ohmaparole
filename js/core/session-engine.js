// Machine à états PURE. Le temps se calcule par différence d'horodatages,
// jamais en comptant des ticks (setInterval est gelé en arrière-plan).

export const COUNT_THRESHOLD_MS = 60000;

export function createRun(steps, now) {
  return {
    steps,
    index: 0,
    stepStartedAt: now,
    pausedAt: null,
    pausedMs: 0,
    practicedMs: 0,
    status: steps.length ? 'running' : 'done',
  };
}

export function currentStep(s) {
  return s.status === 'done' ? null : s.steps[s.index];
}

export function stepElapsedMs(s, now) {
  if (s.status === 'done') return 0;
  const ref = s.pausedAt ?? now;
  return Math.max(0, ref - s.stepStartedAt - s.pausedMs);
}

export function remainingMs(s, now) {
  const st = currentStep(s);
  if (!st) return 0;
  return Math.max(0, st.durationSec * 1000 - stepElapsedMs(s, now));
}

function doneInStep(s, now) {
  return Math.min(stepElapsedMs(s, now), currentStep(s).durationSec * 1000);
}

function advanceTo(s, nextIndex, now) {
  const practiced = s.practicedMs + doneInStep(s, now);
  if (nextIndex >= s.steps.length) {
    return { ...s, index: s.steps.length, practicedMs: practiced, pausedAt: null, pausedMs: 0, status: 'done' };
  }
  return { ...s, index: nextIndex, stepStartedAt: now, pausedAt: null, pausedMs: 0, practicedMs: practiced, status: 'running' };
}

export function tick(s, now) {
  if (s.status !== 'running') return s;
  return remainingMs(s, now) === 0 ? advanceTo(s, s.index + 1, now) : s;
}

export function next(s, now) {
  return s.status === 'done' ? s : advanceTo(s, s.index + 1, now);
}

export function pause(s, now) {
  return s.status === 'running' ? { ...s, status: 'paused', pausedAt: now } : s;
}

export function resume(s, now) {
  if (s.status !== 'paused') return s;
  return { ...s, status: 'running', pausedMs: s.pausedMs + (now - s.pausedAt), pausedAt: null };
}

export function skipBlock(s, now) {
  if (s.status === 'done') return s;
  const block = currentStep(s).block;
  let i = s.index + 1;
  while (i < s.steps.length && s.steps[i].block === block) i++;
  return advanceTo(s, i, now);
}

export function stop(s, now) {
  return s.status === 'done' ? s : advanceTo(s, s.steps.length, now);
}

export function practicedMs(s, now) {
  return s.status === 'done' ? s.practicedMs : s.practicedMs + doneInStep(s, now);
}

export function isCounted(ms) {
  return ms >= COUNT_THRESHOLD_MS;
}

export function pausedForMs(s, now) {
  return s.status === 'paused' ? now - s.pausedAt : 0;
}
