// Seul module qui parle à Firebase : connexion (anonyme, ou Google pour l'administrateur), lecture en temps réel
// et écritures des équipes. Les règles de sécurité (database.rules.json) appliquent les mêmes contraintes côté base.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getDatabase, ref, onValue, get, push, set, update, remove, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import { newTeamId, purgeTeamUpdate } from './matrix-core.js?v=__VERSION__';

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
  let serverOffset = 0;

  /** Connexion : reprend la session du navigateur (anonyme ou Google), sinon connexion anonyme. */
  function start() {
    getRedirectResult(auth).catch(() => {}); // retour d'une connexion Google par redirection
    return new Promise((resolve, reject) => {
      const stop = onAuthStateChanged(auth, (user) => {
        if (user) {
          stop();
          onValue(ref(db, '.info/serverTimeOffset'), (snap) => { serverOffset = snap.val() ?? 0; });
          resolve(user.uid);
        } else {
          signInAnonymously(auth).catch(reject);
        }
      }, reject);
    });
  }

  /** Heure actuelle selon le serveur, pour juger les échéances de purge comme les règles de sécurité. */
  function serverNow() {
    return Date.now() + serverOffset;
  }

  function onConnection(callback) {
    return onValue(ref(db, '.info/connected'), (snapshot) => callback(snapshot.val() === true));
  }

  // ---------------------------------------------------------------- Équipes

  /** Crée une équipe vide ; renvoie son identifiant, ou null si l'écriture est refusée. */
  function createTeam(name) {
    const teamId = newTeamId();
    return set(at(`teams/${teamId}`), { name, createdAt: serverTimestamp() }).then(() => teamId, (e) => (failed(e), null));
  }

  /** Abonnement à la fiche d'une équipe : `callback(raw | null)`. */
  function onTeam(teamId, callback, onError) {
    return onValue(at(`teams/${teamId}`), (snapshot) => callback(snapshot.val()), onError);
  }

  /** Lecture ponctuelle de la fiche d'une équipe (accueil). `undefined` si la lecture échoue. */
  function getTeam(teamId) {
    return get(at(`teams/${teamId}`)).then((snapshot) => snapshot.val(), () => undefined);
  }

  /** Abonnement aux données d'une équipe (compétences, personnes, notes). */
  function onTeamData(teamId, callback, onError) {
    return onValue(at(`teamData/${teamId}`), (snapshot) => callback(snapshot.val() ?? {}), onError);
  }

  const renameTeam = (teamId, name) => set(at(`teams/${teamId}/name`), name).then(ok, failed);
  const trashTeam = (teamId) => set(at(`teams/${teamId}/deletedAt`), serverTimestamp()).then(ok, failed);
  const restoreTeam = (teamId) => remove(at(`teams/${teamId}/deletedAt`)).then(ok, failed);
  /** Suppression définitive (refusée par les règles avant 90 jours, sauf pour l'administrateur). */
  const purgeTeam = (teamId) => update(ref(db, ROOT), purgeTeamUpdate(teamId)).then(ok, failed);

  // ---------------------------------------------------------------- Données d'une équipe

  function teamData(teamId) {
    const base = `teamData/${teamId}`;
    const add = (collection, value) => {
      const itemRef = push(at(`${base}/${collection}`));
      return set(itemRef, value).then(() => itemRef.key, (e) => (failed(e), null));
    };
    return {
      addSkill: (skill) => add('skills', skill),
      updateSkill: (skillId, patch) => update(at(`${base}/skills/${skillId}`), patch).then(ok, failed),
      addMember: (member) => add('members', member),
      renameMember: (memberId, name) => set(at(`${base}/members/${memberId}/name`), name).then(ok, failed),
      /** Met à la corbeille (`kind` : 'skill' ou 'member'), notes conservées. */
      trash: (kind, id) => set(at(`${base}/${kind}s/${id}/deletedAt`), serverTimestamp()).then(ok, failed),
      restore: (kind, id) => remove(at(`${base}/${kind}s/${id}/deletedAt`)).then(ok, failed),
      /** Enregistre un niveau (0 à 4), ou efface la note avec `null`. */
      setRating: (memberId, skillId, level) => {
        const target = at(`${base}/ratings/${memberId}/${skillId}`);
        return (level === null ? remove(target) : set(target, level)).then(ok, failed);
      },
      /** Écriture groupée atomique, chemins relatifs aux données de l'équipe (purge). */
      apply: (paths) => update(at(base), paths).then(ok, failed),
    };
  }

  // ---------------------------------------------------------------- Administration

  /** Abonnement à l'utilisateur connecté : `callback({ uid, isAnonymous, email, name })`. */
  function onUser(callback) {
    return onAuthStateChanged(auth, (user) => {
      if (user) callback({ uid: user.uid, isAnonymous: user.isAnonymous, email: user.email ?? '', name: user.displayName ?? '' });
    });
  }

  /** Connexion Google : fenêtre, ou redirection si la fenêtre est bloquée. */
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      return true;
    } catch (error) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return true;
      }
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') return false;
      throw error;
    }
  }

  /** Déconnexion, puis retour à la connexion anonyme. */
  async function signOutAdmin() {
    await signOut(auth);
    await signInAnonymously(auth);
  }

  /** L'utilisateur connecté est-il inscrit dans `skillMatrix/admins` ? */
  function isAdmin(uid) {
    return get(at(`admins/${uid}`)).then((snapshot) => snapshot.exists(), () => false);
  }

  /** Abonnement à toutes les équipes et à leurs données (administrateur seulement). */
  function onAllTeams(callback, onError) {
    let teams = null;
    let data = null;
    const emit = () => { if (teams !== null && data !== null) callback(teams, data); };
    const stopTeams = onValue(at('teams'), (s) => { teams = s.val() ?? {}; emit(); }, onError);
    const stopData = onValue(at('teamData'), (s) => { data = s.val() ?? {}; emit(); }, onError);
    return () => { stopTeams(); stopData(); };
  }

  return {
    start, serverNow, onConnection,
    createTeam, onTeam, getTeam, onTeamData, renameTeam, trashTeam, restoreTeam, purgeTeam, teamData,
    onUser, signInWithGoogle, signOutAdmin, isAdmin, onAllTeams,
  };
}
