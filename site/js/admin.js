// Administration : connexion Google, toutes les équipes avec leur lien et leur QR code, corbeille des équipes,
// suppression définitive. L'administrateur est reconnu par les règles (identifiant inscrit dans skillMatrix/admins).

import { teamsOverview, teamUrl, isPurgeable, daysBeforePurge } from './matrix-core.js?v=__VERSION__';
import {
  $, esc, plural, showScreen, showFatal, toast, WRITE_FAILED, formatDate, watchConnection,
  createConfirm, confirmButton, openShare, siteBaseUrl,
} from './shared.js?v=__VERSION__';

export async function startAdmin(store) {
  let user = null;
  let admin = false;
  let overview = null;
  let stopTeams = null;
  let purgeChecked = false;
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

  function render() {
    if (!user) return;
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
        <div class="admin-stats">
          <div class="stat"><b>${overview.active.length}</b><span>${plural(overview.active.length, 'équipe active', 'équipes actives')}</span></div>
          <div class="stat"><b>${overview.trash.length}</b><span>dans la corbeille</span></div>
        </div>
      </section>
      <section class="card">
        <h2>Équipes</h2>
        ${overview.active.length ? `<div class="table-scroll"><table class="trash-table">
          <thead><tr><th class="left">Équipe</th><th>Personnes</th><th>Compétences</th><th class="left">Créée le</th><th></th></tr></thead>
          <tbody>${overview.active.map((t) => `<tr>
            <td class="left"><a href="${esc(teamUrl(base, t.id))}"><b>${esc(t.name)}</b></a></td>
            <td class="num">${t.memberCount}</td>
            <td class="num">${t.skillCount}</td>
            <td class="left">${t.createdAt ? formatDate(t.createdAt) : '–'}</td>
            <td class="actions"><button type="button" class="button button-small" data-action="share" data-id="${esc(t.id)}">Partager</button></td>
          </tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aucune équipe pour l\'instant.</p>'}
      </section>
      <section class="card">
        <h2>Corbeille</h2>
        ${overview.trash.length ? `<div class="table-scroll"><table class="trash-table">
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
          }).join('')}</tbody></table></div>` : '<p class="muted">La corbeille est vide.</p>'}
      </section>`;
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

  screen.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'sign-in') {
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
    } else if (action === 'restore') {
      if (await store.restoreTeam(id)) toast('Équipe rétablie.'); else toast(WRITE_FAILED);
    } else if (action === 'purge') {
      if (confirm.confirm(`purge:${id}`)) {
        if (await store.purgeTeam(id)) toast('Équipe supprimée définitivement.'); else toast(WRITE_FAILED);
      }
    }
  });
}
