import { readFileSync } from 'node:fs';
import { indexContent, profileContent } from '../js/core/content-index.js';

export const readJson = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

export const loadTestContent = () => indexContent({
  program: readJson('content/program.json'),
  exercises: readJson('content/fr/exercises.json'),
  extras: readJson('content/fr/extras.json'),
});

/** Le contenu d'un profil, tel que l'appli le charge (js/data/content.js). */
export const loadProfileContent = (profil) => profileContent({
  program: readJson('content/program.json'),
  exercises: readJson('content/fr/exercises.json'),
  extras: readJson('content/fr/extras.json'),
  louarn: readJson('content/fr/louarn.json'),
  mesure: readJson('content/fr/mesure.json'),
  neutral: profil === 'pro' ? {} : {
    programs: { [profil]: readJson(`content/program-${profil}.json`) },
    extras: readJson('content/fr/extras-quotidien.json'),
    mesure: readJson('content/fr/mesure-quotidien.json'),
    louarn: readJson('content/fr/louarn-quotidien.json'),
  },
}, profil);
