/* QUEM APARECE no filtro de responsável da Central.

   O seletor nascia da lista inteira de quem tem item atribuído no DevOps. O
   pedido do Urlan (02/10/2026) é que só as três POs — Urlan, Isadora e
   Daniele — possam ser escolhidas.

   O que vale teste aqui não é a lista (três nomes, dá pra ler) e sim o
   CASAMENTO: ele é por primeiro nome, sem acento e sem caixa, porque o nome de
   exibição do DevOps muda sozinho — sobrenome que entra, nome social, grafia
   diferente entre contas. Se o casamento apertar, a PO some do seletor sem
   nenhum erro na tela, e ninguém descobre olhando.

   app.js é IIFE e mexe no DOM, então não dá pra `require`: lê-se o arquivo que
   vai ser servido e exercita-se o trecho extraído dele — o mesmo código que o
   navegador roda. Mesma técnica do ferramentas-producao.test.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const fonteApp = fs.readFileSync(path.join(raiz, 'assets', 'app.js'), 'utf8');

function regra() {
  const m = /const POS = \[[\s\S]*?const ehPO = [\s\S]*?;\n/.exec(fonteApp);
  assert.ok(m, 'o recorte das POs mudou de forma — este teste precisa acompanhar');
  // eslint-disable-next-line no-eval
  return eval(`(function () { ${m[0]} return { POS, ehPO }; })()`);
}

test('as três POs passam, com ou sem sobrenome', () => {
  const { ehPO } = regra();
  for (const n of ['Urlan', 'Urlan Dipre', 'Isadora', 'Daniele', 'Tazshida', 'Tazshida Fulana', 'Carla', 'Carla Souza']) {
    assert.equal(ehPO(n), true, `${n} é PO e precisa aparecer no seletor`);
  }
});

test('sobrenome novo não derruba ninguém do seletor', () => {
  const { ehPO } = regra();
  // O caso que motivou casar por primeiro nome: o DevOps troca o displayName
  // sozinho e a pessoa sumiria do filtro sem erro nenhum na tela.
  assert.equal(ehPO('Isadora Macedo da Silva'), true);
  assert.equal(ehPO('Daniele Souza'), true);
});

test('acento e caixa não separam a mesma pessoa', () => {
  const { ehPO } = regra();
  assert.equal(ehPO('DANIELE SOUZA'), true);
  assert.equal(ehPO('daniéle souza'), true);
  assert.equal(ehPO('  Urlan   Dipre  '), true, 'espaço sobrando no displayName');
});

test('quem não é PO fica de fora — é o pedido inteiro', () => {
  const { ehPO } = regra();
  for (const n of ['Carlos Silva', 'Ana', 'Daniel Alves', '', null, undefined]) {
    assert.equal(ehPO(n), false, `${n} não é PO e não pode aparecer`);
  }
});

/* "Daniel" não é "Daniele". O casamento é por nome inteiro depois de
   normalizar, nunca por prefixo — se fosse prefixo, qualquer Daniel, Daniela
   ou Danielle entraria junto, e aí o recorte perderia o sentido. */
test('o casamento é do primeiro nome inteiro, não de prefixo', () => {
  const { ehPO } = regra();
  assert.equal(ehPO('Daniel'), false);
  assert.equal(ehPO('Urla'), false);
  assert.equal(ehPO('Isa'), false);
  // Carla não puxa Carlos, e o apelido "Taz" não puxa Tazshida: nome inteiro.
  assert.equal(ehPO('Carlos Silva'), false);
  assert.equal(ehPO('Taz'), false);
});

test('a lista declarada é exatamente a que o Urlan pediu', () => {
  const { POS } = regra();
  // Tazshida e Carla entraram em 15/10/2026, a pedido dele.
  assert.deepEqual(POS, ['Urlan', 'Isadora', 'Daniele', 'Tazshida', 'Carla']);
});

/* A barra some quando não sobra ninguém pra escolher. Antes a checagem era
   "tem item em cache?", que respondia por outra pergunta: com o recorte, pode
   haver centenas de itens e nenhuma PO entre os responsáveis — e a barra
   ficaria no topo oferecendo só "todos os responsáveis", que é o estado em que
   ela já está. */
test('sem nenhuma PO na lista, a barra de filtro sai do topo', () => {
  assert.match(fonteApp, /if \(!nomes\.size\) \{ barra\.hidden = true; return; \}/,
    'a saída antecipada pela lista vazia é o que tira a barra inútil da tela');
  const corpo = /function renderFiltroGlobal\(\)[\s\S]*?\n\}/.exec(fonteApp)[0];
  assert.ok(!/if \(!todos\.length && !respAtivo\(\)\)/.test(corpo),
    'a checagem velha olhava os itens em cache, que não dizem mais se sobrou opção');
});

test('a seleção salva sobrevive mesmo fora da lista de POs', () => {
  const corpo = /function renderFiltroGlobal\(\)[\s\S]*?\n\}/.exec(fonteApp)[0];
  assert.match(corpo, /if \(respAtivo\(\)\) nomes\.add\(respAtivo\(\)\);/,
    'esconder o nome escolhido faria o seletor dizer "todos" enquanto filtra por alguém');
});

/* O pedido foi na Central ("na home"). O report tem seletor próprio, montado
   em report.js, e o Urlan pediu pra não mexer nos reports. */
test('o report não foi arrastado junto: o recorte é só da Central', () => {
  const fonteReport = fs.readFileSync(path.join(raiz, 'assets', 'report.js'), 'utf8');
  assert.ok(!/const POS = \[/.test(fonteReport),
    'report.js ganhou o recorte das POs sem ter sido pedido');
});

/* O item "Status de demandas" do menu muda por PO (15/10/2026): some pra
   Tazshida e vira o atalho da versão escura das entregas pra Carla. Só o menu:
   as páginas continuam abrindo por endereço. Manda o seletor, senão o token. */
test('o menu muda por PO: Status some pra Tazshida e vira atalho pra Carla', () => {
  const src = fonteApp;
  assert.match(src, /tazshida: null,/);
  assert.match(src, /href: 'entregas-carla-status\.html',/);
  assert.match(src, /C\.chaveDePessoa\(respAtivo\(\) \|\| \(state\.cache && state\.cache\.usuario\) \|\| ''\)/);
  assert.match(src, /function renderAll\(\) \{ renderBadge\(\); renderMenuPorPO\(\);/);
  // __proto__ e afins não viram regra: só chave própria.
  assert.match(src, /Object\.prototype\.hasOwnProperty\.call\(MENU_STATUS_POR_PO, quem\)/);
  // O destino da Carla existe no projeto.
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'entregas-carla-status.html')));
});

/* O topo de cada tela (16/10/2026). O hash do menu (`#panorama`) é o id do bloco
   de conteúdo, logo abaixo do título: o navegador rolava até ele e o título da
   seção ficava escondido. A margem de rolagem de uma tela inteira trava a
   âncora em zero — sem script, e valendo também pra rolagem tardia. */
test('toda âncora do menu leva ao topo da tela, não ao bloco de conteúdo', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'style.css'), 'utf8');
  const m = /(#panorama[^{]*)\{\s*scroll-margin-top:\s*100vh;\s*\}/.exec(css);
  assert.ok(m, 'a margem de rolagem das âncoras do menu sumiu');
  const html = fs.readFileSync(path.join(__dirname, '..', 'central.html'), 'utf8');
  // Todo hash do menu que também é id de um bloco precisa estar na regra.
  for (const [, alvo] of html.matchAll(/<a id="nav-[a-z-]+" href="#([a-z-]+)"/g)) {
    if (html.includes(`id="${alvo}"`)) assert.ok(m[1].includes('#' + alvo), `#${alvo} é âncora de um bloco e ficou fora da regra`);
  }
});
