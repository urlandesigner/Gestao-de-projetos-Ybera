# Editor por PO — plano técnico

**Objetivo:** cada PO escreve o roadmap e o relatório dela dentro da Central e
publica sozinha, com o token de GitHub dela. Sem terminal, sem arquivo JSON,
sem passar pelo Urlan.

**Decisão que originou este plano (13/10/2026):** "esse projeto da central de
projetos é para uso e administração dos POs, cada um vai preparar seu próprio
relatório e roadmap". E, sobre a credencial: token de cada uma, não um token do
Urlan compartilhado — servidor fica para depois, se o passo virar peso.

---

## As três decisões de arquitetura

### 1. Um arquivo por PO, nunca um arquivo com todas

Hoje o `assets/roadmap.json` guarda as três num arquivo só (bloco por pessoa).
Isso sobrevive enquanto quem escreve é uma pessoa. Com três publicando, dois
problemas aparecem no mesmo dia:

- **Atualização perdida.** A API do GitHub exige o SHA do arquivo atual para
  gravar por cima. Duas POs editando o mesmo arquivo: a segunda chega com SHA
  velho, toma 409, e a saída "recarregar e tentar de novo" é onde o conteúdo de
  alguém some sem ninguém ver.
- **Alcance.** Escrever no arquivo de todas é poder apagar o de todas.

Um arquivo por pessoa elimina os dois por construção, não por cuidado.

### 2. O conteúdo mora num repositório próprio

Hoje tudo vive em `Nivello-Sistemas/ideias-e-inovacao`, junto com Portal Ybera,
Kaizen, Portal de Design e outros cinco projetos. Dar escrita a três pessoas ali
dá acesso ao que não é delas — e um token de escopo fino do GitHub não sabe
restringir por pasta.

Proposta: `Nivello-Sistemas/central-de-projetos-conteudo`, **público**, só com
os dados. O app continua publicado onde está, e **as URLs já compartilhadas não
mudam** — inclusive o bit.ly que já circula.

Público porque quem lê o relatório não tem token: `raw.githubusercontent.com`
serve repositório público com `Access-Control-Allow-Origin: *`, e privado exige
credencial para ler. O conteúdo já é público hoje, pelo Pages; muda a caixa, não
a exposição.

### 3. O editor não começa do zero

É isso que separa "fácil" de "mais um formulário". A tela de nova edição já
chega com o que o board da PO fechou no período — `entregasConcluidas` e o
ritmo das sprints já existem e já fazem essa conta. O trabalho dela vira
revisar e escrever o texto de negócio, que é a única parte que máquina nenhuma
faz.

---

## Estrutura dos dados

```
central-de-projetos-conteudo/
  urlan/
    roadmap.json
    edicoes/2026-10.json
    imagens/2026-10/<frente>/<arquivo>.jpg
  isadora/
  daniele/
```

`<po>/roadmap.json` — o que hoje é o bloco dela dentro do arquivo único:

```json
{ "atualizadoEm": "2026-10-13",
  "itens": [ { "titulo": "Nova PDP", "inicio": "2026-07-01", "fim": "2026-08-31", "status": "concluido" } ] }
```

`<po>/edicoes/<AAAA-MM>.json` — a edição do relatório. Os campos são os mesmos
que hoje são escritos à mão no JavaScript, sem invenção:

```json
{ "periodo": ["2026-10"],
  "publicadoEm": "2026-10-13T20:10:00Z",
  "cartoes": [
    { "titulo": "...", "iniciativa": "...", "produto": "...", "status": "entregue",
      "epicoId": 49290, "featureIds": [45272], "contaFixa": null, "foraDoRoadmap": false,
      "resumo": ["...", { "nota": "..." }],
      "pasta": "imagens/2026-10/nova-homepage", "imagens": [ { "arquivo": "banner.jpg", "legenda": "Banner" } ],
      "link": { "href": "...", "rotulo": "..." },
      "progresso": { "feito": 17, "total": 18, "rotulo": "itens concluídos" } } ] }
```

O saneamento é o mesmo portão do roadmap: campo fora do vocabulário vira null,
nunca classe de CSS escrita por quem editou o arquivo.

---

## Etapas

Cada uma entrega algo que funciona sozinho. A ordem não é de tamanho: é a que
prova o caminho inteiro mais cedo.

### Etapa A — o conteúdo sai do código

Sem editor e sem GitHub ainda. Só tirar os cartões do `.js` e pôr nos arquivos
por PO, com o app lendo de lá.

- `assets/briefing-entregas.js` e `-v2.js` deixam de carregar `ENTREGAS_POR_PO`;
  a lista chega como dado.
- Leitor novo em `core.js`: busca `<po>/roadmap.json` e `<po>/edicoes/<mês>.json`,
  saneia, devolve. Mesma régua de chave de pessoa (`chaveDePessoa`).
- **Enquanto o repositório de conteúdo não existir, lê os arquivos locais** —
  assim esta etapa sobe sem depender da etapa B.
- Prova: as duas edições publicadas (ago/set e outubro) renderizam **idênticas**
  ao que estão hoje. Teste compara o HTML antes e depois.

### Etapa B — o trilho de publicação, provado no roadmap

A menor coisa que exercita o caminho inteiro: token, escrita, leitura, cache.

- Campo de token do GitHub no assistente, ao lado do token do DevOps. Guardado
  em `central.github`, no localStorage. **Nunca** entra em link, em export de
  config, nem em arquivo publicado — mesma regra do PAT do DevOps.
- Tela de edição do roadmap: linha por projeto (nome, início, fim, status).
- Botão **Publicar**: `PUT /repos/{org}/{repo}/contents/{po}/roadmap.json`, com
  o SHA lido na hora. 409 vira mensagem que diz o que aconteceu, não "erro".
- Leitura passa a vir do repositório de conteúdo, com `?t=` para furar o cache
  de 5 min do `raw`.
- Prova: a Isadora escreve dois projetos, publica, e eles aparecem na Central
  dela e no documento dela — sem ninguém tocar em terminal.

### Etapa C — o editor do relatório

- Aba **Relatório** → **Nova edição** → escolhe o período.
- A tela chega preenchida com o que o board dela fechou no período. Cada item
  vira um cartão candidato: ela marca, renomeia para linguagem de negócio,
  escolhe o projeto do roadmap e escreve o texto.
- **Pré-visualizar** desenha com o mesmo `htmlReport` do documento final — não
  uma aproximação.
- **Publicar** grava `<po>/edicoes/<mês>.json` e devolve o endereço fixo dela.

### Etapa D — imagens

- Arrastar para o cartão. Redimensiona e converte para JPEG no navegador (hoje
  os originais são PNG de 13MB e entram a 1600px, ~100KB cada — a conversão é a
  mesma, feita na máquina dela em vez da sua).
- Sobe uma a uma pela API, em base64, para `<po>/imagens/<mês>/<frente>/`.
- Por último de propósito: é a parte mais pesada, e as três anteriores já
  deixam as POs operando.

---

## O que precisa de decisão ou ação do Urlan

1. **Criar o repositório** `Nivello-Sistemas/central-de-projetos-conteudo`,
   público, e dar escrita à Isadora e à Daniele. (Posso criar, com o seu ok.)
2. **Despublicar** — pensar junto antes da etapa C: voltar à edição anterior é
   recommitar o conteúdo anterior, e o histórico do git já guarda. Barato se for
   desenhado agora, caro se for depois.

## O que este plano não resolve

- **Token do GitHub vence**, como o do DevOps. A Central avisa antes, igual já
  faz com o outro. Não há como evitar sem servidor.
- **Conflito entre POs** deixa de existir por construção (um arquivo por
  pessoa), mas duas abas da MESMA pessoa ainda podem brigar. O 409 cobre.
- **Revisão** — ninguém aprova o que a outra publica. Se um dia precisar, o
  caminho é Pull Request em vez de escrita direta, e aí o plano muda de forma.
