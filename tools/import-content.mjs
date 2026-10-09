import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extractYamlBlocks, parseYamlSubset } from './yaml-subset.mjs';

const LANG = 'fr';
// Fondations (semaines 1-6), « Charisme et confiance » (7-12), « Situations de RDV » (13-18).
const SOURCES = ['docs/experts/expert-contenu.md', 'docs/experts/expert-contenu-charisme.md', 'docs/experts/expert-contenu-situations.md'];
const { items, consignes } = parseYamlSubset(SOURCES.map((f) => extractYamlBlocks(readFileSync(f, 'utf8'))).join('\n'));

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
  sources: SOURCES,
  items: items.map(norm),
  consignes: consignes.map((c) => ({ id: `${LANG}.${c.id}`, texte: c.texte })),
};
mkdirSync('content/fr', { recursive: true });
writeFileSync('content/fr/exercises.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(`${out.items.length} exercices et ${out.consignes.length} consignes écrits dans content/fr/exercises.json`);

// Pack « Mesure » (bilans, point de la semaine, réplique éclair) : bloc JSON unique du rapport.
const MESURE_SOURCE = 'docs/experts/expert-contenu-mesure.md';
const mesureBlock = readFileSync(MESURE_SOURCE, 'utf8').match(/```json\r?\n([\s\S]*?)```/);
if (!mesureBlock) throw new Error(`Bloc json introuvable dans ${MESURE_SOURCE}`);
const mesure = { lang: LANG, source: MESURE_SOURCE, ...JSON.parse(mesureBlock[1]) };
writeFileSync('content/fr/mesure.json', `${JSON.stringify(mesure, null, 2)}\n`);
console.log(`Pack Mesure écrit dans content/fr/mesure.json (${mesure.textesInedits.length} textes inédits)`);
