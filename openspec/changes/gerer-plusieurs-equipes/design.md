## Context

Aujourd'hui : une seule matrice sous `skillMatrix/{skills,members,ratings}`, connexion anonyme, suppressions définitives. Le site est public et sans compte ; seule la sécurité des règles Firebase protège les données. La base est partagée avec le poker planning (même projet, même origine `vinchou59.github.io`, donc même session Firebase Auth pour les deux sites).

## Goals / Non-Goals

**Goals :** plusieurs équipes isolées, accès par lien ou QR code, vue complète pour l'administrateur, rien de définitivement perdu avant 90 jours.

**Non-Goals :** comptes pour les membres, droits par équipe, historique des modifications de notes (une note changée ou effacée ne va pas à la corbeille), import Excel (changement suivant).

## Decisions

### Structure des données

```
skillMatrix/
  admins/<uid>: true                         écrit depuis la console uniquement
  teams/<teamId>: { name, createdAt, deletedAt? }
  teamData/<teamId>/skills/<id>: { label, refTarget, backupTarget, order, deletedAt? }
  teamData/<teamId>/members/<id>: { name, order, deletedAt? }
  teamData/<teamId>/ratings/<memberId>/<skillId>: 0..4
```

- `teamId` : 12 caractères tirés au hasard (`crypto.getRandomValues`) parmi `a-z0-9`, soit environ 62 bits : impossible à deviner. La fiche `teams/<id>` est séparée des données pour que l'administration liste les équipes sans tout télécharger.
- Un élément à la corbeille garde toutes ses données et porte `deletedAt` (heure du serveur). Les notes d'une personne ou d'une compétence à la corbeille sont conservées telles quelles et ne comptent plus dans les calculs : `parseMatrix` écarte les éléments à la corbeille et les notes qui s'y rattachent.

### Équipes non listées

Les règles refusent la lecture de `skillMatrix/teams` (la liste) à tous sauf aux administrateurs, mais autorisent la lecture de `teams/<id>` et `teamData/<id>` à toute personne connectée. Firebase n'applique pas un refus de lecture du parent aux enfants : on lit une équipe si l'on connaît son identifiant, jamais la liste. Alternative écartée : liste publique, contraire au souhait de discrétion.

### Accueil et équipes récentes

L'accueil (`index.html` sans paramètre) lit la liste des équipes ouvertes sur ce navigateur (`localStorage`, clé `matrice-competences.teams` : identifiant, nom, dernière visite), et relit le nom de chacune dans la base. Une équipe introuvable (purgée) disparaît de la liste. « Ouvrir avec un lien » accepte une adresse complète ou un identifiant seul.

### Partage

Bouton « Partager » dans l'en-tête d'une équipe : lien, « Copier le lien », QR code généré dans la page par `qrcode-generator` 1.4.4 (licence MIT, copié de `poker-planning/site/vendor/`).

### Corbeille et purge

- Mettre à la corbeille = écrire `deletedAt` ; rétablir = l'effacer. Les règles imposent `deletedAt === now` (heure du serveur).
- Effacement définitif (purge) d'un élément autorisé par les règles seulement si `deletedAt < now - 90 jours` (7 776 000 000 ms), ou pour un administrateur. Même mécanisme que le retrait des inactifs du poker.
- Qui purge : à l'ouverture d'une équipe, le navigateur purge les personnes et compétences de cette équipe arrivées à échéance (avec leurs notes, en une écriture atomique) ; l'accueil purge les équipes récentes arrivées à échéance ; l'administration purge toutes les équipes arrivées à échéance. Une équipe que personne n'ouvre reste au-delà de 90 jours jusqu'à la visite de l'administrateur : acceptable, rien n'est perdu trop tôt.
- Une équipe à la corbeille reste accessible par son lien : la page affiche « Cette équipe est dans la corbeille » et « Rétablir », sans la matrice.
- Les notes : écrire ou effacer une note reste libre (c'est la saisie normale). Effacer d'un coup toutes les notes d'une personne n'est permis que si la personne n'existe plus (purge).

### Administration

- Page `admin.html`. Connexion par lien e-mail Firebase (`sendSignInLinkToEmail`, `signInWithEmailLink`) : aucun mot de passe, et l'adresse Hotmail de l'administrateur fonctionne (la connexion Google exigerait un compte Google). L'adresse n'est jamais écrite dans le dépôt : les règles reconnaissent l'administrateur par son identifiant Firebase, inscrit à la main dans `skillMatrix/admins/<uid>` depuis la console.
- Avant d'être inscrit, l'administrateur connecté voit son identifiant et la marche à suivre.
- Contenu : toutes les équipes actives (nom, date de création, lien, QR code, « Ouvrir »), corbeille des équipes (« Rétablir », « Supprimer définitivement » avec confirmation), « Se déconnecter » (retour à la connexion anonyme).
- Conséquence assumée : la session Firebase étant partagée par l'origine, le poker planning verra aussi l'administrateur comme connecté par e-mail ; ses règles n'exigent que `auth != null`, rien ne change pour lui.

### Code

- `matrix-core.js` (pur, testé) : `newTeamId`, `parseTeamId(texte)` (lien ou identifiant), `validateTeamName` (1 à 50 caractères), `parseMatrix` étendu (corbeille), `trashItems`, `isPurgeable(deletedAt, now)`, `daysBeforePurge`, `purgeUpdate…` (écritures groupées), `rememberTeam` / `recentTeams` (liste récente, sans accès au stockage).
- `matrix-store.js` reste le seul module Firebase ; `ui.js` (équipe), `home.js` (accueil), `admin.js` (administration).

## Risks / Trade-offs

- [Lien partagé trop largement] → n'importe qui avec le lien peut modifier l'équipe, comme aujourd'hui. Atténuation : corbeille, et purge impossible avant 90 jours.
- [Écrasement massif des notes par un malveillant] → non couvert par la corbeille. Hors périmètre ; une sauvegarde de la base reste possible depuis la console Firebase (export JSON).
- [Envoi de liens e-mail] → quota gratuit de Firebase (plusieurs centaines par jour), largement suffisant pour un administrateur.
- [Données de l'exemple factice] → ignorées ; à effacer depuis la console.

## Migration Plan

1. Publier le site et les nouvelles règles dans la console (le fichier conserve la partie `room` du poker à l'identique).
2. Activer le fournisseur « Lien e-mail » ; se connecter sur `admin.html` ; inscrire son identifiant dans `skillMatrix/admins`.
3. Effacer `skillMatrix/skills`, `skillMatrix/members` et `skillMatrix/ratings` depuis la console.
4. Reporter `database.rules.json` dans `poker-planning`.
