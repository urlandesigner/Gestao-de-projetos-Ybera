/* O CONTEÚDO SAIU DO CÓDIGO (Etapa A, 13/10/2026).

   Até aqui os cartões do relatório eram 145 linhas de texto escritas dentro do
   briefing-entregas.js, e cada edição nova era código novo — novembro seria
   outro módulo, e com três POs seriam três por mês. Agora são dado: um arquivo
   por PO em assets/conteudo/<po>/edicoes/<edicao>.json.

   O que estes testes guardam são as três formas de a migração dar errado sem
   dar erro: o arquivo perder um campo que o desenho usa, o saneamento comer um
   texto que existia, e o módulo guardar uma lista de reserva que faz tudo
   parecer funcionar enquanto o arquivo está sendo ignorado. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const C = require('../assets/core.js');
const BE = require('../assets/briefing-entregas.js');
const V2 = require('../assets/briefing-entregas-v2.js');
const { cartoesDe } = require('./conteudo');

const POS = ['urlan', 'isadora', 'daniele', 'carla'];

test('cada PO tem pasta, e o arquivo dela é JSON válido', () => {
  for (const po of POS) {
    const rm = path.join(raiz, 'assets/conteudo', po, 'roadmap.json');
    assert.ok(fs.existsSync(rm), `${po} não tem roadmap.json`);
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(rm, 'utf8')), `${po}: roadmap.json inválido`);
  }
});

test('as duas edições publicadas continuam tendo os cartões que tinham', () => {
  /* Números e títulos conferidos contra o que estava no ar em 13/10/2026,
     antes da migração. Não é teste de conteúdo: é o alarme de um arquivo
     truncado ou sobrescrito por engano. */
  const agoSet = cartoesDe('urlan', BE.edicao);
  assert.equal(agoSet.length, 8);
  assert.ok(agoSet.some((c) => c.titulo === 'Novos componentes visuais para HOME'));
  /* Outubro é edição aberta: cartão novo entra durante o mês. O alarme aqui é
     piso, não igualdade — some um cartão e o teste cai; chega um, não. */
  const outubro = cartoesDe('urlan', V2.edicao);
  assert.ok(outubro.length >= 2, 'outubro perdeu cartão: ' + outubro.length);
  // Pela seção, e não pelo título: o título é editorial e o PO reescreve.
  assert.ok(outubro.some((c) => c.iniciativa === 'Novo app de brindes'));
  assert.ok(outubro.some((c) => c.titulo === 'Tratativas do Google compliance'));
});

/* O DEFEITO QUE QUASE PASSOU. O briefing aceita as duas formas de `resumo` e há
   cartão escrito de cada jeito. O saneamento tratava só a lista, e o texto de
   todo cartão de parágrafo único sumia — o cartão continuava na tela, com o
   título e sem o texto. Não quebra, não loga, e só se vê lendo o documento. */
test('resumo em string e resumo em lista chegam os dois', () => {
  const [a] = C.saneCartoes([{ titulo: 'X', resumo: 'uma frase só' }]);
  assert.deepEqual(a.resumo, ['uma frase só']);
  const [b] = C.saneCartoes([{ titulo: 'Y', resumo: ['um', 'dois'] }]);
  assert.deepEqual(b.resumo, ['um', 'dois']);
  // E a observação, que tem desenho próprio, não vira parágrafo comum.
  const [c] = C.saneCartoes([{ titulo: 'Z', resumo: [{ nota: 'observação' }] }]);
  assert.deepEqual(c.resumo, [{ nota: 'observação' }]);
});

test('o portão: arquivo editável não vira execução nem classe de CSS', () => {
  const [c] = C.saneCartoes([{
    titulo: 'Forjado',
    status: 'rl-tile-escuro', // palavra inventada tentando virar classe
    epicoId: -5,
    progresso: { feito: 3, total: 0 }, // divisão por zero na barra
    link: { href: 'javascript:alert(1)', rotulo: 'clique' },
    imagens: [{ arquivo: '../../../etc/passwd' }, { arquivo: '/absoluto.jpg' }],
  }]);
  assert.equal(c.status, undefined, 'status fora do vocabulário virou valor');
  assert.equal(c.epicoId, undefined, 'id negativo passou');
  assert.equal(c.progresso, undefined, 'total zero passou e a barra divide por ele');
  assert.equal(c.link, undefined, 'javascript: no href passou');
  assert.equal(c.imagens, undefined, 'caminho que sobe de pasta passou');
  // Cartão sem título some inteiro: título é a única coisa que todo cartão tem.
  assert.deepEqual(C.saneCartoes([{ resumo: ['texto órfão'] }]), []);
});

test('os módulos não guardam lista de reserva', () => {
  /* Uma lista embutida faria tudo parecer funcionar enquanto o arquivo estava
     sendo ignorado — e o erro só apareceria quando uma PO editasse o dela e
     nada mudasse na tela. */
  for (const arq of ['assets/briefing-entregas.js', 'assets/briefing-entregas-v2.js']) {
    const src = ler(arq).replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    assert.doesNotMatch(src, /ENTREGAS_POR_PO|ENTREGAS_OUTUBRO|ENTREGAS_RECENTES/,
      `${arq} voltou a guardar cartões`);
    assert.doesNotMatch(src, /iniciativa: '/, `${arq} voltou a ter cartão escrito dentro`);
  }
  const vazio = BE.htmlReport({ items: [], todos: [], agora: Date.now(), chavePO: 'urlan', escopo: 'Urlan Dipre' }).html;
  assert.ok(!vazio.includes('Novos componentes visuais'), 'sem receber cartões, o módulo desenhou algum');
});

test('o report lê o arquivo da PO, pela mesma pessoa que assina a capa', () => {
  const src = ler('assets/report.js');
  assert.match(src, /C\.caminhoDoConteudo\(chave, 'edicoes\/'/,
    'o caminho do conteúdo mudou — o editor e o app têm que concordar nele');
  const m = /function cartoesDaVez\(\) \{[\s\S]*?\n\}/.exec(src);
  assert.ok(m, 'cartoesDaVez sumiu — este teste precisa acompanhar');
  assert.match(m[0], /assinatura\(respAtivo\(\)\)/,
    'os cartões deixaram de seguir quem assina a capa');
  // E cada documento diz QUAL edição ele é.
  assert.match(BE.edicao, /^\d{4}-\d{2}$/);
  assert.match(V2.edicao, /^\d{4}-\d{2}$/);
  assert.notEqual(BE.edicao, V2.edicao);
});
