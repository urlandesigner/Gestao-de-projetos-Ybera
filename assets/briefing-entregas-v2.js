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
  function linhaHtml(s) {
    const entregues = Math.max(0, Number(s.entregues) || 0);
    const saiu = Math.max(0, Number(s.transbordaram) || 0);
    const escopo = Math.max(0, Number(s.total) || 0) + saiu;
    const pct = (n) => (escopo ? (n / escopo) * 100 : 0);
    const datas = periodoCurto(s.start, s.finish);
    return `<li class="rt-linha">
      <p class="rt-topo">
        <span class="rt-nome">${esc(s.nome)}</span>
        ${datas ? `<span class="rt-datas">${esc(datas)}</span>` : ''}
      </p>
      <span class="rt-barra" aria-hidden="true">
        <span class="rt-feito" style="width:${pct(entregues)}%"></span>
        <span class="rt-saiu" style="width:${pct(saiu)}%"></span>
      </span>
      <p class="rt-nums">
        <span class="rt-n"><b>${entregues}</b> de ${escopo} ${escopo === 1 ? 'entregue' : 'entregues'}</span>
        ${saiu ? `<span class="rt-n rt-amb"><b>${saiu}</b> ${saiu === 1 ? 'transbordou' : 'transbordaram'}</span>` : ''}
      </p>
    </li>`;
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
        <p class="rl-sec-intro">As sprints que fecharam no período. Quando um item
        não terminou e foi repriorizado para a sprint seguinte, ele aparece como
        transbordo — o trabalho não sumiu, mudou de ciclo.</p>
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

  function htmlReport(o) {
    const r = base.htmlReport(o);
    const secao = secaoRitmo((o || {}).sprints);
    if (!secao || !r || !r.html) return r;
    return Object.assign({}, r, { html: injetar(r.html, secao) });
  }

  /* Tudo o que o report.js conhece continua vindo do base — `esc`,
     `camposDoLink`, `contagensDoLink`, `periodoDoDocumento`, `cartoesDoDocumento`.
     Só o desenho é trocado, e `precisaDeSprints` é a declaração que acende a
     busca de sprint lá no controlador. */
  return Object.assign({}, base, {
    htmlReport,
    precisaDeSprints: true,
    // Expostos pro teste medir a costura sem reimplementá-la.
    secaoRitmo,
    injetar,
    ANCORA,
  });
});
