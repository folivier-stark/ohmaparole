# Pack « Mesure » : textes inédits, écoutes réservées, parole spontanée, réplique éclair, auto-grille

> Rédigé par un binôme : orthophoniste spécialisé·e dans l'évaluation de la parole de l'adulte, et coach en vente consultative pour TPE.
> Destinataire : l'intégrateur de l'appli. Les consignes s'adressent à Fred (tutoiement).
> Source d'arbitrage : spec V2 §6-§7. Le bloc JSON en fin de fichier est importé tel quel dans `content/fr/mesure.json`.
> **Ce matériel mesure un entraînement. Il ne remplace pas un bilan orthophonique.**

---

## 0. En bref

| Élément | Nombre | Où il sert (spec V2) | Règle d'usage |
|---|---|---|---|
| Textes inédits A, B, C | 3 | Bilans 24, 48, 72 (§7, étape 3) | **Jamais en séance.** Les 3 à chaque bilan, ordre tiré au hasard, comparés texte par texte. |
| Passages d'écoute réservés | 3 | Bilans (§7, étape 5) | **Jamais en séance.** Un passage par bilan : ER1 à 24, ER2 à 48, ER3 à 72. Une seule écoute, texte masqué. |
| Questions de parole spontanée | 12 | Point de la semaine, format A (§6) | 45 s, sans préparation. Tirage sans remise : jamais deux fois la même dans un cycle de 12. |
| Répliques éclair | 12 | Point de la semaine, format B (§6) | La synthèse vocale dit la réplique, texte masqué. Fred répond, puis coche 2 cases en réécoutant. |
| Auto-grille | 6 × 3 niveaux | Bilans (§7, étape 6) | Une case « Non observé » à part, ajoutée par l'appli. On coche sur une prise réécoutée. |

**À reporter dans `extras.json` :** `reference.syllabes = 86` (spec V2 §0).

---

## 1. La convention de comptage

On compte une fois, à la main, et on ne change plus jamais la règle. **La valeur exacte importe peu, seule la tendance compte** (D §4, rang 1). Ce qui compte, c'est que la règle soit la même pour les quatre textes et pour toujours.

| Règle | Exemples tirés des textes |
|---|---|
| 1 syllabe = 1 voyelle prononcée | Bon-jour = 2 |
| Le e final non accentué ne compte pas : -e, -es, et -ent des verbes | faire = 1, entre = 1, votre = 1, comprendre = 2, cir-culent = 2 |
| Exception : il compte s'il est la seule voyelle du mot | je, de, le, ce, que, ne = 1 chacun |
| Tout autre e muet compte, même à l'intérieur d'un mot | pe-tites = 2, en-tre-prises = 3, j'ai-me-rais = 3, dé-par-te-ment = 4, se-maine = 2 |
| Liaisons, enchaînements et élisions écrites ne changent rien | j'ac-com-pagne = 3, sont-elles = 2, qu'est-ce = 2 |
| i, u ou ou suivis d'une voyelle : une seule syllabe avec elle | quo-ti-dien = 3, mé-tier = 2, suis = 1, rien = 1, Puis = 1, par-tiez = 2 |
| Un sigle se compte lettre par lettre | IA = 2 |

**Cas évité exprès :** aucun mot des quatre textes ne demande de trancher la diérèse après consonne + l ou r (« cli-ent », « pri-er »). Si un texte futur en contient, la règle est : 2 syllabes.

**Ce que ça implique :** à vitesse normale, Fred avale sans doute une partie des e muets comptés (« j'suis », « c'est d'faire »). Le débit affiché est donc un débit **conventionnel**, comparable seulement à lui-même. Si Fred ralentit et prononce davantage de e muets, cela fait aussi baisser le débit mesuré : c'est cohérent avec « plus posé ».

---

## 2. Comptage du texte de référence (`fr.REF1`, en place)

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | Bon-jour (2) · je (1) · suis (1) · Fred (1) | 5 |
| 2 | Mon (1) · mé-tier (2) · c'est (1) · de (1) · faire (1) · le (1) · pont (1) · entre (1) · la (1) · tech-nique (2) · et (1) · l'hu-main (2) | 15 |
| 3 | J'ac-com-pagne (3) · les (1) · ar-ti-sans (3) · et (1) · les (1) · pe-tites (2) · en-tre-prises (3) · dans (1) · leur (1) · trans-for-ma-tion (4) · nu-mé-rique (3) | 23 |
| 4 | A-vant (2) · de (1) · par-ler (2) · d'ou-tils (2) · j'ai-me-rais (3) · com-prendre (2) · votre (1) · quo-ti-dien (3) · qu'est (1) · ce (1) · qui (1) · vous (1) · prend (1) · le (1) · plus (1) · de (1) · temps (1) · en (1) · ce (1) · mo-ment (2) | 29 |
| 5 | Les (1) · chaus-settes (2) · de (1) · l'ar-chi-du-chesse (4) · sont (1) · elles (1) · sèches (1) · ar-chi-sèches (3) | 14 |
| **Total** | 53 mots, 5 phrases | **86** |

---

## 3. Les textes inédits A, B et C

### 3.1 Comment ils ont été construits

- **Même registre** que la référence : se présenter, dire ce qu'on fait, puis poser une question au prospect.
- **Même squelette en 5 phrases** : salut et prénom · métier · méthode · transition · question.
- **Longueur :** 87 syllabes chacun, soit +1,2 % par rapport aux 86 de la référence (tolérance : ±10 %).
- **Aucun virelangue.** Aucune tournure reprise de la référence ni des items d'articulation déjà en séance (vérifié par recherche dans `content/fr/` et `docs/experts/`). Sinon, l'entraînement quotidien avantagerait un texte et fausserait l'estimation de l'effet de pratique (M §2.3).
- **Interdits respectés :** aucun prix, aucun chiffre de résultat, aucune promesse.

### 3.2 Comptage détaillé

**Texte A (`fr.TA`)**

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | Bon-jour (2) · je (1) · m'ap-pelle (2) · Fred (1) | 6 |
| 2 | Je (1) · tra-vaille (2) · a-vec (2) · les (1) · com-mer-çants (3) · et (1) · les (1) · in-dé-pen-dants (4) · du (1) · dé-par-te-ment (4) | 20 |
| 3 | Mon (1) · rôle (1) · con-siste (2) · à (1) · re-pé-rer (3) · les (1) · tâches (1) · ré-pé-ti-tives (4) · qu'un (1) · as-sis-tant (3) · I-A (2) · pour-rait (2) · prendre (1) · en (1) · charge (1) | 25 |
| 4 | Je (1) · ne (1) · pro-pose (2) · rien (1) · sans (1) · a-voir (2) · d'a-bord (2) · ob-ser-vé (3) · votre (1) · or-ga-ni-sa-tion (5) | 19 |
| 5 | Quelle (1) · par-tie (2) · de (1) · votre (1) · se-maine (2) · ai-me-riez (3) · vous (1) · al-lé-ger (3) · en (1) · pre-mier (2) | 17 |
| **Total** | 48 mots, 5 phrases | **87** |

**Texte B (`fr.TB`)**

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | En-chan-té (3) · moi (1) · c'est (1) · Fred (1) | 6 |
| 2 | Je (1) · pré-pare (2) · et (1) · j'ins-talle (2) · des (1) · as-sis-tants (3) · I-A (2) · pour (1) · les (1) · pro-fes-sion-nels (4) · du (1) · bâ-ti-ment (3) | 22 |
| 3 | Je (1) · pars (1) · tou-jours (2) · de (1) · votre (1) · fa-çon (2) · de (1) · faire (1) · pas (1) · d'une (1) · so-lu-tion (3) · clé (1) · en (1) · main (1) | 18 |
| 4 | Pour (1) · com-men-cer (3) · dé-cri-vez (3) · moi (1) · une (1) · jour-née (2) · or-di-naire (3) · du (1) · le-ver (2) · au (1) · cou-cher (2) | 20 |
| 5 | À (1) · quel (1) · mo-ment (2) · sen-tez (2) · vous (1) · que (1) · le (1) · tra-vail (2) · ad-mi-nis-tra-tif (5) · dé-borde (2) · sur (1) · le (1) · reste (1) | 21 |
| **Total** | 52 mots, 5 phrases | **87** |

**Texte C (`fr.TC`)**

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | Bon-jour (2) · c'est (1) · Fred (1) · nous (1) · nous (1) · sommes (1) · par-lé (2) · ven-dre-di (3) | 12 |
| 2 | Je (1) · mets (1) · en (1) · place (1) · l'I-A (2) · dans (1) · les (1) · ca-bi-nets (3) · les (1) · a-gences (2) · et (1) · les (1) · com-merces (2) | 18 |
| 3 | Ma (1) · dé-marche (2) · je (1) · com-mence (2) · par (1) · re-gar-der (3) · com-ment (2) · cir-culent (2) · vos (1) · do-cu-ments (3) · et (1) · vos (1) · mes-sages (2) | 22 |
| 4 | Puis (1) · nous (1) · dé-ci-dons (3) · en-semble (2) · de (1) · ce (1) · qui (1) · mé-rite (2) · d'être (1) · sim-pli-fié (3) | 16 |
| 5 | Se-lon (2) · vous (1) · que (1) · de-vien-drait (3) · votre (1) · ac-ti-vi-té (4) · si (1) · vous (1) · par-tiez (2) · une (1) · se-maine (2) | 19 |
| **Total** | 55 mots, 5 phrases | **87** |

### 3.3 Profil articulatoire : les trois textes sont appariés entre eux

**Méthode :** transcription phonologique simplifiée de chaque mot, faite à la main, avec les liaisons obligatoires et sans les e finaux muets, puis décompte des sons par classe. « Suite de consonnes » = au moins deux consonnes de suite dans un mot (tr, st, rd…). « Groupe occlusive ou f/v + l/r » = les groupes travaillés en semaine 4 (tr, pr, cr, bl, fr…).

| Mesure | Réf. | Réf. sans le virelangue | **A** | **B** | **C** |
|---|---|---|---|---|---|
| Syllabes | 86 | 72 | **87** | **87** | **87** |
| Phrases | 5 | 4 | **5** | **5** | **5** |
| Phonèmes | 204 | 170 | 203 | 203 | 204 |
| Occlusives p b t d k g | 41 | 37 | **38** | **38** | **38** |
| Sifflantes et chuintantes s z ch j | 25 | 14 | **21** | **21** | **23** |
| Suites de consonnes | 17 | 15 | **17** | **15** | **15** |
| dont occlusive ou f/v + l/r | 10 | 10 | **8** | **8** | **8** |
| e muets comptés | 12 | 11 | 10 | 8 | 10 |

**Lecture :**
- **A, B et C sont presque identiques entre eux** : 38 occlusives chacun, 8 groupes occlusive + l/r chacun, 21 à 23 sifflantes, 15 à 17 suites de consonnes, 203 à 204 phonèmes.
- **Ils sont un peu plus faciles que la référence** : moins d'occlusives (38 contre 41), moins de groupes (8 contre 10), et moins de sifflantes que la référence entière, dont le virelangue final porte à lui seul 11 sifflantes et chuintantes. C'est attendu : la consigne interdit le virelangue dans A, B et C.
- **Conséquence pour l'intégrateur :** on compare **A à A, B à B, C à C** d'un bilan à l'autre (M §2.3). Jamais la valeur absolue d'un texte inédit avec celle de la référence.

---

## 4. Les passages d'écoute réservés

### 4.1 Déroulé au bilan

1. L'appli joue le passage **une seule fois**, texte masqué. La synthèse vocale convient ; une voix humaine enregistrée par un proche est mieux (`expert-contenu.md` §1).
2. Fred reformule à voix haute en 30 s. La prise est enregistrée.
3. L'appli révèle les 3 faits clés. Fred coche ceux qui sont **dans sa reformulation**, en la réécoutant : « faits clés retrouvés » sur 3.

### 4.2 Comment ils ont été construits

| | ER1 | ER2 | ER3 |
|---|---|---|---|
| Métier | Réparateur de vélos | Serrurier dépanneur | Brûlerie de café |
| Mots | 83 | 80 (83 si on sépare les apostrophes) | 82 (85) |
| Phrases | 6 | 6 | 6 |
| Faits clés | 3 | 3 | 3 |
| Détails sans enjeu (leurres) | 2 : centre-ville, apprentie une semaine sur deux | 1 : la camionnette comme bureau | 3 : ancien garage, étiquettes, la sœur répond |

- **Les faits sont des faits** : un objet, un lieu, un jour, une personne. Aucune émotion à deviner, aucune interprétation.
- **Trois passages construits en parallèle** (même longueur, même nombre de phrases, faits répartis du début à la fin), parce qu'on en lit un différent à chaque bilan. Relire le même passage ferait mesurer la mémoire.
- **Sujets nouveaux.** Les 36 passages existants (L01 à L36 de `expert-contenu.md`, `expert-contenu-situations.md` et `expert-contenu-charisme.md`) ont été relus. Aucun ne parle de vélos, de serrurerie ou de torréfaction, ni de tableau blanc, d'astreinte, de photos pour les assurances, de marchés ou d'appel d'offres.

---

## 5. Les questions de parole spontanée

- **Format A du point de la semaine :** 45 s, sans préparation. L'appli mesure le % de pause et le nombre de pauses, ni débit ni syllabes, puisqu'il n'y a pas de texte (spec V2 §6).
- **Ce qu'elles couvrent :** expliquer l'IA sans jargon (QS01, QS06, QS07, QS11), présenter son métier (QS03, QS08, QS12), sa méthode (QS04, QS05, QS09), la confidentialité (QS02) et la différence face à la concurrence (QS10).
- QS02 entraîne aussi le mot long « pseudonymisation » en parole libre.

---

## 6. Les répliques éclair

**Déroulé :** R §3.3. La réplique est jouée, Fred répond, l'appli mesure le délai, la durée et le silence tenu, puis Fred coche les 2 cases en **réécoutant sa prise**, jamais de mémoire.

| Id | Famille | Compétence de la grille |
|---|---|---|
| RE01 | Objection : essai raté | Écoute et reformulation |
| RE02 | Objection : données | Écoute et reformulation |
| RE03 | Objection : « pas pour moi » | Écoute, sans jargon |
| RE04 | Question piège : le prix d'emblée | C1 |
| RE05 | Question piège : remplacer une personne | Transversal : aucune promesse |
| RE06 | Question piège : la garantie | Transversal : aucune promesse |
| RE07 | Sujet qui dérive : service gratuit | C5 |
| RE08 | Sujet qui dérive : débat général | C4 |
| RE09 | « Je vais réfléchir » | C5 |
| RE10 | « Je vais réfléchir » : l'associée | C5 |
| RE11 | Signal d'achat : quand ? | C6 |
| RE12 | Signal d'achat : qui d'autre s'en servirait ? | C6 |

**Les cases sont observables à la réécoute** : un mot dit ou pas dit, une question posée ou pas, une phrase ou plusieurs, un silence ou pas. Aucune case ne demande de juger le ton.

---

## 7. L'auto-grille

- Elle reprend les 6 compétences de R §2.2 : G1 = C1 … G6 = C6. **Niveau 1 · le geste démarre, niveau 2 · le geste est là, niveau 3 · le geste s'ajuste.** Chaque niveau ajoute des gestes au précédent.
- **« Non observé »** est une case à part, ajoutée par l'appli : si la situation ne s'est pas présentée, on ne coche rien. Ce n'est pas le niveau 1.
- **On coche sur une prise réécoutée**, avec une phrase de preuve si possible (R §2.1).
- Les niveaux tiennent en 80 caractères au plus. Ils décrivent des gestes, sans adjectif de jugement.

---

## 8. Réserves, de la plus importante à la plus légère

1. **L'équivalence de A, B et C est construite, pas mesurée.** Elle repose sur ma transcription à la main. Si le premier bilan montre qu'un texte se lit nettement plus vite que les autres, ce n'est pas grave : la comparaison se fait texte par texte.
2. **L'estimation de l'effet de pratique (M §2.3) est un peu biaisée** : la référence contient un virelangue et elle est un peu plus dense en consonnes que les textes inédits. L'écart de progrès entre les deux reste un indice, pas une preuve.
3. **« Faits clés retrouvés » n'a que 4 valeurs (0 à 3)**, et le passage change à chaque bilan. Un écart d'un fait peut venir du passage. Cet indicateur ne suffit jamais seul à dire « progrès confirmé ».
4. **A, B et C font 48 à 55 mots**, pas les « environ 70 » de M §2.3. Ils sont calés sur la référence (53 mots, 86 syllabes), comme le demande la spec V2 §7.
5. **La grille est condensée** pour tenir en 80 caractères. Quelques gestes de R §2.2 n'y sont plus : le cadre modifié face à une contrainte (C1), la question sur la raison d'un « je vais réfléchir » (C5), la date fixée après un oui (C6). Ils restent dans RE09 à RE11.
6. **Les répliques sont courtes** (3 à 6 s à l'oral). La famille « digression » de R §3.3, qui mesure le moment de la coupure, demande une réplique longue avec écouteurs ; elle n'est pas couverte ici.

---

## 9. Le contenu (`content/fr/mesure.json`)

```json
{
  "referenceSyllabes": 86,
  "convention": "1 syllabe = 1 voyelle prononcée. Le e final non accentué (-e, -es, -ent des verbes) ne compte pas, sauf s'il est la seule voyelle du mot (je, de, le, ce, que) ; tout autre e muet compte, même à l'intérieur d'un mot (pe-tites = 2, en-tre-prises = 3).\nLiaisons, enchaînements et élisions écrites (l', j', d', qu', c') ne changent rien ; i, u ou ou suivis d'une voyelle font une seule syllabe avec elle (quo-ti-dien = 3, suis = 1), et un sigle se compte lettre par lettre (IA = 2).",
  "textesInedits": [
    {
      "id": "fr.TA",
      "titre": "Les commerçants du département",
      "texte": "Bonjour, je m'appelle Fred. Je travaille avec les commerçants et les indépendants du département. Mon rôle consiste à repérer les tâches répétitives qu'un assistant IA pourrait prendre en charge. Je ne propose rien sans avoir d'abord observé votre organisation. Quelle partie de votre semaine aimeriez-vous alléger en premier ?",
      "syllabes": 87
    },
    {
      "id": "fr.TB",
      "titre": "Les professionnels du bâtiment",
      "texte": "Enchanté, moi c'est Fred. Je prépare et j'installe des assistants IA pour les professionnels du bâtiment. Je pars toujours de votre façon de faire, pas d'une solution clé en main. Pour commencer, décrivez-moi une journée ordinaire, du lever au coucher. À quel moment sentez-vous que le travail administratif déborde sur le reste ?",
      "syllabes": 87
    },
    {
      "id": "fr.TC",
      "titre": "Les cabinets et les agences",
      "texte": "Bonjour, c'est Fred : nous nous sommes parlé vendredi. Je mets en place l'IA dans les cabinets, les agences et les commerces. Ma démarche : je commence par regarder comment circulent vos documents et vos messages. Puis nous décidons ensemble de ce qui mérite d'être simplifié. Selon vous, que deviendrait votre activité si vous partiez une semaine ?",
      "syllabes": 87
    }
  ],
  "ecoutesReservees": [
    {
      "id": "fr.ER1",
      "titre": "Le réparateur de vélos",
      "passage": "Je tiens un atelier de réparation de vélos, en centre-ville. On est trois : moi, un mécanicien et une apprentie, qui vient une semaine sur deux. Les réparations en cours, on les écrit sur un grand tableau blanc. Le mois dernier, il a été effacé pendant le ménage, et on a dû rappeler tout le monde. Les pièces, je les commande chez deux grossistes, et je recopie les références à la main dans un cahier. Les batteries des vélos électriques partent chez le fabricant.",
      "faitsCles": [
        "Les réparations sont écrites sur un tableau blanc, effacé le mois dernier pendant le ménage.",
        "Les références des pièces sont recopiées à la main dans un cahier.",
        "Les batteries des vélos électriques partent chez le fabricant."
      ]
    },
    {
      "id": "fr.ER2",
      "titre": "Le serrurier dépanneur",
      "passage": "On fait de la serrurerie et du dépannage, à trois : moi et deux techniciens. Mon bureau, c'est surtout la camionnette. La nuit et le week-end, les deux techniciens se passent un portable d'astreinte, une semaine chacun. Le lundi matin, celui qui était d'astreinte me raconte ses interventions de vive voix, et je fais les factures à partir de ça. Les assurances de nos clients demandent des photos avant et après chaque réparation. Ces photos restent dans les téléphones des techniciens.",
      "faitsCles": [
        "Les deux techniciens se passent un portable d'astreinte, une semaine chacun.",
        "Les factures sont faites à partir du récit oral du lundi matin.",
        "Les photos avant et après, demandées par les assurances, restent dans les téléphones des techniciens."
      ]
    },
    {
      "id": "fr.ER3",
      "titre": "La brûlerie de café",
      "passage": "Avec ma sœur, on torréfie du café dans un ancien garage, à l'entrée de la zone artisanale. On vend sur place et sur trois marchés : le mardi, le vendredi et le dimanche. Les étiquettes des sachets, on les imprime une par une. Le soir, des restaurants nous passent commande par message, pour le lendemain matin. C'est ma sœur qui répond. Et la communauté de communes nous a envoyé un appel d'offres pour le café de ses bureaux, à rendre avant fin novembre.",
      "faitsCles": [
        "Le café est vendu sur place et sur trois marchés : mardi, vendredi et dimanche.",
        "Le soir, des restaurants commandent par message pour le lendemain matin.",
        "La communauté de communes a envoyé un appel d'offres à rendre avant fin novembre."
      ]
    }
  ],
  "questionsSpontanees": [
    { "id": "fr.QS01", "texte": "Explique à une fleuriste ce que fait un assistant IA, sans aucun mot technique." },
    { "id": "fr.QS02", "texte": "Un expert-comptable te demande ce que veut dire « pseudonymisation ». Explique-lui avec un exemple." },
    { "id": "fr.QS03", "texte": "Présente ton parcours en trois étapes à un dirigeant qui ne te connaît pas." },
    { "id": "fr.QS04", "texte": "Explique à un menuisier pourquoi tu commences par écouter avant de proposer quoi que ce soit." },
    { "id": "fr.QS05", "texte": "Raconte à une gérante de boutique comment se passe une mise en place, du premier rendez-vous à la prise en main." },
    { "id": "fr.QS06", "texte": "Un dirigeant de PME te demande pourquoi utiliser plusieurs IA plutôt qu'une seule. Réponds-lui simplement." },
    { "id": "fr.QS07", "texte": "Une boulangère te demande ce qui se passe si l'outil se trompe. Réponds-lui." },
    { "id": "fr.QS08", "texte": "Au club d'entreprises, quelqu'un te demande pourquoi tu fais ce métier. Réponds-lui." },
    { "id": "fr.QS09", "texte": "Explique à un plombier ce qu'il peut préparer avant votre premier rendez-vous de travail." },
    { "id": "fr.QS10", "texte": "Un prospect te demande ce qui te distingue d'une agence web. Réponds sans critiquer personne." },
    { "id": "fr.QS11", "texte": "Un chauffeur de taxi te dit qu'il tape avec deux doigts. Explique-lui comment il pourrait dicter à la place." },
    { "id": "fr.QS12", "texte": "Tu croises un ancien collègue au marché. Explique-lui en quoi consiste ton travail aujourd'hui." }
  ],
  "repliquesEclair": [
    { "id": "fr.RE01", "replique": "J'ai déjà essayé ChatGPT. Il m'a sorti n'importe quoi.", "critere1": "J'ai reformulé sa déception avant de répondre.", "critere2": "J'ai fini par une question sur ce qu'il avait essayé." },
    { "id": "fr.RE02", "replique": "Mes données, je ne veux pas qu'elles partent aux États-Unis.", "critere1": "J'ai reformulé son inquiétude avant de répondre.", "critere2": "J'ai cité une option concrète : outil européen ou pseudonymisation." },
    { "id": "fr.RE03", "replique": "L'informatique et moi, ça fait deux. Je ne m'en servirai jamais.", "critere1": "J'ai posé une question sur ce qu'il fait déjà avec son téléphone.", "critere2": "Je n'ai dit aucun sigle ni aucun mot anglais." },
    { "id": "fr.RE04", "replique": "Avant d'aller plus loin, donnez-moi votre prix.", "critere1": "J'ai donné le cadre, prix compris, sans repousser la question.", "critere2": "J'ai fini par une question de validation." },
    { "id": "fr.RE05", "replique": "Avec votre outil, je pourrai me passer de ma secrétaire ?", "critere1": "J'ai dit clairement que l'outil ne remplace pas une personne.", "critere2": "J'ai demandé ce qui prend du temps à sa secrétaire." },
    { "id": "fr.RE06", "replique": "Vous me garantissez que je vais gagner du temps ?", "critere1": "Je n'ai dit ni « garanti » ni aucun chiffre de gain.", "critere2": "J'ai proposé de juger sur une seule tâche." },
    { "id": "fr.RE07", "replique": "Tiens, vous qui êtes dans l'informatique, vous pourriez regarder mon imprimante ?", "critere1": "Mon non tient en une phrase.", "critere2": "J'ai ramené la conversation à l'objectif du rendez-vous." },
    { "id": "fr.RE08", "replique": "À la radio, ils disent que l'IA va remplacer tout le monde. Vous en pensez quoi ?", "critere1": "J'ai donné mon avis en deux phrases au plus.", "critere2": "J'ai enchaîné sur une question à propos de son travail." },
    { "id": "fr.RE09", "replique": "C'est intéressant. Laissez-moi y réfléchir, je vous rappelle.", "critere1": "J'ai posé une seule question sur ce qui le fait hésiter.", "critere2": "J'ai proposé une date précise pour sa réponse." },
    { "id": "fr.RE10", "replique": "Il faut d'abord que j'en parle à mon associée.", "critere1": "J'ai demandé ce que son associée aura besoin de savoir.", "critere2": "J'ai proposé un rendez-vous à trois, avec une date." },
    { "id": "fr.RE11", "replique": "Si on y va, vous pourriez démarrer quand ?", "critere1": "J'ai nommé sa question avant d'y répondre.", "critere2": "J'ai fini par une question fermée, puis je me suis tu." },
    { "id": "fr.RE12", "replique": "Ma comptable pourrait s'en servir aussi, ou c'est réservé à moi ?", "critere1": "J'ai reformulé sa question avant de répondre.", "critere2": "J'ai fini par une question fermée sur la suite." }
  ],
  "autoGrille": [
    { "id": "fr.G1", "competence": "Première impression", "niveaux": [
      "Je salue et me présente. Ni durée, ni déroulé, ni budget annoncés.",
      "Dans la 1re minute : son nom, la durée, le déroulé. Le mot « budget » est dit.",
      "En 60 s : cadre complet, budget au même ton, « Ça vous va ? », j'attends."
    ] },
    { "id": "fr.G2", "competence": "Prise de contact", "niveaux": [
      "3 questions ou plus hors sujet, ou c'est l'autre qui fait la transition.",
      "1 ou 2 questions de lien, puis je fais la transition moi-même.",
      "Une seule question, j'écoute la réponse, ma transition reprend un de ses mots."
    ] },
    { "id": "fr.G3", "competence": "Raconter un cas client", "niveaux": [
      "Plus de 90 s, ou un des trois temps manque, ou un chiffre, ou une promesse.",
      "Les trois temps en 60 à 90 s, sans chiffre ni promesse.",
      "60 s au plus, trois temps, les mots du client, « Ça vous parle ? », silence."
    ] },
    { "id": "fr.G4", "competence": "Recadrer", "niveaux": [
      "Les anecdotes vont au bout, le temps est dépassé sans que je le dise.",
      "Une coupure avec l'objectif, mais tard ou après plusieurs excuses.",
      "Dès la 2e digression : son nom, son point utile, l'objectif, le temps restant."
    ] },
    { "id": "fr.G5", "competence": "Dire non", "niveaux": [
      "J'accepte la demande hors cadre, ou je réponds « on verra ».",
      "Je dis non, puis 2 justifications ou plus, ou une porte floue.",
      "Non en une phrase, une seule alternative concrète, puis silence."
    ] },
    { "id": "fr.G6", "competence": "Repérer un signal et conclure", "niveaux": [
      "Après une question sur le comment ou le quand, je continue d'argumenter.",
      "Je réponds au signal. Ma question finale est ouverte, ou suivie d'une phrase.",
      "Je nomme le signal, je résume en 3 points, question fermée, 3 s de silence."
    ] }
  ]
}
```
