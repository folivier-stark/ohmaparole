# OhMaParole : tableau de bord, axes de progrès et objectif 60 (plan d'implémentation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**But :** ajouter à l'écran Progression :
- un objectif de 60 séances, avec sa courbe de cumul ;
- un suivi des progrès par axe (diction, écoute, posture, RDV) ;
- la liste des objectifs de RDV.

Deux nouvelles questions en 1 tap alimentent ces données : posture, et objectif de RDV atteint.

**Architecture :**
- Les calculs purs sont dans `js/core/dashboard.js`, testés avec `node --test`.
- Les graphiques sont en SVG maison, dans `js/ui/components/chart.js`.
- Le reste se limite à de petites modifications de `session.js`, `home.js` et `progress.js` (écran).

**Stack :** JS ESM natif, sans dépendance, Node 24 pour les tests.

**Spec :** `docs/superpowers/specs/2026-10-09-ohmaparole-tableau-design.md`, qui fait foi.

**Conventions :**
- Racine : `C:\Users\Fred_OLIVIER\Documents\Perso\apprentissage`, en Git Bash, sur la branche `tableau`, à créer depuis `main`.
- Chaque commit : `git commit -m "<titre>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- Aucune dépendance npm.
- Lire chaque fichier avant de le modifier.

---

### Task 1 : Calculs du tableau de bord (cœur pur)

**Fichiers :**
- Modifier : `js/core/dates.js` (ajouter `longDateFr`), `js/core/progress.js` (ajouter `pendingGoalCheck`)
- Créer : `js/core/dashboard.js`
- Tests : `tests/dashboard.test.mjs` (nouveau), `tests/dates.test.mjs`, `tests/progress.test.mjs` (ajouts)

- [ ] **Step 1 : écrire les tests qui doivent échouer**

`tests/dashboard.test.mjs` :

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../js/core/dates.js';
import {
  GOAL_SESSIONS, cumulativeSeries, goalProgress, weeklyRate, axisSummary, recentGoals,
} from '../js/core/dashboard.js';

const S = (o) => ({ type: 'daily', counted: true, startedAt: 0, ratings: {}, ...o });
const nDays = (n, from) => Array.from({ length: n }, (_, i) => S({ dateKey: addDays(from, i), startedAt: i }));

test('objectif par défaut : 60 séances', () => {
  assert.equal(GOAL_SESSIONS, 60);
});

test('cumulativeSeries : un point par jour, ne redescend jamais, ignore RDV et non comptées', () => {
  const s = cumulativeSeries([
    S({ dateKey: '2026-10-01' }), S({ dateKey: '2026-10-01' }), S({ dateKey: '2026-10-03', type: 'comeback' }),
    S({ dateKey: '2026-10-02', counted: false }), S({ dateKey: '2026-10-02', type: 'prerdv' }),
  ], '2026-10-04');
  assert.deepEqual(s.map((p) => p.total), [2, 2, 3, 3]);
  assert.equal(s[0].dateKey, '2026-10-01');
  assert.equal(s.at(-1).day, 3);
  assert.deepEqual(cumulativeSeries([], '2026-10-04'), []);
});

test('goalProgress : avancement et date estimée au rythme récent', () => {
  const g = goalProgress(nDays(14, '2026-10-01'), '2026-10-14');
  assert.equal(g.done, 14);
  assert.equal(g.left, 46);
  assert.equal(g.pct, 23);
  assert.equal(g.reached, false);
  assert.equal(g.etaKey, '2026-11-29');
});

test("goalProgress : pas de date avant 7 jours d'historique, ni sans séance dans les 28 derniers jours", () => {
  assert.equal(goalProgress([S({ dateKey: '2026-10-10' })], '2026-10-12').etaKey, null);
  assert.equal(goalProgress([S({ dateKey: '2026-01-01' })], '2026-10-12').etaKey, null);
  const empty = goalProgress([], '2026-10-12');
  assert.equal(empty.done, 0);
  assert.equal(empty.etaKey, null);
});

test('goalProgress : objectif atteint', () => {
  const g = goalProgress(nDays(61, '2026-08-01'), '2026-10-12');
  assert.equal(g.reached, true);
  assert.equal(g.left, 0);
  assert.equal(g.pct, 100);
  assert.equal(g.etaKey, null);
});

test('weeklyRate : par semaine (lundi), chaque axe lit ses propres valeurs', () => {
  const ss = [
    S({ dateKey: '2026-10-05', ratings: { a: 'clair', l: 'oui', p: 'pose' } }),
    S({ dateKey: '2026-10-07', ratings: { b: 'brouillon', l2: 'non' } }),
    S({ dateKey: '2026-10-12', ratings: { c: 'clair', p2: 'unpeu' } }),
    S({ dateKey: '2026-10-13', ratings: {} }),
    S({ dateKey: '2026-10-08', type: 'prerdv', feedback: 'non', goalReached: 'partie' }),
  ];
  assert.deepEqual(weeklyRate(ss, 'diction').map((w) => [w.weekKey, w.n, w.pct]), [['2026-10-05', 2, 50], ['2026-10-12', 1, 100]]);
  assert.deepEqual(weeklyRate(ss, 'ecoute').map((w) => [w.n, w.pct]), [[2, 50]]);
  assert.deepEqual(weeklyRate(ss, 'posture').map((w) => [w.weekKey, w.pct]), [['2026-10-05', 100], ['2026-10-12', 0]]);
  assert.deepEqual(weeklyRate(ss, 'rdv').map((w) => [w.n, w.pct]), [[1, 100]]);
  assert.deepEqual(weeklyRate(ss, 'objectif').map((w) => [w.n, w.pct]), [[1, 0]]);
});

test('weeklyRate : garde les 8 dernières semaines', () => {
  const ss = Array.from({ length: 10 }, (_, i) => S({ dateKey: addDays('2026-08-03', i * 7), ratings: { a: 'clair' } }));
  const w = weeklyRate(ss, 'diction');
  assert.equal(w.length, 8);
  assert.equal(w[0].weekKey, '2026-08-17');
});

test('axisSummary : taux sur 28 jours et « en hausse » seulement si +10 points avec assez de réponses', () => {
  const before = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-09-01', i), ratings: { a: i === 0 ? 'clair' : 'moyen' } }));
  const recent = [0, 1, 2, 3].map((i) => S({ dateKey: addDays('2026-10-01', i), ratings: { a: i < 3 ? 'clair' : 'moyen' } }));
  const sum = axisSummary([...before, ...recent], 'diction', '2026-10-10');
  assert.equal(sum.n, 4);
  assert.equal(sum.pct, 75);
  assert.equal(sum.rising, true);
  assert.equal(axisSummary(recent, 'diction', '2026-10-10').rising, false);
  assert.deepEqual(axisSummary([], 'diction', '2026-10-10'), { n: 0, pct: null, rising: false });
});

test('recentGoals : objectifs RDV saisis, du plus récent au plus ancien', () => {
  const ss = [
    S({ type: 'prerdv', dateKey: '2026-10-01', startedAt: 1, goal: 'Budget', goalReached: 'oui' }),
    S({ type: 'prerdv', dateKey: '2026-10-02', startedAt: 2, goal: '  ' }),
    S({ type: 'prerdv', dateKey: '2026-10-03', startedAt: 3, goal: 'Décideur' }),
  ];
  assert.deepEqual(recentGoals(ss, 5), [
    { dateKey: '2026-10-03', goal: 'Décideur', result: null },
    { dateKey: '2026-10-01', goal: 'Budget', result: 'oui' },
  ]);
});
```

À la fin de `tests/dates.test.mjs`, ajouter le test suivant, et ajouter `longDateFr` à l'import existant de `../js/core/dates.js` :

```js
test('longDateFr', () => {
  assert.equal(longDateFr('2026-11-29'), '29 novembre 2026');
  assert.equal(longDateFr('2027-01-01'), '1 janvier 2027');
});
```

À la fin de `tests/progress.test.mjs`, ajouter le test suivant, et ajouter `pendingGoalCheck` à l'import existant de `../js/core/progress.js` :

```js
test("pendingGoalCheck : après la réponse « répéter », si un objectif a été saisi", () => {
  const H = 3600000;
  const base = { id: 'r', type: 'prerdv', counted: true, startedAt: 0, endedAt: 0, dateKey: '2026-10-09', practicedSec: 90, goal: 'Budget', goalReached: null };
  assert.equal(pendingGoalCheck([{ ...base, feedback: null }], 2 * H), null);
  assert.equal(pendingGoalCheck([{ ...base, feedback: 'non' }], 2 * H).id, 'r');
  assert.equal(pendingGoalCheck([{ ...base, feedback: 'non', goalReached: 'oui' }], 2 * H), null);
  assert.equal(pendingGoalCheck([{ ...base, feedback: 'non', goalSkipped: true }], 2 * H), null);
  assert.equal(pendingGoalCheck([{ ...base, feedback: 'non', goal: ' ' }], 2 * H), null);
  assert.equal(pendingGoalCheck([{ ...base, feedback: 'non' }], 4 * 24 * H), null);
});
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Lancer `npm test`.
Attendu : FAIL. Les modules ou exports `dashboard.js`, `longDateFr` et `pendingGoalCheck` sont introuvables.

- [ ] **Step 3 : implémenter**

Ajouter à la fin de `js/core/dates.js` :

```js
/** « 29 novembre 2026 » */
export function longDateFr(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}
```

Ajouter à la fin de `js/core/progress.js` (`DAY` y est déjà défini) :

```js
/** 2e question du retour terrain : l'objectif saisi avant le RDV a-t-il été atteint ? */
export function pendingGoalCheck(sessions, now) {
  return sessions
    .filter((s) => s.type === 'prerdv' && (s.goal ?? '').trim() && s.feedback != null
      && s.goalReached == null && !s.goalSkipped && now - s.endedAt <= 3 * DAY)
    .sort((a, b) => b.endedAt - a.endedAt)[0] ?? null;
}
```

Créer `js/core/dashboard.js` :

```js
import { addDays, diffDays, weekdayMon0 } from './dates.js';

export const GOAL_SESSIONS = 60;

/**
 * Axes de progrès. source : où lire la réponse dans une séance.
 * values : réponses possibles (jeux distincts pour les axes lus dans `ratings`).
 * positive : réponses qui comptent comme une réussite.
 */
export const AXES = {
  diction: { source: 'ratings', values: ['clair', 'moyen', 'brouillon'], positive: ['clair'] },
  ecoute: { source: 'ratings', values: ['oui', 'non'], positive: ['oui'] },
  posture: { source: 'ratings', values: ['pose', 'unpeu', 'pasencore'], positive: ['pose'] },
  rdv: { source: 'feedback', values: ['non', 'une', 'plusieurs'], positive: ['non'] },
  objectif: { source: 'goalReached', values: ['oui', 'partie', 'non'], positive: ['oui'] },
};

const isDailyCounted = (s) => s.counted === true && (s.type === 'daily' || s.type === 'comeback');
const weekOf = (key) => addDays(key, -weekdayMon0(key));
const rate = (positive, n) => (n ? Math.round((100 * positive) / n) : null);

function answers(session, axis) {
  const { source, values } = AXES[axis];
  const raw = source === 'ratings' ? Object.values(session.ratings ?? {}) : [session[source]];
  return raw.filter((v) => values.includes(v));
}

/** Cumul des séances comptées (quotidiennes et reprises), un point par jour du premier jour à aujourd'hui. */
export function cumulativeSeries(sessions, todayKey) {
  const days = sessions.filter(isDailyCounted).map((s) => s.dateKey).sort();
  if (!days.length) return [];
  const perDay = new Map();
  for (const d of days) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  const out = [];
  let total = 0;
  for (let k = days[0], i = 0; k <= todayKey; k = addDays(k, 1), i++) {
    total += perDay.get(k) ?? 0;
    out.push({ dateKey: k, day: i, total });
  }
  return out;
}

/** Avancement vers l'objectif, avec une date estimée au rythme des 28 derniers jours (au moins 7 jours d'historique). */
export function goalProgress(sessions, todayKey, goal = GOAL_SESSIONS) {
  const daily = sessions.filter(isDailyCounted);
  const done = daily.length;
  const left = Math.max(0, goal - done);
  let etaKey = null;
  if (left > 0 && done > 0) {
    const first = daily.map((s) => s.dateKey).sort()[0];
    const span = diffDays(first, todayKey) + 1;
    if (span >= 7) {
      const windowDays = Math.min(28, span);
      const from = addDays(todayKey, -(windowDays - 1));
      const recent = daily.filter((s) => s.dateKey >= from && s.dateKey <= todayKey).length;
      if (recent > 0) etaKey = addDays(todayKey, Math.ceil(left / (recent / windowDays)));
    }
  }
  return { goal, done, left, pct: Math.min(100, Math.round((100 * done) / goal)), reached: done >= goal, etaKey };
}

/** Taux de réussite par semaine (lundi) pour un axe, sur les `limit` dernières semaines qui ont des réponses. */
export function weeklyRate(sessions, axis, limit = 8) {
  const { positive } = AXES[axis];
  const weeks = new Map();
  for (const s of sessions) {
    const vals = answers(s, axis);
    if (!vals.length) continue;
    const key = weekOf(s.dateKey);
    const w = weeks.get(key) ?? { weekKey: key, n: 0, positive: 0 };
    w.n += vals.length;
    w.positive += vals.filter((v) => positive.includes(v)).length;
    weeks.set(key, w);
  }
  return [...weeks.values()]
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : 1))
    .slice(-limit)
    .map((w) => ({ ...w, pct: rate(w.positive, w.n) }));
}

function rateBetween(sessions, axis, fromKey, toKey) {
  const { positive } = AXES[axis];
  const vals = sessions.filter((s) => s.dateKey >= fromKey && s.dateKey <= toKey).flatMap((s) => answers(s, axis));
  return { n: vals.length, pct: rate(vals.filter((v) => positive.includes(v)).length, vals.length) };
}

/** Taux sur 28 jours ; « en hausse » si +10 points face aux 28 jours d'avant, avec au moins 3 réponses de chaque côté. */
export function axisSummary(sessions, axis, todayKey) {
  const recent = rateBetween(sessions, axis, addDays(todayKey, -27), todayKey);
  const before = rateBetween(sessions, axis, addDays(todayKey, -55), addDays(todayKey, -28));
  const rising = recent.n >= 3 && before.n >= 3 && recent.pct - before.pct >= 10;
  return { n: recent.n, pct: recent.pct, rising };
}

/** Derniers objectifs de RDV saisis, du plus récent au plus ancien. */
export function recentGoals(sessions, n = 5) {
  return sessions
    .filter((s) => s.type === 'prerdv' && (s.goal ?? '').trim())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, n)
    .map((s) => ({ dateKey: s.dateKey, goal: s.goal.trim(), result: s.goalReached ?? null }));
}
```

- [ ] **Step 4 : lancer les tests et vérifier qu'ils passent**

Lancer `npm test`.
Attendu : PASS sur tout. Le test `pwa.test.mjs` échouera à cause de `js/core/dashboard.js`, absent de `ASSETS`. Ajouter alors `"./js/core/dashboard.js",` dans `sw.js`, juste après `"./js/core/content-index.js",`, puis relancer jusqu'au vert.

- [ ] **Step 5 : commit**

```bash
git add js/core/dates.js js/core/progress.js js/core/dashboard.js sw.js tests/dashboard.test.mjs tests/dates.test.mjs tests/progress.test.mjs
git commit -m "feat(core): calculs du tableau de bord (objectif 60, axes, objectifs RDV)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : Graphiques SVG et écran Progression

**Fichiers :**
- Créer : `js/ui/components/chart.js`
- Remplacer entièrement : `js/ui/screens/progress.js`
- Modifier : `css/app.css` (ajouts à la fin), `sw.js` (`ASSETS`)

- [ ] **Step 1 : créer `js/ui/components/chart.js`**

```js
const NS = 'http://www.w3.org/2000/svg';
const W = 320;
const PAD = { l: 34, r: 10, t: 14, b: 22 };

function svg(tag, attrs, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...children.flat(Infinity).filter((c) => c != null));
  return el;
}

export const shortDayMonth = (key) => `${Number(key.slice(8))}/${Number(key.slice(5, 7))}`;

/** Courbe du cumul de séances, avec une ligne pointillée d'objectif. points : [{ day, total }] */
export function cumulativeChart(points, goal) {
  const H = 170;
  const last = points.at(-1);
  const maxX = Math.max(last?.day ?? 0, 6);
  const maxY = Math.max(goal, last?.total ?? 0);
  const x = (d) => PAD.l + (d / maxX) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);
  const line = points.map((p) => `${x(p.day).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  return svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Séances cumulées : ${last?.total ?? 0} sur ${goal}` },
    svg('line', { x1: PAD.l, x2: W - PAD.r, y1: y(goal), y2: y(goal), class: 'chart-goal' }),
    svg('text', { x: W - PAD.r, y: y(goal) - 5, 'text-anchor': 'end', class: 'chart-label' }, `Objectif ${goal}`),
    svg('line', { x1: PAD.l, x2: W - PAD.r, y1: y(0), y2: y(0), class: 'chart-axis' }),
    svg('text', { x: PAD.l - 6, y: y(0) + 4, 'text-anchor': 'end', class: 'chart-label' }, '0'),
    points.length > 1 ? svg('polygon', { points: `${x(0)},${y(0)} ${line} ${x(last.day)},${y(0)}`, class: 'chart-area' }) : null,
    points.length > 1 ? svg('polyline', { points: line, class: 'chart-line' }) : null,
    last ? svg('circle', { cx: x(last.day), cy: y(last.total), r: 4.5, class: 'chart-dot' }) : null,
    last ? svg('text', { x: PAD.l, y: H - 6, class: 'chart-label' }, shortDayMonth(points[0].dateKey)) : null,
    last ? svg('text', { x: W - PAD.r, y: H - 6, 'text-anchor': 'end', class: 'chart-label' }, "aujourd'hui") : null);
}

/** Mini-barres hebdomadaires de 0 à 100 %. weeks : [{ weekKey, pct }] */
export function weeklyBars(weeks) {
  const H = 110;
  const n = Math.max(weeks.length, 1);
  const bw = (W - PAD.l - PAD.r) / n;
  const y = (v) => H - PAD.b - (v / 100) * (H - PAD.t - PAD.b);
  return svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `Taux par semaine : ${weeks.map((w) => `${w.pct} %`).join(', ')}` },
    svg('line', { x1: PAD.l, x2: W - PAD.r, y1: y(0), y2: y(0), class: 'chart-axis' }),
    svg('text', { x: PAD.l - 6, y: y(100) + 4, 'text-anchor': 'end', class: 'chart-label' }, '100 %'),
    svg('text', { x: PAD.l - 6, y: y(0) + 4, 'text-anchor': 'end', class: 'chart-label' }, '0'),
    weeks.map((w, i) => {
      const bx = PAD.l + i * bw + bw * 0.18;
      const top = y(w.pct);
      return [
        svg('rect', { x: bx, y: top, width: bw * 0.64, height: Math.max(0, y(0) - top), rx: 3, class: 'chart-bar' }),
        svg('text', { x: bx + bw * 0.32, y: H - 6, 'text-anchor': 'middle', class: 'chart-label' }, shortDayMonth(w.weekKey)),
      ];
    }));
}
```

- [ ] **Step 2 : remplacer entièrement `js/ui/screens/progress.js`**

```js
import { h } from '../dom.js';
import { dayKey, longDateFr, MONTHS_FR } from '../../core/dates.js';
import { monthCount, totalCount, dailyCount, monthGrid, milestonesUpTo, nextMilestone } from '../../core/progress.js';
import { cumulativeSeries, goalProgress, weeklyRate, axisSummary, recentGoals } from '../../core/dashboard.js';
import { BLOCKS, plural } from '../../core/texts.js';
import { createCompare } from '../components/compare.js';
import { cumulativeChart, weeklyBars, shortDayMonth } from '../components/chart.js';

const AXIS_CARDS = [
  { key: 'diction', title: 'Diction et élocution', tagline: BLOCKS.articulation.tagline, measure: 'prises notées « Clair »', kind: 'Ton ressenti.', empty: 'Note tes prises à la fin de l’articulation : les barres apparaissent dès la première semaine.' },
  { key: 'ecoute', title: 'Écoute', tagline: BLOCKS.ecoute.tagline, measure: 'détails cachés repérés', kind: 'Ton ressenti.', empty: 'Réponds à « Repéré ? » après chaque écoute.' },
  { key: 'posture', title: 'Posture et présence', tagline: BLOCKS.posture.tagline, measure: 'séances où tu t’es senti posé', kind: 'Ton ressenti.', empty: 'Réponds à « Tu t’es senti posé ? » à la fin du bloc posture.' },
  { key: 'rdv', title: 'En rendez-vous', tagline: 'Ce qui se passe en vrai, face à tes clients.', measure: 'RDV sans qu’on te fasse répéter', kind: 'Observé en vrai.', empty: 'Lance « Avant un rendez-vous » avant ton prochain RDV, puis réponds à la question à ton retour.' },
];
const RESULT = { oui: 'Atteint', partie: 'En partie', non: 'Pas cette fois' };

function axisCard(sessions, today, a) {
  const sum = axisSummary(sessions, a.key, today);
  const weeks = weeklyRate(sessions, a.key);
  return h('div', { class: 'card axis' },
    h('h3', {}, a.title),
    h('p', { class: 'muted small' }, a.tagline),
    weeks.length
      ? [
        h('p', {},
          sum.n ? `Sur 4 semaines : ${sum.pct} % de ${a.measure} (${plural(sum.n, 'réponse')})` : 'Pas de réponse ces 4 dernières semaines.',
          sum.rising ? h('span', { class: 'rising' }, ' · en hausse') : null),
        weeklyBars(weeks),
        h('p', { class: 'muted small' }, a.kind),
      ]
      : h('p', { class: 'muted' }, a.empty));
}

export async function render(root, { repo }) {
  const today = dayKey(Date.now());
  const [y, m] = today.split('-').map(Number);
  const [sessions, recordings] = await Promise.all([repo.listSessions(), repo.listRecordings()]);
  const daily = dailyCount(sessions);
  const total = totalCount(sessions);
  const monthDays = monthCount(sessions, y, m);
  const grid = monthGrid(sessions, y, m, today);
  const cleanups = [];

  // Objectif 60 séances + courbe du cumul
  const g = goalProgress(sessions, today);
  const series = cumulativeSeries(sessions, today);
  const goalCard = h('div', { class: 'card' },
    h('h2', {}, `Objectif ${g.goal} séances`),
    h('p', { class: 'goal-num' }, `${g.done} / ${g.goal}`),
    h('div', { class: 'goal-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': g.goal, 'aria-valuenow': Math.min(g.done, g.goal) },
      h('div', { class: 'goal-fill', style: `width:${g.pct}%` })),
    h('p', {}, g.reached
      ? 'Objectif atteint ! Prochaine étape : l’anglais.'
      : `Encore ${plural(g.left, 'séance')}. À ${g.goal}, l’anglais et l’espagnol se débloquent.`),
    g.etaKey
      ? h('p', { class: 'muted' }, `Arrivée estimée : ${longDateFr(g.etaKey)}, à ton rythme actuel.`)
      : g.reached ? null : h('p', { class: 'muted' }, 'La date estimée apparaît après une semaine de pratique.'),
    series.length ? cumulativeChart(series, g.goal) : null);

  // Axes de progrès
  const axisCards = AXIS_CARDS.map((a) => axisCard(sessions, today, a));
  const rdvCard = axisCards.at(-1);
  const goals = recentGoals(sessions, 5);
  const obj = axisSummary(sessions, 'objectif', today);
  rdvCard.append(
    h('h3', { class: 'sub' }, 'Tes objectifs de RDV'),
    obj.n ? h('p', {}, `Sur 4 semaines : ${obj.pct} % atteints (${plural(obj.n, 'réponse')})`, obj.rising ? h('span', { class: 'rising' }, ' · en hausse') : null) : '',
    goals.length
      ? h('ul', { class: 'goals' }, goals.map((x) => h('li', {},
        h('span', { class: 'muted small' }, shortDayMonth(x.dateKey)), ' ', x.goal, ' · ',
        h('strong', {}, x.result ? RESULT[x.result] : '—'))))
      : h('p', { class: 'muted' }, 'Les objectifs que tu saisis avant un RDV apparaîtront ici.'));

  // Calendrier du mois
  const cal = h('div', { class: 'cal' },
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => h('span', { class: 'cal-head' }, d)),
    Array.from({ length: grid.leading }, () => h('span')),
    grid.cells.map((c) => h('span', { class: `cal-cell ${c.kind}${c.today ? ' today' : ''}` }, String(c.day))));

  // Ta voix (jalons + A/B)
  const refs = recordings.filter((r) => r.kind === 'reference');
  const j1 = refs.find((r) => r.milestone === 1);
  const base = Math.max(daily, 1);
  const upcoming = nextMilestone(base);
  const voice = h('div', { class: 'card' },
    h('h2', {}, 'Ta voix'),
    h('ol', { class: 'frise' },
      milestonesUpTo(base).map((mm) => h('li', { class: refs.some((r) => r.milestone === mm) ? 'done' : '' }, `J${mm}`)),
      h('li', { class: 'upcoming' }, `J${upcoming}`)),
    h('p', { class: 'muted' }, `Prochain jalon dans ${plural(upcoming - daily, 'séance')}.`));
  const lastRef = refs.filter((r) => r.milestone > 1).at(-1);
  if (j1 && lastRef) {
    const btn = h('button', {
      class: 'btn-secondary',
      onclick: async () => {
        btn.remove();
        const cmp = await createCompare({ repo, a: j1, b: lastRef, labelA: 'J1', labelB: `J${lastRef.milestone}` });
        if (cmp) { voice.append(cmp.el); cleanups.push(cmp.destroy); }
      },
    }, `Comparer J1 et J${lastRef.milestone}`);
    voice.append(btn);
  } else if (!j1) {
    voice.append(h('p', { class: 'muted' }, 'Ta voix de départ sera enregistrée à ta prochaine séance.'));
  }

  root.replaceChildren(h('div', { class: 'progress' },
    h('a', { class: 'back', href: '#/home' }, '‹ Accueil'),
    h('p', { class: 'big-count' }, String(monthDays)),
    h('p', {}, `${monthDays > 1 ? 'jours pratiqués' : 'jour pratiqué'} en ${MONTHS_FR[m - 1]}`),
    h('p', { class: 'muted' }, `${plural(total, 'séance')} depuis le début`),
    goalCard,
    h('h2', { class: 'section-title' }, 'Tes axes de progrès'),
    axisCards,
    h('h2', { class: 'section-title' }, 'Ce mois-ci'),
    cal,
    voice));
  return () => cleanups.forEach((f) => f());
}
```

- [ ] **Step 3 : ajouter à la fin de `css/app.css`**

```css
/* Tableau de bord */
.section-title { margin: 28px 0 4px; }
.small { font-size: 15px; }
.axis h3, .sub { font: 600 19px var(--font-title); margin: 0; }
.sub { margin-top: 18px; }
.rising { color: var(--primary); font-weight: 700; }
.goal-num { font: 600 34px var(--font-title); margin: 0; }
.goal-bar { height: 14px; border-radius: 7px; background: var(--border); overflow: hidden; margin: 8px 0 12px; }
.goal-fill { height: 100%; background: var(--primary); border-radius: 7px; }
.goals { list-style: none; padding: 0; margin: 8px 0 0; }
.goals li { padding: 10px 0; border-bottom: 1px solid var(--border); }
.chart { display: block; width: 100%; height: auto; margin: 8px 0; }
.chart-line { fill: none; stroke: var(--primary); stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
.chart-area { fill: var(--primary); opacity: .12; }
.chart-dot { fill: var(--primary); }
.chart-bar { fill: var(--primary); }
.chart-goal { stroke: var(--accent-text); stroke-width: 2; stroke-dasharray: 6 5; }
.chart-axis { stroke: var(--border); stroke-width: 1; }
.chart-label { fill: var(--text-2); font-family: var(--font-body); font-size: 11px; }
```

- [ ] **Step 4 : `sw.js`**

Ajouter `"./js/ui/components/chart.js",` dans `ASSETS`, juste avant `"./js/ui/components/compare.js",`.

- [ ] **Step 5 : vérifier**

Lancer `node --check js/ui/components/chart.js && node --check js/ui/screens/progress.js && npm test`.
Attendu : OK, puis tous les tests en PASS.

- [ ] **Step 6 : commit**

```bash
git add js/ui/components/chart.js js/ui/screens/progress.js css/app.css sw.js
git commit -m "feat(ui): tableau de bord (objectif 60, courbe, axes de progrès, objectifs RDV)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : Nouvelles questions en 1 tap (posture, objectif de RDV)

**Fichiers :**
- Modifier : `js/ui/screens/session.js`, `js/ui/screens/home.js`

- [ ] **Step 1 : `session.js`, note de posture qui apparaît dans les 20 dernières secondes**

1. Près des autres `let` du `render` (à côté de `let goalInput = null;`), ajouter :

```js
  let lateRating = null;
```

2. Au début de `enterStep(st)`, juste après `stage.replaceChildren();` (ou après la ligne qui vide la scène), ajouter `lateRating = null;`.

3. Remplacer le cas groupé :

```js
      case 'guide':
      case 'slow':
      case 'reformulate':
      case 'consigne':
        add(title, lines, text);
        speak(st.speak);
        break;
```

par :

```js
      case 'guide':
      case 'slow':
      case 'reformulate':
      case 'consigne':
        add(title, lines, text);
        if (st.block === 'posture') {
          lateRating = rating('Tu t’es senti posé ?', [['pose', 'Oui'], ['unpeu', 'Un peu'], ['pasencore', 'Pas encore']], (v) => {
            record.ratings[st.itemId] = v;
            advance();
          });
          lateRating.hidden = true;
          add(lateRating);
        }
        speak(st.speak);
        break;
```

4. Dans `loop()`, juste **après** l'appel `timer.update(...)`, ajouter :

```js
    if (lateRating?.hidden && remainingMs(run, Date.now()) <= 20000) lateRating.hidden = false;
```

Vérifier que `advance` est bien défini dans `enterStep` **avant** le `switch`, comme pour les autres cas. Sinon, adapter au nom réel de la fonction locale qui passe au pas suivant.

- [ ] **Step 2 : `home.js`, deuxième question du retour terrain**

1. Ajouter `pendingGoalCheck` à l'import de `../../core/progress.js`.
2. Sous la constante `FEEDBACK`, ajouter :

```js
const GOAL_RESULT = [['oui', 'Oui'], ['partie', 'En partie'], ['non', 'Pas cette fois']];
```

3. Juste après `const fb = pendingFeedback(sessions, now);`, ajouter :

```js
  const goalCheck = fb ? null : pendingGoalCheck(sessions, now);
```

4. Insérer une branche **entre** `if (fb) { … }` et `else if (why && whyCheckDue(…))` :

```js
  } else if (goalCheck) {
    card = h('div', { class: 'card' },
      h('p', {}, 'Ton objectif de RDV :'),
      h('p', { class: 'why' }, `« ${goalCheck.goal} »`),
      h('p', {}, 'Atteint ?'),
      h('div', { class: 'row' }, GOAL_RESULT.map(([v, label]) => h('button', {
        class: 'btn-small',
        onclick: async () => { await repo.saveSession({ ...goalCheck, goalReached: v }); navigate('/home'); },
      }, label))),
      h('button', { class: 'btn-link', onclick: async () => { await repo.saveSession({ ...goalCheck, goalSkipped: true }); navigate('/home'); } }, 'Passer'));
```

- [ ] **Step 3 : vérifier**

Lancer `node --check js/ui/screens/session.js && node --check js/ui/screens/home.js && npm test`.
Attendu : OK, puis PASS.

- [ ] **Step 4 : commit**

```bash
git add js/ui/screens/session.js js/ui/screens/home.js
git commit -m "feat(ui): note de posture en 1 tap et question « objectif RDV atteint ? »" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : Mise à jour de la spec V1 et vérification dans le navigateur (contrôleur)

- [ ] Dans `docs/superpowers/specs/2026-10-09-ohmaparole-design.md` §6, remplacer la ligne « **Jamais affiché :** courbes, moyennes, record, score de diction. » par « **Jamais affiché :** score de diction, record, série. Les courbes autorisées sont définies dans `2026-10-09-ohmaparole-tableau-design.md`. ». Committer.
- [ ] Contrôle dans le navigateur intégré (`npm run serve`, port 8080) :
  1. Injecter des séances factices dans IndexedDB : 20 séances quotidiennes sur 25 jours, avec des notes variées sur les 3 axes, et 3 RDV dont 2 avec un objectif.
  2. Ouvrir `#/progress` : la carte objectif est bien « 20 / 60 », avec une date estimée et une courbe visible.
  3. Les 4 cartes d'axe ont des barres, et la liste des objectifs s'affiche.
  4. Aucun « null » ni « NaN » dans `get_page_text`, et aucune erreur dans la console.
- [ ] Faire une capture d'écran en largeur mobile, puis fusionner la branche `tableau` dans `main`.
