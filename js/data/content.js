import { indexContent } from '../core/content-index.js';

let cached = null;

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Contenu introuvable : ${path}`);
  return res.json();
}

/**
 * Les répliques de Louarn, ou null : les écrans retombent alors sur FIN, FIN_PARTIELLE et RETOUR
 * (texts.js). Le renard reste dessiné, il se tait seulement.
 */
async function loadLouarn(lang) {
  try {
    const data = await fetchJson(`content/${lang}/louarn.json`);
    return Array.isArray(data?.repliques) ? data : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

/** Pack « Mesure » (bilans, point de la semaine, réplique éclair), ou null si absent. */
async function loadMesure(lang) {
  try {
    return await fetchJson(`content/${lang}/mesure.json`);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function loadContent(lang = 'fr') {
  if (!cached) {
    const [program, exercises, extras, louarn, mesure] = await Promise.all([
      fetchJson('content/program.json'),
      fetchJson(`content/${lang}/exercises.json`),
      fetchJson(`content/${lang}/extras.json`),
      loadLouarn(lang),
      loadMesure(lang),
    ]);
    cached = { ...indexContent({ program, exercises, extras }), louarn, mesure };
  }
  return cached;
}
