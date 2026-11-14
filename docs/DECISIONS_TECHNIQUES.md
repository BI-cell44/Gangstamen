# Décisions techniques

Chaque décision : contexte, choix, conséquences. Statut : **en vigueur**, **proposée** (attend l'accord de l'utilisateur) ou **remplacée**.

## D-01 Un fichier HTML autonome par version (en vigueur)
Le jeu doit tourner comme artifact claude.ai, sans serveur. D'où : pas de bundler ni de module ES, données incorporées (base64), three.js depuis cdnjs, tout l'audio généré par WebAudio. Limite des artifacts : 16 Mo par page (HD actuelle : 5,3 Mo). Les artifacts ne peuvent ni télécharger de fichier, ni joindre d'autres sites, ni utiliser `alert` : la sauvegarde passe par `localStorage` et l'export par un code à copier.

## D-02 Un seul code source pour toutes les versions (en vigueur)
Drapeau `HD` (et `ULTRA` sur la branche `ultra`) plutôt que des copies : les corrections de conduite, de collision ou de réseau profitent à tous. Contrepartie : tout code HD reste derrière `if (HD)` ou dans `gx` ; tester les sorties concernées après un changement commun.

## D-03 three.js r128, sans mise à jour pour l'instant (en vigueur)
Les versions récentes (r150 et après) changent la gestion des couleurs (`outputEncoding` → `outputColorSpace`), l'intensité des lumières (unités physiques) et retirent `Geometry` et certains utilitaires : tout le rendu HD (conversion sRGB → linéaire, post-traitement maison, PMREM) serait à revoir. Gain attendu faible pour ce jeu tant qu'on ne vise pas WebGPU. À réexaminer si une fonctionnalité l'exige (par exemple le lot de rendu par instance moderne `BatchedMesh`).

## D-04 Physique maison, pas de moteur physique tiers (en vigueur)
Rapier, cannon-es ou Ammo apporteraient corps rigides et contraintes, mais au prix de plusieurs centaines de Ko, d'un pas fixe difficile à marier au réseau sans latence (chaque client simule sa voiture) et d'un comportement moins contrôlable pour un jeu arcade. La physique v2 (cycle 4) reste maison : modèle bicyclette avec pneus, données par véhicule.

## D-05 Jeu en ligne sans attente de l'hôte (en vigueur)
Chaque client décide de sa conduite et de ses tirs ; le tireur prévient la victime, qui applique les dégâts ; l'hôte ne simule que les bots. Choix de l'utilisateur pour éviter la latence. Même interface pour deux transports (`room` claude.ai, WebSocket du serveur). Tout nouveau sujet réseau doit être déclaré `interact` dans la capacité `room` de chaque artifact.

## D-06 Couleurs sRGB converties une fois en linéaire en HD (en vigueur)
Évite les couleurs lavées ou trop sombres. Ne jamais convertir deux fois (`userData.hdLinear` marque ce qui l'est déjà).

## D-07 Façades redessinées, photos en référence seulement (en vigueur)
Les photos Panoramax donnent la couleur et le rythme des fenêtres ; la HD redessine les bâtiments (arbres devant, ciel, doubles images rendent les photos inutilisables plaquées). Street View exclu (conditions d'utilisation).

## D-08 Photo aérienne IGN comme masque et couleur de toit (en vigueur)
Pas plaquée au sol (toits et arbres débordent sur les trottoirs). Réduite à 0,6 m par pixel pour tenir dans 3 800 px (limite de texture WebGL courante : 4 096).

## D-09 Origine fixe de la carte et zone asymétrique (en vigueur, 14 nov. 2026)
L'origine reste 47,2025° N, −1,590005° E : toutes les positions écrites en mètres de jeu (missions, garages, lieux) restent valables quand la carte grandit. La zone jouable a un centre (`CX`, `CZ`) et des demi-tailles (`HX`, `HZ`) dans `W.meta`.

## D-10 Données téléchargées par le navigateur de l'utilisateur (en vigueur)
Le bac à sable n'atteint ni OSM, ni Overpass, ni l'IGN. Les requêtes (`tools/fetch_data_browser.js`) tournent dans le navigateur intégré de l'application Claude ; les fichiers arrivent en `*.tmp` dans Téléchargements, puis sont copiés dans `data/`. Les données sont commitées ; les scripts de `src/` les transforment.

## D-11 Pas de streaming du monde tant que la carte fait 2 km (en vigueur)
À cette taille, tout tient en mémoire (≈ 200 Mo de tas JavaScript). Le vrai problème mesuré est le **rendu** de toute la ville à chaque image (bâtiments fusionnés sur toute la carte, donc jamais écartés hors champ). On commence par le **rendu par tuiles** (cycle 2) : écartement hors champ et niveaux de détail par tuile. Le chargement et déchargement de tuiles (streaming) viendra en phase 4, si la carte grandit, sur cette même grille de tuiles.

## D-12 Découpage des sources en modules (proposée : accord de l'utilisateur requis)
**Contexte** : `template.html` (3 450 lignes), `hd.js` et `gx.js` forment une seule portée ; les dépendances entre systèmes sont implicites, ce qui ralentit chaque évolution et rend les régressions plus probables.
**Proposition** : garder un seul fichier HTML en sortie, sans bundler (D-01), mais découper les sources en fichiers par système, assemblés dans l'ordre par `build.sh` (même portée qu'aujourd'hui) :
`core/` (rendu, textures, aléatoire, collision), `world/` (ville, bords, tram, lieux), `vehicles/` (modèles, physique, dégâts), `audio/`, `input/`, `net/`, `ui/` (HUD, menus, intro), `game/` (équipes, modes, combat, IA, campagne), `hd/` (rendu HD).
**Garantie** : la première étape est purement mécanique et vérifiable : le HTML produit doit être **identique à l'octet** à celui d'avant le découpage. Ensuite seulement, chaque système expose ses dépendances en tête de fichier.
**Bénéfice** : évolutions plus rapides et plus sûres pour toutes les phases suivantes. **Risque** : faible (contrôlé par la comparaison à l'octet), mais tous les numéros de ligne des documents changent.
**Alternative écartée** : modules ES avec bundler (Vite, esbuild) : contraire à D-01 pour un gain modeste ici.

## D-13 Une branche et un artifact pour les évolutions Ultra (en vigueur, 14 nov. 2026)
Branche `ultra` (partie de `main`), sortie supplémentaire `gangstamen-ultra.html` (la HD avec `const ULTRA = true` et le titre « Gangstamen Ultra »), artifact séparé « Gangstamen Ultra ». `main` reste la version stable jouable ; un cycle Ultra validé peut y être fusionné. Les corrections de `main` sont fusionnées dans `ultra` régulièrement (jamais l'inverse sans validation).
