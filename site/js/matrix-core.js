// Logique métier pure de la matrice de compétences : aucune dépendance au DOM ni à Firebase.
// Importée telle quelle par l'interface (navigateur) et par les tests (Node.js).

/** Échelle d'auto-évaluation, du niveau 0 au niveau 4. */
export const LEVELS = Object.freeze([
  'Ne connaît pas, pas intéressé·e',
  'Ne connaît pas, intéressé·e',
  'Première expérience, a besoin d\'aide',
  'Expérimenté·e, autonome',
  'Maîtrise, peut former',
]);
export const LEVEL_MAX = LEVELS.length - 1;
/** Niveau à partir duquel une personne a exprimé un intérêt pour la compétence. */
export const INTERESTED_MIN = 1;

/** Longueurs maximales (mêmes valeurs dans database.rules.json). */
export const NAME_MAX_LENGTH = 30;
export const LABEL_MAX_LENGTH = 60;

export const DEFAULT_TARGETS = Object.freeze({ refTarget: 3, backupTarget: 2 });

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

/**
 * Transforme l'état brut de la base en données prêtes à l'emploi, en ignorant tout ce qui est mal formé.
 * Brut : { skills: {id: {label, refTarget, backupTarget, order}}, members: {id: {name, order}}, ratings: {memberId: {skillId: niveau}} }
 */
export function parseMatrix(raw) {
  const skills = Object.entries(raw?.skills ?? {})
    .filter(([, s]) => s && typeof s.label === 'string')
    .map(([id, s]) => ({
      id,
      label: s.label,
      refTarget: isLevel(s.refTarget) ? s.refTarget : DEFAULT_TARGETS.refTarget,
      backupTarget: isLevel(s.backupTarget) ? s.backupTarget : DEFAULT_TARGETS.backupTarget,
      order: Number(s.order) || 0,
    }))
    .sort(byOrder('label'));
  const skillIds = new Set(skills.map((s) => s.id));
  const members = Object.entries(raw?.members ?? {})
    .filter(([, m]) => m && typeof m.name === 'string')
    .map(([id, m]) => {
      const ratings = {};
      for (const [skillId, level] of Object.entries(raw?.ratings?.[id] ?? {})) {
        if (skillIds.has(skillId) && isLevel(level)) ratings[skillId] = level;
      }
      return { id, name: m.name, order: Number(m.order) || 0, ratings };
    })
    .sort(byOrder('name'));
  return { skills, members };
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
    .map((member) => ({ member, level: member.ratings?.[skill.id] }))
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
 * Candidats : personnes présentes intéressées (niveau 1 ou plus) sous le niveau visé, les plus avancées d'abord.
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
        .filter((e) => e.level >= INTERESTED_MIN && e.level < need)
        .filter((e) => !(role === 'backup' && e.member.id === a.referent?.member.id))
        .slice(0, maxCandidates)
        .map((e) => ({ member: e.member, level: e.level, target: need, steps: need - e.level, interested: e.level === INTERESTED_MIN }));
      return {
        skill,
        assessment: a,
        role,
        totalGap: refGap + backupGap,
        candidates,
        nobodyInterested: a.rated.length > 0 && a.rated.every((e) => e.level < INTERESTED_MIN),
        unrated: pool.length - a.rated.length,
      };
    })
    .sort((x, y) => y.totalGap - x.totalGap || x.skill.order - y.skill.order);
}

// ---------------------------------------------------------------- Écritures groupées

/** Suppression d'une compétence et de toutes ses notes, en une écriture atomique (chemins relatifs à la matrice). */
export function deleteSkillUpdate(skillId, memberIds) {
  const update = { [`skills/${skillId}`]: null };
  for (const memberId of memberIds) update[`ratings/${memberId}/${skillId}`] = null;
  return update;
}

/** Retrait d'une personne et de toutes ses notes, en une écriture atomique. */
export function deleteMemberUpdate(memberId) {
  return { [`members/${memberId}`]: null, [`ratings/${memberId}`]: null };
}
