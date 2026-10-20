// Outils d'interface communs à l'accueil, à la page d'une équipe et à l'administration.

import { recentTeams } from './matrix-core.js?v=__VERSION__';

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const plural = (n, one, many) => (n > 1 ? many : one);
export const WRITE_FAILED = 'Modification non enregistrée. Vérifiez votre connexion, puis réessayez.';

const SCREENS = ['screen-status', 'screen-home', 'screen-message', 'screen-matrix'];

export function showScreen(name) {
  for (const id of SCREENS) {
    const el = $(id);
    if (el) el.hidden = id !== `screen-${name}`;
  }
}

export function showFatal(message) {
  showScreen('status');
  $('status-text').textContent = message;
  $('status-text').classList.add('is-error');
}

let toastTimer = null;
export function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

/** Lecture et écriture du stockage du navigateur, sans erreur s'il est indisponible. */
export function readStored(key) {
  try { return localStorage.getItem(key) || null; } catch { return null; }
}
export function writeStored(key, value) {
  try { value ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch { /* stockage indisponible */ }
}

const RECENT_KEY = 'matrice-competences.teams';
export function loadRecentTeams() {
  try { return recentTeams(JSON.parse(readStored(RECENT_KEY) ?? '[]')); } catch { return []; }
}
export function saveRecentTeams(list) {
  writeStored(RECENT_KEY, JSON.stringify(recentTeams(list)));
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
export const formatDate = (ms) => dateFormat.format(new Date(ms));

/** Bandeau « Connexion perdue » piloté par l'état de la connexion temps réel. */
export function watchConnection(store) {
  let everConnected = false;
  store.onConnection((connected) => {
    everConnected ||= connected;
    const banner = $('banner');
    banner.hidden = connected || !everConnected;
    banner.textContent = 'Connexion perdue, reconnexion…';
  });
}

/**
 * Confirmation en deux clics : le premier arme le bouton (libellé de confirmation), le second dans les
 * 4 secondes confirme. `onChange` redessine l'interface.
 */
export function createConfirm(onChange, delayMs = 4000) {
  let armed = null;
  let timer = null;
  return {
    get armed() { return armed; },
    confirm(key) {
      clearTimeout(timer);
      if (armed === key) { armed = null; return true; }
      armed = key;
      timer = setTimeout(() => { armed = null; onChange(); }, delayMs);
      onChange();
      return false;
    },
  };
}

/** Bouton de suppression en deux clics. */
export function confirmButton(confirm, key, { action, data = '', title, confirmLabel, label = '×', className = 'del' }) {
  const isArmed = confirm.armed === key;
  return `<button type="button" class="${className} ${isArmed ? 'is-armed' : ''}" data-action="${action}" ${data} title="${esc(title)}" aria-label="${esc(isArmed ? confirmLabel : title)}">${esc(isArmed ? confirmLabel : label)}</button>`;
}

// ---------------------------------------------------------------- Corbeille discrète

export const TRASH_ICON = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';

/** Bouton icône qui affiche ou masque une corbeille, avec le nombre d'éléments. */
export function trashToggle(count, open, action = 'toggle-trash') {
  const label = count ? `${open ? 'Masquer' : 'Afficher'} la corbeille (${count} ${plural(count, 'élément', 'éléments')})` : 'Corbeille vide';
  return `<button type="button" class="trash-toggle" data-action="${action}" aria-expanded="${open}" aria-label="${label}" title="${label}" ${count ? '' : 'disabled'}>${TRASH_ICON}<span class="num">${count}</span></button>`;
}

// ---------------------------------------------------------------- Partage (lien et QR code)

let shareUrl = '';
let shareWired = false;

function wireShare() {
  if (shareWired) return;
  shareWired = true;
  const dialog = $('share-dialog');
  $('share-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  $('share-url').addEventListener('focus', (event) => event.target.select());
  $('share-copy').addEventListener('click', async () => {
    const status = $('share-status');
    try {
      await navigator.clipboard.writeText(shareUrl);
      status.textContent = 'Lien copié';
    } catch {
      $('share-url').select();
      status.textContent = 'Copie impossible : sélectionnez le lien et copiez-le.';
    }
    setTimeout(() => { status.textContent = ''; }, 4000);
  });
}

/** Ouvre la fenêtre de partage d'une équipe : lien, copie et QR code générés dans la page. */
export function openShare({ name, url }) {
  wireShare();
  shareUrl = url;
  $('share-team').textContent = name;
  $('share-url').value = url;
  $('share-status').textContent = '';
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    $('share-qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: `QR code de l'équipe ${name}` });
    $('share-qr').hidden = false;
  } catch {
    $('share-qr').hidden = true; // bibliothèque indisponible : le lien reste utilisable
  }
  $('share-dialog').showModal();
}

/** Adresse de base du site (accueil), sans paramètre ni ancre. */
export function siteBaseUrl() {
  return new URL('./', location.href).toString();
}
