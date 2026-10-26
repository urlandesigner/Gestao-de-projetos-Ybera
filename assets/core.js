/* Central de Projetos — lógica pura (sem DOM, sem fetch).
   UMD simples: window.CentralCore no navegador, module.exports no Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CentralCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- URLs ----
  function orgBaseUrl(input) {
    let s = String(input || '').trim();
    if (!s) throw new Error('URL da organização vazia');
    s = s.replace(/^https?:\/\//i, '').split(/[?#]/)[0].replace(/\/+$/, '');
    if (/^dev\.azure\.com$/i.test(s)) throw new Error('Esperado dev.azure.com/SUA-ORG');
    if (!s.includes('/')) s = 'dev.azure.com/' + s; // aceita só o nome da org
    // aceita URL colada com projeto/board no caminho: usa só o primeiro segmento (a org)
    const m = s.match(/^dev\.azure\.com\/([^/?#]+)/i);
    if (!m) throw new Error('Esperado dev.azure.com/SUA-ORG');
    return 'https://dev.azure.com/' + m[1];
  }

  function deepLinks(base, project, team) {
    const p = encodeURIComponent(project);
    const t = encodeURIComponent(team);
    return {
      board: `${base}/${p}/_boards/board/t/${t}/`,
      backlog: `${base}/${p}/_backlogs/backlog/${t}/`,
      sprints: `${base}/${p}/_sprints/taskboard/${t}/`,
      queries: `${base}/${p}/_queries`,
      dashboards: `${base}/${p}/_dashboards`,
      // Sem projeto (pai vindo de outro lugar da org) o link vale igual: o
      // DevOps resolve o item pelo id. Com '//' no meio, não.
      workItem: (id) => `${base}${project ? '/' + p : ''}/_workitems/edit/${id}`,
    };
  }

  // ---- Config ----
  function normalizeConfig(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Configuração inválida');
    const base = orgBaseUrl(raw.org);
    const projects = (Array.isArray(raw.projects) ? raw.projects : [])
      .filter((p) => p && p.projectName && p.teamName)
      .map((p, i) => ({
        projectId: String(p.projectId || ''),
        projectName: String(p.projectName),
        teamId: String(p.teamId || ''),
        teamName: String(p.teamName),
        order: Number.isFinite(p.order) ? p.order : i,
        hidden: Boolean(p.hidden),
      }))
      .sort((a, b) => a.order - b.order);
    if (!projects.length) throw new Error('Nenhum projeto selecionado');
    return { org: base, projects, updatedAt: raw.updatedAt || null };
  }

  function exportConfig(config) {
    // nunca inclui o PAT — o token não sai do localStorage
    const { org, projects, updatedAt } = normalizeConfig(config);
    return JSON.stringify({ org, projects, updatedAt }, null, 2);
  }

  // ---- WIQL ----
  const TERMINAL_STATES = ['Done', 'Closed', 'Removed', 'Completed'];

  // Recorte pelas áreas do time — sem ele, times do mesmo projeto contam igual
  /* SÓ OS ÉPICOS do time, pro material dos resumos de produto (16/10/2026).
     A wiqlProdutos traz a árvore inteira (épico, Feature, PBI); pra escrever a
     linha de cada produto basta o épico. */
  function wiqlEpicos(areas) {
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      "AND [System.WorkItemType] = 'Epic'",
      "AND [System.State] <> 'Removed'",
      areaClause(areas),
    ].filter(Boolean).join('\n');
  }
  function areaClause(areas) {
    if (!areas || !areas.length) return '';
    const escapa = (s) => String(s).replace(/'/g, "''");
    return 'AND (' + areas.map((a) =>
      `[System.AreaPath] ${a.children ? 'UNDER' : '='} '${escapa(a.path)}'`
    ).join(' OR ') + ')';
  }

  // A query traz o time inteiro de propósito: o recorte por responsável é
  // client-side (seletor na página filtra os itens do cache) — assim trocar
  // de pessoa não custa outra chamada à API.
  /* O QUE CONTA COMO ENTREGA. Este recorte é a régua da Central inteira: os
     tiles do Panorama, a página de Produtos, o board da sprint e o relatório
     de Entregas leem daqui. Por isso mora numa constante só — três cópias da
     mesma lista é como duas telas passam a dar números diferentes pro mesmo
     mês, que é o defeito que este projeto já pagou caro.

     BugCategory entrou em 05/10/2026, por decisão do Urlan. Até então a
     Central enxergava só RequirementCategory, e nesta organização Bug está na
     categoria de Bug — o que significa que correção não aparecia em lugar
     nenhum: nem no board da sprint, nem nos tiles, nem no relatório. Só na
     Sprint 19 eram ~26 bugs concluídos invisíveis.

     Consequência assumida: o número de "entregues no mês" do relatório sobe, e
     sobe num documento que já foi publicado. A escolha foi contar correção
     como entrega — não existe meia régua. */
  const TIPOS_REQUISITO = [
    "[System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'",
    "[System.WorkItemType] IN GROUP 'Microsoft.BugCategory'",
  ];
  const TIPOS_ENTREGA = [
    "[System.WorkItemType] IN GROUP 'Microsoft.EpicCategory'",
    "[System.WorkItemType] IN GROUP 'Microsoft.FeatureCategory'",
  ].concat(TIPOS_REQUISITO);
  const clausulaDeTipos = (lista) => 'AND (' + lista.join('\n  OR ') + ')';

  function wiqlCounts(doneCutoffDays = 30, areas = []) {
    const naoRemovidos = TERMINAL_STATES.filter((s) => s !== 'Removed').map((s) => `'${s}'`).join(',');
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      clausulaDeTipos(TIPOS_ENTREGA),
      "AND [System.State] <> 'Removed'",
      `AND ([System.State] NOT IN (${naoRemovidos}) OR [System.ChangedDate] >= @Today - ${doneCutoffDays})`,
      areaClause(areas),
    ].filter(Boolean).join('\n');
  }

  /* `pessoa` vazio = o dono do token (@Me). Preenchido = quem está no
     seletor da Central — desde 14/10/2026 o seletor manda em tudo, e "Meus
     itens" era a única tela que continuava presa ao token. Quem chama passa o
     e-mail quando conhece (identifica sem ambiguidade); o nome de exibição
     também funciona no WIQL quando é único. Aspa simples dobrada: é o escape
     do WIQL, e um nome com apóstrofo quebraria a consulta. */
  function wiqlMyItems(pessoa) {
    const terminais = TERMINAL_STATES.map((s) => `'${s}'`).join(',');
    const quem = String(pessoa || '').trim();
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      quem ? `AND [System.AssignedTo] = '${quem.replace(/'/g, "''")}'` : 'AND [System.AssignedTo] = @Me',
      `AND [System.State] NOT IN (${terminais})`,
      'ORDER BY [System.ChangedDate] DESC',
    ].join('\n');
  }

  // ---- Classificação e agregação ----
  // Limitação conhecida: o WIQL de contagens é agnóstico de template (usa categorias),
  // mas este bucketing depende dos nomes de tipo em inglês ('Epic'/'Feature').
  // Tipos renomeados/localizados caem em 'pbi'. Se as contagens parecerem erradas,
  // o caminho certo é mapear via GET /{project}/_apis/wit/workitemtypecategories.
  function levelOf(typeName) {
    if (typeName === 'Epic') return 'epic';
    if (typeName === 'Feature') return 'feature';
    return 'pbi'; // Product Backlog Item, User Story, Bug de requisito…
  }

  function isTerminalState(state) {
    const s = String(state || '').toLowerCase();
    return TERMINAL_STATES.some((t) => t.toLowerCase() === s);
  }

  function aggregateCounts(items) {
    const out = { epic: {}, feature: {}, pbi: {} };
    for (const it of items || []) {
      const f = it.fields || {};
      const level = levelOf(f['System.WorkItemType']);
      const state = f['System.State'] || '—';
      out[level][state] = (out[level][state] || 0) + 1;
    }
    return out;
  }

  function sprintProgress(items) {
    const uteis = (items || []).filter((it) => (it.fields || {})['System.WorkItemType'] !== 'Task');
    const done = uteis.filter((it) => isTerminalState((it.fields || {})['System.State'])).length;
    return { done, total: uteis.length };
  }

  // ---- Meus itens: ordenação e classificação visual do quadro ----
  // Ordem de fluxo pra colunas de estado; estados de atenção vão pro fim (em destaque).
  const STATE_FLOW = [
    'new', 'proposed', 'to do', 'backlog', 'approved', 'ready', 'ready for dev',
    'committed', 'prototype', 'design', 'in progress', 'doing', 'active',
    'in review', 'review', 'resolved', 'test', 'testing', 'qa', 'validação', 'validation',
  ];
  const STATE_ATTENTION = ['impediment', 'impediments', 'blocked', 'on hold', 'waiting'];

  function isAttentionState(state) {
    return STATE_ATTENTION.includes(String(state || '').toLowerCase());
  }

  // Meus itens: três colunas fixas por etapa. Estados crus de vários times
  // multiplicam colunas sem limite (New, Ready, Ready for Dev, Prototype…);
  // a visão pessoal colapsa nos grupos semânticos e o estado real vira
  // etiqueta no cartão. Dentro da etapa, ordena pelo fluxo (sort estável
  // preserva o ChangedDate DESC da query entre itens do mesmo estado).
  function groupMyItemsBuckets(items) {
    const rankEstado = (s) => {
      const i = STATE_FLOW.indexOf(String(s || '').toLowerCase());
      return i === -1 ? 500 : i; // desconhecidos no meio, na ordem de chegada
    };
    const grupos = { todo: [], andamento: [], atencao: [] };
    for (const it of items || []) {
      const bucket = stateBucket(((it || {}).fields || {})['System.State']);
      if (bucket === 'feito') continue; // terminal não é acionável — fora da visão pessoal
      grupos[bucket].push(it);
    }
    for (const lista of Object.values(grupos)) {
      lista.sort((a, b) => rankEstado((a.fields || {})['System.State']) - rankEstado((b.fields || {})['System.State']));
    }
    return ['todo', 'andamento', 'atencao'].map((bucket) => ({ bucket, items: grupos[bucket] }));
  }

  // Slug do tipo pra acento visual (cores oficiais do DevOps ficam no CSS).
  function typeSlug(typeName) {
    const s = String(typeName || '').toLowerCase();
    if (s === 'epic') return 'epic';
    if (s === 'feature') return 'feature';
    if (s === 'bug') return 'bug';
    if (s === 'task') return 'task';
    if (s === 'product backlog item' || s === 'user story') return 'pbi';
    return 'outro';
  }

  // ---- Board dedicado ----
  // WIQL do board de um time: itens de requisito (PBIs/Bugs), recortados
  // pelas áreas do time — é o mesmo recorte que o board do DevOps usa.
  function wiqlBoard(areas, doneCutoffDays = 30) {
    const done = TERMINAL_STATES.filter((s) => s !== 'Removed').map((s) => `'${s}'`).join(',');
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      clausulaDeTipos(TIPOS_REQUISITO),
      "AND [System.State] <> 'Removed'",
      `AND ([System.State] NOT IN (${done}) OR [System.ChangedDate] >= @Today - ${doneCutoffDays})`,
      areaClause(areas),
      'ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC',
    ].filter(Boolean).join('\n');
  }

  // Iniciais do responsável pro selo do cartão ("Urlan Dipre" → "UD")
  function initials(displayName) {
    const partes = String(displayName || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  // Item pertence à sprint corrente? (comparação exata de iteration path)
  function inSprint(item, sprintPath) {
    if (!sprintPath) return false;
    return ((item || {}).fields || {})['System.IterationPath'] === sprintPath;
  }

  /* A API `teamsettings/iterations/{id}/workitems` NÃO devolve "os itens da
     sprint": devolve a HIERARQUIA da sprint. Junto com os itens vêm os pais
     deles — e um pai mora onde quiser. Medido em 05/10/2026 na Sprint 19 do
     Squad Ecommerce: 147 ids devolvidos, 14 com IterationPath de outra
     iteração. Três PBIs apareciam ao mesmo tempo na coluna da 19 e na da 20 do
     Panorama, o que é impossível — um item está numa iteração só.

     O estrago não era visual: o placar da sprint contava os intrusos. O
     Panorama dizia 3/5 numa sprint que tinha 2/2.

     O filtro é por IterationPath exato, que é o mesmo critério do board — as
     duas telas passam a responder a mesma pergunta. Sem path conhecido a lista
     passa inteira: melhor mostrar demais que zerar a tela por falta de um
     campo. */
  function itensDaIteracao(items, sprintPath) {
    const lista = Array.isArray(items) ? items : [];
    if (!sprintPath) return lista.slice();
    return lista.filter((it) => inSprint(it, sprintPath));
  }

  /* QUEM ESTÁ — OU ESTAVA — NESTA ITERAÇÃO.

     O DevOps guarda só a iteração ATUAL de cada item: quem não fechou e foi
     repriorizado some do backlog da sprint antiga sem deixar rastro lá. A
     coluna "Anterior" do Panorama mostrava, por isso, a sprint como ela está
     hoje — não como foi. Caso medido na Sprint 19 em 05/10/2026: o PO via 2
     PBIs; teve 5, e três saíram em 28/09, no dia em que a Sprint 20 começou.

     Histórico item a item (`workitems/{id}/updates`) responde, mas é UMA
     chamada por item — inviável numa tela de abertura com ~170 por sprint. A
     cláusula ASOF do WIQL responde a sprint inteira numa consulta só.

     UM construtor só, e `instante` é a única variável: as duas pontas da
     comparação têm que ser a MESMA pergunta feita em dois momentos. Enquanto
     elas eram consultas diferentes — WIQL de um lado, API da iteração do outro
     — a diferença misturava transbordo com desencontro de definição: 141
     contra 147 na Sprint 19, e itens que nunca saíram apareciam como se
     tivessem saído.

     A cerca de ÁREA entra sempre, e por isso é parâmetro e não opção. Sem ela
     a consulta varre o projeto inteiro: medido, 474 itens contra 236.

     Sem recorte de tipo de propósito: a pergunta aqui é só "quem estava nesta
     iteração". Quem decide o que vira cartão é o mesmo `resumoDeSprint` que
     filtra a lista de hoje. */
  function wiqlIteracao(sprintPath, areas, instante) {
    const escapa = (s) => String(s).replace(/'/g, "''");
    if (!sprintPath) return null;
    const linhas = [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      `AND [System.IterationPath] = '${escapa(sprintPath)}'`,
      areaClause(areas),
    ];
    if (instante !== undefined && instante !== null) {
      const t = Number.isFinite(instante) ? instante : Date.parse(instante);
      if (Number.isNaN(t)) return null;
      // ASOF fecha a consulta: é cláusula de instante, não de filtro.
      linhas.push(`ASOF '${new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')}'`);
    }
    return linhas.filter(Boolean).join('\n');
  }

  /* Transbordou = estava na iteração quando ela fechou e não está mais nela.

     Item que saiu e VOLTOU aparece nos dois conjuntos e não é transbordo — ele
     está lá agora, que é o que a coluna afirma. Item apagado no DevOps também
     cai fora, porque o `getFields` de quem chama o omite. */
  function transbordados(idsNoFim, itensDeHoje) {
    const agora = new Set((itensDeHoje || []).map((it) => (it && it.id)));
    const vistos = new Set();
    return (idsNoFim || []).filter((id) => {
      if (agora.has(id) || vistos.has(id)) return false;
      vistos.add(id);
      return true;
    });
  }

  // Fallback de ordenação de colunas quando a API de colunas falha:
  // ranqueia cada coluna pelo menor rank de fluxo dos estados dos seus itens.
  function orderColumnsFallback(columnNames, statesByColumn) {
    const rankEstado = (s) => {
      const low = String(s || '').toLowerCase();
      if (isAttentionState(low)) return 1000;
      const i = STATE_FLOW.indexOf(low);
      return i === -1 ? 500 : i;
    };
    const rankColuna = (nome) => {
      const estados = (statesByColumn && statesByColumn[nome]) || [];
      if (!estados.length) return 500;
      return Math.min(...estados.map(rankEstado));
    };
    return [...(columnNames || [])].sort((a, b) => rankColuna(a) - rankColuna(b));
  }

  // ---- Resumo por grupos semânticos (cartões de projeto) ----
  // Em vez de um chip por estado (sopa visual), cada nível resume em:
  // a fazer · em andamento · bloqueados · concluídos (30d)
  const TODO_STATES = [
    'new', 'proposed', 'to do', 'todo', 'backlog', 'approved', 'grooming',
    'refinement', 'ready', 'ready for dev', 'committed',
  ];

  function stateBucket(state) {
    const s = String(state || '').toLowerCase();
    if (isAttentionState(s)) return 'atencao';
    if (isTerminalState(s)) return 'feito';
    if (TODO_STATES.includes(s)) return 'todo';
    return 'andamento'; // In Progress, Prototype, Testing, Research, Validation…
  }

  function bucketCounts(porEstado) {
    const out = { todo: 0, andamento: 0, atencao: 0, feito: 0, total: 0 };
    for (const [estado, n] of Object.entries(porEstado || {})) {
      out[stateBucket(estado)] += n;
      out.total += n;
    }
    return out;
  }

  // ---- Filtro genérico de itens (Meus itens e Board) ----
  // filtro: { tipos: [slug]|null, projetos: [nome]|null, resp: nome|'', busca: texto }
  // null/vazio = sem recorte naquela dimensão.
  function filterItems(items, filtro) {
    const f = filtro || {};
    const busca = String(f.busca || '').trim().toLowerCase();
    return (items || []).filter((it) => {
      const flds = (it || {}).fields || {};
      if (f.tipos && f.tipos.length && !f.tipos.includes(typeSlug(flds['System.WorkItemType']))) return false;
      if (f.projetos && f.projetos.length && !f.projetos.includes(flds['System.TeamProject'])) return false;
      if (f.resp) {
        const nome = flds['System.AssignedTo'] && flds['System.AssignedTo'].displayName;
        if (nome !== f.resp) return false;
      }
      if (busca) {
        const alvo = ('#' + it.id + ' ' + (flds['System.Title'] || '')).toLowerCase();
        if (!alvo.includes(busca)) return false;
      }
      return true;
    });
  }

  // ---- Contexto do cartão (Meus itens, visão de PO) ----
  // Rótulo da iteração: último segmento do path; raiz do projeto = Backlog.
  function iterationLabel(path) {
    const partes = String(path || '').split('\\').filter(Boolean);
    return partes.length > 1 ? partes[partes.length - 1] : 'Backlog';
  }

  // ---- Panorama (página de abertura) ----
  // As datas do DevOps chegam em ISO com hora (campos de data vêm à meia-noite
  // UTC), então mês e dia são comparados em UTC de propósito: comparar em fuso
  // local jogaria "2026-09-01T00:00:00Z" para agosto aqui no Brasil.
  const DIAS_PARADO = 14;
  const CAMPO_ALVO = 'Microsoft.VSTS.Scheduling.TargetDate';

  function mesUTC(t) {
    const d = new Date(t);
    return d.getUTCFullYear() * 12 + d.getUTCMonth(); // índice comparável entre anos
  }

  function diaUTC(t) {
    const d = new Date(t);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  function dataValida(v) {
    if (!v) return null;
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }

  /* PARADO NÃO É "AINDA NÃO COMEÇOU" (16/10/2026). A coluna Parados da
     Pendências e o número do Panorama contavam todo item sem mudança há 14 dias
     — e item em New ou To Do, que ninguém puxou ainda, não tem por que mudar:
     ele estava na fila, não esquecido. O Urlan apontou: parado sem atenção é
     coisa que COMEÇOU e deixou de andar. Item na fila não entra; quando entrar
     em andamento e ficar 14 dias sem toque, aí sim.

     Uma regra só, pros dois lugares que contam: duas cópias dela divergem — e o
     número do Panorama deixaria de bater com a lista da Pendências. */
  function estaParado(estado, mudou, hoje, diasParado = DIAS_PARADO) {
    if (mudou === null) return false;
    if (stateBucket(estado) === 'todo') return false;
    return (hoje - diaUTC(mudou)) / 86400000 >= diasParado;
  }

  // Números do Panorama. Item concluído nunca conta como atrasado nem parado.
  // `fechamMes` e `atrasados` são DISJUNTOS: o que ainda vai fechar no mês
  // versus o que já passou da data. Contar o mesmo item nos dois infla a
  // urgência e faz a soma não bater com a lista de "atenção agora".
  // `semDatas` = nenhum item em aberto tem data-alvo; é o que faz a tela dizer
  // "não preenchida no DevOps" em vez de afirmar zero atraso.
  function panoramaKpis(items, agora) {
    const out = { bloqueados: 0, fechamMes: 0, atrasados: 0, parados: 0, semDatas: true };
    const hoje = diaUTC(agora);
    const mesAgora = mesUTC(agora);
    for (const it of items || []) {
      const f = (it || {}).fields || {};
      const estado = f['System.State'];
      if (stateBucket(estado) === 'atencao') out.bloqueados += 1;
      if (isTerminalState(estado)) continue;
      const alvo = dataValida(f[CAMPO_ALVO]);
      if (alvo !== null) {
        out.semDatas = false;
        if (diaUTC(alvo) < hoje) out.atrasados += 1;
        else if (mesUTC(alvo) === mesAgora) out.fechamMes += 1;
      }
      const mudou = dataValida(f['System.ChangedDate']);
      if (estaParado(estado, mudou, hoje)) out.parados += 1;
    }
    return out;
  }

  // Lista curta de "atenção agora": bloqueados primeiro, depois atrasados com a
  // data-alvo mais antiga na frente. Devolve o item ORIGINAL junto do motivo —
  // quem renderiza é que sabe de onde tirar título e link.
  function itensAtencao(items, agora, limite = 6) {
    const hoje = diaUTC(agora);
    const bloqueados = [];
    const atrasados = [];
    for (const it of items || []) {
      const f = (it || {}).fields || {};
      const estado = f['System.State'];
      const alvo = dataValida(f[CAMPO_ALVO]);
      if (stateBucket(estado) === 'atencao') { bloqueados.push({ item: it, motivo: 'bloqueado', alvo }); continue; }
      if (isTerminalState(estado)) continue;
      if (alvo !== null && diaUTC(alvo) < hoje) atrasados.push({ item: it, motivo: 'atrasado', alvo });
    }
    atrasados.sort((a, b) => a.alvo - b.alvo);
    return [...bloqueados, ...atrasados].slice(0, limite);
  }

  // Pendências: tudo que exige ação, em três grupos EXCLUSIVOS.
  // Precedência: bloqueado > atrasado > parado. Um item travado E vencido cai
  // só em bloqueados (impedimento é o fato mais forte), mas carrega marcas
  // secundárias em `tambem` pra informação não se perder. Sem exclusividade,
  // a soma dos grupos não fecharia com o total e o mesmo item apareceria três
  // vezes na mesma tela.
  function pendencias(items, agora, diasParado = DIAS_PARADO) {
    const hoje = diaUTC(agora);
    const grupos = { bloqueados: [], atrasados: [], parados: [] };
    for (const it of items || []) {
      const f = (it || {}).fields || {};
      const estado = f['System.State'];
      if (isTerminalState(estado)) continue; // concluído não é pendência
      const alvo = dataValida(f[CAMPO_ALVO]);
      const mudou = dataValida(f['System.ChangedDate']);
      const atrasado = alvo !== null && diaUTC(alvo) < hoje;
      const dias = mudou === null ? null : Math.floor((hoje - diaUTC(mudou)) / 86400000);
      const parado = estaParado(estado, mudou, hoje, diasParado);
      const bloqueado = stateBucket(estado) === 'atencao';
      if (!bloqueado && !atrasado && !parado) continue;
      const tambem = [];
      const registro = { item: it, alvo, dias, motivo: null, tambem };
      if (bloqueado) {
        registro.motivo = 'bloqueado';
        if (atrasado) tambem.push('atrasado');
        if (parado) tambem.push('parado');
        grupos.bloqueados.push(registro);
      } else if (atrasado) {
        registro.motivo = 'atrasado';
        if (parado) tambem.push('parado');
        grupos.atrasados.push(registro);
      } else {
        registro.motivo = 'parado';
        grupos.parados.push(registro);
      }
    }
    // Cada grupo ordena pelo que o torna grave: travado há mais tempo, mais
    // vencido, mais tempo sem ninguém tocar.
    const maisParado = (a, b) => (b.dias || 0) - (a.dias || 0);
    grupos.bloqueados.sort(maisParado);
    grupos.atrasados.sort((a, b) => a.alvo - b.alvo);
    grupos.parados.sort(maisParado);
    return grupos;
  }

  // ---- Produtos (os épicos como produtos) ----
  // Consulta própria, SEM o corte de 30 dias do wiqlCounts: progresso precisa
  // do histórico inteiro. Um filho concluído em maio conta tanto quanto um de
  // ontem — com o corte, "3 de 8" mentiria quando o certo fosse "3 de 20".
  function wiqlProdutos(areas) {
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      clausulaDeTipos(TIPOS_ENTREGA),
      "AND [System.State] <> 'Removed'",
      areaClause(areas),
    ].filter(Boolean).join('\n');
  }

  // Rollup de descendentes por nó: total e concluídos, em qualquer profundidade,
  // à prova de ciclo de link no DevOps. A consulta de produtos não traz Task,
  // então nada de Task entra na conta; descendente cujo pai ficou fora da
  // consulta (fora da área do time) não é contado — o roll-up só afirma o que
  // enxerga. Serve à página Produtos e ao % de rumo que o report põe no
  // cabeçalho de cada produto.
  function descendentesConcluidos(items) {
    const filhosDe = new Map();
    for (const it of items || []) {
      const pai = ((it || {}).fields || {})['System.Parent'];
      if (pai == null) continue;
      if (!filhosDe.has(pai)) filhosDe.set(pai, []);
      filhosDe.get(pai).push(it);
    }
    const out = new Map();
    for (const raiz of items || []) {
      let total = 0;
      let feitos = 0;
      const pilha = [...(filhosDe.get(raiz.id) || [])];
      const vistos = new Set([raiz.id]); // guarda contra ciclo de link no DevOps
      while (pilha.length) {
        const filho = pilha.pop();
        if (vistos.has(filho.id)) continue;
        vistos.add(filho.id);
        total += 1;
        if (isTerminalState((filho.fields || {})['System.State'])) feitos += 1;
        for (const neto of filhosDe.get(filho.id) || []) pilha.push(neto);
      }
      out.set(raiz.id, { total, feitos });
    }
    return out;
  }

  // Épicos com o progresso rolado dos descendentes (Features e PBIs, em
  // qualquer profundidade).
  const CAMPO_INICIO = 'Microsoft.VSTS.Scheduling.StartDate';
  function produtos(items) {
    const roll = descendentesConcluidos(items);
    const lista = (items || [])
      .filter((it) => levelOf(((it || {}).fields || {})['System.WorkItemType']) === 'epic')
      .map((ep) => ({ item: ep, filhos: roll.get(ep.id) || { total: 0, feitos: 0 } }));
    // O que começa primeiro na frente; sem data de início vai pro fim — ainda
    // não tem planejamento, e deixar no topo empurraria pra baixo o que já tem.
    return lista.sort((a, b) => {
      const da = dataValida((a.item.fields || {})[CAMPO_INICIO]);
      const db = dataValida((b.item.fields || {})[CAMPO_INICIO]);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }

  // Tela interna do épico: achata toda a árvore de Features/PBIs dele (mesma
  // trilha de descendentesConcluidos), Feature antes de PBI e, dentro do
  // nível, quem precisa de atenção primeiro, depois quem anda, depois fila,
  // concluído por último — sem depender de data que pode faltar.
  const RANK_BUCKET_EPICO = { atencao: 0, andamento: 1, todo: 2, feito: 3 };
  function epicoDetalhe(items, epicoId) {
    const porId = new Map((items || []).map((it) => [it.id, it]));
    const epico = porId.get(epicoId);
    if (!epico) return null;
    const filhosDe = new Map();
    for (const it of items || []) {
      const pai = ((it || {}).fields || {})['System.Parent'];
      if (pai == null) continue;
      if (!filhosDe.has(pai)) filhosDe.set(pai, []);
      filhosDe.get(pai).push(it);
    }
    const descendentes = [];
    const pilha = [...(filhosDe.get(epicoId) || [])];
    const vistos = new Set([epicoId]); // guarda contra ciclo de link no DevOps
    while (pilha.length) {
      const it = pilha.pop();
      if (vistos.has(it.id)) continue;
      vistos.add(it.id);
      descendentes.push(it);
      for (const filho of filhosDe.get(it.id) || []) pilha.push(filho);
    }
    descendentes.sort((a, b) => {
      const na = ORDEM_NIVEL[levelOf((a.fields || {})['System.WorkItemType'])];
      const nb = ORDEM_NIVEL[levelOf((b.fields || {})['System.WorkItemType'])];
      if (na !== nb) return na - nb;
      const ra = RANK_BUCKET_EPICO[stateBucket((a.fields || {})['System.State'])];
      const rb = RANK_BUCKET_EPICO[stateBucket((b.fields || {})['System.State'])];
      if (ra !== rb) return ra - rb;
      const ta = String((a.fields || {})['System.Title'] || '');
      const tb = String((b.fields || {})['System.Title'] || '');
      return ta.localeCompare(tb, 'pt-BR');
    });
    return { epico, descendentes };
  }

  // ---- Report mensal (o que foi concluído) ----
  const CAMPO_FECHADO = 'Microsoft.VSTS.Common.ClosedDate';
  const ORDEM_NIVEL = { epic: 0, feature: 1, pbi: 2 };

  // Agrupa os itens concluídos por mês, mais recente primeiro.
  // A data de conclusão preferida é ClosedDate. Quando o template do processo
  // não a preenche, cai em ChangedDate — que para um item terminal é a melhor
  // aproximação disponível, mas erra se alguém editar o item meses depois. Por
  // isso o item volta marcado (`aproximada`) e o mês conta quantos foram assim:
  // a tela avisa em vez de afirmar uma data que não tem.
  /* ---------- Sprints: anterior, atual e próxima ---------- */
  /* O DevOps devolve a sprint corrente sozinho (?$timeframe=current), mas não
     as vizinhas. Pra elas é preciso listar as iterações do time e situá-las no
     tempo — é o que esta função faz, e por isso ela recebe a lista inteira.

     As bordas que ela resolve, e que não se vê olhando a tela: o dia exato da
     virada (o primeiro e o último dia AINDA são da sprint, senão o board diz
     "nenhuma sprint" justo no dia em que mais se olha pra ele), a iteração sem
     data cadastrada (fica de fora: não dá pra situar no tempo), e o time entre
     sprints (atual é null, e inventar uma mentiria sobre o que está em curso). */
  function janelaDeSprints(iteracoes, agora) {
    const t = (v) => {
      const n = v ? Date.parse(v) : NaN;
      return Number.isNaN(n) ? null : n;
    };
    const comData = (Array.isArray(iteracoes) ? iteracoes : [])
      .map((s) => (s ? { s, ini: t(s.start), fim: t(s.finish) } : null))
      .filter((x) => x && x.ini !== null && x.fim !== null)
      .sort((a, b) => a.ini - b.ini);
    /* FIM_DO_DIA nas comparações, e é a MESMA régua do estadoDaSprint, que o
       relatório usa. O `finish` do DevOps é MEIA-NOITE do último dia: sem o
       acréscimo, às 10h do dia em que a sprint fecha ela já conta como passada,
       a coluna "atual" fica sem ninguém e o quadro mostra só anterior e
       próxima. Foi o que o Urlan viu em 09/10/2026, último dia da Sprint 20 —
       enquanto o relatório, na outra tela, dizia "em curso" sobre a mesma
       sprint. O mesmo fato não pode ter duas respostas em duas telas.

       O comentário acima já prometia isto desde sempre; o código é que não
       cumpria. O teste não pegou porque a fixture dele montava o `finish` às
       23:59:59 — uma forma que o DevOps não devolve. */
    const fimReal = (x) => x.fim + FIM_DO_DIA;
    const atual = comData.find((x) => x.ini <= agora && agora <= fimReal(x)) || null;
    // A anterior é a que fechou MAIS PERTO de hoje, não a primeira da lista:
    // com a lista ordenada por início, é a última que já terminou.
    const passadas = comData.filter((x) => fimReal(x) < agora);
    const futuras = comData.filter((x) => x.ini > agora);
    return {
      anterior: passadas.length ? passadas[passadas.length - 1].s : null,
      atual: atual ? atual.s : null,
      proxima: futuras.length ? futuras[0].s : null,
    };
  }

  /* AS VIZINHAS DE UMA SPRINT na linha do tempo do time.

     Serve a navegação dentro do board de uma sprint: estando na Sprint 19, qual
     é a 18 e qual é a 20. Não é "a de antes na lista" — a lista que o DevOps
     devolve não promete ordem —, é a de antes NO CALENDÁRIO.

     Mesma régua do janelaDeSprints, de propósito: ordena por início e descarta
     iteração sem as duas datas. Sprint sem data não tem lugar numa linha do
     tempo, e adivinhar um lugar pra ela faria o "anterior" apontar pra algo que
     o time não reconhece. Se a própria sprint aberta estiver sem data, ela não
     está na lista e o resultado é duas ausências — a navegação some, em vez de
     oferecer um salto arbitrário.

     Casa por ID e não por nome: dois times podem ter "Sprint 20", e o nome é
     editável no DevOps. */
  function vizinhasDaSprint(iteracoes, id) {
    const vazio = { anterior: null, proxima: null };
    if (id === null || id === undefined || id === '') return vazio;
    const t = (v) => {
      const n = v ? Date.parse(v) : NaN;
      return Number.isNaN(n) ? null : n;
    };
    const ordenadas = (Array.isArray(iteracoes) ? iteracoes : [])
      .map((s) => (s ? { s, ini: t(s.start), fim: t(s.finish) } : null))
      .filter((x) => x && x.ini !== null && x.fim !== null)
      .sort((a, b) => a.ini - b.ini)
      .map((x) => x.s);
    const i = ordenadas.findIndex((s) => String(s.id) === String(id));
    if (i < 0) return vazio;
    return {
      anterior: i > 0 ? ordenadas[i - 1] : null,
      proxima: i < ordenadas.length - 1 ? ordenadas[i + 1] : null,
    };
  }

  /* Placar de uma sprint a partir da forma CURTA (a que o app.js guarda no
     cache), e não dos itens crus do DevOps.

     Existe porque o quadro de sprints precisa recontar depois de filtrar por
     responsável: o Urlan viu "50/62" ao lado de dois itens e o número não
     fechava — o placar era do time, a lista era dele. Agora as duas contas
     saem da mesma lista, e há teste travando que esta função e o
     sprintProgress deem o mesmo resultado sobre o mesmo material. Duas réguas
     de "feito" na mesma linha é o defeito que isso impede. */
  function placarDeSprint(itens) {
    const lista = Array.isArray(itens) ? itens : [];
    return { done: lista.filter((x) => x && x.feito).length, total: lista.length };
  }

  /* Itens de uma sprint, na forma CURTA que `placarDeSprint` consome — a ponte
     entre o item cru do DevOps e as duas telas que contam sprint.

     Morava no app.js, que é só da Central. Veio pra cá quando o relatório de
     Entregas passou a mostrar o ritmo das sprints: a alternativa era uma
     segunda função dizendo o que conta como entrega, e duas réguas pra mesma
     pergunta é exatamente o defeito que o `placarDeSprint` existe pra impedir.

     Task fica de fora — mesmo corte que o `sprintProgress` já faz: é sub-item
     de outro item, não uma entrega em si, e contá-la inflaria o placar.

     Guarda `feito` em vez de devolver só os abertos: a coluna da sprint
     ANTERIOR precisa do placar (de todos) e da lista do que não fechou (dos
     abertos), e quem filtra é quem desenha. */
  function resumoDeSprint(itens) {
    return (Array.isArray(itens) ? itens : [])
      .filter((it) => it && ((it.fields || {})['System.WorkItemType']) !== 'Task')
      .map((it) => {
        const f = it.fields || {};
        const at = f['System.AssignedTo'];
        /* `familia` é o estado reduzido às quatro etapas da Central (a fazer,
           em andamento, atenção, concluído). Ela viaja ao lado do estado cru
           porque quem desenha precisa das duas coisas: o TEXTO diz "Testing",
           que é informação que o leitor quer, e a FAMÍLIA é o que pinta o selo
           — e "Testing", "In Progress" e "Prototype" têm que sair da mesma cor.
           Calculada aqui, uma vez, com o mesmo `stateBucket` que ordena a
           lista: selo e ordem discordando seria a lista dizendo duas coisas. */
        const familia = stateBucket(f['System.State']);
        return {
          id: it.id,
          titulo: f['System.Title'] || ('item #' + it.id),
          resp: at && at.displayName ? at.displayName : null,
          tipo: typeSlug(f['System.WorkItemType']),
          estado: f['System.State'] || '',
          familia,
          feito: familia === 'feito',
        };
      });
  }

  /* A sprint vale até o FIM do dia que o DevOps chama de `finish` — ele manda a
     data sem hora útil. Perguntar pela meia-noite devolve a véspera e perde o
     que foi mexido no último dia, que é justamente quando a sprint se decide. */
  const FIM_DO_DIA = 86399000; // 23:59:59 em ms

  /* As sprints que FECHARAM dentro dos meses do documento.

     Fechadas, não "que tocam o período": numa sprint em curso ninguém
     transbordou ainda e o placar sai pela metade — a linha diria 1/12 sobre uma
     sprint que ainda tem uma semana. O `agora` existe por isso, e o FIM_DO_DIA
     também: no último dia a sprint ainda é a sprint.

     Ordem crescente, do mais antigo pro mais novo: é série temporal, e o
     Panorama já lê o ritmo nessa direção. */
  function sprintsDoPeriodo(iteracoes, meses) {
    const alvo = new Set(Array.isArray(meses) ? meses : []);
    if (!alvo.size) return [];
    return (Array.isArray(iteracoes) ? iteracoes : [])
      .map((s) => {
        const fim = s && s.finish ? Date.parse(s.finish) : NaN;
        return Number.isNaN(fim) ? null : { s, fim };
      })
      .filter((x) => x && alvo.has(rotuloMes(x.fim)))
      .sort((a, b) => a.fim - b.fim)
      .map((x) => x.s);
  }

  /* EM QUE PÉ A SPRINT ESTÁ, no instante que o documento declara ser "agora".

     Existe porque o relatório passou a cobrir o mês CORRENTE: em 06/10/2026 as
     duas sprints de outubro ainda não tinham fechado, e a seção sairia vazia num
     documento que fala justamente delas. Então em vez de esconder, a linha diz
     em que pé cada uma está — e os números são lidos à luz disso.

     O instante vem de fora, e não de Date.now(), porque o documento viaja num
     link com os dados congelados. Lá o "agora" é o da geração, e é ele que tem
     que mandar: um link feito em 06/10 que dissesse "fechada" ao ser aberto em
     dezembro estaria afirmando sobre dezembro um número medido em outubro.

     FIM_DO_DIA nas duas pontas: no último dia a sprint ainda é a sprint, e no
     primeiro ela já é. Sem data pra decidir, devolve '' — e quem desenha não
     afirma nada, que é melhor que chutar. */
  function estadoDaSprint(sprint, agora) {
    const t = (v) => {
      const n = v ? Date.parse(v) : NaN;
      return Number.isNaN(n) ? null : n;
    };
    const ini = t(sprint && sprint.start);
    const fim = t(sprint && sprint.finish);
    if (fim !== null && fim + FIM_DO_DIA < agora) return 'fechada';
    if (ini !== null && ini > agora) return 'futura';
    if (ini !== null && fim !== null) return 'corrente';
    return '';
  }

  /* UMA LINHA DO RITMO: o que a sprint entregou e o que escorreu pra seguinte.

     `itensDoDocumento` é a MESMA lista que desenha o resto do relatório — já
     sem sustentação e já no recorte de responsável que o leitor está vendo. É
     o ponto da função: a linha da sprint e o corpo do documento não podem
     contar com réguas diferentes, que foi o defeito de "a capa dizia 28 e o
     leitor contava 8".

     Só nível de requisito (PBI, User Story, Bug). Épico e Feature às vezes têm
     iteração preenchida e entrariam como se fossem entrega da sprint, contando
     duas vezes o trabalho dos filhos.

     `idsAgora` e `idsNoFim` vêm do MESMO construtor (wiqlIteracao), variando só
     o instante — e por isso a diferença entre eles é transbordo, e não
     desencontro de definição. Eles chegam crus de propósito, Task inclusive:
     recortar antes de comparar marcaria como transbordo tudo que o recorte
     tirou. O recorte entra DEPOIS, na hora de dizer quem são os que saíram. */
  function ritmoDaSprint(sprint, idsAgora, idsNoFim, itensDoDocumento, agora) {
    const lista = Array.isArray(itensDoDocumento) ? itensDoDocumento : [];
    const ehRequisito = (it) => levelOf(((it || {}).fields || {})['System.WorkItemType']) === 'pbi';
    const naSprint = itensDaIteracao(lista, sprint && sprint.path).filter(ehRequisito);
    const placar = placarDeSprint(resumoDeSprint(naSprint));
    const porId = new Map(lista.map((it) => [it.id, it]));
    /* Quem saiu e não está em `itensDoDocumento` simplesmente não conta: ou é
       Task, ou é sustentação, ou está fora do recorte, ou mudou de área. Nos
       quatro casos ele não é entrega deste documento, e afirmar o contrário
       encheria a linha de item que o leitor não acharia em lugar nenhum. */
    const saiu = transbordados(idsNoFim, (idsAgora || []).map((id) => ({ id })))
      .map((id) => porId.get(id))
      .filter((it) => it && ehRequisito(it));
    /* Os ITENS, e não só a contagem deles, desde que o documento virou
       acompanhamento: quem abre o link toda semana quer saber o que está
       planejado, e "2 de 12" não responde isso.

       Entregue primeiro, depois o que anda, depois o resto — dentro de cada
       grupo a ordem é a que o DevOps devolveu. É a mesma leitura do board da
       Central, da esquerda pra direita. */
    const curto = resumoDeSprint(naSprint);
    const ordem = (x) => (x.feito ? 0 : (stateBucket(x.estado) === 'andamento' ? 1 : 2));
    const itens = curto.slice().sort((a, b) => ordem(a) - ordem(b));
    const fora = resumoDeSprint(saiu);
    return {
      nome: (sprint && sprint.name) || '',
      path: (sprint && sprint.path) || '',
      start: (sprint && sprint.start) || null,
      finish: (sprint && sprint.finish) || null,
      /* O estado sai DAQUI, junto dos números que ele qualifica, e não do
         desenho: é ele que diz se "2 de 5" é um resultado ou um parcial.
         Separados, nada impediria de viajarem no link medidos em instantes
         diferentes. */
      estado: estadoDaSprint(sprint, agora),
      entregues: placar.done,
      total: placar.total,
      transbordaram: fora.length,
      itens,
      /* Os que saíram ficam em lista PRÓPRIA, e não misturados com `itens`
         sob uma marca: eles não estão mais nesta sprint, e uma lista que
         misturasse os dois precisaria que todo leitor do campo lembrasse de
         filtrar — o tipo de descuido que faz um número sair maior que o outro
         na mesma tela. */
      transbordados: fora,
    };
  }

  /* ---------- Panorama: ritmo e risco ---------- */

  /* Entregas por mês, divididas por frente — o gráfico do Panorama.

     A régua é a MESMA do reportPorMes, e isso não é coincidência de
     implementação, é requisito: o gestor lê "31 itens entregues" no relatório
     de Entregas e abre o Panorama. Se os dois contarem diferente, os dois
     perdem credibilidade. Por isso esta função delega a contagem ao
     reportPorMes em vez de reimplementar o "o que conta como entregue" — há
     teste travando a igualdade.

     Ordem inversa à do reportPorMes (que devolve o mês novo primeiro): gráfico
     se lê da esquerda pra direita, do passado pro presente.

     Mês sem entrega entra com zero. Buraco na série é informação; pular o mês
     encostaria agosto em outubro e mentiria sobre a forma da curva. */
  function evolucaoMensal(items, agora, n = 6) {
    const quantos = Math.max(1, Math.floor(n) || 1);
    const d = new Date(agora);
    // Chaves dos N meses até o corrente, do mais antigo pro mais novo.
    const chaves = [];
    for (let i = quantos - 1; i >= 0; i -= 1) {
      const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      chaves.push(m.getUTCFullYear() + '-' + String(m.getUTCMonth() + 1).padStart(2, '0'));
    }
    const mapa = mapaDeProdutos(items || []);
    const porMes = new Map(reportPorMes(items).map((m) => [m.mes, m]));
    // Frente de um item: o épico ancestral. Sem épico na cadeia o item NÃO
    // some — ele divergiria o total do gráfico do total do relatório, que é o
    // que a régua única existe pra impedir. Vai pra uma frente visível.
    const SEM_FRENTE = { id: null, nome: 'Sem frente' };
    const frentes = new Map();
    const meses = chaves.map((chave) => {
      const reg = porMes.get(chave);
      const conta = new Map();
      for (const r of (reg ? reg.itens : [])) {
        const pai = mapa.get(r.item.id);
        const f = pai ? { id: pai.id, nome: pai.titulo } : SEM_FRENTE;
        if (!frentes.has(f.id)) frentes.set(f.id, f);
        conta.set(f.id, (conta.get(f.id) || 0) + 1);
      }
      const porFrente = [...conta.entries()]
        .map(([id, qtd]) => ({ id, nome: frentes.get(id).nome, n: qtd }))
        .sort((a, b) => b.n - a.n);
      return { mes: chave, total: reg ? reg.total : 0, porFrente };
    });
    return { meses, frentes: [...frentes.values()] };
  }

  /* Retrato de risco do roadmap — a resposta a "os projetos vão chegar na data".

     Vem daqui e não do DevOps por um motivo medido em 02/10/2026: dos 8 épicos
     do time, 5 não tinham nenhum filho e 4 não tinham data de fim. Gráfico de
     previsibilidade em cima disso pareceria confiante e estaria mentindo. O
     roadmap é curado à mão e tem início, fim e status nos 13 projetos.

     Devolve números e lista; NÃO escreve texto. Quem desenha escolhe a palavra
     — "vence em 12 dias" ou "12 dias de atraso" é decisão de tela. */
  function riscoDoRoadmap(itens, agora) {
    const dia = 86400000;
    const hoje = Date.UTC(new Date(agora).getUTCFullYear(),
      new Date(agora).getUTCMonth(), new Date(agora).getUTCDate());
    const t = (s) => Date.parse(s + 'T00:00:00Z');
    let total = 0; // projetos com janela válida — o denominador do "X de Y"
    let concluidos = 0;
    let vencidos = 0;
    let emCurso = 0;
    const lista = [];
    for (const it of (Array.isArray(itens) ? itens : [])) {
      if (!it || typeof it.inicio !== 'string' || typeof it.fim !== 'string') continue;
      const inicio = t(it.inicio);
      const fim = t(it.fim);
      if (Number.isNaN(inicio) || Number.isNaN(fim)) continue;
      total += 1;
      // "concluido" é o único status que diz entregue. "teste" e "andamento"
      // ainda não entregaram, e com prazo estourado viram risco — tratá-los
      // como entrega apagaria justamente o que o painel existe pra mostrar.
      const feito = it.status === 'concluido';
      const vencido = !feito && fim < hoje;
      // Sem status, janela aberta hoje já conta como em curso: é o caso do
      // Subscription, que começou em 01/10/2026 e seguia marcado "previsto".
      // Deixá-lo de fora esconderia o item cujo cadastro está atrasado.
      const curso = !feito && !vencido && inicio <= hoje && hoje <= fim;
      if (feito) concluidos += 1;
      if (vencido) vencidos += 1;
      if (curso) emCurso += 1;
      if (vencido || curso) {
        lista.push({
          titulo: it.titulo,
          inicio: it.inicio,
          fim: it.fim,
          status: it.status || null,
          vencido,
          diasRestantes: Math.round((fim - hoje) / dia),
        });
      }
    }
    // Vencido primeiro: é o que exige ação. Dentro do grupo, o prazo mais
    // apertado na frente.
    lista.sort((a, b) => (Number(b.vencido) - Number(a.vencido)) || (a.diasRestantes - b.diasRestantes));
    return { total, concluidos, emCurso, vencidos, lista };
  }

  /* ---------- Roadmap ---------- */
  /* O roadmap é a única peça que não vem do DevOps: vive em assets/conteudo/<po>/roadmap.json,
     escrito à parte, porque o Notion não pode ser chamado do navegador.

     Mora aqui, e não no report.js onde nasceu, desde 02/10/2026: a Central
     passou a ler o mesmo arquivo (bloco Roadmap do Panorama) e a lista branca
     de status abaixo é um portão — duplicá-la seria repetir de propósito o
     defeito que tests/roadmap-portao.test.js existe pra impedir.

     O arquivo é nosso, mas tratar o dado como se pudesse vir torto é grátis e
     evita NaN se algum dia alguém editar à mão e errar uma data. */
  /* A CHAVE DE UMA PESSOA no roadmap: primeiro nome, sem acento, em minúscula.

     Mesma régua que o filtro de responsável da Central já usava, e pelo mesmo
     motivo: o DevOps devolve o nome de exibição completo, e esse nome muda sem
     avisar — sobrenome que entra ou sai, nome social, grafia diferente entre
     contas. Casar pela string inteira faria o roadmap da pessoa sumir calado no
     dia em que ela corrigisse o próprio nome no DevOps. */
  function chaveDePessoa(nome) {
    return String(nome || '').trim().split(/\s+/)[0]
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /* A FICHA DE CADA PO: o que muda de uma pra outra dentro do documento.

     Uma declaração só, e aqui, porque a mesma pessoa já aparece em quatro
     lugares — a lista do seletor da Central, o bloco do roadmap, os cartões de
     cada edição e o rodapé. Listas paralelas divergem na primeira vez que
     alguém entra ou sai do time, e a divergência sai publicada: foi um nome
     seguindo um caminho e o conteúdo seguindo outro que, em 13/10/2026, pôs a
     assinatura de uma PO em cima das entregas de outro.

     `unidade` e `area` são os dois registros da retranca, separados por um fio
     desenhado no CSS: ONDE e O QUÊ. `email` é o contato do rodapé.

     Não guarda o nome completo de propósito: quem diz o nome é o DevOps, e a
     chave existe justamente porque esse nome muda sem avisar. */
  const FICHA_POR_PO = {
    urlan: { unidade: 'Ybera US', area: 'E-commerce', email: 'urlan.dipre@ybera.com' },
    isadora: { unidade: 'Ybera Global', area: 'Loja interna', email: 'isadora.brunner@ybera.com' },
    daniele: { unidade: 'Ybera Brasil', area: 'E-commerce', email: 'daniele.depaula@ybera.com' },
    // Unidade e área da Carla inferidas do conteúdo dela (Club, Escritório Virtual): confirmar.
    carla: { unidade: 'Ybera Club', area: 'Escritório Virtual', email: 'carla.ferraz@ybera.com' },
  };

  /* Aceita o nome de exibição ou a chave já resolvida — quem chama nem sempre
     tem a mesma coisa na mão, e exigir uma das duas formas espalharia
     `chaveDePessoa` por todo lugar que precisa de um email.

     DEVOLVE `null` pra quem não está na lista, e não uma ficha genérica: o
     documento sabe o que fazer com "não sei quem é" (mantém o que já tinha),
     e não saberia o que fazer com uma unidade inventada. */
  function fichaDaPessoa(quem) {
    return FICHA_POR_PO[chaveDePessoa(quem)] || null;
  }

  /* O ENDEREÇO DO CONTEÚDO DE UMA PO — assets/conteudo/<chave>/<arquivo>.

     Um lugar só pra regra do caminho, porque são dois leitores (a Central e o
     relatório) e dois tipos de arquivo (roadmap e edição), e o editor que vier
     vai gravar no mesmo endereço que eles leem. Duas cópias desta regra
     divergem na primeira pasta que mudar de nome, e aí a PO publica num lugar
     e a tela lê de outro — sem erro nenhum, só conteúdo que não aparece.

     A chave é codificada; o `arquivo` não, porque é escrito por quem chama e
     pode ter subpasta ("edicoes/2026-10.json"). */
  function caminhoDoConteudo(chave, arquivo) {
    return 'assets/conteudo/' + encodeURIComponent(String(chave || '')) + '/' + arquivo;
  }

  /* OS CARTÕES DE UMA EDIÇÃO, saneados.

     Desde 13/10/2026 os cartões são DADO, não código: saíram do .js e foram pra
     um arquivo por PO, pra que cada uma escreva os dela sem desenvolvedor. E
     dado que vem de arquivo editável entra pelo mesmo portão do roadmap —
     vocabulário fechado, texto cortado, número conferido.

     O portão não é paranoia com o arquivo: é o que impede que uma palavra
     digitada por engano vire classe de CSS, e que um `progresso` sem total
     vire NaN no meio da barra. Campo fora da lista some; cartão sem título
     some inteiro, porque título é a única coisa que todo cartão tem.

     A lista branca abaixo é a MESMA forma que o briefing desenha. Quem
     acrescentar um campo lá acrescenta aqui, senão o campo novo é escrito no
     arquivo, some no saneamento, e ninguém vê erro nenhum. */
  function saneCartoes(lista) {
    const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
    const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
    const STATUS = ['entregue', 'andamento', 'teste'];
    return (Array.isArray(lista) ? lista : []).map((c) => {
      const o = c && typeof c === 'object' ? c : {};
      const cartao = { titulo: txt(o.titulo, 200) };
      if (!cartao.titulo) return null;
      /* `resumo` tem duas formas de propósito: string é parágrafo, e
         `{ nota }` é a observação com desenho próprio. Misturá-las numa só
         apagaria a diferença que o leitor vê na tela. */
      /* `[].concat` porque o briefing aceita as DUAS formas e há cartão escrito
         de cada jeito: `resumo: 'uma frase'` e `resumo: ['um', 'dois']`.
         Tratar só a lista apagava, em silêncio, o texto de todo cartão de
         parágrafo único — e o cartão continuava na tela, com o título e sem o
         texto, que é a falha que não parece falha. */
      cartao.resumo = [].concat(o.resumo || []).map((par) => {
        if (typeof par === 'string') return txt(par, 2000);
        const nota = txt((par || {}).nota, 2000);
        return nota ? { nota } : '';
      }).filter(Boolean);
      if (STATUS.includes(o.status)) cartao.status = o.status;
      for (const campo of ['iniciativa', 'produto', 'pasta']) {
        const v = txt(o[campo], 200);
        if (v) cartao[campo] = v;
      }
      if (num(o.epicoId) !== null) cartao.epicoId = num(o.epicoId);
      if (num(o.contaFixa) !== null) cartao.contaFixa = num(o.contaFixa);
      if (o.foraDoRoadmap === true) cartao.foraDoRoadmap = true;
      if (Array.isArray(o.featureIds)) {
        const ids = o.featureIds.map(num).filter((n) => n !== null);
        if (ids.length) cartao.featureIds = ids;
      }
      if (Array.isArray(o.imagens)) {
        const imgs = o.imagens.map((im) => {
          const arquivo = txt((im || {}).arquivo, 200);
          /* Caminho que sobe de pasta é o jeito de um arquivo de conteúdo
             apontar pra fora da pasta da PO. A legenda é livre; o caminho não. */
          if (!arquivo || arquivo.indexOf('..') >= 0 || arquivo.charAt(0) === '/') return null;
          return { arquivo, legenda: txt((im || {}).legenda, 200) };
        }).filter(Boolean);
        if (imgs.length) cartao.imagens = imgs;
      }
      const href = txt((o.link || {}).href, 1000);
      // Só http(s): `javascript:` num arquivo editável vira execução na página.
      if (/^https?:\/\//i.test(href)) {
        cartao.link = { href, rotulo: txt((o.link || {}).rotulo, 200) };
      }
      const prog = o.progresso || {};
      if (num(prog.feito) !== null && num(prog.total) !== null && num(prog.total) > 0) {
        cartao.progresso = { feito: num(prog.feito), total: num(prog.total) };
        const rot = txt(prog.rotulo, 100);
        if (rot) cartao.progresso.rotulo = rot;
      }
      return cartao;
    }).filter(Boolean);
  }

  /* Uma edição inteira: o período que ela cobre e os cartões dela. */
  function saneEdicao(doc) {
    const o = doc && typeof doc === 'object' ? doc : {};
    const periodo = (Array.isArray(o.periodo) ? o.periodo : [])
      .filter((m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m));
    return { periodo, cartoes: saneCartoes(o.cartoes), frentes: saneFrentes(o.frentes) };
  }

  /* COMO CADA FRENTE SE APRESENTA NO DOCUMENTO (26/10/2026).

     O cartão automático nasce de uma Feature e cai em "Outras entregas" quando
     nenhuma linha do roadmap a reivindica. Faltava um jeito de o PO dizer
     "esta frente é uma seção, e quero as entregas dela como cartões" sem
     inventar uma linha de roadmap — porque linha de roadmap desenha barra no
     Gantt e conta como projeto na capa, e nem toda frente é projeto.

     Mora no arquivo da EDIÇÃO, junto dos cartões escritos: é decisão de como
     aquele mês se apresenta, e é do PO. A chave é o id da Feature, em texto,
     porque chave de objeto JSON é sempre texto.

     `porItem` é a diferença entre um cartão com lista dentro e um cartão por
     PBI entregue. Os dois saem do mesmo dado; o que muda é o desenho. */
  function saneFrentes(obj) {
    const out = {};
    if (!obj || typeof obj !== 'object') return out;
    for (const k of Object.keys(obj)) {
      if (!/^\d+$/.test(k)) continue;
      const v = obj[k] || {};
      const iniciativa = String(v.iniciativa || '').trim().slice(0, 80);
      out[k] = {
        iniciativa,
        foraDoRoadmap: v.foraDoRoadmap === true,
        porItem: v.porItem === true,
      };
    }
    return out;
  }

  /* DE ONDE VÊM OS DADOS DE UMA PO, para quem busca sem navegador (a função da
     Vercel). No navegador isso mora na config do localStorage de cada um; a
     função não tem localStorage, então lê assets/conteudo/<po>/fontes.json.

     Não é segredo — organização e nome de time —, mas é entrada: a org só vale
     se for do dev.azure.com (o token vai junto pra esse endereço), e time sem
     os dois nomes some. Inválido devolve null, e quem chama recusa a PO. */
  function saneFontes(obj) {
    const o = obj && typeof obj === 'object' ? obj : {};
    let org = '';
    try { org = orgBaseUrl(o.org); } catch (e) { return null; }
    const txt = (v) => String(v == null ? '' : v).trim().slice(0, 120);
    const times = (Array.isArray(o.times) ? o.times : []).slice(0, 10)
      .map((t) => ({ projectName: txt((t || {}).projectName), teamName: txt((t || {}).teamName) }))
      .filter((t) => t.projectName && t.teamName);
    return times.length ? { org, times } : null;
  }

  /* OS CARTÕES AUTOMÁTICOS DA ABA ENTREGAS (15/10/2026).

     Até aqui um cartão só existia se alguém o escrevesse, e o relatório do mês
     mostrava o que deu tempo de escrever — não o que o time entregou. Em 14/10
     eram 2 cartões contra 6 PBIs concluídas fora deles, e quem lia achava que
     só aquilo tinha saído.

     Agora toda Feature que teve PBI concluída no período vira um cartão, com a
     lista do que fechou. O texto escrito à mão continua mandando: frente que já
     tem cartão escrito (pelo `featureIds` dele) não ganha o automático.

     `automaticosDoMaterial` recebe o material de `entregasConcluidas` (o mesmo
     do bloco local `_entregas`) e devolve SÓ o que pode ir a público: nome da
     Feature e do épico, e título, data e linha de resumo de cada PBI. A
     descrição crua fica para trás — ela é o motivo de o `_entregas` nunca ser
     publicado. Item sem Feature não vira cartão: sem a frente não há título
     honesto pra pôr em cima dele. */
  function automaticosDoMaterial(material, resumos) {
    const m = material && typeof material === 'object' ? material : {};
    const linhas = resumos && typeof resumos === 'object' ? resumos : {};
    const porFrente = new Map();
    for (const fr of (Array.isArray(m.frentes) ? m.frentes : [])) {
      if (!fr || !fr.feature || !fr.chave) continue;
      porFrente.set(fr.chave, {
        feature: fr.feature,
        epico: fr.epico || null,
        /* A frente fechou quando não sobrou PBI em aberto nela. Viaja como
           booleano, e não como a contagem: quem lê o documento não precisa
           saber QUANTAS faltam — e o número de itens em aberto de uma frente é
           dado interno que não tem por que sair daqui. */
        fechada: Number(fr.abertas || 0) === 0,
        itens: [],
      });
    }
    for (const it of (Array.isArray(m.itens) ? m.itens : [])) {
      const fr = it && porFrente.get(it.frente);
      if (!fr) continue;
      fr.itens.push({
        id: it.id,
        titulo: it.titulo,
        fechadoEm: it.fechadoEm,
        resumo: (linhas[String(it.id)] || {}).resumo || '',
      });
    }
    return saneAutomaticos([...porFrente.values()]);
  }

  /* Forjável como todo o resto do pacote: id vira número, texto vira texto
     curto, e a lista tem teto. Frente sem item nenhum some — cartão vazio
     dizendo que algo foi entregue seria mentira. */
  function saneAutomaticos(lista) {
    const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
    const txt = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
    const data = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    return (Array.isArray(lista) ? lista : []).slice(0, 40)
      .filter((f) => f && f.feature && num(f.feature.id) && txt(f.feature.nome, 200))
      .map((f) => ({
        feature: { id: num(f.feature.id), nome: txt(f.feature.nome, 200) },
        epico: f.epico && num(f.epico.id) ? { id: num(f.epico.id), nome: txt(f.epico.nome, 200) } : null,
        /* TRÊS estados, não dois: `true`, `false` e AUSENTE. Pacote montado
           antes disto existir (a edição congelada, um link já compartilhado)
           não sabe se a frente fechou — e `false` ali faria o documento afirmar
           "em andamento" sobre frente que já acabou. Ausente, o cartão não
           ganha selo, que é a verdade: não se sabe. */
        fechada: (f.fechada === true || f.fechada === false) ? f.fechada : undefined,
        itens: (Array.isArray(f.itens) ? f.itens : []).slice(0, 60)
          .filter((x) => x && num(x.id) && txt(x.titulo, 300))
          .map((x) => ({
            id: num(x.id),
            titulo: txt(x.titulo, 300),
            fechadoEm: data(x.fechadoEm),
            resumo: txt(x.resumo, 400),
          })),
      }))
      .filter((f) => f.itens.length);
  }

  /* QUANDO UM PERÍODO FECHA: meia-noite de Brasília do dia 1º seguinte ao
     último mês (03h UTC). Uma regra só, porque dois lugares a usam — a capa
     (selo "em andamento") e a função da Vercel (cache de mês fechado) — e
     duas cópias divergiriam: a função cachearia por um dia um mês que a capa
     ainda marca aberto. Devolve o instante em ms, ou null se o período não
     tem mês válido. */
  function fimDoPeriodo(chaves) {
    const lista = Array.isArray(chaves) ? chaves : [];
    const [ano, mes] = String(lista[lista.length - 1] || '').split('-').map(Number);
    if (!ano || !mes || mes < 1 || mes > 12) return null;
    return Date.UTC(ano, mes, 1, 3);
  }
  function periodoFechado(chaves, agora) {
    const fecha = fimDoPeriodo(chaves);
    return fecha !== null && Number(agora) >= fecha;
  }

  function saneRoadmapItens(lista) {
    const dataValida = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
      && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
    return (Array.isArray(lista) ? lista : [])
      .filter((x) => x && dataValida(x.inicio) && dataValida(x.fim)
        && Date.parse(x.inicio + 'T00:00:00Z') <= Date.parse(x.fim + 'T00:00:00Z'))
      .map((x) => ({
        titulo: String(x.titulo || '').slice(0, 200) || 'Sem título',
        inicio: x.inicio,
        fim: x.fim,
        /* Lista branca de status. Qualquer outro valor (ou nenhum) vira null —
           "não afirmo nada sobre esta iniciativa", que é o estado certo pra um
           item que ainda é só janela no calendário.

           ESTA LISTA É O PORTÃO: um status novo em roadmap.json não chega ao
           desenho sem passar por aqui, por mais que o briefing saiba desenhá-lo.
           Foi o que aconteceu com 'teste': o dado dizia, o briefing sabia, e o
           item saía sem selo e com barra neutra porque o saneamento o zerava no
           meio do caminho. Quem acrescentar um status ali acrescenta aqui. */
        status: (x.status === 'concluido' || x.status === 'andamento' || x.status === 'teste')
          ? x.status : null,
        /* A PONTE COM O BOARD (21/10/2026). As Features declaradas aqui
           pertencem a esta linha do roadmap. Sem isso, o cartão automático de
           uma Feature não tem iniciativa nenhuma e cai em "Outras entregas" —
           mesmo quando a frente É projeto do roadmap, como aconteceu com o
           Subscription, que ficou fora da conta da capa.

           Feature, e não épico: o épico é grosso demais. "Loja Clube USA"
           cobre o Subscription E o Compliance Google, que são duas linhas
           distintas daqui; pelo épico as duas viriam coladas numa seção só. */
        featureIds: (Array.isArray(x.featureIds) ? x.featureIds : [])
          .map((n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : null))
          .filter((n) => n !== null),
      }));
  }

  /* O RECORTE DAS ENTREGAS QUANDO A EDIÇÃO SE ALINHA ÀS SPRINTS (22/10/2026).

     O documento tinha DUAS RÉGUAS. As entregas eram cortadas pelo calendário
     (fechou em outubro, é de outubro) e as sprints pela data de fechamento
     delas (a Sprint 20 vai de 28/09 a 09/10 e pertence a outubro, inteira).
     Resultado: a sprint que começa em 26/10 e fecha em 06/11 só aparece em
     novembro, mas tudo que ela entregar entre 26 e 31 de outubro já contava em
     outubro — o leitor via itens que não pertenciam a sprint nenhuma na lista.
     Foi o que o Urlan notou enviando o relatório no fim do mês.

     Agora a edição mensal corta do COMEÇO da primeira sprint que fecha nela
     até o FIM da última. Outubro vira 28/09 a 23/10. O nome da edição e o
     seletor não mudam: só a janela.

     Devolve `null` quando não há sprint com data — e aí quem chama volta pro
     mês cheio, que é o certo pra PO sem sprint e pra edição congelada. */
  function recorteDasSprints(linhas) {
    const dia = (v) => {
      const d = String(v == null ? '' : v).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    };
    let inicio = null;
    let fim = null;
    for (const l of (Array.isArray(linhas) ? linhas : [])) {
      const i = dia(l && l.start);
      const f = dia(l && l.finish);
      if (i !== null && (inicio === null || i < inicio)) inicio = i;
      if (f !== null && (fim === null || f > fim)) fim = f;
    }
    return (inicio !== null && fim !== null) ? { inicio, fim } : null;
  }

  /* A janela como ela chega do outro lado (link, arquivo, função). É texto numa
     URL como todo o resto do pacote: ou são duas datas AAAA-MM-DD em ordem, ou
     não é janela nenhuma. */
  function saneJanela(j) {
    const dia = (v) => {
      const d = String(v == null ? '' : v).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) ? d : null;
    };
    const o = j && typeof j === 'object' ? j : {};
    const inicio = dia(o.inicio);
    const fim = dia(o.fim);
    return (inicio !== null && fim !== null && inicio <= fim) ? { inicio, fim } : null;
  }

  function reportPorMes(items) {
    const meses = new Map();
    for (const it of items || []) {
      const f = (it || {}).fields || {};
      if (!isTerminalState(f['System.State'])) continue;
      const fechado = dataValida(f[CAMPO_FECHADO]);
      const alterado = dataValida(f['System.ChangedDate']);
      const quando = fechado !== null ? fechado : alterado;
      if (quando === null) continue; // sem nenhuma data não há mês onde colocar
      const d = new Date(quando);
      const chave = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
      if (!meses.has(chave)) meses.set(chave, { mes: chave, itens: [], aproximados: 0, total: 0, porNivel: null });
      const registro = meses.get(chave);
      registro.itens.push({ item: it, quando, aproximada: fechado === null });
      if (fechado === null) registro.aproximados += 1;
    }
    const nivelDe = (r) => levelOf(((r.item || {}).fields || {})['System.WorkItemType']);
    return [...meses.values()]
      .map((m) => {
        // épico antes de feature antes de PBI; dentro do nível, o mais recente
        m.itens.sort((a, b) => (ORDEM_NIVEL[nivelDe(a)] - ORDEM_NIVEL[nivelDe(b)]) || (b.quando - a.quando));
        m.total = m.itens.length;
        m.porNivel = { epic: 0, feature: 0, pbi: 0 };
        for (const r of m.itens) m.porNivel[nivelDe(r)] += 1;
        return m;
      })
      .sort((a, b) => (a.mes < b.mes ? 1 : a.mes > b.mes ? -1 : 0)); // mês mais novo primeiro
  }

  /* SUSTENTAÇÃO NÃO É ENTREGA (decisão do Urlan, 05/10/2026).

     Correção conta como entrega — por isso BugCategory entrou na régua —, mas
     o que está pendurado no guarda-chuva de Sustentação é manutenção: entra na
     sprint, ocupa o time, e não é o que o relatório mensal promete contar.

     O item em si não se chama "Sustentação": o bug se chama "Cobrança
     incorreta de frete…" e é o PAI dele que é o guarda-chuva. Por isso a regra
     sobe a cadeia inteira, e não olha só o título de quem está sendo contado.

     O casamento é por TÍTULO, e isso é uma fraqueza conhecida: o guarda-chuva
     é um PBI novo a cada sprint ("Sustentação Sprint 19", "Sustentação Sprint
     20"), não um épico fixo que pudesse ser referenciado por id. Se alguém
     renomear o item, os filhos voltam a contar como entrega sem erro nenhum na
     tela. A âncora no começo do título é de propósito: "Bug na sustentação do
     checkout" é entrega de verdade e não pode cair aqui. */
  const PADRAO_MANUTENCAO = /^[\s[\](){}.,:\-–—]*sustenta[çc][ãa]o\b/i;
  function ehItemDeManutencao(titulo) {
    return PADRAO_MANUTENCAO.test(String(titulo || ''));
  }

  /* Ids do ramo de manutenção: o guarda-chuva e tudo que desce dele.
     Recebe a base COMPLETA (itens + pais), porque o guarda-chuva pode estar
     fora do recorte de quem se está contando. */
  function idsDeManutencao(items) {
    const lista = Array.isArray(items) ? items : [];
    const porId = new Map(lista.map((it) => [it.id, it]));
    const resposta = new Map();
    const resolver = (inicio) => {
      const caminho = [];
      const vistos = new Set();
      let atual = inicio;
      while (atual !== null && atual !== undefined && !vistos.has(atual) && !resposta.has(atual)) {
        vistos.add(atual);
        const it = porId.get(atual);
        if (!it) break; // pai fora da base: não dá pra afirmar, e na dúvida conta
        caminho.push(atual);
        if (ehItemDeManutencao((it.fields || {})['System.Title'])) { resposta.set(atual, true); break; }
        atual = (it.fields || {})['System.Parent'];
      }
      const herdado = resposta.has(atual) ? resposta.get(atual) : false;
      for (const id of caminho) if (!resposta.has(id)) resposta.set(id, herdado);
      return resposta.get(inicio) === true;
    };
    const fora = new Set();
    for (const it of lista) if (resolver(it.id)) fora.add(it.id);
    return fora;
  }

  /* `base` é de onde se lê a cadeia de pais; `items` é o que se filtra. São
     conjuntos diferentes no report: o pai costuma estar fora do recorte do PO. */
  function foraDaManutencao(items, base) {
    const fora = idsDeManutencao(base || items);
    return (Array.isArray(items) ? items : []).filter((it) => it && !fora.has(it.id));
  }

  // Produto de cada item: sobe a cadeia de pais e devolve o primeiro Épico.
  // Sem épico na cadeia, devolve o ancestral mais alto que achou — uma Feature
  // já diz muito mais que "sem produto associado", e é o que o DevOps tem.
  // Descrição do épico vem como HTML do editor do DevOps. Pro report vira texto:
  // quebras de bloco viram linha, o resto das tags sai, entidades voltam ao
  // caractere. Não é sanitização de HTML confiável — é extração de texto; quem
  // renderiza (briefing) ESCAPA o resultado, então nada de tag sobra viva.
  function descricaoLimpa(html) {
    if (!html) return '';
    let s = String(html)
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    /* Entidades. As NUMÉRICAS primeiro, e genéricas (&#233; ou &#xE9;): cobrem
       qualquer caractere, e são o que a maioria dos editores emite.

       As NOMEADAS acentuadas vêm de texto colado de Word e afins, e passavam
       cruas — "c&aacute;lculo" chegava assim na tela. Não é só da sonda que
       mediu isto: `pedidoDeDecisao` lê daqui, então um pedido de decisão com
       acento colado saía com a entidade à mostra num documento de stakeholder.

       `&amp;` por último, senão "&amp;lt;" viraria "<" em vez de "&lt;". */
    const NOMEADAS = {
      nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…',
      ndash: '–', mdash: '—', lsquo: '\u2018', rsquo: '\u2019',
      ldquo: '\u201c', rdquo: '\u201d', ordm: 'º', ordf: 'ª', deg: '°',
      aacute: 'á', agrave: 'à', atilde: 'ã', acirc: 'â', auml: 'ä',
      eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
      iacute: 'í', icirc: 'î', iuml: 'ï',
      oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö',
      uacute: 'ú', ucirc: 'û', uuml: 'ü', ccedil: 'ç', ntilde: 'ñ',
    };
    s = s
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      // Nome casado sem distinguir caixa, mas a MAIÚSCULA do nome é outra letra:
      // &Aacute; é Á, não á. Por isso a decisão é pela primeira letra do nome.
      .replace(/&([a-z]+);/gi, (inteiro, nome) => {
        const base = NOMEADAS[nome.toLowerCase()];
        if (base === undefined) return inteiro; // entidade que não conheço fica como está
        return /^[A-Z]/.test(nome) && /[a-zà-ÿ]/.test(base) ? base.toUpperCase() : base;
      })
      .replace(/&amp;/gi, '&');
    return s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  /* IMPRESSÃO DIGITAL DE UM TEXTO. Serve pra uma pergunta só: a descrição desta
     PBI é a mesma que gerou o resumo guardado, ou mudou no DevOps desde então?

     FNV-1a, de propósito, e não SHA via crypto.subtle: aquele é assíncrono e
     só existe em contexto seguro, e esta conta roda no navegador DURANTE a
     montagem do pacote e também no node, nos testes. Não é segurança — é
     detectar mudança —, e pra isso 32 bits em 8 dígitos hexadecimais bastam:
     a alternativa a uma colisão improvável é um resumo desatualizado, não um
     furo. Guardar a descrição inteira pra comparar seria pôr o texto cru no
     arquivo público, que é o que este projeto está evitando.

     Normaliza espaço antes: reindentar a descrição no DevOps não é mudança de
     conteúdo, e regerar por isso custaria à toa. */
  function digitalDoTexto(texto) {
    const s = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      // O FNV-1a multiplica por 16777619; em JS o >>> 0 mantém 32 bits sem sinal.
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  /* O CONTRATO DO assets/resumos.json, lido nas DUAS telas que o usam.

     O arquivo é editorial: uma linha por PBI, escrita à mão a partir da
     descrição inteira. O relatório publica essa linha nos cartões de sprint; a
     Central mostra a mesma linha no quadro de sprints do Panorama — e é a MESMA
     linha de propósito, senão a mesma PBI teria duas explicações diferentes em
     duas telas do mesmo projeto.

     Mora no core porque são dois leitores. Era uma função dentro do report.js, e
     uma segunda cópia no app.js divergiria da primeira no dia em que o corte de
     240 mudasse num e não no outro — o arquivo passaria a significar uma coisa
     pra quem publica e outra pra quem olha.

     Chave que não é id numérico não entra, e linha vazia não entra: o arquivo é
     escrito à mão, e o que ele promete é id -> texto. */
  function saneResumos(obj) {
    const out = {};
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (!/^\d+$/.test(k)) continue;
        const v = obj[k] || {};
        const resumo = String(v.resumo || '').trim().slice(0, 240);
        if (!resumo) continue;
        out[k] = { resumo, de: String(v.de || '').trim().slice(0, 64) };
      }
    }
    return out;
  }

  /* PRECISA DE LINHA NOVA? Uma pergunta, três lugares que a fazem (o bloco local
     do "Publicar dados", a varredura automática da Vercel e a mescla abaixo).
     - sem linha, ou linha de uma descrição que mudou desde então: precisa;
     - linha SEM `de` foi escrita à mão: nunca se regera, mesmo que a descrição
       mude — quem escreveu decide quando reescrever. */
  function precisaDeLinha(entrada, texto) {
    if (!entrada || !entrada.resumo) return true;
    if (!entrada.de) return false;
    return entrada.de !== digitalDoTexto(texto);
  }

  /* LINHAS DO ARQUIVO + LINHAS AUTOMÁTICAS (api/resumos, 20/10/2026), as duas já
     passadas por saneResumos. Quem escreveu à mão (sem `de`) ganha sempre. Linha
     do arquivo com a MESMA impressão da automática também ganha: é a mesma
     descrição, e a escrita pelo Urlan vale mais. Só quando a descrição mudou
     (impressões diferentes) a automática, que é a mais nova, toma o lugar. */
  function mesclarResumos(fixos, auto) {
    const out = Object.assign({}, fixos || {});
    for (const k of Object.keys(auto || {})) {
      const a = auto[k];
      if (!a || !a.resumo) continue;
      const f = out[k];
      if (f && f.resumo && (!f.de || f.de === a.de)) continue;
      out[k] = a;
    }
    return out;
  }

  // Pedido de decisão de um item travado: a linha da descrição que começa com
  // "Decisão:" (com/sem acento, maiúsc./minúsc.). O texto depois do marcador é o
  // pedido — o PO escreve ali de quem depende e o impacto. Sem marcador, string
  // vazia: o report não inventa pedido, o item segue como só "parado".
  function pedidoDeDecisao(item) {
    const texto = descricaoLimpa(((item || {}).fields || {})['System.Description']);
    if (!texto) return '';
    const m = texto.match(/^[ \t]*decis[aã]o[ \t]*:[ \t]*(.+)$/im);
    return m ? m[1].trim() : '';
  }

  // Épico aponta pra si mesmo. Cadeia com ciclo para sozinha.
  // O Report usa isso pra dizer EM QUE produto o mês caiu, em vez de só listar
  // títulos soltos.
  function mapaDeProdutos(items) {
    const porId = new Map((items || []).map((it) => [it.id, it]));
    // O produto vai pro cabeçalho do grupo no Report, com selo e link — então
    // carrega o que identifica: tipo, estado e prazo.
    const reg = (it) => {
      const f = it.fields || {};
      return {
        id: it.id,
        titulo: f['System.Title'] || ('item #' + it.id),
        tipo: f['System.WorkItemType'] || '',
        estado: f['System.State'] || '',
        alvo: f[CAMPO_ALVO] || null,
        projeto: it.projeto || '',
      };
    };
    const achar = (id) => {
      const eu = porId.get(id);
      if (!eu) return null;
      if (levelOf((eu.fields || {})['System.WorkItemType']) === 'epic') return reg(eu);
      const vistos = new Set([id]);
      let atual = porId.get((eu.fields || {})['System.Parent']);
      let maisAlto = null;
      while (atual && !vistos.has(atual.id)) {
        vistos.add(atual.id);
        const f = atual.fields || {};
        if (levelOf(f['System.WorkItemType']) === 'epic') return reg(atual);
        maisAlto = atual; // guarda a Feature: sem épico na cadeia, ela é o produto
        atual = porId.get(f['System.Parent']);
      }
      // Sem pai nenhum: não se inventa produto. É o DevOps que está incompleto.
      return maisAlto ? reg(maisAlto) : null;
    };
    const saida = new Map();
    for (const it of items || []) {
      const e = achar(it.id);
      if (e) saida.set(it.id, e);
    }
    return saida;
  }

  // Por produto (id do épico/Feature que vira cabeçalho): o rumo (descendentes
  // concluídos/total). É o que alimenta a barra do cabeçalho de produto no report.
  // Calculado sobre `todos` (backlog inteiro do escopo) pra o % contar todos os
  // filhos, não só os do mês. No link de leitura este mapa viaja pronto: o pacote
  // não carrega o backlog inteiro, então recalcular ali subcontaria.
  function resumoProdutos(todos) {
    const mapa = mapaDeProdutos(todos);
    const roll = descendentesConcluidos(todos);
    const out = {};
    for (const node of mapa.values()) {
      if (out[node.id]) continue;
      const r = roll.get(node.id) || { total: 0, feitos: 0 };
      out[node.id] = { feitos: r.feitos, total: r.total };
    }
    return out;
  }

  // Fatos que sustentam o parágrafo de cada mês. Só conta o que está nos dados:
  // volume contra o mês anterior, onde o trabalho caiu, e épico que fechou —
  // um épico concluído é notícia maior que um PBI, por isso sai destacado.
  // `meses` vem do mais novo pro mais velho, então o anterior no tempo é i+1.
  function resumoMensal(meses, mapa) {
    return (meses || []).map((m, i) => {
      const anterior = (meses || [])[i + 1] || null;
      const contagem = new Map();
      const epicosFechados = [];
      for (const r of m.itens) {
        const f = (r.item || {}).fields || {};
        if (levelOf(f['System.WorkItemType']) === 'epic') {
          epicosFechados.push({ id: r.item.id, titulo: f['System.Title'] || ('item #' + r.item.id) });
        }
        const ep = mapa && mapa.get(r.item.id);
        if (ep) contagem.set(ep.titulo, (contagem.get(ep.titulo) || 0) + 1);
      }
      const produtos = [...contagem.entries()]
        .map(([titulo, n]) => ({ titulo, n }))
        .sort((a, b) => (b.n - a.n) || (a.titulo < b.titulo ? -1 : 1));
      return Object.assign({}, m, {
        resumo: {
          delta: anterior ? m.total - anterior.total : null,
          mesAnterior: anterior ? anterior.mes : null,
          produtos,
          epicosFechados,
        },
      });
    });
  }

  // Briefing do mês corrente, para stakeholder: o que fechou, o que está em
  // curso, que prazos vencem e o que está travado. Tudo dos mesmos itens que as
  // outras páginas já leem — nenhuma consulta nova.
  // Um item pode aparecer em "travado" E em "prazos": são perguntas diferentes
  // (o que está impedido vs. o que vence), e um travado vencido é justamente a
  // notícia mais importante da reunião.
  function briefingDoMes(items, agora) {
    const mesAgora = mesUTC(agora);
    const hoje = diaUTC(agora);
    const feitos = [];
    const execucao = [];
    const travados = [];
    const fila = []; // ainda não começou — é o "planejado" que o report não mostrava
    const prazos = { atrasados: [], esteMes: [], proximoMes: [], depois: [] };
    for (const it of items || []) {
      const f = (it || {}).fields || {};
      const estado = f['System.State'];
      if (isTerminalState(estado)) {
        // fechado neste mês? ClosedDate manda; ChangedDate é o plano B, marcado
        const fechado = dataValida(f[CAMPO_FECHADO]);
        const alterado = dataValida(f['System.ChangedDate']);
        const quando = fechado !== null ? fechado : alterado;
        if (quando !== null && mesUTC(quando) === mesAgora) {
          feitos.push({ item: it, quando, aproximada: fechado === null });
        }
        continue; // concluído não está em execução nem tem prazo a vencer
      }
      const bucket = stateBucket(estado);
      /* Épico é iniciativa, não item de execução: no report ele é a frente (e o
         cabeçalho de produto), com o próprio prazo no card. Contá-lo em
         execução/fila/prazos fazia a capa dizer "5 em execução" com 2 deles
         sendo as próprias iniciativas. Travado continua: iniciativa parada é
         notícia.

         A exclusão era `else if (… === 'epic') continue`, e o `else` abria uma
         fresta: o épico TRAVADO não chegava nessa linha — caía na primeira —,
         não dava `continue`, e seguia direto pros prazos. Resultado: épico
         bloqueado aparecia em "atrasados"/"este mês" e épico normal não, sem
         nenhum critério que o leitor pudesse adivinhar. A saída agora é por
         fora da cadeia, e vale para os dois. */
      const ehEpico = levelOf(f['System.WorkItemType']) === 'epic';
      if (bucket === 'atencao') travados.push({ item: it, dias: diasSemToque(f, hoje) });
      else if (ehEpico) { /* nada: nem execução, nem fila */ }
      else if (bucket === 'andamento') execucao.push({ item: it });
      else if (bucket === 'todo') fila.push({ item: it });
      if (ehEpico) continue; // iniciativa não tem prazo de execução a cobrar
      const alvo = dataValida(f[CAMPO_ALVO]);
      if (alvo === null) continue;
      if (diaUTC(alvo) < hoje) prazos.atrasados.push({ item: it, alvo });
      else if (mesUTC(alvo) === mesAgora) prazos.esteMes.push({ item: it, alvo });
      else if (mesUTC(alvo) === mesAgora + 1) prazos.proximoMes.push({ item: it, alvo });
      // Prazo mais distante entra num balde próprio. Sem ele, um item em curso
      // com alvo daqui a três meses sumia do documento: contava na capa como
      // "em execução" e não aparecia em seção nenhuma.
      else prazos.depois.push({ item: it, alvo });
    }
    const porAlvo = (a, b) => a.alvo - b.alvo;
    feitos.sort((a, b) => b.quando - a.quando); // entrega mais recente na frente
    prazos.atrasados.sort(porAlvo);
    prazos.esteMes.sort(porAlvo);
    prazos.proximoMes.sort(porAlvo);
    prazos.depois.sort(porAlvo);
    travados.sort((a, b) => (b.dias || 0) - (a.dias || 0)); // travado há mais tempo primeiro
    const porAlvoNuloNoFim = (a, b) => {
      const va = dataValida((a.item.fields || {})[CAMPO_ALVO]);
      const vb = dataValida((b.item.fields || {})[CAMPO_ALVO]);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return va - vb;
    };
    execucao.sort(porAlvoNuloNoFim);
    fila.sort(porAlvoNuloNoFim); // quem já tem data marcada na frente
    return { mes: rotuloMes(agora), feitos, execucao, travados, prazos, fila };
  }

  function diasSemToque(f, hoje) {
    const mudou = dataValida(f['System.ChangedDate']);
    return mudou === null ? null : Math.floor((hoje - diaUTC(mudou)) / 86400000);
  }

  function rotuloMes(t) {
    const d = new Date(t);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  }

  // ---- Por frente (o épico como iniciativa) ----
  // Junta, por produto do mapa, o que o mês entregou, o que anda agora, o que
  // trava ou atrasa, o próximo marco e o que ainda espera na fila. Item sem
  // produto não vira frente — segue só nas listas. As listas chegam no formato
  // que reportPorMes/briefingDoMes devolvem ({ item, ... }); aqui só se agrupa
  // e ordena: mais movimento (entregas + andamento) na frente; empate, quem tem
  // trava ou atraso; depois, pelo nome. O próprio épico não é linha de si
  // mesmo — entregue no mês, marca a frente como concluída.
  // Só volta frente com movimento: entregou algo, tem algo andando ou fechou no
  // mês. Iniciativa só com fila, só com item travado, ou sem nada, fica de fora
  // — o card não tem bloco que nomeie o travado, então viraria um cartão com
  // "nada concluído" e "nada em andamento" e um selo vermelho sem explicação. O
  // que trava continua em Depende de decisão e no cartão Atenção do Resumo, que
  // é onde o leitor vai atrás disso. Com essa regra, todo card tem pelo menos um
  // bloco preenchido.
  function frentes(o) {
    const mapa = o.mapa || new Map();
    const porId = new Map();
    const frenteDe = (it) => {
      const p = mapa.get(it.id);
      if (!p) return null;
      if (!porId.has(p.id)) {
        porId.set(p.id, {
          produto: p, entregas: [], andamento: [], travados: [], atrasados: [], fila: [],
          proximo: null, fechouNoMes: null, concluida: isTerminalState(p.estado),
        });
      }
      return porId.get(p.id);
    };
    const junta = (lista, chave) => {
      for (const r of lista || []) {
        const it = r.item || r;
        const fr = frenteDe(it);
        if (!fr) continue;
        if (it.id === fr.produto.id) { if (chave === 'entregas') fr.fechouNoMes = r; continue; }
        fr[chave].push(r);
      }
    };
    junta(o.entregas, 'entregas');
    junta(o.execucao, 'andamento');
    junta(o.travados, 'travados');
    junta(o.atrasados, 'atrasados');
    junta(o.fila, 'fila');
    // Próximo marco: o prazo mais próximo ainda por vir entre os itens da
    // frente; sem nenhum, o prazo do próprio épico, se ainda estiver à frente.
    for (const r of o.comData || []) {
      const it = r.item || r;
      const fr = frenteDe(it);
      if (!fr || it.id === fr.produto.id) continue;
      if (!fr.proximo || r.alvo < fr.proximo.alvo) fr.proximo = { alvo: r.alvo, item: it };
    }
    if (o.agora) {
      const hoje = diaUTC(o.agora);
      for (const fr of porId.values()) {
        if (fr.proximo || fr.concluida) continue;
        const alvo = dataValida(fr.produto.alvo);
        if (alvo !== null && alvo >= hoje) fr.proximo = { alvo, item: null };
      }
    }
    const movimento = (f) => f.entregas.length + f.andamento.length + (f.fechouNoMes ? 1 : 0);
    const risco = (f) => f.travados.length + f.atrasados.length;
    return [...porId.values()].filter((f) => movimento(f) > 0).sort((a, b) =>
      (movimento(b) - movimento(a)) || (risco(b) - risco(a))
      || String(a.produto.titulo).localeCompare(String(b.produto.titulo), 'pt-BR'));
  }

  // ---- Rolagem animada ----
  // A curva e o tempo da rolagem do menu do report. Vivem aqui, e não enterrados
  // num closure, porque são a parte do movimento que dá pra conferir sem olhar:
  // onde a animação roda eu vejo, onde não roda (compositor pausado) eu não vejo.
  const ROLAGEM_MIN = 220;
  const ROLAGEM_MAX = 600;

  // easeInOutCubic: sai devagar, corre no meio, encosta devagar. Aceleração
  // constante (linear) é o que faz rolagem animada parecer elevador.
  function suavizarRolagem(t) {
    const x = Math.min(1, Math.max(0, t));
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  // Salto curto anda rápido; travessia de página inteira ganha mais tempo, com
  // teto — passar de meio segundo já parece travamento, não elegância.
  function duracaoRolagem(distancia) {
    return Math.min(ROLAGEM_MAX, Math.max(ROLAGEM_MIN, Math.abs(distancia) * 0.5));
  }

  // ---- Cache ----
  function isStale(fetchedAt, now, maxAgeMinutes = 10) {
    if (!fetchedAt) return true;
    return now - fetchedAt > maxAgeMinutes * 60 * 1000;
  }

  function timeAgoLabel(fetchedAt, now) {
    if (!fetchedAt) return 'nunca atualizado';
    const min = Math.floor((now - fetchedAt) / 60000);
    if (min < 1) return 'atualizado agora';
    if (min < 60) return `atualizado há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `atualizado há ${h} h`;
    return `atualizado há ${Math.floor(h / 24)} d`;
  }

  return {
    orgBaseUrl, deepLinks, normalizeConfig, exportConfig,
    wiqlCounts, wiqlMyItems, levelOf, isTerminalState,
    aggregateCounts, sprintProgress, groupMyItemsBuckets,
    isAttentionState, typeSlug,
    wiqlBoard, wiqlIteracao, transbordados, initials, inSprint, itensDaIteracao, orderColumnsFallback, filterItems,
    stateBucket, bucketCounts, estaParado, wiqlEpicos, chaveDePessoa, fichaDaPessoa, caminhoDoConteudo,
    saneCartoes, saneEdicao, saneFrentes, automaticosDoMaterial, recorteDasSprints, saneJanela, saneAutomaticos, saneFontes, fimDoPeriodo, periodoFechado,
    iterationLabel, panoramaKpis, itensAtencao, pendencias, wiqlProdutos, produtos, descendentesConcluidos, epicoDetalhe, reportPorMes, saneRoadmapItens, evolucaoMensal, riscoDoRoadmap, janelaDeSprints, vizinhasDaSprint, placarDeSprint, resumoDeSprint, sprintsDoPeriodo, estadoDaSprint, ritmoDaSprint, FIM_DO_DIA, mapaDeProdutos, ehItemDeManutencao, idsDeManutencao, foraDaManutencao, descricaoLimpa, digitalDoTexto, saneResumos, precisaDeLinha, mesclarResumos, resumoProdutos, pedidoDeDecisao, resumoMensal, briefingDoMes, frentes,
    suavizarRolagem, duracaoRolagem,
    isStale, timeAgoLabel, TERMINAL_STATES,
  };
});
