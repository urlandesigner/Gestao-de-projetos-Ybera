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
  function linha(it, org, direita, titulo) {
    const f = it.fields || {};
    const slug = C.typeSlug(f['System.WorkItemType']);
    const url = C.deepLinks(org, it.projeto || '', '').workItem(it.id);
    return `<li><a href="${url}" target="_blank" rel="noopener">
      <span class="badge-tipo tipo-${slug}">${ROTULO_CURTO[slug]}</span>
      <span class="titulo">${esc(f['System.Title'] || ('item #' + it.id))}</span>
      <span class="quando"${titulo ? ` title="${esc(titulo)}"` : ''}>${direita || ''}</span>
      <span class="id">#${it.id}</span>
    </a></li>`;
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
  function cabecalhoProduto(p, org, extra) {
    if (!p) return `<h5 class="cab-produto"><span class="cab-sem">${SEM_PRODUTO}</span></h5>`;
    const slug = C.typeSlug(p.tipo);
    const url = C.deepLinks(org, p.projeto || '', '').workItem(p.id);
    const partes = [extra || p.estado];
    // Prazo de item já concluído é ruído: o que importa é quando fechou.
    if (p.alvo && !C.isTerminalState(p.estado)) partes.push('prazo ' + dataCurta(p.alvo));
    const detalhe = partes.filter(Boolean).join(' · ');
    return `<h5 class="cab-produto">
      <span class="badge-tipo tipo-${slug}">${ROTULO_CURTO[slug]}</span>
      <a href="${url}" target="_blank" rel="noopener">${esc(p.titulo)}</a>
      ${detalhe ? `<span class="cab-detalhe">${esc(detalhe)}</span>` : ''}
    </h5>`;
  }

  function secaoPorProduto(titulo, registros, mapa, org, direita) {
    if (!registros.length) return '';
    const grupos = porProduto(registros, mapa).map((g) => {
      // Um épico é o produto de si mesmo. Ele já é o cabeçalho — repetir a mesma
      // linha embaixo parece defeito. O que a linha diria vai pro cabeçalho.
      const proprio = g.produto ? g.itens.find((r) => (r.item || r).id === g.produto.id) : null;
      const linhas = g.itens.filter((r) => r !== proprio);
      return `
      <div class="grupo-produto">
        ${cabecalhoProduto(g.produto, org, proprio ? direita(proprio) : '')}
        ${linhas.length ? `<ul class="lista-linhas">${linhas.map((r) => linha(r.item || r, org, direita(r))).join('')}</ul>` : ''}
      </div>`;
    }).join('');
    return `<section class="bloco-report"><h4>${titulo}<span class="conta">${registros.length}</span></h4>${grupos}</section>`;
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

  // ---- Entrada ----
  // opcoes: { items, agora, org, escopo, times, todos, mes }
  // `items` é o recorte que aparece no report. `todos` é o conjunto inteiro
  // consultado, usado SÓ pra descobrir o produto de cada item: a cadeia
  // PBI → Feature → Épico só se monta se os pais estiverem presentes, e o pai
  // costuma estar em outro nome (ou sem ninguém). Sem isso, filtrar por
  // responsável jogava todo mundo em "Sem produto associado".
  // `mes` ('2026-07') escolhe o mês do report; sem ele, o mês corrente. Mês
  // fechado mostra só o que é fato histórico: o que foi entregue. Execução,
  // prazos e travas são o AGORA — o DevOps guarda o estado atual, não o estado
  // que o item tinha em julho, e afirmar isso seria mentira.
  // Devolve { vazio, html, meses } — `meses` alimenta o seletor de quem chama.
  function htmlReport(opcoes) {
    const o = opcoes || {};
    const items = o.items || [];
    const agora = o.agora || Date.now();
    const org = o.org || '';
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

    const prosa = (fechado ? [
      mesAlvo ? paragrafoVolume(mesAlvo, escopo) : 'Nada foi concluído neste mês.',
      mesAlvo ? paragrafoProdutos(mesAlvo) : '',
    ] : [
      mesAlvo ? paragrafoVolume(mesAlvo, escopo) : 'Nada foi concluído neste mês até agora.',
      mesAlvo ? paragrafoProdutos(mesAlvo) : '',
      paragrafoSituacao(b),
    ]).filter(Boolean);

    const meta = [];
    if (escopo) meta.push('recorte: ' + escopo);
    if (o.times && o.times.length) meta.push(o.times.join(', '));
    meta.push('gerado em ' + dataCurta(agora));

    const prazoLista = (titulo, regs, alerta) => regs.length ? `
      <div class="grupo-produto">
        <h5${alerta ? ' class="h5-alerta"' : ''}>${titulo}</h5>
        <ul class="lista-linhas">${regs.map((r) => linha(r.item, org, dataCurta(r.alvo))).join('')}</ul>
      </div>` : '';
    const totalPrazos = b.prazos.atrasados.length + b.prazos.esteMes.length + b.prazos.proximoMes.length;

    const agoraSo = `<section class="bloco-report"><h4>Em execução, prazos e travas</h4>
      <p class="mudo nota-report">Só aparecem no mês corrente: o DevOps guarda o estado
      de agora, não o estado que cada item tinha em ${mesPorExtenso(escolhido).toLowerCase()}.</p></section>`;

    const html = `<article class="briefing">
      <header class="briefing-topo">
        <h3>${mesPorExtenso(escolhido)}</h3>
        <p class="briefing-meta">${esc(meta.join(' · '))}</p>
      </header>
      <section class="bloco-report"><h4>Resumo</h4>
        <div class="comunicado">${prosa.map((p) => `<p>${p}</p>`).join('')}</div>
      </section>
      ${secaoPorProduto('Entregue no mês', (mesAlvo && mesAlvo.itens) || [], mapa, org, (r) => (r.aproximada ? '~' : '') + dataCurta(r.quando))}
      ${notaAproximados(mesAlvo)}
      ${fechado ? agoraSo : `
      ${secaoPorProduto('Em execução', b.execucao, mapa, org, (r) => esc((r.item.fields || {})['System.State']))}
      ${totalPrazos ? `<section class="bloco-report"><h4>Prazos<span class="conta">${totalPrazos}</span></h4>
        ${prazoLista('Já passaram do prazo', b.prazos.atrasados, true)}
        ${prazoLista('Vencem ainda este mês', b.prazos.esteMes)}
        ${prazoLista('Vencem no mês que vem', b.prazos.proximoMes)}
      </section>` : ''}
      ${b.travados.length ? `<section class="bloco-report"><h4>Travado — depende de decisão<span class="conta">${b.travados.length}</span></h4>
        <div class="grupo-produto"><ul class="lista-linhas">${b.travados.map((r) => linha(
          r.item, org,
          r.dias == null ? esc((r.item.fields || {})['System.State']) : `sem movimento há ${r.dias} d`
        )).join('')}</ul></div>
      </section>` : ''}`}
    </article>`;

    return { vazio: false, meses: listaMeses, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
