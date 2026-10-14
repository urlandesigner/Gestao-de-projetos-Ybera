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

/* O roadmap CRU de uma PO (antes do saneamento) — alguns testes conferem o
   arquivo como ele está escrito, e o saneamento é testado à parte. Sem
   arquivo, null: é o que o app trata como "essa PO não tem roadmap". */
function roadmapCruDe(po) {
  const arq = path.join(raiz, C.caminhoDoConteudo(po, 'roadmap.json'));
  if (!fs.existsSync(arq)) return null;
  return JSON.parse(fs.readFileSync(arq, 'utf8')).itens || [];
}

/* Todas as POs que têm pasta de conteúdo — o portão de status tem que valer
   pra quem entrar depois, não só pra quem existe hoje. */
function posComConteudo() {
  return fs.readdirSync(path.join(raiz, 'assets/conteudo'), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);
}

module.exports = { cartoesDe, roadmapCruDe, posComConteudo };
