# Panorama: ritmo e roadmap

Desenho aprovado pelo Urlan em 02/10/2026.

## Problema

O Panorama é foto do presente: *Agora* (5 tiles), *Sprints em curso*, *Por nível*
e *Atenção agora*. Nenhum bloco olha pra trás, e nenhum responde o que o gestor
pergunta.

O gestor **abre a Central** (confirmado pelo Urlan). Então o Panorama tem dois
leitores com perguntas diferentes:

- **Gestor**, de vez em quando: *o time mantém o ritmo?* e *os projetos vão
  chegar na data?*
- **PO**, todo dia: *o que exige minha ação agora?*

Hoje a página só serve o segundo, e abre com jargão de board ("Parados 14d+").

## O que a medição mostrou, e por que ela muda o desenho

**A previsibilidade não sai do DevOps.** Dos 8 épicos do time, **5 não têm
nenhum filho** e **4 não têm data de fim**. Um gráfico de "vamos chegar na data"
em cima disso pareceria confiante e estaria mentindo — o mesmo defeito do
`vazio` que dizia "nada registrado" com oito entregas na tela.

**Quem responde é o roadmap.** `assets/roadmap.json` tem 13 projetos, todos com
`inicio`, `fim` e `status`: 4 concluídos, 2 em andamento, 7 previstos. Dado
curado à mão, e já é a fonte do "Projetos atendidos" do relatório. Em 02/10/2026
ele acusa **1 vencido** (Compliance Google, fim 30/09, ainda em andamento).

**O ritmo sai do DevOps**, via `C.reportPorMes`. Mas é magro hoje: com só 2
épicos tendo filhos, a evolução mensal é quase só a Loja Clube USA. Isso não
invalida o bloco — invalida ler o bloco sem saber disso, e é por isso que o
aviso de cobertura faz parte do desenho, não é enfeite.

## Decisões

**A régua do ritmo é a mesma do relatório de Entregas.** Se o gestor lê "31
itens entregues" no relatório e abre o Panorama vendo outro número, os dois
perdem credibilidade. Este projeto já levou essa mordida: a capa do report dizia
28 e o corpo contava 8, porque eram réguas diferentes.

**As barras são empilhadas por frente, não um total.** A contagem é a mesma
(itens concluídos), mas dividida por projeto. Item é proxy fraco de esforço — um
item pode ser 1 hora ou 3 semanas, e "12 em agosto, 8 em setembro" convida a
concluir que o time desacelerou. Dividido por frente, o gestor vê *qual* projeto
andou, que é a leitura certa, e ganha de graça a resposta de "onde o esforço
foi".

**A Central passa a ler o roadmap.** Era fonte exclusiva do report. É a única
forma de responder a pergunta 2 com dado que existe. Custo aceito: o roadmap é
atualizado à mão e envelhece se ninguém mexer.

**Os blocos novos vêm primeiro.** O gestor para de ler depois do segundo bloco;
o PO rola. Ordem nova: Ritmo · Roadmap · Agora · Sprints · Atenção · Por nível.

## Componentes

### `core.js` — duas funções puras, com teste próprio

```
evolucaoMensal(items, agora, n) -> { meses: [{ mes, total, porFrente: [{ id, nome, n }] }], frentes: [{ id, nome }] }
```

Últimos `n` meses (incluindo o corrente), do mais antigo pro mais novo — ordem
de leitura do gráfico, inversa à de `reportPorMes`, que devolve o mais novo
primeiro. Mês sem entrega entra com `total: 0`: buraco na série é informação, e
pular o mês mentiria sobre a forma da curva.

A frente de um item é o épico ancestral, pela mesma `mapaDeProdutos` que o
Produtos e o report usam. Item sem épico na cadeia cai numa frente `null`,
rotulada "Sem frente" — não some da contagem, senão o total do gráfico diverge
do total do relatório, que é justamente o que a régua única existe pra impedir.

```
riscoDoRoadmap(itens, agora) -> { total, concluidos, emCurso, vencidos, lista }
```

- `concluido` → status `'concluido'`.
- `vencido` → `fim` < hoje e status ≠ `'concluido'`.
- `emCurso` → não concluído, não vencido, e `inicio` <= hoje <= `fim`.
- `lista` → só os vencidos e em curso, vencidos primeiro, cada um com
  `{ titulo, inicio, fim, status, vencido, diasRestantes }`.

`diasRestantes` é negativo no vencido — quem desenha decide a palavra, a função
não escreve texto.

### `app.js` — dois blocos de desenho

**Ritmo de entrega.** Barras verticais em CSS (sem SVG, sem biblioteca: o
projeto não tem build e já desenha barra de progresso assim). Uma coluna por
mês, empilhada por frente, legenda compacta. Linha de apoio fixa: *"contagem de
itens concluídos, mesma régua do relatório · cobre as frentes com itens
cadastrados no DevOps"*.

**Roadmap.** Três números — total, concluídos, vencidos — com barra de progresso
do roadmap (`concluidos/total`). Vencidos em cor de alerta. Abaixo, só a lista
de vencidos e em curso, com janela e dias restantes. Os previstos são número,
não lista: a lista inteira já está no relatório.

## Dados e carregamento

**Ritmo precisa da base sem corte.** A consulta do Panorama é `wiqlCounts(30)` —
abertos mais o que fechou nos últimos 30 dias, sem história. A base completa é o
`baseState`, que hoje só carrega ao abrir Produtos.

O Panorama passa a disparar `carregarBase()`. Não bloqueia: a página renderiza na
hora com os blocos que já tem, e o bloco de Ritmo mostra "carregando…" até o dado
chegar — é o padrão que o Produtos já usa. Efeito colateral bom: sendo a página
de entrada, ela aquece o cache pro Produtos e pro Report.

**Roadmap precisa do arquivo.** `assets/roadmap.json`, `cache: 'no-store'`, pelo
mesmo saneamento que o report usa. Carrega em paralelo e redesenha quando chega.

## Estados vazios e de erro

- Base ainda carregando → bloco de Ritmo mostra "carregando…".
- Base sem nenhum item concluído nos `n` meses → frase, não gráfico vazio:
  "Nenhuma entrega registrada nos últimos 6 meses."
- `roadmap.json` falha → o bloco de Roadmap não aparece. Não é erro na cara do
  gestor: é dado auxiliar, e a página inteira continua de pé sem ele.
- Sem PAT → os dois blocos seguem a regra que já vale na página (`semDados`).

## Testes

Em `tests/core.test.js` (ou arquivo próprio, se crescer):

- `evolucaoMensal`: devolve exatamente `n` meses; mês sem entrega vem com zero;
  ordem é do mais antigo pro mais novo; item sem épico cai em "Sem frente" e
  continua no total; o somatório das frentes bate com o total do mês.
- **A régua bate com o relatório:** o total de `evolucaoMensal` num mês é igual
  ao que `reportPorMes` conta pro mesmo mês. É o teste que impede o Panorama e o
  report de se contradizerem na frente do gestor.
- `riscoDoRoadmap`: vencido é fim passado com status não concluído; concluído
  com fim passado não é vencido; em curso exige hoje dentro da janela;
  `diasRestantes` negativo no vencido; a lista traz só vencidos e em curso, com
  vencidos primeiro.

O desenho em si (`app.js`) não ganha teste de DOM — é a convenção da página, e
forma se confere olhando.

## Fora de escopo

- Gantt dos 13 projetos. A lista completa já é seção do relatório; no painel ela
  custaria muito pixel pro que informa.
- Métrica de esforço (story points, tempo de ciclo). O DevOps não tem o dado
  preenchido, e inventar proxy é pior que contar item com aviso.
- Ponte roadmap ↔ épico. Continua pendente desde 17/09/2026 e não é necessária
  aqui: os dois blocos leem fontes separadas de propósito.
