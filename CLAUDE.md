# Gangstamen : consignes pour reprendre le travail

Jeu de combat de voitures en 3D dans les vraies rues de Chantenay (Nantes), un fichier HTML par version, publié comme artifact claude.ai. L'utilisateur écrit en français : répondre en français ; tous les textes du jeu sont en français (accents, apostrophe courbe ’).

**À lire dans l'ordre** : ce fichier, `docs/ETAT_DU_PROJET.md` (état, architecture, audit, artifacts), `docs/BACKLOG.md` (seul fichier du reste à faire, réparti Fable / Opus : prendre la première tâche de sa liste), `docs/DECISIONS_TECHNIQUES.md` (ne pas défaire une décision en vigueur sans le dire), `docs/HISTORIQUE.md` (ce qui a été fait). `README.md` est pour les joueurs.

## Branches
- `main` : version stable (classique et HD). `server` = `main` + serveur Node : fusionner `main` dans `server`, jamais l'inverse, et pousser les deux ensemble.
- `ultra` : évolutions de la feuille de route, publiées sur l'artifact Ultra. Fusionner `main` dans `ultra` pour récupérer les corrections ; `ultra` ne va dans `main` qu'avec l'accord de l'utilisateur.
- Il n'y a que ces trois branches (décision de l'utilisateur, 15 nov.). Travailler sur une branche à part le temps d'une tâche si une autre session est sur `ultra`, puis la fusionner et la supprimer.
- Anciennes branches à supprimer sur GitHub par l'utilisateur (le bac à sable ne peut pas supprimer de branche) ; leurs commits sont tous dans l'historique de `main`, `ultra` et `server` : passation figée du 13 nov. `c92a34e` (main) et `98ff32e` (server), `carte-sainte-anne` `f20574b`, `hd-ambiance-campagne` `e786736`. Pour en retrouver une : `git branch nom commit`.

## Construire
`sh build.sh` produit `gangstamen.html` (classique), `gangstamen-hd.html` (HD) et, sur `ultra`, `gangstamen-ultra.html`. Les sources sont découpées par système (décision D-12) : `src/template.parts`, `src/hd.parts` et `src/gx.parts` listent dans l'ordre les fichiers assemblés en une seule portée (moteur commun dans `src/shell`, `core`, `world`, `vehicles`, `fx`, `audio`, `input`, `game`, `ui`, `ai`, `net` ; rendu HD dans `src/hd/` ; jeu HD dans `src/gx/`), plus `data/`. Plan détaillé : `docs/ETAT_DU_PROJET.md`, section 2. Tout est dans la même portée : une fonction d'un fichier voit celles des autres ; l'ordre du manifeste compte pour les `const` lus au chargement. Pour trouver un symbole : `grep -rn "function nom" src`. **Ne jamais modifier les `.html` construits à la main** ; les commiter avec les sources. Le build est reproductible à l'octet.

## Tester (pas d'écran, de son ni de manette ici)
- `cd /home/claude/t` (créer si absent : `npm i playwright three@0.128.0`, copier `node_modules/three/build/three.min.js` à côté) ; le Chromium de Playwright ne s'installe pas : `tools/tests/nov14_h.js` utilise `/usr/bin/google-chrome` en rendu logiciel. three.js et les polices sont servis par interception (cdnjs bloqué).
- La HD met environ 100 s à charger en rendu logiciel ; prévoir des délais de 10 min. Le rendu tourne à environ 1 image par seconde : tout ce qui dépend du temps passe par `__gm.step(dt)`.
- Crochets : `window.__gm` (`start`, `step`, `locals`, `rivals`, `gx`, `hd`, `renderer`, `scene`, `trams`, `edges`, `damage`, `applyHit`…), `__camAt = [x, y, z, visée x, y, z]` (y absolu : la butte monte à 40 m), `__cam`, `__trHold`, `__introT`, `__noIntro`.
- Ne jamais dire « ça marche » sans test ; dire clairement ce qui n'a pas pu être vérifié (son, manette, fluidité réelle, en ligne à plusieurs).

## Modifier le code sans casser
- Petits scripts de remplacement qui vérifient que le texte visé existe **une seule fois** (`/home/claude/tools/rep.py FICHIER PAIRES.py`, à recréer au besoin : il remplace chaque paire `(ancien, nouveau)` en exigeant une occurrence unique).
- Tout code HD derrière `if (HD)` ou dans `gx` ; couleurs écrites en sRGB, une seule conversion en linéaire en HD.
- Murs de collision : `gridAdd(segment, 3.5)` (la recherche ne regarde que la cellule du centre de la voiture ; une marge plus petite laisse passer).
- Nouveau réglage : valeur par défaut dans `settings`, enregistrement par `saveSettings()`.
- Nouveau sujet réseau : l'ajouter à la capacité `room` de **chaque** artifact (`hit`, `hb`, `ko`, `bko`, `qc`, `rk`, `bl` aujourd'hui), sinon il devient muet pour les autres joueurs.
- Libérer géométries et matériaux des objets retirés, sauf `userData.shared`. Les tirs partent de `muzzleOf(c)`. Arbres et lampadaires passent par `roadEdge` / `offRoad`.
- Avant d'ajouter une fonction dans `src/gx/` ou ailleurs, vérifier que son nom est libre (`grep -rn "function nom" src`) : tout est dans une seule portée, un doublon remplace l'autre sans erreur.
- Shader maison : inclure `<common>` et les morceaux `logdepthbuf` (D-19). Bâtiments et rues inventés au-delà des bords : `src/make_belt.py`, marqués `x: 1`.
- L'intro remplace temporairement six voitures : `Intro.reset()` doit toujours rétablir l'état.
- Données : jamais d'image Google / Street View ni de photo de personne réelle ; tenir `DATA-LICENSES.md` à jour. Les sites de données (OSM, IGN) ne sont joignables que par le navigateur de l'utilisateur : `tools/fetch_data_browser.js`.

## Publier
- Artifacts de travail : classique `https://claude.ai/artifact/8qmc5b2RMAPv71rtScT7bC` et HD `https://claude.ai/artifact/BPok545VCEruvLU1Y8z9cf` (depuis `main`) ; **Ultra** `https://claude.ai/artifact/GYxFj8ntvQLZhiW64qBvu1` (depuis `ultra`). Republier le fichier construit sur le même artifact (`publish_files`, `index.html`) ; vérifier que la capacité `room` a gardé ses sujets.
- **Ne jamais écraser** les références figées : HD `https://claude.ai/artifact/JWH66Pm5HUyYNyY4W1cdua`, classique `https://claude.ai/artifact/RMZCtkzA3UGBdQ6GfKuvZe`.
- Copier les HTML livrés dans `D:\Developpement\Gangstamen` sur l'ordinateur de l'utilisateur quand le pont de fichiers est disponible.
- Accord de l'utilisateur avant : refonte d'architecture, suppression de fonctionnalité, action irréversible, service payant, publication ou partage externe.

## Fin de chaque cycle
Tests (`node tools/run-tests.js` une fois créé), captures avant / après, mesures de performance, commit et push, mise à jour de `docs/ETAT_DU_PROJET.md`, `docs/HISTORIQUE.md` et `docs/BACKLOG.md`, republication de l'artifact Ultra.
