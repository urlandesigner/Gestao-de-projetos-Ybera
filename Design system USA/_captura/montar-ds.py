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
  .banner__slide a { display:block; height:75vh; }
  .banner__slide img { width:100%; height:100%; object-fit:cover; display:block; }
  @media (max-width:767px) { .banner__slide a { height:70vh; } }
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
  .tolstoy { overflow:hidden; }"""

CSS_PDP = """  .pdp { display:grid; grid-template-columns:1fr 1fr; gap:var(--yb-space-12);
    align-items:start; padding-block:var(--yb-space-8); }
  @media (max-width:860px) { .pdp { grid-template-columns:1fr; gap:var(--yb-space-8); } }"""

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
        {"titulo": "🔥Sales", "href": "/collections/sales", "itens": []},
    ]},
    {"rotulo": "🔥Sales", "href": "/collections/sales"},
    {"rotulo": "AI Hair Analysis", "href": "/pages/ai-hair-routine-quiz"},
    {"rotulo": "About Us", "grupos": [
        {"titulo": "Our Story",        "href": "/pages/our-story",  "itens": []},
        {"titulo": "Behind The Shine", "href": "/blogs/haircare",   "itens": []},
    ]},
    {"rotulo": "Contact Us", "href": "/pages/contactus"},
]


def menu():
    """A mesma arvore serve a barra do desktop e a gaveta do mobile.

    A loja escreve o menu duas vezes no HTML — `menu-desktop` e `menu-mobile`,
    25 links repetidos. Aqui e um DOM so: o CSS decide se aquilo e barra com
    painel ou gaveta com acordeao."""
    out = []
    for n, it in enumerate(MENU):
        if "grupos" not in it:
            out.append(f'        <li class="yb-nav__item">'
                       f'<a class="yb-nav__link" href="{it["href"]}">{it["rotulo"]}</a></li>')
            continue
        grupos = []
        for g in it["grupos"]:
            itens = "".join(f'<li><a href="{h}">{t}</a></li>' for t, h in g["itens"])
            lista = f'<ul class="yb-nav__sublist">{itens}</ul>' if itens else ""
            grupos.append(f'<div class="yb-nav__group">'
                          f'<a class="yb-nav__grouptitle" href="{g["href"]}">{g["titulo"]}</a>'
                          f'{lista}</div>')
        out.append(f"""        <li class="yb-nav__item">
          <input class="yb-nav__toggle" type="checkbox" id="nav{n}">
          <label class="yb-nav__link" for="nav{n}">{it["rotulo"]}
            {ico('chevron-down', 'yb-icon yb-icon--sm')}</label>
          <div class="yb-nav__panel">
            <div class="yb-nav__groups">{''.join(grupos)}</div>
          </div>
        </li>""")
    return "\n".join(out)


def header(carrinho=2):
    return f"""<header class="yb-header">
  <div class="yb-header__announce">Free shipping on orders over <b>$50</b> · Elevate your hair, elevate your confidence</div>
  <input class="yb-header__drawer" type="checkbox" id="nav-open" aria-label="Menu">
  <div class="yb-header__bar">
    <label class="yb-iconbtn yb-header__icon yb-header__burger" for="nav-open" aria-hidden="true">{ico('menu')}</label>
    <a class="yb-header__logo" href="index.html">
      <span class="yb-logo yb-logo--md"><img src="brand/ybera-logo.webp" alt="Ybera" width="360" height="139"></span>
    </a>
    <nav class="yb-header__nav" aria-label="Main">
      <label class="yb-iconbtn yb-nav__close" for="nav-open" role="button" tabindex="0" aria-label="Close menu">{ico('close')}</label>
      <ul class="yb-nav">
{menu()}
      </ul>
    </nav>
    <div class="yb-header__actions">
      <button class="yb-iconbtn yb-header__icon" aria-label="Search">{ico('search')}</button>
      <button class="yb-iconbtn yb-header__icon" aria-label="Account">{ico('user')}</button>
      <button class="yb-iconbtn yb-header__icon" aria-label="Cart, {carrinho} items" data-yb-open="cart">
        {ico('cart')}<span class="yb-header__count">{carrinho}</span></button>
    </div>
  </div>
  <label class="yb-header__scrim" for="nav-open" aria-hidden="true"></label>
</header>"""


def card(p, rating=True, vendor=False):
    """O card tem partes opcionais: a home mostra rating, os relacionados da PDP
    mostram a marca. Mesma anatomia, conteudo diferente conforme o contexto."""
    comp = f'<s class="yb-price__was">{p["compare"]}</s>' if p.get('compare') else ''
    flag = '<div class="yb-card__flags"><span class="yb-badge yb-badge--soft">Best seller</span></div>' if p.get('destaque') else ''
    bl_rating = (f"""
        <span class="yb-rating" role="img" aria-label="4.8 of 5">
          <span class="yb-rating__stars" aria-hidden="true">★★★★★</span>
          <span class="yb-rating__count">{p.get('reviews', 128)}</span></span>""" if rating else '')
    bl_vendor = (f"""
        <span class="yb-card__vendor">{p.get('vendor','Ybera USA')}</span>""" if vendor else '')
    return f"""      <article class="yb-card">
        <div class="yb-card__media">{flag}<img src="img/{p['img']}" alt="{p['titulo'][:80]}" loading="lazy"></div>
        <h3 class="yb-card__title"><a href="pdp.html">{p['titulo']}</a></h3>{bl_rating}{bl_vendor}
        <span class="yb-price yb-price--sm"><b class="yb-price__now">{p['preco']}</b>{comp}</span>
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
          <p class="yb-cart__item-title">{p['titulo']}</p>
          <span class="yb-cart__item-variant">{p.get('variante', 'Default')}</span>
          <div class="yb-cart__item-foot">
            <div class="yb-stepper" data-yb-stepper>
              <button type="button" aria-label="Decrease quantity" disabled>&minus;</button>
              <input type="number" value="1" min="1" aria-label="Quantity">
              <button type="button" aria-label="Increase quantity">+</button>
            </div>
            <span class="yb-price yb-price--sm"><b class="yb-price__now">{p['preco']}</b></span>
          </div>
          <button class="yb-cart__remove">Remove</button>
        </div>
      </div>""" for p in itens)

    frete = (f'<span class="yb-freeship__text">Add <b>${falta:.2f}</b> more for free shipping</span>'
             if falta else '<span class="yb-freeship__text"><b>Free shipping</b> unlocked</span>')

    return f"""<dialog id="cart" class="yb-dialog yb-dialog--drawer" aria-labelledby="cart-t">
  <div class="yb-cart">
    <div class="yb-cart__head"><h2 id="cart-t">Your cart ({len(itens)})</h2>
      <button class="yb-iconbtn yb-cart__close" data-yb-close aria-label="Close cart">{ico('close')}</button></div>
    <div class="yb-cart__ship">
      <div class="yb-freeship">
        {frete}
        <div class="yb-freeship__track" role="progressbar" aria-valuenow="{pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to free shipping">
          <div class="yb-freeship__fill" style="width:{pct}%"></div></div>
      </div>
    </div>
    <div class="yb-cart__items">{linhas}
    </div>
    <div class="yb-cart__foot">
      <div class="yb-cart__line"><span>Subtotal</span><span>${subtotal:.2f}</span></div>
      <div class="yb-cart__line"><span>Shipping</span><span>Calculated at checkout</span></div>
      <div class="yb-cart__line yb-cart__line--total"><span>Total</span><span>${subtotal:.2f}</span></div>
      <button class="yb-btn yb-btn--primary yb-btn--block">Checkout</button>
      <p class="yb-cart__note">Taxes calculated at checkout &middot; 30-day returns</p>
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
  <ul class="banner__track" id="banner-track">{slides}
  </ul>
  <button class="banner__arrow banner__arrow--prev" aria-label="Previous slide">{ico('chevron-left','yb-icon yb-icon--lg')}</button>
  <button class="banner__arrow banner__arrow--next" aria-label="Next slide">{ico('chevron-right','yb-icon yb-icon--lg')}</button>
</section>"""


# ==================================================== CARROSSEL DE REVIEWS
# Prova social real, extraida do widget Judge.me da home. Diferente do Tolstoy,
# o Judge.me renderiza no DOM normal — o design system alcanca, e por isso aqui
# o conteudo dele e servido pelos nossos componentes.
REVIEWS = json.load(open(os.path.join(RAIZ, 'reviews.json'), encoding='utf-8'))


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
        titulo = f'<p class="yb-review__title">{r["titulo"]}</p>' if r['titulo'] else ''
        itens += f"""
        <article class="yb-review">
          <div class="yb-review__media"><img src="img/{r['arquivo']}" alt="" loading="lazy"></div>
          <div class="yb-review__body">
            <span class="yb-rating" role="img" aria-label="{r['nota']} of 5 stars">
              <span class="yb-rating__stars" aria-hidden="true">{estrelas}</span></span>
            {titulo}
            <p class="yb-review__text">{r['texto']}</p>
            <span class="yb-review__author">{r['autor']}</span>
            <span class="yb-review__product">{r['produto']}</span>
          </div>
        </article>"""
    return f"""    <section class="yb-block">
      <div class="yb-track yb-reviews">{itens}
      </div>
    </section>"""


# ============================================== LISTAS DE COLEÇÃO (2 seções)
# A home usa a mesma anatomia duas vezes; por isso ela virou o componente
# .yb-collection. Aqui so entram conteudo, imagens e links de producao.
PROBLEMAS = [
    ('02_hair-problem-f838107d.webp', 'Damaged Hair', '/collections/dullness'),
    ('01_hair-problem-2cb5a59f.jpg', 'Frizz Control &amp; Dry Hair', '/collections/dryness-frizz'),
    ('04_hair-problem-e1fbbb33.webp', 'Hair Loss / Thinning', '/collections/hair-loss-thinning-hair'),
    ('03_hair-problem-b7e78041.jpg', 'Curly Hair', '/collections/frizz-lack-of-volume'),
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


def lista_colecoes(titulo, itens, posicao):
    li = ""
    for img, rotulo, href in itens:
        li += f"""
        <li><a class="yb-collection yb-collection--{posicao}" href="{href}">
          <img src="img/{img}" alt="{rotulo}" loading="lazy">
          <span class="yb-collection__label">{rotulo}</span>
        </a></li>"""
    return f"""    <section class="yb-block">
      <div class="yb-section-head yb-section-head--center">
        <h2>{titulo}</h2>
      </div>
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
    return f"""    <section class="yb-block">
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
            <a class="yb-btn yb-btn--primary" href="{href}">{rotulo}</a>
          </div>
        </div>
        <div class="yb-quote__media">
          <img src="img/{CITACAO['img']}" alt="Sauana Alves, co-fundadora da Ybera Paris" loading="lazy">
        </div>
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


def _post(pst, destaque=False):
    mod = ' yb-post--featured' if destaque else ''
    return f"""<article class="yb-post{mod}">
          <div class="yb-post__media"><img src="img/{pst.get('arquivo','')}" alt="" loading="lazy"></div>
          <div class="yb-post__body">
            <h3 class="yb-post__title">{pst['titulo']}</h3>
            <p class="yb-post__excerpt">{pst['resumo']}</p>
            <a class="yb-post__link" href="{pst['href']}">Continue reading {ico('external','yb-icon yb-icon--sm')}</a>
          </div>
        </article>"""


def blog():
    if not POSTS: return ''
    destaque = _post(POSTS[0], True)
    outros = "\n        ".join(_post(x) for x in POSTS[1:3])
    return f"""    <section class="yb-block">
      <div class="yb-section-head yb-section-head--center">
        <h2>The Gold Standard: Behind the Shine</h2>
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


# ============================================================ HOME
def montar_home(destino):
    prods = dados.catalogo(os.path.join(destino, 'img'), 8)
    n_banner = copiar_banners(destino) + copiar_colecoes(destino) + copiar_reviews(destino) + copiar_logos(destino) + copiar_posts(destino) + copiar_citacao(destino) + copiar_videos(destino)
    print(f"  imagens de produção copiadas: {n_banner}")
    for i, p in enumerate(prods):
        p['destaque'] = i in (0, 3)
        p['reviews'] = [412, 87, 203, 56, 91, 148, 64, 233][i % 8]
    heroi = prods[2]

    cards = "\n".join(card(p) for p in prods[:4])


    corpo = f"""{header()}

<main>
  {banner()}

  <div class="yb-page">

    <section class="yb-block">
      <div class="yb-section-head">
        <h2>Best Sellers</h2>
        <a href="#">View all treatments {ico('chevron-right')}</a>
      </div>
      <div class="yb-grid">
{cards}
      </div>
    </section>

{lista_colecoes('What&rsquo;s Standing Between You and Great Hair?', PROBLEMAS, 'center')}
  </div>

{widget_tolstoy()}

  <div class="yb-page">
{lista_colecoes('Explore Our Collections', LINHAS, 'bottom')}

{carrossel_reviews()}
  </div>

  <div class="yb-page">
{videos_creator()}
  </div>

{selos()}

{faixa_logos()}

  <div class="yb-page">
{blog()}

{citacao()}
  </div>



</main>

{rodape()}
{gaveta(prods)}"""
    return CABECA.format(v=versao(), css_pagina=CSS_HOME, titulo="Ybera Paris USA | Keratin care that survives humidity") + corpo + RODAPE.replace("{v}", versao())


# ============================================================ PDP
def montar_pdp(destino, handle='deep-care-kit-ybera-fashion-gold'):
    p = dados.produto(handle, os.path.join(destino, 'img'))

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
    acordeao = "".join(f"""
        <details{' open' if i==0 else ''}><summary>{t}</summary>
          <div class="yb-accordion__body"><p>{c}</p></div></details>""" for i, (t, c) in enumerate([
        ('Description', p['descricao'] or 'Professional keratin treatment kit.'),
        ('How to use', 'Wash with a clarifying shampoo and towel-dry. Apply from mid-length to ends, avoiding the scalp. Leave for 20 minutes, then rinse and blow-dry.'),
        ('Shipping &amp; returns', 'Free standard shipping on orders over $50. Returns accepted within 30 days of delivery, unopened.')]))

    # Related Products existe na PDP de producao (product-recommendations do
    # Shopify, carregado por JS — por isso nao aparecia na captura estatica).
    relacionados = [x for x in dados.catalogo(os.path.join(destino, 'img'), 8)
                    if x['titulo'] != p['titulo']][:4]

    corpo = f"""{header()}

<main class="yb-page">
  <nav class="yb-crumb yb-block--tight" aria-label="Breadcrumb">
    <ol><li><a href="index.html">Home</a></li><li><a href="#">Treatments</a></li>
    <li><span aria-current="page">{p['titulo'][:34]}</span></li></ol>
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
      <div class="yb-buybox__flags">
        <span class="yb-badge yb-badge--soft">Best seller</span>
        <span class="yb-badge yb-badge--success">In stock</span>
      </div>
      <h1 class="yb-buybox__title">{p['titulo']}</h1>
      <span class="yb-rating" role="img" aria-label="4.8 of 5, 412 reviews">
        <span class="yb-rating__stars" aria-hidden="true">★★★★★</span>
        <span class="yb-rating__count">4.8 · 412 reviews</span></span>
      <span class="yb-price"><b class="yb-price__now">{p['preco']}</b>{comp}</span>
      <p class="yb-buybox__desc">{p['descricao']}</p>

      <div class="yb-buybox__actions">
        <div class="yb-stepper" data-yb-stepper>
          <button type="button" data-yb-step="down" aria-label="Decrease quantity">{ico('minus','yb-icon yb-icon--sm')}</button>
          <input type="number" value="1" min="1" max="9" aria-label="Quantity">
          <button type="button" data-yb-step="up" aria-label="Increase quantity">{ico('plus','yb-icon yb-icon--sm')}</button>
        </div>
        <button class="yb-btn yb-btn--primary" onclick="Ybera.toast({{title:'Added to cart',text:'{p['titulo'][:40]}',variant:'success'}})">
          Add to cart — {p['preco']}</button>
      </div>
      <p class="yb-buybox__ship">{ico('truck','yb-icon yb-icon--sm')} Free shipping · arrives Sep 4 – Sep 6</p>

      <div class="yb-buybox__trust">
        <span>Formaldehyde-free</span><span>Color-safe</span>
        <span>30-day returns</span><span>Made in Paris</span>
      </div>

      <div class="yb-accordion">{acordeao}
      </div>
    </div>
  </div>

  <section class="yb-block">
    <div class="yb-section-head"><h2>Related Products</h2></div>
    <div class="yb-grid">
{chr(10).join(card(r, rating=False, vendor=True) for r in relacionados)}
    </div>
  </section>

</main>

{rodape()}
{gaveta(relacionados)}"""
    return CABECA.format(v=versao(), css_pagina=CSS_PDP, titulo=f"{p['titulo']} – Ybera USA") + corpo + RODAPE.replace("{v}", versao())


if __name__ == '__main__':
    destino = os.path.join(RAIZ, 'nova-loja')
    if os.path.exists(destino): shutil.rmtree(destino)
    os.makedirs(destino)
    print("preparando CSS, sprite e fonte…"); preparar(destino)
    print("montando home…")
    open(os.path.join(destino, 'index.html'), 'w', encoding='utf-8').write(montar_home(destino))
    print("montando pdp…")
    open(os.path.join(destino, 'pdp.html'), 'w', encoding='utf-8').write(montar_pdp(destino))
    n = len(os.listdir(os.path.join(destino, 'img')))
    print(f"pronto: nova-loja/  ({n} imagens reais)")
