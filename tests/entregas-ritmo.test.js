/* RITMO DAS SPRINTS no relatório de Entregas v2.

   O que estes testes guardam é o ARRANJO, que é o que torna a feature possível
   sem tocar no documento original:

   1. o entregas-v2 DELEGA ao entregas, em vez de clonar — e o documento sem
      sprint tem que sair byte a byte igual ao do base, senão "não mexi no
      relatório atual" é só uma frase;
   2. a costura de texto depende de UMA âncora no HTML do base. Âncora é
      frágil, então ela é testada dos dois lados: existe lá, e é usada aqui;
   3. o report.js é compartilhado com report.html e report-v2.html — a busca de
      sprint só pode acender pra quem declara.

   A conta em si (quem entregou, quem transbordou) mora no core.js e é testada
   em tests/transbordo.test.js e aqui embaixo, na parte de core. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const C = require('../assets/core.js');
const BASE = require('../assets/briefing-entregas.js');
// require do v2 DEPOIS do base: no navegador a ordem é a dos <script>, aqui é
// a do require, e o módulo pega o base por ele.
const V2 = require('../assets/briefing-entregas-v2.js');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

const AGORA = Date.parse('2026-10-05T12:00:00Z');
const entrada = (extra) => Object.assign(
  { items: [], todos: [], agora: AGORA, escopo: 'Urlan Dipre', unidade: 'Ybera US' },
  extra || {});

const SPRINTS = [
  { nome: 'Sprint 18', start: '2026-08-31T00:00:00Z', finish: '2026-09-11T00:00:00Z', entregues: 4, total: 6, transbordaram: 2 },
  { nome: 'Sprint 19', start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z', entregues: 2, total: 2, transbordaram: 3 },
];

/* ---------- as duas edições ---------- */

/* O documento de Agosto e Setembro já foi publicado: relatório entregue não se
   reescreve. Os padrões do base são o que o entregas.html serve, e nenhuma
   decisão da edição de outubro pode encostar neles. */
test('o base continua sendo Agosto e Setembro, com os cartões dele', () => {
  assert.deepEqual(BASE.periodoDoDocumento(), ['2026-08', '2026-09']);
  assert.ok(BASE.cartoesDoDocumento().length > 0, 'o base perdeu a lista curada');
  assert.match(BASE.htmlReport(entrada()).html, /Agosto e Setembro de 2026/);
});

test('o v2 é a edição de Outubro, com a lista curada dele', () => {
  assert.deepEqual(V2.periodoDoDocumento(), ['2026-10']);
  assert.match(V2.htmlReport(entrada()).html, /Outubro de 2026/);
  // A lista é de outubro, não a de Agosto e Setembro reaproveitada: o `.length`
  // que fazia lista vazia cair de volta na curada do base já causou isso uma vez.
  const titulos = (lista) => lista.map((c) => c.titulo).join('|');
  assert.notEqual(titulos(V2.cartoesDoDocumento()), titulos(BASE.cartoesDoDocumento()));
});

/* O que o v2 ACRESCENTA ao documento do base: a barra de abas e a seção de
   sprints, nada mais. Tiradas as duas, tem que sobrar a mesma string que o base
   desenha com as entradas da edição de outubro. Se um dia alguém fizer o v2 "ajustar" o
   documento por fora, é aqui que estoura. */
const semAcrescimos = (html) => String(html)
  .replace(/<nav class="rl-nav rl-abas"[\s\S]*?<\/nav>/, '')
  .replace(/<p class="rl-aba-vazia mudo"[\s\S]*?<\/p>/g, '')
  .replace(/<section class="rl-sec" id="ritmo">[\s\S]*?<\/section>/, '');

/* O teste mais importante do arquivo. */
test('tiradas abas e seção, o v2 devolve exatamente o que o base desenha', () => {
  const a = BASE.htmlReport(entrada({ periodo: V2.PERIODO, cartoes: V2.cartoesDoDocumento() }));
  const b = V2.htmlReport(entrada({ sprints: SPRINTS }));
  assert.equal(semAcrescimos(b.html), a.html, 'o v2 mexeu no documento além do que acrescenta');
  assert.equal(b.vazio, a.vazio);
  assert.deepEqual(b.meses, a.meses);
});

test('lista de sprints vazia, nula ou só com lixo também não desenha seção', () => {
  const base = BASE.htmlReport(entrada({ periodo: V2.PERIODO, cartoes: V2.cartoesDoDocumento() })).html;
  for (const s of [[], null, undefined, 'nada', [null, {}, { nome: '' }]]) {
    const html = V2.htmlReport(entrada({ sprints: s })).html;
    assert.doesNotMatch(html, /id="ritmo"/, `sprints=${JSON.stringify(s)} desenhou seção`);
    assert.equal(semAcrescimos(html), base, `sprints=${JSON.stringify(s)} mexeu no documento`);
  }
});



/* Antes, lista vazia caía de volta na lista curada por causa de um `.length`, e
   a edição nova abria com os cartões da anterior. Quem não passa a opção segue
   recebendo a lista do base — que é como o entregas.html renderiza. */
test('cartões: lista vazia é uma resposta; ausência é que cai no padrão', () => {
  const vazio = BASE.htmlReport(entrada({ cartoes: [] })).html;
  const padrao = BASE.htmlReport(entrada()).html;
  assert.notEqual(vazio, padrao);
  for (const t of ['Novos componentes visuais para HOME', 'Novo cart drawer']) {
    assert.ok(padrao.includes(t), `o padrão perdeu o cartão "${t}"`);
    assert.ok(!vazio.includes(t), `a lista vazia ainda traz "${t}"`);
  }
});

/* Quem lê estes dois é gente de fora: o report.js, pra saber quais sprints
   buscar, e o diagnostico.html, pra conferir o documento. Herdados do base, o
   controlador buscaria sprint de agosto pra um documento que fala de outubro. */
test('o v2 não herda do base o período nem os cartões', () => {
  assert.notDeepEqual(V2.periodoDoDocumento(), BASE.periodoDoDocumento());
  assert.notEqual(V2.cartoesDoDocumento().length, BASE.cartoesDoDocumento().length);
});

test('o base não declara precisaDeSprints — é o que mantém o entregas.html sem busca nova', () => {
  assert.equal(BASE.precisaDeSprints, undefined);
  assert.equal(V2.precisaDeSprints, true);
});

test('o v2 reexpõe tudo que o report.js procura no briefing', () => {
  for (const chave of ['esc', 'htmlReport', 'camposDoLink', 'contagensDoLink',
    'periodoDoDocumento', 'cartoesDoDocumento', 'mesPorExtenso', 'dataCurta']) {
    assert.ok(V2[chave] !== undefined, `o v2 perdeu ${chave} e o report.js cai nele`);
  }
  // Mecanismo vem do base sem cópia: é o mesmo nas duas edições, e duas cópias
  // divergem no primeiro ajuste.
  assert.deepEqual(V2.camposDoLink, BASE.camposDoLink);
  assert.equal(V2.contagensDoLink, BASE.contagensDoLink);
  assert.equal(V2.esc, BASE.esc);
});

/* ---------- a costura ---------- */

test('a âncora existe no documento do base, e exatamente uma vez', () => {
  const html = BASE.htmlReport(entrada()).html;
  const vezes = html.split(V2.ANCORA).length - 1;
  assert.equal(vezes, 1,
    `o base abre o corpo ${vezes} vez(es) com ${V2.ANCORA} — a costura do v2 depende de ser uma só`);
});

/* A seção de sprints vem antes das entregas: é o que o leitor de
   acompanhamento abre pra ver. */
test('a seção de sprints entra no topo do corpo, antes das do base', () => {
  const html = V2.htmlReport(entrada({ sprints: SPRINTS })).html;
  const corpo = html.indexOf(V2.ANCORA);
  const ritmo = html.indexOf('<section class="rl-sec" id="ritmo">');
  const fimDoRitmo = ritmo + V2.secaoRitmo(SPRINTS).length;
  const doBase = html.indexOf('<section class="rl-sec"', fimDoRitmo);
  assert.ok(corpo >= 0, 'a âncora sumiu');
  assert.ok(corpo < ritmo, 'o ritmo caiu fora do corpo');
  assert.ok(ritmo < doBase || doBase === -1, 'o ritmo entrou depois de uma seção do base');
});

test('sem a âncora, devolve o documento intacto em vez de pendurar a seção em lugar errado', () => {
  const html = '<div class="outra-coisa">conteúdo</div>';
  assert.equal(V2.injetar(html, '<section id="ritmo"></section>'), html);
});

/* ---------- a linha ---------- */

test('o escopo da linha é o que ficou MAIS o que saiu — a conta tem que fechar', () => {
  const html = V2.secaoRitmo([SPRINTS[1]]);
  // Sprint 19: 2 entregues, 2 na sprint hoje, 3 transbordaram → 2 de 5.
  assert.match(html, /<span class="rt-placar">2\/5<\/span>/);
  assert.match(html, /<b>3<\/b> transbordaram/);
});

test('transbordo zero não vira "0 transbordaram"', () => {
  const html = V2.secaoRitmo([{ nome: 'Sprint 17', start: '2026-08-17T00:00:00Z', finish: '2026-08-28T00:00:00Z', entregues: 5, total: 5, transbordaram: 0 }]);
  assert.match(html, /<span class="rt-placar">5\/5<\/span>/);
  assert.doesNotMatch(html, /transbordaram|transbordou/);
});

test('singular e plural', () => {
  const um = V2.secaoRitmo([{ nome: 'S', start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z', entregues: 0, total: 0, transbordaram: 1 }]);
  assert.match(um, /<b>1<\/b> transbordou/);
  assert.match(V2.secaoRitmo([SPRINTS[0]]), /2 sprints|1 sprint/);
  assert.match(V2.secaoRitmo([SPRINTS[0]]), /<p class="rl-sec-conta">1 sprint<\/p>/);
  assert.match(V2.secaoRitmo(SPRINTS), /<p class="rl-sec-conta">2 sprints<\/p>/);
});

test('a data abrevia quando a sprint não vira o mês e se estende quando vira', () => {
  assert.match(V2.secaoRitmo([SPRINTS[1]]), /14–25 de set/);
  assert.match(V2.secaoRitmo([SPRINTS[0]]), /31 de ago – 11 de set/);
});

test('sprint sem data cadastrada perde só a data, não a linha', () => {
  const html = V2.secaoRitmo([{ nome: 'Sprint X', start: null, finish: null, entregues: 1, total: 1, transbordaram: 0 }]);
  assert.match(html, /Sprint X/);
  assert.doesNotMatch(html, /rt-datas/);
});

test('a barra soma entregue e transbordo sobre o escopo, e nunca passa de 100%', () => {
  const html = V2.secaoRitmo([SPRINTS[1]]);
  const larguras = [...html.matchAll(/width:([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.equal(larguras.length, 2);
  assert.ok(larguras[0] + larguras[1] <= 100.0001, 'a barra estourou a régua');
  assert.equal(Math.round(larguras[0]), 40); // 2 de 5
  assert.equal(Math.round(larguras[1]), 60); // 3 de 5
});

/* A barra repete, em desenho, os números que estão em texto logo abaixo. Sem o
   aria-hidden o leitor de tela anuncia os dois e a pessoa ouve tudo em dobro. */
test('a barra é decorativa', () => {
  assert.match(V2.secaoRitmo(SPRINTS), /<span class="rt-barra" aria-hidden="true">/);
});

test('nome de sprint com HTML é escapado', () => {
  const html = V2.secaoRitmo([{ nome: '<img src=x onerror=alert(1)>', start: null, finish: null, entregues: 0, total: 0, transbordaram: 0 }]);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

/* ---------- a conta, no core ---------- */

const item = (id, tipo, estado, path) => ({
  id, fields: { 'System.WorkItemType': tipo, 'System.State': estado, 'System.IterationPath': path },
});
const S19 = 'Proj\\Sprint 19';

test('épico e feature não contam como entrega da sprint', () => {
  const itens = [
    item(1, 'Product Backlog Item', 'Done', S19),
    item(2, 'Feature', 'Done', S19),
    item(3, 'Epic', 'Done', S19),
  ];
  const r = C.ritmoDaSprint({ name: 'Sprint 19', path: S19 }, [1, 2, 3], [1, 2, 3], itens);
  assert.equal(r.total, 1, 'feature e épico entraram no placar e contariam o trabalho dos filhos duas vezes');
  assert.equal(r.entregues, 1);
});

/* A consulta de iteração não recorta por tipo — ela devolve Task também. Se a
   Task fosse comparada contra a lista do documento (que nunca tem Task), toda
   Task da sprint apareceria como transbordo. */
test('task que estava na sprint não vira transbordo', () => {
  const itens = [item(1, 'Product Backlog Item', 'Done', S19)];
  const r = C.ritmoDaSprint({ name: 'Sprint 19', path: S19 }, [1], [1, 90, 91], itens);
  assert.equal(r.transbordaram, 0);
});

test('transbordou é quem estava no fim, não está mais, e o documento enxerga', () => {
  const itens = [
    item(1, 'Product Backlog Item', 'Done', S19),
    item(7, 'Product Backlog Item', 'New', 'Proj\\Sprint 20'), // saiu
  ];
  const r = C.ritmoDaSprint({ name: 'Sprint 19', path: S19 }, [1], [1, 7], itens);
  assert.equal(r.transbordaram, 1);
  assert.equal(r.total, 1);
});

/* Sustentação e recorte de responsável já saíram de `itensDoDocumento` antes de
   chegar aqui. O que não está na lista não é entrega deste documento — contá-lo
   encheria a linha de item que o leitor não acha em lugar nenhum. */
test('quem saiu e está fora do recorte do documento não conta', () => {
  const itens = [item(1, 'Product Backlog Item', 'Done', S19)];
  const r = C.ritmoDaSprint({ name: 'Sprint 19', path: S19 }, [1], [1, 777], itens);
  assert.equal(r.transbordaram, 0);
});

/* A seção entra num relatório do mês CORRENTE: em 06/10/2026 nenhuma das duas
   sprints de outubro tinha fechado, e esconder as duas deixaria vazia a seção
   que dá nome ao documento. Então elas entram, e o estado qualifica o número. */
test('a sprint entra pelo mês em que FECHA, tenha ela fechado ou não', () => {
  const s20 = { name: 'Sprint 20', path: 'p', start: '2026-09-28T00:00:00Z', finish: '2026-10-09T00:00:00Z' };
  const s21 = { name: 'Sprint 21', path: 'p', start: '2026-10-12T00:00:00Z', finish: '2026-10-23T00:00:00Z' };
  const s19 = { name: 'Sprint 19', path: 'p', start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z' };
  const nomes = (meses) => C.sprintsDoPeriodo([s20, s21, s19], meses).map((s) => s.name);
  assert.deepEqual(nomes(['2026-10']), ['Sprint 20', 'Sprint 21'],
    'a Sprint 20 começa em setembro e fecha em outubro: ela é de outubro');
  assert.deepEqual(nomes(['2026-09']), ['Sprint 19']);
});

test('o estado da sprint é lido no instante que o documento declara', () => {
  const sp = { name: 'Sprint 20', start: '2026-09-28T00:00:00Z', finish: '2026-10-09T00:00:00Z' };
  assert.equal(C.estadoDaSprint(sp, Date.parse('2026-09-20T12:00:00Z')), 'futura');
  assert.equal(C.estadoDaSprint(sp, Date.parse('2026-10-06T12:00:00Z')), 'corrente');
  // No último dia ela AINDA é a sprint: só fecha depois que o dia vira.
  assert.equal(C.estadoDaSprint(sp, Date.parse('2026-10-09T18:00:00Z')), 'corrente');
  assert.equal(C.estadoDaSprint(sp, Date.parse('2026-10-10T00:30:00Z')), 'fechada');
  // No primeiro dia ela já é: a mesma régua nas duas pontas.
  assert.equal(C.estadoDaSprint(sp, Date.parse('2026-09-28T09:00:00Z')), 'corrente');
});

/* Sem data não dá pra situar no tempo. Devolver '' faz quem desenha não afirmar
   nada — melhor que chutar "fechada" e imprimir um parcial como resultado. */
test('sprint sem data não ganha estado chutado', () => {
  assert.equal(C.estadoDaSprint({}, AGORA), '');
  assert.equal(C.estadoDaSprint(null, AGORA), '');
  assert.equal(C.estadoDaSprint({ start: '2026-10-12T00:00:00Z' }, AGORA), 'futura');
});

test('as sprints saem da mais antiga pra mais nova, e sem data ficam de fora', () => {
  const s = (name, finish) => ({ name, path: 'p', start: finish, finish });
  const lista = [s('C', '2026-09-25T00:00:00Z'), s('A', '2026-08-14T00:00:00Z'),
    s('B', '2026-09-11T00:00:00Z'), { name: 'sem data', path: 'p' }];
  const r = C.sprintsDoPeriodo(lista, ['2026-08', '2026-09']).map((x) => x.name);
  assert.deepEqual(r, ['A', 'B', 'C']);
});

test('sem período declarado, nenhuma sprint entra', () => {
  assert.deepEqual(C.sprintsDoPeriodo([{ name: 'A', finish: '2026-09-11T00:00:00Z' }], []), []);
  assert.deepEqual(C.sprintsDoPeriodo(null, null), []);
});

/* ---------- a tarja ---------- */

const HOJE = Date.parse('2026-10-06T12:00:00Z');
const sprintItem = (id, path, estado) => ({
  id, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': estado, 'System.IterationPath': path },
});
const OUT_ITENS = [
  sprintItem(1, 'P\\Sprint 20', 'Done'), sprintItem(2, 'P\\Sprint 20', 'New'),
  sprintItem(3, 'P\\Sprint 20', 'New'), sprintItem(9, 'P\\Sprint 21', 'New'),
];
const linhaDe = (sp) => C.ritmoDaSprint(sp, null, null, OUT_ITENS, HOJE);
const S20 = { name: 'Sprint 20', path: 'P\\Sprint 20', start: '2026-09-28T00:00:00Z', finish: '2026-10-09T00:00:00Z' };
const S21 = { name: 'Sprint 21', path: 'P\\Sprint 21', start: '2026-10-12T00:00:00Z', finish: '2026-10-23T00:00:00Z' };

test('sprint em curso é tarjada, e o parcial dela não vira resultado', () => {
  const html = V2.secaoRitmo([linhaDe(S20)]);
  assert.match(html, /<span class="rt-fase">Em curso<\/span>/);
  assert.match(html, /<span class="rt-placar">1\/3<\/span>/);
});

/* "0 de 1 entregue" sobre trabalho que nem começou lê como zero de resultado.
   O que existe ali é o escopo já posto na fila. */
test('sprint que não começou mostra o planejado, não um placar zerado', () => {
  const html = V2.secaoRitmo([linhaDe(S21)]);
  assert.match(html, /<span class="rt-fase">Próxima<\/span>/);
  assert.match(html, /<span class="rt-placar">1 item<\/span>/);
  assert.doesNotMatch(html, /rt-feito|rt-saiu/, 'a barra da sprint que não começou tem segmento');
});

test('sprint que não começou e não tem nada na fila diz isso', () => {
  const html = V2.secaoRitmo([C.ritmoDaSprint(S21, null, null, [], HOJE)]);
  assert.match(html, /<span class="rt-placar">em planejamento<\/span>/);
});

/* ---------- a lista de itens ---------- */

/* É o que transformou o documento de retrato mensal em acompanhamento: quem
   abre toda semana quer saber o que está planejado, e um placar não responde. */
test('a sprint lista seus itens, entregue primeiro', () => {
  const comTitulo = (id, t, estado, path) => ({
    id, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.Title': t, 'System.State': estado, 'System.IterationPath': path },
  });
  const itens = [
    comTitulo(1, 'Assinatura inteligente', 'To Do', 'P\\Sprint 20'),
    comTitulo(2, 'Produto único para ads', 'In Progress', 'P\\Sprint 20'),
    comTitulo(3, 'Brinde indevido', 'Done', 'P\\Sprint 20'),
  ];
  const linha = C.ritmoDaSprint(S20, null, null, itens, HOJE);
  assert.deepEqual(linha.itens.map((x) => x.titulo),
    ['Brinde indevido', 'Produto único para ads', 'Assinatura inteligente'],
    'a ordem é feito, depois o que anda, depois a fila');
  const html = V2.secaoRitmo([linha]);
  assert.match(html, /<li class="rt-item">\s*<span class="rt-badge rt-tipo-pbi">PBI<\/span>\s*<span class="rt-item-nome">Brinde indevido/);
  assert.match(html, /Assinatura inteligente<\/span>\s*<span class="rt-item-estado">To Do/);
});

/* Eles não estão mais nesta sprint. Numa lista só, todo leitor do campo teria
   que lembrar de filtrar — e é assim que um número sai diferente do outro na
   mesma tela. */
test('o que transbordou vem em lista própria, no fim e marcado', () => {
  const dentro = { id: 1, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.Title': 'Ficou', 'System.State': 'Done', 'System.IterationPath': 'P\\Sprint 19' } };
  const saiu = { id: 7, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.Title': 'Escorreu', 'System.State': 'New', 'System.IterationPath': 'P\\Sprint 20' } };
  const linha = C.ritmoDaSprint(
    { name: 'Sprint 19', path: 'P\\Sprint 19', start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z' },
    [1], [1, 7], [dentro, saiu], HOJE);
  assert.deepEqual(linha.itens.map((x) => x.titulo), ['Ficou']);
  assert.deepEqual(linha.transbordados.map((x) => x.titulo), ['Escorreu']);
  const html = V2.secaoRitmo([linha]);
  assert.ok(html.indexOf('Ficou') < html.indexOf('Escorreu'), 'o que saiu devia fechar a lista');
  assert.match(html, /<li class="rt-item rt-transbordou">[\s\S]*?Escorreu[\s\S]*?transbordou</);
});

test('título de item com HTML é escapado', () => {
  const linha = { nome: 'S', estado: 'corrente', entregues: 0, total: 1, transbordaram: 0, itens: [{ titulo: '<script>x</script>', estado: 'New', feito: false }] };
  const html = V2.secaoRitmo([linha]);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('sprint sem itens não desenha lista vazia', () => {
  assert.doesNotMatch(V2.secaoRitmo([{ nome: 'S', estado: 'futura', entregues: 0, total: 0, transbordaram: 0 }]), /rt-itens/);
});

/* Fechada é o estado que os números pressupõem. Tarjar o normal faria o olho
   procurar diferença onde não há. */
test('sprint fechada não leva tarja', () => {
  const fechada = C.ritmoDaSprint(
    { name: 'Sprint 19', path: 'P\\Sprint 19', start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z' },
    [], [], [], HOJE);
  assert.match(V2.secaoRitmo([fechada]), /<span class="rt-fase">Encerrada<\/span>/);
});

/* A tarja qualifica o número; ela não alarma sobre ele. A cor nesta seção está
   reservada pro que significa — verde entregue, âmbar transbordo. */
test('a tarja é cinza, sem cor de significado', () => {
  const css = ler('assets/ritmo.css');
  const regra = /\.rt-fase \{[^}]*\}/.exec(css);
  assert.ok(regra, 'a regra da retranca sumiu');
  assert.match(regra[0], /color: var\(--mudo\)/);
  assert.doesNotMatch(regra[0], /--positivo|--atencao|--erro|--transbordo-barra/);
  // Só a em curso ganha tinta cheia — o destaque é da coluna que o time olha.
  assert.match(css, /\.rt-corrente \.rt-fase \{ background: var\(--tinta\); color: var\(--fundo-pagina\); \}/);
});

/* ---------- o controlador compartilhado ---------- */

const fonteReport = ler('assets/report.js');

test('a busca de sprint só acende pra quem declara — os outros dois documentos não gastam requisição', () => {
  assert.match(fonteReport, /st\.sprintsBrutas = B\.precisaDeSprints === true \? await buscarRitmo\(escopos\) : null;/,
    'a busca deixou de ser condicional e o report.html passou a consultar sprint à toa');
  assert.match(fonteReport, /sprints: B\.precisaDeSprints === true \? saneRitmo\(ritmoAgora\(mostrados\)\) : undefined,/,
    'o pacote do link ganhou sprint em documento que não pediu');
});

/* `ritmoDaSprint` devolve a forma curta inteira — id, responsável e tipo —, e
   nada disso é desenhado. Sem a poda na saída, o nome de cada pessoa do time
   entraria num arquivo publicado à toa. O mesmo saneador nas duas pontas é o
   que garante que o que sai é exatamente o que entra. */
test('o que é publicado passa pela mesma poda que o que é lido', () => {
  const m = /function saneRitmo\(lista\) \{[\s\S]*?\n\}/.exec(fonteReport);
  // eslint-disable-next-line no-eval
  const saneRitmo = eval(`(${m[0]})`);
  const [linha] = saneRitmo([{
    nome: 'Sprint 20', estado: 'corrente', entregues: 1, total: 3, transbordaram: 0,
    itens: [{ id: 51676, titulo: 'Assinatura', estado: 'To Do', feito: false, resp: 'Fulano de Tal', tipo: 'pbi' }],
    transbordados: [],
  }]);
  assert.deepEqual(Object.keys(linha.itens[0]).sort(), ['estado', 'feito', 'tipo', 'titulo']);
  assert.equal(JSON.stringify(linha).includes('Fulano de Tal'), false,
    'o nome do responsável sobreviveu à poda e vai parar no arquivo publicado');
  assert.equal(JSON.stringify(linha).includes('51676'), false, 'o id viajou à toa');
});

test('item forjado no pacote não pinta de verde nem estoura o documento', () => {
  const m = /function saneRitmo\(lista\) \{[\s\S]*?\n\}/.exec(fonteReport);
  // eslint-disable-next-line no-eval
  const saneRitmo = eval(`(${m[0]})`);
  const [linha] = saneRitmo([{
    nome: 'S', itens: [{ titulo: 'T'.repeat(900), estado: 'E'.repeat(99), feito: 'sim' }, { titulo: '' }],
  }]);
  assert.equal(linha.itens.length, 1, 'item sem título devia sair');
  assert.equal(linha.itens[0].titulo.length, 200);
  assert.equal(linha.itens[0].estado.length, 40);
  assert.equal(linha.itens[0].feito, true, 'feito tem que virar booleano de verdade');
  assert.deepEqual(saneRitmo([{ nome: 'S', itens: 'nada' }])[0].itens, []);
});

/* As duas pontas da comparação têm que ser a MESMA pergunta em dois instantes.
   Enquanto eram consultas diferentes, a diferença entre elas misturava
   transbordo com desencontro de definição — 141 contra 147 na Sprint 19. */
test('as duas consultas da sprint saem do mesmo construtor', () => {
  assert.match(fonteReport, /const qAgora = C\.wiqlIteracao\(sp\.path, areas\);/);
  assert.match(fonteReport, /const qNoFim = C\.wiqlIteracao\(sp\.path, areas, Date\.parse\(sp\.finish\) \+ C\.FIM_DO_DIA\);/);
});

/* O recorte de responsável troca sem recarregar a página. Se a linha fosse
   montada na busca, ela ficaria congelada no recorte antigo embaixo de um
   documento já redesenhado — dois números discordando na mesma tela. */
test('a linha é contada no render, sobre a MESMA lista que desenha o corpo', () => {
  assert.match(fonteReport, /const itensDoDoc = st\.leitura \? st\.items : st\.items\.filter\(noNome\);/);
  assert.match(fonteReport, /items: itensDoDoc,/);
  assert.match(fonteReport, /sprints: st\.leitura \? st\.sprints : ritmoAgora\(itensDoDoc\),/);
});

test('a iteração entra nos campos buscados — senão não há como saber quem está em qual sprint', () => {
  assert.match(fonteReport, /const CAMPOS = \[[\s\S]*?'System\.IterationPath',[\s\S]*?\];/);
});

/* O link é forjável como todo o resto do pacote: ele é texto numa URL. */
test('as linhas que chegam pelo link passam por saneamento', () => {
  assert.match(fonteReport, /st\.sprints = saneRitmo\(pacote\.sprints\);/);
  const m = /function saneRitmo\(lista\) \{[\s\S]*?\n\}/.exec(fonteReport);
  assert.ok(m, 'saneRitmo sumiu');
  // eslint-disable-next-line no-eval
  const saneRitmo = eval(`(${m[0]})`);
  assert.deepEqual(saneRitmo(null), []);
  assert.deepEqual(saneRitmo('nada'), []);
  const [x] = saneRitmo([{ nome: 'S'.repeat(500), entregues: -3, total: 1.7, transbordaram: 'x' }]);
  assert.equal(x.nome.length, 80);
  assert.equal(x.entregues, 0, 'número negativo vira zero');
  assert.equal(x.total, 1, 'fração vira inteiro');
  assert.equal(x.transbordaram, 0, 'texto vira zero');
  assert.deepEqual(saneRitmo([{ nome: '' }]), [], 'linha sem nome não desenha');
});

/* ---------- as duas abas ---------- */

/* O documento responde duas perguntas com ritmos diferentes: o que o time
   ENTREGOU (texto curado, congela) e o que está ACONTECENDO (sprints e roadmap,
   mudam sozinhos). Numa página só, a segunda empurra a primeira pra baixo. */
/* A pílula fica ENTRE a capa e o corpo, como o .rl-nav do report v2. Não há
   cabeçalho próprio: a capa deste documento é a mesma do relatório de Agosto e
   Setembro, com a marca dentro dela, e um segundo topo acima disputaria com
   ela. */
test('a pílula entra entre a capa e o corpo', () => {
  const html = V2.htmlReport(entrada({ sprints: SPRINTS })).html;
  const capa = html.indexOf('<header class="rl-capa">');
  const pilula = html.indexOf('<nav class="rl-nav rl-abas"');
  const corpo = html.indexOf(V2.ANCORA);
  assert.ok(capa >= 0 && pilula >= 0 && corpo >= 0, 'sumiu a capa, a pílula ou o corpo');
  assert.ok(capa < pilula, 'a pílula voltou pra antes da capa');
  assert.ok(pilula < corpo, 'a pílula caiu dentro do corpo');
  assert.match(html, /data-aba="entregas" aria-pressed="true"/);
  assert.match(html, /data-aba="acompanhar"[^>]*aria-pressed="false"/);
  assert.equal(V2.ABA_PADRAO, 'entregas', 'o documento abre no que ele é: um relatório de entregas');
});

/* A marca segue onde o documento base a desenha: dentro da capa. Esconder o
   topo da capa foi coisa do cabeçalho, que não existe mais. */
test('a marca continua na capa, intocada', () => {
  const css = ler('assets/ritmo.css');
  assert.doesNotMatch(css, /\.rl-capa-topo/, 'a folha ainda mexe no topo da capa');
  assert.doesNotMatch(css, /rl-topo/, 'sobrou regra do cabeçalho que foi removido');
  assert.doesNotMatch(V2.abasHtml(), /<img/, 'a pílula não desenha marca nenhuma');
});

/* A capa muda com a aba, e o texto de Entregas não é declarado em lugar nenhum:
   o script guarda o que o base escreveu e restaura. Declarar seria uma segunda
   cópia de uma frase que mora no outro arquivo. */
test('só a aba Acompanhar declara texto de capa', () => {
  const html = V2.abasHtml();
  assert.match(html, /data-aba="acompanhar" data-titulo="Acompanhamento de" data-situacao="[^"]+"/);
  const entregas = /<button[^>]*data-aba="entregas"[^>]*>/.exec(html)[0];
  assert.doesNotMatch(entregas, /data-titulo|data-situacao/,
    'a aba Entregas repetiu texto do documento base');
  const pagina = ler('entregas-v2.html');
  assert.match(pagina, /if \(el\.dataset\.orig === undefined\) el\.dataset\.orig = el\.textContent;/);
  assert.match(pagina, /el\.textContent = \(btn && btn\.dataset\[chave\]\) \|\| el\.dataset\.orig;/);
});

/* O .rl-bento declara `display: grid`, e regra de autor ganha do
   `[hidden] { display:none }` do navegador. Sem a regra parceira o bloco de
   números continuaria na tela com o JS achando que escondeu — mesmo defeito que
   já apareceu aqui com a barra de ferramentas e com o seletor de mês. */
test('o bloco de números tem a regra parceira do hidden, e na folha da v2', () => {
  assert.match(ler('assets/ritmo.css'), /\.rl-bento-capa\[hidden\] \{ display: none; \}/);
  assert.doesNotMatch(ler('assets/entregas.css'), /\.rl-bento-capa\[hidden\]/,
    'a regra vazou pra folha compartilhada com Agosto e Setembro');
  assert.equal(V2.SO_EM_ENTREGAS, '.rl-bento-capa');
});

/* Quem decide a que aba cada seção pertence é quem DESENHA o documento. Repetir
   a lista no script da página seria a segunda cópia, que diverge na primeira
   seção nova. */
test('a lista de seções de Acompanhar viaja na marcação, não no script', () => {
  assert.deepEqual(V2.SECOES_ACOMPANHAR, ['ritmo', 'roadmap']);
  assert.match(V2.abasHtml(), /data-acompanhar="ritmo roadmap"/);
  const pagina = ler('entregas-v2.html');
  assert.match(pagina, /nav\.dataset\.acompanhar/);
  assert.doesNotMatch(pagina.replace(/\/\*[\s\S]*?\*\//g, ''), /'roadmap'/,
    'o script escreveu o id à mão em vez de ler do documento');
});

/* Entregas sem cartão é o caso REAL de hoje: outubro começou sem nada escrito.
   Sem a frase, a aba abre com capa, abas e rodapé — lê como documento
   quebrado. */
test('cada aba tem a frase de quando está vazia', () => {
  const html = V2.vaziosHtml();
  assert.match(html, /<p class="rl-aba-vazia mudo" data-de="entregas" hidden>As entregas deste período ainda estão sendo escritas\.<\/p>/);
  assert.match(html, /<p class="rl-aba-vazia mudo" data-de="acompanhar" hidden>/);
  // Nascem escondidas: quem as acende é o script, e só quando não há seção.
  assert.equal((html.match(/class="rl-aba-vazia mudo"[^>]*hidden>/g) || []).length, 2);
});

/* Sem o script as duas partes aparecem empilhadas, que é o documento de antes.
   A aba é melhoria de leitura, não requisito pra ele fazer sentido. */
test('o documento renderiza inteiro sem o script da página', () => {
  const html = V2.htmlReport(entrada({ sprints: SPRINTS })).html;
  assert.match(html, /<section class="rl-sec" id="ritmo">/);
  assert.doesNotMatch(html, /<section class="rl-sec" id="ritmo" hidden>/,
    'nenhuma seção pode nascer escondida — sem JS elas somem de vez');
});

/* O fragmento é onde mora o pacote de dados dos links antigos. Escrever a aba
   ali apagaria o documento de quem abrir um deles. */
test('a aba só entra no endereço quando o fragmento não é pacote', () => {
  const pagina = ler('entregas-v2.html');
  assert.match(pagina, /const ehPacote = \(\) => \/\^#r=\/\.test\(location\.hash \|\| ''\);/);
  assert.match(pagina, /if \(gravarNaUrl && !ehPacote\(\)\)/);
  // replaceState: trocar de aba não é navegação nova, e o Voltar do navegador
  // tem que sair da página, não percorrer cliques de aba.
  assert.match(pagina, /history\.replaceState\(null, '', location\.pathname \+ location\.search \+ '#' \+ aba\);/);
  assert.doesNotMatch(pagina, /history\.pushState/);
});

/* O report.js reescreve #report inteiro a cada render, e a aba ativa some com
   ele. Sem devolver o estado, um refresh de dados jogaria o leitor de volta
   pra Entregas no meio da leitura. */
test('a aba ativa sobrevive ao redesenho do documento', () => {
  const pagina = ler('entregas-v2.html');
  assert.match(pagina, /new MutationObserver\(\(\) => \{[\s\S]*?aplicar\(atual \|\| daUrl\(\), false\);/);
});

/* ---------- publicação em arquivo ---------- */

/* Documento de acompanhamento não cabe no fragmento: lá o dado anda junto com o
   link, e cada atualização vira um link novo pra reenviar.

   A edição de Agosto e Setembro ganhou endereço próprio quando o seletor passou
   a levar até ela: sem isso, quem não tem token caía em "Sem token neste
   navegador". Cada edição tem o SEU arquivo — um só serviria uma delas. */
test('cada edição declara o endereço fixo dos dados dela', () => {
  assert.equal(V2.arquivoDeDados, 'assets/dados-outubro.json');
  assert.equal(BASE.arquivoDeDados, 'assets/dados-ago-set.json');
  assert.notEqual(V2.arquivoDeDados, BASE.arquivoDeDados);
});

/* O report e o v2 não declaram, e seguem só com o fragmento — nenhuma
   requisição a mais e nenhum comportamento novo. */
test('report e v2 continuam sem endereço fixo', () => {
  for (const f of ['assets/briefing.js', 'assets/briefing-v2.js']) {
    assert.equal(require('../' + f).arquivoDeDados, undefined, `${f} não devia ter ganhado`);
  }
});

/* O seletor NAVEGA, não redesenha: o que a edição antiga exporta não tem
   `resumo` nem `imagens`, e redesenhá-la aqui daria títulos com selo e nenhum
   texto nem tela — uma versão capenga de um relatório já publicado. */
test('o seletor de edição leva pro outro arquivo, e a atual não tem pra onde ir', () => {
  const html = V2.abasHtml();
  assert.match(html, /<div class="rl-mes-borda"><select class="rl-edicao rl-mes" aria-label="Edição do relatório">/);
  assert.match(html, /<option value="" selected>Outubro de 2026<\/option>/);
  assert.match(html, /<option value="entregas\.html">Agosto e Setembro de 2026<\/option>/);
  assert.equal(V2.EDICOES.filter((e) => !e.url).length, 1, 'só a edição atual fica sem destino');
  const pagina = ler('entregas-v2.html');
  assert.match(pagina, /if \(!sel \|\| !sel\.value\) return;/, 'a edição atual não pode navegar pra lugar nenhum');
  assert.match(pagina, /location\.href = sel\.value;/);
});

/* Prova de que a declaração não mexeu no documento: o campo é lido pelo
   report.js, nunca desenhado. */
test('a declaração não entra no documento de Agosto e Setembro', () => {
  const html = BASE.htmlReport(entrada()).html;
  assert.doesNotMatch(html, /dados-ago-set/);
});

/* Duas entradas pro mesmo dado — o fragmento e o arquivo — com saneamentos
   próprios seriam duas definições de pacote válido, e a segunda ficaria pra
   trás no primeiro campo novo. */
test('as duas entradas de dado passam pela MESMA porta', () => {
  assert.match(fonteReport, /function aplicarPacote\(pacote\) \{/);
  const chamadas = (fonteReport.match(/aplicarPacote\(/g) || []).length;
  assert.equal(chamadas, 3, 'esperado: a definição, o caminho do link e o do arquivo');
  assert.match(fonteReport, /aplicarPacote\(JSON\.parse\(await descomprimir\(carga\)\)\)/);
  assert.match(fonteReport, /aplicarPacote\(await resp\.json\(\)\)/);
});

/* Mesma regra na saída: montar o pacote em dois lugares faria o arquivo e o
   link divergirem, e o mesmo documento diria coisas diferentes conforme o
   caminho por onde chegou. */
test('as duas saídas montam o pacote pela MESMA porta', () => {
  assert.match(fonteReport, /function pacoteDoDocumento\(\) \{/);
  assert.match(fonteReport, /comprimir\(JSON\.stringify\(pacoteDoDocumento\(\)\)\)/);
  assert.match(fonteReport, /JSON\.stringify\(pacoteDoDocumento\(\), null, 1\)/);
});

/* Um link que já circula tem que continuar abrindo o que ele carrega, mesmo
   depois de o documento ganhar endereço fixo. */
test('o fragmento tem precedência sobre o arquivo publicado', () => {
  assert.match(fonteReport,
    /if \(!\(st\.config && st\.pat\) && \(await lerDoLink\(\) \|\| await lerDoArquivo\(\)\)\) return;/);
});

/* A página é servida por CDN. Um documento de acompanhamento entregando a
   versão de ontem é exatamente o defeito que ele existe pra não ter. */
test('o arquivo é pedido sem cache', () => {
  assert.match(fonteReport, /fetch\(arquivo \+ '\?t=' \+ Date\.now\(\), \{ cache: 'no-store' \}\)/);
});

/* Sem publicação, o leitor precisa saber que falta um PASSO — não que o
   documento quebrou. */
test('documento não publicado explica o que falta, sem cara de erro', () => {
  const m = /async function lerDoArquivo\(\) \{[\s\S]*?\n\}/.exec(fonteReport);
  assert.ok(m, 'lerDoArquivo sumiu');
  assert.match(m[0], /ainda não foi publicado/);
  assert.doesNotMatch(m[0], /class="erro"/, 'falta de publicação não é erro da página');
});

/* O nome do arquivo é declarado pelo DOCUMENTO e lido pelo script. Duas cópias
   divergem na primeira vez que a edição virar outro mês. */
test('o script de publicação lê os nomes dos módulos, e serve as duas edições', () => {
  const sh = ler('scripts/publicar-dados.sh');
  assert.match(sh, /assets\/briefing-entregas\.js assets\/briefing-entregas-v2\.js/,
    'o script precisa conhecer as duas edições');
  const semComentario = sh.replace(/^#.*$/gm, '');
  for (const nome of ['dados-outubro.json', 'dados-ago-set.json']) {
    assert.ok(!semComentario.includes(nome), `o script escreveu ${nome} à mão em vez de ler do módulo`);
  }
  /* Publicar a edição errada sobrescreve um relatório já compartilhado — com
     dois arquivos esperando em Downloads, o script para em vez de escolher. */
  assert.match(semComentario, /achei mais de um arquivo pra publicar/);
});

/* ---------- a página ---------- */

const pagina = ler('entregas-v2.html');

test('a página carrega os dois briefings, nesta ordem', () => {
  const base = pagina.indexOf('assets/briefing-entregas.js');
  const v2 = pagina.indexOf('assets/briefing-entregas-v2.js');
  assert.ok(base > 0 && v2 > 0, 'falta um dos dois briefings');
  assert.ok(base < v2, 'o v2 carrega antes do base e não acha o documento pra estender');
  assert.ok(pagina.indexOf('assets/report.js') > v2, 'o controlador precisa vir depois dos dois');
});

test('a folha do ritmo vem depois da folha de entregas — os tokens moram lá', () => {
  assert.ok(pagina.indexOf('assets/entregas.css') < pagina.indexOf('assets/ritmo.css'));
});

/* O entregas.css é compartilhado com o documento original. O dia em que a
   seção do ritmo encostar nele, o "não mexi no relatório atual" deixa de valer. */
test('o estilo do ritmo mora em folha própria, fora da folha compartilhada', () => {
  const entregasCss = ler('assets/entregas.css');
  assert.doesNotMatch(entregasCss, /\.rt-/, 'o estilo do ritmo vazou pra folha do documento original');
  assert.match(ler('assets/ritmo.css'), /\.rt-lista/);
});

/* Duas por linha é o formato do CONTEÚDO — o relatório costuma fechar duas
   sprints por período. No telefone não cabe, e o corte é o mesmo 720px que a
   entregas.css usa no resto do documento. Uma regra de coluna que vazasse do
   @media espremeria os dois cartões em 375px. */
test('duas colunas só a partir de 720px, e nunca fora do @media', () => {
  const css = ler('assets/ritmo.css');
  const largo = /@media \(min-width: 720px\) \{[\s\S]*?\n\}/.exec(css);
  assert.ok(largo, 'o @media de 720px sumiu da folha do ritmo');
  assert.match(largo[0], /\.rt-lista \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  /* Só a regra da LISTA: o cabeçalho também declara colunas, e fora de @media
     mesmo — ele é de três colunas em qualquer largura acima do telefone. */
  const foraDoMedia = css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  assert.doesNotMatch(foraDoMedia, /\.rt-lista \{[^}]*grid-template-columns/,
    'a regra de colunas da lista vazou pro telefone e espreme os cartões em 375px');
});

/* Meia largura com um vão do lado lê como cartão que faltou carregar, e não
   como período de uma sprint só. */
test('sprint sozinha ocupa a linha inteira', () => {
  assert.match(ler('assets/ritmo.css'), /\.rt-linha:only-child \{ grid-column: 1 \/ -1; \}/);
});

/* O mesmo fato não pode ter duas cores em duas telas. O transbordo já tem cor
   no board da Central (o ponto da coluna, em corColunaPorBucket) — a barra daqui
   usa o MESMO valor, e este teste é o que impede as duas de divergirem no dia
   em que alguém ajustar só uma. */
test('o âmbar da barra é o mesmo âmbar do transbordo no board da Central', () => {
  const noApp = /if \(bucket === 'transbordo'\) return '(#[0-9a-f]{6})';/i.exec(ler('assets/app.js'));
  assert.ok(noApp, 'o bucket de transbordo sumiu do app.js — a cor perdeu a origem');
  const naFolha = /--transbordo-barra:\s*(#[0-9a-f]{6});/i.exec(ler('assets/ritmo.css'));
  assert.ok(naFolha, 'a folha do ritmo perdeu o token do transbordo');
  assert.equal(naFolha[1].toLowerCase(), noApp[1].toLowerCase());
});

/* O --atencao é âmbar de TEXTO: em faixa de 6px ele lê como marrom-avermelhado
   e passa a dizer "erro". Transbordo é decisão de planejamento, não defeito. */
test('a barra não usa o âmbar de texto', () => {
  assert.match(ler('assets/ritmo.css'), /\.rt-saiu \{ background: var\(--transbordo-barra\); \}/);
});

/* As tags do entregas.html afirmam a URL e a imagem DAQUELE documento.
   Copiadas, o cartaz deste link mandaria o leitor pro documento antigo.

   Sem os comentários: o cabeçalho da página explica por que as tags NÃO estão
   lá, e cita os nomes delas pra isso. Documentação não é marcação — e um teste
   que casa com o próprio texto que o explica é falso positivo garantido. */
test('a v2 não carrega preview emprestado do documento original', () => {
  const semComentarios = pagina.replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(semComentarios, /og:url|og:image/,
    'a v2 ganhou tags de preview — confira se apontam pra ela mesma antes de liberar');
});

test('a v2 declara data-ferramentas="local", como o original', () => {
  assert.match(pagina, /<body[^>]*data-ferramentas="local"/);
});

/* O botão no HTML é o que acende a publicação: o report.js procura o id e sai
   calado quando não acha. Nenhuma declaração extra, e as outras três páginas
   seguem exatamente como estavam. */
test('só a v2 tem o botão de publicar', () => {
  assert.match(pagina, /<button id="publicar"/);
  assert.match(fonteReport, /if \(\$\('publicar'\)\) \$\('publicar'\)\.addEventListener\('click', publicarDados\);/);
  /* O entregas.html também publica, desde que o seletor passou a levar até
     ele: cada edição gera o arquivo dela. É chrome do PO — a barra só se monta
     em localhost —, então o leitor nunca vê o botão e o documento não muda. */
  assert.match(ler('entregas.html'), /<button id="publicar"/);
  for (const f of ['report.html', 'report-v2.html']) {
    assert.doesNotMatch(ler(f), /id="publicar"/, `${f} não devia ter ganhado o botão`);
  }
});

/* ---------- o cabeçalho ---------- */


/* Grade de três colunas, e não flex com space-between: as abas ficam no centro
   da PÁGINA, e não no meio do espaço que sobrou da marca. */
/* FIXA, e não sticky: sticky só gruda depois que a rolagem alcança a peça, e
   quem abre numa parte e quer a outra teria que voltar ao começo pra achar o
   menu. */
test('a pílula fica fixa no topo, centrada', () => {
  const css = ler('assets/ritmo.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const regra = /\.rl-abas \{[^}]*\}/.exec(css);
  assert.ok(regra, 'a regra da pílula sumiu');
  assert.match(regra[0], /position:\s*fixed/);
  assert.match(regra[0], /top:\s*0\.6rem/);
  assert.match(regra[0], /justify-content:\s*center/);
  /* Fora do fluxo ela não pode reservar espaço: com margem, abriria um vão
     entre a capa e o corpo onde ela nem está mais. */
  assert.match(regra[0], /margin:\s*0;/);
});



/* Dois zeros gigantes em cima de "as entregas ainda estão sendo escritas" é a
   mesma ausência dita duas vezes, e a segunda com peso de manchete. */
test('os números da capa somem também quando a própria aba Entregas está vazia', () => {
  const pagina = ler('entregas-v2.html');
  assert.match(pagina, /el\.hidden = aba !== 'entregas' \|\| vazia;/);
  // `vazia` precisa ser calculada ANTES — senão a linha acima lê undefined e
  // os números ficam na tela justamente no caso que ela existe pra resolver.
  assert.ok(pagina.indexOf('const vazia =') < pagina.indexOf("el.hidden = aba !== 'entregas' || vazia;"),
    'o cálculo de `vazia` ficou depois de quem o usa');
});

/* Hover quebrado, visto pelo Urlan: a aba ficava preta com o texto sumido. Duas
   definições de `.rl-aba` na mesma folha — a antiga sobrevivera a uma troca e
   vinha DEPOIS, então ganhava, e o `:hover` dela devolvia a tinta ao texto
   sobre fundo de tinta. Uma regra só é o que impede isso de voltar. */
test('a aba tem uma definição só, e o hover não some com o texto', () => {
  const css = ler('assets/ritmo.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const definicoes = (css.match(/(^|\n)\.rl-aba \{/g) || []).length;
  assert.equal(definicoes, 1, 'há mais de uma regra .rl-aba — a última ganha, e as duas divergem');
  assert.equal((css.match(/(^|\n)\.rl-aba:hover/g) || []).length, 1);
  // Fundo de tinta exige texto claro, nos dois estados em que ele aparece.
  for (const re of [/\.rl-aba:hover \{ background: var\(--tinta\); color: #fff; \}/,
    /\.rl-aba\[aria-pressed="true"\] \{ background: var\(--tinta\); color: #fff; \}/]) {
    assert.match(css, re);
  }
});

/* A lista abria POR CIMA do controle: num <select> comum o popup é desenhado
   pelo sistema, e no macOS ele alinha o item selecionado sobre o botão.
   `appearance: base-select` entrega o desenho pro CSS e o picker vira um
   popover ancorado que nasce embaixo. */
test('a lista de edições abre abaixo do controle', () => {
  const css = ler('assets/ritmo.css');
  const bloco = /@supports \(appearance: base-select\) \{[\s\S]*?\n\}/.exec(css);
  assert.ok(bloco, 'o bloco de suporte sumiu');
  assert.match(bloco[0], /\.rl-edicao \{ appearance: base-select; \}/);
  assert.match(bloco[0], /position-area:\s*block-end span-inline-start/);
});

/* Atrás de @supports de propósito: onde o navegador não conhece, o <select>
   segue nativo e funcionando — pior posicionado, nunca quebrado. E continua
   sendo um <select> de verdade nos dois casos, então teclado, leitor de tela e
   o seletor do celular vêm do navegador, não de código nosso. */
test('o seletor continua sendo um <select>, não um menu de mentira', () => {
  assert.match(V2.abasHtml(), /<select class="rl-edicao rl-mes"/);
  /* Sem os comentários, e tirando o bloco pela MESMA extração do teste acima:
     o comentário que explica o `appearance: base-select` cita a declaração, e
     um teste que casa com o texto que o explica é falso positivo garantido. */
  const css = ler('assets/ritmo.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const bloco = /@supports \(appearance: base-select\) \{[\s\S]*?\n\}/.exec(css)[0];
  const foraDoSupports = css.replace(bloco, '');
  assert.doesNotMatch(foraDoSupports, /appearance: base-select/,
    'base-select fora do @supports quebra quem não suporta');
  assert.match(foraDoSupports, /\.rl-edicao \{[\s\S]*?appearance: none/,
    'sem suporte, o controle precisa continuar com a aparência própria');
});
