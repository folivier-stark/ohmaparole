import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from './helpers.mjs';
import { ALGO_VERSION } from '../js/core/acoustics.js';
import { measureRows } from '../js/core/voice-report.js';
import {
  axisVerdict, STATE_TEXT, CONTRADICTION_TEXT, zFromDelta, zFromProb, readProche, prochePairs, procheScore,
  buildBilanReport, controlResult, REALISME,
} from '../js/core/evaluation.js';

const MESURE = readJson('content/fr/mesure.json');

// ─── Règle de combinaison (M §1.4) ───────────────────────────────────────────────────────

test('axisVerdict : calibrage, pas encore mesurable, tendance probable', () => {
  assert.equal(axisVerdict({ primary: { calibrage: true } }).state, 'calibrage');
  assert.equal(axisVerdict({ primary: { available: false } }).state, 'pas-encore');
  assert.equal(axisVerdict({ primary: { available: true, z: 0.5 } }).state, 'pas-encore');
  assert.equal(axisVerdict({ primary: { available: true, z: 1.5 } }).state, 'probable');
});

test('axisVerdict : « confirmé » exige RCI ≥ 1,96, une autre famille, aucune dégradation et une réplication', () => {
  const ok = { primary: { available: true, z: 2.2 }, others: [{ family: 'ressenti', sign: 1 }], previousState: 'probable' };
  assert.equal(axisVerdict(ok).state, 'confirme');
  assert.equal(axisVerdict({ ...ok, others: [{ family: 'ressenti', sign: 0 }] }).state, 'probable', 'aucune autre famille dans le même sens');
  assert.equal(axisVerdict({ ...ok, others: [{ family: 'ressenti', sign: 1 }, { family: 'x', sign: 0, degrade: true }] }).state, 'probable', 'dégradation probable');
  assert.equal(axisVerdict({ ...ok, previousState: 'pas-encore' }).state, 'probable', 'pas répliqué');
  assert.equal(axisVerdict({ ...ok, previousState: null, replication: { inedits: [1, 1, 0] } }).state, 'confirme', '2 inédits sur 3');
  assert.equal(axisVerdict({ ...ok, previousState: null, replication: { inedits: [1, 0, -1] } }).state, 'probable');
});

test('axisVerdict : contradiction entre familles, on descend d’un cran', () => {
  const r = axisVerdict({ primary: { available: true, z: 2.5 }, others: [{ family: 'ressenti', sign: 1 }, { family: 'proche', sign: -1 }], previousState: 'confirme' });
  assert.equal(r.state, 'probable');
  assert.equal(r.contradiction, true);
  const p = axisVerdict({ primary: { available: true, z: 1.4 }, others: [{ family: 'proche', sign: -1 }] });
  assert.equal(p.state, 'pas-encore');
  assert.equal(p.contradiction, true);
  assert.equal(CONTRADICTION_TEXT, 'Les mesures ne sont pas d’accord, on revérifie au prochain bilan.');
});

test('axisVerdict : une baisse au-delà de la MDC est signalée, sans état « baisse »', () => {
  const r = axisVerdict({ primary: { available: true, z: -2.4 } });
  assert.equal(r.baisse, true);
  assert.equal(r.state, 'pas-encore');
  assert.equal(axisVerdict({ primary: { available: true, z: -1.5 } }).baisse, false);
  assert.deepEqual(Object.keys(STATE_TEXT), ['calibrage', 'pas-encore', 'probable', 'confirme']);
});

test('zFromDelta et zFromProb : conventions des indicateurs sans bruit connu', () => {
  assert.deepEqual([3, 2, 1, 0, -1, -2].map(zFromDelta), [1.96, 1.96, 1.28, 0, -1.28, -1.96]);
  assert.deepEqual([0.99, 0.95, 0.5, 0.05, 0.01].map(zFromProb), [1.96, 1.28, 0, -1.28, -1.96]);
});

// ─── Écoute à l'aveugle par un proche (M §3.4) ───────────────────────────────────────────

test('readProche : 6 sur 6 = confirmation, 5 sur 6 = tendance', () => {
  assert.equal(readProche(6, 6), 'confirmation');
  assert.equal(readProche(5, 6), 'tendance');
  assert.equal(readProche(4, 6), null);
  assert.equal(readProche(4, 4), null, 'moins de 5 paires : pas de lecture');
});

const rec = (id, kind, itemId, sessionId, createdAt, o = {}) => ({ id, kind, itemId, sessionId, createdAt, dateKey: 'd', ...o });

test('prochePairs : jusqu’à 6 paires réelles et 1 leurre, ordre et côté tirés par la graine', () => {
  const b1 = { id: 'b1', bilan: { kind: 'bilan', index: 1, order: ['fr.TA', 'fr.TB', 'fr.TC'] } };
  const b2 = { id: 'b2', bilan: { kind: 'bilan', index: 2, order: ['fr.TB', 'fr.TC', 'fr.TA'] } };
  const recs = [
    rec('first', 'reference', 'fr.REF1', 'c1', 1, { voiceCheck: 'calibration' }),
    rec('r1', 'reference', 'fr.REF1', 'b1', 10, { voiceCheck: 'bilan' }),
    rec('a1', 'bilan', 'fr.TA', 'b1', 11), rec('bb1', 'bilan', 'fr.TB', 'b1', 12), rec('c1x', 'bilan', 'fr.TC', 'b1', 13),
    rec('r2', 'reference', 'fr.REF1', 'b2', 20, { voiceCheck: 'bilan' }),
    rec('a2', 'bilan', 'fr.TA', 'b2', 21), rec('bb2', 'bilan', 'fr.TB', 'b2', 22), rec('c2', 'bilan', 'fr.TC', 'b2', 23),
  ];
  const pairs = prochePairs({ recordings: recs, bilans: [b1, b2], current: b2, seed: 'graine' });
  const real = pairs.filter((p) => !p.leurre);
  assert.equal(real.length, 5, 'bilan 2 : référence (départ et bilan 1), A, B, C contre le bilan 1');
  assert.equal(pairs.filter((p) => p.leurre).length, 1);
  const leurre = pairs.find((p) => p.leurre);
  assert.equal(leurre.olderId, leurre.newerId, 'deux écoutes de la même prise');
  for (const p of real) assert.ok(['r2', 'a2', 'bb2', 'c2'].includes(p.newerId));
  assert.deepEqual(prochePairs({ recordings: recs, bilans: [b1, b2], current: b2, seed: 'graine' }), pairs, 'déterministe');
  const sides = new Set(Array.from({ length: 20 }, (_, i) => prochePairs({ recordings: recs, bilans: [b1, b2], current: b2, seed: `g${i}` }).map((p) => p.newerSide).join()));
  assert.ok(sides.size > 1);
  const b3 = { id: 'b3', bilan: { kind: 'bilan', index: 3, order: ['fr.TA', 'fr.TB', 'fr.TC'] } };
  const recs3 = [...recs, rec('r3', 'reference', 'fr.REF1', 'b3', 30, { voiceCheck: 'bilan' }), rec('a3', 'bilan', 'fr.TA', 'b3', 31), rec('bb3', 'bilan', 'fr.TB', 'b3', 32), rec('c3', 'bilan', 'fr.TC', 'b3', 33)];
  assert.equal(prochePairs({ recordings: recs3, bilans: [b1, b2, b3], current: b3, seed: 's' }).filter((p) => !p.leurre).length, 6, 'au plus 6');
});

test('procheScore : choix du plus récent, « Je ne sais pas » ne compte pas, le leurre reste caché', () => {
  const pairs = [
    { id: 'p1', newerSide: 'A' }, { id: 'p2', newerSide: 'B' }, { id: 'p3', newerSide: 'A' },
    { id: 'p4', newerSide: 'B' }, { id: 'p5', newerSide: 'A' }, { id: 'p6', newerSide: 'B' }, { id: 'l', newerSide: 'A', leurre: true },
  ];
  const answers = {
    p1: { q1: 'A', q2: 'A' }, p2: { q1: 'B', q2: 'nsp' }, p3: { q1: 'A', q2: 'A' }, p4: { q1: 'B', q2: 'B' },
    p5: { q1: 'A', q2: 'B' }, p6: { q1: 'B', q2: 'B' }, l: { q1: 'B', q2: 'A' },
  };
  assert.deepEqual(procheScore({ pairs, answers }), { n: 6, intel: 6, presence: 4, leurrePrudence: true });
  assert.equal(procheScore({ pairs, answers: { ...answers, l: { q1: 'nsp', q2: 'nsp' } } }).leurrePrudence, false);
});

// ─── Rapport de bilan ────────────────────────────────────────────────────────────────────

let clock = 0;
function voiceRows(sessionId, kind, debit, dateKey) {
  return [0, 1, 2].flatMap((j) => measureRows({
    recording: { id: `${sessionId}-${j}`, sessionId, dateKey, createdAt: (clock += 1000) }, kind,
    metrics: { debit: debit + (j - 1) * 0.05, pausePct: 0.1, debitArticulatoire: 8, pauseCount: 4 }, cv: 0.1, snrDb: 40,
  }));
}
function bilanRows(sessionId, index, values, forme = 'enforme') {
  return Object.entries(values).flatMap(([texte, debit]) => measureRows({
    recording: { id: `${sessionId}-${texte}`, sessionId, dateKey: 'd', createdAt: (clock += 1000) }, kind: 'bilan',
    metrics: { debit, pausePct: 0.1, debitArticulatoire: 8, pauseCount: 4 }, cv: null, snrDb: 40, context: { texte, forme, bilan: index },
  }));
}
const day = (n) => `2026-${String(9 + Math.floor(n / 28)).padStart(2, '0')}-${String(1 + (n % 28)).padStart(2, '0')}`;
const sessionsUpTo = (n, extra = []) => [
  ...Array.from({ length: n - 1 }, (_, i) => ({ id: `d${i + 1}`, type: 'daily', counted: true, completed: true, sessionNumber: i + 1, dateKey: day(i + 1), startedAt: i + 1, ratings: {} })),
  ...extra,
];
const GRILLE = { 'fr.G1': 2, 'fr.G2': 3, 'fr.G3': 1, 'fr.G4': 'no', 'fr.G5': 2, 'fr.G6': 2 };

function firstBilan(debitNow = 6.8) {
  const measures = [
    ...voiceRows('c1', 'calibration', 6.8, day(1)), ...voiceRows('c2', 'calibration', 6.8, day(2)), ...voiceRows('c3', 'calibration', 6.8, day(3)),
    ...voiceRows('k1', 'controle', debitNow, day(9)),
    ...bilanRows('b1', 1, { 'fr.REF1': 6.7, 'fr.TA': 6.9, 'fr.TB': 7.0, 'fr.TC': 6.8 }),
  ];
  const b1 = {
    id: 'b1', type: 'daily', counted: true, completed: true, sessionNumber: 24, dateKey: day(24), startedAt: 24, ratings: {},
    bilan: { kind: 'bilan', index: 1, order: ['fr.TA', 'fr.TB', 'fr.TC'], forme: 'enforme', faits: [true, false, true], grille: GRILLE, ab: 'recent' },
  };
  return { measures, b1, sessions: sessionsUpTo(24, [b1]) };
}

const FORBIDDEN = /(?<!\p{L})(score|note|niveau|échec|régression|raté|record|série|charisme)s?(?!\p{L})|tu dois|bredouill|intelligib|contact visuel|null|NaN|undefined/iu;
const allText = (r) => [
  r.title, r.sur, r.realisme, r.action, ...r.ressenti.lines,
  ...r.axes.flatMap((a) => [a.label, a.stateText, ...a.lines, ...a.detail]),
].filter((x) => x != null);

test('premier bilan (séance 24) : référence des inédits, phrase de réalisme, diction mesurée', () => {
  const { measures, b1, sessions } = firstBilan(6.0);
  const r = buildBilanReport({ session: b1, sessions, recordings: [], measures, todayKey: day(24), lines: MESURE });
  assert.equal(r.first, true);
  assert.equal(r.realisme, REALISME);
  assert.match(r.sur, /^24 séances faites\./, 'le bilan compte comme une séance');
  assert.deepEqual(r.axes.map((a) => a.key), ['diction', 'ecoute', 'posture', 'rdv']);
  const d = r.axes[0];
  assert.equal(d.state, 'probable', '6,8 → 6,0 : RCI ≥ 1,96 et l’A/B de Fred va dans le même sens, mais pas encore de réplication');
  assert.ok(d.band && d.band.metric === 'debit');
  assert.ok(d.lines.some((l) => /première mesure, la comparaison commence au prochain bilan/.test(l)));
  assert.equal(r.axes[1].state, 'calibrage', 'écoute : première mesure des faits clés');
  assert.match(r.axes[1].lines[0], /2 sur 3/);
  assert.equal(r.axes[2].state, 'pas-encore', 'posture sans proche');
  assert.match(r.axes[2].lines[0], /proche/);
  assert.equal(r.axes[3].state, 'calibrage', 'RDV : moins de 3 RDV');
  assert.equal(r.controlDueAt, null);
  assert.match(r.action, /Raconter un cas client/, 'la compétence la plus basse de l’auto-grille');
  assert.ok(r.ressenti.lines.some((l) => /Raconter un cas client : repère 1 sur 3/.test(l)));
  assert.ok(r.ressenti.lines.some((l) => /non observé/.test(l)));
  assert.ok(r.axes[0].detail.some((l) => /RCI/.test(l)), 'le détail donne le RCI');
  for (const t of allText(r)) assert.doesNotMatch(t, FORBIDDEN, t);
});

test('deuxième bilan (séance 48) : inédits comparés texte par texte, confirmation possible, proche proposé', () => {
  const { measures, b1 } = firstBilan(6.0);
  b1.bilan.report = { axes: [{ key: 'diction', state: 'probable' }, { key: 'ecoute', state: 'calibrage' }] };
  const more = [
    ...voiceRows('k2', 'controle', 6.0, day(15)), ...voiceRows('k3', 'controle', 6.0, day(30)), ...voiceRows('k4', 'controle', 6.0, day(36)),
    ...bilanRows('b2', 2, { 'fr.REF1': 6.0, 'fr.TA': 6.2, 'fr.TB': 6.3, 'fr.TC': 6.75 }),
  ];
  const b2 = {
    id: 'b2', type: 'daily', counted: true, completed: true, sessionNumber: 48, dateKey: day(48), startedAt: 48, ratings: {},
    bilan: { kind: 'bilan', index: 2, order: ['fr.TC', 'fr.TA', 'fr.TB'], forme: 'moyen', faits: [true, true, true], grille: GRILLE, ab: 'recent' },
  };
  const sessions = [...sessionsUpTo(24, [b1]), ...Array.from({ length: 23 }, (_, i) => ({ id: `e${i}`, type: 'daily', counted: true, sessionNumber: 25 + i, dateKey: day(25 + i), startedAt: 25 + i, ratings: { x: 'clair' } })), b2];
  // Lectures enregistrées des deux bilans : 5 paires réelles possibles pour le proche.
  const recs = [
    rec('first', 'reference', 'fr.REF1', 'c1', 1, { voiceCheck: 'calibration' }),
    rec('r1', 'reference', 'fr.REF1', 'b1', 10, { voiceCheck: 'bilan' }), rec('a1', 'bilan', 'fr.TA', 'b1', 11), rec('bb1', 'bilan', 'fr.TB', 'b1', 12), rec('c1x', 'bilan', 'fr.TC', 'b1', 13),
    rec('r2', 'reference', 'fr.REF1', 'b2', 20, { voiceCheck: 'bilan' }), rec('a2', 'bilan', 'fr.TA', 'b2', 21), rec('bb2', 'bilan', 'fr.TB', 'b2', 22), rec('c2', 'bilan', 'fr.TC', 'b2', 23),
  ];
  const r = buildBilanReport({ session: b2, sessions, recordings: recs, measures: [...measures, ...more], todayKey: day(48), lines: MESURE });
  // Sans enregistrements comparables (moins de 5 paires), l'écoute par un proche n'est pas proposée.
  const noRecs = buildBilanReport({ session: b2, sessions, recordings: [], measures: [...measures, ...more], todayKey: day(48), lines: MESURE });
  assert.notEqual(noRecs.actionKind, 'proche');
  assert.equal(r.first, false);
  assert.equal(r.realisme, null, 'une seule fois, au premier bilan');
  const d = r.axes[0];
  assert.deepEqual(d.inedits.map((x) => x.sign), [1, 1, 0], 'A et B nettement plus posés, C dans le bruit');
  assert.ok(['probable', 'confirme'].includes(d.state));
  assert.ok(d.detail.some((l) => /Texte A : environ 6,2 syll\/s \(bilan précédent : 6,9\)/.test(l)));
  assert.equal(r.axes[1].state, 'probable', 'écoute : 2 → 3 faits clés');
  assert.match(r.action, /proche/, 'au bilan 48, l’écoute par un proche est la suite proposée');
  for (const t of allText(r)) assert.doesNotMatch(t, FORBIDDEN, t);
});

test('baisse de diction au bilan : dite sans couleur, avec la forme du jour, et un contrôle 5 séances plus tard', () => {
  const { measures, b1, sessions } = firstBilan(7.8);
  b1.bilan.forme = 'fatigue';
  const r = buildBilanReport({ session: b1, sessions, recordings: [], measures, todayKey: day(24), lines: MESURE });
  const d = r.axes[0];
  assert.equal(d.baisse, true);
  assert.ok(d.lines.some((l) => l.includes('Causes fréquentes : fatigue, rhume, journée chargée, micro. Ta forme du jour : Fatigué. On refait la mesure dans 5 séances (3 min).')));
  assert.equal(r.controlDueAt, 29);
  assert.match(r.action, /contrôle/);
  for (const t of allText(r)) assert.doesNotMatch(t, FORBIDDEN, t);
});

test('le proche alimente la posture (présence vocale) et la diction (compréhension)', () => {
  const { measures, b1, sessions } = firstBilan(6.0);
  b1.bilan.proche = { n: 6, intel: 6, presence: 5, leurrePrudence: false };
  const r = buildBilanReport({ session: b1, sessions, recordings: [], measures, todayKey: day(24), lines: MESURE });
  assert.equal(r.axes[2].state, 'probable', '5 sur 6 : tendance');
  assert.match(r.axes[2].lines[0], /5 paires sur 6/);
  assert.ok(r.axes[0].others.some((o) => o.family === 'proche' && o.sign === 1));
});

test('bilan qui réutilise la lecture du contrôle du jour : paires du proche et détail', () => {
  const { measures, b1 } = firstBilan(6.0);
  b1.bilan.refRecordingId = 'k1-2';
  const r = buildBilanReport({ session: b1, sessions: sessionsUpTo(24, [b1]), recordings: [], measures, todayKey: day(24), lines: MESURE });
  assert.ok(r.axes[0].detail.some((l) => /Texte de référence aujourd’hui/.test(l)), 'la lecture réutilisée est montrée');
  const recs = [rec('k1-2', 'reference', 'fr.REF1', 'k1', 5, { voiceCheck: 'controle' }), rec('old', 'reference', 'fr.REF1', 'c1', 1, { voiceCheck: 'calibration' })];
  const pairs = prochePairs({ recordings: recs, bilans: [b1], current: b1, seed: 's' });
  assert.ok(pairs.some((p) => p.newerId === 'k1-2' && !p.leurre), 'la référence du jour sert de prise récente');
});

test('controlResult : la baisse se confirme, ou ne se retrouve pas', () => {
  const { measures, b1 } = firstBilan(7.8);
  const ctl = { id: 'ctl', bilan: { kind: 'controle', of: 'b1', index: 1 } };
  const still = controlResult({ control: ctl, measures: [...measures, ...bilanRows('ctl', 1, { 'fr.REF1': 7.9 })] });
  assert.equal(still.confirmee, true);
  assert.match(still.text, /La baisse se confirme sur le débit de lecture. Ce n’est pas un jugement sur toi : c’est un signal./);
  const gone = controlResult({ control: ctl, measures: [...measures, ...bilanRows('ctl', 1, { 'fr.REF1': 6.8 })] });
  assert.equal(gone.confirmee, false);
  assert.match(gone.text, /ne se retrouve pas/);
  for (const t of [still.text, gone.text, still.piste]) if (t) assert.doesNotMatch(t, FORBIDDEN, t);
  assert.equal(b1.id, 'b1');
});
