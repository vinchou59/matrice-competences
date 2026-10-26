## Why

Avant de demander une équipe, les gens veulent voir l'outil et s'en servir. Il faut un bac à sable public, sans risque qu'un visiteur voie ce qu'un autre a écrit, et un moyen simple de demander une équipe à l'administrateur.

## What Changes

- Accueil : une carte « Découvrir l'outil » avec « Essayer la démo », qui ouvre `?equipe=demo`.
- Démo : une équipe fictive déjà remplie (6 personnes, 8 compétences) qui montre chaque cas : compétence couverte, couverte mais fragile, back-up insuffisant, référent insuffisant, personnes qui ne souhaitent pas progresser, cases non notées. Toutes les fonctions de la page d'une équipe y marchent, mais les données restent dans le navigateur du visiteur (localStorage), sans Firebase ; les onglets d'un même navigateur restent synchronisés.
- Sur la démo, la carte « Rejoindre l'équipe » est remplacée par une carte « Démo » : « Demander mon équipe » (e-mail prêt à envoyer à l'administrateur), « Recommencer la démo » (second clic de confirmation), et l'adresse avec « Copier l'adresse ».
- La démo n'apparaît pas dans « Vos équipes ».
- Accueil : « Pour créer votre équipe, écrivez à l'administrateur » devient un lien e-mail.
- Au passage : le texte d'introduction du plan de formation parlait encore de l'ancienne échelle (« niveau 1 ou plus »).

## Capabilities

### New Capabilities

_Aucune._

### Modified Capabilities

- `teams` : exigence « Page d'accueil » modifiée ; exigence « Équipe de démonstration » ajoutée.

## Impact

- Nouveaux modules `site/js/demo-core.js` et `site/js/demo-store.js`, testés (`tests/demo.test.mjs`).
- `app.js`, `ui.js`, `home.js`, `app.css`, README.
- Aucune modification des règles Firebase : la démo n'écrit rien dans la base.
