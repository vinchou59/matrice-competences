## Why

Comme pour les équipes, l'administrateur doit pouvoir vider à la main la corbeille d'une équipe (personnes et compétences de test, par exemple) sans attendre 90 jours.

## What Changes

- Corbeille d'une équipe : « Supprimer définitivement » (avec un second clic de confirmation) en face de chaque personne et compétence, pour l'administrateur connecté dans ce navigateur. L'élément et toutes ses notes sont effacés.
- Les autres personnes ne voient que « Rétablir », avec la mention que la suppression définitive anticipée est réservée à l'administrateur.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `team-and-skills` : exigence « Corbeille d'une équipe ».

## Impact

- `site/js/matrix-core.js` (`purgeItemUpdate`, réutilisé par la purge à 90 jours), `site/js/ui.js`, tests. Aucune modification des règles Firebase : elles autorisent déjà l'administrateur.
