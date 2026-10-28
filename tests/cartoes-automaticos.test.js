/* CARTÕES AUTOMÁTICOS DA ABA ENTREGAS (15/10/2026).

   Em 14/10 o relatório de outubro tinha 2 cartões escritos e 6 PBIs concluídas
   fora deles, e quem lia achava que só aquilo tinha saído. Agora toda Feature
   com PBI concluída no período vira cartão sozinha; o cartão escrito continua
   mandando na frente que ele declara em `featureIds`. Agosto/setembro fica
   como está: relatório fechado e já compartilhado. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const C = require('../assets/core.js');
const V2 = require('../assets/briefing-entregas-v2.js');
const P = require('../assets/pacote.js');

const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const MATERIAL = {
  itens: [
    { id: 11, titulo: 'Corrige brinde', estado: 'Done', fechadoEm: '2026-10-08', frente: 'f:100', descricao: 'TEXTO INTERNO com link https://dev.azure.com/x' },
    { id: 12, titulo: 'Limite no endereço', estado: 'Done', fechadoEm: '2026-10-09', frente: 'f:200', descricao: 'outra descrição crua' },
    { id: 13, titulo: 'Spike de pagamento', estado: 'Done', fechadoEm: '2026-10-13', frente: 'f:200', descricao: '' },
    { id: 14, titulo: 'Sem dono', estado: 'Done', fechadoEm: '2026-10-10', frente: 'sem-frente', descricao: '' },
  ],
  frentes: [
    { chave: 'f:100', feature: { id: 100, nome: '[EUA] Promoções' }, epico: { id: 9, nome: 'Loja Clube USA' }, noPeriodo: 1, total: 4 },
    { chave: 'f:200', feature: { id: 200, nome: '[EUA] Melhorias no checkout' }, epico: { id: 9, nome: 'Loja Clube USA' }, noPeriodo: 2, total: 2 },
    { chave: 'sem-frente', feature: null, epico: null, noPeriodo: 1, total: 1 },
  ],
};
const RESUMOS = { 11: { resumo: 'Corrige o brinde em pedidos abaixo do mínimo.' } };

test('o material vira cartão só com o que pode ir a público', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  assert.deepEqual(auto.map((f) => f.feature.id), [100, 200], 'item sem Feature não vira cartão');
  assert.equal(auto[0].itens[0].resumo, 'Corrige o brinde em pedidos abaixo do mínimo.');
  assert.equal(auto[1].itens.length, 2);
  // A descrição crua é o motivo de o `_entregas` nunca ser publicado.
  assert.doesNotMatch(JSON.stringify(auto), /TEXTO INTERNO|descri/);
});

test('o pacote forjado é saneado', () => {
  const auto = C.saneAutomaticos([
    { feature: { id: 'x', nome: 'sem id' }, itens: [{ id: 1, titulo: 'a' }] },
    { feature: { id: 5, nome: 'Vazia' }, itens: [] },
    { feature: { id: 6, nome: 'Boa' }, itens: [{ id: '7', titulo: 'ok', fechadoEm: '<script>', resumo: 3 }] },
  ]);
  assert.equal(auto.length, 1);
  assert.deepEqual(auto[0].itens[0], { id: 7, titulo: 'ok', fechadoEm: '', resumo: '3' });
  assert.deepEqual(C.saneAutomaticos('lixo'), []);
});

test('o cartão escrito cobre a frente que declara; o resto ganha o automático', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const escritos = [{ titulo: 'Brindes, escrito', featureIds: [100] }, { titulo: 'Sem frente declarada' }];
  const todos = V2.comAutomaticos(escritos, auto);
  assert.deepEqual(todos.map((c) => c.titulo),
    ['Brindes, escrito', 'Sem frente declarada', 'Melhorias no checkout']);
  const novo = todos[2];
  assert.equal(novo.automatico, true);
  // A conta é o que fechou NO PERÍODO, não a história inteira da Feature.
  assert.equal(novo.contaFixa, 2);
  assert.equal(novo.titulo, 'Melhorias no checkout', 'a etiqueta [EUA] do board sai do título');
});

/* A PONTE COM O ROADMAP (21/10/2026). Sem ela todo cartão automático caía em
   "Outras entregas", inclusive frente que É projeto do roadmap: o Subscription
   de outubro ficou lá, e a capa contou 1 projeto em vez de 2. A linha do
   roadmap agora declara as Features dela em `featureIds`. */
test('a Feature declarada no roadmap herda a iniciativa daquela linha', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const roadmap = [
    { titulo: 'Promoções da loja', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] },
  ];
  const todos = V2.comAutomaticos([], auto, roadmap);
  assert.equal(todos[0].iniciativa, 'Promoções da loja');
  assert.equal(todos[0].foraDoRoadmap, undefined, 'frente do roadmap não é marcada como fora dele');
  assert.deepEqual(todos[0].entregues.map((i) => i.id), [11], 'a lista de itens continua no cartão');
  /* A linha do roadmap GANHA do épico: a Feature 200 também é da "Loja Clube
     USA", e continua caindo nele; a 100 foi declarada e fica com o nome da
     linha. Se o épico ganhasse, declarar no roadmap não serviria pra nada. */
  assert.equal(todos[1].iniciativa, 'Loja Clube USA', 'a não declarada cai no épico dela');
  assert.equal(todos[1].foraDoRoadmap, true, 'épico é organização do board, não projeto');
});

/* O ÉPICO COMO ÚLTIMO RECURSO (28/10/2026).

   Sem ficha e sem linha de roadmap, a frente caía em "Outras entregas" — e pra
   quem ainda não escreveu nada, isso era o relatório inteiro num bloco só: a
   Isadora tinha onze frentes de outubro empilhadas ali. O épico já vinha no
   pacote e ninguém o usava.

   Fora do roadmap SEMPRE: a capa diz "Projetos do roadmap contemplados" e o
   leitor confere contra as barras. Seção nascida de épico não tem barra lá. */
test('sem roadmap e sem ficha, a seção vem do épico — fora do roadmap', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  for (const rm of [undefined, [], 'lixo', [{ titulo: 'X', inicio: '2026-10-01', fim: '2026-10-31' }]]) {
    const todos = V2.comAutomaticos([], auto, rm);
    assert.ok(todos.every((c) => c.iniciativa === 'Loja Clube USA'), 'roadmap: ' + JSON.stringify(rm));
    assert.ok(todos.every((c) => c.foraDoRoadmap === true));
  }
});

test('frente sem épico continua em "Outras entregas"', () => {
  /* É o propósito do grupo órfão, e ele volta a guardar só isso. Nome inventado
     seria pior que grupo sem nome. */
  const auto = [{ feature: { id: 300, nome: 'Solta' }, epico: null, fechada: true,
    itens: [{ id: 1, titulo: 'x', resumo: '' }] }];
  const cartao = V2.comAutomaticos([], auto, [])[0];
  assert.equal(cartao.iniciativa, undefined);
  assert.equal(cartao.foraDoRoadmap, undefined);
});

test('a mesma Feature em duas linhas do roadmap fica na primeira', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const roadmap = [
    { titulo: 'Primeira', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] },
    { titulo: 'Segunda', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] },
  ];
  assert.equal(V2.comAutomaticos([], auto, roadmap)[0].iniciativa, 'Primeira');
});

test('o cartão escrito que declara a Feature continua mandando nela', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const roadmap = [{ titulo: 'Promoções da loja', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] }];
  const todos = V2.comAutomaticos([{ titulo: 'Escrito', featureIds: [100] }], auto, roadmap);
  assert.deepEqual(todos.map((c) => c.titulo), ['Escrito', 'Melhorias no checkout']);
});

/* O SELO DO CARTÃO AUTOMÁTICO (22/10/2026). O cartão do Subscription mostrava
   uma PBI concluída e mais nada, e a frente continuava rodando: sem selo, o
   leitor conclui que aquela entrega solta é a história inteira. O material só
   tem item CONCLUÍDO — é o laço que descarta o resto na entrada —, então quem
   diz que a frente segue é a segunda passada, que conta o que está em aberto. */
test('o cartão automático diz se a frente fechou ou segue rodando', () => {
  const material = {
    itens: [
      { id: 1, titulo: 'Feita', fechadoEm: '2026-10-08', frente: 'f:10' },
      { id: 2, titulo: 'Outra', fechadoEm: '2026-10-09', frente: 'f:20' },
    ],
    frentes: [
      { chave: 'f:10', feature: { id: 10, nome: '[EUA] Segue rodando' }, epico: null, noPeriodo: 1, total: 1, abertas: 1 },
      { chave: 'f:20', feature: { id: 20, nome: '[EUA] Fechou' }, epico: null, noPeriodo: 1, total: 1, abertas: 0 },
    ],
  };
  const auto = C.automaticosDoMaterial(material, {});
  assert.deepEqual(auto.map((f) => f.fechada), [false, true]);
  const cards = V2.comAutomaticos([], auto);
  assert.deepEqual(cards.map((c) => c.status), ['andamento', 'entregue']);
  const html = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-22T12:00:00Z'),
    chavePO: 'urlan', cartoes: [], automaticos: auto }).html;
  assert.match(html, /Segue rodando<\/h3>[\s\S]{0,400}?em andamento/);
  assert.match(html, /Fechou<\/h3>[\s\S]{0,400}?entregue/);
  /* TRÊS estados. Forjado, ou vindo de pacote antigo que não tem o campo, vira
     AUSENTE — e sem o campo o cartão não ganha selo. `false` ali faria o
     documento afirmar "em andamento" sobre frente que já tinha fechado. */
  for (const mentira of ['sim', 1, {}, null, undefined]) {
    const forjado = C.saneAutomaticos([{ feature: { id: 9, nome: 'X' }, fechada: mentira,
      itens: [{ id: 1, titulo: 'a' }] }]);
    assert.equal(forjado[0].fechada, undefined, JSON.stringify(mentira));
    assert.equal(V2.comAutomaticos([], forjado)[0].status, undefined, 'sem saber, sem selo');
  }
  const semSaber = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-22T12:00:00Z'),
    chavePO: 'urlan', cartoes: [],
    automaticos: C.saneAutomaticos([{ feature: { id: 9, nome: 'Sem saber' }, itens: [{ id: 1, titulo: 'a' }] }]) }).html;
  // No CARTÃO: o resto do documento fala "em andamento" por outras razões.
  const cartao = /rl-frente-nome">Sem saber<[\s\S]{0,500}/.exec(semSaber);
  assert.ok(cartao, 'o cartão não saiu');
  assert.doesNotMatch(cartao[0].slice(0, 300), /rl-selo/, 'sem saber, sem selo');
});

test('a frente em aberto é contada no mesmo recorte das entregas', () => {
  const wi = (id, estado, pai, fechadoEm) => ({ id, fields: {
    'System.WorkItemType': 'Product Backlog Item',
    'System.State': estado,
    'System.Title': 'Item ' + id,
    'System.Parent': pai,
    'Microsoft.VSTS.Common.ClosedDate': fechadoEm ? fechadoEm + 'T12:00:00Z' : undefined,
  } });
  const feature = { id: 70, fields: { 'System.WorkItemType': 'Feature', 'System.State': 'In Progress', 'System.Title': '[EUA] Assinaturas' } };
  const BE = require('../assets/briefing-entregas.js');
  const abertos = [feature, wi(71, 'Done', 70, '2026-10-09'), wi(72, 'In Progress', 70)];
  const m1 = BE.entregasConcluidas(abertos, abertos, ['2026-10']);
  assert.equal(m1.frentes[0].abertas, 1, 'a PBI em andamento é contada');
  const sóFechados = [feature, wi(71, 'Done', 70, '2026-10-09')];
  const m2 = BE.entregasConcluidas(sóFechados, sóFechados, ['2026-10']);
  assert.equal(m2.frentes[0].abertas, 0);
  // E nenhuma delas entra na lista de entregas nem na contagem do período.
  assert.deepEqual(m1.itens.map((i) => i.id), [71]);
  assert.equal(m1.frentes[0].noPeriodo, 1);
});

/* O QUE FALTA, E ONDE ELE MORA (27/10/2026). A seção dizia "1 item" e calava
   sobre o resto: com PBI pendente pra sprint seguinte, o leitor concluía que a
   frente tinha acabado. O número veio do board — e mora NO CARTÃO, ao lado do
   selo. Na retranca da seção ele era a terceira voz falando do mesmo assunto,
   junto do selo e do rótulo da lista. A seção fala de tamanho; o cartão, de em
   que pé a frente está. */
test('o que falta fica no cartão, ao lado do selo; a seção só conta', () => {
  const comAbertas = (n) => C.saneAutomaticos([{ feature: { id: 1, nome: '[EUA] Frente' },
    fechada: n === 0, abertas: n, itens: [{ id: 9, titulo: 'Saiu' }] }]);
  const doc = (auto) => V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-27T12:00:00Z'),
    chavePO: 'urlan', cartoes: [], automaticos: auto }).html;
  const conta = (h) => (/<p class="rl-sec-conta">([^<]*)</.exec(h) || [])[1];

  const aberto = doc(comAbertas(2));
  assert.equal(conta(aberto), '1 entregue', 'a seção não fala de aberto');
  assert.match(aberto, /<span class="rl-falta">2 em aberto<\/span>/);
  // Dentro da meta do cartão, colado no selo — e não solto no corpo.
  assert.match(aberto, /rl-frente-meta"><span class="rl-falta">2 em aberto<\/span><span class="rl-selo/);

  const fechado = doc(comAbertas(0));
  assert.equal(conta(fechado), '1 entregue');
  assert.doesNotMatch(fechado, /rl-falta/, 'frente fechada não anuncia zero');

  // Pacote antigo não traz o número: o cartão não afirma nada sobre aberto.
  const semCampo = C.saneAutomaticos([{ feature: { id: 1, nome: 'Frente' },
    itens: [{ id: 9, titulo: 'Saiu' }] }]);
  assert.doesNotMatch(doc(semCampo), /rl-falta/);
});

test('o cartão escrito que adota herda o que falta, e conta pela janela', () => {
  const auto = C.saneAutomaticos([{ feature: { id: 77, nome: '[EUA] Frente' }, fechada: false,
    abertas: 3, itens: [{ id: 1, titulo: 'a' }, { id: 2, titulo: 'b' }] }]);
  const escrito = { titulo: 'Escrito', iniciativa: 'Minha frente', featureIds: [77], resumo: 'x' };
  const [card] = V2.comAutomaticos([escrito], auto);
  assert.equal(card.abertas, 3, 'adotar é adotar inteiro');
  assert.deepEqual(card.entregues.map((i) => i.id), [1, 2]);
  const html = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-27T12:00:00Z'),
    chavePO: 'urlan', cartoes: [escrito], automaticos: auto }).html;
  /* 2, da lista adotada — e não o que a Feature já fechou na vida inteira, que
     é o que o caminho das `contagens` traria. */
  assert.match(html, /<p class="rl-sec-conta">2 entregues(?: ·|<)/, 'a seção conta, e só');
  assert.match(html, /<span class="rl-falta">3 em aberto<\/span>/, 'o que falta vai no cartão');
  // E um `abertas` escrito à mão manda: o PO sabe de coisa que o board não tem.
  const [proprio] = V2.comAutomaticos([Object.assign({}, escrito, { abertas: 9 })], auto);
  assert.equal(proprio.abertas, 9);
});

/* A JANELA DAS ENTREGAS SEGUE AS SPRINTS (22/10/2026). O documento tinha duas
   réguas: entrega cortada pelo calendário, sprint cortada pela data de
   fechamento dela. A sprint que fecha em novembro só aparece lá, mas o que ela
   entregou nos últimos dias de outubro já contava em outubro — itens sem
   sprint nenhuma na lista. Agora a edição mensal corta do começo da primeira
   sprint que fecha nela até o fim da última. */
const LINHAS = [
  { nome: 'Sprint 20', start: '2026-09-28T00:00:00Z', finish: '2026-10-09T00:00:00Z' },
  { nome: 'Sprint 21', start: '2026-10-12T00:00:00Z', finish: '2026-10-23T00:00:00Z' },
];

test('o recorte sai da primeira à última sprint, e é null sem data', () => {
  assert.deepEqual(C.recorteDasSprints(LINHAS), { inicio: '2026-09-28', fim: '2026-10-23' });
  // Uma sprint sem data não derruba as outras.
  assert.deepEqual(C.recorteDasSprints(LINHAS.concat([{ nome: 'X' }])),
    { inicio: '2026-09-28', fim: '2026-10-23' });
  for (const vazio of [[], null, 'lixo', [{ nome: 'só o nome' }]]) {
    assert.equal(C.recorteDasSprints(vazio), null, 'sem data, quem chama volta pro mês cheio');
  }
});

test('a entrega entra pela janela das sprints, não pelo mês do calendário', () => {
  const itens = [
    // 29/09: fora de outubro no calendário, DENTRO da Sprint 20 — entra.
    { id: 61, titulo: 'Fechou na virada', estado: 'Done', fechadoEm: '2026-09-29', frente: 'f:100', descricao: '' },
    // 28/10: dentro de outubro, FORA da janela (a sprint dele fecha em novembro) — não entra.
    { id: 62, titulo: 'Já é da sprint seguinte', estado: 'Done', fechadoEm: '2026-10-28', frente: 'f:100', descricao: '' },
    { id: 63, titulo: 'No meio do período', estado: 'Done', fechadoEm: '2026-10-08', frente: 'f:100', descricao: '' },
  ];
  const material = { itens, frentes: [MATERIAL.frentes[0]] };
  const comJanela = V2.htmlReport; // só pra deixar claro que é o mesmo documento
  assert.ok(typeof comJanela === 'function');
  const B = {
    precisaDeEntregas: true,
    contagensDoLink: () => ({ f: {}, e: {} }),
    periodoDoDocumento: () => ['2026-10'],
    janelaPorSprint: () => true,
    entregasConcluidas: (itns, todos, meses, recorte) => ({
      itens: material.itens.filter((i) => !recorte
        || (i.fechadoEm >= recorte.inicio && i.fechadoEm <= recorte.fim)),
      frentes: material.frentes,
    }),
  };
  const pacote = P.montarEntregas({ B, mostrados: [], todos: [], todosItens: [],
    sprintsBrutas: [], resumos: {}, roadmap: [], escopo: 'Urlan', mes: null, agora: 1,
    paraArquivo: false });
  assert.ok(pacote, 'o pacote montou');
  // E o recorte que o pacote usa é o que sai das linhas de ritmo:
  assert.deepEqual(P.recorteDoPeriodo(B, LINHAS), { inicio: '2026-09-28', fim: '2026-10-23' });
  assert.equal(P.recorteDoPeriodo({ }, LINHAS), null, 'edição que não pede, não recorta');
});

/* A frase da capa descreve o recorte que FILTROU os números, e por isso ela
   viaja no pacote em vez de ser recalculada no desenho. Pacote montado no mês
   cheio chega sem janela, e o documento não afirma nada — era o jeito de a
   capa dizer "conta de 28 de set a 23 de out" sobre números do mês inteiro. */
test('a janela viaja no pacote, e some quando a edição não recorta', () => {
  const B = { precisaDeEntregas: true, contagensDoLink: () => ({ f: {}, e: {} }),
    entregasConcluidas: () => MATERIAL, periodoDoDocumento: () => ['2026-10'],
    precisaDeSprints: true, janelaPorSprint: () => true };
  const brutas = LINHAS.map((l) => ({ sprint: l, idsAgora: [], idsNoFim: [] }));
  const com = P.montarEntregas({ B, mostrados: [], todos: [], todosItens: [],
    sprintsBrutas: brutas, resumos: {}, roadmap: [], escopo: 'Urlan', mes: null,
    agora: Date.parse('2026-10-22T12:00:00Z'), paraArquivo: false });
  assert.deepEqual(com.janela, { inicio: '2026-09-28', fim: '2026-10-23' });
  const semRecorte = Object.assign({}, B, { janelaPorSprint: () => false });
  const sem = P.montarEntregas({ B: semRecorte, mostrados: [], todos: [], todosItens: [],
    sprintsBrutas: brutas, resumos: {}, roadmap: [], escopo: 'Urlan', mes: null,
    agora: Date.parse('2026-10-22T12:00:00Z'), paraArquivo: false });
  assert.equal(sem.janela, undefined);
  // Forjada no link, a janela é recusada.
  for (const lixo of [null, {}, { inicio: 'x', fim: '2026-10-23' },
    { inicio: '2026-10-23', fim: '2026-09-28' }, 'texto']) {
    assert.equal(C.saneJanela(lixo), null, JSON.stringify(lixo));
  }
});

test('a capa escreve a janela só quando ela sai do mês da edição', () => {
  const comJanela = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-22T12:00:00Z'),
    chavePO: 'urlan', cartoes: [], janela: { inicio: '2026-09-28', fim: '2026-10-23' } }).html;
  assert.match(comJanela, /Conta de 28 de set a 23 de out, o período das sprints/);
  // Janela que cabe no próprio mês não vira frase: repetiria o título.
  const dentroDoMes = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-22T12:00:00Z'),
    chavePO: 'urlan', cartoes: [], janela: { inicio: '2026-10-01', fim: '2026-10-23' } }).html;
  assert.doesNotMatch(dentroDoMes, /o período das sprints/);
  const semJanela = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-22T12:00:00Z'),
    chavePO: 'urlan', cartoes: [] }).html;
  assert.doesNotMatch(semJanela, /o período das sprints/);
});

/* A edição congelada de agosto/setembro NÃO pode mudar de janela: ela já foi
   publicada e compartilhada, e mexer aqui mudaria número que já circulou. */
test('só a edição mensal corta por sprint; agosto/setembro fica no mês cheio', () => {
  const fonte = ler('assets/briefing-entregas-v2.js');
  const agoSet = /const AGO_SET = \{[^}]*\}/.exec(fonte);
  assert.ok(agoSet, 'a edição de agosto/setembro sumiu');
  assert.doesNotMatch(agoSet[0], /janelaPorSprint/);
  const doMes = /function edicaoDoMes\(id\) \{[\s\S]*?\n  \}/.exec(fonte);
  assert.match(doMes[0], /janelaPorSprint: true,/);
});

test('agosto/setembro não ganha cartão automático', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  try {
    V2.escolherEdicao('2026-08');
    assert.deepEqual(V2.comAutomaticos([], auto), []);
  } finally {
    V2.escolherEdicao('2026-10');
  }
  assert.equal(V2.comAutomaticos([], auto).length, 2);
});

test('o cartão automático aparece no documento com a lista e conta na capa', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const html = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-14T12:00:00Z'),
    chavePO: 'urlan', cartoes: [], automaticos: auto }).html;
  assert.match(html, /<h3 class="rl-frente-nome">Melhorias no checkout<\/h3>/);
  assert.match(html, /class="rl-frente-itens"/);
  assert.match(html, /rl-frente-item-titulo">Spike de pagamento</);
  assert.match(html, /rl-frente-item-resumo">Corrige o brinde em pedidos abaixo do mínimo\.</);
  // 1 + 2 itens fechados no período = 3 na capa.
  assert.match(html, /rl-heroi-base[\s\S]*?rl-num">3</);
});

test('o pacote leva os automáticos ao leitor, saneados nas duas pontas', () => {
  const src = ler('assets/report.js');
  assert.match(src, /st\.automaticos = C\.saneAutomaticos\(pacote\.automaticos\);/);
  // Recebe as linhas de ritmo: é delas que sai a janela nas edições por sprint.
  assert.match(src, /automaticos: st\.leitura \? st\.automaticos : automaticosAgora\(itensDoDoc, linhasRitmo\),/);
  // RODANDO a montagem: fora do bloco local (sem sublinhado), vai pro link e
  // pra função da Vercel — e nada com `_` sai quando não é arquivo.
  const B = { precisaDeEntregas: true, contagensDoLink: () => ({ f: {}, e: {} }),
    entregasConcluidas: () => MATERIAL, periodoDoDocumento: () => ['2026-10'] };
  const pacote = P.montarEntregas({ B, mostrados: [], todos: [], todosItens: [], sprintsBrutas: [],
    resumos: RESUMOS, roadmap: [], escopo: 'Urlan Dipre', mes: null, agora: 1, paraArquivo: false });
  assert.equal(pacote.automaticos.length, 2);
  // Pela ida e volta em JSON, que é como o pacote sai: chave `undefined` some.
  assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(pacote))).filter((k) => k.startsWith('_')), []);
  assert.doesNotMatch(JSON.stringify(pacote), /TEXTO INTERNO/);
});

test('a Feature que é o próprio épico não vira seção com o nome dela', () => {
  /* Quando o item não tem épico acima, o pacote devolve a própria Feature nesse
     campo. A seção nascia com o nome do cartão que está dentro dela — e com
     etiqueta de board: "[EUA] Identificação da parceira no pedido" sobre um
     cartão de mesmo nome. Seção que repete o cartão não agrupa nada. */
  const auto = [{ feature: { id: 51944, nome: '[EUA] Identificação da parceira' },
    epico: { id: 51944, nome: '[EUA] Identificação da parceira' }, fechada: true,
    itens: [{ id: 1, titulo: 'x', resumo: '' }] }];
  const cartao = V2.comAutomaticos([], auto, [])[0];
  assert.equal(cartao.iniciativa, undefined, 'devia cair em "Outras entregas"');
});

test('a etiqueta de board sai do nome da seção', () => {
  /* "[EUA]" e afins são organização interna do board; o leitor já sabe de que
     loja é o relatório. O nome do cartão já passava por isso. */
  const auto = [{ feature: { id: 300, nome: 'Frente' },
    epico: { id: 9, nome: '[BRA] Ecommerce Brasil' }, fechada: true,
    itens: [{ id: 1, titulo: 'x', resumo: '' }] }];
  assert.equal(V2.comAutomaticos([], auto, [])[0].iniciativa, 'Ecommerce Brasil');
});
