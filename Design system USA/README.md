# Ybera Design System

A fundação da marca Ybera em tokens. **Independente de plataforma por decisão de
projeto**: a loja US roda Shopify e a BR roda Wake Commerce — CSS custom properties
é o único denominador comum entre as duas.

Versão **0.12.1** — fundação de 320 tokens, 37 componentes e 11 padrões com
comportamento, 39 ícones, governança, decisões registradas e 108 checagens
automatizadas.

| Onde olhar | O quê |
|---|---|
| [PRINCIPIOS.md](PRINCIPIOS.md) | os cinco princípios, **em ordem** — o que ganha quando dois se chocam |
| [INVENTARIO.md](INVENTARIO.md) | as 48 peças com maturidade conferida a cada build |
| [decision-log/](decision-log/) | por que o sistema é assim, decisão por decisão |
| [CONTRIBUINDO.md](CONTRIBUINDO.md) | a mecânica: laço local, o que o CI reprova |
| [GOVERNANCA.md](GOVERNANCA.md) · [PLANO.md](PLANO.md) | como muda · como entra na loja |

## Como usar

```html
<link rel="stylesheet" href="ybera-tokens.css">
<html data-market="us">
```

```css
.meu-botao {
  background: var(--yb-action-bg);
  color: var(--yb-action-text);
  border-radius: var(--yb-radius-control);
  padding: var(--yb-space-4) var(--yb-space-6);
}
```

## Visualizar

Sempre na **porta 8080**. Uma só, para todo o projeto:

```bash
./serve.sh
```

Abre em `http://localhost:8080/` — o índice linka tokens, componentes, padrões e
telas-prova. O servidor manda `Cache-Control: no-store`, então editar um token e
recarregar mostra a mudança na hora, sem cache-bust manual.

No Claude Code, o preview também sobe por nome (`design-system`) quando existe
um `.claude/launch.json` local apontando para `http://localhost:8080` — esse
arquivo não é versionado; `./serve.sh` é o caminho que vale para todo mundo.

## Requisitos

- **Node ≥ 18** — validador, build e ferramentas (`npm run check`).
- **Python 3** (só biblioteca padrão, sem `pip`) — para `./serve.sh` e para o
  gerador das telas-prova (`_captura/montar-ds.py`, que precisa de rede).
  Sem Python, qualquer servidor estático na porta 8080 serve:
  `npx serve -l 8080` ou `php -S localhost:8080`.
- Nenhuma dependência npm: `package.json` não tem `dependencies`.

## Estrutura

```
tokens/
  00-primitives.css   camada 0 — vocabulário bruto, ninguém consome direto
  01-semantic.css     camada 1 — a intenção, é o que componentes consomem
  ybera.css           ponto de entrada
components/
  ybera-components.css   37 componentes, prefixo yb-
  ybera-components.js    comportamento — vanilla, sem dependência nem build
  doc.js / doc.css       moldura e navegação das fichas (só documentação)
  pecas/<id>.html        a fonte: demos, quando usar e notas de cada peça
  <componente>.html      37 fichas geradas: demos, 375px, API, marcação, a11y, faça/não faça
  index.html             índice gerado — nome, uma linha e o link
  fichas.json            o que a máquina não sabe — escrito à mão
  doc.css                a moldura das fichas
  solo.html              uma peça sozinha, para o quadro de 375px
patterns/
  ybera-patterns.css     11 padrões — header, carrinho, coleção, footer…
  index.html             galeria de composições
  solo.html              um padrão sozinho, para o quadro de 375px
icons/
  ybera-icons.svg        sprite com 39 ícones (9,1 KB)
  ybera-icons.css        tamanhos e alinhamento
  index.html             galeria
bridge/
  ybera-bridge.css       ponte tokens Ybera -> Ecomposer / tema / Judge.me
test/
  validate.mjs           108 checagens, roda em CI
  a11y.js                auditoria no DOM (colar no console)
  adocao.js              mede adoção na loja (colar no console)
  layout.js              retrato de geometria das telas-prova (colar no console)
  baseline.json          o retrato aceito; `npm run layout` compara, `layout:aceitar` grava
tools/
  tokens-to-json.mjs     deriva dist/ybera-tokens.json (W3C DTCG)
  inventario.mjs         deriva INVENTARIO.md do CSS
  fichas.mjs             deriva components/<componente>.html e components/index.html
  baseline.mjs           compara test/atual.json com test/baseline.json
docs/
  index.html          documentação de tokens
preview/
  index.html          componentes e páginas em 320/375/414/768, em <iframe>
decision-log/         DDR-001…009 — por que o sistema é assim
brand/                logo (a única cópia-fonte; _captura/nova-loja/brand/ é gerada)
dist/                 GERADO por ./build.sh — o que sobe para o tema
_captura/             telas-prova (nova-loja/, gerada) e captura da loja atual — ver _captura/README.md
_canvas/              canvas de decisão do véu sobre foto; não é produção
build.sh              gera dist/, INVENTARIO.md, fichas e sincroniza as telas-prova
serve.sh              servidor local na porta 8080, sem cache
adocao.json           livro-razão da adoção medida na loja (lido pelo validador)
```

**Fonte × gerado.** Edita-se: `tokens/`, `components/ybera-components.{css,js}`,
`components/pecas/`, `components/fichas.json`, `patterns/ybera-patterns.css`,
`icons/`, `bridge/`, `_captura/montar-ds.py`. Gera-se (nunca à mão): `dist/`,
`INVENTARIO.md`, `components/<componente>.html`, `components/index.html`,
`_captura/nova-loja/` inteira. O validador reprova derivado defasado.

Para usar os componentes, some ao link dos tokens:

```html
<link rel="stylesheet" href="ybera-tokens.css">
<link rel="stylesheet" href="components/ybera-components.css">
<link rel="stylesheet" href="patterns/ybera-patterns.css">
<script src="components/ybera-components.js" defer></script>
```

O JavaScript é opcional. Sem ele a página continua funcionando — ele adiciona
modal, toast, stepper, galeria, busca, trilho, variante, relógio de oferta e
mais, sempre ligando por atributo `data-yb-*`, nunca por classe de estilo. A
lista completa é a coluna "Comportamento" do [INVENTARIO.md](INVENTARIO.md) e o
cabeçalho do próprio arquivo. Conteúdo que chega depois se liga com
`Ybera.init(raiz)`.

Todo componente usa prefixo `yb-`. Não é preciosismo: eles vão conviver com o
tema Shopify, o Ecomposer, o Tailwind e o Judge.me na mesma página, e sem prefixo
`.btn` ou `.card` colide em silêncio.

## As quatro decisões

| Decisão | Valor |
|---|---|
| Primária | `#1E1E1F` grafite — **não** é o magenta |
| Ação | `#CA235F` magenta — cor de função, não de identidade. **Confirmado como o CTA.** |
| Acento | `#D29F3E` dourado — só sobre superfície escura |
| Tipografia | Schibsted Grotesk, família única |

Governança e versionamento: [GOVERNANCA.md](GOVERNANCA.md) ·
histórico em [CHANGELOG.md](CHANGELOG.md).

## Regras duras

1. **Piso de texto é `gray-600`.** O `gray-500` mede 3.44:1 e reprova em AA.
   Ele existe para ícone e borda, nunca para palavra.
2. **Dourado nunca é texto sobre claro.** O `gold-500` mede 2.39:1 sobre branco.
   Para texto sobre claro existe `--yb-accent-text` (gold-700, 5.68:1).
3. **Componente nunca consome a camada 0.** Se você escreveu
   `var(--yb-magenta-600)` num componente, ou falta um token semântico ou o
   componente está errado. A correção é sempre na camada 1.
4. **Nenhuma cor crua em componente.** Nem `#hex`, nem `rgba()`, nem `white`.
   Cor decidida dentro do componente é cor que a camada 1 não consegue trocar.

## Testes

```bash
npm run check
```

108 checagens sem dependência: integridade entre camadas, disciplina de cor
(inclusive `rgba()` e cor nomeada, não só `#hex`), monotonia das rampas,
contraste anotado versus medido, regras duras, foco visível,
`prefers-reduced-motion`, `dist/` e `INVENTARIO.md` em dia, versão única em
todo lugar, e se cada componente da folha aparece na doc. Roda em CI a cada
push.

Para o que exige navegador — contraste computado, alvo de toque, rótulo, ordem de
heading — cole `test/a11y.js` no console de qualquer página. Hoje: **0 falhas nas
8 páginas, contraste 100%**.

## Contraste

Todas as rampas foram geradas por script e validadas em WCAG 2.1. Os valores de
contraste anotados em `00-primitives.css` são **medidos**, não estimados — e o
validador confere se o número escrito no comentário bate com o real.

## Ponte para o tema

`bridge/ybera-bridge.css` traduz os tokens do sistema para as variáveis que o
tema, o Ecomposer e o Judge.me já leem. Sobe como asset do Shopify; para
reverter, remova a linha. `build.sh` o empacota em `dist/ybera-bridge.css`.

## O que esta versão não resolve
- **Tokens da loja BR** — a arquitetura suporta via `[data-market="br"]`, mas
  nenhum token de mercado foi produzido ainda. Hoje não há diferença visual
  entre os mercados, o que é o resultado certo da decisão de marca.
- **Tema escuro** — decisão consciente, não esquecimento: as três rampas foram
  medidas contra branco e nenhuma paleta escura foi produzida. `color-scheme:
  light` está declarado justamente para o navegador não inventar uma.
  Ver [DDR-007](decision-log/DDR-007-o-sistema-e-claro-por-decisao.md).
- **Regressão visual** — o CI prova que o CSS obedece às regras, não que a tela
  continua igual. Um `npm run check` verde e um layout quebrado convivem.
