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

test('groupMyItems agrupa por estado', () => {
  const g = C.groupMyItems([
    { id: 1, fields: { 'System.State': 'Active' } },
    { id: 2, fields: { 'System.State': 'New' } },
    { id: 3, fields: { 'System.State': 'Active' } },
  ]);
  assert.equal(g.length, 2);
  assert.equal(g[0].state, 'Active');
  assert.equal(g[0].items.length, 2);
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

test('isTerminalState é case-insensitive', () => {
  assert.equal(C.isTerminalState('done'), true);
  assert.equal(C.isTerminalState('Active'), false);
});
