# Teams Specification

## Purpose
Équipes séparées, page d'accueil, création, renommage, partage par lien et QR code, corbeille des équipes.

## Requirements

### Requirement: Équipes séparées
Le site SHALL gérer plusieurs équipes, chacune avec ses propres personnes, compétences et notes. Chaque équipe SHALL avoir un identifiant aléatoire de 12 caractères (lettres minuscules et chiffres) et une adresse propre, `https://vinchou59.github.io/matrice-competences/?equipe=<identifiant>`. Une équipe MUST NOT être lisible sans son identifiant, sauf par l'administrateur.

#### Scenario: Ouvrir une équipe par son lien
- **GIVEN** l'équipe « Paiement » d'identifiant `k7f3q2m9x1ab`
- **WHEN** Julie ouvre `?equipe=k7f3q2m9x1ab`
- **THEN** la matrice de l'équipe « Paiement » s'affiche, avec son nom en en-tête

#### Scenario: Identifiant inconnu
- **WHEN** quelqu'un ouvre `?equipe=` suivi d'un identifiant qui n'existe pas
- **THEN** la page indique « Équipe introuvable : vérifiez le lien » et propose de revenir à l'accueil
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
### Requirement: Partage par lien et QR code
Chaque équipe SHALL avoir un bouton « Partager » qui affiche le lien de l'équipe, un bouton « Copier le lien » et un QR code menant à ce lien. Le QR code SHALL être généré dans la page, sans service tiers.

#### Scenario: Rejoindre depuis un téléphone
- **GIVEN** la fenêtre « Partager » de l'équipe « Paiement » ouverte sur un ordinateur
- **WHEN** Marc scanne le QR code avec son téléphone
- **THEN** son téléphone ouvre la matrice de l'équipe « Paiement »
### Requirement: Corbeille des équipes
Supprimer une équipe (avec un second clic de confirmation) SHALL la mettre à la corbeille avec toutes ses données. Son lien SHALL alors afficher « Cette équipe est dans la corbeille », la date de suppression, le nombre de jours avant suppression définitive et « Rétablir », sans la matrice. « Rétablir » SHALL remettre l'équipe exactement dans son état d'avant la suppression. Une équipe à la corbeille depuis plus de 90 jours SHALL être supprimée définitivement, avec toutes ses données, à la prochaine visite de l'accueil d'un navigateur qui la connaît ou de l'administration. Les règles de sécurité MUST interdire la suppression définitive d'une équipe plus tôt, sauf à l'administrateur.

#### Scenario: Supprimer puis rétablir
- **GIVEN** l'équipe « Paiement » avec 5 personnes et leurs notes
- **WHEN** Julie la supprime, puis Marc ouvre son lien et clique sur « Rétablir »
- **THEN** l'équipe réapparaît avec ses 5 personnes et toutes leurs notes

#### Scenario: Suppression définitive trop tôt
- **GIVEN** une équipe mise à la corbeille il y a 10 jours
- **WHEN** un navigateur non administrateur tente d'effacer ses données
- **THEN** la base refuse l'écriture
