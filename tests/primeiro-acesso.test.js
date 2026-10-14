/* A PORTA PARA QUEM NUNCA ABRIU.

   Até 13/10/2026 a ferramenta tinha um usuário só, e o único lugar que
   explicava o token era um <details> dentro do próprio assistente — que só
   aparece pra quem já descobriu que precisa abrir a central.html. Com a
   Isadora e a Daniele entrando, isso virou a primeira parede.

   Estes testes não guardam texto bonito: guardam que os caminhos até a página
   continuem existindo, e que a entrada não volte a apresentar os documentos de
   UMA PO como se fossem de quem abriu. Nada disso dá erro quando quebra — um
   link que sumiu e uma seção que voltou a ser lista são invisíveis para quem
   já sabe onde tudo fica. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const comecar = ler('comecar.html');
const index = ler('index.html');
const central = ler('central.html');

test('a página existe e ensina os dois escopos exatos, de leitura', () => {
  /* Escopo a mais é acesso a mais sem necessidade; escopo a menos faz a Central
     falhar numa tela só, e a pessoa não tem como saber qual faltou. */
  assert.match(comecar, /Work Items<\/b> → Read/);
  assert.match(comecar, /Project and Team<\/b> → Read/);
  assert.match(comecar, /só de leitura/, 'não está dito que os dois escopos são de leitura');
  assert.match(comecar, /Personal access tokens/);
  assert.match(comecar, /90 dias/, 'o prazo do token precisa estar escrito: é o que explica o sumiço daqui a três meses');
});

test('a página responde o que a pessoa pergunta em voz alta', () => {
  // O token é de quem abriu, e dizer isso é o que faz alguém colar o dela.
  assert.match(comecar, /ninguém mais tem como lê-lo/);
  // Roadmap é por pessoa desde 13/10/2026 — e a aba vazia precisa ter explicação.
  assert.match(comecar, /Roadmap<\/b> também é por pessoa/);
  // Os documentos NÃO são dela, e esse é o mal-entendido mais provável.
  assert.match(comecar, /não mudam conforme quem abre/);
});

test('a página é alcançável dos dois lugares por onde se chega', () => {
  // Pela porta: quem abre o endereço da pasta.
  assert.match(index, /href="comecar\.html"/, 'a entrada perdeu a chamada de primeiro acesso');
  // E por dentro: quem recebeu o link da central.html direto, ou favoritou.
  assert.match(central, /href="comecar\.html"/, 'o assistente perdeu o link da página');
});

test('a página inicial é só a porta do sistema', () => {
  /* Até 13/10/2026 a entrada listava a Central e os documentos lado a lado. Em
     14/10 o Urlan pediu que os documentos saíssem dela e passassem a ser
     abertos pela Central: lá eles disputavam com a ferramenta, que é a porta.
     Continuam acessíveis — só mudaram de lugar. */
  const cartoes = [...index.matchAll(/<a class="ini-card[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cartoes, ['central.html#panorama'], 'a página inicial voltou a listar documentos');
  for (const doc of ['entregas.html', 'entregas-v2.html', 'status-demandas.html', 'report-v2.html']) {
    assert.ok(!index.includes(`href="${doc}`), `${doc} voltou a ter link na página inicial`);
  }
});

test('os documentos continuam acessíveis, pelo menu da Central', () => {
  // Entregas abre a edição de outubro: o padrão do relatório, com o seletor de edições.
  assert.match(central, /id="nav-entregas" href="entregas-v2\.html\?po=1"/);
  assert.match(central, /id="nav-status" href="status-demandas\.html"/);
  // E cada item do menu tem o ícone dele — sem regra, o item aparece sem ícone.
  const css = fs.readFileSync(path.join(raiz, 'assets/style.css'), 'utf8');
  assert.match(css, /#nav-status \{\s*--icone:/);
});

test('o Report v2 é estudo: fica fora da publicação, a não ser que se peça', () => {
  const sync = fs.readFileSync(path.join(raiz, 'scripts/sincronizar-pages.sh'), 'utf8');
  assert.match(sync, /ESTUDOS="report-v2\.html assets\/briefing-v2\.js assets\/report-v2\.css"/);
  assert.match(sync, /--com-estudos\) COM_ESTUDOS="sim"/, 'sumiu o jeito de publicar o estudo quando pedir');
  /* Excluir do rsync não basta: com --delete ele PROTEGE o que está excluído e
     nunca apaga do destino. Sem a remoção explícita, o estudo que já tinha
     subido continuaria no ar para sempre. */
  assert.match(sync, /rm -f "\$DESTINO\/\$e"/, 'o estudo deixou de ser removido do destino');
});

test('a página de começar não promete tela que não existe', () => {
  // Os três passos citam botões por nome. Nome errado manda a pessoa procurar
  // o que não está lá, e ela conclui que a ferramenta é que está quebrada.
  for (const botao of ['Descobrir projetos', 'Montar a central']) {
    assert.ok(comecar.includes(botao), `a página cita "${botao}"`);
    assert.ok(central.includes(botao), `mas o botão "${botao}" não existe na central.html`);
  }
});

test('comecar.html usa a folha da porta, e não carrega script nenhum', () => {
  // Mesma família visual do index, e estática: nada aqui depende do DevOps,
  // e uma página de socorro que precisa de JS é socorro que pode faltar.
  assert.match(comecar, /href="assets\/inicio\.css\?v=\d{10}"/);
  assert.doesNotMatch(comecar, /<script/);
});

test('tutorial e Central abrem um ao lado do outro, sem perder o lugar', () => {
  /* O passo 2 do tutorial manda abrir a Central e preencher. Na mesma aba, a
     pessoa perdia o tutorial no meio do passo e voltava pelo histórico pra ler
     o 3. O inverso vale do assistente pro tutorial. */
  assert.match(comecar, /<a href="central\.html" target="_blank" rel="noopener">/);
  assert.match(central, /<a href="comecar\.html" target="_blank" rel="noopener">/);
  // Quem usa leitor de tela não vê a aba nova abrir: o aviso tem que estar no link.
  assert.match(comecar, /central\.html"[^>]*>[^<]*<span class="ini-nova-aba"> \(abre em outra aba\)<\/span>/);
});

test('o endereço da organização já vem preenchido, e o tutorial diz qual é', () => {
  /* A organização é a mesma pra todo mundo da Ybera. Pedir pra digitar era o
     único campo do assistente em que um erro de letra derrubava a conexão sem
     dizer por quê. Assistente e tutorial têm que concordar no endereço. */
  assert.match(central, /<input id="wizard-org" value="dev\.azure\.com\/nivello"/);
  assert.match(comecar, /<code>dev\.azure\.com\/nivello<\/code>/);
  assert.doesNotMatch(comecar, /sua-organizacao/, 'o tutorial voltou a pedir pra descobrir o endereço');
});

test('a tela de primeiro acesso não oferece importar arquivo', () => {
  /* Quem chega pela primeira vez não tem arquivo nenhum pra importar — o botão
     só competia com "Descobrir projetos". O importar continua nas
     configurações, ao lado do Exportar, que é onde quem troca de computador
     procura. */
  const wizard = central.slice(central.indexOf('<dialog id="wizard"'), central.indexOf('</dialog>', central.indexOf('<dialog id="wizard"')));
  assert.doesNotMatch(wizard, /type="file"/, 'o assistente voltou a pedir arquivo');
  assert.match(central, /id="conf-importar"/, 'o importar sumiu também das configurações');
  assert.match(central, /id="conf-exportar"/);
});
