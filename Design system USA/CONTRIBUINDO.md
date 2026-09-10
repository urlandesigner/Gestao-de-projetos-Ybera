# Contribuindo

O que fazer, na ordem, para que uma mudança entre sem quebrar quem depende
dela. Regras de versão e depreciação estão em [GOVERNANCA.md](GOVERNANCA.md);
como decidir está em [PRINCIPIOS.md](PRINCIPIOS.md). Aqui é a mecânica.

## O laço local

```bash
./serve.sh            # http://localhost:8080 — porta fixa, sem cache
npm run check         # build + 94 checagens, o mesmo que roda no CI
```

`serve.sh` manda `Cache-Control: no-store`: editar um token e recarregar mostra
a mudança na hora, sem cache-bust manual. É sempre a porta 8080 — uma só, para
todo o projeto.

`npm run check` **regenera `dist/` antes de validar**, então um bundle defasado
falha aqui e não vira surpresa no tema Shopify.

## Antes de propor qualquer coisa

Três perguntas, nesta ordem. A primeira que der "sim" encerra o assunto.

1. **Já existe?** `INVENTARIO.md` lista as 48 peças que embarcam, com classe
   base e maturidade. A doc em `/components/` e `/patterns/` mostra cada uma.
2. **Dá para compor com o que existe?** Se dá, é **padrão**, e vai para
   `patterns/` — não para `components/`.
3. **O caso apareceu duas vezes?** Uma ocorrência é exceção e vive na camada 2,
   justificada no lugar. Duas é padrão e sobe para a camada 1.

## Token novo

- Cor entra com **contraste calculado**, nunca estimado. O validador confere se
  o número que você escreveu no comentário bate com o valor real, e reprova se
  não bater.
- Nome descreve o **papel**, não o valor. `--yb-text-muted`, não
  `--yb-gray-claro`.
- Componente consome **só a camada 1**. Cor da camada 0 dentro de componente é
  falha dura no CI — e a correção é sempre criar o semântico que falta, nunca
  abrir exceção.
- Espaço, peso e tracking vêm direto da camada 0. Ver
  [DDR-004](decision-log/DDR-004-espaco-sem-camada-semantica.md).

## Componente novo

Antes de abrir o arquivo, procure o elemento nativo que já faz aquilo
(princípio 3). Depois:

- Prefixo `yb-` em tudo, sem exceção — estes componentes convivem com o tema
  Shopify, o Ecomposer, o Tailwind e o Judge.me na mesma página.
- Nomenclatura em **inglês**, `bloco__elemento--modificador`.
- Foco visível declarado. Nunca `outline: none` sem substituto.
- Alvo tátil de 44px. Se for menor, o comentário ao lado tem de dizer por quê —
  o validador exige a justificativa por escrito.
- Comportamento liga por `data-yb-*`, nunca por classe de estilo: mudar o visual
  não pode quebrar o comportamento.
- Respeita `prefers-reduced-motion`.

E — a parte que mais se esquece — **a seção na doc entra no mesmo commit**.
Componente que embarca sem doc aparece como **Alfa** no `INVENTARIO.md` e
reprova o CI. Não é burocracia: componente que ninguém encontra é componente que
a próxima pessoa reescreve, e aí o sistema tem dois.

## Mudar um valor existente

Trocar o valor de um token semântico **não é mudança maior**. Se `--yb-action-bg`
deixa de ser magenta e vira grafite, quem consome não muda uma linha — é
exatamente para isso que a camada existe.

Mudança maior é quando o token **some** ou passa a significar outra coisa.

## Tirar alguma coisa

Nada é removido de uma vez:

1. **Marcar** — `@deprecated` no CSS, dizendo para onde ir e em que versão sai.
   O validador reprova um `@deprecated` que não nomeia substituto.
2. **Conviver** — o token antigo passa a referenciar o novo. Duas versões
   menores.
3. **Remover** — só na próxima versão maior, listado no changelog.

Um token que existe mas não deve ser usado, e não está de saída, declara
`@reservado` com o motivo. É o caso dos quatro `track` de cada papel
tipográfico, que valem zero e existem porque quem consome o contrato por
programa itera as quatro propriedades.

## Registrar a decisão

Se a mudança envolveu uma escolha que a próxima pessoa poderia razoavelmente
fazer diferente, ela vira um DDR em [`decision-log/`](decision-log/) —
o que se ganhou, o que se perdeu, e a evidência.

Não precisa de DDR para corrigir um typo. Precisa para decidir que espaço não
ganha camada semântica.

## Antes de abrir o PR

```bash
npm run check
```

Verde é obrigatório. Depois disso sobra o que a máquina não alcança:

- [ ] `test/a11y.js` colado no console das páginas que a mudança toca —
      contraste computado, alvo de toque, rótulo acessível e ordem de heading só
      existem no DOM renderizado.
- [ ] `CHANGELOG.md` atualizado, com a razão e não só o quê.
- [ ] Um leitor de tela de verdade passou pela mudança.
- [ ] Se mexeu em componente que a loja já usa, `test/adocao.js` rodado antes e
      depois. O número que não foi medido antes não prova nada depois.

## O que o CI reprova

`test/validate.mjs` roda a cada push que toque esta pasta. Ele checa integridade
entre camadas, disciplina de cor (inclusive `rgba()` e cor nomeada, não só
`#hex`), monotonia das rampas, contraste anotado versus medido, as regras duras,
foco visível, `prefers-reduced-motion`, `dist/` e `INVENTARIO.md` em dia, versão
única em todo lugar, e se cada componente da folha aparece na doc.

Ele **não** alcança o que só existe no navegador. Para isso existe
`test/a11y.js`, e ele é manual de propósito: um número de contraste computado
sobre o DOM real vale mais que dez checagens estáticas.
