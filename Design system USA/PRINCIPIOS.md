# Princípios

Cinco regras para decidir sozinho. **Estão em ordem**: quando duas se chocam,
a de cima ganha, e a de baixo perde por escrito.

A ordem é a parte que importa. Um princípio que não conflita com nada não
decidiu nada — ele só descreveu o que todo mundo já ia fazer.

---

## 1 · Medido vence opinado

Nenhum valor entra sem número. Cor entra com contraste calculado; alvo de toque
entra com pixel conferido; token novo entra com as duas ocorrências apontadas.

Os contrastes anotados em `00-primitives.css` são **medidos**, e
`test/validate.mjs` confere se o número escrito no comentário bate com o real —
porque comentário desatualizado é pior que comentário nenhum: ele mente com
autoridade.

**Como isso decide:** "acho que esse cinza está claro demais" não é argumento.
`3.44:1` é.

**O que essa regra custa:** propor uma cor dá mais trabalho. É o preço.

---

## 2 · Acessibilidade vence identidade

Quando a marca e a legibilidade discordam, a legibilidade ganha — e a marca é
reformulada para caber, não a régua é afrouxada.

O caso já aconteceu e está no sistema: `gold-500` **é** a cor de marca, e mede
2.39:1 sobre branco. Ela não virou exceção. Virou uma regra dura — dourado nunca
é texto sobre claro — e ganhou um substituto medido, `gold-700`, a 5.68:1.

**Como isso decide:** o pedido "deixa o dourado no título, é a cor da marca" tem
resposta pronta, e a resposta não depende de quem está na sala.

**O que essa regra custa:** a paleta de marca não sai inteira para todo lugar.
O dourado vive sobre superfície escura, onde mede 6.96:1 — e é lá que ele é
bonito de verdade.

---

## 3 · Nativo vence reimplementado

Se o navegador já faz, o sistema não refaz.

Modal é `<dialog>`: foco preso, `Esc` e backdrop vêm de graça. Acordeão é
`<details>`: teclado, leitor de tela e o `Ctrl+F` do navegador achando texto
dentro de seção fechada — nada disso foi escrito aqui.

O corolário é o JavaScript: ele é **opcional**. Sem ele a página continua
funcionando; ele adiciona comportamento, nunca sustenta a página.

**Como isso decide:** antes de escrever um componente, procure o elemento. A
pergunta não é "como eu faço um dropdown acessível", é "o que já é acessível e
faz isso".

**O que essa regra custa:** menos controle sobre a aparência de alguns
controles. Vale a troca todas as vezes.

---

## 4 · Reversível vence perfeito

Toda mudança tem de ser desfeita por **remoção**, nunca por reescrita às pressas
numa noite de deploy.

É por isso que a ponte traduz em vez de substituir, que cada fase do
[PLANO.md](PLANO.md) reverte apagando uma linha, e que a depreciação tem três
tempos — marcar, conviver, remover — em vez de um.

**Como isso decide:** entre a solução certa que exige tocar quarenta templates e
a solução boa que entra como uma linha e sai como uma linha, entra a segunda —
e a primeira vira fase própria, com medição antes e depois.

**O que essa regra custa:** o sistema convive com o que ele veio substituir, às
vezes por meses. A ponte é feia de propósito e tem data para sair.

---

## 5 · Consistência vence otimização local

Uma tela ficar 3% melhor não justifica o sistema ficar 1% mais ambíguo.

A regra operacional é a dos **dois usos**: uma ocorrência é exceção e vive na
camada 2, justificada no lugar; duas ocorrências são padrão e sobem para a
camada 1. `--yb-card-title-lines` nasceu assim — de títulos reais de 2 a 5
linhas desalinhando o grid, não de preferência.

**Como isso decide:** "só nesta página" é um pedido legítimo, e a resposta é
camada 2 com o motivo escrito ao lado. O que não existe é o desvio silencioso.

**O que essa regra custa:** a primeira tela de um padrão novo fica um pouco pior
que se tivesse sido desenhada sozinha. A décima fica muito melhor.

---

## Quando nenhum dos cinco resolve

Aí é decisão, não aplicação de regra — e decisão vai para
[`decision-log/`](decision-log/), com o que se ganhou, o que se perdeu e a
evidência. O log existe justamente para que a próxima pessoa não precise
redescobrir o raciocínio, e para que discordar dele seja possível: não dá para
revisar uma decisão que nunca foi escrita.
