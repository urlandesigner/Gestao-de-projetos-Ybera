const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');

test('orgBaseUrl normaliza variações', () => {
  assert.equal(C.orgBaseUrl('dev.azure.com/ybera'), 'https://dev.azure.com/ybera');
  assert.equal(C.orgBaseUrl('https://dev.azure.com/ybera/'), 'https://dev.azure.com/ybera');
  assert.equal(C.orgBaseUrl('ybera'), 'https://dev.azure.com/ybera');
  assert.throws(() => C.orgBaseUrl(''));
  assert.equal(C.orgBaseUrl('dev.azure.com/a/b'), 'https://dev.azure.com/a');
  assert.throws(() => C.orgBaseUrl('dev.azure.com'));
  assert.equal(C.orgBaseUrl('dev.azure.com/org?x=1'), 'https://dev.azure.com/org');
  assert.equal(C.orgBaseUrl('https://dev.azure.com/nivello/B2C/_boards/board/t/Time%20X/'), 'https://dev.azure.com/nivello');
});

test('deepLinks monta os cinco atalhos e o link de work item', () => {
  const l = C.deepLinks('https://dev.azure.com/ybera', 'Ecommerce USA', 'Time Web');
  assert.equal(l.board, 'https://dev.azure.com/ybera/Ecommerce%20USA/_boards/board/t/Time%20Web/');
  assert.equal(l.backlog, 'https://dev.azure.com/ybera/Ecommerce%20USA/_backlogs/backlog/Time%20Web/');
  assert.equal(l.sprints, 'https://dev.azure.com/ybera/Ecommerce%20USA/_sprints/taskboard/Time%20Web/');
  assert.equal(l.queries, 'https://dev.azure.com/ybera/Ecommerce%20USA/_queries');
  assert.equal(l.dashboards, 'https://dev.azure.com/ybera/Ecommerce%20USA/_dashboards');
  assert.equal(l.workItem(42), 'https://dev.azure.com/ybera/Ecommerce%20USA/_workitems/edit/42');
});

test('normalizeConfig valida, ordena e preenche defaults', () => {
  const cfg = C.normalizeConfig({
    org: 'ybera',
    projects: [
      { projectName: 'B', teamName: 'TB', order: 1 },
      { projectName: 'A', teamName: 'TA', order: 0, hidden: true },
    ],
  });
  assert.equal(cfg.org, 'https://dev.azure.com/ybera');
  assert.equal(cfg.projects[0].projectName, 'A');
  assert.equal(cfg.projects[0].hidden, true);
  assert.equal(cfg.projects[1].order, 1);
  assert.throws(() => C.normalizeConfig({ org: 'ybera', projects: [] }));
  assert.throws(() => C.normalizeConfig(null));
});

test('exportConfig nunca inclui pat', () => {
  const json = C.exportConfig({ org: 'ybera', pat: 'SEGREDO', projects: [{ projectName: 'A', teamName: 'TA' }] });
  assert.ok(!json.includes('SEGREDO'));
  assert.ok(!json.includes('pat'));
  assert.ok(json.includes('"org"'));
});

test('wiqlCounts filtra por categorias e corta concluídos em 30d', () => {
  const q = C.wiqlCounts();
  assert.ok(!q.includes('@Me')); // recorte por responsável é client-side (seletor na página)
  assert.ok(q.includes("IN GROUP 'Microsoft.EpicCategory'"));
  assert.ok(q.includes("IN GROUP 'Microsoft.FeatureCategory'"));
  assert.ok(q.includes("IN GROUP 'Microsoft.RequirementCategory'"));
  assert.ok(q.includes("[System.State] <> 'Removed'"));
  assert.ok(q.includes('@Today - 30'));
  assert.ok(C.wiqlCounts(7).includes('@Today - 7'));
});

test('wiqlMyItems usa @Me e exclui estados terminais', () => {
  const q = C.wiqlMyItems();
  assert.ok(q.includes('[System.AssignedTo] = @Me'));
  assert.ok(q.includes("NOT IN ('Done','Closed','Removed','Completed')"));
});

test('aggregateCounts separa por nível e estado', () => {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Epic', 'System.State': 'Active' } },
    { id: 2, fields: { 'System.WorkItemType': 'Feature', 'System.State': 'New' } },
    { id: 3, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'New' } },
    { id: 4, fields: { 'System.WorkItemType': 'User Story', 'System.State': 'New' } },
    { id: 5, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done' } },
  ];
  const c = C.aggregateCounts(items);
  assert.deepEqual(c.epic, { Active: 1 });
  assert.deepEqual(c.feature, { New: 1 });
  assert.deepEqual(c.pbi, { New: 2, Done: 1 });
});

test('sprintProgress conta concluídos e ignora Tasks', () => {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done' } },
    { id: 2, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Committed' } },
    { id: 3, fields: { 'System.WorkItemType': 'Task', 'System.State': 'Done' } },
  ];
  assert.deepEqual(C.sprintProgress(items), { done: 1, total: 2 });
});

test('groupMyItemsBuckets colapsa em 3 etapas fixas, ordena pelo fluxo e descarta terminais', () => {
  const mk = (id, estado) => ({ id, fields: { 'System.State': estado } });
  const grupos = C.groupMyItemsBuckets([
    mk(1, 'Prototype'), mk(2, 'New'), mk(3, 'Blocked'),
    mk(4, 'In Progress'), mk(5, 'Ready'), mk(6, 'Done'),
  ]);
  assert.deepEqual(grupos.map((g) => g.bucket), ['todo', 'andamento', 'atencao']); // sempre as 3, nessa ordem
  assert.deepEqual(grupos[0].items.map((i) => i.id), [2, 5]); // New antes de Ready
  assert.deepEqual(grupos[1].items.map((i) => i.id), [1, 4]); // Prototype antes de In Progress
  assert.deepEqual(grupos[2].items.map((i) => i.id), [3]);
  assert.ok(!grupos.some((g) => g.items.some((i) => i.id === 6))); // Done fora
});

test('isStale e timeAgoLabel', () => {
  const agora = 1_000_000_000;
  assert.equal(C.isStale(agora - 5 * 60000, agora), false);
  assert.equal(C.isStale(agora - 11 * 60000, agora), true);
  assert.equal(C.isStale(0, agora), true);
  assert.equal(C.timeAgoLabel(0, agora), 'nunca atualizado');
  assert.equal(C.timeAgoLabel(agora - 30000, agora), 'atualizado agora');
  assert.equal(C.timeAgoLabel(agora - 5 * 60000, agora), 'atualizado há 5 min');
  assert.equal(C.timeAgoLabel(agora - 3 * 3600000, agora), 'atualizado há 3 h');
});

test('iterationLabel: sprint pelo último segmento, raiz vira Backlog', () => {
  assert.equal(C.iterationLabel('B2C\\Sprint 17'), 'Sprint 17');
  assert.equal(C.iterationLabel('B2C\\2026\\Sprint 17'), 'Sprint 17');
  assert.equal(C.iterationLabel('B2C'), 'Backlog');
  assert.equal(C.iterationLabel(''), 'Backlog');
});

test('isTerminalState é case-insensitive', () => {
  assert.equal(C.isTerminalState('done'), true);
  assert.equal(C.isTerminalState('Active'), false);
});

test('isAttentionState reconhece bloqueios, case-insensitive', () => {
  assert.equal(C.isAttentionState('Impediment'), true);
  assert.equal(C.isAttentionState('BLOCKED'), true);
  assert.equal(C.isAttentionState('In Progress'), false);
});

test('typeSlug mapeia tipos pro acento visual', () => {
  assert.equal(C.typeSlug('Epic'), 'epic');
  assert.equal(C.typeSlug('Feature'), 'feature');
  assert.equal(C.typeSlug('Product Backlog Item'), 'pbi');
  assert.equal(C.typeSlug('User Story'), 'pbi');
  assert.equal(C.typeSlug('Bug'), 'bug');
  assert.equal(C.typeSlug('Task'), 'task');
  assert.equal(C.typeSlug('Tipo Exótico'), 'outro');
});

test('wiqlBoard recorta por áreas do time e escapa aspas', () => {
  const q = C.wiqlBoard([{ path: "Proj\\Time d'Água", children: true }, { path: 'Proj\\Outra', children: false }]);
  assert.ok(q.includes("IN GROUP 'Microsoft.RequirementCategory'"));
  assert.ok(q.includes("[System.AreaPath] UNDER 'Proj\\Time d''Água'"));
  assert.ok(q.includes("[System.AreaPath] = 'Proj\\Outra'"));
  assert.ok(q.includes('@Today - 30'));
  const semArea = C.wiqlBoard([]);
  assert.ok(!semArea.includes('AreaPath'));
});

test('initials extrai iniciais do nome', () => {
  assert.equal(C.initials('Urlan Dipre'), 'UD');
  assert.equal(C.initials('Ana Maria Souza Lima'), 'AL');
  assert.equal(C.initials('Madonna'), 'MA');
  assert.equal(C.initials(''), '?');
  assert.equal(C.initials(null), '?');
});

test('inSprint compara iteration path exato', () => {
  const item = { fields: { 'System.IterationPath': 'Proj\\Sprint 14' } };
  assert.equal(C.inSprint(item, 'Proj\\Sprint 14'), true);
  assert.equal(C.inSprint(item, 'Proj\\Sprint 13'), false);
  assert.equal(C.inSprint(item, null), false);
  assert.equal(C.inSprint({}, 'Proj\\Sprint 14'), false);
});

test('orderColumnsFallback ordena colunas pelo fluxo dos estados', () => {
  const ordem = C.orderColumnsFallback(
    ['Concluído', 'Novo', 'Fazendo'],
    { 'Concluído': ['Done'], 'Novo': ['New', 'To Do'], 'Fazendo': ['In Progress'] }
  );
  assert.deepEqual(ordem, ['Novo', 'Fazendo', 'Concluído']);
});

test('filterItems recorta por tipo, projeto, responsável e busca', () => {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Epic', 'System.TeamProject': 'B2C', 'System.Title': 'Assinaturas', 'System.AssignedTo': { displayName: 'Urlan Dipre' } } },
    { id: 2, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.TeamProject': 'B2C', 'System.Title': 'Quiz AI', 'System.AssignedTo': { displayName: 'Carla Mota' } } },
    { id: 3, fields: { 'System.WorkItemType': 'Bug', 'System.TeamProject': 'Global', 'System.Title': 'Erro no checkout', 'System.AssignedTo': null } },
  ];
  assert.equal(C.filterItems(items, null).length, 3);
  assert.deepEqual(C.filterItems(items, { tipos: ['pbi'] }).map((i) => i.id), [2]);
  assert.deepEqual(C.filterItems(items, { tipos: ['epic', 'bug'] }).map((i) => i.id), [1, 3]);
  assert.deepEqual(C.filterItems(items, { projetos: ['Global'] }).map((i) => i.id), [3]);
  assert.deepEqual(C.filterItems(items, { resp: 'Carla Mota' }).map((i) => i.id), [2]);
  assert.deepEqual(C.filterItems(items, { busca: 'quiz' }).map((i) => i.id), [2]);
  assert.deepEqual(C.filterItems(items, { busca: '#3' }).map((i) => i.id), [3]);
  assert.deepEqual(C.filterItems(items, { tipos: ['pbi'], busca: 'checkout' }).length, 0);
});

test('wiqlCounts com áreas recorta por time', () => {
  const q = C.wiqlCounts(30, [{ path: 'B2C\\Squad', children: true }]);
  assert.ok(q.includes("[System.AreaPath] UNDER 'B2C\\Squad'"));
  assert.ok(!C.wiqlCounts().includes('AreaPath'));
});

test('stateBucket classifica em quatro grupos', () => {
  assert.equal(C.stateBucket('New'), 'todo');
  assert.equal(C.stateBucket('Ready for Dev'), 'todo');
  assert.equal(C.stateBucket('Grooming'), 'todo');
  assert.equal(C.stateBucket('In Progress'), 'andamento');
  assert.equal(C.stateBucket('Prototype'), 'andamento');
  assert.equal(C.stateBucket('Estado Custom'), 'andamento');
  assert.equal(C.stateBucket('Impediment'), 'atencao');
  assert.equal(C.stateBucket('Done'), 'feito');
});

test('bucketCounts soma por grupo e total', () => {
  const b = C.bucketCounts({ 'To Do': 115, 'In Progress': 31, Grooming: 23, Testing: 6, Impediment: 3, Done: 64 });
  assert.deepEqual(b, { todo: 138, andamento: 37, atencao: 3, feito: 64, total: 242 });
});

/* ---- Panorama ---- */
const AGORA = Date.parse('2026-08-20T12:00:00Z');
// item de teste: estado, data-alvo, data da última alteração
const pit = (id, estado, alvo, mudou) => ({ id, fields: {
  'System.WorkItemType': 'Product Backlog Item',
  'System.State': estado,
  'Microsoft.VSTS.Scheduling.TargetDate': alvo || undefined,
  'System.ChangedDate': mudou || '2026-08-19T10:00:00Z',
} });

test('panoramaKpis conta bloqueado, atrasado, do mês e parado', () => {
  const k = C.panoramaKpis([
    pit(1, 'Blocked'),
    pit(2, 'New', '2026-08-05T00:00:00Z'),   // alvo já passou → atrasado
    pit(3, 'New', '2026-08-31T00:00:00Z'),   // alvo neste mês, à frente → fecha no mês
    pit(4, 'New', '2026-09-15T00:00:00Z'),   // mês que vem → nenhum dos dois
    pit(5, 'New', null, '2026-08-01T10:00:00Z'), // 19 dias sem tocar → parado
  ], AGORA);
  assert.equal(k.bloqueados, 1);
  assert.equal(k.atrasados, 1);
  assert.equal(k.fechamMes, 1);
  assert.equal(k.parados, 1);
  assert.equal(k.semDatas, false);
});

test('panoramaKpis: concluído nunca é atrasado nem parado', () => {
  const k = C.panoramaKpis([
    pit(1, 'Done', '2026-07-01T00:00:00Z', '2026-06-01T10:00:00Z'),
    pit(2, 'Closed', '2026-07-01T00:00:00Z', '2026-06-01T10:00:00Z'),
  ], AGORA);
  assert.deepEqual(
    { a: k.atrasados, p: k.parados, b: k.bloqueados },
    { a: 0, p: 0, b: 0 }
  );
});

test('panoramaKpis: fechamMes e atrasados são disjuntos', () => {
  // alvo no mês corrente mas já vencido: conta só como atrasado
  const k = C.panoramaKpis([pit(1, 'New', '2026-08-05T00:00:00Z')], AGORA);
  assert.equal(k.atrasados, 1);
  assert.equal(k.fechamMes, 0);
});

test('panoramaKpis: limite exato de parado são 14 dias', () => {
  const treze = C.panoramaKpis([pit(1, 'New', null, '2026-08-07T12:00:00Z')], AGORA);
  const quatorze = C.panoramaKpis([pit(1, 'New', null, '2026-08-06T12:00:00Z')], AGORA);
  assert.equal(treze.parados, 0);
  assert.equal(quatorze.parados, 1);
});

test('panoramaKpis: semDatas quando nenhum item em aberto tem data-alvo', () => {
  assert.equal(C.panoramaKpis([pit(1, 'New'), pit(2, 'In Progress')], AGORA).semDatas, true);
  assert.equal(C.panoramaKpis([], AGORA).semDatas, true);
  // data inválida não vale como data
  assert.equal(C.panoramaKpis([pit(1, 'New', 'nao-e-data')], AGORA).semDatas, true);
});

test('itensAtencao: bloqueados na frente, atrasados por data mais antiga, com limite', () => {
  const lista = C.itensAtencao([
    pit(1, 'New', '2026-08-10T00:00:00Z'),
    pit(2, 'Impediment'),
    pit(3, 'New', '2026-08-02T00:00:00Z'),
    pit(4, 'Done', '2026-01-01T00:00:00Z'), // concluído fica fora
    pit(5, 'New', '2026-12-01T00:00:00Z'),  // ainda no prazo, fica fora
  ], AGORA);
  assert.deepEqual(lista.map((x) => x.item.id), [2, 3, 1]);
  assert.deepEqual(lista.map((x) => x.motivo), ['bloqueado', 'atrasado', 'atrasado']);
  assert.equal(C.itensAtencao([pit(1, 'Blocked'), pit(2, 'Blocked'), pit(3, 'Blocked')], AGORA, 2).length, 2);
});

test('pendencias agrupa em três, exclusivo por precedência, com marcas secundárias', () => {
  const g = C.pendencias([
    pit(1, 'Blocked', '2026-08-01T00:00:00Z', '2026-07-01T10:00:00Z'), // travado + vencido + parado
    pit(2, 'New', '2026-08-10T00:00:00Z'),                             // só atrasado
    pit(3, 'New', null, '2026-07-20T10:00:00Z'),                       // só parado
    pit(4, 'New', '2026-12-01T00:00:00Z'),                             // nada: em dia
    pit(5, 'Done', '2026-01-01T00:00:00Z', '2026-01-01T10:00:00Z'),    // concluído fica fora
  ], AGORA);
  assert.deepEqual(g.bloqueados.map((x) => x.item.id), [1]);
  assert.deepEqual(g.atrasados.map((x) => x.item.id), [2]);
  assert.deepEqual(g.parados.map((x) => x.item.id), [3]);
  // o item 1 aparece uma vez só, mas não perde as outras condições
  assert.deepEqual(g.bloqueados[0].tambem, ['atrasado', 'parado']);
  assert.deepEqual(g.atrasados[0].tambem, []);
});

test('pendencias ordena cada grupo pela própria gravidade', () => {
  const g = C.pendencias([
    pit(1, 'Blocked', null, '2026-08-18T10:00:00Z'), // travado há 2 dias
    pit(2, 'Blocked', null, '2026-07-01T10:00:00Z'), // travado há 50 dias
    pit(3, 'New', '2026-08-19T00:00:00Z'),           // venceu ontem
    pit(4, 'New', '2026-06-01T00:00:00Z'),           // venceu em junho
    pit(5, 'New', null, '2026-08-01T10:00:00Z'),     // parado há 19 dias
    pit(6, 'New', null, '2026-07-01T10:00:00Z'),     // parado há 50 dias
  ], AGORA);
  assert.deepEqual(g.bloqueados.map((x) => x.item.id), [2, 1]); // travado há mais tempo na frente
  assert.deepEqual(g.atrasados.map((x) => x.item.id), [4, 3]);  // mais vencido na frente
  assert.deepEqual(g.parados.map((x) => x.item.id), [6, 5]);    // mais tempo sem toque na frente
});

test('pendencias: sem nada pendente devolve os três grupos vazios', () => {
  const g = C.pendencias([pit(1, 'New', '2026-12-01T00:00:00Z')], AGORA);
  assert.deepEqual([g.bloqueados.length, g.atrasados.length, g.parados.length], [0, 0, 0]);
});

/* ---- Produtos ---- */
// épico/feature/pbi com pai, estado e data de início
const wit = (id, tipo, estado, pai, inicio) => ({ id, fields: {
  'System.WorkItemType': tipo, 'System.State': estado,
  'System.Parent': pai || undefined,
  'Microsoft.VSTS.Scheduling.StartDate': inicio || undefined,
} });

test('wiqlProdutos não tem corte de data (progresso precisa do histórico todo)', () => {
  const q = C.wiqlProdutos([{ path: 'B2C\\Squad', children: true }]);
  assert.ok(!q.includes('@Today'));
  assert.ok(q.includes("IN GROUP 'Microsoft.EpicCategory'"));
  assert.ok(q.includes("[System.AreaPath] UNDER 'B2C\\Squad'"));
});

test('produtos rola o progresso por netos e ignora quem não é descendente', () => {
  const p = C.produtos([
    wit(1, 'Epic', 'New', null, '2026-09-30T00:00:00Z'),
    wit(10, 'Feature', 'Done', 1),
    wit(11, 'Feature', 'New', 1),
    wit(100, 'Product Backlog Item', 'Done', 10),  // neto concluído
    wit(101, 'Product Backlog Item', 'New', 10),   // neto em aberto
    wit(2, 'Epic', 'New', null, '2026-12-31T00:00:00Z'),
    wit(20, 'Feature', 'New', 999),                // pai que não veio: fora
  ]);
  const porId = Object.fromEntries(p.map((x) => [x.item.id, x.filhos]));
  assert.deepEqual(porId[1], { total: 4, feitos: 2 }); // 2 features + 2 PBIs
  assert.deepEqual(porId[2], { total: 0, feitos: 0 }); // épico sem filhos
});

test('produtos ordena pelo que começa primeiro, sem data de início no fim', () => {
  const p = C.produtos([
    wit(1, 'Epic', 'New', null, null),
    wit(2, 'Epic', 'New', null, '2026-12-01T00:00:00Z'),
    wit(3, 'Epic', 'New', null, '2026-09-01T00:00:00Z'),
  ]);
  assert.deepEqual(p.map((x) => x.item.id), [3, 2, 1]);
});

test('produtos sobrevive a ciclo de link sem travar', () => {
  const p = C.produtos([
    wit(1, 'Epic', 'New', null, null),
    wit(10, 'Feature', 'New', 1),
    wit(11, 'Feature', 'New', 10),
    wit(12, 'Feature', 'New', 11),
  ]);
  // 10 → 11 → 12 são descendentes; o épico não se conta
  assert.deepEqual(p[0].filhos, { total: 3, feitos: 0 });
});

test('epicoDetalhe achata Features e PBIs em qualquer profundidade, por nível e depois por estado', () => {
  const d = C.epicoDetalhe([
    wit(1, 'Epic', 'New'),
    wit(10, 'Feature', 'Done', 1),        // feature concluída: por último dentro do nível
    wit(11, 'Feature', 'Blocked', 1),     // feature travada: primeiro
    wit(20, 'Product Backlog Item', 'In Progress', 10), // neto, em andamento
    wit(21, 'Product Backlog Item', 'New', 11),         // neto, na fila
  ], 1);
  assert.equal(d.epico.id, 1);
  assert.deepEqual(d.descendentes.map((it) => it.id), [11, 10, 20, 21]);
});

test('epicoDetalhe: épico não encontrado devolve null', () => {
  assert.equal(C.epicoDetalhe([wit(1, 'Epic', 'New')], 999), null);
});

test('epicoDetalhe ignora item de outro épico e resiste a ciclo de link', () => {
  const d = C.epicoDetalhe([
    wit(1, 'Epic', 'New', 4), // ciclo de verdade: 1 → 2 → 3 → 4 → 1 (Parent aponta em círculo)
    wit(2, 'Feature', 'New', 1),
    wit(3, 'Product Backlog Item', 'New', 2),
    wit(4, 'Product Backlog Item', 'New', 3),
    wit(99, 'Feature', 'New', 5), // pai é outro épico, nem está na lista: fica de fora
  ], 1);
  assert.deepEqual(d.descendentes.map((it) => it.id), [2, 3, 4]); // termina sem travar, sem o 99
});

/* ---- Report mensal ---- */
// item concluído: tipo, data de fechamento, data de alteração
const fim = (id, tipo, estado, fechado, alterado) => ({ id, fields: {
  'System.WorkItemType': tipo, 'System.State': estado,
  'Microsoft.VSTS.Common.ClosedDate': fechado || undefined,
  'System.ChangedDate': alterado || undefined,
} });

test('reportPorMes agrupa concluídos por mês, mais recente primeiro', () => {
  const r = C.reportPorMes([
    fim(1, 'Epic', 'Done', '2026-08-10T12:00:00Z'),
    fim(2, 'Feature', 'Closed', '2026-08-28T12:00:00Z'),
    fim(3, 'Product Backlog Item', 'Done', '2026-07-03T12:00:00Z'),
    fim(4, 'Product Backlog Item', 'New', '2026-07-03T12:00:00Z'), // em aberto: fora
  ]);
  assert.deepEqual(r.map((m) => m.mes), ['2026-08', '2026-07']);
  assert.equal(r[0].total, 2);
  assert.deepEqual(r[0].porNivel, { epic: 1, feature: 1, pbi: 0 });
  assert.deepEqual(r[1].itens.map((x) => x.item.id), [3]);
});

test('reportPorMes ordena épico > feature > PBI e o mais recente dentro do nível', () => {
  const r = C.reportPorMes([
    fim(1, 'Product Backlog Item', 'Done', '2026-08-01T12:00:00Z'),
    fim(2, 'Epic', 'Done', '2026-08-02T12:00:00Z'),
    fim(3, 'Feature', 'Done', '2026-08-05T12:00:00Z'),
    fim(4, 'Feature', 'Done', '2026-08-20T12:00:00Z'),
  ]);
  assert.deepEqual(r[0].itens.map((x) => x.item.id), [2, 4, 3, 1]);
});

test('reportPorMes cai em ChangedDate quando não há ClosedDate, e marca', () => {
  const r = C.reportPorMes([
    fim(1, 'Done', 'Done', null, '2026-08-15T12:00:00Z'), // só alteração
    fim(2, 'Feature', 'Done', '2026-08-16T12:00:00Z', '2026-08-30T12:00:00Z'),
  ]);
  assert.equal(r[0].aproximados, 1);
  assert.equal(r[0].itens.find((x) => x.item.id === 1).aproximada, true);
  assert.equal(r[0].itens.find((x) => x.item.id === 2).aproximada, false);
});

test('reportPorMes ignora concluído sem data nenhuma e devolve vazio sem entregas', () => {
  assert.deepEqual(C.reportPorMes([fim(1, 'Feature', 'Done', null, null)]), []);
  assert.deepEqual(C.reportPorMes([]), []);
});

/* ---- Report: resumo em prosa ---- */
const nod = (id, tipo, titulo, pai) => ({ id, fields: {
  'System.WorkItemType': tipo, 'System.Title': titulo, 'System.Parent': pai || undefined, 'System.State': 'New',
} });

test('mapaDeProdutos sobe a cadeia até o épico e aponta o épico pra si mesmo', () => {
  const mapa = C.mapaDeProdutos([
    nod(1, 'Epic', 'Nova PDP'),
    nod(10, 'Feature', 'Galeria', 1),
    nod(100, 'Product Backlog Item', 'Zoom', 10), // neto: sobe dois níveis
    nod(200, 'Product Backlog Item', 'Órfão', 999), // pai fora do conjunto
  ]);
  assert.equal(mapa.get(100).titulo, 'Nova PDP');
  assert.equal(mapa.get(10).titulo, 'Nova PDP');
  assert.equal(mapa.get(1).titulo, 'Nova PDP'); // épico é o próprio produto
  assert.equal(mapa.has(200), false);
});

test('mapaDeProdutos não trava em ciclo de pai', () => {
  const mapa = C.mapaDeProdutos([nod(1, 'Feature', 'A', 2), nod(2, 'Feature', 'B', 1)]);
  assert.equal(mapa.size, 2);          // sem épico, cada um cai no ancestral que achou
  assert.equal(mapa.get(1).titulo, 'B'); // e a busca termina em vez de girar
});

// Hierarquia sem épico é comum: PBI pendurado direto numa Feature. A Feature é
// o produto mais concreto que existe ali — melhor que "sem produto associado".
test('mapaDeProdutos usa a Feature quando não há épico na cadeia', () => {
  const mapa = C.mapaDeProdutos([
    nod(10, 'Feature', 'Template global'),
    nod(100, 'Product Backlog Item', 'Componentes de ícones', 10),
  ]);
  assert.equal(mapa.get(100).titulo, 'Template global');
  assert.equal(mapa.has(10), false); // a própria Feature raiz não é produto de si mesma
});

test('mapaDeProdutos não inventa produto para item sem pai', () => {
  const mapa = C.mapaDeProdutos([nod(100, 'Product Backlog Item', 'PBI solto')]);
  assert.equal(mapa.has(100), false);
});

test('descricaoLimpa tira o HTML e devolve texto legível', () => {
  const html = '<div>Aumentar a <b>conversão</b> da PDP.<br>Foco em prova social &amp; mídia rica.</div><p>Segunda linha &lt;importante&gt;.</p>';
  const txt = C.descricaoLimpa(html);
  assert.ok(!txt.includes('<b>') && !txt.includes('<div>') && !txt.includes('<p>')); // tags foram
  assert.ok(txt.includes('Aumentar a conversão da PDP.'));
  assert.ok(txt.includes('prova social & mídia rica')); // &amp; decodificado
  assert.ok(txt.includes('<importante>'));               // &lt;/&gt; decodificados
  assert.ok(txt.includes('\n'));                          // <br> e </p> viraram linha
});

test('descricaoLimpa: vazio, nulo e indefinido viram string vazia', () => {
  assert.equal(C.descricaoLimpa(''), '');
  assert.equal(C.descricaoLimpa(null), '');
  assert.equal(C.descricaoLimpa(undefined), '');
});

test('descendentesConcluidos rola total e feitos por nó, em qualquer profundidade', () => {
  const roll = C.descendentesConcluidos([
    wit(1, 'Epic', 'New'),
    wit(10, 'Feature', 'Done', 1),
    wit(11, 'Feature', 'New', 1),
    wit(100, 'Product Backlog Item', 'Done', 10),
    wit(101, 'Product Backlog Item', 'New', 10),
  ]);
  assert.deepEqual(roll.get(1), { total: 4, feitos: 2 });  // 2 features + 2 pbis
  assert.deepEqual(roll.get(10), { total: 2, feitos: 1 }); // rollup vale pra Feature também
  assert.deepEqual(roll.get(100), { total: 0, feitos: 0 }); // folha não tem descendente
});

test('resumoProdutos dá o rumo (% de filhos concluídos) por produto', () => {
  const info = C.resumoProdutos([
    wit(1, 'Epic', 'New'),
    wit(10, 'Feature', 'Done', 1),
    wit(100, 'Product Backlog Item', 'New', 10),
  ]);
  assert.equal(info[1].feitos, 1);
  assert.equal(info[1].total, 2);
  assert.ok(!('descricao' in info[1]), 'não carrega mais objetivo');
});

test('pedidoDeDecisao pega a linha marcada "Decisão:" da descrição', () => {
  const bloqueado = { id: 30, fields: {
    'System.WorkItemType': 'Feature', 'System.State': 'Blocked',
    'System.Description': '<p>Integração com o ERP.</p><p>Decisão: aprovar o orçamento do ERP — com a Diretoria de TI.</p>',
  } };
  assert.equal(C.pedidoDeDecisao(bloqueado), 'aprovar o orçamento do ERP — com a Diretoria de TI.');
  assert.equal(C.pedidoDeDecisao({ id: 31, fields: { 'System.Description': '<p>Só a spec, sem marcador.</p>' } }), '');
  assert.equal(C.pedidoDeDecisao({ id: 32, fields: {} }), '');
  // aceita sem acento e sem ligar pra caixa
  assert.equal(C.pedidoDeDecisao({ id: 33, fields: { 'System.Description': 'DECISAO: seguir com o fornecedor B.' } }), 'seguir com o fornecedor B.');
});

test('resumoMensal compara com o mês anterior e ranqueia produtos', () => {
  const itens = [
    nod(1, 'Epic', 'Nova PDP'),
    nod(2, 'Epic', 'Tema Global'),
    fim(10, 'Product Backlog Item', 'Done', '2026-08-05T00:00:00Z'),
    fim(11, 'Product Backlog Item', 'Done', '2026-08-06T00:00:00Z'),
    fim(12, 'Product Backlog Item', 'Done', '2026-08-07T00:00:00Z'),
    fim(20, 'Product Backlog Item', 'Done', '2026-07-05T00:00:00Z'),
  ];
  itens[2].fields['System.Parent'] = 1;
  itens[3].fields['System.Parent'] = 1;
  itens[4].fields['System.Parent'] = 2;
  itens[5].fields['System.Parent'] = 2;
  const mapa = C.mapaDeProdutos(itens);
  const meses = C.resumoMensal(C.reportPorMes(itens), mapa);
  assert.equal(meses[0].mes, '2026-08');
  assert.equal(meses[0].resumo.delta, 2);            // 3 em agosto contra 1 em julho
  assert.equal(meses[0].resumo.mesAnterior, '2026-07');
  assert.deepEqual(meses[0].resumo.produtos, [{ titulo: 'Nova PDP', n: 2 }, { titulo: 'Tema Global', n: 1 }]);
  assert.equal(meses[1].resumo.delta, null);         // não há mês antes de julho
});

test('resumoMensal destaca épico concluído no mês', () => {
  const itens = [fim(1, 'Epic', 'Done', '2026-08-10T00:00:00Z')];
  itens[0].fields['System.Title'] = 'Compliance Google';
  const meses = C.resumoMensal(C.reportPorMes(itens), C.mapaDeProdutos(itens));
  assert.deepEqual(meses[0].resumo.epicosFechados, [{ id: 1, titulo: 'Compliance Google' }]);
});

/* ---- Briefing do mês (Report para stakeholder) ---- */
// item completo: tipo, estado, alvo (dias), fechado (dias atrás), alterado (dias atrás)
const bi = (id, tipo, estado, titulo, alvoDias, fechadoDias, alteradoDias) => {
  const dia = 86400000;
  return { id, fields: {
    'System.WorkItemType': tipo, 'System.State': estado, 'System.Title': titulo,
    'Microsoft.VSTS.Scheduling.TargetDate': alvoDias == null ? undefined : new Date(AGORA + alvoDias * dia).toISOString(),
    'Microsoft.VSTS.Common.ClosedDate': fechadoDias == null ? undefined : new Date(AGORA - fechadoDias * dia).toISOString(),
    'System.ChangedDate': new Date(AGORA - (alteradoDias == null ? 1 : alteradoDias) * dia).toISOString(),
  } };
};

test('briefingDoMes separa feito, execução, travado e prazos', () => {
  const b = C.briefingDoMes([
    bi(1, 'Feature', 'Done', 'Entregue neste mês', null, 5),
    bi(2, 'Feature', 'Done', 'Entregue mês passado', null, 45),
    bi(3, 'Product Backlog Item', 'In Progress', 'Em curso', 6),
    bi(4, 'Product Backlog Item', 'New', 'Na fila', 8),        // fila não é execução
    bi(5, 'Feature', 'Blocked', 'Travado', -2, null, 20),
  ], AGORA);
  assert.deepEqual(b.feitos.map((x) => x.item.id), [1]);        // só o do mês corrente
  assert.deepEqual(b.execucao.map((x) => x.item.id), [3]);      // 'New' fica fora
  assert.deepEqual(b.travados.map((x) => x.item.id), [5]);
  assert.deepEqual(b.prazos.atrasados.map((x) => x.item.id), [5]); // travado e vencido: nos dois
  assert.deepEqual(b.prazos.esteMes.map((x) => x.item.id), [3, 4]);
  assert.equal(b.travados[0].dias, 20);
});

test('briefingDoMes classifica prazo deste mês, do próximo e ignora o distante', () => {
  const agosto = Date.parse('2026-08-10T12:00:00Z');
  const b = C.briefingDoMes([
    bi(1, 'Feature', 'New', 'Fecha em agosto', null),
    bi(2, 'Feature', 'New', 'Fecha em setembro', null),
    bi(3, 'Feature', 'New', 'Fecha em dezembro', null),
  ].map((it, i) => {
    it.fields['Microsoft.VSTS.Scheduling.TargetDate'] = ['2026-08-25', '2026-09-15', '2026-12-01'][i] + 'T00:00:00Z';
    return it;
  }), agosto);
  assert.deepEqual(b.prazos.esteMes.map((x) => x.item.id), [1]);
  assert.deepEqual(b.prazos.proximoMes.map((x) => x.item.id), [2]);
  assert.equal(b.prazos.atrasados.length, 0);
  assert.equal(b.mes, '2026-08');
});

test('briefingDoMes: virada de ano no "próximo mês"', () => {
  const dezembro = Date.parse('2026-12-10T12:00:00Z');
  const it = bi(1, 'Feature', 'New', 'Fecha em janeiro', null);
  it.fields['Microsoft.VSTS.Scheduling.TargetDate'] = '2027-01-20T00:00:00Z';
  const b = C.briefingDoMes([it], dezembro);
  assert.deepEqual(b.prazos.proximoMes.map((x) => x.item.id), [1]);
});

test('briefingDoMes ordena: entrega recente, prazo mais próximo, travado mais antigo', () => {
  const b = C.briefingDoMes([
    bi(1, 'Feature', 'Done', 'Fechou hoje', null, 1),
    bi(2, 'Feature', 'Done', 'Fechou semana passada', null, 7),
    bi(3, 'Feature', 'Blocked', 'Travado 5d', null, null, 5),
    bi(4, 'Feature', 'Blocked', 'Travado 30d', null, null, 30),
  ], AGORA);
  assert.deepEqual(b.feitos.map((x) => x.item.id), [1, 2]);
  assert.deepEqual(b.travados.map((x) => x.item.id), [4, 3]);
});

test('briefingDoMes devolve a fila (o que ainda não começou), separada da execução', () => {
  const b = C.briefingDoMes([
    bi(1, 'Product Backlog Item', 'New', 'Na fila com data', 8),
    bi(2, 'Product Backlog Item', 'Ready', 'Na fila sem data', null),
    bi(3, 'Product Backlog Item', 'In Progress', 'Rodando', 6),
    bi(4, 'Product Backlog Item', 'Done', 'Feito', null, 2),
  ], AGORA);
  assert.deepEqual(b.fila.map((x) => x.item.id), [1, 2]); // quem tem data marcada na frente
  assert.deepEqual(b.execucao.map((x) => x.item.id), [3]);
});

test('briefingDoMes não conta épico como execução, fila ou prazo — ele é a frente; travado continua', () => {
  const b = C.briefingDoMes([
    bi(1, 'Epic', 'In Progress', 'Iniciativa', 5),
    bi(2, 'Epic', 'Blocked', 'Iniciativa travada', -3, null, 10),
    bi(10, 'Feature', 'In Progress', 'Item', 5),
  ], AGORA);
  assert.deepEqual(b.execucao.map((x) => x.item.id), [10]);
  assert.deepEqual(b.prazos.esteMes.map((x) => x.item.id), [10]);
  assert.deepEqual(b.travados.map((x) => x.item.id), [2]);
  assert.deepEqual(b.prazos.atrasados.map((x) => x.item.id), [2]);
});

/* ---- Por frente ---- */
const fr = (id, tipo, estado, titulo, pai, alvoDias) => ({ id, fields: {
  'System.WorkItemType': tipo, 'System.State': estado, 'System.Title': titulo,
  'System.Parent': pai || undefined,
  'Microsoft.VSTS.Scheduling.TargetDate': alvoDias == null ? undefined : new Date(AGORA + alvoDias * 86400000).toISOString(),
} });

test('frentes agrupa por produto e ordena por movimento, depois risco, depois nome', () => {
  const dia = 86400000;
  const itens = [
    fr(1, 'Epic', 'In Progress', 'Zeta', null, 40),
    fr(2, 'Epic', 'In Progress', 'Alfa', null),
    fr(3, 'Epic', 'New', 'Beta', null),
    fr(4, 'Epic', 'In Progress', 'Gama', null),
    fr(5, 'Epic', 'In Progress', 'Delta', null),
    fr(10, 'Feature', 'Done', 'Z1', 1), fr(11, 'Feature', 'In Progress', 'Z2', 1, 5),
    fr(20, 'Feature', 'In Progress', 'A1', 2), fr(21, 'Feature', 'Blocked', 'A2', 2),
    fr(30, 'Feature', 'New', 'B1', 3, 12),
    fr(40, 'Feature', 'In Progress', 'G1', 4),
    fr(50, 'Feature', 'In Progress', 'D1', 5),
    fr(90, 'Feature', 'In Progress', 'Solto', null),
  ];
  const f = C.frentes({
    mapa: C.mapaDeProdutos(itens),
    entregas: [{ item: itens[5], quando: AGORA - dia, aproximada: false }],
    execucao: [{ item: itens[6] }, { item: itens[7] }, { item: itens[10] }, { item: itens[11] }, { item: itens[12] }],
    travados: [{ item: itens[8], dias: 3 }],
    atrasados: [],
    comData: [{ item: itens[6], alvo: AGORA + 5 * dia }, { item: itens[9], alvo: AGORA + 12 * dia }],
    fila: [{ item: itens[9] }],
    agora: AGORA,
  });
  // Zeta (2 movimentos) > Alfa (1 e uma trava) > Delta e Gama (1, sem trava,
  // pelo nome). Beta só tem fila e fica de fora.
  assert.deepEqual(f.map((x) => x.produto.id), [1, 2, 5, 4]);
  assert.equal(f[0].entregas.length, 1);
  assert.equal(f[0].andamento.length, 1);
  assert.equal(f[0].proximo.item.id, 11); // o marco é do item, não o prazo do épico (40d)
  assert.equal(f[1].travados.length, 1);
  assert.equal(f[1].proximo, null);      // sem data em nada: sem marco
  assert.ok(!f.some((x) => x.andamento.some((r) => r.item.id === 90)), 'item sem produto não vira frente');
});

// Card de frente é pra contar o que andou. Fila, trava e vazio não bastam: o
// card não tem bloco que nomeie o travado, então viraria cartão vazio com selo
// vermelho. O travado continua em Depende de decisão.
test('frentes deixa de fora quem não entregou nem tem nada andando', () => {
  const itens = [
    fr(1, 'Epic', 'In Progress', 'Só fila', null, 30),
    fr(10, 'Feature', 'New', 'Ainda não começou', 1, 10),
    fr(2, 'Epic', 'New', 'Nada de nada', null, 50),
    fr(3, 'Epic', 'In Progress', 'Só travado', null),
    fr(30, 'Feature', 'Blocked', 'Empacou', 3),
    fr(4, 'Epic', 'In Progress', 'Tem gente trabalhando', null),
    fr(40, 'Feature', 'In Progress', 'Rodando', 4),
  ];
  const f = C.frentes({
    mapa: C.mapaDeProdutos(itens),
    entregas: [], atrasados: [],
    execucao: [{ item: itens[6] }],
    travados: [{ item: itens[4], dias: 9 }],
    comData: [{ item: itens[1], alvo: AGORA + 10 * 86400000 }],
    fila: [{ item: itens[1] }],
    agora: AGORA,
  });
  assert.deepEqual(f.map((x) => x.produto.id), [4]);
});

test('frentes: épico entregue no mês marca a frente concluída; sem item com data, vale o prazo do épico', () => {
  const itens = [
    fr(1, 'Epic', 'Done', 'Fechou', null),
    fr(2, 'Epic', 'In Progress', 'Só o prazo do épico', null, 20),
    fr(21, 'Feature', 'In Progress', 'Sem data', 2),
  ];
  const f = C.frentes({
    mapa: C.mapaDeProdutos(itens),
    entregas: [{ item: itens[0], quando: AGORA, aproximada: false }],
    execucao: [{ item: itens[2] }],
    comData: [], fila: [], travados: [], atrasados: [],
    agora: AGORA,
  });
  const fechou = f.find((x) => x.produto.id === 1);
  assert.ok(fechou.fechouNoMes && fechou.concluida);
  assert.equal(fechou.entregas.length, 0); // o épico não é linha de si mesmo
  const soPrazo = f.find((x) => x.produto.id === 2);
  assert.equal(soPrazo.proximo.item, null);
  assert.equal(new Date(soPrazo.proximo.alvo).toISOString().slice(0, 10),
    new Date(AGORA + 20 * 86400000).toISOString().slice(0, 10));
});

/* ---- Rolagem animada do menu do report ---- */
test('suavizarRolagem sai de 0, chega em 1 e nunca volta atrás', () => {
  assert.equal(C.suavizarRolagem(0), 0);
  assert.equal(C.suavizarRolagem(1), 1);
  assert.equal(C.suavizarRolagem(0.5), 0.5);   // simétrica no meio
  let anterior = -1;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const v = C.suavizarRolagem(t);
    assert.ok(v >= anterior, 'curva não pode recuar em t=' + t.toFixed(2));
    anterior = v;
  }
});

test('suavizarRolagem começa e termina mais devagar que o meio', () => {
  const arranque = C.suavizarRolagem(0.1) - C.suavizarRolagem(0);
  const meio = C.suavizarRolagem(0.55) - C.suavizarRolagem(0.45);
  const chegada = C.suavizarRolagem(1) - C.suavizarRolagem(0.9);
  assert.ok(meio > arranque, 'o meio tem que ser o trecho mais rápido');
  assert.ok(meio > chegada);
  assert.ok(Math.abs(arranque - chegada) < 1e-9); // entra e sai no mesmo ritmo
});

test('suavizarRolagem segura t fora da faixa', () => {
  assert.equal(C.suavizarRolagem(-3), 0);
  assert.equal(C.suavizarRolagem(9), 1);
});

test('duracaoRolagem tem piso, teto e não liga pro sentido', () => {
  assert.equal(C.duracaoRolagem(10), 220);      // piso: salto curto não fica lento
  assert.equal(C.duracaoRolagem(800), 400);
  assert.equal(C.duracaoRolagem(5000), 600);    // teto: página inteira não arrasta
  assert.equal(C.duracaoRolagem(-800), 400);    // subir custa o mesmo que descer
});
