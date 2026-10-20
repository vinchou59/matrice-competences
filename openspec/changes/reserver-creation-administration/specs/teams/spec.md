## MODIFIED Requirements

### Requirement: Page d'accueil
L'adresse de base SHALL afficher la page d'accueil : la liste des équipes déjà ouvertes sur ce navigateur (de la plus récemment visitée à la plus ancienne) et « Ouvrir avec un lien ». Elle MUST NOT proposer de créer une équipe, et SHALL indiquer de s'adresser à l'administrateur pour en créer une. « Ouvrir avec un lien » SHALL accepter une adresse d'équipe complète ou un identifiant seul. Une équipe récente qui n'existe plus SHALL disparaître de la liste. Les équipes récentes à la corbeille SHALL être repliées derrière une icône de corbeille indiquant leur nombre ; un clic SHALL les afficher, avec « Rétablir ».

#### Scenario: Première visite
- **GIVEN** un navigateur qui n'a jamais ouvert d'équipe
- **WHEN** Marc ouvre l'adresse de base
- **THEN** l'accueil affiche « Ouvrir avec un lien », sans liste ni bouton de création

#### Scenario: Équipes récentes
- **GIVEN** Marc qui a ouvert les équipes « Paiement » puis « Mobile »
- **WHEN** il revient sur l'accueil
- **THEN** « Mobile » apparaît avant « Paiement », et un clic ouvre l'équipe

### Requirement: Création et renommage d'une équipe
Seul un administrateur SHALL pouvoir créer une équipe, depuis l'administration, en saisissant son nom (1 à 50 caractères après retrait des espaces de bord). Le nom SHALL être modifiable par toute personne depuis l'en-tête de l'équipe. Deux équipes MAY porter le même nom.

#### Scenario: Création refusée hors administration
- **WHEN** un navigateur non administrateur tente d'écrire une nouvelle équipe dans la base
- **THEN** la base refuse l'écriture
