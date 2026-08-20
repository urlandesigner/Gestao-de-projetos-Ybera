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
      workItem: (id) => `${base}/${p}/_workitems/edit/${id}`,
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
  function wiqlCounts(doneCutoffDays = 30, areas = []) {
    const naoRemovidos = TERMINAL_STATES.filter((s) => s !== 'Removed').map((s) => `'${s}'`).join(',');
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      "AND ([System.WorkItemType] IN GROUP 'Microsoft.EpicCategory'",
      "  OR [System.WorkItemType] IN GROUP 'Microsoft.FeatureCategory'",
      "  OR [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory')",
      "AND [System.State] <> 'Removed'",
      `AND ([System.State] NOT IN (${naoRemovidos}) OR [System.ChangedDate] >= @Today - ${doneCutoffDays})`,
      areaClause(areas),
    ].filter(Boolean).join('\n');
  }

  function wiqlMyItems() {
    const terminais = TERMINAL_STATES.map((s) => `'${s}'`).join(',');
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      'AND [System.AssignedTo] = @Me',
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
      "AND [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory'",
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
      if (mudou !== null && (hoje - diaUTC(mudou)) / 86400000 >= DIAS_PARADO) out.parados += 1;
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
      const parado = dias !== null && dias >= diasParado;
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
    wiqlBoard, initials, inSprint, orderColumnsFallback, filterItems,
    stateBucket, bucketCounts,
    iterationLabel, panoramaKpis, itensAtencao, pendencias,
    isStale, timeAgoLabel, TERMINAL_STATES,
  };
});
