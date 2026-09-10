#!/usr/bin/env python3
"""Puxa produtos reais da loja e baixa as imagens. Alimenta montar-ds.py."""
import json, os, re, urllib.request, hashlib

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36"
ACCEPT = 'image/avif,image/webp,image/*,*/*;q=0.8'


def pegar(url, aceita=None):
    h = {'User-Agent': UA}
    if aceita: h['Accept'] = aceita
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=25) as r:
        return r.read()


def imagem(url, pasta, largura=900):
    os.makedirs(pasta, exist_ok=True)
    if '?' in url: url = url.split('?')[0]
    u = f"{url}?width={largura}"
    nome = re.sub(r'[^A-Za-z0-9._-]', '_', os.path.basename(url))[:40]
    raiz = os.path.splitext(nome)[0]
    saida = f"{raiz}-{hashlib.sha1(u.encode()).hexdigest()[:6]}.webp"
    caminho = os.path.join(pasta, saida)
    if not os.path.exists(caminho):
        open(caminho, 'wb').write(pegar(u, ACCEPT))
    return saida


# Linhas e nomes proprios da loja. A loja mistura MAIUSCULA-sobrando
# ("MIRRA OIL", "CRONOGRAMA - Step 2 CORTEX") com title-case normal no mesmo
# catalogo; nao ha regra que um algoritmo adivinhe sozinho, por isso a lista
# e mantida a mao. Ordenada por tamanho na hora do uso, nao aqui — "Ybera
# Paris" precisa casar antes de "Ybera" sozinho.
MARCAS = [
    'Ybera Paris', 'Ybera', 'Fashion Gold', 'Cronograma', '100Timetros',
    'Capulana', 'Terra Coco', 'Hair Mist', 'Vello', 'Mirra', 'Detox',
    "Life's Flower", 'Essência Brasileira', 'Universal', 'Genoma',
    'Quarta Camada', 'Medula', 'Cortex', 'Protect & Control',
]


def titulo_padrao(t):
    """Maiuscula so a primeira letra da primeira palavra, e a primeira letra
    de cada nome proprio da loja (MARCAS) — o resto cai para minusculo.

    "CRONOGRAMA - Step 2 CORTEX" e "Fashion Gold Keratin 300g" hoje convivem
    no mesmo catalogo: um dado com PALAVRA EM CAIXA ALTA sobrando, o outro em
    title-case comum. Nenhum dos dois e "o padrao" — a regra e sentenca, com
    nome proprio preservado."""
    t = t.lower()
    for marca in sorted(MARCAS, key=len, reverse=True):
        t = re.sub(r'\b' + re.escape(marca.lower()) + r'\b', marca, t)
    m = re.search(r'[a-zA-ZÀ-ÿ]', t)
    if m:
        i = m.start()
        t = t[:i] + t[i].upper() + t[i + 1:]
    return t


def titulo_limpo(t):
    """Separa o que e nome de produto do que e catalogo vazando.

    A loja escreve no titulo coisas que nao sao nome: "_" e "*" sobrando no
    fim, espaco duplo ("Step  2"), "– Old Packaging" (linguagem de estoque) e
    a oferta "| FREE CRONOGRAMA", que e informacao de venda e merece um lugar
    proprio no cartao em vez de sumir no corte de duas linhas. Devolve
    (titulo, brinde) — brinde e None quando nao ha "FREE ..." no titulo."""
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'[\s_*]+$', '', t)
    # "– Old Packaging", "| New Packaging": nota de estoque, nao nome
    t = re.sub(r'\s*[–|-]\s*(old|new) packaging\b', '', t, flags=re.I)
    # "- YBERA PARIS" no fim: a marca ja e da loja inteira
    t = re.sub(r'\s*[–|-]\s*ybera paris$', '', t, flags=re.I)
    partes = [s.strip() for s in t.split('|') if s.strip()]
    brinde = next((s for s in partes if s.lower().startswith('free ')), None)
    if brinde:
        partes.remove(brinde)
        # "FREE CRONOGRAMA" -> "Free Cronograma"; "FREE 1L Shampoo" mantem o 1L
        brinde = ' '.join(w if any(c.isdigit() for c in w) else w.capitalize()
                          for w in brinde.split())
    return ' | '.join(titulo_padrao(p) for p in partes), brinde


def catalogo(pasta_img, n=8):
    d = json.loads(pegar("https://ybera.us/products.json?limit=25"))['products']
    fora = ('routeins', 'cash back', 'insurance')
    itens, vistos = [], set()
    for p in d:
        if any(f in p['title'].lower() or f in p['handle'] for f in fora): continue
        if not p['images']: continue
        v = p['variants'][0]
        if float(v['price']) < 10: continue
        titulo, brinde = titulo_limpo(p['title'])
        # a loja lista o mesmo kit duas vezes (um com "_" no fim); lado a lado
        # na home viravam dois cartoes iguais com precos diferentes
        chave = titulo.lower()
        if chave in vistos: continue
        vistos.add(chave)
        imgs = p['images']
        itens.append({
            'titulo': titulo,
            'brinde': brinde,
            'handle': p['handle'],
            'preco': f"${float(v['price']):.2f}",
            'compare': f"${float(v['compare_at_price']):.2f}" if v.get('compare_at_price') else None,
            'img': imagem(imgs[0]['src'], pasta_img, 700),
            # segunda foto para o hover do cartao — a loja ja manda as duas
            'img2': imagem(imgs[1]['src'], pasta_img, 700) if len(imgs) > 1 else None,
            'tipo': (p.get('product_type') or '').strip(),
            'vendor': (p.get('vendor') or '').strip(),
        })
        if len(itens) >= n: break
    return itens


def produto(handle, pasta_img):
    p = json.loads(pegar(f"https://ybera.us/products/{handle}.json"))['product']
    # O .json nao diz se ha estoque; o .js (Storefront AJAX) diz, por variante.
    # Sem isso "In stock" era texto fixo — e texto fixo vira mentira no dia em
    # que acabar.
    try:
        js = json.loads(pegar(f"https://ybera.us/products/{handle}.js", 'application/json'))
        estoque = {v2['title']: bool(v2.get('available')) for v2 in js.get('variants', [])}
    except Exception:
        estoque = {}
    v = p['variants'][0]
    corpo = re.sub(r'<[^>]+>', ' ', p.get('body_html') or '')
    corpo = re.sub(r'\s+', ' ', corpo).strip()
    # A primeira foto do catalogo tem 420px e a galeria a mostra a 544: fica
    # mole. Quando existe uma foto grande (>= 800), ela vai para a frente; a
    # ordem das outras se mantem. Quem decide o palco e a resolucao, nao a
    # posicao em que o Shopify a listou.
    imgs = list(p['images'][:5])
    grande = next((i for i in imgs if (i.get('width') or 0) >= 800), None)
    if grande and imgs[0] is not grande:
        imgs.remove(grande); imgs.insert(0, grande)
    variantes = [{
        'titulo': v2['title'],
        'preco': f"${float(v2['price']):.2f}",
        'disponivel': estoque.get(v2['title'], True),
    } for v2 in p['variants'][:4]]
    # variante unica ("Default Title") nao e escolha: nao vira seletor
    if len(variantes) == 1 and variantes[0]['titulo'] == 'Default Title':
        variantes = []
    # O catalogo ja separa "| FREE CRONOGRAMA" do nome (ver titulo_limpo); a
    # PDP nao separava, entao um brinde real que existe em 3 dos 20 produtos
    # nunca chegava a aparecer la. O nome continua vindo de titulo_padrao, que
    # e o tratamento da PDP; o brinde vem de titulo_limpo, que so o extrai.
    _, brinde = titulo_limpo(p['title'])
    return {
        'titulo': titulo_padrao(p['title'].strip()),
        'brinde': brinde,
        'handle': handle,
        'preco': f"${float(v['price']):.2f}",
        'compare': f"${float(v['compare_at_price']):.2f}" if v.get('compare_at_price') else None,
        'disponivel': estoque.get(v['title'], True),
        # Inteira. O corte em 320 caracteres partia no meio da palavra
        # ("Powered by nutrient-") — e descricao de produto e o texto que
        # convence a comprar, nao legenda.
        'descricao': corpo,
        'imagens': [imagem(i['src'], pasta_img, 1000) for i in imgs],
        'opcoes': [{'nome': o['name'], 'valores': o['values'][:4]} for o in p.get('options', [])],
        'variantes': variantes,
        'vendor': (p.get('vendor') or '').strip(),
    }
