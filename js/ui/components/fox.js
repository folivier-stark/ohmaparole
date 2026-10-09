// Louarn en SVG inline (expert-gamification.md §1.5). Jamais en balise image : on perdrait les variables --fox-* et le mode sombre.
// Les dessins sont des chaînes (fox-art.js), analysées une fois puis clonées : aucune requête réseau.
// Animations : classes de css/louarn.css, jamais posées si prefers-reduced-motion (lu à chaque appel, G §4.4).
import { h } from '../dom.js';
import { foxSvg } from './fox-art.js';
import { STAGES } from '../../core/louarn.js';

const HUMEURS = ['neutre', 'content', 'clin'];
/** G §1.5 : un stade en pied ne s'affiche jamais sous 96 px (la tête y est réduite à 40 %). */
const MIN_STAGE_SIZE = 96;
const ANIMATIONS = { saut: 'lo-saut', apparait: 'lo-apparait' };
const parsed = new Map();

/** prefers-reduced-motion: reduce, relu à chaque affichage. */
export function reducedMotion() {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

const drawingOf = (stage) => (stage === 'portrait' ? 'portrait' : Math.min(6, Math.max(1, Math.floor(Number(stage)) || 1)));

function cloneDrawing(drawing) {
  if (!parsed.has(drawing)) parsed.set(drawing, new DOMParser().parseFromString(foxSvg(drawing), 'image/svg+xml').documentElement);
  return document.importNode(parsed.get(drawing), true);
}

/**
 * Le renard, en élément <svg>.
 * stage : 1 à 6 (en pied) ou 'portrait' (tête seule, 32 à 48 px) ;
 * humeur : 'neutre' | 'content' | 'clin' ; size : côté en px ;
 * shadow : silhouette pointillée du stade suivant (lo-ombre), sans yeux, couleur ni écharpe ;
 * decorative : aria-hidden, quand une bulle à côté se lit déjà ;
 * animate : 'saut' (fin de séance, 0,8 s) | 'apparait' (0,3 s) | null.
 */
export function createFox({ stage = 1, humeur = 'neutre', size = 96, shadow = false, decorative = false, animate = null } = {}) {
  const drawing = drawingOf(stage);
  const svg = cloneDrawing(drawing);
  const px = drawing === 'portrait' ? size : Math.max(MIN_STAGE_SIZE, size);
  svg.setAttribute('width', String(px));
  svg.setAttribute('height', String(px));
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('data-humeur', !shadow && HUMEURS.includes(humeur) ? humeur : 'neutre');
  svg.classList.add('lo-fox', drawing === 'portrait' ? 'lo-portrait' : `lo-stade-${drawing}`);
  // L'écharpe suit currentColor : Iroise dans les deux modes (G §1.4), même sans louarn.css.
  svg.style.color = 'var(--fox-scarf, #1D5C6B)';
  if (shadow) {
    svg.classList.add('lo-ombre');
    svg.setAttribute('aria-label', drawing === 'portrait' ? 'Silhouette de Louarn' : `Silhouette du stade suivant : ${STAGES[drawing - 1].nom}`);
  }
  if (decorative) {
    svg.setAttribute('aria-hidden', 'true');
    svg.removeAttribute('role');
    svg.removeAttribute('aria-label');
  }
  if (ANIMATIONS[animate] && !reducedMotion()) svg.classList.add(ANIMATIONS[animate]);
  return svg;
}

/**
 * Montée de stade (G §4.4) : l'ancien stade grandit et se fond dans le nouveau, en content, 1 s au plus.
 * Sous prefers-reduced-motion, ou animate: false (Renard discret), le nouveau stade s'affiche directement.
 */
export function createStageUp({ from, to, size = 150, animate = true } = {}) {
  const target = drawingOf(to);
  const px = Math.max(MIN_STAGE_SIZE, size);
  const wrap = h('div', { class: 'lo-montee', role: 'img', 'aria-label': `Louarn, ${STAGES[target - 1].nom}`, style: `width:${px}px;height:${px}px` });
  const after = createFox({ stage: target, humeur: 'content', size: px, decorative: true });
  if (!animate || reducedMotion() || from == null || drawingOf(from) === target) {
    wrap.append(after);
    return wrap;
  }
  const before = createFox({ stage: from, size: px, decorative: true });
  before.classList.add('lo-montee-avant');
  after.classList.add('lo-montee-apres');
  wrap.append(before, after);
  return wrap;
}

/**
 * Le renard et sa bulle d'une ligne (G §2.1, maquette §5.1). texte null : le renard reste là, sans bulle.
 * vertical : renard au-dessus de la bulle (écran de fin), sinon à gauche (accueil).
 */
export function createBulle({ texte = null, stage = 1, humeur = 'neutre', size = 96, animate = null, vertical = false } = {}) {
  const fox = createFox({ stage, humeur, size, animate, decorative: Boolean(texte) });
  return h('div', { class: vertical ? 'lo-bulle-wrap lo-bulle-colonne' : 'lo-bulle-wrap' },
    fox,
    texte ? h('p', { class: 'lo-bulle' }, texte) : null);
}
