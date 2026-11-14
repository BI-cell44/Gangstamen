# Gangstamen

Combat de voitures façon fin des années 90, dans les **vraies rues de Chantenay** (Nantes) : rues OpenStreetMap, hauteurs et relief de l'IGN, façades photographiées (Panoramax) sur le boulevard de la Liberté et la rue de la Marseillaise.

**La carte** (2 km sur 1,5 km) va du boulevard de la Liberté jusqu'à la butte Sainte-Anne (église et escalier modélisés, statue de sainte Anne) et au début du quai de la Fosse. Au nord, la ligne 1 du tram ferme la carte : deux rames circulent et s'arrêtent aux vraies stations (Égalité, Du Chaffault, Gare Maritime) ; on peut rouler sur la voie sud, mais le tram ne s'arrête pas pour vous. Ailleurs, des barrières de chantier ferment les rues qui sortent de la carte.

Un seul fichier, `gangstamen.html`, qui tourne dans tout navigateur récent avec WebGL (three.js est chargé depuis cdnjs).


## Deux versions

Le même code source produit deux fichiers :

- **`gangstamen.html`** : la version classique, au rendu rétro (pixels, modèles simples), légère.
- **`gangstamen-hd.html`** : la version HD. Rendu HDR avec bloom et tone mapping filmique, anti-crénelage, ciel procédural avec nuages et reflets sur les carrosseries, ombres douces, voitures aux formes lissées avec peinture vernie, phares et feux lumineux, fumée de pneus et d'échappement, traces de freinage, flammes et fumée selon les dégâts, explosions avec débris, onde de choc et marque au sol, lampadaires au sodium la nuit (touche N). Le réglage *Qualité graphique* (Basse à Ultra) est dans *Son et options* ; la qualité baisse d'un cran toute seule si la machine ne suit pas durablement pendant le jeu (jamais pendant le chargement), sauf si la case *Qualité automatique* est décochée.

En HD, les façades sans photo exploitable sont dessinées en haute résolution (volets, balcons, appuis de fenêtre, relief, vitres qui reflètent le ciel) et le sol est refait (dallage, herbe, bitume avec relief).

**Bâtiments HD** : la version HD n'affiche plus les photos de façades. Chaque bâtiment est dessiné dans un style de jeu, avec la couleur de mur relevée dans les photos : rez-de-chaussée à part (portes, garages, halls d'immeuble, commerces avec enseigne), étages entiers alignés sur la rue, toits à pans ou à brisis avec cheminées.

**Commerces réels (HD)** : `src/make_street_data.py` extrait d'OpenStreetMap les commerces du quartier (boulangeries, tabac-presse, pharmacie, cafés, restaurants, banques, coiffeurs… 59 dans la zone) avec leur nom et leur position (`data/shops.json`). Chacun est posé sur le mur le plus proche, avec une devanture et une enseigne à son nom ; les enseignes nationales reçoivent un libellé générique (« BANQUE », « ALIMENTATION »). Il n'y a plus de commerces inventés.

**Façades adaptées à chaque bâtiment (HD)** : chaque pan de mur montre un nombre entier de travées de fenêtres, à la largeur propre au bâtiment (mesurée dans les photos Panoramax quand une façade large et dégagée le permet : `data/facade_hints.json`, 27 bâtiments ; tirée au sort dans une plage réaliste sinon). Chaque style existe en plusieurs variantes (volets d'une couleur par maison, portes-fenêtres, maisons sans volets, immeubles à balcons ou à allèges colorées). Les portes et les garages ne sont dessinés que côté rue.

**Mairie de Chantenay (HD)** : la mairie de 1903 a son propre modèle (`townHall` dans `src/hd/town-hall.js`), d'après ses photos Panoramax : pierre blanche en assises, hautes fenêtres à balustres à l'étage, porche à quatre colonnes sous un balcon, fronton à horloge éclairée la nuit, toit d'ardoise à lucarnes, grandes cheminées, drapeau. Les ailes accolées sont en bardage métallique bleu.

**Photo aérienne (HD)** : `data/ortho/ortho_raw.jpg` est la BD ORTHO de l'IGN (25 cm par pixel, service WMS de la Géoplateforme) ; `src/make_ortho.py` en tire `data/ortho/ortho.jpg`. Elle donne aux toits leurs vraies couleurs (ardoise, tuile, toits plats) et indique où sont les jardins. Elle n'est pas plaquée telle quelle au sol, car les toits et les arbres y débordent sur les trottoirs.

**Façades photo** : `src/curate_facades.py` trie les morceaux de photos Panoramax de `data/facades` et ne garde que ceux qui sont nets et vus de face (environ 300 sur 1 077). Les autres (arbre devant, ciel, images dédoublées) sont remplacés par une façade dessinée, teintée avec la couleur du mur mesurée dans la photo. Le résultat est dans `data/facades_curated`, utilisé par le build.

**Arbres et lampadaires** : ils sont repoussés hors de la chaussée (les largeurs de rue sont estimées, donc certains arbres d'OpenStreetMap tombaient sur la route).

### Nouveautés de la version HD

**Ambiance années 90**
- **Moment de la journée** (touche N ou *Son et options*) : plein jour, coucher de soleil, nuit, ou *Cycle* (une journée de 12 minutes avec heure bleue et aube). Les lampadaires, les fenêtres, l'horloge de Saint-Martin et les feux de la grue Titan s'allument avec la nuit.
- **Météo** (touche B) : sec, pluie, orage, ou variable. Gouttes autour de la caméra, routes qui s'assombrissent et brillent, flaques, reflets étirés des lampadaires, gerbes d'eau derrière les roues, éclairs et tonnerre, bruit de pluie.
- **Circulation civile** : R5, 205 et Twingo qui roulent à droite, s'arrêtent derrière les autres et klaxonnent ; des piétons animés sur les trottoirs (marche, pauses, fuite) qui s'écartent ou se font renverser et se relèvent, et des clients aux terrasses des cafés et restaurants du quartier, qui se lèvent quand une voiture monte sur le trottoir.
- **Police** : abîmer les voitures des gens, renverser des piétons ou s'en prendre aux policiers fait monter le niveau de recherche (étoiles bleues). Les patrouilles prennent en chasse, sirène deux tons, gyrophares ; à 3 étoiles elles tirent. On les sème en restant hors de vue, ou en passant au garage pour une peinture neuve.
- **Radio de bord** (touche M) : quatre stations en musique procédurale libre de droits (G-funk, rap français, techno, funk) et un animateur, en synthèse vocale, qui annonce les stations et commente les KO. Les voix se coupent dans *Son et options*.

**Solo**
- **Campagne** de 7 missions avec dialogues entre les missions (Dédé le garagiste, Nadia, le Grand Duc, le Vautour, l'animateur de Chantenay FM) : retour au quartier, tenir la place Jean-Macé, escorter la 205 de Nadia jusqu'à la gare de Chantenay, poursuivre le Vautour depuis l'église Saint-Martin jusqu'au quai, semer la police, une nuit d'orage sur la Loire, l'assaut final sur la Butte. Progression et respect gagné sont gardés dans le navigateur. Le solo libre (bac à sable) reste disponible.
- **Garage de Chantenay** (celui de Dédé, à l'emplacement du vrai garage Tribot), sur le boulevard près de la place Jean-Macé : on s'arrête sur le cercle bleu pour réparer, recharger les armes, gonfler le moteur, blinder la caisse, améliorer les mitrailleuses ou la repeindre. Ça se paie en respect. Les autres vrais garages de la carte (Garage Auto 98 sur le boulevard de la Liberté, l'atelier près de la station Égalité) offrent les mêmes services.
- **Campagne** : mourir pendant une mission la fait reprendre depuis le début (respect et munitions comme au départ).
- **Bonus** posés sur la carte, qui réapparaissent : clé à molette (nouveau modèle, réparation), nitro, mines (lancées sur l'ennemi qui est devant, sinon posées derrière), lance-roquettes au tir lent, bouclier. Touche *arme spéciale* : E (clavier 1), Suppr (clavier 2), 7 (clavier 3), Entrée du pavé (clavier 4), B à la manette, SPÉ en tactile. Touche *changer d'arme* (quand on en a plusieurs) : A (Q en QWERTY, clavier 1), Origine ou . (clavier 2), Y (clavier 3), pavé 9 (clavier 4), RB à la manette, ou un appui sur le compteur d'armes.
- **Conduite** : dérapage au frein à main qui se prolonge si on garde les gaz, sauts sur les bosses et les rampes des ponts (réception brutale = dégâts), dégâts visibles (tôle froissée, capot qui se soulève, pneu crevé qui fait pencher la voiture, fumée puis flammes).

**Multijoueur**
- Nouveaux modes en **écran partagé** : *Capture du drapeau* entre la Butte et le boulevard, *Roi de la colline* sur la place Jean-Macé, *Course de checkpoints* à travers Chantenay.
- **Choix de la voiture et des couleurs** (*Ta voiture*) pour chaque joueur, avec une vitrine sur le boulevard. La voiture et la couleur sont aussi transmises en ligne.
- **Discussion rapide** : six messages tout prêts avec les touches 1 à 6 ou la croix directionnelle (haut, bas) et les clics de sticks.

**Décor**
- **Mobilier urbain cassable** : abribus, poubelles et bancs aux positions OpenStreetMap (`src/make_furniture.py` → `data/furniture.json`), plus des bancs et poubelles le long des grands axes. Remis en place un peu plus tard.
- **Lieux modélisés à la main** : le clocher et la flèche de l'église Saint-Martin sur la place du Bourg, les quais de Loire (mur de pierre suivant la berge, bittes d'amarrage, une péniche), la falaise de la carrière Misery à l'est, la grue Titan jaune au loin vers l'île de Nantes (rapprochée pour être visible depuis le quartier).

**Technique**
- *Son et options* : ombres (non, auto, toujours), distance de vue, densité de circulation. La distance de vue baisse d'elle-même à 3 ou 4 écrans.
- **Mobile** : joystick virtuel (direction, gaz, frein) et boutons tir, frein à main et arme spéciale.

Le code de ces nouveautés est dans `src/gx/` (assemblé et inséré par `build.sh`, comme `src/hd/`), l'ambiance et les dégâts visibles dans `src/hd/`. La version classique n'est pas modifiée, à part le dérapage au frein à main.

Les règles, les commandes et le jeu en ligne sont identiques. Le moteur HD est dans `src/hd/` ; il est activé par `const HD = true`, que `build.sh` positionne pour le second fichier.

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

**Cinématique d'intro** : au lancement, après un clic ou une touche, une séquence d'environ 35 secondes tournée dans le moteur du jeu présente le quartier et les deux bandes, calée sur les mesures de la musique. Échap, Entrée, Espace, un clic ou un bouton de manette la passent. Elle se désactive ou se revoit dans *Son et options*.

## Commandes

| | Gaz / frein | Tourner | Tir | Arme spéciale (HD) | Changer d'arme (HD) | Frein à main | Caméra | Remise en route |
|---|---|---|---|---|---|---|---|---|
| Clavier 1 | Z / S (W / S en QWERTY) | Q / D | Espace | E | A (Q en QWERTY) | Maj gauche | C | R |
| Clavier 2 | ↑ / ↓ | ← / → | Ctrl droit ou Entrée | Suppr ou ! (/ en QWERTY) | Origine ou : (. en QWERTY) | Maj droite | Fin | Page suiv. |
| Clavier 3 | I / K | J / L | U | 7 | Y | O | 9 | 8 |
| Clavier 4 | Pavé 8 / 5 | Pavé 4 / 6 | Pavé 0 | Entrée du pavé | Pavé 9 | Pavé . | Pavé + | Pavé − |
| Manette | RT / LT | stick gauche ou croix | A (et RB en classique) | B | RB | X | Y | LB |

Touches communes : F3 mesures de performance (images par seconde, appels de dessin) · N jour/nuit (HD : moment de la journée) · B météo (HD) · M musique (HD : station suivante) · P pixels rétro · Tab classement · 1 à 6 discussion rapide · Échap (ou Start) pause.
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
