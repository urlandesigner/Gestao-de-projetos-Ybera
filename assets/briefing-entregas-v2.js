/* Central de Projetos — ENTREGAS v2: o documento de Entregas mais o RITMO DAS
   SPRINTS.

   NÃO é uma cópia do briefing-entregas.js. Ele continua sendo quem desenha o
   documento inteiro; este arquivo pega o que ele produziu e enfia uma seção a
   mais. O motivo é a lista curada de cartões, que mora lá e tem ~150 linhas
   escritas à mão: clonado o arquivo, todo cartão novo teria que ser escrito
   duas vezes, e os dois documentos divergiriam na primeira vez que alguém
   esquecesse um. Delegando, o conteúdo existe num lugar só e o
   briefing-entregas.js fica byte a byte como estava.

   O preço da delegação é UMA costura de texto: a seção entra logo depois da
   abertura de `.rl-corpo` no HTML pronto. É frágil por natureza, então está
   isolada em `injetar()` e há teste travando que o documento base ainda abre
   com aquela âncora, exatamente uma vez. Se ela mudar, o teste cai — em vez da
   seção sumir calada.

   De onde vem o dado: o report.js é quem fala com o DevOps, e ele só busca
   sprint pra documento que declara `precisaDeSprints`. O report.html e o
   report-v2.html não declaram e seguem sem gastar requisição. O que chega aqui
   em `o.sprints` já vem contado e já no recorte de responsável que o leitor
   está vendo — este módulo não conta nada, só desenha.

   A folha é assets/ritmo.css, carregada só por entregas-v2.html. O
   entregas.css é compartilhado com o documento original e não foi tocado.

   UMD: window.CentralBriefing no navegador (sobrescrevendo o base, que a
   página carrega ANTES deste arquivo), module.exports no Node. */
(function (root, factory) {
  const noNode = typeof module !== 'undefined' && module.exports;
  // O documento base. No navegador ele JÁ se registrou em CentralBriefing —
  // entregas-v2.html carrega briefing-entregas.js primeiro, e sem isso aqui
  // chega undefined e a página não desenha nada.
  // Sem core.js: este módulo não conta nada, só desenha o que já veio contado.
  const base = noNode ? require('./briefing-entregas.js') : root.CentralBriefing;
  const api = factory(base);
  if (noNode) module.exports = api;
  else root.CentralBriefing = api;
})(typeof self !== 'undefined' ? self : this, function (base) {
  'use strict';

  // Reaproveitado do base: um escape só no documento, senão são duas regras
  // de escapar a mesma coisa.
  const esc = base.esc;

  const ANCORA = '<div class="rl-corpo">';

  /* ESTE É O RELATÓRIO DE OUTUBRO. O de Agosto e Setembro continua sendo o
     entregas.html, com os cartões e o período dele, congelado como foi
     publicado — relatório já entregue não se reescreve.

     Período e cartões entram pelo documento base como OPÇÃO (`o.periodo` e
     `o.cartoes`), que ele já aceitava. Por isso a edição nova não exigiu uma
     cópia do arquivo: as duas edições são o mesmo desenho com entradas
     diferentes. */
  const PERIODO = ['2026-10'];

  /* O ENDEREÇO FIXO DOS DADOS.

     Este documento é de acompanhamento: a mesma pessoa abre o mesmo endereço
     toda semana. No fragmento do link isso não funciona — lá o dado anda junto
     com o link, então cada atualização vira um link novo pra reenviar, e quem
     guardou o antigo fica vendo outubro parado para sempre.

     Com o arquivo, o endereço nunca muda e a publicação é que troca. Quem
     declara isto é o DOCUMENTO, e não o report.js: as outras três edições não
     declaram e seguem só com o fragmento. */
  const ARQUIVO_DE_DADOS = 'assets/dados-outubro.json';

  /* Os cartões de outubro, que o Urlan dita. Começa vazia a pedido dele: até a
     primeira entrega entrar, o documento é a capa, as sprints e o roadmap — e
     isso é verdade sobre o mês, não falha de carregamento.

     Mesma forma dos cartões do documento base (titulo, status, resumo,
     iniciativa/produto, epicoId/featureIds, contaFixa). Mexer aqui é a forma de
     incluir, remover ou reescrever cartão: não há tela pra isso. */
  const ENTREGAS_OUTUBRO = [];

  const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

  /* "14–25 de set" quando a sprint não vira o mês, "31 de ago – 11 de set"
     quando vira. Datas em UTC, como todo o resto do projeto: o `finish` do
     DevOps é meia-noite, e ler em fuso local devolveria a véspera pra quem
     está a oeste de Greenwich — a sprint apareceria fechando um dia antes. */
  function periodoCurto(ini, fim) {
    const a = ini ? new Date(ini) : null;
    const b = fim ? new Date(fim) : null;
    if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
    const dia = (d) => d.getUTCDate();
    const mes = (d) => MES_CURTO[d.getUTCMonth()];
    const mesmoMes = a.getUTCFullYear() === b.getUTCFullYear()
      && a.getUTCMonth() === b.getUTCMonth();
    return mesmoMes
      ? `${dia(a)}–${dia(b)} de ${mes(b)}`
      : `${dia(a)} de ${mes(a)} – ${dia(b)} de ${mes(b)}`;
  }

  /* Uma linha por sprint.

     O escopo da linha é o que ESTÁ nela mais o que SAIU dela — é a conta que
     fecha: "2 de 5 entregues, 3 transbordaram" se lê inteira. Dizer só "2 de 2"
     seria verdade sobre a sprint de hoje e mentira sobre a sprint que
     aconteceu, que é o que o documento conta.

     A barra é decorativa (aria-hidden): os mesmos números estão em texto logo
     embaixo, e um leitor de tela que anunciasse os dois leria tudo em dobro.

     Transbordo zero não vira "0 transbordaram": número zero ocupa a linha pra
     dizer que não houve nada: a ausência já diz. O que a seção mede está
     escrito na intro, uma vez só. */
  /* A tarja, só pra sprint que NÃO fechou.

     Fechada não ganha tarja porque é o estado que os números pressupõem: "2 de
     5 entregues" sobre uma sprint encerrada é resultado. Tarjar o normal faria
     o olho procurar diferença onde não há. Já numa sprint que ainda corre, o
     mesmo "1 de 12" é um retrato no meio do caminho — e sem a tarja o leitor o
     lê como fracasso. */
  const TARJA = { corrente: 'em curso', futura: 'não começou' };

  /* A lista de itens da sprint. É o que transformou este documento de retrato
     mensal em acompanhamento: quem abre toda semana quer saber o que está
     planejado, e um placar não responde isso.

     Os que transbordaram vêm no fim, com o selo âmbar — mesma cor do board da
     Central, porque o mesmo fato não pode ter duas cores em duas telas. */
  function itensHtml(s) {
    const dentro = Array.isArray(s.itens) ? s.itens : [];
    const fora = Array.isArray(s.transbordados) ? s.transbordados : [];
    if (!dentro.length && !fora.length) return '';
    const classe = (x, saiu) => (saiu ? ' rt-transbordou' : (x.feito ? ' rt-ok' : ''));
    const li = (x, saiu) => `<li class="rt-item${classe(x, saiu)}">
      <span class="rt-ponto" aria-hidden="true"></span>
      <span class="rt-item-nome">${esc(x.titulo)}</span>
      <span class="rt-item-estado">${esc(saiu ? 'transbordou' : (x.estado || ''))}</span>
    </li>`;
    return `<ul class="rt-itens">
      ${dentro.map((x) => li(x, false)).join('')}
      ${fora.map((x) => li(x, true)).join('')}
    </ul>`;
  }

  function linhaHtml(s) {
    const estado = TARJA[s.estado] ? s.estado : 'fechada';
    const entregues = Math.max(0, Number(s.entregues) || 0);
    const saiu = Math.max(0, Number(s.transbordaram) || 0);
    const escopo = Math.max(0, Number(s.total) || 0) + saiu;
    const pct = (n) => (escopo ? (n / escopo) * 100 : 0);
    const datas = periodoCurto(s.start, s.finish);
    /* A sprint que não começou não tem placar: dizer "0 de 1 entregue" sobre
       trabalho que nem foi iniciado lê como zero de resultado, e o que existe
       ali é só o escopo que já foi posto na fila. A barra fica vazia pelo
       mesmo motivo — e fica, em vez de sumir, porque é ela que deixa as linhas
       comparáveis de relance. */
    const numeros = estado === 'futura'
      ? `<span class="rt-n">${escopo
        ? `<b>${escopo}</b> ${escopo === 1 ? 'item planejado' : 'itens planejados'}`
        : 'ainda sendo planejada'}</span>`
      : `<span class="rt-n"><b>${entregues}</b> de ${escopo} ${escopo === 1 ? 'entregue' : 'entregues'}</span>
         ${saiu ? `<span class="rt-n rt-amb"><b>${saiu}</b> ${saiu === 1 ? 'transbordou' : 'transbordaram'}</span>` : ''}`;
    return `<li class="rt-linha rt-${estado}">
      <p class="rt-topo">
        <span class="rt-nome">${esc(s.nome)}</span>
        ${datas ? `<span class="rt-datas">${esc(datas)}</span>` : ''}
        ${TARJA[estado] ? `<span class="rt-tarja">${esc(TARJA[estado])}</span>` : ''}
      </p>
      <span class="rt-barra" aria-hidden="true">
        ${estado === 'futura' ? '' : `<span class="rt-feito" style="width:${pct(entregues)}%"></span>
        <span class="rt-saiu" style="width:${pct(saiu)}%"></span>`}
      </span>
      <p class="rt-nums">${numeros}</p>
      ${itensHtml(s)}
    </li>`;
  }

  /* CARIMBO DE DATA, e ele não é enfeite.

     O leitor do link NÃO fala com o DevOps: o dado viaja dentro da própria
     página, congelado no instante em que foi publicado. Sem dizer de quando é,
     quem abre o mesmo endereço toda segunda vê os mesmos números e conclui que
     nada andou. Num documento de acompanhamento isso é pior que não ter
     documento.

     Hora junto, e não só a data: numa sprint em curso o dia inteiro cabe entre
     dois estados diferentes do mesmo item. */
  function carimbo(agora) {
    const t = Number(agora);
    if (!Number.isFinite(t) || t <= 0) return '';
    const d = new Date(t);
    const dois = (n) => String(n).padStart(2, '0');
    const quando = `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`
      + `, ${dois(d.getHours())}h${dois(d.getMinutes())}`;
    return `<p class="rt-carimbo">Dados de ${esc(quando)}</p>`;
  }

  /* A seção inteira, ou string vazia quando não há sprint fechada no período.

     Vazia é o certo: sem sprint medida, um título com lista em branco faria o
     leitor procurar o que não existe. O PO, esse sim, recebe o aviso no console
     pelo report.js quando a busca falhou — pra ele "não teve sprint" e "a
     consulta caiu" não podem ser a mesma tela. */
  function secaoRitmo(sprints) {
    const lista = (Array.isArray(sprints) ? sprints : []).filter((s) => s && s.nome);
    if (!lista.length) return '';
    return `<section class="rl-sec" id="ritmo">
      <div class="rl-sec-cab">
        <h2 class="rl-sec-titulo">Sprints do período</h2>
        <p class="rl-sec-conta">${plural(lista.length, 'sprint', 'sprints')}</p>
        <p class="rl-sec-intro">As sprints do período, fechadas ou em andamento.
        Quando um item não terminou e foi repriorizado para a sprint seguinte, ele
        aparece como transbordo.</p>
      </div>
      <ul class="rt-lista">${lista.map(linhaHtml).join('')}</ul>
    </section>`;
  }

  /* A costura. Falha fechada de propósito: sem a âncora, devolve o documento
     intacto em vez de pendurar a seção num lugar qualquer. Um documento sem a
     seção ainda está certo; a seção no lugar errado, não. */
  function injetar(html, secao) {
    const i = html.indexOf(ANCORA);
    if (i < 0) return html;
    const corte = i + ANCORA.length;
    return html.slice(0, corte) + secao + html.slice(corte);
  }

  /* O período e os cartões DESTA edição vão pro base como opção. Quem chamou
     manda — é assim que os testes fixam um recorte sem depender do calendário,
     e é o mesmo contrato que o base já oferecia. */
  function htmlReport(o) {
    const entrada = Object.assign({}, o, {
      periodo: (o && Array.isArray(o.periodo) && o.periodo.length) ? o.periodo : PERIODO,
      cartoes: (o && Array.isArray(o.cartoes)) ? o.cartoes : ENTREGAS_OUTUBRO,
    });
    const r = base.htmlReport(entrada);
    if (!r || !r.html) return r;
    /* O carimbo vem ANTES da seção porque ele vale pro documento inteiro — os
       números da capa inclusive —, e não só pelas sprints. Fica no topo do
       corpo e não no masthead porque o masthead é desenho do base, e mexer lá
       mudaria o relatório de Agosto e Setembro junto. */
    const acrescimo = carimbo((o || {}).agora) + secaoRitmo((o || {}).sprints);
    if (!acrescimo) return r;
    return Object.assign({}, r, { html: injetar(r.html, acrescimo) });
  }

  /* `esc`, `camposDoLink` e `contagensDoLink` continuam vindo do base: são
     mecanismo, e mecanismo é o mesmo nas duas edições.

     `periodoDoDocumento` e `cartoesDoDocumento` NÃO: são o conteúdo desta
     edição, e quem lê os dois é gente de fora (o report.js, pra saber quais
     sprints buscar; o diagnostico.html, pra conferir o documento). Herdá-los do
     base faria o controlador buscar sprint de agosto pra um documento que fala
     de outubro — o tipo de divergência que o resto deste código existe pra
     impedir. */
  return Object.assign({}, base, {
    htmlReport,
    precisaDeSprints: true,
    arquivoDeDados: ARQUIVO_DE_DADOS,
    periodoDoDocumento: () => PERIODO.slice(),
    cartoesDoDocumento: () => ENTREGAS_OUTUBRO.map((c) => Object.assign({}, c)),
    // Expostos pro teste medir a costura sem reimplementá-la.
    secaoRitmo,
    carimbo,
    injetar,
    ANCORA,
    PERIODO,
  });
});
