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

  // ---- Peças ----
  // `chave` é o produto do item; os data-* alimentam o filtro do bloco de
  // entregas — quem filtra é o report.js, escondendo linha, sem redesenhar nada.
  // Sem link pro DevOps: o stakeholder não tem acesso, e mandar ele pra uma tela
  // de login é pior que não oferecer nada. O número do item fica como texto —
  // serve pra quem tem acesso procurar lá dentro.
  function linha(it, direita, titulo, chave, extra) {
    const f = it.fields || {};
    const slug = C.typeSlug(f['System.WorkItemType']);
    const nome = f['System.Title'] || ('item #' + it.id);
    const dados = ` data-tipo="${slug}" data-produto="${esc(chave || 'sem')}" data-busca="${esc((nome + ' #' + it.id).toLowerCase())}"`;
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

  // O cabeçalho do grupo é o produto: nome à esquerda, estado/prazo no canto
  // direito, e — quando o produto tem descrição e filhos — o objetivo (o "e daí?"
  // do negócio) e a barra de rumo. Sem selo de tipo: "Épico"/"Feature" é jargão de
  // DevOps. `info` (objetivo + progresso) vem pronto pra não recontar no link.
  function cabecalhoProduto(p, extra, info) {
    if (!p) return `<div class="cab-produto"><h3 class="cab-nome"><span class="cab-sem">${SEM_PRODUTO}</span></h3></div>`;
    const partes = [extra || p.estado];
    // Prazo de item já concluído é ruído: o que importa é quando fechou.
    if (p.alvo && !C.isTerminalState(p.estado)) partes.push('prazo ' + dataCurta(p.alvo));
    const detalhe = partes.filter(Boolean).join(' · ');
    const objetivo = info && info.descricao
      ? `<p class="cab-objetivo">${esc(info.descricao)}</p>` : '';
    const rumo = info && info.total > 0 ? barraProgresso(info.feitos, info.total) : '';
    return `<div class="cab-produto">
      <div class="cab-topo">
        <h3 class="cab-nome">${esc(p.titulo)}</h3>
        ${detalhe ? `<span class="cab-detalhe">${esc(detalhe)}</span>` : ''}
      </div>
      ${objetivo}
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
  const NOME_TIPO = {
    epic: ['épico', 'épicos'], feature: ['feature', 'features'], pbi: ['PBI', 'PBIs'],
    bug: ['bug', 'bugs'], task: ['task', 'tasks'], outro: ['item de outro tipo', 'itens de outros tipos'],
  };
  function enumerar(partes) {
    if (partes.length <= 1) return partes.join('');
    return partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1];
  }

  function paragrafoVolume(m, escopo) {
    const r = m.resumo || {};
    const porTipo = new Map();
    for (const reg of m.itens || []) {
      const slug = C.typeSlug(((reg.item || {}).fields || {})['System.WorkItemType']);
      porTipo.set(slug, (porTipo.get(slug) || 0) + 1);
    }
    const ordem = ['epic', 'feature', 'pbi', 'bug', 'task', 'outro'];
    const niveis = ordem.filter((t) => porTipo.get(t))
      .map((t) => porTipo.get(t) + ' ' + NOME_TIPO[t][porTipo.get(t) > 1 ? 1 : 0]);
    const deQuem = escopo ? ` no nome de <b>${esc(escopo)}</b>` : '';
    const frases = [`Em ${mesPorExtenso(m.mes).toLowerCase()}, <b>${plural(m.total, 'item', 'itens')}</b>${deQuem} ${m.total === 1 ? 'foi concluído' : 'foram concluídos'} — ${enumerar(niveis)}.`];
    if (r.delta === null || r.delta === undefined) {
      frases.push('É o registro mais antigo que o DevOps guarda para este escopo.');
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
    // Itens sem produto contam no total mas não em produto nenhum: "todo o
    // esforço caiu em X" seria mentira quando eles existem.
    const soltos = (m.total || 0) - prods.reduce((soma, p) => soma + p.n, 0);
    const aviso = soltos > 0 ? ` — além de ${plural(soltos, 'item sem produto associado', 'itens sem produto associado')}` : '';
    if (prods.length === 1) {
      frases.push(soltos > 0
        ? `O esforço com produto caiu todo em <b>${esc(prods[0].titulo)}</b>${aviso}.`
        : `Todo o esforço caiu em <b>${esc(prods[0].titulo)}</b>.`);
    } else if (prods.length > 1) {
      const topo = prods.slice(0, 3).map((p) => `<b>${esc(p.titulo)}</b> (${p.n})`);
      const resto = prods.length - topo.length;
      frases.push(`O esforço se distribuiu em ${plural(prods.length, 'produto', 'produtos')}: ${topo.join(', ')}${resto > 0 ? `, e outros ${resto}` : ''}${aviso}.`);
    }
    if (fech.length === 1) {
      frases.push(`<b>${esc(fech[0].titulo)}</b> fechou por completo.`);
    } else if (fech.length > 1) {
      frases.push(`${plural(fech.length, 'épico fechou', 'épicos fecharam')} por completo: ${fech.map((e) => `<b>${esc(e.titulo)}</b>`).join(', ')}.`);
    }
    return frases.join(' ');
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

  // `travadosVencidos` reconcilia a prosa com a capa: o KPI "fora do prazo"
  // conta o travado vencido, então a frase dos travados diz qual deles é.
  // `frentes` é a triagem de risco: quais produtos têm item atrasado.
  function paragrafoSituacao(b, travadosVencidos, frentes) {
    const frases = [];
    if (b.execucao.length) frases.push(`<b>${plural(b.execucao.length, 'item', 'itens')}</b> em execução agora.`);
    const p = b.prazos;
    const prazo = [];
    if (p.atrasados.length) prazo.push(`<b>${p.atrasados.length} ${p.atrasados.length === 1 ? 'já passou' : 'já passaram'} do prazo</b>`);
    if (p.esteMes.length) prazo.push(`${p.esteMes.length} ${p.esteMes.length === 1 ? 'vence' : 'vencem'} ainda este mês`);
    if (p.proximoMes.length) prazo.push(`${p.proximoMes.length} no mês que vem`);
    if (p.depois && p.depois.length) prazo.push(`${p.depois.length} mais adiante`);
    if (prazo.length) frases.push('Nos prazos: ' + prazo.join(', ') + '.');
    if (frentes && frentes.length) {
      const lista = frentes.map((f) => `<b>${esc(f.titulo)}</b> (${f.n} ${f.n === 1 ? 'item' : 'itens'})`);
      frases.push('Frentes com item atrasado: ' + enumerar(lista) + '.');
    }
    if (b.travados.length) {
      const velho = b.travados[0];
      const partes = [];
      if (velho.dias != null) partes.push(`o mais antigo sem movimento há ${velho.dias} ${velho.dias === 1 ? 'dia' : 'dias'}`);
      if (travadosVencidos) partes.push(b.travados.length === 1 ? 'com o prazo estourado' : `${travadosVencidos} ${travadosVencidos === 1 ? 'deles com o prazo estourado' : 'deles com o prazo estourado'}`);
      const tempo = partes.length ? ' — ' + partes.join(', ') : '';
      frases.push(`<b>${plural(b.travados.length, 'item está travado', 'itens estão travados')}</b>${tempo}. ${b.travados.length === 1 ? 'É o ponto que depende' : 'São os pontos que dependem'} de decisão.`);
    }
    return frases.join(' ');
  }

  // Data de conclusão em branco no DevOps: vale a última alteração, marcada com ~.
  // Quem lê tem que saber quando a data é aproximada.
  function notaAproximados(m) {
    if (!m || !m.aproximados) return '';
    const n = m.aproximados;
    return `<p class="mudo nota-report">${n} ${n > 1 ? 'itens sem data de conclusão' : 'item sem data de conclusão'} registrada no DevOps — ${n > 1 ? 'nesses' : 'nesse'} vale a data da última alteração, marcada com ~.</p>`;
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

  // Manchete: a punchline do mês, derivada dos fatos. Volume + o produto que
  // concentrou entrega, e — no mês corrente — o que pede ação (decisão, prazo).
  // Mês fechado não fala de ação: situação é sempre do agora, não do passado.
  function manchete(mesChave, fechado, nEntregas, topNome, nTravados, nAtrasados) {
    const mes = mesPorExtenso(mesChave).toLowerCase().replace(/ de \d{4}$/, '');
    const frases = [];
    if (nEntregas > 0) {
      frases.push(`Em ${mes}, <b>${plural(nEntregas, 'entrega', 'entregas')}</b>${topNome ? ` — ${esc(topNome)} na frente` : ''}.`);
    } else {
      frases.push(`Em ${mes}, nenhuma entrega registrada ainda.`);
    }
    if (!fechado) {
      const acao = [];
      if (nTravados) acao.push(`<b>${nTravados}</b> ${nTravados === 1 ? 'depende' : 'dependem'} de decisão`);
      if (nAtrasados) acao.push(`<b>${nAtrasados}</b> fora do prazo`);
      if (acao.length) {
        const t = enumerar(acao);
        frases.push(t.charAt(0).toUpperCase() + t.slice(1) + '.');
      }
    }
    return frases.join(' ');
  }

  // Recorte: deixa explícito que o report é de UM responsável, não o total da
  // unidade — senão "Ybera US" na capa se lê como se fosse tudo.
  function recorte(escopo, unidade) {
    if (escopo) return `Recorte: entregas sob responsabilidade de ${esc(escopo)}${unidade ? ' em ' + esc(unidade) : ''} — não o total da unidade.`;
    return `Recorte: todas as entregas${unidade ? ' de ' + esc(unidade) : ''}.`;
  }

  function capa(escolhido, meta, tiles, frase, notaRecorte) {
    return `<header class="doc-capa">
      <div class="doc-limite">
        <h1 class="doc-titulo"><span>Relatório de</span><b>${esc(mesPorExtenso(escolhido))}</b></h1>
        ${frase ? `<p class="doc-manchete">${frase}</p>` : ''}
        ${meta ? `<p class="doc-meta">${esc(meta)}</p>` : ''}
        ${tiles ? `<ul class="doc-kpis">${tiles}</ul>` : ''}
        ${notaRecorte ? `<p class="doc-recorte">${notaRecorte}</p>` : ''}
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
      if (!partes.length) partes.push(esc((r.item.fields || {})['System.State']));
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

  // #8 Compromisso pra frente: resume por frente o que vem a seguir (itens com
  // data futura), do prazo mais próximo pro mais distante. Reenquadra a lista de
  // prazos (que é por urgência) como "o que cada frente entrega adiante".
  // Derivado — sem convenção nova. Atrasado não entra: é risco, não compromisso.
  function proximasPorFrente(prazos, mapa) {
    const regs = [...(prazos.esteMes || []), ...(prazos.proximoMes || []), ...(prazos.depois || [])];
    const porProd = new Map();
    for (const r of regs) {
      const prod = mapa.get(r.item.id) || null;
      const chave = prod ? prod.id : 'sem';
      if (!porProd.has(chave)) porProd.set(chave, { titulo: prod ? prod.titulo : SEM_PRODUTO, n: 0, prox: null });
      const g = porProd.get(chave);
      g.n += 1;
      if (r.alvo && (!g.prox || Date.parse(r.alvo) < Date.parse(g.prox))) g.prox = r.alvo;
    }
    return [...porProd.values()].sort((a, b) => Date.parse(a.prox || '2999-01-01') - Date.parse(b.prox || '2999-01-01'));
  }

  function corpoProximos(b, mapa) {
    const bloco = (titulo, regs, alerta, direita) => regs.length ? `
      <div class="grupo-produto">
        <h3${alerta ? ' class="rotulo-alerta"' : ''}>${titulo}</h3>
        <ul class="lista-linhas">${regs.map((r) => linha(r.item, direita(r))).join('')}</ul>
      </div>` : '';
    const semPrazo = b.execucao.filter((r) => !(r.item.fields || {})[CAMPO_ALVO]);
    const frentes = mapa ? proximasPorFrente(b.prazos, mapa) : [];
    const lead = frentes.length
      ? `<p class="proximos-lead">Por frente, o que vem a seguir: ${frentes
        .map((f) => `<b>${esc(f.titulo)}</b> (${f.n} ${f.n === 1 ? 'item' : 'itens'}${f.prox ? ', próximo em ' + dataCurta(f.prox) : ''})`)
        .join(' · ')}.</p>`
      : '';
    return '<div class="doc-bloco">'
      + lead
      + bloco('Já passou do prazo', b.prazos.atrasados, true, (r) => dataCurta(r.alvo))
      + bloco('Vence ainda este mês', b.prazos.esteMes, false, (r) => dataCurta(r.alvo))
      + bloco('Vence no mês que vem', b.prazos.proximoMes, false, (r) => dataCurta(r.alvo))
      + bloco('Vence mais adiante', b.prazos.depois, false, (r) => dataCurta(r.alvo))
      + bloco('Em curso, sem prazo definido', semPrazo, false, (r) => esc((r.item.fields || {})['System.State']))
      + '</div>';
  }

  // ---- Entrada ----
  // opcoes: { items, agora, escopo, unidade, todos, mes }
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
    const mapa = C.mapaDeProdutos(o.todos || items);
    // Objetivo + rumo por produto. No modo PO calcula do backlog inteiro (`todos`);
    // no link de leitura vem pronto (`o.produtos`), porque o pacote não carrega o
    // backlog completo e recalcular ali subcontaria o progresso.
    const infoProd = o.produtos || C.resumoProdutos(o.todos || items);
    const meses = C.resumoMensal(C.reportPorMes(items), mapa);
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
    if (!mesAlvo && !fechado && !b.execucao.length && !b.travados.length && !meses.length && !temPrazoVivo) {
      return { vazio: true, meses: listaMeses, html: '<p class="mudo">Nada registrado ainda para este escopo.</p>' };
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
        depois: semTravados(b.prazos.depois),
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
      // Triagem de risco sobre bVivo (sem o travado): o travado atrasado já é
      // contado à parte na mesma frase e vai em Decisão. Somar os dois aqui faria
      // o card dizer "2 já passaram do prazo" e listar frentes com 3.
      paragrafoSituacao(bVivo, b.prazos.atrasados.filter((r) => idsTravados.has(r.item.id)).length, frentesEmRisco(bVivo.prazos.atrasados, mapa)),
    ]).filter(Boolean);

    const meta = [];
    if (escopo) meta.push('P.O responsável: ' + escopo);
    if (o.unidade) meta.push(o.unidade);

    // Manchete e recorte da capa: o produto em destaque é o de maior volume do
    // mês (comProduto já vem ordenado por volume em porProduto).
    const topNome = comProduto.length ? comProduto[0].produto.titulo : '';
    const frase = manchete(escolhido, fechado, entregas.length, topNome, b.travados.length, b.prazos.atrasados.length);
    const notaRecorte = recorte(escopo, o.unidade);

    const tiles = tile(entregas.length, entregas.length === 1 ? 'entrega' : 'entregas')
      + tile(comProduto.length, comProduto.length === 1 ? 'produto' : 'produtos')
      // "Fora do prazo" é pergunta de prazo, não de fluxo: um item travado com
      // prazo estourado CONTA — senão a capa diz "0" e a seção Decisão mostra
      // "atrasado desde...", o documento se contradizendo na mesma página.
      + (fechado ? '' : tile(b.execucao.length, 'em execução') + tile(b.prazos.atrasados.length, 'fora do prazo', true));

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
        corpo: `<p class="mudo nota-report">O DevOps guarda o estado de agora, não o estado
        que cada item tinha em ${esc(mesPorExtenso(escolhido).toLowerCase())}. Para ver o que está em curso,
        troque para o mês corrente no seletor do topo.</p>`,
      });
    } else {
      if (b.travados.length) {
        secoes.push({
          id: 'decisao', titulo: 'Depende de decisão', rotulo: 'Decisão',
          intro: 'Itens marcados como bloqueados ou em espera no DevOps. O quadro mostra o que está parado — de quem depende cada destrave, o P.O. detalha na reunião.',
          corpo: corpoDecisao(b.travados, agora, o.decisoes || null),
        });
      }
      const totalProximos = bVivo.prazos.atrasados.length + bVivo.prazos.esteMes.length
        + bVivo.prazos.proximoMes.length + bVivo.prazos.depois.length + b.execucao.length;
      if (totalProximos) {
        secoes.push({
          id: 'proximos', titulo: 'Próximos passos', rotulo: 'Próximos',
          intro: 'O que está em curso e quando vence, do prazo mais apertado para o mais folgado.',
          corpo: corpoProximos(bVivo, mapa),
        });
      }
    }

    // O mês é eixo do documento, não controle de ferramenta: mora na própria
    // navegação, na ponta direita — como no report do time. Serve o PO e o
    // stakeholder pela mesma peça. Um mês só não é escolha: não desenha.
    const seletorMes = listaMeses.length > 1
      ? `<select id="mes-global" class="doc-mes" aria-label="Mês do report" title="Mês do report">${listaMeses
        .map((m) => `<option value="${esc(m)}"${m === escolhido ? ' selected' : ''}>${esc(mesPorExtenso(m))}</option>`)
        .join('')}</select>`
      : '';
    const nav = `<nav class="doc-nav" aria-label="Seções do report"><div class="doc-nav-int">${secoes
      .map((x) => `<a href="#${x.id}">${esc(x.rotulo)}</a>`).join('')}${seletorMes}</div></nav>`;

    const html = `<div class="report-doc">
      ${capa(escolhido, meta.join(' · '), tiles, frase, notaRecorte)}
      ${nav}
      ${secoes.map((x) => secaoHtml(x)).join('')}
    </div>`;

    return { vazio: false, meses: listaMeses, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
