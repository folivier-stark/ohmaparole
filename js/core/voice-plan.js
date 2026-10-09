// Calendrier des mesures de la voix (spec V2 §4, eval-diction.md §3.3, eval-methodologie.md §2.2). PUR.
//
// Il REMPLACE les jalons J1, J7, J14, J30 et J60 de la V1 : plus aucun jalon n'est planifié.
// - Calibration : les séances qui suivent la mise à jour, tant qu'il y a moins de 3 séances de calibration
//   valides (D §3.3 : 3 séances, 3 jours différents). Une séance est valide avec au moins 2 prises valides
//   (SESSION_MIN_TAKES : avec une seule, ce n'est plus une médiane).
// - Contrôle : ensuite, toutes les 6 séances comptées depuis la dernière mesure de voix valide.
// - Jamais deux mesures de voix le même jour : 3 occasions différentes (M §2.2), pas 3 prises d'affilée.
//
// La source est la liste des ENREGISTREMENTS : seule une prise valide est enregistrée (`kind: 'reference'`,
// `voiceCheck`, `sessionNumber`). Le calendrier ne dépend donc ni de la version de l'algorithme, ni d'une
// réanalyse en cours. Les références V1 (`milestone` 1, 7, 14, 30…, sans `voiceCheck`) restent valides :
// elles figurent dans la frise et l'A/B, mais ne comptent ni comme calibration, ni comme contrôle.
import { SESSION_MIN_TAKES } from './acoustics.js';

export const CALIBRATION_SESSIONS = 3;
export const CONTROL_EVERY = 6;
/** 'bilan' : la lecture du texte de référence d'un bilan (une prise, spec V2 §7) compte comme une mesure de voix. */
export const VOICE_KINDS = Object.freeze(['calibration', 'controle', 'bilan']);
const MIN_TAKES = { calibration: SESSION_MIN_TAKES, controle: SESSION_MIN_TAKES, bilan: 1 };

const norm = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Math.floor(Number(n)) : 0);
const isReference = (r) => r && r.kind === 'reference';
const isVoiceTake = (r) => isReference(r) && VOICE_KINDS.includes(r.voiceCheck);
const byCreated = (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0);

/**
 * Les séances de mesure de la voix, dans l'ordre chronologique (première prise).
 * @returns {{ sessionId, kind: 'calibration'|'controle', dateKey, sessionNumber: number|null,
 *   createdAt: number, takes: number, recordingIds: string[], valid: boolean }[]}
 */
export function voiceChecks(recordings) {
  const groups = new Map();
  for (const r of [...(recordings ?? [])].filter(isVoiceTake).sort(byCreated)) {
    const key = r.sessionId ?? `jour:${r.dateKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        sessionId: r.sessionId ?? null, kind: r.voiceCheck, dateKey: r.dateKey,
        sessionNumber: Number.isFinite(r.sessionNumber) ? r.sessionNumber : null,
        createdAt: r.createdAt ?? 0, takes: 0, recordingIds: [], valid: false,
      });
    }
    const g = groups.get(key);
    g.takes += 1;
    g.recordingIds.push(r.id);
    g.valid = g.takes >= MIN_TAKES[g.kind];
  }
  return [...groups.values()];
}

const validChecks = (recordings) => voiceChecks(recordings).filter((c) => c.valid);

/** Séances de calibration valides qui manquent encore (0 à 3). */
export function calibrationRemaining(recordings) {
  const done = validChecks(recordings).filter((c) => c.kind === 'calibration').length;
  return Math.max(0, CALIBRATION_SESSIONS - done);
}

/**
 * La mesure de voix due à la PROCHAINE séance (numéro dailyCount + 1), ou null.
 * todayKey : si une mesure valide a déjà eu lieu ce jour-là, rien n'est dû (une occasion par jour).
 * @returns {'calibration'|'controle'|null}
 */
export function voiceCheckDue(recordings, dailyCount, { todayKey = null } = {}) {
  const checks = validChecks(recordings);
  if (todayKey && checks.some((c) => c.dateKey === todayKey)) return null;
  if (checks.filter((c) => c.kind === 'calibration').length < CALIBRATION_SESSIONS) return 'calibration';
  const last = checks.at(-1);
  return norm(dailyCount) + 1 - (last.sessionNumber ?? 0) >= CONTROL_EVERY ? 'controle' : null;
}

/**
 * Séances à faire jusqu'au prochain contrôle, celui-ci compris (1 = à la prochaine séance), ou null
 * pendant la calibration. Jamais moins de 1 : un contrôle en retard reste dû à la prochaine séance.
 */
export function sessionsUntilControl(recordings, dailyCount) {
  if (calibrationRemaining(recordings) > 0) return null;
  const last = validChecks(recordings).at(-1);
  return Math.max(1, (last.sessionNumber ?? 0) + CONTROL_EVERY - norm(dailyCount));
}

/**
 * Condition de la réplique de fin du bloc voix (répliques jal-* de content/fr/louarn.json, moment 'jalon') :
 * 'jalon:1' à la toute première mesure valide, 'jalon:7' au premier contrôle, puis 'jalon:14', 'jalon:30'
 * (contrôle à 30 séances ou plus) et 'jalon:60+' (à 60 ou plus). null pour une autre séance, ou pour un bloc
 * voix sans 2 prises valides.
 */
export function voiceJalonTag(session, recordings) {
  if (!session?.voiceCheck) return null;
  const checks = validChecks(recordings);
  const own = checks.find((c) => c.sessionId === session.id);
  if (!own) return null;
  if (own.kind === 'bilan') return null; // le bilan a son propre écran
  if (own.kind === 'calibration') return checks[0] === own ? 'jalon:1' : null;
  if (checks.find((c) => c.kind === 'controle') === own) return 'jalon:7';
  const n = own.sessionNumber ?? norm(session.sessionNumber);
  if (n >= 60) return 'jalon:60+';
  return n >= 30 ? 'jalon:30' : 'jalon:14';
}

/**
 * Les deux souvenirs de la voix (G §4.3, reliés aux contrôles en phase 3) : « Le premier écho » au premier
 * contrôle valide, « Le grand écho » au premier contrôle valide fait à 30 séances comptées ou plus.
 */
export function voiceEchoes(recordings) {
  const controls = validChecks(recordings).filter((c) => c.kind === 'controle');
  return {
    premier: controls[0] ?? null,
    grand: controls.find((c) => (c.sessionNumber ?? 0) >= 30) ?? null,
  };
}

/** « 11/10 » pour '2026-10-11'. */
const dayMonth = (key) => (key ? `${Number(key.slice(8))}/${Number(key.slice(5, 7))}` : '');

/**
 * Les occasions où la voix a été enregistrée sur le texte de référence, pour la frise de Progression :
 * les références V1 (« J7 »), puis les séances de calibration (« Départ 1 » à 3) et les contrôles valides.
 * @returns {{ label: string, dateKey: string, createdAt: number, kind: 'reference-v1'|'calibration'|'controle' }[]}
 */
export function voiceTimeline(recordings) {
  const v1 = (recordings ?? []).filter((r) => isReference(r) && !r.voiceCheck && r.milestone != null)
    .map((r) => ({ label: `J${r.milestone}`, dateKey: r.dateKey, createdAt: r.createdAt ?? 0, kind: 'reference-v1' }));
  let cal = 0;
  let ctl = 0;
  let bil = 0;
  const checks = validChecks(recordings).map((c) => ({
    label: c.kind === 'calibration' ? `Départ ${++cal}` : c.kind === 'bilan' ? `Bilan ${++bil}` : `Contrôle ${++ctl}`,
    dateKey: c.dateKey, createdAt: c.createdAt, kind: c.kind,
  }));
  return [...v1, ...checks].sort(byCreated);
}

const abLabel = (r) => (!r.voiceCheck && r.milestone != null ? `J${r.milestone}` : dayMonth(r.dateKey));

/**
 * L'écoute A/B à l'aveugle : le PREMIER enregistrement de référence contre le PLUS RÉCENT, qu'il vienne
 * de la V1, d'une calibration ou d'un contrôle. null tant que les deux ne sont pas de jours différents.
 */
export function abPair(recordings) {
  const refs = (recordings ?? []).filter(isReference).sort(byCreated);
  const a = refs[0];
  const b = refs.at(-1);
  if (!a || !b || a === b || a.dateKey === b.dateKey) return null;
  return { a, b, labelA: abLabel(a), labelB: abLabel(b) };
}

/**
 * La dernière prise d'une mesure de voix VALIDE (calibration ou contrôle) faite ce jour-là, ou null : un bilan
 * du même jour la réutilise au lieu de relire le texte de référence (spec V2 §7.1).
 */
export function todayReferenceTake(recordings, todayKey) {
  const check = validChecks(recordings).filter((c) => c.dateKey === todayKey && c.kind !== 'bilan').at(-1);
  if (!check) return null;
  const takes = (recordings ?? []).filter((r) => check.recordingIds.includes(r.id)).sort(byCreated);
  return takes.at(-1) ?? null;
}
