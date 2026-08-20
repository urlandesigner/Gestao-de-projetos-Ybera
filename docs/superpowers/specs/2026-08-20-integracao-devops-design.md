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
**`Ecommerce USA`** da org `nivello`, como **Epics**, com as demandas de cada um
como **Features** filhas.

## Correção de 2026-08-21: a hierarquia real

Este spec foi escrito assumindo **Epic = projeto do Radar, Feature = demanda**.
A primeira rodada de descoberta contra a organização real mostrou que está
invertido um nível, e que dois outros pressupostos estavam errados. O que
segue abaixo permanece como registro do que se acreditava; esta seção manda.

**O que se confirmou errado:**

| Pressuposto | Realidade |
|---|---|
| Org `ybera` | `nivello` — o nome vinha de fixture de teste da Central |
| Projeto `Ecommerce USA` | **não existe**. A org tem `MMNDemo` (vazio), `B2C` (70 Epics) e `Novo PRO` (5). A frente USA está em `B2C` |
| Epic = projeto do Radar | **Epic = produto.** Os Epics em `B2C\Vertical Ecommerce e Growth` são `Loja Clube USA`, `Loja Interna USA/MX/CL/PA`, `Loja da Influencer`, `Ybera Reviews`, `IA de Recomendação / Quiz AI Ybera`, `Ecommerce Europa / Crossborder USA` — nome por nome, os seis produtos que o Radar já tinha |
| Feature = demanda | **Feature = projeto do Radar.** `[EUA] Nova Home`, `[EUA] Subscriptions`, `[EUA] Ajustes Compliance Google Shopping/Ads` |
| Estados customizados em português | No nível de Epic são `New`/`In Progress`/`Done`. Os dez estados ricos — incluindo `Impediment` — são de **Feature**, o que corrobora que é ali que o Radar vive |

**Três evidências independentes** sustentam a inversão: Epic tem `TargetDate`
preenchido em 3 de 70 (não tem janela), Feature em 205 de 646; o estado
`Impediment`, que `healthDe` procura, só existe em Feature; e 559 das 646
Features têm `System.Parent`.

**O que muda no desenho:**

- A consulta é de **Feature**, não de Epic. Todas as Features do projeto numa
  consulta, filtradas por pai **em memória** — evita risco de dialeto WIQL com
  `IN` e reaproveita o agrupamento já testado.
- O `track` sai do **id do Epic pai**, via a tabela `produtos` em
  `tools/config.json`. A tabela `areas` (Area Path → produto) deixa de existir:
  casar id é exato, casar texto de área era frágil.
- Feature cujo pai não está em `produtos` **é descartada** — é trabalho de
  outra frente, e o projeto `B2C` tem 646 Features de toda a empresa. O
  desenho anterior a renderizaria num grupo "sem produto", o que encheria a
  página com o backlog alheio.
- **`estadosExcluidos` é conceito novo**, distinto de "não mapeado". `Removed`
  são 62 Features canceladas: não entram no Radar de forma alguma, e também
  não são alerta de configuração faltando. São três resultados, não dois:
  mapeado, excluído e desconhecido.
- **Guarda nova, que o descarte por pai torna necessária:** um Epic-produto
  novo na vertical (digamos `Loja Clube Peru`) teria todas as filhas
  descartadas em silêncio. O relatório lista Epics com Features filhas que não
  estão em `produtos`, com id, título e contagem — é o que substitui o papel
  que o grupo "sem produto" tinha antes.
- `demands` continua sempre `[]`. O `data.js` original nunca teve demanda
  alguma, e descer um terceiro nível é escopo que ninguém pediu.

**O que não muda:** o formato do `fatos.js`, campo por campo — `fundir()` no
`app.js` depende dele, e o site inteiro depende de `fundir()`.

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
`reports`, e o dicionário editorial indexado por id do work item:

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

**Prosa sem fato sai da página e avisa no console.** Texto órfão significa
Epic apagado, movido de área ou fora do filtro. Não renderiza, e quem avisa é
a fusão no `app.js`, não o script: o script nunca lê o `prosa.js`, então não
tem como saber que existe texto sobrando. O aviso é um `console.warn` com os
ids, para a decisão ser sua — apagar o texto ou consertar o DevOps.

### Escopo da consulta

Todos os Epics do projeto `Ecommerce USA`, sem filtro de área no WIQL. É a
tabela Area Path → `track` do `tools/config.json` que decide a qual produto
cada um pertence. Epic cuja área não está na tabela **não é descartado**: entra com
`track` nulo, renderiza num grupo "sem produto" e é listado no relatório.
Filtrar no WIQL esconderia Epic novo; filtrar na tabela o mostra e cobra o
cadastro.

### Mapeamento campo a campo

| Campo do Radar | Origem |
|---|---|
| `id` *(novo)* | `System.Id` do Epic — chave de junção com a prosa |
| `azureTitle` | `System.Title` — assume o papel de rastreio que o campo `notion` tem hoje |
| `track` | `System.AreaPath`, via tabela Area Path → `track` em `tools/config.json` |
| `start` | `Microsoft.VSTS.Scheduling.StartDate` |
| `end` | `Microsoft.VSTS.Scheduling.TargetDate` |
| `status` | `System.State`, por mapa estado → `done` \| `doing` \| `next` em `tools/config.json` |
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
| `tools/config.json` | org, projeto, mapa de estados e tabela de áreas |

O mapa de estados e a tabela de áreas são **configuração de geração**, não de
renderização: o script resolve `status` e `track` antes de gravar, então o site
nunca vê esses nomes. Ficam em `tools/config.json` e não no `prosa.js` — ler um
global de browser a partir do Node seria contorcionismo sem ganho. Os valores
saem da rodada de descoberta, não de palpite.

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
script nunca imprime o PAT — não há mascaramento algum, e não precisa haver,
porque o valor simplesmente não passa por nenhum `console.log`/`console.error`
do script.

## Tratamento de erro — as seis guardas

1. **Nunca grava parcial.** O arquivo é montado inteiro em memória e a
   gravação em si é atômica: escreve num arquivo temporário na mesma pasta
   do destino e troca pelo destino com `rename` (atômico no mesmo sistema de
   arquivos — o arquivo final é sempre o antigo por inteiro ou o novo por
   inteiro). Isso cobre tanto falha de lógica antes da gravação quanto
   processo morto (SIGKILL, disco cheio) no meio dela: nos dois casos o
   `fatos.js` anterior fica intacto, nunca meio arquivo.
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
5. **Guarda de status vazio.** Estado fora do mapa em *alguns* itens passa
   normalmente (guarda 4, acima) — mas se **nenhum** Epic tiver status
   mapeado, isso não é dado real, é `tools/config.json` com `estados` ainda
   vazio (ferramenta desconfigurada). Gravar assim esvaziaria as três colunas
   do board na página no ar de uma vez só. `guardaStatusVazio`
   (`tools/guardas.mjs`) recusa gravar nesse caso, e — ao contrário da guarda
   de esvaziamento — nunca aceita `--forcar`: não existe um "config vazio
   real" que alguém precise publicar, só falta preencher o mapa. É a guarda
   com mais chance de ser a primeira que o operador encontra, porque
   `tools/config.json` chega com `estados` e `areas` vazios por padrão.
6. **Relatório no fim, sempre.** Contagem de Epics e demandas, itens sem
   produto (área fora da tabela de `tools/config.json`), estados não
   mapeados, Features órfãs e o que mudou desde a última rodada. O script
   nunca lê `prosa.js` — não tem como saber quais Epics ficaram sem texto
   editorial nem quais entradas de `texto` ficaram órfãs. Esses dois avisos
   são do lado do site: `fundir()`, em `app.js`, os emite como
   `console.warn` no navegador quando a página carrega. Quando o GitHub
   Action estiver ligado, este relatório substitui o olhar humano no
   `git diff`.

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
