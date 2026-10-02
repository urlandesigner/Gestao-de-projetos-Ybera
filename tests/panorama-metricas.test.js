/* AS DUAS CONTAS do Panorama novo: ritmo (do DevOps) e risco do roadmap.

   São funções puras de propósito — o desenho fica no app.js e se confere
   olhando, mas a conta não: um gráfico errado continua bonito, e foi
   exatamente assim que a capa do report passou meses dizendo 28 enquanto o
   corpo contava 8.

   O teste que mais importa aqui é o da RÉGUA: o total do Panorama tem que ser
   o mesmo que o relatório de Entregas publica. O gestor lê os dois, e se eles
   discordarem na frente dele os dois perdem credibilidade. */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');

const AGORA = Date.parse('2026-10-02T12:00:00Z');
const iso = (s) => new Date(s).toISOString();

const epico = (id, titulo) => ({
  id, fields: { 'System.WorkItemType': 'Epic', 'System.State': 'In Progress', 'System.Title': titulo },
});
// Item concluído num mês: ClosedDate é o que manda, como no reportPorMes.
const feito = (id, titulo, pai, quando) => ({
  id, fields: {
    'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done',
    'System.Title': titulo, 'System.Parent': pai,
    'Microsoft.VSTS.Common.ClosedDate': iso(quando), 'System.ChangedDate': iso(quando),
  },
});

/* ---------- evolucaoMensal ---------- */

test('devolve exatamente os N meses pedidos, do mais antigo pro mais novo', () => {
  const items = [epico(1, 'Loja'), feito(10, 'a', 1, '2026-09-10T00:00:00Z')];
  const r = C.evolucaoMensal(items, AGORA, 6);
  assert.equal(r.meses.length, 6);
  assert.deepEqual(r.meses.map((m) => m.mes),
    ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
});

/* Mês sem entrega entra com zero, não é pulado: buraco na série É informação.
   Pular o mês encostaria agosto em outubro e mentiria sobre a forma da curva. */
test('mês sem entrega vem com zero, não some da série', () => {
  const items = [epico(1, 'Loja'), feito(10, 'a', 1, '2026-10-01T00:00:00Z')];
  const r = C.evolucaoMensal(items, AGORA, 3);
  assert.deepEqual(r.meses.map((m) => [m.mes, m.total]),
    [['2026-08', 0], ['2026-09', 0], ['2026-10', 1]]);
});

test('a soma das frentes bate com o total do mês', () => {
  const items = [
    epico(1, 'Loja'), epico(2, 'ERP'),
    feito(10, 'a', 1, '2026-09-05T00:00:00Z'),
    feito(11, 'b', 1, '2026-09-06T00:00:00Z'),
    feito(12, 'c', 2, '2026-09-07T00:00:00Z'),
  ];
  const r = C.evolucaoMensal(items, AGORA, 6);
  const set = r.meses.find((m) => m.mes === '2026-09');
  assert.equal(set.total, 3);
  assert.equal(set.porFrente.reduce((n, f) => n + f.n, 0), 3);
});

/* Item sem épico na cadeia NÃO pode sumir da contagem: o total do gráfico
   divergiria do total do relatório, que é justamente o que a régua única
   existe pra impedir. Ele cai numa frente própria, visível. */
test('item sem épico cai em "Sem frente" e continua contando', () => {
  const items = [feito(10, 'órfão', undefined, '2026-09-05T00:00:00Z')];
  const r = C.evolucaoMensal(items, AGORA, 6);
  const set = r.meses.find((m) => m.mes === '2026-09');
  assert.equal(set.total, 1);
  assert.equal(set.porFrente.length, 1);
  assert.equal(set.porFrente[0].nome, 'Sem frente');
  assert.equal(set.porFrente[0].id, null);
});

test('item aberto não entra: só conta o que fechou', () => {
  const items = [
    epico(1, 'Loja'),
    { id: 10, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'In Progress', 'System.Parent': 1, 'System.ChangedDate': iso('2026-09-05T00:00:00Z') } },
  ];
  const r = C.evolucaoMensal(items, AGORA, 6);
  assert.equal(r.meses.reduce((n, m) => n + m.total, 0), 0);
});

/* A RÉGUA. Este é o teste que impede o Panorama e o relatório de se
   contradizerem na frente do gestor. */
test('o total de um mês é o mesmo que o reportPorMes conta', () => {
  const items = [
    epico(1, 'Loja'), epico(2, 'ERP'),
    feito(10, 'a', 1, '2026-09-05T00:00:00Z'),
    feito(11, 'b', 2, '2026-09-20T00:00:00Z'),
    feito(12, 'c', 1, '2026-08-11T00:00:00Z'),
  ];
  const evo = C.evolucaoMensal(items, AGORA, 6);
  for (const m of C.reportPorMes(items)) {
    const meu = evo.meses.find((x) => x.mes === m.mes);
    if (!meu) continue; // fora da janela de N meses, não é divergência
    assert.equal(meu.total, m.total, `mês ${m.mes}: Panorama e relatório contam diferente`);
  }
});

test('a lista de frentes cobre todas as que aparecem nos meses', () => {
  const items = [
    epico(1, 'Loja'), epico(2, 'ERP'),
    feito(10, 'a', 1, '2026-09-05T00:00:00Z'),
    feito(11, 'b', 2, '2026-08-20T00:00:00Z'),
  ];
  const r = C.evolucaoMensal(items, AGORA, 6);
  const nosMeses = new Set(r.meses.flatMap((m) => m.porFrente.map((f) => f.nome)));
  for (const n of nosMeses) {
    assert.ok(r.frentes.some((f) => f.nome === n), `frente "${n}" não está na legenda`);
  }
});

test('sem item nenhum devolve a série zerada, não quebra', () => {
  const r = C.evolucaoMensal([], AGORA, 6);
  assert.equal(r.meses.length, 6);
  assert.equal(r.meses.every((m) => m.total === 0), true);
  assert.deepEqual(r.frentes, []);
});

/* ---------- riscoDoRoadmap ---------- */

const proj = (titulo, inicio, fim, status) => ({ titulo, inicio, fim, status: status || null });

test('vencido é fim no passado com status diferente de concluído', () => {
  const r = C.riscoDoRoadmap([proj('Compliance', '2026-07-01', '2026-09-30', 'andamento')], AGORA);
  assert.equal(r.vencidos, 1);
  assert.equal(r.lista[0].vencido, true);
});

/* Concluído com fim no passado é o caso NORMAL — é o que todo projeto entregue
   vira. Contá-lo como vencido encheria o painel de alarme falso. */
test('concluído com fim no passado não é vencido', () => {
  const r = C.riscoDoRoadmap([proj('Nova PDP', '2026-07-01', '2026-08-31', 'concluido')], AGORA);
  assert.equal(r.vencidos, 0);
  assert.equal(r.concluidos, 1);
});

test('"teste" não é "concluído": ainda não entregou', () => {
  const r = C.riscoDoRoadmap([proj('X', '2026-07-01', '2026-09-30', 'teste')], AGORA);
  assert.equal(r.concluidos, 0);
  assert.equal(r.vencidos, 1, 'em teste com prazo estourado é risco, não entrega');
});

test('em curso exige hoje dentro da janela', () => {
  const r = C.riscoDoRoadmap([
    proj('Design System', '2026-09-01', '2026-10-31', 'andamento'),
    proj('Futuro', '2026-11-01', '2026-11-30', null),
  ], AGORA);
  assert.equal(r.emCurso, 1);
  assert.equal(r.lista.length, 1, 'o que nem começou não entra na lista');
});

/* Sem status, mas com a janela aberta hoje, o projeto ESTÁ em curso pelo
   calendário — é o caso do Subscription em 02/10/2026, que começou em 01/10 e
   continua marcado como previsto. Deixá-lo de fora esconderia justamente o
   item cujo cadastro está atrasado. */
test('janela aberta hoje conta como em curso mesmo sem status', () => {
  const r = C.riscoDoRoadmap([proj('Subscription', '2026-10-01', '2026-10-31', null)], AGORA);
  assert.equal(r.emCurso, 1);
});

test('diasRestantes é negativo no vencido e positivo no que está em curso', () => {
  const r = C.riscoDoRoadmap([
    proj('Compliance', '2026-07-01', '2026-09-30', 'andamento'),
    proj('Design System', '2026-09-01', '2026-10-31', 'andamento'),
  ], AGORA);
  const venc = r.lista.find((x) => x.titulo === 'Compliance');
  const curso = r.lista.find((x) => x.titulo === 'Design System');
  assert.ok(venc.diasRestantes < 0, 'vencido conta pra trás');
  assert.ok(curso.diasRestantes > 0, 'em curso conta pra frente');
});

test('a lista traz vencidos primeiro — é o que exige ação', () => {
  const r = C.riscoDoRoadmap([
    proj('Design System', '2026-09-01', '2026-10-31', 'andamento'),
    proj('Compliance', '2026-07-01', '2026-09-30', 'andamento'),
  ], AGORA);
  assert.deepEqual(r.lista.map((x) => x.titulo), ['Compliance', 'Design System']);
});

test('o roadmap de verdade dá o retrato que o desenho prometeu', () => {
  const itens = C.saneRoadmapItens(require('../assets/roadmap.json').itens);
  const r = C.riscoDoRoadmap(itens, AGORA);
  assert.equal(r.total, 13);
  assert.equal(r.concluidos, 4);
  assert.equal(r.vencidos, 1, 'Compliance Google, fim 30/09 e ainda em andamento');
  assert.ok(r.lista.some((x) => x.titulo === 'Compliance Google' && x.vencido));
});

test('roadmap vazio não quebra e não inventa risco', () => {
  const r = C.riscoDoRoadmap([], AGORA);
  assert.deepEqual({ t: r.total, c: r.concluidos, v: r.vencidos, e: r.emCurso, n: r.lista.length },
    { t: 0, c: 0, v: 0, e: 0, n: 0 });
});

/* ---------- a bandeira do bloco de Ritmo ---------- */
/* O Urlan pediu o bloco escondido em 02/10/2026 pra melhorá-lo antes de
   expor. O que estes testes guardam é que "escondido" seja escondido de
   verdade: o bloco fora da tela E a consulta que existe só pra ele fora do
   caminho. Deixar o carregamento ligado seria pagar uma consulta ao DevOps,
   a cada abertura do Panorama, pra desenhar algo que ninguém vê. */
const fs = require('node:fs');
const path = require('node:path');
const fonteApp = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');

test('o bloco de Ritmo está desligado, e as contas continuam de pé', () => {
  assert.match(fonteApp, /const RITMO_VISIVEL = false;/,
    'ligar de volta é trocar esta linha — se ela sumiu, o controle sumiu junto');
  assert.match(fonteApp, /\$\{RITMO_VISIVEL \? `<section class="bloco"><h3>Ritmo de entrega<\/h3>/,
    'a seção precisa ficar atrás da bandeira, não ser apagada');
  assert.equal(typeof C.evolucaoMensal, 'function', 'a conta não some com o desenho');
});

test('com o Ritmo desligado, o Panorama não paga a consulta que era só dele', () => {
  assert.match(fonteApp, /if \(RITMO_VISIVEL\) carregarBase\(false\);/,
    'a base completa entrou por causa do Ritmo: escondido o bloco, ela sai junto');
});
