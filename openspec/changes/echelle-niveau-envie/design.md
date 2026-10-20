## Decisions

### Données

```
teamData/<id>/
  scale: 2                                   échelle actuelle (absente = ancienne échelle 0-4)
  levels/<idPersonne>/<idCompétence>: 0..3   niveau
  noProgress/<idPersonne>/<idCompétence>: true   seulement quand la personne ne souhaite pas progresser
  skills/<id>: { …, refTarget: 0..3, backupTarget: 0..3 }
```

- L'envie est stockée seulement en cas d'exception (`noProgress: true`) : le cas par défaut, majoritaire, ne coûte rien.
- Nouveaux chemins `levels` et `noProgress` plutôt que de réinterpréter `ratings` : une ancienne valeur ne peut pas être lue avec la nouvelle échelle par erreur.

### Migration

- `migrationUpdate(raw)` (pur, testé) : renvoie null si `scale` vaut 2, sinon l'écriture groupée qui convertit toutes les notes (y compris des éléments à la corbeille) et toutes les cibles, efface `ratings` et pose `scale: 2`. La page d'une équipe l'applique à l'ouverture, avant d'afficher la matrice.
- Une équipe créée (administration, import Excel) reçoit `scale: 2` d'emblée, pour qu'aucune cible saisie dans la nouvelle échelle ne soit décalée par erreur.
- Règles : `ratings` n'accepte plus que l'effacement ; `scale` n'accepte que 2.

### Affichage

- Cercle SVG : anneau, et secteur de 0, ⅓, ⅔ ou 1 tour rempli avec `--l1`…`--l3` ; « ne souhaite pas progresser » : fond hachuré, cercle à 55 % d'opacité, ✕ en coin. Libellé complet dans l'infobulle et le nom accessible.
- Choix du niveau : fenêtre (même mécanique que l'aperçu d'import), 4 boutons, case « Je veux progresser », « Effacer ma note ». Un clic sur un niveau enregistre aussitôt ; la case aussi.
- Cibles : cercle bleu à contour, `<select>` transparent par-dessus avec les libellés (même mécanique qu'avant).
- Radars : 3 anneaux (Débutant, Autonome, Expert).
