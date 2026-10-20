## Why

Le QR code d'une équipe doit être sous les yeux sur sa page, comme dans le poker planning, et pouvoir être collé ou imprimé. Et puisque le site est ouvert à tous, seul l'administrateur doit pouvoir supprimer (et rétablir) une équipe.

## What Changes

- Page d'une équipe : carte « Rejoindre l'équipe » toujours visible, avec le QR code (cliquable pour l'agrandir), l'adresse, « Copier le lien », « Copier le QR code » (image dans le presse-papiers) et « Télécharger le QR code » (PNG). Le bouton « Partager » disparaît.
- Image du QR code : noir sur blanc avec sa marge de lecture, nom de l'équipe en dessous ; téléchargement en repli si la copie d'image est refusée. Mêmes boutons dans la fenêtre de partage de l'administration.
- **BREAKING** Suppression d'une équipe réservée à l'administration : le bouton « Supprimer l'équipe » quitte la page de l'équipe ; l'administration propose « Mettre à la corbeille » en face de chaque équipe. Une équipe à la corbeille indique que seul l'administrateur peut la rétablir ; l'accueil n'affiche plus de corbeille d'équipes.
- Règles Firebase : mise à la corbeille, rétablissement et suppression anticipée d'une équipe réservés aux administrateurs ; renommer une équipe active reste ouvert à tous ; la purge après 90 jours reste possible pour tous.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `teams` : partage visible sur la page, corbeille des équipes gérée par l'administrateur, accueil sans corbeille.
- `administration` : mise à la corbeille depuis la liste des équipes.
- `site-publication` : règles de mise à la corbeille et de rétablissement des équipes.

## Impact

- `site/js/shared.js`, `site/js/ui.js`, `site/js/home.js`, `site/js/admin.js`, `site/index.html`, `site/admin.html`, `site/app.css`, `database.rules.json` (à republier dans la console et à reporter dans `poker-planning`), README.
