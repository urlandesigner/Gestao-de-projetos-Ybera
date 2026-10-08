/* NAVEGAR ENTRE SPRINTS dentro do board de uma sprint. Pedido do Urlan em
   08/10/2026: estando na Sprint 19, ir pra 18 e pra 20 sem voltar ao Panorama.

   Duas metades, e a parte que pode dar errado em silêncio é a primeira:

   1. QUAL é a vizinha. "A de antes na lista" não serve — a lista que o DevOps
      devolve não promete ordem, e uma sprint sem data não tem lugar numa linha
      do tempo. Isso é conta pura, mora no core e é testado com dados;
   2. QUANDO o par aparece, e o que o clique faz. Isso é DOM e vive no app.js,
      que é IIFE — o teste lê o arquivo que o navegador serve, como o
      board-sprint.test.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const semComentarios = (txt) => String(txt).replace(/\/\*[\s\S]*?\*\//g, '');
const fonteApp = ler('assets/app.js');
const central = ler('central.html');
const centralSemComentarios = central.replace(/<!--[\s\S]*?-->/g, '');
const css = semComentarios(ler('assets/style.css'));

/* ---------- 1. qual é a vizinha ---------- */

// De propósito FORA de ordem: é o caso real, e o que a função tem que corrigir.
const ITS = [
  { id: 3, name: 'Sprint 20', start: '2026-09-28T00:00:00Z', finish: '2026-10-09T00:00:00Z' },
  { id: 1, name: 'Sprint 18', start: '2026-08-31T00:00:00Z', finish: '2026-09-11T00:00:00Z' },
  { id: 2, name: 'Sprint 19', start: '2026-09-14T00:00:00Z', finish: '2026-09-25T00:00:00Z' },
];
const nomes = (v) => [v.anterior && v.anterior.name, v.proxima && v.proxima.name];

test('a vizinha é a do calendário, não a de antes na lista', () => {
  assert.deepEqual(nomes(C.vizinhasDaSprint(ITS, 2)), ['Sprint 18', 'Sprint 20']);
});

test('nas pontas da linha, uma das duas não existe', () => {
  assert.deepEqual(nomes(C.vizinhasDaSprint(ITS, 1)), [null, 'Sprint 19']);
  assert.deepEqual(nomes(C.vizinhasDaSprint(ITS, 3)), ['Sprint 19', null]);
});

test('sprint sem as duas datas fica fora da linha do tempo', () => {
  /* Adivinhar um lugar pra ela faria o "anterior" apontar pra algo que o time
     não reconhece. Ela não aparece como vizinha de ninguém... */
  const comTorta = ITS.concat([{ id: 9, name: 'Sem data' }, { id: 8, name: 'Só início', start: '2026-10-12T00:00:00Z' }]);
  assert.deepEqual(nomes(C.vizinhasDaSprint(comTorta, 3)), ['Sprint 19', null]);
  // ...e, estando nela, a navegação some em vez de oferecer um salto arbitrário.
  assert.deepEqual(nomes(C.vizinhasDaSprint(comTorta, 9)), [null, null]);
});

test('id desconhecido, nulo ou vazio não inventa vizinha', () => {
  for (const id of [77, null, undefined, '']) {
    assert.deepEqual(nomes(C.vizinhasDaSprint(ITS, id)), [null, null], 'id=' + String(id));
  }
});

test('o id casa como texto ou como número', () => {
  // O dataset do botão devolve string; o DevOps manda número.
  assert.deepEqual(nomes(C.vizinhasDaSprint(ITS, '2')), nomes(C.vizinhasDaSprint(ITS, 2)));
});

test('casa por id, nunca por nome', () => {
  // Dois times podem ter "Sprint 20", e o nome é editável no DevOps.
  const doisIguais = [
    { id: 10, name: 'Sprint 20', start: '2026-01-05T00:00:00Z', finish: '2026-01-16T00:00:00Z' },
    { id: 11, name: 'Sprint 20', start: '2026-02-02T00:00:00Z', finish: '2026-02-13T00:00:00Z' },
    { id: 12, name: 'Sprint 21', start: '2026-03-02T00:00:00Z', finish: '2026-03-13T00:00:00Z' },
  ];
  assert.equal(C.vizinhasDaSprint(doisIguais, 11).anterior.id, 10);
  assert.equal(C.vizinhasDaSprint(doisIguais, 11).proxima.id, 12);
});

test('lista vazia, nula ou com lixo não quebra', () => {
  for (const l of [[], null, undefined, 'nada', [null, {}, { id: 1 }]]) {
    assert.deepEqual(nomes(C.vizinhasDaSprint(l, 1)), [null, null], JSON.stringify(l));
  }
});

test('é a mesma régua do janelaDeSprints', () => {
  /* As duas ordenam por início e descartam iteração sem as duas datas. Se uma
     mudar de critério sem a outra, o Panorama e o board passam a discordar
     sobre o que é "a sprint anterior" — e é o Panorama que leva ao board. */
  const agora = Date.parse('2026-09-30T12:00:00Z');
  const j = C.janelaDeSprints(ITS, agora);
  assert.equal(j.atual.name, 'Sprint 20');
  assert.equal(j.anterior.name, 'Sprint 19');
  assert.equal(C.vizinhasDaSprint(ITS, j.atual.id).anterior.name, j.anterior.name);
});

/* ---------- 2. quando o par aparece ---------- */

test('o par vive no grupo da direita, e é o primeiro dele', () => {
  /* Mesma linha do "Abrir no DevOps" (pedido do Urlan em 08/10/2026), e antes
     dele: a nav diz pra onde IR, as outras duas são o que fazer com a sprint
     que já está na tela. */
  const abre = centralSemComentarios.indexOf('class="board-acoes"');
  const fecha = centralSemComentarios.indexOf('</header>', abre);
  const grupo = centralSemComentarios.slice(abre, fecha);
  assert.ok(grupo.includes('id="board-sprint-nav"'), 'a nav de sprint saiu do grupo de ações');
  assert.ok(grupo.indexOf('id="board-sprint-nav"') < grupo.indexOf('id="board-devops"'),
    'a nav tem que vir antes do "Abrir no DevOps"');
  for (const id of ['board-sprint-nav', 'board-sprint-ant', 'board-sprint-prox']) {
    assert.match(central, new RegExp('id="' + id + '"'), 'falta #' + id);
    assert.match(fonteApp, new RegExp("'" + id + "'"), 'o app não usa #' + id);
  }
});

test('só aparece no board DE UMA SPRINT', () => {
  /* No board do time não existe "anterior": ele não está em sprint nenhuma, e
     um par de setas ali prometeria uma linha do tempo que a tela não percorre. */
  assert.match(fonteApp, /renderNavSprint\(p, sprintNaRota\)/);
  assert.match(fonteApp, /const viz = sprintNaRota\s*\?\s*C\.vizinhasDaSprint\(boardState\.iteracoes, boardState\.iteracaoId\)\s*:\s*\{ anterior: null, proxima: null \}/);
});

test('ponta da linha some, em vez de ficar desabilitada', () => {
  // Botão apagado que não responde faz clicar pra descobrir que não dá.
  assert.match(fonteApp, /b\.hidden = !sp;/);
  assert.match(fonteApp, /nav\.hidden = !\(viz\.anterior \|\| viz\.proxima\);/);
  assert.doesNotMatch(semComentarios(fonteApp), /board-sprint-(ant|prox)[\s\S]{0,200}?disabled/);
});

test('o botão nomeia a sprint de destino', () => {
  // "← Sprint 18" responde pra onde o clique leva ANTES do clique; "anterior"
  // sozinho obrigaria a clicar pra descobrir.
  assert.match(fonteApp, /b\.textContent = seta === '←' \? seta \+ ' ' \+ sp\.name : sp\.name \+ ' ' \+ seta;/);
});

/* ---------- 3. o que o clique faz ---------- */

test('navegar é trocar a rota, não mexer no estado por baixo', () => {
  /* Assim o endereço nomeia a sprint aberta, o Voltar do navegador desfaz o
     salto e um F5 cai na mesma sprint. */
  assert.match(fonteApp, /location\.hash = rotaBoard\(boardState\.p, true, b\.dataset\.iteracao\);/);
});

test('o ouvinte é delegado na nav, que o render reescreve', () => {
  assert.match(fonteApp, /\$\('board-sprint-nav'\)\.addEventListener\('click'/);
  assert.match(fonteApp, /closest\('button\[data-iteracao\]'\)/);
});

test('trocar de sprint força a recarga do board', () => {
  /* A chave do cache é o TIME. Sem isto, ir da 19 pra 18 mostraria os itens da
     19 filtrados pela 18 — quadro vazio, sem erro nenhum na tela. Já existia
     por causa das três colunas do Panorama; este teste é o que impede que a
     navegação nova o perca. */
  assert.match(fonteApp, /const trocou = \(boardState\.iteracaoId \|\| null\) !== \(iteracaoId \|\| null\);/);
  assert.match(fonteApp, /carregarBoard\(p, trocou\);/);
});

/* ---------- 4. o custo ---------- */

test('a navegação não custa nenhuma consulta nova', () => {
  /* A lista de iterações do time JÁ era buscada pra achar a sprint pedida na
     rota — o que faltava era não jogá-la fora depois. Se um dia aparecer um
     teamIterations em outro lugar por causa disto, é aqui que estoura. */
  const limpo = semComentarios(fonteApp);
  // Dentro do caminho do BOARD. O Panorama tem a chamada dele, pras três
  // colunas — é outra tela, e não entra nesta conta.
  const i = limpo.indexOf('async function resolverSprintDoBoard');
  const board = limpo.slice(i, limpo.indexOf('\nasync function carregarBoard'));
  const vezes = (board.match(/A\.teamIterations\(/g) || []).length;
  assert.equal(vezes, 1, 'alguém passou a buscar as iterações uma segunda vez');
  assert.match(fonteApp, /boardState\.iteracoes = todas;/);
  // E desenhar o par não fala com o DevOps: ele lê o que já está no estado.
  const j = limpo.indexOf('function renderNavSprint');
  const desenho = limpo.slice(j, limpo.indexOf('\nfunction renderBoard'));
  assert.doesNotMatch(desenho, /await|A\.\w+\(ctx\(\)/);
});

test('a lista é zerada junto com o resto do board', () => {
  // Ela é do TIME: trocar de time sem limpar deixaria o "anterior" apontando
  // pra uma sprint de outro quadro.
  const i = fonteApp.indexOf('async function carregarBoard');
  const trecho = fonteApp.slice(i, i + 1200);
  assert.match(trecho, /boardState\.iteracoes = \[\];/);
});

/* ---------- 5. o visual ---------- */

test('a nav pesa menos que as ações do cabeçalho', () => {
  /* Duas setas nomeadas competindo em peso com "Abrir no DevOps" dariam três
     botões de igual importância num cabeçalho que já tem o de voltar. */
  const bloco = css.slice(css.indexOf('.board-sprint-nav button {'));
  assert.match(bloco, /background: none/);
  assert.match(bloco, /color: var\(--mudo\)/);
});

test('tem foco visível pelo teclado', () => {
  assert.match(css, /\.board-sprint-nav button:focus-visible \{ outline: 2px solid var\(--tinta\)/);
});

test('no telefone a nav vai pra sua própria linha', () => {
  const mq = css.slice(css.indexOf('@media (max-width: 640px)'));
  assert.match(mq, /\.board-sprint-nav \{[^}]*flex-basis: 100%/);
});

/* ---------- 6. um ↻ só ---------- */
/* O board tinha um ↻ próprio, ao lado do "Abrir no DevOps", e o topo da página
   tem o dele. Dois botões idênticos no mesmo canto, e só um recarregava o
   quadro — o Urlan perguntou, em 08/10/2026, se os dois eram necessários.

   Não eram: o padrão de "o botão do topo faz o extra da página aberta" já
   existia pra tela de Produtos. O board entrou nele. */

test('o board não tem ↻ próprio', () => {
  assert.doesNotMatch(centralSemComentarios, /id="board-atualizar"/);
  assert.doesNotMatch(semComentarios(fonteApp), /board-atualizar/);
});

test('o ↻ do topo recarrega o board quando ele está aberto', () => {
  /* Sem isto o botão giraria, o selo diria "atualizado agora" e o quadro na
     frente continuaria com o dado velho: o refreshAll busca os cartões, o
     Panorama e os Meus Itens, mas não a consulta por sprint do board. */
  assert.match(fonteApp, /if \(pagina === 'board' && boardState\.p\) carregarBoard\(boardState\.p, true\);/);
  // E não desfaz o que Produtos já tinha.
  assert.match(fonteApp, /if \(pagina === 'produtos'\) carregarBase\(true\);/);
});
