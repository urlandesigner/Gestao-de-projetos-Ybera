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


def catalogo(pasta_img, n=8):
    d = json.loads(pegar("https://ybera.us/products.json?limit=25"))['products']
    fora = ('routeins', 'cash back', 'insurance')
    itens = []
    for p in d:
        if any(f in p['title'].lower() or f in p['handle'] for f in fora): continue
        if not p['images']: continue
        v = p['variants'][0]
        if float(v['price']) < 10: continue
        itens.append({
            'titulo': p['title'].strip(),
            'handle': p['handle'],
            'preco': f"${float(v['price']):.2f}",
            'compare': f"${float(v['compare_at_price']):.2f}" if v.get('compare_at_price') else None,
            'img': imagem(p['images'][0]['src'], pasta_img, 700),
            'tipo': (p.get('product_type') or '').strip(),
            'vendor': (p.get('vendor') or '').strip(),
        })
        if len(itens) >= n: break
    return itens


def produto(handle, pasta_img):
    p = json.loads(pegar(f"https://ybera.us/products/{handle}.json"))['product']
    v = p['variants'][0]
    corpo = re.sub(r'<[^>]+>', ' ', p.get('body_html') or '')
    corpo = re.sub(r'\s+', ' ', corpo).strip()
    return {
        'titulo': p['title'].strip(),
        'preco': f"${float(v['price']):.2f}",
        'compare': f"${float(v['compare_at_price']):.2f}" if v.get('compare_at_price') else None,
        'descricao': corpo[:320],
        'imagens': [imagem(i['src'], pasta_img, 1000) for i in p['images'][:5]],
        'opcoes': [{'nome': o['name'], 'valores': o['values'][:4]} for o in p.get('options', [])],
        'variantes': [v2['title'] for v2 in p['variants'][:4]],
    }
