/* ==========================================================================
   TEXTO EDITORIAL DO RADAR — o que sobrou de escrito à mão depois que nome
   de produto, "O essencial" e o trimestre viraram cálculo do sync (ver
   fatos.js). O que resta aqui é só o que o Azure DevOps genuinamente não
   tem como saber: identidade da página (org, título, dono, contato) e o
   texto por item em `texto`, abaixo — mais `asks` e `reports`, os dois
   mecanismos que continuam vazios de propósito (ver os comentários deles).
   A outra metade — fato — vem do Azure DevOps e mora em fatos.js, ao lado
   deste; fundir(), em app.js, junta os dois na hora de carregar a página.

   ATENÇÃO: o arquivo antigo "Radar de Projetos USA.html" (versão de página
   única, autocontida) está CONGELADO — carrega sua própria cópia embutida
   dos dados, no formato de antes da integração com o DevOps (com os campos
   `notion`, `start`, `status`, que não têm equivalente aqui), e não é mais
   mantido em conjunto com este arquivo.
   ==========================================================================
   1) DADOS
   --------------------------------------------------------------------------
   ESTE ARQUIVO É A METADE EDITORIAL do Radar, não a fonte inteira. A outra
   metade — fato (janela, status, produto, dono, entrega, demandas) E TAMBÉM,
   desde esta mudança, nome de produto, "O essencial" e o trimestre em curso —
   vem do Azure DevOps, é gerada por `tools/sync.mjs` e mora em `fatos.js`, ao
   lado deste. `fundir()`, em `app.js`, junta os dois na hora de carregar a
   página. NÃO edite `fatos.js` à mão — ele é sobrescrito a cada rodada do
   script.

   `PROSA.tracks` e `PROSA.summary` NÃO EXISTEM MAIS. Nome de produto vinha
   daqui como um slug e uma descrição inventados à mão (`{id:"club",
   name:"Loja Clube USA", about:{...}}`); agora o produto de cada item é o
   próprio id do Epic pai no Azure DevOps, e o nome é o título desse Epic —
   os dois vêm prontos em `fatos.js` → `produtos`. "O essencial" (as três
   linhas do topo do Panorama) era reescrito à mão a cada edição; agora é
   calculado dos itens por `tools/resumo.mjs` e vem pronto em `fatos.js` →
   `resumo`. Nenhum dos dois se edita mais em lugar nenhum — se o nome de um
   produto estiver errado, corrija o título do Epic no Azure DevOps.

   O ÍNDICE de `texto` (a seção 3, abaixo) é o `id` numérico do work item
   (Epic) no Azure DevOps — não mais um número sequencial inventado aqui.
   Isso significa que você não pode simplesmente "adicionar o próximo item":
   o id só existe depois que o Epic existe no DevOps e uma rodada do
   `tools/sync.mjs` o traz para `fatos.js`.

   CAMPOS QUE VIVEM AQUI (você escreve, à mão):
     title:{pt,en}     → o que o usuário passa a conseguir fazer. Vira o h4
                         do card e o título do acordeão em Produtos.
     why:{pt,en}       → uma frase de impacto no negócio. Sem ela, o card
                         fica com a linha "por quê" vazia — escreva sempre.
     about:{pt,en}     → parágrafo "sobre o que se trata", na seção Produtos
                         em detalhe.
     result:{pt,en}    → opcional. O que mudou no negócio depois de entregar
                         (ex.: "No ar desde mai/26; conversão medida até
                         30/09"). É o que transforma entrega em programa;
                         pode ficar vazio até ter número.
     health:"watch"    → opcional, e é o ÚNICO valor de `health` que se
                         escreve aqui. "blocked" (travado) vem do Azure
                         DevOps sempre que o item está com o estado de
                         impedimento — não se escreve à mão. "watch" (em
                         atenção) não tem sinal equivalente no DevOps, então
                         continua sendo você quem liga e desliga esse alerta.
                         Se os dois existirem para o mesmo item, o fato do
                         DevOps (blocked) prevalece sobre o seu "watch" — um
                         impedimento real supera uma nota manual desatualizada.
     healthNote:{pt,en}→ por que está em atenção. Obrigatório na prática se
                         usar `health:"watch"` — sem o motivo o stakeholder
                         não tem o que fazer com o alerta.

   CAMPOS GERADOS, que NÃO se escreve aqui (vêm de fatos.js via fundir()):
     start, end        → StartDate/TargetDate do Epic no Azure DevOps. Podem
                         vir `null` quando o campo está vazio lá — a página
                         trata isso mostrando "—" em vez de quebrar.
     status            → "done" | "doing" | "next" | null, mapeado do estado
                         do DevOps por `tools/config.json` → `estados`.
     track             → o id do Epic pai (System.Parent) do work item, como
                         string — não mais um slug. Só existe quando esse
                         Epic está na lista `tools/config.json` → `produtos`;
                         o nome exibido vem de `fatos.js` → `produtos`, que
                         casa por este mesmo id.
     owner             → System.AssignedTo do Epic. Sem override editorial:
                         se o dono no DevOps mudar, o Radar segue sozinho.
     shipped           → mês da ClosedDate, só quando status é "done".
     demands           → as Features filhas do Epic, com o mesmo tratamento
                         de status. A lista já vem ordenada por id.
     health:"blocked"  → ver acima.

   Item com fato no Azure DevOps e SEM entrada aqui em `texto` aparece assim
   mesmo — com o título cru do DevOps, why/about vazios e um selo "sem
   redação" no card, no acordeão e na tabela. Ele não some: sumir em
   silêncio seria pior, porque falta não se percebe. Entrada em `texto` sem
   Epic correspondente (o Epic saiu do filtro, foi apagado, mudou de área)
   também não quebra a página — vira um `console.warn` no navegador.

   "PRECISAMOS DE VOCÊS" (`asks`, adiante) É E CONTINUA SENDO ESCRITO À MÃO.
   Nenhuma ferramenta em tools/ produz ou lê esse campo — fundir(), em
   app.js, o pega direto daqui; sync.mjs nunca escreve nele, porque o Azure
   DevOps não tem um conceito de "decisão pendente de fora do time" para
   extrair. Preencha uma entrada quando houver algo parado esperando decisão
   ou ação de fora do time de produto; deixe `[]` quando não houver nenhuma.

   --------------------------------------------------------------------------
   `meta.updated` É MACHINE-SET: `fundir()` o sobrescreve com a data da
   última rodada do `tools/sync.mjs` (o `geradoEm` de `fatos.js`) sempre que
   esse arquivo existe — não há valor de reserva escrito aqui, porque não há
   mais "meta" editorial de janela nenhuma para servir de reserva (ver
   abaixo). `meta.quarter` (trimestre em curso, usado no medidor e nas
   faixas do Futuro) também é MACHINE-SET, e nem aparece mais neste arquivo:
   vem inteiro de `fatos.js`, calculado por `tools/trimestre.mjs` a partir da
   data em que o sync roda — não escreva `quarter` aqui, `fundir()` não olha.

   `meta.cycle`, `meta.from`, `meta.to` e `meta.next` NÃO EXISTEM MAIS. Eles
   descreviam uma "edição quinzenal" do Radar — uma janela que alguém
   declarava por escrito a cada revisão. Essa edição parou de existir: a
   página passou a espelhar o Azure DevOps continuamente, sem quinzena
   nenhuma para abrir ou fechar, então não havia mais o que esses quatro
   campos descrevessem. Não recrie nenhum deles.

   --------------------------------------------------------------------------
   PARA ESCREVER A ENTRADA DE UM EPIC NOVO: ele vai aparecer no Radar com o
   selo "sem redação" assim que uma rodada do `tools/sync.mjs` o trouxer para
   `fatos.js`. Abra `fatos.js`, ache o item pelo `azureTitle` (o título cru
   do DevOps) e copie o `id` numérico dele para uma chave nova em `texto`,
   abaixo. Escreva pelo menos `title`, `why` e `about`.

   PARA CORRIGIR UMA ENTRADA EXISTENTE: ache a chave pelo `id` (o comentário
   "Notion: ..." ao lado de cada entrada é rastro histórico do levantamento
   original, útil para achar o item certo por nome) e edite os campos
   direto. Não mexa em `start`, `end`, `status`, `track`, `owner`,
   `shipped` ou `demands` aqui — eles não existem neste arquivo, e escrevê-los
   não tem efeito nenhum: quem manda é `fatos.js`.

   Depois de editar, recarregue a página e olhe o console do navegador: um
   `console.warn` ali aponta prosa órfã (chave sem Epic correspondente) ou
   `track` desconhecido — os dois jeitos de um erro de digitação aqui virar
   um item sumido em silêncio, se ninguém checar.
   ========================================================================== */
const PROSA = {
  meta:{
    org:"Ybera Group · Ecommerce & Growth",
    title:{pt:"Radar de Projetos — USA", en:"Project Radar — USA"},
    /* rótulo curto para a barra de navegação, onde o título inteiro quebraria */
    shortTitle:{pt:"Radar USA", en:"USA Radar"},
    sub:{
      pt:"Os projetos da frente USA: o que está em curso, o que está planejado e em que ordem. Espelha o Azure DevOps a cada sincronização.",
      en:"The projects on the USA front: what's in flight, what's planned and in what order. Mirrors Azure DevOps at each sync."
    },
    /* `updated` é MACHINE-SET: fundir() o sobrescreve com o geradoEm da
       última rodada do sync sempre que fatos.js existe. O valor abaixo só
       importa antes da primeira rodada — não há mais janela editorial
       (`cycle`/`from`/`to`/`next`) para servir de contexto a ele: a página
       parou de ter "edição" e passou a espelhar o DevOps continuamente. */
    updated:"2026-08-21",
    /* Dono padrão de todos os itens USA. Um card pode sobrescrever com `owner`. */
    owner:"Urlan Dipré",
    ownerRole:{pt:"Product Owner · USA", en:"Product Owner · USA"},
    /* Contato de uma tecla no rodapé. `href` aceita mailto: ou link de Slack;
       `address` é o que aparece na versão impressa, onde link não clica. */
    contact:{
      href:"mailto:urlan.dipre@ybera.com?subject=Radar%20de%20Projetos%20USA",
      address:"urlan.dipre@ybera.com"
    },
    /* URL estável da página. Preencha quando estiver hospedada: aparece no
       rodapé e na versão impressa, para quem recebe o PDF voltar à página viva. */
    url:""
    /* `quarter` NÃO EXISTE MAIS AQUI. O trimestre em curso é calendário puro
       (Q1 jan-mar, Q2 abr-jun, ...) — não pede decisão editorial nenhuma, só
       a data de hoje — e passou a ser calculado por tools/trimestre.mjs a
       cada rodada do sync, chegando pronto em fatos.js → quarter. */
  },

  /* `tracks` NÃO EXISTE MAIS AQUI. Produto (antes uma lista escrita à mão
     com slug + nome + descrição) virou o próprio Epic pai no Azure DevOps:
     id e nome vêm prontos em fatos.js → produtos, buscados pelo sync a cada
     rodada. Produto não tem mais descrição (`about`) — o Azure DevOps não
     tem esse campo preenchido para Epic, e inventar uma aqui voltaria a ser
     o mesmo texto à mão que esta mudança removeu. Se o nome de um produto
     estiver errado ou faltando, o lugar de corrigir é o título do Epic no
     Azure DevOps, não este arquivo. */

  /* `summary` ("O essencial") NÃO EXISTE MAIS AQUI. As três linhas fixas do
     topo do Panorama — Projetos, Entregas, Atenção — eram reescritas à mão a
     cada edição quinzenal; agora são calculadas dos itens por
     tools/resumo.mjs a cada rodada do sync, e chegam prontas em
     fatos.js → resumo. Não escreva `summary` aqui — fundir() não olha mais
     para PROSA.summary, só para RADAR_FATOS.resumo. */

  /* PENDÊNCIAS ("asks") — cumpre o que a linha "Atenção" do essencial
     (calculada, ver acima) NÃO cobre: aquele número conta só impedimento
     vindo do próprio Azure DevOps ("blocked"), nunca uma decisão parada fora
     do time de produto — o DevOps não tem esse conceito para extrair. É
     aqui, e só aqui, que esse tipo de pendência aparece, "com nome do
     decisor e prazo". Assim como `texto`, mais abaixo, é 100% editorial —
     nenhuma ferramenta em tools/ lê ou escreve este campo, porque o Azure
     DevOps não tem um conceito de "decisão pendente de fora do time" para
     extrair (ver o aviso no topo deste arquivo). app.js só CONTA o tamanho
     deste array para os tiles e o badge da navegação; a forma de cada
     entrada é definida aqui, não lá.

     Cada entrada:
       what:{pt,en}    → o que está parado. Obrigatório — vira o título do
                         cartão, do mesmo jeito que `title` vira o h4 do
                         cartão de um projeto.
       who:"Nome"      → quem precisa decidir. Obrigatório. String simples,
                         não bilíngue — nome próprio não se traduz.
       by:"AAAA-MM-DD" → opcional, em ISO. Quando essa data já passou de
                         `meta.updated` (o "hoje" que o Radar usa), o cartão
                         ganha o mesmo selo vermelho que o resto da página já
                         usa para impedimento ("blocked") — um prazo
                         estourado é a informação mais importante desta
                         página, e por isso pega emprestada a cor mais forte
                         que o Radar já tem, em vez de inventar uma nova.
       impact:{pt,en}  → opcional. O que acontece se ninguém decidir a
                         tempo — é o que transforma "está parado" em "por
                         que isso importa" para quem só tem um minuto.
       item:47688      → opcional. O `id` do work item afetado (a mesma
                         chave numérica de `texto`, mais abaixo). Quando
                         presente, o cartão mostra a que projeto a pendência
                         se refere usando o título EDITORIAL dele (o mesmo
                         que aparece no board) — nunca o título cru do Azure
                         DevOps, que quem lê esta página não abriu.

     Exemplo preenchido (ilustrativo — não é pendência real):
       {what:{pt:"Aprovar o novo domínio da loja USA",
              en:"Approve the new US store domain"},
        who:"Fernanda (Jurídico)",
        by:"2026-09-05",
        impact:{pt:"Sem o domínio aprovado, a nova home não pode ir ao ar.",
                en:"Without the approved domain, the new homepage can't go live."},
        item:4}

     Vazio: a base não registra decisões nem riscos. Ver estado vazio. */
  asks:[],

  /* NÃO HÁ MAIS BLOCO "O QUE MUDOU".
     A página que listava o movimento da quinzena foi removida: no nível de
     projeto (1 a 4 meses) quase nada muda em duas semanas. O Azure DevOps
     hoje registra conclusão com data (`shipped`, `ClosedDate`), e é isso que
     alimenta a linha "Entregas" de "O essencial" (fatos.js → resumo,
     calculada por tools/resumo.mjs) e a página Report mensal — nenhuma das
     duas é este bloco, e nenhuma é escrita à mão. */

  /* REPORT MENSAL — a parte escrita à mão.
     O que a base sabe (entrega com `shipped`, demanda com `done`) é derivado
     sozinho; aqui entra só o que ela não sabe: o parágrafo do mês e os itens
     concluídos que não estão registrados no Notion.
     Enquanto a coluna Status não tiver nenhum "Concluído", `extra` é o que dá
     corpo ao report — sem ele a página fica no estado vazio.
     Um mês não precisa existir aqui para aparecer: se houver entrega ou
     demanda concluída naquele mês, o bloco do mês é criado do mesmo jeito.
     Cada registro:
       {m:"AAAA-MM",                     ← obrigatório, é a chave do mês
        summary:{pt:"...", en:"..."},    ← opcional: o parágrafo do mês
        extra:[{t:{pt:"...", en:"..."}}] ← opcional: concluído fora do Notion
       }
     Registro sem `m` bem formado é ignorado. */
  reports:[],


  /* TEXTO EDITORIAL, indexado pelo id do work item no Azure DevOps.
     É o único lugar onde se escreve à mão. Os fatos (estado, janela, produto,
     dono, conclusão) vêm do fatos.js, gerado por tools/sync.mjs.
     Item que existe no DevOps e não tem entrada aqui aparece no Radar com o
     título cru e um marcador de "sem redação" — some em silêncio seria pior. */
  texto:{
    /* VAZIO DE PROPÓSITO. As 14 entradas antigas estavam presas aos ids
       provisórios 1..14, que nenhum work item real tem — sobreviveriam só
       como prosa órfã. Elas continuam recuperáveis no histórico do git.

       Enquanto isto está vazio, cada cartão aparece com o título cru do
       Azure DevOps e o selo "sem redação". Para melhorar um cartão, ache o
       id dele em fatos.js e escreva a entrada:

         48588:{title:{pt:"Loja USA em conformidade com as políticas do Google",
                       en:"US store compliant with Google policies"},
                why:{pt:"Sem conformidade, os anúncios ficam expostos a reprovação.",
                     en:"Without compliance, ads are exposed to disapproval."}}

       Não é preciso escrever todos. Cada um que você escrever troca um título
       de ticket por uma frase que um stakeholder entende. */
  },

};
