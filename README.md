# Gangstamen

Combat de voitures façon fin des années 90, dans les **vraies rues de Chantenay** (Nantes) : rues OpenStreetMap, hauteurs et relief de l'IGN, façades photographiées (Panoramax) sur le boulevard de la Liberté et la rue de la Marseillaise.

Un seul fichier, `gangstamen.html`, qui tourne dans tout navigateur récent avec WebGL (three.js est chargé depuis cdnjs).


## Deux versions

Le même code source produit deux fichiers :

- **`gangstamen.html`** : la version classique, au rendu rétro (pixels, modèles simples), légère.
- **`gangstamen-hd.html`** : la version HD. Rendu HDR avec bloom et tone mapping filmique, anti-crénelage, ciel procédural avec nuages et reflets sur les carrosseries, ombres douces, voitures aux formes lissées avec peinture vernie, phares et feux lumineux, fumée de pneus et d'échappement, traces de freinage, flammes et fumée selon les dégâts, explosions avec débris, onde de choc et marque au sol, lampadaires au sodium la nuit (touche N). Le réglage *Qualité graphique* (Basse à Ultra) est dans *Son et options* ; la qualité baisse d'un cran toute seule si la machine ne suit pas.

En HD, les façades sans photo exploitable sont dessinées en haute résolution (volets, balcons, appuis de fenêtre, relief, vitres qui reflètent le ciel) et le sol est refait (dallage, herbe, bitume avec relief).

**Bâtiments HD** : la version HD n'affiche plus les photos de façades. Chaque bâtiment est dessiné dans un style de jeu, avec la couleur de mur relevée dans les photos : rez-de-chaussée à part (portes, garages, halls d'immeuble, commerces avec enseigne), étages entiers alignés sur la rue, toits à pans ou à brisis avec cheminées.

**Photo aérienne (HD)** : `data/ortho/ortho_raw.jpg` est la BD ORTHO de l'IGN (25 cm par pixel, service WMS de la Géoplateforme) ; `src/make_ortho.py` en tire `data/ortho/ortho.jpg`. Elle donne aux toits leurs vraies couleurs (ardoise, tuile, toits plats) et indique où sont les jardins. Elle n'est pas plaquée telle quelle au sol, car les toits et les arbres y débordent sur les trottoirs.

**Façades photo** : `src/curate_facades.py` trie les morceaux de photos Panoramax de `data/facades` et ne garde que ceux qui sont nets et vus de face (environ 300 sur 1 077). Les autres (arbre devant, ciel, images dédoublées) sont remplacés par une façade dessinée, teintée avec la couleur du mur mesurée dans la photo. Le résultat est dans `data/facades_curated`, utilisé par le build.

**Arbres et lampadaires** : ils sont repoussés hors de la chaussée (les largeurs de rue sont estimées, donc certains arbres d'OpenStreetMap tombaient sur la route).

Les règles, les commandes et le jeu en ligne sont identiques. Le moteur HD est dans `src/hd.js` ; il est activé par `const HD = true`, que `build.sh` positionne pour le second fichier.

## Branches

- **`main`** : la version publiée comme artifact sur claude.ai. Le jeu en ligne passe par la capacité `room` de claude.ai (aucun serveur à héberger).
- **`server`** : la même version + un petit serveur Node.js (`server/`, aucune dépendance) qui sert le jeu et relaie le jeu en ligne par WebSocket, pour l'héberger soi-même.

## Modes de jeu

- **Solo** contre les six Rapaces.
- **Écran partagé** de 2 à 4 joueurs sur un même PC, chacun au clavier ou à la manette (menu *Écran partagé* puis ◀ ▶ pour choisir les commandes de chaque joueur). Les joueurs se tirent aussi dessus.
- **En ligne** jusqu'à 12 joueurs : *Créer une partie* (code de 4 lettres) ou rejoindre une partie de la liste.

En écran partagé et en ligne, on choisit entre deux règles :

- **Chacun pour soi** : tout le monde tire sur tout le monde, et les six voitures du quartier sont des Rapaces hostiles à tous.
- **Par équipes** : *Rapaces de la Butte* contre *Chantenaysiens*. Il n'y a pas de tir ami et les chocs entre coéquipiers ne font pas de dégâts. Chaque bande a trois voitures du quartier avec elle et sa base de départ : les Rapaces en haut de la butte, les Chantenaysiens sur le boulevard de la Liberté. Le score d'une équipe est le total des KO de ses joueurs (barre en haut de l'écran, détail avec Tab). En ligne, le créateur choisit la règle ; chaque joueur choisit sa bande, ou *Auto* pour rejoindre la moins nombreuse.

**Fin de partie** : on règle un nombre de KO à atteindre (10, 20, 30 ou sans) et une durée (5, 10, 15 min ou sans). La partie s'arrête au premier des deux seuils atteint. Un écran de résultats affiche le vainqueur et le classement, avec un bouton *Revanche* qui remet les scores à zéro et tout le monde au départ. En ligne, ces réglages sont ceux du créateur, et seul l'hôte déclare la fin et lance la revanche, pour que tout le monde voie le même résultat. En solo, le réglage se trouve dans *Son et options*.

## Commandes

| | Gaz / frein | Tourner | Tir | Frein à main | Caméra | Remise en route |
|---|---|---|---|---|---|---|
| Clavier 1 | Z / S (W / S en QWERTY) | Q / D | Espace | Maj gauche | C | R |
| Clavier 2 | ↑ / ↓ | ← / → | Ctrl droit ou Entrée | Maj droite | Fin | Page suiv. |
| Clavier 3 | I / K | J / L | U | O | 9 | 8 |
| Clavier 4 | Pavé 8 / 5 | Pavé 4 / 6 | Pavé 0 | Pavé . | Pavé + | Pavé − |
| Manette | RT / LT | stick gauche ou croix | A ou RB | X | Y | LB |

Touches communes : N jour/nuit · M musique · P pixels rétro · Tab classement · Échap (ou Start) pause.
Les manettes vibrent aux chocs, aux tirs reçus et aux explosions (désactivable dans *Son et options*, où se règlent aussi les volumes musique et effets séparément).

## Jeu en ligne : comment ça marche

- Chaque joueur **conduit et tire sur sa propre machine, sans attendre l'hôte** : aucune latence sur les commandes. Sa position, sa vitesse et ses tirs sont diffusés ~30 fois par seconde (présence).
- Les voitures des autres sont lissées et extrapolées avec leur vitesse.
- Les dégâts voyagent par petits événements : le tireur prévient la victime (`hit`), qui applique les dégâts et annonce sa destruction (`ko`) pour créditer le tireur.
- **L'hôte** (le créateur de la partie, puis le plus ancien joueur s'il part) fait rouler les Rapaces et diffuse leur état ; les autres joueurs lui signalent leurs tirs sur les Rapaces (`hb`).

Sur claude.ai, les autres joueurs doivent être connectés et avoir accès à l'artifact **avec le droit de participer** (Contributeur ou plus) pour que leurs tirs comptent.

## Reconstruire `gangstamen.html`

```sh
./build.sh
```

Le dossier `src/` contient la page (`template.html`) et les scripts de préparation des données (`convert.py` OSM → monde, `carve.py` profils de routes et ponts, `plan_facades.py` choix des photos Panoramax, `build_photos.py` assemblage). Données : voir `DATA-LICENSES.md`.
