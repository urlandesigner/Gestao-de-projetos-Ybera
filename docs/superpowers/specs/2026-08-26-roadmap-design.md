# Roadmap — a linha do tempo das iniciativas, no report

**Data:** 2026-08-26 · Nova seção no report, primeira fonte de dado fora do
Azure DevOps.

## O que mostra

Uma linha do tempo horizontal: uma barra por iniciativa, do início ao fim,
numa escala de meses, com uma marca vertical em "hoje". É o horizonte longo do
documento — trimestres à frente — complementando "Próximos passos" (semanas) e
"Entregas do mês" (o que já aconteceu).

Cada iniciativa mostra só título, período e — quando o Notion tiver marcado —
um selo de concluído. Nada além disso: sem prioridade, sem dono, sem
progresso interno. O que o Notion não guarda como dado estruturado, o report
não inventa.

## De onde vem o dado

Diferente do resto do report, o Roadmap **não** é lido do Azure DevOps: as
datas de início/fim dessas iniciativas só existem no Notion (confirmado com o
usuário — os épicos correspondentes no DevOps não têm `StartDate` populado
para esse fim).

E o Notion **não pode ser chamado direto do navegador** — a API não libera
CORS para origem arbitrária, ao contrário da API do Azure DevOps (que o
report já chama direto do client-side hoje). Enfiar um token de Notion no
localStorage pra contornar isso replicaria o problema que o PAT do DevOps já
tem, com uma superfície de ataque a mais, sem necessidade.

Solução: um arquivo estático no projeto, `assets/roadmap.json`, escrito por
mim (Claude) quando o usuário pedir explicitamente ("atualiza o roadmap") —
não em todo report, não automaticamente. Nesse momento eu leio o Notion via
integração e regravo o arquivo só se algo mudou. O report lê esse arquivo
como leria qualquer outro asset estático: sem chamada de rede nova, sem
segredo no navegador, sem servidor.

Fica desatualizado entre um pedido e outro — é um snapshot, não um espelho ao
vivo. `atualizadoEm` no próprio arquivo deixa isso rastreável.

### Filtro: só iniciativas com a tag azul "USA"

O Notion do usuário tem produtos de vários POs na mesma base. O corte é a tag
"USA" (azul) — confirmado com o usuário que itens com a tag "Demais Global"
(cinza) ficam de fora, mesmo que apareçam misturados na visão original do
Notion.

Esse filtro só é validado contra o schema real do Notion na primeira
atualização (a integração está com token inválido nesta sessão — 401). Se o
schema real não tiver uma propriedade de tag clara equivalente ao que a
captura de tela mostrou, isso volta como pergunta antes de eu inventar um
critério.

## Forma do dado (`assets/roadmap.json`)

```json
{
  "atualizadoEm": "2026-08-26",
  "itens": [
    { "titulo": "Ajustes Loja USA Compliance Google", "inicio": "2026-07-01", "fim": "2026-09-30" },
    { "titulo": "Nova PDP USA", "inicio": "2026-07-01", "fim": "2026-08-31", "status": "concluido" }
  ]
}
```

`status` é opcional; hoje só `"concluido"` tem tratamento visual (selo). Datas
em `AAAA-MM-DD`. Sem `id` do Notion no arquivo — não há link de volta pro
Notion no report, pela mesma razão que não há link pro DevOps (quem lê não
tem acesso, e mandar pra tela de login é pior que não oferecer nada).

## Onde vive no report

Seção própria, `id="roadmap"`, entra na nav-pílula depois de "Próximos
passos" — fecha o documento do horizonte mais curto pro mais longo. Como as
outras seções, só aparece se houver dado (`itens.length > 0`).

Entra nos dois modos:
- **PO:** o `render()` do report.js busca `assets/roadmap.json` (fetch same
  -origin, sem CORS, sem token) e passa pro `htmlReport`.
- **Leitura:** os itens vão assados no pacote do link (`#r=`), do mesmo jeito
  que `produtos` e `decisoes` hoje — o stakeholder vê sem precisar de nada.

## Visual

Sem replicar o board escuro do Notion — o report é documento editorial claro,
não dashboard. SVG, dentro de um container com `overflow-x: auto` próprio
(a página nunca rola pro lado; a linha do tempo rola dentro de si, tanto no
celular quanto no print):

- Uma linha por iniciativa, **em lista plana ordenada por início** — sem a
  indentação em árvore que o Notion mostra (aquilo é estrutura visual da
  ferramenta deles, não dado que o `roadmap.json` carrega; se o schema real
  tiver relação de dependência entre itens, isso é evolução futura, não v1).
- Escala de meses no topo, régua fina.
- Marca vertical no dia de hoje.
- Barra em gradiente roxo→verde — os mesmos hex que a barra de rumo do
  produto já usa (`#7c5cff` → `#34d399`).
- Selo sutil de concluído (mesmo padrão textual usado em Entregas, sem verde
  gritante nem ícone de troféu).

## Atualização

Ação explícita do usuário ("atualiza o roadmap"). Eu leio o Notion (com token
válido — pendente de checagem nesta sessão), comparo com o `roadmap.json`
atual e só reescrevo se algo mudou. Nenhuma automação, nenhum cron.

## Fora de escopo (v1)

- **Notion ao vivo do navegador:** CORS não permite; um proxy/servidor
  mudaria a arquitetura 100% estática do projeto — não foi o caminho
  escolhido.
- **Hierarquia/indentação em árvore** como no Notion: sem dado de dependência
  confirmado; fica pra quando (e se) existir.
- **Edição do roadmap pelo report:** é só leitura; qualquer mudança de datas
  acontece no Notion, e chega ao report no próximo "atualiza o roadmap".
- **Progresso interno, prioridade, dono:** não são dados que o Notion (nesse
  recorte) guarda de forma confiável pra afirmar no documento.
