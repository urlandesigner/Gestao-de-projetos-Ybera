# Pendências — a lista de trabalho do que exige ação

**Data:** 2026-08-20 · Segunda das quatro telas trazidas do Radar. Derivada
inteiramente do Azure DevOps, como o [Panorama](2026-08-20-panorama-design.md).

## Por que não é só a lista do Panorama, maior

O Panorama já mostra até 6 itens em "Atenção agora" — ele dá o número e um
vislumbre. Esta página é a **lista de trabalho**: tudo, agrupado por motivo,
ordenado por gravidade e com o contexto de quem pode destravar. O bloco do
Panorama ganhou um "ver todas (N) →" que aponta pra cá quando passa de 6.

No Radar, "Pendências" era outra coisa: decisões de fora do time, digitadas à
mão (quem decide, até quando, qual o impacto). O DevOps não tem esse conceito —
está documentado no `prosa.js` do Radar. Aqui a página é automática e responde
uma pergunta diferente: **o que, do que já está no DevOps, exige ação minha.**

## Três grupos exclusivos

Colunas fixas: **Bloqueados** · **Atrasados** · **Parados**.

| Grupo | Regra |
|---|---|
| Bloqueados | estado de impedimento (`stateBucket === 'atencao'`) |
| Atrasados | data-alvo anterior a hoje |
| Parados | sem alteração há 14 dias ou mais |

Concluído nunca é pendência — sai antes de qualquer teste.

**Exclusividade por precedência: bloqueado > atrasado > parado.** Um item travado
e vencido aparece só em Bloqueados. Sem isso, a soma das colunas não fecharia com
o total e o mesmo cartão apareceria três vezes na mesma tela. A informação não se
perde: o cartão carrega uma etiqueta "também atrasado · parado".

**Ordem dentro de cada coluna** segue o que torna aquele grupo grave: bloqueados
pelo mais tempo sem toque, atrasados pela data-alvo mais antiga, parados pelo
maior tempo sem alteração.

## Rampa de gravidade nas cores

Bolinha vermelha (bloqueado) → âmbar (atrasado) → cinza (parado). É a única cor
âmbar do projeto, e existe para não gastar o vermelho duas vezes: travado e
esquecido são urgências diferentes. Segue a regra da casa — cor é informação, e
cor de tipo (épico/feature/PBI) nunca é usada para estado.

## O cartão

Título, `#id`, tipo, a etiqueta de marcas secundárias quando houver, e no máximo
quatro linhas: **Estado**, **Responsável** (quem destrava — "sem responsável"
quando vazio, que é em si um achado), **Prazo** ("venceu 14 de ago.", em âmbar) e
**Sem toque** ("há 20 d"). As duas últimas só aparecem quando dizem algo que o
estado não diz.

Cartão enxuto de propósito: o Urlan pediu para remover Time e Atividade dos
cartões de Meus itens, e a mesma preferência vale aqui.

## Dados

Nenhum campo novo além dos que o Panorama já trouxe (`Title`, `TargetDate`,
`ChangedDate`). A coleta dos itens de todos os times virou uma função
compartilhada (`itensDeTodosOsTimes`), usada pelas duas páginas.

## Degradação

- **Sem data-alvo no DevOps:** a coluna Atrasados fica vazia com "nada aqui" —
  não há como saber de atraso sem prazo. Bloqueados e Parados seguem inteiros.
- **Nada pendente:** a página diz "Nada bloqueado, atrasado ou parado".
- **Sem token / erro num time:** igual às outras páginas.

## Fora de escopo

Filtros (time, responsável, tipo) — a página nasce sem eles de propósito; se o
uso pedir, entram depois, reaproveitando o `filterItems` que já existe.
