# Team And Skills Specification

## Purpose
Gestion de l'équipe et des compétences de la matrice, identification de la personne qui saisit, et auto-évaluation sur l'échelle de 0 à 4.

## Requirements

### Requirement: Ajout et suppression de personnes
Toute personne ouvrant la matrice SHALL pouvoir ajouter une personne à l'équipe, soit pour elle-même (« Je suis » puis « Ajouter »), soit pour un autre (onglet Équipe). Le nom SHALL compter de 1 à 30 caractères après retrait des espaces de bord, et MUST être unique dans l'équipe sans tenir compte de la casse. Une personne SHALL pouvoir être renommée et retirée ; le retrait MUST demander un second clic de confirmation et SHALL effacer aussi toutes ses notes.

#### Scenario: S'ajouter soi-même
- **GIVEN** Julie qui n'est pas encore dans l'équipe
- **WHEN** elle saisit « Julie » à côté de « Je suis » et clique sur « Ajouter »
- **THEN** Julie apparaît dans l'équipe pour tous, et sa colonne est sélectionnée comme la sienne

#### Scenario: Nom déjà pris
- **GIVEN** une équipe contenant « Julie »
- **WHEN** quelqu'un ajoute « julie »
- **THEN** l'ajout est refusé avec le message « Cette personne existe déjà : choisissez-la dans la liste »

#### Scenario: Retrait confirmé
- **GIVEN** Marc dans l'équipe, avec des notes
- **WHEN** on clique sur le × de sa carte puis sur « Retirer ? »
- **THEN** Marc et toutes ses notes disparaissent de la matrice

### Requirement: Ajout et suppression de compétences
Toute personne SHALL pouvoir ajouter une compétence avec un nom de 1 à 60 caractères, unique sans tenir compte de la casse, et ses deux niveaux cibles (référent et back-up, de 0 à 4, par défaut 3 et 2). Le nom et les cibles SHALL être modifiables directement dans le tableau. La suppression MUST demander un second clic de confirmation et SHALL effacer aussi les notes de cette compétence.

#### Scenario: Nouvelle compétence
- **WHEN** quelqu'un ajoute « Kubernetes » avec les cibles 4 et 3
- **THEN** la ligne « Kubernetes » apparaît en bas du tableau pour tous, sans aucune note

#### Scenario: Suppression annulée par le délai
- **GIVEN** un clic sur le × de la ligne « Kafka »
- **WHEN** personne ne clique sur « Supprimer ? » dans les 4 secondes
- **THEN** la ligne reste et le bouton reprend son aspect initial

### Requirement: Auto-évaluation
Chaque personne SHALL choisir son nom dans « Je suis » ; ce choix SHALL être mémorisé dans le navigateur. Seule sa colonne SHALL être modifiable, sauf si l'option « Saisie libre (facilitateur) » est cochée, qui rend toutes les colonnes modifiables. Une note SHALL être un entier de 0 à 4, ou absente (« Non noté »). Les règles de sécurité MUST refuser toute autre valeur, et toute note d'une personne ou d'une compétence inexistante.

#### Scenario: Noter sa colonne
- **GIVEN** Julie qui s'est choisie dans « Je suis »
- **WHEN** elle choisit 3 dans sa case « Kafka »
- **THEN** la case affiche 3 chez tous les membres de l'équipe, sans recharger la page

#### Scenario: Colonne d'un autre
- **GIVEN** Julie, sans saisie libre
- **WHEN** elle regarde la colonne de Marc
- **THEN** les notes de Marc sont affichées mais pas modifiables
