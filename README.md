# matrice-competences

Matrice de compétences de l'équipe : qui est référent, qui est back-up, et l'équipe tient-elle une absence imprévue ?

**Site : https://agileroy.github.io/matrice-competences/**

Version en ligne du modèle Excel « Skill Matrix » : chaque compétence doit avoir un **référent** et un **back-up** qui atteignent chacun le niveau cible fixé par l'équipe.

## Fonctionnement

### Équipes

- L'**accueil** (adresse de base) liste les équipes déjà ouvertes sur ce navigateur, et propose **Ouvrir avec un lien** et **Essayer la démo**.
- La **démo** (`…/matrice-competences/?equipe=demo`) ouvre une équipe fictive déjà remplie (6 personnes, 8 compétences). Tout s'y fait comme dans une vraie équipe, mais les essais restent dans le navigateur du visiteur (sans Firebase) : personne d'autre ne les voit. **Recommencer la démo** remet l'équipe fictive de départ ; **Demander mon équipe** ouvre un e-mail prêt à envoyer à l'administrateur.
- Seul l'**administrateur** crée les équipes, depuis l'administration ; les règles Firebase refusent toute autre création.
- Chaque équipe a sa propre matrice et sa propre adresse, `…/matrice-competences/?equipe=<identifiant>`. L'identifiant est aléatoire (12 caractères) : les équipes ne sont **pas listées publiquement**, on y accède par leur lien ou leur QR code.
- La carte **Rejoindre l'équipe**, en haut de chaque équipe, affiche le QR code (cliquer pour l'agrandir) et le lien, avec **Copier le lien**, **Copier le QR code** et **Télécharger le QR code** (image PNG avec le nom de l'équipe).
- Les noms (équipe, personnes, compétences) se modifient avec le **crayon** à côté de chacun : Entrée ou ✓ pour enregistrer, Échap ou ✕ pour annuler.

### Matrice

- On choisit son nom dans « Je suis » (ou on s'ajoute), et on note sa colonne, surlignée en orange : un clic sur une case ouvre le choix du **niveau** et la case **« Je veux progresser »** (cochée par défaut). Le choix du nom est mémorisé par équipe dans le navigateur.
- **Niveaux**, affichés par un cercle qui se remplit : Aucun (vide), Débutant (⅓), Autonome (⅔), Expert (plein). Une case **hachurée avec un ✕** signale une personne qui ne souhaite pas progresser sur ce sujet : elle n'est pas proposée dans le plan de formation.
- Le **référent** est la personne la mieux notée sur la compétence, le **back-up** la deuxième (à égalité, ordre alphabétique). Une compétence est **couverte** quand les deux atteignent leur cible.
- **Ajouter** : les compétences sous le tableau (nom et cibles), les personnes avec « Je suis » ou dans l'onglet Équipe. Les cibles se modifient directement dans le tableau, les noms avec le crayon.
- **Réorganiser** : glisser la poignée ⋮⋮ d'une ligne (compétence) ou d'une colonne (personne), à la souris ou au doigt ; au clavier, flèches sur la poignée. L'ordre vaut pour toute l'équipe.
- **Saisie libre (facilitateur)** permet de noter toutes les colonnes.
- **Simuler une absence** : cliquer sur une ou plusieurs personnes recalcule tout sans elles, sur son seul écran.
- Onglets : **Matrice**, **Radars** (cible en bleu, niveau atteint en orange), **Équipe** (rôles de chacun et compétences perdues s'il s'absente), **Plan de formation** (qui former en priorité, parmi les personnes qui souhaitent progresser), **Corbeille**.

### Modèle Excel

- **Modèle vide** (administration) ou **pré-rempli** avec une équipe (bouton « Modèle Excel » de l'équipe) : un seul onglet, avec un court mode d'emploi puis trois colonnes, **Équipe** (un seul nom), **Personnes** et **Compétences**. Ni cibles ni notes : les compétences importées ont les cibles par défaut (3 et 2), à ajuster dans le tableau.
- **Créer une équipe depuis un fichier** : dans l'administration ; la fenêtre de partage de la nouvelle équipe s'ouvre ensuite.
- **Ajouter depuis Excel** (page d'une équipe) : ajoute seulement les personnes et compétences absentes ; un nom déjà présent est ignoré (cibles inchangées), un nom à la corbeille aussi (à rétablir plutôt).
- Un **aperçu** montre ce qui sera ajouté, ce qui est ignoré et les erreurs (colonne et ligne) avant d'enregistrer ; l'enregistrement se fait en une seule écriture.
- Fichiers lus et écrits dans le navigateur par `site/js/xlsx-lite.js`, sans bibliothèque ; formules jamais évaluées, fichiers de 2 Mo au plus.

### Corbeille

- Supprimer une personne ou une compétence (second clic de confirmation ; un clic ailleurs ou Échap annule) la met à la **corbeille** avec ses notes. **Rétablir** la remet telle quelle.
- L'administrateur (connecté sur `admin.html` dans le même navigateur) peut aussi **supprimer définitivement** une personne ou une compétence depuis la corbeille de l'équipe, notes comprises.
- Une **équipe** ne se supprime et ne se rétablit que depuis l'**administration** (règles Firebase comprises). Les corbeilles sont volontairement discrètes : une icône avec le nombre d'éléments, dans l'administration et en dernier onglet d'une équipe.
- Au-delà de **90 jours**, la suppression devient définitive : à l'ouverture de l'équipe pour les personnes et compétences, à l'accueil ou dans l'administration pour les équipes. Les règles Firebase refusent tout effacement définitif plus tôt, sauf à l'administrateur.
- Une note modifiée ou effacée ne passe pas par la corbeille.

### Administration

`…/matrice-competences/admin.html`, connexion avec un compte Google. Un compte est administrateur si son identifiant Firebase est inscrit dans `skillMatrix/admins` (depuis la console, jamais depuis le site ; aucune adresse e-mail n'est écrite dans le dépôt). L'administration permet de **créer une équipe** (la fenêtre de partage s'ouvre aussitôt avec son lien et son QR code) et montre **toutes les équipes** (lien et QR code à renvoyer, « Supprimer l'équipe », qui la met à la corbeille). La corbeille des équipes, repliée derrière une icône, permet le rétablissement et la suppression définitive.

## Réseau d'entreprise

Comme pour le poker planning, le VPN de l'entreprise (proxy Zscaler) bloque GitHub Pages et Firebase : ouvrir la matrice hors VPN, ou depuis un téléphone.

## Architecture

Site statique (HTML/CSS/JavaScript, sans build) publié sur GitHub Pages ; les données sont dans Firebase Realtime Database (connexion anonyme), dans la branche `skillMatrix` de la base du projet `poker-planning-vleroy`, partagée avec le poker planning.

- `site/js/matrix-core.js` : logique métier pure (couverture, absences, plan de formation, validations), testée avec Node.js ;
- `site/js/matrix-store.js` : seul module qui parle à Firebase ;
- `site/js/xlsx-lite.js` : lecture et écriture des fichiers .xlsx ; `site/js/template-core.js` : modèle Excel et plan d'import (logique pure, testée) ; `site/js/excel.js` : téléchargement et aperçu ;
- `site/js/demo-core.js` : jeu de données de la démo et e-mail de demande d'équipe ; `site/js/demo-store.js` : stockage de la démo dans le navigateur, même interface que `matrix-store.js` (tous deux testés) ;
- `site/js/ui.js` : page d'une équipe ; `site/js/home.js` : accueil ; `site/js/admin.js` : administration ; `site/js/shared.js` : outils d'interface communs (partage, confirmations) ;
- `site/js/app.js` et `site/js/admin-app.js` : points d'entrée ; `site/js/theme.js` : thème clair / sombre ;
- `site/vendor/` : générateur de QR code `qrcode-generator` 1.4.4 (licence MIT), comme le poker planning ;
- `site/js/firebase-config.js` : configuration web Firebase (publique par nature) ;
- `database.rules.json` : règles de sécurité de **toute** la base (salle du poker planning, matrice, [roue de la chance](https://github.com/agileroy/wheel-of-chance) et [Moving Motivators](https://github.com/agileroy/moving-motivators)). La console Firebase n'accepte qu'un seul fichier de règles par base : garder ce fichier identique à celui de `poker-planning`, de `wheel-of-chance` et de `moving-motivators`, et le publier dans la console après chaque modification.

Données :

```
skillMatrix/
  admins/<uid>: true                                   inscrit depuis la console
  teams/<idÉquipe>: { name, createdAt, deletedAt? }    liste lisible par l'administrateur seulement
  teamData/<idÉquipe>/
    skills/<id>   { label, refTarget, backupTarget (0 à 3), order, deletedAt? }
    members/<id>  { name, order, deletedAt? }
    scale: 2                                   échelle actuelle (absente : ancienne échelle de 0 à 4, convertie à l'ouverture)
    levels/<idPersonne>/<idCompétence>     niveau de 0 (Aucun) à 3 (Expert)
    noProgress/<idPersonne>/<idCompétence> true si la personne ne souhaite pas progresser
```

## Mise en service (console Firebase)

1. Publier `database.rules.json` dans Realtime Database → Règles (le fichier contient aussi les règles du poker planning, inchangées).
2. Authentication → Méthode de connexion : activer **Google**.
3. Se connecter sur `admin.html`, copier l'identifiant affiché, puis dans Realtime Database → Données, créer `skillMatrix/admins/<identifiant>` avec la valeur `true`.
4. Effacer les anciennes branches `skillMatrix/skills`, `skillMatrix/members` et `skillMatrix/ratings` (version à une seule matrice), qui ne sont plus lues.

## Développement

```sh
npm test                                          # tests de la logique métier
python3 -m http.server 8765 --directory site      # puis http://localhost:8765
```

Chaque push sur `main` lance les tests puis publie `site/` sur GitHub Pages ; un test en échec bloque la publication.

## Méthode

Le projet suit le développement piloté par les spécifications avec [OpenSpec](https://github.com/Fission-AI/OpenSpec) : `openspec/specs/` décrit le comportement attendu, `openspec/changes/` les changements en cours. Commandes Claude Code : `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
