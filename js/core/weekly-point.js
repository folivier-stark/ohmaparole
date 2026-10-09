// Le point de la semaine (spec V2 §6, eval-methodologie.md §3.2 = M, eval-rdv.md §3.3 = R). PUR.
//
// - À la DERNIÈRE séance de chaque thème (toutes les 4 séances comptées), il REMPLACE le bloc 3 (écoute ou
//   posture) : la séance reste à 5 min, jamais de séance en plus.
// - Deux formats en alternance : A « parole spontanée » (45 s, M §3.2) puis B « réplique éclair » (90 s, R §3.3).
// - Jamais avec une mesure de voix ni une reprise : il est alors reporté à la séance suivante (même thème
//   dû tant qu'aucune séance comptée ne l'a porté). Un point passé (« Passer ce bloc ») compte comme fait :
//   la mesure ne doit jamais devenir une dette (R §6, garde-fou 8).
// - La séance porte `weeklyPoint: { theme, format, itemId, ready, criteres }`.
import { pickLeastRecent } from './pick.js';
import { ALGO_VERSION, median } from './acoustics.js';
import { plural } from './texts.js';

export const POINT_EVERY = 4;
export const CYCLE_SESSIONS = 72;
export const SPONTANE_MAX_SEC = 45;
export const READY_OPTIONS = Object.freeze([
  Object.freeze({ value: 'pasPret', label: 'Pas prêt' }),
  Object.freeze({ value: 'plutotPret', label: 'Plutôt prêt' }),
  Object.freeze({ value: 'pret', label: 'Prêt' }),
]);
export const READY_QUESTION = 'Si tu avais un RDV demain :';

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isCountedDaily = (s) => s?.counted === true && (s.type === 'daily' || s.type === 'comeback');

/** Les points faits (séances comptées qui portaient un point), dans l'ordre. */
export function pointsDone(sessions) {
  return (sessions ?? []).filter((s) => isCountedDaily(s) && s.weeklyPoint?.theme)
    .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
}

/**
 * Le point dû à la séance `sessionNumber`, ou null. Le thème est celui de la dernière fin de thème atteinte
 * (floor(n / 4)) : dû à la séance 4t, ou reporté aux séances 4t + 1 à 4t + 3 s'il n'a pas encore eu lieu.
 * @returns {{ theme: number, format: 'spontane'|'eclair' }|null}
 */
export function weeklyPointDue({ sessionNumber, sessions = [], voiceCheck = null, comeback = false }) {
  if (voiceCheck || comeback) return null;
  const theme = Math.floor((Number(sessionNumber) || 0) / POINT_EVERY);
  if (theme < 1) return null;
  const done = pointsDone(sessions);
  if (done.some((s) => s.weeklyPoint.theme === theme)) return null;
  return { theme, format: done.length % 2 === 0 ? 'spontane' : 'eclair' };
}

const cycleOf = (n) => Math.floor((Math.max(1, Number(n) || 1) - 1) / CYCLE_SESSIONS) + 1;

/**
 * La question (A) ou la réplique (B) du point : jamais la même deux fois dans un même cycle de 72 séances,
 * puis la moins récente. Déterministe (graine jour + séance).
 */
export function pickPointItem({ format, mesure, sessions = [], sessionNumber, dateKey }) {
  const pool = (format === 'eclair' ? mesure?.repliquesEclair : mesure?.questionsSpontanees) ?? [];
  if (!pool.length) return null;
  const done = pointsDone(sessions).filter((s) => s.weeklyPoint.format === format);
  const cycle = cycleOf(sessionNumber);
  const used = new Set(done.filter((s) => cycleOf(s.sessionNumber) === cycle).map((s) => s.weeklyPoint.itemId));
  const fresh = pool.filter((it) => !used.has(it.id));
  const history = done.map((s) => s.weeklyPoint.itemId).reverse();
  return pickLeastRecent(fresh.length ? fresh : pool, history, `${dateKey}#${sessionNumber}:point`);
}

/**
 * Lignes `measures` d'une prise de parole spontanée (A) : % de pause, nombre de pauses (au moins 250 ms)
 * et durée de parole. Ni débit ni syllabes : il n'y a pas de texte (M §3.2). kind 'spontane'.
 */
export function spontaneRows(recording, res, { kind = 'spontane', context = {} } = {}) {
  const a = res?.analysis;
  if (!res?.valid || !a || !isNum(a.D) || a.D <= 0) return [];
  const algoVersion = a.algoVersion ?? ALGO_VERSION;
  const values = { pausePctSpontane: (a.pauseTotal ?? 0) / a.D, pauseCountSpontane: a.pauseCount, dureeSpontane: a.D };
  return Object.entries(values).filter(([, v]) => isNum(v)).map(([metric, value]) => ({
    id: `${recording.id}:${metric}:${algoVersion}`,
    recordingId: recording.id,
    sessionId: recording.sessionId ?? null,
    dateKey: recording.dateKey,
    createdAt: recording.createdAt,
    kind,
    metric,
    value: metric === 'pausePctSpontane' ? Math.round(value * 1000) / 1000 : value,
    algoVersion,
    snrDb: isNum(a.snrDb) ? a.snrDb : null,
    context: { ...(typeof a.leadSilent === 'boolean' ? { leadSilent: a.leadSilent } : {}), ...context },
  }));
}

const pct = (x) => `${Math.round(x * 100)} %`;
const READY_LABEL = Object.fromEntries(READY_OPTIONS.map((o) => [o.value, o.label]));

/**
 * La carte « Ton point de la semaine » de Progression. Vocabulaire calibré : comptes bruts, « environ »,
 * aucune baisse dite. Le % de pause en parole spontanée n'apparaît qu'à partir de 3 mesures (départ =
 * médiane des 3 premières, aujourd'hui = médiane des 3 dernières).
 * @returns {{ empty: boolean, lines: string[] }}
 */
export function pointSummary({ sessions = [], measures = [] } = {}) {
  const done = pointsDone(sessions);
  const lines = [];
  const ready = done.filter((s) => READY_LABEL[s.weeklyPoint.ready]).slice(-4);
  if (ready.length) {
    const k = ready.filter((s) => s.weeklyPoint.ready === 'pret').length;
    const last = READY_LABEL[ready.at(-1).weeklyPoint.ready];
    const over = ready.length > 1 ? `tes ${ready.length} derniers points` : 'ton dernier point';
    lines.push(`${READY_QUESTION} « Prêt » ${k} fois sur ${over}. Dernier : « ${last} ».`);
  }
  const pauses = (measures ?? []).filter((m) => m.kind === 'spontane' && m.metric === 'pausePctSpontane'
    && m.algoVersion === ALGO_VERSION && isNum(m.value)).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  if (pauses.length >= 3) {
    const now = median(pauses.slice(-3).map((m) => m.value));
    const start = median(pauses.slice(0, 3).map((m) => m.value));
    lines.push(`En parole spontanée, tu t’arrêtes environ ${pct(now)} du temps (au départ : ${pct(start)}).`);
  } else if (pauses.length) {
    lines.push(`Parole spontanée : encore ${plural(3 - pauses.length, 'point')} avant de comparer.`);
  }
  const eclair = done.filter((s) => s.weeklyPoint.format === 'eclair' && Array.isArray(s.weeklyPoint.criteres));
  if (eclair.length) {
    const checked = eclair.reduce((n, s) => n + s.weeklyPoint.criteres.filter(Boolean).length, 0);
    lines.push(`Réplique éclair : ${checked} ${checked > 1 ? 'cases cochées' : 'case cochée'} sur ${eclair.length * 2}.`);
  }
  return { empty: done.length === 0, lines };
}
