/* ENTREGAS: o que estes testes guardam é o RECORTE do documento.

   O arquivo nasceu clone do briefing-v2, e a única coisa que o diferencia é o
   que entra e o que sai: seis seções removidas, a navegação inteira (menu e
   seletor de mês) fora, e os cartões vindo de uma lista curada em vez do
   DevOps. Nada disso quebra a tela se der errado — o documento renderiza
   bonito com uma seção que devia ter sumido, ou com um cartão a menos. Por
   isso vale teste, e não olhar.

   O contrato com report.js também é guardado aqui: este documento tira do
   HTML ganchos que o controlador procura, e ele precisa continuar de pé.

   A forma (cor, régua, tipografia) não se testa aqui — se testa olhando. */
const test = require('node:test');
const assert = require('node:assert/strict');
const BE = require('../assets/briefing-entregas.js');

const AGORA = Date.parse('2026-09-22T12:00:00Z');
const dia = 86400000;
const iso = (t) => new Date(t).toISOString();

const epico = (id, titulo, alvoDias) => ({
  id, fields: {
    'System.WorkItemType': 'Epic', 'System.State': 'In Progress', 'System.Title': titulo,
    'Microsoft.VSTS.Scheduling.TargetDate': alvoDias == null ? undefined : iso(AGORA + alvoDias * dia),
  },
});
const filho = (id, tipo, estado, titulo, pai, o = {}) => ({
  id, fields: {
    'System.WorkItemType': tipo, 'System.State': estado, 'System.Title': titulo, 'System.Parent': pai,
    'Microsoft.VSTS.Common.ClosedDate': o.fechadoDias == null ? undefined : iso(AGORA - o.fechadoDias * dia),
    'System.ChangedDate': iso(AGORA - (o.alteradoDias == null ? 1 : o.alteradoDias) * dia),
    'Microsoft.VSTS.Scheduling.TargetDate': o.alvoDias == null ? undefined : iso(AGORA + o.alvoDias * dia),
  },
});

// Um mês com tudo ligado: entrega, execução, trava e prazo. No v2 isso acendia
// todas as seções — é justamente por isso que serve aqui, pra provar que as
// quatro removidas não voltam nem quando existe dado pra elas.
function documento(extra) {
  const items = [
    epico(1, 'Checkout unificado', 30),
    filho(10, 'Feature', 'Done', 'Gateway PIX', 1, { fechadoDias: 5 }),
    filho(11, 'Product Backlog Item', 'Done', 'Tela de confirmação', 1, { fechadoDias: 2 }),
    filho(12, 'Product Backlog Item', 'In Progress', 'QR code expirado', 1),
    filho(13, 'Product Backlog Item', 'Blocked', 'Copy de recusa', 1, { alvoDias: -9, alteradoDias: 28 }),
    filho(14, 'Product Backlog Item', 'New', 'Regressão', 1, { alvoDias: 8 }),
  ];
  return BE.htmlReport(Object.assign(
    { items, todos: items, agora: AGORA, escopo: 'Urlan Dipre', unidade: 'Ybera US' }, extra || {}));
}

const TOPICOS = [
  'Novos componentes visuais para HOME',
  'Novo cart drawer',
  'Novos componentes visuais para PDP',
  'Testes Shipsmart',
  'Tratativas do Google compliance',
  'Migração de ERP — ajustes gerais',
  'Tradução do site',
  'App Review — ajustes',
];

test('Entregas devolve a mesma forma de retorno do v1/v2', () => {
  const r = documento();
  assert.equal(typeof r.html, 'string');
  assert.equal(r.vazio, false);
  assert.ok(Array.isArray(r.meses));
});

test('Entregas não tem as seções removidas, mesmo havendo dado pra elas', () => {
  const h = documento().html;
  for (const id of ['resumo', 'comparativo', 'entregas', 'decisao', 'proximos', 'agora']) {
    assert.ok(!h.includes(`id="${id}"`), `seção #${id} devia ter saído daqui`);
  }
  // A prova de que o dado existe: o MESMO mês, desenhado pelo v2, acende as
  // seções. Sem esta metade o teste passaria até com um mês vazio.
  const v2 = require('../assets/briefing-v2.js');
  const items = [
    epico(1, 'Checkout unificado', 30),
    filho(10, 'Feature', 'Done', 'Gateway PIX', 1, { fechadoDias: 5 }),
    filho(12, 'Product Backlog Item', 'In Progress', 'QR code expirado', 1),
    filho(13, 'Product Backlog Item', 'Blocked', 'Copy de recusa', 1, { alvoDias: -9, alteradoDias: 28 }),
  ];
  const hv2 = v2.htmlReport({
    items, todos: items, agora: AGORA, meses: null,
    mesesDoAno: null, escopo: 'Urlan Dipre', unidade: 'Ybera US',
  }).html;
  for (const id of ['resumo', 'entregas', 'decisao', 'proximos']) {
    assert.ok(hv2.includes(`id="${id}"`), `v2 devia acender #${id} com este mesmo dado`);
  }
});

test('Entregas fica com Entregas recentes e Roadmap, nesta ordem', () => {
  const roadmap = [{ titulo: 'Plano', inicio: '2026-10-01', fim: '2026-12-31' }];
  const h = documento({ roadmap, agrupar: 'plano' }).html;
  const ids = [...h.matchAll(/<section class="rl-sec" id="([\w-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['recentes', 'roadmap']);
});

test('Entregas troca "Por frente" por "Entregas recentes"', () => {
  const h = documento({ agrupar: 'plano' }).html;
  assert.ok(h.includes('id="recentes"'));
  assert.ok(h.includes('Entregas recentes'));
  assert.ok(!h.includes('Por frente'), 'o título antigo não pode sobrar');
});

test('Entregas monta um cartão por tópico da lista curada, na ordem ditada', () => {
  // A ordem ditada só sobrevive inteira na lista corrida. Agrupado por épico
  // ela cede lugar ao agrupamento — é o preço daquele desenho, não um bug.
  const h = documento({ agrupar: 'plano' }).html;
  const nomes = [...h.matchAll(/<h3 class="rl-frente-nome">([^<]+)<\/h3>/g)].map((m) => m[1]);
  assert.deepEqual(nomes, TOPICOS);
});

test('Entregas dá um descritivo a cada cartão, e quebra em parágrafos quando há mais de um', () => {
  const h = documento().html;
  const cartoes = [...h.matchAll(/<article class="rl-frente">[\s\S]*?<\/article>/g)].map((m) => m[0]);
  assert.equal(cartoes.length, TOPICOS.length);
  for (const [i, c] of cartoes.entries()) {
    assert.ok(c.includes('rl-frente-resumo'), `"${TOPICOS[i]}" ficou sem descritivo`);
  }
  // Descritivo em lista vira um <p> por ideia. De propósito não fixo QUANTOS
  // cartões usam isso: o Urlan reescreve texto com frequência, e um número
  // cravado aqui falha a cada edição de conteúdo sem nada estar quebrado. O que
  // precisa continuar valendo é que a quebra funcione e ninguém fique sem texto.
  assert.ok(cartoes.some((c) => (c.match(/rl-frente-resumo/g) || []).length > 1),
    'algum cartão precisa exercitar a quebra em parágrafos');
});

test('Entregas diz a que épico cada frente pertence — sem cartão órfão', () => {
  const h = documento({ agrupar: 'plano' }).html;
  const cartoes = [...h.matchAll(/<article class="rl-frente">[\s\S]*?<\/article>/g)].map((m) => m[0]);
  for (const [i, c] of cartoes.entries()) {
    assert.match(c, /<p class="rl-frente-produto">/, `"${TOPICOS[i]}" ficou sem épico`);
  }
  // A retranca vem antes do título: é endereço, e endereço se lê primeiro.
  for (const c of cartoes) {
    assert.ok(c.indexOf('rl-frente-produto') < c.indexOf('rl-frente-nome'));
  }
  // Os quatro épicos que o Urlan confirmou, e nada além deles.
  const epicos = new Set([...h.matchAll(/<p class="rl-frente-produto">([^<]+)</g)].map((m) => m[1]));
  assert.deepEqual([...epicos].sort(), [
    'ERP — Ordoro | Salesforce Rootstock',
    'Loja Clube USA',
    'Shipsmart',
    'Ybera Reviews / API de Reviews',
  ]);
});

// Antes só um cartão tinha selo, e o teste guardava esse "só um". Agora TODOS
// têm, e o que se guarda é o contrário: nenhum cartão pode ficar sem: a
// ausência de selo voltaria a ser ambígua — concluído, ou ninguém disse?
test('Entregas põe selo em todo cartão, sem exceção', () => {
  const h = documento().html;
  const cartoes = [...h.matchAll(/<article class="rl-frente">[\s\S]*?<\/article>/g)].map((m) => m[0]);
  assert.ok(cartoes.length >= 8);
  for (const c of cartoes) {
    const nome = (/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(c) || [])[1];
    assert.match(c, /<span class="rl-selo /, `sem selo: ${nome}`);
  }
  assert.ok(h.includes('Tratativas do Google compliance</h3>'), 'o status não pode virar parte do título');
});

test('Entregas: cada estado tem a sua classe, sem troca entre eles', () => {
  // A escada é em andamento → em teste → entregue, e cada degrau tem cor
  // própria. Trocar duas classes de lugar não quebraria nada visível num teste
  // que só contasse pílulas — por isso aqui se guarda o par texto↔classe.
  const esperado = {
    'em andamento': 'rl-selo-andamento',
    'em teste': 'rl-selo-teste',
    'entregue': 'rl-selo-ok',
  };
  const h = documento().html;
  const selos = [...h.matchAll(/<span class="rl-selo ([^"]+)">([^<]+)</g)].map((m) => ({ classe: m[1], texto: m[2] }));
  assert.ok(selos.length >= 8);
  for (const s of selos) assert.equal(s.classe, esperado[s.texto], `classe errada em "${s.texto}"`);
  assert.ok(selos.some((s) => s.texto === 'entregue'), 'alguém entregou');
  assert.ok(!h.includes('rl-selo-risco'), 'não há estado de risco neste documento');
});

test('roadmap: "em teste" ganha selo e barra próprios', () => {
  const roadmap = [
    { titulo: 'Feito', inicio: '2026-07-01', fim: '2026-08-31', status: 'concluido' },
    { titulo: 'Testando', inicio: '2026-08-01', fim: '2026-09-30', status: 'teste' },
    { titulo: 'Rodando', inicio: '2026-09-01', fim: '2026-09-30', status: 'andamento' },
    { titulo: 'Previsto', inicio: '2026-10-01', fim: '2026-12-31' },
  ];
  const h = documento({ roadmap }).html;
  assert.match(h, /<span class="rl-rm-teste">em teste<\/span>/);
  assert.equal((h.match(/rl-rm-barra-teste/g) || []).length, 1);
  // "em andamento" continua sem selo: a barra escura já diz, e repetir em cinco
  // linhas seria ruído. É a decisão que faz o selo dos outros dois valer algo.
  const linhaRodando = /Rodando[\s\S]*?<\/div>/.exec(h)[0];
  assert.ok(!/rl-rm-feito|rl-rm-teste/.test(linhaRodando), 'em andamento fala pela barra');
  assert.equal((h.match(/rl-rm-barra"/g) || []).length, 1, 'só o previsto fica na barra neutra');
});

test('roadmap e cartão não chamam o mesmo estado por dois nomes', () => {
  // A tag do roadmap existe justamente pra fechar divergência entre os dois
  // lugares. Se um disser "em teste" e o outro "em testes", o documento fica
  // dizendo que são coisas diferentes.
  const roadmap = [{ titulo: 'X', inicio: '2026-08-01', fim: '2026-09-30', status: 'teste' }];
  const h = documento({ roadmap }).html;
  const noCartao = [...h.matchAll(/<span class="rl-selo [^"]+">([^<]+)</g)].map((m) => m[1]);
  const noRoadmap = [...h.matchAll(/<span class="rl-rm-(?:teste|feito)">([^<]+)</g)].map((m) => m[1]);
  for (const t of noRoadmap) {
    if (t === 'concluído') continue; // só existe no roadmap
    assert.ok(noCartao.includes(t), `"${t}" no roadmap não existe como selo de cartão`);
  }
});

test('Entregas ignora status fora do vocabulário em vez de inventar selo', () => {
  // A regra que existe desde o primeiro selo: palavra desconhecida não vira
  // pílula afirmando um estado que ninguém escreveu.
  const h = documento().html;
  const textos = [...h.matchAll(/<span class="rl-selo [^"]+">([^<]+)</g)].map((m) => m[1]);
  const conhecidos = new Set(['entregue', 'em teste', 'em andamento']);
  for (const t of textos) assert.ok(conhecidos.has(t), `selo fora do vocabulário: ${t}`);
});

test('Entregas: o selo não repete o que o parágrafo já diz', () => {
  const h = documento().html;
  const traducao = [...h.matchAll(/<article class="rl-frente">[\s\S]*?<\/article>/g)]
    .map((m) => m[0]).find((c) => /Tradução do site/.test(c));
  assert.ok(!/em validação/i.test(traducao), 'o estado mora no selo, não na frase');
});

test('Entregas não emite os ganchos de busca de Entregas — report.js aguenta a ausência', () => {
  const h = documento().html;
  for (const gancho of ['busca-entregas', 'lista-entregas', 'limpar-entregas', 'conta-entregas', 'chip-doc']) {
    assert.ok(!h.includes(gancho), `${gancho} saiu junto com a seção`);
  }
});

test('Entregas escapa o que vier torto na lista curada e no DevOps', () => {
  const e = epico(1, '<img src=x onerror=alert(1)>', 10);
  const items = [e, filho(10, 'Feature', 'Done', 'ok', 1, { fechadoDias: 3 })];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA }).html;
  assert.ok(!h.includes('<img src=x'));
});

test('Entregas: mês fechado não ressuscita seção nenhuma', () => {
  const r = documento({ mes: '2026-07' });
  for (const id of ['agora', 'proximos', 'decisao', 'resumo']) {
    assert.ok(!r.html.includes(`id="${id}"`), `#${id} não pode voltar em mês fechado`);
  }
  assert.ok(r.html.includes('id="ini-'), 'as entregas curadas não dependem do mês');
});

test('Entregas não desenha navegação nenhuma, mas continua devolvendo os meses', () => {
  const r = documento();
  // A barra inteira saiu: menu, âncoras e seletor de mês.
  assert.ok(!r.html.includes('doc-nav'), 'report.js mede a nav — precisa não achar nada');
  assert.ok(!r.html.includes('rl-nav'));
  assert.ok(!r.html.includes('mes-global'));
  assert.ok(!r.html.includes('<a href="#'), 'sem âncora de seção sobrando');
  // `meses` alimenta a Central e o link de leitura: some da tela, não do retorno.
  assert.ok(Array.isArray(r.meses) && r.meses.length > 0);
});

test('Entregas: mês sem nada registrado devolve vazio, sem quebrar', () => {
  const r = BE.htmlReport({ items: [], todos: [], agora: AGORA });
  assert.equal(r.vazio, true);
  assert.ok(r.html.includes('Nada registrado'));
});

/* ---- Os dois desenhos em teste ----
   Mesmo conteúdo, duas organizações. O que precisa ficar guardado é que
   nenhuma das duas perde card, e que a retranca aparece só onde ela informa
   algo: na lista corrida, onde nada mais diz de que frente o card é. */

test('Entregas agrupado por épico: uma seção por épico, na ordem ditada', () => {
  const h = documento({ agrupar: 'epico' }).html;
  const titulos = [...h.matchAll(/<section class="rl-sec" id="epico-[\w-]+"[\s\S]*?<h2 class="rl-sec-titulo">([^<]+)</g)]
    .map((m) => m[1]);
  assert.deepEqual(titulos, [
    'Loja Clube USA',
    'Shipsmart',
    'ERP — Ordoro | Salesforce Rootstock',
    'Ybera Reviews / API de Reviews',
  ]);
  // A seção única da lista corrida não pode sobrar junto.
  assert.ok(!h.includes('id="recentes"'));
});

// A contagem saiu a pedido do Urlan: ela não dizia nada que a seção não
// mostrasse. O que se guarda agora é que ela não volte — e que a ausência de
// intro não deixe um <p> vazio ocupando espaço embaixo do título.
test('Entregas agrupado: a seção não repete a contagem dos cartões', () => {
  const roadmap = [{ titulo: 'Plano', inicio: '2026-10-01', fim: '2026-12-31' }];
  for (const modo of ['epico', 'iniciativa']) {
    const h = documento({ roadmap, agrupar: modo }).html;
    assert.ok(!/\d+ entregas? recentes?\./.test(h), `contagem de volta em ${modo}`);
    assert.ok(!/<p class="rl-sec-intro">\s*<\/p>/.test(h), `intro vazia em ${modo}`);
    // O roadmap mantém a dele: lá o texto explica o recorte, não conta o óbvio.
    assert.ok(h.includes('Todos os projetos previstos para os próximos meses.'),
      `o roadmap perdeu a intro em ${modo}`);
  }
});

test('Entregas agrupado esconde a retranca — o título da seção já diz a frente', () => {
  const h = documento({ agrupar: 'epico' }).html;
  assert.ok(!h.includes('rl-frente-produto'), 'repetir o épico em cada card seria ruído');
});

test('os dois desenhos mostram exatamente os mesmos cartões', () => {
  const nomes = (modo) => [...documento({ agrupar: modo }).html
    .matchAll(/<h3 class="rl-frente-nome">([^<]+)<\/h3>/g)].map((m) => m[1]).sort();
  assert.deepEqual(nomes('epico'), nomes('plano'));
  assert.equal(nomes('epico').length, TOPICOS.length);
});

test('Entregas cai no agrupamento por iniciativa do roadmap por padrão', () => {
  // Sem `agrupar` e sem `location` (Node), vale o padrão.
  const h = documento().html;
  assert.ok(h.includes('id="ini-'));
  assert.ok(!h.includes('id="epico-'));
  assert.ok(!h.includes('id="recentes"'));
});

/* ---- Métricas da capa ----
   A capa precisa bater com o corpo. Antes ela vinha do DevOps e contradizia a
   lista curada logo abaixo: dizia "1 produto" numa página com 8 cartões em 4
   frentes. Estes testes existem pra essa contradição não voltar sem avisar. */

// Um mês com os três níveis fechados, e um mês antes dele. O item de agosto não
// serve mais de base de comparação — a variação saiu da capa — e sim de metade
// do período nos testes que somam dois meses.
function mesComNiveis(extra) {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Epic', 'System.State': 'Done', 'System.Title': 'Frente', 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 2 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 10, fields: { 'System.WorkItemType': 'Feature', 'System.State': 'Done', 'System.Title': 'Bloco', 'System.Parent': 1, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 3 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 11, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'P1', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 4 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 12, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'P2', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 5 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 13, fields: { 'System.WorkItemType': 'Bug', 'System.State': 'Done', 'System.Title': 'B1', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 6 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 20, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'Mês passado', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 35 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
  ];
  return BE.htmlReport(Object.assign({ items, todos: items, agora: AGORA }, extra || {})).html;
}
// As mesmas opções, cruas, pra quem precisa variar o modo de agrupamento.
function mesNiveisOpcoes() {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Epic', 'System.State': 'Done', 'System.Title': 'Frente', 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 2 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 11, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'P1', 'System.Parent': 1, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 4 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
  ];
  return { items, todos: items, agora: AGORA };
}
const capaDe = (h) => h.slice(0, h.indexOf('rl-corpo'));

test('capa: o bloco escuro conta PBI fechado no mês, não épico nem Feature', () => {
  // Recorte de um mês só: aqui se mede a régua (o que conta como entrega), e
  // não a soma do período — que tem teste próprio logo abaixo.
  const capa = capaDe(mesComNiveis({ periodo: ['2026-09'] }));
  // Fecharam 5 itens: 1 épico, 1 Feature, 2 PBI e 1 Bug. Valem 3 (PBI + Bug).
  assert.match(capa, /rl-heroi-base[\s\S]*?rl-num">3</);
  // A frase é rótulo: nomeia o que o número mede, sem repetir o número e sem
  // repetir o mês, que o título da capa já anuncia.
  assert.ok(capa.includes('>Itens entregues<'));
  assert.ok(!capa.includes('Azure DevOps'), 'o nome do sistema é jargão pra quem lê');
  assert.ok(!capa.includes('setembro'), 'o mês mora no título, não nos rótulos');
  assert.ok(!/3 itens/.test(capa), 'a contagem mora no numeral, não na frase');
});

test('capa: o número soma todos os meses do período, não só o último', () => {
  // Setembro tem 3 que valem (2 PBI + 1 Bug; o épico não conta) e agosto tem 1.
  // Num período de dois meses o bloco escuro precisa dizer 4 — foi contar só
  // setembro debaixo de um título que dizia "Agosto e Setembro" que motivou
  // trazer título e contagem pra mesma fonte.
  const capa = capaDe(mesComNiveis({ periodo: ['2026-08', '2026-09'] }));
  assert.match(capa, /rl-heroi-base[\s\S]*?rl-num">4</);
});

test('capa: o título nomeia exatamente os meses que o número contou', () => {
  const capa = capaDe(mesComNiveis({ periodo: ['2026-08', '2026-09'] }));
  assert.ok(capa.includes('Agosto e Setembro de 2026'), 'o ano aparece uma vez só');
  const umMes = capaDe(mesComNiveis({ periodo: ['2026-09'] }));
  assert.ok(umMes.includes('Setembro de 2026'));
  // A verificação é dentro do TÍTULO, e não na capa inteira: a capa tem outras
  // frases (a linha de situação, por exemplo) onde " e " é só conjunção.
  const forte = (h) => /<span class="rl-titulo-forte">([^<]*)</.exec(h)[1];
  assert.ok(!forte(umMes).includes(' e '), 'um mês sozinho não vira lista');
  assert.ok(forte(capa).includes(' e '), 'dois meses viram lista');
});

test('capa: a variação contra o mês anterior saiu', () => {
  // Ela não tinha régua num recorte de dois meses: comparar agosto+setembro
  // com agosto é comparar o período com um pedaço de si mesmo.
  const capa = capaDe(mesComNiveis());
  assert.ok(!capa.includes('rl-heroi-delta'), 'a pílula da variação saiu');
  assert.ok(!/[↗↘]/.test(capa), 'a seta da variação saiu junto');
  assert.ok(!capa.includes('a mais que no mês anterior'), 'e não voltou como texto');
});

test('capa: o único número conta a lista curada, não os épicos do DevOps', () => {
  // O DevOps deste mês tem UM épico. Vale sempre o que o corpo mostra.
  const porEpico = capaDe(BE.htmlReport(Object.assign(mesNiveisOpcoes(), { agrupar: 'epico' })).html);
  assert.match(porEpico, /Frentes atendidas[\s\S]*?rl-num">4</);
  const porIni = capaDe(BE.htmlReport(Object.assign(mesNiveisOpcoes(), { agrupar: 'iniciativa' })).html);
  // Cinco iniciativas de verdade — "Outras entregas" não é uma delas.
  assert.match(porIni, /Projetos atendidos[\s\S]*?rl-num">5</);
});

test('capa: o número bate com as seções do corpo, descontado o grupo órfão', () => {
  for (const [modo, rotulo, prefixo] of [
    ['epico', 'Frentes atendidas', 'id="epico-'],
    ['iniciativa', 'Projetos atendidos', 'id="ini-'],
  ]) {
    const h = BE.htmlReport(Object.assign(mesNiveisOpcoes(), { agrupar: modo })).html;
    const naCapa = Number((capaDe(h).match(new RegExp(rotulo + '[\\s\\S]*?rl-num">(\\d+)<')) || [])[1]);
    const secoes = (h.match(new RegExp(prefixo, 'g')) || []).length;
    // "Outras entregas" é seção no corpo mas não é iniciativa: entra no
    // documento e fica de fora da conta. Qualquer outra diferença é erro.
    const orfaos = h.includes('>Outras entregas<') ? 1 : 0;
    assert.equal(naCapa, secoes - orfaos, `${modo}: a capa não pode prometer número que o corpo não entrega`);
  }
});

test('capa: tem um número só — os outros dois saíram por redundância', () => {
  const roadmap = [{ titulo: 'X', inicio: '2026-09-01', fim: '2026-10-31', status: 'andamento' }];
  const capa = capaDe(documento({ roadmap }).html);
  assert.equal((capa.match(/rl-tile-rot/g) || []).length, 1, 'um rótulo de bloco claro, mais o bloco escuro');
  assert.ok(!capa.includes('Em execução agora'), 'o DevOps não tem seção que o sustente aqui');
  assert.ok(!capa.includes('Iniciativas em andamento'), 'repetia "Iniciativas" ao lado do outro');
});

test('capa: "Fora do prazo" não volta — o documento não tem seção de prazo', () => {
  const roadmap = [{ titulo: 'X', inicio: '2026-09-01', fim: '2026-10-31', status: 'andamento' }];
  const h = documento({ roadmap }).html;
  assert.ok(!h.includes('Fora do prazo'));
});

/* ---- O elo com o roadmap ----
   Agora o agrupamento casa cartão com linha do roadmap POR NOME. Se alguém
   renomear a iniciativa no roadmap.json (ou eu digitar torto aqui), o cartão
   não some nem quebra a tela: ele silenciosamente escorrega pra "Outras
   entregas" e ninguém percebe. Este teste é o alarme. */
const fs = require('node:fs');
const path = require('node:path');

test('toda iniciativa citada nos cartões existe no roadmap.json', () => {
  const src = fs.readFileSync(path.join(__dirname, '../assets/briefing-entregas.js'), 'utf8');
  const citadas = [...src.matchAll(/^\s*iniciativa: '([^']+)',$/gm)].map((m) => m[1]);
  assert.ok(citadas.length > 0, 'se nenhum cartão cita iniciativa, o agrupamento perdeu o sentido');

  const roadmap = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/roadmap.json'), 'utf8'));
  const titulos = new Set(roadmap.itens.map((i) => i.titulo));
  for (const nome of citadas) {
    assert.ok(titulos.has(nome), `"${nome}" não existe no roadmap.json — o cartão cairia em "Outras entregas"`);
  }
});

test('cartão sem iniciativa vai pro fim, num grupo próprio, e nunca some', () => {
  const roadmap = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../assets/roadmap.json'), 'utf8')).itens;
  const h = documento({ roadmap, agrupar: 'iniciativa' }).html;
  const titulos = [...h.matchAll(/<section class="rl-sec" id="ini-[\w-]+"[\s\S]*?<h2 class="rl-sec-titulo">([^<]+)</g)]
    .map((m) => m[1]);
  assert.equal(titulos[titulos.length - 1], 'Outras entregas', 'órfão fecha a lista, não abre');
  // Nenhum cartão pode se perder no caminho.
  const nomes = [...h.matchAll(/<h3 class="rl-frente-nome">([^<]+)<\/h3>/g)].map((m) => m[1]).sort();
  assert.deepEqual(nomes, [...TOPICOS].sort());
});

test('as seções seguem a ordem da lista de cartões, com o órfão no fim', () => {
  const roadmap = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../assets/roadmap.json'), 'utf8')).itens;
  const h = documento({ roadmap, agrupar: 'iniciativa' }).html;
  const titulos = [...h.matchAll(/<section class="rl-sec" id="ini-[\w-]+"[\s\S]*?<h2 class="rl-sec-titulo">([^<]+)</g)]
    .map((m) => m[1]);

  // Quem manda é a sequência dos cartões: o primeiro cartão de cada grupo
  // decide onde o grupo entra. Mover um cartão de lugar move a seção junto —
  // é assim que o Urlan controla a ordem sem tocar no roadmap.json.
  const src = fs.readFileSync(path.join(__dirname, '../assets/briefing-entregas.js'), 'utf8');
  const lista = src.slice(src.indexOf('const ENTREGAS_RECENTES'), src.indexOf('];', src.indexOf('const ENTREGAS_RECENTES')));
  const esperado = [];
  for (const bloco of lista.split(/\n    \{/).slice(1)) {
    const ini = (bloco.match(/iniciativa: '([^']+)'/) || [])[1] || 'Outras entregas';
    if (!esperado.includes(ini)) esperado.push(ini);
  }
  const orfao = esperado.indexOf('Outras entregas');
  if (orfao >= 0) esperado.push(esperado.splice(orfao, 1)[0]);

  assert.deepEqual(titulos, esperado);
  assert.equal(titulos[titulos.length - 1], 'Outras entregas', 'o grupo sem par fecha a lista');
});

test('capa: nenhum rótulo repete o mês nem termina em ponto', () => {
  const capa = capaDe(documento().html);
  const rotulos = [...capa.matchAll(/class="(?:rl-tile-rot|rl-heroi-frase)">([^<]+)</g)].map((m) => m[1].trim());
  assert.equal(rotulos.length, 2, 'a capa tem dois rótulos: o bloco claro e o escuro');
  for (const r of rotulos) {
    // O título da capa já diz de que mês o relatório é; repetir aqui é dizer a
    // mesma coisa três vezes na mesma tela.
    assert.ok(!/setembro|no período|no mês/i.test(r), `"${r}" ainda carrega recorte de tempo`);
    assert.ok(!r.endsWith('.'), `"${r}" termina em ponto — rótulo não é frase`);
  }
});

test('capa: o papel do responsável aparece por extenso, sem sigla pontuada', () => {
  const capa = capaDe(documento({ escopo: 'Urlan Dipre' }).html);
  assert.ok(capa.includes('Product Owner: Urlan Dipre'));
  assert.ok(!capa.includes('P.O'), 'a sigla pontuada não existe em nenhum outro lugar do documento');
});

/* ---- Galeria ----
   A miniatura é <a> pro arquivo, não <button>: o visor de entregas.html é
   melhoria por cima, e sem script o clique ainda leva à imagem. E o link não
   pode usar hash nem target: hash é onde viaja o dado do link de leitura, e
   target="_blank" era o comportamento que o Urlan pediu pra trocar. */

test('galeria: cada imagem vira uma figura com link pro arquivo e legenda', () => {
  const h = documento().html;
  const figs = [...h.matchAll(/<figure class="rl-fig">[\s\S]*?<\/figure>/g)].map((m) => m[0]);
  assert.ok(figs.length > 0, 'o cartão da HOME tem galeria');
  for (const f of figs) {
    assert.match(f, /<a class="rl-fig-link" href="assets\/entregas\/[^"]+\.jpg">/);
    assert.match(f, /<img src="assets\/entregas\/[^"]+\.jpg" alt="[^"]+" loading="lazy"/);
    assert.match(f, /<figcaption>[^<]+<\/figcaption>/);
  }
});

test('galeria: o link não abre em outra aba nem mexe no hash', () => {
  const h = documento().html;
  const trecho = h.slice(h.indexOf('rl-galeria'), h.indexOf('</div>', h.indexOf('rl-galeria')) + 6);
  assert.ok(!trecho.includes('target='), 'a visualização acontece na própria página');
  assert.ok(!/href="#/.test(trecho), 'hash é do link de leitura — a galeria não pode tocar nele');
});

test('galeria: a legenda do alt é a mesma da figcaption — leitor de tela e vidente leem igual', () => {
  const h = documento().html;
  for (const m of h.matchAll(/<img src="[^"]+" alt="([^"]+)"[\s\S]*?<figcaption>([^<]+)<\/figcaption>/g)) {
    assert.equal(m[1], m[2]);
  }
});

// A contagem de cartões com galeria NÃO se fixa aqui: ela sobe toda vez que o
// Urlan manda uma tela nova, e um teste que quebra em cada inclusão legítima
// vira ruído, não guarda. O que se guarda é a relação — moldura só existe onde
// há imagem declarada, e imagem nenhuma escapa pra fora de uma galeria.
/* A contagem por seção nasceu contando pelo ÉPICO e estava errada: os itens
   moram em Features, o épico tem várias, e cinco cartões apontavam pro mesmo
   épico — quatro seções mostravam o mesmo número, e a Tradução exibia os itens
   da loja inteira. Estes testes guardam a correção. */
function hierarquiaComFeatures() {
  const wi = (id, tipo, titulo, pai) => ({ id, fields: {
    'System.WorkItemType': tipo, 'System.State': 'Done', 'System.Title': titulo, 'System.Parent': pai } });
  const pbi = (id, pai, d) => ({ id, fields: {
    'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'i' + id,
    'System.Parent': pai, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - d * dia),
    'System.ChangedDate': iso(AGORA - dia) } });
  // Um épico com três Features, que é a forma real do board.
  const items = [wi(700, 'Epic', 'Loja', null),
    wi(710, 'Feature', 'Home', 700), wi(711, 'Feature', 'PDP', 700), wi(712, 'Feature', 'Tradução', 700)];
  const add = (f, n, base) => { for (let i = 0; i < n; i++) items.push(pbi(base + i, f, i % 2 ? 3 : 35)); };
  add(710, 7, 7100); add(711, 5, 7110); add(712, 4, 7120);
  return items;
}

test('contagem: cada seção conta a SUA Feature, não o épico inteiro', () => {
  const items = hierarquiaComFeatures();
  const cartoes = [
    { titulo: 'Home', iniciativa: 'Nova Homepage', epicoId: 700, featureIds: [710], status: 'entregue', resumo: 'x' },
    { titulo: 'PDP', iniciativa: 'Nova PDP', epicoId: 700, featureIds: [711], status: 'entregue', resumo: 'x' },
    { titulo: 'Tradução', iniciativa: 'Tradução', epicoId: 700, featureIds: [712], status: 'teste', resumo: 'x' },
  ];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes, periodo: ['2026-08', '2026-09'] }).html;
  const contas = [...h.matchAll(/<h2 class="rl-sec-titulo">([^<]+)<\/h2>\s*<p class="rl-sec-conta">([^<]+)</g)]
    .map((m) => [m[1], m[2]]);
  assert.deepEqual(contas, [['Nova Homepage', '7 itens'], ['Nova PDP', '5 itens'], ['Tradução', '4 itens']]);
  // O teste que importa: os três somam o épico inteiro, sem repetição.
  assert.equal(contas.reduce((n, c) => n + parseInt(c[1], 10), 0), 16);
});

test('contagem: a Feature conta o que fechou FORA do período também', () => {
  /* Decisão do Urlan pro primeiro relatório: a seção junta tudo que a frente
     entregou, porque várias começaram antes de agosto. A Nova PDP rodou de
     julho a agosto — com recorte de período a seção mostrava uma fração.

     Este é o teste que a versão anterior não tinha: as datas dos outros ficavam
     todas dentro do período, então passavam com ou sem o recorte. */
  const items = hierarquiaComFeatures();
  // Dois itens da Feature 710 fechados em JULHO, fora de agosto/setembro.
  items.push({ id: 7500, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done',
    'System.Title': 'julho A', 'System.Parent': 710,
    'Microsoft.VSTS.Common.ClosedDate': '2026-07-10T12:00:00Z', 'System.ChangedDate': iso(AGORA - dia) } });
  items.push({ id: 7501, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done',
    'System.Title': 'julho B', 'System.Parent': 710,
    'Microsoft.VSTS.Common.ClosedDate': '2026-07-20T12:00:00Z', 'System.ChangedDate': iso(AGORA - dia) } });
  const cartoes = [{ titulo: 'Home', iniciativa: 'Nova Homepage', epicoId: 700, featureIds: [710],
    status: 'entregue', resumo: 'x' }];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes, periodo: ['2026-08', '2026-09'] }).html;
  assert.match(h, /<p class="rl-sec-conta">9 itens</, '7 do período + 2 de julho');
});

test('contagem: item não concluído não entra, mesmo dentro da Feature', () => {
  // "Tudo que a frente entregou" é sobre entrega, não sobre trabalho em aberto.
  const items = hierarquiaComFeatures();
  items.push({ id: 7600, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'In Progress',
    'System.Title': 'ainda rodando', 'System.Parent': 710, 'System.ChangedDate': iso(AGORA - dia) } });
  const cartoes = [{ titulo: 'Home', iniciativa: 'Nova Homepage', epicoId: 700, featureIds: [710],
    status: 'andamento', resumo: 'x' }];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes, periodo: ['2026-08', '2026-09'] }).html;
  assert.match(h, /<p class="rl-sec-conta">7 itens</, 'o item em progresso fica de fora');
});

test('contagem: sem featureIds, o cartão ainda conta pelo épico', () => {
  // A migração é cartão a cartão; não pode existir um passo em que a seção fica
  // sem número nenhum porque a Feature ainda não foi declarada.
  const items = hierarquiaComFeatures();
  const cartoes = [{ titulo: 'Tudo', iniciativa: 'Loja', epicoId: 700, status: 'entregue', resumo: 'x' }];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes, periodo: ['2026-08', '2026-09'] }).html;
  assert.match(h, /<p class="rl-sec-conta">16 itens</, 'cai no épico, que soma as três Features');
});

test('contagem: dois cartões na mesma seção apontando pra mesma Feature contam uma vez', () => {
  const items = hierarquiaComFeatures();
  const cartoes = [
    { titulo: 'A', iniciativa: 'Home', epicoId: 700, featureIds: [710], status: 'entregue', resumo: 'x' },
    { titulo: 'B', iniciativa: 'Home', epicoId: 700, featureIds: [710], status: 'entregue', resumo: 'x' },
  ];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes, periodo: ['2026-08', '2026-09'] }).html;
  assert.match(h, /<p class="rl-sec-conta">7 itens</, 'e não 14');
});

test('contagem: item pendurado direto no épico não inventa dono', () => {
  // Sem Feature na cadeia, o item não pertence a frente nenhuma. Ele conta no
  // fallback por épico, mas nunca é atribuído a uma Feature.
  const items = hierarquiaComFeatures();
  items.push({ id: 7999, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done',
    'System.Title': 'solto', 'System.Parent': 700,
    'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 3 * dia), 'System.ChangedDate': iso(AGORA - dia) } });
  const porFeature = [
    { titulo: 'Home', iniciativa: 'Nova Homepage', epicoId: 700, featureIds: [710], status: 'entregue', resumo: 'x' }];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes: porFeature, periodo: ['2026-08', '2026-09'] }).html;
  assert.match(h, /<p class="rl-sec-conta">7 itens</, 'o item solto não entra na Feature');
});

test('contagem: cartão que tem barra de progresso não entra na conta da seção', () => {
  // O compliance é uma planilha de 18 itens que no board é UM item. A barra
  // ("faltam 4 dos 18") é a medida verdadeira; uma contagem por Feature diria
  // "1 item" embaixo do título e contradiria o cartão logo abaixo.
  const items = hierarquiaComFeatures();
  const cartoes = [
    { titulo: 'Planilha', iniciativa: 'Compliance', epicoId: 700, featureIds: [710],
      progresso: { feito: 14, total: 18 }, status: 'andamento', resumo: 'x' },
  ];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes, periodo: ['2026-08', '2026-09'] }).html;
  assert.ok(!/rl-sec-conta/.test(h), 'a seção não mostra contagem');
  assert.match(h, /aria-valuenow="14"/, 'e a barra do cartão continua lá');
});

test('contagem: numa seção mista, só os cartões sem barra contam', () => {
  const items = hierarquiaComFeatures();
  const cartoes = [
    { titulo: 'Com barra', iniciativa: 'Mista', epicoId: 700, featureIds: [711],
      progresso: { feito: 2, total: 9 }, status: 'andamento', resumo: 'x' },
    { titulo: 'Sem barra', iniciativa: 'Mista', epicoId: 700, featureIds: [710], status: 'entregue', resumo: 'x' },
  ];
  const h = BE.htmlReport({ items, todos: items, agora: AGORA, cartoes, periodo: ['2026-08', '2026-09'] }).html;
  // A Feature 710 tem 7; a 711 tem 5 e fica de fora porque aquele cartão se mede.
  assert.match(h, /<p class="rl-sec-conta">7 itens</);
});

test('barra: o cartão do compliance mostra o progresso que o texto afirma', () => {
  const h = documento().html;
  const card = [...h.matchAll(/<article class="rl-frente">[\s\S]*?<\/article>/g)]
    .map((m) => m[0]).find((c) => c.includes('Tratativas do Google compliance'));
  assert.ok(card, 'o cartão existe');
  const barra = /<div class="rl-progresso"[\s\S]*?<\/div>/.exec(card);
  assert.ok(barra, 'tem barra');
  // O número muda toda vez que a frente anda, então aqui não se fixa literal
  // nenhum: lê-se o que a barra afirma e o que o texto afirma, e exige-se que
  // fechem a conta. Assim o teste sobrevive à próxima atualização e continua
  // pegando o que importa — barra e parágrafo contando histórias diferentes.
  const feito = Number(/aria-valuenow="(\d+)"/.exec(barra[0])[1]);
  const total = Number(/aria-valuemax="(\d+)"/.exec(barra[0])[1]);
  const largura = Number(/width:(\d+)%/.exec(barra[0])[1]);
  const noTexto = /faltam apenas (\d+) dos (\d+)/.exec(card);
  assert.ok(noTexto, 'o resumo diz quantos faltam de quantos');
  assert.equal(Number(noTexto[2]), total, 'o total do texto é o total da barra');
  assert.equal(total - feito, Number(noTexto[1]), 'o que falta no texto é o que falta na barra');
  assert.equal(largura, Math.round((feito / total) * 100), 'a largura é a fração real');
});

test('barra: a contagem fica ao lado, e o leitor de tela não a ouve duas vezes', () => {
  const h = documento().html;
  const barra = /<div class="rl-progresso"[\s\S]*?<\/div>/.exec(h)[0];
  // A barra em si não tem texto: o único filho é a faixa preenchida.
  assert.equal(barra.replace(/<[^>]+>/g, '').trim(), '');
  assert.match(barra, /aria-label="(\d+) de (\d+) itens concluídos"/);
  const [, feito, total] = /aria-label="(\d+) de (\d+) itens concluídos"/.exec(barra);

  // A contagem é irmã da barra, e diz o mesmo par de números.
  const conta = /<span class="rl-progresso-conta"([^>]*)>([^<]+)<\/span>/.exec(h);
  assert.ok(conta, 'a contagem existe ao lado da barra');
  assert.equal(conta[2].trim(), `${feito}/${total}`, 'a contagem e o aria-label discordam');

  // `aria-hidden` porque o progressbar já anuncia os mesmos números pelo
  // aria-label; sem isso o leitor de tela diria tudo duas vezes seguidas.
  assert.match(conta[1], /aria-hidden="true"/);
});

test('barra: cartão que não declara progresso não ganha barra', () => {
  const h = documento().html;
  const cartoes = [...h.matchAll(/<article class="rl-frente">[\s\S]*?<\/article>/g)].map((m) => m[0]);
  const comBarra = cartoes.filter((c) => c.includes('rl-progresso'));
  assert.equal(comBarra.length, 1, 'hoje só o compliance tem contagem por trás');
  assert.ok(cartoes.length > comBarra.length);
});

// O href da planilha ainda não chegou, então hoje este teste guarda a ausência.
// Ele continua valendo sozinho quando o endereço entrar: o que se afirma é a
// regra do botão, não o estado de agora.
test('cta: só desenha com endereço http(s), e sempre em outra aba com rel seguro', () => {
  const h = documento().html;
  for (const a of [...h.matchAll(/<a class="rl-cta"[\s\S]*?<\/a>/g)].map((m) => m[0])) {
    assert.match(a, /href="https?:\/\/[^"]+"/, 'endereço externo de verdade');
    assert.match(a, /target="_blank"/);
    assert.match(a, /rel="noopener noreferrer"/);
  }
  assert.ok(!/href="javascript:/i.test(h), 'nenhum href executável');
  assert.ok(!/<a class="rl-cta" href=""/.test(h), 'botão sem destino não é desenhado');
});

test('galeria: só aparece em cartão que declara imagens', () => {
  const h = documento().html;
  const cartoes = [...h.matchAll(/<article class="rl-frente">[\s\S]*?<\/article>/g)].map((m) => m[0]);
  const comGaleria = cartoes.filter((c) => c.includes('rl-galeria'));
  const comFigura = cartoes.filter((c) => c.includes('rl-fig-link'));
  assert.ok(comGaleria.length > 0, 'pelo menos um cartão mostra tela');
  assert.deepEqual(comFigura, comGaleria, 'figura fora de galeria, ou galeria vazia');
  for (const c of cartoes.filter((c) => !c.includes('rl-galeria'))) {
    assert.ok(!c.includes('<figure'), 'cartão sem imagens declaradas não desenha moldura');
  }
});
