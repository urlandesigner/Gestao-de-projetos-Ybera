/* Central de Projetos — DOM, localStorage e orquestração. */
(function () {
'use strict';
const C = window.CentralCore;
const A = window.CentralApi;
const LS = { config: 'central.config', pat: 'central.pat', cache: 'central.cache' };
const $ = (id) => document.getElementById(id);

function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const state = {
  config: null,
  pat: localStorage.getItem(LS.pat) || '',
  cache: loadJSON(LS.cache) || { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0, lastSuccessAt: 0 },
  discovery: null,
  auth: null, // null | 'sem-token' | 'vencido' | 'atualizando' | 'conectado'
};

function ctx() { return { base: state.config.org, pat: state.pat, fetchImpl: window.fetch.bind(window) }; }
function cardKey(p) { return p.projectName + '::' + p.teamName; }

function mensagemDeErro(e) {
  if (e instanceof A.AuthError) return 'PAT recusado — confira o token e os escopos (Work Items Read, Project and Team Read).';
  if (e instanceof A.NetworkError) {
    if (location.protocol === 'file:') return 'O navegador bloqueou a chamada (CORS via file://). Sirva a pasta: python3 -m http.server e abra http://localhost:8000';
    return 'Falha de rede — confira a conexão e a URL da organização.';
  }
  return e.message;
}

/* ---------- Onboarding ---------- */
async function wizardDiscover() {
  const err = $('wizard-erro');
  err.hidden = true;
  let base;
  try { base = C.orgBaseUrl($('wizard-org').value); }
  catch (e) { err.textContent = e.message; err.hidden = false; return; }
  const pat = $('wizard-pat').value.trim();
  if (!pat) { err.textContent = 'Cole um PAT.'; err.hidden = false; return; }
  $('wizard-descobrindo').hidden = false;
  try {
    const tempCtx = { base, pat, fetchImpl: window.fetch.bind(window) };
    const projects = await A.listProjects(tempCtx);
    const list = [];
    for (const p of projects) list.push({ project: p, teams: await A.listTeams(tempCtx, p.id) });
    state.discovery = { base, pat, list };
    renderDiscovery(list);
    $('wizard-passo-1').hidden = true;
    $('wizard-passo-2').hidden = false;
  } catch (e) {
    err.textContent = mensagemDeErro(e);
    err.hidden = false;
  } finally {
    $('wizard-descobrindo').hidden = true;
  }
}

function renderDiscovery(list) {
  const box = $('wizard-lista');
  box.innerHTML = '';
  for (const { project, teams } of list) {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = project.name;
    group.appendChild(legend);
    for (const team of teams) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.projectId = project.id;
      cb.dataset.projectName = project.name;
      cb.dataset.teamId = team.id;
      cb.dataset.teamName = team.name;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + team.name));
      group.appendChild(label);
    }
    box.appendChild(group);
  }
}

function wizardConclude() {
  const checked = [...$('wizard-lista').querySelectorAll('input:checked')];
  const err = $('wizard-erro-2');
  if (!checked.length) { err.textContent = 'Marque pelo menos um time.'; err.hidden = false; return; }
  const projects = checked.map((cb, i) => ({
    projectId: cb.dataset.projectId,
    projectName: cb.dataset.projectName,
    teamId: cb.dataset.teamId,
    teamName: cb.dataset.teamName,
    order: i,
    hidden: false,
  }));
  const config = C.normalizeConfig({ org: state.discovery.base, projects, updatedAt: new Date().toISOString() });
  saveJSON(LS.config, config);
  localStorage.setItem(LS.pat, state.discovery.pat);
  state.config = config;
  state.pat = state.discovery.pat;
  state.cache = { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0, lastSuccessAt: 0 };
  saveJSON(LS.cache, state.cache);
  $('wizard').close();
  boot();
}

/* ---------- Dados vivos ---------- */
const FIELDS_COUNTS = ['System.WorkItemType', 'System.State'];
const FIELDS_ITEMS = ['System.Title', 'System.State', 'System.WorkItemType', 'System.TeamProject'];

async function refreshCard(p) {
  const anterior = state.cache.byCard[cardKey(p)] || {};
  const entry = { counts: anterior.counts || null, sprint: anterior.sprint || null, progress: anterior.progress || null, error: null };
  try {
    const ids = await A.runWiql(ctx(), p.projectName, p.teamName, C.wiqlCounts());
    const items = ids.length ? await A.getFields(ctx(), ids, FIELDS_COUNTS) : [];
    entry.counts = C.aggregateCounts(items);
    const sprint = await A.currentSprint(ctx(), p.projectName, p.teamName);
    if (sprint) {
      entry.sprint = sprint;
      const sids = await A.sprintItemIds(ctx(), p.projectName, p.teamName, sprint.id);
      const sitems = sids.length ? await A.getFields(ctx(), sids, FIELDS_COUNTS) : [];
      entry.progress = C.sprintProgress(sitems);
    }
  } catch (e) {
    entry.error = mensagemDeErro(e);
    if (e instanceof A.AuthError) state.auth = 'vencido';
  }
  state.cache.byCard[cardKey(p)] = entry;
  renderCard(p);
}

async function refreshMyItems() {
  const itensAnteriores = state.cache.myItems;
  state.cache.myItemsError = null;
  try {
    const porProjeto = new Map(); // projectName -> teamName (qualquer time serve de contexto)
    for (const p of state.config.projects) if (!porProjeto.has(p.projectName)) porProjeto.set(p.projectName, p.teamName);
    const allIds = [];
    for (const [projeto, time] of porProjeto) {
      allIds.push(...await A.runWiql(ctx(), projeto, time, C.wiqlMyItems()));
    }
    const unicos = [...new Set(allIds)];
    state.cache.myItems = unicos.length ? await A.getFields(ctx(), unicos, FIELDS_ITEMS) : [];
  } catch (e) {
    if (e instanceof A.AuthError) state.auth = 'vencido';
    state.cache.myItemsError = mensagemDeErro(e);
    state.cache.myItems = itensAnteriores;
  }
  renderMyItems();
}

async function refreshAll(force) {
  if (!state.config) return;
  if (!state.pat) { state.auth = 'sem-token'; renderBadge(); return; }
  if (!force && !C.isStale(state.cache.fetchedAt, Date.now())) { renderBadge(); return; }
  state.auth = 'atualizando';
  renderBadge();
  try {
    const visiveis = state.config.projects.filter((p) => !p.hidden);
    await Promise.all([...visiveis.map(refreshCard), refreshMyItems()]);
    state.cache.fetchedAt = Date.now();
    const algumSucesso = visiveis.some((p) => !(state.cache.byCard[cardKey(p)] || {}).error);
    if (state.auth !== 'vencido' && algumSucesso) state.cache.lastSuccessAt = Date.now();
    if (state.auth === 'atualizando') state.auth = 'conectado';
  } finally {
    saveJSON(LS.cache, state.cache);
    renderBadge();
  }
}

/* ---------- Render ---------- */
function renderAll() { renderBadge(); renderMyItems(); renderGrid(); }

function renderBadge() {
  const rotulos = { 'sem-token': 'sem token', vencido: 'token vencido', atualizando: 'atualizando…', conectado: 'conectado' };
  const auth = state.auth || (state.pat ? 'conectado' : 'sem-token');
  const badge = $('badge');
  badge.textContent = rotulos[auth] || auth;
  badge.dataset.estado = auth;
  $('carimbo').textContent = C.timeAgoLabel(state.cache.lastSuccessAt || 0, Date.now());
}

function renderGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  for (const p of state.config.projects.filter((x) => !x.hidden)) grid.appendChild(buildCard(p));
}

function buildCard(p) {
  const links = C.deepLinks(state.config.org, p.projectName, p.teamName);
  const card = document.createElement('article');
  card.className = 'card';
  card.id = 'card-' + cssId(cardKey(p));
  card.innerHTML = `
    <h3>${escapeHtml(p.teamName)}</h3>
    <p class="proj">${escapeHtml(p.projectName)}</p>
    <nav class="atalhos">
      <a href="${links.board}" target="_blank" rel="noopener">Board</a>
      <a href="${links.backlog}" target="_blank" rel="noopener">Backlog</a>
      <a href="${links.sprints}" target="_blank" rel="noopener">Sprints</a>
      <a href="${links.queries}" target="_blank" rel="noopener">Queries</a>
      <a href="${links.dashboards}" target="_blank" rel="noopener">Dashboards</a>
    </nav>
    <div class="vivo"></div>`;
  fillCardLive(card, p);
  return card;
}

function renderCard(p) {
  const card = document.getElementById('card-' + cssId(cardKey(p)));
  if (card) fillCardLive(card, p);
}

function fillCardLive(card, p) {
  const box = card.querySelector('.vivo');
  const entry = state.cache.byCard[cardKey(p)];
  if (!entry) {
    box.innerHTML = state.pat ? '<p class="mudo">carregando…</p>' : '<p class="mudo">— sem token: só atalhos —</p>';
    return;
  }
  if (entry.error && !entry.counts) { box.innerHTML = `<p class="erro">${escapeHtml(entry.error)}</p>`; return; }
  const linhas = [];
  if (entry.error) linhas.push(`<p class="erro">${escapeHtml(entry.error)}</p>`);
  for (const par of [['epic', 'Epics'], ['feature', 'Features'], ['pbi', 'PBIs']]) {
    const chips = Object.entries(entry.counts[par[0]])
      .map(([estado, n]) => `<span class="chip">${n} ${escapeHtml(rotuloEstado(estado))}</span>`)
      .join(' ');
    linhas.push(`<div class="nivel"><b>${par[1]}</b> ${chips || '<span class="mudo">nenhum</span>'}</div>`);
  }
  if (entry.sprint) {
    const prog = entry.progress || { done: 0, total: 0 };
    linhas.push(`<div class="sprint"><b>${escapeHtml(entry.sprint.name)}</b> ${periodo(entry.sprint.start, entry.sprint.finish)} — ${prog.done}/${prog.total} concluídos</div>`);
  } else {
    linhas.push('<div class="sprint mudo">sem sprint corrente</div>');
  }
  box.innerHTML = linhas.join('');
}

function rotuloEstado(estado) {
  return C.isTerminalState(estado) ? `${estado} (30d)` : estado;
}

function renderMyItems() {
  const box = $('meus-itens');
  const items = state.cache.myItems;
  const erroHtml = state.cache.myItemsError ? `<p class="erro">${escapeHtml(state.cache.myItemsError)}</p>` : '';
  if (state.cache.myItemsError && !items) { box.innerHTML = erroHtml; return; }
  if (!items) { box.innerHTML = '<p class="mudo">— configure o token pra ver seus itens —</p>'; return; }
  if (!items.length) { box.innerHTML = erroHtml + '<p class="mudo">Nada no seu nome.</p>'; return; }
  const grupos = C.groupMyItems(items);
  box.innerHTML = erroHtml + grupos.map((g) => `
    <div class="grupo">
      <h4>${escapeHtml(g.state)} <span class="mudo">(${g.items.length})</span></h4>
      <ul>${g.items.map((it) => {
        const f = it.fields || {};
        const link = C.deepLinks(state.config.org, f['System.TeamProject'], '').workItem(it.id);
        return `<li><a href="${link}" target="_blank" rel="noopener">#${it.id} ${escapeHtml(f['System.Title'])}</a> <span class="mudo">${escapeHtml(f['System.TeamProject'])}</span></li>`;
      }).join('')}</ul>
    </div>`).join('');
}

function periodo(start, finish) {
  if (!start || !finish) return '';
  const fmt = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(start)}–${fmt(finish)}`;
}

function cssId(s) { return s.replace(/[^a-z0-9]/gi, '-').toLowerCase(); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }

/* ---------- Configurações ---------- */
function openSettings() {
  if (!state.config) return;
  $('conf-pat').value = '';
  $('conf-erro').hidden = true;
  $('conf-lista').innerHTML = state.config.projects.map((p, i) => `
    <li data-i="${i}">
      <label><input type="checkbox" class="conf-visivel" ${p.hidden ? '' : 'checked'}> ${escapeHtml(p.teamName)} <span class="mudo">${escapeHtml(p.projectName)}</span></label>
      <span class="ordem"><button type="button" class="subir" title="subir">↑</button><button type="button" class="descer" title="descer">↓</button></span>
    </li>`).join('');
  $('config').showModal();
}

function settingsSave() {
  [...$('conf-lista').querySelectorAll('li')].forEach((li, ordem) => {
    const p = state.config.projects[Number(li.dataset.i)];
    p.order = ordem;
    p.hidden = !li.querySelector('.conf-visivel').checked;
  });
  state.config.projects.sort((a, b) => a.order - b.order);
  const novoPat = $('conf-pat').value.trim();
  if (novoPat) { state.pat = novoPat; localStorage.setItem(LS.pat, novoPat); state.auth = null; }
  saveJSON(LS.config, state.config);
  $('config').close();
  renderAll();
  refreshAll(true);
}

function settingsExport() {
  const blob = new Blob([C.exportConfig(state.config)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'central-projetos-config.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function settingsImport(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const config = C.normalizeConfig(JSON.parse(reader.result));
      saveJSON(LS.config, config);
      state.config = config;
      state.cache = { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0, lastSuccessAt: 0 };
      saveJSON(LS.cache, state.cache);
      $('config').close();
      renderAll();
      refreshAll(true);
    } catch (e) {
      $('conf-erro').textContent = 'Arquivo inválido: ' + e.message;
      $('conf-erro').hidden = false;
    }
  };
  reader.readAsText(file);
  ev.target.value = '';
}

function settingsRediscover() {
  $('config').close();
  $('wizard-org').value = state.config.org;
  $('wizard-pat').value = state.pat;
  $('wizard-passo-1').hidden = false;
  $('wizard-passo-2').hidden = true;
  $('wizard').showModal();
}

/* ---------- Boot ---------- */
function boot() {
  const raw = loadJSON(LS.config);
  if (raw) { try { state.config = C.normalizeConfig(raw); } catch (e) { state.config = null; } }
  if (!state.config) {
    $('wizard').addEventListener('cancel', (ev) => { if (!state.config) ev.preventDefault(); });
    $('wizard').showModal();
    return;
  }
  renderAll();
  refreshAll(false);
}

document.addEventListener('DOMContentLoaded', () => {
  $('wizard-descobrir').addEventListener('click', wizardDiscover);
  $('wizard-concluir').addEventListener('click', wizardConclude);
  $('atualizar').addEventListener('click', () => refreshAll(true));
  $('abrir-config').addEventListener('click', openSettings);
  $('conf-salvar').addEventListener('click', settingsSave);
  $('conf-redescobrir').addEventListener('click', settingsRediscover);
  $('conf-exportar').addEventListener('click', settingsExport);
  $('conf-importar').addEventListener('change', settingsImport);
  $('conf-fechar').addEventListener('click', () => $('config').close());
  $('conf-lista').addEventListener('click', (ev) => {
    const li = ev.target.closest('li');
    if (!li) return;
    if (ev.target.classList.contains('subir') && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
    else if (ev.target.classList.contains('descer') && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
  });
  boot();
});
})();
