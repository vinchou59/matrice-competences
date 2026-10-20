## MODIFIED Requirements

### Requirement: Règles de sécurité versionnées
Les règles de sécurité de la base Firebase SHALL être versionnées dans le dépôt (`database.rules.json`) et couvrir toute la base partagée avec le poker planning. Pour la matrice, elles MUST : n'autoriser que les personnes connectées ; refuser la lecture de la liste des équipes à quiconque n'est pas inscrit dans `skillMatrix/admins`, tout en autorisant la lecture d'une équipe par son identifiant ; interdire toute écriture dans `skillMatrix/admins` ; réserver la création d'une équipe aux administrateurs ; n'accepter que des équipes, compétences, personnes et notes bien formées (longueurs des noms, niveaux entiers de 0 à 4, date de mise à la corbeille égale à l'heure du serveur) ; n'autoriser la suppression définitive d'une équipe, d'une personne ou d'une compétence que si elle est à la corbeille depuis plus de 90 jours, ou à un administrateur ; refuser toute autre donnée, y compris l'ancienne structure à une seule matrice.

#### Scenario: Note hors échelle
- **WHEN** un navigateur tente d'écrire la note 7
- **THEN** la base refuse l'écriture

#### Scenario: Lister les équipes sans être administrateur
- **WHEN** un navigateur connecté anonymement lit `skillMatrix/teams`
- **THEN** la base refuse la lecture

#### Scenario: Se déclarer administrateur
- **WHEN** un navigateur tente d'écrire dans `skillMatrix/admins`
- **THEN** la base refuse l'écriture

#### Scenario: Créer une équipe sans être administrateur
- **WHEN** un navigateur connecté anonymement écrit une nouvelle fiche dans `skillMatrix/teams`
- **THEN** la base refuse l'écriture
