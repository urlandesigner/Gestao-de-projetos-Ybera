import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoFetch, runWiql, getFields, AuthError, NetworkError } from '../ado.mjs';

/* fetch falso: o ctx.fetchImpl injetado é o que torna o tratamento de erro
   testável sem rede. */
function resposta({status = 200, tipo = 'application/json', corpo = {}} = {}){
  return {
    status, ok: status >= 200 && status < 300,
    headers: { get: () => tipo },
    json: async () => corpo
  };
}
const ctx = r => ({ base:'https://dev.azure.com/nivello', pat:'x', fetchImpl: async () => r });

test('200 com JSON devolve o corpo', async () => {
  const out = await adoFetch(ctx(resposta({corpo:{value:[1,2]}})), '/x');
  assert.deepEqual(out, {value:[1,2]});
});

test('401 vira AuthError', async () => {
  await assert.rejects(() => adoFetch(ctx(resposta({status:401})), '/x'), AuthError);
});

test('403 vira AuthError', async () => {
  await assert.rejects(() => adoFetch(ctx(resposta({status:403})), '/x'), AuthError);
});

/* A armadilha que a Central de Projetos descobriu: PAT vencido no ADO não
   responde 401. Responde 200 com text/html, a página de signin. */
test('200 com text/html vira AuthError, nao sucesso', async () => {
  await assert.rejects(
    () => adoFetch(ctx(resposta({tipo:'text/html'})), '/x'),
    err => err instanceof AuthError && /PAT/.test(err.message)
  );
});

test('falha de rede vira NetworkError', async () => {
  const c = { base:'b', pat:'x', fetchImpl: async () => { throw new Error('ENOTFOUND'); } };
  await assert.rejects(() => adoFetch(c, '/x'), NetworkError);
});

test('erro HTTP com JSON usa a mensagem da API', async () => {
  await assert.rejects(
    () => adoFetch(ctx(resposta({status:400, corpo:{message:'WIQL torto'}})), '/x'),
    err => err.message === 'WIQL torto'
  );
});

test('runWiql devolve só os ids', async () => {
  const r = resposta({corpo:{workItems:[{id:7},{id:9}]}});
  assert.deepEqual(await runWiql(ctx(r), 'Ecommerce USA', 'SELECT 1'), [7,9]);
});

test('runWiql sem resultado devolve lista vazia', async () => {
  assert.deepEqual(await runWiql(ctx(resposta({corpo:{}})), 'P', 'SELECT 1'), []);
});

/* Mais de 200 ids tem de ser quebrado em lotes: é limite da API workitemsbatch. */
test('getFields quebra em lotes de 200', async () => {
  const chamadas = [];
  const c = {
    base:'b', pat:'x',
    fetchImpl: async (url, opt) => {
      chamadas.push(JSON.parse(opt.body).ids.length);
      return resposta({corpo:{value:[{id:1, fields:{}}]}});
    }
  };
  const ids = Array.from({length:450}, (_, i) => i + 1);
  await getFields(c, ids, ['System.Title']);
  assert.deepEqual(chamadas, [200, 200, 50]);
});
