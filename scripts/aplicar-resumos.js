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

/* O nome do arquivo é LIDO do módulo da edição, nunca repetido aqui: duas
   cópias divergem na primeira vez que uma edição virar outro mês. */
function destinoDeclarado() {
  const fonte = fs.readFileSync(path.join(raiz, 'assets/briefing-entregas-v2.js'), 'utf8');
  const m = /ARQUIVO_DE_DADOS = '([^']+)'/.exec(fonte);
  return m ? path.basename(m[1]) : null;
}

const alvo = process.argv[2] || path.join(os.homedir(), 'Downloads', destinoDeclarado() || '');
if (!alvo || !fs.existsSync(alvo)) {
  console.error('não achei o pacote: ' + alvo);
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

/* O bloco sai SEMPRE, mesmo que algum item tenha ficado sem linha: ele é
   material local, e o portão do publicar-dados.sh existe pra que ele nunca
   alcance o ar. Item sem linha fica só com o título, que é a verdade. */
delete pacote._descricoes;
fs.writeFileSync(alvo, JSON.stringify(pacote, null, 1) + '\n');

console.log(`resumos aplicados: ${postos}`);
if (semResumo.length) console.log(`sem linha no resumos.json: ${semResumo.join(', ')}`);
if (ambiguos.length) {
  console.log(`título repetido na mesma sprint, não adivinhei: ${ambiguos.join(', ')}`);
}
const comResumo = [...porChave.values()].filter((x) => x.resumo).length;
console.log(`no pacote: ${comResumo} de ${porChave.size} itens com resumo`);
console.log('bloco _descricoes removido — o pacote está pronto pra publicar.');
