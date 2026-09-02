# Design System Ybera — Fundação

**Data:** 2026-08-31
**Escopo:** fundação (tokens, tipografia, cor, espaço, forma, elevação, motion)
**Não inclui:** componentes, aplicação em tema, tokens de mercado BR

---

## 1. Contexto

A loja ybera.us não tem design system. Tem sedimento: três ferramentas empilhadas
(Shopify + Ecomposer + Tailwind + Judge.me), cada uma trazendo os próprios defaults.

Varredura em 2.494 elementos da home, em 2026-08-31:

| Sintoma | Medição |
|---|---|
| Famílias tipográficas carregadas | **6** — Inter, Jost, Open Sans, Nunito Sans, Alia-Adobe-Clean, GTStandard-M |
| Magentas divergentes | **3** — `#CA235F` botão, `#DB2855` Judge.me, `#DD2955` avulso |
| Raios de borda distintos | **12** — 9999, 22, 20, 16, 12, 10, 8, 6, 4, 2, 50%, 100 |
| Tamanhos de fonte | **20** — incluindo `11.2px` e `14.4px`, resíduo de escala relativa quebrada |
| Origens de neutro | **3** — Tailwind zinc + Tailwind gray + cinzas avulsos |
| Hierarquia semântica | o `h1` da home renderiza **14px em Arial** |

O Ecomposer já expõe slots de design system, todos preenchidos com `#ffffff`:

```
--ecom-global-colors-primary:   #ffffff
--ecom-global-colors-secondary: #ffffff
--ecom-global-colors-accent:    #ffffff
--ecom-global-colors-text:      #ffffff
```

O encaixe existe e nunca foi preenchido.

### A loja BR

`ybera.com.br` roda **Wake Commerce** (não Shopify), com Nunito Sans + Syne e uma
paleta de cinzas e verde. Mesmo grupo, mesma marca no nome — e nenhuma semelhança
visual com a US.

---

## 2. Decisões

| # | Decisão | Escolha | Consequência |
|---|---|---|---|
| 1 | Destino | **Independente de plataforma** | O DS é o contrato, não a implementação. Com Shopify de um lado e Wake do outro, CSS custom properties é o único denominador comum. |
| 2 | Relação com o visual atual | **Híbrido** | Preserva o equity de cor; redesenha tipografia, escala, espaçamento, forma e densidade. |
| 3 | Multi-marca | **Mesma marca, mercados diferentes** | Um conjunto de tokens de identidade. A camada de mercado só varia o que é local. |
| 4 | Fatiamento | **Fundação validada contra telas-prova** | A escala é testada contra conteúdo real antes de existir componente. |
| 5 | Tipografia | **Schibsted Grotesk, família única** | Hierarquia por escala, peso e tracking. |
| 6 | Primária | **`#1E1E1F`** | Grafite carrega a identidade; magenta é cor de ação. |
| 7 | Cor de ação | **`#CA235F`** | Confirmado após ver nas telas-prova. Magenta em CTA, foco e promoção. |

### Sobre a decisão 5

A direção "grotesca única" foi escolhida entre três (Didone editorial,
grotesca única, geométrica + serifa). O trade-off foi declarado e aceito: ela
resolve a inconsistência mas **não resolve a indistinção** — é o visual default do
e-commerce americano.

Mitigação: a personalidade não pode vir da família, então vem de outros vetores —
contraste de escala, tracking negativo agressivo em display, dourado como acento
editorial e generosidade de espaço. Esses vetores estão codificados nos tokens.

### Sobre a decisão 6

A primária foi corrigida durante o processo. A inferência inicial (magenta, a partir
do que a loja renderiza) estava errada: magenta aparece muito, mas é cor funcional.
Confundir "aparece muito" com "é a marca" é precisamente o que produziu os três
magentas divergentes.

---

## 3. Arquitetura de tokens

| Camada | Exemplo | Quem consome |
|---|---|---|
| **0 · Primitivo** | `--yb-gray-950: #1E1E1F` | ninguém, diretamente |
| **1 · Semântico** | `--yb-text-primary: var(--yb-gray-950)` | todo componente |
| **2 · Componente** | `--yb-btn-pad-block` | só onde há desvio local |
| **· Mercado** | `[data-market="br"]` | locale, moeda, meios de pagamento |

A camada 1 é a única que alguém precisa ler para entender o sistema. Cada desvio na
camada 2 fica visível e auditável.

**Justificativa:** hoje trocar o magenta exige caçar três hex em três ferramentas.
Com a camada 0, é uma linha. Quando a BR entrar, pluga em `[data-market="br"]` sem
duplicar um token de identidade.

---

## 4. Regras duras

Regras que o sistema precisa policiar, derivadas de medição:

1. **Piso de texto é `gray-600`** (5.15:1). O `gray-500` mede **3.44:1** e reprova
   em AA — existe para ícone e borda, nunca para palavra. Isso condena o `zinc-500`
   atual (4.83:1, usado em 266 elementos), que passa raspando.

2. **Dourado nunca é texto sobre claro.** O `gold-500` de marca mede **2.39:1**
   sobre branco — reprova até para texto grande. Sobre grafite mede **6.96:1**.
   Para texto sobre claro existe `--yb-accent-text` (gold-700, **5.68:1**).

3. **Magenta não é texto sobre grafite** (3.11:1) — serve para botão e ícone.

4. **Componente nunca consome a camada 0.**

---

## 5. Escopo entregue (v0.1)

```
Design system USA/
├── README.md
├── tokens/
│   ├── 00-primitives.css   118 tokens
│   ├── 01-semantic.css     132 tokens
│   └── ybera.css
└── docs/
    └── index.html          documentação navegável
```

Conteúdo: 3 rampas de cor de 11 degraus (33 valores validados), 4 estados,
11 papéis tipográficos, 14 degraus de espaço, 5 raios, 5 elevações, motion,
foco, z-index, breakpoints e alvo de toque.

**Fora do escopo desta versão:** componentes, aplicação no tema Shopify, tokens
de mercado BR.

---

## 6. Verificação executada

- Rampas geradas por script com checagem automática de **monotonia de luminância**
  (um bug foi encontrado e corrigido: o dourado estava ancorado no degrau errado,
  produzindo `gold-400` mais escuro que `gold-500`).
- Contraste WCAG 2.1 medido para os 33 degraus; valores anotados no CSS.
- Validação de integridade referencial entre camadas: **0 referências quebradas**.
- Auditoria de primitivos órfãos revelou duas lacunas reais na camada semântica
  (família tipográfica e elevação sem token de intenção) — ambas corrigidas.
- Documentação renderizada e verificada em 375px e 1200px: **0 overflow horizontal**
  (um bug de `min-width:auto` em grid foi encontrado e corrigido).

---

## 7. Pendências e riscos

| Item | Estado |
|---|---|
| ~~CTA magenta ou grafite?~~ | **Resolvido em 2026-08-31: magenta.** O botão de compra é `--yb-action-bg: magenta-600`. Grafite segue como identidade e como ação secundária. A hierarquia fica: grafite = quem a marca é, magenta = o que fazer agora. |
| **Indistinção da grotesca** | Risco aceito e declarado. Mitigado pelos vetores de distinção; a verificar nas telas-prova. |
| **Google Fonts** | Schibsted Grotesk vem do Google Fonts. Avaliar self-host para performance e privacidade (GDPR na UE, se houver tráfego). |
| **Tokens de mercado BR** | Arquitetura pronta, nenhum token produzido. |
| **Adoção** | O DS é contrato. Sem um plano de aplicação no tema Shopify, ele não muda a loja. |

---

## 8. Próximo passo

Construir as **telas-prova** — uma PDP (densa, comercial) e a home (editorial,
respirada). São os dois extremos do sistema e servem como instrumento de teste,
não como entregável. O que sobreviver às duas é token de verdade.

As telas-prova também resolvem a pendência do CTA, apresentando as duas versões.
