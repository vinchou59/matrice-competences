import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readXlsx, writeXlsx } from '../site/js/xlsx-lite.js';
import { parseMatrix } from '../site/js/matrix-core.js';
import {
  SHEET_NAME, COLUMNS, BRIEF, HEADER_ROW, IGNORED, MAX_SKILLS, templateFileName, buildTemplate, parseTemplate,
  planImport, importUpdate,
} from '../site/js/template-core.js';

const roundTrip = async (sheets) => readXlsx(await writeXlsx(sheets));
/** Classeur au format du modèle : mode d'emploi, ligne vide, en-têtes, puis les lignes [équipe, personne, compétence]. */
const book = (rows) => ({ sheets: [{ name: SHEET_NAME, rows: [...BRIEF.map((l) => [l]), [], ['Équipe', 'Personnes', 'Compétences'], ...rows] }] });
const first = HEADER_ROW + 1; // première ligne de données dans Excel

test('nom du fichier', () => {
  assert.equal(templateFileName('Équipe Paiement & Cartes'), 'matrice-competences-equipe-paiement-cartes.xlsx');
  assert.equal(templateFileName(''), 'matrice-competences-modele.xlsx');
});

test('modèle vide : un seul onglet, mode d\'emploi puis trois colonnes', async () => {
  const sheets = buildTemplate();
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].freezeRows, HEADER_ROW);
  const wb = await roundTrip(sheets);
  assert.deepEqual(wb.sheets.map((s) => s.name), [SHEET_NAME]);
  assert.match(wb.sheets[0].rows[0][0], /modèle à remplir/);
  assert.deepEqual(wb.sheets[0].rows[HEADER_ROW - 1], [COLUMNS.team, COLUMNS.people, COLUMNS.skills]);
  const parsed = parseTemplate(wb);
  assert.deepEqual([parsed.teamName, parsed.skills, parsed.members, parsed.errors], ['', [], [], []]);
});

test('modèle pré-rempli : équipe, personnes et compétences actives, sans notes ni corbeille', async () => {
  const matrix = parseMatrix({
    skills: { a: { label: 'Kafka', refTarget: 4, backupTarget: 3, order: 1 }, b: { label: 'Java', order: 2 }, c: { label: 'Old', order: 3, deletedAt: 5 } },
    members: { j: { name: 'Julie', order: 1 }, p: { name: 'Paul', order: 2, deletedAt: 5 } },
    ratings: { j: { a: 4 } },
  });
  const wb = await roundTrip(buildTemplate({ teamName: 'Paiement', ...matrix }));
  assert.deepEqual(wb.sheets[0].rows.slice(HEADER_ROW), [['Paiement', 'Julie', 'Kafka'], [, , 'Java']]);
  const parsed = parseTemplate(wb);
  assert.deepEqual([parsed.teamName, parsed.members.map((m) => m.name), parsed.skills.map((s) => s.label)], ['Paiement', ['Julie'], ['Kafka', 'Java']]);
});

test('analyse : colonnes indépendantes, lignes vides ignorées, espaces nettoyés, cibles par défaut', () => {
  const p = parseTemplate(book([['  Mobile ', ' Julie ', 'Kafka'], [, 'Marc'], [], [, , '  Java  ']]));
  assert.equal(p.teamName, 'Mobile');
  assert.deepEqual(p.members, [{ name: 'Julie', row: first }, { name: 'Marc', row: first + 1 }]);
  assert.deepEqual(p.skills, [
    { label: 'Kafka', refTarget: 2, backupTarget: 1, row: first },
    { label: 'Java', refTarget: 2, backupTarget: 1, row: first + 3 },
  ]);
  assert.deepEqual(p.errors, []);
});

test('analyse : un seul nom d\'équipe', () => {
  const p = parseTemplate(book([['Mobile', 'Julie'], ['Web', 'Marc']]));
  assert.deepEqual(p.errors, [`Colonne Équipe, ligne ${first + 1} : un seul nom d'équipe par fichier, sur la première ligne`]);
});

test('analyse : nom trop long, avec colonne et ligne', () => {
  const p = parseTemplate(book([['Mobile', 'x'.repeat(31), 'y'.repeat(61)]]));
  assert.deepEqual(p.errors, [
    `Colonne Personnes, ligne ${first} : le nom dépasse 30 caractères`,
    `Colonne Compétences, ligne ${first} : le nom dépasse 60 caractères`,
  ]);
});

test('analyse : doublons dans le fichier retenus une fois et signalés', () => {
  const p = parseTemplate(book([['Mobile', 'Julie'], [, 'JULIE'], [, 'Marc']]));
  assert.deepEqual(p.members.map((m) => m.name), ['Julie', 'Marc']);
  assert.deepEqual(planImport(p).ignored, [{ kind: 'member', name: 'JULIE', row: first + 1, reason: IGNORED.duplicate }]);
});

test('analyse : en-têtes retrouvés où qu\'ils soient, sans tenir compte des accents ni de la casse', () => {
  const wb = { sheets: [{ name: 'Feuil1', rows: [['Mon fichier'], [, 'COMPETENCES', 'equipe', 'personnes'], [, 'Kafka', 'Data', 'Zoé']] }] };
  const p = parseTemplate(wb);
  assert.deepEqual([p.teamName, p.skills[0].label, p.members[0].name, p.members[0].row], ['Data', 'Kafka', 'Zoé', 3]);
});

test('analyse : limites et fichier qui ne ressemble pas au modèle', () => {
  const many = Array.from({ length: MAX_SKILLS + 1 }, (_, i) => [i === 0 ? 'Mobile' : undefined, undefined, `C${i}`]);
  assert.deepEqual(parseTemplate(book(many)).errors, ['Colonne Compétences : 201 compétences, 200 au plus']);
  assert.match(parseTemplate({ sheets: [{ name: 'Feuil1', rows: [['a', 'b']] }] }).errors[0], /ne ressemble pas au modèle/);
});

test('nouvelle équipe : nom obligatoire', () => {
  const plan = planImport(parseTemplate(book([[, 'Julie']])));
  assert.equal(plan.errors[0], 'Colonne Équipe : le nom de l\'équipe est obligatoire (première ligne sous l\'en-tête)');
  assert.equal(plan.canImport, false);
  assert.equal(planImport(parseTemplate(book([['Mobile']]))).canImport, true, 'équipe sans personne ni compétence acceptée');
});

test('équipe existante : ajout uniquement, présents et corbeille ignorés, nom d\'équipe ignoré', () => {
  const target = parseMatrix({
    skills: { a: { label: 'Kafka', refTarget: 4, backupTarget: 3, order: 1 } },
    members: { j: { name: 'Julie', order: 1 }, m: { name: 'Marc', order: 2 }, p: { name: 'Paul', order: 3, deletedAt: 9 } },
  });
  const plan = planImport(parseTemplate(book([['Autre nom', 'julie', 'kafka'], [, 'Marc', 'SQL'], [, 'Sofiane'], [, 'Paul']])), target);
  assert.deepEqual(plan.members.map((m) => m.name), ['Sofiane']);
  assert.deepEqual(plan.skills.map((s) => s.label), ['SQL']);
  assert.deepEqual(plan.ignored.map((x) => [x.name, x.reason]), [
    ['julie', IGNORED.present], ['Marc', IGNORED.present], ['Paul', IGNORED.trashed], ['kafka', IGNORED.present],
  ]);
  assert.equal(plan.canImport, true);
  assert.equal(planImport(parseTemplate(book([[, 'Julie']])), target).canImport, false, 'rien à ajouter');
});

test('écriture groupée : fiche d\'équipe et éléments dans l\'ordre du fichier', () => {
  let n = 0;
  const plan = planImport(parseTemplate(book([['Mobile', 'Julie', 'Kafka'], [, 'Marc']])));
  assert.deepEqual(importUpdate(plan, { teamId: 'abcdefghijkl', team: { name: 'Mobile', createdAt: 'TS' }, newKey: () => `k${++n}` }), {
    'teams/abcdefghijkl': { name: 'Mobile', createdAt: 'TS' },
    'teamData/abcdefghijkl/scale': 2,
    'teamData/abcdefghijkl/members/k1': { name: 'Julie', order: 1 },
    'teamData/abcdefghijkl/members/k2': { name: 'Marc', order: 2 },
    'teamData/abcdefghijkl/skills/k3': { label: 'Kafka', refTarget: 2, backupTarget: 1, order: 1 },
  });
  n = 0;
  const added = importUpdate(plan, { teamId: 't', newKey: () => `k${++n}`, start: { skills: 5, members: 9 } });
  assert.equal(added['teams/t'], undefined);
  assert.equal(added['teamData/t/members/k2'].order, 10);
});
