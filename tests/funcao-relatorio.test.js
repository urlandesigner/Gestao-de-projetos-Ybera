/* A FUNÇÃO DA VERCEL que entrega o relatório ao vivo (15/10/2026).

   Roda o handler de verdade, com um DevOps falso no lugar do `fetch`. O que se
   guarda aqui, em ordem de gravidade:
   1. nada de material local nem de consulta livre sai da função;
   2. só edição e PO da lista; agosto/setembro fica no arquivo;
   3. cada PO recebe só os itens dela (pelo e-mail da ficha);
   4. sem token, falha clara (503) — e o relatório cai no arquivo;
   5. cache e CORS certos. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { responder } = require('../api/_lib/relatorio.js');

const OUTUBRO = Date.parse('2026-10-15T15:00:00Z');

function item(id, tipo, estado, pai, email, nome, fechado) {
  return { id, fields: {
    'System.WorkItemType': tipo, 'System.State': estado, 'System.Title': 'Item ' + id,
    'System.Parent': pai, 'System.IterationPath': 'B2C',
    'System.AssignedTo': email ? { uniqueName: email, displayName: nome } : undefined,
    'Microsoft.VSTS.Common.ClosedDate': fechado, 'System.ChangedDate': fechado,
    'System.Description': '<p>DESCRICAO INTERNA com link</p>',
  } };
}
const ITENS = [
  item(1, 'Product Backlog Item', 'Done', 10, 'urlan.dipre@ybera.com', 'Urlan Dipre', '2026-10-08T12:00:00Z'),
  item(2, 'Product Backlog Item', 'Done', 10, 'daniele.depaula@ybera.com', 'Daniele de Paula', '2026-10-09T12:00:00Z'),
  // Outra pessoa com o mesmo primeiro nome: não pode cair no relatório do Urlan.
  item(3, 'Product Backlog Item', 'Done', 10, 'urlan.outro@ybera.com', 'Urlan Outro', '2026-10-09T12:00:00Z'),
];
const PAIS = [
  { id: 10, fields: { 'System.WorkItemType': 'Feature', 'System.Title': '[EUA] Checkout', 'System.Parent': 100 } },
  { id: 100, fields: { 'System.WorkItemType': 'Epic', 'System.Title': 'Loja Clube USA' } },
];

// Responde às rotas que o api.js usa; anota cada URL pedida.
function devopsFalso({ status = 200 } = {}) {
  const pedidos = [];
  const fetchImpl = async (url, opcoes) => {
    pedidos.push({ url, auth: ((opcoes || {}).headers || {}).Authorization });
    const corpo = (obj) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
    if (status !== 200) return corpo({});
    if (/teamfieldvalues/.test(url)) return corpo({ values: [{ value: 'B2C\\Ecommerce', includeChildren: true }] });
    if (/iterations/.test(url)) return corpo({ value: [] });
    if (/wiql/.test(url)) return corpo({ workItems: ITENS.map((x) => ({ id: x.id })) });
    if (/workitemsbatch/.test(url)) {
      const ids = JSON.parse(opcoes.body).ids;
      return corpo({ value: ITENS.concat(PAIS).filter((x) => ids.includes(x.id)) });
    }
    return corpo({});
  };
  return { fetchImpl, pedidos };
}

const pedir = (q, extra) => new Request('https://gestao-de-projetos-ybera.vercel.app/api/relatorio' + q,
  { headers: Object.assign({ origin: 'https://nivello-sistemas.github.io' }, extra || {}) });
const env = { AZDO_PAT: 'token-de-teste' };

test('entrega o pacote da PO, sem material local e sem descrição crua', async () => {
  const { fetchImpl, pedidos } = devopsFalso();
  const r = await responder(pedir('?edicao=2026-10&de=urlan'), { env, fetchImpl, agora: OUTUBRO, avisar: () => {} });
  assert.equal(r.status, 200);
  const pacote = await r.json();
  assert.deepEqual(Object.keys(pacote).filter((k) => k.startsWith('_')), []);
  assert.doesNotMatch(JSON.stringify(pacote), /DESCRICAO INTERNA/);
  assert.equal(pacote.em, OUTUBRO);
  assert.equal(pacote.escopo, 'Urlan Dipre');
  // Só o item do Urlan de verdade — o homônimo e a Daniele ficam de fora.
  const auto = pacote.automaticos;
  assert.equal(auto.length, 1);
  assert.deepEqual(auto[0].itens.map((x) => x.id), [1]);
  // O token foi pro DevOps, e só pra lá.
  assert.ok(pedidos.length > 0 && pedidos.every((p) => p.url.startsWith('https://dev.azure.com/nivello')));
  assert.ok(pedidos.every((p) => /^Basic /.test(p.auth)));
});

test('a Daniele recebe só os itens dela', async () => {
  const { fetchImpl } = devopsFalso();
  const r = await responder(pedir('?edicao=2026-10&de=daniele'), { env, fetchImpl, agora: OUTUBRO, avisar: () => {} });
  const pacote = await r.json();
  assert.deepEqual(pacote.automaticos[0].itens.map((x) => x.id), [2]);
  assert.equal(pacote.escopo, 'Daniele de Paula');
});

test('só edição e PO da lista', async () => {
  const { fetchImpl, pedidos } = devopsFalso();
  for (const q of ['?edicao=2099-01&de=urlan', '?edicao=../../x&de=urlan',
    '?edicao=2026-10&de=fulano', '?edicao=2026-10&de=__proto__', '?de=urlan']) {
    const r = await responder(pedir(q), { env, fetchImpl, agora: OUTUBRO });
    assert.equal(r.status, 400, q);
  }
  assert.equal(pedidos.length, 0, 'pedido inválido não pode chegar ao DevOps');
});

test('novembro existe a partir de 1º/11 em Brasília, não em UTC', async () => {
  const { fetchImpl } = devopsFalso();
  const opcoes = (agora) => ({ env, fetchImpl, agora, avisar: () => {} });
  // 31/10 às 23h de Brasília = 02h UTC de 1º/11: ainda outubro.
  assert.equal((await responder(pedir('?edicao=2026-11&de=urlan'), opcoes(Date.parse('2026-11-01T02:00:00Z')))).status, 400);
  assert.equal((await responder(pedir('?edicao=2026-11&de=urlan'), opcoes(Date.parse('2026-11-01T03:30:00Z')))).status, 200);
});

test('sem token: 503, e nenhum pedido ao DevOps', async () => {
  const { fetchImpl, pedidos } = devopsFalso();
  const r = await responder(pedir('?edicao=2026-10&de=urlan'), { env: {}, fetchImpl, agora: OUTUBRO });
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { erro: 'sem-token' });
  assert.equal(pedidos.length, 0);
});

test('token recusado pelo DevOps: 502, sem detalhe na resposta', async () => {
  const { fetchImpl } = devopsFalso({ status: 401 });
  const avisos = [];
  const r = await responder(pedir('?edicao=2026-10&de=urlan'), { env, fetchImpl, agora: OUTUBRO, avisar: (m) => avisos.push(m) });
  assert.equal(r.status, 502);
  assert.deepEqual(await r.json(), { erro: 'devops' });
  assert.ok(avisos.length, 'o motivo tem que ir pro log');
});

test('cache: 60 s no mês aberto, um dia no mês fechado', async () => {
  const { fetchImpl } = devopsFalso();
  const aberto = await responder(pedir('?edicao=2026-10&de=urlan'), { env, fetchImpl, agora: OUTUBRO, avisar: () => {} });
  assert.match(aberto.headers.get('cache-control'), /s-maxage=60\b/);
  const fechado = await responder(pedir('?edicao=2026-10&de=urlan'),
    { env, fetchImpl, agora: Date.parse('2026-11-10T12:00:00Z'), avisar: () => {} });
  assert.match(fechado.headers.get('cache-control'), /s-maxage=86400/);
});

test('CORS só para os sites do relatório', async () => {
  const { fetchImpl } = devopsFalso();
  const ok = await responder(pedir('?edicao=2026-10&de=urlan'), { env, fetchImpl, agora: OUTUBRO, avisar: () => {} });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://nivello-sistemas.github.io');
  const outro = await responder(pedir('?edicao=2026-10&de=urlan', { origin: 'https://evil.example' }),
    { env, fetchImpl, agora: OUTUBRO, avisar: () => {} });
  assert.equal(outro.headers.get('access-control-allow-origin'), null);
});

/* Agosto/setembro é servida (pra gerar o arquivo congelado dela), mas o
   relatório não a lê daqui — ela não é `aoVivo`. Fechada: cache de um dia. */
test('agosto/setembro é servida com o período dos dois meses e cache de mês fechado', async () => {
  const { fetchImpl } = devopsFalso();
  const r = await responder(pedir('?edicao=2026-08&de=urlan'), { env, fetchImpl, agora: OUTUBRO, avisar: () => {} });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control'), /s-maxage=86400/);
  const V = require('../assets/briefing-entregas-v2.js');
  assert.equal(V.EDICOES.find((e) => e.id === '2026-08').aoVivo, undefined, 'o relatório passou a ler agosto ao vivo');
});
