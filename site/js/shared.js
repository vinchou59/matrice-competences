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
let shareName = '';
let shareQr = null;
let shareWired = false;

/**
 * Image PNG du QR code (modules noirs sur fond blanc, marge réglementaire de 4 modules), avec le nom de
 * l'équipe en dessous : prête à coller dans un message ou à imprimer.
 */
function qrPng(qr, caption) {
  const cell = 10;
  const margin = 4 * cell;
  const count = qr.getModuleCount();
  const size = count * cell + 2 * margin;
  const captionHeight = caption ? 56 : 0;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size + captionHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < count; r += 1) {
    for (let c = 0; c < count; c += 1) {
      if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
    }
  }
  if (caption) {
    ctx.fillStyle = '#172033';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let fontSize = 28;
    do {
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
      fontSize -= 2;
    } while (ctx.measureText(caption).width > size - 2 * cell && fontSize > 12);
    ctx.fillText(caption, size / 2, size + captionHeight / 2 - 12);
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG'))), 'image/png'));
}

const shareStatus = (message) => {
  const status = $('share-status');
  status.textContent = message;
  setTimeout(() => { if (status.textContent === message) status.textContent = ''; }, 4000);
};

const qrFileName = () => `qr-code-${shareName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'equipe'}.png`;

function downloadQr() {
  qrPng(shareQr, shareName).then((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = qrFileName();
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    shareStatus('QR code téléchargé');
  }, () => shareStatus('Image impossible à créer dans ce navigateur.'));
}

function wireShare() {
  if (shareWired) return;
  shareWired = true;
  const dialog = $('share-dialog');
  $('share-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  $('share-url').addEventListener('focus', (event) => event.target.select());
  $('share-qr-download').addEventListener('click', downloadQr);
  $('share-qr-copy').addEventListener('click', async () => {
    try {
      // La promesse est passée telle quelle : Safari exige l'appel au presse-papiers pendant le clic.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': qrPng(shareQr, shareName) })]);
      shareStatus('QR code copié : collez-le dans un message ou un document');
    } catch {
      shareStatus('Copie de l\'image impossible dans ce navigateur : le QR code est téléchargé à la place.');
      downloadQr();
    }
  });
  $('share-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      shareStatus('Lien copié');
    } catch {
      $('share-url').select();
      shareStatus('Copie impossible : sélectionnez le lien et copiez-le.');
    }
  });
}

/** Ouvre la fenêtre de partage d'une équipe : lien, copie et QR code générés dans la page. */
export function openShare({ name, url }) {
  wireShare();
  shareUrl = url;
  shareName = name;
  $('share-team').textContent = name;
  $('share-url').value = url;
  $('share-status').textContent = '';
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    $('share-qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true, alt: `QR code de l'équipe ${name}` });
    shareQr = qr;
    $('share-qr').hidden = false;
    $('share-qr-actions').hidden = false;
  } catch {
    shareQr = null;
    $('share-qr').hidden = true; // bibliothèque indisponible : le lien reste utilisable
    $('share-qr-actions').hidden = true;
  }
  $('share-dialog').showModal();
}

/** Adresse de base du site (accueil), sans paramètre ni ancre. */
export function siteBaseUrl() {
  return new URL('./', location.href).toString();
}
