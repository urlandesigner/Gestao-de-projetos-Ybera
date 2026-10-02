/* A SETA DE VOLTAR dos cabeçalhos da Central.

   Defeito real, visto pelo Urlan num print: a seta do épico saía quadrada,
   com borda fina e fora do eixo — desenho padrão do navegador. A causa não
   estava no botão e sim na folha: a regra era de ID (#board-voltar) e dois
   botões iguais, na mesma marcação (.board-topo), dividiam o papel. O do
   board acertava por nome; o do épico não existia pra folha.

   O que este teste guarda não é a aparência (isso se vê olhando) e sim que a
   regra continue valendo pros DOIS — e pro terceiro, quando houver. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

test('toda seta de voltar declara a classe que a folha estiliza', () => {
  const html = ler('central.html');
  const botoes = html.match(/<button[^>]*id="[a-z-]*voltar"[^>]*>/g) || [];
  assert.ok(botoes.length >= 2, 'eram dois cabeçalhos com seta; se virou um, revisar este teste');
  for (const b of botoes) {
    assert.match(b, /class="[^"]*\bvoltar\b/, `${b} fica sem estilo: a folha casa por classe`);
  }
});

test('a folha estiliza a seta por classe, não por id', () => {
  const css = ler('assets/style.css');
  assert.match(css, /\.board-topo \.voltar \{[^}]*border-radius:\s*999px/,
    'a regra precisa alcançar qualquer seta dentro de .board-topo');
  assert.ok(!/#board-voltar\s*\{/.test(css) && !/#epico-voltar\s*\{/.test(css),
    'regra por id volta a deixar a seta irmã sem desenho — foi o defeito');
});
