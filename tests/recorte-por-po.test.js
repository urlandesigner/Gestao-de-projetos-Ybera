/* O RECORTE POR PO VALE NO DOCUMENTO INTEIRO — capa, cartões e roadmap.

   A história deste arquivo é de duas decisões opostas em dois dias, e ele
   guarda a segunda sem apagar a primeira, porque é a primeira que explica o
   que pode dar errado.

   13/10/2026: o Urlan escolheu a Isadora no seletor da Central, clicou em
   Entregas, e o documento de Agosto e Setembro abriu assinado "Product Owner:
   Isadora Brunner", com 3 itens entregues, exibindo os cartões DELE — "Nova
   Homepage", "Nova PDP", "Translate loja". O filtro mora no localStorage e é
   compartilhado com a Central, então bastou escolher lá. A correção daquele
   dia foi desligar o recorte no documento: ele passou a ignorar o filtro e a
   assinar sempre quem escreveu.

   14/10/2026: o Urlan decidiu o contrário, e pela raiz — "o PO que estiver
   selecionado deve ver as informações referentes a ele, dentro da central, o
   roadmap e os relatórios". Os CARTÕES passaram a ser por PO
   (ENTREGAS_POR_PO), e com isso o recorte voltou a poder existir: escolher a
   Isadora mostra os cartões dela, não o nome dela sobre os cartões dele.

   O QUE ESTES TESTES GUARDAM é que as três coisas andem JUNTAS. O defeito de
   13/10 não foi o filtro existir: foi a capa seguir a escolha enquanto o texto
   embaixo seguia outra pessoa. Qualquer uma das três voltando a divergir
   reconstrói o mesmo defeito com outra cara. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const BE = require('../assets/briefing-entregas.js');
const V2 = require('../assets/briefing-entregas-v2.js');
const C = require('../assets/core.js');
const fonteReport = ler('assets/report.js');

const AGORA = Date.UTC(2026, 8, 30, 12);
const doc = (chavePO, escopo) => BE.htmlReport({
  items: [], todos: [], agora: AGORA, unidade: 'Ybera US',
  chavePO, escopo: escopo === undefined ? 'Urlan Dipre' : escopo,
}).html;

test('as três coisas saem da MESMA pessoa', () => {
  /* Uma régua só: a capa assina `assinatura(respAtivo())`, a chave dos cartões
     é essa mesma assinatura normalizada, e o roadmap pergunta por ela. Foi a
     divergência entre duas delas que produziu o defeito de 13/10. */
  assert.match(fonteReport, /chavePO: C\.chaveDePessoa\(st\.leitura \? st\.escopo : assinatura\(respAtivo\(\)\)\)/,
    'a chave dos cartões deixou de sair da mesma assinatura da capa');
  assert.match(fonteReport, /C\.roadmapDaPessoa\(st\.roadmapDoc, assinatura\(respAtivo\(\)\)\)/,
    'o roadmap deixou de seguir quem assina a capa');
});

test('cada PO tem o bloco dela nas duas edições', () => {
  for (const [nome, mod] of [['ago/set', BE], ['outubro', V2]]) {
    assert.ok(mod.cartoesDoDocumento('urlan').length > 0, `${nome}: o Urlan perdeu os cartões`);
    for (const po of ['isadora', 'daniele']) {
      assert.deepEqual(mod.cartoesDoDocumento(po), [], `${nome}: ${po} não deveria ter cartão ainda`);
    }
  }
});

/* O PEDIDO DO URLAN, LITERAL: "Se Isadora e Daniele ainda não tiverem card
   para o relatório, ele deve ficar vazio, apenas com a estrutura da página."
   Vazio é resposta — cair nos cartões de outra pessoa é o defeito de 13/10. */
test('PO sem cartão abre o documento vazio, com a estrutura de pé', () => {
  const vazio = doc('isadora', 'Isadora Brunner');
  for (const titulo of ['Nova Homepage', 'Tradução do site', 'Novo cart drawer']) {
    assert.ok(!vazio.includes(titulo), `"${titulo}" do Urlan vazou pro documento da Isadora`);
  }
  // A estrutura fica: capa com o nome dela, e o corpo do documento existe.
  assert.match(vazio, /Isadora Brunner/, 'a capa perdeu a assinatura de quem está selecionada');
  assert.match(vazio, /class="report-doc/, 'o documento inteiro sumiu, não só os cartões');
  assert.match(vazio, /rl-capa/, 'a capa sumiu junto com os cartões');
});

test('sem saber de quem é, nenhum cartão aparece', () => {
  /* Chave vazia não pode cair numa lista padrão. Era assim que "o documento de
     outubro abria com os cartões de agosto" acontecia, e é a mesma forma do
     roadmap sem dono. */
  assert.deepEqual(BE.cartoesDoDocumento(''), []);
  assert.deepEqual(BE.cartoesDoDocumento(undefined), []);
  assert.deepEqual(V2.cartoesDoDocumento('ninguem'), []);
  assert.ok(!doc('', '').includes('Nova Homepage'), 'cartão do Urlan apareceu sem chave nenhuma');
});

test('a chave sai do nome por uma régua só, a do core', () => {
  // "Urlan Maciel Dipré" e "Urlan Dipre" são a mesma pessoa; o DevOps troca o
  // nome de exibição sem avisar.
  assert.equal(C.chaveDePessoa('Urlan Maciel Dipré'), 'urlan');
  assert.ok(BE.cartoesDoDocumento(C.chaveDePessoa('Urlan Maciel Dipré')).length > 0);
  // E o report.js não tem régua própria: pede a do core.
  assert.doesNotMatch(fonteReport, /normalize\('NFD'\)/,
    'o report.js ganhou uma segunda régua de casar nome — ela vai divergir da do core');
});

test('o seletor de responsável voltou a aparecer no relatório', () => {
  /* Ele tinha sido escondido em 13/10, quando escolher outra PO não mudava o
     que estava escrito. Agora muda, e esconder o controle seria esconder o
     caminho pro que o Urlan pediu. */
  const m = /function renderFiltro\(\) \{[\s\S]*?\n\}/.exec(fonteReport);
  assert.ok(m, 'renderFiltro sumiu — este teste precisa acompanhar');
  /* Esconder quando NÃO HÁ nome nenhum pra oferecer continua certo. O que não
     pode voltar é o desvio antes disso, que escondia por ser este documento. */
  const antesDaLista = m[0].slice(0, m[0].indexOf('const nomes'));
  assert.doesNotMatch(antesDaLista, /return;/, 'o seletor voltou a ser escondido antes de olhar a lista');
});

test('nenhuma declaração sobrou descrevendo o desenho antigo', () => {
  /* `documentoEditorial` existia pra desligar o recorte. Com o recorte de
     volta, uma declaração que ninguém lê é pior que nenhuma: a próxima pessoa
     a abrir o arquivo acredita nela. */
  for (const arq of ['assets/report.js', 'assets/briefing-entregas.js', 'assets/briefing-entregas-v2.js']) {
    assert.doesNotMatch(ler(arq), /documentoEditorial/, `${arq} ainda declara o desenho que saiu`);
  }
});

test('os cartões continuam sendo texto escrito à mão, não o board', () => {
  // O board vazio não pode esvaziar o documento: o que o PO escreveu fica.
  const comBoardVazio = doc('urlan');
  assert.match(comBoardVazio, /Novos componentes visuais para HOME/,
    'os cartões curados sumiram com o board vazio — eles não vêm do DevOps');
});
