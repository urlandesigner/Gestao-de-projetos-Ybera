# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento descrito em [GOVERNANCA.md](GOVERNANCA.md).

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
