/* Toda lista de campos que o app.js usa tem que estar declarada nele.

   Em 09/10/2026 uma edição apagou FIELDS_BASE e FIELDS_ITEMS sem tirar quem
   as usava. O app.js é um IIFE carregado só no navegador, então nenhum teste
   tropeçava: a Central só quebrou na tela, em "Meus itens" ("FIELDS_ITEMS is
   not defined") e em Produtos. Este teste pega o nome solto. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('cada FIELDS_* usado no app.js está declarado', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');
  const usados = new Set(src.match(/\bFIELDS_[A-Z_]+\b/g) || []);
  const declarados = new Set([...src.matchAll(/\bconst (FIELDS_[A-Z_]+)\s*=/g)].map((m) => m[1]));
  const soltos = [...usados].filter((n) => !declarados.has(n));
  assert.deepStrictEqual(soltos, [], 'usado sem declaração: ' + soltos.join(', '));
});

/* O selo "conectado" só quando algo chegou (15/10/2026). Token vencido que
   volta como falha de rede (redirecionamento pro login) deixava o selo verde
   embaixo da mensagem vermelha de PAT vencido. */
test('o selo não diz conectado quando nenhuma consulta deu certo', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');
  assert.match(src, /if \(algumSucesso\) state\.auth = 'conectado';/);
  assert.match(src, /navigator\.onLine === false\) \? 'offline' : 'vencido'/);
  // E ao abrir com cache fresco, herda o resultado da última tentativa.
  assert.match(src, /const ultimaFalhou = !!state\.cache\.fetchedAt && \(state\.cache\.lastSuccessAt \|\| 0\) < state\.cache\.fetchedAt;/);
  assert.doesNotMatch(src, /if \(state\.auth === 'atualizando'\) state\.auth = 'conectado';/);
});
