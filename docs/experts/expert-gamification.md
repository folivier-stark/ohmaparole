# OhMaParole : Louarn, le renard qui grandit (gamification légère)

> Rédigé le 09/10/2026 par un trio : designer UX (adultes TDAH, gamification éthique), illustrateur·rice SVG, auteur·rice de micro-textes.
> Demande de Fred : une appli « légèrement plus gamifiée », avec un petit renard qui glisse des réflexions, des conseils et des clins d'œil. **Pièce centrale** (ajout du 09/10) : le renard **grandit avec les séances**, de renardeau à renard charismatique à la 72ᵉ, sur le principe de la graine qui pousse dans Fruitvisor.
> Lu avant d'écrire : `expert-ux.md` (§6 direction visuelle, §7 pièges), `2026-10-09-ohmaparole-design.md`, `2026-10-09-ohmaparole-tableau-design.md`, `expert-contenu.md`, `expert-contenu-situations.md`, `js/core/texts.js`, `progress.js`, `dashboard.js`, `planner.js`, `home.js`, `end.js`.
> **Statut : proposition.** Elle modifie la spec V1 §10 (« badges, niveaux » hors V1) : il faut **l'arbitrage de Fred** avant de coder (voir §6).

---

## 0. En une minute

| Élément | Décision |
|---|---|
| **Personnage** | **Louarn** (« renard » en breton, se dit « lou-arne »). Il est complice, malin et sobre, et il n'est jamais triste. |
| **Pièce centrale** | Il grandit en **6 stades** selon le **nombre de séances comptées** (`dailyCount`). Il ne régresse jamais. Le stade final, à 72 séances, est le renard charismatique, qui porte une écharpe. |
| **Où il parle** | Une bulle d'une ligne, **à la place** d'un texte qui existe déjà : la ligne de contexte de l'accueil, le message de fin, le « Tu y vas. » avant un RDV. Il ne prend jamais une ligne de plus, et il ne parle jamais pendant l'effort. |
| **Répliques** | **135**, en JSON. Elles font 90 caractères au maximum, sans chiffre ni point d'exclamation (vérifié par script). Il y en a **39** de type `tip`, tirées des contenus. |
| **Parcours** | Un sentier de 18 pierres en 3 couleurs, placé **en tête de l'écran Progression**. Pas de nouvel onglet. |
| **Souvenirs** | **11** souvenirs, liés à de vrais accomplissements, jamais à une série. Seuls ceux qui sont obtenus s'affichent. |
| **Célébrations** | Une seconde au maximum, coupable, et `prefers-reduced-motion` est respecté. Pas de son ajouté, pas de confettis. |
| **Refusé** | XP, niveaux chiffrés, classements, vies, séries, boutique d'accessoires, renard qui a faim ou qui attend, grille de trophées verrouillés. |

---

## 1. Le personnage

### 1.1 Nom

**Louarn**, qui veut dire « renard » en breton. C'est la Bretagne discrète voulue par la direction visuelle (`expert-ux.md` §6.1) : un mot vrai, sans triskell ni hermine. Le nom est court et se lit en une fraction de seconde. Le mot reste lisible pour qui ne parle pas breton.

### 1.2 Caractère (5 lignes)

1. **Complice** : il est de ton côté, jamais au-dessus. Il parle comme un collègue de terrain, pas comme un prof ni comme un coach de salle de sport.
2. **Malin** : il repère tes pièges (charmer, laisser déborder, combler le silence) et les nomme d'un mot, sans sermon.
3. **Bienveillant** : une pause n'est jamais un sujet. Il accueille, il ne compte pas, et il n'est jamais triste ni déçu.
4. **Sobre** : une ligne. Pas de point d'exclamation, pas de diminutif, pas de « bravo champion ». Il ne promet rien.
5. **Humour léger** : des clins d'œil de renard (terrier, flair, sentier) et un peu d'autodérision, jamais aux dépens de Fred.

### 1.3 Les 6 stades : il grandit avec toi

**Règle unique :** `stade = f(dailyCount)`, c'est-à-dire le nombre de séances quotidiennes et de reprises comptées (au moins 60 s), comme pour l'objectif 72 (`dashboard.js`, `isDailyCounted`). Le calendrier n'intervient jamais, et les routines « Avant un RDV » ne font pas grandir le renard.

| Stade | Séances comptées | Nom (sobre) | Ce qui change à l'œil | Moment du programme | Réplique |
|---|---|---|---|---|---|
| 1 | 0 à 11 | **Renardeau** | Petit, assis, tête très grosse par rapport au corps, pattes repliées, queue courte | Thèmes 1 à 3 | `sta-01` |
| 2 | 12 à 23 | **Jeune renard** | Plus haut, les pattes avant apparaissent (chaussettes sombres), la queue s'allonge | Thèmes 4 à 6 | `sta-02` |
| 3 | 24 à 35 | **Renard d'aplomb** | Le corps s'allonge, l'assise est stable, la tête s'éloigne des épaules | Fin du bloc Fondations | `sta-03` |
| 4 | 36 à 47 | **Renard assuré** | Il se tient plus droit, le plastron s'ouvre, la queue remonte | Milieu du bloc Charisme | `sta-04` |
| 5 | 48 à 71 | **Renard posé** | Taille adulte, cou dégagé, tête relevée | Fin du bloc Charisme, tout le bloc RDV | `sta-05` |
| 6 | 72 et plus | **Renard charismatique** | Pleine hauteur, tête relevée et légèrement inclinée, regard posé, **écharpe nouée** couleur Iroise, longue queue haute | Programme complet | `sta-06`, puis `sta-07` |

**Pourquoi ces seuils.** Ils tombent sur une fin de thème (multiples de 4) et deux d'entre eux sur une fin de bloc (24 et 48). Au rythme visé de 15 séances par mois, le renardeau grandit pour la première fois au bout de 3 semaines environ : la première récompense arrive vite, quand le risque d'abandon est le plus fort. Le palier de 48 à 71 est plus long ; il est compensé par les déblocages de thème tous les 4 et les souvenirs du terrain (voir §6, point 7).

**Les garde-fous de la croissance**

| Règle | Concrètement |
|---|---|
| **Jamais de régression** | Il ne rapetisse pas, ne maigrit pas et ne perd pas son écharpe. Une absence de trois mois ne change rien au dessin. |
| **Jamais d'émotion liée à l'absence** | Pas de renard triste, endormi, affamé ou qui « attend ». Au retour, il est **content** (expression `content`). |
| **Jamais de calendrier** | Aucune ligne du type « il a grandi en 3 semaines ». On affiche seulement « Encore N séances » vers le stade suivant. |
| **Après 72** | Il reste au stade 6 **pour toujours**. Le cycle 2 reprend le sentier au thème 1, avec tous les items débloqués (spec §5.1), et le renard le parcourt déjà grand. Réplique `th-20` au début du cycle 2, `th-19` quand les langues s'ouvrent. |
| **Les langues** (V2) | Elles **ne le font pas redevenir renardeau**. Une langue = un nouveau sentier, parcouru par le renard adulte. S'il faut une nouveauté visible, on pourra ajouter un détail par langue (une étiquette sur l'écharpe, par exemple), mais aucun nouveau stade. |

### 1.4 Couleurs (3 variables, plus l'écharpe)

| Variable | Rôle | Clair | Sombre | Contrastes calculés (WCAG) |
|---|---|---|---|---|
| `--fox-body` | Pelage roux | `#C25A24` | `#D9733A` | **3,97:1** sur sable `#F7F3EC` · **5,47:1** sur `#12191D` (le seuil pour un graphique est de 3:1) |
| `--fox-light` | Masque, plastron, bout de queue | `#FFF4E4` | `#FBEBD6` | 4,04:1 contre le pelage en clair, 2,78:1 en sombre (détail interne, il n'est jamais en bordure du dessin) |
| `--fox-dark` | Yeux, truffe, intérieur des oreilles, chaussettes, traits | `#1F2A30` | `#1F2A30` | Yeux sur pelage : 3,34:1 en clair, 4,51:1 en sombre · sur le masque : 13,5:1 |
| `color` (via `currentColor`) | **Écharpe** du stade 6 | `#1D5C6B` (Iroise, `var(--primary)`) | `#1D5C6B` | L'écharpe est cernée d'un trait `--fox-dark` de 1,5 : elle se détache dans les deux modes, même pour un daltonien |

> **Choix d'illustration :** le masque clair est **en retrait** du contour de la tête (un liseré roux reste tout autour). Sans ça, sur le sable, la crème se confondrait avec le fond (contraste de 1,02:1) et le menton disparaîtrait.

À poser dans `app.css` : les 3 variables dans `:root` et dans le bloc `prefers-color-scheme: dark`, à côté des tokens existants.

### 1.5 Les SVG, prêts à l'emploi

**Mode d'emploi (une fois pour toutes)**
- Les SVG sont **inline dans le DOM**. Une balise `<img src>` ne transmet pas les variables CSS, et le renard perdrait son mode sombre.
- **L'expression** se règle par l'attribut `data-humeur` sur `<svg>`, avec `neutre` (valeur par défaut), `content` ou `clin`. Les groupes yeux et bouche (`.lo-n` pour neutre, `.lo-c` pour content, `.lo-w` pour clin d'œil) sont **identiques d'un stade à l'autre**, parce que la même tête est réutilisée et mise à l'échelle.
- Toutes les classes sont préfixées `lo-`, parce que `.fb` est déjà utilisé dans `app.css` (ligne 113).
- **La silhouette du stade suivant** : il suffit d'ajouter `class="lo-ombre"` sur `<svg>`. Le dessin devient un contour pointillé couleur `--text-2`, sans yeux, sans couleur et sans écharpe.
- **L'écharpe** prend la couleur `color` du conteneur, à régler sur `var(--primary)`.
- Accessibilité : `role="img"` et `aria-label` sont déjà posés. Quand le renard est décoratif à côté d'une bulle qui se lit, ajouter `aria-hidden="true"`.
- Tailles mesurées : portrait **1,6 Ko**, stades 1 à 5 **2,0 Ko**, stade 6 **2,2 Ko**. Tout est **sous 3 Ko**.
- Testés à l'écran (rendu navigateur), en clair et en sombre : le portrait à 48 px et à 120 px, les stades à 150 px, les 3 expressions et les silhouettes.

**Quel SVG, et où**

| Fichier | Taille d'affichage | Où |
|---|---|---|
| **Portrait** (tête seule) | 32 à 48 px | Bulles secondaires, pierre actuelle du Parcours, souvenirs, écran final « Avant un RDV », Réglages |
| **Stade en pied** (1 à 6) | 96 px sur l'accueil, 120 à 160 px sur Parcours et sur l'écran de fin | C'est **le renard qui grandit**. Les 6 stades partagent le même `viewBox`, ce qui fait que la taille se lit directement d'un stade à l'autre. |

> Sur le portrait à 48 px, les yeux font environ 4 px : ils restent lisibles. Sur un stade en pied, la tête est réduite (40 % environ), donc on ne l'affiche **jamais sous 96 px**.

#### Portrait (tête, 3 expressions)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Louarn" data-humeur="neutre"><style>.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}</style><path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g></svg>
```

#### Stade 1 · Renardeau (0 à 11 séances)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Louarn, Renardeau" data-humeur="neutre"><style>.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}</style><path class="lo-b" d="M68 114Q84 118 90 100Q82 102 62 112Z"/><path class="lo-l" d="M84 104Q89 101 90 100Q86 99 84 104Z"/><path class="lo-b" d="M41 92Q54 85 67 92Q73 102.8 71 116H37Q35 102.8 41 92Z"/><path class="lo-l" d="M43.6 92Q54 113.6 64.4 92Z"/><path class="lo-l" d="M45 116a4 3 0 0 1 8 0ZM55 116a4 3 0 0 1 8 0Z"/><g transform="translate(54 74) scale(0.46) translate(-60 -58)"><path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g></g></svg>
```

#### Stade 2 · Jeune renard (12 à 23)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Louarn, Jeune renard" data-humeur="neutre"><style>.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}</style><path class="lo-b" d="M70 114Q92 118 98 92Q88 96 64 112Z"/><path class="lo-l" d="M92 98Q97 94 98 92Q93 92 92 98Z"/><path class="lo-b" d="M40 82Q54 75 68 82Q75 97.3 73 116H35Q33 97.3 40 82Z"/><path class="lo-l" d="M42.8 82Q54 109.2 65.2 82Z"/><path class="lo-d" d="M43 105.8q2.5 -3 5 0V116h-5ZM60 105.8q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 62) scale(0.43) translate(-60 -58)"><path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g></g></svg>
```

#### Stade 3 · Renard d'aplomb (24 à 35)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Louarn, Renard d’aplomb" data-humeur="neutre"><style>.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}</style><path class="lo-b" d="M71 114Q98 118 103 82Q92 88 65 112Z"/><path class="lo-l" d="M98 87Q102.5 83.5 103 82Q98.5 81.5 98 87Z"/><path class="lo-b" d="M39 72Q54 65 69 72Q76 91.8 74 116H34Q32 91.8 39 72Z"/><path class="lo-l" d="M42 72Q54 105 66 72Z"/><path class="lo-d" d="M43 101.9q2.5 -3 5 0V116h-5ZM60 101.9q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 51) scale(0.41) translate(-60 -58)"><path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g></g></svg>
```

#### Stade 4 · Renard assuré (36 à 47)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Louarn, Renard assuré" data-humeur="neutre"><style>.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}</style><path class="lo-b" d="M72 114Q104 116 107 72Q95 80 66 112Z"/><path class="lo-l" d="M102 77Q106.5 73.5 107 72Q102.5 71.5 102 77Z"/><path class="lo-b" d="M39 64Q54 57 69 64Q77 87.4 75 116H33Q31 87.4 39 64Z"/><path class="lo-l" d="M42 64Q54 100.4 66 64Z"/><path class="lo-d" d="M43 99.4q2.5 -3 5 0V116h-5ZM60 99.4q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 42) scale(0.4) translate(-60 -58)"><path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g></g></svg>
```

#### Stade 5 · Renard posé (48 à 71)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Louarn, Renard posé" data-humeur="neutre"><style>.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}</style><path class="lo-b" d="M72 114Q108 114 110 64Q96 72 66 112Z"/><path class="lo-l" d="M105 68Q109.5 65 110 64Q105.5 63 105 68Z"/><path class="lo-b" d="M39 57Q54 50 69 57Q77 83.6 75 116H33Q31 83.6 39 57Z"/><path class="lo-l" d="M42 57Q54 98.3 66 57Z"/><path class="lo-d" d="M43 98.3q2.5 -3 5 0V116h-5ZM60 98.3q2.5 -3 5 0V116h-5Z"/><g transform="translate(54 33) scale(0.39) translate(-60 -58)"><path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g></g></svg>
```

#### Stade 6 · Renard charismatique (72 et plus)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Louarn, Renard charismatique" data-humeur="neutre"><style>.lo-b{fill:var(--fox-body,#C25A24)}.lo-l{fill:var(--fox-light,#FFF4E4)}.lo-d{fill:var(--fox-dark,#1F2A30)}.lo-s{fill:none;stroke:var(--fox-dark,#1F2A30);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.lo-c,.lo-w,[data-humeur=content] .lo-n,[data-humeur=clin] .lo-n{display:none}[data-humeur=content] .lo-c,[data-humeur=clin] .lo-w{display:inline}.lo-ombre .lo-b{fill:var(--bg,#F7F3EC);stroke:var(--text-2,#55626A);stroke-width:1.2;stroke-dasharray:3 2;vector-effect:non-scaling-stroke}.lo-ombre .lo-l,.lo-ombre .lo-d,.lo-ombre .lo-s,.lo-ombre .lo-e{display:none}</style><path class="lo-b" d="M72 114Q111 112 112 58Q97 66 66 112Z"/><path class="lo-l" d="M107 62Q111.5 59 112 58Q107.5 57 107 62Z"/><path class="lo-b" d="M39 52Q54 45 69 52Q77 80.8 75 116H33Q31 80.8 39 52Z"/><path class="lo-l" d="M42 52Q54 96.8 66 52Z"/><path class="lo-d" d="M43 96.8q2.5 -3 5 0V116h-5ZM60 96.8q2.5 -3 5 0V116h-5Z"/><path class="lo-e" fill="currentColor" stroke="var(--fox-dark,#1F2A30)" stroke-width="1.5" stroke-linejoin="round" d="M38 50Q54 57 70 50V56Q54 63 38 56ZM57 58l7 18-6 1-5-18Z"/><g transform="translate(55 27) rotate(-6) scale(0.39) translate(-60 -58)"><path class="lo-b" d="M14 44 20 6 50 32ZM106 44 70 32 100 6ZM14 44 40 30H80L106 44 98 76 60 110 22 76Z"/><path class="lo-d" d="M22 36 24 16 40 31ZM98 36 96 16 80 31Z"/><path class="lo-l" d="M20 48 40 62 54 66 60 78 66 66 80 62 100 48 93 75 60 104 27 75Z"/><path class="lo-d" d="M51 85Q60 82 69 85L61 93Q60 94 59 93Z"/><g class="lo-n"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><ellipse class="lo-d" cx="78" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="79.6" cy="49.6" r="1.6"/><path class="lo-s" d="M54 99Q60 102 66 99"/></g><g class="lo-c"><path class="lo-s" d="M36 54Q42 46 48 54M72 54Q78 46 84 54M51 97Q55 104 60 98Q65 104 69 97"/></g><g class="lo-w"><ellipse class="lo-d" cx="42" cy="52" rx="5" ry="6.5"/><circle class="lo-l" cx="43.6" cy="49.6" r="1.6"/><path class="lo-s" d="M72 53Q78 47 84 53M52 99Q61 104 68 95"/></g></g></svg>
```

**Expression selon le moment** (une règle fixe, sans tirage) :

| Moment | Expression | Pourquoi |
|---|---|---|
| `accueil`, `rdv` | `neutre` | Calme, disponible |
| `fin`, `jalon`, `theme`, `stade`, `retour` | `content` | On accueille et on fête, et au retour il est content de te voir, jamais déçu |
| `tip` | `clin` | Le clin d'œil reste rare (environ un jour sur trois) : il ne s'use pas |

---

## 2. Où et quand Louarn parle

### 2.1 Les règles qui empêchent l'usure

| # | Règle |
|---|---|
| 1 | **Une bulle par écran, au maximum.** Il remplace un texte qui existe déjà, il n'en ajoute pas. |
| 2 | **Il ne bloque jamais rien** : pas de modale, pas de tap pour fermer, pas d'attente. La bulle est un texte statique. |
| 3 | **Il ne parle jamais pendant la séance** (écran S) : les yeux restent libres, c'est le principe 6 de la spec. La synthèse vocale **ne lit pas** ses répliques. |
| 4 | **La ligne de l'accueil est fixée pour la journée** (graine = date du jour + état). Rouvrir l'appli ne fait pas tourner une nouvelle phrase : il n'y a donc **aucun réflexe de machine à sous** à aller vérifier. Elle change seulement si l'état change, par exemple quand la séance est faite. |
| 5 | **Pas de répétition** : on tire la réplique la moins récemment vue parmi celles qui sont éligibles, avec `pickLeastRecent` (déjà dans `js/core/pick.js`). Une réplique ne revient pas avant que toutes celles de son moment soient passées. L'historique tient dans un meta `louarn.vus` (des ids, le plus récent en premier, 200 au maximum). |
| 6 | **Les conseils (`tip`)** ne s'affichent que sur l'accueil, dans l'état normal, **un jour sur trois** environ. Les 39 conseils font donc un tour complet en 4 mois environ. |
| 7 | **Il se tait quand une carte est affichée** sur l'accueil (« On t'a fait répéter ? », objectif atteint, pourquoi). Le renard reste visible, mais sans bulle : la carte parle. |
| 8 | **Aucune notification**, et il ne « réclame » jamais. |
| 9 | Au plus **3 bulles par jour** en pratique : l'accueil, la fin et éventuellement le RDV. |

### 2.2 Les moments

| Moment | Écran et emplacement | Déclencheur | Ce qu'il remplace | Priorité |
|---|---|---|---|---|
| `accueil` | Accueil : le **stade en pied à 96 px** à gauche, la bulle à droite, dans la zone du milieu (hors zone du pouce) | Chaque ouverture, avec la ligne du jour (règle 4) | La **ligne de contexte** (`homeLine`) | Voir ordre ci-dessous |
| `retour` | Idem accueil | `homeStatus().comeback` (3 jours ou plus sans séance) | Les messages `RETOUR` | 2 |
| `jalon` | Accueil le jour J (`jalon:due`), puis fin de séance | `dueMilestone`, ou la séance qui a enregistré la référence | La ligne de contexte « Jalon … », puis le message de fin | 3 |
| `jalon` + `trophee:*` | Fin de séance (ou accueil, après le retour terrain) | Un souvenir vient d'être obtenu (§4.3) | Le message de fin | 2 |
| `theme` | Fin de la séance qui termine un thème | `dailyCount` devient un multiple de 4 | Le message de fin | 3 |
| `stade` | Fin de la séance qui fait monter de stade | `dailyCount` atteint 12, 24, 36, 48 ou 72 | Le message de fin | **1** |
| `fin` | Écran de fin | Toute séance comptée | `FIN` / `FIN_PARTIELLE` | 4 |
| `rdv` | Dernier écran « Avant un RDV », sous le pourquoi | Fin de la routine de 90 s | Le « Tu y vas. » | — |
| `tip` | Accueil, état normal | Un jour sur trois (rotation : pourquoi / conseil / réplique d'accueil) | La phrase de motivation du jour | 5 |

**Ordre de priorité sur l'accueil** : carte en attente (le renard se tait) → `retour` → `jalon:due` → `premiereSeance` → `doneToday` → `yesterdayOff` → rotation sur 3 jours : le pourquoi de Fred (« Ton pourquoi : … »), un `tip`, ou une réplique `accueil`. Dans la rotation, les répliques `accueil` sont mêlées aux **12 phrases de motivation** déjà écrites (`extras.json`), soit 30 lignes à tourner.

**Ordre de priorité à la fin** : `stade` → `trophee` → `theme` → `jalon` → `fin`. Si plusieurs événements tombent sur la même séance (à 24 : fin du thème 6, fin du bloc 1, stade 3), **une seule bulle** s'affiche, la plus prioritaire. Les autres se montrent sans paroles : la pierre se coche, le souvenir apparaît dans la liste.

### 2.3 Vocabulaire des conditions (tout se calcule depuis les séances et les enregistrements)

| Condition | Calcul | Type |
|---|---|---|
| *(absente)* | Toujours éligible | générique |
| `matin` / `soir` | Heure locale avant 12 h / après 18 h | contexte |
| `ecoute` / `posture` | Bloc 3 du jour (`nextBloc3(lastBloc3())`) à l'accueil ; bloc 3 de la séance à la fin | contexte |
| `bloc>=2` / `bloc>=3` | Bloc du programme de la prochaine séance : `floor(dailyCount / 24) + 1` | contexte |
| `doneToday`, `yesterdayOff` | `homeStatus()` | état |
| `premiereSeance` | `dailyCount === 0` | état |
| `partielle` | Séance arrêtée après 60 s (`!s.completed`) | état |
| `encoreUne` | Deuxième séance comptée le même jour | état |
| `objectif` / `sansObjectif` | La routine RDV a un objectif saisi, ou n'en a pas | état |
| `jalon:due` | `dueMilestone(dailyCount + 1, …)` n'est pas nul | état |
| `jalon:1`, `:7`, `:14`, `:30`, `:60+` | `s.milestone` de la séance qui vient de finir | état |
| `trophee:<id>` | Souvenir obtenu à l'instant (§4.3) | état |
| `theme:<n>` | Thème `n` débloqué : `dailyCount === 4 × (n − 1)` après la séance (n de 2 à 18). `theme:1` s'affiche à la fin de l'onboarding. | état |
| `theme:langues` | `dailyCount` atteint 72 | état |
| `cycle:2` | Première séance après 72 (`dailyCount === 73`) | état |
| `stade:<n>` | `dailyCount` atteint le seuil du stade `n`. `stade:1` s'affiche à la fin de l'onboarding. | état |
| `stade:6+` | Accueil, un seul jour, la première ouverture après la montée au stade 6 | état |

**Tirage :** si une condition d'**état** est vraie, on tire uniquement parmi les répliques qui ont cette condition. Sinon, on tire parmi les génériques et les répliques de **contexte** vraies.

### 2.4 Option « Renard discret » (Réglages)

Une seule ligne, un interrupteur, **désactivé par défaut** (c'est Fred qui a demandé le renard) :
> **Renard discret** · *Il reste là, mais ne parle que pour les grands moments.*

| | Normal | Discret |
|---|---|---|
| Renard sur l'accueil | Stade en pied et bulle | Stade en pied **sans bulle**, la ligne de contexte redevient du texte simple (`homeLine` d'origine) |
| Conseils `tip` | Un jour sur trois | Aucun |
| Fin de séance | Bulle et petit saut | Message de fin en texte simple, **aucune animation** |
| Montée de stade, souvenir, thème | Bulle et animation | Bulle seule, **sans animation** |
| Avant un RDV | Bulle | « Tu y vas. » d'origine |

Le stade reste visible en mode discret : la croissance est la pièce centrale, et la cacher retirerait la récompense sans rien alléger.

---

## 3. Bibliothèque de répliques (JSON)

À ranger dans `content/fr/louarn.json`. Le fichier est **par langue**, comme `exercises.json`, ce qui prépare l'anglais et l'espagnol.

**Contrôles passés par script :** 135 répliques, ids uniques, **84 caractères au maximum** (limite fixée à 90), aucun chiffre, aucun point d'exclamation.
**Répartition :** `accueil` 18 · `fin` 15 · `jalon` 19 (8 jalons de voix et 11 souvenirs) · `theme` 20 · `retour` 8 · `rdv` 9 · `tip` 39 · `stade` 7.
**Familles de `tip`** (dans l'id) : `dic` diction (9), `eco` écoute (7), `pos` posture (7), `cha` charisme (7), `rdv` situations de RDV (9). Chaque conseil reprend un `pourquoi`, une consigne d'écoute (C01–C10) ou une consigne de posture des fichiers de contenu. Les conseils `cha` sont la seule exception, voir §6, point 2.
**Remplace :** `FIN`, `FIN_PARTIELLE` et `RETOUR` de `texts.js`. On les garde pour le mode discret et comme filet de sécurité si le fichier ne se charge pas.

```json
[
  { "id": "acc-01", "moment": "accueil", "condition": "matin", "texte": "Bonjour. Avant les mails, on réveille la voix ?" },
  { "id": "acc-02", "moment": "accueil", "condition": "soir", "texte": "Fin de journée ? Une séance courte, et tu poses tout ça." },
  { "id": "acc-03", "moment": "accueil", "texte": "Un renard ne court pas tout le temps. Il sait quand ralentir." },
  { "id": "acc-04", "moment": "accueil", "texte": "Tu appuies sur le bouton. Le contenu du jour, je m’en suis occupé." },
  { "id": "acc-05", "moment": "accueil", "texte": "Pas besoin d’être en forme pour commencer. Juste d’appuyer." },
  { "id": "acc-06", "moment": "accueil", "texte": "Personne n’écoute. C’est le bon moment pour se tromper tranquille." },
  { "id": "acc-07", "moment": "accueil", "texte": "Tes idées vont vite, je sais. Ta bouche apprend à suivre." },
  { "id": "acc-08", "moment": "accueil", "texte": "Je garde le sentier au chaud. Tu passes quand tu veux." },
  { "id": "acc-09", "moment": "accueil", "condition": "doneToday", "texte": "C’est fait pour aujourd’hui. Tu peux filer, je garde le terrier." },
  { "id": "acc-10", "moment": "accueil", "condition": "doneToday", "texte": "Séance faite. Une autre si l’envie te prend, sinon rien du tout." },
  { "id": "acc-11", "moment": "accueil", "condition": "yesterdayOff", "texte": "Hier, pause. Aujourd’hui, une minute suffit pour que ça compte." },
  { "id": "acc-12", "moment": "accueil", "condition": "yesterdayOff", "texte": "Les renards aussi font des pauses. On repart d’ici, simplement." },
  { "id": "acc-13", "moment": "accueil", "condition": "premiereSeance", "texte": "Enchanté, moi c’est Louarn. On commence par ta voix de départ ?" },
  { "id": "acc-14", "moment": "accueil", "condition": "ecoute", "texte": "Aujourd’hui, on écoute. Laisse ta réponse au vestiaire." },
  { "id": "acc-15", "moment": "accueil", "condition": "posture", "texte": "Aujourd’hui, posture : tu pourras poser le téléphone et respirer." },
  { "id": "acc-16", "moment": "accueil", "condition": "bloc>=2", "texte": "La confiance se travaille comme une consonne : lentement, et souvent." },
  { "id": "acc-17", "moment": "accueil", "condition": "bloc>=3", "texte": "Tes vrais rendez-vous se préparent ici, une phrase à la fois." },
  { "id": "acc-18", "moment": "accueil", "texte": "Le chemin se fait en marchant. Moi, je me contente de suivre." },
  { "id": "fin-01", "moment": "fin", "texte": "C’est fait. Ce temps-là, c’était pour toi et tes prochains rendez-vous." },
  { "id": "fin-02", "moment": "fin", "texte": "Une de plus. Ta voix s’en souvient, même si toi tu oublies." },
  { "id": "fin-03", "moment": "fin", "texte": "Le plus dur, c’était d’appuyer sur le bouton. C’est fait." },
  { "id": "fin-04", "moment": "fin", "texte": "Fait. Tu peux retourner à ta journée, je range." },
  { "id": "fin-05", "moment": "fin", "texte": "Tu t’es écouté aujourd’hui. Peu de gens le font." },
  { "id": "fin-06", "moment": "fin", "texte": "Petit et régulier : c’est comme ça que ça bouge. J’ai du flair." },
  { "id": "fin-07", "moment": "fin", "texte": "Merci d’être venu. Rien d’autre à faire." },
  { "id": "fin-08", "moment": "fin", "texte": "Séance rangée dans le terrier. On se revoit quand tu veux." },
  { "id": "fin-09", "moment": "fin", "condition": "partielle", "texte": "Arrêté en route, et ça compte quand même. Je note." },
  { "id": "fin-10", "moment": "fin", "condition": "partielle", "texte": "Tu as fait l’essentiel. Le reste attendra, sans rancune." },
  { "id": "fin-11", "moment": "fin", "condition": "ecoute", "texte": "Tu as écouté sans préparer ta réponse. C’est plus rare qu’on croit." },
  { "id": "fin-12", "moment": "fin", "condition": "posture", "texte": "Pieds au sol, épaules basses. Garde-les comme ça pour la suite." },
  { "id": "fin-13", "moment": "fin", "condition": "encoreUne", "texte": "Encore une, par plaisir. C’est la meilleure des raisons." },
  { "id": "fin-14", "moment": "fin", "condition": "bloc>=3", "texte": "Une phrase de plus de prête pour ton prochain rendez-vous." },
  { "id": "fin-15", "moment": "fin", "texte": "Rien à corriger, rien à rattraper. Une séance de faite, point." },
  { "id": "jal-01", "moment": "jalon", "condition": "jalon:due", "texte": "Aujourd’hui, on réenregistre le texte du début. Même texte, même calme." },
  { "id": "jal-02", "moment": "jalon", "condition": "jalon:due", "texte": "Jour de photo sonore. Lis comme d’habitude, sans jouer un rôle." },
  { "id": "jal-03", "moment": "jalon", "condition": "jalon:1", "texte": "Ta voix de départ est au chaud. Je la garde pour plus tard." },
  { "id": "jal-04", "moment": "jalon", "condition": "jalon:7", "texte": "Ta voix du début t’attend. Si tu n’entends rien de neuf, c’est normal." },
  { "id": "jal-05", "moment": "jalon", "condition": "jalon:7", "texte": "Pas de note ici. Juste deux voix et ton oreille." },
  { "id": "jal-06", "moment": "jalon", "condition": "jalon:14", "texte": "Même texte, deux voix. C’est toi le juge, pas moi." },
  { "id": "jal-07", "moment": "jalon", "condition": "jalon:30", "texte": "Ta voix du début, celle d’aujourd’hui. Écoute, puis dis-le avec tes mots." },
  { "id": "jal-08", "moment": "jalon", "condition": "jalon:60+", "texte": "Encore une photo de ta voix. Pose-la à côté de la première." },
  { "id": "tro-01", "moment": "jalon", "condition": "trophee:premier-pas", "texte": "Premier pas fait. Je le range dans tes souvenirs." },
  { "id": "tro-02", "moment": "jalon", "condition": "trophee:voix-depart", "texte": "Ta voix de départ, gardée telle quelle. Elle servira de repère." },
  { "id": "tro-03", "moment": "jalon", "condition": "trophee:premier-echo", "texte": "Premier écho : ta voix d’avant et celle de maintenant, côte à côte." },
  { "id": "tro-04", "moment": "jalon", "condition": "trophee:grand-echo", "texte": "Le grand écho rejoint tes souvenirs. Ce que tu entends, c’est toi qui le dis." },
  { "id": "tro-05", "moment": "jalon", "condition": "trophee:premier-rdv", "texte": "Premier rendez-vous préparé. Le vrai terrain commence." },
  { "id": "tro-06", "moment": "jalon", "condition": "trophee:compris", "texte": "Personne ne t’a fait répéter. Ça, c’est du vrai, pas de l’exercice." },
  { "id": "tro-07", "moment": "jalon", "condition": "trophee:objectif-tenu", "texte": "Objectif de rendez-vous atteint. Celui-là, je l’encadre." },
  { "id": "tro-08", "moment": "jalon", "condition": "trophee:chemin-repris", "texte": "Tu as repris le chemin. C’est souvent le pas le plus difficile." },
  { "id": "tro-09", "moment": "jalon", "condition": "trophee:fondations", "texte": "Fondations posées. La suite se construit dessus, sans se presser." },
  { "id": "tro-10", "moment": "jalon", "condition": "trophee:confiance", "texte": "Charisme et confiance : fait. Il reste le terrain des rendez-vous." },
  { "id": "tro-11", "moment": "jalon", "condition": "trophee:sentier", "texte": "Sentier complet. L’anglais et l’espagnol t’attendent au bout." },
  { "id": "th-01", "moment": "theme", "condition": "theme:1", "texte": "Premier thème : ouvrir et ralentir. On ouvre la bouche, on lâche le chrono." },
  { "id": "th-02", "moment": "theme", "condition": "theme:2", "texte": "Consonnes qui claquent : les fins de mots ont leur mot à dire." },
  { "id": "th-03", "moment": "theme", "condition": "theme:3", "texte": "Sifflantes et chuintantes : les « s » et les « ch » arrêtent de se mélanger." },
  { "id": "th-04", "moment": "theme", "condition": "theme:4", "texte": "Groupes difficiles : « tr », « pr », « str ». On découpe, comme un menuisier." },
  { "id": "th-05", "moment": "theme", "condition": "theme:5", "texte": "Phrases qui portent : un mot-clé appuyé, une fin posée. Simple, pas facile." },
  { "id": "th-06", "moment": "theme", "condition": "theme:6", "texte": "Intégration : tout s’enchaîne d’un seul tenant. Tu as les outils." },
  { "id": "th-07", "moment": "theme", "condition": "theme:7", "texte": "Nouveau bloc : la confiance qui se voit. On commence par le corps." },
  { "id": "th-08", "moment": "theme", "condition": "theme:8", "texte": "Prendre la parole à l’improviste : une respiration, une phrase, et on y va." },
  { "id": "th-09", "moment": "theme", "condition": "theme:9", "texte": "Rendre un retour qui aide : des faits, pas des étiquettes." },
  { "id": "th-10", "moment": "theme", "condition": "theme:10", "texte": "La personne difficile : on reste calme, curieux, et on garde le cadre." },
  { "id": "th-11", "moment": "theme", "condition": "theme:11", "texte": "Désamorcer une tension : baisser le ton, ralentir, reformuler." },
  { "id": "th-12", "moment": "theme", "condition": "theme:12", "texte": "Lire les gens : regarder ce qu’ils font, pas seulement ce qu’ils disent." },
  { "id": "th-13", "moment": "theme", "condition": "theme:13", "texte": "Dernier bloc : les premières secondes d’un rendez-vous. Son nom, la durée, le cadre." },
  { "id": "th-14", "moment": "theme", "condition": "theme:14", "texte": "La prise de contact : une seule question sincère, puis on entre dans le sujet." },
  { "id": "th-15", "moment": "theme", "condition": "theme:15", "texte": "Raconter un cas client, court : situation, problème, ce qui a changé." },
  { "id": "th-16", "moment": "theme", "condition": "theme:16", "texte": "Recadrer en douceur : tu as le droit de tenir le temps." },
  { "id": "th-17", "moment": "theme", "condition": "theme:17", "texte": "Dire non sans abîmer la relation : un non posé protège tout le monde." },
  { "id": "th-18", "moment": "theme", "condition": "theme:18", "texte": "Signal d’achat : quand il demande « quand », tu arrêtes d’argumenter." },
  { "id": "th-19", "moment": "theme", "condition": "theme:langues", "texte": "Le sentier français est fait. L’anglais et l’espagnol sont ouverts." },
  { "id": "th-20", "moment": "theme", "condition": "cycle:2", "texte": "Même sentier, autre regard : on repasse, avec tout ce que tu sais déjà." },
  { "id": "ret-01", "moment": "retour", "texte": "Content de te revoir. On reprend doucement, en version courte." },
  { "id": "ret-02", "moment": "retour", "texte": "Te revoilà. Rien n’est perdu, tout est là. On y va ?" },
  { "id": "ret-03", "moment": "retour", "texte": "Les pauses font partie du chemin. On remet la voix en route." },
  { "id": "ret-04", "moment": "retour", "texte": "Bon retour. Pas de bilan, pas de rattrapage. Juste maintenant." },
  { "id": "ret-05", "moment": "retour", "texte": "Le terrier est resté chauffé. Installe-toi." },
  { "id": "ret-06", "moment": "retour", "texte": "Ah, te voilà. J’ai gardé ta place sur le sentier." },
  { "id": "ret-07", "moment": "retour", "texte": "Ton parcours n’a pas bougé d’un pas. On repart d’où tu étais." },
  { "id": "ret-08", "moment": "retour", "texte": "Une séance courte pour reprendre. La suite redeviendra normale." },
  { "id": "rdv-01", "moment": "rdv", "texte": "Tu y vas. Tu es là pour comprendre, pas pour convaincre." },
  { "id": "rdv-02", "moment": "rdv", "texte": "Première phrase lente. Le reste suivra." },
  { "id": "rdv-03", "moment": "rdv", "texte": "Écoute d’abord. Les solutions peuvent attendre leur tour." },
  { "id": "rdv-04", "moment": "rdv", "condition": "objectif", "texte": "Tu as ton objectif. Garde-le en tête, pas sur la langue." },
  { "id": "rdv-05", "moment": "rdv", "texte": "Pieds au sol, mains visibles. Le reste, c’est ta conversation." },
  { "id": "rdv-06", "moment": "rdv", "texte": "Un silence après ta question, c’est lui qui réfléchit pour toi." },
  { "id": "rdv-07", "moment": "rdv", "texte": "Si le budget n’est pas là, tu as le droit de le dire tôt." },
  { "id": "rdv-08", "moment": "rdv", "condition": "sansObjectif", "texte": "Pas d’objectif noté ? Demande-toi ce que tu veux savoir en sortant." },
  { "id": "rdv-09", "moment": "rdv", "texte": "Un charme de trop ne remplace pas une question. Pose la question." },
  { "id": "tip-dic-01", "moment": "tip", "texte": "Ouvre un peu plus la bouche : c’est le geste qui change le plus la clarté." },
  { "id": "tip-dic-02", "moment": "tip", "texte": "Prononce la dernière syllabe : c’est souvent là que l’autre décroche." },
  { "id": "tip-dic-03", "moment": "tip", "texte": "Mâchoire serrée, mots étroits. Desserre les dents avant de parler." },
  { "id": "tip-dic-04", "moment": "tip", "texte": "Un mot long ? Découpe-le syllabe par syllabe, puis lisse." },
  { "id": "tip-dic-05", "moment": "tip", "texte": "Lent d’abord, en exagérant. La vitesse normale vient ensuite." },
  { "id": "tip-dic-06", "moment": "tip", "texte": "Appuie sur un seul mot par phrase : celui qui porte le sens." },
  { "id": "tip-dic-07", "moment": "tip", "texte": "Une fin de phrase qui monte sonne comme un doute. Fais-la descendre." },
  { "id": "tip-dic-08", "moment": "tip", "texte": "« Pseudonymisation » : dis-le en entier, sans avaler le milieu." },
  { "id": "tip-dic-09", "moment": "tip", "texte": "Souffle long avant de parler : ta première phrase part plus posée." },
  { "id": "tip-eco-01", "moment": "tip", "texte": "Laisse-le finir sa phrase, même si tu as compris." },
  { "id": "tip-eco-02", "moment": "tip", "texte": "Repère le mot qu’il répète : c’est souvent un indice." },
  { "id": "tip-eco-03", "moment": "tip", "texte": "Reformule une fois avant de proposer quoi que ce soit." },
  { "id": "tip-eco-04", "moment": "tip", "texte": "La phrase glissée en passant, « d’ailleurs… », est souvent la plus importante." },
  { "id": "tip-eco-05", "moment": "tip", "texte": "Écoute ce qu’il refuse : ça compte autant que ce qu’il demande." },
  { "id": "tip-eco-06", "moment": "tip", "texte": "Termine par un résumé court, puis « C’est bien ça ? »." },
  { "id": "tip-eco-07", "moment": "tip", "texte": "Le plus enthousiaste n’est pas toujours celui qui signe." },
  { "id": "tip-pos-01", "moment": "tip", "texte": "Pieds à plat, dos décollé du dossier : ta voix porte mieux assise." },
  { "id": "tip-pos-02", "moment": "tip", "texte": "Avant de répondre, laisse passer deux secondes de silence." },
  { "id": "tip-pos-03", "moment": "tip", "texte": "Mains posées et visibles. Un geste, seulement sur le mot-clé." },
  { "id": "tip-pos-04", "moment": "tip", "texte": "Finis ta phrase en regardant quelqu’un, pas le mur derrière lui." },
  { "id": "tip-pos-05", "moment": "tip", "texte": "Épaules qui montent, voix qui serre. Laisse-les redescendre." },
  { "id": "tip-pos-06", "moment": "tip", "texte": "À plusieurs, adresse-toi au moins une fois à celui qui se tait." },
  { "id": "tip-pos-07", "moment": "tip", "texte": "Cale ton débit sur celui de l’autre. Plus vite que lui, tu le fatigues." },
  { "id": "tip-cha-01", "moment": "tip", "texte": "La confiance se voit d’abord dans un corps calme, avant le premier mot." },
  { "id": "tip-cha-02", "moment": "tip", "texte": "Pris de court ? Une respiration, une phrase courte, puis tu développes." },
  { "id": "tip-cha-03", "moment": "tip", "texte": "Un retour utile parle d’un fait précis, pas de la personne." },
  { "id": "tip-cha-04", "moment": "tip", "texte": "Face à quelqu’un de tendu, baisse le ton et ralentis plutôt qu’argumenter." },
  { "id": "tip-cha-05", "moment": "tip", "texte": "Si l’émotion est là, nomme-la simplement : « ça vous pèse ». Puis écoute." },
  { "id": "tip-cha-06", "moment": "tip", "texte": "Regarde ce que font ses mains et son regard, pas seulement ses mots." },
  { "id": "tip-cha-07", "moment": "tip", "texte": "Un « je ne sais pas » n’est pas toujours un non. Laisse-le continuer." },
  { "id": "tip-rdv-01", "moment": "tip", "texte": "Dis son nom clairement dès l’accueil : il entend que tu es là pour lui." },
  { "id": "tip-rdv-02", "moment": "tip", "texte": "Annonce la durée au début : c’est elle qui t’autorise à tenir le temps." },
  { "id": "tip-rdv-03", "moment": "tip", "texte": "Dis le mot « budget » tôt. C’est moins gênant qu’à la fin." },
  { "id": "tip-rdv-04", "moment": "tip", "texte": "Une question sincère suffit pour le lien. À la troisième, tu charmes." },
  { "id": "tip-rdv-05", "moment": "tip", "texte": "Raconte un cas vécu, sans chiffre inventé : c’est ce qui le rend crédible." },
  { "id": "tip-rdv-06", "moment": "tip", "texte": "« Je vais y réfléchir » cache souvent une raison. Demande-la simplement." },
  { "id": "tip-rdv-07", "moment": "tip", "texte": "Il demande « quand » ? Arrête d’argumenter, propose la suite." },
  { "id": "tip-rdv-08", "moment": "tip", "texte": "Après ta question fermée, tais-toi. Ton silence lui laisse décider." },
  { "id": "tip-rdv-09", "moment": "tip", "texte": "Après un non, ne te justifie pas. Le silence le laisse tenir debout." },
  { "id": "sta-01", "moment": "stade", "condition": "stade:1", "texte": "Je suis encore petit. On grandit ensemble, à ton rythme." },
  { "id": "sta-02", "moment": "stade", "condition": "stade:2", "texte": "J’ai pris des pattes. Toi, de l’assurance dans les consonnes." },
  { "id": "sta-03", "moment": "stade", "condition": "stade:3", "texte": "Fondations posées : je tiens d’aplomb. Ta voix aussi." },
  { "id": "sta-04", "moment": "stade", "condition": "stade:4", "texte": "Je me tiens plus droit. La confiance commence par le dos." },
  { "id": "sta-05", "moment": "stade", "condition": "stade:5", "texte": "Charisme et confiance, c’est fait. Je regarde les gens en face." },
  { "id": "sta-06", "moment": "stade", "condition": "stade:6", "texte": "Écharpe nouée, tête haute. Prêts pour le terrain, toi et moi." },
  { "id": "sta-07", "moment": "stade", "condition": "stade:6+", "texte": "Je reste comme ça, maintenant. Grandir, c’est fait. Avancer, jamais fini." }
]
```

---

## 4. La gamification, légère et éthique

### 4.1 Pourquoi ces leviers conviennent à un TDAH

| Levier | Effet recherché | Le garde-fou |
|---|---|---|
| **Le renard qui grandit** | Une **récompense visible et cumulative** : chaque séance compte, et ça se voit sur l'accueil. Le cerveau TDAH a besoin d'un retour **immédiat et concret** ; le cumul « 23 séances » est exact mais abstrait. | Il dépend du cumul, qui ne baisse jamais (principe 4 de la spec). Il n'y a rien à perdre, donc rien à craindre. |
| **Nouveauté sans changer le rituel** | Les répliques, les déblocages de thème et les stades renouvellent l'écran **sans toucher aux 2 boutons ni au déroulé**. | Le format reste stable (`expert-contenu.md` §2) : la nouveauté vient du contenu. |
| **Récompense variable, mais jamais retirable** | Les souvenirs arrivent sans être annoncés à l'avance, par exemple « Personne ne t'a fait répéter ». | Ils sont **visibles une fois obtenus, jamais en grille de cases vides** : il n'y a pas de collection à compléter, pas de « il m'en manque 4 ». |
| **Le sens avant le jeu** | Les souvenirs les plus forts viennent **du terrain** (RDV préparé, compris du premier coup, objectif atteint), pas de l'appli. | Aucun souvenir pour « avoir ouvert l'appli », et aucun lié à une série. |

### 4.2 Le Parcours

**Où :** en **tête de l'écran Progression**, au-dessus du chiffre du mois. **Pas d'onglet** : l'appli n'a pas de barre de navigation, et en ajouter une créerait un choix de plus à l'accueil (piège 5). On y arrive par le compteur « X jours ce mois-ci › », comme aujourd'hui.

**Il remplace** la barre de progression de la carte « Objectif » : le sentier **est** la progression vers 72. La date estimée et la courbe du cumul restent juste en dessous, sans changement.

**Composition, de haut en bas**
1. **Le renard au stade actuel** (en pied, 120 px), son nom de stade, et à côté **la silhouette du stade suivant** (`class="lo-ombre"`, 96 px), avec « **Encore N séances** ». Au stade 6, la silhouette disparaît et la ligne devient « Le sentier est fait. Tu continues à ton rythme. ».
2. **« 23 séances sur 72 »**, en Lexend. C'est le chiffre exact, déjà autorisé par la spec.
3. **Le sentier** : un SVG en lacets verticaux, de **18 pierres** regroupées en **3 bandes de couleur**, avec le nom du bloc en tête de chaque bande.

| Bloc | Couleur clair | Couleur sombre | Contraste |
|---|---|---|---|
| 1 · Fondations | Iroise `#1D5C6B` | `#5FB3C4` | 6,8:1 / 7,4:1 |
| 2 · Charisme et confiance | Ajonc `#E3A72F` **cerné de granite** (comme le losange du calendrier) | `#F0BC4E` | Le liseré granite assure le contraste en clair (l'ajonc seul ne fait que 1,9:1) / 10,2:1 |
| 3 · Situations de RDV | **Bruyère** `#7A4A7E` (nouvelle teinte, bretonne et discrète) | `#C79BD0` | 6,1:1 / 7,6:1 |

| État d'une pierre | Rendu | Libellé |
|---|---|---|
| **Faite** | Pleine, couleur du bloc, coche blanche | Nom du thème en petit, `--text-2` |
| **Actuelle** | Anneau épais et **portrait de Louarn posé dessus** (32 px), plus 4 petits points pour les 4 séances du thème (« étape 3 sur 4 ») | Nom du thème en gras |
| **Prochaine** | Contour couleur du bloc | Nom du thème en clair : c'est elle qui donne envie |
| **Plus tard** | Petit point gris `--border` | **Pas de nom**, pour ne pas surcharger l'écran. Le nom du bloc suffit. |

- Pas de cadenas, pas de « verrouillé » : une pierre future est simplement **plus loin sur le chemin**.
- Pas de rouge, pas de date sous les pierres, pas de « retard ».
- Sous le sentier : « À 72, l'anglais et l'espagnol se débloquent. ». Au cycle 2, un petit « Cycle 2 » apparaît en tête de sentier, et les pierres se re-remplissent avec le renard adulte (§1.3).
- **Sur l'accueil**, le sous-titre du bouton Go donne le thème : « *Consonnes qui claquent · écoute* » au lieu de « Aujourd'hui : articulation + écoute ». La nouveauté se voit sans ajouter le moindre élément.

### 4.3 Les Souvenirs (les « trophées »)

Le mot affiché est **« Souvenirs »** : il est plus adulte que « trophées » ou « badges » et colle à l'idée d'un chemin parcouru.

| id | Nom | Condition exacte (calculée, jamais stockée) | Réplique |
|---|---|---|---|
| `premier-pas` | Le premier pas | `dailyCount ≥ 1` | `tro-01` |
| `voix-depart` | La voix de départ | un enregistrement `kind === 'reference'` avec `milestone === 1` existe | `tro-02` |
| `premier-echo` | Le premier écho | une référence `milestone === 7` existe | `tro-03` |
| `grand-echo` | Le grand écho | une référence `milestone === 30` existe | `tro-04` |
| `premier-rdv` | Le premier rendez-vous | une séance `type === 'prerdv'` avec `practicedSec ≥ 30` existe (même seuil que le retour terrain) | `tro-05` |
| `compris` | Compris du premier coup | une séance `prerdv` avec `feedback === 'non'` existe (« On t'a fait répéter ? » → Non) | `tro-06` |
| `objectif-tenu` | Objectif tenu | une séance `prerdv` avec `goalReached === 'oui'` existe | `tro-07` |
| `chemin-repris` | Le chemin repris | une séance `type === 'comeback'` comptée existe | `tro-08` |
| `fondations` | Les fondations | `dailyCount ≥ 24` (bloc 1 terminé) | `tro-09` |
| `confiance` | La confiance | `dailyCount ≥ 48` (bloc 2 terminé) | `tro-10` |
| `sentier` | Le sentier entier | `dailyCount ≥ 72` | `tro-11` |

**Date d'un souvenir** : celle de la première séance (ou du premier enregistrement) qui remplit la condition. Elle se recalcule, il n'y a rien à stocker.
**Seul état stocké** : le meta `louarn.fetes`, la liste des ids et des stades **déjà célébrés**, pour ne pas célébrer deux fois. Après une restauration de sauvegarde, rien n'est re-célébré en rafale : un souvenir qui date de plus de 3 jours s'ajoute à la liste sans bulle.

**Affichage** : sur Progression, sous le Parcours, une rangée « **Tes souvenirs** » avec le portrait, le nom et la date des souvenirs **obtenus uniquement**. Sous la rangée, une ligne : « D'autres viendront en chemin. ». Aucune case vide.

**Doublons voulus** : à 24, 48 et 72, un souvenir de bloc tombe sur la même séance qu'une montée de stade. C'est la bulle `stade` qui parle (priorité 1), et la réplique du souvenir sert alors de **légende** dans la liste des souvenirs.

### 4.4 Les célébrations (1 s au maximum)

| Événement | Animation | Durée | `prefers-reduced-motion: reduce` | Renard discret |
|---|---|---|---|---|
| **Fin de séance** | Le point du jour se remplit (existant, 0,5 s), puis à 300 ms Louarn fait **un petit saut** : `translateY` de 0 à −6 px puis retour, avec un easing de sortie, en expression `content` | 0,8 s au total | Pas de saut : l'expression `content` s'affiche directement | Pas d'animation |
| **Thème débloqué** | Sur l'écran de fin, un **mini-sentier de 3 pierres** (celle qui est faite, la nouvelle, la suivante) : la coche se dessine (`stroke-dashoffset`, 400 ms), puis le portrait glisse vers la nouvelle pierre (500 ms) | 0,9 s | État final affiché directement | État final, sans mouvement |
| **Montée de stade** | Le stade précédent grandit vers le nouveau (`scale`, origine en bas au centre, 600 ms), en fondu enchaîné avec le nouveau dessin (300 ms), puis passage en `content` | 1 s maximum | Remplacement direct, sans mouvement ni fondu | Remplacement direct |
| **Souvenir obtenu** | La pastille apparaît (`opacity` de 0 à 1, `scale` de 0,96 à 1) | 0,3 s | Apparition directe | Apparition directe |

- **Une seule fois, jamais en boucle**, et jamais sur l'accueil (l'accueil reste immobile).
- Pas de son ajouté : le bol de fin existant suffit. Pas de vibration en plus. Pas de confettis, d'étoiles ni de feux d'artifice.
- `prefers-reduced-motion` est **lu à chaque affichage**, et pas seulement au démarrage.

### 4.5 Ce que je refuse, et pourquoi

| Refusé | Pourquoi, pour un TDAH |
|---|---|
| **XP, points** | On finit par jouer pour les points et plus pour sa voix (`expert-ux.md` piège 6). La seule monnaie, c'est la séance, et elle est déjà comptée. |
| **Niveaux chiffrés** (« niveau 7 ») | Un chiffre de niveau appelle la comparaison et la course. Les stades ont des **noms**, et la croissance se voit sans se compter. |
| **Classements** | Hors sujet pour une appli perso, et la comparaison est toxique (spec §10). |
| **Vies, cœurs** | Ça punit l'erreur et l'essai, alors que l'appli dit « tu peux te tromper tranquille ». |
| **Séries de jours** | Un jour raté casse tout, puis c'est le « foutu pour foutu » (piège 1). Rien ici ne dépend du calendrier. |
| **Renard qui a faim, qui dort ou qui attend** | C'est l'effet Tamagotchi : chaque absence devient une faute envers une créature. C'est la « mascotte triste » déjà identifiée comme piège. |
| **Grille de souvenirs verrouillés** | Les cases vides créent une dette (« il m'en manque 4 ») et une compulsion à collectionner. |
| **Boutique, accessoires à débloquer, personnalisation du renard** | C'est du paramétrage infini (piège 4) et une seconde économie à gérer. L'écharpe vient avec le stade 6, un point c'est tout. |
| **Défis à durée limitée** (« cette semaine… ») | Ça crée de l'urgence, puis de l'échec. Le défi bonus est déjà hors V1. |
| **Notifications du renard** | Elles sont peu fiables sur Android, déjà écartées, et un renard qui réclame devient vite du harcèlement. |

### 4.6 Notes pour le dev (sans code)

| Sujet | Décision |
|---|---|
| Logique pure | Un nouveau module `js/core/louarn.js`, pur et testé sous Node : `stageOf(n)`, `nextStage(n)` (le stade suivant et le nombre de séances restantes), `themePosition(n)` (le thème et l'étape de 1 à 4), `souvenirs(sessions, recordings)`, `eligibleLines(lines, ctx)`, `pickLine(lines, ctx, history, seed)`. |
| Tests à ajouter | Les seuils de stade (11/12, 23/24, 71/72, 200), l'absence de régression (un historique qui ne fait que s'allonger ne fait jamais baisser le stade), aucune réplique au-dessus de 90 caractères ni avec un chiffre, la non-répétition sur un tour complet, la priorité « une bulle par écran ». |
| **Pré-requis bloquant** | `content/program.json` doit passer à **18 thèmes de 4 séances** (`sessionsPerWeek: 4`), et `WEEKS_PER_CYCLE = 6` dans `planner.js` doit être mis à jour. Aujourd'hui le programme compte 12 semaines de 5 séances. |
| Ce qui ne bouge pas | Les 2 boutons, le déroulé des séances, la règle des 60 s, les jalons de voix, aucune donnée qui sort du téléphone. |

---

## 5. Maquettes texte

### 5.1 Accueil (stade 2, état normal, jour à conseil)

```
┌────────────────────────────────────────┐
│ 14 jours ce mois-ci ›               ⚙  │  ← inchangé
│                                        │
│                                        │
│   ┌──────┐  ╭──────────────────────╮   │
│   │      │  │ Repère le mot qu'il  │   │  ← bulle = ancienne ligne
│   │LOUARN│ ◁│ répète : c'est       │   │    de contexte (1 ligne,
│   │stade2│  │ souvent un indice.   │   │    2 au plus à l'écran)
│   │ 96px │  ╰──────────────────────╯   │
│   └──────┘   (expression : clin)       │
│                                        │
│   [carte « On t'a fait répéter ? »]    │  ← si elle existe, la bulle
│                                        │    disparaît et Louarn se tait
│ ┌────────────────────────────────────┐ │
│ │            Go · 5 min              │ │  ← Iroise, 80 dp
│ │   Consonnes qui claquent · écoute  │ │  ← thème du jour
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │     Avant un rendez-vous · 90 s    │ │  ← Ajonc, 80 dp
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```
- Le renard se trouve **dans la zone du milieu**, qui était vide. Il n'empiète pas sur la zone du pouce.
- Il n'est **pas un bouton** : aucun geste caché, aucune cible tactile à ajouter.
- Bulle : fond `--surface`, texte `--text` en Atkinson 18 px, petite pointe vers le renard, rayon 16 dp. Pas d'italique.

### 5.2 Progression › Parcours (en tête d'écran, stade 2, 23 séances)

```
┌────────────────────────────────────────┐
│ ‹ Ton chemin                           │
│                                        │
│  ┌───────┐        ┌ ─ ─ ┐              │
│  │LOUARN │        ┆ombre┆  Encore      │
│  │stade 2│        ┆stade┆  1 séance    │
│  │ 120px │        ┆  3  ┆  avant le    │
│  └───────┘        └ ─ ─ ┘  Renard      │
│  Jeune renard              d'aplomb    │
│                                        │
│  23 séances sur 72                     │
│                                        │
│  ── Fondations ─────────── (Iroise)    │
│   ✔ Ouvrir et ralentir                 │
│      ✔ Consonnes qui claquent          │
│   ✔ Sifflantes et chuintantes          │
│      ✔ Groupes difficiles              │
│   ✔ Phrases qui portent                │
│      ◉ Intégration   [Louarn] ●●●○     │  ← actuelle, étape 4 sur 4
│  ── Charisme et confiance ── (Ajonc)   │
│   ○ La confiance qui se voit           │  ← prochaine, nommée
│      ·        ·        ·               │
│   ·        ·                           │  ← plus tard, sans nom
│  ── Situations de RDV ───── (Bruyère)  │
│      ·   ·   ·   ·   ·   ·             │
│                                        │
│  À 72, l'anglais et l'espagnol         │
│  se débloquent.                        │
│  Arrivée estimée : vers le 12 mars     │  ← existant
│  [courbe du cumul]                     │  ← existant
│                                        │
│  Tes souvenirs                         │
│  [◔] Le premier pas · 2 oct.           │
│  [◔] La voix de départ · 2 oct.        │
│  [◔] Le premier écho · 11 oct.         │
│  [◔] Le premier rendez-vous · 15 oct.  │
│  D'autres viendront en chemin.         │
│                                        │
│  18 jours pratiqués en octobre …       │  ← suite inchangée : mois,
│  [axes] [calendrier] [Ta voix]         │    axes, calendrier, voix
└────────────────────────────────────────┘
```

### 5.3 Fin de séance avec célébration (séance 20 : fin du thème 5)

```
┌────────────────────────────────────────┐
│                                        │
│           ● ● ● ● ◉ ○ ○                │  ← point du jour qui se
│                                        │    remplit (0,5 s, existant)
│               ┌──────┐                 │
│               │LOUARN│  ↑ petit saut   │  ← 300 ms → 0,8 s,
│               │stade2│    de 6 px      │    expression content
│               │120 px│                 │
│               └──────┘                 │
│   ╭──────────────────────────────────╮ │
│   │ Intégration : tout s'enchaîne    │ │  ← th-06 (priorité thème
│   │ d'un seul tenant. Tu as les      │ │    sur fin)
│   │ outils.                          │ │
│   ╰──────────────────────────────────╯ │
│                                        │
│     ✔ ─────── ◉ ─────── ○              │  ← mini-sentier : la coche
│   Phrases   Intégration  La confiance  │    se dessine, le portrait
│   qui portent             qui se voit  │    glisse (0,9 s)
│                                        │
│        ▶ Réécouter ta prise du jour    │  ← existant
│                                        │
│ ┌────────────────────────────────────┐ │
│ │               Fermer               │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### 5.4 Fin de séance avec montée de stade (séance 24 : stade 3)

```
┌────────────────────────────────────────┐
│           ● ● ● ● ● ◉ ○                │
│                                        │
│        ┌──────┐      ┌────────┐        │
│        │stade2│  ⟶   │ stade 3│        │  ← le stade 2 grandit et se
│        └──────┘      │ 150 px │        │    fond dans le stade 3
│                      └────────┘        │    (1 s au maximum)
│            Renard d'aplomb             │  ← nom du stade, Lexend 22
│   ╭──────────────────────────────────╮ │
│   │ Fondations posées : je tiens     │ │  ← sta-03 (priorité 1)
│   │ d'aplomb. Ta voix aussi.         │ │
│   ╰──────────────────────────────────╯ │
│   Nouveau souvenir : Les fondations    │  ← sans bulle (légende tro-09
│                                        │    visible dans la liste)
│   Prochain : Renard assuré, dans       │
│   12 séances                           │
│ ┌────────────────────────────────────┐ │
│ │               Fermer               │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### 5.5 Réglages (une ligne de plus)

```
│ Voix de guidage                 [oui] │
│ Vibrations                      [oui] │
│ Renard discret                  [non] │  ← nouveau
│   Il reste là, mais ne parle que      │
│   pour les grands moments.            │
```

---

## 6. Relecture en avocat du diable

| # | Gravité | Problème | Parade |
|---|---|---|---|
| 1 | 🔴 **Grave** | **Ça contredit deux décisions déjà validées** : le piège 6 de `expert-ux.md` (« points, niveaux, badges ») et la spec V1 §10 (« badges, niveaux » hors V1). Des stades, c'est un niveau qui ne dit pas son nom. | Les stades portent des noms et non des chiffres, ils dépendent d'un cumul qui ne baisse jamais, et rien ne s'y gagne ni ne s'y perd. Il y a seulement 11 souvenirs, tous liés à du réel. **Mais la décision revient à Fred** : il faut amender la spec §10 noir sur blanc avant de coder, sinon le prochain expert défera tout. |
| 2 | 🔴 **Grave** | **Le programme n'existe pas encore dans ce format.** `program.json` compte 12 semaines de 5 séances, `planner.js` a toujours `WEEKS_PER_CYCLE = 6`, et le **bloc 2 « Charisme et confiance » n'a aucun contenu écrit** (pas de fichier expert). Le Parcours et les seuils 24 et 48 en dépendent. Les 7 conseils `cha` sont écrits sans source de contenu. | On livre en deux temps : **d'abord le renard qui grandit** (il dépend seulement de `dailyCount`, faisable tout de suite), **ensuite le Parcours**, quand le bloc 2 est écrit et que `program.json` est passé à 18 × 4. Il faudra relire les conseils `cha` contre ce futur contenu. |
| 3 | 🔴 **Grave** | **Effet Tamagotchi** : une créature qui grandit grâce à moi peut devenir une créature que je déçois en ne venant pas, même si elle ne le dit pas. | Pas de faim, pas de sommeil, pas d'attente. Il est `content` au retour, et aucune réplique ne dit « je t'attendais » ni « tu m'as manqué » (le « Tu nous manques » du piège 3). Pas de notification. Vérifié réplique par réplique. |
| 4 | 🟠 Moyen | **Infantilisation** : un renardeau de dessin animé pour un homme de 50 ans, consultant. | Style plat et géométrique, sans joues roses ni yeux « kawaii ». Il parle comme un pair, sans point d'exclamation ni diminutif. Le stade renardeau dure environ 3 semaines. L'adulte porte une écharpe, pas un costume. On dit « Souvenirs » et non « trophées ». Le mode discret existe. **À tester à J7** : si Fred lève les yeux au ciel, on passe en discret par défaut. |
| 5 | 🟠 Moyen | **Usure des répliques.** Le moment `fin` (15 répliques) s'affiche à chaque séance : il fait un tour complet en 15 séances, soit environ un mois. C'est le stock le plus faible. Le petit saut, répété 72 fois, finira par ne plus se voir. | Le stock de l'accueil monte à 30 lignes avec les motivations, et les conseils font un tour en 4 mois environ. **À J30, écrire 15 répliques `fin` de plus.** Le saut est court et unique : on accepte qu'il devienne discret, et la vraie nouveauté vient des stades et des thèmes. |
| 6 | 🟠 Moyen | **Surcharge de l'accueil** : renard, bulle, carte de retour terrain, ligne de sauvegarde et 2 boutons. | La bulle **remplace** la ligne de contexte (aucun texte en plus), le renard se tait quand une carte est affichée, et il occupe la zone du milieu, qui était vide. Au pire, il reste 2 textes et 2 boutons, comme avant. |
| 7 | 🟠 Moyen | **Long palier de 48 à 71** : 24 séances sans grandir, soit environ 6 semaines. | Les déblocages de thème tombent tous les 4, les souvenirs du terrain arrivent surtout dans le bloc RDV, et le Parcours affiche « Encore N séances ». Si Fred trouve le palier trop long, on ajoute un stade à 60 (la consigne en autorisait 5 à 6, on serait à 7). |
| 8 | 🟡 Léger | « Le chemin repris » **récompense une absence**. | Il est unique, et la réplique parle du retour, jamais de l'absence. Pour un TDAH, revenir est **le** geste qui compte. On le garde. |
| 9 | 🟡 Léger | « Compris du premier coup » et « Objectif tenu » reposent sur un tap déclaratif. | C'est assumé : c'est la meilleure mesure du terrain qu'on ait (spec §4.4). Aucun chiffre n'en est tiré. |
| 10 | 🟡 Léger | Ce projet perso prend du temps sur le cash. | C'est Claude qui code. Fred donne **une réponse** (le point 1) et **un coup d'œil à J7** (le point 4). Rien d'autre. |
| 11 | 🟡 Léger | Les SVG en `<img>` perdraient le mode sombre. Les traits du visage (épaisseur 3, mise à l'échelle à 40 %) sont fins sur les stades en pied. | Ils sont inline, c'est imposé (§1.5). Les classes sont préfixées `lo-` (collision constatée avec `.fb` dans `app.css`). Les stades en pied ne s'affichent jamais sous 96 px, et le portrait prend le relais en petit. |

---

**Prochaine action unique** : Fred tranche le point 1. **On amende la spec §10 pour autoriser les stades du renard et les 11 souvenirs, oui ou non ?** Si c'est oui, le renard qui grandit se code en premier, et le Parcours suit quand le bloc 2 est écrit.
