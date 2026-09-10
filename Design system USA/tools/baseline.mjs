#!/usr/bin/env node
/* =========================================================================
   YBERA DESIGN SYSTEM · COMPARADOR DE LAYOUT

   Le os retratos gravados (test/baseline.json) e os recem-capturados
   (test/atual.json) e diz o que mudou de tamanho, cor ou fonte.

   Tolerancia de 2px de proposito: fonte web carrega em tempo diferente e
   arredondamento de subpixel varia. Abaixo disso e ruido; acima e alguem
   mexendo em layout sem perceber.

   LIMITACAO CONHECIDA — os retratos sao das telas-prova, e as telas-prova sao
   montadas com dados AO VIVO da loja (dados.py busca o catalogo). Trocar o
   titulo de um produto na loja muda a quebra de linha do cartao, e a rede
   acusa deriva de layout que nao existe: aconteceu em 02/09/2026, quando
   "FASHION GOLD - Brazilian Keratin Treatment, Smoothing and Straightening
   System" virou "Deep Care Hair Kit | FREE 1L Shampoo" e os cartoes encolheram
   19px em 768.

   Enquanto nao houver fixture de dados, a leitura correta e: deriva SO em
   cartao de produto provavelmente e o catalogo — confira o titulo antes de
   caçar bug no CSS. Deriva em qualquer outra peca e sua.

   Fluxo (com ./serve.sh no ar):
     1. no console da pagina, uma vez por largura, esperando a fonte e ~700ms
        depois de mudar a largura (ver a nota em test/layout.js — sem isso a
        gaveta em transicao e a fonte de reserva entram no retrato):
          await document.fonts.ready;
          await new Promise(r => setTimeout(r, 700));
          const src = await fetch('/test/layout.js').then(r => r.text());
          (window.__r = window.__r || []).push(eval(src));
     2. no fim, uma vez so:
          await fetch('/__retrato', {method:'POST', body: JSON.stringify(window.__r)});
        o servidor grava test/atual.json. Antes era copiar 60 KB de JSON do
        console na mao — e por isso a rede quase nunca era recapturada.
     3. node tools/baseline.mjs            → compara atual contra a base
        node tools/baseline.mjs --aceitar  → promove o atual a nova base
   ========================================================================= */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(raiz, 'test/baseline.json');
const ATUAL = join(raiz, 'test/atual.json');
const TOLERANCIA = 2;

const idDeSimples = (r) => `${r.pagina}@${r.largura}`;
const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const vermelho = (t) => `\x1b[31m${t}\x1b[0m`;
const cinza = (t) => `\x1b[90m${t}\x1b[0m`;

if (!existsSync(ATUAL)) {
  console.error(vermelho('test/atual.json não existe.'));
  console.error(cinza('Capture no navegador e faça POST em /__retrato — ver o cabeçalho deste arquivo.'));
  process.exit(2);
}
const atual = JSON.parse(readFileSync(ATUAL, 'utf8'));
const lista = Array.isArray(atual) ? atual : [atual];

// Retrato tirado com a fonte ainda carregando mede a fonte de RESERVA, que
// quebra linha em outro lugar: um cartao de produto muda 19px de altura e a
// comparacao acusa deriva que nao existe. Melhor recusar o retrato do que
// gravar uma base errada — e --aceitar precisa recusar junto, senao a base
// passa a ser a medida da fonte errada.
const semFonte = lista.filter((r) => r.fontes && r.fontes !== 'loaded');
if (semFonte.length) {
  console.error(vermelho('retrato tirado antes da fonte carregar:'));
  for (const r of semFonte) console.error(cinza(`  ${idDeSimples(r)} — fontes: ${r.fontes}`));
  console.error(cinza('Refaça com `await document.fonts.ready` antes de capturar.'));
  process.exit(2);
}

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
