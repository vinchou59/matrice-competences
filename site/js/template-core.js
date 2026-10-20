// Modèle Excel de la matrice : un seul onglet avec un court mode d'emploi, puis trois colonnes
// (Équipe, Personnes, Compétences). Contenu du modèle, analyse d'un fichier rempli et plan d'import.
// Logique pure (sans DOM, Firebase ni fichier) : importée par l'interface et par les tests.

import {
  DEFAULT_TARGETS, SCALE_VERSION, NAME_MAX_LENGTH, LABEL_MAX_LENGTH, TEAM_NAME_MAX_LENGTH, normalizeText,
} from './matrix-core.js?v=__VERSION__';
import { STYLE } from './xlsx-lite.js?v=__VERSION__';

export const SHEET_NAME = 'Matrice';
export const COLUMNS = Object.freeze({ team: 'Équipe', people: 'Personnes', skills: 'Compétences' });
export const MAX_SKILLS = 200;
export const MAX_PEOPLE = 100;

export const BRIEF = Object.freeze([
  'Matrice de compétences : modèle à remplir',
  'Remplissez les trois colonnes ci-dessous, puis chargez ce fichier dans l\'application.',
  `• Équipe : le nom de l'équipe, sur la première ligne seulement (${TEAM_NAME_MAX_LENGTH} caractères au plus).`,
  `• Personnes : une personne par ligne (${NAME_MAX_LENGTH} caractères au plus, ${MAX_PEOPLE} personnes au plus).`,
  `• Compétences : une compétence par ligne (${LABEL_MAX_LENGTH} caractères au plus, ${MAX_SKILLS} compétences au plus).`,
  'Les niveaux visés et l\'auto-évaluation se font ensuite dans l\'application.',
]);
/** Ligne (Excel, à partir de 1) des en-têtes de colonnes dans le modèle. */
export const HEADER_ROW = BRIEF.length + 2;

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
 * Le modèle, prêt pour `writeXlsx` : un seul onglet. Sans argument : modèle vide. Avec une équipe : son nom,
 * ses personnes et ses compétences actives (`parseMatrix`), sans aucune note.
 */
export function buildTemplate({ teamName = '', skills = [], members = [] } = {}) {
  const header = [COLUMNS.team, COLUMNS.people, COLUMNS.skills].map((value) => ({ value, style: STYLE.header }));
  const length = Math.max(1, members.length, skills.length);
  const rows = Array.from({ length }, (_, i) => [i === 0 ? teamName : '', members[i]?.name ?? '', skills[i]?.label ?? '']);
  return [{
    name: SHEET_NAME,
    colWidths: [32, 32, 48],
    freezeRows: HEADER_ROW,
    rows: [
      [{ value: BRIEF[0], style: STYLE.title }],
      ...BRIEF.slice(1).map((line) => [line]),
      [],
      header,
      ...rows,
    ],
  }];
}

// ---------------------------------------------------------------- Lecture d'un fichier rempli

/** Clé de comparaison d'un en-tête : sans accents, casse ni espaces superflus. */
const headerKey = (text) => normalizeText(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nameKey = (name) => normalizeText(name).toLocaleLowerCase('fr');
const cellText = (value) => (value === undefined || value === null ? '' : normalizeText(typeof value === 'boolean' ? (value ? 'VRAI' : 'FAUX') : value));

/** Repère la ligne d'en-têtes et la colonne de chaque liste, dans le premier onglet qui les contient. */
function findColumns(workbook) {
  const wanted = Object.entries(COLUMNS).map(([key, label]) => [key, headerKey(label)]);
  for (const sheet of workbook.sheets) {
    for (let r = 0; r < Math.min(sheet.rows.length, 30); r += 1) {
      const columns = {};
      (sheet.rows[r] ?? []).forEach((value, c) => {
        const found = wanted.find(([, key]) => headerKey(cellText(value)) === key);
        if (found && columns[found[0]] === undefined) columns[found[0]] = c;
      });
      if (columns.people !== undefined || columns.skills !== undefined) return { sheet, headerIndex: r, columns };
    }
  }
  return null;
}

/**
 * Analyse un classeur lu par `readXlsx`. Renvoie `{ teamName, skills, members, duplicates, errors }`, où
 * skills = [{ label, refTarget, backupTarget, row }], members = [{ name, row }], duplicates = [{ kind, name, row }],
 * errors = [texte] (bloquantes). Les numéros de ligne sont ceux d'Excel.
 */
export function parseTemplate(workbook) {
  const errors = [];
  const duplicates = [];
  const found = findColumns(workbook);
  if (!found) {
    return { teamName: '', skills: [], members: [], duplicates, errors: [`Ce fichier ne ressemble pas au modèle : colonnes « ${COLUMNS.people} » et « ${COLUMNS.skills} » introuvables. Partez du modèle à télécharger.`] };
  }
  const { sheet, headerIndex, columns } = found;
  const body = sheet.rows.slice(headerIndex + 1).map((cells, i) => ({ cells: cells ?? [], row: headerIndex + i + 2 }));
  const column = (key) => (columns[key] === undefined ? [] : body
    .map(({ cells, row }) => ({ text: cellText(cells[columns[key]]), row }))
    .filter((x) => x.text));
  const where = (key, row) => `Colonne ${COLUMNS[key]}, ligne ${row}`;

  const teams = column('team');
  const teamName = teams[0]?.text ?? '';
  if (teamName.length > TEAM_NAME_MAX_LENGTH) errors.push(`${where('team', teams[0].row)} : le nom de l'équipe dépasse ${TEAM_NAME_MAX_LENGTH} caractères`);
  if (teams.length > 1) errors.push(`${where('team', teams[1].row)} : un seul nom d'équipe par fichier, sur la première ligne`);

  const collect = (key, max, kind) => {
    const items = [];
    const seen = new Set();
    for (const { text, row } of column(key)) {
      if (text.length > max) { errors.push(`${where(key, row)} : le nom dépasse ${max} caractères`); continue; }
      if (seen.has(nameKey(text))) { duplicates.push({ kind, name: text, row }); continue; }
      seen.add(nameKey(text));
      items.push({ text, row });
    }
    return items;
  };
  const members = collect('people', NAME_MAX_LENGTH, 'member').map(({ text, row }) => ({ name: text, row }));
  const skills = collect('skills', LABEL_MAX_LENGTH, 'skill')
    .map(({ text, row }) => ({ label: text, refTarget: DEFAULT_TARGETS.refTarget, backupTarget: DEFAULT_TARGETS.backupTarget, row }));

  if (skills.length > MAX_SKILLS) errors.push(`Colonne ${COLUMNS.skills} : ${skills.length} compétences, ${MAX_SKILLS} au plus`);
  if (members.length > MAX_PEOPLE) errors.push(`Colonne ${COLUMNS.people} : ${members.length} personnes, ${MAX_PEOPLE} au plus`);
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
    if (!parsed.teamName) errors.unshift(`Colonne ${COLUMNS.team} : le nom de l'équipe est obligatoire (première ligne sous l'en-tête)`);
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
  ignored.sort((a, b) => (a.kind === b.kind ? a.row - b.row : a.kind === 'member' ? -1 : 1));
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
  if (team) {
    update[`teams/${teamId}`] = { name: team.name, createdAt: team.createdAt };
    update[`teamData/${teamId}/scale`] = SCALE_VERSION; // créée directement à la nouvelle échelle
  }
  plan.members.forEach((m, i) => {
    update[`teamData/${teamId}/members/${newKey()}`] = { name: m.name, order: start.members + i };
  });
  plan.skills.forEach((s, i) => {
    update[`teamData/${teamId}/skills/${newKey()}`] = { label: s.label, refTarget: s.refTarget, backupTarget: s.backupTarget, order: start.skills + i };
  });
  return update;
}


