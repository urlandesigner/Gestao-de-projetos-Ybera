#!/usr/bin/env node
/* ===========================================================================
   FICHAS — uma pagina por peca, em todos os niveis, geradas.

   POR QUE GERADA: a ficha e o artefato que mais apodrece depois da matriz de
   completude. Alguem escreve "modificadores: --primary, --secondary, --ghost"
   a mao, o sistema ganha `--on-dark` seis meses depois, e a ficha passa a
   mentir com a autoridade de documentacao oficial. Aqui a metade factual
   (classe base, elementos, modificadores, estados, tokens, marcacao, do que a
   peca e feita) e LIDA das folhas a cada build. Se a ficha esta errada, o
   errado e o codigo.

   O que a maquina NAO sabe: por que usar, o que exige de acessibilidade e o
   que nao fazer. Isso mora em <nivel>/fichas.json, escrito a mao, e a ficha
   declara em voz alta o que ainda nao foi escrito — bloco pendente aparece
   como pendente, nunca some.

   UM GERADOR SO, e nao um por nivel: a escada atomica e a mesma coisa em
   cinco alturas. Duas copias do mesmo gerador divergem — foi o que aconteceu
   enquanto `fichas.mjs` e `padroes.mjs` conviveram, e a segunda ja nascia com
   um bloco a menos.

   Uso:  node tools/fichas.mjs          → escreve <nivel>/<id>.html e index.html
         node tools/fichas.mjs --check  → sai 1 se alguma ficha estiver defasada
   =========================================================================== */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { cabecalho, chipsDeDegrau } from './moldura.mjs';
import { NIVEIS, folhaDo } from './escada.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapaDeUso } from './tokens-uso.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const versao = (ler('package.json').match(/"version":\s*"([^"]+)"/) || [, '0.0.0'])[1];

const nivelPorDir = new Map(NIVEIS.map((n) => [n.dir, n]));

/* --------------------------------------------------------- 1. as pecas
   Uma peca, um arquivo: <nivel>/pecas/<id>.html. O fragmento tem o <h2>, a
   linha de "quando usar" e o palco (demos, rotulos de fileira e notas) — e
   mais nada: sem <head>, sem navegacao, sem moldura. */
const lerPecas = (n) => readdirSync(join(raiz, `${n.dir}/pecas`))
  .filter((f) => f.endsWith('.html'))
  .map((f) => {
    const id = f.replace(/\.html$/, '');
    // {PRAZO+Nd} vira uma data N dias a frente, carimbada no build. Uma data
    // fixa numa peca envelhece em silencio: o relogio do cartao de oferta
    // chegou a mostrar "1567 days", que nao e prazo, e numero.
    const corpo = ler(`${n.dir}/pecas/${f}`).replace(
      /\{PRAZO\+(\d+)d(:iso|:humano)?\}/g,
      (_, dias, forma) => {
        const d = new Date(Date.now() + Number(dias) * 86400000);
        if (forma === ':humano')
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        if (forma === ':iso') return d.toISOString().slice(0, 10);
        // 23:59:59 do dia, e nao a hora do build: com segundos, cada build
        // gera um valor diferente e a checagem "fichas em dia" passa a
        // oscilar — verde logo apos o build, vermelha um segundo depois.
        return d.toISOString().slice(0, 10) + 'T23:59:59Z';
      });
    const titulo = (corpo.match(/<h2>([\s\S]*?)<\/h2>/) || [, id])[1].trim();
    const quando = (corpo.match(/<p class="when">([\s\S]*?)<\/p>/) || [, ''])[1].trim();
    const corte = corpo.indexOf('</p>', corpo.indexOf('class="when"'));
    const palco = (corte === -1 ? corpo : corpo.slice(corte + 4)).trim();
    return { id, nivel: n, titulo, quando, palco };
  })
  // a ordem e a do NOME, nao a do arquivo: e assim que o sumario sempre foi
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt'));

/* --------------------------------------------- 2. de quem e cada familia
   Uma folha DECLARA uma familia quando tem uma regra cujo seletor fala de uma
   familia so e comeca por ela: `.yb-catalog__bar{}` declara, e
   `.yb-crumb + .yb-block{}` nao — esse ajusta o vizinho. Sem a distincao, o
   Buy box anunciava `.yb-crumb` como classe base por causa de duas linhas de
   espacamento que a folha dos organismos escreve sobre o breadcrumb. */
const semComentario = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
function declaradas(css) {
  const donas = new Set();
  for (const bloco of semComentario(css).split('}')) {
    const i = bloco.indexOf('{');
    if (i < 0) continue;
    for (const parte of bloco.slice(0, i).split(',')) {
      const sel = parte.trim();
      if (!sel.startsWith('.yb-')) continue;
      const fams = new Set([...sel.matchAll(/\.(yb-[a-z0-9]+)/g)].map((m) => m[1]));
      if (fams.size === 1) donas.add([...fams][0]);
    }
  }
  return donas;
}
const folhas = Object.fromEntries(NIVEIS.map((n) => [n.dir, ler(folhaDo(n))]));
const donasDo = Object.fromEntries(NIVEIS.map((n) => [n.dir, declaradas(folhas[n.dir])]));
const todasAsFolhas = NIVEIS.map((n) => semComentario(folhas[n.dir])).join('\n');

const familiasEmOrdem = (palco) => {
  const ordem = [];
  for (const m of palco.matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/)) {
      const fam = (c.match(/^(yb-[a-z0-9]+)(?:__|--|$)/) || [])[1];
      if (fam && !ordem.includes(fam)) ordem.push(fam);
    }
  return ordem;
};

/* A CLASSE BASE, e por que a regra muda com o degrau.

   Nos dois degraus de baixo a base e a familia MAIS ESPECIFICA da marcacao: o
   Post mostra tres artigos dentro de `.yb-posts`, e a peca e o artigo — o
   plural e vizinhanca. Frequencia crua nao basta (a secao do Link tem mais
   `yb-icon` do que `yb-link`), entao a contagem local se divide pelo numero de
   pecas em que a familia aparece: quem aparece em vinte pecas e vocabulario
   comum da doc, nao o assunto desta.

   Nos dois de cima e o INVULUCRO MAIS EXTERNO, porque um organismo existe
   justamente para envolver: o cabecalho tem 75 ocorrencias de `.yb-search*`
   contra 13 de `.yb-header*`, e quem manda e o que envolve. A mesma contagem
   que acerta o Post erra o Header, e vice-versa — por isso a regra e uma
   propriedade declarada do degrau, e nao um `if` escondido aqui dentro.

   Nos dois casos, familia que ja e o nome de OUTRA peca esta fora: o Review se
   demonstra dentro de um trilho, e uma ficha nao pode anunciar como sua a
   classe base do vizinho. */
const contarFamilias = (palco) => {
  const conta = new Map();
  for (const m of palco.matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/)) {
      const fam = (c.match(/^(yb-[a-z0-9]+)(?:__|--|$)/) || [])[1];
      if (fam) conta.set(fam, (conta.get(fam) || 0) + 1);
    }
  return conta;
};
const espalhamento = new Map();
const baseDe = (peca, todas) => {
  const donas = donasDo[peca.nivel.dir];
  const vizinhos = new Set(todas.filter((x) => x !== peca).map((x) => 'yb-' + x.id));
  const meu = 'yb-' + peca.id;
  const vale = (f) => donas.has(f) && (f === meu || !vizinhos.has(f));

  if (peca.nivel.base === 'involucro') {
    const daCasa = familiasEmOrdem(peca.palco).filter(vale);
    if (daCasa.length) return daCasa[0];
    return donas.has(meu) ? meu : null;
  }
  const conta = [...contarFamilias(peca.palco)].filter(([f]) => vale(f));
  // Convencao de nome, e so quando a marcacao NAO ajuda. O Toast nao aparece
  // na propria peca — ele nasce de um clique, entao a demo e feita de BOTOES
  // e qualquer contagem aponta para `yb-btn`.
  if (!conta.some(([f]) => f === meu) && donas.has(meu)) return meu;
  /* E quando a familia com o nome da peca ESTA na marcacao, ela e a base —
     nao ha contagem que faca o Textarea se chamar outra coisa. Input, Select e
     Textarea dividem a caixa `.yb-field` (rotulo, dica, erro), e numa ficha
     com tres campos a caixa aparece mais vezes que o controle: a contagem
     elegia `.yb-field` base do Textarea, e o Progress, que usa
     `.yb-field__label` como legenda, passava a "compor o Textarea". */
  const pelaConta = conta
    .map(([f, n]) => [f, n / (espalhamento.get(f) || 1)])
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  // A excecao e o plural: `seals` tem `.yb-seals` (a fileira) e `.yb-seal` (o
  // selo), e a peca e o selo — o plural e vizinhanca, mesma regra do Post.
  if (conta.some(([f]) => f === meu) && pelaConta !== meu.replace(/s$/, '')) return meu;
  return pelaConta;
};

/* ------------------------------------------------------ 3. a API na folha */
function apiDe(base) {
  if (!base) return { elementos: [], modificadores: [], estados: [], tokens: [] };
  const el = new Set(), mod = new Set(), est = new Set(), tok = new Set();
  const alcance = new RegExp(`\\.${base}(?:__[a-z0-9-]+|--[a-z0-9-]+)?\\b`, 'g');
  for (const m of todasAsFolhas.matchAll(new RegExp(`\\.${base}__([a-z0-9-]+)`, 'g'))) el.add(`${base}__${m[1]}`);
  for (const m of todasAsFolhas.matchAll(new RegExp(`\\.${base}--([a-z0-9-]+)`, 'g'))) mod.add(`${base}--${m[1]}`);
  // estados e tokens so das regras que MENCIONAM a familia
  for (const regra of todasAsFolhas.split('}')) {
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

/* --------------------------------------------------------------- 4. snippet
   Sai da PRIMEIRA demo da peca, nao de um exemplo escrito a parte: a doc
   mostrando uma marcacao e o codigo entregando outra e o defeito classico de
   ficha de componente. O palco se chama `.demo` nos dois primeiros degraus e
   `.stage` nos dois de cima — o fechamento e o `</div>` na indentacao dele. */
function snippetDe(palco) {
  /* O `\n` do fechamento e OBRIGATORIO. Com `\n?`, os quatro espacos podiam
     casar no MEIO da indentacao de qualquer `</div>` aninhado — o primeiro
     fechamento indentado terminava o recorte. Medido no Buy box: a "Marcação"
     mostrava 9 linhas de um bloco de 40, e a composicao lia so o que coube. */
  /* `[^>]*` depois da classe: quatro demos levam `style` ou `data-` na propria
     abertura — o campo de texto limita a 24rem, o dropdown reserva altura para
     o painel —, e sem isso a expressao nao casava. Input, Select, Textarea e
     Dropdown mostravam "Sem demonstracao de onde extrair" numa ficha que tem
     demonstracao logo acima. */
  const m = palco.match(/<div class="(?:demo|stage)[^"]*"[^>]*>\n?([\s\S]*?)\n {4}<\/div>/);
  if (!m) return '';
  const corpo = m[1].replace(/<iframe[\s\S]*?<\/iframe>/g, '').trimEnd();
  const linhas = corpo.split('\n').filter((l) => l.trim());
  if (!linhas.length) return '';
  const menor = Math.min(...linhas.map((l) => l.match(/^\s*/)[0].length));
  return linhas.map((l) => l.slice(menor)).join('\n');
}

/* ------------------------------------------------- 4b. o valor de cada token
   Lido das FOLHAS DE TOKEN, e nao do JSON derivado. O JSON guarda sombra como
   objeto composto — `--yb-elevation-card` saia na ficha como "[object
   Object]" — e ainda amarraria este gerador a um artefato de `dist/`, que so
   existe depois do build.

   A folha tem o texto literal de qualquer tipo de valor, e resolver `var()` e
   seguir a mesma corrente que o navegador segue. */
const valorDoToken = (() => {
  const fora = new Map();
  for (const arq of ['tokens/00-primitives.css', 'tokens/01-semantic.css']) {
    if (!existsSync(join(raiz, arq))) continue;
    for (const m of semComentario(ler(arq)).matchAll(/(?:^|[{;])\s*(--yb-[\w-]+)\s*:\s*([^;}]+)/g))
      if (!fora.has(m[1])) fora.set(m[1], m[2].replace(/\s+/g, ' ').trim());
  }
  /* Teto de saltos: uma referencia circular travaria o build num laco, e o
     build tem de acusar, nao pendurar. */
  const resolver = (v, saltos = 0) => {
    if (saltos > 10) return v;
    const so = v.match(/^var\(\s*(--yb-[\w-]+)\s*\)$/);
    if (so) return fora.has(so[1]) ? resolver(fora.get(so[1]), saltos + 1) : v;
    /* VALOR COMPOSTO DE ALIAS — `var(--a) var(--b)`, que e como as transicoes
       sao escritas. Sem isto a ficha mostrava `var(--yb-duration-base)
       var(--yb-ease-standard)` enquanto todo o resto ao lado mostrava o valor
       final: 47 caracteres que quebravam em duas linhas para dizer menos que
       os 30 de `180ms cubic-bezier(.2, 0, 0, 1)`.
       So quando o valor e FEITO de var() e espaco. `calc(var(--yb-space-4) * 2
       + 1rem)` fica como esta: ali o nome do token e que explica a conta, e
       trocar por `calc(1rem * 2 + 1rem)` faria a ficha mostrar aritmetica no
       lugar da intencao. */
    if (!/^(?:var\(\s*--yb-[\w-]+\s*\)\s*)+$/.test(v)) return v;
    return v.replace(/var\(\s*(--yb-[\w-]+)\s*\)/g,
      (bruto, nome) => (fora.has(nome) ? resolver(fora.get(nome), saltos + 1) : bruto)).trim();
  };
  for (const [nome, v] of fora) fora.set(nome, resolver(v));
  return fora;
})();

// Cor se reconhece pelo VALOR — nao ha lista de quais tokens sao de cor.
const ehCor = (v) => /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(v);

/* A CATEGORIA SAI DO NOME, e nao de uma tabela escrita aqui. `--yb-action-bg`
   e da familia `action`, `--yb-space-4` da `space`: a convencao de nome do
   sistema ja e a taxonomia, e uma tabela paralela seria uma segunda verdade
   para manter.

   Tentei antes tirar as categorias da propria pagina de tokens, lendo em que
   secao cada nome aparece — mas ela mostra AMOSTRAS: 106 dos 321 tokens
   apareciam la, e dois tercos cairiam num balde "outros". */
/* AS SEIS SECOES DA FUNDACAO, e nao o prefixo do nome.

   O agrupamento por prefixo dava nove baldes para dezessete tokens na ficha do
   Accordion — cinco deles com um item so —, e separava o que e a mesma coisa:
   `font` (peso), `line` (altura) e `type` (tamanho) sao tipografia, e caiam em
   tres colunas diferentes; `border`, `focus` e `text` sao cor, e caiam em
   outras tres. Pior, era uma taxonomia que so existia aqui: a Fundacao arruma
   os mesmos 358 tokens em Color, Typography, Space, Shape, Elevation e State.
   Dois artefatos, duas historias sobre a mesma coisa.

   A ORDEM IMPORTA nesta lista: ganha o primeiro que casar. `border-width` e
   forma e tem de ser lido antes de `border`, que e cor.

   O ultimo balde e a camada 2 da arquitetura — token que um componente declara
   para si (`--yb-card-title-lines`). Nao e categoria de desenho, e nivel: por
   isso aponta para Architecture, que e onde ela esta explicada. */
const SECOES_DE_TOKEN = [
  ['Forma',      'shape',        /^(border-width|radius|aspect)/],
  ['Estado',     'state',        /^(focus|duration|ease|transition)/],
  ['Elevação',   'elevation',    /^(elevation|shadow|z|blur|opacity|scrim)/],
  ['Tipografia', 'typography',   /^(font|type|line|tracking|measure)/],
  ['Espaço',     'space',        /^(space|target|control|container|page|grid|header|chrome|breakpoint|icon)/],
  ['Cor',        'color',        /^(gray|magenta|gold|accent|success|warning|danger|info|white|black|text|bg|surface|border|action)/],
  ['Componente', 'architecture', /./],
];
const secaoDoToken = (nome) => {
  const resto = nome.replace(/^--yb-/, '');
  return SECOES_DE_TOKEN.find(([, , re]) => re.test(resto));
};

/* QUANTOS COMPONENTES COMPARTILHAM O TOKEN — a chave da ordenacao, e so isso.

   Ela ja esteve impressa ao lado de cada token e saiu: e um fato sobre o
   SISTEMA, numa pagina que responde sobre a PECA. O tell foi precisar de um
   paragrafo de legenda para ser lido — numero que exige bula nao esta em casa,
   ainda mais disputando leitura com o outro numero do bloco, o que conta
   tokens no titulo do grupo. Quem quer a conta vai a Fundacao, onde cada
   amostra abre a lista com nome e link.

   O que ela resolvia continua resolvido pela ORDEM: doze dos dezessete tokens
   do Accordion aparecem em quinze ou mais componentes — anel de foco, texto do
   corpo, espacamento base —, e sem ordenar eles afogavam os cinco que sao
   decisao da peca.

   Preguicoso porque le as cinco folhas da escada, e `--check` roda o gerador
   inteiro so para comparar. */
let _usoDeToken = null;
const quantosUsam = (token) => {
  _usoDeToken ||= mapaDeUso();
  let n = 0;
  for (const fam of _usoDeToken.get(token) || []) if (porBase.has(fam)) n++;
  return n;
};

function blocoDeTokens(tokens) {
  if (!tokens.length) return '<p class="api-vazia">Nenhum: a folha não usa token nesta família.</p>';
  const grupos = new Map();
  for (const nome of tokens) {
    const [rotulo, pagina] = secaoDoToken(nome);
    if (!grupos.has(rotulo)) grupos.set(rotulo, { pagina, nomes: [] });
    grupos.get(rotulo).nomes.push(nome);
  }
  // a ordem dos grupos e a da LEITURA da Fundacao, e nao alfabetica: cor,
  // tipografia, espaco, forma, elevacao, estado — a mesma de `ORDEM_TOKENS`
  const ORDEM = ['Cor', 'Tipografia', 'Espaço', 'Forma', 'Elevação', 'Estado', 'Componente'];
  const ordenados = [...grupos.entries()].sort((a, b) => ORDEM.indexOf(a[0]) - ORDEM.indexOf(b[0]));
  return `<div class="tokens">
${ordenados.map(([rotulo, { pagina, nomes }]) => `      <div class="tokens__grupo">
        <p class="tokens__familia"><a href="../tokens/${pagina}.html">${rotulo}</a> <span>${nomes.length}</span></p>
        <ul class="tokens__lista">
${nomes.map((n) => [n, quantosUsam(n)])
  .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
  .map(([n]) => {
    const v = valorDoToken.get(n);
    const amostra = v && ehCor(v)
      ? `<i class="tokens__cor" style="background:var(${n})" aria-hidden="true"></i>` : '';
    return `          <li>${amostra}<code>${n}</code>${v ? `<span class="tokens__valor">${escapar(v)}</span>` : ''}</li>`;
  }).join('\n')}
        </ul>
      </div>`).join('\n')}
    </div>`;
}

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------ 5. montar */
const js = ler('behavior/ybera-behavior.js');
// so codigo, sem comentario — senao uma peca citada de passagem vira "JS"
const jsCodigo = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const GANCHO_POR_FAMILIA = { 'yb-dialog': 'data-yb-open' };   // mesma leitura do inventario.mjs

const pecas = NIVEIS.flatMap(lerPecas);
for (const p of pecas)
  for (const fam of contarFamilias(p.palco).keys())
    espalhamento.set(fam, (espalhamento.get(fam) || 0) + 1);
/* ESTADOS COMPARAVEIS. A peca marca um bloco com data-estado + data-rotulo, e
   o quadro de Mobile passa a ser UM POR ESTADO, lado a lado, em vez de um so.
   E como se documenta o estado que existe apenas abaixo de um breakpoint: a
   faixa de conta do menu e `display:none` acima de 900, entao no palco largo
   ela apareceria sem nenhuma das regras que a desenham. */
const estadosDe = (palco) =>
  [...palco.matchAll(/data-estado="([a-z0-9-]+)"(?:[^>]*?data-rotulo="([^"]*)")?/g)]
    .map((m) => ({ id: m[1], rotulo: m[2] || m[1] }));

for (const p of pecas) {
  p.base = baseDe(p, pecas);
  p.api = apiDe(p.base);
  p.estados = estadosDe(p.palco);
  p.snippet = snippetDe(p.palco);
  const escrito = existsSync(join(raiz, `${p.nivel.dir}/fichas.json`))
    ? JSON.parse(ler(`${p.nivel.dir}/fichas.json`)) : {};
  p.texto = escrito[p.id] || {};
}
const porBase = new Map(pecas.filter((p) => p.base).map((p) => [p.base, p]));

/* DE QUE ELA E FEITA — a pergunta que so a escada responde: o que esta peca
   custa nos degraus de baixo. Sai do cruzamento da marcacao com a classe base
   que cada peca ja anuncia, entao nao ha lista escrita a mao para
   desatualizar, e uma peca renomeada some dos dois lugares junto. */
const vizinhasMortas = [];
for (const p of pecas) {
  /* Lido da PRIMEIRA demo, e nao do palco inteiro — a mesma marcacao que o
     bloco "Marcação" mostra. A peca do Button tem, mais abaixo, uma fileira de
     botoes de icone para dizer que sao vizinhos; lendo o palco todo, o Button
     passava a "compor" o Icon button e deixava de ser atomo por causa de uma
     fileira de comparacao. A primeira demo e a peca como ela e. */
  /* VIZINHA declarada. A primeira demo e "a peca como ela e" — mas ha peca que
     so faz sentido ao lado de outra: o bloco de compra sem a galeria ao lado
     nao mostra a decisao. Ler isso como composicao seria mentir sobre o que
     ela custa, e foi o que a doc fez enquanto o lugar da foto era um
     `.yb-card__media` vazio: o Buy box anunciava que era feito de Product
     card. Aqui a excecao e DECLARADA no arquivo da peca, ao lado do motivo, e
     conferida abaixo — declaracao que nao encontra a familia derruba o build,
     como qualquer outra regra escrita e inerte. */
  const fams = new Set(familiasEmOrdem(p.snippet));
  p.vizinhas = [...p.palco.matchAll(/<!--\s*doc:vizinha\s+(yb-[a-z0-9]+)/g)].map((m) => m[1]);
  for (const v of p.vizinhas) if (!fams.has(v)) vizinhasMortas.push(`${p.id} declara ${v}`);
  p.usa = [...fams]
    .filter((f) => !p.vizinhas.includes(f))
    .map((f) => porBase.get(f))
    // `<=` e nao `<`: organismo compoe organismo — o cabecalho traz a folha de
    // busca inteira dentro dele, e esconder isso porque sao do mesmo degrau
    // seria mentir sobre o que ele custa. O que nao pode e apontar para CIMA:
    // peca que depende do degrau de cima esta no degrau errado.
    .filter((x) => x && x !== p && NIVEIS.indexOf(x.nivel) <= NIVEIS.indexOf(p.nivel))
    .sort((a, b) => NIVEIS.indexOf(a.nivel) - NIVEIS.indexOf(b.nivel)
      || a.titulo.localeCompare(b.titulo, 'pt'));
}

/* RESPOSTA CURTA NA LINHA DO ROTULO.

   A aba tinha seis rotulos, cada um com `margin-top:32px` e um paragrafo
   embaixo — 192px so de respiro para seis fatos, e quatro deles cabiam em
   meia linha ("Nenhum", "So CSS"). Na ficha do Accordion, metade da altura da
   aba era declaracao de ausencia antes de chegar no que existe.

   Vira uma linha por fato, rotulo a esquerda e resposta a direita, separadas
   por fio. A unica que continua precisando de area e a de tokens, que e uma
   grade — e "De que e feita" quando ha composicao, porque ali a lista vem
   agrupada por degrau. */
const apiLinha = (rotulo, corpo) =>
  `<p class="api-linha"><span class="api-linha__rotulo">${rotulo}</span><span class="api-linha__corpo">${corpo}</span></p>`;

const linhaApi = (itens, vazio) =>
  itens.length
    ? `<p class="lista-api">${itens.map((c) => `<code>.${c}</code>`).join(' ')}</p>`
    : `<p class="api-vazia">${vazio}</p>`;

const blocoFN = (t, n) => {
  if (!t.faca && !t.naoFaca) {
    return `<p class="pendente">Faça / não faça ainda não escrito para ${n.artigo === 'o' ? 'este' : 'esta'} ${n.singular}.
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

/* ANATOMIA DESENHADA — a peca de verdade, com um numero em cada parte.

   A lista de classes e tokens logo abaixo responde "o que existe na API". Nao
   responde "o que e cada pedaco e para que serve", que e a primeira pergunta de
   quem chega. O desenho responde essa.

   O PALCO E A PROPRIA PECA, nao um wireframe: o mesmo recorte que a aba
   Componente mostra e que o bloco Marcacao entrega para copiar. Desenho a parte
   envelhece sozinho — a peca muda e a ilustracao continua contando a versao
   antiga, com a autoridade de documentacao oficial.

   A POSICAO DO NUMERO E CALCULADA no navegador, em cima do elemento vivo (ver
   doc.js). So o TEXTO de cada parte e escrito a mao, em fichas.json, porque
   "obrigatorio, uma linha" nao esta em lugar nenhum do codigo.

   IDS PREFIXADOS: este recorte e a segunda copia da mesma marcacao na pagina —
   a primeira esta na aba Componente. Sem prefixo, dois `id` iguais convivem e o
   `for` do rotulo passa a apontar para o elemento errado; pior, dois grupos de
   radio com o mesmo `name` viram um grupo so, e clicar aqui desmarca a demo da
   outra aba. */
const prefixar = (html) => html
  .replace(/\b(id|for|name)="([^"]*)"/g, (_, a, v) => `${a}="anat-${v}"`)
  .replace(/\b(aria-labelledby|aria-controls|aria-describedby)="([^"]*)"/g,
    (_, a, v) => `${a}="${v.split(/\s+/).map((x) => `anat-${x}`).join(' ')}"`)
  .replace(/href="#([^"]*)"/g, (_, v) => `href="#anat-${v}"`);

/* UMA AMOSTRA, e nao a fileira inteira. As galerias de atomo demonstram por
   fileira — quatro botoes, cada um com o modificador escrito embaixo. Desenhar
   a fileira poria quatro copias da peca no palco, com os fios apontando para a
   primeira e as outras tres de enfeite. Aqui fica a primeira amostra, sem o
   rotulo de modificador, que e cromo da galeria e nao parte da peca.

   Balanceamento de tag, e nao expressao: `<span class="amostra">` tem span
   dentro, e um recorte nao-guloso terminaria no primeiro `</span>` aninhado. */
function primeiraAmostra(html) {
  const abre = html.match(/<span class="amostra">/);
  if (!abre || abre.index > html.search(/\S/) + 2) return html;
  let n = 0, i = abre.index;
  const tags = /<(\/?)span\b[^>]*?(\/?)>/g;
  tags.lastIndex = i;
  for (let m; (m = tags.exec(html)); ) {
    if (m[2]) continue;
    n += m[1] ? -1 : 1;
    if (n === 0) {
      return html.slice(abre.index, m.index + m[0].length)
        .replace(/<span class="amostra__rotulo">[\s\S]*?<\/span>\s*/g, '')
        .replace(/^<span class="amostra">|<\/span>$/g, '')
        .trim();
    }
  }
  return html;
}

/* A anatomia pode vir como lista ou como objeto com `largura`/`recorte`. Quem
   pergunta "esta escrita?" tem de perguntar do mesmo jeito que quem desenha —
   com duas leituras diferentes, o ponto de pendencia acendia em peca
   desenhada: `{largura, partes}` nao tem `.length`, entao o teste dava vazio
   para dezessete fichas que tinham desenho. */
const partesDaAnatomia = (t) => (Array.isArray(t.anatomia) ? t.anatomia : t.anatomia?.partes) || [];

/* BLOCO SE DESENHA PELAS PECAS QUE O COMPOEM, e nao por elementos internos.

   Num atomo a pergunta e "de que pedacos ele e feito"; num bloco a resposta
   util e outra — quais componentes do sistema ele monta, e onde cada um entra.
   Isso a ficha JA SABE: `f.usa` sai do cruzamento da marcacao com a classe
   base que cada peca anuncia. Entao o desenho do bloco nao precisa de uma
   linha escrita a mao, e nao pode envelhecer: peca que sai do bloco some do
   desenho no mesmo build em que some da marcacao.

   A ORDEM E A DA MARCACAO, e nao a alfabetica de `f.usa`: os numeros tem de
   subir junto com o olho, de cima para baixo. */
const anatomiaDeBloco = (f) => f.usa
  .map((c) => ({
    c, onde: new RegExp(`class="[^"]*\\b${c.base}\\b`).exec(f.snippet)?.index ?? Infinity,
  }))
  .filter((x) => x.onde !== Infinity)
  .sort((a, b) => a.onde - b.onde)
  .map(({ c }) => ({
    alvo: `.${c.base}`,
    nome: `<a href="../${c.nivel.dir}/${c.id}.html">${c.titulo}</a>`,
    texto: c.quando,
  }));

const blocoAnatomia = (f, n) => {
  /* `anatomia` aceita a lista direta ou um objeto com `largura` e `partes`.
     A largura existe porque o palco nao reproduz o contexto da demo: o cartao
     de oferta vive numa grade de colunas de 266px, e solto aqui ele esticava
     para os 560 do palco — o desenho passava a explicar uma peca que a loja
     nao tem. Quem nao declara continua ocupando a largura toda, que e o certo
     para alerta, acordeao e qualquer peca de bloco. */
  const bruto = f.texto.anatomia;
  const partes = partesDaAnatomia(f.texto).length ? partesDaAnatomia(f.texto)
    : (n.base === 'involucro' ? anatomiaDeBloco(f) : []);
  const largura = Array.isArray(bruto) ? null : bruto?.largura;
  /* `recorte` pega UMA instancia do snippet. A demo do Button e uma fileira de
     quatro variantes com rotulo embaixo de cada — desenhar a fileira inteira
     poe quatro copias da mesma peca no palco, e os fios apontam para a
     primeira. O recorte continua sendo marcacao de verdade: e um pedaco do
     mesmo HTML, nao um exemplo escrito a parte. */
  const recorte = Array.isArray(bruto) ? null : bruto?.recorte;
  if (!partes || !partes.length)
    return n.base === 'involucro'
      ? `<p class="pendente">Este ${n.singular} não compõe nenhuma peça do sistema, então não há o que apontar.
         O desenho de um ${n.singular} é o mapa dos componentes que ele monta.</p>`
      : `<p class="pendente">Anatomia desenhada ainda não escrita para ${n.artigo === 'o' ? 'este' : 'esta'} ${n.singular}.
      A lista de API abaixo continua valendo — o que falta é o nome e o porquê de cada parte.</p>`;
  if (!f.snippet)
    return '<p class="api-vazia">Sem demonstração de onde tirar o desenho.</p>';
  let marcacao = primeiraAmostra(f.snippet);
  if (recorte) {
    const m = marcacao.match(new RegExp(recorte, 's'));
    if (!m) {
      console.error(`fichas.mjs: recorte da anatomia nao casa em ${f.id} — ${recorte}`);
      process.exit(1);
    }
    marcacao = m[0];
  }
  return `<div class="anat" data-yb-anatomia>
      <div class="anat__palco">
        <svg class="anat__fios" aria-hidden="true"></svg>
        <div class="anat__peca"${largura ? ` style="max-inline-size:${largura}"` : ''}>${prefixar(marcacao)}</div>
      </div>
      <ol class="anat__legenda">
${partes.map((x) => `        <li data-alvo="${x.alvo}"><span class="anat__texto"><b>${x.nome}</b> — ${x.texto}</span></li>`).join('\n')}
      </ol>
    </div>`;
};

const blocoA11y = (t, n) =>
  t.a11y && t.a11y.length
    ? `<ul class="bloco-lede">${t.a11y.map((l) => `<li>${l}</li>`).join('')}</ul>`
    : `<p class="pendente">Acessibilidade ainda não escrita para ${n.artigo === 'o' ? 'este' : 'esta'} ${n.singular}.</p>`;

// cada degrau carrega os de baixo, na ordem da escada
const folhasAte = (n) => NIVEIS.slice(0, NIVEIS.indexOf(n) + 1)
  .map((x) => `<link rel="stylesheet" href="${x === n ? `ybera-${x.dir}.css` : `../${folhaDo(x)}`}">`)
  .join('\n');

const CABECA = (titulo, n, atual) => `<!doctype html>
<html lang="pt-BR" data-market="us">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} — Ybera Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="../tokens/00-primitives.css">
<link rel="stylesheet" href="../tokens/01-semantic.css">
<link rel="stylesheet" href="../base/ybera-base.css">
${folhasAte(n)}
<link rel="stylesheet" href="../icons/ybera-icons.css">
<link rel="stylesheet" href="../doc/doc.css">
<link rel="stylesheet" href="../doc/doc-nav.css">
<script src="../doc/doc.js" defer></script>
<style>
/* Sem seletor de tipo: ver o cabecalho de doc/doc.css. */
.ficha{margin:0; background:var(--yb-bg-page); color:var(--yb-text-primary);
  font-family:var(--yb-font-family-base); font-size:var(--yb-type-body-size);
  line-height:var(--yb-type-body-line); -webkit-font-smoothing:antialiased}
.ficha code{font-family:var(--yb-font-family-mono); font-size:.8125rem}
</style>
</head>
<body class="ficha" data-nivel="${n.dir}" data-moldura="centrada">
${cabecalho({ raiz: '../', atual, grupo: n.grupo || n.dir })}
`;

/* A ficha nao tem mais coluna propria. Ela teve tres: a lista das 49 pecas
   (um rolo onde a peca aberta se perdia), a escada dos quatro degraus (que a
   barra de areas ja mostrava) e a lista do degrau aberto. A arvore global, que
   agora vive em toda pagina, cobre as tres — e uma navegacao so responde
   "onde estou" uma vez. */

/* Os blocos da ficha, na ordem em que aparecem. Uma lista só: ela gera o
   índice lateral E é a ordem em que o corpo é montado, então não há como o
   índice prometer uma seção que a página não tem. */
const BLOCOS = [
  { id: 'demos', rotulo: 'Como se parece' },
  { id: 'mobile', rotulo: 'Mobile' },
  { id: 'feita-de', rotulo: 'De que é feita' },
  { id: 'anatomia', rotulo: 'Anatomia e API' },
  { id: 'marcacao', rotulo: 'Marcação' },
  { id: 'acessibilidade', rotulo: 'Acessibilidade' },
  { id: 'faca', rotulo: 'Faça / não faça' },
];

let escritas = 0; const defasadas = [];
const gravar = (destino, pagina) => {
  const atual = existsSync(join(raiz, destino)) ? ler(destino) : '';
  if (atual === pagina) return;
  if (process.argv.includes('--check')) defasadas.push(destino);
  else { writeFileSync(join(raiz, destino), pagina); escritas++; }
};

for (const n of NIVEIS) {
  const doNivel = pecas.filter((p) => p.nivel === n);

  for (let i = 0; i < doNivel.length; i++) {
    const f = doNivel[i], ant = doNivel[i - 1], prox = doNivel[i + 1];
    const pagina = CABECA(f.titulo, n, `${n.dir}-${f.id}`) + `
<aside class="ds-nesta" aria-labelledby="nesta-pagina">
  <p class="ds-nesta__titulo" id="nesta-pagina">Nesta página</p>
  <ol>
${BLOCOS.map((b) => `    <li><a href="#${b.id}">${b.rotulo}</a></li>`).join('\n')}
  </ol>
</aside>

<main class="main">
  <div class="ficha-topo">
    <nav class="ficha-trilha" aria-label="Você está aqui">
      ${n.grupo === 'components' ? `<a href="../components/index.html">Componentes</a>
      <span aria-hidden="true">/</span>` : ''}
      <a href="index.html#${f.id}">${n.titulo}</a>
      <span aria-hidden="true">/</span>
      <b aria-current="page">${f.titulo}</b>
    </nav>
    <nav class="ficha-passo" aria-label="Peça anterior e próxima">
      ${ant ? `<a href="${ant.id}.html" rel="prev"><span aria-hidden="true">←</span> ${ant.titulo}</a>` : '<span></span>'}
      ${prox ? `<a href="${prox.id}.html" rel="next">${prox.titulo} <span aria-hidden="true">→</span></a>` : '<span></span>'}
    </nav>
  </div>
  <h1 class="ficha-titulo">${f.titulo}</h1>
  <p class="ficha-quando">${f.quando}</p>
  <!-- Só a classe base. A fileira trazia também as contagens de modificador,
       elemento, estado e token — cinco números que ninguém usa para decidir
       nada e que, desde que a aba Anatomia existe, repetem em placar o que a
       aba mostra por extenso, com os nomes. Número sem o nome ao lado é um
       resumo de algo que está a um clique. -->
  <ul class="ficha-fatos">
    <li>Classe base <b><code>.${f.base || '—'}</code></b></li>
  </ul>

  <!-- A FICHA INTEIRA EM ABAS, e nada solto embaixo delas.

       Antes so tres blocos eram aba (Preview, Codigo, Anatomia) e outros tres
       ficavam abaixo do container — Mobile, Acessibilidade e Faca/nao faca.
       Como nada na tela dizia que a area das abas tinha acabado (20px de vao e
       a mesma tipografia), os tres liam como conteudo da aba aberta, qualquer
       que fosse ela.

       Agora tudo e aba, na organizacao do outro design system da casa:
       Componente · Anatomia · Regras de uso · Acessibilidade. "Estados" fica de
       fora por enquanto — so 2 das 66 pecas tem demonstracao de estado, e uma
       aba vazia em 64 fichas ensina menos que a ausencia dela.

       O CELULAR E A MARCACAO ENTRARAM EM "COMPONENTE" porque respondem a mesma
       pergunta que o palco: como a peca e. Aba propria para o celular ensinaria
       que telefone e assunto separado do desktop, que e o oposto do que um
       design system quer dizer. -->
  <div class="abas" data-yb-abas>
  <section class="bloco" id="demos" data-aba="Componente">
    <h2 class="bloco-titulo">Como se parece</h2>
    ${f.palco}

    <h3 class="rotulo">No celular</h3>
    ${f.estados.length
      ? `<div class="duo">
${f.estados.map((e) => `      <figure class="duo__col">
        <p class="duo__rotulo">${e.rotulo}</p>
        <iframe class="duo__quadro" src="solo.html?c=${f.id}&amp;s=${e.id}"
                title="${f.titulo} · ${e.rotulo}" width="375" height="420" loading="lazy"></iframe>
      </figure>`).join('\n')}
    </div>`
      : `<div class="quadro-mob">
      <iframe src="solo.html?c=${f.id}" title="${f.titulo} em 375px"
              width="375" height="420" loading="lazy"></iframe>
    </div>`}

    <h3 class="rotulo">Marcação</h3>
    <p class="bloco-lede">O mesmo HTML que renderizou acima.</p>
    ${f.snippet
      ? `<div class="snippet">
      <button class="snippet-copiar" type="button" data-yb-copiar>Copiar</button>
      <pre><code>${escapar(f.snippet)}</code></pre>
    </div>`
      : '<p class="api-vazia">Sem demonstração de onde extrair.</p>'}
  </section>

  <section class="bloco" id="anatomia" data-aba="Anatomia"${
    (partesDaAnatomia(f.texto).length || (n.base === 'involucro' && f.usa.length)) ? '' : ' data-pendente'}>
    <h2 class="bloco-titulo">Anatomia e API</h2>
    ${blocoAnatomia(f, n)}
    <!-- O lede dizia so "Lido da folha e da marcacao a cada build": respondia
         COMO a aba foi feita, para quem ainda nao sabe O QUE ela tem, e em tres
         palavras de dentro de casa ("folha", "marcacao", "build"). A aba ao
         lado ja mostrava o jeito certo — "O mesmo HTML que renderizou acima"
         diz o que e. Aqui o que a pessoa precisa primeiro e a lista do que vai
         encontrar; a procedencia vem depois, e vale a frase inteira, porque e
         ela que autoriza confiar no que esta escrito. -->
    <p class="bloco-lede">De que a peça é feita, o que ela aceita e os tokens que
    consome — estes do mais específico desta peça para o mais compartilhado com o
    resto do sistema. Tudo lido da folha de estilo e do HTML a cada build: se
    estiver errado aqui, o errado é o código.</p>

    ${f.usa.length
      ? `<p class="rotulo">De que é feita</p>
    ` + [...new Map(f.usa.map((c) => [c.nivel.dir, c.nivel])).values()].map((niv) => `<p class="usa-degrau">${niv.titulo}</p>
    <ul class="usa">${f.usa.filter((c) => c.nivel === niv).map((c) => `<li><a href="../${c.nivel.dir}/${c.id}.html">${c.titulo}</a></li>`).join('')}</ul>`).join('\n    ')
      /* "e so a propria folha" nao dizia nada para quem nao mora aqui: folha de
         quem, e o que isso implica. O fato e que a peca nao consome nenhum
         outro componente do sistema — e para o atomo esse fato tem nome. */
      : apiLinha('De que é feita', n.dir === 'atoms'
          ? 'Nenhuma. Um átomo não compõe outras peças — é isso que faz dele átomo.'
          : 'Nenhuma: não consome nenhum outro componente. O que ela desenha sai todo da folha dela.')}
    ${apiLinha('Modificadores', f.api.modificadores.length
      ? `<span class="lista-api">${f.api.modificadores.map((c) => `<code>.${c}</code>`).join(' ')}</span>`
      : 'Nenhum. O que muda nela vem do conteúdo.')}
    ${apiLinha('Elementos', f.api.elementos.length
      ? `<span class="lista-api">${f.api.elementos.map((c) => `<code>.${c}</code>`).join(' ')}</span>`
      : 'Nenhum. A peça é um elemento só.')}
    ${apiLinha('Estados que a folha trata', f.api.estados.length
      ? f.api.estados.map((e) => `<code>${escapar(e)}</code>`).join(' · ')
      : 'Nenhum. A peça não muda por interação.')}
    ${apiLinha('Comportamento', jsCodigo.includes(f.base) || jsCodigo.includes(GANCHO_POR_FAMILIA[f.base] || '\u0000')
      ? 'Precisa de <code>ybera-behavior.js</code>. Sem ele renderiza e não responde.'
      : 'Só CSS.')}
    <p class="rotulo">Tokens <span class="rotulo-conta">${f.api.tokens.length}</span></p>
    ${blocoDeTokens(f.api.tokens)}
  </section>

  <!-- O atributo data-pendente acende um ponto na tira da aba. Sem ele, o
       bloco por escrever passaria a estar atras de um clique, e a razao de ele
       existir vazio — "secao que some da ficha e uma pergunta que ninguem sabe
       que ficou sem resposta" — valeria pela metade: nao some, mas ninguem ve.

       (Crase aqui dentro nao pode: este HTML mora num template literal, e uma
       crase em comentario ja derrubou o build antes.) -->
  <section class="bloco" id="faca" data-aba="Regras de uso"${
    (!f.texto.faca && !f.texto.naoFaca) ? ' data-pendente' : ''}>
    <h2 class="bloco-titulo">Faça / não faça</h2>
    ${blocoFN(f.texto, n)}
  </section>

  <section class="bloco" id="acessibilidade" data-aba="Acessibilidade"${
    (!f.texto.a11y || !f.texto.a11y.length) ? ' data-pendente' : ''}>
    <h2 class="bloco-titulo">Acessibilidade</h2>
    ${blocoA11y(f.texto, n)}
  </section>
  </div>

  <p class="doc-credit">Gerada de <code>${n.dir}/pecas/${f.id}.html</code> e
  <code>${folhaDo(n)}</code>. Não edite à mão: <code>./build.sh</code>.</p>
</main>

<script src="../behavior/ybera-behavior.js"></script>
<script>
/* O quadro de 375 se dimensiona pelo que tem dentro. Conteudo de iframe nao
   dimensiona o elemento sozinho, entao o solo.html mede a propria caixa e
   avisa por postMessage — sem isso a ficha do Badge teria a mesma altura da
   ficha do carrinho, e as duas erradas. */
addEventListener('message', function (e) {
  if (!e.data || e.data.yb !== 'altura') return;
  /* Pelo REMETENTE, e nao pelo primeiro quadro da pagina: uma ficha pode ter
     mais de um (a comparacao de estados lado a lado tem dois), e os dois
     mandam a mesma mensagem com o mesmo alvo. Pegando o primeiro, o quadro
     grande recebia a altura do pequeno. */
  var f = Array.prototype.find.call(document.querySelectorAll('iframe'),
    function (x) { return x.contentWindow === e.source; });
  if (!f || !(e.data.h > 0)) return;
  f.height = e.data.h;
  /* Quadros comparados ficam da MESMA altura, sempre a maior. Duas caixas lado
     a lado com fundos diferentes e uma 44px mais curta leem como recorte, e
     nao como diferenca de estado. So cresce, entao converge. */
  var duo = f.closest('.duo');
  if (!duo) return;
  var irmaos = duo.querySelectorAll('.duo__quadro');
  var maior = 0;
  Array.prototype.forEach.call(irmaos, function (x) {
    maior = Math.max(maior, parseInt(x.height, 10) || 0);
  });
  Array.prototype.forEach.call(irmaos, function (x) {
    if ((parseInt(x.height, 10) || 0) !== maior) x.height = maior;
  });
});

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
  }).catch(function () { /* permissao negada: o codigo continua selecionavel */ });
});
</script>
</body>
</html>
`;
    gravar(`${n.dir}/${f.id}.html`, pagina);
  }

  /* ------------------------------------------------------- a galeria
     Nome, uma linha e o link. Nada de demo: mostrar tudo de uma vez e o que
     fazia da galeria antiga 48.000px de scroll em que nenhuma peca tinha
     lugar proprio. */
  const cartao = (f) => `      <a class="peca" id="${f.id}" href="${f.id}.html">
        <b>${f.titulo}</b>
        <span>${f.quando}</span>
      </a>`;
  const anterior = NIVEIS[NIVEIS.indexOf(n) - 1], seguinte = NIVEIS[NIVEIS.indexOf(n) + 1];
  const galeria = CABECA(n.titulo, n, n.dir) + `
<main class="main">
  <a class="ficha-volta" href="../index.html">← Design system</a>
  <p class="ficha-nivel">Degrau ${NIVEIS.indexOf(n) + 1} de ${NIVEIS.length}${n.atomico ? ` · ${n.atomico} na escada atômica` : ''}</p>
  <h1 class="ficha-titulo">${n.titulo}</h1>
  <p class="ficha-quando">${n.lede}</p>
  <p class="bloco-lede"><b>A regra do degrau:</b> ${n.regra}</p>
${chipsDeDegrau(n.dir)}

  <section class="grade-grupo">
    <h2>${n.titulo} <span class="grade-conta">${doNivel.length}</span></h2>
    <div class="grade">
${doNivel.map(cartao).join('\n')}
    </div>
  </section>

${n.planejadas ? `
  <section class="grade-grupo">
    <h2>Por escrever <span class="grade-conta">${n.planejadas.length}</span></h2>
    <p class="grade-lede">Este degrau nasceu do CSS, e só o Page layout tem folha
    (<code>.yb-page</code>, <code>.yb-block</code>, <code>.yb-section</code>). Mas
    template é <b>arranjo</b>, não estilo: os esqueletos de verdade existem hoje só
    como as <a href="../pages/index.html">onze telas</a>, sem nenhuma página dizendo
    o que é obrigatório e qual ordem não se inverte.</p>
    <ul class="pendente-lista">
${n.planejadas.map(([nome, linha]) => `      <li><b>${nome}</b> — ${linha}</li>`).join('\n')}
    </ul>
  </section>
` : ''}
  <nav class="ficha-passo ficha-passo--escada" aria-label="Degrau anterior e próximo">
    ${anterior ? `<a href="../${anterior.dir}/index.html" rel="prev"><span aria-hidden="true">←</span> ${anterior.titulo}</a>` : '<span></span>'}
    ${seguinte ? `<a href="../${seguinte.dir}/index.html" rel="next">${seguinte.titulo} <span aria-hidden="true">→</span></a>` : '<span></span>'}
  </nav>

  <p class="doc-credit">Índice gerado por <code>tools/fichas.mjs</code> a partir de
  <code>${n.dir}/pecas/</code>. Não edite este arquivo à mão — rode <code>./build.sh</code>.</p>
</main>

</body>
</html>
`;
  gravar(`${n.dir}/index.html`, galeria);

  /* -------------------------------------------------------- o solo
     Renderiza UMA peca sozinha, para caber no <iframe> de 375. Ele e GERADO
     em cada degrau, e nao escrito quatro vezes: precisa morar ao lado das
     folhas do nivel para que `../icons/…` e `../tokens/…` resolvam igual —
     e quatro copias escritas a mao divergem no dia em que uma delas muda. */
  const solo = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>solo</title>
<!--
  GERADO por tools/fichas.mjs. Não edite à mão.

  A marcação não é copiada: esta página busca o fragmento da peça em
  \`pecas/<id>.html\`. Uma fonte só — editar a peça lá muda aqui.
-->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="../tokens/00-primitives.css">
<link rel="stylesheet" href="../tokens/01-semantic.css">
<link rel="stylesheet" href="../base/ybera-base.css">
${folhasAte(n)}
<link rel="stylesheet" href="../icons/ybera-icons.css">
<link rel="stylesheet" href="../doc/doc.css">
<style>
  html,body{margin:0;padding:0}
  body{font-family:var(--yb-font-family-base); font-size:var(--yb-type-body-size);
    line-height:var(--yb-type-body-line); color:var(--yb-text-primary); background:#fff}
  #solo{padding:12px}
  /* o palco da doc tem moldura própria; aqui ela só duplicaria a do iframe */
  #solo .stage{border:0;border-radius:0}
  #solo .demo{margin:0 0 12px}
  #solo .row-label{margin:16px 0 8px}
  /* DOIS DEMOS SEGUIDOS AQUI LEEM COMO UM.
     No quadro o palco perde a moldura — a do iframe basta —, e sobra um
     rotulo de 16px separando duas peças. Na nav isso ficou evidente: as duas
     gavetas abrem com o mesmo logo e o mesmo X, e visitante e logado viraram
     uma gaveta so, de dois cabeçalhos.
     A regua vale do SEGUNDO demo em diante. No primeiro ela seria uma linha
     no topo do quadro, separando a peça de nada. O segundo seletor pega o
     rotulo que vem dentro de um invólucro — .so-gaveta, que existe justamente
     para aparecer so aqui. */
  #solo .stage + .row-label,
  #solo .stage + * > .row-label:first-child{
    margin-block-start:28px; padding-block-start:20px;
    border-block-start:1px solid var(--yb-border-subtle);
  }
  #solo .note{display:none}
</style>
</head>
<body class="ficha" data-nivel="${n.dir}" data-moldura="larga">
<div id="solo"></div>
<script>
(function () {
  'use strict';
  var busca = new URLSearchParams(location.search);
  var alvo = busca.get('c');
  /* UM ESTADO SO. A peca declara estados em divs com data-estado, escondidos
     na ficha — la eles apareceriam empilhados — e revelados aqui um de cada
     vez. E o que permite por dois lado a lado num viewport de celular, que e
     o unico lugar onde alguns estados existem. */
  var estado = busca.get('s');
  var caixa = document.getElementById('solo');

  /* Mede a CAIXA, nao o documento. \`documentElement.scrollHeight\` conta
     elemento \`position:fixed\` dimensionado pela viewport — a gaveta do header
     tem inset-block:0, entao ela crescia junto com o iframe, que crescia junto
     com ela: o quadro do header foi de 157px reais para 1969. */
  function avisarAltura() {
    var r = caixa.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(caixa).paddingBottom) || 0;
    var h = Math.max(120, Math.ceil(r.height + pad));
    try { parent.postMessage({ yb: 'altura', c: alvo, h: h }, '*'); } catch (e) {}
  }

  if (!alvo || !/^[a-z0-9-]+$/.test(alvo)) { caixa.textContent = 'sem peça'; return; }

  fetch('pecas/' + alvo + '.html').then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.text();
  }).then(function (html) {
    var doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    var frag = doc.body.firstElementChild;

    // fica o que é peça renderizada; sai o que é prosa e sai .duo, que é
    // moldura de quadro — copiá-la aqui abriria um iframe dentro do iframe
    Array.prototype.forEach.call(frag.children, function (n) {
      if (n.matches('h2, p.when, .note, .duo')) return;
      if (estado && n.matches('[data-estado]') && n.getAttribute('data-estado') !== estado) return;
      if (estado && !n.matches('[data-estado="' + estado + '"]')) return;
      var c = n.cloneNode(true);
      c.removeAttribute('hidden');
      caixa.appendChild(c);
    });

    var s = document.createElement('script');
    s.src = '../behavior/ybera-behavior.js';
    s.onload = avisarAltura;
    document.body.appendChild(s);

    /* A altura muda tres vezes: quando a marcacao entra, quando as folhas
       aplicam, e quando fonte e imagem chegam. Observar o documentElement nao
       pegava as duas ultimas — 11 dos 18 quadros ficavam na altura padrao. */
    var caixaObs = new ResizeObserver(avisarAltura);
    caixaObs.observe(caixa);
    avisarAltura();
    [60, 200, 600, 1500].forEach(function (t) { setTimeout(avisarAltura, t); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(avisarAltura);
    if (document.readyState === 'complete') avisarAltura();
    else addEventListener('load', avisarAltura);
    Array.prototype.forEach.call(document.images, function (im) {
      if (!im.complete) im.addEventListener('load', avisarAltura, { once: true });
    });
  }).catch(function () { caixa.textContent = 'peça "' + alvo + '" não existe'; });
})();
</script>
</body>
</html>
`;
  gravar(`${n.dir}/solo.html`, solo);
}

if (process.argv.includes('--check')) {
  if (defasadas.length) {
    console.error(`fichas defasadas: ${defasadas.join(', ')} — rode ./build.sh`);
    process.exit(1);
  }
  console.log(`fichas em dia (${pecas.length} peças em ${NIVEIS.length} degraus)`);
} else {
  const semBase = pecas.filter((p) => !p.base);
  if (semBase.length) {
    console.error(`fichas.mjs: sem classe base — ${semBase.map((p) => `${p.nivel.dir}/${p.id}`).join(', ')}`);
    process.exit(1);
  }
  // Um atomo que usa outra peca deixou de ser atomo. A escada e uma afirmacao
  // sobre o codigo, e esta e a linha em que ela se verifica.
  if (vizinhasMortas.length) {
    console.error(`fichas.mjs: doc:vizinha que nao acha a familia na primeira demo — ${vizinhasMortas.join(' · ')}`);
    process.exit(1);
  }
  const impostores = pecas.filter((p) => p.nivel.dir === 'atoms' && p.usa.length);
  if (impostores.length) {
    console.error(`fichas.mjs: átomo que compõe outra peça — ${impostores.map((p) => `${p.id} usa ${p.usa.map((u) => u.id).join('+')}`).join(' · ')}`);
    process.exit(1);
  }
  console.log(`  fichas: ${pecas.length} páginas em ${NIVEIS.length} degraus, ${escritas} reescritas`);
  for (const n of NIVEIS) {
    const f = pecas.filter((p) => p.nivel === n);
    const pend = f.filter((p) => !p.texto.a11y || (!p.texto.faca && !p.texto.naoFaca));
    console.log(`    ${n.titulo.padEnd(11)} ${String(f.length).padStart(2)} peças${pend.length ? ` · ${pend.length} com bloco por escrever` : ''}`);
  }
}
