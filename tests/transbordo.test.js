/* TRANSBORDO: o que a sprint teve e não tem mais.

   O DevOps guarda só a iteração ATUAL de cada item. Quem não fecha e é
   repriorizado some do backlog da sprint antiga sem deixar rastro lá — então a
   coluna "Anterior" do Panorama mostrava a sprint como ela ESTÁ, não como foi.

   Caso que originou isto (Sprint 19 do Squad Ecommerce, 05/10/2026): o PO via 2
   PBIs no nome dele. Teve 5. Os três que faltavam — 49931, 49959 e 51676 —
   saíram em 28/09, no dia em que a Sprint 20 começou, e o histórico de cada um
   confirmou `Sprint 19 → Sprint 20`.

   O barato aqui é a cláusula ASOF: uma consulta por coluna passada, em vez de
   uma chamada de histórico por item (~170 numa sprint real). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');

const S19 = 'B2C\\2026\\Sprint 19';

/* ---------- a consulta ---------- */
/* UM construtor só pras duas pontas. É a correção estrutural: enquanto "hoje" e
   "no fim" eram consultas diferentes — WIQL de um lado, API da iteração do
   outro — a diferença misturava transbordo com desencontro de definição. Medido
   na Sprint 19: 141 contra 147, e itens que nunca saíram apareciam como se
   tivessem saído. */
test('as duas pontas diferem APENAS pelo ASOF', () => {
  const areas = [{ path: 'B2C\\Squad Ecommerce', children: true }];
  const hoje = C.wiqlIteracao(S19, areas);
  const noFim = C.wiqlIteracao(S19, areas, Date.parse('2026-09-25T23:59:59Z'));
  assert.equal(noFim.replace(hoje, '').trim(), "ASOF '2026-09-25T23:59:59Z'",
    'qualquer outra diferença entre as duas consultas vira transbordo falso');
  assert.ok(noFim.startsWith(hoje), 'o ASOF fecha a consulta, não a reescreve');
});

test('a consulta pergunta pela iteração, com a cerca de área do time', () => {
  const q = C.wiqlIteracao(S19, [{ path: 'B2C\\Squad Ecommerce', children: true }],
    Date.parse('2026-09-25T23:59:59Z'));
  assert.match(q, /\[System\.IterationPath\] = 'B2C\\2026\\Sprint 19'/);
  assert.match(q, /\[System\.AreaPath\] UNDER 'B2C\\Squad Ecommerce'/);
  assert.match(q, /\[System\.TeamProject\] = @project/);
  /* Sem recorte de tipo: a pergunta é "quem estava aqui". Quem decide o que
     vira cartão é o resumoDeSprint, o mesmo que filtra a lista de hoje. */
  assert.ok(!/WorkItemType/.test(q), 'filtrar tipo aqui divergiria da lista de hoje');
});

/* A cerca de área não é opcional, e custou uma rodada contra o DevOps real:
   sem ela a consulta varre o projeto inteiro — 474 itens contra 236 na Sprint
   19, com gente de outras squads virando transbordo permanente. */
test('sem área a consulta fica larga demais, e isso é visível no texto', () => {
  const q = C.wiqlIteracao(S19, [], Date.parse('2026-09-25T23:59:59Z'));
  assert.ok(!/AreaPath/.test(q));
  assert.match(q, /ASOF '/);
});

test('aspas no caminho da iteração são escapadas', () => {
  const q = C.wiqlIteracao("B2C\\Time d'Água\\Sprint 1", [], Date.parse('2026-09-25T00:00:00Z'));
  assert.match(q, /'B2C\\Time d''Água\\Sprint 1'/);
});

/* Sem instante é a pergunta sobre HOJE — e tem que ser válida, porque é uma das
   duas pontas. Sem caminho não há pergunta; data torta não pode virar consulta
   quebrada no meio do carregamento do Panorama. */
test('sem instante pergunta pelo agora; sem caminho ou com data torta, não pergunta', () => {
  assert.ok(!/ASOF/.test(C.wiqlIteracao(S19, [])));
  assert.equal(C.wiqlIteracao('', [], Date.parse('2026-09-25')), null);
  assert.equal(C.wiqlIteracao(null, []), null);
  assert.equal(C.wiqlIteracao(S19, [], 'data torta'), null);
  assert.equal(C.wiqlIteracao(S19, [], NaN), null);
});

test('aceita a data como texto ISO ou como número', () => {
  assert.equal(C.wiqlIteracao(S19, [], '2026-09-25T23:59:59Z'),
    C.wiqlIteracao(S19, [], Date.parse('2026-09-25T23:59:59Z')));
});

/* ---------- a conta ---------- */
test('transbordou é quem estava no fim e não está mais', () => {
  const hoje = [{ id: 49173 }, { id: 50906 }];
  assert.deepEqual(C.transbordados([49173, 50906, 49931, 49959, 51676], hoje), [49931, 49959, 51676]);
});

/* Item que saiu e VOLTOU está nos dois conjuntos: ele está na sprint agora,
   que é o que a coluna afirma. Marcá-lo de transbordo seria mentir. */
test('item que voltou pra sprint não é transbordo', () => {
  assert.deepEqual(C.transbordados([1, 2], [{ id: 1 }, { id: 2 }]), []);
});

test('id repetido na resposta não vira dois cartões', () => {
  assert.deepEqual(C.transbordados([3, 3, 4], [{ id: 1 }]), [3, 4]);
});

test('listas vazias ou nulas não quebram', () => {
  assert.deepEqual(C.transbordados([], []), []);
  assert.deepEqual(C.transbordados(null, null), []);
  assert.deepEqual(C.transbordados([7], null), [7]);
});

/* ---------- como o app usa ---------- */
const raiz = path.join(__dirname, '..');
const fonteApp = fs.readFileSync(path.join(raiz, 'assets', 'app.js'), 'utf8');

/* `finish` do DevOps é data sem hora útil: a sprint vale até o fim daquele dia.
   Perguntar pela meia-noite devolveria a véspera e perderia tudo que foi mexido
   no último dia da sprint — justamente quando se move o que não fechou. */
test('a pergunta é pelo último instante do dia em que a sprint fecha', () => {
  // A constante mora no core desde que o relatório de Entregas passou a medir
  // sprint: duas telas com o mesmo fim de dia, escrito num lugar só.
  assert.equal(C.FIM_DO_DIA, 86399000);
  assert.match(fonteApp, /const FIM_DO_DIA = C\.FIM_DO_DIA;/);
  assert.match(fonteApp, /const qNoFim = C\.wiqlIteracao\(sp\.path, areas, fim \+ FIM_DO_DIA\);/);
  assert.match(fonteApp, /const qAgora = C\.wiqlIteracao\(sp\.path, areas\);/,
    'as duas pontas precisam sair do mesmo construtor');
});

test('só a coluna anterior pergunta', () => {
  assert.match(fonteApp, /transbordados: qual === 'anterior' \? await buscarTransbordo\(p, sp, areas\) : \[\]/,
    'na corrente a sprint não fechou e na próxima não começou — a pergunta não existe');
});

/* Falhar aqui não pode derrubar a coluna: sem transbordo ela volta a ser o que
   era, que é correto, só menos completo. Mas tem que avisar, senão "não houve
   transbordo" e "o ASOF não funciona nesta organização" ficam idênticos. */
test('a falha degrada a coluna em vez de quebrá-la, e avisa', () => {
  const corpo = /async function buscarTransbordo[\s\S]*?\n\}/.exec(fonteApp)[0];
  assert.match(corpo, /catch \(e\) \{/);
  assert.match(corpo, /console\.warn/, 'falha muda faria "sem transbordo" parecer resposta');
  assert.match(corpo, /return \[\];/);
});

/* O destino é casado por id. `resumoDeSprint` tira as Tasks, então as duas
   listas têm tamanhos diferentes: parear pela posição penduraria o destino
   errado em cada item — e a tela mostraria isso com cara de certo. */
test('o destino é casado por id, nunca por posição', () => {
  const corpo = /async function buscarTransbordo[\s\S]*?\n\}/.exec(fonteApp)[0];
  assert.match(corpo, /const destinoDe = new Map\(extras\.map\(/);
  assert.match(corpo, /destino: destinoDe\.get\(x\.id\)/);
  assert.ok(!/extras\[i\]/.test(corpo), 'pareamento por índice voltou');
});

/* O placar segue sendo o que a sprint ENTREGOU: o que ela entregou não muda
   por ela ter tido mais escopo. O transbordo é uma linha à parte. */
test('o transbordo não entra no placar', () => {
  assert.match(fonteApp, /progress: C\.sprintProgress\(itens\),/,
    'o placar conta os itens que estão na sprint, não os que saíram');
  assert.match(fonteApp, /const saiu = doResponsavel\(col\.transbordados \|\| \[\]\);/);
  assert.match(fonteApp, /\.concat\(saiu\);/, 'os que saíram vão no fim da lista, depois dos que ficaram');
});

/* O diagnostico.html mede o PRODUTO, não uma cópia dele. Uma segunda versão da
   consulta ali responderia por si mesma e divergiria no primeiro ajuste — e a
   página existe justamente pra decidir se o recurso está certo. */
test('a página de diagnóstico usa o construtor do app, não uma cópia', () => {
  const html = fs.readFileSync(path.join(raiz, 'diagnostico.html'), 'utf8');
  assert.match(html, /C\.wiqlIteracao\(sp\.path, comArea \? areas : \[\], comAsOf \? quando : undefined\)/,
    'a sonda tem que chamar a mesma função que o Panorama chama');
  assert.ok(!/ASOF '" \+/.test(html), 'consulta montada à mão na página: ela mediria a si mesma');
});
