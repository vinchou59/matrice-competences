## Decisions

- Carte « Rejoindre l'équipe » à droite du nom de l'équipe (en dessous sur téléphone), sur le modèle de la carte « Rejoindre avec un téléphone » du poker : QR code de 116 px cliquable pour l'agrandir (fenêtre de partage existante), adresse sans `https://`, liens d'action. Le QR code est calculé une fois par page.
- Image PNG dessinée dans un `canvas` à partir des modules du QR code (`getModuleCount`, `isDark`), 10 px par module, marge de 4 modules, nom de l'équipe en gras dessous. Noir sur blanc quel que soit le thème.
- Copie : `navigator.clipboard.write([new ClipboardItem({ 'image/png': promesse })])`, la promesse passée directement pour Safari ; en cas de refus, téléchargement du PNG et message.
- Fonctions de partage communes dans `shared.js` (`makeQr`, `copyLink`, `copyQr`, `downloadQr`), utilisées par la page de l'équipe et la fenêtre de partage.
- Règles : `teams/$teamId` n'est plus inscriptible que par un administrateur, ou pour l'effacer quand la mise à la corbeille date de plus de 90 jours ; `teams/$teamId/name` reste inscriptible par tous tant que l'équipe existe et n'est pas à la corbeille.
- Les équipes récentes à la corbeille ne sont plus affichées à l'accueil (sans être oubliées : elles réapparaissent si l'administrateur les rétablit) ; l'accueil continue de purger celles arrivées à échéance.
