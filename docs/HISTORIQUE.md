# Historique

Ce qui a été construit, dans l'ordre. Le détail de chaque changement est dans `git log`.

## Journal

| Date | Changement | Branche / commit |
|---|---|---|
| nov. 2026 | Premiers jets : rues OSM, hauteurs IGN, façades Panoramax, voitures, combat, écran partagé, jeu en ligne | voir `git log` |
| nov. 2026 | Mairie : pierre blanche, ailes bleues, encadrements crème, carreaux au rez-de-chaussée | 01c40ac, 7e346bd |
| nov. 2026 | Minicarte : triangles de bord selon la distance | beb66dc |
| 13 nov. 2026 | Cinématique d'intro | c2db855 |
| 13 nov. 2026 | HD : météo, cycle jour-nuit, circulation, police, campagne, garage, bonus, radio | c02258f |
| 13 nov. 2026 | HD : modes écran partagé, choix de voiture, lieux emblématiques, options | 15ed72f |
| 13 nov. 2026 | HD : colline et course en ligne, armes en ligne, mémoire | 224e8f2, f2ca8eb |
| 13 nov. 2026 | Mines du Vautour, bout de pont, collision entre bâtiments, piétons animés et terrasses, clé à molette | voir `git log` |
| 13 nov. 2026 | Fusion dans `main` et `server` ; dossier de passation ; branches figées `passation-2026-11-13` et `passation-2026-11-13-server`, artifacts de référence | voir `git log` |
| 14 nov. 2026 | Carte agrandie (Sainte-Anne, quai de la Fosse), tram ligne 1, barrières, église et escalier Sainte-Anne, garages réels ; radio Pin-pon selon la vraie voiture, terrasses, mort en mission, message de KO, changement d'arme | `main` f20574b |
| 14 nov. 2026 | Branche `ultra` : audit, feuille de route, réorganisation de la documentation (`CLAUDE.md`, `docs/`), artifact Gangstamen Ultra | `ultra` |
| 15 nov. 2026 | Ultra (Fable 5.2) : bords de carte logiques (ville prolongée de 250 m par `make_belt.py`, murs de pierre visibles, rues fermées par un chantier) | `ultra` |
| 14 nov. 2026 | Ultra (Fable 5.2) : piétons remodelés (formes arrondies, corpulences, coiffures, vestes, sacs, enfants, personnes âgées) | `ultra` |
| 14 nov. 2026 | Ultra (Fable 5.2) : tram et bus remodelés en carrosseries arrondies (`world/loft.js`) | `ultra` |
| 14 nov. 2026 | Ultra (Fable 5.2) : physique réaliste, fin de la glisse de côté (signe de l'angle de dérive en marche arrière, répartition de freinage) | `ultra` |
| 14 nov. 2026 | Ultra : courses et défis lisibles (collision de nom `hud` corrigée, briefing de 7 s, consigne permanente, flèche et minicarte, résultat affiché 7 s), messages éclair plus longs | `ultra` |
| 14 nov. 2026 | Ultra : sources découpées par système (D-12), sorties identiques à l'octet | `ultra` |
| 14 nov. 2026 | Ultra : phares des voitures posés au sol, commissariat réel comme base de la police, clôtures cassées par les tirs et les explosions ; `main` : corrections d'Ultra reportées (eau, piétons, bouclier, radio, bots hors carte), artifacts classique et HD republiés | `ultra`, `main`, `server` |
| 14 nov. 2026 | Ultra, cycle 14 (monde ouvert) : 10 cartes postales à découvrir, déblocages (coupé sport, voiture de police, défi police) ; fin de la feuille de route des phases 0 à 3 | `ultra` |
| 14 nov. 2026 | Ultra, cycle 13 (véhicules) : coupé sport, utilitaire et voiture de police jouables, chacun avec sa conduite, son son, sa résistance et sa masse | `ultra` |
| 14 nov. 2026 | Ultra, cycle 12 (garage) : ateliers ouverts où l'on entre pour ouvrir le menu, voitures à acheter et à garder, réglages par voiture (boîte, pneus, freins), couleur libre, jantes, vitres teintées, aileron | `ultra` |
| 14 nov. 2026 | Ultra, cycle 11 (courses et défis) : 3 courses avec points de passage, fantôme et médailles, 5 défis (dérapage, sauts, livraison, semer la police, destruction), records dans la sauvegarde | `ultra` |
| 14 nov. 2026 | Ultra, cycle 10 (sauvegarde v2) : 3 emplacements versionnés, migration depuis settings.v1, statistiques, export et import par code | `ultra` |
| 14 nov. 2026 | Ultra, cycle 9 (détail visuel) : plans d'eau posés au point bas (fin de l'eau sur les pavés et du « plancher » de la carrière Misery), sol hors Loire remonté au-dessus de l'eau, bulle du bouclier en champ d'énergie (profondeur logarithmique, D-19), tuiles d'arbres et de mobilier masquées au loin | `ultra` |
| 14 nov. 2026 | Ultra, cycle 8 (ambiance et vie) : 7 103 clôtures, haies, murets et portails cassables (OSM et cadastre IGN), flaques de lumière des lampadaires qui suivent le relief et s'arrêtent aux murs, piétons et terrasses selon l'heure, phares la nuit, piétons qui ne traversent plus les murs en esquivant ; correctif des réglages par défaut d'Ultra effacés depuis le cycle 4 | `ultra` |
| 14 nov. 2026 | Ultra, cycle 7 (circulation v2) : feux tricolores des vrais carrefours, stops, cédez-le-passage, passages piétons, sens uniques, clignotants, dépassement, panique aux tirs, densité selon l'heure, bus TAN sur leurs lignes ; police contre Rapaces ; véhicules bloqués (cibles hors carte et chemins étroits) ; backlog : section « À confier à Claude Fable 5.2 », idée des navettes vers l'île de Nantes | `ultra` |
| 14 nov. 2026 | Ultra, cycle 6 (caméras) : 6 vues dont capot, pare-chocs et cinéma, poursuite à ressort, regard arrière, évitement des murs à trois rayons, mode photo (exposition, flou de profondeur en HD) ; radio : stations rap, techno et funk rendues audibles sur petits haut-parleurs (mesure hors ligne) | `ultra` |
| 14 nov. 2026 | Ultra, cycle 5 (son v2) : moteur 4 cylindres synthétisé (régime, charge, rapports, pétarades, turbo), pneus, pavés (OSM), chocs selon la force, Doppler des 4 voitures proches, ambiance par lieu (Loire, goélands, cloches de Sainte-Anne à l'heure, tram, foule), curseur *Ambiance*, musique atténuée sous les dialogues ; cadastre IGN téléchargé pour les clôtures | `ultra` |
| 14 nov. 2026 | Ultra : physique réaliste réglée au rythme de l'arcade après le retour « injouable » de l'utilisateur (adhérence et couple de jeu, antipatinage en virage, aide à la stabilité) ; arcade de nouveau par défaut | `ultra` |
| 14 nov. 2026 | Ultra, cycle 4 (physique) : modèle bicyclette avec pneus, report de poids, moteur et boîte automatique, adhérence selon le sol et la pluie, données par voiture, réglage Arcade / Réaliste, rapport au compteur, son selon le régime, dégâts de réception | `ultra` |
| 14 nov. 2026 | Ultra, cycle 3 (chargement) : textures de façades 30 fois plus rapides (même image), démarrage par étapes avec pourcentage, shaders et textures préparés pendant le chargement ; HD prête en 19 s au lieu de 92 s (rendu logiciel) ; retours de jeu notés dans le backlog | `ultra` |
| 14 nov. 2026 | Ultra : les piétons et les clients des terrasses fuient aux coups de feu et aux explosions (course sur le trottoir, mains sur la tête) ; une voiture en l'air passe au-dessus des troncs et des lampadaires ; plus de recollage au sol quand elle vole à plus de 8 m au-dessus du terrain | `ultra` |
| 14 nov. 2026 | Ultra : retour à l'ancienne règle de qualité automatique (demande de l'utilisateur), la case pour la couper reste | `ultra` |
| 14 nov. 2026 | Ultra, cycle 2 : mobilier et terrasses instanciés (`gx/batch.js`), pièces fixes des voitures fusionnées, ville par tuiles (`world/tiles.js`), culling réactivé sur les maillages instanciés | `ultra` |
| 14 nov. 2026 | Ultra, cycle 1 : lanceur de tests (`tools/run-tests.js`, 12 vérifications), mesures dans `docs/perf.json`, superposition F3, qualité automatique corrigée (médiane, délai de grâce de 15 s, deux fenêtres lentes, case pour la couper) | `ultra` |
| 15 nov. 2026 | Fable 5.2 : Loire. Eau refaite (plus de motif répété), quatre voiliers sur le chenal et un bac à voitures qui traverse vers l'île (`src/gx/boats.js`). Premiers modèles CGTrader, allégés par `tools/assets/bake_model.js` vers `data/models/` | ultra |
| 15 nov. 2026 | Fable 5.2 : piétons animés à squelette (`src/gx/people.js`, pack City People) ; Maillé-Brézé amarré quai de la Fosse ; le bac traverse du quai de Chantenay à la pointe de l'île de Nantes | ultra |
| 15 nov. 2026 | Fable 5.2 : réseau de trottoirs et de passages piétons (les piétons choisissent leur chemin, attendent et traversent) ; backlog réparti entre Fable 5.2 et Opus 5.5 | ultra |
| 15 nov. 2026 | Fable 5.2 : navette embarquable Gare Maritime → pointe de l'île de Nantes ; bâtiment-pont du quai Ernest-Renaud ; herbe sur les trottoirs selon l'angle (shader du sol) | ultra |
| 15 nov. 2026 | Fable 5.2 : carte étendue vers l'est jusqu'à x 2 280 (île de Nantes, pont Anne-de-Bretagne, Nefs), numéros de bâtiments conservés | ultra |
| 15 nov. 2026 | Fable 5.2 : bac sans téléportation (rampes, feu vert / rouge, voiture libre à bord, plus de traversée sans fin) ; grue Titan grise à la pointe de l'île | ultra |

## Ce qui a été fait, par domaine

### Le monde
- Rues OpenStreetMap avec leurs vrais noms (panneaux bleus nantais), routes et trottoirs suivant le relief IGN (RGE ALTI), hauteurs réelles des bâtiments (BD TOPO), ponts, Loire.
- Façades photographiées (Panoramax) en classique ; façades redessinées en HD avec la couleur et le rythme relevés sur les photos ; 59 vrais commerces avec enseigne.
- Photo aérienne IGN pour les jardins, pavés et toits (HD).
- Lieux : mairie de Chantenay, église Saint-Martin, place Jean-Macé, quais et grue Titan, église, escalier et statue Sainte-Anne.
- Carte agrandie le 14 novembre 2026 ; tram ligne 1 au nord, barrières de chantier ailleurs.

### Les voitures et la conduite
- 5 modèles construits en profils extrudés (classique) ou carrosseries lissées (HD), 10 peintures, phares et feux.
- Conduite arcade : dérapage, frein à main, sauts, collision en trois cercles ; dégâts visibles en HD (tôle froissée, capot, pneu crevé), fumée et flammes.

### Les modes de jeu
- KO, chrono, équipes, colline, course, capture du drapeau ; écran partagé 2 à 4 ; en ligne jusqu'à 12 sans latence (claude.ai ou serveur Node).
- Campagne HD de 7 missions avec dialogues et voix ; garages ; banque de respect ; reprise de zéro à la mort.

### La version HD
- Rendu HDR (bloom, tone mapping ACES, anti-crénelage), ciel procédural et reflets, ombres douces, 4 niveaux de qualité.
- Météo (pluie, orage, brouillard, sol mouillé) et cycle jour-nuit ; particules ; lampadaires au sodium.
- Vie de quartier : circulation civile, police et niveau de recherche, foule animée instanciée, terrasses, tram ; bonus et armes spéciales ; radio à 4 stations ; discussion rapide.

### Interface
- Menus clavier, souris, manette ; minicarte ; HUD d'équipe ; volumes séparés ; vibrations ; joystick tactile ; cinématique d'intro.

### Pistes écartées
- Street View comme décor : conditions de Google incompatibles. Panoramax le remplace.
| 15 nov. 2026 | Opus 5.5 : police à une étoile plus semée en une seconde, Rapaces loin au départ et en chasse un par un, feux tricolores cassables (`gx/lightpoles.js`), flèches en chevron et flèche de mission sur la minicarte, courses et livraison plus longues, escalier Sainte-Anne repris (paliers, terrasse), passages piétons peints | `ultra` (fusion de `opus-retours-15nov`) |
| 15 nov. 2026 | Ménage : un seul fichier de tâches (`docs/BACKLOG.md`), `LEDGER.md` et `HANDOFF.md` retirés d'`ultra`, anciennes branches toutes fusionnées, à supprimer sur GitHub (seules restent `main`, `ultra`, `server`) | `ultra`, `main` |
| 15 nov. 2026 | Fable 5.2 : grues refaites avec le modèle acheté (haut des deux Titan, cinq grues de quai), pontons en bois près des rampes du bac | ultra |
| 15 nov. 2026 | Fable 5.2 : fin de dérapage progressive ; on tombe et on coule dans la Loire ; rampe du bac solide en permanence ; plus de voiture couchée au bord du pont | ultra |
| 16 nov. 2026 | Fable 5.2 : barrières du bac articulées ; pont Anne-de-Bretagne en un seul ouvrage ; plus de trottoirs à l'intérieur des bâtiments | ultra |
| 16 nov. 2026 | Fable 5.2 : Nefs de l'île de Nantes en halle ouverte (toit sur colonnes, on roule dessous) | ultra |
| 16 nov. 2026 | Fable 5.2 : passagers à pied sur le bac (embarquent, traversent, débarquent) | ultra |

## Annexe : feuille de route Ultra, détail des cycles et des retours (14 et 15 nov. 2026)

Ancien contenu de `docs/BACKLOG.md`, gardé tel quel pour mémoire. Les cases **[→]** n'étaient pas faites : elles sont reprises dans `docs/BACKLOG.md`, qui seul fait foi pour le reste à faire.

### Principes
- **Profondeur avant étendue** : la carte actuelle (2 km sur 1,5 km) suffit pour plusieurs phases. On ne l'agrandit qu'une fois le rendu par tuiles et le chargement maîtrisés (phase 4).
- **Chaque cycle livre une version meilleure que la précédente**, testée, mesurée, documentée, poussée. Pas de fonctionnalité pour la liste.
- **Le joueur d'abord** : fluidité et ressenti de conduite passent avant le contenu, car tout le reste en dépend.
- Pas de remplacement de technologie sans gain démontré (voir `DECISIONS_TECHNIQUES.md`).
- Note de valeur : ★★★ très visible pour le joueur, ★★ visible, ★ fondation (invisible mais nécessaire).

### Phase 0 : fondations (cycles 1 à 3)

#### Cycle 1 : banc de mesure, tests automatisés, qualité automatique ★ / ★★ (fait le 14 nov. 2026, sauf les temps de chargement par étape, reportés au cycle 3)
- [x] Lanceur de tests unique `node tools/run-tests.js <fichier>` : chargement, partie solo, missions, garages, tram, bords, combat, sauvegarde ; rapport lisible et code de sortie.
- [x] Mesures de performance enregistrées à chaque cycle (appels de dessin, triangles, maillages, mémoire, temps de simulation, temps de chargement par étape) dans `docs/perf.json`, pour comparer les versions.
- [x] Superposition de performance en jeu (touche F3) : images par seconde, ms par image, appels de dessin, triangles.
- [x] **Qualité automatique** : case pour la désactiver. *La variante médiane + délai de grâce de 15 s a été retirée le 14 novembre à la demande de l'utilisateur : l'ancienne règle (moyenne sur 5 s, baisse sous 25 images par seconde) marchait mieux chez lui.*
- Critère d'acceptation : tous les tests passent sur les trois sorties ; le message de baisse de qualité ne s'affiche plus pendant le chargement.

#### Cycle 2 : fluidité ★★★ (fait le 14 nov. 2026 : appels de dessin −64 %, triangles −62 % en HD)
- [x] **Instanciation** du mobilier répété (tables, chaises, parasols des terrasses, bornes, lampadaires) : environ 1 400 maillages ramenés à une vingtaine.
- [x] **Voitures** : fusion des pièces fixes par matériau (75 maillages ramenés à 24 par voiture : la coque déformable et chaque roue restent à part).
- [→] Niveau de détail simplifié des voitures au-delà de 120 m (reporté : le gain restant est faible, 12 maillages visibles en moyenne).
- [x] **Ville par tuiles** de 300 m (`world/tiles.js`) : les maillages de plus de 20 000 triangles (relief, routes, murs, toits) et les arbres sont découpés par tuile ; hors champ, ils ne sont plus dessinés, ombres comprises. Le mobilier instancié est groupé par tuile de 250 m.
- [→] Distance d'affichage du petit mobilier, de la foule et des terrasses selon la qualité (à faire si la vraie machine le demande).
- Objectif mesuré : moins de 450 appels de dessin et 40 % de triangles en moins par image, même rendu à l'œil (captures avant / après). **Résultat** : 485 appels (passes de post-traitement comprises) au lieu de 1 340, 859 k triangles au lieu de 2,26 M ; captures identiques. Classique : 282 appels (221 avant, les tuiles en ajoutent un peu), 399 k triangles au lieu de 1,25 M.

#### Cycle 3 : chargement ★★ (fait le 14 nov. 2026 : HD prête en 19 s au lieu de 92 s en rendu logiciel)
- [x] Mesurer chaque étape du démarrage (`BOOT.mark`, `__gm.BOOT`) : 50 s sur 67 venaient des textures de façades HD (chaque tache de crépi peinte sur toute la toile, 2 300 fois par texture), 13 s de la première image.
- [x] Façades : chaque tache n'est plus peinte que sur son carré (même image au pixel près, vérifié) : 50 s → 1,5 s.
- [x] Barre de chargement honnête : étapes de démarrage qui rendent la main au navigateur, pourcentage et étape sur le bouton de départ ; menu désactivé tant que le monde n'est pas prêt.
- [x] Shaders, envoi des textures et première image faits pendant le chargement (lecture d'un pixel pour attendre la fin réelle du travail WebGL, asynchrone) : plus de longue attente après le clic.
- [→] Reste : environ 5 s de première image du menu en rendu logiciel (autres variantes de shaders) ; réduire le nombre de programmes (64) si la vraie machine le montre.
- Objectif : divisé par deux en rendu logiciel. **Résultat** : bouton prêt en 19 s au lieu de 92 s (HD, rendu logiciel) ; classique 5 s au lieu de 6.

**Découpage des sources en modules** (D-12) : fait le 14 novembre 2026, avant le cycle 2. Étape suivante, au fil des cycles : chaque système déclare en tête de fichier ce qu'il utilise des autres.

### Phase 1 : le ressenti de conduite (cycles 4 à 6)

#### Cycle 4 : physique automobile v2 ★★★ (fait le 14 nov. 2026 ; premier réglage jugé injouable par l'utilisateur, refait le jour même au rythme de l'arcade ; arcade par défaut)
- [x] Modèle « bicyclette » avec pneus (force latérale selon l'angle de glissement, adhérence qui sature), transfert de masse à l'accélération et au freinage, sous-virage, frein à main qui bloque l'arrière (`vehicles/physics.js`).
- [x] Moteur et boîte automatique : courbe de couple, régime, 5 rapports, rapport affiché au compteur, son du moteur qui suit le régime.
- [x] Paramètres par véhicule dans un tableau de données (`VEHICLES` : masse, empattement, centre de gravité, couple, traction ou propulsion, adhérence, traînée, rapports) : base des catégories de véhicules.
- [x] Surfaces : chaussée, trottoir, reste (herbe, gravier), mouillé (−25 %).
- Sauts et collisions en hauteur (retour de l'utilisateur, 14 nov.) : une première correction est faite (les obstacles bas ont une hauteur : troncs 2,2 m environ, lampadaires 6,5 m ; une voiture plus haute passe au-dessus). À reprendre ici : vraie gravité, tangage et roulis en l'air, réception sur les suspensions, collisions par hauteur pour tout le mobilier.
- [x] Réglage « Conduite : Arcade / Réaliste » (Son et options) ; arcade par défaut partout ; seules les voitures des joueurs locaux l'utilisent (bots, circulation et version classique restent en arcade) ; réseau inchangé.
- [x] Sauts : gravité 1,35 g en réaliste (22 m/s² en arcade), dégâts à la réception plus tôt et plus forts (une chute de 10 m coûte environ la moitié de la carrosserie).
- [x] **Retour de l'utilisateur (14 nov.) : « injouable, trop long à démarrer, impossible de tourner »**. Réglage refait sur des cibles mesurées en arcade : 0 à 50 km/h en 1,4 s (arcade 1,0 s), 0 à 100 en 2,9 s (arcade 3,1 s), rayon de virage proche de l'arcade (13 m à 36 km/h). Moyens : adhérence de jeu ×2,3, couple ×2,2 et plat, direction moins réduite avec la vitesse, antipatinage quand on braque (les roues motrices gardent de quoi tourner), aide à la stabilité type ESP (coupée au frein à main), passages de rapport plus courts.
- [→] À régler après un nouvel essai de l'utilisateur : ressenti au clavier et à la manette, glisse de la berline, tangage et roulis en l'air.

#### Cycle 5 : son v2 ★★★ (fait le 14 nov. 2026 ; à écouter en vrai : rien n'a pu être entendu ici)
- [x] Bus audio : musique, effets, **ambiance** (nouveau curseur dans *Son et options*) ; musique et ambiance baissent sous les dialogues et la synthèse vocale (la voix elle-même passe par le navigateur, hors du mélangeur).
- [x] Moteur 4 cylindres synthétisé selon le régime et la charge (`src/audio/sound.js`, `makeEngine`) : harmoniques d'allumage, grondement du vilebrequin, ralenti irrégulier, saturation en charge, souffle d'admission ; coupure aux passages de rapport ; pétarades au lever de pied à haut régime ; turbo (sifflement et soupape) sur la berline. En arcade, une **boîte virtuelle** (`engineState`, `src/vehicles/physics.js`) donne rapports et régime ; en réaliste, la vraie boîte.
- [x] Crissements selon le glissement (dérive latérale, frein à main, freinage fort, patinage au démarrage), **roulement sur pavés** (rues et places `surface=sett|cobblestone|paving_stones` d'OSM, 88 tronçons), chocs selon la force (murs, voitures, réceptions de saut), effet Doppler et position stéréo des 4 voitures les plus proches.
- [x] Ambiance par lieu (`src/audio/soundscape.js`) : clapot de la Loire et goélands près de l'eau, cloches de Sainte-Anne qui sonnent l'heure (heure du jeu en cycle jour-nuit, heure réelle sinon), roulement et freins du tram, brouhaha près des piétons et des terrasses.
- [→] Après écoute : équilibre des volumes, timbre du moteur, fréquence des goélands.

#### Cycle 6 : caméras ★★ (fait le 14 nov. 2026 ; capture : `docs/captures/cycle6-cameras.png`)
- [x] `src/game/camera.js` : 6 vues (touche C, Y à la manette) : poursuite à ressort (le cap suit avec retard, distance et hauteur selon la vitesse), poursuite lointaine, capot, pare-chocs, vue du ciel, **cinéma** (caméra fixe au bord de la rue devant la voiture, nouveau plan quand elle s'éloigne ou est masquée). **Regarder derrière** en maintenant X (Clavier 1), Page préc. (2), H (3), 7 du pavé (4), stick droit vers le bas à la manette.
- [x] Murs : trois rayons (centre et coins arrière) ; la distance se raccourcit tout de suite et se rallonge doucement.
- [x] **Mode photo** (F2 ou bouton du menu pause ; pas en ligne) : jeu figé, caméra libre (ZQSD / flèches, A / E, souris, molette), interface masquée ; en HD, exposition et flou de profondeur (passe de profondeur dédiée, net sur ce qui est au centre) ; « Prendre la photo » affiche l'image à enregistrer par clic droit (un artifact ne peut pas télécharger de fichier).
- [→] À essayer en vrai : confort de la poursuite à ressort, cadrage capot et pare-chocs selon les voitures.

### Phase 2 : un monde vivant (cycles 7 à 9)

#### Cycle 7 : circulation v2 ★★★ (fait le 14 nov. 2026 ; captures : `docs/captures/cycle7-*.png`)
- [x] Données (`src/convert.py` → `W.traffic`, sens uniques `o` sur les rues) : 11 carrefours à **feux** réels (nœuds `traffic_signals` regroupés), 133 stops et cédez-le-passage, 292 passages piétons, 24 tronçons de **lignes de bus TAN** (relations `route=bus`), 39 arrêts.
- [x] `src/gx/traffic.js` : graphe orienté (`G.out`, sens uniques respectés), rues larges préférées aux chemins, voie de droite à la largeur de la rue ; feux (cycle de 39 s, deux axes, feux visibles en instances), arrêt au stop, cédez-le-passage (attente de 8 s au plus), arrêt pour un piéton sur le passage ou devant la voiture ; clignotants avant les virages ; dépassement d'une voiture immobile hors file d'attente, si personne n'arrive en face ; panique et klaxon aux coups de feu (les feux sont alors grillés) ; densité selon l'heure (30 % la nuit, 125 % aux heures de pointe).
- [x] Bus TAN (forme simple, blanc et vert) sur leurs vraies lignes, arrêt de 10 s aux arrêts, collision sur toute leur longueur.
- [x] Tram : les rues s'arrêtent avant les voies (données), les nœuds du graphe au nord du mur du tram sont exclus.
- [x] **Retours de jeu traités** : police contre Rapaces (patrouilles qui prennent en chasse un Rapace vu à moins de 75 m, et le Rapace riposte) ; véhicules bloqués (cibles hors carte ou derrière les barrières exclues, chemins étroits évités, voiture qui recule trois fois en 15 s remise sur une rue proche hors de vue) : marches arrière divisées par plus de deux en simulation.

#### Cycle 8 : ambiance et vie ★★ (fait le 14 nov. 2026)
- [x] **Clôtures, haies, murets et portails cassables** (`src/make_fences.py` → `data/fences.json`, `src/gx/fences.js`) : 7 103 panneaux de 2,4 m, tirés des barrières OSM (clôture, mur, haie, grille, portail) et, là où OSM n'a rien, des façades sur rue des parcelles du cadastre (IGN). Bois, muret à grille, haie, portail, mur de jardin ; chacun a sa résistance (un mur tient à faible vitesse, une clôture cède) ; débris, remise en place une minute plus tard hors de vue ; 4 appels de dessin par tuile de 250 m.
- [x] **Lumières des lampadaires** (retour de jeu) : les flaques de lumière suivent le relief au lieu d'un carré plat qui flottait ou s'enfonçait, et s'arrêtent aux murs.
- [x] Moins de piétons la nuit, terrasses pleines à midi et le soir, vides au petit matin ; la nuit, les voitures éclairent la chaussée devant elles.
- [x] **Piétons qui traversent les murs** (retour de jeu) : l'écart pour éviter une voiture s'arrête aux murs (4 m au plus du trottoir), la chute aussi. La refonte complète des piétons est confiée à Fable 5.2 (section dédiée).
- [x] Correctif : depuis le réglage de la physique (cycle 4), un commentaire mal placé avait effacé une partie des réglages par défaut d'Ultra (équipes, fin de partie, moment de la journée, circulation, distance de vue) : le menu des joueurs plantait sur une nouvelle installation. Vérifié maintenant par un test.
- [→] Reste pour plus tard : enseignes lumineuses, marché de la butte et sorties d'école (avec la refonte des piétons).

#### Cycle 9 : détail visuel ★★ (fait le 14 nov. 2026, en partie)
- [x] **Eau sur la terre ferme et « étage » de la carrière Misery** (retours de jeu) : même cause. Les plans d'eau OSM (bassins, piscines, l'étang de la carrière) étaient posés à plat au point **le plus haut** de leur contour ; l'étang de Misery (17 m de pente) flottait comme un plancher bleu au-dessus des allées et sous les passerelles. Ils sont maintenant au point le plus bas. En plus, le sol hors de la Loire (multipolygone OSM) qui descend sous le niveau de l'eau est remonté juste au-dessus (`src/carve.py`).
- [x] **Bulle du bouclier** (retour de jeu) : champ d'énergie (bord lumineux, centre clair, nid d'abeilles qui ondule et monte, onde là où le tir touche, scintillement les deux dernières secondes). Leçon : le moteur utilise un tampon de profondeur logarithmique ; un shader maison doit inclure `<common>` et les morceaux `logdepthbuf`, sinon il est caché derrière tout (D-19).
- [x] Niveaux de détail : les tuiles d'objets répétés (arbres, poteaux, mobilier) sont masquées au-delà de la distance de vue (`Tiles.lod`).
- [x] (réglé le 15 nov., Fable 5.2) **Herbe près de la mairie selon l'angle** : pas reproduite ici (la mairie, son parc et le boulevard s'affichent bien sous plusieurs angles) ; il faut l'endroit exact (nom de rue affiché en bas à gauche, ou une capture avec la minicarte).
- [→] Reste : brouillard et atmosphère selon la météo plus poussés, meilleurs toits et rez-de-chaussée (à confier plutôt à Fable 5.2 avec la refonte des façades).

### Phase 3 : progression et contenu (cycles 10 à 14)

#### Cycle 10 : sauvegarde v2 ★★ (fait le 14 nov. 2026)
- [x] `src/game/profile.js` : schéma `gangstamen.save.v2` (3 emplacements, profil versionné : respect, missions, améliorations, voiture, garage, statistiques, records, découvertes) ; migration automatique depuis `settings.v1` au premier lancement. Le code du jeu garde ses champs (`settings.bank`, `camp`, `upg`, `cars[0]`) : charger un emplacement les remplit, `saveSettings()` les recopie dans l'emplacement (sauvegarde aux moments clés : missions, garage, et toutes les 20 s en solo pour les statistiques).
- [x] Écran *Sauvegardes* (menu principal) : jouer, renommer, effacer (double clic de confirmation, pas de boîte de dialogue, souvent bloquée dans un artifact), **exporter en code** à copier et **importer** (somme de contrôle, version vérifiée).
- [x] Statistiques : kilomètres, KO, morts, vitesse de pointe, temps de jeu.
- Note : si le navigateur refuse le stockage (certains contextes d'artifact), la partie vit en mémoire le temps de la session ; l'export en code reste possible.

#### Cycle 11 : courses et défis ★★★ (fait le 14 nov. 2026)
- [x] `src/gx/activities.js` : 8 activités en partie solo hors mission, balises sur la carte et la minicarte (bleu : course, orange : défi), départ en s'arrêtant dans la balise (moins de 30 km/h).
- [x] 3 courses sur les vraies rues (Sainte-Anne → quai de la Fosse, tour de la butte, sprint du boulevard de la Liberté) : tracé calculé sur le graphe des rues, points de passage tous les 110 m, compte à rebours, **fantôme** du meilleur temps, médailles or, argent, bronze selon la vitesse moyenne (20, 16, 13 m/s), abandon à plus de 320 m du parcours.
- [x] 5 défis : dérapage (points avec multiplicateur), sauts de la carrière Misery (distance en vol), livraison express (vers un vrai commerce, chrono selon la distance), semer la police (2 étoiles), destruction (mobilier et clôtures en 60 s).
- [x] Records dans la sauvegarde (`Profile.record`), affichés sur l'écran *Campagne* ; respect gagné selon la médaille ou le score.
- [→] À régler après essai : seuils des médailles, durée des défis, tracés.

#### Cycle 12 : garage et personnalisation v2 ★★★ (fait le 14 nov. 2026)
- [x] **Garages ouverts où l'on entre** (demande de l'utilisateur) : chaque garage a un atelier (7,4 × 11 m) posé sur un emplacement libre au bord de la rue près du vrai garage (sans bâtiment, rue, mur ni arbre, sol assez plat), rideau levé côté rue, pont élévateur, établi, éclairage ; murs avec collision et porte libre. Le menu s'ouvre **à l'intérieur**, plus sur le parvis ; il se rouvre en ressortant puis en rentrant.
- [x] Plusieurs voitures : acheter les autres modèles (400 à 800 de respect), les garder au garage, en changer ; chaque voiture garde ses réglages et son apparence (sauvegarde : `settings.owned` ↔ `profil.garage`).
- [x] Réglages par voiture, branchés sur les deux conduites : boîte courte (reprises contre vitesse de pointe ; en réaliste, rapports plus courts), pneus sport (adhérence), freins renforcés (3 niveaux chacun).
- [x] Apparence : couleur au choix (sélecteur de couleur), jantes (5 teintes), vitres teintées, aileron.
- [→] Plus tard : autocollants années 90, vitrine tournante dans l'atelier, réglage de suspension.

#### Cycle 13 : catégories de véhicules ★★★ (fait le 14 nov. 2026 ; capture : `docs/captures/cycle13-vehicules.png`)
- [x] Trois nouvelles catégories, en version classique et HD (silhouettes et carrosseries lissées) : **coupé sport** années 90 (dessin original, propulsion, turbo, 0 à 100 en 1,8 s en réaliste, fragile : dégâts ×1,25, léger), **utilitaire** (grand fourgon, lourd et lent, encaisse : dégâts ×0,65, pousse les autres ×1,7, son de diesel plus grave), **voiture de police** jouable (berline à gyrophares ; la police te recherche deux fois moins vite).
- [x] Achetables au garage (1 500, 900, 1 200 de respect) et au menu *Ta voiture* ; l'utilitaire roule aussi dans la circulation ; collisions pondérées par la masse.
- [→] Deux-roues : non, la physique actuelle ne le permet pas proprement (à voir avec Fable 5.2).

#### Cycle 14 : monde ouvert ★★ (fait le 14 nov. 2026)
- [x] `src/gx/discover.js` : 10 **cartes postales** à découvrir en roulant jusqu'aux lieux emblématiques (églises Sainte-Anne et Saint-Martin, escalier Sainte-Anne, mairie, place Jean-Macé, carrière Misery, gare, gare maritime, vue sur la grue Titan, temple antoiniste) : +50 de respect, points blancs sur la minicarte à proximité, galerie sur l'écran *Campagne*, enregistrées dans la sauvegarde.
- [x] Activités réparties sur la carte (cycle 11) ; progression qui débloque : coupé sport (5 cartes postales), voiture de police et défi « Semer la police » (mission Pin-pon). Les garages réels restent ouverts dès le départ (demande de l'utilisateur).
- [→] Plus tard : plus de lieux, textes relus par l'utilisateur, récompenses visuelles (photos de cartes postales en mode photo).

### Phase 4 : élargir (après la phase 3)
- **Idée de l'utilisateur (14 nov.) : navettes fluviales vers l'île de Nantes.** Des bateaux font la navette sur la Loire (comme le Navibus) ; on peut sauter dessus avec la voiture depuis un ponton, pour un niveau en plus au bout de l'île de Nantes, avec l'éléphant mécanique et le carrousel des mondes marins. Attention : le Grand Éléphant et le Carrousel des Mondes Marins (Machines de l'île) sont des œuvres protégées. Les modéliser fidèlement serait une reproduction ; on ferait des machines originales dans le même esprit (grand animal mécanique, manège à créatures marines), à valider avec l'utilisateur. C'est un agrandissement du monde : accord de l'utilisateur avant de commencer.
- Streaming du monde par tuiles (chargement et déchargement) une fois le rendu par tuiles en place.
- Nouveaux quartiers : Bas-Chantenay industriel, île de Nantes par un pont.
- **Navettes fluviales et niveau « bout de l'île de Nantes »** (idée de l'utilisateur, 14 nov.) : des bateaux font la navette sur la Loire entre un ponton côté Chantenay (quai) et l'île de Nantes ; on monte à bord depuis le ponton (voiture ou à pied ?) pour rejoindre un niveau en plus à la pointe ouest de l'île : quais, hangars et nefs des Chantiers, carrousel et parc. **Attention aux droits** : le Grand Éléphant et le Carrousel des Mondes Marins sont des œuvres de La Machine, protégées ; le jeu peut montrer les lieux (nefs, hangars, emplacement du carrousel) mais ni copier ces machines, ni en faire une variante reconnaissable. Il faudra des créations originales. Agrandissement du monde : accord de l'utilisateur donné sur le principe, à préciser (taille, accès en voiture ou non) avant de commencer.
- Synchronisation en ligne des bonus, de la circulation et du tram ; capture du drapeau en ligne.

### À confier à Claude Fable 5.2 (demande de l'utilisateur, 14 nov. 2026)
Chantiers où un modèle plus fort apporterait le plus : gros morceaux de code à repenser d'un bloc, ou réglages fins difficiles à juger sans voir, entendre ni jouer.
- **Refonte des piétons** (`src/gx/pedestrians.js`, `crowd.js`, `terraces.js`) : navigation sur les trottoirs qui respecte vraiment les murs (aujourd'hui la fuite les fait traverser les bâtiments), traversées aux passages piétons, groupes, animations plus riches, réactions (fuite, panique, regard), foule qui change selon le lieu et l'heure. C'est le plus gros chantier de la liste.
- **IA de conduite** (bots Rapaces, police, circulation) : planification de trajets, poursuites et interceptions, évitement entre voitures, manœuvres de déblocage propres au lieu d'une marche arrière à l'aveugle.
- **Physique réaliste** : ressenti au clavier et à la manette, glisse, aide au pilotage, dégâts de la carrosserie.
- **Bugs de rendu difficiles** : herbe qui recouvre la route selon l'angle (mairie), eau de la Loire sur la terre près du pont, taches de lumière des lampadaires dans l'intro.
- **Multijoueur en ligne** : synchronisation de la circulation, du tram et des bonus, latence, reprise après déconnexion.
- **Architecture** : chaque système déclare ce qu'il utilise des autres (suite de D-12), pour pouvoir confier un module à part.

### À confier à Fable 5.2 (demande de l'utilisateur, 14 nov. 2026)
Chantiers lourds, où un modèle plus puissant fera nettement mieux : refontes de systèmes entiers, beaucoup de code lié, réglages fins difficiles à vérifier ici sans écran. À lancer dans une session Fable 5.2 avec ce dépôt ; ils restent hors de l'enchaînement des cycles 5 à 14.
- [x] (en grande partie : modèles, animations, réseau de trottoirs ; la suite est dans le backlog) **Refonte des piétons** (`src/gx/pedestrians.js`, `crowd.js`, `terraces.js`) : vrai réseau de trottoirs et de passages piétons tiré d'OSM, évitement des murs et des autres piétons, traversées aux passages, animations (marche, course, fuite, chute) plus riches, foules selon le lieu et l'heure ; corrige à la racine « piétons qui traversent les murs ».
- [→] **Conduite des IA par voies** : planification de trajectoire sur des voies (et non des nœuds), changements de voie, ronds-points, files aux feux propres ; bots Rapaces qui conduisent aussi bien que la circulation.
- [→] **Partie en ligne robuste** : prédiction et correction, synchronisation de la circulation, du tram et des bonus, reprise après déconnexion (aujourd'hui jamais testée à plusieurs).
- [→] **Physique réaliste, 2e passe** après les essais de l'utilisateur (suspension, transfert de charge en virage, sensation à la manette).
- [→] **Niveau de l'île de Nantes** (voir Phase 4) : modélisation d'un nouveau quartier entier, navettes fluviales et pontons.
- [x] **Physique réaliste : la voiture translate sur le côté** (fait le 14 nov., Fable 5.2). Cause : en marche arrière, l'angle de dérive des pneus était inversé en entier, alors que seul le terme de braquage change de signe ; les pneus poussaient la voiture de côté au lieu de la retenir (jusqu'à 25 m/s de glisse en simulation), en reculant et à la fin de tout freinage appuyé tenu jusqu'à la marche arrière. Corrigé, plus : répartition de freinage façon ABS (85 % de l'adhérence d'un essieu au plus), moteur limité à 92 %, glisse qui s'éteint à basse vitesse. Mesures : glisse latérale en marche arrière 25 → 2 m/s, freinage en virage 20 → 5 m/s. Vérifié par le test de physique (toutes les voitures).
- [x] **Modèles du tram et des bus** (fait le 14 nov., Fable 5.2 ; capture `docs/captures/fable-tram-bus.png`) : `src/world/loft.js` (`loftBody` : section arrondie balayée le long du véhicule, nez effilé et pare-brise incliné, peinture par bandes et par travées). Tram façon 1996 : caisse blanche à bandeau vert, toit arrondi, baies entre montants, portes doubles vitrées, cabine inclinée, bogies et roues, soufflets, girouette, rétroviseurs, pantographe. Bus : même principe, bandeau vert bas, deux portes doubles à droite, roues dans leurs passages, pare-brise et lunette inclinés, feux, rétroviseurs. Pas de logo. Reste possible : intérieur visible, portes qui s'ouvrent aux arrêts.
- [x] **Modèles des piétons** (fait le 14 nov., Fable 5.2 ; capture `docs/captures/fable-pietons.png`) : pièces arrondies au lieu de boîtes (`src/gx/crowd.js` : torse profilé des hanches aux épaules, membres fuselés, tête sur un cou avec un nez, chaussures), corpulences (carrure, ventre, épaisseur des membres), femmes et hommes, enfants à cartable, personnes âgées (cheveux gris, pas plus lent), cheveux courts, longs, chignon, crâne dégarni, casquettes, vestes, jupes, sacs. Toujours des pièces instanciées (18 appels de dessin pour toute la foule). Les animations et le réseau de trottoirs restent dans « Refonte des piétons ».
- [x] **Bords de carte logiques** (fait le 15 nov., Fable 5.2 ; capture `docs/captures/fable-bords-de-carte.png`). Avant : mur invisible à travers jardins et terrains vagues, puis une plaine vide jusqu'à l'horizon. Maintenant : (1) `src/make_belt.py` (étape de `build.sh`) prolonge la ville sur 250 m au-delà des bords et du tram : 19 rues coupées par le bord continuent, environ 1 200 maisons et immeubles inventés (marqués `x: 1`, ajoutés en fin de liste pour ne pas décaler les indices) et 500 arbres ; (2) `edgeWalls` (`src/world/edges-tram.js`) : un vrai mur de pierre visible le long des bords ouest, sud et est, entre les maisons, là où il n'y a ni rue, ni bâtiment, ni eau ; (3) les rues qui sortent sont fermées par un chantier : barrières, panneau « ROUTE BARRÉE », tranchée et tas de terre. Au nord le tram, au sud la Loire. Coût : +137 appels de dessin sur la vue de mesure (718), +45 Mo de mémoire ; à surveiller sur la vraie machine. Reste possible : rive d'en face de la Loire (avec le niveau de l'île de Nantes), bâtiments du fond plus simples si la fluidité baisse.
- [x] **Loire : texture de l'eau et bateaux** (fait le 15 nov., Fable 5.2 ; capture `docs/captures/fable-loire-bateaux.png`). Eau : une tuile de vaguelettes lue trois fois à des tailles et des angles différents (plus de motif répété, le lointain se calme), `waterMat` dans `src/hd/world-upgrades.js`. Bateaux (`src/gx/boats.js`) : quatre voiliers suivent le chenal en boucle, un bac à voitures traverse entre le quai de Chantenay (x 932, z 320) et la pointe ouest de l'île de Nantes (x 1133, z 320) ; le Maillé-Brézé (destroyer musée) est amarré quai de la Fosse à sa place réelle (x 1386, z −468). **Géographie à retenir** : le bras de la Madeleine remonte vers le nord-est de (1100, 380) à (1650, −650) ; la pointe ouest de l'île de Nantes est déjà dans le relief du jeu (x > 1200, z < 380, sans rues) ; au sud de z 390, c'est le bras de Pirmil puis Trentemoult avec 22 s d'arrêt à chaque rive ; les voiliers lui cèdent le passage ; sillage, roulis, gîte. Modèles CGTrader téléchargés par l'utilisateur, allégés par `tools/assets/bake_model.js` (voir `DATA-LICENSES.md`). Décor seulement : pas de collision, on ne monte pas encore à bord (ce sera la navette du niveau de l'île). Reste : écume le long des quais, bateau à moteur, feux de navigation la nuit, corne du bac.

### Répartition du travail restant (décision de l'utilisateur, 15 nov. 2026)

L'utilisateur fait tourner **Fable 5.2** sur ce qui demande un modèle fort, et garde pour **Opus 5.5** ce qui est bien cadré. Chaque ligne renvoie au détail plus bas.

#### Pour Fable 5.2 (gros systèmes, code très lié, peu vérifiable sans écran)
1. [x] **Déplacements des piétons** (fait le 15 nov., Fable 5.2) : les trottoirs forment un réseau (`buildWalks` dans `src/gx/pedestrians.js` : 11 700 points tous les 10 m des deux côtés des rues et sur les chemins piétons d'OpenStreetMap, reliés aux coins, en bout de rue et aux passages piétons ; aucun lien ne traverse un mur). Les piétons choisissent leur chemin à chaque coin, attendent au bord qu'aucune voiture n'arrive puis traversent d'un pas plus vif ; au coup de feu ils fuient par le trottoir qui s'éloigne du tireur. Mesure du test : moins de 1 % du temps sur la chaussée hors passage (entrées de cours, retours d'esquive). **Reste (Opus possible)** : évitement entre piétons, groupes, foule selon le lieu et l'heure, respect du feu piéton aux carrefours à feux.
2. [→] **Conduite des IA par voies** : trajectoires sur des voies, files aux feux, changements de voie, ronds-points, Rapaces et police qui conduisent proprement.
3. [→] **Partie en ligne robuste** : prédiction et correction, synchronisation de la circulation, du tram et des bonus, reprise après coupure.
4. [→] **Physique réaliste, 2e passe** : attend les essais de l'utilisateur sur la correction du 14 nov.
5. [→] **Niveau de l'île de Nantes** (accord et choix de l'utilisateur, 15 nov. : départ de la Gare Maritime, bac pour les voitures, arrivée au bout de l'île près de la grue grise comme le Navibus ; ajouter le pont Anne-de-Bretagne depuis le quai de la Fosse et les Nefs).
   - [x] **Navette embarquable** (fait le 15 nov.) : le bac suit le bras de la Madeleine de la Gare Maritime (colonne de lumière bleue sur le quai, x 1298, z −402) à la pointe de l'île (Hangar à Bananes, x 1300, z 352). On s'arrête dans la colonne quand le bac est à quai : la voiture est posée à bord, portée pendant la traversée (2 min environ), déposée de l'autre côté. `src/gx/boats.js` (`ROUTE`, `LAND`, `cargo`), pont mobile par `DECKS` dans `src/core/prelude.js`. Limites : embarquement par zone (pas de rampe où rouler), bac non synchronisé en ligne, une ou deux voitures, la pointe de l'île n'a pas encore de rues (on roule sur le quai nu entre les hangars).
   - [x] **Carte étendue vers l'est** (fait le 15 nov.) : bord est passé de x 1 664 à 2 280. Nouvelles données par le navigateur de l'utilisateur (OSM : bande est ajoutée à `data/map.osm` par `tools/merge_osm.py`, Overpass étant en panne ; BD TOPO, RGE ALTI, photo aérienne jusqu'à x 2 400, cadastre). Les 4 795 bâtiments existants gardent leur numéro (`convert.py` les renumérote d'après la conversion précédente), 186 nouveaux, 1 914 rues au lieu de 1 390. Le pont Anne-de-Bretagne (en travaux dans OSM, rouvert pour 1996) relie le quai de la Fosse à l'île ; les voitures roulent sur un pont au-dessus de l'eau. Rues de l'île, Nefs Dubigeon (toit), pont des Trois-Continents vers Rezé au sud-est. **Reste** : Nefs à modéliser (halles métalliques ouvertes, aujourd'hui un bâtiment générique), circulation et police ne passent pas les ponts sur l'eau (`nodeOk`), façades photo et points d'intérêt de l'île, performances à mesurer sur la machine de l'utilisateur (carte 30 % plus large). Ancien texte : nouvel extrait OpenStreetMap et IGN par le navigateur de l'utilisateur (`tools/fetch_data_browser.js`), pour les rues de l'île, les Nefs (x 2040, z −140), le pont Anne-de-Bretagne (hors de l'extrait actuel, qui s'arrête à x 1740) et l'accès par le quai de la Fosse. Les Nefs : halles métalliques des anciens chantiers, à modéliser comme bâtiment (pas les machines de La Machine, œuvres protégées).
   - [→] **Grues et pontons** : exploiter les modèles téléchargés (`Cranes.fbx` 141 000 triangles à alléger, `Dock.FBX`) pour améliorer la grue Titan de l'île et les pontons d'embarquement (demande du 15 nov.).
6. [x] **Herbe sur le trottoir selon l'angle, devant la mairie** (fait le 15 nov., à confirmer sur la machine de l'utilisateur : non reproductible en rendu logiciel). Cause : le shader du sol lisait la photo aérienne avec un biais sur le niveau automatique ; de loin ou en vue rasante (plan de l'intro), les pelouses débordaient sur les trottoirs. Lecture à niveau fixe (`textureLod`) dans `src/hd/ortho.js`.
7. [x] **Bâtiment-pont du quai Ernest-Renaud** (retour du 15 nov., fait) : le bâtiment qui enjambe la rue la barrait. `src/make_belt.py` repère les bâtiments traversés par une rue large (`u` : hauteur libre) ; `city.js` fait partir leurs murs à 5,4 m, sans collision, avec un dessous.

#### Pour Opus 5.5 (tâches cadrées, une par session, dans cet ordre)
1. [→] **Commissariat invisible devant la mairie** : capture, puis rendre le bâtiment visible et reconnaissable.
2. [→] **Garages au bon endroit** : comparer aux points OpenStreetMap et à la photo aérienne, changer de bâtiment ou de côté de rue.
3. [→] **Feux sur les trottoirs** au lieu du milieu de la chaussée.
4. [→] **Deux modes de jeu séparés** : « Chasse aux Rapaces » (temps limité) et « Conduite libre » (missions et activités sur la carte, cylindres lumineux). Montrer la proposition de menu avant de retirer quoi que ce soit.
5. [→] **Conduite libre : carte de choix du point d'apparition**, au départ et pendant le jeu (touche ou menu pause : la carte s'affiche, on choisit où réapparaître) ; à défaut de choix, lieu tiré au sort parmi plusieurs.
6. [→] **Loire, suite** : placer les modèles déjà téléchargés (bateau de pêche, bateau à vapeur, bateau à moteur, grues, ponton, abribus) avec `tools/assets/bake_model.js` ; écume le long des quais, feux de navigation la nuit, corne du bac.
7. [→] **Gens qui jouent au ballon** au parc Schwob (et à la Durantière si la carte s'agrandit jusque-là) : les footballeurs téléchargés par l'utilisateur (`joueur1…5`, `gardien`, `arbitre`, `cage` dans Téléchargements, prévus pour un autre projet, utilisables ici) ; passer par `tools/assets/bake_people.js` s'ils ont un squelette et des animations.
8. [→] **Terrasses** : remplacer les anciennes silhouettes des clients par les personnages animés (il manque une pose assise : la fabriquer à partir de la pose d'attente en pliant hanches et genoux).
9. [→] Backlog hérité (bas du fichier), au fil de l'eau.

### Retours du 15 nov. 2026 (matin), à traiter dans cet ordre

- [→] **Commissariat invisible devant la mairie** : l'utilisateur ne voit pas le bâtiment du commissariat (base de la police, x 170, z −343, `buildHQ` dans `src/gx/police.js`). Vérifier par capture qu'il est bien construit, visible et reconnaissable (enseigne, voitures de police garées), et qu'il n'est pas masqué par un bâtiment OSM.
- [→] **Garages pas au bon endroit** : les bâtiments des garages (`src/gx/garages.js`) semblent être en face de l'emplacement réel, pour celui proche du tram et celui du milieu du boulevard de la Liberté. Comparer avec les points `shop=car_repair` d'OpenStreetMap et la photo aérienne ; choisir le bon bâtiment (ou le bon côté de la rue).
- [→] **Feux au milieu de la chaussée** : des feux tricolores sont posés au milieu de la route ; les replacer sur le trottoir (poteau au bord, côté droit du sens de circulation), `TF` dans `src/gx/traffic.js`.
- [x] **Animations des piétons** (fait le 15 nov., Fable 5.2 ; capture `docs/captures/fable-pietons-animes.png`) : les piétons de la rue sont des personnages à squelette animés (pack « City People » : 8 personnages, 8 palettes, marche, marche lente, marche au téléphone, course, attente, appel), `src/gx/people.js`, données `data/people.json` faites par `tools/assets/bake_people.js`. Fondu de 0,2 s entre deux mouvements. Reste : les clients des terrasses gardent les anciennes silhouettes (pas d'animation assise dans le pack gratuit) ; pas de geste propre à la chute (le personnage est couché figé) ; réseau de trottoirs et passages piétons toujours à faire.
- [→] **Séparer deux modes de jeu** : (1) « Chasse aux Rapaces » : détruire les Rapaces en temps limité ; (2) « Conduite libre » : pas de chrono, les missions et activités apparaissent sur la carte avec leurs cylindres lumineux. Aujourd'hui les deux sont mêlés. Changement de structure des menus : montrer la proposition à l'utilisateur avant de retirer quoi que ce soit.
- [→] **Conduite libre : point de départ varié** : ne plus apparaître toujours au même endroit ; tirage au sort parmi plusieurs lieux, ou carte avec choix du point de départ.
- [→] **Loire, suite** : cargo de pêche, bateau à vapeur, bateau à moteur, grues et pontons téléchargés par l'utilisateur (voir `DATA-LICENSES.md`) à placer ; dossiers `joueur1…5`, `gardien`, `arbitre`, `cage` (footballeurs) : demander à l'utilisateur à quoi il les destine.

### Retours du 15 nov. 2026 (midi), répartis Fable / Opus

Notés par Opus 5.5 pendant que Fable 5.2 travaillait sur `ultra` ; rien n'est commencé. Une première version de ces notes avait été mise par erreur dans `LEDGER.md` sur `main` : elle en a été retirée, cette section fait foi.

#### Pour Fable 5.2 : le bac (suite de « Navette embarquable », niveau de l'île de Nantes)
- [x] (fait le 15 nov. : plus de zone d'embarquement, on descend en roulant ; qui reste à bord repart avec le bac à l'horaire) **Traversées sans fin** : en arrivant à destination, on est aussitôt remis dans le bac pour le retour. Débarquer pour de bon : laisser la voiture sortir, et ne pas réembarquer tant qu'on n'est pas ressorti puis revenu dans la zone (ou tant qu'on n'a pas demandé à monter).
- [x] (fait le 15 nov. : toute voiture de joueur posée sur le pont est portée et reste libre de manœuvrer ; le bord du pont l'arrête) **Bouger à bord** : pouvoir manœuvrer la voiture sur le pont pendant la traversée (rester porté par le bac, `DECKS`), au lieu d'être figé.
- [→] **Autres passagers** : des voitures de la circulation et des piétons prennent aussi le bac (attente au quai, embarquement, débarquement de l'autre côté).
- [x] (fait le 15 nov. : rampe à chaque quai, baissée quand le bac est là, gros feu vert / rouge en haut ; le bac attend qu'il n'y ait personne sur la rampe ; `LAND` et `DECKS` dans `src/gx/boats.js`. Reste : la rampe est une simple dalle, à habiller avec le modèle de ponton) **Embarquer en roulant, sans téléportation** : supprimer la colonne bleue ; une rampe à la Gare Maritime et une à la pointe de l'île, on monte et on descend du bac en roulant. Un gros feu vert / rouge au bout de chaque rampe indique si on peut y aller (bac à quai et rampe baissée, ou non).
- [x] (fait le 15 nov. : `titan()` prend une position et une couleur ; grise à la pointe (x 1218, z 366), jaune replacée à sa position OpenStreetMap (x 1528, z −288) ; on passe sous le portique, les pieds arrêtent les voitures) **Grue Titan grise** (demande du 15 nov.) : elle manque au bout de l'île de Nantes, là où arrive le bac. Avec le point « Grues et pontons » ci-dessus ; la Titan jaune existe déjà (`titan()`), la grise peut partir du même modèle ou de `Cranes.fbx`.

#### Pour Opus 5.5 (tâches cadrées)
1. [x] **Police semée au bout d'une seconde à une étoile** (bug ; fait le 15 nov., branche `opus-retours-15nov` : hors de vue, la chaleur ne baisse qu'après 5 s + 2,5 s par étoile sans être vu (`L.unseen`) ; mesure : une étoile perdue au bout de 8,3 s hors de vue au lieu d'environ 1 s) : `src/gx/frame.js`, boucle de la police. Tant qu'aucune voiture de police n'est apparue, `seen` est faux, la chaleur baisse au rythme rapide (0,12/s) et, partie juste au-dessus de 1, repasse sous le seuil presque aussitôt : « Semés ! ». Délai de grâce, ou « pas vu » seulement après l'arrivée d'une première patrouille.
2. [x] **Pas de Rapace qui tire dès le lancement** (fait : `scatterRivals()` dans `src/game/teams.js`, appelé au départ et en conduite libre : Rapaces à plus de 320 m, puis ils se mettent en chasse un par un, après 12 s, 19 s, 26 s… (`calmT`) ; mesure : 20 premières secondes sans tir, le plus proche à 250 m) : `freeRoam()` (`src/gx/campaign.js`) fait apparaître tous les Rapaces d'un coup, et l'un d'eux tombe toujours sur le joueur. Pas d'ennemi à moins de quelques centaines de mètres du joueur au départ, et une arrivée échelonnée (à rapprocher de la carte d'apparition, point 5 de la liste Opus).
3. [x] **Feux tricolores cassables** (fait : `src/gx/lightpoles.js` ; renversés par une voiture à plus de 3 m/s, par 3 balles ou une explosion ; feux éteints, relevés après 90 s hors de vue ; comptent dans le défi Destruction. Le placement sur les trottoirs reste à faire) : renversés en roulant dedans ou détruits par les tirs, comme les clôtures. À faire avec le point « Feux sur les trottoirs » (point 3 de la liste Opus).
4. [x] **Flèches de direction en forme de flèche** (fait : `chevronPath` dans `src/ui/hud.js`, flèche SVG du panneau de mission) : remplacer les triangles (vert mission, rouge Rapace…) par une pointe en chevron avec une encoche à l'arrière, comme un curseur de navigation, pour lire la direction sans ambiguïté (image de référence fournie par l'utilisateur le 15 nov.).
5. [x] **Flèches de mission sur la carte** (fait : flèche verte au bord de la minicarte quand la cible en sort, `gx.objTarget` ; il n'y a pas de carte plein écran dans le jeu) : afficher aussi la flèche verte de direction des missions sur la minicarte et la carte plein écran.
6. [x] **Missions plus longues** (fait : sprint Liberté – Cardiff 1,6 km au lieu de 330 m, Sainte-Anne → quai de la Fosse 1,3 km au lieu de 890 m, nouveaux identifiants de record ; livraison à 900–1 700 m au lieu de 350–800 m) : allonger les missions en ville (sprint, livraison…) en profitant de la carte agrandie (Sainte-Anne, quai de la Fosse).
7. [x] **Escalier Sainte-Anne à refaire** (fait, première passe : paliers entre les volées, muret central, chaperons, terrasse au pied des volées hautes d'où partent les quatre volées latérales, face en pierre côté Loire ; à juger en vrai) : forme, marches, paliers, plus fidèle au vrai escalier (`src/gx/landmarks.js`).
8. [x] **Passages piétons dessinés** (fait : bandes blanches aux 292 passages OpenStreetMap, sur toute la largeur de la rue, `src/world/city.js`) : le réseau de trottoirs et de traversées est fait (Fable, `src/gx/pedestrians.js`) ; vérifier par capture que les bandes blanches sont bien peintes sur la chaussée aux passages, sinon les ajouter.

### Retours de jeu de l'utilisateur (14 nov. 2026), à traiter
Décision de l'utilisateur (14 nov.) : chaque point est traité dans le cycle où il est prévu ; les corrections partent aussi dans `main` (classique et HD).
Captures dans `docs/retours/`.
- [x] **Police contre Rapaces** : fait au cycle 7 (patrouilles, riposte des Rapaces).
- [x] (réglé par le réseau de trottoirs de Fable, 15 nov.) **Piétons qui traversent les murs en fuyant** : la fuite (voiture qui arrive) les décale sans tenir compte des bâtiments ; les garder sur le trottoir ou les arrêter aux murs (cycle 8, ou correctif rapide).
- [x] **Dégâts des gros sauts** : faits au cycle 4 (arcade : au-delà de 12 m/s à la réception ; réaliste : au-delà de 8 m/s, deux fois plus forts) ; à régler après essai.
- [x] **Véhicules bloqués**, surtout près du pont de la place Jean-Macé : fait au cycle 7. Cause trouvée en simulation : voitures envoyées vers des nœuds hors carte (barrières) et dans les chemins étroits (chemin des Vignes du Bourg, place Jean-Macé, 4 m de large). À revérifier en jeu.
- [x] **Bug d'affichage d'étage dans la carrière Misery** : l'étang flottait au point haut de son contour (cycle 9).
- [x] (réglé le 15 nov., Fable 5.2) **Près de la mairie, de l'herbe apparaît selon l'angle de la caméra** : `2026-11-14-boulevard.png` et `2026-11-14-mairie-herbe.png` montrent le **même endroit** (boulevard de la Liberté devant la mairie) sous deux angles ; sur l'une la chaussée et le trottoir sont normaux, sur l'autre une pelouse les recouvre. Piste : conflit de profondeur entre la surface verte (parc ou pelouse OSM, ou sol HD selon la photo aérienne) et la route, qui dépend de la distance et de l'angle ; ou ordre de dessin des tuiles.
- [x] (cycle 9 : plans d'eau posés au point bas, sol hors Loire remonté) **Eau de la Loire visible sur la terre ferme près d'un pont** (`2026-11-14-eau-pont.png` : nappes bleues sur le pavé, tablier du pont qui flotte) : le relief y descend sous le niveau de l'eau.
- [x] **Bulle du bouclier à revoir** : refaite au cycle 9 (champ d'énergie).
- [x] (fait au cycle 8) **Barrières, clôtures et portails cassables le long des propriétés** (jardins, cours) : décor qui se brise comme le mobilier (`gx/batch.js` et `breakFurniture` le permettent) ; positions à tirer d'OpenStreetMap (`barrier=fence|wall|gate`) et des limites de parcelles (cycle 8 ou 9).
- [x] (fait le 15 nov., voir plus haut ; reste l'écume le long des quais et un bateau à moteur) **Loire : reprendre la texture de l'eau et ajouter des bateaux** (retour du 14 nov.) : eau plus belle (vagues, reflets, courant, écume le long des quais) ; quelques bateaux à moteur et voiliers qui se baladent sur le fleuve (trajets sur l'eau, sillage). À rapprocher des navettes fluviales vers l'île de Nantes (Phase 4).
- [x] (cycle 12) **Garages ouverts, on entre dedans** (retour du 14 nov.) : chaque garage a une porte ouverte (rideau levé) et un intérieur ; le menu s'ouvre quand la voiture est **à l'intérieur du bâtiment**, plus dans la zone devant. Murs de collision du bâtiment avec une ouverture à la porte (cycle 12, garage et personnalisation, ou avant).
- [x] **Radio : stations rap, techno (et peut-être funk) presque inaudibles** (retour du 14 nov.) : mesuré hors ligne (`sfx.stationLevels`) : même volume global que la G-funk, mais presque tout sous 220 Hz (basses en sinus, que des haut-parleurs d'ordinateur ou de téléphone ne rendent pas ; acid techno muette les 2 premières mesures). Basses avec harmoniques, accords, caisse claire, gimmick sifflé (rap), clic de grosse caisse, accords, acid dès la 1re mesure (techno), slap à l'octave, clavinet, guitare étouffée, cuivres (funk) : niveau au-dessus de 220 Hz à 85-100 % de la G-funk (vérification automatique). À réécouter.
- [→] **Lumières au sol des lampadaires pendant l'intro de nuit** : taches lumineuses mal placées ou mal dessinées ; revoir les bugs d'affichage de lumière.

### Retours du 14 nov. au soir, traités tout de suite
- [x] **Phares des autres voitures** : la tache de lumière était un rectangle fixé à la voiture, qui penchait avec elle et entrait dans le sol ; c'est maintenant une petite grille posée sur le relief devant la voiture, en forme de faisceau (`src/gx/frame.js`).
- [x] **Commissariat** : le vrai commissariat de police nationale près de la mairie (OSM `amenity=police`, x 170, z −343) sert de base : renforts et patrouilles en partent quand il n'est pas sous les yeux du joueur ; panneau « POLICE NATIONALE », gyrophare, deux voitures garées ; carte postale « Commissariat ».
- [x] **Clôtures cassées par les tirs** : une balle s'arrête sur le premier panneau traversé et l'use (bois 6, haie 9, portail 12, muret à grille 16, mur de jardin 45) ; les explosions cassent tout dans un rayon de 7 m (les murs de jardin seulement de près).

- [x] **Textes des courses et défis illisibles, destination pas claire** (retour du 14 nov., 20 h). Cause principale : la fonction d'affichage des activités portait le même nom (`hud`) que celle de la ligne des armes de `campaign.js` et la remplaçait (portée unique, D-12) : le panneau était réécrit à chaque image et la ligne des armes ne se mettait plus à jour. Renommée `actPanel` ; test ajouté. En plus : annonce à l'approche d'une balise (« Arrête-toi dans la balise pour commencer »), **briefing de 7 s** voiture à l'arrêt avec la consigne complète (tir : partir tout de suite), consigne courte gardée à l'écran pendant l'épreuve, flèche et points sur la minicarte (balises de course, adresse de livraison, carrière), deuxième balise plus pâle pour voir où tourne le parcours, résultat affiché 7 s. Messages éclair (cartes postales…) : durée selon la longueur du texte, retour à la ligne.
- Leçon (D-12) : avant d'ajouter une fonction dans `src/gx/`, vérifier que son nom n'existe pas déjà (`grep -rn "function nom" src`).
