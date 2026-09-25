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

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const talvez = (p) => {
  const abs = join(raiz, p);
  if (!existsSync(abs)) return '';
  // pasta de fragmentos: le todos e concatena, que e o que a checagem quer
  if (statSync(abs).isDirectory())
    return readdirSync(abs).filter((f) => f.endsWith('.html'))
      .map((f) => ler(`${p}/${f}`)).join('\n');
  return ler(p);
};

/* --------------------------------------------------------------- fontes */
/* A ESCADA, na ordem dela. A coluna "Camada" desta matriz e o degrau atomico:
   e a mesma lista de tools/fichas.mjs, e as duas tem de contar a mesma
   historia sobre o mesmo arquivo.

   `base/` fica de fora de proposito: reset, corte de movimento e utilitario de
   acessibilidade nao sao peca, e uma linha "Maturidade: alfa" para o `:focus`
   global seria ruido com cara de pendencia.

   A doc de cada degrau e uma PASTA de fragmentos, e nao um index.html: a
   coluna "Doc" pergunta se a familia aparece em ALGUM deles. Apontar para o
   index.html daria "nao" para todas — ele agora e um indice de nomes. */
const FOLHAS = [
  { camada: 'Átomo', css: 'atoms/ybera-atoms.css', doc: 'atoms/pecas' },
  { camada: 'Molécula', css: 'molecules/ybera-molecules.css', doc: 'molecules/pecas' },
  { camada: 'Organismo', css: 'organisms/ybera-organisms.css', doc: 'organisms/pecas' },
  { camada: 'Template', css: 'templates/ybera-templates.css', doc: 'templates/pecas' },
];
// a ordem da escada, e nao a alfabetica: "Átomo, Molécula, Organismo, Template"
// so por acaso quase coincide, e o acaso acaba na primeira peca nova.
const DEGRAU = new Map(FOLHAS.map((f, i) => [f.camada, i]));

const js = ler('behavior/ybera-behavior.js');
// so codigo: `js.includes('yb-iconbtn')` casava um COMENTARIO e a matriz dizia
// "Comportamento: sim" para uma peca que o JS nunca toca.
const jsCodigo = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
// familias cujo gancho nao carrega o nome da classe (o modal abre por data-yb-open)
const GANCHO_POR_FAMILIA = { 'yb-dialog': 'data-yb-open' };

// as telas-prova: home e PDP montadas só com o sistema. São a evidência de que
// o componente sobrevive a conteúdo real, e não só ao demo que o autor escolheu.
const provas = ['pages/index.html', 'pages/pdp.html']
  .filter((p) => existsSync(join(raiz, p)));
const provaHtml = provas.map(talvez).join('\n');

// blocos de regra global — não são componente
const NAO_E_COMPONENTE = /^(YBERA|BASE|MOVIMENTO|UTILIT|ALVO COMPACTO|ALTO CONTRASTE|NAVEGACAO|CARREGANDO)/i;

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

  /* Um bloco chamado `NOME · complemento` e MAIS DO MESMO: a folha o separa
     para poder explica-lo, e nao porque nasceu uma peca. Sem esta juncao o
     `BUTTON · tamanho, painel escuro e carregando` virava a 50a linha da
     matriz, com classe base `.yb-btn` — o Button aparecendo duas vezes e a
     contagem do sistema subindo sozinha. */
    const pedacos = [];
  for (let i = 0; i < blocos.length; i++) {
    const cheio = blocos[i][1].trim().replace(/\s*—.*$/, '');
    const nome = cheio.split(' · ')[0].trim();
    if (NAO_E_COMPONENTE.test(nome)) continue;
    const inicio = blocos[i].index + blocos[i][0].length;
    const fim = i + 1 < blocos.length ? blocos[i + 1].index : folha.length;
    const antes = pedacos.find((x) => x.nome === nome);
    if (antes) antes.corpo += '\n' + folha.slice(inicio, fim);
    else pedacos.push({ nome, corpo: folha.slice(inicio, fim) });
  }

  for (const { nome, corpo } of pedacos) {
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

    /* O segundo ramo cobre a peca que nao aparece na propria demo: o Toast
       nasce de um clique, entao a marcacao da secao dele e feita de BOTOES e
       `.yb-toast` nunca esta escrito la. Antes o ramo procurava
       `<section id="toast">`; com a doc de componente virando um arquivo por
       peca, o que existe agora e `pecas/toast.html`. */
    const nomeCurto = (c) => c.replace(/^yb-/, '');
    const naDoc =
      raizes.some(
        (c) =>
          new RegExp(`class="[^"]*\\b${c}\\b`).test(marcacao) ||
          new RegExp(`<section id="${nomeCurto(c)}s?">`).test(html) ||
          existsSync(join(raiz, `${doc}/${nomeCurto(c)}.html`)) ||
          existsSync(join(raiz, `${doc}/${nomeCurto(c)}s.html`))
      );

    // comportamento: o JS conhece esta família?
    const temJs = raizes.some(
      (c) => jsCodigo.includes(c) || jsCodigo.includes(`data-yb-${c.replace(/^yb-/, '')}`)
        || (GANCHO_POR_FAMILIA[c] && jsCodigo.includes(GANCHO_POR_FAMILIA[c]))
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

linhas.sort((a, b) => (a.camada === b.camada
  ? a.nome.localeCompare(b.nome)
  : DEGRAU.get(a.camada) - DEGRAU.get(b.camada)));

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
