# Central de Projetos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página local que centraliza atalhos e dados vivos (contagens, sprint, meus itens) dos projetos do Urlan no Azure DevOps.

**Architecture:** HTML/CSS/JS vanilla, sem build. Três camadas: `core.js` (lógica pura, testável no Node), `api.js` (chamadas REST com fetch injetável, testável com fetch falso), `app.js` (DOM, localStorage, orquestração). Config e PAT vivem só no `localStorage`.

**Tech Stack:** Vanilla JS (UMD simples), Azure DevOps REST API 7.1, `node --test` (runner embutido do Node, zero dependências).

## Global Constraints

- Zero dependências, zero build, zero npm install — só arquivos estáticos + `node --test` para os testes
- Todo texto de interface em pt-BR
- O PAT **nunca** vai para arquivo, git ou export — só `localStorage` (chave `central.pat`)
- API REST 7.1 (`api-version=7.1` em toda chamada)
- Página deve continuar útil (atalhos) sem token ou com token vencido
- Estados terminais canônicos: `Done`, `Closed`, `Removed`, `Completed`
- Itens concluídos contam só os alterados nos últimos 30 dias, rotulados `(30d)`
- Spec: `docs/superpowers/specs/2026-08-18-central-de-projetos-design.md`
- Diretório de trabalho: `Ecommerce USA/Gestão de projetos/` (todos os caminhos abaixo são relativos a ele)

---

### Task 1: Esqueleto — index.html completo

**Files:**
- Create: `index.html`
- Create: `assets/style.css` (vazio por ora — só para o link não dar 404)

**Interfaces:**
- Produces: todos os ids de DOM que o `app.js` vai usar: `badge`, `carimbo`, `atualizar`, `abrir-config`, `meus-itens`, `grid`, `wizard`, `wizard-passo-1`, `wizard-passo-2`, `wizard-org`, `wizard-pat`, `wizard-erro`, `wizard-erro-2`, `wizard-descobrindo`, `wizard-descobrir`, `wizard-lista`, `wizard-concluir`, `config`, `conf-pat`, `conf-lista`, `conf-erro`, `conf-salvar`, `conf-redescobrir`, `conf-exportar`, `conf-importar`, `conf-fechar`

- [ ] **Step 1: Criar o index.html completo**

```html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Central de Projetos</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header>
  <div>
    <h1>Central de Projetos</h1>
    <p class="sub">Seus boards do Azure DevOps, sem procurar.</p>
  </div>
  <div class="acoes">
    <span id="badge" data-estado="sem-token">sem token</span>
    <span id="carimbo" class="mudo"></span>
    <button id="atualizar" title="Atualizar agora">↻</button>
    <button id="abrir-config" title="Configurações">⚙</button>
  </div>
</header>

<main>
  <section id="secao-meus-itens">
    <h2>Meus itens</h2>
    <div id="meus-itens"></div>
  </section>

  <section id="secao-projetos">
    <h2>Projetos</h2>
    <div id="grid"></div>
  </section>
</main>

<dialog id="wizard">
  <form method="dialog" onsubmit="return false">
    <section id="wizard-passo-1">
      <h2>Conectar ao Azure DevOps</h2>
      <label>URL da organização
        <input id="wizard-org" placeholder="dev.azure.com/sua-org" autocomplete="off">
      </label>
      <label>Personal Access Token (PAT)
        <input id="wizard-pat" type="password" autocomplete="off">
      </label>
      <details>
        <summary>Como gerar o PAT</summary>
        <ol>
          <li>No DevOps: avatar → <b>Personal access tokens</b> → <b>New Token</b></li>
          <li>Escopos: <b>Work Items → Read</b> e <b>Project and Team → Read</b></li>
          <li>Validade: 90 dias (o máximo). Copie e cole aqui.</li>
        </ol>
        <p>O token fica só neste navegador (localStorage) — não vai pra arquivo nem pra web.</p>
      </details>
      <p id="wizard-erro" class="erro" hidden></p>
      <p id="wizard-descobrindo" hidden>Descobrindo projetos…</p>
      <button id="wizard-descobrir">Descobrir projetos</button>
    </section>
    <section id="wizard-passo-2" hidden>
      <h2>Marque os seus projetos</h2>
      <div id="wizard-lista"></div>
      <p id="wizard-erro-2" class="erro" hidden></p>
      <button id="wizard-concluir">Montar a central</button>
    </section>
  </form>
</dialog>

<dialog id="config">
  <form method="dialog" onsubmit="return false">
    <h2>Configurações</h2>
    <label>Novo PAT (deixe em branco pra manter)
      <input id="conf-pat" type="password" autocomplete="off">
    </label>
    <h3>Projetos (visível / ordem)</h3>
    <ul id="conf-lista"></ul>
    <p id="conf-erro" class="erro" hidden></p>
    <div class="linha-botoes">
      <button id="conf-salvar">Salvar</button>
      <button id="conf-redescobrir">Refazer descoberta</button>
      <button id="conf-exportar">Exportar JSON</button>
      <label class="botao">Importar JSON<input id="conf-importar" type="file" accept="application/json" hidden></label>
      <button id="conf-fechar">Fechar</button>
    </div>
  </form>
</dialog>

<script src="assets/core.js"></script>
<script src="assets/api.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `assets/style.css` vazio** (conteúdo real na Task 8)

```css
/* Central de Projetos — estilo entra na tarefa de estética */
```

- [ ] **Step 3: Verificar no navegador**

Run: `cd "Gestão de projetos" && python3 -m http.server 8000` e abrir `http://localhost:8000`
Expected: página com header, seções "Meus itens" e "Projetos" vazias. Console mostra 404 de `core.js`/`api.js`/`app.js` (ainda não existem) — ok nesta tarefa.

- [ ] **Step 4: Commit**

```bash
git add index.html assets/style.css
git commit -m "feat: esqueleto da Central de Projetos — markup completo"
```

---

### Task 2: core.js — URLs e configuração (TDD)

**Files:**
- Create: `assets/core.js`
- Create: `tests/core.test.js`

**Interfaces:**
- Produces (usadas por app.js e Tasks 3/7):
  - `orgBaseUrl(input: string) → 'https://dev.azure.com/ORG'` (lança `Error` se inválida)
  - `deepLinks(base, project, team) → { board, backlog, sprints, queries, dashboards, workItem(id) }` (strings/função)
  - `normalizeConfig(raw) → { org, projects: [{projectId, projectName, teamId, teamName, order, hidden}], updatedAt }` (lança se inválida)
  - `exportConfig(config) → string` JSON sem PAT

- [ ] **Step 1: Escrever os testes que falham**

```js
// tests/core.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');

test('orgBaseUrl normaliza variações', () => {
  assert.equal(C.orgBaseUrl('dev.azure.com/ybera'), 'https://dev.azure.com/ybera');
  assert.equal(C.orgBaseUrl('https://dev.azure.com/ybera/'), 'https://dev.azure.com/ybera');
  assert.equal(C.orgBaseUrl('ybera'), 'https://dev.azure.com/ybera');
  assert.throws(() => C.orgBaseUrl(''));
  assert.throws(() => C.orgBaseUrl('dev.azure.com/a/b'));
});

test('deepLinks monta os cinco atalhos e o link de work item', () => {
  const l = C.deepLinks('https://dev.azure.com/ybera', 'Ecommerce USA', 'Time Web');
  assert.equal(l.board, 'https://dev.azure.com/ybera/Ecommerce%20USA/_boards/board/t/Time%20Web/');
  assert.equal(l.backlog, 'https://dev.azure.com/ybera/Ecommerce%20USA/_backlogs/backlog/Time%20Web/');
  assert.equal(l.sprints, 'https://dev.azure.com/ybera/Ecommerce%20USA/_sprints/taskboard/Time%20Web/');
  assert.equal(l.queries, 'https://dev.azure.com/ybera/Ecommerce%20USA/_queries');
  assert.equal(l.dashboards, 'https://dev.azure.com/ybera/Ecommerce%20USA/_dashboards');
  assert.equal(l.workItem(42), 'https://dev.azure.com/ybera/Ecommerce%20USA/_workitems/edit/42');
});

test('normalizeConfig valida, ordena e preenche defaults', () => {
  const cfg = C.normalizeConfig({
    org: 'ybera',
    projects: [
      { projectName: 'B', teamName: 'TB', order: 1 },
      { projectName: 'A', teamName: 'TA', order: 0, hidden: true },
    ],
  });
  assert.equal(cfg.org, 'https://dev.azure.com/ybera');
  assert.equal(cfg.projects[0].projectName, 'A');
  assert.equal(cfg.projects[0].hidden, true);
  assert.equal(cfg.projects[1].order, 1);
  assert.throws(() => C.normalizeConfig({ org: 'ybera', projects: [] }));
  assert.throws(() => C.normalizeConfig(null));
});

test('exportConfig nunca inclui pat', () => {
  const json = C.exportConfig({ org: 'ybera', pat: 'SEGREDO', projects: [{ projectName: 'A', teamName: 'TA' }] });
  assert.ok(!json.includes('SEGREDO'));
  assert.ok(!json.includes('pat'));
  assert.ok(json.includes('"org"'));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../assets/core.js'`

- [ ] **Step 3: Implementar `assets/core.js`**

```js
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
    s = s.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (!s.includes('/')) s = 'dev.azure.com/' + s; // aceita só o nome da org
    if (!/^dev\.azure\.com\/[^/]+$/i.test(s)) throw new Error('Esperado dev.azure.com/SUA-ORG');
    return 'https://' + s;
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

  return { orgBaseUrl, deepLinks, normalizeConfig, exportConfig };
});
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add assets/core.js tests/core.test.js
git commit -m "feat: core — URLs profundas e configuração validada, com testes"
```

---

### Task 3: core.js — WIQL, agregação e cache (TDD)

**Files:**
- Modify: `assets/core.js` (adicionar funções ao objeto retornado)
- Modify: `tests/core.test.js` (acrescentar testes)

**Interfaces:**
- Produces:
  - `wiqlCounts(doneCutoffDays=30) → string` WIQL de contagens
  - `wiqlMyItems() → string` WIQL de `@Me`
  - `levelOf(typeName) → 'epic'|'feature'|'pbi'`
  - `isTerminalState(state) → boolean`
  - `aggregateCounts(items) → { epic: {Estado: n}, feature: {...}, pbi: {...} }` — `items = [{id, fields:{'System.WorkItemType','System.State'}}]`
  - `sprintProgress(items) → { done, total }` (ignora tipo `Task`)
  - `groupMyItems(items) → [{ state, items }]` na ordem de chegada
  - `isStale(fetchedAt, now, maxAgeMinutes=10) → boolean`
  - `timeAgoLabel(fetchedAt, now) → string` pt-BR
  - `TERMINAL_STATES → ['Done','Closed','Removed','Completed']`

- [ ] **Step 1: Acrescentar os testes que falham** (no fim de `tests/core.test.js`)

```js
test('wiqlCounts filtra por categorias e corta concluídos em 30d', () => {
  const q = C.wiqlCounts();
  assert.ok(q.includes("IN GROUP 'Microsoft.EpicCategory'"));
  assert.ok(q.includes("IN GROUP 'Microsoft.FeatureCategory'"));
  assert.ok(q.includes("IN GROUP 'Microsoft.RequirementCategory'"));
  assert.ok(q.includes("[System.State] <> 'Removed'"));
  assert.ok(q.includes('@Today - 30'));
  assert.ok(C.wiqlCounts(7).includes('@Today - 7'));
});

test('wiqlMyItems usa @Me e exclui estados terminais', () => {
  const q = C.wiqlMyItems();
  assert.ok(q.includes('[System.AssignedTo] = @Me'));
  assert.ok(q.includes("NOT IN ('Done','Closed','Removed','Completed')"));
});

test('aggregateCounts separa por nível e estado', () => {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Epic', 'System.State': 'Active' } },
    { id: 2, fields: { 'System.WorkItemType': 'Feature', 'System.State': 'New' } },
    { id: 3, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'New' } },
    { id: 4, fields: { 'System.WorkItemType': 'User Story', 'System.State': 'New' } },
    { id: 5, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done' } },
  ];
  const c = C.aggregateCounts(items);
  assert.deepEqual(c.epic, { Active: 1 });
  assert.deepEqual(c.feature, { New: 1 });
  assert.deepEqual(c.pbi, { New: 2, Done: 1 });
});

test('sprintProgress conta concluídos e ignora Tasks', () => {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done' } },
    { id: 2, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Committed' } },
    { id: 3, fields: { 'System.WorkItemType': 'Task', 'System.State': 'Done' } },
  ];
  assert.deepEqual(C.sprintProgress(items), { done: 1, total: 2 });
});

test('groupMyItems agrupa por estado', () => {
  const g = C.groupMyItems([
    { id: 1, fields: { 'System.State': 'Active' } },
    { id: 2, fields: { 'System.State': 'New' } },
    { id: 3, fields: { 'System.State': 'Active' } },
  ]);
  assert.equal(g.length, 2);
  assert.equal(g[0].state, 'Active');
  assert.equal(g[0].items.length, 2);
});

test('isStale e timeAgoLabel', () => {
  const agora = 1_000_000_000;
  assert.equal(C.isStale(agora - 5 * 60000, agora), false);
  assert.equal(C.isStale(agora - 11 * 60000, agora), true);
  assert.equal(C.isStale(0, agora), true);
  assert.equal(C.timeAgoLabel(0, agora), 'nunca atualizado');
  assert.equal(C.timeAgoLabel(agora - 30000, agora), 'atualizado agora');
  assert.equal(C.timeAgoLabel(agora - 5 * 60000, agora), 'atualizado há 5 min');
  assert.equal(C.timeAgoLabel(agora - 3 * 3600000, agora), 'atualizado há 3 h');
});

test('isTerminalState é case-insensitive', () => {
  assert.equal(C.isTerminalState('done'), true);
  assert.equal(C.isTerminalState('Active'), false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/`
Expected: FAIL — `C.wiqlCounts is not a function` (e seguintes)

- [ ] **Step 3: Implementar** (dentro da factory de `core.js`, antes do `return`; incluir as novas chaves no `return`)

```js
  // ---- WIQL ----
  const TERMINAL_STATES = ['Done', 'Closed', 'Removed', 'Completed'];

  function wiqlCounts(doneCutoffDays = 30) {
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      "AND ([System.WorkItemType] IN GROUP 'Microsoft.EpicCategory'",
      "  OR [System.WorkItemType] IN GROUP 'Microsoft.FeatureCategory'",
      "  OR [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory')",
      "AND [System.State] <> 'Removed'",
      `AND ([System.State] NOT IN ('Done','Closed','Completed') OR [System.ChangedDate] >= @Today - ${doneCutoffDays})`,
    ].join('\n');
  }

  function wiqlMyItems() {
    return [
      'SELECT [System.Id] FROM WorkItems',
      'WHERE [System.TeamProject] = @project',
      'AND [System.AssignedTo] = @Me',
      "AND [System.State] NOT IN ('Done','Closed','Removed','Completed')",
      'ORDER BY [System.ChangedDate] DESC',
    ].join('\n');
  }

  // ---- Classificação e agregação ----
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

  function groupMyItems(items) {
    const grupos = new Map();
    for (const it of items || []) {
      const state = (it.fields || {})['System.State'] || '—';
      if (!grupos.has(state)) grupos.set(state, []);
      grupos.get(state).push(it);
    }
    return [...grupos.entries()].map(([state, list]) => ({ state, items: list }));
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
```

E o `return` final vira:

```js
  return {
    orgBaseUrl, deepLinks, normalizeConfig, exportConfig,
    wiqlCounts, wiqlMyItems, levelOf, isTerminalState,
    aggregateCounts, sprintProgress, groupMyItems,
    isStale, timeAgoLabel, TERMINAL_STATES,
  };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/`
Expected: PASS (11 testes)

- [ ] **Step 5: Commit**

```bash
git add assets/core.js tests/core.test.js
git commit -m "feat: core — WIQL, agregação de contagens, sprint e cache, com testes"
```

---

### Task 4: api.js — camada REST com fetch injetável (TDD)

**Files:**
- Create: `assets/api.js`
- Create: `tests/api.test.js`

**Interfaces:**
- Consumes: nada de core (camada independente)
- Produces (todas recebem `ctx = { base, pat, fetchImpl }`):
  - `adoFetch(ctx, path, options?) → Promise<json>` — lança `AuthError` (401/403/resposta não-JSON) ou `NetworkError` (fetch rejeitado: CORS/offline)
  - `listProjects(ctx) → [{id, name}]`
  - `listTeams(ctx, projectId) → [{id, name}]`
  - `runWiql(ctx, project, team, query) → number[]` ids
  - `getFields(ctx, ids, fields) → [{id, fields}]` (lotes de 200)
  - `currentSprint(ctx, project, team) → {id, name, start, finish} | null`
  - `sprintItemIds(ctx, project, team, iterationId) → number[]`
  - Classes `AuthError`, `NetworkError`

- [ ] **Step 1: Escrever os testes que falham**

```js
// tests/api.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/api.js');

const jsonRes = (data, status = 200) => ({
  status, ok: status < 400,
  headers: { get: () => 'application/json; charset=utf-8' },
  json: async () => data,
});

test('adoFetch manda Basic auth e devolve json', async () => {
  let captured;
  const ctx = { base: 'https://dev.azure.com/ybera', pat: 'tok', fetchImpl: async (url, opts) => { captured = { url, opts }; return jsonRes({ ok: 1 }); } };
  const data = await A.adoFetch(ctx, '/x');
  assert.deepEqual(data, { ok: 1 });
  assert.equal(captured.url, 'https://dev.azure.com/ybera/x');
  assert.equal(captured.opts.headers.Authorization, 'Basic ' + Buffer.from(':tok').toString('base64'));
});

test('adoFetch lança AuthError em 401 e em resposta não-JSON', async () => {
  const ctx401 = { base: 'b', pat: 'p', fetchImpl: async () => jsonRes({}, 401) };
  await assert.rejects(A.adoFetch(ctx401, '/x'), A.AuthError);
  const ctxHtml = { base: 'b', pat: 'p', fetchImpl: async () => ({ status: 200, ok: true, headers: { get: () => 'text/html' }, json: async () => ({}) }) };
  await assert.rejects(A.adoFetch(ctxHtml, '/x'), A.AuthError);
});

test('adoFetch lança NetworkError quando o fetch rejeita', async () => {
  const ctx = { base: 'b', pat: 'p', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } };
  await assert.rejects(A.adoFetch(ctx, '/x'), A.NetworkError);
});

test('runWiql extrai ids e getFields fatia em lotes de 200', async () => {
  const calls = [];
  const ctx = {
    base: 'https://dev.azure.com/o', pat: 'p',
    fetchImpl: async (url, opts) => {
      calls.push({ url, body: opts && opts.body ? JSON.parse(opts.body) : null });
      if (url.includes('/wiql')) return jsonRes({ workItems: [{ id: 1 }, { id: 2 }] });
      return jsonRes({ value: (JSON.parse(opts.body).ids || []).map((id) => ({ id, fields: {} })) });
    },
  };
  const ids = await A.runWiql(ctx, 'Proj', 'Time', 'SELECT ...');
  assert.deepEqual(ids, [1, 2]);
  assert.ok(calls[0].url.includes('/Proj/Time/_apis/wit/wiql'));

  const muitos = Array.from({ length: 450 }, (_, i) => i + 1);
  const items = await A.getFields(ctx, muitos, ['System.State']);
  assert.equal(items.length, 450);
  const batches = calls.filter((c) => c.url.includes('workitemsbatch'));
  assert.equal(batches.length, 3); // 200 + 200 + 50
});

test('currentSprint devolve null sem sprint corrente', async () => {
  const ctx = { base: 'b', pat: 'p', fetchImpl: async () => jsonRes({ value: [] }) };
  assert.equal(await A.currentSprint(ctx, 'P', 'T'), null);
});

test('sprintItemIds extrai targets das relações', async () => {
  const ctx = { base: 'b', pat: 'p', fetchImpl: async () => jsonRes({ workItemRelations: [{ target: { id: 7 } }, { target: null }, { target: { id: 9 } }] }) };
  assert.deepEqual(await A.sprintItemIds(ctx, 'P', 'T', 'iter-1'), [7, 9]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/`
Expected: os testes de core PASSAM; os de api FALHAM com `Cannot find module '../assets/api.js'`

- [ ] **Step 3: Implementar `assets/api.js`**

```js
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
    if (!type.includes('json')) throw new AuthError('Resposta não-JSON — PAT provavelmente vencido');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
        body: JSON.stringify({ ids: ids.slice(i, i + 200), fields }),
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/`
Expected: PASS (17 testes no total)

- [ ] **Step 5: Commit**

```bash
git add assets/api.js tests/api.test.js
git commit -m "feat: api — camada REST do DevOps com erros tipados, com testes"
```

---

### Task 5: app.js — storage, boot e wizard de onboarding

**Files:**
- Create: `assets/app.js`

**Interfaces:**
- Consumes: `CentralCore` (Task 2/3), `CentralApi` (Task 4), ids de DOM (Task 1)
- Produces (usadas pelas Tasks 6/7): `state` `{config, pat, cache, discovery, auth}`, `ctx()`, `cardKey(p)`, `loadJSON/saveJSON`, `LS`, `mensagemDeErro(e)`, `$()`
- Nota: `renderAll()`/`refreshAll(force)` entram aqui como versões provisórias explícitas e são **substituídas por completo na Task 6**

- [ ] **Step 1: Criar `assets/app.js`**

```js
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
  cache: loadJSON(LS.cache) || { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0 },
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
  state.cache = { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0 };
  saveJSON(LS.cache, state.cache);
  $('wizard').close();
  boot();
}

/* ---------- Render/refresh provisórios (substituídos na tarefa seguinte) ---------- */
function renderAll() {
  $('grid').textContent = 'Configuração carregada: ' + state.config.projects.length + ' cartão(ões). Render real na próxima tarefa.';
}
function refreshAll(force) { /* dados vivos entram na próxima tarefa */ }

/* ---------- Boot ---------- */
function boot() {
  const raw = loadJSON(LS.config);
  if (raw) { try { state.config = C.normalizeConfig(raw); } catch (e) { state.config = null; } }
  if (!state.config) { $('wizard').showModal(); return; }
  renderAll();
  refreshAll(false);
}

document.addEventListener('DOMContentLoaded', () => {
  $('wizard-descobrir').addEventListener('click', wizardDiscover);
  $('wizard-concluir').addEventListener('click', wizardConclude);
  $('atualizar').addEventListener('click', () => refreshAll(true));
  boot();
});
})();
```

- [ ] **Step 2: Verificar sem token (caminho de erro)**

Run: servir com `python3 -m http.server 8000`, abrir com localStorage limpo (janela anônima).
Expected: wizard abre sozinho; "Descobrir projetos" sem PAT mostra "Cole um PAT."; com org inválida mostra "Esperado dev.azure.com/SUA-ORG"; com PAT falso mostra a mensagem de PAT recusado (ou de rede, se offline).

- [ ] **Step 3: Verificar com PAT real (se disponível)**

Expected: passo 2 lista projetos/times com checkboxes; concluir salva e a página mostra "Configuração carregada: N cartão(ões)". Recarregar NÃO reabre o wizard (config persistiu).

- [ ] **Step 4: Commit**

```bash
git add assets/app.js
git commit -m "feat: onboarding — wizard de descoberta e persistência de config/PAT"
```

---

### Task 6: app.js — refresh e render (cartões, meus itens, badge)

**Files:**
- Modify: `assets/app.js` — **remover** as funções provisórias `renderAll`/`refreshAll` e colar no lugar os dois blocos abaixo (mesma posição, entre o Onboarding e o Boot)

**Interfaces:**
- Consumes: tudo da Task 5; `C.wiqlCounts/wiqlMyItems/aggregateCounts/sprintProgress/groupMyItems/deepLinks/isStale/timeAgoLabel/isTerminalState`; `A.runWiql/getFields/currentSprint/sprintItemIds`
- Produces: `renderAll()`, `refreshAll(force)` finais; `openSettings` é referenciado só na Task 7 (o botão ⚙ ainda fica sem handler nesta tarefa)

- [ ] **Step 1: Colar o bloco de dados vivos**

```js
/* ---------- Dados vivos ---------- */
const FIELDS_COUNTS = ['System.WorkItemType', 'System.State'];
const FIELDS_ITEMS = ['System.Title', 'System.State', 'System.WorkItemType', 'System.TeamProject'];

async function refreshCard(p) {
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
    entry.error = mensagemDeErro(e);
    if (e instanceof A.AuthError) state.auth = 'vencido';
  }
  state.cache.byCard[cardKey(p)] = entry;
  renderCard(p);
}

async function refreshMyItems() {
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
  }
  renderMyItems();
}

async function refreshAll(force) {
  if (!state.pat) { state.auth = 'sem-token'; renderBadge(); return; }
  if (!force && !C.isStale(state.cache.fetchedAt, Date.now())) { renderBadge(); return; }
  state.auth = 'atualizando';
  renderBadge();
  const visiveis = state.config.projects.filter((p) => !p.hidden);
  await Promise.all([...visiveis.map(refreshCard), refreshMyItems()]);
  state.cache.fetchedAt = Date.now();
  if (state.auth === 'atualizando') state.auth = 'conectado';
  saveJSON(LS.cache, state.cache);
  renderBadge();
}
```

- [ ] **Step 2: Colar o bloco de render**

```js
/* ---------- Render ---------- */
function renderAll() { renderBadge(); renderMyItems(); renderGrid(); }

function renderBadge() {
  const rotulos = { 'sem-token': 'sem token', vencido: 'token vencido', atualizando: 'atualizando…', conectado: 'conectado' };
  const auth = state.auth || (state.pat ? 'conectado' : 'sem-token');
  const badge = $('badge');
  badge.textContent = rotulos[auth] || auth;
  badge.dataset.estado = auth;
  $('carimbo').textContent = C.timeAgoLabel(state.cache.fetchedAt, Date.now());
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
  if (entry.error) { box.innerHTML = `<p class="erro">${escapeHtml(entry.error)}</p>`; return; }
  const linhas = [];
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
  if (state.cache.myItemsError) { box.innerHTML = `<p class="erro">${escapeHtml(state.cache.myItemsError)}</p>`; return; }
  const items = state.cache.myItems;
  if (!items) { box.innerHTML = '<p class="mudo">— configure o token pra ver seus itens —</p>'; return; }
  if (!items.length) { box.innerHTML = '<p class="mudo">Nada no seu nome.</p>'; return; }
  const grupos = C.groupMyItems(items);
  box.innerHTML = grupos.map((g) => `
    <div class="grupo">
      <h4>${escapeHtml(g.state)} <span class="mudo">(${g.items.length})</span></h4>
      <ul>${g.items.map((it) => {
        const f = it.fields;
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
```

- [ ] **Step 3: Rodar os testes (garantir que nada quebrou)**

Run: `node --test tests/`
Expected: PASS (app.js não é testado no Node — só core e api)

- [ ] **Step 4: Verificar no navegador com PAT real**

Servir com `python3 -m http.server 8000`. Expected:
- Cartões aparecem na hora com os 5 atalhos clicáveis (mesmo antes dos dados)
- Chips de contagem por nível preenchem em seguida; estados terminais com sufixo `(30d)`
- Sprint com nome, período e `X/Y concluídos` (ou "sem sprint corrente")
- "Meus itens" agrupado por estado, cada item abrindo no DevOps
- Badge vai de `atualizando…` para `conectado`; carimbo "atualizado agora"
- Recarregar em menos de 10 min: dados vêm do cache sem refetch (rede vazia no DevTools)
- Botão ↻ força atualização

- [ ] **Step 5: Verificar degradação**

Trocar `central.pat` no DevTools por `XXXX` e recarregar forçando (↻).
Expected: badge `token vencido`, cartões mantêm atalhos, áreas vivas mostram a mensagem de PAT recusado. Apagar `central.pat` e recarregar: badge `sem token`, áreas vivas mostram "— sem token: só atalhos —".

- [ ] **Step 6: Commit**

```bash
git add assets/app.js
git commit -m "feat: dados vivos — contagens, sprint, meus itens, badge e cache"
```

---

### Task 7: app.js — configurações (engrenagem)

**Files:**
- Modify: `assets/app.js` — colar o bloco abaixo antes do `/* ---------- Boot ---------- */` e acrescentar os listeners no `DOMContentLoaded`

**Interfaces:**
- Consumes: `state`, `LS`, `saveJSON`, `renderAll`, `refreshAll`, `escapeHtml`, `C.exportConfig`, `C.normalizeConfig`, ids `config`, `conf-*` (Task 1)
- Produces: nada consumido por outras tasks (tarefa final de comportamento)

- [ ] **Step 1: Colar o bloco de configurações**

```js
/* ---------- Configurações ---------- */
function openSettings() {
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
  a.click();
  URL.revokeObjectURL(a.href);
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
      state.cache = { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0 };
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
```

- [ ] **Step 2: Acrescentar os listeners no `DOMContentLoaded`** (junto dos existentes)

```js
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
```

- [ ] **Step 3: Rodar os testes**

Run: `node --test tests/`
Expected: PASS

- [ ] **Step 4: Verificar no navegador**

Expected:
- ⚙ abre o diálogo com a lista dos cartões, ↑/↓ reordena, desmarcar oculta
- Salvar aplica ordem/ocultos na grade e persiste após reload
- Exportar baixa `central-projetos-config.json` **sem** nenhum campo de token (abrir o arquivo e conferir)
- Importar o mesmo arquivo numa janela anônima reconstrói a central (pedirá token — esperado)
- "Refazer descoberta" reabre o wizard com org e PAT preenchidos
- Trocar o PAT por um válido novo reatualiza os dados

- [ ] **Step 5: Commit**

```bash
git add assets/app.js
git commit -m "feat: configurações — PAT, ordem, ocultar, export/import e redescoberta"
```

---

### Task 8: style.css — estética e responsivo

**Files:**
- Modify: `assets/style.css` (substituir o conteúdo inteiro)

**Interfaces:**
- Consumes: classes/ids do markup (Task 1) e dos renders (Tasks 5–7): `.sub .acoes .mudo .erro .chip .nivel .sprint .card .proj .atalhos .vivo .grupo .linha-botoes .botao .ordem #badge[data-estado] #grid #meus-itens`

- [ ] **Step 1: Escrever o CSS completo**

```css
/* Central de Projetos — eco do Radar: editorial executivo, wash discreto. */
:root {
  --tinta: #1c1917;
  --mudo: #78716c;
  --papel: #faf9f7;
  --cartao: #ffffff;
  --borda: #e7e5e4;
  --acento: #0f766e;
  --erro: #b91c1c;
  --serifa: ui-serif, Georgia, 'Times New Roman', serif;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--papel);
  color: var(--tinta);
  font: 15px/1.5 var(--sans);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  padding: 1.5rem clamp(1rem, 4vw, 3rem) 1rem;
  border-bottom: 1px solid var(--borda);
}
h1 { font-family: var(--serifa); font-size: 1.7rem; margin: 0; }
.sub { margin: 0.15rem 0 0; color: var(--mudo); }
.acoes { display: flex; align-items: center; gap: 0.6rem; }
.acoes button {
  font-size: 1.05rem;
  border: 1px solid var(--borda);
  background: var(--cartao);
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
}
.acoes button:hover { border-color: var(--acento); color: var(--acento); }
#badge {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--borda);
  color: var(--mudo);
}
#badge[data-estado='conectado'] { color: var(--acento); border-color: var(--acento); }
#badge[data-estado='vencido'], #badge[data-estado='sem-token'] { color: var(--erro); border-color: var(--erro); }
main { padding: 1rem clamp(1rem, 4vw, 3rem) 3rem; }
h2 { font-family: var(--serifa); font-size: 1.15rem; margin: 1.6rem 0 0.7rem; }
.mudo { color: var(--mudo); }
.erro { color: var(--erro); }

/* Meus itens */
#meus-itens .grupo { margin-bottom: 0.8rem; }
#meus-itens h4 { margin: 0 0 0.25rem; font-size: 0.95rem; }
#meus-itens ul { margin: 0; padding-left: 1.1rem; }
#meus-itens a { color: var(--tinta); text-decoration-color: var(--borda); }
#meus-itens a:hover { color: var(--acento); }

/* Grade de cartões */
#grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}
.card {
  background: var(--cartao);
  border: 1px solid var(--borda);
  border-radius: 12px;
  padding: 1rem 1.1rem;
}
.card h3 { font-family: var(--serifa); margin: 0; font-size: 1.1rem; }
.card .proj { margin: 0 0 0.6rem; color: var(--mudo); font-size: 0.85rem; }
.atalhos { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.7rem; }
.atalhos a {
  font-size: 0.82rem;
  text-decoration: none;
  color: var(--acento);
  border: 1px solid var(--borda);
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
}
.atalhos a:hover { border-color: var(--acento); background: #f0fdfa; }
.vivo { border-top: 1px dashed var(--borda); padding-top: 0.6rem; font-size: 0.88rem; }
.nivel { margin-bottom: 0.3rem; }
.nivel b { display: inline-block; min-width: 4.6rem; }
.chip {
  display: inline-block;
  background: var(--papel);
  border: 1px solid var(--borda);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  margin: 0.1rem 0.15rem 0.1rem 0;
  font-size: 0.78rem;
}
.sprint { margin-top: 0.45rem; }

/* Diálogos */
dialog {
  border: 1px solid var(--borda);
  border-radius: 12px;
  padding: 1.2rem 1.4rem;
  max-width: 560px;
  width: calc(100vw - 2rem);
  max-height: 85vh;
  overflow: auto;
}
dialog::backdrop { background: rgba(28, 25, 23, 0.35); }
dialog h2 { margin-top: 0; }
dialog label { display: block; margin: 0.6rem 0; }
dialog input[type='text'], dialog input[type='password'], dialog input:not([type]) {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--borda);
  border-radius: 8px;
  font: inherit;
}
dialog button, .botao {
  font: inherit;
  border: 1px solid var(--borda);
  background: var(--cartao);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}
dialog button:hover, .botao:hover { border-color: var(--acento); color: var(--acento); }
#wizard-lista fieldset { border: 1px solid var(--borda); border-radius: 8px; margin: 0.6rem 0; }
#wizard-lista label { display: block; margin: 0.2rem 0; }
.linha-botoes { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.8rem; }
#conf-lista { list-style: none; padding: 0; }
#conf-lista li { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; border-bottom: 1px dashed var(--borda); }
.ordem button { padding: 0.1rem 0.45rem; margin-left: 0.25rem; }

/* Celular */
@media (max-width: 640px) {
  header { flex-direction: column; align-items: flex-start; }
  #grid { grid-template-columns: 1fr; }
  .atalhos a { padding: 0.5rem 0.8rem; font-size: 0.9rem; } /* alvo de toque maior */
}
```

- [ ] **Step 2: Verificar no navegador (desktop e celular)**

Expected: desktop com grade 2–3 colunas conforme largura; DevTools em viewport 375px empilha cartões e aumenta os botões de atalho; diálogos legíveis nos dois; badge muda de cor por estado.

- [ ] **Step 3: Commit**

```bash
git add assets/style.css
git commit -m "feat: estética editorial e responsivo — grade, chips, diálogos"
```

---

### Task 9: Verificação final (checklist do spec, com PAT real)

**Files:** nenhum novo — só correções que a verificação apontar.

**Interfaces:** n/a

- [ ] **Step 1: Rodar a suíte completa**

Run: `node --test tests/`
Expected: PASS, zero falhas

- [ ] **Step 2: Checklist manual do spec** (servir com `python3 -m http.server 8000`; requer PAT real do usuário)

1. Onboarding do zero (janela anônima) até a central montada
2. Contagens conferidas contra o DevOps em pelo menos 2 projetos (abrir o backlog e comparar)
3. Todos os 5 atalhos de 1 cartão clicados — cada um abre no lugar certo
4. "Meus itens" bate com a query `@Me` do DevOps
5. Sem token e com token inválido: página segue útil como hub
6. Viewport 375px: cartões empilhados, botões alcançáveis
7. Export numa janela, import na outra: central reconstruída (token pedido de novo — esperado)
8. Abrir via `file://` (duplo clique): se o fetch falhar, a mensagem de CORS com a instrução do `http.server` aparece nos cartões

- [ ] **Step 3: Corrigir o que falhar e commitar cada correção**

```bash
git add -A && git commit -m "fix: ajustes da verificação final"
```

- [ ] **Step 4: Commit final / merge conforme o fluxo do repositório**

```bash
git log --oneline -10
```
Expected: histórico com os commits das Tasks 1–8 + correções.
