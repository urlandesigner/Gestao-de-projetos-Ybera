/* Central de Projetos — DOM, localStorage e orquestração. */
(function () {
'use strict';
const C = window.CentralCore;
const A = window.CentralApi;
const LS = { config: 'central.config', pat: 'central.pat', cache: 'central.cache', filtros: 'central.filtros' };
const $ = (id) => document.getElementById(id);

function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const state = {
  config: null,
  pat: localStorage.getItem(LS.pat) || '',
  cache: loadJSON(LS.cache) || { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0, lastSuccessAt: 0 },
  discovery: null,
  auth: null, // null | 'sem-token' | 'vencido' | 'atualizando' | 'conectado'
  filtrosMI: Object.assign({ tipos: null, projetos: null }, loadJSON(LS.filtros) || {}, { busca: '' }),
};
state.cache.lastSuccessAt = state.cache.lastSuccessAt || state.cache.fetchedAt || 0; // migração: cache antigo sem lastSuccessAt

const ROTULOS_TIPO = { epic: 'Épicos', feature: 'Features', pbi: 'PBIs', bug: 'Bugs', task: 'Tasks', outro: 'Outros' };
const ORDEM_TIPO = ['epic', 'feature', 'pbi', 'bug', 'task', 'outro'];

// Chips de filtro por tipo — contagem sempre sobre o conjunto completo
function renderChipsTipo(container, items, filtro, onChange) {
  const contagem = {};
  for (const it of items || []) {
    const s = C.typeSlug((it.fields || {})['System.WorkItemType']);
    contagem[s] = (contagem[s] || 0) + 1;
  }
  const presentes = ORDEM_TIPO.filter((s) => contagem[s]);
  container.innerHTML = presentes.length < 2 ? '' : presentes.map((s) => {
    const ativo = filtro.tipos && filtro.tipos.includes(s) ? ' ativo' : '';
    return `<button type="button" class="chip-filtro tipo-${s}${ativo}" data-slug="${s}">${ROTULOS_TIPO[s]} <span class="n">${contagem[s]}</span></button>`;
  }).join('');
  container.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const s = b.dataset.slug;
    let t = filtro.tipos ? [...filtro.tipos] : [];
    t = t.includes(s) ? t.filter((x) => x !== s) : [...t, s];
    filtro.tipos = t.length ? t : null;
    onChange();
  };
}

// Chips de filtro por projeto — só aparecem quando há mais de um projeto
function renderChipsProjeto(container, items, filtro, onChange) {
  const contagem = new Map();
  for (const it of items || []) {
    const nome = (it.fields || {})['System.TeamProject'] || '—';
    contagem.set(nome, (contagem.get(nome) || 0) + 1);
  }
  container.innerHTML = contagem.size < 2 ? '' : [...contagem.entries()].map(([nome, n]) => {
    const ativo = filtro.projetos && filtro.projetos.includes(nome) ? ' ativo' : '';
    return `<button type="button" class="chip-filtro${ativo}" data-proj="${escapeHtml(nome)}">${escapeHtml(nome)} <span class="n">${n}</span></button>`;
  }).join('');
  container.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const nome = b.dataset.proj;
    let pr = filtro.projetos ? [...filtro.projetos] : [];
    pr = pr.includes(nome) ? pr.filter((x) => x !== nome) : [...pr, nome];
    filtro.projetos = pr.length ? pr : null;
    onChange();
  };
}

function salvarFiltrosMI() {
  saveJSON(LS.filtros, { tipos: state.filtrosMI.tipos, projetos: state.filtrosMI.projetos });
}

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
const FIELDS_BOARD = ['System.Title', 'System.State', 'System.WorkItemType', 'System.BoardColumn', 'System.AssignedTo', 'System.IterationPath'];
const FIELDS_ITEMS = ['System.Title', 'System.State', 'System.WorkItemType', 'System.TeamProject'];

async function refreshCard(p) {
  const anterior = state.cache.byCard[cardKey(p)] || {};
  const entry = { counts: null, sprint: null, progress: null, error: null };
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
    entry.counts = entry.counts || anterior.counts || null;
    entry.sprint = entry.sprint || anterior.sprint || null;
    entry.progress = entry.progress || anterior.progress || null;
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
    const algumSucesso = (!visiveis.length && !state.cache.myItemsError)
      || visiveis.some((p) => !(state.cache.byCard[cardKey(p)] || {}).error);
    if (state.auth !== 'vencido' && algumSucesso) state.cache.lastSuccessAt = Date.now();
  } finally {
    if (state.auth === 'atualizando') state.auth = 'conectado';
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
      <a class="interno" href="${rotaBoard(p, false)}">▦ Board aqui</a>
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
    const rota = rotaBoard(p, true);
    linhas.push(`<div class="sprint"><a class="sprint-link" href="${rota}" title="Ver a sprint no board"><b>${escapeHtml(entry.sprint.name)}</b> ${periodo(entry.sprint.start, entry.sprint.finish)} — ${prog.done}/${prog.total} concluídos <span class="seta">→</span></a></div>`);
  } else {
    linhas.push('<div class="sprint mudo">sem sprint corrente</div>');
  }
  box.innerHTML = linhas.join('');
}

function rotaBoard(p, comSprint) {
  return `#board/${encodeURIComponent(p.projectName)}/${encodeURIComponent(p.teamName)}${comSprint ? '/sprint' : ''}`;
}

function rotuloEstado(estado) {
  return C.isTerminalState(estado) ? `${estado} (30d)` : estado;
}

function renderMyItems() {
  const box = $('meus-itens');
  const barra = $('mi-filtros');
  const items = state.cache.myItems;
  const erroHtml = state.cache.myItemsError ? `<p class="erro">${escapeHtml(state.cache.myItemsError)}</p>` : '';
  if (state.cache.myItemsError && !items) { barra.hidden = true; box.innerHTML = erroHtml; return; }
  if (!items) { barra.hidden = true; box.innerHTML = '<p class="mudo">— configure o token pra ver seus itens —</p>'; return; }
  if (!items.length) { barra.hidden = true; box.innerHTML = erroHtml + '<p class="mudo">Nada no seu nome.</p>'; return; }
  barra.hidden = false;
  renderChipsTipo($('mi-tipos'), items, state.filtrosMI, () => { salvarFiltrosMI(); renderMyItems(); });
  renderChipsProjeto($('mi-projetos'), items, state.filtrosMI, () => { salvarFiltrosMI(); renderMyItems(); });
  const filtrados = C.filterItems(items, state.filtrosMI);
  if (!filtrados.length) { box.innerHTML = erroHtml + '<p class="mudo">Nada com esses filtros.</p>'; return; }
  const grupos = C.sortStateGroups(C.groupMyItems(filtrados));
  // Tag de projeto só quando há mais de um projeto entre os itens — senão é ruído.
  const multiProjeto = new Set(items.map((it) => (it.fields || {})['System.TeamProject'])).size > 1;
  box.innerHTML = erroHtml + '<div class="quadro">' + grupos.map((g) => {
    const atencao = C.isAttentionState(g.state) ? ' atencao' : '';
    return `
    <section class="coluna${atencao}">
      <header><h4>${escapeHtml(g.state)}</h4><span class="conta">${g.items.length}</span></header>
      <ul>${g.items.map((it) => {
        const f = it.fields || {};
        const link = C.deepLinks(state.config.org, f['System.TeamProject'], '').workItem(it.id);
        const tag = multiProjeto ? `<span class="tag-proj">${escapeHtml(f['System.TeamProject'])}</span>` : '';
        return `<li><a class="item tipo-${C.typeSlug(f['System.WorkItemType'])}" href="${link}" target="_blank" rel="noopener" title="${escapeHtml(f['System.WorkItemType'])}">
          <span class="id">#${it.id}</span>
          <span class="titulo">${escapeHtml(f['System.Title'])}</span>${tag}
        </a></li>`;
      }).join('')}</ul>
    </section>`;
  }).join('') + '</div>';
}

function periodo(start, finish) {
  if (!start || !finish) return '';
  const fmt = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(start)}–${fmt(finish)}`;
}

function cssId(s) { return s.replace(/[^a-z0-9]/gi, '-').toLowerCase(); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML.replace(/"/g, '&quot;'); }

/* ---------- Board dedicado ---------- */
const boardState = { p: null, chave: null, items: null, columns: null, sprint: null, soSprint: false, carregando: false, erro: null, filtro: { tipos: null, resp: '', busca: '' } };

function renderRoute() {
  const m = (location.hash || '').match(/^#board\/([^/]+)\/([^/]+)(\/sprint)?$/);
  if (m && state.config) {
    const projectName = decodeURIComponent(m[1]);
    const teamName = decodeURIComponent(m[2]);
    const p = state.config.projects.find((x) => x.projectName === projectName && x.teamName === teamName);
    if (p) { abrirBoard(p, !!m[3]); return; }
  }
  fecharBoard();
}

function abrirBoard(p, comSprint) {
  boardState.p = p;
  if (comSprint) boardState.soSprint = true;
  document.body.classList.add('modo-board');
  $('board-view').hidden = false;
  carregarBoard(p, false);
}

function fecharBoard() {
  document.body.classList.remove('modo-board');
  const bv = $('board-view');
  if (bv) bv.hidden = true;
}

async function carregarBoard(p, force) {
  const chave = cardKey(p);
  if (!force && boardState.chave === chave && boardState.items) { renderBoard(p); return; }
  boardState.chave = chave;
  boardState.items = null;
  boardState.columns = null;
  boardState.sprint = null;
  boardState.erro = null;
  boardState.filtro = { tipos: null, resp: '', busca: '' };
  $('board-busca').value = '';
  boardState.carregando = true;
  renderBoard(p);
  try {
    let areas = [];
    try { areas = await A.teamAreas(ctx(), p.projectName, p.teamName); } catch (e) { /* segue sem recorte de área */ }
    const ids = await A.runWiql(ctx(), p.projectName, p.teamName, C.wiqlBoard(areas));
    boardState.items = ids.length ? await A.getFields(ctx(), ids, FIELDS_BOARD) : [];
    try {
      const boards = await A.listTeamBoards(ctx(), p.projectName, p.teamName);
      const nivelRequisito = boards.find((b) => !/^(epics|features)$/i.test(b.name)) || boards[boards.length - 1];
      if (nivelRequisito) boardState.columns = await A.boardColumns(ctx(), p.projectName, p.teamName, nivelRequisito.id);
    } catch (e) { /* sem colunas oficiais: ordenação por fallback */ }
    try { boardState.sprint = await A.currentSprint(ctx(), p.projectName, p.teamName); } catch (e) { /* board segue sem filtro */ }
  } catch (e) {
    boardState.erro = mensagemDeErro(e);
    if (e instanceof A.AuthError) { state.auth = 'vencido'; renderBadge(); }
  }
  boardState.carregando = false;
  renderBoard(p);
}

function renderBoard(p) {
  $('board-titulo').textContent = p.teamName;
  $('board-sub').textContent = p.projectName + (boardState.sprint ? ' · ' + boardState.sprint.name : '');
  $('board-devops').href = C.deepLinks(state.config.org, p.projectName, p.teamName).board;
  const st = $('board-status');
  const cols = $('board-colunas');
  const filtro = $('board-filtro-sprint');
  filtro.hidden = !(boardState.sprint && boardState.sprint.path);
  filtro.setAttribute('aria-pressed', String(boardState.soSprint));
  filtro.classList.toggle('ativo', boardState.soSprint);
  const filtros = $('board-filtros');
  if (boardState.carregando) { filtros.hidden = true; st.textContent = 'carregando board…'; st.hidden = false; cols.innerHTML = ''; return; }
  if (boardState.erro) { filtros.hidden = true; st.innerHTML = `<span class="erro">${escapeHtml(boardState.erro)}</span>`; st.hidden = false; cols.innerHTML = ''; return; }
  const todos = boardState.items || [];
  filtros.hidden = !todos.length;
  renderChipsTipo($('board-tipos'), todos, boardState.filtro, () => renderBoard(p));
  renderRespSelect(todos);
  let items = todos;
  if (boardState.soSprint && boardState.sprint) items = items.filter((it) => C.inSprint(it, boardState.sprint.path));
  items = C.filterItems(items, boardState.filtro);
  const porColuna = new Map();
  for (const it of items) {
    const f = it.fields || {};
    const col = f['System.BoardColumn'] || f['System.State'] || '—';
    if (!porColuna.has(col)) porColuna.set(col, []);
    porColuna.get(col).push(it);
  }
  let nomes;
  if (boardState.columns && boardState.columns.length) {
    nomes = boardState.columns.map((c) => c.name).filter((n) => porColuna.has(n));
    for (const n of porColuna.keys()) if (!nomes.includes(n)) nomes.push(n); // colunas fora da lista oficial vão pro fim
  } else {
    const statesByColumn = {};
    for (const [n, lista] of porColuna) statesByColumn[n] = lista.map((it) => (it.fields || {})['System.State']);
    nomes = C.orderColumnsFallback([...porColuna.keys()], statesByColumn);
  }
  if (!nomes.length) {
    const temFiltro = boardState.filtro.busca || boardState.filtro.resp || boardState.filtro.tipos;
    st.textContent = temFiltro ? 'nada com esses filtros' : (boardState.soSprint ? 'nada na sprint corrente' : 'board vazio');
    st.hidden = false;
    cols.innerHTML = '';
    return;
  }
  st.hidden = true;
  cols.innerHTML = nomes.map((nome) => {
    const lista = porColuna.get(nome) || [];
    return `<section class="coluna">
      <header><h4>${escapeHtml(nome)}</h4><span class="conta">${lista.length}</span></header>
      <ul>${lista.map((it) => {
        const f = it.fields || {};
        const resp = f['System.AssignedTo'] && f['System.AssignedTo'].displayName ? f['System.AssignedTo'].displayName : '';
        const link = C.deepLinks(state.config.org, p.projectName, '').workItem(it.id);
        const dica = escapeHtml(f['System.WorkItemType']) + (resp ? ' · ' + escapeHtml(resp) : '');
        return `<li><a class="item tipo-${C.typeSlug(f['System.WorkItemType'])}" href="${link}" target="_blank" rel="noopener" title="${dica}">
          <span class="id">#${it.id}${resp ? ` <span class="resp">${escapeHtml(C.initials(resp))}</span>` : ''}</span>
          <span class="titulo">${escapeHtml(f['System.Title'])}</span>
        </a></li>`;
      }).join('')}</ul>
    </section>`;
  }).join('');
}

// Seletor de responsável do board — opções vêm dos próprios itens
function renderRespSelect(items) {
  const sel = $('board-resp');
  const atual = boardState.filtro.resp;
  const nomes = [...new Set((items || [])
    .map((it) => (it.fields || {})['System.AssignedTo'])
    .filter((r) => r && r.displayName)
    .map((r) => r.displayName))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  sel.innerHTML = '<option value="">todos os responsáveis</option>' +
    nomes.map((n) => `<option value="${escapeHtml(n)}"${n === atual ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('');
}

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
  renderRoute(); // abre o board direto se a URL já apontar pra um (#board/...)
}

document.addEventListener('DOMContentLoaded', () => {
  $('wizard-descobrir').addEventListener('click', wizardDiscover);
  $('wizard-concluir').addEventListener('click', wizardConclude);
  $('atualizar').addEventListener('click', () => refreshAll(true));
  $('abrir-config').addEventListener('click', openSettings);
  $('board-voltar').addEventListener('click', () => { location.hash = ''; });
  $('board-atualizar').addEventListener('click', () => { if (boardState.p) carregarBoard(boardState.p, true); });
  $('board-filtro-sprint').addEventListener('click', () => {
    boardState.soSprint = !boardState.soSprint;
    if (boardState.p) renderBoard(boardState.p);
  });
  window.addEventListener('hashchange', renderRoute);
  $('mi-busca').addEventListener('input', () => {
    state.filtrosMI.busca = $('mi-busca').value;
    renderMyItems();
  });
  $('board-busca').addEventListener('input', () => {
    boardState.filtro.busca = $('board-busca').value;
    if (boardState.p) renderBoard(boardState.p);
  });
  $('board-resp').addEventListener('change', () => {
    boardState.filtro.resp = $('board-resp').value;
    if (boardState.p) renderBoard(boardState.p);
  });
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
