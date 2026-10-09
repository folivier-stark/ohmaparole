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
