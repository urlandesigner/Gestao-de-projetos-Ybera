/* A BARRA DE FERRAMENTAS em produção.

   Defeito real: o index.html linka pro Entregas com ?po=1 — é assim que o PO
   abre a página com as ferramentas. Só que produção é uma CÓPIA dos mesmos
   arquivos, servida em github.io: o mesmo link com ?po=1 chegava ao
   stakeholder, e ele via a barra ("conectado", "38 sem nome", "Copiar link",
   "v2", "Central") num documento que devia ser só de leitura.

   Por que não bastou tirar o ?po=1 do link: não existe index.html diferente em
   produção. O recorte tem de ser de execução, por hospedeiro.

   report.js é IIFE e mexe no DOM, então não dá pra `require`: lê-se o arquivo
   que vai ser servido e exercita-se o trecho extraído dele — o mesmo código que
   o navegador roda. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const fonteReport = ler('assets/report.js');

/* Monta a decisão real do report.js como função de (hospedeiro, query, body). */
function porta() {
  const m = /const LOCAL = [\s\S]*?const FERRAMENTAS = [\s\S]*?;\n/.exec(fonteReport);
  assert.ok(m, 'o cálculo de FERRAMENTAS mudou de forma — este teste precisa acompanhar');
  // eslint-disable-next-line no-eval
  return eval(`(function (hostname, search, dataset) {
    const location = { hostname, search };
    const document = { body: { dataset } };
    ${m[0]}
    return FERRAMENTAS;
  })`);
}

const ENTREGAS = { pagina: 'report', ferramentas: 'local' }; // o que entregas.html declara
const REPORT = { pagina: 'report' };                          // report.html e o v2

test('entregas: em produção a barra não aparece nem com ?po=1', () => {
  const f = porta();
  assert.equal(f('nivello-sistemas.github.io', '?po=1', ENTREGAS), false);
  assert.equal(f('gestao-de-projetos-ybera.vercel.app', '?po=1', ENTREGAS), false);
});

test('entregas: local continua com a barra quando a URL pede', () => {
  const f = porta();
  assert.equal(f('localhost', '?po=1', ENTREGAS), true);
  assert.equal(f('127.0.0.1', '?po=1', ENTREGAS), true);
  assert.equal(f('', '?po=1', ENTREGAS), true, 'arquivo aberto do disco (file://) é local');
});

test('entregas: sem ?po=1 não há barra em lugar nenhum', () => {
  const f = porta();
  assert.equal(f('localhost', '', ENTREGAS), false);
  assert.equal(f('nivello-sistemas.github.io', '', ENTREGAS), false);
});

test('entregas: em produção a porta de serviço abre a barra de propósito', () => {
  const f = porta();
  assert.equal(f('nivello-sistemas.github.io', '?po=1&ferramentas=1', ENTREGAS), true,
    'sem esta porta o PO não consegue gerar o link de leitura, que usa location.origin');
  assert.equal(f('nivello-sistemas.github.io', '?ferramentas=1', ENTREGAS), false,
    'a porta de serviço não substitui o ?po=1, soma-se a ele');
});

test('nenhum link do site carrega ferramentas=1 — a porta é só digitada à mão', () => {
  // Só os href de verdade: o comentário do entregas.html menciona a porta de
  // propósito, e documentação não é navegação.
  for (const f of fs.readdirSync(raiz).filter((x) => x.endsWith('.html'))) {
    const semComentarios = ler(f).replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(semComentarios, /href="[^"]*ferramentas=1/,
      `${f} linka com ferramentas=1: a porta de serviço vira porta da frente`);
  }
});

test('o link copiado sai sem query — é o que mantém a porta de serviço fechada', () => {
  assert.match(fonteReport, /st\.link = location\.origin \+ location\.pathname \+ carga;/,
    'se o link copiado passar a levar a query, ele leva a porta de serviço junto');
});

test('report e v2 não mudam de comportamento: o recorte é só de quem declara', () => {
  const f = porta();
  assert.equal(f('nivello-sistemas.github.io', '?po=1', REPORT), true,
    'quem não declara data-ferramentas="local" segue só com o portão do ?po=1');
  assert.equal(f('nivello-sistemas.github.io', '', REPORT), false);
});

test('entregas.html declara data-ferramentas="local" — senão o portão é letra morta', () => {
  const html = ler('entregas.html');
  assert.match(html, /<body[^>]*data-ferramentas="local"/,
    'entregas.html perdeu a declaração: a barra volta a aparecer em produção');
});

test('report.html e report-v2.html NÃO declaram — o pedido era só do Entregas', () => {
  for (const f of ['report.html', 'report-v2.html']) {
    assert.doesNotMatch(ler(f), /data-ferramentas=/, `${f} não devia ter mudado`);
  }
});
