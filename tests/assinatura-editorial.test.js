/* O DOCUMENTO DE ENTREGAS NÃO TEM RECORTE POR PESSOA.

   Em 13/10/2026 o Urlan escolheu a Isadora no seletor de responsável da
   Central, clicou em "Entregas" no menu, e o documento de Agosto e Setembro
   abriu assinado "Product Owner: Isadora Brunner", com 3 itens entregues,
   exibindo os cartões dele — "Nova Homepage", "Nova PDP", "Translate loja".

   Nada ali era mentira por acidente de desenho. O filtro de responsável mora
   no localStorage e é COMPARTILHADO com a Central (`central.filtros`), então
   escolher alguém lá basta. O que o filtro fazia no documento era:

   - virar a assinatura da capa, porque o recorte e o `escopo` eram o mesmo
     campo;
   - mudar o "Itens entregues", porque a contagem de PBIs roda sobre a lista já
     filtrada — e o número virava "quantas PBIs das Features DESTES cartões
     estão atribuídas a essa pessoa". Não é o número dela nem o dele.

   O "Projetos atendidos" nem se mexia: são as iniciativas escritas à mão.

   É a mesma forma do roadmap sem dono, corrigido no mesmo dia: desenho
   impecável, nome de outra pessoa, e quem lê não tem como desconfiar. Por isso
   vale teste e não comentário — a tela não quebra, ela afirma.

   O que estes testes guardam é a DECLARAÇÃO e o seu alcance: quem declara,
   quem herda, quem NÃO herda, e os quatro lugares do report.js que respondem a
   ela. O report.js não é requerível (mexe em window), então aqui se lê a
   fonte — e se lê um trecho recortado, nunca o arquivo inteiro, senão o teste
   casa com o comentário que explica o próprio teste. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASE = require('../assets/briefing-entregas.js');
// require do v2 DEPOIS do base: ele faz Object.assign por cima.
const V2 = require('../assets/briefing-entregas-v2.js');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

/* Comentário é prosa, e prosa que explica o teste contém as palavras que o
   teste procura. Sem isto, `doesNotMatch` casa com a própria explicação —
   aconteceu quatro vezes neste projeto. */
function semComentarios(js) {
  let fora = '';
  let i = 0;
  while (i < js.length) {
    if (js[i] === '/' && js[i + 1] === '*') { i = js.indexOf('*/', i + 2); i = i < 0 ? js.length : i + 2; continue; }
    if (js[i] === '/' && js[i + 1] === '/') { const n = js.indexOf('\n', i); i = n < 0 ? js.length : n; continue; }
    fora += js[i]; i += 1;
  }
  return fora;
}

/* O corpo de UMA função, do cabeçalho até a chave que o fecha. Grep no arquivo
   inteiro acha a palavra em qualquer lugar e prova nada sobre esta função. */
function corpo(js, cabecalho) {
  const ini = js.indexOf(cabecalho);
  assert.notEqual(ini, -1, 'não achei `' + cabecalho + '` — a função mudou de nome?');
  let i = js.indexOf('{', ini);
  let n = 0;
  for (let j = i; j < js.length; j += 1) {
    if (js[j] === '{') n += 1;
    else if (js[j] === '}') { n -= 1; if (!n) return js.slice(ini, j + 1); }
  }
  assert.fail('não achei o fim de `' + cabecalho + '`');
}

/* ---------- quem declara ---------- */

test('as duas edições de Entregas se declaram editoriais', () => {
  assert.equal(BASE.documentoEditorial, true);
  /* Herdado, não repetido: o v2 faz Object.assign por cima do base. Se um dia
     ele parar de herdar, este teste cai antes de o documento sair assinado com
     o nome errado de novo. */
  assert.equal(V2.documentoEditorial, true);
});

test('o report-v2 NÃO é editorial — é tela de trabalho, e o seletor é dele', () => {
  /* O report.js serve os três documentos. Comportamento novo é opt-in por
     declaração; herdar por engano tiraria do PO o recorte que ele usa pra
     olhar o próprio trabalho. */
  assert.equal(require('../assets/briefing-v2.js').documentoEditorial, undefined);
});

/* ---------- o alcance da declaração no report.js ---------- */

const REPORT = semComentarios(ler('assets/report.js'));

/* As quatro funções que decidem isto, RODANDO — e não procuradas por grep.
   Grep prova que a palavra está no arquivo; o que importa é o valor que a
   função devolve. Elas só dependem de `B` e `st`, então rodam fora do
   navegador com os dois forjados. */
function reportComDocumento(doc, estado) {
  const fonte = ['function respAtivo()', 'function assinatura(recorte)',
    'function doResponsavel(it, alvo)', 'function noNome(it)']
    .map((c) => corpo(REPORT, c)).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('B', 'st', fonte
    + '\nreturn { respAtivo, assinatura, noNome };')(doc, estado);
}

const ISADORA = { fields: { 'System.AssignedTo': { displayName: 'Isadora Brunner' } } };
const URLAN = { fields: { 'System.AssignedTo': { displayName: 'Urlan Dipre' } } };

/* O estado EXATO de 13/10/2026: o Urlan é o dono do token, e o filtro guardado
   no localStorage (escolhido na Central) aponta pra Isadora. */
const COMO_ACONTECEU = { resp: 'Isadora Brunner', usuario: 'Urlan Dipre', po: 'Urlan Dipre' };

test('o documento editorial ignora o filtro e assina quem escreveu', () => {
  const r = reportComDocumento({ documentoEditorial: true }, COMO_ACONTECEU);
  assert.equal(r.respAtivo(), '', 'o recorte tem que morrer aqui');
  assert.equal(r.assinatura(r.respAtivo()), 'Urlan Dipre',
    'a capa voltou a assinar quem o filtro aponta');
  // e nenhum item é descartado por causa de uma pessoa escolhida em outra tela
  assert.equal(r.noNome(ISADORA), true);
  assert.equal(r.noNome(URLAN), true);
});

test('no editorial, o dono do token NÃO assina — quem escreveu assina', () => {
  /* A Isadora abrindo o documento do Urlan: a capa continua dizendo o nome
     dele, porque o texto é dele. É o contrário do que acontecia. */
  const r = reportComDocumento({ documentoEditorial: true },
    { resp: null, usuario: 'Isadora Brunner', po: 'Urlan Dipre' });
  assert.equal(r.assinatura(r.respAtivo()), 'Urlan Dipre');
});

test('o report-v2 mantém o filtro e a assinatura de sempre', () => {
  /* O mesmo controlador serve a tela de trabalho do PO, e lá recortar por
     pessoa é a intenção. Se esta parte mudar, a correção vazou pra fora do
     documento. */
  const r = reportComDocumento({}, COMO_ACONTECEU);
  assert.equal(r.respAtivo(), 'Isadora Brunner');
  assert.equal(r.assinatura(r.respAtivo()), 'Isadora Brunner');
  assert.equal(r.noNome(ISADORA), true);
  assert.equal(r.noNome(URLAN), false, 'o recorte do report-v2 parou de recortar');
});

test('fora do editorial, a capa não cai em branco quando o DevOps não diz o nome', () => {
  /* Os paraquedas: `currentUser` devolve STRING VAZIA sem lançar erro, e capa
     sem assinatura foi ao ar três vezes em 08/10/2026. */
  const r = reportComDocumento({}, { resp: '', usuario: '', po: 'Urlan Dipre' });
  assert.equal(r.assinatura(r.respAtivo()), 'Urlan Dipre');
});

test('a tela e o pacote assinam pela MESMA função', () => {
  /* Metade do defeito foi a cadeia de assinatura existir só dentro do
     `pacoteDoDocumento`: a tela respondia uma coisa e o arquivo publicado
     outra. Duas fontes pro mesmo nome é como elas passam a discordar. */
  assert.match(REPORT, /escopo: st\.leitura \? st\.escopo : assinatura\(respAtivo\(\)\)/);
  assert.match(corpo(REPORT, 'function pacoteDoDocumento(semRecorte)'), /const escopo = assinatura\(recorte\)/);
});

test('o seletor de responsável não aparece no documento editorial', () => {
  /* Seletor que aceita escolha e não muda nada é pior que seletor ausente:
     quem escolhe conclui que está vendo o recorte que pediu. */
  const f = corpo(REPORT, 'function renderFiltro()');
  assert.match(f, /documentoEditorial === true.*sel\.hidden = true;\s*return;/s);
  // e some ANTES de montar a lista de nomes, senão o controle aparece preenchido
  assert.ok(f.indexOf('documentoEditorial') < f.indexOf('new Set()'),
    'a saída pelo editorial tem que vir antes de montar as opções');
});

/* ---------- o que o documento editorial é, afinal ---------- */

test('os cartões do documento são texto escrito à mão, não vêm do DevOps', () => {
  /* A razão de a declaração existir. No dia em que os cartões passarem a vir
     do board, filtrar por pessoa volta a significar alguma coisa — e este
     teste cai, que é o lembrete de reabrir a decisão. */
  const cartoes = BASE.cartoesDoDocumento();
  assert.ok(cartoes.length > 0);
  for (const c of cartoes) assert.equal(typeof c.titulo, 'string');
  const fonte = ler('assets/briefing-entregas.js');
  assert.match(fonte, /ENTREGAS_RECENTES/);
});
