# DDR-006 · Piso de texto é gray-600

- **Estado:** aceita
- **Desde:** 0.1 · 2026-08-31
- **Substitui:** —
- **Toca:** `tokens/00-primitives.css`, `tokens/01-semantic.css`, `bridge/ybera-bridge.css`, `test/validate.mjs`, `test/a11y.js`

## Decisão

Nenhum texto abaixo de `gray-600`. Ele mede **5.15:1** sobre branco e é o piso:
`--yb-text-muted` é o degrau mais claro que uma palavra pode ter.

`gray-500` mede **3.44:1** e reprova em AA. Ele existe para ícone e borda,
nunca para palavra.

Duas regras andam junto com essa:

- **Dourado nunca é texto sobre claro.** `gold-500` mede **2.39:1** sobre
  branco — é a cor de marca e só vive sobre superfície escura, onde mede
  **6.96:1** sobre grafite. Para texto sobre claro existe `--yb-accent-text`
  (gold-700, **5.68:1**).
- **Opacidade nunca se aplica a texto.** Nenhum dos degraus de
  `--yb-opacity-*` toca uma palavra.

## Intenção

O piso existe porque o cinza claro é sedutor e o defeito é invisível: um texto
a 3.44:1 parece "discreto" na tela de quem desenhou, e some na tela de quem
compra. Ter um degrau declarado como piso transforma a decisão em consulta —
não se escolhe o cinza, escolhe-se o papel.

A regra da opacidade é a mesma regra, por outro caminho. Opacidade sobre
palavra derruba o contraste **sem que nada no CSS registre a queda**: um texto
que passava em 5.15:1 a 60% cai para 2.9:1, o hex continua o mesmo, e nenhuma
medição do sistema vê. Para texto apagado existe `--yb-text-muted`, que é
medido.

A regra do dourado protege a cor da marca de ser usada como se fosse cor de
texto. `--yb-accent-on-dark` e `--yb-accent-text` são dois tokens porque são
dois trabalhos, e o nome de cada um já diz onde ele pode aparecer.

## Quando se aplica

Todo texto, em qualquer superfície, incluindo rótulo, legenda, timestamp,
placeholder e microcópia. Inclui o que a ponte reescreve no tema e no Judge.me.

Toda opacidade: `--yb-opacity-disabled`, `--yb-opacity-muted` e
`--yb-opacity-scrim` valem para superfície, ícone e véu — nunca para palavra.

## Quando não se aplica

- **Componente inativo.** A WCAG 1.4.3 isenta texto de controle desabilitado, e
  `--yb-text-disabled` (gray-400, 2.14:1) existe só para esse estado. Mesmo
  assim, "Sold out" ilegível continua ilegível: o `.yb-btn[disabled]` recusou
  `--yb-action-text-disabled` e usa `--yb-text-muted` (4.28:1 sobre o fundo
  desabilitado), porque o fundo já comunica o estado.
- **Ícone e borda.** É para isso que `gray-500` existe. Ícone informativo em
  dourado sobre claro, não — cai na mesma regra do texto.
- **`--yb-logobar-opacity` (.85).** É opacidade, e é permitida, porque o alvo é
  `<img>`: as marcas sobem invertidas para branco puro sobre o grafite e ficam
  mais quentes que o texto ao lado. Não há texto envolvido.

## Evidência

- Os números estão anotados degrau a degrau em `00-primitives.css`, e são
  **medidos**: `gray-400` 2.14:1, `gray-500` 3.44:1, `gray-600` 5.15:1,
  `gray-700` 7.67:1, `gray-950` 16.66:1. O validador confere se o número
  escrito no comentário bate com o real.
- Na primeira vez que os auditores rodaram, em 0.7, o defeito estava na própria
  documentação do sistema: `docs/` escolhia a cor do texto dos swatches por
  limiar de luminância em vez de contraste medido, e dois chips ficavam em
  3.44:1 e 3.45:1 — e `gray-400` aparecia como texto **informativo** a 2.14:1,
  sem isenção nenhuma, *"violando a regra do piso que este mesmo sistema
  define"*.
- Na loja em produção, medido antes da ponte: preço em promoção a **2.81:1** —
  um preço que não se lê; o verde do sistema mede 5.40:1. Texto de review em
  zinc-500 a **4.40:1** sobre superfície cinza (sobre branco puro passava
  raspando, 4.83). A estrela do Judge.me em `#FFDB00`, que mede pior que o
  gold-500, virou `--yb-accent-text`.
- O `--yb-action-text-disabled` foi depreciado em 0.10 por essa regra: era uma
  armadilha. `gray-500` sobre `--yb-action-bg-disabled` (gray-200) mede
  **2.86:1**, e o próprio componente já o recusava. Um token que o sistema não
  usa porque é ilegível não pode continuar oferecido.
- `test/validate.mjs` reprova opacidade declarada junto de texto em
  `components/` e `patterns/`, e avisa se `gray-500` algum dia passar em AA —
  aí a regra do piso perde a razão de ser e precisa ser reescrita, não
  ignorada.

## Consequência

O sistema perde dois degraus de cinza para texto e o dourado de marca como cor
de palavra sobre claro. Rodapé, microcópia e timestamp ficam mais escuros do
que a loja praticava — foi o que a ponte fez com o texto de review, que saiu de
4.40:1 para o piso.

Em troca, "apagar" um texto passa a ter uma forma legítima só:
`--yb-text-muted`, que é medido. Não há como deixar algo mais discreto sem que
a medição acompanhe — e é por isso que o validador reprova opacidade sobre
palavra em vez de confiar em quem escreve.
