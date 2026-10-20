// Logique métier pure de la matrice de compétences : aucune dépendance au DOM ni à Firebase.
// Importée telle quelle par l'interface (navigateur) et par les tests (Node.js).

/** Échelle des niveaux, de 0 (Aucun) à 3 (Expert). L'envie de progresser est notée à part. */
export const LEVELS = Object.freeze(['Aucun', 'Débutant', 'Autonome', 'Expert']);
export const LEVEL_HINTS = Object.freeze([
  'Pas encore d\'expérience',
  'Première expérience, a besoin d\'aide',
  'Travaille seul·e sur le sujet',
  'Maîtrise et peut former les autres',
]);
export const LEVEL_MAX = LEVELS.length - 1;
/** Version de l'échelle enregistrée avec chaque équipe (absente : ancienne échelle de 0 à 4). */
export const SCALE_VERSION = 2;

/** Longueurs maximales (mêmes valeurs dans database.rules.json). */
export const NAME_MAX_LENGTH = 30;
export const LABEL_MAX_LENGTH = 60;

/** Cibles par défaut : Autonome pour le référent, Débutant pour le back-up. */
export const DEFAULT_TARGETS = Object.freeze({ refTarget: 2, backupTarget: 1 });

export const STATUS = Object.freeze({ ok: 'ok', backup: 'warn', referent: 'bad' });
export const STATUS_LABELS = Object.freeze({
  ok: 'Couvert',
  warn: 'Back-up insuffisant',
  bad: 'Référent insuffisant',
});

export const MESSAGES = Object.freeze({
  nameLength: `Saisissez un nom de 1 à ${NAME_MAX_LENGTH} caractères`,
  nameTaken: 'Cette personne existe déjà : choisissez-la dans la liste',
  labelLength: `Saisissez un nom de compétence de 1 à ${LABEL_MAX_LENGTH} caractères`,
  labelTaken: 'Cette compétence existe déjà',
  teamNameLength: 'Saisissez un nom d\'équipe de 1 à 50 caractères',
  restoreMemberTaken: 'Une personne active porte déjà ce nom : renommez-la avant de rétablir celle-ci',
  restoreSkillTaken: 'Une compétence active porte déjà ce nom : renommez-la avant de rétablir celle-ci',
  teamNotFound: 'Équipe introuvable : vérifiez le lien',
  invalidLink: 'Lien non reconnu : collez l\'adresse complète de l\'équipe ou son identifiant de 12 caractères',
});

export function isLevel(value) {
  return Number.isInteger(value) && value >= 0 && value <= LEVEL_MAX;
}

/** Texte tel qu'il sera enregistré : espaces de bord retirés, espaces multiples réduits. */
export function normalizeText(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

const sameText = (a, b) => normalizeText(a).toLocaleLowerCase('fr') === normalizeText(b).toLocaleLowerCase('fr');

function validateText(raw, max, existing, exceptId, messages) {
  const text = normalizeText(raw);
  if (text.length < 1 || text.length > max) return { ok: false, error: messages.length };
  if (existing.some((item) => item.id !== exceptId && sameText(item.text, text))) return { ok: false, error: messages.taken };
  return { ok: true, text };
}

/** Vérifie le nom d'une personne : longueur, et unicité dans l'équipe (sans tenir compte de la casse). */
export function validateMemberName(raw, members = [], exceptId = null) {
  const result = validateText(raw, NAME_MAX_LENGTH, members.map((m) => ({ id: m.id, text: m.name })), exceptId,
    { length: MESSAGES.nameLength, taken: MESSAGES.nameTaken });
  return result.ok ? { ok: true, name: result.text } : result;
}

/** Vérifie le nom d'une compétence : longueur, et unicité dans la matrice. */
export function validateSkillLabel(raw, skills = [], exceptId = null) {
  const result = validateText(raw, LABEL_MAX_LENGTH, skills.map((s) => ({ id: s.id, text: s.label })), exceptId,
    { length: MESSAGES.labelLength, taken: MESSAGES.labelTaken });
  return result.ok ? { ok: true, label: result.text } : result;
}

/** Position d'un nouvel élément : après le dernier. */
export function nextOrder(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0) + 1;
}

const byOrder = (key) => (a, b) => a.order - b.order || a[key].localeCompare(b[key], 'fr');
const deletedAtOf = (item) => (Number.isFinite(item?.deletedAt) ? item.deletedAt : null);

/**
 * Transforme les données brutes d'une équipe en données prêtes à l'emploi, en ignorant tout ce qui est mal formé.
 * Brut : { skills: {id: {label, refTarget, backupTarget, order, deletedAt?}}, members: {id: {name, order, deletedAt?}},
 *          levels: {memberId: {skillId: 0..3}}, noProgress: {memberId: {skillId: true}} }
 * Chaque personne porte `ratings` (niveau par compétence) et `noProgress` (compétences où elle ne souhaite pas progresser).
 * Les éléments à la corbeille (`deletedAt`) et leurs notes ne comptent pas : ils sont rendus à part dans `trash`.
 */
export function parseMatrix(raw) {
  const allSkills = Object.entries(raw?.skills ?? {})
    .filter(([, s]) => s && typeof s.label === 'string')
    .map(([id, s]) => ({
      id,
      label: s.label,
      refTarget: isLevel(s.refTarget) ? s.refTarget : DEFAULT_TARGETS.refTarget,
      backupTarget: isLevel(s.backupTarget) ? s.backupTarget : DEFAULT_TARGETS.backupTarget,
      order: Number(s.order) || 0,
      deletedAt: deletedAtOf(s),
    }))
    .sort(byOrder('label'));
  const allMembers = Object.entries(raw?.members ?? {})
    .filter(([, m]) => m && typeof m.name === 'string')
    .map(([id, m]) => ({ id, name: m.name, order: Number(m.order) || 0, deletedAt: deletedAtOf(m) }))
    .sort(byOrder('name'));

  const skills = allSkills.filter((s) => s.deletedAt === null).map(({ deletedAt, ...s }) => s);
  const activeSkillIds = new Set(skills.map((s) => s.id));
  const members = allMembers.filter((m) => m.deletedAt === null).map(({ deletedAt, ...m }) => {
    const ratings = {};
    for (const [skillId, level] of Object.entries(raw?.levels?.[m.id] ?? {})) {
      if (activeSkillIds.has(skillId) && isLevel(level)) ratings[skillId] = level;
    }
    const noProgress = {};
    for (const [skillId, flag] of Object.entries(raw?.noProgress?.[m.id] ?? {})) {
      if (activeSkillIds.has(skillId) && flag === true) noProgress[skillId] = true;
    }
    return { ...m, ratings, noProgress };
  });

  const countRatings = (predicate) => Object.entries(raw?.levels ?? {})
    .reduce((n, [memberId, byskill]) => n + Object.entries(byskill ?? {}).filter(([skillId, v]) => isLevel(v) && predicate(memberId, skillId)).length, 0);
  const trash = [
    ...allMembers.filter((m) => m.deletedAt !== null)
      .map((m) => ({ kind: 'member', id: m.id, name: m.name, deletedAt: m.deletedAt, ratingCount: countRatings((mid) => mid === m.id) })),
    ...allSkills.filter((s) => s.deletedAt !== null)
      .map((s) => ({ kind: 'skill', id: s.id, name: s.label, deletedAt: s.deletedAt, ratingCount: countRatings((mid, sid) => sid === s.id) })),
  ].sort((a, b) => b.deletedAt - a.deletedAt);

  return { skills, members, trash };
}

/** Nombre de compétences notées par une personne. */
export function ratedCount(member, skills) {
  return skills.filter((s) => isLevel(member.ratings?.[s.id])).length;
}

/**
 * Évalue une compétence pour un groupe de personnes (les présents).
 * Référent : la personne la mieux notée ; back-up : la deuxième (à égalité, ordre alphabétique).
 * Une compétence est couverte quand le référent et le back-up atteignent chacun leur niveau cible.
 */
export function assessSkill(skill, pool) {
  const rated = pool
    .map((member) => ({ member, level: member.ratings?.[skill.id], wants: member.noProgress?.[skill.id] !== true }))
    .filter((entry) => isLevel(entry.level))
    .sort((a, b) => b.level - a.level || a.member.name.localeCompare(b.member.name, 'fr'));
  const referent = rated[0] ?? null;
  const backup = rated[1] ?? null;
  const refLevel = referent?.level ?? 0;
  const backupLevel = backup?.level ?? 0;
  const refOk = refLevel >= skill.refTarget;
  const backupOk = backupLevel >= skill.backupTarget;
  const status = refOk && backupOk ? STATUS.ok : refOk ? STATUS.backup : STATUS.referent;
  return { rated, referent, backup, refLevel, backupLevel, refOk, backupOk, status };
}

/** Évalue toute la matrice pour un groupe de personnes. */
export function overview(skills, pool) {
  const results = skills.map((skill) => ({ skill, assessment: assessSkill(skill, pool) }));
  return {
    results,
    total: skills.length,
    covered: results.filter((r) => r.assessment.status === STATUS.ok).length,
    refOk: results.filter((r) => r.assessment.refOk).length,
    backupOk: results.filter((r) => r.assessment.backupOk).length,
    atRisk: results.filter((r) => r.assessment.status !== STATUS.ok).length,
  };
}

/** Personnes présentes : toute l'équipe moins les absences simulées. */
export function presentMembers(members, absentIds) {
  const absent = new Set(absentIds);
  return members.filter((m) => !absent.has(m.id));
}

/**
 * Rôle et poids d'une personne dans l'équipe présente : nombre de fois référente et back-up,
 * et compétences couvertes qui ne le seraient plus si elle s'absentait.
 */
export function memberImpact(skills, pool, memberId) {
  const base = overview(skills, pool);
  const without = overview(skills, pool.filter((m) => m.id !== memberId));
  let referentCount = 0;
  let backupCount = 0;
  for (const { assessment } of base.results) {
    if (assessment.referent?.member.id === memberId) referentCount += 1;
    if (assessment.backup?.member.id === memberId) backupCount += 1;
  }
  const lost = base.results
    .filter((r, i) => r.assessment.status === STATUS.ok && without.results[i].assessment.status !== STATUS.ok)
    .map((r) => r.skill);
  return { referentCount, backupCount, lost };
}

/**
 * Plan de formation : compétences non couvertes, de l'écart le plus grand au plus petit.
 * Candidats : personnes présentes qui souhaitent progresser, sous le niveau visé, les plus avancées d'abord.
 * Le référent déjà à sa cible n'est pas proposé pour le rôle de back-up. Au plus 3 candidats.
 */
export function trainingPlan(skills, pool, maxCandidates = 3) {
  return overview(skills, pool).results
    .filter((r) => r.assessment.status !== STATUS.ok)
    .map(({ skill, assessment: a }) => {
      const refGap = Math.max(0, skill.refTarget - a.refLevel);
      const backupGap = Math.max(0, skill.backupTarget - a.backupLevel);
      const role = a.refOk ? 'backup' : 'referent';
      const need = a.refOk ? skill.backupTarget : skill.refTarget;
      const candidates = a.rated
        .filter((e) => e.wants && e.level < need)
        .filter((e) => !(role === 'backup' && e.member.id === a.referent?.member.id))
        .slice(0, maxCandidates)
        .map((e) => ({ member: e.member, level: e.level, target: need, steps: need - e.level }));
      return {
        skill,
        assessment: a,
        role,
        totalGap: refGap + backupGap,
        candidates,
        nobodyInterested: a.rated.length > 0 && a.rated.every((e) => !e.wants),
        unrated: pool.length - a.rated.length,
      };
    })
    .sort((x, y) => y.totalGap - x.totalGap || x.skill.order - y.skill.order);
}

// ---------------------------------------------------------------- Corbeille et purge

/** Durée en corbeille avant suppression définitive (même valeur dans database.rules.json). */
export const PURGE_MS = 90 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Un élément est purgeable s'il est à la corbeille depuis plus de 90 jours (heure du serveur). */
export function isPurgeable(deletedAt, now) {
  return Number.isFinite(deletedAt) && deletedAt < now - PURGE_MS;
}

/** Jours restants avant la suppression définitive (0 si l'échéance est passée). */
export function daysBeforePurge(deletedAt, now) {
  return Math.max(0, Math.ceil((deletedAt + PURGE_MS - now) / DAY_MS));
}

/**
 * Vérifie qu'un élément de la corbeille peut être rétabli : son nom ne doit pas avoir été repris entre-temps.
 * `item` vient de `parseMatrix(...).trash` ; `matrix` est le résultat de `parseMatrix`.
 */
export function checkRestore(item, matrix) {
  const result = item.kind === 'member'
    ? validateMemberName(item.name, matrix.members)
    : validateSkillLabel(item.name, matrix.skills);
  if (result.ok || result.error === MESSAGES.nameLength || result.error === MESSAGES.labelLength) return { ok: true };
  return { ok: false, error: item.kind === 'member' ? MESSAGES.restoreMemberTaken : MESSAGES.restoreSkillTaken };
}

/**
 * Purge des personnes et compétences d'une équipe à la corbeille depuis plus de 90 jours, avec leurs notes,
 * en une écriture atomique (chemins relatifs aux données de l'équipe). Renvoie null s'il n'y a rien à purger.
 */
/**
 * Suppression définitive d'une personne ou d'une compétence et de ses notes, en une écriture atomique
 * (chemins relatifs aux données de l'équipe). `kind` : 'member' ou 'skill'.
 */
export function purgeItemUpdate(raw, kind, id) {
  if (kind === 'member') return { [`members/${id}`]: null, [`levels/${id}`]: null, [`noProgress/${id}`]: null };
  const update = { [`skills/${id}`]: null };
  for (const branch of ['levels', 'noProgress']) {
    for (const [memberId, bySkill] of Object.entries(raw?.[branch] ?? {})) {
      if (bySkill?.[id] !== undefined) update[`${branch}/${memberId}/${id}`] = null;
    }
  }
  return update;
}

export function purgeTeamDataUpdate(raw, now) {
  const update = {};
  for (const [id, m] of Object.entries(raw?.members ?? {})) {
    if (isPurgeable(m?.deletedAt, now)) Object.assign(update, purgeItemUpdate(raw, 'member', id));
  }
  for (const [id, s] of Object.entries(raw?.skills ?? {})) {
    if (!isPurgeable(s?.deletedAt, now)) continue;
    for (const [path, value] of Object.entries(purgeItemUpdate(raw, 'skill', id))) {
      // Inutile d'effacer une note d'une personne déjà purgée en entier.
      const memberPath = path.split('/').slice(0, 2).join('/');
      if (!(path.split('/').length === 3 && memberPath in update)) update[path] = value;
    }
  }
  return Object.keys(update).length ? update : null;
}

/** Suppression définitive d'une équipe et de toutes ses données (chemins relatifs à la racine de la matrice). */
export function purgeTeamUpdate(teamId) {
  return { [`teams/${teamId}`]: null, [`teamData/${teamId}`]: null };
}

// ---------------------------------------------------------------- Équipes

export const TEAM_ID_LENGTH = 12;
const TEAM_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const TEAM_NAME_MAX_LENGTH = 50;
/** Paramètre d'adresse qui désigne une équipe. */
export const TEAM_PARAM = 'equipe';

export function isTeamId(value) {
  return typeof value === 'string' && new RegExp(`^[a-z0-9]{${TEAM_ID_LENGTH}}$`).test(value);
}

/** Identifiant aléatoire d'équipe (environ 62 bits) : impossible à deviner. */
export function newTeamId(randomValues = (array) => globalThis.crypto.getRandomValues(array)) {
  const bytes = randomValues(new Uint8Array(TEAM_ID_LENGTH * 2));
  let id = '';
  // Rejet des octets >= 252 pour un tirage uniforme parmi 36 caractères.
  for (const byte of bytes) {
    if (byte < 252) id += TEAM_ID_ALPHABET[byte % 36];
    if (id.length === TEAM_ID_LENGTH) return id;
  }
  return newTeamId(randomValues);
}

/** Retrouve un identifiant d'équipe dans une saisie : identifiant seul, ou adresse contenant `?equipe=`. */
export function parseTeamId(text) {
  const value = String(text ?? '').trim();
  if (isTeamId(value.toLowerCase())) return value.toLowerCase();
  try {
    const id = new URL(value).searchParams.get(TEAM_PARAM)?.trim().toLowerCase();
    return isTeamId(id) ? id : null;
  } catch {
    return null;
  }
}

/** Adresse d'une équipe à partir de l'adresse de base du site. */
export function teamUrl(baseUrl, teamId) {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set(TEAM_PARAM, teamId);
  return url.toString();
}

export function validateTeamName(raw) {
  const name = normalizeText(raw);
  if (name.length < 1 || name.length > TEAM_NAME_MAX_LENGTH) return { ok: false, error: MESSAGES.teamNameLength };
  return { ok: true, name };
}

/** Fiche d'une équipe telle que stockée ({ name, createdAt, deletedAt? }), ou null si absente ou mal formée. */
export function parseTeam(id, raw) {
  if (!raw || typeof raw.name !== 'string') return null;
  return { id, name: raw.name, createdAt: Number(raw.createdAt) || 0, deletedAt: deletedAtOf(raw) };
}

/** Vue d'ensemble pour l'administration : équipes actives (par nom) et corbeille (la plus récente d'abord). */
export function teamsOverview(rawTeams, rawTeamData) {
  const teams = Object.entries(rawTeams ?? {})
    .map(([id, raw]) => parseTeam(id, raw))
    .filter(Boolean)
    .map((team) => {
      const { skills, members } = parseMatrix(rawTeamData?.[team.id]);
      return { ...team, memberCount: members.length, skillCount: skills.length };
    });
  return {
    active: teams.filter((t) => t.deletedAt === null).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    trash: teams.filter((t) => t.deletedAt !== null).sort((a, b) => b.deletedAt - a.deletedAt),
  };
}

// ---------------------------------------------------------------- Équipes récentes (propres au navigateur)

export const RECENT_TEAMS_MAX = 30;

/** Liste mémorisée nettoyée : entrées valides, sans doublon, de la plus récemment visitée à la plus ancienne. */
export function recentTeams(stored) {
  const seen = new Set();
  return (Array.isArray(stored) ? stored : [])
    .filter((t) => t && isTeamId(t.id) && typeof t.name === 'string' && Number.isFinite(t.lastVisit))
    .sort((a, b) => b.lastVisit - a.lastVisit)
    .filter((t) => !seen.has(t.id) && seen.add(t.id))
    .slice(0, RECENT_TEAMS_MAX)
    .map(({ id, name, lastVisit }) => ({ id, name, lastVisit }));
}

/** Ajoute ou met à jour une équipe visitée en tête de liste. */
export function rememberTeam(stored, { id, name }, now) {
  return recentTeams([{ id, name, lastVisit: now }, ...recentTeams(stored).filter((t) => t.id !== id)]);
}

/** Met à jour le nom d'une équipe récente sans changer sa date de visite. */
export function renameRecentTeam(stored, id, name) {
  return recentTeams(stored).map((t) => (t.id === id ? { ...t, name } : t));
}

/** Retire une équipe de la liste (introuvable ou purgée). */
export function forgetTeam(stored, id) {
  return recentTeams(stored).filter((t) => t.id !== id);
}

// ---------------------------------------------------------------- Réorganisation

/**
 * Déplace un identifiant dans une liste ordonnée, à la position `index` de la liste d'origine
 * (0 = en tête, longueur = en fin). Renvoie une nouvelle liste.
 */
export function moveTo(ids, id, index) {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  const rest = ids.filter((x) => x !== id);
  const target = Math.max(0, Math.min(rest.length, index > from ? index - 1 : index));
  return [...rest.slice(0, target), id, ...rest.slice(target)];
}

/**
 * Écriture groupée d'un nouvel ordre (chemins relatifs aux données de l'équipe) : `order` = 1, 2, 3…
 * Seuls les éléments dont la position change sont écrits. Renvoie null s'il n'y a rien à écrire.
 * `kind` : 'skill' ou 'member' ; `items` : éléments actuels ({ id, order }) ; `ids` : nouvel ordre.
 */
export function reorderUpdate(kind, items, ids) {
  const current = new Map(items.map((item) => [item.id, item.order]));
  const update = {};
  ids.forEach((id, i) => {
    if (current.has(id) && current.get(id) !== i + 1) update[`${kind}s/${id}/order`] = i + 1;
  });
  return Object.keys(update).length ? update : null;
}

// ---------------------------------------------------------------- Échelle : saisie et conversion

/**
 * Écriture d'une note (chemins relatifs aux données de l'équipe) : niveau (0 à 3, ou null pour effacer)
 * et envie de progresser (seule l'absence d'envie est enregistrée).
 */
export function ratingUpdate(memberId, skillId, level, wants) {
  return {
    [`levels/${memberId}/${skillId}`]: isLevel(level) ? level : null,
    [`noProgress/${memberId}/${skillId}`]: isLevel(level) && !wants ? true : null,
  };
}

/** Ancienne note (0 à 4) → { niveau, envie }. */
export function convertOldRating(value) {
  if (!Number.isInteger(value) || value < 0 || value > 4) return null;
  return value === 0 ? { level: 0, wants: false } : { level: value - 1, wants: true };
}

/** Ancienne cible (0 à 4) → niveau (0 à 3). */
export function convertOldTarget(value) {
  return Number.isInteger(value) && value >= 0 && value <= 4 ? Math.max(0, value - 1) : null;
}

/**
 * Conversion d'une équipe enregistrée avec l'ancienne échelle (chemins relatifs à ses données), en une écriture :
 * notes (corbeille comprise) en niveaux et envies, cibles décalées d'un cran, anciennes notes effacées, `scale: 2`.
 * Renvoie null si l'équipe est déjà à la nouvelle échelle.
 */
export function migrationUpdate(raw) {
  if (raw?.scale === SCALE_VERSION) return null;
  const update = { scale: SCALE_VERSION };
  for (const [memberId, bySkill] of Object.entries(raw?.ratings ?? {})) {
    if (!raw?.members?.[memberId]) continue; // note orpheline : les règles refuseraient toute l'écriture
    for (const [skillId, value] of Object.entries(bySkill ?? {})) {
      if (!raw?.skills?.[skillId]) continue;
      const converted = convertOldRating(value);
      if (!converted) continue;
      update[`levels/${memberId}/${skillId}`] = converted.level;
      if (!converted.wants) update[`noProgress/${memberId}/${skillId}`] = true;
    }
  }
  if (raw?.ratings) update.ratings = null;
  for (const [skillId, skill] of Object.entries(raw?.skills ?? {})) {
    for (const key of ['refTarget', 'backupTarget']) {
      const converted = convertOldTarget(skill?.[key]);
      if (converted !== null && converted !== skill[key]) update[`skills/${skillId}/${key}`] = converted;
    }
  }
  return update;
}
