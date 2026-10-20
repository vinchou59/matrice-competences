import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, MESSAGES, STATUS, isLevel, normalizeText, validateMemberName, validateSkillLabel, nextOrder,
  parseMatrix, ratedCount, assessSkill, overview, presentMembers, memberImpact, trainingPlan,
  deleteSkillUpdate, deleteMemberUpdate,
} from '../site/js/matrix-core.js';

// Exemple du modèle Excel d'origine : 3 développeurs, 15 compétences.
// [Dev 1, Dev 2, Dev 3, cible référent, cible back-up]
const EXCEL = [
  [3, 4, 2, 4, 4], [2, 3, 3, 4, 3], [1, 3, 1, 3, 3], [3, 3, 4, 4, 3], [1, 1, 1, 2, 2],
  [3, 1, 2, 4, 3], [3, 1, 2, 4, 2], [3, 1, 2, 3, 2], [3, 1, 2, 4, 4], [3, 1, 2, 4, 3],
  [3, 1, 2, 3, 3], [2, 1, 2, 4, 2], [3, 3, 3, 3, 2], [3, 3, 4, 3, 3], [3, 3, 2, 4, 3],
];
const excelRaw = () => {
  const raw = { skills: {}, members: {}, ratings: { d1: {}, d2: {}, d3: {} } };
  ['d1', 'd2', 'd3'].forEach((id, i) => { raw.members[id] = { name: `Dev ${i + 1}`, order: i + 1 }; });
  EXCEL.forEach(([a, b, c, ref, bk], i) => {
    const id = `s${String(i + 1).padStart(2, '0')}`;
    raw.skills[id] = { label: `Skill ${i + 1}`, refTarget: ref, backupTarget: bk, order: i + 1 };
    raw.ratings.d1[id] = a; raw.ratings.d2[id] = b; raw.ratings.d3[id] = c;
  });
  return raw;
};

// ---------------------------------------------------------------- Échelle et saisies

test('échelle de 0 à 4', () => {
  assert.equal(LEVELS.length, 5);
  assert.equal(LEVELS[1], 'Ne connaît pas, intéressé·e');
  assert.ok(isLevel(0) && isLevel(4));
  assert.ok(!isLevel(5) && !isLevel(-1) && !isLevel(2.5) && !isLevel('3') && !isLevel(null));
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

test('lecture de la base : tri, valeurs invalides ignorées, notes orphelines ignorées', () => {
  const { skills, members } = parseMatrix({
    skills: { b: { label: 'B', refTarget: 4, backupTarget: 9, order: 2 }, a: { label: 'A', order: 1 }, bad: { order: 3 } },
    members: { m2: { name: 'Zoé', order: 2 }, m1: { name: 'Marc', order: 1 } },
    ratings: { m1: { a: 3, b: 7, gone: 2 }, ghost: { a: 4 } },
  });
  assert.deepEqual(skills.map((s) => s.id), ['a', 'b']);
  assert.deepEqual(skills[0], { id: 'a', label: 'A', refTarget: 3, backupTarget: 2, order: 1 });
  assert.equal(skills[1].backupTarget, 2, 'cible hors échelle remplacée par la valeur par défaut');
  assert.deepEqual(members.map((m) => m.name), ['Marc', 'Zoé']);
  assert.deepEqual(members[0].ratings, { a: 3 });
  assert.deepEqual(members[1].ratings, {});
  assert.equal(ratedCount(members[0], skills), 1);
});

test('base vide', () => {
  assert.deepEqual(parseMatrix(null), { skills: [], members: [] });
});

// ---------------------------------------------------------------- Couverture

test('référent = meilleure note, back-up = deuxième, comme GRANDE.VALEUR dans l\'Excel', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const a = assessSkill(skills[0], members);
  assert.equal(a.referent.member.name, 'Dev 2');
  assert.equal(a.refLevel, 4);
  assert.equal(a.backup.member.name, 'Dev 1');
  assert.equal(a.backupLevel, 3);
  assert.equal(a.status, STATUS.backup);
});

test('exemple Excel : 4 compétences couvertes sur 15 (Skill 4, 8, 13 et 14)', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const o = overview(skills, members);
  assert.equal(o.total, 15);
  assert.equal(o.covered, 4);
  assert.deepEqual(o.results.filter((r) => r.assessment.status === STATUS.ok).map((r) => r.skill.label),
    ['Skill 4', 'Skill 8', 'Skill 13', 'Skill 14']);
  assert.equal(o.atRisk, 11);
});

test('à égalité, le référent est départagé par ordre alphabétique', () => {
  const skill = { id: 's', refTarget: 3, backupTarget: 3 };
  const a = assessSkill(skill, [{ id: '2', name: 'Zoé', ratings: { s: 3 } }, { id: '1', name: 'Anna', ratings: { s: 3 } }]);
  assert.equal(a.referent.member.name, 'Anna');
  assert.equal(a.backup.member.name, 'Zoé');
  assert.equal(a.status, STATUS.ok);
});

test('personne non notée ou équipe vide : niveau 0 et rôle non pourvu', () => {
  const skill = { id: 's', refTarget: 1, backupTarget: 0 };
  const a = assessSkill(skill, [{ id: '1', name: 'Anna', ratings: {} }]);
  assert.equal(a.referent, null);
  assert.equal(a.refLevel, 0);
  assert.equal(a.status, STATUS.referent);
  assert.equal(assessSkill({ id: 's', refTarget: 0, backupTarget: 0 }, []).status, STATUS.ok, 'cible 0 toujours atteinte');
});

// ---------------------------------------------------------------- Absences

test('simulation d\'absence : les absents ne comptent plus', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const pool = presentMembers(members, ['d3']);
  assert.deepEqual(pool.map((m) => m.id), ['d1', 'd2']);
  // Skill 4 : Dev 3 était référent à 4 ; sans lui, le référent n'est plus qu'à 3 pour une cible de 4.
  assert.equal(assessSkill(skills[3], pool).status, STATUS.referent);
  assert.equal(overview(skills, pool).covered, 2);
});

test('impact d\'une absence : rôles portés et compétences perdues', () => {
  const { skills, members } = parseMatrix(excelRaw());
  // Skill 4 perd son référent à 4 ; Skill 8 perd son back-up (Dev 2 n'est qu'à 1 pour une cible de 2).
  const dev3 = memberImpact(skills, members, 'd3');
  assert.deepEqual(dev3.lost.map((s) => s.label), ['Skill 4', 'Skill 8']);
  assert.deepEqual([dev3.referentCount, dev3.backupCount], [2, 8]);
  // À égalité, Dev 1 est référent (ordre alphabétique) : 10 rôles de référent.
  const dev1 = memberImpact(skills, members, 'd1');
  assert.deepEqual(dev1.lost.map((s) => s.label), ['Skill 8']);
  assert.deepEqual([dev1.referentCount, dev1.backupCount], [10, 4]);
  assert.deepEqual(memberImpact(skills, members, 'd2').lost, []);
});

// ---------------------------------------------------------------- Plan de formation

test('plan : trié par écart, candidats intéressés seulement, jamais les niveaux 0', () => {
  const { skills, members } = parseMatrix(excelRaw());
  const plan = trainingPlan(skills, members);
  assert.equal(plan.length, 11);
  assert.ok(plan.every((item, i) => i === 0 || plan[i - 1].totalGap >= item.totalGap));
  // Skill 9 : référent 3/4 et back-up 2/4, écart total 3.
  assert.equal(plan[0].skill.label, 'Skill 9');
  assert.equal(plan[0].totalGap, 3);
  assert.equal(plan[0].role, 'referent');
  assert.deepEqual(plan[0].candidates.map((c) => [c.member.name, c.level, c.steps]), [['Dev 1', 3, 1], ['Dev 3', 2, 2], ['Dev 2', 1, 3]]);
  assert.equal(plan[0].candidates[2].interested, true);

  const noInterest = trainingPlan([{ id: 's', label: 'S', refTarget: 2, backupTarget: 1, order: 1 }],
    [{ id: 'a', name: 'A', ratings: { s: 0 } }, { id: 'b', name: 'B', ratings: { s: 0 } }]);
  assert.deepEqual(noInterest[0].candidates, []);
  assert.equal(noInterest[0].nobodyInterested, true);
});

test('plan : le référent à sa cible n\'est pas proposé comme back-up', () => {
  const skill = { id: 's', label: 'S', refTarget: 3, backupTarget: 3, order: 1 };
  const plan = trainingPlan([skill], [
    { id: 'a', name: 'Anna', ratings: { s: 3 } },
    { id: 'b', name: 'Bob', ratings: { s: 2 } },
    { id: 'c', name: 'Chloé', ratings: {} },
  ]);
  assert.equal(plan[0].role, 'backup');
  assert.deepEqual(plan[0].candidates.map((c) => c.member.name), ['Bob']);
  assert.equal(plan[0].unrated, 1);
});

// ---------------------------------------------------------------- Suppressions

test('supprimer une compétence efface aussi ses notes', () => {
  assert.deepEqual(deleteSkillUpdate('s1', ['m1', 'm2']), { 'skills/s1': null, 'ratings/m1/s1': null, 'ratings/m2/s1': null });
});

test('retirer une personne efface aussi ses notes', () => {
  assert.deepEqual(deleteMemberUpdate('m1'), { 'members/m1': null, 'ratings/m1': null });
});
