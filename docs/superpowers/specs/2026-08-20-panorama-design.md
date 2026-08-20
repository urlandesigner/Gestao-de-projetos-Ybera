# Panorama — página de abertura da Central

**Data:** 2026-08-20 · **Origem:** pedido do Urlan de trazer telas do Radar (Panorama,
Pendências, Produtos, Report) para a Central. Panorama é a primeira das quatro.

## Problema

A Central hoje abre em "Meus itens" — detalhe antes de visão geral. Não existe
nenhuma tela que responda, em três segundos: o que está travado, o que fecha
neste mês, o que passou do prazo, o que está parado.

O Radar tem uma página assim, mas lá metade do conteúdo é texto editorial escrito
à mão a cada quinzena. Aqui a página é 100% derivada do Azure DevOps, ao vivo —
sem texto para manter. O que o Radar chama de "o essencial" (parágrafos de
narrativa) **não faz parte deste escopo** e não tem equivalente automático.

## O que a página mostra

Quatro blocos, todos derivados dos itens que a Central já busca por time.

**1. Indicadores** — cinco números:

| Indicador | Regra |
|---|---|
| Bloqueados | `stateBucket(estado) === 'atencao'` (Impediment, Blocked, On Hold, Waiting) |
| Fecham este mês | data-alvo dentro do mês corrente **e** não concluído |
| Atrasados | data-alvo anterior a hoje **e** não concluído |
| Parados 14d+ | última alteração há 14 dias ou mais **e** não concluído |
| Meus itens | tamanho de `cache.myItems` |

Bloqueados e Atrasados ganham destaque vermelho quando maiores que zero; os
demais são neutros. Zero é informação legítima e aparece como `0`, não vazio.

**2. Sprints em curso** — uma linha por time com sprint corrente: nome, período e
barra de progresso (`sprintProgress`, que já ignora Tasks). Times sem sprint não
aparecem aqui.

**3. Por nível** — Épicos / Features / PBIs somando todos os times, com a quebra
"a fazer · em andamento · concluídos (30d)" e bloqueados em vermelho.
Reaproveita `bucketCounts` e o componente `.nivel` dos cartões.

**4. Atenção agora** — lista dos itens bloqueados e atrasados (até 6), cada um
com tipo, estado e link para o DevOps. Ordem: bloqueados primeiro, depois
atrasados por data-alvo mais antiga. É a ponte entre "3 bloqueados" e "quais".
Quando não há nada, diz que não há — não some.

## Dados

**Nenhuma requisição nova.** A consulta de contagens (`wiqlCounts`) já traz os
itens de cada time; `FIELDS_COUNTS` ganha três campos no mesmo lote:

- `System.Title` — para a lista "Atenção agora"
- `Microsoft.VSTS.Scheduling.TargetDate` — data-alvo (prazo/atraso)
- `System.ChangedDate` — última alteração (parados)

`refreshCard` guarda esses campos no cache enxuto (`entry.items`), junto do que
já guarda. O nome do projeto vem da própria chave do cartão, para montar o link.

## Degradação (o que acontece quando falta dado)

- **Data-alvo vazia no DevOps:** "Fecham este mês" e "Atrasados" mostram `—` e
  uma nota curta ("data-alvo não preenchida no DevOps"), em vez de `0` — zero
  afirmaria que não há atraso, o que seria mentira. Detectado por: nenhum item
  do conjunto tem data-alvo.
- **Cache antigo** (gravado antes destes campos): mesmo comportamento acima até
  o próximo ↻.
- **Sem token / token vencido:** mesma mensagem das outras páginas; os blocos que
  dependem de dado ficam vazios com aviso, a navegação continua funcionando.
- **Erro em um time:** os outros continuam contando; o erro aparece no topo da
  página, como já acontece nos cartões.

## Onde entra na navegação

Vira a **primeira linha da sidebar** e a **página padrão** (rota `#panorama`).
Quem abrir a Central sem hash cai aqui. `#meus-itens` e `#projetos` continuam
funcionando como hoje.

A regra de CSS que troca de página passa a esconder todas as seções e mostrar só
a ativa — hoje ela lista par por par (`meus-itens` esconde `projetos`…), o que
multiplica linhas a cada página nova. Mudança pequena e no caminho do trabalho.

## Como se garante que está certo

Toda a lógica de contagem e ordenação vai em funções puras no `core.js`, com
testes em `node --test`, no padrão do resto do projeto:

- `panoramaKpis(items, agora)` → `{ bloqueados, fechamMes, atrasados, parados, semDatas }`
- `itensAtencao(items, agora, limite)` → lista ordenada (bloqueados, depois
  atrasados por data mais antiga)

Casos cobertos pelos testes: item concluído nunca conta como atrasado nem
parado; virada de mês; data-alvo ausente liga `semDatas`; ordenação e limite da
lista; conjunto vazio.

Depois dos testes, verificação visual no navegador com dados de teste, incluindo
o caso "sem data-alvo".

## Fora de escopo

- Texto editorial (parágrafos "por quê"/"sobre"/resumo do mês) — não há fonte
  automática; se um dia entrar, exige decidir onde o texto mora, já que o
  repositório é público.
- As outras três páginas (Pendências, Produtos, Report) — cada uma no seu ciclo.
- Gráficos e séries históricas: o DevOps não guarda histórico aqui, e o cache é
  um retrato do momento.
