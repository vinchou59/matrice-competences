## ADDED Requirements

### Requirement: Modèle Excel téléchargeable
L'accueil SHALL proposer « Télécharger le modèle vide », et chaque équipe « Télécharger le modèle pré-rempli », qui produisent un fichier `.xlsx` avec les onglets « Mode d'emploi », « Équipe » (nom de l'équipe), « Compétences » (compétence, cible référent, cible back-up) et « Personnes » (nom). Le modèle pré-rempli SHALL contenir le nom de l'équipe et ses personnes et compétences actives, sans aucune note. Les cibles SHALL proposer une liste déroulante de 0 à 4. Le fichier SHALL être produit dans le navigateur, sans service tiers.

#### Scenario: Modèle pré-rempli
- **GIVEN** l'équipe « Paiement » avec 4 personnes et 10 compétences actives, et une personne à la corbeille
- **WHEN** Julie télécharge le modèle pré-rempli
- **THEN** le fichier contient « Paiement », les 4 personnes et les 10 compétences avec leurs cibles, et ni notes ni personne à la corbeille

### Requirement: Créer une équipe depuis un fichier
Depuis l'accueil, « Créer depuis un fichier Excel » SHALL lire un modèle rempli et, après validation de l'aperçu, créer une nouvelle équipe avec son nom, ses compétences (et leurs cibles) et ses personnes, puis l'ouvrir. Le nom de l'équipe MUST être renseigné. Une cible vide SHALL prendre la valeur par défaut (3 pour le référent, 2 pour le back-up).

#### Scenario: Création réussie
- **GIVEN** un modèle rempli avec l'équipe « Mobile », 15 compétences et 6 personnes
- **WHEN** Marc le charge depuis l'accueil et clique sur « Importer »
- **THEN** l'équipe « Mobile » est créée avec ses 15 compétences et 6 personnes, sans notes, et s'ouvre

#### Scenario: Nom d'équipe manquant
- **GIVEN** un modèle sans nom d'équipe
- **WHEN** Marc le charge depuis l'accueil
- **THEN** l'aperçu signale « Onglet Équipe : le nom de l'équipe est obligatoire » et « Importer » est désactivé

### Requirement: Ajouter à une équipe depuis un fichier
Depuis une équipe, « Ajouter depuis un fichier » SHALL ajouter uniquement les personnes et compétences du fichier absentes de l'équipe. Une personne ou une compétence déjà active sous le même nom (sans tenir compte de la casse) SHALL être ignorée, sans modifier ses cibles. Un nom présent seulement dans la corbeille SHALL être ignoré avec l'indication de le rétablir. L'import MUST NOT modifier ni supprimer quoi que ce soit dans l'équipe ; le nom d'équipe du fichier SHALL être ignoré.

#### Scenario: Ajout partiel
- **GIVEN** l'équipe « Paiement » avec Julie et Marc, et un fichier listant julie, Marc et Sofiane
- **WHEN** Julie charge le fichier depuis l'équipe et importe
- **THEN** seule Sofiane est ajoutée ; l'aperçu indiquait Julie et Marc « déjà dans l'équipe »

#### Scenario: Personne dans la corbeille
- **GIVEN** Paul dans la corbeille de l'équipe et un fichier qui liste Paul
- **WHEN** l'aperçu s'affiche
- **THEN** Paul est indiqué « dans la corbeille : à rétablir plutôt qu'à ajouter » et ne sera pas ajouté

### Requirement: Aperçu et validation de l'import
Avant tout enregistrement, l'import SHALL afficher un aperçu : l'équipe concernée, le nombre et la liste des éléments à ajouter, des éléments ignorés avec leur raison, et des erreurs avec l'onglet et le numéro de ligne. Sont des erreurs bloquantes : un nom trop long (plus de 30 caractères pour une personne, 60 pour une compétence, 50 pour une équipe), une cible qui n'est pas un entier de 0 à 4, plus de 200 compétences ou 100 personnes, un fichier de plus de 2 Mo ou illisible. « Importer » MUST être désactivé en cas d'erreur bloquante ou s'il n'y a rien à ajouter. Un nom en double dans le fichier SHALL être retenu une fois et signalé. L'enregistrement SHALL se faire en une seule écriture : tout est ajouté, ou rien.

#### Scenario: Cible invalide
- **GIVEN** un fichier dont la ligne 7 de l'onglet Compétences a la cible référent « 5 »
- **WHEN** l'aperçu s'affiche
- **THEN** il signale « Compétences, ligne 7 : la cible référent doit être un nombre entier de 0 à 4 » et « Importer » est désactivé

#### Scenario: Fichier illisible
- **WHEN** quelqu'un charge un fichier `.xls` ou un PDF renommé en `.xlsx`
- **THEN** l'aperçu indique « Fichier illisible : enregistrez-le au format Excel (.xlsx) et réessayez »

#### Scenario: Annulation
- **GIVEN** un aperçu affiché
- **WHEN** l'utilisateur clique sur « Annuler »
- **THEN** rien n'est enregistré
