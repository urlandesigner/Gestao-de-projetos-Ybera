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
  for (const secao of ['Resumo', 'Entregue no mês', 'Em execução', 'Prazos', 'Travado — depende de decisão']) {
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

// O filtro por responsável recorta o que aparece, mas o produto de um PBI mora
// no pai — que quase sempre está em outro nome, ou sem ninguém. Se o mapa fosse
// montado só com o recorte, tudo cairia em "Sem produto associado".
test('htmlReport acha o produto pelo pai fora do recorte', () => {
  const todos = base();
  const recorte = todos.filter((x) => x.id === 11); // só o PBI; Feature 10 e Épico 1 ficaram de fora
  const semTodos = B.htmlReport({ items: recorte, agora: AGORA, org: 'https://x/y' });
  assert.ok(semTodos.html.includes('Sem produto associado'), 'sem `todos` a cadeia quebra');

  const comTodos = B.htmlReport({ items: recorte, todos, agora: AGORA, org: 'https://x/y' });
  assert.ok(comTodos.html.includes('Nova PDP USA'), 'devia agrupar no épico do pai');
  assert.ok(!comTodos.html.includes('Sem produto associado'));
  assert.ok(!comTodos.html.includes('Zoom na imagem') === false); // o PBI segue listado
  assert.ok(!comTodos.html.includes('Prova social'), 'item fora do recorte não pode aparecer');
});

test('htmlReport lista os meses com entrega e o mês corrente', () => {
  const { meses } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  assert.deepEqual(meses, ['2026-08', '2026-07']); // mais novo primeiro
});

// Mês fechado só pode afirmar o que é histórico. Estado, prazo e trava são
// leitura de agora — o DevOps não guarda o estado que o item tinha em julho.
test('htmlReport em mês fechado mostra entregas e explica o que ficou de fora', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', mes: '2026-07' });
  assert.ok(html.includes('Julho de 2026'));
  assert.ok(html.includes('Item de julho'));
  assert.ok(!html.includes('Zoom na imagem'), 'item de agosto não entra no mês de julho');
  assert.ok(html.includes('Só aparecem no mês corrente'));
  assert.ok(!html.includes('Travado — depende de decisão'));
  assert.ok(!html.includes('<h4>Prazos'));
});

test('htmlReport aceita mês sem nenhuma entrega', () => {
  const { vazio, html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', mes: '2026-06' });
  assert.equal(vazio, false);
  assert.ok(html.includes('Junho de 2026'));
  assert.ok(html.includes('Nada foi concluído neste mês'));
});

// O produto deixou de ser texto solto: virou o próprio item, com selo e link.
test('htmlReport mostra o épico do grupo com selo e link', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://dev.azure.com/nivello' });
  assert.match(html, /<h5 class="cab-produto">\s*<span class="badge-tipo tipo-epic">Épico<\/span>/);
  assert.ok(html.includes('_workitems/edit/1"'), 'o épico tem link pro DevOps');
});

test('htmlReport joga "sem produto" pro fim, mesmo sendo o maior grupo', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Com produto', null, 5),
    it(11, 'Product Backlog Item', 'Done', 'Filho do épico', 1, null, 3),
    it(90, 'Product Backlog Item', 'Done', 'Solto A', null, null, 3),
    it(91, 'Product Backlog Item', 'Done', 'Solto B', null, null, 3),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA, org: 'https://x/y' });
  assert.ok(html.indexOf('Com produto') < html.indexOf('Sem produto associado'));
});

// Um épico é o produto de si mesmo: ele já é o cabeçalho do grupo. Repetir a
// linha embaixo parecia defeito — o que a linha diria vai pro cabeçalho.
test('htmlReport não repete o épico como cabeçalho e como linha', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Tema Global', null, 12),
    it(11, 'Product Backlog Item', 'In Progress', 'Filho ativo', 1, 3),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA, org: 'https://x/y' });
  const execucao = html.slice(html.indexOf('Em execução'), html.indexOf('Prazos'));
  assert.equal((execucao.match(/Tema Global/g) || []).length, 1);
  assert.ok(execucao.includes('Filho ativo'));
});

test('htmlReport não mostra prazo de produto já concluído', () => {
  const itens = [
    it(1, 'Epic', 'Done', 'Compliance', null, 5, 2),
    it(11, 'Product Backlog Item', 'Done', 'Última etapa', 1, null, 1),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA, org: 'https://x/y' });
  const cab = html.slice(html.indexOf('cab-produto'), html.indexOf('lista-linhas'));
  assert.ok(!cab.includes('prazo '), 'produto fechado não anuncia prazo: ' + cab);
});
