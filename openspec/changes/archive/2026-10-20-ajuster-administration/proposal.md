## Why

L'administrateur n'a aucun moyen de créer une équipe depuis l'administration : il doit passer par l'accueil. Et les corbeilles, affichées en grand, incitent à rétablir des éléments qui n'ont pas à l'être.

## What Changes

- Administration : formulaire « Créer une équipe » ; une fois l'équipe créée, la fenêtre « Partager » s'ouvre avec son lien et son QR code, à transmettre à l'équipe.
- Corbeilles plus discrètes : une icône de corbeille avec le nombre d'éléments, qui affiche ou masque la corbeille au clic. Dans l'administration et à l'accueil (corbeille des équipes), et sur la page d'une équipe (l'onglet « Corbeille » devient un onglet icône).

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `administration` : création d'une équipe ; corbeille repliée derrière une icône.
- `teams` : corbeille de l'accueil repliée derrière une icône.
- `team-and-skills` : corbeille d'une équipe accessible par un onglet icône.

## Impact

- `site/js/admin.js`, `site/js/home.js`, `site/js/ui.js`, `site/js/shared.js` (icône), `site/app.css`, README. Aucune modification de la logique métier ni des règles Firebase.
