/* O CONTROLADOR dos documentos — autônomo, para stakeholder ver só o report.

   Nasceu para a report.html, que foi excluída do projeto em 13/10/2026. Hoje
   serve o report-v2.html e as duas edições de Entregas.

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
/* Os campos que o documento pede ao DevOps, e quantos níveis de pai ele sobe,
   moram em assets/pacote.js desde 15/10/2026: a função da Vercel busca
   exatamente o mesmo, e duas listas divergiriam. */
const P = window.CentralPacote;

// As ferramentas do PO só existem quando a URL pede: é assim que a Central
// chama esta página com ?po=1. O link que vai pro stakeholder é montado
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
  automaticos: [], // cartões automáticos do pacote (modo leitura)
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
  roadmap: [], // só no modo leitura: o recorte já resolvido que veio no link
  nomes: {},   // nome de negócio por item: assets/report-nomes.json (PO) ou o link (leitura)
  po: '',      // quem assina a capa, do mesmo arquivo — ver `escopo` em pacoteDoDocumento
  resumos: {}, // uma linha por PBI: assets/resumos.json — só o PO lê o arquivo; o
               // leitor recebe a linha já embutida em cada item de sprint
};

/* QUAL RECORTE POR PESSOA ESTÁ VALENDO. Vazio = o time inteiro.

   O documento EDITORIAL não tem recorte, e a resposta vem daqui porque é daqui
   que TODOS os lugares perguntam: o filtro dos itens, o seletor, a capa, o
   pacote do link e o aviso do Publicar. Uma régua só — o defeito de 13/10/2026
   foi a capa e os itens responderem a perguntas diferentes. */
function respAtivo() {
  return st.resp === null ? (st.usuario || '') : st.resp;
}

/* QUEM ASSINA A CAPA ("Product Owner: X").

   No documento editorial, quem escreveu: o campo `po` do report-nomes.json,
   texto editorial que mora com o resto do texto editorial. Nunca o dono do
   token — foi ele que pôs o nome de outra PO em cima das entregas do Urlan.

   Fora dele, o recorte da tela, com os paraquedas de sempre: o `currentUser`
   do DevOps devolve STRING VAZIA sem lançar erro quando não traz o usuário
   autenticado, e capa sem assinatura é pior que nome escrito à mão. */
function assinatura(recorte) {
  return recorte || st.usuario || st.po || '';
}
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
// Vive em assets/conteudo/<po>/roadmap.json, um arquivo por PO, escrito à
// parte — o Notion não pode ser chamado do navegador (sem CORS liberado), e
// este report não guarda token de Notion nenhum. O mesmo saneamento serve os
// dois caminhos que alimentam o roadmap: o arquivo (carregarRoadmap, abaixo) e
// o link (em lerDoLink). Mudou de casa em 02/10/2026: o saneamento vive em
// core.js porque a Central passou a ler o mesmo arquivo. Duplicar a lista
// branca de status era repetir, de olhos abertos, o defeito que o
// tests/roadmap-portao.test.js existe pra impedir.
const saneRoadmapItens = C.saneRoadmapItens;

/* UM ARQUIVO POR PO, buscado SOB DEMANDA — mesma forma dos cartões.

   Até 14/10/2026 era um arquivo só com um bloco por pessoa, e por um dia
   conviveu com os arquivos por PO criados na migração do conteúdo: o app lia
   um, o editor gravaria no outro, e na primeira edição os dois divergiriam
   sem erro nenhum. Agora a fonte é uma só.

   Guardado por chave. Os três estados dizem coisas diferentes e a tela também:
   ausente = ninguém pediu ainda; `undefined` = em voo; `null` = essa PO não
   tem arquivo de roadmap; lista (vazia ou não) = o roadmap dela.
   `Object.create(null)` porque a chave vem de nome de pessoa, e um objeto
   comum herda `constructor` e `__proto__` — "proto" passaria por roadmap. */
const roadmaps = Object.create(null);

async function carregarRoadmap(chave) {
  if (!chave || chave in roadmaps) return;
  roadmaps[chave] = undefined; // em voo: não buscar duas vezes no mesmo render
  let itens = null;
  try {
    const resp = await fetch(C.caminhoDoConteudo(chave, 'roadmap.json') + '?t=' + Date.now(), { cache: 'no-store' });
    // 404 é "essa PO ainda não tem roadmap" — estado normal, não erro.
    if (resp.ok) itens = saneRoadmapItens((await resp.json() || {}).itens);
  } catch (e) {
    /* Degradação de propósito: sem roadmap o documento continua de pé. Mas o PO
       precisa saber que a seção sumiu antes de publicar — some sem deixar
       buraco, e quem lê o link não tem como suspeitar que faltou algo. */
    console.warn('[Report] o roadmap de ' + chave + ' não carregou: a seção de projetos não vai'
      + ' aparecer. Motivo: ' + e.message);
  }
  roadmaps[chave] = itens;
  render();
}

/* OS CARTÕES DA EDIÇÃO, por PO.

   Um arquivo por pessoa em assets/conteudo/<po>/edicoes/<edicao>.json. O
   documento declara QUAL edição ele é (`B.edicao`); quem é a pessoa sai do
   mesmo lugar que a assinatura da capa e o roadmap.

   Guardado por chave e não numa variável só: trocar de PO no seletor troca de
   arquivo, e o anterior continua valendo se ela voltar — sem buscar de novo.
   `null` enquanto está em voo distingue "ainda não chegou" de "chegou vazia",
   que é a diferença entre um documento que vai encher e um que está vazio
   mesmo. */
const edicoes = Object.create(null);

async function carregarEdicao(chave) {
  if (!chave || !B.edicao) return;
  if (chave in edicoes) return;
  edicoes[chave] = null; // em voo: não buscar duas vezes no mesmo render
  try {
    const url = C.caminhoDoConteudo(chave, 'edicoes/' + encodeURIComponent(B.edicao) + '.json');
    const resp = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
    /* 404 é "esta PO ainda não escreveu esta edição", que é o estado normal de
       quem acabou de entrar — não é erro e não vai pro console. */
    edicoes[chave] = resp.ok ? C.saneEdicao(await resp.json()).cartoes : [];
  } catch (e) {
    edicoes[chave] = [];
    console.warn('[Report] não deu pra ler a edição de ' + chave + ': o documento abre sem cartões.'
      + ' Motivo: ' + e.message);
  }
  render();
}

/* Os cartões de quem está selecionado. Dispara a busca na primeira vez que
   alguém pergunta — o render é quem sabe de quem é o documento, e orquestrar
   isso antes exigiria saber a identidade antes de ela chegar. */
function cartoesDaVez() {
  const chave = C.chaveDePessoa(st.leitura ? st.escopo : assinatura(respAtivo()));
  if (!chave) return [];
  if (chave in edicoes) return edicoes[chave] || [];
  carregarEdicao(chave);
  return [];
}

/* DE QUEM É O ROADMAP DESTE DOCUMENTO.

   No modo leitura não há recorte a fazer: o link carrega o roadmap já
   resolvido por quem o gerou, e o leitor não tem (nem precisa ter) nome.

   NO DOCUMENTO EDITORIAL, QUEM DECIDE É QUEM ASSINA — e não o dono do token.
   Esta linha nasceu errada em 13/10/2026, usando `st.usuario`, e caiu na
   mesma armadilha que a `assinatura()` logo acima já tinha caído e corrigido:
   num documento cujos cartões foram escritos à mão por uma pessoa, a
   identidade de quem abre o navegador não diz nada. Deu nos dois defeitos
   esperados — o Urlan abriu o próprio relatório num navegador sem token e o
   roadmap tinha sumido; e se a Isadora abrisse a edição dele com o token dela,
   veria o roadmap DELA embaixo dos cartões DELE.

   Fora do editorial vale o dono do token, com o mesmo paraquedas da
   assinatura: o `currentUser` do DevOps devolve string vazia sem lançar erro.

   Em qualquer caminho, não achar a pessoa devolve lista vazia e a seção some —
   nunca o roadmap de outra pessoa, que é pior que roadmap nenhum porque
   ninguém tem como desconfiar. */
function roadmapDaVez() {
  if (st.leitura) return st.roadmap;
  const chave = C.chaveDePessoa(assinatura(respAtivo()));
  if (!chave) return [];
  if (!(chave in roadmaps)) { carregarRoadmap(chave); return []; }
  return roadmaps[chave] || [];
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
    st.po = String(dado.po || '').trim().slice(0, 80);
  } catch (e) {
    console.warn('[Report] report-nomes.json não carregou: os títulos saem como estão no DevOps,'
      + ' não com os nomes de negócio. Motivo: ' + e.message);
  }
}

/* ---------- Resumo de PBI: a segunda camada editorial ---------- */
/* assets/resumos.json: id do item → { resumo, de }. Existe porque o cartão de
   sprint mostra o TÍTULO da PBI, e título de PBI é escrito pra quem trabalha
   nela — "[DESIGN] Viabilização Design System para loja Ybera.us" não diz nada
   a quem lê de fora.

   Separado do report-nomes.json de propósito, apesar da forma parecida: aquele
   RENOMEIA épico e Feature (o nome substitui o título), este ACRESCENTA uma
   linha abaixo do título da PBI. Juntá-los faria um arquivo com duas regras de
   uso e dois donos — e o nomes.json é lido pelos quatro documentos, enquanto
   este só serve ao Entregas v2.

   `de` é a impressão digital da descrição que gerou a linha. Não é lido aqui —
   quem o usa é quem gera —, mas passa pelo saneamento pra não virar depósito
   de texto arbitrário num arquivo que o navegador lê. */
async function carregarResumos() {
  try {
    const resp = await fetch('assets/resumos.json', { cache: 'no-store' });
    if (!resp.ok) return; // sem arquivo: cartão só com o título, sem erro
    const dado = await resp.json();
    st.resumos = C.saneResumos(dado.itens);
  } catch (e) {
    console.warn('[Report] resumos.json não carregou: os cartões de sprint ficam só com o'
      + ' título da PBI. Motivo: ' + e.message);
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
  /* O seletor VOLTOU ao documento editorial em 14/10/2026, por decisão do
     Urlan: o PO escolhido tem que ver o que é dele — na Central, no roadmap e
     no relatório. Ele tinha sido escondido na véspera porque escolher outra PO
     trocava só o nome da capa e deixava embaixo os cartões de quem escreveu.
     Agora os cartões seguem a escolha também, e o seletor volta a dizer a
     verdade sobre o que está na tela. */
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
    roadmap: roadmapDaVez(),
    contagens: st.contagens, // só no formato curto; ao vivo fica null e o documento conta
    nomes: st.nomes, // idem: do arquivo (PO) ou do link (leitura), já saneado
    agora: st.leitura ? st.agora : Date.now(),
    escopo: st.leitura ? st.escopo : assinatura(respAtivo()),
    /* A CHAVE DE QUEM ESTÁ SELECIONADO. O briefing guarda os cartões por PO e
       escolhe por ela. Normalizada aqui, pelo core, e não lá: a regra de casar
       nome ("Urlan Maciel Dipré" → urlan) é a mesma do roadmap, e duas cópias
       dela divergem na primeira vez que alguém mudar o nome no DevOps. */
    chavePO: C.chaveDePessoa(st.leitura ? st.escopo : assinatura(respAtivo())),
    cartoes: cartoesDaVez(),
    automaticos: st.leitura ? st.automaticos : automaticosAgora(itensDoDoc),
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

async function carregar() {
  if (!st.config || !st.pat || st.carregando) return;
  st.carregando = true;
  st.erro = null;
  st.areaIncerta = false; // cada carga responde por si: aviso velho mentiria
  render();
  try {
    /* QUEM É O DONO DO TOKEN — e a resposta fica guardada.

       Não é só o padrão do filtro: é a ASSINATURA da capa ("Product Owner: X"),
       e um documento que perde a assinatura porque uma chamada falhou é pior
       que um filtro que começa em "todos".

       E falha: em 08/10/2026 a mesma página devolveu o nome às 14h50 e nada às
       17h16, com o erro engolido aqui dentro. Gravado uma vez, ele sobrevive à
       falha seguinte — o nome do dono do token não muda entre duas cargas. */
    if (!st.usuario) {
      try {
        st.usuario = await A.currentUser(ctx());
        /* Gravado NO CACHE DA CENTRAL, que é de onde o st.usuario foi lido lá em
           cima — e não numa chave própria. Duas fontes pro mesmo nome é como
           elas passam a discordar. */
        if (st.usuario) {
          const c = loadJSON(LS.cache) || {};
          c.usuario = st.usuario;
          try { localStorage.setItem(LS.cache, JSON.stringify(c)); } catch (e2) { /* cheio: segue sem gravar */ }
        }
      } catch (e) {
        console.warn('[Report] não deu pra perguntar quem é o dono do token ao DevOps;'
          + ' seguindo com o nome guardado. Motivo: ' + e.message);
      }
    }
    /* A busca mora em assets/pacote.js — a função da Vercel faz exatamente a
       mesma. Itens e pais chegam como UM par e são atribuídos juntos. Área que
       falhou vira aviso visível só pro PO: sem ela o documento conta o
       projeto inteiro e o total sai maior que a realidade. */
    const tudo = await P.buscarTudo({ A, ctx: ctx(), mensagem: mensagemDeErro,
      projetos: st.config.projects.filter((x) => !x.hidden),
      comRitmo: B.precisaDeSprints === true,
      periodo: typeof B.periodoDoDocumento === 'function' ? B.periodoDoDocumento() : [],
      agora: Date.now() });
    if (tudo.areaIncerta) st.areaIncerta = true;
    st.pais = tudo.pais;
    st.items = tudo.itens;
    st.sprintsBrutas = tudo.sprintsBrutas;
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
/* A busca, a linha pronta, as pendências de resumo e o saneador moram em
   assets/pacote.js desde 15/10/2026 — a função da Vercel usa os mesmos. Aqui
   ficam só os atalhos que leem o estado desta página.

   O instante é o MESMO que o documento usa pra tudo — o de hoje pro PO, o da
   geração pra quem abre o link. */
function ritmoAgora(itensNoEscopo) {
  return P.ritmoDe({ sprintsBrutas: st.sprintsBrutas, itens: itensNoEscopo,
    agora: st.leitura ? st.agora : Date.now(), resumos: st.resumos });
}

const saneRitmo = (lista) => P.saneRitmo(lista);

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
/* `paraArquivo` diz se esta saída é a PUBLICAÇÃO (o arquivo do endereço fixo)
   ou o LINK. Separa uma coisa só: os blocos de material de trabalho do PO, que
   vão no arquivo e nunca no link.

   O RECORTE É O MESMO NAS DUAS. Decisão do Urlan em 14/10/2026: o relatório é
   do PO, e mostra o que está atribuído a ele. Até aqui a publicação zerava o
   filtro e mandava o time inteiro — o que fazia a tela dele e o documento do
   stakeholder mostrarem coisas diferentes, e ele revisava um documento que não
   era o que saía.

   O custo é conhecido e foi aceito com o número na frente: a sprint publicada
   deixa de ser a do squad e passa a ser a fatia do PO. */
/* Os cartões automáticos, ao vivo — a mesma conta que vai no pacote. */
function automaticosAgora(lista) {
  return P.automaticos({ B, itens: lista, todos: st.items.concat(st.pais), resumos: st.resumos });
}

function pacoteDoDocumento(paraArquivo) {
  const recorte = respAtivo();
  const mostrados = st.items.filter((it) => doResponsavel(it, recorte));
  /* O `escopo` do pacote é a ASSINATURA da capa ("Product Owner: X"), não o
     recorte — nada do lado do leitor filtra por ele, porque os itens já chegam
     filtrados. Quem assina, e os paraquedas de quando o DevOps não diz o nome,
     vivem em `assinatura()` — e a TELA usa a mesma função. */
  const escopo = assinatura(recorte);
  /* Dois formatos de pacote, e o documento escolhe.

     O Entregas extrai do board números e linhas prontas (`contagensDoLink`):
     a montagem mora em assets/pacote.js, porque a função da Vercel monta o
     MESMO pacote pra quem não tem token. O report e o v2 LISTAM itens, e
     seguem montados aqui. */
  if (typeof B.contagensDoLink === 'function') {
    return P.montarEntregas({
      B,
      mostrados,
      todos: st.items.concat(st.pais),
      todosItens: st.items,
      sprintsBrutas: st.sprintsBrutas,
      resumos: st.resumos,
      roadmap: roadmapDaVez(),
      escopo,
      mes: st.mes,
      agora: Date.now(),
      paraArquivo,
    });
  }
  return {
    v: 1,
    em: Date.now(),
    escopo,
    mes: st.mes, // quem abrir o link cai no mês que eu estava vendo
    /* O recorte de quem GERA o link viaja resolvido: quem abre não tem nome
       nem arquivo pra consultar. */
    roadmap: roadmapDaVez(),
    items: enxugar(mostrados),
    ancestrais: cadeiaDeProdutos(mostrados, st.items.concat(st.pais)),
    produtos: produtosDoLink(mostrados), // objetivo + rumo, prontos
    decisoes: decisoesDoLink(mostrados), // pedido de decisão por item travado
    nomes: nomesDoLink(mostrados), // nome de negócio só do que o leitor vê
  };
}

/* A EDIÇÃO VIAJA NO LINK, quando o documento tem mais de uma.

   O link limpo descarta o `?po=1` de propósito — o leitor não é PO —, e com
   ele ia junto o `?edicao=`. Num relatório de várias edições isso abria o
   retrato de agosto debaixo do título de outubro: o pacote é de uma edição, e
   quem decide qual o documento desenha é o endereço. Só o `edicao` volta; o
   resto da busca continua fora. */
function edicaoNoLink() {
  return (Array.isArray(B.EDICOES) && B.edicao) ? '?edicao=' + encodeURIComponent(B.edicao) : '';
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
    st.link = location.origin + location.pathname + edicaoNoLink() + carga;
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
  // No arquivo de QUEM está na tela: o pacote leva a fatia dele, e gravar isso
  // no arquivo de outra pessoa apagaria o documento dela.
  const arquivo = arquivoDoPO(C.chaveDePessoa(respAtivo())).split('/').pop();
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
      /* A tela diz DE QUEM é o arquivo que saiu. O pacote agora leva o recorte
         da tela, então o nome do arquivo muda conforme quem está selecionado —
         e publicar no arquivo errado é apagar o documento de outra pessoa. */
      const recorte = respAtivo();
      caixa.innerHTML = '<p class="link-aviso">Baixei <b>' + B.esc(arquivo) + '</b>'
        + (recorte ? ', com o que está atribuído a <b>' + B.esc(recorte) + '</b>'
          : ', com <b>o time inteiro</b>') + '.'
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
  st.automaticos = C.saneAutomaticos(pacote.automaticos); // idem: pacote antigo, nenhum
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
/* QUATRO MOTIVOS, QUATRO FRASES — e isto é correção de um defeito real.

   Até 13/10/2026 havia um `catch` só, e ele dizia "ainda não foi publicado"
   para qualquer coisa: arquivo ausente, leitura bloqueada e erro de desenho. O
   Urlan abriu o relatório, recebeu essa frase, e o arquivo estava publicado e
   válido — medido, 200 e 17KB. A frase mandava o PO clicar num botão que não
   consertaria nada, e o erro de verdade era engolido sem nem ir pro console.

   Causa diferente, conserto diferente: publicar resolve um dos quatro casos. E
   o erro real vai SEMPRE pro console, porque sem ele a próxima investigação
   começa do zero. */
/* A SAÍDA, quando a edição pedida não tem dados.

   Esta mensagem substitui o documento inteiro — e com ele vai o seletor de
   edição. Num relatório de várias edições isso virou beco sem saída em
   14/10/2026: quem lia outubro sem token trocava pra agosto, que ainda não
   tinha sido publicado, e não tinha mais como voltar. Então, se a edição
   aberta não é a mais recente, a mensagem leva até ela — com o resto do
   endereço (o `?de=` diz de quem é o relatório e tem que ficar). */
/* Desde que a edição padrão passou a ser "a mais recente com conteúdo", a
   saída é o endereço SEM `?edicao=` — que abre essa — e só aparece quando o
   endereço pediu uma edição. Sem `?edicao=` já se está na padrão, e um link
   para ela mesma seria voltar ao mesmo lugar. */
function saidaDaEdicao() {
  if (typeof B.edicaoPedidaNaUrl !== 'function' || !B.edicaoPedidaNaUrl(location.search)) return '';
  const params = new URLSearchParams(location.search);
  params.delete('edicao');
  const q = params.toString();
  return '<p><a href="' + B.esc(location.pathname + (q ? '?' + q : '')) + '">Ver a edição mais recente →</a></p>';
}

function falhaDeLeitura(motivo, arquivo, detalhe) {
  const FRASES = {
    ausente: 'Este documento ainda não foi publicado.'
      + ' Quem mantém o relatório precisa abrir a versão do PO e clicar em <b>Publicar dados</b>.',
    disco: 'Este arquivo foi aberto direto do disco, e aí o navegador bloqueia a leitura dos'
      + ' dados — é regra dele, não falta de publicação. Abra pelo endereço publicado do'
      + ' relatório, ou por um servidor local.',
    rede: 'Não deu pra ler os dados deste relatório agora. Pode ser a conexão;'
      + ' se insistir, o arquivo pode ter saído do ar.',
    desenho: 'Os dados chegaram, mas o documento não desenhou. Isto é defeito nosso,'
      + ' não falta de publicação — o motivo está no console.',
  };
  $('report').innerHTML = '<p class="mudo">' + (FRASES[motivo] || FRASES.rede) + '</p>' + saidaDaEdicao();
  console.warn('[Report] ' + motivo + ' ao ler ' + arquivo + ': ' + detalhe);
}

/* O ARQUIVO DE DADOS DE CADA PO.

   Com o recorte por pessoa, o arquivo passou a conter a fatia de quem publicou
   — e havia UM arquivo por edição. A Isadora clicando Publicar sobrescreveria
   o documento do stakeholder do Urlan com os itens dela, em silêncio, num
   endereço público. Cada PO tem o seu.

   O dono histórico fica no nome original: `assets/dados-outubro.json` é do
   Urlan, e é o arquivo que o documento já publicado serve. Trocar o nome dele
   deixaria o endereço de hoje em 404 até alguém republicar.

   Quem LÊ não tem token nem seletor, então quem diz de quem é o relatório é o
   endereço: `?de=isadora`. Sem o parâmetro, é o do dono histórico — todo link
   que já circula continua abrindo o que sempre abriu. */
const DONO_HISTORICO = 'urlan';

function chaveDoEndereco() {
  const m = /(?:^|[?&])de=([a-z]+)(?:&|$)/.exec(location.search);
  return m ? m[1] : '';
}

function arquivoDoPO(chave, deOutraEdicao) {
  const base = typeof deOutraEdicao === 'string' ? deOutraEdicao
    : (typeof B.arquivoDeDados === 'string' ? B.arquivoDeDados : '');
  if (!base || !chave || chave === DONO_HISTORICO) return base;
  return base.replace(/\.json$/, '-' + chave + '.json');
}

async function lerDoArquivo() {
  const arquivo = arquivoDoPO(chaveDoEndereco());
  if (!arquivo) return false;
  entrarEmLeitura();
  let pacote;
  try {
    const resp = await fetch(arquivo + '?t=' + Date.now(), { cache: 'no-store' });
    /* Resposta HTTP existe: 404 é "não publicado" de verdade, e é o único caso
       em que pedir uma publicação é o conselho certo. */
    if (!resp.ok) { falhaDeLeitura('ausente', arquivo, 'HTTP ' + resp.status); return true; }
    pacote = await resp.json();
  } catch (e) {
    /* Não houve resposta HTTP nenhuma, ou ela não era JSON. O caso mais comum é
       o arquivo aberto DO DISCO: em `file://` a leitura relativa é bloqueada
       pelo navegador, e o sintoma fica idêntico ao de um documento que ninguém
       publicou. Reproduzido: TypeError "Failed to fetch". */
    falhaDeLeitura(location.protocol === 'file:' ? 'disco' : 'rede', arquivo, e.message);
    return true;
  }
  try {
    aplicarPacote(pacote);
    render();
  } catch (e) {
    falhaDeLeitura('desenho', arquivo, e.message);
  }
  return true;
}

/* QUAL EDIÇÃO ABRE quando o endereço não diz (14/10/2026, opção "b" do Urlan).

   A lista de edições se monta pela data, então em 1º de novembro novembro já
   existe — e abrir o link do relatório num mês sem nada escrito passa a
   impressão de documento quebrado, justamente para quem é de fora. A regra: abre
   a edição mais recente QUE JÁ TEM CONTEÚDO; o mês novo fica no seletor e vira o
   padrão sozinho quando ganhar conteúdo.

   "Ter conteúdo" depende de quem abre:
   - quem lê sem token só enxerga o que foi PUBLICADO — o arquivo de dados da
     edição (o do PO do endereço, `?de=`). Se o critério fosse o arquivo de
     cartões, o leitor cairia em novembro com os cartões escritos e os dados
     ainda não publicados: "ainda não foi publicado", sem saída;
   - o PO, com token, vê ao vivo: conta o arquivo de cartões DELE.

   Uma pergunta HEAD por edição, da mais nova para a mais antiga, até a
   primeira que existe. Nenhuma tem? Fica a mais recente — é o caso de quem
   ainda não escreveu nada, e lá o documento já diz que está sendo escrito.

   Endereço com `?edicao=` ou com `#r=` (link que carrega o próprio retrato)
   não é decidido aqui: quem mandou o link já disse o que é. */
/* O RELATÓRIO AO VIVO (15/10/2026). Quem lê sem token pede o pacote à função
   da Vercel, que busca no DevOps com um token guardado lá e devolve o MESMO
   pacote que o "Publicar dados" gravaria (assets/pacote.js nas duas pontas).
   Ninguém precisa mais publicar pra o leitor ver o mês atualizado.

   Endereço absoluto: o site oficial (Pages da Nivello) não roda função, e
   chama a da Vercel por CORS — que a função libera só pros sites do relatório.

   REDE DE SEGURANÇA: função fora do ar, token vencido ou resposta lenta (mais
   de 10 s) devolvem null, e o relatório cai no arquivo publicado, como era
   antes. Nunca tela branca por causa da função.

   Um pedido por edição por carga de página: a escolha da edição padrão e a
   leitura usam o mesmo pacote, guardado aqui. */
const FUNCAO_AO_VIVO = 'https://gestao-de-projetos-ybera.vercel.app/api/relatorio';
const pacotesAoVivo = Object.create(null);

function edicaoAoVivo(id) {
  const e = Array.isArray(B.EDICOES) ? B.EDICOES.find((x) => x.id === id) : null;
  return !!(e && e.aoVivo);
}

async function pedirAoVivo(id) {
  if (!edicaoAoVivo(id)) return null;
  if (id in pacotesAoVivo) return pacotesAoVivo[id];
  const de = chaveDoEndereco() || DONO_HISTORICO;
  const params = new URLSearchParams({ edicao: id, de });
  const corte = typeof AbortController === 'function' ? new AbortController() : null;
  const relogio = corte ? setTimeout(() => corte.abort(), 10000) : null;
  let pacote = null;
  try {
    const resp = await fetch(FUNCAO_AO_VIVO + '?' + params.toString(), corte ? { signal: corte.signal } : {});
    if (resp.ok) pacote = await resp.json();
    else console.warn('[Report] a leitura ao vivo respondeu ' + resp.status + ' — o relatório usa o arquivo publicado.');
  } catch (e) {
    console.warn('[Report] a leitura ao vivo falhou — o relatório usa o arquivo publicado. Motivo: ' + e.message);
  } finally {
    if (relogio) clearTimeout(relogio);
  }
  pacotesAoVivo[id] = pacote && typeof pacote === 'object' ? pacote : null;
  return pacotesAoVivo[id];
}

/* Edição "com conteúdo", pro leitor: entrega no mês (cartão automático) ou
   cartão escrito pela PO. Sprint andando sem nada entregue ainda não conta —
   abrir o link num mês sem entrega nenhuma é o "documento vazio" que a regra
   da edição padrão existe pra evitar. */
async function temConteudoAoVivo(id, chave) {
  const pacote = await pedirAoVivo(id);
  if (!pacote) return null; // a função não respondeu: quem decide é o arquivo
  if (Array.isArray(pacote.automaticos) && pacote.automaticos.length) return true;
  return existe(C.caminhoDoConteudo(chave || DONO_HISTORICO, 'edicoes/' + encodeURIComponent(id) + '.json'));
}

async function lerAoVivo() {
  if (!edicaoAoVivo(B.edicao)) return false;
  const pacote = await pedirAoVivo(B.edicao);
  if (!pacote) return false;
  entrarEmLeitura();
  try {
    aplicarPacote(pacote);
    render();
  } catch (e) {
    falhaDeLeitura('desenho', FUNCAO_AO_VIVO, e.message);
  }
  return true;
}

async function existe(url) {
  try {
    const resp = await fetch(url + '?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function resolverEdicaoPadrao() {
  if (typeof B.escolherEdicao !== 'function' || !Array.isArray(B.EDICOES)) return;
  if (B.edicaoPedidaNaUrl(location.search) || /^#r=/.test(location.hash || '')) return;
  const comToken = !!(st.config && st.pat);
  const chave = comToken
    ? (C.chaveDePessoa(assinatura(respAtivo())) || DONO_HISTORICO)
    : chaveDoEndereco();
  for (const e of B.EDICOES) {
    /* Leitor, edição ao vivo: pergunta à função. Se ela não respondeu (null),
       vale o critério antigo — o arquivo publicado existe? */
    if (!comToken && e.aoVivo) {
      const vivo = await temConteudoAoVivo(e.id, chave);
      if (vivo === true) { B.escolherEdicao(e.id); return; }
      if (vivo === false) continue;
    }
    const url = comToken
      ? C.caminhoDoConteudo(chave, 'edicoes/' + encodeURIComponent(e.id) + '.json')
      : arquivoDoPO(chave, e.arquivoDeDados);
    if (url && await existe(url)) { B.escolherEdicao(e.id); return; }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try { st.config = C.normalizeConfig(loadJSON(LS.config)); } catch (e) { st.config = null; }
  // Antes de qualquer desenho ou busca: período, sprints e arquivo dependem dela.
  await resolverEdicaoPadrao();
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
  if (!(st.config && st.pat) && (await lerDoLink() || await lerAoVivo() || await lerDoArquivo())) return;
  // Não bloqueia o primeiro render nem espera o DevOps: o arquivo é local e
  // pequeno, chega rápido, e quando chega o render() de novo é barato.
  // O roadmap não é buscado aqui: ele é por PO, e quem pede é o render, que é
  // quem sabe de quem é o documento (ver roadmapDaVez).
  // Os nomes podem chegar depois do link já gravado — regrava, senão o
  // stakeholder abre um link com título cru.
  carregarNomes().then(async () => { render(); if (st.items && !st.erro) await gravarLink(); });
  /* Os resumos só valem pro documento que declara arquivo de dados — hoje, o
     Entregas v2. Os outros três não têm cartão de sprint, e pedir o arquivo
     neles seria um 404 no console a cada abertura, dizendo que falta algo que
     não faz falta. Regrava o link pelo mesmo motivo dos nomes. */
  if (B.precisaDeSprints === true) {
    carregarResumos().then(async () => { render(); if (st.items && !st.erro) await gravarLink(); });
  }
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
