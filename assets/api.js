/* Central de Projetos — camada REST do Azure DevOps (sem DOM).
   UMD simples: window.CentralApi no navegador, module.exports no Node.
   Toda função recebe ctx = { base, pat, fetchImpl }. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CentralApi = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const API = 'api-version=7.1';

  /* Teto de resultados. O do WIQL é o do próprio serviço (20 mil); os outros
     dois são folga larga sobre o que uma organização real tem.

     O valor antigo do WIQL era 2000, e isso era um defeito grave e mudo: a
     consulta de produtos puxa o histórico INTEIRO do time, não tem ORDER BY, e
     um time que roda 21 sprints a ~150 itens passa de 2000 sem esforço. Ao
     estourar, o DevOps corta e devolve 200 OK — a Central contava a menos e
     nada na tela dizia isso. Número menor que a realidade num relatório que vai
     pro stakeholder é pior que erro na cara. */
  const TETO = { wiql: 20000, projetos: 500, times: 500 };

  /* Resultado no teto é indistinguível de resultado cortado, então trata-se
     como cortado. Erro na cara é a resposta certa: seguir com a lista pela
     metade produz todos os números da tela errados, e para menos. */
  function semCorte(lista, teto, oque) {
    if (lista.length >= teto) {
      throw new Error(`A consulta de ${oque} bateu no teto de ${teto} itens. `
        + 'O resultado está cortado e os números sairiam menores que a realidade. '
        + 'Reduza o escopo (área do time) ou divida a consulta.');
    }
    return lista;
  }

  class AuthError extends Error {}
  class NetworkError extends Error {}

  function btoaSafe(s) {
    return typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64');
  }

  async function adoFetch(ctx, path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + btoaSafe(':' + ctx.pat),
    };
    let res;
    try {
      res = await ctx.fetchImpl(ctx.base + path, { ...options, headers });
    } catch (e) {
      throw new NetworkError(e.message); // CORS, offline, DNS…
    }
    if (res.status === 401 || res.status === 403) throw new AuthError('PAT inválido ou vencido');
    const type = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (type.includes('json')) {
        const data = await res.json().catch(() => null);
        throw new Error((data && data.message) || `HTTP ${res.status}`);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    // PAT vencido no ADO não vem como 401: vem como 302 pra página de signin,
    // que responde 200 text/html. Este check de content-type é o que detecta isso —
    // não remova. (Verificado contra dev.azure.com em 2026-08.)
    if (!type.includes('json')) throw new AuthError('Resposta não-JSON — PAT provavelmente vencido');
    return res.json();
  }

  // Nome de quem gerou o PAT. Serve pra o filtro global já abrir no dono da
  // conta em vez de exigir que ele se procure numa lista.
  async function currentUser(ctx) {
    const data = await adoFetch(ctx, `/_apis/connectionData?${API}`);
    const u = data.authenticatedUser || data.authorizedUser || {};
    return u.providerDisplayName || u.displayName || '';
  }

  async function listProjects(ctx) {
    const data = await adoFetch(ctx, `/_apis/projects?$top=${TETO.projetos}&${API}`);
    return semCorte(data.value.map((p) => ({ id: p.id, name: p.name })), TETO.projetos, 'projetos');
  }

  async function listTeams(ctx, projectId) {
    const data = await adoFetch(ctx, `/_apis/projects/${projectId}/teams?$top=${TETO.times}&${API}`);
    return semCorte(data.value.map((t) => ({ id: t.id, name: t.name })), TETO.times, 'times');
  }

  async function runWiql(ctx, project, team, query) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/wit/wiql?$top=${TETO.wiql}&${API}`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    return semCorte((data.workItems || []).map((w) => w.id), TETO.wiql, 'itens de trabalho');
  }

  async function getFields(ctx, ids, fields) {
    const out = [];
    for (let i = 0; i < ids.length; i += 200) {
      const data = await adoFetch(ctx, `/_apis/wit/workitemsbatch?${API}`, {
        method: 'POST',
        body: JSON.stringify({ ids: ids.slice(i, i + 200), fields, errorPolicy: 'Omit' }),
      });
      out.push(...data.value.filter(Boolean));
    }
    return out;
  }

  async function currentSprint(ctx, project, team) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/work/teamsettings/iterations?$timeframe=current&${API}`);
    const it = (data.value || [])[0];
    if (!it) return null;
    return {
      id: it.id,
      name: it.name,
      path: it.path || null,
      start: it.attributes ? it.attributes.startDate : null,
      finish: it.attributes ? it.attributes.finishDate : null,
    };
  }

  /* Todas as iterações que o TIME selecionou — não as do projeto inteiro.
     O currentSprint acima pede ?$timeframe=current e recebe só a corrente;
     daqui saem também a anterior e a próxima, que o Panorama mostra lado a
     lado. Quem escolhe qual é qual é o C.janelaDeSprints, pelas datas: a API
     devolve na ordem do backlog, que não é garantia de ordem cronológica. */
  async function teamIterations(ctx, project, team) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/work/teamsettings/iterations?${API}`);
    return (data.value || []).map((it) => ({
      id: it.id,
      name: it.name,
      path: it.path || null,
      start: it.attributes ? it.attributes.startDate : null,
      finish: it.attributes ? it.attributes.finishDate : null,
    }));
  }

  async function sprintItemIds(ctx, project, team, iterationId) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/work/teamsettings/iterations/${iterationId}/workitems?${API}`);
    return (data.workItemRelations || []).map((r) => (r.target ? r.target.id : null)).filter(Boolean);
  }

  // Áreas do time — é o que delimita o board de um time dentro do projeto
  async function teamAreas(ctx, project, team) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/work/teamsettings/teamfieldvalues?${API}`);
    return (data.values || []).map((v) => ({ path: v.value, children: !!v.includeChildren }));
  }

  // Boards do time (um por nível: Epics, Features, Backlog items…)
  async function listTeamBoards(ctx, project, team) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/work/boards?${API}`);
    return (data.value || []).map((b) => ({ id: b.id, name: b.name }));
  }

  // Colunas reais de um board, na ordem do DevOps
  async function boardColumns(ctx, project, team, boardId) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/work/boards/${boardId}/columns?${API}`);
    return (data.value || []).map((c) => ({ name: c.name, type: c.columnType || '' }));
  }

  return {
    adoFetch, currentUser, listProjects, listTeams, runWiql, getFields, currentSprint, teamIterations, sprintItemIds,
    teamAreas, listTeamBoards, boardColumns,
    AuthError, NetworkError,
  };
});
