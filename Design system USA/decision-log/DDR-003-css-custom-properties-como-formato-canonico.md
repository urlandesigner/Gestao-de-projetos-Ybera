# DDR-003 · CSS custom property é o formato canônico

- **Estado:** aceita
- **Desde:** 0.1 · 2026-08-31
- **Substitui:** —
- **Toca:** `tokens/00-primitives.css`, `tokens/01-semantic.css`, `tokens/ybera.css`, `tools/tokens-to-json.mjs`, `build.sh`, `dist/ybera-tokens.json`

## Decisão

A fonte dos tokens é CSS custom property. Não há Style Dictionary, não há Sass,
não há build entre a fonte e o consumo: `tokens/00-primitives.css` e
`tokens/01-semantic.css` são o que o navegador lê.

O JSON W3C DTCG em `dist/ybera-tokens.json` é **derivado**. Ele nunca é fonte.

## Intenção

A loja US roda Shopify e a BR roda Wake Commerce. CSS custom property é o único
denominador comum entre as duas — a única forma de token que as duas
plataformas consomem sem pipeline, sem passo de compilação e sem acordo prévio
entre times.

Se o JSON virasse fonte, todo consumo passaria a exigir um build. É exatamente
o que a decisão evita: subir o sistema numa loja é subir dois arquivos como
asset e escrever duas linhas no `theme.liquid`. Reverter é apagar uma linha.
Nenhum template Liquid é tocado, e nenhuma noite de deploy depende de um
gerador ter rodado.

O JSON existe para quem não lê CSS: Figma Variables, Style Dictionary, Tokens
Studio, gerador de tema nativo. `build.sh` o regenera junto com `dist/`, e
`test/validate.mjs` reprova se ele estiver defasado — do mesmo jeito que já faz
com o resto de `dist/`.

## Quando se aplica

Todo token de cor, espaço, tipografia, forma, movimento e layout. A camada 0 e
a camada 1 inteiras vivem em CSS, e é de lá que o JSON sai.

## Quando não se aplica

Três lugares onde a custom property não alcança, e todos os três estão
declarados no repositório:

- **`@media`.** Media query não lê custom property. Os quatro
  `--yb-breakpoint-*` existem como referência de projeto: o valor é escrito à
  mão na regra e `test/validate.mjs` reprova quem divergir da escala.
- **E-mail transacional.** Custom property não sobrevive a cliente de e-mail.
  Ali os valores entram literais, copiados de `dist/ybera-tokens.json`.
- **A ponte.** `bridge/ybera-bridge.css` escreve em variáveis de fora do
  sistema, com nomes que não são nossos — inclusive o typo `colunm` que o
  Ecomposer publica. Ver DDR-005.

## Evidência

- 0.1 registrou a decisão como decisão: *"Independente de plataforma: a loja US
  roda Shopify e a BR roda Wake."* É a primeira linha do `README.md`, não uma
  consequência descoberta depois.
- O cabeçalho de `tools/tokens-to-json.mjs` declara a direção da derivação e o
  motivo: *"Se o JSON virasse fonte, todo consumo passaria a exigir um build —
  exatamente o que a decisão evita."* O `$description` do próprio JSON repete o
  aviso para quem abrir só o arquivo gerado.
- A derivação tomou duas decisões de formato, e as duas estão escritas:
  `dimension` sai como **string**, porque a escala usa `em` no tracking, `ch` na
  medida de leitura e `%`, e o formato objeto do rascunho mais recente só admite
  `px` e `rem` — emitir objeto obrigaria a inventar um tipo para um terço da
  escala. E um token cujo nome é prefixo de outro vira `<grupo>.default`, porque
  a especificação proíbe `--yb-border` e `--yb-border-subtle` coexistirem como
  token e grupo no mesmo caminho. O nome CSS original fica sempre em
  `$extensions["com.ybera.cssVariable"]`.
- A fase 1 do plano de adoção é literalmente duas linhas de `stylesheet_tag`, e
  a reversão é apagar uma delas.

## Consequência

Editar um token e recarregar mostra a mudança na hora — é o que permite o
servidor local com `Cache-Control: no-store` na porta 8080 ser o loop de
trabalho inteiro.

Em troca, o sistema abre mão do que um build daria: não há tipagem, não há
transformação por plataforma, não há checagem de referência pelo compilador. O
que substitui isso é `test/validate.mjs`, que confere integridade entre
camadas, disciplina de cor e `dist/` em dia sem instalar nada. A verificação
saiu do build e virou teste.
