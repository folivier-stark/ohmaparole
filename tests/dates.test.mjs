process.env.TZ = 'Europe/Paris';
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, diffDays, addDays, daysInMonth, weekdayMon0, MONTHS_FR } from '../js/core/dates.js';

test("dayKey utilise l'heure locale (00h30 à Paris = jour suivant en UTC)", () => {
  assert.equal(dayKey(Date.UTC(2026, 9, 9, 22, 30)), '2026-10-10');
  assert.equal(dayKey(Date.UTC(2026, 9, 9, 21, 59)), '2026-10-09');
});

test("diffDays traverse le passage à l'heure d'hiver", () => {
  assert.equal(diffDays('2026-10-24', '2026-10-26'), 2);
  assert.equal(diffDays('2026-10-26', '2026-10-24'), -2);
});

test("addDays change de mois et d'année", () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('daysInMonth', () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 10), 31);
});

test('weekdayMon0 : lundi = 0, dimanche = 6', () => {
  assert.equal(weekdayMon0('2026-10-05'), 0);
  assert.equal(weekdayMon0('2026-10-11'), 6);
});

test('MONTHS_FR', () => {
  assert.equal(MONTHS_FR.length, 12);
  assert.equal(MONTHS_FR[9], 'octobre');
});
