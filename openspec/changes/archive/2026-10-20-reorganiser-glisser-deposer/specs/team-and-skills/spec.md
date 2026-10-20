## MODIFIED Requirements

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

## ADDED Requirements

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
