/* Central de Projetos — DOM, localStorage e orquestração. */
(function () {
'use strict';
const C = window.CentralCore;
const R = window.CentralRoadmapVisao; // linha do tempo do roadmap, a mesma do relatório
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
  // Transbordo não é defeito nem entrega: é decisão de planejamento. Âmbar, a
  // mesma cor do selo no Panorama — o mesmo fato não pode ter duas cores.
  if (bucket === 'transbordo') return '#d97706';
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
/* Só este time roda sprint de verdade. Os outros caem na iteração anual do
   DevOps, um "sprint" fantasma que não representa nada em curso. Era literal
   solta dentro do renderPanorama; virou constante porque agora a busca das três
   sprints também precisa saber, e duas cópias do nome do time divergem na
   primeira renomeação lá no DevOps. */
const TIME_COM_SPRINT = 'Squad Ecommerce';

function noNome(it) {
  const alvo = respAtivo();
  if (!alvo) return true;
  const r = ((it || {}).fields || {})['System.AssignedTo'];
  return !!r && r.displayName === alvo;
}

function ctx() { return { base: state.config.org, pat: state.pat, fetchImpl: window.fetch.bind(window) }; }
function cardKey(p) { return p.projectName + '::' + p.teamName; }

// PAT vencido cai em UM DOS DOIS ramos, e qual deles depende de como o DevOps
// responde naquele momento: às vezes 401/403 legível (vira AuthError, com a
// frase certa), às vezes 302 pro login — e aí o navegador segue o redirect,
// a página de login não traz Access-Control-Allow-Origin pra esta origem, a
// resposta é cortada antes de virar `res` e não sobra status pra classificar.
// Sem status, o código não tem como distinguir isso de queda de rede.
// Por isso o NetworkError não afirma mais "falha de rede": o PAT dura 90 dias
// no máximo, então token vencido é de longe a causa mais comum e vem primeiro
// na frase. Ambos os caminhos foram reproduzidos no navegador.
function mensagemDeErro(e) {
  if (e instanceof A.AuthError) return 'PAT recusado — confira o token e os escopos (Work Items Read, Project and Team Read).';
  if (e instanceof A.NetworkError) {
    if (location.protocol === 'file:') return 'O navegador bloqueou a chamada (CORS via file://). Sirva a pasta: python3 -m http.server e abra http://localhost:8000';
    return 'PAT vencido ou sem acesso — o DevOps manda pro login e o navegador corta a resposta. Gere um token novo em Configurações. Se ele estiver válido, aí sim confira a conexão e a URL da organização.';
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
  // Sem isto não dá pra separar o que é DA sprint do que só apareceu na
  // hierarquia dela — ver C.itensDaIteracao.
  'System.IterationPath',
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

/* Mora no core.js desde que o relatório de Entregas passou a mostrar o ritmo
   das sprints: as duas telas contam a mesma coisa e precisam contar igual.
   O apelido fica porque é o nome por que as quatro chamadas daqui o conhecem. */
const resumoDeSprint = C.resumoDeSprint;

/* O QUE SAIU DA SPRINT DEPOIS QUE ELA FECHOU.

   Só pra coluna "Anterior": na corrente a pergunta não existe (a sprint não
   fechou) e na próxima também não (não começou).

   `finish` do DevOps vem como data sem hora útil — a sprint vale até o fim
   daquele dia, então a pergunta é pelo último instante dele. Perguntar pela
   meia-noite devolveria a véspera e perderia o que foi mexido no último dia.

   Falhar aqui NÃO pode derrubar a coluna: sem o transbordo ela volta a ser o
   que era até hoje — a sprint como está agora —, que é informação correta,
   só menos completa. Mas avisa, senão "não houve transbordo" e "o ASOF não
   funciona nesta organização" ficam idênticos na tela. */
const FIM_DO_DIA = C.FIM_DO_DIA; // 23:59:59 em ms, somado à data de `finish`

async function buscarTransbordo(p, sp, areas) {
  const fim = sp && sp.finish ? Date.parse(sp.finish) : NaN;
  if (Number.isNaN(fim)) return [];
  /* As duas pontas saem do MESMO construtor, variando só o instante — é o que
     garante que a diferença entre elas seja transbordo, e não desencontro de
     definição. Comparar contra a lista da API da iteração dava 141 de um lado
     e 147 do outro, e itens que nunca saíram apareciam como se tivessem. */
  const qAgora = C.wiqlIteracao(sp.path, areas);
  const qNoFim = C.wiqlIteracao(sp.path, areas, fim + FIM_DO_DIA);
  if (!qAgora || !qNoFim) return [];
  try {
    const [agora, noFim] = await Promise.all([
      A.runWiql(ctx(), p.projectName, p.teamName, qAgora),
      A.runWiql(ctx(), p.projectName, p.teamName, qNoFim),
    ]);
    const sairam = C.transbordados(noFim, agora.map((id) => ({ id })));
    if (!sairam.length) return [];
    const extras = await A.getFields(ctx(), sairam, FIELDS_COUNTS);
    /* Casa por id, não por índice: `resumoDeSprint` tira as Tasks, então as
       duas listas têm tamanhos diferentes e parear pela posição penduraria o
       destino errado em cada item — um erro que a tela mostraria com cara de
       certo. */
    const destinoDe = new Map(extras.map((it) => [
      it.id, C.iterationLabel((it.fields || {})['System.IterationPath']),
    ]));
    return resumoDeSprint(extras).map((x) => Object.assign({}, x, {
      transbordou: true,
      destino: destinoDe.get(x.id) || '',
    }));
  } catch (e) {
    console.warn('[Central] não deu pra saber o que transbordou da ' + (sp && sp.name)
      + ' — a coluna mostra a sprint como ela está hoje, sem os que saíram.'
      + ' Motivo: ' + mensagemDeErro(e));
    return [];
  }
}

/* Os que saíram DESTA sprint, pro board dela.

   Mesma conta do Panorama, outro recorte de campos: o board mostra coluna,
   responsável e estado, e o cartão dele lê FIELDS_BOARD.

   Só pra sprint já encerrada: na corrente ninguém transbordou ainda, e
   perguntar ali gastaria duas consultas pra devolver lista vazia sempre. */
async function buscarTransbordoDoBoard(p, sp, areas) {
  const fim = sp && sp.finish ? Date.parse(sp.finish) : NaN;
  if (Number.isNaN(fim) || fim > Date.now()) return [];
  const qAgora = C.wiqlIteracao(sp.path, areas);
  const qNoFim = C.wiqlIteracao(sp.path, areas, fim + FIM_DO_DIA);
  if (!qAgora || !qNoFim) return [];
  try {
    const [agora, noFim] = await Promise.all([
      A.runWiql(ctx(), p.projectName, p.teamName, qAgora),
      A.runWiql(ctx(), p.projectName, p.teamName, qNoFim),
    ]);
    const sairam = C.transbordados(noFim, agora.map((id) => ({ id })));
    if (!sairam.length) return [];
    const extras = await A.getFields(ctx(), sairam, FIELDS_BOARD);
    /* `transbordou` mora FORA de `fields`: ali só entra o que veio do DevOps.
       Misturar marca própria com campo do servidor é como um filtro passa a
       responder por dado que ninguém escreveu. */
    return extras.map((it) => Object.assign({}, it, { transbordou: true }));
  } catch (e) {
    console.warn('[Central] não deu pra saber o que saiu da ' + (sp && sp.name)
      + ' — o board mostra a sprint como ela está hoje. Motivo: ' + mensagemDeErro(e));
    return [];
  }
}

async function refreshCard(p) {
  const anterior = state.cache.byCard[cardKey(p)] || {};
  const entry = { items: null, counts: null, sprint: null, progress: null, error: null };
  try {
    // Recorte pelas áreas do time — senão times do mesmo projeto contam igual
    let areas = [];
    try { areas = await A.teamAreas(ctx(), p.projectName, p.teamName); } catch (e) {
      /* Sem área, areaClause devolve string vazia e a consulta deixa de ter
         recorte: passa a contar o projeto inteiro. Não é degradação suave — é
         número MAIOR que a realidade, e antes isso acontecia sem nada na tela
         nem no console. */
      console.warn('[Central] não deu pra ler as áreas de ' + p.teamName
          + ' — a consulta passa a valer pro PROJETO INTEIRO, e os números incham com itens de outros times.'
          + ' Motivo: ' + mensagemDeErro(e));
    }
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
    /* Quem roda sprint de verdade recebe a janela inteira — anterior, atual e
       próxima, que o Panorama põe lado a lado. Os outros times continuam com a
       chamada barata de uma iteração só: o card deles no Projetos usa a
       corrente e nada mais, e triplicar requisição pra todo mundo pagaria por
       dado que nenhuma tela mostra. */
    if (p.teamName === TIME_COM_SPRINT) {
      /* O catch aqui era mudo, e isso custou uma rodada de diagnóstico: quando a
         chamada falha, o resultado na tela é IDÊNTICO ao do time que só tem a
         sprint corrente selecionada no DevOps — uma coluna, sem aviso. Duas
         causas opostas, um sintoma. Agora a falha fala, e o número de iterações
         encontradas também: zero vizinhas com a chamada OK é informação sobre o
         DevOps, não sobre o código. */
      let iteracoes = [];
      try {
        iteracoes = await A.teamIterations(ctx(), p.projectName, p.teamName);
      } catch (e) {
        console.warn('[Central] não deu pra listar as iterações de ' + p.teamName
          + ' — o quadro de sprints fica só com a corrente. Motivo: ' + mensagemDeErro(e));
      }
      const janela = C.janelaDeSprints(iteracoes, Date.now());
      if (!janela.anterior && !janela.proxima) {
        console.info('[Central] ' + p.teamName + ': ' + iteracoes.length
          + ' iteração(ões) com data visíveis ao time, e nenhuma antes ou depois da corrente.'
          + ' Se esperava ver as três colunas, confira em Project Settings → Team Configuration'
          + ' → Iterations quais sprints o time tem selecionadas.');
      }
      if (janela.atual || janela.anterior || janela.proxima) {
        entry.janela = {};
        for (const qual of ['anterior', 'atual', 'proxima']) {
          const sp = janela[qual];
          if (!sp) { entry.janela[qual] = null; continue; }
          const ids = await A.sprintItemIds(ctx(), p.projectName, p.teamName, sp.id);
          const brutos = ids.length ? await A.getFields(ctx(), ids, FIELDS_COUNTS) : [];
          const itens = C.itensDaIteracao(brutos, sp.path);
          entry.janela[qual] = {
            sprint: sp,
            progress: C.sprintProgress(itens),
            itens: resumoDeSprint(itens),
            transbordados: qual === 'anterior' ? await buscarTransbordo(p, sp, areas) : [],
          };
        }
        // A corrente segue nos campos antigos: o card do Projetos lê de lá, e
        // mudá-lo não fazia parte do pedido.
        const atual = entry.janela.atual;
        if (atual) {
          entry.sprint = atual.sprint;
          entry.progress = atual.progress;
          entry.itensSprintAbertos = atual.itens.filter((x) => !x.feito);
        }
      }
    }
    const sprint = entry.sprint || await A.currentSprint(ctx(), p.projectName, p.teamName);
    if (sprint && !entry.progress) {
      entry.sprint = sprint;
      const sids = await A.sprintItemIds(ctx(), p.projectName, p.teamName, sprint.id);
      const sbrutos = sids.length ? await A.getFields(ctx(), sids, FIELDS_COUNTS) : [];
      const sitems = C.itensDaIteracao(sbrutos, sprint.path);
      entry.progress = C.sprintProgress(sitems);
      // Prévia do card: o que ainda falta fazer na sprint corrente.
      entry.itensSprintAbertos = resumoDeSprint(sitems).filter((x) => !x.feito);
    }
  } catch (e) {
    entry.items = entry.items || anterior.items || null;
    entry.counts = anterior.counts || null; // legado: cache antigo pré-filtro só tinha counts
    entry.sprint = entry.sprint || anterior.sprint || null;
    entry.progress = entry.progress || anterior.progress || null;
    entry.itensSprintAbertos = entry.itensSprintAbertos || anterior.itensSprintAbertos || null;
    entry.janela = entry.janela || anterior.janela || null;
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
function renderAll() { renderBadge(); renderPanorama(); renderPendencias(); renderMyItems(); renderGrid(); renderRoadmap(); }

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
/* ---------- Panorama: os dois blocos de leitura ---------- */
/* Vêm antes dos operacionais porque a página tem dois leitores: o gestor, que
   para de ler depois do segundo bloco, e o PO, que rola até o Atenção. */

/* O bloco de Ritmo existe inteiro, mas chega DESLIGADO.

   Pedido do Urlan em 02/10/2026: ele quer melhorá-lo antes de deixar à vista.
   Faz sentido mantê-lo fora enquanto isso — hoje só 2 dos 8 épicos têm filhos
   cadastrados, então o gráfico mostra quase só uma frente.

   Ligar é trocar este false por true. A bandeira também governa o
   carregamento da base completa no Panorama: ela foi adicionada POR CAUSA
   deste bloco, e deixá-la ligada com o bloco escondido seria uma consulta a
   mais no DevOps, a cada abertura, pra desenhar algo que ninguém vê. */
const RITMO_VISIVEL = false;
const MESES_RITMO = 6;
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMesCurto = (chave) => MES_CURTO[Number(chave.slice(5, 7)) - 1] || chave;

/* Barras em CSS, sem SVG e sem biblioteca: o projeto não tem build e já desenha
   barra de progresso assim no relatório. Cada coluna é um mês; dentro dela, uma
   fatia por frente, com altura proporcional ao maior mês da série. */
function htmlRitmo() {
  if (baseState.erro) return `<p class="erro">${escapeHtml(baseState.erro)}</p>`;
  if (!baseState.porTime) return '<p class="mudo">carregando o histórico…</p>';
  // Dedupe por id antes de contar: as consultas são por área de time e, se duas
  // áreas se sobrepuserem, o mesmo item entraria duas vezes. Contagem dobrada
  // aqui quebraria a régua única com o relatório, que é o ponto do bloco.
  const porId = new Map();
  for (const t of baseState.porTime) for (const it of (t.items || [])) porId.set(it.id, it);
  const items = [...porId.values()].filter(noNome);
  const evo = C.evolucaoMensal(items, Date.now(), MESES_RITMO);
  const pico = Math.max(...evo.meses.map((m) => m.total));
  // Série toda zerada não vira gráfico: seis colunas vazias afirmam "medimos e
  // deu zero" com a mesma cara de "ainda não temos dado".
  if (!pico) return `<p class="mudo">Nenhuma entrega registrada nos últimos ${MESES_RITMO} meses.</p>`;
  const cor = (i) => `var(--serie-${(i % 6) + 1})`;
  const indice = new Map(evo.frentes.map((f, i) => [f.id, i]));
  /* Duas escalas aninhadas, e a distinção importa: a BARRA mede contra o mês de
     pico (é o que compara meses), e cada FATIA mede contra o total do próprio
     mês (é o que divide a barra). Medir a fatia contra o pico faria a soma das
     fatias não fechar a barra nos meses baixos. */
  const colunas = evo.meses.map((m) => {
    const fatias = m.porFrente.map((f) =>
      `<span class="ritmo-fatia" style="height:${(f.n / m.total) * 100}%;background:${cor(indice.get(f.id))}" title="${escapeHtml(f.nome)}: ${f.n}"></span>`
    ).join('');
    // O número mora preso ao topo da própria barra (bottom: 100%), não no alto
    // da coluna: solto lá em cima, num mês baixo ele ficava a meia tela da
    // barra que descreve e parava de parecer dela.
    return `<div class="ritmo-col">
      <span class="ritmo-area">
        <span class="ritmo-barra" style="height:${(m.total / pico) * 100}%">
          <span class="ritmo-valor">${m.total || ''}</span>
          <span class="ritmo-pilha">${fatias}</span>
        </span>
      </span>
      <span class="ritmo-mes">${rotuloMesCurto(m.mes)}</span>
    </div>`;
  }).join('');
  const legenda = evo.frentes.map((f) =>
    `<span class="ritmo-chave"><i style="background:${cor(indice.get(f.id))}"></i>${escapeHtml(f.nome)}</span>`
  ).join('');
  return `<div class="ritmo">${colunas}</div>
    <div class="ritmo-legenda">${legenda}</div>
    <p class="ritmo-nota mudo">Contagem de itens concluídos, mesma régua do relatório de Entregas · cobre as frentes com itens cadastrados no DevOps.</p>`;
}

/* ---------- Roadmap: página própria ---------- */
/* Começou como bloco do Panorama. Virou página a pedido do Urlan em
   02/10/2026, e faz sentido: é um Gantt de 13 projetos por 12 meses, que rola
   na horizontal — espremido entre os blocos operacionais ele disputava altura
   com o que o PO abre a Central pra ver.

   Os três números que havia por cima ("4 de 13 concluídos · 1 vencido · 2 em
   curso") saíram no mesmo pedido. A conta que os produzia (C.riscoDoRoadmap)
   fica: a regra de vencido é dela, está testada, e é o que uma futura faixa
   de risco desta página vai usar. */
function renderRoadmap() {
  const box = $('roadmap');
  if (!box) return;
  const itens = roadmapState.itens;
  if (!itens) { box.innerHTML = '<p class="mudo">carregando o roadmap…</p>'; return; }
  if (!itens.length) {
    box.innerHTML = '<p class="mudo">Nenhum projeto no roadmap. O arquivo é <b>assets/roadmap.json</b>, escrito à mão a partir do Notion.</p>';
    return;
  }
  // O MESMO desenho do relatório de Entregas, pelo módulo compartilhado —
  // nunca uma cópia: as duas telas leem o mesmo arquivo.
  box.innerHTML = R.corpoRoadmap(itens, Date.now());
}

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

  /* QUADRO DE SPRINTS: anterior, atual e próxima, lado a lado.

     Era só "sprints em curso" — uma coluna, a corrente. O Urlan pediu as três,
     e cada uma responde uma pergunta diferente, então elas NÃO têm a mesma
     anatomia:

     - anterior: o placar fechado e a lista do que NÃO terminou. É o que
       escorregou pra sprint de agora, e é por isso que ela existe aqui;
       repetir o que foi entregue seria arquivo, não leitura.
     - atual: o progresso e o que falta — o que já existia.
     - próxima: o que está planejado, pra saber o que vem.

     Coluna sem sprint não aparece. Time que não selecionou a iteração anterior
     ou a próxima no DevOps vê o quadro com o que tem, e não um buraco rotulado. */
  const CAP_PBIS_SPRINT = 4;
  const pr = visiveis.find((x) => x.teamName === TIME_COM_SPRINT);
  const doCard = pr ? (state.cache.byCard[cardKey(pr)] || {}) : {};
  /* Cache de antes desta mudança não tem `janela` — e o refreshAll só rebusca
     depois de 10 minutos. Sem esta reserva o bloco INTEIRO sumia da tela até a
     próxima busca, que foi o que aconteceu: o Urlan abriu e não achou o quadro.
     Com ela, o cache velho ainda desenha a coluna do meio como antes, e as
     outras duas entram quando o dado novo chega. */
  const janela = doCard.janela
    || (doCard.sprint ? { anterior: null, proxima: null,
      atual: { sprint: doCard.sprint, progress: doCard.progress, parcial: true, transbordados: [],
        itens: (doCard.itensSprintAbertos || []).map((x) => Object.assign({ feito: false }, x)) } } : null);
  const respSprint = respAtivo();
  const doResponsavel = (itens) => itens.filter((it) => !respSprint || it.resp === respSprint);
  const listaDeItens = (itens, link) => {
    const lista = doResponsavel(itens);
    if (!lista.length) return '';
    return `<ul class="lista-linhas">${lista.slice(0, CAP_PBIS_SPRINT).map((it) =>
      `<li><a class="item-linha" href="${link.workItem(it.id)}" target="_blank" rel="noopener" title="${escapeHtml(it.titulo)}">
        <span class="badge-tipo tipo-${it.tipo}">${ROTULO_TIPO_CURTO[it.tipo]}</span>
        <span class="titulo">${escapeHtml(it.titulo)}</span>
        <span class="quando">${it.transbordou
          ? `<span class="selo-transbordo" title="Saiu desta sprint e foi pra ${escapeHtml(it.destino || 'outra')}">→ ${escapeHtml(it.destino || 'outra sprint')}</span>`
          : escapeHtml(it.estado)}</span>
        <span class="id">#${it.id}</span>
      </a></li>`
    ).join('')}${lista.length > CAP_PBIS_SPRINT ? `<li class="sprint-pbis-mais">+${lista.length - CAP_PBIS_SPRINT} mais</li>` : ''}</ul>`;
  };
  let sprints = '';
  if (pr && janela) {
    const link = C.deepLinks(state.config.org, pr.projectName, '');
    const COLUNAS = [
      { chave: 'anterior', rotulo: 'Anterior' },
      { chave: 'atual', rotulo: 'Em curso' },
      { chave: 'proxima', rotulo: 'Próxima' },
    ];
    sprints = COLUNAS.map(({ chave, rotulo }) => {
      const col = janela[chave];
      if (!col) return '';
      /* Com filtro por responsável, o placar passa a contar o MESMO recorte que
         a lista mostra. Antes a barra era da sprint inteira e a lista era de
         uma pessoa: o Urlan viu "50/62" ao lado de dois itens e, com razão,
         achou que faltava coisa. Quem decide é ele; a leitura de time continua
         disponível trocando o seletor pra "todos".

         `parcial` marca a coluna montada do cache antigo, que só guardava os
         itens ABERTOS: recontar ali daria "0 de N", porque os concluídos nem
         estão na lista. Nesse caso vale o placar que veio pronto. */
      const prog = (respSprint && !col.parcial)
        ? C.placarDeSprint(doResponsavel(col.itens))
        : (col.progress || { done: 0, total: 0 });
      const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
      /* As três colunas listam TUDO que a sprint tem, feito ou não — é o que o
         Urlan pediu, e corrige a leitura que eu tinha feito. O Panorama é a
         composição da sprint; o recorte por status é trabalho da página do
         board, onde se vê o quadro atualizado.

         A prévia é curta (CAP_PBIS_SPRINT) e por isso a ordem importa: o que
         está em aberto vem primeiro. Não é recorte — nada some, e o "+N mais"
         conta o resto —, é só não gastar as quatro linhas visíveis com itens
         já entregues numa sprint que fechou 50 de 62.

         O aviso de planejamento fica SEMPRE na próxima, com lista ou sem: sprint
         futura não tem escopo fechado, então o que está ali ainda pode sair e o
         que falta ainda pode entrar.

         Quando não há o que listar, a linha que explica o vazio — e são duas
         causas diferentes, cada uma com a sua frase. Uma frase só mentiria num
         dos dois casos. */
      const NOTA_PLANEJAMENTO = '<p class="sprint-nota mudo">As PBIs desta sprint ainda estão sendo planejadas.</p>';
      /* Os que transbordaram vão no FIM da lista, depois dos que ficaram: a
         coluna continua respondendo "o que esta sprint tem" primeiro, e só
         depois "o que ela teve e saiu". Eles não entram no placar — o que a
         sprint entregou não muda por ela ter tido mais escopo —, então a
         contagem deles vira uma linha própria embaixo.

         A linha existe porque a prévia corta em CAP_PBIS_SPRINT: sem ela, o
         transbordo podia nunca aparecer na tela. */
      const saiu = doResponsavel(col.transbordados || []);
      const emOrdem = [...col.itens].sort((a, b) => Number(a.feito) - Number(b.feito)).concat(saiu);
      const lista = listaDeItens(emOrdem, link);
      const destinos = [...new Set(saiu.map((x) => x.destino).filter(Boolean))];
      const NOTA_TRANSBORDO = saiu.length
        ? `<p class="sprint-nota mudo">${saiu.length === 1 ? '1 item transbordou' : saiu.length + ' itens transbordaram'}`
          + `${destinos.length === 1 ? ' para a ' + escapeHtml(destinos[0]) : ''}.</p>`
        : '';
      const semLista = (col.itens.length || saiu.length)
        ? `<p class="sprint-limpa mudo">Nada no nome de ${escapeHtml(respSprint)} nesta sprint.</p>`
        : (chave === 'proxima' ? '' : '<p class="sprint-limpa mudo">Sprint sem itens.</p>');
      const corpo = (lista || semLista) + NOTA_TRANSBORDO + (chave === 'proxima' ? NOTA_PLANEJAMENTO : '');
      /* A barra aparece nas TRÊS colunas, a da próxima vazia (pedido do Urlan em
         05/10/2026). Antes ela ficava reservada e invisível, pelo argumento de
         que trilho zerado ao lado de "1 item" leria como "nenhum feito". O
         padrão repetido venceu o argumento: três cartões com a mesma anatomia
         se comparam melhor que dois com barra e um com um vão. */
      const barra = `<span class="barra"><span class="barra-cheia" style="width:${pct}%"></span></span>`;
      const nProxima = doResponsavel(col.itens).length;
      const placar = chave === 'proxima'
        ? `${nProxima} ${nProxima === 1 ? 'item' : 'itens'}`
        : `${prog.done}/${prog.total}`;
      return `<div class="sprint-card sprint-${chave}">
        <span class="sprint-fase">${rotulo}</span>
        <a class="sprint-card-link" href="${rotaBoard(pr, true, col.sprint.id)}" title="Abrir o board de ${escapeHtml(col.sprint.name)}">
          <span class="sprint-linha"><span class="sprint-nome"><b>${escapeHtml(col.sprint.name)}</b> <span class="mudo">${periodo(col.sprint.start, col.sprint.finish)}</span></span><span class="sprint-prog">${placar} <span class="seta">→</span></span></span>
          ${barra}
        </a>
        ${corpo}
      </div>`;
    }).filter(Boolean).join('');
  }

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
    ${RITMO_VISIVEL ? `<section class="bloco"><h3>Ritmo de entrega</h3>${htmlRitmo()}</section>` : ''}
    <section class="bloco"><h3>Agora</h3><div class="tiles">${tiles}</div></section>
    ${sprints ? `<section class="bloco"><h3>Sprints</h3><div class="sprints sprints-quadro">${sprints}</div></section>` : ''}
    <section class="bloco"><h3>Por nível</h3>${htmlNiveis(C.aggregateCounts(todos))}</section>
    <section class="bloco"><h3>Atenção agora${verTodas}</h3>${listaAtencao}</section>
  </div>`;
}

/* ---------- Roadmap: a única peça da Central que não vem do DevOps ---------- */
// Vive em assets/roadmap.json, escrito à parte do Notion. Era exclusivo do
// report; entrou aqui em 02/10/2026 pro bloco Roadmap do Panorama, que é o
// único lugar com dado pra responder "os projetos vão chegar na data" — os
// épicos do DevOps estão quase todos sem filho e sem data de fim.
const roadmapState = { itens: null };

async function carregarRoadmap() {
  try {
    const resp = await fetch('assets/roadmap.json', { cache: 'no-store' });
    if (!resp.ok) return; // arquivo ausente: o bloco some, o resto da página fica de pé
    const dado = await resp.json();
    roadmapState.itens = C.saneRoadmapItens(dado.itens);
    renderRoadmap();
  } catch (e) {
    /* Degradação de propósito: o Panorama continua de pé sem o bloco. Mas ele
       some sem deixar buraco, e aí "não temos roadmap" e "o arquivo não
       carregou" ficam idênticos na tela. */
    console.warn('[Central] roadmap.json não carregou: o bloco de Roadmap não vai aparecer. Motivo: ' + e.message);
  }
}

/* ---------- Produtos ---------- */
// Única página com consulta própria: progresso por filhos exige o histórico
// inteiro, sem o corte de 30 dias do wiqlCounts. Por isso carrega SOB DEMANDA
// (só ao abrir a página), como o board dedicado — o refresh geral não paga por
// ela. Estado em memória, não no localStorage: são centenas de itens que só
// servem a esta tela.
// Base completa, sob demanda: uma consulta serve Produtos e Report. Guarda os
// itens crus além dos épicos rolados — o Report precisa de todos, e buscar duas
// vezes a mesma coisa seria desperdício.
const baseState = { porTime: null, carregando: false, erro: null, fetchedAt: 0 };

async function carregarBase(forcar) {
  if (!state.config || baseState.carregando) return;
  if (!state.pat) { renderProdutos(); renderEpico(); return; }
  if (!forcar && baseState.porTime && !C.isStale(baseState.fetchedAt, Date.now())) return;
  baseState.carregando = true;
  baseState.erro = null;
  renderProdutos();
  renderEpico();
  try {
    const porTime = [];
    for (const p of state.config.projects.filter((x) => !x.hidden)) {
      let areas = [];
      try { areas = await A.teamAreas(ctx(), p.projectName, p.teamName); } catch (e) {
      /* Sem área, areaClause devolve string vazia e a consulta deixa de ter
         recorte: passa a contar o projeto inteiro. Não é degradação suave — é
         número MAIOR que a realidade, e antes isso acontecia sem nada na tela
         nem no console. */
      console.warn('[Central] não deu pra ler as áreas de ' + p.teamName
          + ' — a consulta passa a valer pro PROJETO INTEIRO, e os números incham com itens de outros times.'
          + ' Motivo: ' + mensagemDeErro(e));
    }
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
    renderEpico();
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
  /* "sem janela" dizia duas vezes o rótulo que está do lado ("Janela") e
     nenhuma vez o que o leitor precisa saber: se a data não existe ou se ela
     ainda não foi marcada. "A definir" responde isso — a frente existe, a
     data é que ainda não foi decidida. */
  return 'a definir';
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
  // O time de sprint não tem épico próprio aqui — quem carrega produto de
  // verdade são Vertical Ecommerce e Growth. Só some do card de Produtos; ele
  // continua valendo pro Panorama (sprint). Lê a MESMA constante do quadro de
  // sprints: o nome estava escrito à mão aqui, e renomear o time no DevOps
  // deixaria as duas telas discordando sobre quem ele é.
  const porTimeProdutos = baseState.porTime.filter(({ p }) => p.teamName !== TIME_COM_SPRINT);
  // Bloco (fundo cinza) sempre presente, mesmo com um time só: o card do
  // épico é branco (.card.produto) e depende do bloco pra não desaparecer
  // sobre o fundo branco da própria seção — some junto se o bloco sumir.
  const blocos = porTimeProdutos.map(({ p, produtos: todosProdutos }) => {
    // filtra pelo dono do ÉPICO; o roll-up já foi feito com a árvore inteira,
    // senão o progresso viraria "1/1" ao esconder filhos de outras pessoas
    const produtos = todosProdutos.filter((reg) => noNome(reg.item));
    const corpo = produtos.length
      ? `<div class="grid-produtos">${produtos.map((reg) => htmlProduto(reg, p)).join('')}</div>`
      : '<p class="mudo">Nenhum épico neste time.</p>';
    return `<section class="bloco"><h3>${escapeHtml(p.teamName)}<span class="conta">${produtos.length}</span></h3>${corpo}</section>`;
  }).join('');
  box.innerHTML = erroHtml + `<div class="blocos">${blocos}</div>`;
}

function htmlProduto(reg, p) {
  const f = reg.item.fields || {};
  const link = C.deepLinks(state.config.org, p.projectName, '').workItem(reg.item.id);
  const linkEpico = `#epico/${encodeURIComponent(p.projectName)}/${encodeURIComponent(p.teamName)}/${reg.item.id}`;
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
    <a class="progresso" href="${linkEpico}" title="Ver Features e PBIs deste épico">
      <span class="sprint-linha"><span class="sprint-nome">${total ? 'Entregue' : 'Sem filhos'}</span><span class="sprint-prog">${total ? feitos + '/' + total : '—'} <span class="seta">→</span></span></span>
      <span class="barra"><span class="barra-cheia" style="width:${pct}%"></span></span>
    </a>
  </article>`;
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

/* Quem pode ser escolhido no filtro de responsável.

   O seletor nascia da lista inteira de quem tem item atribuído — todo mundo,
   de todos os times do DevOps — e o uso real é comparar as três POs. Os demais
   ficam de fora.

   A lista é por PRIMEIRO NOME de propósito. O DevOps devolve o nome de
   exibição completo, e esse nome muda sem avisar: sobrenome que entra ou sai,
   nome social, grafia diferente entre contas. Casar pela string inteira faria
   a pessoa sumir do seletor calada; casar pelo primeiro nome sobrevive a isso.
   Se alguma PO não aparecer, é aqui que se mexe. */
const POS = ['Urlan', 'Isadora', 'Daniele'];
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0]
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const ehPO = (n) => POS.some((p) => primeiroNome(p) === primeiroNome(n));

// Seletor de responsável dos cartões — opções vêm dos itens em cache de todos os times
function renderFiltroGlobal() {
  const barra = $('filtro-global');
  const sel = $('resp-global');
  const todos = Object.values(state.cache.byCard).flatMap((e) => (e && e.items) || []);
  const nomes = new Set(todos
    .map((it) => (it.fields || {})['System.AssignedTo'])
    .filter((r) => r && r.displayName)
    .map((r) => r.displayName)
    .filter(ehPO));
  // A escolha salva sobrevive mesmo fora da lista: se o filtro guardado for de
  // alguém que saiu das POs, esconder o nome deixaria o seletor dizendo "todos"
  // enquanto filtrava por uma pessoa. Some quando ele escolher outro.
  if (respAtivo()) nomes.add(respAtivo());
  if (state.cache.usuario && ehPO(state.cache.usuario)) nomes.add(state.cache.usuario);
  // Nada pra escolher não é barra vazia, é barra fora: antes a checagem era
  // pelos itens em cache, que agora não dizem mais se sobrou opção.
  if (!nomes.size) { barra.hidden = true; return; }
  barra.hidden = false;
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
    /* Número e rótulo em células separadas, e não "3 a fazer" numa frase só:
       com 18 ao lado de 5 e 6, cada palavra começava num lugar e as três
       células ficavam impossíveis de comparar de relance. Agora os números
       alinham numa coluna e os rótulos noutra — inclusive ENTRE as células,
       porque a coluna do número tem largura mínima fixa. */
    const linha = (n, texto, classe) => `<li${classe ? ` class="${classe}"` : ''}>`
      + `<b>${n}</b><span>${texto}</span></li>`;
    const quebra = [];
    if (b.todo) quebra.push(linha(b.todo, 'a fazer'));
    if (b.andamento) quebra.push(linha(b.andamento, 'em andamento'));
    if (b.feito) quebra.push(linha(b.feito, `concluído${b.feito > 1 ? 's' : ''} (30d)`));
    if (b.atencao) quebra.push(linha(b.atencao, `bloqueado${b.atencao > 1 ? 's' : ''}`, 'bloq-linha'));
    // Sem número: ocupa as duas colunas, senão a palavra ficaria recuada
    // esperando um dígito que não existe.
    if (!b.total) quebra.push('<li class="sem-nada"><span>nenhum</span></li>');
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

/* `iteracaoId` entrou quando o Panorama ganhou as três colunas: sem ele, as
   três apontavam pra mesma rota e clicar em "Anterior" abria o board da sprint
   CORRENTE — a tela mostrava a Sprint 19 e o clique levava pra 20. */
function rotaBoard(p, comSprint, iteracaoId) {
  const base = `#board/${encodeURIComponent(p.projectName)}/${encodeURIComponent(p.teamName)}`;
  if (!comSprint) return base;
  return base + '/sprint' + (iteracaoId ? '/' + encodeURIComponent(iteracaoId) : '');
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
  /* timeZone UTC, e não o do navegador: a iteração do DevOps chega como
     meia-noite UTC ("2026-09-15T00:00:00Z"), e formatada no fuso de São Paulo
     (UTC-3) ela recuava um dia — a sprint que começa dia 15 aparecia como 14.
     Passou despercebido enquanto era uma data só num card; com o quadro de três
     sprints são seis datas erradas lado a lado. */
  const fmt = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  return `${fmt(start)}–${fmt(finish)}`;
}

function cssId(s) { return s.replace(/[^a-z0-9]/gi, '-').toLowerCase(); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML.replace(/"/g, '&quot;'); }

/* ---------- Board dedicado ---------- */
const boardState = { p: null, chave: null, items: null, columns: null, sprint: null, iteracaoId: null, voltarPara: null, soSprint: false, carregando: false, erro: null, transbordados: [], filtro: { tipos: null, resp: '', busca: '' } };
// Rótulo da coluna dos que saíram. Constante porque dois lugares a usam: o
// agrupamento e a ordenação que a empurra pro fim.
const COLUNA_TRANSBORDO = 'Transbordou';

function renderRoute() {
  const hash = location.hash || '';
  const m = hash.match(/^#board\/([^/]+)\/([^/]+)(?:\/sprint(?:\/([^/]+))?)?$/);
  if (m && state.config) {
    const projectName = decodeURIComponent(m[1]);
    const teamName = decodeURIComponent(m[2]);
    const p = state.config.projects.find((x) => x.projectName === projectName && x.teamName === teamName);
    const pedeSprint = /\/sprint(\/|$)/.test(hash);
    if (p) { abrirBoard(p, pedeSprint, m[3] ? decodeURIComponent(m[3]) : null); setPagina('board'); return; }
  }
  fecharBoard();
  const me = hash.match(/^#epico\/([^/]+)\/([^/]+)\/(\d+)$/);
  if (me && state.config) {
    const projectName = decodeURIComponent(me[1]);
    const teamName = decodeURIComponent(me[2]);
    const p = state.config.projects.find((x) => x.projectName === projectName && x.teamName === teamName);
    if (p) { abrirEpico(p, Number(me[3])); setPagina('epico'); return; }
  }
  fecharEpico();
  if (hash === '#pendencias') { setPagina('pendencias'); return; }
  if (hash === '#produtos') { setPagina('produtos'); carregarBase(false); return; }
  if (hash === '#roadmap') { setPagina('roadmap'); return; }
  if (hash === '#projetos') { setPagina('projetos'); return; }
  if (hash === '#meus-itens') { setPagina('meus-itens'); return; }
  // O Panorama pede a base completa porque o bloco de Ritmo precisa de
  // história, e a consulta dele (wiqlCounts 30) só tem 30 dias. Não bloqueia:
  // a página desenha na hora com o que já tem e o gráfico preenche quando
  // chega. Sendo a tela de entrada, ainda aquece o cache pro Produtos e pro
  // Report, que leem a mesma base.
  setPagina('panorama'); // abertura: visão geral antes do detalhe
  if (RITMO_VISIVEL) carregarBase(false);
}

function setPagina(pagina) {
  document.body.dataset.pagina = pagina;
  $('nav-panorama').classList.toggle('ativa', pagina === 'panorama');
  $('nav-pendencias').classList.toggle('ativa', pagina === 'pendencias');
  $('nav-produtos').classList.toggle('ativa', pagina === 'produtos' || pagina === 'epico');
  $('nav-roadmap').classList.toggle('ativa', pagina === 'roadmap');
  $('nav-meus-itens').classList.toggle('ativa', pagina === 'meus-itens');
  $('nav-projetos').classList.toggle('ativa', pagina === 'projetos' || pagina === 'board');
}

/* Pra onde o "voltar" do board leva. O botão tinha '#projetos' fixo, de quando
   o board só era alcançável por lá; desde que o Panorama ganhou o quadro de
   sprints, clicar numa sprint e voltar jogava o Urlan numa tela em que ele
   nunca esteve.

   Guardado em memória, e não lido do histórico do navegador: history.back()
   acerta quando houve navegação de verdade, mas abandona a página inteira se o
   board foi a PRIMEIRA tela (link colado, F5 em cima dele). */
const VOLTA_PADRAO = '#projetos';
function abrirBoard(p, comSprint, iteracaoId) {
  // Board → board (trocar de sprint) não é origem: senão o voltar passaria a
  // apontar pro próprio board e o botão não sairia do lugar.
  const de = document.body.dataset.pagina;
  if (de && de !== 'board') boardState.voltarPara = '#' + de;
  boardState.p = p;
  if (comSprint) boardState.soSprint = true;
  // Trocar de sprint não troca o board no cache (a chave é o time), então o
  // pedido de outra iteração força a recarga — senão clicar em "Anterior"
  // depois de "Em curso" mostraria o quadro anterior, filtrado pela sprint
  // velha.
  const trocou = (boardState.iteracaoId || null) !== (iteracaoId || null);
  boardState.iteracaoId = iteracaoId || null;
  $('board-view').hidden = false;
  carregarBoard(p, trocou);
}

function fecharBoard() {
  const bv = $('board-view');
  if (bv) bv.hidden = true;
}

// Tela do épico: sem consulta própria — reusa a árvore que a Produtos já
// carregou (baseState.porTime já tem Épico + Feature + PBI do time inteiro).
const epicoState = { p: null, id: null };

function abrirEpico(p, id) {
  epicoState.p = p;
  epicoState.id = id;
  $('epico-view').hidden = false;
  carregarBase(false);
  renderEpico();
}

function fecharEpico() {
  const ev = $('epico-view');
  if (ev) ev.hidden = true;
  epicoState.p = null;
  epicoState.id = null;
}

// Rótulo dos grupos de status na tela do épico — mesma etiqueta de "A fazer/
// Em andamento/Atenção" que Meus Itens já usa, mais "Concluído": aqui a tela
// mostra a árvore inteira do épico, não só o que ainda está por fazer.
const ROTULO_STATUS_EPICO = { atencao: 'Atenção', andamento: 'Em andamento', todo: 'A fazer', feito: 'Concluído' };

function renderEpico() {
  const box = $('epico-lista');
  if (!box || !epicoState.p) return;
  const p = epicoState.p;
  $('epico-devops').href = C.deepLinks(state.config.org, p.projectName, '').workItem(epicoState.id);
  const st = $('epico-status');
  const erroHtml = baseState.erro ? escapeHtml(baseState.erro) : '';
  if (!baseState.porTime) {
    st.hidden = false;
    st.innerHTML = baseState.erro ? `<span class="erro">${erroHtml}</span>` : 'carregando…';
    box.innerHTML = '';
    return;
  }
  const entry = baseState.porTime.find((e) => e.p === p);
  const detalhe = entry ? C.epicoDetalhe(entry.items, epicoState.id) : null;
  if (!detalhe) {
    st.hidden = false;
    st.textContent = 'Épico não encontrado — pode ter sido concluído ou removido.';
    box.innerHTML = '';
    return;
  }
  st.hidden = true;
  const f = detalhe.epico.fields || {};
  $('epico-titulo').textContent = f['System.Title'] || ('Épico #' + epicoState.id);
  $('epico-sub').textContent = p.projectName + ' · ' + p.teamName;
  if (!detalhe.descendentes.length) {
    box.innerHTML = '<p class="mudo">Nenhuma Feature ou PBI neste épico ainda.</p>';
    return;
  }
  // Agrupa por status pra separar visualmente o que já anda do que ainda não
  // começou — o épico já vem ordenado (nível, status, título) do core, então
  // o agrupamento só precisa preservar essa ordem dentro de cada grupo.
  const porStatus = new Map();
  for (const it of detalhe.descendentes) {
    const bucket = C.stateBucket((it.fields || {})['System.State']);
    if (!porStatus.has(bucket)) porStatus.set(bucket, []);
    porStatus.get(bucket).push(it);
  }
  box.innerHTML = ['atencao', 'andamento', 'todo', 'feito']
    .filter((bucket) => porStatus.has(bucket))
    .map((bucket) => {
      const itens = porStatus.get(bucket);
      return `<div class="epico-grupo">
        <header><h4><span class="ponto" style="background:${corColunaPorBucket(bucket)}"></span>${ROTULO_STATUS_EPICO[bucket]}</h4><span class="conta">${itens.length}</span></header>
        <ul class="lista-linhas">${itens.map((it) => htmlEpicoItem(it, p)).join('')}</ul>
      </div>`;
    }).join('');
}

function htmlEpicoItem(it, p) {
  const f = it.fields || {};
  const slug = C.typeSlug(f['System.WorkItemType']);
  const titulo = f['System.Title'] || ('item #' + it.id);
  const link = C.deepLinks(state.config.org, p.projectName, '').workItem(it.id);
  return `<li><a class="item-linha" href="${link}" target="_blank" rel="noopener" title="${escapeHtml(titulo)}">
    <span class="badge-tipo tipo-${slug}">${ROTULO_TIPO_CURTO[slug]}</span>
    <span class="titulo">${escapeHtml(titulo)}</span>
    <span class="quando">${escapeHtml(f['System.State'] || '')}</span>
    <span class="id">#${it.id}</span>
  </a></li>`;
}

/* Qual sprint filtra o board: a pedida na rota, ou a corrente. Resolver a
   pedida custa listar as iterações do time — a API não busca uma iteração
   isolada por id. Por isso só acontece quando a rota pede mesmo. */
async function resolverSprintDoBoard(p) {
  try {
    if (boardState.iteracaoId) {
      const todas = await A.teamIterations(ctx(), p.projectName, p.teamName);
      boardState.sprint = todas.find((x) => String(x.id) === String(boardState.iteracaoId)) || null;
      if (boardState.sprint) return;
    }
    boardState.sprint = await A.currentSprint(ctx(), p.projectName, p.teamName);
  } catch (e) {
    /* Sem sprint resolvida, o filtro "só sprint corrente" não tem path pra
       comparar e é pulado: o board passa a mostrar o BACKLOG INTEIRO do time
       no lugar da sprint pedida. Mostra demais, e o botão fica ligado dizendo
       que está recortando. */
    console.warn('[Central] não deu pra resolver a sprint do board de ' + p.teamName
      + ' — o quadro mostra o backlog inteiro em vez da sprint. Motivo: ' + mensagemDeErro(e));
  }
}

/* Quanto passado pedir ao DevOps. 30 dias serve o board corrente; pra uma
   sprint que já fechou é preciso alcançar o fim dela, senão os itens
   concluídos some da tela conforme envelhecem. A folga de 30 dias por cima
   cobre o item que mudou de estado depois do encerramento. */
const CORTE_BOARD_PADRAO = 30;
function diasDeCorteDoBoard(sprint) {
  const fim = sprint && sprint.finish ? Date.parse(sprint.finish) : NaN;
  if (Number.isNaN(fim)) return CORTE_BOARD_PADRAO;
  const dias = Math.ceil((Date.now() - fim) / 86400000);
  return Math.max(CORTE_BOARD_PADRAO, dias + CORTE_BOARD_PADRAO);
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
    try { areas = await A.teamAreas(ctx(), p.projectName, p.teamName); } catch (e) {
      /* Sem área, areaClause devolve string vazia e a consulta deixa de ter
         recorte: passa a contar o projeto inteiro. Não é degradação suave — é
         número MAIOR que a realidade, e antes isso acontecia sem nada na tela
         nem no console. */
      console.warn('[Central] não deu pra ler as áreas de ' + p.teamName
          + ' — a consulta passa a valer pro PROJETO INTEIRO, e os números incham com itens de outros times.'
          + ' Motivo: ' + mensagemDeErro(e));
    }
    /* A sprint é resolvida ANTES da consulta, e não depois, porque ela decide
       quanto passado pedir. O wiqlBoard descarta o que foi concluído há mais de
       30 dias — regra boa pro board corrente, e furo garantido numa sprint
       passada: a Sprint 19 fechou 50 itens que sumiriam da tela assim que
       completassem 30 dias. A janela passa a ser o fim da sprint mais uma
       folga. */
    await resolverSprintDoBoard(p);
    const corte = diasDeCorteDoBoard(boardState.sprint);
    const ids = await A.runWiql(ctx(), p.projectName, p.teamName, C.wiqlBoard(areas, corte));
    boardState.items = ids.length ? await A.getFields(ctx(), ids, FIELDS_BOARD) : [];
    boardState.transbordados = await buscarTransbordoDoBoard(p, boardState.sprint, areas);
    try {
      const boards = await A.listTeamBoards(ctx(), p.projectName, p.teamName);
      const nivelRequisito = boards.find((b) => !/^(epics|features)$/i.test(b.name)) || boards[boards.length - 1];
      if (nivelRequisito) boardState.columns = await A.boardColumns(ctx(), p.projectName, p.teamName, nivelRequisito.id);
    } catch (e) { /* sem colunas oficiais: ordenação por fallback */ }
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
  /* O botão existe pro board do TIME — aquele que abre sem sprint na rota e
     mostra o quadro inteiro; ali ele é o atalho pra estreitar na sprint
     corrente. Quando a rota nomeia a sprint, a página É o board dela: o
     cabeçalho diz "Sprint 20" e desligar o recorte mostraria o backlog inteiro
     do time sob aquele título. O botão oferecia um estado em que a própria
     página se contradiz, então nessa entrada ele não aparece.

     `soSprint` é forçado junto: esconder um controle sem garantir o estado dele
     deixaria o recorte desligado e sem jeito de religar. */
  const sprintNaRota = !!boardState.iteracaoId;
  if (sprintNaRota) boardState.soSprint = true;
  filtro.hidden = sprintNaRota || !(boardState.sprint && boardState.sprint.path);
  /* "Só sprint corrente" era verdade quando o board só abria na sprint atual.
     Desde que a rota carrega o id da iteração, dá pra entrar numa sprint
     passada — e aí o rótulo afirmava "corrente" sobre a Sprint 19. O botão
     nomeia a sprint que está na tela, que é o que ele de fato filtra. */
  filtro.textContent = boardState.sprint && boardState.sprint.name
    ? 'Só a ' + boardState.sprint.name
    : 'Só esta sprint';
  filtro.setAttribute('aria-pressed', String(boardState.soSprint));
  filtro.classList.toggle('ativo', boardState.soSprint);
  const filtros = $('board-filtros');
  if (boardState.carregando) { filtros.hidden = true; st.textContent = 'carregando board…'; st.hidden = false; cols.innerHTML = ''; return; }
  if (boardState.erro) { filtros.hidden = true; st.innerHTML = `<span class="erro">${escapeHtml(boardState.erro)}</span>`; st.hidden = false; cols.innerHTML = ''; return; }
  const todos = boardState.items || [];
  filtros.hidden = !todos.length;
  /* Os chips contavam `todos` — o board inteiro do time — enquanto as colunas
     mostravam o recorte. Dentro da Sprint 19 a barra dizia "PBIs 110 · Bugs
     96" com 39 cartões na tela: dois conjuntos diferentes lado a lado, e o
     número maior é o que o olho lê primeiro.

     Agora cada chip conta o que os OUTROS filtros deixam passar — sprint,
     busca e responsável —, mas não o filtro de tipo em si: contar com ele
     dentro zeraria os chips não selecionados e tiraria o caminho de volta. É o
     comportamento normal de filtro facetado. */
  const semTipo = Object.assign({}, boardState.filtro, { tipos: null, resp: respAtivo() });
  let base = todos;
  if (boardState.soSprint && boardState.sprint) {
    /* Os que saíram entram SÓ com o recorte da sprint ligado. Desligado, o
       board é o backlog inteiro do time e eles já estão lá, na sprint pra onde
       foram — somá-los de novo mostraria o mesmo cartão duas vezes. */
    base = base.filter((it) => C.inSprint(it, boardState.sprint.path))
      .concat(boardState.transbordados || []);
  }
  base = C.filterItems(base, semTipo);
  renderChipsTipo($('board-tipos'), base, boardState.filtro, () => renderBoard(p));
  const items = C.filterItems(base, { tipos: boardState.filtro.tipos });
  const porColuna = new Map();
  for (const it of items) {
    const f = it.fields || {};
    /* Quem saiu vai pra coluna própria, não pra do estado dele: o estado é de
       OUTRA sprint agora, e vê-lo em "Em Desenvolvimento" aqui diria que ele
       está em curso NESTA — que é justamente o que não é verdade. */
    const col = it.transbordou ? COLUNA_TRANSBORDO : (f['System.BoardColumn'] || f['System.State'] || '—');
    if (!porColuna.has(col)) porColuna.set(col, []);
    porColuna.get(col).push(it);
  }
  /* DUAS COLUNAS GARANTIDAS, E SÓ NA SPRINT ENCERRADA.

     Numa sprint que já fechou as duas perguntas são "o que saiu pronto" e "o
     que escorreu pra seguinte" — e cada uma tem resposta mesmo quando é zero.
     Vazias elas sumiam, a vizinha esticava e ocupava a tela, e a ausência
     deixava de ser legível porque não havia onde lê-la.

     Na sprint CORRENTE nada muda: ninguém transbordou ainda (nem se consultou —
     buscarTransbordoDoBoard sai cedo), e o board serve pra ver o trabalho
     andando pelo fluxo. Garantir "Feito" ali seria prometer uma etapa vazia no
     primeiro dia da sprint.

     "Feito" é achado pelo TIPO da coluna no DevOps, não pelo nome: quem
     renomear a coluna lá não perde a garantia aqui. */
  const sprintEncerrada = boardState.soSprint && boardState.sprint
    && C.estadoDaSprint(boardState.sprint, Date.now()) === 'fechada';
  const colunaFinal = (boardState.columns || [])
    .find((c) => String(c.type || '').toLowerCase() === 'outgoing');
  const garantidas = new Set(sprintEncerrada && colunaFinal ? [colunaFinal.name] : []);

  let nomes;
  if (boardState.columns && boardState.columns.length) {
    /* As demais seguem como sempre foram: sem item, não aparecem. Garantir as
       duas é o pedido; esvaziar o board das outras não — item parado numa etapa
       do meio precisa continuar visível, senão some trabalho da tela. */
    nomes = boardState.columns.map((c) => c.name).filter((n) => porColuna.has(n) || garantidas.has(n));
    for (const n of porColuna.keys()) if (!nomes.includes(n)) nomes.push(n); // colunas fora da lista oficial vão pro fim
  } else {
    /* Sem a lista oficial do DevOps não há como saber qual coluna é a final —
       só as que têm item se conhecem. Aqui o board segue exatamente como era. */
    const statesByColumn = {};
    for (const [n, lista] of porColuna) statesByColumn[n] = lista.map((it) => (it.fields || {})['System.State']);
    nomes = C.orderColumnsFallback([...porColuna.keys()], statesByColumn);
  }
  /* Fecha o board, sempre: o fluxo da sprint termina em "Feito", e o que saiu
     vem depois — não é etapa do caminho, é o que não chegou ao fim dele. Vale
     pros dois caminhos de ordenação, o oficial do DevOps e o de reserva. */
  if (porColuna.has(COLUNA_TRANSBORDO) || sprintEncerrada) {
    nomes = nomes.filter((n) => n !== COLUNA_TRANSBORDO).concat(COLUNA_TRANSBORDO);
  }
  /* Board sem item NENHUM continua sendo uma frase, e não um esqueleto de
     colunas vazias: quando não há o que mostrar, o que o leitor precisa saber é
     por quê — filtro, sprint vazia — e isso não cabe numa coluna. */
  if (!items.length || !nomes.length) {
    const temFiltro = boardState.filtro.busca || respAtivo() || boardState.filtro.tipos;
    const naSprint = boardState.soSprint && boardState.sprint && boardState.sprint.name
      ? 'nada na ' + boardState.sprint.name
      : 'board vazio';
    st.textContent = temFiltro ? 'nada com esses filtros' : naSprint;
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
    if (nome === COLUNA_TRANSBORDO) bucket = 'transbordo';
    else if (atencao) bucket = 'atencao';
    else if (tipoOficial.get(nome) === 'outgoing') bucket = 'feito';
    else if (lista.length && lista.every((it) => C.isTerminalState((it.fields || {})['System.State']))) bucket = 'feito';
    return `<section class="coluna${bucket === 'atencao' ? ' atencao' : ''}">
      <header><h4><span class="ponto" style="background:${corColunaPorBucket(bucket)}"></span>${escapeHtml(nome)}</h4><span class="conta">${lista.length}</span></header>
      ${!lista.length ? `<p class="coluna-vazia mudo">${nome === COLUNA_TRANSBORDO ? 'nada transbordou' : 'nada nesta etapa'}</p>` : `<ul>${lista.map((it) => {
        const f = it.fields || {};
        const slug = C.typeSlug(f['System.WorkItemType']);
        const resp = f['System.AssignedTo'] && f['System.AssignedTo'].displayName ? f['System.AssignedTo'].displayName : '';
        const link = C.deepLinks(state.config.org, p.projectName, '').workItem(it.id);
        const dica = escapeHtml(f['System.WorkItemType']) + (resp ? ' · ' + escapeHtml(resp) : '');
        /* No cartão de quem saiu, a informação que falta é PRA ONDE — a coluna
           já disse que ele saiu, e "#49931" sozinho não conta a história. O
           estado dele fica de fora de propósito: é estado de outra sprint, e
           lido aqui sugeriria que ele anda dentro desta. */
        const destino = it.transbordou
          ? `<span class="linha"><span class="rot">Foi pra</span><span class="val">${escapeHtml(C.iterationLabel(f['System.IterationPath']))}</span></span>`
          : '';
        return `<li><a class="item" href="${link}" target="_blank" rel="noopener" title="${dica}">
          <span class="cabeca"><span class="titulo">${escapeHtml(f['System.Title'])}</span>${resp ? `<span class="avatar">${escapeHtml(C.initials(resp))}</span>` : ''}</span>
          <span class="badge-tipo tipo-${slug}">${ROTULO_TIPO_CURTO[slug]}</span>
          <span class="linha"><span class="rot">Item</span><span class="val">#${it.id}</span></span>
          ${destino}
        </a></li>`;
      }).join('')}</ul>`}
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
  // Arquivo local, pequeno e sem token: chega antes do DevOps e redesenha o
  // Panorama sozinho quando chega. Não entra no refreshAll porque não é
  // consulta — não tem o que ficar obsoleto a cada F5 do board.
  carregarRoadmap();
  renderRoute(); // abre o board direto se a URL já apontar pra um (#board/...)
}

document.addEventListener('DOMContentLoaded', () => {
  $('wizard-descobrir').addEventListener('click', wizardDiscover);
  $('wizard-importar').addEventListener('change', wizardImport);
  $('wizard-concluir').addEventListener('click', wizardConclude);
  $('atualizar').addEventListener('click', () => {
    refreshAll(true);
    // Produtos lê a base direto, com cache próprio
    if (document.body.dataset.pagina === 'produtos') carregarBase(true);
  });
  $('abrir-config').addEventListener('click', openSettings);
  $('board-voltar').addEventListener('click', () => { location.hash = boardState.voltarPara || VOLTA_PADRAO; });
  $('epico-voltar').addEventListener('click', () => { location.hash = '#produtos'; });
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
