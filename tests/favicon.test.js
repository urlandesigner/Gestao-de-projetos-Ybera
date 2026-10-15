/* O FAVICON (15/10/2026): o Y do logo, branco sobre o preto do projeto, pra
   aparecer na aba clara e na escura. Gerado por scripts/icones.py. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.join(__dirname, '..');

test('toda página declara o favicon, e os arquivos existem', () => {
  const paginas = fs.readdirSync(raiz).filter((f) => f.endsWith('.html'));
  assert.ok(paginas.length >= 5);
  for (const p of paginas) {
    const html = fs.readFileSync(path.join(raiz, p), 'utf8');
    assert.match(html, /<link rel="icon" href="favicon\.ico" sizes="any">/, p + ' sem favicon');
    assert.match(html, /<link rel="apple-touch-icon" href="assets\/brand\/apple-touch-icon\.png">/, p + ' sem ícone de celular');
  }
  for (const f of ['favicon.ico', 'assets/brand/favicon-32.png', 'assets/brand/apple-touch-icon.png']) {
    assert.ok(fs.statSync(path.join(raiz, f)).size > 0, f + ' sumiu — rode python3 scripts/icones.py');
  }
});
