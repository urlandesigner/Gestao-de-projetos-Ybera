# Plano de adoção

Como a ybera.us passa a usar este sistema sem que nenhuma noite de deploy
dependa de sorte.

O plano tem uma regra que vale mais que a ordem das fases: **toda fase é
reversível por remoção**. Se algo der errado, a correção é tirar uma linha,
nunca reescrever um template às pressas.

## Onde estamos

Linha de base medida na home da ybera.us em 2026-08-31: **48% de adoção**.
Para remedir, cole `test/adocao.js` no console de qualquer página. Ele
devolve adoção, deriva por eixo e — o campo que importa para este plano —
`ondeMigrar`, a lista de quem mais toma decisão visual por fora do sistema.

O que a loja pratica hoje, e que o sistema resolve:

| Eixo | Loja hoje | Sistema |
|---|---|---|
| Magenta | 3 valores (`#CA235F`, `#DB2855`, `#DD2955`) | 1 |
| Tamanho de fonte | 20 valores, incluindo 11.2px e 14.4px | 11 degraus |
| Raio | 12 valores | 5 |
| Ícones | Font Awesome Pro, 380 KB, nenhum renderizado | sprite de 7,2 KB |
| Cinza | mistura de Tailwind zinc + gray + avulsos | 1 rampa de 11 |

## As seis fases, ordenadas por risco

O risco cresce de cima para baixo. Nenhuma fase começa antes que a anterior
tenha ficado uma semana no ar sem incidente.

### 1 · Ponte · risco quase nulo

Sobe `dist/ybera-tokens.css` e `dist/ybera-bridge.css` como asset e adiciona
duas linhas ao `theme.liquid`:

```liquid
{{ 'ybera-tokens.css' | asset_url | stylesheet_tag }}
{{ 'ybera-bridge.css' | asset_url | stylesheet_tag }}
```

Nenhum template Liquid muda. A ponte reescreve as variáveis que o tema, o
Ecomposer e o Judge.me **já leem** — inclusive as quatro do Ecomposer que hoje
estão em `#ffffff` e por isso não fazem nada.

O que muda visualmente: os três magentas viram um; o preço em promoção sai de
2.81:1 para 5.40:1; a estrela do Judge.me sai de `#FFDB00` para o dourado de
texto; o texto de review sai de 4.40:1 para o piso do sistema.

**Reverter:** apagar a linha do bridge. Nada mais.

### 2 · Ícones · risco baixo

Substitui Font Awesome Pro pelo sprite. A loja baixa 380 KB de fonte de ícone
e não renderiza um único glifo — é peso puro.

Sobe `icons/ybera-icons.svg` como asset e troca os `<i class="fa-...">` por
`<svg class="yb-icon"><use href="...#yb-nome"></use></svg>`.

**Reverter:** o `<link>` do Font Awesome volta. Faça a troca por template, não
de uma vez.

### 3 · Superfície nova · risco baixo

Toda seção **nova** — landing de campanha, bloco de coleção, página de
conteúdo — é construída só com `yb-`. Nenhum template existente é tocado.

Esta é a fase que produz confiança sem produzir exposição: o sistema aparece
em produção, é medido, e nada que já funcionava foi mexido. As telas-prova em
`_captura/nova-loja/` são o ensaio dela — home e PDP inteiras montadas com os
componentes, zero CSS de componente novo.

### 4 · PDP · risco médio

O funil começa aqui porque é onde o sistema tem mais componente pronto:
galeria, bloco de compra, seletor de variante, quantidade, acordeão, preço,
rating, selos, review, produtos relacionados.

Ordem dentro da fase: bloco de compra → galeria → acordeão → relacionados.
O bloco de compra primeiro porque é o que converte, e porque é o que tem
métrica óbvia se algo piorar.

**Reverter:** cada peça é um `{% section %}` próprio. Volta uma sem tocar nas
outras.

### 5 · Home · risco médio

Header, navegação, coleções, posts, citação de marca, carrossel de vídeo,
footer. O banner **não** entra: ele é imagem com carrossel, o CSS dele vive na
página, e pela regra da governança só sobe para o sistema quando aparecer duas
vezes.

O header é a peça mais delicada da fase — é o único componente que aparece em
toda página, então um defeito nele é um defeito em toda a loja. Suba-o num
horário de tráfego baixo e meça.

### 6 · Carrinho, e retirada da ponte · risco alto

Gaveta de carrinho, progresso de frete grátis, estados vazios.

Quando nada mais depender das variáveis antigas, a ponte sai. Antes de tirar,
rode `test/adocao.js` nas cinco páginas de maior tráfego: se `ondeMigrar`
ainda listar classe de tema, a ponte fica.

**Retirar a ponte é uma mudança maior** pela governança — vai no changelog com
justificativa.

## Camada de compatibilidade

Enquanto as fases correm, tema e sistema convivem na mesma página. Três coisas
seguram isso:

1. **Prefixo `yb-` em tudo.** Sem ele, `.btn` e `.card` colidem em silêncio com
   o tema, o Ecomposer, o Tailwind e o Judge.me.
2. **A ponte traduz, não substitui.** Ela escreve nas variáveis do tema; o tema
   continua sendo quem desenha, só que com os valores certos.
3. **Ordem de carga fixa:** tokens → bridge → componentes → padrões. Trocar a
   ordem faz a ponte perder para o valor antigo.

## Prazos de depreciação

| O que sai | Substituto | Remoção |
|---|---|---|
| Font Awesome Pro | `icons/ybera-icons.svg` | fim da fase 2 |
| Os três magentas do tema | `--yb-action-bg` | fim da fase 1 |
| Escala tipográfica default do Ecomposer | escala Ybera via ponte | fim da fase 1 |
| `bridge/ybera-bridge.css` | nada — o sistema passa a desenhar direto | fase 6 |

## Como saber se está funcionando

| Indicador | Como medir | Meta |
|---|---|---|
| Adoção | `test/adocao.js` na home e na PDP | >80% ao fim da fase 5 |
| Deriva de fonte | `deriva.tamanhosDeFonte` | ≤11 |
| Deriva de raio | `deriva.raios` | ≤5 |
| Cores fora da paleta | `foraDaPaleta` | 0 |
| Falhas de acessibilidade | `test/a11y.js` | 0 |
| Peso de ícone | rede, aba de fontes | −380 KB |

Meça **antes** de cada fase e uma semana depois. O número que não foi medido
antes não prova nada depois.

## O que este plano não cobre

- **Loja BR (Wake).** A arquitetura suporta via `[data-market="br"]`, mas
  nenhum token de mercado foi produzido — e hoje não há diferença visual entre
  os dois mercados, o que é o resultado certo da decisão de marca.
- **Checkout do Shopify.** Não é template editável no plano atual da loja.
- **E-mail transacional.** CSS custom property não sobrevive a cliente de
  e-mail; ali os valores entram literais, copiados de `dist/ybera-tokens.json`.
