/* =========================================================================
   YBERA DESIGN SYSTEM · RETRATO DE LAYOUT

   Por que geometria e nao pixel:

   Comparar imagens exige navegador headless, e o sistema inteiro se sustenta
   sem uma dependencia sequer — 80 checagens que rodam com `node` e mais nada.
   Trocar isso por um pacote de 300 MB para pegar deslocamento de 2px seria
   caro pelo motivo errado.

   Geometria pega o que interessa: caixa que muda de tamanho, cor que troca,
   fonte que encolhe, elemento que some. Nesta sessao tres quebras passaram
   pelos 80 testes verdes — a gaveta que aparecia fechada, o painel que virava
   tres telas de altura, o quadro que perdia 2px. Todas as tres teriam sido
   pegas aqui, porque todas mudaram numero.

   O que ele NAO pega: cor bonita, alinhamento otico, hierarquia. Isso continua
   sendo trabalho de olho humano — e esta escrito para ninguem confundir.

   Uso:
     1. abra a pagina, cole isto no console
     2. copy(JSON.stringify(retrato, null, 2))  →  salve em test/atual.json
     3. node tools/baseline.mjs                 →  diz o que mudou
   ========================================================================= */
(() => {
  const LARGURA = document.documentElement.clientWidth;

  // raiz de componente: classe `yb-x` sem `__` nem `--`. O modificador anda
  // junto da raiz, entao medir os dois seria contar a mesma caixa duas vezes.
  const ehRaiz = (c) => /^yb-[a-z0-9]+$/.test(c);

  const visivel = (e) => {
    const r = e.getBoundingClientRect();
    if (!r.width && !r.height) return false;
    const s = getComputedStyle(e);
    return s.visibility !== 'hidden' && s.display !== 'none';
  };

  // chave estavel: nao usa indice global, que muda quando alguem insere uma
  // secao no meio. Usa a secao dona + a classe + a posicao dentro dela.
  const chaveDe = (el, classe) => {
    const dono = el.closest('section[id], [data-yb-secao]');
    const escopo = dono ? (dono.id || dono.getAttribute('data-yb-secao')) : 'pagina';
    const irmaos = [...(dono || document.body).querySelectorAll('.' + classe)];
    const i = irmaos.indexOf(el);
    return `${escopo}|${classe}|${i}`;
  };

  const num = (v) => Math.round(parseFloat(v) || 0);

  const itens = {};
  for (const el of document.querySelectorAll('[class*="yb-"]')) {
    if (!visivel(el)) continue;
    const raizes = [...el.classList].filter(ehRaiz);
    if (!raizes.length) continue;
    const classe = raizes[0];
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    itens[chaveDe(el, classe)] = {
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: num(s.fontSize),
      cor: s.color,
      fundo: s.backgroundColor,
      // estoura para fora do proprio pai? foi o defeito do stepper e do header
      estoura: el.scrollWidth > el.clientWidth + 1,
    };
  }

  const retrato = {
    pagina: location.pathname,
    largura: LARGURA,
    // scrollWidth do documento: a checagem que pegou o header de 351px numa
    // tela de 320. Vale sozinha.
    documento: document.documentElement.scrollWidth,
    pecas: Object.keys(itens).length,
    itens,
  };

  console.log(`%c retrato · ${retrato.pagina} · ${LARGURA}px · ${retrato.pecas} peças `,
    'background:#1E1E1F;color:#fff;font-weight:700');
  window.retrato = retrato;
  return retrato;
})();
