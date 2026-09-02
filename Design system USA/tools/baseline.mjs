#!/usr/bin/env node
/* =========================================================================
   YBERA DESIGN SYSTEM · COMPARADOR DE LAYOUT

   Le os retratos gravados (test/baseline.json) e os recem-capturados
   (test/atual.json) e diz o que mudou de tamanho, cor ou fonte.

   Tolerancia de 2px de proposito: fonte web carrega em tempo diferente e
   arredondamento de subpixel varia. Abaixo disso e ruido; acima e alguem
   mexendo em layout sem perceber.

   Fluxo:
     node tools/baseline.mjs            → compara atual contra a base
     node tools/baseline.mjs --aceitar  → promove o atual a nova base
   ========================================================================= */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(raiz, 'test/baseline.json');
const ATUAL = join(raiz, 'test/atual.json');
const TOLERANCIA = 2;

const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const vermelho = (t) => `\x1b[31m${t}\x1b[0m`;
const cinza = (t) => `\x1b[90m${t}\x1b[0m`;

if (!existsSync(ATUAL)) {
  console.error(vermelho('test/atual.json não existe.'));
  console.error(cinza('Cole test/layout.js no console da página e salve o retorno ali.'));
  process.exit(2);
}
const atual = JSON.parse(readFileSync(ATUAL, 'utf8'));
const lista = Array.isArray(atual) ? atual : [atual];

if (process.argv.includes('--aceitar')) {
  writeFileSync(BASE, JSON.stringify(lista, null, 2) + '\n');
  const pecas = lista.reduce((n, r) => n + r.pecas, 0);
  console.log(verde(`base atualizada · ${lista.length} retrato(s) · ${pecas} peças`));
  process.exit(0);
}

if (!existsSync(BASE)) {
  console.error(vermelho('test/baseline.json não existe.'));
  console.error(cinza('Rode com --aceitar para gravar a primeira base.'));
  process.exit(2);
}
const base = JSON.parse(readFileSync(BASE, 'utf8'));

const idDe = (r) => `${r.pagina}@${r.largura}`;
const porId = (arr) => Object.fromEntries(arr.map((r) => [idDe(r), r]));
const B = porId(base), A = porId(lista);

let mudancas = 0, sumiram = 0, nasceram = 0;
const linhas = [];

for (const id of Object.keys(A)) {
  const a = A[id], b = B[id];
  if (!b) { linhas.push(cinza(`  ~ ${id} — retrato novo, sem base para comparar`)); continue; }

  if (Math.abs(a.documento - b.documento) > TOLERANCIA) {
    mudancas++;
    linhas.push(vermelho(`  ✗ ${id} · largura do documento ${b.documento} → ${a.documento}`) +
      (a.documento > a.largura ? vermelho('  ESTOURA A TELA') : ''));
  }

  for (const chave of Object.keys(b.itens)) {
    if (!a.itens[chave]) { sumiram++; linhas.push(vermelho(`  ✗ ${id} · sumiu  ${chave}`)); }
  }
  for (const chave of Object.keys(a.itens)) {
    const x = a.itens[chave], y = b.itens[chave];
    if (!y) { nasceram++; linhas.push(cinza(`  + ${id} · nasceu ${chave}`)); continue; }
    const dif = [];
    if (Math.abs(x.w - y.w) > TOLERANCIA) dif.push(`largura ${y.w}→${x.w}`);
    if (Math.abs(x.h - y.h) > TOLERANCIA) dif.push(`altura ${y.h}→${x.h}`);
    if (Math.abs(x.fs - y.fs) > 0) dif.push(`fonte ${y.fs}→${x.fs}`);
    if (x.cor !== y.cor) dif.push(`cor ${y.cor}→${x.cor}`);
    if (x.fundo !== y.fundo) dif.push(`fundo ${y.fundo}→${x.fundo}`);
    if (x.estoura !== y.estoura) dif.push(x.estoura ? 'PASSOU A ESTOURAR' : 'parou de estourar');
    if (dif.length) { mudancas++; linhas.push(vermelho(`  ✗ ${id} · ${chave}`) + `\n      ${dif.join(' · ')}`); }
  }
}
for (const id of Object.keys(B)) if (!A[id]) linhas.push(cinza(`  ~ ${id} — não foi capturado desta vez`));

console.log('');
console.log('Layout · comparação com a base');
console.log('─'.repeat(56));
if (linhas.length) linhas.forEach((l) => console.log(l));

const pecas = lista.reduce((n, r) => n + r.pecas, 0);
const resumo = `${lista.length} retrato(s) · ${pecas} peças · ${mudancas} mudança(s) · ${sumiram} sumiço(s) · ${nasceram} nova(s)`;
console.log('─'.repeat(56));

if (mudancas || sumiram) {
  console.log(vermelho(`MUDOU — ${resumo}`));
  console.log(cinza('Se a mudança é intencional: node tools/baseline.mjs --aceitar'));
  process.exit(1);
}
console.log(verde(`SEM DERIVA — ${resumo}`));
