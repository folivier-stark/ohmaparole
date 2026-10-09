# OhMaParole V1 : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**But :** construire OhMaParole, une PWA Android hors ligne d'entraînement quotidien de 5 min (diction, écoute, posture), avec une routine de 90 s avant un rendez-vous et une progression sans culpabilisation.

**Architecture :**
- JavaScript natif en modules ES, sans build et sans dépendance à l'exécution.
- `js/core/` est **pur** (pas de DOM, pas d'IndexedDB, l'heure est passée en paramètre) et testé avec `node --test`.
- Les données sont dans IndexedDB, l'audio est enregistré avec MediaRecorder, et le service worker sert tout depuis le cache.
- Hébergement sur GitHub Pages (`folivier-stark/ohmaparole`).

**Stack :** HTML, CSS, JS ESM, Node 24 (tests, serveur local, scripts uniquement), git et gh.

**Références à lire avant de commencer :**
- `docs/superpowers/specs/2026-10-09-ohmaparole-design.md` : **la spec, qui fait foi** ;
- `docs/experts/expert-contenu.md`, `expert-ux.md`, `expert-tech.md` : les rapports détaillés.

**Conventions :**
- Tous les textes de l'interface sont en **français**, au tutoiement.
- Racine du dépôt : `C:\Users\Fred_OLIVIER\Documents\Perso\apprentissage`. Toutes les commandes se lancent depuis cette racine, sous Git Bash.
- Chaque commit se termine par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Utiliser `git commit -m "<titre>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- Ne **jamais** ajouter de dépendance npm.

---

## Carte des fichiers

| Fichier | Responsabilité |
|---|---|
| `package.json` | scripts `test`, `serve`, `content`, `icons`, `deploy` (aucune dépendance) |
| `tools/serve.mjs` | serveur statique local sur le port 8080 |
| `tools/yaml-subset.mjs` | parseur du sous-ensemble YAML du rapport de contenu |
| `tools/import-content.mjs` | génère `content/fr/exercises.json` depuis `docs/experts/expert-contenu.md` |
| `tools/make-icons.mjs` | génère les icônes PNG (encodeur PNG maison avec `node:zlib`) |
| `tools/release.mjs` | met à jour la version (`sw.js` et `js/version.js`), puis commit et push |
| `content/program.json` | programme sur 6 semaines, neutre en langue (ids sans préfixe) |
| `content/fr/exercises.json` | bibliothèque générée (65 items, 10 consignes) |
| `content/fr/extras.json` | texte de référence, motivations, exemples, note clinique, garde-fous |
| `js/core/dates.js` | clés de jour **locales**, écarts entre jours, calendrier |
| `js/core/pick.js` | hash stable et choix de l'item le moins récemment joué |
| `js/core/content-index.js` | assemble le contenu (index par id) |
| `js/core/planner.js` | compose les séances (quotidienne, reprise, jalon, avant RDV) |
| `js/core/session-engine.js` | machine à états des minuteurs (par horodatages) |
| `js/core/progress.js` | compteurs, calendrier, jalons, état de l'accueil, retours |
| `js/core/texts.js` | textes de l'interface et ligne de contexte de l'accueil |
| `js/core/reminder.js` | lien Google Agenda récurrent et libellé d'alarme |
| `js/data/db.js` | ouverture d'IndexedDB et promisification |
| `js/data/repo.js` | API métier (meta, séances, enregistrements, audio) |
| `js/data/content.js` | charge les JSON de contenu |
| `js/data/backup.js` | export et import JSON (audio en base64) |
| `js/audio/recorder.js` / `player.js` | micro et lecture |
| `js/platform/speech.js` / `haptics.js` / `wakelock.js` / `storage.js` | synthèse vocale, vibrations, écran allumé, persistance |
| `js/ui/dom.js` | helper `h()` |
| `js/ui/components/timer.js` / `compare.js` | anneau du minuteur, comparaison A/B à l'aveugle |
| `js/ui/screens/*.js` | `onboarding`, `home`, `session`, `end`, `progress`, `settings` |
| `js/router.js` / `js/main.js` / `js/version.js` | routage par hash, démarrage, version |
| `index.html`, `css/app.css`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `.gitignore`, `README.md` | coque PWA |
| `tests/*.test.mjs`, `tests/helpers.mjs` | tests `node --test` |

---

### Task 1 : Socle du projet

**Fichiers :**
- Créer : `package.json`, `.gitignore`, `.nojekyll` (vide), `tools/serve.mjs`, `README.md`

- [ ] **Step 1 : créer `package.json`**

```json
{
  "name": "ohmaparole",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "serve": "node tools/serve.mjs",
    "content": "node tools/import-content.mjs",
    "icons": "node tools/make-icons.mjs",
    "deploy": "node --test tests/*.test.mjs && node tools/release.mjs"
  }
}
```

- [ ] **Step 2 : créer `.gitignore`**

```
node_modules/
ohmaparole-sauvegarde-*.json
```

- [ ] **Step 3 : créer `.nojekyll`, un fichier vide**

Lancer `touch .nojekyll`.

- [ ] **Step 4 : créer `tools/serve.mjs`**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`OhMaParole : http://localhost:${PORT}`));
```

- [ ] **Step 5 : créer `README.md`**

````markdown
# OhMaParole

Appli perso d'entraînement quotidien (diction, écoute, posture), installable sur Android.
Spec : `docs/superpowers/specs/2026-10-09-ohmaparole-design.md`.

## Commandes

| Commande | Effet |
|---|---|
| `npm test` | tests du cœur métier |
| `npm run serve` | serveur local http://localhost:8080 |
| `npm run content` | régénère `content/fr/exercises.json` depuis `docs/experts/expert-contenu.md` |
| `npm run icons` | régénère les icônes |
| `npm run deploy` | tests, version, commit, push (GitHub Pages) |

## Tester sur le téléphone en local

1. Téléphone : Options pour les développeurs, puis Débogage USB, puis brancher le câble.
2. PC : `npm run serve`, puis dans Chrome `chrome://inspect/#devices`, puis Port forwarding `8080 → localhost:8080`.
3. Téléphone : ouvrir `http://localhost:8080` (contexte sécurisé : le micro et le service worker fonctionnent).

## Kill switch du service worker

Si une version casse l'appli hors ligne, déployer ce `sw.js` à la place, puis rouvrir l'appli :

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll()) c.navigate(c.url);
})()));
```
Les données (IndexedDB) ne sont pas touchées.
````

- [ ] **Step 6 : vérifier que le serveur démarre**

Lancer `node tools/serve.mjs` en arrière-plan, puis `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/README.md`.
Attendu : `200`. Arrêter le serveur ensuite.

- [ ] **Step 7 : commit**

```bash
git add package.json .gitignore .nojekyll tools/serve.mjs README.md
git commit -m "chore: socle du projet OhMaParole" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : Dates locales (`js/core/dates.js`)

**Fichiers :**
- Créer : `js/core/dates.js`
- Test : `tests/dates.test.mjs`

- [ ] **Step 1 : écrire le test qui doit échouer**

```js
process.env.TZ = 'Europe/Paris';
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, diffDays, addDays, daysInMonth, weekdayMon0, MONTHS_FR } from '../js/core/dates.js';

test("dayKey utilise l'heure locale (00h30 à Paris = jour suivant en UTC)", () => {
  assert.equal(dayKey(Date.UTC(2026, 9, 9, 22, 30)), '2026-10-10');
  assert.equal(dayKey(Date.UTC(2026, 9, 9, 21, 59)), '2026-10-09');
});

test("diffDays traverse le passage à l'heure d'hiver", () => {
  assert.equal(diffDays('2026-10-24', '2026-10-26'), 2);
  assert.equal(diffDays('2026-10-26', '2026-10-24'), -2);
});

test("addDays change de mois et d'année", () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('daysInMonth', () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 10), 31);
});

test('weekdayMon0 : lundi = 0, dimanche = 6', () => {
  assert.equal(weekdayMon0('2026-10-05'), 0);
  assert.equal(weekdayMon0('2026-10-11'), 6);
});

test('MONTHS_FR', () => {
  assert.equal(MONTHS_FR.length, 12);
  assert.equal(MONTHS_FR[9], 'octobre');
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Lancer `node --test tests/dates.test.mjs`.
Attendu : FAIL, `Cannot find module`.

- [ ] **Step 3 : implémenter**

```js
const pad = (n) => String(n).padStart(2, '0');

export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Clé de jour LOCALE "YYYY-MM-DD" (jamais toISOString, qui est en UTC). */
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function keyToUTC(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Nombre de jours de a vers b (b - a). */
export function diffDays(a, b) {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / 86400000);
}

export function addDays(key, n) {
  const t = new Date(keyToUTC(key) + n * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** month : 1 à 12 */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function weekdayMon0(key) {
  return (new Date(keyToUTC(key)).getUTCDay() + 6) % 7;
}

export function monthKeyPrefix(year, month) {
  return `${year}-${pad(month)}-`;
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Lancer `node --test tests/dates.test.mjs`.
Attendu : PASS, 6 tests.

- [ ] **Step 5 : commit**

```bash
git add js/core/dates.js tests/dates.test.mjs
git commit -m "feat(core): dates locales" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : Tirage déterministe (`js/core/pick.js`)

**Fichiers :**
- Créer : `js/core/pick.js`
- Test : `tests/pick.test.mjs`

- [ ] **Step 1 : écrire le test qui doit échouer**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashString, pickLeastRecent } from '../js/core/pick.js';

const C = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('hashString est stable', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
});

test('préfère un item jamais joué', () => {
  assert.equal(pickLeastRecent(C, ['a', 'b'], 's').id, 'c');
});

test('sinon le moins récemment joué (historique : le plus récent en premier)', () => {
  assert.equal(pickLeastRecent(C, ['c', 'a', 'b'], 's').id, 'b');
});

test('déterministe pour une même graine', () => {
  assert.equal(pickLeastRecent(C, [], 'x').id, pickLeastRecent(C, [], 'x').id);
});

test('erreur si aucun candidat', () => {
  assert.throws(() => pickLeastRecent([], [], 's'));
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Lancer `node --test tests/pick.test.mjs`.
Attendu : FAIL.

- [ ] **Step 3 : implémenter**

```js
/** Hash FNV-1a 32 bits, stable. */
export function hashString(s) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Choisit le candidat joué le moins récemment.
 * history : ids, le plus récent en premier. Départage par hash(seed:id).
 */
export function pickLeastRecent(candidates, history, seed) {
  if (!candidates.length) throw new Error('pickLeastRecent : aucun candidat');
  const rank = (id) => {
    const i = history.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  const scored = candidates.map((c) => ({ c, r: rank(c.id), t: hashString(`${seed}:${c.id}`) }));
  scored.sort((a, b) => (b.r - a.r) || (a.t - b.t));
  return scored[0].c;
}
```

Note : `Infinity - Infinity` vaut `NaN`, qui est falsy. Le départage par hash prend donc le relais, comme voulu.

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Lancer `node --test tests/pick.test.mjs`.
Attendu : PASS.

- [ ] **Step 5 : commit**

```bash
git add js/core/pick.js tests/pick.test.mjs
git commit -m "feat(core): tirage déterministe" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : Moteur de séance (`js/core/session-engine.js`)

**Fichiers :**
- Créer : `js/core/session-engine.js`
- Test : `tests/session-engine.test.mjs`

- [ ] **Step 1 : écrire le test qui doit échouer**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun, tick, next, pause, resume, skipBlock, stop,
  remainingMs, practicedMs, isCounted, pausedForMs, currentStep,
} from '../js/core/session-engine.js';

const steps = [
  { block: 'A', durationSec: 30 },
  { block: 'A', durationSec: 30 },
  { block: 'B', durationSec: 60 },
];

test('createRun démarre au premier pas', () => {
  const r = createRun(steps, 0);
  assert.equal(r.index, 0);
  assert.equal(r.status, 'running');
  assert.equal(remainingMs(r, 10000), 20000);
  assert.equal(currentStep(r), steps[0]);
});

test('tick passe au pas suivant quand le temps est écoulé', () => {
  let r = createRun(steps, 0);
  r = tick(r, 29000);
  assert.equal(r.index, 0);
  r = tick(r, 30000);
  assert.equal(r.index, 1);
  assert.equal(r.practicedMs, 30000);
  assert.equal(remainingMs(r, 30000), 30000);
});

test('le temps en pause ne compte pas', () => {
  let r = createRun(steps, 0);
  r = pause(r, 10000);
  assert.equal(r.status, 'paused');
  r = resume(r, 70000);
  assert.equal(remainingMs(r, 70000), 20000);
  assert.equal(practicedMs(r, 70000), 10000);
});

test('next termine un pas en avance', () => {
  let r = createRun(steps, 0);
  r = next(r, 5000);
  assert.equal(r.index, 1);
  assert.equal(r.practicedMs, 5000);
});

test('skipBlock saute au bloc suivant', () => {
  let r = createRun(steps, 0);
  r = skipBlock(r, 1000);
  assert.equal(r.index, 2);
  assert.equal(currentStep(r).block, 'B');
  assert.equal(r.status, 'running');
});

test('stop termine et garde le temps pratiqué', () => {
  let r = createRun(steps, 0);
  r = tick(r, 30000);
  r = stop(r, 45000);
  assert.equal(r.status, 'done');
  assert.equal(r.practicedMs, 45000);
  assert.equal(currentStep(r), null);
});

test('fin naturelle', () => {
  let r = createRun(steps, 0);
  r = tick(r, 30000);
  r = tick(r, 60000);
  r = tick(r, 120000);
  assert.equal(r.status, 'done');
  assert.equal(r.practicedMs, 120000);
});

test("saut d'horloge : le temps d'un pas est plafonné à sa durée", () => {
  let r = createRun(steps, 0);
  r = tick(r, 600000);
  assert.equal(r.index, 1);
  assert.equal(r.practicedMs, 30000);
});

test('règle des 60 s', () => {
  assert.equal(isCounted(59999), false);
  assert.equal(isCounted(60000), true);
});

test('pausedForMs', () => {
  const r = pause(createRun(steps, 0), 1000);
  assert.equal(pausedForMs(r, 5000), 4000);
  assert.equal(pausedForMs(createRun(steps, 0), 5000), 0);
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Lancer `node --test tests/session-engine.test.mjs`.
Attendu : FAIL.

- [ ] **Step 3 : implémenter**

```js
// Machine à états PURE. Le temps se calcule par différence d'horodatages,
// jamais en comptant des ticks (setInterval est gelé en arrière-plan).

export const COUNT_THRESHOLD_MS = 60000;

export function createRun(steps, now) {
  return {
    steps,
    index: 0,
    stepStartedAt: now,
    pausedAt: null,
    pausedMs: 0,
    practicedMs: 0,
    status: steps.length ? 'running' : 'done',
  };
}

export function currentStep(s) {
  return s.status === 'done' ? null : s.steps[s.index];
}

export function stepElapsedMs(s, now) {
  if (s.status === 'done') return 0;
  const ref = s.pausedAt ?? now;
  return Math.max(0, ref - s.stepStartedAt - s.pausedMs);
}

export function remainingMs(s, now) {
  const st = currentStep(s);
  if (!st) return 0;
  return Math.max(0, st.durationSec * 1000 - stepElapsedMs(s, now));
}

function doneInStep(s, now) {
  return Math.min(stepElapsedMs(s, now), currentStep(s).durationSec * 1000);
}

function advanceTo(s, nextIndex, now) {
  const practiced = s.practicedMs + doneInStep(s, now);
  if (nextIndex >= s.steps.length) {
    return { ...s, index: s.steps.length, practicedMs: practiced, pausedAt: null, pausedMs: 0, status: 'done' };
  }
  return { ...s, index: nextIndex, stepStartedAt: now, pausedAt: null, pausedMs: 0, practicedMs: practiced, status: 'running' };
}

export function tick(s, now) {
  if (s.status !== 'running') return s;
  return remainingMs(s, now) === 0 ? advanceTo(s, s.index + 1, now) : s;
}

export function next(s, now) {
  return s.status === 'done' ? s : advanceTo(s, s.index + 1, now);
}

export function pause(s, now) {
  return s.status === 'running' ? { ...s, status: 'paused', pausedAt: now } : s;
}

export function resume(s, now) {
  if (s.status !== 'paused') return s;
  return { ...s, status: 'running', pausedMs: s.pausedMs + (now - s.pausedAt), pausedAt: null };
}

export function skipBlock(s, now) {
  if (s.status === 'done') return s;
  const block = currentStep(s).block;
  let i = s.index + 1;
  while (i < s.steps.length && s.steps[i].block === block) i++;
  return advanceTo(s, i, now);
}

export function stop(s, now) {
  return s.status === 'done' ? s : advanceTo(s, s.steps.length, now);
}

export function practicedMs(s, now) {
  return s.status === 'done' ? s.practicedMs : s.practicedMs + doneInStep(s, now);
}

export function isCounted(ms) {
  return ms >= COUNT_THRESHOLD_MS;
}

export function pausedForMs(s, now) {
  return s.status === 'paused' ? now - s.pausedAt : 0;
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Lancer `node --test tests/session-engine.test.mjs`.
Attendu : PASS, 10 tests.

- [ ] **Step 5 : commit**

```bash
git add js/core/session-engine.js tests/session-engine.test.mjs
git commit -m "feat(core): moteur de séance par horodatages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : Contenu (import YAML, programme, extras, index)

**Fichiers :**
- Créer : `tools/yaml-subset.mjs`, `tools/import-content.mjs`, `content/program.json`, `content/fr/extras.json`, `js/core/content-index.js`, `tests/helpers.mjs`
- Générer : `content/fr/exercises.json`
- Test : `tests/yaml-subset.test.mjs`, `tests/content.test.mjs`

- [ ] **Step 1 : écrire le test du parseur, qui doit échouer**

`tests/yaml-subset.test.mjs` :

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYamlSubset, extractYamlBlocks } from '../tools/yaml-subset.mjs';

const sample = [
  '# ---------- commentaire ----------',
  '- id: E01',
  '  bloc: echauffement',
  '  type: voix',
  '  semaine_min: 1',
  '  duree_s: 30',
  '  titre: Le long soupir',
  '  consigne:',
  '    - Inspire : doucement.',
  '    - "Souffle « fff »."',
  '  texte: null',
  '  pourquoi: Ça calme : vraiment.',
  '',
  '- id: L01',
  '  passage: >',
  '    Ligne un',
  '    ligne deux.',
  '  titre: "Titre, cité"',
  '',
  'consignes_ecoute:',
  '  - id: C01',
  '    texte: "Pose une question, puis tais-toi."',
].join('\n');

test('parse le sous-ensemble YAML du rapport de contenu', () => {
  const { items, consignes } = parseYamlSubset(sample);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].consigne, ['Inspire : doucement.', 'Souffle « fff ».']);
  assert.equal(items[0].texte, null);
  assert.equal(items[0].semaine_min, 1);
  assert.equal(items[0].pourquoi, 'Ça calme : vraiment.');
  assert.equal(items[1].passage, 'Ligne un ligne deux.');
  assert.equal(items[1].titre, 'Titre, cité');
  assert.deepEqual(consignes, [{ id: 'C01', texte: 'Pose une question, puis tais-toi.' }]);
});

test('ligne inconnue = erreur explicite avec son numéro', () => {
  assert.throws(() => parseYamlSubset('- id: X\nnimporte quoi'), /Ligne 2/);
});

test('extractYamlBlocks', () => {
  assert.equal(extractYamlBlocks('a\n```yaml\nx: 1\n```\nb\n```yaml\ny: 2\n```'), 'x: 1\ny: 2');
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Lancer `node --test tests/yaml-subset.test.mjs`.
Attendu : FAIL.

- [ ] **Step 3 : implémenter `tools/yaml-subset.mjs`**

```js
// Parseur volontairement limité au format de docs/experts/expert-contenu.md.
// Un vrai parseur YAML lirait « - Lentement : chaque t » comme un objet : on évite.

const unquote = (v) => {
  const t = v.trim();
  if (t.startsWith('"') && t.endsWith('"')) return JSON.parse(t);
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  return t;
};

const scalar = (v) => {
  const t = v.trim();
  if (t === 'null' || t === '~' || t === '') return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  return unquote(t);
};

export function extractYamlBlocks(md) {
  return [...md.matchAll(/```yaml\r?\n([\s\S]*?)```/g)].map((m) => m[1].trimEnd()).join('\n');
}

export function parseYamlSubset(text) {
  const items = [];
  const consignes = [];
  let section = 'items';
  let cur = null;
  let key = null;
  let mode = null;

  text.split(/\r?\n/).forEach((line, i) => {
    const fail = () => { throw new Error(`Ligne ${i + 1} non reconnue : ${line}`); };
    if (/^\s*#/.test(line) || line.trim() === '') return;
    let m;
    if ((m = line.match(/^- id: (.+)$/))) {
      section = 'items';
      cur = { id: scalar(m[1]) };
      items.push(cur);
      mode = null;
      return;
    }
    if (/^consignes_ecoute:\s*$/.test(line)) {
      section = 'consignes';
      cur = null;
      mode = null;
      return;
    }
    if (section === 'consignes') {
      if ((m = line.match(/^ {2}- id: (.+)$/))) {
        cur = { id: scalar(m[1]) };
        consignes.push(cur);
        return;
      }
      if (cur && (m = line.match(/^ {4}(\w+): (.*)$/))) {
        cur[m[1]] = scalar(m[2]);
        return;
      }
      fail();
    }
    if (!cur) fail();
    if ((m = line.match(/^ {2}(\w+):\s*>\s*$/))) { key = m[1]; mode = 'folded'; cur[key] = ''; return; }
    if ((m = line.match(/^ {2}(\w+):\s*$/))) { key = m[1]; mode = 'list'; cur[key] = []; return; }
    if ((m = line.match(/^ {2}(\w+): (.*)$/))) { cur[m[1]] = scalar(m[2]); mode = null; return; }
    if (mode === 'list' && (m = line.match(/^ {4}- (.*)$/))) { cur[key].push(unquote(m[1])); return; }
    if (mode === 'folded' && (m = line.match(/^ {4}(\S.*)$/))) {
      cur[key] = cur[key] ? `${cur[key]} ${m[1].trim()}` : m[1].trim();
      return;
    }
    fail();
  });
  return { items, consignes };
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Lancer `node --test tests/yaml-subset.test.mjs`.
Attendu : PASS.

- [ ] **Step 5 : créer `tools/import-content.mjs` et générer le JSON**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extractYamlBlocks, parseYamlSubset } from './yaml-subset.mjs';

const LANG = 'fr';
const SOURCE = 'docs/experts/expert-contenu.md';
const { items, consignes } = parseYamlSubset(extractYamlBlocks(readFileSync(SOURCE, 'utf8')));

const norm = (r) => {
  const o = {
    id: `${LANG}.${r.id}`,
    bloc: r.bloc,
    semaineMin: r.semaine_min,
    dureeS: r.duree_s,
    titre: r.titre,
    consigne: r.consigne ?? [],
    texte: r.texte ?? null,
    pourquoi: r.pourquoi ?? '',
  };
  if (r.type) o.type = r.type;
  if (r.passage) {
    o.passage = r.passage;
    o.reformulationRef = r.reformulation_ref;
    o.detailCache = r.detail_cache;
  }
  return o;
};

const out = {
  lang: LANG,
  source: SOURCE,
  items: items.map(norm),
  consignes: consignes.map((c) => ({ id: `${LANG}.${c.id}`, texte: c.texte })),
};
mkdirSync('content/fr', { recursive: true });
writeFileSync('content/fr/exercises.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`${out.items.length} exercices et ${out.consignes.length} consignes écrits dans content/fr/exercises.json`);
```

Lancer `node tools/import-content.mjs`.
Attendu : `65 exercices et 10 consignes écrits dans content/fr/exercises.json`.

Si une erreur `Ligne N non reconnue` apparaît, lire la ligne N du YAML concaténé, puis **étendre le parseur** au format rencontré, en ajoutant un cas au test du Step 1. Ne pas modifier le rapport d'expert.

- [ ] **Step 6 : créer `content/program.json`**

Il reprend le §2 de `expert-contenu.md`. Les ids ne portent pas de préfixe de langue.

```json
{
  "sessionsPerWeek": 5,
  "weeks": [
    { "week": 1, "theme": "Ouvrir, ralentir", "articulation": ["A01", "A02", "A15", "A16"], "ecoute": ["L01", "L02"], "posture": ["P01", "P07"] },
    { "week": 2, "theme": "Consonnes qui claquent", "articulation": ["A03", "A04", "A05", "A17", "A18"], "ecoute": ["L03", "L04"], "posture": ["P02", "P03"] },
    { "week": 3, "theme": "Sifflantes et chuintantes", "articulation": ["A06", "A07", "A08", "A09", "A19", "A20"], "ecoute": ["L05", "L06"], "posture": ["P04", "P08"] },
    { "week": 4, "theme": "Groupes difficiles", "articulation": ["A10", "A11", "A12", "A21", "A22", "A23"], "ecoute": ["L07", "L08"], "posture": ["P05", "P09"] },
    { "week": 5, "theme": "Phrases qui portent", "articulation": ["A13", "A24", "A25", "A26"], "ecoute": ["L09", "L10"], "posture": ["P06", "P11"] },
    { "week": 6, "theme": "Intégration", "articulation": ["A14", "A27", "A28"], "ecoute": ["L11", "L12"], "posture": ["P10", "P12"] }
  ]
}
```

- [ ] **Step 7 : créer `content/fr/extras.json`**

```json
{
  "reference": {
    "id": "fr.REF1",
    "titre": "Texte de référence",
    "texte": "Bonjour, je suis Fred. Mon métier, c'est de faire le pont entre la technique et l'humain. J'accompagne les artisans et les petites entreprises dans leur transformation numérique. Avant de parler d'outils, j'aimerais comprendre votre quotidien : qu'est-ce qui vous prend le plus de temps en ce moment ? Les chaussettes de l'archiduchesse sont-elles sèches, archisèches ?"
  },
  "objectifDefaut": "Être posé et clair en rendez-vous, face à 1 à 3 personnes.",
  "pourquoiExemples": [
    "Être compris du premier coup en rendez-vous.",
    "Parler posément, même quand l'enjeu est fort.",
    "Préparer le terrain pour l'anglais et l'espagnol."
  ],
  "objectifsRdv": [
    "Savoir s'il a un vrai besoin, un budget et une date.",
    "Obtenir un rendez-vous avec celui qui décide.",
    "Comprendre ce qui le bloque."
  ],
  "motivations": [
    "Cinq minutes, pas plus. Le reste de ta journée t'appartient.",
    "Une phrase claire vaut mieux que trois phrases rapides.",
    "Tu ne t'entraînes pas pour parler parfaitement, mais pour être compris.",
    "Une séance ratée ne compte pas. Celle d'aujourd'hui, si.",
    "Ce que tu dis vaut la peine d'être entendu jusqu'au bout.",
    "Écouter vraiment, c'est déjà rendre service.",
    "Le silence après une question travaille pour toi.",
    "Ralentir, ce n'est pas perdre du temps, c'est en faire gagner à l'autre.",
    "Tes idées vont vite. Ta bouche apprend à suivre.",
    "Être le pont entre la tech et l'humain, ça commence par une voix qu'on comprend.",
    "Personne ne t'écoute aujourd'hui. Tu peux te tromper tranquille.",
    "Les progrès se voient sur des semaines, pas sur un jour."
  ],
  "noteClinique": "Chez certaines personnes qui pensent vite, le débit dépasse la capacité d'articulation : syllabes avalées, mots qui se télescopent, fins de phrase qui s'effacent. Quand c'est marqué, les orthophonistes parlent parfois de bredouillement, qui coexiste plus souvent que la moyenne avec un TDAH. Ce n'est pas un diagnostic : seul un bilan orthophonique peut le dire. Si tu te reconnais là-dedans, un bilan vaut le coup. L'appli reste un complément.",
  "gardeFous": [
    "Douleur, brûlure ou gêne à la gorge pendant un exercice : arrête. Un échauffement ne doit jamais faire mal.",
    "Voix fatiguée ou enrouée : fais seulement l'échauffement doux et saute l'articulation. Bois de l'eau.",
    "Enrouement qui dure plus de 3 à 4 semaines, voix qui casse, douleur ou difficulté à avaler : consulte ton médecin.",
    "Si tes difficultés d'élocution te gênent au quotidien, demande un bilan orthophonique (en général sur prescription du médecin traitant). L'appli vient en complément, pas à la place."
  ]
}
```

- [ ] **Step 8 : créer `js/core/content-index.js` et `tests/helpers.mjs`**

`js/core/content-index.js` :

```js
/** Assemble le contenu chargé (programme, exercices, extras) en un objet indexé. */
export function indexContent({ program, exercises, extras }) {
  return {
    lang: exercises.lang,
    program,
    items: exercises.items,
    consignes: exercises.consignes,
    byId: new Map(exercises.items.map((it) => [it.id, it])),
    reference: extras.reference,
    motivations: extras.motivations,
    extras,
  };
}
```

`tests/helpers.mjs` :

```js
import { readFileSync } from 'node:fs';
import { indexContent } from '../js/core/content-index.js';

export const readJson = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

export const loadTestContent = () => indexContent({
  program: readJson('content/program.json'),
  exercises: readJson('content/fr/exercises.json'),
  extras: readJson('content/fr/extras.json'),
});
```

- [ ] **Step 9 : écrire `tests/content.test.mjs`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTestContent } from './helpers.mjs';

const c = loadTestContent();
const by = (b) => c.items.filter((i) => i.bloc === b);

test('volumes attendus', () => {
  assert.equal(by('echauffement').length, 12);
  assert.equal(by('articulation').length, 28);
  assert.equal(by('ecoute').length, 12);
  assert.equal(by('posture').length, 12);
  assert.equal(by('avant-rdv').length, 1);
  assert.equal(c.consignes.length, 10);
});

test('ids uniques et préfixés par la langue', () => {
  const ids = [...c.items.map((i) => i.id), ...c.consignes.map((x) => x.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^fr\./);
});

test('champs obligatoires', () => {
  for (const it of c.items) {
    assert.ok(it.titre && it.pourquoi, it.id);
    assert.ok(it.consigne.length >= 1 && it.consigne.length <= 3, it.id);
    assert.equal(typeof it.dureeS, 'number', it.id);
    assert.equal(typeof it.semaineMin, 'number', it.id);
  }
  for (const it of by('ecoute')) assert.ok(it.passage && it.reformulationRef && it.detailCache && it.consigne.length >= 2, it.id);
  for (const it of by('articulation')) assert.ok(typeof it.texte === 'string' && it.consigne.length >= 2, it.id);
  for (const it of by('echauffement')) assert.ok(['voix', 'moteur'].includes(it.type), it.id);
  for (const x of c.consignes) assert.ok(x.texte, x.id);
});

test('chaque id du programme existe dans le bon bloc', () => {
  for (const w of c.program.weeks) {
    for (const bloc of ['articulation', 'ecoute', 'posture']) {
      assert.ok(w[bloc].length >= 2, `semaine ${w.week} ${bloc}`);
      for (const id of w[bloc]) assert.equal(c.byId.get(`fr.${id}`)?.bloc, bloc, `${id} (semaine ${w.week})`);
    }
  }
});

test('chaque semaine a un échauffement voix et un moteur disponibles', () => {
  for (const w of c.program.weeks) {
    for (const t of ['voix', 'moteur']) {
      assert.ok(by('echauffement').some((e) => e.type === t && e.semaineMin <= w.week), `semaine ${w.week} ${t}`);
    }
  }
});

test('extras complets', () => {
  assert.ok(c.reference.texte.length > 100);
  assert.equal(c.motivations.length, 12);
  assert.equal(c.extras.pourquoiExemples.length, 3);
  assert.equal(c.extras.objectifsRdv.length, 3);
  assert.equal(c.extras.gardeFous.length, 4);
  assert.ok(c.extras.noteClinique.includes('bilan orthophonique'));
});
```

- [ ] **Step 10 : lancer tous les tests**

Lancer `npm test`.
Attendu : PASS.

Si `chaque semaine a un échauffement…` échoue, ne pas toucher au test : signaler la semaine fautive dans le rapport, car c'est une incohérence du contenu.

- [ ] **Step 11 : commit**

```bash
git add tools/yaml-subset.mjs tools/import-content.mjs content js/core/content-index.js tests/helpers.mjs tests/yaml-subset.test.mjs tests/content.test.mjs
git commit -m "feat(content): bibliothèque FR importée du rapport, programme 6 semaines" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : Planificateur (`js/core/planner.js`)

**Fichiers :**
- Créer : `js/core/planner.js`
- Test : `tests/planner.test.mjs`

Format d'un pas (`step`), partagé avec l'UI :

```
{ block: 'echauffement'|'articulation'|'ecoute'|'posture'|'jalon'|'rdv',
  kind: 'guide'|'slow'|'record'|'replay'|'listen'|'reformulate'|'reveal'|'objective'|'breathe'|'consigne',
  durationSec, itemId?, title, lines: string[], text?: string|string[]|null, speak?: string|null,
  why?, recordKind?: 'session'|'reference', milestone?, rate?: boolean,
  passage?, reformulation?, detail? }
```

- [ ] **Step 1 : écrire le test qui doit échouer**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTestContent } from './helpers.mjs';
import { programPosition, nextBloc3, buildDailyPlan, buildRdvPlan } from '../js/core/planner.js';

const content = loadTestContent();
const total = (p) => p.steps.reduce((s, x) => s + x.durationSec, 0);
const artId = (p) => p.steps.find((s) => s.block === 'articulation').itemId;

test('programPosition avance par blocs de 5 séances', () => {
  assert.deepEqual(programPosition(1), { cycle: 1, week: 1 });
  assert.deepEqual(programPosition(5), { cycle: 1, week: 1 });
  assert.deepEqual(programPosition(6), { cycle: 1, week: 2 });
  assert.deepEqual(programPosition(30), { cycle: 1, week: 6 });
  assert.deepEqual(programPosition(31), { cycle: 2, week: 1 });
});

test('nextBloc3 alterne', () => {
  assert.equal(nextBloc3(null), 'ecoute');
  assert.equal(nextBloc3('ecoute'), 'posture');
  assert.equal(nextBloc3('posture'), 'ecoute');
});

test('séance du jour : 300 s, échauffement voix + moteur, écoute en premier', () => {
  const p = buildDailyPlan({ content, sessionNumber: 1, dateKey: '2026-10-10' });
  assert.equal(p.type, 'daily');
  assert.equal(total(p), 300);
  const w = p.steps.filter((s) => s.block === 'echauffement');
  assert.deepEqual(w.map((s) => content.byId.get(s.itemId).type), ['voix', 'moteur']);
  assert.equal(p.bloc3, 'ecoute');
  assert.deepEqual(p.steps.filter((s) => s.block === 'articulation').map((s) => s.kind), ['slow', 'record', 'replay']);
  assert.deepEqual(p.steps.filter((s) => s.block === 'ecoute').map((s) => s.kind), ['listen', 'reformulate', 'reveal']);
  assert.equal(p.itemIds.length, 4);
});

test('déterministe', () => {
  const a = buildDailyPlan({ content, sessionNumber: 3, dateKey: '2026-10-12' });
  const b = buildDailyPlan({ content, sessionNumber: 3, dateKey: '2026-10-12' });
  assert.deepEqual(a.itemIds, b.itemIds);
});

test('posture après écoute', () => {
  const p = buildDailyPlan({ content, sessionNumber: 2, dateKey: '2026-10-11', lastBloc3: 'ecoute' });
  assert.equal(p.bloc3, 'posture');
  assert.equal(total(p), 300);
  assert.equal(p.steps.at(-1).kind, 'guide');
  assert.equal(p.steps.at(-1).block, 'posture');
});

test("évite l'articulation de la séance précédente", () => {
  const p1 = buildDailyPlan({ content, sessionNumber: 1, dateKey: '2026-10-10' });
  const p2 = buildDailyPlan({ content, sessionNumber: 2, dateKey: '2026-10-10', history: p1.itemIds });
  assert.notEqual(artId(p1), artId(p2));
});

test('articulation tirée de la semaine du programme', () => {
  const p = buildDailyPlan({ content, sessionNumber: 6, dateKey: '2026-10-10' });
  const ids = content.program.weeks[1].articulation.map((id) => `fr.${id}`);
  assert.ok(ids.includes(artId(p)));
  assert.equal(p.week, 2);
});

test('jour de jalon : texte de référence enregistré, 300 s', () => {
  const p = buildDailyPlan({ content, sessionNumber: 7, dateKey: '2026-10-10', dueMilestone: 7 });
  const rec = p.steps.find((s) => s.kind === 'record');
  assert.equal(rec.recordKind, 'reference');
  assert.equal(rec.milestone, 7);
  assert.equal(rec.itemId, content.reference.id);
  assert.equal(p.milestone, 7);
  assert.equal(total(p), 300);
  assert.equal(p.steps.filter((s) => s.block === 'articulation').length, 0);
});

test('reprise : 2 min, pas de bloc 3', () => {
  const p = buildDailyPlan({ content, sessionNumber: 4, dateKey: '2026-10-10', comeback: true });
  assert.equal(p.type, 'comeback');
  assert.equal(total(p), 120);
  assert.equal(p.bloc3, null);
  assert.deepEqual(p.steps.filter((s) => s.block === 'articulation').map((s) => s.kind), ['record', 'replay']);
});

test('avant RDV : 90 s, consigne différente de la précédente', () => {
  const p = buildRdvPlan({ content, dateKey: '2026-10-10', lastConsigneId: 'fr.C01' });
  assert.equal(p.type, 'prerdv');
  assert.equal(total(p), 90);
  assert.notEqual(p.consigneId, 'fr.C01');
  assert.deepEqual(p.steps.map((s) => s.kind), ['objective', 'breathe', 'consigne']);
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Lancer `node --test tests/planner.test.mjs`.
Attendu : FAIL.

- [ ] **Step 3 : implémenter**

```js
import { pickLeastRecent } from './pick.js';

export const WEEKS_PER_CYCLE = 6;
export const SESSIONS_PER_WEEK = 5;

/** Le programme avance au NOMBRE de séances, jamais au calendrier. n est 1-based. */
export function programPosition(n) {
  const i = Math.max(0, n - 1);
  const perCycle = WEEKS_PER_CYCLE * SESSIONS_PER_WEEK;
  return { cycle: Math.floor(i / perCycle) + 1, week: Math.floor((i % perCycle) / SESSIONS_PER_WEEK) + 1 };
}

export function nextBloc3(last) {
  return last === 'ecoute' ? 'posture' : 'ecoute';
}

const ofBloc = (content, bloc) => content.items.filter((it) => it.bloc === bloc);

function weekItems(content, week, bloc) {
  const w = content.program.weeks.find((x) => x.week === week);
  return w[bloc].map((id) => {
    const it = content.byId.get(`${content.lang}.${id}`);
    if (!it) throw new Error(`Programme : ${id} introuvable`);
    return it;
  });
}

const guide = (block, it, durationSec) => ({
  block, kind: 'guide', durationSec, itemId: it.id, title: it.titre,
  lines: it.consigne, text: it.texte, speak: it.consigne.join(' '), why: it.pourquoi,
});

function articulationSteps(it) {
  return [
    { block: 'articulation', kind: 'slow', durationSec: 30, itemId: it.id, title: it.titre, lines: [it.consigne[0]], text: it.texte, speak: 'Lentement, en exagérant.', why: it.pourquoi },
    { block: 'articulation', kind: 'record', durationSec: 30, itemId: it.id, title: it.titre, lines: ["À vitesse normale. J'enregistre."], text: it.texte, speak: null, recordKind: 'session' },
    { block: 'articulation', kind: 'replay', durationSec: 60, itemId: it.id, title: 'Réécoute', lines: [it.consigne[it.consigne.length - 1]], text: it.texte, speak: null, rate: true },
  ];
}

function referenceSteps(ref, milestone) {
  const title = milestone === 1 ? 'Ta voix de départ' : `Jalon ${milestone}`;
  return [
    { block: 'jalon', kind: 'guide', durationSec: 20, itemId: ref.id, title, lines: ['Même texte que le premier jour.', 'Lis-le une fois dans ta tête.'], text: ref.texte, speak: 'Lis le texte une fois dans ta tête.' },
    { block: 'jalon', kind: 'record', durationSec: 60, itemId: ref.id, title, lines: ["À ton rythme naturel. J'enregistre."], text: ref.texte, speak: null, recordKind: 'reference', milestone },
    { block: 'jalon', kind: 'replay', durationSec: 40, itemId: ref.id, title: 'Réécoute', lines: ['Écoute-toi, sans te juger.'], text: ref.texte, speak: null, rate: false },
  ];
}

function ecouteSteps(it) {
  return [
    { block: 'ecoute', kind: 'listen', durationSec: 50, itemId: it.id, title: it.titre, lines: ['Écoute. Ne prépare pas ta réponse.'], text: null, passage: it.passage, speak: it.passage, why: it.pourquoi },
    { block: 'ecoute', kind: 'reformulate', durationSec: 30, itemId: it.id, title: 'Reformule', lines: [it.consigne[1]], text: null, speak: 'À toi. Reformule à voix haute.' },
    { block: 'ecoute', kind: 'reveal', durationSec: 40, itemId: it.id, title: 'Compare', lines: [], text: null, reformulation: it.reformulationRef, detail: it.detailCache, speak: null },
  ];
}

export function buildDailyPlan({ content, history = [], sessionNumber, dateKey, lastBloc3 = null, dueMilestone = null, comeback = false }) {
  const { cycle, week } = programPosition(sessionNumber);
  const seed = `${dateKey}#${sessionNumber}`;
  const maxWeek = cycle > 1 ? WEEKS_PER_CYCLE : week;
  const warm = ofBloc(content, 'echauffement').filter((e) => e.semaineMin <= maxWeek);
  const voix = pickLeastRecent(warm.filter((e) => e.type === 'voix'), history, `${seed}:voix`);
  const moteur = pickLeastRecent(warm.filter((e) => e.type === 'moteur'), history, `${seed}:moteur`);
  const steps = [guide('echauffement', voix, 30), guide('echauffement', moteur, 30)];
  const itemIds = [voix.id, moteur.id];

  if (dueMilestone) {
    steps.push(...referenceSteps(content.reference, dueMilestone));
  } else {
    const art = pickLeastRecent(weekItems(content, week, 'articulation'), history, `${seed}:art`);
    itemIds.push(art.id);
    const artSteps = articulationSteps(art);
    steps.push(...(comeback
      ? artSteps.slice(1).map((s) => (s.kind === 'replay' ? { ...s, durationSec: 30 } : s))
      : artSteps));
  }

  let bloc3 = null;
  if (!comeback) {
    bloc3 = nextBloc3(lastBloc3);
    const it = pickLeastRecent(weekItems(content, week, bloc3), history, `${seed}:${bloc3}`);
    itemIds.push(it.id);
    steps.push(...(bloc3 === 'ecoute' ? ecouteSteps(it) : [guide('posture', it, 120)]));
  }

  return { type: comeback ? 'comeback' : 'daily', sessionNumber, cycle, week, bloc3, milestone: dueMilestone, itemIds, steps };
}

export function buildRdvPlan({ content, dateKey, lastConsigneId = null }) {
  const pool = content.consignes.filter((c) => c.id !== lastConsigneId);
  const c = pickLeastRecent(pool, [], `${dateKey}:rdv`);
  return {
    type: 'prerdv',
    consigneId: c.id,
    itemIds: [],
    steps: [
      { block: 'rdv', kind: 'objective', durationSec: 30, title: 'Ton objectif', lines: ['À la fin de ce rendez-vous, je veux…'], text: null, speak: 'Ton objectif, en une phrase.' },
      { block: 'rdv', kind: 'breathe', durationSec: 30, title: 'Ancrage', lines: ['Pieds au sol.', 'Trois longues expirations sur « fff ».', 'Épaules basses, mâchoire desserrée.'], text: null, speak: 'Pieds au sol. Trois longues expirations. Épaules basses.' },
      { block: 'rdv', kind: 'consigne', durationSec: 30, title: 'Ta consigne', lines: [c.texte, 'Ta première phrase, lentement.'], text: null, speak: `${c.texte} Puis ta première phrase, lentement.` },
    ],
  };
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Lancer `node --test tests/planner.test.mjs`.
Attendu : PASS.

- [ ] **Step 5 : commit**

```bash
git add js/core/planner.js tests/planner.test.mjs
git commit -m "feat(core): planificateur de séances" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7 : Progression (`js/core/progress.js`)

**Fichiers :**
- Créer : `js/core/progress.js`
- Test : `tests/progress.test.mjs`

Format d'une séance stockée (`session`), utilisé partout :

```
{ id, type: 'daily'|'comeback'|'prerdv', dateKey, startedAt, endedAt, practicedSec, counted, completed,
  sessionNumber, cycle, programWeek, bloc3, milestone, itemIds: [], consigneId, ratings: {},
  recordingIds: [], goal: '', feedback: null|'non'|'une'|'plusieurs', feedbackSkipped? }
```

- [ ] **Step 1 : écrire le test qui doit échouer**

```js
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
  assert.equal(homeStatus(one('2026-10-05'), '2026-10-09').comeback, true);
  assert.equal(homeStatus([], '2026-10-09').daysWithout, null);
  assert.equal(homeStatus([], '2026-10-09').comeback, false);
});

test('pendingFeedback : au moins 1 h après, au plus 3 jours', () => {
  const rdv = S({ id: 'r', type: 'prerdv', dateKey: '2026-10-09', endedAt: 0, feedback: null });
  assert.equal(pendingFeedback([rdv], 0.5 * H), null);
  assert.equal(pendingFeedback([rdv], 2 * H).id, 'r');
  assert.equal(pendingFeedback([{ ...rdv, feedback: 'non' }], 2 * H), null);
  assert.equal(pendingFeedback([{ ...rdv, feedbackSkipped: true }], 2 * H), null);
  assert.equal(pendingFeedback([rdv], 4 * D), null);
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
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Lancer `node --test tests/progress.test.mjs`.
Attendu : FAIL.

- [ ] **Step 3 : implémenter**

```js
import { diffDays, daysInMonth, weekdayMon0, monthKeyPrefix } from './dates.js';

const DAILY_TYPES = ['daily', 'comeback'];
const HOUR = 3600000;
const DAY = 24 * HOUR;
const isCountedSession = (s) => s.counted === true;
const byStartDesc = (a, b) => b.startedAt - a.startedAt;
const pad = (n) => String(n).padStart(2, '0');

export function practicedDayKeys(sessions) {
  return new Set(sessions.filter(isCountedSession).map((s) => s.dateKey));
}

export function dailyCount(sessions) {
  return sessions.filter((s) => isCountedSession(s) && DAILY_TYPES.includes(s.type)).length;
}

export function totalCount(sessions) {
  return sessions.filter(isCountedSession).length;
}

export function monthCount(sessions, year, month) {
  const prefix = monthKeyPrefix(year, month);
  return [...practicedDayKeys(sessions)].filter((k) => k.startsWith(prefix)).length;
}

export function monthGrid(sessions, year, month, todayKey) {
  const counted = sessions.filter(isCountedSession);
  const cells = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const dateKey = `${year}-${pad(month)}-${pad(d)}`;
    const ofDay = counted.filter((s) => s.dateKey === dateKey);
    let kind = 'none';
    if (ofDay.some((s) => DAILY_TYPES.includes(s.type))) kind = 'session';
    else if (ofDay.length) kind = 'rdv';
    else if (dateKey > todayKey) kind = 'future';
    cells.push({ dateKey, day: d, kind, today: dateKey === todayKey });
  }
  return { leading: weekdayMon0(`${year}-${pad(month)}-01`), cells };
}

const FIRST_MILESTONES = [1, 7, 14, 30];

export function milestonesUpTo(n) {
  const out = FIRST_MILESTONES.filter((m) => m <= n);
  for (let m = 60; m <= n; m += 30) out.push(m);
  return out;
}

export function nextMilestone(n) {
  const first = FIRST_MILESTONES.find((m) => m > n);
  return first ?? (Math.floor(n / 30) + 1) * 30;
}

/** Jalon à enregistrer à la séance n : le plus récent atteint, seulement s'il manque. */
export function dueMilestone(nextSessionNumber, recordedMilestones) {
  const m = milestonesUpTo(nextSessionNumber).at(-1);
  return m && !recordedMilestones.includes(m) ? m : null;
}

export function referenceMilestones(recordings) {
  return recordings.filter((r) => r.kind === 'reference' && r.milestone != null).map((r) => r.milestone);
}

export function homeStatus(sessions, todayKey) {
  const keys = [...practicedDayKeys(sessions)].sort();
  const doneToday = keys.includes(todayKey);
  const last = keys.filter((k) => k < todayKey).at(-1) ?? null;
  const daysWithout = doneToday ? 0 : last ? diffDays(last, todayKey) - 1 : null;
  return {
    doneToday,
    daysWithout,
    comeback: daysWithout !== null && daysWithout >= 3,
    yesterdayOff: daysWithout === 1,
  };
}

export function pendingFeedback(sessions, now) {
  return sessions
    .filter((s) => s.type === 'prerdv' && isCountedSession(s) && s.feedback == null && !s.feedbackSkipped
      && now - s.endedAt >= HOUR && now - s.endedAt <= 3 * DAY)
    .sort((a, b) => b.endedAt - a.endedAt)[0] ?? null;
}

export function recentFeedback(sessions, n = 6) {
  return sessions
    .filter((s) => s.type === 'prerdv' && s.feedback)
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(-n)
    .map((s) => s.feedback);
}

export function historyIds(sessions) {
  return [...sessions].sort(byStartDesc).flatMap((s) => s.itemIds ?? []);
}

export function lastBloc3(sessions) {
  return [...sessions].sort(byStartDesc).find((s) => s.bloc3)?.bloc3 ?? null;
}

export function lastConsigneId(sessions) {
  return [...sessions].sort(byStartDesc).find((s) => s.type === 'prerdv' && s.consigneId)?.consigneId ?? null;
}

export function backupDue(lastBackupAt, now, total) {
  return total >= 3 && (!lastBackupAt || now - lastBackupAt > 14 * DAY);
}

export function whyCheckDue(total, lastWhyCheckTotal = 0) {
  return total >= 7 && total - lastWhyCheckTotal >= 7;
}
```

- [ ] **Step 4 : lancer le test et vérifier qu'il passe**

Lancer `node --test tests/progress.test.mjs`.
Attendu : PASS.

- [ ] **Step 5 : commit**

```bash
git add js/core/progress.js tests/progress.test.mjs
git commit -m "feat(core): progression, jalons, état de l'accueil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8 : Textes et rappel (`js/core/texts.js`, `js/core/reminder.js`)

**Fichiers :**
- Créer : `js/core/texts.js`, `js/core/reminder.js`
- Test : `tests/texts.test.mjs`, `tests/reminder.test.mjs`

- [ ] **Step 1 : écrire les tests qui doivent échouer**

`tests/texts.test.mjs` :

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { variant, homeLine, goLabel, goSubtitle, plural, RETOUR, FIN, milestoneMessage } from '../js/core/texts.js';

test('variant boucle, y compris en négatif', () => {
  assert.equal(variant(['a', 'b'], 3), 'b');
  assert.equal(variant(['a', 'b'], -1), 'b');
});

test('homeLine : priorités', () => {
  const base = { doneToday: false, comeback: false, yesterdayOff: false, dueMilestone: null, why: 'Être clair', motivations: ['m0', 'm1'], seed: 1 };
  assert.equal(homeLine({ ...base, doneToday: true }), "C'est fait pour aujourd'hui.");
  assert.ok(RETOUR.includes(homeLine({ ...base, comeback: true })));
  assert.match(homeLine({ ...base, dueMilestone: 7 }), /Jalon 7/);
  assert.match(homeLine({ ...base, yesterdayOff: true }), /Hier, pause/);
  assert.equal(homeLine({ ...base, seed: 3 }), 'Ton pourquoi : « Être clair »');
  assert.equal(homeLine({ ...base, seed: 1 }), 'm1');
});

test('goLabel et goSubtitle', () => {
  assert.equal(goLabel({ doneToday: false, comeback: false }), 'Go · 5 min');
  assert.equal(goLabel({ doneToday: true, comeback: false }), 'Encore une ? · 5 min');
  assert.equal(goLabel({ doneToday: false, comeback: true }), 'Reprendre · 2 min');
  assert.equal(goSubtitle({ comeback: false, dueMilestone: null, bloc3: 'posture' }), "Aujourd'hui : articulation + posture");
  assert.equal(goSubtitle({ comeback: false, dueMilestone: 7, bloc3: 'ecoute' }), "Aujourd'hui : ta voix de référence + écoute");
  assert.equal(goSubtitle({ comeback: true, dueMilestone: null, bloc3: 'ecoute' }), 'Échauffement + une prise');
});

test('plural, FIN, milestoneMessage', () => {
  assert.equal(plural(1, 'jour'), '1 jour');
  assert.equal(plural(3, 'jour'), '3 jours');
  assert.equal(FIN.length, 8);
  assert.match(milestoneMessage(30), /30 séances/);
  assert.match(milestoneMessage(60), /60 séances/);
});
```

`tests/reminder.test.mjs` :

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarUrl, alarmLabel } from '../js/core/reminder.js';

test('calendarUrl : événement quotidien avec lien vers la séance', () => {
  const u = new URL(calendarUrl({ dateKey: '2026-10-10', time: '08:30', why: 'Être clair', appUrl: 'https://x.github.io/ohmaparole/' }));
  assert.equal(u.hostname, 'calendar.google.com');
  assert.equal(u.searchParams.get('action'), 'TEMPLATE');
  assert.equal(u.searchParams.get('dates'), '20261010T083000/20261010T083500');
  assert.equal(u.searchParams.get('recur'), 'RRULE:FREQ=DAILY');
  assert.equal(u.searchParams.get('ctz'), 'Europe/Paris');
  assert.equal(u.searchParams.get('details'), 'https://x.github.io/ohmaparole/#/session/daily');
  assert.equal(u.searchParams.get('text'), 'OhMaParole 5 min, pour : Être clair');
});

test('alarmLabel coupe le pourquoi à 40 caractères', () => {
  const l = alarmLabel('a'.repeat(60));
  assert.ok(l.endsWith('…'));
  assert.equal(l.length, 'OhMaParole 5 min, pour : '.length + 40);
  assert.equal(alarmLabel(''), 'OhMaParole 5 min');
});
```

- [ ] **Step 2 : lancer les tests et vérifier qu'ils échouent**

Lancer `node --test tests/texts.test.mjs tests/reminder.test.mjs`.
Attendu : FAIL.

- [ ] **Step 3 : implémenter `js/core/texts.js`**

```js
export const variant = (list, n) => list[((n % list.length) + list.length) % list.length];
export const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

export const BLOCKS = {
  echauffement: { label: 'Échauffement', tagline: 'Ta voix est prête avant ta première phrase.' },
  articulation: { label: 'Articulation', tagline: 'On te comprend du premier coup.' },
  ecoute: { label: 'Écoute', tagline: 'Ton client se sent entendu.' },
  posture: { label: 'Posture', tagline: 'Tu inspires confiance avant de parler.' },
  jalon: { label: 'Ta voix', tagline: 'Même texte, pour entendre le chemin parcouru.' },
  rdv: { label: 'Avant un RDV', tagline: 'Tu y vas dans 90 secondes.' },
};

export const FIN = [
  'C’est fait. 5 minutes pour toi, et pour tes prochains rendez-vous.',
  'Une de plus. Ta voix s’en souvient, même si toi tu oublies.',
  'Bien joué. Le plus dur, c’était d’appuyer sur Go.',
  'Fait. Tu peux retourner à ta journée.',
  'Ça, c’est une séance qui compte. À demain.',
  'Tu t’es écouté aujourd’hui. Peu de gens le font.',
  'Voilà. Petit, régulier : c’est comme ça que ça bouge.',
  'Merci d’être venu. Rien d’autre à faire.',
];
export const FIN_PARTIELLE = 'Arrêté en route, et ça compte quand même.';

export const RETOUR = [
  'Content de te revoir. On reprend doucement : 2 minutes.',
  'Te revoilà. Rien n’est perdu, tout est là. On y va ?',
  'Les pauses font partie du chemin. 2 minutes pour remettre la voix en route.',
  'Bon retour. Pas de bilan, pas de rattrapage. Juste maintenant.',
];

export const PAS_COMPTE = 'Pas encore compté. Une minute suffit.';

export function homeLine({ doneToday, comeback, yesterdayOff, dueMilestone, why, motivations, seed }) {
  if (doneToday) return "C'est fait pour aujourd'hui.";
  if (comeback) return variant(RETOUR, seed);
  if (dueMilestone) return `Jalon ${dueMilestone} aujourd'hui : tu vas réentendre ta voix du début.`;
  if (yesterdayOff) return "Hier, pause. Aujourd'hui, 1 minute suffit pour que ça compte.";
  if (why && seed % 3 === 0) return `Ton pourquoi : « ${why} »`;
  return variant(motivations, seed);
}

export function goLabel({ doneToday, comeback }) {
  if (comeback) return 'Reprendre · 2 min';
  return doneToday ? 'Encore une ? · 5 min' : 'Go · 5 min';
}

export function goSubtitle({ comeback, dueMilestone, bloc3 }) {
  if (comeback) return dueMilestone ? 'Échauffement + ta voix de référence' : 'Échauffement + une prise';
  const third = bloc3 === 'posture' ? 'posture' : 'écoute';
  return dueMilestone ? `Aujourd'hui : ta voix de référence + ${third}` : `Aujourd'hui : articulation + ${third}`;
}

export function milestoneMessage(m) {
  if (m === 1) return 'Ta voix de départ est enregistrée. Tu la réentendras à la 7ᵉ séance.';
  if (m === 7) return '7 séances. Écoute ta voix du début, puis celle d’aujourd’hui. Si tu n’entends pas encore de différence, c’est normal à ce stade.';
  if (m === 14) return '14 séances. Même texte, deux voix. À toi de juger.';
  if (m === 30) return '30 séances. Un mois de pratique, à ton rythme. Même texte : ce que tu entends, c’est toi qui le dis. Rien n’est noté ici.';
  return `${m} séances. Même texte, deux voix. À toi de juger.`;
}
```

- [ ] **Step 4 : implémenter `js/core/reminder.js`**

```js
const pad = (n) => String(n).padStart(2, '0');

export function alarmLabel(why) {
  const w = (why || '').trim();
  if (!w) return 'OhMaParole 5 min';
  return `OhMaParole 5 min, pour : ${w.length > 40 ? `${w.slice(0, 39)}…` : w}`;
}

/** Lien « ajouter à Google Agenda » d'un événement QUOTIDIEN de 5 min. */
export function calendarUrl({ dateKey, time, why, appUrl }) {
  const [hh, mm] = time.split(':').map(Number);
  const d = dateKey.replaceAll('-', '');
  const endMin = hh * 60 + mm + 5;
  const start = `${d}T${pad(hh)}${pad(mm)}00`;
  const end = `${d}T${pad(Math.floor(endMin / 60) % 24)}${pad(endMin % 60)}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: alarmLabel(why),
    dates: `${start}/${end}`,
    ctz: 'Europe/Paris',
    recur: 'RRULE:FREQ=DAILY',
    details: `${appUrl}#/session/daily`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
```

- [ ] **Step 5 : lancer tous les tests**

Lancer `npm test`.
Attendu : PASS.

- [ ] **Step 6 : commit**

```bash
git add js/core/texts.js js/core/reminder.js tests/texts.test.mjs tests/reminder.test.mjs
git commit -m "feat(core): textes d'interface et lien de rappel Agenda" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9 : Couche données (`js/data/*`)

Ces modules ne sont pas testés automatiquement (IndexedDB). Ils sont vérifiés au smoke test (Task 14).

**Fichiers :**
- Créer : `js/data/db.js`, `js/data/repo.js`, `js/data/content.js`, `js/data/backup.js`

- [ ] **Step 1 : `js/data/db.js`**

```js
const DB_NAME = 'ohmaparole';
const DB_VERSION = 1;
let dbPromise = null;

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = req.result;
        // Migrations UNIQUEMENT additives : if (e.oldVersion < 2) { ... }
        if (e.oldVersion < 1) {
          db.createObjectStore('meta', { keyPath: 'key' });
          db.createObjectStore('sessions', { keyPath: 'id' }).createIndex('dateKey', 'dateKey');
          db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('kind', 'kind');
          db.createObjectStore('audio', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

const asPromise = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const txDone = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

export async function get(store, key) {
  const db = await openDb();
  return asPromise(db.transaction(store).objectStore(store).get(key));
}

export async function getAll(store) {
  const db = await openDb();
  return asPromise(db.transaction(store).objectStore(store).getAll());
}

export async function put(store, value) {
  return putMany(store, [value]);
}

export async function putMany(store, values) {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const v of values) os.put(v);
  return txDone(tx);
}
```

- [ ] **Step 2 : `js/data/repo.js`**

```js
import * as db from './db.js';

export const DEFAULT_SETTINGS = { reminderTime: '08:30', voice: true, vibrate: true };

export async function getMeta(key, fallback = null) {
  const row = await db.get('meta', key);
  return row ? row.value : fallback;
}

export const setMeta = (key, value) => db.put('meta', { key, value });

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(await getMeta('settings', {})) };
}

export const saveSession = (s) => db.put('sessions', s);
export const getSession = (id) => db.get('sessions', id);

export async function listSessions() {
  return (await db.getAll('sessions')).sort((a, b) => a.startedAt - b.startedAt);
}

export async function saveRecording(meta, blob) {
  await db.put('audio', { id: meta.id, blob });
  await db.put('recordings', meta);
}

export async function listRecordings() {
  return (await db.getAll('recordings')).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAudio(id) {
  return (await db.get('audio', id))?.blob ?? null;
}
```

- [ ] **Step 3 : `js/data/content.js`**

```js
import { indexContent } from '../core/content-index.js';

let cached = null;

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Contenu introuvable : ${path}`);
  return res.json();
}

export async function loadContent(lang = 'fr') {
  if (!cached) {
    const [program, exercises, extras] = await Promise.all([
      fetchJson('content/program.json'),
      fetchJson(`content/${lang}/exercises.json`),
      fetchJson(`content/${lang}/extras.json`),
    ]);
    cached = indexContent({ program, exercises, extras });
  }
  return cached;
}
```

- [ ] **Step 4 : `js/data/backup.js`**

```js
import * as db from './db.js';

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function exportAll(appVersion) {
  const [meta, sessions, recordings, audio] = await Promise.all(['meta', 'sessions', 'recordings', 'audio'].map((s) => db.getAll(s)));
  const audioOut = {};
  for (const a of audio) audioOut[a.id] = { mimeType: a.blob.type, base64: await blobToBase64(a.blob) };
  const payload = {
    format: 'ohmaparole-backup',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    data: { meta, sessions, recordings },
    audio: audioOut,
  };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

export async function readBackup(file) {
  const p = JSON.parse(await file.text());
  if (p.format !== 'ohmaparole-backup' || p.formatVersion !== 1) {
    throw new Error("Ce fichier n'est pas une sauvegarde OhMaParole.");
  }
  return p;
}

/** Fusion par id (upsert), aucune suppression. */
export async function importBackup(p) {
  await db.putMany('meta', p.data.meta.filter((m) => m.key !== 'lastBackupAt'));
  await db.putMany('sessions', p.data.sessions);
  await db.putMany('audio', Object.entries(p.audio).map(([id, a]) => ({ id, blob: base64ToBlob(a.base64, a.mimeType) })));
  await db.putMany('recordings', p.data.recordings);
  return { sessions: p.data.sessions.length, recordings: p.data.recordings.length };
}
```

- [ ] **Step 5 : vérifier la syntaxe**

Lancer `for f in js/data/*.js; do node --check "$f" || exit 1; done && echo OK`.
Attendu : `OK`.

- [ ] **Step 6 : commit**

```bash
git add js/data
git commit -m "feat(data): IndexedDB, dépôt, chargement du contenu, sauvegarde" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10 : Audio et plateforme (`js/audio/*`, `js/platform/*`)

**Fichiers :**
- Créer : `js/audio/recorder.js`, `js/audio/player.js`, `js/platform/speech.js`, `js/platform/haptics.js`, `js/platform/wakelock.js`, `js/platform/storage.js`

- [ ] **Step 1 : `js/audio/recorder.js`**

```js
const TYPES = ['audio/webm;codecs=opus', 'audio/mp4;codecs=opus', 'audio/mp4'];

export function pickMimeType() {
  return TYPES.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) ?? '';
}

/**
 * Ouvre le micro et démarre une prise (sans timeslice, pour que Chrome écrive la durée).
 * Retourne { stop(): Promise<{blob, mimeType, durationMs}|null>, cancel() }.
 * Le contrôle automatique de gain est coupé, sinon la comparaison J1/J30 est faussée.
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  });
  const mimeType = pickMimeType();
  const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const release = () => stream.getTracks().forEach((t) => t.stop());
  const startedAt = performance.now();
  rec.start();
  let stopped = false;
  return {
    stop() {
      if (stopped) return Promise.resolve(null);
      stopped = true;
      return new Promise((resolve) => {
        rec.onstop = () => {
          release();
          const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
          resolve({ blob, mimeType: blob.type, durationMs: Math.round(performance.now() - startedAt) });
        };
        rec.stop();
      });
    },
    cancel() {
      if (stopped) return;
      stopped = true;
      rec.onstop = release;
      rec.stop();
    },
  };
}
```

- [ ] **Step 2 : `js/audio/player.js`**

```js
export function createPlayer() {
  let audio = null;
  let url = null;

  function stop() {
    if (audio) {
      audio.onended = null;
      audio.pause();
    }
    if (url) URL.revokeObjectURL(url);
    audio = null;
    url = null;
  }

  function play(blob, onEnded) {
    stop();
    if (!blob) return Promise.resolve();
    url = URL.createObjectURL(blob);
    audio = new Audio(url);
    audio.onended = () => onEnded?.();
    return audio.play().catch(() => {});
  }

  return { play, stop };
}
```

- [ ] **Step 3 : `js/platform/speech.js`**

```js
let enabled = true;

export function setSpeechEnabled(v) {
  enabled = Boolean(v);
}

export function canSpeak() {
  return enabled && 'speechSynthesis' in window;
}

function frenchVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'fr-FR' && /natural|google/i.test(v.name))
    ?? voices.find((v) => v.lang?.startsWith('fr'))
    ?? null;
}

export function speak(text, { onEnd } = {}) {
  if (!text || !canSpeak()) {
    onEnd?.();
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  const v = frenchVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
```

- [ ] **Step 4 : `js/platform/haptics.js`**

```js
let enabled = true;
const PATTERNS = { count: [40], tick: [50], block: [60, 80, 60], start: [120], end: [200, 100, 200, 100, 200] };

export function setHapticsEnabled(v) {
  enabled = Boolean(v);
}

export function buzz(name) {
  if (enabled && navigator.vibrate) navigator.vibrate(PATTERNS[name] ?? [50]);
}
```

- [ ] **Step 5 : `js/platform/wakelock.js`**

```js
let lock = null;
let wanted = false;

async function acquire() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
  } catch {
    lock = null;
  }
}

function onVisibility() {
  if (wanted && document.visibilityState === 'visible') acquire();
}

export async function keepAwake() {
  wanted = true;
  document.addEventListener('visibilitychange', onVisibility);
  await acquire();
}

export function releaseAwake() {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibility);
  lock?.release().catch(() => {});
  lock = null;
}
```

- [ ] **Step 6 : `js/platform/storage.js`**

```js
export async function requestPersist() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageStatus() {
  try {
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    const est = await navigator.storage?.estimate?.();
    return { persisted, usedMb: est ? (est.usage / 1048576).toFixed(1) : '?' };
  } catch {
    return { persisted: false, usedMb: '?' };
  }
}
```

- [ ] **Step 7 : vérifier la syntaxe**

Lancer `for f in js/audio/*.js js/platform/*.js; do node --check "$f" || exit 1; done && echo OK`.
Attendu : `OK`.

- [ ] **Step 8 : commit**

```bash
git add js/audio js/platform
git commit -m "feat: micro, lecture, synthèse vocale, vibrations, écran allumé, stockage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11 : Coque d'interface (HTML, CSS, routeur, démarrage, composants)

**Fichiers :**
- Créer : `index.html`, `css/app.css`, `js/version.js`, `js/ui/dom.js`, `js/router.js`, `js/main.js`, `js/ui/components/timer.js`, `js/ui/components/compare.js`

- [ ] **Step 1 : `index.html`**

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#1D5C6B">
  <title>OhMaParole</title>
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icons/icon-192.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Lexend:wght@400;600&display=swap">
  <link rel="stylesheet" href="css/app.css">
  <script type="module" src="js/main.js"></script>
</head>
<body>
  <main id="app" class="app"><p class="loading">OhMaParole</p></main>
</body>
</html>
```

- [ ] **Step 2 : `css/app.css`**

Palette et typographie : voir `expert-ux.md` §6.

```css
:root {
  --bg: #F7F3EC; --surface: #FFFFFF; --text: #1F2A30; --text-2: #55626A;
  --primary: #1D5C6B; --on-primary: #FFFFFF; --accent: #E3A72F; --on-accent: #1F2A30;
  --accent-text: #8A6A1F; --rec: #B4441C; --on-rec: #FFFFFF; --border: #DDD5C8;
  --font-title: 'Lexend', system-ui, sans-serif;
  --font-body: 'Atkinson Hyperlegible', system-ui, sans-serif;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #12191D; --surface: #1C252A; --text: #ECE7DF; --text-2: #A9B4BA;
    --primary: #5FB3C4; --on-primary: #0E1A1E; --accent: #F0BC4E; --on-accent: #12191D;
    --accent-text: #F0BC4E; --rec: #F27A4F; --on-rec: #12191D; --border: #2C373D;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body { background: var(--bg); color: var(--text); font: 18px/1.5 var(--font-body); -webkit-tap-highlight-color: transparent; }
.app { max-width: 520px; margin: 0 auto; min-height: 100dvh; padding: 16px 16px calc(16px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; }
h1, h2, .btn, .ready-title, .big-count, .timer-label, .step-title, .block-label { font-family: var(--font-title); }
h1 { font-size: 28px; line-height: 1.25; margin: 8px 0 16px; }
h2 { font-size: 22px; margin: 0 0 8px; }
a { color: var(--primary); }
.muted { color: var(--text-2); }
.label { display: block; font-size: 15px; font-weight: 700; color: var(--text-2); margin: 16px 0 4px; }
.loading { margin: auto; font-family: var(--font-title); font-size: 28px; color: var(--text-2); }

/* Boutons */
.btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 80px; width: 100%; border: 0; border-radius: 20px; font-size: 22px; font-weight: 600; text-decoration: none; cursor: pointer; padding: 12px 16px; }
.btn small { font-family: var(--font-body); font-size: 15px; font-weight: 400; }
.btn-go { background: var(--primary); color: var(--on-primary); }
.btn-rdv { background: var(--accent); color: var(--on-accent); }
.btn-rec { background: var(--rec); color: var(--on-rec); }
.btn-secondary { display: flex; align-items: center; justify-content: center; min-height: 56px; width: 100%; margin: 8px 0; border: 2px solid var(--primary); border-radius: 16px; background: transparent; color: var(--primary); font: 600 18px var(--font-title); text-decoration: none; cursor: pointer; }
.btn-small { min-height: 56px; min-width: 56px; flex: 1; border: 2px solid var(--primary); border-radius: 14px; background: var(--surface); color: var(--text); font: 600 17px var(--font-title); cursor: pointer; }
.btn-link { min-height: 56px; width: 100%; border: 0; background: none; color: var(--text-2); font: 16px var(--font-body); text-decoration: underline; cursor: pointer; }
.row { display: flex; gap: 16px; margin: 8px 0; }
.stack { display: flex; flex-direction: column; gap: 8px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 16px; margin: 12px 0; }
.field { width: 100%; min-height: 56px; padding: 12px; border: 2px solid var(--border); border-radius: 14px; background: var(--surface); color: var(--text); font: 18px var(--font-body); }
textarea.field { min-height: 96px; resize: vertical; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.chip { min-height: 44px; padding: 8px 14px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--text); font: 15px var(--font-body); cursor: pointer; text-align: left; }
.why { font-style: italic; }
.say { font-size: 25px; line-height: 1.45; margin: 12px 0; }
.say.small { font-size: 19px; }
.say-list { font-size: 21px; padding-left: 20px; }
.lines { font-size: 21px; padding-left: 24px; }
.lines li { margin: 6px 0; }
.check { display: flex; align-items: center; gap: 12px; min-height: 56px; font-size: 18px; }
.check input { width: 28px; height: 28px; }
.back { display: inline-flex; min-height: 56px; align-items: center; text-decoration: none; font-size: 18px; }

/* Accueil */
.home { display: flex; flex-direction: column; flex: 1; }
.top { display: flex; justify-content: space-between; align-items: center; }
.count { font: 600 20px var(--font-title); text-decoration: none; color: var(--text); }
.gear { font-size: 26px; text-decoration: none; color: var(--text-2); min-width: 56px; min-height: 56px; display: flex; align-items: center; justify-content: flex-end; }
.context { font-size: 20px; margin: 24px 0 8px; }
.backup-line { display: block; margin: 8px 0; color: var(--accent-text); }
.actions { margin-top: auto; display: flex; flex-direction: column; gap: 16px; padding-top: 24px; }

/* Séance */
.ready { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 12px; cursor: pointer; }
.ready-title { font-size: 40px; margin: 0; }
.ready-count { font: 600 72px var(--font-title); margin: 0; color: var(--primary); }
.session-head { text-align: center; }
.segments { display: flex; gap: 6px; justify-content: center; margin: 4px 0 8px; }
.seg { height: 6px; flex: 1; max-width: 80px; border-radius: 3px; background: var(--border); }
.seg.done { background: var(--primary); opacity: .5; }
.seg.on { background: var(--primary); }
.block-label { font-size: 24px; font-weight: 600; margin: 0; }
.block-tagline { font-size: 15px; color: var(--text-2); margin: 0; }
.timer { position: relative; width: 168px; height: 168px; margin: 12px auto; }
.ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: var(--border); stroke-width: 8; }
.ring-fg { fill: none; stroke: var(--primary); stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset .25s linear; }
.timer-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 44px; font-variant-numeric: tabular-nums; }
.stage { flex: 1; }
.step-title { font-size: 22px; margin: 8px 0; }
.rec { display: flex; align-items: center; gap: 10px; font: 600 20px var(--font-title); color: var(--rec); }
.rec-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--rec); animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: .3; } }
.breath { width: 120px; height: 120px; margin: 16px auto; border-radius: 50%; background: var(--primary); opacity: .8; animation: breath 10s ease-in-out infinite; }
@keyframes breath { 0%, 100% { transform: scale(.6); } 40% { transform: scale(1); } }
.session-foot { padding-top: 12px; }
.btn-pause { width: 100%; min-height: 72px; border: 2px solid var(--border); border-radius: 20px; background: var(--surface); color: var(--text); font: 600 20px var(--font-title); cursor: pointer; }
.overlay { position: fixed; inset: 0; background: rgb(0 0 0 / .55); display: flex; align-items: flex-end; justify-content: center; padding: 16px; }
.overlay[hidden] { display: none; }
.overlay-box { width: 100%; max-width: 520px; background: var(--bg); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.overlay-title { font: 600 22px var(--font-title); text-align: center; margin: 0 0 8px; }
.rating p { margin: 16px 0 4px; font-weight: 700; }

/* Fin de séance */
.end { flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.dot-fill { width: 72px; height: 72px; margin: 0 auto 8px; border-radius: 50%; border: 4px solid var(--primary); animation: fill .6s ease-out .2s forwards; }
@keyframes fill { to { background: var(--primary); } }
.end-msg { font: 600 24px/1.35 var(--font-title); text-align: center; }
.milestone { font-size: 19px; }
.reveal { font-weight: 700; }

/* Progression */
.big-count { font-size: 72px; font-weight: 600; margin: 0; line-height: 1; color: var(--primary); }
.cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 20px 0; }
.cal-head { text-align: center; font-size: 14px; color: var(--text-2); }
.cal-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 14px; border: 2px solid var(--border); color: var(--text-2); }
.cal-cell.session { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.cal-cell.rdv { background: var(--accent); border-color: var(--text); color: var(--on-accent); border-radius: 6px; }
.cal-cell.future { border-color: transparent; }
.cal-cell.today { outline: 3px solid var(--text); outline-offset: 2px; }
.frise, .fb { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; }
.frise li, .fb li { padding: 6px 12px; border-radius: 999px; border: 2px solid var(--border); }
.frise li.done { background: var(--primary); color: var(--on-primary); border-color: var(--primary); }
.frise li.upcoming { border-style: dashed; }
.fb li.fb-non { border-color: var(--primary); }

/* Premier lancement et réglages */
.onb { display: flex; flex-direction: column; flex: 1; gap: 8px; }
.onb-step { color: var(--text-2); font-size: 15px; margin: 0; }
.onb > .btn-go { margin-top: auto; }
.settings section { margin: 24px 0; }
```

- [ ] **Step 3 : `js/version.js`**

```js
export const APP_VERSION = '2026.10.09-0000';
```

- [ ] **Step 4 : `js/ui/dom.js`**

```js
/** h('button', { class: 'x', onclick: fn }, 'texte', autreNoeud, [liste]) */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
```

- [ ] **Step 5 : `js/router.js`**

```js
const routes = {};
let baseCtx = {};
let cleanup = null;
let renderToken = 0;

export function defineRoutes(map, ctx) {
  Object.assign(routes, map);
  baseCtx = ctx;
}

export function navigate(path) {
  if (location.hash === `#${path}`) render();
  else location.hash = path;
}

async function render() {
  const token = ++renderToken;
  const [name = 'home', ...params] = (location.hash.slice(2) || 'home').split('/');
  const screen = routes[name] ?? routes.home;
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  const root = document.getElementById('app');
  root.replaceChildren();
  window.scrollTo(0, 0);
  const result = await screen.render(root, { ...baseCtx, params, navigate });
  if (typeof result !== 'function') return;
  if (token === renderToken) cleanup = result;
  else result();
}

export function startRouter() {
  addEventListener('hashchange', render);
  render();
}
```

- [ ] **Step 6 : `js/main.js`**

```js
import { defineRoutes, startRouter } from './router.js';
import * as repo from './data/repo.js';
import { loadContent } from './data/content.js';
import { setSpeechEnabled } from './platform/speech.js';
import { setHapticsEnabled } from './platform/haptics.js';
import { requestPersist } from './platform/storage.js';
import * as onboarding from './ui/screens/onboarding.js';
import * as home from './ui/screens/home.js';
import * as session from './ui/screens/session.js';
import * as end from './ui/screens/end.js';
import * as progress from './ui/screens/progress.js';
import * as settings from './ui/screens/settings.js';

const inSession = () => location.hash.startsWith('#/session');

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || inSession()) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // Mise à jour appliquée au démarrage, jamais pendant une séance.
    if (reg.waiting && !inSession()) reg.waiting.postMessage('SKIP_WAITING');
  }).catch(() => {});
}

async function boot() {
  registerServiceWorker();
  const content = await loadContent('fr');
  const prefs = await repo.getSettings();
  setSpeechEnabled(prefs.voice);
  setHapticsEnabled(prefs.vibrate);
  defineRoutes({ onboarding, home, session, end, progress, settings }, { repo, content });
  if (!(await repo.getMeta('onboarded', false)) && !location.hash.startsWith('#/onboarding')) {
    history.replaceState(null, '', '#/onboarding');
  }
  startRouter();
  if (await repo.getMeta('persistAsked', false)) requestPersist();
}

boot().catch((err) => {
  document.getElementById('app').textContent = `OhMaParole n'a pas pu démarrer : ${err.message}`;
});
```

- [ ] **Step 7 : `js/ui/components/timer.js`**

```js
import { h } from '../dom.js';

const R = 54;
const C = 2 * Math.PI * R;
const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...children);
  return el;
}

export function createTimer() {
  const arc = svg('circle', { cx: 60, cy: 60, r: R, class: 'ring-fg', 'stroke-dasharray': C, 'stroke-dashoffset': 0 });
  const ring = svg('svg', { viewBox: '0 0 120 120', class: 'ring', 'aria-hidden': 'true' }, svg('circle', { cx: 60, cy: 60, r: R, class: 'ring-bg' }), arc);
  const label = h('div', { class: 'timer-label' }, '0:00');
  return {
    el: h('div', { class: 'timer' }, ring, label),
    update(remainingMs, totalMs) {
      const s = Math.ceil(remainingMs / 1000);
      label.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      arc.setAttribute('stroke-dashoffset', String(C * (1 - (totalMs ? remainingMs / totalMs : 0))));
    },
  };
}
```

- [ ] **Step 8 : `js/ui/components/compare.js`**

```js
import { h } from '../dom.js';
import { createPlayer } from '../../audio/player.js';

const secs = (r) => `${Math.round(r.durationMs / 1000)} s`;

/** Écoute A/B à l'aveugle de deux lectures du MÊME texte. Retourne null si un audio manque. */
export async function createCompare({ repo, a, b, labelA, labelB }) {
  const [blobA, blobB] = await Promise.all([repo.getAudio(a.id), repo.getAudio(b.id)]);
  if (!blobA || !blobB) return null;
  const flip = Math.random() < 0.5;
  const one = { rec: a, blob: blobA, label: labelA };
  const two = { rec: b, blob: blobB, label: labelB };
  const [first, second] = flip ? [two, one] : [one, two];
  const player = createPlayer();
  const result = h('p', { class: 'reveal' });
  const choices = h('div', { class: 'row' },
    h('button', { class: 'btn-small', onclick: () => reveal(first) }, 'A'),
    h('button', { class: 'btn-small', onclick: () => reveal(second) }, 'B'));
  function reveal(chosen) {
    choices.remove();
    result.textContent = `A = ${first.label} (${secs(first.rec)}) · B = ${second.label} (${secs(second.rec)}). Tu as choisi ${chosen.label}.`;
  }
  const el = h('div', { class: 'card' },
    h('p', {}, 'Même texte, deux voix, ordre au hasard.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn-small', onclick: () => player.play(first.blob) }, '▶ Écouter A'),
      h('button', { class: 'btn-small', onclick: () => player.play(second.blob) }, '▶ Écouter B')),
    h('p', {}, 'Laquelle est la plus claire ?'),
    choices,
    result);
  return { el, destroy: () => player.stop() };
}
```

- [ ] **Step 9 : vérifier la syntaxe**

Lancer `for f in js/*.js js/ui/*.js js/ui/components/*.js; do node --check "$f" || exit 1; done && echo OK`.
Attendu : `OK`.

- [ ] **Step 10 : commit**

```bash
git add index.html css js/version.js js/ui/dom.js js/router.js js/main.js js/ui/components
git commit -m "feat(ui): coque HTML/CSS, routeur, démarrage, minuteur, comparaison A/B" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12 : Écrans de premier lancement et d'accueil

**Fichiers :**
- Créer : `js/ui/screens/onboarding.js`, `js/ui/screens/home.js`

- [ ] **Step 1 : `js/ui/screens/onboarding.js`**

```js
import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { calendarUrl, alarmLabel } from '../../core/reminder.js';
import { startRecording } from '../../audio/recorder.js';
import { createPlayer } from '../../audio/player.js';
import { buzz } from '../../platform/haptics.js';

export async function render(root, { repo, content, navigate }) {
  const state = {
    step: 1,
    objective: await repo.getMeta('objective', content.extras.objectifDefaut),
    why: await repo.getMeta('why', ''),
    retried: false,
    take: null,
    recorder: null,
  };
  const player = createPlayer();
  const show = (...nodes) => root.replaceChildren(h('div', { class: 'onb' }, h('p', { class: 'onb-step' }, `${state.step} / 4`), ...nodes));

  function step1() {
    state.step = 1;
    show(
      h('h1', {}, '5 minutes par jour. Pas plus.'),
      h('p', {}, 'Tu parles, tu t’écoutes, tu avances.'),
      h('p', {}, 'Un jour raté ne casse rien. Une seule règle : jamais deux jours d’affilée sans.'),
      h('p', { class: 'muted' }, 'On commence par 3 réglages, moins de 2 minutes.'),
      h('button', { class: 'btn btn-go', onclick: step2 }, 'Commencer'),
    );
  }

  function step2() {
    state.step = 2;
    const obj = h('input', { class: 'field', type: 'text', value: state.objective });
    const why = h('textarea', { class: 'field', rows: 3, placeholder: 'En une phrase, avec tes mots.' });
    why.value = state.why;
    show(
      h('h1', {}, 'Pourquoi tu fais ça ?'),
      h('label', { class: 'label' }, 'Ton objectif'), obj,
      h('label', { class: 'label' }, 'Pourquoi c’est important pour toi ?'), why,
      h('div', { class: 'chips' }, content.extras.pourquoiExemples.map((x) => h('button', { class: 'chip', onclick: () => { why.value = x; } }, x))),
      h('button', {
        class: 'btn btn-go',
        onclick: async () => {
          state.objective = obj.value.trim() || content.extras.objectifDefaut;
          state.why = why.value.trim() || state.objective;
          await repo.setMeta('objective', state.objective);
          await repo.setMeta('why', state.why);
          step3();
        },
      }, 'C’est mon pourquoi'),
    );
  }

  function step3() {
    state.step = 3;
    const status = h('p', { class: 'muted' }, 'Ta voix reste sur ton téléphone.');
    const actions = h('div', { class: 'stack' });
    const idle = () => actions.replaceChildren(
      h('button', { class: 'btn btn-go', onclick: rec }, '● Enregistrer'),
      h('button', { class: 'btn-link', onclick: step4 }, 'Plus tard'),
    );
    async function rec() {
      try {
        state.recorder = await startRecording();
      } catch {
        status.textContent = 'Sans micro, pas d’enregistrement. Tu peux l’autoriser dans les réglages du téléphone. Le reste marche quand même.';
        return;
      }
      buzz('start');
      status.textContent = 'J’enregistre… Lis le texte à ton rythme.';
      actions.replaceChildren(h('button', { class: 'btn btn-rec', onclick: stopRec }, '■ J’ai fini'));
    }
    async function stopRec() {
      const res = await state.recorder.stop();
      state.recorder = null;
      if (!res || !res.blob.size) { status.textContent = 'La prise est vide. On recommence ?'; idle(); return; }
      state.take = res;
      status.textContent = 'Réécoute.';
      player.play(res.blob);
      actions.replaceChildren(
        h('button', { class: 'btn btn-go', onclick: keep }, 'Garder cette prise'),
        h('button', { class: 'btn-secondary', onclick: () => player.play(res.blob) }, '▶ Réécouter'),
        state.retried ? null : h('button', {
          class: 'btn-link',
          onclick: () => { state.retried = true; player.stop(); status.textContent = 'Une dernière fois, tranquillement.'; idle(); },
        }, 'Recommencer'),
      );
    }
    async function keep() {
      player.stop();
      const res = state.take;
      const now = Date.now();
      await repo.saveRecording({
        id: crypto.randomUUID(), createdAt: now, dateKey: dayKey(now), kind: 'reference', milestone: 1,
        itemId: content.reference.id, sessionId: null, mimeType: res.mimeType, durationMs: res.durationMs, sizeBytes: res.blob.size,
      }, res.blob);
      step4();
    }
    show(
      h('h1', {}, 'Ta voix d’aujourd’hui'),
      h('p', {}, 'Lis ce texte à voix haute. Tu le réentendras dans 7, 14 et 30 séances.'),
      h('p', { class: 'say' }, content.reference.texte),
      status,
      actions,
    );
    idle();
  }

  async function step4() {
    state.step = 4;
    player.stop();
    const prefs = await repo.getSettings();
    const time = h('input', { class: 'field', type: 'time', value: prefs.reminderTime });
    const note = h('p', { class: 'muted' });
    const appUrl = location.origin + location.pathname;
    show(
      h('h1', {}, 'À quelle heure on se retrouve ?'),
      time,
      h('p', {}, 'Un rappel chaque jour dans ton agenda, avec ton pourquoi.'),
      h('a', {
        class: 'btn-secondary', href: '#', target: '_blank', rel: 'noopener',
        onclick: (e) => { e.currentTarget.href = calendarUrl({ dateKey: dayKey(Date.now()), time: time.value || '08:30', why: state.why, appUrl }); },
      }, 'Créer le rappel dans Google Agenda'),
      h('button', {
        class: 'btn-link',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(alarmLabel(state.why));
            note.textContent = 'Copié. Colle-le comme nom d’une alarme quotidienne dans l’Horloge.';
          } catch {
            note.textContent = alarmLabel(state.why);
          }
        },
      }, 'Ou : copier le nom pour une alarme'),
      note,
      h('p', { class: 'muted' }, 'Astuce : un appui long sur l’icône OhMaParole lance directement la séance.'),
      h('button', {
        class: 'btn btn-go',
        onclick: async () => {
          await repo.setMeta('settings', { ...prefs, reminderTime: time.value || '08:30' });
          await repo.setMeta('onboarded', true);
          navigate('/home');
        },
      }, 'C’est parti'),
    );
  }

  step1();
  return () => {
    player.stop();
    state.recorder?.cancel();
  };
}
```

- [ ] **Step 2 : `js/ui/screens/home.js`**

```js
import { h } from '../dom.js';
import { dayKey, diffDays } from '../../core/dates.js';
import {
  homeStatus, monthCount, dailyCount, totalCount, dueMilestone, referenceMilestones,
  pendingFeedback, backupDue, whyCheckDue, lastBloc3,
} from '../../core/progress.js';
import { nextBloc3 } from '../../core/planner.js';
import { homeLine, goLabel, goSubtitle, plural } from '../../core/texts.js';

const FEEDBACK = [['non', 'Non'], ['une', 'Une fois'], ['plusieurs', 'Plusieurs fois']];

export async function render(root, { repo, content, navigate }) {
  const now = Date.now();
  const today = dayKey(now);
  const [y, m] = today.split('-').map(Number);
  const [sessions, recordings, why, lastBackupAt, lastWhyCheck] = await Promise.all([
    repo.listSessions(), repo.listRecordings(), repo.getMeta('why', ''),
    repo.getMeta('lastBackupAt', null), repo.getMeta('lastWhyCheck', 0),
  ]);
  const status = homeStatus(sessions, today);
  const due = dueMilestone(dailyCount(sessions) + 1, referenceMilestones(recordings));
  const total = totalCount(sessions);
  const seed = diffDays('2026-01-01', today);

  let card = null;
  const fb = pendingFeedback(sessions, now);
  if (fb) {
    card = h('div', { class: 'card' },
      h('p', {}, 'Ton dernier rendez-vous : on t’a fait répéter ?'),
      h('div', { class: 'row' }, FEEDBACK.map(([v, label]) => h('button', {
        class: 'btn-small',
        onclick: async () => { await repo.saveSession({ ...fb, feedback: v }); navigate('/home'); },
      }, label))),
      h('button', { class: 'btn-link', onclick: async () => { await repo.saveSession({ ...fb, feedbackSkipped: true }); navigate('/home'); } }, 'Passer'));
  } else if (why && whyCheckDue(total, lastWhyCheck)) {
    card = h('div', { class: 'card' },
      h('p', {}, 'Ton pourquoi tient toujours ?'),
      h('p', { class: 'why' }, `« ${why} »`),
      h('div', { class: 'row' },
        h('button', { class: 'btn-small', onclick: async () => { await repo.setMeta('lastWhyCheck', total); navigate('/home'); } }, 'Oui'),
        h('button', { class: 'btn-small', onclick: async () => { await repo.setMeta('lastWhyCheck', total); navigate('/settings'); } }, 'Je le reformule')));
  }

  root.replaceChildren(h('div', { class: 'home' },
    h('header', { class: 'top' },
      h('a', { class: 'count', href: '#/progress' }, `${plural(monthCount(sessions, y, m), 'jour')} ce mois-ci ›`),
      h('a', { class: 'gear', href: '#/settings', 'aria-label': 'Réglages' }, '⚙')),
    h('p', { class: 'context' }, homeLine({ ...status, dueMilestone: due, why, motivations: content.motivations, seed })),
    card,
    backupDue(lastBackupAt, now, total) ? h('a', { class: 'backup-line', href: '#/settings' }, 'Pense à sauvegarder tes données ›') : null,
    h('div', { class: 'actions' },
      h('a', { class: 'btn btn-go', href: '#/session/daily' },
        h('span', {}, goLabel(status)),
        h('small', {}, goSubtitle({ comeback: status.comeback, dueMilestone: due, bloc3: nextBloc3(lastBloc3(sessions)) }))),
      h('a', { class: 'btn btn-rdv', href: '#/session/prerdv' }, 'Avant un rendez-vous · 90 s'))));
}
```

- [ ] **Step 3 : vérifier la syntaxe**

Lancer `node --check js/ui/screens/onboarding.js && node --check js/ui/screens/home.js && echo OK`.
Attendu : `OK`.

- [ ] **Step 4 : commit**

```bash
git add js/ui/screens/onboarding.js js/ui/screens/home.js
git commit -m "feat(ui): premier lancement et accueil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13 : Écran de séance (`js/ui/screens/session.js`)

**Fichiers :**
- Créer : `js/ui/screens/session.js`

- [ ] **Step 1 : implémenter**

```js
import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { buildDailyPlan, buildRdvPlan } from '../../core/planner.js';
import {
  createRun, tick, next, pause, resume, skipBlock, stop, currentStep,
  remainingMs, practicedMs, isCounted, pausedForMs,
} from '../../core/session-engine.js';
import {
  homeStatus, dailyCount, dueMilestone, referenceMilestones, historyIds, lastBloc3, lastConsigneId,
} from '../../core/progress.js';
import { BLOCKS, PAS_COMPTE } from '../../core/texts.js';
import { createTimer } from '../components/timer.js';
import { startRecording } from '../../audio/recorder.js';
import { createPlayer } from '../../audio/player.js';
import { speak, stopSpeaking, canSpeak } from '../../platform/speech.js';
import { buzz } from '../../platform/haptics.js';
import { keepAwake, releaseAwake } from '../../platform/wakelock.js';
import { requestPersist } from '../../platform/storage.js';

const AUTO_CLOSE_MS = 30 * 60 * 1000;

function rating(question, options, onPick) {
  return h('div', { class: 'rating' },
    h('p', {}, question),
    h('div', { class: 'row' }, options.map(([v, label]) => h('button', { class: 'btn-small', onclick: () => onPick(v) }, label))));
}

export async function render(root, { repo, content, navigate, params }) {
  const kind = params[0] === 'prerdv' ? 'prerdv' : 'daily';
  const t0 = Date.now();
  const today = dayKey(t0);
  const [sessions, recordings, why] = await Promise.all([repo.listSessions(), repo.listRecordings(), repo.getMeta('why', '')]);

  let plan;
  if (kind === 'prerdv') {
    plan = buildRdvPlan({ content, dateKey: today, lastConsigneId: lastConsigneId(sessions) });
  } else {
    const n = dailyCount(sessions) + 1;
    plan = buildDailyPlan({
      content, history: historyIds(sessions), sessionNumber: n, dateKey: today, lastBloc3: lastBloc3(sessions),
      dueMilestone: dueMilestone(n, referenceMilestones(recordings)), comeback: homeStatus(sessions, today).comeback,
    });
  }

  const record = {
    id: crypto.randomUUID(), type: plan.type, dateKey: today, startedAt: t0, endedAt: t0,
    practicedSec: 0, counted: false, completed: false,
    sessionNumber: plan.sessionNumber ?? null, cycle: plan.cycle ?? null, programWeek: plan.week ?? null,
    bloc3: plan.bloc3 ?? null, milestone: plan.milestone ?? null, itemIds: plan.itemIds,
    consigneId: plan.consigneId ?? null, ratings: {}, recordingIds: [], goal: '', feedback: null,
  };

  let run = null;
  let loopTimer = null;
  let countdown = null;
  let shownIndex = -1;
  let finished = false;
  let stoppedEarly = false;
  let takeStarting = null;
  let takeStep = null;
  let lastTake = Promise.resolve(null);
  let goalInput = null;

  const player = createPlayer();
  const timer = createTimer();
  const header = h('header', { class: 'session-head' });
  const stage = h('section', { class: 'stage' });
  const overlay = h('div', { class: 'overlay', hidden: true });
  const blocks = [...new Set(plan.steps.map((s) => s.block))];

  const showOverlay = (...nodes) => { overlay.replaceChildren(h('div', { class: 'overlay-box' }, nodes)); overlay.hidden = false; };
  const hideOverlay = () => { overlay.hidden = true; };

  async function save() {
    const now = Date.now();
    const ms = run ? practicedMs(run, now) : 0;
    record.practicedSec = Math.round(ms / 1000);
    record.counted = isCounted(ms);
    record.endedAt = now;
    if (ms > 0) await repo.saveSession(structuredClone(record));
  }

  function beginTake(st) {
    takeStep = st;
    takeStarting = startRecording().catch(() => null);
  }

  function endTake() {
    const starting = takeStarting;
    const st = takeStep;
    takeStarting = null;
    if (!starting) return;
    lastTake = (async () => {
      const rec = await starting;
      if (!rec) return null;
      const res = await rec.stop();
      if (!res || !res.blob.size) return null;
      const meta = {
        id: crypto.randomUUID(), createdAt: Date.now(), dateKey: today, kind: st.recordKind,
        milestone: st.milestone ?? null, itemId: st.itemId, sessionId: record.id,
        mimeType: res.mimeType, durationMs: res.durationMs, sizeBytes: res.blob.size,
      };
      await repo.saveRecording(meta, res.blob);
      record.recordingIds.push(meta.id);
      return { meta, blob: res.blob };
    })();
  }

  function renderHeader(st) {
    const b = BLOCKS[st.block];
    const idx = blocks.indexOf(st.block);
    header.replaceChildren(
      h('div', { class: 'segments' }, blocks.map((_, i) => h('span', { class: i < idx ? 'seg done' : i === idx ? 'seg on' : 'seg' }))),
      h('p', { class: 'block-label' }, b.label),
      h('p', { class: 'block-tagline' }, b.tagline));
  }

  function enterStep(st) {
    const myIndex = run.index;
    const title = h('h2', { class: 'step-title' }, st.title);
    const lines = st.lines?.length ? h('ol', { class: 'lines' }, st.lines.map((l) => h('li', {}, l))) : null;
    const text = st.text == null ? null
      : Array.isArray(st.text) ? h('ul', { class: 'say-list' }, st.text.map((t) => h('li', {}, t)))
        : h('p', { class: 'say' }, st.text);
    const advance = () => { if (run.index === myIndex && run.status === 'running') apply(next(run, Date.now())); };
    stage.replaceChildren();

    switch (st.kind) {
      case 'guide':
      case 'slow':
      case 'reformulate':
      case 'consigne':
        stage.append(title, lines, text);
        speak(st.speak);
        break;
      case 'breathe':
        stage.append(title, h('div', { class: 'breath' }), lines);
        speak(st.speak);
        break;
      case 'record':
        stopSpeaking();
        stage.append(
          h('p', { class: 'rec' }, h('span', { class: 'rec-dot' }), 'J’enregistre'),
          lines, text,
          h('button', { class: 'btn-secondary', onclick: advance }, 'J’ai fini'));
        buzz('start');
        beginTake(st);
        break;
      case 'replay': {
        const status = h('p', { class: 'muted' }, 'Réécoute…');
        stage.append(title, lines, status);
        lastTake.then((take) => {
          if (run.index !== myIndex) return;
          if (!take) { status.textContent = 'Pas d’enregistrement cette fois. Redis la phrase une fois, tranquillement.'; return; }
          status.textContent = 'Ta prise :';
          player.play(take.blob);
          status.after(h('button', { class: 'btn-secondary', onclick: () => player.play(take.blob) }, '▶ Réécouter'));
        });
        if (st.rate) {
          stage.append(rating('Ta prise ?', [['clair', 'Clair'], ['moyen', 'Moyen'], ['brouillon', 'Brouillon']], (v) => {
            record.ratings[st.itemId] = v;
            advance();
          }));
        }
        break;
      }
      case 'listen':
        stage.append(title, lines);
        if (canSpeak()) {
          stage.append(h('p', { class: 'muted' }, 'Le téléphone lit. Le texte reste caché.'));
          speak(st.passage, { onEnd: advance });
        } else {
          stage.append(
            h('p', { class: 'muted' }, 'Lis une seule fois. Le texte disparaît ensuite.'),
            h('p', { class: 'say small' }, st.passage),
            h('button', { class: 'btn-secondary', onclick: advance }, 'Suivant'));
        }
        break;
      case 'reveal':
        stage.append(
          title,
          h('p', { class: 'label' }, 'Reformulation de référence'),
          h('p', { class: 'say small' }, st.reformulation),
          h('p', { class: 'label' }, 'Le détail caché'),
          h('p', {}, st.detail),
          rating('Repéré ?', [['oui', 'Oui'], ['non', 'Non']], (v) => { record.ratings[st.itemId] = v; advance(); }));
        break;
      case 'objective':
        goalInput = h('input', { class: 'field', type: 'text', placeholder: 'À la fin de ce rendez-vous, je veux…', value: record.goal });
        stage.append(
          title, goalInput,
          h('div', { class: 'chips' }, content.extras.objectifsRdv.map((x) => h('button', { class: 'chip', onclick: () => { goalInput.value = x; } }, x))),
          h('button', { class: 'btn-secondary', onclick: advance }, 'Valider'));
        speak(st.speak);
        break;
      default:
        stage.append(title, lines, text);
    }
  }

  function exitStep(st) {
    stopSpeaking();
    player.stop();
    if (st.kind === 'record') endTake();
    if (st.kind === 'objective' && goalInput) record.goal = goalInput.value.trim();
  }

  function onStep() {
    const prev = shownIndex >= 0 ? plan.steps[shownIndex] : null;
    if (prev) exitStep(prev);
    shownIndex = run.index;
    const st = currentStep(run);
    if (prev) buzz(prev.block !== st.block ? 'block' : 'tick');
    renderHeader(st);
    enterStep(st);
    save();
  }

  function apply(r) {
    if (finished) return;
    run = r;
    if (run.status === 'done') { finish(); return; }
    if (run.index !== shownIndex) onStep();
  }

  function loop() {
    if (!run || finished) return;
    apply(tick(run, Date.now()));
    if (finished) return;
    const st = currentStep(run);
    timer.update(remainingMs(run, Date.now()), st.durationSec * 1000);
  }

  async function finish() {
    if (finished) return;
    finished = true;
    clearInterval(loopTimer);
    hideOverlay();
    if (shownIndex >= 0 && shownIndex < plan.steps.length) exitStep(plan.steps[shownIndex]);
    releaseAwake();
    await lastTake;
    record.completed = !stoppedEarly;
    await save();
    buzz('end');
    if (record.counted && !(await repo.getMeta('persistAsked', false))) {
      await repo.setMeta('persistAsked', true);
      requestPersist();
    }
    if (plan.type === 'prerdv') showRdvEnd();
    else if (record.counted) navigate(`/end/${record.id}`);
    else navigate('/home');
  }

  function showRdvEnd() {
    root.replaceChildren(h('div', { class: 'ready' },
      h('p', { class: 'ready-title' }, 'Tu y vas.'),
      record.goal ? h('p', { class: 'say small' }, record.goal) : null,
      why ? h('p', { class: 'why' }, `« ${why} »`) : null,
      h('p', { class: 'muted' }, 'Je suis là pour comprendre, pas pour convaincre.'),
      h('button', { class: 'btn btn-rdv', onclick: () => navigate('/home') }, 'J’y vais')));
  }

  function onPaused() {
    const st = currentStep(run);
    if (st?.kind === 'record') endTake();
    stopSpeaking();
    player.stop();
  }

  function doResume() {
    hideOverlay();
    const now = Date.now();
    if (pausedForMs(run, now) > AUTO_CLOSE_MS) { apply(stop(run, now)); return; }
    apply(resume(run, now));
    const st = currentStep(run);
    if (st && (st.kind === 'listen' || st.kind === 'record')) enterStep(st);
  }

  function stopNow() {
    stoppedEarly = true;
    apply(stop(run, Date.now()));
  }

  function askStop() {
    if (isCounted(practicedMs(run, Date.now()))) { stopNow(); return; }
    showOverlay(
      h('p', { class: 'overlay-title' }, PAS_COMPTE),
      h('button', { class: 'btn btn-go', onclick: doResume }, 'Continuer'),
      h('button', { class: 'btn-link', onclick: stopNow }, 'Arrêter quand même'));
  }

  function openPause(title = 'Pause') {
    if (!run || run.status !== 'running') return;
    apply(pause(run, Date.now()));
    onPaused();
    showOverlay(
      h('p', { class: 'overlay-title' }, title),
      h('button', { class: 'btn btn-go', onclick: doResume }, 'Reprendre'),
      h('button', { class: 'btn-secondary', onclick: () => { hideOverlay(); const now = Date.now(); apply(skipBlock(resume(run, now), now)); } }, 'Passer ce bloc'),
      h('button', { class: 'btn-link', onclick: askStop }, 'J’arrête là'));
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') openPause('On reprend ?');
  };
  document.addEventListener('visibilitychange', onVisibility);

  function start() {
    if (run) return;
    clearInterval(countdown);
    run = createRun(plan.steps, Date.now());
    keepAwake();
    root.replaceChildren(header, timer.el, stage,
      h('footer', { class: 'session-foot' }, h('button', { class: 'btn-pause', onclick: () => openPause() }, 'Pause')),
      overlay);
    onStep();
    loop();
    loopTimer = setInterval(loop, 250);
  }

  // Écran « Prêt ? » : compte à rebours 3-2-1, ou un tap pour démarrer tout de suite.
  const showWhy = kind === 'daily' && why && plan.sessionNumber % 3 === 0;
  let count = 3;
  const num = h('p', { class: 'ready-count' }, '3');
  root.replaceChildren(h('div', { class: 'ready', onclick: start },
    h('p', { class: 'ready-title' }, 'Prêt ?'),
    showWhy ? h('p', { class: 'why' }, `« ${why} »`) : null,
    num,
    h('p', { class: 'muted' }, 'Touche l’écran pour démarrer tout de suite.')));
  buzz('count');
  countdown = setInterval(() => {
    count -= 1;
    if (count <= 0) start();
    else { num.textContent = String(count); buzz('count'); }
  }, 1000);

  return () => {
    clearInterval(countdown);
    clearInterval(loopTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    stopSpeaking();
    player.stop();
    releaseAwake();
    if (run && !finished) {
      finished = true;
      if (takeStarting) endTake();
      stoppedEarly = true;
      lastTake.then(() => save());
    }
  };
}
```

- [ ] **Step 2 : vérifier la syntaxe**

Lancer `node --check js/ui/screens/session.js && echo OK`.
Attendu : `OK`.

- [ ] **Step 3 : commit**

```bash
git add js/ui/screens/session.js
git commit -m "feat(ui): écran de séance (minuteurs, enregistrement, écoute, pause)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14 : Écrans de fin, de progression et de réglages

**Fichiers :**
- Créer : `js/ui/screens/end.js`, `js/ui/screens/progress.js`, `js/ui/screens/settings.js`

- [ ] **Step 1 : `js/ui/screens/end.js`**

```js
import { h } from '../dom.js';
import { variant, FIN, FIN_PARTIELLE, milestoneMessage } from '../../core/texts.js';
import { createPlayer } from '../../audio/player.js';
import { createCompare } from '../components/compare.js';

export async function render(root, { repo, content, navigate, params }) {
  const s = await repo.getSession(params[0]);
  if (!s) { navigate('/home'); return; }
  const recs = await repo.listRecordings();
  const mine = recs.filter((r) => r.sessionId === s.id);
  const cleanups = [];
  const children = [
    h('div', { class: 'dot-fill' }),
    h('p', { class: 'end-msg' }, s.completed ? variant(FIN, s.sessionNumber ?? 0) : FIN_PARTIELLE),
  ];

  const take = mine.at(-1);
  if (take) {
    const player = createPlayer();
    cleanups.push(() => player.stop());
    children.push(h('button', { class: 'btn-secondary', onclick: async () => player.play(await repo.getAudio(take.id)) }, '▶ Réécouter ta prise du jour'));
  }

  const ref = mine.find((r) => r.kind === 'reference');
  if (s.milestone && ref) {
    children.push(h('p', { class: 'milestone' }, milestoneMessage(s.milestone)));
    const j1 = recs.find((r) => r.kind === 'reference' && r.milestone === 1);
    if (s.milestone > 1 && j1) {
      const cmp = await createCompare({ repo, a: j1, b: ref, labelA: 'J1', labelB: `Jalon ${s.milestone}` });
      if (cmp) { children.push(cmp.el); cleanups.push(cmp.destroy); }
    }
  }

  if (s.sessionNumber === 3 && !(await repo.getMeta('clinicalNoteShown', false))) {
    await repo.setMeta('clinicalNoteShown', true);
    children.push(h('div', { class: 'card' }, h('p', { class: 'label' }, 'À savoir'), h('p', {}, content.extras.noteClinique)));
  }

  children.push(h('button', { class: 'btn btn-go', onclick: () => navigate('/home') }, 'Fermer'));
  root.replaceChildren(h('div', { class: 'end' }, children));
  return () => cleanups.forEach((f) => f());
}
```

- [ ] **Step 2 : `js/ui/screens/progress.js`**

```js
import { h } from '../dom.js';
import { dayKey, MONTHS_FR } from '../../core/dates.js';
import {
  monthCount, totalCount, dailyCount, monthGrid, milestonesUpTo, nextMilestone, recentFeedback,
} from '../../core/progress.js';
import { plural } from '../../core/texts.js';
import { createCompare } from '../components/compare.js';

const FB = { non: 'Non', une: 'Une fois', plusieurs: 'Plusieurs fois' };

export async function render(root, { repo }) {
  const today = dayKey(Date.now());
  const [y, m] = today.split('-').map(Number);
  const [sessions, recordings] = await Promise.all([repo.listSessions(), repo.listRecordings()]);
  const daily = dailyCount(sessions);
  const total = totalCount(sessions);
  const grid = monthGrid(sessions, y, m, today);
  const cleanups = [];

  const cal = h('div', { class: 'cal' },
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => h('span', { class: 'cal-head' }, d)),
    Array.from({ length: grid.leading }, () => h('span')),
    grid.cells.map((c) => h('span', { class: `cal-cell ${c.kind}${c.today ? ' today' : ''}` }, String(c.day))));

  const refs = recordings.filter((r) => r.kind === 'reference');
  const j1 = refs.find((r) => r.milestone === 1);
  const base = Math.max(daily, 1);
  const upcoming = nextMilestone(base);
  const left = upcoming - daily;
  const voice = h('div', { class: 'card' },
    h('h2', {}, 'Ta voix'),
    h('ol', { class: 'frise' },
      milestonesUpTo(base).map((mm) => h('li', { class: refs.some((r) => r.milestone === mm) ? 'done' : '' }, `J${mm}`)),
      h('li', { class: 'upcoming' }, `J${upcoming}`)),
    h('p', { class: 'muted' }, `Prochain jalon dans ${plural(left, 'séance')}.`));
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

  const fb = recentFeedback(sessions, 6);
  const rdv = h('div', { class: 'card' },
    h('h2', {}, 'En rendez-vous'),
    h('p', { class: 'muted' }, 'On t’a fait répéter ?'),
    fb.length
      ? h('ul', { class: 'fb' }, fb.map((v) => h('li', { class: `fb-${v}` }, FB[v])))
      : h('p', { class: 'muted' }, 'Aucun retour pour l’instant. Lance « Avant un rendez-vous » avant ton prochain RDV.'));

  root.replaceChildren(h('div', { class: 'progress' },
    h('a', { class: 'back', href: '#/home' }, '‹ Accueil'),
    h('p', { class: 'big-count' }, String(monthCount(sessions, y, m))),
    h('p', {}, `jours pratiqués en ${MONTHS_FR[m - 1]}`),
    h('p', { class: 'muted' }, `${plural(total, 'séance')} depuis le début`),
    cal, voice, rdv));
  return () => cleanups.forEach((f) => f());
}
```

- [ ] **Step 3 : `js/ui/screens/settings.js`**

```js
import { h } from '../dom.js';
import { dayKey } from '../../core/dates.js';
import { calendarUrl, alarmLabel } from '../../core/reminder.js';
import { exportAll, readBackup, importBackup } from '../../data/backup.js';
import { setSpeechEnabled } from '../../platform/speech.js';
import { setHapticsEnabled } from '../../platform/haptics.js';
import { storageStatus } from '../../platform/storage.js';
import { APP_VERSION } from '../../version.js';

const section = (title, ...children) => h('section', {}, h('h2', {}, title), children);

function checkbox(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', checked, onchange: () => onChange(input.checked) });
  return h('label', { class: 'check' }, input, label);
}

export async function render(root, { repo, content }) {
  const [why, objective, prefs, lastBackupAt] = await Promise.all([
    repo.getMeta('why', ''), repo.getMeta('objective', content.extras.objectifDefaut),
    repo.getSettings(), repo.getMeta('lastBackupAt', null),
  ]);
  const appUrl = location.origin + location.pathname;

  const objField = h('input', { class: 'field', type: 'text', value: objective });
  const whyField = h('textarea', { class: 'field', rows: 3 });
  whyField.value = why;
  const savedNote = h('p', { class: 'muted' });

  const time = h('input', { class: 'field', type: 'time', value: prefs.reminderTime });
  time.addEventListener('change', async () => { prefs.reminderTime = time.value || '08:30'; await repo.setMeta('settings', prefs); });
  const reminderNote = h('p', { class: 'muted' });

  const backupInfo = h('p', { class: 'muted' }, lastBackupAt
    ? `Dernière sauvegarde : ${new Date(lastBackupAt).toLocaleDateString('fr-FR')}`
    : 'Aucune sauvegarde pour l’instant.');
  const fileInput = h('input', {
    type: 'file', accept: '.json,application/json', hidden: true,
    onchange: async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const p = await readBackup(file);
        if (!confirm(`${p.data.sessions.length} séances et ${p.data.recordings.length} enregistrements : importer ?`)) return;
        const r = await importBackup(p);
        backupInfo.textContent = `Restauré : ${r.sessions} séances, ${r.recordings} enregistrements.`;
      } catch (e) {
        backupInfo.textContent = e.message;
      }
    },
  });

  async function doExport() {
    backupInfo.textContent = 'Préparation…';
    const blob = await exportAll(APP_VERSION);
    const name = `ohmaparole-sauvegarde-${dayKey(Date.now())}.json`;
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    await repo.setMeta('lastBackupAt', Date.now());
    backupInfo.textContent = `Enregistré dans Téléchargements : ${name}`;
  }

  const storageInfo = h('p', { class: 'muted' }, '…');
  storageStatus().then(({ persisted, usedMb }) => {
    storageInfo.textContent = `Stockage protégé : ${persisted ? 'oui' : 'non'} · ${usedMb} Mo utilisés`;
  });

  root.replaceChildren(h('div', { class: 'settings' },
    h('a', { class: 'back', href: '#/home' }, '‹ Accueil'),
    h('h1', {}, 'Réglages'),
    section('Ton objectif et ton pourquoi',
      h('label', { class: 'label' }, 'Objectif'), objField,
      h('label', { class: 'label' }, 'Pourquoi'), whyField,
      h('button', {
        class: 'btn-secondary',
        onclick: async () => {
          await repo.setMeta('objective', objField.value.trim());
          await repo.setMeta('why', whyField.value.trim());
          savedNote.textContent = 'Enregistré.';
        },
      }, 'Enregistrer'),
      savedNote),
    section('Rappel quotidien',
      time,
      h('a', {
        class: 'btn-secondary', href: '#', target: '_blank', rel: 'noopener',
        onclick: (e) => { e.currentTarget.href = calendarUrl({ dateKey: dayKey(Date.now()), time: time.value || '08:30', why: whyField.value, appUrl }); },
      }, 'Créer le rappel dans Google Agenda'),
      h('button', {
        class: 'btn-link',
        onclick: async () => {
          try { await navigator.clipboard.writeText(alarmLabel(whyField.value)); reminderNote.textContent = 'Nom d’alarme copié.'; } catch { reminderNote.textContent = alarmLabel(whyField.value); }
        },
      }, 'Copier le nom pour une alarme'),
      reminderNote),
    section('Guidage',
      checkbox('Voix de guidage', prefs.voice, async (v) => { prefs.voice = v; setSpeechEnabled(v); await repo.setMeta('settings', prefs); }),
      checkbox('Vibrations', prefs.vibrate, async (v) => { prefs.vibrate = v; setHapticsEnabled(v); await repo.setMeta('settings', prefs); })),
    section('Sauvegarde',
      backupInfo,
      h('button', { class: 'btn-secondary', onclick: doExport }, 'Sauvegarder mes données'),
      h('button', { class: 'btn-link', onclick: () => fileInput.click() }, 'Restaurer une sauvegarde'),
      fileInput),
    section('Stockage', storageInfo),
    section('À savoir',
      h('p', {}, content.extras.noteClinique),
      h('ul', {}, content.extras.gardeFous.map((g) => h('li', {}, g)))),
    h('p', { class: 'muted' }, `OhMaParole · version ${APP_VERSION}`)));
}
```

- [ ] **Step 4 : vérifier la syntaxe**

Lancer `for f in js/ui/screens/*.js; do node --check "$f" || exit 1; done && echo OK`.
Attendu : `OK`.

- [ ] **Step 5 : commit**

```bash
git add js/ui/screens/end.js js/ui/screens/progress.js js/ui/screens/settings.js
git commit -m "feat(ui): fin de séance, progression, réglages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15 : PWA (manifest, icônes, service worker, release)

**Fichiers :**
- Créer : `manifest.webmanifest`, `tools/make-icons.mjs`, `icons/*.png` (générés), `sw.js`, `tools/release.mjs`
- Test : `tests/pwa.test.mjs`

- [ ] **Step 1 : écrire `tests/pwa.test.mjs`, qui doit échouer**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const sw = read('sw.js');
const ASSETS = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);
const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
  const p = `${dir}/${f}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
});

test('tout fichier servi est précaché', () => {
  for (const f of ['js', 'css', 'content', 'icons'].flatMap(walk)) assert.ok(ASSETS.includes(`./${f}`), `manque dans ASSETS : ./${f}`);
  for (const f of ['./', './index.html', './manifest.webmanifest']) assert.ok(ASSETS.includes(f), f);
});

test('chaque entrée de ASSETS existe', () => {
  for (const a of ASSETS) if (a !== './') assert.ok(existsSync(join(ROOT, a)), `fichier absent : ${a}`);
});

test('versions alignées entre sw.js et js/version.js', () => {
  const v1 = sw.match(/const VERSION = '([^']+)';/)[1];
  const v2 = read('js/version.js').match(/APP_VERSION = '([^']+)';/)[1];
  assert.equal(v1, v2);
});

test('manifest valide avec raccourcis', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.short_name, 'OhMaParole');
  assert.equal(m.display, 'standalone');
  assert.equal(m.shortcuts.length, 2);
  for (const i of m.icons) assert.ok(existsSync(join(ROOT, i.src)), i.src);
});
```

- [ ] **Step 2 : lancer le test et vérifier qu'il échoue**

Lancer `node --test tests/pwa.test.mjs`.
Attendu : FAIL (`sw.js` absent).

- [ ] **Step 3 : `tools/make-icons.mjs`, puis générer les icônes**

```js
// Icône « pont » : arche ajonc + tablier sable sur fond Iroise. Encodeur PNG maison (zlib).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      raw.set([r, g, b, 255], y * stride + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const BG = [29, 92, 107];
const ARCH = [227, 167, 47];
const DECK = [247, 243, 236];

function shape(u, v) {
  // u, v dans [0,1], centrés. Arche = demi-anneau supérieur, tablier = barre horizontale.
  const cx = 0.5, cy = 0.6, r = 0.27, t = 0.075;
  const d = Math.hypot(u - cx, v - cy);
  if (v >= cy - 0.005 && v <= cy + 0.06 && u >= 0.17 && u <= 0.83) return DECK;
  if (v <= cy && Math.abs(d - r) <= t / 2) return ARCH;
  return BG;
}

function icon(size, scale) {
  const SS = 4;
  return png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let i = 0; i < SS; i++) for (let j = 0; j < SS; j++) {
      const u = ((x + (i + 0.5) / SS) / size - 0.5) / scale + 0.5;
      const v = ((y + (j + 0.5) / SS) / size - 0.5) / scale + 0.5;
      const c = shape(u, v);
      acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
    }
    return acc.map((a) => Math.round(a / (SS * SS)));
  });
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', icon(192, 1));
writeFileSync('icons/icon-512.png', icon(512, 1));
writeFileSync('icons/maskable-512.png', icon(512, 0.8));
console.log('Icônes écrites dans icons/');
```

Lancer `node tools/make-icons.mjs`.
Attendu : `Icônes écrites dans icons/`.
Ouvrir ensuite `icons/icon-512.png` avec l'outil Read pour vérifier visuellement l'arche et le tablier.

- [ ] **Step 4 : `manifest.webmanifest`**

```json
{
  "id": "./",
  "name": "OhMaParole, 5 minutes par jour",
  "short_name": "OhMaParole",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7F3EC",
  "theme_color": "#1D5C6B",
  "lang": "fr",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Séance du jour (5 min)", "short_name": "Go · 5 min", "url": "./#/session/daily" },
    { "name": "Avant un rendez-vous (90 s)", "short_name": "Avant RDV", "url": "./#/session/prerdv" }
  ]
}
```

- [ ] **Step 5 : `sw.js`**

`ASSETS` doit rester du **JSON valide** : guillemets doubles et aucune virgule finale, car le test le parse.

```js
const VERSION = '2026.10.09-0000';
const CACHE = `ohmaparole-${VERSION}`;
const FONT_CACHE = 'ohmaparole-fonts';
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./content/program.json",
  "./content/fr/exercises.json",
  "./content/fr/extras.json",
  "./js/main.js",
  "./js/router.js",
  "./js/version.js",
  "./js/core/content-index.js",
  "./js/core/dates.js",
  "./js/core/pick.js",
  "./js/core/planner.js",
  "./js/core/progress.js",
  "./js/core/reminder.js",
  "./js/core/session-engine.js",
  "./js/core/texts.js",
  "./js/data/backup.js",
  "./js/data/content.js",
  "./js/data/db.js",
  "./js/data/repo.js",
  "./js/audio/player.js",
  "./js/audio/recorder.js",
  "./js/platform/haptics.js",
  "./js/platform/speech.js",
  "./js/platform/storage.js",
  "./js/platform/wakelock.js",
  "./js/ui/dom.js",
  "./js/ui/components/compare.js",
  "./js/ui/components/timer.js",
  "./js/ui/screens/end.js",
  "./js/ui/screens/home.js",
  "./js/ui/screens/onboarding.js",
  "./js/ui/screens/progress.js",
  "./js/ui/screens/session.js",
  "./js/ui/screens/settings.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('ohmaparole-') && k !== CACHE && k !== FONT_CACHE) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
});
```

- [ ] **Step 6 : `tools/release.mjs`**

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const version = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

for (const [file, re] of [['sw.js', /const VERSION = '[^']*';/], ['js/version.js', /export const APP_VERSION = '[^']*';/]]) {
  const src = readFileSync(file, 'utf8');
  if (!re.test(src)) throw new Error(`Version introuvable dans ${file}`);
  writeFileSync(file, src.replace(re, (m) => m.replace(/'[^']*'/, `'${version}'`)));
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
run('git add -A');
run(`git commit -m "release ${version}"`);
run('git push');
console.log(`Déployé : ${version} (GitHub Pages met environ 1 minute à publier)`);
```

- [ ] **Step 7 : lancer tous les tests**

Lancer `npm test`.
Attendu : PASS sur tous les fichiers de tests.

- [ ] **Step 8 : commit**

```bash
git add manifest.webmanifest tools/make-icons.mjs icons sw.js tools/release.mjs tests/pwa.test.mjs
git commit -m "feat(pwa): manifest, icônes, service worker hors ligne, script de release" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16 : Smoke test dans le navigateur

Le contrôleur fait cette tâche dans le navigateur intégré (outils `mcp__Claude_Browser__*`).

- [ ] **Step 1 : lancer le serveur**

Créer `.claude/launch.json` :

```json
{ "version": "0.0.1", "configurations": [ { "name": "ohmaparole", "runtimeExecutable": "node", "runtimeArgs": ["tools/serve.mjs"], "port": 8080 } ] }
```

Puis lancer `preview_start` avec `name: "ohmaparole"`.

- [ ] **Step 2 : parcourir l'appli et vérifier**

Chaque point se vérifie avec `read_page` ou `get_page_text`, et la console doit rester sans erreur (`read_console_messages`, `onlyErrors`) :
1. Le premier lancement affiche « 1 / 4 ». Passer les 4 écrans, en touchant « Plus tard » à l'enregistrement, et arriver sur l'accueil.
2. L'accueil affiche « 0 jour ce mois-ci », « Go · 5 min » et « Avant un rendez-vous · 90 s ».
3. Toucher Go : l'écran « Prêt ? » s'affiche, puis la séance démarre (minuteur, bloc « Échauffement »).
4. Toucher Pause, puis « Passer ce bloc » deux fois : on arrive au bloc 3.
5. Accélérer avec `javascript_tool` en surchargeant `Date.now`, au moins 70 s plus tard, ou laisser tourner 60 s, puis Pause et « J'arrête là » : l'écran de fin s'affiche, ou l'accueil si la séance n'est pas comptée.
6. Ouvrir `#/progress` (calendrier visible) et `#/settings` (section « À savoir » présente).
7. Faire « Avant un rendez-vous » jusqu'au bout et vérifier qu'« Tu y vas. » s'affiche.
8. Mode sombre : `resize_window` avec `colorScheme: dark`, puis une capture d'écran de l'accueil.

- [ ] **Step 3 : corriger les bugs trouvés**

Utiliser superpowers:systematic-debugging. Relancer `npm test` après chaque correction, puis committer avec `fix: <cause>`.

---

### Task 17 : Déploiement sur GitHub Pages

C'est une **action visible publiquement**, validée par Fred le 09/10 (« code public »).

- [ ] **Step 1 : créer le dépôt et pousser**

```bash
git branch -M main
gh repo create ohmaparole --public --source . --remote origin --push
gh api -X POST repos/folivier-stark/ohmaparole/pages -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 2 : premier déploiement versionné**

Lancer `npm run deploy`.
Attendu : tests PASS, puis `Déployé : 2026.10.…`.

- [ ] **Step 3 : vérifier en ligne**

Attendre que `curl -s -o /dev/null -w "%{http_code}" https://folivier-stark.github.io/ohmaparole/` renvoie `200` (environ 1 à 2 min), puis ouvrir l'URL dans le navigateur intégré et vérifier que le premier lancement s'affiche.

---

### Task 18 : Mise en main par Fred (2 créneaux de 20 min)

Fred fait cette tâche lui-même. Claude prépare les instructions, Fred agit sur son téléphone.

- [ ] **Créneau 1 :**
  1. Ouvrir `https://folivier-stark.github.io/ohmaparole/` dans Chrome, puis menu ⋮ et **« Installer l'application »**.
  2. Faire le premier lancement avec la voix de départ.
  3. Faire une séance complète.
  4. Vérifier : mode avion, puis l'appli se rouvre (checklist `expert-tech.md` §9.3).
- [ ] **Créneau 2 :**
  1. Rappel quotidien. Claude propose de créer l'événement récurrent via le connecteur Google Agenda, **après accord explicite de Fred**, avec le titre donné par `alarmLabel(pourquoi)` et en description `https://folivier-stark.github.io/ohmaparole/#/session/daily`.
  2. Vérifier que le lien de la notification ouvre l'appli installée.
  3. Faire une sauvegarde de test.
