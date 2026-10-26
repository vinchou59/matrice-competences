## Why

L'échelle de 0 à 4 mélange deux informations : le niveau, et l'envie d'apprendre (0 « pas intéressé » et 1 « intéressé » sont tous deux « ne connaît pas »). Un expert ne peut pas dire qu'il veut encore progresser, ni un débutant qu'il ne le veut pas. Et des chiffres se lisent moins bien qu'un symbole.

## What Changes

- **BREAKING** Une note devient un **niveau** sur 4 crans, Aucun, Débutant, Autonome, Expert (0 à 3), et une **envie de progresser**, oui par défaut.
- Affichage sans chiffres : cercle rempli par tiers (vide, ⅓, ⅔, plein) avec un dégradé de bleu. Une case « ne souhaite pas progresser » est hachurée, le cercle estompé, avec un petit ✕ en coin (option A de la maquette).
- Saisie : un clic sur sa case ouvre un choix du niveau (cercle, libellé, explication), la case « Je veux progresser » (cochée par défaut) et « Effacer ma note ».
- Cibles sur la même échelle, affichées en cercles ; menu des cibles avec les libellés ; cibles par défaut Autonome (référent) et Débutant (back-up).
- Plan de formation : les candidats sont les personnes qui veulent progresser et n'ont pas encore le niveau visé, quel que soit leur niveau ; une personne qui ne souhaite pas progresser n'est jamais proposée.
- **Migration automatique** de chaque équipe à sa première ouverture, en une écriture : notes 0 → Aucun sans envie, 1 → Aucun, 2 → Débutant, 3 → Autonome, 4 → Expert ; cibles décalées d'un cran (4 → Expert, 3 → Autonome, 2 → Débutant, 1 et 0 → Aucun).

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `team-and-skills` : auto-évaluation (niveau et envie), cibles.
- `coverage` : échelle des niveaux et des cibles.
- `training-plan` : personnes à former selon l'envie de progresser.
- `site-publication` : règles des niveaux, de l'envie et de la migration.

## Impact

- `site/js/matrix-core.js` (échelle, envie, migration, plan, purge), `site/js/matrix-store.js`, `site/js/ui.js`, `site/js/excel.js`, `site/js/template-core.js` (cibles par défaut), `site/app.css`, tests, `database.rules.json` (à republier, et à reporter dans `poker-planning`), README.
