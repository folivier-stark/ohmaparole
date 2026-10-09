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

## 5. Retour après RDV, version résultats (R §1.3, §5)

- Après « Avant un RDV », un bouton **« Je sors du RDV »** apparaît sur l'accueil pendant 4 h. Il mesure la durée réelle (R).
- Ensuite, **une carte, une question à la fois, 5 au maximum, environ 15 s** :
  1. « Objectif atteint ? », si un objectif a été saisi ;
  2. « La suite ? » : signé ou date fixée / non clair / flou ;
  3. « Budget abordé ? » : par qui et quand, en tranches (R) ;
  4. « Fini à l'heure ? » : sautée si la durée a été mesurée par le bouton ;
  5. « On t'a fait répéter ? ».

  Il y a toujours « Je ne sais pas » et « Passer ». Les questions sont mot pour mot celles de R §1.3.
- La carte RDV de Progression applique les règles d'affichage de R §5.2 : « x sur y », le mois 1 à côté des 4 dernières semaines, et la source sur chaque ligne.
- **Interdit :** enregistrer un vrai RDV (R §4.5). L'appli le rappelle une fois.

## 6. Posture au micro, point de la semaine, réplique éclair (P §6 mesure 1, M §3.2, R §3.3)

- **Silences et délais au micro**, sans rien enregistrer ni stocker d'audio, seulement des chiffres. Dans les exercices de posture qui ont un silence cible (P liste P03, P04, P09, P14, P18, P22, P23 et P24 ; vérifier les ids dans le contenu), on mesure en direct le niveau du micro (`AnalyserNode`). On en tire le **silence tenu** après la question (en secondes) et le **délai avant de répondre**. Cela sert d'indicateur objectif de soutien pour l'axe posture.
- **Point de la semaine**, à la dernière séance de chaque thème, soit toutes les 4 séances. Il remplace le bloc 3 de cette séance et ne s'ajoute pas. On alterne deux formats :
  - **A, parole spontanée** de 45 s sur une question tirée d'un lot de 12, avec mesure du % de pause et du nombre de pauses en parole non lue (ni débit ni syllabes), plus 1 tap « Si tu avais un RDV demain : Pas prêt / Plutôt prêt / Prêt » (M §3.2) ;
  - **B, réplique éclair** de 90 s (R §3.3) : la synthèse vocale dit une phrase de prospect et Fred répond. On mesure le délai de réponse, la durée et le silence tenu, puis Fred coche 2 cases en réécoutant sa prise.

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
