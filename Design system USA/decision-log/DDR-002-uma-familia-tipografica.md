# DDR-002 · Uma família tipográfica

- **Estado:** aceita
- **Desde:** 0.1 · 2026-08-31
- **Substitui:** —
- **Toca:** `tokens/00-primitives.css`, `tokens/01-semantic.css`, `bridge/ybera-bridge.css`

## Decisão

Schibsted Grotesk, família única. `--yb-font-sans` é a única família de texto
do sistema, e `--yb-font-family-base` é a única porta pela qual um componente a
alcança.

A hierarquia vem de **escala, peso e tracking**. Nunca de troca de fonte.

Onze degraus de tamanho, do `2xs` ao `6xl`, e um papel tipográfico para cada
nível — cada um declarando `size`, `line`, `track` e `weight`. Quanto maior o
tamanho, mais negativo o tracking. Os três degraus maiores — `4xl`, `5xl` e
`6xl` — são fluidos.

## Intenção

Uma segunda família é a saída fácil para um problema de hierarquia que não foi
resolvido: quando dois títulos não se distinguem, trocar a fonte de um deles
disfarça o defeito em vez de corrigi-lo. Com uma família só, a distinção tem de
sair de onde ela realmente mora — tamanho, peso, entrelinha e tracking — e cada
papel fica obrigado a declarar as quatro propriedades.

O tracking é o vetor de distinção número 1 do sistema, e ele é regulado pelo
tamanho: `-0.035em` no display, `-0.025em` no h1 e h2, `-0.015em` no h3 e h4,
zero no corpo e `0.12em` no overline em caixa alta. Texto grande com tracking
solto parece frouxo; texto pequeno com tracking apertado deixa de ser legível.
A escala de tracking existe para que essa correção não seja feita a olho, uma
vez por título.

Os três maiores são fluidos por medição, não por gosto: em 320px o `5xl` fixo
em 48px media **309px de largura numa caixa de 288** — a palavra não cabia.
Abaixo de `4xl` a escala segue fixa, e isso também é decisão: texto de leitura
não deve mudar de tamanho com a janela.

## Quando se aplica

Todo texto. Título, corpo, rótulo, preço, legenda, botão — todos saem dos
papéis de `01-semantic.css`, que já trazem `size`, `line`, `track` e `weight`
resolvidos.

## Quando não se aplica

- **`--yb-font-mono`.** Existe para código e para o que precisa de largura de
  caractere constante. Não é uma segunda família de texto: nenhum conteúdo de
  loja sai nela.
- **Preço.** Continua na mesma família, mas com `font-variant-numeric:
  tabular-nums` — em grid, dígito precisa alinhar em coluna. É variação de
  numeral, não troca de fonte.

## Evidência

- A loja pratica **20 tamanhos** de fonte, incluindo `11.2px` e `14.4px` —
  valores que ninguém escolhe, que aparecem de arredondamento e herança. O
  sistema tem **11 degraus**, e a meta do plano de adoção é
  `deriva.tamanhosDeFonte ≤ 11`.
- O Ecomposer publica uma escala default herdada, não decidida:
  72/60/48/36/30/24/18. A ponte a reescreve degrau por degrau para a escala
  Ybera, e a tabela de depreciação do plano marca a saída dela para o fim da
  fase 1.
- O defeito que produziu o `clamp` foi medido em 0.6: 309px de palavra numa
  caixa de 288, na primeira rodada de teste em 320px — a mesma rodada que
  encontrou o overflow da barra de espaçamento em `docs/`.
- 0.1 entregou os **11 papéis tipográficos** já em família única.

## Consequência

Não há decisão de fonte a tomar por tela. Quem monta uma página nova escolhe um
papel, não uma família, e o par tamanho/tracking vem junto.

O custo é que a diferenciação depende inteiramente da escala estar bem
espaçada. Um degrau novo no meio da escala não é ajuste cosmético: ele encosta
em dois papéis vizinhos, e por isso entra pela regra de token novo da
governança, com o caso aparecendo duas vezes.
