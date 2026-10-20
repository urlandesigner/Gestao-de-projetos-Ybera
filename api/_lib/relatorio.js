/* O RELATÓRIO AO VIVO, do lado do servidor (15/10/2026).

   Quem abre o link do relatório não tem token, e sem token o navegador não fala
   com o DevOps. Até aqui a saída era o "Publicar dados": alguém com token tirava
   uma foto e a punha no site. Esta função tira a foto NA HORA do pedido, com UM
   token guardado na Vercel (variável AZDO_PAT), e devolve o MESMO pacote que o
   botão gravaria — a busca e a montagem são as do assets/pacote.js, as mesmas
   que o navegador do PO usa.

   O que ela NÃO faz, de propósito:
   - consulta livre ao DevOps: só o pacote do relatório, de uma edição e de uma
     PO que estejam na lista;
   - bloco local (`_descricoes`, `_entregas`): descrição crua de PBI nunca sai
     daqui;
   - ser a fonte de agosto/setembro: fechado e já compartilhado, o relatório o
     lê do arquivo congelado (gerado uma vez por esta função, em 15/10/2026).

   O token NUNCA passa por este arquivo, pelo repositório nem pela conversa: o
   Urlan cola no painel da Vercel. Sem ele, a função responde 503 e o relatório
   cai no arquivo publicado.

   Lógica aqui, e não no api/relatorio.js, pra ser testável no Node: o arquivo
   da Vercel só repassa o pedido. O sublinhado no nome da pasta faz a Vercel não
   tratá-la como rota. */
const C = require('../../assets/core.js');
const A = require('../../assets/api.js');
const P = require('../../assets/pacote.js');
const V2 = require('../../assets/briefing-entregas-v2.js');
const R = require('./resumos.js');

/* `require` estático, e não leitura por caminho montado: é assim que o
   empacotador da Vercel sabe que estes arquivos vão junto com a função. A lista
   de POs é fechada — e é ela que valida o `?de=`. */
const POS = {
  urlan: {
    fontes: require('../../assets/conteudo/urlan/fontes.json'),
    roadmap: require('../../assets/conteudo/urlan/roadmap.json'),
  },
  isadora: {
    fontes: require('../../assets/conteudo/isadora/fontes.json'),
    roadmap: require('../../assets/conteudo/isadora/roadmap.json'),
  },
  daniele: {
    fontes: require('../../assets/conteudo/daniele/fontes.json'),
    roadmap: require('../../assets/conteudo/daniele/roadmap.json'),
  },
  carla: {
    fontes: require('../../assets/conteudo/carla/fontes.json'),
    roadmap: require('../../assets/conteudo/carla/roadmap.json'),
  },
};
const RESUMOS = C.saneResumos(require('../../assets/resumos.json').itens);

/* Quem pode ler a resposta pelo navegador. O site oficial (Pages da Nivello)
   chama de outro domínio, e sem este cabeçalho o navegador joga a resposta
   fora. O localhost é o servidor de desenvolvimento. */
const ORIGENS = [
  'https://nivello-sistemas.github.io',
  'https://gestao-de-projetos-ybera.vercel.app',
  'http://localhost:8010',
  'http://127.0.0.1:8010',
];

/* O mês muda à meia-noite de BRASÍLIA, e o servidor roda em UTC: às 22h de
   31/10 aqui ainda é outubro, e lá já seria novembro. O ano e o mês saem do
   fuso de São Paulo e viram uma data no meio do mês — `edicoesAte` lê o mês
   pela data local de quem roda, e o dia 15 é o mesmo mês em qualquer fuso. */
function hojeEmBrasilia(agora) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric' })
    .formatToParts(new Date(agora));
  const v = (t) => Number((partes.find((x) => x.type === t) || {}).value);
  return new Date(v('year'), v('month') - 1, 15);
}

// O período fecha à meia-noite de Brasília do dia 1º seguinte (03h UTC).
/* DE QUEM É CADA ITEM: pelo e-mail da ficha da PO (assets/core.js), que é
   único no DevOps. O nome de exibição muda ("Urlan Dipre", "Urlan Maciel
   Dipré") e pode repetir o primeiro nome entre pessoas do mesmo time. Sem
   e-mail na ficha, cai na chave do primeiro nome. */
function daPO(chave) {
  const ficha = C.fichaDaPessoa(chave);
  const email = ficha && ficha.email ? String(ficha.email).toLowerCase() : '';
  return (it) => {
    const r = ((it || {}).fields || {})['System.AssignedTo'];
    if (!r) return false;
    if (email) return String(r.uniqueName || '').toLowerCase() === email;
    return C.chaveDePessoa(r.displayName) === chave;
  };
}

function cabecalhos(origem, extra) {
  const h = Object.assign({ 'content-type': 'application/json; charset=utf-8', vary: 'Origin' }, extra || {});
  if (ORIGENS.includes(origem)) h['access-control-allow-origin'] = origem;
  return h;
}

function json(status, corpo, origem, extra) {
  return new Response(JSON.stringify(corpo), { status, headers: cabecalhos(origem, extra) });
}

async function responder(request, { env = {}, fetchImpl, agora = Date.now(), avisar, armazem } = {}) {
  const url = new URL(request.url);
  const origem = request.headers.get('origin') || '';
  const de = url.searchParams.get('de') || 'urlan';
  const idEdicao = url.searchParams.get('edicao') || '';

  const po = Object.prototype.hasOwnProperty.call(POS, de) ? POS[de] : null;
  if (!po) return json(400, { erro: 'po' }, origem);
  const edicao = V2.edicoesAte(hojeEmBrasilia(agora)).find((e) => e.id === idEdicao);
  /* Qualquer edição da lista. Agosto/setembro também é servida desde
     15/10/2026, mas o relatório NÃO a lê daqui (ela não é `aoVivo`): a
     resposta serviu pra gerar, uma vez, o arquivo congelado dessa edição, que
     nunca tinha sido publicado. Edição fechada vem com cache de um dia. */
  if (!edicao) return json(400, { erro: 'edicao' }, origem);

  const pat = String(env.AZDO_PAT || '').trim();
  if (!pat) return json(503, { erro: 'sem-token' }, origem);
  const fontes = C.saneFontes(po.fontes);
  if (!fontes) return json(500, { erro: 'fontes' }, origem);

  const ctx = { base: fontes.org, pat, fetchImpl: fetchImpl || fetch };
  let tudo;
  try {
    tudo = await P.buscarTudo({ A, ctx, projetos: fontes.times, comRitmo: true,
      periodo: edicao.periodo, agora, avisar });
  } catch (e) {
    /* Token vencido ou sem acesso chegam aqui. O relatório trata o 502 caindo
       no arquivo publicado; o motivo vai pro log da Vercel, não pra resposta. */
    (avisar || console.warn)('[relatorio] o DevOps recusou: ' + ((e && e.message) || e));
    return json(502, { erro: 'devops' }, origem);
  }

  /* As linhas escritas sozinhas (api/resumos) completam as do arquivo. Sem
     armazém, ou com ele fora do ar, o relatório sai só com as do arquivo — a
     frase é enfeite do cartão, não pode derrubar o relatório. */
  let resumos = RESUMOS;
  try {
    const auto = await R.linhasGuardadas({ armazem, env });
    if (auto) resumos = C.mesclarResumos(RESUMOS, auto.itens);
  } catch (e) {
    (avisar || console.warn)('[relatorio] sem as frases automáticas: ' + ((e && e.message) || e));
  }

  const mostrados = tudo.itens.filter(daPO(de));
  const quem = mostrados.map((it) => ((it.fields || {})['System.AssignedTo'] || {}).displayName).find(Boolean);
  /* O módulo do relatório, com o período DESTA edição. Uma cópia rasa por
     pedido, e não `escolherEdicao`: a função atende pedidos ao mesmo tempo, e
     trocar a edição no módulo compartilhado faria um pedido de outubro montar o
     pacote de novembro. */
  const B = Object.assign(Object.create(V2), { periodoDoDocumento: () => edicao.periodo.slice() });
  const pacote = P.montarEntregas({
    B,
    mostrados,
    todos: tudo.itens.concat(tudo.pais),
    todosItens: tudo.itens,
    sprintsBrutas: tudo.sprintsBrutas,
    resumos,
    roadmap: C.saneRoadmapItens((po.roadmap || {}).itens),
    escopo: quem || (de.charAt(0).toUpperCase() + de.slice(1)),
    mes: null,
    agora,
    paraArquivo: false,
  });
  /* Mês aberto: 60 s na CDN, e por mais 5 min serve o anterior enquanto busca o
     novo — ninguém espera o DevOps. Mês fechado não muda mais: um dia. */
  const cache = C.periodoFechado(edicao.periodo, agora)
    ? 'public, s-maxage=86400, stale-while-revalidate=86400'
    : 'public, s-maxage=60, stale-while-revalidate=300';
  return json(200, pacote, origem, { 'cache-control': cache });
}

module.exports = { responder, ORIGENS };
