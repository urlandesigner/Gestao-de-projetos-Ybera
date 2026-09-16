/* Navegação da documentação. Nada aqui é componente do sistema — é cromo das
   fichas, e por isso vive fora de ybera-components.js, que é o que vai para a
   loja. */
(() => {
  'use strict';

  /* A COLUNA ABRE MOSTRANDO O ITEM ABERTO.
     A lista tem quase 40 nomes e a coluna mostra uns 20. Abrindo um componente do
     fim da lista, a coluna nascia no topo e o item aberto ficava escondido na
     rolagem: o realce existia e ninguém via. Não dá para resolver em CSS —
     não há como mandar um contêiner rolar até um filho.

     `scrollTop` e não `scrollIntoView`: o segundo rola TODOS os ancestrais que
     rolam, e a página abriria fora do topo. Aqui só a coluna se mexe. */
  const coluna = document.querySelector('.nav');
  const aberto = coluna && coluna.querySelector('a[aria-current="page"]');
  // Abaixo de 900 a coluna vira faixa horizontal e não rola: nada a fazer.
  if (coluna && aberto && coluna.scrollHeight > coluna.clientHeight + 1) {
    const meio = aberto.offsetTop - (coluna.clientHeight - aberto.offsetHeight) / 2;
    coluna.scrollTop = Math.max(0, meio);
  }
})();
