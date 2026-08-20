#!/usr/bin/env node
/* Gera Radar de projetos/assets/fatos.js a partir do Azure DevOps.
   SÓ-LEITURA no DevOps. NUNCA escreve em prosa.js.

   Uso:  ADO_PAT=xxx node tools/sync.mjs [--dry-run] [--forcar] */
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runWiql, getFields, AuthError, NetworkError } from './ado.mjs';
import { itemDe, agruparPorPai, diffRodadas } from './mapa.mjs';
import { guardaEsvaziamento, guardaStatusVazio, guardaLeituraAnterior, decidirGravacao, serializarFatos, relatorio, parsearFatos, coletarPendencias } from './guardas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const DESTINO = path.join(RAIZ, 'Radar de projetos', 'assets', 'fatos.js');

const seco = process.argv.includes('--dry-run');
const forcar = process.argv.includes('--forcar');

const pat = process.env.ADO_PAT;
if(!pat){
  console.error('Falta ADO_PAT. Use: ADO_PAT=xxx node tools/sync.mjs');
  process.exit(2);
}

const cfg = JSON.parse(await readFile(path.join(AQUI, 'config.json'), 'utf8'));
const ctx = { base: cfg.org, pat, fetchImpl: (...a) => fetch(...a) };

const CAMPOS = [
  'System.Id', 'System.Title', 'System.State', 'System.AreaPath',
  'System.AssignedTo', 'System.Parent',
  'Microsoft.VSTS.Scheduling.StartDate',
  'Microsoft.VSTS.Scheduling.TargetDate',
  'Microsoft.VSTS.Common.ClosedDate'
];

const wiql = tipo =>
  `SELECT [System.Id] FROM WorkItems
   WHERE [System.TeamProject] = '${cfg.projeto}'
     AND [System.WorkItemType] = '${tipo}'`;

/* Lê a rodada anterior para o diff e para a guarda de esvaziamento. Arquivo
   ausente (ENOENT) é primeira rodada, não erro — qualquer outro problema de
   leitura ou de forma é decidido por guardaLeituraAnterior (guardas.mjs,
   pura e testada) e vira exceção aqui, capturada pelo try/catch geral lá
   embaixo. Ver o comentário daquela função para o porquê de não tratar tudo
   como "primeira rodada" igual ao catch único de antes fazia. */
async function fatosAnteriores(){
  let txt = null, erroLeitura = null;
  try {
    txt = await readFile(DESTINO, 'utf8');
  } catch (e) { erroLeitura = e; }

  let dados = null;
  if(erroLeitura === null){
    try { dados = parsearFatos(txt); }
    catch (e) { erroLeitura = e; }
  }

  const r = guardaLeituraAnterior(erroLeitura, dados);
  if(!r.ok) throw new Error(r.motivo);
  return r.ausente ? null : dados;
}

/* Grava atomicamente: escreve o conteúdo inteiro num arquivo temporário na
   MESMA pasta do destino e troca pelo destino com rename — rename() no
   mesmo sistema de arquivos é atômico, então o arquivo final ou é o antigo
   por inteiro ou o novo por inteiro, nunca uma mistura dos dois. Antes,
   writeFile direto no destino truncava o arquivo antes de escrever nele: um
   processo morto no meio (SIGKILL, disco cheio) deixava um fatos.js
   truncado — e truncado é exatamente o arquivo que o site publicado
   carrega. Isto é o que falta para a guarda 1 ("nunca grava parcial")
   valer contra QUALQUER interrupção no meio da escrita, não só contra
   falha de lógica antes dela.

   O temporário sai da mesma pasta do destino de propósito: se saísse de
   outro ponto de montagem (ex.: os.tmpdir()), o rename deixaria de ser
   atômico — o SO faria copy+delete por baixo, reabrindo a mesma janela de
   meio-arquivo que esta função existe para fechar. O nome carrega o nome
   do destino, o pid e um timestamp, para dar pra reconhecer de onde veio
   se um temporário ficar para trás por acidente; e o catch remove esse
   temporário quando a escrita ou o rename falham, para não deixar lixo na
   pasta do site publicado. */
async function gravarAtomico(destino, conteudo){
  const tmp = path.join(
    path.dirname(destino),
    `.${path.basename(destino)}.tmp-${process.pid}-${Date.now()}`
  );
  try {
    await writeFile(tmp, conteudo, 'utf8');
    await rename(tmp, destino);
  } catch (e) {
    await unlink(tmp).catch(() => {}); // best-effort: não mascara o erro original se a limpeza falhar
    throw e;
  }
}

try {
  const idsEpics = await runWiql(ctx, cfg.projeto, wiql('Epic'));
  const idsFeatures = await runWiql(ctx, cfg.projeto, wiql('Feature'));
  const epics = idsEpics.length ? await getFields(ctx, idsEpics, CAMPOS) : [];
  const features = idsFeatures.length ? await getFields(ctx, idsFeatures, CAMPOS) : [];

  const { porPai, orfas } = agruparPorPai(features, idsEpics);
  const itens = epics.map(e => itemDe(e, porPai.get(e.id) || [], cfg))
                     .sort((a, b) => a.id - b.id);

  const antes = await fatosAnteriores();
  const g = guardaEsvaziamento(itens.length, antes ? antes.epics.length : null);

  const { semStatus, semTrack } = coletarPendencias(itens);
  const mudancas = diffRodadas(antes ? antes.epics : null, itens);

  console.log(relatorio({ itens, orfas, semStatus, semTrack, mudancas }));

  /* Calculada aqui, antes de decidirGravacao, para que --dry-run possa
     avisar sobre ela também (ver abaixo) — não só na hora de gravar de
     verdade. "estados" vazio em tools/config.json não derruba a contagem de
     Epics (guardaEsvaziamento não vê nada de errado), mas grava o board
     inteiro sem status. Ao contrário da guarda de esvaziamento, esta nunca
     aceita --forcar — não há "config vazio real" para publicar, só falta
     preencher o mapa. */
  const gStatus = guardaStatusVazio(itens);

  /* Toda a lógica de --forcar/--dry-run sobre a guarda de esvaziamento vive
     em decidirGravacao (guardas.mjs), testada lá. Aqui só imprimimos o que
     ela manda e saímos com o código que ela manda — nenhuma decisão própria.

     Avisos vêm marcados com stream ('out' ou 'err') para que mensagens
     informacionais (--dry-run confirmação) vão para stdout e avisos reais
     vão para stderr, preservando o significado para log consumers. */
  const decisao = decidirGravacao(g, { forcar, seco });
  for(const aviso of decisao.avisos){
    if(aviso.stream === 'out') console.log(aviso.texto);
    else console.warn(aviso.texto);
  }
  if(decisao.erro){
    console.error(decisao.erro);
    process.exit(decisao.saida);
  }
  if(!decisao.deveGravar){
    /* Antes, guardaStatusVazio só rodava depois deste exit — um --dry-run
       nunca chegava a mencioná-la, mesmo quando a gravação de verdade seria
       recusada por causa dela. --dry-run é o ensaio do operador para a
       rodada real; ele tem de prever a recusa que está ensaiando, não deixar
       para ele descobrir só quando rodar sem --dry-run. */
    if(!gStatus.ok) console.log('\n--dry-run: a gravação de verdade também seria recusada: ' + gStatus.motivo);
    process.exit(decisao.saida);
  }

  if(!gStatus.ok){
    console.error('\n' + gStatus.motivo);
    process.exit(1);
  }

  /* Monta o arquivo inteiro antes de gravar, e a gravação em si é atômica
     (gravarAtomico, acima): falha de lógica antes daqui, ou processo morto
     durante a escrita, deixam o fatos.js anterior intacto — nunca meio
     arquivo. */
  const conteudo = serializarFatos(new Date().toISOString(), itens);
  await gravarAtomico(DESTINO, conteudo);
  console.log(`\nGravado: ${path.relative(RAIZ, DESTINO)}`);
} catch (e) {
  if(e instanceof AuthError) console.error('PAT inválido ou vencido. Gere outro com escopo Work Items (Read).');
  else if(e instanceof NetworkError) console.error('Falha de rede: ' + e.message);
  else console.error('Erro: ' + e.message);
  process.exit(1);
}
