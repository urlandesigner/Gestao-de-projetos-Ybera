# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento descrito em [GOVERNANCA.md](GOVERNANCA.md).

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
