# DDR-012 · Ícones são um sprite SVG, não uma fonte

- **Estado:** aceita
- **Desde:** 0.5 · 2026-08-31 (registrada em 0.13 · 2026-09-30)
- **Substitui:** —
- **Toca:** `icons/ybera-icons.svg`, `icons/ybera-icons.css`, `build.sh`, `dist/ybera-design-system.zip`

## Decisão

Os ícones do sistema vivem num **sprite SVG único** (`ybera-icons.svg`), um
`<symbol>` por ícone com o prefixo `yb-`, lido por `<use>`:

```html
<svg class="yb-icon" aria-hidden="true"><use href="ybera-icons.svg#yb-cart"/></svg>
```

Grade 24×24, traço 1.5, sempre em `currentColor`. Nenhum ícone tem token de
cor próprio: herda a cor do texto em volta.

## Intenção

Fonte de ícone carrega o alfabeto inteiro para desenhar meia dúzia de glifos, e
o custo aparece antes de qualquer ícone aparecer. O sprite pesa o que o sistema
usa, e nada mais.

`currentColor` tira o ícone da conta de contraste: ele tem a cor do texto ao
lado, então nunca reprova sozinho, e nenhuma peça precisa de um token de cor
só para o ícone.

## Evidência

Medido na home da ybera.us em 2026-08-31:

| | Peso | Observação |
|---|---|---|
| **Font Awesome Pro** que a loja carrega | **380 KB** | `fa-regular-400.woff2` (334 KB) mais o CSS (33 KB). **Zero** elementos usam — é licença paga baixada para não renderizar nada. |
| **Sprite do sistema** | **10,0 KB** | 42 ícones em 0.13, 1,9% do peso da fonte. |

A loja já resolvia ícones com **130 SVGs inline**: SVG já era o padrão de
fato, e o que faltava era um arquivo só, com nome e grade.

## Quando se aplica

Todo ícone de interface: navegação, loja, estado, selo de certificação.

## Quando não se aplica

- **Logo e arte de marca.** Não são ícone: têm cor própria e não seguem a grade.
- **Página aberta como arquivo (`file://`).** O Chrome bloqueia `<use>` para SVG
  externo fora de um servidor; o protótipo precisa ser servido por HTTP.

## Consequências

- Ícone novo é um `<symbol>` a mais no sprite, e não uma dependência nova.
- Ícone que existe no sprite sem aparecer em peça nenhuma fica marcado
  **reservado** na galeria: é vocabulário das telas que ainda não foram
  montadas, e não ícone morto.
