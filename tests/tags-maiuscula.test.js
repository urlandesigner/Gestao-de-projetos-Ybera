/* TAG NÃO COMEÇA COM MINÚSCULA — pedido do Urlan em 13/10/2026, na Central e
   nos relatórios.

   Levantamento feito MEDINDO, não lendo o CSS: cada classe de selo foi injetada
   na página que a serve e o texto foi lido depois do `text-transform` aplicado.
   Sem isso o resultado engana nos dois sentidos — `.rl-selo` e `.sprint-fase`
   têm literal minúsculo no código e chegam em caixa alta na tela, enquanto
   `.badge-tipo.selo-alerta` parecia coberto por um `uppercase` que, de fato,
   pertencia a `.frente-selo-alerta`, outra regra.

   Três chegavam minúsculas, e só três:
   - `bloqueado`/`atrasado`/`parado`, no Panorama;
   - `também atrasado · parado`, em Pendências;
   - `transbordou`, na aba Acompanhar do relatório.

   O teste de varredura, no fim, é o que pega a PRÓXIMA. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
/* Comentário fora ANTES de qualquer varredura: já aconteceu quatro vezes neste
   projeto um teste casar com a própria explicação escrita acima do código. */
const semCom = (t) => String(t).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
const fonteApp = semCom(ler('assets/app.js'));
const fonteV2 = semCom(ler('assets/briefing-entregas-v2.js'));

/* ---------- o código continua minúsculo; só o rótulo sobe ---------- */

test('o motivo tem dois nomes: código minúsculo, rótulo com maiúscula', () => {
  /* `atrasado` é CÓDIGO — o C.pendencias devolve e o app compara
     (`reg.motivo === 'atrasado'`). Trocar o código pra arrumar a tela quebraria
     a comparação em silêncio, que é o pior resultado possível aqui. */
  const pend = C.pendencias ? 'existe' : '';
  assert.equal(pend, 'existe', 'o C.pendencias sumiu — o motivo perdeu a origem');
  assert.match(fonteApp, /const ROTULO_MOTIVO = \{ bloqueado: 'Bloqueado', atrasado: 'Atrasado', parado: 'Parado' \};/);
  assert.match(ler('assets/core.js'), /motivo: 'bloqueado'/,
    'o código do motivo subiu de caixa e as comparações do app deixam de casar');
  assert.match(fonteApp, /reg\.motivo === 'atrasado'/,
    'a comparação passou a usar o rótulo em vez do código');
});

test('os dois lugares que desenham o motivo passam pelo rótulo', () => {
  assert.match(fonteApp, /<span class="badge-tipo selo-alerta">\$\{rotuloMotivo\(motivo\)\}<\/span>/);
  assert.match(fonteApp, /<span class="badge-tipo">Também \$\{reg\.tambem\.map\(rotuloMotivo\)\.join\(' · '\)\}<\/span>/);
});

test('o selo de transbordo do relatório começa com maiúscula', () => {
  // Ele virou `.rt-item-estado` quando o selo de tipo saiu da linha, e aquela
  // classe não sobe por CSS — então a maiúscula tem de estar no texto.
  assert.match(fonteV2, /\? 'Transbordou'/);
  assert.doesNotMatch(ler('assets/ritmo.css'), /\.rt-item-estado[^{]*\{[^}]*text-transform/,
    'se um dia a classe subir por CSS, o literal com maiúscula vira redundante — reveja os dois');
});

/* ---------- a varredura: quem pega a próxima ---------- */

/* Procura, no HTML que os módulos montam, TODA tag cujo texto é literal e
   começa com minúscula. Texto dinâmico (`${...}`) não entra: ele vem do DevOps
   (já capitalizado) ou de uma tabela de rótulo, e julgar isso daqui daria falso
   positivo. O que esta varredura guarda é o literal escrito à mão. */
function tagsComLiteralMinusculo(fonte) {
  const fora = [];
  const re = /class="([^"]*(?:badge|selo|fase|estado|pill|rotulo|rot)[^"]*)"[^>]*>([^<$`]{1,40})/g;
  let m;
  while ((m = re.exec(fonte)) !== null) {
    const texto = m[2].trim();
    const p = texto.replace(/^[^\p{L}]+/u, '').charAt(0);
    if (!p) continue;
    if (p === p.toLowerCase() && p !== p.toUpperCase()) fora.push(m[1] + ' -> ' + texto);
  }
  return fora;
}

test('nenhuma tag da Central tem literal começando com minúscula', () => {
  assert.deepEqual(tagsComLiteralMinusculo(fonteApp), []);
});

test('nenhuma tag do relatório de outubro tem literal começando com minúscula', () => {
  assert.deepEqual(tagsComLiteralMinusculo(fonteV2), []);
});

/* Os dois relatórios publicados escrevem `concluída`, `em andamento` e
   `em teste` em minúscula no código — e chegam em CAIXA ALTA na tela, porque
   `.rl-selo`, `.frente-selo`, `.roadmap-feito` e `.rl-rm-feito` sobem por CSS.
   Este teste trava esse `uppercase`: sem ele, aqueles documentos — já
   publicados, e que não se reescrevem — passariam a mostrar tag minúscula. */
test('o uppercase que cobre os relatórios publicados não pode sair do CSS', () => {
  const regra = (folha, sel) => {
    const css = ler(folha).replace(/\/\*[\s\S]*?\*\//g, '');
    const i = new RegExp('(^|[\\n,])\\s*' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]')
      .exec(css);
    assert.ok(i, 'a regra ' + sel + ' sumiu de ' + folha);
    const fim = css.indexOf('}', i.index);
    const ini = css.lastIndexOf('}', i.index) + 1;
    assert.match(css.slice(ini, fim), /text-transform: uppercase/,
      sel + ' em ' + folha + ' deixou de subir, e o literal lá é minúsculo');
  };
  regra('assets/entregas.css', '.rl-selo');      // entregas.html e entregas-v2.html
  regra('assets/report-v2.css', '.rl-selo');     // report-v2.html
  regra('assets/style.css', '.frente-selo');     // report.html
  regra('assets/style.css', '.roadmap-feito');   // report.html
  regra('assets/report-v2.css', '.rl-rm-feito'); // report-v2.html
  // E o roadmap compartilhado, que serve a Central e as duas edições de Entregas.
  for (const sel of ['.rl-rm-feito', '.rl-rm-andamento', '.rl-rm-teste']) regra('assets/roadmap.css', sel);
});
