#!/usr/bin/env node
/* ===========================================================================
   QUEM USA CADA TOKEN — o índice invertido, derivado a cada build.

   A doc ja respondia a pergunta de um lado: toda ficha lista os tokens da
   familia dela. O outro lado nao tinha resposta — "quem usa `--yb-action-bg`?"
   so se respondia com grep, e e essa a pergunta que se faz ANTES de mexer num
   token. Sem ela, mudar um valor e apostar.

   A CADEIA CONTA, e nao so o consumo direto. `--yb-gray-200` nao aparece em
   folha de componente nenhuma, mas alimenta `--yb-border`, que aparece em
   vinte. Contando so o consumo direto, metade da paleta apareceria morta
   sustentando o sistema inteiro — e um numero que mente e pior que numero
   nenhum. Entao o primitivo herda os consumidores do semantico que o consome,
   recursivamente.

   ATRIBUICAO POR REGRA: um token pertence a toda familia que aparece no
   seletor da regra que o consome. Em `.yb-nav .yb-icon{color:var(--yb-gold)}`
   o dourado conta para as duas, porque mexer nele mexe nas duas.

   Uso:  importado por tools/moldura.mjs (anota as paginas de token)
         node tools/tokens-uso.mjs   → imprime o mapa, para conferir a olho
   =========================================================================== */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NIVEIS, folhaDo } from './escada.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const semComentario = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* ------------------------------------------------- 1. consumo direto
   Um passo de regra por vez: o seletor da as familias, o corpo da os tokens.
   A expressao nao entra em `@media` — o corpo de um at-rule tem chaves dentro,
   entao ele nao casa, e as regras de dentro casam sozinhas. E o que se quer:
   o que importa e a regra, nao o envelope dela. */
function consumoDireto() {
  const mapa = new Map();            // token -> Set(familia)
  for (const n of NIVEIS) {
    const css = semComentario(ler(folhaDo(n)));
    for (const [, sel, corpo] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const familias = new Set([...sel.matchAll(/\.(yb-[a-z0-9]+)/g)].map((m) => m[1]));
      if (!familias.size) continue;
      for (const [, tok] of corpo.matchAll(/var\(\s*(--yb-[\w-]+)/g)) {
        if (!mapa.has(tok)) mapa.set(tok, new Set());
        for (const f of familias) mapa.get(tok).add(f);
      }
    }
  }
  return mapa;
}

/* ------------------------------------------------- 2. a cadeia de alias
   `--yb-border: var(--yb-gray-200)` cria a aresta gray-200 -> border: quem
   consome `border` consome `gray-200` sem saber o nome dele. */
function alimenta() {
  const arestas = new Map();         // token -> Set(token que o consome)
  for (const f of ['tokens/00-primitives.css', 'tokens/01-semantic.css']) {
    if (!existsSync(join(raiz, f))) continue;
    for (const [, alvo, valor] of semComentario(ler(f))
      .matchAll(/(--yb-[\w-]+)\s*:([^;]*);/g)) {
      for (const [, fonte] of valor.matchAll(/var\(\s*(--yb-[\w-]+)/g)) {
        if (fonte === alvo) continue;
        if (!arestas.has(fonte)) arestas.set(fonte, new Set());
        arestas.get(fonte).add(alvo);
      }
    }
  }
  return arestas;
}

/* ------------------------------------------------- 3. propagacao
   Memoizada, com guarda de ciclo: um alias que voltasse para si mesmo (por
   engano ou por um `@media` que redefine) travaria a recursao, e o build
   morreria sem dizer por que. Aqui ele so nao soma nada. */
export function mapaDeUso() {
  const direto = consumoDireto();
  const arestas = alimenta();
  const cache = new Map();
  const visitando = new Set();

  const resolver = (tok) => {
    if (cache.has(tok)) return cache.get(tok);
    if (visitando.has(tok)) return new Set();
    visitando.add(tok);
    const fora = new Set(direto.get(tok) || []);
    for (const acima of arestas.get(tok) || [])
      for (const f of resolver(acima)) fora.add(f);
    visitando.delete(tok);
    cache.set(tok, fora);
    return fora;
  };

  const todos = new Set([...direto.keys(), ...arestas.keys()]);
  for (const f of ['tokens/00-primitives.css', 'tokens/01-semantic.css'])
    if (existsSync(join(raiz, f)))
      for (const [, t] of semComentario(ler(f)).matchAll(/^\s*(--yb-[\w-]+)\s*:/gm)) todos.add(t);

  const fora = new Map();
  for (const t of todos) fora.set(t, resolver(t));
  return fora;
}

/* ------------------------------------------------- 4. familia -> ficha
   Lido da ficha JA GERADA: ela publica a classe base em voz alta, e e esse o
   contrato. Se `tools/fichas.mjs` mudar essa marcacao, o mapa sai vazio — e
   por isso o build para aqui em vez de publicar uma pagina com a lista muda. */
export function fichaPorFamilia() {
  const mapa = new Map();
  for (const n of NIVEIS) {
    const dir = join(raiz, n.dir);
    if (!existsSync(dir)) continue;
    for (const arq of readdirSync(dir)) {
      if (!arq.endsWith('.html') || arq === 'index.html' || arq === 'solo.html') continue;
      const html = ler(`${n.dir}/${arq}`);
      const base = html.match(/Classe base <b><code>\.(yb-[a-z0-9]+)/);
      const titulo = html.match(/<h1 class="ficha-titulo">([\s\S]*?)<\/h1>/);
      if (!base || !titulo) continue;
      // Duas fichas podem dividir a classe base (Checkbox e Radio dividiam;
      // Input, Select e Textarea dividem a caixa). A primeira em ordem
      // alfabetica fica com o link, e e melhor assim do que listar a familia
      // duas vezes na mesma linha.
      if (!mapa.has(base[1]))
        mapa.set(base[1], { titulo: titulo[1].trim(), href: `../${n.dir}/${arq}` });
    }
  }
  if (!mapa.size)
    throw new Error('tokens-uso.mjs: nenhuma ficha publicou classe base — '
      + 'a marcacao de tools/fichas.mjs mudou, e o indice sairia vazio');
  return mapa;
}

/* ------------------------------------------------- 5. a anotacao no fragmento
   So o `<code>` que ROTULA uma amostra, e nao o que aparece no meio de um
   paragrafo: a pagina de cor cita `--yb-success-text` na prosa para explicar
   o alias, e pendurar uma lista de consumidores ali seria ruido dentro de uma
   frase. A regra e "fora de <p>", medida: pega as 120 entradas das oito
   paginas e deixa de fora as 5 mencoes de prosa.

   `<details>` nativo, e nao um painel nosso: teclado, leitor de tela e o
   Ctrl+F do navegador funcionam sem uma linha de JS — a mesma escolha que o
   acordeao e a coluna de navegacao ja fazem. */
export function anotarUso(palco, { uso = null, fichas = null } = {}) {
  const mapaUso = uso || mapaDeUso();
  const mapaFicha = fichas || fichaPorFamilia();

  /* Apaga o CONTEUDO dos <p> preservando o comprimento: os indices continuam
     valendo sobre o original, e as tags de dentro somem junto, entao a pilha
     abaixo nao desequilibra. */
  const mascara = palco.replace(/<p\b[\s\S]*?<\/p>/g, (m) => ' '.repeat(m.length));

  /* A ANOTACAO ENTRA NO FIM DA AMOSTRA, e nao colada no nome do token.

     Cada pagina desenha a amostra do seu jeito: a escala de espaco e uma grade
     de tres colunas (nome, barra, valor), a rampa de cor poe hex, contraste e
     nota em linha, o raio empilha caixa, nome e valor. Emendar logo depois do
     `<code>` funcionava em umas e quebrava outras — na escala de espaco a
     anotacao entrava ENTRE o nome e a barra e empurrava o valor para a linha
     de baixo. Achar o fim do elemento que contem o `<code>` e a unica regra
     que serve para as tres formas, e de quebra poe a leitura na ordem certa:
     nome, valor, e so entao quem usa.

     Pilha de tags, com os vazios de fora — `<img>` e `<input>` nao fecham, e
     empilha-los faria o fim da amostra cair no lugar errado. */
  const VAZIOS = new Set(['br', 'img', 'input', 'link', 'meta', 'hr', 'source',
                          'use', 'path', 'circle', 'rect', 'area', 'col', 'embed', 'track', 'wbr']);
  const pilha = [];
  const pendentes = new Map();   // indice do <;/tag> que fecha a amostra -> token
  let ultimoCode = null;

  for (const m of mascara.matchAll(/<(\/?)([a-z0-9]+)\b[^>]*?(\/?)>/gi)) {
    const [bruto, barra, tag, sozinho] = m;
    const nome = tag.toLowerCase();
    if (sozinho || VAZIOS.has(nome)) continue;
    if (!barra) {
      pilha.push({ nome, dono: null });
      if (nome === 'code') {
        const dentro = mascara.slice(m.index + bruto.length,
          mascara.indexOf('<', m.index + bruto.length));
        const tok = dentro.match(/^(--yb-[\w-]+)$/);
        ultimoCode = tok ? tok[1] : null;
      }
      continue;
    }
    const aberto = pilha.pop();
    if (!aberto) continue;
    if (aberto.nome === 'code' && ultimoCode) {
      // a amostra e quem CONTEM o <code>; sem pai, anota logo depois dele
      const pai = pilha[pilha.length - 1];
      if (pai) pai.dono = ultimoCode;
      else pendentes.set(m.index + bruto.length, ultimoCode);
      ultimoCode = null;
      continue;
    }
    if (aberto.dono) pendentes.set(m.index, aberto.dono);
  }

  let fora = '', cursor = 0;
  for (const corte of [...pendentes.keys()].sort((a, b) => a - b)) {
    fora += palco.slice(cursor, corte) + bloco(pendentes.get(corte), mapaUso, mapaFicha);
    cursor = corte;
  }
  return fora + palco.slice(cursor);
}

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function bloco(token, mapaUso, mapaFicha) {
  const familias = [...(mapaUso.get(token) || [])]
    .map((f) => ({ fam: f, ficha: mapaFicha.get(f) }))
    .filter((x) => x.ficha)
    .sort((a, b) => a.ficha.titulo.localeCompare(b.ficha.titulo, 'pt'));

  /* "sem classe consumidora", e nao "sem consumidor": este indice responde
     por CLASSE de componente, que foi a pergunta. Ha token que so a folha de
     base, a doc ou o `style=` de uma tela consomem — `--yb-font-family-base` e
     um —, e chama-lo de orfao aqui contradiria a checagem de orfao do
     validador, que olha uma lista bem mais larga. Degrau de rampa nao usado
     tambem cai aqui, e ali a frase e a verdade inteira: e vocabulario. */
  if (!familias.length)
    return '<span class="uso uso--zero">sem classe consumidora</span>';

  const n = familias.length;
  return `<details class="uso"><summary>${n} componente${n > 1 ? 's' : ''}</summary>`
    + `<ul class="uso__lista">`
    + familias.map((x) =>
      `<li><a href="${x.ficha.href}">${escapar(x.ficha.titulo)}</a> <code>.${x.fam}</code></li>`).join('')
    + `</ul></details>`;
}

/* ------------------------------------------------------------- na mao */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const uso = mapaDeUso();
  const fichas = fichaPorFamilia();
  const linhas = [...uso.entries()]
    .map(([t, fs]) => [t, [...fs].filter((f) => fichas.has(f))])
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const semNinguem = linhas.filter(([, fs]) => !fs.length);
  console.log(`${linhas.length} tokens · ${fichas.size} famílias com ficha\n`);
  for (const [t, fs] of linhas.slice(0, 20))
    console.log(`  ${t.padEnd(34)} ${String(fs.length).padStart(3)}  ${fs.slice(0, 5).join(', ')}`);
  console.log(`\n  … e ${semNinguem.length} token(s) sem nenhum consumidor com ficha`);
}
