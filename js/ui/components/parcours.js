// Le Parcours (expert-gamification.md §4.2, maquette §5.2) : Louarn, le sentier de 18 pierres, les souvenirs.
// Sentier en HTML (listes ordonnées) plutôt qu'en SVG : lisible au lecteur d'écran, lacets en CSS (louarn.css).
import { h } from '../dom.js';
import { BLOCS, SESSIONS_PER_THEME, THEMES_PER_BLOC, THEMES_PER_CYCLE, stageFor, nextStage, themePosition } from '../../core/louarn.js';
import { createFox, reducedMotion } from './fox.js';

const NS = 'http://www.w3.org/2000/svg';
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** « 2 oct. » */
export function shortDateFr(key) {
  const [, m, d] = String(key).split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

const shape = (program) => ({
  spw: program?.sessionsPerWeek ?? SESSIONS_PER_THEME,
  weeks: program?.weeks?.length || THEMES_PER_CYCLE,
  name: (t) => program?.weeks?.[t - 1]?.theme ?? `Thème ${t}`,
});
const blocOf = (theme) => Math.floor((theme - 1) / THEMES_PER_BLOC) + 1;

function check(draw) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', draw ? 'lo-coche lo-coche-trace' : 'lo-coche');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M6 12.5l4 4 8-9');
  path.setAttribute('pathLength', '1');
  svg.append(path);
  return svg;
}

/** États des pierres du cycle en cours : 'faite' | 'actuelle' | 'prochaine' | 'plus-tard'. here : pierre de Louarn. */
function stoneStates(dailyCount, spw, weeks) {
  const pos = themePosition(dailyCount, spw, weeks);
  const done = pos.complete ? weeks : pos.themesDone;
  const current = pos.complete ? null : pos.theme;
  const states = Array.from({ length: weeks }, (_, i) => {
    const t = i + 1;
    if (t <= done) return 'faite';
    if (t === current) return 'actuelle';
    return current != null && t === current + 1 ? 'prochaine' : 'plus-tard';
  });
  return { pos, states, here: current ?? weeks };
}

const STATUS = { faite: 'fait', prochaine: 'prochain thème', 'plus-tard': 'plus tard' };

/** Une pierre. Le nom n'est montré que pour les pierres faites, l'actuelle et la prochaine (G §4.2). */
function stone({ theme, nom, state, louarn, doneInTheme, spw, draw = false, glide = false }) {
  const portrait = louarn ? createFox({ stage: 'portrait', size: 32, humeur: 'neutre', decorative: true }) : null;
  if (portrait && glide) portrait.classList.add('lo-glisse');
  const status = state === 'actuelle' ? `en cours, étape ${doneInTheme + 1} sur ${spw}` : STATUS[state];
  return h('li', { class: `lo-pierre lo-pierre-${state} lo-teinte-${blocOf(theme)}` },
    h('span', { class: 'lo-pierre-marque', 'aria-hidden': 'true' }, state === 'faite' ? check(draw) : null, portrait),
    h('span', { class: 'lo-pierre-texte' },
      state === 'plus-tard' ? null : h('span', { class: 'lo-pierre-nom' }, nom),
      h('span', { class: 'lo-sr' }, state === 'plus-tard' ? status : ` · ${status}`),
      state === 'actuelle'
        ? h('span', { class: 'lo-etapes', 'aria-hidden': 'true' },
          Array.from({ length: spw }, (_, i) => h('span', { class: i < doneInTheme ? 'lo-etape lo-etape-faite' : 'lo-etape' })))
        : null));
}

/**
 * Le Parcours, en tête de l'écran Progression.
 * dailyCount : séances comptées ; program : content/program.json ; souvenirs : louarn.souvenirs() (obtenus seulement) ;
 * lines (facultatif) : répliques de louarn.json, pour la légende de chaque souvenir.
 */
export function createParcours({ dailyCount = 0, program, souvenirs = [], lines = null } = {}) {
  const { spw, weeks, name } = shape(program);
  const goal = spw * weeks;
  const n = Math.max(0, Math.floor(Number(dailyCount) || 0));
  const stage = stageFor(n);
  const next = nextStage(n);
  const { pos, states, here } = stoneStates(n, spw, weeks);

  const head = h('div', { class: 'lo-parcours-tete' },
    h('figure', { class: 'lo-stade-actuel' },
      createFox({ stage: stage.id, size: 120 }),
      h('figcaption', { class: 'lo-stade-nom' }, stage.nom)),
    next
      ? h('figure', { class: 'lo-stade-suivant' },
        createFox({ stage: next.stage.id, size: 96, shadow: true }),
        h('figcaption', {}, `Encore ${plural(next.remaining, 'séance')} avant le ${next.stage.nom}`))
      : h('p', { class: 'lo-fini' }, 'Le sentier est fait. Tu continues à ton rythme.'));

  const blocs = Array.from({ length: Math.ceil(weeks / THEMES_PER_BLOC) }, (_, b) => {
    const from = b * THEMES_PER_BLOC + 1;
    const themes = Array.from({ length: Math.min(THEMES_PER_BLOC, weeks - from + 1) }, (_, i) => from + i);
    return h('section', { class: `lo-bloc lo-teinte-${b + 1}` },
      h('p', { class: 'lo-bloc-nom' }, BLOCS[b]?.nom ?? `Bloc ${b + 1}`),
      h('ol', { class: 'lo-pierres', start: from },
        themes.map((t) => stone({
          theme: t, nom: name(t), state: states[t - 1], louarn: t === here, doneInTheme: pos.doneInTheme, spw,
        }))));
  });

  const legend = (s) => (lines ?? []).find((l) => l.id === s.ligne || l.condition === `trophee:${s.id}`)?.texte ?? null;
  const kept = (souvenirs ?? []).filter((s) => s && s.nom);

  return h('section', { class: 'lo-parcours', 'aria-label': 'Ton parcours' },
    head,
    h('p', { class: 'lo-compte' }, n < goal ? `${plural(n, 'séance')} sur ${goal}` : plural(n, 'séance')),
    h('div', { class: 'lo-sentier' },
      pos.cycle > 1 && !pos.complete ? h('p', { class: 'lo-cycle' }, `Cycle ${pos.cycle}`) : null,
      blocs),
    n < goal ? h('p', { class: 'muted small' }, `À ${goal}, l’anglais et l’espagnol se débloquent.`) : null,
    kept.length
      ? h('section', { class: 'lo-souvenirs' },
        h('h3', { class: 'lo-souvenirs-titre' }, 'Tes souvenirs'),
        h('ul', { class: 'lo-souvenirs-liste' }, kept.map((s) => h('li', { class: 'lo-souvenir' },
          createFox({ stage: 'portrait', size: 32, humeur: 'content', decorative: true }),
          h('span', { class: 'lo-souvenir-texte' },
            h('span', { class: 'lo-souvenir-nom' }, s.nom),
            s.dateKey ? ` · ${shortDateFr(s.dateKey)}` : null,
            legend(s) ? h('span', { class: 'lo-souvenir-legende' }, legend(s)) : null)))),
        h('p', { class: 'muted small' }, 'D’autres viendront en chemin.'))
      : null);
}

/**
 * Mini-sentier de l'écran de fin, quand un thème vient de se terminer (G §4.4, maquette §5.3) :
 * la pierre faite (la coche se dessine), la nouvelle (le portrait y glisse) et la suivante.
 * animate: false (Renard discret) ou prefers-reduced-motion : état final, sans mouvement.
 */
export function createMiniSentier({ dailyCount = 0, program, animate = true } = {}) {
  const { spw, weeks, name } = shape(program);
  const { pos, states, here } = stoneStates(dailyCount, spw, weeks);
  const done = pos.complete ? weeks : pos.themesDone;
  if (done < 1) return null;
  const move = animate && !reducedMotion();
  const themes = pos.complete ? [weeks - 2, weeks - 1, weeks] : [done, done + 1, done + 2].filter((t) => t <= weeks);
  return h('ol', { class: 'lo-mini', 'aria-label': 'Ton sentier' },
    themes.map((t) => stone({
      theme: t, nom: name(t), state: states[t - 1], louarn: t === here, doneInTheme: pos.doneInTheme, spw,
      draw: move && t === done, glide: move && t === here && !pos.complete,
    })));
}
