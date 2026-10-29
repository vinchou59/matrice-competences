import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, LEVEL_HINTS, DEFAULT_TARGETS, MESSAGES, STATUS, isLevel, ratingUpdate, convertOldRating, convertOldTarget, migrationUpdate, normalizeText, validateMemberName, validateSkillLabel, nextOrder,
  parseMatrix, ratedCount, assessSkill, overview, presentMembers, memberImpact, trainingPlan,
  PURGE_MS, isPurgeable, daysBeforePurge, checkRestore, purgeTeamDataUpdate, purgeTeamUpdate,
  isTeamId, newTeamId, parseTeamId, teamUrl, validateTeamName, parseTeam, teamsOverview,
  recentTeams, rememberTeam, renameRecentTeam, forgetTeam, moveTo, reorderUpdate, purgeItemUpdate,
} from '../site/js/matrix-core.js';

/** Applique une écriture groupée (chemins relatifs) à des données brutes, comme Firebase. */
const applyPaths = (raw, update) => {
  const out = structuredClone(raw);
  for (const [path, value] of Object.entries(update ?? {})) {
    const keys = path.split('/');
    let node = out;
    for (const key of keys.slice(0, -1)) node = node[key] ??= {};
    if (value === null) delete node[keys.at(-1)]; else node[keys.at(-1)] = value;
  }
  return out;
};

// Exemple du modèle Excel d'origine (ancienne échelle de 0 à 4) : 3 développeurs, 15 compétences.
// [Dev 1, Dev 2, Dev 3, cible référent, cible back-up]
const EXCEL = [
  [3, 4, 2, 4, 4], [2, 3, 3, 4, 3], [1, 3, 1, 3, 3], [3, 3, 4, 4, 3], [1, 1, 1, 2, 2],
  [3, 1, 2, 4, 3], [3, 1, 2, 4, 2], [3, 1, 2, 3, 2], [3, 1, 2, 4, 4], [3, 1, 2, 4, 3],
  [3, 1, 2, 3, 3], [2, 1, 2, 4, 2], [3, 3, 3, 3, 2], [3, 3, 4, 3, 3], [3, 3, 2, 4, 3],
];
const excelOld = () => {
  const raw = { skills: {}, members: {}, ratings: { d1: {}, d2: {}, d3: {} } };
  ['d1', 'd2', 'd3'].forEach((id, i) => { raw.members[id] = { name: `Dev ${i + 1}`, order: i + 1 }; });
  EXCEL.forEach(([a, b, c, ref, bk], i) => {
    const id = `s${String(i + 1).padStart(2, '0')}`;
    raw.skills[id] = { label: `Skill ${i + 1}`, refTarget: ref, backupTarget: bk, order: i + 1 };
    raw.ratings.d1[id] = a; raw.ratings.d2[id] = b; raw.ratings.d3[id] = c;
  });
  return raw;
};
/** L'exemple Excel converti à la nouvelle échelle (niveaux 0 à 3). */
const excelRaw = () => { const old = excelOld(); return applyPaths(old, migrationUpdate(old)); };
const member = (id, name, ratings, noProgress = {}) => ({ id, name, ratings, noProgress });

// ---------------------------------------------------------------- Échelle et saisies

test('échelle à 4 niveaux : Aucun, Débutant, Autonome, Expert', () => {
  assert.deepEqual(LEVELS, ['Aucun', 'Débutant', 'Autonome', 'Expert']);
  assert.equal(LEVEL_HINTS.length, 4);
  assert.ok(isLevel(0) && isLevel(3));
  assert.ok(!isLevel(4) && !isLevel(-1) && !isLevel(2.5) && !isLevel('3') && !isLevel(null));
  assert.deepEqual(DEFAULT_TARGETS, { refTarget: 2, backupTarget: 1 });
});

test('saisie d\'une note : niveau, et envie enregistrée seulement quand elle manque', () => {
  assert.deepEqual(ratingUpdate('m', 's', 2, true), { 'levels/m/s': 2, 'noProgress/m/s': null });
  assert.deepEqual(ratingUpdate('m', 's', 3, false), { 'levels/m/s': 3, 'noProgress/m/s': true });
  assert.deepEqual(ratingUpdate('m', 's', null, false), { 'levels/m/s': null, 'noProgress/m/s': null }, 'effacer la note');
});

test('nom de personne : espaces nettoyés, longueur et unicité sans tenir compte de la casse', () => {
  assert.equal(normalizeText('  Julie   Martin '), 'Julie Martin');
  assert.deepEqual(validateMemberName('  Julie '), { ok: true, name: 'Julie' });
  assert.deepEqual(validateMemberName('   '), { ok: false, error: MESSAGES.nameLength });
  assert.deepEqual(validateMemberName('a'.repeat(31)), { ok: false, error: MESSAGES.nameLength });
  const team = [{ id: 'm1', name: 'Julie' }];
  assert.deepEqual(validateMemberName('julie', team), { ok: false, error: MESSAGES.nameTaken });
  assert.deepEqual(validateMemberName('JULIE', team, 'm1'), { ok: true, name: 'JULIE' }, 'renommer sans changer de personne');
});

test('nom de compétence : longueur et unicité', () => {
  assert.deepEqual(validateSkillLabel(' Docker '), { ok: true, label: 'Docker' });
  assert.deepEqual(validateSkillLabel('x'.repeat(61)), { ok: false, error: MESSAGES.labelLength });
  assert.deepEqual(validateSkillLabel('docker', [{ id: 's1', label: 'Docker' }]), { ok: false, error: MESSAGES.labelTaken });
});

test('un nouvel élément se place après le dernier', () => {
  assert.equal(nextOrder([]), 1);
  assert.equal(nextOrder([{ order: 3 }, { order: 7 }]), 8);
});

// ---------------------------------------------------------------- Lecture de la base

test('lecture de la base : tri, valeurs invalides ignorées, notes orphelines ignorées, envie', () => {
  const { skills, members } = parseMatrix({
    scale: 2,
    skills: { b: { label: 'B', refTarget: 3, backupTarget: 9, order: 2 }, a: { label: 'A', order: 1 }, bad: { order: 3 } },
    members: { m2: { name: 'Zoé', order: 2 }, m1: { name: 'Marc', order: 1 } },
    levels: { m1: { a: 3, b: 7, gone: 2 }, ghost: { a: 3 } },
    noProgress: { m1: { a: true, gone: true }, m2: { b: 'oui' } },
  });
  assert.deepEqual(skills.map((s) => s.id), ['a', 'b']);
  assert.deepEqual(skills[0], { id: 'a', label: 'A', refTarget: 2, backupTarget: 1, order: 1 });
  assert.equal(skills[1].backupTarget, 1, 'cible hors échelle remplacée par la valeur par défaut');
  assert.deepEqual(members.map((m) => m.name), ['Marc', 'Zoé']);
  assert.deepEqual(members[0].ratings, { a: 3 });
  assert.deepEqual(members[0].noProgress, { a: true });
  assert.deepEqual(members[1].noProgress, {}, 'valeur autre que true ignorée');
  assert.equal(ratedCount(members[0], skills), 1);
});

test('base vide', () => {
  assert.deepEqual(parseMatrix(null), { skills: [], members: [], trash: [] });
});

// ---------------------------------------------------------------- Conversion de l'ancienne échelle

test('conversion : notes et cibles de l\'ancienne échelle', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(convertOldRating), [
    { level: 0, wants: false }, { level: 0, wants: true }, { level: 1, wants: true }, { level: 2, wants: true }, { level: 3, wants: true },
  ]);
  assert.equal(convertOldRating(5), null);
  assert.deepEqual([0, 1, 2, 3, 4].map(convertOldTarget), [0, 0, 1, 2, 3]);
});

test('conversion d\'une équipe : une écriture, corbeille comprise, anciennes notes effacées', () => {
  const old = {
    skills: { k1: { label: 'Kafka', refTarget: 3, backupTarget: 2, order: 1 }, k2: { label: 'Old', refTarget: 4, backupTarget: 1, order: 2, deletedAt: 5 } },
    members: { v: { name: 'Vincent', order: 1 } },
    ratings: { v: { k1: 4, k2: 0, gone: 3 }, ghost: { k1: 2 } },
  };
  assert.deepEqual(migrationUpdate(old), {
    scale: 2,
    'levels/v/k1': 3, 'levels/v/k2': 0, 'noProgress/v/k2': true,
    ratings: null,
    'skills/k1/refTarget': 2, 'skills/k1/backupTarget': 1,
    'skills/k2/refTarget': 3, 'skills/k2/backupTarget': 0,
  });
  const converted = parseMatrix(applyPaths(old, migrationUpdate(old)));
  assert.deepEqual([converted.members[0].ratings, converted.skills[0].refTarget], [{ k1: 3 }, 2], 'Vincent Expert, cible Autonome');
  assert.equal(migrationUpdate({ ...old, scale: 2 }), null, 'déjà convertie');
  assert.deepEqual(migrationUpdate({}), { scale: 2 }, 'équipe vide');
});

// ---------------------------------------------------------------- Couverture

test('référent = meilleur niveau, back-up = deuxième, comme GRANDE.VALEUR dans l\'Excel', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const a = assessSkill(skills[0], members);
  assert.equal(a.referent.member.name, 'Dev 2');
  assert.equal(a.refLevel, 3);
  assert.equal(a.backup.member.name, 'Dev 1');
  assert.equal(a.backupLevel, 2);
  assert.equal(a.status, STATUS.backup);
});

test('exemple Excel converti : toujours 4 compétences couvertes sur 15 (Skill 4, 8, 13 et 14)', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const o = overview(skills, members);
  assert.equal(o.total, 15);
  assert.equal(o.covered, 4);
  assert.deepEqual(o.results.filter((r) => r.assessment.status === STATUS.ok).map((r) => r.skill.label),
    ['Skill 4', 'Skill 8', 'Skill 13', 'Skill 14']);
  assert.equal(o.atRisk, 11);
});

test('à égalité, le référent est départagé par ordre alphabétique', () => {
  const skill = { id: 's', refTarget: 2, backupTarget: 2 };
  const a = assessSkill(skill, [member('2', 'Zoé', { s: 2 }), member('1', 'Anna', { s: 2 })]);
  assert.equal(a.referent.member.name, 'Anna');
  assert.equal(a.backup.member.name, 'Zoé');
  assert.equal(a.status, STATUS.ok);
});

test('personne non notée ou équipe vide : niveau Aucun et rôle non pourvu', () => {
  const skill = { id: 's', refTarget: 1, backupTarget: 0 };
  const a = assessSkill(skill, [member('1', 'Anna', {})]);
  assert.equal(a.referent, null);
  assert.equal(a.refLevel, 0);
  assert.equal(a.status, STATUS.referent);
  assert.equal(assessSkill({ id: 's', refTarget: 0, backupTarget: 0 }, []).status, STATUS.ok, 'cible Aucun toujours atteinte');
});

// ---------------------------------------------------------------- Absences

test('simulation d\'absence : les absents ne comptent plus', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const pool = presentMembers(members, ['d3']);
  assert.deepEqual(pool.map((m) => m.id), ['d1', 'd2']);
  // Skill 4 : Dev 3 était référent Expert ; sans lui, le référent n'est plus qu'Autonome pour une cible Expert.
  assert.equal(assessSkill(skills[3], pool).status, STATUS.referent);
  assert.equal(overview(skills, pool).covered, 2);
});

test('impact d\'une absence : rôles portés et compétences perdues', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const dev3 = memberImpact(skills, members, 'd3');
  assert.deepEqual(dev3.lost.map((s) => s.label), ['Skill 4', 'Skill 8']);
  assert.deepEqual([dev3.referentCount, dev3.backupCount], [2, 8]);
  const dev1 = memberImpact(skills, members, 'd1');
  assert.deepEqual(dev1.lost.map((s) => s.label), ['Skill 8']);
  assert.deepEqual([dev1.referentCount, dev1.backupCount], [10, 4]);
  assert.deepEqual(memberImpact(skills, members, 'd2').lost, []);
});

// ---------------------------------------------------------------- Plan de formation

test('plan : trié par écart, candidats qui veulent progresser, les plus avancés d\'abord', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const plan = trainingPlan(skills, members);
  assert.equal(plan.length, 11);
  assert.ok(plan.every((item, i) => i === 0 || plan[i - 1].totalGap >= item.totalGap));
  // Skill 9 : référent Autonome pour Expert, back-up Débutant pour Expert, écart total 3.
  assert.equal(plan[0].skill.label, 'Skill 9');
  assert.equal(plan[0].totalGap, 3);
  assert.equal(plan[0].role, 'referent');
  assert.deepEqual(plan[0].candidates.map((c) => [c.member.name, c.level, c.steps]), [['Dev 1', 2, 1], ['Dev 3', 1, 2], ['Dev 2', 0, 3]]);
});

test('plan : une personne qui ne souhaite pas progresser n\'est jamais proposée', () => {
  const skill = { id: 's', label: 'Mainframe', refTarget: 2, backupTarget: 1, order: 1 };
  const plan = trainingPlan([skill], [member('m', 'Marc', { s: 1 }, { s: true }), member('j', 'Julie', { s: 0 })]);
  assert.deepEqual(plan[0].candidates.map((c) => c.member.name), ['Julie']);
  const nobody = trainingPlan([skill], [member('a', 'A', { s: 0 }, { s: true }), member('b', 'B', { s: 1 }, { s: true })]);
  assert.deepEqual(nobody[0].candidates, []);
  assert.equal(nobody[0].nobodyInterested, true);
});

test('plan : le référent à sa cible n\'est pas proposé comme back-up', () => {
  const skill = { id: 's', label: 'S', refTarget: 2, backupTarget: 2, order: 1 };
  const plan = trainingPlan([skill], [member('a', 'Anna', { s: 2 }), member('b', 'Bob', { s: 1 }), member('c', 'Chloé', {})]);
  assert.equal(plan[0].role, 'backup');
  assert.deepEqual(plan[0].candidates.map((c) => c.member.name), ['Bob']);
  assert.equal(plan[0].unrated, 1);
});

// ---------------------------------------------------------------- Corbeille

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const withTrash = () => ({
  scale: 2,
  skills: {
    k1: { label: 'Kafka', refTarget: 2, backupTarget: 1, order: 1 },
    k2: { label: 'Mainframe', refTarget: 1, backupTarget: 0, order: 2, deletedAt: NOW - 91 * DAY },
  },
  members: {
    j: { name: 'Julie', order: 1 },
    m: { name: 'Marc', order: 2, deletedAt: NOW - 10 * DAY },
    p: { name: 'Paul', order: 3, deletedAt: NOW - 95 * DAY },
  },
  levels: { j: { k1: 2, k2: 1 }, m: { k1: 3, k2: 0 }, p: { k1: 1 } },
  noProgress: { j: { k2: true }, p: { k1: true } },
});

test('corbeille : éléments supprimés et leurs notes hors des calculs', () => {
  const matrix = parseMatrix(withTrash());
  assert.deepEqual(matrix.skills.map((s) => s.label), ['Kafka']);
  assert.deepEqual(matrix.members.map((m) => m.name), ['Julie']);
  assert.deepEqual(matrix.members[0].ratings, { k1: 2 }, 'note sur une compétence à la corbeille ignorée');
  assert.deepEqual(matrix.members[0].noProgress, {}, 'envie sur une compétence à la corbeille ignorée');
  assert.equal(overview(matrix.skills, matrix.members).results[0].assessment.refLevel, 2, 'Marc (Expert) ne compte plus');
  assert.deepEqual(matrix.trash.map((t) => [t.kind, t.name, t.ratingCount]), [
    ['member', 'Marc', 2], ['skill', 'Mainframe', 2], ['member', 'Paul', 1],
  ]);
});

test('noms uniques hors corbeille : un nom à la corbeille peut être réutilisé', () => {
  const matrix = parseMatrix(withTrash());
  assert.deepEqual(validateMemberName('marc', matrix.members), { ok: true, name: 'marc' });
});

test('rétablir : refusé si le nom a été repris entre-temps', () => {
  const raw = withTrash();
  const marc = parseMatrix(raw).trash.find((t) => t.name === 'Marc');
  assert.deepEqual(checkRestore(marc, parseMatrix(raw)), { ok: true });
  raw.members.m2 = { name: 'MARC', order: 4 };
  assert.deepEqual(checkRestore(marc, parseMatrix(raw)), { ok: false, error: MESSAGES.restoreMemberTaken });
  raw.skills.k3 = { label: 'mainframe', refTarget: 2, backupTarget: 1, order: 3 };
  const mainframe = parseMatrix(raw).trash.find((t) => t.name === 'Mainframe');
  assert.deepEqual(checkRestore(mainframe, parseMatrix(raw)), { ok: false, error: MESSAGES.restoreSkillTaken });
});

test('purge à 90 jours, pas avant', () => {
  assert.equal(PURGE_MS, 90 * DAY);
  assert.equal(isPurgeable(NOW - 91 * DAY, NOW), true);
  assert.equal(isPurgeable(NOW - 90 * DAY, NOW), false);
  assert.equal(isPurgeable(NOW - 10 * DAY, NOW), false);
  assert.equal(isPurgeable(null, NOW), false);
  assert.equal(daysBeforePurge(NOW - 10 * DAY, NOW), 80);
  assert.equal(daysBeforePurge(NOW - 95 * DAY, NOW), 0);
});

test('purge d\'une équipe : personnes et compétences échues avec leurs notes et envies, en une écriture', () => {
  assert.deepEqual(purgeTeamDataUpdate(withTrash(), NOW), {
    'members/p': null, 'levels/p': null, 'noProgress/p': null,
    'skills/k2': null, 'levels/j/k2': null, 'levels/m/k2': null, 'noProgress/j/k2': null,
  });
  assert.equal(purgeTeamDataUpdate({}, NOW), null);
  assert.deepEqual(purgeTeamUpdate('abcdefghijkl'), { 'teams/abcdefghijkl': null, 'teamData/abcdefghijkl': null });
});

// ---------------------------------------------------------------- Équipes

test('identifiant d\'équipe : 12 caractères a-z0-9, tirage uniforme', () => {
  let call = 0;
  const fake = (array) => { array.forEach((_, i) => { array[i] = call === 0 ? (i === 0 ? 255 : i) : 0; }); call += 1; return array; };
  assert.equal(newTeamId(fake), 'bcdefghijklm', 'octet 255 rejeté');
  const id = newTeamId();
  assert.ok(isTeamId(id), id);
  assert.notEqual(newTeamId(), id);
  assert.ok(!isTeamId('ABCDEFGHIJKL') && !isTeamId('abc') && !isTeamId('abcdefghijk!'));
});

test('ouvrir avec un lien : adresse complète ou identifiant seul', () => {
  assert.equal(parseTeamId(' k7f3q2m9x1ab '), 'k7f3q2m9x1ab');
  assert.equal(parseTeamId('K7F3Q2M9X1AB'), 'k7f3q2m9x1ab');
  assert.equal(parseTeamId('https://agileroy.github.io/matrice-competences/?equipe=k7f3q2m9x1ab'), 'k7f3q2m9x1ab');
  assert.equal(parseTeamId('https://agileroy.github.io/matrice-competences/?equipe=trop-court'), null);
  assert.equal(parseTeamId('bonjour'), null);
  assert.equal(teamUrl('https://agileroy.github.io/matrice-competences/?x=1#a', 'k7f3q2m9x1ab'),
    'https://agileroy.github.io/matrice-competences/?equipe=k7f3q2m9x1ab');
});

test('nom d\'équipe : 1 à 50 caractères', () => {
  assert.deepEqual(validateTeamName('  Équipe   Paiement '), { ok: true, name: 'Équipe Paiement' });
  assert.deepEqual(validateTeamName(''), { ok: false, error: MESSAGES.teamNameLength });
  assert.deepEqual(validateTeamName('x'.repeat(51)), { ok: false, error: MESSAGES.teamNameLength });
  assert.equal(MESSAGES.teamNameLength, 'Saisissez un nom d\'équipe de 1 à 50 caractères');
});

test('fiche d\'équipe et vue d\'administration', () => {
  assert.equal(parseTeam('a', null), null);
  assert.deepEqual(parseTeam('a', { name: 'Paiement', createdAt: 5 }), { id: 'a', name: 'Paiement', createdAt: 5, deletedAt: null });
  const o = teamsOverview(
    { a: { name: 'Paiement', createdAt: 1 }, b: { name: 'Mobile', createdAt: 2 }, c: { name: 'Data', createdAt: 3, deletedAt: 9 }, d: { bad: true } },
    { a: withTrash() },
  );
  assert.deepEqual(o.active.map((t) => [t.name, t.memberCount, t.skillCount]), [['Mobile', 0, 0], ['Paiement', 1, 1]]);
  assert.deepEqual(o.trash.map((t) => t.name), ['Data']);
});

test('équipes récentes : la plus récente d\'abord, sans doublon, renommage et oubli', () => {
  let list = rememberTeam(null, { id: 'aaaaaaaaaaaa', name: 'Paiement' }, 1);
  list = rememberTeam(list, { id: 'bbbbbbbbbbbb', name: 'Mobile' }, 2);
  assert.deepEqual(list.map((t) => t.name), ['Mobile', 'Paiement']);
  list = rememberTeam(list, { id: 'aaaaaaaaaaaa', name: 'Paiement' }, 3);
  assert.deepEqual(list.map((t) => t.name), ['Paiement', 'Mobile']);
  assert.equal(list.length, 2);
  assert.deepEqual(renameRecentTeam(list, 'bbbbbbbbbbbb', 'App mobile').map((t) => t.name), ['Paiement', 'App mobile']);
  assert.deepEqual(forgetTeam(list, 'aaaaaaaaaaaa').map((t) => t.name), ['Mobile']);
  assert.deepEqual(recentTeams([{ id: 'x', name: 'n', lastVisit: 1 }, 'bad', null]), []);
});

// ---------------------------------------------------------------- Réorganisation

test('déplacer un élément : en tête, en fin, vers le bas, vers le haut, sans effet', () => {
  const ids = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveTo(ids, 'c', 0), ['c', 'a', 'b', 'd']);
  assert.deepEqual(moveTo(ids, 'a', 4), ['b', 'c', 'd', 'a']);
  assert.deepEqual(moveTo(ids, 'a', 3), ['b', 'c', 'a', 'd'], 'avant d');
  assert.deepEqual(moveTo(ids, 'd', 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(moveTo(ids, 'b', 1), ids, 'à sa place');
  assert.deepEqual(moveTo(ids, 'b', 2), ids, 'juste après soi : à sa place');
  assert.deepEqual(moveTo(ids, 'x', 0), ids, 'inconnu');
});

test('nouvel ordre : seules les positions qui changent sont écrites', () => {
  const items = [{ id: 'a', order: 1 }, { id: 'b', order: 2 }, { id: 'c', order: 5 }];
  assert.deepEqual(reorderUpdate('skill', items, ['b', 'a', 'c']), { 'skills/b/order': 1, 'skills/a/order': 2, 'skills/c/order': 3 });
  assert.deepEqual(reorderUpdate('member', [{ id: 'a', order: 1 }, { id: 'b', order: 2 }], ['a', 'b']), null);
});

test('suppression définitive d\'un élément de la corbeille, avec ses notes', () => {
  assert.deepEqual(purgeItemUpdate(withTrash(), 'member', 'm'), { 'members/m': null, 'levels/m': null, 'noProgress/m': null });
  assert.deepEqual(purgeItemUpdate(withTrash(), 'skill', 'k2'), { 'skills/k2': null, 'levels/j/k2': null, 'levels/m/k2': null, 'noProgress/j/k2': null });
});
