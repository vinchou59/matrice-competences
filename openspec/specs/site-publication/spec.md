# Site Publication Specification

## Purpose
Publication sur GitHub Pages, interface (langue, appareils, thème), connexion au service temps réel et règles de sécurité versionnées.

## Requirements

### Requirement: Publication automatique
Le site SHALL être publié sur GitHub Pages, à l'adresse https://vinchou59.github.io/matrice-competences/, à chaque push sur `main`. Les tests automatiques SHALL être lancés avant la publication, et la publication MUST NOT avoir lieu si un test échoue. Les tests SHALL aussi être lancés sur chaque pull request, sans publication.

#### Scenario: Test en échec
- **GIVEN** un push sur `main` qui casse un test
- **WHEN** le workflow GitHub Actions s'exécute
- **THEN** le job de tests échoue et le site publié reste la version précédente

### Requirement: Interface et appareils
L'interface SHALL être en français. Elle SHALL être utilisable sur ordinateur et sur téléphone (largeur de 360 px et plus) sans défilement horizontal de la page ; seul le tableau de la matrice MAY défiler horizontalement dans son cadre, la colonne des compétences restant visible. Le site MUST NOT afficher de publicité, charger de traceur ni de police web.

#### Scenario: Affichage sur téléphone
- **GIVEN** un téléphone de 390 px de large
- **WHEN** une personne ouvre la matrice
- **THEN** la page ne défile pas horizontalement

### Requirement: Choix du thème clair ou sombre
Par défaut, le thème SHALL suivre le réglage du système. Un bouton SHALL basculer entre thème clair et thème sombre ; son libellé accessible SHALL indiquer le thème vers lequel il bascule. Le choix SHALL être mémorisé dans le navigateur et appliqué dès l'affichage de la page, sans clignotement.

#### Scenario: Choix mémorisé
- **GIVEN** une personne qui a choisi le thème sombre
- **WHEN** elle recharge la page avec un système en thème clair
- **THEN** la page s'affiche directement en thème sombre

### Requirement: Connexion au service temps réel
Le site SHALL n'utiliser que des connexions HTTPS (port 443) vers Firebase. Si la connexion est perdue, la page SHALL afficher « Connexion perdue, reconnexion… » et reprendre automatiquement à son retour. Une modification refusée ou impossible SHALL être signalée par un message.

#### Scenario: Coupure réseau
- **GIVEN** une personne sur la matrice
- **WHEN** sa connexion réseau est coupée puis rétablie
- **THEN** le message de connexion perdue s'affiche pendant la coupure, puis disparaît et la matrice se met à jour

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
