#!/usr/bin/env node
/* ===========================================================================
   INVENTÁRIO DE COMPONENTES — derivado, nunca escrito à mão.

   POR QUE ISTO EXISTE: a matriz de completude é o artefato que mais apodrece
   num design system. Alguém escreve "Button — doc ✓ comportamento ✓" numa
   tabela, o componente ganha uma variante seis meses depois, e a tabela passa
   a mentir com a autoridade de um documento oficial.

   Aqui ela é lida da fonte a cada build, como o JSON de tokens. Se a linha
   está errada, o errado é o código — não a tabela.

   Uso:  node tools/inventario.mjs        → escreve INVENTARIO.md
         node tools/inventario.mjs --check → sai 1 se o arquivo estiver defasado
   =========================================================================== */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const talvez = (p) => (existsSync(join(raiz, p)) ? ler(p) : '');

/* --------------------------------------------------------------- fontes */
const FOLHAS = [
  { camada: 'Componente', css: 'components/ybera-components.css', doc: 'components/index.html' },
  { camada: 'Padrão', css: 'patterns/ybera-patterns.css', doc: 'patterns/index.html' },
];

const js = ler('components/ybera-components.js');

// as telas-prova: home e PDP montadas só com o sistema. São a evidência de que
// o componente sobrevive a conteúdo real, e não só ao demo que o autor escolheu.
const provas = ['_captura/nova-loja/index.html', '_captura/nova-loja/pdp.html']
  .filter((p) => existsSync(join(raiz, p)));
const provaHtml = provas.map(talvez).join('\n');

// blocos de regra global — não são componente
const NAO_E_COMPONENTE = /^(YBERA|BASE|MOVIMENTO|UTILIT|ALVO COMPACTO|ALTO CONTRASTE|NAVEGACAO)/i;

/* Mesma leitura que test/validate.mjs faz. Se as duas divergirem, a checagem
   de "componente sem demonstração na doc" e esta tabela contam histórias
   diferentes sobre o mesmo arquivo — e aí não dá para confiar em nenhuma. */
const familiaDe = (corpo) => {
  const conta = new Map();
  for (const m of corpo.matchAll(/(^|[,}])\s*\.(yb-[a-z0-9]+)(?![\w-]*\s*\()/gm))
    conta.set(m[2], (conta.get(m[2]) || 0) + 1);
  for (const m of corpo.matchAll(/(^|[,}])\s*\.(yb-[a-z0-9]+)(__|--)/gm))
    conta.set(m[2], (conta.get(m[2]) || 0) + 2);
  return [...conta.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
};

const marcacaoDe = (html) =>
  html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');

/* ------------------------------------------------------------ inventário */
const linhas = [];

for (const { camada, css: caminho, doc } of FOLHAS) {
  const folha = ler(caminho);
  const html = talvez(doc);
  const marcacao = marcacaoDe(html);
  const blocos = [...folha.matchAll(/\/\*\s*=+\s*\n\s{3}([^\n]+)\n([\s\S]*?)=+\s*\*\//g)];

  for (let i = 0; i < blocos.length; i++) {
    const nome = blocos[i][1].trim().replace(/\s*—.*$/, '');
    if (NAO_E_COMPONENTE.test(nome)) continue;

    const inicio = blocos[i].index + blocos[i][0].length;
    const fim = i + 1 < blocos.length ? blocos[i + 1].index : folha.length;
    const corpo = folha.slice(inicio, fim);
    const familias = familiaDe(corpo);
    if (!familias.length) continue;

    const base = familias[0];
    const raizes = familias.filter((c) => c === base || c.startsWith(base) || base.startsWith(c));
    const semComentario = corpo.replace(/\/\*[\s\S]*?\*\//g, '');

    // variantes: os modificadores `--` que a própria seção declara
    const variantes = new Set(
      [...semComentario.matchAll(/\.(yb-[a-z0-9]+--[a-z0-9-]+)/g)].map((m) => m[1])
    );
    // estados: pseudo-classes e atributos de estado que a seção trata
    const estados = new Set(
      [...semComentario.matchAll(/:(hover|focus-visible|active|checked|disabled)\b/g)]
        .map((m) => m[1])
        .concat(
          [...semComentario.matchAll(/\[(?:aria-)?(disabled|invalid|expanded|current|active|playing)/g)]
            .map((m) => m[1])
        )
    );
    const tokens = new Set(
      [...semComentario.matchAll(/var\(\s*(--yb-[\w-]+)/g)].map((m) => m[1])
    );

    const naDoc =
      raizes.some(
        (c) =>
          new RegExp(`class="[^"]*\\b${c}\\b`).test(marcacao) ||
          new RegExp(`<section id="${c.replace(/^yb-/, '')}s?">`).test(html)
      );

    // comportamento: o JS conhece esta família?
    const temJs = raizes.some(
      (c) => js.includes(c) || js.includes(`data-yb-${c.replace(/^yb-/, '')}`)
    );

    const naProva = raizes.some((c) => new RegExp(`class="[^"]*\\b${c}\\b`).test(provaHtml));

    // acessibilidade declarada NA SEÇÃO: foco visível é o piso do sistema
    const temFoco = /:focus-visible/.test(semComentario);

    /* Foco só é exigível de quem declara o próprio elemento focável. Um padrão
       que compõe `.yb-buybox__actions .yb-btn` herda o foco do botão — cobrar
       dele um `:focus-visible` próprio seria pedir uma segunda regra para o
       mesmo pixel.

       O casamento é por POSIÇÃO DE SELETOR, não por palavra solta: a primeira
       versão procurava `/…|a\b/` no corpo inteiro e marcava o Skeleton — que
       não tem um único elemento focável — como interativo. */
    const FOCAVEL = /(?:^|[\s,>+~(])(?:a|button|input|select|textarea|summary|details|label)(?=[\s,.:#[{>+~)])/m;
    const interativo = FOCAVEL.test(semComentario) || estados.size > 0 || temJs;

    linhas.push({
      nome, base, camada,
      variantes: variantes.size,
      estados: estados.size,
      tokens: tokens.size,
      naDoc, temJs, naProva, temFoco, interativo,
    });
  }
}

linhas.sort((a, b) => (a.camada === b.camada ? a.nome.localeCompare(b.nome) : a.camada < b.camada ? -1 : 1));

/* ------------------------------------------------------------- maturidade
   Três degraus, e cada um é uma AFIRMAÇÃO VERIFICÁVEL, não uma opinião:

     Estável  — documentado, provado em tela real e, se for interativo, com
                foco visível declarado na própria seção.
     Beta     — documentado, mas ainda não sobreviveu a conteúdo real.
     Alfa     — existe no bundle e não está na doc. Vai para produção sem que
                ninguém saiba que existe, e é reescrito pela próxima pessoa.
   ------------------------------------------------------------------------ */
const maturidade = (c) => {
  if (!c.naDoc) return 'Alfa';
  if (c.interativo && !c.temFoco) return 'Beta';
  return c.naProva ? 'Estável' : 'Beta';
};

const sim = (b) => (b ? 'sim' : '—');
const total = linhas.length;
const estaveis = linhas.filter((c) => maturidade(c) === 'Estável').length;
const alfas = linhas.filter((c) => maturidade(c) === 'Alfa').length;

const corpo = `# Inventário de componentes

<!-- GERADO por tools/inventario.mjs. Não edite à mão: rode ./build.sh.
     A fonte é o CSS. Se uma linha aqui está errada, o errado é o código. -->

${total} peças no bundle — ${estaveis} estáveis, ${total - estaveis - alfas} em beta, ${alfas} em alfa.

## Como ler a maturidade

Não é opinião de ninguém. Cada degrau é uma afirmação que a máquina confere a
cada build:

| Degrau | O que foi verificado |
|---|---|
| **Estável** | Aparece na doc · sobreviveu a conteúdo real nas telas-prova · se for interativo, declara \`:focus-visible\` na própria seção |
| **Beta** | Aparece na doc, mas ainda não passou por tela real — ou é interativo e não declara foco |
| **Alfa** | Está no bundle e **não** está na doc. Vai para produção sem que ninguém saiba que existe |

Alfa não é um estágio: é um defeito. Componente que ninguém encontra é
componente que a próxima pessoa reescreve — e aí o sistema tem dois.

## Matriz

| Componente | Classe base | Camada | Maturidade | Variantes | Estados | Tokens | Doc | Foco | Comportamento | Tela real |
|---|---|---|---|---|---|---|---|---|---|---|
${linhas
  .map(
    (c) =>
      `| ${c.nome} | \`.${c.base}\` | ${c.camada} | ${maturidade(c)} | ${c.variantes || '—'} | ${c.estados || '—'} | ${c.tokens} | ${sim(c.naDoc)} | ${c.interativo ? sim(c.temFoco) : 'n/a'} | ${sim(c.temJs)} | ${sim(c.naProva)} |`
  )
  .join('\n')}

## O que cada coluna prova

- **Variantes** — modificadores \`--\` que a seção declara. Zero não é defeito:
  \`yb-price\` não precisa de variante.
- **Estados** — \`:hover\`, \`:focus-visible\`, \`:active\`, \`:checked\`, \`[disabled]\`,
  \`[aria-*]\` tratados na seção. Um controle interativo com zero estados é um
  controle que não responde ao que o dedo e o teclado fazem com ele.
- **Tokens** — quantos tokens distintos a seção consome. Um número baixo demais
  num componente grande costuma significar valor cru escrito à mão; a checagem
  de cor crua em \`test/validate.mjs\` pega a parte que é cor.
- **Foco** — \`n/a\` quando a seção não tem nada focável. Para o resto, foco
  visível é piso do sistema, não enfeite.
- **Comportamento** — o JS conhece esta família. \`—\` quer dizer que ela é CSS
  puro, e isso é o estado preferido: \`<details>\` e \`<dialog>\` entregam teclado
  e leitor de tela sem uma linha nossa.
- **Tela real** — apareceu em \`_captura/nova-loja/\`, montado com conteúdo e
  imagem de verdade. É a diferença entre um componente que funciona e um
  componente que funciona com o texto que o autor escolheu.
`;

const destino = 'INVENTARIO.md';
const conferir = process.argv.includes('--check');

if (conferir) {
  const atual = talvez(destino);
  if (atual !== corpo) {
    console.error(`${destino} está defasado — rode ./build.sh e commite`);
    process.exit(1);
  }
  console.log(`${destino} em dia · ${total} peças`);
} else {
  writeFileSync(join(raiz, destino), corpo);
  console.log(`${destino} · ${total} peças · ${estaveis} estáveis · ${alfas} em alfa`);
}
