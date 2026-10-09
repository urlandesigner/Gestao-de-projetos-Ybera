/* RESUMO DE PBI nos cartões de sprint da aba Acompanhar.

   O título da PBI é escrito pra quem trabalha nela — "[DESIGN] Viabilização
   Design System para loja Ybera.us" não diz nada a quem lê de fora, e este
   documento é lido de fora. O Urlan pediu em 08/10/2026 uma linha de resumo
   embaixo do título.

   O que estes testes guardam, em ordem de gravidade:

   1. A DESCRIÇÃO CRUA NÃO CHEGA EM PRODUÇÃO. Ela tem link interno, nome de
      fornecedor e observação escrita achando que era interna; o arquivo
      publicado é público e indexável. O portão é o publicar-dados.sh, que PARA
      se o bloco `_descricoes` ainda estiver lá;
   2. nenhum id novo vai pro arquivo público — a poda de id e responsável
      continua valendo;
   3. o que falta é só o que falta: item já resumido, cuja descrição não mudou,
      não é regerado (cada regeração custa dinheiro);
   4. linha escrita à mão não é sobrescrita;
   5. os outros três documentos não pedem o arquivo nem ganham comportamento. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const semComentarios = (txt) => String(txt).replace(/\/\*[\s\S]*?\*\//g, '');
const fonteReport = ler('assets/report.js');
const fonteV2 = ler('assets/briefing-entregas-v2.js');
const publicar = ler('scripts/publicar-dados.sh');
const css = semComentarios(ler('assets/ritmo.css'));

/* ---------- 1. a descrição crua não chega em produção ---------- */

test('o publicar-dados.sh PARA se o pacote ainda trouxer material local', () => {
  // Parar, e não avisar: aviso em script depende de alguém ler a saída.
  //
  // Por PREFIXO e não por nome: o portão nasceu conhecendo só o `_descricoes`, e
  // o `_entregas` chegou depois. Uma lista de nomes teria deixado o segundo
  // passar calada — que é exatamente o acidente que este portão existe pra
  // impedir, e o único em que ninguém percebe o estrago.
  assert.match(publicar, /locais = sorted\(k for k in p if k\.startswith\('_'\)\)/);
  assert.match(publicar, /if locais:/);
  assert.match(publicar, /sys\.exit\(1\)/);
  // E o erro diz o que fazer, não só que deu errado.
  assert.match(publicar, /gera os resumos/);
});

/* Mesmo motivo, na outra ponta: o aplicar-resumos.js é quem limpa o pacote
   antes de publicar. Se ele tirasse só o bloco que conhece, o pacote sairia
   limpo pela metade e o portão barraria a publicação sem ninguém entender. */
test('o aplicar-resumos.js tira TODO bloco local, não só o que ele conhece', () => {
  const script = ler('scripts/aplicar-resumos.js');
  assert.match(script, /Object\.keys\(pacote\)\.filter\(\(k\) => k\.startsWith\('_'\)\)/);
  assert.match(script, /for \(const k of locais\) delete pacote\[k\];/);
});

test('as descrições só entram no ARQUIVO, nunca no link', () => {
  /* O link é o conteúdo final: não passa por script nenhum, e um bloco de
     descrições cruas dentro dele iria inteiro pra quem recebesse. */
  assert.match(fonteReport, /_descricoes: \(semRecorte && pendentes && pendentes\.length\) \? pendentes : undefined,/);
  assert.match(fonteReport, /const pendentes = \(semRecorte && B\.precisaDeSprints === true\)/);
});

test('o saneador não deixa descrição passar, nos dois sentidos', () => {
  const m = /function saneRitmo\(lista\) \{[\s\S]*?\n\}/.exec(fonteReport);
  // eslint-disable-next-line no-eval
  const saneRitmo = eval(`(${m[0]})`);
  const [linha] = saneRitmo([{
    nome: 'Sprint 20', estado: 'corrente',
    itens: [{ titulo: 'X', estado: 'To Do', tipo: 'pbi', descricao: 'segredo interno' }],
    transbordados: [{ titulo: 'Y', estado: 'Done', tipo: 'bug', descricao: 'outro segredo' }],
  }]);
  assert.equal(JSON.stringify(linha).includes('segredo'), false);
  assert.equal('descricao' in linha.itens[0], false);
  assert.equal('descricao' in linha.transbordados[0], false);
});

/* ---------- 2. nada de id novo no arquivo público ---------- */

test('o resumo entra enquanto o item ainda tem id, e o id some depois', () => {
  /* Casar resumo com item do outro lado exigiria o `id` no pacote — justamente
     o campo que a poda tira. Por isso a linha vai PRONTA, embutida antes do
     saneamento. */
  const i = fonteReport.indexOf('function ritmoAgora');
  const corpo = fonteReport.slice(i, fonteReport.indexOf('function descricoesPendentes'));
  assert.match(corpo, /const e = st\.resumos\[String\(it\.id\)\];/);
  assert.match(corpo, /if \(e && e\.resumo\) it\.resumo = e\.resumo;/);
  // e a ordem: embutir ANTES de sanear.
  assert.ok(fonteReport.indexOf('it.resumo = e.resumo')
    < fonteReport.indexOf('saneRitmo(ritmoLinhas)'));
});

/* ---------- 3. só gera o que falta ---------- */

test('item já resumido, com a descrição intacta, não volta pra fila', () => {
  const i = fonteReport.indexOf('function descricoesPendentes');
  const corpo = fonteReport.slice(i, fonteReport.indexOf('\n}', i) + 2);
  assert.match(corpo, /if \(e && e\.resumo && \(!e\.de \|\| e\.de === C\.digitalDoTexto\(texto\)\)\) continue;/);
  // Item sem descrição nenhuma não entra: não há o que resumir.
  assert.match(corpo, /if \(!texto\) continue;/);
});

test('a impressão digital muda com o conteúdo, não com o espaço', () => {
  /* É ela que decide se um resumo está velho. Reindentar a descrição no DevOps
     não é mudança de conteúdo, e regerar por isso custaria à toa. */
  const a = C.digitalDoTexto('Permitir que o cliente edite o endereço.');
  assert.equal(C.digitalDoTexto('Permitir  que o cliente\n edite o endereço. '), a);
  assert.notEqual(C.digitalDoTexto('Permitir que o cliente edite o e-mail.'), a);
  assert.match(a, /^[0-9a-f]{8}$/);
  assert.equal(C.digitalDoTexto(null), C.digitalDoTexto(''));
});

test('linha escrita à mão (sem `de`) nunca é regerada', () => {
  // `!e.de` curto-circuita antes da comparação: quem escreveu decide quando
  // reescrever, não a mudança da descrição.
  const i = fonteReport.indexOf('function descricoesPendentes');
  const corpo = fonteReport.slice(i, fonteReport.indexOf('\n}', i) + 2);
  assert.match(corpo, /!e\.de \|\|/);
});

/* ---------- 4. o arquivo editorial ---------- */

test('o resumos.json é válido e se explica', () => {
  const j = JSON.parse(ler('assets/resumos.json'));
  assert.ok(j._leia.length > 200, 'sem instrução, ninguém sabe quem escreve nem como');
  // As chaves são ids e toda linha tem texto — é o mesmo contrato que o
  // saneResumos impõe na leitura, cobrado aqui no arquivo de verdade.
  for (const [id, v] of Object.entries(j.itens)) {
    assert.match(id, /^\d+$/, 'chave que não é id: ' + id);
    assert.ok(v.resumo && v.resumo.trim(), 'resumo vazio em ' + id);
    assert.ok(v.resumo.length <= 240, 'resumo passa do corte do saneador em ' + id);
  }
});

test('o saneamento do resumos.json corta texto e exige id numérico', () => {
  const m = /function saneResumos\(obj\) \{[\s\S]*?\n\}/.exec(fonteReport);
  // eslint-disable-next-line no-eval
  const saneResumos = eval(`(${m[0]})`);
  const out = saneResumos({
    51676: { resumo: '  linha boa  ', de: 'abcd1234' },
    'não-id': { resumo: 'entra pela chave errada' },
    51677: { resumo: '' },                      // sem texto, não entra
    51678: { resumo: 'x'.repeat(400) },         // cortado
  });
  assert.deepEqual(Object.keys(out).sort(), ['51676', '51678']);
  assert.equal(out['51676'].resumo, 'linha boa');
  assert.equal(out['51678'].resumo.length, 240);
});

/* ---------- 5. só o documento que declara ---------- */

test('os outros três documentos não pedem o arquivo', () => {
  /* Pedir resumos.json no report.html seria um 404 no console a cada abertura,
     dizendo que falta algo que não faz falta — eles não têm cartão de sprint. */
  assert.match(fonteReport, /if \(B\.precisaDeSprints === true\) \{\s*\n\s*carregarResumos\(\)/);
});

test('arquivo ausente degrada em silêncio', () => {
  // Sem resumos.json o cartão fica como hoje: só o título. Não é erro.
  const m = /async function carregarResumos\(\) \{[\s\S]*?\n\}/.exec(fonteReport);
  assert.match(m[0], /if \(!resp\.ok\) return;/);
  assert.match(m[0], /console\.warn/);
  assert.doesNotMatch(semComentarios(m[0]), /st\.erro/);
});

/* ---------- 6. o cartão ---------- */

test('o cartão mostra a linha, e some quando não há', () => {
  /* Item sem resumo fica só com o título: é a verdade sobre uma PBI que
     ninguém descreveu, não um buraco a tapar com texto inventado. */
  assert.match(fonteV2, /\$\{x\.resumo\s*\n?\s*\? `<span class="rt-item-resumo">\$\{esc\(x\.resumo\)\}<\/span>` : ''\}/);
});

test('o resumo é escapado, como todo texto que veio de fora', () => {
  const i = fonteV2.indexOf('const li = (x, saiu)');
  const corpo = fonteV2.slice(i, fonteV2.indexOf('`;', i));
  assert.match(corpo, /esc\(x\.resumo\)/);
  assert.doesNotMatch(corpo, /\$\{x\.resumo\}/);
});

test('a linha lê como anotação do título, não como segundo título', () => {
  const bloco = css.slice(css.indexOf('.rt-item-resumo {'));
  assert.match(bloco, /font-size: 0\.78rem/);
  assert.match(bloco, /color: var\(--mudo\)/);
  // `display: block` porque título e resumo são dois <span>: sem isso o resumo
  // correria na mesma linha do título.
  assert.match(bloco, /display: block/);
});

test('com resumo, o selo de tipo alinha pelo topo', () => {
  // Com `baseline` e título de duas linhas, o selo descia até a última linha e
  // o olho perdia a correspondência entre selo e título.
  assert.match(css, /\.rt-item:has\(\.rt-item-resumo\) \{ align-items: flex-start; \}/);
});
