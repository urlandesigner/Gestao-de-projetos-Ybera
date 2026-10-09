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

  /* Os cartões de outubro, que o Urlan dita.

     Mesma forma dos cartões do documento base (titulo, status, resumo,
     iniciativa/produto, epicoId/featureIds, contaFixa, progresso, link). Mexer
     aqui é a forma de incluir, remover ou reescrever cartão: não há tela pra
     isso. Lista vazia é uma resposta — o documento vira capa, sprints e roadmap,
     com a frase de VAZIO no lugar das seções. */
  const ENTREGAS_OUTUBRO = [
    {
      /* A continuação da frente que atravessou setembro. O cartão veio do
         documento de Agosto e Setembro com a mesma forma; só o texto e a conta
         são de outubro — e o texto de lá, que falava do prazo de 30 de setembro
         e do que viraria nova demanda, não foi trazido: aquele prazo já passou,
         e repeti-lo em outubro contaria o futuro no passado. */
      titulo: 'Tratativas do Google compliance',
      iniciativa: 'Compliance Google',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      /* `entregue` e não `andamento`: a entrega é do NOSSO lado, e é isso que o
         documento conta. O item que falta não está com o time — dizer "em
         andamento" por causa dele atribuiria à Tecnologia um trabalho que ela
         já terminou. O parágrafo diz de quem é o que resta, pra que o selo não
         fique sozinho prometendo 18 de 18. */
      status: 'entregue',
      resumo: [
        'Finalizamos 17 dos 18 itens da planilha que recebemos da agência. A única pendência é o item 11, que está com o Fabian.',
        'Chegamos ao fim do prazo do projeto com tudo o que dependia do nosso time entregue, então estamos considerando esta frente concluída do nosso lado. Quando o Fabian fechar o item 11, a planilha fica completa.',
      ],
      // A barra e o texto contam a MESMA coisa de dois jeitos: 17 feitos de 18.
      // Ao mexer num, refaça a conta no outro — em setembro o par chegou a
      // divergir, e a barra desmentia o parágrafo logo acima dela.
      progresso: { feito: 17, total: 18, rotulo: 'itens concluídos' },
      // Sem Feature no board: a planilha inteira é um item de trabalho só.
      contaFixa: 1,
      /* Mesma planilha de setembro, e o mesmo `/view`: ela é pública para
         LEITURA, e o `/edit` faz o Google avaliar se quem abre pode editar —
         quem está logado numa conta sem essa permissão cai no pedido de acesso
         em vez da planilha. Quem lê este report é leitor, não editor. */
      link: {
        href: 'https://docs.google.com/spreadsheets/d/1kC8iL2vZGl0aAy7xWdn5e6IrN2BYqe-6dYQYjKKWj6E/view?gid=0#gid=0',
        rotulo: 'Abrir a planilha de demandas',
      },
    },
  ];

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
  /* A RETRANCA da sprint — a mesma pílula do cartão do Panorama, e os mesmos
     três estados. "Em curso" em tinta cheia e o cartão um degrau acima; as
     outras em selo neutro e rentes ao bloco. O destaque mora na cor do selo e
     na elevação, não numa borda: régua à esquerda briga com o raio do cartão e
     pesa mais que o conteúdo da coluna.

     Encerrada também ganha retranca aqui, diferente do que eu tinha feito
     antes: no Panorama as três colunas são rotuladas, e um cartão sem pílula no
     meio de dois com pílula lê como peça faltando. */
  const FASE = { fechada: 'Encerrada', corrente: 'Em curso', futura: 'Próxima' };
  const ROTULO_TIPO = {
    epic: 'Épico', feature: 'Feature', pbi: 'PBI', bug: 'Bug', task: 'Task', outro: 'Item',
  };

  /* A lista de itens da sprint. É o que transformou este documento de retrato
     mensal em acompanhamento: quem abre toda semana quer saber o que está
     planejado, e um placar não responde isso.

     Mesma linha-cartão do Panorama (.lista-linhas .item-linha): selo de tipo,
     título, estado à direita. Sem link e sem #id, que é a única diferença — quem
     lê este documento não tem acesso ao DevOps, e um link que não abre é pior
     que link nenhum.

     Aqui a lista NÃO é cortada em 4 como a do Panorama. Lá ela é prévia de um
     cartão que leva ao board; aqui ela é o conteúdo, e esconder item seria
     esconder o que o leitor veio ver. */
  function itensHtml(s) {
    const dentro = Array.isArray(s.itens) ? s.itens : [];
    const fora = Array.isArray(s.transbordados) ? s.transbordados : [];
    if (!dentro.length && !fora.length) return '';
    const tipo = (x) => (ROTULO_TIPO[x.tipo] ? x.tipo : 'outro');
    /* A LINHA DE RESUMO, abaixo do título. O título da PBI é escrito pra quem
       trabalha nela — "[DESIGN] Viabilização Design System para loja Ybera.us"
       não diz nada a quem lê de fora, e este documento é lido de fora.

       Vem pronta no pacote (assets/resumos.json, embutida item a item pelo
       report.js). Item sem resumo não ganha a linha e fica só com o título: é
       a verdade sobre uma PBI que ninguém descreveu, não um buraco a tapar com
       texto inventado. */
    const li = (x, saiu) => `<li class="rt-item${saiu ? ' rt-transbordou' : ''}">
      <span class="rt-badge rt-tipo-${tipo(x)}">${esc(ROTULO_TIPO[tipo(x)])}</span>
      <span class="rt-item-nome">${esc(x.titulo)}${x.resumo
        ? `<span class="rt-item-resumo">${esc(x.resumo)}</span>` : ''}</span>
      <span class="rt-item-estado">${saiu
        ? '<span class="rt-selo-transbordo">transbordou</span>'
        : esc(x.estado || '')}</span>
    </li>`;
    return `<ul class="rt-itens">${dentro.map((x) => li(x, false)).join('')}`
      + `${fora.map((x) => li(x, true)).join('')}</ul>`;
  }

  /* O CARTÃO, com a anatomia do Panorama: retranca em cima, depois a linha
     nome + período à esquerda e placar à direita, a barra, o fio, e os itens.

     O placar segue a régua daqui, não a de lá: "2 de 5" conta o que ficou MAIS
     o que saiu, porque numa sprint encerrada dizer "2 de 2" seria verdade sobre
     a sprint de hoje e mentira sobre a que aconteceu. A sprint que não começou
     mostra o escopo na fila, como a coluna "Próxima" do Panorama. */
  function linhaHtml(s) {
    const estado = FASE[s.estado] ? s.estado : 'fechada';
    const entregues = Math.max(0, Number(s.entregues) || 0);
    const saiu = Math.max(0, Number(s.transbordaram) || 0);
    const escopo = Math.max(0, Number(s.total) || 0) + saiu;
    const pct = (n) => (escopo ? (n / escopo) * 100 : 0);
    const datas = periodoCurto(s.start, s.finish);
    const placar = estado === 'futura'
      ? (escopo ? plural(escopo, 'item', 'itens') : 'em planejamento')
      : `${entregues}/${escopo}`;
    return `<li class="rt-linha rt-${estado}">
      <span class="rt-fase">${esc(FASE[estado])}</span>
      <p class="rt-topo">
        <span class="rt-nome"><b>${esc(s.nome)}</b>${datas ? `<span class="rt-datas">${esc(datas)}</span>` : ''}</span>
        <span class="rt-placar">${esc(placar)}</span>
      </p>
      <span class="rt-barra" aria-hidden="true">
        ${estado === 'futura' ? '' : `<span class="rt-feito" style="width:${pct(entregues)}%"></span>
        <span class="rt-saiu" style="width:${pct(saiu)}%"></span>`}
      </span>
      ${saiu ? `<p class="rt-nums"><span class="rt-n rt-amb"><b>${saiu}</b> ${saiu === 1 ? 'transbordou' : 'transbordaram'}</span></p>` : ''}
      ${itensHtml(s)}
    </li>`;
  }

  /* A seção inteira, ou string vazia quando não há sprint no período.

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

  /* AS DUAS ABAS.

     O documento responde duas perguntas com ritmos diferentes: o que o time
     ENTREGOU (texto curado, escrito uma vez por mês, que congela) e o que está
     ACONTECENDO (sprints e roadmap, que mudam sozinhos). Juntas numa página só,
     a segunda empurra a primeira pra baixo e o leitor que quer uma rola pela
     outra.

     Quem troca de aba é um script na página, não este módulo: aqui é render
     puro, testado no Node, sem evento de DOM. Ele esconde as seções pelo id —
     `ritmo` e `roadmap` são de Acompanhar, todas as outras são de Entregas.
     Sem o script as duas aparecem empilhadas, que é o documento de antes: a
     aba é melhoria de leitura, não requisito pra ele fazer sentido.

     Botões com `aria-pressed`, e não um widget de abas com role="tab": os
     painéis não são dois contêineres, são conjuntos de seções que já saem do
     documento com `hidden` quando escondidas. Fingir um widget que não existe
     seria pior pro leitor de tela do que dizer a verdade — dois botões, um
     deles ativo. */
  /* As abas moram ANTES da capa. Postas no meio do documento — depois do logo,
     do título e dos dois números —, o leitor já tinha se comprometido com uma
     leitura quando descobria que havia uma escolha. Navegação depois do
     conteúdo quase nunca funciona.

     E porque elas vêm antes, a CAPA pertence à aba: em Acompanhar o título
     dizer "Entregas de Outubro" seria meia verdade. Cada aba carrega o texto
     que a capa deve mostrar; o que ela NÃO declara fica como o base escreveu —
     é assim que a aba Entregas não precisa repetir string nenhuma do documento
     original, e as duas não têm como divergir. */
  const ABAS = [
    { id: 'entregas', rotulo: 'Entregas' },
    {
      id: 'acompanhar',
      rotulo: 'Acompanhar',
      titulo: 'Acompanhamento de',
      situacao: 'O que está em curso nas sprints do período, e o planejamento dos próximos meses.',
    },
  ];
  const ABA_PADRAO = 'entregas';
  // As seções que pertencem a Acompanhar. Quem não está aqui é de Entregas —
  // assim uma frente nova entra sem ninguém precisar lembrar desta lista.
  const SECOES_ACOMPANHAR = ['ritmo', 'roadmap'];
  /* Os dois números da capa são de ENTREGAS: contam cartões curados e PBIs
     fechados sob as Features que eles citam. Em Acompanhar não dizem nada sobre
     o que está em curso — e, pior, dizem ZERO ao lado de duas sprints com itens
     na tela, que lê como contradição. Então eles acompanham a aba deles.

     É seletor e não id porque o bloco é do documento base: ele não tem id, e
     dar um a ele seria mexer no relatório de Agosto e Setembro. */
  const SO_EM_ENTREGAS = '.rl-bento-capa';

  /* AS EDIÇÕES, pro seletor do cabeçalho. A sem `url` é esta.

     Ele NAVEGA, não redesenha. A edição de Agosto e Setembro é outro arquivo
     (entregas.html) com a lista curada dentro dele, e o que ela consegue
     exportar são só os campos de contagem — sem `resumo` e sem `imagens`.
     Redesenhá-la aqui produziria títulos com selo e nenhum texto nem tela: uma
     versão capenga de um relatório que já foi publicado e lido.

     Fica no cabeçalho, visível nas duas abas, porque a edição é do DOCUMENTO
     inteiro e não de uma parte dele — como as próprias abas. */
  const EDICOES = [
    { rotulo: 'Outubro de 2026' },
    { rotulo: 'Agosto e Setembro de 2026', url: 'entregas.html' },
  ];

  /* O que cada aba diz quando não tem seção nenhuma. A de Entregas é o caso
     real de hoje — outubro começou sem cartão escrito —, e sem ela a aba abre
     com capa, abas e rodapé, que lê como documento quebrado. A frase é escrita
     pra quem LÊ, não pra quem mantém: "ainda sendo escritas" é informação sobre
     o mês, não um aviso de sistema. */
  const VAZIO = {
    entregas: 'As entregas deste período ainda estão sendo escritas.',
    acompanhar: 'Nenhuma sprint fechou ou começou neste período.',
  };

  function abasHtml() {
    const botoes = ABAS.map((a) => `<button type="button" class="rl-aba" data-aba="${a.id}"`
      + (a.titulo ? ` data-titulo="${esc(a.titulo)}"` : '')
      + (a.situacao ? ` data-situacao="${esc(a.situacao)}"` : '')
      + ` aria-pressed="${a.id === ABA_PADRAO}">${esc(a.rotulo)}</button>`).join('');
    /* O seletor de edição ocupa o mesmo encaixe que o seletor de mês ocupa no
       report v2 — fim da pílula, com a mesma moldura. `value` é o endereço:
       vazio é esta edição, e o script só navega quando vem preenchido. Assim o
       seletor não precisa saber qual é a atual: ela é a única sem para onde ir. */
    const opcoes = EDICOES.map((e) => `<option value="${esc(e.url || '')}"`
      + `${e.url ? '' : ' selected'}>${esc(e.rotulo)}</option>`).join('');
    const selecionar = EDICOES.length > 1
      ? `<div class="rl-mes-borda"><select class="rl-edicao rl-mes" aria-label="Edição do relatório">${opcoes}</select></div>`
      : '';
    /* A PÍLULA DE VIDRO do report v2, no mesmo lugar que ela ocupa lá: logo
       depois da capa, flutuando e grudando no topo quando a página rola. Sem
       cabeçalho próprio — a capa deste documento é a mesma do relatório de
       Agosto e Setembro, com a marca dentro dela, e um segundo topo acima
       disputaria com ela.

       Aqui dentro vão BOTÕES, não âncoras como lá. A diferença é de função: no
       report v2 o menu é sumário de um documento corrido e cada item rola até
       uma seção; aqui ele troca entre duas partes que não convivem na tela — e
       é a troca que faz a capa mudar junto. Âncora prometeria rolagem e
       entregaria outra coisa. */
    return `<nav class="rl-nav rl-abas" aria-label="Partes do documento"`
      + ` data-acompanhar="${SECOES_ACOMPANHAR.join(' ')}"`
      + ` data-so-entregas="${esc(SO_EM_ENTREGAS)}">`
      + `<div class="rl-nav-borda"><div class="rl-nav-int">${botoes}${selecionar}</div></div>`
      + `</nav>`;
  }

  // As frases de aba vazia moram no CORPO, com as seções que elas substituem —
  // a barra de abas fica fora dele, no topo da página.
  function vaziosHtml() {
    return ABAS.map((a) => `<p class="rl-aba-vazia mudo" data-de="${a.id}" hidden>${esc(VAZIO[a.id] || '')}</p>`).join('');
  }

  /* A costura. Falha fechada de propósito: sem a âncora, devolve o documento
     intacto em vez de pendurar a seção num lugar qualquer. Um documento sem a
     seção ainda está certo; a seção no lugar errado, não. */
  function injetar(html, secao, ancora, antes) {
    const alvo = ancora || ANCORA;
    const i = html.indexOf(alvo);
    if (i < 0) return html;
    const corte = antes ? i : i + alvo.length;
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
    /* Duas costuras, em dois lugares, porque as peças pertencem a alturas
       diferentes do documento:

       a PÍLULA entra entre a capa e o corpo, como no report v2 — e é ela que
       faz a capa mudar, porque a capa pertence à parte escolhida;

       as frases de vazio e a seção de sprints entram no topo do CORPO. */
    let html = injetar(r.html, abasHtml(), ANCORA, true);
    html = injetar(html, vaziosHtml() + secaoRitmo((o || {}).sprints));
    return Object.assign({}, r, { html });
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
    /* O material bruto das entregas do mês, no bloco local do pacote. A
       ferramenta vem do base (entregasConcluidas) e os dois documentos a
       enxergam; só esta edição declara que a quer. O relatório de Agosto e
       Setembro já foi escrito e publicado — não se reescreve. */
    precisaDeEntregas: true,
    arquivoDeDados: ARQUIVO_DE_DADOS,
    periodoDoDocumento: () => PERIODO.slice(),
    cartoesDoDocumento: () => ENTREGAS_OUTUBRO.map((c) => Object.assign({}, c)),
    // Expostos pro teste medir a costura sem reimplementá-la.
    secaoRitmo,
    abasHtml,
    vaziosHtml,
    injetar,
    EDICOES,
    ANCORA,
    PERIODO,
    ABAS,
    ABA_PADRAO,
    SECOES_ACOMPANHAR,
    SO_EM_ENTREGAS,
  });
});
