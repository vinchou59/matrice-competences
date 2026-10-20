# matrice-competences

Matrice de compétences de l'équipe : qui est référent, qui est back-up, et l'équipe tient-elle une absence imprévue ?

**Site : https://vinchou59.github.io/matrice-competences/**

Version en ligne du modèle Excel « Skill Matrix » : chaque compétence doit avoir un **référent** et un **back-up** qui atteignent chacun le niveau cible fixé par l'équipe.

## Fonctionnement

- Une **matrice unique** pour l'équipe, partagée en temps réel, sans compte : on ouvre le lien, on choisit son nom dans « Je suis » (ou on s'ajoute), et on note sa colonne, surlignée en orange.
- **Échelle** de 0 à 4 : 0 ne connaît pas et pas intéressé·e, 1 ne connaît pas mais intéressé·e, 2 première expérience, 3 autonome, 4 maîtrise et peut former.
- Le **référent** est la personne la mieux notée sur la compétence, le **back-up** la deuxième (à égalité, ordre alphabétique). Une compétence est **couverte** quand les deux atteignent leur cible.
- **Ajouter / supprimer** : les compétences sous le tableau (nom et cibles) et avec le × de chaque ligne ; les personnes avec « Je suis » ou dans l'onglet Équipe. Une suppression demande un second clic de confirmation et efface aussi les notes concernées. Noms et cibles se modifient directement dans le tableau.
- **Saisie libre (facilitateur)** permet de noter toutes les colonnes, comme dans l'Excel.
- **Simuler une absence** : cliquer sur une ou plusieurs personnes recalcule tout sans elles. La simulation reste sur l'écran de celui qui la fait.
- Onglets :
  - **Matrice** : notes, référent et back-up avec leur niveau / cible, statut (Couvert, Back-up insuffisant, Référent insuffisant) ;
  - **Radars** : cible (bleu) et niveau atteint (orange) pour le référent et pour le back-up, comme l'onglet « Consolidated » de l'Excel ;
  - **Équipe** : pour chaque personne, nombre de rôles de référent et de back-up, et compétences couvertes perdues si elle s'absentait ;
  - **Plan de formation** : compétences sous la cible, de l'écart le plus grand au plus petit, avec les personnes à former en priorité (intéressées, niveau 1 ou plus ; jamais celles notées 0).

## Réseau d'entreprise

Comme pour le poker planning, le VPN de l'entreprise (proxy Zscaler) bloque GitHub Pages et Firebase : ouvrir la matrice hors VPN, ou depuis un téléphone.

## Architecture

Site statique (HTML/CSS/JavaScript, sans build) publié sur GitHub Pages ; les données sont dans Firebase Realtime Database (connexion anonyme), dans la branche `skillMatrix` de la base du projet `poker-planning-vleroy`, partagée avec le poker planning.

- `site/js/matrix-core.js` : logique métier pure (couverture, absences, plan de formation, validations), testée avec Node.js ;
- `site/js/matrix-store.js` : seul module qui parle à Firebase ;
- `site/js/ui.js` : interface ; `site/js/app.js` : point d'entrée ; `site/js/theme.js` : thème clair / sombre ;
- `site/js/firebase-config.js` : configuration web Firebase (publique par nature) ;
- `database.rules.json` : règles de sécurité de **toute** la base (salle du poker planning et matrice). La console Firebase n'accepte qu'un seul fichier de règles par base : garder ce fichier identique à celui de `poker-planning`, et le publier dans la console après chaque modification.

Données :

```
skillMatrix/
  skills/<id>   { label, refTarget, backupTarget, order }
  members/<id>  { name, order }
  ratings/<idPersonne>/<idCompétence>   niveau de 0 à 4
```

## Développement

```sh
npm test                                          # tests de la logique métier
python3 -m http.server 8765 --directory site      # puis http://localhost:8765
```

Chaque push sur `main` lance les tests puis publie `site/` sur GitHub Pages ; un test en échec bloque la publication.

## Méthode

Le projet suit le développement piloté par les spécifications avec [OpenSpec](https://github.com/Fission-AI/OpenSpec) : `openspec/specs/` décrit le comportement attendu, `openspec/changes/` les changements en cours. Commandes Claude Code : `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
