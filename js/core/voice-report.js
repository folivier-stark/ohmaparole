// Mesures de la voix : lignes stockées, ligne de base, zone de bruit, verdict et phrases de la carte
// Diction (spec V2 §4, eval-diction.md §3.3 et §4 = D, eval-methodologie.md §2.2 et §4 = M). PUR.
//
// Stockage (store IndexedDB `measures`, M §5.1) : UNE LIGNE PAR VALEUR, jamais agrégée. Une prise valide
// donne 5 lignes : debit, pausePct, debitArticulatoire, pauseCount et cvDebit (calculé, JAMAIS affiché).
// L'id `recordingId:metric:algoVersion` rend l'écriture idempotente (réanalyse, import de sauvegarde).
//
// Choix documentés (spec V2 §4) :
// - Ligne de base = médiane des médianes des 3 premières séances valides (D §3.3). La toute première prise
//   de la toute première séance est écartée (M §2.2 : la 1re passation sert de familiarisation, l'effet de
//   pratique y est maximal), sauf si cette séance n'a que 2 prises valides : une médiane en demande 2.
// - SDw de calibration = sdWithin(médianes des 3 séances, défaut de D §3.2), écart type simple, sans
//   detrend (aucun progrès attendu en 3 séances).
// - Ensuite, le bruit s'estime SANS le point jugé (décision du 09/10) : pour le verdict de la séance n,
//   SDw = max(sdWithin(séances 1 à n − 1, défaut, { detrend: true }), SDw de calibration), les écarts autour
//   de la tendance (D §3.3), jamais sous la calibration. Avant le 4e point de cette série (premier contrôle),
//   c'est le SDw de calibration. Ainsi un vrai saut n'élargit pas lui-même sa zone de bruit.
// - Verdict = verdictReading(base, médiane de la dernière séance, SDw, CALM_DIRECTION[mesure]).
// - Zone probable aujourd'hui (le trait de la bande, M §4.3) : médiane ± 1,28 × SDw (80 %).
import {
  ALGO_VERSION, READING_KEYS, CALM_DIRECTION, BASELINE_MIN_SESSIONS, sessionMedians, baseline, sdWithin, defaultSd,
  verdictReading,
} from './acoustics.js';
import { mdc95 } from './stats.js';
import { plural } from './texts.js';

export const STORED_METRICS = Object.freeze([...READING_KEYS, 'cvDebit']);
export const MEASURE_KINDS = Object.freeze(['calibration', 'controle', 'reference-v1']);
/** Mesures dont on calcule ligne de base et verdict. cvDebit n'en fait pas partie : il est en observation. */
export const REPORT_METRICS = Object.freeze(['debit', 'pausePct', 'debitArticulatoire', 'pauseCount']);
const Z80 = 1.28;

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * Les lignes `measures` d'une prise analysée. metrics : readingMetrics() ; cv : speechRateCV().cv.
 * Une valeur absente (null, NaN) ne donne pas de ligne.
 * @returns {{ id, recordingId, sessionId, dateKey, createdAt, kind, metric, value, algoVersion, snrDb,
 *   context: { forme?, leadSilent? } }[]}
 */
export function measureRows({ recording, kind, metrics = {}, cv = null, snrDb = null, algoVersion = ALGO_VERSION, context = {} }) {
  if (!MEASURE_KINDS.includes(kind)) throw new RangeError(`Type de mesure inconnu : ${kind}`);
  const values = { ...metrics, cvDebit: cv };
  return STORED_METRICS.filter((m) => isNum(values[m])).map((metric) => ({
    id: `${recording.id}:${metric}:${algoVersion}`,
    recordingId: recording.id,
    sessionId: recording.sessionId ?? null,
    dateKey: recording.dateKey,
    createdAt: recording.createdAt,
    kind,
    metric,
    value: values[metric],
    algoVersion,
    snrDb: isNum(snrDb) ? snrDb : null,
    context: { ...(context ?? {}) },
  }));
}

/**
 * Les séances de mesure de la voix (calibration et contrôle) d'une version de l'algorithme, dans l'ordre.
 * Les références V1 (`reference-v1`) n'y entrent pas : autre protocole (pas de silence initial).
 * @returns {{ sessionId, kind, dateKey, createdAt, valid: boolean,
 *   takes: { recordingId, createdAt, debit, pausePct, debitArticulatoire, pauseCount, cvDebit }[] }[]}
 */
export function voiceSessions(measures, { algoVersion = ALGO_VERSION } = {}) {
  const takes = new Map();
  for (const m of measures ?? []) {
    if (m.algoVersion !== algoVersion || (m.kind !== 'calibration' && m.kind !== 'controle')) continue;
    if (!takes.has(m.recordingId)) {
      takes.set(m.recordingId, {
        sessionId: m.sessionId ?? `jour:${m.dateKey}`, kind: m.kind, dateKey: m.dateKey,
        take: { recordingId: m.recordingId, createdAt: m.createdAt ?? 0, ...Object.fromEntries(STORED_METRICS.map((k) => [k, null])) },
      });
    }
    takes.get(m.recordingId).take[m.metric] = m.value;
  }
  const sessions = new Map();
  for (const t of [...takes.values()].sort((a, b) => a.take.createdAt - b.take.createdAt)) {
    if (!sessions.has(t.sessionId)) {
      sessions.set(t.sessionId, { sessionId: t.sessionId, kind: t.kind, dateKey: t.dateKey, createdAt: t.take.createdAt, takes: [] });
    }
    sessions.get(t.sessionId).takes.push(t.take);
  }
  return [...sessions.values()].map((s) => ({ ...s, valid: s.takes.length >= 2 }));
}

/** Médianes d'une séance ; la 1re prise de la toute première séance est écartée s'il en reste 2 (M §2.2). */
function medians(session, isFirst) {
  const takes = isFirst && session.takes.length >= 3 ? session.takes.slice(1) : session.takes;
  return sessionMedians(takes, REPORT_METRICS);
}

/**
 * Le rapport de la voix.
 * - { state: 'calibrage', remaining, metrics: {} } : moins de 3 séances valides ;
 * - { state: 'repere', controls: 0, metrics } : calibration faite, pas encore de contrôle ;
 * - { state: 'suivi', controls, metrics } : avec au moins un contrôle.
 * metrics[m] = { base, sdw, mdc, current, verdict, low80, high80 } (current, verdict, low80, high80 null en
 * 'repere'). Une valeur manquante vaut null, jamais NaN.
 */
export function voiceReport(measures, { algoVersion = ALGO_VERSION } = {}) {
  const sessions = voiceSessions(measures, { algoVersion }).filter((s) => s.valid);
  if (sessions.length < BASELINE_MIN_SESSIONS) {
    return { state: 'calibrage', remaining: BASELINE_MIN_SESSIONS - sessions.length, metrics: {} };
  }
  const series = sessions.map((s, i) => medians(s, i === 0));
  const controls = sessions.length - BASELINE_MIN_SESSIONS;
  const metrics = {};
  for (const m of REPORT_METRICS) {
    const values = series.map((x) => x[m]);
    const calValues = values.slice(0, BASELINE_MIN_SESSIONS);
    const base = baseline(calValues);
    const def = defaultSd(m, base);
    const sdwCal = sdWithin(calValues, def);
    // Le bruit s'estime SANS le point jugé : séances 1 à n − 1, détendancées, dès qu'il y en a 4.
    const prior = values.slice(0, -1);
    let sdw = sdwCal;
    if (controls > 0 && prior.filter(isNum).length >= 4) {
      const detr = sdWithin(prior, def, { detrend: true });
      sdw = [detr, sdwCal].filter(isNum).reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
      if (!isNum(sdw)) sdw = null;
    }
    const current = controls > 0 && isNum(values.at(-1)) ? values.at(-1) : null;
    const ok = isNum(base) && isNum(sdw) && sdw > 0;
    metrics[m] = {
      base: isNum(base) ? base : null,
      sdw: isNum(sdw) ? sdw : null,
      mdc: ok ? mdc95(sdw) : null,
      current,
      verdict: ok && current !== null ? verdictReading(base, current, sdw, CALM_DIRECTION[m]) : null,
      low80: ok && current !== null ? current - Z80 * sdw : null,
      high80: ok && current !== null ? current + Z80 * sdw : null,
    };
  }
  return { state: controls > 0 ? 'suivi' : 'repere', controls, metrics };
}

// ─── Phrases de la carte Diction (D §4, M §4.2 et §4.4) ─────────────────────────────────

/** « 6,1 » : un chiffre après la virgule, à la française. « – » si la valeur manque. */
export function formatDecimal(x, digits = 1) {
  if (!isNum(x)) return '–';
  const f = 10 ** digits;
  // Arrondi au plus proche, demi vers le haut (6,05 → 6,1 ; toFixed seul donnerait 6,0).
  return (Math.round(x * f + 1e-9) / f).toFixed(digits).replace('.', ',');
}
const pct = (x) => `${Math.round(x * 100)} %`;

/** Verdict du débit de lecture, l'indicateur principal (D §4 rang 1). */
export const VERDICT_TEXT = Object.freeze({
  'plus-pose': 'Plus posé qu’au départ, au-delà du bruit.',
  'pas-de-difference': 'Pas de différence mesurable : ta voix varie plus d’un jour à l’autre que l’écart actuel.',
  'plus-rapide': 'Plus rapide qu’au départ.',
});
/** M §4.4 : un « plus rapide » se dit sans couleur, avec une cause fréquente et un rendez-vous. */
export const PLUS_RAPIDE_NOTE = 'Ça arrive : fatigue, journée chargée. On revoit au prochain contrôle.';
const PAUSE_VERDICT = {
  'plus-pose': 'Plus de pauses qu’au départ, au-delà du bruit.',
  'pas-de-difference': 'Pas de différence mesurable sur les pauses.',
  'plus-rapide': 'Moins de pauses qu’au départ.',
};

/**
 * Lecture croisée du débit de lecture et du débit articulatoire (D §4, rang 3) : le débit articulatoire
 * n'est jamais affiché seul. null si l'un des deux verdicts manque.
 */
export function crossPhrase(debit, articulatoire) {
  if (!debit || !articulatoire) return null;
  if (debit === 'plus-pose') {
    if (articulatoire === 'plus-pose') return 'Tu ralentis aussi en articulant.';
    if (articulatoire === 'plus-rapide') return 'Tu fais plus de pauses, et ta bouche va un peu plus vite entre elles.';
    return 'Tu fais plus de pauses, mais ta bouche va toujours aussi vite.';
  }
  if (debit === 'pas-de-difference') {
    if (articulatoire === 'plus-pose') return 'Tu articules plus posément, même si le débit global bouge peu.';
    if (articulatoire === 'plus-rapide') return 'Ta bouche va un peu plus vite, et tes pauses compensent.';
    return 'Débit et articulation restent dans ta variation normale.';
  }
  if (articulatoire === 'plus-rapide') return 'Tu articules plus vite aussi.';
  return 'Ta bouche garde son rythme : l’écart vient surtout de pauses plus courtes.';
}

const untilText = (n, first) => {
  if (!isNum(n) || n < 1) return null;
  const what = first ? 'Premier contrôle' : 'Prochain contrôle';
  return n === 1 ? `${what} à ta prochaine séance.` : `${what} dans ${plural(n, 'séance')}.`;
};

/**
 * Le texte de la carte « Ta voix mesurée » de Progression, au-dessus du taux « Clair ».
 * untilControl : sessionsUntilControl() de voice-plan.js. Jamais de score, de « bredouillement »,
 * d'« intelligible à X % », de rouge ni de flèche (l'écran n'utilise que ces phrases et la bande grise).
 * @returns {{ state, headline: string, verdict: string|null, lines: string[],
 *   bands: { metric, label, unit, base, mdc, current, low80, high80 }[] }}
 */
export function voiceSummary(report, { untilControl = null } = {}) {
  if (!report || report.state === 'calibrage') {
    const n = report?.remaining ?? BASELINE_MIN_SESSIONS;
    return { state: 'calibrage', headline: `On apprend ta voix. Encore ${plural(n, 'mesure')}.`, verdict: null, lines: [], bands: [] };
  }
  const { debit, pausePct, debitArticulatoire } = report.metrics;
  const lines = [];
  if (report.state === 'repere') {
    if (isNum(debit?.base)) {
      lines.push(isNum(debit.mdc)
        ? `Ton débit au départ : environ ${formatDecimal(debit.base)} syll/s (zone de bruit ±${formatDecimal(debit.mdc)}).`
        : `Ton débit au départ : environ ${formatDecimal(debit.base)} syll/s.`);
    }
    if (isNum(pausePct?.base)) lines.push(`Tu t’arrêtes environ ${pct(pausePct.base)} du temps.`);
    if (isNum(debitArticulatoire?.base)) lines.push(`Débit articulatoire, sans les pauses : environ ${formatDecimal(debitArticulatoire.base)} syll/s.`);
    const next = untilText(untilControl, true);
    if (next) lines.push(next);
    return { state: 'repere', headline: 'Ta voix de départ est mesurée.', verdict: null, lines, bands: [] };
  }

  let noteUsed = false;
  const withNote = (text, v) => {
    if (v !== 'plus-rapide' || noteUsed) return text;
    noteUsed = true;
    return `${text} ${PLUS_RAPIDE_NOTE}`;
  };
  const headline = isNum(debit?.current) && isNum(debit?.mdc)
    ? `Ton débit : environ ${formatDecimal(debit.current)} syll/s (zone de bruit ±${formatDecimal(debit.mdc)}). Au départ : ${formatDecimal(debit.base)}.`
    : 'Ta voix est mesurée.';
  const verdict = debit?.verdict ? withNote(VERDICT_TEXT[debit.verdict], debit.verdict) : null;
  if (isNum(pausePct?.current) && isNum(pausePct?.base)) {
    const v = pausePct.verdict;
    const base = `Tu t’arrêtes environ ${pct(pausePct.current)} du temps (au départ : ${pct(pausePct.base)}).`;
    lines.push(v ? withNote(`${base} ${PAUSE_VERDICT[v]}`, v) : base);
  }
  if (isNum(debitArticulatoire?.current) && isNum(debitArticulatoire?.base)) {
    lines.push(`Débit articulatoire, sans les pauses : environ ${formatDecimal(debitArticulatoire.current)} syll/s. Au départ : ${formatDecimal(debitArticulatoire.base)}.`);
    const cross = crossPhrase(debit?.verdict, debitArticulatoire.verdict);
    if (cross) lines.push(cross);
  }
  const next = untilText(untilControl, false);
  if (next) lines.push(next);

  const band = (metric, label, unit) => {
    const m = report.metrics[metric];
    if (![m?.base, m?.mdc, m?.current, m?.low80, m?.high80].every(isNum)) return null;
    return { metric, label, unit, base: m.base, mdc: m.mdc, current: m.current, low80: m.low80, high80: m.high80 };
  };
  const bands = [band('debit', 'Débit de lecture', 'syll/s'), band('pausePct', 'Temps de pause', '%')].filter(Boolean);
  return { state: 'suivi', headline, verdict, lines, bands };
}
