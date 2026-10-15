#!/usr/bin/env node
/* Põe as linhas do assets/resumos.json dentro do pacote que o botão "Publicar
 * dados" baixou, e TIRA o bloco `_descricoes`.
 *
 * Existe por uma questão de ordem. O navegador monta o pacote com os resumos
 * que já existiam no momento do clique; as PBIs novas, por definição, ainda não
 * tinham resumo nenhum. Sem este passo seria preciso publicar de novo depois de
 * escrever as linhas — dois cliques pra uma coisa só, e a chance de alguém
 * publicar o do meio.
 *
 * Casa por `_descricoes` (que traz o id) e, no que sobrar, por sprint + título.
 * Título repetido dentro da mesma sprint não é adivinhado: avisa e deixa sem
 * resumo, porque pôr a linha errada embaixo do título errado é pior que não pôr.
 *
 * Uso:  node scripts/aplicar-resumos.js [caminho-do-pacote]
 *       sem argumento, usa ~/Downloads/<nome declarado pelo documento>
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const raiz = path.join(__dirname, '..');
const resumos = JSON.parse(fs.readFileSync(path.join(raiz, 'assets/resumos.json'), 'utf8')).itens || {};

/* SEM ARGUMENTO, procura o pacote em ~/Downloads. Até 15/10/2026 o nome vinha
   de uma constante do briefing (`ARQUIVO_DE_DADOS`), que deixou de existir
   quando as edições passaram a se montar pela data — e o script passou a
   abrir a PASTA Downloads como se fosse o arquivo (EISDIR). Agora: um único
   `dados-*.json` lá dentro é o pacote; mais de um, lista e pede o caminho.
   Cópias que o navegador numera ("dados-outubro (2).json") ficam de fora,
   como no publicar-dados.sh. */
function pacoteEmDownloads() {
  const pasta = path.join(os.homedir(), 'Downloads');
  let nomes = [];
  try { nomes = fs.readdirSync(pasta).filter((n) => /^dados-[a-z0-9-]+\.json$/.test(n)); } catch (e) { return null; }
  if (nomes.length === 1) return path.join(pasta, nomes[0]);
  if (nomes.length > 1) {
    console.error('achei mais de um pacote em ~/Downloads; passe o caminho de um deles:');
    for (const n of nomes) console.error('  ' + path.join(pasta, n));
    process.exit(1);
  }
  return null;
}

const alvo = process.argv[2] || pacoteEmDownloads();
if (!alvo || !fs.existsSync(alvo) || !fs.statSync(alvo).isFile()) {
  console.error('não achei o pacote' + (alvo ? ': ' + alvo : ' em ~/Downloads'));
  console.error('abra o relatório com ?po=1 e clique em "Publicar dados" primeiro.');
  process.exit(1);
}

const pacote = JSON.parse(fs.readFileSync(alvo, 'utf8'));
const sprints = Array.isArray(pacote.sprints) ? pacote.sprints : [];

// sprint + título → o item, pra casar o que não vier por id.
const porChave = new Map();
const repetidos = new Set();
for (const s of sprints) {
  for (const lista of [s.itens, s.transbordados]) {
    for (const it of (lista || [])) {
      const k = s.nome + '\u0000' + it.titulo;
      if (porChave.has(k)) repetidos.add(k);
      porChave.set(k, it);
    }
  }
}

let postos = 0;
const semResumo = [];
const ambiguos = [];
for (const d of (pacote._descricoes || [])) {
  const e = resumos[String(d.id)];
  if (!e || !e.resumo) { semResumo.push(d.id); continue; }
  const k = d.sprint + '\u0000' + d.titulo;
  if (repetidos.has(k)) { ambiguos.push(d.id); continue; }
  const it = porChave.get(k);
  if (!it) { semResumo.push(d.id); continue; }
  it.resumo = e.resumo;
  postos += 1;
}

/* TODO bloco local sai SEMPRE, mesmo que algum item tenha ficado sem linha: é
   material de trabalho, e o portão do publicar-dados.sh existe pra que ele
   nunca alcance o ar. Item sem linha fica só com o título, que é a verdade.

   Por PREFIXO e não por nome: o `_entregas`, que carrega o material pra
   escrever os cartões, nasceu depois do `_descricoes` — e a próxima chave que
   alguém criar também vai nascer depois deste arquivo. Lista de nomes fica
   velha calada; prefixo não. */
const locais = Object.keys(pacote).filter((k) => k.startsWith('_'));
for (const k of locais) delete pacote[k];
fs.writeFileSync(alvo, JSON.stringify(pacote, null, 1) + '\n');

console.log(`resumos aplicados: ${postos}`);
if (semResumo.length) console.log(`sem linha no resumos.json: ${semResumo.join(', ')}`);
if (ambiguos.length) {
  console.log(`título repetido na mesma sprint, não adivinhei: ${ambiguos.join(', ')}`);
}
const comResumo = [...porChave.values()].filter((x) => x.resumo).length;
console.log(`no pacote: ${comResumo} de ${porChave.size} itens com resumo`);
console.log(`blocos locais removidos (${locais.join(', ') || 'nenhum'}) — o pacote está pronto pra publicar.`);
