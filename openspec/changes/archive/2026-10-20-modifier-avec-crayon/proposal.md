## Why

Un nom de compétence modifiable d'un simple clic se modifie trop facilement par erreur. La modification doit être un geste volontaire.

## What Changes

- Les noms de compétence (tableau), de personne (onglet Équipe) et d'équipe (en-tête) s'affichent en texte, avec un bouton crayon « Modifier ».
- Le crayon ouvre un champ avec « Enregistrer » (✓) et « Annuler » (✕) ; Entrée enregistre, Échap annule. Un nom refusé (vide, trop long, déjà pris) laisse le champ ouvert avec le message.
- Pendant la modification, le bouton de suppression de la ligne est masqué, pour ne pas le confondre avec « Annuler ».

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `team-and-skills` : renommage d'une personne et d'une compétence.
- `teams` : renommage d'une équipe.

## Impact

- `site/js/ui.js`, `site/js/shared.js` (icônes), `site/app.css`. Aucune modification des règles Firebase.
