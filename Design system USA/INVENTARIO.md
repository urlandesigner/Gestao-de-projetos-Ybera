# Inventário de componentes

<!-- GERADO por tools/inventario.mjs. Não edite à mão: rode ./build.sh.
     A fonte é o CSS. Se uma linha aqui está errada, o errado é o código. -->

54 peças no bundle — 28 estáveis, 26 em beta, 0 em alfa.

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
| AVATAR | `.yb-avatar` | Átomo | Beta | 6 | — | 13 | sim | n/a | — | — |
| BADGE | `.yb-badge` | Átomo | Beta | 9 | — | 22 | sim | — | sim | sim |
| BUTTON | `.yb-btn` | Átomo | Estável | 9 | 4 | 45 | sim | sim | sim | sim |
| CERTIFICATION SEALS | `.yb-seal` | Átomo | Beta | — | — | 13 | sim | n/a | — | — |
| CHECKBOX / RADIO | `.yb-check` | Átomo | Beta | — | 4 | 22 | sim | sim | — | — |
| CHIP | `.yb-chip` | Átomo | Estável | — | 3 | 25 | sim | sim | — | sim |
| ICONBTN | `.yb-iconbtn` | Átomo | Estável | 4 | 3 | 16 | sim | sim | — | sim |
| INPUT, SELECT, TEXTAREA | `.yb-field` | Átomo | Estável | 1 | 4 | 32 | sim | sim | — | sim |
| LINK | `.yb-link` | Átomo | Beta | 1 | 2 | 10 | sim | sim | — | — |
| LOGO | `.yb-logo` | Átomo | Estável | 4 | 1 | 5 | sim | sim | — | sim |
| NOTICE | `.yb-notice` | Átomo | Beta | 2 | — | 15 | sim | — | — | sim |
| OFFER SEAL | `.yb-offerseal` | Átomo | Beta | 2 | — | 10 | sim | n/a | — | — |
| PROGRESS BAR | `.yb-progress` | Átomo | Estável | 3 | — | 11 | sim | n/a | — | sim |
| SKELETON | `.yb-skeleton` | Átomo | Beta | 6 | — | 9 | sim | n/a | — | — |
| STARS | `.yb-stars` | Átomo | Estável | — | — | 5 | sim | n/a | — | sim |
| SWITCH | `.yb-switch` | Átomo | Estável | — | 3 | 13 | sim | sim | sim | sim |
| ACORDEÃO | `.yb-accordion` | Molécula | Estável | — | 2 | 19 | sim | sim | — | sim |
| ALERT | `.yb-alert` | Molécula | Beta | 4 | 2 | 29 | sim | sim | sim | — |
| BANNER HERO | `.yb-bannerhero` | Molécula | Beta | 4 | 2 | 46 | sim | sim | — | — |
| BANNER MEDIA | `.yb-bannermedia` | Molécula | Estável | 3 | — | 9 | sim | n/a | — | sim |
| BREADCRUMB | `.yb-crumb` | Molécula | Beta | — | 3 | 8 | sim | sim | — | — |
| CARD OFFER | `.yb-offercard` | Molécula | Beta | 1 | 2 | 40 | sim | sim | sim | — |
| CARD PRODUCT | `.yb-card` | Molécula | Estável | 1 | 2 | 28 | sim | sim | — | sim |
| COLLECTION CARD | `.yb-collection` | Molécula | Estável | 6 | 2 | 41 | sim | sim | — | sim |
| DROPDOWN | `.yb-dropdown` | Molécula | Beta | — | 3 | 22 | sim | sim | — | — |
| EMPTY STATE | `.yb-empty` | Molécula | Estável | 1 | — | 13 | sim | n/a | — | sim |
| PAGINATION | `.yb-pagination` | Molécula | Beta | — | 3 | 18 | sim | sim | sim | — |
| PARTNER | `.yb-partner` | Molécula | Beta | 1 | 2 | 31 | sim | sim | sim | — |
| POST | `.yb-post` | Molécula | Beta | 3 | 2 | 23 | sim | sim | — | — |
| PRICE | `.yb-price` | Molécula | Estável | 2 | — | 10 | sim | n/a | — | sim |
| QUANTITY STEPPER | `.yb-stepper` | Molécula | Estável | 1 | 3 | 17 | sim | sim | sim | sim |
| RATING | `.yb-rating` | Molécula | Estável | — | — | 7 | sim | n/a | — | sim |
| REVIEW | `.yb-reviews` | Molécula | Estável | — | 1 | 28 | sim | sim | sim | sim |
| TOAST | `.yb-toast` | Molécula | Beta | 3 | 2 | 34 | sim | sim | sim | — |
| TRACK | `.yb-track` | Molécula | Beta | 2 | 1 | 8 | sim | — | sim | sim |
| VARIANT PICKER | `.yb-swatches` | Molécula | Estável | 2 | 4 | 37 | sim | sim | sim | sim |
| VERTICAL VIDEO CAROUSEL | `.yb-video` | Molécula | Beta | — | 1 | 13 | sim | — | sim | — |
| BLOCO DE COMPRA (PDP) | `.yb-buybox` | Organismo | Estável | — | 2 | 38 | sim | sim | — | sim |
| BRAND QUOTE | `.yb-quote` | Organismo | Beta | — | — | 16 | sim | n/a | — | — |
| CART DRAWER | `.yb-cart` | Organismo | Estável | 3 | 2 | 50 | sim | sim | — | sim |
| CATÁLOGO | `.yb-catalog` | Organismo | Beta | — | — | 14 | sim | n/a | — | — |
| DRAWER | `.yb-drawer` | Organismo | Estável | — | — | 0 | sim | n/a | — | sim |
| FAQ | `.yb-faq` | Organismo | Beta | 1 | — | 14 | sim | n/a | — | — |
| FOOTER | `.yb-footer` | Organismo | Estável | 1 | 3 | 39 | sim | sim | — | sim |
| FREE SHIPPING PROGRESS | `.yb-freeship` | Organismo | Estável | 1 | — | 8 | sim | n/a | — | sim |
| HEADER | `.yb-nav` | Organismo | Estável | 1 | 3 | 62 | sim | sim | sim | sim |
| HERO | `.yb-hero` | Organismo | Beta | — | — | 4 | sim | n/a | — | — |
| LOGO BAR | `.yb-logobar` | Organismo | Beta | — | — | 5 | sim | n/a | — | — |
| MANIFESTO | `.yb-manifesto` | Organismo | Beta | — | — | 26 | sim | n/a | — | — |
| MODAL | `.yb-dialog` | Organismo | Estável | — | 2 | 27 | sim | sim | sim | sim |
| PRODUCT GALLERY | `.yb-gallery` | Organismo | Estável | — | 3 | 22 | sim | sim | sim | sim |
| SEARCH OVERLAY | `.yb-search` | Organismo | Estável | — | 2 | 41 | sim | sim | sim | sim |
| SPLIT | `.yb-split` | Organismo | Beta | — | — | 17 | sim | n/a | — | — |
| PAGE LAYOUT | `.yb-block` | Template | Estável | 2 | — | 20 | sim | n/a | — | sim |

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
