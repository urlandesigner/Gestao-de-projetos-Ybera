#!/usr/bin/env node
/* Gera entregas-carla-status.html: os cartões de outubro da Carla no desenho do
 * Status de demandas (o que fica preto no modo escuro), pra ela comparar com o
 * relatório de Entregas e escolher (15/10/2026).
 *
 * Os cartões vêm do MESMO arquivo que o relatório lê
 * (assets/conteudo/carla/edicoes/2026-10.json), então os dois desenhos nunca
 * divergem no texto. Rodar de novo depois de editar o arquivo:
 *   node scripts/gerar-entregas-carla.js
 */
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const C = require('../assets/core.js');

const doc = JSON.parse(fs.readFileSync(path.join(raiz, 'assets/conteudo/carla/edicoes/2026-10.json'), 'utf8'));
const cartoes = C.saneEdicao(doc).cartoes;
const ficha = C.fichaDaPessoa('carla');
// O token de cache é o do resto do projeto (scripts/versionar.sh o sobe nas páginas).
const token = (/status-demandas\.css\?v=(\d+)/.exec(fs.readFileSync(path.join(raiz, 'status-demandas.html'), 'utf8')) || [])[1];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SELO = { entregue: ['done', 'entregue'], andamento: ['progress', 'em andamento'], teste: ['progress', 'em teste'] };
const cartao = (c) => {
  const selo = SELO[c.status];
  const tags = selo ? `\n            <div class="card__meta"><div class="card__tags"><span class="tag tag--${selo[0]}">${selo[1]}</span></div></div>` : '';
  const textos = c.resumo.map((p) => (typeof p === 'string' ? p : p.nota)).filter(Boolean)
    .map((p) => `          <p class="card__text">${esc(p)}</p>`).join('\n');
  return `        <article class="card">
          <div class="card__top">
            <h3 class="card__title">${esc(c.titulo)}</h3>${tags}
          </div>
${textos}
        </article>`;
};

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="assets/brand/favicon-32.png">
<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">
<title>Entregas de Outubro de 2026 — ${esc(ficha.unidade)}</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/status-demandas.css${token ? '?v=' + token : ''}">
</head>
<!-- GERADO por scripts/gerar-entregas-carla.js a partir de
     assets/conteudo/carla/edicoes/2026-10.json — não editar à mão. É a versão
     "Status de demandas" do relatório de Entregas da Carla, pra ela comparar. -->
<body>
<div class="page">
  <header>
    <img class="logo" src="assets/brand/ybera-logo.webp" alt="Ybera" width="360" height="139">
    <h1 class="title">
      <span class="title__lead">Entregas de</span>
      <span class="title__main">Outubro de 2026</span>
    </h1>
    <p class="scope">${esc(ficha.unidade)} · ${esc(ficha.area)} · Product Owner: Carla</p>
    <div class="kpis">
      <article class="kpi">
        <p class="kpi__label">Frentes neste relatório</p>
        <p class="kpi__value">${cartoes.length}</p>
      </article>
    </div>
  </header>

  <main>
    <section class="group" aria-labelledby="g0">
      <div class="group__head">
        <h2 class="group__title" id="g0">Outubro de 2026</h2>
        <p class="group__sub">${cartoes.length} frentes.</p>
      </div>
      <div class="grid">
${cartoes.map(cartao).join('\n')}
      </div>
    </section>
  </main>

  <footer class="footer">
    <img class="footer__logo" src="assets/brand/ybera-logo.webp" alt="Ybera" width="360" height="139">
    <p class="footer__team">Time de Tecnologia</p>
    <p class="footer__claim">Comprometidos com transparência, inovação e colaboração</p>
    <p class="footer__contact">Para dúvidas ou sugestões<br><a href="mailto:${esc(ficha.email)}">${esc(ficha.email)}</a></p>
  </footer>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(raiz, 'entregas-carla-status.html'), html);
console.log('entregas-carla-status.html: ' + cartoes.length + ' cartões');
