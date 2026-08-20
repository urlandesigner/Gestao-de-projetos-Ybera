/* ==========================================================================
   TEXTO EDITORIAL DO RADAR — a METADE editorial das páginas (index, board,
   pendencias, produtos, produtos-tabela, report, horizonte, completo), não a
   fonte inteira. A outra metade — fato — vem do Azure DevOps e mora em
   fatos.js, ao lado deste; fundir(), em app.js, junta os dois na hora de
   carregar a página. É ESTE arquivo que se edita na revisão quinzenal.

   ATENÇÃO: o arquivo antigo "Radar de Projetos USA.html" (versão de página
   única, autocontida) está CONGELADO — carrega sua própria cópia embutida
   dos dados, no formato de antes da integração com o DevOps (com os campos
   `notion`, `start`, `status`, que não têm equivalente aqui), e não é mais
   mantido em conjunto com este arquivo.
   ==========================================================================
   1) DADOS
   --------------------------------------------------------------------------
   ESTE ARQUIVO É A METADE EDITORIAL do Radar, não a fonte inteira. A outra
   metade — fato (janela, status, produto, dono, entrega, demandas) — vem do
   Azure DevOps, é gerada por `tools/sync.mjs` e mora em `fatos.js`, ao lado
   deste. `fundir()`, em `app.js`, junta os dois na hora de carregar a página.
   NÃO edite `fatos.js` à mão — ele é sobrescrito a cada rodada do script.

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
     track             → produto (ver seção 2, `tracks`), mapeado da Area
                         Path do DevOps por `tools/config.json` → `areas`.
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
   `meta.updated` (seção 2, abaixo) É MACHINE-SET: `fundir()` o sobrescreve
   com a data da última rodada do `tools/sync.mjs` (o `geradoEm` de
   `fatos.js`) sempre que esse arquivo existe. O valor escrito aqui só serve
   de reserva para quando `fatos.js` ainda não foi gerado. `cycle`, `from` e
   `to`, por outro lado, continuam 100% editoriais — são a janela que VOCÊ
   decide que esta edição cobre, não algo que o DevOps sabe calcular.

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
    /* `cycle`, `from`, `to` e `next` são EDITORIAIS: a janela que você declara
       que esta edição cobre. Não são derivados do DevOps, porque o DevOps não
       tem o conceito de "edição do Radar". `updated` é o único machine-set —
       fundir() o sobrescreve com o geradoEm da última rodada do sync. */
    cycle:{pt:"Espelho do Azure DevOps", en:"Mirror of Azure DevOps"},
    from:"2026-08-01", to:"2026-08-21",
    updated:"2026-08-21",
    next:"2026-09-04",
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
    url:"",
    /* Trimestre em curso: os contadores são DERIVADOS dos itens com prazo
       (`end`) até esta data. Não há número digitado aqui. */
    quarter:{label:"Q3 2026", start:"2026-07-01", end:"2026-09-30"}
  },

  /* Trilhas = coluna "Produto" do Notion */
  /* PRODUTOS = coluna "Produto" do Notion. É o nível de cima da página
     Produtos: cada projeto abaixo aponta para um `track` e aparece dentro do
     produto correspondente. `about` é a descrição do produto — escrita por
     você, não vem da base. Produto sem nenhum projeto não é renderizado. */
  tracks:[
    {id:"club",       name:"Loja Clube USA",
     about:{pt:"A loja onde o consumidor americano compra. Concentra o essencial da operação USA — conformidade, página de produto, home, tradução, tema, assinatura e fidelidade — e é onde o tráfego pago aterriza.",
            en:"The store where the American consumer buys. It concentrates the core of the US operation — compliance, product page, homepage, translation, theme, subscription and loyalty — and it's where paid traffic lands."}},
    {id:"interna",    name:{pt:"Loja Interna USA", en:"US Internal Store"},
     about:{pt:"Canal interno da operação americana, com regra própria de preço e de acesso, separado da loja do consumidor final.",
            en:"The US operation's internal channel, with its own pricing and access rules, separate from the consumer store."}},
    {id:"influencer", name:{pt:"Loja da Influencer", en:"Influencer Store"},
     about:{pt:"Vitrine própria de cada influencer parceira: curadoria dela, link único para as redes e venda rastreável.",
            en:"A storefront of their own for each partner influencer: their curation, a single link for social bios and trackable sales."}},
    {id:"reviews",    name:"Ybera Reviews",
     about:{pt:"Avaliação de clientes como produto próprio — coleta, moderação e exibição sob controle da Ybera, sem depender de app de terceiro.",
            en:"Customer reviews as an in-house product — collection, moderation and display under Ybera's control, with no third-party app."}},
    {id:"ia",         name:{pt:"Quiz AI Ybera", en:"Ybera AI Quiz"},
     about:{pt:"Recomendação guiada por IA: leva quem não conhece a linha até o produto certo, reduzindo a dúvida que trava a primeira compra.",
            en:"AI-guided recommendation: takes someone unfamiliar with the line to the right product, cutting the doubt that stalls a first purchase."}},
    {id:"europa",     name:{pt:"Crossborder Europa", en:"Europe Crossborder"},
     about:{pt:"Venda para a Europa a partir da estrutura de loja e logística já montada nos EUA — segundo mercado sem operação nova.",
            en:"Selling into Europe from the store and logistics structure already built in the US — a second market with no new operation."}},
    /* Os quatro abaixo são o Epic homônimo na vertical Ecommerce e Growth do
       DevOps. O `about` de cada um foi escrito a partir do nome e das Features
       penduradas nele — confira e corrija onde eu inferi errado. */
    {id:"tema",       name:{pt:"Tema Global", en:"Global Theme"},
     about:{pt:"A base visual e técnica compartilhada pelas lojas de todos os países. Mexer aqui muda todas as lojas de uma vez — é o que faz um ajuste caber num lugar em vez de em cinco.",
            en:"The visual and technical foundation shared by every country's store. A change here changes all of them at once — it's what makes a fix fit in one place instead of five."}},
    {id:"marketplace", name:{pt:"Marketplaces", en:"Marketplaces"},
     about:{pt:"Venda fora da loja própria, nos canais onde o consumidor já procura — Amazon à frente. Alcança quem nunca chegaria ao site da marca.",
            en:"Selling outside our own store, in the channels where the shopper already searches — Amazon first. Reaches people who would never land on the brand's site."}},
    {id:"erp",        name:"ERP",
     about:{pt:"O sistema que cuida do pedido depois da compra: estoque, expedição, imposto e nota. Quando ele falha, o cliente sente na entrega, não na loja.",
            en:"The system that handles the order after checkout: stock, fulfillment, tax and invoicing. When it fails, the customer feels it in delivery, not in the store."}},
    {id:"hub",        name:{pt:"Hub de Produtos", en:"Product Hub"},
     about:{pt:"Cadastro central de produto que alimenta as lojas e os canais, para o mesmo item não ser mantido à mão em cada lugar.",
            en:"A central product registry feeding the stores and channels, so the same item isn't maintained by hand in each place."}}
  ],

  /* ------------------------------------------------------------------------
     O ESSENCIAL — três lugares fixos, na ordem em que o stakeholder pergunta:
     estamos no prazo? · o que mudou? · o que precisam de mim?

     O rótulo de cada linha é fixo. Ele existe para o formato não voltar a
     virar descrição do plano ("o trimestre concentra seis projetos") — isso
     o quadro já mostra, e é a parte que ninguém precisa ler duas vezes.

     Regras de escrita:
     · Prazo — diga se algo passou da janela planejada e qual é o item mais
       apertado, com a data. Não escreva "está tudo bem" sem olhar as datas.
     · Mudou — só o que mudou desde a edição anterior. Se nada mudou, diga
       isso; quinzena parada é informação, não é vergonha.
     · Pendências — o pedido. Se não houver, diga que não há e que este é o
       lugar onde vai aparecer. Nunca deixe a linha genérica para preencher.
     ---------------------------------------------------------------------- */
  summary:[
    /* AS TRÊS LINHAS SÃO EDITORIAIS e não derivam de nada — reescreva a cada
       edição. Evite citar projeto por nome e data por número: os cartões vêm
       do DevOps e mudam sem passar por aqui, então nome e data envelhecem
       sozinhos e a página passa a se contradizer. Fale do quadro, não do item. */
    {tag:{pt:"Fonte", en:"Source"},
     pt:"Esta página espelha o <b>Azure DevOps</b> direto. Cada cartão é um item que o time mantém lá — o estado muda quando o time move o item, não quando alguém reescreve esta página.",
     en:"This page mirrors <b>Azure DevOps</b> directly. Each card is an item the team maintains there — the state changes when the team moves the item, not when someone rewrites this page."},
    {tag:{pt:"Prazo", en:"Schedule"},
     pt:"A maioria dos itens <b>ainda não tem data prevista registrada na origem</b>, então o Futuro e as barras de andamento aparecem vazios. É ausência de dado, não ausência de trabalho.",
     en:"Most items <b>have no target date recorded at the source</b> yet, so the Future view and the progress bars come up empty. That's missing data, not missing work."},
    {tag:{pt:"Pendências", en:"Pending"},
     pt:"<b>Nada está travado esperando decisão de vocês</b> nesta edição. Quando algo parar fora do time de produto, aparece aqui primeiro — com nome do decisor e prazo.",
     en:"<b>Nothing is blocked waiting on a decision from you</b> in this edition. When something stalls outside the product team, it shows up here first — with a named decision-maker and a due date."}
  ],


  /* PENDÊNCIAS ("asks") — a forma que cumpre o que a linha "Pendências" do
     essencial, acima, já promete ao leitor: uma pendência aparece "com nome
     do decisor e prazo". Assim como `texto`, mais abaixo, é 100% editorial —
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
     projeto (1 a 4 meses) quase nada muda em duas semanas, e a base do Notion
     não registra conclusão — ela nunca teria o que dizer. O que mudou desde a
     edição anterior é dito na linha "Mudou" de `summary`, escrita à mão, que é
     a versão que as pessoas leem. Se um dia a fonte passar a registrar
     conclusão com data (Azure DevOps, por exemplo), o lugar de reconstruir
     isso é uma página "Entregue nesta quinzena" alimentada pelas demandas. */

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
