# Outils de test

Scripts Playwright (Chromium sans tête, rendu logiciel) écrits pendant le développement. Ils ne remplacent pas un essai à la main sur une vraie carte graphique.

## Mise en place

```sh
npm i playwright three@0.128.0        # three r128 : cdnjs est bloqué dans le bac à sable, on le sert depuis le paquet npm
cp node_modules/three/build/three.min.js .
```

Chromium doit être lancé avec `--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist --enable-unsafe-swiftshader` ; **en HD, ajouter `--disable-accelerated-2d-canvas`**, sinon le chargement (environ 40 s) ne finit jamais.

## Modèle de départ : `tests/test_intro.js`

```sh
node tests/test_intro.js three.min.js ../gangstamen-hd.html sortie/hd "1.5,4,7"
```

Arguments : three.min.js, le HTML à tester, préfixe des captures, instants de l'intro à capturer. C'est le meilleur point de départ pour un nouveau test : il intercepte cdnjs et Google Fonts (`page.route`), charge le HTML avec `setContent`, attend que `#start` soit actif, puis pilote le jeu par `window.__gm`.

Les autres scripts testent chacun une fonction (équipes, fin de partie, tirs aux canons, minicarte, jeu en ligne à plusieurs pages). Certains ont des chemins en dur vers l'ancien bac à sable (`scratchpad/…`) : les adapter avant de les lancer. Ils datent d'avant la branche `hd-ambiance-campagne` : ils couvrent le jeu de base, pas la campagne ni les modes HD.

## Crochets de test dans le jeu

`window.__gm` (état et actions), `window.__noIntro`, `window.__introT`, `window.__trHold`, `window.__cam`, `window.__camAt`. Détail dans `LEDGER.md`, section « Comment reprendre ».

## Tests du 14 novembre 2026 (`tests/nov14_*.js`)

`nov14_h.js` est un petit harnais commun (Chrome du système via `executablePath: '/usr/bin/google-chrome'`, car le téléchargement du Chromium de Playwright est bloqué ; `three.min.js` à côté du script ; saute l'intro). Usage : `node tests/nov14_gar.js ../gangstamen-hd.html`.
- `nov14_miss.js` : réplique de la police (vraie voiture), message de KO (police, accident, Rapaces), mission reprise de zéro après la mort.
- `nov14_gar.js` : garages réels, mur du tram, bord ouest, choc du tram.
- `nov14_terr2.js` : client de terrasse renversé puis retour à la chaise.
- `nov14_sw.js` : changement d'arme spéciale (clavier et clic sur le compteur).
- `nov14_allm.js` : lance les 7 missions sur la nouvelle carte.
- `nov14_shot2.js` : captures avec caméra libre `[x, y, z, visée x, y, z]` (y absolu : viser au-dessus du relief, la butte monte à 40 m).

`fetch_data_browser.js` : les requêtes qui ont téléchargé les données de la carte agrandie (à lancer dans la console d'un navigateur).
