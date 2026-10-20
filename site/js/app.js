// Point d'entrée : accueil, ou matrice d'une équipe si l'adresse contient `?equipe=`.
import { firebaseConfig } from './firebase-config.js?v=__VERSION__';
import { showFatal } from './shared.js?v=__VERSION__';
import { TEAM_PARAM, isTeamId, MESSAGES } from './matrix-core.js?v=__VERSION__';

const param = new URLSearchParams(location.search).get(TEAM_PARAM);

if (!firebaseConfig) {
  showFatal('Configuration Firebase manquante : renseignez site/js/firebase-config.js.');
} else {
  Promise.all([import('./matrix-store.js?v=__VERSION__'), param === null ? import('./home.js?v=__VERSION__') : import('./ui.js?v=__VERSION__')])
    .then(([{ createMatrixStore }, page]) => {
      const store = createMatrixStore(firebaseConfig);
      if (param === null) return page.startHome(store);
      const teamId = param.trim().toLowerCase();
      if (!isTeamId(teamId)) return page.showTeamNotFound(MESSAGES.teamNotFound);
      return page.startTeam(store, teamId);
    })
    .catch((error) => {
      console.error(error);
      showFatal('Impossible de charger le service temps réel. Vérifiez votre connexion, puis rechargez la page.');
    });
}
