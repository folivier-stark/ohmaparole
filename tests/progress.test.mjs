import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyCount, totalCount, monthCount, monthGrid, milestonesUpTo, nextMilestone, dueMilestone,
  homeStatus, pendingFeedback, historyIds, lastBloc3, lastConsigneId, recentFeedback,
  backupDue, whyCheckDue, referenceMilestones,
} from '../js/core/progress.js';

const S = (o) => ({ type: 'daily', counted: true, startedAt: 0, endedAt: 0, itemIds: [], ...o });
const H = 3600000;
const D = 24 * H;

test('dailyCount et totalCount ne comptent que les séances comptées', () => {
  const ss = [
    S({ dateKey: '2026-10-01' }),
    S({ dateKey: '2026-10-02', counted: false }),
    S({ dateKey: '2026-10-02', type: 'prerdv' }),
    S({ dateKey: '2026-10-03', type: 'comeback' }),
  ];
  assert.equal(dailyCount(ss), 2);
  assert.equal(totalCount(ss), 3);
});

test('monthCount compte des jours distincts du mois', () => {
  const ss = [S({ dateKey: '2026-10-01' }), S({ dateKey: '2026-10-01' }), S({ dateKey: '2026-10-05', type: 'prerdv' }), S({ dateKey: '2026-09-30' })];
  assert.equal(monthCount(ss, 2026, 10), 2);
});

test('monthGrid', () => {
  const g = monthGrid([S({ dateKey: '2026-10-01' }), S({ dateKey: '2026-10-02', type: 'prerdv' })], 2026, 10, '2026-10-09');
  assert.equal(g.leading, 3);
  assert.equal(g.cells.length, 31);
  assert.equal(g.cells[0].kind, 'session');
  assert.equal(g.cells[1].kind, 'rdv');
  assert.equal(g.cells[2].kind, 'none');
  assert.equal(g.cells[8].today, true);
  assert.equal(g.cells[9].kind, 'future');
});

test('jalons', () => {
  assert.deepEqual(milestonesUpTo(6), [1]);
  assert.deepEqual(milestonesUpTo(30), [1, 7, 14, 30]);
  assert.deepEqual(milestonesUpTo(95), [1, 7, 14, 30, 60, 90]);
  assert.equal(nextMilestone(1), 7);
  assert.equal(nextMilestone(14), 30);
  assert.equal(nextMilestone(30), 60);
  assert.equal(nextMilestone(61), 90);
});

test('dueMilestone : le plus récent jalon atteint, s il manque', () => {
  assert.equal(dueMilestone(1, []), 1);
  assert.equal(dueMilestone(3, [1]), null);
  assert.equal(dueMilestone(7, [1]), 7);
  assert.equal(dueMilestone(9, [1]), 7);
  assert.equal(dueMilestone(9, [1, 7]), null);
  assert.equal(dueMilestone(15, [1]), 14);
});

test('homeStatus', () => {
  const one = (d) => [S({ dateKey: d })];
  assert.equal(homeStatus(one('2026-10-09'), '2026-10-09').doneToday, true);
  assert.equal(homeStatus(one('2026-10-08'), '2026-10-09').daysWithout, 0);
  const y = homeStatus(one('2026-10-07'), '2026-10-09');
  assert.equal(y.yesterdayOff, true);
  assert.equal(y.comeback, false);
  const two = homeStatus(one('2026-10-06'), '2026-10-09');
  assert.equal(two.daysWithout, 2);
  assert.equal(two.yesterdayOff, true);
  assert.equal(two.comeback, false);
  const three = homeStatus(one('2026-10-05'), '2026-10-09');
  assert.equal(three.comeback, true);
  assert.equal(three.yesterdayOff, false);
  assert.equal(homeStatus(one('2026-10-08'), '2026-10-09').yesterdayOff, false);
  assert.equal(homeStatus([], '2026-10-09').daysWithout, null);
  assert.equal(homeStatus([], '2026-10-09').comeback, false);
});

test('pendingFeedback : au moins 1 h après, au plus 3 jours', () => {
  const rdv = S({ id: 'r', type: 'prerdv', dateKey: '2026-10-09', endedAt: 0, feedback: null, practicedSec: 90 });
  assert.equal(pendingFeedback([rdv], 0.5 * H), null);
  assert.equal(pendingFeedback([rdv], 2 * H).id, 'r');
  assert.equal(pendingFeedback([{ ...rdv, feedback: 'non' }], 2 * H), null);
  assert.equal(pendingFeedback([{ ...rdv, feedbackSkipped: true }], 2 * H), null);
  assert.equal(pendingFeedback([rdv], 4 * D), null);
});

test('pendingFeedback : un RDV écourté mais réel (≥ 30 s) compte, pas un simple essai', () => {
  const rdv = S({ id: 'r', type: 'prerdv', dateKey: '2026-10-09', endedAt: 0, feedback: null });
  assert.equal(pendingFeedback([{ ...rdv, counted: false, practicedSec: 45 }], 2 * H).id, 'r');
  assert.equal(pendingFeedback([{ ...rdv, counted: false, practicedSec: 30 }], 2 * H).id, 'r');
  assert.equal(pendingFeedback([{ ...rdv, counted: true, practicedSec: 10 }], 2 * H), null);
  assert.equal(pendingFeedback([{ ...rdv, counted: false }], 2 * H), null);
});

test('historyIds, lastBloc3, lastConsigneId', () => {
  const ss = [
    S({ startedAt: 1, itemIds: ['a'], bloc3: 'ecoute' }),
    S({ startedAt: 2, type: 'prerdv', consigneId: 'fr.C03' }),
    S({ startedAt: 3, itemIds: ['b', 'c'], bloc3: 'posture' }),
  ];
  assert.deepEqual(historyIds(ss), ['b', 'c', 'a']);
  assert.equal(lastBloc3(ss), 'posture');
  assert.equal(lastConsigneId(ss), 'fr.C03');
  assert.equal(lastBloc3([]), null);
});

test('lastBloc3 ignore les séances non comptées', () => {
  const ss = [
    S({ startedAt: 1, bloc3: 'ecoute' }),
    S({ startedAt: 2, bloc3: 'posture', counted: false }),
  ];
  assert.equal(lastBloc3(ss), 'ecoute');
});

test('recentFeedback', () => {
  const ss = [1, 2, 3, 4, 5, 6, 7].map((i) => S({ type: 'prerdv', startedAt: i, feedback: i % 2 ? 'non' : 'une' }));
  assert.deepEqual(recentFeedback(ss, 6), ['une', 'non', 'une', 'non', 'une', 'non']);
});

test('backupDue et whyCheckDue', () => {
  assert.equal(backupDue(null, 0, 2), false);
  assert.equal(backupDue(null, 0, 3), true);
  assert.equal(backupDue(0, 10 * D, 5), false);
  assert.equal(backupDue(0, 15 * D, 5), true);
  assert.equal(whyCheckDue(6, 0), false);
  assert.equal(whyCheckDue(7, 0), true);
  assert.equal(whyCheckDue(10, 7), false);
  assert.equal(whyCheckDue(14, 7), true);
});

test('referenceMilestones', () => {
  assert.deepEqual(referenceMilestones([
    { kind: 'reference', milestone: 1 }, { kind: 'session', milestone: null }, { kind: 'reference', milestone: 7 },
  ]), [1, 7]);
});
