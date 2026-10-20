## MODIFIED Requirements

### Requirement: Ajout et suppression de personnes
Toute personne ouvrant une équipe SHALL pouvoir y ajouter une personne, soit pour elle-même (« Je suis » puis « Ajouter »), soit pour un autre (onglet Équipe). Le nom SHALL compter de 1 à 30 caractères après retrait des espaces de bord, et MUST être unique parmi les personnes de l'équipe hors corbeille, sans tenir compte de la casse. Une personne SHALL pouvoir être renommée et retirée ; le retrait MUST demander un second clic de confirmation et SHALL mettre la personne à la corbeille avec ses notes, qui ne comptent plus dans les calculs.

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
- **WHEN** on clique sur le × de sa carte puis sur « Mettre à la corbeille ? »
- **THEN** Marc disparaît de la matrice et des calculs, et apparaît dans la corbeille de l'équipe

### Requirement: Ajout et suppression de compétences
Toute personne SHALL pouvoir ajouter une compétence avec un nom de 1 à 60 caractères, unique parmi les compétences de l'équipe hors corbeille sans tenir compte de la casse, et ses deux niveaux cibles (référent et back-up, de 0 à 4, par défaut 3 et 2). Le nom et les cibles SHALL être modifiables directement dans le tableau. La suppression MUST demander un second clic de confirmation et SHALL mettre la compétence à la corbeille avec ses notes.

#### Scenario: Nouvelle compétence
- **WHEN** quelqu'un ajoute « Kubernetes » avec les cibles 4 et 3
- **THEN** la ligne « Kubernetes » apparaît en bas du tableau pour tous, sans aucune note

#### Scenario: Suppression annulée par le délai
- **GIVEN** un clic sur le × de la ligne « Kafka »
- **WHEN** personne ne clique sur « Mettre à la corbeille ? » dans les 4 secondes
- **THEN** la ligne reste et le bouton reprend son aspect initial

## ADDED Requirements

### Requirement: Corbeille d'une équipe
Chaque équipe SHALL avoir une corbeille, accessible depuis la matrice, listant les personnes et compétences supprimées avec leur date de suppression, le nombre de jours avant suppression définitive et « Rétablir ». « Rétablir » SHALL remettre l'élément avec toutes ses notes. Si une personne ou une compétence active porte déjà le même nom, « Rétablir » MUST être refusé avec un message invitant à renommer l'une des deux. Un élément à la corbeille depuis plus de 90 jours SHALL être supprimé définitivement, avec ses notes, à la prochaine ouverture de l'équipe. Les règles de sécurité MUST interdire la suppression définitive d'une personne ou d'une compétence plus tôt, sauf à l'administrateur.

#### Scenario: Rétablir une personne
- **GIVEN** Marc mis à la corbeille avec ses 12 notes
- **WHEN** Julie ouvre la corbeille et clique sur « Rétablir » en face de Marc
- **THEN** la colonne de Marc réapparaît avec ses 12 notes

#### Scenario: Purge à 90 jours
- **GIVEN** la compétence « Mainframe » à la corbeille depuis 91 jours
- **WHEN** quelqu'un ouvre l'équipe
- **THEN** « Mainframe » et ses notes sont supprimées définitivement et disparaissent de la corbeille

#### Scenario: Nom repris entre-temps
- **GIVEN** « Kafka » à la corbeille et une nouvelle compétence « Kafka » active
- **WHEN** quelqu'un rétablit l'ancienne « Kafka »
- **THEN** le rétablissement est refusé avec un message invitant à renommer l'une des deux
