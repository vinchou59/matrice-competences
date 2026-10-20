## Context

Le changement `gerer-plusieurs-equipes` apporte les équipes, l'accueil et la corbeille. Le projet n'utilise aucune bibliothèque tierce hors générateur de QR code, ni service tiers, et n'a pas d'étape de build.

## Goals / Non-Goals

**Goals :** un modèle simple à remplir dans Excel (ou LibreOffice, Google Sheets exporté en `.xlsx`), un import sûr et prévisible.

**Non-Goals :** import ou export des notes ; modification ou suppression par import ; import du fichier « Skill Matrix » d'origine (onglet DATA) ; formats `.xls` et `.csv`.

## Decisions

### Lecture et écriture `.xlsx` sans bibliothèque

Un `.xlsx` est une archive ZIP de fichiers XML. `xlsx-lite.js` :
- **écrit** l'archive (méthode « deflate » via `CompressionStream('deflate-raw')`, somme CRC-32 calculée en JavaScript) avec un classeur minimal : chaînes en ligne, styles d'en-tête (gras, fond), largeurs de colonnes, volets figés, listes déroulantes 0 à 4 sur les cibles (validation de données) ;
- **lit** l'archive (répertoire central, entrées « stored » ou « deflate » via `DecompressionStream`), le classeur, les chaînes partagées et les cellules (chaînes partagées ou en ligne, nombres, booléens).
- Fonctionne dans le navigateur et dans Node.js 22 (mêmes API de flux) : testé avec `npm test`, y compris l'aller-retour écriture puis lecture.

Alternative écartée : SheetJS. Version libre distribuée hors des grands CDN, ancienne version des CDN exposée à une faille connue à la lecture de fichiers, et près de 1 Mo pour quatre colonnes de texte. Les navigateurs visés (Chrome, Edge, Firefox, Safari récents) proposent tous `CompressionStream`.

### Contenu du modèle

Fichier `matrice-competences-<nom de l'équipe>.xlsx` (ou `matrice-competences-modele.xlsx`), trois onglets :
1. **Mode d'emploi** : quoi remplir, l'échelle de 0 à 4 et le rôle des cibles.
2. **Équipe** : `A1` « Nom de l'équipe », `B1` le nom (pré-rempli depuis une équipe).
3. **Compétences** : colonnes « Compétence », « Cible référent (0 à 4) », « Cible back-up (0 à 4) » ; ligne d'en-tête figée ; listes déroulantes de 0 à 4.
4. **Personnes** : colonne « Nom ».

Les onglets sont retrouvés par leur nom (sans tenir compte de la casse ni des accents), les colonnes par leur position : un utilisateur qui renomme un en-tête ne casse rien.

### Analyse et plan d'import (`template-core.js`, pur, testé)

- Lignes vides ignorées. Espaces nettoyés comme dans l'appli. Cible vide = valeur par défaut (3 et 2). Cible non entière ou hors 0 à 4, nom trop long : **erreur bloquante**, avec onglet et numéro de ligne.
- Doublon dans le fichier (même nom, casse ignorée) : la première occurrence est retenue, les suivantes signalées « en double dans le fichier ».
- Import dans une équipe existante : nom déjà présent parmi les éléments actifs, « déjà dans l'équipe, ignoré » ; nom présent seulement dans la corbeille, « dans la corbeille : à rétablir plutôt qu'à ajouter », ignoré. Les cibles d'une compétence déjà présente ne sont jamais modifiées. Le nom d'équipe du fichier est ignoré.
- Création d'équipe : le nom de l'équipe est obligatoire (erreur bloquante sinon), et aucune personne ni compétence n'est obligatoire.
- Limites : 200 compétences et 100 personnes par fichier, fichier de 2 Mo au plus (erreur bloquante au-delà).
- Ordre : les éléments ajoutés gardent l'ordre du fichier, après les éléments existants.

### Écriture

Tous les ajouts d'un import passent en **une seule écriture atomique** (mise à jour multi-chemins Firebase) : tout ou rien. Une création d'équipe écrit la fiche et les données dans la même écriture.

### Interface

- Accueil : « Créer depuis un fichier Excel » et « Télécharger le modèle vide ».
- Équipe : menu « Excel » avec « Télécharger le modèle pré-rempli » et « Ajouter depuis un fichier ».
- Aperçu dans une fenêtre : compteurs (à ajouter, ignorés, erreurs), listes détaillées repliables, boutons « Importer » (désactivé s'il y a une erreur bloquante ou rien à ajouter) et « Annuler ». Message de fin : « 12 personnes et 18 compétences ajoutées ».
- Le téléchargement passe par un lien `blob:` avec l'attribut `download` (le site n'est pas dans un cadre restreint).

## Risks / Trade-offs

- [Fichier produit par un tableur exotique] → lecture limitée à ce dont le modèle a besoin ; un fichier illisible donne « Fichier illisible : enregistrez-le au format Excel (.xlsx) et réessayez ».
- [Fichier malveillant] → aucune formule n'est évaluée et aucun contenu n'est inséré comme HTML (texte uniquement). La taille est bornée avant décompression, et le volume décompressé est plafonné (10 Mo).
- [Import par erreur dans la mauvaise équipe] → l'aperçu rappelle le nom de l'équipe cible ; et chaque élément ajouté peut ensuite être mis à la corbeille.
