// Page d'accueil : équipes ouvertes sur ce navigateur, création d'une équipe, ouverture par un lien,
// corbeille des équipes connues. Aucune règle métier ici : tout passe par matrix-core.js.

import {
  MESSAGES, TEAM_NAME_MAX_LENGTH, validateTeamName, parseTeamId, teamUrl, parseTeam,
  rememberTeam, forgetTeam, renameRecentTeam, isPurgeable, daysBeforePurge,
} from './matrix-core.js?v=__VERSION__';
import {
  $, esc, plural, showScreen, showFatal, toast, WRITE_FAILED, loadRecentTeams, saveRecentTeams,
  formatDate, watchConnection, siteBaseUrl,
} from './shared.js?v=__VERSION__';

export async function startHome(store) {
  try {
    await store.start();
  } catch (error) {
    console.error('Connexion Firebase refusée :', error?.code ?? error);
    showFatal('Impossible de se connecter au service temps réel. Vérifiez votre connexion, puis rechargez la page.');
    return;
  }
  watchConnection(store);

  let recent = loadRecentTeams();
  /** État lu dans la base pour chaque équipe récente : fiche, ou null si introuvable. */
  const states = new Map();
  const open = (teamId) => { location.href = teamUrl(siteBaseUrl(), teamId); };

  function render() {
    const known = recent.map((t) => ({ ...t, team: states.get(t.id) }));
    const active = known.filter((t) => !t.team?.deletedAt);
    const trashed = known.filter((t) => t.team?.deletedAt);
    const now = store.serverNow();
    $('screen-home').innerHTML = `
      <div class="home-grid">
        <section class="card">
          <h2>Créer une équipe</h2>
          <p class="muted">Une matrice vide, avec son propre lien à partager.</p>
          <form class="inline-form" id="create-form" novalidate>
            <input type="text" class="field grow" id="create-name" name="name" placeholder="Nom de l'équipe" maxlength="${TEAM_NAME_MAX_LENGTH}" autocomplete="off" aria-label="Nom de la nouvelle équipe">
            <button class="button button-primary" type="submit">Créer</button>
          </form>
        </section>
        <section class="card">
          <h2>Ouvrir avec un lien</h2>
          <p class="muted">Collez le lien reçu, ou scannez le QR code de l'équipe.</p>
          <form class="inline-form" id="open-form" novalidate>
            <input type="text" class="field grow" id="open-link" name="link" placeholder="Lien ou identifiant de l'équipe" autocomplete="off" spellcheck="false" aria-label="Lien de l'équipe">
            <button class="button" type="submit">Ouvrir</button>
          </form>
        </section>
      </div>
      <section class="card">
        <div class="toolbar"><h2>Vos équipes</h2><span class="muted">sur ce navigateur</span></div>
        ${active.length ? `<ul class="team-list">${active.map((t) => `
          <li class="team-row">
            <a class="team-link" href="${esc(teamUrl(siteBaseUrl(), t.id))}">${esc(t.name)}</a>
            <span class="muted">ouverte le ${formatDate(t.lastVisit)}</span>
            <button type="button" class="link-button" data-action="forget" data-id="${esc(t.id)}" title="Retirer de cette liste (l'équipe n'est pas supprimée)">Retirer de la liste</button>
          </li>`).join('')}</ul>`
          : '<p class="muted">Aucune équipe ouverte sur ce navigateur pour l\'instant.</p>'}
      </section>
      ${trashed.length ? `
      <section class="card">
        <h2>Corbeille</h2>
        <ul class="team-list">${trashed.map((t) => `
          <li class="team-row">
            <span class="team-name">${esc(t.team.name)}</span>
            <span class="muted">supprimée le ${formatDate(t.team.deletedAt)} · suppression définitive dans ${daysBeforePurge(t.team.deletedAt, now)} ${plural(daysBeforePurge(t.team.deletedAt, now), 'jour', 'jours')}</span>
            <button type="button" class="button button-small" data-action="restore" data-id="${esc(t.id)}">Rétablir</button>
          </li>`).join('')}</ul>
      </section>` : ''}
      <p class="muted home-note">Les équipes ne sont pas listées publiquement : gardez leur lien ou leur QR code. <a href="admin.html">Administration</a></p>`;
  }

  async function refreshTeam(teamId) {
    const raw = await store.getTeam(teamId);
    if (raw === undefined) return; // lecture impossible : on garde l'entrée telle quelle
    const team = parseTeam(teamId, raw);
    if (!team) {
      states.delete(teamId);
      recent = forgetTeam(recent, teamId);
    } else if (isPurgeable(team.deletedAt, store.serverNow())) {
      if (await store.purgeTeam(teamId)) recent = forgetTeam(recent, teamId);
      else states.set(teamId, team);
    } else {
      states.set(teamId, team);
      recent = renameRecentTeam(recent, teamId, team.name);
    }
    saveRecentTeams(recent);
  }

  document.querySelector('.home-link').textContent = 'Résilience d\'équipe';
  showScreen('home');
  render();
  await Promise.all(recent.map((t) => refreshTeam(t.id)));
  render();

  $('screen-home').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (event.target.id === 'create-form') {
      const input = $('create-name');
      const result = validateTeamName(input.value);
      if (!result.ok) { toast(result.error); input.focus(); return; }
      const teamId = await store.createTeam(result.name);
      if (!teamId) { toast(WRITE_FAILED); return; }
      saveRecentTeams(rememberTeam(recent, { id: teamId, name: result.name }, Date.now()));
      open(teamId);
    } else if (event.target.id === 'open-form') {
      const teamId = parseTeamId($('open-link').value);
      if (!teamId) { toast(MESSAGES.invalidLink); $('open-link').focus(); return; }
      open(teamId);
    }
  });

  $('screen-home').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { id } = button.dataset;
    if (button.dataset.action === 'forget') {
      recent = forgetTeam(recent, id);
      saveRecentTeams(recent);
      render();
    } else if (button.dataset.action === 'restore') {
      if (!(await store.restoreTeam(id))) { toast(WRITE_FAILED); return; }
      await refreshTeam(id);
      render();
      toast('Équipe rétablie.');
    }
  });
}
