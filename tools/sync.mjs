#!/usr/bin/env node
/* Gera Radar de projetos/assets/fatos.js a partir do Azure DevOps.
   SÓ-LEITURA no DevOps. NUNCA escreve em prosa.js.

   Uso:  ADO_PAT=xxx node tools/sync.mjs [--dry-run] [--forcar] */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runWiql, getFields, AuthError, NetworkError } from './ado.mjs';
import { itemDe, agruparPorPai, diffRodadas } from './mapa.mjs';
import { guardaEsvaziamento, decidirGravacao, serializarFatos, relatorio, parsearFatos, coletarPendencias } from './guardas.mjs';

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
   ausente é primeira rodada, não erro. */
async function fatosAnteriores(){
  try {
    const txt = await readFile(DESTINO, 'utf8');
    return parsearFatos(txt);
  } catch { return null; }
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

  /* Toda a lógica de --forcar/--dry-run sobre a guarda vive em
     decidirGravacao (guardas.mjs), testada lá. Aqui só imprimimos o que ela
     manda e saímos com o código que ela manda — nenhuma decisão própria.

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
  if(!decisao.deveGravar) process.exit(decisao.saida);

  /* Monta o arquivo inteiro antes de gravar: falha no meio deixa o fatos.js
     anterior intacto, em vez de meio arquivo. */
  const conteudo = serializarFatos(new Date().toISOString(), itens);
  await writeFile(DESTINO, conteudo, 'utf8');
  console.log(`\nGravado: ${path.relative(RAIZ, DESTINO)}`);
} catch (e) {
  if(e instanceof AuthError) console.error('PAT inválido ou vencido. Gere outro com escopo Work Items (Read).');
  else if(e instanceof NetworkError) console.error('Falha de rede: ' + e.message);
  else console.error('Erro: ' + e.message);
  process.exit(1);
}
