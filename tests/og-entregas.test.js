/* PREVIEW DE COMPARTILHAMENTO do entregas.html.

   O que estes testes protegem não é desenho — é uma promessa que ninguém vê
   quebrar. As tags Open Graph são lidas por um robô do WhatsApp ou do Slack,
   uma vez, longe daqui. Se a imagem não existir, se o endereço for relativo ou
   se a dimensão declarada não bater com o arquivo, o link simplesmente volta a
   chegar como URL crua — sem erro no console, sem teste de tela vermelho, sem
   ninguém sabendo até alguém colar o link num grupo.

   O ponto sutil: o robô NÃO roda JavaScript e NÃO recebe o `#r=...` (fragmento
   não sai do navegador). Ele vê a página vazia. Então título, descrição e
   imagem do preview são escritos à mão no HTML, e o único jeito de eles não
   mentirem é manter os três coerentes entre si — que é o que se testa aqui. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'entregas.html'), 'utf8');

const meta = (chave) => {
  const re = new RegExp(`<meta (?:property|name)="${chave}" content="([^"]*)">`);
  const m = re.exec(html);
  return m ? m[1] : null;
};

const BASE = 'https://nivello-sistemas.github.io/ideias-e-inovacao/Central%20de%20Projetos/';

test('preview: o cartão existe no disco, em 1200x630', () => {
  const png = path.join(raiz, 'assets/og-entregas.png');
  assert.ok(fs.existsSync(png), 'assets/og-entregas.png sumiu — rode ./scripts/og-entregas.sh');

  // Dimensão lida do cabeçalho IHDR do PNG, que começa no byte 16.
  const cab = Buffer.alloc(24);
  const fd = fs.openSync(png, 'r');
  fs.readSync(fd, cab, 0, 24, 0);
  fs.closeSync(fd);
  const largura = cab.readUInt32BE(16);
  const altura = cab.readUInt32BE(20);

  assert.equal(largura, 1200, 'largura fora do 1.91:1 que WhatsApp e Slack recortam');
  assert.equal(altura, 630, 'altura fora do 1.91:1 que WhatsApp e Slack recortam');
  assert.equal(String(largura), meta('og:image:width'), 'a largura declarada não bate com o arquivo');
  assert.equal(String(altura), meta('og:image:height'), 'a altura declarada não bate com o arquivo');
});

test('preview: a imagem é apontada por endereço absoluto de produção', () => {
  const src = meta('og:image');
  assert.ok(src, 'og:image sumiu — sem ela o link chega sem cartaz');
  // Relativo é o erro clássico: funciona no navegador e nunca no robô, que
  // resolve a URL fora do contexto da página.
  assert.ok(src.startsWith('https://'), `og:image precisa ser absoluto, veio "${src}"`);
  assert.ok(src.startsWith(BASE + 'assets/'), `og:image fora do endereço de produção: "${src}"`);

  const arquivo = src.slice((BASE).length).split('?')[0];
  assert.ok(fs.existsSync(path.join(raiz, arquivo)), `og:image aponta pra ${arquivo}, que não existe`);
});

test('preview: a imagem sobe de versão junto com o resto', () => {
  // Os robôs guardam o preview por URL e não voltam pra conferir. Se a imagem
  // ficar num endereço fixo, quem já viu o cartaz antigo continua vendo ele.
  // O ?v= é o que faz o cartaz novo chegar — e ele tem que ser O MESMO token
  // dos outros arquivos, senão o ./scripts/versionar.sh, que troca um token
  // por outro, passa batido por esta linha.
  const token = /og-entregas\.png\?v=(\d{10})/.exec(meta('og:image'));
  assert.ok(token, 'og:image sem ?v= — o preview antigo vai ficar preso no cache dos apps');

  const tokens = [...new Set([...html.matchAll(/v=(\d{10})/g)].map((m) => m[1]))];
  assert.deepEqual(tokens, [token[1]],
    `entregas.html tem tokens divergentes (${tokens.join(', ')}) — o versionar.sh só reescreve um`);
});

test('preview: o cartaz conta a mesma história da capa', () => {
  // Título e descrição do preview são escritos à mão, e a tentação é deixá-los
  // genéricos pra nunca envelhecerem. Genérico não convida ninguém a abrir: o
  // que faz alguém clicar é o período, que é a manchete do documento.
  const titulo = meta('og:title');
  assert.ok(/\bde \d{4}$/.test(titulo), `og:title devia terminar no período, veio "${titulo}"`);
  assert.ok(titulo.startsWith('Entregas de '), `og:title devia abrir como a capa, veio "${titulo}"`);

  // A descrição do preview é a mesma linha de situação da capa — são a mesma
  // frase para o mesmo leitor, e duas versões dela divergem na primeira edição.
  const situacao = fs.readFileSync(path.join(raiz, 'assets/briefing-entregas.js'), 'utf8');
  const desc = meta('og:description');
  assert.ok(situacao.includes(desc), 'og:description não é a linha de situação da capa');
  assert.equal(desc, meta('description'), 'a descrição do preview e a da página divergiram');

  // O alt descreve a imagem pra quem usa leitor de tela no card, então ele
  // carrega os números — e números que não batem com o título são ruído.
  const alt = meta('og:image:alt');
  assert.ok(alt.includes(titulo.replace('Entregas de ', '')), 'og:image:alt não cita o período do título');
});

test('preview: o cartão grande, não a miniatura quadrada', () => {
  assert.equal(meta('twitter:card'), 'summary_large_image',
    'sem summary_large_image o X/LinkedIn mostram um selo pequeno em vez do cartaz');
});

test('preview: o molde do cartão não vai pro ar', () => {
  // O molde é ferramenta de bastidor: mora em scripts/, que o
  // sincronizar-pages.sh não publica. O que vai pro ar é só o PNG.
  const molde = path.join(raiz, 'scripts/og/cartao-entregas.html');
  assert.ok(fs.existsSync(molde), 'o molde do cartão sumiu — sem ele a imagem não se regenera');

  const sync = fs.readFileSync(path.join(raiz, 'scripts/sincronizar-pages.sh'), 'utf8');
  assert.match(sync, /--exclude='\/scripts\/'/, 'scripts/ saiu da lista de exclusão e o molde iria pro ar');
});
