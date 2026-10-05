/* A SETA DE VOLTAR dos cabeçalhos da Central.

   Defeito real, visto pelo Urlan num print: a seta do épico saía quadrada,
   com borda fina e fora do eixo — desenho padrão do navegador. A causa não
   estava no botão e sim na folha: a regra era de ID (#board-voltar) e dois
   botões iguais, na mesma marcação (.board-topo), dividiam o papel. O do
   board acertava por nome; o do épico não existia pra folha.

   O que este teste guarda não é a aparência (isso se vê olhando) e sim que a
   regra continue valendo pros DOIS — e pro terceiro, quando houver. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

test('toda seta de voltar declara a classe que a folha estiliza', () => {
  const html = ler('central.html');
  const botoes = html.match(/<button[^>]*id="[a-z-]*voltar"[^>]*>/g) || [];
  assert.ok(botoes.length >= 2, 'eram dois cabeçalhos com seta; se virou um, revisar este teste');
  for (const b of botoes) {
    assert.match(b, /class="[^"]*\bvoltar\b/, `${b} fica sem estilo: a folha casa por classe`);
  }
});

test('a folha estiliza a seta por classe, não por id', () => {
  const css = ler('assets/style.css');
  assert.match(css, /\.board-topo \.voltar \{[^}]*border-radius:\s*999px/,
    'a regra precisa alcançar qualquer seta dentro de .board-topo');
  assert.ok(!/#board-voltar\s*\{/.test(css) && !/#epico-voltar\s*\{/.test(css),
    'regra por id volta a deixar a seta irmã sem desenho — foi o defeito');
});

/* A MARCA, acima do painel do menu.

   Defeito real e invisível pra quem lê só o CSS: numa coluna flex o padrão de
   `align-items` é `stretch`, e o stretch vence o `width: auto` da imagem — o
   wordmark de 360x139 saiu com 146px de largura por 16px de altura, esticado,
   numa marca registrada. Por isso a altura travada + largura livre é regra
   guardada por teste, não preferência.

   O resto guarda o pedido do Urlan (02/10/2026): a marca fica ACIMA do painel,
   não dentro dele. Se alguém voltar a aninhá-la no <aside>, o teste cai. */

test('o logo aponta pro mesmo arquivo de marca do resto do projeto', () => {
  const html = ler('central.html');
  const img = /<img class="marca-logo"[^>]*>/.exec(html);
  assert.ok(img, 'o logo saiu da coluna da esquerda');
  assert.match(img[0], /src="assets\/brand\/ybera-logo\.webp"/,
    'arquivo próprio = marca que envelhece sozinha quando a outra for trocada');
  assert.match(img[0], /width="360" height="139"/,
    'sem as dimensões intrínsecas o layout pula enquanto a imagem carrega');
  assert.match(img[0], /alt="Ybera"/);
});

test('marca e nome do produto ficam no mesmo bloco, dentro do painel', () => {
  const html = ler('central.html');
  const painel = /<aside class="lateral">[\s\S]*?<\/aside>/.exec(html);
  assert.ok(painel, 'o painel lateral sumiu da marcação');
  assert.match(painel[0], /class="marca-logo"/, 'a marca precisa morar dentro do painel');
  assert.match(painel[0], /class="nome-app"/, 'o nome do produto também');
  /* Par é literal: os dois no MESMO .marca. Separá-los em blocos diferentes já
     aconteceu duas vezes e nas duas o nome ficou parecendo deslocado.
     O recorte conta a profundidade das <div> porque .marca tem filha: regex
     preguiçosa pararia no </div> da linha do logo. */
  const abre = painel[0].indexOf('<div class="marca">');
  assert.ok(abre > -1, 'o bloco .marca sumiu');
  let fundo = 0;
  let fim = abre;
  for (const m of painel[0].slice(abre).matchAll(/<div\b|<\/div>/g)) {
    fundo += m[0] === '</div>' ? -1 : 1;
    if (fundo === 0) { fim = abre + m.index + m[0].length; break; }
  }
  assert.ok(fim > abre, '.marca ficou sem fechamento');
  const marca = painel[0].slice(abre, fim);
  assert.match(marca, /marca-logo/, 'o logo saiu do bloco da marca');
  assert.match(marca, /nome-app/, 'o nome do produto saiu do bloco da marca');
});

test('o wordmark não estica: altura travada, largura livre', () => {
  const css = ler('assets/style.css');
  const regra = /\.marca-logo \{[^}]*\}/.exec(css);
  assert.ok(regra, 'a regra .marca-logo sumiu');
  assert.match(regra[0], /height:[^;]+;[^}]*width:\s*auto/,
    'a proporção se preserva travando a altura e deixando a largura livre');
  /* Este é o pulo do gato, e ele já quebrou duas vezes: o `width: auto` sozinho
     não basta. A marca é filha de uma coluna flex (.lado), onde o padrão é
     `stretch` — e o stretch vence a largura automática. O alvo tem que ser o
     filho, não o container: o painel do menu é irmão da marca e PRECISA
     esticar. */
  assert.match(regra[0], /align-self:\s*(start|flex-start|center)/,
    'sem align-self o stretch do flex achata o wordmark');
});

/* O painel passou a ocupar a altura da TELA (pedido do Urlan em 05/10/2026),
   então ele não alinha mais com o card do conteúdo — alcança o topo e o
   rodapé. A conta que importa agora é essa: altura da viewport menos o respiro
   da página dos dois lados. Se alguém trocar por `height: 100%` ou por
   `min-height`, o painel volta a ter o tamanho do conteúdo e para de encostar
   no rodapé numa tela grande, sem erro nenhum na tela. */
test('o painel do menu tem a altura da tela, não a do conteúdo', () => {
  const css = ler('assets/style.css');
  const lateral = /\n\.lateral \{[^}]*\}/.exec(css);
  assert.ok(lateral, 'a regra .lateral sumiu');
  assert.match(lateral[0], /height:\s*calc\(100vh - var\(--respiro-pagina\) \* 2\)/,
    'a altura cheia vem da viewport menos o respiro da página, dos dois lados');
  assert.match(lateral[0], /position:\s*sticky/,
    'sem sticky o painel sobe junto com o conteúdo numa página longa');
  /* Defeito visto rolando a página: com `top: 0` o painel grudava na borda da
     tela e perdia o respiro de cima — ficava colado no alto e com o dobro de
     folga embaixo. O deslocamento do sticky é o mesmo respiro da posição de
     repouso, senão a altura cheia só fecha com a página no começo. */
  assert.match(lateral[0], /top:\s*var\(--respiro-pagina\)/,
    'o sticky tem que parar no mesmo respiro em que o painel nasce');
  assert.match(lateral[0], /overflow-y:\s*auto/,
    'tela baixa: a nav rola dentro do painel em vez de vazar por cima da página');
  assert.match(css, /--respiro-pagina:/, 'o token do respiro sumiu');
  /* O respiro tem que ser o MESMO do padding do body, senão a conta da altura
     erra e sobra (ou falta) exatamente essa diferença no rodapé. */
  const body = /\nbody \{[^}]*\}/.exec(css);
  assert.match(body[0], /padding:\s*var\(--respiro-pagina\)/,
    'o body precisa usar o mesmo token, senão a altura da lateral não fecha');
});

/* O padding vertical morava no .corpo, ENTRE a borda da tela e a lateral — com
   ele de volta, a lateral não alcança mais o topo nem o rodapé. O respiro do
   conteúdo é da coluna do conteúdo. */
test('o respiro do conteúdo não volta pro container das duas colunas', () => {
  const css = ler('assets/style.css');
  const corpo = /\n\.corpo \{[^}]*\}/.exec(css);
  assert.ok(corpo, 'a regra .corpo sumiu');
  assert.ok(!/padding:/.test(corpo[0]),
    'padding no .corpo empurra a lateral pra dentro e mata a altura cheia');
  const coluna = /\n\.coluna-principal \{[^}]*\}/.exec(css);
  assert.match(coluna[0], /padding:/, 'o respiro tem que ter ido pra coluna do conteúdo');
});


/* A coluna recolhida existe pra devolver espaço ao conteúdo, e isso é o que
   estes testes guardam. Duas tentativas de manter a marca aqui já falharam:
   o wordmark inteiro só coube em 15px de altura (ilegível) e o Y recortado,
   com 20,5px de largura ao lado do chip de 38, obrigou a coluna a abrir pra
   84px — o Urlan descartou as duas. Quem repetir a ideia vai precisar alargar
   a coluna de novo, e é exatamente aí que o teste reclama. */
test('a coluna recolhida continua estreita', () => {
  const css = ler('assets/style.css');
  const coluna = /body\.lateral-recolhida \.corpo \{[^}]*grid-template-columns:\s*(\d+)px/.exec(css);
  assert.ok(coluna, 'a largura da coluna recolhida saiu do formato esperado');
  assert.ok(Number(coluna[1]) <= 62,
    `${coluna[1]}px é largo demais: recolhida, a coluna tem que devolver espaço pro conteúdo`);
});

test('recolhida, a coluna mostra só o botão, centrado', () => {
  const css = ler('assets/style.css');
  assert.match(css, /body\.lateral-recolhida \.marca-logo \{[^}]*display:\s*none/,
    'a marca não cabe ao lado do chip de 38px nesta largura');
  assert.match(css, /body\.lateral-recolhida \.lateral-topo \{[^}]*justify-content:\s*center/,
    'sem centrar, o botão fica encostado numa das bordas da coluna estreita');
});

/* O recorte do Y saiu da folha junto com a ideia: regra que não vale em estado
   nenhum é código morto esperando pra confundir. */
test('não sobrou recorte de marca na folha', () => {
  const css = ler('assets/style.css');
  assert.ok(!/object-fit/.test(css),
    'a marca é usada inteira nos dois estados — recorte aqui é sobra de uma ideia descartada');
});

/* Expandida a marca é o wordmark inteiro, na proporção 360/139 do arquivo. */
test('expandida, a marca continua sendo o wordmark inteiro', () => {
  const css = ler('assets/style.css');
  const regra = /\n\.marca-logo \{[^}]*\}/.exec(css);
  assert.ok(regra, 'a regra .marca-logo sumiu');
  assert.match(regra[0], /height:[^;]+;[^}]*width:\s*auto/,
    'a proporção se preserva travando a altura e deixando a largura livre');
});

/* O NOME DO PRODUTO é rótulo, não manchete.

   Escolha do Urlan em 02/10/2026, depois de ver as três opções lado a lado: a
   marca da casa assina a tela, e "Central de Projetos" passa a ser etiqueta.
   Antes os dois estavam em preto cheio e peso 700, um em cima do outro, e
   nenhum vencia.

   O que o teste guarda é o que não se vê num print: que o tratamento continue
   sendo o MESMO dos títulos de bloco, em vez de virar um conjunto de valores
   soltos que só por acaso se parecem com eles. */
test('o nome do produto usa o mesmo tratamento dos títulos de bloco', () => {
  const css = ler('assets/style.css');
  const rotulo = /\n\.nome-app \{[^}]*\}/.exec(css);
  assert.ok(rotulo, 'a regra .nome-app sumiu');
  const bloco = /\.blocos \.bloco > h3 \{[^}]*\}/.exec(css);
  assert.ok(bloco, 'o título de bloco mudou de seletor — este teste precisa acompanhar');
  for (const prop of ['font-size', 'font-weight', 'letter-spacing', 'text-transform']) {
    const a = new RegExp(`${prop}:\\s*([^;]+);`).exec(rotulo[0]);
    const b = new RegExp(`${prop}:\\s*([^;]+);`).exec(bloco[0]);
    assert.ok(a && b, `${prop} saiu de uma das duas regras`);
    assert.equal(a[1].trim(), b[1].trim(),
      `${prop} divergiu: rótulo "${a[1].trim()}" vs título de bloco "${b[1].trim()}"`);
  }
  assert.match(rotulo[0], /color:\s*var\(--mudo\)/,
    'em tinta cheia ele volta a disputar atenção com a marca');
});

/* Havia uma regra morta (`body.gerado .nome-app { font-size: 1.15rem }`) de um
   modo de relatório que nenhum HTML e nenhum JS liga mais. Ela sobrescrevia
   justamente o tamanho do rótulo — se voltar, desfaz a escolha sem erro nenhum
   na tela. */
test('nenhuma regra órfã sobrescreve o tamanho do rótulo', () => {
  const css = ler('assets/style.css');
  const html = ler('central.html');
  if (/class="[^"]*\bgerado\b/.test(html)) return; // se o modo voltar, revisar
  assert.ok(!/body\.gerado\b/.test(css),
    'body.gerado não existe em lugar nenhum do HTML/JS: regra morta que só espera pra atrapalhar');
});

/* O TOPO DAS TRÊS COLUNAS de sprint do Panorama.

   Defeito que o Urlan viu num print: só a coluna do meio tinha selo ("EM
   CURSO"); nas vizinhas a retranca era texto solto. Selo é mais alto que
   texto, então a barra de progresso da coluna do meio descia alguns pixels e
   as três ficavam desencaixadas no topo do bloco.

   A correção é o selo nas três, com a MESMA caixa — a cor é que separa. O que
   estes testes guardam é isso: o estado "em curso" só pode mexer em COR. No
   dia em que ele ganhar um padding ou um tamanho de fonte próprio, o degrau
   volta, e volta silencioso: continua bonito, só desalinhado. */
test('as três retrancas de sprint têm a mesma caixa', () => {
  const css = ler('assets/style.css');
  const base = /\n\.sprint-fase \{[^}]*\}/.exec(css);
  assert.ok(base, 'a regra .sprint-fase sumiu');
  for (const prop of ['display', 'padding', 'border-radius', 'font-size', 'margin-bottom']) {
    assert.match(base[0], new RegExp(`${prop}:`), `${prop} saiu da regra base e a caixa deixa de ser comum`);
  }
  assert.match(base[0], /display:\s*inline-block/, 'em display:block o selo vira faixa da largura toda');

  const atual = /\.sprint-atual \.sprint-fase \{[^}]*\}/.exec(css);
  assert.ok(atual, 'a regra do selo em curso sumiu');
  for (const prop of ['display', 'padding', 'font-size', 'border-radius', 'margin']) {
    assert.ok(!new RegExp(`${prop}:`).test(atual[0]),
      `o estado "em curso" mexe em ${prop}: a caixa diverge e o topo das colunas desalinha de novo`);
  }
  assert.match(atual[0], /background:/, 'o que distingue a coluna em curso é a cor do selo');
});

/* Mesmo motivo, uma linha abaixo: a coluna da próxima não tem progresso, e sem
   nada no lugar da barra a lista de PBIs dela subia ~13px. */
test('a coluna da próxima reserva o espaço da barra de progresso', () => {
  const app = fs.readFileSync(path.join(raiz, 'assets', 'app.js'), 'utf8');
  assert.match(app, /chave === 'proxima'\s*\?\s*'<span class="barra barra-reservada"/,
    'sem o espaço reservado, a lista da próxima sobe e desalinha das vizinhas');
  const css = ler('assets/style.css');
  assert.match(css, /\.barra-reservada \{[^}]*visibility:\s*hidden/,
    'tem que ocupar o espaço sem desenhar: display:none não reserva nada');
  assert.ok(!/\.barra-reservada \{[^}]*display:\s*none/.test(css),
    'display:none devolve o desalinho que a reserva existe pra resolver');
});
