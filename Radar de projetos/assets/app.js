/* ==========================================================================
   Radar de Projetos USA — motor compartilhado das páginas.
   Os dados moram em data.js (carregado antes deste arquivo). Cada página
   declara body[data-page] e contém só os contêineres da sua seção; o motor
   preenche o que existir. A versão completa (completo.html) contém tudo.
   ==========================================================================
   2) TEXTOS FIXOS
   ========================================================================== */
const T = {
  pt:{
    updated:"Atualizado em", next:"Próxima atualização", by:"por",
    tiles:{done:"Entregue", doing:"Em curso", asks:"Esperando vocês", nextd:"Próxima data prevista"},
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
    navTop:"Panorama", navEss:"O essencial", navChg:"Mudou", navAsk:"Com vocês",
    navBoard:"Projetos", navDet:"Detalhe", navHor:"Horizonte", navHow:"Como ler",
    howTitle:"Como ler esta página",
    howLegend:"As colunas e os selos", howItems:"Os projetos",
    howChg:"O bloco “o que mudou”", howHor:"O horizonte", howSource:"Fonte e limites",
    whyLink:"por quê?",
    themeDark:"Mudar para tema escuro", themeLight:"Mudar para tema claro",
    sumTitle:"O essencial",
    sumSub:"Se você só tiver um minuto, leia esta parte.",
    chgTitle:"O que mudou nesta quinzena",
    chgSub:"Para quem já leu a página antes: só o movimento, sem reler os cards. As linhas marcadas “base” saem das datas do Notion; as outras são escritas na revisão quinzenal.",
    chgEmptyT:"Primeira edição desta página",
    chgEmptyD:"Não há quinzena anterior para comparar. A partir da próxima atualização este bloco lista o que entrou, o que mudou de data, o que foi ao ar e o que saiu do plano.",
    kinds:{shipped:"No ar", start:"Começou", starting:"Começa", due:"Fecha a janela",
           moved:"Mudou", late:"Atrasou", newi:"Novo", out:"Saiu"},
    fromBase:"base",
    chgFirst:"Primeira edição: não há quinzena anterior para comparar.",
    askTitle:"Precisamos de vocês",
    askSub:"O que está parado esperando uma decisão ou atenção de fora do time de produto.",
    askEmptyShort:"Nenhuma decisão esperando vocês nesta quinzena.",
    askEmptyT:"Nenhuma decisão registrada",
    askEmptyD:"As colunas <b>Decisões</b> e <b>Ações</b> da base Projetos estão vazias em todas as 32 linhas. Enquanto elas não forem preenchidas, esta seção não tem o que mostrar — e decisões travadas seguem invisíveis para quem precisa decidir.",
    boardTitle:"Quadro de projetos",
    boardSub:"Cada item está escrito pelo que o usuário passa a conseguir fazer. O nome original no Notion aparece embaixo, para rastreio.",
    detTitle:"Projetos em detalhe",
    detSub:"O que é cada projeto e as demandas acompanhadas dentro dele. Abra um projeto para ler a descrição; a lista de demandas é mantida à mão na revisão quinzenal.",
    demandsTitle:"Demandas",
    demandsNone:"Sem demandas registradas ainda — entram na próxima revisão quinzenal.",
    colDone:"Entregue", colDoing:"Em curso", colNext:"Planejado",
    doneEmptyShort:"Histórico em levantamento — entra na próxima atualização.",
    doneEmptyT:"Histórico em levantamento",
    doneEmptyD:"Na base Projetos o campo Status nunca assume “Concluído” — só “Não iniciado”, “Em andamento” e “Descontinuado” — então não há de onde puxar entrega fechada. O que já está no ar está sendo levantado à mão e entra na próxima atualização. Enquanto isso, esta coluna vazia diz respeito à base, não ao trabalho.",
    all:"Todos", filterLabel:"Filtrar por produto:",
    window:"Janela", elapsed:"Janela decorrida", over:"Janela vencida",
    live:"No ar desde", resultLabel:"Resultado:",
    foldShow:"Ver os {n} projetos planejados", foldHide:"Esconder os planejados",
    printPlanned:"Os {n} projetos planejados estão listados na seção Horizonte, adiante — sem repetir os cards aqui.",
    horTitle:"Horizonte",
    horSub:"Quanto mais longe, menos preciso — de propósito. As datas vêm do período de cada projeto no Notion.",
    legTitle:"Como ler esta página",
    legDone:"Entregue", legDoneD:"Está no ar e pode ser usado hoje. Vazio por ora: o histórico está sendo levantado à mão, porque a base não registra conclusão.",
    legDoneFull:"Está no ar e pode ser usado hoje. Quando houver número medido, ele aparece na linha “Resultado” do card.",
    legDoing:"Em curso", legDoingD:"Em construção agora. A barra mostra quanto da janela planejada já passou — não quanto do trabalho está pronto.",
    legNext:"Planejado", legNextD:"Tem período definido no Notion e ainda não começou. A ordem pode mudar se a prioridade mudar.",
    legHealth:"Atenção / Travado", legHealthD:"Card sem selo está no prazo. Selo amarelo é risco de atrasar; vermelho é parado esperando algo. Sempre vem com o motivo.",
    legOwner:"Dono", legOwnerD:"Cada card traz o PO responsável. É com essa pessoa que você fala — não precisa procurar quem toca o assunto.",
    footSource:"Fonte: base Projetos (Notion · espaço Ecommerce & Growth), filtro Frente = USA — 14 de 32 projetos. Extração de 11/08/2026.",
    footCadence:"Cadência: uma atualização a cada duas semanas.",
    footLimit:"Limitação conhecida: esta base descreve projetos de 1 a 4 meses, não entregas de sprint. Ela responde bem “o que está planejado”; para “o que foi entregue nesta quinzena” a fonte é o board de sprints.",
    footNote:"Dúvida ou correção? Fale com",
    footUrl:"Página sempre atualizada:"
  },
  en:{
    updated:"Updated", next:"Next update", by:"by",
    tiles:{done:"Shipped", doing:"In flight", asks:"Waiting on you", nextd:"Next expected date"},
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
    navTop:"Overview", navEss:"Essentials", navChg:"Changed", navAsk:"On you",
    navBoard:"Projects", navDet:"Detail", navHor:"Horizon", navHow:"How to read",
    howTitle:"How to read this page",
    howLegend:"The columns and the badges", howItems:"The projects",
    howChg:"The “what changed” block", howHor:"The horizon", howSource:"Source and limits",
    whyLink:"why?",
    themeDark:"Switch to dark theme", themeLight:"Switch to light theme",
    sumTitle:"The essentials",
    sumSub:"If you only have a minute, read this part.",
    chgTitle:"What changed this cycle",
    chgSub:"For anyone who read this page before: the movement only, without re-reading the cards. Lines tagged “source” come from the Notion dates; the rest are written during the biweekly review.",
    chgEmptyT:"First edition of this page",
    chgEmptyD:"There is no previous cycle to compare against. From the next update on, this block lists what started, what moved, what shipped and what dropped out of the plan.",
    kinds:{shipped:"Shipped", start:"Started", starting:"Starts", due:"Window closes",
           moved:"Changed", late:"Late", newi:"New", out:"Dropped"},
    fromBase:"source",
    chgFirst:"First edition: there is no previous cycle to compare against.",
    askTitle:"We need you",
    askSub:"What is stalled waiting on a decision or attention from outside the product team.",
    askEmptyShort:"No decision waiting on you this cycle.",
    askEmptyT:"No decisions recorded",
    askEmptyD:"The <b>Decisões</b> and <b>Ações</b> columns in the Projetos database are empty across all 32 rows. Until they're filled, this section has nothing to show — and blocked decisions stay invisible to the people who need to make them.",
    boardTitle:"Project board",
    boardSub:"Every item is written as what the user can now do. The original Notion name appears below it, for traceability.",
    detTitle:"Projects in detail",
    detSub:"What each project is and the demands tracked inside it. Open a project to read its description; the demand list is maintained by hand during the biweekly review.",
    demandsTitle:"Demands",
    demandsNone:"No demands recorded yet — they land in the next biweekly review.",
    colDone:"Shipped", colDoing:"In flight", colNext:"Planned",
    doneEmptyShort:"History being compiled — lands in the next update.",
    doneEmptyT:"History being compiled",
    doneEmptyD:"In the Projetos database, Status never takes “Concluído” — only “Não iniciado”, “Em andamento” and “Descontinuado” — so there is no closed delivery to pull. What is already live is being compiled by hand and lands in the next update. Until then, this empty column is about the database, not about the work.",
    all:"All", filterLabel:"Filter by product:",
    window:"Window", elapsed:"Window elapsed", over:"Window overdue",
    live:"Live since", resultLabel:"Result:",
    foldShow:"Show the {n} planned projects", foldHide:"Hide the planned ones",
    printPlanned:"The {n} planned projects are listed in the Horizon section below — not repeated as cards here.",
    horTitle:"Horizon",
    horSub:"The further out, the vaguer — on purpose. Dates come from each project's period in Notion.",
    legTitle:"How to read this page",
    legDone:"Shipped", legDoneD:"Live and usable today. Empty for now: the history is being compiled by hand, because the source records no completion.",
    legDoneFull:"Live and usable today. Once there is a measured number, it shows on the card's “Result” line.",
    legDoing:"In flight", legDoingD:"Being built now. The bar shows how much of the planned window has passed — not how much work is done.",
    legNext:"Planned", legNextD:"Has a defined period in Notion and hasn't started. Order may change if priorities change.",
    legHealth:"At risk / Blocked", legHealthD:"No badge means on plan. A yellow badge means it may slip; red means it is stalled waiting on something. Always shown with the reason.",
    legOwner:"Owner", legOwnerD:"Every card names the PO responsible. That is who you talk to — no need to hunt for who covers the topic.",
    footSource:"Source: Projetos database (Notion · Ecommerce & Growth space), filtered Frente = USA — 14 of 32 projects. Extracted 2026-08-11.",
    footCadence:"Cadence: one update every two weeks.",
    footLimit:"Known limitation: this database describes 1-to-4-month projects, not sprint deliveries. It answers “what's planned” well; for “what shipped this cycle” the source is the sprint board.",
    footNote:"Question or correction? Talk to",
    footUrl:"Always-current page:"
  }
};

/* ==========================================================================
   3) MOTOR
   ========================================================================== */
let lang = localStorage.getItem("radar-lang") === "en" ? "en" : "pt";
let activeTracks = new Set();
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
  const sameYear = a.slice(0,4) === b.slice(0,4);
  return fmtDate(a, !sameYear) + " → " + fmtDate(b, true);
}
function elapsedPct(a, b){
  const s = D(a).getTime(), e = D(b).getTime(), n = TODAY.getTime();
  if(n <= s) return 0;
  if(e <= s) return 100;
  return Math.min(120, Math.round((n - s) / (e - s) * 100));
}
function trackName(id){
  const t = DATA.tracks.find(t => t.id === id);
  return t ? L(t.name) : "";
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

/* --------------------------------------------------------------------------
   O QUE MUDOU: parte derivada das datas reais, parte escrita à mão.
   Nada aqui é inventado — cada linha "base" aponta para um campo do Notion.
   -------------------------------------------------------------------------- */
function cycleChanges(){
  const {from, to} = DATA.meta;
  const inWin = iso => iso >= from && iso <= to;
  const auto = [];
  DATA.items.forEach(i => {
    /* foi ao ar no mês desta janela */
    /* sem selo "base": o mês de `shipped` é digitado na revisão, não vem do
       Período do Notion — o selo só marca o que sai das datas da base. */
    if(i.status === "done" && i.shipped && (i.shipped === from.slice(0,7) || i.shipped === to.slice(0,7)))
      auto.push({kind:"shipped", item:i});
    /* começou de fato: a base já move para "Em andamento" */
    else if(i.status === "doing" && inWin(i.start))
      auto.push({kind:"start", item:i, base:true, date:i.start});
    /* data de início prevista cai na janela, mas a base ainda diz
       "Não iniciado" — é "começa", não "começou". */
    else if(i.status === "next" && inWin(i.start))
      auto.push({kind:"starting", item:i, base:true, date:i.start});
    /* janela planejada fecha dentro do período */
    if(i.status === "doing" && inWin(i.end))
      auto.push({kind:"due", item:i, base:true, date:i.end});
  });
  const order = {shipped:0, start:1, starting:2, due:3};
  auto.sort((a, b) => order[a.kind] - order[b.kind] || (a.date || "").localeCompare(b.date || ""));
  const manual = (DATA.changes && DATA.changes.manual) || [];
  /* Escrito à mão vem antes do derivado, exceto o que foi ao ar — essa é a
     melhor notícia da quinzena e fica no topo. */
  return [...auto.filter(a => a.kind === "shipped"), ...manual, ...auto.filter(a => a.kind !== "shipped")];
}

function render(){
  const t = T[lang], m = DATA.meta;
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en-US";

  /* Título e subtítulo dependem da página atual (body[data-page]). */
  const page = document.body.dataset.page || "index";
  const PM = {
    index:{h1:L(m.title), sub:L(m.sub)},
    essencial:{num:"01", h1:t.sumTitle, sub:t.sumSub},
    mudou:{num:"02", h1:t.chgTitle, sub:t.chgSub},
    "com-voces":{num:"03", h1:t.askTitle, sub:t.askSub},
    projetos:{num:"04", h1:t.boardTitle, sub:t.boardSub},
    detalhe:{num:"05", h1:t.detTitle, sub:t.detSub},
    "como-ler":{num:"07", h1:t.howTitle, sub:""},
    horizonte:{num:"06", h1:t.horTitle, sub:t.horSub},
    completo:{h1:L(m.title), sub:L(m.sub)}
  };
  const pm = PM[page] || PM.index;
  document.title = (page === "index" || page === "completo"
    ? L(m.title) : pm.h1 + " · " + L(m.shortTitle || m.title)) + " · Ybera Group";

  $("orgLine").textContent = m.org;
  $("sideTitle").textContent = L(m.shortTitle || m.title);
  const h1El = $("pageTitle");
  h1El.textContent = pm.h1;
  if(pm.num) h1El.setAttribute("data-num", pm.num);
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

  $("chgTitle").textContent = t.chgTitle;
  const chg = cycleChanges();
  $("chgList").innerHTML = chg.length
    ? `<div class="changes"><ul>${chg.map(c => {
        const label = t.kinds[c.kind] || t.kinds.moved;
        const when = c.kind === "shipped" ? fmtMonth(c.item && c.item.shipped) : (c.date ? fmtDate(c.date) : "");
        const body = c.item
          ? `<b>${esc(L(c.item.title))}</b>` +
            (when ? ` <span style="color:var(--ink-3)">· ${esc(when)}</span>` : "")
          : L(c.text);
        return `<li><span class="kind ${esc(c.kind)}">${esc(label)}</span>
          <span>${body}${c.base ? `<span class="src-tag">${esc(t.fromBase)}</span>` : ""}</span></li>`;
      }).join("")}</ul>${DATA.changes && DATA.changes.firstEdition
        ? `<p class="chg-note">${esc(t.chgFirst)}</p>` : ""}</div>`
    : `<div class="empty"><span class="et">${esc(t.chgEmptyT)}</span>${esc(t.chgEmptyD)}</div>`;

  $("askTitle").textContent = t.askTitle;
  $("askList").innerHTML = emptyBox(t.askEmptyShort, t.askEmptyD, t);

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
  }).join("");
  const foldEl = $("board").querySelector(".fold");
  if(foldEl) foldEl.addEventListener("toggle", () => { foldOpen = foldEl.open; });

  /* --- projetos em detalhe: descrição + demandas de cada item.
         Em curso primeiro; dentro do grupo, pela data de início. --- */
  $("detTitle").textContent = t.detTitle;
  $("detSub").textContent = t.detSub;
  const ordDet = {doing:0, next:1, done:2};
  const stLabel = {done:t.colDone, doing:t.colDoing, next:t.colNext};
  $("detList").innerHTML = [...items]
    .sort((a, b) => ordDet[a.status] - ordDet[b.status] || a.start.localeCompare(b.start))
    .map(i => {
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
      return `<details class="proj">
        <summary>
          ${ICO.chev}
          <span class="ptitle">${esc(L(i.title))}</span>
          <span class="pstatus st-${esc(i.status)}">${esc(stLabel[i.status])}</span>
          ${prog}
        </summary>
        <div class="proj-body">
          <span class="tag">${esc(trackName(i.track))}</span>
          <p class="about">${esc(L(i.about))}</p>
          <h5 class="dh">${esc(t.demandsTitle)}</h5>
          ${list}
          <div class="row">
            <span class="k">${ICO.cal}${esc(t.window)}: ${esc(windowLabel(i.start, i.end))}</span>
            <span class="k">${ICO.user}${esc(i.owner || m.owner)}</span>
            <span class="k">${ICO.db}<span>Notion: ${esc(i.notion)}</span></span>
          </div>
        </div>
      </details>`;
    }).join("");

  $("horTitle").textContent = t.horTitle;
  $("horizon").innerHTML = ["now","next","later"].map(k => {
    const h = DATA.horizon[k];
    if(!h) return "";
    const label = {now:{pt:"Agora",en:"Now"}, next:{pt:"A seguir",en:"Next"}, later:{pt:"Depois",en:"Later"}}[k];
    return `
      <div class="hcard" data-h="${k}">
        <div class="ht"><h3>${esc(L(label))}</h3><span class="hw">${esc(L(h.when))}</span></div>
        <span class="conf">${esc(L(h.conf))}</span>
        <ul>${h.list.map(x => `<li><span>${esc(L(x))}</span></li>`).join("")}</ul>
      </div>`;
  }).join("");

  /* Tudo que explica a página mora aqui, recolhido. A ressalva do "Entregue
     vazio" desaparece sozinha quando o primeiro item entregue entrar —
     legenda que mente é pior que legenda ausente. */
  const legDoneD = n("done") ? t.legDoneFull : t.legDoneD;
  $("howTitle").textContent = t.howTitle;
  $("howBody").innerHTML = `
    <h4>${esc(t.howLegend)}</h4>
    <div class="legend"><dl>${[
      ["var(--good)", t.legDone, legDoneD],
      ["var(--accent)", t.legDoing, t.legDoingD],
      ["var(--ink-3)", t.legNext, t.legNextD],
      ["var(--warning)", t.legHealth, t.legHealthD],
      ["var(--ink-2)", t.legOwner, t.legOwnerD]
    ].map(([c, dt, dd]) =>
      `<div><dt><span class="swatch" style="background:${c}"></span>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`
    ).join("")}</dl></div>
    <h4>${esc(t.howItems)}</h4><p>${esc(t.boardSub)}</p>
    <h4>${esc(t.howChg)}</h4><p>${esc(t.chgSub)}</p>
    <h4>${esc(t.howHor)}</h4><p>${esc(t.horSub)}</p>
    <h4>${esc(t.howSource)}</h4><p>${esc(t.footSource)}</p><p>${esc(t.footCadence)}</p><p>${esc(t.footLimit)}</p>`;
  const footLines = [];
  /* "Fale com o PO" precisa ser um clique, não uma instrução. No papel o link
     não clica, então o endereço aparece escrito. */
  const c = m.contact || {};
  const who = c.href ? `<a href="${esc(c.href)}">${esc(m.owner)}</a>` : esc(m.owner);
  const addr = c.address ? ` <span class="print-inline">&lt;${esc(c.address)}&gt;</span>` : "";
  footLines.push(`<span>${esc(t.footNote)} ${who}${addr} · ${esc(L(m.ownerRole))}</span>`);
  if(m.url) footLines.push(`<span>${esc(t.footUrl)} <a href="${esc(m.url)}">${esc(m.url)}</a></span>`);
  $("foot").innerHTML = footLines.join("");

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
  const defs = [
    {href:"index.html",     page:"index",     label:t.navTop},
    {href:"essencial.html", page:"essencial", label:t.navEss},
    {href:"mudou.html",     page:"mudou",     label:t.navChg,   badge:cycleChanges().length},
    {href:"com-voces.html", page:"com-voces", label:t.navAsk,   badge:nAsk, hot:true},
    {href:"projetos.html",  page:"projetos",  label:t.navBoard, badge:DATA.items.length, dot:flagged > 0},
    {href:"detalhe.html",   page:"detalhe",   label:t.navDet,   badge:nDem},
    {href:"horizonte.html", page:"horizonte", label:t.navHor},
    {href:"como-ler.html",  page:"como-ler",  label:t.navHow}
  ];
  const cur = document.body.dataset.page || "index";
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

function card(i, t){
  const src = i.notion
    ? `<div class="src">${ICO.db}<span>Notion: ${esc(i.notion)}</span></div>` : "";
  let mid = "";
  if(i.status === "doing"){
    const p = elapsedPct(i.start, i.end);
    const over = p >= 100;
    mid = `<div class="elapsed">
        <div class="pl"><span>${esc(over ? t.over : t.elapsed)}</span><b class="mono-num">${Math.min(p,100)}%</b></div>
        <div class="bar" role="img" aria-label="${Math.min(p,100)}% ${esc(t.elapsed)}"><i class="${over ? "over" : ""}" style="width:${Math.min(p,100)}%"></i></div>
      </div>`;
  }
  /* Selo de saúde só em quem está fora do prazo. Card sem selo = no prazo:
     14 selos verdes não informam nada e ainda escondem o que importa. */
  const bad = i.health === "watch" || i.health === "blocked";
  const pill = bad
    ? `<span class="hp ${esc(i.health)}">${ICO.alert}${esc(i.health === "blocked" ? t.alertBlocked : t.alertWatch)}</span>` : "";
  const hnote = bad && i.healthNote ? `<p class="hnote">${esc(L(i.healthNote))}</p>` : "";
  const result = i.result
    ? `<div class="result">${ICO.check}<span><b>${esc(t.resultLabel)}</b> ${esc(L(i.result))}</span></div>` : "";
  const when = i.status === "done" && i.shipped
    ? `${ICO.cal}${esc(t.live)} ${esc(fmtMonth(i.shipped))}`
    : `${ICO.cal}${esc(t.window)}: ${esc(windowLabel(i.start, i.end))}`;
  return `<article class="card${bad ? " " + esc(i.health) : ""}">
    <span class="tag">${esc(trackName(i.track))}</span>${pill}
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

$("btnPT").addEventListener("click", () => { lang = "pt"; localStorage.setItem("radar-lang", "pt"); render(); });
$("btnEN").addEventListener("click", () => { lang = "en"; localStorage.setItem("radar-lang", "en"); render(); });
/* Das páginas de seção, a impressão passa pela versão completa — é ela que
   tem o briefing de uma página pensado para papel. */
$("btnPrint").addEventListener("click", () => {
  if((document.body.dataset.page || "") === "completo") window.print();
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

/* No papel a explicação tem que sair impressa, não recolhida. */
window.addEventListener("beforeprint", () => {
  const h = $("howBox"); if(h){ h.dataset.wasOpen = h.open; h.open = true; }
  document.querySelectorAll(".empty details").forEach(d => d.open = true);
});
window.addEventListener("afterprint", () => {
  const h = $("howBox"); if(h) h.open = h.dataset.wasOpen === "true";
});

render();

/* completo.html?print=1: chegou aqui pelo botão de imprimir de outra página. */
if((document.body.dataset.page || "") === "completo" && new URLSearchParams(location.search).has("print"))
  setTimeout(() => window.print(), 350);
