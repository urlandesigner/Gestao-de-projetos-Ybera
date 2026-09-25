# DDR-011 · O menu separa Componentes de Blocos

- **Estado:** aceita
- **Desde:** 0.13 · 2026-09-24
- **Toca:** `tools/escada.mjs`, `tools/moldura.mjs`, `tools/fichas.mjs`, `test/validate.mjs`, `index.html`
- **Não substitui** a [DDR-010](DDR-010-escada-atomica.md): a escada de quatro degraus continua sendo a árvore de arquivos e a ordem da cascata.

## Decisão

A navegação tem **dois grupos de peça**, e não um:

| Grupo no menu | Degraus | Peças |
|---|---|---|
| **Componentes** | átomos, moléculas | 35 |
| **Blocos** | organismos | 15 |

O degrau continua se chamando **organismo** na pasta, na folha, na regra de
classe base e na coluna do inventário. **Blocos** é o nome que aparece na tela.
A página do degrau declara os dois na mesma linha: *"Degrau 3 de 4 · Organismos
na escada atômica"*.

## Por quê

Uma lista alfabética única de 50 nomes punha `Button` e `Buy box` lado a lado
como se fossem a mesma espécie de decisão. Não são: um botão se escolhe dez
vezes por página, um bloco de compra é um só e já está lá.

O argumento que sustentava a lista única era que **ninguém pensa "preciso de
uma molécula"** — e ele continua de pé. Mas ele não vale para um corte de dois:
as pessoas pensam sim *"preciso de um cabeçalho"*, *"preciso da gaveta do
carrinho"*. Região de página é categoria reconhecível; molécula não é.

Os seis design systems conferidos em 24/09/2026 (Carbon, Primer, USWDS,
Material 3, Apple HIG, Atlassian) **não expõem átomo/molécula/organismo no
menu**. O único corte por nível que sobrevive num sistema grande é o do
Atlassian — `Primitives` separado dos componentes. **Um** corte, não três. É
o mesmo movimento feito aqui, na outra ponta da escada.

## O que isto não é

Não é uma segunda taxonomia. O corte é a regra que o build já cobra — *"é uma
região da página: tem lugar, e sobrevive sozinho numa tela"* —, então peça que
muda de degrau muda de grupo junto, sem nenhuma lista escrita à mão.

## Consequências

- A trilha das fichas de organismo é `Blocos / Nav`, sem degrau no meio: o
  grupo tem um degrau só, e `Blocos / Blocos / Nav` seria o mesmo nome duas
  vezes. As de componente seguem `Componentes / Átomos / Button`.
- **Blocos não tem página de grupo própria.** O item do menu abre a página do
  degrau, que já lista as quinze. Uma segunda página repetiria a lista com
  outro título — e lista repetida é a que envelhece pela metade.
- Os chips do catálogo passaram a ser três (`Todos 35 · Átomos 13 · Moléculas
  22`). Blocos e Templates não levam chip: grupo de um degrau só não tem para
  onde alternar, e chip sem destino é decoração com alvo de toque.
- `templates/` continua fora dos dois grupos, como já estava.
