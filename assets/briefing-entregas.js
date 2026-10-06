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
   .report-doc · #mes-global · seções com id próprio. Os ganchos de busca
   (#busca-entregas, #lista-entregas, .chip-doc, #limpar-entregas,
   #conta-entregas) e a navegação (.doc-nav) não existem aqui — report.js
   aguenta a ausência dos dois: cada um sai cedo ou é delegado por seletor que
   nunca casa. O #mes-global existe, mas chega escondido (SELETOR_MES_VISIVEL).

   UMD: window.CentralBriefing no navegador, module.exports no Node. */
(function (root, factory) {
  const core = (typeof module !== 'undefined' && module.exports)
    ? require('./core.js')
    : root.CentralCore;
  // A linha do tempo do roadmap é compartilhada com a Central: vive em
  // assets/roadmap-visao.js, e a página precisa carregá-lo ANTES deste arquivo.
  const visao = (typeof module !== 'undefined' && module.exports)
    ? require('./roadmap-visao.js')
    : root.CentralRoadmapVisao;
  const api = factory(core, visao);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CentralBriefing = api;
})(typeof self !== 'undefined' ? self : this, function (C, R) {
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

  function nomeDoMes(chave) {
    const [ano, mes] = String(chave).split('-');
    const nome = new Date(Date.UTC(Number(ano), Number(mes) - 1, 1))
      .toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }
  function mesPorExtenso(chave) {
    return nomeDoMes(chave) + ' de ' + String(chave).split('-')[0];
  }

  /* Período que o documento cobre, em chaves AAAA-MM, do mais antigo pro mais
     novo. Este documento é curado — os cartões são lista escrita à mão, não
     recorte do DevOps — então o recorte de tempo também é declarado.

     É lista de meses, e não um rótulo de texto, porque daqui sai TANTO o
     título da capa QUANTO o número grande. Quando eram duas coisas separadas o
     título dizia "Agosto e Setembro" e a contagem lia só setembro: a capa
     afirmava um período e contava outro. Com uma fonte só, não há como
     divergirem.

     Lista vazia devolve o comportamento antigo — o mês escolhido, sozinho. Quem
     faz esse desvio é o ternário da montagem, lá embaixo, e não este arquivo
     aqui em cima. */
  const PERIODO_MESES = ['2026-08', '2026-09'];

  /* O seletor de período da capa existe no DOM, mas chega DESLIGADO.

     Pedido do Urlan: hoje só há este relatório, e um seletor com uma opção só
     é decoração que promete navegação inexistente. Ligar é trocar este false
     por true — e aí vale ler o aviso do `seletorMes`, porque a lista de meses
     que ele monta ainda não é a lista de RELATÓRIOS. */
  const SELETOR_MES_VISIVEL = false;

  /* "Agosto e Setembro de 2026" — o ano aparece uma vez quando é o mesmo pra
     todos, e mês a mês quando o período cruza a virada do ano. */
  function rotuloPeriodo(chaves) {
    if (!chaves.length) return '';
    if (chaves.length === 1) return mesPorExtenso(chaves[0]);
    const anos = [...new Set(chaves.map((c) => String(c).split('-')[0]))];
    const partes = anos.length === 1 ? chaves.map(nomeDoMes) : chaves.map(mesPorExtenso);
    const lista = partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1];
    return anos.length === 1 ? lista + ' de ' + anos[0] : lista;
  }

  function plural(n, um, muitos) { return n + ' ' + (n === 1 ? um : muitos); }

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
  /* O `apoio` vai logo ABAIXO do rótulo, e não abaixo do número, de propósito:
     `.rl-tile-num` tem `margin: auto 0 0` pra encostar o numeral na base, que é
     o que alinha os dois blocos da capa na mesma linha ótica. Texto depois dele
     empurraria o número pra cima — e por alturas diferentes, cada bloco por um
     tanto. Em cima, a explicação chega antes do número e não move nada. */
  function tile(rotulo, valor, sufixo, mod, apoio) {
    return `<article class="rl-tile${mod ? ' ' + mod : ''}">
      <p class="rl-tile-rot">${esc(rotulo)}</p>
      ${apoio ? `<p class="rl-tile-apoio">${esc(apoio)}</p>` : ''}
      <p class="rl-tile-num"><b class="rl-num">${esc(String(valor))}</b>${sufixo ? `<span>${esc(sufixo)}</span>` : ''}</p>
    </article>`;
  }

  // O bloco escuro é a âncora da capa. Único lugar com superfície escura — e
  // por isso o único onde o dourado da marca pode aparecer.
  //
  // O número grande é a contagem de PBIs fechados no PERÍODO — o que o time
  // efetivamente entregou. Antes era o total de itens, que somava épico e
  // Feature e inflava a conta com o mesmo trabalho contado duas vezes (o PBI e
  // o pai que fechou junto).
  //
  // A variação contra o mês anterior saiu. Ela nasceu quando o documento era
  // mensal, e deixou de ter régua quando o recorte virou dois meses: comparar
  // agosto+setembro com agosto é comparar o período com um pedaço de si mesmo.
  // Comparar com junho+julho manteria a leitura, mas exige que esses meses
  // existam no DevOps — e uma variação que some ou mente conforme o dado é
  // pior que variação nenhuma.
  /* Recebe o total pronto, e não os meses: quem o calcula é contaDeCartoes, a
     mesma função que dá o número de cada seção. Antes este bloco contava os PBIs
     fechados no período — régua diferente da do corpo, e era a origem do "a capa
     diz 28 e eu conto 8 entregas embaixo". */
  function heroi(total, apoio) {
    // Sem recorte de tempo no rótulo: o título da capa já nomeia o período
    // três centímetros acima, e repetir aqui e no bloco vizinho era dizer a
    // mesma coisa três vezes na mesma tela. Sem ponto final também — rótulo
    // não é frase, e o bloco ao lado nunca teve.
    /* Fica "Itens entregues", por decisão do Urlan. "Itens técnicos concluídos"
       foi tentado e saiu. O que o rótulo não dá conta de dizer — que este bloco
       conta itens fechados no board, enquanto os cartões abaixo são entregas de
       negócio escritas à mão, réguas diferentes — passou a ser trabalho da
       linha de apoio, que é o parâmetro abaixo. Antes isso morava só no
       contexto de quem apresentava o documento; quem lesse sozinho ficava sem. */
    const frase = total ? 'Itens entregues' : 'Nenhum item entregue';
    return `<article class="rl-tile rl-tile-escuro rl-heroi">
      <svg class="rl-heroi-fundo" viewBox="0 0 200 120" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <path d="M6 104 C40 104 44 62 74 62 C104 62 104 88 132 88 C162 88 166 24 194 24" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/>
        <path d="M168 24 H194 V50" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="rl-heroi-frase">${esc(frase)}</p>
      ${apoio ? `<p class="rl-tile-apoio">${esc(apoio)}</p>` : ''}
      <div class="rl-heroi-base">
        <p class="rl-tile-num"><b class="rl-num">${total}</b></p>
      </div>
    </article>`;
  }

  // Sem o selo de "mês em curso / mês fechado": a pedido do Urlan, e sem perda
  // de informação — o título logo abaixo já nomeia o mês, e este documento não tem mais
  // seletor pra trocar de mês, então não havia estado ambíguo pra desfazer.
  /* A capa dizia QUANDO e nunca O QUÊ: "Relatório de Agosto e Setembro de 2026"
     serviria pra financeiro, RH ou vendas. Três peças resolvem isso sem mexer
     na régua tipográfica:

     - a retranca diz de quem e de que domínio;
     - "Entregas de" no lugar de "Relatório de" nomeia o assunto, e o período
       segue na linha forte, do mesmo tamanho de antes — nada quebra;
     - a linha de situação cobre o buraco que o título sozinho abria: o roadmap
       vai até junho de 2027, ou seja, metade do documento é futuro, e um título
       que só nomeia dois meses passados deixava isso sem explicação.

     Retranca na capa não contradiz tê-la removido dos títulos de seção: lá ela
     repetia o próprio título, aqui ela diz o que o título não diz.

     A unidade sai da linha de meta porque subiu pra retranca — escrevê-la duas
     vezes na mesma tela é o tipo de repetição que este documento evita. */
  /* A autoria é escrita DUAS vezes, e é de propósito. No telefone ela vira o
     terceiro segmento da retranca, onde não custa altura nenhuma; no desktop
     ela fica na linha própria de sempre, que é como o documento já era e o
     Urlan pediu pra não mexer. Markup não muda com a largura da tela, então a
     única forma de ter os dois desenhos é escrever os dois e deixar o CSS
     decidir. Cada tamanho mostra exatamente um: o outro sai com `display:none`,
     que também o tira da árvore de acessibilidade — ninguém lê duas vezes. */
  /* Seletor de período, no alto à direita da capa — o mesmo gancho de DOM que
     o v2 usa (#mes-global), então o report.js já sabe ouvi-lo: ele delega o
     `change` pela caixa do documento e repinta com o mês novo.

     ATENÇÃO pra quando for ligado: aqui o período da capa vem de
     PERIODO_MESES, uma constante, e a contagem não recorta por mês nenhum.
     Então trocar o mês neste select hoje não mudaria uma linha da tela. Ligar
     o seletor é meio caminho; o outro meio é o período deixar de ser constante
     e passar a dizer QUAL relatório está aberto. */
  function seletorMes(lista, escolhido) {
    const opcoes = lista.map((m) => `<option value="${esc(m)}"${m === escolhido ? ' selected' : ''}>${esc(mesPorExtenso(m))}</option>`).join('');
    return `<div class="rl-capa-mes"${SELETOR_MES_VISIVEL ? '' : ' hidden'}>
        <select id="mes-global" class="rl-mes" aria-label="Período do relatório">${opcoes}</select>
      </div>`;
  }

  function masthead(periodo, tiles, hero, retranca, situacao, autoria, mes) {
    // Sem o " · " aqui: o separador entre a unidade e a autoria virou um fio
    // desenhado no CSS. São dois registros diferentes na mesma linha — onde e
    // quem — e o mesmo ponto que separa "Ybera US" de "E-commerce" dizia que
    // os três eram a mesma coisa.
    const risca = autoria ? esc(autoria) : '';
    return `<header class="rl-capa">
      <div class="rl-capa-topo">
        <img class="rl-logo" src="assets/brand/ybera-logo.webp" alt="Ybera" width="360" height="139">
        ${mes || ''}
      </div>
      ${retranca ? `<p class="rl-rotulo rl-capa-retranca">${esc(retranca)}<span class="rl-capa-autoria">${risca}</span></p>` : ''}
      <!-- Os dois <span> ficam COLADOS, sem espaço nem quebra entre eles: no
           telefone o título corre inline, e a quebra de linha do código viraria
           um espaço do tamanho do corpo do <h1> SOMADO à margem que separa os
           dois pedaços — medido, o dobro de um espaço normal. Aqui o vão é
           declarado inteiro no CSS. -->
      <h1 class="rl-titulo"><span class="rl-titulo-fraco">Entregas de</span><span class="rl-titulo-forte">${esc(periodo)}</span></h1>
      ${situacao ? `<p class="rl-capa-situacao">${esc(situacao)}</p>` : ''}
      ${autoria ? `<p class="rl-meta">${esc(autoria)}</p>` : ''}
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
        ${s.conta ? `<p class="rl-sec-conta">${esc(s.conta)}</p>` : ''}
        ${s.intro ? `<p class="rl-sec-intro">${esc(s.intro)}</p>` : ''}
      </div>
      ${s.corpo}
    </section>`;
  }


  /* ---- Entregas recentes: lista curada, escrita à mão ----

     Diferente de todo o resto do documento, estes cartões não vêm do Azure
     DevOps. São os tópicos que o Urlan dita, na ordem em que ele dita. Mexer
     aqui é a forma de incluir, remover ou reescrever cartão — não há tela
     pra isso.

     `titulo` e `status` são obrigatórios. `resumo` é o texto do Urlan — string
     para um parágrafo, lista de strings quando ele separou ideias que não
     cabem na mesma respiração.

     Um item da lista pode ser `{ nota: '...' }` em vez de string: é o parágrafo
     que NÃO conta a entrega, e sim algo ao lado dela — um plano futuro, uma
     condição que sobra. Sai com desenho próprio, senão ele lê como se fosse
     mais uma linha do que foi feito. */

  /* Vocabulário fechado de status. As palavras são as do Urlan: quem escreve o
     estado de uma frente é quem a conhece, e um status fora desta tabela é
     ignorado em vez de virar selo afirmando algo que ninguém escreveu.

     Antes só existia 'andamento', e sete dos oito cartões ficavam sem selo — o
     que tornava a AUSÊNCIA ambígua: não dava pra saber se era concluído ou se
     ninguém tinha dito. Com todos marcados, a varredura de três segundos
     substitui a leitura dos oito parágrafos.

     A ordem da tabela É a escada do estado, e o peso visual sobe com ela: azul
     tingido, âmbar tingido, verde sólido. Os dois primeiros são fases do
     caminho e dividem o mesmo peso; só a chegada é sólida — se todos
     gritassem, nenhum marcaria nada. */
  const SELOS = {
    andamento: { texto: 'em andamento', classe: 'rl-selo-andamento' },
    teste:     { texto: 'em teste',     classe: 'rl-selo-teste' },
    entregue:  { texto: 'entregue',     classe: 'rl-selo-ok' },
  };
  const ENTREGAS_RECENTES = [
    {
      titulo: 'Novos componentes visuais para HOME',
      status: 'entregue',
      iniciativa: 'Nova Homepage',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      // A contagem da seção vem daqui, e não do épico: o 49290 é a loja inteira
      // e junta as Features de PDP, compliance e tradução junto com esta.
      featureIds: [45272],
      resumo: [
        'Foram criadas novas opções visuais de todas as seções da home do site.',
        'Ao todo, 12 componentes: Banner, Bundle, Quiz AI, Card de produto, Blog, Shop by concern, Autoridade, Antes e Depois, Reviews, Produto em destaque, Shop by collection e Listagem de produtos.',
      ],
      // `pasta` + `imagens` é a convenção pra qualquer cartão que queira mostrar
      // tela: a pasta fica em assets/entregas/<frente>/ e cada arquivo leva a
      // legenda que nomeia o componente. Ordem = a mesma da lista do resumo.
      // Os originais são capturas de 13MB em PNG; aqui entram em JPEG a 1600px
      // de largura, o que dá 1MB no total — o repositório e a página de quem
      // abre por link agradecem.
      pasta: 'assets/entregas/nova-homepage-usa',
      imagens: [
        { arquivo: 'banner.jpg', legenda: 'Banner' },
        { arquivo: 'bundle.jpg', legenda: 'Bundle' },
        { arquivo: 'quiz-ai.jpg', legenda: 'Quiz AI' },
        { arquivo: 'blog.jpg', legenda: 'Blog' },
        { arquivo: 'shop-by-concern.jpg', legenda: 'Shop by concern' },
        { arquivo: 'autoridade.jpg', legenda: 'Autoridade' },
        { arquivo: 'antes-e-depois.jpg', legenda: 'Antes e Depois' },
        { arquivo: 'produto-em-destaque.jpg', legenda: 'Produto em destaque' },
        { arquivo: 'shop-by-collection.jpg', legenda: 'Shop by collection' },
      ],
    },
    {
      titulo: 'Novo cart drawer',
      status: 'entregue',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      featureIds: [45723],
      resumo: 'Melhoria geral da experiência do cart drawer, no desktop e no mobile.',
      pasta: 'assets/entregas/novo-cart-drawer',
      imagens: [
        { arquivo: 'mobile.jpg', legenda: 'Mobile' },
      ],
    },
    {
      titulo: 'Novos componentes visuais para PDP',
      status: 'entregue',
      iniciativa: 'Nova PDP',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      featureIds: [44271],
      resumo: 'Foram criadas novas opções visuais dos componentes da PDP do site.',
      // Aqui o resumo não enumera os componentes como o da HOME, então as
      // legendas saíram da própria tela: quando a seção tem título no site, é
      // ele que vira legenda; nos outros casos, descrição. A ordem é a da
      // captura, que desce a página.
      pasta: 'assets/entregas/nova-pdp-usa',
      imagens: [
        { arquivo: 'see-it-in-action.jpg', legenda: 'See it in action' },
        { arquivo: 'kerafive-22.jpg', legenda: 'Powered by Kerafive-22' },
        { arquivo: 'avaliacao-e-beneficios.jpg', legenda: 'Avaliação e benefícios' },
        { arquivo: 'banner-do-produto.jpg', legenda: 'Banner do produto' },
        { arquivo: 'resultados-profissionais.jpg', legenda: 'Resultados profissionais' },
      ],
    },
    {
      titulo: 'Testes Shipsmart',
      status: 'andamento',
      produto: 'Shipsmart',
      epicoId: 49300,
      // Sem Feature no board: a frente é um item de trabalho só.
      contaFixa: 1,
      resumo: [
        'Concluímos os testes da automação do fluxo da Shipsmart para pedidos que têm estoque no Brasil e são entregues nos EUA.',
        'Agora vamos fazer um teste de envio real do produto ao destinatário final, para validar se todo o fluxo está funcionando corretamente.',
      ],
    },
    {
      titulo: 'Tratativas do Google compliance',
      iniciativa: 'Compliance Google',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      status: 'andamento',
      /* A data por extenso, e não "ainda este mês": o documento é lido depois de
         escrito, e em 30/09 "este mês" já queria dizer "hoje" sem dizer. Data
         não envelhece — "hoje" envelheceria no dia seguinte. */
      resumo: [
        'Avançamos nos itens que recebemos da agência: faltam apenas 4 dos 18 para finalizar. O prazo final deste projeto é 30 de setembro.',
        'O que não for finalizado até essa data será tratado como nova demanda, a partir de outubro. Essas novas demandas serão avaliadas e priorizadas junto com as que já estão em andamento.',
      ],
      // 14 concluídos é o complemento dos 4 que faltam, ditos no texto. A barra
      // guarda o total e o feito; o texto conta pelo que sobra, que é o que
      // interessa a esta altura. Ao mexer num, refaça a conta no outro: 18 - 13
      // = 5. Porcentagem no texto já foi tentada e saiu — "50%" era exato em 9
      // de 18 e mentia em 10.
      progresso: { feito: 14, total: 18, rotulo: 'itens concluídos' },
      // Sem Feature no board: a planilha inteira é um item de trabalho só.
      contaFixa: 1,
      /* `/view` e não `/edit`: a planilha é pública para LEITURA, e o /edit faz o
         Google avaliar se a identidade de quem abre pode editar — quem está
         logado numa conta sem permissão de edição cai no pedido de acesso em
         vez da planilha. Quem lê este report é leitor, não editor.

         O #gid=0 é a aba da planilha, não o hash desta página: o link abre em
         outra aba, então não toca no hash daqui — que é por onde viaja o
         conteúdo do link de leitura. */
      link: {
        href: 'https://docs.google.com/spreadsheets/d/1kC8iL2vZGl0aAy7xWdn5e6IrN2BYqe-6dYQYjKKWj6E/view?gid=0#gid=0',
        rotulo: 'Abrir a planilha de demandas',
      },
    },
    {
      titulo: 'Migração de ERP — ajustes gerais',
      status: 'entregue',
      produto: 'ERP — Ordoro | Salesforce Rootstock',
      epicoId: 49282,
      contaFixa: 1,
      resumo: 'Ajustes e configurações adicionais pós-migração para a Rootstock.',
    },
    {
      titulo: 'Tradução do site',
      status: 'entregue',
      iniciativa: 'Translate loja',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      featureIds: [49920],
      resumo: [
        'Projeto concluído: todo o site foi configurado para ser traduzido, tanto os textos quanto as imagens, e a tradução está disponível para ativação no site.',
        'No caso das imagens, elas deverão ser criadas em versões diferentes por idioma.',
      ],
    },
    {
      titulo: 'App Review — ajustes',
      status: 'entregue',
      iniciativa: 'Melhorias Review',
      produto: 'Ybera Reviews / API de Reviews',
      epicoId: 49302,
      featureIds: [50905],
      resumo: [
        'Realizamos discovery para levantar as melhores opções de apps de reviews dentro do Shopify.',
        'Depois da pesquisa, fizemos um alinhamento com o Wendel e decidimos que não seria produtivo trocar o app atual, o Judge.me, por outro: não haveria ganho real, seria basicamente trocar um pelo outro, e demandaria muitas horas do time técnico. Preferimos manter o Judge.me e fazer melhorias que atendem as necessidades do momento.',
        { nota: 'Está planejada a construção de um app de reviews próprio, pelo time da Ybera, com início previsto para março de 2027 — ele já está no roadmap, mais abaixo.' },
      ],
    },
  ];

  // Mesmo cartão do v2 (.rl-frente), com menos dentro: aqui não há prazo,
  // progresso nem lista de itens porque não há dado por trás deles. Inventar
  // um número pra preencher o cartão seria pior que o espaço em branco.
  /* Galeria do cartão: miniatura que abre a imagem inteira num visor dentro da
     própria página.

     A marcação continua sendo um <a> pro arquivo, e não um <button>, de
     propósito: sem JavaScript o clique ainda leva à imagem. O visor é melhoria
     por cima (o script de entregas.html intercepta o clique), não requisito.

     O caminho sem script nenhum seria o truque do :target, e ele está descartado
     por um motivo duro: :target depende do hash, e o hash é onde viaja o dado do
     link de leitura (#r=...). Clicar numa miniatura apagaria o report de quem
     abriu por link.

     `loading="lazy"` porque a galeria mora no meio da página: quem só rola até o
     roadmap não paga o download. */
  function galeria(f) {
    const base = String(f.pasta || '').replace(/\/+$/, '');
    const figuras = (f.imagens || []).map((im) => {
      const src = `${base}/${im.arquivo}`;
      return `<figure class="rl-fig">
        <a class="rl-fig-link" href="${esc(src)}">
          <img src="${esc(src)}" alt="${esc(im.legenda)}" loading="lazy" decoding="async">
        </a>
        <figcaption>${esc(im.legenda)}</figcaption>
      </figure>`;
    }).join('');
    return `<div class="rl-galeria">${figuras}</div>`;
  }

  /* Barra de progresso do cartão. Come `feito` e `total`, não uma porcentagem
     pronta: a porcentagem sai da conta, então ela não tem como divergir dos
     números que o resumo escreve em texto.

     Ao lado da barra vai a contagem do que já foi — "14/18". Ela não repete o
     parágrafo: o texto conta pelo que FALTA ("faltam apenas 4 dos 18") e este
     rótulo conta pelo que ANDOU, que é o que a barra desenha. Quando o texto
     dava a porcentagem, o rótulo não existia justamente porque seria a mesma
     coisa dita duas vezes. */
  function barra(pr) {
    const total = Number(pr.total) || 0;
    const feito = Math.min(Math.max(Number(pr.feito) || 0, 0), total);
    if (!total) return '';
    const pct = Math.round((feito / total) * 100);
    const rotulo = `${feito} de ${total} ${pr.rotulo || 'itens concluídos'}`;
    /* O invólucro carrega o espaçamento e a barra carrega só a barra. Juntos
       não funcionam: o `border-radius` é calculado sobre a caixa inteira, e uma
       caixa de 26px (padding + 8px de trilho) curva muito acima da faixa que o
       `background-clip` pinta — o trilho saía com as pontas retas. */
    /* A contagem ao lado leva `aria-hidden`: o próprio progressbar já anuncia
       "14 de 18 itens concluídos" pelo aria-label, e sem isso o leitor de tela
       diria o número duas vezes seguidas. Ela é para o olho, não para o ouvido. */
    return `<div class="rl-progresso-area">
      <div class="rl-progresso" role="progressbar" aria-label="${esc(rotulo)}"
        aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${feito}"
        ><i style="width:${pct}%"></i></div>
      <span class="rl-progresso-conta" aria-hidden="true">${feito}/${total}</span>
    </div>`;
  }

  /* Chamada pro documento de fora — hoje a planilha de demandas do compliance.
     Abre em outra aba: o report pode estar aberto por link de leitura, com o
     conteúdo inteiro viajando no hash, e trocar a página por uma planilha
     obrigaria o leitor a voltar pra recuperá-lo.

     Só aceita http e https. O dado é escrito aqui do lado, não vem de fora,
     mas um href é a única coisa neste arquivo que o navegador executaria se
     alguém colasse `javascript:` — a guarda custa uma linha. */
  function cta(link) {
    const href = String((link || {}).href || '');
    if (!/^https?:\/\//i.test(href)) return '';
    const rotulo = link.rotulo || 'Abrir';
    return `<a class="rl-cta" href="${esc(href)}" target="_blank" rel="noopener noreferrer"
      >${esc(rotulo)}<span class="rl-cta-seta" aria-hidden="true">\u2192</span></a>`;
  }

  // `mostrarProduto` existe por causa dos dois desenhos: na lista corrida a
  // retranca é o que diz a que frente o card pertence; agrupado por épico, o
  // título da seção já disse, e repetir o mesmo nome em cinco cards seguidos
  // vira ruído.
  /* `o.cartoes` substitui a lista curada. Existe pros testes poderem exercitar a
     contagem por Feature sem depender dos ids reais do board, do mesmo jeito que
     `o.periodo` existe pra fixar o recorte sem depender do calendário.

     Lista VAZIA é uma resposta, não uma ausência: o documento de Outubro nasceu
     sem cartão nenhum, esperando o Urlan ditar. Antes o `.length` mandava o
     vazio cair de volta na lista curada, e a edição nova abria com os cartões da
     anterior. Quem não quer escolher continua não passando a opção — e é esse o
     caminho de quem renderiza o documento de Agosto e Setembro. */
  function listaDeCartoes(o) {
    return Array.isArray(o.cartoes) ? o.cartoes : ENTREGAS_RECENTES;
  }

  function corpoEntregasRecentes(lista, mostrarProduto) {
    const cartoes = lista.map((f) => {
      const est = SELOS[f.status];
      const selo = est ? `<span class="rl-selo ${est.classe}">${esc(est.texto)}</span>` : '';
      return `<article class="rl-frente">
        ${mostrarProduto && f.produto ? `<p class="rl-frente-produto">${esc(f.produto)}</p>` : ''}
        <div class="rl-frente-cab">
          <h3 class="rl-frente-nome">${esc(f.titulo)}</h3>
          <div class="rl-frente-meta">${selo}</div>
        </div>
        ${[].concat(f.resumo || []).map((par) => (typeof par === 'string'
          ? `<p class="rl-frente-resumo">${esc(par)}</p>`
          : `<p class="rl-frente-nota">${esc(par.nota)}</p>`)).join('')}
        ${f.progresso ? barra(f.progresso) : ''}
        ${(f.imagens || []).length ? galeria(f) : ''}
        ${f.link ? cta(f.link) : ''}
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

  /* Sobe do item até a FEATURE mais próxima acima dele.

     C.mapaDeProdutos não serve aqui: ele sobe até o épico, que é o nível grosso
     demais. Os itens moram dentro de Features, e um épico tem várias — contar
     pelo épico fazia quatro seções mostrarem o mesmo número, porque cinco
     cartões compartilham o 49290.

     Devolve null quando a cadeia chega no épico sem passar por Feature: item
     pendurado direto no épico não pertence a nenhuma frente, e inventar um dono
     pra ele seria pior que não contá-lo. */
  function featureDe(id, porId) {
    const eu = porId.get(id);
    if (!eu) return null;
    const vistos = new Set([id]);
    let atual = porId.get((eu.fields || {})['System.Parent']);
    while (atual && !vistos.has(atual.id)) {
      vistos.add(atual.id);
      const t = (atual.fields || {})['System.WorkItemType'];
      if (t === 'Feature') return atual.id;
      if (t === 'Epic') return null;
      atual = porId.get((atual.fields || {})['System.Parent']);
    }
    return null;
  }

  /* PBIs CONCLUÍDOS da frente, sem recorte de tempo.

     Decisão do Urlan pra este primeiro relatório: ele junta tudo que foi
     entregue recentemente, e várias frentes começaram antes de agosto. A Nova
     PDP USA, por exemplo, rodou de julho a agosto — contar só o que fechou
     dentro do período mostrava uma fração do trabalho dela.

     É de propósito que isto NÃO usa o mesmo recorte do número da capa: a capa
     responde "quanto saiu no período" e a seção responde "quanto esta frente
     entregou". Duas perguntas, duas contas — e é por isso que somar as seções
     não tem que dar o número da capa.

     O épico segue como reserva pro cartão que ainda não declarou `featureIds`,
     pra migração ser cartão a cartão. Ele é duplamente impreciso enquanto
     durar: grosso demais, e agora também sem recorte de tempo. */
  function pbisPorChave(items, porId, mapa) {
    const porFeature = new Map();
    const porEpico = new Map();
    for (const it of (items || [])) {
      if (!ehPbi(it)) continue;
      if (!C.isTerminalState(((it || {}).fields || {})['System.State'])) continue;
      const fid = featureDe(it.id, porId);
      if (fid) porFeature.set(fid, (porFeature.get(fid) || 0) + 1);
      const prod = mapa && mapa.get(it.id);
      if (prod) porEpico.set(prod.id, (porEpico.get(prod.id) || 0) + 1);
    }
    return { porFeature, porEpico };
  }

  /* CONTAGENS PRONTAS — o formato curto do link de leitura.

     O documento extrai do board exatamente cinco números: quantas PBIs
     concluídas cada frente tem. Mandar os 74 itens pro leitor descobrir isso de
     novo era carregar o board inteiro dentro da URL. `contagensDoLink` faz a
     conta de uma vez, no navegador de quem gera, e o link leva só o resultado.

     `sanearContagens` existe porque o fragmento da URL é dado que QUALQUER UM
     pode forjar: id vira número, quantidade vira inteiro não-negativo. Um link
     torto pode mentir no número — sempre pôde, é a natureza de um link que
     carrega o próprio conteúdo — mas não pode injetar nada. */
  function contagensDoLink(items, todos) {
    const porId = new Map((todos || items || []).map((it) => [it.id, it]));
    const c = pbisPorChave(items, porId, C.mapaDeProdutos(todos || items));
    const obj = (m) => { const o = {}; for (const [k, v] of m) o[k] = v; return o; };
    return { f: obj(c.porFeature), e: obj(c.porEpico) };
  }

  function sanearContagens(bruto) {
    if (!bruto || typeof bruto !== 'object') return null;
    const mapa = (o) => {
      const m = new Map();
      if (o && typeof o === 'object') {
        for (const k of Object.keys(o)) {
          const id = Number(k);
          const n = Math.max(0, Math.floor(Number(o[k])) || 0);
          if (Number.isFinite(id)) m.set(id, n);
        }
      }
      return m;
    };
    return { porFeature: mapa(bruto.f), porEpico: mapa(bruto.e) };
  }


  /* O desenho da linha do tempo saiu daqui em 02/10/2026, pro
     assets/roadmap-visao.js: a Central passou a mostrar o mesmo roadmap no
     Panorama, e duas cópias do mesmo desenho divergem no primeiro ajuste. É a
     mesma lição do saneRoadmapItens, que mudou pro core.js pela mesma razão.

     Este módulo continua decidindo QUANDO a seção existe e o texto ao redor;
     quem desenha a grade é o outro. */
  const corpoRoadmap = R.corpoRoadmap;

  /* ---- Entrada ----
     Mesmas opções e mesmo retorno do v1: { vazio, html, meses }.
     opcoes: { items, agora, escopo, unidade, todos, mes, nomes, produtos,
               decisoes, roadmap } */
  function htmlReport(opcoes) {
    const o = opcoes || {};
    const items = o.items || [];
    const prontas = sanearContagens(o.contagens);
    const agora = o.agora || Date.now();
    const escopo = o.escopo || '';
    nomesAtivos = o.nomes && typeof o.nomes === 'object' ? o.nomes : {};
    const mapa = C.mapaDeProdutos(o.todos || items);
    for (const p of mapa.values()) p.titulo = nomeDe(p.id, p.titulo);
    /* Este documento NÃO conta por mês: o número da capa e o de cada seção
       saem de `contaDeCartoes`, sobre as frentes declaradas. Daqui saíram, na
       varredura de 05/10/2026, quatro variáveis que ninguém lia — `infoProd`,
       `meses`, `fechado` e `mesAlvo` — e com elas duas varreduras da base
       inteira (`resumoProdutos` e `reportPorMes` + `resumoMensal`) a cada
       render.

       O custo pior não era o tempo: código morto com esses nomes faz quem lê
       acreditar que a capa é recortada por mês, que é exatamente a confusão
       que já produziu a capa dizendo 28 com 8 entregas embaixo.

       `infoProd` continua vivo no briefing.js e no v2, que de fato o usam —
       por isso o link de leitura segue carregando `produtos`. */
    const b = C.briefingDoMes(items, agora);
    const escolhido = /^\d{4}-(0[1-9]|1[0-2])$/.test(o.mes || '') ? o.mes : b.mes;
    /* O período vem da constante declarada; `o.periodo` existe pros testes
       poderem fixar um recorte sem depender do calendário real.

       Hoje ele serve só ao TÍTULO. A contagem deixou de recortar por mês quando
       o Urlan decidiu que este primeiro relatório junta tudo que foi entregue
       recentemente — várias frentes começaram antes de agosto. */
    const chavesPeriodo = (Array.isArray(o.periodo) && o.periodo.length) ? o.periodo
      : (PERIODO_MESES.length ? PERIODO_MESES : [escolhido]);
    // Sem `||` de reserva: `chavesPeriodo` tem sempre pelo menos um item pelos
    // três ramos acima, então rotuloPeriodo nunca devolve vazio aqui.
    const periodo = rotuloPeriodo(chavesPeriodo);
    const dAgora = new Date(agora);
    const ano = String(dAgora.getUTCFullYear());
    const doAno = [];
    for (let m = dAgora.getUTCMonth() + 1; m >= 1; m -= 1) {
      doAno.push(ano + '-' + String(m).padStart(2, '0'));
    }
    const listaMeses = doAno.includes(escolhido) ? doAno : doAno.concat(escolhido);
    /* NÃO existe documento vazio aqui, e a saída antecipada que existia foi
       removida por isso.

       Ela era herdada do v2 e perguntava ao BOARD: sem item em execução, sem
       travado, sem prazo e sem mês fechado, devolvia "Nada registrado ainda".
       No v2 isso faz sentido — lá tudo que se desenha vem do board. Aqui não:
       os cartões são uma lista curada no código e o roadmap vem de um arquivo.
       Nenhum dos dois some porque o board está quieto.

       O efeito era um documento com oito entregas escritas dizendo que não há
       nada. Apareceu ao testar o formato curto do link, em que `items` chega
       vazio de propósito — mas não era do formato novo: um board só de itens
       concluídos já disparava a mesma saída, e ninguém tinha percebido.

       `vazio` continua no retorno porque o report.js e a Central leem esse
       campo; ele é só sempre falso, que é a verdade deste documento. */

    const meta = [];
    // "Product Owner" por extenso em vez de "P.O responsável": o ponto no meio
    // da sigla não aparece em nenhum outro lugar do documento, e o nome do
    // papel já diz "responsável" — quem lê não precisa decodificar nada.
    if (escopo) meta.push('Product Owner: ' + escopo);
    // A unidade não entra aqui: ela vive na retranca da capa desde que o título
    // passou a dizer o assunto. Repetir "Ybera US" na linha de baixo seria dizer
    // a mesma coisa duas vezes na mesma tela.

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
    const cartoes = listaDeCartoes(o);
    const grupos = agrupar === 'plano' ? [] : agruparEntregas(cartoes, agrupar);

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
      ? agruparEntregas(cartoes, 'iniciativa').filter((g) => !g.orfao).length
      : gruposReais.length;
    const rotuloGrupo = agrupar === 'epico'
      ? (nGrupos === 1 ? 'Frente atendida' : 'Frentes atendidas')
      : (nGrupos === 1 ? 'Projeto atendido' : 'Projetos atendidos');
    /* Os dois números da capa são de RÉGUAS DIFERENTES, e nenhum rótulo de duas
       palavras dá conta disso: um conta frentes de trabalho (o que está no
       roadmap), o outro conta itens fechados no board dentro dessas frentes.
       Sem a linha de apoio o leitor tenta dividir um pelo outro, ou supõe que o
       número grande é o de cartões que ele vê abaixo — e não é.

       Fica embaixo do rótulo e não do número por uma razão de forma; está
       explicada em `tile`. */
    /* Uma palavra só, e ela sai do MESMO lugar que o rótulo. O apoio dizia
       "frentes de trabalho" embaixo de um rótulo que diz "Projetos atendidos":
       duas palavras pra mesma coisa, coladas, e o leitor parava pra decidir se
       eram sinônimos. O bloco escuro herda a mesma palavra ("dentro desses
       projetos"), senão a incoerência só atravessa a capa. */
    const palavra = agrupar === 'epico' ? 'frentes' : 'projetos';
    const apoioGrupo = agrupar === 'epico'
      ? (nGrupos === 1 ? 'Frente de trabalho contemplada neste relatório'
                       : 'Frentes de trabalho contempladas neste relatório')
      : (nGrupos === 1 ? 'Projeto do roadmap contemplado neste relatório'
                       : 'Projetos do roadmap contemplados neste relatório');
    const apoioItens = 'Soma dos itens concluídos dentro desses ' + palavra;
    const kpis = tile(rotuloGrupo, nGrupos, '', '', apoioGrupo);

    const porIdTodos = new Map((o.todos || items).map((it) => [it.id, it]));
    // Vindas do link (curto), ou calculadas do board (ao vivo, e nos links
    // antigos, que trazem os itens). Os dois caminhos coexistem de propósito:
    // link já compartilhado não pode parar de abrir.
    const contagens = prontas || pbisPorChave(items, porIdTodos, mapa);

    /* A chave leva prefixo porque Feature e épico vivem no mesmo espaço de ids:
       sem ele, um épico 123 e uma Feature 123 se confundiriam no Set.

       O Set existe porque um grupo pode ter vários cartões, e dois deles podem
       apontar pra mesma Feature (ou pro mesmo épico) — sem ele a seção contaria
       o mesmo trabalho duas vezes. */
    /* Conta os itens de um conjunto de cartões. Serve a seção (os cartões dela)
       e a capa (todos), porque o número grande passou a ser a soma das frentes.

       O Set é GLOBAL no conjunto: dois cartões que apontem pra mesma Feature
       contam o trabalho uma vez, esteja na mesma seção ou em seções diferentes.
       Era o defeito original em outra roupa — contar duas vezes o que é um. */
    const contaDeCartoes = (cards) => {
      const chaves = new Set();
      let fixo = 0;
      for (const c of (cards || [])) {
        /* `contaFixa` é pra frente que não tem Feature no board. O compliance é
           uma planilha de 18 linhas que no DevOps é UM item de trabalho com
           subitens — não há Feature pra contar, e derivar do épico traria a loja
           inteira. Então o número é declarado: 1 item, que é o que existe lá.

           A barra do cartão continua contando as 18 linhas por dentro. São
           medidas de coisas diferentes: a seção conta itens de trabalho, a barra
           conta o avanço dentro de um deles. */
        if (typeof c.contaFixa === 'number') { fixo += c.contaFixa; continue; }
        /* Sem contaFixa, cartão com `progresso` não entra na conta: já disse
           como quer ser medido, e um segundo número embaixo do título brigaria
           com o da barra. */
        if (c.progresso) continue;
        const fs = Array.isArray(c.featureIds) ? c.featureIds.filter(Boolean) : [];
        if (fs.length) fs.forEach((f) => chaves.add('f:' + f));
        else if (c.epicoId) chaves.add('e:' + c.epicoId);
      }
      let n = fixo;
      for (const k of chaves) {
        const id = Number(k.slice(2));
        n += (k[0] === 'f' ? contagens.porFeature.get(id) : contagens.porEpico.get(id)) || 0;
      }
      return n;
    };
    const contaDoGrupo = (g) => {
      const n = contaDeCartoes(g.cards);
      return n ? plural(n, 'item', 'itens') : '';
    };
    // O número grande da capa é a soma das frentes. Antes ele contava os PBIs
    // fechados no período, uma régua diferente da do corpo: a capa dizia 28 e o
    // leitor contava 8 entregas embaixo. Agora é a mesma conta, e some as seções
    // que dá a capa.
    const totalDeItens = contaDeCartoes(cartoes);

    const secoes = [];
    if (cartoes.length && agrupar === 'plano') {
      secoes.push({
        id: 'recentes', titulo: 'Entregas recentes',
        intro: 'As frentes de trabalho mais recentes do time.',
        corpo: corpoEntregasRecentes(cartoes, true),
      });
    } else {
      for (const g of grupos) {
        secoes.push({
          // Sem intro: a contagem de CARTÕES ("3 entregas recentes.") não dizia
          // nada que a seção não mostrasse — eles estão logo abaixo e dão pra
          // contar no olho. O que vai ao lado do título é outra coisa: quantos
          // PBIs do épico daquela frente fecharam no período, que é número que
          // não está à vista em lugar nenhum.
          id: (agrupar === 'epico' ? 'epico-' : 'ini-') + g.id, titulo: g.nome,
          conta: contaDoGrupo(g),
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
      ${masthead(periodo, kpis,
        heroi(totalDeItens, apoioItens),
        [o.unidade, 'E-commerce'].filter(Boolean).join(' · '),
        'O que o time entregou no período, e o planejamento dos próximos meses.',
        meta.join(' · '),
        seletorMes(listaMeses, escolhido))}
      <div class="rl-corpo">${secoes.map((x) => secaoHtml(x)).join('')}</div>
      ${rodape()}
    </div>`;

    return { vazio: false, meses: listaMeses, html };
  }

  /* Dois acessores de leitura, pra ferramenta de diagnóstico poder perguntar ao
     módulo o que ele considera período e quais cartões existem — em vez de
     reimplementar isso e sair do ar assim que a lista curada mudar aqui.

     Devolvem cópias: quem lê não mexe no que o documento desenha. */
  const periodoDoDocumento = () => PERIODO_MESES.slice();
  const cartoesDoDocumento = () => ENTREGAS_RECENTES.map((c) => ({
    titulo: c.titulo, iniciativa: c.iniciativa || null,
    produto: c.produto || null, epicoId: c.epicoId || null, status: c.status || null,
    featureIds: Array.isArray(c.featureIds) ? c.featureIds.slice() : null,
    // contaFixa precisa vir junto: sem ela, quem pergunta ao módulo vê o cartão
    // do compliance como "ainda sem chave de contagem" e vai atrás de uma
    // Feature que não existe.
    contaFixa: typeof c.contaFixa === 'number' ? c.contaFixa : null,
  }));

  /* Os ÚNICOS campos do DevOps que este documento lê. O report.js usa esta
     lista pra podar o pacote do link de leitura: o que não está aqui não viaja.

     Tipo e pai sobem a hierarquia até a Feature (featureDe), estado decide se a
     PBI conta (isTerminalState). Título, data de fechamento e data de alteração
     não aparecem em lugar nenhum do documento — os cartões são texto curado.

     Medido num link real: 5.208 caracteres viraram 1.631, e o HTML desenhado
     é byte a byte o mesmo. Se algum dia um cartão passar a mostrar dado vindo
     do board, o campo entra AQUI antes. */
  const camposDoLink = ['System.WorkItemType', 'System.State', 'System.Parent'];

  /* O ENDEREÇO FIXO DOS DADOS desta edição.

     Entrou quando o relatório de Outubro ganhou um seletor de edição: escolher
     "Agosto e Setembro" leva pra cá, e até então esta página só abria com token
     ou com o #r= no endereço — o stakeholder caía numa porta fechada.

     NÃO muda o documento. Ele é desenhado exatamente como sempre foi; o que
     muda é de onde o dado vem quando não há token nem fragmento. E o fragmento
     continua tendo precedência no report.js, então todo link já compartilhado
     abre exatamente o que ele carrega, como antes. */
  const arquivoDeDados = 'assets/dados-ago-set.json';

  return { htmlReport, mesPorExtenso, dataCurta, esc, periodoDoDocumento, cartoesDoDocumento, camposDoLink, contagensDoLink, arquivoDeDados };
});
