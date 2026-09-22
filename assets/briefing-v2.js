/* Central de Projetos — REPORT v2 ("Ledger"), de dado a HTML.

   Irmão de briefing.js (v1) e substituto dele por arquivo: expõe a MESMA
   interface (`esc`, `htmlReport`) e registra-se no MESMO nome global, então
   report.js não sabe qual dos dois está carregado — quem escolhe é a página
   (report.html carrega o v1, report-v2.html carrega este).

   Por que uma cópia em vez de um "tema" do v1: o v1 está congelado como
   versão publicada e não deve mudar mais. Compartilhar código faria cada
   ajuste de forma no v2 arriscar o v1. O que se repete aqui de propósito é a
   PROSA (as frases derivadas dos dados) — são decisões de conteúdo já
   discutidas e aprovadas, e continuam valendo palavra por palavra.

   O que muda é a FORMA. v1 é cartão arredondado com sombra sobre cinza, capa
   escura e gradiente roxo→verde. v2 é papel: régua fina, canto reto, zero
   sombra, zero gradiente, tipografia da marca (Schibsted Grotesk) e a paleta
   oficial da Ybera (Design System USA v0.12.1) — magenta como ação, dourado
   só sobre escuro (regra dura do DS: "acessibilidade vence identidade").

   Contrato de DOM com report.js (não mexer sem mexer lá):
   .report-doc · .doc-nav a[href="#id"] · #mes-global · #busca-entregas ·
   #lista-entregas > .grupo-produto[data-produto] > li[data-tipo][data-busca]
   (+ data-proprio-tipo/-busca) · .chip-doc[data-filtro][data-valor] (+.ativo) ·
   #limpar-entregas · #conta-entregas · seções com id igual ao href da nav.

   UMD: window.CentralBriefing no navegador, module.exports no Node. */
(function (root, factory) {
  const core = (typeof module !== 'undefined' && module.exports)
    ? require('./core.js')
    : root.CentralCore;
  const api = factory(core);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CentralBriefing = api;
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  // Escape sem DOM: este módulo roda no Node (testes) e dentro do arquivo gerado
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function dataCurta(v) {
    if (!v) return '';
    return new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  }

  function mesPorExtenso(chave) {
    const [ano, mes] = String(chave).split('-');
    const nome = new Date(Date.UTC(Number(ano), Number(mes) - 1, 1))
      .toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
    return nome.charAt(0).toUpperCase() + nome.slice(1) + ' de ' + ano;
  }

  function plural(n, um, muitos) { return n + ' ' + (n === 1 ? um : muitos); }

  const CAMPO_ALVO = 'Microsoft.VSTS.Scheduling.TargetDate';
  const MESES_COMPARATIVO = 12;
  const SEM_PRODUTO = 'Sem produto associado';
  const nomeProduto = (p) => (p ? p.titulo : SEM_PRODUTO);
  const chaveDe = (p) => (p ? 'p' + p.id : 'sem');

  // ---- Nome de negócio ----
  // Decisão do v1, mantida: o título do sistema é jargão. Onde o PO escreveu um
  // nome em assets/report-nomes.json, é ele que aparece; sem entrada, vale o
  // título — item nenhum some por falta de nome.
  let nomesAtivos = {};
  function nomeDe(id, fallback) {
    const n = nomesAtivos[id];
    return n && n.nome ? n.nome : fallback;
  }
  function resumoDe(id) {
    const n = nomesAtivos[id];
    return n && n.resumo ? n.resumo : '';
  }

  /* ==================================================================
     PROSA — copiada do v1 palavra por palavra.
     São decisões de conteúdo já aprovadas: vocabulário de negócio (nunca
     "PBI"/"Feature"/"DevOps"), nada afirmado além do que o dado mostra,
     e reconciliação entre os números da capa e o texto das seções.
     ================================================================== */
  const NOME_TIPO = {
    epic: ['frente', 'frentes'], feature: ['funcionalidade nova', 'funcionalidades novas'],
    pbi: ['melhoria', 'melhorias'], bug: ['correção', 'correções'], task: ['tarefa', 'tarefas'],
    outro: ['item de outro tipo', 'itens de outros tipos'],
  };

  function enumerar(partes) {
    if (partes.length <= 1) return partes.join('');
    return partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1];
  }

  function paragrafoVolume(m) {
    const r = m.resumo || {};
    const porTipo = new Map();
    for (const reg of m.itens || []) {
      const slug = C.typeSlug(((reg.item || {}).fields || {})['System.WorkItemType']);
      porTipo.set(slug, (porTipo.get(slug) || 0) + 1);
    }
    const ordem = ['epic', 'feature', 'pbi', 'bug', 'task', 'outro'];
    const niveis = ordem.filter((t) => porTipo.get(t))
      .map((t) => porTipo.get(t) + ' ' + NOME_TIPO[t][porTipo.get(t) > 1 ? 1 : 0]);
    const frases = [`Em ${mesPorExtenso(m.mes).toLowerCase()}, <b>${plural(m.total, 'item', 'itens')}</b> ${m.total === 1 ? 'foi concluído' : 'foram concluídos'} — ${enumerar(niveis)}.`];
    if (r.delta === null || r.delta === undefined) {
      // Sem mês anterior pra comparar: a frase fica só no volume, sem eco.
    } else if (r.delta > 0) {
      frases.push(`São <b>${r.delta} a mais</b> que em ${mesPorExtenso(r.mesAnterior).toLowerCase()}.`);
    } else if (r.delta < 0) {
      frases.push(`São <b>${-r.delta} a menos</b> que em ${mesPorExtenso(r.mesAnterior).toLowerCase()}.`);
    } else {
      frases.push(`Mesmo volume de ${mesPorExtenso(r.mesAnterior).toLowerCase()}.`);
    }
    return frases.join(' ');
  }

  function corpoProdutos(m) {
    const prods = (m.resumo || {}).produtos || [];
    const fech = (m.resumo || {}).epicosFechados || [];
    const soltos = (m.total || 0) - prods.reduce((soma, p) => soma + p.n, 0);
    const aviso = soltos > 0 ? ` — além de ${plural(soltos, 'item sem produto associado', 'itens sem produto associado')}` : '';
    let corpo = '';
    if (prods.length === 1) {
      corpo = `<p>${soltos > 0
        ? `O esforço com produto caiu todo em <b>${esc(prods[0].titulo)}</b>${aviso}.`
        : `Todo o esforço caiu em <b>${esc(prods[0].titulo)}</b>.`}</p>`;
    } else if (prods.length > 1) {
      const topo = prods.slice(0, 3);
      const resto = prods.length - topo.length;
      const max = topo.reduce((x, p) => Math.max(x, p.n), 1);
      // Cada produto vira linha com uma régua proporcional: a mesma informação
      // do v1 (nome + contagem), agora legível de relance pela extensão.
      const linhas = topo.map((p) => `<li>
        <span class="rl-esforco-nome">${esc(p.titulo)}</span>
        <span class="rl-esforco-regua"><i style="width:${Math.round((p.n / max) * 100)}%"></i></span>
        <b class="rl-num">${p.n}</b>
      </li>`).join('');
      const mais = resto > 0 ? `<li class="rl-esforco-mais">e outros ${resto}</li>` : '';
      corpo = `<p>O esforço se distribuiu em ${plural(prods.length, 'produto', 'produtos')}${aviso}:</p>
        <ul class="rl-esforco">${linhas}${mais}</ul>`;
    }
    if (fech.length === 1) {
      corpo += `<p><b>${esc(fech[0].titulo)}</b> fechou por completo.</p>`;
    } else if (fech.length > 1) {
      corpo += `<p>${plural(fech.length, 'épico fechou', 'épicos fecharam')} por completo: ${fech.map((e) => `<b>${esc(e.titulo)}</b>`).join(', ')}.</p>`;
    }
    return corpo;
  }

  function frentesEmRisco(regs, mapa) {
    const porProd = new Map();
    for (const r of regs) {
      const it = r.item || r;
      const prod = mapa.get(it.id) || null;
      const chave = prod ? prod.id : 'sem';
      if (!porProd.has(chave)) porProd.set(chave, { titulo: prod ? prod.titulo : SEM_PRODUTO, n: 0 });
      porProd.get(chave).n += 1;
    }
    return [...porProd.values()].sort((a, b) => b.n - a.n);
  }

  function paragrafoEmCurso(b, totalAtrasados) {
    const frases = [];
    if (b.execucao.length) frases.push(`<b>${plural(b.execucao.length, 'item', 'itens')}</b> em execução agora.`);
    const p = b.prazos;
    const prazo = [];
    if (p.atrasados.length) {
      const travados = totalAtrasados - p.atrasados.length;
      const aparte = travados
        ? ` (${travados} ${travados === 1 ? 'deles travado' : 'deles travados'} — ver Depende de decisão)`
        : '';
      prazo.push(`<b>${totalAtrasados} ${totalAtrasados === 1 ? 'já passou' : 'já passaram'} do prazo</b>${aparte}`);
    }
    if (p.esteMes.length) prazo.push(`${p.esteMes.length} ${p.esteMes.length === 1 ? 'vence' : 'vencem'} ainda este mês`);
    if (p.proximoMes.length) prazo.push(`${p.proximoMes.length} no mês que vem`);
    if (p.depois && p.depois.length) prazo.push(`${p.depois.length} mais adiante`);
    if (prazo.length) frases.push('Nos prazos: ' + prazo.join(', ') + '.');
    return frases.join(' ');
  }

  function paragrafoAtencao(b, travadosVencidos, frentes) {
    const frases = [];
    if (frentes && frentes.length) {
      const lista = frentes.map((f) => `<b>${esc(f.titulo)}</b> (${f.n} ${f.n === 1 ? 'item' : 'itens'})`);
      frases.push('Frentes com item atrasado: ' + enumerar(lista) + '.');
    }
    if (b.travados.length) {
      const tempo = travadosVencidos
        ? ' — ' + (b.travados.length === 1 ? 'com o prazo estourado' : `${travadosVencidos} deles com o prazo estourado`)
        : '';
      frases.push(`<b>${plural(b.travados.length, 'item está travado', 'itens estão travados')}</b>${tempo}. ${b.travados.length === 1 ? 'É o ponto que depende' : 'São os pontos que dependem'} de decisão.`);
    }
    return frases.join(' ');
  }

  function notaAproximados(m) {
    if (!m || !m.aproximados) return '';
    const n = m.aproximados;
    return `<p class="rl-nota">${n} ${n > 1 ? 'itens sem data de conclusão' : 'item sem data de conclusão'} registrada — ${n > 1 ? 'nesses' : 'nesse'} vale a data da última alteração, marcada com ~.</p>`;
  }

  const CAP_NOMES_FRENTE = 3;
  function listaNomes(itens) {
    const nomes = itens.map((r) => {
      const it = r.item || r;
      return `<b>${esc(nomeDe(it.id, (it.fields || {})['System.Title'] || ('item #' + it.id)))}</b>`;
    });
    const resto = nomes.length - CAP_NOMES_FRENTE;
    const mostrados = nomes.slice(0, CAP_NOMES_FRENTE);
    return resto > 0 ? mostrados.join(', ') + ` e mais ${resto}` : enumerar(mostrados);
  }

  /* ==================================================================
     FORMA — daqui pra baixo é tudo novo.
     Régua e espaço no lugar de caixa e sombra: cada linha de item é uma
     linha de razão contábil, não um cartão. Número tabular em toda
     contagem, pra coluna bater na vertical.
     ================================================================== */

  // Linha de item: nome à esquerda, fato à direita, número no fim. Sem selo de
  // tipo (decisão do v1: jargão de DevOps) e sem link pro DevOps (o
  // stakeholder não tem acesso — mandá-lo pra um login é pior que nada).
  // Os data-* alimentam o filtro do report.js.
  function linha(it, direita, titulo, chave, extra) {
    const f = it.fields || {};
    const slug = C.typeSlug(f['System.WorkItemType']);
    const original = f['System.Title'] || ('item #' + it.id);
    const nome = nomeDe(it.id, original);
    const busca = (original + ' #' + it.id + (nome !== original ? ' ' + nome : '')).toLowerCase();
    const dados = ` data-tipo="${slug}" data-produto="${esc(chave || 'sem')}" data-busca="${esc(busca)}"`;
    return `<li${dados}><div class="rl-linha">
      <span class="rl-linha-nome">${esc(nome)}</span>
      <span class="rl-linha-fato"${titulo ? ` title="${esc(titulo)}"` : ''}>${direita || ''}</span>
      <span class="rl-linha-id rl-num">#${esc(it.id)}</span>
    </div>${extra || ''}</li>`;
  }

  function porProduto(registros, mapa) {
    const grupos = new Map();
    for (const r of registros) {
      const it = r.item || r;
      const p = mapa.get(it.id) || null;
      const chave = p ? 'p' + p.id : 'sem';
      if (!grupos.has(chave)) grupos.set(chave, { produto: p, itens: [] });
      grupos.get(chave).itens.push(r);
    }
    return [...grupos.values()].sort((a, b) =>
      ((a.produto ? 0 : 1) - (b.produto ? 0 : 1))
      || (b.itens.length - a.itens.length)
      || (nomeProduto(a.produto) < nomeProduto(b.produto) ? -1 : 1));
  }

  // Rumo do produto: trilho de 2px e preenchimento magenta. Contagem absoluta
  // ao lado do %, porque "70%" de uma frente de 3 itens não pesa como de 30.
  function barraProgresso(feitos, total) {
    const pct = Math.round((feitos / total) * 100);
    const texto = `${feitos} de ${total} ${total === 1 ? 'item concluído' : 'itens concluídos'} · ${pct}%`;
    return `<div class="rl-rumo">
      <span class="rl-rumo-trilho" role="img" aria-label="${esc(texto)}"><i style="width:${pct}%"></i></span>
      <span class="rl-rumo-txt"><b class="rl-num">${feitos}/${total}</b> concluídos · <span class="rl-num">${pct}%</span></span>
    </div>`;
  }

  // Cabeçalho do grupo de entregas: nome do produto, prazo à direita e o rumo
  // embaixo. Sem estado cru (System.State): vem desatualizado e engana.
  function cabecalhoProduto(p, extra, info) {
    if (!p) return `<div class="rl-grupo-cab"><h3 class="rl-grupo-nome rl-sem-produto">${SEM_PRODUTO}</h3></div>`;
    const partes = [extra];
    if (p.alvo && !C.isTerminalState(p.estado)) partes.push('prazo ' + dataCurta(p.alvo));
    const detalhe = partes.filter(Boolean).join(' · ');
    const rumo = info && info.total > 0 ? barraProgresso(info.feitos, info.total) : '';
    return `<div class="rl-grupo-cab">
      <div class="rl-grupo-topo">
        <h3 class="rl-grupo-nome">${esc(p.titulo)}</h3>
        ${detalhe ? `<span class="rl-grupo-detalhe">${esc(detalhe)}</span>` : ''}
      </div>
      ${rumo}
    </div>`;
  }

  function grupoHtml(g, direita, info) {
    // Um épico é o produto de si mesmo: ele já é o cabeçalho, repetir a linha
    // embaixo parece defeito. O que a linha diria vai pro cabeçalho.
    const proprio = g.produto ? g.itens.find((r) => (r.item || r).id === g.produto.id) : null;
    const linhas = g.itens.filter((r) => r !== proprio);
    const chave = chaveDe(g.produto);
    const dadosProprio = proprio
      ? ` data-proprio-tipo="${C.typeSlug(g.produto.tipo)}" data-proprio-busca="${esc((g.produto.titulo + ' #' + g.produto.id).toLowerCase())}"`
      : '';
    const infoProduto = g.produto && info ? info[g.produto.id] : null;
    return `<div class="rl-grupo grupo-produto" data-produto="${esc(chave)}"${dadosProprio}>
      ${cabecalhoProduto(g.produto, proprio ? direita(proprio) : '', infoProduto)}
      ${linhas.length ? `<ul class="rl-linhas">${linhas.map((r) => linha(r.item || r, direita(r), '', chave)).join('')}</ul>` : ''}
    </div>`;
  }

  // ---- Peças da capa ----
  // Bento: blocos de tamanhos diferentes num mesmo grid. Cada bloco carrega UM
  // número em corpo de manchete, com a unidade miúda colada — é o contraste de
  // escala que faz a leitura acontecer de relance, antes de qualquer texto.
  function tile(rotulo, valor, sufixo, mod) {
    return `<article class="rl-tile${mod ? ' ' + mod : ''}">
      <p class="rl-tile-rot">${esc(rotulo)}</p>
      <p class="rl-tile-num"><b class="rl-num">${esc(String(valor))}</b>${sufixo ? `<span>${esc(sufixo)}</span>` : ''}</p>
    </article>`;
  }

  // O bloco escuro é a âncora da capa: leva a frase do mês e a variação contra
  // o mês anterior, com a seta fantasma ao fundo apontando pro lado que o
  // número andou. Único lugar da capa com superfície escura — e por isso o
  // único onde o dourado da marca pode aparecer.
  function heroi(mesAlvo, fechado) {
    const r = (mesAlvo && mesAlvo.resumo) || {};
    const total = (mesAlvo && mesAlvo.total) || 0;
    const d = r.delta;
    const temDelta = d !== null && d !== undefined;
    const sobe = temDelta && d > 0;
    const desce = temDelta && d < 0;
    const frase = total
      ? `${plural(total, 'item concluído', 'itens concluídos')} ${fechado ? 'neste mês' : 'até agora neste mês'}${
        temDelta ? (d === 0 ? ', o mesmo volume do mês anterior' : `, ${Math.abs(d)} ${sobe ? 'a mais' : 'a menos'} que no mês anterior`) : ''}.`
      : 'Nada foi concluído neste mês até agora.';
    const marca = temDelta && d !== 0
      ? `<span class="rl-heroi-delta${sobe ? ' rl-sobe' : ' rl-desce'}"><span class="rl-heroi-seta" aria-hidden="true">${sobe ? '↗' : '↘'}</span>${sobe ? '+' : ''}${d}</span>`
      : '';
    return `<article class="rl-tile rl-tile-escuro rl-heroi">
      <svg class="rl-heroi-fundo" viewBox="0 0 200 120" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <path d="M6 104 C40 104 44 62 74 62 C104 62 104 88 132 88 C162 88 166 24 194 24" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/>
        <path d="M168 24 H194 V50" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="rl-heroi-frase">${esc(frase)}</p>
      <div class="rl-heroi-base">
        <p class="rl-tile-num"><b class="rl-num">${total}</b><span>${total === 1 ? 'entrega' : 'entregas'}</span></p>
        ${marca}
      </div>
    </article>`;
  }

  function masthead(escolhido, meta, fechado, tiles, hero) {
    return `<header class="rl-capa">
      <div class="rl-capa-topo">
        <img class="rl-logo" src="assets/brand/ybera-logo.webp" alt="Ybera" width="360" height="139">
        <span class="rl-pill${fechado ? '' : ' rl-pill-vivo'}">
          <i aria-hidden="true"></i>${fechado ? 'Mês fechado' : 'Mês em curso'}
        </span>
      </div>
      <h1 class="rl-titulo">
        <span class="rl-titulo-fraco">Relatório de</span>
        <span class="rl-titulo-forte">${esc(mesPorExtenso(escolhido))}</span>
      </h1>
      ${meta ? `<p class="rl-meta">${esc(meta)}</p>` : ''}
      <div class="rl-bento rl-bento-capa">${tiles}${hero}</div>
    </header>`;
  }

  // Rodapé: única superfície escura do documento — e é onde o dourado da marca
  // pode existir (regra do DS: gold-500 nunca é texto sobre claro).
  const EMAIL_CONTATO = 'urlan.dipre@ybera.com';
  function rodape() {
    return `<footer class="rl-rodape">
      <div class="rl-tile rl-tile-escuro rl-rodape-int">
        <img class="rl-logo rl-logo-inv" src="assets/brand/ybera-logo.webp" alt="Ybera" width="360" height="139">
        <p class="rl-rodape-titulo">Time de Tecnologia</p>
        <p class="rl-rodape-sub">Comprometidos com transparência, inovação e colaboração</p>
        <p class="rl-rodape-contato">Para dúvidas ou sugestões<br><a href="mailto:${esc(EMAIL_CONTATO)}">${esc(EMAIL_CONTATO)}</a></p>
      </div>
    </footer>`;
  }

  // Só título e intro. Antes havia uma pílula de retranca em cima do título,
  // mas ela carregava o `rotulo` — que é o texto do menu, ou seja, o mesmo
  // nome da seção outra vez ("Roadmap" sobre "Roadmap"). Retranca que repete o
  // título não é retranca, é ruído: o h2 já diz onde a pessoa está.
  function secaoHtml(s) {
    return `<section class="rl-sec" id="${s.id}">
      <div class="rl-sec-cab">
        <h2 class="rl-sec-titulo">${esc(s.titulo)}</h2>
        <p class="rl-sec-intro">${esc(s.intro)}</p>
      </div>
      ${s.corpo}
    </section>`;
  }

  // ---- Corpos ----
  function corpoResumo(cartoes) {
    return `<div class="rl-notas">${cartoes.map((c) => `
      <article class="rl-nota-bloco${c.alerta ? ' rl-nota-alerta' : ''}">
        <p class="rl-rotulo">${esc(c.rotulo)}</p>
        ${c.html || `<p>${c.texto}</p>`}
      </article>`).join('')}</div>`;
  }

  function corpoFrentes(lista, escolhido, fechado, info, agora) {
    const mesNome = mesPorExtenso(escolhido).toLowerCase().replace(/ de \d{4}$/, '');
    const hoje = new Date(agora).getTime();
    const entradas = lista.map((f) => {
      const p = f.produto;
      const resumo = resumoDe(p.id);
      const rumo = info && info[p.id] && info[p.id].total > 0 ? barraProgresso(info[p.id].feitos, info[p.id].total) : '';
      const fechou = f.concluida || !!f.fechouNoMes;
      const risco = [];
      if (f.travados.length) risco.push(plural(f.travados.length, 'travado', 'travados'));
      if (f.atrasados.length) risco.push(plural(f.atrasados.length, 'atrasado', 'atrasados'));
      let selo = '';
      if (fechou) selo = '<span class="rl-selo rl-selo-ok">concluída</span>';
      else if (risco.length) selo = `<span class="rl-selo rl-selo-risco">${risco.join(' · ')}</span>`;
      let prazo = '';
      if (!fechou && !fechado && p.alvo) {
        prazo = Date.parse(p.alvo) < hoje
          ? `<span class="rl-prazo rl-atrasado">atrasada desde ${dataCurta(p.alvo)}</span>`
          : `<span class="rl-prazo">prazo ${dataCurta(p.alvo)}</span>`;
      }
      const blocos = [];
      const entregou = f.fechouNoMes
        ? 'A frente fechou por completo' + (f.entregas.length ? ` — ${plural(f.entregas.length, 'item', 'itens')}: ${listaNomes(f.entregas)}` : '') + '.'
        : f.entregas.length ? `${plural(f.entregas.length, 'item', 'itens')}: ${listaNomes(f.entregas)}.` : 'Nada concluído neste mês.';
      blocos.push(['Entregou em ' + mesNome, entregou]);
      if (!fechado) {
        blocos.push(['Em andamento', f.andamento.length
          ? `${plural(f.andamento.length, 'item', 'itens')}: ${listaNomes(f.andamento)}.`
          : 'Nada em andamento agora.']);
        if (f.proximo) {
          blocos.push(['Próximo marco', f.proximo.item
            ? `${dataCurta(f.proximo.alvo)} — ${listaNomes([f.proximo.item])}`
            : `${dataCurta(f.proximo.alvo)} — prazo da frente`]);
        }
        if (f.fila.length) blocos.push(['Na fila', plural(f.fila.length, 'item ainda por começar', 'itens ainda por começar') + '.']);
      }
      return `<article class="rl-frente${risco.length && !fechou ? ' rl-frente-risco' : ''}">
        <div class="rl-frente-cab">
          <h3 class="rl-frente-nome">${esc(p.titulo)}</h3>
          <div class="rl-frente-meta">${prazo}${selo}</div>
        </div>
        ${resumo ? `<p class="rl-frente-resumo">${esc(resumo)}</p>` : ''}
        ${rumo}
        <dl class="rl-fatos">${blocos.map(([dt, dd]) => `<div><dt>${esc(dt)}</dt><dd>${dd}</dd></div>`).join('')}</dl>
      </article>`;
    });
    return `<div class="rl-frentes">${entradas.join('')}</div>`;
  }

  function corpoEntregas(regs, mapa, info) {
    const grupos = porProduto(regs, mapa);
    // Só chips de produto: filtrar por tipo repete o recorte e é jargão.
    const chips = grupos.map((g) => {
      const rotulo = nomeProduto(g.produto);
      return `<button type="button" class="chip-doc rl-chip" aria-pressed="false" data-filtro="produto" data-valor="${esc(chaveDe(g.produto))}" title="${esc(rotulo)}"><span>${esc(rotulo)}</span><span class="rl-chip-n rl-num">${g.itens.length}</span></button>`;
    }).join('');
    const lista = grupos.map((g) => grupoHtml(g, (r) => (r.aproximada ? '~' : '') + dataCurta(r.quando), info)).join('');
    return `<div class="rl-filtros">
      <input id="busca-entregas" class="rl-busca" type="search" placeholder="buscar por título ou número" aria-label="Buscar entregas por título ou número" autocomplete="off">
      <div class="rl-chips">${chips}</div>
      <button type="button" class="rl-limpar" id="limpar-entregas" hidden>limpar</button>
      <span class="rl-conta rl-num" id="conta-entregas" aria-live="polite">${regs.length} de ${regs.length}</span>
    </div>
    <div class="rl-lista" id="lista-entregas">${lista}</div>`;
  }

  // Comparativo: barra horizontal com linha-base, número tabular e a variação
  // contra o mês anterior. O mês escolhido fica marcado em magenta.
  function corpoComparativo(meses, escolhido) {
    const lista = meses.slice(0, MESES_COMPARATIVO);
    const max = lista.reduce((m, x) => Math.max(m, x.total), 1);
    return `<ol class="rl-comp">${lista.map((m) => {
      const d = m.resumo.delta;
      const sinal = d === null || d === undefined ? '—' : d > 0 ? '+' + d : d < 0 ? String(d) : '=';
      const classe = d > 0 ? ' rl-sobe' : d < 0 ? ' rl-desce' : '';
      return `<li${m.mes === escolhido ? ' class="rl-comp-atual"' : ''}>
        <span class="rl-comp-mes">${esc(mesPorExtenso(m.mes).replace(/ de \d{4}$/, ''))}</span>
        <span class="rl-comp-barra"><i style="width:${Math.round((m.total / max) * 100)}%"></i></span>
        <span class="rl-comp-n rl-num">${m.total}</span>
        <span class="rl-comp-delta rl-num${classe}" title="contra o mês anterior">${sinal}</span>
      </li>`;
    }).join('')}</ol>
    <p class="rl-nota">A coluna da direita compara com o mês anterior. Não é medida de valor — é contagem de itens concluídos.</p>`;
  }

  function corpoDecisao(travados, agora, decisoes) {
    const hoje = new Date(agora);
    const direita = (r) => {
      const partes = [];
      const alvo = (r.item.fields || {})[CAMPO_ALVO];
      if (alvo) partes.push((Date.parse(alvo) < hoje.getTime() ? 'atrasado desde ' : 'prazo ') + dataCurta(alvo));
      if (r.dias != null) partes.push(`parado há ${r.dias} d`);
      if (!partes.length) partes.push('parado');
      return partes.join(' · ');
    };
    const pedidoDe = (r) => {
      const p = decisoes ? decisoes[r.item.id] : C.pedidoDeDecisao(r.item);
      return p ? `<p class="rl-pedido"><span class="rl-rotulo">Decisão a tomar</span>${esc(p)}</p>` : '';
    };
    return `<ul class="rl-linhas rl-linhas-decisao">${
      travados.map((r) => linha(r.item, direita(r), '', '', pedidoDe(r))).join('')}</ul>`;
  }

  function corpoProximos(b, agora) {
    const hoje = new Date(agora).getTime();
    const prazoDe = (it, verbo) => {
      const alvo = (it.fields || {})[CAMPO_ALVO];
      if (!alvo) return verbo === 'vence' ? '' : 'sem prazo definido';
      return Date.parse(alvo) < hoje
        ? `<span class="rl-atrasado">atrasado desde ${dataCurta(alvo)}</span>`
        : `${verbo} ${dataCurta(alvo)}`;
    };
    const bloco = (titulo, itens, direita) => itens.length ? `
      <div class="rl-bloco">
        <h3 class="rl-bloco-titulo">${esc(titulo)}<span class="rl-bloco-n rl-num">${itens.length}</span></h3>
        <ul class="rl-linhas">${itens.map((it) => linha(it, direita(it))).join('')}</ul>
      </div>` : '';
    const andamento = b.execucao.map((r) => r.item);
    const emAndamento = new Set(andamento.map((it) => it.id));
    const naFila = [...b.prazos.atrasados, ...b.prazos.esteMes, ...b.prazos.proximoMes, ...b.prazos.depois]
      .filter((r) => !emAndamento.has(r.item.id))
      .sort((x, y) => x.alvo - y.alvo)
      .map((r) => r.item);
    return bloco('Em andamento agora', andamento, (it) => prazoDe(it, 'prazo'))
      + bloco('Na fila, com data marcada', naFila, (it) => prazoDe(it, 'vence'));
  }

  // Roadmap: o único dado que não vem do DevOps (assets/roadmap.json). Datas em
  // dia UTC pra escala e barra baterem sem fuso torto.
  const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const diaUTC = (iso) => Date.parse(iso + 'T00:00:00Z');

  function corpoRoadmap(itens, agora) {
    if (!itens.length) return '';
    const ordenados = [...itens].sort((a, b) => diaUTC(a.inicio) - diaUTC(b.inicio));
    const inicios = itens.map((it) => diaUTC(it.inicio));
    const fins = itens.map((it) => diaUTC(it.fim));
    const dMin = new Date(Math.min(...inicios));
    const dMax = new Date(Math.max(...fins));
    const escalaIni = Date.UTC(dMin.getUTCFullYear(), dMin.getUTCMonth(), 1);
    const escalaFim = Date.UTC(dMax.getUTCFullYear(), dMax.getUTCMonth() + 1, 1);
    const vao = Math.max(1, escalaFim - escalaIni);
    const pct = (t) => Math.min(100, Math.max(0, ((t - escalaIni) / vao) * 100));

    const limites = [];
    for (let t = escalaIni; t <= escalaFim; t = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 1)) {
      limites.push(t);
    }
    const meses = limites.slice(0, -1).map((t) => {
      const d = new Date(t);
      return `<span style="left:${pct(t).toFixed(2)}%">${MES_ABREV[d.getUTCMonth()]}<i>/${String(d.getUTCFullYear()).slice(2)}</i></span>`;
    });
    const divisores = limites.map((t) => `<div class="rl-rm-mes" style="--x:${pct(t).toFixed(2)}%"></div>`).join('');

    const linhas = ordenados.map((it) => {
      const esquerda = pct(diaUTC(it.inicio));
      const largura = Math.max(0.6, pct(diaUTC(it.fim)) - esquerda);
      // Status vem escrito à mão no roadmap.json, não do DevOps: a janela diz
      // quando era pra acontecer, o status diz o que está acontecendo. Sem
      // status, o item é plano — e o documento não afirma nada sobre ele.
      // Em andamento fala só pela barra escura: um selo ali repetia o que a cor
      // já diz, numa coluna de título que é estreita. O title é pro que a cor
      // sozinha não conta — passar o mouse, e leitor de tela.
      const feito = it.status === 'concluido';
      const rodando = it.status === 'andamento';
      const selo = feito ? ' <span class="rl-rm-feito">concluído</span>' : '';
      const modBarra = feito ? ' rl-rm-barra-feita' : rodando ? ' rl-rm-barra-andamento' : '';
      const tituloBarra = rodando ? ' title="Em andamento"' : '';
      return `<div class="rl-rm-item">
        <span class="rl-rm-titulo">${esc(it.titulo)}${selo}</span>
        <span class="rl-rm-trilha"><span class="rl-rm-barra${modBarra}"${tituloBarra} style="left:${esquerda.toFixed(2)}%;width:${largura.toFixed(2)}%"></span></span>
      </div>`;
    }).join('');

    const hojeT = agora;
    // Rótulo junto da linha: sem ele, o traço vertical é uma marca sem legenda.
    const hoje = hojeT >= escalaIni && hojeT <= escalaFim
      ? `<div class="rl-rm-hoje" style="--x:${pct(hojeT).toFixed(2)}%"><span>hoje</span></div>` : '';

    return `<div class="rl-rm-wrap">
      <div class="rl-rm-grade">
        <div class="rl-rm-escala">${meses.join('')}</div>
        ${linhas}
        ${divisores}
        ${hoje}
      </div>
    </div>`;
  }

  /* ---- Entrada ----
     Mesmas opções e mesmo retorno do v1: { vazio, html, meses }.
     opcoes: { items, agora, escopo, unidade, todos, mes, nomes, produtos,
               decisoes, roadmap } */
  function htmlReport(opcoes) {
    const o = opcoes || {};
    const items = o.items || [];
    const agora = o.agora || Date.now();
    const escopo = o.escopo || '';
    nomesAtivos = o.nomes && typeof o.nomes === 'object' ? o.nomes : {};
    const mapa = C.mapaDeProdutos(o.todos || items);
    for (const p of mapa.values()) p.titulo = nomeDe(p.id, p.titulo);
    const infoProd = o.produtos || C.resumoProdutos(o.todos || items);
    const meses = C.resumoMensal(C.reportPorMes(items), mapa);
    for (const m of meses) for (const e of m.resumo.epicosFechados) e.titulo = nomeDe(e.id, e.titulo);
    const b = C.briefingDoMes(items, agora);
    const escolhido = /^\d{4}-(0[1-9]|1[0-2])$/.test(o.mes || '') ? o.mes : b.mes;
    const fechado = escolhido !== b.mes;
    const mesAlvo = meses.find((m) => m.mes === escolhido) || null;
    const dAgora = new Date(agora);
    const ano = String(dAgora.getUTCFullYear());
    const doAno = [];
    for (let m = dAgora.getUTCMonth() + 1; m >= 1; m -= 1) {
      doAno.push(ano + '-' + String(m).padStart(2, '0'));
    }
    const listaMeses = doAno.includes(escolhido) ? doAno : doAno.concat(escolhido);
    const mesesDoAno = meses.filter((m) => m.mes.slice(0, 4) === ano);
    const temPrazoVivo = b.prazos.atrasados.length + b.prazos.esteMes.length
      + b.prazos.proximoMes.length + b.prazos.depois.length > 0;
    if (!mesAlvo && !fechado && !b.execucao.length && !b.travados.length && !meses.length && !temPrazoVivo) {
      return { vazio: true, meses: listaMeses, html: '<p class="rl-vazio">Nada registrado ainda para este escopo.</p>' };
    }

    // Travado e atrasado responde às duas perguntas do core; no documento,
    // aparecer duas vezes lado a lado parece defeito. Fica em Decisão, com o
    // prazo na linha, e sai de Próximos passos.
    const idsTravados = new Set(b.travados.map((r) => r.item.id));
    const semTravados = (regs) => regs.filter((r) => !idsTravados.has(r.item.id));
    const travadosVencidos = b.prazos.atrasados.filter((r) => idsTravados.has(r.item.id)).length;
    const bVivo = Object.assign({}, b, {
      prazos: {
        atrasados: semTravados(b.prazos.atrasados),
        esteMes: semTravados(b.prazos.esteMes),
        proximoMes: semTravados(b.prazos.proximoMes),
        depois: semTravados(b.prazos.depois),
      },
    });

    const entregas = (mesAlvo && mesAlvo.itens) || [];
    const grupos = porProduto(entregas, mapa);
    const comProduto = grupos.filter((g) => g.produto);
    const listaFrentes = C.frentes({
      mapa,
      entregas,
      execucao: fechado ? [] : b.execucao,
      travados: fechado ? [] : b.travados,
      atrasados: fechado ? [] : bVivo.prazos.atrasados,
      comData: fechado ? [] : [...bVivo.prazos.esteMes, ...bVivo.prazos.proximoMes, ...bVivo.prazos.depois],
      fila: fechado ? [] : b.fila,
      agora: fechado ? null : agora,
    });

    const cartoesResumo = (fechado ? [
      { rotulo: 'Volume', texto: mesAlvo ? paragrafoVolume(mesAlvo) : 'Nada foi concluído neste mês.' },
      { rotulo: 'Onde caiu o esforço', html: mesAlvo ? corpoProdutos(mesAlvo) : '' },
    ] : [
      { rotulo: 'Volume', texto: mesAlvo ? paragrafoVolume(mesAlvo) : 'Nada foi concluído neste mês até agora.' },
      { rotulo: 'Onde caiu o esforço', html: mesAlvo ? corpoProdutos(mesAlvo) : '' },
      { rotulo: 'Em curso', texto: paragrafoEmCurso(bVivo, b.prazos.atrasados.length) },
      { rotulo: 'Atenção', alerta: true, texto: paragrafoAtencao(bVivo, travadosVencidos, frentesEmRisco(bVivo.prazos.atrasados, mapa)) },
    ]).filter((c) => c.texto || c.html);

    const meta = [];
    if (escopo) meta.push('P.O responsável: ' + escopo);
    if (o.unidade) meta.push(o.unidade);

    // "Fora do prazo" conta o travado vencido de propósito: é pergunta de
    // prazo, não de fluxo. Sem isso a capa diz 0 e a seção Decisão mostra
    // "atrasado desde…", o documento se contradizendo na mesma página.
    const kpis = tile(comProduto.length === 1 ? 'Produto tocado no mês' : 'Produtos tocados no mês', comProduto.length)
      + (fechado ? '' :
        tile('Em execução agora', b.execucao.length)
        + tile('Fora do prazo', b.prazos.atrasados.length, '', b.prazos.atrasados.length > 0 ? 'rl-tile-alerta' : ''));

    const secoes = [];
    secoes.push({
      id: 'resumo', titulo: 'Resumo', rotulo: 'Resumo',
      intro: 'O que o mês registrou. Nenhuma afirmação aqui vai além do que os dados mostram.',
      corpo: corpoResumo(cartoesResumo),
    });
    if (listaFrentes.length) {
      secoes.push({
        id: 'frentes', titulo: 'Por frente', rotulo: 'Frentes',
        intro: fechado
          ? 'Cada iniciativa e o que ela entregou no mês.'
          : 'Cada iniciativa em uma leitura: o que entregou no mês, o que está em andamento e o próximo marco.',
        corpo: corpoFrentes(listaFrentes, escolhido, fechado, infoProd, agora),
      });
    }
    if (entregas.length) {
      secoes.push({
        id: 'entregas', titulo: 'Entregas do mês', rotulo: 'Entregas',
        intro: 'Tudo que foi concluído no mês, agrupado por produto. Filtre por produto ou busque por título e número do item.',
        corpo: corpoEntregas(entregas, mapa, infoProd) + notaAproximados(mesAlvo),
      });
    }
    if (mesesDoAno.length > 1) {
      secoes.push({
        id: 'comparativo', titulo: 'Comparativo', rotulo: 'Comparativo',
        intro: 'Volume de entregas mês a mês em ' + ano + '.',
        corpo: corpoComparativo(mesesDoAno, escolhido),
      });
    }
    if (fechado) {
      secoes.push({
        id: 'agora', titulo: 'Situação de hoje', rotulo: 'Hoje',
        intro: 'Execução, prazos e travas aparecem só no mês corrente.',
        corpo: `<p class="rl-nota">Execução, prazos e travas são a leitura de hoje, não o estado
        que cada item tinha em ${esc(mesPorExtenso(escolhido).toLowerCase())}. Para ver o que está em curso,
        troque para o mês corrente no seletor do topo.</p>`,
      });
    } else {
      if (b.travados.length) {
        secoes.push({
          id: 'decisao', titulo: 'Depende de decisão', rotulo: 'Decisão',
          intro: 'Itens marcados como bloqueados ou em espera. Cada linha mostra o que está parado e o que precisa ser decidido para destravar.',
          corpo: corpoDecisao(b.travados, agora, o.decisoes || null),
        });
      }
      const totalProximos = bVivo.prazos.atrasados.length + bVivo.prazos.esteMes.length
        + bVivo.prazos.proximoMes.length + bVivo.prazos.depois.length + b.execucao.length;
      if (totalProximos) {
        secoes.push({
          id: 'proximos', titulo: 'Próximos passos', rotulo: 'Próximos',
          intro: 'O que está em andamento agora e o que está na fila com data marcada, do prazo mais apertado para o mais folgado.',
          corpo: corpoProximos(bVivo, agora),
        });
      }
    }
    const roadmapItens = o.roadmap || [];
    if (roadmapItens.length) {
      secoes.push({
        id: 'roadmap', titulo: 'Roadmap', rotulo: 'Roadmap',
        intro: 'O planejamento à frente, por trimestre — o horizonte mais longo do documento.',
        corpo: corpoRoadmap(roadmapItens, agora),
      });
    }

    // Navegação: barra reta, presa no topo. Sem pílula de vidro, sem sombra —
    // a régua de baixo é o que separa da página.
    // Navegação: a pílula de vidro do v1, trazida inteira — é a peça que o
    // Urlan quis manter. Duas camadas, como lá: `rl-nav-borda` é só a borda
    // (padding de 2px sobre fundo em gradiente, sem `border` de verdade) e
    // `rl-nav-int` é o vidro por dentro (fundo translúcido + blur). O mês mora
    // nela, à direita — é eixo do documento, não ferramenta do PO (quem abre
    // por link também troca de mês).
    const seletorMes = listaMeses.length > 1
      ? `<div class="rl-mes-borda"><select id="mes-global" class="rl-mes" aria-label="Mês do report">${listaMeses
        .map((m) => `<option value="${esc(m)}"${m === escolhido ? ' selected' : ''}>${esc(mesPorExtenso(m))}</option>`)
        .join('')}</select></div>`
      : '';
    const nav = `<nav class="doc-nav rl-nav" aria-label="Seções do report">
      <div class="rl-nav-borda">
        <div class="rl-nav-int">
          ${secoes.map((x) => `<a href="#${x.id}">${esc(x.rotulo)}</a>`).join('')}
          ${seletorMes}
        </div>
      </div>
    </nav>`;

    const html = `<div class="report-doc rl-doc">
      ${masthead(escolhido, meta.join(' · '), fechado, kpis, heroi(mesAlvo, fechado))}
      ${nav}
      <div class="rl-corpo">${secoes.map((x) => secaoHtml(x)).join('')}</div>
      ${rodape()}
    </div>`;

    return { vazio: false, meses: listaMeses, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
