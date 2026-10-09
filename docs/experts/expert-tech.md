# Appli diction : architecture technique de la PWA (Android/Chrome)

> Rapport d'architecte, vérifié en ligne le 09/10/2026. Pas d'implémentation, seulement des choix arrêtés.
> Environnement vérifié sur le PC : **Node 24.16, npm 11.13, git 2.54, gh 2.96 connecté au compte `folivier-stark`**. Le dossier projet est vide.

---

## 0. Les décisions en 10 lignes

| Sujet | Décision |
|---|---|
| Stack | **Vanilla JS + modules ES natifs, sans build, zéro dépendance runtime** |
| Rendu | Petit helper `h()` maison + routage par hash (`#/home`) |
| Données | **IndexedDB** via un wrapper maison d'environ 60 lignes, audio dans un store séparé |
| Audio | `MediaRecorder` en `audio/webm;codecs=opus`, environ 32 kb/s, **sans timeslice**, durée mesurée et stockée |
| Offline | Service worker « cache-first », un cache versionné, mise à jour appliquée à la réouverture |
| Hébergement | **GitHub Pages**. Déploiement = `npm run deploy` (tests, version, commit, push) |
| Sauvegarde | **Un seul fichier JSON** (audio en base64) en export/import. Le zip attend la V2 |
| Rappel | **Événement récurrent Google Agenda** avec lien vers l'appli. Aucune API web n'est fiable pour ça |
| Tests | `node --test` (intégré à Node, zéro dépendance) sur le cœur métier pur, plus une checklist manuelle Android |
| Dev sur téléphone | **Redirection de port de `chrome://inspect`** : le téléphone ouvre `http://localhost:8080`, qui est un contexte sécurisé (micro et SW fonctionnent) |

---

## 1. Stack

### Recommandée : vanilla JS, modules ES, sans build

**Justification**
- **Zéro maintenance** : pas de `node_modules` en production, rien à mettre à jour, pas d'alertes Dependabot. Dans 2 ans, le code tournera encore tel quel.
- **Déploiement trivial** : les fichiers du dépôt sont les fichiers servis. Pas d'étape de build qui peut casser, pas de dossier `dist/`.
- **Chrome Android récent supporte tout le nécessaire en natif** : modules ES, `import` dynamique, `<dialog>`, CSS nesting, `structuredClone`, `crypto.randomUUID()`, Screen Wake Lock.
- **Périmètre minuscule** : environ 6 écrans, un seul utilisateur, pas d'état partagé complexe. Un framework ne rapporte rien ici.
- **Démarrage instantané** (TDAH) : pas de bundle à parser. Les 2 boutons d'accueil sont **écrits en dur dans `index.html`** (de simples liens `#/session/daily` et `#/session/prerdv`), donc ils s'affichent avant même que le JS soit chargé.
- **Testable** : les mêmes fichiers `.js` du dossier `core/` sont importés par le navigateur et par `node --test`.

**Node ne sert qu'en dev** : tests, petit serveur statique maison (`tools/serve.mjs` sur `node:http`, zéro dépendance) et script de déploiement. `package.json` ne contient **que des `scripts`, aucune dépendance**.

### Alternatives écartées

| Option | Pourquoi écartée |
|---|---|
| **Vite + Preact** | Ajoute un build, un `dist/`, des dépendances à maintenir et une CI pour GitHub Pages. C'est un gain de confort pour une grosse UI, pas pour 6 écrans. Coût de friction trop élevé pour Fred. |
| Lit/Preact via CDN | Une dépendance réseau au premier chargement, qu'il faudrait de toute façon copier dans le dépôt pour l'offline. Aucun bénéfice réel pour la taille de l'appli. |

Si l'UI grossit un jour : vendoriser `preact` + `htm` (2 fichiers ESM copiés dans `vendor/`, toujours sans build). Pas avant.

---

## 2. Structure des fichiers

```
apprentissage/
├─ index.html               # coque HTML : accueil statique (2 gros boutons), <main id="app">
├─ manifest.webmanifest
├─ sw.js                    # service worker ; contient VERSION et la liste ASSETS
├─ .nojekyll                # OBLIGATOIRE sur GitHub Pages (sinon Jekyll ignore les fichiers en "_")
├─ .gitignore               # node_modules, diction-sauvegarde-*.json
├─ package.json             # scripts uniquement : test, serve, deploy
├─ css/app.css
├─ icons/  icon-192.png  icon-512.png  maskable-512.png
├─ content/                 # DONNÉES STATIQUES (voir §3.2)
│  ├─ manifest.json         # version du contenu, langues disponibles
│  ├─ program.json          # programme 6 semaines, neutre en langue (slots par catégorie)
│  └─ fr/
│     ├─ exercises.json     # environ 70 exercices FR
│     └─ strings.json       # libellés de contenu : semaines, catégories, consignes génériques
├─ js/
│  ├─ main.js               # bootstrap : enregistre le SW, demande persist(), lance le router
│  ├─ router.js             # routage hash -> écran ; démonte l'écran précédent
│  ├─ core/                 # PUR : aucun accès DOM/IndexedDB, testé par node --test
│  │  ├─ session-engine.js  # machine à états des minuteurs et blocs
│  │  ├─ planner.js         # composition de séance + rotation des exercices
│  │  ├─ progress.js        # calendrier du mois, jalons J1/J7/J14/J30, position dans le programme
│  │  └─ dates.js           # clés de jour LOCALES "YYYY-MM-DD", calcul d'écart en jours
│  ├─ data/
│  │  ├─ db.js              # ouverture IndexedDB, migrations, promisification
│  │  ├─ repo.js            # API métier : sessions, recordings, goals, meta
│  │  ├─ content.js         # charge content/<lang>/*.json + program.json, valide
│  │  └─ backup.js          # export/import JSON
│  ├─ audio/
│  │  ├─ recorder.js        # micro, permission, MediaRecorder, choix du mime
│  │  └─ player.js          # lecture d'un Blob, lecture A/B enchaînée
│  ├─ platform/
│  │  ├─ wakelock.js        # écran allumé pendant la séance (réacquis au retour visible)
│  │  ├─ storage.js         # persist(), persisted(), estimate()
│  │  └─ reminder.js        # construit l'URL Google Agenda récurrente
│  └─ ui/
│     ├─ dom.js             # h(tag, props, ...children), escape, qs
│     ├─ components/  timer.js  rating.js  audio-button.js
│     └─ screens/
│        ├─ home.js         # 2 boutons + 1 ligne d'état (jalon dû, rappel de sauvegarde)
│        ├─ session.js      # sert pour les deux types de séance (daily / prerdv) : seul le plan diffère
│        ├─ review.js       # fin de séance : auto-évaluation
│        ├─ progress.js     # calendrier du mois + jalons
│        ├─ compare.js      # J1 vs aujourd'hui
│        └─ settings.js     # « pourquoi », objectifs RDV, rappel, export/import, état du stockage
├─ tests/
│  ├─ session-engine.test.js  planner.test.js  progress.test.js  dates.test.js
│  ├─ content.test.js       # validité des JSON de contenu
│  └─ sw-assets.test.js     # tout fichier de js/ css/ content/ icons/ est bien dans ASSETS
└─ tools/
   ├─ serve.mjs             # serveur statique local (port 8080)
   └─ release.mjs           # bump VERSION dans sw.js + git add/commit/push
```

### Responsabilités et interfaces

Règle : **`core/` ne connaît ni le DOM, ni IndexedDB, ni l'heure système**. On lui passe `now` en paramètre, ce qui permet de le tester avec une horloge factice.

```js
// core/session-engine.js : machine à états pure
createRun(plan, now)            -> RunState
reduce(state, event, now)       -> RunState  // event: START | PAUSE | RESUME | SKIP | TICK | END_BLOCK
remainingMs(state, now)         -> number
// RunState = { plan, index, phase: 'ready'|'running'|'paused'|'between'|'done',
//              blockStartedAt, pausedAccumMs, log: [{exerciseId, plannedSec, actualSec, skipped}] }
// IMPORTANT : le temps se calcule par DIFFÉRENCE d'horodatages, jamais en comptant des ticks
// (setInterval est ralenti ou gelé en arrière-plan).

// core/planner.js
buildPlan({ type: 'daily'|'prerdv', program, pool, history, sessionNumber, dateKey }) -> Plan
pickForSlot(slot, pool, recentIds, seed) -> Exercise   // déterministe (seed = dateKey)
// Plan = { type, programWeek, blocks: [{ exerciseId, kind, durationSec, record: boolean }] }

// core/progress.js
monthGrid(year, month, sessions)                          -> [{ dateKey, done, types: [] }]
milestones(referenceDateKey, recordings, todayKey)        -> [{ label: 'J7', dueKey, status: 'done'|'due'|'upcoming' }]
programPosition(completedDailyCount, program)             -> { week, dayInWeek }

// audio/recorder.js
pickMimeType()               -> string
micPermission()              -> Promise<'granted'|'denied'|'prompt'>
startRecording()             -> Promise<{ stop(): Promise<{blob, mimeType, durationMs}>, cancel() }>

// data/repo.js : seul module à toucher db.js
saveSession(s) · listSessions({fromKey, toKey}) · saveRecording(meta, blob) · getAudio(id)
listRecordings({kind}) · getMeta(key) · setMeta(key, value) · saveGoal(g) · listGoals()

// data/backup.js
exportAll() -> Promise<Blob>      importAll(file) -> Promise<{ added, updated, skipped }>

// ui/screens/*.js
render(root, ctx) -> cleanup()    // ctx = { repo, content, navigate, params }
```

**Pas de « store » global** : IndexedDB est la source de vérité, chaque écran relit ce dont il a besoin à l'affichage. Seule la séance en cours garde un `RunState` en mémoire, sauvegardé à chaque fin de bloc.

---

## 3. Modèle de données

### 3.1 IndexedDB : base `diction`, version 1

| Store | keyPath | Index | Contenu |
|---|---|---|---|
| `meta` | `key` | (aucun) | Clés : `why` (texte du « pourquoi »), `settings` ({lang:'fr', reminderTime:'08:00'}), `programStartKey`, `referenceRecordingId`, `lastBackupAt`, `schemaVersion` |
| `sessions` | `id` | `dateKey`, `type` | Une séance réalisée (même partielle) |
| `recordings` | `id` | `dateKey`, `kind` | **Métadonnées uniquement**, sans le Blob |
| `audio` | `id` (même id que dans `recordings`) | (aucun) | `{ id, blob }`, séparé pour que lister ne charge jamais l'audio |
| `goals` | `id` | `rdvDateKey` | Objectifs de rendez-vous |

```js
// sessions
{ id: "uuid", type: "daily" | "prerdv", dateKey: "2026-10-09",   // date LOCALE
  startedAt: 1760000000000, endedAt: 1760000300000,
  programWeek: 2, sessionNumber: 9,                               // n° de séance daily réalisée
  blocks: [{ exerciseId: "fr.art.012", plannedSec: 60, actualSec: 58, skipped: false }],
  completed: true,
  selfRating: { clarity: 4, ease: 3, mood: 4, note: "plus fluide" } | null,
  recordingIds: ["uuid"], goalId: "uuid" | null }

// recordings
{ id: "uuid", createdAt: 1760000000000, dateKey: "2026-10-09",
  kind: "reference" | "session",
  milestone: "J1" | "J7" | "J14" | "J30" | null,
  textId: "fr.ref.001",            // CRUCIAL : comparer uniquement des lectures du MÊME texte
  exerciseId: "fr.art.012" | null, sessionId: "uuid" | null,
  mimeType: "audio/webm;codecs=opus", durationMs: 41230, sizeBytes: 168000 }

// goals
{ id: "uuid", createdAt: 1760000000000, rdvDateKey: "2026-10-14", title: "RDV banque",
  objective: "poser ma voix sur les 2 premières minutes",
  outcome: null | { rating: 1-5, note: "" } }
```

**Ce qui n'est PAS stocké** : la progression (calendrier, jalons, position dans le programme) **se calcule** à partir de `sessions` et `recordings`. Il n'y a donc aucune donnée dérivée à garder synchronisée.

**Migrations** : uniquement additives, dans `onupgradeneeded` (`if (oldVersion < 2) {...}`). On ne supprime ni ne renomme jamais un champ. Les champs absents ont une valeur par défaut à la lecture.

### 3.2 Format des contenus, prêt pour fr/en/es

**Point de conception clé** : les exercices de diction **ne se traduisent pas**. Un virelangue anglais n'est pas la traduction d'un virelangue français. On fait donc :
- un **programme neutre en langue**, qui décrit des **slots** (catégorie, niveau, durée) ;
- un **pool d'exercices par langue**, dans lequel le planner pioche.

En V2, ajouter l'anglais revient à ajouter `content/en/exercises.json` et `content/en/strings.json`, sans toucher au code ni au programme.

```jsonc
// content/manifest.json
{ "contentVersion": "2026-10-09.1", "languages": ["fr"], "defaultLanguage": "fr" }

// content/program.json : neutre en langue
{ "weeks": [
    { "week": 1, "focusKey": "week1.focus",
      "daily": [
        { "slot": "warmup",      "category": "respiration",   "level": 1, "durationSec": 60 },
        { "slot": "articulation","category": "articulation",  "level": 1, "durationSec": 120, "count": 2 },
        { "slot": "reading",     "category": "lecture",       "level": 1, "durationSec": 90,  "record": true },
        { "slot": "cooldown",    "category": "relaxation",    "level": 1, "durationSec": 30 } ] }
    /* … semaines 2 à 6 … */ ],
  "prerdv": [
    { "category": "respiration", "level": 1, "durationSec": 30 },
    { "category": "articulation","level": 1, "durationSec": 40 },
    { "category": "ancrage",     "level": 1, "durationSec": 20 } ],
  "reference": { "milestones": [1, 7, 14, 30], "category": "reference" },
  "rotation": { "avoidRepeatWithinSessions": 3 } }

// content/fr/exercises.json
{ "lang": "fr", "contentVersion": "2026-10-09.1",
  "exercises": [
    { "id": "fr.art.012",              // préfixe langue = ids uniques entre langues
      "category": "articulation", "level": 2, "durationSec": 45,
      "title": "Les chaussettes de l'archiduchesse",
      "instructions": "Lentement 2 fois, puis de plus en plus vite sans perdre la netteté.",
      "text": "Les chaussettes de l'archiduchesse sont-elles sèches, archi-sèches ?",
      "tips": ["Exagère les consonnes", "Garde la mâchoire souple"],
      "tags": ["ch-s"] },
    { "id": "fr.ref.001", "category": "reference", "level": 1, "durationSec": 45,
      "title": "Texte de référence", "text": "…texte fixe de 80 à 100 mots…", "wordCount": 92 } ] }

// content/fr/strings.json
{ "week1.focus": "Respiration et lenteur", "category.articulation": "Articulation" }
```

**Rotation** (`pickForSlot`) : filtrer le pool sur catégorie et niveau, exclure les exercices joués dans les N dernières séances, prendre le moins récemment joué, départager avec un hash de `dateKey`. Le résultat est **déterministe**, donc testable, et la séance ne change pas si l'appli est rouverte le même jour.

**Avancement du programme** : par **nombre de séances réalisées**, pas par jours calendaires. Un jour manqué ne fait pas « prendre du retard », c'est un choix anti-culpabilité adapté au TDAH. Les jalons J7/J14/J30 restent en **jours calendaires depuis J1**, signalés comme « dus » sur l'accueil.
→ *Décision produit à valider par Fred.*

---

## 4. Audio

### 4.1 Format

| Choix | Valeur | Raison |
|---|---|---|
| Mime principal | `audio/webm;codecs=opus` | Natif et éprouvé sur Chrome Android depuis des années ; l'Opus est excellent sur la voix |
| Repli | `audio/mp4;codecs=opus`, puis `audio/mp4`, puis `''` (laisser Chrome choisir) | Chrome sait muxer en MP4 depuis la v126 environ ([démo addpipe](https://addpipe.com/media-recorder-api-demo/), [muxers Chromium](https://chromium.googlesource.com/chromium/src/media/+/refs/heads/main/muxers/README.md)), mais c'est moins éprouvé |
| Sélection | `MediaRecorder.isTypeSupported()` puis **lire `recorder.mimeType`** et le stocker par enregistrement | Le type réellement obtenu peut différer du type demandé ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)) |
| Débit | `audioBitsPerSecond: 32000` (mono) | Suffisant pour juger l'articulation. **Ne pas dépendre du débit par défaut** : le fixer, puis vérifier `size / durée` sur le téléphone |
| Taille | **environ 240 Ko/min** à 32 kb/s (480 Ko/min à 64 kb/s) | 6 semaines à 1-2 min enregistrées par jour, soit **20 à 40 Mo**. Négligeable face au quota |
| Contraintes micro | `{ echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }` | Le contrôle automatique de gain **fausse la comparaison de volume et de projection** entre J1 et J30. À valider à l'oreille : si le son est trop faible, réactiver `noiseSuppression` seulement |

### 4.2 Piège WebM : durée « Infinity »

Les WebM produits par Chrome n'ont historiquement **ni durée ni index (Cues)**, d'où une durée `Infinity` et un seek cassé dans `<audio>`. **Depuis Chrome 140, la durée est écrite si l'enregistrement est fait sans timeslice** ([addpipe](https://blog.addpipe.com/duration-in-webm-videos-produced-by-chrome/)).

**Parade**
- Appeler `recorder.start()` **sans timeslice** : les prises sont courtes (2 min au maximum), un seul Blob à l'arrêt.
- **Mesurer `durationMs` soi-même** (de `start` jusqu'à `onstop`) et le stocker. L'UI affiche cette durée-là et un bouton lecture/stop. Pas de barre de seek en V1.

### 4.3 Permission micro

- Demander `getUserMedia` **uniquement au premier tap sur « Enregistrer »** (geste utilisateur), avec une phrase d'explication juste avant.
- `navigator.permissions.query({name:'microphone'})` pour afficher l'état. Si `denied` : écran d'aide (« Paramètres du site > Micro > Autoriser »).
- Sur une PWA installée, l'autorisation est mémorisée : elle n'est demandée qu'une fois.
- **Couper le flux après chaque prise** (`track.stop()` sur chaque piste) pour éteindre l'indicateur micro Android. Rouvrir le flux coûte environ 100 à 300 ms, ce qui est acceptable.

### 4.4 Stockage des Blobs

- Le Blob va **directement dans IndexedDB** (store `audio`). Chrome stocke les Blobs nativement : pas de base64 en base.
- Lecture : `URL.createObjectURL(blob)` puis `new Audio(url)`, avec `revokeObjectURL` au démontage de l'écran.

### 4.5 Quota et persistance

- Quota Chrome : une origine peut utiliser **jusqu'à environ 60 % du disque** ([web.dev storage-for-the-web](https://web.dev/storage-for-the-web), [MDN quotas](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). Ce n'est pas un sujet ici.
- **`navigator.storage.persist()`** : Chrome **ne montre pas de boîte de dialogue**. Il accorde ou refuse automatiquement, selon l'engagement avec le site et le fait que l'appli soit installée ([web.dev persistent-storage](https://web.dev/articles/persistent-storage)). À appeler **après un geste utilisateur, à la fin de la première séance** (pas au chargement), puis réessayer à chaque démarrage tant que `persisted()` vaut `false`. Afficher l'état dans les Réglages (« Stockage protégé : oui/non »).
- Afficher `navigator.storage.estimate()` dans les Réglages (Mo utilisés).

### 4.6 Comparaison J1 vs aujourd'hui

- **Même texte de référence** (`textId` fixe, environ 45 s) enregistré à J1, J7, J14 et J30. Sans le même texte, la comparaison ne veut rien dire.
- Écran `compare` :
  1. deux cartes (J1 | dernier jalon), chacune avec ▶ ;
  2. un bouton **« Écouter J1 puis maintenant »** qui enchaîne les deux lectures (`ended` de la première déclenche la seconde ; le premier `play()` vient d'un tap, donc pas de blocage autoplay) ;
  3. une **mesure objective gratuite** : débit en mots/min = `wordCount / (durationMs/60000)`.
- V1.1 en option : forme d'onde via `AudioContext.decodeAudioData` (Chrome décode le WebM/Opus) dessinée sur un `<canvas>`.

---

## 5. Offline et PWA

### 5.1 Manifest

```json
{
  "id": "./",
  "name": "Diction — 5 minutes",
  "short_name": "Diction",
  "start_url": "./?src=pwa",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#111111",
  "theme_color": "#111111",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "Séance du jour (5 min)", "short_name": "Séance", "url": "./#/session/daily" },
    { "name": "Avant rendez-vous (90 s)", "short_name": "Avant RDV", "url": "./#/session/prerdv" }
  ]
}
```

- **Chemins relatifs partout** : sur GitHub Pages, l'appli vit sous `/diction/`.
- **`shortcuts`** : un appui long sur l'icône Android propose « Séance » et « Avant RDV », qui lancent la séance en un geste (zéro friction pour le TDAH).

### 5.2 Service worker : stratégie

- **Install** : précache de **tous** les fichiers de l'appli et du contenu (liste `ASSETS` dans `sw.js`), dans le cache `diction-<VERSION>`. Utiliser `cache.addAll(ASSETS.map(u => new Request(u, {cache:'reload'})))`, parce que GitHub Pages sert avec `max-age=600` et qu'il ne faut pas précacher une vieille copie en cache HTTP.
- **Fetch** : **cache-first** pour toute requête GET de même origine. Les navigations renvoient `index.html` depuis le cache. Résultat : démarrage instantané, **aucun réseau au lancement**.
- **Activate** : supprimer tous les caches `diction-*` différents de la version courante, puis `clients.claim()`.
- Il y a bien un **handler `fetch` réel** : il est encore requis pour l'invite d'installation automatique de Chrome, même si le menu « Installer » n'en a plus besoin depuis Chrome 108 sur mobile ([Chrome blog](https://developer.chrome.com/blog/update-install-criteria)).

### 5.3 Mise à jour sans casser les données

- **Les données ne sont jamais dans Cache Storage** : elles sont dans IndexedDB, qu'une mise à jour du SW ne touche pas.
- Chaque déploiement modifie `VERSION` dans `sw.js` (fait par `tools/release.mjs`). Chrome compare `sw.js` octet par octet en **contournant le cache HTTP** (depuis Chrome 68, voir [fresher-sw](https://developer.chrome.com/blog/fresher-sw)), donc la nouvelle version est détectée malgré le `max-age=600` de GitHub Pages.
- **Application** : le nouveau SW s'installe en arrière-plan et attend. Au **prochain démarrage**, s'il existe `registration.waiting` **et qu'aucune séance n'est en cours**, `main.js` lui envoie `SKIP_WAITING`, puis recharge une fois sur `controllerchange`. Jamais de rechargement au milieu d'une séance.
- **Garde-fou** : `tests/sw-assets.test.js` échoue si un fichier de `js/`, `css/`, `content/` ou `icons/` manque dans `ASSETS`. C'est le piège classique du « marche en ligne, casse hors ligne ».
- **Kill switch documenté** dans le README dev : en cas de SW cassé, déployer un `sw.js` qui vide les caches et se désenregistre.

### 5.4 Installation sur Android

1. Ouvrir l'URL dans Chrome.
2. Menu ⋮, puis **« Installer l'application »** (ou la bannière automatique). Chrome crée une WebAPK, qui apparaît comme une vraie appli.
3. Avantage induit : les liens vers l'URL de l'appli (par exemple depuis Google Agenda) **s'ouvrent dans l'appli installée**, la WebAPK interceptant les URLs de son `scope`.

---

## 6. Hébergement (HTTPS obligatoire)

| | **GitHub Pages** ✅ | Cloudflare Workers (static assets) | Netlify |
|---|---|---|---|
| Compte | **Déjà là** : `gh` est connecté à `folivier-stark` (vérifié) | Compte Cloudflare à créer, plus `wrangler login` | Compte à créer |
| Déploiement | `git push` (environ 1 min) | `npx wrangler deploy` | `netlify deploy --prod` |
| Coût | Gratuit | Gratuit (requêtes statiques gratuites) | **Crédits** : 300/mois pour les nouveaux comptes depuis sept. 2025, environ 15 crédits par déploiement en prod selon des sources tierces, **donc à peu près 20 déploiements par mois** ([changelog Netlify](https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/)) |
| Dépôt privé | ❌ Non sur le plan gratuit (Pages en privé = GitHub Pro) | ✅ Oui | ✅ Oui |
| En-têtes custom | ❌ (`max-age=600` imposé, voir la parade en §5.2) | ✅ `_headers` | ✅ |
| Bonus | Historique git = sauvegarde du code et rollback | Cloudflare oriente les nouveaux projets vers Workers plutôt que Pages ([guide de migration](https://developers.cloudflare.com/workers/static-assets/migrate-from-pages/)) | (aucun) |

### Recommandation : GitHub Pages

C'est zéro nouveau compte, zéro nouvel outil, et le push sert aussi de sauvegarde du code.
- **Le dépôt public n'est pas un problème** : il contient le code et les exercices, **jamais les données personnelles** (pourquoi, objectifs, audio), qui restent sur le téléphone.
- L'URL contiendra le nom de compte : `https://folivier-stark.github.io/diction/`.

**Mise en place (une seule fois, par l'implémenteur)**
```bash
gh repo create diction --public --source . --push
gh api -X POST repos/folivier-stark/diction/pages -f "source[branch]=main" -f "source[path]=/"
```

**Ensuite, à chaque déploiement : une seule commande**
```bash
npm run deploy     # = node --test && node tools/release.mjs  (bump VERSION, commit, push)
```

**Si un dépôt privé devient nécessaire** : Cloudflare Workers, avec `wrangler.jsonc` (`"assets": {"directory": "./"}`) et `npx wrangler deploy`.

---

## 7. Sauvegarde (version minimale)

**Pourquoi c'est indispensable** : les données de site Chrome **ne suivent pas** un changement de téléphone, et « Effacer les données » de Chrome les supprime.

### Format : un seul fichier JSON

`diction-sauvegarde-2026-10-09.json`

```jsonc
{ "format": "diction-backup", "formatVersion": 1,
  "exportedAt": "2026-10-09T18:30:00+02:00", "appVersion": "2026.10.09-1830", "dbVersion": 1,
  "data": { "meta": [...], "sessions": [...], "recordings": [...], "goals": [...] },
  "audio": { "<recordingId>": { "mimeType": "audio/webm;codecs=opus", "base64": "GkXfo…" } } }
```

**Pourquoi un JSON et pas un zip en V1** : zéro dépendance, un seul fichier, l'import est trivial. Le surcoût base64 (+33 %) donne **environ 25 à 50 Mo après 6 semaines**, ce qui reste acceptable. Le passage au zip (en vendorisant `fflate`, un seul fichier ESM, en mode « store » puisque l'Opus est déjà compressé) n'est utile que si l'export dépasse environ 80 Mo.

### Export

1. Lire tous les stores et encoder chaque Blob via `blob.arrayBuffer()` puis base64 par morceaux.
2. Construire un `Blob` JSON et le télécharger avec `<a download>` : le fichier va dans **Téléchargements**.
3. Bouton secondaire « Partager » via `navigator.share({files})` **si** `navigator.canShare({files})` renvoie `true` : Chrome limite les types partageables (audio, image, pdf, vidéo, texte), et le JSON n'est pas garanti ([web.dev web-share](https://web.dev/articles/web-share)).

### Import

1. `<input type="file" accept=".json,application/json">`.
2. Valider `format` et `formatVersion`.
3. **Fusion par `id`** (upsert, aucune suppression), après confirmation (« 42 séances, 12 enregistrements : importer ? »).

### Rappel de sauvegarde

Stocker `lastBackupAt`. Si la dernière sauvegarde date de plus de 14 jours, afficher **une ligne** discrète sur l'accueil (« Sauvegarde : il y a 15 j »). Pas de pop-up.

---

## 8. Rappels : verdict

### Verdict : ne PAS faire de notifications web. Utiliser Google Agenda (ou une alarme Android posée à la main)

| API | État réel en 2026 | Utilisable pour un rappel à 8h00 ? |
|---|---|---|
| **Notification Triggers** (`showTrigger`) | **Développement arrêté**. Chrome la classe dans « No longer pursuing » et elle n'a jamais été livrée ([Chrome docs](https://developer.chrome.com/docs/web-platform/notification-triggers)) | ❌ |
| **Periodic Background Sync** | Disponible uniquement pour les PWA installées. **Chrome décide quand et si l'événement se déclenche** (score d'engagement, batterie, réseau) ; `minInterval` n'est qu'un minimum ([Chrome docs](https://developer.chrome.com/docs/capabilities/periodic-background-sync)) | ❌ (pas d'heure garantie) |
| **Web Push** | Exige **un serveur** qui envoie le push (clés VAPID, abonnement stocké, cron) : « sans serveur » est impossible par construction | ❌ en V1 (ajoute un backend) |
| `setTimeout` + `Notification` | Ne fonctionne que si l'appli est ouverte | ❌ |
| Intent Android `SET_ALARM` depuis le web | Chrome ne lance que des activités déclarant `BROWSABLE`, ce qui n'est pas garanti pour l'appli Horloge ([Chrome intents](https://developer.chrome.com/docs/android/intents)). Non fiable | ❌ (au mieux un bonus à tester) |
| **Google Agenda, événement récurrent** | Lien `calendar.google.com/calendar/render?action=TEMPLATE&…&recur=RRULE:FREQ=DAILY` ([doc communautaire](https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md)) | ✅ |

### Mise en œuvre retenue

Dans les Réglages, un bouton **« Créer mon rappel quotidien »** :
1. `reminder.js` construit l'URL avec :
   - `text=Diction 5 min` ;
   - `dates=` (aujourd'hui à l'heure choisie, 5 min, en UTC avec `Z`) ;
   - `recur=RRULE:FREQ=DAILY` (encodé) ;
   - `details=https://folivier-stark.github.io/diction/#/session/daily`.
2. Google Agenda s'ouvre, Fred valide.
3. La notification Agenda arrive tous les jours. **Toucher le lien ouvre directement la séance dans l'appli installée.**

**Encore plus simple pour le premier rappel** : l'implémenteur peut créer cet événement récurrent directement via le connecteur Google Agenda disponible dans la session, **avec l'accord explicite de Fred**. Aucun code n'est alors nécessaire en V1.

**Si Fred préfère une vraie sonnerie** : une alarme Android posée à la main (« Diction 5 min ») plus le raccourci d'icône `Séance`, soit deux gestes.

---

## 9. Tests

### 9.1 Unitaires : `node --test`

Intégré à Node 24, **aucune dépendance**. `npm test` lance `node --test tests/`.

| Fichier | Ce qu'il vérifie |
|---|---|
| `session-engine.test.js` | Enchaînement des blocs, pause et reprise (le temps en pause n'est pas compté), `SKIP`, fin de séance, saut d'horloge (l'appli revient après 10 min en arrière-plan, le bloc est terminé et l'état est correct) |
| `planner.test.js` | Déterminisme (même `dateKey`, même plan) ; pas de répétition dans les N dernières séances ; repli quand le pool d'un slot est épuisé ; durée totale daily à environ 300 s et prerdv à environ 90 s |
| `progress.test.js` | Grille du mois (mois de 28 à 31 jours, commençant un dimanche) ; jalons dus, faits ou à venir ; position dans le programme après 0, 7 et 42 séances |
| `dates.test.js` | **Clé de jour locale** : une séance à 00h30 heure de Paris tombe sur le bon jour (piège `toISOString()`, qui est en UTC) ; passage à l'heure d'hiver |
| `content.test.js` | Ids uniques et préfixés par la langue ; champs obligatoires présents ; **chaque slot du programme est satisfiable** par le pool de chaque langue ; `wordCount` présent sur les textes de référence |
| `sw-assets.test.js` | Tout fichier servi figure dans `ASSETS` |

Non testés en automatique : IndexedDB, MediaRecorder et le DOM. Ils passent par le test manuel ; c'est le compromis assumé pour rester sans dépendance.

### 9.2 Développer sur le téléphone

**Méthode recommandée : redirection de port de Chrome DevTools**, sans tunnel ni compte.

1. Téléphone : Options pour les développeurs, puis **Débogage USB**, puis brancher le câble.
2. PC : `npm run serve` (port 8080).
3. Chrome PC : `chrome://inspect/#devices`, puis **Port forwarding** : `8080 → localhost:8080`.
4. Téléphone : ouvrir `http://localhost:8080`. **`localhost` est un contexte sécurisé**, donc le micro et le SW fonctionnent sans HTTPS.
5. Console et DevTools du téléphone : bouton **inspect** dans `chrome://inspect`.

Astuce SW en dev : DevTools, Application, Service workers, cocher **« Update on reload »**.
L'origine `localhost` a ses propres données, **séparées de la prod** : on peut casser en dev sans risque.

Plan B : `npm run deploy`, puis tester sur l'URL GitHub Pages (environ 1 min).

### 9.3 Checklist manuelle Android (10 min, avant chaque version « réelle »)

1. Installer depuis Chrome ; l'icône et les raccourcis (appui long) fonctionnent.
2. **Mode avion**, puis rouvrir l'appli : elle démarre et une séance complète se déroule.
3. Premier enregistrement : la permission est demandée une seule fois ; la réécoute fonctionne ; la durée affichée est juste.
4. Verrouiller l'écran pendant une séance : le wake lock est actif ; au retour, le minuteur est cohérent.
5. Tuer l'appli (récents, glisser) : l'historique et l'audio sont toujours là.
6. Déployer une nouvelle version, rouvrir deux fois : la nouvelle version est active et **les données sont intactes**.
7. Export, puis import dans le profil `localhost` : tout est revenu, audio compris.
8. Réglages : « Stockage protégé : oui ».

---

## 10. Risques et parades

| # | Risque | Gravité | Parade |
|---|---|---|---|
| 1 | **Perte des données** (changement de téléphone, « Effacer les données » de Chrome, éviction en cas de stockage saturé, désinstallation de la PWA selon la version d'Android) | 🔴 | `persist()` après la première séance ; état visible dans les Réglages ; **export JSON** ; rappel discret à 14 jours. Ne jamais tester la désinstallation sans export préalable |
| 2 | **Le micro se coupe si l'appli passe en arrière-plan ou si l'écran se verrouille** (Chrome Android suspend la capture d'une page cachée ; comportement non documenté officiellement, rapporté par plusieurs sources) | 🔴 | **Screen Wake Lock** pendant la séance (réacquis sur `visibilitychange`) ; sur `hidden`, arrêter proprement la prise et la sauvegarder ; prises courtes |
| 3 | **Minuteurs faux** après un passage en arrière-plan (timers gelés ou ralentis, Économiseur d'énergie) | 🟠 | Temps calculé par différence d'horodatages dans `session-engine` ; état sauvegardé à chaque fin de bloc, reprise possible |
| 4 | **Chrome tue l'onglet** en pleine séance | 🟠 | Séance sauvegardée bloc par bloc ; au redémarrage, proposer « Reprendre la séance ? » si l'état date de moins de 30 min |
| 5 | WebM sans durée, seek cassé | 🟠 | Pas de timeslice (Chrome 140+ écrit la durée) ; `durationMs` stocké ; pas de barre de seek |
| 6 | **Comparaison J1/J30 faussée** (contrôle automatique de gain, texte différent, autre micro comme un casque Bluetooth) | 🟠 | AGC désactivé ; `textId` fixe ; afficher « même texte » ; consigne : toujours le micro du téléphone, à 20 cm |
| 7 | Mise à jour qui casse l'offline (fichier oublié dans `ASSETS`) | 🟠 | Test `sw-assets` ; précache avec `cache:'reload'` ; kill switch documenté |
| 8 | Mise à jour au milieu d'une séance | 🟡 | `SKIP_WAITING` uniquement au démarrage, hors séance |
| 9 | Permission micro refusée ou révoquée | 🟡 | `permissions.query` ; écran d'aide avec le chemin exact dans les réglages Android |
| 10 | Jour mal calculé entre 00h et 02h (UTC contre heure de Paris) | 🟡 | `dates.js` avec clés locales, testé |
| 11 | GitHub Pages ignore les fichiers ou dossiers commençant par `_` (Jekyll) | 🟡 | Fichier `.nojekyll` à la racine |
| 12 | Une sauvegarde personnelle commitée par erreur dans le dépôt **public** | 🟡 | `.gitignore` : `diction-sauvegarde-*.json` |
| 13 | Données de dev mélangées à la prod | 🟢 | Origines différentes (`localhost` et `github.io`), donc des bases séparées par construction |

---

## 11. Ce que l'implémenteur doit vérifier sur le téléphone de Fred (non garanti par la recherche)

1. `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')` renvoie `true`, et le **débit réel** obtenu (`blob.size × 8 / durée`) est proche de 32 kb/s.
2. Le comportement réel de la capture micro **écran verrouillé** (test 4 de la checklist).
3. `navigator.storage.persist()` renvoie `true` une fois l'appli installée.
4. Le lien Google Agenda avec `recur` crée bien un événement **quotidien**, et le lien de la description ouvre l'**appli installée**, pas un onglet Chrome.

---

## Sources

- Notification Triggers, arrêt du développement : https://developer.chrome.com/docs/web-platform/notification-triggers
- Periodic Background Sync : https://developer.chrome.com/docs/capabilities/periodic-background-sync
- `MediaRecorder.isTypeSupported` : https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static
- MP4 dans MediaRecorder (Chrome 126+) : https://addpipe.com/media-recorder-api-demo/ et https://chromium.googlesource.com/chromium/src/media/+/refs/heads/main/muxers/README.md
- Durée WebM dans Chrome (corrigée en v140 sans timeslice) : https://blog.addpipe.com/duration-in-webm-videos-produced-by-chrome/
- Enregistrement micro : https://web.dev/articles/media/microphone-record
- Stockage persistant : https://web.dev/articles/persistent-storage
- Quotas et éviction : https://web.dev/storage-for-the-web et https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Critères d'installation Chrome : https://developer.chrome.com/blog/update-install-criteria
- Mise à jour du SW hors cache HTTP : https://developer.chrome.com/blog/fresher-sw
- Cloudflare, de Pages vers Workers : https://developers.cloudflare.com/workers/static-assets/migrate-from-pages/ et https://developers.cloudflare.com/workers/static-assets/compatibility-matrix
- Netlify, plans à crédits : https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/ et https://cli.netlify.com/commands/deploy
- Intents Android dans Chrome : https://developer.chrome.com/docs/android/intents
- Lien Google Agenda avec `recur` : https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/master/services/google.md
- Web Share (types de fichiers) : https://web.dev/articles/web-share
- Repris de connaissances établies, sans revérification en ligne ce jour : Screen Wake Lock (https://developer.chrome.com/docs/capabilities/web-apis/wake-lock), raccourcis de manifest (https://web.dev/articles/app-shortcuts), redirection de port DevTools (https://developer.chrome.com/docs/devtools/remote-debugging/local-server), GitHub Pages réservé aux dépôts publics sur le plan gratuit (https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
