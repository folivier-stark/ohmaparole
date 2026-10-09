# Appli « Parole » : expérience UX (V1)

> PWA Android, usage perso de Fred. Pas de code ici : écrans, déroulé, motivation, textes, visuel, garde-fous.
> Nom de travail : **Parole**. À remplacer si mieux, ça ne bloque rien.

---

## 0. Les 6 principes qui tranchent tous les arbitrages

| # | Principe | Ce que ça veut dire concrètement |
|---|---|---|
| 1 | **Zéro décision avant d'agir** | L'appli choisit le contenu du jour. Fred ne choisit qu'entre « Go » et « Avant un rendez-vous ». |
| 2 | **Les yeux libres** | Pendant la séance, presque rien à lire : consignes en 1 ligne + voix de guidage + vibrations. |
| 3 | **Ça compte vite** | 1 minute de pratique suffit pour que la journée compte. Le seuil bas, c'est ce qui fait tenir l'habitude. |
| 4 | **Rien ne se perd** | Aucun compteur ne retombe à zéro par punition. Le cumul ne fait que monter. |
| 5 | **Une prise, pas de refaire** | On n'enregistre pas « jusqu'à ce que ce soit bien ». Une prise, on écoute, on avance. |
| 6 | **Le pourquoi bouge** | Le « pourquoi » apparaît à des moments variés, pas en bannière fixe que l'œil finit par ignorer. |

---

## 1. Liste des écrans (minimum absolu : 4 d'onboarding + 6 en usage)

### Premier lancement (< 2 min au total)

| Écran | But | Contenu exact | Action unique | Durée visée |
|---|---|---|---|---|
| **O1 Bienvenue** | Poser le contrat | Titre « 5 minutes par jour. Pas plus. » · 3 lignes : « Tu parles, tu t'écoutes, tu avances. Un jour raté ne casse rien. On commence par 3 réglages, moins de 2 minutes. » | **[Commencer]** | 10 s |
| **O2 Ton pourquoi** | Ancrer la motivation | Champ 1 « Ton objectif » prérempli et modifiable : « Être posé et clair en rendez-vous, face à 1 à 3 personnes. » · Champ 2 « Pourquoi c'est important pour toi ? » (1 phrase, astuce sous le champ : « Tu peux dicter avec le micro du clavier. ») · 3 exemples cliquables pour démarrer : « Pour que mes clients me comprennent du premier coup » · « Pour être aussi à l'aise en rendez-vous qu'en atelier » · « Pour signer plus, en restant moi-même » | **[C'est mon pourquoi]** | 40 s |
| **O3 Ta voix de départ** | Enregistrer la référence J1 | Demande d'accès au micro (expliquée en 1 ligne : « Ta voix reste sur ton téléphone. ») · Le **texte témoin** affiché en grand (voir §2.5) · Gros bouton micro. Après la prise : réécoute possible 1 fois, **pas de « refaire »** (bouton discret « Recommencer » autorisé **une seule fois** ici, parce que c'est la référence et qu'un éternuement peut arriver). | **[Enregistrer]** puis **[Garder cette prise]** | 50 s |
| **O4 Ton heure** | Installer le déclencheur | Sélecteur d'heure (par défaut 8 h 30) · Bouton « Copier le nom de l'alarme » qui copie le libellé (voir ci-dessous) · Mini-guide en 3 pictos : « Ouvre Horloge → Nouvelle alarme à cette heure, tous les jours → Colle le nom. » · Rappel : « Mets l'icône Parole sur ton écran d'accueil, à côté de l'horloge. » | **[Ouvrir l'horloge]** (si le lien fonctionne) sinon **[C'est fait]** | 25 s |

**Libellé de l'alarme copié** : `Parole 5 min, pour : [ton pourquoi, coupé à 40 caractères]`
Le pourquoi s'affiche ainsi sur l'écran de l'alarme, chaque jour, sans même ouvrir l'appli.

> **Contrainte technique à signaler au dev (grave, à vérifier tôt)** : une alarme Android de l'appli Horloge **n'ouvre pas** une PWA toute seule, et une page web ne peut probablement pas créer l'alarme à la place de Fred. Le scénario réaliste : l'alarme sonne avec le libellé, Fred tape sur l'icône Parole posée juste à côté. D'où l'importance des **raccourcis d'icône** (appui long sur l'icône → « Go » et « Avant un rendez-vous », épinglables comme 2 icônes séparées) : 1 tap depuis l'écran d'accueil du téléphone = séance lancée.

### Usage quotidien

| Écran | But | Contenu exact | Action principale |
|---|---|---|---|
| **A Accueil** | Lancer en 1 tap | Haut : « **12 jours ce mois-ci ›** » (tapable → Progression) + petite roue des réglages · Milieu : **1 ligne de contexte** qui change (voir §3) · Bas, dans la zone du pouce : bouton 1 **« Go · 5 min »** avec sous-titre « Aujourd'hui : articulation + écoute » · bouton 2 **« Avant un rendez-vous · 90 s »** | **[Go]** |
| **S Séance** | Guider sans faire lire | 1 seul écran qui change d'état : nom du bloc, 1 ligne de consigne, gros minuteur circulaire, 3 petits segments en haut (où j'en suis dans les 3 blocs), bouton Pause en bas | **[Pause]** (le reste est automatique) |
| **F Fin de séance** | Fêter, ancrer, fermer | Message de fin (8 variantes, §5) · point du jour qui se remplit dans une mini-rangée de la semaine · « Réécouter ta prise du jour » (lien discret) · Les jours de jalon : bloc comparaison audio (voir §4) | **[Fermer]** |
| **R Avant un rendez-vous** | Se mettre en condition en 90 s | Même écran que S, contenu différent (§2.4), pas d'enregistrement · Dernier écran : ton intention + « Tu y vas. » | **[Pause]** puis **[J'y vais]** |
| **P Progression** | Voir le chemin parcouru | Voir §4 | **[Écouter]** sur le jalon le plus récent |
| **Z Réglages** | Le strict nécessaire | Modifier mon pourquoi · Mon heure (+ recopier le libellé d'alarme) · Voix de guidage oui/non · Sons oui/non · Vibrations oui/non · « Garder une copie de ma voix J1 » (télécharge le fichier) | Aucune action dominante |

**Note sur la règle des « 2 boutons max »** : elle est respectée au sens des **actions principales**. Le compteur « 12 jours ce mois-ci » sert de porte vers la Progression, la roue est minuscule et grisée. Aucun troisième bouton de même poids.

### États de l'accueil (même écran, texte qui change)

| Situation | Ligne de contexte | Bouton Go devient |
|---|---|---|
| Normal | Le pourquoi, ou le thème du jour, ou un jalon proche (rotation) | « Go · 5 min » |
| Déjà fait aujourd'hui | « C'est fait pour aujourd'hui. » | « Encore une ? · 5 min » (style secondaire, plus calme) |
| Hier sans séance | « Hier, pause. Aujourd'hui, 1 minute suffit pour que ça compte. » | « Go · 5 min » |
| 3 jours ou plus sans séance | Message de retour (§5) | **« Reprendre · 2 min »** (séance raccourcie) |
| Jour de jalon | « Jalon 7 aujourd'hui : tu vas réentendre ta voix du début. » | « Go · 5 min » |
| Retour après un RDV préparé | Question 1 tap (voir §3.4) | « Go · 5 min » |

---

## 2. Déroulé d'une séance, seconde par seconde

### 2.1 Règles transverses

| Sujet | Décision |
|---|---|
| **Passage d'un bloc à l'autre** | Automatique. 2 vibrations courtes + son doux (si activé) + écran de transition de **3 s** : nom du bloc suivant + « à quoi ça sert en rendez-vous » (1 ligne). |
| **Sous-étapes** | 1 vibration courte à chaque changement. Fred peut garder les yeux fermés ou le téléphone posé. |
| **Voix de guidage** | La synthèse vocale du téléphone lit la consigne (activée par défaut, coupable dans les réglages). Un écran à lire pendant qu'on fait un exercice de posture, c'est contradictoire. |
| **Écran toujours allumé** | Pendant toute la séance (à demander au dev : maintien de l'écran actif). |
| **Minuteur** | Anneau qui se vide + chiffres « 1:24 » en gros. Le temps **restant**, jamais le temps écoulé. |
| **Bouton Pause** | Toujours au même endroit, en bas au centre, 72 dp. Ouvre un panneau avec 3 choix : **[Reprendre]** (gros) · « Passer ce bloc » · « J'arrête là ». |
| **Sortie de l'appli** (appel, SMS) | Pause automatique. Au retour : « On reprend ? » **[Reprendre]** / « J'arrête là ». Au-delà de 30 min d'absence, la séance se clôt toute seule et le travail fait est gardé. |
| **Quand la journée compte** | Dès **60 s de pratique cumulée** (l'échauffement fini suffit). En dessous : rien n'est compté, et le message dit simplement « Pas encore compté. Une minute suffit. » avec **[Continuer]**. |
| **Séance interrompue après 60 s** | Compte **exactement comme une séance complète**. Même point dans le calendrier, pas de demi-point, pas de « séance incomplète ». |
| **Enregistrement** | Automatique au bon moment, point rouge + « J'enregistre » bien visible. Pas de bouton à presser pendant l'exercice. |
| **Réécoute** | Automatique dans le bloc articulation, puis possible sur l'écran de fin. Pas de « refaire la prise ». |

### 2.2 Séance « Go » (5 min = 300 s)

**00:00 → 00:03 · Démarrage**
- Écran : « Prêt ? » puis 3, 2, 1 avec une vibration par chiffre. Un tap n'importe où lance tout de suite.
- Les jours où c'est pertinent (1 fois sur 3 environ) : le pourquoi s'affiche pendant ces 3 s, en italique.

**Bloc 1 · Échauffement · 60 s** (« Pour que ta voix soit prête avant ta première phrase »)

| Temps | Consigne affichée et dite | Ce que fait l'écran |
|---|---|---|
| 0:00–0:15 | « Inspire 4 secondes. Souffle 6. » | Cercle qui gonfle et dégonfle au rythme |
| 0:15–0:30 | « Bâille grand. Masse ta mâchoire. » | Picto + minuteur |
| 0:30–0:45 | « Lèvres qui vibrent : brrrr. » | Picto + minuteur |
| 0:45–1:00 | « Sirène : du grave à l'aigu, bouche fermée. » | Picto + minuteur |

Les 4 exercices tournent dans une petite banque (8 à 10 variantes) pour la nouveauté.
→ À 1:00, la journée **compte déjà**. Le compteur du mois prend +1 silencieusement (la fête vient à la fin).

**Bloc 2 · Articulation enregistrée · 120 s** (« Pour qu'on te comprenne du premier coup »)

| Temps | Ce qui se passe | Écran |
|---|---|---|
| 0:00–0:10 | « Lis le texte du jour dans ta tête. » | Texte du jour (3 à 4 lignes) en 24 px minimum |
| 0:10–0:40 | **Prise 1** : « À voix haute, normalement. » | Point rouge « J'enregistre », onde sonore, texte toujours affiché |
| 0:40–1:05 | **Réécoute auto** de la prise 1 : « Écoute une seule chose : [la fin des mots / les consonnes / le rythme]. » | Icône casque, barre de lecture |
| 1:05–1:35 | **Prise 2** avec une consigne unique : « Exagère les consonnes » ou « Ralentis de moitié » ou « Un stylo entre les dents » (tourne) | Point rouge, texte affiché |
| 1:35–2:00 | **Réécoute auto** de la prise 2 (25 s) | Icône casque |

- Seule la **prise 2** est conservée chaque jour (stockage léger, et c'est la meilleure).
- **Les jours de jalon** (7e, 14e, 30e jour pratiqué…) : le texte du jour est remplacé par le **texte témoin** de J1, et la prise 2 est faite sans consigne spéciale, pour que la comparaison soit honnête.

**Bloc 3 · Écoute OU Posture · 120 s** (alterné d'une séance à l'autre, pas d'un jour calendaire à l'autre, pour que l'alternance survive aux absences)

*Version Écoute* (« Pour que ton client se sente entendu »)

| Temps | Ce qui se passe |
|---|---|
| 0:00–0:10 | « Écoute. Ne prépare pas ta réponse. » |
| 0:10–0:25 | La voix du téléphone dit une phrase de client. **Rien n'est affiché** (vraie écoute). |
| 0:25–0:55 | « Reformule à voix haute : *Si je comprends bien…* puis pose une question. » (pas d'enregistrement) |
| 0:55–1:00 | La phrase s'affiche, le **mot-clé surligné** : « Tu l'as repris ? » (pas de réponse à donner) |
| 1:00–2:00 | Même chose avec une 2e phrase |

Exemples de phrases (banque à constituer, environ 40) :
- « Franchement, j'ai déjà essayé ChatGPT, et je n'ai pas vu la différence. » → mot-clé : *pas vu la différence*
- « Mon souci, ce n'est pas l'outil, c'est que je n'ai pas une heure à moi. » → *pas une heure à moi*
- « Ma comptable m'a dit de me méfier avec les données clients. » → *me méfier*

*Version Posture* (« Pour inspirer confiance avant même de parler »). Téléphone **posé**, guidage à la voix.

| Temps | Consigne dite |
|---|---|
| 0:00–0:10 | « Pose le téléphone. Assieds-toi comme en rendez-vous. » |
| 0:10–0:30 | « Pieds à plat. Dos contre le dossier, pas avachi. Épaules qui descendent. » |
| 0:30–0:50 | « Mains posées sur la table, visibles. Elles ne bougent plus. » |
| 0:50–1:20 | « Regard : imagine 3 personnes. 3 secondes sur chacune. » (vibration à chaque changement de regard) |
| 1:20–1:50 | « On te pose une question. Compte 2 secondes de silence avant de répondre. Réponds une phrase, à voix haute. » ×2 |
| 1:50–2:00 | « Souris légèrement. C'est fini. » |

**05:00 · Fin** → écran F (3 vibrations longues et douces, son de bol si activé).

### 2.3 Séance « Reprendre » (après 3 jours ou plus d'absence) · 2 min
Échauffement 60 s + articulation raccourcie 60 s (une seule prise de 25 s + réécoute). Objectif : rendre le retour **plus facile** que l'abandon. La séance suivante redevient normale.

### 2.4 « Avant un rendez-vous » · 90 s (aucun enregistrement, pour ne pas stresser)

| Temps | Consigne |
|---|---|
| 0:00–0:20 | Respiration 4-6, deux cycles (cercle qui gonfle) |
| 0:20–0:40 | « Mmmm bouche fermée, puis brrrr, puis sirène. » |
| 0:40–1:00 | Un virelangue, 3 fois, de plus en plus vite |
| 1:00–1:15 | « Épaules basses. Pieds au sol. Mains visibles. » |
| 1:15–1:30 | Écran d'intention : ton pourquoi + « Je suis là pour comprendre, pas pour convaincre. » → **[J'y vais]** |

Compte comme un jour pratiqué (symbole différent dans le calendrier, voir §4).

### 2.5 Texte témoin J1 (environ 30 s à débit normal, 70 mots, sons variés)

> « Ce matin, sur la route de Romillé, j'ai croisé trois tracteurs, un facteur pressé et une brume épaisse. Je prends le temps de poser ma voix. Je respire. Je regarde la personne en face de moi et je lui dis clairement ce que je fais : j'aide les dirigeants à gagner du temps avec des outils simples. Chaque mot compte, chaque silence aussi. Et maintenant, je l'écoute vraiment. »

Il ne change **jamais** : c'est la seule condition pour qu'une comparaison J1 / J30 ait un sens.

---

## 3. Mécanique de motivation

### 3.1 Où apparaît le « pourquoi » (jamais en bannière fixe)

| Moment | Forme | Fréquence |
|---|---|---|
| Écran de l'alarme | Libellé « Parole 5 min, pour : … » | Chaque jour |
| Accueil | Ligne de contexte, en rotation avec 2 autres messages | 1 jour sur 3 environ |
| Démarrage de séance (3 s) | En italique sous le compte à rebours | 1 séance sur 3 |
| « Avant un rendez-vous » | Écran d'intention final | À chaque fois |
| Retour après absence | Intégré au message de retour | À chaque retour |
| **Tous les 7 jours pratiqués** | Fin de séance : « Ton pourquoi tient toujours ? » → **[Oui]** / « Je le reformule » | Toutes les 7 séances |

Pourquoi le faire reformuler : un texte relu 30 fois devient invisible. Le réécrire avec ses mots du moment le garde vivant, et c'est de la nouveauté gratuite.

### 3.2 Relier l'objectif aux séances
- Chaque bloc s'annonce avec **ce qu'il apporte en rendez-vous** (écran de transition de 3 s) :
  - Échauffement → « Ta voix est prête avant ta première phrase. »
  - Articulation → « On te comprend du premier coup. »
  - Écoute → « Ton client se sent entendu. »
  - Posture → « Tu inspires confiance avant même de parler. »
- Les textes à articuler parlent de **situations de rendez-vous** (présentation, objection, reformulation), pas seulement de chaussettes d'archiduchesse.
- Le **retour terrain** (3.4) relie la pratique au vrai résultat : « Est-ce que je suis plus à l'aise en vrai ? »

### 3.3 Récompenses non toxiques adaptées TDAH

| Levier | Mise en œuvre | Pourquoi c'est sain |
|---|---|---|
| **Nouveauté** | Texte, phrase d'écoute, exercice d'échauffement et consigne de prise 2 changent à chaque séance (banques qui tournent) | Le cerveau TDAH s'ennuie vite ; on change le contenu sans changer le rituel |
| **Variété** | Alternance écoute / posture | Deux séances de suite ne se ressemblent jamais |
| **Petite victoire visible** | À la fin, le point du jour se remplit avec une petite animation (0,5 s) + vibration | Signal clair, immédiat, sans points ni score |
| **Cumul qui ne baisse jamais** | « 37 séances depuis le début » | Rien à perdre, donc rien à craindre |
| **Jalons audio** | J7, J14, J30, J60, J90 en **jours pratiqués** : écoute avant / après | La vraie récompense, c'est d'entendre sa propre voix changer (ou pas encore) |
| **Surprise rare et facultative** | Environ 1 séance sur 6 : « Défi bonus, 30 s ? » (virelangue niveau 2). Refuser ne change rien. | Récompense variable, mais **optionnelle** et sans perte associée |
| **Fresh start mensuel** | Le 1er du mois : « Nouveau mois. Le mois dernier : 18 jours. » puis le compteur repart | Un nouveau départ régulier, présenté comme tel, jamais comme une perte |

### 3.4 Retour terrain après un vrai rendez-vous (1 tap)
- Si Fred a lancé « Avant un rendez-vous », à la prochaine ouverture de l'appli (au moins 1 h après) : « Ton rendez-vous, tu t'es senti comment ? » → **[À l'aise]** · **[Correct]** · **[Tendu]** · « Passer ».
- Pas de champ texte, pas de note.
- C'est **la seule mesure** qui parle directement de l'objectif. Elle alimente une ligne de l'écran Progression.

### 3.5 Revenir après 3 jours ou plus, sans honte
1. **On ne dit jamais combien de jours ont été manqués.** Nulle part.
2. L'accueil affiche un message de retour (4 variantes, §5) qui **accueille**, ne commente pas.
3. Le bouton devient **« Reprendre · 2 min »** : on baisse la marche.
4. Le compteur du mois et le cumul n'ont pas bougé : rien n'a été perdu.
5. Les jalons sont comptés en jours pratiqués : l'absence ne fait **rater aucun jalon**, elle le décale.
6. Pas de « rattrapage » proposé, jamais (pas de « fais 2 séances pour compenser »).

### 3.6 La règle « jamais deux jours d'affilée sans » : comment la montrer sans fouet
- Elle est énoncée **une fois** à l'onboarding (O1) puis reste implicite.
- Le lendemain d'un jour sans : une seule ligne neutre sur l'accueil (« Hier, pause. Aujourd'hui, 1 minute suffit. »).
- Si la règle est cassée : rien de rouge, rien d'écrit sur la règle. On passe directement en mode retour.

---

## 4. L'écran Progression (1 seul écran, lisible en 3 secondes)

De haut en bas :

**1. Le chiffre du mois**
`18 jours pratiqués en octobre` (en très gros) · en dessous, petit : `52 séances depuis le début`

**2. Le calendrier du mois** (grille 7 colonnes, lundi en premier)

| Symbole | Sens |
|---|---|
| Rond plein bleu mer | Séance faite (complète ou non, aucune différence) |
| Petit losange ajonc cerné de granite | « Avant un rendez-vous » fait ce jour-là |
| Cercle gris très clair | Jour sans. **Pas de croix, pas de rouge.** |
| Anneau épais | Aujourd'hui |

**3. « Ta voix » : la frise des jalons**
`J1 ● ─ J7 ● ─ J14 ● ─ J30 ○ ─ J60 ○ ─ J90 ○`
- Jalon atteint : 2 boutons côte à côte **[Écouter J1]** **[Écouter J14]**, même texte, même durée.
- Après la double écoute, 1 tap : « Tu entends une différence ? » → **[Nette]** · **[Un peu]** · **[Pas encore]**. La réponse s'affiche sous le jalon, dans les mots de Fred, jamais transformée en score.
- Jalon pas encore atteint : « Dans 4 séances ».

**4. « En rendez-vous » : le retour terrain**
`Tes 6 derniers rendez-vous : À l'aise ·· Correct ··· Tendu ·`
Une ligne, des points, pas de pourcentage, pas de courbe.

**Ce qu'on n'affiche pas** : courbes, moyennes, taux de réussite, record de série, comparaison avec la moyenne des utilisateurs, analyse automatique de la voix.

> **Point de vigilance (moyen)** : la comparaison audio est subjective. Fred risque d'entendre « pas de différence » à J7, ce qui est normal. Le message de jalon doit le dire honnêtement (voir §5) au lieu de promettre un progrès.

---

## 5. Microcopy (tutoiement, chaleureux, direct)

### 5.1 Boutons
| Endroit | Texte |
|---|---|
| Accueil, principal | **Go · 5 min** |
| Accueil, sous-titre | Aujourd'hui : articulation + écoute / Aujourd'hui : articulation + posture |
| Accueil, secondaire | **Avant un rendez-vous · 90 s** |
| Accueil, déjà fait | Encore une ? · 5 min |
| Accueil, retour | **Reprendre · 2 min** |
| Compteur | 12 jours ce mois-ci › |
| Pause | Pause |
| Panneau pause | **Reprendre** · Passer ce bloc · J'arrête là |
| Fin de séance | **Fermer** · Réécouter ta prise du jour |
| Fin RDV | **J'y vais** |
| Jalon | Écouter J1 · Écouter J14 |
| Onboarding | Commencer · C'est mon pourquoi · Enregistrer · Garder cette prise · Recommencer · Copier le nom de l'alarme · Ouvrir l'horloge · C'est fait |

### 5.2 Titres
| Écran | Titre |
|---|---|
| O1 | 5 minutes par jour. Pas plus. |
| O2 | Pourquoi tu fais ça ? |
| O3 | Ta voix d'aujourd'hui |
| O4 | À quelle heure on se retrouve ? |
| Blocs | Échauffement · Articulation · Écoute · Posture |
| Progression | Ton chemin |
| Réglages | Réglages |
| RDV | Tu y vas dans 90 secondes |

### 5.3 Fins de séance (8 variantes, tirées sans répétition consécutive)
1. « C'est fait. 5 minutes pour toi, et pour tes prochains rendez-vous. »
2. « Une de plus. Ta voix s'en souvient, même si toi tu oublies. »
3. « Bien joué. Le plus dur, c'était d'appuyer sur Go. »
4. « Fait. Tu peux retourner à ta journée. »
5. « Ça, c'est une séance qui compte. À demain. »
6. « Tu t'es écouté aujourd'hui. Peu de gens le font. »
7. « Voilà. Petit, régulier : c'est comme ça que ça bouge. »
8. « Merci d'être venu. Rien d'autre à faire. »

Fin après arrêt en cours de séance (au-delà de 60 s) : « Arrêté en route, et ça compte quand même. »

### 5.4 Retour après 3 jours ou plus (4 variantes)
1. « Content de te revoir. On reprend doucement : 2 minutes. »
2. « Te revoilà. Rien n'est perdu, tout est là. On y va ? »
3. « Les pauses font partie du chemin. 2 minutes pour remettre la voix en route. »
4. « Bon retour. Pas de bilan, pas de rattrapage. Juste maintenant. »

### 5.5 Messages de jalon
- **J7** : « 7 séances. Écoute ta voix du début, puis celle d'aujourd'hui. Si tu n'entends pas encore de différence, c'est normal à ce stade. »
- **J14** : « 14 séances. Même texte, deux voix. À toi de juger. »
- **J30** :
  > « 30 séances. Un mois de pratique, à ton rythme.
  > Écoute ta voix du premier jour, puis celle d'aujourd'hui. Même texte.
  > Ce que tu entends, c'est toi qui le dis : rien n'est noté ici.
  > Ton pourquoi, c'était : *« [son pourquoi] »*. Il tient toujours ? »
  > **[Écouter J1]** **[Écouter J30]** puis **[Oui]** / « Je le reformule »

### 5.6 Autres messages
| Situation | Texte |
|---|---|
| Hier sans séance | « Hier, pause. Aujourd'hui, 1 minute suffit pour que ça compte. » |
| Arrêt avant 60 s | « Pas encore compté. Une minute suffit. » → **Continuer** · Arrêter quand même |
| Retour dans l'appli en pleine séance | « On reprend ? » |
| Défi bonus | « Défi bonus, 30 secondes ? » → **Oui** · Non merci |
| Nouveau mois | « Nouveau mois. Le mois dernier : 18 jours. On repart. » |
| Micro refusé | « Sans micro, pas d'enregistrement. Tu peux l'autoriser dans les réglages du téléphone. Le reste marche quand même. » |
| Pourquoi tous les 7 jours | « Ton pourquoi tient toujours ? » |
| Retour terrain | « Ton rendez-vous, tu t'es senti comment ? » |

---

## 6. Direction visuelle

### 6.1 Identité : « le pont entre la tech et l'humain »
- **Calme, chaud, sobre.** Beaucoup d'air, une seule chose importante par écran.
- **Bretagne discrète** : granite, mer d'Iroise, sable, fleur d'ajonc. Aucun cliché (pas de triskell, pas d'hermine).
- Formes arrondies (rayon 20 dp sur les boutons), anneau du minuteur comme motif récurrent (le « pont » : un arc qui se referme).

### 6.2 Palette (contrastes WCAG calculés)

**Mode clair**

| Rôle | Nom | Hex | Contraste |
|---|---|---|---|
| Fond | Sable | `#F7F3EC` | référence |
| Surface (cartes) | Blanc | `#FFFFFF` | |
| Texte principal | Granite | `#1F2A30` | 13,3:1 sur sable · AAA |
| Texte secondaire | Granite clair | `#55626A` | 5,7:1 sur sable · AA |
| Primaire (bouton Go, points du calendrier) | Iroise | `#1D5C6B` | texte blanc dessus 7,5:1 · sur sable 6,8:1 |
| Accent (bouton RDV, losanges) | Ajonc | `#E3A72F` | texte granite dessus 6,9:1 · **jamais en texte sur fond clair** (1,9:1) |
| Accent en texte | Ajonc foncé | `#8A6A1F` | 4,6:1 sur sable · AA |
| Enregistrement | Brique | `#B4441C` | 5,0:1 sur sable · texte blanc dessus 5,6:1 |
| Bordures, jours sans | Grève | `#DDD5C8` | décoratif |

**Mode sombre** (suit le réglage du téléphone)

| Rôle | Hex | Contraste |
|---|---|---|
| Fond | `#12191D` | référence |
| Surface | `#1C252A` | |
| Texte principal | `#ECE7DF` | 14,4:1 · AAA |
| Texte secondaire | `#A9B4BA` | 8,4:1 · AAA |
| Primaire | `#5FB3C4` | texte `#0E1A1E` dessus 7,4:1 · sur fond 7,4:1 |
| Accent | `#F0BC4E` | texte `#12191D` dessus 10,2:1 |
| Enregistrement | `#F27A4F` | 6,5:1 sur fond |

- Le **rouge n'est utilisé que pour « j'enregistre »**. Jamais pour une erreur, jamais pour un jour manqué.
- Les deux boutons de l'accueil ont **deux couleurs différentes** (Iroise et Ajonc) : on les reconnaît sans lire.

### 6.3 Typographie (Google Fonts)
| Usage | Police | Taille |
|---|---|---|
| Titres, boutons, chiffres | **Lexend** (600) | Titres 28 px · boutons 22 px |
| Texte courant, consignes, textes à lire | **Atkinson Hyperlegible** (400 / 700) | Consignes 24 px · textes à articuler 24 à 26 px · texte courant 18 px minimum |
| Minuteur | Lexend, chiffres à chasse fixe | 72 px |
| Compteur du mois sur Progression | Lexend 700 | 56 px |

Interligne 1,5 pour les textes à lire. Jamais de texte en majuscules continues. Jamais d'italique long (seulement le pourquoi, 1 ligne).

### 6.4 Une main, téléphone debout
| Élément | Règle |
|---|---|
| Boutons principaux | Hauteur **80 dp**, pleine largeur moins 24 dp de marge, dans le **tiers inférieur** de l'écran |
| Bouton Pause | 72 dp, centré en bas |
| Toute cible tactile | **56 dp minimum** (au-dessus des 48 dp recommandés par Material, à cause du stress et des gestes rapides) |
| Écart entre deux cibles | 16 dp minimum |
| Éléments du haut (compteur, roue) | Non critiques : peu importe s'ils sont loin du pouce |
| Gestes | Aucun geste caché (pas de balayage obligatoire, pas d'appui long) |

### 6.5 Sons et vibrations
| Événement | Vibration | Son (si activé) |
|---|---|---|
| Compte à rebours 3-2-1 | 1 courte par chiffre | aucun |
| Changement de sous-étape | 1 courte (50 ms) | aucun |
| Changement de bloc | 2 courtes | tintement doux |
| Début d'enregistrement | 1 moyenne | petit « tic » |
| Fin de séance | 3 longues et douces | bol tibétain, 1 seconde |
| Point du jour qui se remplit | 1 courte | aucun |

Pas de fanfare, pas d'applaudissements, pas de son d'échec. Tout est coupable dans les réglages.

---

## 7. Ce qu'il ne faut PAS faire (10 pièges TDAH et applis d'habitudes)

| # | Piège | Pourquoi ça tue l'appli | À la place |
|---|---|---|---|
| 1 | **Série qui retombe à zéro** | Un jour raté, la série casse, la honte arrive, puis l'effet « foutu pour foutu » : on lâche tout | Compteur du mois + cumul qui ne baisse jamais |
| 2 | **Afficher les jours manqués** | Croix rouges, « dernière séance il y a 6 jours » : chaque ouverture devient un reproche | Cercles gris neutres, aucun chiffre d'absence |
| 3 | **Relances culpabilisantes** | « Tu nous manques ! », mascotte triste : manipulation, puis désinstallation | Une alarme par jour, réglée par Fred, avec son propre pourquoi |
| 4 | **Onboarding long ou paramétrage infini** | Le TDAH adore configurer au lieu de pratiquer | 4 écrans, 2 min, valeurs par défaut partout |
| 5 | **Plusieurs choix à l'accueil** | Chaque choix coûte de la mémoire de travail : paralysie | 2 boutons, contenu choisi par l'appli |
| 6 | **Points, niveaux, badges** | La nouveauté s'épuise en 2 semaines et on finit par jouer pour les points | Nouveauté dans le contenu, récompense = sa propre voix |
| 7 | **Note automatique de la voix** | Un score faussement précis nourrit le jugement et le perfectionnisme | Comparaison à l'oreille, jugée par Fred |
| 8 | **Refaire la prise jusqu'à ce qu'elle soit parfaite** | Le perfectionnisme transforme 5 min en 20, puis en zéro | Une prise, on écoute, on avance |
| 9 | **Séance qui s'allonge** | « Juste un exercice de plus » : la promesse des 5 min est trahie, la confiance aussi | 5 min fixes, le bonus reste facultatif et rare |
| 10 | **Lire pendant qu'on fait** | Consignes longues à l'écran pendant l'exercice : on décroche ou on fait mal | 1 ligne + voix de guidage + vibrations |

Bonus à surveiller : **proposer un rattrapage** (« 2 séances pour compenser ») transforme une pause en dette. Jamais.

---

## 8. À couper de la V1 (YAGNI)

| Fonctionnalité séduisante | Pourquoi on coupe | Quand y revenir |
|---|---|---|
| Anglais / espagnol | Double le contenu à produire avant d'avoir validé l'habitude | Après 60 jours pratiqués. Prévoir juste une étiquette « langue » sur chaque contenu. |
| Analyse automatique de la voix (débit, « euh », transcription) | Complexe, imprécis, et ça juge | V2 si Fred le réclame après 3 mois |
| Caméra ou miroir pour la posture | Permission de plus, gêne, poids | Jamais en V1 |
| Coach IA, retours générés | Coût, latence, dépendance au réseau, bruit | V2 éventuelle |
| Notifications web | Peu fiables sur Android, déjà tranché | Non |
| Compte, synchro cloud | Données locales décidées, rien à synchroniser | Non |
| Personnaliser durée et exercices | Paramétrage infini (piège 4) | Non |
| Journal ou notes après séance | Charge d'écriture, abandon assuré | Non |
| Statistiques, graphiques | Du bruit, et ce que l'écran Progression n'affiche volontairement pas (§4) | Non |
| Partage, social, classement | Hors sujet, comparaison toxique | Non |
| Bibliothèque d'exercices à parcourir | Ça crée du choix (piège 5) | Non |
| Thèmes de couleurs | Configuration inutile | Non |
| Rappel intelligent qui s'adapte | Complexe, l'alarme fixe suffit | Non |
| Plusieurs textes témoins | Brouille la comparaison | Non |

**Gardé malgré l'envie de couper** : « Garder une copie de ma voix J1 » dans les réglages. Si le téléphone vide le stockage du navigateur, la référence J1 disparaît et tout le mécanisme de progression tombe. Une ligne dans les réglages, et le dev doit demander le stockage persistant.

---

## 9. Relecture en avocat du diable

| Gravité | Problème | Correction appliquée ou à trancher |
|---|---|---|
| **Grave** | L'alarme Android n'ouvre pas une PWA toute seule, et une page web ne peut probablement pas créer l'alarme. | Scénario réaliste décrit en §1 (alarme + icône raccourci). **Le dev doit vérifier ça en premier.** |
| **Grave** | Perte possible des enregistrements si le stockage du navigateur est vidé. | Stockage persistant + copie J1 manuelle. |
| **Moyen** | La comparaison J1 / J30 est subjective : risque d'entendre « rien » et de décrocher. | Messages honnêtes (« c'est normal à ce stade »), texte témoin fixe, retour terrain après les vrais RDV. |
| **Moyen** | Le contenu est le vrai chantier : environ 30 textes d'articulation, 40 phrases d'écoute, 10 scripts de posture, 10 échauffements. Sans ça, la nouveauté s'épuise en 2 semaines. | Minimum pour lancer : 14 jours de contenu, qui tournent ensuite. |
| **Moyen** | La voix de synthèse du téléphone peut sonner robotique, et c'est elle qui dit les phrases d'écoute. | Acceptable en V1. Si ça gêne, enregistrer soi-même ou faire enregistrer une dizaine de phrases. |
| **Moyen** | Ce projet perso prend du temps sur le cash. | Viser une V1 faisable en un week-end de dev, pas plus. Tout le reste attend. |
| **Léger** | Seuil de 60 s peut-être trop bas : risque de faire 1 minute par jour pendant des semaines. | Assumé : l'habitude d'abord. À revoir à J30 si les séances complètes sont rares. |

---

**Prochaine action unique** : faire vérifier par le dev, avant tout le reste, comment l'alarme Android et l'icône raccourci de la PWA s'enchaînent sur le téléphone de Fred. Tout le déclencheur quotidien en dépend.
