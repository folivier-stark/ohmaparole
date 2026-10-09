// Verdict par axe et rapport de bilan (spec V2 §7, eval-methodologie.md §1.3-1.4, §3.4, §4.2-4.6 = M). PUR.
//
// Indicateurs principaux, figés (spec V2 §7) :
//   diction : débit de lecture (voice-report : ligne de base, zone de bruit de Fred, RCI) ;
//   écoute  : faits clés retrouvés sur le passage réservé du bilan (0 à 3) ;
//   posture : comparaison à l'aveugle par un proche (présence vocale), sinon « pas encore mesurable » ;
//   RDV     : part des RDV sans faire répéter (mois 1 contre les 4 dernières semaines).
// Chaque indicateur se ramène à un z orienté (positif = dans le bon sens) :
//   diction : z = RCI × sens (le débit qui baisse est « plus posé ») ;
//   écoute (faits clés, bruit inconnu) : convention zFromDelta, +2 faits = 1,96, +1 fait = 1,28 ;
//   posture (proche) : 6 sur 6 = 1,96 (confirmation), 5 sur 6 = 1,28 (tendance), M §3.4 ;
//   RDV : P(taux récent > mois 1) en bêta-binomial (stats.probGreater), convention zFromProb.
// Règle de combinaison (M §1.4) : voir axisVerdict.
import { voiceReport, voiceSummary, formatDecimal } from './voice-report.js';
import { CALM_DIRECTION, defaultSd, median } from './acoustics.js';
import { rci, probGreater } from './stats.js';
import { rateTrend } from './dashboard.js';
import { rdvBoard } from './rdv.js';
import { hashString } from './pick.js';
import { dailyCount, monthCount } from './progress.js';
import { MONTHS_FR } from './dates.js';
import { FORME_OPTIONS, BILAN_EVERY, CONTROL_AFTER, bilansDone } from './bilan-plan.js';
import { pointsDone } from './weekly-point.js';

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const Z95 = 1.96;
const Z80 = 1.28;

export const STATE_TEXT = Object.freeze({
  calibrage: 'On apprend tes repères.',
  'pas-encore': 'Trop tôt pour trancher.',
  probable: 'Ça bouge dans le bon sens. Probable, pas encore sûr.',
  confirme: 'Progrès confirmé. Plus grand que tes variations normales, et vu deux fois.',
});
export const CONTRADICTION_TEXT = 'Les mesures ne sont pas d’accord, on revérifie au prochain bilan.';
export const REALISME = 'Ce que l’appli pourra te dire au bilan de la séance 72 : en diction et en écoute, probablement un verdict net ; en posture, seulement si un proche écoute tes enregistrements ; en RDV, au mieux une tendance, parce qu’il y aura trop peu de RDV pour plus. Et ce n’est pas un défaut de ta part.';
const DOWN = { confirme: 'probable', probable: 'pas-encore', 'pas-encore': 'pas-encore', calibrage: 'calibrage' };

/** Signe d'une famille de soutien à partir d'un z : +1, −1, ou 0 dans le bruit. */
export const signOf = (z) => (!isNum(z) ? 0 : z >= Z80 ? 1 : z <= -Z80 ? -1 : 0);

/** Faits clés (0 à 3), faute de bruit connu : +2 ou plus = 1,96 ; +1 = 1,28 ; symétrique à la baisse. */
export function zFromDelta(delta) {
  if (!isNum(delta) || delta === 0) return 0;
  const z = Math.abs(delta) >= 2 ? Z95 : Z80;
  return delta > 0 ? z : -z;
}

/** P(mieux) en bêta-binomial : ≥ 0,975 = 1,96 ; ≥ 0,90 = 1,28 ; symétrique à la baisse. */
export function zFromProb(p) {
  if (!isNum(p)) return 0;
  if (p >= 0.975) return Z95;
  if (p >= 0.9) return Z80;
  if (p <= 0.025) return -Z95;
  if (p <= 0.1) return -Z80;
  return 0;
}

/**
 * Verdict d'un axe (M §1.4).
 * - calibrage : moins de 3 mesures de base de l'indicateur principal ;
 * - confirme : z ≥ 1,96, au moins une autre famille dans le même sens, aucune dégradation probable, et une
 *   réplication (tendance ou confirmation au bilan précédent, OU au moins 2 inédits sur 3 dans le même sens) ;
 * - probable : z ≥ 1,28 (ou z ≥ 1,96 sans toutes les conditions) ;
 * - pas-encore : sinon.
 * Contradiction (une famille en sens inverse d'un indicateur qui bouge) : un cran plus bas.
 * baisse : z ≤ −1,96, au-delà de la MDC ; elle se DIT au bilan (M §4.4), sans état ni couleur à elle.
 * @param {{ primary: { calibrage?: boolean, available?: boolean, z?: number },
 *   others?: { family: string, sign: -1|0|1, degrade?: boolean }[], replication?: { inedits?: number[] },
 *   previousState?: string|null }} input
 */
export function axisVerdict({ primary = {}, others = [], replication = {}, previousState = null } = {}) {
  if (primary.calibrage) return { state: 'calibrage', contradiction: false, baisse: false, z: null };
  const z = primary.z;
  if (!primary.available || !isNum(z)) return { state: 'pas-encore', contradiction: false, baisse: false, z: null };
  let state = 'pas-encore';
  if (z >= Z95) {
    const other = others.some((o) => o.sign > 0);
    const noDegrade = !others.some((o) => o.degrade);
    const replicated = previousState === 'probable' || previousState === 'confirme'
      || (replication.inedits ?? []).filter((s) => s > 0).length >= 2;
    state = other && noDegrade && replicated ? 'confirme' : 'probable';
  } else if (z >= Z80) {
    state = 'probable';
  }
  const contradiction = (z >= Z80 && others.some((o) => o.sign < 0)) || (z <= -Z80 && others.some((o) => o.sign > 0));
  if (contradiction) state = DOWN[state];
  return { state, contradiction, baisse: z <= -Z95, z };
}

// ─── Écoute à l'aveugle par un proche (M §3.4) ───────────────────────────────────────────

/** 6 sur 6 (ou n sur n, n ≥ 5) : confirmation ; n − 1 : tendance ; sinon rien. */
export function readProche(k, n) {
  if (!isNum(k) || !isNum(n) || n < 5) return null;
  if (k >= n) return 'confirmation';
  if (k === n - 1) return 'tendance';
  return null;
}

function rng(seed) {
  let a = hashString(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REF_ID = 'fr.REF1';
const isRefTake = (r) => r.kind === 'reference';
/** La prise d'un texte dans une séance de bilan (la référence est une prise `reference` + voiceCheck 'bilan'). */
function takeOf(recordings, sessionId, textId, refRecordingId = null) {
  // Bilan du jour d'un contrôle de voix : il a réutilisé la lecture du contrôle (pas deux lectures le même jour).
  if (textId === REF_ID && refRecordingId) {
    const reused = (recordings ?? []).find((r) => r.id === refRecordingId);
    if (reused) return reused;
  }
  return (recordings ?? []).filter((r) => r.sessionId === sessionId
    && (textId === REF_ID ? isRefTake(r) && r.voiceCheck === 'bilan' : r.kind === 'bilan' && r.itemId === textId))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)).at(-1) ?? null;
}

/**
 * Les paires du proche : jusqu'à 6 paires réelles (même texte, une prise ancienne contre celle du bilan du
 * jour) et 1 paire leurre (la même prise du jour deux fois : le bilan n'a qu'une prise par texte). Ordre des
 * paires et côté du plus récent tirés par la graine, stockée avec le bilan.
 * Priorité : chaque texte contre le premier bilan (la référence contre la toute première lecture), puis
 * contre le bilan précédent.
 * @returns {{ id, textId, olderId, newerId, newerSide: 'A'|'B', leurre: boolean }[]}
 */
export function prochePairs({ recordings = [], bilans = [], current, seed }) {
  const texts = [REF_ID, ...[...(current?.bilan?.order ?? [])].sort()];
  const past = bilans.filter((b) => b.id !== current.id && b.bilan?.kind === 'bilan');
  const firstRef = [...recordings].filter(isRefTake).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))[0] ?? null;
  const candidates = [];
  const olderSets = [
    (t) => (t === REF_ID ? firstRef : past[0] ? takeOf(recordings, past[0].id, t, past[0].bilan?.refRecordingId) : null),
    (t) => (past.length ? takeOf(recordings, past.at(-1).id, t, past.at(-1).bilan?.refRecordingId) : null),
  ];
  for (const pick of olderSets) {
    for (const t of texts) {
      const newer = takeOf(recordings, current.id, t, current.bilan?.refRecordingId);
      const older = pick(t);
      if (!newer || !older || older.id === newer.id) continue;
      if (candidates.some((c) => c.olderId === older.id && c.newerId === newer.id)) continue;
      candidates.push({ textId: t, olderId: older.id, newerId: newer.id, leurre: false });
    }
  }
  const real = candidates.slice(0, 6);
  const decoy = takeOf(recordings, current.id, REF_ID, current.bilan?.refRecordingId) ?? takeOf(recordings, current.id, texts[1]);
  const all = decoy ? [...real, { textId: decoy.itemId ?? REF_ID, olderId: decoy.id, newerId: decoy.id, leurre: true }] : real;
  const rand = rng(seed);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.map((p, i) => ({ id: `p${i + 1}`, ...p, newerSide: rand() < 0.5 ? 'A' : 'B' }));
}

/**
 * Lecture des réponses du proche. q1 : « Laquelle on comprend le plus facilement ? » ; q2 : « Laquelle donne
 * le plus envie d'écouter la suite ? ». « Je ne sais pas » ne compte pas pour le plus récent. Le leurre est
 * exclu ; s'il est tranché aux deux questions, les réponses sont à prendre avec prudence (jamais dit au proche).
 */
export function procheScore({ pairs = [], answers = {} }) {
  const real = pairs.filter((p) => !p.leurre);
  const newer = (q) => real.filter((p) => answers[p.id]?.[q] === p.newerSide).length;
  const decoy = pairs.find((p) => p.leurre);
  const d = decoy ? answers[decoy.id] : null;
  return {
    n: real.length,
    intel: newer('q1'),
    presence: newer('q2'),
    leurrePrudence: Boolean(d && ['A', 'B'].includes(d.q1) && ['A', 'B'].includes(d.q2)),
  };
}

/** L'écoute par un proche n'est proposée qu'avec au moins 5 paires réelles comparables. */
function procheAvailable(recordings, sessions, session) {
  const bilans = [...bilansDone(sessions).filter((b) => b.id !== session.id), session];
  return prochePairs({ recordings, bilans, current: session, seed: 'disponible' }).filter((p) => !p.leurre).length >= 5;
}

// ─── Rapport de bilan (M §4.6) ───────────────────────────────────────────────────────────

const textLabel = (id) => (id === REF_ID ? 'Texte de référence' : `Texte ${String(id).slice(-1)}`);
const FORME_LABEL = Object.fromEntries(FORME_OPTIONS.map((o) => [o.value, o.label]));

/** Débit d'un texte lu à une séance de bilan (lignes `kind: 'bilan'`). */
function textValue(measures, sessionId, textId, metric = 'debit') {
  const rows = (measures ?? []).filter((m) => m.kind === 'bilan' && m.sessionId === sessionId
    && m.context?.texte === textId && m.metric === metric && isNum(m.value));
  return rows.length ? rows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)).at(-1).value : null;
}

const trendSign = (sessions, axis, todayKey, sinceKey) => {
  try {
    return rateTrend(sessions, axis, todayKey, { sinceKey }) === 'probable' ? 1 : 0;
  } catch {
    return 0;
  }
};

function procheSign(k, n) {
  const r = readProche(k, n);
  if (r) return 1;
  return isNum(n) && n >= 5 && k <= 1 ? -1 : 0;
}

function procheZ(k, n) {
  const r = readProche(k, n);
  if (r === 'confirmation') return Z95;
  if (r === 'tendance') return Z80;
  return isNum(n) && n >= 5 && k <= 1 ? -Z80 : 0;
}

const prevState = (prev, key) => prev?.bilan?.report?.axes?.find((a) => a.key === key)?.state ?? null;
const familyLine = (o) => `${o.label} : ${o.sign > 0 ? 'dans le même sens' : o.sign < 0 ? 'en sens inverse' : 'pas de changement net'}.`;

function axisOut(key, label, verdict, { lines = [], detail = [], others = [], band = null, inedits = [], extraState = null, baisseText = null }) {
  const stateText = [extraState ?? STATE_TEXT[verdict.state], verdict.contradiction ? CONTRADICTION_TEXT : null].filter(Boolean).join(' ');
  return {
    key, label, state: verdict.state, stateText, contradiction: verdict.contradiction, baisse: verdict.baisse,
    z: verdict.z, lines: verdict.baisse && baisseText ? [...lines, baisseText] : lines,
    detail: [...detail, ...others.map(familyLine)], others, band, inedits,
  };
}

function dictionAxis({ session, prev, sessions, measures, todayKey, sinceKey, forme, index }) {
  const vr = voiceReport(measures);
  const d = vr.metrics?.debit;
  const others = [
    { family: 'ressenti', label: 'Ton ressenti « Clair »', sign: trendSign(sessions, 'diction', todayKey, sinceKey) },
    { family: 'ab', label: 'Ton écoute à l’aveugle', sign: session.bilan?.ab === 'recent' ? 1 : 0 },
  ];
  const proche = session.bilan?.proche;
  if (proche) others.push({ family: 'proche', label: 'Le proche (compréhension)', sign: procheSign(proche.intel, proche.n) });
  // Inédits, texte par texte, contre le bilan précédent (le premier bilan est leur référence).
  const sdRel = d && isNum(d.sdw) && isNum(d.base) && d.base > 0 ? d.sdw / d.base : null;
  const inedits = [...(session.bilan?.order ?? [])].sort().map((t) => {
    const cur = textValue(measures, session.id, t);
    const before = prev ? textValue(measures, prev.id, t) : null;
    let sign = null;
    if (isNum(cur) && isNum(before)) {
      const sd = sdRel !== null ? sdRel * before : defaultSd('debit', before);
      sign = signOf(CALM_DIRECTION.debit * rci(before, cur, sd));
    }
    return { textId: t, value: cur, previous: before, sign };
  });
  let primary;
  if (vr.state === 'calibrage') primary = { calibrage: true };
  else if (vr.state !== 'suivi' || !d || !isNum(d.current) || !isNum(d.sdw)) primary = { available: false };
  else primary = { available: true, z: CALM_DIRECTION.debit * rci(d.base, d.current, d.sdw) };
  const verdict = axisVerdict({
    primary, others, previousState: prevState(prev, 'diction'),
    replication: { inedits: inedits.map((x) => x.sign).filter((s) => s !== null) },
  });
  const sum = voiceSummary(vr);
  const lines = [];
  if (vr.state === 'suivi') lines.push(sum.headline);
  else if (vr.state === 'calibrage') lines.push(sum.headline);
  if (!prev) lines.push('Textes inédits : première mesure, la comparaison commence au prochain bilan.');
  const detail = [];
  if (isNum(verdict.z) && d) {
    detail.push(`RCI = ${formatDecimal(rci(d.base, d.current, d.sdw), 2)} (changement fiable à partir de ±1,96).`);
    detail.push(`MDC95 = ${formatDecimal(d.mdc, 2)} syll/s, SDw = ${formatDecimal(d.sdw, 2)} syll/s.`);
  }
  detail.push('Méthode : médiane de 3 prises par mesure de voix, ligne de base sur les 3 séances de calibration, bruit estimé sans le point jugé.');
  for (const x of inedits) {
    if (!isNum(x.value)) continue;
    detail.push(isNum(x.previous)
      ? `${textLabel(x.textId)} : environ ${formatDecimal(x.value)} syll/s (bilan précédent : ${formatDecimal(x.previous)}).`
      : `${textLabel(x.textId)} : environ ${formatDecimal(x.value)} syll/s (première mesure).`);
  }
  const refId = session.bilan?.refRecordingId;
  const refToday = refId
    ? median((measures ?? []).filter((m) => m.recordingId === refId && m.metric === 'debit' && isNum(m.value)).map((m) => m.value))
    : textValue(measures, session.id, REF_ID);
  if (isNum(refToday)) detail.push(`Texte de référence aujourd’hui (une prise) : environ ${formatDecimal(refToday)} syll/s.`);
  let extraState = null;
  if (verdict.state === 'pas-encore' && index >= 3 && d && isNum(d.mdc)) {
    extraState = `Pas de changement visible au-delà de tes variations. Ça ne veut pas dire zéro : la mesure ne voit pas en dessous de ${formatDecimal(d.mdc)} syll/s.`;
  }
  const formeText = FORME_LABEL[forme] ?? 'non dite';
  return axisOut('diction', 'Diction', verdict, {
    lines, detail, others, inedits, extraState, band: sum.bands.find((b) => b.metric === 'debit') ?? null,
    baisseText: `Ce bilan, ton débit de lecture est plus rapide qu’au départ. Causes fréquentes : fatigue, rhume, journée chargée, micro. Ta forme du jour : ${formeText}. On refait la mesure dans 5 séances (3 min).`,
  });
}

const faitsCount = (s) => (Array.isArray(s?.bilan?.faits) ? s.bilan.faits.filter(Boolean).length : null);

function ecouteAxis({ session, prev, sessions, todayKey, sinceKey, forme }) {
  const cur = faitsCount(session);
  const before = faitsCount(prev);
  const others = [{ family: 'ressenti', label: 'Ton ressenti « Repéré »', sign: trendSign(sessions, 'ecoute', todayKey, sinceKey) }];
  let primary;
  if (!isNum(cur)) primary = { available: false };
  else if (!isNum(before)) primary = { calibrage: true };
  else primary = { available: true, z: zFromDelta(cur - before) };
  const verdict = axisVerdict({ primary, others, previousState: prevState(prev, 'ecoute') });
  const lines = isNum(cur)
    ? [`Faits clés retrouvés : ${cur} sur 3${isNum(before) ? ` (bilan précédent : ${before} sur 3)` : ''}.`]
    : ['Pas de faits clés notés à ce bilan.'];
  return axisOut('ecoute', 'Écoute', verdict, {
    lines, others,
    detail: ['Méthode : un passage réservé à chaque bilan, jamais entendu avant, puis 3 faits clés cochés après ta reformulation.',
      'Convention : 2 faits de plus = changement net, 1 fait = tendance (le bruit de cette mesure n’est pas connu).'],
    extraState: verdict.state === 'calibrage' ? 'Première mesure : la comparaison commence au prochain bilan.' : null,
    baisseText: `Ce bilan, tu as retrouvé moins de faits clés qu’au précédent. Causes fréquentes : fatigue, journée chargée, passage plus dense. Ta forme du jour : ${FORME_LABEL[forme] ?? 'non dite'}. On regarde au prochain bilan.`,
  });
}

function postureAxis({ session, prev, sessions, measures, todayKey, sinceKey }) {
  const proche = session.bilan?.proche;
  const rows = (measures ?? []).filter((m) => m.kind === 'posture' && m.metric === 'silenceTenu' && isNum(m.value))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  let silenceSign = 0;
  if (rows.length >= 6) {
    const diff = median(rows.slice(-3).map((r) => r.value)) - median(rows.slice(0, 3).map((r) => r.value));
    silenceSign = diff >= 1 ? 1 : diff <= -1 ? -1 : 0;
  }
  const others = [
    { family: 'ressenti', label: 'Ton ressenti « Posé »', sign: trendSign(sessions, 'posture', todayKey, sinceKey) },
    { family: 'micro', label: 'Le silence tenu au micro', sign: silenceSign },
  ];
  const primary = proche && isNum(proche.n) && proche.n > 0 ? { available: true, z: procheZ(proche.presence, proche.n) } : { available: false };
  const verdict = axisVerdict({ primary, others, previousState: prevState(prev, 'posture') });
  const lines = primary.available
    ? [`Un proche a préféré l’enregistrement le plus récent : ${proche.presence} paires sur ${proche.n} (envie d’écouter la suite).`]
    : ['Pas encore mesurable : il faut l’écoute à l’aveugle d’un proche.'];
  return axisOut('posture', 'Posture', verdict, {
    lines, others,
    extraState: primary.available ? null : 'Pas encore mesurable.',
    detail: ['Méthode : un proche compare à l’aveugle des paires du même texte, l’ancienne et la récente, sans savoir laquelle est laquelle. 6 sur 6 = confirmation, 5 sur 6 = tendance.',
      ...(proche?.leurrePrudence ? ['Paire de contrôle : le proche a entendu une différence là où il n’y en avait pas. Ses réponses sont à prendre avec prudence.'] : [])],
  });
}

function rdvAxis({ prev, sessions, todayKey }) {
  const line = rdvBoard(sessions, todayKey).find((l) => l.key === 'repeter');
  const obj = rdvBoard(sessions, todayKey).find((l) => l.key === 'objectif');
  const enough = line && line.separate && line.month1.n >= 3 && line.recent.n >= 3;
  const objSign = obj && obj.separate && obj.month1.n >= 3 && obj.recent.n >= 3
    ? signOf(zFromProb(probGreater(obj.recent.k, obj.recent.n, obj.month1.k, obj.month1.n))) : 0;
  const others = [{ family: 'terrain', label: 'Tes objectifs de RDV atteints', sign: objSign }];
  const primary = enough
    ? { available: true, z: zFromProb(probGreater(line.recent.k, line.recent.n, line.month1.k, line.month1.n)) }
    : { calibrage: true };
  const verdict = axisVerdict({ primary, others, previousState: prevState(prev, 'rdv') });
  const lines = line && line.month1.n
    ? [`On ne t’a pas fait répéter : ${line.recent.k} sur ${line.recent.n} ces 4 semaines (mois 1 : ${line.month1.k} sur ${line.month1.n}).`]
    : ['Pas encore de RDV noté.'];
  return axisOut('rdv', 'En RDV', verdict, {
    lines, others,
    extraState: verdict.state === 'calibrage' ? 'On apprend tes repères : la comparaison apparaît après 3 RDV de chaque côté.' : null,
    detail: ['Méthode : mois 1 contre les 4 dernières semaines, en bêta-binomial ; au mieux une tendance, il y a trop peu de RDV pour plus.'],
    baisseText: 'Ces 4 semaines, on t’a fait répéter plus souvent qu’au mois 1. Ça dépend aussi des prospects rencontrés. On regarde au prochain bilan.',
  });
}

/**
 * Le rapport d'un bilan, sur un écran (M §4.6) : sûr (effort), mesuré (4 axes), ressenti ; une seule action.
 * Le détail (chiffres, méthode, RCI) est dans `axes[i].detail`, à un tap. À recalculer après l'écoute du proche.
 * @returns {{ index, sessionNumber, dateKey, first, title, sur, axes, ressenti: { lines }, action, actionKind,
 *   realisme: string|null, controlDueAt: number|null }}
 */
export function buildBilanReport({ session, sessions = [], recordings = [], measures = [], todayKey, lines: mesure = {} }) {
  const index = session.bilan?.index ?? 1;
  const past = bilansDone(sessions).filter((b) => b.id !== session.id && (b.startedAt ?? 0) < (session.startedAt ?? Infinity));
  const prev = past.at(-1) ?? null;
  const sinceKey = prev?.dateKey ?? null;
  const forme = session.bilan?.forme ?? null;
  const ctx = { session, prev, sessions, recordings, measures, todayKey, sinceKey, forme, index };
  const axes = [dictionAxis(ctx), ecouteAxis(ctx), postureAxis(ctx), rdvAxis(ctx)];

  const n = dailyCount(sessions);
  const [y, m] = String(todayKey).split('-').map(Number);
  const days = isNum(y) && isNum(m) ? monthCount(sessions, y, m) : 0;
  const sur = `${n} séance${n > 1 ? 's' : ''} faite${n > 1 ? 's' : ''}. ${days} jour${days > 1 ? 's' : ''} pratiqué${days > 1 ? 's' : ''} en ${MONTHS_FR[(m || 1) - 1]}.`;

  const ressenti = [];
  const points = pointsDone(sessions).filter((s) => !prev || (s.startedAt ?? 0) > (prev.startedAt ?? 0)).filter((s) => s.weeklyPoint.ready);
  if (points.length) ressenti.push(`« Prêt pour un RDV » : ${points.filter((s) => s.weeklyPoint.ready === 'pret').length} points sur ${points.length}.`);
  const grille = session.bilan?.grille ?? {};
  for (const it of mesure.autoGrille ?? []) {
    const v = grille[it.id];
    if (v === 'no') ressenti.push(`${it.competence} : non observé.`);
    else if (isNum(v)) ressenti.push(`${it.competence} : repère ${v} sur 3.`);
  }
  if (session.bilan?.ab === 'recent') ressenti.push('À l’aveugle, tu as préféré ta lecture d’aujourd’hui.');
  else if (session.bilan?.ab === 'first') ressenti.push('À l’aveugle, tu as préféré ta première lecture.');

  // Une seule action (M §4.6).
  const dictionDown = axes[0].baisse;
  let action;
  let actionKind;
  if (dictionDown) {
    action = `Un bilan de contrôle dans ${CONTROL_AFTER} séances : 3 minutes, le texte de référence et les textes inédits.`;
    actionKind = 'controle';
  } else if (index >= 2 && !session.bilan?.proche && procheAvailable(recordings, sessions, session)) {
    action = 'Fais écouter tes lectures à un proche, à l’aveugle : 10 minutes, il tient ton téléphone.';
    actionKind = 'proche';
  } else {
    const rated = (mesure.autoGrille ?? []).filter((it) => isNum(grille[it.id])).sort((a, b) => grille[a.id] - grille[b.id]);
    if (rated.length && grille[rated[0].id] < 3) {
      action = `« ${rated[0].competence} » : c’est là que tu as le plus de marge.`;
      actionKind = 'grille';
    } else {
      action = `Continue. Prochain bilan à la séance ${(index + 1) * BILAN_EVERY}.`;
      actionKind = 'continuer';
    }
  }
  return {
    index,
    sessionNumber: session.sessionNumber ?? null,
    dateKey: session.dateKey,
    first: !prev,
    title: `Bilan · séance ${session.sessionNumber ?? index * BILAN_EVERY}`,
    sur,
    axes,
    ressenti: { lines: ressenti },
    action,
    actionKind,
    realisme: prev ? null : REALISME,
    controlDueAt: dictionDown && isNum(session.sessionNumber) ? session.sessionNumber + CONTROL_AFTER : null,
  };
}

/**
 * Résultat d'un bilan de contrôle (M §4.4) : la lecture du texte de référence du contrôle, contre la ligne de
 * base de la voix. Toujours au-delà de la MDC : la baisse se confirme (un signal, une piste) ; sinon, elle ne
 * se retrouve pas.
 */
export function controlResult({ control, measures = [] }) {
  const vr = voiceReport(measures);
  const d = vr.metrics?.debit;
  const cur = textValue(measures, control.id, REF_ID);
  if (!isNum(cur) || !d || !isNum(d.base) || !isNum(d.sdw)) {
    return { confirmee: null, text: 'Pas de lecture valide à ce contrôle : on regarde au prochain bilan.', piste: null };
  }
  const z = CALM_DIRECTION.debit * rci(d.base, cur, d.sdw);
  if (z <= -Z95) {
    return {
      confirmee: true,
      text: 'La baisse se confirme sur le débit de lecture. Ce n’est pas un jugement sur toi : c’est un signal.',
      piste: 'Une piste : reviens au « lent puis normal » pendant 5 séances.',
    };
  }
  return { confirmee: false, text: 'La baisse ne se retrouve pas aujourd’hui : c’était probablement la journée.', piste: null };
}
