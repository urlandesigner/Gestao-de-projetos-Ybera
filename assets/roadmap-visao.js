/* A LINHA DO TEMPO DO ROADMAP, desenhada uma vez e usada em dois lugares.

   Nasceu dentro do briefing-entregas.js, pro relatório do stakeholder. Em
   02/10/2026 o Urlan pediu o mesmo desenho no Panorama da Central — e a saída
   não podia ser copiar: as duas telas leem o MESMO assets/roadmap.json, e duas
   cópias do desenho divergem no primeiro ajuste. É a mesma lição do
   saneRoadmapItens, que já tinha mudado pro core.js pela mesma razão.

   Fica fora do core.js de propósito: o core não gera HTML, e abrir essa porta
   lá dentro levaria o resto do documento junto com o tempo.

   A folha que desenha isto é assets/roadmap.css, carregada pelas duas páginas.
   Marcação e folha andam juntas — mexeu numa classe aqui, mexa lá.

   UMD: window.CentralRoadmapVisao no navegador, module.exports no Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CentralRoadmapVisao = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Escape sem DOM: este módulo roda no Node (testes) e dentro do navegador.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Roadmap: o único dado que não vem do DevOps (assets/roadmap.json). Datas em
  // dia UTC pra escala e barra baterem sem fuso torto.
  const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const diaUTC = (iso) => Date.parse(iso + 'T00:00:00Z');

  function corpoRoadmap(itens, agora) {
    if (!itens.length) return '';
    const ordenados = [...itens].sort((a, b) => diaUTC(a.inicio) - diaUTC(b.inicio));
    const inicios = itens.map((it) => diaUTC(it.inicio));
    const fins = itens.map((it) => diaUTC(it.fim));
    const dMin = new Date(Math.min(...inicios));
    const dMax = new Date(Math.max(...fins));
    const escalaIni = Date.UTC(dMin.getUTCFullYear(), dMin.getUTCMonth(), 1);
    const escalaFim = Date.UTC(dMax.getUTCFullYear(), dMax.getUTCMonth() + 1, 1);
    const vao = Math.max(1, escalaFim - escalaIni);
    const pct = (t) => Math.min(100, Math.max(0, ((t - escalaIni) / vao) * 100));

    const limites = [];
    for (let t = escalaIni; t <= escalaFim; t = Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() + 1, 1)) {
      limites.push(t);
    }
    const meses = limites.slice(0, -1).map((t) => {
      const d = new Date(t);
      return `<span style="left:${pct(t).toFixed(2)}%">${MES_ABREV[d.getUTCMonth()]}<i>/${String(d.getUTCFullYear()).slice(2)}</i></span>`;
    });
    const divisores = limites.map((t) => `<div class="rl-rm-mes" style="--x:${pct(t).toFixed(2)}%"></div>`).join('');

    const linhas = ordenados.map((it) => {
      const esquerda = pct(diaUTC(it.inicio));
      const largura = Math.max(0.6, pct(diaUTC(it.fim)) - esquerda);
      // Status vem escrito à mão no roadmap.json, não do DevOps: a janela diz
      // quando era pra acontecer, o status diz o que está acontecendo. Sem
      // status, o item é plano — e o documento não afirma nada sobre ele.
      // Em andamento fala só pela barra escura: um selo ali repetia o que a cor
      // já diz, numa coluna de título que é estreita. O title é pro que a cor
      // sozinha não conta — passar o mouse, e leitor de tela.
      const feito = it.status === 'concluido';
      const testando = it.status === 'teste';
      const rodando = it.status === 'andamento';
      /* Os três estados declarados levam selo; quem não tem status é janela no
         calendário e não leva nada. "em andamento" ficou sem selo por um tempo,
         com o argumento de que a barra escura já dizia — mas quando "em teste"
         ganhou o dele, a ausência virou ambiguidade em vez de economia: cor sem
         legenda é enigma, e ficava valendo pra um estado e não pro outro.

         As palavras são as mesmas dos selos dos cartões, de propósito — o mesmo
         estado não pode ter dois nomes no mesmo documento.

         O `title` na barra saiu junto: ele existia porque a cor sozinha não
         contava, e agora a palavra está escrita ao lado do nome. */
      const selo = feito ? '<span class="rl-rm-feito">concluído</span>'
        : testando ? '<span class="rl-rm-teste">em teste</span>'
        : rodando ? '<span class="rl-rm-andamento">em andamento</span>' : '';
      const modBarra = feito ? ' rl-rm-barra-feita'
        : testando ? ' rl-rm-barra-teste'
        : rodando ? ' rl-rm-barra-andamento' : '';
      const tituloBarra = '';
      return `<div class="rl-rm-item">
        <span class="rl-rm-titulo"><span class="rl-rm-nome">${esc(it.titulo)}</span>${selo}</span>
        <span class="rl-rm-trilha"><span class="rl-rm-barra${modBarra}"${tituloBarra} style="left:${esquerda.toFixed(2)}%;width:${largura.toFixed(2)}%"></span></span>
      </div>`;
    }).join('');

    const hojeT = agora;
    // Rótulo junto da linha: sem ele, o traço vertical é uma marca sem legenda.
    const hoje = hojeT >= escalaIni && hojeT <= escalaFim
      ? `<div class="rl-rm-hoje" style="--x:${pct(hojeT).toFixed(2)}%"><span>hoje</span></div>` : '';

    return `<div class="rl-rm-wrap">
      <div class="rl-rm-grade">
        <div class="rl-rm-escala">${meses.join('')}</div>
        ${linhas}
        ${divisores}
        ${hoje}
      </div>
    </div>`;
  }

  return { corpoRoadmap };
});
