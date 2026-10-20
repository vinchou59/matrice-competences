## MODIFIED Requirements

### Requirement: Vue de toutes les équipes
Un administrateur SHALL voir toutes les équipes actives (nom, date de création, nombre de personnes et de compétences, lien, QR code, « Ouvrir »), même s'il n'en a jamais ouvert aucune sur ce navigateur. La corbeille de toutes les équipes SHALL être repliée derrière une icône de corbeille indiquant le nombre d'équipes supprimées ; un clic SHALL l'afficher ou la masquer, avec pour chaque équipe la date de suppression, les jours restants avant suppression définitive, « Rétablir » et « Supprimer définitivement » (avec un second clic de confirmation). À l'ouverture, l'administration SHALL supprimer définitivement les équipes à la corbeille depuis plus de 90 jours.

#### Scenario: Cache vidé
- **GIVEN** Vincent administrateur, qui vient de vider les données de son navigateur
- **WHEN** il se reconnecte sur `admin.html`
- **THEN** il voit toutes les équipes, y compris celles qu'il n'a jamais ouvertes

#### Scenario: Renvoyer un lien
- **GIVEN** Marc qui a perdu le lien de l'équipe « Mobile »
- **WHEN** Vincent clique sur « Partager » en face de « Mobile » dans l'administration
- **THEN** le lien et le QR code de l'équipe « Mobile » s'affichent

#### Scenario: Corbeille repliée
- **GIVEN** deux équipes dans la corbeille
- **WHEN** Vincent ouvre l'administration
- **THEN** il voit une icône de corbeille avec « 2 », et la liste ne s'affiche qu'après un clic sur l'icône

## ADDED Requirements

### Requirement: Création d'une équipe par l'administrateur
L'administration SHALL proposer « Créer une équipe » (nom de 1 à 50 caractères). Une fois l'équipe créée, la fenêtre « Partager » SHALL s'ouvrir avec son lien et son QR code, et l'équipe SHALL apparaître dans la liste.

#### Scenario: Créer et transmettre
- **WHEN** Vincent crée l'équipe « Paiement » depuis l'administration
- **THEN** la fenêtre « Partager » de « Paiement » s'ouvre, et « Paiement » apparaît dans la liste des équipes
