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
  assert.match(fonteApp, /if \(boardState\.soSprint && boardState\.sprint\) base = base\.filter\(\(it\) => C\.inSprint\(it, boardState\.sprint\.path\)\);/);
  assert.equal(C.inSprint(mk(1, 'Bug', S19), S19), true);
  assert.equal(C.inSprint(mk(1, 'Bug', S20), S19), false);
});
