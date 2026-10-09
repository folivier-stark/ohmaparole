# OhMaParole : spec V1

> Appli perso d'entraînement quotidien à la diction, à l'écoute et à la présence, sur Android.
> Date : 09/10/2026. Sources détaillées, qui font foi pour le contenu exact :
> - `docs/experts/expert-contenu.md` : programme et bibliothèque d'exercices (orthophoniste + coach)
> - `docs/experts/expert-ux.md` : écrans, déroulés, textes de l'interface, direction visuelle (designer TDAH)
> - `docs/experts/expert-tech.md` : architecture, données, audio, hors ligne, hébergement (architecte PWA)
>
> Ce document **tranche** les points où les experts divergent (voir §9). Si un rapport d'expert contredit cette spec, **c'est la spec qui gagne**.

---

## 1. Objectif

Fred, TDAH, veut progresser **chaque jour** en élocution, diction, écoute, présence et posture, pour ses rendez-vous **en face à face avec 1 à 3 personnes**. Plus tard, il veut aussi travailler l'anglais et l'espagnol.

**Critère de succès V1 :** Fred pratique **au moins 15 jours par mois pendant 2 mois**. Mesures : la comparaison J1/J30 à l'aveugle, et sa réponse à « On t'a fait répéter ? » après ses rendez-vous.

**Non-objectif :** mesurer la diction de façon « scientifique ». L'appli ne donne aucun score de voix.

## 2. Principes non négociables

1. **Deux boutons principaux** sur l'accueil : **Go · 5 min** et **Avant un rendez-vous · 90 s**.
2. **Zéro décision avant d'agir** : l'appli choisit le contenu du jour.
3. **La journée compte dès 60 s de pratique.** Une séance arrêtée après 60 s vaut une séance complète.
4. **Aucun compteur ne retombe à zéro.** On affiche le nombre de jours pratiqués dans le mois et le cumul. Pas de série de jours consécutifs, pas de rouge, pas de croix.
5. **Une prise, pas de refaire.**
6. **Ne pas avoir à lire pendant l'effort** : une ligne de consigne, une voix de guidage (synthèse vocale) et des vibrations.
7. **Rien ne sort du téléphone** : pas de compte, pas de serveur, pas de données envoyées.

## 3. Écrans

| Code | Écran | Action principale |
|---|---|---|
| O1–O4 | **Premier lancement, moins de 2 min** : bienvenue → ton pourquoi → ta voix de départ (texte de référence, §5.3) → ton rappel (§7) | Un bouton par écran |
| A | **Accueil** : « X jours ce mois-ci › », une ligne de contexte qui change, les 2 boutons dans la zone du pouce, une petite roue de réglages | Go |
| S | **Séance** : nom du bloc, une ligne, minuteur en anneau, 3 segments de progression | Pause, puis Reprendre / Passer ce bloc / J'arrête là |
| F | **Fin** : message (8 variantes), le point du jour se remplit, réécouter la prise du jour, comparaison A/B les jours de jalon | Fermer |
| R | **Avant un RDV** : même gabarit, sans enregistrement, écran final « Tu y vas. » | J'y vais |
| P | **Progression** (§6) | Écouter |
| Z | **Réglages** : pourquoi, rappel, voix de guidage, vibrations, **sauvegarder / restaurer**, stockage protégé (oui/non), « À savoir » (note sur le bredouillement + garde-fous vocaux) | — |

Les états de l'accueil (déjà fait, hier sans séance, 3 jours sans ou plus, jour de jalon, retour d'un RDV) sont décrits dans `expert-ux.md` §1, et les textes de l'interface dans `expert-ux.md` §5.

## 4. Les séances

### 4.1 Go · 5 min (300 s)

| Temps | Bloc | Déroulé | Contenu |
|---|---|---|---|
| 0:00–1:00 | **Échauffement** | 2 × 30 s : 1 exercice souffle/voix + 1 exercice mâchoire/langue/lèvres, pas le même que la veille | E01–E12 |
| 1:00–3:00 | **Articulation** | 30 s **lentement en exagérant** (pas enregistré) → 30 s **à vitesse normale, enregistré** → réécoute automatique avec **un seul point d'attention** → 1 tap **Clair / Moyen / Brouillon** | A01–A28 selon la semaine du programme |
| 3:00–5:00 | **Écoute** ou **Posture**, en alternance **d'une séance à l'autre** | **Écoute** : la synthèse vocale lit un passage, **texte masqué** → Fred reformule à voix haute en 30 s → l'appli affiche la reformulation de référence et le détail caché → 1 tap « Repéré ? »<br>**Posture** : téléphone posé, guidage par la voix et les vibrations | L01–L12 / P01–P12 |

**Jours de jalon** : le texte de référence remplace l'item d'articulation du jour (§5.3).

### 4.2 Reprendre · 2 min

Proposé quand Fred n'a pas pratiqué depuis 3 jours ou plus : échauffement de 60 s, puis une seule prise d'articulation avec réécoute. La séance d'après redevient normale. Aucun rattrapage, aucun nombre de jours manqués affiché.

### 4.3 Avant un rendez-vous · 90 s

Déroulé tiré de `expert-contenu.md` §3.5 :
1. **0:00–0:30, objectif** : une phrase tapée ou dictée au clavier, facultative (« À la fin de ce rendez-vous, je veux… »).
2. **0:30–1:00, ancrage** : un cercle qui respire, 3 expirations longues.
3. **1:00–1:30** : la **consigne d'écoute** du jour (C01–C10, jamais la même deux fois de suite), puis « Ta première phrase, lentement. », puis le pourquoi de Fred.

Pas d'enregistrement. **Compte comme un jour pratiqué** (marqué d'un losange dans le calendrier).

### 4.4 Retour terrain (1 tap)

À la première ouverture de l'appli, au moins 1 h après un « Avant un RDV » : **« On t'a fait répéter ? » Non / Une fois / Plusieurs fois** (bouton Passer disponible). C'est le seul indicateur tiré de la vraie vie.

## 5. Contenu et programme

### 5.1 Programme

- **18 thèmes de 4 séances = 72 séances par cycle** (décision de Fred du 09/10) : Fondations 1-6 (`expert-contenu.md`), Charisme et confiance 7-12 (`expert-contenu-charisme.md`), Situations de RDV 13-18 (`expert-contenu-situations.md`). **Le programme avance au nombre de séances, pas au calendrier.** L'objectif est de 72 séances, puis viennent l'anglais et l'espagnol. Un jour manqué ne met jamais « en retard ».
- Après le cycle 1, le programme repart en semaine 1, avec tous les items débloqués.
- **Coupé de la V1** (prévu en V1.1) : la pondération par les notes « Brouillon », le « niveau + » et l'ajout de ses propres phrases. Les notes sont **enregistrées dès la V1** pour pouvoir s'en servir ensuite.

### 5.2 Tirage

Le tirage est déterministe, avec la date du jour comme graine : jamais deux fois de suite le même item, priorité aux items de la semaine de programme en cours.

### 5.3 Texte de référence (fixe, ne change jamais)

C'est le texte de `expert-contenu.md` §4.1 : présentation pro, puis « Les chaussettes de l'archiduchesse… ». Il est enregistré à l'onboarding (J1).

> **Amendé par la spec V2 §4 (phase 3b) :** les jalons des séances 7, 14, 30, puis toutes les 30 séances, ne sont plus planifiés. Le texte est désormais lu au bloc « Mesure de ta voix », en 3 prises : aux **3 premières séances après la mise à jour** (calibration, 3 jours différents), puis à un **contrôle toutes les 6 séances**. Les enregistrements J1, J7, J14, J30… déjà faits restent valides : ils figurent dans la frise et l'écoute A/B, et sont analysés eux aussi.

### 5.4 Motivation

- **Le pourquoi de Fred** apparaît :
  - en rotation sur l'accueil, environ un jour sur trois ;
  - au démarrage de séance, environ une séance sur trois ;
  - à la fin de « Avant un RDV » ;
  - au retour après une absence.
- Toutes les 7 séances, l'appli demande « Ton pourquoi tient toujours ? » : Oui, ou Je le reformule.
- **Les 12 phrases de rappel** (`expert-contenu.md` §5) tournent dans la ligne de contexte de l'accueil.

## 6. Progression (1 écran)

1. **« 18 jours pratiqués en octobre »** en très gros, et en dessous « 52 séances depuis le début ».
2. **Calendrier du mois** :
   - rond plein = séance ;
   - losange = Avant un RDV ;
   - cercle gris clair = jour sans ;
   - anneau = aujourd'hui.
3. **Ta voix** : une frise J1 · 7 · 14 · 30 · 60… Pour chaque jalon atteint, **écoute A/B à l'aveugle** (J1 contre le jalon, dans un ordre au hasard) → « Laquelle est la plus claire ? » → révélation. La durée de chaque prise est affichée comme **indice**, jamais comme score.
4. **En rendez-vous** : les réponses aux 6 derniers « On t'a fait répéter ? », sous forme de points, sans pourcentage.

**Jamais affiché :** score de diction, record, série. Les courbes autorisées sont définies dans `2026-10-09-ohmaparole-tableau-design.md`.

## 7. Rappel quotidien

Une page web **ne peut pas** déclencher de rappel fiable sans serveur (`expert-tech.md` §8).

- **Solution choisie :** un **événement récurrent Google Agenda**, chaque jour à l'heure choisie. Titre : `OhMaParole 5 min, pour : [pourquoi, coupé à 40 caractères]`. Description : lien vers `#/session/daily`. Claude peut le créer via le connecteur Google Agenda, **avec l'accord de Fred**.
- **Solution de secours :** une alarme Android posée à la main, avec ce libellé copié depuis l'écran O4.
- Le manifest déclare **2 raccourcis d'icône** : un appui long donne « Go » ou « Avant un RDV ».
- ⚠️ **Premier test sur le téléphone :** le lien de l'Agenda doit ouvrir l'appli installée, et pas un onglet Chrome. Si ce n'est pas le cas, l'Agenda ne sert que de rappel et Fred tape sur l'icône.

## 8. Technique (détail dans `expert-tech.md`)

| Sujet | Décision |
|---|---|
| Code | **JavaScript natif en modules ES, sans build et sans dépendance à l'exécution.** Node ne sert qu'aux tests (`node --test`), au serveur local et au déploiement. |
| Structure | `js/core/` est **pur** : moteur de séance, planificateur, progression, dates. Il est testé sous Node. Le reste est rangé dans `js/data/` (IndexedDB, contenu, sauvegarde), `js/audio/` (enregistreur, lecteur), `js/platform/` (maintien de l'écran allumé, stockage, rappel) et `js/ui/screens/*`. |
| Données | Base IndexedDB `ohmaparole` avec 4 stores : `meta`, `sessions`, `recordings`, `audio` (Blobs). L’objectif RDV et le retour terrain sont portés par la séance `prerdv`. La progression est **calculée, jamais stockée**. Les jours sont des clés en **heure locale**. |
| Contenu | `content/program.json` ne dépend d'aucune langue. `content/fr/exercises.json` reprend l'intégralité de la bibliothèque de `expert-contenu.md` §3, ids préfixés `fr.`. La V2 en anglais ou espagnol consiste à ajouter `content/en/` ou `content/es/`. |
| Audio | `audio/webm;codecs=opus`, 32 kb/s, **contrôle automatique de gain désactivé**, micro coupé après chaque prise, **écran maintenu allumé** pendant la séance. |
| Voix de guidage | `speechSynthesis` en fr-FR, pour les consignes et les passages d'écoute. Elle peut se couper. |
| Hors ligne | Service worker qui sert tout depuis le cache, avec un précache versionné. Les polices Google Fonts (Lexend, Atkinson Hyperlegible) sont **mises en cache par le SW** au premier lancement. Une mise à jour ne s'applique jamais pendant une séance. |
| Stockage | `navigator.storage.persist()` est appelé après la première séance, puis à chaque démarrage. Son état est visible dans les Réglages. |
| Sauvegarde | Export d'**un fichier JSON** (audio en base64), import par fusion. Une ligne apparaît sur l'accueil si la dernière sauvegarde date de plus de 14 jours. |
| Visuel | Palette sable / granite / Iroise / ajonc, avec mode sombre (`expert-ux.md` §6). Gros boutons de 80 dp dans le tiers bas de l'écran, cibles de 56 dp minimum. |
| Hébergement | **GitHub Pages** sur le compte `folivier-stark`, dépôt public **`ohmaparole`** → `https://folivier-stark.github.io/ohmaparole/` (le code et les textes d'exercices sont visibles, **aucune donnée perso**). `npm run deploy` lance les tests, met la version à jour, puis fait le push. |
| Tests | `node --test` sur le moteur de séance, la rotation, la règle des 60 s, les jalons, les dates (y compris entre 00h et 02h), la validité du contenu et l'exhaustivité du précache. Plus une checklist manuelle de 8 points sur Android (`expert-tech.md` §9). |

## 9. Arbitrages entre experts

| Divergence | Tranché |
|---|---|
| Semaine validée à partir de 4 séances sur 7 (contenu) **ou** jours pratiqués dans le mois et cumul (UX) | **Jours du mois et cumul.** Une semaine « non validée » serait un échec de plus. |
| Articulation : lent puis normal (contenu) **ou** 2 prises normales (UX) | **Lent sans enregistrer, puis normal enregistré.** Il n'y a qu'une seule prise. |
| Écoute : passages longs lus par la synthèse vocale (contenu) **ou** 2 phrases courtes (UX) | **Les passages L01–L12 du contenu**, lus par la synthèse vocale. |
| Texte de référence : version « route de Romillé » (UX) **ou** présentation pro (contenu) | **La présentation pro**, la plus proche des vrais rendez-vous. |
| Jalons en jours calendaires (tech) **ou** en séances (UX) | **En séances.** Cohérent avec un programme qui avance au nombre de séances. |
| Après un RDV : « Tu t'es senti comment ? » (UX) **ou** « On t'a fait répéter ? » (contenu) | **« On t'a fait répéter ? »**, un fait observable plutôt qu'une impression. |
| Alternance écoute / posture selon le jour pair ou impair (contenu) **ou** d'une séance à l'autre (UX) | **D'une séance à l'autre.** L'alternance continue même après une absence. |
| Rappel par une alarme Horloge (UX) **ou** par Google Agenda (tech) | **Google Agenda**, avec l'alarme en secours (§7). |

## 10. Hors V1 (à ne pas construire)

- Anglais et espagnol : en V2, après 60 séances.
- Analyse automatique de la voix : débit, « euh », transcription.
- Caméra ou miroir pour la posture.
- Coach IA, notifications web, compte ou synchronisation.
- Personnalisation des séances, bibliothèque à parcourir, statistiques et graphiques.
- Défi bonus, badges, niveaux, thèmes de couleur, sons d'ambiance. Seules les vibrations et la voix de guidage sont gardées.
- Pondération par les notes « Brouillon », niveau + et phrases perso : prévus en V1.1.

## 11. Risques et parades

| Risque | Parade |
|---|---|
| 🔴 Perte des données : téléphone changé ou stockage vidé | `persist()`, export JSON et rappel de sauvegarde tous les 14 jours |
| 🔴 Micro coupé quand l'écran se verrouille | Écran maintenu allumé, la prise s'arrête proprement si la page passe en arrière-plan. **À vérifier sur le téléphone.** |
| 🟠 Le lien Agenda ouvre Chrome et pas l'appli | Raccourcis d'icône, et l'Agenda ne sert que de rappel |
| 🟠 Voix de synthèse peu naturelle | Acceptable en V1. En V1.1, possibilité de faire enregistrer les passages par un proche. |
| 🟠 Projet perso qui grignote le temps du cash | Le dev est fait par Claude. **Fred ne donne que 2 créneaux de 20 min** : un test sur le téléphone, puis l'installation et le rappel. |
| 🟡 Minuteurs qui gèlent en arrière-plan | Temps calculé par différence d'horodatages, séance sauvegardée bloc par bloc |

## 12. Garde-fous santé

Ils se trouvent dans Réglages → « À savoir », et la note sur le bredouillement s'affiche **une seule fois**, après la 3ᵉ séance (`expert-contenu.md` §0 et §7) : arrêter en cas de douleur ; consulter si un enrouement dure plus de 3 à 4 semaines ; **l'appli ne remplace pas un bilan orthophonique**.
