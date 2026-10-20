// Interface de la matrice. Reçoit un « store » (Firebase en production, factice pour les essais)
// et ne contient aucune règle métier : tout calcul passe par matrix-core.js.

import {
  LEVELS, DEFAULT_TARGETS, STATUS_LABELS, NAME_MAX_LENGTH, LABEL_MAX_LENGTH,
  isLevel, validateMemberName, validateSkillLabel, nextOrder, parseMatrix, ratedCount,
  assessSkill, overview, presentMembers, memberImpact, trainingPlan,
} from './matrix-core.js?v=__VERSION__';

const ME_KEY = 'matrice-competences.me';
const TAB_KEY = 'matrice-competences.tab';
const TABS = [['matrice', 'Matrice'], ['radars', 'Radars'], ['equipe', 'Équipe'], ['plan', 'Plan de formation']];
const ARM_MS = 4000;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => (n > 1 ? many : one);

function readStored(key) {
  try { return localStorage.getItem(key) || null; } catch { return null; }
}
function store(key, value) {
  try { value ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch { /* stockage indisponible */ }
}

function showScreen(name) {
  for (const id of ['screen-status', 'screen-matrix']) $(id).hidden = id !== `screen-${name}`;
}

export function showFatal(message) {
  showScreen('status');
  $('status-text').textContent = message;
  $('status-text').classList.add('is-error');
}

let toastTimer = null;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}
const WRITE_FAILED = 'Modification non enregistrée. Vérifiez votre connexion, puis réessayez.';

// ---------------------------------------------------------------- Fragments HTML

function levelBox(level, extra = '') {
  return isLevel(level) ? `<div class="lvl l${level} ${extra}">${level}</div>` : `<div class="lvl empty ${extra}">–</div>`;
}

function levelOptions(level, { allowEmpty = false, short = false } = {}) {
  const empty = allowEmpty ? `<option value="" ${isLevel(level) ? '' : 'selected'}>– Non noté</option>` : '';
  return empty + LEVELS.map((label, i) =>
    `<option value="${i}" ${level === i ? 'selected' : ''}>${short ? i : `${i} · ${esc(label)}`}</option>`).join('');
}

function deleteButton(key, armed, action, data, title, confirmLabel) {
  const isArmed = armed === key;
  return `<button type="button" class="del ${isArmed ? 'is-armed' : ''}" data-action="${action}" ${data} title="${esc(title)}" aria-label="${esc(isArmed ? confirmLabel : title)}">${isArmed ? esc(confirmLabel) : '×'}</button>`;
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

export async function startApp(matrixStore) {
  let skills = [];
  let members = [];
  let me = readStored(ME_KEY);
  let tab = readStored(TAB_KEY);
  if (!TABS.some(([key]) => key === tab)) tab = 'matrice';
  let freeEdit = false;
  const absent = new Set();
  let armed = null;
  let armTimer = null;
  let pendingRender = false;
  let everConnected = false;

  try {
    await matrixStore.start();
  } catch (error) {
    console.error('Connexion Firebase refusée :', error?.code ?? error);
    showFatal('Impossible de se connecter au service temps réel. Vérifiez votre connexion, puis rechargez la page.');
    return;
  }

  matrixStore.onConnection((connected) => {
    everConnected ||= connected;
    const banner = $('banner');
    banner.hidden = connected || !everConnected;
    banner.textContent = 'Connexion perdue, reconnexion…';
  });

  matrixStore.onMatrix((raw) => {
    ({ skills, members } = parseMatrix(raw));
    for (const id of [...absent]) if (!members.some((m) => m.id === id)) absent.delete(id);
    showScreen('matrix');
    $('whoami').hidden = false;
    render();
  }, (error) => {
    console.error('Lecture refusée :', error?.code ?? error);
    showFatal('Impossible de lire la matrice. Rechargez la page.');
  });

  /** Premier clic : demande confirmation ; second clic dans les 4 secondes : renvoie true. */
  function confirmTwice(key) {
    clearTimeout(armTimer);
    if (armed === key) { armed = null; return true; }
    armed = key;
    armTimer = setTimeout(() => { armed = null; render(); }, ARM_MS);
    render();
    return false;
  }

  // ---------------------------------------------------------------- Rendu

  function isTyping() {
    const el = document.activeElement;
    return el?.tagName === 'INPUT' && el.type === 'text' && el.closest('#panel, #whoami');
  }

  function render() {
    // Ne pas effacer un champ en cours de saisie : le rendu reprend quand il perd le focus.
    if (isTyping()) { pendingRender = true; return; }
    pendingRender = false;
    renderWho();
    renderSummary();
    renderTabs();
    $('panel').innerHTML = tab === 'radars' ? renderRadars() : tab === 'equipe' ? renderTeam() : tab === 'plan' ? renderPlan() : renderMatrix();
    renderFoot();
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
      <button type="button" class="tab" role="tab" id="tab-${key}" data-action="tab" data-tab="${key}" aria-selected="${tab === key}">${label}${key === 'plan' && atRisk ? `<span class="count" aria-label="${atRisk} à traiter">${atRisk}</span>` : ''}</button>`).join('');
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
          <input type="text" class="skill-input" id="skill-${esc(s.id)}" value="${esc(s.label)}" data-action="rename-skill" data-s="${esc(s.id)}" aria-label="Nom de la compétence" maxlength="${LABEL_MAX_LENGTH}">
          ${deleteButton(`skill:${s.id}`, armed, 'del-skill', `data-s="${esc(s.id)}"`, `Supprimer « ${s.label} »`, 'Supprimer ?')}
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
            <input type="text" class="field" id="member-${esc(m.id)}" value="${esc(m.name)}" data-action="rename-member" data-m="${esc(m.id)}" aria-label="Nom de la personne" maxlength="${NAME_MAX_LENGTH}">
            ${deleteButton(`member:${m.id}`, armed, 'del-member', `data-m="${esc(m.id)}"`, `Retirer ${m.name} de l'équipe`, 'Retirer ?')}
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
      <p class="muted">Retirer une personne efface aussi ses notes.</p>`;
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

  function renderFoot() {
    $('foot').innerHTML = `<span>${members.length} ${plural(members.length, 'personne', 'personnes')} · ${skills.length} ${plural(skills.length, 'compétence', 'compétences')} · mise à jour en direct pour toute l'équipe</span>`;
  }

  // ---------------------------------------------------------------- Actions

  async function addMember(input, { becomeMe }) {
    const result = validateMemberName(input.value, members);
    if (!result.ok) { toast(result.error); input.focus(); return; }
    input.value = '';
    input.blur();
    const id = await matrixStore.addMember({ name: result.name, order: nextOrder(members) });
    if (!id) { toast(WRITE_FAILED); return; }
    if (becomeMe) { me = id; store(ME_KEY, me); render(); }
    toast(`${result.name} a rejoint l'équipe.`);
  }

  async function addSkill(form) {
    const result = validateSkillLabel(form.elements.label.value, skills);
    if (!result.ok) { toast(result.error); form.elements.label.focus(); return; }
    const id = await matrixStore.addSkill({
      label: result.label,
      refTarget: Number(form.elements.ref.value),
      backupTarget: Number(form.elements.backup.value),
      order: nextOrder(skills),
    });
    if (!id) { toast(WRITE_FAILED); return; }
    const input = $('new-skill');
    if (input) { input.value = ''; input.focus(); }
  }

  const report = (done) => done.then((ok) => { if (!ok) toast(WRITE_FAILED); });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action } = button.dataset;
    if (action === 'tab') {
      tab = button.dataset.tab;
      store(TAB_KEY, tab);
      render();
    } else if (action === 'absent') {
      const { id } = button.dataset;
      if (absent.has(id)) absent.delete(id); else absent.add(id);
      render();
    } else if (action === 'clear-absent') {
      absent.clear();
      render();
    } else if (action === 'del-skill') {
      const { s } = button.dataset;
      if (confirmTwice(`skill:${s}`)) report(matrixStore.deleteSkill(s, members.map((m) => m.id)));
    } else if (action === 'del-member') {
      const { m } = button.dataset;
      if (confirmTwice(`member:${m}`)) {
        absent.delete(m);
        if (m === me) { me = null; store(ME_KEY, null); }
        report(matrixStore.deleteMember(m));
      }
    }
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el.id === 'me-select') {
      me = el.value || null;
      store(ME_KEY, me);
      render();
      return;
    }
    const { action } = el.dataset;
    if (action === 'rate') {
      report(matrixStore.setRating(el.dataset.m, el.dataset.s, el.value === '' ? null : Number(el.value)));
    } else if (action === 'target') {
      report(matrixStore.updateSkill(el.dataset.s, { [el.dataset.k]: Number(el.value) }));
    } else if (action === 'free-edit') {
      freeEdit = el.checked;
      render();
    } else if (action === 'rename-skill') {
      const skill = skills.find((s) => s.id === el.dataset.s);
      const result = validateSkillLabel(el.value, skills, el.dataset.s);
      if (!result.ok) { toast(result.error); el.value = skill?.label ?? ''; return; }
      if (result.label !== skill?.label) report(matrixStore.updateSkill(el.dataset.s, { label: result.label }));
    } else if (action === 'rename-member') {
      const member = members.find((m) => m.id === el.dataset.m);
      const result = validateMemberName(el.value, members, el.dataset.m);
      if (!result.ok) { toast(result.error); el.value = member?.name ?? ''; return; }
      if (result.name !== member?.name) report(matrixStore.renameMember(el.dataset.m, result.name));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input[data-action^="rename-"]')) {
      event.preventDefault();
      event.target.blur();
    }
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
