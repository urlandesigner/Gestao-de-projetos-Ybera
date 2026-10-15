/* CADA PO TEM O SEU ROADMAP.

   Até 13/10/2026 o assets/roadmap.json era uma lista só, sem dono, e a
   ferramenta tinha um usuário só. Com a Isadora e a Daniele entrando, essa
   lista viraria o roadmap do Urlan aparecendo na Central delas — e esse é o
   erro mais caro desta tela, porque quem lê não tem como desconfiar: um Gantt
   bem desenhado, com datas plausíveis, dos projetos de outra pessoa.

   Em 14/10/2026 o arquivo único (com um bloco por PO) deu lugar a UM ARQUIVO
   POR PESSOA, em assets/conteudo/<po>/roadmap.json. Por um dia os dois
   conviveram: a migração criou os arquivos por PO, mas o app continuou lendo o
   antigo — duas fontes do mesmo dado, iguais até a primeira edição.

   O que estes testes guardam não é o desenho, é a resposta a "de quem é isto".
   Em especial a diferença entre NÃO SABER e ESTAR VAZIO, que é onde a
   tentação de simplificar leva a tela a afirmar o que não sabe. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const C = require('../assets/core.js');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

const { roadmapCruDe, posComConteudo } = require('./conteudo');

test('a chave sobrevive a sobrenome, acento e caixa', () => {
  /* O DevOps devolve o nome de exibição completo, e ele muda sem avisar:
     sobrenome que entra ou sai, nome social, grafia diferente entre contas.
     Casar pela string inteira faria o roadmap da pessoa sumir calado no dia em
     que ela arrumasse o próprio nome. */
  for (const nome of ['Urlan', 'Urlan Dipre', 'Urlan Maciel Dipré', 'URLAN DIPRE', '  urlan  ']) {
    assert.equal(C.chaveDePessoa(nome), 'urlan', `"${nome}" deixou de casar`);
  }
  assert.equal(C.chaveDePessoa('Daniele Araújo'), 'daniele');
  assert.equal(C.chaveDePessoa(''), '');
  assert.equal(C.chaveDePessoa(null), '');
});

test('cada PO tem o arquivo dela, no endereço que os dois leitores usam', () => {
  assert.equal(C.caminhoDoConteudo('isadora', 'roadmap.json'), 'assets/conteudo/isadora/roadmap.json');
  for (const po of ['urlan', 'isadora', 'daniele', 'carla']) {
    assert.ok(roadmapCruDe(po) !== null, `${po} perdeu o roadmap.json`);
  }
  assert.ok(roadmapCruDe('urlan').length > 0, 'o roadmap do Urlan esvaziou');
  // A chave é codificada no caminho: nome com barra não escapa da pasta.
  assert.ok(!C.caminhoDoConteudo('../x', 'roadmap.json').includes('/../'),
    'uma chave com ".." sai da pasta de conteúdo');
});

test('UMA fonte só: o arquivo antigo não volta', () => {
  /* Duas fontes do mesmo dado concordam até a primeira edição. Depois, uma
     delas é a que a tela lê e a outra é a que alguém acabou de editar. */
  assert.ok(!fs.existsSync(path.join(raiz, 'assets/roadmap.json')),
    'assets/roadmap.json voltou — o roadmap tem duas fontes de novo');
  for (const arq of ['assets/app.js', 'assets/report.js']) {
    const src = ler(arq).replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    assert.doesNotMatch(src, /assets\/roadmap\.json/, `${arq} voltou a ler o arquivo antigo`);
    assert.match(src, /C\.caminhoDoConteudo\(chave, 'roadmap\.json'\)/, `${arq} não lê o roadmap da PO`);
  }
});

/* ESTA É A DISTINÇÃO QUE IMPORTA. Em voo, sem arquivo e vazio são três
   respostas — fundi-las faz a tela dizer "você não tem projeto nenhum" quando
   o que houve foi um arquivo que ainda não chegou. */
test('em voo, sem arquivo e vazio dizem coisas diferentes na Central', () => {
  const app = ler('assets/app.js');
  const r = /function renderRoadmap\(\) \{[\s\S]*?\n\}/.exec(app);
  assert.ok(r, 'renderRoadmap sumiu — este teste precisa acompanhar');
  assert.match(r[0], /itens === undefined\) \{ box\.innerHTML = '<p class="mudo">carregando o roadmap…<\/p>'/);
  assert.match(r[0], /itens === null\) \{[\s\S]*?Ainda não há roadmap para/);
  assert.match(r[0], /!itens\.length\) \{[\s\S]*?Nenhum projeto no seu roadmap/);
});

test('nome de pessoa não atravessa o protótipo do cache', () => {
  /* A chave vem de nome de pessoa. Num objeto comum, "proto" ou
     "constructor" achariam algo herdado e a tela diria que essa PO tem
     roadmap. */
  assert.match(ler('assets/app.js'), /const roadmapState = \{ porChave: Object\.create\(null\) \};/);
  assert.match(ler('assets/report.js'), /const roadmaps = Object\.create\(null\);/);
});

test('o portão de status cobre a pasta de toda PO', () => {
  // Quem entrar depois ganha pasta; o alarme do status tem que achá-la sozinho.
  assert.deepEqual(posComConteudo().sort(), ['carla', 'daniele', 'isadora', 'urlan']);
});

test('o nome que chega depois redesenha o roadmap', () => {
  const app = ler('assets/app.js');
  assert.match(app, /state\.cache\.usuario = await A\.currentUser\(ctx\(\)\);[\s\S]{0,600}?if \(state\.cache\.usuario\) renderRoadmap\(\);/,
    'o roadmap não é redesenhado quando o nome do dono do token chega');
  // O render pede o arquivo da pessoa quando ainda não pediu.
  assert.match(app, /if \(!\(chave in roadmapState\.porChave\)\) carregarRoadmap\(chave\);/,
    'a Central deixou de buscar o roadmap da PO escolhida');
  // E o recorte da Central sai do SELECT, não do dono do token.
  const r = /function renderRoadmap\(\) \{[\s\S]*?\n\}/.exec(app);
  assert.match(r[0], /const usuario = respAtivo\(\) \|\|/,
    'o roadmap da Central deixou de seguir o PO selecionado');
  /* "todos os responsáveis" é escolha válida e não tem roadmap: cai no dono da
     Central em vez de dizer que ninguém tem plano nenhum. */
  assert.match(r[0], /respAtivo\(\) \|\| \(state\.cache && state\.cache\.usuario\)/,
    'o "todos" voltou a deixar o roadmap sem dono');
});

/* A REGRESSÃO DE 13/10/2026, e ela foi pro ar.

   O recorte nasceu usando `st.usuario`, o dono do token — que não é nem quem
   escreveu o documento nem quem está selecionado. Em 14/10 passou a seguir a
   assinatura da capa, que é a mesma pessoa dos cartões. A regra completa, com
   o histórico das duas decisões, está em tests/recorte-por-po.test.js; aqui
   fica só o elo visto do lado do roadmap. */
test('o roadmap segue quem assina a capa, não o dono do token', () => {
  const src = ler('assets/report.js');
  const m = /function roadmapDaVez\(\) \{[\s\S]*?\n\}/.exec(src);
  assert.ok(m, 'roadmapDaVez sumiu — este teste precisa acompanhar');
  assert.match(m[0], /assinatura\(respAtivo\(\)\)/,
    'o roadmap deixou de seguir quem assina a capa');
  assert.doesNotMatch(m[0], /st\.usuario/,
    'o roadmap voltou a perguntar pelo dono do token');
});

/* No modo leitura não há recorte a fazer: o link carrega o roadmap que quem o
   gerou já resolveu, e o leitor não tem nome nenhum. Perguntar "de quem é" ali
   devolveria null e a seção sumiria do documento compartilhado. */
test('o link compartilhado não depende de saber quem está lendo', () => {
  const src = ler('assets/report.js');
  const m = /function roadmapDaVez\(\) \{[\s\S]*?\n\}/.exec(src);
  assert.ok(m, 'roadmapDaVez sumiu — este teste precisa acompanhar');
  assert.match(m[0], /if \(st\.leitura\) return st\.roadmap;/,
    'o modo leitura passou a depender de identidade, e o link perderia o roadmap');
});
