/* ==========================================================================
   Radar de Projetos USA — motor compartilhado das páginas.
   Os dados moram em prosa.js (texto, à mão) e fatos.js (fatos, gerados por
   tools/sync.mjs), ambos carregados antes deste arquivo e fundidos por
   fundir(). Cada página
   declara body[data-page] e contém só os contêineres da sua seção; o motor
   preenche o que existir. A versão completa (completo.html) contém tudo.
   ==========================================================================
   2) TEXTOS FIXOS
   ========================================================================== */
const T = {
  pt:{
    updated:"Atualizado em", next:"Próxima atualização", by:"por",
    tiles:{done:"Entregue", doing:"Em curso", asks:"Pendências", nextd:"Próxima data prevista"},
    tileFoot:{
      done:"no ar e em uso hoje",
      doing:"em construção agora",
      asksSome:"decisão de fora do time travando trabalho",
      asksNone:"nada registrado na base ainda",
      nextdEnd:"fim da janela · ",
      nextdStart:"começo previsto · ",
      nextdNone:"sem data futura na base"
    },
    meter:"Projetos com prazo no trimestre", of:"de", initiatives:"concluídos",
    mDone:"Concluído", mDoing:"Em curso", mLeft:"Não iniciado",
    alertTitle:"Atenção — fora do plano",
    alertBlocked:"Travado", alertWatch:"Em atenção",
    navTop:"Panorama", navAsk:"Pendências",
    navBoard:"Board de entregas", navDet:"Produtos", navHor:"Futuro",
    whyLink:"por quê?",
    themeDark:"Mudar para tema escuro", themeLight:"Mudar para tema claro",
    sumTitle:"O essencial",
    sumSub:"Se você só tiver um minuto, leia esta parte.",
    askTitle:"Pendências",
    askSub:"O que está parado esperando uma decisão ou atenção de fora do time de produto.",
    askEmptyShort:"Nenhuma decisão esperando vocês nesta quinzena.",
    askEmptyT:"Nenhuma decisão registrada",
    /* Corrigido: esta lista nunca veio do Azure DevOps (ele não tem o
       conceito de "decisão pendente de fora do time" para extrair — ver
       prosa.js) — é mantida à mão, e some daqui só porque ninguém escreveu
       nada nesta edição. A frase antiga culpava a ferramenta errada. */
    askEmptyD:"Esta lista é mantida à mão — o Azure DevOps não tem como saber o que está parado esperando decisão ou ação de fora do time de produto. Nesta edição, nada foi registrado, então esta seção não tem o que mostrar. Enquanto isso não acontecer, decisões travadas seguem invisíveis para quem precisa decidir.",
    askWhoLabel:"Decisor", askByLabel:"Prazo", askOverdue:"Prazo vencido",
    boardTitle:"Board de entregas",
    boardSub:"Cada item está escrito pelo que o usuário passa a conseguir fazer. O título original no Azure DevOps aparece embaixo, para rastreio.",
    detTitle:"Produtos",
    detSub:"Os produtos da frente USA e os projetos dentro de cada um. Abra um projeto para ler o que ele é e as demandas acompanhadas nele; a lista de demandas é mantida à mão na revisão quinzenal.",
    noTrackTitle:"Sem produto",
    noTrackDesc:"A Area Path deste item no Azure DevOps ainda não está mapeada para um produto em tools/config.json.",
    noStatusTitle:"Sem status",
    noStatusDesc:"O estado deste item no Azure DevOps ainda não está mapeado para um status do board em tools/config.json.",
    noDateTitle:"Sem data de início",
    noDateDesc:"Este item ainda não tem data de início registrada no Azure DevOps, então não há como posicioná-lo numa das três faixas.",
    tableSub:"Os projetos numa tabela só, para comparar e ordenar. Filtre por produto e por status; clique no cabeçalho para reordenar.",
    viewCards:"Por produto", viewTable:"Tabela",
    colProd:"Produto", colProj:"Projeto", colStat:"Status", colWin:"Janela",
    colElapsed:"Decorrido", colDem:"Demandas", colOwner:"Dono",
    filterStatus:"Filtrar por status:",
    tCount:"{n} de {total} projetos", tEmpty:"Nenhum projeto com esses filtros.",
    projectOne:"projeto", projectMany:"projetos", doingLower:"em curso",
    demandsTitle:"Demandas",
    demandsNone:"Sem demandas registradas ainda — entram na próxima revisão quinzenal.",
    colDone:"Entregue", colDoing:"Em curso", colNext:"Planejado",
    doneEmptyShort:"Histórico em levantamento — entra na próxima atualização.",
    doneEmptyT:"Histórico em levantamento",
    doneEmptyD:"Nenhum item tem data de conclusão registrada ainda no Azure DevOps — então não há de onde puxar entrega fechada. O que já está no ar está sendo levantado à mão e entra na próxima atualização. Enquanto isso, esta coluna vazia diz respeito à base, não ao trabalho.",
    all:"Todos", filterLabel:"Filtrar por produto:",
    window:"Janela", elapsed:"Janela decorrida", over:"Janela vencida",
    live:"No ar desde", resultLabel:"Resultado:",
    noProsa:"Sem redação", noProsaTitle:"Item com fato no Azure DevOps mas sem texto editorial em prosa.js ainda.",
    srcLabel:"Azure DevOps:",
    foldShow:"Ver os {n} projetos planejados", foldHide:"Esconder os planejados",
    printPlanned:"Os {n} projetos planejados estão listados na seção Futuro, adiante — sem repetir os cards aqui.",
    horTitle:"Futuro",
    horSub:"Quanto mais longe, menos preciso — de propósito. As três faixas saem da data de início de cada projeto no Azure DevOps: mudar um período move o projeto de faixa sozinho.",
    navRep:"Report mensal",
    repTitle:"Report mensal",
    repSub:"O que foi concluído em cada mês. O mês mais recente abre aberto; os anteriores ficam recolhidos abaixo.",
    repExtra:"Também concluído",
    repMonthEmpty:"Nada registrado neste mês.",
    repEmptyShort:"Nenhum mês com item concluído ainda.",
    repEmptyD:"Nenhum item tem data de conclusão registrada no Azure DevOps, e nenhum projeto tem demandas concluídas — não há de onde derivar o que fechou. Enquanto isso, o mês pode ser escrito à mão no bloco <b>reports</b> do arquivo de dados. Esta página vazia diz respeito à base, não ao trabalho.",
    repOneDelivery:"entrega", repManyDeliveries:"entregas",
    repOneDemand:"demanda concluída", repManyDemands:"demandas concluídas",
    repOneExtra:"outro item", repManyExtra:"outros itens",
    horNow:"Agora", horNext:"A seguir", horLater:"Depois",
    horUntil:"até {d}",
    confNow:"Janela atual", confNext:"Planejado", confLater:"Roadmap",
    footSource:"Fonte: Azure DevOps (projeto B2C, vertical Ecommerce e Growth) — status, janela, produto e dono saem de lá automaticamente; o texto editorial (título, por quê, sobre) é mantido à mão. Último snapshot: {d}.",
    footCadence:"Cadência: uma atualização a cada duas semanas.",
    footLimit:"Limitação conhecida: a janela de cada item só aparece quando há data prevista registrada no Azure DevOps. Onde não há, o cartão mostra “—” e o item não entra nas faixas do Futuro — é ausência de dado na origem, não ausência de trabalho.",
    footNote:"Dúvida ou correção? Fale com",
    footUrl:"Página sempre atualizada:"
  },
  en:{
    updated:"Updated", next:"Next update", by:"by",
    tiles:{done:"Shipped", doing:"In flight", asks:"Pending", nextd:"Next expected date"},
    tileFoot:{
      done:"live and in use today",
      doing:"being built now",
      asksSome:"a decision outside the team is holding work",
      asksNone:"nothing recorded in the source yet",
      nextdEnd:"end of the window · ",
      nextdStart:"planned start · ",
      nextdNone:"no future date in the source"
    },
    meter:"Projects due this quarter", of:"of", initiatives:"complete",
    mDone:"Complete", mDoing:"In flight", mLeft:"Not started",
    alertTitle:"Attention — off plan",
    alertBlocked:"Blocked", alertWatch:"At risk",
    navTop:"Overview", navAsk:"Pending",
    navBoard:"Delivery board", navDet:"Products", navHor:"Future",
    whyLink:"why?",
    themeDark:"Switch to dark theme", themeLight:"Switch to light theme",
    sumTitle:"The essentials",
    sumSub:"If you only have a minute, read this part.",
    askTitle:"Pending",
    askSub:"What is stalled waiting on a decision or attention from outside the product team.",
    askEmptyShort:"No decision waiting on you this cycle.",
    askEmptyT:"No decisions recorded",
    askEmptyD:"This list is kept by hand — Azure DevOps has no way to know what's stalled waiting on a decision or action from outside the product team. Nothing was recorded for this edition, so this section has nothing to show. Until that happens, blocked decisions stay invisible to the people who need to make them.",
    askWhoLabel:"Decision maker", askByLabel:"Due", askOverdue:"Overdue",
    boardTitle:"Delivery board",
    boardSub:"Every item is written as what the user can now do. The original Azure DevOps title appears below it, for traceability.",
    detTitle:"Products",
    detSub:"The products on the USA front and the projects inside each one. Open a project to read what it is and the demands tracked in it; the demand list is maintained by hand during the biweekly review.",
    noTrackTitle:"No product",
    noTrackDesc:"This item's Area Path in Azure DevOps isn't mapped to a product in tools/config.json yet.",
    noStatusTitle:"No status",
    noStatusDesc:"This item's state in Azure DevOps isn't mapped to a board status in tools/config.json yet.",
    noDateTitle:"No start date",
    noDateDesc:"This item doesn't have a start date recorded in Azure DevOps yet, so there's no way to place it in one of the three bands.",
    tableSub:"All projects in a single table, to compare and sort. Filter by product and status; click a header to reorder.",
    viewCards:"By product", viewTable:"Table",
    colProd:"Product", colProj:"Project", colStat:"Status", colWin:"Window",
    colElapsed:"Elapsed", colDem:"Demands", colOwner:"Owner",
    filterStatus:"Filter by status:",
    tCount:"{n} of {total} projects", tEmpty:"No project matches these filters.",
    projectOne:"project", projectMany:"projects", doingLower:"in flight",
    demandsTitle:"Demands",
    demandsNone:"No demands recorded yet — they land in the next biweekly review.",
    colDone:"Shipped", colDoing:"In flight", colNext:"Planned",
    doneEmptyShort:"History being compiled — lands in the next update.",
    doneEmptyT:"History being compiled",
    doneEmptyD:"No item has a close date recorded yet in Azure DevOps — so there is no closed delivery to pull. What is already live is being compiled by hand and lands in the next update. Until then, this empty column is about the database, not about the work.",
    all:"All", filterLabel:"Filter by product:",
    window:"Window", elapsed:"Window elapsed", over:"Window overdue",
    live:"Live since", resultLabel:"Result:",
    noProsa:"No copy", noProsaTitle:"Item with facts from Azure DevOps but no editorial text in prosa.js yet.",
    srcLabel:"Azure DevOps:",
    foldShow:"Show the {n} planned projects", foldHide:"Hide the planned ones",
    printPlanned:"The {n} planned projects are listed in the Future section below — not repeated as cards here.",
    horTitle:"Future",
    horSub:"The further out, the vaguer — on purpose. The three bands come from each project's start date in Azure DevOps: change a period and the project moves band on its own.",
    navRep:"Monthly report",
    repTitle:"Monthly report",
    repSub:"What was completed each month. The most recent month opens expanded; earlier ones stay collapsed below.",
    repExtra:"Also completed",
    repMonthEmpty:"Nothing recorded this month.",
    repEmptyShort:"No month with completed items yet.",
    repEmptyD:"No item has a close date recorded in Azure DevOps, and no project has completed demands — there is nothing to derive closed work from. In the meantime a month can be written by hand in the <b>reports</b> block of the data file. This empty page is about the base, not about the work.",
    repOneDelivery:"delivery", repManyDeliveries:"deliveries",
    repOneDemand:"completed demand", repManyDemands:"completed demands",
    repOneExtra:"other item", repManyExtra:"other items",
    horNow:"Now", horNext:"Next", horLater:"Later",
    horUntil:"through {d}",
    confNow:"Current window", confNext:"Planned", confLater:"Roadmap",
    footSource:"Source: Azure DevOps (B2C project, Ecommerce e Growth vertical) — status, window, product and owner come from there automatically; the editorial text (title, why, about) is maintained by hand. Last snapshot: {d}.",
    footCadence:"Cadence: one update every two weeks.",
    footLimit:"Known limitation: an item's window only appears when a target date is recorded in Azure DevOps. Where there is none, the card shows “—” and the item stays out of the Future bands — that's missing data at the source, not missing work.",
    footNote:"Question or correction? Talk to",
    footUrl:"Always-current page:"
  }
};

/* ==========================================================================
   3) MOTOR
   ========================================================================== */

/* --- FUSÃO PROSA + FATOS ------------------------------------------------
   O Radar tem dois tipos de campo. Fato (estado, janela, produto, dono,
   conclusão) vem do Azure DevOps, gerado em fatos.js por tools/sync.mjs.
   Editorial (título legível, why, about, result, healthNote) é escrito à mão
   em prosa.js, indexado pelo mesmo id do work item.

   Item com fato e sem prosa APARECE, com o título cru do DevOps e a marca
   `semProsa` — some em silêncio seria pior, porque falta não se percebe.
   Prosa sem fato não renderiza: o work item saiu do filtro, foi apagado ou
   mudou de área. Quem avisa é ESTA função, num console.warn — o script não
   pode avisar porque ele nunca lê o prosa.js. --- */
function fundir(prosa, fatos){
  const texto = prosa.texto || {};
  const items = ((fatos && fatos.epics) || []).map(f => {
    const t = texto[f.id] || null;
    return {
      id:f.id, azureTitle:f.azureTitle, track:f.track, start:f.start, end:f.end,
      status:f.status,
      /* Travado ("blocked") só existe no Azure DevOps — vem sempre de `f`.
         Em atenção ("watch") não tem sinal equivalente lá: continua editorial,
         e só entra quando o fato não trouxer nada (fato manda quando os dois
         existem — um impedimento real supera uma nota manual desatualizada). */
      health:f.health || (t && t.health) || null,
      shipped:f.shipped,
      owner:f.owner || undefined,
      demands:f.demands || [],
      semProsa:!t,
      title:t ? t.title : f.azureTitle,
      why:t ? t.why : "",
      about:t ? t.about : "",
      result:t ? t.result : undefined,
      healthNote:t ? t.healthNote : undefined
    };
  });
  /* Texto órfão: entrada em `texto` sem Epic correspondente no fatos.js.
     Não renderiza (não há fato para mostrar), mas não pode passar calado. */
  const vivos = new Set(items.map(i => i.id));
  const orfaos = Object.keys(texto).map(Number).filter(id => !vivos.has(id));
  if(orfaos.length) console.warn(
    "prosa.js: " + orfaos.length + " entrada(s) de texto sem work item correspondente: " +
    orfaos.join(", ") + " — o Epic saiu do filtro, foi apagado ou mudou de área.");

  /* Track desconhecido: nem tools/sync.mjs (que nunca lê prosa.js) nem esta
     função checavam se o `track` de um item batia com um id real de produto.
     Um id digitado errado em fatos.js faz o projeto sumir de produtos.html
     sem aviso nenhum — mesmo espírito do aviso de prosa órfã acima. */
  const idsDeProdutos = new Set((prosa.tracks || []).map(tr => tr.id));
  const trackInvalido = items.filter(i => i.track !== null && !idsDeProdutos.has(i.track));
  if(trackInvalido.length){
    console.warn(
      "fatos.js: " + trackInvalido.length + " item(ns) com track desconhecido: " +
      trackInvalido.map(i => `#${i.id} "${i.track}"`).join(", ") +
      " — confira o id contra PROSA.tracks em prosa.js.");
    /* Normaliza para null DEPOIS de avisar: um id digitado errado em areas
       (tools/config.json) não pode sumir o item da página — cai no mesmo
       grupo "sem produto" que já existe para track:null, com a mesma
       explicação. O console.warn acima é quem nomeia o valor errado; o
       grupo não teria como. */
    trackInvalido.forEach(i => { i.track = null; });
  }

  const meta = Object.assign({}, prosa.meta);
  /* A data de atualização passa a ser quando o snapshot rodou; o valor
     editorial fica como reserva para quando o fatos.js ainda não existe. */
  if(fatos && fatos.geradoEm) meta.updated = fatos.geradoEm.slice(0, 10);
  return {
    meta, tracks:prosa.tracks, summary:prosa.summary,
    asks:prosa.asks || [], reports:prosa.reports || [], items
  };
}
const DATA = fundir(
  typeof PROSA !== "undefined" ? PROSA : {},
  typeof RADAR_FATOS !== "undefined" ? RADAR_FATOS : null
);

let lang = localStorage.getItem("radar-lang") === "en" ? "en" : "pt";
let activeTracks = new Set();
/* Tabela: filtro de status e ordenação. Só a página tabela tem os
   contêineres — nas outras, estes estados ficam inertes. */
let activeStatus = new Set();
let tSort = {key:"prod", dir:1};
let foldOpen = false; /* coluna Planejado começa colapsada */
/* Referência de "hoje" = a data da última atualização declarada. Mexer em
   DATA.meta.updated move as barras de tempo decorrido junto. */
const TODAY_ISO = DATA.meta.updated;

/* Elemento nulo: cada página contém só os contêineres da própria seção.
   Escrever num id ausente cai aqui e é engolido — o motor preenche o que
   existir, sem precisar saber em que página está. */
const NULL_EL = new Proxy({}, {
  get:(o, p) => {
    if(p === "querySelectorAll") return () => [];
    if(p === "querySelector") return () => null;
    if(p === "addEventListener" || p === "setAttribute") return () => {};
    if(p === "dataset" || p === "style") return {};
    return NULL_EL;
  },
  set:() => true
});
const $ = id => document.getElementById(id) || NULL_EL;
const L = v => (v == null ? "" : (typeof v === "object" ? (v[lang] ?? v.pt ?? "") : v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const D = iso => { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d); };
const TODAY = D(TODAY_ISO);

function fmtDate(iso, withYear){
  if(!iso) return "";
  const opt = {day:"numeric", month:"short"};
  if(withYear) opt.year = "numeric";
  return new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", opt).format(D(iso)).replace(".", "");
}
/* "2026-05" → "mai/26" | "May/26" */
function fmtMonth(ym){
  if(!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  const name = new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", {month:"short"})
    .format(new Date(y, m-1, 1)).replace(".", "");
  return name + "/" + String(y).slice(2);
}
function windowLabel(a, b){
  /* Azure DevOps sem StartDate/TargetDate emite null por design (tools/mapa.mjs)
     — mesmo travessão usado no resto da página para "sem valor", em vez de
     estourar no primeiro Epic sem data. */
  if(!a || !b) return "—";
  const sameYear = a.slice(0,4) === b.slice(0,4);
  return fmtDate(a, !sameYear) + " → " + fmtDate(b, true);
}
/* "30 de setembro" | "September 30" — mês inteiro, para o rótulo do horizonte. */
function fmtDateLong(iso){
  return new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US",
    {day:"numeric", month:"long"}).format(D(iso));
}
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
/* Trimestre seguinte ao que termina em `endIso`. */
function nextQuarter(endIso){
  const e = D(endIso);
  const s = new Date(e.getFullYear(), e.getMonth() + 1, 1);
  const f = new Date(s.getFullYear(), s.getMonth() + 3, 0);
  return {start:isoOf(s), end:isoOf(f)};
}
/* "Out – Dez 2026" | "Oct – Dec 2026" */
function monthRange(aIso, bIso){
  const mn = iso => {
    const s = new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", {month:"short"})
      .format(D(iso)).replace(".", "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  return `${mn(aIso)} – ${mn(bIso)} ${bIso.slice(0,4)}`;
}
/* "2027" quando tudo começa no mesmo ano; "2027+" quando passa dele. */
function yearsLabel(list){
  /* Item sem `start` (Azure DevOps sem StartDate) não tem ano para contar —
     ele ainda aparece na lista da faixa, só não entra no cálculo do rótulo. */
  const ys = [...new Set(list.map(i => i.start).filter(Boolean).map(s => s.slice(0,4)))].sort();
  if(!ys.length) return "";
  return ys.length === 1 ? ys[0] : ys[0] + "+";
}
/* null quando falta `start` ou `end`: dado incompleto, não "0% decorrido" —
   0% afirmaria "acabou de começar", o que seria inventar informação que a
   base não tem. Quem chama trata null como "omitir a barra". */
function elapsedPct(a, b){
  if(!a || !b) return null;
  const s = D(a).getTime(), e = D(b).getTime(), n = TODAY.getTime();
  if(n <= s) return 0;
  if(e <= s) return 100;
  return Math.min(120, Math.round((n - s) / (e - s) * 100));
}
function trackName(id){
  const t = DATA.tracks.find(t => t.id === id);
  /* "—" e não "": mesmo travessão usado no resto da página para "sem valor"
     (windowLabel, status desconhecido na tabela) — em vez de uma célula em
     branco que parece dado faltando por engano, não uma ausência de propósito. */
  return t ? L(t.name) : "—";
}

/* --- REPORT MENSAL --------------------------------------------------------
   Um mês do report é a união de três fontes: o registro escrito em
   DATA.reports, as entregas (status "done" com `shipped`) e as demandas
   concluídas (status "done" com `done`). A união é o que garante que marcar
   uma entrega e esquecer de criar o registro do mês não faça a entrega sumir
   em silêncio. Ordem decrescente: o mês mais recente é o que interessa. */
function reportMonths(){
  /* A chave de mês tem de ser "AAAA-MM". O prosa.js é mantido à mão e este
     render é o mesmo das outras sete páginas: um `m` esquecido levaria a
     navegação de todas elas junto. Registro fora de forma é ignorado. */
  const ok = v => /^\d{4}-(0[1-9]|1[0-2])$/.test(v || "");
  const regs = (DATA.reports || []).filter(r => ok(r.m));
  const keys = new Set(regs.map(r => r.m));
  DATA.items.forEach(i => {
    if(i.status === "done" && ok(i.shipped)) keys.add(i.shipped);
    (i.demands || []).forEach(d => { if(d.status === "done" && ok(d.done)) keys.add(d.done); });
  });
  return [...keys].sort().reverse().map(m => {
    const reg = regs.find(r => r.m === m) || {};
    const deliveries = DATA.items.filter(i => i.status === "done" && i.shipped === m);
    const demands = DATA.items
      .map(i => ({proj:i, list:(i.demands || []).filter(d => d.status === "done" && d.done === m)}))
      .filter(g => g.list.length);
    const extra = reg.extra || [];
    const nDem = demands.reduce((s, g) => s + g.list.length, 0);
    return {m, summary:reg.summary || null, deliveries, demands, extra,
            n:deliveries.length + nDem + extra.length};
  });
}

/* "Agosto de 2026" | "August 2026" — cabeçalho do mês. O fmtMonth existente
   devolve a forma curta ("ago/26"), que é a dos cartões, não a de título. */
function fmtMonthLong(ym){
  if(!ym) return "";
  const [y, mo] = ym.split("-").map(Number);
  const name = new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", {month:"long"})
    .format(new Date(y, mo - 1, 1));
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return lang === "pt" ? `${cap} de ${y}` : `${cap} ${y}`;
}

const ICO = {
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  db:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.9-3.5 3.7-5.2 7-5.2s6.1 1.7 7 5.2"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.6 20h18.8L12 4Z"/><path d="M12 10v4.2M12 17.4h.01"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>'
};

function render(){
  const t = T[lang], m = DATA.meta;
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en-US";

  /* Título e subtítulo dependem da página atual (body[data-page]). */
  const page = document.body.dataset.page || "index";
  const PM = {
    index:{h1:L(m.title), sub:L(m.sub)},
    board:{h1:t.boardTitle, sub:t.boardSub},
    pendencias:{h1:t.askTitle, sub:t.askSub},
    produtos:{h1:t.detTitle, sub:t.detSub},
    tabela:{h1:t.detTitle, sub:t.tableSub},
    horizonte:{h1:t.horTitle, sub:t.horSub},
    report:{h1:t.repTitle, sub:t.repSub},
    completo:{h1:L(m.title), sub:L(m.sub)}
  };
  const pm = PM[page] || PM.index;
  document.title = (page === "index" || page === "completo"
    ? L(m.title) : pm.h1 + " · " + L(m.shortTitle || m.title)) + " · Ybera Group";

  $("orgLine").textContent = m.org;
  $("sideTitle").textContent = L(m.shortTitle || m.title);
  $("pageTitle").textContent = pm.h1;
  $("pageSub").textContent = pm.sub;
  $("btnPT").setAttribute("aria-pressed", lang === "pt");
  $("btnEN").setAttribute("aria-pressed", lang === "en");

  $("cycleLabel").textContent = L(m.cycle);
  $("cyclePeriod").textContent = windowLabel(m.from, m.to);
  $("updatedLine").innerHTML = ICO.clock + "<span>" + t.updated + " " + esc(fmtDate(m.updated, true)) +
    " · " + t.by + " " + esc(m.owner) + "</span>";
  $("nextLine").textContent = t.next + ": " + fmtDate(m.next);

  const items = DATA.items;
  const n = k => items.filter(i => i.status === k).length;
  const nAsk = (DATA.asks || []).length;

  /* --- faixa de atenção: só existe se algum item estiver marcado --- */
  const flagged = items.filter(i => i.health === "watch" || i.health === "blocked");
  const anyBlocked = flagged.some(i => i.health === "blocked");
  $("alertBand").innerHTML = flagged.length ? `
    <div class="alert${anyBlocked ? " blocked" : ""}">
      <div class="ah">${ICO.alert}<span>${esc(t.alertTitle)}</span></div>
      <ul>${flagged.map(i => `<li>
        <b>${esc(L(i.title))}</b> — ${esc(i.health === "blocked" ? t.alertBlocked : t.alertWatch)}.
        ${i.healthNote ? esc(L(i.healthNote)) : ""}
        <span class="who">${esc(t.by)} ${esc(i.owner || m.owner)}.</span>
      </li>`).join("")}</ul>
    </div>` : "";

  /* --- próxima data prevista: fim de janela mais próximo que ainda não passou.
         Não é promessa de entrega — é o que a base planeja. --- */
  let nd = null, ndIso = null, ndFoot = "";
  const ends = items.filter(i => i.status === "doing" && i.end >= TODAY_ISO)
                    .sort((a, b) => a.end.localeCompare(b.end));
  if(ends.length){
    nd = ends[0]; ndIso = nd.end; ndFoot = t.tileFoot.nextdEnd + L(nd.title);
  } else {
    const starts = items.filter(i => i.status === "next" && i.start >= TODAY_ISO)
                        .sort((a, b) => a.start.localeCompare(b.start));
    if(starts.length){ nd = starts[0]; ndIso = nd.start; ndFoot = t.tileFoot.nextdStart + L(nd.title); }
  }

  const tileDefs = [];
  if(n("done")) tileDefs.push({label:t.tiles.done, v:n("done"), c:"var(--good)", foot:t.tileFoot.done});
  tileDefs.push({label:t.tiles.doing, v:n("doing"), c:"var(--accent)", foot:t.tileFoot.doing});
  tileDefs.push({label:t.tiles.asks, v:nAsk, c:nAsk ? "var(--critical)" : "var(--ink-3)", flag:nAsk > 0,
                 foot:nAsk ? t.tileFoot.asksSome : t.tileFoot.asksNone});
  tileDefs.push({label:t.tiles.nextd, v:ndIso ? fmtDate(ndIso) : "—", small:true, c:"var(--ink-3)",
                 foot:nd ? ndFoot : t.tileFoot.nextdNone});
  $("tiles").innerHTML = tileDefs.map(d => `
    <div class="tile${d.flag ? " flag" : ""}">
      <div class="label"><span class="swatch" style="background:${d.c}"></span>${esc(d.label)}</div>
      <div class="val mono-num${d.small ? " small" : ""}${d.v === 0 ? " zero" : ""}">${esc(String(d.v))}</div>
      <div class="foot">${esc(d.foot)}</div>
    </div>`).join("");

  /* --- medidor do trimestre: contadores DERIVADOS dos itens com prazo na
         janela do trimestre. Nenhum número digitado à mão. --- */
  const inQ = items.filter(i => i.end >= m.quarter.start && i.end <= m.quarter.end);
  const q = {
    label:m.quarter.label,
    done:inQ.filter(i => i.status === "done").length,
    doing:inQ.filter(i => i.status === "doing").length,
    total:inQ.length
  };
  $("meterTitle").textContent = t.meter + " · " + q.label;
  $("meterValue").textContent = `${q.done} ${t.of} ${q.total} ${t.initiatives}`;
  /* Um segmento por projeto: contagem se lê como contagem — barra meio cheia
     se lia como "metade pronto" quando nada tinha concluído. */
  const mEl = $("meter");
  mEl.innerHTML = Array.from({length:q.total}, (_, k) =>
    `<i class="${k < q.done ? "done" : k < q.done + q.doing ? "doing" : ""}"></i>`).join("");
  mEl.setAttribute("aria-label", `${t.meter} ${q.label}: ${q.done} ${t.of} ${q.total} ${t.initiatives}`);
  $("meterLegend").innerHTML = [
    `<span><span class="swatch" style="background:var(--good)"></span>${esc(t.mDone)} ${q.done}</span>`,
    `<span><span class="swatch" style="background:var(--accent)"></span>${esc(t.mDoing)} ${q.doing}</span>`,
    `<span><span class="swatch" style="background:var(--grid)"></span>${esc(t.mLeft)} ${q.total - q.done - q.doing}</span>`
  ].join("");

  $("sumTitle").textContent = t.sumTitle;
  $("sumList").innerHTML = DATA.summary
    .map(s => `<li><span class="tg">${esc(L(s.tag))}</span><span>${L(s)}</span></li>`).join("");

  $("askTitle").textContent = t.askTitle;
  /* Antes esta linha ia direto pro estado vazio, sempre — então uma
     pendência escrita em prosa.js fazia o tile do Panorama contar "1" e
     esta página continuar dizendo que não há nada registrado, uma
     contradição na cara do leitor. Agora quem decide é o tamanho do array,
     igual a toda outra lista/estado-vazio do Radar (board, produtos,
     report). */
  $("askList").innerHTML = (DATA.asks || []).length
    ? `<div class="cards">${DATA.asks.map(a => askCard(a, t)).join("")}</div>`
    : emptyBox(t.askEmptyShort, t.askEmptyD, t);

  const fEl = $("filters");
  fEl.innerHTML = `<span class="flabel">${esc(t.filterLabel)}</span>` +
    `<button type="button" class="chip" data-track="__all" aria-pressed="${activeTracks.size === 0}">${esc(t.all)}</button>` +
    DATA.tracks.map(tr =>
      `<button type="button" class="chip" data-track="${esc(tr.id)}" aria-pressed="${activeTracks.has(tr.id)}">${esc(L(tr.name))}</button>`
    ).join("");
  fEl.querySelectorAll(".chip").forEach(btn => btn.addEventListener("click", () => {
    const id = btn.dataset.track;
    if(id === "__all") activeTracks.clear();
    else activeTracks.has(id) ? activeTracks.delete(id) : activeTracks.add(id);
    render();
  }));

  const visible = items.filter(i => activeTracks.size === 0 || activeTracks.has(i.track));
  const cols = [{k:"done", title:t.colDone}, {k:"doing", title:t.colDoing}, {k:"next", title:t.colNext}];
  $("boardTitle").textContent = t.boardTitle;
  $("board").innerHTML = cols.map(c => {
    const list = visible.filter(i => i.status === c.k);
    let inner;
    if(list.length) inner = list.map(i => card(i, t)).join("");
    else if(c.k === "done") inner = emptyBox(t.doneEmptyShort, t.doneEmptyD, t);
    else inner = `<div class="empty">—</div>`;
    /* Planejado fica colapsado: é a coluna mais longa e a menos urgente —
       aberta, ela rouba a atenção de "Em curso", onde está a notícia. */
    if(c.k === "next" && list.length){
      inner = `<details class="fold"${foldOpen ? " open" : ""}>
          <summary>${ICO.chev}
            <span class="lbl-show">${esc(t.foldShow.replace("{n}", list.length))}</span>
            <span class="lbl-hide">${esc(t.foldHide)}</span>
          </summary>
          <div class="cards">${inner}</div>
        </details>
        <div class="print-only pnote">${esc(t.printPlanned.replace("{n}", list.length))}</div>`;
    }
    return `
      <div class="col" data-k="${c.k}">
        <div class="col-head">
          <span class="cdot"></span><h3>${esc(c.title)}</h3>
          <span class="count mono-num">${list.length}</span>
        </div>
        <div class="cards">${inner}</div>
      </div>`;
  }).join("") + (() => {
    /* "Sem status": estado do Azure DevOps fora do mapa de tools/config.json
       vira status:null por design (tools/mapa.mjs), não item descartado —
       mesmo raciocínio do grupo "sem produto" logo abaixo. Sem este grupo, o
       item não cai em done/doing/next (guardaStatusVazio's comment confirma
       que isso é esperado) e some das três colunas e da contagem de tiles
       sem deixar rastro, mesmo enquanto a tabela de produtos ainda o conta no
       total de itens. Não é uma quarta coluna: uma quarta coluna daria a um
       estado de ferramenta desconfigurada o mesmo peso visual de uma etapa
       real do fluxo, o que é falso. Só aparece quando existe pelo menos um
       caso. */
    const semStatus = visible.filter(i => i.status === null).sort((a, b) => a.id - b.id);
    if(!semStatus.length) return "";
    return `<div class="prod" data-track="__sem-status">
      <div class="prod-head">
        <h3>${esc(t.noStatusTitle)}</h3>
        <span class="pn mono-num">${semStatus.length} ${semStatus.length === 1 ? t.projectOne : t.projectMany}</span>
      </div>
      <p class="prod-about">${esc(t.noStatusDesc)}</p>
      <div class="cards">${semStatus.map(i => card(i, t)).join("")}</div>
    </div>`;
  })();
  const foldEl = $("board").querySelector(".fold");
  if(foldEl) foldEl.addEventListener("toggle", () => { foldOpen = foldEl.open; });

  /* --- produtos: cada produto (derivado da Area Path no Azure DevOps) com os projetos
         dentro dele. Dentro do produto, em curso primeiro e depois pela data
         de início. Produto sem projeto não vira bloco vazio. --- */
  $("detTitle").textContent = t.detTitle;
  $("detSub").textContent = t.detSub;
  const ordDet = {doing:0, next:1, done:2};
  /* Data ausente não pode estourar o sort: cai por último entre iguais,
     ordem estável em vez de exceção. */
  const byStartThenStatus = (a, b) =>
    ordDet[a.status] - ordDet[b.status] || (a.start || "").localeCompare(b.start || "");
  $("detList").innerHTML = DATA.tracks.map(tr => {
    const list = items.filter(i => i.track === tr.id).sort(byStartThenStatus);
    if(!list.length) return "";
    const nDoing = list.filter(i => i.status === "doing").length;
    const meta = [`${list.length} ${list.length === 1 ? t.projectOne : t.projectMany}`];
    if(nDoing) meta.push(`${nDoing} ${t.doingLower}`);
    return `<div class="prod" data-track="${esc(tr.id)}">
      <div class="prod-head">
        <h3>${esc(L(tr.name))}</h3>
        <span class="pn mono-num">${esc(meta.join(" · "))}</span>
      </div>
      ${tr.about ? `<p class="prod-about">${esc(L(tr.about))}</p>` : ""}
      <div class="det">${list.map(i => projRow(i, t, m)).join("")}</div>
    </div>`;
  }).join("") + (() => {
    /* "Sem produto": Area Path fora da tabela de tools/config.json vira
       track:null por design (tools/mapa.mjs), não item descartado. Sem este
       grupo, DATA.tracks.map acima nunca itera esses itens e eles somem da
       página sem deixar rastro — com o config.json de areas vazio hoje, seria
       os 14 de uma vez. Só aparece quando existe pelo menos um caso. */
    const semProduto = items.filter(i => i.track === null).sort(byStartThenStatus);
    if(!semProduto.length) return "";
    return `<div class="prod" data-track="__sem-produto">
      <div class="prod-head">
        <h3>${esc(t.noTrackTitle)}</h3>
        <span class="pn mono-num">${semProduto.length} ${semProduto.length === 1 ? t.projectOne : t.projectMany}</span>
      </div>
      <p class="prod-about">${esc(t.noTrackDesc)}</p>
      <div class="det">${semProduto.map(i => projRow(i, t, m)).join("")}</div>
    </div>`;
  })();

  /* --- alternador: as duas telas mostram os mesmos projetos, uma agrupada
         por produto e outra em tabela para comparar. --- */
  $("views").innerHTML = [
    {p:"produtos", href:"produtos.html",        label:t.viewCards},
    {p:"tabela",   href:"produtos-tabela.html", label:t.viewTable}
  ].map(v => `<a class="vbtn" href="${v.href}" aria-current="${String(v.p === page)}">${esc(v.label)}</a>`)
   .join("");

  /* --- tabela: os mesmos projetos em linhas comparáveis. O filtro de produto
         reaproveita os chips do board (mesmo activeTracks); o de status é
         próprio desta tela. Ordenação por clique no cabeçalho. --- */
  const stLabel = {done:t.colDone, doing:t.colDoing, next:t.colNext};
  const sEl = $("sfilters");
  sEl.innerHTML = `<span class="flabel">${esc(t.filterStatus)}</span>` +
    `<button type="button" class="chip" data-st="__all" aria-pressed="${activeStatus.size === 0}">${esc(t.all)}</button>` +
    ["doing","next","done"].map(k =>
      `<button type="button" class="chip" data-st="${k}" aria-pressed="${activeStatus.has(k)}">${esc(stLabel[k])}</button>`
    ).join("");
  sEl.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.st;
    if(k === "__all") activeStatus.clear();
    else activeStatus.has(k) ? activeStatus.delete(k) : activeStatus.add(k);
    render();
  }));

  const tIdx = {};
  DATA.tracks.forEach((tr, k) => { tIdx[tr.id] = String(k).padStart(2, "0"); });
  const ordSt = {doing:0, next:1, done:2};
  const rows = items.filter(i =>
    (activeTracks.size === 0 || activeTracks.has(i.track)) &&
    (activeStatus.size === 0 || activeStatus.has(i.status)));
  /* Cada coluna vira uma chave comparável. Produto ordena pela ordem dos
     produtos na base (não alfabética) e desempata por status e início. */
  const keyOf = {
    /* track:null (sem produto, ou track inválido normalizado por fundir())
       não tem entrada em tIdx — "zz" o manda para o fim da ordenação por
       produto de forma estável, em vez do "NaN..." que a concatenação direta
       produzia (tIdx[null] é undefined, e undefined + número é NaN). */
    prod:i => (tIdx[i.track] ?? "zz") + ordSt[i.status] + i.start,
    proj:i => L(i.title).toLowerCase(),
    stat:i => String(ordSt[i.status]) + i.start,
    /* i.start/i.end concatenados direto viravam número quando os dois eram
       null (null + null = 0 em JS) e string "nullAAAA-MM-DD" quando só um
       era — os dois arbitrários, não ordenáveis de propósito. "" no lugar de
       null mantém a chave sempre string e sempre comparável. */
    win:i => (i.start || "") + (i.end || ""),
    elapsed:i => String(i.status === "doing" ? (elapsedPct(i.start, i.end) ?? -1) : -1).padStart(4, "0"),
    dem:i => {
      const dm = i.demands || [];
      return String(dm.length ? Math.round(dm.filter(d => d.status === "done").length / dm.length * 100) : -1).padStart(4, "0");
    },
    owner:i => (i.owner || m.owner).toLowerCase()
  };
  const kf = keyOf[tSort.key] || keyOf.prod;
  rows.sort((a, b) => {
    const x = kf(a), y = kf(b);
    return (x < y ? -1 : x > y ? 1 : 0) * tSort.dir;
  });
  /* Coluna sem um unico valor nao e informacao, e largura gasta: Demandas so
     entra na grade quando alguem registrou alguma. */
  const anyDem = items.some(i => (i.demands || []).length);
  const tCols = [
    {k:"prod", label:t.colProd, cls:"tprod"},
    {k:"proj", label:t.colProj},
    {k:"stat", label:t.colStat},
    {k:"win", label:t.colWin},
    {k:"elapsed", label:t.colElapsed, num:true},
    {k:"dem", label:t.colDem, num:true},
    {k:"owner", label:t.colOwner}
  ].filter(c => c.k !== "dem" || anyDem);
  if(!anyDem && tSort.key === "dem") tSort.key = "prod";
  $("projTable").innerHTML = `
    <thead><tr>${tCols.map(c => {
      const on = tSort.key === c.k;
      const cls = [c.num ? "num" : "", c.cls || ""].filter(Boolean).join(" ");
      return `<th data-k="${c.k}"${cls ? ` class="${cls}"` : ""} aria-sort="${on ? (tSort.dir === 1 ? "ascending" : "descending") : "none"}">
        <button type="button">${esc(c.label)}<span class="sar">${on ? (tSort.dir === 1 ? "↑" : "↓") : ""}</span></button></th>`;
    }).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map(i => {
      const dm = i.demands || [];
      const raw = i.status === "doing" ? elapsedPct(i.start, i.end) : null;
      const p = raw === null ? null : Math.min(raw, 100);
      const el = p === null
        ? "—"
        : `<span class="tel" aria-hidden="true"><i style="width:${p}%"></i></span>${p}%`;
      return `<tr>
        <td class="tprod">${esc(trackName(i.track))}</td>
        <td class="tproj">${esc(L(i.title))}${i.semProsa ? `<span class="noprosa" title="${esc(t.noProsaTitle)}">${esc(t.noProsa)}</span>` : ""}<span class="tprod-in">${esc(trackName(i.track))}</span></td>
        <td><span class="pstatus st-${esc(i.status)}">${esc(stLabel[i.status] || "—")}</span></td>
        <td class="mono-num">${esc(windowLabel(i.start, i.end))}</td>
        <td class="num mono-num">${el}</td>
        ${anyDem ? `<td class="num mono-num">${dm.length ? dm.filter(d => d.status === "done").length + "/" + dm.length : "—"}</td>` : ""}
        <td>${esc(i.owner || m.owner)}</td>
      </tr>`;
    }).join("") : `<tr><td colspan="${tCols.length}" class="tnone">${esc(t.tEmpty)}</td></tr>`}</tbody>`;
  $("projTable").querySelectorAll("th button").forEach(b => b.addEventListener("click", () => {
    const k = b.parentElement.dataset.k;
    if(tSort.key === k) tSort.dir = -tSort.dir;
    else { tSort.key = k; tSort.dir = 1; }
    render();
  }));
  $("tCount").textContent = t.tCount
    .replace("{n}", rows.length).replace("{total}", items.length);

  /* --- horizonte DERIVADO das datas dos projetos: cada um cai numa faixa
         pela data de início, contra o trimestre corrente. Antes as três
         listas eram digitadas à mão e podiam discordar do board — agora
         mudar um período move o card de faixa sozinho. Entregues saem: são
         história, e o lugar deles é a coluna Entregue do board. --- */
  $("horTitle").textContent = t.horTitle;
  const nq = nextQuarter(m.quarter.end);
  const band = {now:[], next:[], later:[]};
  /* Item sem `start` (Azure DevOps sem StartDate) não entra em NENHUMA
     faixa: `null <= data` é sempre false em JS, então antes esse item caía
     sempre em "later" — o que afirma "começa depois do próximo trimestre",
     um fato que a base não tem como sustentar. Mesmo raciocínio da barra de
     decorrido omitida em vez de desenhada a 0%: sem dado, não se inventa
     posição. Vai para o grupo "sem data" logo abaixo em vez disso. */
  const semData = [];
  items.filter(i => i.status !== "done")
       .sort((a, b) => (a.start || "").localeCompare(b.start || "") || (a.end || "").localeCompare(b.end || ""))
       .forEach(i => {
         if(!i.start){ semData.push(i); return; }
         band[i.start <= m.quarter.end ? "now" : i.start <= nq.end ? "next" : "later"].push(i);
       });
  const hLabel = {now:t.horNow, next:t.horNext, later:t.horLater};
  const hConf  = {now:t.confNow, next:t.confNext, later:t.confLater};
  const hWhen  = {
    now:t.horUntil.replace("{d}", fmtDateLong(m.quarter.end)),
    next:monthRange(nq.start, nq.end),
    later:yearsLabel(band.later)
  };
  $("horizon").innerHTML = ["now","next","later"].map(k => {
    const list = band[k];
    if(!list.length) return "";
    return `
      <div class="hcard" data-h="${k}">
        <div class="ht"><h3>${esc(hLabel[k])}</h3><span class="hw">${esc(hWhen[k])}</span></div>
        <span class="conf">${esc(hConf[k])}</span>
        <ul>${list.map(i => `<li><span>${esc(L(i.title))}</span></li>`).join("")}</ul>
      </div>`;
  }).join("") + (() => {
    /* Mesmo padrão do "sem produto" (produtos.html) e do "sem status"
       (board.html): grupo próprio, abaixo das três faixas reais, só quando
       existe pelo menos um caso — não uma quarta faixa com o mesmo peso
       visual das outras três. */
    if(!semData.length) return "";
    return `<div class="prod" data-track="__sem-data">
      <div class="prod-head">
        <h3>${esc(t.noDateTitle)}</h3>
        <span class="pn mono-num">${semData.length} ${semData.length === 1 ? t.projectOne : t.projectMany}</span>
      </div>
      <p class="prod-about">${esc(t.noDateDesc)}</p>
      <div class="cards">${semData.map(i => card(i, t)).join("")}</div>
    </div>`;
  })();

  const footLines = [];
  /* "Fale com o PO" precisa ser um clique, não uma instrução. No papel o link
     não clica, então o endereço aparece escrito. */
  const c = m.contact || {};
  const who = c.href ? `<a href="${esc(c.href)}">${esc(m.owner)}</a>` : esc(m.owner);
  const addr = c.address ? ` <span class="print-inline">&lt;${esc(c.address)}&gt;</span>` : "";
  footLines.push(`<span>${esc(t.footNote)} ${who}${addr} · ${esc(L(m.ownerRole))}</span>`);
  if(m.url) footLines.push(`<span>${esc(t.footUrl)} <a href="${esc(m.url)}">${esc(m.url)}</a></span>`);
  /* A procedência ficava na página "Como ler", que saiu. Ela desce para o
     rodapé em letra miúda: de onde vêm os números, de quanto em quanto tempo
     mudam e o que esta base não responde. Sem isso a página vira afirmação
     sem fonte. */
  footLines.push(`<span class="fine">${esc(t.footSource.replace("{d}", fmtDate(m.updated, true)))} ${esc(t.footCadence)}</span>`);
  footLines.push(`<span class="fine">${esc(t.footLimit)}</span>`);
  $("foot").innerHTML = footLines.join("");

  /* --- REPORT MENSAL -----------------------------------------------------
     Abre no mês mais recente. `?m=AAAA-MM` abre naquele mês; parâmetro
     ausente, inválido ou de mês inexistente cai no mais recente sem erro —
     é a mesma tolerância do `?print=1`. Os demais meses vão recolhidos: a
     regra de impressão já esconde `.fold`, então no papel sai só o mês
     aberto, que é o que se cola num deck. --- */
  const months = reportMonths();
  if(!months.length){
    $("repNow").innerHTML = emptyBox(t.repEmptyShort, t.repEmptyD, t);
    $("repPast").innerHTML = "";
  } else {
    const wanted = new URLSearchParams(location.search).get("m");
    const openIdx = Math.max(0, months.findIndex(r => r.m === wanted));
    const cur = months[openIdx];
    const count = monthCount(cur, t);
    $("repNow").innerHTML =
      `<div class="sec-head"><h2>${esc(fmtMonthLong(cur.m))}</h2></div>` +
      (count ? `<div class="strip"><span class="meta">${esc(count)}</span></div>` : "") +
      monthBlock(cur, t);
    $("repPast").innerHTML = months.filter((_, k) => k !== openIdx).map(r =>
      `<details class="fold">
        <summary>${ICO.chev}<span>${esc(fmtMonthLong(r.m))}</span></summary>
        <div class="det">${monthBlock(r, t)}</div>
      </details>`).join("");
  }

  $("navList").innerHTML = navHtml(t);
  syncThemeBtn();
  navReveal();
}

/* Uma linha, e o motivo atrás de "por quê?". A explicação continua na
   página — só não custa mais um parágrafo de leitura a cada visita. */
function emptyBox(curta, longa, t){
  return `<div class="empty">
    <span class="et">${esc(curta)}</span>
    <details><summary>${esc(t.whyLink)}</summary>
      <div class="why-full">${longa}</div>
    </details>
  </div>`;
}

/* Navegação: links entre as páginas. Os contadores são derivados; nada digitado. */
function navHtml(t){
  const flagged = DATA.items.filter(i => i.health === "watch" || i.health === "blocked").length;
  const nAsk = (DATA.asks || []).length;
  const nDem = DATA.items.reduce((n, i) => n + (i.demands || []).filter(d => d.status === "doing").length, 0);
  const nRep = (reportMonths()[0] || {}).n || 0;
  const defs = [
    {href:"index.html",      page:"index",      label:t.navTop},
    {href:"board.html",      page:"board",      label:t.navBoard, badge:DATA.items.length, dot:flagged > 0},
    {href:"pendencias.html", page:"pendencias", label:t.navAsk,   badge:nAsk, hot:true},
    {href:"produtos.html",   page:"produtos",   label:t.navDet,   badge:nDem},
    {href:"report.html",     page:"report",     label:t.navRep,   badge:nRep},
    {href:"horizonte.html",  page:"horizonte",  label:t.navHor}
  ];
  /* A tabela é outra vista de Produtos, não outra seção: o item da navegação
     que acende é o mesmo. */
  const page = document.body.dataset.page || "index";
  const cur = page === "tabela" ? "produtos" : page;
  return defs.map(d => {
    let extra = "";
    if(d.dot) extra = `<span class="dot" title="${esc(t.alertTitle)}"></span>`;
    else if(d.badge) extra = `<span class="nb${d.hot ? " hot" : ""} mono-num">${d.badge}</span>`;
    return `<li><a href="${d.href}" aria-current="${String(d.page === cur)}">${esc(d.label)}${extra}</a></li>`;
  }).join("");
}

/* Barra estreita: deixa o item da página atual visível ao carregar.
   No desktop a lista é vertical e sem overflow — vira um no-op. */
function navReveal(){
  const nav = $("navList");
  const act = nav.querySelector && nav.querySelector('a[aria-current="true"]');
  if(act && nav.scrollWidth > nav.clientWidth)
    act.scrollIntoView({inline:"center", block:"nearest", behavior:"instant"});
}

/* Um projeto dentro do produto: descrição, demandas e rastreio. O selo de
   produto saiu do corpo — o cabeçalho do bloco acima já diz de qual é. */
function projRow(i, t, m){
  const stLabel = {done:t.colDone, doing:t.colDoing, next:t.colNext};
  const dm = i.demands || [];
  const dDone = dm.filter(d => d.status === "done").length;
  const dDoing = dm.filter(d => d.status === "doing").length;
  const prog = dm.length ? `
    <span class="dprog mono-num">${dDone}/${dm.length}</span>
    <span class="dmeter">${dm.map((_, k) =>
      `<i class="${k < dDone ? "done" : k < dDone + dDoing ? "doing" : ""}"></i>`).join("")}</span>` : "";
  const list = dm.length
    ? `<ul class="dlist">${dm.map(d => `<li class="d-${esc(d.status)}">
        <span class="dic">${d.status === "done" ? ICO.check : ""}</span>
        <span>${esc(L(d.t))}${d.due ? ` <span class="ddue mono-num">· ${esc(fmtDate(d.due))}</span>` : ""}</span>
      </li>`).join("")}</ul>`
    : `<p class="dnone">${esc(t.demandsNone)}</p>`;
  const rawEp = i.status === "doing" ? elapsedPct(i.start, i.end) : null;
  const ep = rawEp === null ? null : Math.min(rawEp, 100);
  const elapsed = ep === null ? "" : `<div class="elapsed">
      <div class="pl"><span>${esc(t.elapsed)}</span><b class="mono-num">${ep}%</b></div>
      <div class="bar"><i style="width:${ep}%"></i></div>
    </div>`;
  const noProsa = i.semProsa ? `<span class="noprosa" title="${esc(t.noProsaTitle)}">${esc(t.noProsa)}</span>` : "";
  return `<details class="proj" data-st="${esc(i.status)}">
    <summary>
      ${ICO.chev}
      <span class="ptitle">${esc(L(i.title))}</span>
      ${noProsa}
      <span class="pstatus st-${esc(i.status)}">${esc(stLabel[i.status] || "—")}</span>
      ${prog}
    </summary>
    <div class="proj-body">
      <p class="about">${esc(L(i.about))}</p>
      <h5 class="dh">${esc(t.demandsTitle)}</h5>
      ${list}
      ${elapsed}
      <div class="row">
        <span class="k">${ICO.cal}${esc(t.window)}: ${esc(windowLabel(i.start, i.end))}</span>
        <span class="k">${ICO.user}${esc(i.owner || m.owner)}</span>
        ${i.semProsa ? "" : `<span class="k">${ICO.db}<span>${esc(t.srcLabel)} ${esc(i.azureTitle)}</span></span>`}
      </div>
    </div>
  </details>`;
}

/* Contagem do mês. Só conta o que pertence ao mês: "3 frentes em curso" seria
   fato do presente e estaria errado num mês passado. */
function monthCount(r, t){
  const nDem = r.demands.reduce((s, g) => s + g.list.length, 0);
  const bits = [];
  if(r.deliveries.length) bits.push(r.deliveries.length + " " +
    (r.deliveries.length === 1 ? t.repOneDelivery : t.repManyDeliveries));
  if(nDem) bits.push(nDem + " " + (nDem === 1 ? t.repOneDemand : t.repManyDemands));
  if(r.extra.length) bits.push(r.extra.length + " " +
    (r.extra.length === 1 ? t.repOneExtra : t.repManyExtra));
  return bits.join(" · ");
}

/* O corpo de um mês. Nenhum componente novo: entrega é o mesmo card da coluna
   Entregue do board, demanda concluída é a mesma lista com check do acordeão
   de Produtos, e o que foi escrito à mão usa exatamente a mesma lista. */
function doneList(rows){
  return `<ul class="dlist">${rows.map(d => `<li class="d-done">
      <span class="dic">${ICO.check}</span>
      <span>${esc(L(d.t))}</span>
    </li>`).join("")}</ul>`;
}
function monthBlock(r, t){
  const parts = [];
  if(r.summary) parts.push(
    `<div class="summary"><ul><li><span>${esc(L(r.summary))}</span></li></ul></div>`);
  if(r.deliveries.length) parts.push(
    `<div class="cards">${r.deliveries.map(i => card(i, t)).join("")}</div>`);
  r.demands.forEach(g => parts.push(
    `<h4 class="dh">${esc(L(g.proj.title))}</h4>${doneList(g.list)}`));
  if(r.extra.length) parts.push(
    `<h4 class="dh">${esc(t.repExtra)}</h4>${doneList(r.extra)}`);
  if(!parts.length) parts.push(`<div class="empty">${esc(t.repMonthEmpty)}</div>`);
  return parts.join("");
}

function card(i, t){
  /* A linha de rastreio existe para ligar um título reescrito ao item de
     origem. Sem redação, o título exibido JÁ é o do Azure, e a linha só
     repetia o mesmo texto duas vezes no cartão — o selo "sem redação" já diz
     que a origem é crua. */
  const src = (i.azureTitle && !i.semProsa)
    ? `<div class="src">${ICO.db}<span>${esc(t.srcLabel)} ${esc(i.azureTitle)}</span></div>` : "";
  let mid = "";
  if(i.status === "doing"){
    const p = elapsedPct(i.start, i.end);
    /* p null (sem start/end) omite a barra inteira em vez de assumir 0% —
       0% diria "acabou de começar", que a base não tem como afirmar. */
    if(p !== null){
      const over = p >= 100;
      mid = `<div class="elapsed">
          <div class="pl"><span>${esc(over ? t.over : t.elapsed)}</span><b class="mono-num">${Math.min(p,100)}%</b></div>
          <div class="bar" role="img" aria-label="${Math.min(p,100)}% ${esc(t.elapsed)}"><i class="${over ? "over" : ""}" style="width:${Math.min(p,100)}%"></i></div>
        </div>`;
    }
  }
  /* Selo de saúde só em quem está fora do prazo. Card sem selo = no prazo:
     14 selos verdes não informam nada e ainda escondem o que importa. */
  const bad = i.health === "watch" || i.health === "blocked";
  const pill = bad
    ? `<span class="hp ${esc(i.health)}">${ICO.alert}${esc(i.health === "blocked" ? t.alertBlocked : t.alertWatch)}</span>` : "";
  /* Sem redação: fato existe, texto editorial não — mesmo vocabulário visual
     do selo de saúde, mas neutro (não é alarme, é lembrete de tarefa). */
  const noProsa = i.semProsa
    ? `<span class="noprosa" title="${esc(t.noProsaTitle)}">${esc(t.noProsa)}</span>` : "";
  const hnote = bad && i.healthNote ? `<p class="hnote">${esc(L(i.healthNote))}</p>` : "";
  const result = i.result
    ? `<div class="result">${ICO.check}<span><b>${esc(t.resultLabel)}</b> ${esc(L(i.result))}</span></div>` : "";
  const when = i.status === "done" && i.shipped
    ? `${ICO.cal}${esc(t.live)} ${esc(fmtMonth(i.shipped))}`
    : `${ICO.cal}${esc(t.window)}: ${esc(windowLabel(i.start, i.end))}`;
  return `<article class="card${bad ? " " + esc(i.health) : ""}">
    <span class="tag">${esc(trackName(i.track))}</span>${pill}${noProsa}
    <h4>${esc(L(i.title))}</h4>
    <p class="why">${esc(L(i.why))}</p>
    ${hnote}
    ${mid}
    ${result}
    <div class="row">
      <span class="k">${when}</span>
      <span class="k">${ICO.user}${esc(i.owner || DATA.meta.owner)}</span>
    </div>
    ${src}
  </article>`;
}

/* Cartão de uma pendência. Mesmo vocabulário do cartão de projeto acima —
   chip, título, nota e linha de meta — para não inventar um padrão novo só
   porque a fonte do dado é outra. Prazo estourado é a informação mais
   importante desta página, então empresta o selo e a borda vermelha que o
   resto do Radar já usa para "travado" (.hp.blocked / .card.blocked), em vez
   de criar uma terceira cor de alerta. */
function askCard(a, t){
  const overdue = !!(a.by && a.by < TODAY_ISO);
  /* item aponta pro id do work item em fatos.js/prosa.js — mostra o título
     EDITORIAL (o mesmo do board), nunca o azureTitle cru: quem lê esta
     página não abriu o Azure DevOps. */
  const proj = a.item != null ? DATA.items.find(i => i.id === a.item) : null;
  const tag = proj ? `<span class="tag">${esc(L(proj.title))}</span>` : "";
  const pill = overdue ? `<span class="hp blocked">${ICO.alert}${esc(t.askOverdue)}</span>` : "";
  const impact = a.impact ? `<p class="hnote">${esc(L(a.impact))}</p>` : "";
  const by = a.by
    ? `<span class="k">${ICO.cal}${esc(t.askByLabel)}: ${esc(fmtDate(a.by, true))}</span>` : "";
  return `<article class="card${overdue ? " blocked" : ""}">
    ${tag}${pill}
    <h4>${esc(L(a.what))}</h4>
    ${impact}
    <div class="row">
      <span class="k">${ICO.user}${esc(t.askWhoLabel)}: ${esc(a.who)}</span>
      ${by}
    </div>
  </article>`;
}

$("btnPT").addEventListener("click", () => { lang = "pt"; localStorage.setItem("radar-lang", "pt"); render(); });
$("btnEN").addEventListener("click", () => { lang = "en"; localStorage.setItem("radar-lang", "en"); render(); });
/* Report e versão completa se imprimem; as páginas de seção passam pela
   completa, que é a que tem o briefing de uma página pensado para papel. */
$("btnPrint").addEventListener("click", () => {
  const p = document.body.dataset.page || "";
  if(p === "completo" || p === "report") window.print();
  else location.href = "completo.html?print=1";
});
function isDarkNow(){
  const cur = document.documentElement.getAttribute("data-theme");
  return cur === "dark" || (cur !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
/* O botão mostra o destino do clique: lua no claro, sol no escuro. */
function syncThemeBtn(){
  const dark = isDarkNow(), b = $("btnTheme");
  b.innerHTML = dark ? ICO.sun : ICO.moon;
  b.setAttribute("aria-label", dark ? T[lang].themeLight : T[lang].themeDark);
}
$("btnTheme").addEventListener("click", () => {
  const next = isDarkNow() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("radar-theme", next);
  syncThemeBtn();
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeBtn);

/* No papel os "por quê?" dos estados vazios saem escritos, não recolhidos. */
window.addEventListener("beforeprint", () => {
  document.querySelectorAll(".empty details").forEach(d => d.open = true);
});

render();

/* completo.html?print=1: chegou aqui pelo botão de imprimir de outra página. */
if((document.body.dataset.page || "") === "completo" && new URLSearchParams(location.search).has("print"))
  setTimeout(() => window.print(), 350);
