/* CARTÕES AUTOMÁTICOS DA ABA ENTREGAS (15/10/2026).

   Em 14/10 o relatório de outubro tinha 2 cartões escritos e 6 PBIs concluídas
   fora deles, e quem lia achava que só aquilo tinha saído. Agora toda Feature
   com PBI concluída no período vira cartão sozinha; o cartão escrito continua
   mandando na frente que ele declara em `featureIds`. Agosto/setembro fica
   como está: relatório fechado e já compartilhado. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const C = require('../assets/core.js');
const V2 = require('../assets/briefing-entregas-v2.js');

const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const MATERIAL = {
  itens: [
    { id: 11, titulo: 'Corrige brinde', estado: 'Done', fechadoEm: '2026-10-08', frente: 'f:100', descricao: 'TEXTO INTERNO com link https://dev.azure.com/x' },
    { id: 12, titulo: 'Limite no endereço', estado: 'Done', fechadoEm: '2026-10-09', frente: 'f:200', descricao: 'outra descrição crua' },
    { id: 13, titulo: 'Spike de pagamento', estado: 'Done', fechadoEm: '2026-10-13', frente: 'f:200', descricao: '' },
    { id: 14, titulo: 'Sem dono', estado: 'Done', fechadoEm: '2026-10-10', frente: 'sem-frente', descricao: '' },
  ],
  frentes: [
    { chave: 'f:100', feature: { id: 100, nome: '[EUA] Promoções' }, epico: { id: 9, nome: 'Loja Clube USA' }, noPeriodo: 1, total: 4 },
    { chave: 'f:200', feature: { id: 200, nome: '[EUA] Melhorias no checkout' }, epico: { id: 9, nome: 'Loja Clube USA' }, noPeriodo: 2, total: 2 },
    { chave: 'sem-frente', feature: null, epico: null, noPeriodo: 1, total: 1 },
  ],
};
const RESUMOS = { 11: { resumo: 'Corrige o brinde em pedidos abaixo do mínimo.' } };

test('o material vira cartão só com o que pode ir a público', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  assert.deepEqual(auto.map((f) => f.feature.id), [100, 200], 'item sem Feature não vira cartão');
  assert.equal(auto[0].itens[0].resumo, 'Corrige o brinde em pedidos abaixo do mínimo.');
  assert.equal(auto[1].itens.length, 2);
  // A descrição crua é o motivo de o `_entregas` nunca ser publicado.
  assert.doesNotMatch(JSON.stringify(auto), /TEXTO INTERNO|descri/);
});

test('o pacote forjado é saneado', () => {
  const auto = C.saneAutomaticos([
    { feature: { id: 'x', nome: 'sem id' }, itens: [{ id: 1, titulo: 'a' }] },
    { feature: { id: 5, nome: 'Vazia' }, itens: [] },
    { feature: { id: 6, nome: 'Boa' }, itens: [{ id: '7', titulo: 'ok', fechadoEm: '<script>', resumo: 3 }] },
  ]);
  assert.equal(auto.length, 1);
  assert.deepEqual(auto[0].itens[0], { id: 7, titulo: 'ok', fechadoEm: '', resumo: '3' });
  assert.deepEqual(C.saneAutomaticos('lixo'), []);
});

test('o cartão escrito cobre a frente que declara; o resto ganha o automático', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const escritos = [{ titulo: 'Brindes, escrito', featureIds: [100] }, { titulo: 'Sem frente declarada' }];
  const todos = V2.comAutomaticos(escritos, auto);
  assert.deepEqual(todos.map((c) => c.titulo),
    ['Brindes, escrito', 'Sem frente declarada', 'Melhorias no checkout']);
  const novo = todos[2];
  assert.equal(novo.automatico, true);
  // A conta é o que fechou NO PERÍODO, não a história inteira da Feature.
  assert.equal(novo.contaFixa, 2);
  assert.equal(novo.titulo, 'Melhorias no checkout', 'a etiqueta [EUA] do board sai do título');
});

/* A PONTE COM O ROADMAP (21/10/2026). Sem ela todo cartão automático caía em
   "Outras entregas", inclusive frente que É projeto do roadmap: o Subscription
   de outubro ficou lá, e a capa contou 1 projeto em vez de 2. A linha do
   roadmap agora declara as Features dela em `featureIds`. */
test('a Feature declarada no roadmap herda a iniciativa daquela linha', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const roadmap = [
    { titulo: 'Promoções da loja', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] },
  ];
  const todos = V2.comAutomaticos([], auto, roadmap);
  assert.equal(todos[0].iniciativa, 'Promoções da loja');
  assert.equal(todos[0].foraDoRoadmap, undefined, 'frente do roadmap não é marcada como fora dele');
  assert.deepEqual(todos[0].entregues.map((i) => i.id), [11], 'a lista de itens continua no cartão');
  assert.equal(todos[1].iniciativa, undefined, 'Feature não declarada segue sem iniciativa');
});

test('sem roadmap, ou com linha sem featureIds, nada muda', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  for (const rm of [undefined, [], 'lixo', [{ titulo: 'X', inicio: '2026-10-01', fim: '2026-10-31' }]]) {
    assert.ok(V2.comAutomaticos([], auto, rm).every((c) => c.iniciativa === undefined));
  }
});

test('a mesma Feature em duas linhas do roadmap fica na primeira', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const roadmap = [
    { titulo: 'Primeira', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] },
    { titulo: 'Segunda', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] },
  ];
  assert.equal(V2.comAutomaticos([], auto, roadmap)[0].iniciativa, 'Primeira');
});

test('o cartão escrito que declara a Feature continua mandando nela', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const roadmap = [{ titulo: 'Promoções da loja', inicio: '2026-10-01', fim: '2026-10-31', featureIds: [100] }];
  const todos = V2.comAutomaticos([{ titulo: 'Escrito', featureIds: [100] }], auto, roadmap);
  assert.deepEqual(todos.map((c) => c.titulo), ['Escrito', 'Melhorias no checkout']);
});

test('agosto/setembro não ganha cartão automático', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  try {
    V2.escolherEdicao('2026-08');
    assert.deepEqual(V2.comAutomaticos([], auto), []);
  } finally {
    V2.escolherEdicao('2026-10');
  }
  assert.equal(V2.comAutomaticos([], auto).length, 2);
});

test('o cartão automático aparece no documento com a lista e conta na capa', () => {
  const auto = C.automaticosDoMaterial(MATERIAL, RESUMOS);
  const html = V2.htmlReport({ items: [], todos: [], agora: Date.parse('2026-10-14T12:00:00Z'),
    chavePO: 'urlan', cartoes: [], automaticos: auto }).html;
  assert.match(html, /<h3 class="rl-frente-nome">Melhorias no checkout<\/h3>/);
  assert.match(html, /class="rl-frente-itens"/);
  assert.match(html, /rl-frente-item-titulo">Spike de pagamento</);
  assert.match(html, /rl-frente-item-resumo">Corrige o brinde em pedidos abaixo do mínimo\.</);
  // 1 + 2 itens fechados no período = 3 na capa.
  assert.match(html, /rl-heroi-base[\s\S]*?rl-num">3</);
});

test('o pacote leva os automáticos ao leitor, saneados nas duas pontas', () => {
  const src = ler('assets/report.js');
  assert.match(src, /st\.automaticos = C\.saneAutomaticos\(pacote\.automaticos\);/);
  assert.match(src, /automaticos: st\.leitura \? st\.automaticos : automaticosAgora\(itensDoDoc\),/);
  // RODANDO a montagem: fora do bloco local (sem sublinhado), vai pro link e
  // pra função da Vercel — e nada com `_` sai quando não é arquivo.
  const P = require('../assets/pacote.js');
  const B = { precisaDeEntregas: true, contagensDoLink: () => ({ f: {}, e: {} }),
    entregasConcluidas: () => MATERIAL, periodoDoDocumento: () => ['2026-10'] };
  const pacote = P.montarEntregas({ B, mostrados: [], todos: [], todosItens: [], sprintsBrutas: [],
    resumos: RESUMOS, roadmap: [], escopo: 'Urlan Dipre', mes: null, agora: 1, paraArquivo: false });
  assert.equal(pacote.automaticos.length, 2);
  // Pela ida e volta em JSON, que é como o pacote sai: chave `undefined` some.
  assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(pacote))).filter((k) => k.startsWith('_')), []);
  assert.doesNotMatch(JSON.stringify(pacote), /TEXTO INTERNO/);
});
