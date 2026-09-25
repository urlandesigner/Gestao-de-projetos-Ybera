/* ===========================================================================
   A ESCADA — os degraus de componente, num arquivo que não faz nada.

   Ela era uma constante dentro de tools/fichas.mjs, e passou a ser precisa em
   dois lugares: o gerador das fichas e o das páginas de grupo. Importar
   `fichas.mjs` para ler a lista RODARIA o gerador inteiro — o corpo dele
   executa na importação —, e reescrever a lista no segundo arquivo é a cópia
   que diverge no dia em que um degrau nascer.

   Este arquivo não tem efeito nenhum: só exporta a tabela.

   A ordem desta lista É a ordem da cascata, e não um enfeite de documentação:
   `.yb-grid__rail` (organismo) e `.yb-track` (molécula) têm a mesma
   especificidade, e o `display:contents` do trilho só ganha porque a folha dos
   organismos vem depois.
   =========================================================================== */
export const NIVEIS = [
  {
    dir: 'atoms', titulo: 'Átomos', singular: 'átomo', artigo: 'o', base: 'especifica',
    grupo: 'components',
    regra: 'Não usa nenhuma outra peça do sistema. Perde a função se você tirar qualquer parte dele.',
    lede: 'A menor unidade com função própria: o que a pessoa aperta, lê ou preenche.',
  },
  {
    dir: 'molecules', titulo: 'Moléculas', singular: 'molécula', artigo: 'a', base: 'especifica',
    grupo: 'components',
    regra: 'Reúne átomos para resolver UMA tarefa. Não tem lugar fixo na página — cabe onde a tarefa aparecer.',
    lede: 'Átomos reunidos para uma tarefa: um campo com rótulo e erro, um cartão de produto, uma paginação.',
  },
  {
    /* CHAMA-SE "BLOCOS" NA DOC, e "organismo" na escada.

       São a mesma coisa, e os dois nomes existem porque servem a leitores
       diferentes. `organismo` é o termo do atomic design: é ele que está na
       pasta, na folha, na DDR-010 e na coluna do inventário — muda a regra de
       classe base, muda a ordem da cascata, e trocá-lo apagaria a escada.
       `bloco` é o que se lê na tela, e é a palavra que o time usa: "a seção de
       compra", "o bloco do FAQ". Ninguém procura um organismo.

       O termo atômico não some: a página do degrau o declara embaixo do
       título, que é onde ele importa. */
    dir: 'organisms', titulo: 'Blocos', singular: 'bloco', artigo: 'o', base: 'involucro',
    grupo: 'blocks', atomico: 'Organismos',
    regra: 'É uma região da página: tem lugar, e sobrevive sozinho numa tela.',
    lede: 'As regiões da loja: o cabeçalho, a gaveta do carrinho, o bloco de compra, o rodapé. Montam-se com componentes, e trazem o que só existe nelas.',
  },
  {
    dir: 'templates', titulo: 'Templates', singular: 'template', artigo: 'o', base: 'involucro',
    regra: 'O esqueleto da página, sem conteúdo: largura, ritmo e cabeçalho de seção.',
    lede: 'O que toda página herda antes de escolher um organismo sequer.',
    /* POR QUE SÓ HÁ UM AQUI, e por que isto está escrito em vez de calado.

       Este degrau foi montado a partir do CSS — as folhas foram cortadas por
       nível, e em `templates/` ficou o que tinha folha: `.yb-page`,
       `.yb-block`, `.yb-section`. Só o Page layout tem.

       Mas template é ARRANJO, não estilo: pela definição do próprio atomic
       design, os dois degraus de cima são ordem de blocos, e não CSS. Os
       templates de verdade — Home, PDP, Catálogo, FAQ, 404 — existem hoje só
       como as onze telas de exemplo, sem nenhuma página dizendo qual é o
       esqueleto, o que é obrigatório e qual ordem não se inverte. Quem vai
       montar uma PDP nova abre a tela e copia, que é o que um design system
       existe para evitar.

       Quando forem escritos, a ordem dos blocos sai LIDA da tela de exemplo,
       como a API das fichas sai lida da folha. O que se escreve à mão é só o
       que a máquina não sabe: o obrigatório, o opcional e o porquê. */
    planejadas: [
      ['Home', 'Catorze seções na ordem que o time pediu — e as três versões que existem hoje são a mesma pergunta respondida de três jeitos.'],
      ['PDP', 'Breadcrumb, galeria e bloco de compra acima da dobra; acordeão, relacionados e avaliações abaixo. A ordem dos sete níveis de informação é fixa.'],
      ['Catálogo', 'Título, contagem, filtros ativos e grade. A contagem é obrigatória: é ela que diz se vale filtrar mais.'],
      ['FAQ', 'Perguntas em acordeão com índice lateral, e o recorte curto que a home usa.'],
      ['404', 'O único caminho que terminava numa tela que não era nossa.'],
    ],
  },
];

/* O template não é componente: ele é o esqueleto da PÁGINA, e mora no grupo
   Páginas junto com as telas. A escada continua com os quatro porque a
   cascata das folhas tem quatro degraus — mas o menu tem três grupos. */
/* Os degraus que o grupo "Componentes" reúne. ORGANISMO FICOU DE FORA, e é a
   diferença que o menu passou a mostrar: um botão você escolhe dez vezes por
   página, um cabeçalho é um só e já está lá. Misturados numa lista de 50
   nomes, os dois liam como a mesma decisão.

   O corte é o mesmo que o build já cobra — "é uma região da página" —, então
   não há segunda tabela para manter: quem muda de degrau muda de grupo junto. */
export const COMPONENTES = NIVEIS.filter((n) => n.grupo === 'components');
export const BLOCOS = NIVEIS.filter((n) => n.grupo === 'blocks');
export const folhaDo = (n) => `${n.dir}/ybera-${n.dir}.css`;
