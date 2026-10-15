# Relatório de Entregas ao vivo, por uma função na Vercel — plano

> **Para quem executar:** use superpowers:subagent-driven-development ou
> superpowers:executing-plans, tarefa por tarefa. Passos com `- [ ]`.

**Objetivo:** quem abre o link do relatório vê o DevOps de no máximo 1 minuto
atrás, sem token e sem ninguém clicar em "Publicar dados".

**Arquitetura:** uma função na Vercel (`api/relatorio.js`) guarda UM token do
DevOps como variável de ambiente, roda as mesmas consultas que o `report.js`
roda hoje no navegador do PO e devolve o MESMO pacote que o "Publicar dados"
grava em `assets/dados-*.json`. O relatório, no modo leitura, pede à função em
vez de ler o arquivo. A CDN da Vercel guarda a resposta por 60 s.

**Tecnologia:** JavaScript sem build (o mesmo do projeto), Vercel Functions em
Node (runtime padrão, Fluid Compute), `node --test`.

```
leitor ──► entregas-v2.html (Pages ou Vercel)
               │  modo leitura
               ▼
        /api/relatorio?edicao=2026-10&de=urlan   ◄── CDN da Vercel, 60 s
               │  token em AZDO_PAT (variável de ambiente)
               ▼
           Azure DevOps  ──►  pacote (o mesmo formato de dados-*.json)
```

## Restrições que valem para todas as tarefas

- **O token nunca passa pela conversa, pelo código nem pelo repositório.** Quem
  cola é o Urlan (ou o dono da conta), no painel da Vercel → Settings →
  Environment Variables → `AZDO_PAT`.
- **A função só devolve o pacote do relatório.** Nunca uma consulta livre ao
  DevOps, nunca descrição crua de PBI, nunca blocos `_` (material local).
- **O pacote é o mesmo nas duas pontas.** Uma função só monta o pacote para o
  botão Publicar dados e para a função. Duas cópias divergem.
- **Agosto/setembro não muda.** É relatório fechado; continua lendo o arquivo
  publicado.
- **O repositório `urlandesigner/Gestao-de-projetos-Ybera` é público.** Nada de
  configuração sensível em arquivo; a lista de times por PO não é segredo.
- **Os dois sites continuam iguais.** A função mora na Vercel; o site do Pages
  chama a função por CORS.
- **Comportamento sem a função:** se ela falhar (fora do ar, token vencido), o
  relatório cai no arquivo publicado, como hoje. Nunca tela branca.

---

## Fase 0 — Decisões e pré-requisitos (sem código)

| # | Decisão | Por quê | Recomendação |
|---|---|---|---|
| 0.1 | **De quem é a conta da Vercel, e em qual plano** | O plano **Hobby** da Vercel é para uso pessoal e não comercial. Ferramenta da empresa precisa de Pro ou de um time da empresa. E se a conta for pessoal, o relatório para no dia em que o dono sair. | Time Pro da Ybera/Nivello, com o Urlan como membro. |
| 0.2 | **De quem é o token** | O token precisa ver os boards das três POs. O do Urlan vence em 90 dias e para se ele sair. | Começar com o do Urlan; migrar para conta de serviço. Trocar é só trocar a variável. |
| 0.3 | **Quais times cada PO usa** | Hoje a lista de times mora no navegador de cada um (localStorage). A função precisa dela num arquivo. Sabemos só a do Urlan (`B2C` / `Squad Ecommerce`). | Perguntar à Isadora e à Daniele, ou ler da Central de cada uma. |

**Respostas do Urlan (15/10/2026):**
- **0.1** — Conta pessoal dele, no plano Hobby, **por enquanto**: o projeto está
  em teste. Se for aprovado, ele migra para um plano da empresa. (Fica o risco
  de termos do Hobby enquanto durar o teste; ver "Riscos".)
- **0.2** — Token do Urlan para começar; conta de serviço depois.
- **0.3** — As três POs usam os mesmos times: `B2C` / `Squad Ecommerce`. O
  recorte entre elas é pelo responsável dos itens, não pelo time.

---

## Fase 1 — Separar a montagem do pacote (sem mudar comportamento)

Hoje `pacoteDoDocumento()` mora dentro do `report.js`, que é código de navegador
(lê `st`, `localStorage`, DOM). A função precisa da mesma montagem no Node.

### Tarefa 1: módulo compartilhado `assets/pacote.js`

**Arquivos:**
- Criar: `assets/pacote.js` (UMD, como `core.js`: `window.CentralPacote` no
  navegador, `module.exports` no Node)
- Mudar: `assets/report.js` (`pacoteDoDocumento` passa a chamar o módulo)
- Mudar: `entregas-v2.html` e as outras páginas que carregam `report.js`
  (incluir `<script src="assets/pacote.js?v=...">` antes dele)
- Testar: `tests/pacote.test.js`

**Interface:**
```js
// Puro: recebe tudo o que precisa, não lê estado global.
CentralPacote.montar({
  B,            // módulo do briefing (entregas v2)
  C,            // core
  itens,        // st.items já filtrados pelo responsável (os "mostrados")
  todos,        // st.items.concat(st.pais)
  sprintsBrutas,// o que buscarRitmo devolveu
  resumos,      // assets/resumos.json (itens)
  roadmap,      // roadmap já resolvido da PO
  escopo,       // assinatura da capa
  mes,          // st.mes
  agora,        // instante da foto
  paraArquivo,  // true = inclui blocos locais (_descricoes, _entregas)
}) // → o mesmo objeto que pacoteDoDocumento devolve hoje
```

- [ ] Escrever o teste: com uma lista fixa de itens, `montar({...paraArquivo:false})`
  devolve `v`, `em`, `escopo`, `roadmap`, `contagens`, `sprints`, `automaticos`
  e **nenhuma** chave começando com `_`; com `paraArquivo:true`, os blocos `_`
  aparecem.
- [ ] Teste de equivalência: para os mesmos dados, o pacote do módulo é
  idêntico ao que o `report.js` montava (comparar com um pacote gravado agora,
  antes da mudança, em `tests/fixtures/pacote-outubro.json`, com `em` fixo).
- [ ] Mover o código (`ritmoAgora`, `saneRitmo`, `descricoesPendentes`,
  `automaticosAgora` e a montagem) para o módulo, recebendo por parâmetro o que
  hoje lê de `st`.
- [ ] `report.js` chama `CentralPacote.montar(...)` com o seu estado.
- [ ] `npm test` verde; no navegador (`localhost:8010/entregas-v2.html?po=1`),
  "Publicar dados" baixa um arquivo igual ao de antes (comparar com `diff`).
- [ ] Commit: `refactor: a montagem do pacote vira módulo compartilhado`.

---

## Fase 2 — A busca no DevOps sem navegador

### Tarefa 2: configuração por PO em arquivo

**Arquivos:**
- Criar: `assets/conteudo/<po>/fontes.json`, um por PO:
  ```json
  { "org": "https://dev.azure.com/nivello",
    "times": [{ "projectName": "B2C", "teamName": "Squad Ecommerce" }],
    "responsavel": "Urlan Dipre" }
  ```
- Mudar: `assets/core.js`: `saneFontes(obj)` (org só `https://dev.azure.com/…`,
  times com os dois nomes, responsável texto curto)
- Testar: `tests/fontes.test.js`

- [ ] Teste do saneador (org de outro domínio é recusada; times sem nome somem).
- [ ] Escrever os três arquivos com as respostas da Fase 0.3.
- [ ] Commit.

### Tarefa 3: buscar os itens da PO no Node

**Arquivos:**
- Criar: `api/_lib/buscar.js`. O sublinhado faz a Vercel não tratar o arquivo
  como rota.
- Testar: `tests/buscar.test.js` (com `fetch` falso)

**Interface:**
```js
buscarDaPO({ fontes, pat, periodo, fetchImpl })
// → { itens, pais, sprintsBrutas, usuario }
```
Reusa `assets/api.js` (já é UMD e recebe `fetchImpl` no contexto) e as mesmas
consultas do `carregar()` do `report.js`: `teamAreas` → `wiqlProdutos` →
`getFields` → pais → `foraDaManutencao` → ritmo (`teamIterations`,
`sprintsDoPeriodo`, ids no fim de cada sprint fechada).

- [ ] Teste com `fetch` falso que responde as rotas usadas: confere que as
  consultas saem com a área do time e que o resultado tem o formato acima.
- [ ] Teste de erro: 401 do DevOps vira `{ erro: 'token' }`, não exceção solta.
- [ ] Extrair do `report.js` o que for preciso (`buscarPais`, `buscarRitmo`)
  para funções puras em `assets/pacote.js` ou `core.js`, sem duplicar: o
  navegador passa a usar as mesmas.
- [ ] Commit.

---

## Fase 3 — A função

### Tarefa 4: `api/relatorio.js`

**Arquivos:**
- Criar: `api/relatorio.js`
- Criar: `vercel.json` só se for preciso fixar `maxDuration` (padrão 300 s
  basta)
- Testar: `tests/funcao-relatorio.test.js` (chama o handler com `Request`
  falso)

**Contrato:**
```
GET /api/relatorio?edicao=2026-10&de=urlan
200 → pacote (mesmo formato de dados-*.json), com `em` = agora
400 → edição ou PO fora da lista
502 → DevOps recusou (token vencido/sem acesso): { erro: 'devops' }
```

**Regras:**
- `edicao` só vale se estiver em `edicoesAte(hoje)`, e agosto/setembro **não**
  é servida (`400`): continua no arquivo.
- `de` só vale se existir `assets/conteudo/<de>/fontes.json`.
- Recorte pelo responsável da PO (`fontes.responsavel`), como o Publicar dados
  faz hoje com o seletor.
- `paraArquivo: false`: nenhum bloco `_` sai daqui.
- Cache: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` no mês
  corrente; `s-maxage=86400` para mês fechado (o resultado não muda mais).
- CORS: `Access-Control-Allow-Origin` só para
  `https://nivello-sistemas.github.io` e o próprio domínio da Vercel.
- Lê `resumos.json` e o roadmap da PO do próprio deploy (arquivos estáticos).

- [ ] Testes: parâmetros inválidos dão 400; edição 2026-08 dá 400; resposta 200
  sem chave `_`; cabeçalhos de cache e CORS certos; 401 do DevOps vira 502.
- [ ] Implementar.
- [ ] `.vercelignore`: conferir que `api/` **não** está excluída e que
  `assets/conteudo/` vai junto.
- [ ] Commit.

### Tarefa 5: implantar e configurar

- [ ] O Urlan cola `AZDO_PAT` no painel da Vercel (Production). Ninguém mais vê.
- [ ] Push no `urlandesigner/Gestao-de-projetos-Ybera` → a Vercel publica.
- [ ] Conferir: `curl .../api/relatorio?edicao=2026-10&de=urlan` devolve 200 e
  um pacote com `em` de agora; a segunda chamada vem do cache
  (`x-vercel-cache: HIT`).
- [ ] Conferir: `.../api/relatorio?edicao=2026-08&de=urlan` → 400.

---

## Fase 4 — O relatório passa a ler da função

### Tarefa 6: leitura ao vivo com rede de segurança

**Arquivos:**
- Mudar: `assets/report.js` (`lerDoArquivo` → `lerAoVivo`, depois arquivo)
- Mudar: `assets/briefing-entregas-v2.js` (cada edição gerada ganha
  `aoVivo: true`; agosto/setembro não)
- Testar: `tests/entregas-ritmo.test.js`

- [ ] Modo leitura, edição `aoVivo`: pede
  `https://gestao-de-projetos-ybera.vercel.app/api/relatorio?edicao=…&de=…`.
  Respondeu 200 → `aplicarPacote` + `render`. Falhou → lê o arquivo publicado,
  como hoje, e avisa no console.
- [ ] O selo vira "Mês em andamento · parcial até hoje" naturalmente (o `em` é
  agora). Nada a mudar no selo.
- [ ] Edição padrão (`resolverEdicaoPadrao`): para leitor, "tem conteúdo" passa
  a ser "a função devolveu pacote com algum cartão ou entrega", não "o arquivo
  existe". Uma pergunta por edição, da mais nova para a mais antiga, como hoje.
- [ ] Testes de fonte: a ordem é função → arquivo; agosto/setembro nunca chama
  a função.
- [ ] Verificar nos DOIS sites, sem token: outubro abre com o selo do dia, e os
  cartões automáticos refletem o board.
- [ ] Commit; "sobe para prod" (Pages + Vercel).

---

## Fase 5 — Aposentar o que ficou manual (depois de 2 semanas estável)

### Tarefa 7: sai o Publicar dados

- [ ] Remover o botão "Publicar dados", `scripts/publicar-dados.sh` e
  `scripts/aplicar-resumos.js`.
- [ ] **Os resumos de PBI nova não podem sumir junto.** Hoje quem diz "estas
  PBIs não têm linha" é o bloco `_descricoes` do pacote baixado. Ele vira um
  botão só do PO, **"Resumos pendentes"**, que baixa só esse bloco. O PO pede
  "gera os resumos", o Claude escreve no `resumos.json`, e o deploy leva. Sem
  isso, PBI nova aparece só com o título, o que é a verdade, mas pior de ler.
- [ ] Manter os `dados-*.json` existentes como rede de segurança da Tarefa 6
  (não apagar).
- [ ] Atualizar `comecar.html` e a memória do projeto.

---

## Riscos que ficam

- **Token vence.** A cada 90 dias com o do Urlan. A função devolve 502, o
  relatório cai no último arquivo publicado (com a data dele no selo), e o
  Urlan recebe o aviso no console. Conta de serviço resolve.
- **Plano da Vercel.** No Hobby, uso comercial fere os termos (ver 0.1).
- **Limite do DevOps.** Com 60 s de cache por (edição, PO), o pior caso são
  ~3 consultas por minuto por PO. Fica bem abaixo do limite.
- **Dado público.** Igual a hoje: quem tem o endereço vê o relatório. A função
  não abre nada além do que o arquivo publicado já mostra.
- **Central continua com token por PO.** Tirar o token da Central é outro
  projeto, porque exige login na frente (o backlog inteiro não pode ficar
  aberto).
