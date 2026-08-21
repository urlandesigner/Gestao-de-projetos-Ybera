#!/usr/bin/env node
/* SÓ-LEITURA. Imprime o que existe de fato no DevOps, para o mapeamento ser
   escrito contra a realidade em vez de contra palpite. Não grava nada.

   Uso:  ADO_PAT=xxx node tools/descobrir.mjs
         ADO_PAT=xxx node tools/descobrir.mjs "Outro Projeto"
         ADO_PAT=xxx node tools/descobrir.mjs "Projeto" --titulos
         ADO_PAT=xxx node tools/descobrir.mjs "Projeto" --arvore 49290,49294

   --arvore <ids> lista as Features filhas dos Epics informados. Existe porque
   a hierarquia real desta org não é a que o plano assumiu: o Epic é o PRODUTO
   ("Loja Clube USA") e a Feature é o PROJETO ("[EUA] Nova Home"). Sem ver as
   filhas de um Epic não há como confirmar isso nem montar o mapa de produto.

   --titulos lista todo Epic com id, estado, área e título. Existe porque a
   contagem por área não basta para decidir QUAIS itens entram no Radar: uma
   área pode misturar frentes (a org tem 70 Epics num projeto para um Radar de
   14 projetos), e só os títulos dizem qual é qual. Sem isso o mapeamento
   voltaria a ser palpite, que é justamente o que este script existe para
   evitar. */
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
const ARGS = process.argv.slice(2);
const TITULOS = ARGS.includes('--titulos');
const iArv = ARGS.indexOf('--arvore');
/* Os ids vêm no argumento seguinte a --arvore, separados por vírgula. */
const ARVORE = iArv > -1
  ? String(ARGS[iArv + 1] || '').split(',').map(x => Number(x.trim())).filter(Boolean)
  : [];
const naoFlag = ARGS.filter((a, i) => !a.startsWith('--') && i !== iArv + 1);
const PROJETO = naoFlag[0] || cfg.projeto;

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
  if(ARVORE.length){
    /* Só-leitura: pergunta quem são os pais e imprime as filhas agrupadas.
       Consulta as Features do projeto uma vez e agrupa em memória, em vez de
       uma consulta por Epic — 646 itens num lote é mais barato que N lotes. */
    const paisIds = await runWiql(ctx, PROJETO,
      `SELECT [System.Id] FROM WorkItems
       WHERE [System.TeamProject] = '${PROJETO}'
         AND [System.WorkItemType] = 'Epic'`);
    const pais = await getFields(ctx, paisIds.filter(id => ARVORE.includes(id)), CAMPOS);
    const fIds = await runWiql(ctx, PROJETO,
      `SELECT [System.Id] FROM WorkItems
       WHERE [System.TeamProject] = '${PROJETO}'
         AND [System.WorkItemType] = 'Feature'`);
    const filhas = await getFields(ctx, fIds, CAMPOS);
    for(const p of pais){
      const f = p.fields || {};
      const minhas = filhas.filter(w => (w.fields || {})['System.Parent'] === p.id);
      console.log(`\n═══ #${p.id} ${f['System.Title']} · ${minhas.length} Features filhas ═══`);
      const d = c => minhas.filter(w => (w.fields || {})[c] != null).length;
      console.log(`    datas: StartDate ${d('Microsoft.VSTS.Scheduling.StartDate')}, ` +
                  `TargetDate ${d('Microsoft.VSTS.Scheduling.TargetDate')}, ` +
                  `ClosedDate ${d('Microsoft.VSTS.Common.ClosedDate')} de ${minhas.length}`);
      for(const w of minhas){
        const g = w.fields || {};
        console.log(`  #${String(w.id).padEnd(6)} ${String(g['System.State'] || '?').padEnd(14)} ${g['System.Title'] || ''}`);
      }
    }
    process.exit(0);
  }
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

    if(TITULOS){
      /* Ordenado por área e depois por título: agrupa visualmente o que
         provavelmente é a mesma frente, que é a pergunta que a listagem
         serve para responder. */
      console.log(`\nTodos os ${itens.length} itens (id · estado · área · título):`);
      const linhas = itens.map(w => {
        const f = w.fields || {};
        return {
          area: f['System.AreaPath'] || '(sem área)',
          txt: `  #${String(w.id).padEnd(6)} ${String(f['System.State'] || '?').padEnd(12)} ` +
               `${(f['System.AreaPath'] || '(sem área)').padEnd(34)} ${f['System.Title'] || ''}`
        };
      }).sort((a, b) => a.area.localeCompare(b.area) || a.txt.localeCompare(b.txt));
      for(const l of linhas) console.log(l.txt);
    } else {
      console.log('\nTrês exemplos crus:');
      for(const w of itens.slice(0, 3)) console.log('  ' + JSON.stringify({ id: w.id, fields: w.fields }));
    }

    /* Esqueleto pronto para colar no config, já com os nomes reais.

       Sai do nível de FEATURE, não de Epic: a Feature é o projeto do Radar, e
       são os estados dela que precisam de mapa (os três estados de Epic não
       entram na página). `produtos` só pede os ids dos Epics: o nome de cada
       produto não se cadastra mais aqui — vem do título do Epic no Azure
       DevOps, buscado pela própria rodada de tools/sync.mjs — e ids se
       descobrem com --arvore, não contando ocorrências. */
    if(tipo === 'Feature'){
      const estados = conta(itens, 'System.State').map(([k]) => k).filter(k => k !== '(vazio)');
      console.log('\n--- cole em tools/config.json e preencha os valores ---');
      console.log(JSON.stringify({
        org: ORG, projeto: PROJETO,
        estados: Object.fromEntries(estados.map(e => [e, null])),
        estadosExcluidos: [],
        produtos: ['<id do Epic 1>', '<id do Epic 2>']
      }, null, 2));
      console.log('\nOs ids dos Epics-produto saem de: node tools/descobrir.mjs ' +
                  `"${PROJETO}" --titulos`);
    }
  }
} catch (e) {
  if(e instanceof AuthError) console.error('PAT inválido ou vencido. Gere outro com escopo Work Items (Read).');
  else if(e instanceof NetworkError) console.error('Falha de rede: ' + e.message);
  else console.error('Erro: ' + e.message);
  process.exit(1);
}
