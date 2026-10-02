/* UM DESENHO SÓ para o roadmap, usado em duas telas.

   O Urlan pediu em 02/10/2026 que o Panorama da Central mostrasse o mesmo
   gráfico do relatório de Entregas. A saída fácil seria copiar a função e as
   regras de CSS — e a cópia sobrevive exatamente até o primeiro ajuste, quando
   uma tela muda e a outra não. Este projeto já pagou esse preço: o status
   'teste' entrou no roadmap.json, o desenho sabia desenhá-lo, e o item saía
   sem selo porque o saneamento o zerava no meio.

   O que estes testes guardam é a partilha em si: uma função, uma folha, e as
   duas páginas puxando as duas. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const R = require('../assets/roadmap-visao.js');
const C = require('../assets/core.js');

test('o módulo compartilhado desenha o roadmap de verdade', () => {
  const itens = C.saneRoadmapItens(JSON.parse(ler('assets/roadmap.json')).itens);
  const html = R.corpoRoadmap(itens, Date.parse('2026-10-02T12:00:00Z'));
  assert.equal((html.match(/rl-rm-item/g) || []).length, itens.length,
    'uma linha por projeto');
  assert.match(html, /rl-rm-hoje/, 'a marca do hoje é o que ancora a leitura da escala');
  assert.match(html, /rl-rm-escala/, 'sem régua de meses as barras não dizem quando');
});

test('existe UMA implementação do desenho, e o briefing usa ela', () => {
  assert.ok(!/function corpoRoadmap\(/.test(ler('assets/briefing-entregas.js')),
    'briefing-entregas.js voltou a ter a própria cópia: o desenho virou dois');
  assert.match(ler('assets/briefing-entregas.js'), /const corpoRoadmap = R\.corpoRoadmap;/,
    'o briefing precisa continuar delegando');
  assert.match(ler('assets/app.js'), /R\.corpoRoadmap\(/,
    'a Central precisa desenhar pelo módulo, não por marcação própria');
});

test('as duas páginas carregam o módulo e a folha compartilhados', () => {
  for (const pagina of ['entregas.html', 'central.html']) {
    const html = ler(pagina);
    assert.match(html, /assets\/roadmap-visao\.js/, `${pagina} não carrega o módulo do desenho`);
    assert.match(html, /assets\/roadmap\.css/, `${pagina} não carrega a folha do desenho`);
  }
});

/* O módulo é carregado por <script> comum, sem import: a ordem no HTML É a
   dependência. Com o briefing antes, root.CentralRoadmapVisao ainda é
   undefined quando ele roda, e a seção de roadmap some do relatório sem erro
   visível na tela. */
test('o entregas.html carrega o módulo ANTES do briefing que depende dele', () => {
  // Só as tags <script>: o comentário do arquivo cita os dois nomes em prosa, e
  // procurar pelo nome solto media a ordem do texto, não a do carregamento.
  const ordem = [...ler('entregas.html').matchAll(/<script src="assets\/([a-z-]+\.js)/g)]
    .map((m) => m[1]);
  assert.ok(ordem.indexOf('roadmap-visao.js') > -1 && ordem.indexOf('briefing-entregas.js') > -1,
    'os dois scripts precisam estar na página');
  assert.ok(ordem.indexOf('roadmap-visao.js') < ordem.indexOf('briefing-entregas.js'),
    'ordem invertida: o briefing não acharia o desenho e a seção sumiria calada');
});

/* A folha do componente precisa dos tokens de cor nas DUAS paletas. Faltando
   um, a regra cai pro valor inicial e o selo de "em teste" fica sem fundo numa
   tela e com fundo na outra — mesmo componente, duas caras. */
test('as duas folhas de página declaram os tokens que a do roadmap usa', () => {
  /* Nem toda custom property é token de paleta: o módulo escreve algumas inline
     na própria marcação (--x, a posição de cada divisor; --meses, o tamanho da
     régua). Essas a página não precisa declarar — e a lista das exceções sai do
     próprio arquivo do desenho, não de uma lista à mão que eu teria que lembrar
     de atualizar na próxima. */
  const inline = new Set([...ler('assets/roadmap-visao.js').matchAll(/(--[a-z-]+):/g)]
    .map((m) => m[1]));
  const usados = [...new Set((ler('assets/roadmap.css').match(/var\(--[a-z0-9-]+/g) || [])
    .map((v) => v.slice(4)))].filter((t) => !inline.has(t));
  assert.ok(usados.length > 3, 'a folha usa tokens de paleta — se a lista zerou, o filtro comeu demais');
  for (const folha of ['assets/style.css', 'assets/entregas.css']) {
    const css = ler(folha);
    for (const token of usados) {
      assert.match(css, new RegExp('\\' + token + '\\s*:'),
        `${folha} não declara ${token}, que assets/roadmap.css usa`);
    }
  }
});
