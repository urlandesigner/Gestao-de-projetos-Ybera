# Transbordo de sprint no Panorama

Pedido do Urlan em 05/10/2026. **Não implementado** — parado antes de codar, à
espera de confirmar o `ASOF` contra o DevOps real e de decidir três pontos.

## Problema

A coluna "Anterior" do Panorama mostra a sprint **como ela está hoje**, não como
ela foi. O DevOps guarda só a iteração *atual* de cada item: quem não fechou e
foi repriorizado some do backlog da sprint antiga sem deixar rastro lá.

Caso real, Sprint 19 do Squad Ecommerce (05/10/2026): o Urlan via 2 PBIs no
nome dele. Teve 5. Os outros três — 49931, 49959 e 51676 — saíram da 19 em
28/09, no dia em que a Sprint 20 começou. O histórico confirmou `Sprint 19 →
Sprint 20` nos três.

A leitura que isso produz é errada em duas direções: a sprint parece ter tido
menos escopo do que teve, e some a informação de que houve transbordo — que é
justamente o que o gestor precisa saber.

## Como descobrir, sem pagar caro

Histórico item a item (`workitems/{id}/updates`) resolve, mas é **uma chamada
por item** — inviável numa tela de abertura com ~170 itens por sprint.

O WIQL aceita a cláusula `ASOF`, que responde a sprint inteira numa consulta:

```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.IterationPath] = 'B2C\2026\Sprint 19'
ASOF '2026-09-25T23:59:59Z'
```

Comparando com a composição de hoje:

- nos dois conjuntos → entregue, ou ainda na sprint
- só no `ASOF` → **transbordou**; o `IterationPath` atual diz para onde foi
- só hoje → entrou na sprint depois que ela fechou (retroativo)

Custo: **uma consulta a mais por coluna passada**. Nenhuma mudança em `api.js` —
`ASOF` viaja dentro do texto da query que `runWiql` já envia.

## Pendente antes de codar

1. **Confirmar o `ASOF` na organização.** É cláusula padrão do WIQL, mas nunca
   foi testada contra `dev.azure.com/nivello`. Se a retenção de histórico for
   curta, pode vir vazio. O trecho de verificação está no transcript de
   05/10/2026; ele compara `agora` × `ASOF` e deve acusar os três ids acima.
2. **O placar.** Hoje a Sprint 19 daria `2/2`. Com transbordo vira `2/5` ou
   continua `2/2` com uma linha "3 transbordaram"? **Recomendação: a segunda.**
   O que a sprint entregou não muda por ela ter tido mais escopo, e misturar as
   duas coisas num placar só é como se perde a régua.
3. **Item que saiu e voltou** aparece nos dois conjuntos e não leva selo.
   Parece certo, mas é escolha consciente.

## Escopo

Só a coluna "Anterior". Em "Em curso" e "Próxima" a pergunta não existe.

## Desenho previsto

`resumoDeSprint` ganha `transbordou` + `destino`; o cartão mostra um selo
discreto (`→ Sprint 20`) ao lado do estado. A conta de transbordo é função pura
em `core.js`, com teste próprio — como `itensDaIteracao` e `foraDaManutencao`.
