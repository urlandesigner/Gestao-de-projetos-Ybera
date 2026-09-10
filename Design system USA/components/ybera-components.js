/* =========================================================================
   YBERA DESIGN SYSTEM · COMPORTAMENTO

   Vanilla, sem dependência, ~4 KB. Progressive enhancement: se este arquivo
   não carregar, os formulários continuam enviando e os links continuam
   navegando. Nada aqui é obrigatório para a página funcionar.

   Ligar por atributo, nunca por classe de estilo — assim mudar o visual não
   quebra o comportamento e vice-versa.

     <button data-yb-open="cart-drawer">
     <dialog id="cart-drawer" class="yb-dialog yb-dialog--drawer">
     <div class="yb-stepper" data-yb-stepper>
     <div class="yb-gallery" data-yb-gallery>
     <button data-yb-fav aria-pressed="false" data-label-off="…" data-label-on="…">
     <button class="yb-switch" role="switch" aria-checked="false" data-yb-switch>
     <aside class="yb-partner" data-yb-partner>  +  <button class="yb-partner__avatar">
     <div class="yb-track__nav" data-yb-track-nav="<id do trilho>" hidden>
     <div class="yb-buybar" data-yb-buybar hidden>  +  <button data-yb-buybar-anchor>

   API pública: window.Ybera.toast({...})
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     DIALOG
     <dialog> nativo já dá foco preso, Esc e backdrop. O que falta é abrir,
     devolver o foco a quem abriu e fechar no clique fora.
     --------------------------------------------------------------------- */
  /* Pilha, nao variavel unica: abrir B de dentro de A sobrescrevia a
     referencia de A. Ao fechar B o foco voltava certo, mas fechar A depois
     nao devolvia foco a lugar nenhum — o leitor de tela caia no topo da
     pagina, que e exatamente o que este trecho existe para evitar. */
  var pilhaGatilho = [];

  function abrir(id, gatilho) {
    var dlg = document.getElementById(id);
    if (!dlg || typeof dlg.showModal !== 'function') return;
    pilhaGatilho.push(gatilho || document.activeElement);
    dlg.showModal();
  }

  /* Onde o gesto COMECOU, nao onde terminou. Decidir "clique no backdrop"
     pelas coordenadas do `click` fechava a gaveta quando alguem arrastava a
     barra de rolagem do corpo e soltava fora dela. */
  var comecouNoBackdrop = false;
  document.addEventListener('mousedown', function (e) {
    comecouNoBackdrop = e.target instanceof Element &&
      e.target.tagName === 'DIALOG' && e.target.open;
  }, true);

  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    var abre = e.target.closest('[data-yb-open]');
    if (abre) { e.preventDefault(); abrir(abre.getAttribute('data-yb-open'), abre); return; }

    var fecha = e.target.closest('[data-yb-close]');
    if (fecha) {
      e.preventDefault();
      var d = fecha.closest('dialog');
      if (d) d.close();
      return;
    }

    // clique no backdrop: o alvo é o próprio <dialog>, não o conteúdo
    if (e.target.tagName === 'DIALOG' && e.target.open && comecouNoBackdrop) {
      var r = e.target.getBoundingClientRect();
      // um .click() programatico reporta 0,0 — nao e clique fora, e ausencia
      // de coordenada; so fecha quando ha ponteiro de verdade.
      if (!e.clientX && !e.clientY) return;
      var dentro = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
      if (!dentro) e.target.close();
    }
  });

  // devolve o foco a quem abriu — senão o leitor de tela volta ao topo da página
  document.addEventListener('close', function (e) {
    if (e.target.tagName !== 'DIALOG') return;
    var gatilho = pilhaGatilho.pop();
    if (gatilho && document.contains(gatilho)) gatilho.focus();
  }, true);

  /* ---------------------------------------------------------------------
     TOAST
     --------------------------------------------------------------------- */
  function containerToast() {
    var c = document.querySelector('.yb-toasts');
    if (!c) {
      c = document.createElement('div');
      c.className = 'yb-toasts';
      c.setAttribute('role', 'region');
      c.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(c);
    }
    return c;
  }

  function toast(opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'yb-toast' + (opts.variant ? ' yb-toast--' + opts.variant : '');
    // erro interrompe o leitor de tela; o resto espera a pausa
    el.setAttribute('role', opts.variant === 'danger' ? 'alert' : 'status');

    var body = document.createElement('div');
    body.className = 'yb-toast__body';
    if (opts.title) {
      var t = document.createElement('b');
      t.className = 'yb-toast__title';
      t.textContent = opts.title;
      body.appendChild(t);
    }
    if (opts.text) {
      var p = document.createElement('p');
      p.className = 'yb-toast__text';
      p.textContent = opts.text;
      body.appendChild(p);
    }

    var x = document.createElement('button');
    x.className = 'yb-toast__close';
    x.type = 'button';
    x.setAttribute('aria-label', opts.closeLabel || 'Dismiss');
    x.textContent = '×';

    el.appendChild(body);
    el.appendChild(x);
    containerToast().appendChild(el);

    var prazo = opts.duration === 0 ? 0 : (opts.duration || 5000);
    var timer = null;

    function sair() {
      if (!el.isConnected) return;
      el.classList.add('yb-toast--leaving');
      var fim = function () { if (el.isConnected) el.remove(); };
      el.addEventListener('animationend', fim, { once: true });
      setTimeout(fim, 400); // rede de segurança: reduced-motion não dispara animationend
    }
    function agendar() { if (prazo) timer = setTimeout(sair, prazo); }

    x.addEventListener('click', sair);
    // não some enquanto a pessoa está lendo
    el.addEventListener('mouseenter', function () { clearTimeout(timer); });
    el.addEventListener('mouseleave', agendar);
    el.addEventListener('focusin', function () { clearTimeout(timer); });
    el.addEventListener('focusout', agendar);
    agendar();

    return { dismiss: sair };
  }

  /* ---------------------------------------------------------------------
     QUANTITY STEPPER
     --------------------------------------------------------------------- */
  function limites(input) {
    return {
      min: input.min === '' ? 1 : +input.min,
      max: input.max === '' ? Infinity : +input.max,
    };
  }
  // `+input.value || min` tratava "0" como vazio, porque 0 e falsy: um
  // stepper com min="0" em zero pulava para 2 no primeiro clique.
  function valorAtual(input, min) {
    return input.value.trim() === '' ? min : +input.value;
  }

  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    var b = e.target.closest('[data-yb-stepper] button');
    if (!b) return;
    // Um <button> sem type dentro de <form> e submit. O stepper mora no bloco
    // de compra, que e um form: sem isto, cada "+" enviava o carrinho.
    e.preventDefault();
    var wrap = b.closest('[data-yb-stepper]');
    var input = wrap.querySelector('input');
    if (!input) return;

    var lim = limites(input);
    var min = lim.min, max = lim.max;
    var passo = (b.getAttribute('data-yb-step') === 'down') ? -1 : 1;
    var novo = Math.min(max, Math.max(min, valorAtual(input, min) + passo));

    if (novo === +input.value) return;
    input.value = novo;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    sincronizarStepper(wrap);
  });

  function sincronizarStepper(wrap) {
    var input = wrap.querySelector('input');
    if (!input) return;
    var lim = limites(input);
    var min = lim.min, max = lim.max;
    var v = valorAtual(input, min);
    // valor digitado a mao tambem obedece aos limites
    if (v < min || v > max) { v = Math.min(max, Math.max(min, v)); input.value = v; }
    var down = wrap.querySelector('[data-yb-step="down"]');
    var up = wrap.querySelector('[data-yb-step="up"]');
    if (down) down.disabled = v <= min;
    if (up) up.disabled = v >= max;
  }

  /* ---------------------------------------------------------------------
     FAVORITAR — mesmo `.yb-iconbtn`, so aria-pressed e rotulo trocando de
     lado. Ligado por atributo (`data-yb-fav`), como o resto do arquivo: o
     rotulo que o leitor de tela anuncia mora no HTML (`data-label-*`), nao
     numa string presa dentro do JS onde ninguem revisa tradução.

     Sem este arquivo o botao continua existindo e clicavel — so nao guarda
     nada, igual ao "Add to cart" desta mesma pagina, que tambem depende de
     script para fazer algo alem de existir.
     --------------------------------------------------------------------- */
  // `<use>` para arquivo externo nao obedece a `fill` desta folha — quem
  // resolve isso e o CSS de dentro do proprio sprite (ver icons.svg). O que
  // sobra para o JS fazer e trocar QUAL simbolo o `<use>` aponta.
  function pintarIconeFav(b, ligado) {
    var uso = b.querySelector('.yb-icon use');
    if (!uso) return;
    var href = uso.getAttribute('href') || '';
    var arquivo = href.split('#')[0];
    var alvo = b.getAttribute(ligado ? 'data-icon-on' : 'data-icon-off');
    if (alvo) uso.setAttribute('href', arquivo + '#' + alvo);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-yb-fav]');
    if (!b) return;
    var ligado = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', String(!ligado));
    var rotulo = b.getAttribute(!ligado ? 'data-label-on' : 'data-label-off');
    if (rotulo) b.setAttribute('aria-label', rotulo);
    pintarIconeFav(b, !ligado);
  });

  /* ---------------------------------------------------------------------
     PARTNER — recolhe o balao na rolagem
       <aside class="yb-partner" data-yb-partner>
         <button class="yb-partner__avatar" aria-expanded="true" aria-controls="...">
         <div class="yb-partner__bubble" id="...">

     Duas maneiras de recolher, e as duas importam: a rolagem (o recado ja foi
     lido, some da frente da arte) e o clique no avatar (reabre quando a pessoa
     quer relembrar de quem e o desconto). Depois do primeiro clique a rolagem
     para de mandar — quem abriu na mao nao quer ver fechar sozinho de novo.

     `passive:true` no scroll: este ouvinte nunca chama preventDefault, e sem a
     marca o navegador espera por ele antes de rolar.

     Sem este arquivo o balao fica aberto. E o estado certo para ficar preso:
     o recado aparece, so nao recolhe.
     --------------------------------------------------------------------- */
  (function () {
    var alvo = document.querySelector('[data-yb-partner]');
    if (!alvo) return;
    var botao = alvo.querySelector('.yb-partner__avatar');
    var LIMITE = 96;
    var naMao = false;

    function pintar(recolhido) {
      if (recolhido) alvo.setAttribute('data-recolhido', '');
      else alvo.removeAttribute('data-recolhido');
      if (botao) botao.setAttribute('aria-expanded', String(!recolhido));
    }

    if (botao) botao.addEventListener('click', function () {
      naMao = true;
      pintar(!alvo.hasAttribute('data-recolhido') );
    });

    window.addEventListener('scroll', function () {
      if (naMao) return;
      pintar(window.scrollY > LIMITE);
    }, { passive: true });
  })();

  /* ---------------------------------------------------------------------
     SWITCH
       <button class="yb-switch" role="switch" aria-checked="false" data-yb-switch>
     <aside class="yb-partner" data-yb-partner>  +  <button class="yb-partner__avatar">

     So vira o estado. O que o estado FAZ — somar o seguro ao total, gravar a
     escolha — e de quem monta a pagina; aqui o switch nao sabe o que liga.
     Sem este arquivo o botao continua clicavel e nao muda de lado, que e o
     mesmo contrato do favorito e do "Add to cart" ao lado.
     --------------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-yb-switch]');
    if (!s || s.disabled) return;
    s.setAttribute('aria-checked', String(s.getAttribute('aria-checked') !== 'true'));
  });

  /* ---------------------------------------------------------------------
     TRILHO — setas do .yb-track
       <div class="yb-track" id="reviews-track">…</div>
       <div class="yb-track__nav" data-yb-track-nav="reviews-track" hidden>
         <button class="yb-iconbtn" data-yb-track-step="prev" aria-label="Previous">
         <button class="yb-iconbtn" data-yb-track-step="next" aria-label="Next">

     O trilho rola sozinho (overflow nativo, arrasto no toque); as setas sao
     conveniencia de mouse. Nascem `hidden` e e ESTE arquivo que as revela —
     sem script, um botao que nao faz nada e pior que nenhum botao. Andam um
     cartao por clique (largura do primeiro filho + gap) e se desligam nas
     pontas, para o leitor de tela e o olho saberem que acabou.
     --------------------------------------------------------------------- */
  function trilhoDe(nav) {
    return document.getElementById(nav.getAttribute('data-yb-track-nav') || '');
  }

  function atualizarSetas(nav) {
    var t = trilhoDe(nav);
    if (!t) return;
    var fim = t.scrollWidth - t.clientWidth - 1;
    var prev = nav.querySelector('[data-yb-track-step="prev"]');
    var next = nav.querySelector('[data-yb-track-step="next"]');
    if (prev) prev.disabled = t.scrollLeft <= 0;
    if (next) next.disabled = t.scrollLeft >= fim;
    // sem sobra para rolar, as setas nao tem trabalho: somem em vez de
    // ficarem as duas apagadas
    nav.hidden = fim <= 0;
  }

  function ligarTrilhos() {
    var navs = document.querySelectorAll('[data-yb-track-nav]');
    for (var i = 0; i < navs.length; i++) {
      (function (nav) {
        var t = trilhoDe(nav);
        if (!t) return;
        nav.hidden = false;
        atualizarSetas(nav);
        t.addEventListener('scroll', function () { atualizarSetas(nav); }, { passive: true });
        window.addEventListener('resize', function () { atualizarSetas(nav); });
      })(navs[i]);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarTrilhos);
  else ligarTrilhos();

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-yb-track-step]');
    if (!b) return;
    var nav = b.closest('[data-yb-track-nav]');
    var t = nav && trilhoDe(nav);
    if (!t || !t.firstElementChild) return;
    var passo = t.firstElementChild.getBoundingClientRect().width +
      (parseFloat(getComputedStyle(t).columnGap) || 0);
    var sentido = b.getAttribute('data-yb-track-step') === 'prev' ? -1 : 1;
    var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    t.scrollBy({ left: passo * sentido, behavior: suave ? 'smooth' : 'auto' });
  });

  /* ---------------------------------------------------------------------
     BARRA DE COMPRA — aparece quando o botao real sai de vista
       <button class="yb-btn yb-btn--primary" data-yb-buybar-anchor>
       <div class="yb-buybar" data-yb-buybar hidden>…</div>

     Enquanto o "Add to cart" de verdade esta na tela (ou ainda abaixo dela,
     antes de a pessoa chegar nele), a barra fica escondida: duas acoes iguais
     visiveis ao mesmo tempo confundem. Ela so entra quando o botao ja passou
     para cima. Sem IntersectionObserver (ou sem script) a barra nao aparece,
     e o botao real continua la.
     --------------------------------------------------------------------- */
  (function () {
    var barra = document.querySelector('[data-yb-buybar]');
    var ancora = document.querySelector('[data-yb-buybar-anchor]');
    if (!barra || !ancora || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entradas) {
      // A regra e uma so: a barra existe enquanto o botao real NAO esta a
      // vista. Ela ja exigiu tambem que a ancora tivesse passado para cima
      // (`boundingClientRect.bottom < 0`) — e essa segunda condicao abria um
      // buraco medido de 1.170px no celular: o CTA nasce em y=1125 numa tela
      // de 812, entao do topo ate rolar uma tela e meia nao havia botao de
      // compra em lugar nenhum. Nem o da pagina, nem o da barra.
      barra.hidden = entradas[0].isIntersecting;
    }, { threshold: 0 }).observe(ancora);
  })();

  /* ---------------------------------------------------------------------
     VARIANTE — a escolha muda a PAGINA, nao so o rotulo

       <div data-yb-variante>
         <input type="radio" data-preco="$59.90" data-foto="1" [data-yb-esgotado]>
       <b data-yb-variante-eco>          o eco "Size: 500g"
       [data-yb-preco]                   preco do bloco de compra E da barra
       [data-yb-selo]                    In stock / Sold out
       [data-yb-comprar]                 o botao, com data-rotulo
       [data-yb-avisar]                  o campo de aviso de volta
       [data-yb-barra-comprar] / [data-yb-barra-avisar]

     Antes daqui, o script so mantinha o eco em dia: trocar de tamanho
     mudava a palavra ao lado de "Size:" e mais nada. O preco do topo ficava
     parado enquanto o cartao selecionado dizia outro numero, o botao seguia
     oferecendo o valor do primeiro, e a foto continuava sendo a do tamanho
     que a pessoa acabara de abandonar. Tres mentiras por clique.

     Duas regras que o resto do arquivo tambem segue:
     - o HTML ja nasce certo (o servidor renderiza o estado da variante que
       esta `checked`), entao sem JS a pagina nao mente — so nao muda;
     - o estado de cada variante vem do ATRIBUTO, nao de uma tabela paralela
       aqui dentro. Duas listas do mesmo fato divergem no primeiro dia.
     --------------------------------------------------------------------- */
  function trocarVariante(entrada) {
    var grupo = entrada.closest('[data-yb-variante]');
    if (!grupo) return;
    var rotulo = grupo.parentElement.querySelector('[data-yb-variante-eco]');
    var nome = document.querySelector('label[for="' + entrada.id + '"] .yb-swatches__name');
    if (rotulo && nome) rotulo.textContent = nome.textContent.trim();

    var preco = entrada.getAttribute('data-preco');
    // Presenca, nao valor: `data-yb-esgotado` no radio e o mesmo gancho que a
    // folha usa para riscar o cartao. Um fato, um atributo.
    var tem = !entrada.hasAttribute('data-yb-esgotado');

    if (preco) {
      [].forEach.call(document.querySelectorAll('[data-yb-preco]'), function (el) {
        el.textContent = preco;
      });
    }

    var selo = document.querySelector('[data-yb-selo]');
    if (selo) {
      selo.textContent = tem ? 'In stock' : 'Sold out';
      selo.classList.toggle('yb-badge--success', tem);
      selo.classList.toggle('yb-badge--danger', !tem);
    }

    // `[data-rotulo]` desempata: os DOIS botoes de comprar carregam
    // `data-yb-comprar` (a acao e a mesma), mas so o da pagina tem rotulo com
    // preco dentro. O da barra fixa diz so "Add to cart" — o preco dele mora
    // no `[data-yb-preco]` ao lado, que o laco acima ja atualizou.
    var botao = document.querySelector('[data-yb-comprar][data-rotulo]');
    if (botao) {
      botao.disabled = !tem;
      // Os dois rotulos vem do HTML: string de interface escrita aqui dentro
      // e string que ninguem encontra no dia de traduzir a loja.
      botao.textContent = tem
        ? (botao.getAttribute('data-rotulo') || '') + (preco || '')
        : (botao.getAttribute('data-rotulo-esgotado') || '');
    }

    // Quantidade some quando nao ha o que contar; o aviso de volta ocupa o
    // lugar da acao.
    var passo = document.querySelector('[data-yb-stepper]');
    if (passo) passo.hidden = !tem;
    var avisar = document.querySelector('[data-yb-avisar]');
    if (avisar) avisar.hidden = tem;
    var bComprar = document.querySelector('[data-yb-barra-comprar]');
    if (bComprar) bComprar.hidden = !tem;
    var bAvisar = document.querySelector('[data-yb-barra-avisar]');
    if (bAvisar) bAvisar.hidden = tem;

    // A galeria acompanha: escolher 1kg e continuar vendo o pote de 250g e a
    // mentira mais silenciosa das tres. Reaproveita o radio das miniaturas,
    // que ja e o mecanismo de troca de slide — nada de segundo caminho.
    var foto = entrada.getAttribute('data-foto');
    if (foto !== null) {
      var mini = document.getElementById('g' + foto);
      if (mini && !mini.checked) {
        mini.checked = true;
        mini.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // O endereco passa a dizer qual variante esta aberta. Sem isto, link
    // compartilhado sempre abria no primeiro tamanho — e quem mandou o link
    // achava que tinha mandado o outro. `replaceState` e nao `pushState`:
    // trocar de tamanho nao e navegar, e o botao Voltar nao deve desfazer
    // escolha de combo.
    if (window.history && history.replaceState) {
      var u = new URL(window.location.href);
      u.searchParams.set('variant', entrada.id.replace(/^tam/, ''));
      history.replaceState(null, '', u);
    }
  }

  document.addEventListener('change', function (e) {
    if (e.target.matches && e.target.matches('[data-yb-variante] input')) trocarVariante(e.target);
  });

  // Abertura com ?variant=N: o link precisa abrir no tamanho que ele promete.
  (function () {
    var n = new URLSearchParams(window.location.search).get('variant');
    if (n === null) return;
    var entrada = document.getElementById('tam' + n);
    if (!entrada || !entrada.matches('[data-yb-variante] input')) return;
    entrada.checked = true;
    trocarVariante(entrada);
  })();

  /* ---------------------------------------------------------------------
     COMPRAR — a acao tem duracao, e duracao precisa de forma

       <button data-yb-comprar
               data-toast-titulo="Added to cart" data-toast-texto="Deep care kit">
       <div data-yb-compra>            a zona, para achar a quantidade
       <button ... data-yb-falhar>     so na doc: prova o caminho do erro

     Era um `onclick` inline que abria o toast de sucesso no mesmo quadro do
     clique. Isso descreve uma loja onde adicionar ao carrinho e instantaneo e
     nunca falha — nenhuma das duas coisas e verdade, e a interface que promete
     as duas nao tem onde por a resposta no dia em que uma delas quebrar.

     Aqui o botao passa por `.yb-btn--loading`, que a folha ja desenhava e
     ninguem acionava. Ele NAO recebe `disabled` nem `aria-disabled`: os dois
     pintam o fundo de cinza, e cinza com spinner branco por cima e um spinner
     invisivel. O clique repetido morre no `pointer-events:none` da propria
     classe, e o teclado morre na guarda de `aria-busy` logo abaixo.

     A ESPERA e simulada, e isso e o ponto de um prototipo: a tela precisa
     provar que existe um estado entre o clique e a resposta. O que ela nao faz
     e simular FALHA sozinha — protótipo que falha por sorteio ensina errado.
     O caminho do erro se prova onde estado se prova, na doc, por um botao que
     declara `data-yb-falhar`.
     --------------------------------------------------------------------- */
  var ESPERA_COMPRA = 700;   // ms

  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    var b = e.target.closest('[data-yb-comprar]');
    if (!b || b.disabled || b.getAttribute('aria-busy') === 'true') return;

    var zona = b.closest('[data-yb-compra]');
    var campo = zona && zona.querySelector('[data-yb-stepper] input');
    var qtd = campo ? Math.max(1, +campo.value || 1) : 1;
    var nome = b.getAttribute('data-toast-texto') || '';
    var falha = b.hasAttribute('data-yb-falhar');

    b.classList.add('yb-btn--loading');
    b.setAttribute('aria-busy', 'true');

    window.setTimeout(function () {
      b.classList.remove('yb-btn--loading');
      b.removeAttribute('aria-busy');
      if (!window.Ybera || !Ybera.toast) return;
      if (falha) {
        Ybera.toast({
          title: b.getAttribute('data-toast-erro') || '',
          text: b.getAttribute('data-toast-erro-texto') || '',
          variant: 'danger'
        });
        return;
      }
      Ybera.toast({
        title: b.getAttribute('data-toast-titulo') || '',
        // A quantidade estava sumindo: somar tres e receber "Added to cart"
        // sem numero deixa a pessoa sem saber se somou tres ou um.
        text: (qtd > 1 ? qtd + ' × ' : '') + nome,
        variant: 'success'
      });
    }, ESPERA_COMPRA);
  });

  /* ---------------------------------------------------------------------
     COMPARTILHAR — a folha nativa quando existe, copiar quando nao

       <button data-yb-share data-copiado="Link copied" data-erro="…">

     No celular `navigator.share` abre a folha do sistema, que e onde a pessoa
     ja sabe mandar para o WhatsApp. No desktop ela quase nunca existe: ali o
     plano B copia o endereco e o toast confirma — sem confirmacao, copiar e
     indistinguivel de nao ter acontecido nada.

     Cancelar a folha nativa dispara AbortError; nao e erro, e desistencia, e
     nao vira toast.
     --------------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    var b = e.target.closest('[data-yb-share]');
    if (!b) return;
    var aviso = function (chave, variante) {
      if (window.Ybera && Ybera.toast) Ybera.toast({ title: b.getAttribute(chave) || '', variant: variante });
    };
    if (navigator.share) {
      navigator.share({ title: document.title, url: location.href }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href)
        .then(function () { aviso('data-copiado', 'success'); })
        .catch(function () { aviso('data-erro', 'danger'); });
      return;
    }
    aviso('data-erro', 'danger');
  });

  /* ---------------------------------------------------------------------
     FILTRO DE AVALIACOES

       <div data-yb-review-filtro>   grupo de radio com value="all|5|4|3|2|1"
       <article class="yb-review" data-nota="5">
       <div data-yb-review-vazio hidden>  + [data-yb-review-vazio-titulo]
       <button data-yb-review-limpar>

     Esconde o que nao bate e mostra o estado vazio quando nada sobra. O estado
     vazio nao e enfeite defensivo: com as avaliacoes que a loja tem hoje,
     quatro dos cinco filtros levam exatamente a ele.

     O titulo do vazio ecoa a nota escolhida em vez de dizer "nada encontrado":
     "No 3-star reviews yet" diz o que aconteceu; "nada encontrado" faz a
     pessoa desconfiar do filtro.
     --------------------------------------------------------------------- */
  function filtrarAvaliacoes(valor) {
    var trilho = document.getElementById('reviews-track');
    var vazio = document.querySelector('[data-yb-review-vazio]');
    if (!trilho) return;
    var visiveis = 0;
    [].forEach.call(trilho.querySelectorAll('[data-nota]'), function (c) {
      var bate = valor === 'all' || c.getAttribute('data-nota') === valor;
      c.hidden = !bate;
      if (bate) visiveis++;
    });
    if (!vazio) return;
    vazio.hidden = visiveis > 0;
    // So escreve o titulo quando ele VAI aparecer: escrever sempre deixava
    // "No 5-star reviews yet" guardado atras de um bloco escondido, pronto
    // para piscar errado no proximo filtro que zerasse.
    if (visiveis > 0) return;
    var t = vazio.querySelector('[data-yb-review-vazio-titulo]');
    if (t && valor !== 'all') t.textContent = 'No ' + valor + '-star reviews yet';
  }

  document.addEventListener('change', function (e) {
    var alvo = e.target;
    if (!alvo.matches || !alvo.matches('[data-yb-review-filtro] input')) return;
    filtrarAvaliacoes(alvo.value);
  });

  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest('[data-yb-review-limpar]')) return;
    var todos = document.querySelector('[data-yb-review-filtro] input[value="all"]');
    if (todos) { todos.checked = true; }
    filtrarAvaliacoes('all');
  });

  /* ---------------------------------------------------------------------
     GALERIA
     Os radios já trocam a imagem via CSS quando há :checked. Aqui só
     sincronizamos o slide e o contador, e as setas do teclado vem de graca do grupo de radio nativo — nao ha keydown aqui.
     --------------------------------------------------------------------- */
  function sincronizarGaleria(g) {
    var marcado = g.querySelector('.yb-gallery__thumbs input:checked');
    if (!marcado) return;
    var i = [].indexOf.call(g.querySelectorAll('.yb-gallery__thumbs input'), marcado);
    g.querySelectorAll('.yb-gallery__slide').forEach(function (s, n) {
      s.setAttribute('data-active', String(n === i));
    });
    var c = g.querySelector('.yb-gallery__count');
    if (c) c.textContent = (i + 1) + ' / ' + g.querySelectorAll('.yb-gallery__slide').length;
  }

  document.addEventListener('change', function (e) {
    var g = e.target.closest('[data-yb-gallery]');
    if (g) sincronizarGaleria(g);
    var s = e.target.closest('[data-yb-stepper]');
    if (s) sincronizarStepper(s);
  });

  /* ---------------------------------------------------------------------
     SEARCH OVERLAY

     A folha inteira já funciona sem isto: é um <dialog> com um <form
     role="search"> dentro, então Esc fecha, Tab não escapa e Enter envia a
     busca para o servidor. O que este trecho acrescenta é a troca de painel
     enquanto se digita — e nada mais, de propósito. Filtrar de verdade é
     trabalho do servidor; aqui só decidimos QUAL dos três painéis mostrar.

       [data-yb-search]           o <form>
       [data-yb-search-zero]      antes de digitar: recentes, populares, mais vendidos
       [data-yb-search-results]   com termo e com resultado
       [data-yb-search-empty]     com termo e sem resultado
       [data-yb-search-echo]      onde o termo aparece escrito no estado vazio
       [data-termo]               em cada resultado, o texto contra o qual casar
     --------------------------------------------------------------------- */
  function pinta(form) {
    var termo = (form.querySelector('.yb-search__input').value || '').trim().toLowerCase();
    var raiz = form.closest('.yb-search') || document;
    var zero = raiz.querySelector('[data-yb-search-zero]');
    var achados = raiz.querySelector('[data-yb-search-results]');
    var vazio = raiz.querySelector('[data-yb-search-empty]');
    var limpar = form.querySelector('.yb-search__clear');

    if (limpar) limpar.hidden = !termo;

    var visiveis = 0;
    if (achados) {
      achados.querySelectorAll('[data-termo]').forEach(function (it) {
        var casa = !!termo && it.getAttribute('data-termo').toLowerCase().indexOf(termo) > -1;
        it.hidden = !casa;
        if (casa) visiveis++;
      });
      // um título de grupo sem nenhum resultado embaixo anuncia uma seção
      // que não existe — some junto com os seus.
      achados.querySelectorAll('[data-yb-search-group]').forEach(function (g) {
        g.hidden = !g.querySelector('[data-termo]:not([hidden])');
      });
    }

    if (zero) zero.hidden = !!termo;
    if (achados) achados.hidden = !termo || !visiveis;
    if (vazio) vazio.hidden = !termo || !!visiveis;

    if (vazio && termo) {
      vazio.querySelectorAll('[data-yb-search-echo]').forEach(function (e) {
        e.textContent = termo;
      });
    }
  }

  document.addEventListener('input', function (e) {
    if (!(e.target instanceof Element)) return;
    var f = e.target.closest('[data-yb-search]');
    if (f) pinta(f);
  });

  // `reset` dispara ANTES do campo esvaziar — sem o adiamento, pinta() ainda
  // lê o texto antigo e o painel de resultados fica na tela com o campo vazio.
  document.addEventListener('reset', function (e) {
    if (!(e.target instanceof Element)) return;
    var f = e.target.closest('[data-yb-search]');
    if (!f) return;
    setTimeout(function () {
      pinta(f);
      var campo = f.querySelector('.yb-search__input');
      if (campo) campo.focus();
    }, 0);
  });

  /* ---------------------------------------------------------------------
     INICIALIZAÇÃO
     --------------------------------------------------------------------- */
  function init(raiz) {
    (raiz || document).querySelectorAll('[data-yb-gallery]').forEach(sincronizarGaleria);
    (raiz || document).querySelectorAll('[data-yb-stepper]').forEach(sincronizarStepper);
    (raiz || document).querySelectorAll('[data-yb-search]').forEach(pinta);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }

  window.Ybera = { toast: toast, openDialog: abrir, init: init };
})();

/* =========================================================================
   VÍDEO VERTICAL
   Troca o pôster pelo vídeo no primeiro clique. Antes disso não há <video>
   no DOM: 45 vídeos carregando de uma vez é o que faz uma home pesar.
   ========================================================================= */
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    var bt = e.target.closest('.yb-video__play');
    if (!bt) return;
    var alvo = bt.closest('.yb-video');
    if (!alvo || alvo.dataset.playing === 'true') return;
    var src = alvo.getAttribute('data-video');
    if (!src) return;

    // um de cada vez: tocar cinco cartoes tocava cinco videos juntos
    document.querySelectorAll('.yb-video[data-playing="true"] video').forEach(function (o) {
      o.pause();
      var cartao = o.closest('.yb-video');
      if (cartao) cartao.dataset.playing = 'false';
    });

    var v = document.createElement('video');
    v.src = src;
    var img = alvo.querySelector('img');
    v.poster = img ? img.src : '';
    v.controls = true;
    v.playsInline = true;          // no iOS, sem isso o vídeo abre em tela cheia
    v.preload = 'metadata';
    // 404 deixava uma caixa preta permanente, sem nada dizendo o que houve
    v.addEventListener('error', function () {
      alvo.dataset.playing = 'false';
      v.remove();
      if (img) alvo.insertBefore(img, alvo.firstChild);
      bt.hidden = false;
      if (!alvo.querySelector('.yb-video__erro')) {
        var aviso = document.createElement('p');
        aviso.className = 'yb-video__erro';
        aviso.setAttribute('role', 'status');
        aviso.textContent = 'Video unavailable';
        alvo.appendChild(aviso);
      }
    });

    alvo.dataset.playing = 'true';
    if (img) img.remove();
    bt.hidden = true;              // some do DOM acessivel, nao so da tela
    alvo.appendChild(v);
    v.focus();
    v.play().catch(function () { /* o navegador pode exigir novo gesto */ });
  });
})();

/* =========================================================================
   NAVEGAÇÃO PRINCIPAL — melhoria, não requisito
   O menu inteiro funciona sem isto: checkbox + label abrem no clique, e o
   CSS abre no hover e no foco. O que falta sem JS é fechar — um painel
   aberto por clique ficava aberto para sempre. Aqui entram Escape, clique
   fora, e o aria-expanded que o checkbox sozinho não expressa.
   ========================================================================= */
(function () {
  'use strict';

  var GATILHOS = '.yb-nav__toggle, .yb-header__drawer';

  function toggles(raiz) {
    return (raiz || document).querySelectorAll(GATILHOS);
  }

  function esc(id) {
    return (window.CSS && CSS.escape) ? CSS.escape(id) : id;
  }

  function rotulos(t) {
    // querySelectorAll, nao querySelector: tres <label> apontam para
    // `nav-open` — o hamburguer, o X da gaveta e o scrim. So o primeiro
    // recebia estado; os outros dois mentiam para sempre.
    return document.querySelectorAll('label[for="' + esc(t.id) + '"]');
  }

  /* O estado vai no CHECKBOX, nao no <label>.
     Os labels visuais sao `aria-hidden` de proposito — se estivessem na
     arvore, o leitor de tela anunciaria tres controles para o mesmo menu.
     Escondidos, porem, o `aria-expanded` que morava neles nunca era lido.
     `aria-expanded` e valido em role=checkbox, e o checkbox e o unico
     controle que o teclado alcanca. */
  function sincronizar(t) {
    t.setAttribute('aria-expanded', t.checked ? 'true' : 'false');
  }

  function fechar(lista) {
    var mudou = false;
    Array.prototype.forEach.call(lista, function (t) {
      if (t.checked) { t.checked = false; sincronizar(t); mudou = true; }
    });
    if (mudou) prender(false);
    return mudou;
  }

  /* Contencao de foco da gaveta.
     Sem isto o Tab saia da gaveta aberta e caminhava pela pagina atras do
     scrim — que e so pintura, nao barreira. `inert` e a barreira de verdade;
     onde ele nao existe, nada piora. */
  var inertados = [];
  function prender(ligar) {
    var gaveta = document.querySelector('.yb-header__nav');
    if (!gaveta) return;
    if (ligar) {
      var irmaos = document.body.children;
      Array.prototype.forEach.call(irmaos, function (n) {
        if (n.contains(gaveta) || n.tagName === 'SCRIPT') return;
        if (!n.hasAttribute('inert')) { n.setAttribute('inert', ''); inertados.push(n); }
      });
      // dentro do header, tudo menos a propria gaveta
      var barra = document.querySelector('.yb-header__bar');
      if (barra) Array.prototype.forEach.call(barra.children, function (n) {
        if (n.contains(gaveta) || n === gaveta) return;
        if (!n.hasAttribute('inert')) { n.setAttribute('inert', ''); inertados.push(n); }
      });
    } else {
      inertados.forEach(function (n) { n.removeAttribute('inert'); });
      inertados = [];
    }
  }

  function gavetaAberta() {
    var d = document.querySelector('.yb-header__drawer');
    return !!(d && d.checked);
  }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t.matches || !t.matches(GATILHOS)) return;
    sincronizar(t);

    if (t.classList.contains('yb-header__drawer')) {
      prender(t.checked);
      if (t.checked) {
        var x = document.querySelector('.yb-nav__close');
        if (x) x.focus();
      }
    }

    // um painel de cada vez: abrir Shop fecha About Us
    if (t.checked && t.classList.contains('yb-nav__toggle')) {
      Array.prototype.forEach.call(document.querySelectorAll('.yb-nav__toggle'), function (o) {
        if (o !== t && o.checked) { o.checked = false; sincronizar(o); }
      });
    }
  });

  /* O X da gaveta e um <label>, que nao recebe foco nem responde a tecla.
     tabindex o coloca na ordem; Enter e Espaco fazem o que o clique faz. */
  document.addEventListener('keydown', function (e) {
    if (!(e.target instanceof Element)) return;
    var x = e.target.closest('.yb-nav__close');
    if (!x || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    x.click();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    // fecha de dentro para fora: um submenu aberto dentro da gaveta nao
    // deve levar a gaveta junto no primeiro Escape.
    var painel = document.querySelector('.yb-nav__toggle:checked');
    var alvo = painel || document.querySelector('.yb-header__drawer:checked');
    if (!alvo) return;
    alvo.checked = false;
    sincronizar(alvo);
    if (alvo.classList.contains('yb-header__drawer')) prender(false);
    alvo.focus();
  });

  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('.yb-header')) return;   // dentro do header, o CSS decide
    fechar(toggles());
  });

  // o foco saiu do menu inteiro: fecha o painel aberto (nao a gaveta)
  document.addEventListener('focusin', function (e) {
    if (!(e.target instanceof Element)) return;
    if (gavetaAberta() || e.target.closest('.yb-nav')) return;
    Array.prototype.forEach.call(document.querySelectorAll('.yb-nav__toggle:checked'), function (t) {
      t.checked = false; sincronizar(t);
    });
  });

  function iniciar() { Array.prototype.forEach.call(toggles(), sincronizar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();

/* =========================================================================
   RELÓGIO DA OFERTA — [data-yb-countdown]

   O prazo vem no atributo, em ISO 8601:
     <p class="yb-offercard__timer" data-yb-countdown="2026-09-10T23:59:00Z">
       <time datetime="2026-09-10T23:59:00Z">until Sep 10, 11:59 PM</time>
     </p>

   Sem JS o <time> por extenso continua na tela: uma oferta com prazo tem de
   dizer o prazo de qualquer jeito. O script troca o texto pelos quadradinhos
   e passa a contar.

   Vencido, o relógio SOME e o cartão diz que acabou — 00:00:00 parado não é
   contagem, é relógio quebrado prometendo urgência que já passou.
   ========================================================================= */
(function () {
  'use strict';

  function doisDigitos(n) { return (n < 10 ? '0' : '') + n; }

  /* Nada de montar marcacao por string: os quadradinhos sao criados como nos
     e cada segundo so troca o textContent do numero. E a regra da casa (o
     validador recusa marcacao por string em JS que toca conteudo de produto)
     e sai mais barato — nao reconstroi tres elementos por segundo. */
  function quadro(rotulo) {
    var chip = document.createElement('span');
    chip.className = 'yb-offercard__chip';
    var num = document.createElement('b');
    var uni = document.createElement('small');
    uni.textContent = rotulo;
    chip.appendChild(num);
    chip.appendChild(uni);
    return { chip: chip, num: num };
  }

  function separador() {
    var s = document.createElement('span');
    s.className = 'yb-offercard__sep';
    s.textContent = ':';
    return s;
  }

  /* Com mais de um dia pela frente o relogio troca de unidade: "672 hrs" nao
     e prazo, e numero. Vira dias/horas/minutos, e volta para horas/min/seg
     nas ultimas 24h, quando o segundo passa a significar alguma coisa. */
  function montar(el, longo) {
    var a = quadro(longo ? 'dias' : 'hrs');
    var b = quadro(longo ? 'hrs' : 'min');
    var c = quadro(longo ? 'min' : 's');
    el.textContent = '';
    el.appendChild(a.chip); el.appendChild(separador());
    el.appendChild(b.chip); el.appendChild(separador());
    el.appendChild(c.chip);
    return [a.num, b.num, c.num];
  }

  function encerrar(el) {
    var cartao = el.closest('.yb-offercard');
    if (!cartao) return;
    cartao.setAttribute('data-encerrada', '');
    var fim = cartao.querySelector('.yb-offercard__fim');
    if (fim) fim.hidden = false;
  }

  function ligar(el) {
    var prazo = Date.parse(el.getAttribute('data-yb-countdown'));
    // data ilegivel: fica o <time> por extenso, que e melhor que um relogio
    // contando para tras a partir de NaN
    if (isNaN(prazo)) return;
    if (prazo - Date.now() <= 0) { encerrar(el); return; }

    var longo = prazo - Date.now() > 864e5;      // mais de 24h
    var campos = montar(el, longo);
    function tique() {
      var resta = prazo - Date.now();
      if (resta <= 0) { clearInterval(id); encerrar(el); return; }
      // cruzou as ultimas 24h enquanto a pagina estava aberta: remonta
      if (longo && resta <= 864e5) { longo = false; campos = montar(el, longo); }
      var t = Math.floor(resta / 1000);
      if (longo) {
        campos[0].textContent = doisDigitos(Math.floor(t / 86400));
        campos[1].textContent = doisDigitos(Math.floor((t % 86400) / 3600));
        campos[2].textContent = doisDigitos(Math.floor((t % 3600) / 60));
      } else {
        campos[0].textContent = doisDigitos(Math.floor(t / 3600));
        campos[1].textContent = doisDigitos(Math.floor((t % 3600) / 60));
        campos[2].textContent = doisDigitos(t % 60);
      }
      if (!el.isConnected) clearInterval(id);
    }
    tique();
    var id = setInterval(tique, 1000);
  }

  function iniciar() {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-yb-countdown]'), ligar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
