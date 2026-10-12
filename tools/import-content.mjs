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

// Pack « Mesure » (bilans, point de la semaine, réplique éclair) : bloc JSON unique du rapport.
const MESURE_SOURCE = 'docs/experts/expert-contenu-mesure.md';
const mesureBlock = readFileSync(MESURE_SOURCE, 'utf8').match(/```json\r?\n([\s\S]*?)```/);
if (!mesureBlock) throw new Error(`Bloc json introuvable dans ${MESURE_SOURCE}`);
const mesure = { lang: LANG, source: MESURE_SOURCE, ...JSON.parse(mesureBlock[1]) };
writeFileSync('content/fr/mesure.json', `${JSON.stringify(mesure, null, 2)}\n`);
console.log(`Pack Mesure écrit dans content/fr/mesure.json (${mesure.textesInedits.length} textes inédits)`);

// ─── Profils Études et Quotidien (spec 2026-10-12-ohmaparole-profils-design.md) ───────────────────
// Fondations communes (semaines 1-6) : virelangues A01-A14 gardés, phrases QA, écoutes QL, postures QP,
// consignes QC du « moment important ». Puis « Prendre sa place » (Études) ou « Confiance au quotidien »
// (Quotidien), semaines 7 à 12. Les exercices sont fusionnés dans exercises.json (ids uniques), les
// consignes QC dans une liste distincte (consignesQuotidien).
const COMMUN = 'docs/experts/contenu-commun-quotidien.md';
const PACKS = {
  etudes: { source: 'docs/experts/contenu-etudes.md', bloc: 'Prendre sa place' },
  quotidien: { source: 'docs/experts/contenu-quotidien.md', bloc: 'Confiance au quotidien' },
};
const MESURE_Q = 'docs/experts/contenu-mesure-quotidien.md';
const readMd = (f) => readFileSync(f, 'utf8');
const parseFile = (f) => parseYamlSubset(extractYamlBlocks(readMd(f)));

/** Les lignes « | **7** | **Thème** | … | » d'un tableau de semaines. */
function weekRows(md) {
  return [...md.matchAll(/^\| \*\*(\d+)\*\* \| \*\*(.+?)\*\* \|(.*)$/gm)].map((m) => ({
    week: Number(m[1]), theme: m[2].replace(/'/g, '’'), cells: m[3].split('|').map((c) => c.trim()),
  }));
}

/** « A03 à A05 + **QA03, QA04** » → ['A03', 'A04', 'A05', 'QA03', 'QA04']. */
function expandIds(cell) {
  const ids = [];
  const text = cell.replace(/\*\*/g, '');
  for (const m of text.matchAll(/\b([A-Z]+)(\d+)(?: à \1(\d+))?/g)) {
    const [, p, a, b] = m;
    for (let i = Number(a); i <= Number(b ?? a); i++) ids.push(`${p}${String(i).padStart(a.length, '0')}`);
  }
  return ids;
}

const commun = parseFile(COMMUN);
const fondations = weekRows(readMd(COMMUN)).map(({ week, theme, cells }) => ({
  week, theme, articulation: expandIds(cells[0]), ecoute: expandIds(cells[1]), posture: expandIds(cells[2]),
}));
if (fondations.length !== 6) throw new Error(`${COMMUN} : 6 semaines attendues, ${fondations.length} trouvées`);

const packItems = {};
for (const [profil, pack] of Object.entries(PACKS)) {
  const { items: list } = parseFile(pack.source);
  packItems[profil] = list;
  const weeks = weekRows(readMd(pack.source)).map(({ week, theme }) => {
    const of = (bloc) => list.filter((it) => it.semaine_min === week && it.bloc === bloc).map((it) => it.id);
    return { week, theme, articulation: of('articulation'), ecoute: of('ecoute'), posture: of('posture') };
  });
  const program = {
    profil,
    sessionsPerWeek: 4,
    blocs: [{ id: 1, nom: 'Fondations' }, { id: 2, nom: pack.bloc }],
    weeks: [...fondations, ...weeks],
  };
  if (program.weeks.length !== 12) throw new Error(`${pack.source} : 12 semaines attendues`);
  writeFileSync(`content/program-${profil}.json`, `${JSON.stringify(program, null, 2)}\n`);
  console.log(`Programme ${profil} écrit dans content/program-${profil}.json (${program.weeks.length} semaines)`);
}

const merged = {
  ...out,
  sources: [...SOURCES, COMMUN, PACKS.etudes.source, PACKS.quotidien.source],
  items: [...out.items, ...[...commun.items, ...packItems.etudes, ...packItems.quotidien].map(norm)],
  consignesQuotidien: commun.consignes.map((c) => ({ id: `${LANG}.${c.id}`, texte: c.texte })),
};
const allIds = [...merged.items, ...merged.consignes, ...merged.consignesQuotidien].map((it) => it.id);
if (new Set(allIds).size !== allIds.length) throw new Error('exercises.json : identifiants en double');
writeFileSync('content/fr/exercises.json', `${JSON.stringify(merged, null, 2)}\n`);
console.log(`${merged.items.length} exercices (dont ${merged.items.length - out.items.length} non pro), ${out.consignes.length} consignes et ${merged.consignesQuotidien.length} consignes QC écrits dans content/fr/exercises.json`);

/** Le bloc JSON qui suit le marqueur `<!-- nom -->` (seul sur sa ligne). */
function jsonAfter(md, marker, file) {
  const at = md.search(new RegExp(`^<!-- ${marker} -->\\s*$`, 'm'));
  const m = at < 0 ? null : md.slice(at).match(/```json\r?\n([\s\S]*?)```/);
  if (!m) throw new Error(`Bloc json « ${marker} » introuvable dans ${file}`);
  return JSON.parse(m[1]);
}
function lastJson(md, file) {
  const all = [...md.matchAll(/```json\r?\n([\s\S]*?)```/g)];
  if (!all.length) throw new Error(`Bloc json introuvable dans ${file}`);
  return JSON.parse(all.at(-1)[1]);
}

const mesureMd = readMd(MESURE_Q);
const mesureQ = jsonAfter(mesureMd, 'mesure', MESURE_Q);
writeFileSync('content/fr/mesure-quotidien.json', `${JSON.stringify({ lang: LANG, source: MESURE_Q, ...mesureQ }, null, 2)}\n`);
console.log(`Pack Mesure non pro écrit dans content/fr/mesure-quotidien.json (${mesureQ.textesInedits.length} textes inédits)`);

// Le « pourquoi » des virelangues gardés : neutre pour A10, A12 et A14 (les autres le sont déjà).
const POURQUOI_NEUTRES = {
  'fr.A10': 'Les mots longs se travaillent : à l’oral, ce sont eux qu’on avale en premier.',
  'fr.A12': 'Un groupe de consonnes bien passé, et toute la phrase devient plus claire.',
  'fr.A14': 'Enchaîner sans trébucher, c’est garder l’attention de ceux qui t’écoutent.',
};
const extrasQ = {
  lang: LANG,
  sources: [COMMUN, MESURE_Q],
  reference: mesureQ.reference,
  ...lastJson(readMd(COMMUN), COMMUN),
  pourquoi: POURQUOI_NEUTRES,
};
writeFileSync('content/fr/extras-quotidien.json', `${JSON.stringify(extrasQ, null, 2)}\n`);
console.log('Extras neutres écrits dans content/fr/extras-quotidien.json');

// Répliques de Louarn : ids jamais tirés pour un profil non pro (proOnly), leurs remplaçantes, et 12 répliques
// de thème propres à chaque profil (condition composée « profil:x&theme:n », prioritaire sur « theme:n »).
const THEMES_PROFIL = {
  etudes: [
    'Nouveau bloc : prendre sa place. On commence par l’exposé, du plan à la conclusion.',
    'Cette semaine, le jury. Tu reformules la question, tu respires, puis tu réponds.',
    'L’entretien de stage : raconter un projet, ce que tu en as appris, et tes questions.',
    'Le projet de groupe : défendre ton idée sans hausser le ton, et écouter celle des autres.',
    'Te présenter en une minute : qui tu es, ce qui t’intéresse, ce que tu cherches.',
    'Dernier thème : parler sur le terrain, dans le bruit, et faire confirmer la consigne.',
  ],
  quotidien: [
    'Nouveau bloc : la confiance au quotidien. D’abord, oser parler en groupe.',
    'Cette semaine, le désaccord : le dire calmement, en commençant par « moi ».',
    'Demander clairement : ce que tu veux, pour quand, et pourquoi. Puis tu laisses répondre.',
    'Raconter une histoire : le décor, une pause avant la surprise, puis la chute.',
    'Écouter vraiment un proche : son émotion d’abord, sans conseil tout de suite.',
    'Dernier thème : parler devant les autres. Un silence, puis ta première phrase.',
  ],
};
const louarnQ = jsonAfter(mesureMd, 'louarn', MESURE_Q);
const themeLines = Object.entries(THEMES_PROFIL).flatMap(([profil, list]) => list.map((texte, i) => ({
  id: `${profil === 'etudes' ? 'pe' : 'pq'}-th-${String(i + 7).padStart(2, '0')}`,
  moment: 'theme',
  condition: `profil:${profil}&theme:${i + 7}`,
  texte,
})));
const louarnOut = { lang: LANG, source: MESURE_Q, proOnly: louarnQ.proOnly, repliques: [...louarnQ.repliques, ...themeLines] };
writeFileSync('content/fr/louarn-quotidien.json', `${JSON.stringify(louarnOut, null, 2)}\n`);
console.log(`Louarn non pro écrit dans content/fr/louarn-quotidien.json (${louarnOut.proOnly.length} retirées, ${louarnOut.repliques.length} ajoutées)`);
