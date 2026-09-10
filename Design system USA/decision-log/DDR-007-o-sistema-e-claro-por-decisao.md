# DDR-007 · O sistema é claro por decisão

- **Estado:** aceita
- **Desde:** 0.1 · 2026-08-31
- **Substitui:** —
- **Toca:** `tokens/01-semantic.css`, `tokens/00-primitives.css`, `test/validate.mjs`

## Decisão

`color-scheme: light`, declarado no `:root` da camada 1.

O sistema é claro. As três rampas foram medidas contra branco e nenhuma paleta
escura foi produzida. A linha diz isso ao navegador em vez de deixá-lo
adivinhar.

## Intenção

Sem essa linha, um aparelho em modo escuro escurece por conta própria o que o
navegador controla: `<input>`, `<select>`, `<textarea>`, a barra de rolagem e o
`::backdrop` do `<dialog>`. O resultado não é uma página escura — é uma página
clara com buracos escuros dentro: um campo de formulário grafite dentro de um
card branco, com texto claro que ninguém mediu.

É o pior dos dois mundos. Nenhum dos números anotados em `00-primitives.css`
vale ali, porque todos foram medidos contra branco, e o defeito aparece
exatamente onde o cliente digita — endereço, cupom, e-mail.

Declarar `light` é assumir a decisão em vez de sofrer o padrão do sistema
operacional.

## Quando se aplica

Sempre, em qualquer página que carregue `dist/ybera-tokens.css`. É a única
propriedade real que a camada 1 declara — todo o resto do arquivo é
mapeamento — e ela precisa estar ali, no `:root`, para alcançar os controles
nativos.

## Quando não se aplica

Não há exceção hoje, porque não há paleta escura medida.

Um tema escuro futuro não conflita com essa decisão: ele a substitui, e o
caminho está escrito no arquivo. `color-scheme` passa a `light dark`, e um
bloco `@media (prefers-color-scheme: dark)` redefine os semânticos. A camada 1
absorve a troca inteira — os componentes não mudam uma linha, que é para isso
que ela existe.

O que esse tema custaria não é o bloco de CSS: é medir a rampa escura degrau a
degrau. Pela governança, nenhum valor de cor entra sem cálculo de contraste
rodado antes, e as contas de hoje — 5.15:1, 5.36:1, 5.68:1 — são todas contra
branco. Nenhuma delas se aproveita.

## Evidência

- As anotações das três rampas em `00-primitives.css` dizem "vs branco" em
  todos os 33 degraus. Não há uma medida contra fundo escuro no arquivo, com
  uma exceção declarada: `gold-500` a **6.96:1** sobre grafite, que é o que
  autoriza `--yb-accent-on-dark`.
- O comentário do bloco de esquema de cor em `01-semantic.css` lista os cinco
  elementos que o navegador escurece sozinho e descreve o defeito resultante em
  vez de descrevê-lo como risco.
- `test/validate.mjs` tem uma checagem só para isso: se a declaração sumir do
  arquivo semântico, a build reprova com *"em modo escuro o navegador escurece
  os controles nativos sozinho"*. A regra não depende de alguém lembrar.
- As seções escuras que o sistema tem — `--yb-bg-inverse`, footer, barra de
  logos, faixa de anúncio — são superfícies escuras dentro de uma página clara,
  com tokens próprios (`--yb-text-inverse`, `--yb-text-secondary-inverse`,
  `--yb-border-inverse`). Elas não são um tema: são parte do tema claro.

## Consequência

Quem usa o aparelho em modo escuro recebe a página clara. É custo assumido, não
esquecimento: o registro existe para que a próxima pessoa que abrir o arquivo
saiba que a linha foi escrita de propósito e não a apague por parecer supérflua.

O sistema também fica com metade do trabalho de um tema escuro já feito — a
camada semântica é o ponto único de troca — e a outra metade, a medição, ainda
inteira.
