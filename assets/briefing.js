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

  const ROTULO_CURTO = { epic: 'Épico', feature: 'Feature', pbi: 'PBI', bug: 'Bug', task: 'Task', outro: 'Item' };

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

  // ---- Peças ----
  // `chave` é o produto do item; os data-* alimentam o filtro do bloco de
  // entregas — quem filtra é o report.js, escondendo linha, sem redesenhar nada.
  // Sem link pro DevOps: o stakeholder não tem acesso, e mandar ele pra uma tela
  // de login é pior que não oferecer nada. O número do item fica como texto —
  // serve pra quem tem acesso procurar lá dentro.
  function linha(it, direita, titulo, chave) {
    const f = it.fields || {};
    const slug = C.typeSlug(f['System.WorkItemType']);
    const nome = f['System.Title'] || ('item #' + it.id);
    const dados = ` data-tipo="${slug}" data-produto="${chave || 'sem'}" data-busca="${esc((nome + ' #' + it.id).toLowerCase())}"`;
    return `<li${dados}><div class="item-linha">
      <span class="badge-tipo tipo-${slug}">${ROTULO_CURTO[slug]}</span>
      <span class="titulo">${esc(nome)}</span>
      <span class="quando"${titulo ? ` title="${esc(titulo)}"` : ''}>${direita || ''}</span>
      <span class="id">#${it.id}</span>
    </div></li>`;
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

  // O produto não era clicável nem dizia o que era — só um texto em negrito.
  // Aqui ele aparece como item de verdade: selo do nível, link pro DevOps e,
  // quando existe, estado e prazo. É o épico ganhando corpo no report.
  function cabecalhoProduto(p, extra) {
    if (!p) return `<h3 class="cab-produto"><span class="cab-sem">${SEM_PRODUTO}</span></h3>`;
    const slug = C.typeSlug(p.tipo);
    const partes = [extra || p.estado];
    // Prazo de item já concluído é ruído: o que importa é quando fechou.
    if (p.alvo && !C.isTerminalState(p.estado)) partes.push('prazo ' + dataCurta(p.alvo));
    const detalhe = partes.filter(Boolean).join(' · ');
    return `<h3 class="cab-produto">
      <span class="badge-tipo tipo-${slug}">${ROTULO_CURTO[slug]}</span>
      <span class="cab-nome">${esc(p.titulo)}</span>
      ${detalhe ? `<span class="cab-detalhe">${esc(detalhe)}</span>` : ''}
    </h3>`;
  }

  const chaveDe = (p) => (p ? 'p' + p.id : 'sem');

  function grupoHtml(g, direita) {
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
    return `<div class="grupo-produto" data-produto="${chave}"${dadosProprio}>
      ${cabecalhoProduto(g.produto, proprio ? direita(proprio) : '')}
      ${linhas.length ? `<ul class="lista-linhas">${linhas.map((r) => linha(r.item || r, direita(r), '', chave)).join('')}</ul>` : ''}
    </div>`;
  }

  // ---- Prosa ----
  // Derivada dos fatos. No Radar era escrita à mão; aqui nada afirma o que os
  // dados não mostram.
  function paragrafoVolume(m, escopo) {
    const n = m.porNivel;
    const r = m.resumo || {};
    const niveis = [];
    if (n.epic) niveis.push(plural(n.epic, 'épico', 'épicos'));
    if (n.feature) niveis.push(plural(n.feature, 'feature', 'features'));
    if (n.pbi) niveis.push(n.pbi + ' PBI' + (n.pbi > 1 ? 's' : ''));
    const deQuem = escopo ? ` no nome de <b>${esc(escopo)}</b>` : '';
    const frases = [`Em ${mesPorExtenso(m.mes).toLowerCase()}, <b>${plural(m.total, 'item', 'itens')}</b>${deQuem} ${m.total === 1 ? 'foi concluído' : 'foram concluídos'} — ${niveis.join(', ')}.`];
    if (r.delta === null || r.delta === undefined) {
      frases.push('É o registro mais antigo que o DevOps guarda para este recorte.');
    } else if (r.delta > 0) {
      frases.push(`São <b>${r.delta} a mais</b> que em ${mesPorExtenso(r.mesAnterior).toLowerCase()}.`);
    } else if (r.delta < 0) {
      frases.push(`São <b>${-r.delta} a menos</b> que em ${mesPorExtenso(r.mesAnterior).toLowerCase()}.`);
    } else {
      frases.push(`Mesmo volume de ${mesPorExtenso(r.mesAnterior).toLowerCase()}.`);
    }
    return frases.join(' ');
  }

  function paragrafoProdutos(m) {
    const prods = (m.resumo || {}).produtos || [];
    const fech = (m.resumo || {}).epicosFechados || [];
    const frases = [];
    if (prods.length === 1) {
      frases.push(`Todo o esforço caiu em <b>${esc(prods[0].titulo)}</b>.`);
    } else if (prods.length > 1) {
      const topo = prods.slice(0, 3).map((p) => `<b>${esc(p.titulo)}</b> (${p.n})`);
      const resto = prods.length - topo.length;
      frases.push(`O esforço se distribuiu em ${plural(prods.length, 'produto', 'produtos')}: ${topo.join(', ')}${resto > 0 ? `, e outros ${resto}` : ''}.`);
    }
    if (fech.length === 1) {
      frases.push(`<b>${esc(fech[0].titulo)}</b> fechou por completo.`);
    } else if (fech.length > 1) {
      frases.push(`${plural(fech.length, 'épico fechou', 'épicos fecharam')} por completo: ${fech.map((e) => `<b>${esc(e.titulo)}</b>`).join(', ')}.`);
    }
    return frases.join(' ');
  }

  function paragrafoSituacao(b) {
    const frases = [];
    if (b.execucao.length) frases.push(`<b>${plural(b.execucao.length, 'item', 'itens')}</b> em execução agora.`);
    const p = b.prazos;
    const prazo = [];
    if (p.atrasados.length) prazo.push(`<b>${p.atrasados.length} ${p.atrasados.length === 1 ? 'já passou' : 'já passaram'} do prazo</b>`);
    if (p.esteMes.length) prazo.push(`${p.esteMes.length} ${p.esteMes.length === 1 ? 'vence' : 'vencem'} ainda este mês`);
    if (p.proximoMes.length) prazo.push(`${p.proximoMes.length} no mês que vem`);
    if (prazo.length) frases.push('Nos prazos: ' + prazo.join(', ') + '.');
    if (b.travados.length) {
      const velho = b.travados[0];
      const tempo = velho.dias == null ? '' : ` — o mais antigo sem movimento há ${velho.dias} ${velho.dias === 1 ? 'dia' : 'dias'}`;
      frases.push(`<b>${plural(b.travados.length, 'item está travado', 'itens estão travados')}</b>${tempo}. ${b.travados.length === 1 ? 'É o ponto' : 'São os pontos'} que dependem de decisão.`);
    }
    return frases.join(' ');
  }

  // Data de conclusão em branco no DevOps: uso a última alteração e marco com ~.
  // Quem lê tem que saber quando a data é aproximada.
  function notaAproximados(m) {
    if (!m || !m.aproximados) return '';
    const n = m.aproximados;
    return `<p class="mudo nota-report">${n} ${n > 1 ? 'itens sem data de conclusão' : 'item sem data de conclusão'} registrada no DevOps — para ${n > 1 ? 'esses' : 'esse'} usei a data da última alteração, marcada com ~.</p>`;
  }

  // ---- Documento ----
  // A estrutura é a do Relatório Mensal de Tecnologia da Ybera: capa escura com
  // os números do ciclo, navegação em pílulas, seções numeradas com rótulo em
  // inglês por cima do título. O que aquele report escreve à mão — BVS, narrativa
  // de impacto, vídeo da entrega — não existe aqui: cada número abaixo sai dos
  // itens do DevOps, e o que os dados não sustentam não é afirmado.
  const CAMPO_ALVO = 'Microsoft.VSTS.Scheduling.TargetDate';
  const DESTAQUES = 3;
  const MESES_COMPARATIVO = 12;
  // Destaque só faz sentido quando há de onde destacar: com um produto ou meia
  // dúzia de itens, a seção seria a de entregas repetida.
  const MIN_DESTAQUE_PRODUTOS = 2;
  const MIN_DESTAQUE_ITENS = 4;

  function tile(n, rotulo, alerta) {
    return `<li${alerta && n ? ' class="kpi-alerta"' : ''}><b>${n}</b><span>${esc(rotulo)}</span></li>`;
  }

  function capa(escolhido, meta, tiles) {
    return `<header class="doc-capa">
      <div class="doc-limite">
        <p class="doc-en doc-en-capa">Monthly report</p>
        <h1 class="doc-titulo"><span>Relatório de</span><b>${mesPorExtenso(escolhido)}</b></h1>
        <p class="doc-meta">${esc(meta)}</p>
        ${tiles ? `<ul class="doc-kpis">${tiles}</ul>` : ''}
      </div>
    </header>`;
  }

  // Título e a frase que o explica, um embaixo do outro. Sem numeral gigante ao
  // fundo e sem rótulo em inglês: eram enfeite do report do time, e aqui só
  // competiam com o que a seção tem pra dizer.
  function secaoHtml(s) {
    return `<section class="doc-sec" id="${s.id}">
      <div class="doc-limite">
        <div class="doc-sec-topo">
          <h2>${esc(s.titulo)}</h2>
          <p class="doc-intro">${esc(s.intro)}</p>
        </div>
        ${s.corpo}
      </div>
    </section>`;
  }

  // Destaques: os produtos que concentraram entrega no mês. Sem BVS pra ranquear,
  // o critério é volume — e o report diz que é volume, não valor.
  function corpoDestaques(grupos) {
    return grupos.slice(0, DESTAQUES).map((g, i) => {
      const slug = C.typeSlug(g.produto.tipo);
      const proprio = g.itens.find((r) => (r.item || r).id === g.produto.id);
      const linhas = g.itens.filter((r) => r !== proprio);
      return `<article class="destaque">
        <header class="destaque-topo">
          <span class="destaque-pos">${i + 1}</span>
          <div class="destaque-nome">
            <h3>${esc(g.produto.titulo)}</h3>
            <p><span class="badge-tipo tipo-${slug}">${ROTULO_CURTO[slug]}</span> ${plural(g.itens.length, 'entrega no mês', 'entregas no mês')}${g.produto.estado ? ' · ' + esc(g.produto.estado) : ''}</p>
          </div>
        </header>
        ${linhas.length ? `<ul class="lista-linhas">${linhas.map((r) => linha(r.item || r, (r.aproximada ? '~' : '') + dataCurta(r.quando))).join('')}</ul>` : ''}
      </article>`;
    }).join('');
  }

  // Entregas: tudo do mês, agrupado por produto, com chips e busca. Os chips e o
  // contador são estáticos aqui; quem esconde linha é o report.js.
  function corpoEntregas(regs, mapa) {
    const grupos = porProduto(regs, mapa);
    const tipos = new Map();
    for (const r of regs) {
      const slug = C.typeSlug(((r.item || r).fields || {})['System.WorkItemType']);
      tipos.set(slug, (tipos.get(slug) || 0) + 1);
    }
    const chip = (filtro, valor, rotulo, n) =>
      `<button type="button" class="chip-doc" data-filtro="${filtro}" data-valor="${esc(valor)}">${esc(rotulo)} <span class="n">${n}</span></button>`;
    const chips = grupos.map((g) => chip('produto', chaveDe(g.produto), nomeProduto(g.produto), g.itens.length)).join('')
      + [...tipos.entries()].map(([slug, n]) => chip('tipo', slug, ROTULO_CURTO[slug], n)).join('');
    const lista = grupos.map((g) => grupoHtml(g, (r) => (r.aproximada ? '~' : '') + dataCurta(r.quando))).join('');
    return `<div class="doc-filtros">
      <input id="busca-entregas" type="search" placeholder="buscar por título ou #id" autocomplete="off">
      <div class="chips-doc">${chips}</div>
      <button type="button" class="limpar-doc" id="limpar-entregas" hidden>limpar</button>
      <span class="conta-doc" id="conta-entregas">${regs.length} de ${regs.length}</span>
    </div>
    <div class="doc-lista doc-bloco" id="lista-entregas">${lista}</div>`;
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
        <span class="comp-delta${classe}" title="contra o mês anterior deste recorte">${sinal}</span>
      </li>`;
    }).join('')}</ol>
    <p class="mudo nota-report">Volume de entregas por mês neste recorte. A coluna da
    direita compara com o mês anterior. Não é medida de valor — é contagem de itens concluídos.</p>`;
  }

  // O item travado sai de "Próximos passos" pra não aparecer duas vezes no mesmo
  // documento. Em troca, o prazo dele vem pra cá: quem lê precisa saber que,
  // além de parado, já passou da data.
  function corpoDecisao(travados, agora) {
    const hoje = new Date(agora);
    const direita = (r) => {
      const partes = [];
      const alvo = (r.item.fields || {})[CAMPO_ALVO];
      if (alvo) partes.push((Date.parse(alvo) < hoje.getTime() ? 'atrasado desde ' : 'prazo ') + dataCurta(alvo));
      if (r.dias != null) partes.push(`parado há ${r.dias} d`);
      if (!partes.length) partes.push(esc((r.item.fields || {})['System.State']));
      return partes.join(' · ');
    };
    return `<div class="doc-bloco"><div class="grupo-produto"><ul class="lista-linhas">${
      travados.map((r) => linha(r.item, direita(r))).join('')}</ul></div></div>`;
  }

  function corpoProximos(b) {
    const bloco = (titulo, regs, alerta, direita) => regs.length ? `
      <div class="grupo-produto">
        <h3${alerta ? ' class="rotulo-alerta"' : ''}>${titulo}</h3>
        <ul class="lista-linhas">${regs.map((r) => linha(r.item, direita(r))).join('')}</ul>
      </div>` : '';
    const semPrazo = b.execucao.filter((r) => !(r.item.fields || {})[CAMPO_ALVO]);
    return '<div class="doc-bloco">'
      + bloco('Já passou do prazo', b.prazos.atrasados, true, (r) => dataCurta(r.alvo))
      + bloco('Vence ainda este mês', b.prazos.esteMes, false, (r) => dataCurta(r.alvo))
      + bloco('Vence no mês que vem', b.prazos.proximoMes, false, (r) => dataCurta(r.alvo))
      + bloco('Em curso, sem prazo definido', semPrazo, false, (r) => esc((r.item.fields || {})['System.State']))
      + '</div>';
  }

  // ---- Entrada ----
  // opcoes: { items, agora, escopo, times, todos, mes }
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
    const mapa = C.mapaDeProdutos(o.todos || items);
    const meses = C.resumoMensal(C.reportPorMes(items), mapa);
    const b = C.briefingDoMes(items, agora);
    const escolhido = o.mes || b.mes;
    const fechado = escolhido !== b.mes; // mês que já passou
    const mesAlvo = meses.find((m) => m.mes === escolhido) || null;
    // Seletor: todo mês com entrega, mais o corrente (que pode estar vazio)
    const listaMeses = [...new Set([b.mes, ...meses.map((m) => m.mes)])].sort().reverse();
    if (!mesAlvo && !fechado && !b.execucao.length && !b.travados.length && !meses.length) {
      return { vazio: true, meses: listaMeses, html: '<p class="mudo">Nada registrado ainda para este recorte.</p>' };
    }

    // Um item travado e atrasado responde às duas perguntas do core. Num
    // documento, porém, aparecer duas vezes lado a lado parece defeito: ele fica
    // em "Depende de decisão", com o prazo na linha, e sai de "Próximos passos".
    const idsTravados = new Set(b.travados.map((r) => r.item.id));
    const semTravados = (regs) => regs.filter((r) => !idsTravados.has(r.item.id));
    const bVivo = Object.assign({}, b, {
      prazos: {
        atrasados: semTravados(b.prazos.atrasados),
        esteMes: semTravados(b.prazos.esteMes),
        proximoMes: semTravados(b.prazos.proximoMes),
      },
    });

    const entregas = (mesAlvo && mesAlvo.itens) || [];
    const grupos = porProduto(entregas, mapa);
    const comProduto = grupos.filter((g) => g.produto);

    const prosa = (fechado ? [
      mesAlvo ? paragrafoVolume(mesAlvo, escopo) : 'Nada foi concluído neste mês.',
      mesAlvo ? paragrafoProdutos(mesAlvo) : '',
    ] : [
      mesAlvo ? paragrafoVolume(mesAlvo, escopo) : 'Nada foi concluído neste mês até agora.',
      mesAlvo ? paragrafoProdutos(mesAlvo) : '',
      paragrafoSituacao(bVivo),
    ]).filter(Boolean);

    const meta = [];
    if (escopo) meta.push('recorte: ' + escopo);
    if (o.times && o.times.length) meta.push(o.times.join(', '));
    meta.push('gerado em ' + dataCurta(agora));

    const tiles = tile(entregas.length, entregas.length === 1 ? 'entrega' : 'entregas')
      + tile(comProduto.length, comProduto.length === 1 ? 'produto' : 'produtos')
      + (fechado ? '' : tile(b.execucao.length, 'em execução') + tile(bVivo.prazos.atrasados.length, 'fora do prazo', true));

    const secoes = [];
    secoes.push({
      id: 'resumo', titulo: 'Resumo', rotulo: 'Resumo',
      intro: 'O que o mês registrou, lido dos itens do Azure DevOps. Nenhuma afirmação aqui vai além do que os dados mostram.',
      // Um cartão por parágrafo, lado a lado: cada um responde uma pergunta
      // diferente (volume, onde caiu, situação). Num bloco só, viravam massa de
      // texto. A prosa tem no máximo 3 parágrafos, então a linha nunca passa de 3.
      corpo: `<div class="resumo-cartoes">${prosa
        .map((x) => `<article class="resumo-cartao"><p>${x}</p></article>`).join('')}</div>`,
    });
    if (comProduto.length >= MIN_DESTAQUE_PRODUTOS && entregas.length >= MIN_DESTAQUE_ITENS) {
      secoes.push({
        id: 'destaques', titulo: 'Destaques', rotulo: 'Destaques',
        intro: 'Os produtos que concentraram entrega no mês, do maior volume para o menor. O critério é quantidade de itens concluídos.',
        corpo: corpoDestaques(comProduto),
      });
    }
    if (entregas.length) {
      secoes.push({
        id: 'entregas', titulo: 'Entregas do mês', rotulo: 'Entregas',
        intro: 'Tudo que foi concluído no mês, agrupado por produto. Filtre por produto ou tipo, ou busque por título e número do item.',
        corpo: corpoEntregas(entregas, mapa) + notaAproximados(mesAlvo),
      });
    }
    if (meses.length > 1) {
      secoes.push({
        id: 'comparativo', titulo: 'Comparativo', rotulo: 'Comparativo',
        intro: 'Volume de entregas mês a mês, no que o DevOps guarda deste recorte.',
        corpo: corpoComparativo(meses, escolhido),
      });
    }
    if (fechado) {
      secoes.push({
        id: 'agora', titulo: 'Situação de hoje', rotulo: 'Hoje',
        intro: 'Execução, prazos e travas aparecem só no mês corrente.',
        corpo: `<p class="mudo nota-report">O DevOps guarda o estado de agora, não o estado
        que cada item tinha em ${mesPorExtenso(escolhido).toLowerCase()}. Para ver o que está em curso,
        troque para o mês corrente no seletor do topo.</p>`,
      });
    } else {
      if (b.travados.length) {
        secoes.push({
          id: 'decisao', titulo: 'Depende de decisão', rotulo: 'Decisão',
          intro: 'Itens em estado de bloqueio. Cada um espera uma decisão para voltar a andar.',
          corpo: corpoDecisao(b.travados, agora),
        });
      }
      const totalProximos = bVivo.prazos.atrasados.length + bVivo.prazos.esteMes.length
        + bVivo.prazos.proximoMes.length + b.execucao.length;
      if (totalProximos) {
        secoes.push({
          id: 'proximos', titulo: 'Próximos passos', rotulo: 'Próximos',
          intro: 'O que está em curso e quando vence, do prazo mais apertado para o mais folgado.',
          corpo: corpoProximos(bVivo),
        });
      }
    }

    // O mês é eixo do documento, não controle de ferramenta: mora na própria
    // navegação, na ponta direita — como no report do time. Serve o PO e o
    // stakeholder pela mesma peça. Um mês só não é escolha: não desenha.
    const seletorMes = listaMeses.length > 1
      ? `<select id="mes-global" class="doc-mes" title="Mês do report">${listaMeses
        .map((m) => `<option value="${m}"${m === escolhido ? ' selected' : ''}>${mesPorExtenso(m)}</option>`)
        .join('')}</select>`
      : '';
    const nav = `<nav class="doc-nav"><div class="doc-nav-int">${secoes
      .map((x) => `<a href="#${x.id}">${esc(x.rotulo)}</a>`).join('')}${seletorMes}</div></nav>`;

    const html = `<div class="report-doc">
      ${capa(escolhido, meta.join(' · '), tiles)}
      ${nav}
      ${secoes.map((x) => secaoHtml(x)).join('')}
    </div>`;

    return { vazio: false, meses: listaMeses, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
