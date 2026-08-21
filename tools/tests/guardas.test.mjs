import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { guardaEsvaziamento, guardaStatusVazio, guardaLeituraAnterior, decidirGravacao, serializarFatos, relatorio, parsearFatos, coletarPendencias, epicsSemProduto } from '../guardas.mjs';

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

/* Fronteira exata do piso: a comparação é "menor que" (estrito), não
   "menor ou igual". Sem este teste, trocar `<` por `<=` na implementação
   passaria despercebido — os outros testes usam 78,6% e 85,7%, nenhum bate
   exatamente nos 80%, então nenhum deles pegaria essa inversão. */
test('queda de exatamente 80 por cento (o piso) ainda passa', () => {
  assert.equal(guardaEsvaziamento(8, 10).ok, true); // exatamente 80%
});

test('crescer sempre passa', () => {
  assert.equal(guardaEsvaziamento(30, 14).ok, true);
});

/* guardaStatusVazio: tools/config.json com "estados" vazio não derruba a
   contagem de itens (guardaEsvaziamento não vê problema), mas grava o board
   inteiro sem status. É uma guarda separada, e nunca aceita --forcar. */
test('guardaStatusVazio recusa quando todo item esta sem status', () => {
  const r = guardaStatusVazio([{ status:null }, { status:null }]);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /2 itens/);
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

/* Sem o terceiro argumento, produtos/resumo ficam [] e quarter fica null —
   nenhuma chamada antiga (nem o teste acima) precisa saber que estas tres
   chaves passaram a existir. */
test('serializarFatos sem o terceiro argumento grava produtos/resumo vazios e quarter nulo', () => {
  const fatos = parsearFatos(serializarFatos('2026-08-20T10:00:00Z', []));
  assert.deepEqual(fatos.produtos, []);
  assert.deepEqual(fatos.resumo, []);
  assert.equal(fatos.quarter, null);
});

/* produtos (nome de produto), resumo ("O essencial") e quarter (trimestre)
   sao as tres coisas que passaram a ser calculadas em vez de escritas a mao
   em prosa.js — este teste tranca que elas de fato chegam ao arquivo
   gerado, e que parsearFatos as devolve intactas. */
test('serializarFatos grava produtos, resumo e quarter, e parsearFatos os devolve', () => {
  const produtos = [{ id:'49290', name:'Loja Clube USA' }];
  const resumo = [{ tag:{ pt:'Projetos', en:'Projects' }, pt:'1 projeto...', en:'1 project...' }];
  const quarter = { label:'Q3 2026', start:'2026-07-01', end:'2026-09-30' };
  const js = serializarFatos('2026-08-20T10:00:00Z', [{ id:1 }], { produtos, resumo, quarter });
  const fatos = parsearFatos(js);
  assert.deepEqual(fatos.produtos, produtos);
  assert.deepEqual(fatos.resumo, resumo);
  assert.deepEqual(fatos.quarter, quarter);
});

test('relatorio lista o que precisa de acao humana', () => {
  const txt = relatorio({
    itens:[{ id:1 }, { id:2 }],
    excluidos:[{ id:50, azureTitle:'Cancelada', estadoCru:'Removed' }],
    semPai:[{ id:99, fields:{ 'System.Title':'Solta' } }],
    epicsNovos:[{ id:77, titulo:'Loja Clube Peru', qtd:3 }],
    semStatus:[{ id:2, estadoCru:'Em Homologação' }],
    mudancas:[{ id:1, tipo:'status', de:'next', para:'doing', titulo:'X' }]
  });
  assert.match(txt, /2 projetos/);
  assert.match(txt, /Em Homologação/);
  assert.match(txt, /Cancelada/);
  assert.match(txt, /Removed/);
  assert.match(txt, /Solta/);
  assert.match(txt, /Loja Clube Peru/);
  assert.match(txt, /3 Feature/);
  assert.match(txt, /next → doing/);
});

test('relatorio de rodada limpa nao inventa alarme', () => {
  const txt = relatorio({ itens:[{ id:1 }], excluidos:[], semPai:[], epicsNovos:[], semStatus:[], mudancas:[] });
  assert.match(txt, /1 projeto\b/);
  assert.doesNotMatch(txt, /não mapeado/);
  assert.doesNotMatch(txt, /Excluídos do Radar/);
  assert.doesNotMatch(txt, /Sem pai/);
  assert.doesNotMatch(txt, /Epics sem produto/);
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
   tranca a forma da semente por teste em vez de checagem manual.

   NÃO trava a contagem em 14: a Task 5 do plano substitui este arquivo por
   uma rodada real contra o DevOps, e o número de Epics de lá não tem por que
   bater com a semente (que veio de uma contagem do Notion, não do DevOps).
   Travar em 14 faria este teste ficar vermelho no exato momento em que o
   operador faz o que o plano manda — com uma mensagem que parece bug da
   ferramenta, não aviso de que o teste precisa ser atualizado. O que importa
   aqui é a FORMA do arquivo (ids numéricos, `demands` array, o marcador que
   parsearFatos ancora), não a contagem de um dia específico. */
test('parsearFatos le a semente commitada em Radar de projetos/assets/fatos.js', () => {
  const AQUI = path.dirname(fileURLToPath(import.meta.url));
  const SEED = path.join(AQUI, '..', '..', 'Radar de projetos', 'assets', 'fatos.js');
  const dados = parsearFatos(readFileSync(SEED, 'utf8'));
  assert.equal(typeof dados.geradoEm, 'string');
  assert.ok(Array.isArray(dados.epics));
  assert.ok(dados.epics.length > 0);
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
  const { semStatus } = coletarPendencias([
    { id:1, status:null, estadoCru:'Em Homologação', track:'loja' }
  ]);
  assert.equal(semStatus.length, 1);
  assert.equal(semStatus[0].id, 1);
});

test('coletarPendencias na rodada limpa nao acusa nada', () => {
  const { semStatus } = coletarPendencias([
    { id:1, status:'doing', track:'loja' }
  ]);
  assert.equal(semStatus.length, 0);
});

/* epicsSemProduto: o risco que a inversão Epic↔Feature cria. Um Epic novo
   ("Loja Clube Peru") sem entrada em produtos faz as Features filhas dele
   desaparecerem em silêncio — esta função é o que torna essa ausência
   visível, ao nível do Epic (id + quantas filhas), em vez de ao nível de
   cada Feature isolada. */
test('epicsSemProduto lista Epic pai fora da lista de produtos, com quantidade', () => {
  const porPai = new Map([
    [49290, [{ id:1 }, { id:2 }]],   // cadastrado
    [77, [{ id:3 }, { id:4 }, { id:5 }]] // NÃO cadastrado
  ]);
  const r = epicsSemProduto(porPai, [49290]);
  assert.deepEqual(r, [{ id:77, qtd:3 }]);
});

test('epicsSemProduto nao acusa nada quando todo pai esta cadastrado', () => {
  const porPai = new Map([[49290, [{ id:1 }]]]);
  assert.deepEqual(epicsSemProduto(porPai, [49290]), []);
});

test('epicsSemProduto ordena por quantidade de filhas descendente', () => {
  const porPai = new Map([
    [10, [{ id:1 }]],
    [20, [{ id:2 }, { id:3 }, { id:4 }]]
  ]);
  assert.deepEqual(epicsSemProduto(porPai, []), [{ id:20, qtd:3 }, { id:10, qtd:1 }]);
});

/* Mesmo risco de tipo de trackDoPai (mapa.mjs): paiId vem number da API, um
   id na lista de produtos pode ter sido colado como string. */
test('epicsSemProduto casa number contra id em string na lista', () => {
  const porPai = new Map([[49290, [{ id:1 }]]]);
  assert.deepEqual(epicsSemProduto(porPai, ['49290']), []);
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
