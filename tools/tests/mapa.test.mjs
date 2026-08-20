import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesDe, diaDe, statusDe, healthDe, trackDe, agruparPorPai, itemDe, diffRodadas } from '../mapa.mjs';

test('mesDe extrai AAAA-MM e recusa lixo', () => {
  assert.equal(mesDe('2026-08-14T12:00:00Z'), '2026-08');
  assert.equal(mesDe('2026-12-01'), '2026-12');
  assert.equal(mesDe(null), null);
  assert.equal(mesDe(''), null);
  assert.equal(mesDe('2026-13-01'), null);
  assert.equal(mesDe('agosto'), null);
});

test('diaDe extrai AAAA-MM-DD', () => {
  assert.equal(diaDe('2026-08-14T12:00:00Z'), '2026-08-14');
  assert.equal(diaDe(null), null);
});

const ESTADOS = { 'Aguardando Início':'next', 'Em Andamento':'doing', 'Concluído':'done' };

test('statusDe usa o mapa de configuracao', () => {
  assert.equal(statusDe('Em Andamento', ESTADOS), 'doing');
  assert.equal(statusDe('Concluído', ESTADOS), 'done');
});

/* Estado fora do mapa NAO pode virar "next" em silencio: viraria mudanca de
   processo escondida de quem precisa saber. */
test('estado fora do mapa devolve null', () => {
  assert.equal(statusDe('Em Homologação', ESTADOS), null);
  assert.equal(statusDe(null, ESTADOS), null);
});

test('valor invalido no mapa e tratado como nao mapeado', () => {
  assert.equal(statusDe('X', { X:'qualquer' }), null);
});

test('healthDe marca impedimento e mais nada', () => {
  assert.equal(healthDe('Em impedimento'), 'blocked');
  assert.equal(healthDe('Impediment'), 'blocked');
  assert.equal(healthDe('Em Andamento'), null);
  assert.equal(healthDe(null), null);
});

const AREAS = { 'Ecommerce USA\\Loja Clube':'club', 'Ecommerce USA\\Loja Clube\\Checkout':'checkout' };

test('trackDe casa por prefixo e prefere o mais especifico', () => {
  assert.equal(trackDe('Ecommerce USA\\Loja Clube', AREAS), 'club');
  assert.equal(trackDe('Ecommerce USA\\Loja Clube\\PDP', AREAS), 'club');
  assert.equal(trackDe('Ecommerce USA\\Loja Clube\\Checkout\\Pix', AREAS), 'checkout');
});

test('area fora da tabela devolve null em vez de descartar o item', () => {
  assert.equal(trackDe('Ecommerce USA\\Nova Area', AREAS), null);
  assert.equal(trackDe(null, AREAS), null);
});

/* Regressão: "startsWith(k)" sem o separador de path casaria
   "...\Loja Nova\Sub" com a chave "...\Loja" por serem prefixo em string,
   mesmo sendo áreas irmãs (Loja e Loja Nova), não uma dentro da outra. O
   código já exige o "\" logo depois da chave — este teste tranca esse
   comportamento em vez de deixá-lo provado só de cabeça. */
test('trackDe nao casa area irma cujo nome comeca igual', () => {
  const IRMAS = { 'Ecommerce USA\\Loja': 'loja' };
  assert.equal(trackDe('Ecommerce USA\\Loja Nova\\Sub', IRMAS), null);
  assert.equal(trackDe('Ecommerce USA\\Loja Nova', IRMAS), null);
});

test('agruparPorPai separa filhas e orfas', () => {
  const fs = [
    { id:11, fields:{ 'System.Parent':1 } },
    { id:12, fields:{ 'System.Parent':1 } },
    { id:13, fields:{ 'System.Parent':99 } },
    { id:14, fields:{} }
  ];
  const { porPai, orfas } = agruparPorPai(fs, [1, 2]);
  assert.deepEqual(porPai.get(1).map(w => w.id), [11, 12]);
  assert.equal(porPai.has(2), false);
  assert.deepEqual(orfas.map(w => w.id), [13, 14]);
});

const CFG = { estados: ESTADOS, areas: AREAS };

test('itemDe monta o item do Radar a partir do Epic', () => {
  const epic = { id:47688, fields:{
    'System.Title':'Nova PDP USA',
    'System.State':'Em Andamento',
    'System.AreaPath':'Ecommerce USA\\Loja Clube',
    'System.AssignedTo':{ displayName:'Urlan Dipré' },
    'Microsoft.VSTS.Scheduling.StartDate':'2026-07-01T00:00:00Z',
    'Microsoft.VSTS.Scheduling.TargetDate':'2026-08-31T00:00:00Z'
  }};
  const it = itemDe(epic, [], CFG);
  assert.equal(it.id, 47688);
  assert.equal(it.azureTitle, 'Nova PDP USA');
  assert.equal(it.track, 'club');
  assert.equal(it.start, '2026-07-01');
  assert.equal(it.end, '2026-08-31');
  assert.equal(it.status, 'doing');
  assert.equal(it.estadoCru, 'Em Andamento');
  assert.equal(it.health, null);
  assert.equal(it.shipped, null);
  assert.equal(it.owner, 'Urlan Dipré');
  assert.deepEqual(it.demands, []);
});

test('Epic concluido gera shipped a partir de ClosedDate', () => {
  const epic = { id:1, fields:{
    'System.Title':'X', 'System.State':'Concluído',
    'Microsoft.VSTS.Common.ClosedDate':'2026-08-14T10:00:00Z'
  }};
  const it = itemDe(epic, [], CFG);
  assert.equal(it.status, 'done');
  assert.equal(it.shipped, '2026-08');
});

test('Epic sem data alguma nao explode e fica sem janela', () => {
  const it = itemDe({ id:2, fields:{ 'System.Title':'Y', 'System.State':'Em Andamento' } }, [], CFG);
  assert.equal(it.start, null);
  assert.equal(it.end, null);
  assert.equal(it.owner, null);
});

test('Epic sem fields nao explode', () => {
  const it = itemDe({ id:3 }, [], CFG);
  assert.equal(it.id, 3);
  assert.equal(it.azureTitle, '');
  assert.equal(it.status, null);
});

test('demandas viram a lista do Radar, com done em mes', () => {
  const epic = { id:1, fields:{ 'System.Title':'X', 'System.State':'Em Andamento' } };
  const fs = [
    { id:11, fields:{ 'System.Title':'Revisão do checkout', 'System.State':'Concluído',
                      'Microsoft.VSTS.Scheduling.TargetDate':'2026-08-15T00:00:00Z',
                      'Microsoft.VSTS.Common.ClosedDate':'2026-08-20T00:00:00Z' } },
    { id:12, fields:{ 'System.Title':'Pendente', 'System.State':'Aguardando Início' } }
  ];
  const it = itemDe(epic, fs, CFG);
  assert.deepEqual(it.demands, [
    { id:11, t:'Revisão do checkout', status:'done', estadoCru:'Concluído', due:'2026-08-15', done:'2026-08' },
    { id:12, t:'Pendente', status:'next', estadoCru:'Aguardando Início', due:null, done:null }
  ]);
});

/* A API de lote não garante ordem. Sem ordenar por id, a ordem das demandas
   no fatos.js commitado seguiria a ordem de retorno da API — produzindo
   diff sem mudança real de dado a cada rodada. */
test('demandas saem ordenadas por id, nao na ordem em que a API devolveu', () => {
  const epic = { id:1, fields:{ 'System.Title':'X', 'System.State':'Em Andamento' } };
  const fs = [
    { id:30, fields:{ 'System.Title':'C', 'System.State':'Aguardando Início' } },
    { id:10, fields:{ 'System.Title':'A', 'System.State':'Aguardando Início' } },
    { id:20, fields:{ 'System.Title':'B', 'System.State':'Aguardando Início' } }
  ];
  const it = itemDe(epic, fs, CFG);
  assert.deepEqual(it.demands.map(d => d.id), [10, 20, 30]);
});

test('diffRodadas aponta novo, saiu, status, janela e entrega', () => {
  const antes = [
    { id:1, azureTitle:'A', status:'doing', end:'2026-08-31', shipped:null },
    { id:2, azureTitle:'B', status:'next', end:null, shipped:null }
  ];
  const depois = [
    { id:1, azureTitle:'A', status:'done', end:'2026-09-30', shipped:'2026-09' },
    { id:3, azureTitle:'C', status:'next', end:null, shipped:null }
  ];
  const d = diffRodadas(antes, depois);
  assert.deepEqual(d.filter(x => x.tipo === 'status'), [{ id:1, tipo:'status', de:'doing', para:'done', titulo:'A' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'janela'), [{ id:1, tipo:'janela', de:'2026-08-31', para:'2026-09-30', titulo:'A' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'entrega'), [{ id:1, tipo:'entrega', de:null, para:'2026-09', titulo:'A' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'novo'), [{ id:3, tipo:'novo', titulo:'C' }]);
  assert.deepEqual(d.filter(x => x.tipo === 'saiu'), [{ id:2, tipo:'saiu', titulo:'B' }]);
});

test('diffRodadas sem rodada anterior trata tudo como novo', () => {
  const d = diffRodadas(null, [{ id:1, azureTitle:'A', status:'next', end:null, shipped:null }]);
  assert.deepEqual(d, [{ id:1, tipo:'novo', titulo:'A' }]);
});
