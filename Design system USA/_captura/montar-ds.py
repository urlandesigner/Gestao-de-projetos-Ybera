#!/usr/bin/env python3
"""
MONTA HOME E PDP COM OS COMPONENTES DO DESIGN SYSTEM.

    python3 _captura/montar-ds.py

Não é overlay: aqui as páginas são construídas do zero usando as classes
`yb-*` exatamente como estão em components/ e patterns/, sem uma linha de CSS
novo. Conteúdo, preços e imagens vêm da loja de verdade.

Se um componente não couber no conteúdo real, isso aparece — e é essa a
utilidade de montar em vez de vestir.
"""
import glob, json, os, shutil, sys, re, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dados

# Moeda e decisao de dado, nao de token: CSS nao interpola string em texto.
# Quem monta a pagina resolve, como faria o Liquid no tema.
MOEDA = '$'

RAIZ = os.path.dirname(os.path.abspath(__file__))
PROJETO = os.path.dirname(RAIZ)
GOOGLE = ("https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:"
          "wght@400;500;600;700;800&display=swap")


def preparar(destino):
    """Copia o CSS do sistema, o sprite e a fonte. Nada é reescrito."""
    for p in ('yb', 'img'):
        os.makedirs(os.path.join(destino, p), exist_ok=True)
    for src, nome in [
        ('tokens/00-primitives.css', '00-primitives.css'),
        ('tokens/01-semantic.css', '01-semantic.css'),
        ('components/ybera-components.css', 'components.css'),
        ('patterns/ybera-patterns.css', 'patterns.css'),
        ('icons/ybera-icons.css', 'icons.css'),
        ('icons/ybera-icons.svg', 'icons.svg'),
        ('components/ybera-components.js', 'components.js'),
    ]:
        shutil.copy(os.path.join(PROJETO, src), os.path.join(destino, 'yb', nome))

    os.makedirs(os.path.join(destino, 'brand'), exist_ok=True)
    for f in ('ybera-logo.webp', 'ybera-logo.png'):
        shutil.copy(os.path.join(PROJETO, 'brand', f), os.path.join(destino, 'brand', f))

    css = dados.pegar(GOOGLE).decode('utf-8')
    pasta = os.path.join(destino, 'yb', 'fontes'); os.makedirs(pasta, exist_ok=True)
    n = 0
    def troca(m):
        nonlocal n
        nome = f"sg-{n}.woff2"; n += 1
        try: open(os.path.join(pasta, nome), 'wb').write(dados.pegar(m.group(1)))
        except Exception: return m.group(0)
        return f"url(fontes/{nome})"
    css = re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', troca, css)
    open(os.path.join(destino, 'yb', 'fonte.css'), 'w', encoding='utf-8').write(css)


def versao():
    """Hash do CSS do sistema. Muda quando o conteudo muda — e so entao."""
    import hashlib
    h = hashlib.sha1()
    for f in ('tokens/00-primitives.css', 'tokens/01-semantic.css',
              'components/ybera-components.css', 'patterns/ybera-patterns.css',
              'icons/ybera-icons.css', 'components/ybera-components.js'):
        h.update(open(os.path.join(PROJETO, f), 'rb').read())
    return h.hexdigest()[:8]


CSS_HOME = """  /* Banner: imagem com carrossel, igual producao. Nao e componente do sistema. */
  .banner { position:relative; }
  .banner__track { display:flex; list-style:none; margin:0; padding:0;
    overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none;
    scroll-behavior:smooth; }
  .banner__track::-webkit-scrollbar { display:none; }
  .banner__slide { flex:0 0 100%; scroll-snap-align:start; }
  /* Era `height:75vh` — altura presa a VIEWPORT, sem relacao nenhuma com a
     imagem de verdade. As quatro criacoes de desktop medem 1200x375 ou
     1600x501 (16:5 nos dois casos); numa tela de 1440x900, 75vh vira 675px
     de altura contra uma imagem de 375-501px de proporcao MUITO mais baixa —
     o `cover` compensava ampliando e cortando os dois lados, entao metade da
     arte (o "PISCOU, PERDEU", o preco) saia da tela em qualquer desktop
     normal. `aspect-ratio` usa a proporcao real da peca: nada de cortar o
     que o design pediu para caber. */
  .banner__slide a { display:block; aspect-ratio:16/5; }
  .banner__slide img { width:100%; height:100%; object-fit:cover; display:block; }
  @media (max-width:767px) {
    /* Mobile e outra peca, nao a mesma cortada: as quatro versoes verticais
       medem entre 400x600 e 750x1095 — 2:3, retrato. */
    .banner__slide a { aspect-ratio:2/3; }
  }
  .banner__arrow { position:absolute; top:50%; transform:translateY(-50%);
    width:var(--yb-target-min); height:var(--yb-target-min);
    display:flex; align-items:center; justify-content:center;
    border:none; cursor:pointer; border-radius:var(--yb-radius-full);
    background:var(--yb-surface); color:var(--yb-text-primary);
    box-shadow:var(--yb-elevation-raised); }
  .banner__arrow--prev { inset-inline-start:var(--yb-space-4); }
  .banner__arrow--next { inset-inline-end:var(--yb-space-4); }
  .banner__arrow:focus-visible { outline:var(--yb-focus-width) solid var(--yb-focus-color);
    outline-offset:var(--yb-focus-offset); }
  /* O video shoppable sangra ate a borda da tela — em producao ele nao
     respeita o container de 1200px. Por isso a section vive FORA de .page,
     em vez de compensar largura com margem negativa. */
  .tolstoy { overflow:hidden; }
  /* O widget renderiza as proprias setas com o tema dele — botao plano, foco
     azul generico, cor de texto crua. E DOM normal, nao shadow DOM: a folha
     da pagina alcanca. Reveste o controle deles com a mesma receita do
     .yb-iconbtn do trilho de reviews (44px, borda, fundo neutro no hover,
     foco do sistema) sem tocar no script do Tolstoy. */
  .tolstoy nav[aria-label="Carousel navigation"] {
    gap:var(--yb-space-2);
  }
  .tolstoy nav[aria-label="Carousel navigation"] button {
    width:var(--yb-target-min); height:var(--yb-target-min);
    border-radius:var(--yb-radius-control);
    border:var(--yb-border-width-hair) solid var(--yb-border);
    color:var(--yb-text-primary); opacity:1;
    transition:background var(--yb-transition-control);
  }
  .tolstoy nav[aria-label="Carousel navigation"] button:hover {
    background:var(--yb-bg-muted); opacity:1;
  }
  .tolstoy nav[aria-label="Carousel navigation"] button:focus {
    box-shadow:none;
  }
  .tolstoy nav[aria-label="Carousel navigation"] button:focus-visible {
    outline:var(--yb-focus-width) solid var(--yb-focus-color);
    outline-offset:var(--yb-focus-offset);
  }
  .tolstoy nav[aria-label="Carousel navigation"] svg {
    width:var(--yb-icon-size, 20px); height:var(--yb-icon-size, 20px);
    stroke-width:1.5;
  }
  /* Mesma regra do .yb-track__nav: abaixo de 768 a seta some, no toque
     arrasta. O widget nao sabe dessa convencao por ser de fora — sem isto,
     esta era a unica secao da pagina com seta visivel no mobile, inconsistencia
     que ninguem decidiu. */
  @media (max-width:768px) {
    .tolstoy nav[aria-label="Carousel navigation"] { display:none; }
  }"""

CSS_PDP = """  /* Sem padding-top: quem separa do breadcrumb e o breadcrumb. Com os dois,
     o produto descia 40px sem ninguem ter pedido, e mexer no breadcrumb nao
     mudava nada — os 32px daqui e que mandavam. */
  .pdp { display:grid; grid-template-columns:1fr 1fr; gap:var(--yb-space-12);
    align-items:start; padding-block:0 var(--yb-space-8); }

  /* A imagem acompanha a leitura da coluna da direita e para quando o bloco
     acaba — `sticky` ja e limitado pelo pai, entao nao precisa de JS nem de
     conta de altura: quando o grid termina, a coluna volta a rolar sozinha.

     `align-items:start` no grid e o que torna isto possivel: esticada ate a
     altura da linha, a coluna nao teria para onde deslizar.

     O deslocamento sai do token da barra fixa, senao a imagem gruda por baixo
     dela. */
  /* Duas fotos altas lado a lado, e a grade de prova em duas colunas. Sao
     arranjos DESTA pagina, nao componentes: por isso ficam aqui. */
  /* A historia do produto mora dentro da coluna de compra, e a coluna agora
     tem ritmo: o `gap` dela e a distancia mais curta (ver .yb-buybox). Estes
     blocos sao outro assunto — nao decisao de compra — e por isso levam o
     maior vao da coluna. Fica aqui, e nao no padrao, porque `.pdp__*` e classe
     desta pagina: o sistema nao deve saber que ela existe. */
  .yb-buybox > .pdp__duo,
  .yb-buybox > .yb-mediabanner,
  .yb-buybox > .pdp__prova { margin-block-start: var(--yb-space-8); }

  .pdp__duo { display:grid; grid-template-columns:1fr 1fr; gap:var(--yb-space-3); }
  .pdp__duo .yb-mediabanner { min-height:clamp(18rem, 26vw, 24rem); }
  .pdp__prova { display:grid; grid-template-columns:1fr 1fr; gap:var(--yb-space-3);
    list-style:none; margin:0; padding:0; }
  @media (max-width:520px) { .pdp__duo { grid-template-columns:1fr; } }

  .pdp > .yb-gallery {
    position:sticky;
    inset-block-start:calc(var(--yb-header-h) + var(--yb-space-5));
    align-self:start;
  }
  /* Numa coluna so nao ha o que acompanhar, e grudar atrapalharia a rolagem. */
  @media (max-width:860px) {
    .pdp { grid-template-columns:1fr; gap:var(--yb-space-8); }
    .pdp > .yb-gallery { position:static; }
  }"""

CABECA = """<!doctype html>
<html lang="en" data-market="us">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<link rel="stylesheet" href="yb/fonte.css?v={v}">
<link rel="stylesheet" href="yb/00-primitives.css?v={v}">
<link rel="stylesheet" href="yb/01-semantic.css?v={v}">
<link rel="stylesheet" href="yb/components.css?v={v}">
<link rel="stylesheet" href="yb/patterns.css?v={v}">
<link rel="stylesheet" href="yb/icons.css?v={v}">
<style>
  /* Só layout de página: largura, respiro entre blocos e o grid do hero.
     Nenhum componente é redefinido aqui — se um botão precisasse de ajuste,
     o lugar seria components/, não esta folha. */
  body {{ margin:0; background:var(--yb-bg-page); color:var(--yb-text-primary);
         font-family:var(--yb-font-family-base); -webkit-font-smoothing:antialiased; }}
{css_pagina}
</style>
</head>
<body>
"""

RODAPE = """
<script src="yb/components.js?v={v}"></script>
<script>
// Setas do banner. Carrossel nao e componente do sistema — este JS vive na
// pagina, nao em components.js, para nao dar a entender que existe.
(function(){
  var t = document.getElementById('banner-track');
  if (!t) return;
  function ir(d){ t.scrollBy({left: d * t.clientWidth, behavior: 'smooth'}); }
  var a = document.querySelector('.banner__arrow--prev');
  var p = document.querySelector('.banner__arrow--next');
  if (a) a.addEventListener('click', function(){ ir(-1); });
  if (p) p.addEventListener('click', function(){ ir(1); });
})();
</script>
</body>
</html>
"""


def ico(nome, classe='yb-icon'):
    return f'<svg class="{classe}" aria-hidden="true"><use href="yb/icons.svg#yb-{nome}"/></svg>'


# Menu principal, igual ao de producao — mesmos rotulos, mesmos destinos,
# mesma hierarquia. Extraido do DOM da loja, nao redigitado.
MENU = [
    {"rotulo": "Home", "href": "/"},
    {"rotulo": "Shop", "grupos": [
        {"titulo": "All Products", "href": "/collections", "itens": [
            ("Best Sellers", "/collections/best-sellers"),
            ("Kit",          "/collections/collections"),
        ]},
        {"titulo": "Collection", "href": "/collections", "itens": [
            ("Ybera Paris",         "/collections/ybera-paris"),
            ("Fashion Gold",        "/collections/fashion-gold"),
            ("Cronograma",          "/collections/cronograma-hair-care-system"),
            ("100Timetros",         "/collections/100timetros"),
            ("Capulana",            "/collections/capulana"),
            ("Terra Coco",          "/collections/terra-coco"),
            ("Hair Mist",           "/collections/hair-mist"),
            ("Vello",               "/collections/vello-1"),
            ("Mirra",               "/collections/mirra"),
            ("Detox",               "/collections/detox"),
            ("Life´s Flower",       "/collections/life-s-flower"),
            ("Essência Brasileira", "/collections/essencia-brasileira"),
            ("Universal",           "/collections/universal"),
            ("Genoma",              "/collections/genoma"),
            ("Quarta Camada",       "/collections/quarta-camada"),
        ]},
        {"titulo": "Hair Problem", "href": "/collections/hair-loss-thinning-hair", "itens": [
            ("Damaged Hair",        "/collections/dullness"),
            ("Frizz &amp; Dryness", "/collections/dryness-frizz"),
            ("Thinning / Hair Loss","/collections/hair-loss-thinning-hair"),
            ("Undefined Curls",     "/collections/frizz-lack-of-volume"),
        ]},
    ]},
    # `destaque` pinta o link com a cor de venda do sistema — a mesma do
    # .yb-badge--sale. A loja usa "🔥Sales": o emoji e mais pesado que os
    # links vizinhos, muda de desenho por sistema operacional, cola no
    # texto sem espaco e o leitor de tela anuncia "fire Sales". Cor
    # semantica faz o mesmo trabalho e diz de onde veio. So existe UMA porta
    # pra "Sales" no header — a de topo; repeti-la como coluna vazia dentro
    # do mega-menu do Shop so ocupava grade sem ensinar nada a mais.
    {"rotulo": "Sales", "href": "/collections/sales", "destaque": True},
    {"rotulo": "AI Hair Analysis", "href": "/pages/ai-hair-routine-quiz"},
    {"rotulo": "About Us", "grupos": [
        {"titulo": "Our Story",        "href": "/pages/our-story",  "itens": []},
        # O rotulo era "Behind The Shine" — nome da serie, nao da secao. Quem
        # nao le o blog antes nao reconhece aquilo como "aqui esta o blog".
        # "Our Story" ao lado e generico de proposito; este agora tambem e.
        {"titulo": "Blog", "href": "/blogs/haircare",   "itens": []},
    ]},
]


# A vitrine dentro do mega-menu do "Shop": um produto real em destaque mais o
# convite para o quiz. Existia so na home, colada a mao direto no HTML gerado
# — sobrevivia por acidente, e a PDP nunca a ganhou porque nada aqui a gerava
# de verdade. Agora e o `menu()` que a desenha, com o produto que cada pagina
# ja tem em maos, e as duas passam a mostrar a mesma coisa por construcao,
# nao por copia.
def nav_rail(produto):
    return f"""<div class="yb-nav__rail">
            <a class="yb-nav__promo" href="pdp.html">
              <div class="yb-nav__promo-media">
                <div class="yb-card__flags"><span class="yb-badge yb-badge--soft">Best seller</span></div>
                <img src="img/{produto['img']}" alt="{produto['titulo'][:80]}" loading="lazy">
              </div>
              <div class="yb-nav__promo-info">
                <p class="yb-nav__promo-name">{produto['titulo']}</p>
                <span class="yb-price yb-price--sm"><b class="yb-price__now">{produto['preco']}</b></span>
                <!-- "View product", nao "Shop now": o cartao e de UM produto e leva a
                     PDP. "Shop now" e rotulo de colecao — promete uma vitrine e
                     entrega uma ficha. -->
                <span class="yb-btn yb-btn--secondary yb-btn--sm">View product</span>
              </div>
            </a>
            <a class="yb-nav__pitch" href="/pages/ai-hair-routine-quiz">
              <span class="yb-nav__pitch-eyebrow">AI Hair Analysis</span>
              <p class="yb-nav__pitch-title">Not sure where to start?</p>
              <p class="yb-nav__pitch-text">Six questions, and we match your hair to the right line —
              no guessing between fifteen collections.</p>
              <ul class="yb-nav__pitch-steps">
                <li>{ico('check', 'yb-icon yb-icon--sm')}Your hair type</li>
                <li>{ico('check', 'yb-icon yb-icon--sm')}Your main concern</li>
                <li>{ico('check', 'yb-icon yb-icon--sm')}The kit that fits</li>
              </ul>
              <!-- `--secondary`, e nao o magenta da loja. Um mega-menu e superficie de
                   PASSAGEM: a pessoa abriu para escolher para onde ir, e ao lado destes
                   dois cartoes ha 24 links de navegacao. O acento que a loja reserva
                   para "Add to cart" e "Checkout", gasto aqui, briga com a propria
                   navegacao que o menu existe para oferecer.
                   E "Start analysis", o mesmo nome do item do menu: eram tres nomes
                   para um destino so — "AI Hair Analysis" no menu, "Start free
                   analysis" aqui e "Start quiz" na home. -->
              <span class="yb-btn yb-btn--secondary yb-btn--sm">Start analysis</span>
            </a>
          </div>"""


def menu(promo=None):
    """A mesma arvore serve a barra do desktop e a gaveta do mobile.

    A loja escreve o menu duas vezes no HTML — `menu-desktop` e `menu-mobile`,
    25 links repetidos. Aqui e um DOM so: o CSS decide se aquilo e barra com
    painel ou gaveta com acordeao.

    `promo` e um produto real (do catalogo que a propria pagina ja buscou) para
    a vitrine do painel "Shop". Sem produto, o painel fica so com os links —
    nunca inventa vitrine com dado falso."""
    out = []
    for n, it in enumerate(MENU):
        if "grupos" not in it:
            sale = " yb-nav__link--sale" if it.get("destaque") else ""
            out.append(f'        <li class="yb-nav__item">'
                       f'<a class="yb-nav__link{sale}" href="{it["href"]}">{it["rotulo"]}</a></li>')
            continue
        grupos = []
        for g in it["grupos"]:
            itens = "".join(f'<li><a href="{h}">{t}</a></li>' for t, h in g["itens"])
            lista = f'<ul class="yb-nav__sublist">{itens}</ul>' if itens else ""
            sale = " yb-nav__grouptitle--sale" if g.get("destaque") else ""
            grupos.append(f'<div class="yb-nav__group">'
                          f'<a class="yb-nav__grouptitle{sale}" href="{g["href"]}">{g["titulo"]}</a>'
                          f'{lista}</div>')
        # `.yb-nav__rail` e FILHO de `.yb-nav__groups`, nao irmao: o CSS trata a
        # vitrine como mais um item do mesmo flex — flex:1 1 18rem so faz
        # sentido dividindo o container com os `.yb-nav__group`. Pra fora
        # dele, sem pai flex, a vitrine cai pro fim do painel e disputa
        # posicao sozinha — foi exatamente o defeito da primeira tentativa.
        rail = nav_rail(promo) if (it["rotulo"] == "Shop" and promo) else ""
        out.append(f"""        <li class="yb-nav__item">
          <input class="yb-nav__toggle" type="checkbox" id="nav{n}">
          <label class="yb-nav__link" for="nav{n}">{it["rotulo"]}
            {ico('chevron-down', 'yb-icon yb-icon--sm')}</label>
          <div class="yb-nav__panel">
            <div class="yb-nav__groups">{''.join(grupos)}{rail}</div>
          </div>
        </li>""")
    return "\n".join(out)


def header(carrinho=2, promo=None):
    return f"""<header class="yb-header">
  <div class="yb-header__announce">Free shipping on orders over <b>$50</b></div>
  <input class="yb-header__drawer" type="checkbox" id="nav-open" aria-label="Menu">
  <div class="yb-header__bar">
    <label class="yb-iconbtn yb-header__icon yb-header__burger" for="nav-open" aria-hidden="true">{ico('menu')}</label>
    <a class="yb-header__logo" href="index.html">
      <span class="yb-logo yb-logo--md"><img src="brand/ybera-logo.webp" alt="Ybera" width="360" height="139"></span>
    </a>
    <nav class="yb-header__nav" aria-label="Main">
      <label class="yb-iconbtn yb-nav__close" for="nav-open" role="button" tabindex="0" aria-label="Close menu">{ico('close')}</label>
      <ul class="yb-nav">
        <li class="yb-nav__item yb-nav__item--account"><a class="yb-nav__link" href="/account">Account</a></li>
{menu(promo)}
      </ul>
    </nav>
    <div class="yb-header__actions">
      <button class="yb-iconbtn yb-header__icon" aria-label="Search" data-yb-open="site-search">{ico('search')}</button>
      <button class="yb-iconbtn yb-header__icon yb-header__account" aria-label="Account">{ico('user')}</button>
      <button class="yb-iconbtn yb-header__icon" aria-label="Cart, {carrinho} items" data-yb-open="cart">
        {ico('cart')}<span class="yb-header__count">{carrinho}</span></button>
    </div>
  </div>
  <label class="yb-header__scrim" for="nav-open" aria-hidden="true"></label>
</header>"""


def card(p, vendor=False, flag=True):
    """O card tem uma parte opcional: os relacionados da PDP mostram a marca,
    a home nao. Mesma anatomia, conteudo diferente conforme o contexto.

    `flag=False` desliga o selo "Best seller" mesmo em produto `destaque`: numa
    secao que ja se chama Best Sellers o selo nao informa nada, e quando so
    dois dos quatro cartoes o tem, os outros dois parecem "nao ser".

    O rating voltou a pedido, com nota numerica ao lado das estrelas — a nota
    e a contagem seguem sem dado real por produto (a raspagem nao traz
    avaliacao), mesma ressalva de antes. O preco riscado, quando existe
    (`compare_at_price` real do produto), empilha ACIMA do preco atual em vez
    de ficar ao lado — `.yb-price--stack` inverte a ordem visual com
    `column-reverse` sem mudar a ordem de leitura no DOM."""
    comp = f'<s class="yb-price__was">{p["compare"]}</s>' if p.get('compare') else ''
    price_cls = 'yb-price yb-price--sm yb-price--stack' if comp else 'yb-price yb-price--sm'
    # O brinde sai do titulo (dados.titulo_limpo) e vira selo: e oferta, nao
    # nome — e era justamente a parte que o corte de duas linhas engolia.
    selos = []
    if p.get('brinde'):
        selos.append(f'<span class="yb-badge yb-badge--accent">{p["brinde"]}</span>')
    if flag and p.get('destaque'):
        selos.append('<span class="yb-badge yb-badge--soft">Best seller</span>')
    flags = f'<div class="yb-card__flags">{"".join(selos)}</div>' if selos else ''
    # segunda foto: o CSS ja troca no hover (`img + img`); so faltava emiti-la
    img2 = f'<img src="img/{p["img2"]}" alt="" loading="lazy">' if p.get('img2') else ''
    # o titulo vai no aria-label porque quatro "Add to cart" iguais nao dizem
    # a quem ouve qual produto cada um adiciona
    acao = (f'<button type="button" class="yb-btn yb-btn--primary yb-btn--sm yb-card__action" '
            f'data-yb-open="cart" aria-label="Add to cart: {p["titulo"][:80]}">Add to cart</button>')
    bl_rating = f"""
        <span class="yb-rating" role="img" aria-label="{AVALIACAO['nota']} of 5, {p.get('reviews', AVALIACAO['total'])} reviews">
          <span class="yb-rating__stars" aria-hidden="true">★★★★★</span>
          <span class="yb-rating__score">{AVALIACAO['nota']}</span>
          <span class="yb-rating__count">({p.get('reviews', AVALIACAO['total']):,})</span></span>"""
    bl_vendor = (f"""
        <span class="yb-card__vendor">{p.get('vendor','Ybera USA')}</span>""" if vendor else '')
    return f"""      <article class="yb-card">
        <div class="yb-card__media">{flags}<img src="img/{p['img']}" alt="{p['titulo'][:80]}" loading="lazy">{img2}{acao}</div>
        <h3 class="yb-card__title"><a href="pdp.html">{p['titulo']}</a></h3>{bl_vendor}{bl_rating}
        <span class="{price_cls}"><b class="yb-price__now">{p['preco']}</b>{comp}</span>
      </article>"""


# A loja US nao publica desconto em dado: `compare_at_price` e nulo nos 115
# produtos do catalogo. A oferta existe — mas so DENTRO da arte do produto,
# escrita em cima da foto: "WAS $172.60 / NOW $89.90 / SAVE 48% TODAY /
# VALID SEPTEMBER 2-30". Numeros abaixo transcritos dessa arte
# (img/Off1_Sep_02-30-10-acd9cc.webp), que e o que a loja de fato promete.
#
# Tirar isso de dentro do JPEG e a razao de existir do cartao de oferta: em
# HTML o preco vira texto selecionavel, o leitor de tela le, o tradutor
# traduz, a busca indexa e o prazo pode de fato contar.
#
# ATENCAO: a segunda foto do MESMO produto (Off1_Sep_02-30-12) diz "SAVE 54%".
# As duas artes se contradizem. Aqui vale a primeira, que e a que traz o
# "WAS" e permite conferir a conta: 1 - 89.90/172.60 = 47.9%.
OFERTA = {
    'img': 'Off1_Set_08-09-10-f2df08.webp',
    'era': '$74.70',
    'desconto': '20% off',
    'prazo': '-09-09T12:00:00-04:00',   # "VALID SEPTEMBER 8-9 (12PM USA)"
    'prazo_extenso': 'today, 12 PM',
}


def recortar_arte(destino, nome, manter=0.76):
    """Corta a faixa de texto no pe da arte de campanha e devolve o novo nome.

    A arte traz preco, desconto e prazo desenhados na imagem. No cartao de
    oferta esses tres viram HTML — deixar a faixa na foto mostraria os mesmos
    numeros duas vezes, e um deles envelheceria sem ninguem perceber.

    Pillow e opcional: sem ele a montagem segue com a arte inteira, avisando.
    Nao vale quebrar o build de quem so quer rodar o gerador."""
    saida = nome.replace('.webp', '-sem-arte.webp')
    caminho = os.path.join(destino, 'img', saida)
    if os.path.exists(caminho):
        return saida
    # A arte de campanha ROTA. A da vez anterior era "SEPTEMBER 2-30"; uma
    # semana depois ela tinha saido do ar e o gerador morreu com
    # FileNotFoundError no meio da montagem — apagando `nova-loja/` inteira,
    # porque o primeiro passo do build e limpar a pasta. Perder o prototipo
    # por causa de uma promocao que acabou e desproporcional: aqui o nome que
    # nao existe mais vira aviso, e a vitrine cai para a foto do produto.
    if not os.path.exists(os.path.join(destino, 'img', nome)):
        print(f'  aviso: a arte da oferta ({nome}) nao esta mais no ar — '
              f'atualize OFERTA em montar-ds.py; a vitrine usa a foto do produto')
        return None
    try:
        from PIL import Image
    except ImportError:
        print('  aviso: sem Pillow, a arte da oferta entra com a faixa de texto')
        return nome
    with Image.open(os.path.join(destino, 'img', nome)) as im:
        w, h = im.size
        im.crop((0, 0, w, int(h * manter))).save(caminho, 'WEBP', quality=88)
    return saida


def um_por_linha(prods, n, excluir=()):
    """Escolhe `n` produtos sem repetir a LINHA.

    O catalogo ja se protege de titulo repetido (ver dados.catalogo: a loja
    lista o mesmo kit duas vezes). Isto e o degrau seguinte do mesmo defeito:
    titulos diferentes, produtos diferentes — e mesma foto.

    "Mirracura shampoo" e "Mirracura mask" sao o mesmo frasco, a mesma faixa
    laranja e o mesmo fundo cinza; so o rotulo minusculo muda. Lado a lado num
    cartao de 265px eles leem como o mesmo produto duplicado, e quem olha
    conclui que a vitrine esta quebrada — nao que a marca tem dois tamanhos.

    A chave e a primeira palavra do titulo. E grosseira e resolve este
    catalogo inteiro: mirracura, detox, vello, cronograma, deep. Se um dia a
    loja lancar duas linhas com a mesma inicial, o lugar de melhorar e aqui,
    e nao pintando o cartao.

    Vale para VITRINE, nao para catalogo: numa listagem de coleção as duas
    Mirracura devem aparecer, porque ali a pessoa esta comparando tamanhos."""
    def linha(x):
        return re.sub(r'[^a-z0-9]', '', x['titulo'].split()[0].lower())
    fora = {linha(x) for x in excluir}
    escolhidos = []
    for x in prods:
        if x in excluir: continue
        if linha(x) in fora: continue
        fora.add(linha(x))
        escolhidos.append(x)
        if len(escolhidos) == n: break
    return escolhidos


def cartao_oferta(p, destino):
    """O destaque da vitrine: um produto, foto sangrando, prazo correndo."""
    import datetime
    arte = recortar_arte(destino, OFERTA['img']) or p['img']
    prazo = f"{datetime.date.today().year}{OFERTA['prazo']}"
    return f"""      <article class="yb-offercard">
        <img src="img/{arte}" alt="{p['titulo'][:80]}">
        <span class="yb-badge yb-badge--sale yb-offercard__off">{OFERTA['desconto']}</span>
        <div class="yb-offercard__body">
          <h3 class="yb-offercard__title"><a href="pdp.html">{p['titulo']}</a></h3>
          <div class="yb-offercard__linha">
            <span class="yb-offercard__price">{p['preco']}</span>
            <s class="yb-offercard__was">{OFERTA['era']}</s>
            <p class="yb-offercard__timer" data-yb-countdown="{prazo}">
              <time datetime="{prazo}">{OFERTA['prazo_extenso']}</time></p>
          </div>
          <p class="yb-offercard__fim" hidden>Offer ended</p>
          <a class="yb-btn yb-btn--primary" href="pdp.html">Buy now
            {ico('arrow-right', 'yb-icon yb-icon--sm')}</a>
        </div>
      </article>"""


def rodape():
    """Footer da loja, montado so com componentes e tokens do sistema.

    O conteudo e o mesmo que esta em producao — mesmos menus, mesmos textos,
    mesmos destinos. O que mudou e de onde vem cada cor e cada medida."""

    MENUS = [
        ("All Products", "/collections", [
            ("Best Sellers", "/collections/best-sellers"),
            ("Kit",          "/collections/collections"),
        ]),
        ("Collection", "/collections", [
            ("Progressiva", "/collections/fashion-gold"),
            ("Cronograma",  "/collections/cronograma-hair-care-system"),
            ("Ybera Paris", "/collections/ybera-paris"),
            ("100Timetros", "/collections/100timetros"),
            ("Capulana",    "/collections/capulana"),
            ("Terra Coco",  "/collections/terra-coco"),
            ("Hair Mist",   "/collections/hair-mist"),
        ]),
        ("Hair Problems", "/collections/hair-repair-products", [
            ("Damaged Hair",         "/collections/dullness"),
            ("Frizz &amp; Dryness",  "/collections/dryness-frizz"),
            ("Thinning / Hair Loss", "/collections/hair-loss-thinning-hair"),
            ("Undefined Curls",      "/collections/frizz-lack-of-volume"),
            ("Hair Smoothing",       "/collections/hair-smoothing-treatment"),
            ("Hair Straightening",   "/collections/hair-straightening-treatment"),
        ]),
    ]

    LEGAL = [
        ("Terms &amp; Conditions",     "/policies/terms-of-service"),
        ("Privacy Policy",             "/policies/privacy-policy"),
        ("Refund Policy",              "/policies/refund-policy"),
        ("Terms of Service",           "/policies/terms-of-service"),
        ("Shipping Policy",            "/policies/shipping-policy"),
        ("SMS Terms &amp; Conditions", "/pages/sms-terms-amp-conditions"),
    ]

    def coluna(n, titulo, itens):
        li = "".join(f'<li><a href="{h}">{t}</a></li>' for t, h in itens)
        return f"""      <div class="yb-footer__col">
        <input class="yb-footer__toggle" type="checkbox" id="fc{n}">
        <label class="yb-footer__coltitle" for="fc{n}">{titulo}
          <svg class="yb-icon yb-icon--sm" aria-hidden="true"><use href="yb/icons.svg#yb-chevron-down"/></svg>
        </label>
        <div class="yb-footer__collist"><ul>{li}</ul></div>
      </div>"""

    colunas = "\n".join(coluna(i, t, itens) for i, (t, _, itens) in enumerate(MENUS))
    legal = "".join(f'<a href="{h}">{t}</a>' for t, h in LEGAL)

    return f"""<footer class="yb-footer">
  <div class="yb-footer__inner">
    <div class="yb-footer__top">

      <div class="yb-footer__brand">
        <a class="yb-footer__logo" href="index.html"><span class="yb-logo yb-logo--lg"><img src="brand/ybera-logo.webp" alt="Ybera" width="360" height="139"></span></a>
        <ul class="yb-footer__links">
          <li><a href="/collections">Shop</a></li>
          <li><a href="/blogs/haircare">Blog</a></li>
          <li><a href="/pages/contactus">Contact Us</a></li>
          <li><a href="/pages/our-story">About Us</a></li>
        </ul>
        <div class="yb-footer__social">
          <a href="https://www.instagram.com/ybera.usa/" target="_blank" rel="noopener">
            <svg class="yb-icon" role="img" aria-label="Ybera on Instagram"><use href="yb/icons.svg#yb-instagram"/></svg>
          </a>
          <a href="https://www.tiktok.com/@ybera.us" target="_blank" rel="noopener">
            <svg class="yb-icon" role="img" aria-label="Ybera on TikTok"><use href="yb/icons.svg#yb-tiktok"/></svg>
          </a>
        </div>
      </div>

      <div class="yb-footer__menus">
{colunas}
      </div>

      <div class="yb-footer__contact">
        <div>
          <label class="yb-footer__newslabel" for="news-email">Subscribe to receive exclusive offers</label>
          <form class="yb-footer__news" method="post" action="/contact#ContactFooter">
            <span class="yb-footer__newsfield">
              <svg class="yb-icon yb-icon--sm" aria-hidden="true"><use href="yb/icons.svg#yb-mail"/></svg>
              <input class="yb-input" id="news-email" type="email" name="contact[email]" placeholder="Your best email" autocomplete="email" required>
            </span>
            <button class="yb-footer__newsbtn" type="submit" aria-label="Subscribe">
              <svg class="yb-icon" aria-hidden="true"><use href="yb/icons.svg#yb-arrow-right"/></svg>
            </button>
          </form>
        </div>
        <p class="yb-footer__info"><strong>For more information, please send us an Email to:</strong> info.usa@ybera.com</p>
        <p class="yb-footer__info"><strong>Customer Service:</strong> OPEN: Monday - Friday 8am - 4pm (EST)</p>
        <p class="yb-footer__info"><strong>Customer Service:</strong> CLOSED: Weekends and Holidays</p>
      </div>

    </div>
    <div class="yb-footer__bottom"><span>© 2026</span>{legal}</div>
  </div>
</footer>"""


def rodape_v2():
    """Rodape v2 — escuro, e mais curto do que o v1 por subtracao.

    A v1 repete a navegacao inteira: 15 links em tres colunas sanfonadas, mais
    4 no bloco de marca, mais 6 legais — 28 destinos num rodape. Era o padrao
    de 2010, quando o rodape servia de mapa do site; hoje quem procura usa a
    busca, e a lista longa so dilui os tres ou quatro links que alguem de fato
    clica.

    Aqui sao 9 links em tres colunas de tres, mais 3 legais. Cada coluna
    responde uma pergunta diferente: onde compro, quem me ajuda, quem sao
    voces. As colunas nao sanfonam no celular — com tres itens cada, a sanfona
    esconde menos do que custa em toque.

    DUPLICATA CORRIGIDA: a lista legal da v1 tem "Terms & Conditions" e "Terms
    of Service" apontando para /policies/terms-of-service. Mesmo destino, dois
    rotulos. Aqui ficou um.

    O fundo escuro nao e tema: e superficie escura dentro de pagina clara, com
    os tokens `*-inverse` que a camada 1 ja tinha medidos (ver DDR-007). O que
    NAO deu para reaproveitar foi o magenta: como texto sobre o rodape ele mede
    3.11:1 e reprova em AA. O hover dos links e branco."""
    COLUNAS = [
        ("Shop", [
            ("Best Sellers", "/collections/best-sellers"),
            ("Kits",         "/collections/collections"),
            ("All Products", "/collections"),
        ]),
        ("Help", [
            ("Contact Us",      "/pages/contactus"),
            ("Shipping Policy", "/policies/shipping-policy"),
            ("Refund Policy",   "/policies/refund-policy"),
        ]),
        ("Company", [
            ("Our Story",        "/pages/our-story"),
            ("Blog",             "/blogs/haircare"),
            ("AI Hair Analysis", "/pages/ai-hair-routine-quiz"),
        ]),
    ]
    LEGAL = [
        ("Terms of Service", "/policies/terms-of-service"),
        ("Privacy Policy",   "/policies/privacy-policy"),
        ("SMS Terms",        "/pages/sms-terms-amp-conditions"),
    ]
    colunas = "".join(f"""
        <div class="yb-footer__col">
          <p class="yb-footer__coltitle">{t}</p>
          <div class="yb-footer__collist"><ul>{''.join(f'<li><a href="{h}">{r}</a></li>' for r, h in itens)}</ul></div>
        </div>""" for t, itens in COLUNAS)
    legal = "".join(f'<a href="{h}">{t}</a>' for t, h in LEGAL)
    return f"""<footer class="yb-footer yb-footer--dark">
  <div class="yb-footer__inner">

    <div class="yb-footer__news-zona">
      <div>
        <!-- Sem "10% off your first order": a loja nao tem esse programa. Um
             desconto de boas-vindas e a chamada padrao de rodape americano e
             foi o que escrevi de primeira — mas prometer no prototipo o que a
             loja nao cumpre e o mesmo defeito da nota inventada na PDP. A
             chamada diz o que a assinatura entrega de verdade. -->
        <p class="yb-footer__newstitle">First to know</p>
        <label class="yb-footer__newslabel" for="news-email">New arrivals, routines and offers. No spam.</label>
      </div>
      <form class="yb-footer__news" method="post" action="/contact#ContactFooter">
        <span class="yb-footer__newsfield">
          {ico('mail', 'yb-icon yb-icon--sm')}
          <input class="yb-input" id="news-email" type="email" name="contact[email]" placeholder="Your best email" autocomplete="email" required>
        </span>
        <button class="yb-footer__newsbtn" type="submit" aria-label="Subscribe">
          {ico('arrow-right')}
        </button>
      </form>
    </div>

    <div class="yb-footer__top">
      <div class="yb-footer__brand">
        <a class="yb-footer__logo" href="index-v2.html"><span class="yb-logo yb-logo--lg"><img src="brand/ybera-logo.webp" alt="Ybera" width="360" height="139"></span></a>
        <p class="yb-footer__info">info.usa@ybera.com</p>
        <p class="yb-footer__info">Mon&ndash;Fri, 8am&ndash;4pm EST</p>
        <div class="yb-footer__social">
          <a href="https://www.instagram.com/ybera.usa/" target="_blank" rel="noopener">
            <svg class="yb-icon" role="img" aria-label="Ybera on Instagram"><use href="yb/icons.svg#yb-instagram"/></svg>
          </a>
          <a href="https://www.tiktok.com/@ybera.us" target="_blank" rel="noopener">
            <svg class="yb-icon" role="img" aria-label="Ybera on TikTok"><use href="yb/icons.svg#yb-tiktok"/></svg>
          </a>
        </div>
      </div>

      <div class="yb-footer__menus">{colunas}
      </div>
    </div>

    <div class="yb-footer__bottom"><span>&copy; 2026 Ybera Paris USA</span>{legal}</div>
  </div>
</footer>"""


def busca(prods):
    """Overlay de busca da loja.

    O que aparece antes de digitar sao produtos REAIS do catalogo, nao rotulos
    de exemplo: uma busca que estreia com "Product 1, Product 2" ensina a
    ignora-la. Os recentes ficam de fora — nao ha historico de ninguem numa
    pagina estatica, e um bloco "Recent" vazio anuncia uma funcao que o cliente
    nao tem.

    Filtrar de verdade e trabalho do servidor. O JS do sistema so decide QUAL
    dos tres paineis mostrar; sem ele o <form> continua enviando a busca."""
    def linha(p, termo=None):
        return f"""            <a class="yb-search__item" href="pdp.html"{f' data-termo="{termo}"' if termo else ''}>
              <span class="yb-search__thumb"><img src="img/{p['img']}" alt="" loading="lazy" width="56" height="56"></span>
              <span>
                <span class="yb-search__name">{p['titulo']}</span>
                <span class="yb-search__meta">{p.get('vendor','Ybera USA')}</span>
              </span>
              <span class="yb-price yb-price--sm"><b class="yb-price__now">{p['preco']}</b></span>
            </a>"""

    def chave(p):
        return re.sub(r'[^a-z0-9 ]', ' ', p['titulo'].lower())

    vitrine = "\n".join(linha(p) for p in prods[:4])
    achaveis = "\n".join(linha(p, chave(p)) for p in prods[:8])

    return f"""<dialog id="site-search" class="yb-search" aria-label="Search products">
  <div class="yb-search__bar">
    <form class="yb-search__form" role="search" action="/search" method="get" data-yb-search>
      {ico('search', 'yb-icon yb-search__icon')}
      <input class="yb-search__input" type="search" name="q" autocomplete="off" autofocus
             placeholder="Search products, concerns, ingredients" aria-label="Search products">
      <button class="yb-iconbtn yb-search__clear" type="reset" aria-label="Clear search" hidden>{ico('close')}</button>
      <button class="yb-search__close" type="button" data-yb-close>Close</button>
    </form>
  </div>
  <div class="yb-search__body">
    <div class="yb-search__panel" data-yb-search-zero>
      <div class="yb-search__col">
        <div class="yb-search__group yb-search__group--secondary">
          <h2 class="yb-search__title">Popular</h2>
          <ul class="yb-search__list">
            <li><a class="yb-search__link" href="/search?q=hair+botox">{ico('search')}hair botox</a></li>
            <li><a class="yb-search__link" href="/search?q=progressive">{ico('search')}progressive brush</a></li>
            <li><a class="yb-search__link" href="/search?q=myrrh">{ico('search')}myrrh oil</a></li>
          </ul>
        </div>
        <div class="yb-search__group yb-search__group--secondary">
          <h2 class="yb-search__title">Collections</h2>
          <ul class="yb-search__chips">
            <li><a class="yb-search__chip" href="/collections/smoothing">Smoothing</a></li>
            <li><a class="yb-search__chip" href="/collections/home-care">Home care</a></li>
            <li><a class="yb-search__chip" href="/collections/kits">Kits</a></li>
            <li><a class="yb-search__chip" href="/collections/hair-oils">Hair oils</a></li>
          </ul>
        </div>
      </div>
      <div class="yb-search__col">
        <div class="yb-search__group">
          <h2 class="yb-search__title">Best sellers</h2>
{vitrine}
        </div>
      </div>
    </div>
    <div class="yb-search__panel" data-yb-search-results hidden>
      <div class="yb-search__col">
        <div class="yb-search__group" data-yb-search-group>
          <h2 class="yb-search__title">Products</h2>
{achaveis}
        </div>
      </div>
    </div>
    <div class="yb-search__empty" data-yb-search-empty hidden>
      <p>Nothing found for <strong data-yb-search-echo></strong>.</p>
      <p>Try a shorter word, or the product line instead of the full name.</p>
      <ul class="yb-search__chips">
        <li><a class="yb-search__chip" href="/collections/best-sellers">Best sellers</a></li>
        <li><a class="yb-search__chip" href="/collections/new">New arrivals</a></li>
        <li><a class="yb-search__chip" href="/pages/contact">Talk to a specialist</a></li>
      </ul>
    </div>
  </div>
</dialog>"""


def gaveta(prods):
    """A gaveta mostra os itens que ela diz ter.

    Antes era `<div class="yb-cart__items"></div>` vazio: o cabecalho anunciava
    "Your cart (2)", o rodape somava $179.80 e a lista nao tinha nada. Um
    componente que se contradiz e pior do que um componente ausente."""

    def valor(t):
        return float(re.sub(r'[^\d.]', '', t or '0') or 0)

    itens = prods[:2]
    subtotal = sum(valor(p['preco']) for p in itens)
    falta = max(0, 200 - subtotal)
    pct = min(100, round(subtotal / 200 * 100))

    linhas = "".join(f"""
      <div class="yb-cart__item">
        <div class="yb-card__media"><img src="img/{p['img']}" alt="" loading="lazy"></div>
        <div class="yb-cart__item-body">
          <div class="yb-cart__item-topo">
            <p class="yb-cart__item-title">{p['titulo']}</p>
            <button class="yb-cart__remove" aria-label="Remove {p['titulo'][:40]}">{ico('trash','yb-icon yb-icon--sm')}</button>
          </div>
          <span class="yb-cart__item-variant">{p.get('variante', 'Default')}</span>
          <div class="yb-cart__item-foot">
            <span class="yb-cart__item-precos"><span class="yb-price yb-price--sm"><b class="yb-price__now">{p['preco']}</b></span></span>
            <div class="yb-stepper yb-stepper--sm" data-yb-stepper>
              <button type="button" data-yb-step="down" aria-label="Decrease quantity of {p['titulo'][:30]}">&minus;</button>
              <input type="number" value="1" min="1" max="10" aria-label="Quantity of {p['titulo'][:30]}">
              <button type="button" data-yb-step="up" aria-label="Increase quantity of {p['titulo'][:30]}">+</button>
            </div>
          </div>
        </div>
      </div>""" for p in itens)

    frete = (f'<span class="yb-freeship__text">Add <b>${falta:.2f}</b> more for free shipping</span>'
             if falta else f'<span class="yb-freeship__text">{ico("truck", "yb-icon yb-icon--sm")} Free shipping unlocked</span>')

    # Degraus de brinde. Como o frete gratis de $200, sao NUMEROS DE PROTOTIPO:
    # a loja nao tem programa de brinde por meta hoje. Ficam aqui em cima, num
    # so lugar, para quem for ligar de verdade saber onde trocar.
    DEGRAUS = (250, 400)
    premio = prods[2] if len(prods) > 2 else itens[0]
    prox = next((d for d in DEGRAUS if subtotal < d), None)
    def trilho(i, d):
        base = 0 if i == 0 else DEGRAUS[i - 1]
        vao = d - base
        return min(100, max(0, round((subtotal - base) / vao * 100)))
    trilhos = "".join(
        f'<span class="yb-progress yb-progress--sm">'
        f'<span class="yb-progress__fill yb-progress__fill--success" style="inline-size:{trilho(i, d)}%"></span></span>'
        for i, d in enumerate(DEGRAUS))
    if prox:
        brinde_txt = f'Add <b>${prox - subtotal:.2f}</b> and receive your first gift'
        brinde_mod = ''
    else:
        brinde_txt = "You've unlocked the best gift available"
        brinde_mod = ' yb-cart__brinde-card--completo'

    # Parceiro: identificador de exemplo, nao uma pessoa. O valor sai do
    # subtotal para a faixa nao contradizer o rodape.
    poupou = subtotal * 0.15

    return f"""<dialog id="cart" class="yb-dialog yb-dialog--drawer" aria-labelledby="cart-t">
  <div class="yb-cart">
    <div class="yb-cart__head"><h2 id="cart-t">Your cart ({len(itens)})</h2>
      <div class="yb-cart__head-acoes">
        <button class="yb-cart__share" aria-label="Share cart">{ico('share')}</button>
        <button class="yb-cart__close" data-yb-close aria-label="Close cart">{ico('close')}</button>
      </div></div>
    <div class="yb-cart__ship{'' if falta else ' yb-cart__ship--ok'}">
      <div class="yb-freeship">
        {frete}
        <div class="yb-progress" role="progressbar" aria-valuenow="{pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to free shipping">
          <span class="yb-progress__fill" style="inline-size:{pct}%"></span></div>
      </div>
    </div>
    <div class="yb-cart__brinde-card{brinde_mod}">
      <div class="yb-cart__brinde-corpo">
        <p class="yb-cart__brinde-texto">{brinde_txt}</p>
        <div class="yb-cart__brinde-trilhos" role="progressbar"
             aria-valuenow="{int(subtotal)}" aria-valuemin="0" aria-valuemax="{DEGRAUS[-1]}"
             aria-valuetext="${subtotal:.2f} of ${DEGRAUS[-1]}.00 toward the best gift">{trilhos}</div>
      </div>
      <div class="yb-cart__brinde-premio"><img src="img/{premio['img']}" alt="" loading="lazy"></div>
    </div>
    <div class="yb-cart__items">{linhas}
    </div>
    <div class="yb-cart__protecao">
      <div class="yb-cart__protecao-corpo">
        <b>Route Package Protection</b>
        <p>Guard against loss, theft, or damage for only $4.98</p>
      </div>
      <button class="yb-switch" type="button" data-yb-switch role="switch" aria-checked="false" aria-label="Route Package Protection">
        <span class="yb-switch__knob"></span>
      </button>
    </div>
    <div class="yb-cart__cupom">
      <form class="yb-field yb-field--row">
        <div class="yb-field__box">
          <input class="yb-input" id="cupom" type="text" placeholder=" " autocomplete="off">
          <label class="yb-field__label" for="cupom">Promo code</label>
        </div>
        <button class="yb-btn yb-btn--ghost yb-btn--sm" type="submit">Apply</button>
      </form>
      <p class="yb-cart__note">Taxes, shipping and discounts calculated at checkout</p>
    </div>
    <div class="yb-cart__foot">
      <div class="yb-cart__parceiro">
        <span class="yb-cart__parceiro-inicial" aria-hidden="true">YP</span>
        <p><b>{PARCEIRO['identificador']}</b> saved you ${poupou:.2f}</p>
      </div>
      <div class="yb-cart__resumo">
        <div class="yb-cart__totais">
          <div class="yb-cart__total-linha"><b class="yb-cart__total">${subtotal:.2f}</b></div>
        </div>
        <button class="yb-btn yb-btn--primary yb-cart__checkout">Checkout ({len(itens)})</button>
      </div>
    </div>
  </div>
</dialog>"""


# ============================================================ BANNER
# O banner NAO e componente do design system — e imagem com carrossel, e assim
# deve continuar. Aqui ele e reproduzido como esta em producao: quatro slides,
# <picture> com arte separada para mobile e desktop, 75vh, link por slide.
#
# O carrossel em si usa scroll-snap nativo, sem biblioteca. A loja usa Splide;
# o resultado visual e o mesmo e o comportamento e o esperado (arrastar, setas,
# teclado). "Carrossel" e uma lacuna conhecida do sistema — ver README.
SLIDES = [
    ('Banner_20_24H_mb_b-61df813f.webp',  'Banner_20_24H_b-96b194d5.webp',
     '/collections/vello-1', '20% off sitewide for the next 24 hours'),
    ('1-vertical_banner_Test03_8f834d71-8bd1-46a2-9c5d-7121769c.webp', 'Vello00012-a284ea34.webp',
     '/collections/detox', 'Vello Alpha-Lactobaby system'),
    ('DetoxMobille_109e8d67-c2fd-4329-8ed3-0fa79ebfd5a-59326a33.webp',
     'Detox_2b43ace8-6814-4b56-9660-f7ad9b63169b-91da7dd2.webp',
     '/collections/cronograma-hair-care-system', 'Detox line'),
    ('banner-topo-cronograma-m-eee06cf9.webp',
     'Banner_novo_Site4_ed4992cb-c4a5-4753-80fe-83e47b-c65598d9.webp',
     '#', 'Cronograma hair care system'),
]


def copiar_banners(destino):
    """Traz as imagens do banner da captura de producao."""
    origem = os.path.join(RAIZ, 'home', 'assets')
    alvo = os.path.join(destino, 'img')
    n = 0
    for mb, dk, _, _ in SLIDES:
        for f in (mb, dk):
            o = os.path.join(origem, f)
            if os.path.exists(o):
                shutil.copy(o, os.path.join(alvo, f)); n += 1
    return n


def banner():
    slides = ""
    for i, (mb, dk, href, alt) in enumerate(SLIDES):
        slides += f"""
        <li class="banner__slide">
          <a href="{href}" aria-label="{alt}">
            <picture>
              <source media="(max-width: 767px)" srcset="img/{mb}">
              <source media="(min-width: 768px)" srcset="img/{dk}">
              <img src="img/{dk}" alt="{alt}"{' loading="lazy"' if i else ''}>
            </picture>
          </a>
        </li>"""
    return f"""<section class="banner" aria-roledescription="carousel" aria-label="Promotions">
{parceiro()}
  <ul class="banner__track" id="banner-track">{slides}
  </ul>
  <button class="banner__arrow banner__arrow--prev" aria-label="Previous slide">{ico('chevron-left','yb-icon yb-icon--lg')}</button>
  <button class="banner__arrow banner__arrow--next" aria-label="Next slide">{ico('chevron-right','yb-icon yb-icon--lg')}</button>
</section>"""


# O recado do parceiro. So existe quando a pessoa chega por link patrocinado —
# no prototipo ele fica sempre ligado, porque a alternativa era nao poder ver a
# peca. O identificador e de exemplo, como o da faixa do carrinho: e a MESMA
# influenciadora nos dois lugares, e tem de continuar sendo, senao o prototipo
# se contradiz entre o topo e o pe.
PARCEIRO = {
    'identificador': '@yberapartner',
    'foto': '02sauana-2896ea7c.webp',
    'recado': 'Enjoy my exclusive <b>partner discount</b>.',
}


def parceiro():
    """Avatar e balao sobre o banner. Recolhe na rolagem (ver components.js)."""
    return f"""<aside class="yb-partner" data-yb-partner aria-label="Partner greeting">
  <div class="yb-partner__dock">
    <button class="yb-partner__avatar" type="button" aria-expanded="true" aria-controls="partner-msg">
      <img src="img/{PARCEIRO['foto']}" alt="">
      <span class="yb-sr-only">Message from {PARCEIRO['identificador']}</span>
    </button>
    <div class="yb-partner__bubble" id="partner-msg">
      <p>Hey, it&rsquo;s <b>{PARCEIRO['identificador']}</b>! {PARCEIRO['recado']}</p>
    </div>
  </div>
</aside>"""


# O quiz de diagnostico. A loja tem "AI Hair Analysis" no menu, mas a entrada
# hoje e um link de texto — nao ha bloco que convide.
#
# O "10k+ routines created" e ESPERA, pelo mesmo motivo da nota: nao ha de onde
# ler quantas rotinas foram criadas. Fica aqui, nomeado, e nao solto no meio da
# marcacao. Se no dia da implementacao o numero nao existir, a linha sai — a
# secao funciona sem ela, e prova social inventada custa mais do que rende.
QUIZ = {
    'prova': '10k+ routines created',
    # A foto e recortada em faixa larga no desktop e em faixa baixa no celular,
    # entao ela precisa sobreviver aos dois cortes. Textura de cabelo enchendo
    # o quadro sobrevive; cena com assunto num canto so vira parede. A do
    # chuveiro (Artboard_27) tinha o cabelo na direita e o corte deixava a
    # prateleira no centro.
    'foto': '02_hair-problem-f838107d.webp',
    'opcoes': ['Slightly Damaged', 'Healthy', 'Very Damaged', 'Chemically Treated'],
    'perguntas': 4,
}


def quiz():
    """Foto de um lado, painel escuro do outro.

    Os quatro chips sao `.yb-swatches`, o mesmo seletor de variante da PDP: a
    pergunta e a mesma (escolha uma entre poucas) e o componente ja resolve
    radio, alvo de 44px, `:checked` e foco. O que muda e a cor, no modificador
    `--on-dark`.

    A primeira opcao ja vem marcada. Fileira de escolha sem nada marcado abre
    com quatro caixas iguais e nao ensina que sao excludentes; com uma marcada,
    a regra se le antes de clicar."""
    chips = "".join(f"""
          <input type="radio" name="quiz-cabelo" id="quiz-{i}"{' checked' if i == 0 else ''}>
          <label for="quiz-{i}">{o}</label>""" for i, o in enumerate(QUIZ['opcoes']))
    return f"""  <section class="yb-split">
    <div class="yb-split__media">
      <img src="img/{QUIZ['foto']}" alt="" loading="lazy">
    </div>
    <div class="yb-split__panel">
      <span class="yb-badge yb-badge--on-dark">{QUIZ['prova']}</span>
      <h2 class="yb-split__title">What does your hair need?</h2>
      <p class="yb-split__sub">We&rsquo;ll tell you what works, takes 60 seconds</p>
      <div class="yb-swatches yb-swatches--on-dark" role="radiogroup" aria-label="Hair condition">{chips}
      </div>
      <button class="yb-btn yb-btn--on-dark" type="button">Start analysis</button>
      <p class="yb-split__nota">{QUIZ['perguntas']} quick questions</p>
    </div>
  </section>"""


# A nota que a loja NAO expoe.
#
# O Judge.me esta instalado na ybera.us mas o resumo agregado esta escondido no
# tema, e /pages/reviews da 404 — nao ha de onde ler nota media nem contagem.
# O `reviews.json` deste repositorio tem 6 avaliacoes reais, todas 5 estrelas,
# cada uma de um produto DIFERENTE: nenhuma e do produto da PDP.
#
# Estes dois numeros sao, portanto, ESPERA — nao dado. Ficam aqui, num lugar
# so, em vez de espalhados como literal pelo gerador: no dia em que a nota
# existir, muda-se esta linha e o cartao, a PDP e o que vier depois seguem
# juntos. Antes disto o "4.8" morava solto dentro de cartao() e o "128" era
# valor padrao de um .get() — dois lugares para a mesma mentira.
# A nota vem das avaliacoes que a captura tem, e nao mais de um numero
# escolhido. Era 4.8 (128) — os dois inventados, e o "128" ainda era valor
# padrao de um .get(), o que espalhava a mesma mentira por dois lugares.
#
# Por que nao vem do Judge.me: a loja usa Judge.me, mas o agregado e montado no
# navegador. Nada no HTML de producao carrega a nota (nem `data-average-rating`,
# nem `ratingValue`, nem `reviewCount` — procurados um a um), e os endpoints
# publicos do widget respondem `Failed to authenticate. Shop domain or Api Token
# is wrong`. O agregado real existe e depende de um token que e da loja, nao
# meu. Ate ele chegar, o que a pagina mostra e o que a pagina TEM.
#
# O que este numero ainda nao e: nota POR PRODUTO. As avaliacoes capturadas sao
# da vitrine da home e falam de produtos diferentes; usa-las no cartao de cada
# produto continua sendo aproximacao. A diferenca e que agora e uma aproximacao
# de dado real, e nao um numero escolhido a dedo.
def _agregado():
    notas = [int(r['nota']) for r in REVIEWS]
    return {'nota': f'{sum(notas) / len(notas):.1f}', 'total': len(notas),
            'dist': {n: notas.count(n) for n in (5, 4, 3, 2, 1)}}

# A PDP tem dois estados que dependem do CATALOGO, nao do gerador, e por isso
# nao havia onde olhar para nenhum dos dois: existia uma pdp.html so, de um
# handle so, e aquele handle tem estoque. O ramo de esgotado era codigo que
# ninguem conseguia ver — que e como um ramo apodrece sem ninguem notar.
#
# Este handle esta esgotado na loja de verdade (todas as variantes com
# `available` falso), tem 5 fotos e descricao propria. Se um dia voltar ao
# estoque, a pagina volta a mostrar o fluxo de compra e o teste
# "pdp-esgotado.html prova o esgotado" acusa — trocar por outro handle da
# lista de esgotados e a correcao, e ela leva uma linha.
ESGOTADO = 'mirracura-shampoo-500ml-16-9fl-oz-2'

# O outro ramo sem dado: dos 116 produtos da loja, exatamente UM tem mais de
# uma variante — "Cash Back + Shipping Protection", o SKU do Route, com 76
# linhas de "Earn Cash Back, provided in your order email". Nenhum produto de
# verdade tem opcao: todos sao Title/Default Title. O seletor de tamanho
# existia no gerador havia semanas sem nunca ter renderizado uma vez.
#
# Estes numeros sao FORJADOS, e isso esta dito em tres lugares alem deste
# comentario: no nome do arquivo (pdp-variante.html), no cartao do indice e
# numa checagem que impede o dado de vazar para a pdp.html. O que NAO muda: a
# pdp.html continua lendo so o catalogo. Tres cartoes de tamanho inventados ja
# moraram no gerador uma vez e foram lidos como verdade — a licao foi que dado
# de mentira precisa de cerca, nao de ausencia.
# O teto da quantidade. NAO e estoque: a loja nao expoe `inventory_quantity`
# em nenhum endpoint publico — nem products.json, nem o .js do produto. Nove e
# um numero de contencao, como o 4.8 de AVALIACAO e espera e nao dado. Fica
# aqui, nomeado, em vez de literal dentro do markup: no dia em que houver
# estoque de verdade, muda-se esta linha.
#
# Por isso tambem NAO ha mensagem explicando o limite quando a pessoa chega
# nele. O "+" desabilita, que e o sinal honesto de "nao da para mais"; frase
# inventando motivo ("only 9 per order") seria regra de negocio escrita pelo
# protótipo.
QTD_MAX = 9

# ------------------------------------------------------------------ O QUE VEM
# O kit e tres mascaras e a pagina nao dizia nenhuma. "Deep care kit" +
# "$89.90" + tres fotos de pote sem legenda: quem compra descobre o conteudo
# depois da caixa chegar.
#
# De onde sai o dado: dos NOMES DOS ARQUIVOS das fotos que a propria loja
# publica na galeria do kit — `90_mascara_nutricao_250g_cuidados_profundos…`,
# `…_reconstrucao_…`, `…_hidratacao_…`. Nao e inventado; e leitura do que o
# Shopify serve. As tres fotos ja estao na galeria: o que faltava era o nome.
#
# Por que um mapa por handle e nao uma regra: so kit tem conteudo, e adivinhar
# "e kit porque tem 'kit' no titulo" erraria em "Kit Sealant" (um produto so).
# Produto que nao esta aqui nao mostra a secao. As camadas do fio (cuticula,
# cortex, medula) NAO entram: a descricao diz que as tres mascaras agem em
# camadas diferentes, mas nao diz qual mascara age em qual — cruzar as duas
# listas seria inventar a correspondencia.
CONTEUDO_KIT = {
    'deep-care-kit-ybera-fashion-gold': {
        # Nome, camada do fio, peso. Tudo isto esta IMPRESSO na lata, e a lata e
        # a primeira foto da galeria: "Contem / Contains: 1 unidade de / unit
        # of: Mascara Hidratacao Prolongada 250g (Net Wt. 8.8 oz)" tres vezes,
        # "TOTAL: 750g (Net Wt. 26.4 oz)", e as tres faixas coloridas ligando
        # MEDULA / CORTEX / CUTICULA a cada mascara, com o nome em ingles que a
        # marca usa. Nada aqui e traducao minha.
        #
        # A ordem e a da lata: de dentro para fora do fio.
        'itens': [
            ('Intensive Reconstruction Mask', 'Medulla', '250g / 8.8oz'),
            ('Deep Nutrition Mask', 'Cortex', '250g / 8.8oz'),
            ('Long-Lasting Hydration Mask', 'Cuticle', '250g / 8.8oz'),
        ],
    },
}

VARIANTE_FORJADA = [
    {'titulo': '250g (8.8oz)',  'preco': '$34.90', 'disponivel': True,  'foto': 0},
    {'titulo': '500g (17.6oz)', 'preco': '$59.90', 'disponivel': True,  'foto': 1},
    {'titulo': '1kg (35.2oz)',  'preco': '$99.90', 'disponivel': False, 'foto': 2},
]


# ==================================================== CARROSSEL DE REVIEWS
# Prova social real, extraida do widget Judge.me da home. Diferente do Tolstoy,
# o Judge.me renderiza no DOM normal — o design system alcanca, e por isso aqui
# o conteudo dele e servido pelos nossos componentes.
REVIEWS = json.load(open(os.path.join(RAIZ, 'reviews.json'), encoding='utf-8'))
AVALIACAO = _agregado()


def copiar_reviews(destino):
    origem = os.path.join(RAIZ, 'home', 'assets')
    alvo = os.path.join(destino, 'img')
    n = 0
    for r in REVIEWS:
        f = os.path.basename(r['img'])
        o = os.path.join(origem, f)
        if os.path.exists(o):
            shutil.copy(o, os.path.join(alvo, f)); r['arquivo'] = f; n += 1
    return n


def carrossel_reviews():
    itens = ""
    for r in REVIEWS:
        if not r.get('arquivo'):
            continue
        estrelas = '★' * r['nota'] + '☆' * (5 - r['nota'])
        # O Judge.me usa a primeira frase da avaliacao como "titulo" — o mesmo
        # texto aparecia em negrito e de novo logo abaixo. Titulo que so repete
        # o comeco do texto nao e titulo.
        texto = r['texto'].strip()
        tit = (r['titulo'] or '').strip()
        if tit and texto.lower().startswith(tit.lower().rstrip('.…')):
            tit = ''
        titulo = f'<p class="yb-review__title">{tit}</p>' if tit else ''
        # nome do produto sem catalogo vazando (mesma limpeza do cartao) e
        # como link: quem se convence pela avaliacao precisa chegar ao produto
        produto, _ = dados.titulo_limpo(r['produto'])
        # Selo de compra verificada. O ramo existe e nao renderiza: as
        # avaliacoes capturadas nao trazem o campo, e o Judge.me so o expoe
        # pela API com token. Mesma regra do "Save X%" — o lugar fica pronto,
        # e ninguem escreve "Verified" sem ter o que verificar.
        selo = ('<span class="yb-review__verified">'
                + ico('shield-check', 'yb-icon yb-icon--sm')
                + ' Verified purchase</span>') if r.get('verificado') else ''
        itens += f"""
        <article class="yb-review" data-nota="{r['nota']}">
          <div class="yb-review__media"><img src="img/{r['arquivo']}" alt="" loading="lazy"></div>
          <div class="yb-review__body">
            <span class="yb-rating" role="img" aria-label="{r['nota']} of 5 stars">
              <span class="yb-rating__stars" aria-hidden="true">{estrelas}</span></span>
            {titulo}
            <p class="yb-review__text">{texto}</p>
            <span class="yb-review__author">{r['autor']}</span>{selo}
            <span class="yb-review__product"><a href="pdp.html">{produto}</a></span>
          </div>
        </article>"""
    # ------------------------------------------------------------------
    # RESUMO, DISTRIBUICAO E FILTRO.
    #
    # A secao era so o trilho: seis cartoes e nenhuma resposta para "quantas
    # sao no total" e "alguem reclamou". Um trilho de avaliacoes sem resumo
    # obriga a pessoa a arrastar ate o fim para descobrir que nao ha nota 2 —
    # e quem arrasta ate o fim ja desistiu.
    #
    # Tudo aqui sai de REVIEWS, inclusive as barras. Com as seis avaliacoes
    # capturadas, quatro das cinco barras ficam em zero — e ficam mesmo,
    # visiveis e clicaveis. Esconder a linha vazia seria desenhar uma loja em
    # que ninguem nunca deu tres estrelas; mostrar a linha em zero e dizer a
    # verdade, que e que ninguem deu tres estrelas ENTRE ESTAS SEIS.
    total = AVALIACAO['total']
    barras = ""
    for n in (5, 4, 3, 2, 1):
        q = AVALIACAO['dist'][n]
        pct = round(q * 100 / total) if total else 0
        barras += f"""
          <li class="yb-reviews__linha">
            <span class="yb-reviews__estrela">{n} {ico('star-filled', 'yb-icon yb-icon--sm')}</span>
            <span class="yb-progress yb-progress--sm" role="img"
                  aria-label="{q} of {total} reviews gave {n} stars">
              <span class="yb-progress__fill" style="inline-size:{pct}%"></span>
            </span>
            <span class="yb-reviews__qtd">{q}</span>
          </li>"""

    # O filtro e o mesmo grupo de radio dos tamanhos (`.yb-swatches`): alvo de
    # 44px, anel de foco e setas do teclado ja vem de graca do radio nativo.
    filtros = ""
    for v, rot in [('all', 'All')] + [(str(n), f'{n} ★') for n in (5, 4, 3, 2, 1)]:
        marcado = ' checked' if v == 'all' else ''
        filtros += f"""
            <input type="radio" name="notafiltro" id="nf{v}" value="{v}"{marcado}>
            <label for="nf{v}">{rot}</label>"""

    return f"""    <section class="yb-block" id="reviews">
      <div class="yb-section-head yb-section-head--center">
        <h2>What Our Customers Say</h2>
      </div>

      <div class="yb-reviews__topo">
        <div class="yb-reviews__nota">
          <b class="yb-reviews__media">{AVALIACAO['nota']}</b>
          <span class="yb-rating" role="img" aria-label="{AVALIACAO['nota']} of 5">
            <span class="yb-rating__stars" aria-hidden="true">★★★★★</span></span>
          <span class="yb-reviews__total">{total} reviews</span>
        </div>
        <ul class="yb-reviews__dist">{barras}
        </ul>
        <div class="yb-reviews__acoes">
          <div class="yb-swatches" role="radiogroup" aria-label="Filter by rating"
               data-yb-review-filtro>{filtros}
          </div>
          <button class="yb-btn yb-btn--secondary" type="button" data-yb-open="escrever">
            Write a review</button>
        </div>
      </div>

      <div class="yb-track yb-reviews" id="reviews-track">{itens}
      </div>
      <div class="yb-empty yb-empty--inline" data-yb-review-vazio hidden>
        <span class="yb-empty__icone">{ico('star')}</span>
        <p class="yb-empty__title" data-yb-review-vazio-titulo>No reviews with this rating</p>
        <p class="yb-empty__text">Every review here so far is a five. Nothing is filtered out
        on purpose.</p>
        <div class="yb-empty__acoes">
          <button class="yb-btn yb-btn--secondary" type="button" data-yb-review-limpar>
            Show all reviews</button>
        </div>
      </div>
      <div class="yb-track__nav" data-yb-track-nav="reviews-track" hidden>
        <button type="button" class="yb-iconbtn" data-yb-track-step="prev" aria-label="Previous reviews">{ico('chevron-left')}</button>
        <button type="button" class="yb-iconbtn" data-yb-track-step="next" aria-label="Next reviews">{ico('chevron-right')}</button>
      </div>

      <dialog id="escrever" class="yb-dialog" aria-labelledby="escrever-t">
        <div class="yb-dialog__head">
          <h3 class="yb-dialog__title" id="escrever-t">Write a review</h3>
          <button class="yb-dialog__close" data-yb-close aria-label="Close">{ico('close')}</button>
        </div>
        <form class="yb-dialog__body"
              onsubmit="Ybera.toast({{title:'Thanks — your review is in review',text:'We publish it once it is checked.',variant:'success'}}); this.closest('dialog').close(); return false">
          <div class="yb-field">
            <label class="yb-field__label" for="rv-nota">Your rating</label>
            <select class="yb-select" id="rv-nota" required>
              <option value="5">5 — loved it</option>
              <option value="4">4 — good</option>
              <option value="3">3 — it is fine</option>
              <option value="2">2 — not for me</option>
              <option value="1">1 — disappointed</option>
            </select>
          </div>
          <div class="yb-field">
            <label class="yb-field__label" for="rv-texto">Your review</label>
            <textarea class="yb-textarea" id="rv-texto" rows="4"
                      placeholder="What changed in your hair, and how long it took." required></textarea>
          </div>
          <div class="yb-field">
            <label class="yb-field__label" for="rv-email">Email</label>
            <input class="yb-input" id="rv-email" type="email" autocomplete="email" required>
            <p class="yb-field__hint">Only to confirm the purchase. It is never published.</p>
          </div>
          <div class="yb-dialog__foot">
            <button class="yb-btn yb-btn--ghost" type="button" data-yb-close>Cancel</button>
            <button class="yb-btn yb-btn--primary" type="submit">Submit review</button>
          </div>
        </form>
      </dialog>
    </section>"""


# ============================================== LISTAS DE COLEÇÃO (2 seções)
# A home usa a mesma anatomia duas vezes; por isso ela virou o componente
# .yb-collection. Aqui so entram conteudo, imagens e links de producao.
# Os rotulos sao os MESMOS do menu (MENU > Shop > Hair Problem): sao os mesmos
# quatro destinos, e a loja os chamava de dois jeitos. A secao pergunta "o que
# esta entre voce e um cabelo bonito?" — "Curly Hair" como resposta dizia que
# cabelo cacheado e problema; o problema e o cacho indefinido. "Frizz Control"
# misturava solucao com problema.
PROBLEMAS = [
    ('02_hair-problem-f838107d.webp', 'Damaged Hair', '/collections/dullness'),
    ('01_hair-problem-2cb5a59f.jpg', 'Frizz &amp; Dryness', '/collections/dryness-frizz'),
    ('04_hair-problem-e1fbbb33.webp', 'Thinning / Hair Loss', '/collections/hair-loss-thinning-hair'),
    ('03_hair-problem-b7e78041.jpg', 'Undefined Curls', '/collections/frizz-lack-of-volume'),
]

LINHAS = [
    ('Prancheta_1-790aea3e.webp', 'Fashion Gold', '/collections/fashion-gold'),
    ('Prancheta_4-26cbd0ec.webp', 'Mirra', '/collections/mirra'),
    ('Prancheta_3-d098ed99.webp', 'Vello', '/collections/vello-1'),
    ('Prancheta_2-188b6fea.webp', 'Cronograma', '/collections/cronograma-hair-care-system'),
]


def copiar_colecoes(destino):
    origem = os.path.join(RAIZ, 'home', 'assets')
    alvo = os.path.join(destino, 'img')
    n = 0
    for f, _, _ in PROBLEMAS + LINHAS:
        o = os.path.join(origem, f)
        if os.path.exists(o):
            shutil.copy(o, os.path.join(alvo, f)); n += 1
    return n


# Qual arranjo a lista de COLECOES usa. Os dois existem e os dois sao
# mantidos; a pagina de componentes mostra os dois lado a lado, rotulados
# v1 e v2. Mesma convencao do blog (ver BLOG_ARRANJO).
COLECOES_ARRANJO = 'cartao'   # 'rotulo' (v1) | 'cartao' (v2)


def lista_colecoes(titulo, itens, posicao, flush=False, arranjo='rotulo',
                   eyebrow=None):
    """`flush` sangra a secao ate a borda da tela — usa quando a grade nao
    deve obedecer o contentor de 1200px. Ela nao mora dentro de `.yb-page`
    nesse caso: e a mesma regra do carrossel de video e do Tolstoy.

    `arranjo` escolhe entre rotulo sobre a foto (v1) e cartao com rodape (v2).
    A escolha e editorial: o rotulo basta quando o nome ja e um destino obvio
    ("Damaged Hair"); o cartao entra quando o nome nao basta ("Consumer" nao
    diz o que ha dentro) e um atalho escrito faz o trabalho."""
    li = ""
    for img, rotulo, href in itens:
        if arranjo == 'cartao':
            li += f"""
        <li><a class="yb-collection yb-collection--card" href="{href}">
          <img src="img/{img}" alt="" loading="lazy">
          <span class="yb-collection__foot">
            <span class="yb-collection__name">{rotulo}</span>
            <span class="yb-collection__cta">Shop Collection
              {ico('arrow-right', 'yb-icon yb-icon--sm')}</span>
          </span>
        </a></li>"""
        else:
            li += f"""
        <li><a class="yb-collection yb-collection--{posicao}" href="{href}">
          <img src="img/{img}" alt="" loading="lazy">
          <span class="yb-collection__label">{rotulo}</span>
        </a></li>"""
    classe = "yb-block yb-block--flush" if flush else "yb-block"
    # Com eyebrow o cabecalho deixa de ser centrado: a categoria acima do
    # titulo so se le como categoria alinhada a esquerda, com o titulo logo
    # abaixo. Centrado, os dois viram um bloco de texto empilhado sem hierarquia.
    if eyebrow:
        cabeca = f"""<div class="yb-section-head">
        <div class="yb-section-head__col">
          <span class="yb-section-head__eyebrow">{eyebrow}</span>
          <h2>{titulo}</h2>
        </div>
      </div>"""
    else:
        cabeca = f"""<div class="yb-section-head yb-section-head--center">
        <h2>{titulo}</h2>
      </div>"""
    return f"""    <section class="{classe}">
      {cabeca}
      <ul class="yb-collections">{li}
      </ul>
    </section>"""


# ==================================================== VÍDEOS DE CREATOR
# O widget Reputon desenha isso hoje. Foi o unico app que deu para trazer para
# o sistema: renderiza no DOM normal, entao o CSS alcanca. Os posters vieram do
# widget em producao; o video so carrega no clique.
VIDEOS = sorted(os.path.basename(f) for f in glob.glob(os.path.join(RAIZ, 'tiktok', 'tt-*')))


def copiar_videos(destino):
    alvo = os.path.join(destino, 'img')
    n = 0
    for f in VIDEOS:
        shutil.copy(os.path.join(RAIZ, 'tiktok', f), os.path.join(alvo, f)); n += 1
    return n


def videos_creator(titulo='Hear Directly from our Ambassadors'):
    itens = "".join(f"""
        <div class="yb-video">
          <img src="img/{f}" alt="" loading="lazy">
          <button class="yb-iconbtn yb-iconbtn--onmedia yb-video__play" type="button" aria-label="Play creator video {i+1}">{ico('play')}</button>
        </div>""" for i, f in enumerate(VIDEOS))
    # `--flush` e irma do .yb-page, nao filha: a pista corre de borda a borda
    # da tela. Cortada no contentor de 1200 ela ficava com um vao morto de cada
    # lado enquanto o proprio conteudo dela e rolagem horizontal — a faixa
    # anunciava que havia mais para o lado e ao mesmo tempo parava antes da
    # borda. O titulo continua alinhado ao resto da home pelo recuo do gutter.
    return f"""  <section class="yb-block yb-block--flush">
      <div class="yb-section-head yb-section-head--center">
        <h2>{titulo}</h2>
      </div>
      <div class="yb-track yb-videos">{itens}
      </div>
    </section>"""


# ==================================================== CITAÇÃO INSTITUCIONAL
# Fala da co-fundadora, com retrato e o link para a historia da marca.
CITACAO = {
    'texto': '&ldquo;I believe every woman deserves to transform her hair, her '
             'confidence, and her future with the power of beauty in her hands.&rdquo;',
    'autor': 'Sauana Alves, Co-Founder of Ybera Paris',
    'img': '02sauana-2896ea7c.webp',
    'acao': ('Our Story', '/pages/our-story'),
}


def copiar_citacao(destino):
    o = os.path.join(RAIZ, 'home', 'assets', CITACAO['img'])
    if os.path.exists(o):
        shutil.copy(o, os.path.join(destino, 'img', CITACAO['img'])); return 1
    return 0


def citacao():
    rotulo, href = CITACAO['acao']
    return f"""    <section class="yb-block">
      <div class="yb-quote">
        <div class="yb-quote__body">
          <blockquote class="yb-quote__text">{CITACAO['texto']}</blockquote>
          <cite class="yb-quote__author">{CITACAO['autor']}</cite>
          <div class="yb-quote__action">
            <!-- `--secondary`: "Our Story" nao compra nada. O magenta que a loja
                 reserva para "Add to cart" e "Checkout", gasto num link
                 institucional, ensina que a cor nao quer dizer nada. Mesma
                 correcao feita nos cartoes do mega-menu. -->
            <a class="yb-btn yb-btn--secondary" href="{href}">{rotulo}</a>
          </div>
        </div>
        <div class="yb-quote__media">
          <img src="img/{CITACAO['img']}" alt="Sauana Alves, co-fundadora da Ybera Paris" loading="lazy">
        </div>
      </div>
    </section>"""


# A faixa de autoridade. Texto transcrito da propria loja: "Driven by
# Brazilian heritage and professional expertise" vem do About Us da ybera.us, e
# "Ybera Professional Paris" e como a marca se assina no rodape. Nada aqui foi
# inventado — e o unico bloco da home que so afirma, e afirmacao sem fonte e o
# que este prototipo mais evita.
MANIFESTO = {
    'titulo': 'Born in the salon. Made for every home.',
    'texto': ('Driven by Brazilian heritage and professional expertise, we create '
              'transformative hair care that bridges the gap between expert stylist '
              'results and daily self-care.'),
    'marca': 'YBERA',
    'assinatura': 'Professional Paris',
}


def autoridade():
    """Frase de marca sobre fundo escuro. Sem foto, sem botao, sem link.

    Nao leva a lugar nenhum de proposito: e o unico bloco da home que fala sem
    cobrar. Pendurar um "Shop all" aqui ensinaria que toda faixa escura e mais
    uma venda."""
    return f"""  <section class="yb-manifesto">
    <div class="yb-manifesto__inner">
      <h2 class="yb-manifesto__title">{MANIFESTO['titulo']}</h2>
      <p class="yb-manifesto__text">{MANIFESTO['texto']}</p>
      <hr class="yb-manifesto__rule">
      <span class="yb-manifesto__brand">{MANIFESTO['marca']}</span>
      <p class="yb-manifesto__sub">{MANIFESTO['assinatura']}</p>
    </div>
  </section>"""


# ==================================================== BLOG (Fashion Gold)
# "The Gold Standard: Behind the Shine". Um post em destaque e dois ao lado —
# mesma anatomia, disposicao diferente, por isso e modificador e nao componente
# separado. Titulos, resumos, imagens e links vindos da home de producao.
POSTS = json.load(open(os.path.join(RAIZ, 'posts.json'), encoding='utf-8'))


def copiar_posts(destino):
    origem = os.path.join(RAIZ, 'home', 'assets')
    alvo = os.path.join(destino, 'img')
    n = 0
    for pst in POSTS:
        f = os.path.basename(pst['img'])
        o = os.path.join(origem, f)
        if os.path.exists(o):
            shutil.copy(o, os.path.join(alvo, f)); pst['arquivo'] = f; n += 1
    return n


def resumo_limpo(t):
    """O Shopify trunca o resumo em N caracteres e cola "...": chegava
    "…different. Fi..." e "…timelines, ha...". Tira a reticencia, descarta a
    palavra partida e a pontuacao pendurada, e so repoe a reticencia se a
    frase nao fechou sozinha. O clamp do CSS faz o resto."""
    t = re.sub(r'\s*(\.\.\.|…)\s*$', '', t.strip())
    partes = t.split()
    if partes and not re.search(r'[.!?]$', partes[-1]):
        partes.pop()                       # a palavra partida
    t = ' '.join(partes).rstrip(',;:—–- ')
    return t if re.search(r'[.!?]$', t) else t + '…'


def _post(pst, destaque=False):
    mod = ' yb-post--featured' if destaque else ''
    # O titulo e o link, esticado sobre o artigo inteiro pelo CSS. "Continue
    # reading" fica como reforco visual (<span>), nao como segundo link — tres
    # "Continue reading" iguais eram tres links identicos para quem ouve.
    return f"""<article class="yb-post{mod}">
          <div class="yb-post__media"><img src="img/{pst.get('arquivo','')}" alt="" loading="lazy"></div>
          <div class="yb-post__body">
            <h3 class="yb-post__title"><a href="{pst['href']}">{pst['titulo']}</a></h3>
            <p class="yb-post__excerpt">{resumo_limpo(pst['resumo'])}</p>
            <span class="yb-link yb-link--reinforce" aria-hidden="true">Continue reading {ico('arrow-right','yb-icon yb-icon--sm')}</span>
          </div>
        </article>"""


def _post_empilhado(pst):
    """O cartao do trio: foto, titulo, e o reforco de leitura. Sem resumo.

    O titulo continua sendo o unico link, esticado sobre o cartao pelo mesmo
    `::after` do post comum — "Read more" e <span>, nao um segundo link."""
    return f"""<article class="yb-post yb-post--stacked">
          <div class="yb-post__media"><img src="img/{pst.get('arquivo','')}" alt="" loading="lazy"></div>
          <div class="yb-post__body">
            <h3 class="yb-post__title"><a href="{pst['href']}">{pst['titulo']}</a></h3>
            <span class="yb-link yb-link--reinforce" aria-hidden="true">Read more {ico('arrow-right','yb-icon yb-icon--sm')}</span>
          </div>
        </article>"""


def blog_trio():
    """v2 do blog: tres artigos de mesmo peso, com eyebrow de categoria.

    Nao substitui `blog()`. A escolha entre os dois e editorial: o destaque
    diz "leia ESTE primeiro"; o trio diz "os tres valem igual". As duas ficam
    lado a lado na pagina de padroes, rotuladas v1 e v2."""
    if not POSTS: return ''
    cartoes = "\n        ".join(_post_empilhado(x) for x in POSTS[:3])
    return f"""    <section class="yb-block">
      <div class="yb-section-head">
        <div class="yb-section-head__col">
          <span class="yb-section-head__eyebrow">Expert Advice</span>
          <h2>Professional Secrets</h2>
        </div>
        <a class="yb-link" href="/blogs/haircare">See all {ico('chevron-right')}</a>
      </div>
      <div class="yb-posts yb-posts--trio">
        {cartoes}
      </div>
    </section>"""


# Qual arranjo o prototipo mostra. As DUAS existem e as duas sao mantidas —
# trocar aqui troca a home inteira, e a pagina de padroes segue mostrando as
# duas lado a lado, rotuladas v1 e v2. Sem esta linha, a versao nao escolhida
# viraria funcao sem chamador e apodreceria em silencio no primeiro refactor.
BLOG_ARRANJO = 'trio'   # 'destaque' (v1) | 'trio' (v2)


def blog():
    return blog_trio() if BLOG_ARRANJO == 'trio' else blog_destaque()


def blog_destaque():
    if not POSTS: return ''
    destaque = _post(POSTS[0], True)
    outros = "\n        ".join(_post(x) for x in POSTS[1:3])
    # Sem --center: o conteudo abaixo (destaque + dois posts) e assimetrico,
    # nao centralizado, e --center tratava titulo+link como par, empurrando o
    # titulo 218px para dentro sem alinhar com nada. Mesma receita do Best
    # Sellers: titulo na borda esquerda do grid, link na borda direita.
    return f"""    <section class="yb-block">
      <div class="yb-section-head">
        <h2>The Gold Standard: Behind the Shine</h2>
        <a class="yb-link" href="/blogs/haircare">Read all articles {ico('chevron-right')}</a>
      </div>
      <div class="yb-posts">
        {destaque}
        <div class="yb-posts__list">
        {outros}
        </div>
      </div>
    </section>"""


# ============================== AMBASSADORS · SELOS · FAIXA DE LOGOS
# Tres secoes reais da home, na ordem em que aparecem la.
#
# "Hear Directly from our Ambassadors" e o widget Reputon/TikTok: mesmo caso do
# Tolstoy — app de terceiro que monta por JS. Fica como esta, e o titulo acima
# dele e nosso.
SELOS = [
    ('cruelty-free', 'Cruelty Free'),
    ('vegan', 'Vegan'),
    ('paraben-free', 'Paraben Free'),
    ('sulfate-free', 'Sulfate Free'),
    ('formaldehyde-free', 'Formaldehyde free'),
]

LOGOS = ['01-685f018e.png', '04-a3443f9d.png', '05-cb480667.png', '06-4469d0ca.png',
         '08-fee0d272.png', '09-152e7fa7.png',
         '10_94d094d5-65d1-4154-8d9b-125c04f30b63-22def8ab.png']


def copiar_logos(destino):
    origem = os.path.join(RAIZ, 'home', 'assets')
    alvo = os.path.join(destino, 'img')
    n = 0
    for f in LOGOS:
        o = os.path.join(origem, f)
        if os.path.exists(o):
            shutil.copy(o, os.path.join(alvo, f)); n += 1
    return n


def selos():
    itens = "".join(f"""
      <div class="yb-seal">
        <span class="yb-seal__mark">{ico(n, 'yb-icon')}</span>
        <span class="yb-seal__label">{t}</span>
      </div>""" for n, t in SELOS)
    return f"""  <section class="yb-seals" aria-label="Product guarantees">{itens}
  </section>"""


def faixa_logos():
    imgs = "".join(f"""
      <img src="img/{f}" alt="" loading="lazy">""" for f in LOGOS)
    return f"""  <section class="yb-logobar" aria-label="Ybera product lines">
    <div class="yb-track yb-track--row yb-logobar__track">{imgs}
    </div>
  </section>"""


# ==================================================== VÍDEO SHOPPABLE (TOLSTOY)
# Nao e HTML da loja: e um web component do app Tolstoy, que monta tudo por JS
# a partir do CDN dele. Fica aqui exatamente como esta em producao — de
# proposito. O card de produto que ele desenha nao segue o design system (borda,
# raio e tipografia proprios), e isso e visivel na pagina: apps com shadow DOM
# estao fora do alcance de qualquer CSS nosso.
#
# Requer internet. Sem rede, a secao fica vazia — que e tambem a verdade sobre
# a dependencia.
def widget_tolstoy():
    return """  <section class="yb-block yb-block--flush tolstoy">
      <div class="shopify-block shopify-app-block tolstoy-builder-block">
        <tolstoy-widget data-tolstoy-widget-id="01KZY6XQ2FYCGN7R7C3QJ1EVE2"
                        data-product-id="" data-tags=""></tolstoy-widget>
        <script src="https://ai-widgets.gotolstoy.com/eb29e70e-661d-488d-9137-336b65a16c17/01KZY6XQ2FYCGN7R7C3QJ1EVE2/latest/dist/widget.iife.js" defer></script>
    </div>
  </section>"""


# ==================================================== HERO DA HOME v2
# A v1 abre com a ARTE DE CAMPANHA: um JPEG onde "SEM DESCULPAS PARA TER CABELO
# DE SALAO EM CASA" e "GARANTIR DESCONTO" estao desenhados dentro do pixel, em
# portugues. Funciona no Brasil, onde a peca e produzida semanalmente pelo
# marketing e trocada inteira.
#
# Para a loja americana isso custa caro e o custo e invisivel: texto dentro de
# imagem nao e lido por busca, nao e traduzido, nao e lido em voz alta, nao
# reflui no celular e nao pode ser testado em A/B sem refazer a arte. E a
# promessa chega em portugues para quem le ingles.
#
# A v2 troca por `.yb-mediabanner`: mesma foto, texto em HTML. O componente ja
# existe e ja resolve o veu medido por cima da foto.
# Tres slides, tres destinos DIFERENTES. Carrossel com tres variacoes da
# mesma promessa e so tempo de espera: se os tres levam a "best sellers", o
# segundo e o terceiro nao existem para quem chega.
# As afirmacoes ja estao no site — formaldehyde-free, color-safe, o quiz de
# analise — nenhuma foi inventada para preencher slide.
HERO_V2 = [
    {'img': 'How_Long_Does_Keratin_Treatment_Last-5b7be09e.webp',
     'eyebrow': 'Salon keratin, at home',
     'titulo': 'Straight, glossy hair that survives humidity.',
     'texto': 'Brazilian keratin care, formaldehyde-free and safe on color-treated hair.',
     'cta': ('Shop best sellers', '/collections/best-sellers')},
    {'img': 'Does_Keratin_Treatment_Damage_Hair-9540a201.webp',
     'eyebrow': 'Damaged hair',
     'titulo': 'Repair the fiber, not just the surface.',
     'texto': 'Reconstruction, nutrition and hydration — one step for each layer.',
     'cta': ('Shop by concern', '/collections/damaged-hair')},
    {'img': 'Is_Keratin_Good_For_Hair-b3d5999d.webp',
     'eyebrow': 'AI Hair Analysis',
     'titulo': 'Not sure where to start?',
     'texto': 'Answer a few questions and we match your hair to the right line.',
     'cta': ('Start analysis', '/pages/ai-hair-routine-quiz')},
]


def hero_v2():
    """Trilho de banners do topo — o `.yb-track` do sistema, um slide por tela.

    Sem `.yb-block`: o respiro vertical dele abriria 64px de branco entre o
    cabecalho e o hero, e hero de loja encosta no cabecalho. O respiro ABAIXO
    vem do bloco seguinte, que ja tem o seu.

    O primeiro slide carrega `fetchpriority="high"` e os outros `lazy`: os dois
    de tras nao estao na tela na abertura e disputariam banda com a unica
    imagem que a pessoa ve."""
    slides = ""
    for i, h in enumerate(HERO_V2):
        rot, href = h['cta']
        prio = 'fetchpriority="high"' if i == 0 else 'loading="lazy"'
        titulo = 'h1' if i == 0 else 'h2'
        slides += f"""
      <a class="yb-mediabanner yb-mediabanner--bleed" href="{href}">
        <img src="img/{h['img']}" alt="" {prio}>
        <div class="yb-mediabanner__body">
          <span class="yb-mediabanner__eyebrow">{h['eyebrow']}</span>
          <{titulo} class="yb-mediabanner__title">{h['titulo']}</{titulo}>
          <p class="yb-mediabanner__text">{h['texto']}</p>
          <span class="yb-btn yb-btn--primary">{rot}</span>
        </div>
      </a>"""
    return f"""  <section class="yb-hero" aria-roledescription="carousel" aria-label="Highlights">
    <div class="yb-track yb-track--hero" id="hero-track">{slides}
    </div>
    <div class="yb-track__nav" data-yb-track-nav="hero-track" hidden>
      <button type="button" class="yb-iconbtn" data-yb-track-step="prev" aria-label="Previous highlight">{ico('chevron-left')}</button>
      <button type="button" class="yb-iconbtn" data-yb-track-step="next" aria-label="Next highlight">{ico('chevron-right')}</button>
    </div>
  </section>"""


# ============================================================ HOME
def montar_home(destino):
    prods = dados.catalogo(os.path.join(destino, 'img'), 8)
    n_banner = copiar_banners(destino) + copiar_colecoes(destino) + copiar_reviews(destino) + copiar_logos(destino) + copiar_posts(destino) + copiar_citacao(destino) + copiar_videos(destino)
    print(f"  imagens de produção copiadas: {n_banner}")
    for i, p in enumerate(prods):
        p['destaque'] = i in (0, 3)
        # Contagem por produto saiu. Eram oito numeros escolhidos a dedo, um
        # por cartao, girando com `i % 8` — cada cartao da home anunciava um
        # volume de prova social que nao existe em lugar nenhum. Sem eles todo
        # cartao cai no agregado real de AVALIACAO, que e o mesmo para todos
        # justamente porque a nota por produto ainda depende do token do
        # Judge.me. Um numero igual e verdadeiro em vez de oito diferentes e
        # inventados.
    heroi = prods[2]

    # sem selo: a secao inteira e "Best Sellers", o selo repetiria o titulo
    #
    # O primeiro item nao e um cartao de catalogo: e o cartao de oferta, do
    # mesmo tamanho dos outros. O produto em oferta e o da arte de campanha,
    # nao o primeiro da lista: e dele que existe desconto publicado.
    em_oferta = next((x for x in prods if x['img'] == OFERTA['img']), prods[0])
    vizinhos = um_por_linha(prods, 3, excluir=[em_oferta])
    cards = "\n".join([cartao_oferta(em_oferta, destino)] +
                      [card(p, flag=False) for p in vizinhos])


    corpo = f"""{header(promo=heroi)}

<main>
  {banner()}

  <div class="yb-page">

    <section class="yb-block">
      <div class="yb-section-head">
        <h2>Best Sellers</h2>
        <a class="yb-link" href="/collections/best-sellers">Shop all best sellers {ico('chevron-right')}</a>
      </div>
      <div class="yb-grid">
{cards}
      </div>
    </section>

{lista_colecoes('What&rsquo;s Standing Between You and Great Hair?', PROBLEMAS, 'bottom')}
  </div>

{quiz()}

{widget_tolstoy()}

{lista_colecoes('Shop by Collection', LINHAS, 'bottom', flush=True,
                arranjo=COLECOES_ARRANJO, eyebrow='Tailored Formulas')}

  <div class="yb-page">
{carrossel_reviews()}
  </div>

{videos_creator()}

{selos()}

{autoridade()}

{faixa_logos()}

  <div class="yb-page">
{blog()}

{citacao()}
  </div>



</main>

{rodape()}
{gaveta(prods)}
{busca(prods)}"""
    return CABECA.format(v=versao(), css_pagina=CSS_HOME, titulo="Ybera Paris USA | Keratin care that survives humidity") + corpo + RODAPE.replace("{v}", versao())


def montar_404(destino):
    """A pagina que existe para quando a pagina nao existe.

    Uma loja de 116 produtos que rotaciona campanha e esgota SKU produz link
    morto o tempo todo: colecao antiga, produto retirado, endereco digitado
    errado, link de influencer para um kit que saiu de linha. Ate aqui esse
    caminho terminava no 404 cru do tema — a unica tela da loja que nao era
    nossa, e justamente a que a pessoa alcanca ja frustrada.

    Duas decisoes:

    1. O texto NAO afirma o que aconteceu. "Este produto foi removido" seria
       chute: a mesma URL responde 404 para produto retirado, para colecao
       renomeada e para erro de digitacao, e a pagina nao sabe qual dos tres
       foi. Ela diz o que sabe — que aqui nao ha nada — e o que fazer.

    2. Ela vende. Beco sem saida em loja e visita perdida; a fileira de mais
       vendidos abaixo da saida e a convencao americana e custa uma linha,
       porque o cartao de produto ja existe.
    """
    prods = dados.catalogo(os.path.join(destino, 'img'), 8)
    vitrine = um_por_linha(prods, 4)
    corpo = f"""{header(promo=vitrine[0])}

<main class="yb-page">
  <div class="yb-block">
    <div class="yb-empty">
      <span class="yb-empty__icone">{ico('search')}</span>
      <h1 class="yb-empty__title">This page is not here</h1>
      <p class="yb-empty__text">The address may be wrong, or what used to be here has
      since left the shelf. Neither is your fault.</p>
      <div class="yb-empty__acoes">
        <a class="yb-btn yb-btn--primary" href="index.html">Back to home</a>
        <button class="yb-btn yb-btn--secondary" type="button" data-yb-open="site-search">
          {ico('search','yb-icon yb-icon--sm')} Search the store</button>
      </div>
    </div>
  </div>

  <section class="yb-block">
    <div class="yb-section-head"><h2>Best sellers</h2></div>
    <div class="yb-grid">
{chr(10).join(card(r, vendor=False) for r in vitrine)}
    </div>
  </section>
</main>

{rodape()}
{gaveta(vitrine)}
{busca(vitrine)}"""
    return (CABECA.format(v=versao(), css_pagina=CSS_HOME, titulo="Page not found – Ybera USA")
            + corpo + RODAPE.replace("{v}", versao()))



# ============================================================ PDP

# ============================================ SECOES DA COLUNA DA PDP
# A loja passou a contar a historia do produto ABAIXO do bloco de compra, na
# mesma coluna — nao em faixas de largura cheia. Sete secoes la; cinco delas
# tem componente nosso exato, e sao estas. As duas de fora estao no README
# da captura, com o motivo.
# Imagens que a captura nao entrega como asset separado. Ver _captura/pdp-extra/README.md.
PDP_EXTRA = ['22_1-d5c4b8.webp', '29-527a32.webp', 'FG_Banner_01-61a3d2.webp']


def copiar_pdp_extra(destino):
    alvo = os.path.join(destino, 'img')
    n = 0
    for f in PDP_EXTRA:
        o = os.path.join(RAIZ, 'pdp-extra', f)
        if os.path.exists(o):
            shutil.copy(o, os.path.join(alvo, f)); n += 1
    return n


def pdp_historia():
    return """
      <!-- Destaques em midia: duas fotos altas com a afirmacao por cima.
           `yb-mediabanner` e o componente para exatamente isto. -->
      <!-- <div>, nao <a>: nao ha destino. Antes eram links para "#" com cara
           e cursor de link. E os olhos-de-texto eram numero inventado ("98%
           5-star reviews") e selo repetido ("Best seller", terceiro na pagina);
           agora dizem o que a foto mostra. -->
      <div class="pdp__duo">
        <div class="yb-mediabanner">
          <img src="img/22_1-d5c4b8.webp" alt="" loading="lazy">
          <div class="yb-mediabanner__body">
            <span class="yb-mediabanner__eyebrow">Step 1 · Hydration</span>
            <h2 class="yb-mediabanner__title">Water back into the fiber.</h2>
          </div>
        </div>
        <div class="yb-mediabanner">
          <img src="img/29-527a32.webp" alt="" loading="lazy">
          <div class="yb-mediabanner__body">
            <span class="yb-mediabanner__eyebrow">Damp or dry</span>
            <h2 class="yb-mediabanner__title">Use it your way.</h2>
          </div>
        </div>
      </div>

      <!-- Esta peca entra INTEIRA, sem sobreposicao. A imagem ja e um banner
           fechado: tem titulo proprio ("Authentic Brazilian Keratin"), corpo de
           texto e o lockup dos produtos. Escrever por cima punha duas
           tipografias disputando o mesmo espaco, e nao ha veu que conserte isso
           — escurecer mais so esconderia o texto DELES embaixo do nosso, o que
           parece disfarce. O `alt` carrega a mensagem, porque agora e a imagem
           que a carrega. Leva a colecao da linha: e um anuncio da Fashion Gold. -->
      <a class="yb-mediabanner" href="/collections/fashion-gold">
        <img src="img/FG_Banner_01-61a3d2.webp" loading="lazy"
             alt="Authentic Brazilian keratin — treatment for salon-quality results, formaldehyde-free formula">
      </a>

      <a class="yb-mediabanner" href="/collections/cronograma-hair-care-system">
        <img src="img/KitCuidadosProfundos-YberaFashionGold_ab-9c59c4.webp" alt="" loading="lazy">
        <div class="yb-mediabanner__body">
          <span class="yb-mediabanner__eyebrow">Cronograma system</span>
          <h2 class="yb-mediabanner__title">Deep repair &amp; shine</h2>
          <p class="yb-mediabanner__text">A three-step ritual for dry, dull, porous
          or chemically damaged hair.</p>
        </div>
      </a>

      <!-- Os selos de beneficio sairam daqui: eram a terceira lista dizendo o
           que o produto faz (depois das pills do bloco de compra e da fileira
           de confianca). Uma lista de beneficio, no bloco de compra. -->

      <!-- Grade de resultado. Antes reaproveitava as fotos de PROBLEMA da home
           ("Damaged Hair", "Frizz") com legenda de resultado por cima — "Radiant
           shine" sobre cabelo com frizz. Agora sao as duas fotos de resultado
           que existem na captura (as do blog), e cada cartao leva ao artigo de
           onde a foto veio. Dois cartoes honestos valem mais que quatro com um
           errado. -->
      <ul class="pdp__prova">""" + "".join(f"""
        <li><a class="yb-collection yb-collection--center" href="{pst['href']}">
          <img src="img/{pst.get('arquivo','')}" alt="" loading="lazy">
          <span class="yb-collection__label">{rotulo}</span></a></li>""" for pst, rotulo in zip(POSTS[:2], ('A smoother finish', 'Softness you can feel'))) + """
      </ul>
"""



def resumo_curto(texto, limite=220):
    """Primeiras frases inteiras ate `limite` caracteres. A descricao completa
    (532 caracteres, oito linhas) entrava entre o preco e o botao de compra E
    repetia no acordeao logo abaixo — o botao caia fora da primeira tela em
    1440x900 (y=941). Aqui fica o gancho; o texto inteiro mora no acordeao."""
    frases = re.split(r'(?<=[.!?])\s+', texto.strip())
    out = ''
    for f in frases:
        if out and len(out) + 1 + len(f) > limite: break
        out = (out + ' ' + f).strip()
        if len(out) >= limite: break
    return out or texto[:limite]


def linha_do(titulo):
    """Colecao da linha, pelo nome no titulo. O catalogo nao preenche
    product_type nem tags, entao e o titulo que sabe de que linha o produto e."""
    t = titulo.lower()
    for chave, nome, href in (('fashion gold', 'Fashion Gold', '/collections/fashion-gold'),
                              ('cronograma', 'Cronograma', '/collections/cronograma-hair-care-system'),
                              ('100timetros', '100Timetros', '/collections/100timetros'),
                              ('terra coco', 'Terra Coco', '/collections/terra-coco'),
                              ('vello', 'Vello', '/collections/vello-1'),
                              ('mirra', 'Mirra', '/collections/mirra')):
        if chave in t: return nome, href
    return 'All Products', '/collections'


def montar_pdp(destino, handle='deep-care-kit-ybera-fashion-gold', variantes=None):
    p = dados.produto(handle, os.path.join(destino, 'img'))
    # `variantes` so e passado pela tela-prova da variante (ver VARIANTE_FORJADA).
    if variantes:
        p['variantes'] = variantes
    # Com variante, quem manda no preco e no estoque e a variante ESCOLHIDA, nao
    # o produto: era o produto que mandava, e por isso o preco do topo ficava
    # parado enquanto o cartao selecionado dizia outro numero.
    v0 = p['variantes'][0] if p['variantes'] else None
    preco_base = v0['preco'] if v0 else p['preco']
    disp_base = v0['disponivel'] if v0 else p['disponivel']
    copiar_pdp_extra(destino)
    copiar_posts(destino)   # a grade de resultado usa as fotos do blog

    ATIVO = ' data-active="true"'
    titulo_alt = p['titulo'][:60]
    slides = "".join(
        '\n        <div class="yb-gallery__slide"' + (ATIVO if i == 0 else '') + '>'
        + f'<img src="img/{im}" alt="{titulo_alt} — image {i+1}"></div>'
        for i, im in enumerate(p['imagens']))
    thumbs = "".join(
        f'\n          <input type="radio" name="gal" id="g{i}"' + (' checked' if i == 0 else '') + '>'
        + f'<label for="g{i}" title="Image {i+1}"><img src="img/{im}" alt=""></label>'
        for i, im in enumerate(p['imagens']))

    comp = f'<s class="yb-price__was">{p["compare"]}</s>' if p.get('compare') else ''
    # Fechado por padrao, os cinco: "Description" ja tem o gancho de
    # resumo_curto() acima do botao — aberto, a pessoa lia a mesma frase duas
    # vezes sem clicar em nada, e o "gancho" que existe pra evitar isso virava
    # so um adiantamento do que ja estava visivel dois paragrafos abaixo.
    # O que vem na caixa e a PRIMEIRA secao do acordeao, antes de "Description".
    # Ele morava num quadro solto acima, entre a descricao curta e os
    # beneficios — mais uma caixa numa coluna que ja tinha selo, nota, preco,
    # descricao, dois beneficios e o botao. A pergunta que ele responde ("o que
    # exatamente eu recebo?") e do mesmo tipo das outras cinco do acordeao, e
    # em cima ela roubava o lugar de quem responde "por que comprar".
    #
    # Primeira, e nao no meio: das seis, e a unica que descreve o OBJETO. As
    # outras descrevem uso, ciencia, formula e entrega.
    #
    # Fechada como as outras cinco. Uma aberta no meio de cinco fechadas nao le
    # como enfase, le como sobra de marcacao.
    secoes = []
    if CONTEUDO_KIT.get(handle):
        kit = CONTEUDO_KIT[handle]
        linhas = ''.join(f'''
            <li>
              <span class="yb-buybox__kit-nome"><b>{nome}</b><small>{camada}</small></span>
              <span class="yb-buybox__kit-peso">{peso}</span>
            </li>''' for nome, camada, peso in kit['itens'])
        secoes.append(('What&rsquo;s included', f'''<ul class="yb-buybox__kit">{linhas}
          </ul>'''))

    # Corpo em HTML: a lista do kit e uma <ul>, e as outras cinco sao prosa —
    # embrulhar tudo em <p> aqui dentro poria uma lista dentro de um paragrafo.
    secoes += [(t, f'<p>{c}</p>') for t, c in [
        ('Description', p['descricao'] or 'Professional keratin treatment kit.'),
        ('How to use', 'Wash with a clarifying shampoo and towel-dry. Apply from mid-length to ends, avoiding the scalp. Leave for 20 minutes, then rinse and blow-dry.'),
        ('Science', 'Each of the three masks acts on a different layer of the hair fiber. The cuticle mask seals the outer scales, the cortex mask rebuilds the protein bonds that chemical services break, and the medulla mask restores the water the fiber lost.'),
        ('Ingredients', 'Hydrolyzed keratin, D-panthenol, argan oil, shea butter and vegetable glycerin. Formaldehyde-free and safe for color-treated hair.'),
        ('Shipping &amp; returns', 'Free standard shipping on orders over $50. Returns accepted within 30 days of delivery, unopened.')]]

    acordeao = "".join(f"""
        <details><summary>{t}</summary>
          <div class="yb-accordion__body">{c}</div></details>""" for t, c in secoes)

    # Related Products existe na PDP de producao (product-recommendations do
    # Shopify, carregado por JS — por isso nao aparecia na captura estatica).
    # Mesma regra da vitrine da home: um por linha. Sem ela a fileira abria com
    # "Mirracura shampoo" e "Mirracura mask" lado a lado — mesmo frasco, mesma
    # foto, e a PDP parecia estar recomendando o mesmo produto duas vezes.
    relacionados = um_por_linha(
        [x for x in dados.catalogo(os.path.join(destino, 'img'), 8)
         if x['titulo'] != p['titulo']], 4)

    linha_nome, linha_href = linha_do(p['titulo'])
    # A fileira de selos e MOVIDA PELO DADO, nao escrita a mao. Cada selo so
    # existe se o produto tiver o campo:
    #   disponivel  -> In stock / Sold out (sempre ha)
    #   brinde      -> "Free 1L Shampoo" etc. (3 dos 20 produtos)
    #   compare     -> "Save X%"  (ZERO produtos hoje: a loja nao preenche
    #                  compare_at_price em nenhum dos 115. O ramo existe para o
    #                  dia em que preencher, e nao para inventar desconto.)
    selos_pdp = ['<span class="yb-badge yb-badge--success" data-yb-selo>In stock</span>' if disp_base
                 else '<span class="yb-badge yb-badge--danger" data-yb-selo>Sold out</span>']
    if p.get('brinde'):
        selos_pdp.append(f'<span class="yb-badge yb-badge--accent">{p["brinde"]}</span>')
    if p.get('compare'):
        try:
            atual = float(p['preco'].lstrip('$')); antes = float(p['compare'].lstrip('$'))
            if antes > atual:
                selos_pdp.append(
                    f'<span class="yb-badge yb-badge--sale">Save {round((1 - atual / antes) * 100)}%</span>')
        except ValueError:
            pass
    estoque = "".join(selos_pdp)
    # Seletor de variante so quando ha escolha. Antes eram tres cartoes fixos
    # no gerador (250g/$34.90, 1kg/$119.90) para um produto que tem UMA
    # variante — protótipo lido como verdade.
    variantes = ''
    if p['variantes']:
        # O esgotado deixou de ser `disabled`. Desabilitado ele ficava visivel
        # — o que ja era melhor do que sumir — mas era impossivel CHEGAR nele,
        # e chegar nele e o unico caminho para o aviso de volta ao estoque.
        # Selecionavel, ele mostra o proprio preco, o proprio "Sold out" e o
        # campo de aviso. E o que a loja da Shopify faz por padrao.
        cartoes = ''.join(f"""
          <input type="radio" name="tam" id="tam{i}"{' checked' if i == 0 else ''}
                 data-preco="{v['preco']}"{'' if v['disponivel'] else ' data-yb-esgotado'} data-foto="{v.get('foto', min(i, len(p['imagens'])-1))}">
          <label for="tam{i}">
            <img src="img/{p['imagens'][v.get('foto', min(i, len(p['imagens'])-1))]}" alt="" loading="lazy">
            <span class="yb-swatches__name">{v['titulo']}</span>
            <span class="yb-swatches__price">{v['preco']}</span>
            <span class="yb-swatches__stock">{'In stock' if v['disponivel'] else 'Sold out'}</span>
          </label>""" for i, v in enumerate(p['variantes']))
        variantes = f"""
      <div class="yb-buybox__group">
        <p class="yb-buybox__label" id="rot-tam">Size: <b data-yb-variante-eco>{p['variantes'][0]['titulo']}</b></p>
        <div class="yb-swatches yb-swatches--cards" role="radiogroup" aria-labelledby="rot-tam" data-yb-variante>{cartoes}
        </div>
      </div>"""

    # ------------------------------------------------------------------
    # A ZONA DE COMPRA TEM DOIS ESTADOS, e os dois moram no HTML.
    #
    # Com estoque: quantidade + "Add to cart - $X".
    # Sem estoque: o botao FICA, inerte, dizendo o que ele e — e ali que a
    # pessoa procura a resposta, e sumir apagaria a resposta. A quantidade
    # SAI: escolher "3" de algo que nao existe nao e acao impedida, e pergunta
    # sem sentido. E a acao viva passa a ser o aviso de volta, o unico pedido
    # que a loja ainda consegue atender — por isso ele e o primario (o botao
    # morto ja nasce cinza pelo `[disabled]`, entao nao ha dois brigando).
    #
    # 41 dos 116 produtos da loja estao esgotados agora (products.json, com
    # `available` falso em todas as variantes — 35% do catalogo). Ate aqui a
    # PDP tratava isso como rotulo: o selo dizia "Sold out" e, tres linhas
    # abaixo, o botao seguia oferecendo "Add to cart - $49.90".
    #
    # POR QUE OS DOIS NO HTML, e nao so o certo: com variante, o estado muda
    # no clique, sem ida ao servidor. O servidor decide qual dos dois NASCE
    # visivel — entao a pagina ja esta correta antes de qualquer JS rodar, e
    # continua correta se ele nunca rodar.
    #
    # A ancora da barra fixa e a ZONA, nao um dos botoes. Ancorada no botao, a
    # barra subia enquanto o campo de aviso ainda estava na tela: a mesma acao
    # duas vezes, a 70px de distancia. Ancorada na zona, ela so entra quando
    # nao ha mais nada para clicar ali em cima — em qualquer dos estados.
    #
    # Composicao, nao peca nova: `.yb-field--row` ja e o campo-com-acao do
    # cupom da sacola. Entrou uma classe de layout, `.yb-buybox__compra`, que
    # so repete a coluna e o `gap` do proprio `.yb-buybox`: o embrulho que a
    # ancora estavel exige.
    nome_curto = p['titulo'][:40]
    oc = ' hidden'
    compra = f"""      <div class="yb-buybox__compra" data-yb-compra data-yb-buybar-anchor>
        <div class="yb-buybox__actions">
          <div class="yb-stepper" data-yb-stepper{'' if disp_base else oc}>
            <button type="button" data-yb-step="down" aria-label="Decrease quantity">{ico('minus','yb-icon yb-icon--sm')}</button>
            <input type="number" value="1" min="1" max="{QTD_MAX}" aria-label="Quantity">
            <button type="button" data-yb-step="up" aria-label="Increase quantity">{ico('plus','yb-icon yb-icon--sm')}</button>
          </div>
          <button class="yb-btn yb-btn--primary" type="button" data-yb-comprar{'' if disp_base else ' disabled'}
                  data-rotulo="Add to cart — " data-rotulo-esgotado="Sold out"
                  data-toast-titulo="Added to cart" data-toast-texto="{nome_curto}"
                  >{f'Add to cart — {preco_base}' if disp_base else 'Sold out'}</button>
        </div>
        <form class="yb-field yb-field--row" data-yb-avisar{oc if disp_base else ''}
              onsubmit="Ybera.toast({{title:'We will email you',text:'{nome_curto}',variant:'success'}}); return false">
          <div class="yb-field__box">
            <input class="yb-input" id="avisar" type="email" placeholder=" " autocomplete="email" required>
            <label class="yb-field__label" for="avisar">Your best email</label>
          </div>
          <button class="yb-btn yb-btn--primary" type="submit">Notify me</button>
          <p class="yb-field__hint">We email you once it is back in stock. Nothing else.</p>
        </form>
      </div>
"""
    barra = f"""<div class="yb-buybar" data-yb-buybar hidden>
  <span class="yb-buybar__info">
    <span class="yb-buybar__name">{p['titulo']}</span>
    <span class="yb-buybar__price"><b class="yb-price__now" data-yb-preco>{preco_base}</b></span>
  </span>
  <button class="yb-btn yb-btn--primary" type="button" data-yb-barra-comprar data-yb-comprar{'' if disp_base else oc}
          data-toast-titulo="Added to cart" data-toast-texto="{nome_curto}">
    {ico('cart','yb-icon yb-icon--sm')} Add to cart</button>
  <a class="yb-btn yb-btn--primary" href="#avisar" data-yb-barra-avisar{oc if disp_base else ''}>
    {ico('mail','yb-icon yb-icon--sm')} Notify me</a>
</div>
"""

    # ------------------------------------------------------------------
    # DADOS ESTRUTURADOS. A pagina nao tinha nenhum — nem Product, nem
    # BreadcrumbList. Numa loja isso nao e detalhe de SEO: e a diferenca entre
    # aparecer no Google com preco e disponibilidade e aparecer como um link
    # azul qualquer.
    #
    # O que NAO entra aqui e `aggregateRating`. A nota 4.8 (128) e espera, nao
    # dado (ver AVALIACAO) — na pagina ela ja e um placeholder assumido, mas
    # dentro do JSON-LD ela vira estrela amarela no resultado de busca, e ai
    # deixa de ser placeholder e passa a ser declaracao ao Google. Placeholder
    # que escapa para fora da pagina e mentira com alcance.
    #
    # Os caminhos de imagem sao relativos porque a tela-prova roda de um
    # diretorio local; em producao o Shopify resolve para a URL absoluta do CDN.
    marca = p.get('vendor') or 'Ybera Paris'
    def _oferta(preco, disp, nome=None):
        o = {'@type': 'Offer', 'price': preco.lstrip('$'), 'priceCurrency': 'USD',
             'availability': 'https://schema.org/' + ('InStock' if disp else 'OutOfStock')}
        if nome: o['name'] = nome
        return o
    ofertas = ([_oferta(v['preco'], v['disponivel'], v['titulo']) for v in p['variantes']]
               if p['variantes'] else [_oferta(p['preco'], p['disponivel'])])
    dados_ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Product', 'name': p['titulo'], 'brand': {'@type': 'Brand', 'name': marca},
         'image': [f'img/{i}' for i in p['imagens']],
         'description': resumo_curto(p['descricao']),
         'offers': ofertas[0] if len(ofertas) == 1 else ofertas},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'index.html'},
            {'@type': 'ListItem', 'position': 2, 'name': linha_nome, 'item': linha_href},
            {'@type': 'ListItem', 'position': 3, 'name': p['titulo']}]}]}
    # `</script>` dentro de string fecharia a tag antes da hora.
    ld = ('<script type="application/ld+json">'
          + json.dumps(dados_ld, ensure_ascii=False).replace('<', r'\u003c')
          + '</script>')

    corpo = f"""{ld}
{header(promo=relacionados[0])}

<main class="yb-page">
  <nav class="yb-crumb yb-block--tight" aria-label="Breadcrumb">
    <ol><li><a href="index.html">Home</a></li><li><a href="{linha_href}">{linha_nome}</a></li>
    <li><span aria-current="page">{p['titulo']}</span></li></ol>
  </nav>

  <div class="pdp">
    <div class="yb-gallery" data-yb-gallery>
      <div class="yb-gallery__stage">{slides}
        <span class="yb-gallery__count">1 / {len(p['imagens'])}</span>
      </div>
      <div class="yb-gallery__thumbs">{thumbs}
      </div>
    </div>

    <div class="yb-buybox">
      <!-- Sem "Best seller" (nao ha dado) e sem "4.8 · 412 reviews" (idem): o
           Judge.me nao expoe a nota, e numero inventado no bloco de compra e o
           pior lugar para inventar. O estoque vem do catalogo. -->
      <!-- Favoritar mora AQUI, e nao sobre a foto. Sobre a foto ele usava
           `--onmedia` (branco a 92%), tratamento feito para levantar o
           controle de cima de uma imagem — mas toda foto de produto da loja e
           recorte com fundo transparente sobre branco, entao era branco sobre
           branco e o coracao boiava sem borda. Nao havia consistencia a
           preservar: o cartao de produto nao tem favoritar, esta e a unica
           ocorrencia no sistema. Na linha do estoque ele ganha a borda do
           `.yb-iconbtn` normal e fica junto das outras decisoes da coluna. -->
      <!-- Favoritar na linha do TITULO. Ele morava numa fileira propria acima,
           que existia para os selos; com os selos na linha do preco, aquela
           fileira virou 44px de vazio empurrando o nome do produto para baixo.
           Ao lado do titulo ele fica junto do que favorita — a mesma anatomia
           da linha do carrinho, onde a lixeira acompanha o nome do item. -->
      <div class="yb-buybox__topo">
        <h1 class="yb-buybox__title">{p['titulo']}</h1>
        <span class="yb-buybox__acoes">
          <button class="yb-iconbtn" type="button" data-yb-share
                  aria-label="Share this product"
                  data-copiado="Link copied" data-erro="Could not copy the link">
            {ico('share')}
          </button>
          <button class="yb-iconbtn yb-iconbtn--fav yb-buybox__fav" type="button"
                  data-yb-fav aria-pressed="false" aria-label="Add to favorites"
                  data-label-off="Add to favorites" data-label-on="Remove from favorites"
                  data-icon-off="yb-heart" data-icon-on="yb-heart-filled">
            <svg class="yb-icon" aria-hidden="true"><use href="yb/icons.svg#yb-heart"/></svg>
          </button>
        </span>
      </div>
      <!-- Entre titulo e preco, e nao depois do preco: a nota e o que responde
           "vale a pena?", e essa pergunta vem ANTES de "quanto custa". Antes
           dela, a unica prova social da pagina estava em y=3435 de uma pagina
           de 5014 — a pessoa decidia sem ver uma estrela.
           E link, nao enfeite: nota que nao leva as avaliacoes e beco. -->
      <a class="yb-buybox__rating" href="#reviews">
        <span class="yb-rating" role="img" aria-label="{AVALIACAO['nota']} of 5, {p.get('reviews', AVALIACAO['total'])} reviews">
          <span class="yb-rating__stars" aria-hidden="true">★★★★★</span>
          <span class="yb-rating__score">{AVALIACAO['nota']}</span>
          <span class="yb-rating__count">({p.get('reviews', AVALIACAO['total']):,} reviews)</span></span>
      </a>
      <!-- Os selos vivem na linha do PRECO, e nao acima do titulo. La em cima
           eles respondiam "posso comprar?" antes de "o que e isto?"; aqui
           respondem junto de "quanto custa", que e onde a decisao acontece. -->
      <div class="yb-buybox__precoLinha">
        <span class="yb-price"><b class="yb-price__now" data-yb-preco>{preco_base}</b>{comp}</span>
        <span class="yb-buybox__selos">{estoque}</span>
      </div>
      <p class="yb-buybox__desc">{resumo_curto(p['descricao'])}</p>

      <!-- Beneficios. A loja mostra quatro; aqui sao DOIS, e a escolha nao e
           de espaco, e de informacao. "Long-lasting softness" e "Complete
           restoration" reformulavam a promessa que o paragrafo logo acima ja
           fez — quatro rotulos de mesmo peso e mesma cor nao criam quatro
           argumentos, criam um bloco que o olho pula inteiro.
           Ficaram os dois que dizem coisas DIFERENTES: o que o produto faz
           (a mecanica de tres camadas que esta impressa na propria lata) e
           para quem ele e. Sao badges porque o componente para "rotulo curto
           com fundo suave" ja existe. -->
      <ul class="yb-buybox__benef">
        <li><span class="yb-badge yb-badge--soft">{ico('refresh','yb-icon yb-icon--sm')} Multi-layer repair</span></li>
        <li><span class="yb-badge yb-badge--soft">{ico('shield-check','yb-icon yb-icon--sm')} For damaged hair</span></li>
      </ul>

      <!-- Variante com preco e estoque, so quando o catalogo tem mais de uma.
           O esgotado fica visivel e desabilitado: sumir esconderia que o
           tamanho existe. -->{variantes}

{compra}

      <!-- O que a LOJA garante — nao o que o produto faz (isso e a lista de
           beneficio acima). "Made in Paris" saiu: afirmacao de origem sem
           fonte. Frete gratis e o que a faixa do topo ja promete. -->
      <!-- Dois, e nao quatro. "30-day returns" e "Free shipping over $50"
           saem daqui porque a secao "Shipping & returns" logo abaixo diz as
           duas com espaco para explicar ("Returns accepted within 30 days of
           delivery, unopened") — e frete gratis ainda era a terceira
           aparicao na pagina, contando a faixa preta do topo.
           Sobram as duas afirmacoes que a secao NAO repete, e duas de peso
           igual se leem; quatro viram um bloco que o olho pula. -->
      <div class="yb-buybox__trust">
        <span>Formaldehyde-free</span><span>Color-safe</span>
      </div>

      <div class="yb-accordion">{acordeao}
      </div>
{pdp_historia()}
    </div>
  </div>

  <!-- As avaliacoes tambem vivem aqui, e nao so na home: e o destino da nota
       que agora abre a coluna de compra. Nota que nao leva a lugar nenhum e
       beco, e ate esta linha existir a ancora `#reviews` da PDP apontava para
       uma secao que so a home tinha.
       Vem ANTES de "Related Products": quem rolou a PDP inteira ainda esta
       decidindo por ESTE produto; sugerir outro antes de terminar o argumento
       e trocar de assunto no meio da frase. -->
{carrossel_reviews()}

  <section class="yb-block">
    <div class="yb-section-head"><h2>Related Products</h2></div>
    <div class="yb-grid">
{chr(10).join(card(r, vendor=False) for r in relacionados)}
    </div>
  </section>

</main>

<!-- Barra de compra fixa no celular. O botao real fica a duas telas do topo
     (descricao, beneficios, variantes); a barra aparece quando ele sai de
     vista e repete preco e acao. `hidden` ate o JS decidir — sem script, o
     botao de verdade continua la. -->
{barra}

{rodape()}
{gaveta(relacionados)}
{busca(relacionados)}"""
    return CABECA.format(v=versao(), css_pagina=CSS_PDP, titulo=f"{p['titulo']} – Ybera USA") + corpo + RODAPE.replace("{v}", versao())


def montar_home_v2(destino):
    """Home v2 — a mesma loja na gramatica de e-commerce dos EUA.

    Nao substitui a v1: as duas sao geradas, e a v1 continua sendo `index.html`.
    O que muda nao e estilo, e ORDEM e ORIGEM DO TEXTO.

    1. O hero deixa de ser arte de campanha com texto dentro do pixel e passa a
       ser `.yb-mediabanner` com texto em HTML, em ingles. Ver HERO_V2.

    2. A faixa de garantias sobe do meio da pagina para logo abaixo do hero.
       Frete, devolucao e "formaldehyde-free" sao a primeira duvida de quem
       compra quimica capilar importada; respondida no rodape, ela ja custou a
       visita. E o unico bloco que muda de lugar por motivo de MERCADO, e nao
       de ritmo visual.

    3. As avaliacoes sobem de 68% da pagina para logo depois dos best sellers.
       Medido na v1: a primeira estrela aparecia em y=3435 de 5014.

    4. "Shop by Concern" sobe para logo depois dos best sellers, e nao para
       antes deles. Foi tentado antes: media o primeiro rating em y=1855 de
       7110 (26%) contra 1035 (15%) na v1 — a navegacao por problema empurrava
       800px de conteudo na frente da primeira estrela. Vitrine primeiro,
       corredor logo em seguida: a prova social chega antes, e quem procura
       problema nao precisa rolar muito.

    5. A citacao da co-fundadora fica onde estava, fechando a pagina. Foi
       tentado subi-la para depois das avaliacoes (35% em vez de 83%) e o
       usuario preferiu o lugar original: o encerramento com rosto e assinatura
       e o fim de leitura que a marca quer.

       O texto NAO foi encurtado em momento nenhum. Sao 22 palavras e e fala de
       uma pessoa real, transcrita da loja; aparar a frase de alguem para caber
       num layout e reescrever o que ela disse. O que se ajusta e a imagem.

    O resto sao as mesmas secoes, na mesma implementacao — nenhum componente
    novo, nenhum token novo. A v2 e uma remontagem, e e esse o teste de um
    design system: trocar a ordem da loja sem escrever CSS."""
    prods = dados.catalogo(os.path.join(destino, 'img'), 8)
    for i, pr in enumerate(prods):
        pr['destaque'] = i in (0, 3)

    em_oferta = next((x for x in prods if x['img'] == OFERTA['img']), prods[0])
    vizinhos = um_por_linha(prods, 3, excluir=[em_oferta])
    cards = "\n".join([cartao_oferta(em_oferta, destino)] +
                      [card(pr, flag=False) for pr in vizinhos])

    corpo = f"""{header(promo=prods[2])}

<main>
{hero_v2()}

{selos()}

  <div class="yb-page">
    <section class="yb-block">
      <div class="yb-section-head">
        <h2>Best Sellers</h2>
        <a class="yb-link" href="/collections/best-sellers">Shop all best sellers {ico('chevron-right')}</a>
      </div>
      <div class="yb-grid">
{cards}
      </div>
    </section>

{lista_colecoes('Shop by Concern', PROBLEMAS, 'bottom')}

{carrossel_reviews()}
  </div>

{quiz()}

{lista_colecoes('Shop by Collection', LINHAS, 'bottom', flush=True,
                arranjo=COLECOES_ARRANJO, eyebrow='Tailored Formulas')}

{widget_tolstoy()}

{videos_creator()}

{autoridade()}

{faixa_logos()}

  <div class="yb-page">
{blog()}

{citacao()}
  </div>

</main>

{rodape_v2()}
{gaveta(prods)}
{busca(prods)}"""
    return (CABECA.format(v=versao(), css_pagina=CSS_HOME,
                          titulo="Ybera Paris USA | Keratin care that survives humidity")
            + corpo + RODAPE.replace("{v}", versao()))


if __name__ == '__main__':
    destino = os.path.join(RAIZ, 'nova-loja')
    if os.path.exists(destino): shutil.rmtree(destino)
    os.makedirs(destino)
    print("preparando CSS, sprite e fonte…"); preparar(destino)
    print("montando home…")
    open(os.path.join(destino, 'index.html'), 'w', encoding='utf-8').write(montar_home(destino))
    print("montando home v2…")
    open(os.path.join(destino, 'index-v2.html'), 'w', encoding='utf-8').write(montar_home_v2(destino))
    print("montando pdp…")
    open(os.path.join(destino, 'pdp.html'), 'w', encoding='utf-8').write(montar_pdp(destino))
    print("montando pdp esgotada…")
    open(os.path.join(destino, 'pdp-esgotado.html'), 'w', encoding='utf-8').write(
        montar_pdp(destino, ESGOTADO))
    print("montando 404…")
    open(os.path.join(destino, '404.html'), 'w', encoding='utf-8').write(montar_404(destino))
    print("montando pdp com variante…")
    open(os.path.join(destino, 'pdp-variante.html'), 'w', encoding='utf-8').write(
        montar_pdp(destino, variantes=VARIANTE_FORJADA))
    n = len(os.listdir(os.path.join(destino, 'img')))
    print(f"pronto: nova-loja/  ({n} imagens reais)")
