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
