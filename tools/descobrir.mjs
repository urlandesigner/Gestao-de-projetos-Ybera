#!/usr/bin/env node
/* SÓ-LEITURA. Imprime o que existe de fato no DevOps, para o mapeamento ser
   escrito contra a realidade em vez de contra palpite. Não grava nada.

   Uso:  ADO_PAT=xxx node tools/descobrir.mjs
         ADO_PAT=xxx node tools/descobrir.mjs "Outro Projeto" */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runWiql, getFields, listProjects, AuthError, NetworkError } from './ado.mjs';

/* org lida de tools/config.json — o mesmo arquivo que sync.mjs lê — em vez
   de hardcoded aqui. Antes as duas ficavam duplicadas, e uma correção de org
   (uma já aconteceu) tinha que ser feita nos dois lugares; esquecer um dos
   dois faz descobrir.mjs investigar uma org e sync.mjs gravar de outra, sem
   erro nenhum avisando da divergência. */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(await readFile(path.join(AQUI, 'config.json'), 'utf8'));
const ORG = cfg.org;
const PROJETO = process.argv[2] || cfg.projeto;

const pat = process.env.ADO_PAT;
if(!pat){
  console.error('Falta ADO_PAT. Use: ADO_PAT=xxx node tools/descobrir.mjs');
  process.exit(2);
}
const ctx = { base: ORG, pat, fetchImpl: (...a) => fetch(...a) };

const CAMPOS = [
  'System.Id', 'System.Title', 'System.State', 'System.WorkItemType',
  'System.AreaPath', 'System.AssignedTo', 'System.Parent', 'System.Tags',
  'Microsoft.VSTS.Scheduling.StartDate',
  'Microsoft.VSTS.Scheduling.TargetDate',
  'Microsoft.VSTS.Common.ClosedDate'
];

function conta(itens, campo){
  const m = new Map();
  for(const w of itens){
    const v = (w.fields || {})[campo];
    const k = v && v.displayName ? v.displayName : (v == null ? '(vazio)' : String(v));
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function tabela(titulo, pares){
  console.log(`\n${titulo}`);
  for(const [k, n] of pares) console.log(`  ${String(n).padStart(4)}  ${k}`);
}

try {
  const projetos = await listProjects(ctx);
  console.log(`Projetos na org (${projetos.length}):`);
  for(const p of projetos) console.log(`  ${p.name === PROJETO ? '→' : ' '} ${p.name}`);

  for(const tipo of ['Epic', 'Feature']){
    const ids = await runWiql(ctx, PROJETO,
      `SELECT [System.Id] FROM WorkItems
       WHERE [System.TeamProject] = '${PROJETO}'
         AND [System.WorkItemType] = '${tipo}'`);
    console.log(`\n=== ${tipo}: ${ids.length} itens em "${PROJETO}" ===`);
    if(!ids.length) continue;
    const itens = await getFields(ctx, ids, CAMPOS);

    tabela('Estados (System.State):', conta(itens, 'System.State'));
    tabela('Áreas (System.AreaPath):', conta(itens, 'System.AreaPath'));
    tabela('Responsáveis (System.AssignedTo):', conta(itens, 'System.AssignedTo'));

    /* A pergunta que decide se a "janela" do Radar tem fonte. */
    const preenchido = c => itens.filter(w => (w.fields || {})[c] != null).length;
    console.log('\nDatas preenchidas:');
    console.log(`  StartDate:  ${preenchido('Microsoft.VSTS.Scheduling.StartDate')} de ${itens.length}`);
    console.log(`  TargetDate: ${preenchido('Microsoft.VSTS.Scheduling.TargetDate')} de ${itens.length}`);
    console.log(`  ClosedDate: ${preenchido('Microsoft.VSTS.Common.ClosedDate')} de ${itens.length}`);
    if(tipo === 'Feature'){
      console.log(`  com System.Parent: ${preenchido('System.Parent')} de ${itens.length}`);
    }

    console.log('\nTrês exemplos crus:');
    for(const w of itens.slice(0, 3)) console.log('  ' + JSON.stringify({ id: w.id, fields: w.fields }));

    /* Esqueleto pronto para colar no config, já com os nomes reais. */
    if(tipo === 'Epic'){
      const estados = conta(itens, 'System.State').map(([k]) => k).filter(k => k !== '(vazio)');
      const areas = conta(itens, 'System.AreaPath').map(([k]) => k).filter(k => k !== '(vazio)');
      console.log('\n--- cole em tools/config.json e preencha os valores ---');
      console.log(JSON.stringify({
        org: ORG, projeto: PROJETO,
        estados: Object.fromEntries(estados.map(e => [e, null])),
        areas: Object.fromEntries(areas.map(a => [a, null]))
      }, null, 2));
    }
  }
} catch (e) {
  if(e instanceof AuthError) console.error('PAT inválido ou vencido. Gere outro com escopo Work Items (Read).');
  else if(e instanceof NetworkError) console.error('Falha de rede: ' + e.message);
  else console.error('Erro: ' + e.message);
  process.exit(1);
}
