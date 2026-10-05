/* CONTRASTE do texto mudo da Central.

   Defeito real, medido no navegador em 02/10/2026: os rótulos do menu lateral
   e os contadores ("35", "2") usam `--mudo` sobre `--superficie-2`, e esse par
   dava 4,32:1 — abaixo do mínimo WCAG AA de 4,5:1 pra texto normal. Os rótulos
   têm 14,7px e o contador 12,8px, então nenhum dos dois entra na regra mais
   frouxa de texto grande (18,66px em negrito).

   Por que isto é teste e não "ajustei a cor": contraste some de vista. Ninguém
   abre a tela e percebe 4,32 — percebe-se "está meio claro", encolhe-se os
   ombros e segue. O par vive em dois tokens que qualquer um pode mexer por um
   motivo legítimo (clarear a superfície, suavizar o texto) sem suspeitar que
   está reprovando a página. O teste calcula a razão de verdade, pela fórmula
   da WCAG, a partir dos valores que a folha declara. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'style.css'), 'utf8');

function token(nome) {
  const m = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  assert.ok(m, `o token --${nome} sumiu ou deixou de ser hex de 6 dígitos`);
  return m[1];
}

/* WCAG 2.1, relative luminance + contrast ratio. */
const canal = (n) => { const v = n / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => {
  const [r, g, b] = hex.slice(1).match(/../g).map((h) => canal(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/* A superfície mais ESCURA em que o texto mudo pousa é a que manda: passar no
   branco e reprovar no painel cinza seria passar no caso fácil. */
const FUNDOS = ['superficie-2', 'fundo-pagina', 'superficie'];

test('texto mudo passa no AA sobre toda superfície da Central', () => {
  const mudo = token('mudo');
  for (const nome of FUNDOS) {
    const r = razao(mudo, token(nome));
    assert.ok(r >= 4.5,
      `--mudo (${mudo}) sobre --${nome} dá ${r.toFixed(2)}:1, abaixo de 4,5:1`);
  }
});

/* A tinta é o texto principal: se ELA cair, a página inteira cai junto. */
test('a tinta passa com folga sobre toda superfície', () => {
  const tinta = token('tinta');
  for (const nome of FUNDOS) {
    const r = razao(tinta, token(nome));
    assert.ok(r >= 7, `--tinta sobre --${nome} dá ${r.toFixed(2)}:1 — era pra ser nível AAA`);
  }
});

/* O vermelho de erro aparece em "sem token" e nos números de alerta, sempre em
   texto pequeno. Mesmo mínimo, mesma razão de existir. */
test('o vermelho de erro passa no AA sobre a página e sobre o branco', () => {
  for (const nome of ['fundo-pagina', 'superficie']) {
    const r = razao(token('erro'), token(nome));
    assert.ok(r >= 4.5, `--erro sobre --${nome} dá ${r.toFixed(2)}:1`);
  }
});
