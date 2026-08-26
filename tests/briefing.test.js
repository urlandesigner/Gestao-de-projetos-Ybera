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
  assert.ok(!html.includes('Destaques'));   // Destaques saiu: repetia os itens de Entregas
  // Cabeçalho de seção é só título e a frase que o explica
  assert.ok(!html.includes('doc-num'), 'numeral gigante saiu do cabeçalho');
  assert.ok(!html.includes('Executive summary'), 'rótulo em inglês saiu das seções');
  assert.ok(!html.includes('Monthly report'), 'e saiu da capa também');
  assert.ok(!html.includes('doc-en'), 'nenhum rótulo em inglês sobrou no documento');
  assert.match(html, /<h2>Resumo<\/h2>\s*<p class="doc-intro">/);
});

test('htmlReport escreve a prosa com volume, comparação e situação', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', escopo: 'Urlan Dipre' });
  // Sem "no nome de X": o P.O. é quem o report inteiro é sobre, repetir seria eco.
  assert.ok(!html.includes('no nome de'));
  assert.ok(/Em agosto de 2026, <b>2 itens<\/b>/.test(html));       // 2 fechados em agosto
  assert.ok(html.includes('<b>1 a mais</b> que em julho de 2026'));  // 1 fechado em julho
  assert.ok(html.includes('em execução agora'));
  assert.ok(html.includes('item está travado'));
  // "Sem movimento há N dias" soa como o time emperrado — não é o que a
  // decisão do P.O. resolve, então saiu da prosa.
  assert.ok(!html.includes('sem movimento'));
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

// O produto vira o cabeçalho do grupo pelo nome, sem selo de tipo: "Épico"/
// "Feature" é jargão de DevOps e só competia com o nome do produto.
test('htmlReport mostra o produto no cabeçalho sem selo de tipo', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  assert.ok(html.includes('<h3 class="cab-nome">Nova PDP USA</h3>'));
  assert.ok(!html.includes('badge-tipo'), 'nenhum selo de tipo no documento');
});

// O System.State do épico ("New", "In Progress") saiu do cabeçalho: é jargão em
// inglês e costuma estar desatualizado — a barra de rumo diz melhor. Sobra o prazo.
test('htmlReport não mostra o estado do produto no cabeçalho, só o prazo', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  const cab = html.slice(html.indexOf('id="lista-entregas"'), html.indexOf('lista-linhas'));
  assert.ok(!cab.includes('In Progress'), 'estado não aparece no cabeçalho');
  assert.ok(cab.includes('prazo '), 'prazo continua');
});

// Etapa #2 (rumo, % dos filhos) no cabeçalho de produto da Entregas. O objetivo
// (descrição) foi removido: a descrição real é boilerplate, não agrega ao leitor.
test('htmlReport põe a barra de rumo no cabeçalho de produto, sem objetivo', () => {
  const epico = { id: 1, projeto: 'B2C', fields: {
    'System.WorkItemType': 'Epic', 'System.State': 'In Progress', 'System.Title': 'Nova PDP USA',
    'System.Description': '<p>Aumentar a conversão da PDP nos EUA.</p>',
  } };
  const itens = [
    epico,
    it(10, 'Feature', 'Done', 'Galeria', 1, null, 3),          // filho concluído no mês
    it(11, 'Product Backlog Item', 'Done', 'Zoom', 1, null, 4), // outro concluído
    it(12, 'Product Backlog Item', 'In Progress', 'Prova social', 1, 5), // filho em aberto
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.ok(!html.includes('cab-objetivo'), 'não há mais linha de objetivo');
  assert.ok(!html.includes('Aumentar a conversão da PDP nos EUA.'), 'a descrição não aparece');
  assert.match(html, /class="cab-barra"[^>]*aria-label="[^"]*concluíd/);   // barra rotulada
  assert.ok(html.includes('2 de 3 itens concluídos · 67%'), 'rumo: 2 de 3, 67%');
});

// Modo leitura: o rumo vem pronto no link (o.produtos). Sem ele, o % seria
// recalculado de um backlog incompleto e subcontaria.
test('htmlReport usa o.produtos (link) em vez de recalcular o rumo', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Nova PDP USA', null, 6),
    it(11, 'Product Backlog Item', 'Done', 'Zoom', 1, null, 4),
  ];
  const produtos = { 1: { feitos: 8, total: 10 } };
  const { html } = B.htmlReport({ items: itens, agora: AGORA, produtos });
  assert.ok(html.includes('8 de 10 itens concluídos · 80%'));
});

// Etapa #5: o pedido de decisão (marcador "Decisão:" na descrição do item travado)
// aparece embaixo do item em "Depende de decisão".
test('htmlReport põe o pedido de decisão no item travado', () => {
  const itens = base().map((x) => (x.id === 30
    ? { id: x.id, projeto: x.projeto, fields: Object.assign({}, x.fields, {
      'System.Description': 'Decisão: destravar a integração ERP — com a Diretoria de TI.',
    }) }
    : x));
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  const decisao = html.slice(html.indexOf('id="decisao"'), html.indexOf('id="proximos"'));
  assert.ok(decisao.includes('Decisão a tomar'));
  assert.ok(decisao.includes('destravar a integração ERP — com a Diretoria de TI.'));
});

test('htmlReport usa o.decisoes (link) no pedido de decisão', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, decisoes: { 30: 'Pedido assado no link.' } });
  const decisao = html.slice(html.indexOf('id="decisao"'), html.indexOf('id="proximos"'));
  assert.ok(decisao.includes('Pedido assado no link.'));
});

// Manchete e nota de recorte saíram da capa a pedido: a capa fica só com
// título, "P.O responsável" e os KPIs — sem prosa duplicando o que os
// números já dizem.
test('htmlReport não tem manchete nem nota de recorte na capa', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, escopo: 'Urlan Dipre', unidade: 'Ybera US' });
  const capa = html.slice(0, html.indexOf('doc-nav'));
  assert.ok(!capa.includes('doc-manchete'));
  assert.ok(!capa.includes('doc-recorte'));
  assert.ok(!capa.includes('na frente das entregas'));
  assert.ok(!capa.includes('Recorte:'));
  assert.ok(capa.includes('P.O responsável: Urlan Dipre'), 'meta com o responsável continua na capa');
});

// Etapa #6: triagem de risco derivada — nomeia as frentes com item atrasado.
// O travado atrasado não entra aqui: ele já vai em "Depende de decisão".
test('triagem de risco exclui o travado (base() só tem o travado atrasado)', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  assert.ok(!html.includes('Frentes com item atrasado'), 'o travado não vira frente em risco aqui');
});

test('triagem de risco agrupa por frente e ordena pelo mais afetado', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Frente A', null, 3),
    it(2, 'Epic', 'In Progress', 'Frente B', null, 3),
    it(10, 'Product Backlog Item', 'In Progress', 'A1', 1, -2), // atrasado
    it(11, 'Product Backlog Item', 'In Progress', 'A2', 1, -3), // atrasado
    it(20, 'Product Backlog Item', 'In Progress', 'B1', 2, -1), // atrasado
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.ok(html.includes('Frentes com item atrasado:'));
  assert.ok(html.indexOf('Frente A</b> (2 itens)') < html.indexOf('Frente B</b> (1 item)'));
});

// Etapa #8: resumo forward-looking por frente no topo de "Próximos passos",
// do prazo mais próximo pro mais distante. Atrasado (risco) não entra.
test('htmlReport resume os próximos por frente, do prazo mais próximo pro distante', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Frente A', null),
    it(2, 'Epic', 'In Progress', 'Frente B', null),
    it(10, 'Product Backlog Item', 'In Progress', 'A1', 1, 25), // vence mais adiante
    it(20, 'Product Backlog Item', 'In Progress', 'B1', 2, 3),  // vence este mês
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.ok(html.includes('Por frente, o que vem a seguir:'));
  // Frente B (prazo mais próximo) vem antes de Frente A
  assert.ok(html.indexOf('Frente B</b> (1 item') < html.indexOf('Frente A</b> (1 item'));
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

test('htmlReport não tem mais seção de destaques (repetia Entregas)', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Produto grande', null, 20),
    it(2, 'Epic', 'In Progress', 'Produto pequeno', null, 20),
    it(11, 'Product Backlog Item', 'Done', 'A', 1, null, 1),
    it(12, 'Product Backlog Item', 'Done', 'B', 1, null, 2),
    it(13, 'Product Backlog Item', 'Done', 'C', 1, null, 3),
    it(21, 'Product Backlog Item', 'Done', 'D', 2, null, 4),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.ok(!html.includes('id="destaques"'));
  assert.ok(!html.includes('Destaques'));
  assert.ok(!html.includes('entregas no mês')); // rótulo era só do card de destaque
  // Os produtos continuam aparecendo — agora só em Entregas do mês
  assert.ok(html.includes('Produto grande'));
  assert.ok(html.includes('Produto pequeno'));
});

test('htmlReport monta chips e contador no bloco de entregas', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  assert.ok(html.includes('id="busca-entregas"'));
  assert.ok(html.includes('>2 de 2<'));
  assert.match(html, /data-filtro="produto" data-valor="p1"/);
  // Só chips de produto: filtrar por tipo repetia o recorte por produto
  assert.doesNotMatch(html, /data-filtro="tipo"/);
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
  // 4 no mês corrente: volume, produtos, Em curso e Atenção (a situação virou dois)
  assert.equal((resumo.match(/class="resumo-cartao/g) || []).length, 4);
  assert.ok(resumo.includes('resumo-cartoes'));
});

// Sem retranca os 4 cartões viram prosa idêntica; cada um agora abre com o
// rótulo da pergunta que responde, e o de atenção pinta o rótulo no alerta.
test('htmlReport rotula cada cartão do resumo, e o de atenção com o acento certo', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y' });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  for (const rotulo of ['Volume', 'Onde caiu o esforço', 'Em curso', 'Atenção']) {
    assert.ok(resumo.includes(`class="cartao-rotulo">${rotulo}<`), 'falta o rótulo: ' + rotulo);
  }
  assert.match(resumo, /<article class="resumo-cartao resumo-cartao-alerta"><p class="cartao-rotulo">Atenção/);
});

test('htmlReport em mês fechado tem só os dois cartões de fato histórico', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA, org: 'https://x/y', mes: '2026-07' });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  assert.equal((resumo.match(/class="resumo-cartao/g) || []).length, 2);
  assert.ok(resumo.includes('class="cartao-rotulo">Volume<'));
  assert.ok(resumo.includes('class="cartao-rotulo">Onde caiu o esforço<'));
  assert.ok(!resumo.includes('resumo-cartao-alerta'), 'mês fechado não tem cartão de Em curso/Atenção');
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

/* ---- O pacote do link é dado não confiável ---- */
// Qualquer um forja um #r=. Nada que venha dele pode virar HTML na página.
test('htmlReport escapa id e mês vindos de pacote forjado', () => {
  const maligno = [{
    id: '"><img src=x onerror=alert(1)>',
    projeto: 'B2C',
    fields: {
      'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done',
      'System.Title': 'Item forjado',
      'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 2 * dia),
      'System.ChangedDate': iso(AGORA - dia),
    },
  }];
  const { html } = B.htmlReport({ items: maligno, agora: AGORA, mes: '<img src=x onerror=alert(2)>' });
  assert.ok(!html.includes('<img'), 'nenhuma tag injetada sobrevive');
  assert.ok(html.includes('&lt;img') || !html.includes('onerror'), 'payload aparece só escapado');
});

test('htmlReport ignora mês fora do formato AAAA-MM', () => {
  const casos = ['2026-13', '2026-0', 'x-y', '<b>x</b>', '2026-08-01'];
  for (const mes of casos) {
    const { html } = B.htmlReport({ items: base(), agora: AGORA, mes });
    assert.ok(html.includes('Agosto de 2026'), 'caiu no mês corrente para: ' + mes);
    assert.ok(!html.includes('Invalid'), 'sem Invalid Date para: ' + mes);
  }
});

/* ---- O documento não pode se contradizer ---- */
// Um travado com prazo estourado: a capa dizia "0 fora do prazo" enquanto a
// seção Decisão mostrava "atrasado desde..." na mesma página.
test('htmlReport conta o travado vencido no KPI de fora do prazo', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  const capa = html.slice(html.indexOf('doc-kpis'), html.indexOf('</ul>'));
  assert.match(capa, /kpi-alerta"><b>1<\/b><span>fora do prazo/);
});

// Item em curso com prazo daqui a 3 meses: contava na capa e não aparecia em
// seção nenhuma — o diretor via "7 em execução" e achava 5.
test('htmlReport lista prazo distante em "Vence mais adiante"', () => {
  const itens = [
    ...base(),
    it(50, 'Product Backlog Item', 'In Progress', 'Entrega de novembro', null, 90),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  const proximos = html.slice(html.indexOf('id="proximos"'));
  assert.ok(proximos.includes('Vence mais adiante'));
  assert.ok(proximos.includes('Entrega de novembro'));
  assert.ok(html.includes('1 mais adiante')); // e a prosa também conta
});

test('htmlReport não diz "nada registrado" quando há prazos vivos', () => {
  const itens = [it(60, 'Product Backlog Item', 'New', 'Planejado e vencido', null, -10)];
  const { vazio, html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.equal(vazio, false);
  assert.ok(html.includes('Planejado e vencido'));
});

// Vocabulário de negócio, não de ferramenta: o stakeholder não sabe o que é
// PBI, feature ou bug — a contagem por trás continua pelo tipo real do item.
test('htmlReport conta por tipo real na prosa, em vocabulário de negócio', () => {
  const itens = [
    it(1, 'Product Backlog Item', 'Done', 'Item um', null, null, 2),
    it(2, 'Bug', 'Done', 'Item dois', null, null, 3),
    it(3, 'Bug', 'Done', 'Item três', null, null, 4),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  assert.ok(resumo.includes('1 melhoria e 2 correções'), 'contagem por tipo real, em vocabulário de negócio');
  assert.ok(!resumo.includes('3 melhorias'));
  assert.ok(!resumo.includes('PBI') && !resumo.includes('Bug'), 'sem jargão de DevOps na prosa do resumo');
});

test('htmlReport não diz "todo o esforço" quando há item sem produto', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Produto A', null, 5),
    it(11, 'Product Backlog Item', 'Done', 'Com produto', 1, null, 2),
    it(90, 'Product Backlog Item', 'Done', 'Solto', null, null, 3),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.ok(!html.includes('Todo o esforço'));
  assert.ok(html.includes('1 item sem produto associado'));
});

// "Onde caiu o esforço" era frase corrida ("A (5), B (2)") — virou lista:
// nome à esquerda, contagem à direita, uma linha por produto.
test('htmlReport lista os produtos de "Onde caiu o esforço" em vez de frase', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', 'Nova PDP USA', null, 5),
    it(10, 'Product Backlog Item', 'Done', 'Item A1', 1, null, 2),
    it(11, 'Product Backlog Item', 'Done', 'Item A2', 1, null, 3),
    it(2, 'Epic', 'In Progress', 'Checkout One-Click', null, 8),
    it(20, 'Product Backlog Item', 'Done', 'Item B1', 2, null, 1),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  assert.ok(resumo.includes('<ul class="produtos-resumo">'), 'vira lista, não frase corrida');
  assert.ok(resumo.includes('<li><span>Nova PDP USA</span><b>2</b></li>'));
  assert.ok(resumo.includes('<li><span>Checkout One-Click</span><b>1</b></li>'));
  assert.ok(!resumo.includes('Nova PDP USA</b> ('), 'não sobra o formato antigo em frase');
});

test('htmlReport com 1 produto só mantém frase — nada pra listar', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  assert.ok(!resumo.includes('produtos-resumo'), 'com 1 produto não vira lista');
  assert.ok(resumo.includes('Todo o esforço caiu em <b>Nova PDP USA</b>.'));
});

test('htmlReport com mais de 3 produtos lista os 3 primeiros e soma o resto', () => {
  const itens = [];
  for (let p = 1; p <= 5; p += 1) {
    itens.push(it(p, 'Epic', 'In Progress', 'Produto ' + p, null, 20));
    itens.push(it(100 + p, 'Product Backlog Item', 'Done', 'Entrega ' + p, p, null, p));
  }
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  const resumo = html.slice(html.indexOf('id="resumo"'), html.indexOf('id="entregas"'));
  assert.equal((resumo.match(/<li><span>/g) || []).length, 3, 'só os 3 primeiros viram linha própria');
  assert.ok(resumo.includes('<li class="produtos-resumo-mais">e outros 2</li>'));
});

test('htmlReport escapa título de produto forjado na lista de "Onde caiu o esforço"', () => {
  const itens = [
    it(1, 'Epic', 'In Progress', '"><img src=x onerror=alert(1)>', null, 5),
    it(10, 'Product Backlog Item', 'Done', 'A', 1, null, 2),
    it(2, 'Epic', 'In Progress', 'Produto normal', null, 8),
    it(20, 'Product Backlog Item', 'Done', 'B', 2, null, 1),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.ok(!html.includes('<img'));
});

test('htmlReport com muitos produtos lista todos em Entregas', () => {
  const itens = [];
  for (let p = 1; p <= 5; p += 1) {
    itens.push(it(p, 'Epic', 'In Progress', 'Produto ' + p, null, 20));
    itens.push(it(100 + p, 'Product Backlog Item', 'Done', 'Entrega ' + p, p, null, p));
    itens.push(it(200 + p, 'Product Backlog Item', 'Done', 'Extra ' + p, p, null, p));
  }
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  const entregas = html.slice(html.indexOf('id="entregas"'));
  for (let p = 1; p <= 5; p += 1) {
    assert.ok(entregas.includes('Produto ' + p), 'falta o produto ' + p + ' em Entregas');
  }
});

test('htmlReport corrige a concordância do travado único', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  assert.ok(html.includes('É o ponto que depende de decisão'));
  assert.ok(!html.includes('É o ponto que dependem'));
});

test('htmlReport diz na prosa qual travado está com o prazo estourado', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  // base(): 1 travado (Integração ERP) com alvo vencido — capa e prosa concordam
  assert.ok(html.includes('com o prazo estourado'));
  assert.match(html, /kpi-alerta"><b>1<\/b><span>fora do prazo/);
});

// Quando só PARTE do atraso está travada, o card "Em curso" recontava só os
// vivos (2) enquanto a capa contava todos (3) — o documento parecia se
// contradizer. Agora o card usa o mesmo total da capa e decompõe o travado.
test('htmlReport não contradiz a capa quando parte do atraso está travada', () => {
  const itens = [
    ...base(),
    it(50, 'Product Backlog Item', 'In Progress', 'Frete atrasado', null, -2),
    it(51, 'Product Backlog Item', 'In Progress', 'Outro atrasado', null, -1),
  ];
  const { html } = B.htmlReport({ items: itens, agora: AGORA });
  assert.match(html, /kpi-alerta"><b>3<\/b><span>fora do prazo/);
  assert.ok(html.includes('<b>3 já passaram do prazo</b> (1 deles travado — ver Depende de decisão)'));
  assert.ok(!html.includes('<b>2 já passaram do prazo</b>'), 'não deve recontar só os vivos');
});

/* ---- Acessibilidade do HTML gerado ---- */
test('htmlReport nomeia os controles e expõe estado dos chips', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  assert.ok(html.includes('aria-label="Seções do report"'));
  assert.ok(html.includes('aria-label="Mês do report"'));
  assert.ok(html.includes('aria-label="Buscar entregas'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.match(html, /<button type="button" class="chip-doc" aria-pressed="false"/);
});

test('htmlReport não põe selo de tipo nem legenda nas linhas de Entregas', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  const entregas = html.slice(html.indexOf('id="lista-entregas"'), html.indexOf('id="comparativo"'));
  assert.ok(!entregas.includes('badge-tipo'), 'nenhum selo de tipo nas linhas');
  assert.ok(!entregas.includes('item de backlog'), 'sem legenda de tipos');
  // O item segue lá, só que sem selo — pelo título e pelo #id
  assert.ok(entregas.includes('Zoom na imagem'));
  assert.ok(entregas.includes('#11'));
});

test('htmlReport não afirma o motivo do bloqueio', () => {
  const { html } = B.htmlReport({ items: base(), agora: AGORA });
  assert.ok(!html.includes('espera uma decisão para voltar a andar'));
  // Sem "DevOps" nem "o P.O. detalha na reunião": vocabulário de negócio,
  // sem prometer um evento que pode nem existir.
  assert.ok(!html.includes('DevOps'));
  assert.ok(!html.includes('detalha na reunião'));
  assert.ok(html.includes('de quem depende cada destrave'));
});

/* ---- Roadmap: única seção cujo dado não vem do DevOps ---- */

test('htmlReport não tem seção de roadmap sem dado', () => {
  const semRoadmap = B.htmlReport({ items: base(), agora: AGORA });
  assert.ok(!semRoadmap.html.includes('id="roadmap"'));
  const vazio = B.htmlReport({ items: base(), agora: AGORA, roadmap: [] });
  assert.ok(!vazio.html.includes('id="roadmap"'));
  assert.ok(!vazio.html.includes('>Roadmap<'), 'sem item, some da nav também');
});

test('htmlReport monta o roadmap ordenado por início, com escala e barras em %', () => {
  // Escala: jan/26 (dia 1) a abr/26 (dia 1) — 90 dias de vão (jan+fev+mar 2026).
  const itens = [
    { titulo: 'B depois', inicio: '2026-02-01', fim: '2026-03-31' },
    { titulo: 'A antes', inicio: '2026-01-15', fim: '2026-02-14' },
  ];
  // AGORA (20 de agosto) fica bem depois do vão de jan-mar: sem marca de hoje.
  const { html } = B.htmlReport({ items: base(), agora: AGORA, roadmap: itens });
  const sec = html.slice(html.indexOf('id="roadmap"'), html.length);
  assert.ok(sec.includes('>Roadmap<'), 'seção e nav têm o rótulo');
  assert.ok(html.includes('<a href="#roadmap">Roadmap</a>'));
  // Ordenado por início: "A antes" (15/jan) some antes de "B depois" (01/fev)
  assert.ok(sec.indexOf('A antes') < sec.indexOf('B depois'), 'ordenado por início, não pela ordem de entrada');
  // Escala em meses inteiros, com o mês mais cedo em 0%
  assert.ok(sec.includes('style="left:0.00%">jan/26<'));
  assert.ok(sec.includes('>fev/26<') && sec.includes('>mar/26<'));
  assert.ok(!sec.includes('>abr/26<'), 'abril é só a borda de fechamento, não vira rótulo');
  // Barra de "A antes": início 14 dias após jan/1 (15,56%), 30 dias de largura (33,33%)
  assert.ok(sec.includes('left:15.56%;width:33.33%'));
  // Barra de "B depois": início 31 dias após jan/1 (34,44%), 58 dias de largura (64,44%)
  assert.ok(sec.includes('left:34.44%;width:64.44%'));
  assert.ok(!sec.includes('roadmap-hoje'), 'agora (agosto) fica fora do vão jan-mar');
});

test('htmlReport marca a linha de hoje quando cai dentro do vão do roadmap', () => {
  const itens = [{ titulo: 'X', inicio: '2026-01-01', fim: '2026-01-31' }];
  // Vão do roadmap: jan/26 inteiro (31 dias). 16 de jan = 15 dias após o início.
  const meioDeJaneiro = Date.parse('2026-01-16T00:00:00Z');
  const { html } = B.htmlReport({ items: base(), agora: meioDeJaneiro, roadmap: itens });
  assert.ok(html.includes('roadmap-hoje" style="--x:48.39%"')); // 15/31
});

test('htmlReport sinaliza item concluído no roadmap, sem afirmar nada dos que não têm status', () => {
  const itens = [
    { titulo: 'Terminou', inicio: '2026-01-01', fim: '2026-01-31', status: 'concluido' },
    { titulo: 'Em aberto', inicio: '2026-02-01', fim: '2026-02-28' },
  ];
  const { html } = B.htmlReport({ items: base(), agora: AGORA, roadmap: itens });
  assert.equal((html.match(/class="roadmap-feito"/g) || []).length, 1, 'só o item concluído leva o selo');
  assert.equal((html.match(/roadmap-barra-feita/g) || []).length, 1, 'só a barra do item concluído muda de cor');
  assert.ok(html.includes('Terminou <span class="roadmap-feito">concluído</span>'));
  assert.ok(!html.includes('Em aberto <span class="roadmap-feito">'));
});

test('htmlReport escapa título forjado no roadmap', () => {
  const itens = [{ titulo: '"><img src=x onerror=alert(1)>', inicio: '2026-01-01', fim: '2026-01-31' }];
  const { html } = B.htmlReport({ items: base(), agora: AGORA, roadmap: itens });
  assert.ok(!html.includes('<img'));
});

test('htmlReport mantém o roadmap em mês fechado (passado) — ele não é do mês', () => {
  const itens = [{ titulo: 'Sempre visível', inicio: '2026-01-01', fim: '2026-01-31' }];
  const { html } = B.htmlReport({ items: base(), agora: AGORA, mes: '2026-07', roadmap: itens });
  assert.ok(html.includes('id="roadmap"'));
  assert.ok(html.includes('Sempre visível'));
});
