import test from 'node:test';
import assert from 'node:assert/strict';
import { ALGO_VERSION, sdWithin, defaultSd } from '../js/core/acoustics.js';
import {
  STORED_METRICS, measureRows, voiceSessions, voiceReport, voiceSummary, crossPhrase, formatDecimal, VERDICT_TEXT,
  PLUS_RAPIDE_NOTE,
} from '../js/core/voice-report.js';

let clock = 0;
/** Les lignes `measures` d'une séance de voix : une prise = un enregistrement, 5 valeurs. */
function voiceSession(sessionId, kind, dateKey, takes, { algoVersion = ALGO_VERSION } = {}) {
  return takes.flatMap(([debit, pausePct, debitArticulatoire, pauseCount = 4], i) => measureRows({
    recording: { id: `${sessionId}-${i}`, sessionId, dateKey, createdAt: (clock += 1000) },
    kind, metrics: { debit, pausePct, debitArticulatoire, pauseCount }, cv: 0.12, snrDb: 31.5, algoVersion,
    context: { leadSilent: true },
  }));
}
/** Calibration de D §4 : départ à 6,8 syll/s, 9 % de pause, 7,5 syll/s articulés. 1re prise de familiarisation à 9. */
const CAL = ({ p = 0.09 } = {}) => [
  ...voiceSession('c1', 'calibration', '2026-10-10', [[9.0, 0.02, 9.5], [6.7, p, 7.5], [6.9, p, 7.5]]),
  ...voiceSession('c2', 'calibration', '2026-10-11', [[6.8, p, 7.5], [6.9, p + 0.01, 7.6], [6.7, p - 0.01, 7.4]]),
  ...voiceSession('c3', 'calibration', '2026-10-13', [[6.7, p, 7.5], [6.9, p, 7.5], [6.8, p, 7.5]]),
];
/** Deux contrôles identiques : un changement vu deux fois. */
const ctl2 = (debit, pausePct, art) => [...ctl('k1', '2026-10-20', debit, pausePct, art), ...ctl('k2', '2026-10-27', debit, pausePct, art)];
const ctl = (id, dateKey, debit, pausePct, art) =>
  voiceSession(id, 'controle', dateKey, [[debit, pausePct, art], [debit + 0.1, pausePct, art], [debit - 0.1, pausePct, art]]);

test('measureRows : une ligne par valeur, jamais agrégée, avec algoVersion, snr et contexte', () => {
  const rows = measureRows({
    recording: { id: 'r1', sessionId: 's1', dateKey: '2026-10-10', createdAt: 5 },
    kind: 'calibration', metrics: { debit: 6.1, pausePct: 0.18, debitArticulatoire: 7.4, pauseCount: 5 }, cv: 0.2, snrDb: 28.3,
    context: { leadSilent: true },
  });
  assert.deepEqual(rows.map((r) => r.metric), ['debit', 'pausePct', 'debitArticulatoire', 'pauseCount', 'cvDebit']);
  assert.deepEqual(STORED_METRICS, ['debit', 'pausePct', 'debitArticulatoire', 'pauseCount', 'cvDebit']);
  assert.deepEqual(rows[0], {
    id: `r1:debit:${ALGO_VERSION}`, recordingId: 'r1', sessionId: 's1', dateKey: '2026-10-10', createdAt: 5,
    kind: 'calibration', metric: 'debit', value: 6.1, algoVersion: ALGO_VERSION, snrDb: 28.3, context: { leadSilent: true },
  });
  assert.equal(rows[4].value, 0.2, 'le CV de débit est stocké sous cvDebit');
  // Valeurs absentes (pas de syllabes, CV sur moins de 2 groupes) : pas de ligne, jamais null ni NaN.
  const few = measureRows({ recording: { id: 'r2', sessionId: null, dateKey: 'd', createdAt: 1 }, kind: 'reference-v1',
    metrics: { debit: null, pausePct: 0.1, debitArticulatoire: Number.NaN, pauseCount: 0 }, cv: null, snrDb: 25 });
  assert.deepEqual(few.map((r) => r.metric), ['pausePct', 'pauseCount']);
  assert.deepEqual(few[0].context, {});
  assert.throws(() => measureRows({ recording: { id: 'x' }, kind: 'jalon', metrics: {} }), RangeError);
});

test('voiceSessions : séances de calibration et de contrôle, version courante, références V1 à part', () => {
  const rows = [
    ...CAL(),
    ...voiceSession('old', 'controle', '2026-10-20', [[6, 0.1, 7], [6, 0.1, 7]], { algoVersion: 'acoustics-1' }),
    ...voiceSession('v1', 'reference-v1', '2026-09-01', [[7, 0.05, 7.4]]),
  ];
  const s = voiceSessions(rows);
  assert.deepEqual(s.map((x) => [x.sessionId, x.kind, x.takes.length, x.valid]), [
    ['c1', 'calibration', 3, true], ['c2', 'calibration', 3, true], ['c3', 'calibration', 3, true],
  ]);
  assert.deepEqual(Object.keys(s[0].takes[0]).sort(), ['createdAt', 'cvDebit', 'debit', 'debitArticulatoire', 'pauseCount', 'pausePct', 'recordingId']);
  assert.equal(voiceSessions(rows, { algoVersion: 'acoustics-1' }).length, 1);
});

test('voiceReport en calibrage : « On apprend ta voix. Encore N mesures. »', () => {
  assert.deepEqual(voiceReport([]), { state: 'calibrage', remaining: 3, metrics: {} });
  const two = CAL().filter((r) => !r.sessionId.startsWith('c3'));
  assert.equal(voiceReport(two).remaining, 1);
  // Une séance à une seule prise valide n'est pas une mesure.
  const thin = [...two, ...voiceSession('c3', 'calibration', '2026-10-13', [[6.8, 0.09, 7.5]])];
  assert.equal(voiceReport(thin).remaining, 1);
  const sum = voiceSummary(voiceReport(two));
  assert.equal(sum.headline, 'On apprend ta voix. Encore 1 mesure.');
  assert.equal(voiceSummary(voiceReport([])).headline, 'On apprend ta voix. Encore 3 mesures.');
  assert.deepEqual(sum.bands, []);
});

test('ligne de base : médiane des 3 séances, la toute première prise écartée (M §2.2)', () => {
  const r = voiceReport(CAL());
  assert.equal(r.state, 'repere');
  // c1 sans sa 1re prise : médiane(6,7 ; 6,9) = 6,8 (avec : 6,9). c2 = 6,8, c3 = 6,8.
  assert.ok(Math.abs(r.metrics.debit.base - 6.8) < 1e-9, `base ${r.metrics.debit.base}`);
  assert.ok(Math.abs(r.metrics.pausePct.base - 0.09) < 1e-9);
  assert.equal(r.metrics.debit.current, null);
  assert.equal(r.metrics.debit.verdict, null);
  // SDw de calibration : max(écart type des 3 médianes, défaut de D §3.2), sans detrend.
  assert.ok(Math.abs(r.metrics.debit.sdw - sdWithin([6.8, 6.8, 6.8], defaultSd('debit', 6.8))) < 1e-12);
  assert.ok(Math.abs(r.metrics.debit.sdw - 0.272) < 1e-9);
  assert.ok(Math.abs(r.metrics.debit.mdc - 2.77 * 0.272) < 1e-9);
  // Une première séance à 2 prises seulement : on les garde (une médiane demande 2 prises).
  const short = [
    ...voiceSession('c1', 'calibration', '2026-10-10', [[9.0, 0.02, 9.5], [7.0, 0.09, 7.5]]),
    ...CAL().filter((x) => x.sessionId !== 'c1'),
  ];
  assert.ok(Math.abs(voiceReport(short).metrics.debit.base - 6.8) < 1e-9, 'médiane(8,0 ; 6,8 ; 6,8)');
  assert.ok(Math.abs(voiceSessions(short)[0].takes.length - 2) < 1e-9);
});

test('après la calibration, sans contrôle : le repère de départ et le prochain contrôle', () => {
  const s = voiceSummary(voiceReport(CAL()), { untilControl: 6 });
  assert.equal(s.headline, 'Ta voix de départ est mesurée.');
  assert.deepEqual(s.lines, [
    'Ton débit au départ : environ 6,8 syll/s (zone de bruit ±0,8).',
    'Tu t’arrêtes environ 9 % du temps.',
    'Débit articulatoire, sans les pauses : environ 7,5 syll/s.',
    'Premier contrôle dans 6 séances.',
  ]);
  assert.equal(voiceSummary(voiceReport(CAL()), { untilControl: 1 }).lines.at(-1), 'Premier contrôle à ta prochaine séance.');
  assert.equal(voiceSummary(voiceReport(CAL())).lines.length, 3, 'sans échéance connue : pas de ligne');
});

test('suivi : verdict par mesure contre la ligne de base, SDw sur toute la série détendancée, borné par la calibration', () => {
  const rows = [...CAL(), ...ctl2(6.0, 0.18, 7.4)];
  const r = voiceReport(rows);
  assert.equal(r.state, 'suivi');
  assert.equal(r.controls, 2);
  const d = r.metrics.debit;
  assert.ok(Math.abs(d.current - 6.0) < 1e-9);
  // Série 6,8 ; 6,8 ; 6,8 ; 6,0 ; 6,0, résidus d'une droite, au moins la valeur de calibration.
  const detr = sdWithin([6.8, 6.8, 6.8, 6.0, 6.0], defaultSd('debit', 6.8), { detrend: true });
  assert.ok(Math.abs(d.sdw - Math.max(detr, 0.272)) < 1e-12);
  assert.equal(d.verdict, 'plus-pose', 'écart de 0,8 ≥ MDC');
  assert.equal(r.metrics.pausePct.verdict, 'pas-de-difference', '+9 points < MDC de 11 points');
  assert.equal(r.metrics.debitArticulatoire.verdict, 'pas-de-difference');
  assert.ok(Math.abs(d.low80 - (6.0 - 1.28 * d.sdw)) < 1e-12);
  assert.ok(Math.abs(d.high80 - (6.0 + 1.28 * d.sdw)) < 1e-12);
});

test('un saut vu une seule fois, au premier contrôle, reste « pas de différence mesurable » (SDw sur toute la série)', () => {
  // Le point jugé entre dans la série : un saut isolé gonfle les résidus (0,31 > 0,27), la MDC passe à 0,86.
  const r = voiceReport([...CAL(), ...ctl('k1', '2026-10-20', 6.0, 0.18, 7.4)]);
  assert.equal(r.controls, 1);
  assert.ok(Math.abs(r.metrics.debit.sdw - sdWithin([6.8, 6.8, 6.8, 6.0], 0.272, { detrend: true })) < 1e-12);
  assert.ok(r.metrics.debit.sdw > 0.3);
  assert.equal(r.metrics.debit.verdict, 'pas-de-difference');
});

test('le SDw ne descend jamais sous celui de la calibration', () => {
  // Calibration bruitée (6,4 ; 6,8 ; 7,2), contrôles parfaitement alignés : le detrend seul serait minuscule.
  const rows = [
    ...voiceSession('c1', 'calibration', '2026-10-10', [[6.4, 0.1, 7], [6.4, 0.1, 7], [6.4, 0.1, 7]]),
    ...voiceSession('c2', 'calibration', '2026-10-11', [[6.8, 0.1, 7], [6.8, 0.1, 7]]),
    ...voiceSession('c3', 'calibration', '2026-10-12', [[7.2, 0.1, 7], [7.2, 0.1, 7]]),
    ...ctl('k1', '2026-10-20', 7.6, 0.1, 7), ...ctl('k2', '2026-10-27', 8.0, 0.1, 7),
  ];
  const r = voiceReport(rows);
  assert.ok(Math.abs(r.metrics.debit.sdw - 0.4) < 1e-9, `sdw ${r.metrics.debit.sdw}`);
  assert.equal(r.metrics.debit.verdict, 'plus-rapide', '8,0 contre 6,8 : écart de 1,2 ≥ MDC de 1,1');
});

test('voiceSummary en suivi : les phrases de D §4, la bande grise, jamais de score', () => {
  const s = voiceSummary(voiceReport([...CAL(), ...ctl2(6.0, 0.18, 7.4)]), { untilControl: 6 });
  assert.equal(s.headline, 'Ton débit : environ 6,0 syll/s (zone de bruit ±0,8). Au départ : 6,8.');
  assert.equal(s.verdict, 'Plus posé qu’au départ, au-delà du bruit.');
  assert.deepEqual(s.lines, [
    'Tu t’arrêtes environ 18 % du temps (au départ : 9 %). Pas de différence mesurable sur les pauses.',
    'Débit articulatoire, sans les pauses : environ 7,4 syll/s. Au départ : 7,5.',
    'Tu fais plus de pauses, mais ta bouche va toujours aussi vite.',
    'Prochain contrôle dans 6 séances.',
  ]);
  assert.deepEqual(s.bands.map((b) => b.metric), ['debit', 'pausePct']);
  const b = s.bands[0];
  assert.equal(b.label, 'Débit de lecture');
  assert.ok(b.base > b.current && b.mdc > 0 && b.low80 < b.current && b.high80 > b.current);
});

test('« plus rapide » : en mots neutres, avec « Ça arrive… » (M §4.4)', () => {
  const s = voiceSummary(voiceReport([...CAL(), ...ctl2(7.7, 0.09, 8.4)]));
  assert.equal(s.verdict, `Plus rapide qu’au départ. ${PLUS_RAPIDE_NOTE}`);
  assert.equal(PLUS_RAPIDE_NOTE, 'Ça arrive : fatigue, journée chargée. On revoit au prochain contrôle.');
  assert.equal(s.lines.filter((l) => l.includes('Ça arrive')).length, 0, 'une seule fois');
  // Moins de pauses seulement : la même phrase, une fois, à la ligne des pauses.
  const p = voiceSummary(voiceReport([...CAL({ p: 0.25 }), ...ctl2(6.8, 0.1, 7.5)]));
  assert.equal(p.verdict, VERDICT_TEXT['pas-de-difference']);
  assert.equal(p.lines[0], `Tu t’arrêtes environ 10 % du temps (au départ : 25 %). Moins de pauses qu’au départ. ${PLUS_RAPIDE_NOTE}`);
});

test('crossPhrase : la lecture croisée débit / débit articulatoire (D §4, rang 3)', () => {
  assert.equal(crossPhrase('plus-pose', 'pas-de-difference'), 'Tu fais plus de pauses, mais ta bouche va toujours aussi vite.');
  assert.equal(crossPhrase('plus-pose', 'plus-pose'), 'Tu ralentis aussi en articulant.');
  assert.equal(crossPhrase('pas-de-difference', 'pas-de-difference'), 'Débit et articulation restent dans ta variation normale.');
  assert.equal(crossPhrase('pas-de-difference', 'plus-pose'), 'Tu articules plus posément, même si le débit global bouge peu.');
  for (const a of ['plus-pose', 'pas-de-difference', 'plus-rapide']) {
    for (const b of ['plus-pose', 'pas-de-difference', 'plus-rapide']) assert.equal(typeof crossPhrase(a, b), 'string', `${a}/${b}`);
  }
  assert.equal(crossPhrase(null, 'plus-pose'), null);
});

test('formatDecimal : virgule française, jamais « NaN » ni « null »', () => {
  assert.equal(formatDecimal(6.05), '6,1');
  assert.equal(formatDecimal(6), '6,0');
  assert.equal(formatDecimal(0.7531), '0,8');
  assert.equal(formatDecimal(null), '–');
  assert.equal(formatDecimal(Number.NaN), '–');
});

// Mots interdits de M §4.2, plus ceux de la spec V2 §4 : jamais « bredouillement », jamais « intelligible ».
const FORBIDDEN = /(?<!\p{L})(score|note|niveau|échec|régression|raté|record|série)s?(?!\p{L})|tu dois|bredouill|intelligib|null|NaN|undefined/iu;

test('aucun mot interdit, aucun « null » ni « NaN », dans tous les états', () => {
  const states = [
    [], CAL().filter((r) => r.sessionId !== 'c3'), CAL(),
    [...CAL(), ...ctl('k1', '2026-10-20', 6.0, 0.18, 7.4)],
    [...CAL(), ...ctl2(6.0, 0.18, 7.4)],
    [...CAL({ p: 0.25 }), ...ctl2(7.7, 0.02, 8.4)],
    [...CAL(), ...ctl2(6.0, 0.18, 6.9)],
    // Mesures incomplètes : pas de débit articulatoire du tout.
    CAL().filter((r) => r.metric !== 'debitArticulatoire'),
    [...CAL(), ...ctl2(6.0, 0.18, 7.4)].filter((r) => r.metric !== 'debitArticulatoire'),
  ];
  for (const rows of states) {
    for (const untilControl of [null, 1, 6]) {
      const s = voiceSummary(voiceReport(rows), { untilControl });
      for (const t of [s.headline, s.verdict, ...s.lines].filter((x) => x != null)) assert.doesNotMatch(t, FORBIDDEN, t);
    }
  }
  for (const t of Object.values(VERDICT_TEXT)) assert.doesNotMatch(t, FORBIDDEN, t);
});
