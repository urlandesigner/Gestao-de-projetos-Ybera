# Central automática, sem token — plano

**Pedido do Urlan (14/10/2026):** publicar o sistema de modo que quem acessar
veja as informações sem cadastrar token; os dados vêm sozinhos do DevOps, sem
ninguém publicar nada; o roadmap vem do Notion; o relatório de entregas segue o
modelo de outubro (menu Entregas · Acompanhar · seletor de mês), com cartões que
a PO monta e escreve com o mínimo de trabalho.

**Este plano substitui** o `2026-10-13-editor-por-po.md`. Aquele resolvia "cada
PO publica com o token dela"; este tira o token de todo mundo.

---

## A ideia em uma frase

Um **robô** roda sozinho no próprio repositório de tempos em tempos: lê o DevOps
e o Notion com credenciais guardadas no GitHub, grava arquivos de dados no site,
e o site só lê esses arquivos. Ninguém precisa de token porque ninguém fala com
o DevOps — quem fala é o robô.

```
DevOps ─┐
        ├─► robô (GitHub Actions, a cada 30 min) ─► assets/dados/*.json ─► site público
Notion ─┘        credenciais em segredo do repo          (só muda quando o dado muda)
```

Isso não é infraestrutura nova: o `ideias-e-inovacao` já roda uma automação
igual (`.github/workflows/portal-skills.yml`, que gera e grava os arquivos do
Portal de Design). É o mesmo mecanismo, com outra tarefa.

---

## Decisão 1 — o que fica público (a mais importante)

Sem token e sem login, **o site é público para a internet inteira**. O GitHub
Pages do plano de vocês (Team) não tem página privada — isso só existe no
Enterprise.

Hoje a Central é protegida pelo token: sem ele, não aparece nada. Tirando o
token, tudo que ela mostra passa a estar num arquivo que qualquer pessoa com o
endereço abre — títulos de PBI, nomes de quem está atribuído, bloqueios, o que
está em cada sprint. O relatório já é público hoje; a Central não.

Três saídas:

| | |
|---|---|
| **Tudo público** | O mais simples. Aceitar que backlog e nomes ficam abertos na internet. |
| **Relatório público, Central com um login** | Um serviço de acesso na frente do site (ex.: Cloudflare Access, entrar com o e-mail da Ybera). Zero token para as POs — só login. Exige um domínio e alguém que configure uma vez. |
| **Relatório público, Central como hoje** | Robô alimenta o relatório; a Central continua pedindo token. Resolve "publicar dados", não resolve "token". |

**Recomendação:** decidir isto antes de qualquer código. Se "tudo público" for
aceitável para a Ybera, o plano abaixo vale inteiro. Se não, a Fase 1 muda de
destino (os dados da Central não podem ir para arquivo público).

## Decisão 2 — de quem é a credencial do robô

O robô precisa de **um** token do DevOps que enxergue os boards das três POs, e
de **um** token do Notion.

- **O seu token** funciona hoje — você já vê as três. Mas vence (90 dias pela
  política atual) e para no dia em que você sair da Ybera. A renovação vira um
  lembrete recorrente.
- **Uma conta de serviço** (usuário-robô da Nivello no DevOps) não depende de
  ninguém. É um pedido a mais.

**Recomendação:** começar com o seu, migrar para conta de serviço depois. Trocar
é só substituir o segredo — nada no código muda.

## O único pedido que não tem como evitar

Guardar segredo num repositório da organização exige **admin** no repositório.
Você tem *maintain*. Então um owner (Bruno-Biscaia, chaosimw, M-SSouza,
victorlimadeveloper ou vinagraff) precisa fazer **uma** destas, uma vez:

- cadastrar os dois segredos no `ideias-e-inovacao` (`DEVOPS_PAT` e
  `NOTION_TOKEN`), **ou**
- te dar admin no repositório, e você cadastra.

Nenhum token passa por mim nem por esta conversa: você ou o owner cola direto na
tela do GitHub (Settings → Secrets and variables → Actions).

---

## Como fica cada parte

### Central

Abre direto, sem assistente de token. Lê `assets/dados/` em vez de chamar o
DevOps. O seletor de PO continua igual — os dados das três estão lá. Um carimbo
"atualizado há X min" substitui o indicador de conexão.

O que se perde: o "agora" vira "há até 30 minutos". Para board de sprint é o
preço; se precisar de um ponto ao vivo, o modo com token pode continuar
existindo como opção para quem quiser.

### Roadmap — do Notion, sozinho

O robô lê a base do Notion e grava um roadmap por PO.

- **A ligar com você:** quais campos a base usa para nome, início e fim, e qual
  tag identifica cada PO. Hoje sei só que a do Urlan é a tag "USA" e que a base
  mistura produtos de várias POs. O token do Notion que eu tinha está inválido,
  então não consegui olhar.
- **Status:** como você disse, sem as tags de concluído/andamento. Fica só a
  barra no calendário. (Se um dia quiser, dá para derivar pela data — "já
  terminou", "em curso", "a começar" — mas seria afirmar pelo calendário, não
  pelo trabalho, e o documento teria que dizer isso.)
- **Pré-requisito no Notion:** uma integração interna com acesso de leitura à
  base, compartilhada com a página. Confirmar se você consegue criar ou se
  precisa do admin do workspace.

### Relatório — o modelo de outubro vira o padrão

Uma página só, com Entregas · Acompanhar · seletor de mês. As edições deixam de
ser escritas no código: **todo mês que tem dado vira uma edição sozinho**.

**Aba Acompanhar:** já é automática hoje. Passa a vir do arquivo do robô.

**Aba Entregas — liberdade com o mínimo de trabalho:**

O cartão nasce sozinho; a PO só escreve se quiser.

1. **Sem fazer nada:** cada Feature que teve PBI concluída no mês vira um
   cartão, com o título da Feature, a contagem e a lista do que fechou. O
   relatório nunca abre vazio.
2. **Escrevendo uma vez, no DevOps:** na descrição da Feature, um parágrafo que
   começa com **"Para o stakeholder:"** vira o texto do cartão. Mesma convenção
   do marcador **"Decisão:"** que o projeto já usa. Ela escreve onde já
   trabalha, e o robô pega na próxima rodada.
3. **Ajustes finos, também no DevOps:**
   - título de negócio → linha **"Título:"** na mesma descrição;
   - tirar um cartão → tag **`fora-do-relatorio`** na Feature;
   - imagens → anexar o print na Feature. O robô baixa o anexo (que no DevOps
     exige login) e publica no site, então o stakeholder vê sem login.

Isso troca "escrever o relatório" por "manter a Feature bem descrita" — que já é
trabalho de PO.

**Mês fechado congela:** o robô continua atualizando o mês até o dia 5 do mês
seguinte (para pegar o que foi movido para Done com atraso) e depois para de
mexer. O relatório de setembro não muda em novembro.

**Agosto/setembro e outubro de hoje:** os cartões escritos à mão viram a edição
de arquivo daqueles meses e continuam valendo. Links já compartilhados seguem
abrindo — o formato antigo continua sendo lido.

---

## O que sai do sistema

- O assistente de token na entrada (fica opcional, se a Decisão 1 mantiver a
  Central com acesso controlado).
- O botão **Publicar dados**, o `publicar-dados.sh` e o `aplicar-resumos.js`.
- As listas de edição e período escritas no código.
- A cópia manual do Notion para o `roadmap.json`.

## Fases

Cada uma entrega algo que funciona sozinho.

| | Entrega | Prova |
|---|---|---|
| **0** | Decisões 1 e 2 + segredos cadastrados | — |
| **1** | Robô lê o DevOps e grava `assets/dados/`; Central e relatório leem dali | A Central abre sem token mostrando o mesmo que mostrava com token |
| **2** | Roadmap automático do Notion, por PO | Mudar uma data no Notion aparece no site sem ninguém tocar em nada |
| **3** | Relatório no modelo de outubro, edições geradas por mês, cartões automáticos com o marcador | Uma Feature nova com "Para o stakeholder:" vira cartão sozinha |
| **4** | Imagens dos anexos + aposentar o que ficou manual | O botão Publicar dados não existe mais |

## Riscos que ficam

- **Credencial vence.** Com o seu token, a cada 90 dias. O robô avisa (o site
  mostra "dados de X dias atrás" em destaque) em vez de falhar calado.
- **Commits do robô no repositório compartilhado.** Ele só grava quando o dado
  muda, para não encher o histórico dos outros projetos.
- **Cota de automação.** A cada 30 min, em horário comercial, dá umas 450
  execuções de ~1 min por mês — cabe na cota do plano Team, que é dividida com
  os outros projetos.
- **Qualidade depende do DevOps.** Feature sem o marcador vira cartão só com
  título e lista. A Central mostra o que falta, como o botão "sem nome" já faz.
