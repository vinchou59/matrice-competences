## ADDED Requirements

### Requirement: Modèle Excel téléchargeable
L'administration SHALL proposer « Télécharger le modèle vide », et chaque équipe « Modèle Excel » (pré-rempli), qui produisent un fichier `.xlsx` d'un seul onglet : un court mode d'emploi indiquant quoi remplir, puis une ligne d'en-têtes « Équipe », « Personnes », « Compétences », et une liste par colonne. La colonne « Équipe » SHALL ne contenir qu'un nom, sur la première ligne. Le modèle pré-rempli SHALL contenir le nom de l'équipe et ses personnes et compétences actives, sans cibles ni notes. Le fichier SHALL être produit dans le navigateur, sans service tiers.

#### Scenario: Modèle pré-rempli
- **GIVEN** l'équipe « Paiement » avec 4 personnes et 10 compétences actives, et une personne à la corbeille
- **WHEN** Julie télécharge le modèle pré-rempli
- **THEN** le fichier n'a qu'un onglet, avec « Paiement » sous « Équipe », les 4 personnes sous « Personnes » et les 10 compétences sous « Compétences », sans la personne à la corbeille

### Requirement: Créer une équipe depuis un fichier
Depuis l'administration, « Créer une équipe depuis un fichier » SHALL lire un modèle rempli et, après validation de l'aperçu, créer une nouvelle équipe avec son nom, ses personnes et ses compétences (cibles par défaut : 3 pour le référent, 2 pour le back-up), puis ouvrir sa fenêtre « Partager ». Le nom de l'équipe MUST être renseigné. Cette création MUST être réservée à l'administrateur.

#### Scenario: Création réussie
- **GIVEN** un modèle rempli avec l'équipe « Mobile », 6 personnes et 15 compétences
- **WHEN** Vincent le charge depuis l'administration et clique sur « Importer »
- **THEN** l'équipe « Mobile » est créée avec ses 6 personnes et 15 compétences, sans notes, et sa fenêtre « Partager » s'ouvre

#### Scenario: Nom d'équipe manquant
- **GIVEN** un modèle dont la colonne « Équipe » est vide
- **WHEN** Vincent le charge depuis l'administration
- **THEN** l'aperçu signale que le nom de l'équipe est obligatoire et « Importer » est désactivé

### Requirement: Ajouter à une équipe depuis un fichier
Depuis une équipe, « Ajouter depuis Excel » SHALL ajouter uniquement les personnes et compétences du fichier absentes de l'équipe. Une personne ou une compétence déjà active sous le même nom (sans tenir compte de la casse) SHALL être ignorée. Un nom présent seulement dans la corbeille SHALL être ignoré avec l'indication de le rétablir. L'import MUST NOT modifier ni supprimer quoi que ce soit dans l'équipe ; le nom d'équipe du fichier SHALL être ignoré.

#### Scenario: Ajout partiel
- **GIVEN** l'équipe « Paiement » avec Julie et Marc, et un fichier listant julie, Marc et Sofiane
- **WHEN** Julie charge le fichier depuis l'équipe et importe
- **THEN** seule Sofiane est ajoutée ; l'aperçu indiquait Julie et Marc « déjà dans l'équipe »

#### Scenario: Personne dans la corbeille
- **GIVEN** Paul dans la corbeille de l'équipe et un fichier qui liste Paul
- **WHEN** l'aperçu s'affiche
- **THEN** Paul est indiqué « dans la corbeille : à rétablir plutôt qu'à ajouter » et ne sera pas ajouté

### Requirement: Aperçu et validation de l'import
Avant tout enregistrement, l'import SHALL afficher un aperçu : l'équipe concernée, le nombre et la liste des éléments à ajouter, des éléments ignorés avec leur raison, et des erreurs avec la colonne et le numéro de ligne. Sont des erreurs bloquantes : un nom trop long (plus de 30 caractères pour une personne, 60 pour une compétence, 50 pour une équipe), plus d'un nom dans la colonne « Équipe », plus de 200 compétences ou 100 personnes, un fichier de plus de 2 Mo, illisible, ou sans colonnes « Personnes » et « Compétences ». « Importer » MUST être désactivé en cas d'erreur bloquante ou s'il n'y a rien à ajouter. Un nom en double dans le fichier SHALL être retenu une fois et signalé. L'enregistrement SHALL se faire en une seule écriture : tout est ajouté, ou rien.

#### Scenario: Deux noms d'équipe
- **GIVEN** un fichier avec « Mobile » puis « Web » dans la colonne « Équipe »
- **WHEN** l'aperçu s'affiche
- **THEN** il signale qu'un seul nom d'équipe est permis, avec la ligne de « Web », et « Importer » est désactivé

#### Scenario: Fichier illisible
- **WHEN** quelqu'un charge un fichier `.xls` ou un PDF renommé en `.xlsx`
- **THEN** l'aperçu indique « Fichier illisible : enregistrez-le au format Excel (.xlsx) et réessayez »

#### Scenario: Annulation
- **GIVEN** un aperçu affiché
- **WHEN** l'utilisateur clique sur « Annuler »
- **THEN** rien n'est enregistré
