/* GEOMETRIA DA CAPA, no CSS.

   A briefing-entregas.test.js diz, no alto, que forma se testa olhando — e é
   verdade pra cor, régua e tipografia. Estas duas regras não são forma: são
   uma armadilha que já disparou. O bloco escuro tinha DOIS filhos e usava
   `justify-content: space-between` pra empurrar o número pro pé; ao ganhar a
   linha de apoio virou TRÊS, e a sobra passou a ser distribuída também entre
   rótulo e apoio — afastando-os por um tanto que dependia da altura do bloco.
   Somado a um `gap` próprio maior que o dos outros blocos, a mesma dupla
   rótulo+apoio saía com distâncias diferentes nos dois cartões da capa.

   Quem descer o número agora é o `margin-top: auto` da base, que não depende
   de quantos irmãos existem. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../assets/entregas.css'), 'utf8');
const regraHeroi = /\.rl-heroi \{[^}]*\}/.exec(css);

test('capa: o bloco escuro não distribui sobra entre os filhos', () => {
  assert.ok(regraHeroi, '.rl-heroi sumiu — este teste precisa acompanhar');
  assert.doesNotMatch(regraHeroi[0], /space-between/,
    'com três filhos, space-between afasta o apoio do rótulo de um jeito que varia com a altura');
});

test('capa: o bloco escuro usa o mesmo gap dos outros blocos', () => {
  assert.doesNotMatch(regraHeroi[0], /\bgap\s*:/,
    'gap próprio no .rl-heroi dá distâncias diferentes entre rótulo e apoio nos dois cartões');
});

test('capa: o número desce por margin-top auto, e não pelo justify-content', () => {
  assert.match(css, /\.rl-heroi-base \{[^}]*margin-top:\s*auto/,
    'sem o auto na base, o número volta a depender do justify-content e sobe');
});
