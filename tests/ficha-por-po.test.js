/* A FICHA DE CADA PO: retranca e contato do documento de Entregas.

   Até 13/10/2026 as duas eram constantes: a retranca dizia "Ybera US ·
   E-commerce" e o rodapé trazia o email do Urlan, em QUALQUER relatório. Com a
   Isadora e a Daniele escrevendo os documentos delas, isso é o mesmo erro dos
   cartões e do roadmap em outra roupa — o stakeholder da Daniele lê "Ybera US",
   e a dúvida dele sobre o relatório dela vai parar na caixa do Urlan.

   O que estes testes guardam é que as TRÊS coisas que dizem de quem é o
   documento — cartões, retranca e contato — saem da MESMA chave. Divergir foi
   exatamente o defeito que pôs a assinatura de uma PO em cima das entregas de
   outro, e ele não se vê olhando: o documento renderiza bonito e errado. */
const test = require('node:test');
const assert = require('node:assert/strict');

const C = require('../assets/core.js');
const { cartoesDe } = require('./conteudo'); // os cartões agora vêm do arquivo, não do módulo
const BASE = require('../assets/briefing-entregas.js');

const AGORA = Date.parse('2026-10-05T12:00:00Z');

// A mesma forma que o report.js monta: a chave sai do nome que assina.
function documentoDe(nome) {
  const chavePO = C.chaveDePessoa(nome);
  const html = BASE.htmlReport({
    items: [], todos: [], agora: AGORA, escopo: nome, unidade: 'Ybera US',
    chavePO, periodo: BASE.periodoDoDocumento(), cartoes: cartoesDe(chavePO, BASE.edicao),
  }).html;
  return {
    html,
    retranca: (/>([^<>]*·[^<>]*)</.exec(html) || [, ''])[1].trim(),
    emails: [...html.matchAll(/mailto:([^"]+)"/g)].map((m) => m[1]),
  };
}

/* ---------- a ficha ---------- */

test('cada PO tem a sua unidade, a sua área e o seu email', () => {
  assert.deepEqual(C.fichaDaPessoa('Urlan Dipre'),
    { unidade: 'Ybera US', area: 'E-commerce', email: 'urlan.dipre@ybera.com' });
  assert.deepEqual(C.fichaDaPessoa('Isadora Brunner'),
    { unidade: 'Ybera Global', area: 'Loja interna', email: 'isadora.brunner@ybera.com' });
  assert.deepEqual(C.fichaDaPessoa('Daniele de Paula'),
    { unidade: 'Ybera Brasil', area: 'E-commerce', email: 'daniele.depaula@ybera.com' });
});

test('a ficha sobrevive a sobrenome, acento e caixa', () => {
  /* Mesma régua do roadmap, e pelo mesmo motivo: o nome de exibição do DevOps
     muda sem avisar — sobrenome que entra ou sai, nome social, grafia diferente
     entre contas. Casar pela string inteira faria o email da pessoa voltar a
     ser o do Urlan no dia em que ela arrumasse o próprio nome. */
  for (const n of ['Isadora', 'ISADORA BRUNNER', '  isadora  ', 'Isadóra Brunner']) {
    assert.equal((C.fichaDaPessoa(n) || {}).email, 'isadora.brunner@ybera.com', n);
  }
  // e aceita a chave já resolvida, pra quem já a tem na mão
  assert.equal((C.fichaDaPessoa('daniele') || {}).unidade, 'Ybera Brasil');
});

test('quem não está na lista devolve null, não uma ficha inventada', () => {
  /* `null` é "não sei quem é", e o documento sabe o que fazer com isso: mantém
     o que o controlador mandou. Uma ficha genérica faria a capa AFIRMAR uma
     unidade que ninguém escreveu. */
  assert.equal(C.fichaDaPessoa('Fulano Novo'), null);
  assert.equal(C.fichaDaPessoa(''), null);
  assert.equal(C.fichaDaPessoa(null), null);
});

/* ---------- o documento ---------- */

test('a retranca do topo é a da PO que assina', () => {
  assert.equal(documentoDe('Urlan Dipre').retranca, 'Ybera US · E-commerce');
  assert.equal(documentoDe('Daniele de Paula').retranca, 'Ybera Brasil · E-commerce');
  assert.equal(documentoDe('Isadora Brunner').retranca, 'Ybera Global · Loja interna');
});

test('o contato do rodapé é o da PO que assina', () => {
  /* Quem responde o rodapé é o stakeholder daquele relatório: a pergunta tem
     que cair na PO dele, não numa caixa que não escreveu o documento. */
  assert.deepEqual(documentoDe('Isadora Brunner').emails, ['isadora.brunner@ybera.com']);
  assert.deepEqual(documentoDe('Daniele de Paula').emails, ['daniele.depaula@ybera.com']);
  assert.deepEqual(documentoDe('Urlan Dipre').emails, ['urlan.dipre@ybera.com']);
});

test('o email de uma PO não vaza pro documento de outra', () => {
  /* O defeito desta família sempre teve a mesma forma: uma parte do documento
     seguindo uma pessoa e outra parte seguindo outra. */
  for (const nome of ['Isadora Brunner', 'Daniele de Paula']) {
    const d = documentoDe(nome);
    assert.doesNotMatch(d.html, /urlan\.dipre@ybera\.com/, nome + ' trouxe o email do Urlan');
    assert.doesNotMatch(d.retranca, /Ybera US/, nome + ' trouxe a unidade do Urlan');
  }
});

test('sem ficha, o documento mantém o que o controlador mandou', () => {
  /* É o caminho de todo link e todo arquivo já publicado: nada muda pra quem
     não está na lista, e a retranca não vira texto inventado. */
  const d = documentoDe('Fulano Novo');
  assert.equal(d.retranca, 'Ybera US · E-commerce');
  assert.deepEqual(d.emails, ['urlan.dipre@ybera.com']);
});

test('cartões, retranca e contato saem da MESMA chave', () => {
  /* O invariante da família inteira. Os cartões do Urlan existem; os das outras
     duas ainda não foram escritos. Se um dia a retranca andar sem os cartões,
     volta o documento que assina um nome e mostra o conteúdo de outro. */
  const chave = C.chaveDePessoa('Isadora Brunner');
  assert.deepEqual(cartoesDe(chave, BASE.edicao), [], 'a Isadora ainda não escreveu cartão');
  const d = documentoDe('Isadora Brunner');
  assert.equal(d.retranca, 'Ybera Global · Loja interna');
  assert.ok(cartoesDe(C.chaveDePessoa('Urlan Dipre'), BASE.edicao).length > 0);
});
