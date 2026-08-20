# Report — o que foi concluído, mês a mês

**Data:** 2026-08-20 · Quarta e última das telas trazidas do Radar.

## O que mostra

Um bloco por mês, do mais recente para o mais antigo, com o mês corrente aberto
e os anteriores recolhidos — a mesma leitura do report do Radar. Usa `<details>`
nativo: abrir e fechar não custa uma linha de JavaScript.

Cada mês traz o total e a quebra por nível ("5 itens · 2 features · 3 PBIs") e a
lista das entregas: tipo, título, data e `#id`, cada linha clicável para o
DevOps. Dentro do mês, épicos vêm antes de features, que vêm antes de PBIs; no
mesmo nível, o mais recente primeiro.

No Radar, esta página tinha um parágrafo escrito à mão por mês, e itens
concluídos "fora da base". Aqui não existe nenhum dos dois: o que a página diz é
o que o DevOps registra.

## A data de conclusão, e o que fazer quando ela não existe

A data preferida é **`ClosedDate`** — o campo que o DevOps preenche quando o item
entra em estado concluído.

Quando o template do processo não preenche esse campo, a página cai em
**`ChangedDate`**. Para um item terminal essa é a melhor aproximação disponível,
mas ela erra se alguém editar o item meses depois de concluí-lo. Por isso o
fallback nunca é silencioso:

- a data aparece com **`~`** na frente (`~12 de ago.`), com explicação no
  `title`;
- o mês mostra uma nota dizendo quantos itens usaram a aproximação.

Item concluído sem nenhuma das duas datas fica fora: não há mês onde colocá-lo, e
inventar um seria pior do que omitir.

## Dados: sem consulta nova

Reaproveita a consulta que a página de Produtos já faz (`wiqlProdutos`, sem o
corte de 30 dias — essencial aqui, senão o report só conheceria o mês corrente).
O estado virou **base compartilhada** (`baseState`): uma carga sob demanda serve
as duas páginas, guardando os itens crus além dos épicos rolados. Abrir Report
depois de Produtos (ou o contrário) não repete a busca.

`FIELDS_BASE` ganhou `Microsoft.VSTS.Common.ClosedDate` e `System.ChangedDate`.

Os times são **somados** nesta página: um report mensal responde "o que
entregamos", não "o que cada time entregou". Cada item guarda o projeto de
origem para o link continuar certo.

## Degradação

- **Nada concluído:** "Nada concluído registrado ainda."
- **Sem token, erro de rede, PAT recusado:** igual às outras páginas — mensagem
  no topo, o que já estava carregado permanece.

## Fora de escopo

- O parágrafo editorial do mês (o Radar tem; exigiria um lugar para escrever e
  guardar texto, e o repositório é público).
- Exportar/imprimir o report: o `Cmd+P` do navegador resolve o caso simples, e
  formato de impressão próprio é outro projeto.
