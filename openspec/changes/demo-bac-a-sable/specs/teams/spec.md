## MODIFIED Requirements

### Requirement: Page d'accueil
L'adresse de base SHALL afficher la page d'accueil : « Découvrir l'outil » avec « Essayer la démo », « Ouvrir avec un lien », et la liste des équipes déjà ouvertes sur ce navigateur (de la plus récemment visitée à la plus ancienne). Elle MUST NOT proposer de créer une équipe, et SHALL proposer d'écrire à l'administrateur pour en créer une, par un lien qui ouvre un e-mail prêt à envoyer. « Ouvrir avec un lien » SHALL accepter une adresse d'équipe complète ou un identifiant seul. Une équipe récente qui n'existe plus SHALL disparaître de la liste ; une équipe récente à la corbeille MUST NOT y apparaître.

#### Scenario: Première visite
- **GIVEN** un navigateur qui n'a jamais ouvert d'équipe
- **WHEN** Marc ouvre l'adresse de base
- **THEN** l'accueil affiche « Essayer la démo » et « Ouvrir avec un lien », sans liste ni bouton de création

#### Scenario: Équipes récentes
- **GIVEN** Marc qui a ouvert les équipes « Paiement » puis « Mobile »
- **WHEN** il revient sur l'accueil
- **THEN** « Mobile » apparaît avant « Paiement », et un clic ouvre l'équipe

## ADDED Requirements

### Requirement: Équipe de démonstration
L'adresse `?equipe=demo` SHALL ouvrir une équipe fictive déjà remplie, qui montre une compétence couverte, une compétence couverte mais perdue si une personne s'absente, un back-up insuffisant, un référent insuffisant, des personnes qui ne souhaitent pas progresser et des cases non notées. Toutes les actions de la page d'une équipe SHALL y fonctionner, mais les données MUST rester dans le navigateur du visiteur, sans rien écrire dans la base ; elles SHALL être conservées d'une visite à l'autre sur ce navigateur et synchronisées entre ses onglets. À la place de « Rejoindre l'équipe », la page SHALL afficher une carte « Démo » indiquant que les essais ne sont visibles que dans ce navigateur, avec « Demander mon équipe » (e-mail prêt à envoyer à l'administrateur), « Recommencer la démo » (second clic de confirmation), qui remet l'équipe fictive de départ, et l'adresse de l'administrateur avec « Copier l'adresse ». La démo MUST NOT apparaître dans « Vos équipes ».

#### Scenario: Essayer sans gêner les autres
- **GIVEN** Julie et Marc qui ouvrent la démo, chacun sur son ordinateur
- **WHEN** Julie ajoute « Zoé » et la note en Kafka
- **THEN** Marc ne voit pas « Zoé », et Julie la retrouve en rouvrant la démo

#### Scenario: Recommencer
- **GIVEN** Julie qui a modifié la démo
- **WHEN** elle clique deux fois sur « Recommencer la démo »
- **THEN** l'équipe fictive de départ réapparaît, sans ses modifications

#### Scenario: Demander son équipe
- **WHEN** Julie clique sur « Demander mon équipe »
- **THEN** sa messagerie ouvre un e-mail à l'administrateur, avec l'objet et le message à compléter
