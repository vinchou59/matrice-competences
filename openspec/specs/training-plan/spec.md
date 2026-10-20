# Training Plan Specification

## Purpose
Proposition des personnes à former pour couvrir les compétences sous la cible.

## Requirements

### Requirement: Compétences à traiter
Le plan de formation SHALL lister les compétences non couvertes (avec les absences simulées), de l'écart total le plus grand au plus petit (écart du référent plus écart du back-up). Pour chacune, il SHALL indiquer le niveau et la cible du ou des rôles insuffisants, et le nombre de personnes présentes qui ne l'ont pas notée. L'onglet SHALL afficher le nombre de compétences à traiter.

#### Scenario: Toutes couvertes
- **GIVEN** une matrice où toutes les compétences sont couvertes
- **WHEN** on ouvre le plan de formation
- **THEN** il indique que toutes les compétences sont couvertes

### Requirement: Personnes à former
Pour chaque compétence, le plan SHALL proposer au plus 3 personnes présentes, notées de 1 au niveau visé moins 1, les plus avancées d'abord, avec le nombre de niveaux à gagner. Le niveau visé SHALL être la cible du référent si elle n'est pas atteinte, sinon celle du back-up ; dans ce second cas, le référent MUST NOT être proposé. Les personnes notées 0 (pas intéressées) MUST NOT être proposées. Les personnes notées 1 SHALL porter la mention « intéressé·e ». Si toutes les personnes notées sont à 0, le plan SHALL le signaler.

#### Scenario: Personne pas intéressée
- **GIVEN** Marc noté 0 et Julie notée 1 en Mainframe, cible référent 2
- **WHEN** le plan s'affiche
- **THEN** Julie est proposée avec la mention « intéressé·e », Marc ne l'est pas
