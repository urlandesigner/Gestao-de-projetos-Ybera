import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularResumo } from '../resumo.mjs';

const ITEM = (over) => ({ status:null, track:null, shipped:null, health:null, ...over });

test('calcularResumo devolve exatamente tres linhas, com os rotulos fixos certos', () => {
  const r = calcularResumo([]);
  assert.equal(r.length, 3);
  assert.deepEqual(r[0].tag, { pt:'Projetos', en:'Projects' });
  assert.deepEqual(r[1].tag, { pt:'Entregas', en:'Shipped' });
  assert.deepEqual(r[2].tag, { pt:'Atenção', en:'Attention' });
});

test('linha Projetos conta total, produtos distintos e os tres status', () => {
  const itens = [
    ITEM({ status:'doing', track:'49290' }),
    ITEM({ status:'doing', track:'49290' }),
    ITEM({ status:'next', track:'49294' }),
    ITEM({ status:'done', track:'49294' }),
    ITEM({ status:null, track:'49294' }) // sem status nao entra em nenhum dos tres baldes
  ];
  const [projetos] = calcularResumo(itens);
  assert.equal(projetos.pt, '5 projetos em 2 produtos: 2 em curso, 1 planejados, 1 concluídos.');
  assert.equal(projetos.en, '5 projects across 2 products: 2 in flight, 1 planned, 1 shipped.');
});

test('linha Projetos com zero itens nao quebra e conta zero produtos', () => {
  const [projetos] = calcularResumo([]);
  assert.equal(projetos.pt, '0 projetos em 0 produtos: 0 em curso, 0 planejados, 0 concluídos.');
});

/* item com track null (sem produto) nao deveria contar como um "produto" —
   new Set(...).size so soma tracks nao nulos. */
test('linha Projetos ignora track null na contagem de produtos', () => {
  const itens = [ITEM({ status:'doing', track:null }), ITEM({ status:'doing', track:'49290' })];
  const [projetos] = calcularResumo(itens);
  assert.match(projetos.pt, /em 1 produtos:/);
});

test('linha Entregas: zero entrega registrada', () => {
  const itens = [ITEM({ status:'doing' }), ITEM({ status:'done', shipped:null })];
  const [, entregas] = calcularResumo(itens);
  assert.equal(entregas.pt, 'Nenhuma entrega registrada com data de conclusão ainda.');
  assert.equal(entregas.en, 'No delivery with a recorded close date yet.');
});

test('linha Entregas: uma entrega usa singular em pt e o mes por extenso', () => {
  const itens = [ITEM({ status:'done', shipped:'2026-08' })];
  const [, entregas] = calcularResumo(itens);
  assert.equal(entregas.pt, '1 entrega no mês de agosto.');
  assert.equal(entregas.en, '1 shipped in August.');
});

test('linha Entregas: mais de uma entrega no mesmo mes usa plural', () => {
  const itens = [
    ITEM({ status:'done', shipped:'2026-08' }),
    ITEM({ status:'done', shipped:'2026-08' })
  ];
  const [, entregas] = calcularResumo(itens);
  assert.equal(entregas.pt, '2 entregas no mês de agosto.');
  assert.equal(entregas.en, '2 shipped in August.');
});

/* O mes MAIS RECENTE manda, mesmo que outro mes tenha mais entregas — a
   linha fala do que aconteceu por ultimo, nao do mes mais cheio. */
test('linha Entregas usa o mes mais recente, nao o mes com mais entregas', () => {
  const itens = [
    ITEM({ status:'done', shipped:'2026-04' }),
    ITEM({ status:'done', shipped:'2026-04' }),
    ITEM({ status:'done', shipped:'2026-04' }),
    ITEM({ status:'done', shipped:'2026-08' })
  ];
  const [, entregas] = calcularResumo(itens);
  assert.equal(entregas.pt, '1 entrega no mês de agosto.');
});

test('linha Entregas ignora item done sem shipped registrado', () => {
  const itens = [ITEM({ status:'done', shipped:null }), ITEM({ status:'done', shipped:'2026-08' })];
  const [, entregas] = calcularResumo(itens);
  assert.equal(entregas.pt, '1 entrega no mês de agosto.');
});

test('linha Atenção: zero travado', () => {
  const itens = [ITEM({ status:'doing', health:null })];
  const [, , atencao] = calcularResumo(itens);
  assert.equal(atencao.pt, 'Nada travado.');
  assert.equal(atencao.en, 'Nothing blocked.');
});

test('linha Atenção: um travado usa singular', () => {
  const itens = [ITEM({ status:'doing', health:'blocked' })];
  const [, , atencao] = calcularResumo(itens);
  assert.equal(atencao.pt, '1 travado no Azure DevOps.');
  assert.equal(atencao.en, '1 blocked in Azure DevOps.');
});

test('linha Atenção: mais de um travado usa plural em pt, mesma forma em en', () => {
  const itens = [
    ITEM({ status:'doing', health:'blocked' }),
    ITEM({ status:'doing', health:'blocked' }),
    ITEM({ status:'next', health:'blocked' })
  ];
  const [, , atencao] = calcularResumo(itens);
  assert.equal(atencao.pt, '3 travados no Azure DevOps.');
  assert.equal(atencao.en, '3 blocked in Azure DevOps.');
});

/* "watch" e editorial (prosa.js), nao um sinal do Azure DevOps — este
   calculo roda no sync, antes de prosa.js existir, e nao deve contar isso
   como travado. */
test('linha Atenção nao conta health "watch", so "blocked"', () => {
  const itens = [ITEM({ status:'doing', health:'watch' })];
  const [, , atencao] = calcularResumo(itens);
  assert.equal(atencao.pt, 'Nada travado.');
});
