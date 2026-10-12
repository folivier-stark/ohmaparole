import { profileContent } from '../core/content-index.js';
import { isNeutral } from '../core/profil.js';

const cache = new Map();

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Contenu introuvable : ${path}`);
  return res.json();
}

/**
 * Les répliques de Louarn, ou null : les écrans retombent alors sur FIN, FIN_PARTIELLE et RETOUR
 * (texts.js). Le renard reste dessiné, il se tait seulement.
 */
async function loadLouarn(lang, file = 'louarn') {
  try {
    const data = await fetchJson(`content/${lang}/${file}.json`);
    return Array.isArray(data?.repliques) ? data : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

/** Pack « Mesure » (bilans, point de la semaine, réplique éclair), ou null si absent. */
async function loadMesure(lang, file = 'mesure') {
  try {
    return await fetchJson(`content/${lang}/${file}.json`);
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Le contenu d'un profil (spec profils §1). Pro : exactement les fichiers d'avant. Études et Quotidien : leur
 * programme et les fichiers *-quotidien.json en plus (js/core/content-index.js profileContent).
 */
export async function loadContent(lang = 'fr', profil = 'pro') {
  const key = `${lang}:${isNeutral(profil) ? profil : 'pro'}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const [program, exercises, extras, louarn, mesure] = await Promise.all([
        fetchJson('content/program.json'),
        fetchJson(`content/${lang}/exercises.json`),
        fetchJson(`content/${lang}/extras.json`),
        loadLouarn(lang),
        loadMesure(lang),
      ]);
      let neutral = {};
      if (isNeutral(profil)) {
        const [own, extrasQ, mesureQ, louarnQ] = await Promise.all([
          fetchJson(`content/program-${profil}.json`),
          fetchJson(`content/${lang}/extras-quotidien.json`),
          loadMesure(lang, 'mesure-quotidien'),
          loadLouarn(lang, 'louarn-quotidien'),
        ]);
        neutral = { programs: { [profil]: own }, extras: extrasQ, mesure: mesureQ, louarn: louarnQ };
      }
      return profileContent({ program, exercises, extras, louarn, mesure, neutral }, profil);
    })().catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key);
}
