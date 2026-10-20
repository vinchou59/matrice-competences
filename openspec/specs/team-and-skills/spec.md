# Team And Skills Specification

## Purpose
Gestion des personnes et des compétences d'une équipe, corbeille, identification de la personne qui saisit, et auto-évaluation sur l'échelle de 0 à 4.

## Requirements

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
Toute personne SHALL pouvoir ajouter une compétence (bouton ou touche Entrée, la ligne apparaissant aussitôt et le champ restant prêt pour la suivante) avec un nom de 1 à 60 caractères, unique parmi les compétences de l'équipe hors corbeille sans tenir compte de la casse, et ses deux niveaux cibles (référent et back-up, de 0 à 4, par défaut 3 et 2). Les cibles SHALL être modifiables directement dans le tableau ; le nom SHALL l'être avec le bouton crayon de sa ligne (un clic sur le nom seul MUST NOT ouvrir la modification ; Entrée ou « Enregistrer » valide, Échap ou « Annuler » abandonne ; un nom refusé laisse le champ ouvert avec le message). La suppression MUST demander un second clic de confirmation et SHALL mettre la compétence à la corbeille avec ses notes ; un clic ailleurs, la touche Échap ou 4 secondes sans clic SHALL annuler la demande.

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

#### Scenario: Suppression annulée par un clic ailleurs
- **GIVEN** un clic sur le × de la ligne « Kafka », qui affiche « Mettre à la corbeille ? »
- **WHEN** l'utilisateur clique ailleurs sur la page ou appuie sur Échap
- **THEN** le bouton reprend aussitôt son aspect initial, et le clic ailleurs garde son effet

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

### Requirement: Corbeille d'une équipe
Chaque équipe SHALL avoir une corbeille, accessible par un onglet représenté par une icône de corbeille et le nombre d'éléments, listant les personnes et compétences supprimées avec leur date de suppression, le nombre de jours avant suppression définitive et « Rétablir ». « Rétablir » SHALL remettre l'élément avec toutes ses notes. Si une personne ou une compétence active porte déjà le même nom, « Rétablir » MUST être refusé avec un message invitant à renommer l'une des deux. Un élément à la corbeille depuis plus de 90 jours SHALL être supprimé définitivement, avec ses notes, à la prochaine ouverture de l'équipe. Les règles de sécurité MUST interdire la suppression définitive d'une personne ou d'une compétence plus tôt, sauf à l'administrateur.

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

### Requirement: Réorganisation des lignes et des colonnes
Toute personne SHALL pouvoir changer l'ordre des compétences (lignes) et des personnes (colonnes) de la matrice par glisser-déposer, avec une poignée sur chaque ligne et chaque colonne, à la souris comme au doigt. Un trait SHALL indiquer l'emplacement d'arrivée pendant le geste ; un simple clic sur la poignée MUST NOT déplacer quoi que ce soit. Au clavier, les flèches haut et bas (lignes) ou gauche et droite (colonnes) sur une poignée SHALL déplacer l'élément d'un rang. Le nouvel ordre SHALL être enregistré pour toute l'équipe.

#### Scenario: Remonter une compétence
- **GIVEN** les compétences Java, Spring Boot, Kafka, dans cet ordre
- **WHEN** Julie glisse la poignée de Kafka au-dessus de Java
- **THEN** l'ordre devient Kafka, Java, Spring Boot, pour tous

#### Scenario: Déplacer une colonne
- **GIVEN** les colonnes Julie, Marc, Sofiane
- **WHEN** Marc glisse la poignée de Sofiane avant Julie
- **THEN** les colonnes deviennent Sofiane, Julie, Marc

#### Scenario: Au clavier
- **GIVEN** le focus sur la poignée de Spring Boot, deuxième ligne
- **WHEN** l'utilisateur appuie sur la flèche haut
- **THEN** Spring Boot passe en première ligne et la poignée garde le focus
