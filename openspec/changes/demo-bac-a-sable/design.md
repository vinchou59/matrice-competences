## Context

La page d'une équipe (`ui.js`) reçoit un « store » : Firebase en production, un faux store pour les essais. La démo réutilise ce découpage.

## Goals / Non-Goals

**Goals :** montrer l'outil sur des données parlantes, sans compte ni risque ; amener à demander une équipe.

**Non-Goals :** montrer la mise à jour en direct entre plusieurs personnes (à faire sur une vraie équipe de test) ; créer soi-même son équipe.

## Decisions

- **Données dans le navigateur, pas dans la base.** Une démo partagée dans Firebase aurait montré le temps réel, mais n'importe qui pourrait y écrire un nom déplacé visible par tous jusqu'à la remise à zéro. Ici chaque visiteur a sa copie, et la démo ne dépend même pas de Firebase.
- **`demo-store.js` a la même interface que `matrix-store.js`** (écritures groupées par chemins, abonnements, suppression des nœuds vides comme Firebase) : `ui.js` ne change que pour la carte « Démo », le pied de page et l'oubli dans les équipes récentes.
- **`?equipe=demo`** : jamais un identifiant d'équipe (12 caractères), donc aucune confusion possible ; `app.js` aiguille avant de charger Firebase.
- **Événement `storage`** : deux onglets d'un même navigateur restent synchronisés.
- **Stockage bloqué ou illisible** : la démo repart de l'état de départ et fonctionne en mémoire le temps de la visite.
- **Contact** : lien `mailto:` avec un objet et un message à compléter (nom de l'équipe, personnes, compétences, modèle Excel en pièce jointe), et l'adresse affichée avec « Copier l'adresse » pour qui n'a pas de messagerie installée. L'adresse est assemblée à l'exécution pour ne pas l'offrir telle quelle aux robots.

## Risks / Trade-offs

- L'adresse e-mail devient publique (page et dépôt) : choix de l'administrateur.
- Les essais sur la démo ne suivent pas le visiteur d'un appareil à l'autre : c'est voulu.
