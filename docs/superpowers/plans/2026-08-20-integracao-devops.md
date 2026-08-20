# Integração do Radar com o Azure DevOps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer os fatos do Radar (estado, janela, produto, dono, conclusão) virem do Azure DevOps por um snapshot gerado fora da página, mantendo o texto editorial escrito à mão e o site 100% estático.

**Architecture:** Um script Node sem dependência (`tools/`, na raiz do repositório, fora do alcance da Vercel) consulta o projeto `Ecommerce USA` da org `ybera`, mapeia Epics para itens do Radar e Features filhas para demandas, e grava `Radar de projetos/assets/fatos.js`. O texto editorial migra para `assets/prosa.js`, indexado por id de work item. O `app.js` funde os dois na carga. O script é só-leitura no DevOps e nunca escreve no `prosa.js`.

**Tech Stack:** Node (ESM, `.mjs`), `node --test`, API REST do Azure DevOps 7.1, WIQL. Zero dependência de terceiros.

## Global Constraints

- Repositório: `/Users/urlandipre/Documents/Projetos Ybera/Ecommerce USA`. O site vive em `Radar de projetos/`; as ferramentas em `tools/`, **na raiz**.
- **Nada de `package.json` dentro de `Radar de projetos/`.** A Vercel está configurada com Root Directory = `Radar de projetos`; um `package.json` ali faria a Vercel detectar projeto Node e tentar um build que não existe, quebrando a página no ar.
- **Zero dependência de terceiros**, em `tools/` e no site. Só a biblioteca padrão do Node.
- O script é **só-leitura** no DevOps. Nenhum `POST`/`PATCH` que altere work item. As únicas requisições `POST` permitidas são as de consulta: `wiql` e `workitemsbatch`.
- O script **nunca escreve** em `Radar de projetos/assets/prosa.js`.
- PAT lido **só** de `process.env.ADO_PAT`. Nunca por argumento de linha de comando (vaza em `ps` e no histórico do shell), nunca gravado em arquivo, nunca impresso.
- Todo texto visível no site é bilíngue (`{pt,en}`). O script não gera texto visível: ele gera fato.
- NÃO editar `Radar de projetos/Radar de Projetos USA.html` (versão legada autocontida, com cópia própria dos dados, mantida intacta a pedido do usuário).
- Nomes de estado e de área são **configuração** (`tools/config.json`), nunca literais no código: os estados do time são customizados e em português, e mudam com o processo.
- Comentários explicam POR QUÊ, em português, no tom dos comentários que já existem no projeto.
- Servidor de verificação do site: `cd "Radar de projetos" && python3 -m http.server 8001`.

---

### Task 1: Camada REST e script de descoberta

**Files:**
- Create: `tools/ado.mjs`
- Create: `tools/package.json`
- Create: `tools/descobrir.mjs`
- Test: `tools/tests/ado.test.mjs`

**Interfaces:**
- Consumes: nada
- Produces:
  - `adoFetch(ctx, path, options) → Promise<object>` onde `ctx = {base, pat, fetchImpl}`
  - `runWiql(ctx, projeto, query) → Promise<number[]>`
  - `getFields(ctx, ids, campos) → Promise<Array<{id, fields}>>`
  - `listProjects(ctx) → Promise<Array<{id, name}>>`
  - `class AuthError extends Error`, `class NetworkError extends Error`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tools/tests/ado.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoFetch, runWiql, getFields, AuthError, NetworkError } from '../ado.mjs';

/* fetch falso: o ctx.fetchImpl injetado é o que torna o tratamento de erro
   testável sem rede. */
function resposta({status = 200, tipo = 'application/json', corpo = {}} = {}){
  return {
    status, ok: status >= 200 && status < 300,
    headers: { get: () => tipo },
    json: async () => corpo
  };
}
const ctx = r => ({ base:'https://dev.azure.com/ybera', pat:'x', fetchImpl: async () => r });

test('200 com JSON devolve o corpo', async () => {
  const out = await adoFetch(ctx(resposta({corpo:{value:[1,2]}})), '/x');
  assert.deepEqual(out, {value:[1,2]});
});

test('401 vira AuthError', async () => {
  await assert.rejects(() => adoFetch(ctx(resposta({status:401})), '/x'), AuthError);
});

test('403 vira AuthError', async () => {
  await assert.rejects(() => adoFetch(ctx(resposta({status:403})), '/x'), AuthError);
});

/* A armadilha que a Central de Projetos descobriu: PAT vencido no ADO não
   responde 401. Responde 200 com text/html, a página de signin. */
test('200 com text/html vira AuthError, nao sucesso', async () => {
  await assert.rejects(
    () => adoFetch(ctx(resposta({tipo:'text/html'})), '/x'),
    err => err instanceof AuthError && /PAT/.test(err.message)
  );
});

test('falha de rede vira NetworkError', async () => {
  const c = { base:'b', pat:'x', fetchImpl: async () => { throw new Error('ENOTFOUND'); } };
  await assert.rejects(() => adoFetch(c, '/x'), NetworkError);
});

test('erro HTTP com JSON usa a mensagem da API', async () => {
  await assert.rejects(
    () => adoFetch(ctx(resposta({status:400, corpo:{message:'WIQL torto'}})), '/x'),
    err => err.message === 'WIQL torto'
  );
});

test('runWiql devolve só os ids', async () => {
  const r = resposta({corpo:{workItems:[{id:7},{id:9}]}});
  assert.deepEqual(await runWiql(ctx(r), 'Ecommerce USA', 'SELECT 1'), [7,9]);
});

test('runWiql sem resultado devolve lista vazia', async () => {
  assert.deepEqual(await runWiql(ctx(resposta({corpo:{}})), 'P', 'SELECT 1'), []);
});

/* Mais de 200 ids tem de ser quebrado em lotes: é limite da API workitemsbatch. */
test('getFields quebra em lotes de 200', async () => {
  const chamadas = [];
  const c = {
    base:'b', pat:'x',
    fetchImpl: async (url, opt) => {
      chamadas.push(JSON.parse(opt.body).ids.length);
      return resposta({corpo:{value:[{id:1, fields:{}}]}});
    }
  };
  const ids = Array.from({length:450}, (_, i) => i + 1);
  await getFields(c, ids, ['System.Title']);
  assert.deepEqual(chamadas, [200, 200, 50]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd tools && node --test
```

Esperado: falha com `Cannot find module` apontando para `../ado.mjs`.

- [ ] **Step 3: Criar o `tools/package.json`**

```json
{
  "name": "radar-tools",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Sem `dependencies` e sem `devDependencies`, de propósito.

- [ ] **Step 4: Escrever o `tools/ado.mjs`**

```js
/* Camada REST do Azure DevOps para o Radar — sem DOM, sem dependência.

   PROCEDÊNCIA: cópia reduzida de "Gestão de projetos/assets/api.js", da
   Central de Projetos (hoje em github.com/urlandesigner/Gestao-de-projetos-Ybera).
   É cópia e não dependência porque a identidade deste projeto é "sem build e
   sem dependência", e submódulo ou pacote npm para ~100 linhas custa mais do
   que paga. O custo real disto é divergência: correção feita lá não chega aqui
   sozinha. Se você corrigir algo neste arquivo, leve para lá também.

   Toda função recebe ctx = {base, pat, fetchImpl}. O fetchImpl injetado é o
   que torna o tratamento de erro testável sem rede. */

const API = 'api-version=7.1';

export class AuthError extends Error {}
export class NetworkError extends Error {}

function b64(s){ return Buffer.from(s, 'utf8').toString('base64'); }

export async function adoFetch(ctx, caminho, options = {}){
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Basic ' + b64(':' + ctx.pat)
  };
  let res;
  try {
    res = await ctx.fetchImpl(ctx.base + caminho, { ...options, headers });
  } catch (e) {
    throw new NetworkError(e.message); // CORS, offline, DNS…
  }
  if(res.status === 401 || res.status === 403) throw new AuthError('PAT inválido ou vencido');
  const tipo = res.headers.get('content-type') || '';
  if(!res.ok){
    if(tipo.includes('json')){
      const data = await res.json().catch(() => null);
      throw new Error((data && data.message) || `HTTP ${res.status}`);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  /* PAT vencido no ADO não vem como 401: vem como 302 para a página de signin,
     que responde 200 text/html. Este check de content-type é o que detecta
     isso — não remova. (Verificado contra dev.azure.com em 2026-08.) */
  if(!tipo.includes('json')) throw new AuthError('Resposta não-JSON — PAT provavelmente vencido');
  return res.json();
}

export async function runWiql(ctx, projeto, query){
  const p = encodeURIComponent(projeto);
  const data = await adoFetch(ctx, `/${p}/_apis/wit/wiql?$top=2000&${API}`, {
    method: 'POST',
    body: JSON.stringify({ query })
  });
  return (data.workItems || []).map(w => w.id);
}

/* A API de lote aceita no máximo 200 ids por chamada. */
export async function getFields(ctx, ids, campos){
  const out = [];
  for(let i = 0; i < ids.length; i += 200){
    const data = await adoFetch(ctx, `/_apis/wit/workitemsbatch?${API}`, {
      method: 'POST',
      body: JSON.stringify({ ids: ids.slice(i, i + 200), fields: campos, errorPolicy: 'Omit' })
    });
    out.push(...(data.value || []).filter(Boolean));
  }
  return out;
}

export async function listProjects(ctx){
  const data = await adoFetch(ctx, `/_apis/projects?$top=500&${API}`);
  return (data.value || []).map(p => ({ id: p.id, name: p.name }));
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
cd tools && node --test
```

Esperado: `# pass 9`, `# fail 0`.

- [ ] **Step 6: Escrever o `tools/descobrir.mjs`**

```js
#!/usr/bin/env node
/* SÓ-LEITURA. Imprime o que existe de fato no DevOps, para o mapeamento ser
   escrito contra a realidade em vez de contra palpite. Não grava nada.

   Uso:  ADO_PAT=xxx node tools/descobrir.mjs
         ADO_PAT=xxx node tools/descobrir.mjs "Outro Projeto" */
import { runWiql, getFields, listProjects, AuthError, NetworkError } from './ado.mjs';

const ORG = 'https://dev.azure.com/ybera';
const PROJETO = process.argv[2] || 'Ecommerce USA';

const pat = process.env.ADO_PAT;
if(!pat){
  console.error('Falta ADO_PAT. Use: ADO_PAT=xxx node tools/descobrir.mjs');
  process.exit(2);
}
const ctx = { base: ORG, pat, fetchImpl: (...a) => fetch(...a) };

const CAMPOS = [
  'System.Id', 'System.Title', 'System.State', 'System.WorkItemType',
  'System.AreaPath', 'System.AssignedTo', 'System.Parent', 'System.Tags',
  'Microsoft.VSTS.Scheduling.StartDate',
  'Microsoft.VSTS.Scheduling.TargetDate',
  'Microsoft.VSTS.Common.ClosedDate'
];

function conta(itens, campo){
  const m = new Map();
  for(const w of itens){
    const v = (w.fields || {})[campo];
    const k = v && v.displayName ? v.displayName : (v == null ? '(vazio)' : String(v));
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function tabela(titulo, pares){
  console.log(`\n${titulo}`);
  for(const [k, n] of pares) console.log(`  ${String(n).padStart(4)}  ${k}`);
}

try {
  const projetos = await listProjects(ctx);
  console.log(`Projetos na org (${projetos.length}):`);
  for(const p of projetos) console.log(`  ${p.name === PROJETO ? '→' : ' '} ${p.name}`);

  for(const tipo of ['Epic', 'Feature']){
    const ids = await runWiql(ctx, PROJETO,
      `SELECT [System.Id] FROM WorkItems
       WHERE [System.TeamProject] = '${PROJETO}'
         AND [System.WorkItemType] = '${tipo}'`);
    console.log(`\n=== ${tipo}: ${ids.length} itens em "${PROJETO}" ===`);
    if(!ids.length) continue;
    const itens = await getFields(ctx, ids, CAMPOS);

    tabela('Estados (System.State):', conta(itens, 'System.State'));
    tabela('Áreas (System.AreaPath):', conta(itens, 'System.AreaPath'));
    tabela('Responsáveis (System.AssignedTo):', conta(itens, 'System.AssignedTo'));

    /* A pergunta que decide se a "janela" do Radar tem fonte. */
    const preenchido = c => itens.filter(w => (w.fields || {})[c] != null).length;
    console.log('\nDatas preenchidas:');
    console.log(`  StartDate:  ${preenchido('Microsoft.VSTS.Scheduling.StartDate')} de ${itens.length}`);
    console.log(`  TargetDate: ${preenchido('Microsoft.VSTS.Scheduling.TargetDate')} de ${itens.length}`);
    console.log(`  ClosedDate: ${preenchido('Microsoft.VSTS.Common.ClosedDate')} de ${itens.length}`);
    if(tipo === 'Feature'){
      console.log(`  com System.Parent: ${preenchido('System.Parent')} de ${itens.length}`);
    }

    console.log('\nTrês exemplos crus:');
    for(const w of itens.slice(0, 3)) console.log('  ' + JSON.stringify({ id: w.id, fields: w.fields }));

    /* Esqueleto pronto para colar no config, já com os nomes reais. */
    if(tipo === 'Epic'){
      const estados = conta(itens, 'System.State').map(([k]) => k).filter(k => k !== '(vazio)');
      const areas = conta(itens, 'System.AreaPath').map(([k]) => k).filter(k => k !== '(vazio)');
      console.log('\n--- cole em tools/config.json e preencha os valores ---');
      console.log(JSON.stringify({
        org: ORG, projeto: PROJETO,
        estados: Object.fromEntries(estados.map(e => [e, null])),
        areas: Object.fromEntries(areas.map(a => [a, null]))
      }, null, 2));
    }
  }
} catch (e) {
  if(e instanceof AuthError) console.error('PAT inválido ou vencido. Gere outro com escopo Work Items (Read).');
  else if(e instanceof NetworkError) console.error('Falha de rede: ' + e.message);
  else console.error('Erro: ' + e.message);
  process.exit(1);
}
```

- [ ] **Step 7: Verificar que o script carrega sem PAT e sem rede**

```bash
node --check tools/descobrir.mjs && node tools/descobrir.mjs; echo "exit=$?"
```

Esperado: imprime `Falta ADO_PAT. Use: ADO_PAT=xxx node tools/descobrir.mjs` e `exit=2`. Sem stack trace.

- [ ] **Step 8: Commit**

```bash
git add tools
git commit -m "feat(tools): camada REST do Azure DevOps e script de descoberta"
```

---

### Task 2: Mapeamento puro

**Files:**
- Create: `tools/mapa.mjs`
- Test: `tools/tests/mapa.test.mjs`

**Interfaces:**
- Consumes: nada (funções puras)
- Produces:
  - `mesDe(iso) → "AAAA-MM" | null`
  - `diaDe(iso) → "AAAA-MM-DD" | null`
  - `statusDe(estado, mapaEstados) → "done" | "doing" | "next" | null`
  - `healthDe(estado) → "blocked" | null`
  - `trackDe(areaPath, tabelaAreas) → string | null`
  - `agruparPorPai(features, idsDeEpics) → {porPai: Map<number, object[]>, orfas: object[]}`
  - `itemDe(epic, features, cfg) → {id, azureTitle, track, start, end, status, estadoCru, health, shipped, owner, demands}`
  - `diffRodadas(antes, depois) → Array<{id, tipo, titulo, de?, para?}>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tools/tests/mapa.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesDe, diaDe, statusDe, healthDe, trackDe, agruparPorPai, itemDe, diffRodadas } from '../mapa.mjs';

test('mesDe extrai AAAA-MM e recusa lixo', () => {
  assert.equal(mesDe('2026-08-14T12:00:00Z'), '2026-08');
  assert.equal(mesDe('2026-12-01'), '2026-12');
  assert.equal(mesDe(null), null);
  assert.equal(mesDe(''), null);
  assert.equal(mesDe('2026-13-01'), null);
  assert.equal(mesDe('agosto'), null);
});

test('diaDe extrai AAAA-MM-DD', () => {
  assert.equal(diaDe('2026-08-14T12:00:00Z'), '2026-08-14');
  assert.equal(diaDe(null), null);
});

const ESTADOS = { 'Aguardando Início':'next', 'Em Andamento':'doing', 'Concluído':'done' };

test('statusDe usa o mapa de configuracao', () => {
  assert.equal(statusDe('Em Andamento', ESTADOS), 'doing');
  assert.equal(statusDe('Concluído', ESTADOS), 'done');
});

/* Estado fora do mapa NAO pode virar "next" em silencio: viraria mudanca de
   processo escondida de quem precisa saber. */
test('estado fora do mapa devolve null', () => {
  assert.equal(statusDe('Em Homologação', ESTADOS), null);
  assert.equal(statusDe(null, ESTADOS), null);
});

test('valor invalido no mapa e tratado como nao mapeado', () => {
  assert.equal(statusDe('X', { X:'qualquer' }), null);
});

test('healthDe marca impedimento e mais nada', () => {
  assert.equal(healthDe('Em impedimento'), 'blocked');
  assert.equal(healthDe('Impediment'), 'blocked');
  assert.equal(healthDe('Em Andamento'), null);
  assert.equal(healthDe(null), null);
});

const AREAS = { 'Ecommerce USA\\Loja Clube':'club', 'Ecommerce USA\\Loja Clube\\Checkout':'checkout' };

test('trackDe casa por prefixo e prefere o mais especifico', () => {
  assert.equal(trackDe('Ecommerce USA\\Loja Clube', AREAS), 'club');
  assert.equal(trackDe('Ecommerce USA\\Loja Clube\\PDP', AREAS), 'club');
  assert.equal(trackDe('Ecommerce USA\\Loja Clube\\Checkout\\Pix', AREAS), 'checkout');
});

test('area fora da tabela devolve null em vez de descartar o item', () => {
  assert.equal(trackDe('Ecommerce USA\\Nova Area', AREAS), null);
  assert.equal(trackDe(null, AREAS), null);
});

test('agruparPorPai separa filhas e orfas', () => {
  const fs = [
    { id:11, fields:{ 'System.Parent':1 } },
    { id:12, fields:{ 'System.Parent':1 } },
    { id:13, fields:{ 'System.Parent':99 } },
    { id:14, fields:{} }
  ];
  const { porPai, orfas } = agruparPorPai(fs, [1, 2]);
  assert.deepEqual(porPai.get(1).map(w => w.id), [11, 12]);
  assert.equal(porPai.has(2), false);
  assert.deepEqual(orfas.map(w => w.id), [13, 14]);
});

const CFG = { estados: ESTADOS, areas: AREAS };

test('itemDe monta o item do Radar a partir do Epic', () => {
  const epic = { id:47688, fields:{
    'System.Title':'Nova PDP USA',
    'System.State':'Em Andamento',
    'System.AreaPath':'Ecommerce USA\\Loja Clube',
    'System.AssignedTo':{ displayName:'Urlan Dipré' },
    'Microsoft.VSTS.Scheduling.StartDate':'2026-07-01T00:00:00Z',
    'Microsoft.VSTS.Scheduling.TargetDate':'2026-08-31T00:00:00Z'
  }};
  const it = itemDe(epic, [], CFG);
  assert.equal(it.id, 47688);
  assert.equal(it.azureTitle, 'Nova PDP USA');
  assert.equal(it.track, 'club');
  assert.equal(it.start, '2026-07-01');
  assert.equal(it.end, '2026-08-31');
  assert.equal(it.status, 'doing');
  assert.equal(it.estadoCru, 'Em Andamento');
  assert.equal(it.health, null);
  assert.equal(it.shipped, null);
  assert.equal(it.owner, 'Urlan Dipré');
  assert.deepEqual(it.demands, []);
});

test('Epic concluido gera shipped a partir de ClosedDate', () => {
  const epic = { id:1, fields:{
    'System.Title':'X', 'System.State':'Concluído',
    'Microsoft.VSTS.Common.ClosedDate':'2026-08-14T10:00:00Z'
  }};
  const it = itemDe(epic, [], CFG);
  assert.equal(it.status, 'done');
  assert.equal(it.shipped, '2026-08');
});

test('Epic sem data alguma nao explode e fica sem janela', () => {
  const it = itemDe({ id:2, fields:{ 'System.Title':'Y', 'System.State':'Em Andamento' } }, [], CFG);
  assert.equal(it.start, null);
  assert.equal(it.end, null);
  assert.equal(it.owner, null);
});

test('Epic sem fields nao explode', () => {
  const it = itemDe({ id:3 }, [], CFG);
  assert.equal(it.id, 3);
  assert.equal(it.azureTitle, '');
  assert.equal(it.status, null);
});

test('demandas viram a lista do Radar, com done em mes', () => {
  const epic = { id:1, fields:{ 'System.Title':'X', 'System.State':'Em Andamento' } };
  const fs = [
    { id:11, fields:{ 'System.Title':'Revisão do checkout', 'System.State':'Concluído',
                      'Microsoft.VSTS.Scheduling.TargetDate':'2026-08-15T00:00:00Z',
                      'Microsoft.VSTS.Common.ClosedDate':'2026-08-20T00:00:00Z' } },
    { id:12, fields:{ 'System.Title':'Pendente', 'System.State':'Aguardando Início' } }
  ];
  const it = itemDe(epic, fs, CFG);
  assert.deepEqual(it.demands, [
    { id:11, t:'Revisão do checkout', status:'done', estadoCru:'Concluído', due:'2026-08-15', done:'2026-08' },
    { id:12, t:'Pendente', status:'next', estadoCru:'Aguardando Início', due:null, done:null }
  ]);
});

test('diffRodadas aponta novo, saiu, status, janela e entrega', () => {
  const antes = [
    { id:1, azureTitle:'A', status:'doing', end:'2026-08-31', shipped:null },
    { id:2, azureTitle:'B', status:'next', end:null, shipped:null }
  ];
  const depois = [
    { id:1, azureTitle:'A', status:'done', end:'2026-09-30', shipped:'2026-09' },
    { id:3, azureTitle:'C', status:'next', end:null, shipped:null }
  ];
  const d = diffRodadas(antes, depois);
  assert.deepEqual(d.filter(x => x.tipo === 'status'), [{ id:1, tipo:'status', de:'doing', para:'done', titulo:'A' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'janela'), [{ id:1, tipo:'janela', de:'2026-08-31', para:'2026-09-30', titulo:'A' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'entrega'), [{ id:1, tipo:'entrega', de:null, para:'2026-09', titulo:'A' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'novo'), [{ id:3, tipo:'novo', titulo:'C' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'saiu'), [{ id:2, tipo:'saiu', titulo:'B' }]);
});

test('diffRodadas sem rodada anterior trata tudo como novo', () => {
  const d = diffRodadas(null, [{ id:1, azureTitle:'A', status:'next', end:null, shipped:null }]);
  assert.deepEqual(d, [{ id:1, tipo:'novo', titulo:'A' }]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd tools && node --test tests/mapa.test.mjs
```

Esperado: falha com `Cannot find module` apontando para `../mapa.mjs`.

- [ ] **Step 3: Escrever o `tools/mapa.mjs`**

```js
/* Mapeamento puro: work item do DevOps → item do Radar. Sem I/O, sem DOM.

   Todo nome que vem do processo do time — estado, área — é CONFIGURAÇÃO e
   entra por parâmetro. Os estados de vocês são customizados e em português
   ("Aguardando Início", "Em Andamento", "Em Teste"), então um mapa fixo aqui
   envelheceria na primeira mudança de processo, num arquivo que ninguém
   lembraria de abrir. */

/* "2026-08-14T12:00:00Z" → "2026-08" */
export function mesDe(iso){
  if(!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(0[1-9]|1[0-2])/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/* "2026-08-14T12:00:00Z" → "2026-08-14" — o Radar só usa o dia. */
export function diaDe(iso){
  if(!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))/);
  return m ? m[1] : null;
}

/* Estado fora do mapa devolve null de propósito: quem chama registra no
   relatório. Cair em "next" por padrão esconderia mudança de processo
   justamente de quem precisa saber dela. */
export function statusDe(estado, mapaEstados){
  if(!estado) return null;
  const v = (mapaEstados || {})[estado];
  return v === 'done' || v === 'doing' || v === 'next' ? v : null;
}

/* Impedimento é sinal de saúde, não etapa do fluxo. O "watch" ("em atenção")
   continua editorial: não há sinal equivalente no DevOps, e inferir atenção a
   partir de atraso de data deixaria o alerta aceso o tempo todo — que é
   exatamente o que o Radar evita. */
export function healthDe(estado){
  if(!estado) return null;
  return /impediment|impedimento/i.test(estado) ? 'blocked' : null;
}

/* Casa por prefixo e prefere a chave mais específica, para
   "Ecommerce USA\Loja Clube\Checkout" poder ter produto próprio sem deixar
   de existir dentro de "Loja Clube". Área fora da tabela devolve null: o item
   aparece num grupo "sem produto" e é cobrado no relatório, em vez de
   desaparecer. */
export function trackDe(areaPath, tabelaAreas){
  if(!areaPath) return null;
  const chaves = Object.keys(tabelaAreas || {}).sort((a, b) => b.length - a.length);
  for(const k of chaves){
    if(areaPath === k || areaPath.startsWith(k + '\\')) return tabelaAreas[k];
  }
  return null;
}

/* Feature sem pai, ou com pai fora da lista de Epics, não é descartada em
   silêncio: volta em `orfas` para o relatório. */
export function agruparPorPai(features, idsDeEpics){
  const set = new Set(idsDeEpics);
  const porPai = new Map();
  const orfas = [];
  for(const w of (features || [])){
    const pai = (w.fields || {})['System.Parent'];
    if(pai && set.has(pai)){
      if(!porPai.has(pai)) porPai.set(pai, []);
      porPai.get(pai).push(w);
    } else {
      orfas.push(w);
    }
  }
  return { porPai, orfas };
}

function demandaDe(w, cfg){
  const g = w.fields || {};
  const estado = g['System.State'] || null;
  return {
    id: w.id,
    t: g['System.Title'] || '',
    status: statusDe(estado, cfg.estados),
    estadoCru: estado,
    due: diaDe(g['Microsoft.VSTS.Scheduling.TargetDate']),
    done: mesDe(g['Microsoft.VSTS.Common.ClosedDate'])
  };
}

/* `estadoCru` viaja junto do `status` porque o relatório precisa dizer QUAL
   estado não estava mapeado — sem ele a mensagem seria "3 itens sem status",
   que não ajuda ninguém. */
export function itemDe(epic, features, cfg){
  const f = epic.fields || {};
  const estado = f['System.State'] || null;
  const dono = f['System.AssignedTo'];
  return {
    id: epic.id,
    azureTitle: f['System.Title'] || '',
    track: trackDe(f['System.AreaPath'], cfg.areas),
    start: diaDe(f['Microsoft.VSTS.Scheduling.StartDate']),
    end: diaDe(f['Microsoft.VSTS.Scheduling.TargetDate']),
    status: statusDe(estado, cfg.estados),
    estadoCru: estado,
    health: healthDe(estado),
    shipped: mesDe(f['Microsoft.VSTS.Common.ClosedDate']),
    owner: (dono && dono.displayName) || null,
    demands: (features || []).map(w => demandaDe(w, cfg))
  };
}

/* O que mudou entre duas rodadas. É isto que substitui o olhar humano no
   `git diff` quando a rodada passar a ser agendada. */
export function diffRodadas(antes, depois){
  const idx = new Map((antes || []).map(i => [i.id, i]));
  const mudou = [];
  for(const d of (depois || [])){
    const a = idx.get(d.id);
    if(!a){ mudou.push({ id: d.id, tipo: 'novo', titulo: d.azureTitle }); continue; }
    if(a.status !== d.status) mudou.push({ id: d.id, tipo: 'status', de: a.status, para: d.status, titulo: d.azureTitle });
    if(a.end !== d.end) mudou.push({ id: d.id, tipo: 'janela', de: a.end, para: d.end, titulo: d.azureTitle });
    if(a.shipped !== d.shipped) mudou.push({ id: d.id, tipo: 'entrega', de: a.shipped, para: d.shipped, titulo: d.azureTitle });
  }
  const idsDepois = new Set((depois || []).map(i => i.id));
  for(const a of (antes || [])){
    if(!idsDepois.has(a.id)) mudou.push({ id: a.id, tipo: 'saiu', titulo: a.azureTitle });
  }
  return mudou;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd tools && node --test
```

Esperado: `# fail 0`, com os 9 testes da Task 1 e os 16 desta somando `# pass 25`.

- [ ] **Step 5: Commit**

```bash
git add tools
git commit -m "feat(tools): mapeamento puro de work item para item do Radar"
```

---

### Task 3: Orquestrador e as cinco guardas

**Files:**
- Create: `tools/sync.mjs`
- Create: `tools/config.json`
- Create: `tools/guardas.mjs`
- Test: `tools/tests/guardas.test.mjs`

**Interfaces:**
- Consumes: `tools/ado.mjs` (Task 1), `tools/mapa.mjs` (Task 2)
- Produces:
  - `guardaEsvaziamento(qtdNova, qtdAntiga) → {ok:boolean, motivo:string|null}`
  - `serializarFatos(geradoEm, itens) → string` (o conteúdo de `fatos.js`)
  - `relatorio({itens, orfas, semStatus, semTrack, mudancas}) → string`
  - `tools/sync.mjs` executável: grava `Radar de projetos/assets/fatos.js`

- [ ] **Step 1: Escrever o teste que falha**

Criar `tools/tests/guardas.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardaEsvaziamento, serializarFatos, relatorio } from '../guardas.mjs';

test('primeira rodada passa quando ha itens', () => {
  assert.equal(guardaEsvaziamento(14, null).ok, true);
});

/* Zero nunca passa, nem na primeira rodada: um WIQL que nao acha nada e
   indistinguivel de uma area renomeada no DevOps. */
test('zero nunca passa', () => {
  assert.equal(guardaEsvaziamento(0, null).ok, false);
  assert.equal(guardaEsvaziamento(0, 14).ok, false);
});

test('queda maior que 20 por cento e recusada', () => {
  assert.equal(guardaEsvaziamento(11, 14).ok, false); // 78,6%
  assert.match(guardaEsvaziamento(11, 14).motivo, /11.*14/);
});

test('queda dentro de 20 por cento passa', () => {
  assert.equal(guardaEsvaziamento(12, 14).ok, true); // 85,7%
});

test('crescer sempre passa', () => {
  assert.equal(guardaEsvaziamento(30, 14).ok, true);
});

test('serializarFatos produz JS valido e sem PAT', () => {
  const js = serializarFatos('2026-08-20T10:00:00Z', [{ id:1, azureTitle:'A"quote', status:'doing' }]);
  assert.match(js, /^\/\* GERADO/);
  assert.match(js, /const RADAR_FATOS =/);
  assert.match(js, /"geradoEm": "2026-08-20T10:00:00Z"/);
  /* JSON.stringify e o que garante escape de aspas e de barra invertida —
     titulo do DevOps vem com "\" nas Area Paths e com aspas no texto. */
  assert.ok(js.includes('A\\"quote'));
});

test('relatorio lista o que precisa de acao humana', () => {
  const txt = relatorio({
    itens:[{ id:1 }, { id:2 }],
    orfas:[{ id:99, fields:{ 'System.Title':'Solta' } }],
    semStatus:[{ id:2, estadoCru:'Em Homologação' }],
    semTrack:[{ id:1, azureTitle:'X' }],
    mudancas:[{ id:1, tipo:'status', de:'next', para:'doing', titulo:'X' }]
  });
  assert.match(txt, /2 Epics/);
  assert.match(txt, /Em Homologação/);
  assert.match(txt, /Solta/);
  assert.match(txt, /sem produto/i);
  assert.match(txt, /next → doing/);
});

test('relatorio de rodada limpa nao inventa alarme', () => {
  const txt = relatorio({ itens:[{ id:1 }], orfas:[], semStatus:[], semTrack:[], mudancas:[] });
  assert.match(txt, /1 Epic/);
  assert.doesNotMatch(txt, /não mapeado/);
  assert.doesNotMatch(txt, /órfã/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd tools && node --test tests/guardas.test.mjs
```

Esperado: falha com `Cannot find module` apontando para `../guardas.mjs`.

- [ ] **Step 3: Escrever o `tools/guardas.mjs`**

```js
/* As guardas que impedem uma rodada ruim de virar uma página ruim, e o
   relatório que diz o que precisa de decisão humana. Puro, sem I/O. */

const PISO = 0.8;

/* Um WIQL que não acha nada é indistinguível de uma área renomeada no DevOps.
   Sem esta guarda, uma rodada agendada apagaria os projetos da página no ar —
   e o erro só apareceria quando alguém abrisse o link. */
export function guardaEsvaziamento(qtdNova, qtdAntiga){
  if(!qtdNova) return { ok:false, motivo:'A consulta não devolveu nenhum Epic. Nada foi gravado.' };
  if(qtdAntiga && qtdNova < qtdAntiga * PISO){
    return {
      ok:false,
      motivo:`A consulta devolveu ${qtdNova} Epics, contra ${qtdAntiga} da rodada anterior ` +
             `(abaixo do piso de ${Math.round(PISO * 100)}%). Nada foi gravado — confira se uma área ` +
             `foi renomeada no DevOps ou rode com --forcar se a queda é real.`
    };
  }
  return { ok:true, motivo:null };
}

/* JSON.stringify é o que garante escape correto: título do DevOps vem com
   aspas no texto e com "\" nas Area Paths. Montar a string à mão aqui já
   produziu arquivo inválido em outros projetos. */
export function serializarFatos(geradoEm, itens){
  const corpo = JSON.stringify({ geradoEm, epics: itens }, null, 2);
  return `/* GERADO POR tools/sync.mjs — NÃO EDITE À MÃO.
   Fatos vindos do Azure DevOps. Todo texto editorial (título legível, why,
   about, result, healthNote) vive em prosa.js, indexado pelo mesmo id.
   Para regerar:  ADO_PAT=xxx node tools/sync.mjs
   Gerado em: ${geradoEm} */
const RADAR_FATOS = ${corpo};
`;
}

function bloco(titulo, linhas){
  return linhas.length ? `\n${titulo}\n` + linhas.map(l => '  ' + l).join('\n') : '';
}

export function relatorio({ itens, orfas, semStatus, semTrack, mudancas }){
  const nDem = itens.reduce((s, i) => s + ((i.demands || []).length), 0);
  let txt = `${itens.length} ${itens.length === 1 ? 'Epic' : 'Epics'}, ${nDem} demandas.`;

  txt += bloco('Estados não mapeados (mapeie em tools/config.json):',
    [...new Set(semStatus.map(i => i.estadoCru))].map(e =>
      `"${e}" — ${semStatus.filter(i => i.estadoCru === e).length} itens`));

  txt += bloco('Sem produto (área fora da tabela de tools/config.json):',
    semTrack.map(i => `#${i.id} ${i.azureTitle}`));

  txt += bloco('Features órfãs (sem pai, ou com pai fora do filtro):',
    orfas.map(w => `#${w.id} ${(w.fields || {})['System.Title'] || ''}`));

  txt += bloco('Mudou desde a última rodada:', mudancas.map(m => {
    if(m.tipo === 'novo') return `+ #${m.id} ${m.titulo}`;
    if(m.tipo === 'saiu') return `- #${m.id} ${m.titulo}`;
    return `~ #${m.id} ${m.titulo}: ${m.tipo} ${m.de} → ${m.para}`;
  }));

  return txt;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd tools && node --test
```

Esperado: `# fail 0`, `# pass 33`.

- [ ] **Step 5: Criar o `tools/config.json`**

Os nomes de estado e de área saem da rodada de descoberta (Task 1). Este arquivo entra com a estrutura e um mapa vazio; a Task 5 é quem preenche contra a saída real:

```json
{
  "org": "https://dev.azure.com/ybera",
  "projeto": "Ecommerce USA",
  "estados": {},
  "areas": {}
}
```

Com `estados` vazio, todo item cai em "estado não mapeado" e o relatório lista os nomes reais — que é exatamente o comportamento desejado antes da Task 5. O script grava normalmente: o Radar mostra os itens sem status até o mapa ser preenchido.

- [ ] **Step 6: Escrever o `tools/sync.mjs`**

```js
#!/usr/bin/env node
/* Gera Radar de projetos/assets/fatos.js a partir do Azure DevOps.
   SÓ-LEITURA no DevOps. NUNCA escreve em prosa.js.

   Uso:  ADO_PAT=xxx node tools/sync.mjs [--dry-run] [--forcar] */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runWiql, getFields, AuthError, NetworkError } from './ado.mjs';
import { itemDe, agruparPorPai, diffRodadas } from './mapa.mjs';
import { guardaEsvaziamento, serializarFatos, relatorio } from './guardas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const DESTINO = path.join(RAIZ, 'Radar de projetos', 'assets', 'fatos.js');

const seco = process.argv.includes('--dry-run');
const forcar = process.argv.includes('--forcar');

const pat = process.env.ADO_PAT;
if(!pat){
  console.error('Falta ADO_PAT. Use: ADO_PAT=xxx node tools/sync.mjs');
  process.exit(2);
}

const cfg = JSON.parse(await readFile(path.join(AQUI, 'config.json'), 'utf8'));
const ctx = { base: cfg.org, pat, fetchImpl: (...a) => fetch(...a) };

const CAMPOS = [
  'System.Id', 'System.Title', 'System.State', 'System.AreaPath',
  'System.AssignedTo', 'System.Parent',
  'Microsoft.VSTS.Scheduling.StartDate',
  'Microsoft.VSTS.Scheduling.TargetDate',
  'Microsoft.VSTS.Common.ClosedDate'
];

const wiql = tipo =>
  `SELECT [System.Id] FROM WorkItems
   WHERE [System.TeamProject] = '${cfg.projeto}'
     AND [System.WorkItemType] = '${tipo}'`;

/* Lê a rodada anterior para o diff e para a guarda de esvaziamento. Arquivo
   ausente é primeira rodada, não erro. */
async function fatosAnteriores(){
  try {
    const txt = await readFile(DESTINO, 'utf8');
    const i = txt.indexOf('{');
    return JSON.parse(txt.slice(i, txt.lastIndexOf('}') + 1));
  } catch { return null; }
}

try {
  const idsEpics = await runWiql(ctx, cfg.projeto, wiql('Epic'));
  const idsFeatures = await runWiql(ctx, cfg.projeto, wiql('Feature'));
  const epics = idsEpics.length ? await getFields(ctx, idsEpics, CAMPOS) : [];
  const features = idsFeatures.length ? await getFields(ctx, idsFeatures, CAMPOS) : [];

  const { porPai, orfas } = agruparPorPai(features, idsEpics);
  const itens = epics.map(e => itemDe(e, porPai.get(e.id) || [], cfg))
                     .sort((a, b) => a.id - b.id);

  const antes = await fatosAnteriores();
  const g = guardaEsvaziamento(itens.length, antes ? antes.epics.length : null);

  const semStatus = itens.filter(i => i.status === null)
    .concat(itens.flatMap(i => (i.demands || []).filter(d => d.status === null)));
  const semTrack = itens.filter(i => i.track === null);
  const mudancas = diffRodadas(antes ? antes.epics : null, itens);

  console.log(relatorio({ itens, orfas, semStatus, semTrack, mudancas }));

  if(!g.ok && !forcar){ console.error('\n' + g.motivo); process.exit(1); }
  if(!g.ok && forcar) console.warn('\n--forcar: gravando apesar de ' + g.motivo);
  if(seco){ console.log('\n--dry-run: nada gravado.'); process.exit(0); }

  /* Monta o arquivo inteiro antes de gravar: falha no meio deixa o fatos.js
     anterior intacto, em vez de meio arquivo. */
  const conteudo = serializarFatos(new Date().toISOString(), itens);
  await writeFile(DESTINO, conteudo, 'utf8');
  console.log(`\nGravado: ${path.relative(RAIZ, DESTINO)}`);
} catch (e) {
  if(e instanceof AuthError) console.error('PAT inválido ou vencido. Gere outro com escopo Work Items (Read).');
  else if(e instanceof NetworkError) console.error('Falha de rede: ' + e.message);
  else console.error('Erro: ' + e.message);
  process.exit(1);
}
```

- [ ] **Step 7: Verificar o comportamento sem PAT e sem rede**

```bash
node --check tools/sync.mjs && node tools/sync.mjs; echo "exit=$?"
```

Esperado: `Falta ADO_PAT. Use: ADO_PAT=xxx node tools/sync.mjs` e `exit=2`. Nenhum stack trace, nenhum arquivo criado — confirme com `git status`, que não deve mostrar `Radar de projetos/assets/fatos.js`.

- [ ] **Step 8: Commit**

```bash
git add tools
git commit -m "feat(tools): orquestrador do snapshot com guardas e relatório"
```

---

### Task 4: Quebrar os dados no site — prosa, fatos e a fusão

**Files:**
- Create: `Radar de projetos/assets/prosa.js`
- Create: `Radar de projetos/assets/fatos.js` (semente gerada do dado de hoje, sem DevOps)
- Modify: `Radar de projetos/assets/app.js` (fusão, no topo do arquivo, antes de `render()`)
- Modify: `Radar de projetos/index.html`, `board.html`, `pendencias.html`, `produtos.html`, `produtos-tabela.html`, `horizonte.html`, `report.html`, `completo.html` (as tags `<script>`)
- Delete: `Radar de projetos/assets/data.js` (o conteúdo vai para `prosa.js` e `fatos.js`)

**Interfaces:**
- Consumes: nada das tarefas anteriores — esta tarefa é verificável sem DevOps
- Produces: o global `DATA`, montado por `fundir(PROSA, RADAR_FATOS)`, com exatamente a mesma forma que o `data.js` tem hoje, para que nenhuma página precise mudar

- [ ] **Step 1: Criar o `prosa.js` a partir do `data.js` atual**

Copiar `assets/data.js` para `assets/prosa.js` e, no novo arquivo:

1. Renomear `const DATA = {` para `const PROSA = {`.
2. Manter inteiros: `meta`, `tracks`, `summary`, `asks`, `reports`.
3. Trocar o array `items` por um objeto `texto`, indexado pelo id do work item. Cada entrada guarda **só** os campos editoriais, e o campo `notion` de hoje vira comentário de rastreio. Os ids reais só existirão depois da Task 5; nesta tarefa use ids provisórios sequenciais começando em 1, na mesma ordem em que os itens aparecem hoje:

```js
  /* TEXTO EDITORIAL, indexado pelo id do work item no Azure DevOps.
     É o único lugar onde se escreve à mão. Os fatos (estado, janela, produto,
     dono, conclusão) vêm do fatos.js, gerado por tools/sync.mjs.
     Item que existe no DevOps e não tem entrada aqui aparece no Radar com o
     título cru e um marcador de "sem redação" — some em silêncio seria pior. */
  texto:{
    1:{ /* Notion: Ajustes Loja USA Compliance Google */
      title:{pt:"Loja USA em conformidade com as políticas do Google",
             en:"US store compliant with Google policies"},
      why:{pt:"Sem conformidade, os anúncios da loja USA ficam expostos a reprovação e a suspensão de conta.",
           en:"Without compliance, US store ads are exposed to disapproval and account suspension."},
      about:{pt:"Adequação da loja Clube USA às políticas do Google (Merchant Center e Ads): revisão das páginas de política, informações de contato, trocas, devoluções e checkout, corrigindo os pontos que hoje expõem os anúncios a reprovação. É pré-requisito para escalar mídia paga com segurança.",
             en:"Bringing the US Club store in line with Google's policies (Merchant Center and Ads): reviewing policy pages, contact information, exchanges, refunds and checkout, fixing the points that currently expose ads to disapproval. A prerequisite for scaling paid media safely."}}
    /* … as outras 13 entradas, na mesma ordem do data.js atual … */
  }
```

Regra mecânica, item por item, na ordem em que aparecem no `data.js` de hoje
(`n` = 1 para o primeiro, 14 para o último):

- **vão para `texto[n]`:** `title`, `why`, `about`, e — só quando o item já os
  tem — `result` e `healthNote`. Copie os objetos `{pt,en}` inteiros, sem
  reescrever nada.
- **saem do `prosa.js`:** `status`, `track`, `start`, `end`, `owner`,
  `shipped`, `health`, `demands`, `notion`. São fato, e vão para o `fatos.js`
  no Step 2. O `notion` vira o `azureTitle` de lá, e um comentário `/* Notion:
  … */` em cada entrada do `texto` para manter o rastreio legível.
- **nada é inventado:** se um item não tem `about`, a entrada dele não tem
  `about`.

O Step 6 é o portão desta migração: se faltar uma entrada, `semProsa` não vem
zero; se sobrar ou faltar item, a contagem não vem 14. Não confie na leitura —
rode o check.

- [ ] **Step 2: Criar o `fatos.js` semente, com os fatos de hoje**

Escrever à mão (é uma vez só) `assets/fatos.js` com os fatos que hoje estão no `data.js`, no formato que o `tools/guardas.mjs` produz e com os mesmos ids provisórios do `prosa.js`:

```js
/* SEMENTE — os fatos que estavam no data.js, no formato que tools/sync.mjs
   grava. Existe para provar que a quebra em dois arquivos não muda nada na
   tela, antes de o DevOps entrar na história. A Task 5 substitui este arquivo
   por uma rodada real, com os ids verdadeiros. */
const RADAR_FATOS = {
  "geradoEm": "2026-08-11T00:00:00Z",
  "epics": [
    {
      "id": 1,
      "azureTitle": "Ajustes Loja USA Compliance Google",
      "track": "club",
      "start": "2026-07-01",
      "end": "2026-09-30",
      "status": "doing",
      "estadoCru": null,
      "health": null,
      "shipped": null,
      "owner": null,
      "demands": []
    }
    /* … as outras 13, com os mesmos valores que o data.js tem hoje … */
  ]
};
```

- [ ] **Step 3: Escrever a fusão no `app.js`**

Em `assets/app.js`, imediatamente antes da linha `const L = v => (v == null ? "" : ...)`, inserir:

```js
/* --- FUSÃO PROSA + FATOS ------------------------------------------------
   O Radar tem dois tipos de campo. Fato (estado, janela, produto, dono,
   conclusão) vem do Azure DevOps, gerado em fatos.js por tools/sync.mjs.
   Editorial (título legível, why, about, result, healthNote) é escrito à mão
   em prosa.js, indexado pelo mesmo id do work item.

   Item com fato e sem prosa APARECE, com o título cru do DevOps e a marca
   `semProsa` — some em silêncio seria pior, porque falta não se percebe.
   Prosa sem fato não renderiza: o work item saiu do filtro, foi apagado ou
   mudou de área. Quem avisa é ESTA função, num console.warn — o script não
   pode avisar porque ele nunca lê o prosa.js. --- */
function fundir(prosa, fatos){
  const texto = prosa.texto || {};
  const items = ((fatos && fatos.epics) || []).map(f => {
    const t = texto[f.id] || null;
    return {
      id:f.id, notion:f.azureTitle, track:f.track, start:f.start, end:f.end,
      status:f.status, health:f.health, shipped:f.shipped,
      owner:f.owner || undefined,
      demands:f.demands || [],
      semProsa:!t,
      title:t ? t.title : f.azureTitle,
      why:t ? t.why : "",
      about:t ? t.about : "",
      result:t ? t.result : undefined,
      healthNote:t ? t.healthNote : undefined
    };
  });
  /* Texto órfão: entrada em `texto` sem Epic correspondente no fatos.js.
     Não renderiza (não há fato para mostrar), mas não pode passar calado. */
  const vivos = new Set(items.map(i => i.id));
  const orfaos = Object.keys(texto).map(Number).filter(id => !vivos.has(id));
  if(orfaos.length) console.warn(
    "prosa.js: " + orfaos.length + " entrada(s) de texto sem work item correspondente: " +
    orfaos.join(", ") + " — o Epic saiu do filtro, foi apagado ou mudou de área.");

  const meta = Object.assign({}, prosa.meta);
  /* A data de atualização passa a ser quando o snapshot rodou; o valor
     editorial fica como reserva para quando o fatos.js ainda não existe. */
  if(fatos && fatos.geradoEm) meta.updated = fatos.geradoEm.slice(0, 10);
  return {
    meta, tracks:prosa.tracks, summary:prosa.summary,
    asks:prosa.asks || [], reports:prosa.reports || [], items
  };
}
const DATA = fundir(
  typeof PROSA !== "undefined" ? PROSA : {},
  typeof RADAR_FATOS !== "undefined" ? RADAR_FATOS : null
);
```

- [ ] **Step 4: Trocar as tags `<script>` nas 8 páginas**

Em cada um dos 8 arquivos (`index.html`, `board.html`, `pendencias.html`, `produtos.html`, `produtos-tabela.html`, `horizonte.html`, `report.html`, `completo.html`), trocar:

```html
<script src="assets/data.js"></script>
<script src="assets/app.js"></script>
```

por:

```html
<script src="assets/prosa.js"></script>
<script src="assets/fatos.js"></script>
<script src="assets/app.js"></script>
```

A ordem importa: prosa e fatos antes do motor, e fatos depois de prosa porque é ele que sobrescreve `meta.updated`.

NÃO tocar em `Radar de Projetos USA.html` — a versão legada tem cópia própria dos dados embutida e segue congelada.

- [ ] **Step 5: Apagar o `data.js`**

```bash
git rm "Radar de projetos/assets/data.js"
```

- [ ] **Step 6: Verificar que a tela não mudou**

```bash
cd "Radar de projetos" && python3 -m http.server 8001
```

Abrir e conferir, comparando com o que está no ar hoje:

| Página | Esperado |
|---|---|
| `index.html` | os 3 tiles com os mesmos números (Em curso 3, Pendências 0, Próxima data 31 de ago), "O essencial" com as 3 linhas |
| `board.html` | Entregue 0 · Em curso 3 · Planejado 11, com as barras de decorrido nos mesmos percentuais |
| `produtos.html` | 6 produtos, 14 projetos, "9 projetos · 3 em curso" na Loja Clube USA |
| `produtos-tabela.html` | "14 de 14 projetos" |
| `horizonte.html` | as 3 faixas com a mesma distribuição |
| `report.html` | estado vazio ("Nenhum mês com item concluído ainda.") |
| `completo.html` | tudo junto, sem erro |

Console sem erro em todas. No console de qualquer página, confirmar a fusão:

```js
[DATA.items.length, DATA.items.filter(i => i.semProsa).length, DATA.meta.updated]
```

Esperado exatamente: `[14, 0, "2026-08-11"]`. Qualquer outra coisa é migração
incompleta — `semProsa > 0` significa entrada faltando no `texto`, e contagem
diferente de 14 significa item perdido ou duplicado no `fatos.js`. O console
não deve ter nenhum aviso de "entrada(s) de texto sem work item".

Testar também a regra de borda: no console, `RADAR_FATOS.epics.push({id:999, azureTitle:"Epic novo sem texto", track:null, start:null, end:null, status:"next", health:null, shipped:null, owner:null, demands:[]})` e recarregar não funciona (o push não persiste) — em vez disso, adicione temporariamente essa entrada no `fatos.js`, recarregue, confirme que o item aparece com o título cru, e desfaça com `git checkout -- "Radar de projetos/assets/fatos.js"`.

- [ ] **Step 7: Commit**

```bash
git add -A "Radar de projetos"
git commit -m "refactor(dados): separa prosa de fato e funde no motor"
```

---

### Task 5: Rodada real contra o DevOps

**Esta tarefa é conduzida por quem tem o PAT — não é executável por subagente.**

**Files:**
- Modify: `tools/config.json` (mapa de estados e tabela de áreas, com os nomes reais)
- Modify: `Radar de projetos/assets/prosa.js` (reindexar `texto` pelos ids verdadeiros)
- Modify: `Radar de projetos/assets/fatos.js` (substituído por rodada real)

**Interfaces:**
- Consumes: tudo das Tasks 1 a 4
- Produces: o Radar renderizando a partir de dado real do DevOps

- [ ] **Step 1: Descobrir o que existe**

```bash
ADO_PAT=xxx node tools/descobrir.mjs
```

Guardar a saída. Ela responde: os nomes reais dos estados, as Area Paths, quantos Epics existem, se `StartDate`/`TargetDate`/`ClosedDate` estão preenchidos, e se as Features têm `System.Parent`.

- [ ] **Step 2: Decidir sobre as datas — ponto de parada**

Se a linha `TargetDate: N de M` mostrar que as datas **não** estão preenchidas nos Epics, PARE e leve a decisão ao usuário: a "janela" alimenta a barra de decorrido, o Futuro e a próxima data prevista. As opções são preencher no DevOps ou manter `start`/`end` como campo editorial no `prosa.js`. Não escolha sozinho — é decisão de processo, não de código.

- [ ] **Step 3: Preencher o `tools/config.json`**

Colar o esqueleto que o `descobrir.mjs` imprimiu e trocar cada `null` por `"done"`, `"doing"` ou `"next"` nos estados, e pelo id do produto (`club`, `interna`, `influencer`, `reviews`, `quiz`, `europa`) nas áreas.

- [ ] **Step 4: Rodar em seco e ler o relatório**

```bash
ADO_PAT=xxx node tools/sync.mjs --dry-run
```

Conferir: a contagem de Epics bate com o esperado, não há estado não mapeado, não há item sem produto, e as Features órfãs são as que você espera. Ajustar o `config.json` e repetir até o relatório sair limpo.

- [ ] **Step 5: Reindexar o `prosa.js` pelos ids verdadeiros**

O relatório e a saída da descoberta dão o id real de cada Epic. Trocar as chaves provisórias (1 a 14) do objeto `texto` pelos ids do DevOps, casando pelo `azureTitle` — que é o campo `notion` que o `data.js` tinha.

- [ ] **Step 6: Gravar e verificar o site**

```bash
ADO_PAT=xxx node tools/sync.mjs
cd "Radar de projetos" && python3 -m http.server 8001
```

Conferir nas 8 páginas, desktop e 390px, claro e escuro, PT e EN:

- nenhum item com marcador "sem redação" (se houver, falta entrada no `texto`)
- os tiles e o board refletem o estado real do DevOps
- **o Report mensal passa a mostrar meses derivados de `ClosedDate`** — é o teste que prova que a integração cumpriu o objetivo
- console sem erro

- [ ] **Step 7: Commit**

```bash
git add tools/config.json "Radar de projetos/assets/prosa.js" "Radar de projetos/assets/fatos.js"
git commit -m "feat: Radar passa a ler os fatos do Azure DevOps"
```
