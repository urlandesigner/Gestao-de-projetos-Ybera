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
const LS = { config: 'central.config', pat: 'central.pat', filtros: 'central.filtros', cache: 'central.cache' };
const $ = (id) => document.getElementById(id);

function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

// Mesmos campos da base da Central: o report precisa de conclusão, prazo e pai.
const CAMPOS = [
  'System.Title', 'System.State', 'System.WorkItemType', 'System.Parent',
  'System.AssignedTo', 'Microsoft.VSTS.Scheduling.StartDate', 'Microsoft.VSTS.Scheduling.TargetDate',
  'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate',
];

// A consulta é presa à área do time (areaClause). Épico e Feature costumam
// morar em outra área — ou em outro projeto — e simplesmente não vêm. Sem eles
// a cadeia do produto quebra no primeiro salto e tudo cai em "sem produto".
// workitemsbatch busca POR ID e não olha área: então pedimos os pais que
// faltam, um nível por volta, até a cadeia fechar.
// Estado e prazo entram porque o produto virou cabeçalho de grupo no report —
// ele mostra em que pé o épico está, não só o nome.
const CAMPOS_PAI = ['System.WorkItemType', 'System.Title', 'System.Parent',
  'System.State', 'Microsoft.VSTS.Scheduling.TargetDate'];
const NIVEIS_ACIMA = 4; // PBI → Feature → Épico usa 2; 4 é folga pra hierarquia torta

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
  // Modo leitura: o dado veio do link, não do DevOps. Aí org, times, recorte e
  // a data do report saem do pacote — não há config nem PAT neste navegador.
  leitura: false,
  org: '',
  times: [],
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
  const estado = !st.pat ? 'sem-token' : st.erro ? 'vencido' : st.carregando ? 'atualizando' : 'conectado';
  b.dataset.estado = estado;
  b.textContent = { 'sem-token': 'sem token', vencido: 'erro', atualizando: 'atualizando…', conectado: 'conectado' }[estado];
}

function renderFiltro() {
  const barra = $('filtro-global');
  const sel = $('resp-global');
  const nomes = new Set();
  for (const it of st.items || []) {
    const r = (it.fields || {})['System.AssignedTo'];
    if (r && r.displayName) nomes.add(r.displayName);
  }
  if (respAtivo()) nomes.add(respAtivo());
  if (!nomes.size) { barra.hidden = true; return; }
  barra.hidden = false;
  const lista = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  sel.innerHTML = '<option value="">todos os responsáveis</option>' +
    lista.map((n) => `<option value="${B.esc(n)}"${n === respAtivo() ? ' selected' : ''}>${B.esc(n)}</option>`).join('');
}

// Meses vêm do próprio report (só os que têm entrega, mais o corrente). Um mês
// só não é escolha: o seletor some.
function renderMeses(meses) {
  const barra = $('filtro-mes');
  const sel = $('mes-global');
  const lista = meses || [];
  if (lista.length < 2) { barra.hidden = true; return; }
  barra.hidden = false;
  const atual = lista.indexOf(st.mes) >= 0 ? st.mes : lista[0];
  sel.innerHTML = lista
    .map((m) => `<option value="${m}"${m === atual ? ' selected' : ''}>${B.mesPorExtenso(m)}</option>`)
    .join('');
}

function render() {
  renderBadge();
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
    agora: st.leitura ? st.agora : Date.now(),
    org: st.leitura ? st.org : st.config.org,
    escopo: st.leitura ? st.escopo : respAtivo(),
    times: st.leitura ? st.times : st.config.projects.filter((p) => !p.hidden).map((p) => p.teamName),
    mes: st.mes,
  });
  box.innerHTML = erroHtml + r.html;
  renderMeses(r.meses);
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
  st.pais = [];
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
    st.items = todos;
    st.pais = await buscarPais(todos);
  } catch (e) {
    st.erro = mensagemDeErro(e);
  } finally {
    st.carregando = false;
    render();
    if (st.items) await gravarLink();
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

async function gravarLink() {
  if (st.leitura) return; // o link já É a página: reescrever apagaria o dado
  st.link = '';
  if (!st.items || st.vazio) { history.replaceState(null, '', location.pathname); return; }
  try {
    const mostrados = st.items.filter(noNome);
    const pacote = {
      v: 1,
      em: Date.now(),
      org: st.config.org,
      escopo: respAtivo(),
      times: st.config.projects.filter((p) => !p.hidden).map((p) => p.teamName),
      mes: st.mes, // quem abrir o link cai no mês que eu estava vendo
      items: enxugar(mostrados),
      ancestrais: cadeiaDeProdutos(mostrados, st.items.concat(st.pais)),
    };
    st.link = location.origin + location.pathname + '#r=' + await comprimir(JSON.stringify(pacote));
    history.replaceState(null, '', st.link);
  } catch (e) {
    st.erro = 'Não deu pra montar o link: ' + e.message;
    render();
  }
}

async function copiarLink() {
  if (!st.link) await gravarLink();
  if (!st.link) return;
  try { await navigator.clipboard.writeText(st.link); } catch (e) { /* sem permissão: o campo abaixo resolve */ }
  mostrarLink(st.link);
}

function mostrarLink(url) {
  const caixa = $('caixa-link');
  const longo = url.length > LIMITE_LINK;
  caixa.hidden = false;
  caixa.innerHTML = `
    <p class="link-aviso">${longo
      ? 'Link copiado, mas está <b>longo (' + url.length.toLocaleString('pt-BR') + ' caracteres)</b> — alguns aplicativos de mensagem cortam. Recorte por responsável pra encurtar.'
      : 'Link copiado. Ele carrega o report inteiro — quem abrir não precisa de token nem de acesso ao DevOps.'}</p>
    <input id="campo-link" type="text" readonly value="${B.esc(url)}">
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
  // nada e a página ficaria mostrando o report antigo. Recarrega na mão.
  window.addEventListener('hashchange', () => location.reload());
  try {
    const pacote = JSON.parse(await descomprimir(m[1]));
    st.items = pacote.items || [];
    st.pais = pacote.ancestrais || [];
    st.org = pacote.org || '';
    st.escopo = pacote.escopo || '';
    st.times = pacote.times || [];
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
  $('mes-global').addEventListener('change', async () => {
    st.mes = $('mes-global').value || null;
    render();
    await gravarLink(); // mês novo, link novo
  });
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
