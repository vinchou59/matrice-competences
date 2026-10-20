## 1. QR code visible et copiable

- [x] 1.1 Fonctions de partage communes (`makeQr`, `copyLink`, `copyQr`, `downloadQr`) et image PNG avec le nom de l'équipe ; boutons dans la fenêtre de partage. Vérification : image décodée par OpenCV, qui retrouve l'adresse de l'équipe.
- [x] 1.2 Carte « Rejoindre l'équipe » sur la page de l'équipe (QR code cliquable pour l'agrandir, adresse, copier le lien, copier et télécharger le QR code) ; suppression du bouton « Partager ». Vérification : essai automatisé dans Chromium, 390 px et 1280 px.

## 2. Suppression réservée à l'administration

- [x] 2.1 Retirer « Supprimer l'équipe » de la page de l'équipe ; équipe à la corbeille sans « Rétablir » ; accueil sans corbeille d'équipes. Vérification : essai automatisé.
- [x] 2.2 Administration : « Mettre à la corbeille » en face de chaque équipe. Vérification : essai automatisé.
- [ ] 2.3 Règles : corbeille et rétablissement d'une équipe réservés à l'administrateur, renommage ouvert. Vérification sur la vraie base après publication (corbeille refusée en anonyme, renommage accepté).
- [x] 2.4 README.
