# Données et images

| Données | Source | Licence |
|---|---|---|
| Rues, emprises des bâtiments, parcs, arbres, tram, commerces (`data/map.osm` : extrait Overpass du 13 novembre 2026, 47,1950–47,2115 N, −1,5960 – −1,5670 E ; `data/world_raw.json`) | © contributeurs OpenStreetMap | ODbL 1.0 |
| Hauteurs des bâtiments (`data/bdtopo.json`) | IGN, BD TOPO® | Licence Ouverte 2.0 (Etalab) |
| Relief (grille d'altitude dans `data/world_raw.json`) | IGN, RGE ALTI® | Licence Ouverte 2.0 (Etalab) |
| Limites des parcelles (`data/cadastre.json`, clôtures cassables) | IGN, Parcellaire Express (PCI) | Licence Ouverte 2.0 (Etalab) |
| Photos des façades (`data/facades/`) | Panoramax : Carto'Cité, Koreller, ludovelo44 (CC BY-SA 4.0), immergis (Licence Ouverte) | Textures redressées diffusées sous CC BY-SA 4.0. Affichées seulement dans la version classique ; en HD et Ultra, seul l'espacement des fenêtres en est tiré (`data/facade_hints.json`) |

`gangstamen.html` embarque ces données : sa redistribution doit conserver les mentions ci-dessus (elles sont affichées dans le jeu).

## Modèles 3D achetés ou téléchargés (CGTrader)

Téléchargés par l'utilisateur avec son compte CGTrader (licence « Royalty Free »). Les fichiers d'origine ne sont **pas** dans le dépôt : seule une version allégée et transformée y figure (`data/models/*.json`, faite par `tools/assets/bake_model.js` : un seul maillage simplifié, couleurs par sommet, sans texture), intégrée au jeu.

| Modèle du jeu | Fichier d'origine | Emploi |
|---|---|---|
| `data/models/ferry.json` (6 849 triangles, 36 766 à l'origine) | « Ferry F-15 » de joao3DModels, licence « Royalty Free (no AI) », https://www.cgtrader.com/3d-models/watercraft/industrial-watercraft/ferry-f-15 (`ferry-boat-att.fbx` + `textures(1).rar`) | bac de Loire |
| `data/models/voilier.json` (4 497 triangles, 25 012 à l'origine) | « Sailing boat », https://www.cgtrader.com/3d-models/vehicle/other/sailing-boat-3f6498e9-d40f-4370-8dc8-aba96f1cd7cf (`sailing_boat_fbx.rar` + `Textures(2).rar`) | voiliers |
| `data/models/chalutier.json` (4 542 triangles, 85 737 à l'origine) | « Fish boat » (`FBX+FISH+BOAT.rar` et `TEXTURES+FISH+BOAT.rar`, téléchargés par l'auteur du jeu le 14 nov. 2026 ; site et licence à confirmer par lui avant toute diffusion) | Réduit et colorié par sommet avec `tools/assets/bake_model.js` ; deux chalutiers amarrés le long du quai de la Fosse |
| `data/models/escorteur.json` (8 927 triangles, 160 353 à l'origine ; couleurs refaites, sans les textures) | « Destroyer ship », https://www.cgtrader.com/3d-models/watercraft/military-watercraft/destroyer-ship (`fbx.rar`) | navire-musée Maillé-Brézé à quai (modèle générique de destroyer, pas une copie du vrai navire) |
| `data/models/grue_vieille.json`, `grue_peinte.json` (5 100 triangles chacune, 70 605 à l'origine) | « Shipping crane », https://www.cgtrader.com/3d-models/industrial/tool/shipping-crane (`Cranes.fbx` + `Textures(5).rar`, CraneOld / CraneNew ; auteur non relevé : la fiche ne s'ouvre pas depuis le bac à sable) | grues de quai, haut des deux grues Titan |
| `data/models/ponton.json` (2 200 triangles, 3 948 à l'origine) | « Dock 07 », https://www.cgtrader.com/3d-models/architectural/other/dock-07 (`Dock_071.rar` : Dock.FBX, dodif.jpg ; auteur non relevé) | pontons en bois près des rampes du bac |
| `data/people.json` (8 personnages de 1 500 à 2 000 triangles, 11 mouvements, 8 palettes de couleurs) | « City People Samples » de denysalmaral, gratuit, https://www.cgtrader.com/free-3d-models/character/other/low-poly-people-free-sample-pack (`CityPeopleFREE_v1.4.0.unitypackage`) | piétons animés |

Condition de la licence : le modèle peut être intégré à un produit tant que des tiers ne peuvent pas le récupérer tel quel, et il ne peut pas être redistribué. Aujourd'hui le dépôt et les artifacts sont privés. **À revoir avant toute diffusion publique du jeu ou du dépôt** (relire la licence de chaque fiche ; les noms des auteurs restent à relever sur les fiches).

## Photo aérienne

`data/ortho/` (x −440 à 2 400 m depuis le 15 nov. 2026, z −1 000 à 760 m du jeu) : BD ORTHO® de l'IGN (couche `ORTHOIMAGERY.ORTHOPHOTOS` de la Géoplateforme, data.geopf.fr), sous Licence Ouverte Etalab 2.0. Mention : © IGN. L'Ultra embarque une copie réduite à 1 024 px (`ortho_1024.jpg`), qui ne sert qu'à choisir les toits dessinés et les pelouses.

## Photographies des cartes postales (16 nov.)

Photos libres de Wikimedia Commons, réduites et recadrées pour le jeu (œuvres dérivées sous la même licence quand elle l'impose). Le crédit est aussi affiché sur chaque carte dans le jeu.

| Fichier | Source et auteur | Licence |
| --- | --- | --- |
| `data/postcards/stAnne.jpg` (carte postale « Église Sainte-Anne », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Nantes_(44)_Église_Sainte-Anne_-_Extérieur_-_04.jpg ; auteur : GO69 | CC BY-SA 4.0 |
| `data/postcards/escalier.jpg` (carte postale « Escalier Sainte-Anne », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Nantes_-_France_-_Escalier_Sainte-Anne_vu_du_quai_Marquis-d'Aiguillon.jpg ; auteur : Rehtse | CC BY-SA 4.0 |
| `data/postcards/julesVerne.jpg` (carte postale « Musée Jules Verne », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Mirdi_Jules_Verne_Naoned.JPG ; auteur : Gwendal | CC BY-SA 3.0 |
| `data/postcards/planetarium.jpg` (carte postale « Planétarium », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Façade_du_planétarium.jpg ; auteur : Danielaudeon | CC BY-SA 4.0 |
| `data/postcards/mairie.jpg` (carte postale « Mairie de Chantenay », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Nantes_(44)_Mairie_annexe_de_Chantenay.jpg ; auteur : GO69 | CC BY-SA 4.0 |
| `data/postcards/stMartin.jpg` (carte postale « Église Saint-Martin », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Église_Saint-Martin_-_02_-_Chantenay,_Nantes.jpg ; auteur : Koreller | CC BY-SA 4.0 |
| `data/postcards/misery.jpg` (carte postale « Carrière Misery », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Carrière_de_Miséry_-_Nantes_-_03.jpg ; auteur : François de Dijon | CC BY-SA 4.0 |
| `data/postcards/gare.jpg` (carte postale « Gare de Chantenay », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Gare-chantenay.JPG ; auteur : Patricia Ripnel | CC BY-SA 3.0 |
| `data/postcards/chapidock.jpg` (carte postale « Chapidock », vue aérienne recadrée 600 × 400, environ 108 × 72 m) | IGN, BD ORTHO® (extrait de `data/ortho/ortho_raw.jpg`, couche `ORTHOIMAGERY.ORTHOPHOTOS` de la Géoplateforme) | Licence Ouverte Etalab 2.0. Mention : © IGN. |
| `data/postcards/temple.jpg` (carte postale « Temple antoiniste », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Temple_antoiniste_Nantes.jpg ; auteur : Europe22 | CC BY-SA 4.0 |
| `data/postcards/maritime.jpg` (carte postale « Gare maritime », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Gare_Maritime,_Nantes_(7935918926).jpg ; auteur : Guilhem Vellut | CC BY 2.0 |
| `data/postcards/mailleBreze.jpg` (carte postale « Maillé-Brézé », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Escorteur_d'escadre_Maillé-Brézé.jpg ; auteur : François de Dijon | CC BY-SA 4.0 |
| `data/postcards/transbordeur.jpg` (carte postale « Pont transbordeur », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Nantes-pont-transbordeur-CP165LL.jpg ; auteur : carte postale ancienne (scan Bruno Corpet) | domaine public |
| `data/postcards/titan.jpg` (carte postale « Grue Titan jaune », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Grue_Titan_jaune_-_201008_(1).jpg ; auteur : Symac | CC BY-SA 3.0 |
| `data/postcards/nefs.jpg` (carte postale « Chantiers Dubigeon », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Anciens_chantiers_navals_Nantes.jpg ; auteur : Duch | CC BY-SA 4.0 |
| `data/postcards/hangarBananes.jpg` (carte postale « Hangar à bananes », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Hangar_bananes_1.JPG ; auteur : Jibi44 | CC BY-SA 3.0 |
| `data/postcards/grueGrise.jpg` (carte postale « Grue Titan grise », recadrée 600 × 400) | Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Grue_Titan_grise_-_panoramio.jpg ; auteur : franek2 | CC BY-SA 3.0 |
