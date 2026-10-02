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
