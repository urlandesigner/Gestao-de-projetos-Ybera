/* Página report.html — autônoma, para stakeholder ver só o report.

   Dois modos, decididos no carregamento:

   1. NESTE navegador (o do PO) existe config + PAT no localStorage: busca no
      DevOps, mostra o report na hora e GRAVA o dado no fragmento da URL. A
      barra de endereços passa a ser, ela mesma, o link que vai pro stakeholder.
   2. Não existe token (qualquer outro navegador): lê o dado do fragmento do
      link. Sem token, sem acesso ao DevOps, sem requisição nenhuma.

   O PAT vive só no localStorage de quem o colou — localStorage é por navegador
   e por origem, não viaja com o site. Por isso o dado precisa ir no link. */
(function () {
'use strict';
const C = window.CentralCore;
const A = window.CentralApi;
const B = window.CentralBriefing;
// Como o escopo se chama pra quem lê o report. A lista de times do DevOps
// ("Squad Ecommerce, Vertical Ecommerce e Growth") é organograma interno — não
// diz nada a um diretor, e ainda muda quando o time se reorganiza.
const UNIDADE = 'Ybera US';

const LS = { config: 'central.config', pat: 'central.pat', filtros: 'central.filtros', cache: 'central.cache' };
const $ = (id) => document.getElementById(id);

function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

// Mesmos campos da base da Central: o report precisa de conclusão, prazo e pai.
// Description entra pra virar o "objetivo" do produto no cabeçalho (só o épico/
// Feature usa; nas linhas ela é ignorada).
const CAMPOS = [
  'System.Title', 'System.State', 'System.WorkItemType', 'System.Parent',
  'System.AssignedTo', 'Microsoft.VSTS.Scheduling.StartDate', 'Microsoft.VSTS.Scheduling.TargetDate',
  'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate', 'System.Description',
  // Entra pelo documento que mede ritmo de sprint: com a iteração junto, saber
  // quem está em qual sprint é filtro local sobre uma lista que já veio, e não
  // uma consulta por sprint. Não viaja no link — quem decide isso é o
  // `camposDoLink` do documento, e nenhum dos três declara este campo.
  'System.IterationPath',
];

// A consulta é presa à área do time (areaClause). Épico e Feature costumam
// morar em outra área — ou em outro projeto — e simplesmente não vêm. Sem eles
// a cadeia do produto quebra no primeiro salto e tudo cai em "sem produto".
// workitemsbatch busca POR ID e não olha área: então pedimos os pais que
// faltam, um nível por volta, até a cadeia fechar.
// Estado, prazo e descrição entram porque o produto virou cabeçalho de grupo no
// report — mostra em que pé o épico está e o objetivo dele, não só o nome.
const CAMPOS_PAI = ['System.WorkItemType', 'System.Title', 'System.Parent',
  'System.State', 'Microsoft.VSTS.Scheduling.TargetDate', 'System.Description'];
const NIVEIS_ACIMA = 4; // PBI → Feature → Épico usa 2; 4 é folga pra hierarquia torta

// As ferramentas do PO só existem quando a URL pede: é assim que a Central
// chama esta página (report.html?po=1). O link que vai pro stakeholder é montado
// sem query nenhuma, então ele nunca vê ferramenta — não por estar escondida,
// mas por não ser montada. Abrindo a URL crua, esta é uma página de leitura.
// Uma página pode ainda exigir que as ferramentas existam SÓ em
// desenvolvimento, declarando data-ferramentas="local" no <body>. É o caso do
// entregas.html: ele é o documento que vai pro stakeholder, e a Central linka
// pra ele com ?po=1 — então em produção o ?po=1 chegava junto e a barra
// aparecia pra quem só devia ler. O recorte é por HOSPEDEIRO, não por página,
// porque produção é uma cópia dos MESMOS arquivos: não dá pra publicar um
// index.html diferente.
const LOCAL = location.hostname === '' // aberto direto do disco (file://)
  || /^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const SO_LOCAL = document.body.dataset.ferramentas === 'local';
// A porta de serviço: em produção a barra ainda abre com ?ferramentas=1, que
// ninguém digita por acaso e nenhum link do site carrega. Existe porque o link
// de leitura é montado com location.origin — gerá-lo no localhost produziria um
// endereço que só abre na máquina do PO. Sem essa porta, a fixação quebraria a
// única forma de produzir o link que vai pro stakeholder.
// Mas a query VIAJA: o PO gera o link com ?po=1&ferramentas=1 na barra de
// endereços e é de lá que ele copia. Com o #r= junto, o leitor cai em modo
// leitura e a barra some — só que um link cortado no caminho chega SEM o #r=,
// e aí a porta de serviço abria a barra na cara do stakeholder. O que separa o
// PO de quem só lê não é a URL, é o token deste navegador: sem ele a barra não
// teria o que fazer (tudo nela fala com o DevOps). Então a porta pede o token.
const TEM_TOKEN = !!localStorage.getItem(LS.pat) && !!localStorage.getItem(LS.config);
const PORTA_DE_SERVICO = /(?:^|[?&])ferramentas=1(?:&|$)/.test(location.search) && TEM_TOKEN;
const FERRAMENTAS = /(?:^|[?&])po=1(?:&|$)/.test(location.search)
  && (LOCAL || PORTA_DE_SERVICO || !SO_LOCAL);

const st = {
  config: null,
  pat: localStorage.getItem(LS.pat) || '',
  usuario: (loadJSON(LS.cache) || {}).usuario || '',
  resp: (() => { const f = loadJSON(LS.filtros) || {}; return f.resp === undefined ? null : f.resp; })(),
  items: null,
  pais: [],        // pais buscados por id, fora da consulta por área
  /* Ritmo das sprints, só pra quem declara `precisaDeSprints`.
     `sprintsBrutas` é o material do DevOps (ids por sprint) e vira linha no
     render; `sprints` são as linhas já contadas que chegam pelo link. */
  sprintsBrutas: null,
  sprints: [],
  /* Ligado quando a leitura das áreas do time falhou: a consulta passou a
     valer pro projeto inteiro e os totais estão MAIORES que a realidade. Fica
     visível só pro PO — quem decide publicar o link é ele, e o leitor do link
     recebe um documento já fechado. */
  areaIncerta: false,
  erro: null,
  carregando: false,
  vazio: false,
  link: '',
  mes: null,       // null = mês corrente
  fTipos: new Set(),     // filtro do bloco de entregas
  fProdutos: new Set(),
  // Modo leitura: o dado veio do link, não do DevOps. Aí recorte e data do report
  // saem do pacote — não há config nem PAT neste navegador.
  leitura: false,
  escopo: '',
  agora: 0,
  roadmap: [], // vem de assets/roadmap.json (PO) ou do link (leitura) — nunca do DevOps
  nomes: {},   // nome de negócio por item: assets/report-nomes.json (PO) ou o link (leitura)
};

function respAtivo() { return st.resp === null ? (st.usuario || '') : st.resp; }
/* O alvo é parâmetro porque a publicação precisa do time INTEIRO, e não do
   recorte que estiver na tela — ver pacoteDoDocumento. Vazio passa tudo. */
function doResponsavel(it, alvo) {
  if (!alvo) return true;
  const r = ((it || {}).fields || {})['System.AssignedTo'];
  return !!r && r.displayName === alvo;
}
function noNome(it) { return doResponsavel(it, respAtivo()); }
function ctx() { return { base: st.config.org, pat: st.pat, fetchImpl: window.fetch.bind(window) }; }

// Mesma armadilha do app.js: PAT vencido pode chegar como NetworkError, e não
// como AuthError, quando o DevOps responde 302 pro login — o navegador corta a
// resposta redirecionada e não sobra status pra classificar. O token não se
// troca aqui: é na Central.
function mensagemDeErro(e) {
  if (e instanceof A.AuthError) return 'PAT recusado — renove o token na Central.';
  if (e instanceof A.NetworkError) return 'PAT vencido ou sem acesso — o DevOps manda pro login e o navegador corta a resposta. Renove o token na Central. Se ele estiver válido, aí sim confira a conexão.';
  return e.message;
}

/* ---------- Roadmap: única peça que não vem do DevOps ---------- */
// Vive em assets/roadmap.json, escrito à parte — o Notion não pode ser
// chamado do navegador (sem CORS liberado), e este report não guarda token
// de Notion nenhum. O mesmo saneamento serve os dois caminhos que alimentam
// st.roadmap: o arquivo (carregarRoadmap, abaixo) e o link (em lerDoLink).
// O arquivo é meu, mas tratar os dois como dado que pode vir torto é grátis
// e evita NaN se algum dia eu editar a mão e errar uma data.
// Mudou de casa em 02/10/2026: o saneamento vive em core.js porque a Central
// passou a ler o mesmo roadmap.json (bloco Roadmap do Panorama). Duplicar a
// lista branca de status era repetir, de olhos abertos, o defeito que o
// tests/roadmap-portao.test.js existe pra impedir: status novo entra num
// arquivo, não entra no outro, e o item sai da tela sem selo e sem erro.
const saneRoadmapItens = C.saneRoadmapItens;

// Independente do DevOps: busca uma vez, no boot, e não repete a cada render
// nem a cada troca de mês — o roadmap não muda com o seletor de mês.
async function carregarRoadmap() {
  try {
    const resp = await fetch('assets/roadmap.json', { cache: 'no-store' });
    if (!resp.ok) return; // arquivo ainda não existe: seção some, sem quebrar o resto
    const dado = await resp.json();
    st.roadmap = saneRoadmapItens(dado.itens);
  } catch (e) {
    /* Degradação de propósito: sem roadmap o documento continua de pé. Mas o PO
       precisa saber que a seção sumiu antes de publicar — some sem deixar
       buraco, e quem lê o link não tem como suspeitar que faltou algo. */
    console.warn('[Report] roadmap.json não carregou: a seção de projetos não vai aparecer. Motivo: ' + e.message);
  }
}

/* ---------- Nome de negócio: a camada editorial ---------- */
// assets/report-nomes.json: id do item → { nome, resumo }. É o único texto do
// documento escrito por gente, não lido do sistema — o título de lá é jargão
// ("[GLOBAL] BOGO via MetaFields") e não diz nada ao stakeholder. Só épicos e
// Features ganham nome; PBI fica com o título, agrupado embaixo. O mesmo
// saneamento serve o arquivo (PO) e o link (leitura): id numérico, texto curto.
function saneNomes(obj) {
  const out = {};
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      if (!/^\d+$/.test(k)) continue;
      const v = obj[k] || {};
      const nome = String(v.nome || '').trim().slice(0, 160);
      if (!nome) continue;
      out[k] = { nome, resumo: String(v.resumo || '').trim().slice(0, 300) };
    }
  }
  return out;
}

async function carregarNomes() {
  try {
    const resp = await fetch('assets/report-nomes.json', { cache: 'no-store' });
    if (!resp.ok) return; // sem arquivo: títulos originais, sem erro
    const dado = await resp.json();
    st.nomes = saneNomes(dado.itens);
  } catch (e) {
    console.warn('[Report] report-nomes.json não carregou: os títulos saem como estão no DevOps,'
      + ' não com os nomes de negócio. Motivo: ' + e.message);
  }
}

function renderBadge() {
  const b = $('badge');
  const estado = (!st.pat || !st.config) ? 'sem-token' : st.erro ? 'vencido' : st.carregando ? 'atualizando' : 'conectado';
  b.dataset.estado = estado;
  b.textContent = { 'sem-token': 'sem token', vencido: 'erro', atualizando: 'atualizando…', conectado: 'conectado' }[estado];
}

/* Aviso de escopo furado, só no modo PO. Não entra no corpo do documento: o
   leitor do link recebe dado já fechado, e enfiar alerta de ferramenta no que
   vai pro stakeholder é ruído. Quem precisa decidir "publico ou não" é o PO. */
function avisarAreaIncerta() {
  const barra = $('filtro-global') || $('resp-global');
  if (!barra || !barra.parentNode) return;
  let aviso = $('aviso-area');
  if (!st.areaIncerta) { if (aviso) aviso.remove(); return; }
  if (!aviso) {
    aviso = document.createElement('p');
    aviso.id = 'aviso-area';
    aviso.className = 'erro';
    aviso.textContent = 'Não deu pra ler as áreas do time: esta consulta valeu pro projeto'
      + ' inteiro e os totais estão maiores que a realidade. Atualize antes de publicar o link.';
    barra.parentNode.insertBefore(aviso, barra.nextSibling);
  }
}

function renderFiltro() {
  avisarAreaIncerta();
  const sel = $('resp-global');
  const nomes = new Set();
  for (const it of st.items || []) {
    const r = (it.fields || {})['System.AssignedTo'];
    if (r && r.displayName) nomes.add(r.displayName);
  }
  if (respAtivo()) nomes.add(respAtivo());
  if (!nomes.size) { sel.hidden = true; return; }
  sel.hidden = false;
  const lista = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  sel.innerHTML = '<option value="">todos os responsáveis</option>' +
    lista.map((n) => `<option value="${B.esc(n)}"${n === respAtivo() ? ' selected' : ''}>${B.esc(n)}</option>`).join('');
}

/* ---------- Filtro do bloco de entregas ---------- */
// Os chips, a lista e os data-* vêm prontos do briefing. Aqui só escondemos
// linha: nada é redesenhado a cada tecla, e a regra de agrupamento não é
// duplicada em dois lugares.
function aplicarFiltroEntregas() {
  const lista = $('lista-entregas');
  if (!lista) return;
  const campo = $('busca-entregas');
  const q = ((campo && campo.value) || '').trim().toLowerCase();
  let visiveis = 0;
  let total = 0;
  for (const grupo of lista.querySelectorAll('.grupo-produto')) {
    const okGrupo = !st.fProdutos.size || st.fProdutos.has(grupo.dataset.produto);
    let n = 0;
    for (const li of grupo.querySelectorAll('li')) {
      total += 1;
      const ok = okGrupo
        && (!st.fTipos.size || st.fTipos.has(li.dataset.tipo))
        && (!q || (li.dataset.busca || '').includes(q));
      li.hidden = !ok;
      if (ok) n += 1;
    }
    // O épico que virou cabeçalho conta como item. O cabeçalho em si é rótulo do
    // grupo: nunca se esconde sozinho, só junto com o grupo inteiro.
    const tipoProprio = grupo.dataset.proprioTipo;
    if (tipoProprio) {
      total += 1;
      if (okGrupo
        && (!st.fTipos.size || st.fTipos.has(tipoProprio))
        && (!q || (grupo.dataset.proprioBusca || '').includes(q))) n += 1;
    }
    grupo.hidden = n === 0;
    visiveis += n;
  }
  const conta = $('conta-entregas');
  if (conta) conta.textContent = visiveis + ' de ' + total;
  const limpar = $('limpar-entregas');
  if (limpar) limpar.hidden = !(st.fTipos.size || st.fProdutos.size || q);
}

function limparFiltroEntregas() {
  st.fTipos.clear();
  st.fProdutos.clear();
  const campo = $('busca-entregas');
  if (campo) campo.value = '';
  for (const c of document.querySelectorAll('.chip-doc.ativo')) c.classList.remove('ativo');
  aplicarFiltroEntregas();
}

// A rolagem é animada à mão, quadro a quadro, em vez de `behavior: 'smooth'`.
// Motivo prático: o smooth nativo simplesmente não anima em alguns ambientes — e
// quando não anima, não rola nada, o que deixa a navegação morta. Animando aqui,
// o movimento é o mesmo em todo lugar. A curva e o tempo estão no core, com teste.
let rolagemAtual = 0; // clique novo cancela o anterior, senão as duas se brigam

function rolarAte(alvo) {
  // A distância do topo vem do CSS (scroll-margin-top), que já reserva a altura
  // da navegação fixa. Duplicar esse número aqui seria pedir pra desencontrar.
  const margem = parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0;
  const inicio = window.scrollY;
  const destino = Math.max(0, Math.round(alvo.getBoundingClientRect().top + inicio - margem));
  const distancia = destino - inicio;
  if (!distancia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, destino);
    return;
  }
  const duracao = C.duracaoRolagem(distancia);
  const meu = ++rolagemAtual;
  let t0 = null;
  let chegou = false;
  const passo = (agora) => {
    if (meu !== rolagemAtual) return;
    if (t0 === null) t0 = agora;
    const t = Math.min(1, (agora - t0) / duracao);
    window.scrollTo(0, inicio + distancia * C.suavizarRolagem(t));
    if (t < 1) requestAnimationFrame(passo);
    else chegou = true;
  };
  requestAnimationFrame(passo);
  // Rede de segurança: requestAnimationFrame não roda com o compositor pausado
  // (aba em segundo plano, por exemplo). Sem isso a animação nunca começaria e o
  // clique no menu não levaria a lugar nenhum. Aqui ele chega — sem deslizar.
  setTimeout(() => {
    if (chegou || meu !== rolagemAtual) return;
    rolagemAtual += 1; // mata a animação: senão, ao voltar pra aba, o rAF acorda,
    window.scrollTo(0, destino); // pula de volta pro início e rola tudo de novo
  }, duracao + 150);
}

// A pílula de navegação quebra em 1 ou 2 linhas dependendo da largura da tela
// e de quantas seções o mês tem — o CSS não sabe a própria altura de antemão.
// Medindo aqui e escrevendo numa custom property (que --nav-alt em .doc-sec
// lê), o scroll-margin-top nunca fica desatualizado: no celular a pílula em 2
// linhas passava de um valor fixo de 4rem, e a âncora rolava o título da
// seção pra debaixo da nav sticky.
function medirAlturaNav() {
  const doc = document.querySelector('.report-doc');
  const nav = doc && doc.querySelector('.doc-nav');
  if (!doc || !nav) return;
  doc.style.setProperty('--nav-alt', (nav.offsetHeight + 12) + 'px');
}

// Delegação: o documento é redesenhado a cada mês, então ouvir no container é o
// que sobrevive. E a navegação NÃO usa o href: mexer no hash apagaria o dado do
// link — quem abriu por link perderia o report ao clicar num item do menu.
function ligarDocumento() {
  const box = $('report');
  box.addEventListener('click', (ev) => {
    const item = ev.target.closest('.doc-nav a');
    if (item) {
      ev.preventDefault();
      const alvo = document.getElementById(item.getAttribute('href').slice(1));
      if (alvo) rolarAte(alvo);
      return;
    }
    if (ev.target.closest('#limpar-entregas')) { limparFiltroEntregas(); return; }
    const chip = ev.target.closest('.chip-doc');
    if (!chip) return;
    const conjunto = chip.dataset.filtro === 'tipo' ? st.fTipos : st.fProdutos;
    const valor = chip.dataset.valor;
    if (conjunto.has(valor)) conjunto.delete(valor); else conjunto.add(valor);
    chip.classList.toggle('ativo', conjunto.has(valor));
    chip.setAttribute('aria-pressed', conjunto.has(valor) ? 'true' : 'false');
    aplicarFiltroEntregas();
  });
  box.addEventListener('input', (ev) => {
    if (ev.target.id === 'busca-entregas') aplicarFiltroEntregas();
  });
  // O seletor de mês é redesenhado junto com o documento: ouvir aqui é o que
  // sobrevive a cada troca.
  box.addEventListener('change', async (ev) => {
    if (ev.target.id !== 'mes-global') return;
    st.mes = ev.target.value || null;
    render();
    // O redesenho matou o select no meio do gesto: devolve o foco pro novo,
    // senão quem navega por teclado é jogado pro começo da página.
    const sel = $('mes-global');
    if (sel) sel.focus();
    await gravarLink(); // mês novo, link novo
  });
}

function render() {
  renderBadge();
  // Antes de qualquer saída antecipada: quem não tem token nem config também
  // precisa ver a barra (é onde está o caminho de volta pra Central).
  $('ferramentas').hidden = st.leitura || !FERRAMENTAS;
  const box = $('report');
  if (!st.leitura) {
    if (!st.config) {
      box.innerHTML = '<p class="mudo">Nenhuma configuração encontrada. Abra a <a href="central.html">Central</a> e conecte o Azure DevOps primeiro.</p>';
      return;
    }
    if (!st.pat) {
      box.innerHTML = '<p class="mudo">Sem token neste navegador. Abra a <a href="central.html">Central</a> e cole o PAT.</p>';
      return;
    }
  }
  const erroHtml = st.erro ? `<p class="erro">${B.esc(st.erro)}</p>` : '';
  if (!st.items) { box.innerHTML = erroHtml + (st.erro ? '' : '<p class="mudo">carregando…</p>'); return; }
  if (!st.leitura) renderFiltro();
  const itensDoDoc = st.leitura ? st.items : st.items.filter(noNome);
  const r = B.htmlReport({
    items: itensDoDoc,
    todos: st.items.concat(st.pais), // o produto mora no pai — de outro dono, ou de outra área
    /* O ritmo é contado AQUI, sobre a mesma lista que desenha o corpo — nunca
       numa lista própria. É o que mantém a linha da sprint e as entregas do
       documento na mesma régua quando o recorte de responsável muda. */
    sprints: st.leitura ? st.sprints : ritmoAgora(itensDoDoc),
    // No link, o objetivo + rumo e os pedidos de decisão vêm prontos (o backlog
    // inteiro não viaja). Ao vivo (PO), ficam undefined e o briefing calcula.
    produtos: st.leitura ? st.produtos : undefined,
    decisoes: st.leitura ? st.decisoes : undefined,
    // Roadmap não bifurca por modo: nos dois casos já chega pronto em
    // st.roadmap (do arquivo estático ou do link), nunca recalculado aqui.
    roadmap: st.roadmap,
    contagens: st.contagens, // só no formato curto; ao vivo fica null e o documento conta
    nomes: st.nomes, // idem: do arquivo (PO) ou do link (leitura), já saneado
    agora: st.leitura ? st.agora : Date.now(),
    escopo: st.leitura ? st.escopo : respAtivo(),
    unidade: UNIDADE,
    mes: st.mes,
  });
  st.fTipos.clear(); // documento novo, chips novos: o estado anterior não vale
  st.fProdutos.clear();
  // A caixa do link é confirmação de UM momento. Documento novo = link novo: a
  // caixa aberta mostrando URL velha mandava o stakeholder pro report errado.
  const caixa = $('caixa-link');
  if (caixa && !caixa.hidden) caixa.hidden = true;
  box.innerHTML = erroHtml + r.html;
  medirAlturaNav();
  aplicarFiltroEntregas(); // acerta o contador e esconde o "limpar"
  st.vazio = r.vazio;
  $('copiar').disabled = r.vazio;
  renderSemNome();
}

async function buscarPais(base) {
  const porId = new Map(base.map((it) => [it.id, it]));
  const tentados = new Set();
  const extras = [];
  for (let volta = 0; volta < NIVEIS_ACIMA; volta++) {
    const faltando = [...new Set([...porId.values()]
      .map((it) => (it.fields || {})['System.Parent'])
      .filter((pai) => pai && !porId.has(pai) && !tentados.has(pai)))];
    if (!faltando.length) break;
    faltando.forEach((id) => tentados.add(id)); // pai sem permissão não volta: não insiste
    let crus = [];
    try { crus = await A.getFields(ctx(), faltando, CAMPOS_PAI); } catch (e) { break; }
    if (!crus.length) break;
    for (const it of crus) { porId.set(it.id, it); extras.push(it); }
  }
  return extras;
}

async function carregar() {
  if (!st.config || !st.pat || st.carregando) return;
  st.carregando = true;
  st.erro = null;
  st.areaIncerta = false; // cada carga responde por si: aviso velho mentiria
  render();
  try {
    if (!st.usuario) {
      try { st.usuario = await A.currentUser(ctx()); } catch (e) { /* filtro só começa em "todos" */ }
    }
    const todos = [];
    const escopos = []; // projeto + área de cada time, pra quem mede sprint depois
    for (const p of st.config.projects.filter((x) => !x.hidden)) {
      let areas = [];
      try {
        areas = await A.teamAreas(ctx(), p.projectName, p.teamName);
      } catch (e) {
        /* Aqui o estrago é publicado: sem área o documento conta o projeto
           inteiro e o total sai maior que a realidade. O PO precisa ver antes
           de mandar o link. */
        st.areaIncerta = true;
        console.warn('[Central] não deu pra ler as áreas de ' + p.teamName
          + ' — a consulta passa a valer pro PROJETO INTEIRO, e os números incham com itens de outros times.'
          + ' Motivo: ' + mensagemDeErro(e));
      }
      escopos.push({ p, areas });
      const ids = await A.runWiql(ctx(), p.projectName, p.teamName, C.wiqlProdutos(areas));
      const crus = ids.length ? await A.getFields(ctx(), ids, CAMPOS) : [];
      for (const it of crus) todos.push(Object.assign({ projeto: p.projectName }, it));
    }
    // Itens e pais são UM par: atribuir separado fazia o documento degradar no
    // meio do refresh (grupos desmontando na tela) e, num fetch falho, deixava
    // itens novos com pais de ninguém — e o link era reescrito desse estado.
    st.pais = await buscarPais(todos);
    /* Sustentação sai aqui, uma vez só, e não em cada lugar que conta: daqui
       descem o documento, o placar e o pacote do link de leitura — filtrar num
       e esquecer de outro é como a capa e o corpo passam a discordar.
       Os pais entram na leitura da cadeia mas NÃO são filtrados: o guarda-chuva
       costuma estar fora do recorte do PO, e sem ele os filhos pareceriam
       órfãos e continuariam contando. */
    st.items = C.foraDaManutencao(todos, todos.concat(st.pais));
    st.sprintsBrutas = B.precisaDeSprints === true ? await buscarRitmo(escopos) : null;
  } catch (e) {
    st.erro = mensagemDeErro(e);
  } finally {
    st.carregando = false;
    render();
    // Com erro no caminho, o par em memória pode ser o antigo — o link que já
    // está na barra corresponde a ele. Não se publica estado incerto.
    if (st.items && !st.erro) await gravarLink();
  }
}

/* ---------- Ritmo das sprints ---------- */
/* Só existe pra documento que DECLARA precisar, em `B.precisaDeSprints`. É o
   mesmo arranjo de `camposDoLink` e `contagensDoLink`, e pelo mesmo motivo:
   este arquivo serve três documentos, e dois deles não falam de sprint. Quem
   não declara não gasta uma requisição sequer, e segue byte a byte como antes.

   O que volta daqui é MATÉRIA-PRIMA, não a linha pronta: só os ids que estavam
   na sprint hoje e no fim dela. Quem está em qual sprint HOJE sai de `st.items`,
   que já veio, por isso não há uma consulta por sprint pra isso. E a linha é
   montada no render, porque ela depende do recorte de responsável — que troca
   sem recarregar. Montá-la aqui congelaria o número do recorte antigo embaixo
   de um documento já redesenhado. */
async function buscarRitmo(escopos) {
  const periodo = typeof B.periodoDoDocumento === 'function' ? B.periodoDoDocumento() : [];
  if (!periodo.length) return [];
  const agora = Date.now();
  const linhas = [];
  for (const { p, areas } of escopos) {
    let iteracoes = [];
    try {
      iteracoes = await A.teamIterations(ctx(), p.projectName, p.teamName);
    } catch (e) {
      /* Sem as iterações o documento perde a seção, não a página: o resto dele
         não depende de sprint nenhuma. Mas avisa, senão "o time não fechou
         sprint no período" e "a chamada falhou" ficam idênticos na tela. */
      console.warn('[Central] não deu pra ler as sprints de ' + p.teamName
        + ' — a seção de ritmo sai do documento. Motivo: ' + mensagemDeErro(e));
      continue;
    }
    for (const sp of C.sprintsDoPeriodo(iteracoes, periodo)) {
      /* Transbordo só existe em sprint FECHADA, e por isso só ela custa
         consulta. Na corrente ninguém transbordou ainda; na futura nem começou.
         Perguntar ali gastaria duas chamadas por abertura pra receber lista
         vazia, sempre — e um ASOF numa data futura não quer dizer nada.
         Quem está na sprint HOJE sai da lista que o documento já carregou. */
      if (C.estadoDaSprint(sp, agora) !== 'fechada') {
        linhas.push({ sprint: sp, idsAgora: null, idsNoFim: null });
        continue;
      }
      /* As duas pontas saem do MESMO construtor, variando só o instante. Foi o
         que fez o transbordo parar de misturar "saiu da sprint" com "as duas
         consultas perguntavam coisas diferentes" — medido, 141 contra 147. */
      const qAgora = C.wiqlIteracao(sp.path, areas);
      const qNoFim = C.wiqlIteracao(sp.path, areas, Date.parse(sp.finish) + C.FIM_DO_DIA);
      if (!qAgora || !qNoFim) continue;
      try {
        const [idsAgora, idsNoFim] = await Promise.all([
          A.runWiql(ctx(), p.projectName, p.teamName, qAgora),
          A.runWiql(ctx(), p.projectName, p.teamName, qNoFim),
        ]);
        linhas.push({ sprint: sp, idsAgora, idsNoFim });
      } catch (e) {
        /* A sprint continua na seção, sem o transbordo: o que ela entregou sai
           da lista local e segue correto. Some só a parte que a consulta
           responderia. */
        console.warn('[Central] não deu pra saber o que transbordou da ' + sp.name
          + ' — a linha dela fica sem essa parte. Motivo: ' + mensagemDeErro(e));
        linhas.push({ sprint: sp, idsAgora: null, idsNoFim: null });
      }
    }
  }
  // Ordem crescente mesmo com mais de um time: a seção é série temporal, e
  // concatenar por projeto deixaria setembro de um antes de agosto do outro.
  return linhas.sort((a, b) => Date.parse(a.sprint.finish) - Date.parse(b.sprint.finish));
}

/* A linha pronta, no recorte que o leitor está vendo agora.

   O instante é o MESMO que o documento usa pra tudo — o de hoje pro PO, o da
   geração pra quem abre o link. É ele que decide se a sprint está fechada, e
   um "agora" próprio aqui faria a linha discordar da data impressa na capa. */
function ritmoAgora(itensNoEscopo) {
  const agora = st.leitura ? st.agora : Date.now();
  return (st.sprintsBrutas || []).map((x) =>
    C.ritmoDaSprint(x.sprint, x.idsAgora, x.idsNoFim, itensNoEscopo, agora));
}

/* Vindo do link, as linhas já estão contadas — e são forjáveis como todo o
   resto do pacote. Texto curto, número inteiro e não negativo. */
function saneRitmo(lista) {
  const n = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const txt = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  // O estado é vocabulário fechado: fora da lista vira '' e a linha não afirma
  // nada, em vez de imprimir na tela o que veio escrito na URL.
  const ESTADOS = ['fechada', 'corrente', 'futura'];
  /* Os itens viajam desde que o documento virou acompanhamento. Título e estado
     são texto que veio do DevOps e volta pela URL: cortados no tamanho, e o
     `feito` reduzido a booleano — é ele que pinta o ponto de verde, e um valor
     torto ali marcaria como entregue o que não está. O teto de 300 por sprint é
     folga sobre as ~170 de uma sprint real. */
  /* `tipo` viaja porque o selo do cartão o mostra, e um Bug marcado "PBI" seria
     o documento afirmando o que não é. Vocabulário fechado, como o estado da
     sprint: o que não está na lista vira 'outro' em vez de virar classe de CSS
     escrita por quem editou a URL. */
  const TIPOS = ['epic', 'feature', 'pbi', 'bug', 'task', 'outro'];
  const itensDe = (v) => (Array.isArray(v) ? v : []).slice(0, 300).map((y) => ({
    titulo: txt((y || {}).titulo, 200),
    estado: txt((y || {}).estado, 40),
    tipo: TIPOS.includes((y || {}).tipo) ? y.tipo : 'outro',
    feito: !!(y || {}).feito,
  })).filter((y) => y.titulo);
  return (Array.isArray(lista) ? lista : []).slice(0, 60).map((x) => ({
    nome: txt((x || {}).nome, 80),
    start: txt((x || {}).start, 40) || null,
    finish: txt((x || {}).finish, 40) || null,
    estado: ESTADOS.includes((x || {}).estado) ? x.estado : '',
    entregues: n((x || {}).entregues),
    total: n((x || {}).total),
    transbordaram: n((x || {}).transbordaram),
    itens: itensDe((x || {}).itens),
    transbordados: itensDe((x || {}).transbordados),
  })).filter((x) => x.nome);
}

/* ---------- Link de leitura ---------- */
// O stakeholder abre um LINK, não um arquivo. E ele não tem PAT — então o dado
// viaja no FRAGMENTO da URL (depois do #), que o navegador jamais envia ao
// servidor: a Vercel entrega só a página estática, e o conteúdo existe apenas
// dentro do link. Nada de dado de negócio parado em host público.
const CAMPOS_LINK = [
  'System.WorkItemType', 'System.State', 'System.Title', 'System.Parent',
  'Microsoft.VSTS.Scheduling.TargetDate', 'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate',
];
/* Esta lista serve ao report e ao v2, que mostram título, prazo e data de
   fechamento item a item. O Entregas não mostra NADA disso: os cartões são
   texto curado, e do DevOps ele só lê tipo, estado e pai pra contar. Levar os
   outros quatro campos era carregar o backlog inteiro dentro da URL — medido no
   link real do Urlan, 5.208 caracteres, dos quais os títulos sozinhos eram o
   maior pedaço.

   Então o DOCUMENTO declara o que lê, em `camposDoLink`, e quem não declara
   fica com a lista completa — report e v2 seguem intocados. */
const camposDoLink = () => (Array.isArray(B.camposDoLink) && B.camposDoLink.length)
  ? B.camposDoLink : CAMPOS_LINK;
const LIMITE_LINK = 8000; // acima disso ferramentas de mensagem começam a cortar

function b64url(bytes) {
  let bin = '';
  new Uint8Array(bytes).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deB64url(txt) {
  const b64 = txt.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// O writer tem promessa própria: quando o gzip é inválido ela rejeita junto com
// a leitura. Sem o catch, ela virava "unhandled rejection" no console mesmo com
// o erro já tratado embaixo. Quem reporta é o await da leitura.
async function comprimir(txt) {
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(txt)).catch(() => {});
  w.close().catch(() => {});
  return b64url(await new Response(cs.readable).arrayBuffer());
}

async function descomprimir(txt) {
  const ds = new DecompressionStream('gzip');
  const w = ds.writable.getWriter();
  w.write(deB64url(txt)).catch(() => {});
  w.close().catch(() => {});
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}

// Só os campos que o report lê: responsável já foi aplicado antes, e data de
// início não entra em nada aqui. Menos dado = link mais curto.
function enxugar(items) {
  return items.map((it) => {
    const f = it.fields || {};
    const campos = {};
    for (const c of camposDoLink()) if (f[c] !== undefined) campos[c] = f[c];
    return { id: it.id, projeto: it.projeto, fields: campos };
  });
}

// Grava o report no próprio endereço da página. Sem botão, sem etapa: quando o
// report aparece, o link já está pronto na barra de endereços. replaceState não
// cria entrada nova no histórico — o botão "voltar" continua indo pra Central.
// Pais que sustentam o "produto" de cada item. Entram no link só com o mínimo
// pra montar a cadeia PBI → Feature → Épico — não aparecem em lista nenhuma do
// report, e sem eles o leitor do link veria tudo em "Sem produto associado".
const CAMPOS_CADEIA = ['System.WorkItemType', 'System.Title', 'System.Parent',
  'System.State', 'Microsoft.VSTS.Scheduling.TargetDate'];
// O pai carrega o MENOR entre o que a cadeia precisa e o que o documento lê:
// sem a interseção, podar os itens e deixar os ancestrais gordos devolveria
// metade da economia — os pais são poucos, mas o título deles é texto longo.
const camposDaCadeia = () => CAMPOS_CADEIA.filter((c) => camposDoLink().includes(c));
function cadeiaDeProdutos(mostrados, todos) {
  const porId = new Map((todos || []).map((it) => [it.id, it]));
  const dentro = new Set(mostrados.map((it) => it.id));
  const extras = new Map();
  for (const it of mostrados) {
    let pai = (it.fields || {})['System.Parent'];
    while (pai && !dentro.has(pai) && !extras.has(pai)) {
      const p = porId.get(pai);
      if (!p) break; // pai fora da consulta: a cadeia para aqui, sem inventar
      const f = p.fields || {};
      const campos = {};
      for (const c of camposDaCadeia()) if (f[c] !== undefined) campos[c] = f[c];
      extras.set(pai, { id: p.id, fields: campos });
      pai = f['System.Parent'];
    }
  }
  return [...extras.values()];
}

// Objetivo + rumo por produto, assados no link. O % é calculado do backlog
// inteiro (st.items + pais), mas só viajam os produtos que o leitor vai ver
// (os referenciados pelos itens mostrados) — link enxuto e % honesto.
function produtosDoLink(mostrados) {
  const info = C.resumoProdutos(st.items.concat(st.pais));
  const ids = new Set([...C.mapaDeProdutos(mostrados.concat(st.pais)).values()].map((p) => p.id));
  const out = {};
  for (const id of ids) if (info[id]) out[id] = info[id];
  return out;
}

// Pedido de decisão (marcador "Decisão:" na descrição) dos itens que têm um —
// só esses viajam no link, então fica enxuto.
function decisoesDoLink(mostrados) {
  const out = {};
  for (const it of mostrados) { const p = C.pedidoDeDecisao(it); if (p) out[it.id] = p; }
  return out;
}

// Nome de negócio só dos itens que o leitor vai ver (e dos produtos que os
// agrupam) — link enxuto, título cru nunca chega ao stakeholder.
function nomesDoLink(mostrados) {
  const ids = new Set(mostrados.map((it) => it.id));
  for (const p of C.mapaDeProdutos(mostrados.concat(st.pais)).values()) ids.add(p.id);
  const out = {};
  for (const id of ids) if (st.nomes[id]) out[id] = st.nomes[id];
  return out;
}

/* ---------- Ferramenta do PO: o que ainda está sem nome ---------- */
// Épicos e Features que o documento mostra e ainda não têm nome de negócio:
// tudo em aberto no recorte, mais o que entregou no mês escolhido, mais os
// produtos que agrupam os itens (que costumam estar em outro nome). É a lista
// que vira rascunho de nomes — o PO copia em JSON, alguém escreve, e o
// resultado entra em assets/report-nomes.json.
function semNome() {
  if (!st.items) return [];
  const mostrados = st.items.filter(noNome);
  const porId = new Map(st.items.concat(st.pais).map((it) => [it.id, it]));
  const mesKey = st.mes || new Date().toISOString().slice(0, 7);
  const candidatos = new Map();
  const considera = (it) => {
    if (!it || candidatos.has(it.id) || st.nomes[it.id]) return;
    const f = it.fields || {};
    const nivel = C.levelOf(f['System.WorkItemType']);
    if (nivel === 'pbi') return;
    candidatos.set(it.id, { id: it.id, tipo: nivel, titulo: f['System.Title'] || '' });
  };
  for (const it of mostrados) {
    const f = it.fields || {};
    if (!C.isTerminalState(f['System.State'])) { considera(it); continue; }
    const quando = f['Microsoft.VSTS.Common.ClosedDate'] || f['System.ChangedDate'] || '';
    if (String(quando).slice(0, 7) === mesKey) considera(it);
  }
  for (const p of C.mapaDeProdutos(mostrados.concat(st.pais)).values()) considera(porId.get(p.id));
  return [...candidatos.values()].sort((a, b) =>
    (a.tipo === b.tipo ? a.titulo.localeCompare(b.titulo, 'pt-BR') : a.tipo === 'epic' ? -1 : 1));
}

function renderSemNome() {
  const btn = $('sem-nome');
  if (!btn) return;
  const lista = (st.leitura || !FERRAMENTAS) ? [] : semNome();
  btn.hidden = !lista.length;
  btn.textContent = lista.length ? `${lista.length} sem nome` : '';
}

async function copiarSemNome() {
  const lista = semNome();
  if (!lista.length) return;
  const esqueleto = {};
  for (const x of lista) esqueleto[x.id] = { nome: '', resumo: '', _titulo: x.titulo, _tipo: x.tipo };
  const txt = JSON.stringify(esqueleto, null, 2);
  let copiou = true;
  try { await navigator.clipboard.writeText(txt); } catch (e) { copiou = false; }
  const caixa = $('caixa-link');
  caixa.hidden = false;
  caixa.innerHTML = `
    <p class="link-aviso">${copiou ? 'Copiado. ' : ''}${lista.length} ${lista.length === 1 ? 'item' : 'itens'} sem nome de negócio, em JSON —
    cole pra quem vai escrever os nomes; preenchido, entra em <b>assets/report-nomes.json</b> (o <b>_titulo</b> é só referência).</p>
    <textarea id="campo-sem-nome" readonly aria-label="Itens sem nome de negócio" rows="8">${B.esc(txt)}</textarea>`;
  const campo = $('campo-sem-nome');
  campo.focus();
  campo.select();
}

let geracaoLink = 0; // troca rápida de mês: só a gravação mais nova pode escrever

/* O DOCUMENTO VIRA PACOTE — e esta função é a única porta, como `aplicarPacote`
   é a única na volta.

   Duas saídas usam o mesmo pacote: o fragmento do link e o arquivo publicado.
   Montá-lo em dois lugares faria o arquivo e o link divergirem no primeiro
   campo novo, e aí o mesmo documento diria coisas diferentes conforme o
   caminho por onde chegou. */
/* `semRecorte` é o que separa as duas saídas que passam por aqui.

   O LINK carrega o que está na tela: mandar a sua fatia pra alguém é um uso
   legítimo dele, e o filtro é a forma de escolher a fatia.

   O ARQUIVO PUBLICADO, não. Ele mora num endereço fixo que o time inteiro abre
   toda semana — e sai do mesmo botão, na mesma tela, sem jeito de quem abre
   saber que veio recortado. Aconteceu em 08/10/2026: a primeira publicação de
   outubro saiu com o filtro no PO, e a Sprint 20 foi publicada com 12 itens em
   vez de 42. Documento de acompanhamento de time nunca quer o recorte de uma
   pessoa, então a decisão deixou de ser do estado da tela. */
function pacoteDoDocumento(semRecorte) {
  const recorte = semRecorte ? '' : respAtivo();
  const mostrados = st.items.filter((it) => doResponsavel(it, recorte));
  /* O `escopo` do pacote é a ASSINATURA da capa ("Product Owner: X"), não o
     recorte — nada do lado do leitor filtra por ele, porque os itens já chegam
     filtrados. Os dois andavam no mesmo campo, e por isso desligar o filtro
     apagava a assinatura: a primeira publicação de outubro foi ao ar sem ela.

     Sem recorte, assina quem é dono do token. É o mesmo nome que o filtro
     mostraria se ninguém o tivesse mexido — `respAtivo()` já parte dele. */
  const escopo = recorte || st.usuario || '';
  /* Dois formatos de pacote, e o documento escolhe.

     O report e o v2 LISTAM itens: título, estado e prazo de cada um vão pra
     tela, então o link precisa levá-los. O Entregas não lista nada disso —
     ele extrai do board cinco números, e só. Quando o documento sabe fazer
     essa conta (`contagensDoLink`), ela é feita AQUI, no navegador de quem
     gera, e o link leva o resultado em vez do material bruto.

     O leitor aceita os dois: link novo traz `contagens`, link já
     compartilhado traz `items` e continua contando como antes. É o que
     impede que encurtar o link de hoje quebre o que já está no grupo de
     alguém. */
  const cabecalho = {
    v: 1,
    em: Date.now(),
    escopo,
    mes: st.mes, // quem abrir o link cai no mês que eu estava vendo
    roadmap: st.roadmap, // já veio saneado de assets/roadmap.json
  };
  const pacote = typeof B.contagensDoLink === 'function'
    ? Object.assign(cabecalho, {
      contagens: B.contagensDoLink(mostrados, st.items.concat(st.pais)),
      /* As linhas de sprint viajam CONTADAS — e passam pelo MESMO saneador
         que lê o pacote do outro lado. Não é zelo repetido: `ritmoDaSprint`
         devolve a forma curta inteira (id, responsável, tipo), e nada disso
         é desenhado. Sem a poda, o nome de cada pessoa do time entraria num
         arquivo publicado à toa, e o pacote carregaria três campos mortos por
         item. Uma função só nas duas pontas é o que garante que o que sai é
         exatamente o que entra. */
      sprints: B.precisaDeSprints === true ? saneRitmo(ritmoAgora(mostrados)) : undefined,
    })
    : Object.assign(cabecalho, {
      items: enxugar(mostrados),
      ancestrais: cadeiaDeProdutos(mostrados, st.items.concat(st.pais)),
      produtos: produtosDoLink(mostrados), // objetivo + rumo, prontos
      decisoes: decisoesDoLink(mostrados), // pedido de decisão por item travado
      nomes: nomesDoLink(mostrados), // nome de negócio só do que o leitor vê
    });
  return pacote;
}

async function gravarLink() {
  if (st.leitura) return; // o link já É a página: reescrever apagaria o dado
  const minha = ++geracaoLink;
  st.link = '';
  if (!st.items || st.vazio) { history.replaceState(null, '', location.pathname + location.search); return; }
  try {
    const carga = '#r=' + await comprimir(JSON.stringify(pacoteDoDocumento()));
    if (minha !== geracaoLink) return; // outra gravação começou depois: ela manda
    // O link que ele copia é limpo. O que fica na barra de endereços preserva o
    // ?po=1, senão um F5 tiraria as ferramentas dele.
    st.link = location.origin + location.pathname + carga;
    history.replaceState(null, '', location.pathname + location.search + carga);
  } catch (e) {
    // Link é conveniência: falhar em montá-lo não é falha do DOCUMENTO, que está
    // na tela. Reportar como erro derrubava badge e redesenho — avisa na caixa.
    if (minha === geracaoLink) mostrarLink('', 'Não deu pra montar o link agora: ' + e.message);
  }
}

/* PUBLICAR: baixa o pacote como arquivo, pro endereço fixo do documento.

   O navegador não escreve no repositório — então "publicar" é sempre levar um
   arquivo até lá. O botão entrega o arquivo já com o nome certo; quem fecha o
   ciclo é ./scripts/publicar-dados.sh, que o tira de Downloads, põe no lugar e
   sincroniza.

   Sem compressão, diferente do fragmento: lá o limite é o tamanho da URL, aqui
   é um arquivo servido por HTTP, que já chega comprimido pelo gzip do
   servidor. Em texto puro, `git diff` mostra o que mudou entre duas
   publicações — comprimido seria um borrão binário a cada commit. */
function publicarDados() {
  const caixa = $('caixa-link');
  const arquivo = (typeof B.arquivoDeDados === 'string' ? B.arquivoDeDados : '').split('/').pop();
  if (!arquivo) return;
  if (!st.items || st.vazio) { mostrarLink('', 'Não há documento pra publicar ainda.'); return; }
  try {
    const url = URL.createObjectURL(new Blob([JSON.stringify(pacoteDoDocumento(true), null, 1)],
      { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = arquivo;
    a.click();
    // Soltar na hora vazaria o blob antes do download começar em alguns
    // navegadores; um tique depois o arquivo já foi lido.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (caixa) {
      caixa.hidden = false;
      /* Quando o que foi publicado NÃO é o que está na tela, a tela diz. Sem
         isto a divergência é invisível: o PO olha o recorte dele, clica, e o
         arquivo sai com outro conteúdo — certo, mas sem ninguém saber. */
      const recorte = respAtivo();
      caixa.innerHTML = '<p class="link-aviso">Baixei <b>' + B.esc(arquivo) + '</b>'
        + (recorte ? ', com <b>o time inteiro</b> — não o recorte de '
          + B.esc(recorte) + ' que está na tela' : '') + '.'
        + ' Agora rode <b>./scripts/publicar-dados.sh</b> pra ele entrar no ar —'
        + ' o endereço do documento não muda, quem já tem o link vê o estado novo.</p>';
    }
  } catch (e) {
    mostrarLink('', 'Não deu pra gerar o arquivo agora: ' + e.message);
  }
}

async function copiarLink() {
  if (!st.link) await gravarLink();
  if (!st.link) return;
  // "Link copiado" só quando copiou de verdade: clipboard falha por permissão, e
  // afirmar cópia que não houve manda o PO colar coisa velha no Slack.
  let copiou = true;
  try { await navigator.clipboard.writeText(st.link); } catch (e) { copiou = false; }
  mostrarLink(st.link, copiou ? '' : 'Não consegui copiar sozinho — copie o link abaixo (já está selecionado).');
}

function mostrarLink(url, aviso) {
  const caixa = $('caixa-link');
  caixa.hidden = false;
  if (!url) { // só o aviso: link nem chegou a existir
    caixa.innerHTML = `<p class="link-aviso">${B.esc(aviso || '')}</p>`;
    return;
  }
  const longo = url.length > LIMITE_LINK;
  const cabeca = aviso ? B.esc(aviso) : longo
    ? 'Link copiado, mas está <b>longo (' + url.length.toLocaleString('pt-BR') + ' caracteres)</b> — alguns aplicativos de mensagem cortam. Recorte por responsável pra encurtar.'
    : 'Link copiado. Ele carrega o report inteiro — quem abrir não precisa de token nem de acesso ao DevOps.';
  caixa.innerHTML = `
    <p class="link-aviso">${cabeca}</p>
    <input id="campo-link" type="text" readonly aria-label="Link do report" value="${B.esc(url)}">
    <p class="link-aviso mudo">O conteúdo viaja depois do <b>#</b>, que o navegador não envia ao servidor: nada fica guardado em host nenhum. Quem tiver o link, porém, lê o report — trate como documento confidencial.</p>`;
  const campo = $('campo-link');
  campo.focus();
  campo.select();
}

// Modo leitura: o link traz o dado, então não há nada a buscar nem a filtrar.
/* O PACOTE VIRA DOCUMENTO — e esta função é a ÚNICA porta.

   Existem duas entradas pro mesmo dado: o fragmento do link (#r=) e o arquivo
   publicado. Cada uma com seu próprio saneamento seriam duas definições do que
   é um pacote válido, e a segunda ia ficar para trás na primeira vez que a
   primeira ganhasse um campo. Quem chama decide de ONDE vem; o que vale lá
   dentro se decide aqui, uma vez.

   Tudo que entra é forjável — o fragmento porque qualquer um edita a URL, o
   arquivo porque é texto num site público. O briefing escapa toda interpolação;
   aqui vai a segunda tranca. */
function aplicarPacote(pacote) {
  // id numérico de verdade, e só os campos que o report conhece.
  const sanear = (lista) => (Array.isArray(lista) ? lista : [])
    .filter((it) => it && Number.isFinite(Number(it.id)))
    .map((it) => ({ id: Number(it.id), projeto: it.projeto, fields: it.fields || {} }));
  // Objetivo + rumo também são forjáveis: número vira número (feitos nunca passa
  // do total, senão a barra estoura de 100%), e a descrição é texto que o
  // briefing escapa. Sem isso, um link torto pintaria %/HTML na tela.
  const saneProdutos = (obj) => {
    const out = {};
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const v = obj[k] || {};
        const total = Math.max(0, Math.floor(Number(v.total)) || 0);
        const feitos = Math.min(total, Math.max(0, Math.floor(Number(v.feitos)) || 0));
        out[k] = { descricao: String(v.descricao || ''), feitos, total };
      }
    }
    return out;
  };
  // Decisões também são forjáveis: cada uma vira texto (o briefing escapa).
  const saneMapaTexto = (obj) => {
    const out = {};
    if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) out[k] = String(obj[k] || '');
    return out;
  };
  st.items = sanear(pacote.items);
  st.pais = sanear(pacote.ancestrais);
  st.produtos = saneProdutos(pacote.produtos);
  st.decisoes = saneMapaTexto(pacote.decisoes);
  st.roadmap = saneRoadmapItens(pacote.roadmap);
  st.nomes = saneNomes(pacote.nomes); // forjável como o resto: texto curto, id numérico
  // Formato curto: vem saneado no briefing, que é quem sabe a forma dele.
  st.contagens = pacote.contagens || null;
  st.sprints = saneRitmo(pacote.sprints); // link antigo não traz: vira lista vazia
  st.escopo = pacote.escopo || '';
  st.agora = pacote.em || Date.now();
  st.mes = pacote.mes || null;
}

/* Entra em modo leitura: sem token neste navegador, o documento é o que
   chegou pronto, e nada daqui pra frente fala com o DevOps. */
function entrarEmLeitura() {
  document.body.classList.add('modo-leitura');
  st.leitura = true;
}

async function lerDoLink() {
  const m = (location.hash || '').match(/^#r=(.+)$/);
  if (!m) return false;
  entrarEmLeitura();
  // Colar outro link na mesma aba só troca o fragmento: o navegador não recarrega
  // nada e a página ficaria mostrando o report antigo. Recarrega na mão — mas só
  // se o fragmento novo for outro report, senão qualquer âncora derrubaria a tela.
  const carga = m[1];
  window.addEventListener('hashchange', () => {
    const novo = (location.hash || '').match(/^#r=(.+)$/);
    if (novo && novo[1] !== carga) location.reload();
  });
  try {
    aplicarPacote(JSON.parse(await descomprimir(carga)));
    render(); // daqui pra frente o seletor de mês redesenha do próprio pacote
  } catch (e) {
    $('report').innerHTML = '<p class="erro">Este link não pôde ser lido. Ele pode ter sido cortado ao ser copiado — peça outro a quem enviou.</p>';
  }
  return true;
}

/* O DADO PUBLICADO, num endereço fixo.

   O documento de acompanhamento não pode viver no fragmento: lá o dado anda
   junto com o link, então cada atualização é um link novo pra reenviar. Aqui o
   endereço nunca muda e quem já tem vê o estado da última publicação.

   Só existe pro documento que declara `arquivoDeDados`. O report e o v2 não
   declaram e seguem só com o fragmento.

   Cache-buster no pedido: a página é servida por CDN, e um documento de
   acompanhamento servindo a versão de ontem é exatamente o defeito que ele
   existe pra não ter. */
async function lerDoArquivo() {
  const arquivo = typeof B.arquivoDeDados === 'string' ? B.arquivoDeDados : '';
  if (!arquivo) return false;
  entrarEmLeitura();
  try {
    const resp = await fetch(arquivo + '?t=' + Date.now(), { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    aplicarPacote(await resp.json());
    render();
  } catch (e) {
    /* Nomear o arquivo na mensagem é de propósito: quem abre isto e não vê
       nada precisa saber que falta uma PUBLICAÇÃO, e não que o documento
       quebrou. A frase vale pro leitor e pro PO. */
    $('report').innerHTML = '<p class="mudo">Este documento ainda não foi publicado.'
      + ' Quem mantém o relatório precisa abrir a versão do PO e clicar em <b>Publicar dados</b>.</p>';
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  try { st.config = C.normalizeConfig(loadJSON(LS.config)); } catch (e) { st.config = null; }
  // Quem tem token manda: busca ao vivo e reescreve o link, mesmo se a URL já
  // trouxer um. Sem token, o link é a única fonte — é o caso do stakeholder.
  ligarDocumento();
  // Rotação de tela ou redimensionar a janela pode mudar em quantas linhas a
  // nav quebra — antes do early return de leitura, senão o stakeholder (que é
  // quem mais lê no celular) nunca ganharia essa remedição.
  let temporizadorRedimensiona = null;
  window.addEventListener('resize', () => {
    clearTimeout(temporizadorRedimensiona);
    temporizadorRedimensiona = setTimeout(medirAlturaNav, 150);
  });
  /* Sem token neste navegador, o dado vem pronto — e a ordem importa: o
     fragmento primeiro, porque um link que já circula tem que continuar
     abrindo exatamente o que ele carrega, mesmo depois de o documento ganhar
     endereço fixo. Só quem chega sem fragmento cai no arquivo publicado. */
  if (!(st.config && st.pat) && (await lerDoLink() || await lerDoArquivo())) return;
  // Não bloqueia o primeiro render nem espera o DevOps: o arquivo é local e
  // pequeno, chega rápido, e quando chega o render() de novo é barato.
  carregarRoadmap().then(render);
  // Os nomes podem chegar depois do link já gravado — regrava, senão o
  // stakeholder abre um link com título cru.
  carregarNomes().then(async () => { render(); if (st.items && !st.erro) await gravarLink(); });
  $('atualizar').addEventListener('click', carregar);
  $('sem-nome').addEventListener('click', copiarSemNome);
  $('copiar').addEventListener('click', copiarLink);
  // Só a edição de acompanhamento tem este botão no HTML. Quem não tem não
  // ganha comportamento novo — nem precisa declarar nada.
  if ($('publicar')) $('publicar').addEventListener('click', publicarDados);
  $('resp-global').addEventListener('change', async () => {
    st.resp = $('resp-global').value;
    const f = loadJSON(LS.filtros) || {};
    f.resp = st.resp;
    localStorage.setItem(LS.filtros, JSON.stringify(f)); // mesma preferência da Central
    render();
    await gravarLink(); // recorte novo, link novo
  });
  render();
  carregar();
});
})();
