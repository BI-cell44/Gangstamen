# Gangstamen : journal de bord

Ce fichier garde la mémoire du projet : ce qui a été fait et pourquoi, comment reprendre le travail, ce qui reste à faire. À mettre à jour à chaque session (une ligne dans le journal, et cocher ou ajouter dans le reste à faire).

Dernière mise à jour : 14 novembre 2026 : carte agrandie (Sainte-Anne, quai de la Fosse, tram), garages, corrections de jeu. Voir `HANDOFF.md` pour le dossier complet de reprise.

## En un coup d'œil

Gangstamen est un jeu de combat de voitures des années 90, inspiré d'Interstate '82, dans le quartier de Chantenay à Nantes. Deux fichiers HTML autonomes sont produits à partir du même code : la version classique (rétro, légère) et la version HD (rendu HDR, effets, bâtiments redessinés).

| Élément | Où |
|---|---|
| Code du jeu (source de vérité) | `src/template.html` |
| Moteur HD (injecté dans le gabarit) | `src/hd.js` |
| Jeu HD : circulation, police, campagne, garage, bonus, modes, décors (injecté aussi) | `src/gx.js` |
| Mobilier urbain d'OpenStreetMap | `src/make_furniture.py` → `data/furniture.json` |
| Construction des deux fichiers | `build.sh` |
| Données (carte, photos, commerces, ortho) | `data/` |
| Branche `main` | version publiée comme artifact sur claude.ai (jeu en ligne via la capacité `room`) |
| Branche `server` | `main` + serveur Node sans dépendance (`server/`), sert aussi la HD sur `/hd` |
| Branche `hd-ambiance-campagne` | fusionnée dans `main` et `server` le 13 novembre 2026 (conservée pour mémoire) |

La branche `server` se tient à jour en y fusionnant `main` après chaque changement.

## Ce qui a été fait

### 1. Le monde
- Carte réelle de Chantenay : rues, bâtiments et arbres d'OpenStreetMap, hauteurs et relief de l'IGN (BD TOPO, RGE ALTI).
- Façades du boulevard de la Liberté et de la rue de la Marseillaise tirées des photos 360° Panoramax (CC BY-SA 4.0), redressées. Un script de tri (`curate_facades.py`) en garde environ 300 sur 1 077 ; les autres sont remplacées par une façade dessinée, teintée avec la couleur du mur mesurée.
- Ponts au-dessus de la voie ferrée, corrigés ; voitures qui s'enfonçaient dans le sol, corrigées.

### 2. Les voitures et la conduite
- Modèles de voitures nettement améliorés (coupes lissées, vitres, feux, mitrailleuses jumelées).
- Les tirs partent maintenant des canons des mitrailleuses (position vérifiée numériquement), avec un éclair de bouche en HD.
- Manettes : détection, navigation dans les menus, vibrations.

### 3. Les modes de jeu
- Solo contre six Rapaces ; écran partagé de 2 à 4 joueurs avec menu des commandes par joueur.
- En ligne jusqu'à 12 joueurs. Chaque client simule sa propre voiture (pas de latence sur la conduite ni le tir), l'hôte fait rouler les bots. Deux transports : la capacité `room` de claude.ai, ou le serveur WebSocket de la branche `server`.
- Équipes : « Rapaces de la Butte » contre « Chantenaysiens », ou chacun pour soi. Pas de tir ami.
- Fin de partie : objectif de KO et/ou durée, écran de résultats, bouton Revanche (l'hôte seul le déclenche en ligne).
- Volumes de musique et d'effets séparés.

### 4. La version HD
- Rendu HDR avec bloom, tone mapping ACES, vignettage, grain ; ciel procédural et reflets ; ombres douces ; qualité réglable de Basse à Ultra, avec baisse automatique d'un cran si la fluidité passe sous 25 images par seconde.
- Particules : fumée de pneus et d'échappement, traces de freinage, flammes selon les dégâts, explosions avec débris, onde de choc et marque au sol.
- Sol refait, photo aérienne IGN utilisée comme masque (jardins ou pavés) et pour la couleur des toits.
- Bâtiments dessinés : rez-de-chaussée à part, étages alignés sur la rue, toits à brisis, cheminées.
- Vrais commerces d'OpenStreetMap (59), posés sur le mur le plus proche, avec leur nom.
- Façades adaptées à chaque bâtiment : nombre entier de travées, largeur mesurée dans les photos quand c'est possible.
- Mairie de Chantenay : modèle dédié (pierre blanche, ailes en métal bleu, porche à colonnes, fronton à horloge, toit d'ardoise, fenêtres du rez-de-chaussée à carreaux).
- Arbres et lampadaires repoussés hors de la chaussée.

### 5. Interface
- Minicarte : les ennemis hors champ sont de petits triangles au bord, dont la couleur, la taille et l'opacité varient avec la distance (0 à 300 m au-delà du bord). Les coéquipiers n'ont pas de triangle.
- Cinématique d'intro, tournée dans le moteur du jeu : 13 mesures de la musique (environ 34 secondes). Vue aérienne, remontée du boulevard, présentation des deux bandes, convois lancés l'un contre l'autre, collision, grue sur les épaves et titre. Le morceau se construit pendant la séquence (basse, puis percussions, puis mélodie). Elle se passe avec Échap, Entrée, Espace, un clic ou un bouton de manette, se désactive et se rejoue dans *Son et options*.

### 7. HD : ambiance, vie de quartier, campagne (branche `hd-ambiance-campagne`)
Tout est dans la HD seulement (`const gx = !HD ? null : …`), sauf le dérapage au frein à main, la collision en trois cercles et les bouts de ponts, communs aux deux versions.
- **Moment de la journée** (N) : quatre éclairages (après-midi, coucher, heure bleue, nuit) mélangés en continu, mode *Cycle* de 12 min ; la sonde de reflets se recalcule quand la lumière a bougé.
- **Météo** (B) : sec, pluie, orage, variable. Gouttes autour de la caméra, matériaux mouillés (`wetPatch` dans `hd.js` : plus sombres, brillants, flaques), reflets étirés des lampadaires, gerbes d'eau, éclairs, bruit de pluie et tonnerre. Piège : chaque matériau patché doit avoir sa propre `customProgramCacheKey`, sinon three.js partage un seul shader (la route était devenue blanche).
- **Circulation** : R5, 205, Twingo (nouvelles carrosseries dans `hd.js`), roulent à droite sur le graphe des rues, freinent derrière les autres, klaxonnent. Libération mémoire des voitures qui disparaissent.
- **Piétons** (environ 64 en solo) : squelette posé sur le CPU et dessiné en instances (une douzaine d'appels de dessin pour toute la foule) ; marche avec genoux et coudes, pauses où ils regardent autour, fuite bras en l'air, chute puis relève. Tenues variées (jupes, shorts, t-shirts, casquettes, enfants).
- **Terrasses de cafés** devant les cafés et restaurants d'OpenStreetMap : tables, chaises, parasols rayés, clients assis qui boivent et discutent, qui se lèvent quand une voiture monte sur le trottoir. Les tables se cassent.
- **Police** : niveau de recherche en étoiles, patrouilles qui suivent les rues, sirène deux tons, tir à 3 étoiles ; on les sème hors de vue ou par une peinture neuve au garage.
- **Campagne de 7 missions** avec dialogues (voix de synthèse française si le navigateur en a une) : retour au garage, place Jean-Macé, escorte jusqu'à la gare, le Vautour, la police, orage sur la Loire, la Butte. Progression et respect gardés dans `localStorage`.
- **Garage de Chantenay** sur le boulevard : réparation, munitions, moteur, blindage, mitrailleuses, peinture.
- **Bonus** : clé à molette (modèle refait : manche effilé percé, mâchoires, molette, poignée rouge), nitro, mines, roquettes, bouclier. Touche spéciale : E, Suppr, 7, Entrée du pavé, B à la manette. Les mines du joueur sont lancées vers un ennemi devant (utile en poursuite), sinon posées derrière ; toutes s'arment au bout de 0,2 s (avant : 1 s, et celles du Vautour ne touchaient jamais le poursuivant).
- **Conduite** : dérapage au frein à main, sauts, dégâts visibles (tôle froissée, capot, pneu crevé). Collision avec les murs en trois cercles le long de la voiture au lieu d'un cercle de 2 m de rayon : on passe entre deux bâtiments dès que l'écart dépasse 2 m.
- **Ponts** : les 12 derniers mètres de chaque tablier sont raccordés au terrain (le pont du boulevard près de Jean-Macé était 0,5 m au-dessus de la rue d'un côté).
- **Radio** (M) : quatre stations procédurales (G-funk, rap, techno, funk) et un animateur qui commente.
- **Multijoueur** : capture du drapeau, roi de la colline, course de checkpoints en écran partagé ; colline et course aussi en ligne. Choix de la voiture et des couleurs (transmis en ligne), discussion rapide (1 à 6, croix). Roquettes et mines vues et comptées en ligne.
- **Décors** : mobilier cassable, clocher de Saint-Martin, quais de Loire (mur suivant la berge, bittes, péniche), falaise de la carrière Misery, grue Titan (rapprochée pour être visible).
- **Options** : ombres, distance de vue, densité de circulation, voix ; joystick tactile.

### 8. Carte agrandie et retours de jeu (14 novembre 2026)
- **Carte agrandie** : de x −372,5 à 1 664 m et de z −845 à 686,5 m (2 km sur 1,5 km), toujours autour de l'ancienne origine (47,2025° N, −1,590005° E), donc toutes les positions écrites en mètres de jeu (missions, garage, quais) restent valables. Le code ne suppose plus une carte centrée sur (0, 0) : centre `CX`, `CZ` et demi-tailles `HX`, `HZ` dans `W.meta`.
- **Données refaites** pour toute la zone, via le navigateur de l'utilisateur (le bac à sable n'y a pas accès) : extrait OSM Overpass (`data/map.osm`, 25 Mo), bâtiments BD TOPO et grille RGE ALTI à 12,5 m (`data/bdtopo.json`, les 3 512 anciens bâtiments retrouvés à l'identique), photo aérienne (`data/ortho/ortho_raw.jpg` 0,4 m, réduite à 0,6 m dans `ortho.jpg` pour tenir dans 3 800 px). Les fichiers téléchargés par le navigateur intégré arrivent en `*.tmp` dans le dossier Téléchargements.
- **Tram ligne 1** comme bord nord : `convert.py` en tire une fonction z(x) (`W.tram`), coupe les rues au nord des voies et ne garde au-delà qu'une bande de 70 m de bâtiments en décor. Mur invisible entre les deux voies (on peut rouler sur la voie sud), deux rames articulées qui s'arrêtent à Égalité, Du Chaffault et Gare Maritime, sonnent et repoussent une voiture sur la voie (un choc par passage), poteaux et ligne aérienne.
- **Barrières de chantier** rouges et blanches, avec lampes, partout où une rue sort de la carte (ouest, sud, est) et derrière le tram dans le prolongement des rues ; murs invisibles le long des bords.
- **Sainte-Anne** (HD) : église modélisée (nef, bas-côtés, transept, abside, clocher et flèche côté avenue Sainte-Anne, vitraux éclairés la nuit), escalier en deux volées puis deux rampes d'après les voies OSM, statue de sainte Anne sur sa colonne avec deux réverbères.
- **Grue Titan** replacée à son vrai emplacement, à la pointe de l'île de Nantes ; la fausse falaise de la carrière Misery est retirée (le vrai relief est là). Les rues de l'île de Nantes, sans pont dans la zone, sont retirées (les bâtiments restent en décor).
- **Garages** : celui de Dédé est à l'emplacement du vrai garage Tribot ; Garage Auto 98 et l'atelier près d'Égalité (OSM) offrent les mêmes services, avec leur enseigne. Les garages au-delà du tram (AD Boucard, Carrosserie Guillemot, Garage de la Convention…) sont hors de portée.
- **Retours de l'utilisateur** : la radio de la mission Pin-pon décrit la vraie voiture du joueur (« une Twingo rose framboise ») ; les clients des terrasses fuient, se font renverser et retournent s'asseoir ; mourir en mission la fait reprendre depuis le début (respect et munitions remis comme au départ, police et mines effacées) ; le message de KO dit « la police », « Tu t'es planté tout seul » ou les Rapaces seulement après un combat avec eux dans les 10 dernières secondes ; touche pour changer d'arme spéciale (A / RB / clic sur le compteur).

### 6. Pistes écartées
- Street View comme décor : impossible, les conditions de Google interdisent d'en extraire les images, même en local sans diffusion. Les photos Panoramax (libres) servent à la place.

## Journal

| Date | Changement | Commit |
|---|---|---|
| nov. 2026 | Mairie : pierre blanche, ailes bleues, encadrements crème, carreaux au rez-de-chaussée | 01c40ac, 7e346bd |
| nov. 2026 | Minicarte : triangles de bord selon la distance | beb66dc |
| 13 nov. 2026 | Cinématique d'intro | c2db855 |
| 13 nov. 2026 | Ce journal | voir `git log` |
| 13 nov. 2026 | HD : météo, cycle jour-nuit, circulation, police, campagne, garage, bonus, radio | c02258f |
| 13 nov. 2026 | HD : modes écran partagé, choix de voiture, lieux emblématiques, options | 15ed72f |
| 13 nov. 2026 | HD : colline et course en ligne, armes en ligne, mémoire | 224e8f2, f2ca8eb |
| 13 nov. 2026 | Mines du Vautour, bout de pont, collision entre bâtiments, piétons animés et terrasses, clé à molette, touche spéciale visible | voir `git log` |

| 13 nov. 2026 | Fusion dans `main` et `server`, artifacts republiés ; dossier de passation `HANDOFF.md`, scripts de test dans `tools/`, branches figées `passation-2026-11-13` et `passation-2026-11-13-server` | voir `git log` |
| 14 nov. 2026 | Carte agrandie jusqu'à Sainte-Anne et au quai de la Fosse, tram ligne 1, barrières, église et escalier Sainte-Anne, garages réels ; Nadia et la couleur, terrasses, mort en mission, message de KO, changement d'arme | voir `git log` |

Les étapes antérieures sont dans `git log`.

## Comment reprendre

**Construire** : `sh build.sh` produit `gangstamen.html` et `gangstamen-hd.html` (le second avec `const HD = true`, la photo aérienne intégrée et sans atlas de photos de façades).

**Tester sans carte graphique** : un navigateur sans tête (Playwright, rendu logiciel swiftshader) charge le fichier avec three.js r128 servi en local. L'objet `window.__gm` expose l'état du jeu (`start`, `locals`, `rivals`, `Match`, `Intro`, `step`…). Quatre crochets de test existent : `window.__cam` (caméra relative à la voiture), `window.__camAt = [x, y, z, visée x, y, z]` (caméra libre), `window.__trHold` (garder les tirs à l'écran) et `window.__introT` (figer l'intro à un instant donné). `window.__noIntro = true` saute l'écran d'accueil de l'intro. `__gm.gx` donne accès au module de jeu HD (`startMission(i)`, `cars()`, `peds()`, `customers()`, `mines()`, `pus()`, `special(L)`…), `__gm.hd.amb` à l'ambiance (`t` : 0 jour → 3 nuit, `rain`, `wet`).

**Pièges déjà rencontrés**
- Le shell du bac à sable n'atteint pas l'IGN : la photo aérienne a été récupérée via le navigateur de l'utilisateur.
- En navigateur sans tête, le rendu tourne à environ 2 images par seconde : tout test dépendant du temps passe par les crochets ci-dessus.
- Les couleurs sont écrites en sRGB et converties une seule fois en linéaire en HD (`linearize`, `linMat`).
- En rendu logiciel, la HD met environ 40 s à démarrer (génération des façades) ; lancer Chromium avec `--disable-accelerated-2d-canvas`, sinon le chargement ne finit jamais. three.js r128 est servi depuis le paquet npm `three@0.128.0` (cdnjs est bloqué par le proxy).
- Le shell n'atteint pas non plus OpenStreetMap, Overpass, l'IGN ni Panoramax : l'agrandissement de la carte demande d'autoriser ces sites dans l'environnement, ou de lancer les scripts de `src/` ailleurs.

## Ce qui n'a pas pu être vérifié ici

- Les performances réelles de la version HD sur une vraie carte graphique.
- La synchronisation du son de l'intro (coup de grosse caisse et titre) sur un vrai navigateur, car les captures sont faites en rendu logiciel sans audio.
- Les vibrations de manette, y compris celle de l'intro.
- Une partie en ligne avec de vrais joueurs sur claude.ai, et une partie mélangeant classique et HD sur le serveur.
- Les nouveaux modes en ligne (colline, course), la discussion rapide et les roquettes vues par les autres joueurs : jamais testés à deux.
- Le ressenti de conduite (dérapage, sauts, collision en trois cercles) et l'équilibre des missions : seulement vérifiés par script.
- Les voix françaises (synthèse vocale du navigateur) et la radio, sans audio dans les tests.

## Reste à faire

### Prioritaire
- [ ] **Qualité automatique** : ajouter une case pour désactiver la baisse automatique de qualité, et un délai de grâce d'environ 15 secondes au démarrage pour ignorer les saccades de chargement (le message « Qualité graphique réduite » s'est affiché à tort chez l'utilisateur).
- [ ] Tester la HD en vrai (fluidité, taille des flammes) et la cinématique avec le son.
- [ ] Vérifier une vraie partie en ligne à plusieurs.

### Suite de la branche HD
- [ ] Jouer la campagne en vrai et régler la difficulté (dégâts des mines, vitesse du Vautour, roquettes du Grand Duc, chrono de l'orage).
- [x] Fusionner `hd-ambiance-campagne` dans `main`, puis `main` dans `server` (fait).
- [x] Agrandir la carte vers la butte Sainte-Anne et le quai de la Fosse (fait le 14 novembre, données passées par le navigateur de l'utilisateur).
- [ ] Vérifier sur une vraie carte graphique le chargement et la fluidité de la HD avec la carte trois fois plus grande (en rendu logiciel, le chargement passe de 40 s à 100 s).
- [ ] Missions : le Vautour fuit encore « vers le quai de la Fosse » par le boulevard de Cardiff alors que le quai est maintenant dans la carte ; on pourrait y placer des missions (escalier Sainte-Anne, tram).
- [ ] Façades Panoramax : la nouvelle zone n'a que des façades dessinées (classique comme HD).
- [ ] Capture du drapeau en ligne (l'état des drapeaux doit être tenu par l'hôte).
- [ ] Bonus, circulation et piétons sont propres à chaque joueur en ligne (pas synchronisés).
- [ ] Vérifier sur une vraie carte graphique le coût de la foule, de la pluie et des terrasses à 4 écrans.

### Améliorations du jeu
- [ ] **Missions plus longues** (demande du 15 nov.) : allonger les missions en ville (sprint, livraison…), avec des parcours plus étendus maintenant que la carte va jusqu'à Sainte-Anne et au quai de la Fosse.
- [ ] **Flèches de mission sur la carte** (demande du 15 nov.) : afficher aussi sur la carte (minicarte et carte plein écran) les flèches vertes de direction des missions.
- [ ] **Forme des flèches de direction** (demande du 15 nov.) : remplacer les triangles (vert mission, rouge rapace…) par une pointe de flèche en chevron, type curseur de navigation (deux ailes et une encoche à l'arrière), pour qu'on lise sans ambiguïté la direction pointée.
- [ ] Mairie : le fronton à horloge est une supposition ; le dos et les côtés reprennent la face avant.
- [ ] Bâtiments HD : quelques toits ou rez-de-chaussée étranges possibles ; détection des jardins encore clairsemée. Retouche rue par rue possible sur demande.
- [ ] Commerces : les enseignes nationales ont un libellé générique ; mettre les vrais noms si on le souhaite.
- [ ] Intro : sous-titres et rythme à ajuster après un vrai visionnage ; éventuellement une version plus courte pour les relances.
- [ ] Nettoyage : un fichier temporaire de 5,6 Mo (`*.tmp`, la photo aérienne) traîne dans `C:\Users\SF\Downloads`.

### Idées pour plus tard
- ~~Nouvelles armes et ramassages, missions, circulation civile, météo et cycle jour-nuit~~ : faits (section 7). Restent : plus de quartiers de Nantes, parcours chronométrés en solo.
- Répertoire de textures et de sons propres à la ville (enseignes, tram, cloches).

## Licences et sources

- Rues, bâtiments, commerces : © contributeurs OpenStreetMap (ODbL).
- Hauteurs, relief : IGN, BD TOPO et RGE ALTI (Licence Ouverte 2.0). Photo aérienne : IGN BD ORTHO (Licence Ouverte Etalab 2.0).
- Façades : photos Panoramax, voir `DATA-LICENSES.md` ; les textures dérivées sont diffusées sous CC BY-SA 4.0.
- Personnages, gangs et histoire sont fictifs.
