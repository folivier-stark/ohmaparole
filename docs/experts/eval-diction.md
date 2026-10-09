# OhMaParole : mesure objective de la diction (V1)

> Binôme d'experts : phonétique acoustique et orthophonie (intelligibilité de l'adulte).
> Recherche web au 09/10/2026. Les sources sont listées en fin de document, numérotées [n].
> Ce document fait des choix. Il ne contient pas de code.

---

## 0. Les décisions en 10 lignes

1. **Pas de reconnaissance vocale en V1.** Sur Chrome Android, la Web Speech API envoie l'audio aux serveurs de Google, le mode local n'est pas disponible et le WER sature chez un locuteur peu atteint.
2. **Tout se calcule en local** sur le Blob déjà stocké, avec Web Audio (énergie et F0). C'est gratuit, hors ligne, et on peut **recalculer tout l'historique** si l'algorithme change.
3. **Le texte étant connu, on ne détecte pas les syllabes : on les compte une fois dans le texte.** C'est la mesure la plus robuste qui existe.
4. **Les 4 mesures retenues** : débit de lecture, temps de pause, débit articulatoire et test d'écoute par un proche, qui transcrit des phrases inconnues.
5. **Une mesure reste en observation**, calculée sans être affichée : la variabilité du débit d'un groupe de souffle à l'autre, le marqueur du bredouillement.
6. **Chaque mesure a son propre seuil de bruit**, calibré sur Fred pendant la semaine 1 (3 séances de 3 prises). Avant la calibration, rien ne s'affiche.
7. **On affiche une tendance et un verdict en mots** (« plus posé, au-delà du bruit » ou « pas de différence mesurable »), jamais un score.
8. **Le protocole tient en 3 minutes** : même pièce, téléphone posé à 30 cm, 2 s de silence, 3 prises, puis la médiane.
9. **Limite de fond :** lire un texte connu montre ce que Fred **sait faire**, pas comment il parle en rendez-vous. Le bredouillement apparaît surtout en parole spontanée [28].
10. **L'appli ne dira jamais « bredouillement »** ni « intelligible à X % ». Le §5 liste les situations qui doivent mener à un bilan orthophonique.

**Incohérence à trancher avant de coder.** Deux textes de référence différents coexistent : celui de `expert-contenu.md` §4.1 (« Bonjour, je suis Fred… » suivi d'un virelangue) et celui de `expert-ux.md` §2.5 (« Ce matin, sur la route de Romillé… », 70 mots). Les calendriers diffèrent aussi : J1/J14/J30/J42 d'un côté, J1/J7/J14/J30 de l'autre. **Il en faut un seul, figé à vie.** Recommandation : le texte de `expert-ux` §2.5, plus naturel et sans virelangue. Un virelangue fait butter, et chaque prise à refaire ajoute du bruit à la mesure.

---

## 1. Les mesures possibles sur un enregistrement au texte connu

Légende de fiabilité test-retest (même personne, d'une séance à l'autre) : **bonne**, **moyenne**, **faible**. Les valeurs chiffrées de MDC sont discutées au §3.

### 1.1 Taux de mots reconnus par reconnaissance vocale (WER ou WRR)

| | |
|---|---|
| **Ce qu'il mesure vraiment** | Ce que **comprend une machine**, aidée par un modèle de langue qui devine les mots prévisibles. Ce n'est pas ce que comprend un humain qui découvre la phrase. |
| **Validité** | Chez les patients atteints de SLA, le WRR obtenu avec l'API Google Cloud est corrélé au WRR humain, sans plus. Les auteurs écrivent explicitement que l'ASR **ne doit pas servir de substitut un pour un** à l'intelligibilité, et qu'elle est **inadaptée au dépistage précoce** [17]. Chez l'enfant dysarthrique, Whisper-medium suit bien la transcription humaine, mais il s'agit d'une seule étude sur 20 enfants [20]. |
| **Biais** | (1) **Effet plafond** : chez un locuteur typique ou peu atteint, le WER est proche de 0, si bien que la mesure ne bouge plus [17][21]. (2) Sur un texte fluide et prévisible, le modèle de langue **corrige** les mots mal articulés. (3) Les « euh » et les répétitions sont souvent supprimés de la sortie (voir §2), ce qui peut fausser le mot voisin [13][15]. (4) Le résultat dépend de la longueur des phrases [17]. |
| **Test-retest** | Il est **moins fiable que l'humain**, surtout chez les locuteurs typiques ou légèrement atteints, c'est-à-dire exactement le cas de Fred [17]. Sur 60 mots, **un mot vaut 1,7 point de WER**. Le seul aléa d'échantillonnage, avec un taux d'erreur réel de 5 %, donne un écart type d'environ 1,7 mot (loi binomiale). |
| **Parade connue** | Mélanger un bruit calibré au signal avant la reconnaissance (« noise-augmented ASR ») pour sortir du plafond. Cela améliore la validité [17], mais au prix d'un paramètre de plus (le rapport signal/bruit) à figer. |
| **Verdict** | **Écarté en V1.** Possible en V2 à titre expérimental (voir §2.2). |

### 1.2 Débit de parole (syllabes/s) et débit articulatoire (pauses exclues)

| | |
|---|---|
| **Ce qu'ils mesurent** | Le **débit de parole** inclut les pauses ; le **débit articulatoire** les exclut et mesure la vitesse de la bouche elle-même [32][34]. Leur différence répond à la question qui compte pour Fred : parle-t-il trop vite, ou ne s'arrête-t-il jamais ? |
| **Validité** | Pour un texte connu, le nombre de syllabes est **une constante comptée une fois**. Toute l'erreur se concentre alors sur la durée, qui se mesure de façon fiable par l'énergie. C'est la mesure la plus solide de ce document. Pour le bredouillement, la littérature recommande de regarder le **débit articulatoire**, pas le débit de parole [32]. |
| **Biais** | (1) **Effet test** : devant le bouton « enregistrer », on ralentit, ce qui mesure la capacité et non l'habitude. (2) **Effet de mémorisation** : un texte lu 20 fois se dit plus vite, ce qui joue **à l'inverse** du progrès recherché. (3) Si Fred avale des syllabes (« télescopage »), on compte des syllabes **visées** et non des syllabes produites. C'est la convention standard, mais elle surestime le débit réellement articulé. (4) Le débit dépend du texte [26], d'où l'obligation de garder toujours le même. |
| **Test-retest** | Le débit de parole est **bon**, le débit articulatoire **moyen**, car il dépend du seuil de pause. Les mesures de durée et de « débit voisé » font partie des plus stables entre séances [26], et les modulations temporelles sont plus stables que l'énergie ou la F0 moyenne [23]. |
| **Normes françaises** | **Aucune norme adulte publiée et fiable n'a été trouvée** pour la lecture en syllabes/s. Une revue d'orthophonie francophone constate ce manque [33]. **On n'affiche donc aucune comparaison à « la moyenne ».** |
| **Verdict** | **Retenus tous les deux** (rangs 1 et 3). |

### 1.3 Nombre et durée des pauses

| | |
|---|---|
| **Ce qu'il mesure** | Les silences de **250 ms ou plus** entre deux segments de parole. Le seuil habituel se situe entre 150 et 250 ms [34] ; à 250 ms, on évite de compter les occlusions des consonnes /p t k/, qui durent moins de 150 ms. |
| **Validité** | Elle est directement liée à l'entraînement, puisque l'appli fait travailler la pause de 2 s et l'objectif « ralentir ». Dans un texte lu, les pauses tombent surtout sur la ponctuation, ce qui les rend plus stables mais moins révélatrices qu'en parole spontanée. Des pauses anormales font partie des critères du bredouillement [28]. |
| **Biais** | Le résultat dépend du seuil d'énergie choisi et du bruit de fond. Un souffle bruyant ou un frottement contre le téléphone peut couper une pause en deux. |
| **Test-retest** | **Moyen.** Le nombre de pauses est un petit entier (environ 6 à 12 sur ce texte), donc saccadé. Le **pourcentage du temps passé en pause** est plus stable que le nombre. |
| **Verdict** | **Retenu** (rang 2), sous la forme du **% de temps en pause** plus le nombre de pauses d'au moins 250 ms. |

### 1.4 Variabilité du débit (marqueur du bredouillement)

| | |
|---|---|
| **Ce qu'elle mesure** | Le caractère irrégulier, par à-coups (« spurty »), du débit. C'est un **critère central** de la définition du bredouillement, où l'irrégularité compte plus que la vitesse moyenne [28]. |
| **Validité** | **Aucune métrique acoustique de variabilité du débit validée pour le bredouillement n'a été trouvée.** Les auteurs eux-mêmes jugent ce critère difficile à objectiver [31]. Les travaux existants portent sur le débit moyen et les ratios de disfluences [31], ou sur la variabilité articulatoire mesurée en laboratoire (articulographie) [31]. |
| **Biais** | Il faut le nombre de syllabes **par groupe de souffle**, alors que le texte ne le donne que pour le total. Il faut donc détecter les noyaux syllabiques (pics d'intensité voisés, méthode de de Jong et Wempe [22]). Or cette détection **sous-compte dans la parole rapide et coarticulée**, c'est-à-dire précisément dans les passages bredouillés. Le biais va dans le sens qui masque le symptôme. |
| **Test-retest** | Non documenté. Probablement **faible** sur 8 à 10 groupes de souffle par prise. |
| **Verdict** | **En observation** : calculée et stockée, **jamais affichée en V1**. On la regarde à 3 mois. Si son bruit propre (MDC) se révèle inférieur aux écarts observés, elle passera en V1.1. |

### 1.5 Disfluences et mots de remplissage (« euh »)

| | |
|---|---|
| **Ce qu'elles mesurent** | Les disfluences « normales » (« euh », répétitions de mots, reformulations) en excès sont un critère du bredouillement [28]. En clinique, le ratio entre disfluences normales et disfluences de type bégaiement sert à distinguer le bredouillement du bégaiement [31]. |
| **Faisabilité** | **Pas de détection automatique fiable en français dans un navigateur en 2026.** Whisper supprime les « euh » par conception [13][15]. Les variantes « verbatim » existent (CrisperWhisper [14]), mais pas en version française prête pour le navigateur à ma connaissance. Pour la Web Speech API, la suppression des fillers est **probable mais non documentée** : à tester. |
| **Biais** | Un texte lu produit **peu de « euh »**. La mesure n'a de sens qu'en parole spontanée. |
| **Verdict** | **Pas en V1 automatique.** Option V1.1 : un monologue mensuel de 60 s, que Fred réécoute en tapant un bouton à chaque « euh » ou mot répété entendu. Le comptage est humain, donc semi-objectif, mais réalisable (voir §4.6). |

### 1.6 Intensité et sa stabilité

| | |
|---|---|
| **Ce qu'elle mesure** | Le niveau absolu (en dB) **ne veut rien dire** sans calibrage : il varie d'environ 6 dB chaque fois que la distance double, et selon le téléphone [27]. En revanche, l'intensité **relative à l'intérieur d'une même prise** a du sens. Exemple : la **chute d'intensité en fin de groupe de souffle**, ces fins de phrase qui s'éteignent et nuisent à l'intelligibilité. |
| **Validité** | La pertinence clinique est plausible, mais **aucune validation n'a été trouvée** pour cette métrique précise. L'énergie à court terme compte parmi les traits qui **varient le plus d'une séance à l'autre** chez un même locuteur français [23]. |
| **Test-retest** | **Faible** en absolu, **inconnu** en relatif. |
| **Verdict** | **Pas en V1.** La chute d'intensité en fin de groupe est candidate pour la V2, en observation. |

### 1.7 Variabilité de la hauteur (prosodie, F0)

| | |
|---|---|
| **Ce qu'elle mesure** | L'étendue mélodique, mesurée par l'écart type de la F0 en demi-tons. Une valeur basse évoque une voix monotone. |
| **Validité** | La F0 est **la mesure acoustique la plus fiable au smartphone** (r > 0,90 face au matériel de référence), à condition d'utiliser **l'autocorrélation** et non une méthode cepstrale [27]. Mais la **F0 moyenne** compte parmi les traits les plus instables d'une séance à l'autre [23], et l'étendue dépend de l'humeur, de la fatigue et de la consigne. |
| **Lien avec la plainte de Fred** | Il est **indirect** : la plainte porte sur le débit et l'articulation, pas sur la monotonie. |
| **Verdict** | **Pas en V1.** C'est facile à ajouter en V1.1 si un orthophoniste la juge utile. |

### 1.8 Autres mesures envisagées

| Mesure | Verdict | Pourquoi |
|---|---|---|
| **Test d'écoute par un auditeur** : il transcrit des phrases qu'il n'a jamais entendues, et l'appli calcule le % de mots corrects | **Retenu (rang 4)** | C'est **la** définition clinique de l'intelligibilité (transcription orthographique par un auditeur naïf). Elle est plus valide que toute ASR [17]. Coût : un proche, 3 minutes par mois. |
| Écoute A/B à l'aveugle (déjà prévue) | **À garder** | Simple et sans biais d'ordre. Elle complète le test d'écoute, sans le remplacer. |
| « On m'a fait répéter ? » après un rendez-vous (déjà prévu) | **À garder** | C'est le seul indicateur **de terrain**, donc le plus utile au bout du compte. |
| Diadococinésie (« pataka » le plus vite possible) | **Non** | Sa fiabilité se dégrade sur les appareils grand public [24], et elle mesure la motricité, pas la parole en rendez-vous. |
| Qualité de voix (CPP, HNR, jitter) | **Non** | Sensible au téléphone et à la distance [27], et hors sujet par rapport à la plainte. |

---

## 2. Faisabilité sur Chrome Android, sans serveur, en 2026

### 2.1 Web Speech API (`SpeechRecognition`)

| Question | Réponse | Source |
|---|---|---|
| Envoie-t-elle l'audio à Google ? | **Oui, par défaut.** La reconnaissance passe par un moteur serveur. Sur Android, `webkitSpeechRecognition` s'appuie sur le service de reconnaissance du système. | [2] |
| Existe-t-il un mode local (`processLocally`) ? | Il existe sur **ordinateur depuis Chrome 139** (Windows, Mac, Linux), avec `available()` et `install()` qui téléchargent un pack de langue d'environ 60 Mo. **Android n'a aucun jalon de livraison** dans Chrome Platform Status. L'API reste « expérimentale » et a connu des régressions (le mode local a été coupé jusqu'à Chrome 142). Edge 150 ne propose même pas le français en local. | [1][3][4][7][8][19][36] |
| Peut-on la lancer avec MediaRecorder ? | **Non garanti sur Android.** L'option `start(audioTrack)`, qui permettrait de reconnaître un flux déjà capté ou un fichier, existe depuis Chrome 135 sur ordinateur, mais **pas sur Chrome Android** (caniuse). Partager le micro entre deux consommateurs n'est documenté nulle part pour Android, et les signaux sonores système ainsi que les arrêts sur silence sont signalés. | [5][6] |
| Les « euh » sont-ils filtrés ? | **Probablement**, car la transcription « propre » est la norme chez Google. Ce n'est pas documenté pour la Web Speech API : à tester avant toute conclusion. | [35] |
| Peut-on réanalyser J1 plus tard ? | **Non** sur Android : sans `start(audioTrack)`, on ne reconnaît que le micro en direct. | [5] |

**Verdict : écartée.** Elle contredit le principe « les données restent sur le téléphone », ne permet pas de recalculer l'historique et sature chez Fred.

### 2.2 Whisper et autres modèles dans le navigateur (transformers.js, ONNX, WebGPU)

| Point | Constat | Source |
|---|---|---|
| WebGPU sur Android | Activé par défaut depuis Chrome 121, mais **seulement sur Android 12 ou plus récent avec GPU Qualcomm ou ARM**. Sinon, repli sur WASM, beaucoup plus lent. | [9][10] |
| Taille des modèles (ONNX, q8) | tiny environ 45 Mo · base environ 85 Mo · small environ 250 Mo · small affiné en français environ 390 Mo | [11] |
| Qualité en français | Versions quantifiées (whisper.cpp, VoxPopuli FR) : tiny **41 %** de WER, base **27 %**, small **15 %**. Small affiné en français : environ **11 à 12 %** sur Common Voice. **Tiny et base sont inutilisables** pour mesurer une intelligibilité : leur propre erreur dépasse de loin celle de Fred. | [12][37] |
| Vitesse sur un téléphone de milieu de gamme | **Aucun chiffre publié trouvé** (facteur temps réel). En traitement différé, sur 30 s d'audio, small est plausible en WebGPU mais **à mesurer sur le téléphone de Fred**. En WASM, on peut s'attendre à plusieurs fois le temps réel. | [10] |
| Disfluences | **Supprimées par conception** (style de transcription « propre »). Une invite de type « Euh, hum… » en récupère parfois, sans fiabilité. | [13][15] |
| Hallucinations | Whisper invente du texte sur les silences : un risque de plus pour un WER. | connaissance générale, à vérifier |
| Alternative Vosk (Kaldi, WASM) | Le petit modèle français pèse environ 41 Mo et donne les **horodatages et la confiance mot par mot**, ce qui serait utile pour mesurer le débit par mot. Mais la paquet `vosk-browser` est peu maintenu (v0.0.x), et sa qualité en français dans le navigateur n'est pas mesurée. | [16] |

**Verdict.** Rien en V1. **Piste V2 expérimentale** : Whisper-small (ou sa version affinée en français) en différé après la prise, avec ajout de bruit calibré pour sortir du plafond [17], appliqué au texte de référence **et** aux phrases du jour regroupées sur une semaine pour avoir plus de mots. À une condition : mesurer d'abord le facteur temps réel et la consommation de batterie sur le téléphone de Fred. Si une prise de 30 s prend plus de 60 s à traiter, on abandonne.

### 2.3 Analyse Web Audio maison : **retenue**

- **Décodage** : `decodeAudioData` lit le WebM/Opus de Chrome. Un `OfflineAudioContext` rééchantillonne à **16 kHz mono**. L'Opus à 32 kb/s **suffit** pour l'énergie, les durées et la F0.
- **Énergie et pauses** : quelques dizaines de lignes de JavaScript, un calcul de moins d'une seconde pour 30 s d'audio. Les détails sont au §4.
- **Pics syllabiques** (pour la mesure en observation) : enveloppe filtrée entre 300 et 3 000 Hz, pics d'au moins 2 dB au-dessus des creux voisins, séparés d'au moins 100 ms, puis vérification du voisement. C'est la méthode de de Jong et Wempe [22], dont les comptes automatiques sont fortement corrélés aux comptes humains, avec des erreurs à corriger à la main.
- **F0** (V1.1) : autocorrélation normalisée (YIN ou McLeod) sur des fenêtres de 40 ms, plage 60 à 300 Hz, correction des sauts d'octave. L'autocorrélation est la méthode robuste au smartphone [27].
- **Règle d'or** : stocker le **numéro de version de l'algorithme** avec chaque résultat, et **tout recalculer** sur les Blobs quand il change. La courbe reste homogène, et c'est le grand avantage du calcul local.

---

## 3. Précision réaliste

### 3.1 La formule

Pour une seule personne, le bruit de mesure est l'**écart type intra-individuel entre séances** (SDw). On en tire la plus petite variation détectable :

> **MDC95 = 1,96 × √2 × SDw ≈ 2,77 × SDw**

C'est la même formule que dans les travaux de référence sur l'intelligibilité et le débit [18]. **Une différence entre deux séances inférieure au MDC peut être du bruit, et rien d'autre.**

### 3.2 Ordres de grandeur

**Attention : ce sont des estimations d'expert.** Les études sur smartphone, à domicile ou sur appareil grand public, trouvent une fiabilité test-retest acceptable mais **très variable selon la mesure et la tâche** : environ la moitié des traits restent sous le seuil « modéré » [24][25][26]. Aucune étude publiée ne donne ces valeurs pour un adulte non pathologique qui lit un texte fixe au smartphone. Elles servent de valeurs par défaut prudentes, puis sont **remplacées par la calibration de Fred** (§3.3).

| Mesure | Bruit attendu d'une séance à l'autre (médiane de 3 prises) | MDC95 estimé | Progrès plausible en 1 à 3 mois | Détectable ? |
|---|---|---|---|---|
| Débit de lecture | 3 à 5 % | **8 à 14 %**, soit environ ±0,5 à 0,8 syll/s si Fred lit à 6 syll/s | Ralentir de 10 à 20 % si le travail porte | **Limite à 1 mois, probable à 3 mois** |
| % de temps en pause | 3 à 5 points | **8 à 14 points** | +5 à +15 points (la pause de 2 s est travaillée) | **Probable à 3 mois** |
| Nombre de pauses ≥ 250 ms | ±1 à 2 | **±3 à 5** | +2 à +5 | Limite |
| Débit articulatoire | 4 à 6 % | **11 à 17 %** | Ralentissement plus faible que le débit global | **Incertain** |
| WER (ASR, 60 mots) | 2 à 3 points (binomial, plus l'erreur du modèle) | **au moins 8 points, soit 5 mots** | 0 à 5 points, car Fred est probablement déjà près de 0 | **Non** : le plafond l'en empêche |
| Test d'écoute (environ 40 mots) | Binomial plus l'effet d'auditeur | Environ **10 à 12 points** [18] | Inconnu | Seulement si l'intelligibilité de départ est nettement imparfaite |

Repère publié : en SLA, il faut une baisse de plus de **12 points** d'intelligibilité de phrases ou de **37 mots/min** de débit pour sortir de l'erreur de mesure [18]. Cette population est plus variable que Fred, qui devrait donc avoir un bruit plus faible, mais elle montre l'ordre de grandeur.

**Conclusion honnête.** Le débit et les pauses ont de bonnes chances de montrer un vrai changement **en 2 à 3 mois**, si Fred change vraiment sa façon de lire. **À 1 mois, il faut s'attendre à « pas de différence mesurable » et le dire.** L'intelligibilité mesurée par une machine ne montrera rien.

### 3.3 Calibration de Fred (semaine 1)

- **3 séances de référence sur 3 jours différents** pendant la semaine 1 (J1, puis deux autres jours avant J7), à raison de **3 prises par séance**, soit 9 prises et environ 3 minutes par séance.
- SDw = écart type des **3 médianes de séance**. Avec si peu de points, on retient la valeur la plus prudente : **max(SDw mesuré, valeur par défaut du §3.2)**.
- SDw est ensuite **recalculé à chaque séance de référence** à partir des écarts autour de la tendance, et le MDC s'affine avec le temps.
- **Ligne de base** = médiane des 3 séances de la semaine 1, et non J1 seul (le trac du premier jour fausse la mesure).

### 3.4 Protocole d'enregistrement de référence (3 minutes)

| Facteur de bruit | Parade |
|---|---|
| Distance | Téléphone **posé** sur la table, contre un support, micro du bas tourné vers la bouche, à **30 cm** (la longueur d'une feuille A4). Jamais tenu à la main. |
| Pièce et bruit | **Toujours la même pièce**, porte fermée, rien qui tourne (lave-linge, hotte). L'appli impose **2 s de silence** avant le bip : elle mesure le plancher de bruit et **refuse la prise** si le rapport signal/bruit est inférieur à 20 dB (« Trop de bruit : change de pièce »). |
| Saturation | La prise est refusée si plus de 0,1 % des échantillons sont saturés. |
| Heure et fatigue | Même créneau, à ±2 h près. Un tap « Fatigué ? oui/non » est stocké avec la mesure. En cas de rhume ou de voix enrouée, **on reporte**. |
| Position dans la séance | **Au début, avant l'échauffement.** On mesure la parole « à froid », plus proche du quotidien. |
| Effet test | Consigne fixe, toujours la même : « Lis comme si tu parlais à un prospect. Ne cherche pas à bien faire. » |
| Variabilité d'une prise à l'autre | **3 prises de suite, médiane.** Une prise est à refaire en cas d'interruption ou de mot sauté, jamais parce qu'on la trouve « ratée ». |
| Matériel | Même téléphone. **Un changement de téléphone crée une nouvelle ligne de base**, marquée par une rupture sur la courbe. |
| Traitement éventuel | Si Fred prend un traitement pour le TDAH, enregistrer toujours au même moment par rapport à la prise, car l'attention modifie le débit. Cette information n'est pas stockée par l'appli. |
| Phrases du jour | **Ne servent pas à mesurer le progrès** : la consigne y change (« lent puis normal »), donc le débit reflète la consigne, pas l'habitude. |

---

## 4. Recommandation V1 : 4 mesures et 1 en observation

Classement par rapport **utilité × fiabilité ÷ coût**.

### Rang 1 : débit de lecture du texte de référence

- **Algorithme** : `N_syll / D`. `N_syll` est compté **une fois à la main** dans le texte, selon une convention fixe sur les e muets ; la valeur exacte importe peu, puisque seule la tendance compte. `D` est le temps entre le premier et le dernier segment de parole (détection d'énergie, §4.5).
- **Protocole** : §3.4.
- **Affichage** : « **Ton débit : environ 6,1 syll/s** (zone de bruit ±0,6). Semaine 1 : 6,8. → **Plus posé qu'au départ, au-delà du bruit.** » Valeur arrondie au dixième, **courbe des médianes avec une bande grise** pour la zone de bruit, verdict en trois états seulement : *plus posé* · *pas de différence mesurable* · *plus rapide*.

### Rang 2 : temps de pause

- **Algorithme** : une pause est un intervalle sous le seuil d'au moins **250 ms**, situé entre le début et la fin de la parole. On affiche `% pause = Σ pauses / D`, plus le **nombre de pauses**.
- **Affichage** : « Tu t'arrêtes **environ 18 % du temps** (semaine 1 : 9 %). » Le nombre de pauses n'apparaît qu'en détail. Mêmes trois états de verdict.

### Rang 3 : débit articulatoire

- **Algorithme** : `N_syll / (D − Σ pauses)`.
- **Affichage** : jamais seul, **toujours à côté du débit de lecture**, avec une phrase d'interprétation. Par exemple : « Tu fais plus de pauses, mais ta bouche va toujours aussi vite. » ou « Tu ralentis aussi en articulant. » C'est la lecture croisée des deux mesures qui aide Fred.

### Rang 4 : test d'écoute par un proche (mensuel)

- **Algorithme** : un proche écoute **5 phrases** que Fred a enregistrées et que ce proche **n'a jamais entendues** (tirées des phrases du jour, environ 40 mots). Chaque phrase est jouée **une seule fois**. Il tape ce qu'il a compris, puis l'appli aligne sa saisie sur le texte connu : `% mots corrects = mots justes / mots du texte`. L'appli ignore la casse, la ponctuation et les accents mal tapés.
- **Biais à gérer** : un proche s'habitue à la voix de Fred, ce qui fait monter le score sans progrès réel. Il faut donc **varier les auditeurs** quand c'est possible, et n'utiliser que des phrases nouvelles pour eux.
- **Affichage** : « Ton auditeur a compris **36 mots sur 40**. » En chiffres bruts, sans pourcentage mis en avant et sans comparaison à une norme. Une tendance n'apparaît qu'à partir de 3 tests.

### En observation (calculée, stockée, non affichée) : variabilité du débit

- **Algorithme** : on découpe la prise en groupes de souffle (segments entre deux pauses, d'au moins 1 s). Dans chaque groupe, on compte les noyaux syllabiques par pics d'intensité voisés [22], puis on applique le facteur `k = N_syll / N_détectés` sur l'ensemble de la prise. Le débit local est `k × noyaux / durée`, et l'indicateur est **CV = écart type / moyenne** des débits locaux.
- **Décision à 3 mois** : on l'affiche (sous forme de tendance, sans chiffre) seulement si son MDC est inférieur à l'écart entre la semaine 1 et le mois 3.

### 4.5 Détection de la parole, commune à toutes les mesures (pour l'implémenteur)

1. Décodage, mono 16 kHz, passe-haut à 80 Hz (bruits de manipulation).
2. Trames de 25 ms, pas de 10 ms, `E_dB = 10·log10(moyenne(x²) + 1e-10)`, lissage médian sur 5 trames.
3. Plancher de bruit `N` = 10e centile des 2 s de silence initial ; niveau de parole `S` = 95e centile. **Prise valide si S − N ≥ 20 dB.**
4. Seuil `T = N + 0,35 × (S − N)`, avec une hystérésis de ±3 dB.
5. Les trous de moins de 250 ms sont fusionnés (occlusions, fricatives faibles) ; ceux qui restent sont des pauses.
6. Stocker `D`, `Σpauses`, `nbPauses`, la liste des segments, `algoVersion` et le rapport signal/bruit.

### 4.6 Option V1.1 : monologue mensuel (pour le bredouillement)

- **Consigne fixe** : « Présente ton métier comme à un prospect, 60 s. »
- **Mesures** : débit (noyaux syllabiques, **sans** texte connu, donc moins précis), % de pause, et **comptage manuel** des « euh » et répétitions à la réécoute (un tap à chaque fois, ramené à 100 mots).
- **Pourquoi** : le bredouillement se définit **en conversation naturelle** [28]. La lecture peut le masquer complètement.

---

## 5. Garde-fous

### 5.1 Ce que l'appli ne doit **jamais** dire ou afficher

| Jamais | Pourquoi |
|---|---|
| « Bredouillement », « tu bredouilles » ou « tu ne bredouilles pas » | C'est un diagnostic d'orthophoniste, posé à partir de la parole spontanée et d'outils dédiés [28][29][30]. |
| Un « score de diction » ou un « score d'intelligibilité » sur 100 | Aucune de ces mesures n'est une intelligibilité validée [17]. |
| « Tu es compris à X % » à partir d'une ASR | Ce n'est pas un substitut un pour un [17]. |
| « Tu parles plus vite que la moyenne » | Il n'existe pas de norme française fiable [33]. |
| Une comparaison d'un jour sur l'autre, ou une courbe quotidienne | Le bruit dépasse l'effet (§3.2). |
| Un chiffre avec plus d'une décimale | Une fausse précision. |
| « Plus lent, c'est mieux » | Un débit trop lent nuit aussi au naturel. Seuls le test d'écoute et le terrain disent si c'est plus clair. |
| « Grâce à l'appli, tu as progressé » | Il n'y a pas de groupe contrôle ; l'effet de la pratique, de la mémorisation et de l'attention se mélangent. |
| « Ta lecture montre comment tu parles en rendez-vous » | La lecture d'un texte connu montre une capacité, pas une habitude. |

### 5.2 Quand orienter vers un bilan orthophonique (message affiché, sans alarme)

Le bilan se fait sur **prescription du médecin traitant**, chez un ou une orthophoniste formé·e aux **troubles de la fluence (bégaiement et bredouillement)**. Les enregistrements de l'appli peuvent lui être apportés, en particulier la semaine 1 et la dernière prise.

L'appli le propose **une fois**, de façon bienveillante, si :

1. **La gêne est persistante** au quotidien, ou Fred évite certaines prises de parole.
2. « On m'a fait répéter » **plusieurs fois dans plus d'un rendez-vous sur trois**, sur un mois. C'est une heuristique d'appli, pas une norme.
3. **Rien ne bouge au bout de 3 mois** de pratique régulière : aucune mesure au-delà du MDC et un test d'écoute stable.
4. Le test d'écoute montre **des mots régulièrement mal compris** dans des phrases inconnues.
5. Apparaissent des signes de **formulation** : mots qui manquent, phrases qui partent dans tous les sens, idées qui se bousculent. Le bredouillement peut toucher le langage, pas seulement la parole.
6. Apparaissent des **blocages, des répétitions de sons avec tension, ou des syllabes prolongées**, signes évocateurs d'un bégaiement, qui relève d'une autre prise en charge.

**Situations qui relèvent du médecin, pas de l'appli :**
- **Une élocution qui devient brutalement pâteuse**, des mots qui ne viennent plus, une faiblesse d'un côté du visage ou d'un bras : **appeler le 15 immédiatement** (signes possibles d'un AVC).
- Un enrouement de plus de 3 semaines, une douleur ou une gêne à avaler : médecin, puis ORL (déjà dans `expert-contenu.md` §7).

Repère : la littérature décrit un bredouillement chez des jeunes porteurs de TDAH [38], mais il n'existe **pas de prévalence chez l'adulte** établie. Le TDAH de Fred justifie de demander un bilan, mais **ne permet pas d'en préjuger le résultat**.

---

## 6. Relecture en avocat du diable

**Grave.** Les MDC du §3.2 sont des **estimations**, pas des données publiées. La parade est en place : rien ne s'affiche avant la calibration de la semaine 1, et les valeurs par défaut sont volontairement prudentes.

**Grave.** Le débit de lecture risque de mesurer **la capacité à se contrôler devant un micro** plus que le progrès réel. C'est assumé et dit à Fred. Seuls « On m'a fait répéter ? » et le monologue V1.1 approchent la vraie vie.

**Moyen.** Le test d'écoute dépend de la disponibilité d'un proche. Sans auditeur, l'appli tombe à 3 mesures temporelles, ce qui reste honnête mais ne dit rien de la clarté.

**Moyen.** Le WebM de Chrome et `decodeAudioData` sont réputés compatibles, mais **le décodage d'une prise de 30 s doit être vérifié sur le téléphone de Fred** (même logique que `expert-tech.md` §11).

**Léger.** Le seuil de 0,35 et les 250 ms sont des choix raisonnables mais arbitraires. Ils sont figés dans `algoVersion` et l'historique est recalculé en cas de changement.

---

## Sources

1. MDN, `SpeechRecognition.processLocally` : https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally
2. MDN, *Using the Web Speech API* (moteur serveur par défaut, reconnaissance sur l'appareil) : https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
3. Chrome Platform Status, *On-device Web Speech API* (ordinateur Chrome 139, pas de jalon Android) : https://chromestatus.com/feature/6090916291674112
4. blink-dev, *Intent to Ship: On-device Web Speech API* (Windows, Mac, Linux d'abord ; packs d'environ 60 Mo) : https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM
5. caniuse, `SpeechRecognition.start(audioTrack)` (Chrome 135 et plus, non pris en charge sur Chrome Android) : https://caniuse.com/mdn-api_speechrecognition_start_audiotrack
6. MDN, `SpeechRecognition.start()` : https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start
7. W3C TAG, *On-Device Recognition Quality* (2026) : https://tag-github-bot.w3.org/gh/w3ctag/design-reviews/1189
8. Chromium issue 444393111 (mode local indisponible, régression) : https://issues.chromium.org/issues/444393111
9. Chrome, *New in WebGPU 121* (Android 12 ou plus, GPU Qualcomm ou ARM) : https://developer.chrome.com/blog/new-in-webgpu-121
10. LogRocket, *Real-time voice AI agent in the browser* (Whisper-base q4 en WebGPU, repli WASM) : https://blog.logrocket.com/how-to-build-a-real-time-voice-ai-agent-in-the-browser
11. Micdrop, tailles des modèles Whisper ONNX : https://micdrop.dev/docs/ai-integration/provided-integrations/whisper
12. Joplin voice-typing-models, WER français des modèles quantifiés : https://github.com/joplin/voice-typing-models/releases
13. Hugging Face, discussion sur la détection des fillers par Whisper : https://huggingface.co/spaces/openai/whisper/discussions/30
14. Zusag et al., *CrisperWhisper* (transcription verbatim), arXiv 2408.16589 : https://arxiv.org/abs/2408.16589
15. *WhisperD: Dementia Speech Recognition and Filler Word Detection with Whisper*, arXiv 2505.21551 : https://arxiv.org/pdf/2505.21551
16. Vosk, modèles (petit modèle français) : https://alphacephei.com/vosk/models · `vosk-browser` : https://www.npmjs.com/package/vosk-browser
17. Gutz, Stipancic, Yunusova, Berry, Green (2022), *Validity of Off-the-Shelf ASR for Assessing Speech Intelligibility… in ALS*, JSLHR 65(6) : https://pubs.asha.org/doi/10.1044/2022_JSLHR-21-00589
18. Stipancic et al. (2018), *MDC and MCID of a Decline in Sentence Intelligibility and Speaking Rate… ALS*, JSLHR : https://pubs.asha.org/doi/10.1044/2018_JSLHR-S-17-0366
19. Chrome, *New in Chrome 139* (reconnaissance vocale sur l'appareil) : https://developer.chrome.com/blog/new-in-chrome-139
20. Choi et al. (2026), ASR et intelligibilité chez l'enfant dysarthrique (Whisper, Google Cloud) : https://www.cs.columbia.edu/speech/PaperFiles/2026/JSL6904_Choi.pdf
21. *Beyond WER: intelligibility metric for dysarthric speech* (2025), arXiv 2506.16528 : https://arxiv.org/abs/2506.16528
22. de Jong & Wempe (2009), *Praat script to detect syllable nuclei and measure speech rate automatically*, Behavior Research Methods 41(2) : https://doi.org/10.3758/BRM.41.2.385 (PDF : https://www.fon.hum.uva.nl/archive/2009/2009-brm-JongWempe.pdf)
23. Audibert & Fougeron (2022), variabilité intra-locuteur sur 10 séances, 9 locuteurs français, Interspeech : https://www.isca-archive.org/interspeech_2022/audibert22_interspeech.html
24. *Cross-device and test–retest reliability of speech acoustic measurements derived from consumer-grade mobile recording devices* (2024), Behavior Research Methods : https://pubmed.ncbi.nlm.nih.gov/39738817/
25. *Smartphone self-testing of hand and speech motor functions: reliability and usability in older adults* : https://pmc.ncbi.nlm.nih.gov/articles/PMC12972373/
26. *Test-retest reliability of acoustic and linguistic measures of speech tasks* (2023), Computer Speech & Language : https://www.sciencedirect.com/science/article/abs/pii/S0885230823000669
27. Frontiers in Digital Health (2025), validité de la F0 et des mesures acoustiques au smartphone : https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1610772/full
28. St. Louis & Schulte (2011), définition du bredouillement par son « plus petit dénominateur commun » : https://ahn.mnsu.edu/services-and-centers/center-for-communication-sciences-and-disorders/services/stuttering/information-about-stuttering/serious-information/types-of-fluency-disorders/cluttering/what-is-cluttering-defining-cluttering-in-terms-of-its-lowest-common-denominator
29. ASHA Practice Portal, *Fluency Disorders* : https://www.asha.org/practice-portal/clinical-topics/fluency-disorders/
30. RCSLT, *Cluttering guidance* : https://www.rcslt.org/members/clinical-guidance/stammering-and-cluttering/cluttering-guidance/
31. Frontiers in Psychology (2024), critères objectifs du bredouillement (ratio de disfluences et débit articulatoire moyen) : https://www.frontiersin.org/articles/10.3389/fpsyg.2024.1408929/full · Hartinger & Mooshammer, *Articulatory variability of clutterers* : https://publikationen.ub.uni-frankfurt.de/frontdoor/index/index/year/2013/docId/30943
32. Lickley, débit de parole et débit articulatoire dans le bredouillement (ICA) : https://www.mnsu.edu/comdis/ica1/papers/lickleyc.html
33. Repères en orthophonie (2002), absence de norme de débit chez les francophones : https://www.erudit.org/en/revue/ref/2002/v8/n1/026372ar.pdf
34. TRANEL, débit articulatoire et seuil de pause de 150 à 250 ms : https://www.revue-tranel.ch/article/download/2943/2646/4274
35. Simba, *How STT handles disfluencies and filler words* (source secondaire) : https://simbavoice.ai/resources/how-stt-handles-disfluencies-and-filler-words
36. Microsoft Edge, *Speech recognition API* (langues disponibles en local) : https://learn.microsoft.com/microsoft-edge/web-platform/speech-recognition-api
37. bofenghuang, *whisper-small-cv11-french* (WER sur Common Voice FR) : https://huggingface.co/bofenghuang/whisper-small-cv11-french
38. *Cluttering and working memory in youths with ADHD*, Psychiatry and Clinical Psychopharmacology (2024) : https://psychiatry-psychopharmacology.com/Content/files/sayilar/1/PCP_20241035_nlm_new_indd.pdf
