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
      pt:"Os projetos da frente USA: o que está em curso, o que está planejado e em que ordem. Atualizado a cada duas semanas.",
      en:"The projects on the USA front: what's in flight, what's planned and in what order. Updated every two weeks."
    },
    /* Janela que esta edição cobre: da atualização anterior até esta.
       `to` acompanha `updated` — é o período olhado para trás, não o mês
       corrente. É daqui que sai o bloco "O que mudou nesta quinzena". */
    cycle:{pt:"Quinzena até 11 de agosto", en:"Cycle through August 11"},
    from:"2026-07-28", to:"2026-08-11",
    updated:"2026-08-11",
    next:"2026-08-25",
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
            en:"Selling into Europe from the store and logistics structure already built in the US — a second market with no new operation."}}
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
    {tag:{pt:"Prazo", en:"Schedule"},
     pt:"As três frentes em curso estão <b>dentro da janela planejada</b>. A mais apertada é a <b>nova página de produto</b>, que fecha em <b>31 de agosto</b> com dois terços da janela já corridos.",
     en:"All three fronts in flight are <b>inside their planned window</b>. The tightest is the <b>new product page</b>, which closes on <b>August 31</b> with two-thirds of its window gone."},
    {tag:{pt:"Mudou", en:"Changed"},
     pt:"A <b>tradução da loja para o inglês</b> entrou em curso em 1º de agosto, e a <b>nova home da loja USA</b> abre a janela em 15 de agosto. São as duas novidades desta quinzena.",
     en:"The <b>store's English translation</b> went into flight on August 1, and the <b>new US homepage</b> opens its window on August 15. Those are the two developments this cycle."},
    {tag:{pt:"Pendências", en:"Pending"},
     pt:"<b>Nada está travado esperando decisão de vocês</b> nesta quinzena. Quando algo parar fora do time de produto, aparece aqui primeiro — com nome do decisor e prazo.",
     en:"<b>Nothing is blocked waiting on a decision from you</b> this cycle. When something stalls outside the product team, it shows up here first — with a named decision-maker and a due date."}
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
    1:{ /* Notion: Ajustes Loja USA Compliance Google */
      title:{pt:"Loja USA em conformidade com as políticas do Google",
             en:"US store compliant with Google policies"},
      why:{pt:"Sem conformidade, os anúncios da loja USA ficam expostos a reprovação e a suspensão de conta.",
           en:"Without compliance, US store ads are exposed to disapproval and account suspension."},
      about:{pt:"Adequação da loja Clube USA às políticas do Google (Merchant Center e Ads): revisão das páginas de política, informações de contato, trocas, devoluções e checkout, corrigindo os pontos que hoje expõem os anúncios a reprovação. É pré-requisito para escalar mídia paga com segurança.",
            en:"Bringing the US Club store in line with Google's policies (Merchant Center and Ads): reviewing policy pages, contact information, exchanges, refunds and checkout, fixing the points that currently expose ads to disapproval. A prerequisite for scaling paid media safely."}
    },
    2:{ /* Notion: Nova PDP USA */
      title:{pt:"Nova página de produto na loja USA",
             en:"New product page on the US store"},
      why:{pt:"A página de produto é onde a decisão de compra acontece — é a alavanca mais direta de conversão.",
           en:"The product page is where the buying decision happens — the most direct conversion lever."},
      about:{pt:"Redesenho completo da página de produto da loja USA — narrativa visual, benefícios, prova social, especificações e módulos de conversão. É a página onde a decisão de compra acontece, e por isso a alavanca mais direta de conversão do trimestre.",
            en:"Full redesign of the US store's product page — visual narrative, benefits, social proof, specifications and conversion modules. It's the page where the buying decision happens, which makes it the quarter's most direct conversion lever."}
    },
    3:{ /* Notion: Tradução */
      title:{pt:"Loja USA inteiramente em inglês",
             en:"US store fully in English"},
      why:{pt:"Conteúdo traduzido de ponta a ponta remove o principal atrito de confiança do comprador americano.",
           en:"End-to-end translated content removes the American buyer's main trust barrier."},
      about:{pt:"Tradução de ponta a ponta da loja para o inglês americano: catálogo, páginas institucionais, e-mails transacionais e os microtextos de navegação e checkout. Remove o principal atrito de confiança do comprador local, que hoje encontra conteúdo misto.",
            en:"End-to-end translation of the store into US English: catalog, institutional pages, transactional e-mails and the microcopy across navigation and checkout. Removes the American buyer's main trust barrier — mixed-language content."}
    },
    4:{ /* Notion: Nova Homepage USA */
      title:{pt:"Nova home da loja USA",
             en:"New US store homepage"},
      why:{pt:"É a primeira impressão da marca no mercado americano e o principal ponto de entrada do tráfego pago.",
           en:"It's the brand's first impression in the US market and the main landing point for paid traffic."},
      about:{pt:"Nova home da loja Clube USA como porta de entrada do tráfego pago: hero, vitrines por categoria, prova social e trilhas de navegação desenhadas para quem chega sem conhecer a marca. É a primeira impressão da Ybera no mercado americano.",
            en:"New homepage for the US Club store as the landing point for paid traffic: hero, category showcases, social proof and navigation paths designed for first-time visitors. Ybera's first impression in the American market."}
    },
    5:{ /* Notion: Novo Design System Shopify */
      title:{pt:"Design system próprio no Shopify",
             en:"In-house design system on Shopify"},
      why:{pt:"Faz cada página nova nascer padronizada, em vez de ser desenhada do zero a cada demanda.",
           en:"Every new page starts standardized instead of being designed from scratch each time."},
      about:{pt:"Biblioteca própria de seções e componentes no Shopify — tokens, tipografia, grids e módulos reutilizáveis. Faz cada página nova nascer padronizada e encurta qualquer demanda futura de página, em vez de desenhar do zero a cada pedido.",
            en:"An in-house library of Shopify sections and components — tokens, typography, grids and reusable modules. Every new page starts standardized, shortening any future page demand instead of designing from scratch each time."}
    },
    6:{ /* Notion: App de Reviews */
      title:{pt:"Avaliações de clientes na loja",
             en:"Customer reviews on the store"},
      why:{pt:"Prova social é o que sustenta a conversão de uma marca ainda pouco conhecida nos EUA.",
           en:"Social proof is what sustains conversion for a brand still little known in the US."},
      about:{pt:"Implantação de app de avaliações na loja: coleta pós-compra automatizada, exibição de notas e depoimentos na página de produto e selos agregados. Prova social para sustentar a conversão de uma marca ainda pouco conhecida nos EUA.",
            en:"Rolling out a reviews app on the store: automated post-purchase collection, ratings and testimonials on the product page, and aggregate badges. Social proof to sustain conversion for a brand still little known in the US."}
    },
    7:{ /* Notion: Novo Tema da Loja USA/Global */
      title:{pt:"Novo tema da loja USA e global",
             en:"New theme for the US and global store"},
      why:{pt:"Um tema único elimina o retrabalho de manter duas lojas com aparência e código diferentes.",
           en:"A single theme removes the rework of maintaining two stores with different looks and code."},
      about:{pt:"Unificação do tema das lojas USA e global numa base única de código e aparência. Elimina o retrabalho de manter duas lojas com visuais e códigos diferentes e prepara o terreno para as próximas frentes internacionais.",
            en:"Unifying the US and global store themes into a single codebase and look. Removes the rework of maintaining two different stores and lays the ground for the next international fronts."}
    },
    8:{ /* Notion: App Subscription */
      title:{pt:"Compra por assinatura",
             en:"Subscription purchase"},
      why:{pt:"Transforma compra única em receita recorrente e previsível, sem depender de nova aquisição.",
           en:"Turns one-off purchases into predictable recurring revenue, without new acquisition."},
      about:{pt:"Compra por assinatura na loja USA: planos recorrentes com desconto, gestão da assinatura pelo próprio cliente e cobrança automática. Transforma compra única em receita recorrente e previsível.",
            en:"Subscription purchase on the US store: recurring plans with a discount, customer-managed subscriptions and automatic billing. Turns one-off purchases into predictable recurring revenue."}
    },
    9:{ /* Notion: Loja Interna USA - Shopify */
      title:{pt:"Loja interna da operação USA",
             en:"Internal store for the US operation"},
      why:{pt:"Atende o canal interno com regra própria de preço e acesso, separado da loja do consumidor.",
           en:"Serves the internal channel with its own pricing and access rules, separate from the consumer store."},
      about:{pt:"Loja Shopify separada para o canal interno da operação USA, com regras próprias de preço e de acesso, apartada da loja do consumidor final. Atende pedidos do time e de parceiros sem contaminar métricas e estoque do varejo.",
            en:"A separate Shopify store for the US operation's internal channel, with its own pricing and access rules, apart from the consumer store. Serves team and partner orders without contaminating retail metrics and inventory."}
    },
    10:{ /* Notion: App Rewards Loyalty (Yotpo) */
      title:{pt:"Programa de fidelidade com pontos",
             en:"Points-based loyalty program"},
      why:{pt:"Dá motivo para o cliente voltar, em vez de a receita depender sempre de aquisição nova.",
           en:"Gives customers a reason to come back, instead of revenue always depending on new acquisition."},
      about:{pt:"Programa de fidelidade com pontos via Yotpo: acúmulo por compra, resgate em desconto e níveis de benefício. Dá ao cliente um motivo concreto para voltar, reduzindo a dependência de aquisição nova.",
            en:"A points-based loyalty program via Yotpo: earn on purchase, redeem as discounts, benefit tiers. Gives customers a concrete reason to return, reducing dependence on new acquisition."}
    },
    11:{ /* Notion: Loja da Influencer - USA */
      title:{pt:"Vitrine própria de cada influencer",
             en:"A storefront of their own for each influencer"},
      why:{pt:"Cada influencer passa a vender por uma página própria, com link único para usar nas redes.",
           en:"Each influencer sells through their own page, with a single link for their social bio."},
      about:{pt:"Vitrine própria para cada influencer parceira: página com a curadoria dela, link único para usar nas redes e venda rastreável. Transforma a audiência das influencers em canal de venda direto.",
            en:"A storefront of their own for each partner influencer: a curated page, a single link for their social bio and trackable sales. Turns influencer audiences into a direct sales channel."}
    },
    12:{ /* Notion: App Shopify Quiz Ybera AI - USA */
      title:{pt:"Recomendação de produto guiada por IA",
             en:"AI-guided product recommendation"},
      why:{pt:"Leva quem não conhece a linha até o produto certo, reduzindo a dúvida que trava a compra.",
           en:"Takes someone unfamiliar with the line to the right product, cutting the doubt that stalls a purchase."},
      about:{pt:"Quiz de recomendação guiado por IA na loja: algumas perguntas sobre cabelo e objetivo levam quem não conhece a linha ao produto certo. Reduz a dúvida que trava a primeira compra.",
            en:"An AI-guided recommendation quiz on the store: a few questions about hair and goals take someone unfamiliar with the line to the right product. Cuts the doubt that stalls a first purchase."}
    },
    13:{ /* Notion: App Shopify - Ybera Reviews - USA */
      title:{pt:"Avaliações próprias, sem app de terceiro",
             en:"In-house reviews, no third-party app"},
      why:{pt:"Tira a dependência de fornecedor externo e o custo de assinatura que vem com ele.",
           en:"Removes the external vendor dependency and the subscription cost that comes with it."},
      about:{pt:"App próprio de avaliações para substituir o fornecedor terceiro: coleta, moderação e exibição sob controle da Ybera, sem custo de assinatura externo e com os dados em casa.",
            en:"An in-house reviews app to replace the third-party vendor: collection, moderation and display under Ybera's control, with no external subscription cost and the data kept in-house."}
    },
    14:{ /* Notion: Ybera Europa - Crossborder USA */
      title:{pt:"Venda para a Europa a partir da operação USA",
             en:"Selling into Europe from the US operation"},
      why:{pt:"Abre um segundo mercado reaproveitando a estrutura de loja e logística já montada nos EUA.",
           en:"Opens a second market by reusing the store and logistics structure already built in the US."},
      about:{pt:"Venda para a Europa a partir da operação USA: moeda, frete internacional, impostos e a localização mínima necessária para operar. Abre um segundo mercado reaproveitando a estrutura de loja e logística já montada nos EUA.",
            en:"Selling into Europe from the US operation: currency, international shipping, taxes and the minimum localization needed to operate. Opens a second market by reusing the store and logistics structure already built in the US."}
    }
  }
};
