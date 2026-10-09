/* A SPRINT INTEIRA, no diálogo do Panorama.

   O cartão de sprint mostra quatro linhas e conta o resto num "+N mais". O
   Urlan pediu em 08/10/2026 que esse resto desse pra ver sem sair da tela —
   "uma view rápida" —, mantendo o link que já leva ao board.

   O que estes testes guardam é o ARRANJO, que é onde esta feature pode estragar
   o que já existia:

   1. o link do cabeçalho do cartão continua indo pro board. Era o pedido
      explícito, e é a única rota pra trabalhar na sprint;
   2. a linha de um item é desenhada por UMA função só. Duas cópias da mesma
      linha divergem no primeiro ajuste de uma delas, e o diálogo passaria a
      mostrar uma sprint diferente da que o cartão mostra — o defeito mais caro
      que esta tela pode ter;
   3. o diálogo mora FORA do #panorama, que é reescrito inteiro a cada render;
   4. o que ele mostra é montado NO RENDER, do mesmo recorte do cartão, e é
      zerado a cada render.

   app.js é IIFE e mexe no DOM, então o teste lê o arquivo que o navegador serve
   e confere o trecho — mesma técnica do board-sprint.test.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
/* Comentário fora ANTES de qualquer doesNotMatch. Três vezes neste projeto um
   teste casou com a própria explicação que estava logo acima do código. */
const semComentarios = (txt) => String(txt).replace(/\/\*[\s\S]*?\*\//g, '');
const fonteApp = ler('assets/app.js');
const appSemComentarios = semComentarios(fonteApp);
const central = ler('central.html');
const centralSemComentarios = central.replace(/<!--[\s\S]*?-->/g, '');
const css = semComentarios(ler('assets/style.css'));

/* ---------- 1. o que o Urlan pediu pra NÃO perder ---------- */

test('o cabeçalho do cartão continua levando ao board da sprint', () => {
  assert.match(fonteApp, /class="sprint-card-link" href="\$\{rotaBoard\(pr, true, col\.sprint\.id\)\}"/);
});

test('o diálogo também leva ao board, e pro mesmo lugar', () => {
  // O href do diálogo sai do mesmo `rotaBoard` guardado no render — não de uma
  // segunda montagem de URL, que poderia apontar pra outra sprint.
  assert.match(fonteApp, /href: rotaBoard\(pr, true, col\.sprint\.id\)/);
  assert.match(fonteApp, /board\.href = dados\.href/);
});

/* ---------- 2. uma linha só, nos dois lugares ---------- */

test('a linha do item é desenhada por uma função só', () => {
  /* Dentro do renderPanorama, que é quem desenha cartão E diálogo. A tela de
     épico tem a sua (htmlEpicoItem), com outra forma de dado — ela não entra
     nesta conta, e nem por isso pode entrar no Panorama. */
  const i = appSemComentarios.indexOf('function renderPanorama');
  const fim = appSemComentarios.indexOf('\nfunction ', i + 10);
  const panorama = appSemComentarios.slice(i, fim);
  const vezes = (panorama.match(/class="item-linha" href=/g) || []).length;
  assert.equal(vezes, 1, 'a linha do item foi copiada: cartão e diálogo vão divergir');
  assert.match(fonteApp, /const linhaDeItem = \(it, link\) =>/);
});

test('cartão e diálogo chamam essa mesma função', () => {
  assert.match(fonteApp, /\.map\(\(it\) => linhaDeItem\(it, link\)\)\.join\(''\)\}\$\{mais\}/);
  assert.match(fonteApp, /linhas: doResponsavel\(emOrdem\)\.map\(\(it\) => linhaDeItem\(it, link\)\)\.join\(''\)/);
});

/* ---------- 3. o gatilho ---------- */

test('o "+N mais" é botão, e carrega qual coluna abrir', () => {
  assert.match(fonteApp, /<button type="button" class="sprint-pbis-mais" data-sprint="\$\{chave\}"/);
  // aria-haspopup diz ao leitor de tela que isto abre um diálogo, e não navega.
  assert.match(fonteApp, /aria-haspopup="dialog"/);
});

test('o botão só existe quando há item escondido', () => {
  // `resto > 0`: numa sprint de três itens não há "mais", e nada na tela pede
  // clique à toa. É o que faz do "+N mais" o gatilho certo.
  assert.match(fonteApp, /const resto = lista\.length - CAP_PBIS_SPRINT;/);
  assert.match(fonteApp, /const mais = resto > 0/);
});

test('o clique é delegado no #panorama, que é reescrito a cada render', () => {
  assert.match(fonteApp, /\$\('panorama'\)\.addEventListener\('click'/);
  assert.match(fonteApp, /closest\('\.sprint-pbis-mais'\)/);
});

/* ---------- 4. o diálogo ---------- */

test('o diálogo existe no HTML, com os campos que o app preenche', () => {
  assert.match(central, /<dialog id="sprint-tudo"/);
  for (const id of ['sprint-tudo-fase', 'sprint-tudo-nome', 'sprint-tudo-periodo',
    'sprint-tudo-corpo', 'sprint-tudo-board', 'sprint-tudo-fechar']) {
    assert.match(central, new RegExp('id="' + id + '"'), 'falta #' + id);
    assert.match(fonteApp, new RegExp("'" + id + "'"), 'o app não escreve em #' + id);
  }
});

test('o diálogo mora fora do #panorama', () => {
  /* Dentro dele, um diálogo aberto sumiria no meio da leitura: aquele nó é
     substituído inteiro a cada render, e o render roda sozinho na atualização
     automática. */
  const i = centralSemComentarios.indexOf('<div id="panorama">');
  const j = centralSemComentarios.indexOf('<dialog id="sprint-tudo"');
  assert.ok(i >= 0 && j > i, 'não achei os dois nós');
  const entre = centralSemComentarios.slice(i, j);
  assert.ok(entre.includes('</div>'), 'o diálogo parece estar DENTRO do #panorama');
});

test('é <dialog> nativo, e some em silêncio onde não houver', () => {
  assert.match(fonteApp, /d\.showModal\(\)/);
  // Sem showModal, o cartão continua como está e o clique não faz nada — um
  // botão que estoura seria pior que um botão que não responde.
  assert.match(fonteApp, /if \(!d \|\| !d\.showModal \|\| !dados\) return;/);
});

test('trocar de rota fecha o diálogo', () => {
  /* O link do board é um #hash desta mesma página — nada recarrega. Sem isto o
     diálogo ficava aberto POR CIMA do board que ele mandou abrir, que foi o
     que o Urlan viu em 08/10/2026. No hashchange, e não no clique do link,
     porque o Voltar do navegador tem o mesmo problema. */
  assert.match(fonteApp, /window\.addEventListener\('hashchange', \(\) => \{\s*const d = \$\('sprint-tudo'\);\s*if \(d && d\.open\) d\.close\(\);/);
});

test('as linhas dos itens abrem em outra aba, e não fecham o diálogo', () => {
  // Quem clica num item vai ao DevOps numa aba nova; voltar e continuar lendo a
  // lista de onde parou é o comportamento certo, então nada fecha aqui.
  assert.match(fonteApp, /class="item-linha" href="\$\{link\.workItem\(it\.id\)\}" target="_blank"/);
});

test('Esc e clique no fundo fecham', () => {
  // Esc é do <dialog> nativo; o fundo precisa da leitura do alvo.
  assert.match(fonteApp, /if \(ev\.target === ev\.currentTarget\) ev\.currentTarget\.close\(\);/);
  assert.match(fonteApp, /\$\('sprint-tudo-fechar'\)\.addEventListener\('click'/);
});

/* ---------- 5. cartão e diálogo não podem discordar ---------- */

test('o conteúdo do diálogo é montado no render, do mesmo recorte do cartão', () => {
  // `doResponsavel(emOrdem)`: o MESMO filtro por responsável e a MESMA ordem
  // (em aberto primeiro, transbordados no fim) que o cartão usou.
  assert.match(fonteApp, /sprintInteira\[chave\] = \{/);
  assert.match(fonteApp, /linhas: doResponsavel\(emOrdem\)/);
});

test('o mapa é zerado a cada render', () => {
  /* Time que tira a sprint seguinte do DevOps deixa de ter a coluna; sem a
     limpeza, o "+N mais" de uma coluna que não existe mais continuaria abrindo
     a lista velha. */
  assert.match(fonteApp, /for \(const k2 of Object\.keys\(sprintInteira\)\) delete sprintInteira\[k2\];/);
});

test('o diálogo não pede nada novo ao DevOps', () => {
  /* A lista completa da sprint já está no cache que desenhou o cartão
     (`itens: resumoDeSprint(itens)`). Se um dia a abertura passar a buscar, é
     aqui que estoura: uma vista rápida que espera rede não é rápida. */
  const corpo = fonteApp.slice(fonteApp.indexOf('function abrirSprintInteira'),
    fonteApp.indexOf('function renderPanorama'));
  assert.doesNotMatch(semComentarios(corpo), /await|fetch\(|A\.\w+\(ctx\(\)/);
});

/* ---------- 6. o visual ---------- */

test('o "+N mais" continua discreto, e parece clicável', () => {
  assert.match(css, /\.sprint-pbis-mais \{[^}]*cursor: pointer/);
  assert.match(css, /\.sprint-pbis-mais \{[^}]*color: var\(--mudo\)/);
});

test('no diálogo o título cabe inteiro — é o ganho dele sobre o cartão', () => {
  /* No cartão o título trunca porque a coluna é estreita (.lista-linhas .titulo
     é nowrap + ellipsis). Aqui ele quebra.

     `display: block` entrou junto em 09/10/2026, quando a linha da descrição
     passou a morar dentro desta coluna: são dois textos empilhados, cada um com
     o seu corte. Os dois na MESMA regra porque duas definições do mesmo seletor
     fora de media query é o defeito que já apareceu três vezes neste projeto —
     a de baixo sobrescreve parte da de cima, calada. */
  assert.match(css, /\.sprint-tudo-corpo \.item-linha \.titulo \{ display: block; white-space: normal; \}/);
});

test('no telefone a linha empilha em vez de espremer o título', () => {
  const mq = css.slice(css.indexOf('@media (max-width: 560px)'));
  assert.match(mq, /\.sprint-tudo-corpo \.item-linha \{ flex-wrap: wrap/);
  assert.match(mq, /\.sprint-tudo-corpo \.item-linha \.titulo \{ flex-basis: 100%; order: -1; \}/);
});

test('a lista rola dentro do diálogo, não a página', () => {
  // Numa sprint de 60 itens o nome dela e o link do board têm que continuar à
  // vista enquanto se rola a lista.
  assert.match(css, /\.sprint-tudo-corpo \{[^}]*overflow: auto/);
  assert.match(css, /\.sprint-tudo-corpo \{[^}]*max-height: 60vh/);
});
