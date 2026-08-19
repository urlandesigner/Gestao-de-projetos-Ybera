# Report Mensal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao Radar de Projetos USA uma página de report mensal que lista o que foi concluído em cada mês, derivando o que os dados sabem e aceitando texto escrito à mão para o que eles ainda não sabem.

**Architecture:** Página estática nova (`report.html`) com a mesma casca das demais, renderizada pelo motor compartilhado `assets/app.js`. Os meses são derivados da união de três fontes (`DATA.reports[].m`, `item.shipped`, `demand.done`). Nenhum componente visual novo: entregas reusam `card()`, demandas reusam `.dlist`/`d-done`, meses anteriores reusam `<details class="fold">`.

**Tech Stack:** HTML/CSS/JS sem build e sem dependência. `assets/data.js` (dados), `assets/app.js` (motor), `assets/style.css` (estilos). Servido por `python3 -m http.server`.

## Global Constraints

- Diretório de trabalho: `Radar de projetos/` dentro do repositório `Ecommerce USA`.
- **Não há suíte de teste nesta pasta.** O ciclo de verificação é servir e navegar; onde há lógica pura, a asserção é rodada no console do browser com saída esperada exata. Não introduzir framework de teste.
- Todo texto visível é bilíngue: toda chave nova entra em `T.pt` **e** em `T.en`.
- `esc()` em tudo que vem dos dados; `L()` em todo campo `{pt,en}`.
- Não editar `Radar de Projetos USA.html` (versão legada autocontida, mantida intacta a pedido do usuário).
- Não adicionar requisição externa: a página tem de funcionar offline e em `file://`.
- O motor é compartilhado por todas as páginas — nenhuma mudança pode quebrar `index`, `board`, `pendencias`, `produtos`, `produtos-tabela`, `horizonte`, `completo`.
- `$()` devolve um Proxy `NULL_EL` para ids ausentes: escrever num contêiner que a página não tem é seguro e silencioso.
- Servidor de verificação: `cd "Radar de projetos" && python3 -m http.server 8001`, abrir `http://localhost:8001`.

---

### Task 1: Contrato de dados

**Files:**
- Modify: `Radar de projetos/assets/data.js` (bloco de documentação dos campos opcionais, ~linha 36-58; e o objeto `DATA`, que fecha na última linha com `};`)

**Interfaces:**
- Consumes: nada
- Produces: `DATA.reports` — array de `{m:string, summary?:{pt,en}, extra?:[{t:{pt,en}}]}`, ordenado ou não. Campo `done:"AAAA-MM"` documentado em cada item de `demands`.

- [ ] **Step 1: Documentar os dois campos novos**

Em `assets/data.js`, no bloco de comentário "CAMPOS OPCIONAIS DE CADA ITEM", logo após a linha que documenta `shipped:"AAAA-MM"`, inserir:

```
   demands[].done:"AAAA-MM"     → mês em que a demanda foi concluída. Só faz
                                  sentido com status:"done". É ele que atribui
                                  a demanda a um mês do report — `due` é prazo,
                                  não data de conclusão, e usar `due` colocaria
                                  no mês errado toda demanda entregue atrasada.
                                  Demanda concluída sem `done` continua no site
                                  normalmente, só não entra em nenhum mês.
```

- [ ] **Step 2: Criar o bloco `reports`**

No objeto `DATA`, imediatamente antes de `items:[`, inserir:

```js
  /* REPORT MENSAL — a parte escrita à mão.
     O que a base sabe (entrega com `shipped`, demanda com `done`) é derivado
     sozinho; aqui entra só o que ela não sabe: o parágrafo do mês e os itens
     concluídos que não estão registrados no Notion.
     Enquanto a coluna Status não tiver nenhum "Concluído", `extra` é o que dá
     corpo ao report — sem ele a página fica no estado vazio.
     Um mês não precisa existir aqui para aparecer: se houver entrega ou
     demanda concluída naquele mês, o bloco do mês é criado do mesmo jeito. */
  reports:[],

```

- [ ] **Step 3: Verificar no browser**

Servir a pasta e abrir `http://localhost:8001/index.html`. No console:

```js
[Array.isArray(DATA.reports), DATA.reports.length]
```

Esperado: `[true, 0]`

A página tem de continuar renderizando igual, sem erro no console.

- [ ] **Step 4: Commit**

```bash
git add "Radar de projetos/assets/data.js"
git commit -m "feat(data): contrato do report mensal — reports[] e demands[].done"
```

---

### Task 2: Derivação dos meses

**Files:**
- Modify: `Radar de projetos/assets/app.js` (inserir as duas funções logo após `function trackName(id){...}`, antes do objeto `ICO`)

**Interfaces:**
- Consumes: `DATA.reports` e `DATA.items` (Task 1); `L()`, `lang`
- Produces:
  - `reportMonths() → Array<{m:string, summary:object|null, deliveries:Item[], demands:Array<{proj:Item, list:Demand[]}>, extra:Array<{t:object}>, n:number}>` em ordem decrescente de `m`
  - `fmtMonthLong(ym:string) → string` — "Agosto de 2026" | "August 2026"

- [ ] **Step 1: Escrever a asserção que falha**

Abrir `http://localhost:8001/index.html` e rodar no console:

```js
DATA.reports = [{m:"2026-07", summary:{pt:"Julho",en:"July"}, extra:[{t:{pt:"Item à mão",en:"Hand item"}}]}];
DATA.items[0].status = "done"; DATA.items[0].shipped = "2026-08";
DATA.items[1].demands = [{t:{pt:"Demanda",en:"Demand"}, status:"done", done:"2026-08"}];
reportMonths().map(r => r.m + ":" + r.n)
```

Esperado agora: `Uncaught ReferenceError: reportMonths is not defined`

- [ ] **Step 2: Implementar as duas funções**

Em `assets/app.js`, após `function trackName(id){ ... }`, inserir:

```js
/* --- REPORT MENSAL --------------------------------------------------------
   Um mês do report é a união de três fontes: o registro escrito em
   DATA.reports, as entregas (status "done" com `shipped`) e as demandas
   concluídas (status "done" com `done`). A união é o que garante que marcar
   uma entrega e esquecer de criar o registro do mês não faça a entrega sumir
   em silêncio. Ordem decrescente: o mês mais recente é o que interessa. */
function reportMonths(){
  const regs = DATA.reports || [];
  const keys = new Set(regs.map(r => r.m));
  DATA.items.forEach(i => {
    if(i.status === "done" && i.shipped) keys.add(i.shipped);
    (i.demands || []).forEach(d => { if(d.status === "done" && d.done) keys.add(d.done); });
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
  const [y, mo] = ym.split("-").map(Number);
  const name = new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-US", {month:"long"})
    .format(new Date(y, mo - 1, 1));
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return lang === "pt" ? `${cap} de ${y}` : `${cap} ${y}`;
}
```

- [ ] **Step 3: Rodar a asserção e ver passar**

Recarregar `http://localhost:8001/index.html` e rodar de novo o bloco do Step 1.

Esperado: `["2026-08:2", "2026-07:1"]`

Agosto tem 2 (uma entrega + uma demanda), julho tem 1 (só o `extra`), e agosto vem primeiro.

- [ ] **Step 4: Verificar o formatador e a ordem**

Ainda no console:

```js
[fmtMonthLong("2026-08"), reportMonths()[0].deliveries.length, reportMonths()[0].demands[0].list.length]
```

Esperado: `["Agosto de 2026", 1, 1]`

Trocar para inglês pelo botão EN e rodar `fmtMonthLong("2026-08")` → esperado `"August 2026"`.

Recarregar a página para descartar os dados de teste injetados. **Nada disso é commitado.**

- [ ] **Step 5: Commit**

```bash
git add "Radar de projetos/assets/app.js"
git commit -m "feat(report): derivação dos meses e formatador de mês por extenso"
```

---

### Task 3: Página, navegação e textos

**Files:**
- Create: `Radar de projetos/report.html`
- Modify: `Radar de projetos/assets/app.js` (dicionário `T.pt` ~linha 26-60; `T.en` ~linha 86-120; mapa `PM` ~linha 239-247; `navHtml()` ~linha 566-572)
- Modify: `Radar de projetos/assets/style.css` (uma regra nova, no fim do bloco de seções)

**Interfaces:**
- Consumes: `reportMonths()` (Task 2)
- Produces: `report.html` com `body[data-page="report"]` e os contêineres `#repNow` e `#repPast`; chaves `t.navRep`, `t.repTitle`, `t.repSub`, `t.repExtra`, `t.repMonthEmpty`, `t.repEmptyShort`, `t.repEmptyD`, `t.repOneDelivery`, `t.repManyDeliveries`, `t.repOneDemand`, `t.repManyDemands`, `t.repOneExtra`, `t.repManyExtra`

- [ ] **Step 1: Criar `report.html`**

Copiar a casca de `pendencias.html` trocando `data-page`, `<title>`, a descrição e a seção. Conteúdo completo:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="O que foi concluído em cada mês na frente USA da Ybera.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%232a78d6'/%3E%3Ccircle cx='12' cy='12' r='6.5' fill='none' stroke='white' stroke-width='1.5' opacity='.5'/%3E%3Ccircle cx='12' cy='12' r='2.2' fill='white'/%3E%3Cpath d='M12 12L18.3 5.7' stroke='white' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E">
<title>Report mensal · Radar USA · Ybera Group</title>
<link rel="stylesheet" href="assets/style.css">
<script>(function(){var t=localStorage.getItem("radar-theme");if(t)document.documentElement.setAttribute("data-theme",t);})();</script>
</head>
<body data-page="report">
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
<div class="shell">

  <nav class="side" id="side" aria-label="Páginas">
    <div class="side-brand"><strong id="sideTitle"></strong></div>
    <ul class="navlist" id="navList"></ul>
  </nav>

  <main class="wrap" id="conteudo">

  <header class="topbar">
    <div class="brand">
      <span class="eyebrow" id="orgLine"></span>
      <h1 id="pageTitle"></h1>
      <span class="sub" id="pageSub"></span>
    </div>
    <div class="controls">
      <div class="seg" role="group" aria-label="Language">
        <button type="button" id="btnPT" aria-pressed="true">PT</button>
        <button type="button" id="btnEN" aria-pressed="false">EN</button>
      </div>
      <button type="button" class="icon-btn" id="btnTheme" aria-label="Tema"></button>
      <button type="button" class="icon-btn" id="btnPrint" aria-label="Imprimir">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/></svg>
      </button>
    </div>
  </header>

  <section id="s-rep">
    <div id="repNow"></div>
    <div id="repPast"></div>
  </section>

  <div class="foot" id="foot"></div>
  </main>
</div>

<script src="assets/data.js"></script>
<script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Adicionar as chaves em português**

Em `assets/app.js`, no objeto `T.pt`, logo após a linha `horTitle:"Futuro",` e seu `horSub`, inserir:

```js
    navRep:"Report mensal",
    repTitle:"Report mensal",
    repSub:"O que foi concluído em cada mês. O mês mais recente abre aberto; os anteriores ficam recolhidos abaixo.",
    repExtra:"Também concluído",
    repMonthEmpty:"Nada registrado neste mês.",
    repEmptyShort:"Nenhum mês com item concluído ainda.",
    repEmptyD:"Na base Projetos o campo Status nunca assume “Concluído”, e nenhum projeto tem demandas registradas — não há de onde derivar o que fechou. Enquanto isso, o mês pode ser escrito à mão no bloco <b>reports</b> do arquivo de dados. Esta página vazia diz respeito à base, não ao trabalho.",
    repOneDelivery:"entrega", repManyDeliveries:"entregas",
    repOneDemand:"demanda concluída", repManyDemands:"demandas concluídas",
    repOneExtra:"outro item", repManyExtra:"outros itens",
```

- [ ] **Step 3: Adicionar as mesmas chaves em inglês**

No objeto `T.en`, na posição equivalente (após `horTitle`/`horSub`), inserir:

```js
    navRep:"Monthly report",
    repTitle:"Monthly report",
    repSub:"What was completed each month. The most recent month opens expanded; earlier ones stay collapsed below.",
    repExtra:"Also completed",
    repMonthEmpty:"Nothing recorded this month.",
    repEmptyShort:"No month with completed items yet.",
    repEmptyD:"In the Projects base the Status field never takes the value “Done”, and no project has demands recorded — there is nothing to derive closed work from. In the meantime a month can be written by hand in the <b>reports</b> block of the data file. This empty page is about the base, not about the work.",
    repOneDelivery:"delivery", repManyDeliveries:"deliveries",
    repOneDemand:"completed demand", repManyDemands:"completed demands",
    repOneExtra:"other item", repManyExtra:"other items",
```

- [ ] **Step 4: Registrar a página no mapa de títulos**

No mapa `PM` dentro de `render()`, adicionar a entrada após `horizonte:`:

```js
    report:{h1:t.repTitle, sub:t.repSub},
```

- [ ] **Step 5: Adicionar o item de navegação**

Em `navHtml(t)`, antes da linha do `horizonte.html`, adicionar a definição — e o contador, logo acima de `const defs = [`:

```js
  const nRep = (reportMonths()[0] || {}).n || 0;
```

```js
    {href:"report.html",     page:"report",     label:t.navRep,   badge:nRep},
```

A linha entra entre a de `produtos.html` e a de `horizonte.html`.

- [ ] **Step 6: Adicionar a única regra de CSS nova**

Em `assets/style.css`, no fim do bloco `SECTIONS` (logo após a regra `.sec-head h2{...}`), inserir:

```css
/* Meses anteriores do report: mesma dobra do board, empilhados. */
#repPast{display:flex;flex-direction:column;gap:9px;margin-top:22px}
```

- [ ] **Step 7: Verificar no browser**

Abrir `http://localhost:8001/report.html`.

Esperado:
- título da aba: `Report mensal · Radar USA · Ybera Group`
- `<h1>` "Report mensal" e o subtítulo abaixo dele
- na navegação lateral, o item "Report mensal" entre "Produtos" e "Futuro", aceso (fundo sólido), sem badge (contador 0)
- corpo vazio (os contêineres ainda não são preenchidos — isso é a Task 4)
- console sem erro

Clicar em EN: `<h1>` vira "Monthly report" e o item da navegação também.

Abrir `http://localhost:8001/index.html` e conferir que o item novo aparece na navegação de **todas** as páginas e que nenhuma delas quebrou.

- [ ] **Step 8: Commit**

```bash
git add "Radar de projetos/report.html" "Radar de projetos/assets/app.js" "Radar de projetos/assets/style.css"
git commit -m "feat(report): página, navegação e textos PT/EN"
```

---

### Task 4: Render do mês e estados vazios

**Files:**
- Modify: `Radar de projetos/assets/app.js` (duas funções novas após `function projRow(...)`; um bloco de render dentro de `render()`, logo após o bloco do horizonte e antes do `$("foot")`)

**Interfaces:**
- Consumes: `reportMonths()`, `fmtMonthLong()` (Task 2); `card()`, `emptyBox()`, `ICO`, `L()`, `esc()`; as chaves de texto (Task 3)
- Produces: `monthCount(r, t) → string`, `monthBlock(r, t) → string` (HTML), e o preenchimento de `#repNow`

- [ ] **Step 1: Escrever as duas funções de render**

Em `assets/app.js`, logo após `function projRow(i, t, m){ ... }`, inserir:

```js
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
```

- [ ] **Step 2: Preencher o contêiner do mês corrente**

Dentro de `render()`, imediatamente **antes** da linha `$("navList").innerHTML = navHtml(t);` (âncora única, perto do fim da função), inserir:

```js
  /* --- REPORT MENSAL: o mês mais recente aberto. Os anteriores entram na
         Task 5, no contêiner #repPast. --- */
  const months = reportMonths();
  if(!months.length){
    $("repNow").innerHTML = emptyBox(t.repEmptyShort, t.repEmptyD, t);
  } else {
    const cur = months[0];
    const count = monthCount(cur, t);
    $("repNow").innerHTML =
      `<div class="sec-head"><h2>${esc(fmtMonthLong(cur.m))}</h2></div>` +
      (count ? `<div class="strip"><span class="meta">${esc(count)}</span></div>` : "") +
      monthBlock(cur, t);
  }
```

- [ ] **Step 3: Verificar o estado vazio — que é o estado real de hoje**

Abrir `http://localhost:8001/report.html`.

Esperado: uma caixa tracejada com "Nenhum mês com item concluído ainda." e o link "por quê?"; ao abrir o link, o texto explicando que a base não tem "Concluído". Nenhum cabeçalho de mês. Console sem erro.

- [ ] **Step 4: Verificar o estado cheio com dados injetados**

Ainda em `report.html`, no console:

```js
DATA.reports = [{m:"2026-08", summary:{pt:"Agosto fechou a conformidade da loja.", en:"August closed store compliance."}, extra:[{t:{pt:"Inventário de páginas de política", en:"Policy page inventory"}}]}];
DATA.items[0].status = "done"; DATA.items[0].shipped = "2026-08";
DATA.items[0].result = {pt:"No ar desde ago/26.", en:"Live since Aug/26."};
DATA.items[1].demands = [{t:{pt:"Revisão do checkout", en:"Checkout review"}, status:"done", done:"2026-08"}];
render();
```

Esperado, de cima para baixo:
1. "Agosto de 2026" na serifa
2. faixa com "1 entrega · 1 demanda concluída · 1 outro item"
3. o parágrafo do resumo na caixa clara
4. um cartão de entrega com "No ar desde ago/26" e a linha de resultado
5. o nome do projeto da demanda em rótulo miúdo maiúsculo, e abaixo "Revisão do checkout" com check verde
6. "Também concluído" e abaixo "Inventário de páginas de política" com check verde

Conferir também em EN, em tema claro e escuro, e em 390px de largura. Recarregar para descartar os dados injetados.

- [ ] **Step 5: Verificar que nada mais quebrou**

Abrir `index.html`, `board.html`, `pendencias.html`, `produtos.html`, `produtos-tabela.html`, `horizonte.html` e `completo.html`. Nenhuma deve ter erro no console nem mudança visual.

- [ ] **Step 6: Commit**

```bash
git add "Radar de projetos/assets/app.js"
git commit -m "feat(report): render do mês corrente e estados vazios"
```

---

### Task 5: Meses anteriores, `?m=` e impressão

**Files:**
- Modify: `Radar de projetos/assets/app.js` (o bloco do report dentro de `render()`, criado na Task 4; e o handler de `btnPrint` ~linha 681-684)

**Interfaces:**
- Consumes: tudo das Tasks 2 e 4
- Produces: `#repPast` preenchido; `report.html?m=AAAA-MM` seleciona o mês aberto; `btnPrint` imprime a própria página quando `data-page` é `report`

- [ ] **Step 1: Substituir o bloco do report para tratar mês escolhido e anteriores**

Trocar o bloco inserido na Task 4 (Step 2) por este:

```js
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
```

- [ ] **Step 2: Fazer o report imprimir a si mesmo**

Trocar o handler de impressão:

```js
$("btnPrint").addEventListener("click", () => {
  if((document.body.dataset.page || "") === "completo") window.print();
  else location.href = "completo.html?print=1";
});
```

por:

```js
/* Report e versão completa se imprimem; as páginas de seção passam pela
   completa, que é a que tem o briefing de uma página pensado para papel. */
$("btnPrint").addEventListener("click", () => {
  const p = document.body.dataset.page || "";
  if(p === "completo" || p === "report") window.print();
  else location.href = "completo.html?print=1";
});
```

- [ ] **Step 3: Verificar os meses anteriores**

Abrir `http://localhost:8001/report.html` e injetar dois meses no console:

```js
DATA.reports = [
  {m:"2026-08", extra:[{t:{pt:"Item de agosto", en:"August item"}}]},
  {m:"2026-07", summary:{pt:"Julho foi de preparação.", en:"July was preparation."}, extra:[{t:{pt:"Item de julho", en:"July item"}}]}
];
render();
```

Esperado: "Agosto de 2026" aberto no topo com "1 outro item"; abaixo, uma dobra fechada escrita "Julho de 2026". Clicar na dobra: abre com o parágrafo de julho e "Item de julho" com check.

- [ ] **Step 4: Verificar o parâmetro `?m=`**

Com os mesmos dados injetados não dá para testar o parâmetro (o `render()` roda no load). Adicionar os dois meses ao `DATA.reports` **temporariamente** no arquivo `assets/data.js`, recarregar e conferir:

| URL | Esperado |
|---|---|
| `report.html` | Agosto aberto, julho recolhido |
| `report.html?m=2026-07` | **Julho** aberto, agosto recolhido |
| `report.html?m=2026-99` | Agosto aberto (cai no mais recente, sem erro) |
| `report.html?m=` | Agosto aberto |

Desfazer a edição temporária de `data.js` ao terminar:

```bash
git checkout -- "Radar de projetos/assets/data.js"
```

- [ ] **Step 5: Verificar a impressão**

Com os dois meses ainda no `data.js`, em `report.html` clicar no botão de imprimir (ou `Cmd+P`). Na pré-visualização, esperado: só "Agosto de 2026" e seu conteúdo; a dobra de julho **não** aparece; navegação lateral, controles e o botão de imprimir também não. Desfazer a edição de `data.js` depois.

Conferir que `index.html` continua roteando para `completo.html?print=1` ao clicar em imprimir.

- [ ] **Step 6: Verificação final de regressão**

Percorrer as oito páginas (`index`, `board`, `pendencias`, `produtos`, `produtos-tabela`, `horizonte`, `report`, `completo`) em desktop e em 390px, tema claro e escuro, PT e EN. Nenhuma pode ter erro no console.

- [ ] **Step 7: Commit**

```bash
git add "Radar de projetos/assets/app.js"
git commit -m "feat(report): meses anteriores recolhidos, seleção por ?m= e impressão própria"
```
