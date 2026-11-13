# Gangstamen : journal de bord

Ce fichier garde la mémoire du projet : ce qui a été fait et pourquoi, comment reprendre le travail, ce qui reste à faire. À mettre à jour à chaque session (une ligne dans le journal, et cocher ou ajouter dans le reste à faire).

Dernière mise à jour : 13 novembre 2026.

## En un coup d'œil

Gangstamen est un jeu de combat de voitures des années 90, inspiré d'Interstate '82, dans le quartier de Chantenay à Nantes. Deux fichiers HTML autonomes sont produits à partir du même code : la version classique (rétro, légère) et la version HD (rendu HDR, effets, bâtiments redessinés).

| Élément | Où |
|---|---|
| Code du jeu (source de vérité) | `src/template.html` |
| Moteur HD (injecté dans le gabarit) | `src/hd.js` |
| Construction des deux fichiers | `build.sh` |
| Données (carte, photos, commerces, ortho) | `data/` |
| Branche `main` | version publiée comme artifact sur claude.ai (jeu en ligne via la capacité `room`) |
| Branche `server` | `main` + serveur Node sans dépendance (`server/`), sert aussi la HD sur `/hd` |

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

### 6. Pistes écartées
- Street View comme décor : impossible, les conditions de Google interdisent d'en extraire les images, même en local sans diffusion. Les photos Panoramax (libres) servent à la place.

## Journal

| Date | Changement | Commit |
|---|---|---|
| nov. 2026 | Mairie : pierre blanche, ailes bleues, encadrements crème, carreaux au rez-de-chaussée | 01c40ac, 7e346bd |
| nov. 2026 | Minicarte : triangles de bord selon la distance | beb66dc |
| 13 nov. 2026 | Cinématique d'intro | c2db855 |
| 13 nov. 2026 | Ce journal | voir `git log` |

Les étapes antérieures sont dans `git log`.

## Comment reprendre

**Construire** : `sh build.sh` produit `gangstamen.html` et `gangstamen-hd.html` (le second avec `const HD = true`, la photo aérienne intégrée et sans atlas de photos de façades).

**Tester sans carte graphique** : un navigateur sans tête (Playwright, rendu logiciel swiftshader) charge le fichier avec three.js r128 servi en local. L'objet `window.__gm` expose l'état du jeu (`start`, `locals`, `rivals`, `Match`, `Intro`, `step`…). Trois crochets de test existent : `window.__cam` (position de caméra), `window.__trHold` (garder les tirs à l'écran) et `window.__introT` (figer l'intro à un instant donné). `window.__noIntro = true` saute l'écran d'accueil de l'intro.

**Pièges déjà rencontrés**
- Le shell du bac à sable n'atteint pas l'IGN : la photo aérienne a été récupérée via le navigateur de l'utilisateur.
- En navigateur sans tête, le rendu tourne à environ 2 images par seconde : tout test dépendant du temps passe par les crochets ci-dessus.
- Les couleurs sont écrites en sRGB et converties une seule fois en linéaire en HD (`linearize`, `linMat`).

## Ce qui n'a pas pu être vérifié ici

- Les performances réelles de la version HD sur une vraie carte graphique.
- La synchronisation du son de l'intro (coup de grosse caisse et titre) sur un vrai navigateur, car les captures sont faites en rendu logiciel sans audio.
- Les vibrations de manette, y compris celle de l'intro.
- Une partie en ligne avec de vrais joueurs sur claude.ai, et une partie mélangeant classique et HD sur le serveur.

## Reste à faire

### Prioritaire
- [ ] **Qualité automatique** : ajouter une case pour désactiver la baisse automatique de qualité, et un délai de grâce d'environ 15 secondes au démarrage pour ignorer les saccades de chargement (le message « Qualité graphique réduite » s'est affiché à tort chez l'utilisateur).
- [ ] Tester la HD en vrai (fluidité, taille des flammes) et la cinématique avec le son.
- [ ] Vérifier une vraie partie en ligne à plusieurs.

### Améliorations du jeu
- [ ] Mairie : le fronton à horloge est une supposition ; le dos et les côtés reprennent la face avant.
- [ ] Bâtiments HD : quelques toits ou rez-de-chaussée étranges possibles ; détection des jardins encore clairsemée. Retouche rue par rue possible sur demande.
- [ ] Commerces : les enseignes nationales ont un libellé générique ; mettre les vrais noms si on le souhaite.
- [ ] Intro : sous-titres et rythme à ajuster après un vrai visionnage ; éventuellement une version plus courte pour les relances.
- [ ] Nettoyage : un fichier temporaire de 5,6 Mo (`*.tmp`, la photo aérienne) traîne dans `C:\Users\SF\Downloads`.

### Idées pour plus tard
- Nouvelles armes et ramassages, missions ou parcours chronométrés, circulation civile, météo et cycle jour-nuit automatique, plus de quartiers de Nantes.
- Répertoire de textures et de sons propres à la ville (enseignes, tram, cloches).

## Licences et sources

- Rues, bâtiments, commerces : © contributeurs OpenStreetMap (ODbL).
- Hauteurs, relief : IGN, BD TOPO et RGE ALTI (Licence Ouverte 2.0). Photo aérienne : IGN BD ORTHO (Licence Ouverte Etalab 2.0).
- Façades : photos Panoramax, voir `DATA-LICENSES.md` ; les textures dérivées sont diffusées sous CC BY-SA 4.0.
- Personnages, gangs et histoire sont fictifs.
