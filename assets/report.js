/* Página report.html — autônoma, para stakeholder ver só o report.
   Lê a mesma configuração e o mesmo PAT do localStorage da Central (mesma
   origem), busca os itens e renderiza via CentralBriefing. O botão "Baixar
   report" gera um HTML AUTOCONTIDO (CSS embutido, dado embutido, zero
   JavaScript) — é esse arquivo que vai pro stakeholder, que não tem token. */
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

const st = {
  config: null,
  pat: localStorage.getItem(LS.pat) || '',
  usuario: (loadJSON(LS.cache) || {}).usuario || '',
  resp: (() => { const f = loadJSON(LS.filtros) || {}; return f.resp === undefined ? null : f.resp; })(),
  items: null,
  erro: null,
  carregando: false,
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

function render() {
  renderBadge();
  const box = $('report');
  if (!st.config) {
    box.innerHTML = '<p class="mudo">Nenhuma configuração encontrada. Abra a <a href="index.html">Central</a> e conecte o Azure DevOps primeiro.</p>';
    return;
  }
  if (!st.pat) {
    box.innerHTML = '<p class="mudo">Sem token neste navegador. Abra a <a href="index.html">Central</a> e cole o PAT.</p>';
    return;
  }
  const erroHtml = st.erro ? `<p class="erro">${B.esc(st.erro)}</p>` : '';
  if (!st.items) { box.innerHTML = erroHtml + (st.erro ? '' : '<p class="mudo">carregando…</p>'); return; }
  renderFiltro();
  const r = B.htmlReport({
    items: st.items.filter(noNome),
    agora: Date.now(),
    org: st.config.org,
    escopo: respAtivo(),
    times: st.config.projects.filter((p) => !p.hidden).map((p) => p.teamName),
  });
  box.innerHTML = erroHtml + r.html;
  $('link').disabled = r.vazio;
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
    st.items = todos;
  } catch (e) {
    st.erro = mensagemDeErro(e);
  } finally {
    st.carregando = false;
    render();
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

async function comprimir(txt) {
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(txt));
  w.close();
  return b64url(await new Response(cs.readable).arrayBuffer());
}

async function descomprimir(txt) {
  const ds = new DecompressionStream('gzip');
  const w = ds.writable.getWriter();
  w.write(deB64url(txt));
  w.close();
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

async function gerarLink() {
  const btn = $('link');
  const rotulo = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'gerando…';
  try {
    const pacote = {
      v: 1,
      em: Date.now(),
      org: st.config.org,
      escopo: respAtivo(),
      times: st.config.projects.filter((p) => !p.hidden).map((p) => p.teamName),
      items: enxugar(st.items.filter(noNome)),
    };
    const url = location.origin + location.pathname + '#r=' + await comprimir(JSON.stringify(pacote));
    mostrarLink(url);
    try { await navigator.clipboard.writeText(url); } catch (e) { /* sem permissão: o campo abaixo resolve */ }
  } catch (e) {
    st.erro = 'Não deu pra gerar o link: ' + e.message;
    render();
  } finally {
    btn.disabled = false;
    btn.textContent = rotulo;
  }
}

function mostrarLink(url) {
  const caixa = $('caixa-link');
  const longo = url.length > LIMITE_LINK;
  caixa.hidden = false;
  caixa.innerHTML = `
    <p class="link-aviso">${longo
      ? 'Link gerado, mas está <b>longo (' + url.length.toLocaleString('pt-BR') + ' caracteres)</b> — alguns aplicativos de mensagem cortam. Recorte por responsável pra encurtar.'
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
  try {
    const pacote = JSON.parse(await descomprimir(m[1]));
    const r = B.htmlReport({
      items: pacote.items || [],
      agora: pacote.em || Date.now(),
      org: pacote.org || '',
      escopo: pacote.escopo || '',
      times: pacote.times || [],
    });
    $('report').innerHTML = r.html;
  } catch (e) {
    $('report').innerHTML = '<p class="erro">Este link não pôde ser lido. Ele pode ter sido cortado ao ser copiado — peça outro a quem enviou.</p>';
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  try { st.config = C.normalizeConfig(loadJSON(LS.config)); } catch (e) { st.config = null; }
  if (await lerDoLink()) return; // link com dado: não busca nada, não precisa de token
  $('atualizar').addEventListener('click', carregar);
  $('link').addEventListener('click', gerarLink);
  $('resp-global').addEventListener('change', () => {
    st.resp = $('resp-global').value;
    const f = loadJSON(LS.filtros) || {};
    f.resp = st.resp;
    localStorage.setItem(LS.filtros, JSON.stringify(f)); // mesma preferência da Central
    render();
  });
  render();
  carregar();
});
})();
