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

/* ---------- o documento original não muda ---------- */

/* O teste mais importante do arquivo. Se um dia alguém "melhorar" o v2 mexendo
   no base, é aqui que estoura. */
test('sem sprint, o v2 devolve exatamente o documento do base', () => {
  const a = BASE.htmlReport(entrada());
  const b = V2.htmlReport(entrada());
  assert.equal(b.html, a.html, 'o v2 alterou o documento mesmo sem seção pra acrescentar');
  assert.equal(b.vazio, a.vazio);
  assert.deepEqual(b.meses, a.meses);
});

test('lista de sprints vazia, nula ou só com lixo também não mexe no documento', () => {
  const base = BASE.htmlReport(entrada()).html;
  for (const s of [[], null, undefined, 'nada', [null, {}, { nome: '' }]]) {
    assert.equal(V2.htmlReport(entrada({ sprints: s })).html, base,
      `sprints=${JSON.stringify(s)} não devia desenhar seção`);
  }
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
  // Os que não são o desenho vêm do base sem cópia: uma régua só por documento.
  assert.deepEqual(V2.camposDoLink, BASE.camposDoLink);
  assert.equal(V2.contagensDoLink, BASE.contagensDoLink);
  assert.equal(V2.periodoDoDocumento, BASE.periodoDoDocumento);
  assert.notEqual(V2.htmlReport, BASE.htmlReport, 'só o desenho devia ser trocado');
});

/* ---------- a costura ---------- */

test('a âncora existe no documento do base, e exatamente uma vez', () => {
  const html = BASE.htmlReport(entrada()).html;
  const vezes = html.split(V2.ANCORA).length - 1;
  assert.equal(vezes, 1,
    `o base abre o corpo ${vezes} vez(es) com ${V2.ANCORA} — a costura do v2 depende de ser uma só`);
});

test('a seção entra logo depois da abertura do corpo, antes da primeira seção do base', () => {
  const html = V2.htmlReport(entrada({ sprints: SPRINTS })).html;
  const corpo = html.indexOf(V2.ANCORA);
  const ritmo = html.indexOf('id="ritmo"');
  const primeira = html.indexOf('<section class="rl-sec"', corpo + V2.ANCORA.length + 1);
  assert.ok(corpo >= 0 && ritmo > corpo, 'o ritmo não entrou dentro do corpo');
  assert.ok(ritmo < primeira || primeira === -1, 'o ritmo entrou depois de outra seção');
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

test('sprint ainda em curso fica fora do período — o placar sairia pela metade', () => {
  const emCurso = { name: 'Sprint 20', path: 'p', start: '2026-09-28T00:00:00Z', finish: '2026-10-09T00:00:00Z' };
  const fechada = { name: 'Sprint 19', path: 'p', start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z' };
  const nomes = (meses, agora) => C.sprintsDoPeriodo([emCurso, fechada], meses, agora).map((s) => s.name);
  assert.deepEqual(nomes(['2026-09', '2026-10'], Date.parse('2026-10-05T12:00:00Z')), ['Sprint 19']);
  // E no último dia dela a sprint AINDA é a sprint: só entra depois que o dia vira.
  assert.deepEqual(nomes(['2026-09'], Date.parse('2026-09-25T18:00:00Z')), []);
  assert.deepEqual(nomes(['2026-09'], Date.parse('2026-09-26T00:30:00Z')), ['Sprint 19']);
});

test('as sprints saem da mais antiga pra mais nova, e sem data ficam de fora', () => {
  const s = (name, finish) => ({ name, path: 'p', start: finish, finish });
  const lista = [s('C', '2026-09-25T00:00:00Z'), s('A', '2026-08-14T00:00:00Z'),
    s('B', '2026-09-11T00:00:00Z'), { name: 'sem data', path: 'p' }];
  const r = C.sprintsDoPeriodo(lista, ['2026-08', '2026-09'], AGORA).map((x) => x.name);
  assert.deepEqual(r, ['A', 'B', 'C']);
});

test('sem período declarado, nenhuma sprint entra', () => {
  assert.deepEqual(C.sprintsDoPeriodo([{ name: 'A', finish: '2026-09-11T00:00:00Z' }], [], AGORA), []);
  assert.deepEqual(C.sprintsDoPeriodo(null, null, AGORA), []);
});

/* ---------- o controlador compartilhado ---------- */

const fonteReport = ler('assets/report.js');

test('a busca de sprint só acende pra quem declara — os outros dois documentos não gastam requisição', () => {
  assert.match(fonteReport, /st\.sprintsBrutas = B\.precisaDeSprints === true \? await buscarRitmo\(escopos\) : null;/,
    'a busca deixou de ser condicional e o report.html passou a consultar sprint à toa');
  assert.match(fonteReport, /sprints: B\.precisaDeSprints === true \? ritmoAgora\(mostrados\) : undefined,/,
    'o pacote do link ganhou sprint em documento que não pediu');
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
