# État du projet

Mis à jour le 14 novembre 2026 (branche `ultra`, cycles 0 à 12 faits, sources découpées ; prochain : cycle 13, catégories de véhicules ; l'utilisateur a demandé d'enchaîner jusqu'au cycle 14). À relire en premier avec `CLAUDE.md`.

## 1. Le jeu aujourd'hui

**Gangstamen** est un jeu de combat de voitures façon fin des années 90, en 3D dans le navigateur, dans les **vraies rues de Chantenay** (Nantes). Les **Rapaces** (orange, bande de la butte) affrontent les **Chantenaysiens** (bleu). Un seul fichier HTML par version, sans installation, publié comme artifact claude.ai.

Trois sorties, construites depuis le même code (`sh build.sh`) :

| Fichier | Rôle |
|---|---|
| `gangstamen.html` | Version classique, rendu rétro, légère (3,4 Mo) |
| `gangstamen-hd.html` | Version HD : rendu HDR, météo, campagne, vie de quartier (5,3 Mo) |
| `gangstamen-ultra.html` | Branche `ultra` uniquement : la HD qui reçoit les évolutions de la feuille de route (`docs/BACKLOG.md`) |

**La carte** : 2 037 m sur 1 532 m (x de −372,5 à 1 664, z de −845 à 686,5 ; origine fixe 47,2025° N, −1,590005° E, x vers l'est, z vers le sud), du boulevard de la Liberté à la butte Sainte-Anne et au quai de la Fosse. Au nord, la ligne 1 du tram ferme la carte ; ailleurs, des barrières de chantier. Environ 4 800 bâtiments, 1 800 rues et chemins, relief IGN, Loire.

**Ce que le joueur peut faire**
- Combat libre contre les bots (KO, chrono, équipes), colline, course, capture du drapeau.
- Campagne solo (HD) : 7 missions avec dialogues, garages (réparation, munitions, moteur, blindage, mitrailleuses, peinture), banque de respect.
- Écran partagé 2 à 4 ; en ligne jusqu'à 12 (capacité `room` de claude.ai ou serveur Node de la branche `server`).
- HD : météo et cycle jour-nuit, circulation civile, police avec niveau de recherche, piétons et terrasses, bonus (nitro, mines, roquettes, bouclier, clé), radio à 4 stations, tram, église et escalier Sainte-Anne.
- Circulation v2 (cycle 7) : feux tricolores réels, stops, sens uniques, clignotants, dépassements, bus TAN sur leurs lignes, patrouilles de police qui chassent les Rapaces.
- Son synthétisé (cycle 5) : moteur selon régime et charge, pneus, pavés, chocs, Doppler des voitures proches, ambiance par lieu (Loire, goélands, cloches de Sainte-Anne, tram, foule).
- 5 modèles de voiture (berline, 205, compacte, R5, Twingo), 10 peintures ; 6 caméras, regard arrière, mode photo (F2).

## 2. Architecture technique

### Technologies (décisions dans `DECISIONS_TECHNIQUES.md`)
- **three.js r128** depuis cdnjs ; pas de bundler, pas de framework, pas de module ES : un fichier HTML autonome par version.
- **Python 3** pour la préparation des données (`curate_facades.py` demande Pillow et numpy).
- **WebAudio** : musique et bruitages tous générés. **Synthèse vocale** du navigateur pour les dialogues.
- **Node.js** sans dépendance pour le serveur (branche `server`).
- Tests : Playwright avec le Chrome du système, rendu logiciel (swiftshader).

### Sources
| Fichier | Lignes | Contenu |
|---|---|---|
| `src/template.parts` → `shell/page.html` | 380 | Page : styles, menus et écrans en HTML, chargement de three.js |
| `core/` | | `prelude.js` (lecture du monde `W`, constantes), `random.js`, `renderer.js` (drapeaux `HD`, `ULTRA`, scène, caméras, soleil), `textures.js` (contient le marqueur `/*@HD_MODULE@*/`), `collision.js` (grille des murs), `geometry.js`, `settings.js` (réglages et sauvegarde), `boot.js` (amorçage, crochet `__gm`, fin de page) |
| `world/` | | `city.js` (bâtiments, routes, sol, arbres, eau, rails : 560 lignes), `edges-tram.js` (murs et barrières de bord, tram) |
| `vehicles/`, `fx/`, `audio/`, `input/` | | `cars.js` (modèles, `class Car`, `drive`), `effects.js`, `sound.js` (`sfx`, musique, radio), `input.js` (claviers, manettes, tactile) |
| `game/` | | `state.js`, `teams.js`, `match-end.js`, `combat.js`, `start.js`, `loop.js` (boucle, caméras, superposition F3) |
| `ui/`, `ai/`, `net/` | | `hud.js`, `day-night-pause.js`, `menus.js`, `intro.js` (contient le marqueur `/*@GX_MODULE@*/`) ; `bots.js` ; `network.js` |
| `src/hd.parts` → `hd/` | 1 490 | Rendu HD : `colour.js`, `post.js`, `sky.js`, `time-weather.js`, `particles.js`, `impact-fx.js`, `damage.js`, `car-fx.js`, `frame.js` (rendu, qualité adaptative), `world-upgrades.js`, `facades.js`, `shops.js`, `ground.js`, `ortho.js`, `town-hall.js`, `cars.js` |
| `src/gx.parts` → `gx/` | 1 700 | Jeu HD : `traffic.js`, `police.js`, `pedestrians.js`, `crowd.js`, `terraces.js`, `voices.js`, `frame.js` (pas de jeu), `dialogue.js`, `mission-hud.js`, `garages.js`, `pickups-weapons.js`, `furniture.js`, `campaign.js`, `radio.js`, `quick-chat.js`, `modes.js`, `landmarks.js` (Saint-Martin, Sainte-Anne, quais, Titan), `zz-world-api.js` (construction et interface publique `gx`) |
| `src/*.py` | 900 | Chaîne de données : `convert.py` (OSM et IGN → `world_raw.json`), `carve.py` (profils de routes, ponts, relief → `world.json`), `make_street_data.py`, `make_furniture.py`, `make_ortho.py`, scripts des façades Panoramax |

`build.sh` assemble chaque manifeste dans l'ordre, puis insère le rendu HD et le jeu HD à leurs marqueurs : le résultat est le même texte qu'avant le découpage (vérifié à l'octet le 14 novembre 2026). Tout partage **une seule portée** (une fonction englobante) : tout est visible de partout, les dépendances restent implicites.

### Concepts du moteur
- **Couleurs** : écrites en sRGB ; en HD, converties une seule fois en linéaire (`linearize`, `linMat`, `hd.lin`).
- **Monde** : `W` (données incorporées), `W.meta` (`cx`, `cz`, `hx`, `hz` : centre et demi-tailles), `W.tram` (z(x) des voies), `G` (graphe des rues pour l'IA et les itinéraires), `groundH` / `surfaceH` (hauteur du sol, des routes), `gridAdd` / `cellOf` / `collideWalls` (murs en grille de 12 m ; un mur doit être ajouté avec une marge de 3,5 m, la recherche ne regarde que la cellule du centre de la voiture).
- **Voitures** : `class Car`, `drive(c, inp, dt)` (modèle arcade : vitesses avant et latérale, dérive, frein à main, sauts), collision en trois cercles.
- **Jeu** : `TEAMS`, `enemies(a, b)`, `Match`, `muzzleOf` / `tracer`, `damage` / `applyHit`.
- **Réglages et progression** : `settings` dans `localStorage` (`gangstamen.settings.v1`) : réglages, `camp` (missions faites), `bank` (respect), `upg` (améliorations), `cars` (modèle et peinture).
- **Réseau** : chaque client simule sa voiture et diffuse sa présence ~30 fois par seconde ; le tireur prévient la victime (`hit`), qui applique et annonce `ko` ; l'hôte simule les bots (`hb`, `bko`) ; sujets HD `rk`, `bl`, `qc`. Deux transports avec la même interface (`room` claude.ai, WebSocket du serveur).
- **Crochets de test** : `window.__gm` (état et fonctions), `__cam`, `__camAt`, `__trHold`, `__introT`, `__noIntro`.

## 3. Audit du 14 novembre 2026 (cycle 0)

Mesures dans Chrome sans tête, rendu logiciel, HD, partie solo au départ (`tools/tests/nov14_h.js` et scripts `prof*.js` de l'audit). Le rendu logiciel ne donne pas d'images par seconde utilisables ; les comptes, eux, sont fiables.

### Rendu
| Mesure | Valeur | Commentaire |
|---|---|---|
| Appels de dessin par image | **≈ 1 240** (qualité basse) à 1 320 (haute) | Élevé : au-delà de 500 à 800, les cartes graphiques intégrées décrochent |
| Triangles par image | ≈ 2,2 millions (ombres comprises) | Toute la ville est dessinée à chaque image : les bâtiments sont fusionnés **par matériau sur toute la carte**, donc jamais écartés hors champ |
| Objets maillés dans la scène | 4 388 (3 547 géométries, 362 matériaux, 64 programmes de shader) | |
| Voitures | 21 voitures × **75 maillages** et 10 000 triangles chacune ≈ 1 600 maillages | Premier poste : pièces de carrosserie, phares, roues séparées |
| Terrasses | 256 tables × 4 boîtes, 147 parasols à 2 cylindres, 51 objets à 18 cylindres ≈ **1 400 maillages** | Second poste : du mobilier identique, idéal pour l'instanciation |
| Foule | 12 maillages instanciés | Déjà optimisée |
| Mémoire JavaScript | ≈ 200 Mo | |
| Chargement HD | ≈ 100 s en rendu logiciel (40 s avant l'agrandissement) | À mesurer sur vraie machine ; les façades sont générées au démarrage |
| Simulation seule | ≈ 5,4 ms par pas de 1/60 s (rendu logiciel, processeur lent) | Correct ; la foule et la circulation dominent |

### Code et architecture
- **Forces** : un seul code pour trois sorties ; données réelles soignées ; chaîne de données reproductible ; build reproductible à l'octet ; beaucoup de systèmes déjà présents (météo, police, campagne, réseau sans latence, intro).
- **Portée unique** : `template.html` mêle moteur, jeu, interface et réseau ; `gx.js` dépend de dizaines de variables du template (`rivals`, `locals`, `sfx`, `W`, `G`…) sans liste explicite. Ajouter un système demande de connaître tout le fichier.
- **Collisions** : grille de segments 2D ; depuis le 14 nov., un segment peut porter une hauteur (5e valeur) au-dessus de laquelle une voiture en l'air passe (arbres, lampadaires).
- **Conduite (cycle 4)** : deux modèles. *Réaliste* (`vehicles/physics.js`, par défaut sur Ultra, voitures des joueurs locaux) : modèle bicyclette, pneus, report de poids, moteur et boîte, données `VEHICLES` par voiture. *Arcade* (`planarArcade` dans `vehicles/cars.js`) pour les bots, la circulation, la version classique et au choix du joueur. La partie commune de `drive()` gère la Loire, le mouvement vertical, les murs et les bords.
- **Conduite (avant le cycle 4)** : modèle arcade à un corps (vitesse avant, vitesse latérale amortie), pas de boîte de vitesses, pas de transfert de masse, pas de régime moteur ; les 5 modèles ne diffèrent que par l'apparence et quelques coefficients. Bon pour le combat, trop pauvre pour plusieurs catégories de véhicules et des courses.
- **Son moteur** : un oscillateur et un filtre suivant la vitesse ; pas de régime, de charge, de passage de rapport ni de crissement lié au glissement.
- **Caméras** : 3 modes fixes (poursuite proche, haute, capot) ; pas de gestion de collision avec les murs, pas de caméra libre ou photo.
- **Circulation** : suit le graphe, s'arrête derrière les autres ; pas de feux, de priorités ni de voies ; ignore le tram.
- **Sauvegarde** : des clés éparses dans `settings`, sans version de schéma ni emplacements ; pas d'export.
- **Tests** : scripts Playwright au cas par cas (`tools/tests/`), sans lanceur commun ni rapport ; pas de mesure de performance suivie dans le temps. *(Corrigé au cycle 1 : `tools/run-tests.js`, `docs/perf.json`.)*
- **Qualité adaptative** : baisse à moins de 25 images par seconde sur 5 s, sans délai de grâce : se déclenche à tort pendant le chargement (signalé par l'utilisateur).

### Mesures de référence (cycle 1, `docs/perf.json`)
| Sortie | Chargement (rendu logiciel) | Appels de dessin | Triangles | Maillages | Mémoire JS | Simulation par pas |
|---|---|---|---|---|---|---|
| Classique | 8 s | 221 | 1,25 M | 510 | 117 Mo | 1,4 ms |
| HD / Ultra (cycle 1) | 92 s | 1 340 | 2,26 M | 4 388 | 190 Mo | 5,4 ms |
| **Ultra, cycle 2** | 82 s | **485** | **0,86 M** | 1 808 | 202 Mo | 5,0 ms |
| Classique, cycle 2 | 6 s | 282 | 0,40 M | 829 | 98 Mo | 1,3 ms |
| **Ultra, cycle 3** | **19 s** | 560 | 0,89 M | 1 808 | 202 Mo | 5,0 ms |
| Classique, cycle 3 | 5 s | 282 | 0,40 M | 829 | 117 Mo | 1,2 ms |

Le chargement de la HD venait surtout des textures de façades (50 s, corrigé au cycle 3) et de la première image (shaders, textures : maintenant faite pendant la barre de chargement). Le détail par étape est dans `__gm.BOOT.marks`. La superposition F3 donne ces chiffres en jeu.

### Ce qui n'a jamais pu être vérifié (pas d'écran, de son ni de manette ici)
Performances réelles, son (intro, radio, voix, cloche du tram), vibrations, ressenti de conduite, équilibre des missions, parties en ligne à plusieurs.

## 4. Bugs et limites connus
- Qualité automatique : l'ancienne règle (moyenne sur 5 s, baisse sous 25 images par seconde) est rétablie à la demande de l'utilisateur, qui la trouvait meilleure ; seule la case pour la couper reste du cycle 1.
- Mines du Vautour et bout de pont près de Jean-Macé : corrigés, **non revérifiés par l'utilisateur**.
- Escalier Sainte-Anne : les volées du bas dépassent un peu du terrain.
- Le Vautour fuit « vers le quai de la Fosse » alors que le quai est dans la carte.
- La nouvelle zone n'a que des façades dessinées (pas de photos Panoramax).
- En ligne : capture du drapeau absente ; circulation, piétons, bonus et tram non synchronisés.
- Mairie : fronton supposé, dos et côtés copiés de la face ; quelques toits ou rez-de-chaussée étranges ; enseignes nationales génériques.

## 5. Artifacts claude.ai

| Artifact | Adresse | Mise à jour |
|---|---|---|
| Classique (travail) | https://claude.ai/artifact/8qmc5b2RMAPv71rtScT7bC | depuis `main` |
| HD (travail) | https://claude.ai/artifact/BPok545VCEruvLU1Y8z9cf | depuis `main` |
| **Ultra** (travail) | https://claude.ai/artifact/GYxFj8ntvQLZhiW64qBvu1 | depuis `ultra` |
| HD (référence figée du 13 nov.) | https://claude.ai/artifact/JWH66Pm5HUyYNyY4W1cdua | **ne jamais écraser** |
| Classique (référence figée du 13 nov.) | https://claude.ai/artifact/RMZCtkzA3UGBdQ6GfKuvZe | **ne jamais écraser** |

Tous privés (propriétaire seul). À chaque republication, la capacité `room` doit garder **tous** les sujets réseau au niveau `interact` : `hit`, `hb`, `ko`, `bko`, `qc`, `rk`, `bl`.
