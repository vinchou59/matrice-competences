## MODIFIED Requirements

### Requirement: Référent et back-up
Pour chaque compétence, le référent SHALL être la personne présente au niveau le plus élevé et le back-up la deuxième ; à égalité de niveau, l'ordre alphabétique des noms SHALL départager. Les personnes non notées MUST NOT compter. Un rôle non pourvu SHALL valoir le niveau Aucun. Les cibles du référent et du back-up SHALL utiliser la même échelle (Aucun, Débutant, Autonome, Expert), affichée en cercles ; par défaut Autonome pour le référent et Débutant pour le back-up.

#### Scenario: Référent et back-up
- **GIVEN** une compétence où Marc est Expert, Julie Autonome et Sofiane Débutant, avec les cibles Expert et Expert
- **WHEN** la matrice s'affiche
- **THEN** le référent est Marc, à la cible, et le back-up Julie, sous la cible
