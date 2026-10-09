import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, tick, next, pause, resume, skipBlock, stop, restartStep,
  remainingMs, practicedMs, isCounted, pausedForMs, currentStep,
} from '../js/core/session-engine.js';

const steps = [
  { block: 'A', durationSec: 30 },
  { block: 'A', durationSec: 30 },
  { block: 'B', durationSec: 60 },
];

test('createRun démarre au premier pas', () => {
  const r = createRun(steps, 0);
  assert.equal(r.index, 0);
  assert.equal(r.status, 'running');
  assert.equal(remainingMs(r, 10000), 20000);
  assert.equal(currentStep(r), steps[0]);
});

test('tick passe au pas suivant quand le temps est écoulé', () => {
  let r = createRun(steps, 0);
  r = tick(r, 29000);
  assert.equal(r.index, 0);
  r = tick(r, 30000);
  assert.equal(r.index, 1);
  assert.equal(r.practicedMs, 30000);
  assert.equal(remainingMs(r, 30000), 30000);
});

test('le temps en pause ne compte pas', () => {
  let r = createRun(steps, 0);
  r = pause(r, 10000);
  assert.equal(r.status, 'paused');
  r = resume(r, 70000);
  assert.equal(remainingMs(r, 70000), 20000);
  assert.equal(practicedMs(r, 70000), 10000);
});

test('next termine un pas en avance', () => {
  let r = createRun(steps, 0);
  r = next(r, 5000);
  assert.equal(r.index, 1);
  assert.equal(r.practicedMs, 5000);
});

test('restartStep repart à zéro sur le pas courant et garde le temps pratiqué', () => {
  let r = createRun(steps, 0);
  r = tick(r, 30000);
  r = pause(r, 40000);
  r = resume(r, 100000);
  r = restartStep(r, 100000);
  assert.equal(r.index, 1);
  assert.equal(r.status, 'running');
  assert.equal(remainingMs(r, 100000), 30000);
  assert.equal(r.practicedMs, 40000);
  assert.equal(practicedMs(r, 105000), 45000);
  const p = pause(createRun(steps, 0), 1000);
  assert.equal(restartStep(p, 5000), p);
});

test('skipBlock saute au bloc suivant', () => {
  let r = createRun(steps, 0);
  r = skipBlock(r, 1000);
  assert.equal(r.index, 2);
  assert.equal(currentStep(r).block, 'B');
  assert.equal(r.status, 'running');
});

test('stop termine et garde le temps pratiqué', () => {
  let r = createRun(steps, 0);
  r = tick(r, 30000);
  r = stop(r, 45000);
  assert.equal(r.status, 'done');
  assert.equal(r.practicedMs, 45000);
  assert.equal(currentStep(r), null);
});

test('fin naturelle', () => {
  let r = createRun(steps, 0);
  r = tick(r, 30000);
  r = tick(r, 60000);
  r = tick(r, 120000);
  assert.equal(r.status, 'done');
  assert.equal(r.practicedMs, 120000);
});

test("saut d'horloge : le temps d'un pas est plafonné à sa durée", () => {
  let r = createRun(steps, 0);
  r = tick(r, 600000);
  assert.equal(r.index, 1);
  assert.equal(r.practicedMs, 30000);
});

test('règle des 60 s', () => {
  assert.equal(isCounted(59999), false);
  assert.equal(isCounted(60000), true);
});

test('pausedForMs', () => {
  const r = pause(createRun(steps, 0), 1000);
  assert.equal(pausedForMs(r, 5000), 4000);
  assert.equal(pausedForMs(createRun(steps, 0), 5000), 0);
});

test('pas sans limite (bloc voix) : jamais avancé par le temps, tout le temps passé compte', () => {
  const st = [{ block: 'voix', durationSec: 120, untimed: true }, { block: 'B', durationSec: 60 }];
  let r = createRun(st, 0);
  r = tick(r, 500000);
  assert.equal(r.index, 0, 'le bloc voix avance seulement quand il a fini');
  assert.equal(remainingMs(r, 500000), 0);
  assert.equal(practicedMs(r, 200000), 200000, 'pas plafonné à la durée nominale');
  r = pause(r, 200000);
  r = resume(r, 260000);
  assert.equal(practicedMs(r, 300000), 240000, 'la pause ne compte pas');
  r = next(r, 300000);
  assert.equal(r.index, 1);
  assert.equal(r.practicedMs, 240000);
  assert.equal(isCounted(r.practicedMs), true);
});
