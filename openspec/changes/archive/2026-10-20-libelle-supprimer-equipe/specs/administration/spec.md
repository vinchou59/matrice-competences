## MODIFIED Requirements

### Requirement: Vue de toutes les équipes
Un administrateur SHALL voir toutes les équipes actives (nom, date de création, nombre de personnes et de compétences, « Partager » avec le lien et le QR code, et « Supprimer l'équipe » avec un second clic de confirmation, qui met l'équipe à la corbeille), même s'il n'en a jamais ouvert aucune sur ce navigateur. La corbeille de toutes les équipes SHALL être repliée derrière une icône de corbeille indiquant le nombre d'équipes supprimées ; un clic SHALL l'afficher ou la masquer, avec pour chaque équipe la date de suppression, les jours restants avant suppression définitive, « Rétablir » et « Supprimer définitivement » (avec un second clic de confirmation). À l'ouverture, l'administration SHALL supprimer définitivement les équipes à la corbeille depuis plus de 90 jours.

#### Scenario: Cache vidé
- **GIVEN** Vincent administrateur, qui vient de vider les données de son navigateur
- **WHEN** il se reconnecte sur `admin.html`
- **THEN** il voit toutes les équipes, y compris celles qu'il n'a jamais ouvertes

#### Scenario: Renvoyer un lien
- **GIVEN** Marc qui a perdu le lien de l'équipe « Mobile »
- **WHEN** Vincent clique sur « Partager » en face de « Mobile » dans l'administration
- **THEN** le lien et le QR code de l'équipe « Mobile » s'affichent

#### Scenario: Nettoyer une équipe de test
- **GIVEN** l'équipe de test « Essai »
- **WHEN** Vincent clique sur « Supprimer l'équipe » puis confirme, ouvre la corbeille, et clique sur « Supprimer définitivement » puis confirme
- **THEN** l'équipe « Essai » et toutes ses données sont effacées

#### Scenario: Corbeille repliée
- **GIVEN** deux équipes dans la corbeille
- **WHEN** Vincent ouvre l'administration
- **THEN** il voit une icône de corbeille avec « 2 », et la liste ne s'affiche qu'après un clic sur l'icône
