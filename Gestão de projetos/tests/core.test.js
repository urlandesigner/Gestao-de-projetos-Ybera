const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');

test('orgBaseUrl normaliza variações', () => {
  assert.equal(C.orgBaseUrl('dev.azure.com/ybera'), 'https://dev.azure.com/ybera');
  assert.equal(C.orgBaseUrl('https://dev.azure.com/ybera/'), 'https://dev.azure.com/ybera');
  assert.equal(C.orgBaseUrl('ybera'), 'https://dev.azure.com/ybera');
  assert.throws(() => C.orgBaseUrl(''));
  assert.throws(() => C.orgBaseUrl('dev.azure.com/a/b'));
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
