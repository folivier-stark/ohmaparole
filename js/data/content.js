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
