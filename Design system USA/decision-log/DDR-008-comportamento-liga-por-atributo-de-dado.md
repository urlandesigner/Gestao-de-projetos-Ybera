# DDR-008 · Comportamento liga por atributo de dado

- **Estado:** aceita
- **Desde:** 0.6 · 2026-08-31
- **Substitui:** —
- **Toca:** `components/ybera-components.js`, `components/ybera-components.css`, `test/validate.mjs`, `build.sh`

## Decisão

O JavaScript liga por atributo de dado, não por classe de estilo:
`data-yb-open`, `data-yb-close`, `data-yb-stepper`, `data-yb-step` e
`data-yb-gallery`.

O JavaScript é **opcional**. Sem ele a página continua funcionando.

E o sistema prefere o elemento nativo ao componente reimplementado: `<dialog>`
para modal e gaveta, `<details>` para acordeão, `<input type="radio">` para as
miniaturas da galeria.

## Intenção

Classe é vocabulário de estilo. No dia em que `.yb-cart-btn` virar
`.yb-header__cart`, quem renomeia está mexendo em aparência — e se o JS estiver
pendurado no nome, o carrinho para de abrir sem que ninguém tenha tocado no
comportamento. Atributo de dado separa as duas coisas: mudar o visual não
quebra o comportamento, e mudar o comportamento não obriga a mexer no CSS.

O JS ser opcional vem do mesmo raciocínio, um nível acima. Se o script não
carregar — rede ruim, bloqueador, erro de outro app na página — formulários
continuam enviando e links continuam navegando. A galeria continua trocando de
imagem, porque quem faz isso são os radios em CSS, não o script.

Preferir o nativo é o que torna esse "opcional" barato. `<dialog>` já traz foco
preso, `Esc` e backdrop; o JS só abre, fecha no clique fora e devolve o foco a
quem abriu — sem isso o leitor de tela volta ao topo da página depois de
fechar. `<details>` traz teclado, leitor de tela e a busca do navegador de
graça, inclusive `Ctrl+F` encontrando texto dentro de seção fechada nos
navegadores que suportam. Nada disso precisa ser escrito, testado ou mantido.

## Quando se aplica

Todo componente com comportamento. O gancho é o atributo; a classe fica para o
estilo. A API pública é `window.Ybera`, com `toast()`, `openDialog()` e
`init()` — `init(raiz)` existe para conteúdo que chega depois, como uma seção
carregada por JS do tema.

## Quando não se aplica

- **Estado que o CSS lê.** `data-active` no slide da galeria e `data-playing`
  no card de vídeo são escritos pelo JS para o CSS reagir. Não são pontos de
  ligação: são o resultado dela.
- **Navegação principal e gaveta do header.** Os dois casam por classe
  (`.yb-nav__toggle`, `.yb-header__drawer`) porque o gancho real é um
  `checkbox` com `id`, e o menu inteiro funciona sem o script: checkbox e label
  abrem no clique, o CSS abre no hover e no foco. O que o JS acrescenta é
  fechar — no `Escape`, no clique fora — e o `aria-expanded` que o checkbox
  sozinho não expressa. `test/validate.mjs` trata esses dois nomes como
  marcador de JS, junto dos `data-yb-*`.
- **Vídeo vertical.** Casa por `.yb-video` e lê o endereço em `data-video`. A
  troca do pôster pelo vídeo só acontece no primeiro clique porque **45 vídeos
  carregando de uma vez** é o que faz uma home pesar.

## Evidência

- 0.6 entregou `ybera-components.js` como *progressive enhancement*, com a
  garantia escrita: *"se o script não carregar, formulários enviam e links
  navegam"*.
- O cabeçalho do arquivo declara a regra e mostra o par HTML/atributo de cada
  componente, e o `README.md` a repete para quem só lê a página de entrada.
- `test/validate.mjs` reprova página que usa marcador de JS sem carregar o JS.
  O defeito é real e já aconteceu: `patterns/` tinha *"o menu inteiro sem quem
  fechasse no Escape"*.
- `build.sh` copia o JS para `dist/` por causa de um defeito observado: o CSS
  do bundle ganhou seletores novos (`[data-playing]`) e o JS ficou para trás —
  *"o vídeo subia para o Shopify sem quem o fizesse tocar"*.
- Os testes de 0.6 confirmaram o que o nativo entrega: modal devolve o foco ao
  gatilho ao fechar; toast pausa no hover e no foco de teclado; erro usa
  `role="alert"` e não expira; stepper trava nas duas pontas.

## Consequência

Renomear classe virou operação segura — foi o que permitiu 0.9 renomear 76
identificadores sem que nenhum comportamento parasse. Ver DDR-009.

O custo é que o HTML carrega dois vocabulários: um de estilo e um de
comportamento, e quem escreve a marcação precisa acertar os dois. É o que a
checagem do validador existe para pegar, porque um `data-yb-open` numa página
sem o script não dá erro nenhum — o botão simplesmente não faz nada.
