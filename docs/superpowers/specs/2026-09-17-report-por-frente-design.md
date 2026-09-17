# Report — nome de negócio e leitura "Por frente"

**Data:** 2026-09-17 · Revisão do report para stakeholder, aprovada pelo PO após análise.

## O problema

O report respondia bem "o que foi entregue" e mal "o que está sendo feito" e "o que
está planejado". Cinco causas, confirmadas no código:

1. Sem camada editorial: todo título vinha cru do `System.Title` (jargão), e a
   descrição do épico é boilerplate — o documento não tinha de onde tirar linguagem
   de negócio.
2. "Em curso" era só um número; a lista real ficava em Próximos passos, por prazo,
   misturando item em andamento com item que nem começou.
3. Roadmap (Notion) e backlog não conversavam; item na fila sem data não aparecia.
4. Estrutura por tipo de dado (Entregas / Decisão / Próximos), não por iniciativa.
5. Jargão residual: estado em inglês e "DevOps" em notas.

## Decisões (aprovadas)

- **Camada editorial em arquivo no repo:** `assets/report-nomes.json`, `id → { nome, resumo }`.
  Sem entrada, vale o título. PBI **não** ganha nome — só épicos e Features.
  O repo é público; nomes de iniciativa já eram públicos via `roadmap.json`.
- **Seção "Por frente"** entra como estrutura central, logo depois do Resumo.
- **Sem parágrafo do mês** escrito à mão.
- Ponte Roadmap ↔ épico (campo `epico` no `roadmap.json`) fica para uma fase seguinte.

## O que mudou

### Nome de negócio (`briefing.js`, `report.js`)

- `htmlReport` recebe `nomes` e troca o título em: linhas (Entregas, Próximos,
  Decisão), cabeçalho de produto, chips, "Onde caiu o esforço", triagem de risco,
  épicos fechados e nos cards de frente. A busca de Entregas acha pelos dois nomes.
- Modo PO lê `assets/report-nomes.json`; o link `#r=` leva só os nomes dos itens
  que o leitor vê (`nomesDoLink`), saneados nos dois lados (`saneNomes`).
- Botão **"N sem nome"** (só com `?po=1`): lista épicos/Features do documento sem
  nome e copia um esqueleto JSON (`nome`, `resumo`, `_titulo` de referência) — é o
  rascunho que alguém preenche e cola no arquivo.

### Por frente (`core.js frentes`, `briefing.js corpoFrentes`)

Um card por épico com item no documento: nome, resumo (se houver), barra de rumo
e blocos **Entregou em <mês>** / **Em andamento** / **Próximo marco** / **Na fila**,
mais um selo de risco (travados · atrasados) ou "concluída". Ordem: mais movimento
(entregas + andamento) na frente, depois risco, depois nome. Mês fechado mostra
só "Entregou". O épico entregue no mês não vira linha de si mesmo — marca a frente
como concluída. Item sem produto não vira frente.

Só entra frente com movimento: entregou algo no mês, tem algo em andamento ou
fechou no mês (ajuste pedido pelo PO em 17/09/2026). Fila, trava e vazio não
bastam. O travado ficou de fora numa segunda rodada, no mesmo dia: o card não tem
bloco que nomeie o item travado, então uma frente só travada virava cartão com
"Nada concluído neste mês" e "Nada em andamento agora" embaixo de um selo
vermelho — foi o que o PO viu e reclamou. Com a regra atual todo card tem ao
menos um bloco preenchido, e o que trava continua em Depende de decisão e no
cartão Atenção. Documento em que nada disso existe volta `vazio`.

### Próximos passos

Duas listas em vez de faixas de prazo: **Em andamento agora** (tudo que roda,
com "prazo dd/mm", "atrasado desde dd/mm" em vermelho, ou "sem prazo definido") e
**Na fila, com data marcada**. O resumo "Por frente, o que vem a seguir" saiu —
a seção Por frente responde isso. `briefingDoMes` passou a devolver `fila`.

### Vocabulário

Sem estado cru em lugar nenhum ("parado", "sem prazo definido") e sem "DevOps" nas
notas de data aproximada e de mês fechado.

## Fora de escopo

- Parágrafo editorial do mês (decisão do PO: não).
- Ponte Roadmap ↔ épico (fase seguinte).
- Nome de negócio para PBI.
