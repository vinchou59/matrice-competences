## Why

La matrice n'existe qu'en un exemplaire, alors que plusieurs équipes veulent la leur. Et comme le site est ouvert à tous sans compte, une suppression (de personne, de compétence, et demain d'équipe) est aujourd'hui définitive : une erreur ou un geste malveillant ne se rattrape pas.

## What Changes

- **Plusieurs équipes**, chacune avec sa matrice, à son adresse propre (`?equipe=<identifiant>`). L'identifiant est aléatoire : une équipe n'est accessible qu'à qui a son lien ou son QR code.
- **Page d'accueil** (adresse de base) : les équipes déjà ouvertes sur ce navigateur, « Créer une équipe », « Ouvrir avec un lien ».
- **Partager** sur chaque équipe : lien, bouton « Copier le lien » et QR code.
- **Corbeille** pour les équipes, les personnes et les compétences : supprimer met à la corbeille avec les notes, « Rétablir » remet tout en place. Purge automatique au-delà de 90 jours. Les règles Firebase interdisent tout effacement définitif plus tôt, sauf pour l'administrateur.
- **Administration** (`admin.html`) : connexion avec un compte Google (Firebase), liste de toutes les équipes avec leur lien et leur QR code, corbeille des équipes, purge anticipée.
- **BREAKING** : les données saisies à la racine `skillMatrix` (exemple factice) ne sont plus lues ; leurs règles disparaissent. À effacer depuis la console Firebase.

## Capabilities

### New Capabilities

- `teams` : équipes, accueil, création, renommage, liens et QR codes, corbeille des équipes.
- `administration` : connexion de l'administrateur, liste de toutes les équipes, purge anticipée.

### Modified Capabilities

- `team-and-skills` : la suppression d'une personne ou d'une compétence la met à la corbeille ; restauration ; purge à 90 jours ; données propres à chaque équipe.
- `site-publication` : règles de sécurité de la nouvelle structure (lecture d'une équipe par identifiant seulement, liste réservée à l'administrateur, effacement définitif limité).

## Impact

- `site/js/matrix-core.js` (identifiants, équipes récentes, corbeille, échéances de purge), `site/js/matrix-store.js` (équipes, corbeille, connexion Google), `site/js/ui.js`, nouveaux `site/js/home.js` et `site/js/admin.js`, `site/index.html`, nouveau `site/admin.html`, `site/app.css`, `site/vendor/` (générateur de QR code, comme le poker), tests, `database.rules.json` (à republier dans la console, et à reporter dans `poker-planning`).
- Console Firebase, une fois : activer le fournisseur « Google » dans Authentication, puis ajouter son identifiant administrateur dans `skillMatrix/admins`.
- Aucune adresse e-mail n'est écrite dans le dépôt (public).
