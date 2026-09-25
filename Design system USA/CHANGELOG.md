# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento descrito em [GOVERNANCA.md](GOVERNANCA.md).

## [Unreleased]

Entradas de 2026-09-10 a 2026-09-16 que ainda não receberam número. Pela
[GOVERNANCA.md](GOVERNANCA.md), componente novo pede versão **menor** (0.13.0).

### Adicionado

- **A aba Anatomia ganhou o desenho: a peça com um número em cada parte**, no
  formato do outro design system da casa. A lista de classes e tokens responde
  "o que existe na API"; não responde "o que é cada pedaço e para que serve",
  que é a primeira pergunta de quem chega.
  O palco é a **própria peça** — o mesmo recorte que a aba Componente mostra e
  que o bloco Marcação entrega para copiar. Desenho à parte envelheceria
  sozinho, e passaria a contar a versão antiga com autoridade de documentação.
  **O número fica na margem e um fio tracejado vai até a parte.** Colado no canto
  do elemento ele cobria justamente o que apontava — no alerta, três números
  caíam em cima do título. O fio tem dois joelhos, e não uma diagonal: desce e
  entra reto, que lê como chamada de desenho técnico. Quem atravessa a peça
  inteira é ancorado em cima, com fio vertical: o container tem a largura toda,
  então não há margem "mais perto" dele. Posição e fios são medidos no navegador
  e redesenhados a cada reflow — coordenada escrita à mão mente na primeira
  largura diferente. Partes que disputam a mesma altura se abrem em torno dela,
  em vez de empilhar para baixo, senão a terceira cai fora da própria peça.
  Passar o mouse na legenda acende a parte, e vice-versa.
  Os fios correm **por cima** da peça: atrás dela o tracejado sumia na borda do
  cartão e o número apontava para o lado do componente em vez de para a parte.
  A perna vertical fica na calha, fora da peça, e o que entra é só uma reta na
  altura exata do elemento, terminando na borda dele. Ancorado no topo fica **só
  o container**: a regra era "quem tem a largura toda", e no cartão de oferta
  três filhos têm — desfoque, link e ação —, então três fios verticais desciam a
  foto inteira. E a anatomia aceita declarar a largura da peça: o cartão de
  oferta vive numa grade de colunas de 266px, e solto no palco esticava para
  560 — o desenho passava a explicar um cartão que a loja não tem.
  Escrito à mão só o texto de cada parte, em `fichas.json` — "obrigatório, uma
  linha" não está em lugar nenhum do código. **As 40 peças do menu Componentes
  estão desenhadas** (19 átomos e 21 moléculas), 125 partes ao todo; os 18
  blocos e o template levam o ponto de pendência na tira da aba, como Regras de
  uso e Acessibilidade já levam.
  Duas coisas saíram do caminho para isso. O recorte da primeira demo não casava
  quando a `<div class="demo">` levava `style` ou `data-` na abertura, e Input,
  Select, Textarea e Dropdown diziam "Sem demonstração de onde extrair" numa
  ficha que tem demonstração logo acima. E as galerias de átomo demonstram por
  fileira — quatro botões, cada um com o modificador escrito embaixo: o palco
  agora pega **a primeira amostra**, sem o rótulo de modificador, senão o
  desenho poria quatro cópias da peça com os fios apontando para uma.
  Os `id`, `for`, `name` e `aria-*` do recorte entram prefixados com `anat-`:
  é a segunda cópia da mesma marcação na página, e sem isso dois grupos de rádio
  com o mesmo `name` viram um grupo só — clicar aqui desmarcaria a demo da outra
  aba.
- **Bloco Hero** (`.yb-hero`): o topo da home — Banners hero num Track, um por
  tela, com as setas no canto de baixo à direita. As setas são do bloco, não do
  banner: um banner sozinho não tem para onde ir. O CSS do invólucro saiu do
  Banner hero e foi para a folha dos blocos, com a mesma classe (contrato com
  o tema). Ficha com o carrossel funcionando, notas e acessibilidade.
- **Media banner e Content banner viraram Banner hero e Banner media** — o nome
  começa por "Banner" para os dois ficarem juntos no menu. Classes junto:
  `.yb-bannerhero` (topo da home) e `.yb-bannermedia` (coluna da PDP), sem hífen
  no bloco, como `.yb-offercard`: a ferramenta das fichas lê a família até o
  primeiro hífen. Fichas em `molecules/bannerhero.html` e `bannermedia.html`.
  A ficha do Banner hero perdeu a fileira do carrossel, que só repetia os dois
  slides; ficou uma nota com link para o Track e a home v3.
- **Content banner** (`.yb-contentbanner`, hoje `.yb-bannermedia`), o banner de dentro da coluna da
  página — os três com texto e a arte da Fashion Gold na PDP. Era o Media
  banner sem modificador; mesmos dois tipos (texto com `--blur`, `--arte`), a
  receita de véu e blur do Media banner, e as regras que só valiam na coluna:
  cantos, altura que cresce no celular, arte do tamanho da imagem.

### Alterado
- **O desenho de um bloco aponta as peças que ele monta**, e não elementos
  internos. Num átomo a pergunta é "de que pedaços ele é feito"; num bloco a
  resposta útil é outra — quais componentes do sistema ele usa, e onde cada um
  entra. Isso a ficha já sabia: `f.usa` sai do cruzamento da marcação com a
  classe base que cada peça anuncia. Então o desenho do bloco **não tem uma
  linha escrita à mão** e não pode envelhecer: peça que sai do bloco some do
  desenho no mesmo build em que some da marcação. Cada número leva ao nome da
  peça, com link para a ficha dela e a própria linha de "quando usar". A ordem é
  a da marcação, não a alfabética de `f.usa` — os números sobem junto com o
  olho. Quinze blocos desenhados; sobram Gallery e Manifesto, que não compõem
  peça nenhuma, e onde o aviso agora diz isso em vez de "ainda não escrito".
- **Os vinte cartões da ficha do Card product ganharam foto.** O
  `.yb-card__media` vinha vazio, e vinte caixas cinzas explicavam mal justamente
  a peça cuja primeira parte é a foto. Entram fotos de produto do catálogo, com
  os selos antes da imagem, que é a ordem que a loja escreve.
- **Cada tópico de token da ficha virou um cartão** — Cor, Tipografia, Espaço,
  Forma, Estado. Soltos na grade, um grupo de catorze linhas e outro de duas
  encostavam sem nada dizendo onde um terminava: a coluna do meio lia como
  continuação da primeira. A caixa dá a fronteira, com a mesma receita de
  superfície do resto da doc; o fio embaixo do título continua separando o nome
  do grupo da lista dele.
- **A ficha inteira virou aba, e nada mais fica solto embaixo.** Eram três abas
  (Preview, Código, Anatomia) e três blocos fora do container — Mobile,
  Acessibilidade e Faça/não faça. Nada na tela dizia que a área das abas tinha
  acabado: 20px de vão e a mesma tipografia, então os três liam como conteúdo da
  aba aberta, qualquer que fosse ela. Agora são quatro, na organização do outro
  design system da casa: **Componente · Anatomia · Regras de uso ·
  Acessibilidade**. Celular e marcação entraram em Componente, porque respondem
  a mesma pergunta que o palco — aba própria para o celular ensinaria que
  telefone é assunto separado do desktop. "Estados" ficou de fora: só 2 das 66
  peças têm demonstração de estado, e uma aba vazia em 64 fichas ensina menos
  que a ausência dela.
  As abas com bloco por escrever levam um **ponto**: são 26 abas em 13 fichas.
  Sem ele o bloco vazio passaria a estar atrás de um clique, e a razão de ele
  existir — "seção que some da ficha é uma pergunta que ninguém sabe que ficou
  sem resposta" — valeria pela metade: não some, mas ninguém vê. O ponto leva
  texto escondido junto, senão o aviso seria só uma bolinha para quem enxerga.
- **A aba Anatomia virou um fato por linha**, e o lede dela passou a dizer o que
  a aba tem. O lede era "Lido da folha e da marcação a cada build": respondia
  **como** a aba foi feita para quem ainda não sabia **o que** ela tinha, em três
  palavras de dentro de casa. A aba ao lado já mostrava o jeito certo — "O mesmo
  HTML que renderizou acima". Agora diz o que a pessoa vai encontrar e só então
  de onde vem, porque a procedência é o que autoriza confiar no que está escrito.
  O corpo eram seis rótulos de bloco, cada um com 32px de respiro acima e um
  parágrafo embaixo — 192px de altura só para separar seis fatos, quatro deles
  de meia linha ("Nenhum", "Só CSS"). Viraram linhas de rótulo e resposta,
  separadas por fio: no Accordion os cinco fatos passaram a ocupar **278px onde
  ocupavam 418**, e a seção inteira caiu de 969 para 829px. Continua em bloco só
  o que precisa de área: a grade de tokens, e "De que é feita" quando há
  composição — ali a lista vem agrupada por degrau.
  E a resposta vazia de "De que é feita" deixou de ser *"Nenhuma peça — é só a
  própria folha"*, que não dizia nada para quem não mora aqui: folha de quem, e o
  que isso implica. Agora afirma o fato — não consome nenhum outro componente —
  e, no átomo, diz por que isso tem nome.
- **O bloco de tokens da ficha passou a agrupar como a Fundação**, e a dizer o
  quanto cada token é compartilhado. Agrupava pelo prefixo do nome: na ficha do
  Accordion davam **nove grupos para dezessete tokens**, cinco deles com um item
  só, e o critério separava o que é a mesma coisa — `font` (peso), `line`
  (altura) e `type` (tamanho) são tipografia e caíam em três colunas; `border`,
  `focus` e `text` são cor e caíam em outras três. Era também uma taxonomia que
  só existia ali: a Fundação arruma os mesmos 358 tokens em Color, Typography,
  Space, Shape, Elevation e State. Agora são essas seis (mais `Componente`,
  para a camada 2), cada título linkando para a seção que a explica — os
  dezessete do Accordion viram quatro grupos.
  Dentro de cada grupo, **do mais específico desta peça para o mais
  compartilhado**, pela contagem de componentes do índice invertido: no
  Accordion, `--yb-font-weight-regular` aparece em 2 e `--yb-focus-color` em 35.
  Doze dos dezessete estão em 15+ componentes — são o anel de foco, o texto do
  corpo, o espaçamento base, e não decisões desta peça; sem ordenar, afogavam os
  cinco que são. A contagem **ordena e não aparece**: é um fato sobre o sistema
  numa página que responde sobre a peça, e precisava de um parágrafo de legenda
  para ser lida. Quem quer a conta vai à Fundação, onde cada amostra abre a
  lista com nome e link. A ordem passou a ser afirmada no lede da aba.
  De quebra, valor composto de alias agora resolve: `--yb-transition-surface`
  mostrava `var(--yb-duration-base) var(--yb-ease-standard)` — 47 caracteres em
  duas linhas — enquanto todo o resto ao lado mostrava o valor final. São 30
  caracteres: `180ms cubic-bezier(.2, 0, 0, 1)`. `calc()` fica como está, que é
  onde o nome do token explica a conta.
- **Cada amostra de token diz agora quem a consome.** A doc respondia a
  pergunta de um lado só — toda ficha lista os tokens da família dela —, e o
  outro lado, "quem usa `--yb-action-bg`?", só se respondia com grep. É a
  pergunta que se faz *antes* de mexer num token. As oito páginas da Fundação
  ganharam, em cada amostra, um `<details>` com a contagem no resumo e a lista
  de componentes dentro, cada um linkando para a ficha. Fechado por padrão: a
  página de cor tem 77 amostras, e 77 listas abertas afogariam as amostras.
  Novo `tools/tokens-uso.mjs`, derivado a cada build — a lista muda a cada
  regra de CSS que alguém escreve, e mantida à mão mentiria em uma semana.
  **A cadeia de alias conta:** `--yb-gray-200` não aparece em folha de
  componente nenhuma, mas alimenta `--yb-border`, que aparece em vinte — então
  o primitivo herda os consumidores do semântico que o consome. Sem isso,
  metade da paleta apareceria morta sustentando o sistema inteiro. Checagem
  nova (139 → 140) cobra o resultado: o `--check` da moldura não protege,
  porque compara as páginas com elas mesmas.
- **O Media banner ficou só com o hero, e a largura total virou o padrão dele**
  (quebra de contrato: `--bleed` deixou de existir; `.yb-mediabanner` na PDP
  virou `.yb-contentbanner`). Homes v2, v3 e logada, as cinco PDPs e o gerador
  de telas foram junto. Medido antes e depois: nenhum banner mudou de tamanho.
  A altura do par de banners da PDP passou a valer só a partir de 768px — com o
  nome novo ela vencia a altura de celular do componente.

### Corrigido
- **Valores fixos trocados por token** (auditoria de 25/09):
  - Bordas: 40 `1px` e 6 `2px` crus, mais 12 usos do primitivo, viraram
    `--yb-border-hairline` e `--yb-border-emphasis` — os semânticos existiam e
    ninguém os consumia. A borda do Toast saiu de 3px, fora da escala, para 2px.
  - Proporção: 14 `aspect-ratio` crus viraram `--yb-aspect-product`, `-reel`,
    `-square`, `-landscape`, `-portrait`. Tokens novos para a arte de campanha:
    `--yb-aspect-campaign` (16:5) e `-campaign-mobile` (2:3), no hero e no
    banner da v1.
  - Ícone e spinner: o ícone do Empty, os dois spinners e o ícone de erro do
    campo usam `--yb-icon-*`. O spinner de carregando global centra com margem
    lógica — em RTL ficava 12px fora do centro.
  - Medida de leitura: `44ch` → `--yb-measure-lede` (45ch) e `64ch` →
    `--yb-measure-prose` (65ch); o texto do hero continua 33px antes do fim do
    desfoque.
  - Tokens novos para valores repetidos: `--yb-line-height-none` (14 usos de
    `line-height:1`) e `--yb-thumb` (a miniatura de 56px da busca e da sacola).
  - Resto: desfoque da arte (`--yb-blur-lg`), foco interno
    (`calc(var(--yb-focus-offset) * -1)`), `100vw - 2rem` → `--yb-space-8`,
    `max-width:480px` → `479.98px`, e os 44px das fichas de token →
    `--yb-target-min`. 358 → 364 tokens.
- **Limpeza de código sujo** (auditoria de 25/09):
  - Comentários com nomes velhos ("Media banner", as pastas `components/` e
    `patterns/`, "ver SANGRA", "ver --bleed", "painel de 224px") e comentários
    que contradiziam o código ("acima de 860 a barra não existe"). Comentários
    soltos voltaram para junto da regra que explicam.
  - Remendos que a base já resolve: `display:none` + `:not([hidden])` na barra
    de compra e na faixa do parceiro, e `.yb-search__item[hidden]` — o
    `[hidden]{display:none !important}` da base cobre os três.
  - Cópias do que o `.yb-track` já faz: barra de rolagem e encaixe em reviews,
    vídeos e logos; os vídeos no celular redeclaram `--yb-track-item` em vez de
    sobrescrever a grade.
  - Onze regras idênticas entre Banner hero e Banner media viraram lista de
    seletores (mais hover, fallback sem blur e padding do celular). O badge
    `--accent` divide a regra do `--on-media`; `.yb-review__media` e
    `.yb-quote__body` deixaram de estar partidos em dois blocos.
  - Select compacto do Catalog: saiu do `style=` da ficha e virou regra de
    contexto do bloco. As lâminas da ficha da Gallery usam tokens semânticos, e
    o fundo escuro da amostra `--onmedia` virou classe de doc.
  - Nas fichas, a folha de ícones carrega depois das peças, como nas telas —
    doc e telas rodavam cascatas diferentes.
  - O validador do véu procurava os nomes antigos e não conferia nada desde a
    renomeação dos banners; volta a conferir `.yb-bannerhero` e `.yb-bannermedia`.
- **Cada tela leva só o CSS de página que usa.** O bloco único do gerador
  (`CSS_HOME`) virou `CSS_BANNER_V1` e `CSS_TOLSTOY`: o banner de imagem da v1
  saía em 404, faq, v2, v3 e logada, e o Tolstoy em 404 e faq, sem uso. De
  quebra, a seta do Tolstoy some em `767.98px`, não em `768px` — no 768 exato ela
  colidia com os `min-width:768px` do sistema.
- **O "Faça" do Rating e do Review ensina `.yb-stars`**, não mais
  `.yb-rating__stars`, que está descontinuada.
- **A página de ícones conta certo:** 42 ícones (dizia 39) e 4 reservados (dizia
  7). `lock` e `info` perderam o selo de reservado — já aparecem no Dropdown e no
  Alert; seguem reservados `chevron-up`, `external`, `sort` e `eye`.
- **A conta logada voltou a sumir da barra do celular.** A regra do cabeçalho
  ainda escondia `.yb-menu`, o nome de antes do Dropdown; desde a troca o avatar
  aparecia na barra até 900px. Agora esconde `.yb-dropdown`.
- **O pop do favorito roda.** Um `ease` a mais depois do token de transição (que
  já traz a curva) invalidava a declaração inteira da animação.
- **O spinner de carregando aparece em toda variante.** Na secundária ele era
  branco sobre magenta-100 (1,1:1, invisível) e no `--on-dark` herdava o
  transparente do rótulo. Cada variante pinta o spinner na cor do próprio rótulo.
- **Atalho "Skip to main content" em todas as telas** (WCAG 2.4.1). A classe
  `.yb-skip-link` existia e nenhuma tela a usava; é o primeiro Tab da página e
  leva o foco para o `<main id="conteudo">`.
- **O slide do hero não passa mais da largura do trilho.** O piso de altura do
  `--bleed` voltava pelo `aspect-ratio` e alargava a caixa: abaixo de 1024 cada
  slide media 1024px (v2 e v3), e na ficha do celular 371px num trilho de 299,
  com o texto cortado pela direita. A largura agora é declarada (`inline-size:100%`).
  Saiu também a altura de 150vw do hero com arte, que o 2:3 do `--bleed` já cobre.

### Alterado
- **No celular, o banner com texto cresce para a foto aparecer.** Com 256px de
  altura, o texto ocupava o banner inteiro e o véu cobria a foto toda: sobrava
  um fundo marrom liso. Agora ele mede `clamp(16rem, 125vw, 30rem)` abaixo de
  768 — em 375, 464px, com uns 300px de foto nítida em cima do texto. Vale para
  os três banners da PDP. A ficha trocou o close de cabelo por uma foto com
  rosto.
- **O banner com texto tem uma aparência só: `--blur`.** O véu cheio deixou de
  ser opção na ficha e ficou como plano B automático (navegador sem desfoque,
  menos transparência). A ficha passou a mostrar três coisas que se combinam:
  tipo texto, tipo arte e o hero da home em largura total (`--bleed`).
- **A arte da Fashion Gold na PDP deixou de ser cortada.** Era um
  `.yb-mediabanner` sem modificador — o único do site — com uma arte vertical
  (700×1244) espremida numa caixa de 339×256: sumiam o "Fashion Gold" e o
  "Available in". Agora é `--arte`, e a arte avulsa entra no fluxo e fica do
  tamanho da imagem, em qualquer formato.
- **A altura do hero do Media banner passou a vir da proporção da arte**, e não
  da viewport. Era `clamp(22rem, 46vw, 34rem)` — 544px num monitor de 1440,
  contra os 450px do banner de imagem da home v1 na mesma largura. Duas homes
  lado a lado, mesmo papel, 94px de diferença, e nenhuma razão além de a conta
  ser outra. Agora `aspect-ratio:16/5` no desktop e `2/3` no celular: as mesmas
  proporções das criações (1200×375 e 1600×501; 400×600 a 750×1095), que é a
  correção que o banner da home v1 já tinha recebido. Medido nas três homes:
  450px a 1440, 400 a 1280, 320 a 1024 e 563 a 375 — idêntico à home v1 em
  todas. Um **piso de 20rem** segura a virada em 1024, porque abaixo disso o
  balão do parceiro (ancorado no topo) encontra o corpo do texto (que cresce de
  baixo): a 992px sobram 7px entre o balão e o eyebrow, a 960 eles se cruzam
  por 3px e a 768 o balão cobre o título. Uma tentativa anterior de 16:5 foi
  revertida exatamente por essas colisões — o que faltava era o piso. O banner
  DENTRO do conteúdo não muda: na PDP continua 544×416 e 266×374.
- **Home v3: o hero mescla os banners com texto e a arte de campanha da v1.**
  A arte ("20% off em todo o site", cupom Ybera20) é o segundo slide; o h1
  segue no primeiro. Variante nova `.yb-mediabanner--arte`: sem corpo nem véu,
  o `alt` diz a promessa em inglês. A arte nunca perde texto — da 1366 para
  cima ela corta (medido: o texto ocupa x 175–1062 da arte), entre 768 e 1365
  entra inteira sobre uma cópia desfocada dela, e no celular o hero todo passa
  a 2:3, a proporção da arte mobile.
- **As setas do hero foram para o canto de baixo, à direita.** No meio, a da
  esquerda cobria o título do slide com foto em 768 e 1024 (v2 e v3), e a da
  direita cobria o cupom da arte.
- **Toda ficha de componente diz o que é cada exemplo**, no padrão aprovado no
  Button. Onde as amostras cabem lado a lado, cada uma leva o rótulo embaixo
  (`--sale`, `--sm · 32px`, `[disabled]`); onde a peça é larga ou composta
  (cartão, trilho, banner, alerta), o modificador foi para o título da fileira.
  27 fichas de átomos e moléculas. Apareceram na ficha variantes que existiam
  só no CSS: `--stack` do Price e os modificadores do Skeleton. A classe no
  título da fileira deixou de sair em caixa-alta.
- **O Chip ganhou `[disabled]`**: texto e borda caem para os tokens de
  desabilitado, sai do hover e o cursor vira `not-allowed`. Antes um chip
  desligado ainda reagia ao hover como se fosse clicável. Só em `<button>`.
- **Checkbox e rádio viraram duas peças**, e o rádio ganhou classe própria
  (`.yb-radio`). Eram uma ficha só, com as seis demos intercaladas: nenhum dos
  dois mostrava os próprios estados, e o que separa um do outro — a caixa
  escolhe zero, uma ou todas; o rádio escolhe uma dentro de um grupo e nunca
  volta ao vazio — não estava escrito em lugar nenhum. A folha continua com uma
  seção só, como Input/Select/Textarea: dividem caixa, alvo, foco,
  desabilitado e alto contraste, e a convenção "redondo escolhe um, quadrado
  escolhe vários" só é lida se nada **mais** estiver diferente. Muda o que cabe
  em quatro regras — a forma e a marca —, agora declaradas as duas, sem uma
  fazer papel de padrão. `.yb-check` segue valendo para o checkbox; a marcação
  do rádio passa de `<label class="yb-check"><input type="radio">` para
  `<label class="yb-radio">`. A ficha nova traz o que só o rádio exige:
  `name` em comum, `role="radiogroup"` com nome acessível, e uma opção já
  marcada no HTML.
- **A ficha do Quantity stepper separa estado de tamanho, com rótulo.** Eram
  três steppers soltos, dois idênticos com valores diferentes (1 e 9), e o 9
  nem mostrava o limite. Agora: `padrão`, `no mínimo · 1` (menos desligado),
  `no máximo · 10` (mais desligado); e `sem modificador · 44px`, `--sm · 36px`.
- **As quatro cores de estado ganharam rampa de 11 tons** (50 a 950), no mesmo
  desenho do neutro, do magenta e do dourado. Saem de `tools/rampa-estado.py`
  (OKLCH, no matiz do 600, com a curva de contraste das rampas de marca). O 50 e
  o 600 ficaram exatos: são os que a camada semântica já consumia, então nenhuma
  tela muda de cor. 500 é o primeiro tom de UI (≥3:1); do 700 em diante, AAA.
  36 primitivos novos: 322 → 358 tokens.
- **A busca usa o `.yb-chip`, e `.yb-search__chip` deixou de existir** (quebra
  de contrato no tema). Era uma cópia inteira do átomo dentro do organismo. O
  chip absorveu o que só a cópia tinha: ser `<a>` sem sublinhado e levar ícone
  antes do texto. De quebra, a altura de linha agora é declarada: o chip-link
  herdava 1.55 do corpo e media 40px ao lado do chip-botão de 36.
- **A ficha do Chip diz o que é cada amostra**, no formato do Button, e ganhou
  a fileira Sizes com `única · 36px`: um tamanho só, por decisão.
- **A ficha do Icon button diz o que é cada amostra**, no formato do Button:
  `sem modificador · 44px mín.`, `--square · 44px`, `--lg · 56px`, `--fav`,
  `--onmedia`. A fileira de medida mostrava um botão com a palavra "Base"
  dentro, e o `--lg` vinha com `--onmedia` sobre fundo branco — o disco branco
  que a própria nota da ficha proíbe.
- **Os tamanhos de ícone subiram para o topo da página Ícones**, antes da
  galeria, com o modificador e a medida sob cada amostra (`--sm · 16px` …
  `--xl · 32px`). Antes ficavam depois dos 39 ícones, onde ninguém chegava.
- **"Menu" virou "Dropdown", e `.yb-menu` virou `.yb-dropdown`** (quebra de
  contrato: a classe mudou). "Menu" não dizia que era o painel que abre embaixo
  do avatar — e dividia o nome com o menu principal e com o ícone `#yb-menu`, o
  hambúrguer. A ficha mudou para `molecules/dropdown.html`; Header, index-logado
  e o gerador de telas foram junto.
- **"Offer card" e "Product card" viraram "Card offer" e "Card product"**, para
  ficarem juntos na lista em ordem de nome. A classe base não mudou
  (`.yb-offercard`, `.yb-card`): o que muda é o nome que a doc mostra, e ele sai
  do `<h2>` do fragmento — coluna, catálogo e trilha se renomearam sozinhos. O
  nome do bloco na folha acompanhou, que é de onde o inventário lê.
- **Cada amostra da ficha do Button diz qual é** — `--primary`, `--sm · 36px`,
  `[disabled]` — debaixo do próprio exemplo. Uma fileira de quatro botões dizia
  que havia quatro variantes e não dizia quais: para descobrir que o rosa claro é
  `--secondary` a pessoa abria a Anatomia, achava a lista de modificadores e
  voltava contando posições. O rótulo é só a classe: o que a variante significa
  está na nota. Aplicado nas seis fileiras. **Piloto para as outras fichas.**
- **A ficha do Modal mostra os três tipos abertos**, um abaixo do outro, em vez
  de um botão que abre um só. A folha não tem variante de modal — os três são a
  mesma `.yb-dialog`, e o que muda é o pé: **destrutivo** (ação em `--danger`),
  **confirmação** (`--primary`) e **formulário**, que não tem pé porque o
  `.yb-dialog__body` *é* o `<form>`. O de formulário é o da loja, lido de
  `pages/pdp.html`.
  Continua havendo um botão que abre um de verdade, com véu e foco preso: aberto
  em fluxo o modal se lê, mas não se comporta.
- **A seção "Em 375px" virou "Mobile"**, e passou a aceitar mais de um quadro.
  Quando a peça declara estados, o quadro único dá lugar a um por estado, lado a
  lado. O Nav abre com dois: **visitante** e **conta logada**, cada um o menu
  inteiro num celular de 375px.
- **A demo principal do Nav passou a ser só a árvore** — no palco largo ela é a
  barra do desktop. A cabeça da gaveta e a faixa de conta saíram dela: são os
  dois quadros de Mobile agora.
- **⚠️ Mudança de contrato: `.yb-dialog--drawer` virou `.yb-drawer`.** Quem
  consumir `dist/ybera-components.css` precisa trocar a classe na marcação:
  `class="yb-dialog yb-dialog--drawer"` → `class="yb-dialog yb-drawer"`. Nada
  ficou como alias — alias faria a ficha do Modal anunciar um modificador que já
  não é dele. Todas as onze telas, o `behavior.js` e o `_captura/montar-ds.py`
  já foram atualizados.
- **Modal e Drawer são duas peças.** Eram uma ficha chamada "Modal & drawer" com
  a gaveta como modificador — e o nome dizia que gaveta é variação de modal. Na
  prática são duas decisões: o modal interrompe para pedir **uma** resposta e
  some; a gaveta é uma segunda tela lateral que a pessoa percorre. Quem procurava
  "drawer" no sistema não achava nada.
  Continuam sem duplicação de CSS: são duas famílias no mesmo elemento
  (`class="yb-dialog yb-drawer"`), como `.yb-track .yb-videos` — a primeira traz
  a janela, o foco preso e o backdrop; a segunda troca ancoragem e rolagem.
- **A demo da gaveta deixou de ser o carrinho.** Título, botão e **o meio vazio**:
  o corpo é a única parte que muda de uso para uso, e enchê-lo com um carrinho
  ensinava que gaveta é carrinho. O exemplo montado segue em Cart drawer.
- **Respiro na gaveta do menu.** Os itens de topo passaram de 44px de passo para
  **56** — com `gap:0` as cinco linhas eram um bloco único e o dedo mirava num
  alvo sem borda. Os 44px de cada alvo continuam inteiros; o que entrou foi
  espaço entre eles.
- **O painel sem sublista apertou.** No "About Us" cada grupo é *um* link, e o
  espaço entre eles era o de separar colunas: 20px de gap mais 8 de margem do
  título, **72px de passo para linhas de 44**. Três destinos ocupavam 216px com
  130 de branco que nada justificava. Agora são **48**. Onde há sublista (Shop)
  o espaço fica: lá ele separa grupo de grupo.
- **A ficha do Nav foi remontada a partir das telas.** Estava desatualizada em
  três pontos: seis itens de topo onde a loja tem **cinco**, sem a cabeça da
  gaveta (logo + fechar) e sem a faixa de conta. A marcação agora é a de
  `pages/index-v2.html`, com a vitrine do painel que todas as onze telas têm.
- **A doc do Footer mostra a v2** — escura, três colunas de destino, 12 links — que é
  o que as onze telas publicam. Mostrava a anterior: clara, em acordeão, 28 destinos.
- **O estado logado do Header mostra o cabeçalho inteiro**, não o avatar solto num
  palco vazio.
- **Os links da nav se centram** na própria fileira acima de 900.
- **O Preview lista só as páginas** — saíram as galerias de atoms, molecules,
  organisms e templates, que já têm o quadro de 375px em cada ficha.
- **Varredura de completude dos 35 átomos e moléculas**, e o que ela achou:
  - A ficha do **Vertical video carousel** demonstrava `<button class="yb-video">`
    com o play como `<span>` dentro — a estrutura que o próprio comentário da
    folha diz ter sido abandonada por ser HTML inválido. As 11 telas já usam
    `<div class="yb-video">` + `<button class="yb-video__play">`. A demo foi
    alinhada com as telas.
  - **Quatro peças com controle próprio não respondiam ao mouse**: Accordion,
    Media banner, Partner e Switch. Cada `:hover` novo reusa o vocabulário que o
    sistema já tem — marcador mudo que sobe a primário, CTA do cartão que
    responde pelo cartão inteiro, escala que usa a transição já declarada,
    trilho que escurece só quando desligado.
  - `.yb-iconbtn` ganhou **`--square` e `--lg`**. Não é API inventada: sete
    lugares reescreviam `width/height: var(--yb-target-min)` por conta própria, e
    o play sobre vídeo fixava 56px em pixel cru.
  - **Avatar** ganhou acessibilidade e faça/não faça escritos. O tamanho fixo
    *não* virou eixo: as notas dele já explicam por que são 32px pintados dentro
    de um alvo de 44, e ele aparece numa medida só em toda a loja.
- **O menu separou Componentes de Blocos** ([DDR-011](decision-log/DDR-011-blocos-no-menu-organismos-na-escada.md)).
  Uma lista alfabética de 50 nomes punha `Button` e `Buy box` lado a lado como
  se fossem a mesma espécie de decisão — e não são: um botão se escolhe dez
  vezes por página, um bloco de compra é um só e já está lá. Agora são
  **Componentes 35** (átomos e moléculas) e **Blocos 15** (organismos). O
  degrau continua se chamando organismo na pasta, na folha e no inventário;
  *blocos* é o nome na tela, e a página do degrau declara os dois.
- **O degrau abre o cartão do catálogo**, e não o fecha. Numa lista em ordem de
  nome, Button e Buy box liam como a mesma espécie de coisa — e não são: um não
  usa nenhuma outra peça, o outro é uma região da página. O rótulo era a última
  linha, em cinza, depois da descrição inteira; "que espécie de coisa é essa?"
  é a pergunta que vem antes do nome.
- **Fileira de chips no catálogo e nas páginas de degrau** — `Todos 49 ·
  Átomos 13 · Moléculas 22 · Organismos 14`. São links para as páginas de
  degrau, que já existem e já dizem a regra do nível: filtro sem script é
  controle morto, e esta página já tinha um (abaixo). Também é o caminho de
  volta ao catálogo, que só existia pela coluna.
- **O contador da busca somava a lista errada.** Ele lia só a coluna quando
  havia coluna, e a coluna casa só por nome: digitando `organismo` no catálogo,
  a tela mostrava as 14 regiões e o texto ao lado dizia **"Nada com esse
  nome"**. Agora conta as duas listas sem repetir peça.
- A marca do topo passou a dizer **Ybera Design System USA**. É o nome do
  sistema; "Design system" genérico servia enquanto havia um só.
- **Removido o campo de filtro do catálogo**, que nunca apareceu: nascia
  `hidden` esperando o `doc.js`, e o `doc.js` liga o PRIMEIRO `[data-yb-filtro]`
  do documento, que é sempre a busca do topo. Duas checagens novas (136) cobram
  que a fileira de chips não vire o próximo controle morto.
- **Referência saiu da coluna.** Princípios, Decisões, Inventário, Contribuindo
  e Changelog são documentos de processo — quem escreve o sistema os consulta,
  quem usa não —, e ocupavam cinco linhas permanentes ao lado das 50 peças que
  são o assunto da página. Seguem na capa. O Changelog ficou a dois cliques
  (capa → Contribuindo), que é o único que perdeu alcance direto.
- **Corte de 29% no texto das fichas** (168.919 → 120.171 caracteres; a média
  por peça caiu de 3.447 para 2.452). Duas frentes: as ledes que o gerador
  repetia nas 49 páginas — a explicação de por que o quadro de 375px é
  `<iframe>` era um parágrafo em cada uma, e agora é um comentário na folha,
  onde é lida uma vez — e as notas, que haviam virado registro de engenharia
  (a do Partner tinha **2.485 caracteres** e contava três tentativas antes de
  dizer a regra). O critério: fica a decisão e o número que a prova, sai a
  narrativa de como se chegou lá.
- **Teto de prosa cobrado no build** — nota acima de 700 caracteres e bloco de
  acessibilidade acima de 560 reprovam. Reprovam, e não avisam: aviso a gente
  aprende a ignorar, e foi assim que 2.485 caracteres entraram sem ninguém
  notar.
- A fileira de fatos da ficha ficou só com a **classe base**. As contagens de
  modificador, elemento e estado repetiam em placar o que a aba Anatomia mostra
  por extenso; o token some, e o fato de a peça precisar ou não do JS desceu
  para a Anatomia, onde é anatomia.

### Adicionado
- **Estados comparáveis lado a lado nas fichas.** A peça declara
  `data-estado="nome"` num bloco `hidden`, e a ficha embute um quadro de 375px
  por estado (`solo.html?c=peça&s=estado`). Serve a qualquer peça, e resolve o
  caso difícil: estado que **só existe abaixo de um breakpoint** — forçá-lo no
  palco largo mostraria a peça sem as regras da media query, que é documentar um
  estado que não existe.
  Os quadros comparados ficam da mesma altura, sempre a maior: duas caixas lado
  a lado com uma 44px mais curta leem como recorte, não como diferença de
  estado. E o `postMessage` de altura passou a casar pelo **remetente** — com
  dois quadros na página, o primeiro recebia a altura do segundo.
- **As duas contas do Nav**, visitante e logada, lado a lado na ficha. A faixa é
  `display:none` acima de 900px por decisão do componente, então a versão logada
  aparece só no quadro de 375px — forçá-la no palco largo mostraria uma faixa sem
  fundo e sem respiro, que é documentar um estado que não existe.
- **Cross-sell na gaveta do carrinho** (`.yb-cart__cross`): "Complete your routine"
  entre o cupom e o total, com trilho de um cartão por tela, preço cheio sem risco,
  "Add for $X" em verde e botão de adicionar. Mais a linha de prova social
  (`.yb-cart__prova`) que a justifica.
- **Ícones `gift` e `trending-up`** — o brinde na linha do carrinho e a prova social.
  Sprite de 40 para 42 símbolos.
- **Chip** (`.yb-chip`) e **Grade** (`.yb-grid`) ganharam ficha própria: os dois
  moravam soltos na folha dos organismos, dentro do bloco de catálogo, sem página e
  sem dono. Chip virou átomo, Grade virou molécula — irmã do Trilho.
- **Duas checagens de completude** (139 no total): peça com controle próprio
  declara `:focus-visible` e declara `:hover`. Só valem para átomos e moléculas —
  nos degraus de cima o controle sem classe quase sempre mora dentro de outra
  peça, e a regra de dono viraria chute. O "próprio" é o que faz a checagem não
  mentir: o botão do Empty state é um `.yb-btn` emprestado, e cobrar dele
  encheria a lista de falso positivo até ninguém mais ler.
- **Ficha própria para o Nav** (`.yb-nav`), o menu da loja. Ele tinha 58 regras,
  26 elementos e estava nas 11 telas **sem página nenhuma**: a classe base de
  organismo é o invólucro, então ele foi absorvido pela ficha do Header, que
  documentava 2 dos seus 26 elementos. Os outros 24 não existiam em lugar
  nenhum da doc — quem fosse mexer no menu abria o CSS. Achado ao testar a
  hipótese de que organismos não trazem componente novo: 88% das regras dos
  organismos declaram família própria, e só 12% cruzam famílias para arranjar
  peça existente.
- **Os tokens que a peça consome, listados na aba Anatomia** — nome, valor e,
  quando é cor, a amostra. Agrupados pela família do próprio nome
  (`--yb-action-*`, `--yb-space-*`): a convenção de nome do sistema já é a
  taxonomia, e uma tabela paralela seria uma segunda verdade para manter. O
  valor sai das folhas de token, com `var()` resolvido até o literal — não do
  JSON derivado, que guarda sombra como objeto composto.
- **A composição passou a vir separada por degrau** (Átomos, Moléculas,
  Organismos) dentro da mesma aba, em vez de uma fileira só com o nível
  impresso em cada pílula. As duas respostas — de que é feita e o que consome —
  ficam lado a lado, que é onde anatomia se lê.
- **Preview · Código · Anatomia em abas**, no topo de cada ficha. As três
  seções falavam da mesma peça e estavam empilhadas: a marcação da primeira
  demonstração ficava três rolagens abaixo dela. Nascem empilhadas no HTML,
  cada uma com o próprio título, e o `doc.js` as converte — sem script a
  página continua inteira. Teclado pelo padrão WAI-ARIA (setas, Home, End),
  e `#marcacao` ou `#anatomia` vindos de fora abrem a aba certa em vez de
  rolar para um painel escondido. O custo, declarado: com um painel fechado,
  o Ctrl+F do navegador não acha o que está nele.
- **A linha de descrição de cada peça passou a dizer o que ela É**, e não só
  onde aparece na loja. O Accordion dizia "Informação secundária da PDP:
  ingredientes, modo de uso, frete" — que é o lugar, não a coisa; agora abre com
  "Lista de seções que abrem e fecham sob um rótulo clicável, uma de cada vez"
  e mantém o contexto na segunda frase. Reescritas as 49 que começavam pelo
  contexto ou pela regra; `nav` e `page-layout` já abriam com a definição. A
  linha aparece em três lugares — subtítulo da ficha, descrição do cartão no
  catálogo e o que o filtro casa —, então a correção vale nos três de uma vez.
- O respiro entre o link de volta e o título virou **um só** (`--yb-space-6`).
  Eram três, e ninguém tinha escolhido nenhum: a capa deixava 24px, a página de
  grupo deixava 1 — o `.ficha-volta` não declarava margem, e o que se via era a
  entrelinha — e a ficha deixava 20, vindos do `.ficha-topo`. Vale o da capa,
  que é a página que a pessoa vê primeiro.
- A **PDP v1 saiu**, a v2 virou **PDP link influencer** e a PDP padrão passou a
  ser o arranjo da v2 — faixa, compra, relacionados e avaliações, sem
  breadcrumb e sem acordeão de navegação. O nome novo diz o CAMINHO de chegada:
  o recado do parceiro só existe quando a pessoa vem de link patrocinado.
  O recado do parceiro virou **opt-in** no gerador (`parceiro=False`): ele
  nasceu ligado no arranjo `v2` porque esse arranjo tinha uma tela só, que era
  justamente a do link de influencer — quando ele virou também a PDP padrão, a
  faixa foi junto e a loja passava a saudar um parceiro que não existia.
  O arranjo `padrao` do gerador continua vivo — é o que as três telas de estado
  (esgotada, com variante, em promoção) ainda montam.
- **A página "Media & control" saiu da Fundação; as famílias foram para onde se
  procura.** Ela mesma abria dizendo "quatro famílias que faltavam" — proporção de
  mídia, altura de controle, medida de leitura, borda e opacidade, sem nada em
  comum além de terem chegado por último. Agora: proporção e largura de borda em
  **Shape** (a forma da caixa), altura de controle e alvo de toque em **Space**,
  medida de leitura em **Typography**, opacidade (desabilitado e véu do modal) em
  **State**. Nenhum token mudou; a Fundação tem 8 páginas.
- **Stars, átomo novo: a nota vira número e o desenho sai dele.** As estrelas eram
  texto digitado (`★★★★☆`), com três defeitos: quem montava escolhia cheia ou vazia
  no teclado; nota quebrada não existia (o exemplo da própria ficha mostrava 4,8
  como cinco cheias); e o gerador escrevia `★★★★★` **fixo** no cartão de produto e
  no bloco de compra, qualquer que fosse a média — hoje ela é 5,0 e ninguém nota; a
  4,2 a loja mostraria cinco cheias ao lado de "4.2". Agora é
  `<span class="yb-stars" style="--yb-stars:4.8">`: duas camadas na mesma cor, as
  vazadas inteiras e as cheias cortadas na largura da nota, forma por `mask` e cor
  por token (data-URI não lê var(), a máscara só usa o alfa). Meia nota é meia
  estrela; cheia e vazia se distinguem pela forma, como o ☆ fazia; alto contraste
  vira `CanvasText` em vez de sumir. Mede o que o texto media (75,9 × 17px) e
  nenhuma linha se mexeu — Ratings com as mesmas larguras de antes.
- **Rating é a média; Stars é a nota de alguém.** A Review usava o Rating sem a
  contagem, quebrando a regra do próprio Rating ("sempre com a contagem"), porque
  uma avaliação individual precisa só das estrelas. Agora cada avaliação e o topo
  do carrossel usam Stars; cartão e bloco de compra usam Rating, que é feito de
  Stars. 100 estrelas migradas nas telas, gerador e peças da doc junto.
  `.yb-rating__stars` fica marcado `@deprecated` — o bundle é contrato com o tema —
  e nenhuma tela o usa mais. A nota entrou na lista de estilo permitido nas telas
  pela mesma porta da largura da barra de progresso: é dado, não estilo, e só um
  número de 0 a 5 passa.
- **Form field deixou de existir: Input, Select e Textarea são o campo inteiro.**
  O rótulo que flutua dentro da caixa, a dica e o erro em texto não eram uma
  molécula em volta de um controle — são o próprio campo, e Input, Select e
  Textarea são esse campo com um controle diferente dentro. Cada um ganhou ficha
  com o rótulo animado como demo principal, estados (preenchido, desabilitado,
  inválido com mensagem) e a forma sem rótulo visível, que é como o e-mail do
  rodapé e a ordenação do catálogo os usam. As notas e o texto de acessibilidade
  do Form field foram para o Input. Na folha, o bloco da caixa foi para os átomos
  logo **depois** das regras do controle — mesma especificidade em alguns pares, e
  a caixa precisa continuar vencendo pela ordem, como vencia na folha de cima.
  **Diff de estilo computado: 0 diferenças em 146 elementos de 16 páginas.**
  O gerador de fichas precisou de uma regra a mais: com três campos na ficha, a
  caixa `.yb-field` aparece mais que o controle e a contagem a elegia classe base
  do Textarea — e o Progress, que usa `.yb-field__label` como legenda, passava a
  "compor o Textarea". Agora a família com o nome da peça, quando está na
  marcação, é a base; a exceção é o plural (`seals` continua `.yb-seal`, o item, e
  não `.yb-seals`, a fileira). Conferido: nenhuma das outras 49 bases mudou.
- **Hero deixou de ser peça: virou o arranjo "em trilho" do Media banner.** O
  Hero era um Track de Media banners (`.yb-track--hero`, um slide por tela) com as
  setas por cima da arte — e as setas eram tudo o que ele tinha de próprio: três
  regras de CSS. O Media banner, ao contrário, vive sozinho (o bloco de história da
  PDP não está em trilho nenhum). Manter a região e chamá-la de Media banner
  deixaria a PDP com um "carrossel de um slide"; manter a peça e documentar o
  trilho como um arranjo dela cobre os dois usos com um componente só. A ficha do
  Media banner ganhou a fileira "Em trilho, no topo da home" e as notas que
  continuavam verdadeiras; as três regras saíram da folha dos organismos e
  entraram no bloco do Media banner. **A classe `.yb-hero` manteve o nome**: está no
  bundle, e o bundle é contrato com o tema (DDR-010) — renomear para acertar o
  índice quebraria a vitrine. Medido na home v2: setas `absolute`, centradas na
  arte, botões com fundo e clique, trilho sem mudança. A escada fica em 15 blocos.
- **O "Read more" do trio de posts (v2) voltou a ser o componente Link.** O Post
  sobrescrevia `yb-link--reinforce` só nesse arranjo — preto e sem sublinhado —,
  uma aparência que o Link não tem: a ficha dele diz que o reforço "fica sempre
  sublinhado: sem isso não pareceria clicável". Eram dois Posts com dois links
  diferentes para o mesmo papel, e a exceção vivia no consumidor, contradizendo o
  componente. A sobrescrita saiu; v1 e v2 agora medem igual (magenta, sublinhado,
  600, 14px) e escurecem igual no hover. Se o trio um dia precisar de um eco
  discreto, a variante nasce no Link, documentada. De quebra caiu o bug de hover
  que a exceção criava: dois sublinhados, em duas cores, para um destino só.
- **O `.yb-link` prometia sublinhado no hover e não tinha.** A ficha diz, desde
  que o componente nasceu, que "a base é link de verdade: **some o sublinhado até
  o hover**" &mdash; e a folha só trocava a cor. Promessa escrita e inerte, a
  terceira desta rodada. Cor sozinha é um canal só, e é o que falha primeiro para
  quem não distingue os dois magentas (#CA235F → #8A1E45). O hover agora tem os
  dois: cor e sublinhado com o mesmo `text-underline-offset:3px` que o resto do
  sistema usa.
- **"See all" virou "See all articles".** Na home v2 os dois links de cabeçalho de
  seção usam o componente certo, mas falavam com vozes diferentes: "Shop all best
  sellers" diz o destino, "See all" não diz de quê. Para quem navega por lista de
  links, "See all" é exatamente o rótulo não descritivo que a WCAG 2.4.4 cobra
  &mdash; o mesmo motivo por que os três "Continue reading" do Post não são links.
- **O reforço do Post herdava um alvo de toque que não existe.** O "Continue
  reading" do cartão de artigo é `<span aria-hidden>` &mdash; e está certo: quem
  clica é o título, esticado sobre o cartão inteiro (medido: foto, meio, rodapé e
  o próprio eco caem todos no link do título), e três "Continue reading"
  idênticos como link seriam três destinos iguais para quem ouve. O que estava
  errado era ele levar junto o `min-height:44px` do `.yb-link`, que é **piso de
  alvo de toque**: 44px de caixa para 17px de texto, num elemento que ninguém
  toca. `--reinforce` agora cancela o piso &mdash; e com isso caiu também o
  remendo que o Post tinha feito rio abaixo (`align-items:flex-start`, escrito
  para empurrar para baixo o respiro que a caixa sobrando criava). Medido no
  cartão: eco de 44px → **17px**, cartão de 316px → **289px**, área clicável
  idêntica.
- **A barra indeterminada era um pêndulo, e agora é uma esteira.** O defeito
  estava no `alternate`: a faixa atravessava a pista e **voltava**, com `ease`
  nas duas pontas — parava, hesitava e disparava ao contrário. E o tempo piorava,
  porque ela lia `--yb-duration-slower` (420ms), que é da rampa de **transição**:
  duas travessias e meia por segundo. Isso não lê como "trabalhando", lê como
  alarme, e vaivém de faixa colorida é gatilho clássico para quem tem
  sensibilidade a movimento. Agora é um sentido só, velocidade constante
  (`linear`), 1,4s — medido: a faixa anda 10% da pista a cada 100ms, sempre
  igual, e a virada acontece com ela fora da tela.
- **Papel novo: `--yb-rhythm-loop` (1400ms).** Espera não é transição &mdash; uma
  transição responde a um gesto e termina, um laço roda enquanto não há resposta,
  e a rampa de transição para em 420ms, que é tempo de clique. O valor não é
  inventado: é o 1,4s que o brilho do esqueleto já praticava, escrito **cru** na
  folha desde que nasceu. Agora os dois esperam no mesmo compasso, e o valor cru
  saiu.
- **Brand quote subiu de molécula para bloco.** A régua da
  [DDR-010](decision-log/DDR-010-escada-atomica.md) é explícita: molécula "reúne
  átomos para uma tarefa, **não tem lugar fixo na página**"; organismo "é uma
  **região** da página: tem lugar, e sobrevive sozinho numa tela". A citação tem
  lugar &mdash; sai como `<section class="yb-block">` em quatro telas, uma vez por
  página (a própria ficha dizia "uma por página; repetida, vira slogan") &mdash;
  ocupa uma faixa inteira, e os vizinhos dela na loja são Manifesto e Logo bar, que
  já eram blocos. A folha, a peça e o texto escrito mudaram de degrau junto; o palco
  da ficha virou `stage--pad`, como o das outras regiões que vivem dentro do respiro
  da página. Nada mudou na tela: a regra é a mesma, só passou a ser carregada pela
  folha de baixo para cima na ordem certa (medido em `index-v2`: grade 448+448,
  vão 64, fala em 40px, nenhuma diferença).
- **O Avatar ganhou uma rampa de tamanho** &mdash; tinha um só, e um círculo só não
  é um componente. Seis degraus de 8 em 8: `--xs` 24, `--sm` 32 (o padrão, e sem
  modificador ele mede isso), `--md` 40, `--lg` 48, `--xl` 56, `--2xl` 64. Dois em
  uso hoje: 32 no gatilho do cabeçalho e 40 na cabeça do painel da conta. Os outros
  quatro completam a rampa, porque rampa com buraco é mais estranha que rampa
  inteira e quem precisar de 48 não deve inventar um valor cru para chegar lá.
  **A letra não é uma porcentagem do círculo**: a proporção cai de .54 no menor para
  .38 no maior, porque legibilidade tem *piso*, não proporção &mdash; os 44% que
  servem o de 32 dariam 10,5px no de 24, e a mesma conta no de 64 daria 28px, que nem
  existe na escala. Cada diâmetro pega um degrau de tipo de verdade: `caption`,
  `body-sm`, `body`, `body-lg`, `h4`, `h3`. Medido: duas iniciais cabem de 32 para
  cima ("WM", o par mais largo, mede 26px no de 32); no de 24 não cabem &mdash; são
  25px numa caixa de 24.
- **Um fundo só, o cinza.** Houve uma versão com três tons de identidade e um papel
  novo na camada semântica; saiu a pedido, e a decisão se sustenta sozinha: cor de
  avatar serve para *reconhecer* alguém, e a loja mostra o avatar de uma pessoa só,
  a que está logada. Para uma pessoa não há quem distinguir. Fica
  `--yb-bg-muted` com a inicial em `--yb-text-primary`: **15,28:1**, AAA. O disco não
  carrega contraste contra a página (1,09:1) e não precisa &mdash; quem identifica é
  a letra, e é por isso que ela é escura e o disco é claro.
- **A cabeça do menu da conta agora mostra o avatar em 40px**, em grade de duas
  colunas com o mesmo DOM de antes. O painel foi de 14rem para **16rem**: com o
  avatar, a coluna do texto caía para 138px e o e-mail &mdash; que precisa de 152
  &mdash; truncava. Truncar o e-mail derrota o motivo da cabeça existir, que é
  confirmar de quem é a sessão.
- **O Avatar estava pela metade.** Tinha a regra de cor e a de tamanho, e não
  tinha nenhuma das garantias que fazem um círculo continuar círculo:
  **`flex:none`** &mdash; com o `flex-shrink` de fábrica, container apertado
  fazia 32&times;32 virar **13&times;32** (medido numa faixa de 60px), e círculo
  que vira elipse não é acabamento, é a peça inteira; **`text-transform:
  uppercase`**, para a inicial não depender de como o nome foi digitado no
  cadastro; **`overflow:hidden`**, para um acidente de dado falhar PARA DENTRO
  (com "Marina" o conteúdo media 40px numa caixa de 32 e vazava por cima dos
  vizinhos, empurrando a barra); e **contorno em `forced-colors`**, onde o fundo
  vira `Canvas` e sobrava uma letra solta no meio do cabeçalho &mdash; mesma
  receita do Icon button, que tem o problema pelo mesmo motivo. A ficha ganhou
  o palco onde ele vive (dentro do gatilho de 44px, mostrando os 32 pintados),
  uma fileira com as três garantias em ação, e a nota que diz por que **não** há
  `--sm` nem `--lg`: modificador sem caso é peso morto que alguém copia depois.
- **A doc mostrava 9 linhas de marcação onde havia 40.** O recorte da primeira
  demo terminava no primeiro `</div>` indentado: o terminador era `\n? {4}</div>`,
  e com o `\n` opcional os quatro espaços casavam no MEIO da indentação de
  qualquer fechamento aninhado. A aba "Código" entregava um bloco cortado, e
  "De que é feita" lia só o que coube &mdash; por isso o Buy box dizia ser feito
  de `Product card` (o retângulo cinza que fazia as vezes da foto) e não citava
  Button, Price, Quantity stepper, Rating nem Variant picker, que ele de fato
  usa. Com o `\n` obrigatório, **32 fichas** foram reescritas.
- **O palco do Buy box ganhou a galeria de verdade**, com as miniaturas, no
  lugar do `.yb-card__media` vazio. Como galeria e bloco de compra são IRMÃOS
  dentro de `.pdp` &mdash; e não um dentro do outro &mdash; a peça declara
  `<!-- doc:vizinha yb-gallery -->` e o gerador a tira da composição. A
  declaração é conferida: vizinha que não aparece na primeira demo derruba o
  build, como qualquer outra regra escrita e inerte.
- **`.stage--pad` era inerte nos dois degraus de cima.** `[data-nivel]  .stage`
  (0,2,0) vencia `.stage--pad` (0,1,0), então a ficha do Free shipping progress
  pedia respiro havia tempo e renderizava com padding 0 &mdash; conteúdo colado
  na borda do cartão, que é o que faz a peça parecer cortada. O seletor de nível
  virou `:not(.stage--pad)`. A ficha do FAQ, que nem pedia, passou a pedir: nem
  todo organismo sangra, e FAQ e barra de frete são seções dentro do respiro da
  página.
- **A faixa de aviso do topo encolheu 8px** (padding `--yb-space-3` →
  `--yb-space-2`, altura 40 → 32). É a primeira coisa da página e a menos
  importante delas; os 8px voltam para a loja na primeira tela.
- **A ficha do Hero estava velha.** Faltavam o `--blur` e os três `<i>` de
  `.yb-mediabanner__blur` &mdash; o painel que sustenta a manchete sobre foto de
  qualquer cor &mdash; e o terceiro slide. Faltava também o
  `data-yb-track-loop` que a própria nota anunciava: a doc prometia um loop que
  a marcação não ligava. Agora é a marcação da home v2, menos o que é da
  página: o balão do Partner e a âncora da faixa do parceiro.
- **As cinco PDPs perderam o breadcrumb.** Ele já tinha saído da PDP padrão e da
  de link de influencer; as três telas de estado (esgotada, com variante, em
  promoção) ficaram para trás, e duas telas do mesmo produto abriam diferente.
  O caminho de volta para a coleção mora no menu do cabeçalho. O `BreadcrumbList`
  do JSON-LD **fica**: ele é o que o buscador mostra no resultado, e nunca foi o
  que estava na tela. Com isso `.pdp--solto` deixou de ser modificador &mdash;
  valia para 100% dos casos, então o respiro de 32px virou do próprio `.pdp`.
  Medido: as cinco telas agora abrem o produto na mesma altura (117px), contra
  as duas alturas de antes.
- **A barra de compra da doc virou a que a PDP publica.** A ficha do Buy box
  mostrava `$168.90 · Add to cart` &mdash; preço e botão, sem nome de produto e
  sem a segunda ação. A folha tinha ganhado `.yb-buybar__info`, `__name` e a
  forma de desktop, e a doc ficou para trás: ela dizia "acima de 860px não
  existe", e existe desde que ficou claro que o problema não é de largura e sim
  de distância. Agora a peça carrega o nome sobre o preço e as duas ações
  (`data-yb-barra-comprar` e `data-yb-barra-avisar`, uma sempre `hidden`), que é
  o que alguém precisa copiar para a tela de esgotado ter ação no rodapé.
  O palco da ficha também perdeu o breadcrumb, pela mesma razão das telas.
- **O rodapé volta a ter sanfona no celular, e centrada.** As três colunas de
  links fecham abaixo de 768 e o título vira o controle que abre — o rodapé
  cabe numa tela em vez de virar uma pilha de doze linhas depois do formulário
  de assinatura. O CSS da sanfona já existia e pendia de
  `:has(.yb-footer__toggle)`; o que faltava era a outra metade, o `<input>`,
  que agora o gerador emite nas onze telas e a peça da doc publica. Título e
  links ficam **centrados**, no mesmo eixo em que a marca, os ícones sociais e
  a barra legal já estavam no celular, e a seta anda junto do rótulo em vez de
  presa à borda direita — encostada ali, ela puxava o título para fora do eixo.
  **Sem linha entre um título e outro**: cada um já é uma faixa de 44px com
  peso e seta próprios, e o traço só somava desenho a uma lista de três itens.
  No desktop nada muda — o checkbox é `display:none`, as listas ficam abertas e
  o título volta a ser rótulo, com um DOM só (a loja hoje duplica o menu
  inteiro no HTML para fazer isso, e quem usa leitor de tela ouve tudo duas
  vezes).
- **A doc de tokens virou nove páginas.** As nove seções eram âncoras numa
  página de 53 KB: o menu listava nove destinos e os nove rolavam a mesma tela.
  Agora cada uma é `tokens/<seção>.html`, com trilha e vizinho anterior e
  próximo, e a fonte é `tokens/pecas/`. A **ordem é a do arquivo, não
  alfabética** — a doc de token vai de fundamento a estado, e alfabetá-la
  destruiria a única coisa que ela ensina além do valor: a ordem em que se
  aprende. `foundation/` deixou de existir: a visão geral da Fundação passou a
  ser `tokens/index.html`, que é onde alguém a procura.
- A coluna **perdeu o fundo pintado** no hover e na página aberta. Cada item
  carrega agora o próprio pedaço do filete — 2px deitados por cima do 1px
  contínuo do `<ul>`, transparentes em repouso —, e o realce é o nome escurecer
  mais o trecho do filete ao lado dele ganhar cor: cinza no hover, grafite na
  página aberta. Fundo numa lista de 49 nomes virava bloco de cor no meio da
  coluna, e competia com o próprio nome. O `margin-inline-start:-1px` é o que
  mantém os nomes alinhados: sem ele, o item marcado andava 2px à direita.
- O **respiro do topo caiu de 64 para 32px** em todas as páginas de doc. Com a
  barra fixa comendo 56, o primeiro elemento nascia a 120px da borda enquanto
  "Início" estava em 72 — a página parecia começar depois do menu. Agora
  conteúdo e trilho *Nesta página* começam juntos, em 88. Embaixo o respiro
  continua largo (80px): lá ele serve para o fim do texto não encostar na borda
  da janela, que é outro problema.
- A **medida da documentação foi de 940 para 1280px**. Os 940 nasceram do
  `.main` das fichas, quando a doc era duas colunas e o conteúdo dividia a tela
  com a lista de peças; com a coluna fixa e o índice à direita, sobrava tela
  vazia em monitor grande enquanto o catálogo rodava em duas colunas. Alargar
  não esticou linha de texto: toda prosa já tinha teto em `ch` — 62 na lede de
  galeria, 64 no "quando usar", 70 no lede de bloco, 74 na nota. Cresceu o que
  devia: em 1440 o catálogo passou a **quatro colunas** e o palco das fichas a
  1160px; em 1920, 1280px de conteúdo sem rolagem lateral.
- O **USA** da marca da documentação ganhou gradiente horizontal nas cores
  oficiais da bandeira — Old Glory Red `#B31942` e Old Glory Blue `#0A3161`.
  Valores crus de propósito: não são cor do sistema (grafite é identidade,
  magenta é ação — [DDR-001](decision-log/DDR-001-primaria-e-grafite.md)), e é o
  único lugar em que aparecem. O branco da bandeira fica de fora: numa faixa
  clara, a listra branca no meio apagaria as letras centrais. Medido contra o
  fundo da barra: 6,70:1 no vermelho e 12,92:1 no azul, os dois em AA. Guardado
  por `@supports` — sem o recorte a palavra desceria para o grafite em vez de
  sumir — e com bloco `forced-colors`.
- No menu as onze telas se chamam **Exemplos**; no `build.sh`, no validador e no
  inventário continuam **telas-prova**. A palavra interna diz o papel — a coluna
  de maturidade do `INVENTARIO.md` só chama uma peça de *estável* depois que ela
  sobrevive a uma destas telas —, e a lede da página carrega esse papel para
  quem chega pelo menu.
- **Templates saiu da coluna.** O degrau continua existindo: a folha carrega na
  cascata e o Page layout tem ficha. Mas no menu ele seria uma promessa — um
  item com uma peça e cinco esqueletos por escrever. Segue alcançável pela capa,
  que é onde a pendência continua declarada.
- O degrau **Templates** declara os cinco esqueletos que faltam (Home, PDP,
  Catálogo, FAQ, 404) e diz por que só tinha um: ele nasceu do CSS, e só o Page
  layout tem folha. Template é arranjo, não estilo — os esqueletos de verdade
  existiam só como as onze telas de exemplo.
- **Princípios, Inventário, Contribuindo e Changelog** entraram na coluna, no
  grupo *Referência*. Eram alcançáveis só pela capa: quem estava numa ficha e
  queria a regra de precedência tinha de voltar ao início.
- **Avatar (átomo) e Menu (molécula) extraídos do "Account menu"**, que não era
  organismo: na loja ele mora dentro de `.yb-header__actions`, e sozinho numa
  tela não é nada — falhava a regra que o próprio sistema declara para o
  degrau, e o aviso do validador já o apontava. A conta logada virou um
  **estado do Header**, e o sistema ganhou dois componentes que existiam na
  loja e não existiam nele. `.yb-usermenu__inicial` virou `.yb-avatar`,
  `__panel` virou `.yb-menu__painel`, e assim por diante; o que sobrou em
  `organisms/` é a única regra de contexto — o menu não existe no toque, porque
  a gaveta já leva os mesmos destinos. Verificado com a mesma medição do corte
  das folhas: **0 diferenças em 1.090 elementos** da tela logada.
- O menu deixou de dizer **"Páginas"**: nenhum design system público usa essa
  palavra como rótulo de navegação, e o grupo misturava duas categorias — um
  esqueleto sem conteúdo e onze telas com catálogo ao vivo. Viraram
  **Templates** e **Exemplos**. A pasta continua `pages/` e o degrau atômico
  continua Página: a escada é a taxonomia, o menu é o que a pessoa lê.
- As **telas de exemplo abrem em aba nova**, na coluna, na página de Exemplos e
  na capa. Elas são a loja inteira, sem a coluna e sem o topo — abrindo no
  lugar, a pessoa perde a navegação e o caminho de volta vira o botão do
  navegador. Cada link avisa `(abre em nova aba)` para leitor de tela.
- A **geometria da coluna** é declarada uma vez, em variáveis, e as duas
  âncoras que a seguram são conta e não número escolhido a olho: o filete da
  sublista cai no **centro do chip do ícone**, e o sub-item começa exatamente
  onde começa o **rótulo do grupo**. É isso que faz a lista parecer pendurada
  no grupo em vez de recuada dele.
- **Topo + coluna em toda página de documentação**, na estrutura que os
  sistemas grandes usam: uma barra fixa com a marca, a busca e a versão, e uma
  coluna à esquerda com a árvore. Nas fichas, um terceiro trilho à direita —
  *Nesta página* — com os sete blocos, e uma trilha
  *Componentes / Átomos / Button* no lugar do "← voltar". Os ícones dos grupos
  são desenhados no cromo e **não** entram em `icons/ybera-icons.svg`: aquele
  sprite vai para o Shopify, e o argumento dele é o peso.
- **Uma coluna de navegação em toda página de documentação**
  (`doc/doc-nav.css`, fonte única em `tools/moldura.mjs`): árvore de grupos em
  `<details>` nativo, com o grupo da página atual já aberto e filtro no topo.
  Antes eram **duas** navegações — uma barra com cinco áreas e uma coluna que
  só existia nas fichas —, e quem estava na página de tokens não tinha coluna
  nenhuma. A divisão dos grupos é a do próprio atomic design: fundação não
  aparece sozinha na tela, componente serve a qualquer página porque não sabe
  em qual está, e página é justamente o contexto que falta ao componente.
  A capa recebeu o mesmo corte. O cromo não usa `.yb-input` nem `.yb-sr-only`:
  a coluna vive em páginas que não carregam as folhas do sistema, e cromo que
  depende de componente aparece sem estilo exatamente onde não há componente.
- **Uma medida só para a documentação** (`--doc-medida: 940px`,
  `--doc-respiro`, `--doc-respiro-largo`, em `doc/doc-nav.css` — a única
  folha que toda página de doc carrega). A capa vinha de 880, a de ícones de
  900 e a de decisões de 900; a barra de áreas ignorava as três e nascia
  colada na borda, com a marca a 24px enquanto o `<h1>` logo abaixo nascia a
  82. Agora o conteúdo da barra mora na mesma caixa do conteúdo da página —
  centrada onde a página é centrada, na borda onde a página sangra (a ficha,
  a de tokens e o preview). Qual das duas é de cada página está declarado em
  `data-moldura` no `<body>`, porque é do layout e não do cabeçalho.
- **Três páginas de grupo, geradas** (`foundation/`, `components/`, `pages/`),
  porque item de menu sem página atrás é rótulo clicável que não leva a lugar
  nenhum. Todos os números são contados do disco.
  - *Fundação* lista as **nove seções de dentro da página de tokens** — título
    e primeira frase lidos dela própria —, mais os ícones e o `base/`, que era
    carregado por toda peça e **não tinha página em lugar nenhum da doc**.
    Ícone não virou token de propósito: token é valor, ícone é ativo.
  - *Componentes* é o catálogo das **48 peças em ordem de nome, com filtro** —
    o padrão de Carbon, Primer e Atlassian. Os níveis atômicos continuam sendo
    as pastas, a ordem da cascata e a regra que o build cobra, mas deixaram de
    ser o eixo de navegação: ninguém procura "uma molécula", procura "um campo
    com erro". O degrau ficou impresso em cada cartão, como nota de rodapé.
  - *Páginas* separa o esqueleto da tela e lista as onze.
- A Home v1 virou `pages/home.html`: o `index.html` de `pages/` passou a ser a
  página do grupo, e toda área do sistema tem o próprio índice. Antes a doc tinha quatro molduras diferentes e o único caminho entre
  elas era voltar à capa. A coluna lateral perdeu a escada — ela repetia, quatro
  linhas abaixo, os mesmos links da barra — e voltou a ser só as peças do
  degrau aberto. `pages/` fica de fora de propósito, e há checagem que reprova
  se a barra vazar para lá.

### Alterado
- **O sistema virou atomic design na árvore de arquivos** ([DDR-010](decision-log/DDR-010-escada-atomica.md)):
  `components/` + `patterns/` deram lugar a `base/`, `atoms/` (12), `molecules/`
  (21), `organisms/` (15), `templates/` (1) e `pages/` (11), com o comportamento
  em `behavior/` e a moldura da doc em `doc/`. **Nenhuma classe CSS mudou de
  nome** e nenhum estilo computado mudou: o corte das duas folhas nas cinco foi
  medido em 4.812 elementos das seis telas mais pesadas, com 0 diferenças.
  A regra de cada degrau é cobrada no build — átomo que compõe outra peça
  reprova.
- **Um gerador só** (`tools/fichas.mjs`) escreve as 49 fichas, as 4 galerias e
  os 4 `solo.html`; `tools/padroes.mjs` deixou de existir.
- O carrossel de vídeo desceu de organismo para molécula, e `empty-state`, que
  existia como padrão **e** como componente, virou uma peça só.

### Adicionado
- **Ficha por padrão** (`patterns/<id>.html`, gerada por `tools/padroes.mjs` a
  partir de `pecas/` + as duas folhas): demos, quadro de 375px, **peças que o
  padrão consome** lidas da marcação, API lida do CSS e marcação copiável. A
  galeria de 82 KB virou índice com filtro e famílias, como a de componente.
- **Ficha por componente** (`components/<id>.html`, gerada de `pecas/` + `fichas.json`):
  demos, quadro de 375px, API lida do CSS, marcação copiável, acessibilidade e
  faça/não faça. A galeria de 118 KB virou índice.
- **PDP esgotada, PDP com variante e PDP em promoção** como telas-prova, com os
  estados que a loja não tinha: aviso de volta ao estoque, seletor movendo
  preço/foto/estoque, preço anterior riscado e selo "Save N%".
- **FAQ** e **404** montadas com o sistema.
- **Offer seal** (`.yb-offerseal`): selo estrelado de 20 pontas em `clip-path`,
  variantes `--sale` e `--accent`, escala pela caixa.
- **Faixa do parceiro** (`.yb-partnerbar`) que assume o recado depois que a arte
  rola; **cartão de destaque** (`.yb-offercard`) com dois alvos — cartão para a
  PDP, botão para o carrinho — e zoom da foto só no hover do cartão.
- **Hero em loop** (`data-yb-track-loop`): setas sempre ativas, o último volta
  ao primeiro sem parar.
- **Blur progressivo de três folhas** sobre foto (hero, cartão de oferta,
  banners) e **véu em curva de uma camada** (`--yb-scrim-curve-*`).
- `Ybera.init(raiz)` religa **todo** o comportamento em DOM que chega depois
  (trilho, parceiro, faixa, barra de compra, navegação, relógio), com guarda
  `data-yb-bound` — antes só galeria, stepper e busca.
- **"New chapter Ybera"** como terceira porta do painel "About Us", ao lado de
  "Our Story" e "Blog" (`/pages/new-chapter-ybera`). No desktop o painel passa
  de duas para três colunas de 128px sem quebrar linha; no celular vira a
  terceira linha do acordeão, 44px de alvo, uma linha de texto.
- **Cabeça da gaveta** (`.yb-nav__head`): a marca à esquerda, o X à direita. O
  logo é decorativo — a barra atrás já o tem como link para a home, e repeti-lo
  só acrescentaria uma parada de Tab e um segundo "Ybera" anunciado.
- **Faixa de conta na gaveta** (`.yb-nav__conta`): deslogada saúda com ícone e
  **Log in**; logada troca o ícone pela inicial, mostra o primeiro nome e leva a
  **Account**. Único bloco com fundo e único botão da gaveta.

### Alterado
- **O desfoque do cartão de oferta caiu de 1rem para 0,5rem.** A folha já dizia
  "desfoque se lê em relação ao tamanho da foto, não em pixels", e o valor
  desobedecia a própria regra: hero 32px em 1440 = **2,2%** da largura; cartão
  16px em 343 no celular = **4,7%**, e em 266 no desktop = **6,0%**. No pé do
  cartão, onde o desfoque vai ao máximo, ele dissolvia a base do frasco numa
  mancha sem forma — foi isso, e não o enquadramento, que o Urlan viu como
  defeito. Com 0,5rem são 2,3% e 3,0%. Contraste medido sem desfoque nenhum:
  título **6,64:1**, preço 6,36, relógio 5,86 — o véu sustenta sozinho.
- **A foto do cartão de oferta é recortada em volta do produto.** O cartão é
  2/3 e as fotos do catálogo são 1/1: com `cover` a altura manda, a foto entra
  inteira e o chão vazio do estúdio vem junto. Na foto do óleo de mirra medi um
  degrau de **31 pontos de luminância em y=412** de 512 — abaixo dali é fundo
  liso, e o desfoque progressivo arrastava o frasco cortado para dentro dele.
  `enquadrar_oferta` mede o produto na imagem (`getbbox` sobre máscara de
  saturação/escuro) e corta com folga em cima e nos lados e **zero embaixo**.
  Não dá para resolver na folha: a margem morta vai de 0% a 33% entre as seis
  fotos que medi, e número fixo acertaria uma e erraria as outras.
- **Related Products vira trilho no celular, nas cinco PDPs.** Eram quatro
  cartões em duas fileiras de dois: sem buraco, mas com o dobro da altura de
  uma fileira de trilho. Em 375px a seção caiu de **754px para 556**. Mesmo
  `.yb-grid__rail` do Best Sellers, e mesma regra — acima de 768 ele some e os
  quatro voltam a ser células da grade (medido em 1200: 266px em
  x=32/322/612/902; em 900 continua 3+1, como era).
- **Best Sellers: grade no desktop, destaque + carrossel no celular.** Em duas
  colunas o destaque ocupa as duas e sobravam três cartões para duas células —
  a terceira fileira ficava com um cartão e uma vaga vazia ao lado. Agora são
  duas fileiras: destaque em cima, vizinhos em trilho embaixo. Em 375px a seção
  caiu de **1338px para 1140**.
  Quem faz isso é `.yb-grid__rail`, um invólucro que acima de 768 vira
  `display:contents` e some da caixa — os cartões voltam a ser células diretas
  da grade e o desktop fica idêntico (medido em 1200: quatro de 266 em
  x=32/322/612/902, como sempre foi). Sem isso seria preciso listar os cartões
  duas vezes no HTML.
  A regra mora em `patterns/`, e não em `components/`, por cascata:
  `.yb-grid__rail` e `.yb-track` têm a mesma especificidade, e patterns carrega
  depois. Checagem nova no portão cobre a marcação e esse endereço.
- **O trilho de Best Sellers em toda largura foi testado e desfeito** — abaixo
  de 1152 ele resolvia o 3+1 rolando, mas mostrar três cartões e meio não foi o
  que se quis no desktop. A medida fica registrada na peça do cartão: 1152px é
  a largura em que quatro cartões de 260 param de caber.
- **O `span 2` do cartão de oferta no trilho passou a valer só abaixo de 768.**
  A regra foi escrita para a grade de duas colunas do celular; no trilho de
  desktop ela dava um cartão de 536px e 228px de sobra para rolar numa fileira
  que cabia inteira. Na grade ele sempre foi uma coluna como as outras nessas
  larguras.
- **A galeria de componentes agrupa em cinco famílias** — ação e entrada,
  navegação, produto e venda, conteúdo e marca, aviso e estado. O índice tinha
  crescido para 37 peças numa lista onde tudo pesava igual. A tabela de famílias
  é literal em `tools/fichas.mjs`, não heurística: agrupar por prefixo de classe
  juntaria `.yb-card` com `.yb-cart`. Peça sem família, família apontando para
  peça que não existe ou peça em duas famílias **quebram o build**. A coluna da
  esquerda continua alfabética de propósito: ali quem chega já sabe o nome.
- **Copy de amostra nas seis avaliações das telas-prova** (`AMOSTRA_REVIEWS` no
  gerador, ligada por `REVIEWS_FONTE`), medida para fechar três linhas na
  largura de desktop — as capturadas tinham de 34 a 92 caracteres e quatro
  paravam na segunda linha, então a tela nunca mostrava o cartão cheio.
  `_captura/reviews.json` não foi tocado, e os nomes da amostra são outros:
  foto, produto e nota continuam sendo os reais.
- **O cartão de review reserva três linhas de texto**, em vez de aceitar até
  três. `line-clamp` impedia de crescer, nada impedia de encolher: com dois dos
  seis reviews em duas linhas, o vão entre o texto e o nome mudava de cartão
  para cartão. Agora as seis caixas medem 65px e o texto termina no mesmo y, na
  home e na PDP. Nenhuma palavra de cliente foi reescrita — a caixa é do
  componente, o texto é de quem avaliou.
- **O trio do blog deita no toque.** Abaixo de 860 `.yb-posts--trio` vira trilho
  (`yb-track` composto na marcação, como `.yb-reviews`), com teto de 20rem por
  cartão. Em 375px a seção caiu de **464px para 309**. Acima de 860 nada muda: a
  folha só desfaz o trilho. A v1 (destaque + dois secundários) continua lista —
  deitar um destaque 16/9 com duas miniaturas de 96px dá três slides de
  anatomias diferentes.
- Nome do produto no cartão: peso 500 → 600, sem sublinhado no hover.
- Estrela de avaliação: `gold-500` → `gold-600` (3.45:1, passa 1.4.11) e sem
  contorno. `--yb-accent-star-edge` fica @deprecated.
- Cartão de coleção não corta mais o packshot (4/3 → 5/7).
- Selos de certificação saem de baixo do banner na home v2.
- Reviews na home mostram só o carrossel.
- A capa não lista mais as capturas da ybera.us em produção ("A loja hoje").
  Elas eram referência, não entrega, e o índice é a porta das telas do
  sistema. Os arquivos ficam em `_captura/home/` e `_captura/pdp-fashion-gold/`
  — são fonte de dados do gerador, não deixam de existir por sair da capa.
  O CSS de `.linhas`, que só elas usavam, saiu junto.
- A linha de apoio da capa ficou em "Fundação, componentes e padrões." A
  ressalva de plataforma — US em Shopify, BR em Wake — é decisão de projeto e
  vive no README e na DDR; na capa ela respondia uma pergunta que ninguém faz
  na porta de entrada.

### Corrigido
- O painel do mega-menu ficava **atrás** de qualquer conteúdo abaixo quando havia dois
  cabeçalhos na página: a barra é `sticky` com z-index próprio, então é ela que
  disputa a frente, e duas barras empatam em 1100. Agora sobe para 1200 enquanto há
  painel aberto, pelas três portas (clique, teclado, ponteiro), só no desktop.
- A sanfona do rodapé no celular fechava listas que **não tinham checkbox para
  reabrir**: as três colunas do rodapé v2 mediam altura 0, dez links no DOM e nenhum
  alcançável, em todas as telas publicadas.
- O painel do "About Us" herdava o piso de 8rem por coluna, escrito para o
  mega-menu do Shop. Lá cada grupo encabeça uma sublista e o piso dá o compasso
  da grade; ali não há sublista nenhuma — cada grupo é um link solto, e "Blog"
  (30px de texto) virava uma coluna de 128. Agora um painel sem sublista deixa
  os grupos medirem o próprio rótulo: 65, 30 e 129px, com 24 entre eles. O Shop
  não muda.
- `.yb-post--stacked` caía na regra de 560px escrita para o post em **fileira**:
  no celular o trio do blog não era um trio de cartões, eram três fileirinhas de
  miniatura 96px. O `:not()` agora exclui também o empilhado.
- Na gaveta, a conta era o item de texto `Account` — o primeiro de 25 links de
  mesmo peso, que ninguém achava. Virou a faixa acima; `.yb-nav__item--account`
  foi removida.
- `.yb-icon{color:currentColor}` mora em `icons/`, que carrega **depois** de
  `components/` e `patterns/`: com a mesma especificidade a folha de trás ganha,
  e pintar um ícone por classe única no próprio ícone não fazia nada. O comentário
  agora diz isso, e a regra nova usa seletor de descendente.
- A demo do header em `patterns/` ainda dizia **"Behind The Shine"** no painel
  "About Us" — rótulo que o sistema já tinha trocado por "Blog". Documentação
  mostrando um menu que o gerador não produz mais.
- `montar-ds.py` escrevia `index-logado.html` **duas vezes** seguidas, com os
  mesmos argumentos: bloco duplicado no `__main__`. Sobrescrevia o próprio
  arquivo e imprimia a mesma linha de log duas vezes.
- Varredura de entrega ao time de desenvolvimento (2026-09-16): `.yb-empty`
  definido em duas folhas com valores conflitantes (o de `patterns/` vencia e
  anulava `--inline`); bloco morto da vitrine na gaveta do menu; custom
  properties sem prefixo (`--f/--de/--ate` → `--yb-blur-*`); `[aria-busy]`
  global escopado ao sistema; toast com dois timers; `share` que engolia erro
  real; `inert` sobre o container de toasts; stepper errado ao trocar variante;
  âncoras `#collection`, `#post`… mortas em 9 fichas; `</div>` perdido na rampa
  do dourado; 42 `<button>` sem `type`; `build.sh` com `sed -i ''` só macOS e
  sem `set -e`; três checagens tautológicas do validador (ponte, `dist/*.css`
  por amostra, `focusin`); gerador das telas-prova apagava `nova-loja/` antes
  de ter a nova pronta e assumia "In stock" quando a loja respondia 429.

### Removido
- `components/brand/` (cópia idêntica de `brand/`), `_captura/relacionados.json`
  (vazio, sem leitor), `MOEDA` e `import urllib.request` sem uso no gerador,
  lápides de regras já removidas no CSS.
- **`.yb-header__announce`.** A faixa do topo era uma cópia declaração por
  declaração de `.yb-notice`, e as duas seguiam vivas. Agora o header consome o
  componente; o padrão só o posiciona. A marcação mudou de
  `class="yb-header__announce"` para `class="yb-notice"` nas oito telas-prova e
  no gerador.
- **`onclick="Ybera.toast({…})"` da documentação.** Comportamento escrito na
  marcação não aparece em nenhuma busca por `data-yb-`. Ver `data-yb-toast`.

### Adicionado — home v3 e PDP v2
- **Home v3** (`_captura/nova-loja/index-v3.html`): catorze seções na ordem que
  o time pediu — faixa preta, cabeçalho, banner com o parceiro, Best Sellers,
  Shop by Concern, Tolstoy, Shop by Collection, avaliações, TikTok, selos,
  logos, blog, citação e rodapé. É a v2 sem o quiz, sem o bloco de autoridade
  e sem o FAQ curto.
- **PDP v2** (`_captura/nova-loja/pdp-v2.html`): faixa preta, recado do
  parceiro, bloco de compra, relacionados e avaliações. Sem banner e sem
  breadcrumb. Custa 13px a mais que a PDP padrão até o nome do produto.
- **`.yb-partnerbar--fluxo`** — a faixa do parceiro sem arte para ancorá-la.
  A versão `fixed` só funciona depois que a arte rola, porque aí a faixa preta
  de anúncio já saiu e a barra do cabeçalho está colada no topo. Numa página
  onde a faixa nasce visível isso é falso, e ela nascia **atrás** da barra
  (medido: faixa em 77, barra terminando em 117). `sticky` resolve os dois
  momentos com uma regra.
- `faixa_parceiro(ancorada=False)` nasce visível: sem banner não há balão, e
  nascer `hidden` faria o recado sumir por completo sem JavaScript.
- `.pdp--solto` dá ao bloco de compra o respiro que o breadcrumb dava.
- `montar_pdp(..., arranjo=)` monta as mesmas peças em duas ordens. A coluna de
  compra e os relacionados saíram para variáveis em vez de aparecerem duas
  vezes no arquivo.

### Corrigido — o espaçamento do topo do FAQ
- O breadcrumb do FAQ não usava `.yb-block--tight` e **encostava na barra do
  cabeçalho** (0px), enquanto a PDP, que já usava a classe, guardava 24. Duas
  telas com breadcrumb e dois espaçamentos diferentes.
- O título da página estava num `.yb-block` comum, tratado como se fosse uma
  seção: 64px de respiro acima, que o breadcrumb já tinha dado, e 64px abaixo
  que, somados aos 64 do bloco seguinte, abriam **205px** entre a linha de
  apresentação e o primeiro conteúdo. Nova regra `.yb-crumb + .yb-block`: 24px
  acima, a mesma distância que o breadcrumb guarda do cabeçalho, e zero
  abaixo, porque quem separa o título do conteúdo é o respiro do próprio
  conteúdo, uma vez só.

| Vão | Antes | Depois |
|---|---|---|
| Cabeçalho → breadcrumb | 0px | 24px |
| Breadcrumb → título | 85px | 24px |
| Apresentação → conteúdo | 205px | 64px |

As PDPs não mudaram: lá o breadcrumb é seguido pelo bloco de compra, não por
um `.yb-block`.

### Corrigido — sete ícones apagados na galeria
- Os ícones marcados **reservados** saíram com `--yb-opacity-control-disabled`
  (45%), e isso os apagou: 2,81:1 contra os 16,66:1 dos outros trinta e dois.
  Numa página cujo único trabalho é mostrar o vocabulário, apagar parte dele é
  esconder o que ela existe para mostrar — e opacidade sobre conteúdo é regra
  dura do sistema. O token também estava errado: ele é para controle
  desabilitado, e ícone de catálogo não é controle. Quem diz "reservado" é o
  selo, em texto, que o leitor de tela também anuncia.

### Corrigido — a foto grudava atrás da faixa
- A galeria `sticky` da PDP lia `--yb-header-h`, que mede só a barra. Quando a
  faixa do parceiro está na tela ela soma 3,5rem, e a foto parava atrás dela —
  justamente ao rolar, que é quando o `sticky` começa a valer. Passa a ler
  `--yb-chrome-h`, o token que existe para isso.

### Adicionado (nesta rodada)
- **`data-yb-toast`** — dispara um toast direto, com `data-toast-titulo`,
  `-texto`, `-variante` e `-duracao` (0 mantém em tela). O `data-yb-comprar` ao
  lado continua para quem precisa de espera e estado de carga.
- **`--yb-opacity-media-disabled`** — a foto do produto esgotado recua sem
  sumir; era `.55` literal.
- Duas checagens: **nenhum degrau de breakpoint vale dos dois lados** e **as duas
  cópias do overlay de busca dizem a mesma coisa** (108 no total).

### Corrigido (nesta rodada)
- **`.yb-notice` abria 12px de vão no meio da frase.** Era `display:flex` com
  `gap`, e cada trecho de texto solto vira item flex anônimo: "orders over
  <b>$50</b>" saía com um buraco antes do valor — medido. Virou `display:block`.
- **A estrela do Judge.me tinha outra cor que a do sistema.** A ponte lia
  `--yb-accent-text` (gold-700) enquanto `.yb-rating__stars` desceu para
  `--yb-accent-star` (gold-600): a mesma página mostrava duas estrelas
  diferentes. A ponte passa a ler o mesmo token.
- **O degrau 768 valia dos dois lados.** `(min-width:768px)` dava a goteira de
  desktop enquanto `(max-width:768px)` dava a barra de celular — em exatamente
  768px as duas regras valiam. O degrau agora pertence ao `min-width` e o
  `max-width` recua 0,02px; mesma correção em 1024, e o `min-width:861px`
  virou `860.02px` para fechar o vão de 1px que sobrava. Convenção escrita em
  `00-primitives.css` e conferida pelo validador.
- **As duas cópias do overlay de busca já tinham divergido** — grupos, listas e
  `action` diferentes entre a ficha e a galeria de padrões. A galeria passa a
  trazer a anatomia da ficha.
- **Opacidade sobre texto no relógio da oferta** (`.yb-offercard__sep`, `.6`):
  virou cor. Quatro outras opacidades literais viraram token.
- Checagens presas à formatação: três liam blocos de JS por indentação exata e
  duas exigiam ordem de atributos no HTML. Agora contam chaves e leem atributos
  sem ordem.
- Gerador: `versao()` era chamada duas vezes por página (dezesseis leituras de
  disco por build) e as cinco telas repetiam o mesmo esqueleto — viraram
  `pagina()` e `fim_de_pagina()`. Saída byte a byte idêntica, conferida com um
  catálogo falso, sem tocar a rede.
- 27 `href="#"` na galeria de padrões passaram a apontar para a própria seção.
- Sete ícones que só existiam na galeria ficaram marcados **reservados**, e
  `yb-filter` entrou no botão de filtros do catálogo.

## [0.12.1] — 2026-09-02

### Corrigido
- **358px de vazio no header.** Em 1440, logo e menu terminavam em x=754 e os
  ícones começavam em 1112: o menu era do tamanho do próprio conteúdo, grudado
  no logo, e `margin-inline-start:auto` empurrava os ícones para a borda. O
  `.yb-header__nav` agora ocupa o espaço que sobra (`flex:1`) e centraliza os
  links dentro dele. Na gaveta mobile volta a `display:block`, senão "fechar"
  e a lista ficariam lado a lado.
- **A faixa preta dizia duas coisas.** "Free shipping on orders over $50 ·
  Elevate your hair, elevate your confidence" — um aviso operacional colado a
  um slogan, separados por um ponto que ninguém lê. A faixa é lugar de UMA
  informação acionável; ficou só o frete. O slogan não some do sistema: é voz
  de marca, e mora no hero ou no rodapé, não numa tira de 13px. No celular a
  linha única também deixou de quebrar em duas.
- **Fileira de cartões desalinhava quando um título cabia em uma linha.** O
  clamp de `--yb-card-title-lines` só limitava as linhas; não as reservava.
  "Deep Care Hair Kit | FREE 1L Shampoo" ficava em uma linha ao lado de três
  títulos de duas, e rating e preço dele subiam 19px na home (no celular, 2
  linhas ao lado de 3). `.yb-card__title` ganhou `min-height` calculado da
  mesma variável do clamp — mude uma, mudam as duas.
- **Selo "Best seller" dentro da seção Best Sellers.** Dois dos quatro
  cartões o tinham, e a leitura virava "os outros dois não são". O selo só
  informa fora dessa seção; `card()` ganhou `flag=False` e a home o desliga ali.
- **"View all treatments" não era o nome da seção.** O link da Best Sellers
  virou "Shop all best sellers", apontando para a coleção de verdade em vez de
  `#`. Verbo de loja e o mesmo nome do título: quem ouve o link fora de
  contexto sabe onde vai (WCAG 2.4.4).
- **Catálogo vazando para o cliente no título do cartão.** `dados.titulo_limpo()`
  tira o que não é nome: "_" e "*" sobrando no fim, espaço duplo, "– Old
  Packaging" (linguagem de estoque). O mesmo kit listado duas vezes (uma com
  "_") agora entra uma vez só — lado a lado eram dois cartões iguais com
  preços diferentes.
- **A oferta "| FREE CRONOGRAMA" saiu do título e virou selo.** Era a parte que
  o corte de duas linhas engolia, e é informação de venda, não nome. Vira
  `.yb-badge--accent` ("Free Cronograma", "Free 1L Shampoo") no canto da foto —
  texto de verdade, que busca e leitor de tela enxergam. O preço riscado
  (`yb-price__was`) continua pronto, mas a loja não preenche `compare_at_price`
  em nenhum dos oito produtos: o "WAS $172.60 NOW $89.90" existe só pintado na
  foto. Isso o sistema não inventa; é dado que falta no Shopify.
- **O cartão passou a usar as duas capacidades que já tinha.** Segunda foto no
  hover (a loja manda as duas; o gerador só emitia uma) e "Add to cart" sobre a
  imagem, sempre visível no toque. `.yb-card__action` ganhou `z-index:1`: o
  link do título estica um `::after` por cima do cartão e, sem isso, o botão
  aparecia mas o clique caía na PDP. Cada botão nomeia o produto no
  `aria-label`.
- **O rótulo do cartão de coleção estava vestido de botão de compra.**
  `.yb-collection__label` usava `--yb-action-bg`, a mesma cor do "Add to cart"
  e do contador do carrinho: quatro links de categoria fantasiados de CTA. O
  token é explícito — magenta é função, existe onde há decisão a tomar. A pill
  virou superfície clara com texto escuro (16.7:1) e sombra curta para se
  descolar de foto clara. Na home, a grade "What's Standing Between You and
  Great Hair?" passou de `--center` para `--bottom`: a pill no meio cobria
  justamente o cabelo que ilustra o problema.
- **"Curly Hair" listado como obstáculo.** A seção pergunta o que está entre
  você e um cabelo bonito, e respondia "cabelo cacheado". Os rótulos agora são
  os do menu, que já nomeia os mesmos quatro destinos: Damaged Hair · Frizz &
  Dryness · Thinning / Hair Loss · Undefined Curls. Um vocabulário só para o
  mesmo lugar.
- **O carrossel de reviews não se apresentava.** Sem título, sem setas, com a
  barra de rolagem escondida: um trilho solto entre duas seções, seis
  avaliações e nenhum sinal de que andava. Ganhou cabeçalho ("What Our
  Customers Say") e as setas que `.yb-track__nav` já previa e ninguém emitia.
  Sem nota agregada nem "read all reviews": a loja esconde o resumo do
  Judge.me e não tem página de avaliações (`/pages/reviews` dá 404). Número
  inventado seria pior que nenhum.
- **Setas de trilho (`data-yb-track-nav`), no JS.** Nascem `hidden` e o script
  as revela — sem script, botão que não faz nada é pior que nenhum botão.
  Andam um cartão por clique, desligam nas pontas e somem quando não há sobra
  para rolar. Respeitam `prefers-reduced-motion`.
- **Título de review que repetia o texto.** O Judge.me usa a primeira frase
  como título, e ela aparecia em negrito e de novo logo abaixo. Quando o texto
  começa com o título, o título sai.
- **Nome do produto na review: limpo e clicável.** A mesma `titulo_limpo()` do
  cartão (agora também tira "| New Packaging" e "- YBERA PARIS" no fim), e o
  nome virou link — quem se convence pela avaliação precisa chegar ao produto.
- **No post do blog, só "Continue reading" era link.** Título e foto, onde a
  pessoa de fato clica, não levavam a nada; e o link carregava `yb-external`,
  ícone de "sai do site", para um artigo da própria loja. O título virou o
  link, esticado sobre o artigo inteiro como no cartão de produto. "Continue
  reading" ficou como reforço visual (`<span>`, seta), não como segundo link:
  três "Continue reading" iguais eram três links idênticos para quem ouve
  (WCAG 2.4.4).
- **Resumo do post cortado no meio da palavra.** O Shopify já mandava
  "…different. Fi..." e o CSS cortava de novo. `resumo_limpo()` tira a
  reticência, descarta a palavra partida e só repõe "…" se a frase não fechou.
- **Coluna do blog terminava 179px antes do destaque.** Destaque de 16/11 com
  541px ao lado de dois artigos somando 362. O destaque passou a 16/9, as
  miniaturas de 132 para 160 e o resumo de 2 para 3 linhas: a sobra cai para
  uns 66px. Distribuir os dois artigos na altura do destaque foi tentado e
  desfeito — abria um buraco de 140px entre eles e a coluna parecia quebrada.
- **PDP: o botão de compra caía fora da primeira tela.** A descrição inteira
  (532 caracteres, oito linhas) entrava entre o preço e o botão e repetia no
  acordeão. `resumo_curto()` deixa no bloco só as primeiras frases; o texto
  inteiro mora em "Description". No celular, nova barra de compra fixa
  (`.yb-buybar`, `data-yb-buybar`): aparece quando o botão real sai de vista,
  repete preço e ação, nunca as duas visíveis ao mesmo tempo.
- **PDP: dado inventado no bloco de compra.** Três variantes fixas no gerador
  para um produto de variante única; "4.8 · 412 reviews", "Best seller", "In
  stock", "arrives Sep 4 – Sep 6" e "Made in Paris" como texto fixo. Agora:
  variantes e estoque vêm do catálogo (endpoint `.js` do Storefront), o
  seletor só aparece com mais de uma variante, prazo calculado do dia da
  montagem, e nota, selo e origem saíram por falta de fonte.
- **PDP: o mesmo benefício em três componentes.** Pills, fileira de confiança
  e selos diziam variações da mesma coisa. Ficaram duas listas com papéis
  distintos: benefício (o que o produto faz) e confiança (o que a loja
  garante). Os selos saíram da história do produto.
- **PDP: fotos de problema legendadas como resultado.** A grade final usava as
  fotos "Damaged Hair" e "Frizz" da home com "Radiant shine" por cima. Agora
  são as duas fotos de resultado da captura (as do blog), cada uma levando ao
  artigo de origem. Dois cartões honestos em vez de quatro com um errado.
- **PDP: oito links para `#`.** Os banners da dupla viraram `<div>` (não há
  destino); o banner Gold leva à coleção Fashion Gold e o "Deep repair" à do
  Cronograma. Olhos-de-texto inventados ("98% 5-star reviews") saíram.
- **PDP: galeria abria com a foto de 420px esticada a 544.** O catálogo tem
  uma de 2000px em segundo lugar; `dados.produto()` traz a primeira foto com
  800px ou mais para a frente. As de 300px continuam moles como miniatura
  ampliada — asset da loja.
- **PDP: "Ybera USA" nos quatro relacionados e "Treatments" para `#`.** A
  linha de marca saiu (todos são da mesma loja); o breadcrumb aponta para a
  coleção da linha detectada no título (Fashion Gold) e mostra o título
  inteiro, sem o corte em 34 caracteres.
- **"🔥Sales" virou "Sales" em magenta.** O emoji pesava mais que os links
  vizinhos, mudava de desenho por sistema operacional, colava no texto sem
  espaço e o leitor de tela anunciava "fire Sales". `.yb-nav__link--sale` e
  `.yb-nav__grouptitle--sale` usam `--yb-text-link` — o mesmo magenta do
  `.yb-badge--sale`, então o link e o selo de desconto contam a mesma história.
  Peso igual aos irmãos: a cor sozinha já separa (5.36:1 sobre o branco).
- **A vitrine do submenu "Shop" só existia na home.** Estava colada a mão
  direto no HTML gerado, sem nenhuma linha no script que a desenhasse — a PDP
  nunca teve chance de ganhá-la. Agora `menu()` recebe um produto real do
  catálogo (`promo`) e desenha a mesma vitrine nas duas páginas.
- **A faixa de logos de marca não centralizava.** Sete logos entocados à
  esquerda de uma barra escura de tela inteira, com o resto vazio. A causa era
  a mesma dos selos abaixo: um `.yb-track--row` sem `justify-content`,
  encostando tudo no início. `justify-content:safe center` — o `safe` importa:
  sem ele, centralizar um trilho que ainda precisa rolar no celular prende o
  primeiro logo fora da área alcançável.
- **Os selos de certificação (`.yb-seals`) esticavam em colunas de largura
  igual.** Cinco colunas de `1fr` dividindo a tela inteira, cada uma bem mais
  larga que o próprio selo — cinco ilhas, não um grupo. Virou `flex` com
  `justify-content:center`: o grupo centraliza do tamanho do próprio conteúdo,
  não cada peça dentro de uma fatia artificial.
- **"Explore Our Collections" ficava presa ao contêiner de 1200px.** Ganhou
  `flush=True` em `lista_colecoes()` e passou a sangrar até a borda da tela,
  igual ao carrossel de vídeo e à faixa de logos — os cartões mantêm a goteira
  da página, só a seção que se estica.

## [0.12.0] — 2026-09-02

### Adicionado
- **Favoritar, na PDP.** Não é componente novo — é `.yb-iconbtn` com um
  `aria-pressed` a mais, no canto oposto ao contador de fotos da galeria.
  Marcado, o coração troca de contorno para sólido e a cor vira
  `--yb-accent-love` (o mesmo magenta de ação, com nome próprio para o dia em
  que os dois precisarem divergir). Cor sozinha não bastava — reprova a WCAG
  1.4.1, e falha primeiro para quem não distingue magenta de cinza — por isso
  a FORMA muda junto.
- **`yb-heart-filled`**, símbolo novo no sprite. `<use>` para arquivo externo
  não deixa o CSS de quem consome vencer o `symbol{fill:none}` do sprite — só
  o que o próprio `<path>` traz de fábrica sobrevive à viagem — então o
  preenchimento mora `fill="currentColor"` direto no path, do jeito que
  `yb-star-filled` já fazia sem ninguém ter escrito por quê. Escrito agora,
  para os dois.
- **`--yb-accent-love`**, token semântico. Aponta para `--yb-action-bg` hoje;
  o nome separado existe para o token poder divergir sem caçar hex em CSS de
  componente.

## [0.11.0] — 2026-09-02

Três componentes que a loja já pedia e um campo que passou a se comportar como
o protótipo de referência. A parte que interessa não são as peças novas: são as
duas checagens que nasceram de defeitos reais desta rodada.

### Adicionado
- **Search overlay** (`.yb-search`) — folha do topo, largura inteira, três
  painéis: o inicial (populares, coleções, mais vendidos), os resultados e o
  vazio. Busca é troca de contexto da página toda, não uma caixinha no header —
  por isso a folha, e por isso ela sai do `<dialog>` nativo, que já dá foco
  preso, Esc e devolução de foco sem uma linha reescrita. O estado vazio nunca
  é beco sem saída: diz o termo que falhou e oferece três saídas.
- **Progress bar** (`.yb-progress`) — três alturas, quatro tons, e a variante
  indeterminada. A indeterminada **não** declara `aria-valuenow`: anunciar um
  número que ninguém sabe é pior do que não anunciar. Sem movimento
  (`prefers-reduced-motion`) a faixa vira pista esmaecida, porque uma faixa
  parada em 40% mentiria sobre o progresso.
- **`--yb-control-h`** — a altura REAL de um controle "mid" (50px), a que o
  botão tem em pé e não o piso de 44 que ele declara. Existe porque campo e
  botão dividem a mesma linha na consulta de frete, e 4px de diferença ali é a
  primeira coisa que se vê.
- **`--yb-accent-star`** e **`--yb-accent-star-edge`**, o par que pinta as
  estrelas de avaliação.
- **Ícone `clock`**, para as buscas recentes.
- **`POST /__retrato`** no `serve.sh` — grava `test/atual.json` direto do
  navegador. O retrato de layout nasce lá (precisa de viewport de verdade) e
  antes o caminho até o disco era copiar 60 KB de JSON do console na mão. É a
  razão de a rede de layout quase nunca ser recapturada; agora é uma chamada.
- **Duas checagens** (83 no total), as duas nascidas de defeito desta rodada:
  `data-yb-open` sem destino na página — a lupa do header carregou o atributo
  parecendo ligada, e nenhum navegador avisa que um botão não abre nada; e
  imagem citada que não existe no disco — a PDP apontava para um arquivo que o
  gerador tinha parado de copiar, com `alt` vazio, invisível em todo teste.

### Alterado
- **O campo de formulário ganhou rótulo flutuante.** O rótulo vive dentro da
  caixa e sobe para cima da borda quando o campo tem foco ou valor, abrindo um
  entalhe com o próprio fundo. Sem JS: o input leva `placeholder=" "`, que é o
  que dá a `:placeholder-shown` algo em que casar.
  **O markup mudou** — o controle agora vive dentro de um `.yb-field__box` e o
  `<label>` vem *depois* dele, senão o combinador `~` não o alcança:

  ```html
  <div class="yb-field">
    <div class="yb-field__box">
      <input class="yb-input" id="zip" placeholder=" ">
      <label class="yb-field__label" for="zip">ZIP code</label>
    </div>
    <span class="yb-field__hint">Free shipping over $59.</span>
  </div>
  ```

  `.yb-input` solto continua funcionando como antes, com borda própria.
  O anel de foco e a borda de erro passaram a ser `box-shadow` por dentro em
  vez de `border-width`: dobrar a borda é mudança de layout, a caixa reflui 1px
  e o rótulo flutuante, ancorado nela, treme junto.
- **`.yb-field--row`** — campo e ação na mesma linha, com a mensagem ocupando a
  linha inteira embaixo dos dois. É o "calculate shipping" da PDP e o cupom da
  sacola.
- **A estrela de avaliação ficou viva.** Era `gold-700`, um oliva escuro. Agora
  o miolo é o `gold-500` da marca com contorno `gold-700`. O miolo sozinho mede
  2.39:1 sobre branco e não passa no 3:1 que a WCAG 1.4.11 pede de gráfico que
  carrega informação — quem cumpre o requisito é a silhueta. O `#FFBB00` que a
  loja usa hoje mede 1.70:1, mais baixo ainda, e é valor solto de Tailwind.
  O auditor do DOM aprendeu a medir o contorno, e só quando as duas condições
  valem juntas: glifo `aria-hidden` **e** com traço. Tirar qualquer uma devolve
  o limite de texto.
- **A barra de frete grátis passou a consumir `yb-progress`.** Ela vivia como
  `.yb-freeship__track`, cópia própria; com a segunda ocorrência a regra do 2
  mandou o padrão consumir o componente. A pista era 6px e agora é 8, a medida
  da escala.
- **A faixa de vídeos sangra até a borda da tela.** A seção saiu de dentro do
  `.yb-page` — não existe jeito honesto de escapar do contêiner por dentro,
  porque `50% - 50vw` erra pela largura da barra de rolagem e a página passa a
  rolar de lado. O título continua alinhado ao resto da home e a pista começa
  no gutter em vez de encostar no bezel.
- **A lupa do header abre a busca**, na home, na PDP e na doc de padrões.

### Corrigido
- **`outline:0` passava pela checagem de foco morto**, que só procurava
  `outline:none`. Matam igual. Agora os dois contam, e suprimir só é aceito com
  o selo `anel:` na linha, dizendo quem desenha o anel no lugar — a alternativa
  era confiar que quem escreveu lembrou de pôr o anel em algum lugar, que foi
  exatamente o que deixou o primeiro caso passar.
- **A PDP apontava para uma imagem apagada.** `alt` vazio, imagem decorativa:
  quebrava em silêncio.

## [0.10.0] — 2026-09-01

Auditoria do sistema contra uma estrutura de design system completa. O que
faltava não era componente: era o **registro das decisões** e a **régua que
impede o sistema de mentir sobre si mesmo**.

### Adicionado
- **`decision-log/`** — nove DDR. O sistema sempre teve razão escrita, mas ela
  vivia espalhada por README, GOVERNANCA, CHANGELOG e comentário de CSS. Agora
  cada decisão tem endereço, evidência e o que se perdeu ao tomá-la. Discordar
  de uma decisão exige poder citá-la.
- **`PRINCIPIOS.md`** — cinco princípios **em ordem de precedência**. A ordem é
  a parte que decide: princípio que não conflita com nada nunca decidiu nada.
- **`INVENTARIO.md`**, gerado por `tools/inventario.mjs` — as 33 peças com
  variantes, estados, tokens consumidos e **maturidade conferida a cada build**.
  Alfa (no bundle, fora da doc), Beta (na doc, sem tela real), Estável. Escrita
  à mão, essa matriz seria o artefato que mais apodrece num design system;
  derivada do CSS, ela não tem como mentir.
- **`CONTRIBUINDO.md`** — a mecânica que a governança descrevia sem
  operacionalizar: laço local, as três perguntas antes de propor, o que o CI
  reprova.
- **`--yb-surface-on-media`** e **`--yb-elevation-text-media`**, para os dois
  valores que o carrossel de vídeo escrevia à mão.
- **Oito peças ganharam demonstração na doc** — collection card, review, selos
  de certificação, barra de logos, post, citação de marca, carrossel de vídeo
  vertical e o layout de página. Todas as oito já embarcavam no bundle e não
  apareciam em lugar nenhum: iam para produção sem que ninguém soubesse que
  existiam. A doc de componentes passou de 18 para 25 seções, e a de padrões de
  7 para 8.

### Corrigido
- **Duas cores cruas embarcavam em produção.** O botão de play escrevia
  `rgba(255,255,255,.92)` e a legenda do vídeo `rgba(0,0,0,.6)` — esta última
  contradizendo a regra da própria seção de elevação, que diz sombra em grafite
  e nunca preto puro. A checagem de "hex hardcoded" só procurava `#hex`: a
  notação nunca foi o assunto, e agora ela pega `rgb()`, `hsl()`, `oklch()`,
  `color-mix()` e cor nomeada.
- **`--yb-action-text-disabled` era uma armadilha.** Ele entrega `gray-500`, que
  sobre `--yb-action-bg-disabled` mede **2.86:1**. O próprio `.yb-btn[disabled]`
  o recusou e usa `--yb-text-muted` (4.28:1), com a razão escrita no CSS —
  enquanto o token continuava oferecido a quem chegasse depois. Agora aponta
  para o valor legível.
- **`--yb-icon-size:30px` nos selos** e `24px` no play: dois tamanhos fora da
  escala de ícone, que existe justamente para isso. 30 virou 32, metade exata
  do disco de 64.
- **`opacity:.85` na barra de logos** era número mágico. Virou
  `--yb-logobar-opacity` na camada 2, com o motivo ao lado.
- **A versão divergia em três lugares** — `package.json` dizia 0.10.0, o README
  dizia 0.7 e o topo deste arquivo dizia 0.9.0. O README também contava 17
  componentes, 7 padrões e 44 checagens; os números reais são 25, 8 e 79.

### Alterado
- **Treze tokens semânticos `@deprecated`**, nenhum com mudança de valor:
  os onze aliases de espaço (`--yb-space-inline/stack/block-*`, zero
  consumidores em dez versões — ver
  [DDR-004](decision-log/DDR-004-espaco-sem-camada-semantica.md)),
  `--yb-accent` (duplicata de `--yb-accent-on-dark`), `--yb-elevation-flat`
  ("sem sombra" é a ausência da propriedade), `--yb-transition-overlay` (o
  `<dialog>` não anima) e `--yb-opacity-media-overlay`. Saem em 1.0.
- **Oito tokens marcados `@reservado`** — sem consumidor por natureza, não por
  esquecimento: os quatro `track` que valem zero e existem porque quem consome
  o contrato por programa itera as quatro propriedades do papel, e as rampas
  claro-sobre-escuro que só servem em par.
- **O aviso de "token sem consumidor" passou de 23 para 0.** Ele agora lê
  `@deprecated` e `@reservado` e só reclama do que não declarou razão. Aviso que
  ninguém consegue zerar é aviso que ninguém lê. Uma checagem nova reprova
  `@deprecated` que não nomeie o substituto.

### Verificado
- 79 checagens verdes. `dist/` e `INVENTARIO.md` derivados e conferidos no CI.

## [0.9.0] — 2026-09-01

### Alterado
- **Nomenclatura toda em inglês.** 76 identificadores renomeados: elementos e
  modificadores de `yb-review`, `yb-post`, `yb-quote` e `yb-collection`, o gancho
  `data-tocando` → `data-playing`, e o vocabulário de layout
  (`pagina` → `page`, `bloco` → `block`, `cabeca-secao` → `section-head`,
  `banner__seta` → `banner__arrow`).
- **Layout de página subiu para o sistema.** `yb-page`, `yb-block` e
  `yb-section-head` viviam na folha do gerador e eram usados por home e PDP —
  dois usos, pela regra da governança viram padrão. Enquanto ficassem na página,
  cada tela nova iria redefini-los.

### Adicionado
- **`yb-card__vendor`** e rating opcional no card: a home mostra nota, os
  relacionados da PDP mostram a marca. Mesma anatomia, conteúdo por contexto.
- **`yb-collection`** (2 usos na home), **`yb-review`**, **`yb-seals`**,
  **`yb-logobar`**, **`yb-post`**, **`yb-quote`**, **`yb-video`** e **`yb-logo`**.
- **Related Products na PDP** — existe em produção como `product-recommendations`,
  carregada por JS.
- Cinco ícones de certificação e o `play`: sprite de 26 → 32.

### Corrigido
- **`box-sizing` não era garantido pelo sistema.** Todo componente foi dimensionado
  para `border-box`; sem o reset, o botão virava 78px em vez de 50 (44 de
  `min-height` + 32 de padding + 2 de borda). As galerias escondiam o defeito porque
  traziam reset próprio; a home nova, sem reset, expôs. Agora o CSS de componentes
  garante.
- **Logo invisível no footer**: o padrão escuro agora inverte o logo sozinho, sem
  depender de quem usa lembrar da variante.
- **Cache servia CSS velho** apesar de `no-store`. Assets ganharam carimbo de versão
  derivado do hash do conteúdo.
- Estilo inline que o componente deveria dar: a imagem da miniatura em
  `yb-gallery__thumbs` e o respiro do breadcrumb.
- **14 regras de CSS morto** removidas do gerador — resto de seções apagadas. A folha
  da página caiu de 4,4 KB para 1,6 KB.

### Verificado
- Home e PDP: **0** regras `.yb-*` redefinidas, **0** cores cruas, **0** estilos
  inline exceto `width:76%` (valor de dado do progresso de frete).
- 26 componentes em uso na home, 22 na PDP.

## [0.8.0] — 2026-09-01

### Adicionado
- **Componente `yb-logo`** com o arquivo oficial do header (360×139, monocromático
  preto, transparente). Três tamanhos e variante `--inverse` para fundo escuro,
  que funciona por `invert(1)` justamente porque o logo é monocromático.
- **Home e PDP montadas com os componentes** em `_captura/nova-loja/` — 20
  componentes e padrões, conteúdo e imagens reais da loja, zero CSS de componente
  novo.

### Corrigido
- O logo em produção tem `alt="Fashion Gold"` — nome de linha, não da marca.
  Um leitor de tela anuncia a loja errada no primeiro elemento da página. O
  componente usa `Ybera`.
- `yb-header__logo` e `yb-footer__logo` eram texto em versal com tracking;
  agora delegam ao componente e cuidam só do alvo de clique.

### Nota
- **Carrossel de banner não virou componente.** O banner da home é imagem com
  carrossel e continua assim; o CSS dele vive na página, não no sistema. Pela
  regra da governança, só sobe para `components/` quando aparecer duas vezes.

## [0.7.0] — 2026-09-01

### Adicionado
- **`test/validate.mjs`** — 44 checagens automáticas, sem dependência: integridade
  entre camadas, disciplina de cor, hex hardcoded, monotonia das rampas, contraste
  anotado versus medido, as três regras duras, foco visível e `dist/` em dia.
- **`test/a11y.js`** — auditoria no DOM renderizado: contraste computado, alvo de
  toque, rótulo acessível e ordem de heading.
- **CI** (`.github/workflows/design-system.yml`) e `npm run check`.

### Corrigido
Achados pelos próprios auditores, na primeira vez que rodaram:

- `docs/`: a cor do texto dos swatches era escolhida por limiar de luminância, não
  por contraste medido. Dois chips ficavam em 3.44:1 e 3.45:1. O chip virou amostra
  de cor pura — o degrau se lê no token ao lado.
- `docs/`: `gray-400` usado como texto **informativo** a 2.14:1. Não é componente
  inativo, não tinha isenção nenhuma, e violava a regra do piso que este mesmo
  sistema define.
- `.yb-check`: 22px de altura clicável, abaixo do mínimo 24×24 da WCAG 2.5.8.
- `.yb-stepper input`: 22px de altura; agora 44px.
- Texto de controle desabilitado a 2.86:1. Isento pela WCAG 1.4.3, mas "Sold out"
  ilegível continua ilegível — o fundo já comunica o estado.
- Link "voltar" de três páginas com 22px de alvo.
- `proofs/`: dica do laboratório a 4.34:1 sobre grafite.
- Hierarquia de heading: três `<h1>` em `patterns/`, e saltos `h2 → h4` em quatro
  páginas. O CSS é por classe, então a correção não mudou um pixel.

### Alterado
- Duas correções no **próprio validador**, achadas ao usá-lo:
  o regex de uso não enxergava `var(--x, fallback)` — ficava cego para toda
  referência com valor padrão; e o de declaração exigia início de linha, ignorando
  tokens inline como `.yb-icon--sm{--yb-icon-size:16px}`.
- `test/a11y.js` passou a reconhecer input visualmente oculto cujo `<label>` é o
  alvo real, e a isentar componente inativo do contraste conforme WCAG 1.4.3.

### Verificado
- 8 páginas: **0 falhas de acessibilidade, contraste 100%** em todas.
- 46 avisos remanescentes, todos conhecidos: alvos entre 24 e 44px (passam AA,
  falham AAA) e texto de componente inativo.

## [0.6.0] — 2026-08-31

### Adicionado
- **Cinco componentes** que faltavam para o funil funcionar: `dialog` (modal e
  gaveta), `toast`, galeria de produto, paginação e skeleton. Total: **17**.
- **`ybera-components.js`** — 7 KB de JavaScript vanilla, sem dependência.
  Progressive enhancement: se o script não carregar, formulários enviam e links
  navegam. A galeria continua trocando de imagem, porque os radios fazem isso
  em CSS.
- API pública `window.Ybera`: `toast()`, `openDialog()`, `init()`.

### Alterado
- **`--yb-font-size-4xl`, `5xl` e `6xl` agora são fluidos** (`clamp`). Em 320px
  o `5xl` fixo em 48px media 309px de largura numa caixa de 288 — a palavra não
  cabia. Abaixo de `4xl` a escala segue fixa: texto de leitura não deve mudar de
  tamanho com a janela.

### Corrigido
- `docs/`: a barra da escala de espaçamento usava `width` fixo e empurrava o
  layout em 320px, onde a coluna disponível é menor que `--yb-space-24`.

### Verificado
- 8 páginas × 4 larguras (320, 375, 768, 1440): **zero overflow horizontal**.
  Foi o primeiro teste em 320px, e ele encontrou os dois defeitos acima.
- Modal devolve o foco ao gatilho ao fechar; toast pausa no hover e no foco de
  teclado; erro usa `role="alert"` e não expira; stepper trava nas duas pontas.

## [0.5.0] — 2026-08-31

### Adicionado
- **Ícones**: sprite SVG com 26 símbolos (4,4 KB), grade 24×24, traço 1.5,
  sempre em `currentColor`. Substitui os 380 KB de Font Awesome Pro que a loja
  baixa hoje sem renderizar um único ícone.
- **Voz e conteúdo**: cinco regras de escrita, formato de nome de produto e
  checklist de publicação, com antes/depois usando nomes reais do catálogo.
- **Governança**: versionamento, ciclo de depreciação e critério para token novo.

### Corrigido
- Galeria de ícones: `<b>` dentro de parágrafo herdava `display:block` e quebrava
  a frase no meio; nome de ícone quebrava em duas linhas por `word-break:break-all`.

## [0.4.0] — 2026-08-31

### Adicionado
- **Adoção**: `bridge.css` ligando os tokens às variáveis que o tema, o Ecomposer
  e o Judge.me já publicam — sem tocar em template Liquid.
- `audit.js`: auditor que mede a adoção contra a loja renderizada.
- `PLANO.md`: migração em seis fases, ordenadas por risco.
- `build.sh` e `dist/`: bundles prontos para asset do Shopify.
- Linha de base medida: **48% de adoção** na home da ybera.us.

### Corrigido
- Servidor local em porta fixa (8080) com `Cache-Control: no-store`. A troca de
  porta a cada rodada tinha produzido um falso negativo em validação.

## [0.3.0] — 2026-08-31

### Adicionado
- **7 padrões**: header, progresso de frete grátis, gaveta de carrinho, coleção,
  bloco de compra, estados vazios e footer.

### Decidido
- **Cor de ação: magenta `#CA235F`.** Grafite segue como identidade e como ação
  secundária. Fecha a pendência aberta em 0.1.

## [0.2.0] — 2026-08-31

### Adicionado
- **12 componentes** com prefixo `yb-`: botão, badge, rating, preço, card,
  seletor de variante, quantidade, campo, checkbox/radio, alerta, acordeão,
  breadcrumb.
- `--yb-card-title-lines`: primeiro token de camada 2, nascido de defeito
  observado nas telas-prova (títulos reais ocupando de 2 a 5 linhas).

### Corrigido
- Faltava token para texto sobre superfície escura; adicionados
  `--yb-text-secondary-inverse` e `--yb-text-muted-inverse`.
- Família tipográfica e elevação não tinham token semântico — componentes
  precisariam furar a camada 0 para usá-los.

### Alterado
- **Fronteira da regra de camadas revisada.** A regra original dizia "componente
  nunca consome a camada 0". As telas-prova mostraram 75 usos diretos de espaço e
  peso. Corrigimos a regra, não o código: cor é regra dura; espaço, peso e
  tracking podem vir do primitivo.

## [0.1.0] — 2026-08-31

### Adicionado
- Fundação: 250 tokens em três camadas mais camada de mercado.
- Três rampas de 11 degraus, geradas por script e validadas em WCAG 2.1.
- 11 papéis tipográficos em Schibsted Grotesk, família única.
- Telas-prova (home e PDP) como instrumento de validação.

### Decidido
- **Primária `#1E1E1F`** — grafite carrega a identidade.
- **Piso de texto `gray-600`**: o `gray-500` mede 3.44:1 e reprova em AA.
- **Dourado nunca é texto sobre claro**: `gold-500` mede 2.39:1 sobre branco e
  6.96:1 sobre grafite.
- Independente de plataforma: a loja US roda Shopify e a BR roda Wake.

### Corrigido
- Rampa de dourado estava ancorada no degrau errado, produzindo `gold-400` mais
  escuro que `gold-500`. Adicionada checagem automática de monotonia.
