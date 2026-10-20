import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readXlsx, writeXlsx } from '../site/js/xlsx-lite.js';
import { parseMatrix } from '../site/js/matrix-core.js';
import {
  SHEETS, IGNORED, MAX_SKILLS, templateFileName, buildTemplate, parseTemplate, planImport, importUpdate,
} from '../site/js/template-core.js';

const roundTrip = async (sheets) => readXlsx(await writeXlsx(sheets));
const book = ({ team = 'Mobile', skills = [], people = [] } = {}) => ({ sheets: [
  { name: SHEETS.help, rows: [['…']] },
  { name: SHEETS.team, rows: [["Nom de l'équipe", team]] },
  { name: SHEETS.skills, rows: [['Compétence', 'Cible référent', 'Cible back-up'], ...skills] },
  { name: SHEETS.people, rows: [['Nom'], ...people] },
] });

test('nom du fichier', () => {
  assert.equal(templateFileName('Équipe Paiement & Cartes'), 'matrice-competences-equipe-paiement-cartes.xlsx');
  assert.equal(templateFileName(''), 'matrice-competences-modele.xlsx');
});

test('modèle vide : 4 onglets, en-têtes, listes déroulantes 0 à 4', async () => {
  const sheets = buildTemplate();
  assert.deepEqual(sheets.map((s) => s.name), ["Mode d'emploi", 'Équipe', 'Compétences', 'Personnes']);
  assert.deepEqual(sheets[2].validations[0].list, ['0', '1', '2', '3', '4']);
  assert.equal(sheets[2].validations[0].sqref, `B2:C${MAX_SKILLS + 1}`);
  const parsed = parseTemplate(await roundTrip(sheets));
  assert.deepEqual([parsed.teamName, parsed.skills, parsed.members, parsed.errors], ['', [], [], []]);
});

test('modèle pré-rempli : personnes et compétences actives, sans notes ni corbeille', async () => {
  const matrix = parseMatrix({
    skills: { a: { label: 'Kafka', refTarget: 4, backupTarget: 3, order: 1 }, b: { label: 'Old', refTarget: 2, backupTarget: 1, order: 2, deletedAt: 5 } },
    members: { j: { name: 'Julie', order: 1 }, p: { name: 'Paul', order: 2, deletedAt: 5 } },
    ratings: { j: { a: 4 } },
  });
  const wb = await roundTrip(buildTemplate({ teamName: 'Paiement', ...matrix }));
  assert.deepEqual(wb.sheets[2].rows, [['Compétence', 'Cible référent (0 à 4)', 'Cible back-up (0 à 4)'], ['Kafka', 4, 3]]);
  assert.deepEqual(wb.sheets[3].rows, [['Nom'], ['Julie']]);
  assert.equal(wb.sheets[1].rows[0][1], 'Paiement');
});

test('analyse : lignes vides ignorées, espaces nettoyés, cibles par défaut, numéros de ligne Excel', () => {
  const p = parseTemplate(book({ skills: [['  Kafka  ', 3, 2], [], ['Java', '', ' '], ['SQL', '4', '3']], people: [[' Julie '], [], ['Marc']] }));
  assert.deepEqual(p.skills, [
    { label: 'Kafka', refTarget: 3, backupTarget: 2, row: 2 },
    { label: 'Java', refTarget: 3, backupTarget: 2, row: 4 },
    { label: 'SQL', refTarget: 4, backupTarget: 3, row: 5 },
  ]);
  assert.deepEqual(p.members, [{ name: 'Julie', row: 2 }, { name: 'Marc', row: 4 }]);
  assert.equal(p.teamName, 'Mobile');
  assert.deepEqual(p.errors, []);
});

test('analyse : cible invalide et nom trop long, avec onglet et ligne', () => {
  const p = parseTemplate(book({ skills: [['A', 3, 2], ['B', 3, 2], ['C', 3, 2], ['D', 3, 2], ['E', 3, 2], ['Kafka', 5, 2], ['F', 2.5, 'x']], people: [['x'.repeat(31)]] }));
  assert.deepEqual(p.errors, [
    'Compétences, ligne 7 : la cible référent doit être un nombre entier de 0 à 4',
    'Compétences, ligne 8 : la cible référent doit être un nombre entier de 0 à 4',
    'Compétences, ligne 8 : la cible back-up doit être un nombre entier de 0 à 4',
    'Personnes, ligne 2 : le nom dépasse 30 caractères',
  ]);
});

test('analyse : doublons dans le fichier retenus une fois et signalés', () => {
  const p = parseTemplate(book({ people: [['Julie'], ['JULIE'], ['Marc']] }));
  assert.deepEqual(p.members.map((m) => m.name), ['Julie', 'Marc']);
  assert.deepEqual(p.duplicates, [{ kind: 'member', name: 'JULIE', row: 3 }]);
  assert.deepEqual(planImport(p).ignored, [{ kind: 'member', name: 'JULIE', row: 3, reason: IGNORED.duplicate }]);
});

test('analyse : limites et fichier qui ne ressemble pas au modèle', () => {
  const many = Array.from({ length: MAX_SKILLS + 1 }, (_, i) => [`C${i}`]);
  assert.deepEqual(parseTemplate(book({ skills: many })).errors, ['Compétences : 201 compétences, 200 au plus']);
  assert.match(parseTemplate({ sheets: [{ name: 'Feuil1', rows: [['a']] }] }).errors[0], /ne ressemble pas au modèle/);
});

test('onglets retrouvés sans tenir compte des accents ni de la casse', () => {
  const wb = { sheets: [{ name: 'equipe', rows: [['', 'Data']] }, { name: 'COMPETENCES', rows: [[], ['Kafka']] }, { name: 'personnes', rows: [[], ['Zoé']] }] };
  const p = parseTemplate(wb);
  assert.deepEqual([p.teamName, p.skills[0].label, p.members[0].name], ['Data', 'Kafka', 'Zoé']);
});

test('nouvelle équipe : nom obligatoire', () => {
  const plan = planImport(parseTemplate(book({ team: '', people: [['Julie']] })));
  assert.equal(plan.errors[0], "Onglet Équipe : le nom de l'équipe est obligatoire (cellule B1)");
  assert.equal(plan.canImport, false);
  assert.equal(planImport(parseTemplate(book({ team: 'Mobile' }))).canImport, true, 'équipe sans personne ni compétence acceptée');
});

test('équipe existante : ajout uniquement, présents et corbeille ignorés, cibles inchangées', () => {
  const target = parseMatrix({
    skills: { a: { label: 'Kafka', refTarget: 4, backupTarget: 3, order: 1 } },
    members: { j: { name: 'Julie', order: 1 }, m: { name: 'Marc', order: 2 }, p: { name: 'Paul', order: 3, deletedAt: 9 } },
  });
  const plan = planImport(parseTemplate(book({ team: 'Autre nom', skills: [['kafka', 1, 1], ['SQL', 3, 2]], people: [['julie'], ['Marc'], ['Sofiane'], ['Paul']] })), target);
  assert.deepEqual(plan.skills.map((s) => s.label), ['SQL']);
  assert.deepEqual(plan.members.map((m) => m.name), ['Sofiane']);
  assert.deepEqual(plan.ignored.map((x) => [x.name, x.reason]), [
    ['kafka', IGNORED.present], ['julie', IGNORED.present], ['Marc', IGNORED.present], ['Paul', IGNORED.trashed],
  ]);
  assert.equal(plan.canImport, true);
  const nothing = planImport(parseTemplate(book({ people: [['Julie']] })), target);
  assert.equal(nothing.canImport, false, 'rien à ajouter');
});

test('écriture groupée : fiche d\'équipe et éléments dans l\'ordre du fichier', () => {
  let n = 0;
  const plan = planImport(parseTemplate(book({ skills: [['Kafka', 3, 2]], people: [['Julie'], ['Marc']] })));
  assert.deepEqual(importUpdate(plan, { teamId: 'abcdefghijkl', team: { name: 'Mobile', createdAt: 'TS' }, newKey: () => `k${++n}` }), {
    'teams/abcdefghijkl': { name: 'Mobile', createdAt: 'TS' },
    'teamData/abcdefghijkl/skills/k1': { label: 'Kafka', refTarget: 3, backupTarget: 2, order: 1 },
    'teamData/abcdefghijkl/members/k2': { name: 'Julie', order: 1 },
    'teamData/abcdefghijkl/members/k3': { name: 'Marc', order: 2 },
  });
  n = 0;
  const added = importUpdate(plan, { teamId: 't', newKey: () => `k${++n}`, start: { skills: 5, members: 9 } });
  assert.equal(added['teams/t'], undefined);
  assert.equal(added['teamData/t/members/k3'].order, 10);
});
