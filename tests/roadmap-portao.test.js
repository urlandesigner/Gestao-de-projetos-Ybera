/* O PORTÃO do roadmap: assets/report.js sanea o roadmap.json antes de entregá-lo
   ao briefing, e a lista branca de status desse saneamento é um lugar onde o
   dado morre em silêncio.

   Este arquivo nasceu de um defeito real: o roadmap.json ganhou status 'teste',
   o briefing-entregas aprendeu a desenhar 'teste', os testes do briefing
   passaram — e na tela o item saía sem selo, com barra neutra. O saneamento o
   zerava no meio, porque a lista branca não tinha sido atualizada.

   A causa de os testes não pegarem: todos chamavam htmlReport DIRETO, com o
   roadmap na mão, pulando o report.js. Testavam a peça, não o caminho.

   report.js é IIFE e mexe no DOM, então não dá pra `require`. O que se faz aqui
   é ler o arquivo que vai ser servido e exercitar a função extraída dele — é o
   mesmo código que o navegador roda. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const fonteReport = fs.readFileSync(path.join(raiz, 'assets/report.js'), 'utf8');
const roadmap = JSON.parse(fs.readFileSync(path.join(raiz, 'assets/roadmap.json'), 'utf8'));
const fonteBriefing = fs.readFileSync(path.join(raiz, 'assets/briefing-entregas.js'), 'utf8');

function saneador() {
  const m = /function saneRoadmapItens\(lista\) \{[\s\S]*?\n\}/.exec(fonteReport);
  assert.ok(m, 'saneRoadmapItens mudou de forma — este teste precisa acompanhar');
  // eslint-disable-next-line no-eval
  return eval('(' + m[0].replace('function saneRoadmapItens', 'function') + ')');
}

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
