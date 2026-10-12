import { defineRoutes, startRouter } from './router.js';
import * as repo from './data/repo.js';
import { loadContent } from './data/content.js';
import { isProfil } from './core/profil.js';
import { setSpeechEnabled } from './platform/speech.js';
import { setHapticsEnabled } from './platform/haptics.js';
import { requestPersist } from './platform/storage.js';
import * as onboarding from './ui/screens/onboarding.js';
import * as home from './ui/screens/home.js';
import * as session from './ui/screens/session.js';
import * as end from './ui/screens/end.js';
import * as progress from './ui/screens/progress.js';
import * as settings from './ui/screens/settings.js';
import * as bilan from './ui/screens/bilan.js';
import * as proche from './ui/screens/proche.js';
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

/** Le contenu du profil, avec la date du dernier changement (la mesure de la voix repart de là). */
async function profilContent(profil) {
  const [content, since] = await Promise.all([loadContent('fr', profil), repo.getMeta('profilDepuis', 0)]);
  return { ...content, profilSince: Number(since) || 0 };
}

/** Réanalyse des prises sans mesure à l'algorithme courant (syllabes de tous les textes, quel que soit le profil). */
const reanalysisOptions = (content) => ({ repo, syllables: content.referencePro.syllabes, syllablesById: content.syllablesById });

async function boot() {
  registerServiceWorker();
  const [onboarded, stored] = await Promise.all([repo.getMeta('onboarded', false), repo.getMeta('profil', null)]);
  const profil = isProfil(stored) ? stored : 'pro';
  const ctx = {
    repo,
    content: await profilContent(profil),
    // Utilisateur d'avant les profils : la carte « Ton profil ? » de l'accueil bloque jusqu'à sa réponse.
    needsProfil: Boolean(onboarded) && !isProfil(stored),
    /**
     * Enregistre le profil et recharge le contenu. change : changement depuis les Réglages, la mesure de la
     * voix repart de zéro (meta profilDepuis). Renvoie le nouveau contenu.
     */
    async applyProfil(next, { change = false } = {}) {
      if (!isProfil(next)) throw new RangeError(`Profil inconnu : ${next}`);
      await repo.setMeta('profil', next);
      if (change) await repo.setMeta('profilDepuis', Date.now());
      ctx.content = await profilContent(next);
      ctx.needsProfil = false;
      return ctx.content;
    },
  };
  const prefs = await repo.getSettings();
  setSpeechEnabled(prefs.voice);
  setHapticsEnabled(prefs.vibrate);
  defineRoutes({ onboarding, home, session, end, progress, settings, bilan, proche }, ctx);
  if (!onboarded && !location.hash.startsWith('#/onboarding')) {
    history.replaceState(null, '', '#/onboarding');
  }
  startRouter();
  if (await repo.getMeta('persistAsked', false)) requestPersist();
  // Mesures de la voix manquantes ou d'un ancien algorithme : recalculées depuis les Blobs, en arrière-plan.
  scheduleReanalysis(reanalysisOptions(ctx.content));
}

boot().catch((err) => {
  document.getElementById('app').textContent = `OhMaParole n'a pas pu démarrer : ${err.message}`;
});
