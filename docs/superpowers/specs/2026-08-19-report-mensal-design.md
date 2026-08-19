# Report mensal — design

**Data:** 2026-08-19
**Projeto:** Radar de Projetos USA (`Radar de projetos/`)
**Estado:** aprovado, pronto para plano de implementação

## Problema

O Radar responde "o que está em curso" e "o que vem depois". Não responde
"o que foi concluído". Falta uma página que o PO mande uma vez por mês para
os mesmos stakeholders que já recebem o link do Radar, listando o que ficou
pronto no mês.

## Restrição que define o desenho

A base do Notion **não tem nenhum item concluído**. Das 32 linhas: 22 "Não
iniciado", 9 "Em andamento", 1 "Descontinuado". Nenhum projeto tem demandas
registradas. É por isso que a coluna "Entregue" do board e a página Pendências
já aparecem vazias.

Consequência: um report puramente derivado dos dados nasce vazio e continua
vazio até a base ser preenchida. O desenho é **híbrido** — deriva o que os
dados sabem e aceita texto escrito à mão para o que eles ainda não sabem.

## Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Fonte do conteúdo | Híbrida: derivada + escrita | A base vazia inviabiliza o puramente derivado; o puramente escrito descolaria do board |
| Público | Mesmo do Radar, por link | Não é deck de liderança nem memória de time; print continua secundário |
| Recorte de "feito" | Entrega de projeto + demanda concluída | Menor unidade de trabalho terminado; cobre o mês sem entrega inteira |
| Organização | Mês recente aberto, anteriores recolhidos | Link estável que sempre abre no mês certo; histórico a um clique |

## Contrato de dados

### Reusado, já existe

Projeto entregue: `status:"done"` + `shipped:"AAAA-MM"` + `result:{pt,en}`.
O `card()` do motor já renderiza tudo isso, incluindo "No ar desde ago/26".

### Novo: mês de conclusão da demanda

Demanda hoje é `{t, status, due}`. `due` é o prazo, não a data de conclusão —
uma demanda com prazo em julho e concluída em agosto cairia no mês errado.
Campo opcional novo, só para `status:"done"`:

```js
demands:[{t:{pt,en}, status:"done", due:"2026-08-15", done:"2026-08"}]
```

Demanda concluída sem `done` não é atribuída a nenhum mês. Não some do resto
do site — só não entra no report.

### Novo: bloco escrito à mão

```js
reports:[
  {m:"2026-08",
   summary:{pt:"...", en:"..."},   // opcional: o parágrafo do mês
   extra:[{t:{pt,en}}]             // opcional: concluído que a base não registra
  }
]
```

`summary` é a narrativa do mês. `extra` é a lista de coisas terminadas que o
Notion não registra — nos primeiros meses é o que dá corpo ao report.

### Derivação dos meses

A lista de meses é a **união** de três fontes, em ordem decrescente:

1. os `m` declarados em `DATA.reports`
2. os `shipped` dos itens com `status:"done"`
3. os `done` das demandas com `status:"done"`

Assim, marcar uma entrega e esquecer de criar o registro do mês não faz a
entrega sumir em silêncio.

## Anatomia da página

`report.html`, `body[data-page]="report"`, mesma casca das demais (skip link,
`.side`, `.wrap`, topbar com PT/EN + tema + imprimir, rodapé). Contêineres
vazios preenchidos pelo motor. Nenhum componente visual novo.

**Bloco do mês recente (aberto):**

1. `.sec-head h2` — mês por extenso, na serifa. Formatador novo: "Agosto de 2026"
   em PT, "August 2026" em EN. O `fmtMonth` existente devolve a forma curta
   ("ago/26") usada nos cartões e não serve de cabeçalho.
2. `.strip` — contagem **do mês**: "1 entrega · 4 demandas concluídas · 2 outros itens".
   Só conta o que pertence ao mês. Nada de "frentes em curso": é fato do presente e
   estaria errado num mês passado.
3. `.summary` — o parágrafo do `summary`, se houver
4. Entregas — `.cards` com o `card()` existente
5. Demandas concluídas — agrupadas por projeto, pelo `title` (o nome escrito para
   o leitor), não pelo `notion`: `.dh` com o nome do projeto + `.dlist` `d-done`
6. `extra` — mesma `.dlist` `d-done`, sob o rótulo `.dh` "Também concluído" /
   "Also completed"

**Meses anteriores:** um `<details class="fold">` por mês, do mais novo ao mais
antigo, fechados, com a mesma anatomia interna menos a `.strip`.

## Navegação

Item novo entre Produtos e Futuro, com contador derivado no mesmo padrão dos
outros badges: **entregas + demandas concluídas + `extra` do mês mais recente**. A barra passa a ler
presente → passado → futuro.

`report.html?m=2026-07` abre julho expandido. Parâmetro ausente, inválido ou
de mês inexistente cai no mês mais recente, sem erro. Mesmo padrão do
`?print=1` que o motor já lê com `URLSearchParams`.

## Estados vazios

| Situação | Comportamento |
|---|---|
| Nenhum mês com nada (estado real hoje) | Página inteira com `emptyBox()`: uma linha + "por quê?" explicando que a base ainda não tem item concluído — igual à coluna Entregue e à página Pendências |
| Mês sem item derivado nem `extra` | Sobra o `summary`; sem nem isso, `.empty` dentro do bloco do mês |
| `DATA.reports` ausente ou vazio | Tratado como lista vazia; os meses derivados de `shipped`/`done` ainda aparecem |

## Impressão

A página imprime a si mesma com `window.print()`, como o `completo.html` faz —
o botão das outras páginas continua roteando para `completo.html?print=1`.

A regra de print existente esconde `.fold`, então no papel sai só o mês
corrente. **Nenhum CSS de impressão novo.**

## Fora do escopo

- `completo.html` não recebe o report: já é a página longa de leitura corrida, e o report tem cadência própria
- Seletor de mês com UI própria: o `?m=` cobre o caso sem inventar controle novo
- Marcar visualmente o que é derivado vs. escrito à mão: todo o `data.js` é mantido à mão de qualquer forma

## Verificação

A pasta não tem suíte de teste. Verificação é servir e navegar:

- desktop e mobile, tema claro e escuro
- estado vazio com os dados reais (é o estado de hoje)
- estado cheio com um mês fictício injetado em runtime pelo console — sem commitar dado falso
- `?m=` válido, inválido e ausente
- print do mês corrente sem os meses recolhidos
- console sem erro em todas as páginas (o motor é compartilhado; a página nova não pode quebrar as existentes)
