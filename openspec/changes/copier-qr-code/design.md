## Decisions

- L'image est dessinée dans un `canvas` à partir des modules du QR code (`qrcode-generator` : `getModuleCount`, `isDark`), à 10 px par module, avec une marge de 4 modules (zone de silence recommandée) et le nom de l'équipe en gras dessous, réduit si besoin pour tenir dans la largeur. Noir sur blanc quel que soit le thème, pour rester lisible une fois collée ailleurs.
- Copie : `navigator.clipboard.write([new ClipboardItem({ 'image/png': promesse })])`, la promesse étant passée directement pour satisfaire Safari, qui exige l'appel pendant le clic. En cas de refus (navigateur ancien, permission), téléchargement du PNG.
- Le QR code affiché passe aussi à une marge de 4 modules, plus fiable à la lecture.
