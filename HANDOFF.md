# Gangstamen : dossier de passation technique

Dossier écrit le 13 novembre 2026 pour reprendre le développement dans une nouvelle conversation, sans rien perdre. Il complète `LEDGER.md` (journal, à faire, pièges) et `README.md` (description pour joueurs). En cas de doute, le code et `git log` font foi.

**Version figée de référence : commits `c92a34e` (copie de `main`) et `98ff32e` (copie de `server`)**, anciennement branches `passation-2026-11-13` et `passation-2026-11-13-server`, supprimées le 15 nov. 2026 (le dépôt ne garde que `main`, `ultra` et `server` ; pour les retrouver : `git branch passation-2026-11-13 c92a34e`),, à ne jamais modifier, et deux artifacts « référence » sur claude.ai (voir section 9). Ce sont des branches et non des tags, car le dépôt refuse l'envoi de tags depuis le bac à sable.

---

## 0. Pour démarrer la nouvelle conversation

Le bac à sable de la conversation actuelle disparaît avec elle : **tout ce qui compte est sur GitHub**, dépôt `BI-cell44/Gangstamen`.

1. Joindre ce dépôt à la session (outil d'ajout de dépôt, `owner=BI-cell44`, `repo=Gangstamen`, accès *push*), puis cloner.
2. Lire dans cet ordre : `HANDOFF.md` (ce fichier), `LEDGER.md`, `README.md`, `tools/README.md`.
3. Installer les outils de test : `npm i playwright three@0.128.0` (voir `tools/README.md`).
4. `sh build.sh` doit reproduire à l'octet près `gangstamen.html` et `gangstamen-hd.html` (vérifié au moment de la passation). Si ce n'est pas le cas, quelque chose a changé : s'arrêter et comprendre avant de modifier.
5. Poser la question à l'utilisateur : quelle est la priorité (voir section 7) ?

Message à coller au début de la nouvelle conversation :

> Je reprends le développement du jeu Gangstamen (dépôt GitHub BI-cell44/Gangstamen, branches `main` et `server`). Clone le dépôt, lis `HANDOFF.md` puis `LEDGER.md`, vérifie que `sh build.sh` reproduit les deux HTML du dépôt, et dis-moi en quelques lignes où on en est avant de commencer. Réponds-moi en français. Les artifacts de référence sont décrits en section 9 de `HANDOFF.md` : ne les écrase pas.

Environnement de l'utilisateur : francophone, fuseau Europe/Paris, Windows ; le projet est copié dans `D:\Developpement\Gangstamen` (les deux HTML y sont déposés à chaque version, via le pont vers son ordinateur quand il est lié à la conversation).

---

## 1. Le jeu, précisément

**Gangstamen** est un jeu de combat de voitures « année 1996 » dans la tradition d'Interstate '82 : conduite vue de derrière, mitrailleuses, bonus, vagues d'ennemis. Il se déroule dans les **vraies rues du quartier de Chantenay à Nantes**, jusqu'à la butte Sainte-Anne et au quai de la Fosse depuis le 14 novembre 2026 (zone de 2 037 m sur 1 532 m, x de −372,5 à 1 664, z de −845 à 686,5, origine inchangée à 47,2025° N, −1,590005° E ; centre `CX`, `CZ` et demi-tailles `HX`, `HZ` dans `W.meta`). Au nord, la ligne 1 du tram ferme la carte ; ailleurs, des barrières de chantier.

**Histoire** : deux bandes se disputent le quartier : les *Rapaces de la Butte* (voitures noires à bande rouge, en haut de la butte) et les *Chantenaysiens* (voitures jaunes, sur le boulevard de la Liberté). Le joueur prend le volant ; la campagne HD ajoute des personnages (Dédé le garagiste, Nadia, le Grand Duc, le Vautour, l'animateur de Chantenay FM).

**Boucle de jeu** : on conduit, on tire (Espace par défaut), on ramasse des bonus, on met les voitures adverses KO. Chaque KO rapporte du « respect » (score, et monnaie du garage). Une partie se termine à un nombre de KO ou à une durée choisis, avec écran de résultats et revanche.

**Deux produits à partir d'un seul code**
- `gangstamen.html` (classique) : rendu rétro (pixels, modèles simples), photos de façades réelles en atlas, léger.
- `gangstamen-hd.html` (HD) : rendu HDR, effets, bâtiments redessinés, et toute la couche de jeu `gx.js` (circulation, police, campagne…). Photo aérienne IGN intégrée, pas d'atlas de photos.

**Modes** : solo ; écran partagé 2 à 4 joueurs (clavier et manettes) ; en ligne jusqu'à 12 joueurs. Règles : chacun pour soi, ou par équipes. Modes HD supplémentaires en écran partagé : capture du drapeau, roi de la colline, course de checkpoints (colline et course aussi en ligne).

**Commandes** : tableau complet dans `README.md`. À retenir : clavier 1 = ZQSD (WASD en QWERTY), Espace tir, **E arme spéciale**, Maj gauche frein à main, C caméra, R remise en route ; manette : RT/LT, stick, A/RB tir, **B arme spéciale**, X frein à main, Y caméra. Touches communes : N moment de la journée, B météo (HD), M radio, P pixels rétro, Tab classement, 1 à 6 discussion rapide, Échap pause.

---

## 2. Fonctionnalités déjà développées

Légende : (C) classique et HD, (HD) HD seulement.

**Monde** : tram ligne 1 en bord nord (deux rames, stations réelles) ; barrières de chantier aux sorties de carte ; église, escalier et statue Sainte-Anne (HD) ; rues, bâtiments, arbres OpenStreetMap ; relief et hauteurs IGN ; ponts et rampes ; façades photo (Panoramax) sur le boulevard de la Liberté et la rue de la Marseillaise (C) ; en HD, bâtiments redessinés par style avec la couleur du mur mesurée sur les photos, rez-de-chaussée à part avec 59 vrais commerces OSM, travées de fenêtres adaptées, toits à brisis avec cheminées et couleurs tirées de la photo aérienne, mairie en modèle dédié, mobilier urbain cassable, clocher de Saint-Martin, quais de Loire avec péniche, falaise de la carrière Misery, grue Titan.

**Voitures** : modèles lissés en coupes extrudées, peinture vernie, vitres, phares, feux, deux mitrailleuses aux canons d'où partent les tirs (C) ; carrosseries R5, 205, Twingo pour la circulation (HD) ; dégâts visibles : tôle froissée, capot, pneu crevé, fumée puis flammes (HD).

**Conduite** : physique arcade, frein à main avec dérapage prolongé (C), sauts sur bosses et rampes avec dégâts à la réception (HD), collision aux murs en trois cercles le long de la voiture (C), bouts de ponts raccordés au terrain (C).

**Combat et bonus (HD)** : clé à molette (réparation), nitro, **mines** (lancées sur l'ennemi devant, sinon posées derrière), lance-roquettes, bouclier ; touche d'arme spéciale visible dans les commandes ; explosions avec débris, onde de choc, marque au sol.

**Vie du quartier (HD)** : circulation civile qui roule à droite et klaxonne ; environ 64 piétons animés dessinés en instances, qui s'écartent ; terrasses de cafés avec clients ; police avec niveau de recherche en étoiles, sirène, tir à 3 étoiles.

**Ambiance (HD)** : moment de la journée (après-midi, coucher, heure bleue, nuit, cycle de 12 minutes), météo (sec, pluie, orage, variable) avec matériaux mouillés et reflets, radio de bord à quatre stations procédurales et animateur à voix de synthèse.

**Campagne solo (HD)** : 7 missions avec dialogues (retour au garage, place Jean-Macé, escorte de Nadia, le Vautour, la police, orage sur la Loire, assaut sur la Butte), garage de Chantenay (réparation, munitions, moteur, blindage, mitrailleuses, peinture), progression et banque de respect mémorisées dans le navigateur.

**Multijoueur** : écran partagé 2 à 4 ; en ligne 12 joueurs (claude.ai `room` ou serveur Node) ; équipes ; fin de partie avec objectif et durée, résultats, revanche synchronisée par l'hôte ; choix de la voiture et des couleurs transmis en ligne ; discussion rapide.

**Interface** : menus au clavier, à la souris, à la manette ; minicarte avec triangles de bord pour les ennemis hors champ (taille, couleur et opacité selon la distance) ; barre d'équipes, horloge, classement ; volumes musique et effets séparés ; vibrations de manette ; joystick tactile mobile ; options (ombres, distance de vue, densité de circulation, voix) ; qualité graphique Basse à Ultra avec baisse automatique ; **cinématique d'intro** dans le moteur, passable, désactivable, rejouable.

---

## 3. Architecture technique

### Technologies
- **three.js r128**, chargé depuis cdnjs. Pas de bundler, pas de framework : un seul fichier HTML par version.
- **Python 3 sans dépendance** pour la préparation des données (sauf `curate_facades.py` : Pillow et numpy).
- **WebAudio** pour la musique et les bruitages, tout est généré (aucun fichier audio).
- **Synthèse vocale du navigateur** pour les dialogues et l'animateur.
- **Node.js sans dépendance** pour le serveur de la branche `server` (WebSocket écrit à la main).
- Tests : Playwright et Chromium sans tête (rendu logiciel).

### Dépôt (`BI-cell44/Gangstamen`)

| Chemin | Rôle |
|---|---|
| `src/template.html` | **Source principale** (environ 3 270 lignes) : moteur, ville, voitures, effets, son, entrées, équipes, HUD, fin de partie, combat, IA, réseau, menus, intro, boucle |
| `src/hd.js` | Moteur HD, injecté à `/*@HD_MODULE@*/` : pipeline de rendu, ciel, particules, voitures lissées, textures de façades, mairie, ambiance, météo, dégâts visibles |
| `src/gx.js` | Couche de jeu HD, injectée à `/*@GX_MODULE@*/` : circulation, police, piétons, terrasses, bonus, mines, roquettes, garage, campagne, modes, radio, discussion |
| `build.sh` | Assemble les deux HTML dans `build/` puis les copie à la racine |
| `src/convert.py` | OSM → `world_raw.json` |
| `src/carve.py` | Profils de routes, ponts, terrain plus fin → `world.json` |
| `src/plan_facades.py`, `curate_facades.py`, `build_photos.py` | Choix, tri et assemblage des photos Panoramax |
| `src/make_street_data.py` | Commerces OSM (`shops.json`) et indices de façade (`facade_hints.json`) |
| `src/make_furniture.py` | Mobilier urbain OSM (`furniture.json`) |
| `src/make_ortho.py` | Photo aérienne IGN (`ortho_raw.jpg` → `ortho.jpg`) |
| `data/` | Données sources (environ 20 Mo) ; `map.osm`, `bdtopo.json`, `world_raw.json`, `facades*/`, `ortho/`, etc. |
| `tools/` | Scripts de test Playwright et leur mode d'emploi |
| `server/` (branche `server` seulement) | `server.js`, `package.json`, `Dockerfile` |
| `gangstamen.html`, `gangstamen-hd.html` | Sorties construites, **commitées** (artifacts et copies prêts à l'emploi) |
| `LEDGER.md`, `README.md`, `DATA-LICENSES.md`, `HANDOFF.md` | Documentation |

### Chaîne de construction (`sh build.sh`)
1. Copie des données dans `build/`.
2. Insertion de `hd.js` et `gx.js` dans `template.html`.
3. `carve.py` produit `world.json` (routes, ponts, relief).
4. `build_photos.py` incorpore les données et l'atlas de façades : produit `gangstamen.html`.
5. Variante HD : même fichier avec `const HD = true`, titre « Gangstamen HD », atlas de photos remplacé par `window.PHOTO_ATLAS=[]`, et `window.ORTHO={src,x0:-440,z0:-760,x1:440,z1:760}` (photo aérienne en base64).

Le code HD ne s'exécute que si `HD` est vrai (`const gx = !HD ? null : …`). **Un seul code source, deux sorties.**

### Organisation de `template.html` (dans l'ordre du fichier)
générateur aléatoire à graine · rendu et scène · textures · grille de collision des murs · aides géométriques · ville (`buildCity`) · voitures (`class Car`, `makeCar`) · effets · son · réglages · entrées (claviers, manettes, tactile) · état du jeu · équipes · HUD · fin de partie · jour/nuit/pause · combat · IA · réseau · menus · intro · démarrage de partie · boucle · amorçage.

### Concepts du moteur à connaître
- **Couleurs** : tout est écrit en sRGB ; en HD, converti une seule fois en linéaire (`linearize`, `linMat`). Ne pas mélanger.
- **Rendu HD** : cible HDR linéaire avec MSAA, chaîne de bloom, tone mapping ACES, vignette et grain ; ciel procédural et sonde d'environnement PMREM ; ombres PCFSoft ; 4 niveaux de qualité, baisse automatique sous 25 images par seconde (`hd.perf`).
- **Particules** : réserve côté processeur dessinée en `Points` (fumée, feu, étincelles, éclairs).
- **Graphe des rues** `G` (`G.x`, `G.z`, `G.adj`) : sert à l'IA, à la circulation, au calcul d'itinéraires (`route`), aux points d'apparition.
- **Jeu** : `enemies(a,b)` décide qui tire sur qui ; `TEAMS`, `bases()`, `teamSpawn` ; objet `Match` (objectifs, fin, revanche) ; `muzzleOf(c)` et `tracer(...)` pour les tirs ; `roadEdge` / `offRoad` pour garder arbres et lampadaires hors de la route.
- **Réglages** : `settings`, enregistrés dans `localStorage` sous `gangstamen.settings.v1` (par navigateur) ; progression de campagne et banque dans `settings.camp` et `settings.bank`.
- **Réseau** : voir section 3 bis.
- **Intro** : objet `Intro` (états `off`, `splash`, `play`), plans calculés comme fonction du temps depuis le départ, coupes sur les mesures du morceau (`BAR`), six voitures de rue remplacées par six acteurs pendant la séquence, restauration propre à la sortie.
- **Objet de test** `window.__gm` : expose `Intro`, `hd`, `gx`, `Match`, `locals`, `rivals`, `Net`, `muzzleOf`, `shoot`, `start`, etc.

### 3 bis. Jeu en ligne
- Chaque client simule **sa** voiture et diffuse position, vitesse et tirs environ 30 fois par seconde (présence). Les voitures des autres sont lissées et extrapolées.
- Le tireur prévient la victime par événement `hit` ; la victime applique les dégâts puis annonce `ko`. Pour les bots (voitures des Rapaces), l'hôte les simule ; les autres lui signalent leurs tirs par `hb` ; `bko` crédite un KO sur un bot.
- Nouveaux sujets de la HD : `rk` (roquettes vues par les autres), `bl` (explosions), `qc` (discussion rapide). Les dégâts d'armes en ligne restent calculés chez le tireur.
- État de partie (`pres.m`) et équipes (`tm`, `md`) circulent par la présence.
- Deux transports avec la même interface : la capacité `room` de claude.ai, ou le WebSocket du serveur Node (`window.GM_SERVER="auto"`, injecté par le serveur). Le serveur ne simule rien : il relaie, et accepte tout sujet de la forme `^[a-z][a-z0-9_.-]{0,47}$`.
- **Capture du drapeau n'est pas encore en ligne**, et circulation, piétons et bonus sont propres à chaque joueur (non synchronisés). Le tram aussi est simulé chez chaque joueur (même horaire de départ, mais pas synchronisé).

---

## 4. Code source complet et dernière version fonctionnelle

- **Dépôt** : https://github.com/BI-cell44/Gangstamen, branches `main` (artifacts) et `server` (`main` + serveur).
- **Dernière version fonctionnelle** : branche `passation-2026-11-13`, commit de la fusion de `hd-ambiance-campagne` dans `main` puis ajout de ce dossier et des outils de test. `main` et `server` ont le même jeu ; `server` ajoute seulement `server/`, `Dockerfile` et `.gitignore`.
- **Archive** : `gangstamen-passation-2026-11-13.zip` livrée avec ce dossier (arbre de travail de `main` : sources, données, scripts, outils, les deux HTML construits). Elle ne contient pas l'historique git.
- **Fichiers prêts à jouer** : `gangstamen.html` (2,7 Mo) et `gangstamen-hd.html` (4 Mo) à la racine du dépôt.

---

## 5. Choix techniques et décisions

- **Un fichier HTML par version, sans serveur** : le jeu doit tourner comme artifact claude.ai. D'où : pas de bundler, données incorporées en base64, three.js depuis cdnjs, tout l'audio généré par WebAudio.
- **Un seul code source pour deux versions** (drapeau `HD`) plutôt que deux forks : les corrections de conduite, de ponts ou de réseau profitent aux deux. Contrepartie : tout code HD doit rester derrière `if (HD)` ou `gx`.
- **Jeu en ligne sans attente de l'hôte** : chaque client décide de sa conduite et de ses tirs, l'hôte ne simule que les bots. Choix demandé par l'utilisateur (comme sur son projet « bomberwarrior ») pour éviter la latence.
- **Même interface réseau pour deux transports** (`room` de claude.ai et WebSocket) : le jeu ne sait pas lequel il utilise.
- **Couleurs sRGB converties une fois en linéaire** en HD pour éviter les couleurs lavées ou noires.
- **Façades** : les photos Panoramax servent de référence (couleur du mur, rythme des fenêtres), mais la HD **redessine** les bâtiments plutôt que de plaquer les photos (arbres devant, ciel, doubles images les rendent inutilisables telles quelles). Seuls 307 morceaux sur 1 077 passent le tri automatique.
- **Photo aérienne IGN** : utilisée comme masque (jardin ou pavé) et pour colorer les toits, **pas plaquée au sol** (toits et arbres y débordent sur les trottoirs). `aRoad` garde les trottoirs pavés.
- **Street View refusé** : ses conditions d'utilisation interdisent d'extraire les images, même en local. Panoramax (licences libres) le remplace.
- **Tirs aux canons** : la position des canons est lue sur le modèle (`userData.muzzles`) ; les éclairs de bouche sont un petit pool de sprites en classique et des particules en HD.
- **Minicarte** : triangle de bord pour les ennemis hors champ, avec lissage en `smoothstep` sur 300 m ; pas de triangle pour les coéquipiers.
- **Collision aux murs en trois cercles** plutôt qu'un seul : la voiture est longue, un cercle de 2 m laissait traverser les angles de bâtiments.
- **Qualité adaptative** : baisse d'un cran à moins de 25 images par seconde (mesure sur 5 s). Défaut connu, voir section 6.
- **Données figées dans le dépôt** : les téléchargements OSM, IGN et Panoramax ne sont pas refaits à chaque build (le bac à sable n'y a pas accès ; seul le navigateur de l'utilisateur y accède). Les scripts de `src/` les régénèrent depuis un poste qui a accès au réseau.
- **Réglages par navigateur** (`localStorage`), jamais partagés en ligne, sauf les choix de voiture et d'équipe envoyés par la présence.

---

## 6. Bugs connus et problèmes non résolus

**À corriger**
0. **Carte agrandie (14 novembre)** : chargement et fluidité de la HD à vérifier sur une vraie carte graphique (environ 4 800 bâtiments au lieu de 2 900). Les volées basses de l'escalier Sainte-Anne dépassent un peu du terrain.
1. **Message « Qualité graphique réduite » à tort** (signalé par l'utilisateur au lancement de la HD). Cause probable : saccades de chargement ou PC sur carte graphique intégrée, vus comme une machine trop lente. Correctif prévu : case « Qualité automatique » et délai de grâce d'environ 15 s au démarrage (`hd.perf` dans `src/hd.js`).
2. **Les mines du Vautour** : l'utilisateur a signalé qu'elles « ne semblent pas marcher » ; une correction est dans la dernière branche (mines visibles et efficaces), **non revérifiée par l'utilisateur**. Le dire clairement et demander à l'utilisateur de rejouer la mission.
3. **Bout de pont près de la place Jean-Macé légèrement décollé** : correctif fait (12 derniers mètres de chaque tablier raccordés au terrain), **non revérifié visuellement par l'utilisateur**.

**Non vérifiables dans le bac à sable**
- Performances réelles de la HD sur une vraie carte graphique (le rendu logiciel tourne à environ 2 images par seconde).
- Synchronisation du son de l'intro, voix françaises, radio, vibrations de manette (aucun audio ni manette en test).
- Parties en ligne à plusieurs joueurs réels : modes colline et course, discussion rapide, roquettes vues par les autres, mélange classique et HD sur le serveur. Jamais testé à deux.
- Ressenti de conduite (dérapage, sauts), équilibre des missions (dégâts des mines, vitesse du Vautour, roquettes du Grand Duc, chrono de l'orage).

**Limites connues de la HD**
- Quelques toits ou rez-de-chaussée étranges ; détection des jardins clairsemée.
- Mairie : fronton à horloge supposé ; dos et côtés reprennent la face avant.
- Enseignes de chaînes nationales à libellé générique.
- Taille des flammes à ajuster après essai réel.
- Bonus, circulation et piétons non synchronisés entre joueurs en ligne ; pas de capture du drapeau en ligne.

**Contraintes d'environnement**
- Le shell du bac à sable n'atteint pas OSM, Overpass, l'IGN, Panoramax ni cdnjs. Pour agrandir la carte, il faut soit autoriser ces sites, soit lancer les scripts ailleurs, soit passer par le navigateur de l'utilisateur.
- `device_bash` (shell sur l'ordinateur de l'utilisateur) est parfois indisponible ; le pont de fichiers fonctionne alors.
- Fichier temporaire de 5,6 Mo (`*.tmp`, la photo aérienne) à supprimer dans `C:\Users\SF\Downloads`.

---

## 7. Améliorations envisagées et prochaines étapes

Par ordre proposé :

1. **Qualité automatique** (section 6, point 1).
2. **Faire essayer la HD à l'utilisateur** et recueillir ses retours (fluidité, flammes, mines, pont, intro avec son).
3. **Essai en ligne à plusieurs** (claude.ai et serveur), puis corrections.
4. **Régler la difficulté de la campagne** après une vraie partie.
5. **Capture du drapeau en ligne** (l'hôte doit tenir l'état des drapeaux) et synchronisation des bonus.
6. ~~Agrandir la carte~~ (fait le 14 novembre 2026). Pour refaire les données : requêtes Overpass, WFS `BDTOPO_V3:batiment`, altimétrie `ign_rge_alti_wld` et WMS ortho lancées depuis le navigateur intégré (voir `LEDGER.md`, section 8), puis `convert.py`, `make_street_data.py`, `make_furniture.py`, `make_ortho.py`.
7. Améliorer la mairie, les toits, les jardins, les enseignes.
8. Idées à plus long terme : parcours chronométrés en solo, plus de quartiers de Nantes, sons et textures propres à la ville (tram, cloches, enseignes).

---

## 8. Consignes pour ne pas casser l'existant

**Méthode**
- **Source de vérité** : `src/template.html`, `src/hd.js`, `src/gx.js` et `data/`. **Ne jamais modifier à la main `gangstamen*.html`** : ce sont des sorties de `build.sh`.
- Après chaque changement : `sh build.sh`, contrôle de syntaxe, test, puis commit des sources **et** des deux HTML construits.
- Avant un gros changement, copier le fichier à modifier (`*.before-xxx`). Les anciennes versions sont aussi dans `git log` ; la branche `passation-2026-11-13` permet de tout restaurer.
- Faire les changements avec de petits scripts de remplacement qui vérifient que le texte à remplacer existe **une seule fois** ; c'est ce qui a évité les remplacements silencieux.
- Ne pas déclarer « marche » sans test. Pour ce qui dépend du temps, utiliser les crochets de test ; pour ce qu'on ne peut pas vérifier (son, manette, performances, multi-joueur), le **dire** à l'utilisateur.

**Publication sur claude.ai (critique)**
- Les deux artifacts s'appellent « classique » et « HD ». Les mettre à jour en republiant **le même fichier au même URL**.
- Toujours redéclarer la capacité `room` avec **tous** les sujets ouverts au niveau `interact` : `hit`, `hb`, `ko`, `bko`, `qc`, `rk`, `bl`. Un sujet oublié devient réservé au propriétaire : les autres joueurs ne peuvent plus l'émettre, sans message d'erreur visible. **Tout nouveau sujet réseau doit être ajouté à cette liste.**
- Les autres joueurs doivent avoir un accès Contributeur ou plus à l'artifact pour que leurs tirs comptent.
- Ne pas écraser les artifacts de référence (section 9).

**Branches**
- Travailler sur une branche, fusionner dans `main`, puis **fusionner `main` dans `server`** (jamais l'inverse). Pousser `main` et `server` ensemble.
- Ne pas ajouter à `server` de code de jeu absent de `main`.

**Règles de code à respecter**
- Tout code HD derrière `if (HD)` ou dans `gx`. Un test dans les deux versions après chaque changement commun (conduite, ponts, collision, réseau).
- Couleurs : sRGB à l'écriture, une seule conversion en linéaire en HD.
- Ne pas créer de géométries ou de matériaux sans les libérer quand l'objet disparaît (`removeNpc` donne le modèle) ; ne pas libérer ceux marqués `userData.shared`.
- Les sujets réseau ne transportent jamais de dégâts calculés par le receveur ; le tireur prévient la victime, qui applique.
- Les tirs partent des canons (`muzzleOf`), pas du centre de la voiture.
- Les arbres et lampadaires passent par `roadEdge` / `offRoad` ; ne pas les replacer sur la chaussée.
- Les réglages passent par `settings` et `saveSettings()` ; ajouter une valeur par défaut dans l'objet `settings` pour tout nouveau réglage.
- Les textes affichés sont en **français**, avec accents et apostrophes courbes (’).
- Ne pas retirer les crochets de test (`__gm`, `__introT`…) ; ils servent à tout vérifier.
- La cinématique d'intro remplace temporairement les six voitures de rue : toute modification de `rivals` ou de `Car` doit laisser `Intro.reset()` rétablir l'état normal.

**Données et licences**
- Ne jamais intégrer d'images Google ou Street View. Les photos viennent de Panoramax (CC BY-SA 4.0) et la photo aérienne de l'IGN (Licence Ouverte Etalab 2.0). `DATA-LICENSES.md` doit rester à jour si une source est ajoutée.
- Ne pas télécharger de photo d'une personne réelle.

**Avec l'utilisateur**
- Réponses en français. Il apprécie : un court récapitulatif de ce qui change, la vérification visuelle (captures), l'honnêteté sur ce qui n'est pas testé, la mise à jour du dépôt, des artifacts et du dossier `D:\Developpement\Gangstamen`.
- Une demande claire se réalise directement, sans plan à valider.

---

## 9. Artifacts de référence

Les deux artifacts de travail resteront ceux sur lesquels on republie. Pour ne rien perdre, deux **copies figées** ont été publiées le 13 novembre 2026 comme artifacts séparés, avec le même code que la branche `passation-2026-11-13` :

- « Gangstamen HD (référence 2026-11-13) »
- « Gangstamen classique (référence 2026-11-13) »

- Référence HD : `https://claude.ai/artifact/JWH66Pm5HUyYNyY4W1cdua`
- Référence classique : `https://claude.ai/artifact/RMZCtkzA3UGBdQ6GfKuvZe`

Elles sont privées (propriétaire seul) ; la galerie des artifacts est à claude.ai/code/artifacts. Ce sont des copies à l'identique du code, sauf le titre de la page. Artifacts de travail (à mettre à jour) : classique `https://claude.ai/artifact/8qmc5b2RMAPv71rtScT7bC`, HD `https://claude.ai/artifact/BPok545VCEruvLU1Y8z9cf`.

Dans une nouvelle conversation, pour republier un artifact existant : le lire d'abord (`read`), puis publier le fichier avec l'URL ; ne pas oublier la déclaration `capabilities` de la section 8.
