## Decisions

- Un seul nom en modification à la fois (`editing` = `team`, `skill:<id>` ou `member:<id>`), avec le texte saisi conservé à part : une mise à jour en temps réel de la matrice pendant la saisie ne l'efface pas.
- `mousedown` sur Enregistrer et Annuler empêche le champ de perdre le focus : sinon le rendu différé remplacerait le bouton avant que le clic n'arrive.
- Crayon discret (opacité réduite), pleinement visible au survol ou au focus clavier.
