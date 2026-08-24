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
  $('baixar').disabled = r.vazio;
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

/* ---------- Arquivo autocontido ---------- */
// O stakeholder não tem PAT: o que vai pra ele é o RESULTADO, não a ferramenta.
// Por isso o arquivo gerado leva o HTML já renderizado + o CSS embutido, e
// nenhum JavaScript — abre em qualquer computador, inclusive offline (a fonte
// cai pra do sistema). Nunca vai pro repositório: é download.
async function baixar() {
  const btn = $('baixar');
  const rotulo = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'gerando…';
  try {
    const css = await (await fetch('assets/style.css')).text();
    const corpo = $('report').innerHTML;
    const titulo = 'Report — ' + (document.querySelector('.briefing-topo h3') || {}).textContent;
    const doc = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${B.esc(titulo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body data-pagina="report" class="pagina-report gerado">
<div class="app">
<header class="topo"><h1 class="nome-app">${B.esc(titulo)}</h1></header>
<div class="corpo"><main><section id="secao-report">${corpo}</section></main></div>
</div>
</body>
</html>`;
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report-' + (new Date().toISOString().slice(0, 10)) + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    st.erro = 'Não deu pra gerar o arquivo: ' + e.message;
    render();
  } finally {
    btn.disabled = false;
    btn.textContent = rotulo;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try { st.config = C.normalizeConfig(loadJSON(LS.config)); } catch (e) { st.config = null; }
  $('atualizar').addEventListener('click', carregar);
  $('baixar').addEventListener('click', baixar);
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
