/* SUSTENTAÇÃO NÃO É ENTREGA.

   Decisão do Urlan em 05/10/2026, logo depois de Bug passar a contar: correção
   conta, mas o que está pendurado no guarda-chuva de Sustentação é manutenção
   e não entra no relatório mensal.

   O que torna isto digno de teste e não de uma linha solta: a regra é de
   ANCESTRALIDADE. O item excluído não se chama "Sustentação" — ele se chama
   "Cobrança incorreta de frete na Loja Interna" e quem é guarda-chuva é o pai.
   Quem lê a regra na tela não tem como conferir, e um erro aqui tira (ou
   devolve) dezenas de itens do número que vai pro stakeholder. */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');

const it = (id, titulo, pai, tipo) => ({
  id,
  fields: {
    'System.Title': titulo,
    'System.Parent': pai,
    'System.WorkItemType': tipo || 'Bug',
    'System.State': 'Done',
  },
});

test('o guarda-chuva e os filhos dele saem; o resto fica', () => {
  const base = [
    it(1, 'Sustentação Sprint 19', undefined, 'Product Backlog Item'),
    it(2, 'Cobrança incorreta de frete', 1),
    it(3, 'Nova PDP com galeria', undefined, 'Product Backlog Item'),
  ];
  assert.deepEqual([...C.idsDeManutencao(base)].sort(), [1, 2]);
  assert.deepEqual(C.foraDaManutencao(base, base).map((x) => x.id), [3]);
});

/* Três níveis: bug → PBI → Sustentação. A regra sobe a cadeia inteira, não só
   um degrau — foi o motivo de ela não caber num filtro de título simples. */
test('neto de sustentação também sai', () => {
  const base = [
    it(1, 'Sustentação Sprint 20', undefined, 'Product Backlog Item'),
    it(2, 'Correções de checkout', 1, 'Product Backlog Item'),
    it(3, 'Pedido duplicado no PIX', 2),
  ];
  assert.deepEqual([...C.idsDeManutencao(base)].sort(), [1, 2, 3]);
});

/* A âncora no começo do título é o que separa o guarda-chuva de um item que
   só FALA de sustentação. Sem ela, entrega de verdade sumiria do relatório. */
test('item que só menciona sustentação no meio do título continua contando', () => {
  const base = [it(1, 'Bug na sustentação do checkout'), it(2, 'Melhoria de sustentabilidade')];
  assert.equal(C.idsDeManutencao(base).size, 0);
});

test('o casamento ignora acento, caixa e colchete', () => {
  for (const t of ['Sustentação Sprint 19', 'SUSTENTACAO SPRINT 19', 'sustentaçao sprint 19', '[Sustentação] Sprint 19']) {
    assert.equal(C.ehItemDeManutencao(t), true, `"${t}" devia ser reconhecido como guarda-chuva`);
  }
  for (const t of ['', null, undefined, 'Sustentabilidade', 'Resustentação']) {
    assert.equal(C.ehItemDeManutencao(t), false, `"${t}" não é guarda-chuva`);
  }
});

/* O guarda-chuva mora fora do recorte do PO quase sempre — é de outro dono.
   Se a cadeia for lida só dentro do recorte, o filho vira órfão e volta a
   contar. Por isso `base` e `items` são argumentos separados. */
test('a cadeia é lida na base completa, não só no recorte filtrado', () => {
  const guardaChuva = it(1, 'Sustentação Sprint 19', undefined, 'Product Backlog Item');
  const meuBug = it(2, 'Estorno de saldo bloqueado', 1);
  const pais = [guardaChuva];
  const meus = [meuBug];
  assert.deepEqual(C.foraDaManutencao(meus, meus.concat(pais)).map((x) => x.id), [],
    'com o pai na base, o bug sai');
  assert.deepEqual(C.foraDaManutencao(meus, meus).map((x) => x.id), [2],
    'sem o pai na base não dá pra afirmar — e na dúvida o item conta');
});

test('ciclo de pais não trava a regra', () => {
  const base = [it(1, 'A', 2), it(2, 'B', 1)];
  assert.equal(C.idsDeManutencao(base).size, 0);
});

test('lista vazia ou inválida não quebra', () => {
  assert.equal(C.idsDeManutencao([]).size, 0);
  assert.equal(C.idsDeManutencao(null).size, 0);
  assert.deepEqual(C.foraDaManutencao(null, null), []);
});

/* O filtro mora num ponto só do report.js — de lá descem o documento, o placar
   e o pacote do link de leitura. Aplicá-lo em dois lugares e esquecer um
   terceiro é exatamente como a capa e o corpo do report passaram a discordar
   da última vez. E os PAIS não podem ser filtrados junto: sem o guarda-chuva
   na base, os filhos viram órfãos e voltam a contar. */
test('o report filtra uma vez só, na origem, e preserva os pais', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'assets', 'report.js'), 'utf8');
  const chamadas = fonte.match(/C\.foraDaManutencao\([^)]*\)/g) || [];
  assert.equal(chamadas.length, 1, 'mais de um ponto de filtro: um deles vai ficar pra trás');
  assert.match(chamadas[0], /todos, todos\.concat\(st\.pais\)/,
    'a cadeia precisa ser lida com os pais juntos, senão o guarda-chuva não é visto');
  assert.match(fonte, /st\.items = C\.foraDaManutencao/,
    'o filtro tem que ser na origem: o link de leitura é empacotado a partir de st.items');
});
