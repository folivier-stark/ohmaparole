import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extractYamlBlocks, parseYamlSubset } from './yaml-subset.mjs';

const LANG = 'fr';
const SOURCE = 'docs/experts/expert-contenu.md';
const { items, consignes } = parseYamlSubset(extractYamlBlocks(readFileSync(SOURCE, 'utf8')));

const norm = (r) => {
  const o = {
    id: `${LANG}.${r.id}`,
    bloc: r.bloc,
    semaineMin: r.semaine_min,
    dureeS: r.duree_s,
    titre: r.titre,
    consigne: r.consigne ?? [],
    texte: r.texte ?? null,
    pourquoi: r.pourquoi ?? '',
  };
  if (r.type) o.type = r.type;
  if (r.passage) {
    o.passage = r.passage;
    o.reformulationRef = r.reformulation_ref;
    o.detailCache = r.detail_cache;
  }
  return o;
};

const out = {
  lang: LANG,
  source: SOURCE,
  items: items.map(norm),
  consignes: consignes.map((c) => ({ id: `${LANG}.${c.id}`, texte: c.texte })),
};
mkdirSync('content/fr', { recursive: true });
writeFileSync('content/fr/exercises.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`${out.items.length} exercices et ${out.consignes.length} consignes écrits dans content/fr/exercises.json`);
