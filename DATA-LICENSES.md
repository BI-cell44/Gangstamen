# Données et images

| Données | Source | Licence |
|---|---|---|
| Rues, emprises des bâtiments, parcs, arbres, tram, commerces (`data/map.osm` : extrait Overpass du 13 novembre 2026, 47,1950–47,2115 N, −1,5960 – −1,5670 E ; `data/world_raw.json`) | © contributeurs OpenStreetMap | ODbL 1.0 |
| Hauteurs des bâtiments (`data/bdtopo.json`) | IGN, BD TOPO® | Licence Ouverte 2.0 (Etalab) |
| Relief (grille d'altitude dans `data/world_raw.json`) | IGN, RGE ALTI® | Licence Ouverte 2.0 (Etalab) |
| Limites des parcelles (`data/cadastre.json`, clôtures cassables) | IGN, Parcellaire Express (PCI) | Licence Ouverte 2.0 (Etalab) |
| Photos des façades (`data/facades/`) | Panoramax : Carto'Cité, Koreller, ludovelo44 (CC BY-SA 4.0), immergis (Licence Ouverte) | Textures redressées diffusées sous CC BY-SA 4.0 |

`gangstamen.html` embarque ces données : sa redistribution doit conserver les mentions ci-dessus (elles sont affichées dans le jeu).

## Modèles 3D achetés ou téléchargés (CGTrader)

Téléchargés par l'utilisateur avec son compte CGTrader (licence « Royalty Free »). Les fichiers d'origine ne sont **pas** dans le dépôt : seule une version allégée et transformée y figure (`data/models/*.json`, faite par `tools/assets/bake_model.js` : un seul maillage simplifié, couleurs par sommet, sans texture), intégrée au jeu.

| Modèle du jeu | Fichier d'origine | Emploi |
|---|---|---|
| `data/models/ferry.json` (6 849 triangles, 36 766 à l'origine) | `ferry-boat-att.fbx` + `textures(1).rar` | bac de Loire |
| `data/models/voilier.json` (4 497 triangles, 25 012 à l'origine) | `sailing_boat_fbx.rar` + `Textures(2).rar` | voiliers |

Condition de la licence : le modèle peut être intégré à un produit tant que des tiers ne peuvent pas le récupérer tel quel, et il ne peut pas être redistribué. Aujourd'hui le dépôt et les artifacts sont privés. **À revoir avant toute diffusion publique du jeu ou du dépôt** (relire la licence de chaque fiche ; noter ici l'adresse des fiches et le nom des auteurs, à demander à l'utilisateur).

## Photo aérienne

`data/ortho/` (x −440 à 1 840 m, z −1 000 à 760 m du jeu) : BD ORTHO® de l'IGN (couche `ORTHOIMAGERY.ORTHOPHOTOS` de la Géoplateforme, data.geopf.fr), sous Licence Ouverte Etalab 2.0. Mention : © IGN.
