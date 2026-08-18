/* Central de Projetos — DOM, localStorage e orquestração. */
(function () {
'use strict';
const C = window.CentralCore;
const A = window.CentralApi;
const LS = { config: 'central.config', pat: 'central.pat', cache: 'central.cache' };
const $ = (id) => document.getElementById(id);

function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const state = {
  config: null,
  pat: localStorage.getItem(LS.pat) || '',
  cache: loadJSON(LS.cache) || { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0 },
  discovery: null,
  auth: null, // null | 'sem-token' | 'vencido' | 'atualizando' | 'conectado'
};

function ctx() { return { base: state.config.org, pat: state.pat, fetchImpl: window.fetch.bind(window) }; }
function cardKey(p) { return p.projectName + '::' + p.teamName; }

function mensagemDeErro(e) {
  if (e instanceof A.AuthError) return 'PAT recusado — confira o token e os escopos (Work Items Read, Project and Team Read).';
  if (e instanceof A.NetworkError) {
    if (location.protocol === 'file:') return 'O navegador bloqueou a chamada (CORS via file://). Sirva a pasta: python3 -m http.server e abra http://localhost:8000';
    return 'Falha de rede — confira a conexão e a URL da organização.';
  }
  return e.message;
}

/* ---------- Onboarding ---------- */
async function wizardDiscover() {
  const err = $('wizard-erro');
  err.hidden = true;
  let base;
  try { base = C.orgBaseUrl($('wizard-org').value); }
  catch (e) { err.textContent = e.message; err.hidden = false; return; }
  const pat = $('wizard-pat').value.trim();
  if (!pat) { err.textContent = 'Cole um PAT.'; err.hidden = false; return; }
  $('wizard-descobrindo').hidden = false;
  try {
    const tempCtx = { base, pat, fetchImpl: window.fetch.bind(window) };
    const projects = await A.listProjects(tempCtx);
    const list = [];
    for (const p of projects) list.push({ project: p, teams: await A.listTeams(tempCtx, p.id) });
    state.discovery = { base, pat, list };
    renderDiscovery(list);
    $('wizard-passo-1').hidden = true;
    $('wizard-passo-2').hidden = false;
  } catch (e) {
    err.textContent = mensagemDeErro(e);
    err.hidden = false;
  } finally {
    $('wizard-descobrindo').hidden = true;
  }
}

function renderDiscovery(list) {
  const box = $('wizard-lista');
  box.innerHTML = '';
  for (const { project, teams } of list) {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = project.name;
    group.appendChild(legend);
    for (const team of teams) {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.projectId = project.id;
      cb.dataset.projectName = project.name;
      cb.dataset.teamId = team.id;
      cb.dataset.teamName = team.name;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + team.name));
      group.appendChild(label);
    }
    box.appendChild(group);
  }
}

function wizardConclude() {
  const checked = [...$('wizard-lista').querySelectorAll('input:checked')];
  const err = $('wizard-erro-2');
  if (!checked.length) { err.textContent = 'Marque pelo menos um time.'; err.hidden = false; return; }
  const projects = checked.map((cb, i) => ({
    projectId: cb.dataset.projectId,
    projectName: cb.dataset.projectName,
    teamId: cb.dataset.teamId,
    teamName: cb.dataset.teamName,
    order: i,
    hidden: false,
  }));
  const config = C.normalizeConfig({ org: state.discovery.base, projects, updatedAt: new Date().toISOString() });
  saveJSON(LS.config, config);
  localStorage.setItem(LS.pat, state.discovery.pat);
  state.config = config;
  state.pat = state.discovery.pat;
  state.cache = { byCard: {}, myItems: null, myItemsError: null, fetchedAt: 0 };
  saveJSON(LS.cache, state.cache);
  $('wizard').close();
  boot();
}

/* ---------- Render/refresh provisórios (substituídos na tarefa seguinte) ---------- */
function renderAll() {
  $('grid').textContent = 'Configuração carregada: ' + state.config.projects.length + ' cartão(ões). Render real na próxima tarefa.';
}
function refreshAll(force) { /* dados vivos entram na próxima tarefa */ }

/* ---------- Boot ---------- */
function boot() {
  const raw = loadJSON(LS.config);
  if (raw) { try { state.config = C.normalizeConfig(raw); } catch (e) { state.config = null; } }
  if (!state.config) { $('wizard').showModal(); return; }
  renderAll();
  refreshAll(false);
}

document.addEventListener('DOMContentLoaded', () => {
  $('wizard-descobrir').addEventListener('click', wizardDiscover);
  $('wizard-concluir').addEventListener('click', wizardConclude);
  $('atualizar').addEventListener('click', () => refreshAll(true));
  boot();
});
})();
