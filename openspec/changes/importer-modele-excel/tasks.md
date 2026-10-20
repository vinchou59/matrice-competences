## 1. Fichiers .xlsx

- [x] 1.1 `xlsx-lite.js` : écriture (ZIP deflate, CRC-32, classeur, styles, largeurs, volets figés, validation de données) et lecture (répertoire central, chaînes partagées et en ligne, nombres), plafonds de taille. Vérification : tests Node (aller-retour, fichier « stored », fichier tronqué ou non ZIP refusé, plafond de décompression) ; ouverture du modèle généré vérifiée avec LibreOffice en ligne de commande (conversion en CSV) si disponible.

## 2. Modèle et analyse

- [x] 2.1 `template-core.js` : contenu du modèle (vide et pré-rempli, sans notes ni corbeille), analyse d'un classeur (onglets par nom, lignes vides, nettoyage, cibles par défaut, erreurs avec onglet et ligne, doublons, limites), plan d'import pour une nouvelle équipe ou une équipe existante (déjà présent, dans la corbeille). Vérification : un test par scénario de la spec.
- [x] 2.2 Écriture groupée en une mise à jour multi-chemins dans `matrix-store.js` (création d'équipe complète ; ajouts dans une équipe). Vérification : test du contenu de la mise à jour produite par la logique pure.

## 3. Interface

- [x] 3.1 Administration : « Télécharger le modèle vide », « Créer depuis un fichier Excel ». Équipe : menu « Excel » (modèle pré-rempli, « Ajouter depuis un fichier »).
- [x] 3.2 Fenêtre d'aperçu : équipe concernée, compteurs, listes repliables, erreurs, « Importer » / « Annuler », message de fin.
- [x] 3.3 Vérification : essai automatisé avec un store factice (téléchargement intercepté et relu, création d'équipe, ajout partiel, erreurs bloquantes, annulation) à 390 px et 1280 px, thèmes clair et sombre ; captures.

## 4. Documentation

- [x] 4.1 README : modèle, import, règles d'ajout uniquement.
