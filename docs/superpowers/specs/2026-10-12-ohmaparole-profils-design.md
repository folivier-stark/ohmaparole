# OhMaParole : profils Pro, Études et Quotidien (ajout à la spec V2)

> Décision de Fred du 12/10/2026. Il a partagé l'appli avec des proches : sa fille, étudiante en génie civil, son conjoint et des amis. Le contenu actuel est entièrement « pro » (Fred, IA, TPE, vente).

## 1. Les profils

| Profil | Pour qui | Programme | Objectif | Bouton du bas |
|---|---|---|---|---|
| `pro` | Fred | Inchangé : Fondations (1-6), Charisme et confiance (7-12), Situations de RDV (13-18) | 72 | « Avant un rendez-vous · 90 s » |
| `etudes` | Étudiants, premier emploi | Fondations communes (1-6), puis **Prendre sa place** (7-12) | 48 | « Avant un moment important · 90 s » |
| `quotidien` | Conjoint, amis, ados dès 12 ans environ | Fondations communes (1-6), puis **Confiance au quotidien** (7-12) | 48 | « Avant un moment important · 90 s » |

- **Fondations communes** aux profils `etudes` et `quotidien` :
  - les virelangues A01 à A14 sont gardés ;
  - **nouvelles** phrases d'articulation : QA01 à QA14 ;
  - **nouvelles** écoutes : QL01 à QL12, des proches qui racontent, avec un détail caché ;
  - **nouvelles** postures : QP01 à QP12 ;
  - consignes de la routine « Avant un moment important » : QC01 à QC10.
- **Prendre sa place** (`etudes`) : EA01-EA24, EL01-EL12, EP01-EP12. Six thèmes : l'exposé ; répondre aux questions et au jury ; l'entretien de stage ou d'alternance ; défendre son idée en projet de groupe ; se présenter en 60 s ; parler sur le terrain (chef de chantier, maître de stage). Les phrases d'articulation emploient en partie le **vocabulaire technique du génie civil**.
- **Confiance au quotidien** (`quotidien`) : QA15-QA38, QL13-QL24, QP13-QP24. Six thèmes : oser parler en groupe ; dire un désaccord calmement ; demander clairement ; raconter une histoire ; écouter vraiment un proche ; prendre la parole devant les autres (toast, réunion, exposé).
- **Mesure, pour les profils non pro** :
  - un texte de référence neutre, avec son nombre de syllabes, et sans prénom pour que le texte reste fixe ;
  - 3 textes inédits ;
  - 3 écoutes réservées ;
  - 12 questions spontanées ;
  - 12 « répliques du quotidien » ;
  - une auto-grille de 6 compétences.

  Les **extras** (motivations, exemples de pourquoi, objectifs du moment important) sont eux aussi neutres.

## 2. Comportements

- **Premier lancement** : un écran « Ton profil » avant l'objectif, avec les 3 choix décrits chacun en une ligne.
- **Utilisateurs existants** : à la première ouverture après la mise à jour, la question « Ton profil : Pro ou Quotidien/Études ? » est posée **une seule fois**. Fred choisit Pro et rien ne change pour lui.
  - Un utilisateur qui choisit un profil non pro garde ses séances.
  - Ses enregistrements de référence « pro » sont conservés, mais **exclus** de sa ligne de base. Sa calibration repart avec le texte neutre.
- **Changer de profil** est possible dans les Réglages. L'appli prévient : « ta mesure de voix repartira de zéro ». Les séances sont gardées.
- **Louarn** : ses 6 stades sont répartis sur l'objectif du profil. Sur 72 séances, les seuils restent 0, 12, 24, 36, 48 et 72. Sur 48 séances, ils passent à 0, 8, 16, 24, 32 et 48. Les répliques propres au monde pro (RDV, clients, prospects, IA, vente) ne sont **jamais** tirées pour un profil non pro : elles sont filtrées par une liste d'ids, et des variantes neutres existent.
- **Retour après un « moment important »** (profils non pro) : seulement « Objectif atteint ? » (si un objectif a été saisi) et « On t'a fait répéter ? ». Pas de filtre prospect, ni de suite, ni de budget, ni de durée.
- **Progression** :
  - les cartes d'axe sont les mêmes ;
  - la carte « En rendez-vous » devient « Dans tes moments importants », avec les mêmes règles d'honnêteté ;
  - le Parcours compte 12 pierres réparties sur 2 blocs.
- **Bilans** aux séances 24 et 48, à la fin de chaque bloc.
- **Les données restent locales**, sur chaque téléphone, comme avant.

## 3. Contenu (fichiers sources)

| Fichier | Contenu |
|---|---|
| `docs/experts/contenu-commun-quotidien.md` | Fondations communes, consignes QC, extras neutres |
| `docs/experts/contenu-etudes.md` | Prendre sa place |
| `docs/experts/contenu-quotidien.md` | Confiance au quotidien |
| `docs/experts/contenu-mesure-quotidien.md` | Mesure non pro et répliques Louarn neutres |

L'import produit `content/program-etudes.json`, `content/program-quotidien.json`, des exercices fusionnés dans `content/fr/exercises.json` (identifiants uniques), `content/fr/extras-quotidien.json` et `content/fr/mesure-quotidien.json`.
