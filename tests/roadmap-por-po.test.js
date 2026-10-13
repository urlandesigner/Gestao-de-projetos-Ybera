/* CADA PO TEM O SEU ROADMAP.

   Até 13/10/2026 o assets/roadmap.json era uma lista só, sem dono, e a
   ferramenta tinha um usuário só. Com a Isadora e a Daniele entrando, essa
   lista viraria o roadmap do Urlan aparecendo na Central delas — e esse é o
   erro mais caro desta tela, porque quem lê não tem como desconfiar: um Gantt
   bem desenhado, com datas plausíveis, dos projetos de outra pessoa.

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

const DOC = {
  por: {
    urlan: { itens: [{ titulo: 'Nova PDP', inicio: '2026-07-01', fim: '2026-08-31', status: 'concluido' }] },
    isadora: { itens: [] },
  },
};

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

test('cada uma vê o bloco dela, e ninguém vê o da outra', () => {
  assert.deepEqual(C.roadmapDaPessoa(DOC, 'Urlan Dipre').map((i) => i.titulo), ['Nova PDP']);
  assert.deepEqual(C.roadmapDaPessoa(DOC, 'Isadora Qualquer'), []);
});

/* ESTA É A DISTINÇÃO QUE IMPORTA. Fundir `null` e `[]` num valor só é a
   simplificação que faz a tela dizer "você não tem projeto nenhum" quando o
   que houve foi uma chamada de identidade que não respondeu. */
test('não saber de quem é devolve null, e não uma lista vazia', () => {
  assert.equal(C.roadmapDaPessoa(DOC, 'Daniele Araújo'), null, 'PO sem bloco no arquivo');
  assert.equal(C.roadmapDaPessoa(DOC, ''), null, 'nome ainda não chegou do DevOps');
  assert.equal(C.roadmapDaPessoa(null, 'Urlan'), null, 'arquivo não carregou');
  assert.equal(C.roadmapDaPessoa({}, 'Urlan'), null, 'arquivo sem a chave "por"');
  // E vazio continua sendo vazio: a Isadora TEM bloco, ele é que não tem item.
  assert.deepEqual(C.roadmapDaPessoa(DOC, 'Isadora'), []);
});

test('o bloco de outra pessoa não vaza por nome parecido nem por protótipo', () => {
  assert.equal(C.roadmapDaPessoa(DOC, 'Urlandir'), null, 'casou por prefixo');
  // `constructor`, `toString` e afins existem em todo objeto: sem a checagem
  // de forma, um nome desses devolveria função em vez de bloco.
  for (const nome of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
    assert.equal(C.roadmapDaPessoa(DOC, nome), null, `"${nome}" atravessou o `+ 'objeto');
  }
});

test('o arquivo de verdade está na forma nova e tem o bloco do Urlan', () => {
  const doc = JSON.parse(ler('assets/roadmap.json'));
  assert.ok(doc.por, 'o roadmap.json voltou pra lista única — a Central de outra PO mostraria este');
  assert.equal(doc.itens, undefined, 'sobrou a lista antiga no topo: duas fontes pro mesmo dado');
  assert.ok(C.roadmapDaPessoa(doc, 'Urlan Dipre').length > 0);
  assert.ok(doc._leia && doc._leia.includes('por PO'), 'o arquivo é editado à mão e precisa se explicar');
});

/* As duas telas que leem o arquivo precisam ler o RECORTE, não a lista. Voltar
   a ler `dado.itens` no carregador não quebra nada visível: devolve undefined,
   o saneador devolve [], e a seção some em silêncio.

   O alvo é o CARREGADOR DO ROADMAP, não qualquer `.itens` do arquivo — o
   report-nomes.json e o resumos.json também têm `itens` e são outra coisa. */
test('nem a Central nem o relatório leem a lista direto', () => {
  for (const arq of ['assets/app.js', 'assets/report.js']) {
    const src = ler(arq);
    const m = /async function carregarRoadmap\(\) \{[\s\S]*?\n\}/.exec(src);
    assert.ok(m, `carregarRoadmap sumiu de ${arq} — este teste precisa acompanhar`);
    assert.doesNotMatch(m[0], /\.itens\b/, `${arq} ainda recorta no carregamento`);
    assert.match(src, /roadmapDaPessoa/, `${arq} não pergunta de quem é o roadmap`);
  }
});

/* O recorte é escolhido no RENDER, não no carregamento. O arquivo chega antes
   de o DevOps dizer quem é o dono do token: resolvido cedo demais, a primeira
   abertura de quem nunca usou ficaria sem roadmap até recarregar a página — e
   ela não teria por que recarregar, porque o resto da Central já estaria
   preenchido. */
test('o nome que chega depois redesenha o roadmap', () => {
  const app = ler('assets/app.js');
  assert.match(app, /state\.cache\.usuario = await A\.currentUser\(ctx\(\)\);[\s\S]{0,600}?if \(state\.cache\.usuario\) renderRoadmap\(\);/,
    'o roadmap não é redesenhado quando o nome do dono do token chega');
  assert.match(app, /const roadmapState = \{ doc: null \};/,
    'a Central voltou a guardar o roadmap já recortado');
});

/* A REGRESSÃO DE 13/10/2026, e ela foi pro ar.

   O recorte nasceu usando `st.usuario`, o dono do token. Num documento
   EDITORIAL — aquele cujos cartões foram escritos à mão por uma pessoa — isso
   não quer dizer nada: o Urlan abriu o próprio relatório num navegador sem
   token e o roadmap tinha sumido. E o espelho do mesmo defeito é pior: a
   Isadora abrindo a edição dele com o token dela veria o roadmap DELA embaixo
   dos cartões DELE.

   A `assinatura()`, no mesmo arquivo, já tinha caído e saído dessa exata
   armadilha — o comentário dela diz "nunca o dono do token". Este teste existe
   pra que a terceira vez não aconteça. */
test('no documento editorial o roadmap é de quem assina, não de quem abre', () => {
  const src = ler('assets/report.js');
  const m = /function roadmapDaVez\(\) \{[\s\S]*?\n\}/.exec(src);
  assert.ok(m, 'roadmapDaVez sumiu — este teste precisa acompanhar');
  assert.match(m[0], /B\.documentoEditorial === true \? st\.po\b/,
    'o documento editorial voltou a perguntar quem é o dono do token');

  // E quem assina vem do arquivo editorial, que existe sem token nenhum.
  const nomes = JSON.parse(ler('assets/report-nomes.json'));
  assert.ok(nomes.po, 'o report-nomes.json perdeu o campo `po` — a capa e o roadmap ficam sem dono');
  const doc = JSON.parse(ler('assets/roadmap.json'));
  assert.ok(C.roadmapDaPessoa(doc, nomes.po).length > 0,
    `quem assina o documento ("${nomes.po}") não tem bloco no roadmap.json`);
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
