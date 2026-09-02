# Decision log

Um DDR registra uma decisão que **já foi tomada** e já está no código: o que
vale, por que vale, onde não vale, e qual número ou defeito observado a
sustenta. Ele não propõe nada — a razão está espalhada pelo repositório, em
comentário de CSS e em entrada de changelog, e aqui ela ganha um endereço que
se pode citar em revisão.

Escreva um DDR quando a mesma pergunta reaparecer. É a regra da governança
aplicada à documentação: token novo só entra quando o caso aparece **duas
vezes**, e decisão só vira registro quando ela precisou ser explicada duas
vezes. Uma vez é conversa; duas é regra que alguém vai reabrir daqui a seis
meses sem o contexto.

| DDR | Decisão | Estado | Desde |
|---|---|---|---|
| [001](DDR-001-primaria-e-grafite.md) | A primária é o grafite `#1E1E1F`; o magenta é cor de função | aceita | 0.1 |
| [002](DDR-002-uma-familia-tipografica.md) | Uma família tipográfica: hierarquia por escala, peso e tracking | aceita | 0.1 |
| [003](DDR-003-css-custom-properties-como-formato-canonico.md) | CSS custom property é o formato canônico; o JSON DTCG é derivado | aceita | 0.1 |
| [004](DDR-004-espaco-sem-camada-semantica.md) | Espaço não ganha camada semântica | aceita | 0.10 |
| [005](DDR-005-cor-tem-regra-dura-de-camada.md) | Cor tem regra dura de camada; a ponte é a única exceção | aceita | 0.2 |
| [006](DDR-006-piso-de-texto-e-gray-600.md) | Piso de texto é `gray-600`; dourado não é texto sobre claro; opacidade não toca texto | aceita | 0.1 |
| [007](DDR-007-o-sistema-e-claro-por-decisao.md) | O sistema é claro por decisão: `color-scheme: light` | aceita | 0.1 |
| [008](DDR-008-comportamento-liga-por-atributo-de-dado.md) | Comportamento liga por `data-yb-*`, é opcional e prefere o elemento nativo | aceita | 0.6 |
| [009](DDR-009-prefixo-yb-em-tudo.md) | Prefixo `yb-` em tudo, nomenclatura em inglês | aceita | 0.2 |

Formato de cada registro: cabeçalho com estado, versão de origem, o que
substitui e os arquivos que toca; depois **Decisão**, **Intenção**, **Quando se
aplica**, **Quando não se aplica**, **Evidência** e **Consequência**. Todo
número citado é medido e está no repositório — nenhum é estimativa.

Governança e versionamento: [../GOVERNANCA.md](../GOVERNANCA.md) · histórico em
[../CHANGELOG.md](../CHANGELOG.md).
