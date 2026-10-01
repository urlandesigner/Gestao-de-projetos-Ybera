# DDR-013 · O painel nasce de fora, e isso tem régua

- **Estado:** aceita
- **Desde:** 0.13 · 2026-10-01
- **Substitui:** —
- **Toca:** `atoms/ybera-atoms.css`, `atoms/pecas/panel.html`, `atoms/fichas.json`, `tokens/pecas/usage.html`

## Decisão

O sistema ganha o átomo `.yb-panel` e uma regra de chão na Fundação, para um
caso que **a loja não tem**.

A loja não vai usar nenhum dos dois. Eles existem porque a pergunta "onde um
painel se apoia" é de fundação, não de produto, e o sistema já respondia metade
dela sem dizer.

## Intenção

Aqui `--yb-bg-page`, `--yb-surface` e `--yb-surface-raised` são os três brancos.
Nada separa um cartão da página por cor: quem separa é a **foto**. O `.yb-card`
no desktop não tem fundo, borda nem sombra — é uma coluna embaixo de uma imagem.

Quando o sistema foi aplicado num produto feito de painéis de **texto**, os
painéis sumiram: branco sobre branco, sem borda e sem sombra. Quem aplicou
chegou sozinho ao mesmo lugar e copiou à mão o tratamento que o `.yb-card` já
tem abaixo de 768px, quando a coluna vira cartão.

Isso é o sintoma de um buraco, não um acidente de quem copiou. O sistema tinha
todas as peças soltas — `--yb-bg-subtle`, `--yb-surface`, `--yb-border-subtle`,
`--yb-radius-card`, `--yb-elevation-card` — e nunca disse qual combinação faz um
painel nem quando o chão deixa de ser branco. Sem isso, cada consumidor inventa
a própria resposta, que é exatamente o que um design system existe para evitar.

## Quando se aplica

Tela feita de áreas de texto, onde nada mais mostra onde uma começa e a outra
acaba. Chão branco: `.yb-panel`, com fio e elevação. Chão `--yb-bg-subtle`:
`.yb-panel--flat`, porque sobre cinza a sombra vira borrão e duas lado a lado
leem como sujeira.

## Quando não se aplica

Produto. O `.yb-card` tem anatomia e ordem — mídia, título, preço, ação — e o
painel é só a caixa. Trocar um pelo outro perde a ordem que o cartão garante.

E não se aplica à loja: nenhuma das 11 telas de prova usa o painel, e isso está
certo. Se um dia usar, é porque a loja ganhou uma tela que não é de vitrine.

## A régua, que é o ponto desta DDR

Peça que nasce de fora da loja entra **uma vez** e com três condições:

1. A pergunta é de fundação, não de produto. "Onde um painel se apoia" é; "como
   mostrar um PDI" não é.
2. O sistema já responde metade dela em algum canto escondido. Aqui respondia,
   dentro de um `@media` do cartão de produto.
3. Nenhum primitivo novo. O painel não trouxe um token sequer — só nomeou uma
   combinação que já existia.

Peça que falhe em qualquer uma das três fica no projeto que a pediu. O custo de
aceitar é real: o sistema cresce vocabulário que a loja não consome, e cada peça
assim é mais uma coisa a manter, medir e documentar sem ninguém de casa usando.
Três condições é o preço de admitir esse custo com os olhos abertos.

## Evidência

- `--yb-bg-page`, `--yb-surface` e `--yb-surface-raised` resolvem todos para
  `--yb-white` em `tokens/01-semantic.css`.
- `.yb-card` só ganha `border`, `border-radius` e `box-shadow` dentro do
  `@media (max-width:767.98px)` em `molecules/ybera-molecules.css`. No desktop
  não tem nenhum dos três.
- Medido no produto que aplicou o sistema: sete painéis com fundo `#FFFFFF`,
  `border-top-width: 0px` e `box-shadow: none`, sobre página `#FFFFFF`.

## Consequência

O sistema passa a ter uma peça que a loja não usa, e a régua acima para a
próxima. A Fundação ganha a regra do chão, que é o que faltava de verdade — a
peça sozinha não resolveria, porque o erro estava na escolha do fundo tanto
quanto na falta da caixa.
