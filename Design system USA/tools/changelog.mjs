/* ===========================================================================
   O CHANGELOG VIRA PÁGINA — `changelog/index.html`, gerada do CHANGELOG.md.

   Ele era o único documento do sistema que ninguém conseguia LER pelo site: o
   servidor manda `.md` como `text/markdown` e o navegador baixa em vez de
   abrir. Quem queria saber o que mudou na versão que acabou de instalar tinha
   de clonar o repositório.

   A FONTE CONTINUA SENDO O `.md`. Esta página é artefato derivado, como as
   fichas e o INVENTARIO: quem edita, edita o markdown e roda `./build.sh`. O
   CI compara o gerado com o commitado, então a página não tem como ficar para
   trás sem alguém ver.

   CONVERSOR PRÓPRIO, E NÃO UMA BIBLIOTECA. O projeto não tem dependência
   nenhuma — é a única razão de `npm run check` rodar em qualquer máquina sem
   instalar nada —, e trazer um renderizador de markdown inteiro para converter
   seis construções seria pagar caro por isso. O que o arquivo usa está medido:
   títulos de um a três, item de lista com continuação na linha seguinte,
   parágrafo, uma tabela, e no meio da linha `**negrito**`, `código` e
   [link](destino). Nada mais. Se alguém escrever outra coisa, ela sai como
   texto puro — nunca como marcação quebrada.
   =========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cabecalho } from './moldura.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');

/* A ORDEM AQUI É A ÚNICA QUE FUNCIONA: escapar primeiro, senão um `<` do texto
   vira tag; `código` antes de negrito, senão um `**` dentro de um trecho de
   código viraria <b> no meio do código. */
const escapar = (t) => t
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const linha = (t) => escapar(t)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  /* Preguicoso, e nao "tudo menos asterisco": ha negrito com `*` DENTRO, do
     tipo `**os quatro --yb-type-display-1-* foram depreciados**`, e com
     `[^*]+` o par nunca fechava — os dois asteriscos saiam crus na tela. */
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  /* Link para `.md` continua `.md`: o destino é o repositório, e fingir que
     existe uma página para ele seria link quebrado.

     O `../` NÃO É ENFEITE. Os endereços do markdown são escritos a partir da
     RAIZ do projeto (`GOVERNANCA.md`, `decision-log/DDR-001-....md`), e esta
     página mora em `changelog/`: sem o degrau a mais, cada um deles apontava
     para `changelog/GOVERNANCA.md`, que não existe. Foram dez links mortos na
     primeira geração, e quem pegou foi o verificador do repositório de
     protótipos — o validador daqui não confere link entre documentos. */
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    (_, texto, destino) => `<a href="${/^(?:https?:|mailto:|#|\/|\.\.\/)/.test(destino) ? destino : '../' + destino}">${texto}</a>`);

/* `[Unreleased]` VAZIA NAO VIRA GAVETA. Logo depois de publicar ela fica sem
   um item sequer — e uma gaveta que abre e nao mostra nada le como travada,
   nao como vazia. Quem olha clica, nada acontece, e a conclusao e que a pagina
   quebrou. A secao volta sozinha no primeiro item escrito la. */
function semEsperaVazia(linhas) {
  const i = linhas.findIndex((l) => /^## \[Unreleased\]/i.test(l.trimEnd()));
  if (i === -1) return linhas;
  let f = i + 1;
  while (f < linhas.length && !/^## /.test(linhas[f])) f++;
  const temConteudo = linhas.slice(i + 1, f).some((l) => l.trim());
  return temConteudo ? linhas : [...linhas.slice(0, i), ...linhas.slice(f)];
}

/* Uma versão por `<details>`. São dezesseis, e abertas de uma vez dão uma
   página de 177 KB em que a de hoje e a de um ano atrás pesam igual. A
   primeira nasce aberta porque é a que a pessoa veio ver. */
export function converter(md) {
  const linhas = semEsperaVazia(md.split('\n'));
  const out = [];
  let lista = false, paragrafo = [], tabela = false, versoes = 0, aberta = false;

  const fechaParagrafo = () => {
    if (paragrafo.length) out.push(`<p>${linha(paragrafo.join(' '))}</p>`);
    paragrafo = [];
  };
  const fechaLista = () => { if (lista) { out.push('</ul>'); lista = false; } };
  const fechaTabela = () => { if (tabela) { out.push('</tbody></table>'); tabela = false; } };
  const fechaTudo = () => { fechaParagrafo(); fechaLista(); fechaTabela(); };
  const fechaVersao = () => { if (aberta) { out.push('</details>'); aberta = false; } };

  /* O CABECALHO DO ARQUIVO NAO ENTRA NO CORPO: o `# Changelog` vira o <h1> da
     pagina e a prosa logo abaixo vira a lede. Sem este corte as duas apareciam
     de novo como primeiro paragrafo, e a pagina abria dizendo a mesma frase
     duas vezes seguidas. */
  let comecou = false;

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const crua = l.trimEnd();

    if (!comecou) { if (!/^## /.test(crua)) continue; comecou = true; }

    /* CERCA DE CODIGO, e ela vem INDENTADA — mora dentro de um item de lista.
       Sem este corte as linhas da cerca entravam no item como texto corrido, e
       um trecho de HTML de exemplo virava uma frase sem sentido no meio da
       entrada. Sao duas no arquivo inteiro; uma e barata de sustentar. */
    if (/^\s*```/.test(crua)) {
      fechaTudo();
      const dentro = [];
      while (++i < linhas.length && !/^\s*```/.test(linhas[i])) dentro.push(linhas[i].replace(/^ {0,2}/, ''));
      out.push(`<pre class="log__codigo"><code>${escapar(dentro.join('\n'))}</code></pre>`);
      continue;
    }

    if (!crua.trim()) { fechaParagrafo(); fechaTabela(); continue; }

    // ## [1.0.1] — 2026-10-06
    const h2 = crua.match(/^## (.+)$/);
    if (h2) {
      fechaTudo(); fechaVersao();
      versoes++;
      aberta = true;
      /* `[Unreleased]` NAO E UMA VERSAO, e parar de parecer uma e o ponto.
         Com a mesma caixa e o mesmo peso das outras quinze, ela lia como "uma
         versao sem numero" — e a pergunta que isso gera e justamente a que a
         regra ja responde: o numero so e escolhido na hora de publicar. Aqui
         ela ganha a cara de area de espera e diz isso em uma linha. */
      const espera = /^\[Unreleased\]/i.test(h2[1]);
      out.push(`<details class="log__versao${espera ? ' log__versao--espera' : ''}"${versoes === 1 ? ' open' : ''}>`);
      out.push(`<summary><h2>${espera ? 'Em aberto' : linha(h2[1])}</h2>`
        + (espera ? '<span class="log__aviso">ainda não publicado — o número sai quando subir</span>' : '')
        + '</summary>');
      continue;
    }
    const h3 = crua.match(/^### (.+)$/);
    if (h3) { fechaTudo(); out.push(`<h3>${linha(h3[1])}</h3>`); continue; }
    if (/^# /.test(crua)) continue;             // o título vira o <h1> da página

    // | a | b | c |
    if (/^\|/.test(crua)) {
      fechaParagrafo(); fechaLista();
      const celulas = crua.split('|').slice(1, -1).map((c) => c.trim());
      if (celulas.every((c) => /^-+$/.test(c))) continue;   // a linha de traços
      if (!tabela) {
        tabela = true;
        out.push('<table class="log__tabela"><thead><tr>'
          + celulas.map((c) => `<th>${linha(c)}</th>`).join('') + '</tr></thead><tbody>');
        continue;
      }
      out.push('<tr>' + celulas.map((c) => `<td>${linha(c)}</td>`).join('') + '</tr>');
      continue;
    }
    fechaTabela();

    // - item, e as linhas seguintes que o continuam
    const item = crua.match(/^- (.+)$/);
    if (item) {
      fechaParagrafo();
      if (!lista) { out.push('<ul>'); lista = true; }
      const partes = [item[1]];
      while (/^ {2,}\S/.test(linhas[i + 1] || '')) partes.push(linhas[++i].trim());
      out.push(`<li>${linha(partes.join(' '))}</li>`);
      continue;
    }

    fechaLista();
    paragrafo.push(crua.trim());
  }
  fechaTudo(); fechaVersao();
  return out.join('\n');
}

export function pagina() {
  const md = ler('CHANGELOG.md');
  /* A lede da página é a primeira linha de prosa do arquivo, e não um texto
     escrito aqui: duas frases dizendo a mesma coisa em lugares diferentes é
     uma para envelhecer. */
  const lede = (md.match(/^# Changelog\n\n([\s\S]*?)\n\n/) || [, ''])[1]
    .split('\n').join(' ');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Changelog — Ybera Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="../tokens/00-primitives.css">
<link rel="stylesheet" href="../tokens/01-semantic.css">
<link rel="stylesheet" href="../doc/doc.css">
<link rel="stylesheet" href="../doc/doc-nav.css">
<script src="../doc/doc.js" defer></script>
<style>
.ficha{margin:0; background:var(--doc-canvas, var(--yb-bg-page)); color:var(--yb-text-primary);
  font-family:var(--yb-font-family-base); font-size:var(--yb-type-body-size);
  line-height:var(--yb-type-body-line); -webkit-font-smoothing:antialiased}
.ficha code{font-family:var(--yb-font-family-mono); font-size:var(--yb-type-caption-size)}
/* Uma versão por gaveta. A de hoje nasce aberta; as outras quinze esperam. */
.log__versao{
  background:var(--yb-surface); border:1px solid var(--yb-border-subtle);
  border-radius:var(--yb-radius-card); box-shadow:var(--yb-elevation-card);
  margin-block-end:var(--yb-space-4); padding:0 var(--yb-space-5);
}
.log__versao > summary{
  display:flex; align-items:center; gap:var(--yb-space-3);
  min-block-size:var(--yb-target-min); cursor:pointer; list-style:none;
}
.log__versao > summary::-webkit-details-marker{display:none}
/* O mesmo chevron da coluna, pela mesma razão: é a forma que o sistema já deu
   a "isto abre". */
.log__versao > summary::after{
  content:""; margin-inline-start:auto; flex:none;
  inline-size:.4rem; block-size:.4rem;
  border-inline-end:1.5px solid currentColor; border-block-end:1.5px solid currentColor;
  transform:translateY(-1px) rotate(45deg);
  transition:transform var(--yb-transition-control);
}
.log__versao[open] > summary::after{transform:translateY(2px) rotate(-135deg)}
.log__versao > summary:focus-visible{
  outline:var(--yb-focus-width) solid var(--yb-focus-color);
  outline-offset:calc(var(--yb-focus-offset) * -1);
}
.log__versao h2{
  margin:0; font-size:var(--yb-type-h4-size); font-weight:var(--yb-font-weight-semibold);
  font-variant-numeric:tabular-nums;
}
.log__versao h3{
  margin:var(--yb-space-6) 0 var(--yb-space-2);
  font-size:var(--yb-type-overline-size); letter-spacing:var(--yb-tracking-wider);
  text-transform:uppercase; color:var(--yb-text-muted);
  font-weight:var(--yb-font-weight-semibold);
}
.log__versao > ul,
.log__versao > p,
.log__versao > table{margin-block-end:var(--yb-space-5)}
.log__versao ul{margin:0; padding-inline-start:var(--yb-space-5)}
.log__versao li{
  margin-block-end:var(--yb-space-4); max-inline-size:74ch;
  color:var(--yb-text-secondary);
}
.log__versao li b{color:var(--yb-text-primary)}
.log__versao p{color:var(--yb-text-secondary); max-inline-size:74ch}
/* A area de espera nao e cartao: fio tracejado, sem sombra e sem fundo
   proprio — e um rascunho preso na pagina, nao uma entrega. */
.log__versao--espera{
  background:none; box-shadow:none;
  border-style:dashed; border-color:var(--yb-border);
}
.log__aviso{
  font-size:var(--yb-type-caption-size); color:var(--yb-text-muted);
  font-weight:var(--yb-font-weight-regular);
}
.log__codigo{
  margin:0 0 var(--yb-space-5); padding:var(--yb-space-4);
  background:var(--yb-bg-muted); border:1px solid var(--yb-border-subtle);
  border-radius:var(--yb-radius-card); overflow-x:auto;
  font-family:var(--yb-font-family-mono); font-size:var(--yb-type-caption-size);
  color:var(--yb-text-primary); line-height:var(--yb-line-height-snug);
}
.log__tabela{border-collapse:collapse; font-size:var(--yb-type-body-sm-size)}
.log__tabela th,.log__tabela td{
  text-align:start; padding:var(--yb-space-2) var(--yb-space-4);
  border-block-end:1px solid var(--yb-border-subtle);
}
.log__tabela th{color:var(--yb-text-muted); font-weight:var(--yb-font-weight-semibold)}
.log__tabela td{color:var(--yb-text-secondary)}
</style>
</head>
<body class="ficha" data-frame="centered">
${cabecalho({ raiz: '../', atual: 'changelog' })}
<main class="main">
  <nav class="ficha-trilha" aria-label="Você está aqui">
    <a href="../index.html">Design system</a>
    <span aria-hidden="true">/</span>
    <b aria-current="page">Changelog</b>
  </nav>
  <h1 class="ficha-titulo">Changelog</h1>
  <p class="ficha-quando">${linha(lede)}</p>

${converter(md)}

  <!-- Gerada por tools/changelog.mjs a partir de CHANGELOG.md. Não edite à mão: ./build.sh -->
</main>
</body>
</html>
`;
}

if (!existsSync(join(raiz, 'changelog'))) mkdirSync(join(raiz, 'changelog'));
writeFileSync(join(raiz, 'changelog/index.html'), pagina());
console.log('changelog/index.html gerado');
