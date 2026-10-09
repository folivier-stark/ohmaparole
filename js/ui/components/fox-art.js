// Les dessins de Louarn, recopiés de docs/experts/expert-gamification.md §1.5 (ne pas retoucher à la main).
// Chaque SVG est reconstruit à l'octet près : style commun + corps du stade + tête commune.
// Pur : aucune dépendance au DOM, aucune requête réseau. Le test louarn.test.mjs le compare à G.

/** Règles communes (couleurs --fox-*, expressions par data-humeur, silhouette .lo-ombre). */
export const FOX_STYLE = '.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}';

/** La tête, identique pour le portrait et les 6 stades (mise à l'échelle dans les stades). */
export const FOX_HEAD = '<path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g>';

/** aria-label d'origine, par dessin. */
export const FOX_LABELS = {
  portrait: 'Louarn',
  1: 'Louarn, Renardeau',
  2: 'Louarn, Jeune renard',
  3: 'Louarn, Renard d’aplomb',
  4: 'Louarn, Renard assuré',
  5: 'Louarn, Renard posé',
  6: 'Louarn, Renard charismatique',
};

/** Corps de chaque stade, en deux morceaux autour de la tête : [avant, après]. */
const BODIES = {
  1: [
    '<path class="lo-b" d="M68 114Q84 118 90 100Q82 102 62 112Z"/><path class="lo-l" d="M84 104Q89 101 90 100Q86 99 84 104Z"/><path class="lo-b" d="M41 92Q54 85 67 92Q73 102.8 71 116H37Q35 102.8 41 92Z"/><path class="lo-l" d="M43.6 92Q54 113.6 64.4 92Z"/><path class="lo-l" d="M45 116a4 3 0 0 1 8 0ZM55 116a4 3 0 0 1 8 0Z"/><g transform="translate(54 74) scale(0.46) translate(-60 -58)">',
    '</g>',
  ],
  2: [
    '<path class="lo-b" d="M70 114Q92 118 98 92Q88 96 64 112Z"/><path class="lo-l" d="M92 98Q97 94 98 92Q93 92 92 98Z"/><path class="lo-b" d="M40 82Q54 75 68 82Q75 97.3 73 116H35Q33 97.3 40 82Z"/><path class="lo-l" d="M42.8 82Q54 109.2 65.2 82Z"/><path class="lo-d" d="M43 105.8q2.5 -3 5 0V116h-5ZM60 105.8q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 62) scale(0.43) translate(-60 -58)">',
    '</g>',
  ],
  3: [
    '<path class="lo-b" d="M71 114Q98 118 103 82Q92 88 65 112Z"/><path class="lo-l" d="M98 87Q102.5 83.5 103 82Q98.5 81.5 98 87Z"/><path class="lo-b" d="M39 72Q54 65 69 72Q76 91.8 74 116H34Q32 91.8 39 72Z"/><path class="lo-l" d="M42 72Q54 105 66 72Z"/><path class="lo-d" d="M43 101.9q2.5 -3 5 0V116h-5ZM60 101.9q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 51) scale(0.41) translate(-60 -58)">',
    '</g>',
  ],
  4: [
    '<path class="lo-b" d="M72 114Q104 116 107 72Q95 80 66 112Z"/><path class="lo-l" d="M102 77Q106.5 73.5 107 72Q102.5 71.5 102 77Z"/><path class="lo-b" d="M39 64Q54 57 69 64Q77 87.4 75 116H33Q31 87.4 39 64Z"/><path class="lo-l" d="M42 64Q54 100.4 66 64Z"/><path class="lo-d" d="M43 99.4q2.5 -3 5 0V116h-5ZM60 99.4q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 42) scale(0.4) translate(-60 -58)">',
    '</g>',
  ],
  5: [
    '<path class="lo-b" d="M72 114Q108 114 110 64Q96 72 66 112Z"/><path class="lo-l" d="M105 68Q109.5 65 110 64Q105.5 63 105 68Z"/><path class="lo-b" d="M39 57Q54 50 69 57Q77 83.6 75 116H33Q31 83.6 39 57Z"/><path class="lo-l" d="M42 57Q54 98.3 66 57Z"/><path class="lo-d" d="M43 98.3q2.5 -3 5 0V116h-5ZM60 98.3q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 33) scale(0.39) translate(-60 -58)">',
    '</g>',
  ],
  6: [
    '<path class="lo-b" d="M72 114Q111 112 112 58Q97 66 66 112Z"/><path class="lo-l" d="M107 62Q111.5 59 112 58Q107.5 57 107 62Z"/><path class="lo-b" d="M39 52Q54 45 69 52Q77 80.8 75 116H33Q31 80.8 39 52Z"/><path class="lo-l" d="M42 52Q54 96.8 66 52Z"/><path class="lo-d" d="M43 96.8q2.5 -3 5 0V116h-5ZM60 96.8q2.5 -3 5 0V116h-5Z"/><path class="lo-e" fill="currentColor" stroke="var(--fox-dark,#1F2A30)" stroke-width="1.5" stroke-linejoin="round" d="M38 50Q54 57 70 50V56Q54 63 38 56ZM57 58l7 18-6 1-5-18Z"/><g transform="translate(55 27) rotate(-6) scale(0.39) translate(-60 -58)">',
    '</g>',
  ],
};

/** 'portrait' ou 1 à 6. */
export const FOX_DRAWINGS = ['portrait', 1, 2, 3, 4, 5, 6];

/** Le SVG complet de G, sous forme de chaîne. drawing : 'portrait' ou un stade de 1 à 6. */
export function foxSvg(drawing) {
  const key = drawing === 'portrait' ? 'portrait' : Number(drawing);
  if (!FOX_DRAWINGS.includes(key)) throw new Error(`Louarn : dessin inconnu (${drawing})`);
  const body = key === 'portrait' ? FOX_HEAD : `${BODIES[key][0]}${FOX_HEAD}${BODIES[key][1]}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${FOX_LABELS[key]}" data-humeur="neutre"><style>${FOX_STYLE}</style>${body}</svg>`;
}
