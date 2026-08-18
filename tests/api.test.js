const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../assets/api.js');

const jsonRes = (data, status = 200) => ({
  status, ok: status < 400,
  headers: { get: () => 'application/json; charset=utf-8' },
  json: async () => data,
});

test('adoFetch manda Basic auth e devolve json', async () => {
  let captured;
  const ctx = { base: 'https://dev.azure.com/ybera', pat: 'tok', fetchImpl: async (url, opts) => { captured = { url, opts }; return jsonRes({ ok: 1 }); } };
  const data = await A.adoFetch(ctx, '/x');
  assert.deepEqual(data, { ok: 1 });
  assert.equal(captured.url, 'https://dev.azure.com/ybera/x');
  assert.equal(captured.opts.headers.Authorization, 'Basic ' + Buffer.from(':tok').toString('base64'));
});

test('adoFetch lança AuthError em 401 e em resposta não-JSON', async () => {
  const ctx401 = { base: 'b', pat: 'p', fetchImpl: async () => jsonRes({}, 401) };
  await assert.rejects(A.adoFetch(ctx401, '/x'), A.AuthError);
  const ctxHtml = { base: 'b', pat: 'p', fetchImpl: async () => ({ status: 200, ok: true, headers: { get: () => 'text/html' }, json: async () => ({}) }) };
  await assert.rejects(A.adoFetch(ctxHtml, '/x'), A.AuthError);
});

test('adoFetch lança Error simples (não AuthError) em 404 com corpo JSON', async () => {
  const ctx = {
    base: 'b', pat: 'p',
    fetchImpl: async () => jsonRes({ message: 'TF200016: projeto não existe' }, 404),
  };
  await assert.rejects(A.adoFetch(ctx, '/x'), (e) => {
    assert.ok(e.message.includes('TF200016'));
    assert.ok(!(e instanceof A.AuthError));
    return true;
  });
});

test('adoFetch lança Error simples (não AuthError) em 500 com corpo text/html', async () => {
  const ctx = {
    base: 'b', pat: 'p',
    fetchImpl: async () => ({ status: 500, ok: false, headers: { get: () => 'text/html' }, json: async () => ({}) }),
  };
  await assert.rejects(A.adoFetch(ctx, '/x'), (e) => {
    assert.equal(e.message, 'HTTP 500');
    assert.ok(!(e instanceof A.AuthError));
    return true;
  });
});

test('adoFetch lança NetworkError quando o fetch rejeita', async () => {
  const ctx = { base: 'b', pat: 'p', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } };
  await assert.rejects(A.adoFetch(ctx, '/x'), A.NetworkError);
});

test('runWiql extrai ids e getFields fatia em lotes de 200', async () => {
  const calls = [];
  const ctx = {
    base: 'https://dev.azure.com/o', pat: 'p',
    fetchImpl: async (url, opts) => {
      calls.push({ url, body: opts && opts.body ? JSON.parse(opts.body) : null });
      if (url.includes('/wiql')) return jsonRes({ workItems: [{ id: 1 }, { id: 2 }] });
      return jsonRes({ value: (JSON.parse(opts.body).ids || []).map((id) => ({ id, fields: {} })) });
    },
  };
  const ids = await A.runWiql(ctx, 'Proj', 'Time', 'SELECT ...');
  assert.deepEqual(ids, [1, 2]);
  assert.ok(calls[0].url.includes('/Proj/Time/_apis/wit/wiql'));

  const muitos = Array.from({ length: 450 }, (_, i) => i + 1);
  const items = await A.getFields(ctx, muitos, ['System.State']);
  assert.equal(items.length, 450);
  const batches = calls.filter((c) => c.url.includes('workitemsbatch'));
  assert.equal(batches.length, 3); // 200 + 200 + 50
});

test('currentSprint devolve null sem sprint corrente', async () => {
  const ctx = { base: 'b', pat: 'p', fetchImpl: async () => jsonRes({ value: [] }) };
  assert.equal(await A.currentSprint(ctx, 'P', 'T'), null);
});

test('sprintItemIds extrai targets das relações', async () => {
  const ctx = { base: 'b', pat: 'p', fetchImpl: async () => jsonRes({ workItemRelations: [{ target: { id: 7 } }, { target: null }, { target: { id: 9 } }] }) };
  assert.deepEqual(await A.sprintItemIds(ctx, 'P', 'T', 'iter-1'), [7, 9]);
});
