/* =========================================================================
   YBERA DESIGN SYSTEM · CSS -> W3C DESIGN TOKENS (DTCG)

     node tools/tokens-to-json.mjs        escreve dist/ybera-tokens.json
     node tools/tokens-to-json.mjs --check  compara sem escrever (código 1 se difere)

   -------------------------------------------------------------------------
   POR QUE O CSS É A FONTE, E NÃO O JSON

   A decisão de projeto do sistema é que a loja US roda Shopify e a BR roda
   Wake, e CSS custom property é o único denominador comum entre as duas. Se o
   JSON virasse fonte, todo consumo passaria a exigir um build — exatamente o
   que a decisão evita.

   Então o JSON é DERIVADO. Ele existe para quem não lê CSS: Figma Variables,
   Style Dictionary, Tokens Studio, geradores de tema nativo. `build.sh` o
   regenera e `test/validate.mjs` reprova se ele estiver defasado, do mesmo
   jeito que já faz com `dist/`.

   -------------------------------------------------------------------------
   DUAS ESCOLHAS DE FORMATO, DECLARADAS

   1. `dimension` sai como string ("16px", "-0.035em", "65ch"), não como o
      objeto {value, unit} do rascunho mais recente. Motivo: o objeto só
      admite `px` e `rem`, e a escala tem `em` (tracking), `ch` (medida de
      leitura) e `%`. Emitir objeto obrigaria a inventar um tipo para um terço
      da escala. A forma string é a que Style Dictionary e Tokens Studio leem.

   2. Um token cujo nome também é prefixo de outros vira `<grupo>.default`.
      `--yb-border` e `--yb-border-subtle` não podem coexistir como token e
      grupo no mesmo caminho — a especificação proíbe. Então `--yb-border`
      sai em `border.default`. O mapa inverso está em `$extensions`, em cada
      token, no campo `com.ybera.cssVariable`.
   ========================================================================= */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');

const FONTES = [
  { arquivo: 'tokens/00-primitives.css', camada: 'primitive' },
  { arquivo: 'tokens/01-semantic.css', camada: 'semantic' },
];
const SAIDA = 'dist/ybera-tokens.json';

/* --------------------------------------------------------------- leitura */
// Lê `--nome: valor;` do topo de cada declaração, ignorando comentários.
// O valor pode conter parênteses aninhados — `clamp(2rem, calc(1px + 2vw), 3rem)` —
// então o corte é no `;` que estiver fora de parêntese.
function declaracoes(css) {
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const fora = [];
  const re = /(--yb-[\w-]+)\s*:/g;
  let m;
  while ((m = re.exec(limpo))) {
    let i = re.lastIndex, nivel = 0, valor = '';
    while (i < limpo.length) {
      const c = limpo[i];
      if (c === '(') nivel++;
      else if (c === ')') nivel--;
      else if ((c === ';' || c === '}') && nivel === 0) break;
      valor += c;
      i++;
    }
    fora.push({ nome: m[1], valor: valor.trim() });
  }
  return fora;
}

/* Só a declaração de `:root` sem condição entra. Redefinições dentro de
   `@media` ou de `[data-market]` são sobreposição de contexto, e o formato
   DTCG não tem onde guardá-las sem inventar extensão — ficam registradas em
   $extensions do token base. */
function blocosRaiz(css) {
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const saida = [];
  const re = /(^|\})\s*:root\s*\{/g;
  let m;
  while ((m = re.exec(limpo))) {
    let i = re.lastIndex, nivel = 1, corpo = '';
    while (i < limpo.length && nivel > 0) {
      const c = limpo[i];
      if (c === '{') nivel++;
      else if (c === '}') { nivel--; if (!nivel) break; }
      corpo += c;
      i++;
    }
    // dentro de @media o `:root` vem precedido de `{` de media, não de `}`
    const antes = limpo.slice(0, m.index);
    const abertos = (antes.match(/\{/g) || []).length - (antes.match(/\}/g) || []).length;
    if (abertos === 0) saida.push(corpo);
  }
  return saida;
}

/* ------------------------------------------------------------------ tipo */
const EH_HEX = (v) => /^#[0-9A-Fa-f]{3,8}$/.test(v);
const EH_COR_FN = (v) => /^(rgba?|hsla?|color|oklch|lab)\(/.test(v);

function inferirTipo(nome, valor) {
  const n = nome.replace(/^--yb-/, '');

  if (EH_HEX(valor) || EH_COR_FN(valor)) return 'color';
  if (/^(duration|transition)/.test(n) || /^\d+(\.\d+)?ms$/.test(valor)) return 'duration';
  if (/^ease/.test(n) || valor.startsWith('cubic-bezier(')) return 'cubicBezier';
  if (/font-weight/.test(n)) return 'fontWeight';
  if (/^font-(sans|mono)$|font-family/.test(n)) return 'fontFamily';
  if (/^shadow|^elevation/.test(n)) return 'shadow';
  if (/^(line-height|opacity|z-)/.test(n)) return 'number';
  if (/^aspect/.test(n)) return 'number';          // razão, não medida
  if (/^-?[\d.]+(px|rem|em|ch|vw|vh|%)$/.test(valor)) return 'dimension';
  if (/^-?[\d.]+$/.test(valor)) return 'number';
  if (valor.startsWith('clamp(') || valor.startsWith('calc(')) return 'dimension';
  return 'dimension';
}

/* ---------------------------------------------------------------- valor */
function valorDTCG(tipo, valor, nome) {
  switch (tipo) {
    case 'number': {
      // razão de proporção: "4 / 5" é número, e o formato só entende número.
      // O texto original volta em $extensions para quem precisa reemitir CSS.
      const razao = valor.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      if (razao) return Number(razao[1]) / Number(razao[2]);
      const n = Number(valor);
      return Number.isFinite(n) ? n : valor;
    }
    case 'fontWeight':
      return Number(valor);
    case 'fontFamily':
      return valor.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    case 'cubicBezier': {
      const m = valor.match(/cubic-bezier\(([^)]+)\)/);
      return m ? m[1].split(',').map(s => Number(s.trim())) : valor;
    }
    case 'shadow':
      return sombraDTCG(valor);
    default:
      return valor;
  }
}

/* `0 4px 12px rgba(30,30,31,.08), 0 2px 4px …` -> array de objetos DTCG.
   `none` não é sombra: sai como lista vazia, que é o que o formato tem para
   dizer "sem sombra" sem mentir um objeto de zeros. */
function sombraDTCG(valor) {
  if (valor.trim() === 'none') return [];
  const camadas = [];
  let atual = '', nivel = 0;
  for (const c of valor) {
    if (c === '(') nivel++;
    if (c === ')') nivel--;
    if (c === ',' && nivel === 0) { camadas.push(atual); atual = ''; continue; }
    atual += c;
  }
  if (atual.trim()) camadas.push(atual);

  return camadas.map(camada => {
    const cor = camada.match(/(rgba?\([^)]*\)|#[0-9A-Fa-f]{3,8})/);
    const resto = camada.replace(cor ? cor[0] : '', '').trim().split(/\s+/).filter(Boolean);
    return {
      offsetX: resto[0] || '0',
      offsetY: resto[1] || '0',
      blur: resto[2] || '0',
      spread: resto[3] || '0',
      color: cor ? cor[0] : 'transparent',
    };
  });
}

/* --------------------------------------------------------------- caminho */
// --yb-font-size-md -> ['font','size','md']
const segmentos = (nome) => nome.replace(/^--yb-/, '').split('-');

/* ============================================================== execução */
const tokens = [];
const vistos = new Set();

for (const { arquivo, camada } of FONTES) {
  if (!existsSync(join(raiz, arquivo))) {
    console.error(`fonte ausente: ${arquivo}`);
    process.exit(1);
  }
  const css = ler(arquivo);
  for (const corpo of blocosRaiz(css)) {
    for (const { nome, valor } of declaracoes(corpo)) {
      if (vistos.has(nome)) continue;          // primeira declaração vence
      vistos.add(nome);
      tokens.push({ nome, valor, camada, arquivo });
    }
  }
}

// contextos: mesma variável redeclarada em @media ou [data-market]
const contextos = {};
for (const { arquivo } of FONTES) {
  const css = ler(arquivo);
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of limpo.matchAll(/@media\s*([^{]+)\{\s*:root\s*\{([^}]*)\}/g)) {
    for (const d of declaracoes(m[2])) {
      (contextos[d.nome] ||= []).push({ condicao: `@media ${m[1].trim()}`, valor: d.valor });
    }
  }
}

/* Um nome que também é prefixo de outro vira `<grupo>.default`. */
const nomes = tokens.map(t => t.nome);
const ehPrefixo = new Set(
  nomes.filter(n => nomes.some(o => o !== n && o.startsWith(n + '-'))));

const caminhoDe = new Map();
for (const t of tokens) {
  const base = segmentos(t.nome);
  caminhoDe.set(t.nome, ehPrefixo.has(t.nome) ? [...base, 'default'] : base);
}

/* Alias: `var(--yb-gray-950)` -> `{gray.950}`. Um valor que é EXATAMENTE um
   var() vira referência; valor composto (`var(--a) var(--b)`) fica literal,
   porque o formato não tem interpolação. */
function comoAlias(valor) {
  const m = valor.match(/^var\(\s*(--yb-[\w-]+)\s*(?:,[^)]*)?\)$/);
  if (!m) return null;
  const alvo = caminhoDe.get(m[1]);
  return alvo ? `{${alvo.join('.')}}` : null;
}

const arvore = {};
let contaAlias = 0;

for (const t of tokens) {
  const caminho = caminhoDe.get(t.nome);
  let no = arvore;
  for (const seg of caminho.slice(0, -1)) {
    if (typeof no[seg] !== 'object' || no[seg] === null || '$value' in no[seg]) no[seg] ||= {};
    no = no[seg];
  }
  const folha = caminho[caminho.length - 1];

  const alias = comoAlias(t.valor);
  // o tipo do alias é o do alvo, resolvido depois
  const tipo = alias ? null : inferirTipo(t.nome, t.valor);
  if (alias) contaAlias++;

  const emitido = alias ?? valorDTCG(tipo, t.valor, t.nome);
  const token = {
    $value: emitido,
    $extensions: {
      'com.ybera.cssVariable': t.nome,
      'com.ybera.layer': t.camada,
    },
  };
  if (tipo) token.$type = tipo;
  // o CSS original, quando o formato obrigou a converter
  if (!alias && String(emitido) !== t.valor && tipo !== 'fontFamily'
      && tipo !== 'cubicBezier' && tipo !== 'shadow') {
    token.$extensions['com.ybera.cssValue'] = t.valor;
  }
  if (contextos[t.nome]) token.$extensions['com.ybera.contexts'] = contextos[t.nome];

  no[folha] = token;
}

/* Resolve o $type de quem é alias, seguindo a cadeia até um token tipado. */
function buscar(caminho) {
  return caminho.split('.').reduce((n, s) => (n && typeof n === 'object' ? n[s] : undefined), arvore);
}
for (const t of tokens) {
  const no = buscar(caminhoDe.get(t.nome).join('.'));
  if (!no || no.$type) continue;
  let atual = no, saltos = 0;
  while (atual && typeof atual.$value === 'string'
         && /^\{[\w.]+\}$/.test(atual.$value) && saltos++ < 12) {
    atual = buscar(atual.$value.slice(1, -1));
    if (atual && atual.$type) { no.$type = atual.$type; break; }
  }
}

/* Integridade do documento antes de escrever. Três coisas o formato proíbe e
   que um erro de nomeação produz em silêncio: nó que é token e grupo ao mesmo
   tempo, alias apontando para o vazio, e token sem tipo resolvido. */
{
  const problemas = [];
  (function andar(no, caminho) {
    for (const [chave, filho] of Object.entries(no)) {
      if (chave.startsWith('$')) continue;
      const aqui = [...caminho, chave].join('.');
      if (filho && typeof filho === 'object' && '$value' in filho) {
        const extras = Object.keys(filho).filter(k => !k.startsWith('$'));
        if (extras.length) problemas.push(`${aqui}: é token E grupo (${extras.join(', ')})`);
        if (typeof filho.$value === 'string' && /^\{[\w.]+\}$/.test(filho.$value)
            && !buscar(filho.$value.slice(1, -1))) {
          problemas.push(`${aqui}: alias ${filho.$value} não resolve`);
        }
        if (!filho.$type) problemas.push(`${aqui}: sem $type`);
      } else if (filho && typeof filho === 'object') {
        andar(filho, [...caminho, chave]);
      }
    }
  })(arvore, []);
  if (problemas.length) {
    console.error('documento DTCG inválido:');
    problemas.forEach(p => console.error(`  ${p}`));
    process.exit(1);
  }
}

/* A versao entra no documento porque quem consome este arquivo consome ele
   SOZINHO: o Figma importa um JSON, o Style Dictionary le um JSON, e nenhum dos
   dois enxerga o package.json ao lado. Sem esta linha, "que versao dos tokens
   esta no Figma" so se responde comparando valor por valor. */
const versao = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).version;

const documento = {
  $description:
    'Ybera Design System — tokens em W3C Design Tokens Community Group format. '
    + 'DERIVADO de tokens/00-primitives.css e tokens/01-semantic.css: o CSS é a fonte. '
    + 'Não edite este arquivo — rode ./build.sh. '
    + 'dimension sai como string (a escala usa em/ch, que o formato objeto não admite). '
    + 'Token cujo nome é prefixo de outro vira <grupo>.default; '
    + 'o nome original está sempre em $extensions["com.ybera.cssVariable"].',
  $extensions: {
    'com.ybera.version': versao,
    'com.ybera.source': ['tokens/00-primitives.css', 'tokens/01-semantic.css'],
  },
  ...arvore,
};

const json = JSON.stringify(documento, null, 2) + '\n';
const destino = join(raiz, SAIDA);

if (process.argv.includes('--check')) {
  if (!existsSync(destino)) { console.error(`${SAIDA} ausente — rode ./build.sh`); process.exit(1); }
  if (readFileSync(destino, 'utf8') !== json) {
    console.error(`${SAIDA} defasado em relação ao CSS — rode ./build.sh`);
    process.exit(1);
  }
  console.log(`${SAIDA} em dia · ${tokens.length} tokens`);
} else {
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, json);
  console.log(`${SAIDA} · ${tokens.length} tokens (${contaAlias} aliases)`);
}
