## Why

L'ordre des compétences et des personnes est celui de leur ajout : impossible de regrouper les compétences d'un même domaine ou de ranger les colonnes. Par ailleurs, après l'ajout d'une compétence avec Entrée, le tableau ne se mettait à jour qu'au clic suivant.

## What Changes

- Réorganisation par glisser-déposer : les lignes (compétences) par une poignée à gauche du nom, les colonnes (personnes) par une poignée au-dessus du nom. À la souris comme au doigt ; au clavier, flèches sur la poignée. L'ordre est enregistré pour toute l'équipe.
- Correctif : le tableau se met à jour aussitôt après un ajout avec Entrée ; plus généralement, une mise à jour en temps réel ne bloque plus l'affichage pendant une saisie, et conserve le champ actif, sa saisie et la position du curseur.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `team-and-skills` : nouvelle exigence « Réorganisation des lignes et des colonnes » ; ajout d'une compétence affiché aussitôt.

## Impact

- `site/js/matrix-core.js` (`moveTo`, `reorderUpdate`), `site/js/ui.js`, `site/js/shared.js` (icône), `site/app.css`, tests. Aucune modification des règles Firebase (le champ `order` est déjà validé).
