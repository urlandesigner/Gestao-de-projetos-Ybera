  // Slug só pro id da seção: sem acento, sem símbolo, estável enquanto o nome
  // não mudar. Não há navegação por âncora aqui — serve pra teste e link direto.
  const slug = (txt) => String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sem-nome';

  /* Agrupa os cartões por uma de duas réguas:

     'iniciativa' — a linha do roadmap. É a régua que faz o documento inteiro
       falar uma língua só: o mesmo nome aparece no título da seção, no cartão
       e, mais abaixo, na barra do roadmap. O leitor amarra sozinho.
     'epico'      — o épico do Azure DevOps. Fala a língua de quem executa.

     A ordem segue o roadmap quando a régua é a iniciativa (o documento lê na
     mesma sequência das barras lá embaixo) e a ordem ditada pelo Urlan quando
     é o épico. Cartão sem par cai num grupo próprio, no fim — nunca some. */
  function agruparEntregas(lista, modo) {
    const chaveDe = (f) => (modo === 'iniciativa' ? f.iniciativa : f.produto) || null;
    const grupos = new Map();
    for (const f of lista) {
      const nome = chaveDe(f);
      const chave = nome || '\u0000sem';
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          id: nome ? slug(nome) : 'outras',
          nome: nome || 'Outras entregas',
          orfao: !nome,
          cards: [],
        });
      }
      grupos.get(chave).cards.push(f);
    }
    // A ordem é a da lista: o primeiro cartão de cada grupo define onde aquele
    // grupo entra no documento. Quem manda é a sequência em que o Urlan
    // escreveu os cartões — mover um cartão de lugar move a seção junto.
    // (A alternativa era seguir a ordem do roadmap, o que casaria com as
    // barras lá embaixo; foi trocado porque tirava dele o controle da ordem,
    // e mudá-la exigiria reescrever o roadmap.json por motivo de apresentação.)
    // O grupo sem par fecha a lista, sempre.
    const saida = [...grupos.values()];
    return saida.sort((a, b) => (a.orfao ? 1 : 0) - (b.orfao ? 1 : 0));
  }

/* Central de Projetos — ENTREGAS, de dado a HTML.

   Não é uma v3 do report: é outro documento. O report (v1 e v2) responde "o
   que o mês registrou no Azure DevOps", com número de item por trás de cada
   afirmação. Este aqui responde "o que o time entregou e para onde vai", em
   linguagem de gente, e é escrito à mão. Nasceu clone do v2 e por isso herdou
   a forma dele; o parentesco acaba aí.

   Duas seções, só:
   - Entregas recentes — lista curada em ENTREGAS_RECENTES, aqui embaixo. Não
     vem do DevOps, não se atualiza sozinha: quem mexe sou eu, quando o Urlan
     pede. O épico de cada card é cópia congelada do nome que está lá.
   - Roadmap — assets/roadmap.json, o mesmo do report.

   Compartilha o controlador com o report: expõe a MESMA interface (`esc`,
   `htmlReport`) e registra-se no MESMO nome global, então report.js não sabe
   qual arquivo está carregado — quem escolhe é a página (report.html carrega
   o v1, report-v2.html o v2, entregas.html este).

   Contrato de DOM com report.js (não mexer sem mexer lá):
   .report-doc · seções com id próprio. Os ganchos de busca (#busca-entregas,
   #lista-entregas, .chip-doc, #limpar-entregas, #conta-entregas), a navegação
   (.doc-nav) e o seletor de mês (#mes-global) não existem aqui — report.js
   aguenta a ausência dos três: cada um sai cedo ou é delegado por seletor que
   nunca casa.

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








  const CAP_NOMES_FRENTE = 3;

  /* ==================================================================
     FORMA — daqui pra baixo é tudo novo.
     Régua e espaço no lugar de caixa e sombra: cada linha de item é uma
     linha de razão contábil, não um cartão. Número tabular em toda
     contagem, pra coluna bater na vertical.
     ================================================================== */






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
  // O número grande é a contagem de PBIs fechados no mês — o que o time
  // efetivamente entregou. Antes era o total de itens, que somava épico e
  // Feature e inflava a conta com o mesmo trabalho contado duas vezes (o PBI e
  // o pai que fechou junto). O delta compara com o mês anterior pela MESMA
  // régua: comparar PBI com total daria uma variação que não existe.
  function heroi(mesAlvo, mesAnterior) {
    const total = contaPbis(mesAlvo);
    const d = mesAnterior ? total - contaPbis(mesAnterior) : null;
    const temDelta = d !== null && d !== undefined;
    const sobe = temDelta && d > 0;
    const desce = temDelta && d < 0;
    // Sem recorte de tempo no rótulo: o título da capa já diz "Relatório de
    // Setembro de 2026" três centímetros acima, e repetir o mês aqui e no bloco
    // vizinho era dizer a mesma coisa três vezes na mesma tela. Sem ponto final
    // também — rótulo não é frase, e o bloco ao lado nunca teve.
    const frase = total ? 'Itens entregues' : 'Nenhum item entregue';
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
        <p class="rl-tile-num"><b class="rl-num">${total}</b></p>
        ${marca}
      </div>
    </article>`;
  }

  // Sem o selo de "mês em curso / mês fechado": a pedido do Urlan, e sem perda
  // de informação — o título logo abaixo já nomeia o mês, e este documento não tem mais
  // seletor pra trocar de mês, então não havia estado ambíguo pra desfazer.
  function masthead(escolhido, meta, tiles, hero) {
    return `<header class="rl-capa">
      <div class="rl-capa-topo">
        <img class="rl-logo" src="assets/brand/ybera-logo.webp" alt="Ybera" width="360" height="139">
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


  /* ---- Entregas recentes: lista curada, escrita à mão ----

     Diferente de todo o resto do documento, estes cartões não vêm do Azure
     DevOps. São os tópicos que o Urlan dita, na ordem em que ele dita. Mexer
     aqui é a forma de incluir, remover ou reescrever cartão — não há tela
     pra isso.

     `titulo` é obrigatório. `status` é opcional e só aceita 'andamento' (o
     único estado que apareceu até agora); qualquer outra coisa é ignorada, em
     vez de virar um selo que afirma algo que ninguém escreveu. `resumo` é o
     texto do Urlan — string para um parágrafo, lista de strings quando ele
     separou ideias que não cabem na mesma respiração. */
  const ENTREGAS_RECENTES = [
    {
      titulo: 'Novos componentes visuais para HOME',
      iniciativa: 'Nova Homepage USA',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      resumo: [
        'Foram criadas novas opções visuais de todas as seções da home do site.',
        'Ao todo, 12 componentes: Banner, Bundle, Quiz AI, Card de produto, Blog, Shop by concern, Autoridade, Antes e Depois, Reviews, Produto em destaque, Shop by collection e Listagem de produtos.',
      ],
    },
    {
      titulo: 'Novo cart drawer',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      resumo: 'Melhoria geral da experiência do cart drawer, no desktop e no mobile.',
    },
    {
      titulo: 'Novos componentes visuais para PDP',
      iniciativa: 'Nova PDP USA',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      resumo: 'Foram criadas novas opções visuais dos componentes da PDP do site.',
    },
    {
      titulo: 'Migração de ERP — ajustes gerais',
      produto: 'ERP — Ordoro | Salesforce Rootstock',
      epicoId: 49282,
      resumo: 'Ajustes e configurações adicionais pós-migração para a Rootstock.',
    },
    {
      titulo: 'Tratativas do Google compliance',
      iniciativa: 'Ajustes Loja USA Compliance Google',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      status: 'andamento',
      resumo: [
        'Avançamos nos itens que recebemos da agência: 50% dos 18 já estão concluídos, e os demais seguem em andamento com previsão de término ainda este mês.',
        'O que não for finalizado dentro desse prazo será tratado como nova demanda, a partir de outubro.',
      ],
    },
    {
      titulo: 'Testes Shipsmart',
      produto: 'Shipsmart',
      epicoId: 49300,
      resumo: [
        'Estamos realizando testes da automação do fluxo da Shipsmart para pedidos que têm estoque no Brasil e são entregues nos EUA.',
        'Já foram feitas 3 rodadas de testes, mas ainda não foi possível concluir 100% sem erros.',
      ],
    },
    {
      titulo: 'Tradução do site',
      iniciativa: 'Tradução',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      resumo: [
        'Configurando todo o site para ser possível traduzir, tanto os textos quanto as imagens.',
        'No caso das imagens, elas deverão ser criadas em versões diferentes por idioma.',
      ],
    },
    {
      titulo: 'App Review — ajustes',
      iniciativa: 'App de Reviews',
      produto: 'Ybera Reviews / API de Reviews',
      epicoId: 49302,
      resumo: [
        'Realizamos discovery para levantar as melhores opções de apps de reviews dentro do Shopify.',
        'Depois da pesquisa, fizemos um alinhamento com o Wendel e decidimos que não seria produtivo trocar o app atual, o Judge.me, por outro: não haveria ganho real, seria basicamente trocar um pelo outro, e demandaria muitas horas do time técnico. Preferimos manter o Judge.me e fazer alguns pequenos ajustes.',
      ],
    },
  ];

  // Mesmo cartão do v2 (.rl-frente), com menos dentro: aqui não há prazo,
  // progresso nem lista de itens porque não há dado por trás deles. Inventar
  // um número pra preencher o cartão seria pior que o espaço em branco.
  // `mostrarProduto` existe por causa dos dois desenhos: na lista corrida a
  // retranca é o que diz a que frente o card pertence; agrupado por épico, o
  // título da seção já disse, e repetir o mesmo nome em cinco cards seguidos
  // vira ruído.
  function corpoEntregasRecentes(lista, mostrarProduto) {
    const cartoes = lista.map((f) => {
      const selo = f.status === 'andamento'
        ? '<span class="rl-selo rl-selo-andamento">em andamento</span>' : '';
      return `<article class="rl-frente">
        ${mostrarProduto && f.produto ? `<p class="rl-frente-produto">${esc(f.produto)}</p>` : ''}
        <div class="rl-frente-cab">
          <h3 class="rl-frente-nome">${esc(f.titulo)}</h3>
          <div class="rl-frente-meta">${selo}</div>
        </div>
        ${[].concat(f.resumo || []).map((par) => `<p class="rl-frente-resumo">${esc(par)}</p>`).join('')}
      </article>`;
    }).join('');
    return `<div class="rl-frentes">${cartoes}</div>`;
  }

  // Mesma régua do core (levelOf): PBI é tudo que não é Epic nem Feature —
  // Product Backlog Item, User Story, Bug. É o nível onde o trabalho acontece.
  const ehPbi = (it) => {
    const t = ((it || {}).fields || {})['System.WorkItemType'] || '';
    return t !== 'Epic' && t !== 'Feature';
  };
  const contaPbis = (m) => (((m || {}).itens) || []).filter((r) => ehPbi(r.item || r)).length;

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
    // `meses` vem do mais novo pro mais velho: o anterior no tempo é o próximo índice.
    const iAlvo = meses.findIndex((m) => m.mes === escolhido);
    const mesAnterior = iAlvo >= 0 ? (meses[iAlvo + 1] || null) : null;
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

    const meta = [];
    // "Product Owner" por extenso em vez de "P.O responsável": o ponto no meio
    // da sigla não aparece em nenhum outro lugar do documento, e o nome do
    // papel já diz "responsável" — quem lê não precisa decodificar nada.
    if (escopo) meta.push('Product Owner: ' + escopo);
    if (o.unidade) meta.push(o.unidade);

    // "Fora do prazo" conta o travado vencido de propósito: é pergunta de
    // prazo, não de fluxo. Sem isso a capa diz 0 e a seção Decisão mostra
    // "atrasado desde…", o documento se contradizendo na mesma página.
    // Três desenhos para o mesmo conteúdo:
    //   'iniciativa' — uma seção por linha do roadmap (padrão). É a régua que
    //      faz a capa, os cartões e as barras do roadmap usarem os mesmos
    //      nomes, e o leitor amarrar as três coisas sozinho.
    //   'epico'      — uma seção por épico do Azure DevOps.
    //   'plano'      — uma seção só, com todos os cartões e a retranca neles.
    // A escolha vem por opção (é assim que o teste pede cada uma) e, no
    // navegador, por ?grupo=epico ou ?grupo=plano. Ler `location` aqui é
    // exceção consciente: a alternativa era passar o parâmetro pelo report.js,
    // compartilhado com o report, que não deve saber de experimento daqui.
    const naUrl = typeof location !== 'undefined'
      ? (/[?&]grupo=(plano|epico|iniciativa)\b/.exec(location.search) || [])[1] : null;
    const agrupar = o.agrupar || naUrl || 'iniciativa';
    const grupos = agrupar === 'plano' ? [] : agruparEntregas(ENTREGAS_RECENTES, agrupar);

    // Um número só na capa, a pedido do Urlan. Os outros dois saíram: "Em
    // execução agora" vinha do DevOps e o documento não tem seção que o
    // sustente, e "Iniciativas em andamento" repetia a palavra "Iniciativas"
    // ao lado deste — duas contagens parecidas, com nomes parecidos, uma do
    // lado da outra.
    //
    // O grupo órfão ("Outras entregas") NÃO entra na conta: ele é trabalho
    // entregue, mas não é uma iniciativa. Contá-lo faria a capa afirmar uma
    // iniciativa a mais do que existe no roadmap.
    const gruposReais = grupos.filter((g) => !g.orfao);
    const nGrupos = agrupar === 'plano'
      ? agruparEntregas(ENTREGAS_RECENTES, 'iniciativa').filter((g) => !g.orfao).length
      : gruposReais.length;
    const rotuloGrupo = agrupar === 'epico'
      ? (nGrupos === 1 ? 'Frente atendida' : 'Frentes atendidas')
      : (nGrupos === 1 ? 'Projeto atendido' : 'Projetos atendidos');
    const kpis = tile(rotuloGrupo, nGrupos);

    const secoes = [];
    if (ENTREGAS_RECENTES.length && agrupar === 'plano') {
      secoes.push({
        id: 'recentes', titulo: 'Entregas recentes',
        intro: 'As frentes de trabalho mais recentes do time.',
        corpo: corpoEntregasRecentes(ENTREGAS_RECENTES, true),
      });
    } else {
      for (const g of grupos) {
        secoes.push({
          id: (agrupar === 'epico' ? 'epico-' : 'ini-') + g.id, titulo: g.nome,
          intro: g.cards.length === 1 ? '1 entrega recente.' : g.cards.length + ' entregas recentes.',
          corpo: corpoEntregasRecentes(g.cards, false),
        });
      }
    }
    const roadmapItens = o.roadmap || [];
    if (roadmapItens.length) {
      secoes.push({
        id: 'roadmap', titulo: 'Roadmap',
        intro: 'Todos os projetos previstos para os próximos meses.',
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
    // Sem navegação e sem seletor de mês, a pedido do Urlan: o documento ficou
    // curto (duas seções) e uma barra pra pular entre elas custava mais leitura
    // do que economizava rolagem. report.js aguenta a ausência das duas — ele
    // mede a nav com um early-return quando não acha `.doc-nav`, e o clique é
    // delegado por seletor, então nunca casa. `listaMeses` continua no retorno:
    // é dela que a Central monta o link de leitura.
    const html = `<div class="report-doc rl-doc">
      ${masthead(escolhido, meta.join(' · '), kpis, heroi(mesAlvo, mesAnterior))}
      <div class="rl-corpo">${secoes.map((x) => secaoHtml(x)).join('')}</div>
      ${rodape()}
    </div>`;

    return { vazio: false, meses: listaMeses, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
