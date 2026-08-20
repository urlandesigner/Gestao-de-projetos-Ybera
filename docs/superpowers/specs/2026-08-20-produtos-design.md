# Produtos — os épicos como produtos, com progresso real

**Data:** 2026-08-20 · Terceira das quatro telas trazidas do Radar.

## O que mostra

Um cartão por épico, agrupado por time (o cabeçalho do grupo só aparece quando
há mais de um), ordenado pelo que **fecha primeiro**. Épico sem data-alvo vai
para o fim: não há prazo a cobrar, e deixá-lo no topo empurraria para baixo o que
tem data.

Cada cartão: título (link para o DevOps) e `#id`, tipo, estado (vermelho quando é
impedimento), **janela** (`21 de jul. – 31 de ago.`, ou "até…", "desde…", ou
"sem janela"), **responsável** ("sem responsável" quando vazio) e a faixa de
**progresso** com barra — `3/5` de filhos concluídos.

No Radar, esta página era sustentada por parágrafos escritos à mão ("sobre o que
se trata", "por quê"). Aqui não há texto editorial: o que dá substância é o
progresso real medido pelos filhos.

## Progresso: como é medido

Roll-up recursivo dos descendentes de cada épico — Features e os PBIs abaixo
delas, em qualquer profundidade. Um item conta como entregue quando está em
estado terminal.

- **Tasks ficam fora**, porque a consulta não as traz. É a mesma régua do
  `sprintProgress`, que também ignora Task: progresso se mede por item de
  backlog, não por tarefa.
- **Descendente cujo pai não veio na consulta não é contado** (por exemplo, um
  PBI cuja Feature vive na área de outro time). O roll-up só afirma o que enxerga.
- **Ciclo de link** no DevOps não travaria o cálculo: o caminhamento marca os
  ids já vistos.
- Épico sem filhos mostra "Sem filhos —" em vez de `0/0`, que pareceria atraso.

## Por que esta página tem consulta própria

É a **única** das quatro que não se serve do cache dos cartões, e a razão é
precisão: o `wiqlCounts` corta itens concluídos há mais de 30 dias. Com esse
corte, um épico com 20 filhos entregues em maio apareceria como "3 de 8" — número
errado, e pior que ausente. `wiqlProdutos` é igual, **sem o corte de data**.

Consequência: mais itens vindos da API (centenas, não dezenas). Por isso a página
**carrega sob demanda** — só ao abri-la, seguindo o padrão que o board dedicado já
usa, com cache próprio de 10 minutos e o ↻ do topo forçando recarga quando ela
está aberta. O refresh geral não paga por esta tela.

O estado fica **em memória, não no localStorage**: são muitos itens que só servem
a esta página, e o localStorage é espaço escasso compartilhado com o resto.

## Degradação

- **Sem datas no DevOps:** "sem janela" no lugar da janela; a ordenação joga
  esses épicos para o fim. O resto do cartão funciona.
- **Falha de rede ou PAT recusado:** mensagem no topo e os produtos já carregados
  continuam na tela — a página não fica em branco por causa de um erro
  transitório. PAT recusado também acende o badge "token vencido".
- **Sem token:** mesma mensagem das outras páginas.

## Fora de escopo

- Agrupamento por linha de produto (o `track` do Radar): não existe no DevOps, e
  derivar de área ou tag exigiria uma convenção que hoje não está estabelecida.
- Marcar atraso aqui: quem cobra prazo é a página de Pendências. Esta descreve o
  produto; misturar as duas leituras tornaria as duas piores.
