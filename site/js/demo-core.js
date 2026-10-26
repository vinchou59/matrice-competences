// Équipe de démonstration : jeu de données fictif et demande de création d'équipe par e-mail.
// Logique pure (sans DOM, Firebase ni stockage) : importée par l'interface, le stockage de la démo et les tests.

import { SCALE_VERSION } from './matrix-core.js?v=__VERSION__';

/** Valeur de `?equipe=` qui ouvre la démo (jamais un identifiant d'équipe : ceux-ci font 12 caractères). */
export const DEMO_TEAM_ID = 'demo';
export const DEMO_TEAM_NAME = 'Équipe démo';

// Adresse assemblée à l'exécution, pour ne pas l'offrir telle quelle aux robots qui parcourent les pages.
const CONTACT = ['vincentleroy59199', 'hotmail.fr'];
export const contactEmail = () => CONTACT.join('@');

/** Lien `mailto:` vers l'administrateur, avec un objet et un message à compléter. */
export function teamRequestMailto() {
  const subject = 'Matrice de compétences : création d\'une équipe';
  const body = [
    'Bonjour,',
    '',
    'Je souhaite une équipe dans la matrice de compétences.',
    '',
    'Nom de l\'équipe : ',
    'Personnes (facultatif) : ',
    'Compétences (facultatif) : ',
    '',
    'Vous pouvez aussi joindre le modèle Excel rempli.',
    '',
    'Merci !',
  ].join('\r\n');
  return `mailto:${contactEmail()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Équipe fictive : de quoi voir chaque cas de l'outil (compétence couverte, couverte mais fragile,
// back-up insuffisant, référent insuffisant, personne qui ne souhaite progresser, cases non notées).
const PEOPLE = ['Alice', 'Bastien', 'Chloé', 'David', 'Emma', 'Farid'];
// [compétence, cible référent, cible back-up, niveaux par personne (null : non noté ; suffixe « x » : ne souhaite pas progresser)]
const SKILLS = [
  ['Java', 3, 2, [3, 2, '2x', 1, 1, 0]],
  ['Kafka', 2, 1, [2, 0, 0, '0x', 0, 1]],
  ['Kubernetes', 2, 1, [0, 3, 1, 0, 0, null]],
  ['SQL', 2, 1, [2, 2, 3, 2, 1, 2]],
  ['Tests automatisés', 2, 2, [1, 0, 2, 1, 1, 0]],
  ['Sécurité applicative', 2, 1, ['1x', '0x', 0, 1, 0, null]],
  ['Supervision', 2, 1, ['0x', '0x', '0x', '0x', 3, '0x']],
  ['Métier : paiement', 3, 1, [2, 0, 1, 0, 0, 3]],
];

/** État de départ de la démo, au format de la base : `{ team, data }`. */
export function demoSeed(now = Date.now()) {
  const members = {};
  const skills = {};
  const levels = {};
  const noProgress = {};
  PEOPLE.forEach((name, i) => { members[`m${i + 1}`] = { name, order: i + 1 }; });
  SKILLS.forEach(([label, refTarget, backupTarget, row], j) => {
    const skillId = `s${j + 1}`;
    skills[skillId] = { label, refTarget, backupTarget, order: j + 1 };
    row.forEach((value, i) => {
      if (value === null) return;
      const memberId = `m${i + 1}`;
      (levels[memberId] ??= {})[skillId] = Number.parseInt(value, 10);
      if (String(value).endsWith('x')) (noProgress[memberId] ??= {})[skillId] = true;
    });
  });
  return {
    team: { name: DEMO_TEAM_NAME, createdAt: now },
    data: { scale: SCALE_VERSION, skills, members, levels, noProgress },
  };
}
