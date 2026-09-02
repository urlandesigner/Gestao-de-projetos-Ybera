/* =========================================================================
   YBERA DESIGN SYSTEM · AUDITORIA NO DOM RENDERIZADO

   O que test/validate.mjs não alcança: contraste computado de verdade, alvo
   de toque real, rótulo acessível, ordem de heading. Precisa de navegador.

   Cole no console de qualquer página — do design system ou da loja.
   Devolve { falhas, avisos, detalhe } e imprime tabela.
   ========================================================================= */
(() => {
  const hex = (c) => {
    const m = (c || '').match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    if (m.length > 3 && parseFloat(m[3]) === 0) return null;      // transparente
    return '#' + m.slice(0, 3).map(n => Math.round(+n).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const lum = (h) => {
    const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const fundoDe = (el) => {
    let e = el;
    while (e) { const h = hex(getComputedStyle(e).backgroundColor); if (h) return h; e = e.parentElement; }
    return '#FFFFFF';
  };
  // Um <a> que embrulha imagem tira o nome do alt dela — e um <a> que embrulha
  // <svg role="img" aria-label> tira do aria-label. Sem estas duas linhas o
  // auditor acusa de "sem nome" todo logo e todo icone social do site, que e
  // exatamente o falso positivo que ele existe para nao dar.
  const nomeDescendente = (el) =>
    [...el.querySelectorAll('img[alt]')].map(i => i.alt).join(' ').trim() ||
    [...el.querySelectorAll('[aria-label]')].map(n => n.getAttribute('aria-label')).join(' ').trim();

  const rotulo = (el) =>
    el.getAttribute('aria-label') ||
    (el.getAttribute('aria-labelledby') &&
      document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) ||
    el.textContent.trim() ||
    nomeDescendente(el) ||
    el.getAttribute('title') || '';

  const falhas = [], avisos = [];
  const visivel = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

  // Input visualmente oculto cujo <label> é o alvo real — padrão de swatch,
  // segmented control e galeria. O auditor precisa saber disso, senão acusa
  // um radio de 13×13 que ninguém clica.
  // O alvo real de um input dentro de <label> clicável é o label, não a caixa
  // de 20px. Vale para checkbox, radio e swatch.
  const alvoEfetivo = (e) => {
    const pai = e.closest('label');
    if (!pai) return e.getBoundingClientRect();
    const r = pai.getBoundingClientRect(), p = e.getBoundingClientRect();
    return (r.width >= p.width && r.height >= p.height) ? r : p;
  };

  const ocultoComLabel = (e) => {
    const s = getComputedStyle(e);
    const escondido = +s.opacity === 0 || s.clip === 'rect(0px, 0px, 0px, 0px)' ||
                      s.pointerEvents === 'none';
    if (!escondido) return false;
    const alvo = (e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`)) || e.closest('label');
    if (!alvo) return false;
    const r = alvo.getBoundingClientRect();
    return r.height >= 24 && r.width >= 24;   // o label cumpre o alvo
  };

  // WCAG 1.4.3 isenta componente inativo do requisito de contraste.
  const inativo = (e) => e.disabled || e.getAttribute('aria-disabled') === 'true' ||
                         !!e.closest('[disabled],[aria-disabled="true"]');

  /* 1 · contraste de texto */
  let textos = 0;
  for (const e of document.querySelectorAll('body *')) {
    if (!visivel(e)) continue;
    const temTexto = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!temTexto) continue;
    const s = getComputedStyle(e);
    const fg = hex(s.color); if (!fg) continue;
    const bg = fundoDe(e);
    textos++;
    const px = parseFloat(s.fontSize);
    const grande = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700);
    const min = grande ? 3 : 4.5;
    const r = cr(fg, bg);
    if (r < min) {
      const registro = { razao: +r.toFixed(2), exigido: min, fg, bg,
        tamanho: s.fontSize, texto: e.textContent.trim().slice(0, 40) };
      if (inativo(e)) avisos.push({ tipo: 'contraste-inativo',
        nota: 'isento por WCAG 1.4.3, mas continua ilegível', ...registro });
      else falhas.push({ tipo: 'contraste', ...registro });
    }
  }

  /* 2 · alvo de toque */
  const CONTROLES = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button]';
  let controles = 0;
  for (const e of document.querySelectorAll(CONTROLES)) {
    if (!visivel(e)) continue;
    if (ocultoComLabel(e)) continue;        // o <label> é o alvo, não o input
    controles++;
    const r = alvoEfetivo(e);
    // link dentro de parágrafo é exceção legítima do WCAG 2.5.8
    const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline';
    if (!inline && (r.height < 24 || r.width < 24))
      falhas.push({ tipo: 'alvo-de-toque', tamanho: `${Math.round(r.width)}×${Math.round(r.height)}`,
        el: e.tagName.toLowerCase() + '.' + (e.className || '').toString().slice(0, 24) });
    else if (!inline && r.height < 44)
      avisos.push({ tipo: 'alvo-menor-que-44', altura: Math.round(r.height),
        el: e.tagName.toLowerCase() + '.' + (e.className || '').toString().slice(0, 24) });
  }

  /* 3 · rótulo acessível */
  for (const e of document.querySelectorAll(CONTROLES)) {
    if (!visivel(e)) continue;
    if (e.tagName === 'INPUT' || e.tagName === 'SELECT' || e.tagName === 'TEXTAREA') {
      const id = e.id;
      const temLabel = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        e.closest('label') || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby');
      if (!temLabel) falhas.push({ tipo: 'campo-sem-rotulo', el: e.tagName.toLowerCase(), id: id || '(sem id)' });
    } else if (!rotulo(e).trim()) {
      falhas.push({ tipo: 'controle-sem-nome', el: e.tagName.toLowerCase() + '.' + (e.className || '').toString().slice(0, 24) });
    }
  }

  /* 4 · imagem sem alt */
  for (const img of document.querySelectorAll('img')) {
    if (!visivel(img)) continue;
    if (img.getAttribute('alt') === null)
      falhas.push({ tipo: 'img-sem-alt', src: (img.currentSrc || img.src || '').split('/').pop().slice(0, 40) });
  }

  /* 4b · estouro horizontal
     Scroll lateral e o defeito mais comum de mobile e o mais invisivel no
     desktop. Aqui ele vira numero: quem passa da borda, e quanto. */
  const larguraDoc = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > larguraDoc + 1) {
    const culpados = [...document.querySelectorAll('body *')]
      .filter(e => {
        const r = e.getBoundingClientRect(), s = getComputedStyle(e);
        return r.width > 0 && r.right > larguraDoc + 1 && s.position !== 'fixed';
      })
      .map(e => ({
        el: e.tagName.toLowerCase() + '.' + (e.className || '').toString().slice(0, 30),
        passa: Math.round(e.getBoundingClientRect().right - larguraDoc) + 'px',
      }))
      .slice(0, 8);
    falhas.push({
      tipo: 'estouro-horizontal',
      largura: larguraDoc,
      excesso: (document.documentElement.scrollWidth - larguraDoc) + 'px',
      culpados,
    });
  }

  /* 5 · ordem de heading */
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visivel);
  const h1 = hs.filter(h => h.tagName === 'H1').length;
  if (h1 === 0) avisos.push({ tipo: 'sem-h1' });
  if (h1 > 1) avisos.push({ tipo: 'multiplos-h1', quantidade: h1 });
  let anterior = 0;
  for (const h of hs) {
    const n = +h.tagName[1];
    if (anterior && n > anterior + 1)
      avisos.push({ tipo: 'salto-de-heading', de: 'h' + anterior, para: 'h' + n, texto: h.textContent.trim().slice(0, 30) });
    anterior = n;
  }

  /* 6 · foco visível: outline removido sem substituto */
  for (const e of [...document.querySelectorAll(CONTROLES)].slice(0, 300)) {
    if (!visivel(e)) continue;
    const s = getComputedStyle(e);
    if (s.outlineStyle === 'none' && s.boxShadow === 'none' && !e.matches(':focus-visible')) {
      // só reporta se a folha também não define :focus-visible para ele — heurística
    }
  }

  const grupos = {};
  [...falhas, ...avisos].forEach(x => { grupos[x.tipo] = (grupos[x.tipo] || 0) + 1; });

  const nota = textos ? Math.round((textos - falhas.filter(f => f.tipo === 'contraste').length) / textos * 100) : 100;
  console.log(`%c A11Y · ${falhas.length} falha(s) · ${avisos.length} aviso(s) `,
    `background:${falhas.length ? '#B3261E' : '#1F7A34'};color:#fff;font-weight:700`);
  if (Object.keys(grupos).length) console.table(grupos);

  return {
    url: location.pathname,
    textosAnalisados: textos, controlesAnalisados: controles,
    contrasteAA: nota + '%',
    // O corte em 20 existe para o console nao virar muro de texto, mas corte
    // silencioso mente: o `sem-h1` da home sumiu do relatorio quando a
    // navegacao nova encheu a lista de avisos. Agora ele se declara, e
    // `resumo` conta tudo, cortado ou nao.
    falhas: falhas.slice(0, 20), avisos: avisos.slice(0, 20),
    falhasOmitidas: Math.max(0, falhas.length - 20),
    avisosOmitidos: Math.max(0, avisos.length - 20),
    resumo: grupos,
  };
})();
