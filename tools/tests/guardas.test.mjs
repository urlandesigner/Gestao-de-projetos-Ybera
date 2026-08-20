import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { guardaEsvaziamento, guardaStatusVazio, guardaLeituraAnterior, decidirGravacao, serializarFatos, relatorio, parsearFatos, coletarPendencias } from '../guardas.mjs';

test('primeira rodada passa quando ha itens', () => {
  assert.equal(guardaEsvaziamento(14, null).ok, true);
});

/* Zero nunca passa, nem na primeira rodada: um WIQL que nao acha nada e
   indistinguivel de uma area renomeada no DevOps. */
test('zero nunca passa', () => {
  assert.equal(guardaEsvaziamento(0, null).ok, false);
  assert.equal(guardaEsvaziamento(0, 14).ok, false);
});

/* Zero nao e so recusado: e recusado de um jeito que --forcar nao pode
   contornar. Nao ha "zero real" que alguem precise publicar. */
test('zero nao e forcavel', () => {
  assert.equal(guardaEsvaziamento(0, null).forcavel, false);
  assert.equal(guardaEsvaziamento(0, 14).forcavel, false);
});

test('queda maior que 20 por cento e recusada', () => {
  assert.equal(guardaEsvaziamento(11, 14).ok, false); // 78,6%
  assert.match(guardaEsvaziamento(11, 14).motivo, /11.*14/);
});

/* A queda abrupta pode ser real (o projeto encerrou uma leva de Epics de
   verdade) — por isso, ao contrario do zero, ela aceita --forcar. */
test('queda abrupta e forcavel', () => {
  assert.equal(guardaEsvaziamento(11, 14).forcavel, true);
});

test('queda dentro de 20 por cento passa', () => {
  assert.equal(guardaEsvaziamento(12, 14).ok, true); // 85,7%
});

test('crescer sempre passa', () => {
  assert.equal(guardaEsvaziamento(30, 14).ok, true);
});

/* guardaStatusVazio: tools/config.json com "estados" vazio não derruba a
   contagem de Epics (guardaEsvaziamento não vê problema), mas grava o board
   inteiro sem status. É uma guarda separada, e nunca aceita --forcar. */
test('guardaStatusVazio recusa quando todo item esta sem status', () => {
  const r = guardaStatusVazio([{ status:null }, { status:null }]);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /2 Epics/);
  assert.match(r.motivo, /estados/);
});

test('guardaStatusVazio deixa passar quando so alguns itens estao sem status', () => {
  assert.equal(guardaStatusVazio([{ status:'doing' }, { status:null }]).ok, true);
});

test('guardaStatusVazio passa com lista vazia (nada a recusar)', () => {
  assert.equal(guardaStatusVazio([]).ok, true);
});

test('guardaStatusVazio passa quando todos os itens tem status mapeado', () => {
  assert.equal(guardaStatusVazio([{ status:'doing' }, { status:'done' }]).ok, true);
});

test('serializarFatos produz JS valido e sem PAT', () => {
  const js = serializarFatos('2026-08-20T10:00:00Z', [{ id:1, azureTitle:'A"quote', status:'doing' }]);
  assert.match(js, /^\/\* GERADO/);
  assert.match(js, /const RADAR_FATOS =/);
  assert.match(js, /"geradoEm": "2026-08-20T10:00:00Z"/);
  /* JSON.stringify e o que garante escape de aspas e de barra invertida —
     titulo do DevOps vem com "\" nas Area Paths e com aspas no texto. */
  assert.ok(js.includes('A\\"quote'));
});

test('relatorio lista o que precisa de acao humana', () => {
  const txt = relatorio({
    itens:[{ id:1 }, { id:2 }],
    orfas:[{ id:99, fields:{ 'System.Title':'Solta' } }],
    semStatus:[{ id:2, estadoCru:'Em Homologação' }],
    semTrack:[{ id:1, azureTitle:'X' }],
    mudancas:[{ id:1, tipo:'status', de:'next', para:'doing', titulo:'X' }]
  });
  assert.match(txt, /2 Epics/);
  assert.match(txt, /Em Homologação/);
  assert.match(txt, /Solta/);
  assert.match(txt, /sem produto/i);
  assert.match(txt, /next → doing/);
});

test('relatorio de rodada limpa nao inventa alarme', () => {
  const txt = relatorio({ itens:[{ id:1 }], orfas:[], semStatus:[], semTrack:[], mudancas:[] });
  assert.match(txt, /1 Epic/);
  assert.doesNotMatch(txt, /não mapeado/);
  assert.doesNotMatch(txt, /órfã/);
});

/* parsearFatos e serializarFatos precisam concordar: e o contrato que o
   orquestrador usa para recuperar a rodada anterior (diff e guarda de
   esvaziamento). */
test('parsearFatos faz o caminho inverso de serializarFatos', () => {
  const itens = [{ id:1, azureTitle:'A"quote', status:'doing' }, { id:2, azureTitle:'B', status:null }];
  const js = serializarFatos('2026-08-20T10:00:00Z', itens);
  const fatos = parsearFatos(js);
  assert.equal(fatos.geradoEm, '2026-08-20T10:00:00Z');
  assert.deepEqual(fatos.epics, itens);
});

/* Isto e exatamente a falha que a ancoragem no marcador previne: cortar pelo
   primeiro "{" do arquivo pegaria o JSON de exemplo do comentario, nao o
   conteudo real, e estouraria o JSON.parse. */
test('parsearFatos ignora chaves dentro do comentario de cabecalho', () => {
  const texto = '/* exemplo de uso: { "a": 1 } no comentario */\n' +
    'const RADAR_FATOS = {\n  "geradoEm": "x",\n  "epics": []\n};\n';
  assert.deepEqual(parsearFatos(texto), { geradoEm:'x', epics:[] });
});

/* A semente commitada em Radar de projetos/assets/fatos.js precisa
   continuar parseável pelo próprio parsearFatos que tools/sync.mjs vai usar
   para ler a "rodada anterior" na primeira vez que rodar de verdade. Isto
   tranca a forma da semente por teste em vez de checagem manual. */
test('parsearFatos le a semente commitada em Radar de projetos/assets/fatos.js', () => {
  const AQUI = path.dirname(fileURLToPath(import.meta.url));
  const SEED = path.join(AQUI, '..', '..', 'Radar de projetos', 'assets', 'fatos.js');
  const dados = parsearFatos(readFileSync(SEED, 'utf8'));
  assert.equal(typeof dados.geradoEm, 'string');
  assert.ok(Array.isArray(dados.epics));
  assert.equal(dados.epics.length, 14);
  for(const e of dados.epics){
    assert.equal(typeof e.id, 'number');
    assert.equal(typeof e.azureTitle, 'string');
    assert.ok(Array.isArray(e.demands));
  }
});

/* guardaLeituraAnterior: ENOENT (arquivo ausente) é primeira rodada de
   verdade; qualquer outro problema (permissão, JSON quebrado, forma errada)
   é uma rodada anterior que existe mas não pôde ser lida — e tratar isso
   como "primeira rodada" desligaria a guarda de esvaziamento bem no momento
   em que ela mais importa. */
test('guardaLeituraAnterior trata ENOENT como primeira rodada', () => {
  const erro = Object.assign(new Error('no such file'), { code:'ENOENT' });
  const r = guardaLeituraAnterior(erro, null);
  assert.equal(r.ok, true);
  assert.equal(r.ausente, true);
});

test('guardaLeituraAnterior recusa erro que nao e ausencia (permissao, parse)', () => {
  const erroPermissao = Object.assign(new Error('permission denied'), { code:'EACCES' });
  const r1 = guardaLeituraAnterior(erroPermissao, null);
  assert.equal(r1.ok, false);
  assert.match(r1.motivo, /permission denied/);

  const erroParse = new SyntaxError('Unexpected token');
  const r2 = guardaLeituraAnterior(erroParse, null);
  assert.equal(r2.ok, false);
  assert.match(r2.motivo, /Unexpected token/);
});

test('guardaLeituraAnterior recusa JSON valido mas sem epics', () => {
  const r = guardaLeituraAnterior(null, { geradoEm:'x' });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /forma esperada/);
});

test('guardaLeituraAnterior aceita dados bem formados', () => {
  const r = guardaLeituraAnterior(null, { geradoEm:'x', epics:[] });
  assert.equal(r.ok, true);
  assert.equal(r.ausente, false);
});

test('coletarPendencias ve estado nao mapeado em item', () => {
  const { semStatus, semTrack } = coletarPendencias([
    { id:1, status:null, estadoCru:'Em Homologação', track:'loja', demands:[] }
  ]);
  assert.equal(semStatus.length, 1);
  assert.equal(semStatus[0].id, 1);
  assert.equal(semTrack.length, 0);
});

test('coletarPendencias ve estado nao mapeado em demanda', () => {
  const { semStatus } = coletarPendencias([
    { id:1, status:'doing', track:'loja', demands:[
      { id:10, status:null, estadoCru:'Em Homologação' },
      { id:11, status:'next', estadoCru:'Em Andamento' }
    ] }
  ]);
  assert.equal(semStatus.length, 1);
  assert.equal(semStatus[0].id, 10);
});

test('coletarPendencias ve item sem track', () => {
  const { semTrack } = coletarPendencias([
    { id:1, status:'doing', track:null, demands:[] }
  ]);
  assert.equal(semTrack.length, 1);
  assert.equal(semTrack[0].id, 1);
});

test('coletarPendencias na rodada limpa nao acusa nada', () => {
  const { semStatus, semTrack } = coletarPendencias([
    { id:1, status:'doing', track:'loja', demands:[{ id:10, status:'next', estadoCru:'Em Andamento' }] }
  ]);
  assert.equal(semStatus.length, 0);
  assert.equal(semTrack.length, 0);
});

/* decidirGravacao concentra a combinacao de guarda.ok/forcavel/--forcar/
   --dry-run que antes vivia so em sync.mjs, sem nenhum teste cobrindo a
   consumacao da guarda (so a classificacao, em guardaEsvaziamento, era
   testada). E exatamente essa combinacao que ja produziu um bug real
   (--forcar sobrescrevendo a recusa de zero Epics). */
const PASSA = { ok:true, forcavel:false, motivo:null };
const RECUSA_FORCAVEL = { ok:false, forcavel:true, motivo:'queda abrupta' };
const RECUSA_ZERO = { ok:false, forcavel:false, motivo:'zero epics' };

test('decidirGravacao: passagem limpa grava', () => {
  const d = decidirGravacao(PASSA, { forcar:false, seco:false });
  assert.equal(d.deveGravar, true);
  assert.equal(d.erro, null);
  assert.equal(d.saida, null);
});

test('decidirGravacao: recusa forcavel sem --forcar bloqueia', () => {
  const d = decidirGravacao(RECUSA_FORCAVEL, { forcar:false, seco:false });
  assert.equal(d.deveGravar, false);
  assert.match(d.erro, /queda abrupta/);
  assert.doesNotMatch(d.erro, /--forcar não pode contornar/);
  assert.equal(d.saida, 1);
});

test('decidirGravacao: recusa forcavel com --forcar grava e avisa', () => {
  const d = decidirGravacao(RECUSA_FORCAVEL, { forcar:true, seco:false });
  assert.equal(d.deveGravar, true);
  assert.equal(d.erro, null);
  assert.ok(d.avisos.some(a => a.stream === 'err' && /--forcar: gravando apesar de/.test(a.texto)));
});

/* O caso central do achado: zero Epics nao e forcavel, entao --forcar nunca
   deve conseguir contornar essa recusa especifica — mesmo que o flag tenha
   sido passado. */
test('decidirGravacao: recusa nao forcavel com --forcar continua bloqueando e avisa que o flag nao vale aqui', () => {
  const d = decidirGravacao(RECUSA_ZERO, { forcar:true, seco:false });
  assert.equal(d.deveGravar, false);
  assert.match(d.erro, /zero epics/);
  assert.match(d.erro, /--forcar não pode contornar isto\./);
  assert.equal(d.saida, 1);
});

test('decidirGravacao: passagem limpa com --dry-run nunca grava nem afirma ter gravado', () => {
  const d = decidirGravacao(PASSA, { forcar:false, seco:true });
  assert.equal(d.deveGravar, false);
  assert.equal(d.erro, null);
  assert.equal(d.saida, 0);
  assert.ok(d.avisos.some(a => a.stream === 'out' && /--dry-run: nada gravado/.test(a.texto)));
});

test('decidirGravacao: recusa forcavel + --forcar + --dry-run nunca grava nem afirma ter gravado', () => {
  const d = decidirGravacao(RECUSA_FORCAVEL, { forcar:true, seco:true });
  assert.equal(d.deveGravar, false);
  assert.equal(d.erro, null);
  assert.equal(d.saida, 0);
  assert.ok(d.avisos.some(a => a.stream === 'out' && /--forcar contornaria a guarda, mas --dry-run não grava nada/.test(a.texto)));
  assert.ok(d.avisos.some(a => a.stream === 'out' && /--dry-run: nada gravado/.test(a.texto)));
});

test('decidirGravacao: recusa nao forcavel + --forcar + --dry-run bloqueia pelo motivo de sempre, nao pelo dry-run', () => {
  const d = decidirGravacao(RECUSA_ZERO, { forcar:true, seco:true });
  assert.equal(d.deveGravar, false);
  assert.match(d.erro, /--forcar não pode contornar isto\./);
  assert.equal(d.saida, 1);
});

test('decidirGravacao: recusa forcavel sem --forcar + --dry-run bloqueia pelo motivo de sempre, nao pelo dry-run', () => {
  const d = decidirGravacao(RECUSA_FORCAVEL, { forcar:false, seco:true });
  assert.equal(d.deveGravar, false);
  assert.match(d.erro, /queda abrupta/);
  assert.equal(d.saida, 1);
});

/* Verifica explicitamente a separacao entre streams: a confirmacao de
   --dry-run (informacional) sai em 'out' (stdout), enquanto avisos reais
   (--forcar sobrescrevendo) saem em 'err' (stderr). Isto preserva o
   significado para log consumers. */
test('decidirGravacao: --dry-run confirmacao vai para stdout, --forcar aviso vai para stderr', () => {
  const dDryRun = decidirGravacao(PASSA, { forcar:false, seco:true });
  const dForcar = decidirGravacao(RECUSA_FORCAVEL, { forcar:true, seco:false });

  assert.ok(dDryRun.avisos.some(a => a.stream === 'out' && /--dry-run: nada gravado/.test(a.texto)));
  assert.ok(dForcar.avisos.some(a => a.stream === 'err' && /--forcar: gravando apesar de/.test(a.texto)));
});
