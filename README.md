# matrice-competences

Matrice de compétences de l'équipe : qui est référent, qui est back-up, et l'équipe tient-elle une absence imprévue ?

**Site : https://vinchou59.github.io/matrice-competences/**

Version en ligne du modèle Excel « Skill Matrix » : chaque compétence doit avoir un **référent** et un **back-up** qui atteignent chacun le niveau cible fixé par l'équipe.

## Fonctionnement

### Équipes

- L'**accueil** (adresse de base) liste les équipes déjà ouvertes sur ce navigateur, et propose **Ouvrir avec un lien**.
- Seul l'**administrateur** crée les équipes, depuis l'administration ; les règles Firebase refusent toute autre création.
- Chaque équipe a sa propre matrice et sa propre adresse, `…/matrice-competences/?equipe=<identifiant>`. L'identifiant est aléatoire (12 caractères) : les équipes ne sont **pas listées publiquement**, on y accède par leur lien ou leur QR code.
- **Partager** (en haut d'une équipe) affiche le lien, un bouton de copie et le QR code de l'équipe.
- Le nom de l'équipe se modifie directement en haut de la page.

### Matrice

- On choisit son nom dans « Je suis » (ou on s'ajoute), et on note sa colonne, surlignée en orange. Le choix est mémorisé par équipe dans le navigateur.
- **Échelle** de 0 à 4 : 0 ne connaît pas et pas intéressé·e, 1 ne connaît pas mais intéressé·e, 2 première expérience, 3 autonome, 4 maîtrise et peut former.
- Le **référent** est la personne la mieux notée sur la compétence, le **back-up** la deuxième (à égalité, ordre alphabétique). Une compétence est **couverte** quand les deux atteignent leur cible.
- **Ajouter** : les compétences sous le tableau (nom et cibles), les personnes avec « Je suis » ou dans l'onglet Équipe. Noms et cibles se modifient directement dans le tableau.
- **Saisie libre (facilitateur)** permet de noter toutes les colonnes.
- **Simuler une absence** : cliquer sur une ou plusieurs personnes recalcule tout sans elles, sur son seul écran.
- Onglets : **Matrice**, **Radars** (cible en bleu, niveau atteint en orange), **Équipe** (rôles de chacun et compétences perdues s'il s'absente), **Plan de formation** (qui former en priorité), **Corbeille**.

### Modèle Excel

- **Modèle vide** (administration) ou **pré-rempli** avec une équipe (bouton « Modèle Excel » de l'équipe) : onglets Mode d'emploi, Équipe (nom en B1), Compétences (nom, cible référent, cible back-up, listes déroulantes de 0 à 4) et Personnes. Pas de notes : elles se saisissent dans l'application.
- **Créer une équipe depuis un fichier** : dans l'administration ; la fenêtre de partage de la nouvelle équipe s'ouvre ensuite.
- **Ajouter depuis Excel** (page d'une équipe) : ajoute seulement les personnes et compétences absentes ; un nom déjà présent est ignoré (cibles inchangées), un nom à la corbeille aussi (à rétablir plutôt).
- Un **aperçu** montre ce qui sera ajouté, ce qui est ignoré et les erreurs ligne par ligne avant d'enregistrer ; l'enregistrement se fait en une seule écriture.
- Fichiers lus et écrits dans le navigateur par `site/js/xlsx-lite.js`, sans bibliothèque ; formules jamais évaluées, fichiers de 2 Mo au plus.

### Corbeille

- Supprimer une personne, une compétence ou une équipe (second clic de confirmation) la met à la **corbeille** avec ses notes. **Rétablir** la remet telle quelle. Les corbeilles sont volontairement discrètes : une icône avec le nombre d'éléments, à l'accueil, dans l'administration et en dernier onglet d'une équipe.
- Au-delà de **90 jours**, la suppression devient définitive : à l'ouverture de l'équipe pour les personnes et compétences, à l'accueil ou dans l'administration pour les équipes. Les règles Firebase refusent tout effacement définitif plus tôt, sauf à l'administrateur.
- Une note modifiée ou effacée ne passe pas par la corbeille.

### Administration

`…/matrice-competences/admin.html`, connexion avec un compte Google. Un compte est administrateur si son identifiant Firebase est inscrit dans `skillMatrix/admins` (depuis la console, jamais depuis le site ; aucune adresse e-mail n'est écrite dans le dépôt). L'administration permet de **créer une équipe** (la fenêtre de partage s'ouvre aussitôt avec son lien et son QR code) et montre **toutes les équipes** (lien et QR code à renvoyer). La corbeille des équipes, repliée derrière une icône, permet le rétablissement et la suppression définitive.

## Réseau d'entreprise

Comme pour le poker planning, le VPN de l'entreprise (proxy Zscaler) bloque GitHub Pages et Firebase : ouvrir la matrice hors VPN, ou depuis un téléphone.

## Architecture

Site statique (HTML/CSS/JavaScript, sans build) publié sur GitHub Pages ; les données sont dans Firebase Realtime Database (connexion anonyme), dans la branche `skillMatrix` de la base du projet `poker-planning-vleroy`, partagée avec le poker planning.

- `site/js/matrix-core.js` : logique métier pure (couverture, absences, plan de formation, validations), testée avec Node.js ;
- `site/js/matrix-store.js` : seul module qui parle à Firebase ;
- `site/js/xlsx-lite.js` : lecture et écriture des fichiers .xlsx ; `site/js/template-core.js` : modèle Excel et plan d'import (logique pure, testée) ; `site/js/excel.js` : téléchargement et aperçu ;
- `site/js/ui.js` : page d'une équipe ; `site/js/home.js` : accueil ; `site/js/admin.js` : administration ; `site/js/shared.js` : outils d'interface communs (partage, confirmations) ;
- `site/js/app.js` et `site/js/admin-app.js` : points d'entrée ; `site/js/theme.js` : thème clair / sombre ;
- `site/vendor/` : générateur de QR code `qrcode-generator` 1.4.4 (licence MIT), comme le poker planning ;
- `site/js/firebase-config.js` : configuration web Firebase (publique par nature) ;
- `database.rules.json` : règles de sécurité de **toute** la base (salle du poker planning et matrice). La console Firebase n'accepte qu'un seul fichier de règles par base : garder ce fichier identique à celui de `poker-planning`, et le publier dans la console après chaque modification.

Données :

```
skillMatrix/
  admins/<uid>: true                                   inscrit depuis la console
  teams/<idÉquipe>: { name, createdAt, deletedAt? }    liste lisible par l'administrateur seulement
  teamData/<idÉquipe>/
    skills/<id>   { label, refTarget, backupTarget, order, deletedAt? }
    members/<id>  { name, order, deletedAt? }
    ratings/<idPersonne>/<idCompétence>   niveau de 0 à 4
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
