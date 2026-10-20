// Modèle Excel de la matrice : contenu du modèle, analyse d'un fichier rempli et plan d'import.
// Logique pure (sans DOM, Firebase ni fichier) : importée par l'interface et par les tests.

import {
  LEVELS, DEFAULT_TARGETS, NAME_MAX_LENGTH, LABEL_MAX_LENGTH, TEAM_NAME_MAX_LENGTH, normalizeText,
} from './matrix-core.js?v=__VERSION__';
import { STYLE } from './xlsx-lite.js?v=__VERSION__';

export const SHEETS = Object.freeze({ help: "Mode d'emploi", team: 'Équipe', skills: 'Compétences', people: 'Personnes' });
export const MAX_SKILLS = 200;
export const MAX_PEOPLE = 100;
const SKILL_HEADERS = ['Compétence', 'Cible référent (0 à 4)', 'Cible back-up (0 à 4)'];

export const IGNORED = Object.freeze({
  present: 'déjà dans l\'équipe',
  trashed: 'dans la corbeille : à rétablir plutôt qu\'à ajouter',
  duplicate: 'en double dans le fichier',
});

// ---------------------------------------------------------------- Modèle

/** Nom du fichier : `matrice-competences-<équipe>.xlsx`, ou `matrice-competences-modele.xlsx`. */
export function templateFileName(teamName) {
  const slug = normalizeText(teamName).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `matrice-competences-${slug || 'modele'}.xlsx`;
}

/**
 * Onglets du modèle, prêts pour `writeXlsx`. Sans argument : modèle vide. Avec une équipe : son nom et ses
 * personnes et compétences actives (`parseMatrix`), sans aucune note.
 */
export function buildTemplate({ teamName = '', skills = [], members = [] } = {}) {
  const h = (value) => ({ value, style: STYLE.header });
  const w = (value) => ({ value, style: STYLE.wrap });
  const levels = LEVELS.map((label, i) => [{ value: i, style: STYLE.normal }, label]);
  return [
    {
      name: SHEETS.help,
      colWidths: [12, 90],
      rows: [
        [{ value: 'Matrice de compétences : modèle à remplir', style: STYLE.title }],
        [],
        [h('Onglet'), h('Quoi remplir')],
        [SHEETS.team, w('Le nom de l\'équipe, en B1. Obligatoire pour créer une nouvelle équipe ; ignoré si le fichier est ajouté à une équipe existante.')],
        [SHEETS.skills, w(`Une compétence par ligne (60 caractères au plus), avec le niveau visé pour le référent et pour le back-up, de 0 à 4. Cible vide : ${DEFAULT_TARGETS.refTarget} pour le référent, ${DEFAULT_TARGETS.backupTarget} pour le back-up. ${MAX_SKILLS} compétences au plus.`)],
        [SHEETS.people, w(`Une personne par ligne (30 caractères au plus). ${MAX_PEOPLE} personnes au plus.`)],
        [],
        [h('Important'), w('Pas de notes ici : chacun s\'auto-évalue ensuite dans l\'application. Charger ce fichier dans une équipe existante ajoute seulement ce qui manque : rien n\'est modifié ni supprimé.')],
        [],
        [h('Échelle'), h('Niveaux utilisés pour les cibles et l\'auto-évaluation')],
        ...levels,
        [],
        [h('Cibles'), w('Le référent est la personne la mieux notée sur la compétence, le back-up la deuxième. Une compétence est couverte quand les deux atteignent leur niveau cible.')],
      ],
    },
    {
      name: SHEETS.team,
      colWidths: [20, 50],
      rows: [[h('Nom de l\'équipe'), teamName]],
    },
    {
      name: SHEETS.skills,
      colWidths: [50, 22, 22],
      freezeHeader: true,
      validations: [{ sqref: `B2:C${MAX_SKILLS + 1}`, list: LEVELS.map((_, i) => String(i)), error: 'Choisissez un niveau de 0 à 4.' }],
      rows: [SKILL_HEADERS.map(h), ...skills.map((s) => [s.label, s.refTarget, s.backupTarget])],
    },
    {
      name: SHEETS.people,
      colWidths: [40],
      freezeHeader: true,
      rows: [[h('Nom')], ...members.map((m) => [m.name])],
    },
  ];
}

// ---------------------------------------------------------------- Lecture d'un fichier rempli

/** Clé de comparaison d'un nom d'onglet ou de personne : sans accents, casse ni espaces superflus. */
const sheetKey = (name) => normalizeText(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nameKey = (name) => normalizeText(name).toLocaleLowerCase('fr');
const cellText = (value) => (value === undefined || value === null ? '' : normalizeText(typeof value === 'boolean' ? (value ? 'VRAI' : 'FAUX') : value));

function parseTarget(value, fallback) {
  if (value === undefined || value === null || cellText(value) === '') return { ok: true, value: fallback };
  const n = typeof value === 'number' ? value : Number(cellText(value).replace(',', '.'));
  return Number.isInteger(n) && n >= 0 && n <= LEVELS.length - 1 ? { ok: true, value: n } : { ok: false };
}

/**
 * Analyse un classeur lu par `readXlsx`. Renvoie `{ teamName, skills, members, duplicates, errors }`, où
 * skills = [{ label, refTarget, backupTarget, row }], members = [{ name, row }], duplicates = [{ kind, name, row }],
 * errors = [texte] (bloquantes). Les numéros de ligne sont ceux d'Excel.
 */
export function parseTemplate(workbook) {
  const find = (name) => workbook.sheets.find((s) => sheetKey(s.name) === sheetKey(name));
  const teamSheet = find(SHEETS.team);
  const skillSheet = find(SHEETS.skills);
  const peopleSheet = find(SHEETS.people);
  const errors = [];
  const duplicates = [];
  if (!skillSheet && !peopleSheet) {
    return { teamName: '', skills: [], members: [], duplicates, errors: ['Ce fichier ne ressemble pas au modèle : onglets « Compétences » et « Personnes » introuvables. Partez du modèle à télécharger.'] };
  }

  const teamName = cellText(teamSheet?.rows[0]?.[1]);
  if (teamName.length > TEAM_NAME_MAX_LENGTH) errors.push(`${SHEETS.team} : le nom de l'équipe dépasse ${TEAM_NAME_MAX_LENGTH} caractères`);

  const skills = [];
  const seenSkills = new Set();
  (skillSheet?.rows ?? []).slice(1).forEach((cells, i) => {
    const row = i + 2;
    const label = cellText(cells?.[0]);
    if (!label) return;
    const where = `${SHEETS.skills}, ligne ${row}`;
    let valid = true;
    if (label.length > LABEL_MAX_LENGTH) { errors.push(`${where} : le nom dépasse ${LABEL_MAX_LENGTH} caractères`); valid = false; }
    const ref = parseTarget(cells[1], DEFAULT_TARGETS.refTarget);
    const backup = parseTarget(cells[2], DEFAULT_TARGETS.backupTarget);
    if (!ref.ok) { errors.push(`${where} : la cible référent doit être un nombre entier de 0 à 4`); valid = false; }
    if (!backup.ok) { errors.push(`${where} : la cible back-up doit être un nombre entier de 0 à 4`); valid = false; }
    if (!valid) return;
    if (seenSkills.has(nameKey(label))) { duplicates.push({ kind: 'skill', name: label, row }); return; }
    seenSkills.add(nameKey(label));
    skills.push({ label, refTarget: ref.value, backupTarget: backup.value, row });
  });

  const members = [];
  const seenMembers = new Set();
  (peopleSheet?.rows ?? []).slice(1).forEach((cells, i) => {
    const row = i + 2;
    const name = cellText(cells?.[0]);
    if (!name) return;
    if (name.length > NAME_MAX_LENGTH) { errors.push(`${SHEETS.people}, ligne ${row} : le nom dépasse ${NAME_MAX_LENGTH} caractères`); return; }
    if (seenMembers.has(nameKey(name))) { duplicates.push({ kind: 'member', name, row }); return; }
    seenMembers.add(nameKey(name));
    members.push({ name, row });
  });

  if (skills.length > MAX_SKILLS) errors.push(`${SHEETS.skills} : ${skills.length} compétences, ${MAX_SKILLS} au plus`);
  if (members.length > MAX_PEOPLE) errors.push(`${SHEETS.people} : ${members.length} personnes, ${MAX_PEOPLE} au plus`);
  return { teamName, skills, members, duplicates, errors };
}

/**
 * Plan d'import. `target` : null pour une nouvelle équipe, ou les données de l'équipe existante
 * (`parseMatrix` : skills, members, trash). Renvoie `{ teamName, skills, members, ignored, errors, canImport }`
 * où skills et members sont les éléments à ajouter, et ignored = [{ kind, name, row, reason }].
 */
export function planImport(parsed, target = null) {
  const errors = [...parsed.errors];
  const ignored = parsed.duplicates.map((d) => ({ ...d, reason: IGNORED.duplicate }));
  let { skills, members } = parsed;
  if (!target) {
    if (!parsed.teamName) errors.unshift(`Onglet ${SHEETS.team} : le nom de l'équipe est obligatoire (cellule B1)`);
  } else {
    const keys = (items, field) => new Set(items.map((x) => nameKey(x[field])));
    const presentSkills = keys(target.skills, 'label');
    const presentMembers = keys(target.members, 'name');
    const trashedSkills = keys(target.trash.filter((t) => t.kind === 'skill'), 'name');
    const trashedMembers = keys(target.trash.filter((t) => t.kind === 'member'), 'name');
    const sift = (items, field, kind, present, trashed) => items.filter((item) => {
      const key = nameKey(item[field]);
      const reason = present.has(key) ? IGNORED.present : trashed.has(key) ? IGNORED.trashed : null;
      if (reason) ignored.push({ kind, name: item[field], row: item.row, reason });
      return !reason;
    });
    skills = sift(skills, 'label', 'skill', presentSkills, trashedSkills);
    members = sift(members, 'name', 'member', presentMembers, trashedMembers);
  }
  ignored.sort((a, b) => (a.kind === b.kind ? a.row - b.row : a.kind === 'skill' ? -1 : 1));
  const nothing = target && !skills.length && !members.length;
  return { teamName: parsed.teamName, skills, members, ignored, errors, canImport: !errors.length && !nothing };
}

/**
 * Écriture groupée d'un import (chemins relatifs à la racine de la matrice), en une seule mise à jour atomique.
 * `newKey()` fournit un identifiant par élément ; `team` = { name, createdAt } pour une nouvelle équipe ;
 * `start` = positions de départ (nextOrder des éléments existants).
 */
export function importUpdate(plan, { teamId, team = null, newKey, start = { skills: 1, members: 1 } }) {
  const update = {};
  if (team) update[`teams/${teamId}`] = { name: team.name, createdAt: team.createdAt };
  plan.skills.forEach((s, i) => {
    update[`teamData/${teamId}/skills/${newKey()}`] = { label: s.label, refTarget: s.refTarget, backupTarget: s.backupTarget, order: start.skills + i };
  });
  plan.members.forEach((m, i) => {
    update[`teamData/${teamId}/members/${newKey()}`] = { name: m.name, order: start.members + i };
  });
  return update;
}
