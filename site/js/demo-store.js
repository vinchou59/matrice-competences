// Stockage de l'équipe de démonstration : même interface que matrix-store.js, mais tout reste dans ce
// navigateur (localStorage), sans Firebase. Chaque visiteur a sa propre copie ; les onglets d'un même
// navigateur restent synchronisés. `resetDemo()` remet l'état de départ.

import { DEMO_TEAM_ID, demoSeed } from './demo-core.js?v=__VERSION__';

export const DEMO_STORAGE_KEY = 'matrice-competences.demo';

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // stockage bloqué : la démo fonctionne quand même, le temps de la visite
  }
}

/**
 * `storage` : objet type localStorage (null : en mémoire seulement) ; `events` : cible des événements
 * `storage` des autres onglets ; `now` : horloge.
 */
export function createDemoStore({ storage = browserStorage(), events = globalThis, now = () => Date.now() } = {}) {
  const fresh = () => {
    const { team, data } = demoSeed(now());
    return { teams: { [DEMO_TEAM_ID]: team }, teamData: { [DEMO_TEAM_ID]: data } };
  };
  const load = (text) => {
    try {
      const state = JSON.parse(text);
      if (state?.teams?.[DEMO_TEAM_ID] && state.teamData) return state;
    } catch { /* contenu illisible : on repart de zéro */ }
    return null;
  };
  let saved = null;
  try { saved = storage?.getItem(DEMO_STORAGE_KEY) ?? null; } catch { /* idem */ }
  let state = (saved && load(saved)) || fresh();

  const subs = new Set();
  const read = (path) => path.split('/').reduce((o, k) => (o == null ? undefined : o[k]), state);
  const notify = () => setTimeout(() => subs.forEach((f) => f()), 0);
  const save = () => {
    try { storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); } catch { /* plein ou bloqué : reste en mémoire */ }
  };
  const writePath = (path, value) => {
    const parts = path.split('/');
    const chain = [state];
    for (const k of parts.slice(0, -1)) {
      const o = chain.at(-1);
      if (typeof o[k] !== 'object' || o[k] === null) o[k] = {};
      chain.push(o[k]);
    }
    if (value !== null && value !== undefined) {
      chain.at(-1)[parts.at(-1)] = structuredClone(value);
      return;
    }
    delete chain.at(-1)[parts.at(-1)];
    // Comme Firebase : un nœud devenu vide disparaît.
    for (let i = chain.length - 1; i > 0 && !Object.keys(chain[i]).length; i -= 1) delete chain[i - 1][parts[i - 1]];
  };
  /** Écriture groupée, chemins relatifs à `base`, comme `update` de Firebase. */
  const write = (paths, base = '') => {
    for (const [path, value] of Object.entries(paths)) writePath(base ? `${base}/${path}` : path, value);
    save();
    notify();
    return Promise.resolve(true);
  };
  const watch = (path, callback, fallback = null) => {
    const f = () => callback(structuredClone(read(path) ?? fallback));
    subs.add(f);
    setTimeout(f, 0);
    return () => subs.delete(f);
  };

  // Un autre onglet a modifié la démo : on reprend son état.
  events?.addEventListener?.('storage', (event) => {
    if (event.key !== DEMO_STORAGE_KEY) return;
    state = (event.newValue && load(event.newValue)) || fresh();
    notify();
  });

  let counter = 0;
  const newKey = () => `d${now().toString(36)}${(counter += 1).toString(36)}`;

  function teamData(teamId) {
    const base = `teamData/${teamId}`;
    const add = (collection, value) => {
      const key = newKey();
      return write({ [`${collection}/${key}`]: value }, base).then(() => key);
    };
    return {
      addSkill: (skill) => add('skills', skill),
      updateSkill: (skillId, patch) => write(Object.fromEntries(Object.entries(patch).map(([k, v]) => [`skills/${skillId}/${k}`, v])), base),
      addMember: (member) => add('members', member),
      renameMember: (memberId, name) => write({ [`members/${memberId}/name`]: name }, base),
      trash: (kind, id) => write({ [`${kind}s/${id}/deletedAt`]: now() }, base),
      restore: (kind, id) => write({ [`${kind}s/${id}/deletedAt`]: null }, base),
      setRating: (memberId, skillId, level, wants) => write({
        [`levels/${memberId}/${skillId}`]: Number.isInteger(level) ? level : null,
        [`noProgress/${memberId}/${skillId}`]: Number.isInteger(level) && !wants ? true : null,
      }, base),
      apply: (paths) => write(paths, base),
    };
  }

  return {
    isDemo: true,
    start: () => Promise.resolve('demo-visitor'),
    serverNow: now,
    onConnection: (callback) => { callback(true); return () => {}; },
    newKey,
    writeImport: (paths) => write(paths),
    get serverTime() { return now(); },
    onTeam: (teamId, callback) => watch(`teams/${teamId}`, callback),
    getTeam: (teamId) => Promise.resolve(structuredClone(read(`teams/${teamId}`) ?? null)),
    onTeamData: (teamId, callback) => watch(`teamData/${teamId}`, callback, {}),
    renameTeam: (teamId, name) => write({ [`teams/${teamId}/name`]: name }),
    teamData,
    isAdmin: () => Promise.resolve(false),
    /** Remet la démo dans son état de départ. */
    resetDemo() {
      state = fresh();
      save();
      notify();
      return Promise.resolve(true);
    },
  };
}
