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

test('o v2 é a edição de Outubro, e começa sem cartão', () => {
  assert.deepEqual(V2.periodoDoDocumento(), ['2026-10']);
  assert.deepEqual(V2.cartoesDoDocumento(), []);
  assert.match(V2.htmlReport(entrada()).html, /Outubro de 2026/);
});

/* O que o v2 ACRESCENTA ao documento do base: o carimbo e a seção, nada mais.
   Tirados os dois, tem que sobrar a mesma string que o base desenha com as
   entradas da edição de outubro. Se um dia alguém fizer o v2 "ajustar" o
   documento por fora, é aqui que estoura. */
const semAcrescimos = (html) => String(html)
  .replace(/<p class="rt-carimbo">[\s\S]*?<\/p>/, '')
  .replace(/<section class="rl-sec" id="ritmo">[\s\S]*?<\/section>/, '');

/* O teste mais importante do arquivo. */
test('tirados carimbo e seção, o v2 devolve exatamente o que o base desenha', () => {
  const a = BASE.htmlReport(entrada({ periodo: V2.PERIODO, cartoes: [] }));
  const b = V2.htmlReport(entrada({ sprints: SPRINTS }));
  assert.equal(semAcrescimos(b.html), a.html, 'o v2 mexeu no documento além do que acrescenta');
  assert.equal(b.vazio, a.vazio);
  assert.deepEqual(b.meses, a.meses);
});

test('lista de sprints vazia, nula ou só com lixo também não desenha seção', () => {
  const base = BASE.htmlReport(entrada({ periodo: V2.PERIODO, cartoes: [] })).html;
  for (const s of [[], null, undefined, 'nada', [null, {}, { nome: '' }]]) {
    const html = V2.htmlReport(entrada({ sprints: s })).html;
    assert.doesNotMatch(html, /id="ritmo"/, `sprints=${JSON.stringify(s)} desenhou seção`);
    assert.equal(semAcrescimos(html), base, `sprints=${JSON.stringify(s)} mexeu no documento`);
  }
});

/* O carimbo entra SEMPRE, com ou sem sprint: ele fala do documento inteiro —
   os números da capa inclusive —, não da seção. */
test('o carimbo diz de quando é o dado, e entra mesmo sem sprint nenhuma', () => {
  const html = V2.htmlReport(entrada()).html;
  assert.match(html, /<p class="rt-carimbo">Dados de \d{2}\/\d{2}\/\d{4}, \d{2}h\d{2}<\/p>/);
});

/* Sem instante não há o que carimbar, e inventar uma data seria pior que não
   ter nenhuma: o leitor acreditaria nela. */
test('sem instante válido não há carimbo', () => {
  for (const t of [0, null, undefined, NaN, 'ontem', -5]) {
    assert.equal(V2.carimbo(t), '', `carimbou com agora=${JSON.stringify(t)}`);
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

/* A ordem no topo do corpo: abertura, carimbo, seção de sprints, e só então as
   seções do base. O carimbo primeiro porque vale pro documento inteiro; a
   seção antes das entregas porque é o que o leitor de acompanhamento abre pra
   ver. */
test('carimbo e seção entram no topo do corpo, nesta ordem', () => {
  const html = V2.htmlReport(entrada({ sprints: SPRINTS })).html;
  const corpo = html.indexOf(V2.ANCORA);
  const data = html.indexOf('<p class="rt-carimbo">');
  const ritmo = html.indexOf('<section class="rl-sec" id="ritmo">');
  const fimDoRitmo = ritmo + V2.secaoRitmo(SPRINTS).length;
  const doBase = html.indexOf('<section class="rl-sec"', fimDoRitmo);
  assert.ok(corpo >= 0, 'a âncora sumiu');
  assert.ok(corpo < data, 'o carimbo caiu fora do corpo');
  assert.ok(data < ritmo, 'a seção veio antes do carimbo');
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
  assert.match(html, /<b>2<\/b> de 5 entregues/);
  assert.match(html, /<b>3<\/b> transbordaram/);
});

test('transbordo zero não vira "0 transbordaram"', () => {
  const html = V2.secaoRitmo([{ nome: 'Sprint 17', start: '2026-08-17T00:00:00Z', finish: '2026-08-28T00:00:00Z', entregues: 5, total: 5, transbordaram: 0 }]);
  assert.match(html, /<b>5<\/b> de 5 entregues/);
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
  assert.match(html, /<span class="rt-tarja">em curso<\/span>/);
  assert.match(html, /<b>1<\/b> de 3 entregues/);
});

/* "0 de 1 entregue" sobre trabalho que nem começou lê como zero de resultado.
   O que existe ali é o escopo já posto na fila. */
test('sprint que não começou mostra o planejado, não um placar zerado', () => {
  const html = V2.secaoRitmo([linhaDe(S21)]);
  assert.match(html, /<span class="rt-tarja">não começou<\/span>/);
  assert.match(html, /<b>1<\/b> item planejado/);
  assert.doesNotMatch(html, /entregue/);
  assert.doesNotMatch(html, /rt-feito|rt-saiu/, 'a barra da sprint que não começou tem segmento');
});

test('sprint que não começou e não tem nada na fila diz isso', () => {
  const html = V2.secaoRitmo([C.ritmoDaSprint(S21, null, null, [], HOJE)]);
  assert.match(html, /ainda sendo planejada/);
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
  assert.match(html, /<li class="rt-item rt-ok">[\s\S]*?Brinde indevido/);
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
  assert.doesNotMatch(V2.secaoRitmo([fechada]), /rt-tarja/);
});

/* A tarja qualifica o número; ela não alarma sobre ele. A cor nesta seção está
   reservada pro que significa — verde entregue, âmbar transbordo. */
test('a tarja é cinza, sem cor de significado', () => {
  const css = ler('assets/ritmo.css');
  const regra = /\.rt-tarja \{[^}]*\}/.exec(css);
  assert.ok(regra, 'a regra da tarja sumiu');
  assert.match(regra[0], /color: var\(--mudo\)/);
  assert.doesNotMatch(regra[0], /--positivo|--atencao|--erro|--transbordo-barra/);
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
  assert.deepEqual(Object.keys(linha.itens[0]).sort(), ['estado', 'feito', 'titulo']);
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

/* ---------- publicação em arquivo ---------- */

/* Documento de acompanhamento não cabe no fragmento: lá o dado anda junto com o
   link, e cada atualização vira um link novo pra reenviar. As outras três
   edições não declaram e seguem só com o fragmento. */
test('só a edição de acompanhamento declara endereço fixo de dados', () => {
  assert.equal(V2.arquivoDeDados, 'assets/dados-outubro.json');
  assert.equal(BASE.arquivoDeDados, undefined);
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
test('o script de publicação lê o nome do arquivo do módulo, não repete', () => {
  const sh = ler('scripts/publicar-dados.sh');
  assert.match(sh, /grep -o "ARQUIVO_DE_DADOS = '\[\^'\]\*'" assets\/briefing-entregas-v2\.js/);
  assert.doesNotMatch(sh.replace(/^#.*$/gm, ''), /dados-outubro\.json/,
    'o script escreveu o nome à mão em vez de ler do módulo');
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
  const foraDoMedia = css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  assert.doesNotMatch(foraDoMedia, /grid-template-columns/,
    'a regra de colunas vazou pro telefone e espreme os cartões em 375px');
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
  for (const f of ['entregas.html', 'report.html', 'report-v2.html']) {
    assert.doesNotMatch(ler(f), /id="publicar"/, `${f} não devia ter ganhado o botão`);
  }
});
