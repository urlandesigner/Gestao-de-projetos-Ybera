"""Rampas de 11 tons das cores de estado (sucesso, atencao, erro, informacao).

Duas ancoras ficam exatas, porque a camada semantica ja consome as duas:
o 50 (superficie) e o 600 (texto e traco). Os outros nove tons saem daqui,
em OKLCH, no matiz do 600 e com a mesma curva de contraste das rampas de
marca: 500 ainda serve como UI (>=3:1, borda e icone), 700 em diante e AAA.

Rodar: python3 tools/rampa-estado.py  -> imprime as linhas para 00-primitives.css
"""
import math

ANCORAS = {  # familia: (50, 600)
    'success': ('#EAF6EC', '#1F7A34'),
    'warning': ('#FBF3E3', '#8A5A00'),
    'danger':  ('#FBEAE9', '#B3261E'),
    'info':    ('#E9F1FA', '#1B5FA8'),
}
# contraste-alvo contra branco, na mesma curva do neutro e do magenta
ALVO = {100: 1.20, 200: 1.38, 300: 1.75, 400: 2.60, 500: 3.60,
        700: 8.50, 800: 11.8, 900: 14.6, 950: 16.4}
# croma relativo ao 600
CROMA = {100: .30, 200: .45, 300: .65, 400: .90, 500: 1.05,
         700: .92, 800: .78, 900: .60, 950: .48}

def hex2rgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
def lin(c): return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
def delin(c): return 12.92 * c if c <= .0031308 else 1.055 * c ** (1 / 2.4) - .055
def lum(rgb): r, g, b = map(lin, rgb); return .2126 * r + .7152 * g + .0722 * b
def contraste(rgb): return 1.05 / (lum(rgb) + .05)

def rgb2oklch(rgb):
    r, g, b = map(lin, rgb)
    l = (.4122214708*r + .5363325363*g + .0514459929*b) ** (1/3)
    m = (.2119034982*r + .6806995451*g + .1073969566*b) ** (1/3)
    s = (.0883024619*r + .2817188376*g + .6299787005*b) ** (1/3)
    L = .2104542553*l + .7936177850*m - .0040720468*s
    a = 1.9779984951*l - 2.4285922050*m + .4505937099*s
    bb = .0259040371*l + .7827717662*m - .8086757660*s
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360

def oklch2rgb(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + .3963377774*a + .2158037573*b) ** 3
    m = (L - .1055613458*a - .0638541728*b) ** 3
    s = (L - .0894841775*a - 1.2914855480*b) ** 3
    r = 4.0767416621*l - 3.3077115913*m + .2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - .3413193965*s
    bl = -.0041960863*l - .7034186147*m + 1.7076984010*s
    return [delin(x) if x > 0 else 0 for x in (r, g, bl)], all(-1e-4 <= x <= 1.0001 for x in (r, g, bl))

def cor(L, C, H):
    while True:  # reduz croma ate caber no sRGB
        rgb, ok = oklch2rgb(L, C, H)
        if ok or C < .001: return [min(1, max(0, x)) for x in rgb]
        C *= .97

def tom(alvo, C, H):
    lo, hi = 0.0, 1.0  # busca o L que da o contraste-alvo
    for _ in range(40):
        mid = (lo + hi) / 2
        if contraste(cor(mid, C, H)) > alvo: lo = mid
        else: hi = mid
    return cor((lo + hi) / 2, C, H)

def hx(rgb): return '#' + ''.join(f'{round(x*255):02X}' for x in rgb)

def rampa(fam):
    h50, h600 = ANCORAS[fam]
    _, c50, hue50 = rgb2oklch(hex2rgb(h50))
    _, c600, hue600 = rgb2oklch(hex2rgb(h600))
    out = {50: h50, 600: h600}
    for passo, alvo in ALVO.items():
        # tons claros caminham do matiz do 50 ao do 600; escuros ficam no 600
        t = min(1, passo / 600)
        d = ((hue600 - hue50 + 180) % 360) - 180
        H = hue50 + d * t if passo < 600 else hue600
        C = max(c600 * CROMA[passo], c50 if passo < 600 else 0)
        out[passo] = hx(tom(alvo, C, H))
    return dict(sorted(out.items()))

def nivel(c): return 'AAA' if c >= 7 else 'AA' if c >= 4.5 else 'UI' if c >= 3 else '--'

if __name__ == '__main__':
    for fam in ANCORAS:
        for passo, h in rampa(fam).items():
            c = contraste(hex2rgb(h))
            nome = f'--yb-{fam}-{passo}:'
            print(f'  {nome:<20} {h};  /* {c:5.2f}:1 vs branco · {nivel(c)} */')
        print()
