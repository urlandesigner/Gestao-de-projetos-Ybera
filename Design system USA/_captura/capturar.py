#!/usr/bin/env python3
"""
CAPTURA DE PÁGINA DA LOJA — cópia funcional offline.

    python3 _captura/capturar.py <url> <pasta-destino>
    python3 _captura/capturar.py https://ybera.us home

Baixa o HTML servido, puxa os assets que ele referencia (CSS, imagens, fontes,
JS do tema), reescreve os caminhos para locais e grava tudo numa pasta que abre
no navegador sem internet.

POR QUE O HTML SERVIDO, E NÃO O DOM RENDERIZADO
O Ecomposer renderiza no servidor: o HTML que chega por HTTP já traz o conteúdo
das seções. A diferença para o DOM (859 KB contra 1450 KB na home) é o que os
apps injetam depois — popups, widgets e tracking. Isso é exatamente o que não
queremos numa cópia de trabalho.

O QUE É REMOVIDO
Scripts de tracking e widgets externos (lista em BLOQUEADOS). Não é limpeza
estética: offline eles falham, travam o carregamento e sujam o console — e
nenhum deles participa do layout.
"""
import hashlib, os, re, sys, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122 Safari/537.36")

# Domínios cujo <script> sai do HTML. Tracking e widget que não roda offline.
BLOQUEADOS = (
    # analytics e pixels
    'googletagmanager.com', 'google-analytics.com', 'clarity.ms',
    'heatmap.com', 'klaviyo.com', 'config-security.com', 'doubleclick.net',
    'hotjar', 'amplitude.com', 'connect.facebook.net', 'snap.licdn.com',
    'bing.com', 'monorail-edge.shopifysvc.com', 'otlp-http-production',
    'instant.one',
    # widgets de terceiros: puxam midia da internet e nao participam do layout
    'gotolstoy.com', 'shop.app', 'judge.me', 'judgeme', 'tiktok.com',
    'tiktokcdn', 'reputon.com', 'route.com', 'alia-prod.com',
    'livewishlist.scriptengine.net', 'influencer-hero.com',
    # popup do Ecomposer: cobre a pagina inteira e impede trabalhar sobre ela.
    # O resto do Ecomposer fica — as secoes dele SAO o layout da home.
    'ecom_popup',
)

# Assets destes hosts são baixados; de qualquer outro, deixados como estão.
PERMITIDOS = ('cdn.shopify.com', 'ybera.us', 'cdn.ecomposer.app',
              'fonts.googleapis.com', 'fonts.gstatic.com')

EXT = {'text/css': '.css', 'application/javascript': '.js', 'text/javascript': '.js',
       'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
       'image/svg+xml': '.svg', 'image/gif': '.gif', 'image/avif': '.avif',
       'font/woff2': '.woff2', 'font/woff': '.woff', 'font/ttf': '.ttf'}

baixados = {}   # url absoluta -> caminho local
falhas = []


def buscar(url, timeout=25):
    # O `Accept` não é detalhe: o CDN do Shopify negocia formato por ele. A mesma
    # imagem em width=1200 vem com 2,12 MB como PNG e 30 KB como WebP. Sem este
    # header, a captura baixa os originais e engorda 70x — e passa a impressão
    # falsa de que a loja serve imagem pesada, quando o navegador nunca vê isso.
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'image/avif,image/webp,image/png,image/*,text/css,*/*;q=0.8',
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')


def nome_local(url, ctype=''):
    """Nome estável e sem colisão: hash curto da URL + extensão real."""
    p = urllib.parse.urlparse(url)
    base = os.path.basename(p.path) or 'asset'
    base = re.sub(r'[^A-Za-z0-9._-]', '_', base)[:48]
    raiz, ext = os.path.splitext(base)
    real = EXT.get(ctype.split(';')[0].strip(), '')
    # pedimos .png e o CDN respondeu image/webp — o arquivo tem de dizer a verdade
    if real and ext.lower() != real:
        ext = real
    if not ext:
        ext = real
    h = hashlib.sha1(url.encode()).hexdigest()[:8]
    return f"{raiz or 'asset'}-{h}{ext}"


def permitido(url):
    try:
        return any(d in urllib.parse.urlparse(url).netloc for d in PERMITIDOS)
    except Exception:
        return False


# Maior largura que faz sentido guardar. O HTML traz cada imagem em várias
# larguras via srcset, mas a URL base — sem `width` — é o ORIGINAL: na home há
# PNG de 3,7 MB assim. O navegador nunca baixa esse, o srcset o protege; um
# capturador ingênuo baixa. Pedimos ao CDN uma versão limitada.
LARGURA_MAX = 1600
CDN_SHOPIFY = ('cdn.shopify.com', '/cdn/shop/')


def limitar_largura(url):
    if not any(m in url for m in CDN_SHOPIFY):
        return url
    if re.search(r'[?&]width=\d+', url):
        return url
    if not re.search(r'\.(png|jpe?g|webp|avif)(\?|$)', url, re.I):
        return url
    sep = '&' if '?' in url else '?'
    return f"{url}{sep}width={LARGURA_MAX}"


def baixar_asset(url, destino, subpasta='assets'):
    url = limitar_largura(url)
    if url in baixados:
        return baixados[url]
    if not permitido(url):
        return None
    try:
        dados, ctype = buscar(url)
    except Exception as e:
        falhas.append((url, str(e)[:60]))
        return None
    nome = nome_local(url, ctype)
    pasta = os.path.join(destino, subpasta)
    os.makedirs(pasta, exist_ok=True)
    with open(os.path.join(pasta, nome), 'wb') as f:
        f.write(dados)
    rel = f"{subpasta}/{nome}"
    baixados[url] = rel
    return rel


def processar_css(texto, base_url, destino):
    """Baixa o que o CSS referencia em url() e reescreve para ../assets/."""
    def troca(m):
        cru = m.group(1).strip('\'"')
        if cru.startswith('data:'):
            return m.group(0)
        absoluto = urllib.parse.urljoin(base_url, cru)
        rel = baixar_asset(absoluto, destino)
        # o CSS vive em assets/, então o irmão é ./
        return f"url({os.path.basename(rel)})" if rel else m.group(0)
    return re.sub(r'url\(([^)]+)\)', troca, texto)


def capturar(url, destino):
    os.makedirs(destino, exist_ok=True)
    print(f"  buscando {url}")
    html, _ = buscar(url)
    html = html.decode('utf-8', errors='replace')
    print(f"  html: {len(html)//1024} KB")

    # ---- remove script de tracking (antes de baixar qualquer coisa) ----
    antes = len(re.findall(r'<script', html, re.I))
    for d in BLOQUEADOS:
        html = re.sub(rf'<script[^>]*src=["\'][^"\']*{re.escape(d)}[^"\']*["\'][^>]*>\s*</script>',
                      f'<!-- removido: {d} -->', html, flags=re.I)
        html = re.sub(rf'<script(?![^>]*\bsrc=)[^>]*>(?:(?!</script>)[\s\S]){{0,20000}}?{re.escape(d)}'
                      rf'[\s\S]*?</script>', f'<!-- removido: {d} inline -->', html, flags=re.I)
    depois = len(re.findall(r'<script', html, re.I))
    print(f"  scripts: {antes} -> {depois}  ({antes - depois} de tracking removidos)")

    # ---- coleta os assets referenciados ----
    urls = set()
    for m in re.finditer(r'<link[^>]+href=["\']([^"\']+)["\']', html, re.I):
        if re.search(r'stylesheet|preload|icon', m.group(0), re.I):
            urls.add(urllib.parse.urljoin(url, m.group(1)))
    for attr in ('src', 'data-src', 'data-original'):
        for m in re.finditer(rf'<(?:img|script|source)[^>]+{attr}=["\']([^"\']+)["\']', html, re.I):
            urls.add(urllib.parse.urljoin(url, m.group(1)))
    for m in re.finditer(r'srcset=["\']([^"\']+)["\']', html, re.I):
        for parte in m.group(1).split(','):
            cru = parte.strip().split(' ')[0]
            if cru:
                urls.add(urllib.parse.urljoin(url, cru))

    urls = {u for u in urls if permitido(u) and not u.startswith('data:')}
    print(f"  assets referenciados: {len(urls)}")

    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(lambda u: baixar_asset(u, destino), sorted(urls)))
    print(f"  baixados: {len(baixados)}   falhas: {len(falhas)}")

    # ---- CSS: baixar o que ele referencia e reescrever ----
    pasta_assets = os.path.join(destino, 'assets')
    if os.path.isdir(pasta_assets):
        for nome in list(os.listdir(pasta_assets)):
            if not nome.endswith('.css'):
                continue
            caminho = os.path.join(pasta_assets, nome)
            origem = next((u for u, r in baixados.items() if r.endswith(nome)), url)
            txt = open(caminho, encoding='utf-8', errors='replace').read()
            open(caminho, 'w', encoding='utf-8').write(processar_css(txt, origem, destino))

    # ---- reescreve o HTML para os caminhos locais ----
    trocas = 0
    for absoluto, rel in sorted(baixados.items(), key=lambda kv: -len(kv[0])):
        p = urllib.parse.urlparse(absoluto)
        # `absoluto` pode ter ganhado &width=; o HTML tem a forma sem ele
        sem_width = re.sub(r'[?&]width=\d+$', '', absoluto)
        ps = urllib.parse.urlparse(sem_width)
        for variante in (absoluto, sem_width,
                         absoluto.replace('https://', '//'),
                         sem_width.replace('https://', '//'),
                         p.path + ('?' + p.query if p.query else ''),
                         ps.path + ('?' + ps.query if ps.query else '')):
            if variante and variante in html:
                html = html.replace(variante, rel)
                trocas += 1
    # Sobra de query após a troca. A URL original era
    #   ...Artboard1.png?v=123&width=250
    # e a substituição casou só até `?v=123`, deixando `&width=250` grudado no
    # caminho local -> `assets/Artboard1-7f16.webp&width=250`, que dá 404.
    # Foi isso que derrubou 101 das 110 imagens na primeira captura.
    html, restos = re.subn(
        r'(assets/[A-Za-z0-9._-]+\.(?:webp|avif|png|jpe?g|gif|svg|ico|css|js|woff2?|mp4))'
        r'[?&][^"\'\s>)]*', r'\1', html)
    print(f"  caminhos reescritos: {trocas}   sobras de query limpas: {restos}")

    # marca a origem, para ninguém confundir cópia com produção
    nota = (f'\n<!-- CÓPIA LOCAL de {url}\n'
            f'     capturada por _captura/capturar.py\n'
            f'     tracking e widgets externos removidos; nao e producao -->\n')
    html = html.replace('</body>', nota + '</body>', 1)

    saida = os.path.join(destino, 'index.html')
    open(saida, 'w', encoding='utf-8').write(html)
    print(f"  gravado: {saida}  ({len(html)//1024} KB)")
    return saida


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    alvo, pasta = sys.argv[1], sys.argv[2]
    raiz = os.path.dirname(os.path.abspath(__file__))
    destino = os.path.join(raiz, pasta)
    print(f"\ncapturando -> {pasta}/")
    capturar(alvo, destino)
    if falhas:
        print(f"\n  {len(falhas)} asset(s) falharam:")
        for u, e in falhas[:6]:
            print(f"    {u[:70]}  {e}")
