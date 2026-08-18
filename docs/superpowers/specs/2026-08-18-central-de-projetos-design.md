# Central de Projetos — Design

**Data:** 2026-08-18
**Status:** aprovado em conversa; aguardando revisão do spec escrito
**Pasta:** `Ecommerce USA/Gestão de projetos/`

## Problema

O Urlan gerencia demandas no Azure DevOps, mas a visão de lá é geral — todos os projetos da empresa, inclusive os que não são dele. Ele perde tempo navegando até os boards dos projetos que gerencia. Precisa de uma área própria com acesso imediato a cada projeto seu (que possui Epics, Features e PBIs) e um retrato rápido da situação de cada um sem precisar entrar no DevOps.

## Solução

Página local autocontida (mesmo padrão do Radar de Projetos USA): abre no navegador, guarda configuração e token no `localStorage`, fala direto com a API REST do Azure DevOps. Funciona como hub de atalhos mesmo sem token — os dados vivos são camada por cima, nunca bloqueio.

**Decisões tomadas com o usuário:**
- Escopo: atalhos + dados vivos (não é réplica completa dos boards)
- Formato: página local, como o Radar (não publicada na web)
- Dados vivos: contagens por estado, sprint atual, itens atribuídos a mim (atividade recente ficou de fora)
- Atalhos por projeto: Board, Backlog, Sprints, Queries/Dashboards (todos os quatro)
- Estrutura do DevOps desconhecida pelo usuário → a página descobre via API e ele marca o que é dele

## Estrutura de arquivos

```
Gestão de projetos/
├── index.html          ← a central
├── assets/
│   ├── style.css
│   └── app.js
└── docs/superpowers/specs/   ← este documento
```

Sem `data.js` — dados vêm da API. Nenhum segredo em arquivo ou git: organização, PAT e seleção de projetos vivem no `localStorage`.

## Layout

**Topo:** título + selo de conexão (`conectado` / `token vencido` / `sem token`) + botão atualizar + engrenagem (configurações).

**Seção "Meus itens"** (primeira): work items com `AssignedTo = @Me` em todos os projetos selecionados, excluídos estados terminais (`Done`, `Closed`, `Removed`, `Completed`). Agrupados por estado; cada item clicável, abrindo `_workitems/edit/{id}` no DevOps.

**Grade de cartões**, um por projeto selecionado:
- Nome do projeto/time
- **5 atalhos** (links profundos):
  - Board → `https://dev.azure.com/{org}/{project}/_boards/board/t/{team}/`
  - Backlog → `https://dev.azure.com/{org}/{project}/_backlogs/backlog/{team}/`
  - Sprints → `https://dev.azure.com/{org}/{project}/_sprints/taskboard/{team}/` (redireciona pra sprint corrente)
  - Queries → `https://dev.azure.com/{org}/{project}/_queries`
  - Dashboards → `https://dev.azure.com/{org}/{project}/_dashboards`
- **Contagens por estado**, separadas por nível (Epics / Features / PBIs), como chips: `2 New · 5 Active · 12 Done`
- **Sprint atual:** nome, datas, progresso `7/12 concluídos`, linkando pro taskboard

**Responsivo:** desktop com grade de 2–3 colunas; celular com cartões empilhados e atalhos como botões grandes. Desktop e celular são os contextos prioritários (como no Radar).

**Estética:** ecoa o Radar (editorial executivo — serifa de sistema nas manchetes, washes discretos) pra parecerem família, sem copiar literal.

## Configuração e onboarding

**Primeira abertura — assistente em 3 passos:**
1. Colar URL da organização (`dev.azure.com/SUA-ORG`) e um PAT. A tela ensina a gerar o PAT com escopos mínimos de leitura: **Work Items (Read)** + **Project and Team (Read)**.
2. A página lista projetos e times da organização via API.
3. O usuário marca os que são dele → salva e vira a central.

**Engrenagem:** trocar PAT, refazer descoberta, reordenar/ocultar projetos, exportar/importar configuração como JSON (sem o PAT — o token nunca sai do `localStorage` nem entra no export).

**Esquema do `localStorage`:**
```
central.config  → { org, projects: [{ projectId, projectName, teamId, teamName, order, hidden }], updatedAt }
central.pat     → string (chave separada, nunca exportada)
central.cache   → { porProjeto: {...}, meusItens: [...], fetchedAt }
```

## Dados e API

API REST 7.1 do Azure DevOps, direto do navegador. Autenticação: `Authorization: Basic base64(":" + PAT)`.

| Dado | Endpoint / método |
|---|---|
| Projetos | `GET /_apis/projects?api-version=7.1` |
| Times | `GET /_apis/projects/{id}/teams?api-version=7.1` |
| Contagens | `POST /{project}/{team}/_apis/wit/wiql` com WIQL; depois `POST /_apis/wit/workitemsbatch` (lotes de 200) pra pegar `System.WorkItemType` + `System.State` e contar no cliente |
| Sprint atual | `GET /{project}/{team}/_apis/work/teamsettings/iterations?$timeframe=current` → `GET .../iterations/{id}/workitems` |
| Meus itens | WIQL com `[System.AssignedTo] = @Me` por projeto, resultados mesclados |

**WIQL das contagens** usa categorias em vez de nomes de tipo — funciona em qualquer template de processo (Scrum: PBI; Agile: User Story):
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.TeamProject] = @project
  AND ([System.WorkItemType] IN GROUP 'Microsoft.EpicCategory'
    OR [System.WorkItemType] IN GROUP 'Microsoft.FeatureCategory'
    OR [System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory')
  AND [System.State] <> 'Removed'
```

**Decisão de volume:** estados não-terminais contam por inteiro; itens concluídos contam só os alterados nos últimos 30 dias, rotulados `Done (30d)`. Evita varrer anos de histórico a cada abertura e mantém a página rápida.

**Cache:** ao abrir, mostra o cache na hora e atualiza por trás se `fetchedAt` > 10 min. Botão de atualizar força na hora. Cache por projeto — falha em um não invalida os outros.

## Erros e degradação

| Situação | Comportamento |
|---|---|
| Sem token / 401 | Cartões e atalhos firmes; áreas vivas viram traço com aviso "renove o token" e link pra engrenagem |
| Falha num projeto | Só aquele cartão mostra chip de erro; os demais seguem |
| CORS via `file://` | Detecta o erro de rede e mostra instrução de servir a pasta (`python3 -m http.server`), como no Radar |
| Cache velho + API fora | Mostra os dados com carimbo "atualizado há X" em destaque |

## Verificação

Manual, com PAT real:
1. Onboarding do zero (localStorage limpo) até a central montada
2. Contagens conferidas contra o DevOps em pelo menos 2 projetos
3. Todos os atalhos clicados — cada um abre no lugar certo
4. "Meus itens" bate com a query `@Me` do DevOps
5. Sem token e com token inválido: página segue útil como hub
6. Celular (viewport estreito): cartões empilhados, botões alcançáveis
7. Export/import de configuração entre dois navegadores

## Fora de escopo

- Escrever no DevOps (mover cartões, editar itens) — a central é somente leitura
- Atividade recente / feed de mudanças (descartado na conversa)
- Publicação na web, backend, multiusuário
- Sincronização com o Radar de Projetos USA (são ferramentas irmãs, dados independentes)
