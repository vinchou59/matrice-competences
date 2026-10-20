## Why

Saisir une à une les personnes et les compétences d'une équipe est fastidieux, surtout pour plusieurs équipes. Les équipes ont l'habitude d'Excel : préparer les listes dans un fichier puis le charger évite la saisie, sans renoncer à faire l'auto-évaluation dans l'appli.

## What Changes

- **Télécharger le modèle** : un fichier `.xlsx` à remplir, avec le nom de l'équipe, les compétences et leurs cibles (référent, back-up), et les personnes. Pas de notes : elles se saisissent dans l'appli. Depuis une équipe, le modèle est pré-rempli avec ses listes actuelles.
- **Charger un fichier rempli** :
  - depuis l'accueil, il **crée une nouvelle équipe** ;
  - depuis une équipe, il **ajoute uniquement** les personnes et compétences absentes (même nom sans tenir compte de la casse = déjà présente, ignorée). Rien n'est modifié ni supprimé.
- **Aperçu avant enregistrement** : ce qui sera ajouté, ce qui est ignoré (et pourquoi) et les erreurs ligne par ligne. Rien n'est écrit tant que l'aperçu n'est pas validé, et rien n'est écrit si le fichier contient une erreur bloquante.
- Lecture et écriture des `.xlsx` par un petit module maison, sans bibliothèque ni service tiers.

## Capabilities

### New Capabilities

- `excel-template` : modèle téléchargeable, import avec aperçu, création d'équipe ou ajout à une équipe.

### Modified Capabilities

_Aucune._

## Impact

- Nouveaux `site/js/xlsx-lite.js` (lecture et écriture `.xlsx`) et `site/js/template-core.js` (contenu du modèle, analyse du fichier, plan d'import), tests ; `site/js/ui.js`, `site/js/home.js`, `site/app.css` ; `matrix-store.js` (ajouts groupés en une écriture). Aucune modification des règles Firebase.
- Dépend du changement `gerer-plusieurs-equipes` (création d'équipe, accueil, corbeille).
