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
   sprint pra documento que declara `precisaDeSprints`. O report-v2.html não
   declara e segue sem gastar requisição. O que chega aqui
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
  const api = factory(base, noNode ? null : root);
  if (noNode) module.exports = api;
  else root.CentralBriefing = api;
})(typeof self !== 'undefined' ? self : this, function (base, root) {
  'use strict';

  // Reaproveitado do base: um escape só no documento, senão são duas regras
  // de escapar a mesma coisa.
  const esc = base.esc;

  const ANCORA = '<div class="rl-corpo">';

  /* O RELATÓRIO ÚNICO DE ENTREGAS, com todas as edições.

     Até 14/10/2026 eram dois: este, de outubro, e o entregas.html, de agosto e
     setembro, cada um com os cartões escritos dentro do próprio código. O
     seletor de edição daqui NAVEGAVA para a outra página, porque redesenhar
     agosto aqui produziria títulos sem texto nem tela — os cartões daquela
     edição estavam presos no outro arquivo. Desde que os cartões viraram dado
     (assets/conteudo/<po>/edicoes/<edicao>.json), as duas edições são o mesmo
     desenho com entradas diferentes, e o Urlan pediu que virassem um relatório
     só, no modelo deste: Entregas · Acompanhar · seletor de mês.

     Cada edição declara três coisas:
     - `periodo`: os meses que ela cobre — vira o título da capa e o recorte
       das contagens e das sprints;
     - `arquivoDeDados`: o endereço fixo do que o "Publicar dados" grava, que é
       o que quem abre sem token lê. Documento de acompanhamento: a mesma pessoa
       abre o mesmo endereço toda semana, e a publicação é que troca;
     - `id`: o nome do arquivo de cartões e o valor de `?edicao=` no endereço.

     A LISTA SE MONTA PELA DATA (14/10/2026). Antes, cada mês novo era uma
     entrada escrita à mão aqui, e o relatório só ganhava novembro quando
     alguém lembrasse de pedir. Agora todo mês de outubro de 2026 até o mês
     corrente é uma edição — mês futuro nunca aparece. Agosto/setembro é a
     única edição de dois meses e fica escrita, no fim.

     O arquivo de dados segue o padrão `assets/dados-AAAA-MM.json`. Outubro é a
     exceção: nasceu `dados-outubro.json`, e é esse o endereço que o documento
     já publicado serve — trocar o nome deixaria o link de hoje em 404. O
     publicar-dados.sh lê os nomes declarados aqui e aceita o padrão.

     A ordem é do mais novo para o mais antigo. QUAL ABRE sem `?edicao=` não é
     decidido aqui: é a mais recente que já tem conteúdo, e saber isso exige
     perguntar ao servidor — o report.js pergunta e chama `escolherEdicao`. */
  const PRIMEIRO_MES = '2026-10';
  const NOMES_ANTIGOS = {
    '2026-10': { arquivoDeDados: 'assets/dados-outubro.json' },
  };
  const MES_LONGO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MES_TRES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const AGO_SET = {
    id: '2026-08',
    rotulo: 'Agosto e Setembro de 2026',
    rotuloCurto: 'Ago–Set 2026',
    periodo: ['2026-08', '2026-09'],
    arquivoDeDados: 'assets/dados-ago-set.json',
    /* CONGELADA PARA QUEM A PUBLICOU, e só para essa pessoa (28/10/2026).

       Esta edição nasceu quando a ferramenta tinha um usuário só: é a única sem
       `aoVivo` e sem `cartoesAutomaticos`, e o arquivo dela não leva nome de PO
       porque não havia outra. O documento do Urlan foi publicado e
       compartilhado — mexer nele agora mudaria número que já foi lido.

       Para as outras POs nunca houve documento a congelar. Elas pediam
       `dados-ago-set-<po>.json`, tomavam 404 e liam "ainda não foi publicado" —
       uma instrução impossível de cumprir, porque a edição não busca nada. Para
       elas a edição passa a funcionar como qualquer outro mês: ao vivo e com
       cartões automáticos.

       A chave é quem publicou, e não uma lista de quem está de fora: no dia em
       que outra PO publicar o ago/set dela, é o arquivo dela que vale, e nada
       aqui precisa mudar. */
    congeladaPara: 'urlan',
  };

  /* A edição está congelada PARA ESTA PESSOA? Só então ela deixa de buscar ao
     vivo e de montar cartão automático.

     SEM SABER QUEM É, VALE O CONGELADO. Descongelar no escuro trocaria um
     documento publicado e lido por uma reconstrução ao vivo — e quem abre um
     link antigo espera o que foi compartilhado. Só uma PO explicitamente
     diferente de quem publicou destrava a edição. */
  function congeladaPara(e, chave) {
    if (!e || !e.congeladaPara) return false;
    const k = String(chave || '');
    return !k || k === e.congeladaPara;
  }

  function edicaoDoMes(id) {
    const ano = id.slice(0, 4);
    const m = Number(id.slice(5, 7)) - 1;
    return Object.assign({
      id,
      rotulo: MES_LONGO[m] + ' de ' + ano,
      rotuloCurto: MES_TRES[m] + ' ' + ano,
      periodo: [id],
      // Os cartões automáticos valem dos meses gerados pela data em diante.
      // Agosto/setembro não: relatório fechado e já compartilhado.
      cartoesAutomaticos: true,
      /* A janela das entregas se alinha às sprints desta edição: do começo da
         primeira que fecha no mês até o fim da última (22/10/2026). Só nas
         edições geradas pelo calendário — agosto/setembro é documento fechado
         e já compartilhado, e mexer na janela dele mudaria número publicado. */
      janelaPorSprint: true,
      // Lida da função da Vercel (api/relatorio), ao vivo, por quem não tem
      // token. Agosto/setembro não: fechado, continua no arquivo publicado.
      aoVivo: true,
      // Crase e não aspa: o publicar-dados.sh lê os nomes FIXOS por aspa simples,
      // e este é o padrão, que ele aceita por conta própria.
      arquivoDeDados: `assets/dados-${id}.json`,
    }, NOMES_ANTIGOS[id] || {});
  }

  // As edições que existem em `agora`: do mês corrente até outubro de 2026,
  // mais agosto/setembro. Mês pela data LOCAL — no Brasil, 31/10 às 22h ainda é
  // outubro, e em UTC já seria novembro.
  /* O MÊS SEGUINTE JÁ ENTRA NA LISTA (26/10/2026).

     A sprint 22 começou em 26/10 e fecha em novembro, então ela pertence à
     edição de novembro — que só existiria no dia 1º. De 24/10 até lá a sprint
     em curso não aparecia em relatório NENHUM: nem no de outubro, porque ela
     não fecha nele, nem no de novembro, porque ele não existia. Era a última
     régua de calendário que tinha sobrado depois de o conteúdo passar a ser
     cortado por sprint.

     Entra sempre, e não "quando a sprint começa": a lista é montada antes de
     qualquer dado do board, aqui e na função da Vercel, que valida o parâmetro
     antes de consultar o DevOps. O preço é uma entrada a mais no seletor nas
     primeiras semanas do mês, abrindo um documento que diz, com todas as
     letras, que nenhuma sprint começou nele. Quem decide qual edição ABRE por
     padrão é outro critério, o de ter conteúdo — e sprint em curso conta. */
  function edicoesAte(agora) {
    const d = agora instanceof Date && !Number.isNaN(agora.getTime()) ? agora : new Date();
    const lista = [];
    let ano = d.getFullYear();
    let mes = d.getMonth();
    const seguinte = mes === 11
      ? (ano + 1) + '-01'
      : ano + '-' + String(mes + 2).padStart(2, '0');
    /* `proxima` existe por UMA razão: a edição que abre sem `?edicao=` é a
       primeira da lista, e o mês seguinte não pode ser essa. Ele costuma estar
       vazio, e um documento que abre vazio lê como quebrado. Ele fica na
       lista — pro seletor e pra função aceitarem — e fora do padrão. */
    lista.push(Object.assign(edicaoDoMes(seguinte), { proxima: true }));
    for (;;) {
      const id = ano + '-' + String(mes + 1).padStart(2, '0');
      if (id < PRIMEIRO_MES) break;
      lista.push(edicaoDoMes(id));
      if (mes === 0) { ano -= 1; mes = 11; } else mes -= 1;
    }
    if (!lista.length) lista.push(edicaoDoMes(PRIMEIRO_MES));
    return lista.concat([AGO_SET]);
  }

  /* Fora do navegador (os testes), o relógio é fixo em 14/10/2026: teste que
     depende do calendário passa hoje e quebra no mês que vem sem ninguém ter
     mexido em nada. Quem quer outro mês chama `edicoesAte` com a data. */
  const EDICOES = edicoesAte(root ? new Date() : new Date(2026, 9, 14));

  /* A edição que este carregamento da página mostra. Sai do endereço
     (`?edicao=2026-08`); sem ele, ou com um id que não existe, a primeira da
     lista — até o report.js descobrir qual é a mais recente com conteúdo
     (`escolherEdicao`). Id inventado não pode virar caminho de arquivo, então
     só vale o que está na lista.

     Fixada antes do primeiro desenho: trocar de edição recarrega a página (ver
     o seletor), e é isso que deixa o report.js sem saber que edições existem —
     ele continua lendo `edicao`, `arquivoDeDados` e `periodoDoDocumento()`. */
  function idDaUrl(search) {
    try { return new URLSearchParams(search || '').get('edicao') || ''; } catch (e) { return ''; }
  }
  // Sem `?edicao=`, a primeira que NÃO é o mês seguinte: ver `proxima`.
  const PADRAO = EDICOES.find((e) => e.proxima !== true) || EDICOES[0];
  function edicaoDaUrl(search) {
    return EDICOES.find((e) => e.id === idDaUrl(search)) || PADRAO;
  }
  // O endereço PEDIU uma edição que existe? Aí ninguém escolhe por ele.
  function edicaoPedidaNaUrl(search) {
    return EDICOES.some((e) => e.id === idDaUrl(search));
  }
  let ATIVA = edicaoDaUrl(root && root.location ? root.location.search : '');
  function escolherEdicao(id) {
    const e = EDICOES.find((x) => x.id === id);
    if (e) ATIVA = e;
    return ATIVA;
  }

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
     fecha: "2 de 5 entregues, 3 transbordaram para a sprint seguinte" se lê
     inteira. Dizer só "2 de 2"
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
  /* As quatro etapas da Central, e são elas que PINTAM o selo — o texto dele é
     o estado cru do board ("Done", "In Progress", "Testing"). Vocabulário
     fechado: família fora da lista sai sem classe, e o selo fica neutro em vez
     de verde. */
  const FAMILIAS = ['todo', 'andamento', 'atencao', 'feito'];

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
    /* PACOTE ANTIGO NÃO TINHA `familia` — nem o arquivo de dados publicado
       antes desta mudança, nem link já compartilhado. Sem a volta pelo `feito`,
       que SEMPRE viajou, esses dois sairiam com a lista inteira em cinza, e o
       documento perderia exatamente o que esta mudança foi fazer. O que o
       pacote velho não sabe dizer é a diferença entre "To Do" e "In Progress":
       os dois ficam neutros, que é a verdade sobre um dado que não veio. */
    const fam = (x) => {
      if (FAMILIAS.includes(x.familia)) return ' rt-fam-' + x.familia;
      return x.feito ? ' rt-fam-feito' : '';
    };
    /* A LINHA DE RESUMO, abaixo do título. O título da PBI é escrito pra quem
       trabalha nela — "[DESIGN] Viabilização Design System para loja Ybera.us"
       não diz nada a quem lê de fora, e este documento é lido de fora.

       Vem pronta no pacote (assets/resumos.json, embutida item a item pelo
       report.js). Item sem resumo não ganha a linha e fica só com o título: é
       a verdade sobre uma PBI que ninguém descreveu, não um buraco a tapar com
       texto inventado. */
    /* O SELO É O ESTADO, e só ele. Antes a linha abria com um selo de tipo
       ("PBI", "Bug") e o estado ia no fim, em cinza miúdo, como anotação. Era
       a hierarquia trocada: o tipo não muda decisão nenhuma pra quem lê de
       fora — todos os itens da lista são trabalho da sprint —, enquanto o
       estado é o que a pessoa abriu o documento pra saber. O peso visual foi
       pro estado e o selo de tipo saiu.

       O texto é o do board, não um rótulo traduzido: "Testing" e "In Progress"
       são estados diferentes e o leitor quer a diferença. Quem agrupa é a COR,
       pela família — os dois saem do mesmo tom porque nenhum dos dois está
       pronto. Traduzir custaria um dicionário de todo estado que o board pode
       ter, e o estado novo que ninguém mapeasse sairia em branco. */
    const li = (x, saiu) => `<li class="rt-item${saiu ? ' rt-transbordou' : ''}">
      <span class="rt-item-nome">${esc(x.titulo)}${x.resumo
        ? `<span class="rt-item-resumo">${esc(x.resumo)}</span>` : ''}</span>
      <span class="rt-item-estado${saiu ? '' : fam(x)}">${saiu
        ? 'Transbordou'
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
    const itens = itensHtml(s);
    /* O QUE O CARTÃO MOSTRA FECHADO: selo, nome, datas, placar, barra e a linha
       de transbordo. Some só a lista de itens — o resto é o que responde "em
       que pé está", e esconder isso tornaria o cartão fechado inútil. */
    const cabeca = (dobra) => `<span class="rt-cab">
        <span class="rt-fase">${esc(FASE[estado])}</span>
        ${dobra ? '<span class="rt-seta" aria-hidden="true"></span>' : ''}
      </span>
      <span class="rt-topo">
        <span class="rt-nome"><b>${esc(s.nome)}</b>${datas ? `<span class="rt-datas">${esc(datas)}</span>` : ''}</span>
        <span class="rt-placar">${esc(placar)}</span>
      </span>
      <span class="rt-barra" aria-hidden="true">
        ${estado === 'futura' ? '' : `<span class="rt-feito" style="width:${pct(entregues)}%"></span>
        <span class="rt-saiu" style="width:${pct(saiu)}%"></span>`}
      </span>
      ${saiu ? `<span class="rt-nums"><span class="rt-n rt-amb"><b>${saiu}</b> ${saiu === 1 ? 'transbordou' : 'transbordaram'} para a sprint seguinte</span></span>` : ''}`;
    /* SEM ITENS NÃO HÁ O QUE DOBRAR, e aí o cartão não vira `details`: seta que
       abre o nada é promessa falsa, e `summary` vazio ainda recebe foco do
       teclado — o leitor tabula até um controle que não faz coisa alguma.

       A seta também não sai — ela é a afordância DA dobra, e desenhada num
       cartão que não abre ela promete conteúdo que não existe.

       `<span>` no lugar de `<p>`: o conteúdo permitido num `<summary>` é
       phrasing content, e parágrafo não é. Os dois eram `<p>` e o desenho não
       muda (as duas regras são flex na folha), mas um `<p>` ali deixaria o
       documento inválido e o browser reorganizaria a árvore por conta dele. */
    if (!itens) return `<li class="rt-linha rt-${estado}">${cabeca(false)}</li>`;
    /* ENCERRADA NASCE FECHADA. O que já terminou não é o que o leitor veio
       conferir, e duas sprints abertas de uma vez empurram a segunda pra fora
       da tela — foi o problema que esta dobra resolve. */
    const aberta = estado !== 'fechada' ? ' open' : '';
    return `<li class="rt-linha rt-${estado}">
      <details class="rt-dobra"${aberta}>
        <summary class="rt-resumo">${cabeca(true)}</summary>
        ${itens}
      </details>
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

  /* O seletor de edição fica no cabeçalho, visível nas duas abas, porque a
     edição é do DOCUMENTO inteiro e não de uma parte dele — como as próprias
     abas. A lista é a de cima (EDICOES). */

  /* O que cada aba diz quando não tem seção nenhuma. A de Entregas é o caso
     real de hoje — outubro começou sem cartão escrito —, e sem ela a aba abre
     com capa, abas e rodapé, que lê como documento quebrado. A frase é escrita
     pra quem LÊ, não pra quem mantém: "ainda sendo escritas" é informação sobre
     o mês, não um aviso de sistema. */
  const VAZIO = {
    entregas: 'As entregas deste período ainda estão sendo escritas.',
    acompanhar: 'Nenhuma sprint fechou ou começou neste período.',
  };

  /* MÊS CURTO NO BOTÃO, NOME INTEIRO NA LISTA (14/10/2026). "Agosto e
     Setembro de 2026" fechado ocupava metade da pílula; "Ago–Set 2026" diz o
     mesmo. Aberta a lista, há espaço, e o nome inteiro lê melhor.

     Mostrar um texto no botão e outro na lista só dá com o <select>
     customizável (`appearance: base-select`): a opção leva os dois rótulos e o
     CSS esconde um de cada lado. Onde ele não existe, a opção não pode ter
     marcação dentro — o navegador juntaria os dois textos —, então vai só o
     curto, com o nome inteiro no aria-label para o leitor de tela.

     O `label` da opção rica é a rede de proteção: se a lista sair desenhada
     pelo sistema (navegador que customiza o botão mas não o popup), é o label
     que ela mostra — o nome inteiro, e não os dois rótulos colados. */
  const SELECT_RICO = !!(root && root.CSS && typeof root.CSS.supports === 'function'
    && root.CSS.supports('appearance', 'base-select'));

  function abasHtml(rico = SELECT_RICO) {
    const botoes = ABAS.map((a) => `<button type="button" class="rl-aba" data-aba="${a.id}"`
      + (a.titulo ? ` data-titulo="${esc(a.titulo)}"` : '')
      + (a.situacao ? ` data-situacao="${esc(a.situacao)}"` : '')
      + ` aria-pressed="${a.id === ABA_PADRAO}">${esc(a.rotulo)}</button>`).join('');
    /* O seletor de edição ocupa o mesmo encaixe que o seletor de mês ocupa no
       report v2 — fim da pílula, com a mesma moldura. `value` é o id da
       edição; o script da página troca o `?edicao=` do endereço e recarrega. */
    const opcoes = EDICOES.map((e) => `<option value="${esc(e.id)}"`
      + `${e.id === ATIVA.id ? ' selected' : ''}`
      + (rico
        ? ` label="${esc(e.rotulo)}"><span class="rl-ed-curto">${esc(e.rotuloCurto)}</span><span class="rl-ed-longo">${esc(e.rotulo)}</span></option>`
        : ` aria-label="${esc(e.rotulo)}">${esc(e.rotuloCurto)}</option>`)).join('');
    const botao = rico ? '<button type="button"><selectedcontent></selectedcontent></button>' : '';
    const selecionar = EDICOES.length > 1
      ? `<div class="rl-mes-borda"><select class="rl-edicao rl-mes" aria-label="Edição do relatório">${botao}${opcoes}</select></div>`
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

  /* O CARTÃO AUTOMÁTICO de uma frente: título da Feature, a lista do que
     fechou nela no período, e a conta FIXA no que fechou no período.

     `contaFixa`, e não `featureIds` na conta: a contagem por Feature do base é
     de TUDO que a frente já entregou, e num relatório de mês uma Feature com
     13 PBIs de história somaria 13 na capa por causa de uma que fechou agora.
     O `featureIds` continua no cartão, mas só pra dizer de que frente ele é.

     O "[EUA]" e afins no começo do nome da Feature saem: é etiqueta de board,
     e o leitor já sabe de que loja é o relatório. */
  const semEtiqueta = (t) => String(t || '').replace(/^(\s*\[[^\]]*\]\s*)+/, '').trim() || String(t || '');

  function cartaoAutomatico(fr, iniciativa) {
    const cartao = {
      titulo: semEtiqueta(fr.feature.nome),
      produto: fr.epico ? fr.epico.nome : '',
      featureIds: [fr.feature.id],
      contaFixa: fr.itens.length,
      entregues: fr.itens,
      /* O SELO DO CARTÃO AUTOMÁTICO (22/10/2026). Sem ele, uma frente que
         entregou um item e continua rodando mostrava aquela entrega sozinha, e
         o leitor concluía que a frente tinha acabado — foi o que o Urlan viu no
         cartão do Subscription. "entregue" só quando não sobrou PBI em aberto;
         fora isso, a frente segue. Os dois valores são os mesmos que o cartão
         escrito usa, porque o leitor não tem por que aprender dois vocabulários
         no mesmo documento. */
      automatico: true,
    };
    /* Só quando o pacote SABE. Sem o campo (pacote antigo, edição congelada),
       nada de selo: "em andamento" sobre frente que já fechou é pior que selo
       nenhum, e o documento calado continua verdadeiro. */
    if (typeof fr.fechada === 'boolean') cartao.status = fr.fechada ? 'entregue' : 'andamento';
    // Quantas PBIs da frente seguem abertas — a retranca da seção soma isto.
    if (typeof fr.abertas === 'number') cartao.abertas = fr.abertas;
    /* A linha do roadmap a que esta Feature pertence, quando o roadmap a
       declara. É o que tira a frente de "Outras entregas" e a põe na conta de
       projeto do roadmap da capa — sem o PO escrever cartão à mão e sem perder
       a lista de PBIs, que continua aqui dentro. */
    if (iniciativa) cartao.iniciativa = iniciativa;
    return cartao;
  }

  /* Feature → título da linha do roadmap. Uma Feature declarada em duas linhas
     fica com a primeira: o cartão mora numa seção só, e escolher em silêncio é
     melhor que duplicá-lo em duas. */
  function iniciativaPorFeature(roadmap) {
    const mapa = new Map();
    for (const it of (Array.isArray(roadmap) ? roadmap : [])) {
      for (const id of (Array.isArray(it && it.featureIds) ? it.featureIds : [])) {
        if (!mapa.has(Number(id))) mapa.set(Number(id), it.titulo);
      }
    }
    return mapa;
  }

  /* Os escritos primeiro, depois os automáticos das frentes que nenhum cartão
     escrito cobre. "Cobrir" é declarar a Feature em `featureIds`: é o jeito de
     o PO dizer "esta frente eu escrevi", e o automático sai da frente dele.

     COBRIR PASSOU A SER ADOTAR (26/10/2026). Antes o automático sumia inteiro,
     e com ele a lista de PBIs entregues — o PO escolhia entre o contexto que
     ele escreveu e a lista que se mantém sozinha. Era a escolha errada de
     oferecer: o cartão do "Novo app de brindes" explicava a iniciativa toda
     enquanto a Feature dela entregava um bug em "Outras entregas", como se
     fossem dois assuntos.

     Agora o escrito ABSORVE as entregas das frentes que declara. Tudo o mais
     continua dele — título, texto, selo, iniciativa, contagem —, porque
     declarar a Feature é dizer "esta frente eu escrevi", e o que foi escrito
     ganha do que foi gerado. Só a lista vem de fora, e só quando ele não trouxe
     a própria. */
  /* UM CARTÃO POR PBI ENTREGUE, quando a frente pede (26/10/2026).

     O cartão com lista dentro responde "o que esta frente entregou". Para uma
     frente larga — "Melhorias no checkout", cinco PBIs que vão de limite de
     caractere a meio de pagamento — a lista vira um bloco onde cada entrega
     some dentro da anterior. Nesse caso cada entrega vale um cartão, e a frente
     vira a seção que os reúne.

     Cada cartão conta 1: a soma da capa é a mesma de antes, quando um cartão
     contava os cinco. Muda o desenho, não a conta.

     Todos são `entregue` porque estão na lista do que FECHOU no período. O que
     esta forma não diz é que a frente continua — o cartão com lista dizia, no
     selo. Quem precisar do aviso usa a forma com lista. */
  function cartoesPorItem(fr, ficha) {
    return (fr.itens || []).map((it) => {
      const cartao = {
        titulo: it.titulo,
        featureIds: [fr.feature.id],
        contaFixa: 1,
        status: 'entregue',
        automatico: true,
      };
      if (it.resumo) cartao.resumo = [it.resumo];
      if (ficha.iniciativa) cartao.iniciativa = ficha.iniciativa;
      if (ficha.foraDoRoadmap) cartao.foraDoRoadmap = true;
      return cartao;
    });
  }

  function comAutomaticos(escritos, automaticos, roadmap, frentes, chavePO) {
    if (!Array.isArray(automaticos) || !automaticos.length) return escritos;
    /* A edição congelada não monta cartão automático — mas só para quem a
       congelou. Quem não publicou aquele documento vê o mês como qualquer
       outro. */
    if (!ATIVA.cartoesAutomaticos && congeladaPara(ATIVA, chavePO)) return escritos;
    if (!ATIVA.cartoesAutomaticos && !ATIVA.congeladaPara) return escritos;
    const fichas = (frentes && typeof frentes === 'object') ? frentes : {};
    /* Feature → as entregas dela. Um cartão pode declarar várias Features, e
       duas Features podem ter entregado no mesmo período: a lista do cartão é a
       soma, na ordem em que ele declarou. */
    const entregasDaFeature = new Map();
    const abertasDaFeature = new Map();
    for (const fr of automaticos) {
      if (!fr || !fr.feature) continue;
      entregasDaFeature.set(Number(fr.feature.id), Array.isArray(fr.itens) ? fr.itens : []);
      if (typeof fr.abertas === 'number') abertasDaFeature.set(Number(fr.feature.id), fr.abertas);
    }
    const cobertas = new Set();
    const adotados = escritos.map((c) => {
      const ids = Array.isArray(c.featureIds) ? c.featureIds.map(Number).filter((n) => Number.isFinite(n)) : [];
      for (const f of ids) cobertas.add(f);
      /* Lista própria manda: se o PO escreveu os itens à mão, foi porque quis
         dizer outra coisa que não "o que o board fechou". */
      if (!ids.length || (Array.isArray(c.entregues) && c.entregues.length)) return c;
      const vindas = ids.reduce((acc, f) => acc.concat(entregasDaFeature.get(f) || []), []);
      /* Adotar é adotar inteiro: junto das entregas vem quantas PBIs daquelas
         Features seguem abertas. Sem isto, o cartão escrito dizia o que
         entregou e calava sobre o que falta — que é a razão de o número
         existir. O escrito manda, então um `abertas` próprio não é tocado. */
      const abertas = ids.reduce((acc, f) => {
        const n = abertasDaFeature.get(f);
        return typeof n === 'number' ? acc + n : acc;
      }, null);
      if (!vindas.length && abertas === null) return c;
      const extra = {};
      if (vindas.length) extra.entregues = vindas;
      if (abertas !== null && typeof c.abertas !== 'number') extra.abertas = abertas;
      return Object.assign({}, c, extra);
    });
    const porFeature = iniciativaPorFeature(roadmap);
    const novos = [];
    for (const fr of automaticos) {
      if (!fr || !fr.feature || cobertas.has(Number(fr.feature.id))) continue;
      /* A ficha do PO manda na seção; sem ela vale a linha do roadmap, que é
         como era antes de a ficha existir. */
      const ficha = fichas[String(fr.feature.id)] || null;
      if (ficha && ficha.porItem) { novos.push.apply(novos, cartoesPorItem(fr, ficha)); continue; }
      const declarada = (ficha && ficha.iniciativa) || porFeature.get(Number(fr.feature.id)) || '';
      /* O ÉPICO COMO ÚLTIMO RECURSO (28/10/2026).

         Sem ficha e sem linha de roadmap, a frente caía em "Outras entregas" —
         e para quem ainda não escreveu nada, isso é o relatório inteiro num
         bloco só. A Isadora tinha onze frentes de outubro empilhadas ali.

         O épico já vem no pacote e ninguém o usava. Ele agrupa em "Loja Interna
         BR", "Ecommerce Brasil", "Middleware Ybera" — nomes que o time escreveu
         no board e que dizem mais que "Outras entregas". "Outras entregas" volta
         a guardar o que ele deveria: o que não tem épico nenhum.

         FORA DO ROADMAP, sempre: épico é organização do board, não promessa de
         projeto. A capa diz "Projetos do roadmap contemplados" e isso se confere
         contra as barras — uma seção nascida de épico não tem barra lá, e contar
         faria a capa afirmar projeto que o leitor não acha.

         ÚLTIMO e não primeiro: a ficha e a linha de roadmap ganham dele. É o que
         faz a ficha virar exceção em vez de obrigação — quem quiser nomear uma
         seção continua podendo, e quem não quiser já tem um nome. */
      /* ÉPICO DE VERDADE, e não a Feature se repetindo. Quando o item não tem
         épico acima dele, o pacote devolve a própria Feature nesse campo — e aí
         a seção nascia com o nome do cartão que está dentro dela, com etiqueta
         de board e tudo: "[EUA] Identificação da parceira no pedido" sobre um
         cartão de mesmo nome. Seção que repete o cartão não agrupa nada.

         Sem épico de verdade, "Outras entregas" é a resposta honesta. */
      const epicoReal = (fr.epico && fr.epico.nome && Number(fr.epico.id) !== Number(fr.feature.id))
        ? semEtiqueta(fr.epico.nome) : '';
      const doEpico = declarada ? '' : epicoReal;
      const cartao = cartaoAutomatico(fr, declarada || doEpico);
      if ((ficha && ficha.foraDoRoadmap) || doEpico) cartao.foraDoRoadmap = true;
      novos.push(cartao);
    }
    return adotados.concat(novos);
  }

  /* O período e os cartões DESTA edição vão pro base como opção. Quem chamou
     manda — é assim que os testes fixam um recorte sem depender do calendário,
     e é o mesmo contrato que o base já oferecia. */
  function htmlReport(o) {
    const entrada = Object.assign({}, o, {
      periodo: (o && Array.isArray(o.periodo) && o.periodo.length) ? o.periodo : ATIVA.periodo,
      cartoes: comAutomaticos((o && Array.isArray(o.cartoes)) ? o.cartoes : [],
        (o || {}).automaticos, (o || {}).roadmap, (o || {}).frentes, (o || {}).chavePO),
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
  const modulo = Object.assign({}, base, {
    htmlReport,
    precisaDeSprints: true,
    /* O material bruto das entregas do mês, no bloco local do pacote. A
       ferramenta vem do base (entregasConcluidas); este documento declara que
       a quer, em qualquer edição. */
    precisaDeEntregas: true,
    periodoDoDocumento: () => ATIVA.periodo.slice(),
    /* Quem monta o pacote pergunta aqui se esta edição corta por sprint. Mora
       no módulo da edição porque é ele que sabe qual edição está ativa. */
    janelaPorSprint: () => ATIVA.janelaPorSprint === true,
    escolherEdicao,
    edicaoPedidaNaUrl,
    edicoesAte,
    comAutomaticos,
    // Expostos pro teste medir a costura sem reimplementá-la.
    secaoRitmo,
    abasHtml,
    vaziosHtml,
    injetar,
    EDICOES,
    congeladaPara,
    edicaoDaUrl,
    ANCORA,
    ABAS,
    ABA_PADRAO,
    SECOES_ACOMPANHAR,
    SO_EM_ENTREGAS,
  });
  /* Leitura AO VIVO da edição ativa: `escolherEdicao` pode trocá-la depois da
     carga, e um valor copiado aqui ficaria preso na primeira. Por isso
     getters, definidos depois do Object.assign — que copiaria o valor, não o
     getter. */
  Object.defineProperties(modulo, {
    edicao: { get: () => ATIVA.id, enumerable: true },
    arquivoDeDados: { get: () => ATIVA.arquivoDeDados, enumerable: true },
    PERIODO: { get: () => ATIVA.periodo, enumerable: true },
  });
  return modulo;
});
