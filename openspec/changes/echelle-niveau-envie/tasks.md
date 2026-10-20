## 1. Logique et migration

- [x] 1.1 Échelle à 4 niveaux, envie (`noProgress`), `parseMatrix`, plan de formation, purge, cibles par défaut. Vérification : tests mis à jour, un test par scénario.
- [x] 1.2 `migrationUpdate` (notes, cibles, corbeille comprise, `scale: 2`). Vérification : tests (exemple Excel converti, équipe déjà convertie, équipe vide).
- [ ] 1.3 Règles et stockage (`levels`, `noProgress`, `scale`, `ratings` en effacement seul) ; `scale: 2` à la création d'une équipe. Vérification : sur la vraie base après publication (niveau 4 refusé, migration de l'équipe de test).

## 2. Interface

- [x] 2.1 Cercles et marquage « ne souhaite pas progresser » dans la matrice, la légende, l'échelle, le plan, les cibles ; radars à 3 anneaux.
- [x] 2.2 Fenêtre de choix du niveau (niveaux, « Je veux progresser », « Effacer ma note »).
- [x] 2.3 Vérification : essai automatisé dans Chromium (migration à l'ouverture, saisie, envie, cible, plan, 390 px, sombre), captures.
- [x] 2.4 README.
