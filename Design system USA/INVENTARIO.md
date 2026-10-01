# Inventário de componentes

<!-- GERADO por tools/inventario.mjs. Não edite à mão: rode ./build.sh.
     A fonte é o CSS. Se uma linha aqui está errada, o errado é o código. -->

59 peças no bundle — 45 estáveis, 14 em beta, 0 em alfa.

## Como ler a maturidade

Não é opinião de ninguém. Cada degrau é uma afirmação que a máquina confere a
cada build:

| Degrau | O que foi verificado |
|---|---|
| **Estável** | Aparece na doc · sobreviveu a conteúdo real nas telas-prova · se for interativo, declara `:focus-visible` na própria seção |
| **Beta** | Aparece na doc, mas ainda não passou por tela real — ou é interativo e não declara foco |
| **Alfa** | Está no bundle e **não** está na doc. Vai para produção sem que ninguém saiba que existe |

Alfa não é um estágio: é um defeito. Componente que ninguém encontra é
componente que a próxima pessoa reescreve — e aí o sistema tem dois.

## Matriz

| Componente | Classe base | Camada | Maturidade | Variantes | Estados | Tokens | Doc | Foco | Comportamento | Tela real |
|---|---|---|---|---|---|---|---|---|---|---|
| AVATAR | `.yb-avatar` | Átomo | Estável | 6 | — | 13 | sim | n/a | — | sim |
| BADGE | `.yb-badge` | Átomo | Estável | 10 | — | 25 | sim | n/a | sim | sim |
| BUTTON | `.yb-btn` | Átomo | Estável | 9 | 4 | 44 | sim | sim | sim | sim |
| CERTIFICATION SEALS | `.yb-seal` | Átomo | Estável | — | — | 15 | sim | n/a | sim | sim |
| CHECKBOX / RADIO | `.yb-check` | Átomo | Beta | — | 4 | 22 | sim | sim | — | — |
| CHIP | `.yb-chip` | Átomo | Estável | — | 3 | 25 | sim | sim | — | sim |
| DIVIDER | `.yb-divider` | Átomo | Beta | 3 | — | 6 | sim | n/a | — | — |
| ICONBTN | `.yb-iconbtn` | Átomo | Estável | 5 | 4 | 19 | sim | sim | sim | sim |
| INPUT, SELECT, TEXTAREA | `.yb-field` | Átomo | Estável | 1 | 4 | 36 | sim | sim | — | sim |
| LINK | `.yb-link` | Átomo | Estável | 1 | 2 | 10 | sim | sim | — | sim |
| LOGO | `.yb-logo` | Átomo | Estável | 4 | 1 | 5 | sim | sim | — | sim |
| NOTICE | `.yb-notice` | Átomo | Estável | 2 | 2 | 20 | sim | sim | — | sim |
| OFFER SEAL | `.yb-offerseal` | Átomo | Estável | 2 | — | 10 | sim | n/a | — | sim |
| PANEL | `.yb-panel` | Átomo | Beta | 1 | — | 13 | sim | n/a | — | — |
| PROGRESS BAR | `.yb-progress` | Átomo | Estável | 3 | — | 10 | sim | n/a | — | sim |
| SKELETON | `.yb-skeleton` | Átomo | Beta | 6 | — | 9 | sim | n/a | — | — |
| STARS | `.yb-stars` | Átomo | Estável | — | — | 5 | sim | n/a | — | sim |
| SWITCH | `.yb-switch` | Átomo | Estável | — | 3 | 13 | sim | sim | sim | sim |
| ACCOUNT MENU | `.yb-account` | Molécula | Estável | — | 3 | 23 | sim | sim | — | sim |
| ACORDEÃO | `.yb-accordion` | Molécula | Estável | — | 2 | 19 | sim | sim | — | sim |
| ALERT | `.yb-alert` | Molécula | Beta | 4 | 3 | 28 | sim | sim | sim | — |
| BANNER HERO | `.yb-bannerhero` | Molécula | Estável | 6 | 2 | 45 | sim | sim | — | sim |
| BANNER MEDIA | `.yb-bannermedia` | Molécula | Estável | 3 | — | 3 | sim | n/a | — | sim |
| BREADCRUMB | `.yb-crumb` | Molécula | Estável | — | 3 | 8 | sim | sim | — | sim |
| CARD OFFER | `.yb-offercard` | Molécula | Estável | 1 | 2 | 40 | sim | sim | sim | sim |
| CARD PRODUCT | `.yb-card` | Molécula | Estável | 1 | 2 | 30 | sim | sim | — | sim |
| COLLECTION CARD | `.yb-collection` | Molécula | Estável | 5 | 2 | 35 | sim | sim | — | sim |
| DROPDOWN | `.yb-dropdown` | Molécula | Beta | 1 | 4 | 21 | sim | sim | — | — |
| EMPTY STATE | `.yb-empty` | Molécula | Estável | 1 | — | 13 | sim | n/a | — | sim |
| PAGINATION | `.yb-pagination` | Molécula | Beta | — | 3 | 17 | sim | sim | sim | — |
| PARTNER | `.yb-partner` | Molécula | Estável | 1 | 2 | 31 | sim | sim | sim | sim |
| POST | `.yb-post` | Molécula | Estável | 3 | 2 | 23 | sim | sim | — | sim |
| PRICE | `.yb-price` | Molécula | Estável | 2 | — | 10 | sim | n/a | sim | sim |
| QUANTITY STEPPER | `.yb-stepper` | Molécula | Estável | 1 | 3 | 17 | sim | sim | sim | sim |
| RATING | `.yb-rating` | Molécula | Estável | — | — | 7 | sim | n/a | — | sim |
| REVIEW | `.yb-reviews` | Molécula | Estável | — | 1 | 28 | sim | sim | sim | sim |
| TABS | `.yb-tabs` | Molécula | Beta | — | 3 | 17 | sim | sim | sim | — |
| TOAST | `.yb-toast` | Molécula | Beta | 3 | 1 | 30 | sim | — | sim | — |
| TRACK | `.yb-track` | Molécula | Beta | 2 | 1 | 8 | sim | — | sim | sim |
| VARIANT PICKER | `.yb-swatches` | Molécula | Estável | 2 | 4 | 37 | sim | sim | sim | sim |
| VERTICAL VIDEO CAROUSEL | `.yb-video` | Molécula | Beta | — | 1 | 12 | sim | — | sim | sim |
| BLOCO DE COMPRA (PDP) | `.yb-buybox` | Organismo | Estável | — | 2 | 39 | sim | sim | — | sim |
| BRAND QUOTE | `.yb-quote` | Organismo | Estável | — | — | 16 | sim | n/a | — | sim |
| CART DRAWER | `.yb-cart` | Organismo | Beta | 3 | 1 | 45 | sim | — | — | sim |
| CATÁLOGO | `.yb-catalog` | Organismo | Beta | — | — | 13 | sim | n/a | — | — |
| DRAWER | `.yb-drawer` | Organismo | Estável | — | — | 0 | sim | n/a | — | sim |
| FAQ | `.yb-faq` | Organismo | Estável | 1 | — | 14 | sim | n/a | — | sim |
| FOOTER | `.yb-footer` | Organismo | Estável | 1 | 3 | 32 | sim | sim | — | sim |
| FREE SHIPPING PROGRESS | `.yb-freeship` | Organismo | Estável | 1 | — | 8 | sim | n/a | — | sim |
| HEADER / NAV | `.yb-nav` | Organismo | Estável | 2 | 3 | 62 | sim | sim | sim | sim |
| HERO | `.yb-hero` | Organismo | Estável | — | — | 4 | sim | n/a | — | sim |
| LOGO BAR | `.yb-logobar` | Organismo | Estável | — | — | 5 | sim | n/a | — | sim |
| MANIFESTO | `.yb-manifesto` | Organismo | Estável | — | — | 26 | sim | n/a | — | sim |
| MODAL | `.yb-dialog` | Organismo | Beta | — | 1 | 22 | sim | — | sim | sim |
| PRODUCT GALLERY | `.yb-gallery` | Organismo | Estável | — | 3 | 22 | sim | sim | sim | sim |
| SEARCH OVERLAY | `.yb-search` | Organismo | Estável | — | 2 | 41 | sim | sim | sim | sim |
| SPLIT | `.yb-split` | Organismo | Estável | — | — | 17 | sim | n/a | — | sim |
| PAGE LAYOUT | `.yb-block` | Template | Estável | 2 | — | 20 | sim | n/a | — | sim |
| PRODUCT LAYOUT | `.yb-product` | Template | Estável | — | — | 5 | sim | n/a | — | sim |

## O que cada coluna prova

- **Variantes** — modificadores `--` que a seção declara. Zero não é defeito:
  `yb-price` não precisa de variante.
- **Estados** — `:hover`, `:focus-visible`, `:active`, `:checked`, `[disabled]`,
  `[aria-*]` tratados na seção. Um controle interativo com zero estados é um
  controle que não responde ao que o dedo e o teclado fazem com ele.
- **Tokens** — quantos tokens distintos a seção consome. Um número baixo demais
  num componente grande costuma significar valor cru escrito à mão; a checagem
  de cor crua em `test/validate.mjs` pega a parte que é cor.
- **Foco** — `n/a` quando a seção não tem nada focável. Para o resto, foco
  visível é piso do sistema, não enfeite.
- **Comportamento** — o JS conhece esta família. `—` quer dizer que ela é CSS
  puro, e isso é o estado preferido: `<details>` e `<dialog>` entregam teclado
  e leitor de tela sem uma linha nossa.
- **Tela real** — apareceu em `_captura/nova-loja/`, montado com conteúdo e
  imagem de verdade. É a diferença entre um componente que funciona e um
  componente que funciona com o texto que o autor escolheu.
