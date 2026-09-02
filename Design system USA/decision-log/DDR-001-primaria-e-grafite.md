# DDR-001 · A primária é o grafite, não o magenta

- **Estado:** aceita
- **Desde:** 0.1 · 2026-08-31
- **Substitui:** —
- **Toca:** `tokens/00-primitives.css`, `tokens/01-semantic.css`, `bridge/ybera-bridge.css`

## Decisão

A primária da marca é o grafite `#1E1E1F` — `--yb-gray-950`, o topo da rampa
neutra.

O magenta `#CA235F` — `--yb-magenta-600` — é cor de **função**, não de
identidade. Ele existe onde há uma decisão a tomar: comprar, enviar, confirmar.

E é **um** magenta. Os três que a loja praticava ao mesmo tempo viraram este.

## Intenção

Identidade e ação são dois trabalhos diferentes, e uma cor só não faz os dois.
Se o magenta fosse a identidade, ele estaria em toda parte — e uma cor que está
em toda parte não aponta para nada. O botão de comprar deixaria de ser o ponto
mais quente da tela porque a tela inteira seria quente.

O grafite carrega a identidade justamente porque não compete. A rampa neutra
inteira é derivada dele (matiz 240°, saturação 1.6%), então ele não é só a cor
do texto: é o cinza de tudo — borda, superfície afundada, seção escura,
sombra. A marca aparece na página mesmo quando nenhum magenta aparece.

Separar as duas cores também é o que deixa a ação ser trocada sem tocar na
identidade. `--yb-action-bg` pode virar grafite amanhã e quem consome não muda
uma linha.

## Quando se aplica

Cor de ação — `--yb-action-bg`, `--yb-action-bg-hover`, `--yb-action-bg-active`
e `--yb-text-link` — só onde existe uma decisão do cliente. Botão primário,
link, paginação, "escrever review".

Peso institucional — cabeçalho de seção escura, ação secundária, fundo inverso —
é grafite: `--yb-action-secondary-bg` e `--yb-bg-inverse` apontam para
`gray-950`.

## Quando não se aplica

- **Acento dourado.** `--yb-accent-on-dark` (gold-500) é a terceira cor da
  marca e só vive sobre superfície escura. Ver DDR-006.
- **Estado.** Sucesso, aviso, perigo e informação têm rampa própria; nenhum
  deles empresta o magenta para dizer "algo aconteceu".

## Evidência

- 0.1 decidiu: *"Primária `#1E1E1F` — grafite carrega a identidade"*, e deixou
  a cor de ação em aberto. 0.3 fechou a pendência: *"Cor de ação: magenta
  `#CA235F`. Grafite segue como identidade e como ação secundária."*
- A loja praticava **três** magentas ao mesmo tempo: `#CA235F` no botão do
  tema, `#DB2855` no Judge.me e `#DD2955` avulso — mais `#B21F54` no hover do
  tema. O comentário da rampa em `00-primitives.css` registra os três e a
  consolidação; a tabela do `PLANO.md` registra "3 valores → 1".
- Medido, e anotado no primitivo: grafite **16.66:1** sobre branco;
  magenta-600 **5.36:1** sobre branco, com `--yb-text-on-action` branco por
  cima.
- A consolidação acontece em produção na ponte: `--background-button`,
  `--jdgm-primary-color` e `--jdgm-write-review-bg-color` passam a apontar
  para `--yb-action-bg`. "Os três magentas do tema" saem no fim da fase 1 do
  plano de adoção.

## Consequência

O magenta perde o direito de aparecer por decoração. Toda vez que ele surge
numa tela, alguém tem de responder qual é a decisão ali — e se não houver
decisão, a cor está errada.

Trocar a cor de ação continua barato: pela governança, mudar o valor de um
token semântico não é mudança maior. A identidade é que ficou cara de mexer,
que é o resultado certo.
