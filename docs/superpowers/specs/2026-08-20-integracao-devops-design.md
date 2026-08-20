# Integração do Radar com o Azure DevOps — design

**Data:** 2026-08-20
**Projeto:** Radar de Projetos USA (`Radar de projetos/`)
**Estado:** aprovado, pronto para plano de implementação

## Problema

O `assets/data.js` é digitado à mão a cada quinzena, a partir da base Projetos
do Notion. Duas consequências:

1. **Trabalho repetido.** Datas, estado, produto e dono são fatos que o Azure
   DevOps já tem, e que hoje são copiados manualmente.
2. **Páginas vazias por falta de dado.** A base do Notion nunca marca
   "Concluído" e não tem demandas registradas, então a coluna Entregue do
   board, a página Pendências e o Report mensal aparecem vazios — não porque
   nada aconteceu, mas porque a fonte não registra.

Os 14 projetos da frente USA existem no Azure DevOps, no projeto
**`Ecommerce USA`** da org `ybera`, como **Epics**, com as demandas de cada um
como **Features** filhas.

## Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| Fonte dos fatos | Azure DevOps, projeto `Ecommerce USA` | É onde o dado já é mantido pelo time |
| Nível | Epic = projeto do Radar; Feature filha = demanda | Casa com a escala do Radar (projeto de 1 a 4 meses) |
| Divisão de responsabilidade | DevOps manda nos fatos; o editorial continua escrito à mão | O `title` legível, o `why` e o `result` são o que distingue o Radar de um backlog |
| Entrega do dado | Snapshot gerado fora da página | O leitor não tem PAT nem acesso ao DevOps — é a razão de o Radar existir |
| Quem roda | Script local (`node tools/sync.mjs`), com GitHub Action como passo seguinte | A e B são o mesmo script; B é só um YAML chamando ele |

### Por que não runtime

O Radar é lido por gente de fora do time de produto, que não tem PAT. Um PAT
não pode viajar numa página estática, e um proxy serverless custaria o offline,
o `file://` e a previsibilidade da impressão — além de precisar de proteção
própria para não virar uma API aberta do backlog. O snapshot mantém a página
100% estática: instantânea, sem login, imprimível.

## Evidência coletada antes do design

Os estados do processo são **customizados e em português** — "Aguardando
Início", "Em Andamento", "Em Teste", "Em impedimento" (observados na Agenda
Pública de Produto, outro app que lê o mesmo DevOps). A lista
`TERMINAL_STATES = ['Done','Closed','Removed','Completed']` que a Central de
Projetos usa **não casa com nada aqui** e não pode ser herdada. O mapa de
estados tem de ser construído contra os nomes reais — daí o script de
descoberta ser a primeira tarefa.

## Arquitetura

### Separação em dois arquivos de dados

`assets/data.js` deixa de existir como arquivo único e vira dois:

**`assets/fatos.js`** — gerado pelo script, cabeçalho "não edite à mão".
Por Epic: `id`, `azureTitle`, `track`, `start`, `end`, `status`, `health`,
`shipped`, `owner`, e `demands[]` com as Features filhas.

**`assets/prosa.js`** — escrito à mão. Contém o `meta` inteiro, os `tracks`
com seus textos de produto, o `summary` do "O essencial", os `asks`, os
`reports`, a tabela de mapeamento Area Path → `track`, e o dicionário
editorial indexado por id do work item:

```js
texto:{
  47688:{title:{pt,en}, why:{pt,en}, about:{pt,en},
         result:{pt,en}, healthNote:{pt,en}}
}
```

O `app.js` funde os dois na carga.

As 8 páginas HTML carregam hoje `<script src="assets/data.js"></script>`.
Cada uma passa a carregar os dois, nesta ordem — prosa primeiro, fato depois,
para o fato poder sobrescrever `meta.updated`:

```html
<script src="assets/prosa.js"></script>
<script src="assets/fatos.js"></script>
<script src="assets/app.js"></script>
```

Nenhuma outra parte da casca muda. `Radar de Projetos USA.html`, a versão
legada autocontida, não é tocada — ela tem cópia própria dos dados e segue
congelada.

### Regras de borda

**Fato sem prosa aparece, não some.** Epic novo no DevOps sem texto escrito
entra no Radar com o `azureTitle` e um marcador discreto de "sem redação". Se
sumisse em silêncio, a falta só seria percebida por ausência — e ausência não
se percebe.

**Prosa sem fato sai da página e entra no relatório.** Texto órfão significa
Epic apagado, movido de área ou fora do filtro. Não renderiza, mas o script
avisa, para a decisão ser sua: apagar o texto ou consertar o DevOps.

### Escopo da consulta

Todos os Epics do projeto `Ecommerce USA`, sem filtro de área no WIQL. É a
tabela Area Path → `track` do `prosa.js` que decide a qual produto cada um
pertence. Epic cuja área não está na tabela **não é descartado**: entra com
`track` nulo, renderiza num grupo "sem produto" e é listado no relatório.
Filtrar no WIQL esconderia Epic novo; filtrar na tabela o mostra e cobra o
cadastro.

### Mapeamento campo a campo

| Campo do Radar | Origem |
|---|---|
| `id` *(novo)* | `System.Id` do Epic — chave de junção com a prosa |
| `azureTitle` | `System.Title` — assume o papel de rastreio que o campo `notion` tem hoje |
| `track` | `System.AreaPath`, via tabela Area Path → `track` no `prosa.js` |
| `start` | `Microsoft.VSTS.Scheduling.StartDate` |
| `end` | `Microsoft.VSTS.Scheduling.TargetDate` |
| `status` | `System.State`, por mapa estado → `done` \| `doing` \| `next` |
| `health` | `System.State` cujo nome contém "impediment"/"impedimento" → `blocked`. O `watch` ("em atenção") **continua editorial**: não há sinal equivalente no DevOps, e inferir atenção de atraso de data produziria alerta aceso o tempo todo |
| `shipped` | `Microsoft.VSTS.Common.ClosedDate` → `"AAAA-MM"` |
| `owner` | `System.AssignedTo.displayName` |
| `demands[]` | Features filhas (link `Child`): `t` ← título, `status` ← state, `due` ← `TargetDate`, `done` ← `ClosedDate` → `"AAAA-MM"` |
| `title`, `why`, `about`, `result`, `healthNote` | `prosa.js`, por id |
| `meta`, `tracks`, `summary`, `asks`, `reports` | `prosa.js` |

O `fatos.js` grava `geradoEm` (ISO da rodada) no topo, e o `app.js` usa esse
valor como `meta.updated`, caindo no valor editorial se o `fatos.js` não existir
ainda. O script **não escreve no `prosa.js`** em nenhuma hipótese — o arquivo
que você edita nunca é tocado por máquina.

`meta.cycle`, `from` e `to` continuam editoriais: são rótulo de edição, não
fato do sistema.

**Efeito colateral que era o objetivo:** `shipped` e `demands[].done` saem os
dois de `ClosedDate`. É isso que enche a coluna Entregue do board, a página
Pendências e o Report mensal — que hoje dependem de `extra` escrito à mão.

### Onde o código vive

`tools/` na **raiz do repositório**, fora de `Radar de projetos/`.

Isto não é organização, é requisito: a Vercel está configurada com Root
Directory = `Radar de projetos`. Um `package.json` dentro dessa pasta faria a
Vercel detectar um projeto Node e tentar rodar um build que não existe,
quebrando a página que está no ar. Com `tools/` na raiz, o deploy não vê nada
disso e o site continua tão estático quanto hoje.

| Arquivo | Responsabilidade |
|---|---|
| `tools/ado.mjs` | camada REST: `adoFetch`, `runWiql`, `getFields`, `listProjects`, `AuthError`, `NetworkError` |
| `tools/mapa.mjs` | funções puras de mapeamento — sem I/O, sem DOM |
| `tools/sync.mjs` | orquestra: consulta, mapeia, grava `assets/fatos.js`, relata |
| `tools/descobrir.mjs` | só-leitura: imprime tipos, estados, áreas e campos preenchidos |
| `tools/tests/mapa.test.mjs` | `node --test` sobre o `mapa.mjs` |
| `tools/package.json` | só o script de teste; nenhuma dependência |

`tools/ado.mjs` é **cópia reduzida** do `assets/api.js` da Central de Projetos
— já é UMD e sem DOM, roda em Node sem adaptação. Cópia e não dependência
porque a identidade deste projeto é "sem build e sem dependência", e um
submódulo ou pacote npm para 124 linhas custa mais do que paga. O custo real é
divergência: correção feita na Central não chega aqui sozinha. O cabeçalho do
arquivo registra a procedência e que a correção precisa viajar nas duas
direções.

### Interface

```bash
ADO_PAT=xxx node tools/descobrir.mjs        # primeira tarefa: o que existe lá
ADO_PAT=xxx node tools/sync.mjs --dry-run   # só o relatório, não grava
ADO_PAT=xxx node tools/sync.mjs             # grava assets/fatos.js
```

PAT por variável de ambiente, nunca por argumento — argumento vaza no
histórico do shell e em `ps`. O PAT não entra em nenhum arquivo, e a saída do
script mascara qualquer coisa que se pareça com ele.

## Tratamento de erro — as cinco guardas

1. **Nunca grava parcial.** O arquivo é montado inteiro em memória e gravado
   de uma vez. Falha no meio = nada gravado, `fatos.js` anterior intacto.
2. **Guarda de esvaziamento.** O `fatos.js` é JS válido e exporta
   `{geradoEm, epics:[...]}`, então o script carrega o arquivo anterior e lê
   `epics.length`. Se a consulta nova voltar com zero, ou com menos de 80%
   dessa contagem, o script **recusa gravar** e explica. Na primeira rodada não
   há arquivo anterior: aí só a regra do zero vale. É a proteção contra o dia em que alguém renomeia a área no DevOps:
   sem ela, uma rodada agendada apagaria os 14 projetos da página no ar.
3. **PAT vencido é frase, não stack trace.** `AuthError` vira uma linha
   dizendo o que fazer. Aproveita a descoberta da Central: PAT vencido no ADO
   não responde 401 — responde 200 com `text/html`, e o check de
   `content-type` é o que detecta isso.
4. **Estado desconhecido não vira `next` em silêncio.** `System.State` fora do
   mapa entra com o estado cru e é listado no relatório. Mapear o desconhecido
   para "planejado" esconderia mudança de processo de quem precisa saber.
5. **Relatório no fim, sempre.** Contagem de Epics e demandas, itens sem
   prosa, prosas órfãs, estados não mapeados, e o que mudou desde a última
   rodada. Quando o GitHub Action estiver ligado, este relatório substitui o
   olhar humano no `git diff`.

## Verificação

- `tools/mapa.mjs` tem teste automatizado (`node --test` em `tools/`): mapa de
  estados completo e incompleto, data ausente, `ClosedDate` → mês, filho que
  não é Feature, Area Path fora da tabela, e as duas regras de borda (fato sem
  prosa, prosa sem fato).
- O site continua verificado como sempre: servir a pasta e navegar as 8
  páginas, desktop e 390px, claro e escuro, PT e EN.
- Verificação viva contra o DevOps real depende do PAT do usuário e é feita
  por ele: `--dry-run` primeiro, conferir o relatório, depois gravar.
- Um teste de regressão importante: com o `fatos.js` gerado, as 8 páginas têm
  de renderizar sem erro de console e o Report mensal tem de passar a mostrar
  os meses derivados de `ClosedDate`.

## Fora do escopo

- **GitHub Action agendada.** É o passo seguinte e reusa o script inteiro; não
  entra nesta implementação.
- **Ler o Notion.** A base do Notion deixa de ser fonte de fato. Nada é
  importado dela; o que existe hoje no `data.js` é migrado à mão para o
  `prosa.js` uma vez.
- **Escrever no DevOps.** O script é só-leitura, sempre.
- **Substituir os `asks` (Pendências) por dado do DevOps.** Depende de campo
  que hoje está vazio na base; fica editorial nesta etapa.
