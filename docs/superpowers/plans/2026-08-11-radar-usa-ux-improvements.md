# Radar USA — UX/UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o bug de listeners duplicados e implementar os upgrades de UX/UI aprovados na spec `docs/superpowers/specs/2026-08-11-radar-usa-ux-design.md` no arquivo único do Radar.

**Architecture:** Todas as mudanças acontecem em um único arquivo HTML autocontido (`Radar de projetos/Radar de Projetos USA.html`): CSS embutido no `<style>`, JS embutido no `<script>`. Não há build nem framework de testes — a verificação é feita no browser (viewport 1280px e 375px, light/dark, PT/EN) com asserts via console JS e screenshots.

**Tech Stack:** HTML/CSS/JS vanilla, browser preview para verificação.

## Global Constraints

- O arquivo permanece autocontido: nenhuma dependência externa (fonte, script, CSS ou imagem remota) pode entrar.
- Identidade visual, ordem das seções, copy PT/EN, estrutura de `DATA`/`T` e comportamento de impressão não mudam (exceto onde a spec manda).
- Desktop ≥1060px não muda visualmente, exceto: cor `--ink-3` clara, medidor segmentado, anel de foco e ícone do toggle de tema.
- Commits frequentes: um por task, mensagem em português.
- Quirk conhecido (não mexer): o `.foot` dos tiles herda `border-top`/`padding-top` da regra global `.foot` do rodapé — o divisor sob o valor do tile depende disso.

**Arquivo alvo em todas as tasks:** `Radar de projetos/Radar de Projetos USA.html`

---

### Task 1: Remover os blocos duplicados de listeners de impressão

**Files:**
- Modify: `Radar de projetos/Radar de Projetos USA.html` (~linhas 1113-1127 e 1302-1321)

**Interfaces:**
- Produces: handlers de chips/PT/EN contendo apenas a mutação de estado + `render()`; um único par `beforeprint`/`afterprint` no nível raiz (~linha 1330).

- [ ] **Step 1: Evidência do estado atual (o "teste que falha")**

Run: `grep -c 'addEventListener("beforeprint"' "Radar de projetos/Radar de Projetos USA.html"`
Expected: `4`

- [ ] **Step 2: Corrigir o handler dos chips de filtro**

Substituir (old_string exato):

```js
    else activeTracks.has(id) ? activeTracks.delete(id) : activeTracks.add(id);
    /* No papel a explicação tem que sair impressa, não recolhida. */
window.addEventListener("beforeprint", () => {
  const h = $("howBox"); if(h){ h.dataset.wasOpen = h.open; h.open = true; }
  document.querySelectorAll(".empty details").forEach(d => d.open = true);
});
window.addEventListener("afterprint", () => {
  const h = $("howBox"); if(h) h.open = h.dataset.wasOpen === "true";
});

render();
  }));
```

por:

```js
    else activeTracks.has(id) ? activeTracks.delete(id) : activeTracks.add(id);
    render();
  }));
```

- [ ] **Step 3: Corrigir o handler do btnPT**

Substituir:

```js
$("btnPT").addEventListener("click", () => { lang = "pt"; /* No papel a explicação tem que sair impressa, não recolhida. */
window.addEventListener("beforeprint", () => {
  const h = $("howBox"); if(h){ h.dataset.wasOpen = h.open; h.open = true; }
  document.querySelectorAll(".empty details").forEach(d => d.open = true);
});
window.addEventListener("afterprint", () => {
  const h = $("howBox"); if(h) h.open = h.dataset.wasOpen === "true";
});

render(); });
```

por:

```js
$("btnPT").addEventListener("click", () => { lang = "pt"; render(); });
```

- [ ] **Step 4: Corrigir o handler do btnEN**

Substituir:

```js
$("btnEN").addEventListener("click", () => { lang = "en"; /* No papel a explicação tem que sair impressa, não recolhida. */
window.addEventListener("beforeprint", () => {
  const h = $("howBox"); if(h){ h.dataset.wasOpen = h.open; h.open = true; }
  document.querySelectorAll(".empty details").forEach(d => d.open = true);
});
window.addEventListener("afterprint", () => {
  const h = $("howBox"); if(h) h.open = h.dataset.wasOpen === "true";
});

render(); });
```

por:

```js
$("btnEN").addEventListener("click", () => { lang = "en"; render(); });
```

- [ ] **Step 5: Verificar**

Run: `grep -c 'addEventListener("beforeprint"' "Radar de projetos/Radar de Projetos USA.html"`
Expected: `1`

No browser (recarregar a página): clicar num chip de filtro deve filtrar o quadro; PT/EN deve trocar o idioma; sem erros no console.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "fix: remove blocos duplicados de listeners de impressão nos handlers"
```

---

### Task 2: Navegação mobile acompanha a seção ativa + touch targets

**Files:**
- Modify: `Radar de projetos/Radar de Projetos USA.html` (função `markActive` ~linha 1242; bloco `@media (max-width:1059px)` ~linhas 116-133)

**Interfaces:**
- Consumes: `markActive(id)` já chamada pelo IntersectionObserver e pelos cliques.
- Produces: `markActive` com auto-scroll horizontal; links da nav com ≥44px de altura no modo estreito.

- [ ] **Step 1: Evidência do estado atual**

No browser a 375px: rolar até a seção Horizonte e executar no console:
```js
(() => { const a = document.querySelector('#navList a[aria-current="true"]'); const n = document.getElementById('navList'); return {active: a.textContent, off: a.offsetLeft, scroll: n.scrollLeft}; })()
```
Expected: `off` > largura da tela e `scroll: 0` (item ativo invisível).

- [ ] **Step 2: Alterar markActive**

Substituir:

```js
function markActive(id){
  document.querySelectorAll("#navList a")
    .forEach(a => a.setAttribute("aria-current", String(a.dataset.sec === id)));
}
```

por:

```js
function markActive(id){
  document.querySelectorAll("#navList a")
    .forEach(a => a.setAttribute("aria-current", String(a.dataset.sec === id)));
  /* Barra estreita: mantém o "você está aqui" visível. No desktop a lista é
     vertical e sem overflow — o guard de scrollWidth faz disso um no-op. */
  const nav = $("navList");
  const act = nav && nav.querySelector('a[aria-current="true"]');
  if(act && nav.scrollWidth > nav.clientWidth){
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    act.scrollIntoView({inline:"center", block:"nearest", behavior:reduce ? "instant" : "smooth"});
  }
}
```

- [ ] **Step 3: Touch targets no modo estreito**

Dentro do bloco `@media (max-width:1059px){...}`, substituir:

```css
  .navlist .nb,.navlist .dot{margin-left:3px}
  section{scroll-margin-top:60px}
  #s-top{scroll-margin-top:60px}
```

por:

```css
  .navlist .nb,.navlist .dot{margin-left:3px}
  .navlist a{padding:14px 12px}
  section{scroll-margin-top:74px}
  #s-top{scroll-margin-top:74px}
```

- [ ] **Step 4: Verificar**

Browser a 375px, rolar até Horizonte, repetir o snippet do Step 1.
Expected: `scroll` > 0 e o item ativo visível na barra (confirmar com screenshot).
Altura do link: `document.querySelector('#navList a').getBoundingClientRect().height` ≥ 44.
No desktop (1280px): sidebar sem mudança visual.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: nav estreita acompanha a seção ativa e ganha touch targets adequados"
```

---

### Task 3: Tiles compactos no mobile + swatch condicional

**Files:**
- Modify: `Radar de projetos/Radar de Projetos USA.html` (bloco `@media (max-width:760px)` ~linha 384; bloco `@media (max-width:560px)` ~linha 390; `tileDefs` ~linha 1051)

**Interfaces:**
- Produces: layout de tile em linha no mobile; swatch do tile "Esperando vocês" neutro quando 0.

- [ ] **Step 1: Swatch condicional (JS)**

Substituir:

```js
  tileDefs.push({label:t.tiles.asks, v:nAsk, c:"var(--critical)", flag:nAsk > 0,
                 foot:nAsk ? t.tileFoot.asksSome : t.tileFoot.asksNone});
```

por:

```js
  tileDefs.push({label:t.tiles.asks, v:nAsk, c:nAsk ? "var(--critical)" : "var(--ink-3)", flag:nAsk > 0,
                 foot:nAsk ? t.tileFoot.asksSome : t.tileFoot.asksNone});
```

- [ ] **Step 2: Layout de linha no mobile (CSS)**

No bloco `@media (max-width:760px){...}`, substituir:

```css
  .tiles{grid-template-columns:repeat(2,1fr)}
```

por:

```css
  .tiles{grid-template-columns:1fr;gap:9px}
  .tile{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;column-gap:14px;padding:12px 16px}
  .tile .label{margin-bottom:0}
  .tile .val{grid-column:2;grid-row:1;font-size:24px}
  .tile .val.small{font-size:17px}
  .tile .foot{grid-column:1 / -1}
```

- [ ] **Step 3: Remover a regra conflitante do breakpoint 560px**

No bloco `@media (max-width:560px){...}`, substituir:

```css
  .wrap{padding:18px 14px 56px}
  h1{font-size:22px}
  .tile .val{font-size:26px}
  .topbar{flex-direction:column}
```

por:

```css
  .wrap{padding:18px 14px 56px}
  h1{font-size:22px}
  .topbar{flex-direction:column}
```

- [ ] **Step 4: Verificar**

Browser a 375px, topo da página. Expected: 3 tiles como linhas de largura total, valores alinhados à direita na mesma linha do label, sem buraco órfão; swatch de "Esperando vocês" cinza (valor 0). Screenshot.
A 1280px: tiles em grid horizontal como antes (screenshot para comparar).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: tiles em linha compacta no mobile e swatch neutro quando zero"
```

---

### Task 4: Medidor do trimestre com segmentos discretos

**Files:**
- Modify: `Radar de projetos/Radar de Projetos USA.html` (CSS `.meter` ~linhas 211-215; JS do medidor ~linhas 1071-1077)

**Interfaces:**
- Consumes: objeto `q = {label, done, doing, total}` já calculado no render.
- Produces: medidor com `q.total` segmentos `<i>`, classes `done`/`doing`/(vazia).

- [ ] **Step 1: CSS dos segmentos**

Substituir:

```css
.meter{height:8px;border-radius:4px;background:var(--grid);overflow:hidden;display:flex}
.meter i{display:block;height:100%;border-radius:4px}
.meter i.done{background:var(--good)}
.meter i.gap{width:2px;background:var(--surface);border-radius:0}
.meter i.doing{background:var(--accent)}
```

por:

```css
.meter{height:8px;display:flex;gap:3px}
.meter i{display:block;height:100%;border-radius:3px;flex:1;min-width:6px;background:var(--grid)}
.meter i.done{background:var(--good)}
.meter i.doing{background:var(--accent)}
```

- [ ] **Step 2: JS gera um segmento por projeto**

Substituir:

```js
  const pDone = q.total ? Math.round(q.done / q.total * 100) : 0;
  const pDoing = q.total ? Math.round(q.doing / q.total * 100) : 0;
  $("meterTitle").textContent = t.meter + " · " + q.label;
  $("meterValue").textContent = `${q.done} ${t.of} ${q.total} ${t.initiatives}`;
  const mEl = $("meter");
  mEl.innerHTML = `<i class="done" style="width:${pDone}%"></i>${pDone ? '<i class="gap"></i>' : ""}<i class="doing" style="width:${pDoing}%"></i>`;
```

por:

```js
  $("meterTitle").textContent = t.meter + " · " + q.label;
  $("meterValue").textContent = `${q.done} ${t.of} ${q.total} ${t.initiatives}`;
  /* Um segmento por projeto: contagem se lê como contagem — barra meio cheia
     se lia como "metade pronto" quando nada tinha concluído. */
  const mEl = $("meter");
  mEl.innerHTML = Array.from({length:q.total}, (_, k) =>
    `<i class="${k < q.done ? "done" : k < q.done + q.doing ? "doing" : ""}"></i>`).join("");
```

- [ ] **Step 3: Verificar**

Console: `document.querySelectorAll('#meter i').length` → Expected: `6`;
`document.querySelectorAll('#meter i.doing').length` → `3`;
`document.querySelectorAll('#meter i.done').length` → `0`.
Visual: 6 segmentos com gaps (3 azuis, 3 cinzas), texto "0 de 6 concluídos". Screenshot light/dark.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: medidor do trimestre em segmentos discretos por projeto"
```

---

### Task 5: Filtros em linha rolável no mobile

**Files:**
- Modify: `Radar de projetos/Radar de Projetos USA.html` (bloco `@media (max-width:760px)` — mesmo bloco da Task 3)

**Interfaces:**
- Produces: `.filters` com scroll horizontal e fade no modo mobile; chips com ~41px de altura.

- [ ] **Step 1: CSS**

No bloco `@media (max-width:760px){...}`, logo após a linha `.col{margin-bottom:6px}`, adicionar:

```css
  .filters{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;
    -webkit-mask-image:linear-gradient(to right,#000 0,#000 calc(100% - 26px),transparent 100%);
    mask-image:linear-gradient(to right,#000 0,#000 calc(100% - 26px),transparent 100%)}
  .filters::-webkit-scrollbar{display:none}
  .filters .flabel,.filters .chip{flex:0 0 auto}
  .filters .chip{padding:11px 14px}
```

- [ ] **Step 2: Verificar**

Browser a 375px, seção Quadro de projetos. Expected: chips em 1 linha, roláveis horizontalmente, fade na borda direita; altura do chip ≥40px (`document.querySelector('.chip').getBoundingClientRect().height`). Clicar num chip continua filtrando. A 1280px: wrap preservado.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: filtros em linha rolável no mobile"
```

---

### Task 6: Acessibilidade — contraste, foco, movimento, toggle de tema

**Files:**
- Modify: `Radar de projetos/Radar de Projetos USA.html` (token `--ink-3` ~linha 30; `html{scroll-behavior:smooth}` ~linha 80; base CSS ~linha 136; strings `T` ~linhas 786/849; `ICO` ~linha 957; handler `btnTheme` ~linha 1323; fim do `render()` ~linha 1206)

**Interfaces:**
- Produces: `isDarkNow()` e `syncThemeBtn()` no escopo global do script; chaves `themeDark`/`themeLight` em `T.pt` e `T.en`; `ICO.sun` e `ICO.moon`.

- [ ] **Step 1: Contraste do --ink-3 claro**

No primeiro bloco `:root{...}` (tema claro), substituir:

```css
  --ink-3:#898781;
```

por:

```css
  --ink-3:#706e67;
```

(Os blocos dark mantêm `--ink-3:#898781` — não tocar.)

- [ ] **Step 2: Movimento condicionado**

Substituir:

```css
html{scroll-behavior:smooth}
```

por:

```css
@media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth}}
```

- [ ] **Step 3: Foco visível**

Logo após a linha `button{font:inherit;color:inherit;cursor:pointer}`, adicionar:

```css
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
```

- [ ] **Step 4: Strings do toggle**

Em `T.pt`, após a linha `whyLink:"por quê?",` adicionar:

```js
    themeDark:"Mudar para tema escuro", themeLight:"Mudar para tema claro",
```

Em `T.en`, após a linha `whyLink:"why?",` adicionar:

```js
    themeDark:"Switch to dark theme", themeLight:"Switch to light theme",
```

- [ ] **Step 5: Ícones sol/lua e sync**

No objeto `ICO`, após a entrada `check:...`, adicionar (com vírgula na entrada anterior):

```js
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>'
```

Substituir o handler do tema:

```js
$("btnTheme").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = cur === "dark" || (cur !== "light" && sysDark);
  document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
});
```

por:

```js
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
  document.documentElement.setAttribute("data-theme", isDarkNow() ? "light" : "dark");
  syncThemeBtn();
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeBtn);
```

No fim do `render()`, substituir:

```js
  $("navList").innerHTML = navHtml(t);
  initSpy();
}
```

por:

```js
  $("navList").innerHTML = navHtml(t);
  syncThemeBtn();
  initSpy();
}
```

- [ ] **Step 6: Verificar**

Console: contraste — `getComputedStyle(document.documentElement).getPropertyValue('--ink-3')` → `#706e67` no claro.
Toggle: no claro o botão mostra lua e `aria-label` "Mudar para tema escuro"; clicar → tema escuro, ícone sol, label "Mudar para tema claro"; em EN os labels em inglês.
Tab pelo teclado: anel azul visível em seg buttons, icon-btns, chips, links da nav e summaries.
Visual: conferir que textos ink-3 (eyebrow, "Notion:", notas) continuam harmônicos no claro. Screenshot.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: contraste AA, foco visível, motion condicionado e toggle de tema com estado"
```

---

### Task 7: Favicon, meta description e strip mobile

**Files:**
- Modify: `Radar de projetos/Radar de Projetos USA.html` (head ~linhas 12-15; bloco `@media (max-width:560px)` ~linha 390)

- [ ] **Step 1: Head**

Substituir:

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Radar de Projetos — USA · Ybera Group</title>
```

por:

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Os 14 projetos da frente USA da Ybera: o que está em curso, o que está planejado e em que ordem. Atualizado a cada duas semanas.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%232a78d6'/%3E%3Ccircle cx='12' cy='12' r='6.5' fill='none' stroke='white' stroke-width='1.5' opacity='.5'/%3E%3Ccircle cx='12' cy='12' r='2.2' fill='white'/%3E%3Cpath d='M12 12L18.3 5.7' stroke='white' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E">
<title>Radar de Projetos — USA · Ybera Group</title>
```

- [ ] **Step 2: Strip empilhado no mobile**

No bloco `@media (max-width:560px){...}`, após a linha `.topbar{flex-direction:column}`, adicionar:

```css
  .strip{flex-direction:column;align-items:flex-start;gap:8px}
  .strip .cycle{flex-direction:column;align-items:flex-start;gap:3px}
  .strip .dot-sep{display:none}
  .strip .spacer{display:none}
```

- [ ] **Step 3: Verificar**

Favicon visível na aba (browser). A 375px: strip empilhado limpo (título da quinzena, período, atualizado, próxima atualização — sem ponto solto). Screenshot. A 1280px: strip em linha como antes.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: favicon, meta description e strip empilhado no mobile"
```

---

### Task 8: Verificação final da matriz completa

**Files:**
- Nenhuma modificação prevista (apenas correções se a verificação achar regressão).

- [ ] **Step 1: Matriz de verificação no browser**

Para cada combinação — 1280px light PT, 1280px dark PT, 375px light PT, 375px dark PT, 1280px light EN:
- Screenshot do topo, do quadro e do horizonte.
- Sem erros no console.
- Filtros funcionando, fold "Planejado" abrindo/fechando, empty states com "por quê?" abrindo.

- [ ] **Step 2: Conferir critérios de aceite da spec**

Percorrer os 9 critérios em `docs/superpowers/specs/2026-08-11-radar-usa-ux-design.md` e confirmar cada um.

- [ ] **Step 3: Grep de dependências externas**

Run: `grep -cE 'src="http|href="http' "Radar de projetos/Radar de Projetos USA.html"`
Expected: `0` (o mailto: não conta; conferir que só há `mailto:` e data URIs).

- [ ] **Step 4: Commit final (se houve correções)**

```bash
git add -A && git commit -m "chore: ajustes finais da verificação de UX/UI"
```
