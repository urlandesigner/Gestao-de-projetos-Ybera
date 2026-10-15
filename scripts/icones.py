"""Gera o favicon e os ícones da Central a partir do Y do logo da Ybera.
Rodar da raiz do projeto: python3 <este arquivo>."""
from PIL import Image, ImageDraw, ImageFilter
src = Image.open('assets/brand/ybera-logo.png').convert('RGBA')
w, h = src.size
alfa = Image.new('L', (w, h), 0)
px = src.load(); pa = alfa.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 0 and x < 110 and (x < 96 or y < 40):  # só o Y; o B começa em x≈96 abaixo de y=40
            pa[x, y] = min(a, 255 - (r + g + b) // 3)
y_glifo = alfa.crop(alfa.getbbox())
TINTA = (28, 28, 26, 255)  # --tinta do projeto
def icone(lado, raio_frac=0.22, margem=0.18, engrossar=0):
    L = lado * 8
    base = Image.new('RGBA', (L, L), (0, 0, 0, 0))
    ImageDraw.Draw(base).rounded_rectangle([0, 0, L - 1, L - 1], radius=int(L * raio_frac), fill=TINTA)
    alvo = int(L * (1 - 2 * margem)); gw, gh = y_glifo.size; esc = alvo / max(gw, gh)
    g = y_glifo.resize((max(1, int(gw * esc)), max(1, int(gh * esc))), Image.LANCZOS)
    for _ in range(engrossar):  # o traço do logo é fino: em 16–32 px ele some
        g = g.filter(ImageFilter.MaxFilter(5))
    branco = Image.new('RGBA', g.size, (255, 255, 255, 255)); branco.putalpha(g)
    base.alpha_composite(branco, ((L - g.size[0]) // 2, (L - g.size[1]) // 2))
    return base.resize((lado, lado), Image.LANCZOS)
icone(32, margem=0.14, engrossar=3).save('assets/brand/favicon-32.png')
icone(48, margem=0.14, engrossar=3).save('favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
icone(180, raio_frac=0.0, margem=0.2, engrossar=1).save('assets/brand/apple-touch-icon.png')  # o iOS arredonda sozinho
icone(512, engrossar=1).save('assets/brand/icone-512.png')
