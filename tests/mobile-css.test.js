/* O QUE O TELEFONE PRECISA, e que some sem avisar.

   As três regras aqui não são gosto: cada uma nasceu de um defeito medido num
   viewport de 375px, e todas são invisíveis no desktop — que é exatamente o que
   as torna fáceis de apagar num ajuste futuro. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../assets/entregas.css'), 'utf8');
const telefone = /@media \(max-width: 719px\) \{[\s\S]*?\n\}/.exec(css);

test('telefone: a galeria tem duas colunas', () => {
  assert.ok(telefone, 'o bloco @media do telefone mudou de forma');
  assert.match(telefone[0], /\.rl-galeria \{[^}]*grid-template-columns:\s*repeat\(2/,
    'sem isto o auto-fill de 200px dá UMA coluna em 344px, e o cartão da HOME vira nove blocos empilhados');
});

test('telefone: a miniatura encurta junto, senão o recorte muda de assunto', () => {
  assert.match(telefone[0], /\.rl-fig-link img \{[^}]*height:\s*92px/,
    'em célula de 148px os 124px do desktop dão 1,19:1 — recorte que não mostra que componente é aquele');
});

/* A sombra some sozinha nas pontas porque as camadas brancas rolam com o
   conteúdo (`local`) e as escuras ficam presas ao quadro (`scroll`). Quem
   trocar o `background` por uma cor chapada apaga o aviso sem perceber: o
   gráfico continua rolando e as quatro últimas linhas voltam a parecer vazias. */
test('o gráfico do roadmap avisa que rola', () => {
  const regra = /\.rl-rm-wrap \{[^}]*\}/.exec(css);
  assert.ok(regra, '.rl-rm-wrap sumiu');
  assert.match(regra[0], /no-repeat local/, 'faltam as camadas que tapam a sombra nas pontas');
  assert.match(regra[0], /no-repeat scroll/, 'faltam as sombras presas ao quadro');
});
