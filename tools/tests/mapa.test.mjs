import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mesDe, diaDe, statusDe, healthDe, trackDoPai, agruparPorPai, itemDe, diffRodadas } from '../mapa.mjs';

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
const EXCLUIDOS = ['Removed'];

test('statusDe usa o mapa de configuracao', () => {
  assert.equal(statusDe('Em Andamento', ESTADOS, EXCLUIDOS), 'doing');
  assert.equal(statusDe('Concluído', ESTADOS, EXCLUIDOS), 'done');
});

/* Estado fora do mapa NAO pode virar "next" em silencio: viraria mudanca de
   processo escondida de quem precisa saber. */
test('estado fora do mapa (desconhecido) devolve null', () => {
  assert.equal(statusDe('Em Homologação', ESTADOS, EXCLUIDOS), null);
  assert.equal(statusDe(null, ESTADOS, EXCLUIDOS), null);
});

test('valor invalido no mapa e tratado como nao mapeado', () => {
  assert.equal(statusDe('X', { X:'qualquer' }, []), null);
});

/* O terceiro resultado: estado excluido (Removed) nao e "nao mapeado", e
   descarte deliberado. Tem de sair diferente de null e diferente do valor
   mapeado, para quem chama poder tratar os tres casos separadamente. */
test('estado em estadosExcluidos devolve "excluido", nao null e nao o valor do mapa', () => {
  assert.equal(statusDe('Removed', ESTADOS, EXCLUIDOS), 'excluido');
});

test('estadosExcluidos vazio ou ausente nao exclui nada', () => {
  assert.equal(statusDe('Removed', ESTADOS, []), null);
  assert.equal(statusDe('Removed', ESTADOS, undefined), null);
});

/* Exclusao vence se por algum motivo um estado aparecer nas duas tabelas ao
   mesmo tempo — nao deveria acontecer na configuracao real, mas a funcao nao
   deve depender disso para estar certa. */
test('estado excluido vence mesmo se tambem estiver mapeado', () => {
  assert.equal(statusDe('Removed', { Removed:'done' }, ['Removed']), 'excluido');
});

test('healthDe marca impedimento e mais nada', () => {
  assert.equal(healthDe('Em impedimento'), 'blocked');
  assert.equal(healthDe('Impediment'), 'blocked');
  assert.equal(healthDe('Em Andamento'), null);
  assert.equal(healthDe(null), null);
});

const PRODUTOS = { '49290':'club', '49294':'interna' };

test('trackDoPai casa por id exato contra a tabela de produtos', () => {
  assert.equal(trackDoPai(49290, PRODUTOS), 'club');
  assert.equal(trackDoPai(49294, PRODUTOS), 'interna');
});

/* A chave do JSON e string; o System.Parent que a API devolve e number. Sem
   o String() dentro de trackDoPai, este teste falharia mesmo com o id certo
   — foi exatamente esse detalhe de tipo que o enunciado da tarefa avisou
   para nao esquecer. */
test('trackDoPai casa number contra chave string sem exigir conversao de quem chama', () => {
  assert.equal(trackDoPai(49290, { '49290':'club' }), 'club');
});

test('trackDoPai com pai fora da tabela devolve null', () => {
  assert.equal(trackDoPai(999999, PRODUTOS), null);
});

test('trackDoPai sem pai (undefined ou null) devolve null', () => {
  assert.equal(trackDoPai(undefined, PRODUTOS), null);
  assert.equal(trackDoPai(null, PRODUTOS), null);
});

test('agruparPorPai separa Features por pai e isola as sem pai', () => {
  const fs = [
    { id:11, fields:{ 'System.Parent':49290 } },
    { id:12, fields:{ 'System.Parent':49290 } },
    { id:13, fields:{ 'System.Parent':77 } },
    { id:14, fields:{} }
  ];
  const { porPai, semPai } = agruparPorPai(fs);
  assert.deepEqual(porPai.get(49290).map(w => w.id), [11, 12]);
  assert.deepEqual(porPai.get(77).map(w => w.id), [13]);
  assert.deepEqual(semPai.map(w => w.id), [14]);
});

test('agruparPorPai nao filtra por produto cadastrado — isso e trabalho de quem chama', () => {
  /* Pai 77 nao esta em nenhuma tabela de produtos, mas agruparPorPai nao
     sabe disso e nao precisa saber: ela so agrupa. Quem decide se 77 e um
     Epic sem produto cadastrado e sync.mjs, com a ajuda da guarda
     epicsSemProduto (guardas.mjs). */
  const { porPai } = agruparPorPai([{ id:1, fields:{ 'System.Parent':77 } }]);
  assert.equal(porPai.has(77), true);
});

const CFG = { estados: ESTADOS, estadosExcluidos: EXCLUIDOS, produtos: PRODUTOS };

test('itemDe monta o item do Radar a partir da Feature, com produto vindo do pai', () => {
  const feature = { id:47688, fields:{
    'System.Title':'[EUA] Nova Home',
    'System.State':'Em Andamento',
    'System.Parent':49290,
    'System.AssignedTo':{ displayName:'Urlan Dipré' },
    'Microsoft.VSTS.Scheduling.StartDate':'2026-07-01T00:00:00Z',
    'Microsoft.VSTS.Scheduling.TargetDate':'2026-08-31T00:00:00Z'
  }};
  const it = itemDe(feature, CFG);
  assert.equal(it.id, 47688);
  assert.equal(it.azureTitle, '[EUA] Nova Home');
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

test('Feature com pai fora da tabela de produtos fica com track null', () => {
  const feature = { id:1, fields:{ 'System.Title':'X', 'System.State':'Em Andamento', 'System.Parent':77 } };
  const it = itemDe(feature, CFG);
  assert.equal(it.track, null);
});

test('Feature sem pai fica com track null', () => {
  const feature = { id:1, fields:{ 'System.Title':'X', 'System.State':'Em Andamento' } };
  const it = itemDe(feature, CFG);
  assert.equal(it.track, null);
});

test('Feature com estado excluido (Removed) sai com status "excluido"', () => {
  const feature = { id:1, fields:{ 'System.Title':'X', 'System.State':'Removed', 'System.Parent':49290 } };
  const it = itemDe(feature, CFG);
  assert.equal(it.status, 'excluido');
  assert.equal(it.estadoCru, 'Removed');
});

test('Feature concluida gera shipped a partir de ClosedDate', () => {
  const feature = { id:1, fields:{
    'System.Title':'X', 'System.State':'Concluído', 'System.Parent':49290,
    'Microsoft.VSTS.Common.ClosedDate':'2026-08-14T10:00:00Z'
  }};
  const it = itemDe(feature, CFG);
  assert.equal(it.status, 'done');
  assert.equal(it.shipped, '2026-08');
});

test('Feature sem data alguma nao explode e fica sem janela', () => {
  const it = itemDe({ id:2, fields:{ 'System.Title':'Y', 'System.State':'Em Andamento', 'System.Parent':49290 } }, CFG);
  assert.equal(it.start, null);
  assert.equal(it.end, null);
  assert.equal(it.owner, null);
});

test('Feature sem fields nao explode', () => {
  const it = itemDe({ id:3 }, CFG);
  assert.equal(it.id, 3);
  assert.equal(it.azureTitle, '');
  assert.equal(it.status, null);
  assert.equal(it.track, null);
  assert.deepEqual(it.demands, []);
});

/* demands e sempre [], de proposito: nao ha terceiro nivel de hierarquia
   neste desenho. Este teste tranca isso, para uma mudanca futura que volte a
   preencher demands ter de mexer aqui de olhos abertos, nao por acidente. */
test('demands sai sempre vazio, mesmo com pai valido e estado mapeado', () => {
  const feature = { id:1, fields:{ 'System.Title':'X', 'System.State':'Em Andamento', 'System.Parent':49290 } };
  assert.deepEqual(itemDe(feature, CFG).demands, []);
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
