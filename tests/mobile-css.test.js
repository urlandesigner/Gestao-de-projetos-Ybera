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

/* O REFINO DA CAPA É SÓ DO TELEFONE. Eu já apliquei essas regras nos dois
   tamanhos uma vez e mudei o desktop sem o Urlan pedir — o desktop é o
   documento que ele apresenta, e não estava em questão. Fora do @media, cada
   uma dessas regras é uma mudança de desktop disfarçada de ajuste de telefone. */
const foraDoMedia = css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');

test('capa centrada, título corrido e apoio escondido só valem no telefone', () => {
  const soNoTelefone = [
    [/\.rl-capa \{[^}]*text-align:\s*center/, 'a capa centrada'],
    [/\.rl-titulo span \{[^}]*display:\s*inline/, 'o título numa frase só'],
    [/\.rl-tile-apoio \{[^}]*display:\s*none/, 'o apoio escondido'],
    [/\.rl-capa-topo \{[^}]*justify-content:\s*center/, 'a marca centrada'],
  ];
  for (const [re, oque] of soNoTelefone) {
    assert.match(telefone[0], re, `${oque} não está no @media do telefone`);
    assert.doesNotMatch(foraDoMedia, re, `${oque} vazou pro desktop`);
  }
});

/* A autoria é escrita duas vezes no HTML e cada tamanho mostra uma. Se as duas
   aparecerem, o leitor vê o mesmo dado repetido; se nenhuma, ele some. */
test('a autoria aparece uma vez em cada tamanho, nunca duas nem nenhuma', () => {
  assert.match(foraDoMedia, /\.rl-capa-autoria \{[^}]*display:\s*none/,
    'no desktop a autoria da retranca tem de estar escondida — lá ela é a linha .rl-meta');
  assert.match(telefone[0], /\.rl-capa-autoria \{[^}]*display:\s*inline/,
    'no telefone a autoria vive na retranca');
  assert.match(telefone[0], /\.rl-meta \{[^}]*display:\s*none/,
    'no telefone a linha própria sai, senão a autoria aparece duas vezes');
});

test('os dois blocos da capa dividem a linha no telefone', () => {
  assert.match(telefone[0], /\.rl-bento-capa > \.rl-tile, \.rl-bento-capa > \.rl-heroi \{[^}]*grid-column:\s*span 6/,
    'sem isto a âncora escura volta a ocupar a largura inteira sozinha');
  /* Foi assim que a regra falhou da primeira vez: uma cópia de
     `.rl-bento-capa > .rl-heroi { grid-column: span 12 }` esquecida MAIS ABAIXO
     no mesmo @media vencia por ordem, e os blocos continuavam empilhados. */
  assert.equal((telefone[0].match(/\n\s*\.rl-bento-capa > \.rl-heroi \{/g) || []).length, 0,
    'sobrou uma regra solta pro .rl-heroi no @media — ela vence por ordem e desempilha nada');
});

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
