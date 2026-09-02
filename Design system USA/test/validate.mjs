/* =========================================================================
   YBERA DESIGN SYSTEM · VALIDADOR

   Roda todas as checagens que antes eram script solto na mão. Sai com código
   1 se algo falhar, então serve como CI.

     node test/validate.mjs

   Não precisa de dependência nem de navegador. O que exige DOM renderizado
   (contraste real, alvo de toque, rótulo) está em test/a11y.js.
   ========================================================================= */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');

let falhas = 0, avisos = 0, checagens = 0;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;
const cinza = (s) => `\x1b[90m${s}\x1b[0m`;

function ok(nome, detalhe = '') {
  checagens++;
  console.log(`  ${verde('✓')} ${nome} ${cinza(detalhe)}`);
}
function falha(nome, detalhe) {
  checagens++; falhas++;
  console.log(`  ${vermelho('✗')} ${nome}`);
  if (detalhe) String(detalhe).split('\n').forEach(l => console.log(`      ${vermelho(l)}`));
}
function aviso(nome, detalhe) {
  checagens++; avisos++;
  console.log(`  ${amarelo('!')} ${nome} ${cinza(detalhe || '')}`);
}
const secao = (t) => console.log(`\n${t}`);

/* ------------------------------------------------------------------ cor */
const lum = (hex) => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contraste = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* --------------------------------------------------------------- leitura */
const ARQUIVOS = {
  primitivos: 'tokens/00-primitives.css',
  semanticos: 'tokens/01-semantic.css',
  componentes: 'components/ybera-components.css',
  padroes: 'patterns/ybera-patterns.css',
  icones: 'icons/ybera-icons.css',
  ponte: 'bridge/ybera-bridge.css',
};
const css = {};
for (const [k, p] of Object.entries(ARQUIVOS)) {
  if (!existsSync(join(raiz, p))) { falha(`arquivo ausente: ${p}`); continue; }
  css[k] = ler(p);
}

// declaração pode vir no início da linha OU inline após { ou ;
// (ex.: .yb-icon--sm{--yb-icon-size:16px})
const definidos = (s) => new Set(
  [...s.matchAll(/(?:^|[{;])\s*(--yb-[\w-]+)\s*:/gm)].map(m => m[1]));
// aceita fallback: var(--x) e var(--x, 20px). Sem o [,)] o validador fica cego
// para toda referência com valor padrão — e foi assim que ele deu 0 em icons.css.
const usados = (s) => [...s.matchAll(/var\(\s*(--yb-[\w-]+)\s*[,)]/g)].map(m => m[1]);
const semComentario = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

const PRIM = definidos(css.primitivos);
const SEM = definidos(css.semanticos);
const TODOS = new Set([...PRIM, ...SEM]);
const EH_COR = (t) => /^--yb-(gray|magenta|gold|success|warning|danger|info)-\d+$/.test(t)
  || /^--yb-(white|black)$/.test(t);

/* ============================================ 1 · integridade referencial */
secao('Integridade referencial');
for (const [nome, s] of Object.entries(css)) {
  if (!s) continue;
  const locais = definidos(s);            // o arquivo pode definir os próprios
  const validos = new Set([...TODOS, ...locais]);
  const usadosAqui = new Set(usados(s));
  const quebradas = [...usadosAqui].filter(t => !validos.has(t));
  quebradas.length
    ? falha(`${nome}: referências quebradas`, quebradas.join(', '))
    : ok(`${nome}`, `${usadosAqui.size} tokens${locais.size && nome !== 'primitivos'
        && nome !== 'semanticos' ? `, ${locais.size} local(is)` : ''}`);
}

/* ==================================================== 2 · disciplina de camada */
secao('Disciplina de camadas (cor)');
// a ponte é exceção declarada: traduz para variáveis externas ao sistema
for (const nome of ['componentes', 'padroes', 'icones']) {
  const s = semComentario(css[nome] || '');
  const crus = usados(s).filter(EH_COR);
  crus.length
    ? falha(`${nome}: primitivo de cor consumido direto`, [...new Set(crus)].join(', '))
    : ok(`${nome}: só camada semântica`);
}
{
  const s = semComentario(css.ponte || '');
  const crus = [...new Set(usados(s).filter(EH_COR))];
  ok('ponte: exceção declarada', `${crus.length} primitivos, alvo externo`);
}

secao('Cor crua');
// Antes esta secao so procurava `#hex`, e por isso passava por cima de
// `rgba(255,255,255,.92)` no botao de play e `rgba(0,0,0,.6)` na legenda do
// video — duas cores cruas em producao, uma delas preto puro, que a propria
// secao de elevacao dos primitivos proibe. Notacao nao e o assunto: o assunto
// e cor decidida dentro do componente.
//
// `transparent` e `currentColor` continuam livres: nao sao cor, sao a ausencia
// dela e a heranca dela.
{
  const FUNCOES = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\s*\(/gi;
  const NOMEADAS = new RegExp(
    '(?<![\\w-])(?:white|black|red|blue|green|yellow|orange|purple|pink|brown' +
    '|gray|grey|silver|gold|navy|teal|olive|maroon|lime|aqua|fuchsia|cyan' +
    '|magenta|beige|ivory|khaki|salmon|tan|violet|indigo|crimson)(?![\\w-])', 'gi');

  for (const nome of ['componentes', 'padroes', 'icones', 'ponte']) {
    const s = semComentario(css[nome] || '');
    // so o LADO DIREITO das declaracoes: `--yb-magenta-600:` e nome de token,
    // nao uso de cor, e `.yb-badge--gold` e seletor.
    const valores = [...s.matchAll(/(^|[;{])\s*[\w-]+\s*:([^;{}]*)/g)].map(m => m[2]).join(' ; ');
    const achados = [
      ...new Set([
        ...(valores.match(/#[0-9a-fA-F]{3,8}\b/g) || []),
        ...(valores.match(FUNCOES) || []).map(f => f.replace(/\s*\($/, '()')),
        ...(valores.match(NOMEADAS) || []),
      ]),
    ];
    achados.length
      ? falha(`${nome}: cor crua em código`, achados.join(', ')
          + ' — cor decidida no componente e cor que a camada 1 nao consegue trocar')
      : ok(`${nome}`);
  }
}

/* =========================================================== 3 · rampas */
secao('Rampas de cor');
const RAMPAS = ['gray', 'magenta', 'gold'];
for (const r of RAMPAS) {
  const degraus = [...css.primitivos.matchAll(
    new RegExp(`--yb-${r}-(\\d+):\\s*(#[0-9A-Fa-f]{6})`, 'g'))]
    .map(m => ({ passo: +m[1], hex: m[2] }))
    .sort((a, b) => a.passo - b.passo);

  if (degraus.length !== 11) { falha(`${r}: esperado 11 degraus`, `achou ${degraus.length}`); continue; }

  // luminância tem de cair monotonicamente
  const lums = degraus.map(d => lum(d.hex));
  const quebras = [];
  for (let i = 0; i < lums.length - 1; i++)
    if (lums[i + 1] >= lums[i]) quebras.push(`${degraus[i].passo}→${degraus[i + 1].passo}`);
  quebras.length
    ? falha(`${r}: monotonia quebrada`, quebras.join(', '))
    : ok(`${r}: 11 degraus, luminância monotônica`);

  // o contraste anotado no comentário bate com o medido?
  const anotados = [...css.primitivos.matchAll(
    new RegExp(`--yb-${r}-(\\d+):\\s*(#[0-9A-Fa-f]{6});\\s*/\\*\\s*([\\d.]+):1`, 'g'))];
  const erradas = anotados
    .map(m => ({ passo: m[1], anotado: +m[3], medido: +contraste(m[2], '#FFFFFF').toFixed(2) }))
    .filter(x => Math.abs(x.anotado - x.medido) > 0.02);
  erradas.length
    ? falha(`${r}: contraste anotado diverge do medido`,
        erradas.map(e => `${r}-${e.passo}: doc ${e.anotado} vs real ${e.medido}`).join('\n'))
    : ok(`${r}: contraste anotado confere`, `${anotados.length} degraus verificados`);
}

/* ================================================= 4 · regras duras do sistema */
secao('Regras duras');
const hexDe = (token) => {
  const m = css.primitivos.match(new RegExp(`${token}:\\s*(#[0-9A-Fa-f]{6})`));
  return m ? m[1] : null;
};
{
  // piso de texto: gray-600 passa AA, gray-500 não — é a razão da regra existir
  const g600 = hexDe('--yb-gray-600'), g500 = hexDe('--yb-gray-500');
  const c600 = contraste(g600, '#FFFFFF'), c500 = contraste(g500, '#FFFFFF');
  c600 >= 4.5
    ? ok('piso de texto gray-600 passa AA', `${c600.toFixed(2)}:1`)
    : falha('gray-600 NÃO passa AA', `${c600.toFixed(2)}:1`);
  c500 < 4.5
    ? ok('gray-500 reprova (premissa da regra)', `${c500.toFixed(2)}:1`)
    : aviso('gray-500 agora passa AA — a regra do piso perdeu a razão de ser',
        `${c500.toFixed(2)}:1`);
}
{
  // dourado de marca não pode ser texto sobre claro
  const gold = hexDe('--yb-gold-500');
  const sobreBranco = contraste(gold, '#FFFFFF');
  const sobreTinta = contraste(gold, hexDe('--yb-gray-950'));
  sobreBranco < 4.5
    ? ok('gold-500 reprova sobre branco (premissa da regra)', `${sobreBranco.toFixed(2)}:1`)
    : aviso('gold-500 passa sobre branco — revise a regra do dourado');
  sobreTinta >= 4.5
    ? ok('gold-500 passa sobre grafite', `${sobreTinta.toFixed(2)}:1`)
    : falha('gold-500 NÃO passa sobre grafite', `${sobreTinta.toFixed(2)}:1`);
  // o par de texto sobre claro precisa passar
  const goldTexto = hexDe('--yb-gold-700');
  const c = contraste(goldTexto, '#FFFFFF');
  c >= 4.5 ? ok('gold-700 serve como texto sobre claro', `${c.toFixed(2)}:1`)
           : falha('gold-700 não passa AA sobre branco', `${c.toFixed(2)}:1`);
}
{
  // texto branco sobre a cor de ação
  const mag = hexDe('--yb-magenta-600');
  const c = contraste('#FFFFFF', mag);
  c >= 4.5 ? ok('texto branco sobre a ação passa AA', `${c.toFixed(2)}:1`)
           : falha('texto sobre a cor de ação reprova', `${c.toFixed(2)}:1`);
}
{
  // estados
  for (const st of ['success', 'warning', 'danger', 'info']) {
    const h = hexDe(`--yb-${st}-600`);
    if (!h) { falha(`estado ${st} ausente`); continue; }
    const c = contraste(h, '#FFFFFF');
    c >= 4.5 ? ok(`estado ${st} passa AA`, `${c.toFixed(2)}:1`)
             : falha(`estado ${st} reprova`, `${c.toFixed(2)}:1`);
  }
}
{
  // alvo de toque declarado
  const m = css.semanticos.match(/--yb-target-min:\s*(\d+)px/);
  const v = m ? +m[1] : 0;
  v >= 44 ? ok('alvo de toque mínimo', `${v}px`)
          : falha('alvo de toque abaixo de 44px', `${v}px`);
}

/* ==================================== 4b · escala de breakpoint de página */
secao('Breakpoints');
{
  // `@media` nao le custom property, entao a escala so se sustenta se alguem
  // conferir. Antes desta checagem o token dizia 768 e o CSS praticava 760 em
  // cinco lugares, mais um 767 solto — tres valores quase iguais convivendo.
  const escala = Object.fromEntries(
    [...css.primitivos.matchAll(/--yb-breakpoint-(\w+):\s*(\d+)px/g)].map(m => [m[2], m[1]]));
  // pontos de quebra de COMPONENTE, declarados: nascem do conteudo, nao da tela
  const DE_COMPONENTE = new Set(['520', '560', '860', '900']);
  const DE_PARIDADE = new Set(['767']);   // espelha o <source media> do <picture>
  const usados = new Set();
  for (const nome of ['componentes', 'padroes']) {
    // a escala e de largura; `max-height` e outra dimensao e nao presta contas a ela
    for (const m of (css[nome] || '').matchAll(/@media[^{]*?(\d+)px/g)) {
      const cond = m[0];
      if (/\b(max|min)-height\s*:/.test(cond)) continue;
      usados.add(m[1]);
    }
  }
  const fora = [...usados].filter(px => !escala[px] && !DE_COMPONENTE.has(px) && !DE_PARIDADE.has(px));
  fora.length
    ? falha('breakpoint fora da escala', `${fora.join(', ')}px — use um --yb-breakpoint-* ` +
        'ou declare como ponto de quebra de componente')
    : ok('breakpoints conferem com a escala', `${usados.size} distintos`);
}

/* ============================================ 5 · acessibilidade estrutural */
secao('Acessibilidade no CSS');
for (const nome of ['componentes', 'padroes']) {
  const s = css[nome] || '';
  const foco = (s.match(/:focus-visible/g) || []).length;
  foco > 0 ? ok(`${nome}: foco visível`, `${foco} regras`)
           : falha(`${nome}: nenhuma regra :focus-visible`);
  // outline:none sem substituto é a forma mais comum de matar o foco
  const mata = semComentario(s).match(/outline\s*:\s*none/g) || [];
  mata.length ? falha(`${nome}: outline:none encontrado`, `${mata.length} ocorrência(s)`)
              : ok(`${nome}: nenhum outline:none`);
  s.includes('prefers-reduced-motion')
    ? ok(`${nome}: respeita prefers-reduced-motion`)
    : aviso(`${nome}: sem prefers-reduced-motion`);
}
{
  // Antes o corte de movimento era por componente, e quem entrava depois
  // esquecia. O corte global cobre `[class*="yb-"]` de uma vez.
  const s = semComentario(css.componentes || '');
  const bloco = s.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[\s\S]{0,400}?\}\s*\}/);
  bloco && /\[class\*=["']yb-["']\]/.test(bloco[0])
    ? ok('corte de movimento é global', 'cobre todo [class*="yb-"]')
    : falha('corte de movimento não é global',
        'cada componente respeitando por conta própria significa que o próximo esquece');
  // animation:none deixa elemento preso no frame 0 — quem depende do estado
  // final do keyframe (o toast se remove no animationend) some da tela
  bloco && /animation\s*:\s*none/.test(bloco[0])
    ? falha('reduced-motion usa animation:none',
        'use duration 1ms: o keyframe chega ao fim e dispara animationend')
    : ok('reduced-motion não congela animação no frame 0');
}
{
  // WCAG 2.4.1 e o utilitário mais básico que existe. Os dois faltavam.
  const s = css.componentes || '';
  const temSr = /\.yb-sr-only\s*\{/.test(s);
  const temSkip = /\.yb-skip-link\s*\{/.test(s);
  temSr && temSkip
    ? ok('utilitários de acessibilidade presentes', 'yb-sr-only · yb-skip-link')
    : falha('faltam utilitários de acessibilidade',
        [!temSr && '.yb-sr-only', !temSkip && '.yb-skip-link'].filter(Boolean).join(', '));

  // display:none e visibility:hidden tiram o elemento da árvore de
  // acessibilidade — é o oposto do que "só para leitor de tela" quer dizer
  if (temSr) {
    const corpo = s.slice(s.indexOf('.yb-sr-only'));
    const regra = corpo.slice(0, corpo.indexOf('}'));
    /display\s*:\s*none|visibility\s*:\s*hidden/.test(regra)
      ? falha('.yb-sr-only esconde do leitor de tela também',
          'display:none e visibility:hidden removem da árvore de acessibilidade')
      : ok('.yb-sr-only continua legível por leitor de tela');
  }
}
{
  // No modo de alto contraste do Windows a cor do autor é descartada. Botão
  // sólido com borda transparente perde o contorno; foco colorido some.
  const s = css.componentes || '';
  /@media\s*\(\s*forced-colors\s*:\s*active\s*\)/.test(s)
    ? ok('componentes: trata forced-colors', 'alto contraste do Windows')
    : falha('componentes: sem bloco forced-colors',
        'botão sólido perde o contorno e o anel de foco some');
}
{
  // Sem `color-scheme`, um aparelho em modo escuro faz o navegador escurecer
  // por conta própria `<input>`, `<select>`, a barra de rolagem e o
  // `::backdrop` — dentro de uma página que continua clara.
  /(^|[;{\s])color-scheme\s*:/.test(semComentario(css.semanticos || ''))
    ? ok('esquema de cor declarado', 'o sistema é claro por decisão, e diz isso')
    : falha('color-scheme não declarado',
        'em modo escuro o navegador escurece os controles nativos sozinho');
}
{
  // Opacidade sobre palavra derruba o contraste sem que nada registre a
  // queda: 5.15:1 a 65% vira 2.9:1, e nenhuma medição do sistema vê.
  const alvos = [];
  for (const nome of ['componentes', 'padroes']) {
    const s = semComentario(css[nome] || '');
    for (const m of s.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const sel = m[1].trim(), corpo = m[2];
      if (!/(^|[;\s])opacity\s*:\s*(0?\.\d+|\d*\.?\d+%)/.test(corpo)) continue;
      if (/@keyframes|^\s*(from|to|\d+%)\s*$/.test(sel)) continue;   // animação
      if (/(^|[;\s])(color|font-size)\s*:/.test(corpo)) alvos.push(`${nome}: ${sel}`);
    }
  }
  alvos.length
    ? falha('opacidade aplicada junto de texto', alvos.join(' · ')
        + ' — para texto apagado existe --yb-text-muted, que é medido')
    : ok('nenhuma opacidade sobre texto', 'contraste continua mensurável');
}
{
  // A regra dos 44px estava escrita em três lugares e conferida em nenhum: o
  // validador só checava se o TOKEN dizia 44, nunca se algum controle o
  // respeitava. `.yb-chip` vivia em 36 sem uma linha de justificativa.
  //
  // Agora a regra tem dois degraus e o de baixo é declarado: quem fica abaixo
  // de 44 traz `alvo-compacto:` em comentário, com a razão. Sem marcador,
  // reprova.
  const INTERATIVO = /yb-(btn|chip|check|input|select|textarea|stepper|swatch|crumb|pagination|tab|toggle|switch|close|link|nav__|header__(?!count)|card__fav)/;
  // não são controle: rótulo visualmente oculto, decoração, medidor
  const NAO_E_ALVO = /yb-(sr-only|skeleton|freeship__track|btn--loading|check input|nav__toggle)/;
  const semMarcador = [];
  for (const nome of ['componentes', 'padroes']) {
    const bruto = css[nome] || '';
    for (const m of bruto.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
      const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
      const corpo = m[2];
      const altura = [...corpo.replace(/\/\*[\s\S]*?\*\//g, '')
        .matchAll(/(?:^|[;\s])(?:min-)?height\s*:\s*(\d+)px/g)];
      if (!altura.length) continue;
      if (!INTERATIVO.test(sel) || NAO_E_ALVO.test(sel)) continue;
      const menor = Math.min(...altura.map(a => +a[1]));
      if (menor >= 44) continue;
      // o marcador pode estar no corpo da regra ou logo antes do seletor
      const antes = bruto.slice(Math.max(0, m.index - 500), m.index);
      if (/alvo-compacto\s*:/.test(corpo) || /alvo-compacto\s*:[\s\S]*$/.test(antes.split('}').pop())) continue;
      semMarcador.push(`${nome}: ${sel.replace(/\s+/g, ' ').slice(0, 48)} (${menor}px)`);
    }
  }
  semMarcador.length
    ? falha('controle abaixo de 44px sem declarar', semMarcador.join(' · ')
        + ' — use --yb-control-height-compact e o marcador `alvo-compacto:` com a razão')
    : ok('todo alvo abaixo de 44px é declarado', 'com razão em comentário');
}
{
  // Semântico é intenção com consumidor. Sem ninguém consumindo, ele é uma
  // promessa que o sistema não cumpre — e a governança diz que token novo só
  // entra quando o caso aparece duas vezes. Primitivo é outra coisa: rampa é
  // vocabulário, e degrau não usado continua sendo vocabulário.
  const consumidores = ['components/ybera-components.css', 'patterns/ybera-patterns.css',
    'icons/ybera-icons.css', 'bridge/ybera-bridge.css', 'tokens/01-semantic.css',
    'docs/index.html', 'components/index.html', 'patterns/index.html',
    'icons/index.html', 'preview/index.html', 'index.html'];
  const consumidos = new Set();
  for (const f of consumidores)
    if (existsSync(join(raiz, f))) usados(semComentario(ler(f))).forEach(t => consumidos.add(t));
  // Nem todo orfao e defeito, e o aviso so serve para alguma coisa se distinguir
  // os dois. Um token pode declarar por que nao tem consumidor:
  //
  //   @deprecated  — esta de saida, ninguem deve adotar. Consumidor zero e o
  //                  estado desejado ate a remocao.
  //   @reservado   — faz parte de um contrato que se consome inteiro (os quatro
  //                  `track` de cada papel tipografico) ou de um par que so
  //                  serve completo (a rampa clara sobre escuro).
  //
  // O marcador vale do comentario ate o proximo comentario. Sem esta leitura o
  // aviso ficou em 23 itens por dez versoes — e um aviso que ninguem zera e um
  // aviso que ninguem le.
  const marcados = new Set();
  {
    let marca = null;
    for (const m of css.semanticos.matchAll(/\/\*[\s\S]*?\*\/|^\s*(--yb-[\w-]+)\s*:/gm)) {
      if (m[1]) { if (marca) marcados.add(m[1]); continue; }
      marca = /@deprecated|@reservado/.test(m[0]) ? m[0] : null;
    }
  }

  const orfaos = [...SEM].filter(t => !consumidos.has(t) && !marcados.has(t));
  const declarados = [...SEM].filter(t => !consumidos.has(t) && marcados.has(t));
  orfaos.length
    ? aviso(`${orfaos.length} token(s) semântico(s) sem consumidor`,
        orfaos.slice(0, 6).join(', ') + (orfaos.length > 6 ? ` (+${orfaos.length - 6})` : ''))
    : ok('todo token semântico tem consumidor ou razão declarada',
        `${SEM.size} tokens · ${declarados.length} @deprecated/@reservado`);

  // Depreciar e uma promessa com prazo: a governanca diz "conviver duas versoes
  // menores, remover na proxima maior". Um @deprecated sem substituto nomeado
  // deixa quem consome sem para onde ir.
  {
    const semSaida = [...css.semanticos.matchAll(/\/\*([\s\S]*?)\*\//g)]
      .filter(m => /@deprecated/.test(m[1]))
      .filter(m => !/(use\s+--yb-|nao declare|sem consumidor|use a escala)/i.test(m[1]));
    semSaida.length
      ? falha(`${semSaida.length} @deprecated sem substituto nomeado`,
          'todo @deprecated diz para onde ir')
      : ok('todo @deprecated aponta o substituto', 'e a versao de remoção');
  }
}

/* ============================================================ 6 · JS */
secao('Comportamento');
{
  const p = 'components/ybera-components.js';
  if (!existsSync(join(raiz, p))) falha('ybera-components.js ausente');
  else {
    const js = ler(p);
    js.includes('innerHTML')
      ? falha('JS usa innerHTML', 'risco de injeção com conteúdo de produto')
      : ok('JS não usa innerHTML');
    js.includes('showModal')
      ? ok('modal usa <dialog> nativo')
      : aviso('modal não parece usar <dialog> nativo');
    // Comportamento, nao nome de variavel: a versao anterior casava a string
    // `ultimoGatilho` e reprovou num rename, sem nada ter regredido.
    // Aqui: existe um ouvinte de `close` e ele devolve foco.
    {
      const bloco = js.match(/addEventListener\(\s*'close'[\s\S]*?\n  \}/);
      const restaura = bloco && /\.focus\(\)/.test(bloco[0]);
      // e o que guarda o gatilho tem de ser pilha: um modal aberto de dentro
      // de outro sobrescreve variavel unica e o de fora perde o foco.
      const pilha = /\.push\(\s*gatilho|\.push\(\s*ultimo|pilha\w*\.push/.test(js) && /\.pop\(\)/.test(js);
      restaura && pilha
        ? ok('modal devolve o foco a quem abriu', 'pilha de gatilhos')
        : falha('modal não devolve o foco ao fechar',
            !restaura ? 'nenhum .focus() no ouvinte de close' : 'gatilho guardado fora de pilha');
    }
    /focusin/.test(js)
      ? ok('toast pausa no foco de teclado')
      : aviso('toast não pausa no foco de teclado');
    // o play so pode aparecer onde existe video para tocar
    css.componentes.includes('.yb-video:not([data-video]) .yb-video__play')
      ? ok('play some quando nao ha video')
      : falha('o play aparece mesmo sem data-video',
          'um botao que promete video e nao entrega e pior que nenhum botao');
  }
}

/* ============================================================ 7 · dist */
secao('Paleta documentada');
{
  // Os quatro tokens de estado existiam na camada 0 desde sempre e nunca
  // apareceram na secao Color — apareciam so em State, ja como alias, sem
  // dizer que havia primitivo atras. Quem lia a paleta achava que tinham
  // saido do nada.
  const prim = css.primitivos || '';
  const docs = existsSync(join(raiz, 'docs/index.html')) ? ler('docs/index.html') : '';
  const cor = docs.includes('<section id="color">')
    ? docs.slice(docs.indexOf('<section id="color">'), docs.indexOf('<section id="typography">'))
    : '';
  const doPrim = [...prim.matchAll(/--yb-([a-z]+)-(\d+):\s*#[0-9A-Fa-f]{6}/g)]
    .map(m => `--yb-${m[1]}-${m[2]}`);
  const familias = [...new Set(doPrim.map(t => t.split('-')[3]))];   // --/yb/familia/passo
  if (!cor) falha('secao Color nao encontrada em docs/', '');
  else {
    const fora = doPrim.filter(t => !cor.includes(t));
    fora.length
      ? falha('primitivo de cor fora da seção Color',
          `${fora.length} token(s): ${fora.slice(0, 8).join(', ')}${fora.length > 8 ? '…' : ''}`)
      : ok('toda cor da camada 0 está na seção Color',
          `${doPrim.length} tokens · ${familias.length} famílias`);
  }
}

secao('Direção de leitura');
{
  // Propriedade fisica no eixo inline espelha errado em RTL. O eixo de bloco
  // (top/bottom) so importa em escrita vertical e fica de fora.
  const FISICAS = /(^|[;{\s])(margin|padding|border)-(left|right)(-color|-width|-style)?\s*:|(^|[;{\s])(left|right)\s*:/;
  const achados = [];
  for (const nome of ['componentes', 'padroes']) {
    const folha = (css[nome] || '').replace(/\/\*[\s\S]*?\*\//g, '');
    folha.split('\n').forEach((l, i) => {
      if (l.includes('background-position') || l.includes('inset-inline')) return;
      if (FISICAS.test(l)) achados.push(`${nome}:${i + 1} ${l.trim().slice(0, 54)}`);
    });
  }
  achados.length
    ? falha('propriedade física no eixo inline', `${achados.length}: ${achados.slice(0, 4).join(' · ')}`)
    : ok('eixo inline usa propriedade lógica', 'espelha em RTL');
}

secao('Dialog');
{
  // `display` no proprio <dialog> sem [open] derruba o `dialog:not([open]){
  // display:none }` do navegador — regra de autor vence a folha da UA por
  // ORIGEM, nao por especificidade. O resultado e a gaveta aparecendo fechada,
  // colada na lateral da pagina. Aconteceu com .yb-dialog--drawer.
  // sem tirar comentario, o parser le `> * { height:100dvh }` de dentro de um
  // comentario como se fosse regra e acusa o seletor errado.
  const alvo = (css.componentes || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const maus = [];
  for (const m of alvo.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim(), corpo = m[2];
    if (!/(^|[\s,])[.\w-]*yb-dialog[\w-]*\s*(\[[^\]]*\])?\s*$/.test(sel)) continue;
    if (/yb-dialog__/.test(sel)) continue;          // filho: pode ter display
    if (/\[open\]/.test(sel)) continue;             // e o jeito certo
    if (/(^|[;\s])display\s*:/.test(corpo)) maus.push(sel);
  }
  maus.length
    ? falha('display no <dialog> sem [open]', `${maus.join(', ')} — some com o display:none da UA`)
    : ok('nenhum display no <dialog> fora do [open]', '');
}

secao('Bundles');
// O JS entra na mesma checagem: era o unico asset que build.sh nao gerava, e
// por isso ficou 27 linhas atras da fonte sem ninguem perceber.
{
  const fonte = 'components/ybera-components.js', bundle = 'dist/ybera-components.js';
  if (!existsSync(join(raiz, bundle))) falha(`${bundle} ausente`, 'rode ./build.sh');
  else {
    const a = ler(fonte).trim(), b = ler(bundle).trim();
    a === b
      ? ok(`${bundle}`, `${(b.length / 1024).toFixed(1)} KB, igual a fonte`)
      : falha(`${bundle} defasado`,
          `fonte tem ${a.split('\n').length} linhas, bundle tem ${b.split('\n').length} — rode ./build.sh`);
  }
}

for (const f of ['dist/ybera-tokens.css', 'dist/ybera-components.css', 'dist/ybera-bridge.css']) {
  if (!existsSync(join(raiz, f))) { falha(`${f} ausente`, 'rode ./build.sh'); continue; }
  const bundle = ler(f);
  const fonte = f.includes('tokens') ? css.primitivos
              : f.includes('bridge') ? css.ponte
              : css.componentes;
  // amostra o suficiente para detectar dist defasado
  const marcador = fonte.split('\n').find(l => /^\s*--yb-[\w-]+:/.test(l))?.trim();
  marcador && !bundle.includes(marcador)
    ? falha(`${f} defasado`, 'rode ./build.sh')
    : ok(`${f}`, `${(bundle.length / 1024).toFixed(1)} KB`);
}

secao('Tokens em W3C DTCG');
{
  // O CSS e a fonte; o JSON e derivado. Se ele ficar para tras, quem consome
  // por Figma ou Style Dictionary passa a ver um sistema que nao existe mais —
  // e nada no CSS denuncia, porque o CSS esta certo.
  const p = 'dist/ybera-tokens.json';
  if (!existsSync(join(raiz, p))) falha(`${p} ausente`, 'rode ./build.sh');
  else {
    const doc = JSON.parse(ler(p));
    const folhas = [];
    (function andar(no, caminho) {
      for (const [k, v] of Object.entries(no)) {
        if (k.startsWith('$')) continue;
        if (v && typeof v === 'object' && '$value' in v) folhas.push({ caminho: [...caminho, k], token: v });
        else if (v && typeof v === 'object') andar(v, [...caminho, k]);
      }
    })(doc, []);

    // todo token do CSS saiu para o JSON, e nada saiu a mais
    const noJson = new Set(folhas.map(f => f.token.$extensions?.['com.ybera.cssVariable']));
    const faltando = [...TODOS].filter(t => !noJson.has(t));
    const sobrando = [...noJson].filter(t => t && !TODOS.has(t));
    faltando.length || sobrando.length
      ? falha(`${p} defasado em relação ao CSS`,
          [faltando.length && `sem exportar: ${faltando.slice(0, 5).join(', ')}`,
           sobrando.length && `exportado sem existir: ${sobrando.slice(0, 5).join(', ')}`]
            .filter(Boolean).join(' · ') + ' — rode ./build.sh')
      : ok(`${p} em dia com o CSS`, `${folhas.length} tokens`);

    // o formato proibe no que e token e grupo ao mesmo tempo, e alias cego
    const invalidos = folhas.filter(f => !f.token.$type
      || Object.keys(f.token).some(k => !k.startsWith('$')));
    const alvos = new Set(folhas.map(f => f.caminho.join('.')));
    const cegos = folhas.filter(f => typeof f.token.$value === 'string'
      && /^\{[\w.]+\}$/.test(f.token.$value) && !alvos.has(f.token.$value.slice(1, -1)));
    invalidos.length || cegos.length
      ? falha(`${p} inválido para o formato`,
          [invalidos.length && `${invalidos.length} sem $type ou token+grupo`,
           cegos.length && `alias sem alvo: ${cegos.slice(0, 3).map(c => c.token.$value).join(', ')}`]
            .filter(Boolean).join(' · '))
      : ok(`${p} válido`, `${folhas.filter(f => typeof f.token.$value === 'string'
          && f.token.$value.startsWith('{')).length} aliases resolvem`);
  }
}

secao('Telas-prova');
// A coluna "Tela real" do INVENTARIO.md le _captura/nova-loja/. Se a copia do
// CSS que aquelas paginas carregam nao for a do sistema, a evidencia prova um
// sistema que nao existe mais — e prova com a cara de quem prova a versao atual.
{
  const PARES = [
    ['tokens/00-primitives.css', '_captura/nova-loja/yb/00-primitives.css'],
    ['tokens/01-semantic.css', '_captura/nova-loja/yb/01-semantic.css'],
    ['components/ybera-components.css', '_captura/nova-loja/yb/components.css'],
    ['patterns/ybera-patterns.css', '_captura/nova-loja/yb/patterns.css'],
    ['icons/ybera-icons.css', '_captura/nova-loja/yb/icons.css'],
    ['icons/ybera-icons.svg', '_captura/nova-loja/yb/icons.svg'],
    ['components/ybera-components.js', '_captura/nova-loja/yb/components.js'],
  ].filter(([, copia]) => existsSync(join(raiz, copia)));

  if (!PARES.length) {
    aviso('telas-prova ausentes', 'a coluna "Tela real" do inventário fica sem base');
  } else {
    const derivadas = PARES.filter(([fonte, copia]) => ler(fonte) !== ler(copia));
    derivadas.length
      ? falha('cópia das telas-prova defasada',
          derivadas.map(([, c]) => c.split('/').pop()).join(', ') + ' — rode ./build.sh')
      : ok('telas-prova rodam o CSS do sistema', `${PARES.length} arquivos idênticos`);

    // O carimbo `?v=` das paginas tem de bater com o conteudo que elas carregam,
    // senao o navegador serve CSS velho de cache e a tela mente sem nem derivar.
    const { createHash } = await import('node:crypto');
    const h = createHash('sha1');
    for (const f of ['tokens/00-primitives.css', 'tokens/01-semantic.css',
                     'components/ybera-components.css', 'patterns/ybera-patterns.css',
                     'icons/ybera-icons.css', 'components/ybera-components.js'])
      h.update(readFileSync(join(raiz, f)));
    const esperado = h.digest('hex').slice(0, 8);

    const paginas = readdirSync(join(raiz, '_captura/nova-loja'))
      .filter(f => f.endsWith('.html'));
    const erradas = paginas.filter(f => {
      const marcas = new Set([...ler(join('_captura/nova-loja', f)).matchAll(/\?v=([0-9a-f]{8})/g)].map(m => m[1]));
      return marcas.size && ![...marcas].every(v => v === esperado);
    });
    erradas.length
      ? falha('carimbo de versão das telas-prova errado', `${erradas.join(', ')} — esperado ${esperado}`)
      : ok('carimbo de versão confere com o conteúdo', esperado);
  }
}

secao('Documentação');
// Um sistema ganha arquivo de doc a cada versao, e os links entre eles apodrecem
// primeiro: o README aponta para um DDR que mudou de nome e ninguem ve, porque
// markdown quebrado nao da erro em lugar nenhum — so entrega um 404 para quem
// estava justamente tentando entender por que o sistema e assim.
{
  const docs = readdirSync(raiz)
    .filter(f => f.endsWith('.md'))
    .concat(existsSync(join(raiz, 'decision-log'))
      ? readdirSync(join(raiz, 'decision-log')).filter(f => f.endsWith('.md')).map(f => join('decision-log', f))
      : [])
    .concat('index.html');

  const mortos = [];
  for (const d of docs) {
    if (!existsSync(join(raiz, d))) continue;
    const texto = ler(d);
    const base = dirname(d);
    const alvos = [
      ...[...texto.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map(m => m[1]),
      ...[...texto.matchAll(/<a[^>]+href="([^"#?]+)"/g)].map(m => m[1]),
    ];
    for (const alvo of alvos) {
      if (/^(https?:|mailto:|#|\/\/)/.test(alvo)) continue;
      const caminho = join(raiz, base, alvo).replace(/\/$/, '');
      if (!existsSync(caminho) && !existsSync(caminho + '/index.html')) mortos.push(`${d} -> ${alvo}`);
    }
  }
  mortos.length
    ? falha('link de documentação sem destino', mortos.join(' · '))
    : ok('todo link entre documentos resolve', `${docs.length} arquivos`);

  // O livro-razao de adocao so serve se der para ler por programa.
  if (existsSync(join(raiz, 'adocao.json'))) {
    try {
      const a = JSON.parse(ler('adocao.json'));
      Array.isArray(a.medicoes) && a.medicoes.length
        ? ok('adocao.json legível', `${a.medicoes.length} medição(ões) registrada(s)`)
        : falha('adocao.json sem medição', 'o plano manda medir antes de cada fase');
    } catch (e) {
      falha('adocao.json inválido', e.message);
    }
  }
}

secao('Inventário');
// Mesma logica de "dist/ em dia": artefato derivado que ninguem confere passa a
// mentir com a autoridade de um documento oficial.
{
  const { execFileSync } = await import('node:child_process');
  try {
    const saida = execFileSync(process.execPath, [join(raiz, 'tools/inventario.mjs'), '--check'],
      { cwd: raiz, encoding: 'utf8' }).trim();
    ok('INVENTARIO.md em dia com o CSS', saida.replace(/^.*· /, ''));
  } catch (e) {
    falha('INVENTARIO.md defasado', 'rode ./build.sh e commite');
  }

  // Alfa nao e um estagio, e um defeito: componente que esta no bundle e nao
  // esta na doc chega em producao sem que ninguem saiba que existe. A checagem
  // "componente sem demonstracao na doc" ja reprova; esta aqui e o placar.
  if (existsSync(join(raiz, 'INVENTARIO.md'))) {
    const alfa = [...ler('INVENTARIO.md').matchAll(/^\| ([^|]+) \| `\.([\w-]+)`[^\n]*\| Alfa \|/gm)];
    alfa.length
      ? aviso(`${alfa.length} peça(s) em alfa`, alfa.map(m => m[1].trim()).slice(0, 6).join(', '))
      : ok('nenhuma peça em alfa', 'tudo que embarca está documentado');
  }
}

secao('Versão');
{
  // Havia SEIS numeros de versao convivendo — package.json 0.7.0, README 0.7,
  // a capa v0.9, componentes v0.8, padroes v0.3 e tokens v0.1. Cada pagina
  // congelou no dia em que foi escrita, e quem lia a doc de tokens acreditava
  // estar num sistema em que componente ainda nao existia.
  const pkg = JSON.parse(ler('package.json'));
  const versao = pkg.version;
  const curta = versao.replace(/\.0$/, '');       // 0.10.0 -> 0.10

  const divergentes = [];
  const ARQS = ['README.md', 'index.html', 'docs/index.html', 'components/index.html',
                'patterns/index.html', 'icons/index.html', 'preview/index.html'];
  for (const f of ARQS) {
    if (!existsSync(join(raiz, f))) continue;
    for (const m of ler(f).matchAll(/\bv?(\d+\.\d+(?:\.\d+)?)\b/g)) {
      const achado = m[1];
      // só interessa o que se apresenta COMO versão do sistema
      const redor = ler(f).slice(Math.max(0, m.index - 60), m.index + 20);
      if (!/vers|Vers|v\d|nav-ver|class="ver"/.test(redor)) continue;
      if (achado !== versao && achado !== curta) divergentes.push(`${f}: ${achado}`);
    }
  }
  // o topo do changelog tem de ser a versão que o pacote declara
  const topo = ler('CHANGELOG.md').match(/^##\s*\[(\d+\.\d+\.\d+)\]/m);
  if (topo && topo[1] !== versao) divergentes.push(`CHANGELOG.md: topo é ${topo[1]}`);

  divergentes.length
    ? falha(`versão divergente de package.json (${versao})`, divergentes.join(' · '))
    : ok('uma versão só em todo lugar', `${versao} · ${ARQS.length} páginas + changelog`);
}

secao('Páginas');
// Uma pagina que usa .yb-icon sem carregar a folha de icone renderiza SVG de
// 300x150 — o tamanho padrao de elemento substituido. Foi o que aconteceu com
// patterns/index.html: sete icones gigantes, e nenhuma checagem viu.
{
  const paginas = readdirSync(raiz, { withFileTypes: true })
    .flatMap(d => d.isDirectory() && d.name !== 'node_modules' && !d.name.startsWith('_') && !d.name.startsWith('.')
      ? [join(d.name, 'index.html')] : [])
    .concat('index.html')
    .filter(p => existsSync(join(raiz, p)));

  const semFolha = paginas.filter(p => {
    const h = ler(p);
    return /class="[^"]*\byb-icon\b/.test(h) && !h.includes('ybera-icons.css');
  });
  semFolha.length
    ? falha('página usa .yb-icon sem a folha de ícone', semFolha.join(', '))
    : ok('toda página que usa ícone carrega a folha', `${paginas.length} páginas`);

  // Sprite e pagina de icone tem de contar a mesma historia. Dez simbolos
  // ficaram no sprite sem entrar na pagina — os cinco selos, o play e os
  // quatro do footer — e nada acusou.
  {
    const sprite = ler('icons/ybera-icons.svg');
    const pagina = ler('icons/index.html');
    const noSprite = new Set([...sprite.matchAll(/<symbol id="yb-([\w-]+)"/g)].map(m => m[1]));
    const naPagina = new Set([...pagina.matchAll(/ybera-icons\.svg#yb-([\w-]+)/g)].map(m => m[1]));
    const soNoSprite = [...noSprite].filter(i => !naPagina.has(i));
    const soNaPagina = [...naPagina].filter(i => !noSprite.has(i));
    soNoSprite.length || soNaPagina.length
      ? falha('sprite e página de ícone divergem',
          [soNoSprite.length && `sem documentar: ${soNoSprite.join(', ')}`,
           soNaPagina.length && `documentado sem existir: ${soNaPagina.join(', ')}`].filter(Boolean).join(' · '))
      : ok('todo ícone do sprite está documentado', `${noSprite.size} símbolos`);
  }

  // Mesmo raciocinio da folha de icone: marcador que so o JS entende, numa
  // pagina que nao carrega o JS, e componente morto. patterns/ tinha o menu
  // inteiro sem quem fechasse no Escape.
  {
    const MARCADORES = ['data-yb-open', 'data-yb-stepper', 'data-yb-gallery',
                        'yb-nav__toggle', 'yb-header__drawer'];
    const semJs = paginas.filter(p => {
      const h = ler(p);
      return MARCADORES.some(m => h.includes(m)) && !h.includes('ybera-components.js');
    });
    semJs.length
      ? falha('página usa marcador de JS sem carregar o JS', semJs.join(', '))
      : ok('toda página com comportamento carrega o JS', `${paginas.length} páginas`);
  }

  // Seletor de tipo solto na folha da propria pagina vaza para dentro do
  // demo. Um `footer{max-width:70ch}` escrito para o rodape de credito
  // esmagou o footer do sistema a 599px em patterns/. So acusa quando o
  // elemento realmente aparece dentro de um .stage — o resto e falso alarme.
  {
    const TIPOS = ['header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
                   'ul', 'ol', 'form', 'table'];
    const vazamentos = [];
    for (const p of paginas) {
      const h = ler(p);
      const folha = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
      if (!folha) continue;
      const demos = [...h.matchAll(/<div class="stage[^"]*">([\s\S]*?)<\/section>/g)].map(m => m[1]).join('');
      for (const tipo of TIPOS) {
        const solto = new RegExp(`(^|[},])\\s*${tipo}\\s*[,{]`, 'm').test(folha);
        if (solto && new RegExp(`<${tipo}[\\s>]`).test(demos))
          vazamentos.push(`${p}: ${tipo}{}`);
      }
    }
    vazamentos.length
      ? falha('seletor de tipo vaza para dentro do demo', vazamentos.join(', '))
      : ok('nenhum seletor de tipo vaza para o demo', `${paginas.length} páginas`);
  }

  // Sumario e titulo da secao tem de dizer o mesmo nome, e a lista tem de
  // estar em ordem alfabetica. O sumario dizia "Gallery" e o <h2> dizia
  // "Product gallery" — dois nomes para um componente so.
  {
    const problemas = [];
    for (const p of paginas) {
      const h = ler(p);
      const nav = h.match(/<nav[\s\S]*?<\/nav>/);
      if (!nav) continue;
      const sumario = [...nav[0].matchAll(/<li><a href="#([\w-]+)">([^<]+)<\/a><\/li>/g)]
        .map(m => ({ id: m[1], nome: m[2].trim() }));
      if (sumario.length < 2) continue;

      for (const { id, nome } of sumario) {
        const sec = h.match(new RegExp(`<section id="${id}">\\s*<h2>([^<]+)</h2>`));
        if (sec && sec[1].trim() !== nome)
          problemas.push(`${p}#${id}: sumário diz "${nome}", título diz "${sec[1].trim()}"`);
      }

      // Catalogo se ordena; sequencia de leitura, nao. A pagina de tokens vai
      // de fundamentos a estado numa ordem que ensina — alfabeta-la piora.
      const CATALOGO = ['components/index.html', 'patterns/index.html'];
      if (!CATALOGO.includes(p)) continue;

      const chave = s => s.replace(/&amp;/g, '&').normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const nomes = sumario.map(x => x.nome);
      const ordenado = [...nomes].sort((a, b) => chave(a) < chave(b) ? -1 : chave(a) > chave(b) ? 1 : 0);
      const fora = nomes.findIndex((n, i) => n !== ordenado[i]);
      if (fora >= 0) problemas.push(`${p}: fora de ordem a partir de "${nomes[fora]}"`);

      const ids = [...h.matchAll(/<section id="([\w-]+)">/g)].map(m => m[1]);
      if (ids.join() !== sumario.map(x => x.id).join())
        problemas.push(`${p}: seções em ordem diferente do sumário`);
    }
    problemas.length
      ? falha('sumário e seções divergem', problemas.join(' · '))
      : ok('sumário alfabético e casando com os títulos', `${paginas.length} páginas`);
  }

  // A licao da folha de icone, generalizada: classe usada numa pagina que nao
  // carrega a folha onde ela e definida renderiza HTML cru. Foi assim que o
  // demo do carrinho ficou sem estilo nenhum na pagina de componentes — ela
  // usava 12 classes .yb-cart*, todas definidas em patterns/.
  {
    const orfas = [];
    for (const p of paginas) {
      const h = ler(p);
      const dir = dirname(p);
      const folhas = [...h.matchAll(/<link[^>]+href="([^"]+\.css)"/g)]
        .map(m => m[1])
        .filter(u => !/^https?:/.test(u))
        .map(u => join(dir, u).replace(/^\.\//, ''));

      let definido = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
      for (const folha of folhas)
        if (existsSync(join(raiz, folha))) definido += '\n' + ler(folha);

      // <pre> e <code> mostram marcacao como texto; ali `class="yb-header__icon"`
      // e exemplo, nao uso. Sem tirar, a pagina de icones acusava falso.
      const marcacao = h.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
      const usadas = new Set([...marcacao.matchAll(/class="([^"]*)"/g)]
        .flatMap(m => m[1].split(/\s+/))
        .filter(c => /^yb-[a-z0-9_-]+$/.test(c)));

      const semDono = [...usadas].filter(c => !definido.includes('.' + c));
      if (semDono.length) orfas.push(`${p}: ${semDono.slice(0, 6).join(', ')}${semDono.length > 6 ? ` (+${semDono.length - 6})` : ''}`);
    }
    orfas.length
      ? falha('classe usada sem a folha que a define', orfas.join(' · '))
      : ok('toda classe yb- tem folha que a define', `${paginas.length} páginas`);
  }

  // A lição da folha de ícone — "todo símbolo do sprite está documentado" —
  // generalizada para componente. Sete componentes viviam em
  // ybera-components.css, subiam no dist/ e não apareciam em lugar nenhum da
  // documentação: collection, review, seals, logobar, post, quote e video.
  // Componente que ninguém encontra é componente que alguém reescreve.
  {
    const PARES = [
      { css: 'componentes', pagina: 'components/index.html' },
      { css: 'padroes', pagina: 'patterns/index.html' },
    ];
    // não são componente: base, utilitário e blocos de regra global
    const NAO_E_COMPONENTE = /^(YBERA|BASE|MOVIMENTO|UTILIT|ALVO COMPACTO|ALTO CONTRASTE|NAVEGACAO)/i;
    const ausentes = [];
    for (const { css: chave, pagina } of PARES) {
      if (!existsSync(join(raiz, pagina))) continue;
      const folha = css[chave] || '';
      const html = ler(pagina);
      // cada bloco de cabeçalho `/* === NOME ... === */` abre uma seção
      const blocos = [...folha.matchAll(/\/\*\s*=+\s*\n\s{3}([^\n]+)\n([\s\S]*?)=+\s*\*\//g)];
      // A família de cada seção é o prefixo que ELA declara. Sem isto, a seção
      // dos selos "passava" porque usa `.yb-icon` dentro, e `.yb-icon` aparece
      // em toda a doc — o check dizia sim para um componente invisível.
      const familiaDe = (corpo) => {
        const conta = new Map();
        for (const m of corpo.matchAll(/(^|[,}])\s*\.(yb-[a-z0-9]+)(?![\w-]*\s*\()/gm))
          conta.set(m[2], (conta.get(m[2]) || 0) + 1);
        for (const m of corpo.matchAll(/(^|[,}])\s*\.(yb-[a-z0-9]+)(__|--)/gm))
          conta.set(m[2], (conta.get(m[2]) || 0) + 2);   // elemento/modificador pesa mais
        return [...conta.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
      };
      for (let i = 0; i < blocos.length; i++) {
        const nome = blocos[i][1].trim();
        if (NAO_E_COMPONENTE.test(nome)) continue;
        const inicio = blocos[i].index + blocos[i][0].length;
        const fim = i + 1 < blocos.length ? blocos[i + 1].index : folha.length;
        const corpo = folha.slice(inicio, fim);
        const ordenadas = familiaDe(corpo);
        if (!ordenadas.length) continue;
        // só a família dominante e as que compartilham a raiz dela
        const base = ordenadas[0];
        const raizes = ordenadas.filter(c => c === base || c.startsWith(base) || base.startsWith(c));
        // a página usa a classe em marcação de verdade, não dentro de <pre>/<code>
        const marcacao = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
        // O toast não tem marcação estática: ele nasce e morre no JS. Vale
        // também a seção da doc que leva o nome do componente — é onde a
        // pessoa procura, e é o que o sumário lista.
        const mostrada = raizes.some(c =>
          new RegExp(`class="[^"]*\\b${c}\\b`).test(marcacao)
          || new RegExp(`<section id="${c.replace(/^yb-/, '')}s?">`).test(html));
        if (!mostrada) ausentes.push(`${nome} (.${raizes[0]})`);
      }
    }
    ausentes.length
      ? falha('componente sem demonstração na doc', ausentes.join(' · ')
          + ' — componente que ninguém encontra é componente que alguém reescreve')
      : ok('todo componente da folha aparece na doc', '');
  }

  // A doc mostra cada componente em 375px num <iframe src="solo.html?c=ID">.
  // Se o solo.html sumir da pasta, os quadros ficam vazios sem nada acusar.
  {
    const problemas = [];
    for (const p of paginas) {
      const h = ler(p);
      if (!h.includes("solo.html?c=")) continue;
      const solo = join(dirname(p), 'solo.html');
      if (!existsSync(join(raiz, solo))) { problemas.push(`${p}: falta ${solo}`); continue; }
      // todo id de secao tem de ter quadro, e todo quadro tem de ter secao
      const secoes = [...h.matchAll(/<section id="([\w-]+)">/g)].map(m => m[1]);
      const s = ler(solo);
      if (!s.includes("getElementById(alvo)"))
        problemas.push(`${solo}: não recorta mais a seção pedida`);
      if (!secoes.length) problemas.push(`${p}: nenhuma seção para enquadrar`);
    }
    problemas.length
      ? falha('preview mobile da doc quebrado', problemas.join(' · '))
      : ok('doc mostra cada seção em 375px', 'solo.html presente nas duas');
  }

  // Aninhamento. Um </div> a mais fecha a <section> antes da hora e o resto da
  // pagina vira filho de quem nao devia — o navegador conserta em silencio, e
  // so um seletor `section > p` deixa de casar sem explicacao. Foi o que
  // aconteceu ao inserir a familia de estado na secao Color.
  {
    const VAZIAS = new Set(['br','img','input','link','meta','hr','source','use','path',
                            'circle','rect','area','col','embed','track','wbr']);
    const quebradas = [];
    for (const p of paginas) {
      // Apaga o CONTEUDO de comentario, script e style preservando as quebras
      // de linha: remover o trecho inteiro desloca a contagem e a checagem
      // aponta para a linha errada — foi o que aconteceu na primeira versao.
      const vazio = s => s.replace(/[^\n]/g, ' ');
      const h = ler(p)
        .replace(/<!--[\s\S]*?-->/g, vazio)
        .replace(/<(script|style)([^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, attrs, corpo) =>
          `<${tag}${attrs}>${vazio(corpo)}</${tag}>`);
      const pilha = [];
      let erro = null;
      for (const m of h.matchAll(/<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g)) {
        const [, fecha, tag, auto] = m;
        const t2 = tag.toLowerCase();
        if (VAZIAS.has(t2) || auto || t2 === '!doctype') continue;
        const linha = h.slice(0, m.index).split('\n').length;
        if (!fecha) { pilha.push([t2, linha]); continue; }
        if (!pilha.length) { erro = `</${t2}> sem abertura, linha ${linha}`; break; }
        const [aberta, ondeAbriu] = pilha[pilha.length - 1];
        if (aberta !== t2) { erro = `</${t2}> na linha ${linha} fecha <${aberta}> de ${ondeAbriu}`; break; }
        pilha.pop();
      }
      if (!erro && pilha.length) erro = `sem fechar: <${pilha[pilha.length - 1][0]}> da linha ${pilha[pilha.length - 1][1]}`;
      if (erro) quebradas.push(`${p}: ${erro}`);
    }
    quebradas.length
      ? falha('aninhamento de tag quebrado', quebradas.join(' · '))
      : ok('tags fecham na ordem em que abrem', `${paginas.length} páginas`);
  }

  // ancora quebrada dentro da propria pagina
  const ancorasMortas = [];
  for (const p of paginas) {
    const h = ler(p);
    const ids = new Set([...h.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    for (const m of h.matchAll(/href="#([^"]+)"/g))
      if (!ids.has(m[1])) ancorasMortas.push(`${p}#${m[1]}`);
  }
  ancorasMortas.length
    ? falha('âncora sem destino', ancorasMortas.join(', '))
    : ok('âncoras internas resolvem', `${paginas.length} páginas`);
}

/* ===========================================================================
   O NUMERO QUE A DOC PROMETE

   Esta e a ultima checagem porque ela e a unica que so pode existir aqui: o
   total so se conhece depois de contar. Ela fecha o mesmo buraco da checagem de
   versao — a doc dizia "44 checagens" quando ja eram 71, e "52" na mesma
   pagina duas secoes abaixo. Numero em documentacao envelhece calado.
   =========================================================================== */
secao('Autodescrição');
{
  const ARQS = ['README.md', 'GOVERNANCA.md', 'CONTRIBUINDO.md', 'index.html'];
  // +1 porque esta checagem tambem conta, e ela ainda nao foi registrada
  const total = checagens + 1;
  const erradas = [];
  for (const f of ARQS) {
    if (!existsSync(join(raiz, f))) continue;
    for (const m of ler(f).matchAll(/(\d+)\s+checagens/g))
      if (Number(m[1]) !== total) erradas.push(`${f}: diz ${m[1]}`);
  }
  erradas.length
    ? falha(`a doc promete um número de checagens que não é ${total}`, erradas.join(' · '))
    : ok('a doc conta o número certo de checagens', `${total}`);
}

/* ========================================================== resultado */
console.log('\n' + '─'.repeat(56));
const resumo = `${checagens} checagens · ${falhas} falha(s) · ${avisos} aviso(s)`;
if (falhas) { console.log(vermelho(`FALHOU — ${resumo}`)); process.exit(1); }
console.log(verde(`PASSOU — ${resumo}`));
