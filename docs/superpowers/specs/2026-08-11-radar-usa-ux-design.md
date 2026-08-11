# Spec — Melhoria de UX/UI do Radar de Projetos USA

**Data:** 2026-08-11
**Arquivo alvo:** `Radar de projetos/Radar de Projetos USA.html` (HTML autocontido, sem dependências externas)
**Contextos prioritários:** desktop (link direto) e celular. Print e apresentação ao vivo são secundários, mas não podem regredir.
**Abordagem aprovada:** B — polish + upgrades de UX. Identidade visual, arquitetura das seções, copy e tokens principais permanecem.

## Contexto

O Radar é uma página bilíngue (PT/EN) que apresenta os 14 projetos da frente USA a stakeholders,
com dark mode, versão de impressão e dados extraídos do Notion embutidos em `const DATA`.
A auditoria de 2026-08-11 (desktop/mobile × light/dark, PT/EN) encontrou 1 bug de código,
3 achados críticos de UX, 6 moderados e 5 menores. Esta spec cobre a correção de todos.

## Mudanças

### 1. Correção do bug de listeners duplicados

O bloco `window.addEventListener("beforeprint"/"afterprint", …)` + `render()` aparece 4×:
dentro do handler de clique dos chips de filtro (~linha 1117), dentro dos handlers de
`btnPT` (~1302) e `btnEN` (~1312), e no nível raiz (~1330, o único correto).

- Remover os 3 blocos colados dentro de handlers, preservando o `render()` que cada handler precisa.
- Manter um único registro de `beforeprint`/`afterprint` no nível raiz.
- Resultado: nenhum comportamento visível muda; clicar filtro/idioma não acumula mais listeners.

### 2. Navegação mobile orientada (barra estreita <1060px)

- Em `markActive()`, rolar a barra horizontal para manter o link ativo visível
  (`scrollIntoView({inline:"center", block:"nearest"})` no elemento `<a>` ativo,
  apenas quando a barra tiver overflow horizontal; comportamento `smooth` guardado por
  `prefers-reduced-motion`, senão `instant`).
- Aumentar a área de toque dos links da nav para ≥44px de altura no modo estreito
  (padding vertical maior só no breakpoint), sem alterar o visual desktop.

### 3. Tiles compactos no mobile (<760px)

- Substituir o grid 2×2 (que hoje deixa o 3º tile órfão e números desalinhados) por
  **linhas compactas de largura total**: label (esquerda) + valor grande (direita) na mesma
  linha, rodapé abaixo em fonte menor. Um tile por linha.
- Desktop (≥760px) permanece exatamente como está.
- O swatch do tile "Esperando vocês" usa cor neutra (`--ink-3`) quando o valor é 0 e
  vermelho (`--critical`) apenas quando >0. O tile já tem a classe `flag` quando >0 — reusar essa condição.

### 4. Medidor do trimestre honesto

- Substituir a barra contínua proporcional por **segmentos discretos, um por projeto**
  do trimestre (hoje 6): verde = concluído, azul = em curso, cinza = não iniciado,
  com gap fixo entre segmentos (flex, `gap`).
- Ordem dos segmentos: concluídos, em curso, não iniciados.
- `aria-label` continua descrevendo "X de Y concluídos". Legenda mantida como está.
- Deve degradar bem na impressão (cores exatas já forçadas via `print-color-adjust`).

### 5. Filtros em linha rolável no mobile (<760px)

- Os chips passam de wrap (4 linhas) para **linha única com scroll horizontal** e máscara
  de fade na borda direita — mesmo padrão visual já usado na `.navlist` estreita.
- Desktop mantém o wrap atual.
- Chips com altura de toque ≥40px no mobile (padding vertical maior no breakpoint).

### 6. Acessibilidade

- **Contraste:** no tema claro, `--ink-3` muda de `#898781` para `#706e67` (≈4.9:1 sobre
  `--page`, passa WCAG AA para texto pequeno). Dark mode não muda (já passa, ≈5.4:1).
  Verificar que nada que dependia do tom antigo fique estranho (swatches, bullets do horizonte).
- **Foco visível:** regra global `:focus-visible` com `outline: 2px solid var(--accent); outline-offset: 2px`
  para botões, chips, links e summaries.
- **Movimento:** envolver `scroll-behavior:smooth` em `@media (prefers-reduced-motion: no-preference)`;
  transições existentes (chevrons) são pequenas e podem ficar.
- **Toggle de tema:** ícone alterna lua (no claro) / sol (no escuro) e `aria-label`
  alterna "Mudar para tema escuro"/"Mudar para tema claro" (PT) e equivalente (EN).
  O estado deve refletir também o tema inicial do sistema (`prefers-color-scheme`).

### 7. Detalhes finais

- **Favicon:** SVG inline via data URI (glifo de radar simples nas cores do tema, funciona em ambos).
- **Meta description** com o subtítulo PT da página.
- **Strip mobile (<560px):** empilhar título da quinzena, período e meta em coluna limpa;
  esconder o `.dot-sep` quando empilhado.

## O que explicitamente NÃO muda

- Ordem e conteúdo das seções, copy PT/EN, estrutura de `DATA` e `T`.
- Tokens de cor exceto `--ink-3` claro.
- Comportamento de impressão (apenas deixa de registrar listeners duplicados).
- Arquivo único autocontido — nenhuma dependência externa entra.

## Critérios de aceite

1. Clicar filtros/PT/EN não registra novos listeners de print (inspeção de código; sem regressão funcional).
2. No mobile, ao rolar até "Horizonte", o item ativo correspondente está visível na barra de navegação.
3. No mobile, os 3 tiles aparecem como linhas alinhadas, sem buraco.
4. O medidor mostra 6 segmentos discretos (3 azuis, 3 cinzas hoje) e o texto "0 de 6 concluídos".
5. Filtros em 1 linha rolável no mobile; wrap preservado no desktop.
6. Texto `--ink-3` no claro passa AA (≥4.5:1) em verificação de contraste.
7. Tab pelo teclado mostra anel de foco em todos os controles.
8. Toggle de tema mostra sol no escuro, lua no claro, com aria-label coerente no idioma ativo.
9. Nenhuma regressão visual no desktop light/dark, EN, print preview, fold "Planejado" e empty states.

## Verificação

Browser em 1280px e 375px × light/dark × PT/EN; print preview via CSS de impressão;
screenshots antes/depois de cada área alterada.
