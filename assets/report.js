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
const FERRAMENTAS = /(?:^|[?&])po=1(?:&|$)/.test(location.search);

const st = {
  config: null,
  pat: localStorage.getItem(LS.pat) || '',
  usuario: (loadJSON(LS.cache) || {}).usuario || '',
  resp: (() => { const f = loadJSON(LS.filtros) || {}; return f.resp === undefined ? null : f.resp; })(),
  items: null,
  pais: [],        // pais buscados por id, fora da consulta por área
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
};

function respAtivo() { return st.resp === null ? (st.usuario || '') : st.resp; }
function noNome(it) {
  const alvo = respAtivo();
  if (!alvo) return true;
  const r = ((it || {}).fields || {})['System.AssignedTo'];
  return !!r && r.displayName === alvo;
}
function ctx() { return { base: st.config.org, pat: st.pat, fetchImpl: window.fetch.bind(window) }; }

function mensagemDeErro(e) {
  if (e instanceof A.AuthError) return 'PAT recusado — renove o token na Central.';
  if (e instanceof A.NetworkError) return 'Falha de rede — confira a conexão.';
  return e.message;
}

function renderBadge() {
  const b = $('badge');
  const estado = (!st.pat || !st.config) ? 'sem-token' : st.erro ? 'vencido' : st.carregando ? 'atualizando' : 'conectado';
  b.dataset.estado = estado;
  b.textContent = { 'sem-token': 'sem token', vencido: 'erro', atualizando: 'atualizando…', conectado: 'conectado' }[estado];
}

function renderFiltro() {
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
      box.innerHTML = '<p class="mudo">Nenhuma configuração encontrada. Abra a <a href="index.html">Central</a> e conecte o Azure DevOps primeiro.</p>';
      return;
    }
    if (!st.pat) {
      box.innerHTML = '<p class="mudo">Sem token neste navegador. Abra a <a href="index.html">Central</a> e cole o PAT.</p>';
      return;
    }
  }
  const erroHtml = st.erro ? `<p class="erro">${B.esc(st.erro)}</p>` : '';
  if (!st.items) { box.innerHTML = erroHtml + (st.erro ? '' : '<p class="mudo">carregando…</p>'); return; }
  if (!st.leitura) renderFiltro();
  const r = B.htmlReport({
    items: st.leitura ? st.items : st.items.filter(noNome),
    todos: st.items.concat(st.pais), // o produto mora no pai — de outro dono, ou de outra área
    // No link, o objetivo + rumo vêm prontos (o backlog inteiro não viaja, então
    // recalcular ali subcontaria). Ao vivo (PO), fica undefined e o briefing calcula.
    produtos: st.leitura ? st.produtos : undefined,
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
  aplicarFiltroEntregas(); // acerta o contador e esconde o "limpar"
  st.vazio = r.vazio;
  $('copiar').disabled = r.vazio;
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
  render();
  try {
    if (!st.usuario) {
      try { st.usuario = await A.currentUser(ctx()); } catch (e) { /* filtro só começa em "todos" */ }
    }
    const todos = [];
    for (const p of st.config.projects.filter((x) => !x.hidden)) {
      let areas = [];
      try { areas = await A.teamAreas(ctx(), p.projectName, p.teamName); } catch (e) { /* segue projeto inteiro */ }
      const ids = await A.runWiql(ctx(), p.projectName, p.teamName, C.wiqlProdutos(areas));
      const crus = ids.length ? await A.getFields(ctx(), ids, CAMPOS) : [];
      for (const it of crus) todos.push(Object.assign({ projeto: p.projectName }, it));
    }
    // Itens e pais são UM par: atribuir separado fazia o documento degradar no
    // meio do refresh (grupos desmontando na tela) e, num fetch falho, deixava
    // itens novos com pais de ninguém — e o link era reescrito desse estado.
    st.pais = await buscarPais(todos);
    st.items = todos;
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

/* ---------- Link de leitura ---------- */
// O stakeholder abre um LINK, não um arquivo. E ele não tem PAT — então o dado
// viaja no FRAGMENTO da URL (depois do #), que o navegador jamais envia ao
// servidor: a Vercel entrega só a página estática, e o conteúdo existe apenas
// dentro do link. Nada de dado de negócio parado em host público.
const CAMPOS_LINK = [
  'System.WorkItemType', 'System.State', 'System.Title', 'System.Parent',
  'Microsoft.VSTS.Scheduling.TargetDate', 'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate',
];
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
    for (const c of CAMPOS_LINK) if (f[c] !== undefined) campos[c] = f[c];
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
      for (const c of CAMPOS_CADEIA) if (f[c] !== undefined) campos[c] = f[c];
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

let geracaoLink = 0; // troca rápida de mês: só a gravação mais nova pode escrever

async function gravarLink() {
  if (st.leitura) return; // o link já É a página: reescrever apagaria o dado
  const minha = ++geracaoLink;
  st.link = '';
  if (!st.items || st.vazio) { history.replaceState(null, '', location.pathname + location.search); return; }
  try {
    const mostrados = st.items.filter(noNome);
    const pacote = {
      v: 1,
      em: Date.now(),
      escopo: respAtivo(),
      mes: st.mes, // quem abrir o link cai no mês que eu estava vendo
      items: enxugar(mostrados),
      ancestrais: cadeiaDeProdutos(mostrados, st.items.concat(st.pais)),
      produtos: produtosDoLink(mostrados), // objetivo + rumo, prontos
    };
    const carga = '#r=' + await comprimir(JSON.stringify(pacote));
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
async function lerDoLink() {
  const m = (location.hash || '').match(/^#r=(.+)$/);
  if (!m) return false;
  document.body.classList.add('modo-leitura');
  st.leitura = true;
  // Colar outro link na mesma aba só troca o fragmento: o navegador não recarrega
  // nada e a página ficaria mostrando o report antigo. Recarrega na mão — mas só
  // se o fragmento novo for outro report, senão qualquer âncora derrubaria a tela.
  const carga = m[1];
  window.addEventListener('hashchange', () => {
    const novo = (location.hash || '').match(/^#r=(.+)$/);
    if (novo && novo[1] !== carga) location.reload();
  });
  try {
    const pacote = JSON.parse(await descomprimir(m[1]));
    // O fragmento é dado que QUALQUER UM pode forjar — um link malicioso não pode
    // virar HTML dentro da página. O briefing escapa toda interpolação; aqui vai a
    // segunda tranca: id numérico de verdade, e só os campos que o report conhece.
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
    st.items = sanear(pacote.items);
    st.pais = sanear(pacote.ancestrais);
    st.produtos = saneProdutos(pacote.produtos);
    st.escopo = pacote.escopo || '';
    st.agora = pacote.em || Date.now();
    st.mes = pacote.mes || null;
    render(); // daqui pra frente o seletor de mês redesenha do próprio pacote
  } catch (e) {
    $('report').innerHTML = '<p class="erro">Este link não pôde ser lido. Ele pode ter sido cortado ao ser copiado — peça outro a quem enviou.</p>';
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  try { st.config = C.normalizeConfig(loadJSON(LS.config)); } catch (e) { st.config = null; }
  // Quem tem token manda: busca ao vivo e reescreve o link, mesmo se a URL já
  // trouxer um. Sem token, o link é a única fonte — é o caso do stakeholder.
  ligarDocumento();
  if (!(st.config && st.pat) && await lerDoLink()) return;
  $('atualizar').addEventListener('click', carregar);
  $('copiar').addEventListener('click', copiarLink);
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
