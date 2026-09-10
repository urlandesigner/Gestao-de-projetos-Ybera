#!/usr/bin/env node
/* ===========================================================================
   FICHAS DE COMPONENTE — uma pagina por peca, gerada.

   POR QUE GERADA: a ficha e o artefato que mais apodrece depois da matriz de
   completude. Alguem escreve "modificadores: --primary, --secondary, --ghost"
   a mao, o sistema ganha `--on-dark` seis meses depois, e a ficha passa a
   mentir com a autoridade de documentacao oficial. Aqui a metade factual
   (classe base, elementos, modificadores, estados, tokens, marcacao) e LIDA
   da folha a cada build. Se a ficha esta errada, o errado e o codigo.

   O que a maquina NAO sabe: por que usar, o que exige de acessibilidade e o
   que nao fazer. Isso mora em components/fichas.json, escrito a mao, e a
   ficha declara em voz alta o que ainda nao foi escrito — bloco pendente
   aparece como pendente, nunca some.

   Uso:  node tools/fichas.mjs          → escreve components/<id>.html
         node tools/fichas.mjs --check  → sai 1 se alguma ficha estiver defasada
   =========================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');

const folha = ler('components/ybera-components.css');
const html = ler('components/index.html');
const js = ler('components/ybera-components.js');
const escrito = existsSync(join(raiz, 'components/fichas.json'))
  ? JSON.parse(ler('components/fichas.json')) : {};

const versao = (ler('package.json').match(/"version":\s*"([^"]+)"/) || [, '0.0.0'])[1];

/* --------------------------------------------------------- 1. as secoes
   A doc e a fonte do que cada componente MOSTRA. Cada <section id> vira uma
   ficha, com as mesmas demos — nao versoes novas: duas marcacoes para o mesmo
   componente divergem, e ai a doc contradiz a doc. */
const secoes = [];
for (const m of html.matchAll(/\n  <section id="([^"]+)">([\s\S]*?)\n  <\/section>/g)) {
  const [, id, corpo] = m;
  const titulo = (corpo.match(/<h2>([\s\S]*?)<\/h2>/) || [, id])[1].trim();
  const quando = (corpo.match(/<p class="when">([\s\S]*?)<\/p>/) || [, ''])[1].trim();
  // O palco comeca depois do preambulo da secao: o `.when`, que vira a linha
  // de abertura da ficha, e o link "Ficha completa" — que dentro da propria
  // ficha apontaria para ela mesma.
  let corte = corpo.indexOf('</p>', corpo.indexOf('class="when"'));
  const linkFicha = corpo.indexOf('class="ficha-link"');
  if (linkFicha !== -1) corte = corpo.indexOf('</p>', corpo.indexOf('</a>', linkFicha));
  const palco = corte === -1 ? corpo : corpo.slice(corte + 4);
  secoes.push({ id, titulo, quando, palco: palco.trim() });
}

/* ------------------------------------------------- 2. a familia de classes
   Mesma leitura do tools/inventario.mjs. Se as duas divergirem, a matriz e a
   ficha contam historias diferentes sobre o mesmo arquivo. */
const familiaDe = (corpo) => {
  const conta = new Map();
  for (const m of corpo.matchAll(/(^|[,}])\s*\.(yb-[a-z0-9]+)(?![\w-]*\s*\()/gm))
    conta.set(m[2], (conta.get(m[2]) || 0) + 1);
  for (const m of corpo.matchAll(/(^|[,}])\s*\.(yb-[a-z0-9]+)(__|--)/gm))
    conta.set(m[2], (conta.get(m[2]) || 0) + 2);
  return [...conta.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
};

// A base de uma secao da doc sai da marcacao dela, sem mapa escrito a mao —
// mapa e mais uma coisa para desatualizar.
//
// Frequencia crua nao basta. A secao Link tem mais `yb-icon` do que `yb-link`
// (todo link de exemplo leva um icone), e a secao Toast tem mais `yb-btn` do
// que `yb-toast` (o toast nasce de um clique, entao a demo e feita de botoes).
// As duas apontavam para a familia errada.
//
// O desempate e ESPECIFICIDADE: uma familia que aparece em vinte secoes e
// vocabulario comum da doc, nao o assunto desta. Divide-se a contagem local
// pelo numero de secoes em que a familia aparece.
const contarFamilias = (palco) => {
  const conta = new Map();
  for (const m of palco.matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/)) {
      const raiz = (c.match(/^(yb-[a-z0-9]+)(?:__|--|$)/) || [])[1];
      if (raiz) conta.set(raiz, (conta.get(raiz) || 0) + 1);
    }
  return conta;
};
const espalhamento = new Map();
for (const s of secoes)
  for (const fam of contarFamilias(s.palco).keys())
    espalhamento.set(fam, (espalhamento.get(fam) || 0) + 1);

// Familias que a folha declara, para a regra de convencao abaixo.
const naFolha = new Set(
  [...folha.matchAll(/\.(yb-[a-z0-9]+)(?:__|--|[\s,:{])/g)].map((m) => m[1])
);

const baseDaSecao = (id, palco) => {
  const conta = contarFamilias(palco);
  // Convencao de nome, e so quando a marcacao NAO ajuda. O Toast nao aparece
  // na propria secao — ele nasce de um clique, entao a demo e feita de BOTOES
  // e qualquer contagem aponta para `yb-btn`. Ai o nome da secao resolve.
  //
  // Quando a familia ESTA na marcacao, quem manda e a contagem: em Seals o
  // nome da secao apontaria para o container `.yb-seals`, e a peca e o selo.
  // Divergir do INVENTARIO.md sobre qual e a classe base seria as duas
  // ferramentas contando historias diferentes sobre o mesmo arquivo.
  if (!conta.has('yb-' + id) && naFolha.has('yb-' + id)) return 'yb-' + id;
  return [...conta.entries()]
    .map(([fam, n]) => [fam, n / espalhamento.get(fam)])
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
};

/* ------------------------------------------------------- 3. a API na folha */
const semComentario = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

function apiDe(base) {
  if (!base) return { elementos: [], modificadores: [], estados: [], tokens: [] };
  const corpo = semComentario(folha);
  const el = new Set(), mod = new Set(), est = new Set(), tok = new Set();
  const alcance = new RegExp(`\\.${base}(?:__[a-z0-9-]+|--[a-z0-9-]+)?\\b`, 'g');
  for (const m of corpo.matchAll(new RegExp(`\\.${base}__([a-z0-9-]+)`, 'g'))) el.add(`${base}__${m[1]}`);
  for (const m of corpo.matchAll(new RegExp(`\\.${base}--([a-z0-9-]+)`, 'g'))) mod.add(`${base}--${m[1]}`);
  // estados e tokens so das regras que MENCIONAM a familia
  for (const regra of corpo.split('}')) {
    if (!alcance.test(regra)) { alcance.lastIndex = 0; continue; }
    alcance.lastIndex = 0;
    const sel = regra.slice(0, regra.indexOf('{') === -1 ? regra.length : regra.indexOf('{'));
    for (const m of sel.matchAll(/:(hover|focus-visible|active|checked|disabled|invalid)\b/g)) est.add(':' + m[1]);
    for (const m of sel.matchAll(/\[((?:aria-|data-)?[a-z-]+)(?:[~^|*$]?=)?/g)) {
      const a = m[1];
      if (/^(aria-|data-yb-)/.test(a) || ['disabled', 'hidden', 'open', 'checked'].includes(a)) est.add(`[${a}]`);
    }
    for (const m of regra.matchAll(/var\(\s*(--yb-[\w-]+)/g)) tok.add(m[1]);
  }
  const ord = (s) => [...s].sort();
  return { elementos: ord(el), modificadores: ord(mod), estados: ord(est), tokens: ord(tok) };
}

/* ------------------------------------------------------------ 4. snippet
   Sai da PRIMEIRA demo da secao, nao de um exemplo escrito a parte: a doc
   mostrando uma marcacao e o codigo entregando outra e o defeito classico de
   ficha de componente. */
function snippetDe(palco) {
  const m = palco.match(/<div class="demo[^"]*">([\s\S]*?)\n?\s*<\/div>\s*(?=<h3|<div class="note"|<div class="demo|$)/);
  if (!m) return '';
  let corpo = m[1].replace(/<iframe[\s\S]*?<\/iframe>/g, '').trimEnd();
  const linhas = corpo.split('\n').filter((l) => l.trim());
  if (!linhas.length) return '';
  const menor = Math.min(...linhas.map((l) => l.match(/^\s*/)[0].length));
  return linhas.map((l) => l.slice(menor)).join('\n');
}

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------- 5. montar */
const fichas = secoes.map((s) => {
  const base = baseDaSecao(s.id, s.palco);
  return { ...s, base, api: apiDe(base), snippet: snippetDe(s.palco), texto: escrito[s.id] || {} };
});

const navHtml = fichas
  .map((f) => `    <li><a href="${f.id}.html"{ATUAL-${f.id}}>${f.titulo}</a></li>`)
  .join('\n');

// Lista de codigo, e nao tabela: uma tabela de UMA coluna promete colunas que
// nao existem. A descricao de cada modificador nao esta na folha de forma
// legivel por maquina — inventa-la aqui seria escrever documentacao a mao
// dentro do gerador, que e exatamente o que este arquivo existe para evitar.
const linhaApi = (itens, vazio) =>
  itens.length
    ? `<p class="lista-api">${itens.map((c) => `<code>.${c}</code>`).join(' ')}</p>`
    : `<p class="api-vazia">${vazio}</p>`;

const blocoFN = (t) => {
  if (!t.faca && !t.naoFaca) {
    return `<p class="pendente">Faça / não faça ainda não escrito para este componente.
      O bloco aparece vazio de propósito: seção que some da ficha é uma pergunta
      que ninguém sabe que ficou sem resposta.</p>`;
  }
  const caso = (lado, d) => `
      <div class="fn-caso fn-caso--${lado}">
        <p class="fn-cabeca">${lado === 'sim' ? '✓ Faça' : '✕ Não faça'}</p>
        <div class="fn-palco${d.dark ? ' fn-palco--dark' : ''}">${d.html}</div>
        <p class="fn-legenda">${d.legenda}</p>
      </div>`;
  return `<div class="fn">${t.faca ? caso('sim', t.faca) : ''}${t.naoFaca ? caso('nao', t.naoFaca) : ''}
    </div>`;
};

const blocoA11y = (t) =>
  t.a11y && t.a11y.length
    ? `<ul class="bloco-lede">${t.a11y.map((l) => `<li>${l}</li>`).join('')}</ul>`
    : `<p class="pendente">Acessibilidade ainda não escrita para este componente.</p>`;

let escritas = 0, defasadas = [];
for (const f of fichas) {
  const nav = navHtml
    .replace(`{ATUAL-${f.id}}`, ' aria-current="page"')
    .replace(/\{ATUAL-[^}]+\}/g, '');
  const pagina = `<!doctype html>
<html lang="pt-BR" data-market="us">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${f.titulo} — Ybera Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="../tokens/00-primitives.css">
<link rel="stylesheet" href="../tokens/01-semantic.css">
<link rel="stylesheet" href="../icons/ybera-icons.css">
<link rel="stylesheet" href="ybera-components.css">
<link rel="stylesheet" href="doc.css">
<style>
/* Sem seletor de tipo: ver o cabecalho de doc.css. */
.ficha{margin:0; background:var(--yb-bg-page); color:var(--yb-text-primary);
  font-family:var(--yb-font-family-base); font-size:var(--yb-type-body-size);
  line-height:var(--yb-type-body-line); -webkit-font-smoothing:antialiased}
.ficha code{font-family:var(--yb-font-family-mono); font-size:.8125rem}
</style>
</head>
<body class="ficha">
<div class="doc">

<nav class="nav">
  <p class="nav-brand">Ybera</p>
  <p class="nav-ver">Components · v${versao}</p>
  <ul>
${nav}
  </ul>
  <div class="nav-back">
    <a href="index.html">← Galeria</a>
    <a href="../index.html">← Design system</a>
  </div>
</nav>

<main class="main">
  <a class="ficha-volta" href="index.html#${f.id}">← Components</a>
  <h1 class="ficha-titulo">${f.titulo}</h1>
  <p class="ficha-quando">${f.quando}</p>
  <ul class="ficha-fatos">
    <li>Classe base <b><code>.${f.base || '—'}</code></b></li>
    <li>Modificadores <b>${f.api.modificadores.length}</b></li>
    <li>Elementos <b>${f.api.elementos.length}</b></li>
    <li>Estados <b>${f.api.estados.length}</b></li>
    <li>Tokens <b>${f.api.tokens.length}</b></li>
    <li>Comportamento <b>${js.includes(f.base) ? 'JS' : 'só CSS'}</b></li>
  </ul>

  <section class="bloco" id="demos">
    <h2 class="bloco-titulo">Como se parece</h2>
    ${f.palco}
  </section>

  <section class="bloco" id="anatomia">
    <h2 class="bloco-titulo">Anatomia e API</h2>
    <p class="bloco-lede">Lido da folha a cada build. Se faltar alguma coisa aqui,
    falta na folha.</p>
    <p class="rotulo">Modificadores</p>
    ${linhaApi(f.api.modificadores, 'Este componente não tem variantes — o que muda nele vem do conteúdo.')}
    <p class="rotulo">Elementos</p>
    ${linhaApi(f.api.elementos, 'Peça de um elemento só: não há partes internas com classe própria.')}
    <p class="rotulo">Estados que a folha trata</p>
    ${f.api.estados.length
      ? `<p class="bloco-lede">${f.api.estados.map((e) => `<code>${escapar(e)}</code>`).join(' · ')}</p>`
      : '<p class="api-vazia">Nenhum: o componente não muda de aparência por interação.</p>'}
  </section>

  <section class="bloco" id="marcacao">
    <h2 class="bloco-titulo">Marcação</h2>
    <p class="bloco-lede">Extraída da primeira demonstração acima — é o mesmo HTML
    que renderizou ali, não um exemplo escrito à parte.</p>
    ${f.snippet
      ? `<div class="snippet">
      <button class="snippet-copiar" type="button" data-yb-copiar>Copiar</button>
      <pre><code>${escapar(f.snippet)}</code></pre>
    </div>`
      : '<p class="api-vazia">Sem demonstração de onde extrair.</p>'}
  </section>

  <section class="bloco" id="acessibilidade">
    <h2 class="bloco-titulo">Acessibilidade</h2>
    ${blocoA11y(f.texto)}
  </section>

  <section class="bloco" id="faca">
    <h2 class="bloco-titulo">Faça / não faça</h2>
    ${blocoFN(f.texto)}
  </section>

  <p class="doc-credit">Ficha gerada por <code>tools/fichas.mjs</code> a partir de
  <code>components/ybera-components.css</code> e <code>components/index.html</code>.
  Não edite este arquivo à mão — rode <code>./build.sh</code>.</p>
</main>

</div>
<script src="ybera-components.js"></script>
<script>
/* Copiar a marcacao. Sem confirmacao, copiar e indistinguivel de nao ter
   acontecido nada — o rotulo do botao vira a confirmacao e volta sozinho. */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-yb-copiar]');
  if (!b) return;
  var codigo = b.parentElement.querySelector('code');
  if (!codigo || !navigator.clipboard) return;
  navigator.clipboard.writeText(codigo.textContent).then(function () {
    var antes = b.textContent;
    b.textContent = 'Copiado';
    setTimeout(function () { b.textContent = antes; }, 1600);
  });
});
</script>
</body>
</html>
`;
  const destino = `components/${f.id}.html`;
  const atual = existsSync(join(raiz, destino)) ? ler(destino) : '';
  if (atual !== pagina) {
    if (process.argv.includes('--check')) defasadas.push(destino);
    else { writeFileSync(join(raiz, destino), pagina); escritas++; }
  }
}

if (process.argv.includes('--check')) {
  if (defasadas.length) {
    console.error(`fichas defasadas: ${defasadas.join(', ')} — rode ./build.sh`);
    process.exit(1);
  }
  console.log(`fichas em dia (${fichas.length})`);
} else {
  const semTexto = fichas.filter((f) => !f.texto.a11y || (!f.texto.faca && !f.texto.naoFaca));
  console.log(`  fichas: ${fichas.length} páginas, ${escritas} reescritas`);
  if (semTexto.length)
    console.log(`  a escrever (acessibilidade ou faça/não faça): ${semTexto.length} — ${semTexto.map((f) => f.id).join(', ')}`);
}
