/* DUAS FALHAS MUDAS que faziam o número da tela ficar errado sem nada avisar.
   Achadas na varredura de 05/10/2026, nenhuma das duas tinha teste.

   As duas erram em direções opostas, e é por isso que valem teste e não só
   um comentário: uma conta A MENOS (resultado cortado no teto da consulta),
   outra conta A MAIS (consulta sem recorte de área). Nenhuma das duas deixa
   rastro na tela — e o número vai pro relatório do stakeholder. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../assets/api.js');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

/* ---------- 1. corte silencioso no teto da consulta ---------- */
/* O teto era 2000 e a consulta de produtos puxa o histórico INTEIRO do time,
   sem ORDER BY. Um time que roda 21 sprints a ~150 itens passa disso sem
   esforço; ao estourar, o DevOps devolve 200 OK com a lista cortada, e a
   Central contava a menos. Resultado no teto é indistinguível de resultado
   cortado — então trata-se como cortado. */
const ctxFalso = (n) => ({
  base: 'https://dev.azure.com/org',
  pat: 'x',
  fetchImpl: async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({
      workItems: Array.from({ length: n }, (_, i) => ({ id: i + 1 })),
      value: Array.from({ length: n }, (_, i) => ({ id: 'g' + i, name: 'n' + i })),
    }),
  }),
});

test('o teto da consulta de itens é o do serviço, não um número apertado', () => {
  const fonte = ler('assets/api.js');
  const teto = /TETO = \{ wiql: (\d+)/.exec(fonte);
  assert.ok(teto, 'o teto saiu do formato esperado');
  assert.ok(Number(teto[1]) >= 20000,
    `teto de ${teto[1]} corta o histórico de um time real — o do serviço é 20000`);
  assert.ok(!/\$top=2000\b/.test(fonte), 'o teto antigo de 2000 voltou');
});

test('resultado no teto vira erro, não lista pela metade', async () => {
  await assert.rejects(() => A.runWiql(ctxFalso(20000), 'p', 't', 'q'), /cortado/);
  await assert.rejects(() => A.listProjects(ctxFalso(500)), /cortado/);
  await assert.rejects(() => A.listTeams(ctxFalso(500), 'id'), /cortado/);
});

test('abaixo do teto passa inteiro — o erro é pro caso excepcional', async () => {
  assert.equal((await A.runWiql(ctxFalso(2001), 'p', 't', 'q')).length, 2001);
  assert.equal((await A.runWiql(ctxFalso(0), 'p', 't', 'q')).length, 0);
});

/* ---------- 2. escopo que incha quando a área falha ---------- */
/* `areaClause([])` devolve string vazia, e a consulta sem recorte vale pro
   PROJETO INTEIRO: o relatório passa a contar itens de outros times. O catch
   era mudo nos quatro lugares; o comentário dizia "segue projeto inteiro",
   como se fosse degradação suave. Não é — é número maior que a realidade. */
test('toda falha de área avisa, nos quatro lugares que consultam', () => {
  for (const arq of ['assets/app.js', 'assets/report.js']) {
    const fonte = ler(arq);
    const tentativas = (fonte.match(/A\.teamAreas\(/g) || []).length;
    const avisos = (fonte.match(/PROJETO INTEIRO/g) || []).length;
    assert.equal(avisos, tentativas,
      `${arq}: ${tentativas} consultas de área e ${avisos} avisos — alguma falha segue muda`);
  }
  assert.ok(!/catch \(e\) \{ \/\* segue projeto inteiro \*\/ \}/.test(ler('assets/app.js')),
    'o catch mudo voltou');
});

/* No report o estrago é publicado, então não basta console: o PO tem que ver
   antes de mandar o link. E o aviso tem que ser por carga — um aviso velho
   grudado na tela mente tanto quanto a ausência dele. */
test('o report mostra o escopo furado pro PO e zera o aviso a cada carga', () => {
  const fonte = ler('assets/report.js');
  assert.match(fonte, /st\.areaIncerta = true;/, 'o report precisa registrar a falha');
  assert.match(fonte, /st\.areaIncerta = false;[^\n]*\n\s*render\(\);/,
    'sem zerar no começo da carga, o aviso sobrevive a um refresh que deu certo');
  assert.match(fonte, /function avisarAreaIncerta/, 'o aviso precisa chegar à tela');
  /* O corpo do documento é o que vai pro stakeholder: aviso de ferramenta não
     entra lá. O leitor do link recebe dado já fechado. */
  assert.match(fonte, /renderFiltro\(\) \{\n  avisarAreaIncerta\(\);/,
    'o aviso mora na barra do PO, que só existe no modo ferramenta');
});

/* ---------- 3. nome do time escrito à mão ---------- */
test('o time de sprint é lido da constante, não repetido em texto', () => {
  const fonte = ler('assets/app.js');
  const decl = (fonte.match(/const TIME_COM_SPRINT = '([^']+)'/) || [])[1];
  assert.ok(decl, 'a constante do time de sprint sumiu');
  const literais = (fonte.match(new RegExp("'" + decl + "'", 'g')) || []).length;
  assert.equal(literais, 1,
    `"${decl}" aparece ${literais}x como texto: renomear o time no DevOps deixaria as telas discordando`);
});
