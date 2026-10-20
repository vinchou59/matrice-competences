## MODIFIED Requirements

### Requirement: Ajout et suppression de personnes
Toute personne ouvrant une équipe SHALL pouvoir y ajouter une personne, soit pour elle-même (« Je suis » puis « Ajouter »), soit pour un autre (onglet Équipe). Le nom SHALL compter de 1 à 30 caractères après retrait des espaces de bord, et MUST être unique parmi les personnes de l'équipe hors corbeille, sans tenir compte de la casse. Une personne SHALL pouvoir être renommée avec le bouton crayon de sa carte (un clic sur le nom seul MUST NOT ouvrir la modification ; Entrée ou « Enregistrer » valide, Échap ou « Annuler » abandonne) et retirée ; le retrait MUST demander un second clic de confirmation et SHALL mettre la personne à la corbeille avec ses notes, qui ne comptent plus dans les calculs.

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
Toute personne SHALL pouvoir ajouter une compétence avec un nom de 1 à 60 caractères, unique parmi les compétences de l'équipe hors corbeille sans tenir compte de la casse, et ses deux niveaux cibles (référent et back-up, de 0 à 4, par défaut 3 et 2). Les cibles SHALL être modifiables directement dans le tableau ; le nom SHALL l'être avec le bouton crayon de sa ligne (un clic sur le nom seul MUST NOT ouvrir la modification ; Entrée ou « Enregistrer » valide, Échap ou « Annuler » abandonne ; un nom refusé laisse le champ ouvert avec le message). La suppression MUST demander un second clic de confirmation et SHALL mettre la compétence à la corbeille avec ses notes.

#### Scenario: Nouvelle compétence
- **WHEN** quelqu'un ajoute « Kubernetes » avec les cibles 4 et 3
- **THEN** la ligne « Kubernetes » apparaît en bas du tableau pour tous, sans aucune note

#### Scenario: Suppression annulée par le délai
- **GIVEN** un clic sur le × de la ligne « Kafka »
- **WHEN** personne ne clique sur « Mettre à la corbeille ? » dans les 4 secondes
- **THEN** la ligne reste et le bouton reprend son aspect initial

#### Scenario: Renommer une compétence
- **GIVEN** la compétence « Java »
- **WHEN** Julie clique sur le crayon de la ligne, saisit « Java 21 » et appuie sur Entrée
- **THEN** la compétence s'appelle « Java 21 » pour tous

#### Scenario: Clic sur le nom
- **WHEN** Julie clique sur le nom « Java » sans passer par le crayon
- **THEN** aucun champ de saisie ne s'ouvre
