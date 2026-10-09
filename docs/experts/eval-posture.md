# Mesurer la posture et la présence : ce que le téléphone peut dire, et ce qu'il ne peut pas dire

> Binôme : vision par ordinateur embarquée (navigateur mobile) + coach présence et langage corporel en rendez-vous.
> Vérifié en ligne le **09/10/2026** (registre npm, fichiers des modèles, documentation Google, études citées). Aucun code : des choix.
> Périmètre : exercices de posture **assis**, téléphone posé, 30 à 120 s (P01, P03-P06, P09, P11, P14, P17, P18, P20, P22-P24). Les exercices debout (P02, P13) restent hors mesure.

---

## 0. Les décisions en 10 lignes

| Sujet | Décision |
|---|---|
| **Mesure n° 1** | **Les silences, par le micro, sans caméra** : silence tenu après une question, délai avant de répondre, durée de parole. Fiable, gratuit, utile tout de suite |
| **Mesure n° 2** | **Où pointe la tête** (gauche / centre / droite) et **phrase finie sur une zone** (tête + micro) |
| **Mesure n° 3** | **Tête posée ou agitée**, aux seuls moments qui comptent (pause, silence) |
| **Mesure n° 4 (sous condition)** | **Mains visibles / main près du visage**, seulement si le test sur le téléphone de Fred passe |
| Moteur | **MediaPipe Tasks Vision**, version épinglée et **auto-hébergée**. Face Landmarker (3,8 Mo) + Pose Landmarker lite (5,8 Mo) + moteur WASM (13 Mo) : **environ 22,5 Mo**, téléchargés une seule fois, sur demande |
| Calcul | Délégué « GPU » (WebGL2), repli CPU. **10 à 15 images/s suffisent**. Caméra coupée dès la fin de l'exercice |
| Confidentialité | Aucune image enregistrée, aucun point du visage stocké : **seulement une dizaine de chiffres par séance**. Zéro requête réseau pendant l'exercice |
| Affichage | **Après** l'auto-évaluation 1 tap, jamais pendant. Des faits (« 6 s sur 8 »), pas de score, pas de rouge |
| Interdit | Aucun chiffre de « confiance », « charisme », « présence », « émotion » ou « stress ». Ça ne se mesure pas |
| Préalable | **Un test d'une heure sur le téléphone de Fred** (§8) avant d'écrire une ligne de la partie caméra |

---

## 1. D'abord, une contradiction à trancher

Deux documents existants disent l'inverse de cette demande :

| Document | Ce qu'il dit | Pourquoi c'était juste |
|---|---|---|
| `expert-ux.md` §8 | « Caméra ou miroir pour la posture : **jamais en V1** » | Permission de plus, gêne, poids |
| `expert-ux.md` §7, piège 7 | « **Note automatique** de la voix » interdite | Un score faussement précis nourrit le perfectionnisme |
| `expert-tech.md` §0 | « **Zéro dépendance** à l'exécution » | Simplicité, pas de build |

**Position du binôme :**
- Les **mesures audio** (silences, délais) ne contredisent rien : ce sont des chronos, pas des notes. Elles peuvent entrer **dès la V1**, sans caméra ni dépendance.
- La **caméra** devient un **mode « séance mesurée », facultatif**, qui ne s'ouvre qu'après validation de l'habitude (par exemple à partir de la semaine 5, ou après 20 jours pratiqués). Ça reste cohérent avec « jamais en V1 » si on l'appelle V1.5.
- MediaPipe est **une dépendance assumée**, isolée dans un module chargé à la demande. Le cœur de l'appli reste sans dépendance.

👉 **Décision à prendre par Fred** : accepter ce mode facultatif, ou rester audio seul.

---

## 2. Ce qu'on peut mesurer objectivement (question 1)

Échelle de fiabilité, dans de bonnes conditions (lumière de face, téléphone stable) : ★★★ solide · ★★ correcte avec étalonnage · ★ fragile · ✗ à ne pas faire.

### 2.1 Vue d'ensemble

| # | Mesure | Ce qu'elle mesure **vraiment** | Validité | Biais principaux | Fiabilité |
|---|---|---|---|---|---|
| M1 | **Silence tenu après une question** (micro) | Le temps entre la fin de **ta** voix et ta prochaine prise de parole (ou le bip) | Directe : c'est exactement la consigne (P04, P14, P22, P23, P24) | Bruit de fond (frigo, rue), son de l'appli capté par le micro | ★★★ |
| M2 | **Délai avant de répondre** (micro) | Le temps entre la fin de la question lue par l'appli et ton premier son | Directe pour P03 (la pause de 2 s). Un « euh » compte comme une prise de parole, et c'est voulu | Souffle ou raclement de gorge pris pour de la parole | ★★★ |
| M3 | **Durée de parole** (micro) | Le temps où ta voix est active | Directe pour P18 (le cas en 60 s) | Mêmes bruits que M1 | ★★★ |
| M4 | **Direction de la tête, 3 zones** (caméra) | L'orientation de la tête (rotation gauche-droite), **pas celle des yeux** | Bonne en réunion : la tête suffit à trouver la cible de l'attention dans environ 89 % des cas (étude à 4 personnes) | Si les 3 objets sont trop proches, tu bouges les yeux sans tourner la tête. Au-delà de 30-50°, MediaPipe sous-estime l'angle | ★★ (avec étalonnage) |
| M5 | **Phrase finie sur une zone** (caméra + micro) | À la fin de chaque phrase, la tête était-elle stable sur une zone depuis au moins 0,5 s ? | Bonne approximation de P05 (« finis chaque phrase sur lui ») | Hérite des biais de M4 et M1 | ★★ |
| M6 | **Tête posée / agitée** (caméra) | Les déplacements de la tête dans l'image, une fois le tremblement de mesure retiré | Bonne pour « immobile pendant la pause » (P03, P22, P23). Ne dit rien du buste sous la table | **Téléphone posé sur la même table** : chaque geste fait bouger l'image. Faible lumière = plus de tremblement apparent | ★★ (si le téléphone est stable) |
| M7 | **Hochements de tête** (caméra) | Petites oscillations verticales de la tête | Correcte pour P09 (petits signes d'écoute) | Confusion avec un rire ou une toux | ★★ |
| M8 | **Mains visibles** (caméra) | Les poignets et les doigts sont-ils détectés dans le bas de l'image ? | Moyenne : des mains posées à plat, vues de face au bord du cadre, sont un cas difficile pour les modèles | Cadrage (bord de table hors champ), manches sombres, table sombre | ★ à ★★ (à tester) |
| M9 | **Main près du visage** (caméra) | Une main **devant** le visage dans l'image, pas forcément **sur** le visage | Faible : une caméra unique ne voit pas la profondeur. Un geste devant soi passe pour un « toucher » | Profondeur, et le visage caché fait perdre le suivi | ★ |
| M10 | **Épaules : inclinaison et élévation** (caméra) | L'angle de la ligne des épaules et leur distance aux oreilles, **comparés à ton propre début de séance** | Faible en absolu (environ 8° d'erreur sur l'épaule face à la capture de mouvement), correcte en relatif | Téléphone pas droit (corrigible avec l'accéléromètre), veste épaisse, cadrage | ★ en absolu, ★★ en relatif |
| M11 | **Sourire au début et à la fin** (caméra) | Le coefficient « coins de bouche tirés » (mouthSmileLeft/Right) du Face Landmarker | **Non validée** : aucune étude ne compare ces coefficients au codage FACS du sourire (AU12). Pendant la parole, la bouche bouge et fausse tout | Barbe, lunettes, éclairage ; et un « sourire d'excuse » (que P21 veut justement éviter) compte comme un sourire | ★ |
| M12 | **Direction des yeux** (iris) | La position de l'iris dans l'œil | Insuffisante à 80 cm avec une caméra frontale : quelques degrés d'erreur suffisent à confondre deux personnes | Lunettes, reflets, paupières | ✗ |

### 2.2 Ce que le coach en retient

- **Le silence est la mesure la plus utile et la plus fiable.** C'est le cœur du piège de Fred (combler, se justifier, ajouter un argument). Il est présent dans **8 exercices sur 24** (P03, P04, P14, P18, P22, P23, P24, et P09 pour la pause avant la question).
- **La direction de la tête suffit** pour la répartition entre 3 personnes. Les yeux suivent la tête dans une conversation à plusieurs ; vouloir mesurer les yeux, c'est une fausse précision.
- **Regarder ailleurs en réfléchissant est normal et utile** : détourner le regard améliore les réponses difficiles (Glenberg, 1998 ; Doherty-Sneddon, 2005). Donc **on ne mesure pas le regard pendant la pause de 2 s** (P03), seulement l'immobilité.
- **L'agitation n'est pas un défaut en soi chez un TDAH** : chez les enfants TDAH, bouger davantage va avec de meilleures performances de mémoire de travail (Sarver et al., 2015 ; Hartanto et al., 2016). Les études portent sur des enfants, mais le principe tient : **on ne mesure l'immobilité qu'aux moments où la consigne la demande**, jamais sur tout l'exercice.
- **Le sourire ne vaut pas le coût.** Non validé, faussé par la parole, et ambigu (le sourire d'accueil de P13 est voulu, le sourire d'excuse de P21 est à éviter). Hors V1.

---

## 3. Faisabilité 2026 sur Chrome Android (question 2)

### 3.1 MediaPipe Tasks Vision : l'état réel au 09/10/2026

| Élément | Vérifié | Source |
|---|---|---|
| Paquet | `@mediapipe/tasks-vision`, licence Apache-2.0. **1.1.0** publiée le 06/10/2026 (il y a 3 jours) ; **1.0.1** du 31/07/2026 ; passage en 1.x le 28/07/2026 | registre npm |
| Moteur WASM (SIMD) | **13,0 Mo** en 1.1.0 (11,8 Mo en 1.0.1) ; une variante sans SIMD existe (12,2 Mo) | liste des fichiers jsDelivr |
| Accélération | Option `delegate` : **« CPU » ou « GPU » seulement**. Le GPU passe par **WebGL2** ; aucune option WebGPU n'est exposée pour les tâches de vision | `vision.d.ts` 1.1.0, doc MPImage |
| WebGPU sur Android | Actif par défaut depuis Chrome 121 (Android 12+, GPU Qualcomm et ARM), mais **MediaPipe Vision ne s'en sert pas** : question sans objet | blog Chrome |

**Poids des modèles** (taille exacte des fichiers, vérifiée par requête sur le serveur Google) :

| Modèle | Poids | Ce qu'il donne | Utile ici ? |
|---|---|---|---|
| Face Landmarker | **3,8 Mo** | 478 points du visage, 52 coefficients d'expression, **matrice de pose de la tête** | ✅ M4 à M7 |
| Pose Landmarker **lite** | **5,8 Mo** | 33 points du corps, dont épaules, poignets, index, pouces, avec un indice de visibilité | ✅ M8 à M10 (sous condition) |
| Pose Landmarker full / heavy | 9,4 / 30,7 Mo | Même chose, plus précis, plus lent | ❌ inutile pour des mouvements lents |
| Hand Landmarker | 7,8 Mo | 21 points par main | ❌ la Pose lite donne déjà poignet, index et pouce |
| Holistic Landmarker | 13,7 Mo | Visage + corps + mains en un seul modèle | ❌ plus lourd que Face + Pose lite |
| Face Detector (BlazeFace) | 0,23 Mo | Un rectangle autour du visage | ❌ pas d'orientation de la tête |

**Total V1 : 13,0 + 3,8 + 5,8 = environ 22,5 Mo** (16,8 Mo sans la mesure des mains). Une seule fois, en Wi-Fi, sur demande.

**Images par seconde (fps) : ce qu'on sait, et ce qu'on ne sait pas**
- Mesures publiques sur un téléphone de milieu de gamme (Pixel 5, 2020), environnement MediaPipe web : **BlazePose lite 32 fps, full 22 fps** (blog TensorFlow, 2021). Un milieu de gamme 2024-2026 fait au moins aussi bien.
- **Aucune mesure publique récente** du Face Landmarker web sur Android. En natif, sur un Pixel 9 Pro, il prend entre 11 et 70 ms selon les cas (ticket GitHub n° 5872). Un autre ticket signale un GPU qui ne s'active pas toujours sur le web (n° 4998).
- **Besoin réel : 10 à 15 fps.** Les mouvements utiles (tourner la tête, hocher, poser les mains) durent tous plus de 0,2 s. On traite une image sur deux ou trois : ça laisse une marge large, et ça économise la batterie.
- 👉 **Chiffre à mesurer sur le téléphone de Fred**, pas à supposer (§8).

**Batterie et chaleur**
- Une séance mesurée, c'est **30 à 120 s** de caméra + calcul. Les études sur l'inférence continue montrent une montée en température puis un ralentissement **après plusieurs minutes** (moins de 6 min pour un gros modèle de langage, dans le pire cas). Deux minutes à 10-15 fps restent en dessous.
- Pas de chiffre de consommation fiable publié pour ce cas précis. Ordre de grandeur raisonnable : une séance coûte bien moins qu'un appel vidéo, qui fait le même travail (caméra + traitement d'image) pendant 30 min.
- Règles : résolution 640 × 480, 10-15 fps traités, **caméra et modèles fermés dès la fin de l'exercice** (Google insiste : sans `close()`, la mémoire gonfle).

**Hors ligne**
- **Auto-héberger** le WASM et les modèles sur GitHub Pages, à côté de l'appli. Ne **jamais** les charger depuis jsDelivr ou les serveurs Google au moment de l'exercice : chaque appel dirait à un tiers « Fred fait un exercice maintenant ».
- Les mettre dans un **cache séparé**, par exemple `vision-1.0.1`, **pas** dans la liste `ASSETS` du service worker. Raison précise : `expert-tech.md` §5 supprime tous les caches `diction-*` à chaque déploiement. Si les 22 Mo y étaient, ils seraient retéléchargés à chaque mise à jour. Un cache `vision-*` n'est pas touché par cette règle.
- Téléchargement **au premier tap sur « Activer la mesure »**, avec la taille annoncée, puis demande de stockage persistant pour éviter qu'Android ne l'efface.
- **Épingler une version exacte.** Aujourd'hui : **1.0.1** (deux mois de recul). La 1.1.0 n'a que 3 jours.

### 3.2 Les alternatives

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| **MediaPipe Tasks Vision** | Visage + pose de la tête + corps, maintenu par Google, Apache-2.0, fonctionne hors ligne une fois en cache | 13 Mo de WASM, une dépendance | ✅ **Retenu** |
| TF.js + MoveNet Lightning | Rapide (34 fps sur Pixel 5 en WebGL, 2021) | **17 points du corps seulement** : ni visage, ni orientation de la tête. Il faudrait ajouter TF.js + un modèle de visage : plus lourd au total | ❌ |
| TF.js face-landmarks-detection | Même maillage de visage | C'est le modèle MediaPipe emballé dans TF.js : plus lourd, moins maintenu | ❌ |
| API Shape Detection (`FaceDetector` de Chrome) | Zéro téléchargement, utilise le détecteur d'Android | **Toujours expérimental**, derrière un drapeau de Chrome ; pas d'orientation de la tête | ❌ |
| ONNX Runtime Web (WebGPU) | Accès à WebGPU | Il faut choisir, convertir et valider ses propres modèles : un projet en soi | ❌ |
| **Web Audio seul** (AnalyserNode) | Natif, zéro octet, zéro dépendance, très fiable pour les silences | Ne voit rien | ✅ **Retenu pour M1-M3** |

### 3.3 Confidentialité : ce qui se passe concrètement

| Étape | Ce qui existe | Durée de vie |
|---|---|---|
| Image de la caméra | En mémoire, analysée puis jetée | Quelques millisecondes |
| Points du visage et du corps | En mémoire, transformés en quelques mesures (angle, déplacement) | Une image |
| Ce qui est stocké | **Une dizaine de chiffres par exercice** : par exemple « silences : 6,2 / 8,0 / 7,9 s ; zones : 30 / 45 / 25 % ; phrases finies sur une zone : 4 sur 6 » | Dans IndexedDB, comme le reste |
| Vidéo | **Jamais enregistrée.** Aucun MediaRecorder sur la piste vidéo, aucune capture d'image | — |

- **Aucun point du visage n'est stocké.** La géométrie d'un visage peut servir à identifier quelqu'un ; des moyennes de rotation de la tête, non.
- **Preuve à faire une fois** : mode avion, exercice complet, et l'onglet réseau du débogage à distance de Chrome doit rester vide.
- **AI Act, pour mémoire** : l'article 5(1)(f) interdit d'inférer les émotions au travail et en formation, mais exclut l'entraînement personnel. Ici on n'infère **aucune émotion** : garder cette ligne si l'outil sert un jour à d'autres personnes.

---

## 4. Ce qu'on ne peut PAS mesurer, franchement (question 3)

| Ce qu'on aimerait chiffrer | Pourquoi c'est impossible de façon fiable |
|---|---|
| **Confiance, charisme, présence** | Ce sont des **impressions chez l'autre**, pas des propriétés de ton corps. Dans les meilleures études d'entretiens filmés, l'ensemble des signaux non verbaux mesurés automatiquement explique **au mieux 34 à 36 %** des écarts d'impression des recruteurs, et **c'est la voix qui pèse le plus** (Nguyen et al., 2014 et 2015). Un téléphone posé, seul, sans interlocuteur, en mesure encore moins. |
| **Émotions** (stress, nervosité, joie, sincérité) | Un mouvement du visage ne permet pas de déduire une émotion de façon fiable : cela dépend du contexte, de la personne, de la culture (Barrett et al., 2019, revue de plus de 1 000 études). HireVue a retiré l'analyse faciale de ses entretiens vidéo en 2020-2021, faute d'apport. |
| **Anxiété d'après l'agitation ou les mains sur le visage** | Se toucher le visage ou bouger n'est pas un signe fiable de stress ou de mensonge : les résultats se contredisent d'une étude à l'autre. Chez un TDAH, bouger aide parfois à se concentrer. |
| **Contact visuel réel** | Le téléphone ne sait pas si tes yeux rencontrent ceux d'une personne (imaginaire ou réelle). Il voit seulement où pointe ta tête. |
| **« Bonne posture » dans l'absolu** | Il n'existe **pas de norme validée** de posture assise en rendez-vous. On compare Fred à **Fred**, en début de séance et d'une séance à l'autre, jamais à une norme. |
| **L'effet de la posture sur toi** | Les « postures de pouvoir » ne changent ni les hormones ni les comportements (réplication de Ranehill et al., 2015 ; analyse de Simmons et Simonsohn, 2017). Seul le **sentiment** de puissance bouge un peu, et le débat continue. Ne jamais promettre « tiens-toi droit et tu seras plus convaincant ». |
| **Le lien avec tes signatures** | Rien ne prouve qu'un meilleur score de silence fasse signer plus. Le seul vrai résultat reste **le terrain** : décision obtenue ou non (§5.3). |
| **Les vrais rendez-vous** | Filmer un prospect sans son accord est exclu (RGPD, et confiance). La mesure reste à l'entraînement. |

---

## 5. Si la caméra est trop lourde : trois alternatives (question 4)

### 5.1 L'auto-vidéo de 20 s, relue avec une grille

| Étape | Détail | Pourquoi |
|---|---|---|
| 1. Prédire | Avant de voir, 1 tap : « Tu penses avoir tenu le silence ? Oui / Pas sûr / Non » | La préparation cognitive améliore une auto-évaluation qui sinon reste trop sévère (Harvey et al., 2000) |
| 2. Regarder **une fois** | « Regarde-toi comme si c'était un inconnu » | Même étude : on se juge alors avec moins de distorsion |
| 3. Cocher 4 cases | Oui / non, des **faits visibles** : mains sur la table ? silence tenu jusqu'au bip ? tête posée sur une personne en fin de phrase ? aucune phrase ajoutée après le non ? | Des critères binaires et observables varient moins qu'une impression globale |
| 4. Effacer | La vidéo est jetée automatiquement, jamais stockée | Ni archive à ressasser, ni donnée sensible |

- **Coût** : nul (caméra native du navigateur), aucun modèle.
- **Limite** : ça reste ton regard sur toi. Et la vidéo, c'est le miroir que redoute l'UX : **une fois par semaine au plus**, sur un exercice déjà réussi à l'oreille.

### 5.2 L'évaluation par un tiers

- Un pair joue le prospect 10 min (P14 puis P23, par exemple) avec **une carte de 4 critères oui/non**, les mêmes que ci-dessus.
- Le tiers ne note pas « la présence » : il **coche des faits**. Il répond aussi à **une** question d'impression : « Tu as eu envie de lui dire oui ? »
- **C'est la seule façon de mesurer l'effet sur l'autre.** Une fois par mois suffit.

### 5.3 Les indicateurs terrain (les seuls qui parlent du but)

Après un vrai rendez-vous, l'écran « retour terrain » existe déjà (`expert-ux.md` §3.4, 1 tap sur le ressenti). Proposition : **une question factuelle de plus, qui tourne**, toujours en 1 tap :

| Question | Réponse | Ce qu'elle mesure |
|---|---|---|
| « Tu as posé le cadre, durée et budget compris ? » | Oui / Non | Semaine 7 appliquée |
| « Après ta question de conclusion, tu as tenu le silence ? » | Oui / Non | Semaine 12 appliquée |
| « Fini à l'heure prévue ? » | Oui / Non | Semaine 10 appliquée |
| « Tu repars avec un oui, un non ou une date ? » | Oui / Non / Date / Rien | **Le résultat**. « Je vais y réfléchir » = Rien |

---

## 6. Recommandation V1 (question 5)

### 6.1 Classement

| Rang | Mesure | Utilité | Fiabilité | Coût | Exercices |
|---|---|---|---|---|---|
| **1** | **Silences et délais** (M1 + M2 + M3), micro seul | ★★★ | ★★★ | **0 Mo**, aucune dépendance | P03, P04, P09, P14, P18, P22, P23, P24 |
| **2** | **Zones de la tête + phrase finie sur une zone** (M4 + M5) | ★★★ | ★★ | 16,8 Mo (WASM + Face) | P05, P11, P14, P15, P20 |
| **3** | **Tête posée aux moments clés** (M6), plus les hochements en bonus (M7) | ★★ | ★★ | **0 Mo de plus** (même modèle que le rang 2) | P01, P03, P09, P22, P23 |
| **4** *(sous condition)* | **Mains visibles / près du visage** (M8 + M9) | ★★ | ★ à ★★ | +5,8 Mo (Pose lite) | P06, P14, P17, P22, P23 |

**Écartés de la V1** : épaules (M10, à revoir en V2 en relatif sur P01 et P10), sourire (M11), yeux (M12).

### 6.2 Protocole commun (une fois par séance mesurée, 10 s au plus)

| Point | Consigne |
|---|---|
| **Téléphone** | En **portrait**, sur un **support** (pas à plat, pas calé contre une tasse), à environ **un bras de distance (70-90 cm)**, objectif à hauteur de poitrine. Si possible, pas sur la table où tu fais tes gestes |
| **Cadre** | Écran de cadrage de 5 s maximum, avec une silhouette : **tête en haut, bord de table en bas**. Puis l'écran s'éteint ou n'affiche que la consigne |
| **Lumière** | Fenêtre ou lampe **devant toi**, jamais derrière. Pas de pièce sombre |
| **Les 3 « personnes »** | 3 objets : un **juste derrière le téléphone** (centre), deux à gauche et à droite, **à environ 30-40° chacun** (comme deux personnes en bout de table). Plus loin, l'angle mesuré sature ; plus près, tu ne tournes plus la tête |
| **Étalonnage** | La voix dit « regarde à gauche… au centre… à droite » (2 s chacun), puis « reste immobile 3 s ». L'appli apprend tes 3 directions et le bruit de mesure de ta tête immobile |
| **Contrôle qualité** | Si le visage est perdu sur plus de 10 % de l'exercice, ou si le téléphone a bougé (accéléromètre), l'appli affiche « **Pas de mesure fiable aujourd'hui (lumière ou cadrage)** » et rien d'autre |

### 6.3 Détail des 4 mesures

**Rang 1 : silences et délais (micro seul)**
- **Algorithme** : toutes les 20 ms, on calcule l'énergie du son du micro, comparée au bruit de la pièce mesuré pendant la seconde qui précède. Au-dessus du seuil pendant au moins 150 ms, c'est de la parole ; un trou d'au moins 300 ms, c'est un silence. Les moments où l'appli joue un son (question lue, bip) sont connus et exclus.
- **Ce qu'on en tire** : silence après ta question (P04, P14, P23 : « 8 s tenues ? ») ; délai avant ta réponse (P03 : « 2 s ? ») ; durée de parole (P18 : « 60 s ? ») ; **« comblé »** = tu as reparlé avant le bip (P22, P24).
- **Protocole** : rien de plus que l'existant. Pièce calme ; annulation d'écho activée sur le micro.
- **Affichage honnête** : « Silence après la question : **7,9 s** · 8,1 s · 4,2 s (tu as repris avant le bip). » Cible atteinte = la petite animation habituelle, sinon rien. **Pas de moyenne, pas de pourcentage, pas de couleur.**

**Rang 2 : zones de la tête et phrase finie sur une zone**
- **Algorithme** : la matrice de pose du Face Landmarker donne la rotation gauche-droite de la tête ; chaque image est rangée dans la zone étalonnée la plus proche, à condition d'y rester au moins 300 ms (sinon « en transit »). À chaque fin de phrase repérée par le micro, on vérifie que la tête était stable sur une zone depuis au moins 0,5 s.
- **Protocole** : objets placés comme au §6.2, étalonnage obligatoire à chaque séance (tu ne poses jamais le téléphone exactement au même endroit).
- **Affichage honnête** : « Gauche 30 % · Centre 45 % · Droite 25 %. Phrases finies sur quelqu'un : **4 sur 6**. » Avec la mention fixe, en petit : « *Direction de la tête, pas des yeux.* » Pour P11 : « Phrases adressées à la zone de la collaboratrice : 2. »

**Rang 3 : tête posée aux moments clés**
- **Algorithme** : position de la tête (translation de la même matrice), filtrée pour retirer le tremblement de mesure, rapportée à la largeur du visage ; on compte une « seconde posée » quand le déplacement reste sous le bruit mesuré à l'étalonnage, majoré d'une marge. **Calcul limité aux fenêtres de la consigne** : la pause de 2 s, le silence après la question ou après le non. Les images où l'accéléromètre signale que le téléphone bouge sont écartées.
- **Bonus P09** : un hochement = une oscillation verticale de la tête de quelques degrés, en moins d'une seconde. On les compte, sans jugement.
- **Affichage honnête** : « Pendant les silences : tête posée **3 fois sur 3**. » Pour P09 : « 5 hochements, 2 "d'accord". » **Aucun chiffre sur le reste de l'exercice.**

**Rang 4 (sous condition) : mains**
- **Algorithme** : avec la Pose lite, une main est « visible » quand son poignet et son index ont un indice de visibilité correct et sont dans le tiers bas de l'image. « Près du visage » = un point de la main à moins d'une largeur de visage du centre du visage, pendant au moins 0,5 s.
- **Condition d'entrée** : au test (§8), mains posées à plat sur la table, détectées sur **au moins 90 % des images**. Sinon, la mesure est abandonnée sans regret.
- **Affichage honnête** : « Mains visibles pendant le cadre (P14) : oui. Main **devant** le visage : 2 fois (0:42, 1:15). » Toujours « devant », jamais « sur » : la caméra ne voit pas la profondeur.

---

## 7. Garde-fous (question 6)

### 7.1 Contre l'effet « miroir » anxiogène
- **Pas de vidéo de soi pendant l'exercice.** Un cadrage de 5 s, puis écran noir ou consigne seule. Se regarder pendant qu'on parle déplace l'attention vers soi, exactement ce qu'un rendez-vous ne doit pas faire.
- **Aucune alerte en direct** (« tu bouges », « regarde à droite »). Une alerte pendant l'exercice, c'est une interruption, et pour un TDAH une interruption fait perdre le fil.
- **L'auto-évaluation 1 tap passe AVANT les chiffres.** Ton jugement d'abord, la mesure ensuite : c'est la logique de la préparation cognitive de Harvey et al.
- **Deux lignes de résultats au maximum**, puis l'écran de fin habituel.

### 7.2 Contre la fatigue et l'hyperfocalisation
- **Séance mesurée = facultative**, une séance de posture sur trois au plus, un seul exercice mesuré par jour.
- **Si l'installation (support, lumière) prend plus de 30 s, tu arrêteras.** Les mesures audio n'ont besoin d'aucune installation : elles tournent toujours, la caméra reste l'option.
- **Des cibles « suffisantes », pas des records** : 8 s de silence, c'est réussi, 15 s n'est pas mieux. Sinon tu optimises le chiffre au lieu de la présence (loi de Goodhart), par exemple en fixant un objet de façon rigide.
- **Pas de courbe ni de statistique** (cohérent avec `expert-ux.md` §8). À la place, un jalon toutes les 10 séances mesurées, sur le modèle des jalons audio : « Séance 1 : 2 silences tenus sur 3. Séance 10 : 3 sur 3. »
- **Agitation hors des moments clés : ni mesurée, ni affichée.**
- **Critère d'arrêt** : si en 3 semaines les « Pas encore » augmentent, ou si tu sautes davantage les exercices de posture, **la caméra s'éteint** et on revient à l'audio seul.

### 7.3 Ce qu'il ne faut jamais prétendre (mots bannis de l'interface)

| Jamais | À la place |
|---|---|
| « Score de présence », « confiance 72 % », « charisme » | Des faits : secondes, nombres, zones |
| « Tu avais l'air stressé / nerveux / pas sincère » | Rien. Aucune émotion n'est mesurée |
| « Contact visuel » | « Direction de la tête » |
| « Tu t'es touché le visage » | « Main devant le visage » |
| « Bonne / mauvaise posture », « posture parfaite » | « Comme au début de la séance » / « différent du début » |
| « Les meilleurs commerciaux font… » | Aucune comparaison à une norme, seulement Fred face à Fred |
| « Tu inspires confiance avant même de parler » (texte prévu dans `expert-ux.md` §3.2) | Le reformuler en intention, sans promesse : « Posé avant de parler, tu parles mieux. » |

---

## 8. Le test d'une heure, avant de coder la caméra

Sur **le téléphone de Fred**, avec une page de test jetable :

| Test | Critère de réussite | Si ça échoue |
|---|---|---|
| Face Landmarker, GPU, 640 × 480 | ≥ 15 fps stables pendant 2 min, téléphone à peine tiède | Essayer le CPU ; sinon, **audio seul** |
| GPU réellement actif | Les fps chutent nettement si on force le CPU | Rester en CPU s'il suffit |
| 3 zones à ±35° | 10 regards demandés, 10 bien classés | Écarter davantage les objets ; sinon abandonner M4-M5 |
| Tête immobile 10 s, puis 5 petits mouvements | Les 5 détectés, aucune fausse alerte pendant les 10 s | Revoir le seuil ou abandonner M6 |
| Mains à plat sur la table (Pose lite) | Détectées sur ≥ 90 % des images | **Abandonner M8-M9**, sans regret |
| Mode avion | Exercice complet, zéro requête réseau | Corriger le chargement des fichiers |

---

## 9. Relecture en avocat du diable

**Graves**
1. **Les fps et la batterie ne sont pas mesurés sur le vrai téléphone.** Les seuls chiffres publics datent de 2021 (Pixel 5). → Le test du §8 n'est pas facultatif.
2. **La précision de la direction de la tête repose sur peu de données** : une étude clinique à un seul participant (11° d'erreur moyenne en rotation gauche-droite, et l'angle sature au-delà de 30-50°). → L'étalonnage par séance et les objets à 30-40° sont obligatoires, pas du confort.
3. **Rien ne prouve que ces mesures améliorent les vrais rendez-vous.** → Le juge final reste le terrain (§5.3) : « oui, non ou date ».

**Moyens**
4. La caméra **contredit deux décisions existantes** (caméra hors V1, zéro dépendance). → À trancher par Fred (§1) ; d'ici là, seul l'audio est sans risque.
5. **22,5 Mo et l'installation d'un support** pour un TDAH à faible endurance d'exécution : vrai risque d'abandon. → Caméra facultative, audio par défaut.
6. Les **mains** sont la mesure la plus incertaine. → Placée sous condition, avec un critère d'abandon chiffré.

**Légers**
7. Document long. → Pour décider, les §0 et §6.1 suffisent.

---

## Sources

**MediaPipe et navigateur**
- Registre npm, `@mediapipe/tasks-vision` (versions, dates, licence), consulté le 09/10/2026 : https://www.npmjs.com/package/@mediapipe/tasks-vision
- Fichiers du paquet 1.1.0 (taille du WASM, `vision.d.ts`, option `delegate`) : https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/
- Fichiers des modèles (taille vérifiée par requête) : https://storage.googleapis.com/mediapipe-models/ (`face_landmarker`, `pose_landmarker_lite/full/heavy`, `hand_landmarker`, `holistic_landmarker`, `blaze_face_short_range`)
- Guide Pose Landmarker : https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- Guide Face Landmarker web (blendshapes, matrice de transformation) : https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- MPImage et exigence WebGL2 : https://developers.google.com/edge/api/mediapipe/js/tasks-vision.mpimage
- Fiche du modèle BlazePose (hors champ : tête non visible, plus de 4 m, plusieurs personnes) : https://developers.google.cn/static/ml-kit/images/vision/pose-detection/pose_model_card.pdf
- Article BlazePose (suivi du haut du corps seul) : https://arxiv.org/abs/2006.10204
- BlazePose et TF.js, fps sur Pixel 5 (2021) : https://blog.tensorflow.org/2021/05/high-fidelity-pose-tracking-with-mediapipe-blazepose-and-tfjs.html
- MoveNet et TF.js, fps sur Pixel 5 (2021) : https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html
- Google, « 7 dos and don'ts » de MediaPipe sur le web (cache, `close()`, taille de modèle) : https://developers.googleblog.com/en/7-dos-and-donts-of-using-ml-on-the-web-with-mediapipe/
- Ticket GPU non activé sur le web : https://github.com/google-ai-edge/mediapipe/issues/4998
- Ticket Face Landmarker lent sur Android (Pixel 9 Pro, 11-70 ms) : https://github.com/google-ai-edge/mediapipe/issues/5872
- WebGPU dans Chrome 121 pour Android : https://developer.chrome.com/blog/new-in-webgpu-121
- API Shape Detection (statut expérimental) : https://developer.chrome.com/docs/capabilities/shape-detection
- Web Audio, AnalyserNode : https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
- Accéléromètre, événement devicemotion : https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event
- Chaleur et ralentissement en inférence continue (« Play It Cool ») : https://arxiv.org/pdf/2206.10849

**Validité des mesures**
- Hammadi et al. (2022), têtes suivies par MediaPipe face à la capture de mouvement, *Sensors* : https://pmc.ncbi.nlm.nih.gov/articles/PMC9502716/
- Stiefelhagen et Zhu (2002), orientation de la tête et direction du regard en réunion : https://ri.cmu.edu/publications/head-orientation-and-gaze-direction-in-meetings
- Stiefelhagen (2002), suivi de l'attention en réunion : https://ri.cmu.edu/?p=8568
- BlazePose face à OptiTrack, angles du membre supérieur : https://revistas.udc.gal/index.php/JA_CEA/article/download/13777/9845/57840
- Glenberg et al. (1998), détourner le regard aide à se souvenir, *Memory & Cognition*, DOI 10.3758/bf03211385
- Doherty-Sneddon et Phelps (2005), détournement du regard et difficulté : https://researchportal.northumbria.ac.uk/en/publications/gaze-aversion-a-response-to-cognitive-or-social-difficulty/
- Graziano et al. (2018), reprenant Hartanto et al. (2016) et Sarver et al. (2015) sur le mouvement et le TDAH : https://self-regulationlab.fiu.edu/fidgetarticlegraziano.pdf
- CHADD, « Don't stop the movement » : https://chadd.org/attention-article/dont-stop-the-movement/
- Harvey, Clark, Ehlers et Rapee (2000), vidéo et préparation cognitive : https://www.psy.ox.ac.uk/publication/244155
- Revue sur le retour vidéo et l'anxiété sociale : https://labs.la.utexas.edu/telch/files/2015/02/The-efﬁcacy-of-videotape-feedback.pdf

**Ce qu'on ne peut pas mesurer**
- Barrett et al. (2019), *Emotional Expressions Reconsidered* : https://pmc.ncbi.nlm.nih.gov/articles/PMC6640856/
- Nguyen et al. (2014), « Hire Me », *IEEE Transactions on Multimedia* : https://infoscience.epfl.ch/record/192551
- Nguyen et Gatica-Perez (2015), tranches courtes d'entretien : https://publications.idiap.ch/attachments/papers/2015/Nguyen_ICMI_2015.pdf
- HireVue abandonne l'analyse faciale (Fortune, 2021) : https://fortune.com/2021/01/19/hirevue-drops-facial-monitoring-amid-a-i-algorithm-audit/
- Simmons et Simonsohn (2017), « Power Posing: P-Curving the Evidence » : https://faculty.wharton.upenn.edu/wp-content/uploads/2017/05/Simmons-Simonsohn-2017.pdf
- Se toucher et mentir, résultats contradictoires (Frontiers, 2024) : https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1331653/full
- AI Act, article 5(1)(f), reconnaissance des émotions (Future of Privacy Forum) : https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/
- Lignes directrices de la Commission, entraînement personnel exclu (Freshfields) : https://technologyquotient.freshfields.com/post/102kfql/eu-ai-act-unpacked-25-european-commission-releases-critical-ai-act-implementati

---

**Prochaine action :** trancher le §1. Audio seul tout de suite, et caméra facultative en V1.5 après le test d'une heure (§8) : oui ou non ?
