import { readFileSync } from 'node:fs';
import { indexContent } from '../js/core/content-index.js';

export const readJson = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

export const loadTestContent = () => indexContent({
  program: readJson('content/program.json'),
  exercises: readJson('content/fr/exercises.json'),
  extras: readJson('content/fr/extras.json'),
});
