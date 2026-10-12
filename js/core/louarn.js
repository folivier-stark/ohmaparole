// Louarn, le renard qui grandit : stades, répliques, souvenirs, thèmes (spec V2 §1-2, expert-gamification.md = G). PUR.
//
// ── Représentation des conditions (G §2.3) ─────────────────────────────────────────────────────
// Une réplique de content/fr/louarn.json porte au plus UNE `condition`, une chaîne du vocabulaire de G :
//   « contexte » : 'matin' 'soir' 'ecoute' 'posture' 'bloc>=2' 'bloc>=3'  (CONTEXT_CONDITIONS) ;
//   « état »     : tout le reste ('doneToday', 'partielle', 'jalon:7', 'trophee:compris', 'theme:6',
//                  'cycle:2', 'stade:3', 'stade:6+', …), voir isKnownCondition.
// Le contexte d'un tirage est une LISTE ORDONNÉE des conditions vraies à l'instant, avec les mêmes
// chaînes (ex. ['partielle', 'encoreUne', 'soir', 'posture']). contextTags() fabrique la partie
// « contexte », homeBubble() / endBubble() / rdvBubble() fabriquent le tout selon les priorités de G §2.2.
// Règle de tirage (G §2.3) :
//   1. le PREMIER état de la liste qui a des répliques dans ce moment gagne : on tire parmi elles seules ;
//   2. sinon on tire parmi les génériques (sans condition) et les répliques de contexte vraies.
// Le tirage prend la réplique vue le moins récemment (pickLeastRecent), départagée par une graine
// « jour + moment » : même jour, même moment, même historique ⇒ même réplique (G §2.1, règles 4 et 5).
// L'historique `vus` (meta louarn.vus) liste les ids, le plus récent en tête, 200 au plus (rememberLine).
// stablePick() garde la réplique toute la journée tant que l'état ne change pas (meta louarn.jour).
import { pickLeastRecent } from './pick.js';
import { dayKey as dayKeyOf, diffDays } from './dates.js';
import { voiceChecks, voiceEchoes } from './voice-plan.js';

const freeze = (list) => Object.freeze(list.map((x) => Object.freeze(x)));

/** Les 6 stades (G §1.3). seuil : séances comptées (dailyCount) à partir desquelles le stade est atteint. */
export const STAGES = freeze([
  { id: 1, nom: 'Renardeau', seuil: 0 },
  { id: 2, nom: 'Jeune renard', seuil: 12 },
  { id: 3, nom: 'Renard d’aplomb', seuil: 24 },
  { id: 4, nom: 'Renard assuré', seuil: 36 },
  { id: 5, nom: 'Renard posé', seuil: 48 },
  { id: 6, nom: 'Renard charismatique', seuil: 72 },
]);

/** Les 3 blocs du programme (G §4.2), 6 thèmes chacun. */
export const BLOCS = freeze([
  { id: 1, nom: 'Fondations' },
  { id: 2, nom: 'Charisme et confiance' },
  { id: 3, nom: 'Situations de RDV' },
]);

export const SESSIONS_PER_THEME = 4;
export const THEMES_PER_BLOC = 6;
export const THEMES_PER_CYCLE = 18;

/** Les 11 souvenirs (G §4.3), dans l'ordre de G. ligne : la réplique qui les fête, ou leur légende. */
export const SOUVENIRS = freeze([
  { id: 'premier-pas', nom: 'Le premier pas', ligne: 'tro-01' },
  { id: 'voix-depart', nom: 'La voix de départ', ligne: 'tro-02' },
  { id: 'premier-echo', nom: 'Le premier écho', ligne: 'tro-03' },
  { id: 'grand-echo', nom: 'Le grand écho', ligne: 'tro-04' },
  { id: 'premier-rdv', nom: 'Le premier rendez-vous', ligne: 'tro-05' },
  { id: 'compris', nom: 'Compris du premier coup', ligne: 'tro-06' },
  { id: 'objectif-tenu', nom: 'Objectif tenu', ligne: 'tro-07' },
  { id: 'chemin-repris', nom: 'Le chemin repris', ligne: 'tro-08' },
  { id: 'fondations', nom: 'Les fondations', ligne: 'tro-09' },
  { id: 'confiance', nom: 'La confiance', ligne: 'tro-10' },
  { id: 'sentier', nom: 'Le sentier entier', ligne: 'tro-11' },
]);

export const MOMENTS = Object.freeze(['accueil', 'fin', 'jalon', 'theme', 'retour', 'rdv', 'tip', 'stade']);
export const CONTEXT_CONDITIONS = Object.freeze(['matin', 'soir', 'ecoute', 'posture', 'bloc>=2', 'bloc>=3']);
/**
 * Conditions de profil (spec profils) : 'profil:etudes' et 'profil:quotidien' sont du contexte (vraies pour
 * ce profil). Une réplique de thème propre à un profil porte une condition COMPOSÉE, 'profil:etudes&theme:7' :
 * elle passe avant 'theme:7' (themeContext), et n'est jamais tirée pour un autre profil.
 */
export const PROFIL_CONDITIONS = Object.freeze(['profil:etudes', 'profil:quotidien']);
/** Objectif du programme pro (18 thèmes de 4 séances) : les seuils de STAGES sont posés sur lui. */
export const GOAL_PRO = 72;
const STATE_CONDITIONS = ['doneToday', 'yesterdayOff', 'premiereSeance', 'partielle', 'encoreUne', 'objectif', 'sansObjectif',
  'jalon:due', 'jalon:1', 'jalon:7', 'jalon:14', 'jalon:30', 'jalon:60+', 'theme:langues', 'cycle:2', 'stade:6+'];

/** Expression fixe par moment (G §1.5) : jamais de tirage. */
const HUMEURS = { fin: 'content', jalon: 'content', theme: 'content', stade: 'content', retour: 'content', tip: 'clin' };

const isDailyCounted = (s) => s.counted === true && (s.type === 'daily' || s.type === 'comeback');
/** Un cumul est un entier ≥ 0 : tout le reste vaut 0. */
const norm = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Math.floor(Number(n)) : 0);

// ── Stades ──────────────────────────────────────────────────────────────────────────────────────

const STAGES_BY_GOAL = new Map([[GOAL_PRO, STAGES]]);

/**
 * Les 6 stades répartis sur l'objectif du profil (spec profils §2), proportionnellement aux seuils pro :
 * 72 séances → 0, 12, 24, 36, 48, 72 (STAGES, inchangés) ; 48 séances → 0, 8, 16, 24, 32, 48.
 */
export function stagesFor(goal = GOAL_PRO) {
  const g = norm(goal) || GOAL_PRO;
  if (!STAGES_BY_GOAL.has(g)) {
    STAGES_BY_GOAL.set(g, freeze(STAGES.map((s) => ({ ...s, seuil: Math.round((s.seuil * g) / GOAL_PRO) }))));
  }
  return STAGES_BY_GOAL.get(g);
}

/** Le stade pour un cumul de séances. Fonction croissante d'un cumul qui ne baisse jamais : pas de régression. */
export function stageFor(dailyCount, goal = GOAL_PRO) {
  const n = norm(dailyCount);
  return stagesFor(goal).filter((s) => s.seuil <= n).at(-1);
}

/** Le stade suivant et les séances qui manquent, ou null au stade 6 (pour toujours). */
export function nextStage(dailyCount, goal = GOAL_PRO) {
  const n = norm(dailyCount);
  const next = stagesFor(goal).find((s) => s.seuil > n);
  return next ? { stage: next, remaining: next.seuil - n } : null;
}

/** Le stade atteint en passant de prevCount à newCount (le plus haut en cas de saut), sinon null. */
export function stageUp(prevCount, newCount, goal = GOAL_PRO) {
  const a = norm(prevCount);
  const b = norm(newCount);
  if (b <= a) return null;
  return stagesFor(goal).filter((s) => s.seuil > a && s.seuil <= b).at(-1) ?? null;
}

// ── Thèmes et blocs ─────────────────────────────────────────────────────────────────────────────

/**
 * Position de la PROCHAINE séance dans le sentier (alignée sur planner.programPosition).
 * theme : 1 à `weeks` dans le cycle ; step : 1 à sessionsPerWeek ; doneInTheme : séances déjà faites du thème ;
 * themesDone : thèmes finis dans le cycle ; complete : un cycle vient de se terminer (72, 144…).
 */
export function themePosition(dailyCount, sessionsPerWeek = SESSIONS_PER_THEME, weeks = THEMES_PER_CYCLE) {
  const n = norm(dailyCount);
  const perCycle = sessionsPerWeek * weeks;
  const inCycle = n % perCycle;
  const theme = Math.floor(inCycle / sessionsPerWeek) + 1;
  return {
    cycle: Math.floor(n / perCycle) + 1,
    theme,
    step: (inCycle % sessionsPerWeek) + 1,
    doneInTheme: inCycle % sessionsPerWeek,
    themesDone: Math.floor(inCycle / sessionsPerWeek),
    bloc: Math.floor((theme - 1) / THEMES_PER_BLOC) + 1,
    complete: n > 0 && inCycle === 0,
  };
}

/** Bloc du programme de la prochaine séance (G §2.3 : floor(n / 24) + 1, ramené au cycle en cours). */
export function programBloc(dailyCount, sessionsPerWeek = SESSIONS_PER_THEME, weeks = THEMES_PER_CYCLE) {
  return themePosition(dailyCount, sessionsPerWeek, weeks).bloc;
}

/** Numéro (continu, 19 = thème 1 du cycle 2) du thème terminé entre prevCount et newCount, sinon null. */
export function themeCompleted(prevCount, newCount, sessionsPerWeek = SESSIONS_PER_THEME) {
  const a = norm(prevCount);
  const b = norm(newCount);
  if (b <= a) return null;
  const t = Math.floor(b / sessionsPerWeek);
  return t >= 1 && t * sessionsPerWeek > a ? t : null;
}

/** Numéro (continu) du bloc terminé entre prevCount et newCount (toutes les 24 séances), sinon null. */
export function blockCompleted(prevCount, newCount, sessionsPerWeek = SESSIONS_PER_THEME, themesPerBloc = THEMES_PER_BLOC) {
  return themeCompleted(prevCount, newCount, sessionsPerWeek * themesPerBloc);
}

/** Condition du moment `theme` (G §2.3) : 'theme:2' à 'theme:18', 'theme:langues' à 72, 'cycle:2' à 73, sinon null. */
export function themeTag(prevCount, newCount, sessionsPerWeek = SESSIONS_PER_THEME, weeks = THEMES_PER_CYCLE) {
  const perCycle = sessionsPerWeek * weeks;
  const t = themeCompleted(prevCount, newCount, sessionsPerWeek);
  if (t != null && t * sessionsPerWeek < perCycle) return `theme:${t + 1}`;
  if (t != null && t * sessionsPerWeek === perCycle) return 'theme:langues';
  return norm(prevCount) <= perCycle && norm(newCount) > perCycle ? 'cycle:2' : null;
}

// ── Conditions et tirage ────────────────────────────────────────────────────────────────────────

export const isContextCondition = (c) => CONTEXT_CONDITIONS.includes(c) || PROFIL_CONDITIONS.includes(c);

/** La condition fait-elle partie du vocabulaire de G §2.3 (plus les conditions de profil, composées par « & ») ? */
export function isKnownCondition(c) {
  if (typeof c !== 'string') return false;
  if (c.includes('&')) {
    const parts = c.split('&');
    return parts.length === 2 && PROFIL_CONDITIONS.includes(parts[0]) && !parts[1].startsWith('profil:') && isKnownCondition(parts[1]);
  }
  if (isContextCondition(c) || STATE_CONDITIONS.includes(c)) return true;
  const [kind, value] = c.split(':');
  if (kind === 'theme') return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= THEMES_PER_CYCLE;
  if (kind === 'stade') return STAGES.some((s) => String(s.id) === value);
  if (kind === 'trophee') return SOUVENIRS.some((s) => s.id === value);
  return false;
}

/** Conditions de contexte vraies : heure locale (avant 12 h, à partir de 18 h), bloc 3, bloc de la prochaine séance. */
export function contextTags({ hour, bloc3, dailyCount = 0, sessionsPerWeek = SESSIONS_PER_THEME, weeks = THEMES_PER_CYCLE, profil = null } = {}) {
  const tags = [];
  if (Number.isFinite(hour)) {
    if (hour < 12) tags.push('matin');
    else if (hour >= 18) tags.push('soir');
  }
  if (bloc3 === 'ecoute' || bloc3 === 'posture') tags.push(bloc3);
  const bloc = programBloc(dailyCount, sessionsPerWeek, weeks);
  if (bloc >= 2) tags.push('bloc>=2');
  if (bloc >= 3) tags.push('bloc>=3');
  if (PROFIL_CONDITIONS.includes(`profil:${profil}`)) tags.push(`profil:${profil}`);
  return tags;
}

/**
 * Contexte du moment `theme` : pour un profil non pro, la réplique de thème du profil passe d'abord
 * ('profil:etudes&theme:7'), puis celle de tous les profils ('theme:7').
 */
export function themeContext(tag, profil = null) {
  if (!tag) return [];
  return PROFIL_CONDITIONS.includes(`profil:${profil}`) ? [`profil:${profil}&${tag}`, tag] : [tag];
}

/** Les répliques entre lesquelles on tire (règle de tirage en tête de fichier). */
export function eligibleLines(lines, { moment, context = [] } = {}) {
  const tags = [...(context ?? [])];
  const ofMoment = (lines ?? []).filter((l) => l.moment === moment);
  for (const tag of tags) {
    if (isContextCondition(tag)) continue;
    const pool = ofMoment.filter((l) => l.condition === tag);
    if (pool.length) return pool;
  }
  const active = new Set(tags);
  return ofMoment.filter((l) => !l.condition || (isContextCondition(l.condition) && active.has(l.condition)));
}

/** La réplique du moment, ou null si rien n'est éligible. Déterministe pour un jour, un moment et un historique. */
export function pickLine(lines, { moment, context = [], dayKey = '', recentIds = [] } = {}) {
  const pool = eligibleLines(lines, { moment, context });
  return pool.length ? pickLeastRecent(pool, recentIds ?? [], `${dayKey}:${moment}`) : null;
}

/** Historique après affichage de `id` : le plus récent en tête, sans doublon, `max` au plus. */
export function rememberLine(recentIds, id, max = 200) {
  return [id, ...(recentIds ?? []).filter((x) => x !== id)].slice(0, max);
}

/** Clé d'un affichage : la réplique ne change pas tant que la clé ne change pas. scope : ex. l'id de la séance. */
export function lineKey({ moment = '', context = [], dayKey = '', scope = '' } = {}) {
  return `${dayKey}|${scope}|${moment}|${[...(context ?? [])].join(',')}`;
}

/**
 * Tirage stable : rejoue memo ({ key, id }) si la clé n'a pas changé, sinon tire et l'ajoute à vus.
 * changed : memo et vus sont à enregistrer (meta louarn.jour et louarn.vus).
 */
export function stablePick(lines, opts = {}, { memo = null, vus = [] } = {}) {
  const key = lineKey(opts);
  if (memo?.key === key) {
    const kept = (lines ?? []).find((l) => l.id === memo.id);
    if (kept) return { line: kept, memo, vus, changed: false };
  }
  const line = pickLine(lines, { ...opts, recentIds: vus });
  if (!line) return { line: null, memo, vus, changed: false };
  return { line, memo: { key, id: line.id }, vus: rememberLine(vus, line.id), changed: true };
}

/** 'neutre', 'content' ou 'clin' selon le moment (G §1.5). */
export const humeurFor = (moment) => HUMEURS[moment] ?? 'neutre';

/** Les phrases de motivation (extras.json) en répliques d'accueil génériques, à mêler à la rotation (G §2.2). */
export function motivationLines(motivations) {
  return (motivations ?? []).map((texte, i) => ({ id: `mot-${String(i + 1).padStart(2, '0')}`, moment: 'accueil', texte }));
}

// ── Quelle bulle, où (G §2.2) ───────────────────────────────────────────────────────────────────
// Chaque fonction renvoie { moment, context } à passer à pickLine / stablePick, ou null : le renard se tait.

/**
 * Accueil. Ordre : carte affichée (silence) → mode discret (silence) → stade 6+ → retour → mesure de voix due
 * → première séance → fait aujourd'hui → pause hier → rotation sur 3 jours (seed comme homeLine) :
 * 0 le pourquoi (moment 'pourquoi', texte « Ton pourquoi : … » hors répliques), 1 un conseil, 2 une réplique.
 * voiceDue : voiceCheckDue() de voice-plan.js. Le bloc voix a remplacé les jalons V1 : 'jalon:due' (jal-01,
 * jal-02) annonce une calibration ou un contrôle.
 */
export function homeBubble({
  cardShown = false, discret = false, status = {}, voiceDue = null, dailyCount = 0,
  why = '', seed = 0, hour, bloc3 = null, stade6Plus = false, weeks = THEMES_PER_CYCLE, profil = null,
} = {}) {
  if (cardShown || discret) return null;
  if (stade6Plus) return { moment: 'stade', context: ['stade:6+'] };
  if (status.comeback) return { moment: 'retour', context: [] };
  // Toute première séance : « on réenregistre le texte du début » serait faux ; c'est l'accueil de la première séance.
  if (voiceDue && norm(dailyCount) > 0) return { moment: 'jalon', context: ['jalon:due'] };
  const ctx = contextTags({ hour, bloc3, dailyCount, weeks, profil });
  if (norm(dailyCount) === 0) return { moment: 'accueil', context: ['premiereSeance', ...ctx] };
  if (status.doneToday) return { moment: 'accueil', context: ['doneToday', ...ctx] };
  if (status.yesterdayOff) return { moment: 'accueil', context: ['yesterdayOff', ...ctx] };
  const r = ((Math.trunc(seed) % 3) + 3) % 3;
  if (r === 0 && String(why ?? '').trim()) return { moment: 'pourquoi', context: [] };
  if (r === 1) return { moment: 'tip', context: [] };
  return { moment: 'accueil', context: ctx };
}

/**
 * Fin d'une séance comptée. Une seule bulle : stade → souvenir → thème → bloc voix (jalon) → fin.
 * newSouvenirs : souvenirs à fêter (souvenirsToCelebrate().celebrate), objets ou ids.
 * jalon : voiceJalonTag() de voice-plan.js ('jalon:1', 'jalon:7', 'jalon:14', 'jalon:30', 'jalon:60+' ou null),
 * la condition des répliques jal-* depuis que le bloc voix a remplacé les jalons V1.
 * Mode discret : seulement stade, souvenir et thème (le message de fin redevient du texte simple).
 */
export function endBubble({
  prevCount, newCount, session = {}, newSouvenirs = [], encoreUne = false, hour, discret = false,
  sessionsPerWeek = SESSIONS_PER_THEME, jalon = null, weeks = THEMES_PER_CYCLE, profil = null,
} = {}) {
  const stage = stageUp(prevCount, newCount, sessionsPerWeek * weeks);
  if (stage) return { moment: 'stade', context: [`stade:${stage.id}`] };
  if (newSouvenirs?.length) return { moment: 'jalon', context: newSouvenirs.map((s) => `trophee:${typeof s === 'string' ? s : s.id}`) };
  const theme = themeTag(prevCount, newCount, sessionsPerWeek, weeks);
  if (theme) return { moment: 'theme', context: themeContext(theme, profil) };
  if (discret) return null;
  if (jalon) return { moment: 'jalon', context: [jalon] };
  return {
    moment: 'fin',
    context: [
      ...(session.completed ? [] : ['partielle']),
      ...(encoreUne ? ['encoreUne'] : []),
      ...contextTags({ hour, bloc3: session.bloc3, dailyCount: newCount, sessionsPerWeek, weeks, profil }),
    ],
  };
}

/** Dernier écran « Avant un RDV », à la place de « Tu y vas. ». */
export function rdvBubble({ goal = '', discret = false } = {}) {
  if (discret) return null;
  return { moment: 'rdv', context: [String(goal ?? '').trim() ? 'objectif' : 'sansObjectif'] };
}

/**
 * Tout ce que fête l'écran de fin d'une séance comptée (G §2.2, §4.4, maquettes §5.3 et §5.4).
 * souvenirs : louarn.souvenirs() (obtenus) ; fetes : meta louarn.fetes (ids et 'stade:n' déjà fêtés).
 * Renvoie :
 *   stage      { from, to } (ids) : montée de stade à fêter, jamais un stade déjà fêté ; sinon null ;
 *   next       nextStage(newCount) quand stage (ligne « Prochain : … »), sinon null ;
 *   bubble     { moment, context } de la bulle (endBubble). Stade déjà fêté : la priorité 1 saute, on passe
 *              au souvenir, puis au thème, puis au bloc voix (jalon) et à la fin ;
 *   secondary  arbitrage du contrôleur : aux fins de bloc (24, 48, 72), la réplique du nouveau bloc
 *              ou des langues (th-07, th-13, th-19) s'affiche sous la bulle de stade, sans être perdue ;
 *   theme      thème terminé (themeCompleted), sinon null ;
 *   miniSentier le mini-sentier de fin de thème, sauf à une montée de stade, qui se fête seule (§5.4) ;
 *   celebrate  souvenirs à fêter en pastille ; fetes : la liste à enregistrer (souvenirs, puis 'stade:n').
 */
export function endCelebration({
  prevCount, newCount, session = {}, souvenirs: list = [], fetes = [], todayKey, encoreUne = false, hour,
  discret = false, sessionsPerWeek = SESSIONS_PER_THEME, jalon = null, weeks = THEMES_PER_CYCLE, profil = null,
} = {}) {
  const done = fetes ?? [];
  const goal = sessionsPerWeek * weeks;
  const up = stageUp(prevCount, newCount, goal);
  const stage = up && !done.includes(`stade:${up.id}`) ? up : null;
  const kept = souvenirsToCelebrate(list ?? [], done, todayKey);
  const rest = { session: session ?? {}, newSouvenirs: kept.celebrate, encoreUne, hour, discret, sessionsPerWeek, jalon, weeks, profil };
  const tag = themeTag(prevCount, newCount, sessionsPerWeek, weeks);
  let bubble;
  if (!up || stage) bubble = endBubble({ prevCount, newCount, ...rest });
  else if (!kept.celebrate.length && tag) bubble = { moment: 'theme', context: themeContext(tag, profil) };
  else bubble = endBubble({ prevCount: newCount, newCount, ...rest }); // sans stade ni thème : souvenir, jalon ou fin
  const blockEnd = blockCompleted(prevCount, newCount, sessionsPerWeek) != null;
  const theme = themeCompleted(prevCount, newCount, sessionsPerWeek);
  return {
    stage: stage ? { from: stageFor(prevCount, goal).id, to: stage.id } : null,
    next: stage ? nextStage(newCount, goal) : null,
    bubble,
    secondary: bubble?.moment === 'stade' && blockEnd && tag ? { moment: 'theme', context: themeContext(tag, profil) } : null,
    theme,
    miniSentier: theme != null && !stage,
    celebrate: kept.celebrate,
    fetes: stage ? [...kept.fetes, `stade:${stage.id}`] : kept.fetes,
  };
}

/** Condition 'stade:6+' de l'accueil (G §2.3) : à partir de l'objectif (72 séances), le seul jour de la première ouverture. */
export function stade6PlusToday({ dailyCount = 0, shownOn = null, todayKey, goal = GOAL_PRO } = {}) {
  return norm(dailyCount) >= stagesFor(goal).at(-1).seuil && (shownOn == null || shownOn === todayKey);
}

/** Cumul avant et après une séance, et « encore une » (2e séance comptée du jour) pour l'écran de fin. */
export function sessionCounts(sessions, session) {
  const before = (sessions ?? []).filter((s) => isDailyCounted(s) && s.id !== session.id && s.startedAt < session.startedAt);
  const own = isDailyCounted(session) ? 1 : 0;
  return {
    prevCount: before.length,
    newCount: before.length + own,
    encoreUne: own === 1 && before.some((s) => s.dateKey === session.dateKey),
  };
}

// ── Souvenirs (G §4.3) ──────────────────────────────────────────────────────────────────────────

const atOf = (x) => x.startedAt ?? x.createdAt ?? 0;
/** Séances d'un bloc (6 thèmes de 4) : « Les fondations » à 24, « La confiance » à 48. */
const BLOC_SESSIONS = SESSIONS_PER_THEME * THEMES_PER_BLOC;
/** Profils non pro : le souvenir du premier « moment important » ne parle pas de rendez-vous. */
const NOMS_NEUTRES = { 'premier-rdv': 'Le premier moment important' };
/** La plus ancienne des sources qui existent, ou undefined. */
const earliest = (...xs) => xs.filter(Boolean).sort((a, b) => atOf(a) - atOf(b))[0];

/**
 * Souvenirs obtenus, recalculés depuis les séances et les enregistrements (rien n'est stocké).
 * Date : celle de la première séance (ou du premier enregistrement) qui remplit la condition.
 * Voix (phase 3, voice-plan.js) : « La voix de départ » à la référence J1 ou à la 1re séance de calibration
 * valide ; « Le premier écho » au premier contrôle de voix valide ; « Le grand écho » au premier contrôle
 * valide fait à 30 séances comptées ou plus. Les références J7 et J30 de la V1 les ont déjà donnés : la plus
 * ancienne date gagne, un souvenir obtenu ne se perd jamais.
 * Renvoie [{ id, nom, ligne, dateKey, at }], triés par date d'obtention.
 */
export function souvenirs(sessions = [], recordings = [], { goal = GOAL_PRO, profil = null } = {}) {
  const byStart = [...(sessions ?? [])].sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
  const daily = byStart.filter(isDailyCounted);
  const prerdv = byStart.filter((s) => s.type === 'prerdv');
  const refs = [...(recordings ?? [])].filter((r) => r.kind === 'reference').sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const ref = (m) => refs.find((r) => r.milestone === m && !r.voiceCheck);
  const echoes = voiceEchoes(refs);
  const firstCalibration = voiceChecks(refs).find((c) => c.valid && c.kind === 'calibration');
  const found = {
    'premier-pas': daily[0],
    'voix-depart': earliest(ref(1), firstCalibration),
    'premier-echo': earliest(ref(7), echoes.premier),
    'grand-echo': earliest(ref(30), echoes.grand),
    'premier-rdv': prerdv.find((s) => (s.practicedSec ?? 0) >= 30),
    compris: prerdv.find((s) => s.feedback === 'non'),
    'objectif-tenu': prerdv.find((s) => s.goalReached === 'oui'),
    'chemin-repris': byStart.find((s) => s.type === 'comeback' && s.counted === true),
    fondations: daily[BLOC_SESSIONS - 1],
    confiance: daily[2 * BLOC_SESSIONS - 1],
    sentier: daily[(norm(goal) || GOAL_PRO) - 1],
  };
  const neutral = PROFIL_CONDITIONS.includes(`profil:${profil}`);
  return SOUVENIRS.filter((s) => found[s.id])
    .map((s) => {
      const src = found[s.id];
      const at = src.startedAt ?? src.createdAt ?? 0;
      return { ...s, ...(neutral && NOMS_NEUTRES[s.id] ? { nom: NOMS_NEUTRES[s.id] } : {}), dateKey: src.dateKey ?? dayKeyOf(at), at };
    })
    .sort((a, b) => a.at - b.at);
}

/**
 * Parmi les souvenirs obtenus, ceux à fêter maintenant. fetes : meta louarn.fetes (ids et 'stade:n' déjà fêtés).
 * Un souvenir de plus de maxAgeDays jours (restauration de sauvegarde) rejoint la liste sans bulle (silent).
 * Renvoie aussi la nouvelle liste fetes à enregistrer.
 */
export function souvenirsToCelebrate(list, fetes = [], todayKey, maxAgeDays = 3) {
  const fresh = (list ?? []).filter((s) => !fetes.includes(s.id));
  const recent = (s) => diffDays(s.dateKey, todayKey) <= maxAgeDays;
  return {
    celebrate: fresh.filter(recent),
    silent: fresh.filter((s) => !recent(s)),
    fetes: [...fetes, ...fresh.map((s) => s.id)],
  };
}
