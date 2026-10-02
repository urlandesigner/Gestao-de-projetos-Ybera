/* O PORTÃO do roadmap: assets/report.js sanea o roadmap.json antes de entregá-lo
   ao briefing, e a lista branca de status desse saneamento é um lugar onde o
   dado morre em silêncio.

   Este arquivo nasceu de um defeito real: o roadmap.json ganhou status 'teste',
   o briefing-entregas aprendeu a desenhar 'teste', os testes do briefing
   passaram — e na tela o item saía sem selo, com barra neutra. O saneamento o
   zerava no meio, porque a lista branca não tinha sido atualizada.

   A causa de os testes não pegarem: todos chamavam htmlReport DIRETO, com o
   roadmap na mão, pulando o saneamento. Testavam a peça, não o caminho.

   Em 02/10/2026 o saneador mudou de casa — de report.js pra core.js — porque a
   Central passou a ler o mesmo roadmap.json. O portão agora é UM só, e este
   arquivo passou a chamá-lo direto em vez de extraí-lo por regex. O último
   teste guarda a mudança: se alguém reescrever uma cópia no report.js, o
   portão volta a ser dois e o defeito volta a caber. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const fonteReport = fs.readFileSync(path.join(raiz, 'assets/report.js'), 'utf8');
const roadmap = JSON.parse(fs.readFileSync(path.join(raiz, 'assets/roadmap.json'), 'utf8'));
/* O desenho do roadmap mudou de arquivo em 02/10/2026 (briefing-entregas.js →
   roadmap-visao.js, pra Central poder usar o mesmo). Este teste olha os dois
   juntos de propósito: o que ele guarda é que ALGUÉM saiba desenhar cada
   status que o portão deixa passar, não em que arquivo esse alguém mora. */
const fonteBriefing = fs.readFileSync(path.join(raiz, 'assets/briefing-entregas.js'), 'utf8')
  + '\n' + fs.readFileSync(path.join(raiz, 'assets/roadmap-visao.js'), 'utf8');
const C = require('../assets/core.js');

const saneador = () => C.saneRoadmapItens;

test('portão: todo status usado no roadmap.json sobrevive ao saneamento', () => {
  const sane = saneador();
  const saida = sane(roadmap.itens);
  for (const item of roadmap.itens) {
    if (!item.status) continue;
    const depois = saida.find((x) => x.titulo === item.titulo);
    assert.ok(depois, `"${item.titulo}" sumiu no saneamento`);
    assert.equal(depois.status, item.status,
      `"${item.status}" de "${item.titulo}" foi zerado pelo saneamento — falta na lista branca de report.js`);
  }
});

test('portão: o briefing sabe desenhar todo status que o portão deixa passar', () => {
  const sane = saneador();
  const passam = [...new Set(sane(roadmap.itens).map((x) => x.status).filter(Boolean))];
  assert.ok(passam.length > 0);
  for (const s of passam) {
    assert.match(fonteBriefing, new RegExp(`status === '${s}'`),
      `report.js deixa passar "${s}", mas briefing-entregas.js não o reconhece`);
  }
});

test('portão: status inventado continua virando null', () => {
  // A lista branca é uma lista branca: crescer com o uso é o esperado, virar
  // passagem livre não. Um status que ninguém escreveu não pode afirmar nada.
  const sane = saneador();
  const saida = sane([
    { titulo: 'X', inicio: '2026-01-01', fim: '2026-02-01', status: 'quase' },
    { titulo: 'Y', inicio: '2026-01-01', fim: '2026-02-01', status: 'CONCLUIDO' },
  ]);
  assert.equal(saida[0].status, null);
  assert.equal(saida[1].status, null, 'a comparação é sensível à caixa, de propósito');
});

/* O portão precisa continuar ÚNICO. Se o report.js voltar a declarar a própria
   cópia, os dois caminhos divergem de novo — e divergência aqui não quebra
   nada: o item só sai da tela sem selo, calado. */
test('portão: existe um saneador só, e o report.js usa o do core', () => {
  assert.ok(!/function saneRoadmapItens\(/.test(fonteReport),
    'report.js declarou a própria cópia do saneador: o portão virou dois');
  assert.match(fonteReport, /const saneRoadmapItens = C\.saneRoadmapItens;/,
    'report.js precisa continuar pegando o saneador do core');
});
