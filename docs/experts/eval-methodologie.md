# OhMaParole : méthodologie d'évaluation et d'affichage des progrès

> Rédigé par un binôme : **psychométricien·ne** (mesure du changement individuel, cas unique, mesures répétées) et **designer de feedback** pour adultes TDAH.
> Destinataires : Fred et l'intégrateur. Date : 09/10/2026.
> Rôle de ce document : **intégrer** les mesures acoustiques, de posture et de rendez-vous (conçues par trois autres experts) dans un système unique, qui dit vrai et qui rassure.
> Convention : **J = numéro de séance**, pas de jour calendaire (spec V1 §9). S1, S30 et S60 désignent les séances 1, 30 et 60.

---

## 0. En bref

| # | Décision | Pourquoi, en une ligne |
|---|---|---|
| 1 | **Pas d'indice composite affiché.** Chaque axe a **un indicateur principal**, choisi et figé à S1, et des indicateurs de soutien qui confirment ou contredisent. | Un composite a des poids arbitraires, il laisse un gain masquer une perte et devient une cible (Goodhart). |
| 2 | **Le seuil est le bruit de Fred, pas un barème.** Un changement compte s'il dépasse la plus petite variation détectable (MDC), calculée sur **sa** variabilité d'une séance à l'autre. | C'est la logique de Jacobson-Truax, appliquée à un seul individu. |
| 3 | **Quatre états seulement :** « en calibrage », « pas encore mesurable », « tendance probable », « progrès confirmé ». Jamais de pourcentage nu, jamais de score. | Un mot calibré est plus honnête qu'un faux chiffre précis. |
| 4 | **Le verdict tombe à dates fixes (S30, S60), pas en continu.** Entre deux bilans, l'appli montre l'effort, qui est exact, et la mesure qui se construit. | Regarder tous les jours multiplie les fausses alertes, même avec un bon test. |
| 5 | **Effort tous les jours, résultat aux bilans.** | Le TDAH a besoin d'un retour immédiat, mais le résultat est trop bruité pour être donné au jour le jour. |
| 6 | **Le texte de référence ne suffit pas.** On ajoute **3 textes inédits parallèles**, lus seulement aux bilans, pour mesurer le transfert et neutraliser l'apprentissage par cœur. | Sinon, l'appli mesure surtout la mémoire de Fred. |
| 7 | **La règle actuelle « en hausse » (+10 points) est à remplacer** : sur du pur hasard, elle s'allume environ **une fois sur trois** (§2.6). | C'est exactement le « mensonge gentil » à éviter. |

**La phrase pour Fred :** *« Un progrès compte quand il dépasse ce que ta voix varie d'elle-même d'une séance à l'autre. On a mesuré cette variation au début, sur toi. »*

---

## 1. Le modèle de mesure

### 1.1 Trois familles, trois natures d'erreur

| Famille | Exemples | Point fort | Point faible | Erreur dominante |
|---|---|---|---|---|
| **Objective (machine)** | Taux de mots reconnus, débit, pauses, disfluences, stabilité, regard, mains | Fidèle et répétable, sans biais d'attente | **Validité étroite** : elle mesure un indicateur indirect, pas « être compris en RDV ». Sensible au matériel, au micro, à la version du modèle. | Erreur d'instrument et de condition |
| **Déclarative (Fred)** | Clair / Moyen / Brouillon, Repéré, Posé, aisance perçue | Couvre le vécu, ce qui rassure, gratuite | **Biais d'attente**, humeur, fatigue. Chez l'adulte TDAH, une tendance documentée à **surestimer** sa performance (Knouse et al., 2005). **Glissement de référence** (*response shift*) : quand l'oreille s'affine, la note baisse alors que la compétence monte (Sprangers & Schwartz, 1999). | Biais systématique, qui dérive dans le temps |
| **Observée (terrain, tiers)** | « On t'a fait répéter ? », objectif de RDV atteint, écoute à l'aveugle par un proche | **La plus proche du vrai but** : être compris par quelqu'un d'autre | Rare (quelques RDV par semaine), confondue par le contexte (prospect, sujet, fatigue), et pas de vraie ligne de base | Bruit d'échantillonnage et confusion |

**Conséquence :** les trois familles **ne sont pas interchangeables**. Elles ne mesurent pas la même chose avec plus ou moins de précision, elles mesurent **des facettes différentes avec des erreurs différentes**. C'est un argument pour la **triangulation**, pas pour la moyenne.

### 1.2 Indice composite par axe : fausse bonne idée **comme chiffre**, bonne idée **comme règle de décision**

**Contre un chiffre composite affiché (« Diction : 64/100 ») :**
1. **Les poids sont arbitraires.** Avec d'autres poids, la conclusion change. Le manuel de l'OCDE et du JRC exige pour cette raison une analyse de sensibilité aux poids (OECD/JRC, 2008), infaisable à expliquer sur un écran de téléphone.
2. **Il compense.** Un gain de débit peut masquer une perte d'intelligibilité. Or, pour Fred qui parle vite, ralentir **au prix** de la clarté n'est pas un progrès.
3. **Il dilue le signal.** Mélanger une mesure fidèle et une auto-évaluation bruitée donne un indice moins fiable que la meilleure de ses composantes.
4. **C'est un indicateur formatif** (les composantes définissent le construit au lieu de le refléter). Sa signification change avec chaque ajout ou retrait d'indicateur (Edwards & Bagozzi, 2000).
5. **Il devient une cible** (§6.3) et il contredit la spec V1 (« aucun score de voix »).
6. **Fred ne peut rien en faire** : « 64 » ne dit pas quoi travailler.

**Pour une règle de décision composite :** le verdict d'un axe combine les familles selon des règles explicites (§1.4). Il ne fait pas de moyenne. C'est ce qu'on recommande.

**Si un agrégat interne est nécessaire** (pour départager deux indicateurs objectifs du même construit, jamais pour l'affichage) : moyenne des **scores z calculés par rapport à la ligne de base de Fred**, sens aligné, **pondérée par l'inverse de la variance** (poids = 1/SEM²). C'est la seule pondération qui ne soit pas arbitraire, puisque l'indicateur le plus précis pèse le plus. On ne l'applique **qu'à l'intérieur d'une même famille et d'un même construit**.

### 1.3 Un indicateur principal par axe, figé à S1

Plus on suit d'indicateurs, plus l'un d'eux « progresse » par hasard. Avec 15 indicateurs testés chacun à 5 %, la probabilité qu'au moins un affiche un faux progrès est de **54 %** ; avec 10 indicateurs, elle est de 40 % (calcul : 1 − 0,95ⁿ). C'est le « jardin des sentiers qui bifurquent » (Gelman & Loken, 2013).

**Parade :** à la fin du bilan S1, l'appli **fige** un indicateur principal par axe. Les autres sont des soutiens : ils peuvent confirmer ou contredire, jamais déclencher seuls un « confirmé ».

| Axe | Indicateur principal (proposé) | Soutiens | Contexte seulement |
|---|---|---|---|
| **Diction et élocution** | **Taux de mots reconnus sur les 3 textes inédits**, en moyenne, comparé texte par texte à S1. **Repli** si S1 est déjà au plafond (≥ 95 %) : disfluences par minute en parole spontanée. | Débit et pauses (en **zone cible**, pas « plus c'est mieux »), A/B aveugle par Fred, écoute du proche, « Clair » | Durée du texte de référence |
| **Écoute** | **Faits clés retrouvés (0 à 3)** sur un passage inédit réservé au bilan | « Repéré ? » quotidien | — |
| **Posture et présence** | Si la caméra est disponible : **la mesure de stabilité choisie par l'expert posture**, en situation simulée. Sinon : **comparaison à l'aveugle par le proche**. | Regard, mains, « Posé », auto-grille | — |
| **En rendez-vous** | **Part des RDV sans faire répéter** | Objectif atteint, indicateurs de l'expert RDV (comportements que Fred contrôle) | Signatures, montants. Trop dépendants du prospect pour juger la parole. |

**Règle « zone cible » :** débit, durée des pauses et regard ne sont **pas** monotones. Un débit qui baisse est un progrès jusqu'à un certain point, puis un problème. Chaque expert doit fournir une **zone cible** pour ces indicateurs. Le progrès s'exprime alors en « se rapproche de la zone » ou « est dans la zone ».

### 1.4 Règle de combinaison (le verdict d'un axe)

| Verdict | Conditions, toutes requises |
|---|---|
| **Progrès confirmé** | 1. L'indicateur principal dépasse la **MDC à 95 %** (indice de changement fiable, ou RCI, ≥ 1,96) à un bilan. 2. Au moins **une autre famille va dans le même sens** (pas forcément de façon significative). 3. **Aucune famille ne montre de dégradation probable.** 4. Le changement est **répliqué** : il est vu au bilan précédent en tendance, ou sur au moins 2 des 3 textes inédits. |
| **Tendance probable** | L'indicateur principal a un RCI entre 1,28 et 1,96 (de 80 % à 95 %), **ou** une pente positive sur 2 contrôles hebdomadaires de suite (§2.5), sans contradiction d'une autre famille. |
| **Pas encore mesurable** | Pas assez de points, ou changement plus petit que le bruit. Après S60, ce verdict devient « **pas de changement plus grand que le bruit** » (formulation au §4.3). |
| **En calibrage** | Moins de 3 mesures de ligne de base pour l'indicateur principal. |

**Contradiction entre familles** (par exemple, la machine dit mieux et le proche préfère S1) : le verdict descend d'un cran et l'écran dit « les mesures ne sont pas d'accord, on revérifie au prochain bilan ». C'est une information précieuse : la machine optimise peut-être un indicateur indirect (§6.3).

**Hiérarchie en cas de doute :** observé à l'aveugle par un tiers > objectif valide pour le construit > fait de terrain noté par Fred > ressenti. Mais aucune famille ne gagne seule.

### 1.5 Le contrat que chaque expert doit remplir pour qu'on puisse intégrer son indicateur

| Champ | Exemple |
|---|---|
| Définition et unité | « Mots reconnus / mots du texte, en % » |
| Sens | `plus = mieux`, `moins = mieux`, ou **zone cible** [a ; b] |
| Matériel valide | « **Lecture d'un texte connu de la machine uniquement** » (le taux de mots reconnus n'a pas de sens sans transcription de référence, donc pas en parole spontanée) |
| Plafond et plancher | « Inutilisable si la valeur de départ est ≥ 95 % » |
| Bruit attendu (s'il est connu) | Écart-type d'une prise à l'autre chez un adulte sain, sinon « inconnu » |
| Instrument et version | Modèle, version, paramètres. **Stockés avec chaque valeur.** |
| Conditions qui invalident | Bruit ambiant au-dessus d'un seuil, distance au micro, visage hors champ |

---

## 2. La rigueur pour un seul individu

### 2.1 Les trois seuils (une ligne chacun)

| Notion | Définition | Formule (pour l'intégrateur) |
|---|---|---|
| **SEM** (erreur de mesure) | De combien la mesure de Fred varie d'une séance à l'autre **sans vrai changement** | En cas unique : **écart-type intra-individuel** des mesures de ligne de base, appelé « erreur typique » par Hopkins (2000) |
| **MDC₉₅** (plus petite variation détectable) | L'écart minimal entre deux mesures pour être sûr à 95 % qu'il n'est pas du bruit | **MDC₉₅ = 1,96 × √2 × SEM ≈ 2,77 × SEM** (Weir, 2005 ; de Vet et al., 2006). Si chaque bilan fait la moyenne de k prises, on remplace SEM par SEM/√k. |
| **RCI** (indice de changement fiable) | Le changement exprimé en unités de bruit | **RCI = (après − avant) / (√2 × SEM)**. Fiable si \|RCI\| ≥ 1,96 (Jacobson & Truax, 1991). |

**Adaptation au cas unique :** Jacobson et Truax calculent la SEM à partir de l'écart-type d'une population et d'une fidélité test-retest publiée. Ici, il n'existe pas de norme pour les indicateurs de l'appli, mais on a mieux : **des mesures répétées de Fred lui-même**. La SEM intra-individuelle est la bonne quantité pour juger le changement d'**un** individu. Elle inclut aussi la variation réelle d'un jour à l'autre (fatigue, sommeil), ce qui est voulu : c'est ce bruit-là qu'il faut dépasser.

**Note TDAH :** la variabilité intra-individuelle est plus grande chez l'adulte TDAH (méta-analyse de 319 études, g = 0,46 chez l'adulte : Kofler et al., 2013). C'est mesuré sur des temps de réaction, pas sur la parole, mais c'est une raison de plus pour **calculer le bruit sur Fred** plutôt que de l'emprunter, et pour prévenir que les creux seront fréquents et sans signification.

### 2.2 La ligne de base : combien de mesures avant de conclure ?

- **Minimum : 3 mesures** sur au moins **3 occasions différentes** (3 séances), et pas 3 prises d'affilée. Trois prises le même jour ne mesurent que le bruit d'une même séance, ce qui sous-estime la SEM. Les standards du cas unique demandent 3 points par phase au minimum et **5 pour une conclusion sans réserve** (WWC, standards SCD).
- **Protocole proposé :**
  - **S1 (bilan)** : texte de référence lu **2 fois**. La 1ʳᵉ lecture sert de familiarisation et reste l'**ancre d'écoute A/B**, mais elle **n'entre pas** dans la ligne de base statistique. Les 3 textes inédits A, B et C sont lus une fois chacun.
  - **S2 et S3** : texte de référence lu une fois (30 s, à la place de la prise d'articulation). C'est le seul ajout du protocole aux séances ordinaires.
  - **Ligne de base du texte de référence** = moyenne des lectures S1 n° 2, S2 et S3, soit 3 occasions.
- **Pourquoi écarter la toute première lecture :** l'effet de pratique est maximal entre la 1ʳᵉ et la 2ᵉ passation (Calamia et al., 2012 ; Bartels et al., 2010). L'inclure créerait un faux progrès dès S7, dû à la seule familiarité avec la tâche et le micro.
- **Une SEM sur 3 points est imprécise** (2 degrés de liberté). On la **réestime à chaque bilan** à partir des résidus de la série hebdomadaire et de la série quotidienne, et on retient **la plus grande** des estimations (prudence). On ne la fait jamais baisser sous un **plancher** égal à la résolution de l'instrument.

### 2.3 Neutraliser l'apprentissage par cœur : les textes parallèles appariés

- **3 textes inédits A, B et C**, construits pour être équivalents : environ 70 mots, même répartition de sons difficiles, même longueur de phrases, même registre pro. Ils sont **réservés aux bilans** et n'apparaissent jamais en séance.
- Les **trois** sont lus à S1, à S30 et à S60. Chaque texte est donc lu une fois par mois, ce qui limite fortement la mémorisation.
- **Comparaison appariée texte par texte** (A à S60 contre A à S1, et ainsi de suite). La différence de difficulté entre textes s'annule, et la moyenne des 3 différences divise le bruit par environ √3.
- **Bonus :** l'écart entre le progrès sur le texte de référence (connu, répété à S1, S2, S3, S7, S14, S30…) et le progrès sur les textes inédits **estime l'effet de pratique**. Si le texte de référence progresse beaucoup plus, c'est de la mémoire, pas de la diction.
- Même logique pour l'écoute : **3 passages réservés au bilan**, jamais vus en séance.

### 2.4 Combien de points faut-il ? (ordre de grandeur honnête)

Pour comparer k mesures « avant » à k mesures « après », avec un changement réel Δ et un bruit σ : **k ≈ 2 × (1,96 × σ / Δ)²**.

| Changement réel, en unités de bruit (Δ/σ) | Mesures nécessaires de chaque côté |
|---|---|
| 0,5 | 31 |
| 1 | 8 |
| 1,5 | 4 |
| 2 | 2 |

**Puissance des séries** (simulation, 3 000 à 20 000 tirages, test de tendance de Kendall unilatéral à 2,5 %) :

| Série | Gain total réel sur la période | Probabilité de le détecter |
|---|---|---|
| 60 points quotidiens | 1 σ | **57 %** |
| 60 points quotidiens | 1,5 σ | **85 à 91 %** |
| 12 points hebdomadaires (2 contrôles positifs de suite exigés) | 2 σ | **34 %** |
| 12 points hebdomadaires (même règle) | 3 σ | **64 %** |

**Lecture honnête :**
- Les **séries quotidiennes** (prise d'articulation, « Clair », « Posé ») sont les plus puissantes, mais elles mesurent la performance **sur le matériel entraîné**.
- La **série hebdomadaire** et les **bilans** mesurent le **transfert**, ce qui compte vraiment, mais avec peu de points. Il faut un **gros** changement pour qu'ils le confirment.
- **En rendez-vous** : à 2 à 4 RDV par semaine, 60 séances donnent 20 à 40 RDV. Pour passer de 40 % à 15 % de RDV « on m'a fait répéter », 15 RDV de chaque côté ne suffisent pas à atteindre 95 %. **Le plafond réaliste de cet axe à S60 est « tendance probable ».** Il faut le dire à Fred dès S1, pour que ce ne soit pas une déception.

### 2.5 Décider qu'un changement est réel : trois outils et leur usage

| Outil | Quand | Règle |
|---|---|---|
| **RCI de Jacobson-Truax** | Comparaison de 2 bilans (S1 contre S30, S1 contre S60), sur l'indicateur principal | ≥ 1,96 : fiable à 95 % ; de 1,28 à 1,96 : probable |
| **MDC₉₅**, affichée en **zone de bruit** | Visualisation | Grisé autour de la valeur S1 = « ta variation normale ». Une valeur hors du grisé est un vrai changement. |
| **Pente de Theil-Sen avec intervalle** (Sen, 1968), ou test de tendance de Kendall | Séries hebdomadaires et quotidiennes | Pente robuste aux valeurs aberrantes (une mauvaise séance ne fait pas basculer la tendance). « Tendance probable » si 2 contrôles de suite donnent z > 1,96. |

**Autocorrélation :** les séries de cas unique sont souvent autocorrélées positivement (Shadish & Sullivan, 2011), ce qui gonfle les faux positifs. Avec ρ = 0,3, un test nominal à 2,5 % donne en simulation **7 %** de fausses alertes sur 60 points quotidiens. **Parade :** on agrège le quotidien en **médianes hebdomadaires** avant de tester, et on exige 2 contrôles positifs consécutifs.

**Regarder en continu :** tester chaque semaine sur des données qui s'accumulent multiplie les occasions de faux positifs (Armitage, McPherson & Rowe, 1969). En simulation, sur 7 contrôles hebdomadaires de pur bruit avec ρ = 0,3, la fausse alerte passe de 13 % (1 contrôle positif suffit) à **7 %** (2 contrôles de suite exigés). D'où la règle : **le « confirmé » ne se calcule qu'aux bilans** ; le « probable » hebdomadaire exige 2 contrôles de suite.

### 2.6 La règle actuelle du tableau de bord est trop généreuse

La spec du tableau de bord affiche « en hausse » si le taux des 4 dernières semaines dépasse d'au moins 10 points celui des 4 précédentes, avec au moins 3 réponses de chaque côté.

**Simulation, sans aucun vrai changement** (taux réel identique des deux côtés, de 30 % à 70 %) :

| Réponses par fenêtre | « En hausse » affiché à tort (règle actuelle) | Avec la règle proposée (probabilité de hausse ≥ 90 %) |
|---|---|---|
| 3 | **31 à 36 %** | 9 à 11 % |
| 6 | **36 à 40 %** | 8 à 9 % |
| 10 | **28 à 31 %** | 8 à 12 % |
| 15 | **27 à 30 %** | 9 à 10 % |

Comme le taux est recalculé chaque jour sur une fenêtre glissante, Fred verrait « en hausse » s'allumer **presque à coup sûr** à un moment ou un autre, **sans aucun progrès réel**.

**Autre exemple :** « 62 % (13 réponses) » correspond en réalité à un intervalle de Wilson à 95 % de **36 % à 82 %** (Brown, Cai & DasGupta, 2001). Le « 62 % » est un faux chiffre précis.

**Remplacement proposé (petit coût) :**
- **Affichage** en fréquence naturelle arrondie, avec une fourchette : « **environ 6 prises sur 10** (entre 4 et 8) » (Gigerenzer & Hoffrage, 1995).
- **« Tendance probable »** si la probabilité bayésienne que le taux récent dépasse l'ancien (lois bêta-binomiales, a priori uniforme) est ≥ 90 % **deux semaines de suite**, avec au moins 8 réponses de chaque côté.
- **Jamais de « confirmé » sur une auto-évaluation seule.**

---

## 3. Le protocole d'évaluation en 4 temps

**Budget de mesure, à ne jamais dépasser :** 0 s d'effort supplémentaire au quotidien (hors les taps déjà en place) · 2 min par semaine de programme · 10 min aux 3 bilans · 10 min par écoute optionnelle d'un proche. Sur 60 séances, cela fait **environ 55 min de mesure pour environ 300 min de pratique**.

### 3.1 Chaque jour, en passif (rien de plus à faire)

| Ce qui est mesuré | Famille | Axe | Affiché ? |
|---|---|---|---|
| Séance faite, durée, blocs terminés | **Exact** | Effort | **Oui, tout de suite** (le point du jour se remplit) |
| Clair / Moyen / Brouillon · Repéré oui/non · Posé (taps existants) | Déclarative | Diction, écoute, posture | Non au jour le jour. Agrégé à la semaine. |
| Prise d'articulation du jour → mesures acoustiques **par item** (débit, pauses, disfluences ; taux de mots reconnus, puisque le texte est connu) | Objective | Diction (matériel entraîné) | Non. Elles alimentent la série et le bilan. |
| Bloc posture → mesures caméra, **si l'option est activée** | Objective | Posture | Non |
| Heure de la séance, nombre de séances dans les 7 derniers jours | Contexte | — | Non. Elles servent à expliquer les creux. |
| Après un « Avant un RDV » : « On t'a fait répéter ? », puis « Objectif atteint ? » (une question par ouverture, en place) | Observée | RDV | Agrégé |

**Astuce de mesure :** les 28 items d'articulation reviennent environ 2 fois par cycle. Comparer **le même item** à sa 1ʳᵉ et à sa 2ᵉ occurrence donne une paire appariée gratuite, qui neutralise la difficulté de l'item.

### 3.2 Chaque semaine de programme (toutes les 5 séances), 2 min : « Le point de la semaine »

Il est proposé à la place du bloc écoute ou posture de la séance, **pas en plus**, pour que la séance reste à 5 min.

| Étape | Durée | Ce qui est mesuré |
|---|---|---|
| **Parole spontanée** sur une question tirée d'un lot de 12 situations pro (« Explique à un boulanger ce que fait un assistant IA »), jamais la même deux fois par cycle | 45 s | Débit, pauses, disfluences par minute en **parole non lue**, plus posture si la caméra est activée. **C'est la mesure de transfert la plus fréquente.** Pas de taux de mots reconnus, faute de texte de référence. |
| 1 tap : « Si tu avais un RDV demain, tu te sens… » **Pas prêt / Plutôt prêt / Prêt** | 3 s | Sentiment d'aisance : c'est ce qui rassure, et c'est **affiché comme tel** |
| Message de fin | — | « Point enregistré. **Encore 2 points** avant la première tendance. » Le progrès affiché ici est celui **de la mesure**, et il est étiqueté comme tel. |

On ne pose **pas** la question « Tu as progressé cette semaine ? ». Les jugements rétrospectifs de changement sont dominés par l'état du moment (Norman, Stratford & Regehr, 1997).

### 3.3 Aux jalons S1, S30 et S60 : « Bilan de progrès », 10 min

Il remplace la séance du jour, compte comme une séance, et l'appli l'annonce la veille (« Demain : ton bilan de 10 min »).

| # | Étape | Durée | Mesure |
|---|---|---|---|
| 1 | **Forme du jour** : 1 tap, En forme / Moyen / Fatigué | 5 s | Contexte, pour interpréter un creux |
| 2 | **Texte de référence** (×2 à S1, ×1 ensuite) | 40 à 80 s | Toutes les mesures acoustiques. Ancre A/B. |
| 3 | **Textes inédits A, B et C**, dans un ordre tiré au hasard | 1 min 45 | **Indicateur principal de diction** : comparaison appariée par texte |
| 4 | **Mise en situation 1 : se présenter** à un artisan, sans texte, caméra activée si l'option existe | 60 s | Parole spontanée et posture |
| 5 | **Mise en situation 2 : écoute.** Passage inédit réservé au bilan, puis reformulation de 30 s | 1 min 30 | **Faits clés retrouvés (0 à 3)**, que Fred coche sur une liste après la révélation |
| 6 | **Auto-grille**, 6 items, échelle en 3 points, ancrés sur des comportements (« J'ai fini mes phrases », « J'ai fait une pause avant de répondre », « Mon regard est resté sur l'interlocuteur »…) | 1 min | Déclaratif structuré. Les mêmes items alimentent la grille du proche. |
| 7 | **A/B à l'aveugle par Fred** : S1 contre aujourd'hui | 1 min | Préférence |
| 8 | À S1 : **choix et gel des indicateurs principaux**, puis phrase de réalisme (§4.5). À S30 et S60 : **rapport de progrès** (§4.4). | 1 min | — |

**Conditions constantes**, rappelées à l'écran : même pièce, assis, téléphone posé à la même distance, même moment de la journée si possible. Contrôle automatique de gain désactivé (déjà dans la spec).

**Bilan de contrôle :** si un bilan montre une baisse ou un gain inattendus, l'appli propose de refaire **les étapes 2 et 3 seulement (3 min) 5 séances plus tard**. C'est la réplication, et c'est rassurant dans les deux sens (§4.3).

### 3.4 Par un tiers, en option : « Écoute à l'aveugle par un proche », 10 min

Il est proposé à S30 et à S60. Fred **tend son téléphone** : rien ne sort de l'appareil, conformément au principe 7 de la spec.

- **6 paires réelles** : texte de référence, texte A et texte B, chacun en S1 contre S30, puis en S1 contre S60 (ou S30 contre S60). **Ordre des paires et côté gauche/droite tirés au hasard.**
- **1 paire leurre** : deux prises du **même** bilan. Si le proche « entend » une nette différence, ses réponses sont à prendre avec prudence, et l'appli le note sans le dire au proche.
- **Pour chaque paire, 2 choix forcés**, plus « Je ne sais pas » :
  - « Laquelle on comprend le plus facilement ? » (intelligibilité) ;
  - « Laquelle donne le plus envie d'écouter la suite ? » (présence vocale).
- **Un tiers compare mieux qu'il ne note.** La comparaison par paires est plus fiable qu'une note absolue pour un juge non formé (Pollitt, 2012).
- **Lecture :** si le proche choisit l'enregistrement le plus récent sur **6 paires sur 6**, la probabilité d'un tel résultat par hasard est de 1,6 % (test du signe) ; à 5 sur 6, elle est de 11 %. Comme les paires ne sont pas indépendantes (même voix), on traite **6 sur 6 comme une confirmation** et **5 sur 6 comme une tendance**. Deux proches valent mieux qu'un.
- **Posture vue par un tiers** : uniquement si Fred accepte de filmer 30 s à S1 et à S60. La vidéo est stockée localement et supprimable. C'est en option à cause du poids des fichiers.

---

## 4. L'affichage qui rassure sans mentir

### 4.1 Deux horloges

| | **Effort** | **Résultat** |
|---|---|---|
| Nature | Exact | Estimé, avec du bruit |
| Quand | **Tout de suite**, après chaque séance | **Aux bilans** (S30, S60), plus une tendance hebdomadaire prudente |
| Pourquoi | L'adulte TDAH dévalue fortement les récompenses différées (méta-analyse : Jackson & MacKillop, 2016). Il lui faut un retour immédiat, et le seul retour immédiat **vrai** est l'effort. | Un résultat donné chaque jour serait du bruit présenté comme une information |

### 4.2 Le vocabulaire calibré

Le modèle est le langage calibré du GIEC (Mastrandrea et al., 2010) : des mots définis par des seuils et toujours employés dans le même sens. Communiquer l'incertitude réduit un peu la confiance dans le chiffre, mais pas dans la source (van der Bles et al., 2020) : **on peut être honnête sans perdre la confiance de Fred.**

| État | Texte à l'écran | Seuil (§1.4) |
|---|---|---|
| En calibrage | « **On apprend ta voix.** Encore 2 mesures. » | < 3 mesures de base |
| Pas encore mesurable | « **Trop tôt pour trancher.** Ta voix varie plus d'un jour à l'autre que l'écart actuel. » | RCI < 1,28 |
| Tendance probable | « **Ça bouge dans le bon sens.** Probable, pas encore sûr. » | RCI de 1,28 à 1,96, ou 2 contrôles hebdomadaires positifs de suite |
| Progrès confirmé | « **Progrès confirmé.** Plus grand que tes variations normales, et vu deux fois. » | §1.4 |
| Après S60, rien au-delà du bruit | « **Pas de changement visible** au-delà de tes variations. Ça ne veut pas dire zéro : la mesure ne voit pas en dessous de [MDC]. » | RCI < 1,28 avec ≥ 5 points |

**Mots interdits :** score, note, niveau, échec, régression, raté, « tu dois », record, série. **Pas de rouge, pas de flèche vers le bas, pas de décimales**, pas de pourcentage sans fourchette, jamais « 100 % ».
**Mots préférés :** « environ », « entre … et … », « sur 10 », « ta variation normale », « vu deux fois ».

### 4.3 Une fourchette au lieu d'un point

- **Indicateurs continus** (débit, mots reconnus, stabilité) : une bande horizontale par indicateur.
  - Zone grisée = **ta variation normale autour de S1** (valeur S1 ± MDC₉₅) ;
  - un trait = la **zone probable aujourd'hui** (intervalle à 80 %) ;
  - le trait est **hors** du grisé : changement réel ; **dedans** : bruit.
  - C'est le RCI rendu visible, en une seule image.
- **On ne juge pas sur le chevauchement de deux intervalles** : deux intervalles à 95 % qui se chevauchent peuvent quand même correspondre à une différence réelle (Cumming & Finch, 2005). La décision vient du RCI, la bande sert à **montrer** cette décision.
- **Taux déclaratifs** : « environ 6 sur 10 (entre 4 et 8) ».
- **Zone cible** (débit, pauses) : on affiche la zone et la position de Fred (« dans ta zone » ou « encore un peu rapide »), jamais un classement.

### 4.4 Gérer une baisse sans culpabiliser

Le **retour sur la tâche**, plutôt que sur la personne, est ce qui distingue les retours qui aident de ceux qui nuisent. Dans la méta-analyse de Kluger et DeNisi (1996), **plus d'un tiers** des interventions de feedback **dégradaient** la performance, surtout quand l'attention était attirée vers le soi.

| Situation | Ce que fait l'appli |
|---|---|
| **Creux quotidien ou hebdomadaire** (le cas le plus fréquent, et du bruit dans l'immense majorité des cas) | **Rien n'est affiché.** La médiane hebdomadaire et la pente robuste l'absorbent. |
| **Baisse probable** à la semaine | Elle n'est pas affichée en hebdomadaire, et elle est gardée pour le bilan |
| **Baisse au bilan**, au-delà de la MDC | Elle est dite, sans couleur : « Ce mois-ci, [indicateur] est sous ton départ. Causes fréquentes : fatigue, rhume, journée chargée, micro. **Ta forme du jour : Fatigué.** On refait la mesure dans 5 séances (3 min). » **Une seule action**, le bilan de contrôle. |
| **Baisse confirmée par le contrôle** | « La baisse se confirme sur [indicateur]. Ce n'est pas un jugement sur toi : c'est un signal. » Puis **une** piste (« reviens au lent puis normal sur 5 séances »). Et si c'est la voix elle-même (enrouement, gêne) : le garde-fou santé de `expert-contenu.md` §7. |

**Pourquoi ne pas cacher totalement une baisse confirmée au bilan :** la spec du tableau de bord interdit d'afficher une baisse. On garde cette règle pour le quotidien et l'hebdomadaire. Mais un système qui **ne peut dire que du bien** ne rassure pas un psychométricien : son « progrès confirmé » ne vaudrait rien. La crédibilité des bonnes nouvelles dépend de la possibilité des mauvaises.

**Contre l'effet « tout ou rien »** (après un écart, tout abandonner : Marlatt & Gordon, 1985) : aucune mesure ne se « perd ». Une semaine sans point hebdomadaire laisse simplement un trou dans la série, qui n'est jamais signalé.

### 4.5 Le réalisme dit dès S1 (une fois)

« Ce que l'appli pourra te dire à S60 :
- **diction et écoute** : probablement un verdict net ;
- **posture** : si la caméra est activée, ou si un proche écoute ;
- **en RDV** : au mieux une **tendance**, parce qu'il y aura trop peu de RDV pour plus.

Et ce n'est pas un défaut de ta part. »

### 4.6 Le rapport de progrès à S30 et S60, en un écran

```
BILAN · séance 30 · 14 novembre
─────────────────────────────────────────
CE QUI EST SÛR
  30 séances faites. 21 jours pratiqués en octobre.

CE QUE LA MESURE MONTRE                 (vs séance 1)
  Diction    Ça bouge dans le bon sens   [░░▓▓░░]  ──▌
  Écoute     Progrès confirmé            [░░▓▓░░]      ──▌
  Posture    Trop tôt pour trancher      [░░▓▓▌░]
  En RDV     Probable · 12 RDV           environ 2 sur 10 « répéter »
                                         (début : environ 4 sur 10)

CE QUE TU RESSENS        « Prêt pour un RDV » : 4 points sur 6
CE QU'UN PROCHE A ENTENDU (option)   a préféré S30 : 5 paires sur 6

LA SUITE, UNE SEULE CHOSE
  « Pause avant de répondre » : c'est là que tu as le plus de marge.
  [ Écouter S1 et S30 à l'aveugle ]
─────────────────────────────────────────
  ▓ = ta variation normale   ▌ = où tu es aujourd'hui
  (Toucher une ligne : le détail, la méthode, les chiffres)
```

**Règles de l'écran :**
- **trois étages**, toujours dans le même ordre : sûr, mesuré, ressenti ;
- **l'effort en premier**, parce que c'est la seule vraie certitude ;
- **une seule** action pour la suite ;
- le détail chiffré est **à un tap**, pour le psychométricien qu'est Fred, et ne s'impose jamais à l'écran principal.

---

## 5. La recommandation

### 5.1 L'architecture d'évaluation de la V1 (1 page)

```
                ┌──────────────── COLLECTE ────────────────┐
 Quotidien      │ séance (exact) · 3 taps (déclaratif)     │
 (passif)       │ prise d'articulation (audio stocké)      │
                │ retour terrain RDV (observé)             │
 Hebdo 2 min    │ parole spontanée 45 s · « Prêt ? » 1 tap │
 Bilans S1/30/60│ réf. ×2 · textes A,B,C · 2 situations    │
                │ passage d'écoute réservé · auto-grille   │
 Option proche  │ 6 paires + 1 leurre, choix forcés        │
                └────────────────────┬─────────────────────┘
                                     ▼
             MESURES (une ligne par valeur, jamais agrégée au stockage)
   axe · famille · indicateur · valeur · unité · matériel/forme
   · instrument + version · n° de séance · horodatage · contexte (forme du jour)
                                     ▼
          MOTEUR DE PREUVE (js/core, pur, testé sur données simulées)
   1. ligne de base (≥ 3 occasions)   2. SEM intra-individuelle + plancher
   3. MDC / RCI aux bilans            4. Theil-Sen + Kendall sur médianes hebdo
   5. bêta-binomiale pour les taux    6. verdict par axe (règle §1.4)
   → calculé à la volée, jamais stocké (cohérent avec la spec : « progression calculée »)
                                     ▼
                 AFFICHAGE (4 états, 2 horloges)
   Quotidien : effort seulement · Hebdo : « mesure qui se construit »
   + tendance prudente · Bilans : rapport 1 écran · Progression : cartes d'axe
```

**Trois principes d'architecture :**
1. **Stocker brut, recalculer tout.** Puisque l'audio est conservé, un indicateur acoustique ajouté en V1.1 peut être calculé **rétroactivement** sur les prises de S1. **Différer l'analyse automatique ne fait rien perdre**, à condition que les prises de base soient bien enregistrées dès S1.
2. **Versionner l'instrument.** À chaque bilan, on **réanalyse toutes les prises de référence avec la même version** du modèle, ce qui évite une fausse rupture quand le modèle change.
3. **Pré-enregistrer.** Les indicateurs principaux sont figés à S1, et les seuils sont dans le code, pas réglables à la main.

### 5.2 Ce qu'il faut construire, par ordre de priorité

| Prio | Élément | Coût | Pourquoi maintenant |
|---|---|---|---|
| **P0** | **Métadonnées de mesure** (matériel, version d'instrument, contexte) sur chaque valeur | **Petit** | Elles sont impossibles à reconstituer après coup |
| **P0** | **Protocole de ligne de base** : texte de référence ×2 à S1, plus S2 et S3 | **Petit** | Sans base, aucun verdict ne sera possible à S30 |
| **P0** | **Remplacer « en hausse »** par des fréquences naturelles avec fourchette et la règle bêta-binomiale sur 2 semaines (§2.6) | **Petit** | La règle actuelle affiche un faux progrès environ une fois sur trois |
| **P1** | **Rédiger les 3 textes parallèles A, B, C et les 3 passages d'écoute réservés** (à demander à l'expert contenu) | **Petit** (contenu) | Ils sont nécessaires dès S1 |
| **P1** | **Bilan de progrès de 10 min** (8 étapes, §3.3), avec le gel des indicateurs principaux | **Moyen** | C'est le cœur du système |
| **P1** | **Moteur de preuve** `js/core` : SEM, MDC, RCI, Theil-Sen, Kendall, bêta-binomiale, verdicts, avec des tests sur séries simulées (bruit pur, gain, autocorrélation) | **Moyen** | Il doit être juste avant d'afficher quoi que ce soit |
| **P2** | **Rapport en 1 écran** à S30 et S60, et cartes d'axe à 4 états | **Moyen** | Il n'est pas nécessaire avant S30, donc il peut être livré pendant les 30 premières séances |
| **P2** | **Point de la semaine** (45 s de parole spontanée et 1 tap) | **Petit** | Sa valeur vient de l'analyse acoustique : on peut enregistrer dès la V1 et analyser plus tard |
| **P2** | **Mode « Écoute par un proche »** (6 paires et 1 leurre) | **Petit à moyen** | Il sert à S30, et c'est la meilleure mesure sans outil |
| **P3** | **Pipeline acoustique** (taux de mots reconnus, débit, pauses, disfluences), branché sur le contrat du §1.5 | **Gros** | Il est hors V1 selon la spec (§10) et rétroactif grâce à l'audio stocké. Voir le risque de reconnaissance vocale ci-dessous. |
| **P3** | **Mesures caméra de posture**, limitées aux bilans et au bloc posture | **Gros** | Hors V1 selon la spec. **Non rétroactif** (la vidéo n'est pas stockée) : la base posture commencera au premier bilan avec caméra. |

**Ordre conseillé : P0 et P1 avant S1.** Fred n'a qu'une seule séance 1.

**Risque à faire trancher par l'expert acoustique :**
- Par défaut, la reconnaissance vocale de Chrome (Web Speech API) **passe par un serveur** (MDN), ce qui contredit le principe « rien ne sort du téléphone ».
- Une option de traitement local existe (`processLocally`, avec `available()` et `install()` pour le pack de langue). Il reste à vérifier qu'elle marche **sur Chrome Android, en français**.
- Il faut aussi vérifier qu'on peut l'appliquer à un **fichier enregistré**, et pas seulement au micro en direct. Sinon, la réanalyse rétroactive (principe 1) exigera un modèle embarqué en WebAssembly, ce qui alourdit nettement le coût.

---

## 6. Les pièges et leurs parades

### 6.1 L'effet de pratique (apprendre le texte par cœur)

- **Risque :** le texte de référence est lu au moins 7 fois avant S60. Le progrès mesuré devient en partie de la mémoire et de la familiarité avec le micro (Calamia et al., 2012).
- **Parades :**
  - 1ʳᵉ lecture exclue de la ligne de base ;
  - **textes parallèles appariés**, lus seulement aux bilans ;
  - l'écart entre texte connu et textes inédits **estime** l'effet de pratique ;
  - passages d'écoute réservés ;
  - parole spontanée hebdomadaire sur des questions qui tournent.
- **Si l'écart est grand**, l'écran le dit : « Sur ton texte habituel, tu progresses nettement. Sur des textes neufs, c'est plus modeste : c'est ce chiffre-là qui compte. »

### 6.2 Le biais d'attente

- **Risque :** Fred sait qu'il s'entraîne et veut progresser. Ses notes et ses choix A/B penchent vers « mieux » (Knouse et al., 2005). Le simple fait de s'observer modifie aussi le comportement (réactivité de l'auto-observation : Korotitsch & Nelson-Gray, 1999).
- **Parades :**
  - jamais de « confirmé » sur une auto-évaluation seule ;
  - **A/B réellement aveugle**, côté tiré au hasard, sans date ni durée visibles avant le choix ;
  - **paire leurre** pour le proche ;
  - les mesures machine ne dépendent pas de l'attente ;
  - le verdict se calcule sur des règles figées à S1.
- **Glissement de référence :** si « Clair » baisse pendant que la machine progresse, l'écran dit « Ton oreille devient plus exigeante, c'est un bon signe. »

### 6.3 Goodhart : optimiser l'indicateur plutôt que la compétence

- **Le principe**, dans sa formulation par Strathern (1997) : quand une mesure devient une cible, elle cesse d'être une bonne mesure.
- **Les risques concrets :**
  - surarticuler et lire lentement pour faire monter les mots reconnus ;
  - ralentir jusqu'à paraître robotique pour faire baisser le débit ;
  - fixer l'objectif de la caméra pour gonfler le regard ;
  - ne plus noter « Brouillon ».
- **Parades :**
  - **aucun indicateur objectif affiché pendant l'effort**, ni même le jour même ;
  - des **zones cibles**, pas des maximums ;
  - le **verdict requiert l'accord d'une autre famille** ;
  - l'indicateur principal porte sur un **matériel que Fred ne voit qu'aux bilans** ;
  - l'axe RDV, qu'on ne peut pas tricher, sert de juge final ;
  - une contradiction entre la machine et le proche est signalée comme un possible effet Goodhart.

### 6.4 La surcharge de mesure qui tue l'habitude

- **Risque :** chaque tap, chaque question ou chaque bilan ajoute de la friction. Pour un TDAH, la friction au démarrage est le premier ennemi, et l'objectif de la spec est la **régularité** (15 jours par mois).
- **Parades :**
  - le budget du §3, **non négociable** ;
  - **une question par écran**, toujours un bouton « Passer » ;
  - le point de la semaine **remplace** un bloc au lieu de s'ajouter ;
  - le bilan **compte comme une séance** ;
  - **règle de suppression** : un indicateur qui n'entre dans aucune règle de décision n'est pas collecté ;
  - **règle d'échange** : toute nouvelle question doit en retirer une.
- **Signal d'alarme :** si Fred passe le point de la semaine 2 fois de suite, l'appli le propose une semaine sur deux. On garde l'habitude avant la mesure.

### 6.5 Les deux pièges en plus

- **Changement d'instrument :** une mise à jour du modèle de reconnaissance ou de caméra crée une fausse marche dans la série. Parade : version stockée, réanalyse des prises de base avec la même version.
- **Confusion terrain :** un mois avec des prospects difficiles fait monter « on m'a fait répéter » sans rapport avec la diction. Parade : les résultats commerciaux restent du **contexte**, et le verdict RDV n'est jamais plus que « probable ».

---

## 7. Écarts avec les specs existantes, à trancher

| # | Spec actuelle | Proposition | Gravité |
|---|---|---|---|
| 1 | Tableau de bord : « en hausse » si +10 points, avec ≥ 3 réponses de chaque côté | Fréquence naturelle avec fourchette, et règle bêta-binomiale ≥ 90 % sur 2 semaines, ≥ 8 réponses (§2.6) | **Grave** : environ 30 % de faux « en hausse » à chaque calcul |
| 2 | Tableau de bord : « une baisse jamais » | Gardé au quotidien et en hebdomadaire. **Dite au bilan, avec un contrôle proposé** (§4.4). | Moyenne |
| 3 | Spec V1 §10 : analyse de la voix et caméra hors V1 | Compatible : V1 = protocole, moteur et bilans. Acoustique en V1.1, rétroactive. Caméra ensuite. | — |
| 4 | Texte de référence à S1, S7, S14, S30, puis toutes les 30 séances | Ajouter **S1 ×2, S2, S3** et les **textes inédits A, B, C** aux bilans | Moyenne : sans cela, pas de ligne de base |
| 5 | Taux sur 4 semaines affichés en % (« 62 % (13 réponses) ») | « Environ 6 sur 10 (entre 4 et 8) » | Moyenne |
| 6 | `expert-contenu.md` §4.1 cite les jalons J1, J14, J30, J42 | La spec V1 fait foi (S1, 7, 14, 30, 60…). Rien à changer, juste à noter. | Légère |

---

## 8. Sources

**Mesure du changement individuel**
- Jacobson, N. S., & Truax, P. (1991). Clinical significance: a statistical approach to defining meaningful change in psychotherapy research. *Journal of Consulting and Clinical Psychology*, 59(1), 12–19. [PubMed](https://pubmed.ncbi.nlm.nih.gov/2002127/) · [texte](https://sciences.ucf.edu/psychology/childrenslearningclinic/wp-content/uploads/sites/24/2013/08/Truax-Jacobson-pdf.pdf)
- Evans, C. Reliable and Clinically Significant Change, synthèse de la méthode. [psyctc.org](https://www.psyctc.org/psyctc/root/stats/rcsc/)
- Weir, J. P. (2005). Quantifying test-retest reliability using the intraclass correlation coefficient and the SEM. *Journal of Strength and Conditioning Research*, 19(1), 231–240.
- de Vet, H. C. W., Terwee, C. B., Knol, D. L., & Bouter, L. M. (2006). When to use agreement versus reliability measures. *Journal of Clinical Epidemiology*, 59(10), 1033–1039.
- Hopkins, W. G. (2000). Measures of reliability in sports medicine and science. *Sports Medicine*, 30(1), 1–15 (erreur typique intra-individuelle).
- Calamia, M., Markon, K., & Tranel, D. (2012). Scoring higher the second time around: meta-analyses of practice effects in neuropsychological assessment. *The Clinical Neuropsychologist*, 26(4), 543–570.
- Bartels, C., et al. (2010). Practice effects in healthy adults: a longitudinal study on frequent repetitive cognitive testing. *BMC Neuroscience*, 11, 118.
- Sprangers, M. A. G., & Schwartz, C. E. (1999). Integrating response shift into health-related quality of life research. *Social Science & Medicine*, 48(11), 1507–1515.
- Norman, G. R., Stratford, P., & Regehr, G. (1997). Methodological problems in the retrospective computation of responsiveness to change. *Journal of Clinical Epidemiology*, 50(8), 869–879.

**Cas unique, tendances, tests**
- What Works Clearinghouse, Single-Case Design Standards (Kratochwill et al., 2010) : [documentation technique](https://ies.ed.gov/ncee/WWC/Docs/ReferenceResources/wwc_scd.pdf) · [ERIC](https://files.eric.ed.gov/fulltext/ED510743.pdf) · [critique du minimum de 5 points (CEC-DR)](https://cecdr.org/sites/default/files/2021-01/_DR_Position_Statement_5_data_points_WWC_SCD_final.pdf)
- Shadish, W. R., & Sullivan, K. J. (2011). Characteristics of single-case designs used to assess intervention effects in 2008. *Behavior Research Methods*, 43, 971–980.
- Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. *Journal of the American Statistical Association*, 63, 1379–1389.
- Armitage, P., McPherson, C. K., & Rowe, B. C. (1969). Repeated significance tests on accumulating data. *Journal of the Royal Statistical Society A*, 132, 235–244.
- Brown, L. D., Cai, T. T., & DasGupta, A. (2001). Interval estimation for a binomial proportion. *Statistical Science*, 16(2), 101–133.
- Cumming, G., & Finch, S. (2005). Inference by eye: confidence intervals and how to read pictures of data. *American Psychologist*, 60(2), 170–180.
- Gelman, A., & Loken, E. (2013). The garden of forking paths (publié en 2014 sous le titre « The statistical crisis in science », *American Scientist*, 102(6)).
- Simulations propres à ce document (fausses alertes de la règle +10 points, puissance des séries quotidiennes et hebdomadaires, autocorrélation ρ = 0,3) : scripts Node, de 3 000 à 20 000 tirages.

**Indices composites**
- OECD/JRC (2008). *Handbook on Constructing Composite Indicators: Methodology and User Guide*. OECD Publishing.
- Edwards, J. R., & Bagozzi, R. P. (2000). On the nature and direction of relationships between constructs and measures. *Psychological Methods*, 5(2), 155–174.

**Parole et reconnaissance vocale**
- Maier, A., et al. (2009). PEAKS: a system for the automatic evaluation of voice and speech disorders. *Speech Communication*, 51(5), 425–437 (taux de mots reconnus utilisé comme mesure d'intelligibilité, avec des corrélations d'environ 0,9 avec des juges humains dans les travaux du même groupe). [CRIS FAU](https://cris.fau.de/publications/113164744) · [manuscrit](https://opus.bibliothek.uni-augsburg.de/opus4/files/66999/Maier09-PAS.pdf)
- MDN : [SpeechRecognition.available()](https://developer.mozilla.org/docs/Web/API/SpeechRecognition/available_static) · [Using the Web Speech API](https://developer.mozilla.org/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API) · [Chromium, Intent to Ship : On-device Web Speech API](https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM/m/TQpe9shjCgAJ)
- Pollitt, A. (2012). The method of Adaptive Comparative Judgement. *Assessment in Education*, 19(3), 281–300.

**TDAH, feedback et communication de l'incertitude**
- Knouse, L. E., Bagwell, C. L., Barkley, R. A., & Murphy, K. R. (2005). Accuracy of self-evaluation in adults with ADHD: evidence from a driving study. *Journal of Attention Disorders*, 8(4), 221–234. [SWOV](https://swov.nl/nl/publicatie/accuracy-self-evaluation-adults-adhd-evidence-driving-study)
- Kofler, M. J., et al. (2013). Reaction time variability in ADHD: a meta-analytic review of 319 studies. *Clinical Psychology Review*, 33, 795–811. [PDF](https://sciences.ucf.edu/psychology/childrenslearningclinic/wp-content/uploads/sites/24/2013/05/Kofler-et-al.-2013-RT-Variability-Meta-analysis.pdf)
- Jackson, J. N. S., & MacKillop, J. (2016). Attention-deficit/hyperactivity disorder and monetary delay discounting: a meta-analysis of case-control studies. *Biological Psychiatry: CNNI*, 1(4), 316–325.
- Kluger, A. N., & DeNisi, A. (1996). The effects of feedback interventions on performance. *Psychological Bulletin*, 119(2), 254–284. [Résumé (HUJI)](https://cris.huji.ac.il/en/publications/the-effects-of-feedback-interventions-on-performance-a-historical/)
- Korotitsch, W. J., & Nelson-Gray, R. O. (1999). An overview of self-monitoring research in assessment and treatment. *Psychological Assessment*, 11(4), 415–425.
- Marlatt, G. A., & Gordon, J. R. (1985). *Relapse Prevention*. Guilford (effet de violation de l'abstinence).
- Gigerenzer, G., & Hoffrage, U. (1995). How to improve Bayesian reasoning without instruction: frequency formats. *Psychological Review*, 102(4), 684–704.
- van der Bles, A. M., van der Linden, S., Freeman, A. L. J., & Spiegelhalter, D. J. (2020). The effects of communicating uncertainty on public trust in facts and numbers. *PNAS*, 117(14), 7672–7683. [RUG](https://research.rug.nl/en/publications/the-effects-of-communicating-uncertainty-on-public-trust-in-facts/)
- Mastrandrea, M. D., et al. (2010). *Guidance Note for Lead Authors of the IPCC Fifth Assessment Report on Consistent Treatment of Uncertainties*. IPCC.
- Strathern, M. (1997). « Improving ratings »: audit in the British University system. *European Review*, 5(3), 305–321 (formulation courante de la loi de Goodhart).

**Documents du dépôt**
- `docs/superpowers/specs/2026-10-09-ohmaparole-design.md` (spec V1) · `docs/superpowers/specs/2026-10-09-ohmaparole-tableau-design.md` (tableau de bord) · `docs/experts/expert-contenu.md` §0 et §4.

**Limites des sources :** plusieurs articles n'ont été consultés que par leur résumé (Jacobson & Truax, Kluger & DeNisi, Kofler, van der Bles, Maier). Les chiffres cités en sont tirés. Les chiffres de simulation sont propres à ce document et dépendent des hypothèses posées (bruit gaussien, ρ = 0,3).
