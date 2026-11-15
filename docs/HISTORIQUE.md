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
