# DDR-005 · Cor tem regra dura de camada

- **Estado:** aceita
- **Desde:** 0.2 · 2026-08-31
- **Substitui:** —
- **Toca:** `tokens/01-semantic.css`, `components/ybera-components.css`, `patterns/ybera-patterns.css`, `icons/ybera-icons.css`, `bridge/ybera-bridge.css`, `test/validate.mjs`

## Decisão

Componente **nunca** consome cor da camada 0. Nem `var(--yb-gray-700)`, nem
`var(--yb-magenta-600)`, nem `var(--yb-white)`, nem um `rgba()` escrito à mão.
Cor vem sempre de um token semântico.

Espaço, peso e tracking podem vir do primitivo direto.

A regra vale para `components/`, `patterns/` e `icons/`. A única exceção é
`bridge/ybera-bridge.css`.

## Intenção

A assimetria não é inconsistência: os dois valores carregam coisas diferentes.

Cor carrega identidade. Trocar a marca é trocar o que `--yb-action-bg` aponta,
numa linha — e isso só funciona se ninguém tiver escrito o hex ou o primitivo
lá embaixo. Um `var(--yb-magenta-600)` dentro de um componente é uma decisão de
cor tomada no lugar errado: a camada 1 não consegue mais trocá-la.

Espaço não carrega identidade. `--yb-space-4` é 16px numa escala de 4px e vai
continuar sendo 16px se a marca mudar de dono. Por isso ele pode ser escrito
direto — e por isso os aliases semânticos de espaço estão depreciados. Ver
DDR-004.

Dito de outro modo: a camada 1 existe para absorver mudança de identidade. Onde
não há identidade para absorver, ela é só uma segunda tabela para consultar.

## Quando se aplica

Toda cor em toda folha do sistema. Se você escreveu um primitivo de cor num
componente, uma de duas coisas é verdade: ou falta um token semântico, ou o
componente está errado. A correção é sempre na camada 1 — nunca é abrir a
exceção no componente.

## Quando não se aplica

**`bridge/ybera-bridge.css`, e só ele.** A ponte não é componente: é tradutor
entre dois vocabulários. O alvo de cada linha dela é uma variável de **fora**
do sistema — `--ecom-global-colors-primary`, `--jdgm-star-color`,
`--background-button`, `--text-color` — publicada pelo tema, pelo Ecomposer ou
pelo Judge.me.

A exceção é legítima porque a razão da regra não se aplica ali. A camada 1
existe para que trocar a identidade seja trocar uma linha; a ponte já é essa
linha. Ela não desenha nada: escreve o valor certo na variável que o tema já
lê, e o tema continua sendo quem desenha. Para reverter, remova a linha do
bridge — nada mais muda.

## Evidência

- A regra original dizia "componente nunca consome a camada 0", sem recorte. As
  telas-prova mostraram **75 usos diretos** de espaço e peso. 0.2 corrigiu a
  regra, não o código: *"cor é regra dura; espaço, peso e tracking podem vir do
  primitivo"*. A fronteira está documentada no cabeçalho de `01-semantic.css` e
  é a primeira das três regras inegociáveis da governança.
- `test/validate.mjs` roda a checagem sobre `componentes`, `padroes` e
  `icones`, e trata a ponte como **exceção declarada**, reportando quantos
  primitivos ela consome em vez de reprová-los. Hoje são **quatro**:
  `--yb-gray-950`, `--yb-gray-700`, `--yb-magenta-600` e `--yb-magenta-50` — os
  mesmos quatro que o cabeçalho da ponte avisa que um auditor vai acusar.
- A checagem de cor crua não olha só `#hex`. Ela passava por cima de
  `rgba(255,255,255,.92)` no botão de play e `rgba(0,0,0,.6)` na legenda do
  vídeo — duas cores decididas dentro do componente, uma delas preto puro, que
  a própria seção de elevação dos primitivos proíbe. As duas viraram token:
  `--yb-surface-on-media` e `--yb-shadow-text`.
- Em 0.2 o mesmo mecanismo já tinha produzido `--yb-text-secondary-inverse` e
  `--yb-text-muted-inverse`: a seção escura precisava de texto secundário, não
  havia token, *"e o CSS caía na camada 0 para resolver"*.

## Consequência

A regra é o que faz o sistema crescer por token novo em vez de por exceção
local. Todo furo vira uma linha em `01-semantic.css`, com nome e razão — que é
como `--yb-surface-on-media` e `--yb-shadow-text` existem.

O custo é que a camada 1 acumula tokens com poucos consumidores, e alguns com
nenhum. Os `@reservado` do arquivo são isso, declarados: um degrau sem
consumidor hoje é mais barato que a próxima seção escura reabrindo o mesmo
buraco.
