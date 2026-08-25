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
  for (const secao of ['Resumo', 'Entregas do mês', 'Comparativo', 'Depende de decisão', 'Próximos passos']) {
    assert.ok(html.includes(secao), 'falta a seção: ' + secao);
  }
  assert.ok(html.includes('Agosto de 2026'));
  assert.ok(html.includes('Nova PDP USA')); // agrupou por produto
  assert.ok(!html.includes('Destaques'));   // 2 entregas não sustentam um bloco de destaque
  // Cabeçalho de seção é só título e a frase que o explica
  assert.ok(!html.includes('doc-num'), 'numeral gigante saiu do cabeçalho');
  assert.ok(!html.includes('Executive summary'), 'rótulo em inglês saiu das seções');
  assert.ok(!html.includes('Monthly report'), 'e saiu da capa também');
  assert.ok(!html.includes('doc-en'), 'nenhum rótulo em inglês sobrou no documento');
  assert.match(html, /<h2>Resumo<\/h2>\s*<p class="doc-intro">/);
});

test('htmlReport escreve a prosa com volume, comparação e situação', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', escopo: 'Urlan Dipre' });
  assert.ok(html.includes('no nome de <b>Urlan Dipre</b>'));
  assert.ok(/Em agosto de 2026, <b>2 itens<\/b>/.test(html));       // 2 fechados em agosto
  assert.ok(html.includes('<b>1 a mais</b> que em julho de 2026'));  // 1 fechado em julho
  assert.ok(html.includes('em execução agora'));
  assert.ok(html.includes('sem movimento há 31 dias'));
  // O único atrasado do recorte está travado: ele conta em "Depende de decisão",
  // não em "Próximos passos" — e a prosa não pode contá-lo duas vezes.
  assert.ok(!html.includes('já passou do prazo'));
});

test('htmlReport não repete o item travado em Próximos passos', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  const decisao = html.slice(html.indexOf('id="decisao"'), html.indexOf('id="proximos"'));
  const proximos = html.slice(html.indexOf('id="proximos"'));
  assert.ok(decisao.includes('Integração ERP'));
  assert.ok(decisao.includes('atrasado desde'));   // o prazo vem pra cá
  assert.ok(decisao.includes('parado há 31 d'));
  assert.ok(!proximos.includes('Integração ERP'));
  assert.ok(!proximos.includes('Já passou do prazo'));
});

test('htmlReport escapa título', () => {
  const itens = [it(7, 'Product Backlog Item', 'Done', 'Aspas " e <script>', null, null, 2)];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

// Documento pra quem não tem acesso ao DevOps: mandar essa pessoa pra uma tela de
// login é pior que não oferecer caminho nenhum. O número do item fica como texto.
test('htmlReport não põe nenhum link pro DevOps', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://dev.azure.com/nivello' });
  assert.ok(!html.includes('_workitems'), 'nenhum link de work item');
  assert.ok(!html.includes('dev.azure.com'), 'nenhuma menção à URL da organização');
  assert.ok(!/href="http/.test(html), 'nenhum link externo');
  assert.ok(html.includes('#11'), 'o número do item continua legível');
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

// O ano inteiro até hoje, tenha tido entrega ou não: mês vazio é informação, e
// listar só os meses com entrega deixava o PO sem como olhar os outros.
test('htmlReport lista todos os meses do ano até hoje', () => {
  const { meses } = B.htmlReport({ items: base(), agora: AGORA });
  assert.deepEqual(meses, ['2026-08', '2026-07', '2026-06', '2026-05', '2026-04',
    '2026-03', '2026-02', '2026-01']); // agosto é o mês de AGORA; setembro não entra
});

test('htmlReport abre mês vazio sem quebrar', () => {
  const { vazio, html } = B.htmlReport({ items: base(), agora: AGORA, mes: '2026-03' });
  assert.equal(vazio, false);
  assert.ok(html.includes('Março de 2026'));
  assert.ok(html.includes('Nada foi concluído neste mês'));
  assert.ok(!html.includes('id="entregas"')); // sem entrega, sem bloco de entregas
  assert.ok(html.includes('Situação de hoje'));
});

// Mês fechado só pode afirmar o que é histórico. Estado, prazo e trava são
// leitura de agora — o DevOps não guarda o estado que o item tinha em julho.
test('htmlReport em mês fechado mostra entregas e explica o que ficou de fora', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', mes: '2026-07' });
  assert.ok(html.includes('Julho de 2026'));
  assert.ok(html.includes('Item de julho'));
  assert.ok(!html.includes('Zoom na imagem'), 'item de agosto não entra no mês de julho');
  assert.ok(html.includes('Situação de hoje'));
  assert.ok(html.includes('troque para o mês corrente'));
  assert.ok(!html.includes('Depende de decisão'));
  assert.ok(!html.includes('Próximos passos'));
});

test('htmlReport aceita mês sem nenhuma entrega', () => {
  const { vazio, html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', mes: '2026-06' });
  assert.equal(vazio, false);
  assert.ok(html.includes('Junho de 2026'));
  assert.ok(html.includes('Nada foi concluído neste mês'));
});

// O produto deixou de ser texto solto: virou o próprio item, com selo e situação.
test('htmlReport mostra o épico do grupo com selo', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  assert.match(html, /<h3 class="cab-produto">\s*<span class="badge-tipo tipo-epic">Épico<\/span>/);
  assert.ok(html.includes('<span class="cab-nome">Nova PDP USA</span>'));
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
    it(1, 'Epic', 'Done', 'Tema Global', null, null, 2),
    it(11, 'Product Backlog Item', 'Done', 'Filho ativo', 1, null, 1),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA, org: 'https://x/y' });
  // Na lista o épico é cabeçalho do grupo — não pode virar linha também.
  // (O nome aparece de novo no chip de filtro, que fica fora da lista.)
  const lista = html.slice(html.indexOf('id="lista-entregas"'), html.indexOf('id="comparativo"'));
  assert.equal((lista.match(/Tema Global/g) || []).length, 1);
  assert.ok(lista.includes('Filho ativo'));
});

// Destaque precisa de material: com um produto só, ou meia dúzia de itens, a
// seção seria a de entregas repetida.
test('htmlReport ranqueia destaques por volume quando há material', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Produto grande', null, 20),
    it(2, 'Epic', 'In Progress', 'Produto pequeno', null, 20),
    it(11, 'Product Backlog Item', 'Done', 'A', 1, null, 1),
    it(12, 'Product Backlog Item', 'Done', 'B', 1, null, 2),
    it(13, 'Product Backlog Item', 'Done', 'C', 1, null, 3),
    it(21, 'Product Backlog Item', 'Done', 'D', 2, null, 4),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA, org: 'https://x/y' });
  const bloco = html.slice(html.indexOf('id="destaques"'), html.indexOf('id="entregas"'));
  assert.ok(bloco.includes('Produto grande'));
  assert.ok(bloco.indexOf('Produto grande') < bloco.indexOf('Produto pequeno'));
  assert.ok(bloco.includes('3 entregas no mês'));
  assert.ok(bloco.includes('1 entrega no mês'));
});

test('htmlReport monta chips e contador no bloco de entregas', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  assert.ok(html.includes('id="busca-entregas"'));
  assert.ok(html.includes('>2 de 2<'));
  assert.match(html, /data-filtro="produto" data-valor="p1"/);
  assert.match(html, /data-filtro="tipo" data-valor="pbi"/);
  assert.match(html, /<li data-tipo="pbi" data-produto="p1" data-busca="zoom na imagem #11"/);
});

test('htmlReport lista os meses no comparativo com a variação', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  const comp = html.slice(html.indexOf('id="comparativo"'), html.indexOf('id="decisao"'));
  assert.ok(comp.includes('Agosto de 2026'));
  assert.ok(comp.includes('Julho de 2026'));
  assert.match(comp, /comp-delta sobe[^>]*>\+1</);   // 2 em agosto contra 1 em julho
  assert.match(comp, /comp-delta[^>]*>—</);           // julho não tem mês anterior
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

// Documento sem h1, ou com salto de h1 pra h4, é documento mal formado pra quem
// navega por leitor de tela.
test('htmlReport tem uma hierarquia de títulos sem salto', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  const niveis = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  assert.equal(niveis.filter((n) => n === 1).length, 1); // um h1: o título do documento
  assert.equal(niveis[0], 1);
  assert.equal(Math.max(...niveis), 3);
  assert.ok(!niveis.includes(4) && !niveis.includes(5));
});

// O resumo responde três perguntas diferentes (volume, onde caiu, situação):
// cada uma no seu cartão, não numa massa de texto só.
test('htmlReport separa o resumo em um cartão por parágrafo', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  assert.equal((resumo.match(/class="resumo-cartao"/g) || []).length, 3);
  assert.ok(resumo.includes('resumo-cartoes'));
});

test('htmlReport em mês fechado tem só os dois cartões de fato histórico', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', mes: '2026-07' });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  assert.equal((resumo.match(/class="resumo-cartao"/g) || []).length, 2);
});

// O report é documento do ano. Ano anterior no seletor só fazia a lista crescer.
const dez2025 = () => [
  ...base(),
  it(60, 'Product Backlog Item', 'Done', 'Coisa de dezembro', null, null, 260),
];

test('htmlReport não lista mês de ano anterior no seletor', () => {
  const { meses } = B.htmlReport({ items: dez2025(), agora: AGORA });
  assert.ok(!meses.some((m) => m.startsWith('2025')));
  assert.equal(meses.length, 8);
});

test('htmlReport mantém no seletor o mês escolhido, mesmo de outro ano', () => {
  const { meses, html } = B.htmlReport({ items: dez2025(), agora: AGORA, mes: '2025-12' });
  assert.equal(meses[meses.length - 1], '2025-12');
  assert.equal(meses.length, 9);
  assert.ok(html.includes('Dezembro de 2025')); // link antigo continua abrindo
});

test('htmlReport limita o comparativo ao ano corrente', () => {
  const { html } = B.htmlReport({ items: dez2025(), agora: AGORA });
  const comp = html.slice(html.indexOf('id="comparativo"'), html.indexOf('id="decisao"'));
  assert.ok(comp.includes('Agosto de 2026'));
  assert.ok(comp.includes('Julho de 2026'));
  assert.ok(!comp.includes('Dezembro de 2025'));
  assert.ok(comp.includes('mês a mês em 2026'));
  // Julho segue comparado com dezembro/2025, que existe mas não aparece: mesmo
  // volume, então "=". Se a comparação tivesse sido cortada junto, julho seria o
  // mês mais antigo da lista e mostraria "—".
  assert.match(comp, /comp-delta[^>]*>=</);
  assert.ok(!comp.includes('>—<'));
});

// A linha de identificação do documento: quem responde e por qual escopo. Lista
// de times do DevOps é organograma interno e não entra.
test('htmlReport identifica o PO e a unidade na capa', () => {
  const { html } = B.htmlReport({
    items: base(), agora: AGORA, escopo: 'Urlan Dipre', unidade: 'Ybera US',
  });
  const capa = html.slice(html.indexOf('doc-meta'), html.indexOf('</p>', html.indexOf('doc-meta')));
  assert.ok(capa.includes('P.O responsável: Urlan Dipre'));
  assert.ok(capa.includes('Ybera US'));
  assert.ok(!capa.includes('recorte'));
  assert.ok(!capa.includes('gerado em'));
});

test('htmlReport omite o P.O quando não há recorte por responsável', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, unidade: 'Ybera US' });
  const capa = html.slice(html.indexOf('doc-meta'), html.indexOf('</p>', html.indexOf('doc-meta')));
  assert.ok(!capa.includes('P.O responsável'));
  assert.ok(capa.includes('Ybera US'));
});
