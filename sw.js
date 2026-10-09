const VERSION = '2026.10.09-155750';
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
  "./js/core/acoustics.js",
  "./js/core/content-index.js",
  "./js/core/dashboard.js",
  "./js/core/dates.js",
  "./js/core/pick.js",
  "./js/core/planner.js",
  "./js/core/progress.js",
  "./js/core/rdv.js",
  "./js/core/reminder.js",
  "./js/core/session-engine.js",
  "./js/core/stats.js",
  "./js/core/texts.js",
  "./js/data/backup.js",
  "./js/data/content.js",
  "./js/data/db.js",
  "./js/data/repo.js",
  "./js/audio/analyze.js",
  "./js/audio/live-level.js",
  "./js/audio/player.js",
  "./js/audio/recorder.js",
  "./js/platform/haptics.js",
  "./js/platform/speech.js",
  "./js/platform/storage.js",
  "./js/platform/wakelock.js",
  "./js/ui/dom.js",
  "./js/ui/components/chart.js",
  "./js/ui/components/compare.js",
  "./js/ui/components/timer.js",
  "./js/ui/screens/end.js",
  "./js/ui/screens/home.js",
  "./js/ui/screens/onboarding.js",
  "./js/ui/screens/progress.js",
  "./js/ui/screens/session.js",
  "./js/ui/screens/settings.js"
];

// Même URL que le <link> de index.html (chargé en crossorigin, donc réponse CORS lisible).
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Lexend:wght@400;600&display=swap';

/** Best effort : ne fait JAMAIS échouer l'install. Sans réseau, les polices se cachent au premier affichage. */
async function precacheFonts() {
  try {
    const c = await caches.open(FONT_CACHE);
    const css = await fetch(FONTS_CSS, { mode: 'cors' });
    if (!css.ok) return;
    const text = await css.clone().text();
    await c.put(FONTS_CSS, css);
    const urls = [...text.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].trim().replace(/^['"]|['"]$/g, ''));
    await Promise.all(urls.map(async (u) => {
      const res = await fetch(u, { mode: 'cors' });
      if (res.ok) await c.put(u, res);
    }));
  } catch {
    // Pas de réseau ou réponse inattendue : on laisse le fetch s'en charger plus tard.
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))),
    precacheFonts(),
  ]));
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
      // ignoreVary : Google Fonts répond « Vary: User-Agent », sinon le précache ne serait jamais servi.
      const hit = await c.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      // Jamais de réponse opaque : on ne peut pas savoir si c'est une erreur.
      if (res.ok) c.put(req, res.clone());
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
