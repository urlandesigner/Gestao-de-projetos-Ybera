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

  async function listProjects(ctx) {
    const data = await adoFetch(ctx, `/_apis/projects?$top=500&${API}`);
    return data.value.map((p) => ({ id: p.id, name: p.name }));
  }

  async function listTeams(ctx, projectId) {
    const data = await adoFetch(ctx, `/_apis/projects/${projectId}/teams?$top=100&${API}`);
    return data.value.map((t) => ({ id: t.id, name: t.name }));
  }

  async function runWiql(ctx, project, team, query) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/wit/wiql?$top=2000&${API}`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    return (data.workItems || []).map((w) => w.id);
  }

  async function getFields(ctx, ids, fields) {
    const out = [];
    for (let i = 0; i < ids.length; i += 200) {
      const data = await adoFetch(ctx, `/_apis/wit/workitemsbatch?${API}`, {
        method: 'POST',
        body: JSON.stringify({ ids: ids.slice(i, i + 200), fields, errorPolicy: 'Omit' }),
      });
      out.push(...data.value);
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
      start: it.attributes ? it.attributes.startDate : null,
      finish: it.attributes ? it.attributes.finishDate : null,
    };
  }

  async function sprintItemIds(ctx, project, team, iterationId) {
    const p = encodeURIComponent(project), t = encodeURIComponent(team);
    const data = await adoFetch(ctx, `/${p}/${t}/_apis/work/teamsettings/iterations/${iterationId}/workitems?${API}`);
    return (data.workItemRelations || []).map((r) => (r.target ? r.target.id : null)).filter(Boolean);
  }

  return { adoFetch, listProjects, listTeams, runWiql, getFields, currentSprint, sprintItemIds, AuthError, NetworkError };
});
