/* Os cartões saíram do código e viraram arquivo, um por PO. Os testes leem a
   mesma fonte que o app lê, pelo mesmo saneador — ler de outro lugar seria
   testar um conteúdo que ninguém desenha.

   Não é `.test.js` de propósito: é ajuda, não suíte. */
const fs = require('node:fs');
const path = require('node:path');
const C = require('../assets/core.js');

const raiz = path.join(__dirname, '..');

function cartoesDe(po, edicao) {
  const arq = path.join(raiz, 'assets/conteudo', po, 'edicoes', edicao + '.json');
  if (!fs.existsSync(arq)) return [];
  return C.saneEdicao(JSON.parse(fs.readFileSync(arq, 'utf8'))).cartoes;
}

module.exports = { cartoesDe };
