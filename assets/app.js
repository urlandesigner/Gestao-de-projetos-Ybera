/* Central de Projetos — DOM, localStorage e orquestração. */
(function () {
'use strict';
const C = window.CentralCore;
const A = window.CentralApi;
const LS = { config: 'central.config', pat: 'central.pat', cache: 'central.cache', filtros: 'central.filtros', ui: 'central.ui' };
const $ = (id) => document.getElementById(id);

function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const state = {
  config: null,
  pat: localStorage.getItem(LS.pat) || '',
  cache: loadJSON(LS.cache) || { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0, lastSuccessAt: 0 },
  discovery: null,
  auth: null, // null | 'sem-token' | 'vencido' | 'atualizando' | 'conectado'
  // Só tipos e projetos vêm do armazenamento: `resp` vive no estado global e é
  // aplicado na hora de filtrar. Herdar o objeto inteiro trazia `resp` de
  // carona e zerava a página quando o responsável não vinha nos campos.
  filtrosMI: (() => {
    const f = loadJSON(LS.filtros) || {};
    return { tipos: f.tipos || null, projetos: f.projetos || null, busca: '' };
  })(),
  // Filtro GLOBAL de responsável: vale em todas as páginas derivadas de dado.
  // null = ainda não escolhido → cai no dono do PAT. '' = escolheu "todos".
  resp: (() => {
    const f = loadJSON(LS.filtros) || {};
    if (f.resp !== undefined) return f.resp;
    if (f.respProj) return f.respProj; // migra a escolha antiga, que era só dos cartões
    return null;
  })(),
};
state.cache.lastSuccessAt = state.cache.lastSuccessAt || state.cache.fetchedAt || 0; // migração: cache antigo sem lastSuccessAt

const ROTULOS_TIPO = { epic: 'Épicos', feature: 'Features', pbi: 'PBIs', bug: 'Bugs', task: 'Tasks', outro: 'Outros' };
const ROTULO_TIPO_CURTO = { epic: 'Épico', feature: 'Feature', pbi: 'PBI', bug: 'Bug', task: 'Task', outro: 'Item' };
const ORDEM_TIPO = ['epic', 'feature', 'pbi', 'bug', 'task', 'outro'];
// Ponto da coluna: código semântico próprio — NUNCA as cores de tipo
// (laranja/roxo/azul/vermelho/amarelo são de Épico/Feature/PBI/Bug/Task).
// cinza = fila/andamento · verde = concluído · vermelho = atenção
function corColunaPorBucket(bucket) {
  if (bucket === 'atencao') return '#ef4444';
  if (bucket === 'feito') return '#22c55e';
  return '#a1a1aa';
}

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
  saveJSON(LS.filtros, { tipos: state.filtrosMI.tipos, projetos: state.filtrosMI.projetos, resp: state.resp });
}

// Responsável em vigor. Enquanto ninguém escolhe, é o dono do PAT.
function respAtivo() {
  return state.resp === null ? (state.cache.usuario || '') : state.resp;
}

// Item está no nome de quem está filtrado? Sem filtro, tudo passa.
function noNome(it) {
  const alvo = respAtivo();
  if (!alvo) return true;
  const r = ((it || {}).fields || {})['System.AssignedTo'];
  return !!r && r.displayName === alvo;
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
// Title/TargetDate/ChangedDate entram por causa do Panorama (prazo, parado e a
// lista de atenção). Mesmo lote da contagem — nenhuma requisição a mais.
const FIELDS_COUNTS = [
  'System.WorkItemType', 'System.State', 'System.AssignedTo',
  'System.Title', 'Microsoft.VSTS.Scheduling.TargetDate', 'System.ChangedDate',
];
const FIELDS_BOARD = ['System.Title', 'System.State', 'System.WorkItemType', 'System.BoardColumn', 'System.AssignedTo', 'System.IterationPath'];
// A consulta sem corte de data alimenta Produtos (progresso) e Report (entregas
// por mês). ClosedDate é a data de conclusão; ChangedDate é o plano B dela.
const FIELDS_BASE = [
  'System.Title', 'System.State', 'System.WorkItemType', 'System.Parent',
  'System.AssignedTo', 'Microsoft.VSTS.Scheduling.StartDate', 'Microsoft.VSTS.Scheduling.TargetDate',
  'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate',
];
const FIELDS_ITEMS = [
  'System.Title', 'System.State', 'System.WorkItemType', 'System.TeamProject',
  'System.Parent', 'System.IterationPath',
  // Sem este campo o filtro por responsável não tem o que comparar: comparava
  // undefined com o nome e derrubava a lista inteira.
  'System.AssignedTo',
];

async function refreshCard(p) {
  const anterior = state.cache.byCard[cardKey(p)] || {};
  const entry = { items: null, counts: null, sprint: null, progress: null, error: null };
  try {
    // Recorte pelas áreas do time — senão times do mesmo projeto contam igual
    let areas = [];
    try { areas = await A.teamAreas(ctx(), p.projectName, p.teamName); } catch (e) { /* segue projeto inteiro */ }
    const ids = await A.runWiql(ctx(), p.projectName, p.teamName, C.wiqlCounts(30, areas));
    const items = ids.length ? await A.getFields(ctx(), ids, FIELDS_COUNTS) : [];
    // Guarda os itens enxutos (só o que filterItems/aggregateCounts leem) —
    // o AssignedTo cru do ADO traz avatar, descriptor etc. e incharia o localStorage.
    entry.items = items.map((it) => {
      const f = it.fields || {};
      const resp = f['System.AssignedTo'];
      return { id: it.id, fields: {
        'System.WorkItemType': f['System.WorkItemType'],
        'System.State': f['System.State'],
        'System.AssignedTo': resp && resp.displayName ? { displayName: resp.displayName } : undefined,
        'System.Title': f['System.Title'],
        'Microsoft.VSTS.Scheduling.TargetDate': f['Microsoft.VSTS.Scheduling.TargetDate'],
        'System.ChangedDate': f['System.ChangedDate'],
      } };
    });
    const sprint = await A.currentSprint(ctx(), p.projectName, p.teamName);
    if (sprint) {
      entry.sprint = sprint;
      const sids = await A.sprintItemIds(ctx(), p.projectName, p.teamName, sprint.id);
      const sitems = sids.length ? await A.getFields(ctx(), sids, FIELDS_COUNTS) : [];
      entry.progress = C.sprintProgress(sitems);
      // Prévia do card do Panorama: tudo que ainda falta fazer na sprint,
      // pra pessoa filtrada — qualquer tipo, qualquer estado não concluído.
      // Task fica de fora (mesmo corte que sprintProgress já usa: é
      // sub-item de outro item, não uma entrega em si).
      entry.itensSprintAbertos = sitems
        .filter((it) => {
          const f = it.fields || {};
          return f['System.WorkItemType'] !== 'Task' && C.stateBucket(f['System.State']) !== 'feito';
        })
        .map((it) => {
          const at = (it.fields || {})['System.AssignedTo'];
          return { id: it.id, titulo: (it.fields || {})['System.Title'] || ('item #' + it.id), resp: at && at.displayName ? at.displayName : null };
        });
    }
  } catch (e) {
    entry.items = entry.items || anterior.items || null;
    entry.counts = anterior.counts || null; // legado: cache antigo pré-filtro só tinha counts
    entry.sprint = entry.sprint || anterior.sprint || null;
    entry.progress = entry.progress || anterior.progress || null;
    entry.itensSprintAbertos = entry.itensSprintAbertos || anterior.itensSprintAbertos || null;
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
    // Pai de cada item (Feature/Épico) — um lote só, pro contexto no cartão
    const paiIds = [...new Set(state.cache.myItems.map((it) => (it.fields || {})['System.Parent']).filter(Boolean))];
    const pais = paiIds.length ? await A.getFields(ctx(), paiIds, ['System.Title', 'System.WorkItemType']) : [];
    state.cache.myParents = {};
    for (const p of pais) state.cache.myParents[p.id] = { titulo: (p.fields || {})['System.Title'], tipo: (p.fields || {})['System.WorkItemType'] };
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
    // quem é o dono do PAT: uma vez só, pra o filtro global abrir nele
    if (!state.cache.usuario) {
      try { state.cache.usuario = await A.currentUser(ctx()); }
      catch (e) { /* sem isso o filtro só começa em "todos" — não é motivo pra falhar */ }
    }
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
function renderAll() { renderBadge(); renderPanorama(); renderPendencias(); renderMyItems(); renderGrid(); }

// Contadores das linhas de navegação (eco do "Applicants 23" da referência)
function renderNavContas() {
  const mi = state.cache.myItems;
  $('conta-nav-mi').textContent = mi ? String(mi.length) : '';
  $('conta-nav-proj').textContent = state.config ? String(state.config.projects.filter((x) => !x.hidden).length) : '';
}

function renderBadge() {
  const rotulos = { 'sem-token': 'sem token', vencido: 'token vencido', atualizando: 'atualizando…', conectado: 'conectado' };
  const auth = state.auth || (state.pat ? 'conectado' : 'sem-token');
  const badge = $('badge');
  badge.textContent = rotulos[auth] || auth;
  badge.dataset.estado = auth;
  $('carimbo').textContent = C.timeAgoLabel(state.cache.lastSuccessAt || 0, Date.now());
}

/* ---------- Visões que olham todos os times ---------- */
// O cache guarda os itens por cartão; Panorama e Pendências precisam do
// conjunto. Anota projeto e time em cada item — o cache não guarda de quem é.
function itensDeTodosOsTimes() {
  const visiveis = state.config.projects.filter((x) => !x.hidden);
  const todos = [];
  const erros = [];
  let temCache = false;
  for (const pr of visiveis) {
    const e = state.cache.byCard[cardKey(pr)] || {};
    if (e.items) temCache = true;
    if (e.error) erros.push(e.error);
    for (const it of e.items || []) todos.push(Object.assign({ projeto: pr.projectName, time: pr.teamName }, it));
  }
  return {
    visiveis, todos, temCache,
    erroHtml: erros.length ? `<p class="erro">${escapeHtml(erros[0])}</p>` : '',
  };
}

function semDados(oQue) {
  return state.pat ? '<p class="mudo">carregando…</p>' : `<p class="mudo">— configure o token pra ver ${oQue} —</p>`;
}

function dataCurta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

/* ---------- Panorama ---------- */
// Tudo aqui é derivado dos itens que os cartões já buscaram — nenhuma chamada
// própria à API. Junta os times num só conjunto e conta.
function renderPanorama() {
  const box = $('panorama');
  if (!box || !state.config) return;
  const { visiveis, todos: brutos, temCache, erroHtml } = itensDeTodosOsTimes();
  if (!temCache) { box.innerHTML = erroHtml + semDados('o panorama'); return; }
  const todos = brutos.filter(noNome);

  const agora = Date.now();
  const k = C.panoramaKpis(todos, agora);
  const meus = state.cache.myItems ? state.cache.myItems.length : null;
  const NOTA_SEM_DATA = 'data-alvo não preenchida no DevOps';
  const tile = (rot, valor, alerta, nota) => `<div class="tile">
    <span class="tile-rot">${rot}</span>
    <b class="tile-num${alerta ? ' alerta' : ''}">${valor}</b>
    ${nota ? `<span class="tile-nota">${nota}</span>` : ''}
  </div>`;
  // Sem data-alvo, prazo e atraso mostram traço: zero afirmaria "não há atraso".
  const tiles = [
    tile('Bloqueados', k.bloqueados, k.bloqueados > 0),
    k.semDatas ? tile('Fecham este mês', '—', false, NOTA_SEM_DATA) : tile('Fecham este mês', k.fechamMes, false),
    k.semDatas ? tile('Atrasados', '—', false, NOTA_SEM_DATA) : tile('Atrasados', k.atrasados, k.atrasados > 0),
    tile('Parados 14d+', k.parados, false),
    tile('Meus itens', meus == null ? '—' : meus, false),
  ].join('');

  // Só a Squad Ecommerce roda em sprint de verdade; os outros times
  // configurados caem num "sprint" fantasma (a iteração anual do DevOps),
  // que não representa nada em curso — some daqui.
  const CAP_PBIS_SPRINT = 4;
  const sprints = visiveis.filter((pr) => pr.teamName === 'Squad Ecommerce').map((pr) => {
    const e = state.cache.byCard[cardKey(pr)] || {};
    if (!e.sprint) return '';
    const prog = e.progress || { done: 0, total: 0 };
    const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
    // Prévia sem detalhe: só o título, pra reconhecer o que falta fazer sem
    // precisar abrir o board. Filtra por quem está selecionado no dropdown
    // de responsável do topo — a barra de progresso continua sendo da
    // sprint inteira, de propósito (é indicador de time, não de pessoa).
    const respSprint = respAtivo();
    const pbis = (e.itensSprintAbertos || []).filter((it) => !respSprint || it.resp === respSprint);
    const link = C.deepLinks(state.config.org, pr.projectName, '');
    const listaPbis = pbis.length ? `<ul class="sprint-pbis">${pbis.slice(0, CAP_PBIS_SPRINT).map((it) =>
      `<li><a href="${link.workItem(it.id)}" target="_blank" rel="noopener" title="${escapeHtml(it.titulo)}">${escapeHtml(it.titulo)}</a></li>`
    ).join('')}${pbis.length > CAP_PBIS_SPRINT ? `<li class="sprint-pbis-mais">+${pbis.length - CAP_PBIS_SPRINT} mais</li>` : ''}</ul>` : '';
    return `<div class="sprint-card">
      <a class="sprint-card-link" href="${rotaBoard(pr, true)}" title="Ver a sprint no board">
        <span class="sprint-linha"><span class="sprint-nome"><b>${escapeHtml(e.sprint.name)}</b> <span class="mudo">${escapeHtml(pr.teamName)}</span></span><span class="sprint-prog">${prog.done}/${prog.total} <span class="seta">→</span></span></span>
        <span class="barra"><span class="barra-cheia" style="width:${pct}%"></span></span>
      </a>
      ${listaPbis}
    </div>`;
  }).filter(Boolean).join('');

  const todaAtencao = C.itensAtencao(todos, agora, 9999);
  const atencao = todaAtencao.slice(0, 6);
  const verTodas = todaAtencao.length > atencao.length
    ? `<a class="ver-todas" href="#pendencias">ver todas (${todaAtencao.length}) →</a>`
    : '';
  const listaAtencao = atencao.length
    ? `<ul class="pan-atencao">${atencao.map(({ item, motivo }) => {
        const f = item.fields || {};
        const slug = C.typeSlug(f['System.WorkItemType']);
        const link = C.deepLinks(state.config.org, item.projeto, '').workItem(item.id);
        const titulo = f['System.Title'] || ('item #' + item.id); // cache antigo não guardava título
        return `<li><a class="item" href="${link}" target="_blank" rel="noopener">
          <span class="cabeca"><span class="titulo">${escapeHtml(titulo)}</span><span class="id">#${item.id}</span></span>
          <span class="selos"><span class="badge-tipo tipo-${slug}">${ROTULO_TIPO_CURTO[slug]}</span><span class="badge-tipo selo-alerta">${motivo}</span></span>
          <span class="linha"><span class="rot">Estado</span><span class="val">${escapeHtml(f['System.State'])}</span></span>
        </a></li>`;
      }).join('')}</ul>`
    : '<p class="mudo">Nada bloqueado nem atrasado.</p>';

  box.innerHTML = erroHtml + `<div class="blocos">
    <section class="bloco"><h3>Agora</h3><div class="tiles">${tiles}</div></section>
    ${sprints ? `<section class="bloco"><h3>Sprints em curso</h3><div class="sprints">${sprints}</div></section>` : ''}
    <section class="bloco"><h3>Por nível</h3>${htmlNiveis(C.aggregateCounts(todos))}</section>
    <section class="bloco"><h3>Atenção agora${verTodas}</h3>${listaAtencao}</section>
  </div>`;
}

/* ---------- Produtos ---------- */
// Única página com consulta própria: progresso por filhos exige o histórico
// inteiro, sem o corte de 30 dias do wiqlCounts. Por isso carrega SOB DEMANDA
// (só ao abrir a página), como o board dedicado — o refresh geral não paga por
// ela. Estado em memória, não no localStorage: são centenas de itens que só
// servem a esta tela.
// Base completa, sob demanda: uma consulta serve Produtos, Report E Futuro. Guarda os
// itens crus além dos épicos rolados — o Report precisa de todos, e buscar duas
// vezes a mesma coisa seria desperdício.
const baseState = { porTime: null, carregando: false, erro: null, fetchedAt: 0 };

async function carregarBase(forcar) {
  if (!state.config || baseState.carregando) return;
  if (!state.pat) { renderProdutos(); renderFuturo(); return; }
  if (!forcar && baseState.porTime && !C.isStale(baseState.fetchedAt, Date.now())) return;
  baseState.carregando = true;
  baseState.erro = null;
  renderProdutos();
  renderFuturo();
  try {
    const porTime = [];
    for (const p of state.config.projects.filter((x) => !x.hidden)) {
      let areas = [];
      try { areas = await A.teamAreas(ctx(), p.projectName, p.teamName); } catch (e) { /* segue projeto inteiro */ }
      const ids = await A.runWiql(ctx(), p.projectName, p.teamName, C.wiqlProdutos(areas));
      const crus = ids.length ? await A.getFields(ctx(), ids, FIELDS_BASE) : [];
      // anota o projeto: o Report junta os times e ainda precisa montar o link
      const items = crus.map((it) => Object.assign({ projeto: p.projectName, time: p.teamName }, it));
      porTime.push({ p, items, produtos: C.produtos(items) });
    }
    baseState.porTime = porTime;
    baseState.fetchedAt = Date.now();
  } catch (e) {
    if (e instanceof A.AuthError) state.auth = 'vencido';
    baseState.erro = mensagemDeErro(e);
  } finally {
    baseState.carregando = false;
    renderProdutos();
    renderFuturo();
    renderBadge();
  }
}

// "1 de jul. – 30 de set.", ou o que houver. Sem nenhuma data, diz que não há.
function janela(inicio, fim) {
  const i = dataCurta(inicio);
  const f = dataCurta(fim);
  if (i && f) return i + ' – ' + f;
  if (f) return 'até ' + f;
  if (i) return 'desde ' + i;
  return 'sem janela';
}

function renderProdutos() {
  const box = $('produtos');
  if (!box || !state.config) return;
  if (!state.pat) { box.innerHTML = semDados('os produtos'); return; }
  const erroHtml = baseState.erro ? `<p class="erro">${escapeHtml(baseState.erro)}</p>` : '';
  if (!baseState.porTime) {
    box.innerHTML = erroHtml + (baseState.erro ? '' : '<p class="mudo">carregando produtos…</p>');
    return;
  }
  const multi = baseState.porTime.length > 1;
  const blocos = baseState.porTime.map(({ p, produtos: todosProdutos }) => {
    // filtra pelo dono do ÉPICO; o roll-up já foi feito com a árvore inteira,
    // senão o progresso viraria "1/1" ao esconder filhos de outras pessoas
    const produtos = todosProdutos.filter((reg) => noNome(reg.item));
    const corpo = produtos.length
      ? `<div class="grid-produtos">${produtos.map((reg) => htmlProduto(reg, p)).join('')}</div>`
      : '<p class="mudo">Nenhum épico neste time.</p>';
    return multi
      ? `<section class="bloco"><h3>${escapeHtml(p.teamName)}<span class="conta">${produtos.length}</span></h3>${corpo}</section>`
      : corpo;
  }).join('');
  box.innerHTML = erroHtml + (multi ? `<div class="blocos">${blocos}</div>` : blocos);
}

function htmlProduto(reg, p) {
  const f = reg.item.fields || {};
  const link = C.deepLinks(state.config.org, p.projectName, '').workItem(reg.item.id);
  const resp = f['System.AssignedTo'] && f['System.AssignedTo'].displayName;
  const { total, feitos } = reg.filhos;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const bloqueado = C.stateBucket(f['System.State']) === 'atencao';
  return `<article class="card produto">
    <h3><a href="${link}" target="_blank" rel="noopener">${escapeHtml(f['System.Title'] || ('item #' + reg.item.id))}</a> <span class="id">#${reg.item.id}</span></h3>
    <div class="selos">
      <span class="badge-tipo tipo-epic">Épico</span>
      <span class="badge-tipo${bloqueado ? ' selo-alerta' : ''}">${escapeHtml(f['System.State'])}</span>
    </div>
    <div class="linha"><span class="rot">Janela</span><span class="val">${janela(f['Microsoft.VSTS.Scheduling.StartDate'], f['Microsoft.VSTS.Scheduling.TargetDate'])}</span></div>
    <div class="linha"><span class="rot">Responsável</span><span class="val">${resp ? escapeHtml(resp) : 'sem responsável'}</span></div>
    <div class="progresso">
      <span class="sprint-linha"><span class="sprint-nome">${total ? 'Entregue' : 'Sem filhos'}</span><span class="sprint-prog">${total ? feitos + '/' + total : '—'}</span></span>
      <span class="barra"><span class="barra-cheia" style="width:${pct}%"></span></span>
    </div>
  </article>`;
}

/* ---------- Futuro ---------- */
// Vocabulário do Radar de propósito (a página lá se chama Futuro, com as faixas
// Agora / A seguir / Depois): é o modelo mental que o Urlan já tem. A faixa
// sai do que já está em movimento (C.futuroPorAtividade), não de StartDate —
// nem todo épico tem essa data preenchida.
const FAIXAS_FUTURO = {
  agora: { rotulo: 'Agora', legenda: 'Em andamento ou já entregando' },
  seguir: { rotulo: 'A seguir', legenda: 'Backlog pronto, ninguém começou' },
  depois: { rotulo: 'Depois', legenda: 'Ainda não foi detalhado' },
};

function renderFuturo() {
  const box = $('futuro');
  if (!box || !state.config) return;
  if (!state.pat) { box.innerHTML = semDados('o futuro'); return; }
  const erroHtml = baseState.erro ? `<p class="erro">${escapeHtml(baseState.erro)}</p>` : '';
  if (!baseState.porTime) {
    box.innerHTML = erroHtml + (baseState.erro ? '' : '<p class="mudo">carregando projetos…</p>');
    return;
  }
  // A árvore inteira (sem filtro) vai pro classificador — a atividade de um
  // PBI conta pro épico mesmo quando o PBI está no nome de outra pessoa. O
  // filtro por responsável entra só depois, na lista de épicos de cada faixa.
  const todos = baseState.porTime.flatMap(({ items }) => items);
  const faixas = C.futuroPorAtividade(todos).map((f) => ({ ...f, itens: f.itens.filter(noNome) }));
  const blocos = faixas.map((f) => {
    const def = FAIXAS_FUTURO[f.faixa];
    const linhas = f.itens.map((it) => {
      const fl = it.fields || {};
      const link = C.deepLinks(state.config.org, it.projeto, '').workItem(it.id);
      return `<li><a class="item-linha" href="${link}" target="_blank" rel="noopener">
        <span class="badge-tipo tipo-epic">Épico</span>
        <span class="titulo">${escapeHtml(fl['System.Title'] || ('item #' + it.id))}</span>
        <span class="quando">${janela(fl['Microsoft.VSTS.Scheduling.StartDate'], fl['Microsoft.VSTS.Scheduling.TargetDate'])}</span>
        <span class="id">#${it.id}</span>
      </a></li>`;
    }).join('');
    return `<section class="bloco">
      <h3>${def.rotulo}<span class="faixa-ate">${def.legenda}</span><span class="conta">${f.itens.length}</span></h3>
      ${f.itens.length ? `<ul class="lista-linhas">${linhas}</ul>` : '<p class="mudo faixa-vazia">Nenhum épico aqui agora.</p>'}
    </section>`;
  }).join('');
  box.innerHTML = erroHtml + `<div class="blocos">${blocos}</div>`;
}

/* ---------- Pendências ---------- */
// Três colunas por motivo, exclusivas (ver C.pendencias). O Panorama dá o
// número e um vislumbre; aqui é a lista de trabalho inteira, com quem destrava.
const ROTULO_PEND = { bloqueados: 'Bloqueados', atrasados: 'Atrasados', parados: 'Parados' };
// Rampa de gravidade — vermelho, âmbar, cinza. É a única cor âmbar do projeto e
// existe pra separar "travado" de "esquecido" sem usar duas vezes o vermelho.
const COR_PEND = { bloqueados: '#ef4444', atrasados: '#f59e0b', parados: '#a1a1aa' };

function renderPendencias() {
  const box = $('pendencias');
  if (!box || !state.config) return;
  const { todos: brutos, temCache, erroHtml } = itensDeTodosOsTimes();
  if (!temCache) { box.innerHTML = erroHtml + semDados('as pendências'); return; }
  const todos = brutos.filter(noNome);
  const grupos = C.pendencias(todos, Date.now());
  const total = grupos.bloqueados.length + grupos.atrasados.length + grupos.parados.length;
  if (!total) {
    box.innerHTML = erroHtml + '<p class="mudo">Nada bloqueado, atrasado ou parado. Nenhuma pendência agora.</p>';
    return;
  }
  const colunas = ['bloqueados', 'atrasados', 'parados'].map((chave) => {
    const lista = grupos[chave];
    const cartoes = lista.map((reg) => htmlPendencia(reg)).join('');
    return `<section class="coluna${chave === 'bloqueados' && lista.length ? ' atencao' : ''}">
      <header><h4><span class="ponto" style="background:${COR_PEND[chave]}"></span>${ROTULO_PEND[chave]}</h4><span class="conta">${lista.length}</span></header>
      ${lista.length ? `<ul>${cartoes}</ul>` : '<p class="coluna-vazia mudo">nada aqui</p>'}
    </section>`;
  }).join('');
  box.innerHTML = erroHtml + `<div class="quadro quadro-etapas">${colunas}</div>`;
}

function htmlPendencia(reg) {
  const it = reg.item;
  const f = it.fields || {};
  const slug = C.typeSlug(f['System.WorkItemType']);
  const link = C.deepLinks(state.config.org, it.projeto, '').workItem(it.id);
  const titulo = f['System.Title'] || ('item #' + it.id); // cache antigo não guardava título
  const resp = f['System.AssignedTo'] && f['System.AssignedTo'].displayName;
  // A linha do motivo só entra quando diz algo que o estado não diz.
  const linhaMotivo = reg.motivo === 'atrasado' || reg.tambem.includes('atrasado')
    ? `<span class="linha"><span class="rot">Prazo</span><span class="val val-alerta">venceu ${dataCurta(reg.alvo)}</span></span>`
    : '';
  const linhaParado = reg.motivo === 'parado' || reg.tambem.includes('parado')
    ? `<span class="linha"><span class="rot">Sem toque</span><span class="val">há ${reg.dias} d</span></span>`
    : '';
  // Uma marca só, com os motivos juntos: duas etiquetas quebravam linha na coluna
  const secundarias = reg.tambem.length ? `<span class="badge-tipo">também ${reg.tambem.join(' · ')}</span>` : '';
  return `<li><a class="item" href="${link}" target="_blank" rel="noopener" title="${escapeHtml(f['System.WorkItemType'])}">
    <span class="cabeca"><span class="titulo">${escapeHtml(titulo)}</span><span class="id">#${it.id}</span></span>
    <span class="selos"><span class="badge-tipo tipo-${slug}">${ROTULO_TIPO_CURTO[slug]}</span>${secundarias}</span>
    <span class="linha"><span class="rot">Estado</span><span class="val">${escapeHtml(f['System.State'])}</span></span>
    <span class="linha"><span class="rot">Responsável</span><span class="val">${resp ? escapeHtml(resp) : 'sem responsável'}</span></span>
    ${linhaMotivo}${linhaParado}
  </a></li>`;
}

function renderGrid() {
  const grid = $('grid');
  grid.innerHTML = '';
  const resp = respAtivo();
  const visiveis = state.config.projects.filter((x) => !x.hidden);
  const comItens = visiveis.filter((p) => !resp || cardTemResp(p, resp));
  if (resp && !comItens.length) {
    grid.innerHTML = '<p class="mudo">Nenhum projeto com itens no nome de ' + escapeHtml(resp) + '.</p>';
  } else {
    for (const p of comItens) grid.appendChild(buildCard(p));
  }
  renderFiltroGlobal();
  renderNavContas();
}

// Só esconde um card quando já sabemos que o PO não tem nada ali — sem
// dado carregado ainda (ex.: primeira busca), o card fica pra não sumir
// e voltar sozinho assim que a resposta chegar.
function cardTemResp(p, resp) {
  const entry = state.cache.byCard[cardKey(p)];
  if (!entry || !entry.items) return true;
  return entry.items.some((it) => {
    const at = (it.fields || {})['System.AssignedTo'];
    return at && at.displayName === resp;
  });
}

// Seletor de responsável dos cartões — opções vêm dos itens em cache de todos os times
function renderFiltroGlobal() {
  const barra = $('filtro-global');
  const sel = $('resp-global');
  const todos = Object.values(state.cache.byCard).flatMap((e) => (e && e.items) || []);
  if (!todos.length && !respAtivo()) { barra.hidden = true; return; }
  barra.hidden = false;
  const nomes = new Set(todos
    .map((it) => (it.fields || {})['System.AssignedTo'])
    .filter((r) => r && r.displayName)
    .map((r) => r.displayName));
  if (respAtivo()) nomes.add(respAtivo()); // seleção sobrevive mesmo sem itens no momento
  if (state.cache.usuario) nomes.add(state.cache.usuario);
  const lista = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  sel.innerHTML = '<option value="">todos os responsáveis</option>' +
    lista.map((n) => `<option value="${escapeHtml(n)}"${n === respAtivo() ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('');
}

function buildCard(p) {
  const links = C.deepLinks(state.config.org, p.projectName, p.teamName);
  const card = document.createElement('article');
  card.className = 'card';
  card.id = 'card-' + cssId(cardKey(p));
  card.innerHTML = `
    <h3>${escapeHtml(p.teamName)}</h3>
    <div class="vivo"></div>
    <nav class="atalhos">
      <a href="${links.board}" target="_blank" rel="noopener">Board</a>
      <a href="${links.backlog}" target="_blank" rel="noopener">Backlog</a>
      <a href="${links.sprints}" target="_blank" rel="noopener">Sprints</a>
      <a href="${links.queries}" target="_blank" rel="noopener">Queries</a>
      <a href="${links.dashboards}" target="_blank" rel="noopener">Dashboards</a>
    </nav>`;
  fillCardLive(card, p);
  return card;
}

function renderCard(p) {
  const card = document.getElementById('card-' + cssId(cardKey(p)));
  if (card) fillCardLive(card, p);
  renderFiltroGlobal(); // itens novos podem trazer responsáveis novos pro seletor
  renderPanorama(); // os números do panorama saem destes mesmos itens
  renderPendencias();
  // O card deste time pode entrar/sumir do grid agora que os itens chegaram
  // (o filtro de PO precisa saber se ele tem algo no nome de quem tá selecionado).
  if (document.body.dataset.pagina === 'projetos') renderGrid();
}

// Células por nível (Épicos/Features/PBIs) — usadas no cartão de projeto e no
// Panorama. Mesma anatomia nos dois lugares de propósito: é a mesma leitura.
function htmlNiveis(counts) {
  const celulas = [['epic', 'Épicos'], ['feature', 'Features'], ['pbi', 'PBIs']].map(([nivel, rotulo]) => {
    const b = C.bucketCounts(counts[nivel]);
    const quebra = [];
    if (b.todo) quebra.push(`<li>${b.todo} a fazer</li>`);
    if (b.andamento) quebra.push(`<li>${b.andamento} em andamento</li>`);
    if (b.feito) quebra.push(`<li>${b.feito} concluído${b.feito > 1 ? 's' : ''} (30d)</li>`);
    if (b.atencao) quebra.push(`<li class="bloq-linha">${b.atencao} bloqueado${b.atencao > 1 ? 's' : ''}</li>`);
    if (!b.total) quebra.push('<li>nenhum</li>');
    return `<div class="nivel${b.total ? '' : ' vazio'}">
      <span class="nivel-rot">${rotulo}</span>
      <b class="nivel-total">${b.total}</b>
      <ul class="nivel-quebra">${quebra.join('')}</ul>
    </div>`;
  });
  return `<div class="niveis">${celulas.join('')}</div>`;
}

function fillCardLive(card, p) {
  const box = card.querySelector('.vivo');
  const entry = state.cache.byCard[cardKey(p)];
  if (!entry) {
    box.innerHTML = state.pat ? '<p class="mudo">carregando…</p>' : '<p class="mudo">— sem token: só atalhos —</p>';
    return;
  }
  // Contagem na hora, já com o recorte de responsável; cache legado (só counts) fica sem recorte.
  const counts = entry.items
    ? C.aggregateCounts(C.filterItems(entry.items, { resp: respAtivo() }))
    : entry.counts;
  if (!counts) { box.innerHTML = `<p class="erro">${escapeHtml(entry.error || 'sem dados')}</p>`; return; }
  const partes = [];
  if (entry.error) partes.push(`<p class="erro">${escapeHtml(entry.error)}</p>`);
  partes.push(htmlNiveis(counts));
  if (entry.sprint) {
    const prog = entry.progress || { done: 0, total: 0 };
    const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
    partes.push(`<a class="sprint-link" href="${rotaBoard(p, true)}" title="Ver a sprint no board">
      <span class="sprint-linha"><span class="sprint-nome"><b>${escapeHtml(entry.sprint.name)}</b> <span class="mudo">${periodo(entry.sprint.start, entry.sprint.finish)}</span></span><span class="sprint-prog">${prog.done}/${prog.total} <span class="seta">→</span></span></span>
      <span class="barra"><span class="barra-cheia" style="width:${pct}%"></span></span>
    </a>`);
  } else {
    // Sem sprint a faixa continua sendo a única porta pro board interno — sem filtro.
    // O trilho vazio mantém a mesma altura da faixa com barra (cartões vizinhos alinham).
    partes.push(`<a class="sprint-link" href="${rotaBoard(p, false)}" title="Abrir o board">
      <span class="sprint-linha"><span class="sprint-nome"><b>Board</b> <span class="mudo">sem sprint corrente</span></span><span class="sprint-prog"><span class="seta">→</span></span></span>
      <span class="barra"></span>
    </a>`);
  }
  box.innerHTML = partes.join('');
}

function rotaBoard(p, comSprint) {
  return `#board/${encodeURIComponent(p.projectName)}/${encodeURIComponent(p.teamName)}${comSprint ? '/sprint' : ''}`;
}

function renderMyItems() {
  renderNavContas();
  renderPanorama(); // o indicador "Meus itens" vive lá
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
  const filtrados = C.filterItems(items, Object.assign({}, state.filtrosMI, { resp: respAtivo() }));
  if (!filtrados.length) {
    // A consulta desta página é @Me: só traz item do dono do token. Se o filtro
    // global aponta pra outra pessoa, vazio é o resultado certo — mas tem que
    // dizer por quê, senão parece defeito.
    const dono = state.cache.usuario || '';
    const outro = respAtivo() && dono && respAtivo() !== dono;
    box.innerHTML = erroHtml + (outro
      ? `<p class="mudo">Esta página traz só o que está no nome de <b>${escapeHtml(dono)}</b> (dono do token). O filtro está em <b>${escapeHtml(respAtivo())}</b>.</p>`
      : '<p class="mudo">Nada com esses filtros.</p>');
    return;
  }
  const grupos = C.groupMyItemsBuckets(filtrados);
  // Tag de projeto só quando há mais de um projeto entre os itens — senão é ruído.
  const multiProjeto = new Set(items.map((it) => (it.fields || {})['System.TeamProject'])).size > 1;
  const ROTULO_ETAPA = { todo: 'A fazer', andamento: 'Em andamento', atencao: 'Atenção' };
  box.innerHTML = erroHtml + '<div class="quadro quadro-etapas">' + grupos.map((g) => {
    const cartoes = g.items.map((it) => {
      const f = it.fields || {};
      const slug = C.typeSlug(f['System.WorkItemType']);
      const link = C.deepLinks(state.config.org, f['System.TeamProject'], '').workItem(it.id);
      const pai = (state.cache.myParents || {})[f['System.Parent']];
      const linhaPai = pai ? `<span class="linha"><span class="rot">Pai</span><span class="val" title="${escapeHtml((pai.tipo ? pai.tipo + ' · ' : '') + pai.titulo)}">${escapeHtml(pai.titulo || '')}</span></span>` : '';
      const linhaProjeto = multiProjeto ? `<span class="linha"><span class="rot">Projeto</span><span class="val">${escapeHtml(f['System.TeamProject'])}</span></span>` : '';
      return `<li><a class="item" href="${link}" target="_blank" rel="noopener" title="${escapeHtml(f['System.WorkItemType'])}">
        <span class="cabeca"><span class="titulo">${escapeHtml(f['System.Title'])}</span><span class="id">#${it.id}</span></span>
        <span class="selos"><span class="badge-tipo tipo-${slug}">${ROTULO_TIPO_CURTO[slug]}</span><span class="badge-tipo">${escapeHtml(C.iterationLabel(f['System.IterationPath']))}</span></span>
        ${linhaPai}
        <span class="linha"><span class="rot">Estado</span><span class="val">${escapeHtml(f['System.State'])}</span></span>
        ${linhaProjeto}
      </a></li>`;
    }).join('');
    return `
    <section class="coluna${g.bucket === 'atencao' && g.items.length ? ' atencao' : ''}">
      <header><h4><span class="ponto" style="background:${corColunaPorBucket(g.bucket)}"></span>${ROTULO_ETAPA[g.bucket]}</h4><span class="conta">${g.items.length}</span></header>
      ${g.items.length ? `<ul>${cartoes}</ul>` : '<p class="coluna-vazia mudo">nada aqui</p>'}
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
  const hash = location.hash || '';
  const m = hash.match(/^#board\/([^/]+)\/([^/]+)(\/sprint)?$/);
  if (m && state.config) {
    const projectName = decodeURIComponent(m[1]);
    const teamName = decodeURIComponent(m[2]);
    const p = state.config.projects.find((x) => x.projectName === projectName && x.teamName === teamName);
    if (p) { abrirBoard(p, !!m[3]); setPagina('board'); return; }
  }
  fecharBoard();
  if (hash === '#pendencias') { setPagina('pendencias'); return; }
  if (hash === '#produtos') { setPagina('produtos'); carregarBase(false); return; }
  if (hash === '#futuro') { setPagina('futuro'); carregarBase(false); return; }
  if (hash === '#projetos') { setPagina('projetos'); return; }
  if (hash === '#meus-itens') { setPagina('meus-itens'); return; }
  setPagina('panorama'); // abertura: visão geral antes do detalhe
}

function setPagina(pagina) {
  document.body.dataset.pagina = pagina;
  $('nav-panorama').classList.toggle('ativa', pagina === 'panorama');
  $('nav-pendencias').classList.toggle('ativa', pagina === 'pendencias');
  $('nav-produtos').classList.toggle('ativa', pagina === 'produtos');
  $('nav-futuro').classList.toggle('ativa', pagina === 'futuro');
  $('nav-meus-itens').classList.toggle('ativa', pagina === 'meus-itens');
  $('nav-projetos').classList.toggle('ativa', pagina === 'projetos' || pagina === 'board');
}

function abrirBoard(p, comSprint) {
  boardState.p = p;
  if (comSprint) boardState.soSprint = true;
  $('board-view').hidden = false;
  carregarBoard(p, false);
}

function fecharBoard() {
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
  boardState.filtro = { tipos: null, busca: '' };
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
  let items = todos;
  if (boardState.soSprint && boardState.sprint) items = items.filter((it) => C.inSprint(it, boardState.sprint.path));
  items = C.filterItems(items, Object.assign({}, boardState.filtro, { resp: respAtivo() }));
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
    const temFiltro = boardState.filtro.busca || respAtivo() || boardState.filtro.tipos;
    st.textContent = temFiltro ? 'nada com esses filtros' : (boardState.soSprint ? 'nada na sprint corrente' : 'board vazio');
    st.hidden = false;
    cols.innerHTML = '';
    return;
  }
  st.hidden = true;
  const tipoOficial = new Map((boardState.columns || []).map((c) => [c.name, String(c.type || '').toLowerCase()]));
  cols.innerHTML = nomes.map((nome) => {
    const lista = porColuna.get(nome) || [];
    const atencao = C.isAttentionState(nome) || lista.some((it) => C.isAttentionState((it.fields || {})['System.State']));
    // Bucket da coluna: tipo oficial do board quando existe; senão, pelos estados dos itens
    let bucket = 'andamento';
    if (atencao) bucket = 'atencao';
    else if (tipoOficial.get(nome) === 'outgoing') bucket = 'feito';
    else if (lista.length && lista.every((it) => C.isTerminalState((it.fields || {})['System.State']))) bucket = 'feito';
    return `<section class="coluna${bucket === 'atencao' ? ' atencao' : ''}">
      <header><h4><span class="ponto" style="background:${corColunaPorBucket(bucket)}"></span>${escapeHtml(nome)}</h4><span class="conta">${lista.length}</span></header>
      <ul>${lista.map((it) => {
        const f = it.fields || {};
        const slug = C.typeSlug(f['System.WorkItemType']);
        const resp = f['System.AssignedTo'] && f['System.AssignedTo'].displayName ? f['System.AssignedTo'].displayName : '';
        const link = C.deepLinks(state.config.org, p.projectName, '').workItem(it.id);
        const dica = escapeHtml(f['System.WorkItemType']) + (resp ? ' · ' + escapeHtml(resp) : '');
        return `<li><a class="item" href="${link}" target="_blank" rel="noopener" title="${dica}">
          <span class="cabeca"><span class="titulo">${escapeHtml(f['System.Title'])}</span>${resp ? `<span class="avatar">${escapeHtml(C.initials(resp))}</span>` : ''}</span>
          <span class="badge-tipo tipo-${slug}">${ROTULO_TIPO_CURTO[slug]}</span>
          <span class="linha"><span class="rot">Item</span><span class="val">#${it.id}</span></span>
        </a></li>`;
      }).join('')}</ul>
    </section>`;
  }).join('');
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

// Import no wizard: restaura config exportada numa origem virgem (Vercel,
// file://, outra máquina). O PAT nunca vai no arquivo — precisa estar colado.
function wizardImport(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const err = $('wizard-erro');
  err.hidden = true;
  const pat = $('wizard-pat').value.trim();
  if (!pat) {
    err.textContent = 'Cole o PAT antes de importar — o token nunca vai no arquivo exportado.';
    err.hidden = false;
    ev.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const config = C.normalizeConfig(JSON.parse(reader.result));
      saveJSON(LS.config, config);
      localStorage.setItem(LS.pat, pat);
      state.config = config;
      state.pat = pat;
      state.auth = null;
      state.cache = { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0, lastSuccessAt: 0 };
      saveJSON(LS.cache, state.cache);
      $('wizard').close();
      boot();
    } catch (e) {
      err.textContent = 'Arquivo inválido: ' + e.message;
      err.hidden = false;
    }
  };
  reader.readAsText(file);
  ev.target.value = '';
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
  $('wizard-importar').addEventListener('change', wizardImport);
  $('wizard-concluir').addEventListener('click', wizardConclude);
  $('atualizar').addEventListener('click', () => {
    refreshAll(true);
    // as duas páginas que leem a base têm cache próprio
    if (['produtos', 'futuro'].includes(document.body.dataset.pagina)) carregarBase(true);
  });
  $('abrir-config').addEventListener('click', openSettings);
  $('board-voltar').addEventListener('click', () => { location.hash = '#projetos'; });
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
  $('resp-global').addEventListener('change', () => {
    state.resp = $('resp-global').value; // '' = todos, escolha explícita
    salvarFiltrosMI();
    renderAll();
    renderProdutos();
    renderFuturo();
    if (boardState.p) renderBoard(boardState.p);
  });
  // Sidebar colapsável — preferência persiste entre visitas
  if ((loadJSON(LS.ui) || {}).lateralRecolhida) document.body.classList.add('lateral-recolhida');
  $('alternar-lateral').addEventListener('click', () => {
    const recolhida = document.body.classList.toggle('lateral-recolhida');
    saveJSON(LS.ui, { lateralRecolhida: recolhida });
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
