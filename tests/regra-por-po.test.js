/* A REGRA "cada PO só altera o que é dela" (15/10/2026).

   O que estes testes protegem: uma PO que está testando o sistema não consegue,
   por engano ou de propósito, mudar o que as outras POs veem. A lista do que é
   dela mora em scripts/regra-por-po.js; aqui se tenta furá-la. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { permitido, foraDoQueEDela, chaveValida } = require('../scripts/regra-por-po.js');
const raiz = path.join(__dirname, '..');

test('a PO altera o que é dela', () => {
  for (const f of [
    'assets/conteudo/carla/roadmap.json',
    'assets/conteudo/carla/edicoes/2026-11.json',
    'assets/conteudo/carla/imagens/tela.png',
    'entregas-carla-status.html',
    'entregas-carla-claro.html',
    'scripts/gerar-entregas-carla.js',
    'assets/dados-outubro-carla.json',
    'assets/dados-2026-11-carla.json',
  ]) {
    assert.equal(permitido('carla', f), true, f + ' devia ser dela');
  }
});

test('o que é compartilhado não é de nenhuma PO', () => {
  for (const f of [
    'assets/report.js', 'assets/core.js', 'assets/pacote.js', 'assets/app.js',
    'assets/entregas.css', 'assets/ritmo.css', 'assets/style.css',
    'assets/briefing-entregas.js', 'assets/briefing-entregas-v2.js',
    'assets/resumos.json', 'assets/report-nomes.json', 'assets/dados-outubro.json',
    'entregas-v2.html', 'central.html', 'index.html', 'status-demandas.html',
    'api/relatorio.js', 'api/_lib/relatorio.js',
    'tests/core.test.js', 'scripts/sincronizar-pages.sh', 'package.json', 'CLAUDE.md',
    '.vercelignore', 'favicon.ico',
  ]) {
    assert.equal(permitido('carla', f), false, f + ' é compartilhado');
    assert.equal(permitido('isadora', f), false, f + ' é compartilhado');
  }
});

test('uma PO não mexe no que é de outra', () => {
  for (const f of [
    'assets/conteudo/isadora/roadmap.json',
    'assets/conteudo/urlan/edicoes/2026-10.json',
    'entregas-isadora-status.html',
    'scripts/gerar-entregas-isadora.js',
    'assets/dados-outubro-isadora.json',
  ]) {
    assert.equal(permitido('carla', f), false, 'a Carla mexeu em ' + f);
  }
  // E o nome parecido não engana: "carla" não é "carlos".
  assert.equal(permitido('carla', 'assets/conteudo/carlos/roadmap.json'), false);
  assert.equal(permitido('carla', 'entregas-carlos-x.html'), false);
});

test('não dá pra sair da pasta dela por caminho esperto', () => {
  for (const f of [
    'assets/conteudo/carla/../isadora/roadmap.json',
    'assets/conteudo/carla/../../core.js',
    '../assets/conteudo/carla/roadmap.json',
    '/assets/conteudo/carla/roadmap.json',
    'assets\\conteudo\\carla\\roadmap.json',
    'assets/conteudo/carla',            // a pasta em si, sem arquivo
    'assets/conteudo//carla/x.json',
    './assets/conteudo/carla/x.json',
    '', null, undefined, 42,
  ]) {
    assert.equal(permitido('carla', f), false, String(f));
  }
});

test('a chave da PO é validada antes de virar parte de caminho ou regex', () => {
  for (const po of ['', null, undefined, 'carla.*', 'ca rla', '../x', '__proto__', 'A', 'c', 'x'.repeat(31), 'carla/x']) {
    assert.equal(chaveValida(po), false, String(po));
    assert.equal(permitido(po, 'assets/conteudo/carla/roadmap.json'), false, String(po));
  }
});

test('o Urlan é o dono: pode tudo', () => {
  for (const f of ['assets/core.js', 'api/relatorio.js', 'assets/conteudo/carla/roadmap.json', 'CLAUDE.md']) {
    assert.equal(permitido('urlan', f), true, f);
  }
});

test('foraDoQueEDela devolve só o que passou do limite', () => {
  const fora = foraDoQueEDela('carla', [
    'assets/conteudo/carla/roadmap.json', 'assets/report.js', 'entregas-carla-status.html', 'assets/ritmo.css',
  ]);
  assert.deepEqual(fora, ['assets/report.js', 'assets/ritmo.css']);
});

/* O CLAUDE.md é como a regra chega a quem abre o projeto numa sessão do
   Claude. Se ele sumir, ou deixar de citar o conferidor, a regra vira
   costume — e costume não segura. */
test('o CLAUDE.md da raiz carrega a regra e aponta pro conferidor', () => {
  const md = fs.readFileSync(path.join(raiz, 'CLAUDE.md'), 'utf8');
  assert.match(md, /cada PO só altera o que é dela/i);
  assert.match(md, /scripts\/regra-por-po\.js/);
  assert.match(md, /assets\/conteudo\/<po>\//);
  assert.match(md, /Urlan/);
});

test('o projeto publicado não leva a regra nem o CLAUDE.md pro ar', () => {
  assert.match(fs.readFileSync(path.join(raiz, '.vercelignore'), 'utf8'), /^\/CLAUDE\.md$/m);
  assert.match(fs.readFileSync(path.join(raiz, 'scripts/sincronizar-pages.sh'), 'utf8'), /--exclude='\/CLAUDE\.md'/);
});

/* O comando de verdade, num repositório de mentira: o teste de unidade acima
   não pegou um nome de função trocado dentro do `cli`, e o conferidor é o que
   alguém vai rodar antes de publicar. Aqui ele roda do começo ao fim. */
test('o conferidor, rodando: passa o que é dela e barra o que é compartilhado', () => {
  const os = require('node:os');
  const { spawnSync, execFileSync } = require('node:child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'regra-po-'));
  try {
    const git = (...a) => execFileSync('git', a, { cwd: tmp, encoding: 'utf8' });
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 't@t.t'); git('config', 'user.name', 't');
    fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(raiz, 'scripts/regra-por-po.js'), path.join(tmp, 'scripts/regra-por-po.js'));
    fs.mkdirSync(path.join(tmp, 'assets/conteudo/carla'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'assets/core.js'), '// base\n');
    fs.writeFileSync(path.join(tmp, 'assets/conteudo/carla/roadmap.json'), '{}\n');
    git('add', '-A'); git('commit', '-q', '-m', 'base');

    const rodar = (po) => spawnSync('node', ['scripts/regra-por-po.js', po, 'HEAD'], { cwd: tmp, encoding: 'utf8' });

    // Sem mudança nenhuma.
    assert.equal(rodar('carla').status, 0);

    // Só o que é dela (arquivo novo solto + arquivo dela alterado).
    fs.writeFileSync(path.join(tmp, 'assets/conteudo/carla/roadmap.json'), '{"a":1}\n');
    fs.writeFileSync(path.join(tmp, 'entregas-carla-claro.html'), '<p>x</p>\n');
    let r = rodar('carla');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /2 arquivo\(s\), todos dela/);

    // Mexeu também num arquivo compartilhado: barra e diz qual.
    fs.appendFileSync(path.join(tmp, 'assets/core.js'), '// mexeu\n');
    r = rodar('carla');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /assets\/core\.js/);
    assert.doesNotMatch(r.stderr, /roadmap\.json|entregas-carla/, 'listou arquivo que é dela');

    // O mesmo conjunto, pra outra PO: tudo é de fora.
    assert.equal(rodar('isadora').status, 1);
    // O dono pode tudo.
    assert.equal(rodar('urlan').status, 0);
    // Chave inválida é erro de uso, não passa calada.
    assert.equal(rodar('../x').status, 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
