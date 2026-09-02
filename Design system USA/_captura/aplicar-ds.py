#!/usr/bin/env python3
"""
APLICA O DESIGN SYSTEM SOBRE UMA CAPTURA.

    python3 _captura/aplicar-ds.py <pasta-capturada>
    python3 _captura/aplicar-ds.py home          -> gera home-ds/

Duplica a captura e injeta, no <head>, os tokens, a ponte e o overlay. A pasta
original fica intacta: é o "antes". A nova é o "depois", e as duas abrem lado a
lado no mesmo servidor.

Nenhuma linha de HTML é reescrita — só entram três <link>. É o mesmo princípio
da ponte de tokens, e por isso este ensaio vale como teste dela.

A fonte é baixada e servida localmente, senão a cópia deixa de ser offline logo
na coisa mais visível.
"""
import os, re, shutil, sys, urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122 Safari/537.36")
GOOGLE = ("https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:"
          "wght@400;500;600;700;800&display=swap")

RAIZ = os.path.dirname(os.path.abspath(__file__))
PROJETO = os.path.dirname(RAIZ)


def baixar(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def fonte_local(destino):
    """Baixa Schibsted Grotesk e devolve @font-face apontando para os woff2.

    As fontes vao para `yb/fontes/`, ao lado do proprio fonte.css. URL relativa
    dentro de um CSS resolve a partir do CSS, nao da pagina — com as fontes em
    `yb-fontes/` na raiz, o navegador procurava `yb/yb-fontes/` e falhava, com
    a pagina inteira caindo em fallback sem avisar.
    """
    css = baixar(GOOGLE).decode('utf-8')
    pasta = os.path.join(destino, 'yb', 'fontes')
    os.makedirs(pasta, exist_ok=True)
    n = 0
    def troca(m):
        nonlocal n
        url = m.group(1)
        nome = f"schibsted-{n}.woff2"; n += 1
        try:
            open(os.path.join(pasta, nome), 'wb').write(baixar(url))
        except Exception:
            return m.group(0)
        return f"url(fontes/{nome})"   # irmao do fonte.css
    css = re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', troca, css)
    print(f"  fonte: {n} arquivo(s) woff2 em yb/fontes/")
    return css


def aplicar(pasta):
    origem = os.path.join(RAIZ, pasta)
    destino = os.path.join(RAIZ, f"{pasta}-ds")
    if not os.path.isdir(origem):
        print(f"erro: {origem} nao existe"); return None
    if os.path.exists(destino):
        shutil.rmtree(destino)
    shutil.copytree(origem, destino)
    print(f"\n{pasta}/ -> {pasta}-ds/")

    # CSS do design system, copiado para dentro (a cópia tem de ser autônoma)
    pasta_ds = os.path.join(destino, 'yb')
    os.makedirs(pasta_ds, exist_ok=True)
    for src, nome in [
        ('tokens/00-primitives.css', '00-primitives.css'),
        ('tokens/01-semantic.css', '01-semantic.css'),
        ('bridge/ybera-bridge.css', 'bridge.css'),
        ('_captura/ybera-overlay.css', 'overlay.css'),
    ]:
        shutil.copy(os.path.join(PROJETO, src), os.path.join(pasta_ds, nome))
    print(f"  css: 4 arquivos em yb/")

    open(os.path.join(pasta_ds, 'fonte.css'), 'w', encoding='utf-8').write(fonte_local(destino))

    # injeta no fim do <head>: precisa vir depois do CSS do tema
    alvo = os.path.join(destino, 'index.html')
    html = open(alvo, encoding='utf-8').read()
    # Comentario neutro e curto: a pagina precisa poder ser mostrada como se
    # fosse producao, inclusive no "ver codigo-fonte". Em producao estes mesmos
    # links existiriam — o que nao existiria e um aviso de captura.
    injecao = (
        '\n<!-- Ybera Design System -->\n'
        '<link rel="stylesheet" href="yb/fonte.css">\n'
        '<link rel="stylesheet" href="yb/00-primitives.css">\n'
        '<link rel="stylesheet" href="yb/01-semantic.css">\n'
        '<link rel="stylesheet" href="yb/bridge.css">\n'
        '<link rel="stylesheet" href="yb/overlay.css">\n')
    if '</head>' not in html:
        print("  erro: sem </head>"); return None
    html = html.replace('</head>', injecao + '</head>', 1)
    # remove a nota de captura: nada na pagina deve denunciar que e copia
    html = re.sub(r'\n?<!-- C[OÓ]PIA LOCAL de[\s\S]*?-->\n?', '\n', html)
    open(alvo, 'w', encoding='utf-8').write(html)
    print(f"  injetado em index.html")
    return destino


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    for p in sys.argv[1:]:
        aplicar(p)
