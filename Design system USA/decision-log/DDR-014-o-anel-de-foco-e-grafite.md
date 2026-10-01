# DDR-014 · O anel de foco é grafite, não magenta

- **Estado:** aceita
- **Desde:** 0.13 · 2026-10-01
- **Substitui:** —
- **Toca:** `tokens/01-semantic.css`, `atoms/ybera-atoms.css`, `base/ybera-base.css`, `tokens/pecas/color.html`

## Decisão

`--yb-focus-color` passa de `--yb-magenta-600` para `--yb-gray-950`. Nasce com
ele `--yb-focus-offset-on-solid: 2px`, para os controles que já são grafite
cheio.

## Intenção

A [DDR-001](DDR-001-primaria-e-grafite.md) diz que a primária da marca é o
grafite e que o magenta é **sinal** — a cor que marca link, preço em promoção,
selo. Sinal é promessa de função: onde ele aparece, alguma coisa acontece se
você clicar.

O anel de foco era o único lugar do sistema em que o magenta aparecia sem
função nenhuma atrás. Um campo em foco não é um botão; ele não vai fazer nada
quando receber o cursor. O anel estava dizendo "aqui tem ação" onde só tem
"aqui está o cursor".

E havia o efeito prático, que foi como o problema chegou: desde a 0.13 o anel
nasce colado no controle (`--yb-focus-offset: 0`, ver a nota do token). Colado,
ele não lê como anel — lê como "a borda do campo ficou magenta". Quem usou o
sistema num produto perguntou exatamente isso: por que a borda do input fica
magenta quando eu clico.

A resposta honesta era que não fica: a borda vira grafite e o anel magenta
encosta nela. Mas uma explicação que precisa desse tamanho é um desenho que
errou, não um leitor que não entendeu.

## Como fica

Em tudo que tem fundo claro, borda e anel passam a ser a **mesma** cor, e os
dois leem como um traço só. O estado do campo deixa de ser uma mudança de cor e
passa a ser uma mudança de **espessura**:

| Estado   | O que se vê                        |
|----------|------------------------------------|
| repouso  | 1px `--yb-border`                  |
| hover    | 1px `--yb-border-strong`           |
| foco     | 3px grafite                        |
| erro     | 2px `--yb-danger-solid` + ícone    |

A WCAG 1.4.11 aceita espessura como indicador, e o grafite mede 16.66:1 sobre a
página branca — bem acima dos 3:1 que ela pede para fronteira de componente. O
erro continua sendo o único estado que muda de **cor**, que é o que o
[DDR-005](DDR-005-cor-tem-regra-dura-de-camada.md) pede: cor só onde ela
significa.

## O que isso custou

Um anel da cor do controle some dentro de um controle da mesma cor. São cinco,
e todos já eram grafite cheio antes desta decisão: `.yb-btn--primary`, o
checkbox e o rádio marcados, o chip ligado e o `.yb-skip-link`.

Para esses o anel ganha afastamento de 2px, e quem o desenha passa a ser o vão
branco da página: controle, vão, anel. A distinção não é mais de cor e sim de
vão — e é por isso que o token se chama `--yb-focus-offset-on-solid` e não
`--yb-focus-color-on-solid`. Trocar a cor ali traria de volta o sinal que esta
decisão tirou.

Eles moram **num bloco só** (`FOCO SOBRE CONTROLE GRAFITE`, em `atoms/`), e não
espalhados por componente. Espalhado, este seria o quarto lugar a responder "por
que o foco deste é diferente", e o primeiro a ficar para trás quando nascer o
sexto controle grafite.

## O que não mudou

Sobre fundo escuro o anel continua branco (`--yb-text-inverse`), como já era:
`.yb-btn--on-dark`, `.yb-iconbtn--on-dark`, `.yb-field__box--on-dark`,
`.yb-swatches--on-dark`. Lá o problema sempre foi o inverso — qualquer cor
escura some — e a resposta já estava escrita.

O magenta segue sendo a cor de sinal do sistema: link, preço, selo, destaque.
Ele só deixou de ser a cor do cursor.
