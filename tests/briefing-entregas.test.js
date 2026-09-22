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
  'Migração de ERP — ajustes gerais',
  'Tratativas do Google compliance',
  'Testes Shipsmart',
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

test('Entregas só marca selo em quem tem status, e "em andamento" é o único aceito', () => {
  const h = documento().html;
  assert.equal((h.match(/rl-selo-andamento/g) || []).length, 1, 'só Google compliance está em andamento');
  assert.ok(h.includes('Tratativas do Google compliance</h3>'), 'o status não pode virar parte do título');
  assert.ok(!h.includes('rl-selo-ok'), 'nenhum tópico foi declarado concluído');
  assert.ok(!h.includes('rl-selo-risco'));
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
    'ERP — Ordoro | Salesforce Rootstock',
    'Shipsmart',
    'Ybera Reviews / API de Reviews',
  ]);
  // A seção única da lista corrida não pode sobrar junto.
  assert.ok(!h.includes('id="recentes"'));
});

test('Entregas agrupado: a seção diz quantas entregas traz, no singular certo', () => {
  const h = documento({ agrupar: 'epico' }).html;
  assert.ok(h.includes('5 entregas recentes.'), 'Loja Clube USA tem cinco');
  assert.equal((h.match(/1 entrega recente\./g) || []).length, 3, 'os outros três têm uma cada');
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

// Um mês com os três níveis fechados, e um mês anterior pra comparar.
function mesComNiveis() {
  const items = [
    { id: 1, fields: { 'System.WorkItemType': 'Epic', 'System.State': 'Done', 'System.Title': 'Frente', 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 2 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 10, fields: { 'System.WorkItemType': 'Feature', 'System.State': 'Done', 'System.Title': 'Bloco', 'System.Parent': 1, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 3 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 11, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'P1', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 4 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 12, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'P2', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 5 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 13, fields: { 'System.WorkItemType': 'Bug', 'System.State': 'Done', 'System.Title': 'B1', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 6 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
    { id: 20, fields: { 'System.WorkItemType': 'Product Backlog Item', 'System.State': 'Done', 'System.Title': 'Mês passado', 'System.Parent': 10, 'Microsoft.VSTS.Common.ClosedDate': iso(AGORA - 35 * dia), 'System.ChangedDate': iso(AGORA - dia) } },
  ];
  return BE.htmlReport({ items, todos: items, agora: AGORA }).html;
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
  const capa = capaDe(mesComNiveis());
  // Fecharam 5 itens: 1 épico, 1 Feature, 2 PBI e 1 Bug. Valem 3 (PBI + Bug).
  assert.match(capa, /rl-heroi-base[\s\S]*?rl-num">3</);
  // A frase é rótulo: nomeia o que o número mede, sem repetir o número e sem
  // repetir o mês, que o título da capa já anuncia.
  assert.ok(capa.includes('>Itens entregues<'));
  assert.ok(!capa.includes('Azure DevOps'), 'o nome do sistema é jargão pra quem lê');
  assert.ok(!capa.includes('setembro'), 'o mês mora no título, não nos rótulos');
  assert.ok(!/3 itens/.test(capa), 'a contagem mora no numeral, não na frase');
});

test('capa: o delta compara PBI com PBI, não com o total de itens', () => {
  const capa = capaDe(mesComNiveis());
  // Mês anterior teve 1 PBI; este teve 3. A variação é +2, e ela vive na
  // pílula — a frase não a repete mais.
  assert.match(capa, /rl-heroi-delta[\s\S]*?\+2</);
  assert.ok(!capa.includes('a mais que no mês anterior'), 'a comparação saiu do texto');
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
