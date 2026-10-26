// Point d'entrée : accueil, matrice d'une équipe si l'adresse contient `?equipe=`, ou démo (`?equipe=demo`),
// qui reste dans le navigateur et n'a pas besoin de Firebase.
import { firebaseConfig } from './firebase-config.js?v=__VERSION__';
import { showFatal } from './shared.js?v=__VERSION__';
import { TEAM_PARAM, isTeamId, MESSAGES } from './matrix-core.js?v=__VERSION__';
import { DEMO_TEAM_ID } from './demo-core.js?v=__VERSION__';

const param = new URLSearchParams(location.search).get(TEAM_PARAM);
const teamId = param?.trim().toLowerCase() ?? null;

if (teamId === DEMO_TEAM_ID) {
  Promise.all([import('./demo-store.js?v=__VERSION__'), import('./ui.js?v=__VERSION__')])
    .then(([{ createDemoStore }, page]) => page.startTeam(createDemoStore(), DEMO_TEAM_ID, { demo: true }))
    .catch((error) => {
      console.error(error);
      showFatal('Impossible de charger la démo. Rechargez la page.');
    });
} else if (!firebaseConfig) {
  showFatal('Configuration Firebase manquante : renseignez site/js/firebase-config.js.');
} else {
  Promise.all([import('./matrix-store.js?v=__VERSION__'), teamId === null ? import('./home.js?v=__VERSION__') : import('./ui.js?v=__VERSION__')])
    .then(([{ createMatrixStore }, page]) => {
      const store = createMatrixStore(firebaseConfig);
      if (teamId === null) return page.startHome(store);
      if (!isTeamId(teamId)) return page.showTeamNotFound(MESSAGES.teamNotFound);
      return page.startTeam(store, teamId);
    })
    .catch((error) => {
      console.error(error);
      showFatal('Impossible de charger le service temps réel. Vérifiez votre connexion, puis rechargez la page.');
    });
}
