#!/usr/bin/env node
/* A REGRA: cada PO só altera o que é DELA (15/10/2026).

   Como as POs passaram a testar o sistema, qualquer uma pode querer mexer em
   algo do relatório. A regra do Urlan: a mudança vale só para a PO que a fez.
   Tudo o que é compartilhado — o código, os estilos, as páginas, a função da
   Vercel, os testes — é do Urlan e só muda por ele.

   Esta regra mora aqui, num lugar só, e é lida por dois consumidores: o
   conferidor de linha de comando (abaixo) e o teste que a trava
   (tests/regra-por-po.test.js). O CLAUDE.md da raiz descreve a mesma regra em
   palavras, pra quem abrir o projeto numa sessão do Claude.

   O QUE UMA PO PODE ALTERAR (x = a chave dela: carla, isadora, daniele…):
   - assets/conteudo/<x>/**            cartões, roadmap, fontes e imagens dela
   - entregas-<x>-*.html               páginas só dela (variações de desenho)
   - scripts/gerar-entregas-<x>.js     o gerador dessas páginas
   - assets/dados-*-<x>.json           os dados publicados dela
   O Urlan (chave `urlan`) é o dono do projeto e pode tudo.

   Uso:  node scripts/regra-por-po.js <po> [base]
         confere o que mudou em relação à base (padrão: origin/main), mais o
         que está solto na pasta, e falha se algo estiver fora do que é dela. */
const path = require('path');
const { execFileSync } = require('child_process');

const DONO = 'urlan';

// A chave vira parte de caminho e de expressão regular: só letras minúsculas.
const chaveValida = (po) => typeof po === 'string' && /^[a-z]{2,30}$/.test(po);

function permitido(po, caminho) {
  if (!chaveValida(po)) return false;
  if (po === DONO) return true;
  if (typeof caminho !== 'string' || !caminho) return false;
  // Caminho que sobe de pasta, é absoluto ou usa barra invertida é o jeito de
  // um arquivo "dela" apontar pra fora da pasta dela.
  if (caminho.includes('\\') || caminho.startsWith('/')) return false;
  const limpo = path.posix.normalize(caminho);
  if (limpo !== caminho || limpo.split('/').includes('..')) return false;
  const proprios = [
    new RegExp('^assets/conteudo/' + po + '/.+'),
    new RegExp('^entregas-' + po + '-[a-z0-9-]+\\.html$'),
    new RegExp('^scripts/gerar-entregas-' + po + '\\.js$'),
    new RegExp('^assets/dados-[a-z0-9-]+-' + po + '\\.json$'),
  ];
  return proprios.some((re) => re.test(caminho));
}

function foraDoQueEDela(po, arquivos) {
  return arquivos.filter((f) => !permitido(po, f));
}

function arquivosAlterados(base, cwd) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  const conjunto = new Set([
    ...git('diff', '--name-only', base + '...HEAD'),
    ...git('diff', '--name-only', 'HEAD'),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]);
  return [...conjunto].sort();
}

function cli(argv) {
  const [po, base = 'origin/main'] = argv;
  if (!chaveValida(po)) {
    console.error('uso: node scripts/regra-por-po.js <po> [base]   (ex.: carla)');
    return 2;
  }
  let arquivos;
  try { arquivos = arquivosAlterados(base, path.join(__dirname, '..')); } catch (e) {
    console.error('não consegui comparar com "' + base + '": ' + e.message);
    return 2;
  }
  if (!arquivos.length) { console.log('nada alterado em relação a ' + base); return 0; }
  const fora = foraDaQueEDela(po, arquivos);
  if (!fora.length) {
    console.log(po + ': ' + arquivos.length + ' arquivo(s), todos dela. Pode publicar.');
    return 0;
  }
  console.error(po + ' só pode alterar o que é dela, e estes arquivos são compartilhados:');
  for (const f of fora) console.error('  ' + f);
  console.error('\nA mudança deles passa pelo Urlan. Desfaça-os (git checkout -- <arquivo>) ou peça a ele.');
  return 1;
}

module.exports = { permitido, foraDoQueEDela, arquivosAlterados, chaveValida, DONO };

if (require.main === module) process.exit(cli(process.argv.slice(2)));
