// Point d'entrée de l'administration : branche l'interface sur Firebase.
import { firebaseConfig } from './firebase-config.js?v=__VERSION__';
import { showFatal } from './shared.js?v=__VERSION__';

if (!firebaseConfig) {
  showFatal('Configuration Firebase manquante : renseignez site/js/firebase-config.js.');
} else {
  Promise.all([import('./matrix-store.js?v=__VERSION__'), import('./admin.js?v=__VERSION__')])
    .then(([{ createMatrixStore }, { startAdmin }]) => startAdmin(createMatrixStore(firebaseConfig)))
    .catch((error) => {
      console.error(error);
      showFatal('Impossible de charger le service temps réel. Vérifiez votre connexion, puis rechargez la page.');
    });
}
