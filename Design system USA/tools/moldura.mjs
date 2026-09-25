#!/usr/bin/env node
/* ===========================================================================
   A MOLDURA — o cabecalho que toda pagina de documentacao carrega.

   POR QUE EXISTE: a doc tinha quatro molduras diferentes. A pagina de tokens
   abria com coluna lateral propria; icones, preview e decision-log abriam com
   um "← Ybera Design System" e mais nada. De qualquer uma delas, o unico
   caminho para qualquer outra era voltar a capa e comecar de novo — e "voltar
   ao inicio para ir a qualquer lugar" e a definicao de navegacao quebrada.

   POR QUE UM ARQUIVO SO: a alternativa era colar o mesmo <header> em dez
   paginas. Copia colada em dez lugares vira nove lugares iguais e um
   esquecido, e o esquecido e sempre o que alguem abre. Aqui o cabecalho tem
   uma fonte, entra nas paginas geradas pelo proprio gerador e nas escritas a
   mao por injecao entre marcadores — e `--check` reprova se alguma divergir.

   O que ele NAO faz: navegar dentro de um degrau. Isso e da coluna lateral. O
   cabecalho responde "em que area do sistema estou"; a coluna responde "qual
   peca deste degrau". Misturar os dois foi a primeira versao, e a coluna
   repetia a escada que o cabecalho ja mostrava.

   Uso:  node tools/moldura.mjs          → injeta nas paginas escritas a mao
         node tools/moldura.mjs --check  → sai 1 se alguma estiver defasada
   =========================================================================== */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { NIVEIS, COMPONENTES, BLOCOS, folhaDo } from './escada.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { anotarUso, mapaDeUso, fichaPorFamilia } from './tokens-uso.mjs';

const raizFs = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raizFs, p), 'utf8');
const versao = (ler('package.json').match(/"version":\s*"([^"]+)"/) || [, '0.0.0'])[1];

/* AS AREAS, AGRUPADAS — e o agrupamento e a parte que importa.

   A primeira versao era uma lista rasa de nove links, e ela mentia: punha
   Tokens, Átomos, Preview e Decisões com o mesmo peso, como se fossem quatro
   coisas do mesmo tipo. Não são, e a divisão é a do próprio atomic design:

     Fundação    — não aparece sozinha na tela. Valor (token) e símbolo
                   (ícone): toda peça consome, nenhuma pessoa vê isolado.
     Componente  — a peça reutilizável e SEM CONTEXTO: átomo, molécula,
                   organismo. Serve a qualquer página porque não sabe em qual
                   está.
     Página      — o contexto. O template é o esqueleto; a página é o esqueleto
                   com o conteúdo real da loja dentro.

   `Preview` e `Decisões` ficam fora dos três de propósito: não se constrói com
   eles. Vão depois de um traço, sem rótulo de grupo, porque rotular utilidade
   como se fosse camada do sistema é o mesmo erro ao contrário.

   `pages/` é a única área que NÃO recebe a moldura: ali dentro a página é a
   loja, e um cabeçalho nosso por cima competiria com o que está em teste. */
export const GRUPOS = [
  { id: 'foundation', rotulo: 'Fundação', href: 'tokens/index.html', hub: true,
    lede: 'Não aparece sozinha na tela. Valor e símbolo: toda peça consome, ninguém vê isolado.',
    dentro: ['tokens', 'icons'] },
  { id: 'components', rotulo: 'Componentes', href: 'components/index.html', hub: true,
    lede: 'A peça reutilizável e sem contexto. Serve a qualquer página porque não sabe em qual está.',
    dentro: ['atoms', 'molecules'] },
  /* `hub: false`: abre a galeria que tools/fichas.mjs já escreve para o degrau.
     O grupo tem UM degrau, então uma página de grupo repetiria a mesma lista de
     quinze com outro título — e lista repetida é a que envelhece pela metade. */
  { id: 'blocks', rotulo: 'Blocos', href: 'organisms/index.html', hub: false,
    lede: 'As regiões da loja. Cada uma tem lugar e existe uma vez por tela.' },
  /* `hub: false` diz que o item do menu NÃO tem página própria gerada aqui —
     ele abre a galeria que tools/fichas.mjs já escreve para o degrau. Gerar
     uma segunda página para dizer "há 1 template, clique aqui" seria a parada
     que não informa nada. */
  { id: 'templates', rotulo: 'Templates', href: 'templates/index.html', hub: false,
    lede: 'O esqueleto da página, sem conteúdo.' },
  /* No menu elas se chamam "Exemplos"; no build, no validador e no inventário
     continuam "telas-prova". Não é descuido: a palavra interna diz o PAPEL, e o
     papel está escrito onde ele é EXERCIDO — a coluna de maturidade do
     INVENTARIO.md, que só chama uma peça de estável depois que ela sobrevive a
     uma destas telas. A lede não repete isso: quem abre esta página quer saber
     o que há nela e o que acontece ao clicar. */
  { id: 'pages', rotulo: 'Exemplos', href: 'pages/index.html', hub: true,
    lede: 'As telas da loja, montadas só com as peças do sistema e o catálogo ao vivo. Abrem em aba nova.',
    dentro: ['telas'] },
];

/* Preview e Decisões NÃO são grupo. Não se constrói com eles, e rotulá-los
   como camada do sistema seria o mesmo erro ao contrário — por isso vêm depois
   de um traço, soltos. */
export const UTEIS = [
  { id: 'preview', rotulo: 'Preview', href: 'preview/index.html' },
  { id: 'decision-log', rotulo: 'Decisões', href: 'decision-log/index.html' },
];

export const AREAS = [...GRUPOS, ...UTEIS];

export const MARCA_ABRE = '<!-- @moldura · gerada por tools/moldura.mjs · não edite -->';
export const MARCA_FECHA = '<!-- /@moldura -->';

/* `raiz` e o prefixo ate a raiz do projeto: '' na capa, '../' em qualquer
   pasta. Nao ha caminho absoluto de proposito — o sistema e publicado dentro
   de uma subpasta no GitHub Pages, e `/atoms/` apontaria para fora dele. */
/* ===========================================================================
   A ÁRVORE — uma coluna só, em toda página.

   Antes havia DUAS navegações: uma barra no topo com cinco áreas e uma coluna
   lateral que só existia nas fichas. Quem estava na página de tokens não tinha
   coluna nenhuma; quem estava numa ficha tinha duas listas diferentes acima e
   ao lado. "Onde eu estou" era respondido em dois lugares, e nenhum deles
   respondia "o que mais existe".

   Agora é uma árvore: grupos que abrem e fecham, com o grupo da página atual
   já aberto. `<details>` nativo — teclado, leitor de tela e Ctrl+F do
   navegador funcionam sem uma linha de JS, e é a mesma escolha que o acordeão
   do sistema já faz.
   =========================================================================== */
/* As nove seções de token, uma por arquivo em `tokens/pecas/`. Eram âncoras
   dentro de uma página de 53 KB: o menu listava nove destinos e os nove
   rolavam a mesma tela. Agora cada uma é página, com vizinho anterior e
   próximo, como as fichas de componente.

   A ORDEM É A DO ARQUIVO, e não alfabética. A doc de token vai de fundamento a
   estado — arquitetura, cor, tipo, espaço, forma, mídia, elevação, estado, uso
   — e alfabetá-la destruiria a única coisa que ela ensina além do valor: a
   ordem em que se aprende. O validador sabe disso: a checagem de sumário
   alfabético vale para catálogo, não para sequência de leitura. */
/* Houve uma 'media' aqui ("Media & control"): quatro familias que nao tinham
   nada em comum alem de terem chegado por ultimo. Cada uma foi para onde se
   procura — proporcao e borda em Shape, altura de controle em Space, medida de
   leitura em Typography, opacidade em State. */
const ORDEM_TOKENS = ['architecture', 'color', 'typography', 'space', 'shape',
                      'elevation', 'state', 'usage'];
const secoesDeTokens = () => ORDEM_TOKENS
  .filter((id) => existsSync(join(raizFs, `tokens/pecas/${id}.html`)))
  .map((id) => {
    const corpo = ler(`tokens/pecas/${id}.html`);
    return {
      id: `tokens-${id}`, arquivo: id, href: `tokens/${id}.html`,
      rotulo: (corpo.match(/<h2>([\s\S]*?)<\/h2>/) || [, id])[1].trim(),
      quando: (corpo.match(/<p class="when">([\s\S]*?)<\/p>/) || [, ''])[1].trim(),
      palco: corpo.slice(corpo.indexOf('</p>', corpo.indexOf('class="when"')) + 4).trim(),
    };
  });

const pecasDoGrupo = (degraus) => degraus.flatMap((x) =>
  readdirSync(join(raizFs, `${x.dir}/pecas`)).filter((f) => f.endsWith('.html'))
    .map((f) => {
      const id = f.replace(/\.html$/, '');
      const corpo = ler(`${x.dir}/pecas/${f}`);
      return {
        href: `${x.dir}/${id}.html`, id: `${x.dir}-${id}`,
        rotulo: (corpo.match(/<h2>([\s\S]*?)<\/h2>/) || [, id])[1].trim(),
      };
    }))
  .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt'));
const pecasDeComponente = () => pecasDoGrupo(COMPONENTES);

export function arvore() {
  return [
    { tipo: 'item', id: 'inicio', rotulo: 'Início', href: 'index.html' },
    { tipo: 'grupo', id: 'foundation', rotulo: 'Fundação', itens: [
      { href: 'tokens/index.html', rotulo: 'Visão geral', id: 'foundation' },
      ...secoesDeTokens(),
      { href: 'icons/index.html', rotulo: 'Ícones', id: 'icons' },
    ] },
    /* Sem "Visão geral" aqui, e só aqui. Nos outros grupos ela abre uma página
       que diz algo que a coluna não diz — o `base/` na Fundação, a lista de
       telas nos Exemplos. Em Componentes ela seria o mesmo conteúdo duas
       vezes: a coluna já lista as 48 peças, e o catálogo lista as mesmas 48.

       A página continua existindo e continua alcançável: ela é o primeiro
       item da trilha de toda ficha (`Componentes / Átomos / Button`) e um
       azulejo da capa. O que sai é a linha que repetia o que estava logo
       abaixo dela. */
    { tipo: 'grupo', id: 'components', rotulo: 'Componentes', itens: pecasDeComponente() },
    /* Blocos vem DEPOIS de Componentes, e não antes: a ordem da coluna é a
       ordem em que se monta uma tela — a peça existe antes da região que a
       usa. É a mesma ordem da cascata. */
    { tipo: 'grupo', id: 'blocks', rotulo: 'Blocos', itens: pecasDoGrupo(BLOCOS) },
    /* Templates fica FORA da coluna por enquanto. O degrau existe — a folha
       `templates/ybera-templates.css` carrega na cascata e o Page layout tem
       ficha —, mas no menu ele seria uma promessa: um item com uma peça e uma
       lista de cinco esqueletos por escrever. Continua alcançável pela capa,
       que é onde a pendência segue declarada. */
    { tipo: 'grupo', id: 'pages', rotulo: 'Exemplos', itens: [
      { href: 'pages/index.html', rotulo: 'Visão geral', id: 'pages' },
      ...TELAS.map(([arq, nome]) => ({ href: `pages/${arq}`, rotulo: nome, id: `tela-${arq}`, externa: true })),
    ] },
    { tipo: 'item', id: 'preview', rotulo: 'Preview', href: 'preview/index.html' },
    /* Princípios, Decisões, Inventário, Contribuindo e Changelog NÃO estão na
       coluna. Eles são documentos de processo — quem escreve o sistema os
       consulta, quem usa o sistema não —, e na coluna ocupavam cinco linhas
       permanentes ao lado das 50 peças que são o assunto da página. Continuam
       na capa, que é a porta de quem vem pelo processo. */
  ];
}

/* `grupo` força qual grupo nasce aberto quando NENHUM item é a página atual.
   É o caso da página de tokens: a árvore lista as nove seções dela, e a página
   aberta é todas as nove ao mesmo tempo — acender uma seria mentira, e acender
   "Visão geral" (que é outra página) era a mentira que estava no ar. */
export function cabecalho({ raiz, atual, grupo }) {
  /* As telas abrem em ABA NOVA, e só elas. Elas são a loja inteira, sem a
     coluna e sem o topo — abrindo no lugar, a pessoa perde a navegação e o
     caminho de volta é o botão do navegador. O aviso existe porque abrir uma
     aba sem dizer é a reclamação clássica de leitor de tela: o foco vai para
     um documento que ninguém anunciou. */
  const fora = ' target="_blank" rel="noopener"';
  const aviso = '<span class="ds-sr-only"> (abre em nova aba)</span>';
  const link = (x) =>
    `      <li><a href="${raiz}${x.href}"${x.id === atual ? ' aria-current="page"' : ''}${x.externa ? fora : ''}>${x.rotulo}${x.externa ? aviso : ''}</a></li>`;
  const bloco = (n, icone) => {
    /* Item solto tem a MESMA anatomia de um grupo: chip, rótulo no mesmo x, a
       mesma altura de linha. Ele nasceu sem chip e com cor de item ativo, e o
       resultado era uma linha que parecia de outra lista — mais escura que os
       grupos fechados e com o texto 44px à esquerda deles. Eles são irmãos dos
       grupos, não filhos; o que os distingue é não ter o que abrir. */
    if (n.tipo === 'item')
      return `  <ul class="ds-nav__solta">
    <li><a href="${raiz}${n.href}"${n.id === atual ? ' aria-current="page"' : ''}>${icone(n.id)}${n.rotulo}</a></li>
  </ul>`;
    /* O grupo da página aberta nasce aberto, e só ele: abrir todos devolveria o
       rolo de setenta nomes que a árvore existe para evitar. */
    const aqui = n.id === grupo || n.id === atual || n.itens.some((x) => x.id === atual);
    return `  <details class="ds-nav__grupo"${aqui ? ' open' : ''}>
    <summary>${icone(n.id)}${n.rotulo}</summary>
    <ul>
${n.itens.map(link).join('\n')}
    </ul>
  </details>`;
  };
  /* O TOPO leva a marca e a busca; a COLUNA leva a árvore. A marca sai da
     coluna porque ela é do sistema inteiro, não da navegação — e a busca sobe
     junto porque procura em tudo, não só no que o grupo aberto mostra.

     Os ícones dos grupos são desenhados aqui, e não tirados de
     `icons/ybera-icons.svg`: aquele sprite é o da LOJA, e o argumento dele é o
     peso — "40 símbolos, 9,3 KB contra 380 KB". Enfiar três ícones de
     documentação lá dentro engordaria o que vai para o Shopify para decorar
     uma página que o cliente nunca vê. */
  const ICONE = {
    inicio: '<path d="M2.5 7 8 2.5 13.5 7"/><path d="M4 6.5V13h8V6.5"/><path d="M6.5 13V9.5h3V13"/>',
    foundation: '<path d="M2 5.5 8 3l6 2.5L8 8 2 5.5Z"/><path d="M2 8.8 8 11.3l6-2.5"/><path d="M2 12l6 2.5 6-2.5"/>',
    components: '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>',
    blocks: '<rect x="2" y="2.5" width="12" height="3" rx="1"/><rect x="2" y="6.8" width="12" height="3" rx="1"/><rect x="2" y="11.1" width="12" height="2.4" rx="1"/>',
    templates: '<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6h12"/><path d="M6 6v7.5"/>',
    pages: '<rect x="1.5" y="3.5" width="9" height="9" rx="1.5"/><path d="M5.5 3.5V1.5h9v9h-2"/>',
    referencia: '<path d="M3 2.5h6.5L13 6v7.5H3z"/><path d="M9.5 2.5V6H13"/><path d="M5.5 9h5"/><path d="M5.5 11h3"/>',
    preview: '<rect x="1.5" y="3" width="13" height="8.5" rx="1.5"/><path d="M5.5 14h5"/><path d="M8 11.5V14"/>',
    'decision-log': '<path d="M3 2.5h7.5L13 5v8.5H3z"/><path d="M10 2.5V5h3"/><path d="M5.5 8.5l1.5 1.5 3-3"/>',
  };
  const icone = (id) => ICONE[id]
    ? `<svg class="ds-nav__icone" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONE[id]}</svg>`
    : '';
  return `${MARCA_ABRE}
<header class="ds-top">
  <a class="ds-top__marca" href="${raiz}index.html">Ybera <b>Design System <span class="ds-top__usa">USA</span></b></a>
  <div class="ds-top__busca" hidden>
    <label class="ds-sr-only" for="ds-filtro">Buscar no design system</label>
    <input id="ds-filtro" type="search" placeholder="Buscar…"
           autocomplete="off" data-yb-filtro>
    <p class="nav-conta" role="status" aria-live="polite"></p>
  </div>
  <p class="ds-top__versao">v${versao}</p>
</header>
<nav class="ds-nav" aria-label="Navegação do design system">
${arvore().map((n) => bloco(n, icone)).join('\n')}
</nav>
${MARCA_FECHA}`;
}

/* ===========================================================================
   AS PÁGINAS DE GRUPO — uma por tipo, geradas.

   Elas existem porque o menu precisava de cinco itens em vez de nove links e
   três rótulos, e item de menu sem página atrás é rótulo clicável que não leva
   a lugar nenhum. Mas cada uma tem o que dizer, e não é só uma lista de
   atalhos:

   - Fundação documenta o `base/`, que carregava em toda peça e não tinha
     página em lugar nenhum da doc.
   - Componentes explica a escada e mostra o funil de uma vez — 12 / 21 / 15 —,
     que estava espalhado pelas ledes de três galerias.
   - Páginas separa o esqueleto da tela, que é a distinção que as pessoas mais
     erram, e é a única lista das onze telas fora da capa.

   Tudo aqui é contado do disco. Número escrito à mão numa página de índice é o
   primeiro a envelhecer.
   =========================================================================== */
const contar = (dir) => existsSync(join(raizFs, dir))
  ? readdirSync(join(raizFs, dir)).filter((f) => f.endsWith('.html')).length : 0;

/* OS CHIPS DO DEGRAU — a separação entre peça e região da página.

   O catálogo é UMA lista em ordem de nome, e continua sendo: ninguém pensa
   "preciso de uma molécula", pensa "preciso de um campo com erro". Mas nessa
   lista o Button e o Buy box liam como a mesma espécie de coisa, e não são:
   um não usa nenhuma outra peça, o outro é uma região da página. A distinção
   já existia — é a pasta, é a ordem da cascata, é a regra que o build cobra —
   e já filtrava (digitar "organismo" na busca do topo dá as 14 regiões). Só
   não estava à vista de quem não adivinhasse a palavra.

   Os chips são LINKS para as páginas de degrau, que já existem e já dizem a
   regra. Não são botão de filtro: filtro sem script é controle morto, e esta
   página já teve um — o campo `.grade-filtro`, que nascia `hidden` e nunca
   era revelado porque o doc.js pega o PRIMEIRO `[data-yb-filtro]` do
   documento, que é sempre a busca do topo.

   Templates fica de fora, como já fica do catálogo e da coluna: um degrau com
   uma peça e cinco esqueletos por escrever seria uma promessa no meio de uma
   contagem. Ele continua alcançável pelo passo a passo no rodapé da página de
   Organismos. */
export function chipsDeDegrau(atual, raiz = '../') {
  if (!['components', ...COMPONENTES.map((x) => x.dir)].includes(atual)) return '';
  const total = COMPONENTES.reduce((s, x) => s + contar(`${x.dir}/pecas`), 0);
  const chip = (id, href, rotulo, n) =>
    `    <a class="chip" href="${raiz}${href}"${id === atual ? ' aria-current="page"' : ''}>${rotulo} <span>${n}</span></a>`;
  return `  <nav class="chips" aria-label="Degraus do sistema">
${chip('components', 'components/index.html', 'Todos', total)}
${COMPONENTES.map((x) => chip(x.dir, `${x.dir}/index.html`, x.titulo, contar(`${x.dir}/pecas`))).join('\n')}
  </nav>`;
}

/* As onze telas. A tabela é literal e o build QUEBRA se uma tela nova não
   entrar nela — nome de arquivo não é nome de tela, e derivar do `<title>`
   traria o título de marketing da loja ("Ybera Paris USA | Keratin care…"). */
const TELAS = [
  ['home.html', 'Home v1'], ['index-v2.html', 'Home v2'], ['index-v3.html', 'Home v3'],
  ['index-logado.html', 'Home · cliente logado'],
  ['pdp.html', 'PDP'], ['pdp-influencer.html', 'PDP link influencer'],
  ['pdp-esgotado.html', 'PDP esgotada'],
  ['pdp-variante.html', 'PDP com variante'], ['pdp-oferta.html', 'PDP em promoção'],
  ['faq.html', 'FAQ'], ['404.html', '404'],
];

const cartao = (href, nome, conta, linha, externa) =>
  `      <a class="peca" href="${href}"${externa ? ' target="_blank" rel="noopener"' : ''}>
        <b>${nome}${conta == null ? '' : ` <span class="grade-conta">${conta}</span>`}</b>
        <span>${linha}</span>${externa ? '\n        <span class="ds-sr-only">(abre em nova aba)</span>' : ''}
      </a>`;

function corpoDoGrupo(g) {
  if (g.id === 'foundation') {
    const tokens = existsSync(join(raizFs, 'dist/ybera-tokens.json'))
      ? (ler('dist/ybera-tokens.json').match(/"\$value"/g) || []).length : 0;
    const icones = existsSync(join(raizFs, 'icons/ybera-icons.svg'))
      ? (ler('icons/ybera-icons.svg').match(/<symbol id=/g) || []).length : 0;
    /* As seções DE DENTRO da página de tokens, e não um cartão que leva a ela:
       um índice cujo item é "Tokens" não informa nada que o menu já não tenha
       dito — é uma parada no caminho. Aqui a pessoa já vê que existe uma seção
       de cor, uma de tipo e uma de estado, e cai direto na que procurava.

       Título e primeira frase saem da própria página de tokens. Reescrevê-los
       aqui seria a segunda fonte que diverge no dia em que uma seção mudar de
       nome — e, pior, o link continuaria funcionando, então ninguém veria. */
    /* A página desta visão geral MORA em `tokens/`, então os cartões apontam
       para os irmãos dela — `color.html`, não `../tokens/color.html`. */
    const secoes = secoesDeTokens().map((s) => ({
      ...s,
      frase: (s.quando.match(/^(.*?[.!?])(\s|$)/) || [, s.quando])[1],
    }));
    return `  <div class="facts">
    <span class="fact"><b>33</b> degraus de cor validados</span>
    <span class="fact"><b>11</b> papéis tipográficos</span>
    <span class="fact"><b>1</b> família — Schibsted Grotesk</span>
    <span class="fact">contraste <b>medido</b>, não estimado</span>
  </div>

  <section class="grade-grupo">
    <h2>Tokens <span class="grade-conta">${tokens}</span></h2>
    <p class="grade-lede">O vocabulário do sistema em três camadas: primitivo, semântico
    e de componente. ${secoes.length} seções, uma página cada — a ordem vai de
    fundamento a estado, e é a ordem em que se aprende.</p>
    <div class="grade">
${secoes.map((s) => cartao(`${s.arquivo}.html`, s.rotulo, null, s.frase)).join('\n')}
    </div>
  </section>

  <section class="grade-grupo">
    <h2>Ícones <span class="grade-conta">${icones}</span></h2>
    <p class="grade-lede">Não são token, e é por isso que estão do lado e não dentro:
    token é <b>valor</b> — um número, uma cor, uma duração —, e ícone é <b>ativo</b>,
    um traçado. O que os põe na mesma prateleira é só o fato de toda peça consumir
    os dois sem que ninguém os veja isolados.</p>
    <div class="grade">
${cartao('../icons/index.html', 'A galeria', icones, 'Grade de 24×24, traço 1,5. Herdam a cor do texto — nenhum ícone tem token de cor próprio.')}
    </div>
  </section>`;
  }

  if (g.id === 'components') {
    /* UMA LISTA, EM ORDEM DE NOME. Não por degrau — e isso é deliberado.

       Os níveis atômicos são excelentes para construir e para verificar: aqui
       eles são as pastas, a ordem da cascata e a regra que o build cobra
       (átomo que compõe outra peça reprova). Como eixo de NAVEGAÇÃO, são a
       pergunta errada: ninguém pensa "preciso de uma molécula", pensa "preciso
       de um campo com erro".

       Conferido em 24/09/2026, e nenhum dos grandes expõe o degrau no menu.
       São duas escolas: lista única em ordem de nome com filtro (Carbon,
       Primer, USWDS — este com contagem ao vivo, "47 components found") ou
       grupos por FUNÇÃO (Material 3, Apple HIG, Atlassian). A segunda escola
       tem um preço visível: o Material termina com um balde chamado "All
       other components".

       O único corte por NÍVEL que sobrevive num sistema grande é o do
       Atlassian, e é um só: "Primitives" (Box, Stack, Inline, Grid, Text)
       separado dos componentes. Um degrau, não três.

       O degrau agora é a PRIMEIRA linha do cartão, e não a última: "que espécie
       de coisa é essa?" é a pergunta que vem antes do nome, e no rodapé ela era
       respondida depois da descrição inteira. E os chips acima da grade dão o
       corte em um clique, sem partir a lista em três páginas. */
    const n = (d) => contar(`${d}/pecas`);
    const pecas = COMPONENTES.flatMap((x) =>
      readdirSync(join(raizFs, `${x.dir}/pecas`)).filter((f) => f.endsWith('.html'))
        .map((f) => {
          const corpo = ler(`${x.dir}/pecas/${f}`);
          const id = f.replace(/\.html$/, '');
          return {
            id, dir: x.dir, nivel: x.singular,
            titulo: (corpo.match(/<h2>([\s\S]*?)<\/h2>/) || [, id])[1].trim(),
            quando: (corpo.match(/<p class="when">([\s\S]*?)<\/p>/) || [, ''])[1]
              .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
          };
        }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt'));

    return `${chipsDeDegrau('components')}

  <section class="grade-grupo">
    <h2>Todos os componentes <span class="grade-conta">${pecas.length}</span></h2>
    <p class="grade-lede">Em ordem de nome, os dois degraus juntos — ${COMPONENTES.map((x) => `${n(x.dir)} ${x.titulo.toLowerCase()}`).join(' e ')}.
    A proporção ${COMPONENTES.map((x) => n(x.dir)).join(' / ')} é o que diz se o sistema está
    saudável: base larga. Poucos átomos para muitas moléculas significa que alguém está
    reescrevendo botão. As regiões da página estão em <a href="../organisms/index.html">Blocos</a>.</p>
    <div class="grade">
${pecas.map((x) => `      <a class="peca" href="../${x.dir}/${x.id}.html">
        <span class="peca-nivel">${x.nivel}</span>
        <b>${x.titulo}</b>
        <span>${x.quando}</span>
      </a>`).join('\n')}
    </div>
  </section>`;
  }

  /* Sem `grade-lede` aqui. A lede do topo já disse o que são e o que acontece
     ao clicar; este segundo parágrafo repetia as duas coisas e ainda empurrava
     a grade para baixo da dobra. Um título com contagem, e a grade. */
  return `  <section class="grade-grupo">
    <h2>As telas <span class="grade-conta">${TELAS.length}</span></h2>
    <div class="grade">
${TELAS.map(([a, nome]) => cartao(a, nome, null, a, true)).join('\n')}
    </div>
  </section>`;
}

export function paginaDeGrupo(g, extra) {
  const raiz = '../';
  return `<!doctype html>
<html lang="pt-BR" data-market="us">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${g.rotulo} — Ybera Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="${raiz}tokens/00-primitives.css">
<link rel="stylesheet" href="${raiz}tokens/01-semantic.css">
<link rel="stylesheet" href="${raiz}base/ybera-base.css">
<link rel="stylesheet" href="${raiz}doc/doc.css">
<link rel="stylesheet" href="${raiz}doc/doc-nav.css">${extra || ''}
<script src="${raiz}doc/doc.js" defer></script>
<style>
.ficha{margin:0; background:var(--yb-bg-page); color:var(--yb-text-primary);
  font-family:var(--yb-font-family-base); font-size:var(--yb-type-body-size);
  line-height:var(--yb-type-body-line); -webkit-font-smoothing:antialiased}
.ficha code{font-family:var(--yb-font-family-mono); font-size:var(--yb-type-caption-size)}
/* Página de grupo não tem coluna lateral: ela É o sumário do grupo. */
.grupo-main{max-width:var(--doc-medida); margin-inline:auto;
  padding:var(--yb-space-8) var(--doc-respiro) var(--yb-space-20)}
@media (max-width:900px){.grupo-main{padding:var(--yb-space-10) var(--doc-respiro)}}
</style>
</head>
<body class="ficha" data-moldura="centrada">
${cabecalho({ raiz, atual: g.id })}
<main class="grupo-main">
  <a class="ficha-volta" href="${raiz}index.html">← Design system</a>
  <h1 class="ficha-titulo">${g.rotulo}</h1>
  <p class="ficha-quando">${g.lede}</p>

${corpoDoGrupo(g)}

  <p class="doc-credit">Página gerada por <code>tools/moldura.mjs</code>. Os números
  são contados do disco a cada build. Não edite este arquivo à mão — rode
  <code>./build.sh</code>.</p>
</main>
</body>
</html>
`;
}

/* ============================================ AS PÁGINAS DE TOKEN
   Uma por seção, com a mesma moldura das fichas: trilha, vizinho anterior e
   próximo, e o índice da própria página quando ela tem sub-blocos. O conteúdo
   vem inteiro do fragmento — nada é reescrito aqui. */
/* Os dois mapas sao caros (leem as cinco folhas da escada e as 58 fichas) e
   nao mudam entre as oito paginas. Preguicosos porque `tools/fichas.mjs`
   importa este modulo so pelo cabecalho: monta-los na carga faria o gerador de
   fichas pagar por um indice que ele nao usa — e, pior, le-lo das fichas que
   ele mesmo ainda esta escrevendo. */
let _uso = null, _fichas = null;
const indiceDeUso = () => (_uso ||= mapaDeUso());
const indiceDeFichas = () => (_fichas ||= fichaPorFamilia());

export function paginaDeToken(s, ant, prox) {
  const raiz = '../';
  /* QUEM USA CADA TOKEN, anotado aqui e nao escrito no fragmento: a lista muda
     a cada regra de CSS que alguem escreve, e mantida a mao ela mentiria em
     uma semana. Ver tools/tokens-uso.mjs. */
  const palco = anotarUso(s.palco, { uso: indiceDeUso(), fichas: indiceDeFichas() });
  return `<!doctype html>
<html lang="pt-BR" data-market="us">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${s.rotulo} — Ybera Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="${raiz}tokens/00-primitives.css">
<link rel="stylesheet" href="${raiz}tokens/01-semantic.css">
<link rel="stylesheet" href="${raiz}base/ybera-base.css">
<link rel="stylesheet" href="${raiz}doc/doc.css">
<link rel="stylesheet" href="${raiz}doc/doc-nav.css">
<link rel="stylesheet" href="doc-tokens.css">
<script src="${raiz}doc/doc.js" defer></script>
<style>
.ficha{margin:0; background:var(--yb-bg-page); color:var(--yb-text-primary);
  font-family:var(--yb-font-family-base); font-size:var(--yb-type-body-size);
  line-height:var(--yb-type-body-line); -webkit-font-smoothing:antialiased}
.ficha code{font-family:var(--yb-font-family-mono); font-size:var(--yb-type-caption-size)}
</style>
</head>
<body class="ficha" data-moldura="centrada">
${cabecalho({ raiz, atual: s.id })}
<main class="main">
  <div class="ficha-topo">
    <nav class="ficha-trilha" aria-label="Você está aqui">
      <a href="index.html">Fundação</a>
      <span aria-hidden="true">/</span>
      <b aria-current="page">${s.rotulo}</b>
    </nav>
    <nav class="ficha-passo" aria-label="Seção anterior e próxima">
      ${ant ? `<a href="${ant.arquivo}.html" rel="prev"><span aria-hidden="true">←</span> ${ant.rotulo}</a>` : '<span></span>'}
      ${prox ? `<a href="${prox.arquivo}.html" rel="next">${prox.rotulo} <span aria-hidden="true">→</span></a>` : '<span></span>'}
    </nav>
  </div>
  <h1 class="ficha-titulo">${s.rotulo}</h1>
  <p class="ficha-quando">${s.quando}</p>

${palco}

  <p class="doc-credit">Página gerada por <code>tools/moldura.mjs</code> a partir de
  <code>tokens/pecas/${s.arquivo}.html</code>. Não edite este arquivo à mão — rode
  <code>./build.sh</code>.</p>
</main>
</body>
</html>
`;
}

const FOLHA = 'doc/doc-nav.css';

/* As paginas escritas a mao. As geradas (as 4 galerias e as 49 fichas) recebem
   o cabecalho de tools/fichas.mjs, que importa a mesma funcao daqui. */
/* `atual` e o GRUPO, e nao a pagina: a barra so tem cinco itens, entao estar em
   `tokens/` marca "Fundação". Quem diz em que ponto do grupo a pessoa esta e a
   coluna lateral, que e de cada area. */
const ESCRITAS = [
  { arq: 'index.html', raiz: '', atual: 'inicio', moldura: 'centrada' },
  { arq: 'icons/index.html', raiz: '../', atual: 'icons', moldura: 'centrada' },
  { arq: 'preview/index.html', raiz: '../', atual: 'preview', moldura: 'larga' },
  { arq: 'decision-log/index.html', raiz: '../', atual: 'decision-log', moldura: 'centrada' },
];

/* `tokens/index.html` NÃO está aqui: ela virou a página do grupo Fundação, e é
   gerada inteira. Enquanto esteve nas duas listas, cada passada desfazia a
   outra — o gerador escrevia a página e o injetor a reescrevia com a coluna
   aplicada por cima, e o `--check` da passada seguinte acusava defasagem que o
   build "consertava" para ficar defasada de novo.

   `larga` para as páginas de duas colunas (a ficha e a de tokens, onde a
   coluna lateral começa na borda) e para o preview, que é uma bancada de
   iframes de ponta a ponta. `centrada` para as que têm uma coluna de leitura
   no meio. O atributo mora no <body> porque é do LAYOUT da página, e não do
   cabeçalho — o cabeçalho é idêntico em todas, e é uma checagem que isso
   continue verdade. */
function aplicar(html, { raiz, atual, grupo, moldura }) {
  const barra = cabecalho({ raiz, atual, grupo });
  const i = html.indexOf(MARCA_ABRE);
  if (i !== -1) {
    const f = html.indexOf(MARCA_FECHA, i) + MARCA_FECHA.length;
    html = html.slice(0, i) + barra + html.slice(f);
  } else {
    // primeira vez: entra logo depois do <body>, antes de qualquer conteudo
    const m = html.match(/<body[^>]*>\n?/);
    if (!m) throw new Error('sem <body>');
    const corte = m.index + m[0].length;
    html = html.slice(0, corte) + barra + '\n' + html.slice(corte);
  }
  // e a folha da coluna, que so ela usa
  html = html.replace(new RegExp(`\\s*<link rel="stylesheet" href="[^"]*doc-header\\.css">`), '');
  const link = `<link rel="stylesheet" href="${raiz}${FOLHA}">`;
  if (!html.includes(link)) html = html.replace('</head>', `${link}\n</head>`);
  /* E o comportamento dela. Sem esta linha a busca do topo nascia `hidden` e
     nunca acendia nas páginas escritas à mão — o campo existia no HTML e
     ninguém nunca o viu, que é pior do que não existir. */
  const js = `<script src="${raiz}doc/doc.js" defer></script>`;
  if (!html.includes(js)) html = html.replace('</head>', `${js}\n</head>`);
  if (moldura) {
    html = html.replace(/<body([^>]*)>/, (m, attrs) =>
      `<body${attrs.replace(/\s*data-moldura="[^"]*"/, '')} data-moldura="${moldura}">`);
  }
  return html;
}

/* `pathToFileURL` e nao `file://` + caminho: o projeto mora em "Design system
   USA", com espaco, e `import.meta.url` traz ele como %20. A comparacao crua
   dava falso e o arquivo inteiro virava um modulo que nunca fazia nada — sem
   erro, sem saida, sem cabecalho em pagina nenhuma. */
// `process.argv[1] &&` porque quem IMPORTA este módulo pode não ter argv[1]
// (`node -e`, um teste): sem a guarda, `pathToFileURL(undefined)` derruba a
// importação inteira antes de exportar qualquer coisa.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checando = process.argv.includes('--check');
  const defasadas = [];
  let escritas = 0;

  // as telas da tabela tem de existir, e toda tela tem de estar na tabela
  const noDisco = existsSync(join(raizFs, 'pages'))
    ? readdirSync(join(raizFs, 'pages')).filter((f) => f.endsWith('.html') && f !== 'index.html') : [];
  const soNaTabela = TELAS.map(([a]) => a).filter((a) => !noDisco.includes(a));
  const soNoDisco = noDisco.filter((a) => !TELAS.some(([x]) => x === a));
  if (soNaTabela.length || soNoDisco.length) {
    console.error(`moldura.mjs: TELAS desencontrada — ${[
      soNaTabela.length && `na tabela e não no disco: ${soNaTabela.join(', ')}`,
      soNoDisco.length && `no disco e sem nome: ${soNoDisco.join(', ')}`,
    ].filter(Boolean).join(' · ')}`);
    process.exit(1);
  }

  const secoes = secoesDeTokens();
  for (let i = 0; i < secoes.length; i++) {
    const destino = `tokens/${secoes[i].arquivo}.html`;
    const pagina = paginaDeToken(secoes[i], secoes[i - 1], secoes[i + 1]);
    const atual = existsSync(join(raizFs, destino)) ? ler(destino) : '';
    if (atual === pagina) continue;
    if (checando) defasadas.push(destino);
    else { writeFileSync(join(raizFs, destino), pagina); escritas++; }
  }

  for (const g of GRUPOS.filter((x) => x.hub)) {
    const destino = g.href;
    const pagina = paginaDeGrupo(g, g.id === 'foundation'
      ? '\n<link rel="stylesheet" href="doc-tokens.css">' : '');
    const atual = existsSync(join(raizFs, destino)) ? ler(destino) : '';
    if (atual === pagina) continue;
    if (checando) defasadas.push(destino);
    else { writeFileSync(join(raizFs, destino), pagina); escritas++; }
  }

  for (const p of ESCRITAS) {
    if (!existsSync(join(raizFs, p.arq))) { defasadas.push(`${p.arq} ausente`); continue; }
    const antes = ler(p.arq);
    const depois = aplicar(antes, p);
    if (antes === depois) continue;
    if (checando) defasadas.push(p.arq);
    else { writeFileSync(join(raizFs, p.arq), depois); escritas++; }
  }
  if (checando) {
    if (defasadas.length) {
      console.error(`moldura defasada: ${defasadas.join(', ')} — rode ./build.sh`);
      process.exit(1);
    }
    console.log(`moldura em dia (${GRUPOS.filter((x) => x.hub).length} grupos + ${secoes.length} tokens + ${ESCRITAS.length} à mão)`);
  } else {
    console.log(`  moldura: ${GRUPOS.filter((x) => x.hub).length} grupos + ${secoes.length} tokens + ${ESCRITAS.length} à mão, ${escritas} reescritas`);
  }
}
