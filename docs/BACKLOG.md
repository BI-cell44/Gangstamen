# Backlog : Gangstamen

**Ce fichier est le seul endroit où l'on note ce qui reste à faire.** Tout ce qui est fait part dans `docs/HISTORIQUE.md` (avec, en annexe, le détail de la feuille de route des 14 et 15 novembre). On travaille sur la branche `ultra` ; une correction utile au classique ou à la HD est reportée dans `main` (puis `main` dans `server`).

Répartition voulue par l'utilisateur (15 nov. 2026) : **Fable 5.2** pour les gros systèmes au code très lié ou difficiles à juger sans écran ; **Opus 5.5** pour les tâches bien cadrées, une par session, dans l'ordre. Quand une tâche est faite : la cocher ici avec une ligne de résultat, puis la déplacer dans l'historique à la fin du cycle.

Dernier retour d'essai de l'utilisateur (15 nov., soir) : Ultra tourne sans problème sur sa carte graphique ; la physique est bonne, sauf la fin du dérapage.

## Pour Fable 5.2

1. [ ] **Fin de dérapage trop sèche** (retour d'essai du 15 nov.) : à la sortie d'une glisse, la voiture s'arrête de glisser trop net ; rendre la reprise d'adhérence progressive. Le reste de la physique est jugé bon : la « 2e passe » se limite à ça sauf nouveau retour.
2. [ ] **Tomber dans la Loire, couler** (15 nov.) : une voiture qui quitte le quai ou le bac tombe à l'eau, s'enfonce et coule (bulles, éclaboussures), puis le joueur réapparaît. Aujourd'hui on ne peut pas tomber dans le fleuve.
3. [ ] **Rampe du bac solide seulement quand le bac est là** (15 nov.) : bac absent, on ne doit pas rouler sur une rampe dans le vide ; c'est la physique qui fait tomber la voiture sur le pont du bac ou dans la Loire (lié au point 2).
4. [ ] **La voiture penche énormément sur les bords du bac** (15 nov.) : en roulant contre le bord intérieur du pont, la voiture se couche ; corriger le contact avec le bord (`DECKS`, `src/gx/boats.js`).
5. [ ] **Autres passagers du bac** : voitures de la circulation et piétons qui attendent au quai, embarquent et débarquent de l'autre côté.
6. [ ] **Île de Nantes, suite** : Nefs en halles métalliques ouvertes (aujourd'hui un bâtiment fermé) ; **grues et pontons : fait le 15 nov.** (capture `docs/captures/fable-grues.png`) : le modèle acheté est une grue de port sur fût, pas une Titan ; il sert de haut (cabine, machinerie, flèche) aux deux Titan, posé sur le portique en treillis avec contre-flèche et contrepoids (jaune tel quel, grise par désaturation), et de grue de quai en cinq endroits (quai sud de l'île, quai de Chantenay), `src/gx/models.js` (`modelMesh`, `bankFrom`, `QUAY_CRANES`) ; ponton en bois à côté de chaque rampe du bac. Reste : habiller la rampe elle-même (dalle nue), une 6e grue refusée à Chantenay (emplacement sur une rue) ; façades et lieux de l'île. **Droits** : ni le Grand Éléphant ni le Carrousel des Mondes Marins (œuvres de La Machine) : seulement des créations originales, à valider avec l'utilisateur.
7. Physique : sauts (tangage et roulis en l'air, réception sur les suspensions), collisions par hauteur pour tout le mobilier ; deux-roues (la physique actuelle ne le permet pas).
8. [ ] **Conduite des IA par voies** : trajectoires sur des voies, files aux feux, changements de voie, ronds-points, Rapaces et police qui conduisent proprement ; **passage des ponts sur l'eau** pour la circulation et la police (aujourd'hui exclus par `nodeOk`).
9. [ ] **Partie en ligne robuste** : prédiction et correction, synchronisation de la circulation, du tram, des bonus et du bac, capture du drapeau tenue par l'hôte, reprise après coupure. Jamais testée à plusieurs.
10. [ ] **Toits plus jolis** (15 nov.) : remplacer la photo aérienne des toits par des textures dessinées, plus belles mais inspirées de la photo (couleurs, motifs : tuiles, ardoise, zinc, toits plats). **D'abord un essai sur une petite zone**, montré à l'utilisateur avant de l'étendre.
11. [ ] **Piétons, suite** (possible pour Opus) : évitement entre piétons, groupes, foule selon le lieu et l'heure, respect du feu piéton aux carrefours à feux.
12. [ ] **Pont Anne-de-Bretagne : un seul pont** (15 nov.) : il est dessiné comme trois ponts côte à côte, c'est un seul ouvrage.
13. [ ] **Piétons en fuite qui entrent dans les bâtiments** (15 nov.) : en fuyant, certains traversent encore les murs ; les garder sur le réseau de trottoirs.


## Pour Opus 5.5 (dans cet ordre)

1. [x] (fait le 15 nov. au soir : bandeaux bleus « POLICE NATIONALE » sur les murs du vrai bâtiment, drapeau, gyrophare, panneau et deux voitures garées devant, côté boulevard ; avant, le décor était près d'une rue de derrière) **Commissariat invisible devant la mairie** (x 170, z −343, `buildHQ` dans `src/gx/police.js`) : capture, puis le rendre visible et reconnaissable (pas masqué par un bâtiment OSM).
2. [x] (fait : l'atelier est cherché du côté de la rue où est le vrai garage, au plus près de lui ; les trois garages sont maintenant de leur côté, à 26 à 51 m du point OSM) **Garages au bon endroit** (`src/gx/garages.js`) : celui près du tram et celui du milieu du boulevard de la Liberté semblent en face du vrai ; comparer aux points `shop=car_repair` d'OSM et à la photo aérienne.
3. [x] (fait : poteaux poussés sur le trottoir à 0,9 m de la bordure ; mesure : 0 feu sur la chaussée sur 36, contre 26 sur 40 avant) **Feux sur les trottoirs** au lieu du milieu de la chaussée (`TF` dans `src/gx/traffic.js` ; les feux cassables de `src/gx/lightpoles.js` suivent les mêmes instances).
4. [x] (fait en grande partie : la chaussée suit le relief sur toute sa largeur là où le sol se bombe, plus de trottoir ni d'herbe à travers les voies dans la montée de la rue de l'Hermitage ; reste la bande pavée ondulée entre deux chaussées séparées) **Routes qui se mélangent avec le sol** (15 nov.) : par endroits la chaussée passe sous le relief ou flotte, par exemple dans la montée du quai de la Fosse vers Sainte-Anne ; captures, puis caler routes et sol.
5. [ ] **Deux modes de jeu séparés** : « Chasse aux Rapaces » (temps limité) et « Conduite libre » (pas de chrono, missions et activités sur la carte avec leurs cylindres lumineux). Montrer la proposition de menu à l'utilisateur avant de retirer quoi que ce soit.
6. [ ] **Conduite libre : choisir où apparaître sur une carte** : au lancement du mode, une carte avec plusieurs points de départ, à cliquer ou à choisir à la manette ; pendant le jeu, une touche (et le menu pause) affiche la carte en grand pour réapparaître sur un autre point à tout moment. Sans choix, point tiré au sort.
7. [x] (fait : bouton « Difficulté » en haut de l'écran Campagne, enregistré ; Facile = ennemis ×0,7, dégâts reçus ×0,6, chrono ×1,35, escorte plus solide ; Difficile = ×1,35, ×1,4, ×0,8) **Campagne : trois niveaux de difficulté** (15 nov.) : facile, normal, difficile, choisis au lancement de la campagne et enregistrés dans la sauvegarde ; jouer sur les dégâts reçus, la résistance et la vitesse des ennemis (mines, Vautour, roquettes du Grand Duc), les chronos (orage). Le réglage « normal » reprend l'actuel.
8. [ ] **Loire, suite** : placer les bateaux téléchargés (pêche, vapeur, moteur) avec `tools/assets/bake_model.js` ; écume le long des quais, feux de navigation la nuit, corne du bac.
9. [ ] **Gens qui jouent au ballon** au parc Schwob : footballeurs téléchargés (`joueur1…5`, `gardien`, `arbitre`, `cage`), par `tools/assets/bake_people.js` s'ils ont un squelette.
10. [ ] **Terrasses** : clients en personnages animés, avec une pose assise fabriquée à partir de la pose d'attente.
11. [ ] **Mission du Vautour** : la fuite « vers le quai de la Fosse » est à revoir, le quai est dans la carte ; missions possibles à l'escalier Sainte-Anne et au tram.
12. [ ] **Test « courses et défis » qui échoue par intermittence** : la voiture garée en fin de sprint est parfois détruite (champ `mortAvant` du test), puis le défi Destruction ne démarre pas dans le temps imparti. Cause à trouver (le défi démarre bien quand on rejoue la même séquence seule) ; piste de Fable : un panneau de résultat minuté en temps réel bloquerait le départ suivant, à rendre indépendant de l'horloge.
13. [x] (fait : l'explosion part de la voiture touchée, et un coup direct achève une voiture de police ou de passage) **Roquettes sans effet sur la police et la circulation** (15 nov.) : elles touchent les Rapaces, pas les voitures de police ni celles qui passent.
14. [x] (fait : murs de collision autour de chaque volée et de la terrasse ; à confirmer en jeu) **La voiture traverse le bas de l'escalier Sainte-Anne** (15 nov.) : ajouter les murs de collision du massif, de la terrasse et des volées basses (`src/gx/landmarks.js`).
15. [x] (fait : percuter ou toucher une voiture de police donne au moins une étoile, « Tu as percuté la police ») **Une étoile quand on percute une voiture de police** (15 nov.) : sans être recherché, tamponner une voiture de police fait passer à une étoile.
16. [x] (fait : « La police l'a vu : piéton renversé », au moins une étoile, aussi pour les clients des terrasses) **Une étoile quand on écrase un piéton** (15 nov.) : message « La police l'a vu » et passage à une étoile.
17. [x] (fait : caméra avancée au-dessus du capot, plus de bande sombre en bas de l'écran) **Vue capot** (15 nov.) : on voit un peu le dessous du capot ; remonter ou avancer la caméra.
18. [ ] **Pas de piétons en short sous la pluie ou l'orage** (15 nov.), si possible : tenues longues, parapluies éventuels. Il faut d'abord repérer lesquels des 8 modèles du pack (`pick()` dans `src/gx/people.js`, champ `name` ajouté) sont en short : une capture de chacun, puis les écarter quand `hd.amb.rain` est fort.

## En attente d'un essai de l'utilisateur

- Retours traités le 15 nov. par Opus : police à une étoile, Rapaces au départ, feux cassables, flèches en chevron, missions plus longues, **escalier Sainte-Anne refait** (paliers, terrasse : à juger, volées du bas à caler sur le terrain si besoin), passages piétons peints.
- Son : équilibre des volumes, timbre du moteur, goélands, stations de radio rap, techno et funk.
- Caméras : confort de la poursuite à ressort, cadrage capot et pare-chocs.
- Courses et défis : seuils des médailles, durée des défis, tracés.
- Intro : sous-titres et rythme après un vrai visionnage ; version courte pour les relances.
- Partie en ligne à plusieurs (claude.ai et serveur Node).

## Plus tard

- Façades photo Panoramax de la zone agrandie et de l'île (classique comme HD).
- Mairie (fronton à horloge supposé, dos et côtés), toits et rez-de-chaussée étranges, jardins, vrais noms des enseignes nationales.
- Enseignes lumineuses, marché de la butte, sorties d'école.
- Garage : autocollants années 90, vitrine tournante, réglage de suspension.
- Cartes postales : plus de lieux, textes relus, photos en mode photo.
- Tram et bus : intérieur visible, portes qui s'ouvrent aux arrêts.
- Performances si la machine le demande : niveau de détail des voitures au-delà de 120 m, distance d'affichage du mobilier selon la qualité, moins de programmes de shaders, première image du menu.
- Brouillard et atmosphère selon la météo ; rive d'en face de la Loire ; bâtiments du fond plus simples si la fluidité baisse.
- Streaming du monde par tuiles ; Bas-Chantenay industriel.
- Sur l'ordinateur de l'utilisateur : supprimer les fichiers `*.tmp` du dossier Téléchargements.
