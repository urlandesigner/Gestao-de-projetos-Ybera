# Inventário de componentes

<!-- GERADO por tools/inventario.mjs. Não edite à mão: rode ./build.sh.
     A fonte é o CSS. Se uma linha aqui está errada, o errado é o código. -->

36 peças no bundle — 27 estáveis, 9 em beta, 0 em alfa.

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
| ACORDEÃO | `.yb-accordion` | Componente | Estável | — | 1 | 15 | sim | sim | — | sim |
| ALERT | `.yb-alert` | Componente | Beta | 4 | — | 21 | sim | n/a | — | — |
| BADGE | `.yb-badge` | Componente | Estável | 6 | — | 18 | sim | n/a | — | sim |
| BRAND QUOTE | `.yb-quote` | Componente | Estável | — | — | 14 | sim | n/a | — | sim |
| BREADCRUMB | `.yb-crumb` | Componente | Estável | — | 3 | 8 | sim | sim | — | sim |
| BUTTON | `.yb-btn` | Componente | Estável | 4 | 4 | 26 | sim | sim | — | sim |
| CARREGANDO | `.yb-btn` | Componente | Estável | 8 | — | 16 | sim | n/a | — | sim |
| CERTIFICATION SEALS | `.yb-seal` | Componente | Estável | — | — | 12 | sim | n/a | — | sim |
| CHECKBOX / RADIO | `.yb-check` | Componente | Beta | — | 1 | 10 | sim | sim | — | — |
| COLLECTION CARD | `.yb-collection` | Componente | Estável | 2 | 2 | 18 | sim | sim | — | sim |
| DIALOG / MODAL | `.yb-dialog` | Componente | Estável | 1 | 2 | 25 | sim | sim | sim | sim |
| FORM FIELD | `.yb-field` | Componente | Beta | — | 4 | 26 | sim | sim | — | — |
| ICONBTN | `.yb-iconbtn` | Componente | Estável | 1 | 3 | 13 | sim | sim | — | sim |
| LOGO | `.yb-logo` | Componente | Estável | 4 | 1 | 5 | sim | sim | — | sim |
| LOGO BAR | `.yb-logobar` | Componente | Estável | — | — | 5 | sim | n/a | — | sim |
| PAGINATION | `.yb-pagination` | Componente | Beta | — | 3 | 17 | sim | sim | — | — |
| POST | `.yb-post` | Componente | Estável | 1 | 2 | 23 | sim | sim | — | sim |
| PRICE | `.yb-price` | Componente | Estável | 1 | — | 9 | sim | n/a | — | sim |
| PRODUCT CARD | `.yb-card` | Componente | Estável | — | 2 | 16 | sim | sim | — | sim |
| PRODUCT GALLERY | `.yb-gallery` | Componente | Estável | — | 3 | 19 | sim | sim | sim | sim |
| QUANTITY STEPPER | `.yb-stepper` | Componente | Estável | — | 3 | 12 | sim | sim | sim | sim |
| RATING | `.yb-rating` | Componente | Estável | — | — | 5 | sim | n/a | — | sim |
| REVIEW | `.yb-review` | Componente | Estável | — | 1 | 18 | sim | sim | — | sim |
| SKELETON | `.yb-skeleton` | Componente | Beta | 6 | — | 7 | sim | n/a | — | — |
| TOAST | `.yb-toast` | Componente | Beta | 3 | 2 | 30 | sim | sim | sim | — |
| TRACK | `.yb-track` | Componente | Estável | 1 | — | 4 | sim | n/a | — | sim |
| VARIANT PICKER | `.yb-swatches` | Componente | Beta | — | 4 | 18 | sim | sim | — | — |
| VERTICAL VIDEO CAROUSEL | `.yb-video` | Componente | Beta | — | 1 | 12 | sim | — | sim | sim |
| BLOCO DE COMPRA (PDP) | `.yb-buybox` | Padrão | Estável | — | — | 21 | sim | n/a | — | sim |
| CABEÇALHO DE COLEÇÃO + GRID | `.yb-collection` | Padrão | Estável | — | 2 | 27 | sim | sim | — | sim |
| CART DRAWER | `.yb-cart` | Padrão | Estável | 1 | 2 | 27 | sim | sim | — | sim |
| EMPTY STATE | `.yb-empty` | Padrão | Beta | — | — | 13 | sim | n/a | — | — |
| FOOTER | `.yb-footer` | Padrão | Estável | — | 3 | 30 | sim | sim | — | sim |
| FREE SHIPPING PROGRESS | `.yb-freeship` | Padrão | Estável | 1 | — | 12 | sim | n/a | — | sim |
| HEADER | `.yb-nav` | Padrão | Estável | — | 3 | 44 | sim | sim | sim | sim |
| PAGE LAYOUT | `.yb-block` | Padrão | Estável | 2 | 2 | 20 | sim | sim | — | sim |

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
