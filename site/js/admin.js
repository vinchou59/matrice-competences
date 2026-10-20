// Administration : connexion Google, toutes les équipes avec leur lien et leur QR code, corbeille des équipes,
// suppression définitive. L'administrateur est reconnu par les règles (identifiant inscrit dans skillMatrix/admins).

import { teamsOverview, teamUrl, isPurgeable, daysBeforePurge, validateTeamName, rememberTeam, newTeamId, TEAM_NAME_MAX_LENGTH } from './matrix-core.js?v=__VERSION__';
import {
  $, esc, plural, showScreen, showFatal, toast, WRITE_FAILED, formatDate, watchConnection,
  createConfirm, confirmButton, openShare, siteBaseUrl, trashToggle, loadRecentTeams, saveRecentTeams,
} from './shared.js?v=__VERSION__';
import { downloadTemplate, chooseImportFile, previewImport, importSummary } from './excel.js?v=__VERSION__';
import { importUpdate } from './template-core.js?v=__VERSION__';

export async function startAdmin(store) {
  let user = null;
  let admin = false;
  let overview = null;
  let stopTeams = null;
  let purgeChecked = false;
  let trashOpen = false;
  const confirm = createConfirm(() => render());
  const screen = $('screen-home');

  try {
    await store.start();
  } catch (error) {
    console.error('Connexion Firebase refusée :', error?.code ?? error);
    showFatal('Impossible de se connecter au service temps réel. Vérifiez votre connexion, puis rechargez la page.');
    return;
  }
  watchConnection(store);
  showScreen('home');

  let pendingRender = false;
  screen.addEventListener('focusout', () => setTimeout(() => { if (pendingRender) render(); }, 0));

  function render() {
    if (!user) return;
    // Ne pas effacer le nom en cours de saisie : le rendu reprend quand le champ perd le focus.
    if (document.activeElement?.id === 'create-name') { pendingRender = true; return; }
    pendingRender = false;
    if (user.isAnonymous) {
      screen.innerHTML = `
        <section class="card narrow">
          <h2>Connexion administrateur</h2>
          <p class="muted">L'administration montre toutes les équipes et leur corbeille. Elle est réservée aux comptes inscrits comme administrateurs.</p>
          <div><button type="button" class="button button-primary" data-action="sign-in">Se connecter avec Google</button></div>
          <p><a href="./">Revenir à l'accueil</a></p>
        </section>`;
      return;
    }
    const account = `<p class="muted">Connecté en tant que <b>${esc(user.email || user.name || 'compte Google')}</b>. <button type="button" class="link-button" data-action="sign-out">Se déconnecter</button></p>`;
    if (!admin) {
      screen.innerHTML = `
        <section class="card narrow">
          <h2>Ce compte n'est pas encore administrateur</h2>
          ${account}
          <p>Votre identifiant :</p>
          <div class="share-link"><input class="field num" id="admin-uid" readonly value="${esc(user.uid)}" aria-label="Identifiant du compte"><button type="button" class="button" data-action="copy-uid">Copier</button></div>
          <ol class="steps">
            <li>Ouvrez la console Firebase du projet, puis <b>Realtime Database</b> → <b>Données</b>.</li>
            <li>Sous <code>skillMatrix</code>, ajoutez l'enfant <code>admins</code>, puis sous <code>admins</code> l'enfant <code>${esc(user.uid)}</code> avec la valeur <code>true</code>.</li>
            <li>Rechargez cette page.</li>
          </ol>
        </section>`;
      return;
    }
    if (!overview) {
      screen.innerHTML = `<section class="card">${account}<p class="muted">Chargement des équipes…</p></section>`;
      return;
    }
    const now = store.serverNow();
    const base = siteBaseUrl();
    screen.innerHTML = `
      <section class="card">
        ${account}
      </section>
      <section class="card">
        <div class="toolbar">
          <h2>Équipes <span class="muted num">${overview.active.length}</span></h2>
          <form class="inline-form" id="create-form" novalidate>
            <input type="text" class="field" id="create-name" name="name" placeholder="Nom de la nouvelle équipe" maxlength="${TEAM_NAME_MAX_LENGTH}" autocomplete="off" aria-label="Nom de la nouvelle équipe">
            <button class="button button-primary" type="submit">Créer une équipe</button>
          </form>
        </div>
        <div class="excel-actions">
          <span class="muted">Excel :</span>
          <button type="button" class="link-button" data-action="excel-template">Télécharger le modèle vide</button>
          <button type="button" class="link-button" data-action="excel-create">Créer une équipe depuis un fichier</button>
        </div>
        ${overview.active.length ? `<div class="table-scroll"><table class="trash-table">
          <thead><tr><th class="left">Équipe</th><th>Personnes</th><th>Compétences</th><th class="left">Créée le</th><th></th></tr></thead>
          <tbody>${overview.active.map((t) => `<tr>
            <td class="left"><a href="${esc(teamUrl(base, t.id))}"><b>${esc(t.name)}</b></a></td>
            <td class="num">${t.memberCount}</td>
            <td class="num">${t.skillCount}</td>
            <td class="left">${t.createdAt ? formatDate(t.createdAt) : '–'}</td>
            <td class="actions">
              <button type="button" class="button button-small" data-action="share" data-id="${esc(t.id)}">Partager</button>
              ${confirmButton(confirm, `trash:${t.id}`, { action: 'trash', data: `data-id="${esc(t.id)}"`, title: `Supprimer ${t.name} (l'équipe part dans la corbeille)`, confirmLabel: 'Supprimer l\'équipe ?', label: 'Supprimer l\'équipe', className: 'button button-small button-danger' })}
            </td>
          </tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aucune équipe pour l\'instant.</p>'}
      </section>
      <div class="trash-corner">${trashToggle(overview.trash.length, trashOpen)}</div>
      ${trashOpen && overview.trash.length ? `<section class="card">
        <h2>Corbeille</h2>
        <div class="table-scroll"><table class="trash-table">
          <thead><tr><th class="left">Équipe</th><th>Personnes</th><th class="left">Supprimée le</th><th class="left">Suppression définitive</th><th></th></tr></thead>
          <tbody>${overview.trash.map((t) => {
            const days = daysBeforePurge(t.deletedAt, now);
            return `<tr>
              <td class="left"><b>${esc(t.name)}</b></td>
              <td class="num">${t.memberCount}</td>
              <td class="left">${formatDate(t.deletedAt)}</td>
              <td class="left">dans ${days} ${plural(days, 'jour', 'jours')}</td>
              <td class="actions">
                <button type="button" class="button button-small" data-action="restore" data-id="${esc(t.id)}">Rétablir</button>
                ${confirmButton(confirm, `purge:${t.id}`, { action: 'purge', data: `data-id="${esc(t.id)}"`, title: `Supprimer définitivement ${t.name}`, confirmLabel: 'Supprimer définitivement ?', label: 'Supprimer définitivement', className: 'button button-small button-danger' })}
              </td>
            </tr>`;
          }).join('')}</tbody></table></div>
      </section>` : ''}`;
  }

  async function purgeExpired() {
    if (purgeChecked || !overview) return;
    purgeChecked = true;
    const now = store.serverNow();
    for (const team of overview.trash) {
      if (isPurgeable(team.deletedAt, now)) await store.purgeTeam(team.id);
    }
  }

  store.onUser(async (next) => {
    user = next;
    admin = false;
    overview = null;
    purgeChecked = false;
    if (stopTeams) { stopTeams(); stopTeams = null; }
    if (!user.isAnonymous) {
      render();
      admin = await store.isAdmin(user.uid);
      if (admin) {
        stopTeams = store.onAllTeams((teams, data) => {
          overview = teamsOverview(teams, data);
          render();
          purgeExpired();
        }, (error) => {
          console.error('Lecture refusée :', error?.code ?? error);
          toast('Lecture des équipes refusée : vérifiez l\'inscription dans skillMatrix/admins et les règles publiées.');
        });
      }
    }
    render();
  });

  async function createFromExcel() {
    let chosen;
    try {
      chosen = await chooseImportFile(null);
    } catch {
      toast('Lecture du fichier impossible dans ce navigateur.');
      return;
    }
    if (!chosen) return;
    const label = chosen.plan.teamName ? `nouvelle équipe « ${chosen.plan.teamName} »` : 'nouvelle équipe';
    if (!(await previewImport({ ...chosen, targetLabel: label }))) return;
    const teamId = newTeamId();
    const paths = importUpdate(chosen.plan, { teamId, team: { name: chosen.plan.teamName, createdAt: store.serverTime }, newKey: store.newKey });
    if (!(await store.writeImport(paths))) { toast(WRITE_FAILED); return; }
    saveRecentTeams(rememberTeam(loadRecentTeams(), { id: teamId, name: chosen.plan.teamName }, Date.now()));
    toast(`Équipe « ${chosen.plan.teamName} » créée. ${importSummary(chosen.plan)}`.trim());
    openShare({ name: chosen.plan.teamName, url: teamUrl(siteBaseUrl(), teamId) });
  }

  screen.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (event.target.id !== 'create-form') return;
    const input = $('create-name');
    const result = validateTeamName(input.value);
    if (!result.ok) { toast(result.error); input.focus(); return; }
    input.value = '';
    input.blur();
    const teamId = await store.createTeam(result.name);
    if (!teamId) { toast(WRITE_FAILED); input.value = result.name; return; }
    saveRecentTeams(rememberTeam(loadRecentTeams(), { id: teamId, name: result.name }, Date.now()));
    openShare({ name: result.name, url: teamUrl(siteBaseUrl(), teamId) });
  });

  screen.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'excel-template') {
      downloadTemplate().catch(() => toast('Création du fichier impossible dans ce navigateur.'));
    } else if (action === 'excel-create') {
      createFromExcel();
    } else if (action === 'toggle-trash') {
      trashOpen = !trashOpen;
      render();
    } else if (action === 'sign-in') {
      try {
        await store.signInWithGoogle();
      } catch (error) {
        console.error('Connexion Google refusée :', error?.code ?? error);
        toast('Connexion Google impossible. Vérifiez que le fournisseur Google est activé dans Firebase Authentication.');
      }
    } else if (action === 'sign-out') {
      await store.signOutAdmin();
    } else if (action === 'copy-uid') {
      try { await navigator.clipboard.writeText(user.uid); toast('Identifiant copié.'); } catch { $('admin-uid').select(); }
    } else if (action === 'share') {
      const team = overview?.active.find((t) => t.id === id);
      if (team) openShare({ name: team.name, url: teamUrl(siteBaseUrl(), team.id) });
    } else if (action === 'trash') {
      if (confirm.confirm(`trash:${id}`)) {
        if (await store.trashTeam(id)) toast('Équipe supprimée : elle reste 90 jours dans la corbeille.'); else toast(WRITE_FAILED);
      }
    } else if (action === 'restore') {
      if (await store.restoreTeam(id)) toast('Équipe rétablie.'); else toast(WRITE_FAILED);
    } else if (action === 'purge') {
      if (confirm.confirm(`purge:${id}`)) {
        if (await store.purgeTeam(id)) toast('Équipe supprimée définitivement.'); else toast(WRITE_FAILED);
      }
    }
  });
}
