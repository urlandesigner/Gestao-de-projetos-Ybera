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

  // Agrupa por produto (épico ancestral): stakeholder pensa em produto, não em
  // item solto. Mais itens na frente; sem épico conhecido por último.
  function porProduto(registros, mapa) {
    const grupos = new Map();
    for (const r of registros) {
      const it = r.item || r;
      const ep = mapa.get(it.id);
      const chave = ep ? ep.titulo : 'Sem produto associado';
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(r);
    }
    return [...grupos.entries()]
      .map(([produto, itens]) => ({ produto, itens }))
      .sort((a, b) => (b.itens.length - a.itens.length) || (a.produto < b.produto ? -1 : 1));
  }

  function secaoPorProduto(titulo, registros, mapa, org, direita) {
    if (!registros.length) return '';
    const grupos = porProduto(registros, mapa).map((g) => `
      <div class="grupo-produto">
        <h5>${esc(g.produto)}</h5>
        <ul class="lista-linhas">${g.itens.map((r) => linha(r.item || r, org, direita(r))).join('')}</ul>
      </div>`).join('');
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

  // ---- Mês do histórico (recolhido) ----
  function htmlMesAnterior(m, escopo, org) {
    const n = m.porNivel;
    const partes = [];
    if (n.epic) partes.push(n.epic + (n.epic > 1 ? ' épicos' : ' épico'));
    if (n.feature) partes.push(n.feature + (n.feature > 1 ? ' features' : ' feature'));
    if (n.pbi) partes.push(n.pbi + ' PBI' + (n.pbi > 1 ? 's' : ''));
    const nota = m.aproximados
      ? `<p class="mudo nota-report">${m.aproximados} ${m.aproximados > 1 ? 'itens sem data de conclusão' : 'item sem data de conclusão'} registrada no DevOps — para ${m.aproximados > 1 ? 'esses' : 'esse'} usei a data da última alteração, marcada com ~.</p>`
      : '';
    const linhas = m.itens.map(({ item, quando, aproximada }) => linha(
      item, org,
      (aproximada ? '~' : '') + dataCurta(quando),
      aproximada ? 'data aproximada — sem data de conclusão no DevOps' : ''
    )).join('');
    const prosa = [paragrafoVolume(m, escopo), paragrafoProdutos(m)].filter(Boolean);
    return `<details class="mes">
      <summary><span class="mes-nome">${mesPorExtenso(m.mes)}</span><span class="mes-resumo">${m.total} ${m.total > 1 ? 'itens' : 'item'}${partes.length ? ' · ' + partes.join(' · ') : ''}</span></summary>
      <div class="comunicado">${prosa.map((p) => `<p>${p}</p>`).join('')}</div>${nota}
      <p class="sub-lista">Itens concluídos</p>
      <ul class="lista-linhas">${linhas}</ul>
    </details>`;
  }

  // ---- Entrada ----
  // opcoes: { items, agora, org, escopo, times, todos }
  // `items` é o recorte que aparece no report. `todos` é o conjunto inteiro
  // consultado, usado SÓ pra descobrir o produto de cada item: a cadeia
  // PBI → Feature → Épico só se monta se os pais estiverem presentes, e o pai
  // costuma estar em outro nome (ou sem ninguém). Sem isso, filtrar por
  // responsável jogava todo mundo em "Sem produto associado".
  // Devolve { vazio, html } — quem chama decide o que fazer com o vazio.
  function htmlReport(opcoes) {
    const o = opcoes || {};
    const items = o.items || [];
    const agora = o.agora || Date.now();
    const org = o.org || '';
    const escopo = o.escopo || '';
    const mapa = C.mapaDeProdutos(o.todos || items);
    const meses = C.resumoMensal(C.reportPorMes(items), mapa);
    const b = C.briefingDoMes(items, agora);
    const mesAtual = meses.find((m) => m.mes === b.mes) || null;
    const anteriores = meses.filter((m) => m.mes !== b.mes);
    if (!mesAtual && !b.execucao.length && !b.travados.length && !anteriores.length) {
      return { vazio: true, html: '<p class="mudo">Nada registrado ainda para este recorte.</p>' };
    }

    const prosa = [
      mesAtual ? paragrafoVolume(mesAtual, escopo) : 'Nada foi concluído neste mês até agora.',
      mesAtual ? paragrafoProdutos(mesAtual) : '',
      paragrafoSituacao(b),
    ].filter(Boolean);

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

    const html = `<article class="briefing">
      <header class="briefing-topo">
        <h3>${mesPorExtenso(b.mes)}</h3>
        <p class="briefing-meta">${esc(meta.join(' · '))}</p>
      </header>
      <section class="bloco-report"><h4>Resumo</h4>
        <div class="comunicado">${prosa.map((p) => `<p>${p}</p>`).join('')}</div>
      </section>
      ${secaoPorProduto('Entregue no mês', (mesAtual && mesAtual.itens) || [], mapa, org, (r) => (r.aproximada ? '~' : '') + dataCurta(r.quando))}
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
      </section>` : ''}
    </article>
    ${anteriores.length ? `<section class="bloco-report historico">
      <h4>Meses anteriores</h4>
      ${anteriores.map((m) => htmlMesAnterior(m, escopo, org)).join('')}
    </section>` : ''}`;

    return { vazio: false, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
