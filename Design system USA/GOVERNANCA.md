# Governança

Como este design system muda sem quebrar quem depende dele.

Este documento é o **como muda**. Ao lado dele:
[PRINCIPIOS.md](PRINCIPIOS.md) é o *como decidir*,
[CONTRIBUINDO.md](CONTRIBUINDO.md) é a *mecânica*, e
[`decision-log/`](decision-log/) é o *por que ficou assim*.

## Modelo

**Centralizado.** Quem mantém o sistema decide as camadas 0 e 1; quem constrói
uma tela decide a camada 2, no lugar e com o motivo escrito. É o modelo certo
para o tamanho de hoje — uma loja, um mantenedor — e o que ele custa é
evidente: o sistema anda na velocidade de uma pessoa.

O sinal de que ele deixou de servir é a fila. Se pedido de token ou componente
passar a esperar mais que a tela que o pediu, o modelo vira federado: cada
time contribui, o mantenedor revisa. Não antes — federação sem fila é só
cerimônia.

## Versionamento

Semver adaptado. O número comunica **o que quem consome precisa fazer**.

| Mudança | Versão | O que significa para quem usa |
|---|---|---|
| Token semântico removido ou com significado alterado | **maior** `1.0.0` | quebra: exige revisão do consumidor |
| Componente ou padrão novo; token novo; variante nova | **menor** `0.5.0` | seguro: nada existente muda |
| Correção de contraste, ajuste de valor, documentação | **correção** `0.4.1` | seguro: aplique e siga |

**Trocar o valor de um token semântico não é mudança maior.** Se
`--yb-action-bg` deixa de ser magenta e vira grafite, quem consome não muda uma
linha — é exatamente para isso que a camada existe. Mudança maior é quando o
token **some** ou passa a significar outra coisa.

## Depreciação

Nada é removido de uma vez. O ciclo é:

1. **Marcar.** Comentário `@deprecated` no CSS, apontando o substituto.
2. **Conviver.** O token antigo passa a referenciar o novo. Duas versões menores.
3. **Remover.** Só na próxima versão maior, e listado no changelog.

```css
/* @deprecated desde 0.4 — use --yb-text-muted. Remoção em 1.0. */
--yb-text-light: var(--yb-text-muted);
```

O validador reprova `@deprecated` que não nomeie o substituto: depreciar é uma
promessa com prazo, e promessa sem endereço deixa quem consome sem para onde ir.

### O caso do token que não tem consumidor e não está errado

Nem todo token sem consumidor é defeito. Alguns fazem parte de um contrato que
se consome inteiro — os quatro `track` de cada papel tipográfico valem zero e
existem porque Figma Variables e Style Dictionary iteram as quatro propriedades
do papel, e um papel com três quebra a iteração.

Esses declaram `@reservado`, com o motivo:

```css
/* @reservado — a rampa clara sobre escuro vem em par. Enviar só o `muted`
   é o que fez o CSS cair na camada 0 da primeira vez. */
--yb-text-secondary-inverse: var(--yb-gray-300);
```

A distinção existe para que o aviso de "token sem consumidor" possa chegar a
zero. Aviso que ninguém consegue zerar é aviso que ninguém lê — ele ficou em 23
itens por dez versões antes desta regra existir.

## Como propor uma mudança

**Token novo:** só se o caso aparecer **duas vezes** em lugares diferentes. Uma
ocorrência é exceção e vive na camada 2; duas é padrão e sobe para a camada 1.

O `--yb-card-title-lines` nasceu assim: as telas-prova mostraram títulos de 2 a 5
linhas desalinhando o grid. Defeito observado, não preferência.

**Componente novo:** antes de criar, tente montar com os existentes. Se conseguiu,
é padrão — vai para `patterns/`, não para `components/`.

**Mudança de cor:** roda o cálculo de contraste antes. Nenhum valor entra sem
medição — os números anotados em `00-primitives.css` são medidos, não estimados.

## O que cada camada aceita

| Camada | Aceita mudança de | Quem decide |
|---|---|---|
| 0 · Primitivos | valor de rampa, degrau novo | quem mantém o sistema |
| 1 · Semânticos | mapeamento, token novo | quem mantém o sistema |
| 2 · Componente | desvio local justificado | quem constrói o componente |
| Mercado | locale, moeda, meio de pagamento | quem cuida do mercado |

## As três regras que não se negociam

1. **Componente não consome cor da camada 0.** Espaço e peso podem; cor, não.
   Única exceção: `bridge/ybera-bridge.css`, que não é componente — é tradutor para
   variáveis externas ao sistema.
2. **Nenhum texto abaixo de `--yb-text-muted`** (gray-600, 5.15:1).
3. **Todo controle tátil tem 44px** de altura mínima.

Quebrar qualquer uma delas exige mudança maior e justificativa no changelog.

## Antes de publicar uma versão

O checklist virou comando. Estas oito checagens rodam sozinhas:

```bash
npm run check
```

`test/validate.mjs` verifica integridade entre camadas, disciplina de cor
(inclusive `rgba()`, `oklch()` e cor nomeada — a notação nunca foi o assunto),
monotonia das rampas, contraste anotado versus medido, as regras duras, foco
visível, `prefers-reduced-motion`, links entre documentos, e se todo artefato
derivado está em dia com a fonte: `dist/`, `INVENTARIO.md` e as cópias de CSS
que as telas-prova carregam. Sai com código 1 se algo falhar, e roda em CI a
cada push que toque esta pasta.

**Artefato derivado nunca se edita à mão.** `dist/`, `dist/ybera-tokens.json`,
`INVENTARIO.md` e `_captura/nova-loja/yb/` saem de `./build.sh`. O CI compara o
que o build gerou com o que foi commitado — porque rodar o validador logo depois
do build sempre passa: ele confere o derivado contra a fonte que acabou de
gerá-lo. Quem pega a defasagem é o `git`.

O que ele **não** alcança precisa de navegador:

```js
// cole test/a11y.js no console de qualquer página
```

Ele mede contraste computado de verdade, alvo de toque, rótulo acessível e ordem
de heading — coisas que só existem no DOM renderizado.

Só sobra manual:

- [ ] `CHANGELOG.md` atualizado, com a razão e não só o quê
- [ ] Um leitor de tela de verdade passou pela mudança
- [ ] Se a mudança envolveu uma escolha que a próxima pessoa poderia
      razoavelmente fazer diferente, ela virou um DDR em
      [`decision-log/`](decision-log/)

## O que a máquina não alcança

Vale saber o tamanho do que o verde **não** prova:

- **Regressão visual.** O CI confere que o CSS obedece às regras, não que a tela
  continua parecida com ontem. `npm run check` verde e layout quebrado convivem.
- **Comportamento em execução.** O validador lê o JavaScript como texto — que
  não usa `innerHTML`, que o modal devolve o foco, que o toast pausa. Ele não
  abre um navegador e clica.
- **Leitor de tela.** Nenhuma checagem estática substitui ouvir a página.

Nada disso é bug do CI: é o limite dele, e está aqui escrito para que ninguém
confunda verde com pronto.
