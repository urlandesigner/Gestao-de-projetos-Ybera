/* AS LINHAS DE RESUMO ESCRITAS SOZINHAS (20/10/2026).

   Roda a varredura de verdade, com um DevOps, um modelo e um armazém de
   mentira. O que se guarda aqui, em ordem de gravidade:
   1. a descrição crua nunca é guardada, devolvida nem mandada além do modelo;
   2. linha escrita à mão nunca é regerada;
   3. só se paga o modelo pelo que falta ou mudou, e no máximo TETO por rodada;
   4. o que o modelo devolve passa por filtro antes de virar texto público;
   5. nenhuma falha daqui derruba o relatório nem a Central. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const C = require('../assets/core.js');
const R = require('../api/_lib/resumos.js');
const { responder: responderRelatorio } = require('../api/_lib/relatorio.js');
const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

const AGORA = Date.parse('2026-10-20T12:00:00Z');
const CRU = 'SEGREDO-INTERNO-DA-DESCRICAO';

/* ---------- o mundo de mentira ---------- */

function item(id, tipo, titulo, pai, descricao) {
  return { id, fields: {
    'System.WorkItemType': tipo, 'System.State': 'Active', 'System.Title': titulo,
    'System.Parent': pai, 'System.IterationPath': 'B2C',
    'System.Description': descricao,
  } };
}
const mundo = (extra) => {
  const itens = [
    item(900001, 'Product Backlog Item', 'PBI com texto', 900010, '<p>Fazer a assinatura aparecer no checkout. ' + CRU + '</p>'),
    item(900002, 'Product Backlog Item', 'PBI sem descrição', 900010, ''),
    item(900003, 'Bug', 'Bug com texto', 900010, '<div>O botão some no celular.</div>'),
    item(900004, 'Task', 'Task não conta', 900001, '<p>Tarefa miúda</p>'),
  ].concat(extra || []);
  const pais = [
    item(900010, 'Feature', 'Feature', 900100, '<p>feature</p>'),
    item(900100, 'Epic', 'Loja Clube USA', null, '<p>Loja nova para o público dos Estados Unidos.</p>'),
  ];
  return { itens, pais };
};

function devopsFalso(m) {
  const pedidos = [];
  const fetchImpl = async (url, opcoes) => {
    pedidos.push(url);
    const corpo = (obj) => new Response(JSON.stringify(obj), { status: 200, headers: { 'content-type': 'application/json' } });
    if (/teamfieldvalues/.test(url)) return corpo({ values: [{ value: 'B2C\\Ecommerce', includeChildren: true }] });
    if (/iterations/.test(url)) return corpo({ value: [] });
    if (/wiql/.test(url)) return corpo({ workItems: m.itens.map((x) => ({ id: x.id })) });
    if (/workitemsbatch/.test(url)) {
      const ids = JSON.parse(opcoes.body).ids;
      return corpo({ value: m.itens.concat(m.pais).filter((x) => ids.includes(x.id)) });
    }
    return corpo({});
  };
  return { fetchImpl, pedidos };
}

function armazemFalso(inicial) {
  const a = { dado: inicial || { itens: {}, varridoEm: 0, travaAte: 0, pendentes: 0, atualizadoEm: '' }, gravacoes: [] };
  a.ler = async () => JSON.parse(JSON.stringify(a.dado));
  a.gravar = async (d) => { a.gravacoes.push(JSON.parse(JSON.stringify(d))); a.dado = JSON.parse(JSON.stringify(d)); };
  return a;
}

function modeloFalso(resposta) {
  const chamadas = [];
  const gerar = async (it) => {
    chamadas.push(it);
    return typeof resposta === 'function' ? resposta(it) : (resposta || 'Mostra a assinatura no checkout para quem compra todo mês.');
  };
  return { gerar, chamadas };
}

const env = { AZDO_PAT: 'token-de-teste' };
const rodar = (m, opcoes) => R.varrer(Object.assign({
  env, agora: AGORA, avisar: () => {}, fetchImpl: devopsFalso(m).fetchImpl,
}, opcoes));

/* ---------- 1. o filtro da frase ---------- */

test('a frase do modelo vira uma linha limpa, ou nada', () => {
  assert.equal(R.limparLinha('  Permite trocar o banner.\n'), 'Permite trocar o banner.');
  assert.equal(R.limparLinha('Resumo: Monta vitrines na home.'), 'Monta vitrines na home.');
  assert.equal(R.limparLinha('"Compara as ferramentas."'), 'Compara as ferramentas.');
  assert.equal(R.limparLinha('Duas\nlinhas   viram uma.'), 'Duas linhas viram uma.');
  assert.equal(R.limparLinha('SEM_RESUMO'), '');
  assert.equal(R.limparLinha(''), '');
  assert.equal(R.limparLinha(null), '');
});

test('link, e-mail e frase longa demais não viram texto público', () => {
  assert.equal(R.limparLinha('Veja https://interno.ybera.com/x para detalhes.'), null);
  assert.equal(R.limparLinha('Veja www.interno.com para detalhes.'), null);
  assert.equal(R.limparLinha('Fale com ana@ybera.com sobre isso.'), null);
  assert.equal(R.limparLinha('a'.repeat(241)), null);
  assert.equal(R.limparLinha('a'.repeat(240)).length, 240);
});

/* ---------- 2. o que falta ---------- */

test('falta frase: épico primeiro, e só tipo que tem cartão e tem descrição', () => {
  const m = mundo();
  const fila = R.pendentesDe({ itens: m.itens, pais: m.pais, guardadas: {}, fixos: {} });
  assert.deepEqual(fila.map((x) => x.id), [900100, 900001, 900003]);
  // O épico vem dos pais (fora da área do time), e o PBI sabe de que produto é.
  assert.equal(fila.find((x) => x.id === 900001).produto, 'Loja Clube USA');
  assert.equal(fila.find((x) => x.id === 900100).produto, '');
});

test('linha escrita à mão não se regera; linha de descrição antiga, sim', () => {
  const m = mundo();
  const maoLivre = { 900001: { resumo: 'Escrita pelo Urlan.', de: '' } };
  let fila = R.pendentesDe({ itens: m.itens, pais: m.pais, guardadas: {}, fixos: maoLivre });
  assert.ok(!fila.some((x) => x.id === 900001), 'regerou a linha escrita à mão');

  const texto = C.descricaoLimpa(m.itens[0].fields['System.Description']);
  const emDia = { 900001: { resumo: 'Do Claude Code.', de: C.digitalDoTexto(texto) } };
  fila = R.pendentesDe({ itens: m.itens, pais: m.pais, guardadas: {}, fixos: emDia });
  assert.ok(!fila.some((x) => x.id === 900001), 'regerou linha que está em dia');

  const velha = { 900001: { resumo: 'De uma descrição que mudou.', de: '00000000' } };
  fila = R.pendentesDe({ itens: m.itens, pais: m.pais, guardadas: {}, fixos: velha });
  assert.ok(fila.some((x) => x.id === 900001));
});

test('já gerada desta descrição não se paga de novo; mudou, sim', () => {
  const m = mundo();
  const texto = C.descricaoLimpa(m.itens[0].fields['System.Description']);
  const guardadas = { 900001: { resumo: 'ok', de: C.digitalDoTexto(texto) } };
  let fila = R.pendentesDe({ itens: m.itens, pais: m.pais, guardadas, fixos: {} });
  assert.ok(!fila.some((x) => x.id === 900001));
  guardadas[900001].de = '00000000';
  fila = R.pendentesDe({ itens: m.itens, pais: m.pais, guardadas, fixos: {} });
  assert.ok(fila.some((x) => x.id === 900001));
});

/* ---------- 3. a varredura ---------- */

test('gera o que falta e guarda só a frase e a impressão digital', async () => {
  const m = mundo();
  const arm = armazemFalso();
  const { gerar, chamadas } = modeloFalso();
  const r = await rodar(m, { gerar, armazem: arm });
  assert.equal(r.estado, 'ok');
  assert.equal(r.geradas, 3);
  assert.equal(r.pendentes, 0);
  assert.equal(chamadas.length, 3);
  // O modelo recebe a descrição (é o trabalho dele)…
  assert.match(chamadas.find((x) => x.id === undefined && x.titulo === 'PBI com texto').texto, new RegExp(CRU));
  // …mas o armazém guarda só a frase.
  const guardado = JSON.stringify(arm.dado);
  assert.doesNotMatch(guardado, new RegExp(CRU));
  assert.deepEqual(Object.keys(arm.dado.itens['900001']).sort(), ['de', 'resumo']);
  assert.equal(arm.dado.varridoEm, AGORA);
  assert.equal(arm.dado.travaAte, 0, 'a trava tem que soltar no fim');
  assert.equal(arm.dado.atualizadoEm, '2026-10-20');
});

test('segunda rodada, nada mudou: não chama o modelo', async () => {
  const m = mundo();
  const arm = armazemFalso();
  await rodar(m, { gerar: modeloFalso().gerar, armazem: arm });
  const { gerar, chamadas } = modeloFalso();
  const r = await rodar(m, { gerar, armazem: arm });
  assert.equal(chamadas.length, 0);
  assert.equal(r.geradas, 0);
});

test('a descrição mudou: só esse item é regerado', async () => {
  const m = mundo();
  const arm = armazemFalso();
  await rodar(m, { gerar: modeloFalso().gerar, armazem: arm });
  m.itens[0].fields['System.Description'] = '<p>Agora a assinatura vira renovação automática.</p>';
  const { gerar, chamadas } = modeloFalso('Renova a assinatura sozinha a cada ciclo.');
  await rodar(m, { gerar, armazem: arm });
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].titulo, 'PBI com texto');
  assert.equal(arm.dado.itens['900001'].resumo, 'Renova a assinatura sozinha a cada ciclo.');
});

test('só reindentar a descrição não custa uma nova geração', async () => {
  const m = mundo();
  const arm = armazemFalso();
  await rodar(m, { gerar: modeloFalso().gerar, armazem: arm });
  m.itens[2].fields['System.Description'] = '<div>  O botão   some\n no celular. </div>';
  const { gerar, chamadas } = modeloFalso();
  await rodar(m, { gerar, armazem: arm });
  assert.equal(chamadas.length, 0);
});

test('descrição ilegível (SEM_RESUMO) fica marcada e não se repete todo dia', async () => {
  const m = mundo();
  const arm = armazemFalso();
  await rodar(m, { gerar: modeloFalso('SEM_RESUMO').gerar, armazem: arm });
  assert.equal(arm.dado.itens['900001'].resumo, '');
  const { gerar, chamadas } = modeloFalso();
  await rodar(m, { gerar, armazem: arm });
  assert.equal(chamadas.length, 0);
  // E o que o público lê não inclui linha vazia.
  const publico = await R.linhasGuardadas({ armazem: arm });
  assert.deepEqual(Object.keys(publico.itens), []);
});

test('frase que o filtro recusa não é guardada, e o item volta amanhã', async () => {
  const m = mundo();
  const arm = armazemFalso();
  const avisos = [];
  const { gerar } = modeloFalso('Detalhes em https://interno.ybera.com/wiki');
  const r = await rodar(m, { gerar, armazem: arm, avisar: (x) => avisos.push(x) });
  assert.equal(r.geradas, 0);
  assert.equal(r.pendentes, 3);
  assert.deepEqual(arm.dado.itens, {});
  assert.ok(avisos.length >= 1);
});

test('erro do modelo num item não derruba os outros', async () => {
  const m = mundo();
  const arm = armazemFalso();
  const gerar = async (it) => { if (it.titulo === 'Bug com texto') throw new Error('rede caiu'); return 'Mostra a assinatura no checkout.'; };
  const r = await rodar(m, { gerar, armazem: arm, avisar: () => {} });
  assert.equal(r.geradas, 2);
  assert.equal(r.pendentes, 1);
  assert.equal(r.erros, 1);
  assert.doesNotMatch(JSON.stringify(r), /rede caiu/, 'a mensagem do erro foi pra resposta pública');
});

test('chave recusada: para na hora, avisa, e não grava frase nenhuma', async () => {
  const m = mundo(Array.from({ length: 30 }, (_, i) => item(900200 + i, 'Product Backlog Item', 'P' + i, 900010, '<p>texto ' + i + '</p>')));
  const arm = armazemFalso();
  let chamadas = 0;
  const gerar = async () => { chamadas++; const e = new Error('invalid x-api-key'); e.status = 401; throw e; };
  const r = await rodar(m, { gerar, armazem: arm });
  assert.equal(r.estado, 'sem-chave');
  assert.equal(r.geradas, 0);
  assert.ok(chamadas <= 6, 'insistiu na chave recusada: ' + chamadas + ' chamadas');
});

test('no máximo TETO frases por rodada; o resto fica pendente pra próxima', async () => {
  const muitos = Array.from({ length: R.TETO + 30 }, (_, i) => item(910000 + i, 'Product Backlog Item', 'P' + i, 900010, '<p>texto ' + i + '</p>'));
  const m = mundo(muitos);
  const arm = armazemFalso();
  const { gerar, chamadas } = modeloFalso();
  const r = await rodar(m, { gerar, armazem: arm });
  assert.equal(chamadas.length, R.TETO);
  assert.equal(r.geradas, R.TETO);
  assert.equal(r.pendentes, 3 + R.TETO + 30 - R.TETO);
  // A rodada seguinte continua de onde parou, sem refazer o que já tem.
  const outra = modeloFalso();
  const r2 = await rodar(m, { gerar: outra.gerar, armazem: arm });
  assert.equal(outra.chamadas.length, 33);
  assert.equal(r2.pendentes, 0);
});

test('duas varreduras ao mesmo tempo: a segunda espera', async () => {
  const m = mundo();
  const arm = armazemFalso();
  arm.dado.travaAte = AGORA + 60000;
  const { gerar, chamadas } = modeloFalso();
  const { fetchImpl, pedidos } = devopsFalso(m);
  const r = await R.varrer({ env, agora: AGORA, avisar: () => {}, fetchImpl, gerar, armazem: arm });
  assert.equal(r.estado, 'em-andamento');
  assert.equal(chamadas.length, 0);
  assert.equal(pedidos.length, 0, 'nem chegou a consultar o DevOps');
  // Trava vencida (a função caiu no meio): segue.
  arm.dado.travaAte = AGORA - 1;
  assert.equal((await R.varrer({ env, agora: AGORA, avisar: () => {}, fetchImpl, gerar, armazem: arm })).estado, 'ok');
});

test('DevOps recusou: a trava solta e o erro sobe', async () => {
  const arm = armazemFalso();
  const fetchImpl = async () => new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } });
  await assert.rejects(R.varrer({ env, agora: AGORA, avisar: () => {}, fetchImpl, gerar: modeloFalso().gerar, armazem: arm }));
  assert.equal(arm.dado.travaAte, 0);
});

/* ---------- 4. a porta HTTP ---------- */

const pedir = (q, extra) => new Request('https://gestao-de-projetos-ybera.vercel.app/api/resumos' + q,
  Object.assign({ headers: { origin: 'https://nivello-sistemas.github.io' } }, extra || {}));

test('GET lê só frases: nada de descrição, nada de trava, e CORS dos sites conhecidos', async () => {
  const arm = armazemFalso({ itens: { 900001: { resumo: 'Mostra a assinatura.', de: 'abcd1234' }, abc: { resumo: 'chave ruim', de: 'x' } },
    varridoEm: AGORA, travaAte: AGORA + 1000, pendentes: 4, atualizadoEm: '2026-10-20' });
  const r = await R.responder(pedir(''), { armazem: arm, env: {} });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://nivello-sistemas.github.io');
  assert.match(r.headers.get('cache-control'), /s-maxage=300/);
  const corpo = await r.json();
  assert.deepEqual(Object.keys(corpo).sort(), ['atualizadoEm', 'itens']);
  assert.deepEqual(Object.keys(corpo.itens), ['900001']);
  const outro = await R.responder(pedir('', { headers: { origin: 'https://evil.example' } }), { armazem: arm, env: {} });
  assert.equal(outro.headers.get('access-control-allow-origin'), null);
});

test('sem armazém configurado: 503 claro, sem estourar', async () => {
  const r = await R.responder(pedir(''), { env: {} });
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { erro: 'sem-armazem' });
});

test('armazém quebrado: 502 sem detalhe na resposta', async () => {
  const arm = { ler: async () => { throw new Error('token secreto vazou aqui'); }, gravar: async () => {} };
  const avisos = [];
  const r = await R.responder(pedir(''), { armazem: arm, env: {}, avisar: (x) => avisos.push(x) });
  assert.equal(r.status, 502);
  assert.doesNotMatch(JSON.stringify(await r.json()), /secreto/);
  assert.ok(avisos.length);
});

test('varrer exige token do DevOps, chave do modelo e armazém — sem eles não gasta nada', async () => {
  const { gerar, chamadas } = modeloFalso();
  const arm = armazemFalso();
  assert.equal((await R.responder(pedir('?varrer=1'), { env: {}, gerar, armazem: arm })).status, 503);
  const semChave = await R.responder(pedir('?varrer=1'), { env: { AZDO_PAT: 'x' }, armazem: arm });
  assert.equal(semChave.status, 503);
  assert.deepEqual(await semChave.json(), { erro: 'sem-chave' });
  const semArmazem = await R.responder(pedir('?varrer=1'), { env: { AZDO_PAT: 'x', ANTHROPIC_API_KEY: 'k' } });
  assert.deepEqual(await semArmazem.json(), { erro: 'sem-armazem' });
  assert.equal(chamadas.length, 0);
});

test('varrer=1 faz a rodada e responde só com contagens', async () => {
  const m = mundo();
  const arm = armazemFalso();
  const { gerar } = modeloFalso();
  const r = await R.responder(pedir('?varrer=1'), { env, fetchImpl: devopsFalso(m).fetchImpl, gerar, armazem: arm, agora: AGORA, avisar: () => {} });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const corpo = await r.json();
  assert.deepEqual(Object.keys(corpo).sort(), ['estado', 'geradas', 'pendentes', 'total']);
  assert.doesNotMatch(JSON.stringify(corpo), new RegExp(CRU));
});

test('método que não é GET é recusado', async () => {
  const r = await R.responder(new Request('https://x.test/api/resumos?varrer=1', { method: 'POST' }), { env, gerar: modeloFalso().gerar, armazem: armazemFalso() });
  assert.equal(r.status, 405);
});

/* ---------- 5. quem manda mais: a mescla ---------- */

test('mescla: à mão ganha; em dia com a mesma descrição, o arquivo ganha; descrição nova, a automática', () => {
  const fixos = C.saneResumos({
    1: { resumo: 'À mão.' },
    2: { resumo: 'Do arquivo.', de: 'aaaaaaaa' },
    3: { resumo: 'Velha do arquivo.', de: 'bbbbbbbb' },
  });
  const auto = C.saneResumos({
    1: { resumo: 'Automática 1.', de: 'zzzzzzzz' },
    2: { resumo: 'Automática 2.', de: 'aaaaaaaa' },
    3: { resumo: 'Automática 3.', de: 'cccccccc' },
    4: { resumo: 'Só automática.', de: 'dddddddd' },
  });
  const m = C.mesclarResumos(fixos, auto);
  assert.equal(m['1'].resumo, 'À mão.');
  assert.equal(m['2'].resumo, 'Do arquivo.');
  assert.equal(m['3'].resumo, 'Automática 3.');
  assert.equal(m['4'].resumo, 'Só automática.');
  assert.deepEqual(C.mesclarResumos(fixos, null), fixos);
  assert.deepEqual(C.mesclarResumos(null, auto), auto);
});

test('precisaDeLinha: sem linha, antiga ou à mão', () => {
  const txt = 'qualquer texto';
  assert.equal(C.precisaDeLinha(undefined, txt), true);
  assert.equal(C.precisaDeLinha({ resumo: '' }, txt), true);
  assert.equal(C.precisaDeLinha({ resumo: 'x', de: '' }, 'outro texto'), false);
  assert.equal(C.precisaDeLinha({ resumo: 'x', de: C.digitalDoTexto(txt) }, txt), false);
  assert.equal(C.precisaDeLinha({ resumo: 'x', de: '00000000' }, txt), true);
});

/* ---------- 6. o relatório não depende disto ---------- */

test('armazém fora do ar não derruba o relatório', async () => {
  const m = mundo();
  const arm = { ler: async () => { throw new Error('blob fora'); }, gravar: async () => {} };
  const avisos = [];
  const r = await responderRelatorio(
    new Request('https://gestao-de-projetos-ybera.vercel.app/api/relatorio?edicao=2026-10&de=urlan', { headers: { origin: 'https://nivello-sistemas.github.io' } }),
    { env, fetchImpl: devopsFalso(m).fetchImpl, agora: AGORA, avisar: (x) => avisos.push(x), armazem: arm });
  // O armazém só é lido quando há armazém configurado (env) ou injetado: aqui foi injetado.
  assert.equal(r.status, 200);
  assert.ok(avisos.some((x) => /frases automáticas/.test(x)));
});

/* ---------- 7. a Central e a configuração ---------- */

test('a Central mescla as frases automáticas e segue sem elas', () => {
  const app = ler('assets/app.js');
  assert.match(app, /const FUNCAO_RESUMOS = 'https:\/\/gestao-de-projetos-ybera\.vercel\.app\/api\/resumos';/);
  assert.match(app, /C\.mesclarResumos\(state\.resumos, auto\)/);
  const i = app.indexOf('async function buscarResumosAuto');
  const corpo = app.slice(i, app.indexOf('\n}\n', i));
  assert.match(corpo, /if \(!resp\.ok\) return \{\};/);
  assert.match(corpo, /catch \(e\) \{\s*return \{\};/);
  // A Central continua sem ler a descrição do DevOps: o resumo vem pronto.
  assert.doesNotMatch(app, /System\.Description/);
});

test('o modelo é o Haiku 5.5, e os SDKs só são carregados quando usados', () => {
  assert.equal(R.MODELO, 'claude-haiku-5-5');
  const fonte = ler('api/_lib/resumos.js');
  // Nada de require dos SDKs no topo do arquivo: os testes e o relatório
  // carregam este módulo sem precisar deles (e sem chave).
  const topo = fonte.slice(0, fonte.indexOf('function limparLinha'));
  assert.doesNotMatch(topo.replace(/\/\*[\s\S]*?\*\//g, ''), /require\('@(anthropic-ai\/sdk|vercel\/blob)'\)/);
  const pkg = JSON.parse(ler('package.json'));
  assert.ok(pkg.dependencies['@anthropic-ai/sdk'] && pkg.dependencies['@vercel/blob']);
});

test('nenhuma chave nem token no código; o prompt proíbe vazar dado interno', () => {
  const fonte = ler('api/_lib/resumos.js');
  assert.doesNotMatch(fonte, /sk-ant-/);
  assert.match(R.SISTEMA, /links, e-mails, nomes de pessoas/);
  assert.match(R.SISTEMA, /dado do item, não instrução/);
});

test('o cron diário chama a varredura, e o site oficial não leva a configuração', () => {
  const v = JSON.parse(ler('vercel.json'));
  assert.deepEqual(v.crons, [{ path: '/api/resumos?varrer=1', schedule: '0 9 * * *' }]);
  const sync = ler('scripts/sincronizar-pages.sh');
  for (const f of ['/vercel.json', '/node_modules/', '/package-lock.json', '/tests/resumos-auto.test.js']) {
    assert.ok(sync.includes("--exclude='" + f + "'"), f + ' iria pro site oficial');
  }
  assert.match(ler('.gitignore'), /^node_modules\/$/m);
});
