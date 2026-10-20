// Page d'une équipe : matrice, radars, équipe, plan de formation et corbeille. Reçoit un « store »
// (Firebase en production, factice pour les essais) et ne contient aucune règle métier : tout calcul passe par matrix-core.js.

import {
  LEVELS, DEFAULT_TARGETS, STATUS_LABELS, NAME_MAX_LENGTH, LABEL_MAX_LENGTH, TEAM_NAME_MAX_LENGTH, MESSAGES,
  isLevel, validateMemberName, validateSkillLabel, validateTeamName, nextOrder, parseMatrix, parseTeam, ratedCount,
  assessSkill, overview, presentMembers, memberImpact, trainingPlan,
  checkRestore, purgeTeamDataUpdate, daysBeforePurge, teamUrl, rememberTeam, forgetTeam,
} from './matrix-core.js?v=__VERSION__';
import {
  $, esc, plural, showScreen, showFatal, toast, WRITE_FAILED, readStored, writeStored, loadRecentTeams, saveRecentTeams,
  formatDate, watchConnection, createConfirm, confirmButton, openShare, siteBaseUrl, TRASH_ICON,
  makeQr, qrSvg, displayUrl, copyLink, copyQr, downloadQr, PENCIL_ICON, CHECK_ICON, CLOSE_ICON,
} from './shared.js?v=__VERSION__';
import { downloadTemplate, chooseImportFile, previewImport, importSummary } from './excel.js?v=__VERSION__';
import { importUpdate } from './template-core.js?v=__VERSION__';

const TAB_KEY = 'matrice-competences.tab';
const TABS = [['matrice', 'Matrice'], ['radars', 'Radars'], ['equipe', 'Équipe'], ['plan', 'Plan de formation'], ['corbeille', 'Corbeille']];
const APP_TITLE = 'Matrice de compétences';

/** Écran affiché à la place de la matrice (équipe introuvable, ou à la corbeille). */
function showMessage(html) {
  $('whoami').hidden = true;
  $('screen-message').innerHTML = html;
  showScreen('message');
}

export function showTeamNotFound(message = MESSAGES.teamNotFound) {
  showMessage(`<div class="empty-state"><h2>${esc(message)}</h2><p class="muted">Le lien est peut-être incomplet, ou l'équipe a été supprimée définitivement.</p><a class="button button-primary" href="./">Revenir à l'accueil</a></div>`);
}

// ---------------------------------------------------------------- Fragments HTML

function levelBox(level, extra = '') {
  return isLevel(level) ? `<div class="lvl l${level} ${extra}">${level}</div>` : `<div class="lvl empty ${extra}">–</div>`;
}

function levelOptions(level, { allowEmpty = false, short = false } = {}) {
  const empty = allowEmpty ? `<option value="" ${isLevel(level) ? '' : 'selected'}>– Non noté</option>` : '';
  return empty + LEVELS.map((label, i) =>
    `<option value="${i}" ${level === i ? 'selected' : ''}>${short ? i : `${i} · ${esc(label)}`}</option>`).join('');
}

function radarSvg(results, role) {
  const n = results.length;
  if (n < 3) return '<p class="muted">Ajoutez au moins 3 compétences pour afficher le radar.</p>';
  const size = 460;
  const c = size / 2;
  const R = 150;
  const max = LEVELS.length - 1;
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i, v) => [c + Math.cos(angle(i)) * R * (v / max), c + Math.sin(angle(i)) * R * (v / max)];
  const poly = (values) => values.map((v, i) => point(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  let g = '';
  for (let l = 1; l <= max; l += 1) g += `<polygon class="grid" points="${poly(Array(n).fill(l))}"/>`;
  for (let i = 0; i < n; i += 1) {
    const [x, y] = point(i, max);
    g += `<line class="axis" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }
  for (let l = 1; l <= max; l += 1) {
    const [x, y] = point(0, l);
    g += `<text x="${(x + 4).toFixed(1)}" y="${(y + 4).toFixed(1)}" style="font-size:10px">${l}</text>`;
  }
  const targets = results.map((r) => (role === 'ref' ? r.skill.refTarget : r.skill.backupTarget));
  const actual = results.map((r) => (role === 'ref' ? r.assessment.refLevel : r.assessment.backupLevel));
  g += `<polygon class="t-poly" points="${poly(targets)}"/><polygon class="a-poly" points="${poly(actual)}"/>`;
  results.forEach((r, i) => {
    const ko = actual[i] < targets[i];
    const [x, y] = point(i, actual[i]);
    g += `<circle class="a-dot ${ko ? 'is-ko' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${ko ? 4 : 3}"/>`;
    const [lx, ly] = point(i, max + 0.55);
    const cos = Math.cos(angle(i));
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
    const label = r.skill.label.length > 18 ? `${r.skill.label.slice(0, 17)}…` : r.skill.label;
    g += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" class="${ko ? 'is-ko' : ''}"><title>${esc(r.skill.label)}</title>${esc(label)}</text>`;
  });
  return `<svg viewBox="-50 0 ${size + 100} ${size}" role="img" aria-label="Radar ${role === 'ref' ? 'référent' : 'back-up'} : cible et niveau atteint par compétence">${g}</svg>`;
}

// ---------------------------------------------------------------- Application

export async function startTeam(store, teamId) {
  const ME_KEY = `matrice-competences.me.${teamId}`;
  const data = store.teamData(teamId);
  let team = null;
  let rawData = null;
  let skills = [];
  let members = [];
  let trash = [];
  let me = readStored(ME_KEY);
  let tab = readStored(TAB_KEY);
  if (!TABS.some(([key]) => key === tab)) tab = 'matrice';
  let freeEdit = false;
  const absent = new Set();
  let pendingRender = false;
  let purgeChecked = false;
  const confirm = createConfirm(() => render());
  const shareUrl = () => teamUrl(siteBaseUrl(), teamId);
  let qrMarkup = null;
  /** Nom en cours de modification : 'team', 'skill:<id>' ou 'member:<id>', avec le texte saisi. */
  let editing = null;
  let editDraft = '';
  let focusEdit = false;

  try {
    await store.start();
  } catch (error) {
    console.error('Connexion Firebase refusée :', error?.code ?? error);
    showFatal('Impossible de se connecter au service temps réel. Vérifiez votre connexion, puis rechargez la page.');
    return;
  }
  watchConnection(store);

  const readFailed = (error) => {
    console.error('Lecture refusée :', error?.code ?? error);
    showFatal('Impossible de lire cette équipe. Rechargez la page.');
  };

  store.onTeam(teamId, (raw) => {
    team = parseTeam(teamId, raw);
    if (!team) {
      saveRecentTeams(forgetTeam(loadRecentTeams(), teamId));
      document.title = APP_TITLE;
      $('page-title').textContent = APP_TITLE;
      showTeamNotFound();
      return;
    }
    saveRecentTeams(rememberTeam(loadRecentTeams(), team, Date.now()));
    document.title = `${team.name} · ${APP_TITLE}`;
    $('page-title').textContent = team.name;
    render();
  }, readFailed);

  store.onTeamData(teamId, (raw) => {
    rawData = raw;
    ({ skills, members, trash } = parseMatrix(raw));
    for (const id of [...absent]) if (!members.some((m) => m.id === id)) absent.delete(id);
    if (!purgeChecked) {
      // Une fois par ouverture : purge des éléments à la corbeille depuis plus de 90 jours.
      purgeChecked = true;
      const purge = purgeTeamDataUpdate(raw, store.serverNow());
      if (purge) data.apply(purge);
    }
    render();
  }, readFailed);

  // ---------------------------------------------------------------- Rendu

  function isTyping() {
    const el = document.activeElement;
    return el?.tagName === 'INPUT' && el.type === 'text' && el.closest('#panel, #whoami, #team-bar');
  }

  function render() {
    if (!team || rawData === null) return;
    if (team.deletedAt) { renderTrashedTeam(); return; }
    // Ne pas effacer un champ en cours de saisie : le rendu reprend quand il perd le focus.
    if (isTyping()) { pendingRender = true; return; }
    pendingRender = false;
    showScreen('matrix');
    $('whoami').hidden = false;
    renderTeamBar();
    renderWho();
    renderSummary();
    renderTabs();
    $('panel').innerHTML = tab === 'radars' ? renderRadars() : tab === 'equipe' ? renderTeam() : tab === 'plan' ? renderPlan() : tab === 'corbeille' ? renderTrash() : renderMatrix();
    renderFoot();
    if (focusEdit && $('edit-input')) {
      focusEdit = false;
      $('edit-input').focus();
      $('edit-input').select();
    }
  }

  /** Nom affiché avec un bouton crayon ; en modification : champ, Enregistrer et Annuler. */
  function editableName(key, value, { label, maxLength, className = '' }) {
    if (editing === key) {
      return `<span class="name-edit ${className}">
        <input type="text" class="field" id="edit-input" value="${esc(editDraft)}" maxlength="${maxLength}" aria-label="${esc(label)}" autocomplete="off">
        <button type="button" class="icon-button is-save" data-action="edit-save" title="Enregistrer" aria-label="Enregistrer">${CHECK_ICON}</button>
        <button type="button" class="icon-button" data-action="edit-cancel" title="Annuler" aria-label="Annuler">${CLOSE_ICON}</button>
      </span>`;
    }
    return `<span class="name-view ${className}"><span class="name-text">${esc(value)}</span><button type="button" class="icon-button" data-action="edit" data-key="${esc(key)}" title="${esc(`Modifier ${label.toLowerCase()}`)}" aria-label="${esc(`Modifier ${label.toLowerCase()} : ${value}`)}">${PENCIL_ICON}</button></span>`;
  }

  function startEdit(key) {
    const [kind, id] = key.split(':');
    editing = key;
    editDraft = kind === 'team' ? team.name : kind === 'skill' ? skills.find((s) => s.id === id)?.label ?? '' : members.find((m) => m.id === id)?.name ?? '';
    focusEdit = true;
    render();
  }

  function stopEdit() {
    editing = null;
    if (document.activeElement?.id === 'edit-input') document.activeElement.blur();
    render();
  }

  function saveEdit() {
    const [kind, id] = editing.split(':');
    const text = $('edit-input')?.value ?? editDraft;
    if (kind === 'team') {
      const result = validateTeamName(text);
      if (!result.ok) { toast(result.error); return; }
      if (result.name !== team.name) report(store.renameTeam(teamId, result.name));
    } else if (kind === 'skill') {
      const result = validateSkillLabel(text, skills, id);
      if (!result.ok) { toast(result.error); return; }
      if (result.label !== skills.find((s) => s.id === id)?.label) report(data.updateSkill(id, { label: result.label }));
    } else {
      const result = validateMemberName(text, members, id);
      if (!result.ok) { toast(result.error); return; }
      if (result.name !== members.find((m) => m.id === id)?.name) report(data.renameMember(id, result.name));
    }
    stopEdit();
  }

  function renderTrashedTeam() {
    const days = daysBeforePurge(team.deletedAt, store.serverNow());
    showMessage(`<div class="empty-state">
      <h2>Cette équipe est dans la corbeille</h2>
      <p class="muted">Supprimée le ${formatDate(team.deletedAt)}. Elle sera supprimée définitivement dans ${days} ${plural(days, 'jour', 'jours')}, avec toutes ses données. Seul l'administrateur peut la rétablir.</p>
      <a class="button" href="./">Revenir à l'accueil</a>
    </div>`);
  }

  function renderTeamBar() {
    // Le QR code ne change pas avec le nom de l'équipe : calculé une seule fois.
    if (qrMarkup === null) {
      const qr = makeQr(shareUrl());
      qrMarkup = qr ? qrSvg(qr, 'QR code de l\'équipe') : '';
    }
    $('team-bar').innerHTML = `
      <div class="team-main">
        <div class="team-name-field"><span class="eyebrow">Nom de l'équipe</span>
          ${editableName('team', team.name, { label: 'Nom de l\'équipe', maxLength: TEAM_NAME_MAX_LENGTH, className: 'is-large' })}</div>
        <div class="team-actions">
          <button type="button" class="button" data-action="excel-template" title="Télécharger le modèle Excel pré-rempli avec cette équipe">Modèle Excel</button>
          <button type="button" class="button" data-action="excel-import" title="Ajouter des personnes et des compétences depuis un fichier Excel">Ajouter depuis Excel</button>
        </div>
      </div>
      <section class="card join-card" aria-labelledby="join-title">
        ${qrMarkup ? `<button type="button" class="qr-button" data-action="qr-enlarge" aria-label="Agrandir le QR code" title="Agrandir"><span class="qr">${qrMarkup}</span></button>` : ''}
        <div class="join-text">
          <h2 id="join-title">Rejoindre l'équipe</h2>
          <p class="muted join-hint">Scannez le QR code, ou ouvrez :</p>
          <p class="join-url">${esc(displayUrl(shareUrl()))}</p>
          <div class="join-actions">
            <button type="button" class="link-button" data-action="copy-link">Copier le lien</button>
            ${qrMarkup ? `<button type="button" class="link-button" data-action="copy-qr">Copier le QR code</button>
            <button type="button" class="link-button" data-action="download-qr">Télécharger le QR code</button>` : ''}
          </div>
        </div>
      </section>`;
  }

  function renderWho() {
    const valid = members.some((m) => m.id === me);
    $('me-select').innerHTML = `<option value="" ${valid ? '' : 'selected'}>Choisir mon nom…</option>`
      + members.map((m) => `<option value="${esc(m.id)}" ${m.id === me ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
  }

  function renderSummary() {
    const pool = presentMembers(members, absent);
    const o = overview(skills, pool);
    const pct = (v) => (o.total ? Math.round((v / o.total) * 100) : 0);
    const simulating = absent.size > 0;
    const absentNames = members.filter((m) => absent.has(m.id)).map((m) => m.name);
    const lost = simulating ? overview(skills, members).covered - o.covered : 0;
    $('summary').classList.toggle('is-sim', simulating);
    $('summary').innerHTML = `
      <div class="score">
        <span class="eyebrow">${simulating ? 'Avec l\'absence simulée' : 'Couverture actuelle'}</span>
        <div class="score-main">
          <div class="score-big num">${o.covered}<small>/${o.total}</small></div>
          <div class="muted">compétences couvertes :<br>référent <b>et</b> back-up au niveau cible</div>
        </div>
        <div class="bars">
          <div class="bar-row"><span>Référent</span><div class="bar"><span style="width:${pct(o.refOk)}%"></span></div><span class="num">${o.refOk}/${o.total}</span></div>
          <div class="bar-row"><span>Back-up</span><div class="bar"><span style="width:${pct(o.backupOk)}%"></span></div><span class="num">${o.backupOk}/${o.total}</span></div>
        </div>
      </div>
      <div class="sim-box">
        <span class="eyebrow">Simuler une absence imprévue</span>
        <p class="muted">Cliquez sur une ou plusieurs personnes pour voir ce que l'équipe sait encore faire sans elles. La simulation reste sur votre écran.</p>
        <div class="chips">${members.length
          ? members.map((m) => `<button type="button" class="chip" data-action="absent" data-id="${esc(m.id)}" aria-pressed="${absent.has(m.id)}">${esc(m.name)}</button>`).join('')
          : '<span class="muted">Personne dans l\'équipe pour l\'instant.</span>'}</div>
        ${simulating ? `<div class="sim-note">Sans ${esc(absentNames.join(', '))} : ${lost} ${plural(lost, 'compétence perd sa', 'compétences perdent leur')} couverture.
          <button type="button" class="button button-small" data-action="clear-absent">Fin de simulation</button></div>` : ''}
      </div>`;
  }

  function renderTabs() {
    const atRisk = overview(skills, presentMembers(members, absent)).atRisk;
    $('tabs').innerHTML = TABS.map(([key, label]) => `
      <button type="button" class="tab ${key === 'corbeille' ? 'tab-icon' : ''}" role="tab" id="tab-${key}" data-action="tab" data-tab="${key}" aria-selected="${tab === key}" ${key === 'corbeille' ? `aria-label="Corbeille (${trash.length})" title="Corbeille"` : ''}>${key === 'corbeille' ? TRASH_ICON : label}${key === 'plan' && atRisk ? `<span class="count" aria-label="${atRisk} à traiter">${atRisk}</span>` : ''}${key === 'corbeille' && trash.length ? `<span class="count count-neutral" aria-label="${trash.length} ${plural(trash.length, 'élément', 'éléments')}">${trash.length}</span>` : ''}</button>`).join('');
    $('panel').setAttribute('aria-labelledby', `tab-${tab}`);
  }

  function renderMatrix() {
    const pool = presentMembers(members, absent);
    const meValid = members.some((m) => m.id === me);
    const head = members.map((m) => `
      <th class="member-h ${m.id === me ? 'is-me' : ''} ${absent.has(m.id) ? 'is-off' : ''}">${m.id === me ? '<span class="you">vous</span>' : ''}${esc(m.name)}</th>`).join('');

    const rows = skills.map((s) => {
      const a = assessSkill(s, pool);
      const cells = members.map((m) => {
        const level = m.ratings[s.id];
        const off = absent.has(m.id) ? 'is-off' : '';
        const meCol = m.id === me ? 'me-col' : '';
        if (!(freeEdit || m.id === me)) return `<td class="${meCol}">${levelBox(level, off)}</td>`;
        return `<td class="${meCol}"><div class="lvl ${isLevel(level) ? `l${level}` : 'empty'} is-editable ${off}">${isLevel(level) ? level : '–'}
          <select aria-label="Niveau de ${esc(m.name)} en ${esc(s.label)}" data-action="rate" data-m="${esc(m.id)}" data-s="${esc(s.id)}">${levelOptions(level, { allowEmpty: true })}</select></div></td>`;
      }).join('');
      const role = (entry, level, isOk, target, key, roleName) => `
        <td><div class="role ${isOk ? 'is-ok' : 'is-ko'}">
          <span class="role-lvl">${level} / <span class="tgt" title="Cible ${roleName}">${target}<select aria-label="Cible ${roleName} en ${esc(s.label)}" data-action="target" data-s="${esc(s.id)}" data-k="${key}">${levelOptions(target)}</select></span></span>
          <span class="role-name">${entry ? esc(entry.member.name) : 'personne'}</span>
        </div></td>`;
      return `<tr>
        <td class="sticky"><div class="skill-cell">
          ${editableName(`skill:${s.id}`, s.label, { label: 'Nom de la compétence', maxLength: LABEL_MAX_LENGTH })}
          ${editing === `skill:${s.id}` ? '' : confirmButton(confirm, `skill:${s.id}`, { action: 'trash-skill', data: `data-s="${esc(s.id)}"`, title: `Mettre « ${s.label} » à la corbeille`, confirmLabel: 'Mettre à la corbeille ?' })}
        </div></td>
        ${cells}
        ${role(a.referent, a.refLevel, a.refOk, s.refTarget, 'refTarget', 'référent')}
        ${role(a.backup, a.backupLevel, a.backupOk, s.backupTarget, 'backupTarget', 'back-up')}
        <td><span class="status ${a.status}">${STATUS_LABELS[a.status]}</span></td>
      </tr>`;
    }).join('');

    const colspan = Math.max(members.length, 1) + 4;
    return `
      <div class="toolbar">
        <div class="legend">${LEVELS.map((label, i) => `<span><i class="sw" style="background:var(--l${i})"></i>${i} ${esc(label.split(',')[0].toLowerCase())}</span>`).join('')}</div>
        <label class="toggle"><input type="checkbox" id="free-edit" data-action="free-edit" ${freeEdit ? 'checked' : ''}> Saisie libre (facilitateur)</label>
      </div>
      ${!members.length ? '<div class="notice">Ajoutez votre nom en haut à droite, puis partagez le lien : chacun s\'ajoute et note sa colonne.</div>'
        : !meValid && !freeEdit ? '<div class="notice">Choisissez votre nom en haut à droite pour noter vos compétences : votre colonne s\'affiche alors en orange.</div>' : ''}
      ${!skills.length ? '<div class="empty-state"><h3>Aucune compétence pour l\'instant</h3><p class="muted">Ajoutez la première compétence ci-dessous, avec le niveau visé pour le référent et pour le back-up.</p></div>' : ''}
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th class="sticky group"></th><th class="group" colspan="${Math.max(members.length, 1)}">Auto-évaluation</th><th class="group" colspan="2">Niveau atteint / cible</th><th class="group"></th></tr>
            <tr><th class="sticky">Compétence</th>${head || '<th class="muted">Personne</th>'}<th>Référent</th><th>Back-up</th><th>Statut</th></tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="add-row"><td colspan="${colspan}">
              <form class="add-form" data-form="add-skill" novalidate>
                <input type="text" class="field grow" id="new-skill" name="label" placeholder="Nouvelle compétence (ex. Déploiement Kubernetes)" maxlength="${LABEL_MAX_LENGTH}" autocomplete="off" aria-label="Nom de la nouvelle compétence">
                <label>Cible référent <select class="field" id="new-ref" name="ref">${levelOptions(DEFAULT_TARGETS.refTarget, { short: true })}</select></label>
                <label>Cible back-up <select class="field" id="new-backup" name="backup">${levelOptions(DEFAULT_TARGETS.backupTarget, { short: true })}</select></label>
                <button class="button button-primary" type="submit">Ajouter la compétence</button>
              </form>
            </td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Échelle</h3>
        <div class="scale">${LEVELS.map((label, i) => `<div>${levelBox(i, 'small')}<span>${esc(label)}</span></div>`).join('')}</div>
        <p class="muted">Le référent est la personne la mieux notée sur la compétence, le back-up la deuxième. Une compétence est couverte quand les deux atteignent leur niveau cible, fixé ensemble par l'équipe.</p>
      </div>`;
  }

  function renderRadars() {
    const o = overview(skills, presentMembers(members, absent));
    const block = (title, role, okCount) => `
      <div class="card radar">
        <div class="toolbar"><h3>${title}</h3><span class="num muted">${okCount}/${o.total} à la cible</span></div>
        <div class="legend"><span><i class="sw" style="background:var(--target)"></i>Cible</span><span><i class="sw" style="background:var(--actual)"></i>Niveau atteint</span><span><i class="sw" style="background:var(--bad)"></i>Sous la cible</span></div>
        ${radarSvg(o.results, role)}
      </div>`;
    return `<p class="intro">Quand la zone orange atteint ou dépasse la zone bleue, le rôle est assuré. Les compétences en rouge sont sous la cible.</p>
      <div class="radars">${block('Vue référent', 'ref', o.refOk)}${block('Vue back-up', 'backup', o.backupOk)}</div>`;
  }

  function renderTeam() {
    const pool = presentMembers(members, absent);
    const cards = members.map((m) => {
      const isAbsent = absent.has(m.id);
      const impact = memberImpact(skills, isAbsent ? [...pool, m] : pool, m.id);
      const rated = ratedCount(m, skills);
      const lost = isAbsent ? 0 : impact.lost.length;
      const html = `
        <div class="card member-card">
          <div class="head">
            ${editableName(`member:${m.id}`, m.name, { label: 'Nom de la personne', maxLength: NAME_MAX_LENGTH, className: 'is-strong' })}
            ${editing === `member:${m.id}` ? '' : confirmButton(confirm, `member:${m.id}`, { action: 'trash-member', data: `data-m="${esc(m.id)}"`, title: `Mettre ${m.name} à la corbeille`, confirmLabel: 'Mettre à la corbeille ?' })}
          </div>
          <div class="progress">${rated}/${skills.length} ${plural(skills.length, 'compétence notée', 'compétences notées')}${m.id === me ? ' · c\'est vous' : ''}</div>
          <div class="stats">
            <div class="stat"><b>${impact.referentCount}</b><span>fois référent·e</span></div>
            <div class="stat"><b>${impact.backupCount}</b><span>fois back-up</span></div>
            <div class="stat"><b>${lost}</b><span>perdues si absent·e</span></div>
          </div>
          ${isAbsent ? '<div class="impact sim">Absence en cours de simulation.</div>'
            : lost ? `<div class="impact bad">Si ${esc(m.name)} s'absente, ${plural(lost, 'cette compétence n\'est', 'ces compétences ne sont')} plus couverte${plural(lost, '', 's')} :<ul>${impact.lost.map((s) => `<li>${esc(s.label)}</li>`).join('')}</ul></div>`
            : '<div class="impact ok">Son absence ne fait perdre aucune compétence couverte.</div>'}
        </div>`;
      return { lost, html };
    }).sort((a, b) => b.lost - a.lost);

    return `
      <div class="toolbar">
        <p class="intro">Les rôles que porte chaque personne, et ce que l'équipe perdrait si elle s'absentait du jour au lendemain, de l'absence la plus coûteuse à la moins coûteuse.</p>
        <form class="inline-form" data-form="add-member" novalidate>
          <input type="text" class="field" id="new-member" name="name" placeholder="Nom de la personne" maxlength="${NAME_MAX_LENGTH}" autocomplete="off" aria-label="Nom de la personne à ajouter">
          <button class="button button-primary" type="submit">Ajouter à l'équipe</button>
        </form>
      </div>
      ${members.length ? `<div class="team">${cards.map((c) => c.html).join('')}</div>`
        : '<div class="empty-state"><h3>Personne dans l\'équipe</h3><p class="muted">Ajoutez les membres ici, ou laissez chacun s\'ajouter avec « Je suis » en haut à droite.</p></div>'}
      <p class="muted">Une personne retirée part dans la corbeille avec ses notes, et peut être rétablie pendant 90 jours.</p>`;
  }

  function renderPlan() {
    if (!skills.length) return '<div class="empty-state"><h3>Rien à planifier</h3><p class="muted">Ajoutez des compétences dans l\'onglet Matrice.</p></div>';
    const plan = trainingPlan(skills, presentMembers(members, absent));
    if (!plan.length) return `<div class="empty-state"><h3>Toutes les compétences sont couvertes</h3><p class="muted">Référent et back-up atteignent leur cible partout${absent.size ? ', même avec l\'absence simulée' : ''}.</p></div>`;
    const items = plan.map((item) => {
      const { skill: s, assessment: a } = item;
      const gaps = [];
      if (!a.refOk) gaps.push(`<div><b>Référent</b> : niveau <span class="num">${a.refLevel}</span>, cible <span class="num">${s.refTarget}</span>${a.referent ? ` (${esc(a.referent.member.name)})` : ''}</div>`);
      if (!a.backupOk) gaps.push(`<div><b>Back-up</b> : niveau <span class="num">${a.backupLevel}</span>, cible <span class="num">${s.backupTarget}</span>${a.backup ? ` (${esc(a.backup.member.name)})` : ''}</div>`);
      const candidates = item.candidates.map((c) => `
        <div class="cand">${levelBox(c.level, 'small')}<span><b>${esc(c.member.name)}</b> : ${c.level} → ${c.target}, soit <span class="num">+${c.steps}</span> ${plural(c.steps, 'niveau', 'niveaux')}</span>
          ${c.interested ? '<span class="tag">intéressé·e</span>' : ''}</div>`).join('');
      return `
        <div class="card plan-item">
          <div class="gaps">
            <div class="toolbar"><h3>${esc(s.label)}</h3><span class="status ${a.status}">${STATUS_LABELS[a.status]}</span></div>
            ${gaps.join('')}
            ${item.unrated ? `<div class="muted">${item.unrated} ${plural(item.unrated, 'personne n\'a', 'personnes n\'ont')} pas encore noté cette compétence.</div>` : ''}
          </div>
          <div class="cands">
            <span class="eyebrow">Qui former en priorité · rôle de ${item.role === 'referent' ? 'référent' : 'back-up'}</span>
            ${candidates || (item.nobodyInterested
              ? '<div class="muted">Personne n\'est intéressé·e : à envisager en recrutement, en formation imposée ou en appui externe.</div>'
              : '<div class="muted">Aucune personne intéressée parmi les présents.</div>')}
          </div>
        </div>`;
    }).join('');
    return `<p class="intro">Compétences sous la cible, de l'écart le plus grand au plus petit. Sont proposées les personnes présentes qui ont exprimé un intérêt (niveau 1 ou plus), les plus avancées d'abord ; les personnes notées 0 ne le sont jamais.</p>
      <div class="plan">${items}</div>`;
  }

  function renderTrash() {
    if (!trash.length) return '<div class="empty-state"><h3>La corbeille est vide</h3><p class="muted">Les personnes et compétences supprimées y restent 90 jours, avec leurs notes, avant d\'être supprimées définitivement.</p></div>';
    const now = store.serverNow();
    return `<p class="intro">Les personnes et compétences supprimées restent ici 90 jours avec leurs notes. « Rétablir » les remet telles quelles.</p>
      <div class="table-scroll"><table class="trash-table">
        <thead><tr><th class="left">Élément</th><th class="left">Type</th><th>Notes</th><th class="left">Supprimé le</th><th class="left">Suppression définitive</th><th></th></tr></thead>
        <tbody>${trash.map((item) => {
          const days = daysBeforePurge(item.deletedAt, now);
          return `<tr>
            <td class="left"><b>${esc(item.name)}</b></td>
            <td class="left">${item.kind === 'member' ? 'Personne' : 'Compétence'}</td>
            <td class="num">${item.ratingCount}</td>
            <td class="left">${formatDate(item.deletedAt)}</td>
            <td class="left">dans ${days} ${plural(days, 'jour', 'jours')}</td>
            <td><button type="button" class="button button-small" data-action="restore" data-kind="${item.kind}" data-id="${esc(item.id)}">Rétablir</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  }

  function renderFoot() {
    $('foot').innerHTML = `<span>${members.length} ${plural(members.length, 'personne', 'personnes')} · ${skills.length} ${plural(skills.length, 'compétence', 'compétences')} · mise à jour en direct pour toute l'équipe</span>`;
  }

  // ---------------------------------------------------------------- Actions

  async function addMember(input, { becomeMe }) {
    const result = validateMemberName(input.value, members);
    if (!result.ok) { toast(result.error); input.focus(); return; }
    input.value = '';
    input.blur();
    const id = await data.addMember({ name: result.name, order: nextOrder(members) });
    if (!id) { toast(WRITE_FAILED); return; }
    if (becomeMe) { me = id; writeStored(ME_KEY, me); render(); }
    toast(`${result.name} a rejoint l'équipe.`);
  }

  async function addSkill(form) {
    const result = validateSkillLabel(form.elements.label.value, skills);
    if (!result.ok) { toast(result.error); form.elements.label.focus(); return; }
    const id = await data.addSkill({
      label: result.label,
      refTarget: Number(form.elements.ref.value),
      backupTarget: Number(form.elements.backup.value),
      order: nextOrder(skills),
    });
    if (!id) { toast(WRITE_FAILED); return; }
    const input = $('new-skill');
    if (input) { input.value = ''; input.focus(); }
  }

  async function importFromExcel() {
    let chosen;
    try {
      chosen = await chooseImportFile({ skills, members, trash });
    } catch {
      toast('Lecture du fichier impossible dans ce navigateur.');
      return;
    }
    if (!chosen) return;
    if (!(await previewImport({ ...chosen, targetLabel: `équipe « ${team.name} »` }))) return;
    const paths = importUpdate(chosen.plan, {
      teamId, newKey: store.newKey, start: { skills: nextOrder(skills), members: nextOrder(members) },
    });
    if (await store.writeImport(paths)) toast(importSummary(chosen.plan)); else toast(WRITE_FAILED);
  }

  const report = (done, success) => done.then((ok) => { if (!ok) toast(WRITE_FAILED); else if (success) toast(success); });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action } = button.dataset;
    if (action === 'tab') {
      tab = button.dataset.tab;
      writeStored(TAB_KEY, tab);
      render();
    } else if (action === 'absent') {
      const { id } = button.dataset;
      if (absent.has(id)) absent.delete(id); else absent.add(id);
      render();
    } else if (action === 'clear-absent') {
      absent.clear();
      render();
    } else if (action === 'trash-skill') {
      const { s } = button.dataset;
      if (confirm.confirm(`skill:${s}`)) report(data.trash('skill', s), 'Compétence mise à la corbeille.');
    } else if (action === 'trash-member') {
      const { m } = button.dataset;
      if (confirm.confirm(`member:${m}`)) {
        absent.delete(m);
        if (m === me) { me = null; writeStored(ME_KEY, null); }
        report(data.trash('member', m), 'Personne mise à la corbeille.');
      }
    } else if (action === 'restore') {
      const item = trash.find((t) => t.kind === button.dataset.kind && t.id === button.dataset.id);
      if (!item) return;
      const check = checkRestore(item, { skills, members });
      if (!check.ok) { toast(check.error); return; }
      report(data.restore(item.kind, item.id), `« ${item.name} » est de retour.`);
    } else if (action === 'edit') {
      startEdit(button.dataset.key);
    } else if (action === 'edit-save') {
      saveEdit();
    } else if (action === 'edit-cancel') {
      stopEdit();
    } else if (action === 'qr-enlarge') {
      openShare({ name: team.name, url: shareUrl() });
    } else if (action === 'copy-link') {
      copyLink(shareUrl()).then(toast);
    } else if (action === 'copy-qr') {
      copyQr(shareUrl(), team.name).then(toast);
    } else if (action === 'download-qr') {
      downloadQr(shareUrl(), team.name).then(toast);
    } else if (action === 'excel-template') {
      downloadTemplate({ teamName: team.name, skills, members }).catch(() => toast('Création du fichier impossible dans ce navigateur.'));
    } else if (action === 'excel-import') {
      importFromExcel();
    }
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el.id === 'me-select') {
      me = el.value || null;
      writeStored(ME_KEY, me);
      render();
      return;
    }
    const { action } = el.dataset;
    if (action === 'rate') {
      report(data.setRating(el.dataset.m, el.dataset.s, el.value === '' ? null : Number(el.value)));
    } else if (action === 'target') {
      report(data.updateSkill(el.dataset.s, { [el.dataset.k]: Number(el.value) }));
    } else if (action === 'free-edit') {
      freeEdit = el.checked;
      render();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.id !== 'edit-input') return;
    if (event.key === 'Enter') { event.preventDefault(); saveEdit(); }
    else if (event.key === 'Escape') { event.preventDefault(); stopEdit(); }
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'edit-input') editDraft = event.target.value;
  });
  // Garder le focus dans le champ en cliquant sur Enregistrer ou Annuler : sinon le rendu différé
  // remplacerait le bouton avant que le clic n'arrive.
  document.addEventListener('mousedown', (event) => {
    if (event.target.closest('[data-action="edit-save"], [data-action="edit-cancel"]')) event.preventDefault();
  });

  document.addEventListener('focusout', () => {
    setTimeout(() => { if (pendingRender) render(); }, 0);
  });

  document.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'join-form') addMember($('join-name'), { becomeMe: true });
    else if (form.dataset.form === 'add-member') addMember(form.elements.name, { becomeMe: false });
    else if (form.dataset.form === 'add-skill') addSkill(form);
  });
}
