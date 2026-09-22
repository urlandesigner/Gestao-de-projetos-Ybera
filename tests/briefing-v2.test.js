/* Report v2: o que estes testes guardam é o CONTRATO com report.js.

   O v2 troca a forma inteira do documento, mas continua sendo desenhado pelo
   mesmo controlador — que procura no HTML gerado um punhado de ids, classes e
   data-* pra ligar busca, chips, seletor de mês e rolagem. Nada disso aparece
   quebrado na tela: o documento renderiza bonito e o filtro simplesmente não
   filtra. Por isso vale um teste, e não um olhar.

   A forma em si (cor, régua, tipografia) não se testa aqui — se testa olhando. */
const test = require('node:test');
const assert = require('node:assert/strict');
const B2 = require('../assets/briefing-v2.js');

const AGORA = Date.parse('2026-09-17T12:00:00Z');
const dia = 86400000;
const iso = (t) => new Date(t).toISOString();

const epico = (id, titulo, alvoDias) => ({
  id, fields: {
    'System.WorkItemType': 'Epic', 'System.State': 'In Progress', 'System.Title': titulo,
    'Microsoft.VSTS.Scheduling.TargetDate': alvoDias == null ? undefined : iso(AGORA + alvoDias * dia),
  },
});
const filho = (id, tipo, estado, titulo, pai, o = {}) => ({
  id, fields: {
    'System.WorkItemType': tipo, 'System.State': estado, 'System.Title': titulo, 'System.Parent': pai,
    'Microsoft.VSTS.Common.ClosedDate': o.fechadoDias == null ? undefined : iso(AGORA - o.fechadoDias * dia),
    'System.ChangedDate': iso(AGORA - (o.alteradoDias == null ? 1 : o.alteradoDias) * dia),
    'Microsoft.VSTS.Scheduling.TargetDate': o.alvoDias == null ? undefined : iso(AGORA + o.alvoDias * dia),
  },
});

// Um mês com tudo ligado: entrega, execução, trava e prazo — só assim todas as
// seções existem e o contrato inteiro fica sob teste.
function documento(extra) {
  const e1 = epico(1, 'Checkout unificado', 30);
  const items = [
    e1,
    filho(10, 'Feature', 'Done', 'Gateway PIX', 1, { fechadoDias: 5 }),
    filho(11, 'Product Backlog Item', 'Done', 'Tela de confirmação', 1, { fechadoDias: 2 }),
    filho(12, 'Product Backlog Item', 'In Progress', 'QR code expirado', 1),
    filho(13, 'Product Backlog Item', 'Blocked', 'Copy de recusa', 1, { alvoDias: -9, alteradoDias: 28 }),
    filho(14, 'Product Backlog Item', 'New', 'Regressão', 1, { alvoDias: 8 }),
  ];
  return B2.htmlReport(Object.assign({ items, todos: items, agora: AGORA, escopo: 'Urlan Dipre', unidade: 'Ybera US' }, extra || {}));
}

test('v2 devolve o mesmo formato do v1 (vazio, meses, html)', () => {
  const r = documento();
  assert.equal(r.vazio, false);
  assert.ok(Array.isArray(r.meses) && r.meses.length);
  assert.equal(typeof r.html, 'string');
});

test('v2 mantém os ganchos que report.js procura pra ligar os controles', () => {
  const h = documento().html;
  // rolagem e medição da nav
  assert.match(h, /class="report-doc/);
  assert.match(h, /class="doc-nav/);
  // seletor de mês
  assert.match(h, /id="mes-global"/);
  // busca, chips, contador e limpar do bloco de entregas
  assert.match(h, /id="busca-entregas"/);
  assert.match(h, /id="lista-entregas"/);
  assert.match(h, /id="conta-entregas"/);
  assert.match(h, /id="limpar-entregas"/);
  assert.match(h, /class="chip-doc[^"]*"[^>]*data-filtro="produto"[^>]*data-valor="/);
});

test('v2 marca os itens de entrega com os data-* do filtro', () => {
  const h = documento().html;
  assert.match(h, /class="[^"]*\bgrupo-produto\b[^"]*" data-produto="/);
  assert.match(h, /<li data-tipo="[a-z]+" data-produto="[^"]*" data-busca="/);
});

test('v2: todo link da nav aponta pra uma seção que existe no documento', () => {
  const h = documento().html;
  const alvos = [...h.matchAll(/<a href="#([a-z]+)"/g)].map((m) => m[1]);
  assert.ok(alvos.length >= 3, 'a nav precisa listar as seções');
  for (const id of alvos) {
    assert.match(h, new RegExp(`<section class="rl-sec" id="${id}"`), `seção #${id} não existe`);
  }
});

test('v2 usa o nome de negócio quando existe, e o título do sistema quando não', () => {
  const r = documento({ nomes: { 1: { nome: 'Pagamentos', resumo: 'Um fluxo só.' } } });
  assert.ok(r.html.includes('Pagamentos'), 'nome de negócio do épico deve aparecer');
  assert.ok(r.html.includes('Gateway PIX'), 'item sem nome mantém o título do sistema');
});

test('v2 escapa o que vem do DevOps (título com HTML não vira marcação)', () => {
  const e = epico(1, '<img src=x onerror=alert(1)>', 10);
  const items = [e, filho(10, 'Feature', 'Done', 'ok', 1, { fechadoDias: 3 })];
  const h = B2.htmlReport({ items, todos: items, agora: AGORA }).html;
  assert.ok(!h.includes('<img src=x'), 'a tag não pode sair crua');
  assert.ok(h.includes('&lt;img src=x'));
});

test('v2: mês sem nada registrado devolve vazio, sem quebrar', () => {
  const r = B2.htmlReport({ items: [], todos: [], agora: AGORA });
  assert.equal(r.vazio, true);
  assert.ok(r.html.includes('Nada registrado'));
});

test('v2: mês fechado não afirma execução nem trava (só o histórico)', () => {
  const r = documento({ mes: '2026-07' });
  assert.ok(!r.html.includes('id="proximos"'), 'Próximos passos é leitura de agora');
  assert.ok(!r.html.includes('id="decisao"'), 'Decisão é leitura de agora');
  assert.ok(r.html.includes('id="agora"'), 'e o documento explica por quê');
});

test('v2: roadmap distingue os três estados — plano, em andamento e concluído', () => {
  const roadmap = [
    { titulo: 'Rodando', inicio: '2026-01-01', fim: '2026-03-31', status: 'andamento' },
    { titulo: 'Terminou', inicio: '2026-01-01', fim: '2026-01-31', status: 'concluido' },
    { titulo: 'Só plano', inicio: '2026-02-01', fim: '2026-02-28' },
    { titulo: 'Status inventado', inicio: '2026-02-01', fim: '2026-02-28', status: 'talvez' },
  ];
  const h = documento({ roadmap }).html;
  // Três barras diferentes: neutra (plano), escura (rodando), verde (feito).
  assert.equal((h.match(/rl-rm-barra-andamento/g) || []).length, 1);
  assert.equal((h.match(/rl-rm-barra-feita/g) || []).length, 1);
  assert.equal((h.match(/rl-rm-barra"/g) || []).length, 2, 'plano e status inventado ficam na barra neutra');
  // Concluído leva selo; em andamento fala pela cor, com o title por trás dela.
  assert.ok(h.includes('Terminou <span class="rl-rm-feito">concluído</span>'));
  assert.equal((h.match(/class="rl-rm-feito"/g) || []).length, 1);
  assert.ok(!h.includes('em andamento</span>'), 'em andamento não vira selo de texto');
  assert.equal((h.match(/title="Em andamento"/g) || []).length, 1);
  // Sem status (ou com status que não existe) o documento não afirma nada.
  assert.ok(!h.includes('Só plano <span class="rl-rm-'));
  assert.ok(!h.includes('Status inventado <span class="rl-rm-'));
});
