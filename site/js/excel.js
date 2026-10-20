// Interface du modèle Excel : téléchargement, choix d'un fichier et fenêtre d'aperçu avant import.
// Les modules de lecture et d'écriture ne sont chargés qu'à la première utilisation.

import { $, esc, plural } from './shared.js?v=__VERSION__';

const loadModules = () => Promise.all([import('./xlsx-lite.js?v=__VERSION__'), import('./template-core.js?v=__VERSION__')]);

/** Propose le fichier au téléchargement. */
function download(bytes, fileName) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Télécharge le modèle : vide, ou pré-rempli avec une équipe ({ teamName, skills, members }). */
export async function downloadTemplate(team = {}) {
  const [{ writeXlsx }, { buildTemplate, templateFileName }] = await loadModules();
  download(await writeXlsx(buildTemplate(team)), templateFileName(team.teamName));
}

/** Ouvre le sélecteur de fichier ; renvoie le fichier choisi, ou null. */
function pickFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.addEventListener('change', () => resolve(input.files[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/**
 * Choisit un fichier et calcule le plan d'import. `target` : null (nouvelle équipe) ou les données de l'équipe
 * (`parseMatrix`). Renvoie { fileName, plan } ou null si aucun fichier n'est choisi.
 */
export async function chooseImportFile(target) {
  const file = await pickFile();
  if (!file) return null;
  const [{ readXlsx, MAX_FILE_BYTES }, { parseTemplate, planImport }] = await loadModules();
  const failure = (message) => ({ fileName: file.name, plan: { teamName: '', skills: [], members: [], ignored: [], errors: [message], canImport: false } });
  if (file.size > MAX_FILE_BYTES) return failure('Fichier trop volumineux : 2 Mo au plus');
  let workbook;
  try {
    workbook = await readXlsx(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return failure('Fichier illisible : enregistrez-le au format Excel (.xlsx) et réessayez');
  }
  return { fileName: file.name, plan: planImport(parseTemplate(workbook), target) };
}

function dialog() {
  let el = $('import-dialog');
  if (!el) {
    el = document.createElement('dialog');
    el.id = 'import-dialog';
    el.className = 'dialog dialog-wide';
    el.setAttribute('aria-labelledby', 'import-title');
    document.body.append(el);
  }
  return el;
}

const list = (items, render) => `<ul class="import-list">${items.map((x) => `<li>${render(x)}</li>`).join('')}</ul>`;
const KIND = { skill: 'Compétence', member: 'Personne' };

/**
 * Affiche l'aperçu d'un import et attend la décision. `targetLabel` décrit l'équipe concernée.
 * Renvoie true si l'utilisateur clique sur « Importer ».
 */
export function previewImport({ fileName, plan, targetLabel }) {
  const el = dialog();
  const adding = plan.skills.length + plan.members.length;
  const nothing = !plan.errors.length && !plan.canImport;
  el.innerHTML = `
    <h2 id="import-title">Aperçu de l'import</h2>
    <p class="muted">${esc(fileName)} → <b>${esc(targetLabel)}</b></p>
    <div class="import-stats">
      <div class="stat"><b>${plan.members.length}</b><span>${plural(plan.members.length, 'personne à ajouter', 'personnes à ajouter')}</span></div>
      <div class="stat"><b>${plan.skills.length}</b><span>${plural(plan.skills.length, 'compétence à ajouter', 'compétences à ajouter')}</span></div>
      <div class="stat"><b>${plan.ignored.length}</b><span>${plural(plan.ignored.length, 'ignorée', 'ignorées')}</span></div>
    </div>
    ${plan.errors.length ? `<div class="import-errors" role="alert"><b>${plan.errors.length} ${plural(plan.errors.length, 'erreur à corriger', 'erreurs à corriger')} dans le fichier avant d'importer :</b>${list(plan.errors, esc)}</div>` : ''}
    ${nothing ? '<p class="notice">Rien à ajouter : tout ce que contient le fichier est déjà dans l\'équipe.</p>' : ''}
    ${plan.members.length ? `<details><summary>Personnes à ajouter (${plan.members.length})</summary>${list(plan.members, (m) => esc(m.name))}</details>` : ''}
    ${plan.skills.length ? `<details><summary>Compétences à ajouter (${plan.skills.length})</summary>${list(plan.skills, (s) => esc(s.label))}</details>` : ''}
    ${plan.ignored.length ? `<details ${adding ? '' : 'open'}><summary>Ignorées (${plan.ignored.length})</summary>${list(plan.ignored, (x) => `${KIND[x.kind]} « ${esc(x.name)} » <span class="muted">· ligne ${x.row} : ${esc(x.reason)}</span>`)}</details>` : ''}
    <p class="muted">L'import ajoute seulement : rien n'est modifié ni supprimé. Les compétences ajoutées ont les cibles par défaut (3 pour le référent, 2 pour le back-up), à ajuster dans le tableau ; les notes se saisissent ensuite dans l'application.</p>
    <div class="dialog-actions">
      <button type="button" class="button" data-choice="cancel">Annuler</button>
      <button type="button" class="button button-primary" data-choice="import" ${plan.canImport ? '' : 'disabled'}>Importer</button>
    </div>`;
  return new Promise((resolve) => {
    const done = (value) => { el.close(); resolve(value); };
    el.onclick = (event) => {
      const choice = event.target.closest('[data-choice]')?.dataset.choice;
      if (choice) done(choice === 'import');
      else if (event.target === el) done(false);
    };
    el.oncancel = (event) => { event.preventDefault(); done(false); };
    el.showModal();
  });
}

/** Message de fin d'import : « 2 compétences et 3 personnes ajoutées ». */
export function importSummary(plan) {
  const parts = [];
  if (plan.members.length) parts.push(`${plan.members.length} ${plural(plan.members.length, 'personne', 'personnes')}`);
  if (plan.skills.length) parts.push(`${plan.skills.length} ${plural(plan.skills.length, 'compétence', 'compétences')}`);
  const total = plan.skills.length + plan.members.length;
  return parts.length ? `${parts.join(' et ')} ${plural(total, 'ajoutée', 'ajoutées')}.` : '';
}
