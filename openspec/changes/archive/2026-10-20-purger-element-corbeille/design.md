## Decisions

- L'administrateur est reconnu comme dans `admin.html` (`isAdmin` : identifiant inscrit dans `skillMatrix/admins`). La session Firebase étant partagée par l'origine, une connexion sur `admin.html` vaut pour les pages d'équipe du même navigateur.
- Bouton masqué pour les autres plutôt que désactivé : la règle de sécurité refuserait de toute façon l'écriture.
- `purgeItemUpdate(raw, kind, id)` : la personne et toutes ses notes, ou la compétence et ses notes chez chaque personne, en une écriture ; la purge à 90 jours s'appuie désormais dessus.
