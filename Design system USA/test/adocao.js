/* =========================================================================
   YBERA DESIGN SYSTEM · MEDIDOR DE ADOÇÃO

   Responde a uma pergunta só, e responde com número: quanto desta página
   já é o sistema, e quanto ainda é decisão avulsa?

   Cole no console de qualquer página — a ybera.us em produção, uma
   tela-prova, ou uma página do próprio sistema.

     Devolve { adocao, deriva, tokens, detalhe } e imprime tabela.

   -------------------------------------------------------------------------
   COMO ELE MEDE, E POR QUE ASSIM

   Adoção NÃO é "quantos elementos têm classe yb-". Uma página pode ter mil
   elementos e nove décimos deles serem <div> de layout sem cor nem tipo
   próprios — contá-los infla o número sem que nada tenha melhorado.

   O que ele conta é DECISÃO VISUAL: todo elemento que declara cor, cor de
   fundo, tamanho de fonte, raio ou sombra diferentes do pai tomou uma
   decisão. A pergunta é se essa decisão saiu do sistema ou de outro lugar.

   E ele mede DERIVA em separado: quantos valores distintos a página pratica
   em cada eixo. Uma página com 20 tamanhos de fonte não tem escala, ainda
   que todos venham de token — foi assim que a loja chegou a 11.2px e 14.4px.
   ========================================================================= */
(() => {
  'use strict';

  /* ----------------------------------------------------------------- util */
  const hex = (c) => {
    const m = (c || '').match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    if (m.length > 3 && parseFloat(m[3]) === 0) return null;   // transparente
    return '#' + m.slice(0, 3).map(n => Math.round(+n).toString(16)
      .padStart(2, '0')).join('').toUpperCase();
  };
  const raiz = getComputedStyle(document.documentElement);
  const token = (n) => raiz.getPropertyValue(n).trim();

  /* --------------------------------------------------- paleta do sistema */
  // Lê os tokens da própria página: se a folha não carregou, isto vem vazio,
  // e o relatório diz isso em vez de medir contra uma paleta imaginária.
  const FAMILIAS = ['gray', 'magenta', 'gold'];
  const DEGRAUS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const paleta = new Set();
  for (const f of FAMILIAS)
    for (const d of DEGRAUS) {
      const v = token(`--yb-${f}-${d}`);
      if (v) paleta.add(v.toUpperCase());
    }
  for (const e of ['success', 'warning', 'danger', 'info']) {
    const v = token(`--yb-${e}-600`);
    if (v) paleta.add(v.toUpperCase());
  }
  paleta.add('#FFFFFF'); paleta.add('#000000');

  const escalaFonte = new Set(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']
    .map(s => token(`--yb-font-size-${s}`)).filter(Boolean));
  const escalaRaio = new Set(['none', 'sm', 'md', 'lg', 'xl', 'full']
    .map(s => token(`--yb-radius-${s}`)).filter(Boolean));

  const tokensCarregados = paleta.size > 2;

  /* --------------------------------------------------- varredura do DOM */
  const px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const conta = (mapa, chave) => mapa.set(chave, (mapa.get(chave) || 0) + 1);

  const fontes = new Map(), raios = new Map(), cores = new Map(), fundos = new Map();
  const foraDaPaleta = new Map();
  let decisores = 0, doSistema = 0;
  const invasores = new Map();     // quem toma decisão sem ser do sistema

  const elementos = [...document.body.querySelectorAll('*')].filter(e => {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR|META|LINK)$/.test(e.tagName)) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  for (const el of elementos) {
    const s = getComputedStyle(el);
    const pai = el.parentElement ? getComputedStyle(el.parentElement) : null;

    const mudaCor = pai && s.color !== pai.color;
    const mudaFundo = hex(s.backgroundColor) && (!pai || s.backgroundColor !== pai.backgroundColor);
    const mudaFonte = pai && s.fontSize !== pai.fontSize;
    const temRaio = parseFloat(s.borderTopLeftRadius) > 0;
    const temSombra = s.boxShadow && s.boxShadow !== 'none';

    if (mudaFonte) conta(fontes, px(s.fontSize) + 'px');
    if (temRaio) conta(raios, px(s.borderTopLeftRadius) + 'px');
    if (mudaCor) {
      const h = hex(s.color);
      if (h) { conta(cores, h); if (tokensCarregados && !paleta.has(h)) conta(foraDaPaleta, h); }
    }
    if (mudaFundo) {
      const h = hex(s.backgroundColor);
      if (h) { conta(fundos, h); if (tokensCarregados && !paleta.has(h)) conta(foraDaPaleta, h); }
    }

    // decidiu alguma coisa visual?
    if (!(mudaCor || mudaFundo || mudaFonte || temRaio || temSombra)) continue;
    decisores++;

    const classes = [...el.classList];
    if (classes.some(c => c.startsWith('yb-'))) { doSistema++; continue; }
    // herdar de um ancestral do sistema conta: o filho de um .yb-card que só
    // recebe a cor do pai não tomou decisão nenhuma por fora
    if (el.closest('[class*="yb-"]') && !mudaFundo && !temRaio && !temSombra) { doSistema++; continue; }

    const marca = classes.find(c => c.length > 2) || el.tagName.toLowerCase();
    conta(invasores, marca);
  }

  /* ---------------------------------------------------------- resultado */
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const adocao = pct(doSistema, decisores);

  const foraDaEscalaFonte = [...fontes.keys()]
    .filter(f => escalaFonte.size && ![...escalaFonte].some(t => px(t) + 'px' === f
      || Math.abs(parseFloat(t) * 16 - parseFloat(f)) < 0.5));
  const foraDaEscalaRaio = [...raios.keys()]
    .filter(r => escalaRaio.size && ![...escalaRaio].some(t => px(t) + 'px' === r));

  const topo = (m, n = 8) => Object.fromEntries(
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n));

  const cor = adocao >= 80 ? '#1F7A34' : adocao >= 50 ? '#8A5A00' : '#B3261E';
  console.log(`%c ADOÇÃO · ${adocao}% de ${decisores} decisões visuais `,
    `background:${cor};color:#fff;font-weight:700;padding:2px 4px`);

  if (!tokensCarregados) {
    console.warn('tokens/ybera.css não está carregado nesta página — '
      + 'a deriva foi medida, mas a paleta não pôde ser conferida.');
  }

  console.table({
    'adoção': adocao + '%',
    'decisões do sistema': doSistema,
    'decisões de fora': decisores - doSistema,
    'tamanhos de fonte distintos': fontes.size,
    'raios distintos': raios.size,
    'cores de texto distintas': cores.size,
    'cores de fundo distintas': fundos.size,
    'cores fora da paleta': foraDaPaleta.size,
  });

  return {
    url: location.pathname,
    tokensCarregados,
    adocao: adocao + '%',
    decisoes: { total: decisores, doSistema, deFora: decisores - doSistema },
    deriva: {
      // Uma página com 20 tamanhos não tem escala, ainda que todos venham de
      // token. O sistema pratica 11 degraus, e os três maiores são fluidos.
      tamanhosDeFonte: fontes.size, foraDaEscalaFonte: foraDaEscalaFonte.slice(0, 10),
      raios: raios.size, foraDaEscalaRaio: foraDaEscalaRaio.slice(0, 10),
      coresDeTexto: cores.size, coresDeFundo: fundos.size,
    },
    foraDaPaleta: topo(foraDaPaleta),
    // quem mais decide por fora do sistema — é por aqui que a migração começa
    ondeMigrar: topo(invasores, 12),
  };
})();
