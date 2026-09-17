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

  /* FILTRO DA COLUNA (e da galeria, quando ela existe).
     Com 37 peças, "onde está o cartão de oferta?" custava ler a lista inteira.
     O campo nasce `hidden` no HTML e só aparece aqui: sem script ele seria uma
     caixa que não filtra nada, e a galeria continua inteira e navegável.

     Filtra por NOME e pela linha de descrição — quem procura "frete" não sabe
     que a peça se chama "Certification seals". Grupo sem resultado some junto,
     senão sobra um título de família com o vazio embaixo.

     `/` foca o campo, como em toda documentação — menos quando já se está
     digitando em algum lugar, que é o defeito clássico desse atalho. */
  const caixa = document.querySelector('[data-yb-filtro]');
  if (!caixa) return;
  const painel = caixa.closest('.nav-filtro');
  const aviso = painel && painel.querySelector('.nav-conta');
  const itens = [...document.querySelectorAll('.nav li')];
  const grupos = [...document.querySelectorAll('.grade-grupo')];
  const pecas = [...document.querySelectorAll('.peca')];
  if (!itens.length) return;
  if (painel) painel.hidden = false;

  const sem = (t) => t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* A coluna casa so pelo NOME — e a lista de nomes, e quem digita ali sabe o
     que procura. Os cartoes da galeria casam tambem pela linha de descricao:
     quem procura "frete" nao sabe que a peca se chama "Certification seals". */
  function filtrar() {
    const termo = sem(caixa.value.trim());
    let achadas = 0;
    for (const li of itens) {
      const bate = !termo || sem(li.textContent).includes(termo);
      li.hidden = !bate;
      if (bate) achadas++;
    }
    for (const peca of pecas) {
      peca.hidden = !!termo && !sem(peca.textContent).includes(termo);
    }
    for (const g of grupos) g.hidden = !g.querySelector('.peca:not([hidden])');
    if (aviso) {
      aviso.textContent = !termo ? ''
        : achadas === 0 ? 'Nada com esse nome'
        : achadas === 1 ? '1 peça' : achadas + ' peças';
    }
  }

  caixa.addEventListener('input', filtrar);
  caixa.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { caixa.value = ''; filtrar(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const alvo = e.target;
    if (alvo && (alvo.matches('input, textarea, select') || alvo.isContentEditable)) return;
    e.preventDefault();
    caixa.focus();
  });
})();
