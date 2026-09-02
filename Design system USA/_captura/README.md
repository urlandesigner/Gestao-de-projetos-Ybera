# Captura

Cópias locais e funcionais de páginas da ybera.us, para trabalhar sobre o layout
real sem depender da internet nem mexer em produção.

```bash
python3 _captura/capturar.py <url> <pasta>

python3 _captura/capturar.py https://ybera.us home
python3 _captura/capturar.py https://ybera.us/products/deep-care-kit-ybera-fashion-gold pdp-fashion-gold
```

Abrir em `http://localhost:8080/_captura/<pasta>/` com o `./serve.sh` rodando.

## O que já está capturado

| Pasta | Origem | Peso | Imagens carregando |
|---|---|---|---|
| `home/` | `ybera.us` | 8,8 MB | 76 de 95 |
| `pdp-fashion-gold/` | `/products/deep-care-kit-ybera-fashion-gold` | 2,3 MB | 38 de 46 |

As que faltam são `loading="lazy"` em seções que só disparam com interação
(carrossel, abas). Os arquivos estão no disco e respondem 200 — não é falha da
captura.

## Três decisões que fazem isso funcionar

**Captura o HTML servido, não o DOM renderizado.** O Ecomposer renderiza no
servidor: o HTML que chega por HTTP já traz as seções (859 KB contra 1450 KB do
DOM). A diferença é o que os apps injetam depois — popup, widget, tracking. É
exatamente o que não queremos numa cópia de trabalho.

**Negocia WebP.** O CDN do Shopify escolhe o formato pelo header `Accept`. A
mesma imagem em `width=1200` vem com **2,12 MB** como PNG e **30 KB** como WebP.
Sem esse header a captura fica 70× maior — e passa a impressão falsa de que a
loja serve imagem pesada, quando o navegador nunca vê isso.

**Limpa a sobra de query.** A URL original é
`...Artboard1.png?v=123&width=250`. A substituição casa até o `?v=123` e deixa
`&width=250` grudado no caminho local, virando 404. Foi o que derrubou 101 de
110 imagens na primeira tentativa — o arquivo estava no disco, íntegro, e o
navegador pedia um nome que não existia.

## O que é removido

Scripts de 27 domínios: analytics (GTM, Clarity, Heatmap, Klaviyo, Amplitude),
widgets externos (TikTok, Route, Judge.me, Tolstoy, Alia) e o `ecom_popup`.

O popup sai porque cobre a página inteira e impede trabalhar sobre ela. **O
resto do Ecomposer fica** — as seções dele são o layout da home.

## Ensaio: o design system aplicado

```bash
python3 _captura/aplicar-ds.py home pdp-fashion-gold
```

Duplica a captura e injeta **cinco `<link>`** no `<head>`. Nenhuma linha de HTML
muda — remover os links devolve a página ao estado de produção. É o mesmo
princípio da ponte de tokens, e por isso este ensaio a testa
antes de ela tocar no Shopify.

| Pasta | O que é |
|---|---|
| `home/` · `pdp-fashion-gold/` | **antes** — produção, intocada |
| `home-ds/` · `pdp-fashion-gold-ds/` | **depois** — mesmo HTML, com o sistema |

Uma faixa magenta no topo marca o ensaio, para ninguém confundir com a loja.

### O que a comparação medida mostrou (PDP)

| | antes | depois |
|---|---|---|
| Fonte do corpo | `ui-sans-serif` (fallback do Tailwind) | Schibsted Grotesk |
| `h1` do produto | **24px**, peso 600 | 40px, peso 700 |
| Botão de compra | `#DB2955` — o magenta do Judge.me | `#CA235F` |
| Raio do botão | 0px | 8px |
| Preço | 18px, sem tabular | 20px, peso 700, tabular |
| `--ecom-global-colors-primary` | `#ffffff` | `#1E1E1F` |

Dois achados que só apareceram aqui: o nome do produto na PDP é **24px**, menor
que o `h3` do próprio sistema; e o botão que move dinheiro usava o magenta do
**app de reviews**, não o do tema.

### Sobre o `!important` do overlay

O tema mistura Tailwind, CSS do Ecomposer e estilo inline. Num ensaio, disputar
especificidade contra três origens é ruído — o objetivo é ver o resultado. Na
adoção real isso vira mudança no tema, sem `!important` nenhum.

## Limites

- Não é produção. Formulário não envia, carrinho não adiciona, busca não busca.
- Links de navegação continuam apontando para `ybera.us` de propósito: clicar
  leva à loja real, e isso deixa claro onde termina a cópia.
- Cada captura é um retrato de um instante. A loja muda; rode de novo.
- Pesa ~11 MB somando as duas. Se não quiser isso versionado, ponha
  `_captura/*/` no `.gitignore` e mantenha só o `capturar.py`.
