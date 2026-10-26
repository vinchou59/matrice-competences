import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMatrix, overview, assessSkill, trainingPlan, memberImpact, isTeamId, parseTeamId, SCALE_VERSION, STATUS,
} from '../site/js/matrix-core.js';
import { DEMO_TEAM_ID, DEMO_TEAM_NAME, demoSeed, contactEmail, teamRequestMailto } from '../site/js/demo-core.js';
import { createDemoStore, DEMO_STORAGE_KEY } from '../site/js/demo-store.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const memoryStorage = (initial = {}) => {
  const items = new Map(Object.entries(initial));
  return { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, String(v)), items };
};
const byName = (matrix, label) => matrix.skills.find((s) => s.label === label);

test('la démo ne peut pas être confondue avec une vraie équipe', () => {
  assert.equal(isTeamId(DEMO_TEAM_ID), false);
  assert.equal(parseTeamId(DEMO_TEAM_ID), null);
});

test('jeu de démo : chaque cas de l\'outil est visible', () => {
  const { team, data } = demoSeed(1000);
  assert.deepEqual(team, { name: DEMO_TEAM_NAME, createdAt: 1000 });
  assert.equal(data.scale, SCALE_VERSION, 'déjà à la nouvelle échelle : aucune conversion');
  const matrix = parseMatrix(data);
  const { skills, members } = matrix;
  assert.equal(members.length, 6);
  assert.equal(skills.length, 8);
  const o = overview(skills, members);
  assert.equal(o.covered, 5);
  const status = (label) => assessSkill(byName(matrix, label), members).status;
  assert.equal(status('Tests automatisés'), STATUS.backup);
  assert.equal(status('Sécurité applicative'), STATUS.referent);
  // Absence qui coûte : Alice porte Java et Kafka.
  const alice = members.find((m) => m.name === 'Alice');
  assert.deepEqual(memberImpact(skills, members, alice.id).lost.map((s) => s.label), ['Java', 'Kafka']);
  // Plan : des candidats, et une compétence où personne d'autre ne souhaite progresser.
  const plan = trainingPlan(skills, members);
  assert.ok(plan.find((p) => p.skill.label === 'Tests automatisés').candidates.length > 0);
  assert.deepEqual(plan.find((p) => p.skill.label === 'Supervision').candidates, []);
  assert.ok(members.some((m) => Object.keys(m.noProgress).length), 'cases « ne souhaite pas progresser »');
  assert.ok(plan.some((p) => p.unrated > 0), 'cases non notées');
});

test('demande d\'équipe : e-mail prêt à envoyer', () => {
  const link = teamRequestMailto();
  assert.ok(link.startsWith(`mailto:${contactEmail()}?subject=`));
  const params = new URLSearchParams(link.split('?')[1]);
  assert.match(params.get('subject'), /création d'une équipe/);
  assert.match(params.get('body'), /Nom de l'équipe :/);
});

test('stockage de la démo : état de départ, écritures enregistrées, relecture', async () => {
  const storage = memoryStorage();
  const store = createDemoStore({ storage, events: null, now: () => 5000 });
  let data = null;
  store.onTeamData(DEMO_TEAM_ID, (raw) => { data = raw; });
  await tick();
  assert.equal(Object.keys(data.members).length, 6);

  const d = store.teamData(DEMO_TEAM_ID);
  const id = await d.addMember({ name: 'Zoé', order: 7 });
  await d.setRating(id, 's1', 2, false);
  await d.updateSkill('s1', { refTarget: 1 });
  await d.trash('skill', 's2');
  await tick();
  assert.equal(data.members[id].name, 'Zoé');
  assert.equal(data.levels[id].s1, 2);
  assert.equal(data.noProgress[id].s1, true);
  assert.equal(data.skills.s1.refTarget, 1);
  assert.equal(data.skills.s1.label, 'Java', 'mise à jour partielle');
  assert.equal(data.skills.s2.deletedAt, 5000);

  await d.setRating(id, 's1', null, true);
  await tick();
  assert.equal(data.levels[id], undefined);
  assert.equal(data.noProgress[id], undefined);

  // Nouvelle visite : la démo reprend où on l'avait laissée.
  const again = createDemoStore({ storage, events: null });
  let team = null;
  again.onTeam(DEMO_TEAM_ID, (raw) => { team = raw; });
  again.onTeamData(DEMO_TEAM_ID, (raw) => { data = raw; });
  await again.renameTeam(DEMO_TEAM_ID, 'Mon essai');
  await tick();
  assert.equal(team.name, 'Mon essai');
  assert.equal(data.members[id].name, 'Zoé');
  assert.equal(await again.isAdmin('x'), false);
});

test('stockage de la démo : recommencer, contenu illisible, stockage bloqué', async () => {
  const storage = memoryStorage();
  const store = createDemoStore({ storage, events: null });
  await store.teamData(DEMO_TEAM_ID).addMember({ name: 'Zoé', order: 7 });
  await store.resetDemo();
  assert.equal(Object.keys(JSON.parse(storage.items.get(DEMO_STORAGE_KEY)).teamData.demo.members).length, 6);

  const broken = createDemoStore({ storage: memoryStorage({ [DEMO_STORAGE_KEY]: '{oups' }), events: null });
  assert.equal((await broken.getTeam(DEMO_TEAM_ID)).name, DEMO_TEAM_NAME);

  const blocked = { getItem: () => { throw new Error('bloqué'); }, setItem: () => { throw new Error('bloqué'); } };
  const memoryOnly = createDemoStore({ storage: blocked, events: null });
  assert.equal(await memoryOnly.teamData(DEMO_TEAM_ID).addSkill({ label: 'Go', refTarget: 2, backupTarget: 1, order: 9 }) !== null, true);
});

test('stockage de la démo : un autre onglet modifie la démo', async () => {
  const listeners = [];
  const events = { addEventListener: (type, f) => { if (type === 'storage') listeners.push(f); } };
  const storage = memoryStorage();
  const store = createDemoStore({ storage, events });
  let team = null;
  store.onTeam(DEMO_TEAM_ID, (raw) => { team = raw; });
  const other = createDemoStore({ storage, events: null });
  await other.renameTeam(DEMO_TEAM_ID, 'Renommée ailleurs');
  listeners.forEach((f) => f({ key: DEMO_STORAGE_KEY, newValue: storage.items.get(DEMO_STORAGE_KEY) }));
  await tick();
  assert.equal(team.name, 'Renommée ailleurs');
});
