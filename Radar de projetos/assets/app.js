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
    askEmptyD:"As colunas <b>Decisões</b> e <b>Ações</b> da base Projetos estão vazias em todas as 32 linhas. Enquanto elas não forem preenchidas, esta seção não tem o que mostrar — e decisões travadas seguem invisíveis para quem precisa decidir.",
    boardTitle:"Board de entregas",
    boardSub:"Cada item está escrito pelo que o usuário passa a conseguir fazer. O nome original no Notion aparece embaixo, para rastreio.",
    detTitle:"Produtos",
    detSub:"Os produtos da frente USA e os projetos dentro de cada um. Abra um projeto para ler o que ele é e as demandas acompanhadas nele; a lista de demandas é mantida à mão na revisão quinzenal.",
    projectOne:"projeto", projectMany:"projetos", doingLower:"em curso",
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
    horTitle:"Futuro",
    horSub:"Quanto mais longe, menos preciso — de propósito. As três faixas saem da data de início de cada projeto no Notion: mudar um período move o projeto de faixa sozinho.",
    horNow:"Agora", horNext:"A seguir", horLater:"Depois",
    horUntil:"até {d}",
    confNow:"Janela atual", confNext:"Planejado", confLater:"Roadmap",
    footSource:"Fonte: base Projetos (Notion · espaço Ecommerce & Growth), filtro Frente = USA — 14 de 32 projetos. Extração de 11/08/2026.",
    footCadence:"Cadência: uma atualização a cada duas semanas.",
    footLimit:"Limitação conhecida: esta base descreve projetos de 1 a 4 meses, não entregas de sprint. Ela responde bem “o que está planejado”; para “o que foi entregue nesta quinzena” a fonte é o board de sprints.",
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
    askEmptyD:"The <b>Decisões</b> and <b>Ações</b> columns in the Projetos database are empty across all 32 rows. Until they're filled, this section has nothing to show — and blocked decisions stay invisible to the people who need to make them.",
    boardTitle:"Delivery board",
    boardSub:"Every item is written as what the user can now do. The original Notion name appears below it, for traceability.",
    detTitle:"Products",
    detSub:"The products on the USA front and the projects inside each one. Open a project to read what it is and the demands tracked in it; the demand list is maintained by hand during the biweekly review.",
    projectOne:"project", projectMany:"projects", doingLower:"in flight",
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
    horTitle:"Future",
    horSub:"The further out, the vaguer — on purpose. The three bands come from each project's start date in Notion: change a period and the project moves band on its own.",
    horNow:"Now", horNext:"Next", horLater:"Later",
    horUntil:"through {d}",
    confNow:"Current window", confNext:"Planned", confLater:"Roadmap",
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
  if(!list.length) return "";
  const ys = [...new Set(list.map(i => i.start.slice(0,4)))].sort();
  return ys.length === 1 ? ys[0] : ys[0] + "+";
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

function render(){
  const t = T[lang], m = DATA.meta;
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en-US";

  /* Título e subtítulo dependem da página atual (body[data-page]). */
  const page = document.body.dataset.page || "index";
  const PM = {
    index:{h1:L(m.title), sub:L(m.sub)},
    board:{num:"01", h1:t.boardTitle, sub:t.boardSub},
    pendencias:{num:"02", h1:t.askTitle, sub:t.askSub},
    produtos:{num:"03", h1:t.detTitle, sub:t.detSub},
    horizonte:{num:"04", h1:t.horTitle, sub:t.horSub},
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

  /* --- produtos: cada produto (coluna Produto do Notion) com os projetos
         dentro dele. Dentro do produto, em curso primeiro e depois pela data
         de início. Produto sem projeto não vira bloco vazio. --- */
  $("detTitle").textContent = t.detTitle;
  $("detSub").textContent = t.detSub;
  const ordDet = {doing:0, next:1, done:2};
  $("detList").innerHTML = DATA.tracks.map(tr => {
    const list = items.filter(i => i.track === tr.id)
      .sort((a, b) => ordDet[a.status] - ordDet[b.status] || a.start.localeCompare(b.start));
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
  }).join("");

  /* --- horizonte DERIVADO das datas dos projetos: cada um cai numa faixa
         pela data de início, contra o trimestre corrente. Antes as três
         listas eram digitadas à mão e podiam discordar do board — agora
         mudar um período move o card de faixa sozinho. Entregues saem: são
         história, e o lugar deles é a coluna Entregue do board. --- */
  $("horTitle").textContent = t.horTitle;
  const nq = nextQuarter(m.quarter.end);
  const band = {now:[], next:[], later:[]};
  items.filter(i => i.status !== "done")
       .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
       .forEach(i => band[i.start <= m.quarter.end ? "now" : i.start <= nq.end ? "next" : "later"].push(i));
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
  }).join("");

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
  footLines.push(`<span class="fine">${esc(t.footSource)} ${esc(t.footCadence)}</span>`);
  footLines.push(`<span class="fine">${esc(t.footLimit)}</span>`);
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
    {href:"index.html",      page:"index",      label:t.navTop},
    {href:"board.html",      page:"board",      label:t.navBoard, badge:DATA.items.length, dot:flagged > 0},
    {href:"pendencias.html", page:"pendencias", label:t.navAsk,   badge:nAsk, hot:true},
    {href:"produtos.html",   page:"produtos",   label:t.navDet,   badge:nDem},
    {href:"horizonte.html",  page:"horizonte",  label:t.navHor}
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
  return `<details class="proj">
    <summary>
      ${ICO.chev}
      <span class="ptitle">${esc(L(i.title))}</span>
      <span class="pstatus st-${esc(i.status)}">${esc(stLabel[i.status])}</span>
      ${prog}
    </summary>
    <div class="proj-body">
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

/* No papel os "por quê?" dos estados vazios saem escritos, não recolhidos. */
window.addEventListener("beforeprint", () => {
  document.querySelectorAll(".empty details").forEach(d => d.open = true);
});

render();

/* completo.html?print=1: chegou aqui pelo botão de imprimir de outra página. */
if((document.body.dataset.page || "") === "completo" && new URLSearchParams(location.search).has("print"))
  setTimeout(() => window.print(), 350);
