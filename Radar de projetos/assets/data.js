/* ==========================================================================
   DADOS DO RADAR — única fonte das páginas (index, essencial, ..., completo).
   É ESTE arquivo que se edita na revisão quinzenal.

   ATENÇÃO: o arquivo antigo "Radar de Projetos USA.html" (versão de página
   única, autocontida) carrega uma CÓPIA própria destes dados embutida nele.
   Enquanto os dois existirem, atualize os dois — ou aposente um.
   ==========================================================================
   1) DADOS
   --------------------------------------------------------------------------
   ORIGEM: base "Projetos" do Notion (espaço Ecommerce & Growth),
   filtro Frente = USA → 14 de 32 projetos. Extraído em 11/08/2026.

   Campos vindos do Notion, verbatim: `notion` (nome do projeto),
   `start`, `end` (coluna Período), `status`, `track` (coluna Produto).

   Campos escritos por você/pela tradução: `title` e `why`.
   `title` = o que o usuário passa a conseguir fazer.
   `why`   = uma frase de impacto no negócio. Sem ela, o item não entra.

   NÃO PREENCHIDO NA BASE: a coluna Status não tem nenhum valor "Concluído"
   (32 linhas: 22 "Não iniciado", 9 "Em andamento", 1 "Descontinuado"), e as
   colunas Ações, Decisões e PO Responsável estão vazias. Por isso a coluna
   "Entregue" e a seção "Precisamos de vocês" aparecem com estado vazio.

   --------------------------------------------------------------------------
   CAMPOS OPCIONAIS DE CADA ITEM (todos podem ser omitidos)

   health:"watch" | "blocked"   → sinal de saúde. Omitir = está no prazo.
                                  Qualquer item marcado faz aparecer a faixa
                                  "Atenção" no topo da página. Use com
                                  parcimônia: faixa sempre acesa não é sinal.
   healthNote:{pt,en}           → por que está em atenção/travado. Obrigatório
                                  na prática se usar `health` — sem o motivo o
                                  stakeholder não tem o que fazer com o alerta.
   owner:"Nome"                 → sobrescreve o dono padrão (DATA.meta.owner).
   shipped:"AAAA-MM"            → mês em que foi ao ar. Use com status:"done".
   result:{pt,en}               → o que mudou no negócio depois de entregar.
                                  Ex.: "No ar desde mai/26; conversão medida
                                  até 30/09". É o que transforma entrega em
                                  programa. Pode ficar vazio até ter número.

   PARA ADICIONAR UM ENTREGUE: copie um item, troque status para "done",
   preencha `shipped` e, se houver, `result`. A coluna Entregue, o tile e o
   medidor do trimestre passam a contá-lo automaticamente.

   about:{pt,en}                → parágrafo "sobre o que se trata" do projeto.
                                  Aparece na seção Projetos em detalhe.
   demands:[...]                → demandas acompanhadas dentro do projeto, na
                                  mesma seção. Cada demanda:
                                    {t:{pt:"Texto", en:"Text"},
                                     status:"done"|"doing"|"next",
                                     due:"AAAA-MM-DD"}   ← due é opcional
                                  A lista é mantida à mão na revisão quinzenal;
                                  a contagem no acordeão e o badge "Detalhe" da
                                  navegação são derivados dela. Sem `demands`,
                                  o projeto mostra o estado vazio da seção.
   ========================================================================== */
const DATA = {
  meta:{
    org:"Ybera Group · Ecommerce & Growth",
    title:{pt:"Radar de Projetos — USA", en:"Project Radar — USA"},
    /* rótulo curto para a barra de navegação, onde o título inteiro quebraria */
    shortTitle:{pt:"Radar USA", en:"USA Radar"},
    sub:{
      pt:"Os 14 projetos da frente USA: o que está em curso, o que está planejado e em que ordem. Atualizado a cada duas semanas.",
      en:"All 14 projects on the USA front: what's in flight, what's planned and in what order. Updated every two weeks."
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
  tracks:[
    {id:"club",       name:"Loja Clube USA"},
    {id:"interna",    name:{pt:"Loja Interna USA", en:"US Internal Store"}},
    {id:"influencer", name:{pt:"Loja da Influencer", en:"Influencer Store"}},
    {id:"reviews",    name:"Ybera Reviews"},
    {id:"ia",         name:{pt:"Quiz AI Ybera", en:"Ybera AI Quiz"}},
    {id:"europa",     name:{pt:"Crossborder Europa", en:"Europe Crossborder"}}
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

  /* Vazio: a base não registra decisões nem riscos. Ver estado vazio. */
  asks:[],

  /* ------------------------------------------------------------------------
     O QUE MUDOU NESTA QUINZENA

     Parte sai sozinha das datas do Notion (marcada "base" na página):
     item que começou dentro da janela, item cuja janela fecha dentro dela,
     item que foi ao ar no mês. Não precisa digitar nada para isso.

     O que as datas NÃO contam vai em `manual` — é o que você escreve nos
     20 minutos da revisão. Um item por mudança:

       {kind:"moved", text:{pt:"Nova home adiada de 15/08 para 01/09 …",
                            en:"New homepage moved from Aug 15 to Sep 1 …"}}

     kind: "shipped" (foi ao ar) · "start" (começou) · "moved" (data/escopo
     mudou) · "late" (atrasou) · "newi" (entrou no plano) · "out" (saiu).
     Escreva a consequência, não o evento: "adiada duas semanas porque o
     compliance vem primeiro" vale mais que "data alterada".

     `firstEdition:true` mostra a nota de que não há edição anterior para
     comparar. Troque para false na próxima atualização.
     ---------------------------------------------------------------------- */
  changes:{ firstEdition:true, manual:[] },

  items:[
    /* ---------- EM ANDAMENTO (status Notion: "Em andamento") ---------- */
    {status:"doing", track:"club", start:"2026-07-01", end:"2026-09-30",
     notion:"Ajustes Loja USA Compliance Google",
     title:{pt:"Loja USA em conformidade com as políticas do Google",
            en:"US store compliant with Google policies"},
     why:{pt:"Sem conformidade, os anúncios da loja USA ficam expostos a reprovação e a suspensão de conta.",
          en:"Without compliance, US store ads are exposed to disapproval and account suspension."},
     about:{pt:"Adequação da loja Clube USA às políticas do Google (Merchant Center e Ads): revisão das páginas de política, informações de contato, trocas, devoluções e checkout, corrigindo os pontos que hoje expõem os anúncios a reprovação. É pré-requisito para escalar mídia paga com segurança.",
            en:"Bringing the US Club store in line with Google's policies (Merchant Center and Ads): reviewing policy pages, contact information, exchanges, refunds and checkout, fixing the points that currently expose ads to disapproval. A prerequisite for scaling paid media safely."}},
    {status:"doing", track:"club", start:"2026-07-01", end:"2026-08-31",
     notion:"Nova PDP USA",
     title:{pt:"Nova página de produto na loja USA", en:"New product page on the US store"},
     why:{pt:"A página de produto é onde a decisão de compra acontece — é a alavanca mais direta de conversão.",
          en:"The product page is where the buying decision happens — the most direct conversion lever."},
     about:{pt:"Redesenho completo da página de produto da loja USA — narrativa visual, benefícios, prova social, especificações e módulos de conversão. É a página onde a decisão de compra acontece, e por isso a alavanca mais direta de conversão do trimestre.",
            en:"Full redesign of the US store's product page — visual narrative, benefits, social proof, specifications and conversion modules. It's the page where the buying decision happens, which makes it the quarter's most direct conversion lever."}},
    {status:"doing", track:"club", start:"2026-08-01", end:"2026-09-30",
     notion:"Tradução",
     title:{pt:"Loja USA inteiramente em inglês", en:"US store fully in English"},
     why:{pt:"Conteúdo traduzido de ponta a ponta remove o principal atrito de confiança do comprador americano.",
          en:"End-to-end translated content removes the American buyer's main trust barrier."},
     about:{pt:"Tradução de ponta a ponta da loja para o inglês americano: catálogo, páginas institucionais, e-mails transacionais e os microtextos de navegação e checkout. Remove o principal atrito de confiança do comprador local, que hoje encontra conteúdo misto.",
            en:"End-to-end translation of the store into US English: catalog, institutional pages, transactional e-mails and the microcopy across navigation and checkout. Removes the American buyer's main trust barrier — mixed-language content."}},

    /* ---------- PLANEJADO (status Notion: "Não iniciado") ---------- */
    {status:"next", track:"club", start:"2026-08-15", end:"2026-09-30",
     notion:"Nova Homepage USA",
     title:{pt:"Nova home da loja USA", en:"New US store homepage"},
     why:{pt:"É a primeira impressão da marca no mercado americano e o principal ponto de entrada do tráfego pago.",
          en:"It's the brand's first impression in the US market and the main landing point for paid traffic."},
     about:{pt:"Nova home da loja Clube USA como porta de entrada do tráfego pago: hero, vitrines por categoria, prova social e trilhas de navegação desenhadas para quem chega sem conhecer a marca. É a primeira impressão da Ybera no mercado americano.",
            en:"New homepage for the US Club store as the landing point for paid traffic: hero, category showcases, social proof and navigation paths designed for first-time visitors. Ybera's first impression in the American market."}},
    {status:"next", track:"club", start:"2026-09-01", end:"2026-09-30",
     notion:"Novo Design System Shopify",
     title:{pt:"Design system próprio no Shopify", en:"In-house design system on Shopify"},
     why:{pt:"Faz cada página nova nascer padronizada, em vez de ser desenhada do zero a cada demanda.",
          en:"Every new page starts standardized instead of being designed from scratch each time."},
     about:{pt:"Biblioteca própria de seções e componentes no Shopify — tokens, tipografia, grids e módulos reutilizáveis. Faz cada página nova nascer padronizada e encurta qualquer demanda futura de página, em vez de desenhar do zero a cada pedido.",
            en:"An in-house library of Shopify sections and components — tokens, typography, grids and reusable modules. Every new page starts standardized, shortening any future page demand instead of designing from scratch each time."}},
    {status:"next", track:"club", start:"2026-09-01", end:"2026-09-30",
     notion:"App de Reviews",
     title:{pt:"Avaliações de clientes na loja", en:"Customer reviews on the store"},
     why:{pt:"Prova social é o que sustenta a conversão de uma marca ainda pouco conhecida nos EUA.",
          en:"Social proof is what sustains conversion for a brand still little known in the US."},
     about:{pt:"Implantação de app de avaliações na loja: coleta pós-compra automatizada, exibição de notas e depoimentos na página de produto e selos agregados. Prova social para sustentar a conversão de uma marca ainda pouco conhecida nos EUA.",
            en:"Rolling out a reviews app on the store: automated post-purchase collection, ratings and testimonials on the product page, and aggregate badges. Social proof to sustain conversion for a brand still little known in the US."}},
    {status:"next", track:"club", start:"2026-10-01", end:"2026-12-31",
     notion:"Novo Tema da Loja USA/Global",
     title:{pt:"Novo tema da loja USA e global", en:"New theme for the US and global store"},
     why:{pt:"Um tema único elimina o retrabalho de manter duas lojas com aparência e código diferentes.",
          en:"A single theme removes the rework of maintaining two stores with different looks and code."},
     about:{pt:"Unificação do tema das lojas USA e global numa base única de código e aparência. Elimina o retrabalho de manter duas lojas com visuais e códigos diferentes e prepara o terreno para as próximas frentes internacionais.",
            en:"Unifying the US and global store themes into a single codebase and look. Removes the rework of maintaining two different stores and lays the ground for the next international fronts."}},
    {status:"next", track:"club", start:"2026-10-01", end:"2026-10-31",
     notion:"App Subscription",
     title:{pt:"Compra por assinatura", en:"Subscription purchase"},
     why:{pt:"Transforma compra única em receita recorrente e previsível, sem depender de nova aquisição.",
          en:"Turns one-off purchases into predictable recurring revenue, without new acquisition."},
     about:{pt:"Compra por assinatura na loja USA: planos recorrentes com desconto, gestão da assinatura pelo próprio cliente e cobrança automática. Transforma compra única em receita recorrente e previsível.",
            en:"Subscription purchase on the US store: recurring plans with a discount, customer-managed subscriptions and automatic billing. Turns one-off purchases into predictable recurring revenue."}},
    {status:"next", track:"interna", start:"2026-11-01", end:"2027-01-31",
     notion:"Loja Interna USA - Shopify",
     title:{pt:"Loja interna da operação USA", en:"Internal store for the US operation"},
     why:{pt:"Atende o canal interno com regra própria de preço e acesso, separado da loja do consumidor.",
          en:"Serves the internal channel with its own pricing and access rules, separate from the consumer store."},
     about:{pt:"Loja Shopify separada para o canal interno da operação USA, com regras próprias de preço e de acesso, apartada da loja do consumidor final. Atende pedidos do time e de parceiros sem contaminar métricas e estoque do varejo.",
            en:"A separate Shopify store for the US operation's internal channel, with its own pricing and access rules, apart from the consumer store. Serves team and partner orders without contaminating retail metrics and inventory."}},
    {status:"next", track:"club", start:"2026-11-01", end:"2026-11-30",
     notion:"App Rewards Loyalty (Yotpo)",
     title:{pt:"Programa de fidelidade com pontos", en:"Points-based loyalty program"},
     why:{pt:"Dá motivo para o cliente voltar, em vez de a receita depender sempre de aquisição nova.",
          en:"Gives customers a reason to come back, instead of revenue always depending on new acquisition."},
     about:{pt:"Programa de fidelidade com pontos via Yotpo: acúmulo por compra, resgate em desconto e níveis de benefício. Dá ao cliente um motivo concreto para voltar, reduzindo a dependência de aquisição nova.",
            en:"A points-based loyalty program via Yotpo: earn on purchase, redeem as discounts, benefit tiers. Gives customers a concrete reason to return, reducing dependence on new acquisition."}},
    {status:"next", track:"influencer", start:"2027-01-01", end:"2027-04-30",
     notion:"Loja da Influencer - USA",
     title:{pt:"Vitrine própria de cada influencer", en:"A storefront of their own for each influencer"},
     why:{pt:"Cada influencer passa a vender por uma página própria, com link único para usar nas redes.",
          en:"Each influencer sells through their own page, with a single link for their social bio."},
     about:{pt:"Vitrine própria para cada influencer parceira: página com a curadoria dela, link único para usar nas redes e venda rastreável. Transforma a audiência das influencers em canal de venda direto.",
            en:"A storefront of their own for each partner influencer: a curated page, a single link for their social bio and trackable sales. Turns influencer audiences into a direct sales channel."}},
    {status:"next", track:"ia", start:"2027-01-01", end:"2027-02-28",
     notion:"App Shopify Quiz Ybera AI - USA",
     title:{pt:"Recomendação de produto guiada por IA", en:"AI-guided product recommendation"},
     why:{pt:"Leva quem não conhece a linha até o produto certo, reduzindo a dúvida que trava a compra.",
          en:"Takes someone unfamiliar with the line to the right product, cutting the doubt that stalls a purchase."},
     about:{pt:"Quiz de recomendação guiado por IA na loja: algumas perguntas sobre cabelo e objetivo levam quem não conhece a linha ao produto certo. Reduz a dúvida que trava a primeira compra.",
            en:"An AI-guided recommendation quiz on the store: a few questions about hair and goals take someone unfamiliar with the line to the right product. Cuts the doubt that stalls a first purchase."}},
    {status:"next", track:"reviews", start:"2027-03-01", end:"2027-04-30",
     notion:"App Shopify - Ybera Reviews - USA",
     title:{pt:"Avaliações próprias, sem app de terceiro", en:"In-house reviews, no third-party app"},
     why:{pt:"Tira a dependência de fornecedor externo e o custo de assinatura que vem com ele.",
          en:"Removes the external vendor dependency and the subscription cost that comes with it."},
     about:{pt:"App próprio de avaliações para substituir o fornecedor terceiro: coleta, moderação e exibição sob controle da Ybera, sem custo de assinatura externo e com os dados em casa.",
            en:"An in-house reviews app to replace the third-party vendor: collection, moderation and display under Ybera's control, with no external subscription cost and the data kept in-house."}},
    {status:"next", track:"europa", start:"2027-03-01", end:"2027-06-30",
     notion:"Ybera Europa - Crossborder USA",
     title:{pt:"Venda para a Europa a partir da operação USA", en:"Selling into Europe from the US operation"},
     why:{pt:"Abre um segundo mercado reaproveitando a estrutura de loja e logística já montada nos EUA.",
          en:"Opens a second market by reusing the store and logistics structure already built in the US."},
     about:{pt:"Venda para a Europa a partir da operação USA: moeda, frete internacional, impostos e a localização mínima necessária para operar. Abre um segundo mercado reaproveitando a estrutura de loja e logística já montada nos EUA.",
            en:"Selling into Europe from the US operation: currency, international shipping, taxes and the minimum localization needed to operate. Opens a second market by reusing the store and logistics structure already built in the US."}}
  ],

  horizon:{
    now:{ when:{pt:"até 30 de setembro", en:"through September 30"},
      conf:{pt:"Janela atual", en:"Current window"},
      list:[
        {pt:"Conformidade da loja USA com o Google", en:"US store compliance with Google"},
        {pt:"Nova página de produto", en:"New product page"},
        {pt:"Loja inteiramente em inglês", en:"Store fully in English"},
        {pt:"Nova home da loja USA", en:"New US store homepage"},
        {pt:"Design system próprio no Shopify", en:"In-house design system on Shopify"},
        {pt:"Avaliações de clientes na loja", en:"Customer reviews on the store"}
      ]},
    next:{ when:{pt:"Out – Dez 2026", en:"Oct – Dec 2026"},
      conf:{pt:"Planejado", en:"Planned"},
      list:[
        {pt:"Novo tema da loja USA e global", en:"New US and global store theme"},
        {pt:"Compra por assinatura", en:"Subscription purchase"},
        {pt:"Programa de fidelidade com pontos", en:"Points-based loyalty program"},
        {pt:"Loja interna da operação USA", en:"Internal store for the US operation"}
      ]},
    later:{ when:{pt:"2027", en:"2027"},
      conf:{pt:"Roadmap", en:"Roadmap"},
      list:[
        {pt:"Vitrine própria de cada influencer", en:"A storefront for each influencer"},
        {pt:"Recomendação de produto por IA", en:"AI product recommendation"},
        {pt:"Avaliações próprias, sem terceiro", en:"In-house reviews, no third party"},
        {pt:"Venda para a Europa via operação USA", en:"Selling into Europe via the US operation"}
      ]}
  }
};

