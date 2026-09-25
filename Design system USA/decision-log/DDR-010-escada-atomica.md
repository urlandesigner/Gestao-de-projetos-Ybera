# DDR-010 · A escada atômica é a árvore de arquivos

- **Estado:** aceita
- **Desde:** 0.13 · 2026-09-24
- **Substitui:** a divisão em `components/` + `patterns/`
- **Toca:** `base/`, `atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/`, `behavior/`, `doc/`, `tools/fichas.mjs`, `tools/inventario.mjs`, `test/validate.mjs`, `build.sh`, `_captura/montar-ds.py`

## Decisão

O sistema é organizado em atomic design, e o **degrau de cada peça é a pasta em
que ela mora** — não um rótulo escrito numa tabela ao lado:

| Degrau | Pasta | Peças | A regra |
|---|---|---|---|
| Subatômico | `tokens/` | 321 tokens | Valor com nome. Não desenha nada sozinho. |
| Chão | `base/` | — | Reset, corte de movimento, utilitários de a11y, alto contraste. Vale para todas as peças e não é peça. |
| Átomo | `atoms/` | 12 | **Não usa nenhuma outra peça do sistema.** Perde a função se você tirar qualquer parte. |
| Molécula | `molecules/` | 21 | Reúne átomos para **uma** tarefa. Não tem lugar fixo na página. |
| Organismo | `organisms/` | 15 | É uma **região** da página: tem lugar, e sobrevive sozinho numa tela. |
| Template | `templates/` | 1 | O esqueleto sem conteúdo: largura, ritmo, cabeçalho de seção. |
| Página | `pages/` | 11 | O template com conteúdo real da loja. |

A folha de cada degrau carrega as dos degraus abaixo, **nessa ordem**, e é
assim que o bundle é concatenado.

## Intenção

A divisão anterior — `components/` e `patterns/` — respondia bem a uma
pergunta ("isto é peça ou composição?") e mal a outra ("onde isto entra?").
Com 37 componentes numa pasta só, o Button, que não tem uma parte interna
sequer, ficava lado a lado com a folha de busca, que tem 21. As duas coisas
chamadas pelo mesmo nome, no mesmo lugar, com a mesma cara na galeria.

O degrau responde a segunda pergunta sem precisar de prosa: quem procura onde
enfiar uma peça nova olha a escada e vê onde ela cabe. E o funil — 12 / 21 /
15 / 1 — conta sozinho a saúde do sistema: base estreita, meio largo, topo
fechado. Um sistema com 40 organismos e 5 átomos está reescrevendo botão.

## Por que a pasta, e não um rótulo

Rótulo não tem como estar errado — ele é só texto. Pasta tem.

Com o degrau na árvore, três coisas passam a ser verificáveis a cada build, e
as três estão em `test/validate.mjs`:

1. **Átomo que compõe outra peça reprova.** A lista "de que ela é feita" sai da
   marcação canônica de cada peça cruzada com a classe base que cada ficha já
   anuncia. Se um átomo consumir qualquer coisa, o build quebra e diz para
   subir um degrau. Hoje: 0 de 12.
2. **Organismo que não compõe nada avisa.** Não reprova — `Gallery`, `Account
   menu` e `Manifesto` são regiões legítimas feitas de marcação nativa —, mas
   a pergunta fica registrada em vez de sumir.
3. **A cascata é a escada.** `.yb-grid__rail` (organismo) e `.yb-track`
   (molécula) têm a mesma especificidade, e o `display:contents` do trilho só
   ganha porque a folha dos organismos vem depois. Uma checagem reprova se a
   regra descer de degrau.

## O que NÃO mudou, de propósito

**Nenhuma classe CSS.** `.yb-btn` continua `.yb-btn` em todos os degraus. O
degrau é onde a peça mora, não como ela se chama — e renomear classe quebraria
a ponte para o tema, o bundle que a loja consome e as 11 telas de uma vez, sem
melhorar um pixel.

**O nome dos arquivos em `dist/`.** O tema Shopify já linka
`ybera-components.css` como asset. O bundle continua com esse nome porque
trocá-lo é uma mudança **na loja**, não no design system.

**Nenhum estilo computado.** O corte das duas folhas nas cinco foi verificado
medindo `getBoundingClientRect` e 28 propriedades computadas de cada elemento
das seis telas mais pesadas, com a ordem antiga e com a nova: **4.812
elementos, 0 diferenças**.

A primeira tentativa do corte NÃO foi neutra, e é o registro que vale guardar:
cortar por bloco de comentário mandou `.yb-btn--sm` para `base/`, que carrega
antes do próprio botão, e quinze botões da home voltaram ao tamanho cheio. O
bloco `CARREGANDO` guardava três assuntos — o estado global de `aria-busy`, a
ação sobre a foto do cartão e os tamanhos do botão. Cabeçalho de comentário não
é fronteira de responsabilidade.

## Consequências

- `tools/padroes.mjs` deixou de existir: um gerador só, com a escada declarada
  numa lista, escreve as 49 fichas, as 4 galerias e os 4 `solo.html`.
- A regra da classe base **muda com o degrau**, e isso é propriedade declarada,
  não exceção escondida: embaixo ela é a família mais específica (o Post mostra
  três artigos dentro de `.yb-posts`, e a peça é o artigo); em cima é o
  invólucro mais externo (o cabeçalho tem 75 ocorrências de `.yb-search*`
  contra 13 de `.yb-header*`, e quem manda é o que envolve).
- O carrossel de vídeo desceu de organismo para molécula. `.yb-videos` é só o
  trilho — sem modificador, sem elemento, sem token; a peça é `.yb-video`, o
  cartão, como o Review e o Post.
- `empty-state`, que existia como padrão **e** como componente, virou uma peça
  só: os contextos viraram uma fileira a mais dentro da molécula `Empty state`.
- `_captura/` guarda o que se capturou da loja; o que o sistema monta virou
  `pages/`.
- O **Account menu** deixou de ser organismo. A regra do degrau diz "sobrevive
  sozinho numa tela", e ele não sobrevive: na loja mora dentro de
  `.yb-header__actions`. Dele saíram duas peças de verdade — **Avatar** (átomo)
  e **Menu** (molécula) —, e a conta logada virou um estado do Header. Foi a
  escada encontrando um erro que o nome antigo escondia: enquanto a pasta se
  chamava `patterns/`, "um padrão chamado Account menu" não soava errado.
- O **menu** não usa a palavra "Páginas", embora ela seja o nome do degrau:
  nenhum design system público a usa como rótulo de navegação, e o grupo
  misturava duas categorias — um esqueleto sem conteúdo e onze telas com
  catálogo ao vivo. Viraram **Templates** e **Exemplos**, que são os termos
  correntes. A pasta continua `pages/` e o degrau continua Página: a escada é
  a taxonomia, o menu é o que a pessoa lê.
