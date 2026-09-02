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
     INICIALIZAÇÃO
     --------------------------------------------------------------------- */
  function init(raiz) {
    (raiz || document).querySelectorAll('[data-yb-gallery]').forEach(sincronizarGaleria);
    (raiz || document).querySelectorAll('[data-yb-stepper]').forEach(sincronizarStepper);
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
