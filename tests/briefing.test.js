const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../assets/briefing.js');

const AGORA = Date.parse('2026-08-20T12:00:00Z');
const dia = 86400000;
const iso = (t) => new Date(t).toISOString();

// item do report: tipo, estado, título, pai, alvo (dias à frente), fechado (dias atrás)
const it = (id, tipo, estado, titulo, pai, alvoDias, fechadoDias, alteradoDias) => ({
  id, projeto: 'B2C',
  fields: {
    'System.WorkItemType': tipo, 'System.State': estado, 'System.Title': titulo,
    'System.Parent': pai || undefined,
    'Microsoft.VSTS.Scheduling.TargetDate': alvoDias == null ? undefined : iso(AGORA + alvoDias * dia),
    'Microsoft.VSTS.Common.ClosedDate': fechadoDias == null ? undefined : iso(AGORA - fechadoDias * dia),
    'System.ChangedDate': iso(AGORA - (alteradoDias == null ? 1 : alteradoDias) * dia),
  },
});

const base = () => [
  it(1, 'Epic', 'In Progress', 'Nova PDP USA', null, 5),
  it(10, 'Feature', 'Done', 'Galeria de imagens', 1, null, 3),
  it(11, 'Product Backlog Item', 'Done', 'Zoom na imagem', 10, null, 6),
  it(20, 'Product Backlog Item', 'In Progress', 'Prova social', 10, 4),
  it(30, 'Feature', 'Blocked', 'Integração ERP', 1, -6, null, 31),
  it(40, 'Product Backlog Item', 'Done', 'Item de julho', 1, null, 45),
];

test('htmlReport monta as seções do briefing', () => {
  const { vazio, html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://dev.azure.com/nivello' });
  assert.equal(vazio, false);
  for (const secao of ['Resumo', 'Entregue no mês', 'Em execução', 'Prazos', 'Travado — depende de decisão', 'Meses anteriores']) {
    assert.ok(html.includes(secao), 'falta a seção: ' + secao);
  }
  assert.ok(html.includes('Agosto de 2026'));
  assert.ok(html.includes('Nova PDP USA')); // agrupou por produto
});

test('htmlReport escreve a prosa com volume, comparação e situação', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', escopo: 'Urlan Dipre' });
  assert.ok(html.includes('no nome de <b>Urlan Dipre</b>'));
  assert.ok(/Em agosto de 2026, <b>2 itens<\/b>/.test(html));       // 2 fechados em agosto
  assert.ok(html.includes('<b>1 a mais</b> que em julho de 2026'));  // 1 fechado em julho
  assert.ok(html.includes('em execução agora'));
  assert.ok(html.includes('já passou do prazo'));
  assert.ok(html.includes('sem movimento há 31 dias'));
});

test('htmlReport gera link do work item e escapa título', () => {
  const itens = [it(7, 'Product Backlog Item', 'Done', 'Aspas " e <script>', null, null, 2)];
  const { html } = B.htmlReport({ items: itens, agora: AGORA, org: 'https://dev.azure.com/org' });
  assert.ok(html.includes('https://dev.azure.com/org/B2C/_workitems/edit/7'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('htmlReport avisa quando não há nada no recorte', () => {
  const r = B.htmlReport({ items: [], agora: AGORA, org: 'https://x/y' });
  assert.equal(r.vazio, true);
  assert.ok(r.html.includes('Nada registrado'));
});

test('htmlReport marca com ~ a data de conclusão aproximada', () => {
  // sem ClosedDate: cai em ChangedDate e precisa avisar
  const itens = [it(9, 'Feature', 'Done', 'Fechou sem data', null, null, null, 4)];
  const { html } = B.htmlReport({ items: itens, agora: AGORA, org: 'https://x/y' });
  assert.ok(html.includes('~'));
});

test('mesPorExtenso e dataCurta formatam em pt-BR sobre UTC', () => {
  assert.equal(B.mesPorExtenso('2026-08'), 'Agosto de 2026');
  assert.equal(B.mesPorExtenso('2027-01'), 'Janeiro de 2027');
  assert.equal(B.dataCurta('2026-09-01T00:00:00Z'), '01 de set.');
  assert.equal(B.dataCurta(null), '');
});
