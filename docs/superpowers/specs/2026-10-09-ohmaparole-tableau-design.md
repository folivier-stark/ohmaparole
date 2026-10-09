# OhMaParole : tableau de bord, axes de progrès et objectif 60 (ajout à la spec V1)

> Demandes de Fred du 09/10/2026 :
> 1. une courbe d'évolution et un objectif à atteindre, fixé à **60 séances**, qui débloquent l'anglais et l'espagnol ;
> 2. voir ses progrès **pour chacun de ses besoins** (élocution et diction, écoute, posture et présence, rendez-vous) et **pour chacun de ses objectifs de RDV**.
>
> Cet ajout **modifie** la spec V1 (`2026-10-09-ohmaparole-design.md` §6). La ligne « Jamais affiché : courbes » est remplacée par la règle ci-dessous.

## Règle d'honnêteté

**Aucune courbe de « qualité de diction ».** L'appli ne mesure pas la voix (`expert-contenu.md` §4.3). On ne trace que ce qui est :
- **exact** : le nombre de séances ;
- **déclaré**, et étiqueté « ton ressenti » : clair, détail repéré, posé ;
- **observé** : le retour après un rendez-vous.

Pas de rouge et pas de flèche vers le bas. Une hausse peut être signalée (« en hausse »), une baisse jamais.

## Les 4 axes et leurs données

| Axe (besoin de Fred) | Indicateur | Source | Valeurs |
|---|---|---|---|
| **Diction et élocution** | % de prises « Clair » | Note de fin d'articulation, déjà en place | `clair` / `moyen` / `brouillon` |
| **Écoute** | % de « détail caché repéré » | « Repéré ? » de l'écoute, déjà en place | `oui` / `non` |
| **Posture et présence** | % de « posé » | **Nouveau :** 1 tap à la fin du bloc posture, « Tu t'es senti posé ? Oui / Un peu / Pas encore » | `pose` / `unpeu` / `pasencore` |
| **En rendez-vous** | % de RDV sans qu'on te fasse répéter, et % d'objectifs atteints | `feedback`, déjà en place. **Nouveau :** `goalReached` | `non` / `une` / `plusieurs` ; `oui` / `partie` / `non` |

Les notes sont rangées dans `session.ratings[itemId]`. Les trois jeux de valeurs (diction, écoute, posture) sont **distincts**, donc l'axe d'une note se déduit de sa valeur, sans consulter le contenu.

**Nouveau retour terrain, deuxième question.** Il faut que la routine RDV ait un objectif saisi et que « On t'a fait répéter ? » ait déjà sa réponse. À l'ouverture suivante, l'accueil demande alors : « Ton objectif "…" : atteint ? » avec les réponses **Oui / En partie / Pas cette fois**, et un bouton Passer. On ne pose qu'une question à la fois, jamais les deux sur le même écran.

## Écran Progression, dans l'ordre

1. **Le mois en cours**, inchangé : le grand chiffre et le cumul.
2. **Carte « Objectif 72 séances »** :
   - « 23 / 72 », avec la barre de progression ;
   - « Encore 37 séances. À 72, l'anglais et l'espagnol se débloquent. » Une fois l'objectif atteint : « Objectif atteint ! Prochaine étape : l'anglais. » ;
   - **la date d'arrivée estimée**, au rythme des 28 derniers jours. Il faut au moins 7 jours d'historique et au moins une séance dans cette fenêtre. Sinon : « La date estimée apparaît après une semaine de pratique. » ;
   - **la courbe du cumul** : un point par jour, qui ne redescend jamais. Une ligne pointillée marque 72. **Pas** de ligne de « rythme idéal ».
3. **« Tes axes de progrès »**, une carte par axe. Chaque carte contient :
   - le titre et ce que l'axe apporte en RDV (les taglines de `BLOCKS`) ;
   - « Sur 4 semaines : 62 % (13 réponses) », plus « en hausse » si ce taux dépasse d'au moins 10 points celui des 4 semaines précédentes, avec au moins 3 réponses de chaque côté ;
   - des **mini-barres hebdomadaires**, sur les 8 dernières semaines qui ont des réponses ;
   - la mention « ton ressenti » pour la diction, l'écoute et la posture, ou « observé en vrai » pour les RDV ;
   - s'il n'y a pas de données, une ligne qui dit comment en obtenir.
   - La carte **RDV** liste en plus **tes 5 derniers objectifs de RDV**, avec leur date, leur texte et le résultat (« Atteint » / « En partie » / « Pas cette fois » / « — »).
4. **Le calendrier du mois**, inchangé.
5. **« Ta voix »**, inchangé (jalons et A/B).

L'ancienne carte « En rendez-vous » est remplacée par la carte de l'axe RDV.

**Ce qui compte comme une séance pour l'objectif :** une séance quotidienne ou une reprise comptée, d'au moins 60 s. Les routines « Avant un RDV » n'entrent pas dans l'objectif.

## Technique

- **`js/core/dashboard.js`**, pur et testé. Il expose :
  - `GOAL_SESSIONS = 72 (et `programGoal(program)`)` et `AXES` ;
  - `cumulativeSeries(sessions, todayKey)` ;
  - `goalProgress(sessions, todayKey, goal)` ;
  - `weeklyRate(sessions, axisKey, limit)` ;
  - `axisSummary(sessions, axisKey, todayKey)` ;
  - `recentGoals(sessions, n)`.
- **`js/core/progress.js`** reçoit `pendingGoalCheck(sessions, now)`.
- **`js/core/dates.js`** reçoit `longDateFr`.
- **`js/ui/components/chart.js`** dessine en SVG maison : `cumulativeChart` et `weeklyBars`.
- **Séance :** une note 1 tap à la fin du pas posture.
- **Accueil :** la deuxième question du retour terrain.
- L'accueil garde ses 2 boutons.
