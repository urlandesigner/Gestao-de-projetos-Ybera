# Futuro — o que começa quando

**Data:** 2026-08-20 · Quinta tela trazida do Radar (lá o arquivo é
`horizonte.html`, mas o rótulo na navegação é **Futuro** — é esse nome que o
usuário reconhece, e é o que a Central usa).

## O que mostra

Épicos em aberto distribuídos em faixas, pelo **trimestre em que começam**.
Vocabulário e faixas iguais aos do Radar, de propósito:

| Faixa | Regra | Rótulo secundário |
|---|---|---|
| **Agora** | início ≤ fim do trimestre corrente | "até 30 de set." |
| **A seguir** | início ≤ fim do trimestre seguinte | "até 31 de dez." |
| **Depois** | início mais distante | "Roadmap" |
| **Sem data de início** | sem `StartDate` | "não entra em faixa" |

As três faixas de trimestre aparecem **sempre**, mesmo vazias: "nada começa no
próximo trimestre" é informação, não ausência dela. O grupo "sem data" só aparece
quando existe alguém nele.

Cada linha traz tipo, título, a janela (`21 de jul. – 31 de ago.`) e o `#id`,
clicável para o DevOps. Ordem: por data de início, desempatando pela data-alvo.

## Duas regras que evitam mentira

**Concluído sai.** Um épico entregue é história — o lugar dele é o Report. Deixá-lo
numa faixa de futuro afirmaria trabalho por vir que já passou.

**Épico sem `StartDate` não cai em "Depois".** Em JS, `null <= data` é sempre
`false`, então um item sem início escorregaria naturalmente para a última faixa —
e "Depois" afirma "começa depois do próximo trimestre", fato que a base não
sustenta. Vai para um grupo próprio, explícito. É o mesmo princípio das outras
telas: sem dado, não se inventa posição.

## Trimestre derivado, não configurado

O Radar tinha o trimestre escrito à mão nos metadados do ciclo. Aqui ele sai da
data de hoje: `fimDoTrimestre(agora, 0)` e `fimDoTrimestre(agora, 1)`, em UTC como
o resto do projeto. A função atravessa o ano — em novembro, o "próximo" é o Q1 do
ano seguinte (testado).

## Dados

Nenhuma consulta nova: terceira página a ler o `baseState` (junto de Produtos e
Report), que já traz `StartDate`. Carrega sob demanda, uma vez por sessão.

A classe de lista virou `.lista-linhas`, compartilhada com o Report — as duas
páginas mostram linhas compactas com a mesma anatomia, e manter dois nomes para o
mesmo componente só criaria divergência.

## Degradação

Se os épicos não tiverem `StartDate` no DevOps, quase tudo cai em "Sem data de
início" — e a página fica dizendo exatamente isso, em vez de espalhar projetos em
faixas inventadas. É a mesma limitação que o Radar documenta no próprio rodapé.
