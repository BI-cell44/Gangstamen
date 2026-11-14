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

### Cycle 5 : son v2 ★★★ (fait le 14 nov. 2026 ; à écouter en vrai : rien n'a pu être entendu ici)
- [x] Bus audio : musique, effets, **ambiance** (nouveau curseur dans *Son et options*) ; musique et ambiance baissent sous les dialogues et la synthèse vocale (la voix elle-même passe par le navigateur, hors du mélangeur).
- [x] Moteur 4 cylindres synthétisé selon le régime et la charge (`src/audio/sound.js`, `makeEngine`) : harmoniques d'allumage, grondement du vilebrequin, ralenti irrégulier, saturation en charge, souffle d'admission ; coupure aux passages de rapport ; pétarades au lever de pied à haut régime ; turbo (sifflement et soupape) sur la berline. En arcade, une **boîte virtuelle** (`engineState`, `src/vehicles/physics.js`) donne rapports et régime ; en réaliste, la vraie boîte.
- [x] Crissements selon le glissement (dérive latérale, frein à main, freinage fort, patinage au démarrage), **roulement sur pavés** (rues et places `surface=sett|cobblestone|paving_stones` d'OSM, 88 tronçons), chocs selon la force (murs, voitures, réceptions de saut), effet Doppler et position stéréo des 4 voitures les plus proches.
- [x] Ambiance par lieu (`src/audio/soundscape.js`) : clapot de la Loire et goélands près de l'eau, cloches de Sainte-Anne qui sonnent l'heure (heure du jeu en cycle jour-nuit, heure réelle sinon), roulement et freins du tram, brouhaha près des piétons et des terrasses.
- [ ] Après écoute : équilibre des volumes, timbre du moteur, fréquence des goélands.

### Cycle 6 : caméras ★★ (fait le 14 nov. 2026 ; capture : `docs/captures/cycle6-cameras.png`)
- [x] `src/game/camera.js` : 6 vues (touche C, Y à la manette) : poursuite à ressort (le cap suit avec retard, distance et hauteur selon la vitesse), poursuite lointaine, capot, pare-chocs, vue du ciel, **cinéma** (caméra fixe au bord de la rue devant la voiture, nouveau plan quand elle s'éloigne ou est masquée). **Regarder derrière** en maintenant X (Clavier 1), Page préc. (2), H (3), 7 du pavé (4), stick droit vers le bas à la manette.
- [x] Murs : trois rayons (centre et coins arrière) ; la distance se raccourcit tout de suite et se rallonge doucement.
- [x] **Mode photo** (F2 ou bouton du menu pause ; pas en ligne) : jeu figé, caméra libre (ZQSD / flèches, A / E, souris, molette), interface masquée ; en HD, exposition et flou de profondeur (passe de profondeur dédiée, net sur ce qui est au centre) ; « Prendre la photo » affiche l'image à enregistrer par clic droit (un artifact ne peut pas télécharger de fichier).
- [ ] À essayer en vrai : confort de la poursuite à ressort, cadrage capot et pare-chocs selon les voitures.

## Phase 2 : un monde vivant (cycles 7 à 9)

### Cycle 7 : circulation v2 ★★★ (fait le 14 nov. 2026 ; captures : `docs/captures/cycle7-*.png`)
- [x] Données (`src/convert.py` → `W.traffic`, sens uniques `o` sur les rues) : 11 carrefours à **feux** réels (nœuds `traffic_signals` regroupés), 133 stops et cédez-le-passage, 292 passages piétons, 24 tronçons de **lignes de bus TAN** (relations `route=bus`), 39 arrêts.
- [x] `src/gx/traffic.js` : graphe orienté (`G.out`, sens uniques respectés), rues larges préférées aux chemins, voie de droite à la largeur de la rue ; feux (cycle de 39 s, deux axes, feux visibles en instances), arrêt au stop, cédez-le-passage (attente de 8 s au plus), arrêt pour un piéton sur le passage ou devant la voiture ; clignotants avant les virages ; dépassement d'une voiture immobile hors file d'attente, si personne n'arrive en face ; panique et klaxon aux coups de feu (les feux sont alors grillés) ; densité selon l'heure (30 % la nuit, 125 % aux heures de pointe).
- [x] Bus TAN (forme simple, blanc et vert) sur leurs vraies lignes, arrêt de 10 s aux arrêts, collision sur toute leur longueur.
- [x] Tram : les rues s'arrêtent avant les voies (données), les nœuds du graphe au nord du mur du tram sont exclus.
- [x] **Retours de jeu traités** : police contre Rapaces (patrouilles qui prennent en chasse un Rapace vu à moins de 75 m, et le Rapace riposte) ; véhicules bloqués (cibles hors carte ou derrière les barrières exclues, chemins étroits évités, voiture qui recule trois fois en 15 s remise sur une rue proche hors de vue) : marches arrière divisées par plus de deux en simulation.

### Cycle 8 : ambiance et vie ★★ (fait le 14 nov. 2026)
- [x] **Clôtures, haies, murets et portails cassables** (`src/make_fences.py` → `data/fences.json`, `src/gx/fences.js`) : 7 103 panneaux de 2,4 m, tirés des barrières OSM (clôture, mur, haie, grille, portail) et, là où OSM n'a rien, des façades sur rue des parcelles du cadastre (IGN). Bois, muret à grille, haie, portail, mur de jardin ; chacun a sa résistance (un mur tient à faible vitesse, une clôture cède) ; débris, remise en place une minute plus tard hors de vue ; 4 appels de dessin par tuile de 250 m.
- [x] **Lumières des lampadaires** (retour de jeu) : les flaques de lumière suivent le relief au lieu d'un carré plat qui flottait ou s'enfonçait, et s'arrêtent aux murs.
- [x] Moins de piétons la nuit, terrasses pleines à midi et le soir, vides au petit matin ; la nuit, les voitures éclairent la chaussée devant elles.
- [x] **Piétons qui traversent les murs** (retour de jeu) : l'écart pour éviter une voiture s'arrête aux murs (4 m au plus du trottoir), la chute aussi. La refonte complète des piétons est confiée à Fable 5.2 (section dédiée).
- [x] Correctif : depuis le réglage de la physique (cycle 4), un commentaire mal placé avait effacé une partie des réglages par défaut d'Ultra (équipes, fin de partie, moment de la journée, circulation, distance de vue) : le menu des joueurs plantait sur une nouvelle installation. Vérifié maintenant par un test.
- [ ] Reste pour plus tard : enseignes lumineuses, marché de la butte et sorties d'école (avec la refonte des piétons).

### Cycle 9 : détail visuel ★★ (fait le 14 nov. 2026, en partie)
- [x] **Eau sur la terre ferme et « étage » de la carrière Misery** (retours de jeu) : même cause. Les plans d'eau OSM (bassins, piscines, l'étang de la carrière) étaient posés à plat au point **le plus haut** de leur contour ; l'étang de Misery (17 m de pente) flottait comme un plancher bleu au-dessus des allées et sous les passerelles. Ils sont maintenant au point le plus bas. En plus, le sol hors de la Loire (multipolygone OSM) qui descend sous le niveau de l'eau est remonté juste au-dessus (`src/carve.py`).
- [x] **Bulle du bouclier** (retour de jeu) : champ d'énergie (bord lumineux, centre clair, nid d'abeilles qui ondule et monte, onde là où le tir touche, scintillement les deux dernières secondes). Leçon : le moteur utilise un tampon de profondeur logarithmique ; un shader maison doit inclure `<common>` et les morceaux `logdepthbuf`, sinon il est caché derrière tout (D-19).
- [x] Niveaux de détail : les tuiles d'objets répétés (arbres, poteaux, mobilier) sont masquées au-delà de la distance de vue (`Tiles.lod`).
- [ ] **Herbe près de la mairie selon l'angle** : pas reproduite ici (la mairie, son parc et le boulevard s'affichent bien sous plusieurs angles) ; il faut l'endroit exact (nom de rue affiché en bas à gauche, ou une capture avec la minicarte).
- [ ] Reste : brouillard et atmosphère selon la météo plus poussés, meilleurs toits et rez-de-chaussée (à confier plutôt à Fable 5.2 avec la refonte des façades).

## Phase 3 : progression et contenu (cycles 10 à 14)

### Cycle 10 : sauvegarde v2 ★★ (fait le 14 nov. 2026)
- [x] `src/game/profile.js` : schéma `gangstamen.save.v2` (3 emplacements, profil versionné : respect, missions, améliorations, voiture, garage, statistiques, records, découvertes) ; migration automatique depuis `settings.v1` au premier lancement. Le code du jeu garde ses champs (`settings.bank`, `camp`, `upg`, `cars[0]`) : charger un emplacement les remplit, `saveSettings()` les recopie dans l'emplacement (sauvegarde aux moments clés : missions, garage, et toutes les 20 s en solo pour les statistiques).
- [x] Écran *Sauvegardes* (menu principal) : jouer, renommer, effacer (double clic de confirmation, pas de boîte de dialogue, souvent bloquée dans un artifact), **exporter en code** à copier et **importer** (somme de contrôle, version vérifiée).
- [x] Statistiques : kilomètres, KO, morts, vitesse de pointe, temps de jeu.
- Note : si le navigateur refuse le stockage (certains contextes d'artifact), la partie vit en mémoire le temps de la session ; l'export en code reste possible.

### Cycle 11 : courses et défis ★★★ (fait le 14 nov. 2026)
- [x] `src/gx/activities.js` : 8 activités en partie solo hors mission, balises sur la carte et la minicarte (bleu : course, orange : défi), départ en s'arrêtant dans la balise (moins de 30 km/h).
- [x] 3 courses sur les vraies rues (Sainte-Anne → quai de la Fosse, tour de la butte, sprint du boulevard de la Liberté) : tracé calculé sur le graphe des rues, points de passage tous les 110 m, compte à rebours, **fantôme** du meilleur temps, médailles or, argent, bronze selon la vitesse moyenne (20, 16, 13 m/s), abandon à plus de 320 m du parcours.
- [x] 5 défis : dérapage (points avec multiplicateur), sauts de la carrière Misery (distance en vol), livraison express (vers un vrai commerce, chrono selon la distance), semer la police (2 étoiles), destruction (mobilier et clôtures en 60 s).
- [x] Records dans la sauvegarde (`Profile.record`), affichés sur l'écran *Campagne* ; respect gagné selon la médaille ou le score.
- [ ] À régler après essai : seuils des médailles, durée des défis, tracés.

### Cycle 12 : garage et personnalisation v2 ★★★ (fait le 14 nov. 2026)
- [x] **Garages ouverts où l'on entre** (demande de l'utilisateur) : chaque garage a un atelier (7,4 × 11 m) posé sur un emplacement libre au bord de la rue près du vrai garage (sans bâtiment, rue, mur ni arbre, sol assez plat), rideau levé côté rue, pont élévateur, établi, éclairage ; murs avec collision et porte libre. Le menu s'ouvre **à l'intérieur**, plus sur le parvis ; il se rouvre en ressortant puis en rentrant.
- [x] Plusieurs voitures : acheter les autres modèles (400 à 800 de respect), les garder au garage, en changer ; chaque voiture garde ses réglages et son apparence (sauvegarde : `settings.owned` ↔ `profil.garage`).
- [x] Réglages par voiture, branchés sur les deux conduites : boîte courte (reprises contre vitesse de pointe ; en réaliste, rapports plus courts), pneus sport (adhérence), freins renforcés (3 niveaux chacun).
- [x] Apparence : couleur au choix (sélecteur de couleur), jantes (5 teintes), vitres teintées, aileron.
- [ ] Plus tard : autocollants années 90, vitrine tournante dans l'atelier, réglage de suspension.

### Cycle 13 : catégories de véhicules ★★★ (fait le 14 nov. 2026 ; capture : `docs/captures/cycle13-vehicules.png`)
- [x] Trois nouvelles catégories, en version classique et HD (silhouettes et carrosseries lissées) : **coupé sport** années 90 (dessin original, propulsion, turbo, 0 à 100 en 1,8 s en réaliste, fragile : dégâts ×1,25, léger), **utilitaire** (grand fourgon, lourd et lent, encaisse : dégâts ×0,65, pousse les autres ×1,7, son de diesel plus grave), **voiture de police** jouable (berline à gyrophares ; la police te recherche deux fois moins vite).
- [x] Achetables au garage (1 500, 900, 1 200 de respect) et au menu *Ta voiture* ; l'utilitaire roule aussi dans la circulation ; collisions pondérées par la masse.
- [ ] Deux-roues : non, la physique actuelle ne le permet pas proprement (à voir avec Fable 5.2).

### Cycle 14 : monde ouvert ★★
- Découvertes (lieux emblématiques à trouver, « cartes postales »), activités réparties sur la carte, progression qui débloque garages, voitures et défis.

## Phase 4 : élargir (après la phase 3)
- **Idée de l'utilisateur (14 nov.) : navettes fluviales vers l'île de Nantes.** Des bateaux font la navette sur la Loire (comme le Navibus) ; on peut sauter dessus avec la voiture depuis un ponton, pour un niveau en plus au bout de l'île de Nantes, avec l'éléphant mécanique et le carrousel des mondes marins. Attention : le Grand Éléphant et le Carrousel des Mondes Marins (Machines de l'île) sont des œuvres protégées. Les modéliser fidèlement serait une reproduction ; on ferait des machines originales dans le même esprit (grand animal mécanique, manège à créatures marines), à valider avec l'utilisateur. C'est un agrandissement du monde : accord de l'utilisateur avant de commencer.
- Streaming du monde par tuiles (chargement et déchargement) une fois le rendu par tuiles en place.
- Nouveaux quartiers : Bas-Chantenay industriel, île de Nantes par un pont.
- **Navettes fluviales et niveau « bout de l'île de Nantes »** (idée de l'utilisateur, 14 nov.) : des bateaux font la navette sur la Loire entre un ponton côté Chantenay (quai) et l'île de Nantes ; on monte à bord depuis le ponton (voiture ou à pied ?) pour rejoindre un niveau en plus à la pointe ouest de l'île : quais, hangars et nefs des Chantiers, carrousel et parc. **Attention aux droits** : le Grand Éléphant et le Carrousel des Mondes Marins sont des œuvres de La Machine, protégées ; le jeu peut montrer les lieux (nefs, hangars, emplacement du carrousel) mais ni copier ces machines, ni en faire une variante reconnaissable. Il faudra des créations originales. Agrandissement du monde : accord de l'utilisateur donné sur le principe, à préciser (taille, accès en voiture ou non) avant de commencer.
- Synchronisation en ligne des bonus, de la circulation et du tram ; capture du drapeau en ligne.

## À confier à Claude Fable 5.2 (demande de l'utilisateur, 14 nov. 2026)
Chantiers où un modèle plus fort apporterait le plus : gros morceaux de code à repenser d'un bloc, ou réglages fins difficiles à juger sans voir, entendre ni jouer.
- **Refonte des piétons** (`src/gx/pedestrians.js`, `crowd.js`, `terraces.js`) : navigation sur les trottoirs qui respecte vraiment les murs (aujourd'hui la fuite les fait traverser les bâtiments), traversées aux passages piétons, groupes, animations plus riches, réactions (fuite, panique, regard), foule qui change selon le lieu et l'heure. C'est le plus gros chantier de la liste.
- **IA de conduite** (bots Rapaces, police, circulation) : planification de trajets, poursuites et interceptions, évitement entre voitures, manœuvres de déblocage propres au lieu d'une marche arrière à l'aveugle.
- **Physique réaliste** : ressenti au clavier et à la manette, glisse, aide au pilotage, dégâts de la carrosserie.
- **Bugs de rendu difficiles** : herbe qui recouvre la route selon l'angle (mairie), eau de la Loire sur la terre près du pont, taches de lumière des lampadaires dans l'intro.
- **Multijoueur en ligne** : synchronisation de la circulation, du tram et des bonus, latence, reprise après déconnexion.
- **Architecture** : chaque système déclare ce qu'il utilise des autres (suite de D-12), pour pouvoir confier un module à part.

## À confier à Fable 5.2 (demande de l'utilisateur, 14 nov. 2026)
Chantiers lourds, où un modèle plus puissant fera nettement mieux : refontes de systèmes entiers, beaucoup de code lié, réglages fins difficiles à vérifier ici sans écran. À lancer dans une session Fable 5.2 avec ce dépôt ; ils restent hors de l'enchaînement des cycles 5 à 14.
- [ ] **Refonte des piétons** (`src/gx/pedestrians.js`, `crowd.js`, `terraces.js`) : vrai réseau de trottoirs et de passages piétons tiré d'OSM, évitement des murs et des autres piétons, traversées aux passages, animations (marche, course, fuite, chute) plus riches, foules selon le lieu et l'heure ; corrige à la racine « piétons qui traversent les murs ».
- [ ] **Conduite des IA par voies** : planification de trajectoire sur des voies (et non des nœuds), changements de voie, ronds-points, files aux feux propres ; bots Rapaces qui conduisent aussi bien que la circulation.
- [ ] **Partie en ligne robuste** : prédiction et correction, synchronisation de la circulation, du tram et des bonus, reprise après déconnexion (aujourd'hui jamais testée à plusieurs).
- [ ] **Physique réaliste, 2e passe** après les essais de l'utilisateur (suspension, transfert de charge en virage, sensation à la manette).
- [ ] **Niveau de l'île de Nantes** (voir Phase 4) : modélisation d'un nouveau quartier entier, navettes fluviales et pontons.

## Retours de jeu de l'utilisateur (14 nov. 2026), à traiter
Décision de l'utilisateur (14 nov.) : chaque point est traité dans le cycle où il est prévu ; les corrections partent aussi dans `main` (classique et HD).
Captures dans `docs/retours/`.
- [x] **Police contre Rapaces** : fait au cycle 7 (patrouilles, riposte des Rapaces).
- [ ] **Piétons qui traversent les murs en fuyant** : la fuite (voiture qui arrive) les décale sans tenir compte des bâtiments ; les garder sur le trottoir ou les arrêter aux murs (cycle 8, ou correctif rapide).
- [x] **Dégâts des gros sauts** : faits au cycle 4 (arcade : au-delà de 12 m/s à la réception ; réaliste : au-delà de 8 m/s, deux fois plus forts) ; à régler après essai.
- [x] **Véhicules bloqués**, surtout près du pont de la place Jean-Macé : fait au cycle 7. Cause trouvée en simulation : voitures envoyées vers des nœuds hors carte (barrières) et dans les chemins étroits (chemin des Vignes du Bourg, place Jean-Macé, 4 m de large). À revérifier en jeu.
- [x] **Bug d'affichage d'étage dans la carrière Misery** : l'étang flottait au point haut de son contour (cycle 9).
- [ ] **Près de la mairie, de l'herbe apparaît selon l'angle de la caméra** : `2026-11-14-boulevard.png` et `2026-11-14-mairie-herbe.png` montrent le **même endroit** (boulevard de la Liberté devant la mairie) sous deux angles ; sur l'une la chaussée et le trottoir sont normaux, sur l'autre une pelouse les recouvre. Piste : conflit de profondeur entre la surface verte (parc ou pelouse OSM, ou sol HD selon la photo aérienne) et la route, qui dépend de la distance et de l'angle ; ou ordre de dessin des tuiles.
- [x] (cycle 9 : plans d'eau posés au point bas, sol hors Loire remonté) **Eau de la Loire visible sur la terre ferme près d'un pont** (`2026-11-14-eau-pont.png` : nappes bleues sur le pavé, tablier du pont qui flotte) : le relief y descend sous le niveau de l'eau.
- [x] **Bulle du bouclier à revoir** : refaite au cycle 9 (champ d'énergie).
- [ ] **Barrières, clôtures et portails cassables le long des propriétés** (jardins, cours) : décor qui se brise comme le mobilier (`gx/batch.js` et `breakFurniture` le permettent) ; positions à tirer d'OpenStreetMap (`barrier=fence|wall|gate`) et des limites de parcelles (cycle 8 ou 9).
- [ ] **Loire : reprendre la texture de l'eau et ajouter des bateaux** (retour du 14 nov.) : eau plus belle (vagues, reflets, courant, écume le long des quais) ; quelques bateaux à moteur et voiliers qui se baladent sur le fleuve (trajets sur l'eau, sillage). À rapprocher des navettes fluviales vers l'île de Nantes (Phase 4).
- [x] (cycle 12) **Garages ouverts, on entre dedans** (retour du 14 nov.) : chaque garage a une porte ouverte (rideau levé) et un intérieur ; le menu s'ouvre quand la voiture est **à l'intérieur du bâtiment**, plus dans la zone devant. Murs de collision du bâtiment avec une ouverture à la porte (cycle 12, garage et personnalisation, ou avant).
- [x] **Radio : stations rap, techno (et peut-être funk) presque inaudibles** (retour du 14 nov.) : mesuré hors ligne (`sfx.stationLevels`) : même volume global que la G-funk, mais presque tout sous 220 Hz (basses en sinus, que des haut-parleurs d'ordinateur ou de téléphone ne rendent pas ; acid techno muette les 2 premières mesures). Basses avec harmoniques, accords, caisse claire, gimmick sifflé (rap), clic de grosse caisse, accords, acid dès la 1re mesure (techno), slap à l'octave, clavinet, guitare étouffée, cuivres (funk) : niveau au-dessus de 220 Hz à 85-100 % de la G-funk (vérification automatique). À réécouter.
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
