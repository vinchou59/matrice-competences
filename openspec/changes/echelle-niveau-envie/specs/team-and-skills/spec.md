## MODIFIED Requirements

### Requirement: Auto-évaluation
Chaque personne SHALL choisir son nom dans « Je suis » ; ce choix SHALL être mémorisé dans le navigateur. Seule sa colonne SHALL être modifiable, sauf si l'option « Saisie libre (facilitateur) » est cochée, qui rend toutes les colonnes modifiables. Une note SHALL se composer d'un niveau (Aucun, Débutant, Autonome ou Expert) et d'une envie de progresser, oui par défaut ; elle MAY être absente (« non noté »). Un clic sur une case modifiable SHALL ouvrir le choix du niveau, avec un libellé et une explication par niveau, la case « Je veux progresser » et « Effacer ma note ». La matrice SHALL afficher le niveau par un cercle rempli par tiers (vide pour Aucun, plein pour Expert), sans chiffre, et marquer « ne souhaite pas progresser » par une case hachurée avec un ✕. Les règles de sécurité MUST refuser tout niveau hors de 0 à 3 et toute note d'une personne ou d'une compétence inexistante.

#### Scenario: Noter sa colonne
- **GIVEN** Julie qui s'est choisie dans « Je suis »
- **WHEN** elle clique sur sa case « Kafka » et choisit « Autonome »
- **THEN** la case affiche un cercle aux deux tiers chez tous les membres de l'équipe, sans recharger la page

#### Scenario: Ne pas souhaiter progresser
- **GIVEN** Julie experte en Java
- **WHEN** elle décoche « Je veux progresser » sur Java
- **THEN** sa case Java reste pleine, hachurée et marquée d'un ✕

#### Scenario: Colonne d'un autre
- **GIVEN** Julie, sans saisie libre
- **WHEN** elle regarde la colonne de Marc
- **THEN** les notes de Marc sont affichées mais pas modifiables

## ADDED Requirements

### Requirement: Conversion depuis l'ancienne échelle
Une équipe enregistrée avec l'ancienne échelle de 0 à 4 SHALL être convertie à sa première ouverture, en une seule écriture : note 0 en Aucun sans envie de progresser, 1 en Aucun, 2 en Débutant, 3 en Autonome, 4 en Expert ; cibles 4 en Expert, 3 en Autonome, 2 en Débutant, 1 et 0 en Aucun. Une équipe créée après ce changement MUST NOT être convertie.

#### Scenario: Équipe de test existante
- **GIVEN** une équipe où Vincent est noté 4 en Kafka, avec une cible référent de 3
- **WHEN** quelqu'un ouvre l'équipe
- **THEN** Vincent est Expert en Kafka, et la cible référent de Kafka est Autonome
