## Why

Une demande de confirmation de suppression (« Mettre à la corbeille ? », « Supprimer l'équipe ? ») restait affichée 4 secondes même quand on passait à autre chose.

## What Changes

- Un clic ailleurs sur la page, ou la touche Échap, remet aussitôt le bouton dans son état initial. Le délai de 4 secondes reste en filet de sécurité.
- Le clic ailleurs garde son effet (ouvrir un onglet, armer une autre suppression…).

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `team-and-skills` : annulation de la confirmation de suppression.

## Impact

- `site/js/shared.js` (confirmation en deux clics, commune à la page d'une équipe et à l'administration).
