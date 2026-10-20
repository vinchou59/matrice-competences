## Why

Les équipes doivent être créées par l'administrateur seulement : n'importe qui ne doit pas pouvoir en créer depuis l'accueil.

## What Changes

- L'accueil ne propose plus « Créer une équipe » ; il indique de s'adresser à l'administrateur.
- La création reste possible dans l'administration.
- Les règles Firebase refusent la création d'une équipe à quiconque n'est pas administrateur. Renommer, mettre à la corbeille et rétablir une équipe existante restent ouverts à tous.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `teams` : accueil sans création ; création réservée à l'administrateur.
- `site-publication` : règle de création des équipes.

## Impact

- `site/js/home.js`, `database.rules.json` (à republier dans la console et à reporter dans `poker-planning`), README.
