import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarUrl, alarmLabel } from '../js/core/reminder.js';

test('calendarUrl : événement quotidien avec lien vers la séance', () => {
  const u = new URL(calendarUrl({ dateKey: '2026-10-10', time: '08:30', why: 'Être clair', appUrl: 'https://x.github.io/ohmaparole/' }));
  assert.equal(u.hostname, 'calendar.google.com');
  assert.equal(u.searchParams.get('action'), 'TEMPLATE');
  assert.equal(u.searchParams.get('dates'), '20261010T083000/20261010T083500');
  assert.equal(u.searchParams.get('recur'), 'RRULE:FREQ=DAILY');
  assert.equal(u.searchParams.get('ctz'), 'Europe/Paris');
  assert.equal(u.searchParams.get('details'), 'https://x.github.io/ohmaparole/#/session/daily');
  assert.equal(u.searchParams.get('text'), 'OhMaParole 5 min, pour : Être clair');
});

test('alarmLabel coupe le pourquoi à 40 caractères', () => {
  const l = alarmLabel('a'.repeat(60));
  assert.ok(l.endsWith('…'));
  assert.equal(l.length, 'OhMaParole 5 min, pour : '.length + 40);
  assert.equal(alarmLabel(''), 'OhMaParole 5 min');
});
