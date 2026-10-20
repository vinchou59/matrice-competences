## ADDED Requirements

### Requirement: Connexion de l'administrateur
La page `admin.html` SHALL permettre de se connecter avec un compte Google (Firebase). Un compte connecté SHALL être administrateur seulement si son identifiant Firebase est inscrit dans `skillMatrix/admins` ; cette liste MUST NOT être modifiable depuis le site. Un compte connecté mais non inscrit SHALL voir son identifiant et l'indication de l'inscrire depuis la console Firebase. L'adresse e-mail de l'administrateur MUST NOT figurer dans le dépôt. « Se déconnecter » SHALL revenir à la connexion anonyme.

#### Scenario: Première connexion
- **GIVEN** Vincent sur `admin.html`, pas encore inscrit
- **WHEN** il clique sur « Se connecter avec Google » et choisit son compte
- **THEN** la page affiche son identifiant et explique comment l'ajouter dans `skillMatrix/admins`

#### Scenario: Personne non administratrice
- **GIVEN** Julie, connectée anonymement
- **WHEN** elle ouvre `admin.html`
- **THEN** elle ne voit que le bouton de connexion, et la base lui refuse la liste des équipes

### Requirement: Vue de toutes les équipes
Un administrateur SHALL voir toutes les équipes actives (nom, date de création, nombre de personnes et de compétences, lien, QR code, « Ouvrir »), même s'il n'en a jamais ouvert aucune sur ce navigateur, et la corbeille de toutes les équipes avec la date de suppression, les jours restants avant suppression définitive, « Rétablir » et « Supprimer définitivement » (avec un second clic de confirmation). À l'ouverture, l'administration SHALL supprimer définitivement les équipes à la corbeille depuis plus de 90 jours.

#### Scenario: Cache vidé
- **GIVEN** Vincent administrateur, qui vient de vider les données de son navigateur
- **WHEN** il se reconnecte sur `admin.html`
- **THEN** il voit toutes les équipes, y compris celles qu'il n'a jamais ouvertes

#### Scenario: Renvoyer un lien
- **GIVEN** Marc qui a perdu le lien de l'équipe « Mobile »
- **WHEN** Vincent clique sur « Partager » en face de « Mobile » dans l'administration
- **THEN** le lien et le QR code de l'équipe « Mobile » s'affichent
