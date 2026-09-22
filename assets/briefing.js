/* Central de Projetos — o REPORT, de dado a HTML.
   Vive fora do app.js de propósito: quem usa é a página report.html (autônoma,
   pra stakeholder) e o arquivo autocontido que ela gera. Não toca em DOM nem em
   localStorage — recebe itens, devolve string. Por isso dá pra testar no Node.
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

  // ---- Nome de negócio ----
  // O título do sistema é jargão ("[GLOBAL] BOGO via MetaFields"). Onde existe,
  // o report lê o nome que o PO escreveu em assets/report-nomes.json (id →
  // { nome, resumo }); sem entrada vale o título — item nenhum some por falta
  // de nome. Módulo-level porque as peças (linha, cabeçalho, frente) são
  // chamadas de vários pontos; htmlReport zera a cada documento.
  let nomesAtivos = {};
  function nomeDe(id, fallback) {
    const n = nomesAtivos[id];
    return n && n.nome ? n.nome : fallback;
  }
  function resumoDe(id) {
    const n = nomesAtivos[id];
    return n && n.resumo ? n.resumo : '';
  }

  // ---- Peças ----
  // `chave` é o produto do item; os data-* alimentam o filtro do bloco de
  // entregas — quem filtra é o report.js, escondendo linha, sem redesenhar nada.
  // Sem link pro DevOps: o stakeholder não tem acesso, e mandar ele pra uma tela
  // de login é pior que não oferecer nada. O número do item fica como texto —
  // serve pra quem tem acesso procurar lá dentro.
  function linha(it, direita, titulo, chave, extra) {
    const f = it.fields || {};
    const slug = C.typeSlug(f['System.WorkItemType']);
    const original = f['System.Title'] || ('item #' + it.id);
    const nome = nomeDe(it.id, original);
    // A busca acha pelos dois nomes: quem tem acesso ao sistema procura pelo título de lá.
    const busca = (original + ' #' + it.id + (nome !== original ? ' ' + nome : '')).toLowerCase();
    const dados = ` data-tipo="${slug}" data-produto="${esc(chave || 'sem')}" data-busca="${esc(busca)}"`;
    // Sem selo de tipo: "Feature/PBI/Bug" é jargão de DevOps e, agrupado por
    // produto, repete o que o stakeholder já lê. Cada item fica só com título,
    // data/prazo e o #id (que serve a quem tem acesso pra procurar lá dentro).
    // `extra` é HTML já montado que entra dentro do <li> (ex.: o pedido de decisão).
    return `<li${dados}><div class="item-linha">
      <span class="titulo">${esc(nome)}</span>
      <span class="quando"${titulo ? ` title="${esc(titulo)}"` : ''}>${direita || ''}</span>
      <span class="id">#${esc(it.id)}</span>
    </div>${extra || ''}</li>`;
  }

  // Agrupa por produto (o épico, ou a Feature mais alta): stakeholder pensa em
  // produto, não em item solto. Mais itens na frente; sem produto, por último —
  // é resto, não destaque.
  const SEM_PRODUTO = 'Sem produto associado';
  const nomeProduto = (p) => (p ? p.titulo : SEM_PRODUTO);

  function porProduto(registros, mapa) {
    const grupos = new Map();
    for (const r of registros) {
      const it = r.item || r;
      const p = mapa.get(it.id) || null;
      const chave = p ? 'p' + p.id : 'sem'; // por id: dois épicos podem ter o mesmo nome
      if (!grupos.has(chave)) grupos.set(chave, { produto: p, itens: [] });
      grupos.get(chave).itens.push(r);
    }
    return [...grupos.values()].sort((a, b) =>
      ((a.produto ? 0 : 1) - (b.produto ? 0 : 1))
      || (b.itens.length - a.itens.length)
      || (nomeProduto(a.produto) < nomeProduto(b.produto) ? -1 : 1));
  }

  // Barra de rumo: quanto do produto já fechou. Contagem absoluta ao lado, porque
  // "70%" de uma frente de 3 itens não é o mesmo peso que de 30. aria-label carrega
  // o mesmo texto pra quem usa leitor de tela.
  function barraProgresso(feitos, total) {
    const pct = Math.round((feitos / total) * 100);
    const texto = `${feitos} de ${total} ${total === 1 ? 'item concluído' : 'itens concluídos'} · ${pct}%`;
    return `<div class="cab-rumo">
      <div class="cab-barra" role="img" aria-label="${esc(texto)}"><span style="width:${pct}%"></span></div>
      <span class="cab-rumo-txt">${esc(texto)}</span>
    </div>`;
  }

  // O cabeçalho do grupo é o produto: nome à esquerda, prazo no canto direito, e a
  // barra de rumo (quanto do produto já fechou). Sem selo de tipo, sem descrição e
  // sem o estado (System.State): além de jargão em inglês, o campo vem
  // desatualizado (épico "New" com 30% dos filhos feitos), então engana. O rumo
  // (barra) diz melhor em que pé a frente está. `extra` é a data quando o próprio
  // épico entregou no mês. `info` traz o progresso pronto pra não recontar no link.
  function cabecalhoProduto(p, extra, info) {
    if (!p) return `<div class="cab-produto"><h3 class="cab-nome"><span class="cab-sem">${SEM_PRODUTO}</span></h3></div>`;
    const partes = [extra];
    // Prazo de item já concluído é ruído: o que importa é quando fechou.
    if (p.alvo && !C.isTerminalState(p.estado)) partes.push('prazo ' + dataCurta(p.alvo));
    const detalhe = partes.filter(Boolean).join(' · ');
    const rumo = info && info.total > 0 ? barraProgresso(info.feitos, info.total) : '';
    return `<div class="cab-produto">
      <div class="cab-topo">
        <h3 class="cab-nome">${esc(p.titulo)}</h3>
        ${detalhe ? `<span class="cab-detalhe">${esc(detalhe)}</span>` : ''}
      </div>
      ${rumo}
    </div>`;
  }

  const chaveDe = (p) => (p ? 'p' + p.id : 'sem');

  function grupoHtml(g, direita, info) {
    // Um épico é o produto de si mesmo. Ele já é o cabeçalho — repetir a mesma
    // linha embaixo parece defeito. O que a linha diria vai pro cabeçalho.
    const proprio = g.produto ? g.itens.find((r) => (r.item || r).id === g.produto.id) : null;
    const linhas = g.itens.filter((r) => r !== proprio);
    const chave = chaveDe(g.produto);
    // O épico que entregou por si virou cabeçalho e perdeu a linha. Ele ainda é
    // um item: vai nos data-* pra o contador do filtro não mentir.
    const dadosProprio = proprio
      ? ` data-proprio-tipo="${C.typeSlug(g.produto.tipo)}" data-proprio-busca="${esc((g.produto.titulo + ' #' + g.produto.id).toLowerCase())}"`
      : '';
    const infoProduto = g.produto && info ? info[g.produto.id] : null;
    return `<div class="grupo-produto" data-produto="${esc(chave)}"${dadosProprio}>
      ${cabecalhoProduto(g.produto, proprio ? direita(proprio) : '', infoProduto)}
      ${linhas.length ? `<ul class="lista-linhas">${linhas.map((r) => linha(r.item || r, direita(r), '', chave)).join('')}</ul>` : ''}
    </div>`;
  }

  // ---- Prosa ----
  // Derivada dos fatos. No Radar era escrita à mão; aqui nada afirma o que os
  // dados não mostram.
  // "3 PBIs" quando um deles tem selo de Bug na lista logo abaixo é o documento
  // se contradizendo. A contagem usa o tipo real do item, não o nível.
  // Vocabulário de negócio, não de ferramenta: o stakeholder não sabe (nem
  // precisa saber) o que é feature, PBI ou DevOps. A contagem por trás continua
  // pelo tipo real do item — só o nome que aparece na frase é que muda.
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
    // Sem "no nome de X": o P.O. já é quem o report inteiro é sobre — repetir
    // o nome aqui seria eco (ele mora só na capa, uma vez).
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

  // "Onde caiu o esforço" lista os produtos em vez de escrever numa frase
  // corrida ("A (5), B (2)") — cada produto vira uma linha, nome à esquerda
  // e contagem à direita, como as pílulas do resto do documento. Com um
  // produto só não há o que listar: fica frase, como antes.
  function corpoProdutos(m) {
    const prods = (m.resumo || {}).produtos || [];
    const fech = (m.resumo || {}).epicosFechados || [];
    // Itens sem produto contam no total mas não em produto nenhum: "todo o
    // esforço caiu em X" seria mentira quando eles existem.
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
      const linhas = topo.map((p) => `<li><span>${esc(p.titulo)}</span><b>${p.n}</b></li>`).join('');
      const mais = resto > 0 ? `<li class="produtos-resumo-mais">e outros ${resto}</li>` : '';
      corpo = `<p>O esforço se distribuiu em ${plural(prods.length, 'produto', 'produtos')}${aviso}:</p>
        <ul class="produtos-resumo">${linhas}${mais}</ul>`;
    }
    if (fech.length === 1) {
      corpo += `<p><b>${esc(fech[0].titulo)}</b> fechou por completo.</p>`;
    } else if (fech.length > 1) {
      corpo += `<p>${plural(fech.length, 'épico fechou', 'épicos fecharam')} por completo: ${fech.map((e) => `<b>${esc(e.titulo)}</b>`).join(', ')}.</p>`;
    }
    return corpo;
  }

  // Triagem de risco derivada: agrupa os itens atrasados por produto, do mais
  // afetado pro menos. Diz QUAL frente está em risco de prazo — o "3 fora do
  // prazo" da capa vira "onde". Sem inventar consequência: só conta o atraso.
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

  // A situação virou dois cards pra não empilhar quatro ideias num paredão só:
  // "Em curso" (o que flui — execução e prazos) e "Atenção" (o que trava — frentes
  // atrasadas e o travado que pede decisão). Grid de 4 cards fecha 2×2, equilibrado.
  // `totalAtrasados` é o mesmo número do KPI "fora do prazo" da capa (inclui o
  // travado). Quando sobra atraso fora do travado, a frase reconcilia os dois em
  // vez de recontar só o que ainda está vivo — senão a capa diz "3" e este card
  // diz "2", parecendo contradição. Quando TODO atrasado está travado (nada vivo
  // pra contar aqui), a frase fica calada: já é dito em "Depende de decisão".
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

  // `travadosVencidos` reconcilia a prosa com a capa: o KPI "fora do prazo" conta
  // o travado vencido, então a frase dos travados diz qual deles é. `frentes` é a
  // triagem de risco: quais produtos têm item atrasado.
  function paragrafoAtencao(b, travadosVencidos, frentes) {
    const frases = [];
    if (frentes && frentes.length) {
      const lista = frentes.map((f) => `<b>${esc(f.titulo)}</b> (${f.n} ${f.n === 1 ? 'item' : 'itens'})`);
      frases.push('Frentes com item atrasado: ' + enumerar(lista) + '.');
    }
    if (b.travados.length) {
      // Sem "sem movimento há N dias": pra um stakeholder soa como o time
      // emperrado, quando o ponto é só que a decisão dele destrava o item.
      const tempo = travadosVencidos
        ? ' — ' + (b.travados.length === 1 ? 'com o prazo estourado' : `${travadosVencidos} deles com o prazo estourado`)
        : '';
      frases.push(`<b>${plural(b.travados.length, 'item está travado', 'itens estão travados')}</b>${tempo}. ${b.travados.length === 1 ? 'É o ponto que depende' : 'São os pontos que dependem'} de decisão.`);
    }
    return frases.join(' ');
  }

  // Data de conclusão em branco no DevOps: vale a última alteração, marcada com ~.
  // Quem lê tem que saber quando a data é aproximada.
  function notaAproximados(m) {
    if (!m || !m.aproximados) return '';
    const n = m.aproximados;
    return `<p class="mudo nota-report">${n} ${n > 1 ? 'itens sem data de conclusão' : 'item sem data de conclusão'} registrada — ${n > 1 ? 'nesses' : 'nesse'} vale a data da última alteração, marcada com ~.</p>`;
  }

  // ---- Documento ----
  // A estrutura segue o Relatório Mensal de Tecnologia da Ybera: capa escura com
  // os números do ciclo, navegação em pílulas e seções com título e a frase que
  // as explica. O que aquele report escreve à mão — BVS, narrativa de impacto,
  // vídeo da entrega — não existe aqui: cada número abaixo sai dos itens do
  // DevOps, e o que os dados não sustentam não é afirmado.
  const CAMPO_ALVO = 'Microsoft.VSTS.Scheduling.TargetDate';
  const MESES_COMPARATIVO = 12;

  function tile(n, rotulo, alerta) {
    return `<li${alerta && n ? ' class="kpi-alerta"' : ''}><b>${n}</b><span>${esc(rotulo)}</span></li>`;
  }

  function capa(escolhido, meta, tiles) {
    return `<header class="doc-capa">
      <div class="doc-limite">
        <h1 class="doc-titulo"><span>Relatório de</span><b>${esc(mesPorExtenso(escolhido))}</b></h1>
        ${meta ? `<p class="doc-meta">${esc(meta)}</p>` : ''}
        ${tiles ? `<ul class="doc-kpis">${tiles}</ul>` : ''}
      </div>
    </header>`;
  }

  // Assinatura do time no fim do documento — mesmo modelo do Relatório Mensal
  // de Tecnologia da Ybera, com o contato de quem mantém ESTE report.
  const EMAIL_CONTATO = 'urlan.dipre@ybera.com';
  function rodape() {
    return `<footer class="doc-rodape">
      <div class="doc-limite">
        <div class="doc-rodape-int">
          <h2 class="doc-rodape-titulo">Time de Tecnologia Ybera</h2>
          <p class="doc-rodape-sub">Comprometidos com transparência, inovação e colaboração</p>
          <p class="doc-rodape-contato">Para dúvidas ou sugestões<br><a href="mailto:${esc(EMAIL_CONTATO)}">${esc(EMAIL_CONTATO)}</a></p>
          <p class="doc-rodape-marca">Y.</p>
        </div>
      </div>
    </footer>`;
  }

  // Cabeçalho de seção: título grande no gradiente da marca, com a tarja clara
  // atrás, e a frase que o explica logo embaixo. Sem o numeral gigante ao fundo
  // e sem rótulo em inglês — o PO pediu o padrão sem os dois (17/09/2026).
  // O <span> dentro do h2 não é enfeite: o gradiente é recorte no texto, então
  // precisa morar no elemento que TEM o texto, e a tarja fica atrás dele.
  function secaoHtml(s) {
    return `<section class="doc-sec" id="${s.id}">
      <div class="doc-limite">
        <div class="doc-sec-topo">
          <h2><span>${esc(s.titulo)}</span></h2>
          <p class="doc-intro">${esc(s.intro)}</p>
        </div>
        ${s.corpo}
      </div>
    </section>`;
  }

  // Entregas: tudo do mês, agrupado por produto, com chips e busca. Os chips e o
  // contador são estáticos aqui; quem esconde linha é o report.js.
  function corpoEntregas(regs, mapa, info) {
    const grupos = porProduto(regs, mapa);
    const chip = (filtro, valor, rotulo, n) =>
      `<button type="button" class="chip-doc" aria-pressed="false" data-filtro="${filtro}" data-valor="${esc(valor)}" title="${esc(rotulo)}"><span>${esc(rotulo)}</span><span class="n">${n}</span></button>`;
    // Só chips de produto: filtrar por tipo (Feature, PBI…) repete o recorte por
    // produto pra quem lê, e é jargão de DevOps. O filtro fica no eixo que o
    // stakeholder usa; nas linhas, item nenhum carrega mais selo de tipo.
    const chips = grupos.map((g) => chip('produto', chaveDe(g.produto), nomeProduto(g.produto), g.itens.length)).join('');
    const lista = grupos.map((g) => grupoHtml(g, (r) => (r.aproximada ? '~' : '') + dataCurta(r.quando), info)).join('');
    return `<div class="doc-filtros">
      <input id="busca-entregas" type="search" placeholder="buscar por título ou #id" aria-label="Buscar entregas por título ou número" autocomplete="off">
      <div class="chips-doc">${chips}</div>
      <button type="button" class="limpar-doc" id="limpar-entregas" hidden>limpar</button>
      <span class="conta-doc" id="conta-entregas" aria-live="polite">${regs.length} de ${regs.length}</span>
    </div>
    <div class="doc-lista" id="lista-entregas">${lista}</div>`;
  }

  function corpoComparativo(meses, escolhido) {
    const lista = meses.slice(0, MESES_COMPARATIVO);
    const max = lista.reduce((m, x) => Math.max(m, x.total), 1);
    return `<ol class="comparativo doc-bloco">${lista.map((m) => {
      const d = m.resumo.delta;
      const sinal = d === null || d === undefined ? '—' : d > 0 ? '+' + d : d < 0 ? String(d) : '=';
      const classe = d > 0 ? ' sobe' : d < 0 ? ' desce' : '';
      return `<li${m.mes === escolhido ? ' class="comp-atual"' : ''}>
        <span class="comp-mes">${mesPorExtenso(m.mes)}</span>
        <span class="comp-barra"><span style="width:${Math.round((m.total / max) * 100)}%"></span></span>
        <span class="comp-n">${m.total}</span>
        <span class="comp-delta${classe}" title="contra o mês anterior">${sinal}</span>
      </li>`;
    }).join('')}</ol>
    <p class="mudo nota-report">A coluna da direita compara com o mês anterior.
    Não é medida de valor — é contagem de itens concluídos.</p>`;
  }

  // O item travado sai de "Próximos passos" pra não aparecer duas vezes no mesmo
  // documento. Em troca, o prazo dele vem pra cá: quem lê precisa saber que,
  // além de parado, já passou da data. E o pedido de decisão (marcador "Decisão:"
  // na descrição) vem embaixo — o que precisa ser decidido pra destravar.
  function corpoDecisao(travados, agora, decisoes) {
    const hoje = new Date(agora);
    const direita = (r) => {
      const partes = [];
      const alvo = (r.item.fields || {})[CAMPO_ALVO];
      if (alvo) partes.push((Date.parse(alvo) < hoje.getTime() ? 'atrasado desde ' : 'prazo ') + dataCurta(alvo));
      if (r.dias != null) partes.push(`parado há ${r.dias} d`);
      if (!partes.length) partes.push('parado'); // sem estado cru: é jargão em inglês
      return partes.join(' · ');
    };
    // No link o pedido vem assado (`decisoes`); ao vivo, extrai da descrição.
    const pedidoDe = (r) => {
      const p = decisoes ? decisoes[r.item.id] : C.pedidoDeDecisao(r.item);
      return p ? `<p class="pedido-decisao"><span class="pedido-rot">Decisão a tomar</span>${esc(p)}</p>` : '';
    };
    return `<div class="doc-bloco"><div class="grupo-produto"><ul class="lista-linhas">${
      travados.map((r) => linha(r.item, direita(r), '', '', pedidoDe(r))).join('')}</ul></div></div>`;
  }

  // Próximos passos em duas listas, não por faixa de prazo: "o que está sendo
  // feito" era a pergunta que o documento não respondia — o item em andamento
  // com data ficava misturado com o que nem começou. Atrasado não ganha bloco
  // próprio: fica em vermelho na lista em que está (e o card Atenção já nomeia
  // as frentes) — repetir o mesmo item em dois blocos parecia defeito. O
  // resumo por frente saiu daqui: virou a seção "Por frente".
  function corpoProximos(b, agora) {
    const hoje = new Date(agora).getTime();
    const prazoDe = (it, verbo) => {
      const alvo = (it.fields || {})[CAMPO_ALVO];
      if (!alvo) return verbo === 'vence' ? '' : 'sem prazo definido';
      return Date.parse(alvo) < hoje
        ? `<span class="quando-alerta">atrasado desde ${dataCurta(alvo)}</span>`
        : `${verbo} ${dataCurta(alvo)}`;
    };
    const bloco = (titulo, itens, direita) => itens.length ? `
      <div class="grupo-produto">
        <h3>${titulo}</h3>
        <ul class="lista-linhas">${itens.map((it) => linha(it, direita(it))).join('')}</ul>
      </div>` : '';
    const andamento = b.execucao.map((r) => r.item);
    const emAndamento = new Set(andamento.map((it) => it.id));
    const naFila = [...b.prazos.atrasados, ...b.prazos.esteMes, ...b.prazos.proximoMes, ...b.prazos.depois]
      .filter((r) => !emAndamento.has(r.item.id))
      .sort((x, y) => x.alvo - y.alvo)
      .map((r) => r.item);
    return '<div class="doc-bloco">'
      + bloco('Em andamento agora', andamento, (it) => prazoDe(it, 'prazo'))
      + bloco('Na fila, com data marcada', naFila, (it) => prazoDe(it, 'vence'))
      + '</div>';
  }

  // Roadmap: a única seção cujo dado não vem do DevOps — vem de um arquivo
  // estático (assets/roadmap.json), porque o Notion não pode ser chamado do
  // navegador (sem CORS) e o report não guarda token de Notion nenhum. Datas
  // em dia UTC (meia-noite) pra escala e barra baterem sem fuso torto.
  const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const diaUTC = (iso) => Date.parse(iso + 'T00:00:00Z');

  function corpoRoadmap(itens, agora) {
    if (!itens.length) return '';
    const ordenados = [...itens].sort((a, b) => diaUTC(a.inicio) - diaUTC(b.inicio));
    const inicios = itens.map((it) => diaUTC(it.inicio));
    const fins = itens.map((it) => diaUTC(it.fim));
    // Escala em meses inteiros: do 1º dia do mês mais cedo ao último dia do
    // mês mais tarde — bordas redondas, sem cortar barra no meio de um mês.
    const dMin = new Date(Math.min(...inicios));
    const dMax = new Date(Math.max(...fins));
    const escalaIni = Date.UTC(dMin.getUTCFullYear(), dMin.getUTCMonth(), 1);
    const escalaFim = Date.UTC(dMax.getUTCFullYear(), dMax.getUTCMonth() + 1, 1);
    const vao = Math.max(1, escalaFim - escalaIni);
    const pct = (t) => Math.min(100, Math.max(0, ((t - escalaIni) / vao) * 100));

    // Limites de cada mês (início de jan, início de fev, ...), fechando com a
    // borda direita da escala — vira rótulo (menos o último, que só fecha) e
    // divisor vertical (esse sim, todos, pra marcar onde cada mês começa E
    // termina, e não perder a leitura em barras que atravessam vários meses).
    const limites = [];
    for (let t = escalaIni; t <= escalaFim; t = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 1)) {
      limites.push(t);
    }
    const meses = limites.slice(0, -1).map((t) => {
      const d = new Date(t);
      return `<span style="left:${pct(t).toFixed(2)}%">${MES_ABREV[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}</span>`;
    });
    const divisoresMes = limites
      .map((t) => `<div class="roadmap-mes-linha" style="--x:${pct(t).toFixed(2)}%"></div>`).join('');

    const linhas = ordenados.map((it) => {
      const esquerda = pct(diaUTC(it.inicio));
      const largura = Math.max(0.6, pct(diaUTC(it.fim)) - esquerda);
      // Status é escrito à mão no roadmap.json, não lido do DevOps: a janela
      // do calendário diz quando era pra acontecer, o status diz o que de fato
      // está acontecendo. Sem status, o item é só plano — e o documento não
      // inventa estado nenhum pra ele. Em andamento fala só pela barra escura;
      // o title é pro que a cor sozinha não conta.
      const feito = it.status === 'concluido';
      const rodando = it.status === 'andamento';
      const selo = feito ? ' <span class="roadmap-feito">concluído</span>' : '';
      const modBarra = feito ? ' roadmap-barra-feita' : rodando ? ' roadmap-barra-andamento' : '';
      const tituloBarra = rodando ? ' title="Em andamento"' : '';
      return `<div class="roadmap-item">
        <span class="roadmap-titulo">${esc(it.titulo)}${selo}</span>
        <span class="roadmap-trilha"><span class="roadmap-barra${modBarra}"${tituloBarra} style="left:${esquerda.toFixed(2)}%;width:${largura.toFixed(2)}%"></span></span>
      </div>`;
    }).join('');

    const hojeT = agora;
    const hoje = hojeT >= escalaIni && hojeT <= escalaFim
      ? `<div class="roadmap-hoje" style="--x:${pct(hojeT).toFixed(2)}%"></div>` : '';

    return `<div class="roadmap-wrap">
      <div class="roadmap-grade">
        <div class="roadmap-escala">${meses.join('')}</div>
        ${linhas}
        ${divisoresMes}
        ${hoje}
      </div>
    </div>`;
  }

  // ---- Por frente ----
  // Um card por iniciativa (o épico), respondendo numa leitura as três perguntas
  // do stakeholder: o que entregou no mês, o que está em andamento, qual é o
  // próximo marco — e, quando há, o que trava. Mês fechado só afirma o
  // histórico (entregou); execução e marco são leitura de agora. Nomes vêm
  // pelo nome de negócio; PBI sem nome fica com o título.
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

  function corpoFrentes(lista, escolhido, fechado, info, agora) {
    const mesNome = mesPorExtenso(escolhido).toLowerCase().replace(/ de \d{4}$/, '');
    const hoje = new Date(agora).getTime();
    const cards = lista.map((f) => {
      const p = f.produto;
      const resumo = resumoDe(p.id);
      const rumo = info && info[p.id] && info[p.id].total > 0 ? barraProgresso(info[p.id].feitos, info[p.id].total) : '';
      const fechou = f.concluida || !!f.fechouNoMes;
      const risco = [];
      if (f.travados.length) risco.push(plural(f.travados.length, 'travado', 'travados'));
      if (f.atrasados.length) risco.push(plural(f.atrasados.length, 'atrasado', 'atrasados'));
      let selo = '';
      if (fechou) selo = '<span class="frente-selo">concluída</span>';
      else if (risco.length) selo = `<span class="frente-selo frente-selo-alerta">${risco.join(' · ')}</span>`;
      // O prazo da iniciativa em si — o épico saiu das listas de Próximos, então
      // é aqui que a data dele mora. Fechada, o prazo é ruído; mês fechado, é
      // leitura de agora e não entra.
      let prazo = '';
      if (!fechou && !fechado && p.alvo) {
        prazo = Date.parse(p.alvo) < hoje
          ? `<span class="frente-prazo quando-alerta">atrasada desde ${dataCurta(p.alvo)}</span>`
          : `<span class="frente-prazo">prazo ${dataCurta(p.alvo)}</span>`;
      }
      const meta = prazo || selo ? `<div class="frente-meta">${prazo}${selo}</div>` : '';
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
      return `<article class="frente${risco.length && !fechou ? ' frente-risco' : ''}">
        <div class="frente-topo"><h3 class="frente-nome">${esc(p.titulo)}</h3>${meta}</div>
        ${resumo ? `<p class="frente-resumo">${esc(resumo)}</p>` : ''}
        ${rumo}
        <dl class="frente-blocos">${blocos.map(([dt, dd]) => `<div><dt>${esc(dt)}</dt><dd>${dd}</dd></div>`).join('')}</dl>
      </article>`;
    });
    return `<div class="frentes">${cards.join('')}</div>`;
  }

  // ---- Entrada ----
  // opcoes: { items, agora, escopo, unidade, todos, mes, nomes }
  // `unidade` é o nome do escopo como o stakeholder o conhece ("Ybera US"). Quem
  // chama decide: a lista de times do DevOps é jargão interno e não diz nada pra
  // quem lê o report.
  // Não recebe mais `org`: o documento não tem link pro DevOps. Quem lê não tem
  // acesso, e oferecer um caminho que termina em tela de login é pior que nada.
  // `items` é o recorte que aparece no report. `todos` é o conjunto inteiro
  // consultado, usado SÓ pra descobrir o produto de cada item: a cadeia
  // PBI → Feature → Épico só se monta se os pais estiverem presentes, e o pai
  // costuma estar em outro nome (ou sem ninguém).
  // `mes` ('2026-07') escolhe o mês do report; sem ele, o mês corrente. Mês
  // fechado mostra só o que é fato histórico: o que foi entregue. Execução,
  // prazos e travas são o AGORA — o DevOps guarda o estado atual, não o estado
  // que o item tinha em julho, e afirmar isso seria mentira.
  // Devolve { vazio, html, meses } — `meses` alimenta o seletor de quem chama.
  function htmlReport(opcoes) {
    const o = opcoes || {};
    const items = o.items || [];
    const agora = o.agora || Date.now();
    const escopo = o.escopo || '';
    nomesAtivos = o.nomes && typeof o.nomes === 'object' ? o.nomes : {};
    const mapa = C.mapaDeProdutos(o.todos || items);
    // O nome de negócio entra no mapa uma vez: cabeçalho de produto, chips,
    // "Onde caiu o esforço" e triagem de risco leem daqui sem saber de nomes.
    for (const p of mapa.values()) p.titulo = nomeDe(p.id, p.titulo);
    // Objetivo + rumo por produto. No modo PO calcula do backlog inteiro (`todos`);
    // no link de leitura vem pronto (`o.produtos`), porque o pacote não carrega o
    // backlog completo e recalcular ali subcontaria o progresso.
    const infoProd = o.produtos || C.resumoProdutos(o.todos || items);
    const meses = C.resumoMensal(C.reportPorMes(items), mapa);
    for (const m of meses) for (const e of m.resumo.epicosFechados) e.titulo = nomeDe(e.id, e.titulo);
    const b = C.briefingDoMes(items, agora);
    // O `mes` pode vir do fragmento do link — dado que qualquer um forja. Formato
    // inválido cai no mês corrente em vez de virar "Invalid Date" (ou HTML) na capa.
    const escolhido = /^\d{4}-(0[1-9]|1[0-2])$/.test(o.mes || '') ? o.mes : b.mes;
    const fechado = escolhido !== b.mes; // mês que já passou
    const mesAlvo = meses.find((m) => m.mes === escolhido) || null;
    // Seletor: TODO mês do ano corrente até hoje, tenha tido entrega ou não.
    // Listar só os meses com entrega deixava o PO sem como olhar um mês vazio —
    // e um mês vazio é informação. Mês à frente não entra: não há o que mostrar.
    // Ano anterior também não, senão a lista cresce pra sempre; a exceção é o mês
    // escolhido, pra um link antigo continuar abrindo e dar como voltar.
    const dAgora = new Date(agora);
    const ano = String(dAgora.getUTCFullYear());
    const doAno = [];
    for (let m = dAgora.getUTCMonth() + 1; m >= 1; m -= 1) {
      doAno.push(ano + '-' + String(m).padStart(2, '0'));
    }
    const listaMeses = doAno.includes(escolhido) ? doAno : doAno.concat(escolhido);
    // O comparativo continua só com os meses que têm entrega: barra de mês vazio
    // exigiria inventar registro, e o que falta já se lê pela ausência.
    const mesesDoAno = meses.filter((m) => m.mes.slice(0, 4) === ano);
    const temPrazoVivo = b.prazos.atrasados.length + b.prazos.esteMes.length
      + b.prazos.proximoMes.length + b.prazos.depois.length > 0;
    // Épico em aberto sozinho não conta como conteúdo: Por frente só mostra
    // iniciativa com entrega, andamento ou trava, então um documento só de
    // iniciativa parada não teria nada pra mostrar.
    if (!mesAlvo && !fechado && !b.execucao.length && !b.travados.length && !meses.length && !temPrazoVivo) {
      return { vazio: true, meses: listaMeses, html: '<p class="mudo">Nada registrado ainda para este escopo.</p>' };
    }

    // Um item travado e atrasado responde às duas perguntas do core. Num
    // documento, porém, aparecer duas vezes lado a lado parece defeito: ele fica
    // em "Depende de decisão", com o prazo na linha, e sai de "Próximos passos".
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
    // Por frente: no mês fechado só o histórico entra (entregou); execução,
    // travas, marcos e fila são leitura de agora e ficariam mentindo sobre julho.
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

    // Cada cartão carrega o rótulo junto com o texto — sem isso os quatro
    // cartões viram prosa idêntica e o leitor tem que ler os quatro pra achar
    // qual responde o quê. `alerta` pinta o rótulo do cartão que pede atenção,
    // sem ícone nem número: só o mesmo acento que "Já passou do prazo" já usa.
    const cartoesResumo = (fechado ? [
      { rotulo: 'Volume', texto: mesAlvo ? paragrafoVolume(mesAlvo) : 'Nada foi concluído neste mês.' },
      { rotulo: 'Onde caiu o esforço', html: mesAlvo ? corpoProdutos(mesAlvo) : '' },
    ] : [
      { rotulo: 'Volume', texto: mesAlvo ? paragrafoVolume(mesAlvo) : 'Nada foi concluído neste mês até agora.' },
      { rotulo: 'Onde caiu o esforço', html: mesAlvo ? corpoProdutos(mesAlvo) : '' },
      { rotulo: 'Em curso', texto: paragrafoEmCurso(bVivo, b.prazos.atrasados.length) },
      // Triagem de risco sobre bVivo (sem o travado): o travado atrasado já é
      // contado à parte na mesma frase e vai em Decisão. Somar os dois aqui faria
      // o card dizer "2 já passaram do prazo" e listar frentes com 3.
      { rotulo: 'Atenção', alerta: true, texto: paragrafoAtencao(bVivo, travadosVencidos, frentesEmRisco(bVivo.prazos.atrasados, mapa)) },
    ]).filter((c) => c.texto || c.html);

    const meta = [];
    if (escopo) meta.push('P.O responsável: ' + escopo);
    if (o.unidade) meta.push(o.unidade);

    const tiles = tile(entregas.length, entregas.length === 1 ? 'entrega' : 'entregas')
      + tile(comProduto.length, comProduto.length === 1 ? 'produto' : 'produtos')
      // "Fora do prazo" é pergunta de prazo, não de fluxo: um item travado com
      // prazo estourado CONTA — senão a capa diz "0" e a seção Decisão mostra
      // "atrasado desde...", o documento se contradizendo na mesma página.
      + (fechado ? '' : tile(b.execucao.length, 'em execução') + tile(b.prazos.atrasados.length, 'fora do prazo', true));

    const secoes = [];
    secoes.push({
      id: 'resumo', titulo: 'Resumo', rotulo: 'Resumo',
      intro: 'O que o mês registrou. Nenhuma afirmação aqui vai além do que os dados mostram.',
      // Um cartão por parágrafo, lado a lado: cada um responde uma pergunta
      // diferente (volume, onde caiu, o que flui, o que trava). No mês corrente são
      // até 4 — o grid fecha 2×2 e nenhum card vira paredão. Num bloco só, viravam
      // massa de texto. O auto-fit acomoda também os 2 do mês fechado.
      corpo: `<div class="resumo-cartoes">${cartoesResumo
        .map((c) => `<article class="resumo-cartao${c.alerta ? ' resumo-cartao-alerta' : ''}"><p class="cartao-rotulo">${esc(c.rotulo)}</p>${c.html || `<p>${c.texto}</p>`}</article>`).join('')}</div>`,
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
        // A variação de cada mês continua sendo contra o mês anterior de verdade,
        // mesmo quando ele é de dezembro do ano passado e não aparece na lista.
        corpo: corpoComparativo(mesesDoAno, escolhido),
      });
    }
    if (fechado) {
      secoes.push({
        id: 'agora', titulo: 'Situação de hoje', rotulo: 'Hoje',
        intro: 'Execução, prazos e travas aparecem só no mês corrente.',
        corpo: `<p class="mudo nota-report">Execução, prazos e travas são a leitura de hoje, não o estado
        que cada item tinha em ${esc(mesPorExtenso(escolhido).toLowerCase())}. Para ver o que está em curso,
        troque para o mês corrente no seletor do topo.</p>`,
      });
    } else {
      if (b.travados.length) {
        secoes.push({
          id: 'decisao', titulo: 'Depende de decisão', rotulo: 'Decisão',
          intro: 'Itens marcados como bloqueados ou em espera. O quadro mostra o que está parado e de quem depende cada destrave.',
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

    // Roadmap não é do mês escolhido — é o plano à frente, independente do
    // seletor. Por isso fica fora do if/else de fechado: aparece do mesmo
    // jeito em qualquer mês, sempre que houver iniciativa pra mostrar.
    const roadmapItens = o.roadmap || [];
    if (roadmapItens.length) {
      secoes.push({
        id: 'roadmap', titulo: 'Roadmap', rotulo: 'Roadmap',
        intro: 'O planejamento à frente, por trimestre — o horizonte mais longo do documento.',
        corpo: corpoRoadmap(roadmapItens, agora),
      });
    }

    // O mês é eixo do documento, não controle de ferramenta: mora na própria
    // navegação, na ponta direita — como no report do time. Serve o PO e o
    // stakeholder pela mesma peça. Um mês só não é escolha: não desenha.
    // doc-mes-borda é a mesma técnica de borda em gradiente da nav (padding +
    // fundo em gradiente, sem "border" de verdade), só que na versão do
    // seletor de mês — o select por dentro é só o preenchimento cinza.
    const seletorMes = listaMeses.length > 1
      ? `<div class="doc-mes-borda"><select id="mes-global" class="doc-mes" aria-label="Mês do report" title="Mês do report">${listaMeses
        .map((m) => `<option value="${esc(m)}"${m === escolhido ? ' selected' : ''}>${esc(mesPorExtenso(m))}</option>`)
        .join('')}</select></div>`
      : '';
    // doc-nav-borda é só a borda em gradiente (técnica: padding de 2px +
    // fundo em gradiente, sem "border" de verdade) — doc-nav-int é o vidro
    // (fundo + blur) por dentro dela. Duas camadas, como na referência.
    const nav = `<nav class="doc-nav" aria-label="Seções do report"><div class="doc-nav-borda"><div class="doc-nav-int">${secoes
      .map((x) => `<a href="#${x.id}">${esc(x.rotulo)}</a>`).join('')}${seletorMes}</div></div></nav>`;

    const html = `<div class="report-doc">
      ${capa(escolhido, meta.join(' · '), tiles)}
      ${nav}
      ${secoes.map((x) => secaoHtml(x)).join('')}
      ${rodape()}
    </div>`;

    return { vazio: false, meses: listaMeses, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
