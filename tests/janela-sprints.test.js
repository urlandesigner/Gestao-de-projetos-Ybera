/* QUAL SPRINT É A ANTERIOR, A ATUAL E A PRÓXIMA.

   O DevOps responde "a corrente" sozinho (?$timeframe=current), mas não as
   vizinhas: pra elas é preciso listar as iterações do time e escolher por data.
   Essa escolha tem bordas que não se vê olhando a tela — o dia exato da virada,
   iteração sem data cadastrada, buraco entre duas sprints, e o caso de não
   haver corrente nenhuma (a equipe está entre sprints). Por isso é função pura
   e tem teste; o desenho das três colunas se confere olhando. */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/core.js');

const HOJE = Date.parse('2026-10-02T12:00:00Z');
const it = (nome, inicio, fim) => ({
  id: nome, name: nome, path: 'Projeto\\' + nome,
  start: inicio ? inicio + 'T00:00:00Z' : null,
  finish: fim ? fim + 'T23:59:59Z' : null,
});

const TRES = [
  it('Sprint 10', '2026-09-01', '2026-09-14'),
  it('Sprint 11', '2026-09-15', '2026-09-28'),
  it('Sprint 12', '2026-09-29', '2026-10-12'),
  it('Sprint 13', '2026-10-13', '2026-10-26'),
];

test('escolhe a atual pela data de hoje, e as vizinhas por vizinhança', () => {
  const j = C.janelaDeSprints(TRES, HOJE);
  assert.equal(j.atual.name, 'Sprint 12');
  assert.equal(j.anterior.name, 'Sprint 11', 'a anterior é a que fechou mais perto, não a primeira da lista');
  assert.equal(j.proxima.name, 'Sprint 13');
});

test('a ordem da lista não importa — quem manda é a data', () => {
  const j = C.janelaDeSprints([...TRES].reverse(), HOJE);
  assert.equal(j.atual.name, 'Sprint 12');
  assert.equal(j.anterior.name, 'Sprint 11');
  assert.equal(j.proxima.name, 'Sprint 13');
});

/* O primeiro e o último dia pertencem à sprint. Sem isso, no dia da virada o
   time abriria a Central e veria "nenhuma sprint em curso" — justo no dia em
   que mais se olha pro board. */
test('o primeiro e o último dia ainda são da sprint', () => {
  const primeiro = Date.parse('2026-09-29T00:00:00Z');
  const ultimo = Date.parse('2026-10-12T23:59:00Z');
  assert.equal(C.janelaDeSprints(TRES, primeiro).atual.name, 'Sprint 12');
  assert.equal(C.janelaDeSprints(TRES, ultimo).atual.name, 'Sprint 12');
});

/* Time entre sprints: a anterior fechou, a próxima ainda não abriu. Inventar
   uma "atual" aqui seria mentir sobre o que está em curso. */
test('sem sprint cobrindo hoje, atual é null e as vizinhas continuam', () => {
  const comBuraco = [it('Sprint A', '2026-09-01', '2026-09-20'), it('Sprint B', '2026-10-10', '2026-10-24')];
  const j = C.janelaDeSprints(comBuraco, HOJE);
  assert.equal(j.atual, null);
  assert.equal(j.anterior.name, 'Sprint A');
  assert.equal(j.proxima.name, 'Sprint B');
});

test('iteração sem data fica de fora — não dá pra situá-la no tempo', () => {
  const j = C.janelaDeSprints([...TRES, it('Backlog', null, null)], HOJE);
  for (const s of [j.anterior, j.atual, j.proxima]) assert.notEqual(s && s.name, 'Backlog');
});

test('só a corrente cadastrada: as vizinhas vêm null, sem quebrar', () => {
  const j = C.janelaDeSprints([it('Sprint 12', '2026-09-29', '2026-10-12')], HOJE);
  assert.equal(j.atual.name, 'Sprint 12');
  assert.equal(j.anterior, null);
  assert.equal(j.proxima, null);
});

test('lista vazia ou torta devolve as três null', () => {
  for (const entrada of [[], null, undefined, [{}], [{ name: 'x' }]]) {
    assert.deepEqual(C.janelaDeSprints(entrada, HOJE), { anterior: null, atual: null, proxima: null });
  }
});

/* ---------- a reserva pro cache antigo ---------- */
/* Defeito real: o quadro de três colunas lê `entry.janela`, campo que só
   existe depois de uma busca nova. O refreshAll não rebusca com cache de menos
   de 10 minutos — então, pra quem já tinha a Central aberta, o bloco de
   sprints simplesmente SUMIU da tela em vez de virar quadro. O Urlan abriu e
   não achou.

   A lição não é sobre sprint: todo campo novo no cache tem esse intervalo em
   que o dado velho ainda manda, e tela que depende só do campo novo fica em
   branco nele. */
const fs = require('node:fs');
const path = require('node:path');
const fonteApp = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');

test('o quadro tem reserva pro cache que ainda não tem a janela', () => {
  const bloco = /const janela = doCard\.janela[\s\S]*?: null\);/.exec(fonteApp);
  assert.ok(bloco, 'a reserva sumiu: cache antigo volta a deixar o bloco em branco');
  assert.match(bloco[0], /doCard\.sprint/,
    'a reserva precisa nascer da sprint corrente, que o cache antigo já tinha');
  assert.match(bloco[0], /anterior: null, proxima: null/,
    'sem a janela só dá pra afirmar a corrente — as vizinhas não estavam no cache velho');
});

test('a reserva marca os itens como não-feitos, que é o que o cache velho guardava', () => {
  // itensSprintAbertos já vinha filtrado; sem o campo `feito`, o desenho da
  // coluna atual (que filtra por !feito) descartaria todos eles.
  const bloco = /const janela = doCard\.janela[\s\S]*?: null\);/.exec(fonteApp)[0];
  assert.match(bloco, /feito: false/,
    'sem isso a coluna em curso mostraria a sprint vazia');
});

/* ---------- o placar segue quem está filtrado ---------- */
/* Defeito que o Urlan achou olhando a Sprint 19: o card dizia "50/62" e listava
   2 itens. Não era bug de contagem — eram duas populações na mesma linha. O
   placar vinha da sprint inteira e a lista já vinha filtrada pelo responsável
   selecionado no topo da Central. Lado a lado, os números não fechavam.

   Ele escolheu que o placar siga o filtro. Isso só é verdade se as duas contas
   usarem a MESMA régua de "feito" e o MESMO corte de Task — e é isso que o
   teste de equivalência abaixo trava. */
test('placarDeSprint conta igual ao sprintProgress, na forma curta', () => {
  const bruto = [
    { id: 1, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done' } },
    { id: 2, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'In Progress' } },
    { id: 3, fields: { 'System.WorkItemType': 'Bug', 'System.State': 'Closed' } },
    { id: 4, fields: { 'System.WorkItemType': 'Task', 'System.State': 'Done' } },
    { id: 5, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Impediment' } },
  ];
  // mesma forma curta que o resumoDeSprint produz no app.js
  const curto = bruto
    .filter((it) => it.fields['System.WorkItemType'] !== 'Task')
    .map((it) => ({ id: it.id, feito: C.stateBucket(it.fields['System.State']) === 'feito' }));
  assert.deepEqual(C.placarDeSprint(curto), C.sprintProgress(bruto),
    'as duas contas precisam concordar, senão o placar e a lista brigam na tela');
  assert.deepEqual(C.placarDeSprint(curto), { done: 2, total: 4 }, 'Task fora, Impediment não é feito');
});

test('placarDeSprint num recorte devolve o recorte, não o todo', () => {
  const meus = [{ id: 1, feito: true }, { id: 2, feito: true }, { id: 3, feito: false }];
  assert.deepEqual(C.placarDeSprint(meus), { done: 2, total: 3 });
});

test('placarDeSprint aguenta lista vazia ou torta', () => {
  for (const e of [[], null, undefined]) assert.deepEqual(C.placarDeSprint(e), { done: 0, total: 0 });
});

/* ---------- o clique leva à sprint certa ---------- */
/* As três colunas apontavam pra mesma rota (#board/proj/time/sprint), e essa
   rota sempre filtrava pela sprint CORRENTE: a tela mostrava a Sprint 19 e o
   clique abria a 20. Passou despercebido porque, com uma coluna só, a corrente
   era a única que existia. */
test('a rota do board carrega qual sprint abrir', () => {
  assert.match(fonteApp, /function rotaBoard\(p, comSprint, iteracaoId\)/,
    'sem a iteração na rota, as três colunas voltam a abrir a mesma sprint');
  assert.match(fonteApp, /rotaBoard\(pr, true, col\.sprint\.id\)/,
    'cada cartão precisa apontar pra PRÓPRIA sprint');
  assert.match(fonteApp, /\^#board\\\/\(\[\^\/\]\+\)\\\/\(\[\^\/\]\+\)\(\?:\\\/sprint\(\?:\\\/\(\[\^\/\]\+\)\)\?\)\?\$/,
    'a rota precisa aceitar o id da iteração depois de /sprint');
});

/* O board descarta o que foi concluído há mais de 30 dias. Regra boa pro
   quadro corrente; numa sprint que já fechou é furo garantido — os 50 itens
   entregues na Sprint 19 sumiriam da tela conforme envelhecessem. */
test('o board alarga a janela de consulta pra alcançar uma sprint passada', () => {
  assert.match(fonteApp, /function diasDeCorteDoBoard\(sprint\)/);
  assert.match(fonteApp, /C\.wiqlBoard\(areas, corte\)/,
    'de nada adianta calcular o corte e não passá-lo pra consulta');
  const fn = eval('(' + /function diasDeCorteDoBoard\(sprint\) \{[\s\S]*?\n\}/.exec(fonteApp)[0]
    .replace('function diasDeCorteDoBoard', 'function')
    .replace('CORTE_BOARD_PADRAO', '30').replace(/CORTE_BOARD_PADRAO/g, '30') + ')');
  assert.equal(fn(null), 30, 'sem sprint, vale o corte de sempre');
  assert.equal(fn({ finish: new Date(Date.now() + 5 * 86400000).toISOString() }), 30,
    'sprint em curso ou futura não precisa de passado extra');
  const fechouHa60 = fn({ finish: new Date(Date.now() - 60 * 86400000).toISOString() });
  assert.ok(fechouHa60 >= 90, 'sprint fechada há 60 dias precisa alcançar além dela, não 30');
});

/* ---------- o voltar do board ---------- */
/* O botão tinha '#projetos' fixo, de quando o board só era alcançável por lá.
   Desde que o Panorama ganhou o quadro de sprints, entrar numa sprint e voltar
   despejava o usuário numa tela em que ele nunca esteve. */
test('o voltar do board usa a origem guardada, não um destino fixo', () => {
  assert.match(fonteApp, /location\.hash = boardState\.voltarPara \|\| VOLTA_PADRAO;/,
    'o destino fixo voltou: quem entrar pelo Panorama sai no Projetos');
  assert.match(fonteApp, /if \(de && de !== 'board'\) boardState\.voltarPara = '#' \+ de;/,
    'board → board (trocar de sprint) não pode virar origem, senão o voltar não sai do lugar');
  assert.match(fonteApp, /const VOLTA_PADRAO = '#projetos';/,
    'sem origem guardada (link colado, F5 no board) ainda precisa ter pra onde ir');
});

/* Os destinos que o voltar pode produzir são '#' + o nome da página, e todos
   precisam ser rota de verdade — senão o botão leva a lugar nenhum. O
   '#panorama' não tem `if` próprio: cai no fim do renderRoute, que é o padrão. */
test('toda página que pode virar origem tem rota que a reconhece', () => {
  const rota = /function renderRoute\(\)[\s\S]*?\n\}/.exec(fonteApp)[0];
  for (const pagina of ['pendencias', 'produtos', 'roadmap', 'projetos', 'meus-itens']) {
    assert.ok(rota.includes(`hash === '#${pagina}'`), `#${pagina} não é rota: o voltar morreria nela`);
  }
  assert.match(rota, /setPagina\('panorama'\); \/\/ abertura/,
    '#panorama depende do caminho padrão do renderRoute — se ele sumir, o voltar do Panorama quebra');
});
