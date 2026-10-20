# Coverage Specification

## Purpose
Calcul du référent et du back-up de chaque compétence, de la couverture de l'équipe, de la simulation d'absence et de l'impact de l'absence de chaque personne.

## Requirements

### Requirement: Référent et back-up
Pour chaque compétence, le référent SHALL être la personne présente la mieux notée et le back-up la deuxième ; à égalité de note, l'ordre alphabétique des noms SHALL départager. Les personnes non notées MUST NOT compter. Un rôle non pourvu SHALL valoir le niveau 0.

#### Scenario: Comme dans l'Excel
- **GIVEN** une compétence notée 3, 4 et 2, avec les cibles 4 et 4
- **WHEN** la matrice s'affiche
- **THEN** le référent est à 4 / 4 et le back-up à 3 / 4

### Requirement: Couverture
Une compétence SHALL être « Couvert » quand le référent et le back-up atteignent chacun leur cible, « Back-up insuffisant » quand seul le référent l'atteint, « Référent insuffisant » sinon. La synthèse SHALL afficher le nombre de compétences couvertes sur le total, et le nombre de référents et de back-ups à la cible. Les radars SHALL montrer, pour le référent et pour le back-up, la cible et le niveau atteint de chaque compétence, en signalant celles sous la cible.

#### Scenario: Exemple du modèle Excel
- **GIVEN** les 15 compétences et les 3 personnes de l'exemple du modèle Excel
- **WHEN** la synthèse s'affiche
- **THEN** elle indique 4 compétences couvertes sur 15

### Requirement: Simulation d'absence
Cliquer sur le nom d'une ou plusieurs personnes dans la synthèse SHALL les considérer absentes : la synthèse, la matrice, les radars, l'onglet Équipe et le plan de formation SHALL être recalculés sans elles, et la synthèse SHALL indiquer combien de compétences perdent leur couverture. La simulation MUST rester locale au navigateur et MUST NOT modifier les données de l'équipe.

#### Scenario: Absence de Sofiane
- **GIVEN** Sofiane seul noté 4 en Kubernetes, avec une cible référent de 4
- **WHEN** on simule l'absence de Sofiane
- **THEN** Kubernetes passe en « Référent insuffisant » sur cet écran uniquement

### Requirement: Impact de chaque absence
L'onglet Équipe SHALL afficher, pour chaque personne, le nombre de compétences dont elle est référente et back-up, et la liste des compétences couvertes qui ne le seraient plus si elle s'absentait. Les cartes SHALL être triées de l'absence la plus coûteuse à la moins coûteuse.

#### Scenario: Personne indispensable
- **GIVEN** Julie seule à atteindre la cible référent en SQL, et SQL couvert
- **WHEN** l'onglet Équipe s'affiche
- **THEN** la carte de Julie indique que SQL ne serait plus couvert en son absence
