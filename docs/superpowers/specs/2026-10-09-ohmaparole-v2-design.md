# OhMaParole V2 : évaluation mesurée, Louarn et Parcours (spec d'arbitrage)

> Décision de Fred du 09/10/2026 : « fais tout de 1 à 7 ».
> Ce document **tranche** les points où les rapports d'experts se contredisent. Pour le détail, la source est le rapport cité. **En cas de conflit, c'est ce document qui gagne**, puis la spec V1 et celle du tableau de bord.
>
> Rapports : `docs/experts/eval-methodologie.md` (abrégé **M**), `eval-diction.md` (**D**), `eval-posture.md` (**P**), `eval-rdv.md` (**R**), `expert-gamification.md` (**G**).

## 0. Amendements aux specs existantes

| Spec | Avant | Maintenant |
|---|---|---|
| V1 §10 | « Analyse automatique de la voix » hors V1 | **Autorisée, uniquement sur l'appareil**, sans aucune requête réseau, à partir des Blobs déjà stockés (D §2.3, §4.5) |
| V1 §10 | Badges et niveaux interdits | **Autorisés :** les 6 stades de Louarn et 11 souvenirs (G §1.3, §4.3). **Toujours interdits :** XP, niveaux chiffrés, classements, vies, séries (G §4.5). |
| Tableau §Règle | « en hausse » si +10 points | **Supprimé.** Il est remplacé par §3 ci-dessous (M §2.6). |
| Tableau, RDV | « Objectif atteint ? » | **Gardé**, mais seulement si un objectif a été saisi. Il entre dans les 5 questions de R §1.3 (voir §5). |
| V1 et R | Pas de reconnaissance vocale | **Confirmé :** pas d'ASR, pas de Whisper, pas de caméra en V2 (D §2.1-2.2, P §1). |

**Texte de référence :** on garde **celui qui est en place** (`content/fr/extras.json`, issu de `expert-contenu.md` §4.1). Il est peut-être déjà enregistré à J1 sur le téléphone de Fred. La continuité passe avant le confort de mesure (D recommandait un autre texte). Le nombre de syllabes de ce texte est **compté une fois** et stocké dans `extras.json` : `reference.syllabes`.

**Règle absolue pour toutes les mesures :** chaque valeur est stockée avec `algoVersion`, la date et le contexte (forme du jour si demandée). L'historique est **toujours recalculable** depuis les Blobs (D §2.3).

## 1. Louarn, le renard qui grandit (G en entier)

- **6 stades**, indexés sur `dailyCount` : Renardeau, puis Jeune renard (12), Renard d'aplomb (24), Renard assuré (36), Renard posé (48) et Renard charismatique (72). Il **ne régresse jamais**.
- Les SVG viennent de G §1.5. Couleurs dans les tokens CSS `--fox-*` (G §1.4), avec le mode sombre.
- **Répliques :** le JSON de G §3 va dans `content/fr/louarn.json`. Tirage déterministe par jour, sans répétition récente. Une bulle par écran, rien pendant l'effort (G §2.1-2.2).
- **Option « Renard discret »** dans les Réglages (G §2.4).
- **Montée de stade :** une animation d'1 s au plus, qui respecte `prefers-reduced-motion`, et la réplique `stade`.

## 2. Parcours et souvenirs (G §4.2-4.4)

- **En tête de l'écran Progression :** un sentier de 18 pierres sur 3 blocs (Fondations, Charisme, Situations), avec Louarn sur la position courante et la silhouette du stade suivant, accompagnée de « Encore N séances ».
- **11 souvenirs**, avec les conditions exactes de G §4.3. On n'affiche que ceux qui sont obtenus.
- **Célébration à la fin d'un thème** (toutes les 4 séances) et **à la fin d'un bloc**.

## 3. Le tableau de bord honnête (M §2.6, §4)

- **Taux déclaratifs** (diction « Clair », écoute « Repéré », posture « Posé », RDV) : on affiche « **environ X sur 10 (entre a et b)** », où la fourchette est l'intervalle de Wilson à 95 % arrondi à l'entier sur 10. Jamais de pourcentage nu. **Jamais « 10 sur 10 » ni « 0 sur 10 »** : on écrit « environ 9 sur 10 ou plus » et « environ 1 sur 10 ou moins ».
- **Courbe par axe** (diction, écoute, posture ; demande de Fred) : blocs de **28 jours consécutifs** à partir du lundi de la première semaine qui a des réponses. Un point par bloc à « environ X sur 10 », la fourchette de Wilson en barre verticale grise, un axe gradué « sur 10 », les étiquettes Mois 1, Mois 2… **Seuls les blocs terminés** (donc figés) ayant au moins 8 réponses sont tracés, plus le bloc en cours, « Ces 4 semaines », s'il a lui aussi au moins 8 réponses. Pas de ligne entre les points, pas de flèche, une couleur neutre. Elle remplace les mini-barres hebdomadaires, qui montraient les creux d'une semaine à l'autre. La carte RDV garde « x sur y » (§5).
- **États par axe, et seulement ces 4 :**
  - « On apprend tes repères » : en calibrage, pour les taux déclaratifs (« On apprend ta voix » est réservé à la calibration acoustique, §4) ;
  - « Trop tôt pour trancher » ;
  - « Ça bouge dans le bon sens » : tendance probable ;
  - « Progrès confirmé ».

  Le vocabulaire est celui de M §4.2, avec les **mots interdits** de M §4.2 et de P §7.3.
- **Tendance probable sur un taux :** P(taux récent > taux ancien) ≥ 0,90, en bêta-binomial avec a priori uniforme, les 28 jours finissant au contrôle contre les 28 jours d'avant. Le contrôle a lieu **chaque dimanche**. La condition doit tenir **3 dimanches de suite** (environ 9 % de fausses alertes, contre environ 21 % avec 2), avec **au moins 8 réponses de chaque côté à chaque contrôle**. Une fois atteinte, la tendance est **maintenue jusqu'au bilan suivant** : elle ne s'éteint jamais entre deux bilans. Avant le premier bilan (phase 5), les contrôles partent de la première réponse de l'axe.
- **« Progrès confirmé » ne se calcule qu'aux bilans** (§7), et jamais sur une auto-évaluation seule (M §1.4).
- **Au quotidien et à la semaine, aucune baisse n'est affichée.** Au bilan, une baisse est dite **sans couleur**, avec un contrôle 5 séances plus tard (M §4.4).

## 4. Mesures de la voix sur l'appareil (D §3-§4)

- **Moteur pur** `js/core/acoustics.js` : un `Float32Array` à 16 kHz en entrée, la détection de parole de D §4.5 en sortie. On en tire :
  - `D`, la durée de parole ;
  - `Σpauses`, `nbPauses` (pauses d'au moins 250 ms) ;
  - le rapport signal/bruit (`snr`) et la saturation ;
  - le débit de lecture `syll/D` ;
  - le % de pause ;
  - le débit articulatoire `syll/(D−Σpauses)` ;
  - le CV de débit, **calculé mais non affiché** (D §4, en observation).

  Il est testé sous Node avec des signaux synthétiques.
- **Décodage dans le navigateur** (`js/audio/analyze.js`) : `decodeAudioData`, puis un `OfflineAudioContext` à 16 kHz en mono.
- **Calibration :** les **3 premières séances après la mise à jour V2** commencent par « Mesure de ta voix », environ 2 min. On y lit le texte de référence en **3 prises**, et on garde la médiane. Le protocole de D §3.4 s'applique en version courte : téléphone posé à 30 cm, même pièce, 2 s de silence avant le bip, et prise refusée si `snr < 20 dB` ou si la saturation dépasse 0,1 %.
  - La ligne de base est la médiane des 3 séances.
  - `SDw = max(mesuré, valeur par défaut de D §3.2)`, puis `MDC95 = 2,77 × SDw`.
- **Contrôle de voix toutes les 6 séances après la calibration :** même bloc avec 3 prises, à la place de l'articulation, pour que la séance reste à environ 5 min. Il **remplace les jalons J7, J14, J30 et J60 de la V1**. Les anciens enregistrements de référence (`kind: 'reference'`) restent valides et sont eux aussi analysés.
- **Affichage diction** (D §4) :
  - « Ton débit : environ 6,1 syll/s (zone de bruit ±0,6). Au départ : 6,8. » ;
  - verdict *plus posé · pas de différence mesurable · plus rapide* ;
  - % de pause ;
  - débit articulatoire toujours affiché à côté du débit de lecture, avec la phrase d'interprétation de D ;
  - une bande grise pour la zone de bruit.

  On ne dit jamais « bredouillement », jamais « intelligible à X % ».

### 4.1 Choix de mise en œuvre (phase 3b)

- **Calendrier** (`js/core/voice-plan.js`, il remplace `dueMilestone` et `referenceSteps`) :
  - calibration tant qu'il y a **moins de 3 séances de calibration valides** ; une séance est valide avec **au moins 2 prises valides** ;
  - contrôle ensuite **toutes les 6 séances comptées** depuis la dernière mesure de voix valide ; un contrôle refusé reste dû ;
  - **jamais deux mesures de voix le même jour** (3 occasions différentes, M §2.2) : une « Encore une ? » le même jour reprend l'articulation ;
  - une **reprise** (3 jours sans) ne porte pas de bloc voix : la mesure reste due ;
  - la source est la liste des **enregistrements** : seule une prise valide est enregistrée (`kind: 'reference'`, `milestone: null`, `voiceCheck`, `sessionNumber`). Le calendrier ne dépend donc ni de la version de l'algorithme, ni d'une réanalyse en cours.
- **Bloc voix** : un seul pas, au **début** de la séance (avant l'échauffement, D §3.4) et sans limite de temps (`untimed` : tout le temps passé compte pour la règle des 60 s). Chaque prise : vibration, 350 ms d'attente, `startRecording`, « Silence… » pendant 2,5 s, puis « Lis maintenant ». Une prise refusée n'est pas enregistrée ; chacune des 3 prises peut être refaite **une fois**. Une pause pendant une prise l'abandonne, et elle repart à zéro sans compter comme un essai.
- **Store `measures`** : une ligne par valeur et par prise, `{ id: 'recordingId:metric:algoVersion', recordingId, sessionId, dateKey, createdAt, kind: 'calibration'|'controle'|'reference-v1', metric, value, algoVersion, snrDb, context }`. Les mesures sont `debit`, `pausePct`, `debitArticulatoire`, `pauseCount` et `cvDebit` (stocké, jamais affiché). `context.leadSilent` dit si Fred a attendu le signal ; `context.forme` arrivera avec la forme du jour (phase 5). `nTakes` n'est pas stocké : les médianes se recalculent toujours depuis les prises.
- **Ligne de base** : médiane des médianes des 3 premières séances valides. La **toute première prise de la toute première séance est écartée** (M §2.2, familiarisation), sauf si cette séance n'a que 2 prises valides (une médiane en demande 2). Les références V1 n'entrent pas dans la ligne de base : leur protocole est différent (pas de silence initial).
- **SDw** (décision du 09/10) : en calibration, `sdWithin(médianes des 3 séances, défaut)`, sans detrend. Ensuite, le bruit s'estime **sans le point jugé** : pour le verdict de la séance n, `SDw = max(sdWithin(séances 1 à n − 1, défaut, { detrend: true }), SDw de calibration)`. Avant le 4ᵉ point de cette série, c'est-à-dire au premier contrôle, on prend le SDw de calibration. Un vrai saut n'élargit donc pas sa propre zone de bruit (6,8 → 6,0 au premier contrôle : « plus posé »). Effet connu : un palier entre dans la série passée et élargit la zone du contrôle suivant ; au contrôle d'après, la droite l'absorbe.
- **Bande** (M §4.3) : zone grise = départ ± MDC95, trait au dernier contrôle, zone probable à 80 % (± 1,28 × SDw). Pour les pauses, la bande est bornée entre 0 et 100 %.
- **Réanalyse** (`js/audio/voice-measure.js`) : à chaque démarrage, en arrière-plan et en attendant la fin d'une séance, toute référence sans mesure à l'`ALGO_VERSION` courante est mesurée (les références V1 avec `V1_REFERENCE_OPTIONS`, en `reference-v1`), puis les mesures des autres versions sont supprimées. Cela couvre le changement d'algorithme, le premier démarrage V2 et l'import d'une sauvegarde v1. La sauvegarde passe au format 2, qui contient `measures`.
- **A/B** : le **premier** enregistrement de référence contre le **plus récent**, d'un autre jour, qu'il vienne de la V1, d'une calibration ou d'un contrôle.
- **Louarn** : « La voix de départ » à la référence J1 ou à la 1re séance de calibration valide ; « Le premier écho » au premier contrôle valide ; « Le grand écho » au premier contrôle valide à 30 séances comptées ou plus. Un souvenir déjà obtenu par J7 ou J30 garde sa date. Les répliques `jal-*` vont au bloc voix : `jalon:due` à l'accueil quand une mesure est due, `jalon:1` à la toute première mesure, `jalon:7` au premier contrôle, puis `jalon:14`, `jalon:30` (contrôle à 30 séances ou plus) et `jalon:60+`.

## 5. Retour après RDV, version résultats (R §1.3, §5)

- Après « Avant un RDV », un bouton **« Je sors du RDV »** apparaît sur l'accueil pendant 4 h. Il mesure la durée réelle (R). **Pendant ces 4 h, seul le bouton s'affiche.**
- La carte de questions arrive **dès le tap** sur le bouton, sinon **une fois les 4 h passées**, et reste proposée 3 jours au plus. **Une question à la fois, 5 au maximum filtre compris, environ 15 s** :
  1. **Filtre** (R §1.3, premier écran) : « C'était un premier RDV avec un prospect ? » Oui / Non (suivi d'un client, réseau, etc.) / Passer. Pas de « Je ne sais pas » ici.
  2. « Objectif atteint ? », si un objectif a été saisi ;
  3. « La suite ? » : signé ou date fixée / non clair / flou ;
  4. « Le budget ? » : par qui et quand, en tranches (R) ;
  5. « On t'a fait répéter ? » ;
  6. **en dernier**, « Fini à l'heure prévue ? », remplacée par « La durée annoncée ? » (30 / 45 / 60 / 90 min) quand le bouton a mesuré la durée, avec 5 min de tolérance avant « Jusqu'à 10 min de plus ». Cette question **saute** si l'on dépasserait 5 questions (filtre + objectif + suite + budget + répéter).

  Si le filtre répond **Non** (réseau, BNI, suivi client), seuls « Objectif atteint ? » et « On t'a fait répéter ? » sont posés, et ce RDV n'entre pas dans les taux de la suite, du budget et de la durée. Sauf au filtre, il y a toujours « Je ne sais pas » et « Passer ». Les questions sont mot pour mot celles de R §1.3.
- La carte RDV de Progression applique les règles d'affichage de R §5.2 : « x sur y », le mois 1 (28 jours consécutifs à partir du lundi de la première semaine avec réponses) à côté des 4 dernières semaines, et la source sur chaque ligne. « Je ne sais pas » compte dans le total sans compter en réussite, **sauf pour « On t'a fait répéter ? »**, où il reste hors du total (l'historique V1 n'avait pas cette option).
- **Interdit :** enregistrer un vrai RDV (R §4.5). L'appli le rappelle une fois.

## 6. Posture au micro, point de la semaine, réplique éclair (P §6 mesure 1, M §3.2, R §3.3)

- **Silences et délais au micro**, sans rien enregistrer ni stocker d'audio, seulement des chiffres. Dans les exercices de posture qui ont un silence cible (P liste P03, P04, P09, P14, P18, P22, P23 et P24 ; vérifier les ids dans le contenu), on mesure en direct le niveau du micro (`AnalyserNode`). On en tire le **silence tenu** après la question (en secondes) et le **délai avant de répondre**. Cela sert d'indicateur objectif de soutien pour l'axe posture.
- **Point de la semaine**, à la dernière séance de chaque thème, soit toutes les 4 séances. Il remplace le bloc 3 de cette séance et ne s'ajoute pas. On alterne deux formats :
  - **A, parole spontanée** de 45 s sur une question tirée d'un lot de 12, avec mesure du % de pause et du nombre de pauses en parole non lue (ni débit ni syllabes), plus 1 tap « Si tu avais un RDV demain : Pas prêt / Plutôt prêt / Prêt » (M §3.2) ;
  - **B, réplique éclair** de 90 s (R §3.3) : la synthèse vocale dit une phrase de prospect et Fred répond. On mesure le délai de réponse, la durée et le silence tenu, puis Fred coche 2 cases en réécoutant sa prise.

### 6.1 Choix de mise en œuvre (phase 4)

- **Exercices mesurés au micro** (`js/core/live-silence.js`, `POSTURE_MIC`). La liste a été vérifiée contre `exercises.json` : on garde les exercices dont la consigne a un silence ou une pause **chiffrés**.
  - **Délai de 2 s** : P03.
  - **Silence** : P04 (5 s), P14 (3 s), P22 (4 s, après un non), P23 (8 s) et P24. P24 n'a pas de durée chiffrée : on prend 4 s, comme P22.
  - **Écartés** : P09, parce que le passage d'écoute qu'il suppose n'est pas lu dans le bloc posture ; P18, monologue de 60 s avec des pauses de réflexion et sans durée de silence.
  - La mesure est **facultative** : un tap la lance. Ce tap donne aussi le geste qu'exige l'AudioContext.
- **Déroulé de la mesure au micro**
  - On écoute la pièce pendant 1,5 s.
  - Puis on fixe le seuil. **Avec calibration** : `speechThreshold(noiseDb, speechDb)` de la dernière prise de voix valide, ces niveaux étant stockés dans `context` des mesures. Le seuil reste au moins 6 dB au-dessus du bruit du jour. **Sans calibration** : bruit de la pièce + 12 dB, si bien que la parole doit dépasser le bruit de 15 dB.
  - Si la pièce dépasse −25 dB, aucune mesure n'est faite.
- **Le « bip » des consignes** est une vibration de 50 ms à la cible : moins de 150 ms, elle ne coupe pas un silence. Aucun son n'est joué et aucun chiffre ne s'affiche pendant l'exercice.
- **Silence tenu** : il démarre après au moins **1,5 s** sans parole. En dessous, c'est une pause dans la phrase : `measureSilenceAfter` s'arrêterait au premier trou de 250 ms. Il s'arrête quand Fred reparle (la phrase suivante, puis « Merci » pour finir). **Délai (P03)** : `measureSilenceAfter`, depuis l'affichage de la question.
- **Ce qui est stocké** : seulement des nombres, en `kind: 'posture' | 'eclair'`, `metric: 'silenceTenu' | 'delaiReponse' | 'dureeReponse'`, avec la version `live-1`.
  - La réanalyse des Blobs ne les touche jamais.
  - Une mesure interrompue, abandonnée ou qui dépasse le temps n'est pas stockée. Une pause arrête la mesure.
- **Point de la semaine** (`js/core/weekly-point.js`)
  - Il est dû à la séance 4t pour le thème t. Si une mesure de voix ou une reprise occupe cette séance, il est reporté aux séances 4t + 1 à 4t + 3.
  - Seule une séance **comptée** le consomme. Un point passé compte comme fait : la mesure ne doit pas devenir une dette.
  - Les formats alternent A, B, A… dans l'ordre des points faits. Une question ou une réplique n'est jamais tirée deux fois dans un cycle de 72 séances.
  - Le point remplace le bloc 3 (`bloc3: null` : l'alternance écoute/posture continue ensuite) et prend un pas sans limite de temps.
- **A, parole spontanée** : même protocole que la mesure de voix (vibration avant le micro, 2 s de silence), 45 s au plus.
  - La prise est enregistrée (`kind: 'spontane'`) et réanalysée si `ALGO_VERSION` change.
  - Mesures : `pausePctSpontane`, `pauseCountSpontane`, `dureeSpontane`.
  - Le tap « Si tu avais un RDV demain » est stocké dans `weeklyPoint.ready`.
- **B, réplique éclair**
  - Le compteur écoute la pièce 1 s, puis la synthèse vocale dit la réplique (sans voix, Fred la lit une fois).
  - **Ensuite** l'enregistrement démarre (`kind: 'eclair'`, pour la réécoute). Le délai se compte depuis la fin de la réplique, sa traîne de 300 ms étant ignorée.
  - Une reprise avant 5 s de silence est comptée (« repris après x s »). 5 s de silence donnent le signal et la fin.
  - Les deux cases sont stockées dans `weeklyPoint.criteres`.
- **Progression**
  - **Posture** : une ligne « Mesuré au micro ». Elle donne la valeur seule sous 3 mesures, puis la médiane des 3 dernières, le départ (médiane des 3 premières) et « tenu jusqu'au signal x fois sur les 5 dernières ».
  - **Carte « Ton point de la semaine »** : « Prêt » x fois sur les 4 derniers points, le % de pause en parole spontanée dès 3 mesures, et les cases de la réplique éclair en « x sur y ».

## 7. Bilans de progrès : séances 24, 48 et 72 (M §3.3-§4.6)

> La fin de chaque bloc remplace S30 et S60 de M, puisque le programme fait désormais 18 × 4 séances.

- **10 min.** Le bilan **remplace** la séance du jour et compte comme une séance. Il est annoncé la veille.
- **Étapes, d'après M §3.3 :**
  1. forme du jour ;
  2. texte de référence ;
  3. **textes inédits A, B et C**, dans un ordre aléatoire, mêmes textes à chaque bilan, et comparés texte par texte (débit et pauses) ;
  4. se présenter en 60 s (spontané) ;
  5. **passage d'écoute réservé**, puis « faits clés retrouvés » sur 3 ;
  6. auto-grille des 6 compétences, en 3 niveaux, reprise de R §2.2 ;
  7. A/B à l'aveugle par Fred ;
  8. rapport de progrès.
- **Rapport de progrès sur 1 écran** (M §4.6), en 3 étages : sûr / mesuré / ressenti, **une seule action** proposée, le détail à un tap. Le **verdict par axe** suit la règle de combinaison de M §1.4. Les indicateurs principaux sont **figés au bilan de calibration** :
  - **diction** : débit de lecture, zone de bruit de Fred ;
  - **écoute** : faits clés retrouvés ;
  - **posture** : comparaison par le proche si elle existe, sinon « pas encore mesurable », avec le silence tenu au micro en soutien ;
  - **RDV** : part des RDV sans faire répéter.
- **Écoute à l'aveugle par un proche**, en option aux bilans 48 et 72 (M §3.4) : 6 paires plus 1 paire leurre, 2 choix forcés plus « Je ne sais pas ». Lecture : 6 sur 6 = confirmation, 5 sur 6 = tendance. Le proche tient le téléphone de Fred : rien ne sort de l'appareil.
- **Contenu à rédiger (pack « Mesure »)** : 3 textes inédits A, B et C (de longueur proche du texte de référence, syllabes comptées), 3 passages d'écoute réservés avec chacun 3 faits clés, 12 questions de parole spontanée, 12 répliques de prospect pour la réplique éclair, et les 6 items de l'auto-grille. Fichier : `docs/experts/expert-contenu-mesure.md`, importé dans `content/fr/mesure.json`.

### 7.1 Choix de mise en œuvre (phase 5)

- **Calendrier** (`js/core/bilan-plan.js`)
  - Le bilan est dû à la séance 24k. Il est reporté aux 3 séances suivantes après une reprise.
  - C'est une séance `daily` qui porte `bilan: { kind: 'bilan', index, order, seed, forme, faits, grille, ab, proche, report, controlDueAt }` : elle compte comme une séance partout (stades, Parcours, objectif).
  - Seule une séance comptée consomme le bilan.
  - Il est annoncé dans la bulle de l'accueil : « Demain : ton bilan de 10 min. » une fois faite la séance d'avant, et « Aujourd'hui : … » le jour même, mode discret compris.
- **Pas de doublon**
  - La lecture du texte de référence au bilan est une prise `reference` avec `voiceCheck: 'bilan'`. Elle compte comme une mesure de voix avec **une seule prise**, et le prochain contrôle repart du bilan.
  - Le point de la semaine est reporté.
  - Le bilan de contrôle, lui aussi, remplace la séance.
- **Étapes** (environ 7 min 30 plus le rapport) : forme du jour ; référence ×1 et inédits A, B et C, avec le protocole de la voix ; se présenter en 60 s ; passage réservé ; auto-grille ; A/B ; rapport.
  - **Inédits** : leur ordre est un mélange déterministe, et la graine est stockée.
  - **Se présenter** : la prise est enregistrée, sans tap « Prêt ».
  - **Passage réservé** : ER1, ER2 puis ER3, lu par la synthèse vocale, ou une fois à l'écran sans voix. Puis 30 s de reformulation et 3 cases.
  - **Auto-grille** : une compétence à la fois, repère 1 à 3 ou « Non observé ».
  - **A/B** : la toute première lecture contre celle du jour ; le choix est stocké.
- **Après la relecture finale**
  - Une étape par bloc (`bilan:forme`, `bilan:lecture:1`…) : « Passer ce bloc » ne saute que l'étape en cours.
  - Un bilan arrêté par « J’arrête là » reste dû (`bilan.complete: false`), sauf si toutes ses étapes de mesure (lectures, présentation, écoute, auto-grille) sont faites. Un bilan allé au bout est fait, même avec des étapes passées. Le rapport n'est calculé que sur un bilan complet.
  - Un bilan le jour d'une mesure de voix valide réutilise sa lecture (`bilan.refRecordingId`) : jamais deux lectures du texte de référence le même jour.
  - Pas de bilan sans pack « Mesure ».
  - Annonce : d'après `bilanDue` (rien un jour de reprise, un bilan reporté est annoncé ; un bilan commencé et arrêté le jour même « reste à faire »).
  - L'écoute par un proche n'est proposée qu'avec au moins 5 paires réelles.
- **Mesures du bilan** : `kind: 'bilan'`, le texte dans `context.texte` (`fr.REF1`, `fr.TA`… ou `presentation`), avec `context.forme` et `context.bilan`.
  - Les métriques sont celles de la lecture, ou celles de la parole spontanée pour la présentation.
  - Elles sont réanalysées si `ALGO_VERSION` change.
- **Verdict par axe** (`js/core/evaluation.js`) : chaque indicateur principal devient un z orienté.
  - **Diction** : RCI de la dernière mesure de voix contre la ligne de base, la lecture unique du bilan restant en détail.
  - **Écoute** : faits clés contre le bilan précédent. Faute de bruit connu, la convention est +2 faits = 1,96 et +1 fait = 1,28.
  - **Posture** : proche, « envie d'écouter la suite » ; n sur n = 1,96, n − 1 = 1,28, n ≥ 5.
  - **RDV** : P(4 dernières semaines > mois 1) en bêta-binomial ; ≥ 0,975 = 1,96 et ≥ 0,90 = 1,28.
- **Familles de soutien** : le ressenti du jour (« Clair », « Repéré », « Posé ») en tendance depuis le bilan précédent ; l'A/B de Fred, qui ne compte qu'en positif (un choix isolé est trop fragile pour contredire) ; le proche en compréhension, pour la diction ; le silence tenu au micro, pour la posture ; les objectifs atteints, pour les RDV.
- **Réplication** : tendance au bilan précédent, ou 2 inédits sur 3 dont le RCI par texte atteint 1,28 contre le bilan précédent. Ce RCI utilise le SDw de la voix rapporté à la valeur du texte. Le premier bilan est la référence des inédits.
- **Baisse de la diction au bilan**
  - Elle est dite sans couleur, avec la forme du jour, et `controlDueAt = séance + 5`.
  - Le **bilan de contrôle** (forme, référence et inédits dans l'ordre du bilan, 3 min) compare sa lecture du texte de référence à la ligne de base : soit « La baisse se confirme… » avec une piste, soit « ne se retrouve pas ».
- **`sinceKey`** : la tendance des taux part du dernier bilan (sur les cartes de Progression).
- **Rapport** : figé dans la séance à la fin du bilan, recalculé seulement après l'écoute du proche.
  - Une seule action, par priorité : contrôle après une baisse ; proche aux bilans 2 et 3 ; compétence la plus basse de l'auto-grille ; sinon « Continue ».
  - La phrase de réalisme ne paraît qu'au premier bilan.
  - Louarn n'a pas de réplique `bilan` dans `louarn.json` : il se tait.
- **Proche** (`#/proche/<id>`)
  - Les paires réelles reprennent chaque texte contre le premier bilan (la référence contre la toute première lecture), puis contre le bilan précédent, 6 au plus. Cela fait 5 paires au bilan 48 et 6 au bilan 72.
  - La paire leurre est **la même prise du jour deux fois**, car le bilan n'a qu'une prise par texte. Si le proche la tranche aux deux questions, le détail le note, sans le lui dire.
  - Il faut au moins 5 paires pour lire un résultat.

## 8. Architecture et données

- **Le cœur reste pur et testé** sous Node : `stats.js` (Wilson, bêta-binomial, RCI et MDC), `acoustics.js`, `louarn.js` (stades, souvenirs, répliques), `evaluation.js` (verdicts d'axe), plus des extensions de `planner.js` (calibration, contrôle de voix, point de la semaine, bilans).
- **Base de données :** IndexedDB **passe en v2**, par migration **additive** : on ajoute un store `measures` (une ligne par valeur, jamais agrégée au stockage, M §5.1). Aucune donnée existante n'est modifiée.
- **Les nouveaux fichiers servis vont dans `ASSETS`** : le test PWA le vérifie.
- **Aucune dépendance npm, aucune requête réseau nouvelle.** Le mode avion doit tout faire marcher.

## 9. Phases de livraison (une branche chacune, relecture après chaque phase)

| Phase | Contenu | Pourquoi dans cet ordre |
|---|---|---|
| 1 | `stats.js`, tableau honnête (§3), retour RDV v2 (§5) | C'est la base statistique dont toutes les autres phases ont besoin |
| 2 | Louarn, Parcours et souvenirs (§1-2) | Visible et motivant, indépendant du reste |
| 3 | Moteur acoustique, calibration, contrôle de voix, affichage diction (§4) | C'est le cœur de la mesure objective |
| 4 | Posture au micro, point de la semaine, réplique éclair (§6) | Demande le contenu du pack « Mesure » |
| 5 | Bilans 24, 48 et 72, rapport, proche (§7) | Intègre tout le reste |
