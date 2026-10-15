/* A BUSCA NO DEVOPS E A MONTAGEM DO PACOTE fora do navegador (15/10/2026).

   O assets/pacote.js saiu de dentro do report.js pra que a função da Vercel
   faça exatamente a mesma busca e monte exatamente o mesmo pacote que o
   "Publicar dados". Estes testes rodam o módulo no Node com um DevOps falso —
   que é como a função vai rodá-lo. */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../assets/pacote.js');

const campo = (it) => it.fields || {};

// Um DevOps falso: responde só o que o módulo pergunta, e anota as perguntas.
function devopsFalso({ itens, pais = [], iteracoes = [], areasFalham = false }) {
  const perguntas = [];
  const A = {
    async teamAreas(ctx, projeto, time) {
      perguntas.push(['areas', projeto, time]);
      if (areasFalham) throw new Error('sem permissão');
      return [{ path: 'B2C\\Ecommerce', includeChildren: true }];
    },
    async runWiql(ctx, projeto, time, wiql) {
      perguntas.push(['wiql', wiql]);
      if (/Iteration/.test(wiql)) return [1];
      return itens.map((it) => it.id);
    },
    async getFields(ctx, ids) {
      perguntas.push(['campos', ids.slice()]);
      return itens.concat(pais).filter((it) => ids.includes(it.id));
    },
    async teamIterations() { return iteracoes; },
  };
  return { A, perguntas };
}

const PBI = { id: 1, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'P', 'System.Parent': 10 } };
const FEATURE = { id: 10, fields: { 'System.WorkItemType': 'Feature', 'System.Title': 'F', 'System.Parent': 100 } };
const EPICO = { id: 100, fields: { 'System.WorkItemType': 'Epic', 'System.Title': 'E' } };

test('buscarItens consulta presa à área do time e marca o projeto em cada item', async () => {
  const { A, perguntas } = devopsFalso({ itens: [PBI] });
  const r = await P.buscarItens({ A, ctx: {}, projetos: [{ projectName: 'B2C', teamName: 'Squad Ecommerce' }] });
  assert.equal(r.todos.length, 1);
  assert.equal(r.todos[0].projeto, 'B2C');
  assert.equal(r.areaIncerta, false);
  assert.equal(r.escopos[0].areas.length, 1);
  assert.match(perguntas.find((q) => q[0] === 'wiql')[1], /AreaPath/, 'a consulta não ficou presa à área do time');
});

test('área que falha não derruba a busca, mas fica marcada', async () => {
  const avisos = [];
  const { A } = devopsFalso({ itens: [PBI], areasFalham: true });
  const r = await P.buscarItens({ A, ctx: {}, avisar: (m) => avisos.push(m),
    projetos: [{ projectName: 'B2C', teamName: 'Squad Ecommerce' }] });
  assert.equal(r.areaIncerta, true);
  assert.equal(r.todos.length, 1);
  assert.match(avisos[0], /PROJETO INTEIRO/);
});

test('buscarPais sobe a cadeia até fechar, um nível por volta', async () => {
  const { A } = devopsFalso({ itens: [PBI], pais: [FEATURE, EPICO] });
  const extras = await P.buscarPais({ A, ctx: {}, base: [PBI] });
  assert.deepEqual(extras.map((x) => x.id).sort((a, b) => a - b), [10, 100]);
});

test('buscarRitmo só consulta sprint fechada, e devolve em ordem de data', async () => {
  const iteracoes = [
    // O formato que o api.js já entrega (teamIterations normaliza as datas).
    { id: 'b', name: 'Sprint 21', path: 'B2C\\Sprint 21', start: '2026-10-13T00:00:00Z', finish: '2026-10-24T00:00:00Z' },
    { id: 'a', name: 'Sprint 20', path: 'B2C\\Sprint 20', start: '2026-09-29T00:00:00Z', finish: '2026-10-10T00:00:00Z' },
  ];
  const { A, perguntas } = devopsFalso({ itens: [PBI], iteracoes });
  const linhas = await P.buscarRitmo({ A, ctx: {}, periodo: ['2026-10'], agora: Date.parse('2026-10-15T12:00:00Z'),
    escopos: [{ p: { projectName: 'B2C', teamName: 'Squad Ecommerce' }, areas: [] }] });
  assert.deepEqual(linhas.map((l) => l.sprint.name), ['Sprint 20', 'Sprint 21']);
  // A fechada ganha as duas pontas; a corrente, nenhuma consulta.
  assert.deepEqual(linhas[0].idsAgora, [1]);
  assert.equal(linhas[1].idsAgora, null);
  assert.equal(perguntas.filter((q) => q[0] === 'wiql').length, 2);
});

test('sem período, o ritmo não pergunta nada', async () => {
  const { A, perguntas } = devopsFalso({ itens: [] });
  assert.deepEqual(await P.buscarRitmo({ A, ctx: {}, periodo: [], agora: 0, escopos: [] }), []);
  assert.equal(perguntas.length, 0);
});

test('o pacote do link não leva bloco local; o do arquivo leva', () => {
  const B = { precisaDeSprints: true, precisaDeEntregas: true,
    contagensDoLink: () => ({ f: { 10: 1 }, e: {} }),
    entregasConcluidas: () => ({ itens: [{ id: 1 }], frentes: [] }),
    periodoDoDocumento: () => ['2026-10'] };
  const base = { B, mostrados: [PBI], todos: [PBI, FEATURE, EPICO], todosItens: [PBI],
    sprintsBrutas: [], resumos: {}, roadmap: [], escopo: 'Urlan Dipre', mes: null, agora: 123 };
  const link = JSON.parse(JSON.stringify(P.montarEntregas(Object.assign({ paraArquivo: false }, base))));
  assert.deepEqual(Object.keys(link).sort(), ['automaticos', 'contagens', 'em', 'escopo', 'mes', 'roadmap', 'sprints', 'v']);
  assert.equal(link.em, 123);
  const arquivo = P.montarEntregas(Object.assign({ paraArquivo: true }, base));
  assert.ok(arquivo._entregas, 'o material de trabalho sumiu do arquivo do PO');
});
