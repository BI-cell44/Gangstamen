# Feuille de route et backlog : Gangstamen Ultra

Établie le 14 novembre 2026 après l'audit (`ETAT_DU_PROJET.md`, section 3). Travail sur la branche `ultra`, publié sur l'artifact « Gangstamen Ultra ». `main` (classique et HD) ne reçoit que des corrections, ou un cycle Ultra terminé et validé par l'utilisateur.

## Principes
- **Profondeur avant étendue** : la carte actuelle (2 km sur 1,5 km) suffit pour plusieurs phases. On ne l'agrandit qu'une fois le rendu par tuiles et le chargement maîtrisés (phase 4).
- **Chaque cycle livre une version meilleure que la précédente**, testée, mesurée, documentée, poussée. Pas de fonctionnalité pour la liste.
- **Le joueur d'abord** : fluidité et ressenti de conduite passent avant le contenu, car tout le reste en dépend.
- Pas de remplacement de technologie sans gain démontré (voir `DECISIONS_TECHNIQUES.md`).
- Note de valeur : ★★★ très visible pour le joueur, ★★ visible, ★ fondation (invisible mais nécessaire).

## Phase 0 : fondations (cycles 1 à 3)

### Cycle 1 : banc de mesure, tests automatisés, qualité automatique ★ / ★★ (fait le 14 nov. 2026, sauf les temps de chargement par étape, reportés au cycle 3)
- [x] Lanceur de tests unique `node tools/run-tests.js <fichier>` : chargement, partie solo, missions, garages, tram, bords, combat, sauvegarde ; rapport lisible et code de sortie.
- [x] Mesures de performance enregistrées à chaque cycle (appels de dessin, triangles, maillages, mémoire, temps de simulation, temps de chargement par étape) dans `docs/perf.json`, pour comparer les versions.
- [x] Superposition de performance en jeu (touche F3) : images par seconde, ms par image, appels de dessin, triangles.
- [x] **Qualité automatique** : case pour la désactiver. *La variante médiane + délai de grâce de 15 s a été retirée le 14 novembre à la demande de l'utilisateur : l'ancienne règle (moyenne sur 5 s, baisse sous 25 images par seconde) marchait mieux chez lui.*
- Critère d'acceptation : tous les tests passent sur les trois sorties ; le message de baisse de qualité ne s'affiche plus pendant le chargement.

### Cycle 2 : fluidité ★★★ (fait le 14 nov. 2026 : appels de dessin −64 %, triangles −62 % en HD)
- [x] **Instanciation** du mobilier répété (tables, chaises, parasols des terrasses, bornes, lampadaires) : environ 1 400 maillages ramenés à une vingtaine.
- [x] **Voitures** : fusion des pièces fixes par matériau (75 maillages ramenés à 24 par voiture : la coque déformable et chaque roue restent à part).
- [ ] Niveau de détail simplifié des voitures au-delà de 120 m (reporté : le gain restant est faible, 12 maillages visibles en moyenne).
- [x] **Ville par tuiles** de 300 m (`world/tiles.js`) : les maillages de plus de 20 000 triangles (relief, routes, murs, toits) et les arbres sont découpés par tuile ; hors champ, ils ne sont plus dessinés, ombres comprises. Le mobilier instancié est groupé par tuile de 250 m.
- [ ] Distance d'affichage du petit mobilier, de la foule et des terrasses selon la qualité (à faire si la vraie machine le demande).
- Objectif mesuré : moins de 450 appels de dessin et 40 % de triangles en moins par image, même rendu à l'œil (captures avant / après). **Résultat** : 485 appels (passes de post-traitement comprises) au lieu de 1 340, 859 k triangles au lieu de 2,26 M ; captures identiques. Classique : 282 appels (221 avant, les tuiles en ajoutent un peu), 399 k triangles au lieu de 1,25 M.

### Cycle 3 : chargement ★★ (fait le 14 nov. 2026 : HD prête en 19 s au lieu de 92 s en rendu logiciel)
- [x] Mesurer chaque étape du démarrage (`BOOT.mark`, `__gm.BOOT`) : 50 s sur 67 venaient des textures de façades HD (chaque tache de crépi peinte sur toute la toile, 2 300 fois par texture), 13 s de la première image.
- [x] Façades : chaque tache n'est plus peinte que sur son carré (même image au pixel près, vérifié) : 50 s → 1,5 s.
- [x] Barre de chargement honnête : étapes de démarrage qui rendent la main au navigateur, pourcentage et étape sur le bouton de départ ; menu désactivé tant que le monde n'est pas prêt.
- [x] Shaders, envoi des textures et première image faits pendant le chargement (lecture d'un pixel pour attendre la fin réelle du travail WebGL, asynchrone) : plus de longue attente après le clic.
- [ ] Reste : environ 5 s de première image du menu en rendu logiciel (autres variantes de shaders) ; réduire le nombre de programmes (64) si la vraie machine le montre.
- Objectif : divisé par deux en rendu logiciel. **Résultat** : bouton prêt en 19 s au lieu de 92 s (HD, rendu logiciel) ; classique 5 s au lieu de 6.

**Découpage des sources en modules** (D-12) : fait le 14 novembre 2026, avant le cycle 2. Étape suivante, au fil des cycles : chaque système déclare en tête de fichier ce qu'il utilise des autres.

## Phase 1 : le ressenti de conduite (cycles 4 à 6)

### Cycle 4 : physique automobile v2 ★★★ (fait le 14 nov. 2026 ; premier réglage jugé injouable par l'utilisateur, refait le jour même au rythme de l'arcade ; arcade par défaut)
- [x] Modèle « bicyclette » avec pneus (force latérale selon l'angle de glissement, adhérence qui sature), transfert de masse à l'accélération et au freinage, sous-virage, frein à main qui bloque l'arrière (`vehicles/physics.js`).
- [x] Moteur et boîte automatique : courbe de couple, régime, 5 rapports, rapport affiché au compteur, son du moteur qui suit le régime.
- [x] Paramètres par véhicule dans un tableau de données (`VEHICLES` : masse, empattement, centre de gravité, couple, traction ou propulsion, adhérence, traînée, rapports) : base des catégories de véhicules.
- [x] Surfaces : chaussée, trottoir, reste (herbe, gravier), mouillé (−25 %).
- Sauts et collisions en hauteur (retour de l'utilisateur, 14 nov.) : une première correction est faite (les obstacles bas ont une hauteur : troncs 2,2 m environ, lampadaires 6,5 m ; une voiture plus haute passe au-dessus). À reprendre ici : vraie gravité, tangage et roulis en l'air, réception sur les suspensions, collisions par hauteur pour tout le mobilier.
- [x] Réglage « Conduite : Arcade / Réaliste » (Son et options) ; arcade par défaut partout ; seules les voitures des joueurs locaux l'utilisent (bots, circulation et version classique restent en arcade) ; réseau inchangé.
- [x] Sauts : gravité 1,35 g en réaliste (22 m/s² en arcade), dégâts à la réception plus tôt et plus forts (une chute de 10 m coûte environ la moitié de la carrosserie).
- [x] **Retour de l'utilisateur (14 nov.) : « injouable, trop long à démarrer, impossible de tourner »**. Réglage refait sur des cibles mesurées en arcade : 0 à 50 km/h en 1,4 s (arcade 1,0 s), 0 à 100 en 2,9 s (arcade 3,1 s), rayon de virage proche de l'arcade (13 m à 36 km/h). Moyens : adhérence de jeu ×2,3, couple ×2,2 et plat, direction moins réduite avec la vitesse, antipatinage quand on braque (les roues motrices gardent de quoi tourner), aide à la stabilité type ESP (coupée au frein à main), passages de rapport plus courts.
- [ ] À régler après un nouvel essai de l'utilisateur : ressenti au clavier et à la manette, glisse de la berline, tangage et roulis en l'air.

### Cycle 5 : son v2 ★★★
- Bus audio : général, musique, effets, ambiance, voix ; atténuation de la musique sous les dialogues.
- Moteur synthétisé selon le régime et la charge (harmoniques, admission, échappement), passages de rapport, pétarades, turbo pour les sportives.
- Crissements selon le glissement réel des pneus, roulement sur pavés, chocs selon la force, effet Doppler des autres voitures.
- Ambiance par lieu : Loire et goélands sur les quais, cloches de Sainte-Anne à l'heure, tram (roulement, cloche, freins), place animée.

### Cycle 6 : caméras ★★
- Gestionnaire de caméras : poursuite à ressort qui suit la vitesse, caméra capot et pare-chocs, caméra cinématique, retour arrière ; la caméra évite les murs dans les rues étroites.
- Mode photo (caméra libre, pause, réglages d'exposition et de profondeur de champ en HD).

## Phase 2 : un monde vivant (cycles 7 à 9)

### Cycle 7 : circulation v2 ★★★
- Voies, intersections avec priorités, **feux tricolores** aux vrais carrefours (nœuds OSM `traffic_signals`), passages piétons, respect du tram.
- Comportements : clignotants, dépassement, embouteillages, réaction au danger (fuite, coups de klaxon), bus TAN sur leur ligne.
- Densité selon l'heure du jour.

### Cycle 8 : ambiance et vie ★★
- Piétons selon les lieux et l'heure (marché de la butte, sorties d'école, quais le soir), terrasses qui se remplissent le soir.
- Lumières de ville la nuit (fenêtres, enseignes, phares qui éclairent vraiment la chaussée), reflets sur le mouillé.

### Cycle 9 : détail visuel ★★
- Niveaux de détail des arbres, mobilier, bâtiments lointains ; brouillard et atmosphère selon la météo ; meilleurs toits et rez-de-chaussée.

## Phase 3 : progression et contenu (cycles 10 à 14)

### Cycle 10 : sauvegarde v2 ★★
- Profil versionné (schéma `gangstamen.save.v2`) : respect, garage (voitures possédées, réglages et apparence par voiture), statistiques, records, missions, découvertes ; migration depuis `settings.v1`.
- 3 emplacements ; export et import par code à copier (les artifacts ne peuvent pas télécharger de fichier) ; sauvegarde automatique aux moments clés.

### Cycle 11 : courses et défis ★★★
- Courses chronométrées dans les vraies rues (Sainte-Anne → quai de la Fosse, tour de la Butte…), points de passage, fantôme du meilleur temps, médailles.
- Défis : dérapage, saut, livraison à l'heure, semer la police, destruction ; tableau des records local.
- Icônes sur la carte et la minicarte pour lancer une activité en roulant (monde ouvert).

### Cycle 12 : garage et personnalisation v2 ★★★
- Plusieurs voitures possédées ; réglages par voiture (moteur, boîte, suspensions, pneus, freins) branchés sur la physique v2.
- Apparence : couleur libre, jantes, vitres teintées, aileron, autocollants années 90 ; présentation en vitrine avec caméra tournante.

### Cycle 13 : catégories de véhicules ★★★
- Utilitaire, sportive des années 90, camionnette, voiture de police jouable ; deux-roues seulement si la physique le permet proprement.
- Chaque catégorie avec sa conduite, son son et ses limites (combat, courses).

### Cycle 14 : monde ouvert ★★
- Découvertes (lieux emblématiques à trouver, « cartes postales »), activités réparties sur la carte, progression qui débloque garages, voitures et défis.

## Phase 4 : élargir (après la phase 3)
- Streaming du monde par tuiles (chargement et déchargement) une fois le rendu par tuiles en place.
- Nouveaux quartiers : Bas-Chantenay industriel, île de Nantes par un pont.
- Synchronisation en ligne des bonus, de la circulation et du tram ; capture du drapeau en ligne.

## Retours de jeu de l'utilisateur (14 nov. 2026), à traiter
Captures dans `docs/retours/`.
- [ ] **Police contre Rapaces** : la police doit aussi s'en prendre aux Rapaces (cycle 7 ou avant).
- [ ] **Piétons qui traversent les murs en fuyant** : la fuite (voiture qui arrive) les décale sans tenir compte des bâtiments ; les garder sur le trottoir ou les arrêter aux murs (cycle 8, ou correctif rapide).
- [x] **Dégâts des gros sauts** : faits au cycle 4 (arcade : au-delà de 12 m/s à la réception ; réaliste : au-delà de 8 m/s, deux fois plus forts) ; à régler après essai.
- [ ] **Véhicules bloqués**, surtout près du pont de la place Jean-Macé : revoir les déplacements de la circulation et des bots (cycle 7, ou correctif rapide).
- [ ] **Bug d'affichage d'étage dans la carrière Misery** (bâtiment mal posé sur la pente ?).
- [ ] **Près de la mairie, de l'herbe apparaît selon l'angle de la caméra** : `2026-11-14-boulevard.png` et `2026-11-14-mairie-herbe.png` montrent le **même endroit** (boulevard de la Liberté devant la mairie) sous deux angles ; sur l'une la chaussée et le trottoir sont normaux, sur l'autre une pelouse les recouvre. Piste : conflit de profondeur entre la surface verte (parc ou pelouse OSM, ou sol HD selon la photo aérienne) et la route, qui dépend de la distance et de l'angle ; ou ordre de dessin des tuiles.
- [ ] **Eau de la Loire visible sur la terre ferme près d'un pont** (`2026-11-14-eau-pont.png` : nappes bleues sur le pavé, tablier du pont qui flotte) : le relief y descend sous le niveau de l'eau.
- [ ] **Bulle du bouclier à revoir** : pas très belle (cycle 9, détail visuel, ou avant).
- [ ] **Barrières, clôtures et portails cassables le long des propriétés** (jardins, cours) : décor qui se brise comme le mobilier (`gx/batch.js` et `breakFurniture` le permettent) ; positions à tirer d'OpenStreetMap (`barrier=fence|wall|gate`) et des limites de parcelles (cycle 8 ou 9).
- [ ] **Lumières au sol des lampadaires pendant l'intro de nuit** : taches lumineuses mal placées ou mal dessinées ; revoir les bugs d'affichage de lumière.

## Backlog hérité (hors cycles, à caser quand c'est pertinent)
- [ ] Faire jouer l'utilisateur et recueillir ses retours (fluidité, flammes, mines du Vautour, pont, intro avec son).
- [ ] Partie en ligne à plusieurs (claude.ai et serveur), puis corrections.
- [ ] Régler la difficulté de la campagne (mines, Vautour, roquettes du Grand Duc, chrono de l'orage).
- [ ] Mission du Vautour : la fuite « vers le quai de la Fosse » est à revoir, le quai est maintenant dans la carte ; missions possibles à l'escalier Sainte-Anne et au tram.
- [ ] Escalier Sainte-Anne : volées du bas à caler sur le terrain.
- [ ] Façades Panoramax pour la nouvelle zone.
- [ ] Mairie (fronton, dos et côtés), toits, jardins, enseignes nationales.
- [ ] Intro : sous-titres et rythme après un vrai visionnage ; version courte pour les relances.
- [ ] Nettoyer les fichiers `*.tmp` du dossier Téléchargements de l'utilisateur (à faire par lui).
