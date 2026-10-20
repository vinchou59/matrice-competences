## MODIFIED Requirements

### Requirement: Corbeille d'une équipe
Chaque équipe SHALL avoir une corbeille, accessible par un onglet représenté par une icône de corbeille et le nombre d'éléments, listant les personnes et compétences supprimées avec leur date de suppression, le nombre de jours avant suppression définitive et « Rétablir ». « Rétablir » SHALL remettre l'élément avec toutes ses notes. Si une personne ou une compétence active porte déjà le même nom, « Rétablir » MUST être refusé avec un message invitant à renommer l'une des deux. Pour l'administrateur connecté, la corbeille SHALL aussi proposer « Supprimer définitivement » (avec un second clic de confirmation), qui efface aussitôt l'élément et toutes ses notes ; les autres personnes MUST NOT voir ce bouton. Un élément à la corbeille depuis plus de 90 jours SHALL être supprimé définitivement, avec ses notes, à la prochaine ouverture de l'équipe. Les règles de sécurité MUST interdire la suppression définitive d'une personne ou d'une compétence plus tôt, sauf à l'administrateur.

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

#### Scenario: Vider la corbeille à la main
- **GIVEN** Vincent connecté en administrateur, et la compétence de test « Essai » dans la corbeille de l'équipe
- **WHEN** il clique sur « Supprimer définitivement » en face d'« Essai », puis confirme
- **THEN** « Essai » et toutes ses notes sont effacées

#### Scenario: Visiteur
- **WHEN** Julie, qui n'est pas administratrice, ouvre la corbeille de l'équipe
- **THEN** elle ne voit que « Rétablir »
