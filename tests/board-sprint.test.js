/* A BARRA DO BOARD DE SPRINT contava e dizia coisas que não eram verdade.
   Achado pelo Urlan em 05/10/2026, olhando o board da Sprint 19.

   Nenhum dos dois quebra nada: a tela funciona, só informa errado. É a classe
   de defeito mais cara deste projeto, porque ninguém descobre usando.

   app.js é IIFE e mexe no DOM, então o teste lê o arquivo que o navegador
   serve e confere o trecho — mesma técnica do ferramentas-producao.test.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');

const raiz = path.join(__dirname, '..');
const fonteApp = fs.readFileSync(path.join(raiz, 'assets', 'app.js'), 'utf8');

/* ---------- 1. os chips contavam outro conjunto ---------- */
/* No print do Urlan a barra dizia "PBIs 110 · Bugs 96" — 206 itens — com 39
   cartões nas colunas. Os chips liam `todos` (o board inteiro do time) e as
   colunas liam o recorte da sprint. O número maior é o que o olho lê primeiro. */
const S19 = 'B2C\\2026\\Sprint 19';
const S20 = 'B2C\\2026\\Sprint 20';
const mk = (id, tipo, path_) => ({
  id,
  fields: { 'System.WorkItemType': tipo, 'System.State': 'Done', 'System.Title': 't' + id, 'System.IterationPath': path_ },
});
const conta = (lista) => lista.reduce((o, it) => {
  const s = C.typeSlug(it.fields['System.WorkItemType']);
  o[s] = (o[s] || 0) + 1;
  return o;
}, {});

test('o chip conta o que está na tela, não o board inteiro', () => {
  const todos = [];
  let id = 1;
  for (let i = 0; i < 30; i++) todos.push(mk(id++, 'Product Backlog Item', S19));
  for (let i = 0; i < 9; i++) todos.push(mk(id++, 'Bug', S19));
  for (let i = 0; i < 80; i++) todos.push(mk(id++, 'Product Backlog Item', S20));
  for (let i = 0; i < 87; i++) todos.push(mk(id++, 'Bug', S20));

  assert.deepEqual(conta(todos), { pbi: 110, bug: 96 }, 'a cena do print');
  const naSprint = todos.filter((it) => C.inSprint(it, S19));
  assert.deepEqual(conta(naSprint), { pbi: 30, bug: 9 });
  assert.equal(naSprint.length, 39, 'é este o número que as colunas mostram');
});

test('a base dos chips passa pelos outros filtros, menos o de tipo', () => {
  /* Contar com o filtro de tipo dentro zeraria os chips não selecionados e
     tiraria o caminho de volta — comportamento normal de filtro facetado. */
  assert.match(fonteApp, /const semTipo = Object\.assign\(\{\}, boardState\.filtro, \{ tipos: null, resp: respAtivo\(\) \}\);/,
    'os chips precisam ver sprint, busca e responsável — e ignorar só o tipo');
  assert.match(fonteApp, /renderChipsTipo\(\$\('board-tipos'\), base,/,
    'passar `todos` aqui é exatamente o defeito: 206 na barra com 39 na tela');
  assert.ok(!/renderChipsTipo\(\$\('board-tipos'\), todos,/.test(fonteApp), 'o conjunto errado voltou');
  /* O recorte final não pode ter mudado: só a contagem dos chips muda. */
  assert.match(fonteApp, /const items = C\.filterItems\(base, \{ tipos: boardState\.filtro\.tipos \}\);/);
});

/* ---------- 2. o rótulo afirmava "corrente" numa sprint passada ---------- */
/* "Só sprint corrente" era verdade quando o board só abria na sprint atual.
   Desde que a rota carrega o id da iteração dá pra entrar numa sprint passada,
   e o botão passou a mentir sobre qual recorte ele aplica. */
/* O "não pode conter" é feito sobre o código SEM comentários: a frase antiga
   aparece de propósito no comentário que explica por que ela saiu, e um teste
   que lê prosa reprova a própria documentação. Já aconteceu aqui antes, com um
   nome de arquivo citado dentro de um comentário. */
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/[^\n]*/gm, '')
  .replace(/<!--[\s\S]*?-->/g, '');

test('o botão nomeia a sprint que está aberta', () => {
  assert.match(fonteApp, /filtro\.textContent = boardState\.sprint && boardState\.sprint\.name\s*\n\s*\? 'Só a ' \+ boardState\.sprint\.name/,
    'o rótulo tem que sair do nome da sprint aberta');
  assert.ok(!/Só sprint corrente/.test(semComentarios(fonteApp)),
    'a palavra "corrente" voltou ao rótulo');
  const html = fs.readFileSync(path.join(raiz, 'central.html'), 'utf8');
  assert.ok(!/Só sprint corrente/.test(semComentarios(html)),
    'o HTML não pode prometer "corrente" antes de o app.js escrever o nome');
});

/* O que o botão FAZ não mudou, e é bom que não mude: recorte por IterationPath
   exato, o mesmo critério do Panorama desde a correção do transbordo. */
test('o filtro continua sendo por iteração exata', () => {
  assert.match(fonteApp, /base = base\.filter\(\(it\) => C\.inSprint\(it, boardState\.sprint\.path\)\)/);
  assert.equal(C.inSprint(mk(1, 'Bug', S19), S19), true);
  assert.equal(C.inSprint(mk(1, 'Bug', S20), S19), false);
});

/* ---------- 3. a coluna dos que saíram ---------- */
/* Pedido do Urlan em 05/10/2026, depois de confirmar os números: o board da
   Sprint 19 mostrava só "Feito" com 2 cartões. A sprint teve 5 PBIs no nome
   dele — os outros 3 foram pra Sprint 20 e sumiram da tela sem deixar rastro.

   O que estes testes guardam são as três decisões que fazem a coluna dizer a
   verdade, e que não se vê olhando a tela pronta. */

test('a coluna dos que saíram só existe com o recorte da sprint ligado', () => {
  /* Com o recorte desligado o board é o backlog inteiro do time, e os que
     saíram já estão lá — na sprint pra onde foram. Somá-los de novo mostraria
     o mesmo cartão duas vezes. */
  assert.match(fonteApp, /if \(boardState\.soSprint && boardState\.sprint\) \{[\s\S]*?\.concat\(boardState\.transbordados \|\| \[\]\);/,
    'os transbordados têm que entrar DENTRO do ramo do recorte por sprint');
});

test('quem saiu vai pra coluna própria, não pra do estado dele', () => {
  /* O estado dele é de OUTRA sprint agora. Vê-lo em "Em Desenvolvimento" aqui
     afirmaria que ele está em curso NESTA — o oposto do que aconteceu. */
  assert.match(fonteApp, /const col = it\.transbordou \? COLUNA_TRANSBORDO : \(f\['System\.BoardColumn'\] \|\| f\['System\.State'\] \|\| '—'\)/);
});

test('a coluna fecha o board, nos dois caminhos de ordenação', () => {
  /* Um caminho usa as colunas oficiais do DevOps, o outro o fallback por
     estado. A coluna dos que saíram não existe em nenhum dos dois, então a
     ordem é imposta depois — senão ela cairia no meio do fluxo. */
  assert.match(fonteApp, /nomes = nomes\.filter\(\(n\) => n !== COLUNA_TRANSBORDO\)\.concat\(COLUNA_TRANSBORDO\);/);
  const ondeOrdena = fonteApp.indexOf('nomes.filter((n) => n !== COLUNA_TRANSBORDO)');
  const ondeFallback = fonteApp.indexOf('C.orderColumnsFallback(');
  assert.ok(ondeOrdena > ondeFallback, 'a imposição tem que vir depois dos dois caminhos');
});

/* A marca é propriedade do objeto, nunca campo de `fields`: ali só entra o que
   veio do DevOps. Misturar marca própria com campo do servidor é como um filtro
   passa a responder por dado que ninguém escreveu. */
test('a marca de transbordo não se disfarça de campo do DevOps', () => {
  assert.match(fonteApp, /Object\.assign\(\{\}, it, \{ transbordou: true \}\)/);
  assert.ok(!/fields\['transbordou'\]|'System\.Transbordou'/.test(fonteApp));
});

/* Na sprint corrente ninguém transbordou ainda: perguntar ali seria pagar duas
   consultas por sprint aberta pra receber lista vazia, sempre. */
test('só sprint encerrada é consultada', () => {
  const corpo = /async function buscarTransbordoDoBoard[\s\S]*?\n\}/.exec(fonteApp)[0];
  assert.match(corpo, /if \(Number\.isNaN\(fim\) \|\| fim > Date\.now\(\)\) return \[\];/);
  assert.match(corpo, /FIELDS_BOARD/, 'o cartão do board lê outros campos que o do Panorama');
});

/* Âmbar, a mesma cor do selo no Panorama: o mesmo fato não pode ter duas cores
   em duas telas. E não é vermelho — transbordo é decisão de planejamento, não
   defeito. */
test('o ponto da coluna tem cor própria, igual à do selo do Panorama', () => {
  assert.match(fonteApp, /if \(bucket === 'transbordo'\) return '#d97706';/);
  assert.match(fonteApp, /if \(nome === COLUNA_TRANSBORDO\) bucket = 'transbordo';/);
});

/* O cartão de quem saiu precisa dizer PRA ONDE: a coluna já informa que ele
   saiu, e o id sozinho não conta a história. */
test('o cartão de quem saiu mostra o destino', () => {
  assert.match(fonteApp, /const destino = it\.transbordou/);
  assert.match(fonteApp, /<span class="rot">Foi pra<\/span><span class="val">\$\{escapeHtml\(C\.iterationLabel\(f\['System\.IterationPath'\]\)\)\}/);
});

/* ---------- 4. o botão não aparece onde não faz sentido ---------- */
/* Pergunta do Urlan, dentro do board da Sprint 20: "pra que esse filtro se eu
   já estou dentro da sprint?". Resposta: não serve. O botão nasceu pro board do
   TIME — o que abre sem sprint na rota e mostra o quadro inteiro; ali ele é o
   atalho pra estreitar na corrente. Quando a rota nomeia a sprint, desligá-lo
   mostraria o backlog inteiro sob um cabeçalho que diz "Sprint 20". */
test('entrando por uma sprint, o botão de recorte some', () => {
  assert.match(fonteApp, /const sprintNaRota = !!boardState\.iteracaoId;/);
  assert.match(fonteApp, /filtro\.hidden = sprintNaRota \|\| !\(boardState\.sprint && boardState\.sprint\.path\);/);
});

/* Esconder o controle sem fixar o estado deixaria o recorte desligado e sem
   jeito de religar — board do time inteiro, com título de sprint, e nenhum
   botão na tela pra desfazer. */
test('com o botão escondido, o recorte fica ligado', () => {
  assert.match(fonteApp, /if \(sprintNaRota\) boardState\.soSprint = true;/);
  const ondeForca = fonteApp.indexOf('if (sprintNaRota) boardState.soSprint = true;');
  const ondeEsconde = fonteApp.indexOf('filtro.hidden = sprintNaRota');
  assert.ok(ondeForca < ondeEsconde, 'o estado precisa ser fixado antes de esconder o controle');
});

/* A frase de board vazio dizia "nada na sprint corrente" mesmo dentro da
   Sprint 19 — mesma mentira que o rótulo do botão tinha. */
test('a frase de vazio nomeia a sprint, não diz "corrente"', () => {
  assert.match(fonteApp, /'nada na ' \+ boardState\.sprint\.name/);
  assert.ok(!/nada na sprint corrente/.test(semComentarios(fonteApp)));
});

/* ---------- 4. o board da sprint encerrada mudava de forma ---------- */
/* Pedido do Urlan em 06/10/2026, olhando a Sprint 19: Feito e Transbordou
   sumiam quando vazias, a vizinha esticava e ocupava a tela.

   A primeira tentativa fixou TODAS as colunas oficiais e encheu o board de
   etapas que ele não usa — ele viu e cortou. O recorte é: duas colunas
   garantidas, só na sprint encerrada, e nada mais muda. */
test('as duas garantidas valem só na sprint encerrada', () => {
  assert.match(fonteApp, /const sprintEncerrada = boardState\.soSprint && boardState\.sprint\s*\n\s*&& C\.estadoDaSprint\(boardState\.sprint, Date\.now\(\)\) === 'fechada';/);
  assert.match(fonteApp, /const garantidas = new Set\(sprintEncerrada && colunaFinal \? \[colunaFinal\.name\] : \[\]\);/,
    'fora da sprint encerrada o conjunto tem que ser vazio — a corrente não muda');
});

/* Garantir as duas é o pedido; esvaziar o board das outras não. Item parado
   numa etapa do meio de uma sprint encerrada precisa continuar visível. */
test('as outras colunas seguem como sempre: sem item, não aparecem', () => {
  assert.match(fonteApp,
    /nomes = boardState\.columns\.map\(\(c\) => c\.name\)\.filter\(\(n\) => porColuna\.has\(n\) \|\| garantidas\.has\(n\)\);/);
});

/* Pelo TIPO, não pelo nome: quem renomear a coluna no DevOps não perde a
   garantia aqui, e o código não passa a depender da palavra "Feito". */
test('a coluna final é achada pelo tipo da coluna no DevOps', () => {
  assert.match(fonteApp, /\.find\(\(c\) => String\(c\.type \|\| ''\)\.toLowerCase\(\) === 'outgoing'\)/);
  assert.doesNotMatch(semComentarios(fonteApp), /garantidas = new Set\(\['Feito'\]/);
});

test('coluna sem item mostra aviso no lugar da lista, não uma lista vazia', () => {
  assert.match(fonteApp,
    /\$\{!lista\.length \? `<p class="coluna-vazia mudo">\$\{nome === COLUNA_TRANSBORDO \? 'nada transbordou' : 'nada nesta etapa'\}<\/p>` : `<ul>/,
    'o aviso e a lista precisam ser excludentes — senão as duas disputam a altura');
});

/* Numa sprint encerrada "nenhum item transbordou" é um resultado e merece a
   coluna. Na corrente ninguém transbordou ainda e nem se consultou
   (buscarTransbordoDoBoard sai cedo), então a coluna afirmaria ter medido o
   que não mediu. */
test('a coluna Transbordou vazia só aparece em sprint encerrada', () => {
  assert.match(fonteApp, /const sprintEncerrada = boardState\.soSprint && boardState\.sprint\s*\n\s*&& C\.estadoDaSprint\(boardState\.sprint, Date\.now\(\)\) === 'fechada';/);
  assert.match(fonteApp, /if \(porColuna\.has\(COLUNA_TRANSBORDO\) \|\| sprintEncerrada\) \{/);
  // A régua é a do core, a mesma que o relatório usa pra decidir o mesmo.
  const sp = { start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z' };
  assert.equal(C.estadoDaSprint(sp, Date.parse('2026-10-06T12:00:00Z')), 'fechada');
  assert.notEqual(C.estadoDaSprint({ start: '2026-09-28T00:00:00Z', finish: '2026-10-09T00:00:00Z' },
    Date.parse('2026-10-06T12:00:00Z')), 'fechada');
});

/* Board sem item NENHUM continua sendo uma frase: quando não há o que mostrar,
   o leitor precisa saber por quê — filtro, sprint vazia —, e isso não cabe
   numa coluna. Um esqueleto de colunas vazias não responde nada. */
test('board inteiro vazio é frase, não esqueleto de colunas', () => {
  assert.match(fonteApp, /if \(!items\.length \|\| !nomes\.length\) \{/);
});

/* O `.coluna-vazia` já existia em Meus itens e Produtos, encostado à esquerda.
   Centrar lá seria mudar duas telas que ninguém pediu — por isso a regra é
   presa ao board, o único quadro em que a coluna vazia fica ao lado de colunas
   cheias. */
test('o aviso centrado vale só no board', () => {
  const css = fs.readFileSync(path.join(raiz, 'assets', 'style.css'), 'utf8');
  const regra = /\.quadro-board \.coluna-vazia \{[^}]*\}/.exec(css);
  assert.ok(regra, 'a regra do aviso centrado sumiu');
  for (const prop of [/align-items:\s*center/, /justify-content:\s*center/, /flex:\s*1/]) {
    assert.match(regra[0], prop);
  }
  const solta = /(^|\n)\.coluna-vazia \{[^}]*\}/.exec(css);
  if (solta) assert.doesNotMatch(solta[0], /align-items:\s*center/, 'a centralização vazou pras outras telas');
});
