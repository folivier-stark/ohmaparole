# Pack « Mesure » non pro, et répliques de Louarn pour les profils Études et Quotidien

> Rédigé par un binôme : orthophoniste spécialisé·e dans l'évaluation de la parole, et auteur·rice de micro-textes.
> Destinataire : l'intégrateur de l'appli. Les consignes s'adressent à l'utilisateur (tutoiement).
> Source d'arbitrage : `docs/superpowers/specs/2026-10-12-ohmaparole-profils-design.md` §1 et §2. Modèle suivi : `expert-contenu-mesure.md`.
> Le bloc JSON qui suit `<!-- mesure -->` est importé tel quel dans `content/fr/mesure-quotidien.json`. Celui qui suit `<!-- louarn -->` complète `content/fr/louarn.json` pour les profils `etudes` et `quotidien`.
> **Ce matériel mesure un entraînement. Il ne remplace pas un bilan orthophonique.**

---

## 0. En bref

| Élément | Nombre | Où il sert | Règle d'usage |
|---|---|---|---|
| Texte de référence `fr.REFQ1` | 1 | Calibration et jalons des profils non pro | Texte **fixe**, sans prénom. Il remplace `fr.REF1` pour ces profils. |
| Textes inédits TQA, TQB, TQC | 3 | Bilans 24 et 48 | **Jamais en séance.** Les 3 à chaque bilan, ordre tiré au hasard, comparés texte par texte. |
| Écoutes réservées ERQ1 à ERQ3 | 3 | Bilans | **Jamais en séance.** ERQ1 au bilan 24, ERQ2 au bilan 48, ERQ3 en réserve (cycle suivant ou bilan refait). Une seule écoute, texte masqué. |
| Questions spontanées | 12 | Point de la semaine, format A | 45 s, sans préparation. Tirage sans remise sur un cycle de 12. |
| Répliques du quotidien | 12 | Point de la semaine, format B | La synthèse vocale dit la réplique, texte masqué. On répond, puis on coche 2 cases en réécoutant. |
| Auto-grille | 6 × 3 niveaux | Bilans | Une case « Non observé » à part, ajoutée par l'appli. On coche sur une prise réécoutée. |

**Syllabes du texte de référence : 84.** Le même entier figure dans `reference.syllabes` et dans `referenceSyllabes`.

---

## 1. La convention de comptage

C'est **la même règle** que pour le profil pro (`expert-contenu-mesure.md` §1). On compte une fois, à la main, et on ne change plus la règle. **Seule la tendance compte**, pas la valeur exacte.

| Règle | Exemples tirés des textes |
|---|---|
| 1 syllabe = 1 voyelle prononcée | Bon-jour = 2 |
| Le e final non accentué ne compte pas : -e, -es | aime = 1, simples = 1, guitare = 2, journée = 2 |
| Exception : il compte s'il est la seule voyelle du mot | je, me, te, de, le, ce = 1 chacun |
| Tout autre e muet compte, même à l'intérieur d'un mot | sa-me-di = 3, re-cettes = 2, lon-gue-ment = 3, ra-pi-de-ment = 4 |
| Liaisons, enchaînements et élisions écrites ne changent rien | j'aime = 1, qu'est-ce = 2, l'hi-ver = 2 |
| i, u ou ou suivis d'une voyelle : une seule syllabe avec elle | cui-sine = 2, quar-tier = 2, po-li-cier = 3, jouer = 1, De-puis = 2 |
| Un sigle se compte lettre par lettre | (aucun sigle dans ces textes) |

**Cas évité exprès :** aucun mot des quatre textes ne demande de trancher la diérèse après consonne + l ou r (« cli-ent », « ou-bli-er »). Si un texte futur en contient, la règle reste : 2 syllabes pour ce groupe.

**Contrôle croisé :** un petit script applique ces règles mot par mot. Il retrouve les mêmes totaux que le comptage à la main pour les quatre textes (§2 et §3.2).

---

## 2. Comptage du texte de référence (`fr.REFQ1`)

**Texte :** « Bonjour, je vais me présenter rapidement. J'aime beaucoup marcher le long de la rivière, surtout le dimanche matin. Je cuisine aussi pour mes amis ou ma famille, souvent des recettes simples. En ce moment, je lis un roman policier le soir, avant de dormir. Et toi, qu'est-ce qui te fait plaisir pendant une journée tranquille ? »

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | Bon-jour (2) · je (1) · vais (1) · me (1) · pré-sen-ter (3) · ra-pi-de-ment (4) | 12 |
| 2 | J'aime (1) · beau-coup (2) · mar-cher (2) · le (1) · long (1) · de (1) · la (1) · ri-vière (2) · sur-tout (2) · le (1) · di-manche (2) · ma-tin (2) | 18 |
| 3 | Je (1) · cui-sine (2) · aus-si (2) · pour (1) · mes (1) · a-mis (2) · ou (1) · ma (1) · fa-mille (2) · sou-vent (2) · des (1) · re-cettes (2) · simples (1) | 19 |
| 4 | En (1) · ce (1) · mo-ment (2) · je (1) · lis (1) · un (1) · ro-man (2) · po-li-cier (3) · le (1) · soir (1) · a-vant (2) · de (1) · dor-mir (2) | 19 |
| 5 | Et (1) · toi (1) · qu'est (1) · ce (1) · qui (1) · te (1) · fait (1) · plai-sir (2) · pen-dant (2) · une (1) · jour-née (2) · tran-quille (2) | 16 |
| **Total** | 55 mots, 5 phrases | **84** |

**Pourquoi ce texte :**
- **Neutre et fixe** : pas de prénom, pas d'âge, pas de métier, aucun accord au féminin ou au masculin qui dépendrait de la personne qui lit. Une étudiante, un conjoint ou un ado de 12 ans peuvent le lire tel quel.
- **Le squelette demandé** : se présenter (1), ce qu'on aime faire (2 à 4), une question à quelqu'un (5).
- **Aucun virelangue.** Il est donc un peu plus facile que `fr.REF1` du profil pro. Les deux références ne se comparent jamais entre elles.
- **Des sons variés sans piège** : groupes « pr », « pl », « tr », chuintantes (marcher, dimanche, journée), mots longs (ra-pi-de-ment, po-li-cier).

---

## 3. Les textes inédits A, B et C

### 3.1 Comment ils ont été construits

- **Même registre** que la référence : on se présente sans prénom, on dit ce qu'on aime faire, on pose une question en « toi ».
- **Même squelette en 5 phrases** : salut · une activité · une deuxième activité · ce qu'on fait en ce moment · la question.
- **Longueur : 84 syllabes chacun**, exactement comme la référence (tolérance : ±10 %, soit 76 à 92).
- **Aucun virelangue**, aucune tournure reprise de la référence ni des phrases déjà en séance. Vérification faite par recherche dans `content/fr/` et dans `docs/experts/contenu-*.md`. Sinon, l'entraînement avantagerait un texte et fausserait la comparaison.
- **Aucun accord qui dépend de la personne qui lit.** Les seuls mots accordés portent sur d'autres personnes (« une voisine très patiente », « une amie »).
- **Aucun chiffre, aucune promesse.**

### 3.2 Comptage détaillé

**Texte A (`fr.TQA`)**

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | Sa-lut (2) · je (1) · com-mence (2) · par (1) · me (1) · dé-crire (2) · sim-ple-ment (3) | 12 |
| 2 | Le (1) · sa-me-di (3) · je (1) · re-trouve (2) · par-fois (2) · des (1) · co-pains (2) · pour (1) · jouer (1) · au (1) · bas-ket (2) | 17 |
| 3 | J'a-dore (2) · aus-si (2) · des-si-ner (3) · des (1) · mai-sons (2) · i-ma-gi-naires (4) · sur (1) · un (1) · pe-tit (2) · car-net (2) | 20 |
| 4 | Cette (1) · an-née (2) · j'ap-prends (2) · la (1) · gui-tare (2) · a-vec (2) · une (1) · voi-sine (2) · très (1) · pa-tiente (2) | 16 |
| 5 | Et (1) · toi (1) · quelle (1) · ac-ti-vi-té (4) · te (1) · donne (1) · en-vie (2) · de (1) · sor-tir (2) · du (1) · lit (1) · le (1) · ma-tin (2) | 19 |
| **Total** | 51 mots, 5 phrases | **84** |

**Texte B (`fr.TQB`)**

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | Bon-soir (2) · je (1) · te (1) · ra-conte (2) · com-ment (2) · je (1) · passe (1) · mes (1) · soi-rées (2) | 13 |
| 2 | Je (1) · pro-mène (2) · lon-gue-ment (3) · mon (1) · chien (1) · dans (1) · la (1) · fo-rêt (2) · même (1) · au (1) · cœur (1) · de (1) · l'hi-ver (2) | 18 |
| 3 | J'é-coute (2) · aus-si (2) · des (1) · chan-sons (2) · fran-çaises (2) · en (1) · é-plu-chant (3) · les (1) · lé-gumes (2) · du (1) · dî-ner (2) | 19 |
| 4 | De-puis (2) · la (1) · ren-trée (2) · je (1) · chante (1) · dans (1) · une (1) · cho-rale (2) · de (1) · quar-tier (2) · chaque (1) · jeu-di (2) | 17 |
| 5 | Et (1) · toi (1) · quelle (1) · est (1) · la (1) · der-nière (2) · his-toire (2) · qui (1) · t'a (1) · fait (1) · é-cla-ter (3) · de (1) · rire (1) | 17 |
| **Total** | 58 mots, 5 phrases | **84** |

**Texte C (`fr.TQC`)**

| Phrase | Découpage | Syll. |
|---|---|---|
| 1 | Bon-jour (2) · voi-ci (2) · en (1) · ré-su-mé (3) · ce (1) · qui (1) · m'oc-cupe (2) | 12 |
| 2 | Je (1) · nage (1) · à (1) · la (1) · pis-cine (2) · mu-ni-ci-pale (4) · en (1) · gé-né-ral (3) · a-vec (2) · une (1) · a-mie (2) | 19 |
| 3 | Le (1) · week-end (2) · je (1) · fa-brique (2) · des (1) · pe-tits (2) · meubles (1) · a-vec (2) · du (1) · bois (1) · ré-cu-pé-ré (4) | 18 |
| 4 | Ces (1) · der-niers (2) · temps (1) · je (1) · dé-couvre (2) · les (1) · jeux (1) · de (1) · so-cié-té (3) · a-vec (2) · mes (1) · cou-sins (2) | 18 |
| 5 | Et (1) · toi (1) · com-ment (2) · aimes (1) · tu (1) · te (1) · dé-tendre (2) · a-près (2) · une (1) · se-maine (2) · bien (1) · char-gée (2) | 17 |
| **Total** | 52 mots, 5 phrases | **84** |

« week-end » compte 2 : deux voyelles prononcées, comme « bas-ket ».

### 3.3 Profil articulatoire : les trois textes sont appariés entre eux

**Méthode :** décompte à la main, mot par mot, sur la prononciation (pas l'orthographe). « Groupe occlusive ou f/v + l/r » = les groupes travaillés en semaine 4 (pr, tr, pl, cr, bl, br, dr, vr, fr, cl). « Sifflantes et chuintantes » = les sons s, z, ch, j, avec les liaisons obligatoires. « e muets comptés » = tous les e prononcés selon la convention (je, de, le… et les e intérieurs).

| Mesure | Réf. | **A** | **B** | **C** |
|---|---|---|---|---|
| Syllabes | 84 | **84** | **84** | **84** |
| Mots | 55 | 51 | 58 | 52 |
| Phrases | 5 | **5** | **5** | **5** |
| Groupes occlusive ou f/v + l/r | 4 | **5** | **5** | **5** |
| Sifflantes et chuintantes | 21 | **19** | **19** | **18** |
| e muets comptés | 14 | 11 | 10 | 9 |
| Mots de 3 syllabes ou plus | 3 | 5 | 3 | 5 |

**Détail des groupes :**
- Réf. : présenter, simples, plaisir, tranquille.
- A : décrire, simplement, retrouve, apprends, très.
- B : promène, françaises, épluchant, rentrée, éclater.
- C : meubles, fabrique, découvre, détendre, après.

**Lecture :**
- **A, B et C sont très proches entre eux** : même nombre de syllabes, 5 groupes chacun, 18 à 19 sifflantes et chuintantes, 9 à 11 e muets.
- **Ils sont proches de la référence**, sans virelangue ni d'un côté ni de l'autre. La référence a un peu plus de e muets (14). À vitesse normale, on en avale une partie : son débit conventionnel peut donc sortir un peu plus haut.
- **Conséquence pour l'intégrateur :** on compare **A à A, B à B, C à C** d'un bilan à l'autre. Jamais la valeur d'un texte inédit avec celle de la référence.

---

## 4. Les écoutes réservées

### 4.1 Déroulé au bilan

1. L'appli joue le passage **une seule fois**, texte masqué. La synthèse vocale convient ; une voix enregistrée par un proche est mieux.
2. On reformule à voix haute en 30 s. La prise est enregistrée.
3. L'appli révèle les 3 faits clés. On coche ceux qui sont **dans sa reformulation**, en la réécoutant : « faits clés retrouvés » sur 3.

### 4.2 Comment elles ont été construites

| | ERQ1 | ERQ2 | ERQ3 |
|---|---|---|---|
| Qui raconte | Un voisin, à propos de sa voisine | Un petit-enfant, à propos de son grand-père | Un proche qui rentre chez ses parents |
| Sujet | Un chat disparu | Un potager | Un train arrêté |
| Mots | 80 | 80 | 86 |
| Phrases | 6 | 6 | 6 |
| Faits clés | 3, répartis du début à la fin | 3 | 3 |
| Détails sans enjeu (leurres) | 3 : les affiches et la photo, la lampe de poche, les sacs de farine | 3 : la voie ferrée, tomates et haricots, la cousine le mercredi | 2 : l'eau et les gâteaux, la dame et sa petite-fille |

- **Les faits sont des faits** : un lieu, une durée, un objet, une personne. Aucune émotion à deviner.
- **Trois passages parallèles** (même nombre de phrases, longueur proche, faits répartis du début à la fin), parce qu'on en entend un différent à chaque bilan. Réentendre le même passage ferait mesurer la mémoire.
- **Sujets nouveaux.** Les écoutes déjà écrites pour ces profils ont été relues : QL01 à QL12 (`contenu-commun-quotidien.md`), EL01 à EL12 (`contenu-etudes.md`), QL13 à QL24 (`contenu-quotidien.md`), ainsi que ER1 à ER3 du profil pro. Aucune ne parle d'un animal perdu, d'un potager ou d'un train arrêté. Le déménagement, déjà pris par `contenu-quotidien.md`, a été écarté.

---

## 5. Les questions spontanées

- **Format A du point de la semaine :** 45 s, sans préparation. L'appli mesure le % de pause et le nombre de pauses, ni débit ni syllabes, puisqu'il n'y a pas de texte.
- **Dosées pour tous :** chaque question se répond avec sa propre vie, qu'on ait 13 ans, 20 ans ou 50 ans. Aucune ne suppose un métier, des études ou un couple.
- **Ce qu'elles couvrent :** raconter (QSQ01, QSQ05, QSQ09), décrire (QSQ03, QSQ07), expliquer pas à pas (QSQ02, QSQ06, QSQ10, QSQ12), donner son avis (QSQ04, QSQ08, QSQ11).
- **Évitées exprès :** les thèmes de QP20 (« Ton souvenir, en 45 secondes », `contenu-quotidien.md`) et de l'item « Expliquer un trajet » (`contenu-commun-quotidien.md`), pour ne pas mesurer ce qui est déjà entraîné en séance. Le souvenir de vacances (QSQ01) reste, parce que QP20 ne le propose pas.

---

## 6. Les répliques du quotidien

**Déroulé :** la réplique est jouée, on répond, l'appli mesure le délai, la durée et le silence tenu, puis on coche les 2 cases en **réécoutant sa prise**, jamais de mémoire.

| Id | Situation | Compétence de la grille |
|---|---|---|
| REQ01 | Un ami insiste pour que tu viennes | GQ3 Dire non |
| REQ02 | Un prof te demande de justifier ton calcul | GQ5 Raconter (dérouler dans l'ordre) |
| REQ03 | Un reproche à la maison | GQ6 Rester posé |
| REQ04 | Quelqu'un t'invite à formuler ta demande | GQ4 Demander |
| REQ05 | Ton idée est balayée en groupe | GQ6 Rester posé |
| REQ06 | « Raconte, c'était comment ? » | GQ5 Raconter |
| REQ07 | Un proche fatigué se confie | GQ2 Écouter |
| REQ08 | On te donne la parole après un long silence | GQ1 Prendre la parole |
| REQ09 | « Qu'est-ce qui t'a donné envie ? » (oral, entretien) | GQ1 Prendre la parole |
| REQ10 | L'autre n'a pas compris ce que tu attends | GQ4 Demander |
| REQ11 | Un service à rendre toute une semaine | GQ3 Dire non (ou oui, à condition) |
| REQ12 | « Tu me coupes tout le temps » | GQ2 Écouter |

**Les cases sont observables à la réécoute** : un mot dit ou pas dit, une question posée ou pas, une phrase ou plusieurs. Aucune case ne demande de juger le ton.

---

## 7. L'auto-grille

- Les 6 compétences demandées : prendre la parole, écouter, dire non, demander, raconter, rester posé. **Niveau 1 · le geste démarre, niveau 2 · le geste est là, niveau 3 · le geste s'ajuste.** Chaque niveau ajoute des gestes au précédent.
- **« Non observé »** est une case à part, ajoutée par l'appli : si la situation ne s'est pas présentée, on ne coche rien. Ce n'est pas le niveau 1.
- **On coche sur une prise réécoutée** (une réplique du quotidien, une question spontanée) ou sur un vrai moment important qu'on se rappelle précisément.
- Chaque niveau tient en 80 caractères au plus. Il décrit des gestes, sans adjectif de jugement.

---

## 8. Louarn pour les profils non pro

### 8.1 Les répliques retirées (`proOnly`), famille par famille

`content/fr/louarn.json` a été relu réplique par réplique (135). **33 ids** ne sont jamais tirés pour un profil `etudes` ou `quotidien` :

| Famille | Ids | Pourquoi, en une ligne |
|---|---|---|
| Accueil | acc-01, acc-17 | « Avant les mails » suppose une journée de bureau ; acc-17 parle de « vrais rendez-vous ». |
| Fin | fin-01, fin-14 | Toutes deux ramènent la séance aux « prochains rendez-vous ». |
| Souvenirs | tro-05, tro-07, tro-10 | Rendez-vous, objectif de rendez-vous, et le bloc « Charisme et confiance » suivi du « terrain des rendez-vous ». |
| Thèmes 7 à 12 | th-07 à th-12 | Ils annoncent les thèmes du bloc pro (retour, personne difficile, lire les gens), qui ne sont pas ceux d'Études ni de Quotidien. |
| Thèmes de vente | th-13, th-15, th-18 | Premières secondes d'un rendez-vous, cas client, signal d'achat. |
| Avant le moment | rdv-01, rdv-06, rdv-07, rdv-09 | Technique de vente : convaincre, silence après la question fermée, budget, « un charme de trop ». |
| Conseils diction | tip-dic-08 | Le mot « pseudonymisation », propre à l'offre pro. |
| Conseils écoute | tip-eco-07 | « Celui qui signe » : signature d'un contrat. |
| Conseils RDV | tip-rdv-01 à tip-rdv-08 | Nom du client, durée annoncée, budget, charme, cas client, « je vais y réfléchir », signal d'achat, question fermée. |
| Stades | sta-03, sta-05, sta-06 | Calés sur les blocs pro : « Fondations posées » au stade 3 (séance 16 sur 48, alors que les fondations finissent à 24), « Charisme et confiance », « Prêts pour le terrain » des rendez-vous. |

**Gardées exprès :** tip-rdv-09 (« Après un non, ne te justifie pas… ») convient à tout le monde ; th-14, th-16 et th-17 sont neutres, et ne sont de toute façon jamais atteints en 48 séances ; tro-11 et th-19 parlent des langues, pas du monde pro.

### 8.2 Les répliques de remplacement

- **35 répliques**, dont une par id retiré (même moment, même condition), plus deux pour le moment `rdv` (une `objectif`, une `sansObjectif`) : chacune de ces deux conditions n'avait qu'une seule réplique.
- **Le moment `rdv` devient le « moment important »** : un oral, un entretien, une discussion. Les remplacements ne supposent aucun des trois en particulier.
- **Ids :** `q-` suivi de l'id remplacé (`q-tip-rdv-03` remplace `tip-rdv-03`). Seules `q-rdv-10` et `q-rdv-11` sont des ajouts.
- **Règles de G respectées** (contrôle par script, §9) : 90 caractères au maximum, aucun « ! », aucun chiffre, aucune culpabilisation. Apostrophe typographique, comme dans `louarn.json`.
- **Les conditions `bloc>=3`, `theme:13`, `theme:15` et `theme:18` ne sont jamais vraies en 48 séances.** Leurs remplacements existent quand même, pour qu'aucun couple (moment, condition) vidé ne reste sans réplique si le programme s'allonge un jour.

### 8.3 Après filtrage, par moment

| Moment | Avant | Retirées | Ajoutées | Pour un profil non pro |
|---|---|---|---|---|
| accueil | 18 | 2 | 2 | 18 |
| fin | 15 | 2 | 2 | 15 |
| jalon | 19 | 3 | 3 | 19 |
| theme | 20 | 9 | 9 | 20 |
| retour | 8 | 0 | 0 | 8 |
| rdv | 9 | 4 | 6 | 11 |
| tip | 39 | 10 | 10 | 39 |
| stade | 7 | 3 | 3 | 7 |

---

## 9. Vérification passée par script

- Les deux blocs JSON sont extraits et passés à `JSON.parse` sans erreur.
- Comptes : 3 textes inédits, 3 écoutes réservées, 12 questions spontanées, 12 répliques du quotidien, 6 compétences de 3 niveaux.
- Syllabes recalculées par le script : 84 pour la référence et pour chaque texte inédit, identiques au comptage manuel. Écoutes : 80 à 86 mots.
- Auto-grille : aucun niveau au-delà de 80 caractères.
- Les 33 ids de `proOnly` existent tous dans `content/fr/louarn.json`, sans doublon.
- Chaque moment garde au moins 3 répliques après filtrage, et chaque couple (moment, condition) vidé par `proOnly` en a au moins une.
- Répliques de Louarn : 90 caractères au maximum, aucun « ! », aucun chiffre.
- Mots interdits absents des deux blocs : score, note, échec, raté, régression.

---

## 10. Réserves, de la plus importante à la plus légère

1. **Les remplacements des thèmes 7 à 12 sont génériques.** Études et Quotidien n'ont pas les mêmes thèmes 7 à 12 (l'exposé contre oser parler en groupe, l'entretien contre demander clairement…), et `louarn.json` n'a pas de condition par profil. Une seule phrase par thème doit donc convenir aux deux, ce qui la rend moins précise. **Recommandation :** ajouter une condition `profil:etudes` ou `profil:quotidien` et écrire 12 lignes de thème dédiées dans les fichiers de contenu.
2. **L'équivalence de A, B et C est construite, pas mesurée.** Elle repose sur un décompte à la main. Si le premier bilan montre qu'un texte se lit nettement plus vite que les autres, ce n'est pas grave : la comparaison se fait texte par texte.
3. **Les seuils de 48 séances décalent d'autres répliques.** `cycle:2` (séance 73) et `theme:langues` (séance 72) sont calculés sur le programme pro. Le stade 4 tombe à 24 séances, à la fin des fondations : sta-04 (« La confiance commence par le dos ») reste juste, mais l'intégrateur doit recalculer ces conditions sur l'objectif du profil.
4. **« Faits clés retrouvés » n'a que 4 valeurs (0 à 3)**, et le passage change à chaque bilan. Un écart d'un fait peut venir du passage. Cet indicateur ne suffit jamais seul à conclure.
5. **Deux bilans seulement (24 et 48)** : ERQ3 n'est pas utilisée dans le premier cycle. Elle sert de rechange si un bilan est refait, ou au cycle suivant.
6. **Les ados de 12-13 ans** lisent sans doute plus lentement que les adultes au départ. Ce n'est pas un problème, puisque chacun n'est comparé qu'à lui-même, mais les questions QSQ11 (ville, quartier) et REQ09 (« ce que tu fais aujourd'hui ») leur demandent un peu plus de recul.
7. **Les répliques du quotidien sont courtes** (3 à 5 s à l'oral). Elles ne mesurent pas le moment où l'on coupe une digression longue.

---

## 11. Le contenu

<!-- mesure -->
```json
{
  "reference": {
    "id": "fr.REFQ1",
    "titre": "Texte de référence",
    "texte": "Bonjour, je vais me présenter rapidement. J'aime beaucoup marcher le long de la rivière, surtout le dimanche matin. Je cuisine aussi pour mes amis ou ma famille, souvent des recettes simples. En ce moment, je lis un roman policier le soir, avant de dormir. Et toi, qu'est-ce qui te fait plaisir pendant une journée tranquille ?",
    "syllabes": 84
  },
  "referenceSyllabes": 84,
  "convention": "1 syllabe = 1 voyelle prononcée. Le e final non accentué (-e, -es) ne compte pas, sauf s'il est la seule voyelle du mot (je, me, te, de, le, ce) ; tout autre e muet compte, même à l'intérieur d'un mot (sa-me-di = 3, lon-gue-ment = 3).\nLiaisons, enchaînements et élisions écrites (l', j', d', qu', t') ne changent rien ; i, u ou ou suivis d'une voyelle font une seule syllabe avec elle (cui-sine = 2, quar-tier = 2, jouer = 1), et un sigle se compte lettre par lettre.",
  "textesInedits": [
    {
      "id": "fr.TQA",
      "titre": "Le basket et la guitare",
      "texte": "Salut, je commence par me décrire simplement. Le samedi, je retrouve parfois des copains pour jouer au basket. J'adore aussi dessiner des maisons imaginaires sur un petit carnet. Cette année, j'apprends la guitare avec une voisine très patiente. Et toi, quelle activité te donne envie de sortir du lit le matin ?",
      "syllabes": 84
    },
    {
      "id": "fr.TQB",
      "titre": "Le chien et la chorale",
      "texte": "Bonsoir, je te raconte comment je passe mes soirées. Je promène longuement mon chien dans la forêt, même au cœur de l'hiver. J'écoute aussi des chansons françaises en épluchant les légumes du dîner. Depuis la rentrée, je chante dans une chorale de quartier, chaque jeudi. Et toi, quelle est la dernière histoire qui t'a fait éclater de rire ?",
      "syllabes": 84
    },
    {
      "id": "fr.TQC",
      "titre": "La piscine et le bois",
      "texte": "Bonjour, voici en résumé ce qui m'occupe. Je nage à la piscine municipale, en général avec une amie. Le week-end, je fabrique des petits meubles avec du bois récupéré. Ces derniers temps, je découvre les jeux de société avec mes cousins. Et toi, comment aimes-tu te détendre après une semaine bien chargée ?",
      "syllabes": 84
    }
  ],
  "ecoutesReservees": [
    {
      "id": "fr.ERQ1",
      "titre": "Le chat de la voisine",
      "passage": "La semaine dernière, le chat de ma voisine a disparu pendant trois jours. Elle a collé des affiches dans tout le quartier, avec une photo de lui endormi sur le canapé. Moi, j'ai fait le tour des jardins avec une lampe de poche, le soir. Finalement, c'est le boulanger qui l'a retrouvé, enfermé dans son garage, derrière des sacs de farine. Il avait juste un peu maigri. Depuis, ma voisine lui a acheté un collier avec son numéro de téléphone.",
      "faitsCles": [
        "Le chat a disparu pendant trois jours.",
        "C'est le boulanger qui l'a retrouvé, enfermé dans son garage.",
        "La voisine lui a acheté un collier avec son numéro de téléphone."
      ]
    },
    {
      "id": "fr.ERQ2",
      "titre": "Le potager du grand-père",
      "passage": "Mon grand-père a un potager derrière sa maison, juste à côté de la voie ferrée. Cette année, il a planté des tomates, des haricots et des courgettes. Les courgettes ont tellement poussé qu'il en a donné à tous les voisins de la rue. Un matin, il a trouvé ses salades grignotées : c'était un hérisson, et il l'a laissé tranquille. Il arrose le soir avec l'eau de pluie, qu'il garde dans un vieux tonneau. Ma petite cousine vient l'aider le mercredi.",
      "faitsCles": [
        "Il a donné des courgettes à tous les voisins de la rue.",
        "Ses salades ont été grignotées par un hérisson.",
        "Il arrose avec l'eau de pluie, gardée dans un vieux tonneau."
      ]
    },
    {
      "id": "fr.ERQ3",
      "titre": "Le train du vendredi soir",
      "passage": "Vendredi soir, je rentrais chez mes parents en train. Peu après le départ, on s'est arrêtés en pleine campagne : un arbre était tombé sur la voie. Le contrôleur est passé avec des bouteilles d'eau et des petits gâteaux. J'ai discuté avec une dame qui allait voir sa petite-fille pour la première fois. Au bout de deux heures, on a pu avancer jusqu'à la gare suivante, et on a fini le trajet en car. Je suis arrivé à minuit, et ma mère m'attendait avec une soupe chaude.",
      "faitsCles": [
        "Le train s'est arrêté parce qu'un arbre était tombé sur la voie.",
        "Après deux heures d'arrêt, le trajet s'est fini en car.",
        "Arrivé à minuit, il a été accueilli par sa mère avec une soupe chaude."
      ]
    }
  ],
  "questionsSpontanees": [
    { "id": "fr.QSQ01", "texte": "Raconte ton meilleur souvenir de vacances, comme si on y était avec toi." },
    { "id": "fr.QSQ02", "texte": "Explique les règles de ton jeu ou de ton sport préféré à quelqu'un qui n'y a jamais joué." },
    { "id": "fr.QSQ03", "texte": "Décris un objet auquel tu tiens, et raconte d'où il vient." },
    { "id": "fr.QSQ04", "texte": "Conseille un livre, un film ou une série à un ami, et dis-lui pourquoi." },
    { "id": "fr.QSQ05", "texte": "Raconte une chose que tu as apprise récemment, et comment tu l'as apprise." },
    { "id": "fr.QSQ06", "texte": "Explique comment préparer ton plat préféré à quelqu'un qui ne cuisine jamais." },
    { "id": "fr.QSQ07", "texte": "Décris l'endroit où tu te sens le mieux, pour qu'on puisse l'imaginer." },
    { "id": "fr.QSQ08", "texte": "Un ami hésite à se lancer dans une nouvelle activité. Donne-lui ton avis." },
    { "id": "fr.QSQ09", "texte": "Raconte comment tu as rencontré une personne qui compte pour toi." },
    { "id": "fr.QSQ10", "texte": "Explique à un enfant ce que tu fais pendant une journée ordinaire." },
    { "id": "fr.QSQ11", "texte": "Si tu pouvais changer une chose dans ta ville ou ton quartier, laquelle choisirais-tu, et pourquoi ?" },
    { "id": "fr.QSQ12", "texte": "Explique à quelqu'un une chose que tu sais bien faire, étape par étape." }
  ],
  "repliquesEclair": [
    { "id": "fr.REQ01", "replique": "Allez, viens ce soir. Tout le monde sera là, il ne manque que toi.", "critere1": "Mon non tient en une phrase.", "critere2": "J'ai donné une seule raison, ou aucune." },
    { "id": "fr.REQ02", "replique": "Ton calcul, là, tu peux m'expliquer d'où il sort ?", "critere1": "J'ai nommé au moins deux étapes, dans l'ordre.", "critere2": "J'ai fini en redisant le résultat en une phrase." },
    { "id": "fr.REQ03", "replique": "Tu as encore oublié de sortir les poubelles. C'est toujours moi qui le fais.", "critere1": "J'ai reconnu le fait avant de m'expliquer.", "critere2": "J'ai proposé une solution concrète en une phrase." },
    { "id": "fr.REQ04", "replique": "Je t'écoute. Qu'est-ce que tu voulais me demander ?", "critere1": "Ma demande tient en une phrase.", "critere2": "J'ai précisé pour quand, ou pour combien de temps." },
    { "id": "fr.REQ05", "replique": "Franchement, ton idée ne tient pas debout.", "critere1": "J'ai posé une question sur ce qui coince avant de défendre mon idée.", "critere2": "Je n'ai dit ni « désolé » ni « pardon »." },
    { "id": "fr.REQ06", "replique": "Alors, raconte : c'était comment, ton week-end ?", "critere1": "Ma première phrase dit l'essentiel.", "critere2": "J'ai cité au moins un détail précis : un lieu, un nom ou un moment." },
    { "id": "fr.REQ07", "replique": "Je ne sais pas, je suis fatigué en ce moment. Tout m'agace.", "critere1": "J'ai redit avec mes mots ce que j'ai entendu, avant tout conseil.", "critere2": "J'ai fini par une question." },
    { "id": "fr.REQ08", "replique": "Et toi, tu en penses quoi ? Tu n'as rien dit depuis le début.", "critere1": "J'ai donné mon avis en deux phrases au plus.", "critere2": "Ma première phrase n'est ni une excuse ni « je ne sais pas »." },
    { "id": "fr.REQ09", "replique": "Qu'est-ce qui t'a donné envie de faire ce que tu fais aujourd'hui ?", "critere1": "J'ai donné une raison concrète : un fait, un souvenir ou une personne.", "critere2": "Ma dernière phrase est posée, sans « voilà » ni « enfin bref »." },
    { "id": "fr.REQ10", "replique": "Je ne comprends pas bien ce que tu attends de moi.", "critere1": "J'ai redit ma demande en une phrase.", "critere2": "J'ai dit pour quand." },
    { "id": "fr.REQ11", "replique": "Tu pourrais arroser mes plantes toute la semaine prochaine ?", "critere1": "Ma réponse, oui, non ou à condition, arrive dans la première phrase.", "critere2": "J'ai posé une question pratique avant de m'engager." },
    { "id": "fr.REQ12", "replique": "Attends, laisse-moi finir. Tu me coupes tout le temps.", "critere1": "J'ai reconnu en une phrase, sans me justifier.", "critere2": "J'ai rendu la parole avec une phrase courte : « vas-y », « je t'écoute »." }
  ],
  "autoGrille": [
    { "id": "fr.GQ1", "competence": "Prendre la parole", "niveaux": [
      "J'attends qu'on me donne la parole, ou je commence par une excuse.",
      "Je prends la parole de moi-même, mais l'idée arrive après un détour.",
      "Je prends la parole, ma première phrase dit l'idée, puis je m'arrête."
    ] },
    { "id": "fr.GQ2", "competence": "Écouter", "niveaux": [
      "Je coupe la parole, ou je réponds avant la fin de sa phrase.",
      "Je laisse finir, puis je réponds sans redire ce que j'ai compris.",
      "Je laisse finir, je redis en une phrase, puis « c'est bien ça ? »."
    ] },
    { "id": "fr.GQ3", "competence": "Dire non", "niveaux": [
      "Je dis oui ou « on verra » alors que je pense non.",
      "Je dis non, puis deux justifications ou plus.",
      "Non en une phrase, une raison au plus, puis silence."
    ] },
    { "id": "fr.GQ4", "competence": "Demander", "niveaux": [
      "Je tourne autour de ma demande, ou je laisse l'autre la deviner.",
      "Ma demande est claire, mais elle arrive après une longue introduction.",
      "Ma demande en une phrase, quoi et pour quand, puis j'écoute la réponse."
    ] },
    { "id": "fr.GQ5", "competence": "Raconter", "niveaux": [
      "Les faits viennent dans le désordre ; l'autre pose des questions pour suivre.",
      "Début, milieu, fin dans l'ordre, mais l'essentiel arrive tard.",
      "L'essentiel en une phrase, les détails dans l'ordre, puis je m'arrête."
    ] },
    { "id": "fr.GQ6", "competence": "Rester posé", "niveaux": [
      "Face à un reproche, ma voix monte ou je coupe l'autre.",
      "Ma voix reste stable, mais je me justifie longuement.",
      "Je reconnais le fait, voix stable, puis une proposition en une phrase."
    ] }
  ]
}
```

<!-- louarn -->
```json
{
  "proOnly": [
    "acc-01", "acc-17",
    "fin-01", "fin-14",
    "tro-05", "tro-07", "tro-10",
    "th-07", "th-08", "th-09", "th-10", "th-11", "th-12", "th-13", "th-15", "th-18",
    "rdv-01", "rdv-06", "rdv-07", "rdv-09",
    "tip-dic-08", "tip-eco-07",
    "tip-rdv-01", "tip-rdv-02", "tip-rdv-03", "tip-rdv-04", "tip-rdv-05", "tip-rdv-06", "tip-rdv-07", "tip-rdv-08",
    "sta-03", "sta-05", "sta-06"
  ],
  "repliques": [
    { "id": "q-acc-01", "moment": "accueil", "condition": "matin", "texte": "Bonjour. Avant que la journée démarre, on réveille la voix ?" },
    { "id": "q-acc-17", "moment": "accueil", "condition": "bloc>=3", "texte": "Tes vrais moments importants se préparent ici, une phrase à la fois." },
    { "id": "q-fin-01", "moment": "fin", "texte": "C’est fait. Ce temps-là, c’était pour toi, et pour personne d’autre." },
    { "id": "q-fin-14", "moment": "fin", "condition": "bloc>=3", "texte": "Une phrase de plus de prête pour ton prochain moment important." },
    { "id": "q-tro-05", "moment": "jalon", "condition": "trophee:premier-rdv", "texte": "Premier moment important préparé. Cette fois, c’était pour de vrai." },
    { "id": "q-tro-07", "moment": "jalon", "condition": "trophee:objectif-tenu", "texte": "Objectif atteint, pendant un vrai moment important. Celui-là, je l’encadre." },
    { "id": "q-tro-10", "moment": "jalon", "condition": "trophee:confiance", "texte": "Deuxième bloc fait. Ce que tu as travaillé reste à toi, dans chaque conversation." },
    { "id": "q-th-07", "moment": "theme", "condition": "theme:7", "texte": "Nouveau bloc : ta voix devant les autres. On commence par oser la première phrase." },
    { "id": "q-th-08", "moment": "theme", "condition": "theme:8", "texte": "Face à ce qui te bouscule : une respiration, puis une phrase posée." },
    { "id": "q-th-09", "moment": "theme", "condition": "theme:9", "texte": "Dire clairement ce que tu veux, en une phrase, puis écouter la réponse." },
    { "id": "q-th-10", "moment": "theme", "condition": "theme:10", "texte": "Faire passer une idée ou une histoire, du début jusqu’au bout, sans te perdre." },
    { "id": "q-th-11", "moment": "theme", "condition": "theme:11", "texte": "Peu de mots, bien choisis. Ça vaut pour parler comme pour écouter." },
    { "id": "q-th-12", "moment": "theme", "condition": "theme:12", "texte": "Dernier thème : parler devant les autres, avec tout ce que tu as déjà posé." },
    { "id": "q-th-13", "moment": "theme", "condition": "theme:13", "texte": "Nouveau bloc : les premières secondes. Un bonjour clair, puis ce que tu viens dire." },
    { "id": "q-th-15", "moment": "theme", "condition": "theme:15", "texte": "Raconter court : ce qui s’est passé, ce qui a coincé, ce qui a changé." },
    { "id": "q-th-18", "moment": "theme", "condition": "theme:18", "texte": "Quand l’autre dit oui, tu arrêtes d’expliquer. Tu passes à la suite." },
    { "id": "q-rdv-01", "moment": "rdv", "texte": "Tu y vas. Tu as le droit de prendre ton temps avant de répondre." },
    { "id": "q-rdv-06", "moment": "rdv", "texte": "Une question te surprend ? Respire, puis réponds en une phrase." },
    { "id": "q-rdv-07", "moment": "rdv", "texte": "Si tu ne sais pas, tu peux le dire, puis dire ce que tu sais." },
    { "id": "q-rdv-09", "moment": "rdv", "texte": "Ta dernière phrase, dis-la en regardant quelqu’un." },
    { "id": "q-rdv-10", "moment": "rdv", "condition": "objectif", "texte": "Ton objectif tient en une phrase. Le reste peut venir comme il vient." },
    { "id": "q-rdv-11", "moment": "rdv", "condition": "sansObjectif", "texte": "Pas d’objectif ? Choisis juste la phrase que tu veux qu’on retienne." },
    { "id": "q-tip-dic-08", "moment": "tip", "texte": "Un mot long, comme « particulièrement » : dis-le en entier, sans avaler le milieu." },
    { "id": "q-tip-eco-07", "moment": "tip", "texte": "Celui qui parle le plus n’est pas toujours celui qui a le plus à dire." },
    { "id": "q-tip-rdv-01", "moment": "tip", "texte": "Dis le prénom de l’autre en lui répondant : il entend que tu l’écoutes." },
    { "id": "q-tip-rdv-02", "moment": "tip", "texte": "Pour demander, une phrase suffit : ce que tu veux, et pour quand." },
    { "id": "q-tip-rdv-03", "moment": "tip", "texte": "Un désaccord se dit mieux tôt et calmement que tard et à bout de nerfs." },
    { "id": "q-tip-rdv-04", "moment": "tip", "texte": "Pour raconter, donne l’essentiel en une phrase, puis les détails." },
    { "id": "q-tip-rdv-05", "moment": "tip", "texte": "Un exemple vécu parle plus qu’une idée générale. Donne le tien." },
    { "id": "q-tip-rdv-06", "moment": "tip", "texte": "« Je ne sais pas » est une vraie réponse. Ajoute ce que tu sais, si tu peux." },
    { "id": "q-tip-rdv-07", "moment": "tip", "texte": "En groupe, une phrase courte suffit pour entrer dans la conversation." },
    { "id": "q-tip-rdv-08", "moment": "tip", "texte": "Tu as posé ta question ? Tais-toi, et laisse l’autre chercher sa réponse." },
    { "id": "q-sta-03", "moment": "stade", "condition": "stade:3", "texte": "Je tiens d’aplomb sur mes pattes. On continue à poser les appuis, toi et moi." },
    { "id": "q-sta-05", "moment": "stade", "condition": "stade:5", "texte": "Je regarde les gens en face, maintenant. On garde ce cap ensemble." },
    { "id": "q-sta-06", "moment": "stade", "condition": "stade:6", "texte": "Écharpe nouée, tête haute. Le sentier est fait, et ta voix continue avec toi." }
  ]
}
```
