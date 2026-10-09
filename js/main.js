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
import { scheduleReanalysis } from './audio/voice-measure.js';

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
  // Mesures de la voix manquantes ou d'un ancien algorithme : recalculées depuis les Blobs, en arrière-plan.
  scheduleReanalysis({ repo, syllables: content.reference.syllabes });
}

boot().catch((err) => {
  document.getElementById('app').textContent = `OhMaParole n'a pas pu démarrer : ${err.message}`;
});
