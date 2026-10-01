/* Navegação da documentação. Nada aqui é componente do sistema — é cromo das
   fichas, e por isso vive fora de ybera-components.js, que é o que vai para a
   loja. */
(() => {
  'use strict';

  /* A COLUNA ABRE MOSTRANDO O ITEM ABERTO.
     A lista tem quase 40 nomes e a coluna mostra uns 20. Abrindo um componente do
     fim da lista, a coluna nascia no topo e o item aberto ficava escondido na
     rolagem: o realce existia e ninguém via. Não dá para resolver em CSS —
     não há como mandar um contêiner rolar até um filho.

     `scrollTop` e não `scrollIntoView`: o segundo rola TODOS os ancestrais que
     rolam, e a página abriria fora do topo. Aqui só a coluna se mexe. */
  const coluna = document.querySelector('.ds-nav');
  const aberto = coluna && coluna.querySelector('a[aria-current="page"]');
  // Abaixo de 900 a coluna vira faixa horizontal e não rola: nada a fazer.
  if (coluna && aberto && coluna.scrollHeight > coluna.clientHeight + 1) {
    const meio = aberto.offsetTop - (coluna.clientHeight - aberto.offsetHeight) / 2;
    coluna.scrollTop = Math.max(0, meio);
  }

  /* ABAS — Componente · Anatomia · Regras de uso · Acessibilidade.

     As três seções nascem empilhadas no HTML, cada uma com o próprio <h2>.
     Aqui elas viram painéis e os títulos viram as abas. Sem script, a página
     continua inteira e legível: é a mesma decisão do filtro logo abaixo —
     marcação que depende de JS para fazer sentido é marcação que some quando
     o JS não carrega.

     O QUE ISTO CUSTA, declarado: com um painel escondido, o Ctrl+F do
     navegador deixa de achar o que está nele. É o preço de não ter a marcação
     três rolagens abaixo da peça que ela descreve, e vale porque as três
     abas falam da MESMA coisa — quem procura o código de um botão está
     olhando o botão. */
  /* `data-doc-tabs`, e nao `data-yb-tabs`: o prefixo `yb-` e do sistema, e
     desde que o Tabs nasceu como peca os dois colidiam — o comportamento do
     sistema ligava nas abas da doc e escondia o painel inteiro da ficha.
     Cromo da doc nao usa gancho do sistema. */
  for (const grupo of document.querySelectorAll('[data-doc-tabs]')) {
    const paineis = [...grupo.querySelectorAll(':scope > [data-tab]')];
    if (paineis.length < 2) continue;

    const tiras = document.createElement('div');
    tiras.className = 'abas__tiras';
    tiras.setAttribute('role', 'tablist');
    grupo.prepend(tiras);

    const botoes = paineis.map((painel, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'abas__tira';
      b.textContent = painel.dataset.tab;
      /* PONTO NA ABA COM BLOCO POR ESCREVER. Treze fichas ainda nao tem Regras
         de uso ou Acessibilidade, e o bloco vazio existe de proposito: secao
         que some da ficha e uma pergunta que ninguem sabe que ficou sem
         resposta. Empilhados, esses blocos se viam de passagem; em aba, nao —
         por isso o buraco sobe para a tira. O texto escondido vai junto,
         senao o aviso seria so uma bolinha para quem enxerga. */
      if (painel.dataset.pending !== undefined) {
        b.classList.add('abas__tira--pendente');
        const ponto = document.createElement('span');
        ponto.className = 'abas__ponto';
        ponto.setAttribute('aria-hidden', 'true');
        b.appendChild(ponto);
        const dito = document.createElement('span');
        dito.className = 'yb-sr-only';
        dito.textContent = ' — por escrever';
        b.appendChild(dito);
      }
      b.id = `aba-${painel.id}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', painel.id);
      tiras.appendChild(b);

      painel.setAttribute('role', 'tabpanel');
      painel.setAttribute('aria-labelledby', b.id);
      painel.tabIndex = 0;
      // o titulo virou a aba; repeti-lo dentro do painel seria dize-lo duas vezes
      const h = painel.querySelector(':scope > .bloco-titulo');
      if (h) h.classList.add('yb-sr-only');
      return b;
    });

    function abrir(i, focar) {
      paineis.forEach((p, n) => {
        p.hidden = n !== i;
        botoes[n].setAttribute('aria-selected', String(n === i));
        // so a aba ativa entra na ordem de Tab; nas outras anda-se com as setas
        botoes[n].tabIndex = n === i ? 0 : -1;
      });
      if (focar) botoes[i].focus();
    }

    tiras.addEventListener('click', (e) => {
      const i = botoes.indexOf(e.target.closest('.abas__tira'));
      if (i >= 0) {
        abrir(i);
        // o endereco acompanha a aba, para o link ser copiavel — replaceState
        // e nao hash, senao cada clique vira uma parada no botao Voltar
        history.replaceState(null, '', '#' + paineis[i].id);
      }
    });
    tiras.addEventListener('keydown', (e) => {
      const atual = botoes.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const passo = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
      if (passo === undefined) return;
      e.preventDefault();
      const i = passo === -Infinity ? 0 : passo === Infinity ? botoes.length - 1
        : (atual + passo + botoes.length) % botoes.length;
      abrir(i, true);
    });

    /* Um `#marcacao` vindo de fora — do link "De que ela é feita", ou colado
       na barra de endereço — tem de ABRIR a aba, e não rolar para um painel
       escondido. */
    const pelaAncora = () => {
      const i = paineis.findIndex((p) => '#' + p.id === location.hash);
      abrir(i >= 0 ? i : 0);
      if (i > 0) grupo.scrollIntoView({ block: 'start' });
    };
    addEventListener('hashchange', pelaAncora);
    pelaAncora();
  }

  /* ANATOMIA DESENHADA — o numero em cima da parte.

     A posicao e medida no navegador e nao escrita no HTML: a peca e fluida, e
     coordenada escrita a mao mente na primeira largura diferente. Aqui o
     numero e colado no canto do elemento de verdade, e reposicionado quando a
     caixa muda de tamanho.

     Sem script, a legenda numerada continua legivel ao lado da peca — que e a
     mesma decisao das abas e do filtro: marcacao que depende de JS para fazer
     sentido e marcacao que some quando o JS nao carrega. */
  const montarAnatomia = (anat) => {
    const palco = anat.querySelector('.anat__palco');
    const peca = anat.querySelector('.anat__peca');
    const fios = anat.querySelector('.anat__fios');
    const itens = [...anat.querySelectorAll('.anat__legenda > li[data-target]')];
    if (!palco || !peca || !itens.length) return;

    /* O numero conta so o que esta desenhado: parte em painel fechado nao leva
       numero, e a sequencia continua sem buraco (1, 2, 3, e nao 1, 2, 4). */
    let numero = 0;
    const pares = itens.map((li, i) => {
      /* `alvo` e um seletor CSS inteiro, e nao so um nome de classe: ha parte
         que nao tem classe nenhuma — o `summary` do acordeao e o `<img>` do
         cartao sao elementos nativos, e apontar para eles exige seletor. */
      /* A PRIMEIRA VISIVEL, e nao a primeira do HTML. No Header o primeiro
         `.yb-badge` mora dentro do submenu fechado, e o numero apontava para
         o vazio fora do quadro — o contador do carrinho, que se ve, vinha
         depois. Visivel aqui e "nada entre ele e a peca esta escondido",
         medido pelo CSS e nao pela caixa: a aba da anatomia pode estar fechada
         quando isto roda, e ai toda caixa mede zero. */
      const escondido = (el) => {
        for (let n = el; n && n !== peca; n = n.parentElement) {
          const cs = getComputedStyle(n);
          /* Opacidade nao conta: o Toast entra com animacao que comeca em 0,
             e e isso que esta checagem pegaria se medisse no primeiro quadro. */
          if (cs.display === 'none' || cs.visibility === 'hidden') return true;
        }
        return false;
      };
      /* Seletor invalido marca SO esta parte como perdida. Lancado, o erro
         parava o desenho no meio, e as partes seguintes ficavam com o numero
         empilhado no canto — foi o que um par de aspas fez no Header. */
      let todos;
      try {
        const raiz = peca.firstElementChild?.matches(li.dataset.target) ? [peca.firstElementChild] : [];
        todos = [...raiz, ...peca.querySelectorAll(li.dataset.target)];
      } catch { todos = []; }
      if (!todos.length) { li.classList.add('anat__item--perdido'); return null; }
      const alvo = todos.find((el) => !escondido(el));
      /* Existe, mas so dentro de painel fechado (submenu, busca, gaveta): sem
         numero no desenho, e a legenda diz por que. */
      if (!alvo) {
        li.classList.add('anat__item--oculto');
        li.insertAdjacentHTML('afterbegin', '<span class="anat__num anat__num--vazio" aria-hidden="true"></span>');
        return null;
      }
      numero += 1;
      const selo = document.createElement('span');
      selo.className = 'anat__selo';
      selo.textContent = String(numero);
      selo.setAttribute('aria-hidden', 'true');
      palco.appendChild(selo);
      li.insertAdjacentHTML('afterbegin', `<span class="anat__num" aria-hidden="true">${numero}</span>`);
      return { li, alvo, selo, ordem: i };
    }).filter(Boolean);
    /* As sem numero vao para o fim da legenda: no meio, quebravam a sequencia
       que o olho segue (1, 2, 3, —, 4). */
    for (const li of itens) if (li.classList.contains('anat__item--oculto')) li.parentElement.appendChild(li);

    /* O SELO SAI DE CIMA DA PECA E VAI PARA A MARGEM, ligado por um fio.

       Colado no canto do elemento ele cobria justamente o que apontava: no
       alerta, tres numeros caiam em cima do titulo. Na margem nao ha o que
       cobrir, e o fio diz exatamente qual pedaco e qual — que era o que
       faltava para o desenho valer mais que a lista.

       QUEM ATRAVESSA A PECA INTEIRA e ancorado EM CIMA, com fio vertical: o
       container tem a largura toda, entao nao ha margem "mais perto" dele, e
       um fio horizontal ate a borda diria menos do que um que desce no topo. */
    const RAIO = 14, PASSO = 32, MARGEM = 8;
    const posicionar = () => {
      const base = palco.getBoundingClientRect();
      const larg = base.width;
      const cp = peca.getBoundingClientRect();
      const pecaX = cp.left - base.left, pecaW = cp.width;
      const emCima = [], aEsquerda = [], aDireita = [];
      for (const par of pares) {
        /* A caixa e cortada na largura da peca. No Track o item da borda
           passa do trilho de proposito — e a fatia do proximo —, e sem o
           corte o fio ia buscar a borda direita dele fora do quadro. */
        const r = par.alvo.getBoundingClientRect();
        const esq = Math.max(r.left, cp.left), dir = Math.min(r.right, cp.right);
        par.caixa = { x: esq - base.left, y: r.top - base.top, w: Math.max(dir - esq, 0), h: r.height };
        /* So o CONTAINER e ancorado em cima. A regra era "quem tem a largura
           toda", e no cartao de oferta tres filhos tem — desfoque, link e
           acao —, entao tres fios verticais desciam a foto inteira, o da acao
           de ponta a ponta. Filho largo tem borda esquerda e direita como
           qualquer outro; quem nao tem lado e so a raiz. */
        if (par.alvo === peca.firstElementChild) emCima.push(par);
        else (par.caixa.x + par.caixa.w / 2 < larg / 2 ? aEsquerda : aDireita).push(par);
      }
      /* FIO QUE ATRAVESSA OUTRA PARTE SOBE PARA O TOPO. Numa fileira — os itens
         da barra do Nav —, o fio horizontal do terceiro item vinha da margem
         passando por cima do primeiro e do segundo, e lia como sublinhado deles.
         Quando a reta da margem ate a parte cruza outra parte, e a descida de
         cima ate ela nao cruza nada, o numero vai para cima dela e o fio desce
         reto. A raiz nao conta como obstaculo (contem todo mundo), nem quem
         contem a parte ou esta dentro dela. */
      const cruza = (par, r) => pares.some((o) => o !== par
        && o.alvo !== peca.firstElementChild
        && !o.alvo.contains(par.alvo) && !par.alvo.contains(o.alvo)
        && o.caixa.w > 0 && o.caixa.h > 0
        /* Faixa que atravessa a peca de ponta a ponta (o aviso no topo do
           Header) e fundo, nao obstaculo: todo fio que desce cruzaria ela.
           90% e nao menos: com 60%, o titulo do Post virava "faixa" e o resumo
           subia para o topo atravessando ele. */
        && o.caixa.w < pecaW * 0.9
        && o.caixa.x < r.x2 && o.caixa.x + o.caixa.w > r.x1
        && o.caixa.y < r.y2 && o.caixa.y + o.caixa.h > r.y1);
      const doTopo = [];
      for (const lado of [aEsquerda, aDireita]) {
        for (const par of [...lado]) {
          const { x: cx, y: cy, w, h } = par.caixa;
          const meio = cy + h / 2;
          const joelho = lado === aEsquerda ? pecaX - 8 : pecaX + pecaW + 8;
          const borda = lado === aEsquerda ? cx : cx + w;
          const horizontal = { x1: Math.min(joelho, borda), x2: Math.max(joelho, borda), y1: meio - 1, y2: meio + 1 };
          const centro = cx + w / 2;
          const vertical = { x1: centro - 1, x2: centro + 1, y1: 0, y2: cy };
          if (cruza(par, horizontal) && !cruza(par, vertical)) {
            lado.splice(lado.indexOf(par), 1);
            doTopo.push(par);
          }
        }
      }
      /* Dentro de cada margem, os que disputam a MESMA altura se abrem em torno
         dela, e nao para baixo em fila. No alerta, icone, corpo e titulo
         comecam todos na mesma linha: empilhando para baixo, o terceiro caia
         abaixo do proprio alerta e o fio subia meia caixa para voltar. */
      for (const lado of [aEsquerda, aDireita]) {
        lado.sort((a, b) => (a.caixa.y + a.caixa.h / 2) - (b.caixa.y + b.caixa.h / 2));
        const grupos = [];
        for (const par of lado) {
          const c = par.caixa.y + par.caixa.h / 2;
          const ultimo = grupos[grupos.length - 1];
          if (ultimo && c - ultimo.c < PASSO) ultimo.itens.push(par);
          else grupos.push({ c, itens: [par] });
        }
        /* Dentro do grupo, a ordem e a da LEGENDA e nao a do DOM: eles
           disputam a mesma altura, entao quem decide quem fica em cima somos
           nos — e 2, 3, 4 lendo de cima para baixo e o unico arranjo que nao
           obriga a procurar o proximo numero. */
        for (const g of grupos) g.itens.sort((a, b) => a.ordem - b.ordem);
        const alturas = new Map();
        let piso = MARGEM + RAIO;
        for (const g of grupos)
          for (let i = 0; i < g.itens.length; i++) {
            const y = Math.max(g.c + (i - (g.itens.length - 1) / 2) * PASSO, piso);
            alturas.set(g.itens[i], y);
            piso = y + PASSO;
          }
        for (const par of lado) {
          const y = alturas.get(par);
          par.selo.style.insetBlockStart = (y - RAIO) + 'px';
          par.selo.style.insetInlineStart = (lado === aEsquerda ? MARGEM : larg - MARGEM - RAIO * 2) + 'px';
          /* O JOELHO FICA FORA DA PECA, na calha. Antes ele caia no meio do
             caminho, ou seja, DENTRO do cartao: a perna vertical cruzava o
             conteudo. Assim o unico trecho que entra na peca e uma reta
             horizontal na altura exata do elemento — que e o que faz o fio
             apontar em vez de so terminar perto. */
          const joelho = lado === aEsquerda ? pecaX - 8 : pecaX + pecaW + 8;
          par.ponto = { sx: lado === aEsquerda ? MARGEM + RAIO * 2 : larg - MARGEM - RAIO * 2, sy: y,
                        jx: joelho,
                        ax: lado === aEsquerda ? par.caixa.x : par.caixa.x + par.caixa.w,
                        ay: par.caixa.y + par.caixa.h / 2 };
        }
      }
      /* Os de cima ficam sobre a PECA, e nao sobre a calha: ancorados em x=52
         eles caem no canto do container, que e exatamente onde o fio vertical
         precisa descer. */
      let x = pecaX + PASSO;
      for (const par of emCima) {
        par.selo.style.insetBlockStart = MARGEM + 'px';
        par.selo.style.insetInlineStart = (x - RAIO) + 'px';
        par.ponto = { sx: x, sy: MARGEM + RAIO * 2, ax: x, ay: par.caixa.y, vertical: true };
        x += PASSO;
      }
      for (const par of doTopo) {
        const cx = par.caixa.x + par.caixa.w / 2;
        par.selo.style.insetBlockStart = MARGEM + 'px';
        par.selo.style.insetInlineStart = (cx - RAIO) + 'px';
        par.ponto = { sx: cx, sy: MARGEM + RAIO * 2, ax: cx, ay: par.caixa.y, vertical: true };
      }
      /* O QUADRO CRESCE SE OS NUMEROS NAO COUBEREM. Numa fileira de cinco
         partes na mesma altura (Menu e os quatro botoes do Header), a pilha
         da margem passava da borda de baixo. */
      const fundo = Math.max(0, ...pares.map((p) => parseFloat(p.selo.style.insetBlockStart) || 0)) + RAIO * 2 + MARGEM;
      if (fundo > base.height) palco.style.minBlockSize = Math.ceil(fundo) + 'px';
      fios.setAttribute('viewBox', `0 0 ${larg} ${Math.max(base.height, fundo)}`);
      fios.setAttribute('width', larg);
      fios.setAttribute('height', Math.max(base.height, fundo));
      fios.innerHTML = pares.filter((p) => p.ponto).map((p) => {
        const { sx, sy, jx, ax, ay, vertical } = p.ponto;
        // desce na calha e entra reto: le como chamada de desenho tecnico.
        // Diagonal le como rabisco, e cruzaria a peca na diagonal.
        const d = vertical ? `M${sx},${sy} L${ax},${ay}`
          : `M${sx},${sy} L${jx},${sy} L${jx},${ay} L${ax},${ay}`;
        return `<path d="${d}" fill="none" />`;
      }).join('');
    };
    posicionar();
    // a peca so assenta depois de fonte e imagem; e reflui quando a janela muda
    if (window.ResizeObserver) new ResizeObserver(posicionar).observe(palco);
    addEventListener('resize', posicionar);
    document.fonts?.ready.then(posicionar);

    for (const { li, alvo, selo } of pares) {
      const acender = (liga) => {
        alvo.classList.toggle('anat__alvo--aceso', liga);
        selo.classList.toggle('anat__selo--aceso', liga);
        li.classList.toggle('anat__item--aceso', liga);
      };
      li.addEventListener('mouseenter', () => acender(true));
      li.addEventListener('mouseleave', () => acender(false));
      li.tabIndex = 0;
      li.addEventListener('focus', () => acender(true));
      li.addEventListener('blur', () => acender(false));
      selo.addEventListener('mouseenter', () => acender(true));
      selo.addEventListener('mouseleave', () => acender(false));
    }
  };
  /* SO MONTA QUANDO O QUADRO TEM LARGURA. A anatomia mora numa aba que nasce
     fechada, e montada ali todo elemento mede zero: o Header, que troca de
     layout pela largura do proprio container, estava no arranjo de celular,
     os botoes de acao contavam como escondidos e tres numeros caiam no mesmo
     ponto. Com a aba fechada, espera ela abrir. */
  for (const anat of document.querySelectorAll('[data-yb-anatomy]')) {
    const palco = anat.querySelector('.anat__palco');
    if (!palco) continue;
    if (palco.getBoundingClientRect().width > 0 || !window.ResizeObserver) { montarAnatomia(anat); continue; }
    const espera = new ResizeObserver(() => {
      if (palco.getBoundingClientRect().width === 0) return;
      espera.disconnect();
      montarAnatomia(anat);
    });
    espera.observe(palco);
  }

  /* FILTRO DA COLUNA (e da galeria, quando ela existe).
     Com 37 peças, "onde está o cartão de oferta?" custava ler a lista inteira.
     O campo nasce `hidden` no HTML e só aparece aqui: sem script ele seria uma
     caixa que não filtra nada, e a galeria continua inteira e navegável.

     Filtra por NOME e pela linha de descrição — quem procura "frete" não sabe
     que a peça se chama "Certification seals". Grupo sem resultado some junto,
     senão sobra um título de família com o vazio embaixo.

     `/` foca o campo, como em toda documentação — menos quando já se está
     digitando em algum lugar, que é o defeito clássico desse atalho. */
  const caixa = document.querySelector('[data-yb-filter]');
  if (!caixa) return;
  /* UM campo, o do topo, e ele procura em tudo. O catalogo ja teve um segundo,
     e ele nunca apareceu: este `querySelector` pega o PRIMEIRO do documento,
     que e sempre o do topo, entao o do catalogo ficava `hidden` para sempre.
     O corte por degrau que ele prometia virou os chips, que sao links. */
  const painel = caixa.closest('.ds-top__busca');
  const aviso = painel && painel.querySelector('.nav-conta');
  const itens = [...document.querySelectorAll('.ds-nav li')];
  const grupos = [...document.querySelectorAll('.grade-grupo')];
  const pecas = [...document.querySelectorAll('.peca')];
  // Ha paginas com coluna e sem grade, e o contrario; o campo serve as duas.
  if (!itens.length && !pecas.length) return;
  if (painel) painel.hidden = false;

  const sem = (t) => t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* A coluna casa so pelo NOME — e a lista de nomes, e quem digita ali sabe o
     que procura. Os cartoes da galeria casam tambem pela linha de descricao:
     quem procura "frete" nao sabe que a peca se chama "Certification seals". */
  function filtrar() {
    const termo = sem(caixa.value.trim());
    for (const li of itens) li.hidden = !!termo && !sem(li.textContent).includes(termo);
    for (const peca of pecas) {
      peca.hidden = !!termo && !sem(peca.textContent).includes(termo);
    }
    for (const g of grupos) g.hidden = !g.querySelector('.peca:not([hidden])');
    /* Na arvore, grupo que ficou sem nenhum item some — e os que sobraram
       ABREM, senao o resultado da busca fica escondido dentro de um
       <details> fechado e a pessoa conclui que nao achou nada. */
    for (const d of document.querySelectorAll('.ds-nav__grupo')) {
      const vivos = d.querySelectorAll('li:not([hidden])').length;
      d.hidden = termo && !vivos;
      if (termo && vivos) d.open = true;
    }
    /* A CONTA SOMA AS DUAS LISTAS, sem contar a mesma peca duas vezes. Ela lia
       so a coluna quando havia coluna — e a coluna casa so por NOME. No
       catalogo, "organismo" achava zero nome e 14 cartoes, e o contador dizia
       "Nada com esse nome" ao lado das 14 regioes que estavam na tela. */
    const achados = new Set();
    for (const li of itens) if (!li.hidden) achados.add(sem(li.textContent.trim()));
    for (const p of pecas) if (!p.hidden) achados.add(sem((p.querySelector('b') || p).textContent.trim()));
    const conta = achados.size;
    if (aviso) {
      aviso.textContent = !termo ? ''
        : conta === 0 ? 'Nada com esse nome'
        : conta === 1 ? '1 peça' : conta + ' peças';
    }
  }

  caixa.addEventListener('input', filtrar);
  caixa.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { caixa.value = ''; filtrar(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const alvo = e.target;
    if (alvo && (alvo.matches('input, textarea, select') || alvo.isContentEditable)) return;
    e.preventDefault();
    caixa.focus();
  });
})();

/* CÓDIGO DA PEÇA — HTML · CSS · JS · Tokens, e o seletor de variante.

   Sem script as quatro caixas ficam uma embaixo da outra e o HTML mostra só a
   primeira variante: o código continua lá, legível e copiável. O seletor troca
   só o HTML — a prévia acima segue com todas as variantes lado a lado, porque
   comparar é o que a ficha tem de melhor. Setas movem entre as abas, como numa
   tablist de verdade. */
(() => {
  'use strict';
  for (const caixa of document.querySelectorAll('[data-yb-code]')) {
    const abas = [...caixa.querySelectorAll('[data-code-tab]')];
    const paineis = [...caixa.querySelectorAll('[data-code-panel]')];
    const variante = caixa.querySelector('[data-code-variant]');
    const abrir = (qual, focar) => {
      abas.forEach((a) => {
        const sim = a.dataset.codeTab === qual;
        a.setAttribute('aria-selected', String(sim));
        a.tabIndex = sim ? 0 : -1;
        if (sim && focar) a.focus();
      });
      paineis.forEach((p) => { p.hidden = p.dataset.codePanel !== qual; });
      if (variante) variante.closest('.codigo__variante').hidden = qual !== 'html';
    };
    abas.forEach((a, i) => {
      a.addEventListener('click', () => abrir(a.dataset.codeTab));
      a.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        abrir(abas[(i + d + abas.length) % abas.length].dataset.codeTab, true);
      });
    });
    if (variante) variante.addEventListener('change', () => {
      caixa.querySelectorAll('[data-code-variant-panel]').forEach((p) => {
        p.hidden = p.dataset.codeVariantPanel !== variante.value;
      });
    });
    abrir('html');
  }
})();
