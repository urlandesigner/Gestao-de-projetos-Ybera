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
  function heroi(mesesDoPeriodo) {
    const total = mesesDoPeriodo.reduce((n, m) => n + contaPbis(m), 0);
    // Sem recorte de tempo no rótulo: o título da capa já nomeia o período
    // três centímetros acima, e repetir aqui e no bloco vizinho era dizer a
    // mesma coisa três vezes na mesma tela. Sem ponto final também — rótulo
    // não é frase, e o bloco ao lado nunca teve.
    const frase = total ? 'Itens entregues' : 'Nenhum item entregue';
    return `<article class="rl-tile rl-tile-escuro rl-heroi">
      <svg class="rl-heroi-fundo" viewBox="0 0 200 120" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <path d="M6 104 C40 104 44 62 74 62 C104 62 104 88 132 88 C162 88 166 24 194 24" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/>
        <path d="M168 24 H194 V50" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="rl-heroi-frase">${esc(frase)}</p>
      <div class="rl-heroi-base">
        <p class="rl-tile-num"><b class="rl-num">${total}</b></p>
      </div>
    </article>`;
  }

  // Sem o selo de "mês em curso / mês fechado": a pedido do Urlan, e sem perda
  // de informação — o título logo abaixo já nomeia o mês, e este documento não tem mais
  // seletor pra trocar de mês, então não havia estado ambíguo pra desfazer.
  function masthead(periodo, meta, tiles, hero) {
    return `<header class="rl-capa">
      <div class="rl-capa-topo">
        <img class="rl-logo" src="assets/brand/ybera-logo.webp" alt="Ybera" width="360" height="139">
      </div>
      <h1 class="rl-titulo">
        <span class="rl-titulo-fraco">Relatório de</span>
        <span class="rl-titulo-forte">${esc(periodo)}</span>
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
     cabem na mesma respiração. */

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
      iniciativa: 'Nova Homepage USA',
      produto: 'Loja Clube USA',
      epicoId: 49290,
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
      resumo: 'Melhoria geral da experiência do cart drawer, no desktop e no mobile.',
      pasta: 'assets/entregas/novo-cart-drawer',
      imagens: [
        { arquivo: 'mobile.jpg', legenda: 'Mobile' },
      ],
    },
    {
      titulo: 'Novos componentes visuais para PDP',
      status: 'entregue',
      iniciativa: 'Nova PDP USA',
      produto: 'Loja Clube USA',
      epicoId: 49290,
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
      resumo: [
        'Estamos realizando testes da automação do fluxo da Shipsmart para pedidos que têm estoque no Brasil e são entregues nos EUA.',
        'A automação da Shipsmart já está acertada. Agora estamos validando a segunda parte do fluxo, o que acontece depois dela.',
        'Estando tudo certo, faremos um novo teste com envio real do produto.',
      ],
    },
    {
      titulo: 'Tratativas do Google compliance',
      iniciativa: 'Ajustes Loja USA Compliance Google',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      status: 'andamento',
      resumo: [
        'Avançamos nos itens que recebemos da agência: faltam apenas 4 dos 18 para finalizar, com previsão de término ainda este mês.',
        'O que não for finalizado dentro desse prazo será tratado como nova demanda, a partir de outubro.',
      ],
      // 14 concluídos é o complemento dos 4 que faltam, ditos no texto. A barra
      // guarda o total e o feito; o texto conta pelo que sobra, que é o que
      // interessa a esta altura. Ao mexer num, refaça a conta no outro: 18 - 13
      // = 5. Porcentagem no texto já foi tentada e saiu — "50%" era exato em 9
      // de 18 e mentia em 10.
      progresso: { feito: 14, total: 18, rotulo: 'itens concluídos' },
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
      resumo: 'Ajustes e configurações adicionais pós-migração para a Rootstock.',
    },
    {
      titulo: 'Tradução do site',
      status: 'teste',
      iniciativa: 'Tradução',
      produto: 'Loja Clube USA',
      epicoId: 49290,
      resumo: [
        'Desenvolvimento concluído: todo o site foi configurado para ser possível traduzir, tanto os textos quanto as imagens.',
        'No caso das imagens, elas deverão ser criadas em versões diferentes por idioma.',
      ],
    },
    {
      titulo: 'App Review — ajustes',
      status: 'entregue',
      iniciativa: 'App de Reviews',
      produto: 'Ybera Reviews / API de Reviews',
      epicoId: 49302,
      resumo: [
        'Realizamos discovery para levantar as melhores opções de apps de reviews dentro do Shopify.',
        'Depois da pesquisa, fizemos um alinhamento com o Wendel e decidimos que não seria produtivo trocar o app atual, o Judge.me, por outro: não haveria ganho real, seria basicamente trocar um pelo outro, e demandaria muitas horas do time técnico. Preferimos manter o Judge.me e fazer alguns pequenos ajustes.',
        'A reunião de entrega ainda será agendada.',
        'Está planejada a construção de um app de reviews próprio, pelo time da Ybera, com início previsto para março de 2027 — ele já está no roadmap, mais abaixo.',
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

     Sem rótulo visível de propósito: o parágrafo do cartão já dá os números em
     texto — hoje, no compliance, "faltam apenas 5 dos 18" — e repeti-los
     embaixo da barra seria a mesma informação duas vezes na mesma respiração.
     Quem lê por leitor de tela não perde nada: os números vivem nos atributos
     aria, que é onde eles fazem falta de verdade. */
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
    return `<div class="rl-progresso-area">
      <div class="rl-progresso" role="progressbar" aria-label="${esc(rotulo)}"
        aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${feito}"
        ><i style="width:${pct}%"></i></div>
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
        ${[].concat(f.resumo || []).map((par) => `<p class="rl-frente-resumo">${esc(par)}</p>`).join('')}
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
      const testando = it.status === 'teste';
      const rodando = it.status === 'andamento';
      /* "em andamento" continua falando só pela barra escura — um selo ali
         repetiria o que a cor já diz, e são cinco linhas assim. "concluído" e
         "em teste" ganham selo porque a cor sozinha não tem legenda: sem a
         palavra, verde e âmbar viram enigma. As palavras são as mesmas dos
         selos dos cartões, de propósito — o mesmo estado não pode ter dois
         nomes no mesmo documento. */
      const selo = feito ? '<span class="rl-rm-feito">concluído</span>'
        : testando ? '<span class="rl-rm-teste">em teste</span>' : '';
      const modBarra = feito ? ' rl-rm-barra-feita'
        : testando ? ' rl-rm-barra-teste'
        : rodando ? ' rl-rm-barra-andamento' : '';
      const tituloBarra = rodando ? ' title="Em andamento"' : '';
      return `<div class="rl-rm-item">
        <span class="rl-rm-titulo"><span class="rl-rm-nome">${esc(it.titulo)}</span>${selo}</span>
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
    /* O período vem da constante declarada; `o.periodo` existe pros testes
       poderem fixar um recorte sem depender do calendário real. Os meses que o
       DevOps não tem são descartados — o título continua nomeando o período
       inteiro, e a contagem soma o que existe. */
    const chavesPeriodo = (Array.isArray(o.periodo) && o.periodo.length) ? o.periodo
      : (PERIODO_MESES.length ? PERIODO_MESES : [escolhido]);
    const mesesPeriodo = chavesPeriodo
      .map((k) => meses.find((m) => m.mes === k))
      .filter(Boolean);
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
          // Sem intro: a contagem ("3 entregas recentes.") não dizia nada que a
          // seção não mostrasse — os cartões estão logo abaixo e dão pra contar
          // no olho. O roadmap mantém a dele porque lá o texto explica o
          // recorte, e não repete o que está à vista.
          id: (agrupar === 'epico' ? 'epico-' : 'ini-') + g.id, titulo: g.nome,
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
      ${masthead(periodo, meta.join(' · '), kpis, heroi(mesesPeriodo))}
      <div class="rl-corpo">${secoes.map((x) => secaoHtml(x)).join('')}</div>
      ${rodape()}
    </div>`;

    return { vazio: false, meses: listaMeses, html };
  }

  return { htmlReport, mesPorExtenso, dataCurta, esc };
});
