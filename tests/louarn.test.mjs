import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJson } from './helpers.mjs';
import { addDays } from '../js/core/dates.js';
import { programPosition } from '../js/core/planner.js';
import { dailyCount } from '../js/core/progress.js';
import * as L from '../js/core/louarn.js';
import { foxSvg } from '../js/ui/components/fox-art.js';

const DATA = readJson('content/fr/louarn.json');
const LINES = DATA.repliques;
const PROGRAM = readJson('content/program.json');
const readText = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const G = readText('docs/experts/expert-gamification.md');
const G_LINES = JSON.parse(G.match(/## 3\.[\s\S]*?```json\n([\s\S]*?)\n```/)[1]);
const G_SVGS = [...G.matchAll(/```svg\n([\s\S]*?)\n```/g)].map((m) => m[1]);

const DAY = 86400000;
const S = (o = {}) => ({
  id: 's', type: 'daily', counted: true, completed: true, dateKey: '2026-10-01', startedAt: 0, endedAt: 0, practicedSec: 300, ...o,
});
/** n séances quotidiennes comptées, une par jour à 9 h (UTC) à partir de `from`. */
const dailies = (n, from = '2026-10-01', o = {}) => Array.from({ length: n }, (_, i) => S({
  id: `d${i}`, dateKey: addDays(from, i), startedAt: Date.parse(`${from}T09:00:00Z`) + i * DAY, ...o,
}));
const REC = (o = {}) => ({ id: 'r', kind: 'reference', milestone: 1, createdAt: Date.UTC(2026, 9, 1), dateKey: '2026-10-01', ...o });
const ids = (list) => list.map((x) => x.id);

// ---------- Stades ----------

test('6 stades, avec leurs noms et les seuils 0, 12, 24, 36, 48 et 72', () => {
  assert.deepEqual(L.STAGES.map((s) => [s.id, s.nom, s.seuil]), [
    [1, 'Renardeau', 0], [2, 'Jeune renard', 12], [3, 'Renard d’aplomb', 24],
    [4, 'Renard assuré', 36], [5, 'Renard posé', 48], [6, 'Renard charismatique', 72],
  ]);
});

test('stageFor : les bornes de chaque stade (G §4.6)', () => {
  const cases = [[0, 1], [11, 1], [12, 2], [23, 2], [24, 3], [35, 3], [36, 4], [47, 4], [48, 5], [71, 5], [72, 6], [200, 6]];
  for (const [n, id] of cases) assert.equal(L.stageFor(n).id, id, `n = ${n}`);
  for (const n of [-3, Number.NaN, undefined, null]) assert.equal(L.stageFor(n).id, 1, `n = ${n}`);
});

test('stageFor ne régresse jamais : un historique qui s’allonge ne fait jamais baisser le stade', () => {
  const kinds = [{ type: 'daily', counted: true }, { type: 'prerdv', counted: true }, { type: 'daily', counted: false }, { type: 'comeback', counted: true }];
  const sessions = [];
  let prev = 1;
  for (let i = 0; i < 300; i++) {
    sessions.push(S({ id: `s${i}`, dateKey: addDays('2026-10-01', i), startedAt: i, ...kinds[i % kinds.length] }));
    const id = L.stageFor(dailyCount(sessions)).id;
    assert.ok(id >= prev, `séance ${i}`);
    prev = id;
  }
  assert.equal(prev, 6);
  for (let n = 0; n < 300; n++) assert.ok(L.stageFor(n + 1).id >= L.stageFor(n).id, `n = ${n}`);
});

test('nextStage : le stade suivant et les séances restantes, null au stade 6', () => {
  assert.deepEqual(L.nextStage(0), { stage: L.STAGES[1], remaining: 12 });
  assert.equal(L.nextStage(11).remaining, 1);
  assert.deepEqual(L.nextStage(23), { stage: L.STAGES[2], remaining: 1 });
  assert.deepEqual(L.nextStage(48), { stage: L.STAGES[5], remaining: 24 });
  assert.equal(L.nextStage(71).stage.id, 6);
  assert.equal(L.nextStage(72), null);
  assert.equal(L.nextStage(500), null);
});

test('stageUp : le stade atteint par la séance, sinon null', () => {
  assert.equal(L.stageUp(11, 12).id, 2);
  assert.equal(L.stageUp(23, 24).id, 3);
  assert.equal(L.stageUp(35, 36).id, 4);
  assert.equal(L.stageUp(47, 48).id, 5);
  assert.equal(L.stageUp(71, 72).id, 6);
  for (const [a, b] of [[12, 13], [0, 1], [0, 0], [72, 73], [24, 24], [30, 20]]) assert.equal(L.stageUp(a, b), null, `${a} → ${b}`);
  assert.equal(L.stageUp(10, 40).id, 4, 'saut (restauration) : le plus haut stade atteint');
});

// ---------- Thèmes et blocs ----------

test('themeCompleted : toutes les 4 séances, renvoie le numéro du thème terminé', () => {
  assert.equal(L.themeCompleted(3, 4, 4), 1);
  assert.equal(L.themeCompleted(19, 20, 4), 5);
  assert.equal(L.themeCompleted(71, 72, 4), 18);
  assert.equal(L.themeCompleted(75, 76, 4), 19, 'cycle 2 : la numérotation continue');
  for (const [a, b] of [[4, 5], [5, 7], [0, 0], [8, 8], [9, 4]]) assert.equal(L.themeCompleted(a, b, 4), null, `${a} → ${b}`);
  assert.equal(L.themeCompleted(4, 5, 5), 1, 'sessionsPerWeek en paramètre');
  assert.equal(L.themeCompleted(3, 4), 1, '4 par défaut');
});

test('blockCompleted : toutes les 24 séances, renvoie le numéro du bloc terminé', () => {
  assert.equal(L.blockCompleted(23, 24, 4), 1);
  assert.equal(L.blockCompleted(47, 48, 4), 2);
  assert.equal(L.blockCompleted(71, 72, 4), 3);
  assert.equal(L.blockCompleted(95, 96, 4), 4);
  for (const [a, b] of [[24, 25], [20, 23], [48, 48], [0, 0]]) assert.equal(L.blockCompleted(a, b, 4), null, `${a} → ${b}`);
  assert.equal(L.blockCompleted(23, 24), 1, '4 par défaut');
});

test('themePosition : thème et étape de la prochaine séance, aligné sur le planner', () => {
  assert.deepEqual(L.themePosition(0), { cycle: 1, theme: 1, step: 1, doneInTheme: 0, themesDone: 0, bloc: 1, complete: false });
  assert.deepEqual(L.themePosition(23), { cycle: 1, theme: 6, step: 4, doneInTheme: 3, themesDone: 5, bloc: 1, complete: false });
  assert.deepEqual(L.themePosition(24), { cycle: 1, theme: 7, step: 1, doneInTheme: 0, themesDone: 6, bloc: 2, complete: false });
  assert.deepEqual(L.themePosition(72), { cycle: 2, theme: 1, step: 1, doneInTheme: 0, themesDone: 0, bloc: 1, complete: true });
  for (let n = 0; n < 160; n++) {
    const p = L.themePosition(n, 4, 18);
    const q = programPosition(n + 1, 18, 4);
    assert.deepEqual([p.cycle, p.theme], [q.cycle, q.week], `n = ${n}`);
  }
});

test('themeTag : thème débloqué, langues à 72, cycle 2 à 73 (G §2.3)', () => {
  assert.equal(L.themeTag(3, 4), 'theme:2');
  assert.equal(L.themeTag(19, 20), 'theme:6');
  assert.equal(L.themeTag(67, 68), 'theme:18');
  assert.equal(L.themeTag(71, 72), 'theme:langues');
  assert.equal(L.themeTag(72, 73), 'cycle:2');
  assert.equal(L.themeTag(4, 5), null);
  assert.equal(L.themeTag(75, 76), null, 'au cycle 2, G ne prévoit pas de réplique de thème');
});

test('contextTags : heure, bloc 3 et bloc du programme de la prochaine séance', () => {
  assert.deepEqual(L.contextTags({ hour: 8, bloc3: 'ecoute', dailyCount: 0 }), ['matin', 'ecoute']);
  assert.deepEqual(L.contextTags({ hour: 14, bloc3: 'posture', dailyCount: 24 }), ['posture', 'bloc>=2']);
  assert.deepEqual(L.contextTags({ hour: 18, dailyCount: 48 }), ['soir', 'bloc>=2', 'bloc>=3']);
  assert.deepEqual(L.contextTags({ hour: 12, dailyCount: 23 }), []);
  assert.deepEqual(L.contextTags({ hour: 12, dailyCount: 72 }), [], 'cycle 2 : retour au bloc 1');
  assert.deepEqual(L.contextTags({}), []);
});

// ---------- Répliques ----------

const T = [
  { id: 'g1', moment: 'accueil', texte: 'a' },
  { id: 'g2', moment: 'accueil', texte: 'b' },
  { id: 'g3', moment: 'accueil', texte: 'c' },
  { id: 'm1', moment: 'accueil', condition: 'matin', texte: 'd' },
  { id: 'e1', moment: 'accueil', condition: 'doneToday', texte: 'e' },
  { id: 'e2', moment: 'accueil', condition: 'doneToday', texte: 'f' },
  { id: 'f1', moment: 'fin', texte: 'g' },
  { id: 'j1', moment: 'jalon', condition: 'jalon:7', texte: 'h' },
  { id: 't1', moment: 'jalon', condition: 'trophee:premier-echo', texte: 'i' },
];
const days = (n) => Array.from({ length: n }, (_, i) => addDays('2026-10-01', i));

test('pickLine : déterministe pour un jour et un moment donnés', () => {
  for (const dayKey of days(30)) {
    const a = L.pickLine(T, { moment: 'accueil', dayKey });
    const b = L.pickLine(T, { moment: 'accueil', dayKey, context: [], recentIds: [] });
    assert.equal(a.id, b.id, dayKey);
    assert.ok(['g1', 'g2', 'g3'].includes(a.id), `${dayKey} : ${a.id}`);
  }
  const seen = new Set(days(30).map((dayKey) => L.pickLine(T, { moment: 'accueil', dayKey }).id));
  assert.ok(seen.size > 1, 'le jour fait varier le tirage');
  assert.equal(L.pickLine(T, { moment: 'fin', dayKey: '2026-10-09' }).id, 'f1');
});

test('pickLine : exclut les répliques récentes, et une réplique ne revient qu’après un tour complet', () => {
  for (const dayKey of days(10)) {
    assert.equal(L.pickLine(T, { moment: 'accueil', dayKey, recentIds: ['g1', 'g2'] }).id, 'g3');
    // Toutes vues : la moins récente revient.
    assert.equal(L.pickLine(T, { moment: 'accueil', dayKey, recentIds: ['g3', 'g1', 'g2'] }).id, 'g2');
  }
  let vus = [];
  const picked = days(3).map((dayKey) => {
    const line = L.pickLine(T, { moment: 'accueil', dayKey, recentIds: vus });
    vus = L.rememberLine(vus, line.id);
    return line.id;
  });
  assert.equal(new Set(picked).size, 3);
});

test('rememberLine : la plus récente en tête, sans doublon, 200 au plus', () => {
  assert.deepEqual(L.rememberLine(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
  assert.deepEqual(L.rememberLine([], 'x'), ['x']);
  const long = Array.from({ length: 250 }, (_, i) => `l${i}`);
  const out = L.rememberLine(long, 'new');
  assert.equal(out.length, 200);
  assert.equal(out[0], 'new');
  assert.deepEqual(L.rememberLine(['a', 'b', 'c'], 'd', 2), ['d', 'a']);
});

test('pickLine : une condition de contexte n’est éligible que si elle est vraie', () => {
  for (const dayKey of days(20)) assert.notEqual(L.pickLine(T, { moment: 'accueil', dayKey }).id, 'm1');
  assert.equal(L.pickLine(T, { moment: 'accueil', dayKey: '2026-10-09', context: ['matin'], recentIds: ['g1', 'g2', 'g3'] }).id, 'm1');
});

test('pickLine : une condition d’état vraie restreint le tirage à ses répliques', () => {
  for (const dayKey of days(20)) {
    const id = L.pickLine(T, { moment: 'accueil', dayKey, context: ['matin', 'doneToday'] }).id;
    assert.ok(['e1', 'e2'].includes(id), `${dayKey} : ${id}`);
  }
  // Un état sans réplique dans ce moment ne bloque rien : on revient aux génériques.
  assert.ok(['g1', 'g2', 'g3'].includes(L.pickLine(T, { moment: 'accueil', dayKey: '2026-10-09', context: ['yesterdayOff'] }).id));
  // Le premier état de la liste qui a des répliques gagne.
  assert.equal(L.pickLine(T, { moment: 'jalon', dayKey: '2026-10-09', context: ['trophee:premier-echo', 'jalon:7'] }).id, 't1');
  assert.equal(L.pickLine(T, { moment: 'jalon', dayKey: '2026-10-09', context: ['trophee:sentier', 'jalon:7'] }).id, 'j1');
  // Un état faux exclut ses répliques.
  for (const dayKey of days(20)) assert.ok(!['e1', 'e2'].includes(L.pickLine(T, { moment: 'accueil', dayKey }).id));
});

test('pickLine : null quand rien n’est éligible', () => {
  assert.equal(L.pickLine(T, { moment: 'jalon', dayKey: '2026-10-09' }), null);
  assert.equal(L.pickLine(LINES, { moment: 'theme', dayKey: '2026-10-09' }), null);
  assert.equal(L.pickLine(LINES, { moment: 'stade', dayKey: '2026-10-09', context: ['matin'] }), null);
  assert.equal(L.pickLine(LINES, { moment: 'inconnu', dayKey: '2026-10-09' }), null);
  assert.equal(L.pickLine([], { moment: 'fin', dayKey: '2026-10-09' }), null);
});

test('pickLine sur louarn.json : chaque moment fait un tour complet sans répétition', () => {
  const cases = [
    ['fin', []], ['fin', ['partielle']], ['accueil', ['matin', 'ecoute']], ['retour', []], ['rdv', ['objectif']], ['tip', []],
  ];
  for (const [moment, context] of cases) {
    const eligible = L.eligibleLines(LINES, { moment, context });
    let vus = [];
    const picked = days(eligible.length).map((dayKey) => {
      const line = L.pickLine(LINES, { moment, context, dayKey, recentIds: vus });
      vus = L.rememberLine(vus, line.id);
      return line.id;
    });
    assert.equal(new Set(picked).size, eligible.length, `${moment} ${context}`);
    assert.equal(L.pickLine(LINES, { moment, context, dayKey: '2027-01-01', recentIds: vus }).id, picked[0], `${moment} : retour de la plus ancienne`);
  }
  assert.equal(L.eligibleLines(LINES, { moment: 'tip' }).length, 39);
  assert.equal(L.pickLine(LINES, { moment: 'stade', dayKey: '2026-10-09', context: ['stade:3'] }).id, 'sta-03');
  assert.equal(L.pickLine(LINES, { moment: 'theme', dayKey: '2026-10-09', context: ['theme:6'] }).id, 'th-06');
  assert.equal(L.pickLine(LINES, { moment: 'jalon', dayKey: '2026-10-09', context: ['trophee:fondations'] }).id, 'tro-09');
  assert.equal(L.pickLine(LINES, { moment: 'stade', dayKey: '2026-10-09', context: ['stade:6+'] }).id, 'sta-07');
});

test('stablePick : la même réplique toute la journée tant que l’état ne change pas', () => {
  const opts = { moment: 'accueil', context: ['matin'], dayKey: '2026-10-09' };
  const r1 = L.stablePick(LINES, opts, { memo: null, vus: ['acc-03'] });
  assert.ok(r1.changed);
  assert.equal(r1.vus[0], r1.line.id);
  assert.deepEqual(r1.memo, { key: L.lineKey(opts), id: r1.line.id });
  const r2 = L.stablePick(LINES, opts, { memo: r1.memo, vus: r1.vus });
  assert.equal(r2.line.id, r1.line.id);
  assert.equal(r2.changed, false);
  assert.deepEqual(r2.vus, r1.vus, 'rouvrir l’appli ne remplit pas l’historique');
  const r3 = L.stablePick(LINES, { ...opts, dayKey: '2026-10-10' }, { memo: r2.memo, vus: r2.vus });
  assert.notEqual(r3.line.id, r1.line.id, 'le lendemain : une autre');
  const r4 = L.stablePick(LINES, { ...opts, context: ['doneToday'] }, { memo: r2.memo, vus: r2.vus });
  assert.ok(['acc-09', 'acc-10'].includes(r4.line.id), 'l’état change : nouveau tirage');
  const r5 = L.stablePick(LINES, { moment: 'theme', dayKey: '2026-10-09' }, { memo: r2.memo, vus: r2.vus });
  assert.equal(r5.line, null);
  assert.equal(r5.changed, false);
});

test('lineKey : jour, portée, moment et contexte', () => {
  assert.equal(L.lineKey({ moment: 'fin', context: ['partielle', 'matin'], dayKey: '2026-10-09', scope: 'abc' }), '2026-10-09|abc|fin|partielle,matin');
  assert.equal(L.lineKey({ moment: 'accueil' }), '||accueil|');
});

test('humeurFor : neutre à l’accueil et avant un RDV, content pour fêter, clin pour un conseil', () => {
  for (const m of ['accueil', 'rdv', 'pourquoi', 'inconnu', undefined]) assert.equal(L.humeurFor(m), 'neutre', m);
  for (const m of ['fin', 'jalon', 'theme', 'stade', 'retour']) assert.equal(L.humeurFor(m), 'content', m);
  assert.equal(L.humeurFor('tip'), 'clin');
});

test('motivationLines : les 12 phrases de motivation rejoignent la rotation de l’accueil', () => {
  const out = L.motivationLines(['Une.', 'Deux.']);
  assert.deepEqual(out, [{ id: 'mot-01', moment: 'accueil', texte: 'Une.' }, { id: 'mot-02', moment: 'accueil', texte: 'Deux.' }]);
  assert.deepEqual(L.motivationLines(undefined), []);
});

// ---------- Quelle bulle, où (G §2.2) ----------

const HOME = { status: { doneToday: false, comeback: false, yesterdayOff: false }, dailyCount: 10, seed: 2, hour: 14, bloc3: 'ecoute', why: 'Être compris' };

test('homeBubble : le renard se tait quand une carte est affichée, et en mode discret', () => {
  assert.equal(L.homeBubble({ ...HOME, cardShown: true }), null);
  assert.equal(L.homeBubble({ ...HOME, discret: true }), null);
  assert.equal(L.homeBubble({ ...HOME, discret: true, status: { comeback: true } }), null);
});

test('homeBubble : ordre de priorité de l’accueil', () => {
  assert.deepEqual(L.homeBubble({ ...HOME, status: { comeback: true, doneToday: false }, dueMilestone: 7 }), { moment: 'retour', context: [] });
  assert.deepEqual(L.homeBubble({ ...HOME, dueMilestone: 7, status: { yesterdayOff: true } }), { moment: 'jalon', context: ['jalon:due'] });
  assert.deepEqual(L.homeBubble({ ...HOME, dailyCount: 0 }), { moment: 'accueil', context: ['premiereSeance', 'ecoute'] });
  // J1 dû à la première séance : « on réenregistre » serait faux, c'est l’accueil de la première séance.
  assert.deepEqual(L.homeBubble({ ...HOME, dailyCount: 0, dueMilestone: 1 }), { moment: 'accueil', context: ['premiereSeance', 'ecoute'] });
  assert.deepEqual(L.homeBubble({ ...HOME, status: { doneToday: true, yesterdayOff: true } }), { moment: 'accueil', context: ['doneToday', 'ecoute'] });
  assert.deepEqual(L.homeBubble({ ...HOME, status: { yesterdayOff: true } }), { moment: 'accueil', context: ['yesterdayOff', 'ecoute'] });
  assert.deepEqual(L.homeBubble({ ...HOME, stade6Plus: true, status: { comeback: true } }), { moment: 'stade', context: ['stade:6+'] });
});

test('homeBubble : rotation sur 3 jours entre le pourquoi, un conseil et une réplique d’accueil', () => {
  assert.deepEqual(L.homeBubble({ ...HOME, seed: 0 }), { moment: 'pourquoi', context: [] });
  assert.deepEqual(L.homeBubble({ ...HOME, seed: 3, why: '' }), { moment: 'accueil', context: ['ecoute'] });
  assert.deepEqual(L.homeBubble({ ...HOME, seed: 1 }), { moment: 'tip', context: [] });
  assert.deepEqual(L.homeBubble({ ...HOME, seed: 2, hour: 9, dailyCount: 30 }), { moment: 'accueil', context: ['matin', 'ecoute', 'bloc>=2'] });
  assert.deepEqual(L.homeBubble({ ...HOME, seed: -2 }), { moment: 'tip', context: [] });
});

test('endBubble : stade, puis souvenir, puis thème, puis jalon, puis fin (une seule bulle)', () => {
  const s = { completed: true, bloc3: 'posture', milestone: null };
  // À 24 : fin du thème 6, fin du bloc 1, stade 3 et souvenir « fondations » : le stade parle.
  assert.deepEqual(L.endBubble({ prevCount: 23, newCount: 24, session: s, newSouvenirs: [{ id: 'fondations' }] }), { moment: 'stade', context: ['stade:3'] });
  assert.deepEqual(L.endBubble({ prevCount: 3, newCount: 4, session: { ...s, milestone: 7 }, newSouvenirs: [{ id: 'premier-echo' }, { id: 'compris' }] }),
    { moment: 'jalon', context: ['trophee:premier-echo', 'trophee:compris'] });
  assert.deepEqual(L.endBubble({ prevCount: 19, newCount: 20, session: { ...s, milestone: 30 } }), { moment: 'theme', context: ['theme:6'] });
  assert.deepEqual(L.endBubble({ prevCount: 6, newCount: 7, session: { ...s, milestone: 7 } }), { moment: 'jalon', context: ['jalon:7'] });
  assert.deepEqual(L.endBubble({ prevCount: 89, newCount: 90, session: { ...s, milestone: 90 } }), { moment: 'jalon', context: ['jalon:60+'] });
  assert.deepEqual(L.endBubble({ prevCount: 5, newCount: 6, session: s, hour: 20 }), { moment: 'fin', context: ['soir', 'posture'] });
  assert.deepEqual(L.endBubble({ prevCount: 5, newCount: 6, session: { ...s, completed: false }, encoreUne: true, hour: 14 }),
    { moment: 'fin', context: ['partielle', 'encoreUne', 'posture'] });
  assert.deepEqual(L.endBubble({ prevCount: 72, newCount: 73, session: s, hour: 14 }), { moment: 'theme', context: ['cycle:2'] });
  assert.deepEqual(L.endBubble({ prevCount: 0, newCount: 1, session: { ...s, milestone: 1 }, newSouvenirs: ['premier-pas'] }),
    { moment: 'jalon', context: ['trophee:premier-pas'] }, 'un id seul est accepté');
});

test('endBubble en mode discret : seulement les grands moments', () => {
  const s = { completed: true, bloc3: 'ecoute', milestone: null };
  assert.equal(L.endBubble({ prevCount: 5, newCount: 6, session: s, discret: true }), null);
  assert.equal(L.endBubble({ prevCount: 6, newCount: 7, session: { ...s, milestone: 7 }, discret: true }), null);
  assert.deepEqual(L.endBubble({ prevCount: 3, newCount: 4, session: s, discret: true }), { moment: 'theme', context: ['theme:2'] });
  assert.deepEqual(L.endBubble({ prevCount: 11, newCount: 12, session: s, discret: true }), { moment: 'stade', context: ['stade:2'] });
  assert.deepEqual(L.endBubble({ prevCount: 6, newCount: 7, session: s, discret: true, newSouvenirs: ['compris'] }), { moment: 'jalon', context: ['trophee:compris'] });
});

test('rdvBubble : avec ou sans objectif, rien en mode discret', () => {
  assert.deepEqual(L.rdvBubble({ goal: ' Savoir son budget ' }), { moment: 'rdv', context: ['objectif'] });
  assert.deepEqual(L.rdvBubble({ goal: '  ' }), { moment: 'rdv', context: ['sansObjectif'] });
  assert.deepEqual(L.rdvBubble({}), { moment: 'rdv', context: ['sansObjectif'] });
  assert.equal(L.rdvBubble({ goal: 'x', discret: true }), null);
});

test('sessionCounts : le cumul avant et après la séance, et « encore une » le même jour', () => {
  const ss = [
    S({ id: 'a', startedAt: 1, dateKey: '2026-10-01' }),
    S({ id: 'b', startedAt: 2, dateKey: '2026-10-02' }),
    S({ id: 'c', type: 'prerdv', startedAt: 3, dateKey: '2026-10-02' }),
    S({ id: 'n', counted: false, startedAt: 4, dateKey: '2026-10-02' }),
    S({ id: 'd', startedAt: 5, dateKey: '2026-10-02' }),
  ];
  assert.deepEqual(L.sessionCounts(ss, ss[4]), { prevCount: 2, newCount: 3, encoreUne: true });
  assert.deepEqual(L.sessionCounts(ss, ss[1]), { prevCount: 1, newCount: 2, encoreUne: false });
  assert.deepEqual(L.sessionCounts(ss, ss[0]), { prevCount: 0, newCount: 1, encoreUne: false });
  assert.deepEqual(L.sessionCounts(ss, ss[2]), { prevCount: 2, newCount: 2, encoreUne: false }, 'un RDV ne fait pas grandir');
  assert.deepEqual(L.sessionCounts([...ss].reverse(), ss[4]), { prevCount: 2, newCount: 3, encoreUne: true }, 'ordre indifférent');
});

// ---------- Souvenirs (G §4.3) ----------

const has = (sessions, recordings, id) => L.souvenirs(sessions, recordings).find((x) => x.id === id) ?? null;

test('11 souvenirs, dans l’ordre de G §4.3', () => {
  assert.deepEqual(ids(L.SOUVENIRS), ['premier-pas', 'voix-depart', 'premier-echo', 'grand-echo', 'premier-rdv', 'compris',
    'objectif-tenu', 'chemin-repris', 'fondations', 'confiance', 'sentier']);
});

test('souvenir « premier-pas » : au moins une séance comptée', () => {
  const s = has(dailies(3, '2026-10-02'), [], 'premier-pas');
  assert.equal(s.nom, 'Le premier pas');
  assert.equal(s.dateKey, '2026-10-02');
  assert.equal(has([S({ counted: false }), S({ type: 'prerdv' })], [], 'premier-pas'), null);
  assert.ok(has([S({ type: 'comeback' })], [], 'premier-pas'), 'une reprise comptée compte');
});

test('souvenirs de la voix : référence J1, J7 et J30', () => {
  const recs = [REC({ milestone: 7, createdAt: 5, dateKey: '2026-10-09' }), REC({ milestone: 1, createdAt: 1 }), REC({ milestone: 30, createdAt: 9, dateKey: '2026-11-20' })];
  assert.equal(has([], recs, 'voix-depart').dateKey, '2026-10-01');
  assert.equal(has([], recs, 'premier-echo').dateKey, '2026-10-09');
  assert.equal(has([], recs, 'grand-echo').dateKey, '2026-11-20');
  const wrong = [REC({ kind: 'session', milestone: 1 }), REC({ kind: 'partial', milestone: 7 }), REC({ milestone: 14 }), REC({ milestone: 60 }), REC({ milestone: null })];
  for (const id of ['voix-depart', 'premier-echo', 'grand-echo']) assert.equal(has([], wrong, id), null, id);
});

test('souvenir « premier-rdv » : une routine RDV d’au moins 30 s', () => {
  assert.equal(has([S({ type: 'prerdv', practicedSec: 30, dateKey: '2026-10-05' })], [], 'premier-rdv').dateKey, '2026-10-05');
  assert.equal(has([S({ type: 'prerdv', practicedSec: 29 }), S({ type: 'daily', practicedSec: 300 })], [], 'premier-rdv'), null);
});

test('souvenir « compris » : « On t’a fait répéter ? » → Non', () => {
  assert.ok(has([S({ type: 'prerdv', feedback: 'non' })], [], 'compris'));
  assert.equal(has([S({ type: 'prerdv', feedback: 'une' }), S({ type: 'prerdv', feedback: 'nsp' }), S({ type: 'daily', feedback: 'non' })], [], 'compris'), null);
});

test('souvenir « objectif-tenu » : objectif de RDV atteint', () => {
  assert.ok(has([S({ type: 'prerdv', goal: 'x', goalReached: 'oui' })], [], 'objectif-tenu'));
  assert.equal(has([S({ type: 'prerdv', goalReached: 'partie' }), S({ type: 'daily', goalReached: 'oui' })], [], 'objectif-tenu'), null);
});

test('souvenir « chemin-repris » : une reprise comptée', () => {
  assert.ok(has([S({ type: 'comeback', counted: true })], [], 'chemin-repris'));
  assert.equal(has([S({ type: 'comeback', counted: false }), S({ type: 'daily' })], [], 'chemin-repris'), null);
});

test('souvenirs de bloc : 24, 48 et 72 séances comptées, datés de la séance qui franchit le seuil', () => {
  for (const [id, n] of [['fondations', 24], ['confiance', 48], ['sentier', 72]]) {
    const s = has(dailies(n), [], id);
    assert.equal(s?.dateKey, addDays('2026-10-01', n - 1), id);
    assert.equal(has(dailies(n - 1), [], id), null, `${id} à ${n - 1}`);
  }
  const mixed = [...dailies(23), S({ id: 'c', type: 'comeback', dateKey: '2026-12-01', startedAt: Date.UTC(2026, 11, 1) })];
  assert.equal(has(mixed, [], 'fondations').dateKey, '2026-12-01', 'les reprises comptent');
  assert.equal(has([...dailies(23), S({ type: 'prerdv', startedAt: Date.UTC(2027, 0, 1) })], [], 'fondations'), null, 'les RDV ne comptent pas');
});

test('souvenirs : seulement ceux obtenus, triés par date d’obtention', () => {
  assert.deepEqual(L.souvenirs([], []), []);
  const sessions = [
    S({ id: 'r', type: 'prerdv', practicedSec: 90, feedback: 'non', dateKey: '2026-10-03', startedAt: Date.UTC(2026, 9, 3) }),
    ...dailies(2, '2026-10-02'),
  ];
  // La voix de départ s'enregistre à l'onboarding (8 h), avant la première séance (9 h).
  const list = L.souvenirs(sessions, [REC({ createdAt: Date.UTC(2026, 9, 2, 8), dateKey: '2026-10-02' })]);
  assert.deepEqual(ids(list), ['voix-depart', 'premier-pas', 'premier-rdv', 'compris']);
  assert.ok(list.every((x) => typeof x.nom === 'string' && /^\d{4}-\d\d-\d\d$/.test(x.dateKey)));
});

test('souvenirsToCelebrate : jamais deux fois, et rien en rafale après une restauration', () => {
  const list = [
    { id: 'premier-pas', dateKey: '2026-09-01' },
    { id: 'premier-rdv', dateKey: '2026-10-06' },
    { id: 'compris', dateKey: '2026-10-09' },
  ];
  const r = L.souvenirsToCelebrate(list, ['premier-rdv', 'stade:2'], '2026-10-09');
  assert.deepEqual(ids(r.celebrate), ['compris']);
  assert.deepEqual(ids(r.silent), ['premier-pas']);
  assert.deepEqual(r.fetes, ['premier-rdv', 'stade:2', 'premier-pas', 'compris']);
  assert.deepEqual(ids(L.souvenirsToCelebrate([{ id: 'x', dateKey: '2026-10-06' }], [], '2026-10-09').celebrate), ['x'], '3 jours : encore fêté');
  assert.deepEqual(L.souvenirsToCelebrate(list, ['premier-pas', 'premier-rdv', 'compris'], '2026-10-09').celebrate, []);
});

// ---------- louarn.json ----------

test('louarn.json : métadonnées alignées sur le code', () => {
  assert.equal(DATA.lang, 'fr');
  assert.equal(DATA.nom, 'Louarn');
  assert.deepEqual(DATA.stades, L.STAGES.map(({ id, nom, seuil }) => ({ id, nom, seuil })));
  assert.deepEqual(DATA.blocs, L.BLOCS.map(({ id, nom }) => ({ id, nom })));
  assert.deepEqual(DATA.souvenirs, L.SOUVENIRS.map(({ id, nom }) => ({ id, nom })));
});

test('louarn.json : les 135 répliques de G §3, recopiées à l’identique', () => {
  assert.equal(G_LINES.length, 135);
  const byId = new Map(LINES.map((l) => [l.id, l]));
  for (const g of G_LINES) assert.deepEqual(byId.get(g.id), g, g.id);
});

test('louarn.json : ids uniques, champs et moments connus, conditions du vocabulaire de G §2.3', () => {
  assert.equal(new Set(ids(LINES)).size, LINES.length);
  for (const l of LINES) {
    assert.deepEqual(Object.keys(l).filter((k) => !['id', 'moment', 'condition', 'texte'].includes(k)), [], l.id);
    assert.match(l.id, /^[a-z]+(-[a-z]+)?-\d\d$/, l.id);
    assert.ok(L.MOMENTS.includes(l.moment), `${l.id} : moment ${l.moment}`);
    assert.equal(typeof l.texte, 'string', l.id);
    if ('condition' in l) assert.ok(L.isKnownCondition(l.condition), `${l.id} : condition ${l.condition}`);
  }
  for (const c of ['nimporte', 'theme:19', 'stade:7', 'trophee:inconnu', 'jalon:8', '']) assert.equal(L.isKnownCondition(c), false, c);
});

test('louarn.json : 90 caractères au plus, ni « ! » ni chiffre', () => {
  for (const l of LINES) {
    assert.ok([...l.texte].length <= 90, `${l.id} : ${[...l.texte].length} caractères`);
    assert.ok(l.texte.trim() === l.texte && l.texte.length > 0, l.id);
    assert.doesNotMatch(l.texte, /!/, l.id);
    assert.doesNotMatch(l.texte, /\d/, l.id);
  }
});

test('louarn.json : chaque souvenir, chaque stade et chaque thème a sa réplique', () => {
  const at = (moment, condition) => LINES.some((l) => l.moment === moment && l.condition === condition);
  for (const s of L.SOUVENIRS) assert.ok(at('jalon', `trophee:${s.id}`), s.id);
  for (const s of L.STAGES) assert.ok(at('stade', `stade:${s.id}`), `stade ${s.id}`);
  assert.ok(at('stade', 'stade:6+'));
  for (let n = 1; n <= 18; n++) assert.ok(at('theme', `theme:${n}`), `thème ${n}`);
  assert.ok(at('theme', 'theme:langues'));
  assert.ok(at('theme', 'cycle:2'));
  for (const m of ['accueil', 'fin', 'retour', 'rdv', 'tip']) assert.ok(LINES.some((l) => l.moment === m && !l.condition), `${m} : au moins une générique`);
});

test('le programme a bien 18 thèmes de 4 séances (pré-requis de G §4.6)', () => {
  assert.equal(PROGRAM.weeks.length, L.THEMES_PER_CYCLE);
  assert.equal(PROGRAM.sessionsPerWeek, L.SESSIONS_PER_THEME);
  assert.equal(L.THEMES_PER_CYCLE / L.THEMES_PER_BLOC, L.BLOCS.length);
});

// ---------- Dessins (G §1.5) ----------

test('fox-art : les 7 SVG de G §1.5, à l’octet près', () => {
  assert.equal(G_SVGS.length, 7);
  assert.equal(foxSvg('portrait'), G_SVGS[0]);
  for (let n = 1; n <= 6; n++) assert.equal(foxSvg(n), G_SVGS[n], `stade ${n}`);
  assert.throws(() => foxSvg(7));
});

test('fox-art : sous 3 Ko, 3 expressions partout, écharpe au stade 6 seulement', () => {
  for (const d of ['portrait', 1, 2, 3, 4, 5, 6]) {
    const svg = foxSvg(d);
    assert.ok(Buffer.byteLength(svg) < 3072, `${d} : ${Buffer.byteLength(svg)} o`);
    for (const c of ['lo-n', 'lo-c', 'lo-w']) assert.ok(svg.includes(`class="${c}"`), `${d} ${c}`);
    assert.equal(svg.includes('class="lo-e"'), d === 6, `${d} écharpe`);
  }
});

test('les modules de Louarn ne font aucune requête réseau', () => {
  for (const f of ['js/core/louarn.js', 'js/ui/components/fox-art.js']) {
    const src = readText(f);
    assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\bimport\s*\(|new Image|<img|url\(/, f);
    for (const m of src.matchAll(/https?:\/\/[^\s'"`)]+/g)) assert.equal(m[0], 'http://www.w3.org/2000/svg', `${f} : ${m[0]}`);
  }
});
