## MODIFIED Requirements

### Requirement: Page d'accueil
L'adresse de base SHALL afficher la page d'accueil : la liste des équipes déjà ouvertes sur ce navigateur (de la plus récemment visitée à la plus ancienne), « Créer une équipe » et « Ouvrir avec un lien ». « Ouvrir avec un lien » SHALL accepter une adresse d'équipe complète ou un identifiant seul. Une équipe récente qui n'existe plus SHALL disparaître de la liste. Les équipes récentes à la corbeille SHALL être repliées derrière une icône de corbeille indiquant leur nombre ; un clic SHALL les afficher, avec « Rétablir ».

#### Scenario: Première visite
- **GIVEN** un navigateur qui n'a jamais ouvert d'équipe
- **WHEN** Marc ouvre l'adresse de base
- **THEN** l'accueil affiche « Créer une équipe » et « Ouvrir avec un lien », sans liste

#### Scenario: Équipes récentes
- **GIVEN** Marc qui a ouvert les équipes « Paiement » puis « Mobile »
- **WHEN** il revient sur l'accueil
- **THEN** « Mobile » apparaît avant « Paiement », et un clic ouvre l'équipe
