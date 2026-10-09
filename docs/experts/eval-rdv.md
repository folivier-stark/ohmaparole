# Mesurer mes actions et mes résultats en rendez-vous

> Rédigé par un binôme : coach en vente consultative B2B pour TPE, et spécialiste de l'évaluation des compétences comportementales (grilles à ancrages comportementaux, mises en situation).
> Destinataires : Fred et l'intégrateur de l'appli. Les textes d'interface s'adressent à Fred (tutoiement).
> Date : 09/10/2026. S'appuie sur `expert-contenu.md` §3.3, §3.5, §4 et `expert-contenu-situations.md` (semaines 7 à 12).
> Contraintes reprises de la spec V1 (`docs/superpowers/specs/2026-10-09-ohmaparole-design.md`) : **rien ne sort du téléphone**, pas de serveur, pas de dépendance à l'exécution, une question par écran, pas de rouge, pas de flèche vers le bas.

---

## 0. En une minute

| Question | Réponse courte |
|---|---|
| **Quoi mesurer en vrai RDV ?** | 5 faits en 5 taps, posés juste après le RDV : **prochaine étape**, **budget**, **fin à l'heure**, **décideur**, **on m'a fait répéter**. Des faits, pas des impressions. |
| **Comment évaluer les 6 compétences du pack ?** | Une grille de 6 × 3 niveaux, chaque niveau décrit par des gestes qu'on entend ou qu'on voit. Utilisée **une fois par mois** par Fred, et si possible par un pair. |
| **Quelles mises en situation ?** | **La réplique éclair** (l'appli joue une phrase de prospect, Fred répond) et **la prise de parole chronométrée** (ouverture ou cas client). L'appli mesure les **temps**, pas les mots. |
| **Transcription automatique ?** | **Pas en V1.** La reconnaissance vocale de Chrome envoie le son chez Google, ce qui contredit « rien ne sort du téléphone ». Whisper en local pèse environ 200 Mo et reste à tester. |
| **Évaluation par un assistant IA ?** | **Utile en complément**, pour les critères de sens (pertinence, fidélité du résumé). Fred partage lui-même sa prise **d'exercice fictif**. **Jamais de vrai RDV enregistré.** |
| **Affichage** | « x RDV sur y », le mois 1 à côté des 4 dernières semaines, la source de chaque chiffre affichée (mesuré, observé, ressenti, pair, IA). Aucun score global. |

**Ce que la mesure ne fera pas :** remplacer les RDV. Sans au moins un vrai rendez-vous prospect par semaine, la partie terrain reste vide, et c'est elle qui compte.

---

## 1. Les indicateurs de résultat terrain

### 1.1 Le principe anti-biais

Le biais déclaratif vient surtout de **trois sources** :
1. les questions qui demandent un **jugement** (« as-tu bien recadré ? ») ;
2. les **chiffres précis reconstruits** de mémoire (« budget abordé à la 12e minute ») ;
3. le **délai** entre le RDV et la saisie.

On applique **cinq règles** :

| Règle | Traduction |
|---|---|
| **Un fait, pas un jugement** | « Une date est-elle fixée ? » et non « As-tu bien conclu ? » |
| **Des tranches, pas des minutes** | « Avant la moitié du RDV » se rappelle de façon fiable ; « à la 12e minute », non. |
| **« Je ne sais pas » est une vraie réponse** | Elle est souvent la plus instructive : ne pas savoir qui décide, c'est déjà un résultat. |
| **Une trace vérifiable quand c'est possible** | Une date fixée se retrouve dans l'agenda, une proposition dans les mails envoyés. Une fois par mois, l'appli propose de vérifier les 5 derniers « Date fixée » dans l'agenda : 1 tap par RDV, « confirmé / pas retrouvé ». |
| **Saisir tôt** | Le meilleur moment, c'est en sortant du RDV. Le lendemain reste acceptable, parce qu'on demande des faits. |

### 1.2 Examen des 8 candidats

| Candidat | Compétence du pack mesurée | Valeur prédictive (honnête) | Biais déclaratif et parade | Verdict |
|---|---|---|---|---|
| **Prochaine étape datée obtenue** | Signal d'achat et conclure ; dire non | **La plus forte.** Les recherches de Huthwaite (Rackham, *SPIN Selling*, environ 35 000 entretiens de vente) distinguent l'**avancée** (un engagement concret : RDV fixé, décideur rencontré, essai) de la **simple continuation** (« on se rappelle »). Aucun pourcentage publié n'a pu être vérifié ; la distinction reste un repère professionnel solide, pas une loi. | Faible : une date existe ou non. **Parade :** vérification mensuelle dans l'agenda. Le **non clair** compte comme un bon résultat, pour ne pas pousser à arracher un oui. | ✅ **Garder (n° 1)** |
| **Budget abordé, et quand** | Première impression (le budget dans le cadre, A32) ; recadrer ; conclure | **Plausible et forte pour ton piège.** Gong Labs (11 331 opportunités, ventes B2B logicielles) observe un taux de réussite plus élevé quand le prix est abordé dès le premier échange. C'est une **corrélation**, dans un autre contexte que le tien : ne pas en tirer de chiffre. | Moyen sur la minute, faible sur « oui ou non » et « qui ». **Parade :** des tranches et la question « qui l'a abordé ». | ✅ **Garder (n° 2)**, en tranches |
| **Durée réelle face à la durée annoncée** | Recadrer ; tenir le temps (A43, P20) | **Forte pour ton drapeau rouge** (« plus de 30 min sans prix »). Un RDV qui déborde est souvent un RDV où personne n'a recadré. | Faible si mesurée, moyen si déclarée. **Parade :** l'appli la **mesure** quand c'est possible (voir 1.3), sinon on demande une tranche. | ✅ **Garder (n° 3)** |
| **Décideur identifié** | Prise de contact ; conclure (consigne C06) | **Forte.** Sans décideur, une date n'engage personne (cf. L22, l'associé absent). | Faible si la réponse « je ne sais pas » est offerte. | ✅ **Garder (n° 4)** |
| **« On m'a fait répéter »** | Voix et articulation, au service de toutes les compétences | Moyenne pour la vente, **mais c'est le seul indicateur terrain déjà en place**, avec un historique. Le garder permet la comparaison avec le mois 1 dès maintenant. | Bon : c'est un fait observable (spec V1 §4.4). | ✅ **Garder (n° 5)** |
| **Proposition demandée** | Signal d'achat | **Ambiguë.** « Envoyez-moi une plaquette » est souvent une sortie polie (L22). Sans date, c'est une continuation. | Moyen : on a tendance à la compter comme un succès. | ❌ **Fusionner** dans « Prochaine étape » : une proposition sans date = « flou ». |
| **Non posé quand il le fallait** | Dire non | Utile, mais « quand il le fallait » demande un **jugement a posteriori**. | **Fort.** On ne sait souvent qu'après coup qu'il fallait dire non. | ⏸ **Déplacer** vers la grille mensuelle (C5) et la réplique éclair. Le résultat du non apparaît déjà dans « Non clair ». |
| **Temps de parole estimé (moi / lui)** | Écoute ; recadrer | Réel en vente (l'écoute compte), mais les données Gong sur le bon ratio ont varié d'une étude à l'autre : pas de cible chiffrée fiable. | **Très fort.** On sous-estime presque toujours son propre temps de parole, surtout quand on pense vite. | ❌ **Écarter du terrain.** À mesurer uniquement en mise en situation, où l'appli chronomètre. |

### 1.3 Les 5 questions, mot pour mot

**Quand ?** Pendant les 3 heures qui suivent une routine « Avant un RDV », l'accueil affiche un bouton **« Je sors du RDV »**. Un tap enregistre l'heure de sortie, ce qui donne la **durée mesurée** (de la routine à la sortie, à 5 min près). Il lance aussitôt les 5 questions. Si Fred oublie, les questions arrivent à l'ouverture suivante, comme aujourd'hui, et la durée devient déclarée.

**Premier écran :** « C'était un premier RDV avec un prospect ? » → **Oui** / **Non, on passe** (suivi d'un client, réseau, etc.). Ce tap filtre les RDV ; il n'est pas compté dans les 5.

Une question par écran, un tap, bouton **Passer** toujours visible. Aucune phrase de commentaire après la réponse, seulement « Noté ».

| # | Question affichée | Réponses (1 tap) | Compétence | Lecture |
|---|---|---|---|---|
| **T1** | **« La suite ? »** | **Signé ou date fixée** / **Non clair** (de lui ou de toi) / **Flou** (« on se rappelle », plaquette, « je vais y réfléchir ») | Conclure, dire non | Les deux premières sont des **issues nettes**. Seul « Flou » est à faire baisser. |
| **T2** | **« Le budget ? »** | **Abordé par moi, dans la 1re moitié** / **Abordé par moi, plus tard** / **Il l'a abordé avant moi** / **Pas abordé** | Première impression, recadrer | Le but : la 1re réponse. « Il l'a abordé avant moi » est un signal d'achat, et une occasion manquée de poser le cadre. |
| **T3** | **« Fini à l'heure prévue ? »** (masquée si la durée est mesurée ; l'appli demande alors seulement la durée annoncée : 30 / 45 / 60 / 90 min) | **À l'heure ou avant** / **Jusqu'à 10 min de plus** / **Plus de 10 min de plus** | Recadrer | Tranches larges, parce que l'heure exacte de début est floue. |
| **T4** | **« Qui signe ? »** | **La personne en face** / **Quelqu'un d'autre, je sais qui** / **Je ne sais pas** | Prise de contact, conclure | « Je ne sais pas » n'est pas une faute : c'est l'information. |
| **T5** | **« On t'a fait répéter ? »** (existant) | Non / Une fois / Plusieurs fois | Voix | Inchangé, pour garder l'historique. |

**Durée :** 5 taps, environ 15 secondes.

**Ce que ça change dans l'existant (une décision pour Fred) :** la question « Objectif atteint ? » sortirait du flux quotidien, sinon on dépasse 5 taps. T1 en est la version factuelle. Le texte de l'objectif reste affiché au-dessus de T1, pour mémoire. De même, la question « Consigne tenue ? » (`expert-contenu.md` §3.5) n'est pas ajoutée.

---

## 2. Grille d'évaluation des 6 compétences du pack

### 2.1 Comment la lire

- **Trois repères par compétence.** Chaque repère **ajoute** des gestes au précédent. Les noms ne jugent pas : **Repère 1 · le geste démarre**, **Repère 2 · le geste est là**, **Repère 3 · le geste s'ajuste à la personne**.
- **« Non observé »** est une case à part : si la situation ne s'est pas présentée, on ne note pas. Ce n'est pas le repère 1.
- **On note sur une preuve.** Chaque repère coché s'accompagne d'une phrase entendue ou d'un geste vu (« Il a dit : "il nous reste un quart d'heure" »). Pas de preuve, pas de repère.
- **On évalue une prise enregistrée, jamais un souvenir.** L'auto-évaluation se fait en réécoutant une mise en situation, et le pair évalue pendant un jeu de rôle.

### 2.2 La grille

| Compétence | Repère 1 · le geste démarre | Repère 2 · le geste est là | Repère 3 · le geste s'ajuste |
|---|---|---|---|
| **C1. Première impression** (sem. 7) | Salue et se présente. Le sujet arrive sans annonce de **durée**, de **déroulé** ni de **budget**. | Dans la 1re minute : le nom de la personne, la durée et le déroulé. **Le mot « budget » est dit**, même vite ou plus bas. | En moins de 60 s : nom, durée, déroulé, **budget dit sur le même ton que le reste**, puis « Ça vous va ? » et **attend la réponse**. Si l'autre annonce une contrainte (temps, prix demandé d'emblée), **le cadre est modifié tout de suite** (L13, L14). |
| **C2. Prise de contact** (sem. 8) | Le bavardage dure : **3 questions ou plus** sans lien avec le sujet, ou c'est l'autre qui fait la transition. | 1 ou 2 questions de lien, puis une transition **amenée par Fred**, sans reprendre ce que l'autre a dit (« Bon, alors… »). | **Une seule** question sincère, écoute de la réponse, puis une transition qui **reprend un mot de l'autre** (A36). Si l'autre est pressé, la prise de contact est **abrégée** (L16). |
| **C3. Raconter un cas client** (sem. 9) | Le cas dure **plus de 90 s**, ou il manque un des trois temps, ou il contient **un chiffre ou une promesse**. | Les trois temps (situation, problème, ce qui a changé) en **60 à 90 s**, sans chiffre. Le cas est générique, ou la parole n'est pas rendue à la fin. | **60 s ou moins**, trois temps séparés par une pause, le problème dit **avec les mots du client**. Le cas est **choisi selon la contrainte entendue** (L18 : données sensibles → cas du cabinet), et finit par « Ça vous parle ? » suivi d'un silence. |
| **C4. Recadrer** (sem. 10) | L'autre déroule ses anecdotes jusqu'au bout. Le temps prévu est dépassé **sans que ce soit dit**. Ou bien la coupure arrive sans reprendre ce qu'il disait. | **Une** coupure, avec une reprise de l'objectif, mais **tard** (dernier tiers du temps) ou précédée de plusieurs excuses. | Coupure **dès la 2e digression**, avec le nom de la personne, ce qu'il a dit d'utile (« vous avez dit une chose importante »), puis l'objectif. Le **temps restant est annoncé** sans excuse (A43), et un sujet est **mis de côté explicitement** (A44). |
| **C5. Dire non** (sem. 11) | La demande hors cadre est acceptée (repasser, conseils gratuits, plaquette sans date), ou la réponse est « on verra ». | Le non est dit, mais suivi de **2 justifications ou plus**, ou d'une porte floue (« peut-être au printemps »). | Le non tient **en une phrase**, avec **une seule alternative concrète** : une date ferme, une orientation vers quelqu'un d'autre, ou une proposition payante. Puis **silence** (P22). Face à « je vais y réfléchir », **une** question sur la raison (A47). |
| **C6. Repérer un signal et conclure** (sem. 12) | Après une question sur le **comment** ou le **quand**, l'argumentation continue. Le RDV se termine sans question de conclusion. | Le signal est entendu et la réponse y répond. La conclusion passe par une **question ouverte**, ou bien une question fermée **aussitôt suivie d'une autre phrase**. | Le signal est **nommé** (« Vous me demandez quand on pourrait commencer »), suivi d'un **résumé en 3 points au plus** et d'une **question fermée**, puis **3 s de silence au moins**. Après un oui, **une date est fixée** sur-le-champ (A52). |

### 2.3 Qui l'utilise, et quand

| Usage | Rythme | Comment | Ce qu'on en tire |
|---|---|---|---|
| **Auto-évaluation** | 1 fois par mois, 10 min | Fred réécoute **ses 6 dernières prises** (une par compétence, en mise en situation) et coche les gestes entendus, preuve à l'appui. | Les gestes acquis. Ce n'est pas une note. |
| **Évaluation par un pair** | 1 fois par mois si possible, 15 min | Jeu de rôle : le pair joue le prospect à partir d'un passage d'écoute (L13 à L24, lu à voix haute). Il coche les gestes observés sur la grille imprimée et écrit une phrase de preuve par compétence. | Un regard sans ton biais. |
| **Écart moi / pair** | Après chaque évaluation par un pair | L'appli affiche les deux côte à côte, sans moyenne. | La littérature sur l'évaluation montre que les auto-évaluations sont en général **plus indulgentes** que celles des autres. Un écart n'est pas une faute : c'est l'endroit où regarder. |

**Pourquoi des gestes plutôt qu'une note de 1 à 5 :** une échelle à ancrages comportementaux donne à deux évaluateurs le même point de référence, ce qui rend leurs notes comparables. Elle ne supprime pas l'indulgence envers soi, d'où le pair et la règle de la preuve.

---

## 3. Mises en situation chronométrées dans l'appli

### 3.1 Ce que l'appli peut mesurer sans transcription, et sans rien envoyer

En analysant le volume du micro pendant la prise (`AnalyserNode` du Web Audio, sans dépendance), l'appli détecte quand Fred parle et quand il se tait. Elle en déduit **quatre mesures fiables** :

| Mesure | Définition | Précision réaliste | Compétences |
|---|---|---|---|
| **Délai de réponse** | Entre la fin de la réplique et le premier son de Fred | Environ ±0,3 s : affiché **arrondi à 0,5 s** | C5, C6 (la pause avant de répondre, consigne C02) |
| **Durée de parole** | Total des moments où Fred parle | Bonne | C1, C3, C4, C5 |
| **Silence tenu** | Après sa dernière phrase, temps avant qu'il reprenne la parole, plafonné au bip (5 s) | Bonne | C1, C3, C6 (P22, P23) |
| **Moment de la coupure** | Quand Fred commence à parler alors que la réplique est encore en cours de lecture | Bonne, **avec des écouteurs** (sinon, le haut-parleur se capte lui-même) | C4 |

**Points techniques à vérifier sur le téléphone avant d'écrire une ligne :**
- l'événement de fin de la synthèse vocale (`onend`) n'est pas toujours fiable sur Android. Si c'est le cas, on enregistre la dizaine de répliques en fichiers audio, ce que `expert-contenu.md` §1 recommande déjà pour l'écoute ;
- un bruit de fond (voiture, atelier) fausse la détection. On calibre le seuil 2 s avant chaque prise (« Ne dis rien… ») ;
- ces quatre mesures portent sur le **temps**, pas sur la qualité de la voix. Elles ne contredisent pas l'interdit du « score de diction » (`expert-contenu.md` §4.3). En revanche, elles touchent à « l'analyse automatique de la voix », coupée de la V1 (spec §10). **C'est à toi de trancher** : je recommande d'ouvrir ce volet **après les 60 premières séances**, comme l'anglais.

### 3.2 Ce qu'une transcription permettrait de vérifier

| Critère | Vérifiable automatiquement sur un texte ? | Comment, et avec quelle fiabilité |
|---|---|---|
| Mot « budget » (ou prix, tarif, coût, investissement) | ✅ Oui | Liste de mots. Fiable : ce sont des mots courts et nets, bien reconnus. |
| Nom de la personne prononcé | ✅ Oui | Le nom du scénario est connu à l'avance. Fiable. |
| Durée annoncée (« demi-heure », « minutes ») | ✅ Oui | Liste de mots. Fiable. |
| Date proposée (jour de la semaine, « la semaine prochaine ») | ✅ Oui | Liste de mots. Fiable. |
| Chiffre ou promesse dans un cas client | ✅ Oui | Chiffres, « % », « garanti », « gagner X ». Fiable pour signaler, à confirmer à la réécoute. |
| Résumé **avant** proposition | 🟡 En partie | Ordre des marqueurs : « si je résume », « si je vous suis bien », puis « je vous propose », « on y va ». Correct quand Fred utilise les formules de l'appli ; manque les résumés dits autrement. |
| Question fermée | 🟡 En partie | Début de phrase (« Est-ce que », « Vous voulez », « On se fixe », « Ça vous va ») et absence de « comment », « pourquoi », « qu'est-ce que ». **Ne pas se fier au point d'interrogation** : la transcription le pose mal en français. |
| Nombre de justifications après un non | 🟡 En partie | On compte les phrases et les « parce que », « mais », « enfin » après le non. C'est approximatif. |
| Excuses répétées | 🟡 En partie | On compte « désolé », « pardon », « excusez ». Attention : « Pardon de vous couper », une fois, est enseigné (A41). |
| Mots de remplissage (« euh », « ben ») | ❌ Non | Les moteurs de transcription les **effacent** souvent. Un chiffre serait faux. |
| Silence respecté | ❌ Pas sur le texte | ✅ Oui sur le **son** (3.1). |
| Ton calme ou désolé, chaleur | ❌ Non | Réécoute par Fred, ou pair. |
| Pertinence du cas choisi face à la contrainte | ❌ Pas par mots-clés | 🟡 Par un assistant IA (§4). |
| Fidélité de la reformulation ou du résumé | ❌ Pas par mots-clés | 🟡 Par un assistant IA, en comparant avec `reformulation_ref`. |
| Moment juste (couper au bon moment, conclure au bon moment) | ❌ Non | ✅ Sur le son, pour la coupure (3.1). Sinon, pair. |
| Regard, posture, poignée de main | ❌ Non | Pair seulement. |

**Pourquoi pas de transcription en V1 :**
- **La reconnaissance vocale de Chrome** (`SpeechRecognition`) envoie par défaut le son à un service Google. C'est contraire au principe « rien ne sort du téléphone ». Une option de traitement local (`processLocally`) était encore en examen au W3C en 2026, sans garantie sur Android.
- **Whisper dans le navigateur** (Transformers.js) fonctionne hors ligne une fois chargé, mais le modèle de base pèse environ 200 Mo. Ce serait la première dépendance de l'appli, et sa vitesse comme sa précision en français sur ton téléphone restent à mesurer.
- **Décision :** en V1 du volet, on mesure le **temps** sur le son, et Fred **coche 2 critères en réécoutant** sa prise. Ces coches sont étiquetées « réécouté », moins biaisées qu'un souvenir parce qu'on a la preuve sous l'oreille. Whisper local passe en V2, **si** un test d'une heure sur ton téléphone est concluant.

### 3.3 Format A : la réplique éclair (90 s)

**Déroulé :**
1. « Le prospect dit… » : l'appli joue une réplique de 5 à 30 s, **texte masqué**.
2. Fred répond à voix haute. La prise est enregistrée.
3. Quand il s'est tu, l'appli attend 5 s, puis émet un bip. Si Fred reprend la parole avant le bip, la reprise est comptée.
4. Résultat : les mesures dans leur zone (voir plus bas), puis la réécoute avec **2 cases à cocher** propres à la famille de réplique.

**Les familles de répliques** (exemples fictifs, à compléter jusqu'à 6 par famille) :

| Famille | Exemple de réplique | Mesures automatiques | Les 2 cases de réécoute |
|---|---|---|---|
| **Bavardage** (C2) | « Vous avez trouvé facilement ? Le GPS envoie tout le monde par la petite route. Remarquez, nous, on est installés ici depuis toujours… » | Durée de parole ; transition dans la **même** réponse (oui ou non, coché) | « J'ai posé une seule question » · « J'ai fait la transition vers le sujet » |
| **Prix d'emblée** (C1) | « Bon, je n'ai pas beaucoup de temps. Ça coûte combien, votre affaire ? » | Délai ; durée | « J'ai donné le cadre, prix compris » · « J'ai fini par une question de validation » |
| **Digression** (C4) | Une anecdote de 30 s. La **phrase utile** tombe à la 10e seconde (« …et les devis du printemps, j'en ai encore qui attendent… »), puis l'anecdote repart. | **Moment de la coupure** : avant la phrase utile, entre la phrase utile et la fin, ou pas de coupure. Avec écouteurs. | « J'ai repris ce qu'il a dit d'utile » · « J'ai ramené à l'objectif » |
| **Demande gratuite ou sans budget** (C5) | « Vous pourriez repasser un de ces jours me montrer deux ou trois astuces ? Entre nous, hein. » | Délai ; durée (**zone : 12 s ou moins**) ; silence tenu | « Mon non tient en une phrase » · « J'ai proposé une seule alternative » |
| **« Je vais y réfléchir »** (C5) | « C'est très intéressant. Je vais y réfléchir, rappelez-moi dans quelque temps. » | Délai ; durée ; silence tenu | « J'ai demandé ce qui le fait hésiter » · « J'ai proposé une date ou un non » |
| **Signal d'achat** (C6) | « Et si on le faisait, ça se passerait comment, l'installation ? » | Délai ; durée (**zone : 15 s ou moins**) ; **silence tenu** | « J'ai fini par une question fermée » · « Je n'ai rien ajouté après » |

**Les zones, sans note :**

| Mesure | Zone visée, au sens de l'entraînement | Libellés affichés (neutres) |
|---|---|---|
| Délai de réponse | **1 à 3 s** (la pause de la consigne C02) | « du tac au tac » (moins de 1 s) · « posé » (1 à 3 s) · « temps de réflexion » (plus de 3 s) |
| Durée (non, signal) | 12 à 15 s ou moins | « court » · « développé » |
| Silence tenu | Jusqu'au bip (5 s) | « tenu jusqu'au bip » · « repris après x s » |
| Coupure (digression) | Entre la phrase utile et la fin | « après la phrase utile » · « avant » · « pas coupé » |

Les zones sont des **repères d'entraînement**, pas des normes validées. Le libellé le dit une fois, dans « À savoir ».

### 3.4 Format B : la prise de parole chronométrée (60 s)

Deux variantes, qui reprennent les items existants :
- **Ouverture** (C1, d'après P14) : « Pose ton cadre comme si M. Tanguy venait de t'ouvrir. » Cible : **45 s**.
- **Cas client** (C3, d'après P18) : « Raconte un cas, en trois temps. » Cible : **60 s**. Le chrono est visible.

| Mesure automatique | Lecture |
|---|---|
| Durée totale face à la cible | « dans le temps » ou « +x s », arrondi à 5 s |
| Pauses de plus de 0,7 s | Pour le cas client, **2 pauses au moins** suggèrent trois temps séparés. C'est un indice : une hésitation fait aussi une pause. |
| Silence tenu après la question finale | « Ça vous va ? » ou « Ça vous parle ? », puis tenu jusqu'au bip |

**Les cases de réécoute :**
- Ouverture : « nom » · « durée » · « déroulé » · « budget » · « Ça vous va ? ». Ce sont 5 cases, mais une liste à cocher, pas des questions.
- Cas client : « trois temps » · « aucun chiffre ni promesse ».

### 3.5 Où les placer dans les séances

- **Une fois par semaine**, à partir de la semaine 7, une réplique éclair **remplace** le bloc posture de la séance. Les 5 minutes ne bougent pas.
- **Une fois toutes les deux semaines**, une prise chronométrée remplace l'item d'articulation.
- Il n'y a **jamais de séance « en plus »** : la mesure ne doit pas devenir une dette.
- **Même réplique au mois 1 et au mois 3.** Les répliques de référence (une par famille) reviennent à intervalles fixes, pour pouvoir comparer à l'aveugle (§5.3).

---

## 4. L'évaluation par un assistant IA

### 4.1 Est-ce utile ?

**Oui, mais pour une chose précise :** juger le **sens**, ce que ni les mots-clés ni le chrono ne savent faire. Le cas choisi répond-il à la contrainte ? Le résumé est-il fidèle à la `reformulation_ref` ? Le non laisse-t-il une porte ouverte ? Pour le reste (durée, silence, mot « budget »), les mesures de l'appli sont plus fiables qu'un assistant.

### 4.2 Quelle précision attendre ?

| Point | Ce qu'on sait | Conséquence |
|---|---|---|
| **Accord avec des humains** | Sur des tâches de comparaison de réponses (étude MT-Bench, 2023), un modèle puissant s'accorde avec des experts à peu près aussi souvent que des experts entre eux (environ 80 %). Ce chiffre **ne se transpose pas** à une grille de vente en français. | Fiable pour repérer un **geste présent ou absent**. Moins fiable pour la nuance. |
| **Biais connus** | Préférence pour les réponses **longues**, sensibilité à la **formulation** de la consigne, **complaisance** (tendance à encourager). | La consigne interdit de tenir compte de la longueur, exige une **citation** comme preuve, et autorise « non observé ». |
| **Variabilité** | Deux passages du même texte peuvent donner deux repères différents. | On ne retient un repère que s'il revient **2 fois sur 2**. Sinon, « incertain ». |
| **Échelle** | Les petites échelles avec justification écrite sont plus stables que les notes fines. | 3 repères + « non observé », jamais une note sur 10. |
| **Calibrage** | Un assistant n'est fiable que s'il retrouve des cas connus. | L'appli fournit **3 réponses étalons par compétence** (une par repère). Avant la première utilisation, Fred les fait évaluer : si l'assistant ne retrouve pas les 3, on ne s'en sert pas pour cette compétence. |

### 4.3 Comment ça marche sans serveur

1. Après une mise en situation, bouton **« Faire relire par un assistant »**.
2. L'appli prépare le texte (consigne, réplique du prospect, extrait de grille) et ouvre le **partage Android** (Web Share), avec le fichier audio de la prise. Ce n'est pas l'appli qui envoie : c'est Fred qui choisit l'assistant, comme pour partager une photo. Le principe « rien ne sort du téléphone » tient, puisque la sortie est **un geste de Fred**.
3. L'assistant transcrit lui-même l'audio et applique la grille.
4. Fred copie la **dernière ligne** de la réponse (`RESULTAT: …`) et la colle dans l'appli, qui l'enregistre avec l'étiquette « évalué par IA ». Cette étape est facultative : sans collage, rien n'est enregistré.

### 4.4 Le prompt de grille (fourni par l'appli, exemple pour C6)

```text
Tu es évaluateur ou évaluatrice de compétences comportementales en entretien de vente.
Tu évalues UNE réponse orale, enregistrée dans un exercice d'entraînement. Le prospect est fictif.

CONTEXTE
Le prospect vient de dire : « Et si on le faisait, ça se passerait comment, l'installation ? »
La personne évaluée devait y répondre.

ÉTAPE 1. Transcris la réponse mot pour mot, sans corriger.

ÉTAPE 2. Applique la grille ci-dessous. Elle est cumulative : le repère 2 suppose les gestes du repère 1.
Compétence : repérer un signal d'achat et conclure.
- Repère 1 : la réponse explique ou argumente, sans question de conclusion.
- Repère 2 : la réponse répond au signal, puis pose une question ouverte, ou une question fermée immédiatement suivie d'une autre phrase.
- Repère 3 : la réponse nomme le signal, résume en trois points au plus, pose une question fermée, et ne dit plus rien ensuite.
- Non observé : la réponse ne permet pas de trancher.

RÈGLES
- Pour chaque geste que tu retiens, cite la phrase exacte de la transcription. Sans citation, le geste n'est pas retenu.
- La longueur de la réponse ne doit pas influencer ton choix.
- Pas de compliment, pas d'encouragement, pas de note sur 10, pas de pourcentage.
- Si tu hésites entre deux repères, choisis le plus bas et écris « hésitation ».
- Ne juge ni la voix ni l'accent.

ÉTAPE 3. Donne UNE seule suggestion, en une phrase, sous la forme d'un geste à essayer au prochain essai.

DERNIÈRE LIGNE, exactement sous ce format :
RESULTAT: C6=<1|2|3|NO> ; HESITATION=<oui|non>
```

L'appli remplace la réplique, la compétence et les repères selon la mise en situation. Pour une reformulation d'écoute, elle ajoute la `reformulation_ref` et la consigne : « Liste ce qui manque par rapport à la référence. Ne pénalise pas les mots différents si le sens est le même. »

### 4.5 Les risques, et les parades

| Risque | Gravité | Parade |
|---|---|---|
| **Enregistrer un vrai RDV pour le faire évaluer** | 🔴 **Grave** | **Interdit dans l'appli.** Enregistrer des paroles prononcées à titre privé sans le consentement de la personne est un délit (art. 226-1 du Code pénal), et ces données de prospect relèvent du RGPD. L'appli ne propose l'évaluation IA **que pour les mises en situation fictives**. |
| Un vrai RDV raconté de mémoire dans un assistant | 🟠 Moyen | Si Fred le fait de lui-même : **pseudonymisation** avant (pas de nom, d'entreprise, de ville ni de chiffre réel), et un assistant dont l'entraînement sur les conversations est désactivé. L'appli rappelle la règle en une ligne, une fois. |
| Sa propre voix partagée avec un fournisseur | 🟡 Faible | Le contenu est fictif. Fred choisit l'assistant en connaissance de cause. L'option reste désactivée par défaut. |
| Croire le verdict de l'IA plus que le pair | 🟠 Moyen | Affichage avec l'étiquette « IA », jamais fusionné avec les autres sources, jamais seul pour dire qu'un geste est acquis. |
| Complaisance (« Excellente réponse ! ») | 🟠 Moyen | La consigne interdit les compliments. Seule la ligne `RESULTAT` est enregistrée. |
| Friction (copier, coller, attendre) | 🟡 Faible | Facultatif. Recommandé **une fois par mois**, pour l'évaluation mensuelle, pas après chaque prise. |

---

## 5. Recommandation V1 du volet

### 5.1 Ce qu'on garde

| Bloc | Contenu | Coût pour Fred |
|---|---|---|
| **5 indicateurs terrain** | T1 la suite · T2 le budget · T3 fini à l'heure · T4 qui signe · T5 on m'a fait répéter | 15 s après chaque RDV prospect |
| **Grille courte** | 6 compétences × 3 repères (§2.2), gestes à cocher avec preuve | 10 min par mois, plus 15 min avec un pair si possible |
| **Mise en situation 1** | Réplique éclair : délai, durée, silence tenu, coupure, plus 2 cases de réécoute | 90 s, une fois par semaine, à la place du bloc posture |
| **Mise en situation 2** | Prise de parole chronométrée (ouverture ou cas client) : durée, pauses, silence final, plus les cases de réécoute | 60 s, une fois toutes les 2 semaines, à la place de l'articulation |
| **IA** | Facultative, mensuelle, sur mise en situation fictive seulement | 5 min par mois |

### 5.2 L'écran « En rendez-vous » : rassurer sans mentir

**Règles d'affichage :**
- **Toujours « x sur y »**. Un pourcentage seulement à partir de 10 réponses.
- **Mois 1 = les 4 premières semaines qui ont des données**, pas le mois calendaire.
- **Mois 1 et 4 dernières semaines, côte à côte**, sans flèche.
- **« en hausse »** seulement si l'écart dépasse 10 points, avec au moins 3 réponses de chaque côté (5 pour les mises en situation), comme dans la spec tableau. Une baisse n'est **jamais signalée** et **jamais cachée** : les deux chiffres restent visibles.
- Sous 10 réponses, la mention « sur peu de RDV » s'ajoute.
- **Source sur chaque ligne :** mesuré · observé en vrai · réécouté · ressenti · pair · IA.

**Maquette texte :**

```text
EN RENDEZ-VOUS                                     observé en vrai
Une suite nette (date ou non clair)
  Mois 1 : 2 RDV sur 7        Ces 4 semaines : 5 sur 8   en hausse
  sur peu de RDV
Budget abordé par toi, dans la 1re moitié
  Mois 1 : 1 sur 7            Ces 4 semaines : 4 sur 8   en hausse
Fini à l'heure
  Mois 1 : 3 sur 7            Ces 4 semaines : 4 sur 8   mesuré 5 fois
Tu sais qui signe
  Mois 1 : 4 sur 7            Ces 4 semaines : 7 sur 8
On ne t'a pas fait répéter
  Mois 1 : 5 sur 7            Ces 4 semaines : 7 sur 8

EN ENTRAÎNEMENT                                            mesuré
Silence tenu après ta question (réplique éclair)
  5 premières prises : 1 sur 5     5 dernières : 4 sur 5
Délai « posé » (1 à 3 s)
  5 premières : 2 sur 5            5 dernières : 4 sur 5
[ Écouter ta réplique du mois 1 et celle d'aujourd'hui, à l'aveugle ]

TES GESTES                                    toi · pair · IA
C6 Conclure   ● nomme le signal   ● question fermée   ○ silence 3 s
              Nouveau ce mois : question fermée (toi + pair)
```

**Ce qui rassure, et pourquoi c'est honnête :**
1. **L'écoute à l'aveugle de la même réplique**, au mois 1 et aujourd'hui. C'est la preuve la plus parlante, et Fred la juge sans savoir laquelle est laquelle. Le principe existe déjà pour la voix (spec V1 §6).
2. **« Nouveau ce mois »** : un geste passe à « acquis » quand il est observé **2 fois sur les 3 dernières évaluations**, quelle qu'en soit la source. On montre ce qui s'ajoute, sans retirer ce qui manque : les ronds vides restent visibles.
3. **Les comptes bruts** (« 5 sur 8 ») ne prétendent pas à une précision qu'ils n'ont pas.

---

## 6. Garde-fous

| # | Garde-fou | Pourquoi |
|---|---|---|
| 1 | **Aucun score global**, aucune note sur 100, aucun « niveau de charisme », aucun classement. | Un chiffre unique ferait croire à une mesure qui n'existe pas. |
| 2 | **Pas de faux chiffre précis :** temps arrondis à 0,5 s, médiane plutôt que moyenne, « x sur y » sous 10 réponses, pas de décimale. | La précision affichée ne doit pas dépasser la précision réelle. |
| 3 | **Aucun chiffre d'affaires, aucune promesse.** Pas de « les vendeurs qui parlent budget tôt signent X % de plus » dans l'appli. Les études citées ici restent dans ce document. | Ce sont des corrélations, dans d'autres contextes que le tien. |
| 4 | **Pas de rouge, pas de flèche vers le bas, pas de commentaire après un tap.** « Flou » reçoit le même « Noté » que « Date fixée ». | Le tap doit rester un constat, pas une sanction, sinon tu arrêteras de répondre, ou tu répondras ce qui fait plaisir. |
| 5 | **« Non clair » compte comme une issue nette**, au même rang que « Date fixée ». | Sinon l'appli te pousserait à charmer pour obtenir un oui, ce qui est exactement ton piège. |
| 6 | **Aucun vrai RDV enregistré ni transcrit dans l'appli.** L'évaluation par IA est limitée aux exercices fictifs ; pseudonymisation obligatoire si tu racontes un vrai RDV. | Délit d'enregistrement sans consentement, et RGPD. |
| 7 | **Étiquette de source partout.** On ne mélange jamais mesuré, ressenti, pair et IA dans un même chiffre. | C'est ce qui rend l'écran crédible à tes propres yeux. |
| 8 | **Bouton Passer partout, aucun rappel, aucune séance en plus.** | La mesure ne doit jamais devenir une dette. |
| 9 | **Comparaison seulement à partir de 3 RDV** (ou 5 prises) de chaque côté. Avant : « La comparaison apparaît après 3 RDV. » | Avec 1 ou 2 RDV, toute tendance est du bruit. |
| 10 | **La mesure ne remplace pas les RDV.** Si aucun RDV prospect n'a eu lieu depuis 14 jours, la carte terrain l'indique, une fois et sans reproche : « Pas de RDV prospect depuis 2 semaines. » | Ta priorité, c'est le cash. Un tableau de bord bien rempli d'exercices peut masquer un agenda vide. |

---

## 7. Relecture en avocat du diable

**Graves**
1. **Le petit nombre.** Avec 1 à 3 RDV prospects par semaine, « 5 sur 8 » contre « 2 sur 7 » peut n'être que le hasard des prospects rencontrés. → C'est pourquoi on affiche des comptes bruts, la mention « sur peu de RDV » et un seuil de 3. Il ne faut pas en tirer de conclusion avant 2 ou 3 mois.
2. **Le biais en ta faveur reste possible** sur T1 et T2 : un « on se rappelle mardi » peut être compté comme une date. → La vérification mensuelle dans l'agenda est la vraie parade. Si elle est sautée, T1 perd de sa valeur.
3. **La mesure prédit le geste, pas la signature.** Aucun de ces indicateurs n'a été validé sur des TPE françaises en face à face. → Le document ne promet rien, et l'appli non plus.

**Moyens**
4. **Le conflit avec la spec V1** : la détection de la parole touche à « l'analyse automatique de la voix », coupée de la V1. → À trancher par Fred. Ma recommandation : ouvrir ce volet après 60 séances.
5. **La synthèse vocale robotique** rend la réplique éclair moins réaliste. → Faire enregistrer les répliques de référence par un proche.
6. **Le pair n'est pas trouvé.** Sans lui, la grille repose sur toi et l'IA. → Le volet tient quand même ; le pair est un bonus, pas un prérequis.

**Légers**
7. Cinq écrans après chaque RDV, c'est la limite haute pour toi. Si les réponses s'arrêtent au bout de 3 semaines, on ne garde que T1, T2 et T5.

---

## Sources

- Huthwaite et Neil Rackham, distinction entre avancée et continuation : [Neil Rackham (Wikipédia)](https://en.wikipedia.org/wiki/Neil_Rackham), [The Sales Blog, « How to advance a sale »](https://thesalesblog.com/2010/01/11/deals-stalled-how-to-advance-a-sale), [Huthwaite International, « The art of the sales advance »](https://www.huthwaiteinternational.com/the-art-of-the-sales-advance-webinar-thank-you)
- Gong Labs, moment où l'on parle de prix : [Data reveals the best time to talk price and budget](https://www.gong.io/resources/labs/data-reveals-the-best-time-to-talk-price-and-budget/) ; ratio de parole : [Talk-to-listen ratio](https://www.gong.io/resources/labs/talk-to-listen-conversion-ratio/)
- Échelles à ancrages comportementaux et indulgence envers soi : [Adequacy of the O*NET rater and format choices (Virginia Tech)](https://vtechworks.lib.vt.edu/items/3e822729-485d-4983-9fef-dadd29b2503e), [Self-ratings versus peer ratings (OBHDP, 1998)](https://ideas.repec.org/a/eee/jobhdp/v74y1998i3p212-228.html)
- Évaluation par un modèle de langue, précision et biais : [Zheng et al., MT-Bench (arXiv 2306.05685)](https://arxiv.org/abs/2306.05685), [Synthèse des biais et parades](https://memx.app/blog/llm-as-a-judge-biases-and-fixes/)
- Reconnaissance vocale dans le navigateur : [W3C TAG, revue #1189 (traitement local)](https://tag-github-bot.w3.org/gh/w3ctag/design-reviews/1189), [Fora Soft, ASR côté navigateur (2026)](https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/client-side-asr-faster-whisper-wasm-browser), [Whisper WebGPU (Hackernoon)](https://hackernoon.com/turn-audio-to-text-on-your-device-free-whisper-webgpu-guide), [WebGPU sur Android (Chrome 121)](https://developer.chrome.com/blog/new-in-webgpu-121?hl=en)
- Enregistrement sans consentement : article 226-1 du Code pénal (Légifrance).

---

**Une décision pour Fred :** tu valides le passage de « Objectif atteint ? » à « La suite ? » (T1) dans le retour après RDV ?
