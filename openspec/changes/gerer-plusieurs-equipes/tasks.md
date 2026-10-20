## 1. Logique métier

- [x] 1.1 `newTeamId`, `parseTeamId` (adresse complète ou identifiant seul), `validateTeamName` dans `matrix-core.js`. Vérification : tests (format de l'identifiant, adresses valides et invalides, longueurs).
- [x] 1.2 Corbeille dans `parseMatrix` : éléments à la corbeille et leurs notes écartés des calculs ; `trashItems`, `isPurgeable`, `daysBeforePurge`, écritures groupées de mise à la corbeille, de rétablissement et de purge ; refus de rétablir un nom déjà pris ; unicité des noms calculée hors corbeille. Vérification : un test par scénario de la spec `team-and-skills`.
- [x] 1.3 Équipes récentes (`rememberTeam`, `recentTeams`, retrait des équipes introuvables), sans accès au stockage. Vérification : tests d'ordre et de dédoublonnage.

## 2. Base et règles

- [x] 2.1 `matrix-store.js` : équipes (création, lecture d'une équipe, renommage, corbeille, rétablissement, purge), données sous `teamData/<id>`, liste et purge administrateur, connexion Google et déconnexion.
- [ ] 2.2 `database.rules.json` : nouvelle structure, partie `room` du poker inchangée. Vérification : essais des règles dans l'émulateur Firebase si disponible, sinon dans le simulateur de règles de la console (lecture de la liste refusée en anonyme, lecture d'une équipe acceptée, purge refusée à 10 jours et acceptée à 91, écriture dans `admins` refusée) ; résultat noté dans la PR.

## 3. Interface

- [x] 3.1 Accueil (`home.js`) : équipes récentes, création, « Ouvrir avec un lien », corbeille des équipes récentes, purge des équipes récentes à échéance.
- [x] 3.2 Page d'une équipe : nom modifiable en en-tête, « Partager » (lien, copie, QR code avec `qrcode-generator` copié du poker), « Supprimer l'équipe », équipe introuvable, équipe à la corbeille avec « Rétablir ».
- [x] 3.3 Corbeille d'une équipe (personnes, compétences) avec « Rétablir » et jours restants ; libellés « Mettre à la corbeille ? » ; purge à l'ouverture.
- [x] 3.4 Administration (`admin.html`, `admin.js`) : connexion Google, identifiant à inscrire, toutes les équipes avec partage, corbeille, rétablissement, suppression définitive confirmée, purge à échéance, déconnexion.
- [x] 3.5 Vérification : essai automatisé avec un store factice (création, partage, mise à la corbeille et rétablissement d'une équipe, d'une personne et d'une compétence, purge simulée à 91 jours, accueil, administration), à 390 px et 1280 px, thèmes clair et sombre, sans défilement horizontal ni erreur de console ; captures.

## 4. Documentation et mise en service

- [x] 4.1 README : équipes, partage, corbeille, administration, structure des données, étapes de la console (fournisseur « Google », inscription dans `admins`, nettoyage de l'ancienne structure).
- [ ] 4.2 Reporter `database.rules.json` dans `poker-planning` (PR séparée).
