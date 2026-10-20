## Decisions

- Icône de corbeille en SVG en ligne (`currentColor`), dans un bouton `aria-expanded` avec un libellé accessible « Afficher la corbeille (2 éléments) » / « Masquer la corbeille ». Le compteur est affiché à côté de l'icône ; sans élément, le bouton est désactivé et le compteur indique 0.
- Corbeille repliée par défaut à chaque chargement (aucune mémorisation), pour rester discrète.
- Sur la page d'une équipe, l'onglet « Corbeille » garde sa place mais n'affiche que l'icône et le compteur (libellé accessible « Corbeille »).
- Création depuis l'administration : même validation du nom que l'accueil (`validateTeamName`), puis `openShare` sur la nouvelle équipe. L'équipe est aussi ajoutée aux équipes récentes de ce navigateur.
