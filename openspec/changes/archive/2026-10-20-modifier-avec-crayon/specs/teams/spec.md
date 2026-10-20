## MODIFIED Requirements

### Requirement: Création et renommage d'une équipe
Seul un administrateur SHALL pouvoir créer une équipe, depuis l'administration, en saisissant son nom (1 à 50 caractères après retrait des espaces de bord). Le nom SHALL être modifiable par toute personne avec le bouton crayon de l'en-tête de l'équipe. Deux équipes MAY porter le même nom.

#### Scenario: Création refusée hors administration
- **WHEN** un navigateur non administrateur tente d'écrire une nouvelle équipe dans la base
- **THEN** la base refuse l'écriture
