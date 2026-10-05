# Transbordo de sprint

Pedido do Urlan em 05/10/2026. **Implementado no mesmo dia**, depois de medir
contra o DevOps real. Este documento guarda o que foi medido — os números são a
parte que não se recupera lendo o código.

## Problema

O DevOps guarda só a iteração **atual** de cada item. Quem não fecha e é
repriorizado some do backlog da sprint antiga sem deixar rastro lá — então a
coluna "Anterior" do Panorama e o board de uma sprint passada mostravam a sprint
**como ela está**, não como foi.

Caso que originou tudo (Sprint 19 do Squad Ecommerce): o PO via **2 PBIs** no
nome dele. A sprint teve **5**. Os três que faltavam — 46261, 49931 e 49959 —
saíram em 28/09, no dia em que a Sprint 20 começou; o histórico de cada um
confirmou `Sprint 19 → Sprint 20`.

## Como se descobre, e o que custou chegar nisso

Histórico item a item (`workitems/{id}/updates`) responde, mas é **uma chamada
por item** — inviável numa tela de abertura com ~170 por sprint. A cláusula
`ASOF` do WIQL responde a sprint inteira numa consulta.

**O que a medição mostrou, e as duas armadilhas que ela revelou:**

| consulta (Sprint 19, em 05/10/2026) | itens |
| --- | --- |
| hoje, sem cerca de área | 333 |
| hoje, com cerca de área | **141** |
| no fim da sprint (ASOF), sem área | 474 |
| no fim da sprint (ASOF), com área | **236** |
| API da iteração do time (o que o Panorama usava) | 147 |

**Armadilha 1 — a cerca de área não é opcional.** O `ASOF` avalia o `WHERE` com
os valores da época. Sem a mesma cerca das outras consultas, ela varre o projeto
inteiro: 474 contra 236, e gente de outras squads vira transbordo permanente,
porque nunca esteve na lista do time.

**Armadilha 2 — as duas pontas têm que ser a MESMA pergunta.** Comparar a
consulta WIQL (141) com a lista da API da iteração (147) misturava transbordo
com desencontro de definição. Por isso existe **um construtor só**,
`C.wiqlIteracao(path, areas, instante)`, em que `instante` é a única variável —
e um teste compara as duas strings e falha se aparecer qualquer outra diferença.

Resultado com as duas corrigidas: **95 transbordos** na Sprint 19 — 3 deles PBIs
no nome do Urlan, que é o que a tela mostra.

## O que ficou na tela

**Panorama, coluna "Anterior".** Os que saíram vão no fim da lista, com selo
âmbar `→ Sprint 20`, e uma linha resume ("3 itens transbordaram para a Sprint
20") porque a prévia corta em 4 e o transbordo podia nunca aparecer.

**Board da sprint.** Coluna **Transbordou** no fim, ponto âmbar — a mesma cor do
selo, porque o mesmo fato não pode ter duas cores em duas telas. O cartão mostra
**para onde** foi, e não o estado: o estado é de outra sprint, e lido ali
sugeriria que o item anda dentro desta.

## Decisões

- **O placar não conta o transbordo.** O que a sprint entregou não muda por ela
  ter tido mais escopo. A Sprint 19 segue `2/2`, com o transbordo em linha
  própria.
- **Só a coluna "Anterior" e só sprint encerrada.** Na corrente ninguém
  transbordou ainda; perguntar ali gastaria duas consultas por abertura pra
  receber lista vazia, sempre.
- **Item que saiu e voltou não leva selo.** Ele está na sprint agora, que é o
  que a coluna afirma.
- **A marca `transbordou` mora fora de `fields`.** Ali só entra o que veio do
  DevOps; misturar marca própria com campo do servidor é como um filtro passa a
  responder por dado que ninguém escreveu.

## Fora de escopo

Contar tasks: a coluna ignora Task por desenho, e o Urlan confirmou que só PBI
interessa.
