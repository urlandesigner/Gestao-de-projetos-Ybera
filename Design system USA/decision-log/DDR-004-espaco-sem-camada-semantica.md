# DDR-004 · Espaço não ganha camada semântica

- **Estado:** aceita
- **Desde:** 0.10 · 2026-09-01
- **Substitui:** —
- **Toca:** `tokens/01-semantic.css`

## Decisão

Espaço, peso e tracking são consumidos **direto da camada 0**. Cor, não.

Os onze aliases `--yb-space-inline-*`, `--yb-space-stack-*` e `--yb-space-block-*`
estão `@deprecated` desde 0.10 e saem em 1.0.

## Intenção

Uma camada semântica existe para **absorver mudança de identidade**. Trocar a
marca é trocar o que `--yb-action-bg` aponta, numa linha, sem caçar hex.

Espaço não carrega identidade. `--yb-space-4` é 16px numa escala de 4px, e vai
continuar sendo 16px se a marca mudar de dono. Um alias que só repete o valor
com outro nome não absorve nada — ele só obriga quem lê o CSS a abrir um
segundo arquivo para descobrir que `stack-md` era `space-4` o tempo todo.

## Quando se aplica

Sempre que o valor for espaço, peso de fonte ou tracking. Escreva o primitivo.

## Quando não se aplica

Duas exceções, e as duas estão declaradas no arquivo:

- **`--yb-page-gutter` e `--yb-grid-gap`.** O valor muda com a largura da janela
  (`@media (min-width: 768px)`). Aqui o nome carrega informação que o número não
  tem: *qual* dos dois valores é este.
- **Cor, sempre.** Regra dura, sem exceção fora da ponte. Ver DDR-005.

## Evidência

- As telas-prova de 0.8 (`_captura/nova-loja/`) usaram o primitivo direto **75
  vezes** e o alias semântico **zero**. O cabeçalho de `01-semantic.css` já
  registrava isso desde então, e concluía: *"um alias semântico por caso só cria
  indireção sem informação"*.
- Dez versões depois, a auditoria de 0.10 confirmou **zero consumidores** dos
  onze aliases em todo o repositório — componente, padrão, doc e telas-prova.
- A regra da governança para token novo é "o caso tem de aparecer duas vezes".
  Aplicada para trás, estes onze nunca teriam entrado.

## Consequência

Quem já usa um dos onze continua funcionando: o valor não mudou, só o status.
A remoção é 1.0 e vai listada no changelog.

O autocompletar de quem chega encolhe em onze entradas que não levavam a lugar
nenhum — que é o ganho real, e o único.
