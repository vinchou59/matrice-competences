// Seul module qui parle à Firebase : connexion anonyme, lecture en temps réel et écritures de la matrice.
// Les règles de sécurité (database.rules.json) appliquent les mêmes contraintes côté base.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getDatabase, ref, onValue, push, set, update, remove } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import { deleteSkillUpdate, deleteMemberUpdate } from './matrix-core.js?v=__VERSION__';

/** Branche de la base réservée à la matrice (la base est partagée avec le poker planning). */
const ROOT = 'skillMatrix';

const ok = () => true;
const failed = (error) => {
  console.error('Écriture refusée :', error?.code ?? error);
  return false;
};

export function createMatrixStore(firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  const at = (path) => ref(db, `${ROOT}/${path}`);

  /** Connexion anonyme : l'identifiant est conservé par le navigateur. */
  function start() {
    return new Promise((resolve, reject) => {
      const stop = onAuthStateChanged(auth, (user) => {
        if (user) { stop(); resolve(user.uid); }
      }, reject);
      signInAnonymously(auth).catch(reject);
    });
  }

  /** Abonnement à toute la matrice ; `callback(raw)` à chaque changement. */
  function onMatrix(callback, onError) {
    return onValue(ref(db, ROOT), (snapshot) => callback(snapshot.val() ?? {}), onError);
  }

  /** Abonnement à l'état de la connexion temps réel. */
  function onConnection(callback) {
    return onValue(ref(db, '.info/connected'), (snapshot) => callback(snapshot.val() === true));
  }

  /** Ajoute une compétence ; renvoie son identifiant, ou null si l'écriture est refusée. */
  async function addSkill({ label, refTarget, backupTarget, order }) {
    const skillRef = push(at('skills'));
    return set(skillRef, { label, refTarget, backupTarget, order }).then(() => skillRef.key, (e) => (failed(e), null));
  }

  function updateSkill(skillId, patch) {
    return update(at(`skills/${skillId}`), patch).then(ok, failed);
  }

  function deleteSkill(skillId, memberIds) {
    return update(ref(db, ROOT), deleteSkillUpdate(skillId, memberIds)).then(ok, failed);
  }

  /** Ajoute une personne ; renvoie son identifiant, ou null si l'écriture est refusée. */
  async function addMember({ name, order }) {
    const memberRef = push(at('members'));
    return set(memberRef, { name, order }).then(() => memberRef.key, (e) => (failed(e), null));
  }

  function renameMember(memberId, name) {
    return set(at(`members/${memberId}/name`), name).then(ok, failed);
  }

  function deleteMember(memberId) {
    return update(ref(db, ROOT), deleteMemberUpdate(memberId)).then(ok, failed);
  }

  /** Enregistre un niveau (0 à 4), ou efface la note avec `null`. */
  function setRating(memberId, skillId, level) {
    const target = at(`ratings/${memberId}/${skillId}`);
    return (level === null ? remove(target) : set(target, level)).then(ok, failed);
  }

  return { start, onMatrix, onConnection, addSkill, updateSkill, deleteSkill, addMember, renameMember, deleteMember, setRating };
}
