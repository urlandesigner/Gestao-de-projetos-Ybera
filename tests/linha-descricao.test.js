/* O RESUMO DA PBI no quadro de sprints do Panorama.

   O Urlan pediu em 09/10/2026 que a Central mostrasse um resumo embaixo do
   título, "assim como fazemos no relatório de entregas".

   A PRIMEIRA TENTATIVA ERROU, e o erro é o que este arquivo existe pra impedir
   que volte: ela pegava a primeira frase da descrição da PBI e colava embaixo do
   título. Ele viu na hora — "não resumiu, apenas pegou o texto da própria pbi".
   E estava certo: descrição de PBI começa com contexto, com cabeçalho ou com a
   frase que o autor escreveu primeiro, e nada disso é a explicação do item.
   Recortar texto não é resumir.

   Agora as duas telas leem o MESMO assets/resumos.json — linha escrita à mão a
   partir da descrição inteira. Isso resolve três coisas de uma vez:

   1. é resumo de verdade, não recorte;
   2. a mesma PBI não tem duas explicações em duas telas do mesmo projeto;
   3. descrição crua deixa de circular. Ela tem link interno, nome de fornecedor
      e observação escrita achando que era interna — e o relatório publica um
      arquivo PÚBLICO e indexável. O caminho que lia descrição na Central não
      publicava nada, mas punha o texto cru no localStorage de quem abrisse. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const semComentarios = (txt) => String(txt).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const fonteApp = ler('assets/app.js');
const fonteReport = ler('assets/report.js');

/* ---------- 1. é resumo escrito, não recorte de descrição ---------- */

test('a Central não lê descrição de PBI em lugar nenhum', () => {
  /* O teste é sobre o ARQUIVO todo de propósito: o defeito não foi numa função,
     foi na decisão de usar a descrição como fonte. Se ela reaparecer em qualquer
     caminho do app, é o mesmo erro outra vez. */
  assert.doesNotMatch(semComentarios(fonteApp), /System\.Description/,
    'a Central voltou a buscar descrição crua — recorte de texto não é resumo');
});

test('o quadro de sprints não paga por campo que não usa', () => {
  // Descrição é o campo mais pesado do item. A lista do quadro é a mesma de
  // antes: nenhuma requisição ficou maior por causa desta feature.
  const m = /const FIELDS_COUNTS = \[[\s\S]*?\];/.exec(fonteApp);
  assert.ok(m, 'o FIELDS_COUNTS mudou de forma');
  assert.doesNotMatch(m[0], /System\.Description/);
  assert.doesNotMatch(fonteApp, /FIELDS_SPRINT/, 'sobrou a lista de campos da tentativa antiga');
});

test('a fonte é o mesmo arquivo que o relatório usa', () => {
  assert.match(fonteApp, /fetch\('assets\/resumos\.json\?t=' \+ Date\.now\(\), \{ cache: 'no-store' \}\)/);
  assert.match(fonteReport, /fetch\('assets\/resumos\.json', \{ cache: 'no-store' \}\)/);
});

/* ---------- 2. um contrato só pro arquivo ---------- */

test('as duas telas saneiam o resumos.json pela MESMA função', () => {
  /* Era uma função dentro do report.js. Uma segunda cópia no app.js divergiria
     no dia em que o corte de 240 mudasse num e não no outro — o arquivo passaria
     a significar uma coisa pra quem publica e outra pra quem olha. */
  assert.match(fonteApp, /C\.saneResumos\(dado\.itens\)/);
  assert.match(fonteReport, /C\.saneResumos\(dado\.itens\)/);
  assert.doesNotMatch(semComentarios(fonteReport), /function saneResumos/,
    'voltou a existir uma segunda cópia do saneador');
});

test('o saneador corta o texto e exige id numérico', () => {
  const out = C.saneResumos({
    51676: { resumo: '  linha boa  ', de: 'abcd1234' },
    'não-id': { resumo: 'entra pela chave errada' },
    51677: { resumo: '' },
    51678: { resumo: 'x'.repeat(400) },
  });
  assert.deepEqual(Object.keys(out).sort(), ['51676', '51678']);
  assert.equal(out['51676'].resumo, 'linha boa');
  assert.equal(out['51678'].resumo.length, 240);
});

test('entrada torta não quebra', () => {
  for (const v of [null, undefined, 'texto', 42, []]) {
    assert.deepEqual(C.saneResumos(v), {}, 'quebrou com ' + JSON.stringify(v));
  }
});

/* ---------- 3. o casamento com o item ---------- */

test('casa por id, nunca por posição', () => {
  /* resumoDeSprint tira as Tasks, então a lista enxuta é menor que a crua.
     Parear por índice penduraria o resumo de um item no título de outro — e a
     tela mostraria isso com cara de certo. */
  assert.match(fonteApp, /const resumoDoItem = \(id\) => \(\(state\.resumos \|\| \{\}\)\[String\(id\)\] \|\| \{\}\)\.resumo \|\| '';/);
  const i = fonteApp.indexOf('function comResumo');
  const corpo = fonteApp.slice(i, fonteApp.indexOf('\n}', i));
  assert.match(corpo, /resumoDoItem\(x\.id\)/);
  assert.doesNotMatch(corpo, /\[i\]|index/, 'passou a parear por posição');
});

test('item sem resumo não carrega campo vazio', () => {
  // `resumo: ''` no objeto iria pro localStorage em cada item sem linha, e o
  // desenho teria de distinguir vazio de ausente em dois lugares.
  const i = fonteApp.indexOf('function comResumo');
  const corpo = fonteApp.slice(i, fonteApp.indexOf('\n}', i));
  assert.match(corpo, /return r \? Object\.assign\(\{\}, x, \{ resumo: r \}\) : x;/);
});

/* ---------- 6. as duas telas, um acesso só ---------- */

test('o board da sprint lê o MESMO mapa, pela mesma função', () => {
  /* O título do cartão do board é jargão de time: quem abre a Sprint 19 três
     semanas depois não reconstrói "[DISCOVERY] Aplicativo para reviews na loja"
     de cabeça. Mesma fonte, mesmo acesso — duas leituras do mapa divergiriam no
     dia em que uma delas passasse a tratar id como número. */
  const i = fonteApp.indexOf('const resumo = resumoDoItem(it.id);');
  assert.ok(i > 0, 'o cartão do board deixou de ler o resumo');
  const corpo = fonteApp.slice(i, fonteApp.indexOf('</a></li>`;', i));
  assert.match(corpo, /\$\{resumo \? `<span class="item-linha-desc">\$\{escapeHtml\(resumo\)\}<\/span>` : ''\}/,
    'o resumo do board não é escapado, ou aparece como span vazio sem linha');
});

test('o board não ganhou requisição nem campo novo por causa disto', () => {
  // O mapa já está na memória desde o boot. Se o board passar a buscar algo pra
  // mostrar a linha, uma tela de leitura rápida passa a esperar rede.
  const m = /const FIELDS_BOARD = \[[^\]]*\];/.exec(fonteApp);
  assert.ok(m, 'o FIELDS_BOARD mudou de forma');
  assert.doesNotMatch(m[0], /System\.Description/);
  const i = fonteApp.indexOf('function renderBoard');
  const corpo = fonteApp.slice(i, fonteApp.indexOf('\n/* ---------- Configurações', i));
  assert.doesNotMatch(corpo, /await |fetch\(/, 'o desenho do board passou a esperar rede');
});

test('o resumo entra nas DUAS listas da coluna', () => {
  // Os que ficaram e os que transbordaram aparecem na MESMA lista da coluna
  // "Anterior": resumo em metade deles leria como carregamento pela metade.
  assert.match(fonteApp, /itens: comResumo\(resumoDeSprint\(itens\)\)/);
  assert.match(fonteApp, /comResumo\(resumoDeSprint\(extras\)\)/);
});

test('o mapa fica FORA do cache de localStorage', () => {
  /* Guardar cópia faria a tela mostrar linha velha depois de eu reescrever o
     arquivo — e o arquivo é justamente a parte que muda à mão. */
  const i = fonteApp.indexOf('const state = {');
  const corpo = fonteApp.slice(i, fonteApp.indexOf('};', i));
  assert.match(corpo, /resumos: \{\},/);
  const j = fonteApp.indexOf('entry.items = items.map((it) => {');
  const slim = fonteApp.slice(j, fonteApp.indexOf('});', j));
  assert.doesNotMatch(slim, /resumo/, 'o resumo entrou no que vai pro localStorage');
});

/* ---------- 4. a tela ---------- */

test('o arquivo chega depois e redesenha sozinho', () => {
  // Sem o render, a linha só apareceria no próximo desenho por outro motivo —
  // na prática, depois do DevOps responder.
  assert.match(fonteApp, /carregarResumos\(\)\.then\(renderAll\);/);
});

test('arquivo ausente degrada em silêncio', () => {
  const i = fonteApp.indexOf('async function carregarResumos');
  const corpo = fonteApp.slice(i, fonteApp.indexOf('\n}', i));
  assert.match(corpo, /if \(!resp\.ok\) return;/);
  assert.match(corpo, /console\.warn/);
});

test('o texto é escapado, e o span só existe quando há linha', () => {
  const i = fonteApp.indexOf('const linhaDeItem = (it, link)');
  const corpo = fonteApp.slice(i, fonteApp.indexOf('</a></li>`;', i));
  assert.match(corpo, /escapeHtml\(it\.resumo\)/);
  assert.doesNotMatch(corpo, /\$\{it\.resumo\}/);
  assert.match(corpo, /\$\{it\.resumo\s*\n?\s*\? `<span class="item-linha-desc">/);
});

test('o corte de duas linhas vale pra cada texto, não pros dois juntos', () => {
  /* Era o `.titulo` que carregava o clamp. Com o resumo dentro da mesma coluna,
     um título de duas linhas comeria o resumo inteiro, e um de uma linha
     deixaria só o primeiro pedaço dele. */
  const css = ler('assets/style.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.sprints-quadro \.lista-linhas \.titulo \{ display: block; white-space: normal; \}/);
  assert.match(css, /\.sprints-quadro \.lista-linhas \.titulo-txt,[\s\S]{0,80}\{[^}]*-webkit-line-clamp: 2/);
  assert.match(css, /\.item-linha-desc \{[^}]*color: var\(--mudo\)/);
});

/* O CORTE MORA NA PRÉVIA, não na regra base — e isto é medição, não gosto.

   Com o corte na base, numa coluna de board de 300 a 380px (a largura real)
   64 dos 71 resumos terminavam em reticência: o lugar onde a pessoa vai pra
   entender o item era o que mostrava menos. Na prévia do Panorama cortar não
   esconde nada, porque o "+N mais" abre o diálogo com o texto inteiro. */
test('só a prévia do Panorama corta o resumo; board e diálogo mostram inteiro', () => {
  const css = ler('assets/style.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const base = /\.item-linha-desc \{[^}]*\}/.exec(css);
  assert.ok(base, 'a regra base do resumo sumiu');
  assert.doesNotMatch(base[0], /line-clamp/,
    'o corte voltou pra regra base e o board passa a truncar quase todo resumo');
  assert.match(base[0], /display: block/);
  assert.match(css, /\.sprints-quadro \.lista-linhas \.item-linha-desc \{[^}]*-webkit-line-clamp: 2/);
});

test('uma definição por seletor, fora de media query', () => {
  /* A armadilha que já apareceu três vezes neste projeto: um seletor repetido
     fora de @media, e o de baixo sobrescrevendo parte do de cima em silêncio.

     Conta INÍCIO DE REGRA, não substring: `.item-linha-desc` aparece dentro de
     `.sprints-quadro .lista-linhas .item-linha-desc`, que é outro seletor — mais
     específico, de propósito, e não uma segunda definição do mesmo. */
  const css = ler('assets/style.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const fora = css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const sel of ['.item-linha-desc', '.sprints-quadro .lista-linhas .item-linha-desc',
    '.sprints-quadro .lista-linhas .titulo', '.sprint-tudo-corpo .item-linha .titulo',
    '.coluna .item .item-linha-desc']) {
    const re = new RegExp('(^|[\n,])\\s*' + escapar(sel) + '\\s*[,{]', 'g');
    const n = (fora.match(re) || []).length;
    assert.equal(n, 1, 'definido ' + n + ' vezes fora de @media: ' + sel);
  }
});

/* ---------- 5. a fonte própria do material ---------- */

/* O botão Publicar dados do relatório só alcança as sprints que FECHAM no mês
   do documento (sprintsDoPeriodo). A coluna "Anterior" do Panorama é quase
   sempre de outro mês: em 09/10/2026 o relatório cobria a Sprint 20 e a 21, e a
   19 — que é a "Anterior" — ficaria sem linha pra sempre, todo mês, porque a
   fonte estava amarrada ao recorte do documento.

   Daí a ferramenta no diagnostico.html: sprints nomeadas, sem recorte. Ela mora
   lá porque baixa DESCRIÇÃO CRUA, e aquela página está fora do deploy. */
const diag = ler('diagnostico.html');
/* Comentário fora ANTES de qualquer doesNotMatch, e aqui não é zelo: a primeira
   versão deste teste casou com o comentário que EXPLICA o defeito, logo acima do
   código que o evita. É a quarta vez que isso acontece neste projeto.
   Só `/* *\/` e `<!-- -->`: tirar `//` comeria o https:// dos links. */
const semCom = (txt) => String(txt)
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const diagSemCom = semCom(diag);

test('a ferramenta pede sprint por NOME, sem recorte de mês', () => {
  assert.match(diag, /ARQUIVO_MATERIAL = 'material-resumos\.json'/);
  assert.match(diag, /A\.teamIterations\(ctx, p0\.projectName, p0\.teamName\)/);
  assert.doesNotMatch(diagSemCom, /sprintsDoPeriodo/,
    'a ferramenta voltou a recortar por mês e a coluna "Anterior" fica sem linha de novo');
});

test('o nome do arquivo é impublicável por construção', () => {
  /* O publicar-dados.sh só aceita arquivo cujo nome bate com o `arquivoDeDados`
     de uma edição. Material de resumo tem descrição crua dentro — link interno,
     nome de fornecedor, observação escrita achando que era interna. */
  const declarados = [...ler('assets/briefing-entregas.js').matchAll(/arquivoDeDados = '([^']+)'/g),
    ...ler('assets/briefing-entregas-v2.js').matchAll(/ARQUIVO_DE_DADOS = '([^']+)'/g)]
    .map((m) => m[1].split('/').pop());
  assert.ok(declarados.length >= 2, 'não achei os arquivos de dados declarados');
  assert.equal(declarados.includes('material-resumos.json'), false,
    'o material passou a ter o nome de uma edição e pode ser publicado por engano');
  assert.match(ler('scripts/publicar-dados.sh'),
    /\[ "\$\(basename "\$candidato"\)" = "\$\(basename "\$d"\)" \] \|\| continue/,
    'o publicar-dados.sh deixou de casar pelo nome — o material passa a ser publicável');
});

test('só pede o que falta, e a régua é a mesma do relatório', () => {
  // Cada linha custa trabalho: PBI já escrita cuja descrição não mudou fica
  // fora. Sem `de`, foi escrita à mão e nunca se regera.
  assert.match(diag, /if \(e && e\.resumo && \(!e\.de \|\| e\.de === C\.digitalDoTexto\(texto\)\)\)/);
  assert.match(ler('assets/report.js'), /if \(e && e\.resumo && \(!e\.de \|\| e\.de === C\.digitalDoTexto\(texto\)\)\) continue;/);
});

test('PBI sem descrição não entra no material', () => {
  // Não há o que resumir. Entrar só pra sair vazia faria eu inventar texto.
  const i = diagSemCom.indexOf("if (!texto) {");
  const corpo = diagSemCom.slice(i, i + 400);
  assert.match(corpo, /semDesc \+= 1/);
  assert.doesNotMatch(corpo, /material\.push/);
});

test('o recorte é o do cartão: Épico, Feature e Task ficam fora', () => {
  assert.match(diag, /t !== 'Task' && C\.levelOf\(t\) === 'pbi'/);
});

test('o saneador do resumos.json é o do core, aqui também', () => {
  // Três leitores do mesmo arquivo agora: relatório, Central e esta ferramenta.
  assert.match(diag, /C\.saneResumos\(\(await rr\.json\(\)\)\.itens\)/);
});

test('o diagnostico.html continua fora do deploy', () => {
  // É o que permite esta página baixar descrição crua. Se ela entrar no rsync,
  // vai pro ar uma ferramenta que lê o PAT do localStorage.
  assert.match(ler('scripts/sincronizar-pages.sh'), /--exclude='\/diagnostico\.html'/);
});
