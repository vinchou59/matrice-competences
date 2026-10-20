## Decisions

- Glisser-déposer par les événements pointeur (souris, doigt, stylet) plutôt que par l'API HTML5 de glisser-déposer, absente sur téléphone. Poignées en `touch-action: none` pour que le geste ne fasse pas défiler la page ; seuil de 5 px avant de commencer, pour qu'un simple clic ne déplace rien.
- Point d'insertion calculé d'après le milieu de chaque ligne (ou colonne) ; indicateur par un trait bleu, élément déplacé estompé ; défilement automatique près des bords de la page et du tableau.
- Enregistrement : `moveTo` puis `reorderUpdate`, qui renumérote `order` de 1 à n et n'écrit que les positions modifiées, en une écriture groupée.
- Rendu pendant le geste différé jusqu'au relâchement.
- Rendu pendant une saisie : au lieu de différer le rendu tant qu'un champ a le focus (cause du tableau non mis à jour après Entrée), le rendu mémorise l'élément actif, la sélection et les valeurs des champs nommés, puis les restaure.
