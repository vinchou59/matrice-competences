## Why

Pour diffuser une équipe, il faut pouvoir coller son QR code dans un message, un document ou une présentation, pas seulement le scanner à l'écran.

## What Changes

- Fenêtre « Partager » (page d'une équipe et administration) : « Copier le QR code » (image dans le presse-papiers) et « Télécharger le QR code » (fichier PNG), à côté de « Copier le lien ».
- L'image contient le QR code avec sa marge de lecture et le nom de l'équipe en dessous.
- Si le navigateur refuse la copie d'image, le QR code est téléchargé à la place, avec un message.

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `teams` : exigence « Partage par lien et QR code ».

## Impact

- `site/js/shared.js`, `site/index.html`, `site/admin.html`, `site/app.css`. Aucune modification des règles Firebase.
