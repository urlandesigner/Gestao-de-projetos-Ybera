# DDR-009 · Prefixo `yb-` em tudo

- **Estado:** aceita
- **Desde:** 0.2 · 2026-08-31
- **Substitui:** —
- **Toca:** `components/ybera-components.css`, `components/ybera-components.js`, `patterns/ybera-patterns.css`, `icons/ybera-icons.css`, `icons/ybera-icons.svg`, `tokens/00-primitives.css`, `tokens/01-semantic.css`, `test/validate.mjs`

## Decisão

Todo identificador que o sistema publica leva o prefixo `yb-`: token
(`--yb-space-4`), classe (`.yb-card__title`), atributo de comportamento
(`data-yb-open`) e símbolo do sprite (`#yb-cart`).

E toda a nomenclatura é em inglês. 0.9 renomeou **76 identificadores** para
fechar isso.

## Intenção

Não é preciosismo. Estes componentes não vivem sozinhos numa página: eles
convivem, na **mesma página**, com o tema Shopify, o Ecomposer, o Tailwind e o
Judge.me. Sem prefixo, `.btn` e `.card` colidem com alguma dessas quatro — e a
colisão é silenciosa. Ninguém recebe erro; o botão só fica com o padding do
outro.

A prova de que os vocabulários se encostam está na própria ponte, que escreve
em `--ecom-global-colors-primary`, `--jdgm-star-color`, `--background-button` e
`--text-color`. Nenhum desses nomes é nosso, nenhum é prefixado, e um deles traz
o typo `colunm` que o Ecomposer publica. É exatamente o vizinho de que o
prefixo mantém distância.

O prefixo é também o que torna possível uma regra do sistema inteiro escrita
uma vez. O corte de `prefers-reduced-motion` e o `box-sizing: border-box`
alcançam `[class*="yb-"]` de uma vez, em vez de depender de cada componente
novo lembrar. Antes disso, o toast, o freeship e o skeleton respeitavam
movimento reduzido; o diálogo, a galeria e o hover do card não.

O inglês fecha a mesma porta pelo outro lado. Antes de 0.9 a folha pedia duas
línguas de quem escrevia HTML: `data-yb-open` ao lado de `data-tocando`,
`yb-card__title` ao lado de `banner__seta`. Um vocabulário só, na língua do
resto da página, é uma decisão a menos por elemento.

## Quando se aplica

Tudo que o sistema publica e que outra folha pode enxergar: classe, token,
atributo de comportamento, `id` de símbolo no sprite.

## Quando não se aplica

- **A ponte.** Ela escreve nos nomes que o tema, o Ecomposer e o Judge.me já
  leem, e esses nomes não são negociáveis — typo incluído. Ver DDR-005.
- **Estado que o CSS lê.** `data-active`, `data-playing` e `data-video` são
  escritos pelo JS do sistema sem o prefixo. Não são vocabulário publicado, mas
  a exceção não está declarada em lugar nenhum do repositório — é o ponto mais
  frouxo desta regra hoje.
- **Elemento nativo.** `.yb-accordion details` e `.yb-accordion summary` casam
  o elemento direto, dentro do escopo de uma classe `yb-`. O escopo é o que
  impede o vazamento.

## Evidência

- O cabeçalho de `components/ybera-components.css` abre com a regra e com a
  razão, e o `PLANO.md` a lista como o primeiro dos três mecanismos que
  seguram a convivência entre tema e sistema durante as seis fases.
- O defeito oposto — seletor de tipo sem escopo — já foi observado e medido no
  próprio repositório: um `footer{max-width:70ch}` escrito para o rodapé de
  crédito esmagou o footer do sistema a 599px em `patterns/`.
  `test/validate.mjs` passou a acusar seletor de tipo solto quando o elemento
  aparece dentro de um demo.
- O validador usa o prefixo como instrumento: confere que toda classe `yb-` de
  uma página tem folha que a define, lê os símbolos do sprite por
  `<symbol id="yb-...">` e verifica que página com `.yb-icon` carrega a folha
  de ícone. Sem o prefixo, nenhuma dessas checagens seria escrevível.
- 0.9 renomeou 76 identificadores: elementos e modificadores de `yb-review`,
  `yb-post`, `yb-quote` e `yb-collection`, o gancho `data-tocando` →
  `data-playing` e o vocabulário de layout (`pagina` → `page`, `bloco` →
  `block`, `cabeca-secao` → `section-head`, `banner__seta` → `banner__arrow`).

## Consequência

O CSS fica mais verboso — `.yb-card__title` em vez de `.card__title`, em toda
linha. É o preço de conviver, e ele é pago uma vez por nome.

A renomeação em massa de 0.9 só foi possível porque o comportamento não depende
de classe (ver DDR-008): 76 nomes mudaram e nada parou de funcionar.

Para quem chega, o prefixo também funciona como resposta: se a classe começa
com `yb-`, o sistema é responsável por ela; se não começa, é do tema, e a
correção não é aqui.
